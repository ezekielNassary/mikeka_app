import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { searchTeams } from '../../lib/statsApi.js';
import Crest from './Crest.jsx';
import { SkeletonRow } from './Loaders.jsx';

export default function TeamSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const { data, loading, error } = useAsync(
    (signal) => (term.length < 2 ? Promise.resolve({ teams: [] }) : searchTeams(term, signal)),
    [term]
  );

  const teams = data?.teams || [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a team… (e.g. Arsenal)"
          autoFocus
          className="w-full rounded-xl bg-ink-800 border border-ink-700 pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
        />
      </div>

      {term.length < 2 ? (
        <p className="text-sm text-slate-500 text-center py-16">Type at least 2 letters to find a team and see its form, recent results and next fixture.</p>
      ) : loading ? (
        <SkeletonRow count={5} />
      ) : error ? (
        <p className="text-sm text-rose-400 text-center py-12">{error}</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">No teams found for “{term}”.</p>
      ) : (
        <div className="space-y-2">
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id, t.name)}
              className="w-full flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850/50 px-3 py-2.5 text-left transition-colors hover:border-emerald-500/50 hover:bg-ink-800 cursor-pointer animate-rise"
            >
              <Crest src={t.logo} alt={t.name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-200">{t.name}</p>
                {t.leagueName && <p className="text-[11px] text-slate-500 truncate">{t.leagueName}</p>}
              </div>
              <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
