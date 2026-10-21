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
  upcoming: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  results: (
    <>
      <path d="M8 21h8m-4-4v4M6 4h12v6a6 6 0 01-12 0V4z" />
      <path d="M6 6H4a2 2 0 000 4h2M18 6h2a2 2 0 010 4h-2" />
    </>
  ),
  leagues: (
    <>
      <path d="M4 5h16v4a4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 01-4 4 4 4 0 01-4-4V5z" />
      <path d="M8 13H6M18 13h-2M12 17h.01" />
    </>
  ),
  teams: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0112 0M16 11a3 3 0 100-6M21 20a5 5 0 00-4-4.9" />
    </>
  ),
};

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'upcoming', label: 'Upcoming Matches', icon: 'upcoming' },
  { key: 'results', label: 'Results', icon: 'results' },
  {
    key: 'stats',
    label: 'Statistics',
    icon: 'stats',
    children: [
      { key: 'stats-leagues', label: 'Leagues & Standings', icon: 'leagues' },
      { key: 'stats-teams', label: 'Teams & Forms', icon: 'teams' },
    ],
  },
];

function SidebarItem({ item, active, onSelect, nested = false }) {
  return (
    <button
      onClick={() => onSelect(item.key)}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
        nested ? 'pl-9 text-[13px]' : ''
      } ${active ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-300 hover:bg-ink-800 hover:text-slate-100'}`}
    >
      <svg className={`${nested ? 'w-4 h-4' : 'w-4.5 h-4.5'} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[item.icon]}
      </svg>
      <span className="truncate">{item.label}</span>
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
          {NAV_ITEMS.map((item) => {
            const groupActive = item.children?.some((c) => c.key === active);
            return (
              <div key={item.key} className="space-y-1">
                <SidebarItem item={item} active={active === item.key || groupActive} onSelect={onSelect} />
                {item.children && (
                  <div className="space-y-1">
                    {item.children.map((c) => (
                      <SidebarItem key={c.key} item={c} active={active === c.key} onSelect={onSelect} nested />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
