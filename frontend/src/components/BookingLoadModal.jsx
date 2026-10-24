import { useMemo, useState } from 'react';

const normTeam = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const findEvent = (tournaments, home, away) => {
  const h = normTeam(home);
  const a = normTeam(away);
  for (const t of tournaments || []) {
    for (const e of t.events || []) {
      if (normTeam(e.homeTeam) === h && normTeam(e.awayTeam) === a) return e;
    }
  }
  return null;
};

const pickKey = (eventId, market, outcome) => `${eventId}|${market}|${outcome}`;

const makePick = (event, market, outcome) => {
  if (!event || !market || !outcome) return null;
  const label = `${market.name}${market.specifier ? ' ' + market.specifier : ''}`;
  return {
    matchKey: String(event.eventId),
    eventId: event.eventId,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    league: event.league || '',
    startTime: event.startTime || '',
    startTimeUTC: event.startTimeUTC || null,
    status: event.status || '',
    market: label,
    outcome: outcome.desc,
    odds: Number(outcome.odds),
    probability: Number(outcome.probability),
    marketId: market.marketId,
    outcomeId: outcome.outcomeId,
    specifier: market.specifier || '',
  };
};

export default function BookingLoadModal({ open, onClose, onApply, tournaments = [] }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [overrides, setOverrides] = useState({}); // matchKey -> {market, outcome}

  const matches = useMemo(() => (data?.matches || []).filter((m) => m.available !== false), [data]);

  if (!open) return null;

  const load = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return setError('Enter a SportyBet booking/code');
    setLoading(true);
    setError('');
    setData(null);
    setOverrides({});
    try {
      // Try the booking endpoint first (gives full team names + all markets when available)
      let res = await fetch(`/api/odds/booking/${encodeURIComponent(c)}`);
      let d = await res.json();
      if (!res.ok || d.error) {
        res = await fetch(`/api/odds/booking/preview/${encodeURIComponent(c)}`).catch(() => null);
        if (res && res.ok) d = await res.json(); else throw new Error(d.error || 'Code not found');
      }
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    const picks = [];
    for (const m of matches) {
      const ov = overrides[m.eventId];
      const event = findEvent(tournaments, m.homeTeam, m.awayTeam);
      if (ov) {
        // Try to match against live odds if present
        if (event) {
          const market = (event.markets || []).find((mm) => String(mm.marketId) === String(ov.marketId) && (mm.specifier || '') === (ov.specifier || ''));
          const outcome = market?.outcomes?.find((oo) => String(oo.outcomeId) === String(ov.outcomeId));
          const pick = makePick(event, market, outcome);
          if (pick) { picks.push(pick); continue; }
        }
        // Fallback: keep the overridden pick with data from booking
        picks.push({
          matchKey: String(m.eventId),
          eventId: m.eventId,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          league: m.league || '',
          startTime: m.kickoff || '',
          startTimeUTC: m.kickoffUTC || null,
          status: m.status || '',
          market: ov.label,
          outcome: ov.outcome,
          odds: Number(ov.odds),
          probability: Number(ov.probability || 0.5),
          marketId: ov.marketId,
          outcomeId: ov.outcomeId,
          specifier: ov.specifier || '',
        });
        continue;
      }
      if (event && m.pick?.marketId && m.pick?.outcomeId) {
        const market = (event.markets || []).find((mm) => String(mm.marketId) === String(m.pick.marketId) && (mm.specifier || '') === (m.pick.specifier || ''));
        const outcome = market?.outcomes?.find((oo) => String(oo.outcomeId) === String(m.pick.outcomeId));
        const pick = makePick(event, market, outcome);
        if (pick) { picks.push(pick); continue; }
      }
      // Fallback to booking pick
      if (m.pick) {
        picks.push({
          matchKey: String(m.eventId),
          eventId: m.eventId,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          league: m.league || '',
          startTime: m.kickoff || '',
          startTimeUTC: m.kickoffUTC || null,
          status: m.status || '',
          market: m.pick.market,
          outcome: m.pick.outcome,
          odds: Number(m.pick.odds),
          probability: Number(m.pick.probability || 0.5),
          marketId: m.pick.marketId || null,
          outcomeId: m.pick.outcomeId || null,
          specifier: '',
        });
      }
    }
    if (!picks.length) return setError('No usable picks to add');
    onApply(picks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-ink-700">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Load SportyBet Code</h2>
            <p className="text-xs text-slate-500">Paste a booking code to load results and edit picks per match</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-ink-800 text-slate-400 flex items-center justify-center cursor-pointer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="px-4 sm:px-5 py-3 border-b border-ink-700/60">
          <form onSubmit={load} className="flex flex-col sm:flex-row gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 5LWNF3"
              className="flex-1 rounded-xl bg-ink-800 border border-ink-700 px-3 py-2 text-sm text-slate-200 tracking-widest font-semibold placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
            <button disabled={loading} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-ink-950 font-bold px-4 py-2 text-sm cursor-pointer">{loading ? 'Loading…' : 'Load Code'}</button>
          </form>
          {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-3">
          {data && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300 tracking-widest">{data.code}</span>
                {data.deadline && <span>Deadline: {data.deadline}</span>}
              </div>
              <div className="flex items-center gap-3 tabular-nums">
                {data.totalOdds && <span>Total odds: <span className="text-emerald-400 font-bold">{Number(data.totalOdds).toFixed(2)}</span></span>}
                {data.computedOdds && <span>Computed: <span className="text-slate-300 font-bold">{Number(data.computedOdds).toFixed(2)}</span></span>}
                <span>{matches.length}/{data.selections || matches.length} matches</span>
              </div>
            </div>
          )}

          {matches.map((m) => {
            const event = findEvent(tournaments, m.homeTeam, m.awayTeam);
            const markets = event?.markets?.length ? event.markets : (m.markets || []);
            const current = overrides[m.eventId] || {
              marketId: m.pick?.marketId,
              outcomeId: m.pick?.outcomeId,
              specifier: m.pick?.specifier || '',
              label: m.pick?.market,
              outcome: m.pick?.outcome,
              odds: m.pick?.odds,
              probability: m.pick?.probability,
            };
            return (
              <div key={m.eventId} className="rounded-xl border border-ink-700 overflow-hidden">
                <div className="px-3 sm:px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{m.homeTeam} vs {m.awayTeam}</p>
                    <p className="text-[11px] text-slate-500">{[m.league, m.kickoff].filter(Boolean).join(' · ')}</p>
                    {m.status && <p className="text-[10px] text-slate-600">{m.status}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-emerald-400">{current.label || m.pick?.market}</p>
                    <p className="text-sm font-bold tabular-nums text-slate-100">{current.outcome || m.pick?.outcome} @{Number(current.odds || m.pick?.odds || 0).toFixed(2)}</p>
                  </div>
                </div>
                {markets.length > 0 && (
                  <div className="px-3 sm:px-4 pb-3 space-y-2 border-t border-ink-700/60">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 pt-2">Change market / selection</p>
                    <div className="grid gap-2">
                      {markets.map((mm, idx) => (
                        <div key={`${mm.marketId}-${mm.specifier}-${idx}`}>
                          <p className="text-[11px] text-slate-400 mb-1 truncate">{mm.name}{mm.specifier ? ' ' + mm.specifier : ''}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(mm.outcomes || []).map((oo, i) => {
                              const active = String(current.marketId) === String(mm.marketId) && String(current.outcomeId) === String(oo.outcomeId) && String(current.specifier || '') === String(mm.specifier || '');
                              return (
                                <button
                                  key={i}
                                  onClick={() => setOverrides((o) => ({ ...o, [m.eventId]: { marketId: mm.marketId, outcomeId: oo.outcomeId, specifier: mm.specifier || '', label: `${mm.name}${mm.specifier ? ' ' + mm.specifier : ''}`, outcome: oo.desc, odds: oo.odds, probability: oo.probability } }))}
                                  className={`rounded-lg border px-2.5 py-1 text-left transition-colors cursor-pointer ${active ? 'border-emerald-400 text-emerald-400 bg-emerald-400/10' : 'border-ink-700 text-slate-300 hover:bg-ink-800'}`}
                                >
                                  <span className="text-xs">{oo.desc}</span> <span className="text-xs font-bold tabular-nums">@{Number(oo.odds).toFixed(2)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="border-t border-ink-700 px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Modifications use live odds from the homepage feed when available.</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 cursor-pointer">Cancel</button>
            <button onClick={apply} disabled={!matches.length} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-ink-950 font-bold px-4 py-2 text-sm cursor-pointer">Add to Slip</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
