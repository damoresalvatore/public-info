// Rebuilt nightly by scripts/export-stats.js on the Overlay box.
const STATS_URL = new URL('stats/stats.json', document.currentScript.src);
fetch(STATS_URL, { cache: 'no-cache' }).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}).then((D) => {
const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('en-US');
const short = (n) => n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);
const hrs = (s) => s >= 3600 ? `${(s / 3600).toFixed(1)}h` : `${Math.round(s / 60)}m`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const day = (d) => `${MON[parseInt(d.slice(5, 7), 10) - 1]} ${parseInt(d.slice(8, 10), 10)}`;
const P = D.pred, T = D.to, K = D.pk, S = D.sc2, R = P.rec, B = D.bt;
const wagered = P.monthly.reduce((a, m) => a + m[2], 0);

// predictions tab
$('pred-title').textContent = `${fmt(P.n)} predictions, ${short(wagered)} points on the line`;
// vertical bars drawn at the box's real pixel width, so labels stay 11 to 13px on any screen
// items: [label, sub, value, valueLabel, tooltip]
function barChart(id, items, color, step, axisFmt, aria, xTitle, yTitle) {
  const el = $(id);
  const W = Math.max(300, el.clientWidth), L = yTitle ? 70 : 52, Rr = 8, Tp = 30, B = (items.some((it) => it[1]) ? 44 : 28) + (xTitle ? 24 : 0), H = 280 + (xTitle ? 24 : 0);
  const max = Math.max(...items.map((it) => it[2]));
  const top = Math.ceil(max / step) * step;
  const bw = (W - L - Rr) / items.length;
  const y = (v) => Tp + (1 - v / top) * (H - Tp - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">`;
  for (let v = 0; v <= top; v += step) s += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" style="font-size:12px;fill:var(--text-mute)">${axisFmt(v)}</text>`;
  const thin = bw < 34;
  const sparse = items.some((it) => it[0] === '');
  items.forEach(([label, sub, v, vl, tip], i) => {
    const x = L + i * bw + bw * 0.16, w = bw * 0.68, cx = x + w / 2;
    s += `<rect x="${x}" y="${y(v)}" width="${w}" height="${y(0) - y(v)}" rx="2" fill="var(${color})"><title>${tip}</title></rect>`;
    if (!thin || v === max) s += `<text x="${cx}" y="${y(v) - 8}" text-anchor="middle" class="hi" style="font-size:12px">${vl}</text>`;
    // on narrow screens label every other bar so the numbers don't collide
    if (bw >= 22 || i % 2 === 0 || sparse) s += `<text x="${cx}" y="${H - B + 18}" text-anchor="middle" style="font-size:12px;fill:var(--text-soft)">${label}</text>`;
    if (sub) s += `<text x="${cx}" y="${H - B + 34}" text-anchor="middle" style="font-size:11px">${sub}</text>`;
  });
  if (xTitle) s += `<text x="${W / 2}" y="${H - 6}" text-anchor="middle" style="font-size:12px;fill:var(--text-mute)">${xTitle}</text>`;
  if (yTitle) s += `<text transform="translate(14 ${Tp + (H - Tp - B) / 2}) rotate(-90)" text-anchor="middle" style="font-size:12px;fill:var(--text-mute)">${yTitle}</text>`;
  el.innerHTML = `${s}</svg>`;
}
const CHARTS = [];
function chart(id, draw) {
  let lastW = 0;
  CHARTS.push(draw);
  new ResizeObserver(() => { const w = $(id).clientWidth; if (w && w !== lastW) { lastW = w; draw(); } }).observe($(id));
}
chart('monthly', () => barChart('monthly', P.monthly.map(([m, n, pts]) => [MON[parseInt(m.slice(5), 10) - 1], `${n}${$('monthly').clientWidth < 600 ? '' : ' preds'}`, pts, short(pts), `${fmt(pts)} points on ${n} predictions`]), '--c-pred', 5e6, short, 'Channel points bet per month'));
let flyN = 10;
function renderFly() {
  const mx = Math.max(P.winners[0][1], P.losers[0][1]);
  const board = (title, rows, c, unit) => `<div class="board" style="--c:var(${c})"><span class="hd" style="color:var(${c})">${title}</span>${rows.slice(0, flyN).map(([n, v, k], i) => `
    <span class="rk">${i + 1}</span><span class="nm" title="${esc(n)}">${esc(n)}</span>
    <span class="b" title="${esc(n)}: ${fmt(v)} over ${k} ${unit}"><span class="bar" style="width:${(v / mx) * 100}%"></span><span class="v">${short(v)}</span></span>`).join('')}</div>`;
  $('fly').innerHTML = board('Net won', P.winners, '--win', 'wins') + board('Lost', P.losers, '--loss', 'bets');
}
// both boards share one scale so bar lengths compare across them
renderFly();
$('flytoggle').addEventListener('click', (e) => { flyN = flyN === 10 ? 25 : 10; e.target.textContent = flyN === 10 ? 'Show top 25' : 'Show top 10'; renderFly(); });
const potMax = P.pots[0][1];
$('pots').innerHTML = P.pots.map(([n, v, w, d]) => `
  <div class="pot"><span class="t">${day(d)} · Prediction #${fmt(n)}</span><span class="m">${short(v)} · ${esc(w)}</span>
  <span class="track"><i style="width:${(v / potMax) * 100}%"></i></span></div>`).join('');
$('recs').innerHTML = [
  [short(R.biggestBet[1]), `Biggest single bet, by <em>${esc(R.biggestBet[0])}</em>. It ${R.biggestBet[2] ? 'hit' : 'missed'}.`],
  [short(R.biggestWin[1]), `Biggest single win, <em>${esc(R.biggestWin[0])}</em>`],
  [short(R.biggestLoss[1]), `Biggest single loss, <em>${esc(R.biggestLoss[0])}</em>`],
  [`${R.bestRatio[1]}×`, `Best payout, <em>${esc(R.bestRatio[0])}</em> on ${fmt(R.bestRatio[2])} points`],
  [R.winStreak[1], `Longest win streak, <em>${esc(R.winStreak[0])}</em>`],
  [R.lossStreak[1], `Longest losing streak, <em>${esc(R.lossStreak[0])}</em>`],
  [fmt(R.mostEntered[1]), `Most predictions entered, <em>${esc(R.mostEntered[0])}</em>`],
  [`${Math.round((R.bestRate[1] / R.bestRate[2]) * 100)}%`, `Best win rate (10+ bets), <em>${esc(R.bestRate[0])}</em>, ${R.bestRate[1]} of ${R.bestRate[2]}`],
  [short(R.biggestPot[1]), `Biggest pot, prediction #${fmt(R.biggestPot[0])} on ${day(R.biggestPot[3])}`],
].map(([b, t]) => `<div class="rec"><b>${b}</b><span>${t}</span></div>`).join('');

// break time tab
$('bt-title').textContent = `${fmt(B.games)} games, ${fmt(B.rounds)} rounds won by ${B.winners} viewers`;
let btN = 10;
function renderBtBoard() {
  const mx = B.top[0][1];
  $('btboard').innerHTML = `<span class="hd" style="color:var(--c-bt)">Rounds won</span>${B.top.slice(0, btN).map(([n, w], i) => `
    <span class="rk">${i + 1}</span><span class="nm" title="${esc(n)}">${esc(n)}</span>
    <span class="b"><span class="bar" style="width:${(w / mx) * 100}%"></span><span class="v">${w}</span></span>`).join('')}`;
}
renderBtBoard();
$('bttoggle').addEventListener('click', (e) => { btN = btN === 10 ? 25 : 10; e.target.textContent = btN === 10 ? 'Show top 25' : 'Show top 10'; renderBtBoard(); });
const mostDays = B.top.reduce((a, r) => (r[2] > a[2] ? r : a));
$('btrecs').innerHTML = [
  [`${B.fastest[1]}s`, `Fastest solve, <em>${esc(B.fastest[0])}</em>, ${B.fastest[3]} of ${B.fastest[2]} letters showing`],
  [B.fewest[1], `Fewest letters showing on a solve, <em>${esc(B.fewest[0])}</em>, on a ${B.fewest[2]}-letter phrase`],
  [`${B.closestSnipe[2]} ms`, `Closest snipe, <em>${esc(B.closestSnipe[1])}</em> sniped ${esc(B.closestSnipe[0])}`],
  [B.mostInGame[1], `Most rounds won in one game, <em>${esc(B.mostInGame[0])}</em>, ${day(B.mostInGame[2])}`],
  [B.firstTry[1], `Most first-guess solves, <em>${esc(B.firstTry[0])}</em>`],
  [mostDays[2], `Most days with a win, <em>${esc(mostDays[0])}</em>`],
  [fmt(B.snipes), 'Snipes: rounds won with someone right behind'],
  [B.unsolved, 'Rounds nobody solved'],
].map(([b, tx]) => `<div class="rec"><b>${b}</b><span>${tx}</span></div>`).join('');
chart('btshown', () => barChart('btshown', Array.from({ length: B.shownHist[B.shownHist.length - 1][0] }, (_, i) => { const k = i + 1, n = (B.shownHist.find((h) => h[0] === k) || [0, 0])[1]; return [k, '', n, n, `${n} rounds solved with ${k} letters showing`]; }), '--c-bt', 20, String, 'Rounds won by letters showing', 'letters showing when solved', 'rounds won'));
chart('btmonthly', () => barChart('btmonthly', B.snipeHist.map(([lab, n]) => [lab, '', n, n, `${n} snipes won by up to ${lab}`]), '--c-bt', 20, String, 'Snipes by how close they were', 'won by up to this much', 'snipes'));
const dots = (shown, letters) => `<span class="dots" title="${shown} of ${letters} letters showing">${Array.from({ length: letters }, (_, i) => `<i${i < shown ? ' class="on"' : ''}></i>`).join('')}</span>`;
$('btgames').innerHTML = B.recent.slice().reverse().map(([g, rounds]) => `
  <div class="game"><h4>${day(g.slice(0, 10))} · ${rounds.filter((r) => r[0] === 'win').length} of ${rounds.length} solved</h4>
  ${rounds.map(([kind, who, secs, shown, letters, first, snipe], i) => `
    <div class="round"><span class="n">${i + 1}</span>
      <span class="w${kind === 'win' ? '' : ' none'}">${kind === 'win' ? esc(who) : 'nobody'}${dots(shown, letters)}</span>
      <span class="d">${secs ? `${secs}s` : ''}${first ? ' · 1st try' : ''}</span>
      ${snipe ? `<span class="sn">sniped ${esc(snipe[0])} by ${snipe[1]} ms</span>` : ''}</div>`).join('')}
  </div>`).join('');

// timeouts tab
$('to-title').textContent = `${fmt(T.count)} timeouts, ${hrs(T.total)} of silence`;
let toN = 10, toBy = 'T';
function renderTo() {
  const v = T[`victims${toBy}`], k = T[`killers${toBy}`], i = toBy === 'T' ? 1 : 2;
  const mx = Math.max(v[0][i], k[0][i]);
  const val = (r) => (toBy === 'T' ? hrs(r[1]) : fmt(r[2]));
  const tip = (r, verb) => `${esc(r[0])}: ${verb} ${fmt(r[2])} times, ${hrs(r[1])} total`;
  const board = (title, rows, c, verb) => `<div class="board" style="--c:var(${c})"><span class="hd" style="color:var(${c})">${title}</span>${rows.slice(0, toN).map((r, n) => `
    <span class="rk">${n + 1}</span><span class="nm" title="${esc(r[0])}">${esc(r[0])}</span>
    <span class="b" title="${tip(r, verb)}"><span class="bar" style="width:${(r[i] / mx) * 100}%"></span><span class="v">${val(r)}</span></span>`).join('')}</div>`;
  $('toboards').innerHTML = board('Most timed out', v, '--c-to', 'timed out') + board('Most generous', k, '--pp-1', 'paid for');
}
renderTo();
$('toscope').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-by]'); if (!b) return;
  toBy = b.dataset.by;
  $('toscope').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderTo();
});
$('totoggle').addEventListener('click', (e) => { toN = toN === 10 ? 25 : 10; e.target.textContent = toN === 10 ? 'Show top 25' : 'Show top 10'; renderTo(); });
chart('tomonthly', () => barChart('tomonthly', T.monthly.map(([m, c, s]) => [MON[parseInt(m.slice(5), 10) - 1], hrs(s), c, c, `${c} timeouts, ${hrs(s)} total`]), '--c-to', 50, String, 'Timeouts per month', '', 'timeouts'));
const stMax = T.streams[0][1];
$('tostreams').innerHTML = T.streams.map(([d, c, s, p]) => `
  <div class="pot" style="--c-pred:var(--c-to)"><span class="t">${day(d)}</span><span class="m">${c} · ${hrs(s)} · ${p} people</span>
  <span class="track"><i style="width:${(c / stMax) * 100}%"></i></span></div>`).join('');
const BV = T.bestVictimStream, BK = T.bestKillerStream;
$('torecs').innerHTML = [
  [T.streams[0][1], `Most timeouts in one stream, ${day(T.streams[0][0])}`],
  [BV[2], `Most times one person got timed out in a stream, <em>${esc(BV[0])}</em> on ${day(BV[3])}`],
  [hrs(BK[1]), `Most timeout time bought in one stream, <em>${esc(BK[0])}</em> on ${day(BK[3])}`],
  [`${Math.round(T.avg / 6) / 10}m`, 'Average timeout length'],
  [T.victimsN, 'Different people timed out'],
  [T.killersN, 'Different people who paid for one'],
  [`${Math.round((T.withTO / T.nStreams) * 100)}%`, `Streams with at least one timeout, ${T.withTO} of ${T.nStreams}`],
].map(([b, tx]) => `<div class="rec"><b>${b}</b><span>${tx}</span></div>`).join('');

// pokemon tab
$('pk-title').textContent = `${K.name}: ${fmt(K.attempts)} runs, ${fmt(K.deaths)} Pokemon lost`;
$('pk-sub').textContent = `Chat picks the starter, names every catch after a viewer, and spends bits to send trainers. One wipe and it's back to Pallet Town. Everything here counts from ${day(K.start)}, when this season began.`;
chart('pkruns', () => {
  let lastM = '';
  barChart('pkruns', K.runs.map(([d, lv, c, s]) => { const m = d.slice(0, 7), lab = m !== lastM ? MON[parseInt(d.slice(5, 7), 10) - 1] : ''; lastM = m; return [lab, '', lv, `Lv ${lv}`, `${day(d)}: ${s}, reached level ${lv}, ${c} catches`]; }), '--c-pk', 10, String, 'Highest level reached in each run', '', 'level');
});
let pkN = 10;
const vboard = (title, rows, c, unit) => {
  const mx = rows[0][1];
  return `<div class="board" style="--c:var(${c})"><span class="hd" style="color:var(${c})">${title}</span>${rows.slice(0, pkN).map(([n, v], i) => `
    <span class="rk">${i + 1}</span><span class="nm" title="${esc(n)}">${esc(n)}</span>
    <span class="b" title="${esc(n)}: ${v} ${unit}"><span class="bar" style="width:${(v / mx) * 100}%"></span><span class="v">${v}</span></span>`).join('')}</div>`;
};
function renderPk() {
  $('pkboards').innerHTML = vboard('Trainers sent', K.spawners, '--pp-1', 'trainers sent with bits') + vboard('Namesakes fallen', K.namesakes, '--c-pk', 'Pokemon named after them died');
}
renderPk();
$('pktoggle').addEventListener('click', (e) => { pkN = pkN === 10 ? 25 : 10; e.target.textContent = pkN === 10 ? 'Show top 25' : 'Show top 10'; renderPk(); });
{ const keep = pkN; pkN = 8; $('pkdeadly').innerHTML = vboard('Deadliest places', K.droute8, '--loss', 'deaths') + vboard('Most-buried species', K.dspec8, '--loss', 'deaths'); pkN = keep; }
const tierN = Object.fromEntries(K.tiers);
$('pkrecs').innerHTML = [
  [`Lv ${K.best.lv}`, `Furthest run, <em>${esc(K.best.nick)}</em> the ${K.best.starter}, ${day(K.best.start)}`],
  [K.mostCatch[0], `Most catches in one run, a ${K.mostCatch[2]} run on ${day(K.mostCatch[1])}`],
  [K.mostTr[0], `Most trainers sent at one run, ${day(K.mostTr[1])}`],
  [fmt(K.trainers), `Trainers sent with bits, ${tierN.insane} of them insane`],
  [fmt(K.kos), 'Enemy Pokemon knocked out'],
  [fmt(K.catches), 'Pokemon caught and named after viewers'],
  [K.firstStage, 'Runs that never reached level 10'],
  ...K.starters.map(([s, n, lv]) => [n, `Runs started with ${s}, best reached level ${lv}`]),
].map(([b, tx]) => `<div class="rec"><b>${b}</b><span>${tx}</span></div>`).join('');
$('pkgrave').innerHTML = K.grave.map(([n, sp, lv, route, d]) => `
  <div class="tomb"><b>${esc(n || sp)}</b><span>${esc(sp)}${lv ? `, level ${lv}` : ''}</span><span>${route ? `${esc(route)} · ` : ''}${day(d)}</span></div>`).join('');

// sc2 tab
$('sc2-title').textContent = `${fmt(S.games)} games, ${fmt(S.w)} wins and ${fmt(S.l)} losses`;
$('sc2-sub').textContent = `Every ranked ladder game since ${day(S.first)}, ${S.first.slice(0, 4)}, across ${S.races.length} account and race combos. Mostly EU Terran (${fmt(S.mainN)} games), the charts below stick to that. AI games are left out.`;
function lineChart(id, pts, color) {
  const el = $(id), W = Math.max(300, el.clientWidth), H = 260, L = 52, Rr = 12, Tp = 24, B = 28;
  const vs = pts.map((p) => p[1]), lo = Math.floor(Math.min(...vs) / 250) * 250, hi = Math.ceil(Math.max(...vs) / 250) * 250;
  const x = (i) => L + (i / (pts.length - 1)) * (W - L - Rr), y = (v) => Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="MMR by week">`;
  for (let v = lo; v <= hi; v += 250) s += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" style="font-size:12px;fill:var(--text-mute)">${v}</text>`;
  let lastY = '';
  pts.forEach(([d], i) => { const yr = d.slice(0, 4), mo = d.slice(5, 7); if ((mo === '01' || (i === 0 && !pts.slice(1, 9).some((p) => p[0].slice(5, 7) === '01'))) && yr !== lastY) { lastY = yr; s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" style="font-size:12px;fill:var(--text-soft)">${yr}</text>`; } else if (['04', '07', '10'].includes(mo) && !pts.slice(Math.max(0, i - 4), i).some((p) => p[0].slice(5, 7) === mo)) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" style="font-size:11px">${MON[parseInt(mo, 10) - 1]}</text>`; });
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  s += `<path d="${path} L${x(pts.length - 1)},${y(lo)} L${x(0)},${y(lo)} Z" fill="var(${color})" opacity=".12"/><path d="${path}" fill="none" stroke="var(${color})" stroke-width="2" stroke-linejoin="round"/>`;
  const pk = vs.indexOf(Math.max(...vs));
  s += `<circle cx="${x(pk)}" cy="${y(vs[pk])}" r="4" fill="var(${color})"/><text x="${x(pk)}" y="${y(vs[pk]) - 10}" text-anchor="middle" class="hi" style="font-size:12px">${vs[pk]}</text>`;
  pts.forEach(([d, v], i) => { s += `<rect x="${x(i) - (W - L) / pts.length / 2}" y="${Tp}" width="${(W - L) / pts.length}" height="${H - Tp - B}" fill="transparent"><title>Week of ${day(d)}, ${d.slice(0, 4)}: ${v}</title></rect>`; });
  el.innerHTML = `${s}</svg>`;
}
chart('sc2mmr', () => lineChart('sc2mmr', S.mmr, '--c-sc2'));
const RACE = { P: 'Protoss', T: 'Terran', Z: 'Zerg' };
$('sc2mu').innerHTML = S.mu.map(([r, n, w]) => `<div class="mu"><span class="k">VS ${RACE[r].toUpperCase()}</span><b>${Math.round((w / n) * 1000) / 10}%</b>
  <span class="wl"><i style="width:${(w / n) * 100}%"></i></span><small>${fmt(w)} won · ${fmt(n - w)} lost</small></div>`).join('');
{
  const board = (title, rows, c, extra) => { const mx = rows[0][1]; return `<div class="board" style="--c:var(${c})"><span class="hd" style="color:var(${c})">${title}</span>${rows.map((r, i) => `
    <span class="rk">${i + 1}</span><span class="nm" title="${esc(r[0])}">${esc(r[0])}</span>
    <span class="b"><span class="bar" style="width:${(r[1] / mx) * 100}%"></span><span class="v">${r[1]} · ${extra(r)}</span></span>`).join('')}</div>`; };
  $('sc2boards').innerHTML = board('Most-faced opponents', S.opp, '--c-sc2', (r) => `${r[2]}–${r[1] - r[2]}`) + board('Most-played maps', S.maps, '--pp-1', (r) => `${Math.round((r[2] / r[1]) * 100)}% won`);
}
$('sc2recs').innerHTML = [
  [fmt(Math.max(...S.mmr.map((p) => p[1]))), `Peak EU Terran MMR, week of ${day(S.mmr.reduce((a, p) => (p[1] > a[1] ? p : a))[0])}, ${S.mmr.reduce((a, p) => (p[1] > a[1] ? p : a))[0].slice(0, 4)}`],
  [`${Math.floor(S.longest[0] / 60)}:${String(S.longest[0] % 60).padStart(2, '0')}`, `Longest game, vs <em>${esc(S.longest[2])}</em> on ${esc(S.longest[1])}. ${S.longest[3] === 'win' ? 'Won' : 'Lost'}.`],
  [S.streak, 'Longest win streak'],
  [S.lossStreak, 'Longest losing streak'],
  [`+${S.climb[0]}`, `Best single-day climb, ${day(S.climb[1])}, ${S.climb[1].slice(0, 4)}, over ${S.climb[2]} games`],
  [S.busiest[1], `Most games in one day, ${day(S.busiest[0])}, ${S.busiest[0].slice(0, 4)}`],
  [fmt(S.hours), 'Hours of ladder played'],
].map(([b, tx]) => `<div class="rec"><b>${b}</b><span>${tx}</span></div>`).join('');

// sub-tab router: #sc2, #bt, ... so each tab has its own link
const TABS = ['sc2', 'bt', 'pred', 'to', 'pk'];
function show() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'sc2';
  document.querySelectorAll('.subtabs a').forEach((a) => { if (a.hash === `#${tab}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  TABS.forEach((t) => { $(`p-${t}`).hidden = t !== tab; });
  CHARTS.forEach((draw) => draw());
}
window.addEventListener('hashchange', show);
show();
}).catch((err) => console.error('[stats] stats/stats.json:', err));
