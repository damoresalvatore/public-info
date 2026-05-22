/* ─────────────────────────────────────────────────────────────────────────
   UPATREE — Command Index
   Plain JS, no deps. Loads commands.json, filters, runs the bits calculator.
   ───────────────────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    // ──────────────────────────────────────────────────────────────────────
    // Utilities
    // ──────────────────────────────────────────────────────────────────────

    const $  = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeRegExp(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Auto-link URLs in command responses, but only after the rest is escaped.
    function linkify(escapedText) {
        const urlRe = /(https?:\/\/[^\s<]+[^\s<.,;!?:'")\]])/g;
        return escapedText.replace(urlRe, (url) => {
            const safe = escapeHtml(url);
            return `<a href="${safe}" rel="noopener nofollow" target="_blank">${safe}</a>`;
        });
    }

    function highlight(escapedText, queryEscaped) {
        if (!queryEscaped) return escapedText;
        // Highlight is applied AFTER linkify, so we must not break <a> tags.
        // Strategy: tokenize around tags, mark only text outside of them.
        const parts = escapedText.split(/(<a [^>]*>[^<]*<\/a>)/g);
        const re = new RegExp(`(${queryEscaped})`, 'gi');
        return parts.map((p) => {
            if (p.startsWith('<a ')) return p;
            return p.replace(re, '<mark>$1</mark>');
        }).join('');
    }

    function formatMMSS(totalSeconds) {
        const s = Math.max(0, Math.round(totalSeconds));
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Commands — load + render + filter
    // ──────────────────────────────────────────────────────────────────────

    const COMMANDS_URL = './commands.json';
    let allCommands = [];

    const els = {
        list:     $('#commands-list'),
        status:   $('#commands-status'),
        empty:    $('#empty-state'),
        filter:   $('#filter-input'),
        count:    $('#filter-count')
    };

    function loadCommands() {
        return fetch(COMMANDS_URL, { cache: 'no-cache' })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                const commands = Array.isArray(data) ? data : (data.commands || []);
                allCommands = commands
                    .filter((c) => c && typeof c.title === 'string')
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title));
                els.status.hidden = true;
                applyFilter('');
            })
            .catch((err) => {
                console.error('[commands] load failed:', err);
                els.status.textContent = 'Could not load commands.json — check the file is committed alongside index.html.';
                els.status.style.color = 'var(--cap)';
            });
    }

    function renderCommands(list, query) {
        const queryEscaped = query ? escapeRegExp(query) : '';
        if (!list.length) {
            els.list.innerHTML = '';
            els.empty.hidden = false;
            els.count.textContent = `0 of ${allCommands.length}`;
            return;
        }
        els.empty.hidden = true;

        const html = list.map((cmd) => {
            const titleEscaped = escapeHtml(cmd.title);
            const titleHi      = highlight(titleEscaped, queryEscaped);

            // Compose meta tags (right-aligned chips: AUTO for interval timers,
            // DYNAMIC for function-type commands generated at runtime by the bot)
            const metas = [];
            if (cmd.type === 'function') {
                metas.push('<span class="cmd-meta cmd-meta--dynamic">Dynamic</span>');
            }
            if (cmd.interval && cmd.interval !== false) {
                const label = cmd.interval === true ? 'Auto' : `Every ${escapeHtml(String(cmd.interval))}`;
                metas.push(`<span class="cmd-meta cmd-meta--auto">${label}</span>`);
            }
            const metaBlock = metas.length ? `<span class="cmd-metas">${metas.join('')}</span>` : '';

            // Render response. Function commands with empty responses get an
            // explanatory placeholder instead of looking like broken rows.
            let respBody;
            const trimmedResp = (cmd.response || '').trim();
            if (!trimmedResp && cmd.type === 'function') {
                respBody = '<em class="cmd-dynamic-note">Bot generates this in real time.</em>';
            } else if (!trimmedResp) {
                respBody = '<em class="cmd-dynamic-note">No response set.</em>';
            } else {
                const respEscaped = escapeHtml(cmd.response);
                const respLinked  = linkify(respEscaped);
                respBody = highlight(respLinked, queryEscaped);
            }

            return `
                <li class="cmd" role="listitem" tabindex="0" data-expanded="false">
                    <span class="cmd-title">${titleHi}</span>
                    <p class="cmd-response">${respBody}</p>
                    ${metaBlock}
                </li>
            `;
        }).join('');

        els.list.innerHTML = html;
        els.count.textContent = list.length === allCommands.length
            ? `${list.length} total`
            : `${list.length} of ${allCommands.length}`;
    }

    function applyFilter(rawQuery) {
        const q = String(rawQuery || '').trim().toLowerCase();
        if (!q) {
            renderCommands(allCommands, '');
            return;
        }
        const filtered = allCommands.filter((c) => {
            const t = (c.title || '').toLowerCase();
            const r = (c.response || '').toLowerCase();
            return t.includes(q) || r.includes(q);
        });
        renderCommands(filtered, q);
    }

    // Debounced filter — keeps typing snappy at 100ms
    let filterTimer = null;
    function onFilterInput(e) {
        const v = e.target.value;
        if (filterTimer) clearTimeout(filterTimer);
        filterTimer = setTimeout(() => applyFilter(v), 80);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Calculator — bits → three fates
    // ──────────────────────────────────────────────────────────────────────

    const CALC = {
        // Pulled from collector.js PAID_TIMEOUT_DEFAULTS
        secondsPer100Bits:        120,    // 100 bits = 2 min
        maxSessionSecondsPerUser: 1800,   // per-target cap (30 min)
        minBitsPerTimeout:        100     // floor per target
    };

    const calcEls = {
        slider: $('#calc-bits'),
        value:  $('#calc-value'),
        fates:  $('#fates')
    };

    function computeFate(totalBits, targetCount) {
        const perTarget = Math.floor(totalBits / targetCount);
        if (perTarget < CALC.minBitsPerTimeout) {
            return {
                targets:   targetCount,
                perTarget: perTarget,
                seconds:   0,
                state:     'blocked',
                reason:    `Need ${CALC.minBitsPerTimeout * targetCount}+ bits`
            };
        }
        const rawSec = (perTarget / 100) * CALC.secondsPer100Bits;
        const capped = rawSec > CALC.maxSessionSecondsPerUser;
        const seconds = capped ? CALC.maxSessionSecondsPerUser : rawSec;
        return {
            targets:   targetCount,
            perTarget: perTarget,
            seconds:   seconds,
            state:     capped ? 'capped' : 'ok',
            reason:    capped
                ? `${perTarget} bits each (some wasted)`
                : `${perTarget} bits each`
        };
    }

    function renderFates(totalBits) {
        const fates = [1, 2, 3].map((n) => computeFate(totalBits, n));

        const html = fates.map((f) => {
            const labelText = f.targets === 1
                ? 'One target'
                : f.targets === 2 ? 'Two targets' : 'Three targets';

            let tag = '';
            let stateClass = 'fate--possible';
            if (f.state === 'blocked') {
                tag = '<span class="fate-tag fate-tag--blocked">Blocked</span>';
                stateClass = 'fate--blocked';
            } else if (f.state === 'capped') {
                tag = '<span class="fate-tag fate-tag--capped">Capped</span>';
            } else {
                tag = '<span class="fate-tag fate-tag--ok">OK</span>';
            }

            const timeBlock = f.state === 'blocked'
                ? '<div class="fate-time">— <span class="unit">min</span></div>'
                : `<div class="fate-time">${formatMMSS(f.seconds)} <span class="unit">min</span></div>`;

            return `
                <div class="fate ${stateClass}">
                    <div class="fate-label">${labelText}</div>
                    ${timeBlock}
                    <div class="fate-detail">${escapeHtml(f.reason)}</div>
                    ${tag}
                </div>
            `;
        }).join('');

        calcEls.fates.innerHTML = html;
    }

    function updateSliderTrack() {
        const slider = calcEls.slider;
        const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--fill', `${pct}%`);
    }

    function onSliderChange() {
        const bits = parseInt(calcEls.slider.value, 10) || 0;
        calcEls.value.textContent = bits.toLocaleString();
        updateSliderTrack();
        renderFates(bits);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Boot
    // ──────────────────────────────────────────────────────────────────────

    function wireCommandExpansion() {
        // Event delegation — click or Enter/Space on any row toggles its expanded state.
        function toggle(row) {
            if (!row) return;
            const cur = row.getAttribute('data-expanded') === 'true';
            row.setAttribute('data-expanded', cur ? 'false' : 'true');
        }
        els.list.addEventListener('click', (e) => {
            // Don't hijack clicks on links inside the response
            if (e.target.closest('a')) return;
            const row = e.target.closest('.cmd');
            toggle(row);
        });
        els.list.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const row = e.target.closest('.cmd');
            if (!row) return;
            e.preventDefault();
            toggle(row);
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Themes — load + render
    // ──────────────────────────────────────────────────────────────────────

    const THEMES_URL = './themes.json';

    const themeEls = {
        grid:   $('#themes-grid'),
        status: $('#themes-status')
    };

    function loadThemes() {
        return fetch(THEMES_URL, { cache: 'no-cache' })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                themeEls.status.hidden = true;
                renderThemes(data);
            })
            .catch((err) => {
                console.error('[themes] load failed:', err);
                themeEls.status.textContent = 'Could not load themes.json.';
                themeEls.status.style.color = 'var(--cap)';
            });
    }

    function renderThemes(themes) {
        const names = Object.keys(themes);
        const html = names.map((name, i) => {
            const t = themes[name];
            const text  = t['main-text-color']      || '#fff';
            const pri   = t['primary-color']        || '#888';
            const sec   = t['secondary-color']      || '#666';
            const bar   = t['background-bar-color'] || '#1a1a1a';
            const dark  = t['gradient-dark']        || '#111';
            const light = t['gradient-light']       || '#222';

            const num = String(i + 1).padStart(2, '0');
            const swatches = [
                { label: pri,   color: pri,   key: 'primary' },
                { label: sec,   color: sec,   key: 'secondary' },
                { label: bar,   color: bar,   key: 'bar' },
                { label: dark,  color: dark,  key: 'dark' },
                { label: light, color: light, key: 'light' }
            ];

            const style = [
                `--t-text: ${text}`,
                `--t-primary: ${pri}`,
                `--t-secondary: ${sec}`,
                `--t-bar: ${bar}`,
                `--t-dark: ${dark}`,
                `--t-light: ${light}`
            ].join('; ');

            const swatchHtml = swatches.map((s) => `
                <li title="${escapeHtml(s.key)} · ${escapeHtml(s.label)}">
                    <span class="sw-color" style="background: ${escapeHtml(s.color)}"></span>
                    <span class="sw-hex">${escapeHtml(s.label.toUpperCase())}</span>
                </li>
            `).join('');

            return `
                <article class="theme-card" style="${style}">
                    <div class="theme-card-bar">
                        <span class="theme-card-bar-rule"></span>
                        <span class="theme-card-bar-tick"></span>
                    </div>
                    <div class="theme-card-body">
                        <span class="theme-card-eyebrow">Theme ${num}</span>
                        <h3 class="theme-card-name">${escapeHtml(name)}</h3>
                        <div class="theme-card-tools">
                            <span class="theme-card-button">Action</span>
                            <span class="theme-card-bar-accent"></span>
                        </div>
                    </div>
                    <ul class="theme-swatches">${swatchHtml}</ul>
                </article>
            `;
        }).join('');

        themeEls.grid.innerHTML = html;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Boot
    // ──────────────────────────────────────────────────────────────────────

    function init() {
        // Commands
        if (els.list && els.filter) {
            els.filter.addEventListener('input', onFilterInput);
            wireCommandExpansion();
            // Cmd/Ctrl+K focuses the filter — a small power-user touch
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    els.filter.focus();
                    els.filter.select();
                }
            });
            loadCommands();
        }

        // Calculator
        if (calcEls.slider && calcEls.fates) {
            calcEls.slider.addEventListener('input', onSliderChange);
            onSliderChange();
        }

        // Themes
        if (themeEls.grid) {
            loadThemes();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
