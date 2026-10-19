// Football statistics — FotMob-backed leagues, standings, results and teams.
import { getAllLeagues, getLeague, getTeam, getMatchesByDate, getMatchDetails, searchTeams, teamLogoUrl, leagueLogoUrl } from '../services/fotmob.js';
import { fmtLocalDate } from '../config.js';

const leagueRow = (l) => ({ id: l.id, name: l.name, ccode: l.ccode || '', logo: leagueLogoUrl(l.id) });

export async function listLeagues(req, res) {
  try {
    const data = await getAllLeagues();
    const popular = (data.popular || []).map(leagueRow);
    const countries = (data.countries || [])
      .map((c) => ({ name: c.name, ccode: c.ccode || '', leagues: (c.leagues || []).map(leagueRow) }))
      .filter((c) => c.leagues.length);
    res.json({ success: true, popular, countries });
  } catch (e) {
    console.error('[stats:leagues]', e.message);
    res.status(502).json({ error: e.message });
  }
}

const mapLeagueMatch = (m) => {
  const st = m.status || {};
  const state = st.cancelled ? 'CANCELED' : st.finished ? 'FT' : st.started ? 'LIVE' : 'SCHEDULED';
  return {
    id: String(m.id ?? ''),
    round: m.round || '',
    utcTime: st.utcTime || null,
    home: { id: String(m.home?.id ?? ''), name: m.home?.name || '', logo: teamLogoUrl(m.home?.id) },
    away: { id: String(m.away?.id ?? ''), name: m.away?.name || '', logo: teamLogoUrl(m.away?.id) },
    state,
    reason: st.reason?.short || '',
    score: st.scoreStr && state !== 'SCHEDULED' ? st.scoreStr : null,
  };
};

export async function leagueOverview(req, res) {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'valid league id required' });
  const season = (req.query.season || '').trim();
  try {
    const d = await getLeague(id, 'overview', season);
    const details = d.details || {};
    const wrap = Array.isArray(d.table) ? d.table[0] : null;
    const t = wrap?.data?.table || {};
    const raw = t.all || t.total || [];
    const standings = raw.map((r) => ({
      id: String(r.id ?? ''),
      name: r.name,
      short: r.shortName || r.name,
      logo: teamLogoUrl(r.id),
      played: r.played ?? 0,
      wins: r.wins ?? 0,
      draws: r.draws ?? 0,
      losses: r.losses ?? 0,
      scores: r.scoresStr || '',
      gd: r.goalConDiff ?? 0,
      pts: r.pts ?? 0,
      idx: r.idx ?? 0,
      qualColor: r.qualColor || null,
    }));
    const legend = (wrap?.data?.legend || []).map((l) => ({ title: l.title, color: l.color }));
    const matches = (d.fixtures?.allMatches || []).map(mapLeagueMatch);
    res.json({
      success: true,
      source: 'FotMob',
      details: {
        id,
        name: details.name || '',
        country: details.country || '',
        logo: leagueLogoUrl(id),
        season: details.selectedSeason || '',
        seasons: d.allAvailableSeasons || [],
      },
      standings,
      legend,
      matches,
    });
  } catch (e) {
    console.error('[stats:league]', e.message);
    res.status(502).json({ error: e.message });
  }
}

const mapForm = (r) => ({
  result: r.resultString || '',
  score: r.score || '',
  utcTime: r.date?.utcTime || r.tooltipText?.utcTime || null,
  league: r.tournamentName || '',
  home: { id: r.home?.id, name: r.home?.name || '', logo: teamLogoUrl(r.home?.id), isUs: !!r.home?.isOurTeam },
  away: { id: r.away?.id, name: r.away?.name || '', logo: teamLogoUrl(r.away?.id), isUs: !!r.away?.isOurTeam },
});

const mapTeamFixture = (f) => {
  const st = f.status || {};
  return {
    id: String(f.id ?? ''),
    utcTime: st.utcTime || null,
    home: { id: String(f.home?.id ?? ''), name: f.home?.name || '', logo: teamLogoUrl(f.home?.id), score: f.home?.score },
    away: { id: String(f.away?.id ?? ''), name: f.away?.name || '', logo: teamLogoUrl(f.away?.id), score: f.away?.score },
    state: st.cancelled ? 'CANCELED' : st.finished ? 'FT' : st.started ? 'LIVE' : 'SCHEDULED',
    score: st.scoreStr && !st.notStarted ? st.scoreStr : null,
    result: typeof f.result === 'number' ? f.result : null,
    tournament: f.tournament?.name || f.tournamentName || '',
  };
};

export async function teamOverview(req, res) {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'valid team id required' });
  try {
    const d = await getTeam(id, 'overview');
    const details = d.details || {};
    const ov = d.overview || {};
    const form = (ov.teamForm || []).map(mapForm);
    const fixtures = (d.fixtures?.allFixtures?.fixtures || []).map(mapTeamFixture);
    const next = d.fixtures?.allFixtures?.nextMatch ? mapTeamFixture(d.fixtures.allFixtures.nextMatch) : null;
    res.json({
      success: true,
      source: 'FotMob',
      details: {
        id,
        name: details.name || '',
        country: details.country || '',
        logo: teamLogoUrl(id),
        leagueId: details.primaryLeagueId || null,
        leagueName: details.primaryLeagueName || '',
        color: details.teamColor || null,
      },
      form,
      fixtures,
      next,
      table: ov.table || null,
    });
  } catch (e) {
    console.error('[stats:team]', e.message);
    res.status(502).json({ error: e.message });
  }
}

export async function teamSearch(req, res) {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, teams: [] });
  try {
    const teams = (await searchTeams(q)).slice(0, 12).map((t) => ({
      id: t.id,
      name: t.name,
      leagueId: t.leagueId,
      leagueName: t.leagueName,
      logo: teamLogoUrl(t.id),
    }));
    res.json({ success: true, teams });
  } catch (e) {
    console.error('[stats:team-search]', e.message);
    res.status(502).json({ error: e.message });
  }
}

// ---- Matches by date (all competitions) ----
const normalizeDate = (v) => {
  const s = String(v || '').replace(/[^0-9]/g, '');
  return s.length === 8 ? s : fmtLocalDate(Date.now()).replace(/-/g, '');
};

const mapDateMatch = (m) => {
  const st = m.status || {};
  const state = st.cancelled ? 'CANCELED' : st.finished ? 'FT' : st.started ? 'LIVE' : 'SCHEDULED';
  return {
    id: String(m.id ?? ''),
    leagueId: m.leagueId,
    utcTime: st.utcTime || null,
    home: { id: String(m.home?.id ?? ''), name: m.home?.longName || m.home?.name || '', logo: teamLogoUrl(m.home?.id) },
    away: { id: String(m.away?.id ?? ''), name: m.away?.longName || m.away?.name || '', logo: teamLogoUrl(m.away?.id) },
    state,
    reason: st.reason?.short || st.liveTime?.short || '',
    score: st.scoreStr && state !== 'SCHEDULED' ? st.scoreStr : null,
  };
};

export async function listMatches(req, res) {
  const date = normalizeDate(req.query.date);
  try {
    const d = await getMatchesByDate(date);
    const leagues = (d.leagues || [])
      .map((l) => ({
        id: l.id,
        name: l.name,
        ccode: l.ccode || '',
        logo: leagueLogoUrl(l.id),
        matches: (l.matches || []).map(mapDateMatch),
      }))
      .filter((l) => l.matches.length);
    const total = leagues.reduce((n, l) => n + l.matches.length, 0);
    const pretty = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    res.json({ success: true, source: 'FotMob', date: pretty, total, leagues });
  } catch (e) {
    console.error('[stats:matches]', e.message);
    res.status(502).json({ error: e.message });
  }
}

function summarizeForm(form) {
  let n = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const f of form) {
    const [h, a] = String(f.score || '').split('-').map((x) => parseInt(x.trim()));
    if (isNaN(h) || isNaN(a)) continue;
    const us = f.home?.isUs ? h : a;
    const them = f.home?.isUs ? a : h;
    gf += us; ga += them; n++;
    if (us > them) w++; else if (us < them) l++; else d++;
  }
  const r1 = (x) => Math.round(x * 10) / 10;
  return { n, w, d, l, gf, ga, avgGF: n ? r1(gf / n) : 0, avgGA: n ? r1(ga / n) : 0 };
}

const mapH2H = (m) => {
  const st = m.status || {};
  const homeScore = m.home?.score;
  const awayScore = m.away?.score;
  const hasScore = homeScore != null && awayScore != null;
  return {
    id: String((String(m.matchUrl || '').split('#').pop()) || m.matchUrl || ''),
    utcTime: st.utcTime || m.time?.utcTime || null,
    leagueName: m.league?.name || '',
    home: { id: String(m.home?.id ?? ''), name: m.home?.name || '', logo: teamLogoUrl(m.home?.id) },
    away: { id: String(m.away?.id ?? ''), name: m.away?.name || '', logo: teamLogoUrl(m.away?.id) },
    state: st.cancelled ? 'CANCELED' : st.finished || m.finished ? 'FT' : st.started ? 'LIVE' : 'SCHEDULED',
    score: hasScore ? `${homeScore} - ${awayScore}` : null,
  };
};

export async function matchDetail(req, res) {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'match id required' });
  try {
    const md = await getMatchDetails(id);
    const g = md.general || {};
    const hdr = md.header || {};
    const st = hdr.status || {};
    const hTeams = hdr.teams || [];
    const home = g.homeTeam || {};
    const away = g.awayTeam || {};
    const tf = md.content?.matchFacts?.teamForm || [];
    const homeForm = Array.isArray(tf[0]) ? tf[0].map(mapForm) : [];
    const awayForm = Array.isArray(tf[1]) ? tf[1].map(mapForm) : [];

    const raw = md.content?.h2h;
    let h2h = null;
    if (raw?.summary) {
      const [wh, wd, wa] = raw.summary;
      h2h = {
        homeWins: wh, draws: wd, awayWins: wa, n: wh + wd + wa,
        matches: (raw.matches || []).slice(0, 6).map(mapH2H),
      };
    }

    const state = st.cancelled ? 'CANCELED' : st.finished ? 'FT' : st.started ? 'LIVE' : 'SCHEDULED';
    res.json({
      success: true,
      source: 'FotMob',
      details: {
        id,
        name: g.matchName || `${home.name || ''} vs ${away.name || ''}`,
        leagueId: g.leagueId || null,
        leagueName: g.leagueName || '',
        countryCode: g.countryCode || '',
        utcTime: st.utcTime || null,
        state,
        score: st.scoreStr || null,
        reason: st.reason?.short || st.liveTime?.short || '',
      },
      home: { id: String(home.id ?? ''), name: home.name || '', logo: teamLogoUrl(home.id), score: hTeams[0]?.score ?? null },
      away: { id: String(away.id ?? ''), name: away.name || '', logo: teamLogoUrl(away.id), score: hTeams[1]?.score ?? null },
      homeForm, awayForm,
      homeSum: summarizeForm(homeForm),
      awaySum: summarizeForm(awayForm),
      h2h,
    });
  } catch (e) {
    console.error('[stats:match]', e.message);
    res.status(502).json({ error: e.message });
  }
}
