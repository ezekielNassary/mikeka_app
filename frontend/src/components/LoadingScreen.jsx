import ProgressBar from './ProgressBar.jsx';

export default function LoadingScreen({ phase, percent, loadedPages, totalPages, loadedEvents, totalEvents }) {
  const connecting = phase === 'connecting';
  const label = connecting ? 'Connecting to SportyBet…' : 'Loading match odds';
  const sublabel = connecting
    ? 'Fetching live fixtures and markets'
    : `Page ${loadedPages} of ${totalPages} · ${loadedEvents.toLocaleString()}${totalEvents ? ` / ${totalEvents.toLocaleString()}` : ''} matches`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 rounded-full border-[3px] border-ink-700" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-400 border-r-emerald-400/40 animate-spin" />
          <div className="absolute inset-3 rounded-full border-[2px] border-transparent border-b-blue-500/70 animate-[spin_1.6s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">⚽</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Mikeka</h1>
        <p className="text-sm text-slate-400 mb-7">Live odds, beautifully organized.</p>

        <ProgressBar percent={connecting ? 0 : percent} label={label} sublabel={sublabel} />

        {connecting && (
          <div className="mt-8 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-xl shimmer" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
