export const COUNTRY_CODE = {
  England: 'ENG', Scotland: 'SCO', Wales: 'WAL', 'Northern Ireland': 'NIR', Ireland: 'IRL',
  Spain: 'ESP', Italy: 'ITA', Germany: 'GER', France: 'FRA', Netherlands: 'NED',
  Portugal: 'POR', Turkey: 'TUR', Belgium: 'BEL', Sweden: 'SWE', Norway: 'NOR',
  Denmark: 'DEN', Finland: 'FIN', 'Czech Republic': 'CZE', Czechia: 'CZE',
  Croatia: 'CRO', Serbia: 'SRB', Bulgaria: 'BUL', Romania: 'ROM', Greece: 'GRE',
  Ukraine: 'UKR', Russia: 'RUS', Poland: 'POL', Austria: 'AUT', Switzerland: 'SUI',
  'Saudi Arabia': 'KSA', Mexico: 'MEX', Argentina: 'ARG', Brazil: 'BRA', Chile: 'CHI',
  Peru: 'PER', Colombia: 'COL', Paraguay: 'PAR', Uruguay: 'URU', Ecuador: 'ECU',
  'United States': 'USA', USA: 'USA', Australia: 'AUS', Japan: 'JPN', 'South Korea': 'KOR',
  China: 'CHN', India: 'IND', Tanzania: 'TZ', Kenya: 'KEN', Uganda: 'UGA',
  Morocco: 'MAR', Tunisia: 'TUN', Algeria: 'DZA', Egypt: 'EGY', 'South Africa': 'RSA',
  Cameroon: 'CMR', Ghana: 'GHA', 'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV',
  Senegal: 'SEN', Mali: 'MLI', 'Burkina Faso': 'BFA', Congo: 'COD',
  'Costa Rica': 'CRC', Honduras: 'HON', Panama: 'PAN', Guatemala: 'GUA',
  'New Zealand': 'NZL', Canada: 'CAN',
  UEFA: 'UEFA', 'South America': 'CONMEBOL', CONMEBOL: 'CONMEBOL',
  CAF: 'CAF', AFC: 'AFC', FIFA: 'FIFA', World: 'INT',
};

export const labelLeague = (name, country) => {
  const code = country ? COUNTRY_CODE[country] || country.slice(0, 3).toUpperCase() : '';
  return code ? `${name} (${code})` : name;
};

const TIERS = [
  { min: 0.9, cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' },
  { min: 0.75, cls: 'bg-lime-500/15 border-lime-500/40 text-lime-400' },
  { min: 0.6, cls: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' },
  { min: 0.5, cls: 'bg-orange-500/15 border-orange-500/40 text-orange-400' },
  { min: 0.3, cls: 'bg-rose-500/15 border-rose-500/35 text-rose-400' },
  { min: -1, cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
];

export const tier = (p) => (TIERS.find((t) => p >= t.min) || TIERS[TIERS.length - 1]).cls;

export const localDateKey = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayKey = () => localDateKey(Date.now());

export const dateKeyOffset = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return localDateKey(d.getTime());
};

export const formatDay = (key) => {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

// A match is treated as finished ~2h45m after kickoff (90' + HT + stoppage).
const FULL_TIME_MS = 165 * 60 * 1000;

export const kickoffState = (ts, status) => {
  const t = Number(ts);
  const hasTime = ts != null && !isNaN(t) && t > 0;
  const s = String(status || '').toLowerCase();
  const now = Date.now();
  const passed = hasTime && t <= now;
  const statusEnded = /end|finish|closed|abandon|postpon|postp|result|cancel/.test(s);
  const statusLive = /live|in ?play|1st|2nd|half|\bht\b|break|set \d/.test(s);
  if (statusEnded || (passed && now - t > FULL_TIME_MS)) return { started: true, live: false, ended: true };
  if (statusLive || passed) return { started: true, live: true, ended: false };
  return { started: false, live: false, ended: false };
};

export const isStarted = (ts, status) => kickoffState(ts, status).started;
export const isEnded = (ts, status) => kickoffState(ts, status).ended;
