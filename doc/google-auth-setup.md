# Google Sign-In with Supabase — Setup Guide

## Prerequisites
- A Supabase project (you already have one)
- A Google Cloud project

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Choose **Web application**
6. Set the following:
   - **Name**: `SEO Tool` (or anything descriptive)
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local dev)
     - `https://your-production-domain.com` (for prod)
   - **Authorized redirect URIs**:
     - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
     - Find your project ref in Supabase Dashboard → Settings → General
7. Click **Create** and copy the **Client ID** and **Client Secret**

## Step 2: Configure Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication → Providers**
4. Find **Google** in the list and toggle it **ON**
5. Paste the **Client ID** and **Client Secret** from Step 1
6. Click **Save**

## Step 3: Configure OAuth Consent Screen (if not done)

1. In Google Cloud Console, go to **APIs & Services → OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill in:
   - **App name**: `SEO Tool`
   - **User support email**: your email
   - **Developer contact**: your email
4. Under **Scopes**, add:
   - `email`
   - `profile`
   - `openid`
5. Under **Test users**, add your email (while in testing mode)
6. Click **Save and Continue** through all steps

## Step 4: Verify It Works

1. Run `npm run dev`
2. Go to `http://localhost:3000/signin`
3. Click **Sign in with Google**
4. You should be redirected to Google's consent screen
5. After authorizing, you'll be redirected to `/dashboard`

## How It Works in the Codebase

The Google OAuth flow uses Supabase's built-in OAuth:

```js
// src/app/(auth)/signin/page.js
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/dashboard`,
  },
});
```

**Flow:**
1. User clicks "Sign in with Google"
2. Supabase redirects to Google's OAuth consent screen
3. User authorizes the app
4. Google redirects back to Supabase's callback URL
5. Supabase creates/updates the user and sets the session
6. Supabase redirects to your `redirectTo` URL (`/dashboard`)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "redirect_uri_mismatch" | Make sure the redirect URI in Google Cloud matches exactly: `https://<ref>.supabase.co/auth/v1/callback` |
| User lands on signin instead of dashboard | Check that `redirectTo` is set correctly and your Supabase project's Site URL is configured (Authentication → URL Configuration) |
| "Access blocked: app has not completed verification" | This is normal in dev — click "Advanced" → "Go to app (unsafe)" or publish the OAuth consent screen |
| Google button does nothing | Check browser console for errors; ensure `NEXT_PUBLIC_SUPABASE_URL` is set correctly in `.env.local` |

## Environment Variables

No new env vars needed — Google OAuth is configured entirely in the Supabase dashboard. Your existing Supabase keys handle the auth flow:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
```
