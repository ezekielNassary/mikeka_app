const KEY = 'mikeka.slip.v1';

const isPick = (p) =>
  p &&
  typeof p === 'object' &&
  p.matchKey != null &&
  p.homeTeam &&
  p.awayTeam &&
  Number.isFinite(Number(p.odds));

export function loadSlip() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPick) : [];
  } catch {
    return [];
  }
}

export function saveSlip(picks) {
  try {
    localStorage.setItem(KEY, JSON.stringify(picks || []));
  } catch {
    // storage full/blocked — ignore, slip still works in-memory
  }
}
