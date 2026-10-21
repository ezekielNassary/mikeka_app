export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-[3px] border-ink-700" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-400 border-r-emerald-400/40 animate-spin" />
        <div className="absolute inset-3 rounded-full border-[2px] border-transparent border-b-blue-500/70 animate-[spin_1.6s_linear_infinite_reverse]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">⚽</span>
        </div>
      </div>
    </div>
  );
}
