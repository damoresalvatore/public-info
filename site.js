/* ─────────────────────────────────────────────────────────────────────────
   UPATREE — Site shell
   The one list of sections. Draws the top bar, breadcrumbs, footer sitemap,
   and the home page's section cards from it. Load it at the end of <body>
   (not deferred) so the nav is there on first paint.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    // Site root, from this script's own URL. Works at the root of upatree.ca
    // and under /public-info/ on github.io.
    const ROOT = new URL('.', document.currentScript.src);
    const url = (path) => new URL(path, ROOT).href;

    // Home page groups, in display order.
    const GROUPS = [
        { id: 'stats',  label: 'Stats',        blurb: 'Leaderboards, records and charts.' },
        { id: 'chat',   label: 'In chat',      blurb: 'Things you type or cheer.' },
        { id: 'sc2',    label: 'StarCraft II', blurb: 'The ladder, in numbers.' },
        { id: 'screen', label: 'On screen',    blurb: 'How the stream looks.' },
        { id: 'more',   label: 'More',         blurb: 'The files behind the site.' },
        { id: 'find',   label: 'Find us',      blurb: 'Everywhere else UpATree lives.' }
    ];

    // Top bar order. To add a section: make a folder with an index.html like
    // the others, then add one entry here.
    const SECTIONS = [
        { id: 'stats',    group: 'stats',  nav: 'Stats',    title: 'Stream stats',      path: 'stats/',    blurb: 'SC2, Break Time, predictions, timeouts and Pokemon.' },
        { id: 'commands', group: 'chat',   nav: 'Commands', title: 'Chat commands',     path: 'commands/', blurb: 'Every trigger the bot answers, searchable.' },
        { id: 'sc2',      group: 'sc2',    nav: 'SC2',      title: 'SC2 games',         path: 'sc2/',      blurb: 'Every 1v1 ladder game with MMR, grade and replay stats.' },
        { id: 'timeout',  group: 'chat',   nav: 'Timeouts', title: 'Timeout with bits', path: 'timeout/',  blurb: 'Cheer to time someone out. Rules and a calculator.', meta: '100 bits = 2 min' },
        { id: 'pokemon',  group: 'chat',   nav: 'Pokemon',  title: 'Pokemon',           path: 'pokemon/',  blurb: 'How to play the chat nuzlocke, the game it runs on, and the current team.', meta: 'Rules · Pure Red · Team · Stats' },
        { id: 'themes',   group: 'screen', nav: 'Themes',   title: 'Stream themes',     path: 'themes/',   blurb: 'Every color theme the overlay can wear.' },
        { id: 'data',     group: 'more',   nav: 'Data',     title: 'Open data',         path: 'data/',     blurb: 'Every downloadable file on the site in one list.', meta: 'CSV · JSON' },
        { id: 'contact',  group: 'find',   nav: 'Contact',  title: 'Contact',           path: 'contact/',  blurb: 'Twitch, YouTube, Discord, Instagram and email.', meta: '5 places' }
    ];

    const page = document.body.dataset.page || 'home';
    const $ = (sel) => document.querySelector(sel);

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderTopbar(el) {
        const links = SECTIONS.map((s) => {
            const cur = s.id === page ? ' aria-current="page"' : '';
            return `<a href="${url(s.path)}"${cur}>${s.nav}</a>`;
        }).join('');
        el.innerHTML = `
            <div class="topbar-inner">
                <nav class="mainnav" aria-label="Site">${links}</nav>
                <a class="watch" href="https://twitch.tv/upatree" rel="noopener">Watch on Twitch</a>
            </div>
        `;
    }

    function renderCrumbs(el) {
        const s = SECTIONS.find((x) => x.id === page);
        if (!s) return;
        const g = GROUPS.find((x) => x.id === s.group);
        el.innerHTML = `<a href="${url('')}">Home</a><span>/</span><span>${g.label}</span>`;
    }

    function renderFooter(el) {
        const cols = GROUPS.map((g) => `
            <div>
                <h2 class="sitemap-label">${g.label}</h2>
                ${SECTIONS.filter((s) => s.group === g.id).map((s) => `<a href="${url(s.path)}">${s.title}</a>`).join('')}
            </div>
        `).join('');
        el.innerHTML = `
            <div class="footer-inner">
                <nav class="sitemap" aria-label="All sections">${cols}</nav>
                <div class="footer-line">
                    <span class="footer-mark">UPT</span>
                    <span class="footer-text">
                        Built by <a href="https://twitch.tv/upatree" rel="noopener">UpATree</a>
                        · no trackers, no cookies
                    </span>
                </div>
            </div>
        `;
    }

    function renderHome(el) {
        el.innerHTML = GROUPS.map((g) => `
            <section class="group" aria-labelledby="group-${g.id}">
                <div class="group-label">
                    <h2 id="group-${g.id}">${g.label}</h2>
                    <p>${g.blurb}</p>
                </div>
                <div class="cards">
                    ${SECTIONS.filter((s) => s.group === g.id).map((s) => `
                        <a class="home-card" href="${url(s.path)}">
                            <h3>${s.title}</h3>
                            <p>${s.blurb}</p>
                            <span class="home-card-meta"><span data-meta="${s.id}">${escapeHtml(s.meta || '')}</span><span>Open →</span></span>
                        </a>
                    `).join('')}
                </div>
            </section>
        `).join('');
        fillHomeFacts();
    }

    // Live numbers for the home page. Small files only: commands.json is
    // too big to fetch just for a count.
    function fillHomeFacts() {
        const getJson = (path) => fetch(url(path), { cache: 'no-cache' }).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });
        const set = (sel, text) => {
            const el = document.querySelector(sel);
            if (el) el.textContent = text;
        };

        getJson('sc2/index.json').then((i) => {
            const games = i.games.toLocaleString('en-US');
            set('[data-meta="sc2"]', `${games} games`);
            set('[data-fact="games"]', games);
            set('[data-fact="winrate"]', `${((i.wins / i.games) * 100).toFixed(1)}%`);
            set('[data-fact="last"]', i.last_game.slice(0, 10));
        }).catch((err) => console.error('[home] sc2/index.json:', err));

        getJson('themes.json').then((t) => {
            set('[data-meta="themes"]', `${Object.keys(t).length} themes`);
        }).catch((err) => console.error('[home] themes.json:', err));
    }

    const topbar = $('#topbar');
    const crumbs = $('#crumbs');
    const footer = $('#footer');
    const home = $('#home-groups');
    if (topbar) renderTopbar(topbar);
    if (crumbs) renderCrumbs(crumbs);
    if (footer) renderFooter(footer);
    if (home) renderHome(home);
})();
