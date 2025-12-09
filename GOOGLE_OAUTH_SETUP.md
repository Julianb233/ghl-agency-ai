# Google OAuth Setup Verification

## Current Configuration

- **Client ID**: `1012840656772-gh3q2r5844adatke21ra2k7j6c5ecm12.apps.googleusercontent.com`
- **Redirect URI**: `http://localhost:3006/api/oauth/google/callback`

## Required Google Cloud Console Settings

To fix the Google Sign-In error, please verify the following in your Google Cloud Console:

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials

### 2. Select Your OAuth 2.0 Client ID
Find the client ID: `1012840656772-gh3q2r5844adatke21ra2k7j6c5ecm12`

### 3. Authorized Redirect URIs
**CRITICAL**: Add these EXACT URIs to the "Authorized redirect URIs" section:

```
http://localhost:3006/api/oauth/google/callback
http://localhost:3000/api/oauth/google/callback
https://ghl-agency-ai-ai-acrobatics.vercel.app/api/oauth/google/callback
```

### 4. Authorized JavaScript Origins
Add these origins:

```
http://localhost:3006
http://localhost:3000
```

### 5. Save Changes
Click "Save" and wait a few minutes for changes to propagate.

## Testing the Fix

After updating the Google Cloud Console:

1. Clear your browser cookies for localhost
2. Go to http://localhost:3006
3. Click "Sign in with Google"
4. You should be redirected to Google's login page
5. After signing in, you should be redirected back to the app

## Common Issues

### Error: redirect_uri_mismatch
- **Cause**: The redirect URI in Google Cloud Console doesn't match exactly
- **Fix**: Make sure `http://localhost:3006/api/auth/google/callback` is added EXACTLY as shown (no trailing slash, correct port)

### Error: invalid_client
- **Cause**: Client ID or Secret is incorrect
- **Fix**: Double-check the credentials in `.env` match those in Google Cloud Console

### Error: access_denied
- **Cause**: User denied permission or app is not verified
- **Fix**: Make sure you're using a test user account if the app is in testing mode

## Current Server Logs

The server now includes detailed logging. Check the terminal for messages like:
- `[Google Auth] Initiating OAuth flow`
- `[Google Auth] Callback received`
- `[Google Auth] Token exchange successful`

Any errors will be logged with details to help diagnose the issue.
