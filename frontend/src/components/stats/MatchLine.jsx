import Crest from './Crest.jsx';

const clock = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
};

const shortDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

function TeamSide({ side, align, onTeam }) {
  const Comp = onTeam ? 'button' : 'span';
  return (
    <Comp
      type={onTeam ? 'button' : undefined}
      onClick={onTeam ? () => onTeam(side.id, side.name) : undefined}
      className={`flex items-center gap-2 min-w-0 ${align === 'end' ? 'justify-end text-right' : 'text-left'} ${onTeam ? 'cursor-pointer hover:text-emerald-400' : ''}`}
    >
      {align === 'end' && <span className="truncate text-sm font-semibold text-slate-200">{side.name}</span>}
      <Crest src={side.logo} alt={side.name} size={22} />
      {align !== 'end' && <span className="truncate text-sm font-semibold text-slate-200">{side.name}</span>}
    </Comp>
  );
}

export default function MatchLine({ match, onTeam, onMatch, showTournament = false }) {
  const { home, away, state, score, reason, utcTime } = match;
  const live = state === 'LIVE';
  const finished = state === 'FT' || state === 'CANCELED';
  const played = finished || live;

  return (
    <div
      onClick={onMatch}
      role={onMatch ? 'button' : undefined}
      className={`rounded-xl border border-ink-700 bg-ink-850/40 px-3 py-2.5 ${onMatch ? 'cursor-pointer transition-colors hover:border-emerald-500/50 hover:bg-ink-800' : ''}`}
    >
      {showTournament && match.tournament && (
        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 truncate">{match.tournament}</div>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide side={home} align="end" onTeam={onTeam} />
        <div className="flex flex-col items-center justify-center min-w-[64px]">
          {played ? (
            <span className="tabular-nums text-sm font-bold text-slate-100">{score || '—'}</span>
          ) : (
            <>
              <span className="tabular-nums text-sm font-bold text-slate-100">{clock(utcTime) || '—'}</span>
              <span className="text-[10px] text-slate-500">{shortDate(utcTime)}</span>
            </>
          )}
          {live && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {reason && reason !== 'Live' ? reason : 'Live'}
            </span>
          )}
          {finished && <span className="text-[9px] font-semibold uppercase text-slate-500">{reason || 'FT'}</span>}
        </div>
        <TeamSide side={away} align="start" onTeam={onTeam} />
      </div>
    </div>
  );
}
