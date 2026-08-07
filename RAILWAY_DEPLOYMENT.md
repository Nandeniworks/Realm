# Railway Deployment & Production Configuration Checklist

This guide provides step-by-step instructions to deploy the backend Node.js & Socket.IO server to **Railway** and link it to the frontend hosted on **Vercel** (`https://realm-delta.vercel.app`).

---

## Step 1: Deploy Backend to Railway

1. **Log in to Railway**:
   - Go to [railway.app](https://railway.app) and log in using GitHub.

2. **Create a New Project**:
   - Click **+ New Project** -> **Deploy from GitHub repo**.
   - Select your `watchparty` repository.

3. **Configure Service Root Directory**:
   - In Railway, click on your service -> **Settings**.
   - Under **Source Directory** or **Root Directory**, set the path to:
     ```
     /server
     ```
   - (This tells Railway to build and run the backend inside the `server/` subdirectory).

4. **Verify Build & Start Commands**:
   - Railway will automatically detect `server/package.json`.
   - Ensure the Start Command is set to:
     ```bash
     npm start
     ```
     *(Which runs `node server.js`)*.

5. **Set Environment Variables on Railway**:
   - In Railway, click on your service -> **Variables**.
   - Add the following environment variables:

     | Variable | Recommended Value | Notes |
     |---|---|---|
     | `PORT` | *(Leave empty or set automatically by Railway)* | Railway automatically assigns `PORT`. |
     | `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/realm` | Your MongoDB Atlas connection URI or Railway MongoDB plugin URI. |
     | `JWT_SECRET` | `realm_jwt_access_secret_key_2026_xYz` | Strong secret for access tokens. |
     | `JWT_REFRESH_SECRET` | `realm_jwt_refresh_secret_key_2026_AbC` | Strong secret for refresh tokens. |
     | `CORS_ORIGIN` | `https://realm-delta.vercel.app,http://localhost:5173` | Comma-separated allowed frontend origins. |

6. **Generate Domain**:
   - In Railway service settings -> **Networking**, click **Generate Domain** (e.g. `realm-backend-production.up.railway.app`).
   - Copy this URL.

---

## Step 2: Configure Frontend Environment Variables on Vercel

1. Log in to [Vercel Dashboard](https://vercel.com) and navigate to your `realm-delta` project settings.
2. Go to **Settings** -> **Environment Variables**.
3. Add/Update the following variables:

   | Variable | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://realm-backend-production.up.railway.app` | URL of deployed Railway backend for REST endpoints. |
   | `VITE_SOCKET_URL` | `https://realm-backend-production.up.railway.app` | URL of deployed Railway backend for Socket.IO WebSockets. |

4. Trigger a **Redeploy** on Vercel so the build includes the new `VITE_API_URL` and `VITE_SOCKET_URL` environment variables.

---

## Step 3: Verification & Sanity Check

1. **Verify Backend Health**:
   - Visit `https://realm-backend-production.up.railway.app/health` in your browser.
   - It should return `{"status":"ok","time":"..."}`.

2. **Verify Multiplayer Room Sync**:
   - Open `https://realm-delta.vercel.app/join?code=TEST100` in two separate browser windows (or incognito windows).
   - Click **Join Realm**.
   - Check that:
     - Both clients show **2 Online Members**.
     - Chat messages sent by Window 1 appear in Window 2 in real time.
     - Play/Pause/Seek on video controls sync across both windows.
