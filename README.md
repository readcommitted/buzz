# Buzzword Ball (VS Code Starter)

## Run locally
- **Option A (Python)**: `python -m http.server 5173`
- **Option B (Node)**: `npm run serve`
- Then hit http://localhost:5173 and click **Allow Motion** on iOS once.

VS Code:
- `Terminal → Run Task… → Serve (Python)` or `Serve (Node)`
- `Run and Debug → Open Buzzword Ball` to auto-open a browser.

## Deploy to DigitalOcean

### App Platform (recommended)
1. Push this folder to GitHub.
2. DigitalOcean → **Apps** → **Create App** → connect repo.
3. Choose **Static Site**, set **Publish directory** to `.`
4. Add your custom domain under **Settings → Domains**, and deploy.

### Spaces (CDN static hosting)
1. Create a Space → enable **CDN** and **Static Site**.
2. Upload all files to the Space root (ensure `sw.js` is at `/`).
3. Set **Index** and **Error** documents to `index.html`.
4. (Optional) Add a CNAME to your domain and attach a DO-managed certificate.

## Customize
- Add/edit packs in `phrases.json`.
- If you modify the service worker, bump the cache name in `sw.js` to force updates.

Enjoy the corporate-speak chaos. 🔮
