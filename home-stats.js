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

// headline strip
$('headline').innerHTML = [
  [fmt(S.games), 'SC2 games logged', `${fmt(S.hours)} hours of ladder`],
  [short(wagered), 'channel points bet', `on ${fmt(P.n)} predictions`],
  [fmt(T.count), 'paid timeouts', `${hrs(T.total)} of silence`],
  [fmt(K.attempts), 'Nuzlocke attempts', `${fmt(K.deaths)} Pokemon lost`],
  [fmt(B.rounds), 'Break Time wins', `by ${B.winners} different viewers`],
].map(([b, l, s]) => `<div><span class="label">${l}</span><b>${b}</b><small>${s}</small></div>`).join('');

// fun-fact pool: [source, tab, big, small, sentence]
const POOL = [
  ['sc2', 'SC2', fmt(S.longest[0] / 60 | 0), 'min', `Longest game on record: <strong>${Math.floor(S.longest[0] / 60)}:${String(S.longest[0] % 60).padStart(2, '0')}</strong> on ${esc(S.longest[1])} vs ${esc(S.longest[2])}. ${S.longest[3] === 'win' ? 'Won it' : 'Lost it'}.`],
  ['sc2', 'SC2', S.rival[1], 'games', `Most-faced opponent: <strong>${esc(S.rival[0])}</strong>, ${S.rival[2]}–${S.rival[1] - S.rival[2]} all time.`],
  ['sc2', 'SC2', S.busiest[1], 'games', `Most ladder games in one day: <strong>${S.busiest[1]}</strong>, on ${S.busiest[0]}.`],
  ['sc2', 'SC2', S.streak, 'wins', `Longest win streak on the main race: <strong>${S.streak} in a row</strong>.`],
  ['sc2', 'SC2', fmt(S.topmap[1]), 'games', `Most-played map: <strong>${S.topmap[0]}</strong>.`],
  ['sc2', 'SC2', fmt(S.peak), 'MMR', 'Peak EU Terran MMR this year.'],
  ['pred', 'Predictions', short(R.biggestBet[1]), 'points', `Biggest single bet: <strong>${esc(R.biggestBet[0])}</strong> on "${esc(R.biggestBet[3])}". It ${R.biggestBet[2] ? 'hit' : 'missed'}.`],
  ['pred', 'Predictions', `${R.bestRatio[1]}×`, 'payout', `<strong>${esc(R.bestRatio[0])}</strong> turned ${fmt(R.bestRatio[2])} points into ${fmt(Math.round(R.bestRatio[1] * R.bestRatio[2]))} backing the underdog.`],
  ['pred', 'Predictions', R.winStreak[1], 'in a row', `Longest prediction win streak: <strong>${esc(R.winStreak[0])}</strong>.`],
  ['pred', 'Predictions', R.lossStreak[1], 'in a row', `Longest losing streak: <strong>${esc(R.lossStreak[0])}</strong>. Still betting.`],
  ['pred', 'Predictions', short(R.biggestPot[1]), 'points', `Biggest pot ever: <strong>prediction #${fmt(R.biggestPot[0])}</strong>, on ${day(R.biggestPot[3])}. "${esc(R.biggestPot[2])}" won.`],
  ['pred', 'Predictions', fmt(R.mostEntered[1]), 'bets', `Most predictions entered: <strong>${esc(R.mostEntered[0])}</strong>.`],
  ['pred', 'Predictions', short(R.biggestWin[1]), 'points', `Biggest single win: <strong>${esc(R.biggestWin[0])}</strong> on "${esc(R.biggestWin[2].toLowerCase())}".`],
  ['to', 'Timeouts', T.victims[0][2], 'timeouts', `Most timed-out viewer: <strong>${esc(T.victims[0][0])}</strong>, ${hrs(T.victims[0][1])} in the box all time.`],
  ['to', 'Timeouts', T.killers[0][2], 'paid', `Most generous executioner: <strong>${esc(T.killers[0][0])}</strong>, ${hrs(T.killers[0][1])} of timeouts bought.`],
  ['to', 'Timeouts', T.best[1], 'in a stream', `Rowdiest stream: <strong>${day(T.best[0])}</strong>, ${T.best[1]} timeouts and ${hrs(T.best[2])} total.`],
  ['pk', 'Pokemon', fmt(K.dspec[0][1]), 'deaths', `Most-buried species this season: <strong>${K.dspec[0][0]}</strong>.`],
  ['pk', 'Pokemon', fmt(K.droute[0][1]), 'deaths', `Deadliest place in Kanto: <strong>${K.droute[0][0]}</strong>.`],
  ['pk', 'Pokemon', `Lv ${K.best.lv}`, '', `Furthest run this season: <strong>${esc(K.best.nick)}</strong> the ${K.best.starter}, ${K.best.c} catches, ${day(K.best.start)}.`],
  ['bt', 'Break Time', B.fastest[1], 'seconds', `Fastest solve: <strong>${esc(B.fastest[0])}</strong>, with ${B.fastest[3]} of ${B.fastest[2]} letters showing.`],
  ['bt', 'Break Time', B.fewest[1], B.fewest[1] === 1 ? 'letter' : 'letters', `Fewest letters showing on a solve: <strong>${esc(B.fewest[0])}</strong> got a ${B.fewest[2]}-letter phrase with just ${B.fewest[1]} revealed.`],
  ['bt', 'Break Time', B.top[0][1], 'wins', `Most Break Time wins: <strong>${esc(B.top[0][0])}</strong>, on ${B.top[0][2]} different days.`],
  ['bt', 'Break Time', B.closestSnipe[2], 'ms', `Closest snipe: <strong>${esc(B.closestSnipe[1])}</strong> sniped ${esc(B.closestSnipe[0])} by ${B.closestSnipe[2]} ms.`],
  ['bt', 'Break Time', B.firstTry[1], 'first tries', `Most phrases solved on the first guess: <strong>${esc(B.firstTry[0])}</strong>.`],
  ['pk', 'Pokemon', fmt(K.kos), 'KOs', `Wild and trainer Pokemon knocked out this season, across ${K.attempts} attempts.`],
];
const SRC = { sc2: ['--c-sc2', 'sc2'], pred: ['--c-pred', 'pred'], to: ['--c-to', 'to'], pk: ['--c-pk', 'pk'], bt: ['--c-bt', 'bt'] };
function shuffle() {
  // one or two per source, reshuffled per click
  const by = {};
  POOL.forEach((f) => { (by[f[0]] ||= []).push(f); });
  const pick = [];
  Object.values(by).forEach((list) => {
    const l = list.slice().sort(() => Math.random() - 0.5);
    pick.push(...l.slice(0, Math.random() < 0.5 ? 1 : 2));
  });
  pick.sort(() => Math.random() - 0.5);
  $('cards').innerHTML = pick.map(([s, name, big, small, text, pending]) => `
    <article class="fact${pending ? ' pending' : ''}" style="--c:var(${SRC[s][0]})">
      <span class="src">${name}</span>
      <span class="big">${big}${small ? `<small>${small}</small>` : ''}</span>
      <p>${text}</p>
      <a href="stats/#${SRC[s][1]}">Open ${name} →</a>
    </article>`).join('');
}
shuffle();
$('shuffle').addEventListener('click', shuffle);


}).catch((err) => console.error('[home] stats/stats.json:', err));
