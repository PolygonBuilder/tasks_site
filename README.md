# Chronos // Weekly Productivity Planner

A beautifully designed, premium weekly productivity planner to track tasks, log habits, write notes, and review your historical streak with a sleek dark-mode aesthetic.

---

## 🚀 Deploying to Cloudflare Pages

Since Chronos is a pure, zero-dependency static web application (HTML, CSS, JavaScript), the best, fastest, and free way to deploy it is using **Cloudflare Pages**.

Here are the concrete ways to deploy Chronos to Cloudflare:

### Option 1: Direct Upload (Easiest, No Git/CLI Required)

This is the fastest method to get your app live in under 2 minutes:

1. **Compress your files**:
   - Go to your project folder (`c:\Users\cheng\dev\tasks_list`).
   - Select the 3 files: `index.html`, `style.css`, and `app.js`.
   - Right-click and compress them into a `.zip` file (e.g., `chronos.zip`).
2. **Log into Cloudflare**:
   - Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. **Create Pages Project**:
   - Navigate to **Workers & Pages** in the left sidebar.
   - Click **Create** > **Pages** tab > **Upload assets**.
   - Set a project name (e.g., `chronos-planner`).
4. **Upload and Deploy**:
   - Drag and drop your `chronos.zip` file (or select the files individually).
   - Click **Deploy site**.
   - Your site will be live instantly on a free `*.pages.dev` subdomain!

---

### Option 2: GitHub Integration (Recommended for continuous updates)

This is the professional approach. Every time you push code to GitHub, Cloudflare will automatically build and update your live site.

1. **Initialize Git & Push to GitHub**:
   - Open your terminal in `c:\Users\cheng\dev\tasks_list` and run:
     ```bash
     git init
     git add .
     git commit -m "Initial commit of Chronos planner"
     ```
   - Create a new repository on GitHub and link it:
     ```bash
     git remote add origin <your-github-repo-url>
     git branch -M main
     git push -u origin main
     ```
2. **Connect to Cloudflare Pages**:
   - Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - Navigate to **Workers & Pages** > **Create** > **Pages** tab.
   - Click **Connect to Git** and authorize your GitHub account.
   - Select your repository.
3. **Configure Build Settings**:
   - **Project Name**: `chronos-planner` (or any name you choose)
   - **Production Branch**: `main`
   - **Framework Preset**: `None` (Since this is a static site)
   - **Build Command**: *Leave blank*
   - **Build Output Directory**: *Leave blank* (This is the root folder)
4. **Deploy**:
   - Click **Save and Deploy**.
   - Cloudflare will build your site and give you a `*.pages.dev` URL. Every subsequent `git push` will update the live site automatically.

---

### Option 3: Wrangler CLI (For Terminal Lovers)

If you prefer using the terminal to manage deployments:

1. **Install Wrangler globally or run via npx**:
   ```bash
   npx wrangler login
   ```
   *This will open a browser window to authenticate with your Cloudflare account.*

2. **Deploy directly**:
   From your project root directory (`c:\Users\cheng\dev\tasks_list`), run:
   ```bash
   npx wrangler pages deploy . --project-name=chronos-planner
   ```
   *If the project `chronos-planner` does not exist, Wrangler will create it for you.*

3. **Check your live site**:
   Wrangler will output the live URL (e.g., `https://chronos-planner.pages.dev`).

---

## 🎨 Local Development & Customization

- To view changes locally, open `index.html` directly in a browser or use a simple local server:
  ```bash
  # Using Python (built-in)
  python -m http.server 8000
  
  # Or using Node.js (npx)
  npx serve
  ```
