const getJSON = async (url, signal) => {
  const res = await fetch(url, { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

export const fetchLeagues = (signal) => getJSON('/api/stats/leagues', signal);

export const fetchLeague = (id, season, signal) =>
  getJSON(`/api/stats/league/${id}${season ? `?season=${encodeURIComponent(season)}` : ''}`, signal);

export const fetchTeam = (id, signal) => getJSON(`/api/stats/team/${id}`, signal);

export const searchTeams = (q, signal) => getJSON(`/api/stats/team-search?q=${encodeURIComponent(q)}`, signal);

export const fetchMatches = (date, signal) =>
  getJSON(`/api/stats/matches${date ? `?date=${encodeURIComponent(date)}` : ''}`, signal);

export const fetchMatch = (id, signal) => getJSON(`/api/stats/match/${id}`, signal);
