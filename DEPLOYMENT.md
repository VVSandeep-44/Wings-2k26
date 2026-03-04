# Deployment Checklist (Production)

This project uses:

- Render for backend API (`server.js`)
- Netlify for React frontend (`client`)
- MongoDB Atlas for data
- Brevo for email

## 0) Frontend Deployment (Netlify)

Netlify should build and publish the React app:

- Config file: `netlify.toml`
- Build command: `npm run build:netlify`
- Publish directory: `client/dist`

Optional frontend env vars (Netlify -> Site settings -> Environment variables):

- `VITE_API_BASE_URL` (set to backend URL if API is hosted separately)
- `VITE_REGISTRATION_API_URL` (optional override, default `/api/register`)
- `VITE_SENTRY_BROWSER_DSN` (optional browser Sentry DSN)

If backend and frontend are on different domains, set backend `CORS_ORIGINS` to include your Netlify domain.

## 1) Required Environment Variables (Render)

Set these in Render -> Service -> Environment:

- `MONGODB_URI` (Atlas connection string)
- `MONGODB_DB_NAME` (default: `wings2k26`)
- `BREVO_API_KEY`
- `INVITE_FROM_EMAIL` (must be verified in Brevo)
- `ADMIN_PASSWORD` (strong secret)
- `ADMIN_SESSION_TOKEN` (long random secret)
- `CORS_ORIGINS` (comma-separated allowed origins)

Example:

- `CORS_ORIGINS=https://wings-2k26.onrender.com,https://your-frontend-domain.com`

## 2) MongoDB Atlas Checklist

- Create DB user with `readWrite` access.
- Add Network Access rule:
  - Recommended: restrict to Render outbound IPs when available.
  - Temporary testing option: `0.0.0.0/0`.
- Use driver connection string format:
  - `mongodb+srv://<user>:<encoded_password>@<cluster>.mongodb.net/wings2k26?retryWrites=true&w=majority&appName=Cluster0`
- URL-encode password if it contains special characters (`@`, `#`, `%`, `/`, `:`).

## 3) Brevo Checklist

- Verify sender email/domain in Brevo.
- Ensure SPF/DKIM records are green for your domain.
- Generate and store `BREVO_API_KEY` in Render.
- Set `INVITE_FROM_EMAIL` exactly to the verified sender.

## 4) Render Service Settings (Backend)

- Build command: `npm install`
- Start command: `node server.js`
- Node version: default 22.x is OK for this project.
- Branch: `main`
- Auto-deploy: enable if you want deploys on every push.

## 4.1) Netlify Service Settings (Frontend)

- Build command: `npm run build:netlify`
- Publish directory: `client/dist`
- Node version: 20+ recommended
- Branch: `main`

## 5) Pre-Deploy Sanity

Before deploy, confirm:

- `package.json` dependencies are committed.
- No secrets are committed to Git.
- `MONGODB_URI` is complete and valid (no quotes/trailing spaces).

## 6) Post-Deploy Verification

Run these checks after each deploy:

1. Health endpoint:
   - `GET /api/health` -> expect `status: ok`
2. Mail health endpoint:
   - `GET /api/health/mail` -> expect `status: ok`
3. Functional check:
   - Submit one registration from website.
   - Verify record appears in admin page.
4. Persistence check:
   - Redeploy once.
   - Confirm previously created registration still exists.

## 7) Security Hardening

- Rotate credentials periodically:
  - MongoDB password
  - `BREVO_API_KEY`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_TOKEN`
- Use long random values for admin secrets.
- Restrict CORS to only required domains.
- Remove broad Atlas IP rule (`0.0.0.0/0`) after testing.

## 8) Common Failure Patterns

- `MONGODB_URI is not configured`
  - Missing env var in Render.
- `querySrv ENOTFOUND _mongodb._tcp.<something>`
  - Invalid Atlas host in URI.
- Mongo auth/network error
  - Wrong DB user/password, or Atlas Network Access not allowed.
- Mail not sent
  - Missing/invalid `BREVO_API_KEY`, unverified `INVITE_FROM_EMAIL`, or Brevo policy error.

## 9) Rollback Plan

If production breaks after deploy:

1. In Render, redeploy previous successful commit.
2. Verify `/api/health` and `/api/health/mail`.
3. Check Render logs for startup errors.
4. Re-apply env vars carefully (watch for spaces/quotes).

## 10) Ops Notes

- Data persistence is handled by MongoDB Atlas (not local disk).
- Keep this checklist updated when infra/env requirements change.
- Frontend no longer uses `config.js` or `scripts/generate-config.js`; React env is read from Vite `VITE_*` variables.
