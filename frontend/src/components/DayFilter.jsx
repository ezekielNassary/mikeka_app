import { dateKeyOffset, todayKey, formatDay } from '../lib/constants.js';

const PRESETS = [
  { key: 'all', label: 'All days' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
];

export default function DayFilter({ value, onChange }) {
  const today = todayKey();
  const presetDate = {
    yesterday: dateKeyOffset(-1),
    today,
    tomorrow: dateKeyOffset(1),
  };

  const isPreset = PRESETS.some((p) => p.key === value);
  const custom = !isPreset && value ? value : '';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl bg-ink-800 p-1 border border-ink-700">
        {PRESETS.map((p) => {
          const active = value === p.key;
          const date = presetDate[p.key];
          return (
            <button
              key={p.key}
              onClick={() => onChange(p.key)}
              title={date ? formatDay(date) : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                active ? 'bg-emerald-500 text-ink-950' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 rounded-xl bg-ink-800 border border-ink-700 px-2.5 py-1.5">
        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <input
          type="date"
          value={custom}
          onChange={(e) => onChange(e.target.value || 'all')}
          className="bg-transparent text-xs text-slate-200 focus:outline-none [color-scheme:dark] cursor-pointer"
        />
      </div>

      {custom && (
        <button
          onClick={() => onChange('all')}
          className="text-xs font-semibold text-slate-400 hover:text-slate-100 px-2 py-1.5 cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}
