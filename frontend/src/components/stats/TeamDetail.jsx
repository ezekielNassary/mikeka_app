import { useMemo } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchTeam } from '../../lib/statsApi.js';
import Crest from './Crest.jsx';
import MatchLine from './MatchLine.jsx';
import FormStrip from './FormStrip.jsx';
import SummaryStat from './SummaryStat.jsx';
import { Skeleton, SkeletonRow } from './Loaders.jsx';

export default function TeamDetail({ teamId, onBack, onTeam }) {
  const { data, loading, error, retry } = useAsync((signal) => fetchTeam(teamId, signal), [teamId]);

  const { recent, upcoming, summary } = useMemo(() => {
    const fx = data?.fixtures || [];
    const rec = fx.filter((m) => m.state === 'FT' || m.state === 'CANCELED').sort((a, b) => (b.utcTime || '').localeCompare(a.utcTime || ''));
    const up = fx.filter((m) => m.state === 'SCHEDULED' || m.state === 'LIVE').sort((a, b) => (a.utcTime || '').localeCompare(b.utcTime || ''));
    const form = data?.form || [];
    const wins = form.filter((f) => f.result === 'W').length;
    const draws = form.filter((f) => f.result === 'D').length;
    const losses = form.filter((f) => f.result === 'L').length;
    let gf = 0, ga = 0;
    for (const f of form) {
      const [h, a] = String(f.score || '').split('-').map((x) => parseInt(x.trim()));
      if (isNaN(h) || isNaN(a)) continue;
      const isHome = f.home?.isUs;
      gf += isHome ? h : a;
      ga += isHome ? a : h;
    }
    return { recent: rec.slice(0, 10), upcoming: up.slice(0, 10), summary: { played: form.length, wins, draws, losses, gf, ga } };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Skeleton className="w-16 h-16 rounded-xl" /><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24" /></div></div>
        <SkeletonRow count={6} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-rose-400 font-semibold mb-1">Could not load team</p>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button onClick={retry} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-4 py-2 text-sm cursor-pointer">Retry</button>
      </div>
    );
  }

  const d = data?.details || {};

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl border border-ink-700 hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <Crest src={d.logo} alt={d.name} size={56} className="animate-pop" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{d.name}</h2>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            {d.leagueName || ''}{d.country ? ` · ${d.country}` : ''}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-ink-700 bg-ink-850/40 p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Recent form</h3>
        <FormStrip form={data.form} onTeam={onTeam} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <SummaryStat label="Record" value={`${summary.wins}-${summary.draws}-${summary.losses}`} />
          <SummaryStat label="Points (form)" value={summary.wins * 3 + summary.draws} tone="text-emerald-400" />
          <SummaryStat label="Goals for" value={summary.gf} tone="text-emerald-400" />
          <SummaryStat label="Goals against" value={summary.ga} tone="text-rose-400" />
        </div>
      </section>

      {data.next && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Next match</h3>
          <MatchLine match={data.next} onTeam={onTeam} showTournament />
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Recent results</h3>
        {recent.length ? (
          <div className="space-y-2">{recent.map((m) => <MatchLine key={m.id} match={m} onTeam={onTeam} />)}</div>
        ) : (
          <p className="text-sm text-slate-500 py-4">No recent results.</p>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Upcoming fixtures</h3>
          <div className="space-y-2">{upcoming.map((m) => <MatchLine key={m.id} match={m} onTeam={onTeam} />)}</div>
        </section>
      )}
    </div>
  );
}
