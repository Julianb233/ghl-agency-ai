import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function registerGoogleAuthRoutes(app: Express) {
    // Debug endpoint to check configuration
    app.get("/api/oauth/google/config", (req: Request, res: Response) => {
        res.json({
            clientId: process.env.GOOGLE_CLIENT_ID || 'NOT_SET',
            redirectUri: process.env.GOOGLE_REDIRECT_URI || 'NOT_SET',
            clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
            databaseUrlSet: !!process.env.DATABASE_URL,
            databaseUrlLength: process.env.DATABASE_URL?.length || 0,
        });
    });

    app.get("/api/oauth/google", (req: Request, res: Response) => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3006/api/oauth/google/callback";

        console.log('[Google Auth] Initiating OAuth flow');
        console.log('[Google Auth] Client ID:', clientId ? 'Present' : 'Missing');
        console.log('[Google Auth] Redirect URI:', redirectUri);

        if (!clientId) {
            console.error('[Google Auth] GOOGLE_CLIENT_ID not configured');
            res.status(500).json({ error: "Google Client ID not configured" });
            return;
        }

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "openid email profile",
            access_type: "offline",
            prompt: "consent",
        });

        res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
    });

    app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
        const code = req.query.code as string;
        const error = req.query.error as string;

        console.log('[Google Auth] Callback received');
        console.log('[Google Auth] Code present:', !!code);
        console.log('[Google Auth] Error:', error);

        if (error) {
            console.error('[Google Auth] OAuth error:', error);
            res.redirect(`/login?error=google_oauth_${error}`);
            return;
        }

        if (!code) {
            console.error('[Google Auth] No authorization code received');
            res.redirect('/login?error=no_code');
            return;
        }

        try {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3006/api/oauth/google/callback";

            console.log('[Google Auth] Exchanging code for token');
            console.log('[Google Auth] Client ID:', clientId ? 'Present' : 'Missing');
            console.log('[Google Auth] Client Secret:', clientSecret ? 'Present' : 'Missing');
            console.log('[Google Auth] Redirect URI:', redirectUri);

            if (!clientId || !clientSecret) {
                throw new Error("Google credentials not configured");
            }

            // Exchange code for token using form-urlencoded format
            const tokenParams = new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            });

            const tokenResponse = await axios.post(
                GOOGLE_TOKEN_URL,
                tokenParams.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            console.log('[Google Auth] Token exchange successful');

            const { access_token } = tokenResponse.data;

            if (!access_token) {
                throw new Error("No access token received from Google");
            }

            // Get user info
            console.log('[Google Auth] Fetching user info');
            const userInfoResponse = await axios.get(GOOGLE_USER_INFO_URL, {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            const userInfo = userInfoResponse.data;
            const googleId = userInfo.sub;
            const email = userInfo.email;
            const name = userInfo.name;

            console.log('[Google Auth] User info retrieved:', { googleId, email, name });

            // Upsert user
            console.log('[Google Auth] Upserting user to database');
            await db.upsertUser({
                googleId: googleId,
                openId: null, // Google users don't have a Manus openId
                name: name || "Google User",
                email: email,
                loginMethod: "google",
                lastSignedIn: new Date(),
            });

            console.log('[Google Auth] User upserted successfully');

            // Create session token using googleId as the identifier
            console.log('[Google Auth] Creating session token');
            const sessionToken = await sdk.createSessionTokenForGoogle(googleId, {
                name: name || "Google User",
                expiresInMs: ONE_YEAR_MS,
            });

            console.log('[Google Auth] Session token created');

            const cookieOptions = getSessionCookieOptions(req);
            res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

            console.log('[Google Auth] Authentication successful, redirecting to /');
            res.redirect("/");
        } catch (error) {
            console.error("[Google Auth] Callback failed:", error);
            if (axios.isAxiosError(error)) {
                console.error("[Google Auth] Axios error details:", {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message,
                });
            }
            res.redirect("/login?error=google_auth_failed");
        }
    });
}
