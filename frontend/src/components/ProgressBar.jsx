export default function ProgressBar({ percent, label, sublabel, className = '' }) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        {typeof percent === 'number' && (
          <span className="text-xs font-bold tabular-nums text-emerald-400">{percent}%</span>
        )}
      </div>
      <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
        {typeof percent === 'number' ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 animate-progress-indeterminate" />
        )}
      </div>
      {sublabel && <p className="mt-1.5 text-[11px] text-slate-500">{sublabel}</p>}
    </div>
  );
}
