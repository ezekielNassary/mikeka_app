export function Skeleton({ className = '' }) {
  return <div className={`shimmer rounded-lg bg-ink-800 ${className}`} />;
}

export function SkeletonRow({ count = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850/40 px-3 py-2.5">
          <Skeleton className="w-7 h-7 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </div>
  );
}

export function StatsLoader({ label = 'Loading football data…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="relative w-16 h-16">
        <span className="absolute inset-0 rounded-full border-2 border-ink-700" />
        <span className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl animate-ball">⚽</span>
      </div>
      <p className="text-sm text-slate-400 font-semibold">{label}</p>
    </div>
  );
}
