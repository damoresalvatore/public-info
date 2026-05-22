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
            const respEscaped  = escapeHtml(cmd.response || '');
            const respLinked   = linkify(respEscaped);
            const titleHi      = highlight(titleEscaped, queryEscaped);
            const respHi       = highlight(respLinked, queryEscaped);
            const interval     = cmd.interval && cmd.interval !== false
                ? `<span class="cmd-meta">${escapeHtml(String(cmd.interval))}</span>`
                : '';
            return `
                <li class="cmd" role="listitem">
                    <span class="cmd-title">${titleHi}</span>
                    ${interval}
                    <p class="cmd-response">${respHi}</p>
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
        maxSessionSecondsPerUser: 600,    // per-target cap
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

    function init() {
        // Commands
        if (els.list && els.filter) {
            els.filter.addEventListener('input', onFilterInput);
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
