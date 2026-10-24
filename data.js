/* ─────────────────────────────────────────────────────────────────────────
   UPATREE — Open Data
   Lists every downloadable file. The SC2 rows come from sc2/index.json, so
   new months show up on their own.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    const ROOT = new URL('.', document.currentScript.src);
    const url = (path) => new URL(path, ROOT).href;
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const $ = (sel) => document.querySelector(sel);
    const el = {
        status: $('#data-status'),
        body:   $('#data-body'),
        rows:   $('#data-rows')
    };

    const size = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
    const monthLabel = (m) => `${MON[parseInt(m.slice(5), 10) - 1]} ${m.slice(0, 4)}`;

    // Name each section once, on its first row.
    let lastSection = '';

    function row(section, sectionPath, file, desc, bytes) {
        const fmt = file.endsWith('.csv') ? 'CSV' : 'JSON';
        const label = section === lastSection ? '' : `<a href="${url(sectionPath)}">${section}</a>`;
        lastSection = section;
        return `
            <tr>
                <td>${label}</td>
                <td class="mono">${file}</td>
                <td>${desc}</td>
                <td>${bytes ? size(bytes) : '–'}</td>
                <td><a class="sc2-fmt" href="${url(file)}" download>${fmt}</a></td>
            </tr>`;
    }

    function render(index) {
        const all = (name) => index.files.find((f) => f.name === name);
        const games = index.games.toLocaleString('en-US');
        const months = index.months.slice().reverse();
        el.rows.innerHTML = [
            row('SC2 games', 'sc2/', 'sc2/all.csv', `Every game, one row each (${games})`, all('all.csv').bytes),
            row('SC2 games', 'sc2/', 'sc2/all.json', 'Every game, every field', all('all.json').bytes),
            row('SC2 games', 'sc2/', 'sc2/index.json', 'Totals, columns and the file list', 0),
            ...months.flatMap((m) => [
                row('SC2 games', 'sc2/', `sc2/games-${m.month}.csv`, `${monthLabel(m.month)}, ${m.games} games`, m.csv_bytes),
                row('SC2 games', 'sc2/', `sc2/games-${m.month}.json`, `${monthLabel(m.month)}, with per-metric grades`, m.json_bytes)
            ]),
            row('Chat commands', 'commands/', 'commands.json', 'Every trigger and its reply', 0),
            row('Stream themes', 'themes/', 'themes.json', 'Every theme with all its colors', 0)
        ].join('');
        el.status.hidden = true;
        el.body.hidden = false;
    }

    if (!el.rows) return;
    fetch(url('sc2/index.json'), { cache: 'no-cache' })
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(render)
        .catch((err) => {
            console.error('[data] sc2/index.json:', err);
            el.status.textContent = 'Could not load sc2/index.json.';
            el.status.style.color = 'var(--cap)';
        });
})();
