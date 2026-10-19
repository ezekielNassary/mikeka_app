import { useEffect, useMemo, useRef, useState } from 'react';
import { labelLeague } from '../lib/constants.js';

const rowCls = (active) =>
  `w-full text-left rounded-lg px-3 py-2 text-sm truncate transition-colors cursor-pointer ${
    active ? 'bg-emerald-500/15 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-ink-800 hover:text-slate-100'
  }`;

export default function LeagueFilter({ tournaments, counts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  const options = useMemo(() => {
    const seen = new Map();
    for (const t of tournaments) {
      const id = String(t.id);
      if (!seen.has(id)) seen.set(id, { id, label: labelLeague(t.name, t.country), count: counts?.get(id) || 0 });
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [tournaments, counts]);

  const total = useMemo(() => [...(counts?.values() || [])].reduce((a, b) => a + b, 0), [counts]);

  const current = value === 'all' ? 'All leagues' : options.find((o) => o.id === value)?.label || 'All leagues';

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => { onChange(id); setOpen(false); setQ(''); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
          value === 'all'
            ? 'border-ink-700 bg-ink-800 text-slate-300 hover:text-slate-100'
            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
        }`}
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
        </svg>
        <span className="truncate max-w-[9rem]">{current}</span>
        <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-64 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-ink-700">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search league…"
              className="w-full rounded-lg bg-ink-800 border border-ink-700 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            <button onClick={() => pick('all')} className={`${rowCls(value === 'all')} flex items-center justify-between gap-2`}>
              <span>All leagues</span>
              <span className="text-[11px] text-slate-500 tabular-nums">({total})</span>
            </button>
            {matches.map((o) => (
              <button key={o.id} onClick={() => pick(o.id)} className={`${rowCls(value === o.id)} flex items-center justify-between gap-2`}>
                <span className="truncate">{o.label}</span>
                <span className="text-[11px] text-slate-500 tabular-nums shrink-0">({o.count})</span>
              </button>
            ))}
            {matches.length === 0 && <p className="px-3 py-4 text-xs text-slate-500 text-center">No leagues found</p>}
          </div>
        </div>
      )}
    </div>
  );
}
