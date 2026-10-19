export default function SummaryStat({ label, value, tone = 'text-slate-100' }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850/50 px-3 py-2.5 text-center">
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
