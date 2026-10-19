// SportyBet odds engine — prematch odds + probabilities (TZ)
// Login/session support is DISABLED — all requests are anonymous.
import { fmtLocal } from '../config.js';

const SPORTY_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
let oddsCache = { ts: 0, data: null };
let oddsPageCache = { ts: 0, data: {} };
const ODDS_TTL = 300000; // 5 min — fetching all pages takes longer

// Market IDs:
//   1   = Match winner (1X2)
//   18  = Over/Under goals
//   10  = Draw no bet / Asian handicap
//   29  = Both Teams To Score (BTTS)
//   11  = Double chance
//   26  = 1X2 1st half
//   36  = Over/Under 1st half goals
//   14  = Half/Full time (3-way)
//   60100 = HT/FT
//   136-183 = corners, cards, exact score (require authentication — NOT available while login is disabled)
const MARKET_IDS = [1, 18, 10, 29, 11, 26, 36, 14, 60100].join(',');

function buildHeaders(extra = {}) {
  return {
    'User-Agent': SPORTY_UA,
    'Referer': 'https://www.sportybet.com/tz/sport/football',
    'Accept': 'application/json',
    ...extra,
  };
}

// Fetch a single page of prematch football odds from SportyBet (TZ)
async function fetchSportyPage(pageNum = 1) {
  if (oddsPageCache.data[pageNum] && Date.now() - oddsPageCache.ts < ODDS_TTL) {
    return oddsPageCache.data[pageNum];
  }
  const url = `https://www.sportybet.com/api/tz/factsCenter/pcUpcomingEvents?sportId=sr:sport:1&marketId=${MARKET_IDS}&pageSize=100&pageNum=${pageNum}&option=1`;
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`SportyBet HTTP ${res.status}`);
  const d = await res.json();
  if (d.bizCode !== 10000) throw new Error('SportyBet bizCode ' + d.bizCode + ': ' + (d.message || ''));
  oddsPageCache.data[pageNum] = d.data;
  oddsPageCache.ts = Date.now();
  return d.data;
}

// Fetch all prematch football odds from SportyBet (TZ) — merges all pages.
// Anonymous access only: corners/cards/exact-score markets (136-183) are not requested.
async function fetchSportyOdds() {
  if (oddsCache.data && Date.now() - oddsCache.ts < ODDS_TTL) return oddsCache.data;

  const firstPage = await fetchSportyPage(1);
  const totalNum = firstPage.totalNum || 0;
  const pageSize = (firstPage.tournaments || []).reduce((s, t) => s + (t.events || []).length, 0);
  const totalPages = pageSize > 0 ? Math.ceil(totalNum / pageSize) : 1;

  const mergedTournaments = new Map();
  for (const t of firstPage.tournaments || []) {
    mergedTournaments.set(t.id, { ...t, events: [...(t.events || [])] });
  }

  for (let batch = 2; batch <= totalPages; batch += 3) {
    const batchPages = [];
    for (let p = batch; p < Math.min(batch + 3, totalPages + 1); p++) {
      batchPages.push(fetchSportyPage(p));
    }
    const results = await Promise.all(batchPages);
    for (const pageData of results) {
      for (const t of pageData.tournaments || []) {
        if (mergedTournaments.has(t.id)) {
          mergedTournaments.get(t.id).events.push(...(t.events || []));
        } else {
          mergedTournaments.set(t.id, { ...t, events: [...(t.events || [])] });
        }
      }
    }
  }

  const merged = { tournaments: [...mergedTournaments.values()], totalNum };
  oddsCache = { ts: Date.now(), data: merged };
  return merged;
}

// Fetch a specific page and return it in the same merged-by-tournament format.
// Used by the frontend for progressive loading.
async function fetchSportyOddsPage(pageNum = 1) {
  const pageData = await fetchSportyPage(pageNum);
  const totalNum = pageData.totalNum || 0;
  const pageSize = (pageData.tournaments || []).reduce((s, t) => s + (t.events || []).length, 0);
  const totalPages = pageSize > 0 ? Math.ceil(totalNum / pageSize) : 1;
  return {
    tournaments: pageData.tournaments || [],
    totalNum,
    totalPages,
    loadedEvents: pageSize,
    pageNum,
  };
}

// Build a compact odds payload for the UI: tournaments -> events -> markets -> outcomes
function buildOddsPayload(data) {
  const tournaments = (data.tournaments || []).map(t => ({
    id: t.id, name: t.name, country: t.categoryName || '',
    events: (t.events || []).map(e => ({
      eventId: e.eventId,
      homeTeam: e.homeTeamName, awayTeam: e.awayTeamName,
      startTime: e.estimateStartTime ? fmtLocal(e.estimateStartTime) : '',
      startTimeUTC: e.estimateStartTime || null,
      status: e.matchStatus || 'Not start',
      markets: (e.markets || []).map(m => ({
        name: m.name, specifier: m.specifier || '',
        group: m.group || '',
        outcomes: (m.outcomes || []).filter(o => o.isActive).map(o => ({
          desc: o.desc, odds: parseFloat(o.odds),
          probability: parseFloat(o.probability), // 0..1
          outcomeId: o.id,
        })),
        marketId: m.id,
      })),
    })),
  }));
  return { tournaments, totalEvents: (data.tournaments || []).reduce((s, t) => s + (t.events || []).length, 0) };
}

// Find odds for a specific match by team names (normalized)
function findOddsForMatch(payload, homeTeam, awayTeam) {
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const h = norm(homeTeam), a = norm(awayTeam);
  for (const t of payload.tournaments) {
    for (const e of t.events) {
      if (norm(e.homeTeam) === h && norm(e.awayTeam) === a) return e;
    }
  }
  return null;
}

// Pick options with probability >= threshold
function pickOptions(event, threshold = 0.6) {
  const picks = [];
  for (const m of event.markets || []) {
    for (const o of m.outcomes || []) {
      if (o.probability >= threshold) {
        picks.push({
          market: m.name + (m.specifier ? ' ' + m.specifier : ''),
          outcome: o.desc, odds: o.odds, probability: o.probability,
        });
      }
    }
  }
  return picks;
}

// Load a booking code (share code) and return the matches + picks it contains.
// Public endpoint — no auth needed. e.g. 5LWNF3
async function fetchBooking(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(clean)) throw new Error('Invalid booking code format');
  const url = `https://www.sportybet.com/api/tz/orders/share/${clean}`;
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`SportyBet HTTP ${res.status}`);
  const d = await res.json();
  if (d.bizCode !== 10000 || !d.data) throw new Error('Booking code not found: ' + clean);
  return buildBookingPayload(d.data);
}

// Same as fetchBooking but returns ALL selections including unavailable ones
// with an `available` flag — used by the share preview dialog.
async function fetchBookingPreview(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(clean)) throw new Error('Invalid booking code format');
  const url = `https://www.sportybet.com/api/tz/orders/share/${clean}`;
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`SportyBet HTTP ${res.status}`);
  const d = await res.json();
  if (d.bizCode !== 10000 || !d.data) throw new Error('Booking code not found: ' + clean);
  return buildPreviewPayload(d.data);
}

// Join the slip's selections with full event details into a compact matches list.
// Multiple selections on the same match (different markets) are merged into one row.
function buildBookingPayload(data) {
  // 1. Merge outcomes by eventId — each outcome entry carries one market;
  //    when the same match has several markets the later entries would overwrite
  //    earlier ones in a plain map, losing market data.  Merge instead.
  const eventsById = new Map();
  for (const o of data.outcomes || []) {
    const key = String(o.eventId).replace(/^sr:match:/, '');
    if (eventsById.has(key)) {
      const existing = eventsById.get(key);
      existing.markets = [...(existing.markets || []), ...(o.markets || [])];
    } else {
      eventsById.set(key, { ...o, markets: [...(o.markets || [])] });
    }
  }

  // 2. Build one row per unique match (deduplicate by eventId).
  //    Matches whose pick can't be resolved (market/outcome gone from SportyBet)
  //    are counted as unavailable and omitted from the result.
  const matches = [];
  const seen = new Set();
  let unavailable = 0;
  for (const sel of data.ticket?.selections || []) {
    const eventId = String(sel.eventId).replace(/^sr:match:/, '');
    if (seen.has(eventId)) continue; // duplicate selection on same match — skip
    seen.add(eventId);

    const ev = eventsById.get(eventId);
    if (!ev) { unavailable++; continue; }
    // find the market this selection is on, then the picked outcome within it
    const market = (ev.markets || []).find(m =>
      String(m.id) === String(sel.marketId) && (m.specifier || '') === (sel.specifier || ''));
    const outcome = market?.outcomes?.find(o => String(o.id) === String(sel.outcomeId));
    if (!market || !outcome) { unavailable++; continue; } // pick data gone — skip
    const ended = /end|finish/i.test(String(ev.matchStatus || ''));
    matches.push({
      eventId,
      homeTeam: ev.homeTeamName,
      awayTeam: ev.awayTeamName,
      league: ev.sport?.category?.tournament?.name || '',
      country: ev.sport?.category?.name || '',
      kickoff: ev.estimateStartTime ? fmtLocal(ev.estimateStartTime) : '',
      kickoffUTC: ev.estimateStartTime || null,
      status: ev.matchStatus || 'Not start',
      score: /^\d+\s*[:\-]\s*\d+$/.test(ev.setScore || '') ? ev.setScore.replace(/\s*[:\-]\s*/, '-') : null,
      pick: {
        market: market.name + (sel.specifier ? ' (' + sel.specifier + ')' : ''),
        outcome: outcome.desc, odds: parseFloat(outcome.odds),
        probability: parseFloat(outcome.probability),
        won: ended && outcome.isWinning != null ? Number(outcome.isWinning) === 1 : null,
      },
    });
  }
  // total odds = multiplication of every picked outcome's odds
  const computedOdds = Math.round(
    matches.reduce((p, m) => p * ((m.pick && m.pick.odds > 0) ? m.pick.odds : 1), 1) * 100
  ) / 100;
  return {
    code: data.shareCode || '',
    shareURL: data.shareURL || '',
    totalOdds: data.ticket?.displayTotalOdds || null,
    computedOdds,
    totalStake: data.ticket?.totalStake ?? null,
    potentialWinnings: data.ticket?.potentialWinnings || null,
    deadline: data.deadline ? fmtLocal(data.deadline) : '',
    deadlineUTC: data.deadline || null,
    selections: matches.length,
    unavailable,
    matches,
  };
}

// Build a preview payload: ALL selections (including unavailable ones) with an
// `available` flag so the user can see what will be shared and remove unwanted rows.
function buildPreviewPayload(data) {
  const eventsById = new Map();
  for (const o of data.outcomes || []) {
    const key = String(o.eventId).replace(/^sr:match:/, '');
    if (eventsById.has(key)) {
      const existing = eventsById.get(key);
      existing.markets = [...(existing.markets || []), ...(o.markets || [])];
    } else {
      eventsById.set(key, { ...o, markets: [...(o.markets || [])] });
    }
  }

  const matches = [];
  const seen = new Set();
  for (const sel of data.ticket?.selections || []) {
    const eventId = String(sel.eventId).replace(/^sr:match:/, '');
    if (seen.has(eventId)) continue;
    seen.add(eventId);

    const ev = eventsById.get(eventId);
    if (!ev) {
      matches.push({ eventId, homeTeam: '?', awayTeam: '?', league: '', country: '', available: false });
      continue;
    }
    const market = (ev.markets || []).find(m =>
      String(m.id) === String(sel.marketId) && (m.specifier || '') === (sel.specifier || ''));
    const outcome = market?.outcomes?.find(o => String(o.id) === String(sel.outcomeId));
    if (!market || !outcome) {
      matches.push({
        eventId,
        homeTeam: ev.homeTeamName || '?',
        awayTeam: ev.awayTeamName || '?',
        league: ev.sport?.category?.tournament?.name || '',
        country: ev.sport?.category?.name || '',
        kickoff: ev.estimateStartTime ? fmtLocal(ev.estimateStartTime) : '',
        kickoffUTC: ev.estimateStartTime || null,
        status: ev.matchStatus || 'Not start',
        available: false,
      });
      continue;
    }
    const ended = /end|finish/i.test(String(ev.matchStatus || ''));
    matches.push({
      eventId,
      homeTeam: ev.homeTeamName,
      awayTeam: ev.awayTeamName,
      league: ev.sport?.category?.tournament?.name || '',
      country: ev.sport?.category?.name || '',
      kickoff: ev.estimateStartTime ? fmtLocal(ev.estimateStartTime) : '',
      kickoffUTC: ev.estimateStartTime || null,
      status: ev.matchStatus || 'Not start',
      score: /^\d+\s*[:\-]\s*\d+$/.test(ev.setScore || '') ? ev.setScore.replace(/\s*[:\-]\s*/, '-') : null,
      pick: {
        market: market.name + (sel.specifier ? ' (' + sel.specifier + ')' : ''),
        outcome: outcome.desc, odds: parseFloat(outcome.odds),
        probability: parseFloat(outcome.probability),
        won: ended && outcome.isWinning != null ? Number(outcome.isWinning) === 1 : null,
      },
      available: true,
    });
  }
  const computedOdds = Math.round(
    matches.filter(m => m.available).reduce((p, m) => p * ((m.pick && m.pick.odds > 0) ? m.pick.odds : 1), 1) * 100
  ) / 100;
  return {
    code: data.shareCode || '',
    totalOdds: data.ticket?.displayTotalOdds || null,
    computedOdds,
    deadline: data.deadline ? fmtLocal(data.deadline) : '',
    deadlineUTC: data.deadline || null,
    selections: matches.length,
    availableCount: matches.filter(m => m.available).length,
    unavailableCount: matches.filter(m => !m.available).length,
    matches,
  };
}

// Create a SportyBet share code from our picks — calls SportyBet's POST /api/tz/orders/share
// selections: [{ eventId, marketId, outcomeId, specifier? }]
async function createSportyBetSlip(selections) {
  if (!Array.isArray(selections) || !selections.length) throw new Error('At least one selection is required');

  const payload = selections.map(s => {
    const sel = {
      eventId: String(s.eventId),
      marketId: String(s.marketId),
      outcomeId: String(s.outcomeId),
    };
    if (s.specifier) sel.specifier = s.specifier;
    return sel;
  });

  const url = 'https://www.sportybet.com/api/tz/orders/share';
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ selections: payload }),
  });
  if (!res.ok) throw new Error(`SportyBet HTTP ${res.status}`);
  const d = await res.json();
  if (d.bizCode !== 10000 || !d.data) throw new Error('SportyBet booking failed: ' + (d.message || 'Unknown error'));
  return {
    shareCode: d.data.shareCode,
    shareURL: d.data.shareURL,
    deadline: d.data.deadline,
    outcomes: d.data.outcomes || [],
    unavailableOutcomes: d.data.unavailableOutcomes || [],
  };
}

export { fetchSportyOdds, fetchSportyOddsPage, fetchBooking, fetchBookingPreview, buildOddsPayload, buildPreviewPayload, findOddsForMatch, pickOptions, createSportyBetSlip };
