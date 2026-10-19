export async function fetchOddsPage(pageNum, signal) {
  const res = await fetch(`/api/odds/page/${pageNum}`, { signal });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function mergeTournaments(prev, incoming) {
  const map = new Map(prev.map((t) => [t.id, { ...t, events: [...t.events] }]));
  for (const t of incoming || []) {
    if (map.has(t.id)) {
      const existing = map.get(t.id);
      const ids = new Set(existing.events.map((e) => e.eventId));
      for (const e of t.events) if (!ids.has(e.eventId)) existing.events.push(e);
    } else {
      map.set(t.id, { ...t, events: [...t.events] });
    }
  }
  return [...map.values()];
}
