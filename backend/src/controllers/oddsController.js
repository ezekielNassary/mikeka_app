import { trackUsage } from '../middleware/auth.js';
import { getPool } from '../db/index.js';
import { fetchSportyOdds, fetchSportyOddsPage, cacheAllOdds, fetchBooking, fetchBookingPreview, buildOddsPayload, findOddsForMatch, pickOptions, createSportyBetSlip } from '../services/sportybet.js';
import { resolveTeam, findMatchId, getMatchDetails, buildLast5, summarize } from '../services/fotmob.js';

export async function getOdds(req, res) {
  try {
    const data = await fetchSportyOdds();
    const payload = buildOddsPayload(data);
    for (const t of payload.tournaments) {
      for (const e of t.events) {
        e.picks60 = pickOptions(e, 0.6);
        e.picks65 = pickOptions(e, 0.65);
        e.picks70 = pickOptions(e, 0.7);
        let top = null;
        for (const m of e.markets || []) {
          for (const o of m.outcomes || []) {
            if (!top || o.probability > top.probability) {
              top = { market: m.name + (m.specifier ? ' ' + m.specifier : ''), outcome: o.desc, odds: o.odds, probability: o.probability };
            }
          }
        }
        e.topPick = top;
      }
    }
    res.json({ success: true, source: 'SportyBet', totalEvents: payload.totalEvents, tournaments: payload.tournaments });
  } catch (e) {
    console.error('[odds]', e.message);
    res.status(502).json({ error: e.message, source: 'SportyBet' });
  }
}

export async function getOddsPage(req, res) {
  try {
    const pageNum = Math.max(1, parseInt(req.params.pageNum) || 1);
    const data = await fetchSportyOddsPage(pageNum);
    const payload = buildOddsPayload(data);
    for (const t of payload.tournaments) {
      for (const e of t.events) {
        e.picks60 = pickOptions(e, 0.6);
        let top = null;
        for (const m of e.markets || []) {
          for (const o of m.outcomes || []) {
            if (!top || o.probability > top.probability) {
              top = { market: m.name + (m.specifier ? ' ' + m.specifier : ''), outcome: o.desc, odds: o.odds, probability: o.probability };
            }
          }
        }
        e.topPick = top;
      }
    }
    res.json({
      success: true, source: 'SportyBet',
      pageNum: data.pageNum, totalPages: data.totalPages, totalNum: data.totalNum,
      loadedEvents: data.loadedEvents,
      tournaments: payload.tournaments,
    });
  } catch (e) {
    console.error('[odds:page]', e.message);
    res.status(502).json({ error: e.message, source: 'SportyBet' });
  }
}

// All football odds in one shot (every page). Used by the home feed so that
// yesterday/today/tomorrow are all present and matches stay listed (with a
// Live/Ended badge) after kickoff instead of disappearing.
export async function getOddsAll(req, res) {
  try {
    const data = await cacheAllOdds();
    const payload = buildOddsPayload(data);
    for (const t of payload.tournaments) {
      for (const e of t.events) {
        e.picks60 = pickOptions(e, 0.6);
        let top = null;
        for (const m of e.markets || []) {
          for (const o of m.outcomes || []) {
            if (!top || o.probability > top.probability) {
              top = { market: m.name + (m.specifier ? ' ' + m.specifier : ''), outcome: o.desc, odds: o.odds, probability: o.probability };
            }
          }
        }
        e.topPick = top;
      }
    }
    res.json({
      success: true, source: 'SportyBet',
      totalNum: payload.totalEvents,
      loadedEvents: payload.totalEvents,
      tournaments: payload.tournaments,
    });
  } catch (e) {
    console.error('[odds:all]', e.message);
    res.status(502).json({ error: e.message, source: 'SportyBet' });
  }
}

export async function getBooking(req, res) {
  const code = (req.params.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'booking code required' });
  try {
    const slip = await fetchBooking(code);
    try { if (req.user?.id) await trackUsage(req.user.id, 'booking_load', code); } catch {}
    res.json({ success: true, source: 'SportyBet', ...slip });
  } catch (e) {
    console.error('[booking]', e.message);
    const notFound = /not found|Invalid/.test(e.message);
    res.status(notFound ? 404 : 502).json({ error: e.message, source: 'SportyBet' });
  }
}

export async function getBookingPreview(req, res) {
  const code = (req.params.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'booking code required' });
  try {
    const slip = await fetchBookingPreview(code);
    try { if (req.user?.id) await trackUsage(req.user.id, 'booking_load', code); } catch {}
    res.json({ success: true, source: 'SportyBet', ...slip });
  } catch (e) {
    console.error('[booking:preview]', e.message);
    const notFound = /not found|Invalid/.test(e.message);
    res.status(notFound ? 404 : 502).json({ error: e.message, source: 'SportyBet' });
  }
}

export async function teamStats(req, res) {
  const home = (req.query.home || '').trim();
  const away = (req.query.away || '').trim();
  if (!home || !away) return res.status(400).json({ error: 'home and away required' });
  try {
    const homeTeam = await resolveTeam(home);
    const awayTeam = await resolveTeam(away);
    const { matchId } = await findMatchId(homeTeam.id, awayTeam.id, homeTeam.name, awayTeam.name);
    const md = await getMatchDetails(matchId);
    const general = md.general || {};
    const tf = md.content?.matchFacts?.teamForm || [];
    const homeRows = tf[0] ? buildLast5(tf[0], general.homeTeam?.id) : [];
    const awayRows = tf[1] ? buildLast5(tf[1], general.awayTeam?.id) : [];
    res.json({
      success: true,
      homeTeam: general.homeTeam?.name || homeTeam.name,
      awayTeam: general.awayTeam?.name || awayTeam.name,
      homeRows, awayRows,
      homeSum: summarize(homeRows), awaySum: summarize(awayRows),
    });
  } catch (e) {
    console.error('[team-stats]', e.message);
    res.status(404).json({ error: e.message });
  }
}

export async function createSlip(req, res) {
  try {
    const selections = req.body?.selections;
    if (!Array.isArray(selections) || !selections.length) {
      return res.status(400).json({ error: 'At least one selection is required' });
    }
    for (const s of selections) {
      if (!s.eventId || !s.marketId || !s.outcomeId) {
        return res.status(400).json({ error: 'Each selection needs eventId, marketId, and outcomeId' });
      }
    }
    const result = await createSportyBetSlip(selections);
    try { await trackUsage(req.user.id, 'sportybet_slip_create', result.shareCode); } catch {}
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('[odds:createSlip]', e.message);
    res.status(502).json({ error: e.message });
  }
}

// ---- Prediction boost: blend SportyBet 1X2 with a form/H2H Poisson model ----
const fact = n => (n <= 1 ? 1 : n * fact(n - 1));
const pois = (l, k) => (Math.exp(-l) * Math.pow(l, k)) / fact(k);
function outcomeProbs(lh, la) {
  let h = 0, d = 0, a = 0;
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 8; j++) {
      const p = pois(lh, i) * pois(la, j);
      if (i > j) h += p; else if (i === j) d += p; else a += p;
    }
  }
  const s = h + d + a;
  return { home: h / s, draw: d / s, away: a / s };
}
const clampL = x => Math.min(4, Math.max(0.2, x));

const TEAM_ALIASES = {
  mancity: ['manchestercity'], manchestercity: ['mancity'],
  manu: ['manchesterunited', 'manutd'], manutd: ['manchesterunited', 'manu'], manchesterunited: ['manu', 'manutd'],
  spurs: ['tottenham'], tottenham: ['spurs'],
  nottmforest: ['nottinghamforest'], nottinghamforest: ['nottmforest'],
  wolves: ['wolverhampton'], wolverhampton: ['wolves'],
  bournemouth: ['afcbournemouth'], afcbournemouth: ['bournemouth'],
  brighton: ['brightonhovealbion', 'brightonandhovealbion'], brightonhovealbion: ['brighton'], brightonandhovealbion: ['brighton'],
  psg: ['parissaintgermain'], parissaintgermain: ['psg'],
  inter: ['intermilan'], intermilan: ['inter'],
  milan: ['acmilan'], acmilan: ['milan'],
};
const normT = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const wordsT = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
function sideScore(query, cand) {
  const q = normT(query), c = normT(cand);
  if (!q || !c) return 0;
  if (q === c) return 3;
  const qa = [q, ...(TEAM_ALIASES[q] || [])];
  const ca = [c, ...(TEAM_ALIASES[c] || [])];
  if (qa.some(x => ca.includes(x))) return 3;
  if (Math.min(q.length, c.length) >= 5 && (q.includes(c) || c.includes(q))) return 2;
  const qw = new Set(wordsT(query).filter(w => w.length >= 4));
  let shared = 0;
  for (const w of wordsT(cand)) if (w.length >= 4 && qw.has(w)) shared++;
  return Math.min(shared, 2);
}
function findEventFuzzy(payload, homeName, awayName) {
  let best = null, bestScore = 0;
  for (const t of payload.tournaments) {
    for (const e of t.events) {
      const s = sideScore(homeName, e.homeTeam) + sideScore(awayName, e.awayTeam);
      if (s > bestScore) { bestScore = s; best = e; }
    }
  }
  return bestScore >= 3 ? best : null;
}

export async function matchInsight(req, res) {
  const home = (req.query.home || '').trim();
  const away = (req.query.away || '').trim();
  if (!home || !away) return res.json({ success: false, available: false });
  try {
    const homeTeam = await resolveTeam(home);
    const awayTeam = await resolveTeam(away);
    const { matchId } = await findMatchId(homeTeam.id, awayTeam.id, homeTeam.name, awayTeam.name);
    const md = await getMatchDetails(matchId);
    const general = md.general || {};
    const tf = md.content?.matchFacts?.teamForm || [];
    const homeRows = tf[0] ? buildLast5(tf[0], general.homeTeam?.id) : [];
    const awayRows = tf[1] ? buildLast5(tf[1], general.awayTeam?.id) : [];
    const hs = summarize(homeRows), as = summarize(awayRows);
    if (!hs || !as || hs.n < 3 || as.n < 3) return res.json({ success: true, available: false });

    let lh = clampL((hs.avgGF + as.avgGA) / 2);
    let la = clampL((as.avgGF + hs.avgGA) / 2);

    let h2h = null;
    const raw = md.content?.h2h;
    if (raw?.summary) {
      const [wh, wd, wa] = raw.summary;
      const tot = wh + wd + wa;
      if (tot > 0) {
        h2h = { n: tot, winsHome: wh, draws: wd, winsAway: wa };
        const dom = (wh - wa) / tot;
        lh = clampL(lh * (1 + 0.08 * dom));
        la = clampL(la * (1 - 0.08 * dom));
      }
    }

    const model = outcomeProbs(lh, la);
    let bookie = null, final = model, edges = [];
    try {
      const payload = buildOddsPayload(await fetchSportyOdds());
      const ev = findEventFuzzy(payload, homeTeam.name, awayTeam.name) || findOddsForMatch(payload, homeTeam.name, awayTeam.name);
      const m = ev?.markets?.find(x => /^(1x2|match result|full[- ]?time result)$/i.test((x.name || '').trim()) && !x.specifier);
      if (m) {
        const pick = re => m.outcomes.find(o => re.test(o.desc));
        const bh = pick(/home/i), bd = pick(/draw/i), ba = pick(/away/i);
        if (bh && bd && ba) {
          bookie = { home: bh.probability, draw: bd.probability, away: ba.probability };
          const mix = { home: 0.65 * bookie.home + 0.35 * model.home, draw: 0.65 * bookie.draw + 0.35 * model.draw, away: 0.65 * bookie.away + 0.35 * model.away };
          const s = mix.home + mix.draw + mix.away;
          final = { home: mix.home / s, draw: mix.draw / s, away: mix.away / s };
          edges = [['home', 'Home win'], ['draw', 'Draw'], ['away', 'Away win']]
            .filter(([k]) => final[k] - bookie[k] >= 0.05)
            .map(([k, label]) => ({ pick: label, delta: Math.round((final[k] - bookie[k]) * 100) }));
        }
      }
    } catch { /* odds unavailable */ }

    res.json({
      success: true,
      available: true,
      homeName: general.homeTeam?.name || homeTeam.name,
      awayName: general.awayTeam?.name || awayTeam.name,
      homeForm: { record: `${hs.wins}W-${hs.draws}D-${hs.losses}L`, avgGF: hs.avgGF, avgGA: hs.avgGA },
      awayForm: { record: `${as.wins}W-${as.draws}D-${as.losses}L`, avgGF: as.avgGF, avgGA: as.avgGA },
      h2h,
      model, bookie, final, edges,
    });
  } catch (e) {
    console.error('[match-insight]', e.message);
    res.json({ success: false, available: false });
  }
}
