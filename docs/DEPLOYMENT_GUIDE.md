# 🚀 Complete Deployment Guide (Vercel + Render)

To make your Offline Field Issue Tracker live on the internet, you need to host **three** things:
1. **The Database** (PostgreSQL) - To store your reports permanently.
2. **The Backend / API** (Node.js/Express) - To handle syncing and data logic.
3. **The Frontend** (React/Vite) - To serve the user interface (This goes on Vercel!).

Because Vercel's backend servers are "serverless" (they spin up and shut down instantly), they are not ideal for background syncing or maintaining database connections. The industry best practice is to put the **Frontend on Vercel** and the **Backend on Render**. Both have excellent free tiers!

Here is your step-by-step guide.

---

## Step 1: Create a Free PostgreSQL Database
Since your app uses `PGlite` locally (which wipes data on restart), we need a real database for production.

1. Go to [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/) and create a free account.
2. Create a new project/database.
3. Once created, look for the **Connection String** (it starts with `postgres://...`).
4. **Copy this string and save it.** You will need it in Step 2.

---

## Step 2: Deploy the Backend to Render (Free)

1. Create a free account at [Render.com](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `offline-field-issue-tracker` repository.
4. Fill in the deployment details:
   - **Name**: `issue-tracker-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Scroll down to **Environment Variables** and add:
   - Key: `DATABASE_URL` | Value: *(Paste your connection string from Step 1 here)*
   - Key: `NODE_ENV` | Value: `production`
6. Click **Create Web Service**. 
7. Render will now build your API and run your database migrations automatically! Once it's live, copy the URL provided (e.g., `https://issue-tracker-api.onrender.com`).

---

## Step 3: Deploy the Frontend to Vercel (Free)

1. Create a free account at [Vercel.com](https://vercel.com/) (Sign up with GitHub).
2. Click **Add New...** -> **Project**.
3. Import your `offline-field-issue-tracker` repository from GitHub.
4. Configure the project:
   - **Project Name**: `offline-field-tracker`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select the `client` folder.
5. Expand the **Environment Variables** section and add:
   - Key: `VITE_API_URL`
   - Value: *(Paste the Render API URL you got in Step 2)*
6. Click **Deploy**!

---

## Step 4: Verify it Works!
1. Click the live URL Vercel gives you.
2. Go to your live app on your phone or desktop.
3. Turn off your Wi-Fi/Data and create a report. It should queue in the Outbox.
4. Turn your Wi-Fi/Data back on and click Sync. It should seamlessly sync with your new live Render API and Postgres Database!

🎉 **Congratulations! Your Offline Field Tracker is now live!**
