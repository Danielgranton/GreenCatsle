# FoodNest OAuth (Google / Meta / Microsoft)

This project supports social sign-in via server-side OAuth redirects.

## Environment variables

Set these in `backend/.env`:

- `PUBLIC_BASE_URL` (example: `http://localhost:4000`)
- `CLIENT_PUBLIC_URL` (example: `http://localhost:5173`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `META_APP_ID` (Facebook/Meta app id)
- `META_APP_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

## Redirect URIs

Configure these redirect URIs in the provider dashboards:

- Google: `${PUBLIC_BASE_URL}/api/oauth/google/callback`
- Meta: `${PUBLIC_BASE_URL}/api/oauth/meta/callback`
- Microsoft: `${PUBLIC_BASE_URL}/api/oauth/microsoft/callback`

## Client flow

The client opens:

- `GET /api/oauth/google/start`
- `GET /api/oauth/meta/start?mode=facebook`
- `GET /api/oauth/microsoft/start`

After successful login, the backend redirects to:

- `${CLIENT_PUBLIC_URL}/oauth/callback?token=...&u=...`

The client page at `client-dashboard/src/pages/OAuthCallback.jsx` stores the token/user in `localStorage` and redirects home.
