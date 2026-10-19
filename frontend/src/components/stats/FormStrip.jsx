import Crest from './Crest.jsx';

const RESULT_CLS = {
  W: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  D: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  L: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export function FormPill({ result, size = 24 }) {
  const cls = RESULT_CLS[result] || RESULT_CLS.D;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-bold ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {result || '?'}
    </span>
  );
}

// Horizontal last-5 strip with opponent crest + score.
export default function FormStrip({ form = [], size = 24, onTeam }) {
  if (!form.length) return <span className="text-xs text-slate-500">No recent form</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {form.map((f, i) => {
        const them = f.home?.isUs ? f.away : f.home;
        return (
          <button
            key={i}
            type="button"
            title={`${f.home?.name} ${f.score} ${f.away?.name}${f.league ? ` · ${f.league}` : ''}`}
            onClick={onTeam ? () => onTeam(them?.id, them?.name) : undefined}
            className={`flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-850/60 px-1.5 py-1 ${onTeam ? 'cursor-pointer hover:border-emerald-500/40' : ''}`}
          >
            <Crest src={them?.logo} alt={them?.name} size={size - 8} />
            <FormPill result={f.result} size={size} />
            <span className="tabular-nums text-[11px] font-semibold text-slate-300">{f.score}</span>
          </button>
        );
      })}
    </div>
  );
}
