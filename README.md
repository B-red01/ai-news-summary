# News Summarizer

A web app that provides AI-powered news article summaries.

## Features
- Article summaries using Google's Gemini AI
- User authentication with Firebase Auth
- Bookmark functionality with Firebase storage
- Responsive design

## Technical Notes
- News API used for article fetching (strict rate limits may cause missing data)
- Gemini AI for summarization
- Firebase Auth for user login (email format required)
- Firebase Firestore for bookmarks

## Setup
1. Install dependencies
2. Configure API keys (Firebase, News API, Gemini)
3. Run application

## Limitations
- News API rate limits
- Gemini summary quality varies by article
