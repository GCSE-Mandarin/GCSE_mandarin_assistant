<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Mandarin Master Plan - IGCSE Preparation Platform

A comprehensive Mandarin learning platform for IGCSE students with AI-powered lesson generation, vocabulary practice, and progress tracking.

## Setup

### Environment Variables

The app uses environment variables for API keys. These should be configured on Netlify (for production) or in a local `.env` file (for development).

**Required Environment Variables:**
- `VITE_GEMINI_API_KEY` - Google Gemini API key (required for AI features)

**Optional Environment Variables:**
- `VITE_OPENAI_API_KEY` - OpenAI API key (optional, used as fallback for single character pronunciation)

### Netlify Configuration

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add the following variables:
   - `VITE_GEMINI_API_KEY` = your Gemini API key
   - `VITE_OPENAI_API_KEY` = your OpenAI API key (optional)

**Note:** After adding environment variables, you'll need to trigger a new deployment for the changes to take effect.

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

3. Add your API keys to `.env`:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

## Features

- **Tutor Dashboard**: Create lessons, upload vocabulary lists, track student progress
- **Student Dashboard**: Practice vocabulary, complete exercises, view progress
- **AI-Powered**: Automatic lesson generation and vocabulary practice
- **Custom Categories**: Tutors can create custom vocabulary categories
- **Writing Practice**: Interactive stroke order practice with example animations
- **Pronunciation Practice**: Audio playback and recording for pronunciation practice
