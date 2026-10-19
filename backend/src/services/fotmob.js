// FotMob research engine — API access, last-5 extraction, form summaries
import fs from 'node:fs';
import path from 'node:path';
import { UA, CACHE_DIR } from '../config.js';

async function fotmobGet(pathname) {
  const res = await fetch(`https://www.fotmob.com${pathname}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`FotMob ${pathname} -> HTTP ${res.status}`);
  return res.json();
}

const memCache = new Map();
async function fotmobGetCached(key, pathname, ttlMs = 10 * 60 * 1000) {
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const data = await fotmobGet(pathname);
  memCache.set(key, { ts: Date.now(), data });
  return data;
}

const teamLogoUrl = (id) => (id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null);
const leagueLogoUrl = (id) => (id ? `https://images.fotmob.com/image_resources/logo/leaguelogo/${id}.png` : null);

async function getAllLeagues() {
  return fotmobGetCached('allLeagues', '/api/data/allLeagues', 24 * 60 * 60 * 1000);
}

async function getLeague(id, tab = 'overview', season = '') {
  const s = season ? `&season=${encodeURIComponent(season)}` : '';
  return fotmobGetCached(`league:${id}:${tab}:${season}`, `/api/data/leagues?id=${id}&tab=${tab}${s}`, 10 * 60 * 1000);
}

async function getTeam(id, tab = 'overview') {
  return fotmobGetCached(`team:${id}:${tab}`, `/api/data/teams?id=${id}&tab=${tab}`, 10 * 60 * 1000);
}

async function getMatchesByDate(date) {
  return fotmobGetCached(`matches:${date}`, `/api/data/matches?date=${date}`, 2 * 60 * 1000);
}

async function searchTeams(term) {
  const suggest = await fotmobGet(`/api/data/search/suggest?term=${encodeURIComponent(term)}&locale=en`);
  const out = [];
  for (const group of suggest) {
    for (const s of group.suggestions || []) {
      if (s.type !== 'team') continue;
      out.push({ id: s.id, name: s.name, leagueId: s.leagueId || null, leagueName: s.leagueName || '', score: s.score || 0 });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

async function getMatchDetails(matchId) {
  const cacheFile = path.join(CACHE_DIR, `match_${matchId}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const data = await fotmobGet(`/api/data/matchDetails?matchId=${matchId}`);
  fs.writeFileSync(cacheFile, JSON.stringify(data));
  return data;
}

async function resolveTeam(term) {
  const suggest = await fotmobGet(`/api/data/search/suggest?term=${encodeURIComponent(term)}&locale=en`);
  let best = null;
  for (const group of suggest) {
    for (const s of group.suggestions || []) {
      if (s.type !== 'team') continue;
      const name = String(s.name).toLowerCase();
      if (name.includes('(w)') || name.includes('u21') || name.includes('u23') || name.includes(' ii') || name.includes('b team')) continue;
      const score = s.score || 0;
      if (!best || score > best.score) best = { id: s.id, name: s.name, leagueId: s.leagueId, leagueName: s.leagueName, score };
    }
  }
  if (!best) throw new Error(`Team not found on FotMob: ${term}`);
  return best;
}

async function findMatchId(homeTeamId, awayTeamId, homeName, awayName) {
  const teamData = await fotmobGet(`/api/data/teams?id=${homeTeamId}&tab=overview`);
  const fixtures = teamData.fixtures?.allFixtures?.fixtures || [];
  for (const f of fixtures) {
    const fHome = f.home?.id;
    const fAway = f.away?.id;
    const codeMatch = f.id && f.id.toString().includes('-');
    if (fHome === awayTeamId && fAway === homeTeamId) return { matchId: f.id };
    if (fHome === homeTeamId && fAway === awayTeamId) return { matchId: f.id };
  }
  throw new Error(`Upcoming match not found between ${homeName} and ${awayName}`);
}

function buildLast5(formRows = [], teamId) {
  const rows = [];
  for (const r of formRows.slice(0, 5)) {
    const score = r?.score || '';
    let gf = 0, ga = 0;
    if (score && score.includes('–')) {
      const [h, a] = score.split('–').map(x => parseInt(x.trim()));
      const isHome = r?.home?.id === teamId;
      gf = isHome ? h : a;
      ga = isHome ? a : h;
    }
    const res = gf > ga ? 'W' : ga > gf ? 'L' : 'D';
    const c = r?.stats?.corners?.total || null;
    const y = r?.stats?.cards?.yellow || r?.stats?.cards?.totalYellow || null;
    rows.push({ date: r?.timeUTC ? new Date(r.timeUTC).toISOString().slice(0,10) : '', opponent: r?.opponent?.name || '', venue: r?.home?.id === teamId ? 'H' : 'A', result: res, score: `${gf}-${ga}`, gf, ga, corners: c, yellow: y });
  }
  return rows;
}

function summarize(rows) {
  if (!rows.length) return null;
  const n = rows.length;
  const wins = rows.filter(r => r.result === 'W').length;
  const draws = rows.filter(r => r.result === 'D').length;
  const losses = rows.filter(r => r.result === 'L').length;
  const gf = rows.reduce((s, r) => s + r.gf, 0);
  const ga = rows.reduce((s, r) => s + r.ga, 0);
  const r1 = x => Math.round(x * 10) / 10;
  const corners = rows.filter(r => r.corners).map(r => ({ total: r.corners, for: null, against: null }));
  const cornerTotals = corners.map(r => r.total);
  const yellows = rows.filter(r => r.yellow).map(r => ({ total: r.yellow, for: null, against: null }));
  return {
    n, wins, draws, losses,
    record: `${wins}-${draws}-${losses}`,
    pts: wins*3+draws,
    avgGF: r1(gf/n), avgGA: r1(ga/n),
    cleanSheets: rows.filter(r => r.ga === 0).length,
    btts: rows.filter(r => r.gf > 0 && r.ga > 0).length,
    o15: rows.filter(r => r.gf + r.ga > 1).length,
    o25: rows.filter(r => r.gf + r.ga > 2).length,
    o35: rows.filter(r => r.gf + r.ga > 3).length,
    u25: rows.filter(r => r.gf + r.ga < 3).length,
    u35: rows.filter(r => r.gf + r.ga < 4).length,
    cornersCount: corners.length,
    avgCornersTotal: corners.length ? r1(corners.reduce((s, c) => s + c.total, 0) / corners.length) : null,
    avgCornersFor: corners.length ? r1(corners.reduce((s, c) => s + c.for || 0, 0) / corners.length) : null,
    avgCornersAgainst: corners.length ? r1(corners.reduce((s, c) => s + c.against || 0, 0) / corners.length) : null,
    cornerHigh: cornerTotals.length ? Math.max(...cornerTotals) : null,
    cornerLow: cornerTotals.length ? Math.min(...cornerTotals) : null,
    yellowsCount: yellows.length,
    avgYellowTotal: yellows.length ? r1(yellows.reduce((s, y) => s + y.total, 0) / yellows.length) : null,
    avgYellowFor: yellows.length ? r1(yellows.reduce((s, y) => s + y.for || 0, 0) / yellows.length) : null,
  };
}

export {
  fotmobGet, getMatchDetails, resolveTeam, findMatchId, buildLast5, summarize,
  getAllLeagues, getLeague, getTeam, getMatchesByDate, searchTeams, teamLogoUrl, leagueLogoUrl,
};
export default {
  fotmobGet, getMatchDetails, resolveTeam, findMatchId, buildLast5, summarize,
  getAllLeagues, getLeague, getTeam, getMatchesByDate, searchTeams, teamLogoUrl, leagueLogoUrl,
};
