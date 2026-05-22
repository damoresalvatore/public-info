# public-info

Public reference page for the UpATree Twitch channel. Hosts the bot command index and the rules for cheering bits to time someone out.

Live at: **https://&lt;your-github-username&gt;.github.io/public-info/**
(after the GitHub Pages setup step below).

## What's here

| File | What it does |
|---|---|
| `index.html` | The page itself. Two sections: Chat Commands and Timeout with Bits. |
| `styles.css` | All visual styling. Dark theme, purple accents, Fraunces + DM Sans + JetBrains Mono via Google Fonts. |
| `app.js` | Loads `commands.json` at page load, renders the list, wires up the filter input and the calculator. |
| `commands.json` | Source of truth for the command list. Shape: `{ "commands": [ { "title": "!cmd", "response": "...", "type": "text", "interval": false }, ... ] }`. |

No build step. No framework. No npm. GitHub Pages serves the files as-is.

## Updating the command list

The page reads `commands.json` from this same directory at load time. To update what visitors see:

1. Edit `commands.json` directly, or copy a fresh export from the private Overlay repo's `Bot/commands.json`.
2. `git commit` and `git push`.
3. GitHub Pages re-serves the new file within a minute or two. No rebuild needed.

The page sorts commands alphabetically by title and supports live search across both the trigger and the response text. Long responses wrap. URLs in responses become clickable automatically.

## Updating the Timeout with Bits rules

The rules are baked into `index.html` (the static "Rules" card) and `app.js` (the calculator math, in the `CALC` object near the top). If the collector's `PAID_TIMEOUT_DEFAULTS` change, update both — they should stay in sync.

Current constants mirror collector.js:
```
secondsPer100Bits:        120     // 100 bits = 2 min
maxSessionSecondsPerUser: 600     // 10 min per-target cap
minBitsPerTimeout:        100     // floor per target
PAID_TIMEOUT_MAX_TARGETS: 3
```

## GitHub Pages setup (one-time)

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Pick the `main` branch and the `/ (root)` folder.
5. Save. Wait a minute. Open the URL GitHub shows you.

That's it.

## Local preview

Open `index.html` directly in a browser, or for proper fetch behavior:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Without a local server, the `fetch('./commands.json')` call fails in some browsers due to `file://` CORS rules.

## Notes

- Fonts come from Google Fonts CDN. No font files are stored in the repo.
- No analytics, no trackers, no cookies. Just the page.
- The grain texture is inline SVG, no external image.
