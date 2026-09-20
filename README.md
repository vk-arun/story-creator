# 📖 Symphony of Tales — Public Story Book with Line-Synced Audio

A public storybook and writing studio web application built with **React**, **Node.js/Express**, and **MongoDB**. Readers can explore public stories with dynamic background music and ambient soundtracks that automatically crossfade based on the reader's current line, while admins can write stories in an interactive writing pad, orchestrate music line cues, and publish or save drafts.

---

## ✨ Features

### 📚 For Public Readers
- **Curated Story Catalog**: Browse published stories filtered by genre (Fantasy, Sci-Fi, Mystery, Romance, etc.) or search by keywords.
- **Scroll-Synchronized Ambient Soundtracks**: Background music tracks are bound to line ranges (e.g. Lines 1–6: Rain & Thunder, Lines 7–13: Melancholic Piano). As the reader reads and scrolls, the audio engine smoothly transitions and crossfades.
- **Atmospheric Reading Modes**: Toggle between **Midnight Dark**, **Parchment Sepia**, and **Celestial Dusk** palettes, with adjustable typography sizes.
- **Floating Audio HUD**: Interactive equalizer visualizer with track indicators, play/pause toggle, mute switch, and master volume slider.

### ✍️ For Admin Curators
- **Secure Admin Authentication**: JWT-based session security.
- **Studio Dashboard**:
  - Overview of published stories, drafts, line counts, and reader view metrics.
  - One-click toggle between **Draft** and **Published** status (only published stories are visible to public readers).
  - Quick preview, edit, and deletion.
- **The Writing Pad**:
  - Title, author, genre, synopsis, and cover artwork management.
  - Gutter with line numbers dynamically synced with prose.
  - Visual gold indicators on line numbers with attached audio.
  - **Add Music to Lines**: Select "From Line #" and "To Line #", choose from atmospheric presets (Rain & Thunder, Deep Space, Melancholic Piano, Mystic Forest, Drone, Campfire) or provide any custom MP3/streaming URL, adjust volume, and test-play audio in real time.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lucide React, Canvas Confetti, Vanilla CSS Design System with Google Fonts (`Cinzel`, `Lora`, `Outfit`).
- **Backend**: Node.js, Express, MongoDB with Mongoose, JWT (`jsonwebtoken`), `bcryptjs`, CORS.
- **Resilient Fallback Engine**: If no MongoDB connection is configured, the server automatically runs an in-memory/seed data store, making it 100% functional out of the box locally!
- **Deployment**: Vercel ready via serverless functions (`api/index.js`) and static React SPA routing (`vercel.json`).

---

## 🚀 Getting Started Locally

### 1. Install Dependencies
In the root directory, install both backend and frontend dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Start the Backend API Server
```bash
cd server
npm run dev
```
The server starts at `http://localhost:5000`.
- Public stories: `http://localhost:5000/api/stories`
- Health check: `http://localhost:5000/api/health`

### 3. Start the React Frontend (Vite)
In a separate terminal:
```bash
cd client
npm run dev
```
The client starts at `http://localhost:3000` (proxied to `/api`).

---

## 🔐 Default Admin Credentials

To access the Admin Portal:
1. Click **"Admin Portal"** in the top navigation bar.
2. Enter the default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Click **"Sign In to Studio"** to access the Story Manager and Writing Pad.

*(You can configure `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your `.env` file.)*

---

## 🍃 MongoDB Atlas Configuration (Optional)

The application includes an in-memory fallback pre-seeded with stories so you can start right away without a database.

To connect your own MongoDB Atlas database:
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a `.env` file inside the `server/` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/storycreator?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```
3. Restart the server. It will automatically connect to MongoDB Atlas and synchronize records.

---

## ☁️ Deploying to Vercel

The project is pre-configured for seamless Vercel deployment with `vercel.json` and `api/index.js`.

### Option A: Via Vercel Web Dashboard (Recommended)
1. Push this project to your GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. In the **Project Settings**:
   - **Framework Preset**: Vite (or Other)
   - **Root Directory**: `./`
4. In **Environment Variables**, add:
   - `MONGODB_URI` = *your MongoDB Atlas connection string*
   - `JWT_SECRET` = *a random secret string*
   - `ADMIN_USERNAME` = `admin`
   - `ADMIN_PASSWORD` = *your strong admin password*
5. Click **Deploy**. Vercel will build the frontend and deploy the serverless Express API.

### Option B: Via Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts to link and deploy
```
