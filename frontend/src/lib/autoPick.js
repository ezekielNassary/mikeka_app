// Auto-pick engine — ported from Soka Hub.
// Gathers the best (safest) odd per match from the user's chosen markets,
// respects a minimum-odds floor, and eases the floor step-by-step until it
// reaches ~90% of the requested number of picks.

export const AUTO_HARD_MIN_ODDS = 1.02;
export const AUTO_MAX_PICKS = 200;

export const AUTO_MARKET_LABEL = {
  '1x2': 'Match Winner (1X2)',
  dc: 'Double Chance',
  dnb: 'Draw No Bet',
  hcap: 'Asian Handicap',
  ggng: 'Both Teams To Score (GG/NG)',
  oe: 'Odd/Even',
  '2up': '1X2 2UP',
  ou: 'Over/Under goals',
  ougg: 'Over/Under + GG/NG',
};

const numSort = (a, b) => parseFloat(a) - parseFloat(b);

export const autoMarketInfo = (m) => {
  const name = m.name || '';
  const line = ((m.specifier || '').match(/total=([\d.]+)/) || [])[1] || null;
  if (name === 'Over/Under') return { cat: 'ou', line };
  if (name === 'Over/Under & GG/NG') return { cat: 'ougg', line };
  const map = {
    '1X2': '1x2',
    '1X2 - 2UP': '2up',
    'Double Chance': 'dc',
    'Draw No Bet': 'dnb',
    Handicap: 'hcap',
    'GG/NG': 'ggng',
    'Odd/Even': 'oe',
  };
  return { cat: map[name] || 'other', line: null };
};

export const autoMarketSelected = (m, desc, selections) => {
  if (selections == null) return true; // any market
  if (!Array.isArray(selections) || selections.length === 0) return false;
  const { cat, line } = autoMarketInfo(m);
  if (selections.includes(cat)) return true; // whole category
  if (line) {
    if (selections.includes(`${cat}:${line}`)) return true; // whole line (both sides)
    if (cat === 'ougg') return false; // combo market — line-level only
    const side = String(desc || '').toLowerCase().startsWith('under ') ? 'under' : 'over';
    return selections.includes(`${cat}:${line}:${side}`);
  }
  return false;
};

export const availableAutoMarkets = (tournaments) => {
  const cats = new Map();
  for (const t of tournaments) {
    for (const e of t.events || []) {
      for (const m of e.markets || []) {
        const { cat, line } = autoMarketInfo(m);
        if (cat === 'other') continue;
        if (!cats.has(cat)) cats.set(cat, { lines: new Set() });
        if (line) cats.get(cat).lines.add(line);
      }
    }
  }
  return [...cats.entries()]
    .map(([cat, { lines }]) => ({
      cat,
      label: AUTO_MARKET_LABEL[cat] || cat,
      lines: [...lines].sort(numSort),
    }))
    .sort((a, b) => (['ou', 'ougg'].includes(a.cat) ? 0 : 1) - (['ou', 'ougg'].includes(b.cat) ? 0 : 1));
};

export function collectAutoPicks(tournaments, { markets, minOdds = 1.12, target = 10, filterEvent }) {
  const goal = Math.ceil(target * 0.9);
  const floor0 = Math.max(AUTO_HARD_MIN_ODDS, Number(minOdds) || 1.12);

  const collect = (floor) => {
    const bestByMatch = new Map();
    for (const t of tournaments) {
      for (const e of t.events || []) {
        if (filterEvent && !filterEvent(e, t)) continue;
        let best = null;
        for (const m of e.markets || []) {
          const marketLabel = `${m.name}${m.specifier ? ' ' + m.specifier : ''}`.trim();
          for (const o of m.outcomes || []) {
            if (!autoMarketSelected(m, o.desc, markets)) continue;
            if (!(o.odds >= floor)) continue;
            const p = Number(o.probability);
            if (!isFinite(p)) continue;
            if (!best || p > best.probability) {
              best = {
                matchKey: String(e.eventId),
                eventId: e.eventId,
                homeTeam: e.homeTeam,
                awayTeam: e.awayTeam,
                league: t.name,
                startTime: e.startTime,
                startTimeUTC: e.startTimeUTC,
                status: e.status,
                market: marketLabel,
                outcome: o.desc,
                odds: o.odds,
                probability: p,
                marketId: m.marketId,
                outcomeId: o.outcomeId,
                specifier: m.specifier || '',
              };
            }
          }
        }
        if (best) bestByMatch.set(best.matchKey, best);
      }
    }
    return [...bestByMatch.values()].sort((a, b) => b.probability - a.probability);
  };

  let rows = collect(floor0);
  let eased = false;
  for (let i = 1; rows.length < goal && i <= 15; i++) {
    eased = true;
    rows = collect(Math.max(AUTO_HARD_MIN_ODDS, floor0 - 0.05 * i));
  }

  return { picks: rows.slice(0, target), found: rows.length, target, eased };
}
