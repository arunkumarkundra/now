# Observer: setup guide

You don't need to run any commands. You'll work in three websites: **GitHub** (stores the files), **Cloudflare** (puts the app online for free) and, optionally, **Firebase** (Google/Apple sign-in and cloud sync).

- **Part 1 + Part 2** (about 15 minutes) give you a working, installable app. Everything is saved on each person's own device.
- **Part 3** (about 30 minutes) adds "Continue with Google" and cloud sync. It's optional, and you can do it later.
- **Part 4** covers Apple sign-in, which needs a paid Apple Developer account.

---

## Part 1: Put the files on GitHub

1. Unzip `MED-fix-2809-1.zip` on your computer. You'll get a folder with `index.html`, `sw.js`, `assets/`, `functions/`, `docs/` and a few other files.
2. Go to **github.com** and sign in. Click **+** (top right) and choose **New repository**.
   - Repository name: `observer`
   - Choose **Private** (Cloudflare can still read it).
   - Leave everything else as it is. Click **Create repository**.
3. On the new, empty repository page, click the link **uploading an existing file**.
4. Open the unzipped folder on your computer. Select **everything inside it** (not the folder itself) and drag it all onto the GitHub upload area.
   - Use Chrome or Edge. They keep the sub-folders (`assets/audio/warm/…`) intact.
   - Wait until every file is listed. There are about 85.
5. At the bottom, click **Commit changes**.
6. Check it: the repository's front page should show `index.html`, `sw.js`, `_headers`, `_routes.json`, `manifest.webmanifest` and the folders `assets`, `docs`, `functions`, `tools`.

> If GitHub turned the folders into a flat list of files, delete the repository (Settings → bottom of page → Delete) and upload again by dragging the *contents* of the folder in Chrome or Edge.

---

## Part 2: Put the app online with Cloudflare Pages

1. Go to **dash.cloudflare.com** and sign in.
2. In the left menu, open **Workers & Pages**. Click **Create** (or **Create application**).
3. Choose the **Pages** tab (it's important to choose *Pages*, not *Workers*). Click **Connect to Git** (sometimes called "Import an existing Git repository").
4. Connect your GitHub account if asked, allow access to the `observer` repository, select it, and click **Begin setup**.
5. Fill in the build settings:
   - **Project name:** `observer`. This becomes your web address, e.g. `observer.pages.dev`. If it's taken, Cloudflare adds letters, e.g. `observer-4xk.pages.dev`.
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** leave **empty**
   - **Build output directory:** leave **empty** (or type `/`)
6. Click **Save and Deploy**. After about a minute you'll see **Success** and a link. Open it.

### Install it on a phone

- **iPhone (Safari):** open the link → tap **Share** → **Add to Home Screen**.
- **Android (Chrome):** open the link → tap **Install** on the banner, or ⋮ → **Install app**.

From now on, **every time you change a file on GitHub, Cloudflare updates the site automatically** within a minute or two.

---

## Part 2 (alternative): Host on GitHub Pages

Use this instead of Cloudflare if you prefer. It's free for **public** repositories.

1. In your repository, click **Add file → Create new file**.
2. Type the file name `.nojekyll` (with the dot at the start). Leave the content empty and click **Commit changes**. This tells GitHub to serve the files as they are.
3. Go to **Settings** (top of the repository) → **Pages** (left menu).
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)** → **Save**
5. Wait 1–2 minutes and refresh the page. A box appears saying **"Your site is live at https://YOUR-USERNAME.github.io/REPOSITORY-NAME/"**. Open it.

Installing on phones works exactly as described above. The Cloudflare-only files (`_headers`, `_routes.json`, `functions/`) are simply ignored by GitHub Pages.

**Sign-in on GitHub Pages:** Google sign-in works in the browser on computers and Android. When you do Part 3, the domain to authorise in step 3b is `YOUR-USERNAME.github.io`, and you can **skip step 3e**. On iPhone, sign-in from the Home Screen app may fail on GitHub Pages because the sign-in helper can't run there. Signing in from Safari itself works. That limitation goes away on Cloudflare or Vercel.

---

## Part 3 (optional): Google sign-in and cloud sync

Without this, the app works fully. Data just stays on each device, and people can move it with **Backup / Restore** in Settings.

Throughout this part, replace `YOUR-SITE.pages.dev` with your real Cloudflare address from Part 2.

### 3a. Create a Firebase project
1. Go to **console.firebase.google.com** and sign in with a Google account.
2. Click **Create a project** (or **Add project**). Name it `observer`. When it asks about Google Analytics, switch it **off**. Click **Create project**.

### 3b. Switch on Google sign-in
1. In the left menu: **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → **Google** → switch **Enable** on → choose your support email → **Save**.
3. Still in Authentication, open the **Settings** tab → **Authorized domains** → **Add domain** → type `YOUR-SITE.pages.dev` → **Add**.

### 3c. Create the database
1. Left menu: **Build → Firestore Database** → **Create database**.
2. Location: choose one near your users, e.g. `asia-south1 (Mumbai)`. Choose **Start in production mode**. Click **Create**.
3. Open the **Rules** tab. Delete everything in the box. Open the file `firestore.rules` from your GitHub repository, copy **all** of its text, and paste it into the box. Click **Publish**.

   These rules mean each person can only ever read and write their own journal.

### 3d. Get your app's settings and paste them into the app
1. Click the **gear icon** (top left, next to "Project Overview") → **Project settings**.
2. Scroll to **Your apps** → click the **`</>`** (Web) icon.
3. App nickname: `Observer`. Leave "Firebase Hosting" **unticked**. Click **Register app**.
4. You'll see a block of code containing `const firebaseConfig = { ... };`. You only need the part from `{` to `}`.
5. On GitHub, open `assets/js/config.js` and click the **pencil** (Edit) icon.
6. Find this line:
   ```js
   export const FIREBASE_CONFIG = null;
   ```
   Replace `null` with the `{ ... }` block you copied, so it looks like this (with your own values):
   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "observer-12345.firebaseapp.com",
     projectId: "observer-12345",
     storageBucket: "observer-12345.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```
   Make sure the line still ends with `};`.
7. Click **Commit changes**.

> It's safe for these values to be public: they identify your project, they don't unlock it. The database rules from 3c are what protect the data.

### 3e. Let Google send people back to your site
This step makes sign-in work on iPhones that have the app on their Home Screen.

1. Go to **console.cloud.google.com**. At the top, make sure the project selector shows your Firebase project (`observer`).
2. Menu (☰) → **APIs & Services → Credentials**.
3. Under **OAuth 2.0 Client IDs**, click **Web client (auto created by Google Service)**.
4. Under **Authorized JavaScript origins** → **Add URI** → `https://YOUR-SITE.pages.dev`
5. Under **Authorized redirect URIs** → **Add URI** → `https://YOUR-SITE.pages.dev/__/auth/handler`
6. Click **Save**. It can take 5–10 minutes to take effect.

### 3f. Test
Open your site → tap the **Sign in** button (top right) → **Continue with Google**. After signing in you should see "All sessions synced".

---

## Part 4 (optional): Apple sign-in

Apple requires a paid **Apple Developer Program** membership (US$99/year). Skip this part if you don't have one. Google sign-in and no-login use are unaffected.

1. At **developer.apple.com → Certificates, Identifiers & Profiles**:
   - **Identifiers → +** → **App IDs** → tick **Sign in with Apple** → register.
   - **Identifiers → +** → **Services IDs** → e.g. `com.yourname.observer.web` → tick **Sign in with Apple** → **Configure**:
     - Domains: `YOUR-SITE.pages.dev`
     - Return URL: `https://YOUR-SITE.pages.dev/__/auth/handler`
   - **Keys → +** → tick **Sign in with Apple** → download the `.p8` key file and note the **Key ID**. Your **Team ID** is shown at the top right of the Apple Developer site.
2. In **Firebase → Authentication → Sign-in method → Add new provider → Apple**: enable it, then enter the Services ID, Team ID, Key ID and the contents of the `.p8` file. Save.
3. On GitHub, edit `assets/js/config.js` and change `apple: false` to `apple: true`. Commit.

---

## Changing things later

| To change… | Edit this file |
|---|---|
| Words on screens, phase instructions, the 12 ratings, safety text | `assets/js/content.js` |
| Colours, fonts, spacing | `assets/css/app.css` |
| Sign-in settings | `assets/js/config.js` |
| Spoken instructions | Ask Claude. Voice files are generated from `tools/cues.py`, and the new `.mp3` files are sent to you |

**After any change, also edit `sw.js`** and bump the version on line 2 (e.g. `observer-v1.0.0` → `observer-v1.0.1`). That tells installed phones to fetch the new files. Otherwise they may keep showing the old version for a while.

---

## Troubleshooting

- **The site shows a blank page:** Check that `index.html` is at the top level of the repository, not inside a folder.
- **No sound on iPhone:** Turn the volume up. On older iOS versions, the silent switch mutes web audio, so switch it off. Tap **Test tone and voice** in Settings.
- **Timing drifts when the screen locks:** The app keeps the screen dimly on during a session. Don't lock the phone manually. Put it face-down instead.
- **"This web address isn't authorised":** Redo Part 3b step 3 with your exact address.
- **Google sign-in opens and then fails:** Check Part 3e (both addresses), and wait 10 minutes after saving.
- **"Cloud storage refused access":** The Firestore rules from Part 3c weren't published.
