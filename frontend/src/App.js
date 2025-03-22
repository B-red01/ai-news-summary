import React, { useState, useEffect } from "react";
import axios from "axios";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import "./styles.css";
import { FaBookmark, FaRegBookmark, FaMoon, FaSun, FaSignOutAlt, FaExclamationTriangle, FaExternalLinkAlt } from "react-icons/fa";

function App() {
  const [articles, setArticles] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [category, setCategory] = useState("technology");
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "";
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) fetchBookmarks(user.uid);
    });
  }, []);

  useEffect(() => {
    // Clear error message when switching between login and register
    setAuthError(null);
  }, [isRegister]);

  const fetchNews = async (page = 1) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/news?category=${category}&page=${page}`
      );
      setArticles(response.data.articles);
    } catch (error) {
      console.error("Error fetching news:", error);
    }
  };

  useEffect(() => {
    fetchNews(page);
  }, [page, category]);

  const summarizeArticle = async (article) => {
    try {
      setLoadingSummary(article.title);
      const response = await axios.post("http://localhost:3000/summarize", {
        title: article.title,
        description: article.description,
        content: article.content,
      });
      setSummaries((prev) => ({ ...prev, [article.title]: response.data.summary }));
      setLoadingSummary(null);
    } catch (error) {
      console.error("Error generating summary:", error);
      setLoadingSummary(null);
    }
  };

  const bookmarkArticle = async (article) => {
    if (!user) return alert("Please log in to bookmark articles!");
    try {
      await axios.post("http://localhost:3000/bookmark", {
        userId: user.uid,
        article,
      });
      fetchBookmarks(user.uid);
    } catch (error) {
      console.error("Error bookmarking article:", error);
    }
  };

  const fetchBookmarks = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:3000/bookmarks/${userId}`);
      setBookmarks(response.data.bookmarks);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }
  };

  const handleAuth = async () => {
    // Validate inputs
    if (!email || !password) {
      setAuthError("Email and password are required");
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError("Please enter a valid email address");
      return;
    }
    
    // Password validation
    if (isRegister && password.length < 6) {
      setAuthError("Password must be at least 6 characters long");
      return;
    }
    
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        setShowLogin(false);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setShowLogin(false);
      }
    } catch (error) {
      console.error("Authentication error:", error.message);
      
      // Map Firebase error codes to user-friendly messages
      switch (error.code) {
        case 'auth/email-already-in-use':
          setAuthError("This email is already registered. Try logging in instead.");
          break;
        case 'auth/invalid-email':
          setAuthError("Please enter a valid email address");
          break;
        case 'auth/user-not-found':
          setAuthError("No account found with this email. Please register first.");
          break;
        case 'auth/wrong-password':
          setAuthError("Incorrect password. Please try again.");
          break;
        case 'auth/too-many-requests':
          setAuthError("Too many failed login attempts. Please try again later.");
          break;
        default:
          setAuthError("Authentication failed: " + error.message);
          break;
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const removeBookmark = async (article) => {
    if (!user) return alert("Please log in to manage bookmarks!");
    try {
      await axios.delete(`http://localhost:3000/bookmark/${user.uid}/${article.title}`);
      fetchBookmarks(user.uid); // Refresh bookmarks after removal
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setBookmarks([]);
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const categories = ["technology", "business", "science", "health", "entertainment", "sports"];

  return (
    <div className={`app ${darkMode ? "dark-mode" : ""}`}>
      <header className="app-header">
        <div className="header-title">News Summary</div>
        <div className="category-selector">
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="category-dropdown"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="header-controls">
          <button className="icon-button" onClick={toggleDarkMode}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          {!user ? (
            <button className="login-button" onClick={() => setShowLogin(!showLogin)}>
              Login
            </button>
          ) : (
            <>
              <button className="icon-button" onClick={() => setShowBookmarks(!showBookmarks)}>
                <FaBookmark />
              </button>
              <button className="icon-button" onClick={handleLogout}>
                <FaSignOutAlt />
              </button>
            </>
          )}
        </div>
      </header>

      {showLogin && (
        <div className="auth-panel">
          <h2>{isRegister ? "Register" : "Login"}</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAuth();
          }}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            
            {authError && (
              <div className="auth-error">
                <FaExclamationTriangle />
                <span>{authError}</span>
              </div>
            )}
            
            <button 
              className="auth-button" 
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? "Processing..." : (isRegister ? "Register" : "Login")}
            </button>
          </form>
          
          <p className="auth-toggle" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Already have an account? Login" : "New user? Register"}
          </p>
        </div>
      )}

      {showBookmarks && (
        <aside className="bookmark-panel">
          <h2>Bookmarks</h2>
          {bookmarks.length === 0 ? (
            <p>No bookmarks yet</p>
          ) : (
            bookmarks.map((article, index) => (
              <div key={index} className="article-card bookmark-card">
                <h2>{article.title}</h2>
                <p className="article-description">{article.description}</p>
                <div className="article-actions">
                  {!summaries[article.title] && (
                    <button 
                      className="action-button"
                      onClick={() => summarizeArticle(article)}
                      disabled={loadingSummary === article.title}
                    >
                      {loadingSummary === article.title ? "Loading..." : "Summarize"}
                    </button>
                  )}
                  {article.url && (
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="action-button"
                    >
                      <FaExternalLinkAlt style={{ marginRight: '5px' }} /> Read
                    </a>
                  )}
                  <button 
                  className="action-button remove-button" 
                  onClick={() => removeBookmark(article)}
                  >
                    Remove
                  </button>
                </div>
                {summaries[article.title] && (
                  <div className="article-summary">
                    <h3>Summary</h3>
                    <p>{summaries[article.title]}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </aside>
      )}

      <div className="article-grid">
        {articles.map((article, index) => (
          <div key={index} className="article-card">
            <h2>{article.title}</h2>
            <p className="article-description">{article.description}</p>
            <div className="article-actions">
              {!summaries[article.title] && (
                <button 
                  className="action-button"
                  onClick={() => summarizeArticle(article)}
                  disabled={loadingSummary === article.title}
                >
                  {loadingSummary === article.title ? "Loading..." : "Summarize"}
                </button>
              )}
              {article.url && (
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="action-button"
                >
                  <FaExternalLinkAlt style={{ marginRight: '5px' }} /> Read
                </a>
              )}
              {user && (
                <button 
                  className="bookmark-button" 
                  onClick={() => bookmarkArticle(article)}
                >
                  {bookmarks.some(b => b.title === article.title) ? <FaBookmark /> : <FaRegBookmark />}
                </button>
              )}
            </div>
            {summaries[article.title] && (
              <div className="article-summary">
                <h3>Summary</h3>
                <p>{summaries[article.title]}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pagination">
        <button 
          className="pagination-button" 
          onClick={() => setPage(page - 1)} 
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="page-indicator">Page {page}</span>
        <button 
          className="pagination-button" 
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default App;