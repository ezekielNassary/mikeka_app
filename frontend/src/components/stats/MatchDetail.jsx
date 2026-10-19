import { useAsync } from '../../hooks/useAsync.js';
import { fetchMatch } from '../../lib/statsApi.js';
import Crest from './Crest.jsx';
import MatchLine from './MatchLine.jsx';
import FormStrip from './FormStrip.jsx';
import SummaryStat from './SummaryStat.jsx';
import { Skeleton, SkeletonRow } from './Loaders.jsx';

const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
const dateStr = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '');

function TeamBlock({ team, form, sum, onTeam }) {
  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-850/40 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Crest src={team.logo} alt={team.name} size={40} className="animate-pop" />
        <button
          type="button"
          onClick={onTeam ? () => onTeam(team.id, team.name) : undefined}
          className={`text-left min-w-0 ${onTeam ? 'cursor-pointer hover:text-emerald-400' : ''}`}
        >
          <p className="text-base font-bold text-white truncate">{team.name}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Last 5</p>
        </button>
      </div>
      <FormStrip form={form} onTeam={onTeam} />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <SummaryStat label="Form record" value={`${sum.w}-${sum.d}-${sum.l}`} />
        <SummaryStat label="Goals (GF/GA)" value={`${sum.gf}/${sum.ga}`} />
      </div>
    </section>
  );
}

export default function MatchDetail({ matchId, onBack, onTeam }) {
  const { data, loading, error, retry } = useAsync((signal) => fetchMatch(matchId, signal), [matchId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Skeleton className="w-9 h-9 rounded-xl" /><Skeleton className="h-4 w-40" /></div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <SkeletonRow count={6} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-rose-400 font-semibold mb-1">Could not load match</p>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button onClick={retry} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-4 py-2 text-sm cursor-pointer">Retry</button>
      </div>
    );
  }

  const d = data.details || {};
  const { home, away, homeForm, awayForm, homeSum, awaySum, h2h } = data;
  const played = d.state === 'FT' || d.state === 'LIVE' || d.state === 'CANCELED';

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl border border-ink-700 hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 truncate">{d.leagueName || ''}{d.countryCode ? ` · ${d.countryCode}` : ''}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-ink-700 bg-gradient-to-b from-ink-850/70 to-ink-900/40 px-4 py-5">
        {d.utcTime && (
          <p className="text-center text-[11px] text-slate-500 mb-3">
            {dateStr(d.utcTime)} · {clock(d.utcTime)}
            {d.state === 'LIVE' && <span className="ml-2 inline-flex items-center gap-1 font-bold uppercase text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live {d.reason && d.reason !== 'Live' ? d.reason : ''}</span>}
            {d.state === 'FT' && <span className="ml-2 font-semibold uppercase text-slate-400">Full time</span>}
          </p>
        )}
        <div className="grid grid-cols-3 items-center gap-2">
          <button type="button" onClick={onTeam ? () => onTeam(home.id, home.name) : undefined} className={`flex flex-col items-center gap-2 min-w-0 ${onTeam ? 'cursor-pointer' : ''}`}>
            <Crest src={home.logo} alt={home.name} size={56} className="animate-pop" />
            <span className="text-sm font-semibold text-slate-200 text-center truncate max-w-full">{home.name}</span>
          </button>
          <div className="text-center">
            {played ? (
              <span className="text-3xl font-black tabular-nums text-white">{d.score || `${home.score ?? 0} - ${away.score ?? 0}`}</span>
            ) : (
              <span className="text-2xl font-black tabular-nums text-white">{clock(d.utcTime) || '—'}</span>
            )}
          </div>
          <button type="button" onClick={onTeam ? () => onTeam(away.id, away.name) : undefined} className={`flex flex-col items-center gap-2 min-w-0 ${onTeam ? 'cursor-pointer' : ''}`}>
            <Crest src={away.logo} alt={away.name} size={56} className="animate-pop" />
            <span className="text-sm font-semibold text-slate-200 text-center truncate max-w-full">{away.name}</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TeamBlock team={home} form={homeForm} sum={homeSum} onTeam={onTeam} />
        <TeamBlock team={away} form={awayForm} sum={awaySum} onTeam={onTeam} />
      </div>

      {h2h && h2h.n > 0 && (
        <section className="rounded-2xl border border-ink-700 bg-ink-850/40 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Head to head</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <SummaryStat label={home.name.split(' ')[0]} value={h2h.homeWins} tone="text-emerald-400" />
            <SummaryStat label="Draws" value={h2h.draws} />
            <SummaryStat label={away.name.split(' ')[0]} value={h2h.awayWins} tone="text-sky-400" />
          </div>
          <div className="space-y-2">
            {h2h.matches.map((m) => <MatchLine key={m.id} match={m} onTeam={onTeam} />)}
          </div>
        </section>
      )}
    </div>
  );
}
