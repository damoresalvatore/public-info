/* ─────────────────────────────────────────────────────────────────────────
   UPATREE — SC2 Games
   Reads sc2/index.json and the recent month files, which the Overlay box
   rebuilds nightly (scripts/export-sc2.js in the private Overlay repo).
   ───────────────────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    // sc2/ sits next to this script, whichever page loads it.
    const BASE = new URL('sc2/', document.currentScript.src).href;
    const CHART_MONTHS = 6;
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

    const $ = (sel) => document.querySelector(sel);
    const el = {
        status: $('#sc2-status'),
        body:   $('#sc2-body'),
        strip:  $('#sc2-strip'),
        mmr:    $('#sc2-mmr'),
        mmrSub: $('#sc2-mmr-sub'),
        mmrTitle: $('#sc2-mmr-title'),
        mu:     $('#sc2-mu'),
        grades: $('#sc2-grades'),
        months: $('#sc2-months'),
        rows:   $('#sc2-rows'),
        offrace: $('#sc2-offrace'),
        dls:    $('#sc2-dls'),
        dlMeta: $('#sc2-dl-meta'),
        sample: $('#sc2-sample')
    };

    const cache = new Map();
    let index = null;
    let selected = null;
    let showOffRace = true;

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const pct = (w, n) => (n ? `${Math.round((w / n) * 100)}%` : '–');
    const size = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
    const monthLabel = (m) => `${MON[parseInt(m.slice(5), 10) - 1]} ${m.slice(0, 4)}`;
    const shortMonth = (m) => `${MON[parseInt(m.slice(5), 10) - 1]} ${m.slice(2, 4)}`;
    const len = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const initial = (race) => (race ? race[0].toUpperCase() : '?');

    function getJson(name) {
        if (!cache.has(name)) {
            cache.set(name, fetch(BASE + name, { cache: 'no-cache' }).then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            }));
        }
        return cache.get(name);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Summary: strip, MMR line, matchups, grades (from the recent months)
    // ──────────────────────────────────────────────────────────────────────

    function renderSummary(recent) {
        const main = recent.filter((g) => !g.off_race && g.region !== 'PTR');

        // Chart the region + race played most, so one ladder's MMR is one line.
        const counts = new Map();
        for (const g of main) {
            const k = `${g.region}|${g.hero_race}`;
            counts.set(k, (counts.get(k) || 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        const [region, race] = top ? top[0].split('|') : ['', ''];
        const daily = new Map();
        for (const g of main) {
            const mmr = g.hero_mmr_after ?? g.hero_mmr;
            if (g.region === region && g.hero_race === race && mmr) daily.set(g.time_utc.slice(0, 10), mmr);
        }
        const points = [...daily.entries()];

        const last = index.months[index.months.length - 1];
        const current = points.length ? points[points.length - 1][1] : '–';
        const peak = points.length ? Math.max(...points.map((p) => p[1])) : '–';
        el.strip.innerHTML = [
            ['Games logged', index.games.toLocaleString(), `since ${monthLabel(index.first_game.slice(0, 7))}`],
            ['All-time record', `${index.wins}–${index.losses}`, pct(index.wins, index.games)],
            ['Current MMR', current, `${region} ${race}, after last game`],
            [`Peak, last ${CHART_MONTHS} months`, peak, `${region} ${race}`],
            [`${monthLabel(last.month)}`, `${last.wins}–${last.losses}`, pct(last.wins, last.games)]
        ].map(([label, value, sub]) => `
            <div class="sc2-stat">
                <span class="sc2-label">${escapeHtml(label)}</span>
                <b>${escapeHtml(value)}</b>
                <small>${escapeHtml(sub)}</small>
            </div>`).join('');

        el.mmrTitle.textContent = `MMR, ${region} ${race}`;
        el.mmrSub.textContent = points.length ? `${points[0][0]} → ${points[points.length - 1][0]}` : '';
        el.mmr.innerHTML = points.length > 1 ? mmrSvg(points) : '<p class="sc2-empty">Not enough games yet.</p>';

        const mu = new Map();
        for (const g of main) {
            const k = g.villain_race || '?';
            const a = mu.get(k) || { n: 0, w: 0 };
            a.n += 1;
            if (g.outcome === 'W') a.w += 1;
            mu.set(k, a);
        }
        el.mu.innerHTML = ['Protoss', 'Terran', 'Zerg'].filter((r) => mu.has(r)).map((r) => {
            const { n, w } = mu.get(r);
            return `
                <div class="sc2-bar">
                    <span class="sc2-bar-k">${initial(race)}v${initial(r)}</span>
                    <span class="sc2-track"><span style="width:${(w / n) * 100}%"></span></span>
                    <span class="sc2-bar-v">${pct(w, n)} · ${n}</span>
                </div>`;
        }).join('');

        const gc = new Map();
        for (const g of main) if (g.grade) gc.set(g.grade, (gc.get(g.grade) || 0) + 1);
        const gmax = Math.max(1, ...gc.values());
        el.grades.innerHTML = GRADES.map((g) => {
            const n = gc.get(g) || 0;
            return `<div title="${g}: ${n} games"><i style="height:${Math.max(2, (n / gmax) * 46)}px"></i><span>${g}</span></div>`;
        }).join('');
    }

    function mmrSvg(points) {
        const W = 640, H = 230, L = 40, R = 12, T = 14, B = 26;
        const vals = points.map((p) => p[1]);
        const lo = Math.floor((Math.min(...vals) - 30) / 100) * 100;
        const hi = Math.ceil((Math.max(...vals) + 30) / 100) * 100;
        const t0 = Date.parse(points[0][0]);
        const t1 = Date.parse(points[points.length - 1][0]);
        const x = (d) => L + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - L - R);
        const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

        let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="MMR by day">`;
        for (let v = lo; v <= hi; v += 100) {
            s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="sc2-grid"/>`;
            s += `<text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
        }
        const seen = new Set();
        for (const [d] of points) {
            const m = d.slice(0, 7);
            if (seen.has(m)) continue;
            seen.add(m);
            const mx = Math.max(L, x(`${m}-01`));
            if (mx < W - R - 20) s += `<text x="${mx}" y="${H - 8}">${MON[parseInt(m.slice(5), 10) - 1]}</text>`;
        }
        const pts = points.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const [ld, lv] = points[points.length - 1];
        s += `<defs><linearGradient id="sc2-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="var(--pp-1)" stop-opacity=".28"/>
                <stop offset="1" stop-color="var(--pp-1)" stop-opacity="0"/></linearGradient></defs>`;
        s += `<polygon fill="url(#sc2-fill)" points="${x(points[0][0])},${H - B} ${pts} ${x(ld)},${H - B}"/>`;
        s += `<polyline fill="none" stroke="var(--pp-1)" stroke-width="1.8" stroke-linejoin="round" points="${pts}"/>`;
        s += `<circle cx="${x(ld)}" cy="${y(lv)}" r="4" fill="var(--pp-hot)"/>`;
        s += `<text x="${x(ld) - 8}" y="${y(lv) - 9}" text-anchor="end" class="sc2-last">${lv}</text></svg>`;
        return s;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Month picker + table
    // ──────────────────────────────────────────────────────────────────────

    function renderMonths() {
        el.months.innerHTML = index.months.slice().reverse().map((m) => `
            <button type="button" data-m="${m.month}" aria-pressed="${m.month === selected}">
                ${shortMonth(m.month)}<small>${m.wins}–${m.losses}</small>
            </button>`).join('');
    }

    function renderRows(games) {
        const list = games.slice().reverse().filter((g) => showOffRace || !g.off_race);
        el.rows.innerHTML = list.map((g) => {
            const d = g.hero_mmr_after && g.hero_mmr ? g.hero_mmr_after - g.hero_mmr : null;
            const delta = d === null ? '–' : `<span class="sc2-delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</span>`;
            const res = g.outcome === 'W' ? 'WIN' : g.outcome === 'L' ? 'LOSS' : 'DRAW';
            const hr = initial(g.hero_race);
            const vr = initial(g.villain_race);
            return `
                <tr class="${g.off_race ? 'is-off' : ''}">
                    <td class="mono">${escapeHtml(g.time_utc.slice(5, 10))} ${escapeHtml(g.time_utc.slice(11, 16))}</td>
                    <td><span class="sc2-res sc2-res--${g.outcome}">${res}</span></td>
                    <td>${escapeHtml(g.map.replace(/ LE$/, ''))}</td>
                    <td class="mono"><span class="sc2-race sc2-race--${hr}">${hr}</span>v<span class="sc2-race sc2-race--${vr}">${vr}</span>${g.off_race ? '<span class="sc2-tag">off-race</span>' : ''}</td>
                    <td>${escapeHtml(g.villain_name || '–')} <span class="mono sc2-faint">${g.villain_mmr || ''}</span></td>
                    <td class="mono">${g.hero_mmr || '–'}</td>
                    <td class="mono">${delta}</td>
                    <td class="mono">${len(g.duration_sec)}</td>
                    <td class="mono">${escapeHtml(g.grade || '–')}</td>
                    <td class="mono">${escapeHtml(g.region)}</td>
                </tr>`;
        }).join('') || '<tr><td colspan="10" class="sc2-empty">No games this month.</td></tr>';
    }

    function selectMonth(month) {
        selected = month;
        renderMonths();
        renderDownloads();
        el.rows.innerHTML = '<tr><td colspan="10" class="sc2-empty">Loading…</td></tr>';
        getJson(`games-${month}.json`).then((games) => {
            if (selected === month) renderRows(games);
        }).catch(() => {
            el.rows.innerHTML = '<tr><td colspan="10" class="sc2-empty">Could not load this month.</td></tr>';
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Downloads
    // ──────────────────────────────────────────────────────────────────────

    function renderDownloads() {
        const m = index.months.find((x) => x.month === selected);
        const all = (name) => index.files.find((f) => f.name === name);
        const files = [
            ['all.csv', 'Every game, one row each', all('all.csv').bytes, 'CSV'],
            ['all.json', 'Every game, every field', all('all.json').bytes, 'JSON'],
            [`games-${selected}.csv`, `${monthLabel(selected)}, ${m.games} games`, m.csv_bytes, 'CSV'],
            [`games-${selected}.json`, `${monthLabel(selected)}, with per-metric grades`, m.json_bytes, 'JSON']
        ];
        el.dls.innerHTML = files.map(([name, desc, bytes, fmt]) => `
            <a class="sc2-dl" href="${BASE}${name}" download>
                <span><b>${name}</b><small>${escapeHtml(desc)} · ${size(bytes)}</small></span>
                <span class="sc2-fmt">${fmt}</span>
            </a>`).join('');
    }

    // ──────────────────────────────────────────────────────────────────────
    // Boot
    // ──────────────────────────────────────────────────────────────────────

    function init() {
        if (!el.body) return;
        getJson('index.json').then((idx) => {
            index = idx;
            const recentMonths = index.months.slice(-CHART_MONTHS).map((m) => m.month);
            selected = recentMonths[recentMonths.length - 1];
            el.dlMeta.textContent = `${index.games.toLocaleString()} games · last game ${index.last_game.slice(0, 10)}`;
            el.status.hidden = true;
            el.body.hidden = false;
            selectMonth(selected);
            return Promise.all(recentMonths.map((m) => getJson(`games-${m}.json`)));
        }).then((lists) => {
            const recent = lists.flat();
            renderSummary(recent);
            const sample = { ...recent[recent.length - 1] };
            if (sample.metric_grades) {
                const first = Object.keys(sample.metric_grades)[0];
                sample.metric_grades = { [first]: sample.metric_grades[first], '…': 'more metrics' };
            }
            el.sample.textContent = JSON.stringify(sample, null, 2);
        }).catch((err) => {
            console.error('[sc2] load failed:', err);
            el.status.hidden = false;
            el.status.textContent = 'Could not load the game data.';
            el.status.style.color = 'var(--cap)';
        });

        el.months.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-m]');
            if (b && b.dataset.m !== selected) selectMonth(b.dataset.m);
        });
        el.offrace.addEventListener('click', () => {
            showOffRace = !showOffRace;
            el.offrace.setAttribute('aria-pressed', String(showOffRace));
            el.offrace.textContent = `Off-race games: ${showOffRace ? 'shown' : 'hidden'}`;
            getJson(`games-${selected}.json`).then(renderRows).catch(() => {});
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
