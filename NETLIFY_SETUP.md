# Netlify Environment Variables Setup

This app uses environment variables for API keys. Follow these steps to configure them on Netlify:

## Required Steps

1. **Go to Netlify Dashboard**
   - Navigate to your site's dashboard
   - Click on **Site settings** (gear icon)

2. **Add Environment Variables**
   - Click on **Environment variables** in the left sidebar
   - Click **Add a variable** button

3. **Add Required Variables**

   **VITE_GEMINI_API_KEY** (Required)
   - Key: `VITE_GEMINI_API_KEY`
   - Value: Your Google Gemini API key (starts with `AIzaSy...`)
   - Scope: All scopes (or specific if needed)

   **VITE_OPENAI_API_KEY** (Optional)
   - Key: `VITE_OPENAI_API_KEY`
   - Value: Your OpenAI API key
   - Scope: All scopes (or specific if needed)
   - Note: Only needed for better single character pronunciation

4. **Redeploy**
   - After adding variables, go to **Deploys** tab
   - Click **Trigger deploy** > **Deploy site**
   - This ensures the new environment variables are included in the build

## Important Notes

- **Variable Names**: Must start with `VITE_` to be exposed to client-side code in Vite
- **Redeploy Required**: Environment variables are only available after a new deployment
- **Security**: These variables are exposed to the client-side code, so they will be visible in the browser. This is expected for this type of application.

## Local Development

For local development, create a `.env` file in the root directory:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

The `.env` file is already in `.gitignore` and won't be committed to the repository.

