# Netlify Environment Variables Setup

This app uses server-side Netlify functions to handle all AI API calls. API keys are stored securely on the server and never exposed to the client.

## Required Steps

1. **Go to Netlify Dashboard**
   - Navigate to your site's dashboard
   - Click on **Site settings** (gear icon)

2. **Add Environment Variables**
   - Click on **Environment variables** in the left sidebar
   - Click **Add a variable** button

3. **Add Required Variables**

   **GEMINI_API_KEY** (Required)
   - Key: `GEMINI_API_KEY` (NO VITE_ prefix - this is server-side only)
   - Value: Your Google Gemini API key (starts with `AIzaSy...`)
   - Scope: All scopes (or specific if needed)

   **OPENAI_API_KEY** (Optional)
   - Key: `OPENAI_API_KEY` (NO VITE_ prefix - this is server-side only)
   - Value: Your OpenAI API key
   - Scope: All scopes (or specific if needed)
   - Note: Only needed for better single character pronunciation

   **SUPABASE_URL** (Optional but Recommended)
   - Key: `SUPABASE_URL`
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Scope: All scopes
   - Note: Used for fetching tutor-adjusted examples to improve AI evaluation. Default credentials are used if not set.

   **SUPABASE_ANON_KEY** (Optional but Recommended)
   - Key: `SUPABASE_ANON_KEY`
   - Value: Your Supabase anonymous/public key
   - Scope: All scopes
   - Note: Used for fetching tutor-adjusted examples to improve AI evaluation. Default credentials are used if not set.

4. **Redeploy**
   - After adding variables, go to **Deploys** tab
   - Click **Trigger deploy** > **Deploy site**
   - This ensures the new environment variables are available to the Netlify function

## Important Notes

- **Variable Names**: Do NOT use `VITE_` prefix - these are server-side only variables
- **Security**: API keys are stored server-side and never exposed to the client
- **Redeploy Required**: Environment variables are only available after a new deployment
- **Function Location**: All AI calls go through `/.netlify/functions/generate`
- **Supabase Integration**: The AI evaluation system learns from tutor adjustments stored in Supabase. Tutor-adjusted scores and comments are saved in Supabase, and the AI uses these as examples to improve future evaluations (few-shot learning).

## Local Development

For local development, you can test the Netlify function locally using Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

Or set environment variables in your shell before running `npm run dev` (though the function won't work locally without Netlify CLI).

The `.env` file is in `.gitignore` and won't be committed to the repository.

