const ICONS = {
  home: (
    <path d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" />
  ),
  slip: (
    <path d="M5 3h14a1 1 0 011 1v16l-4-2-4 2-4-2-4 2V4a1 1 0 011-1zM9 8h6M9 12h6" />
  ),
  live: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M6.3 6.3a8 8 0 000 11.4M17.7 6.3a8 8 0 010 11.4M3.5 3.5a12 12 0 000 17M20.5 3.5a12 12 0 010 17" />
    </>
  ),
  stats: (
    <>
      <path d="M3 20h18" />
      <rect x="4" y="12" width="3.5" height="6" rx="1" />
      <rect x="10.2" y="7" width="3.5" height="11" rx="1" />
      <rect x="16.5" y="3" width="3.5" height="15" rx="1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
      <path d="M8 14h.5M12 14h.5M16 14h.5M8 17.5h.5M12 17.5h.5" />
    </>
  ),
  matches: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.4l3.4 2.5-1.3 4h-4.2l-1.3-4z" />
      <path d="M12 3v4.4M4 9.6l4.7 3.4M20 9.6l-4.7 3.4M7.4 20l3.1-4.1M16.6 20l-3.1-4.1" />
    </>
  ),
};

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'matches', label: 'Matches', icon: 'matches' },
  { key: 'stats', label: 'Statistics', icon: 'stats' },
];

function SidebarItem({ item, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(item.key)}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
        active ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-300 hover:bg-ink-800 hover:text-slate-100'
      }`}
    >
      <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[item.icon]}
      </svg>
      <span>{item.label}</span>
    </button>
  );
}

export default function Sidebar({ active, onSelect, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 border-r border-ink-700 bg-ink-900 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-ink-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="text-lg font-bold text-white tracking-tight">
              Mikeka<span className="text-emerald-400">.</span>
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden w-8 h-8 rounded-lg hover:bg-ink-800 text-slate-400 flex items-center justify-center cursor-pointer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Menu</p>
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.key} item={item} active={active === item.key} onSelect={onSelect} />
          ))}
        </nav>

        <div className="p-3 border-t border-ink-700 shrink-0">
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Probabilities are model estimates. Bet responsibly.
          </p>
        </div>
      </aside>
    </>
  );
}
