import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';

function LeagueCard({ league, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(league.id, league.name)}
      className="group flex items-center gap-2.5 rounded-xl border border-ink-700 bg-ink-850/50 px-3 py-2.5 text-left transition-all hover:border-emerald-500/50 hover:bg-ink-800 cursor-pointer"
    >
      <Crest src={league.logo} alt={league.name} size={30} className="shrink-0 transition-transform group-hover:scale-110" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-emerald-400">{league.name}</p>
        {league.ccode && <p className="text-[10px] uppercase tracking-wide text-slate-500">{league.ccode}</p>}
      </div>
    </button>
  );
}

export default function LeagueList({ data, onSelect }) {
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    const hits = [];
    const seen = new Set();
    for (const l of data.popular || []) {
      if (l.name.toLowerCase().includes(s) && !seen.has(l.id)) { seen.add(l.id); hits.push(l); }
    }
    for (const c of data.countries || []) {
      for (const l of c.leagues || []) {
        if (l.name.toLowerCase().includes(s) && !seen.has(l.id)) { seen.add(l.id); hits.push(l); }
      }
    }
    return hits;
  }, [q, data]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search leagues & competitions…"
          className="w-full rounded-xl bg-ink-800 border border-ink-700 pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
        />
      </div>

      {results ? (
        results.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {results.map((l) => <LeagueCard key={l.id} league={l} onSelect={onSelect} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-12">No competitions match “{q}”.</p>
        )
      ) : (
        <>
          {data.popular?.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Popular</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.popular.map((l) => <LeagueCard key={l.id} league={l} onSelect={onSelect} />)}
              </div>
            </section>
          )}

          {data.countries?.map((c) => (
            <section key={c.ccode + c.name}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{c.name}</h3>
                {c.ccode && <span className="text-[10px] text-slate-600">{c.ccode}</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {c.leagues.map((l) => <LeagueCard key={l.id} league={l} onSelect={onSelect} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
