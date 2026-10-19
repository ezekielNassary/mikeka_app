import Crest from './Crest.jsx';

export default function StandingsTable({ standings, legend, onTeam }) {
  if (!standings?.length) {
    return <p className="text-sm text-slate-500 text-center py-8">No standings available for this competition.</p>;
  }
  return (
    <div className="rounded-xl border border-ink-700 overflow-hidden">
      <div className="grid grid-cols-[28px_1fr_28px_28px_36px_38px] sm:grid-cols-[28px_1fr_32px_32px_32px_32px_40px_44px] gap-1 px-3 py-2 bg-ink-800/70 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <span>#</span>
        <span>Team</span>
        <span className="text-center">P</span>
        <span className="text-center hidden sm:block">W</span>
        <span className="text-center hidden sm:block">D</span>
        <span className="text-center hidden sm:block">L</span>
        <span className="text-center">GD</span>
        <span className="text-center">Pts</span>
      </div>
      <div className="divide-y divide-ink-700/70">
        {standings.map((r) => (
          <button
            key={r.id + r.idx}
            type="button"
            onClick={onTeam ? () => onTeam(r.id, r.name) : undefined}
            className={`w-full grid grid-cols-[28px_1fr_28px_28px_36px_38px] sm:grid-cols-[28px_1fr_32px_32px_32px_32px_40px_44px] gap-1 px-3 py-2 items-center text-left transition-colors ${onTeam ? 'cursor-pointer hover:bg-ink-800/60' : ''}`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1 self-stretch rounded-full" style={{ background: r.qualColor || 'transparent' }} />
              <span className="tabular-nums text-xs text-slate-500">{r.idx}</span>
            </span>
            <span className="flex items-center gap-2 min-w-0">
              <Crest src={r.logo} alt={r.name} size={22} />
              <span className="truncate text-sm font-semibold text-slate-200">{r.short || r.name}</span>
            </span>
            <span className="text-center tabular-nums text-xs text-slate-300">{r.played}</span>
            <span className="text-center tabular-nums text-xs text-slate-400 hidden sm:block">{r.wins}</span>
            <span className="text-center tabular-nums text-xs text-slate-400 hidden sm:block">{r.draws}</span>
            <span className="text-center tabular-nums text-xs text-slate-400 hidden sm:block">{r.losses}</span>
            <span className={`text-center tabular-nums text-xs ${r.gd > 0 ? 'text-emerald-400' : r.gd < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {r.gd > 0 ? `+${r.gd}` : r.gd}
            </span>
            <span className="text-center tabular-nums text-sm font-bold text-slate-100">{r.pts}</span>
          </button>
        ))}
      </div>
      {legend?.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 bg-ink-800/40 border-t border-ink-700">
          {legend.map((l) => (
            <span key={l.title} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              {l.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
