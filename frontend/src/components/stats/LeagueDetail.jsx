import { useMemo, useState } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchLeague } from '../../lib/statsApi.js';
import Crest from './Crest.jsx';
import MatchLine from './MatchLine.jsx';
import StandingsTable from './StandingsTable.jsx';
import { SkeletonRow, StatsLoader } from './Loaders.jsx';

const TABS = [
  { key: 'table', label: 'Standings' },
  { key: 'results', label: 'Results' },
  { key: 'fixtures', label: 'Fixtures' },
];

export default function LeagueDetail({ leagueId, onBack, onTeam }) {
  const [tab, setTab] = useState('table');
  const [season, setSeason] = useState('');
  const { data, loading, error, retry } = useAsync((signal) => fetchLeague(leagueId, season, signal), [leagueId, season]);

  const { results, fixtures } = useMemo(() => {
    const m = data?.matches || [];
    const done = m.filter((x) => x.state === 'FT' || x.state === 'CANCELED').sort((a, b) => (b.utcTime || '').localeCompare(a.utcTime || ''));
    const next = m.filter((x) => x.state === 'SCHEDULED' || x.state === 'LIVE').sort((a, b) => (a.utcTime || '').localeCompare(b.utcTime || ''));
    return { results: done, fixtures: next };
  }, [data]);

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl border border-ink-700 hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Crest src={data?.details?.logo} alt={data?.details?.name || ''} size={40} className="animate-pop" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{data?.details?.name || '……'}</h2>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{data?.details?.country || ''}</p>
          </div>
        </div>
        {data?.details?.seasons?.length > 1 && (
          <select
            value={season || data?.details?.season || ''}
            onChange={(e) => setSeason(e.target.value)}
            className="rounded-lg bg-ink-800 border border-ink-700 text-xs text-slate-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 cursor-pointer"
          >
            {data.details.seasons.slice(0, 10).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="flex gap-1 rounded-xl border border-ink-700 bg-ink-850/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              tab === t.key ? 'bg-emerald-500 text-ink-950' : 'text-slate-300 hover:bg-ink-800'
            }`}
          >
            {t.label}
            {t.key !== 'table' && (t.key === 'results' ? results.length : fixtures.length) > 0 && (
              <span className={`ml-1 ${tab === t.key ? 'opacity-70' : 'text-slate-500'}`}>{t.key === 'results' ? results.length : fixtures.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        tab === 'table' ? (
          <SkeletonRow count={8} />
        ) : (
          <StatsLoader label="Fetching matches…" />
        )
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-rose-400 font-semibold mb-1">Could not load competition</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button onClick={retry} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-4 py-2 text-sm cursor-pointer">Retry</button>
        </div>
      ) : tab === 'table' ? (
        <StandingsTable standings={data.standings} legend={data.legend} onTeam={onTeam} />
      ) : (
        <div className="space-y-2">
          {(tab === 'results' ? results : fixtures).slice(0, 60).map((m) => (
            <MatchLine key={m.id} match={m} onTeam={onTeam} />
          ))}
          {(tab === 'results' ? results : fixtures).length === 0 && (
            <p className="text-sm text-slate-500 text-center py-12">No {tab} available.</p>
          )}
        </div>
      )}
    </div>
  );
}
