require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-002" });

// Fetch News
app.get("/news", async (req, res) => {
  try {
    const { category = "technology", page = 1 } = req.query;
    console.log(`Fetching news for category: ${category}, page: ${page}`);

    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?category=${category}&page=${page}&apiKey=${NEWS_API_KEY}`
    );

    // Ensure all articles have the url field available
    const articlesWithUrl = response.data.articles.map(article => {
      return {
        ...article,
        url: article.url || "#" // Provide a fallback if url is missing
      };
    });
    
    // Update the response with the processed articles
    response.data.articles = articlesWithUrl;

    console.log("Backend Response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("News API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate AI Summary
app.post("/summarize", async (req, res) => {
  try {
    const { title, description, content } = req.body;

    // Combine title, description, and content
    const inputText = `
    Title: ${title}
    Description: ${description}
    Content: ${content}`;

    // Generate summary using Gemini
    const prompt = `Summarize this article in 3-5 sentences using web search. Focus on key details:${inputText}`;
    const tools = ['google_search_retrieval']
    const dynamicRetrieval = 0.3; // Adjust as needed (0 = always use grounding, 1 = never use grounding)
    const result = await model.generateContent([prompt], { tools, dynamicRetrieval });
    const summary = result.response.text();
    console.log("Summary:", summary);
    res.json({ summary });
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Save Bookmark
app.post("/bookmark", async (req, res) => {
  try {
    const { userId, article } = req.body;

    if (!userId || !article) {
      return res.status(400).json({ error: "Missing userId or article" });
    }

    await db
      .collection("bookmarks")
      .doc(userId)
      .collection("articles")
      .doc(article.title.replace(/ /g, "_")) // Use article title as document ID
      .set(article);

    res.json({ message: "Bookmark saved!" });
  } catch (error) {
    console.error("Firestore Error:", error.message);
    res.status(500).json({ error: "Failed to save bookmark" });
  }
});

// Fetch Bookmarks
app.get("/bookmarks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db
      .collection("bookmarks")
      .doc(userId)
      .collection("articles")
      .get();

    const bookmarks = [];
    snapshot.forEach((doc) => {
      bookmarks.push(doc.data());
    });

    res.json({ bookmarks });
  } catch (error) {
    console.error("Firestore Error:", error.message);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

app.delete("/bookmark/:userId/:articleTitle", async (req, res) => {
  try {
    const { userId, articleTitle} = req.params;
    console.log("Deleting bookmark:", userId, articleTitle);
    await db.collection("bookmarks").doc(userId).collection("articles").doc(articleTitle.replace(/ /g, "_")).delete();
    res.json({ message: "Bookmark removed!" });
  } catch (error) {
    console.error("Firestore Error:", error.message);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

// Run Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));