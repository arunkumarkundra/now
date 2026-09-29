# Observer: setup guide

You don't need to run any commands. The app is plain files: no build step, no accounts, no database. Everything a person chooses in Settings stays on their own device.

---

## Host on GitHub Pages (current setup)

1. The repository must contain an empty file called `.nojekyll` at the top level. It's already there.
2. In the repository, go to **Settings** → **Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch** and Branch to **main**, folder **/ (root)**. Then click **Save**.
4. Wait 1–2 minutes. The site is live at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## Or host on Cloudflare Pages

1. At **dash.cloudflare.com**, go to **Workers & Pages** → **Create** → the **Pages** tab → **Connect to Git**, then pick the repository.
2. Set Framework preset to **None**, and leave both Build command and Build output directory **empty**. Then click **Save and Deploy**.
3. The `_headers` file is used by Cloudflare only (GitHub Pages ignores it).

## Install it on a phone

- **iPhone (Safari):** open the link, tap **Share**, then **Add to Home Screen**.
- **Android (Chrome):** open the link, tap ⋮, then **Install app**.

---

## Changing things later

| To change… | Edit this file |
|---|---|
| Words on screens, prep steps, phase names, session timing | `assets/js/content.js` |
| Colours, fonts, spacing | `assets/css/app.css` |
| Spoken instructions | Ask Claude. The voice files are generated from `tools/cues.py` and `tools/gen.py`, and Claude sends you the new `.mp3` files |

**After any change, also edit `sw.js`** and bump the version on line 2 (for example, `observer-v2.0.0` → `observer-v2.0.1`). That tells installed phones to fetch the new files.

---

## Troubleshooting

- **No sound on iPhone:** Turn the volume up. On older iOS, the silent switch mutes web audio, so switch it off. Use **Settings → Sound check**.
- **Timing drifts when the screen locks:** The app keeps the screen dimly on during a session. Don't lock the phone. Put it face-down instead.
- **Still seeing the old version:** Close the app completely and open it again (twice if needed).
