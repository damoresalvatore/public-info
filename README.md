# public-info

Public info site for the UpATree Twitch channel: stream stats, the bot's chat commands, the timeout-with-bits rules, the stream themes, every SC2 ladder game, the files behind them, and where to find the channel elsewhere.

Live at: **https://upatree.ca/** (the old https://damoresalvatore.github.io/public-info/ address redirects there)

## What's here

Each section is its own page in its own folder. The home page lists them, grouped by where a viewer meets them.

| File | What it does |
|---|---|
| `index.html` | Home: a short intro, the headline stats and a shuffle of fun facts, and a card for every section. |
| `stats/index.html` | Stream stats: SC2, Break Time, Predictions, Timeouts and Pokemon tabs (`#sc2`, `#bt`, ...). |
| `commands/index.html` | Chat commands, searchable. |
| `sc2/index.html` | SC2 games: stats, MMR chart, games by month, downloads. |
| `timeout/index.html` | Timeout with bits: rules, calculator, examples. |
| `pokemon/index.html` | Pokemon: Rules (animated examples of each way to play), Pure Red (how it differs from Red), Team (the current run, from `pk.team` in `stats/stats.json`) and Stats tabs (`#rules`, `#purered`, `#team`, `#stats`). Sprites, trainer pictures and the Route 3 screen live beside it. |
| `contact/index.html` | Contact: Twitch, YouTube, Discord, Instagram and email, one card each in the platform's color. Static, no script. |
| `themes/index.html` | Every stream theme, drawn in its own colors. |
| `data/index.html` | Open data: every downloadable file in one list. |
| `site.js` | The list of sections. Draws the top bar, breadcrumbs, footer sitemap and the home page cards from it. |
| `styles.css` | All visual styling. Dark theme, purple accents, Fraunces + DM Sans + JetBrains Mono via Google Fonts. |
| `app.js` | Commands list and filter, the bits calculator, and the theme cards. Each part runs only on the page that has it. |
| `sc2.js` | Renders the SC2 page from `sc2/`. |
| `stats.js`, `stats.css` | Render the Stats page from `stats/stats.json`. |
| `home-stats.js` | The home page's headline numbers and fun facts, from `stats/stats.json`. |
| `data.js` | Renders the open data list from `sc2/index.json`. |
| `commands.json` | Source of truth for the command list. Shape: `{ "commands": [ { "title": "!cmd", "response": "...", "type": "text", "interval": false }, ... ] }`. |
| `themes.json` | Every theme and its colors. |
| `sc2/` | Every SC2 game as CSV and JSON (`all.*`, one `games-YYYY-MM.*` pair per month, `index.json`). Rebuilt and pushed nightly by `scripts/export-sc2.sh` on the Overlay box; don't edit the data files by hand. `sc2/index.html` is the page and is safe to edit. |
| `og/mark.png` | The small square image link apps show beside a link to the site. See [Link previews](#link-previews). |
| `stats/stats.json` | The summarized stats behind the Stats page and the home page facts. Rebuilt and pushed nightly by `scripts/export-stats.js` (run from `export-sc2.sh`) on the Overlay box; don't edit it by hand. |

The scripts find the data files relative to their own location, and `site.js` builds every link from its own location, so the site works at the root of upatree.ca and under `/public-info/` on github.io alike.

## Adding a section

1. Copy one of the section folders, say `themes/`, to a new folder and change its content.
2. Add one entry to `SECTIONS` in `site.js` (and a new group to `GROUPS` if it needs one).
3. Push. The top bar, the home card and the footer link show up on every page.

No build step. No framework. No npm. GitHub Pages serves the files as-is.

## Updating the command list

The Commands page reads `commands.json` from the site root at load time. To update what visitors see:

1. Edit `commands.json` directly, or copy a fresh export from the private Overlay repo's `Bot/commands.json`.
2. `git commit` and `git push`.
3. GitHub Pages re-serves the new file within a minute or two. No rebuild needed.

The page sorts commands alphabetically by title and supports live search across both the trigger and the response text. Long responses wrap. URLs in responses become clickable automatically.

## Updating the Timeout with Bits rules

The rules are baked into `timeout/index.html` (the static "Rules" card) and `app.js` (the calculator math, in the `CALC` object near the top). If the collector's `PAID_TIMEOUT_DEFAULTS` change, update both — they should stay in sync.

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

## Custom domain

`CNAME` holds `upatree.ca`, which tells GitHub Pages to serve the site there. Keep it in the repo: deleting it drops the custom domain. DNS is on Cloudflare: four A records on the apex (`185.199.108.153` to `185.199.111.153`) and a `www` CNAME to `damoresalvatore.github.io`, all DNS only (grey cloud). GitHub redirects `www.upatree.ca` to `upatree.ca` on its own.

## Link previews

When a page is linked in Discord, Twitter or iMessage, the `og:*` and `twitter:card` tags in its `<head>` decide the card: the page's title and description, the small `og/mark.png` thumbnail (a 24×24 pixel tree drawn at 512px) (`twitter:card` is `summary`, not the full-width `summary_large_image`), and the purple accent bar (`theme-color`). Image and page URLs must be absolute (`https://upatree.ca/...`). A new section copies the same block of tags with its own `og:url` and `canonical`.

Discord caches a link's card for a while, so a change can take time to show on links already posted. It also ignores the `#tab` part of a link, so a Stats tab such as `#pokemon` shares the Stats card.

## Local preview

Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Opening `index.html` straight from disk doesn't work well: the data fetches fail under `file://`, and folder links like `commands/` don't open their `index.html`.

## Notes

- Fonts come from Google Fonts CDN. No font files are stored in the repo.
- No analytics, no trackers, no cookies. Just the page.
- The grain texture is inline SVG, no external image.
