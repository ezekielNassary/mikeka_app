import { useEffect, useMemo, useState } from 'react';
import { useOddsLoader } from './hooks/useOddsLoader.js';
import { labelLeague, localDateKey, dateKeyOffset, todayKey, formatDay } from './lib/constants.js';
import { collectAutoPicks, AUTO_MAX_PICKS } from './lib/autoPick.js';
import DayFilter from './components/DayFilter.jsx';
import LeagueFilter from './components/LeagueFilter.jsx';
import MatchRow from './components/MatchRow.jsx';
import SlipPanel from './components/SlipPanel.jsx';
import AiButton from './components/AiButton.jsx';
import AutoPickDialog from './components/AutoPickDialog.jsx';
import Sidebar from './components/Sidebar.jsx';
import StatsView from './views/StatsView.jsx';
import MatchesView from './views/MatchesView.jsx';
import BookingLoadModal from './components/BookingLoadModal.jsx';
import { loadSlip, saveSlip } from './lib/slipStorage.js';

// SportyBet only lists matches that haven't kicked off yet, so there is never
// anything for past days. 'all' maps to today..tomorrow, 'week' to today..+7.
// A yyyy-mm-dd maps to that single day; the day presets map to their own day.
const resolveDateRange = (value) => {
  if (value === 'all') return { from: todayKey(), to: dateKeyOffset(1) };
  if (value === 'week') return { from: dateKeyOffset(0), to: dateKeyOffset(7) };
  if (value === 'today') return { key: todayKey() };
  if (value === 'tomorrow') return { key: dateKeyOffset(1) };
  return { key: value }; // a yyyy-mm-dd
};

const matchesDayRange = (ts, range) => {
  if (!range) return true;
  const k = localDateKey(ts);
  if (range.key) return k === range.key;
  return k >= range.from && k <= range.to;
};

export default function App() {
  const { tournaments, phase, loading, error, retry } = useOddsLoader();

  const [day, setDay] = useState('all');
  const [league, setLeague] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [picks, setPicks] = useState(() => loadSlip());
  const [slipOpen, setSlipOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [view, setView] = useState('home');
  const [navKey, setNavKey] = useState('home');
  const [navOpen, setNavOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const [autoOpen, setAutoOpen] = useState(false);
  const [autoMarkets, setAutoMarkets] = useState([]);
  const [autoTarget, setAutoTarget] = useState('20');
  const [autoMinOdds, setAutoMinOdds] = useState('1.2');

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    saveSlip(picks);
  }, [picks]);

  const range = resolveDateRange(day);
  const q = query.trim().toLowerCase();

  const base = useMemo(() => {
    return tournaments
      .map((t) => ({
        ...t,
        events: (t.events || []).filter((e) => {
          if (!matchesDayRange(e.startTimeUTC, range)) return false;
          if (q && !(`${e.homeTeam} ${e.awayTeam}`.toLowerCase().includes(q))) return false;
          return true;
        }),
      }))
      .filter((t) => t.events.length > 0)
      .sort((a, b) => (a.name > b.name ? 1 : -1));
  }, [tournaments, range, q, now]);

  const filtered = useMemo(
    () => (league === 'all' ? base : base.filter((t) => String(t.id) === league)),
    [base, league]
  );

  const leagueCounts = useMemo(() => {
    const m = new Map();
    for (const t of base) m.set(String(t.id), t.events.length);
    return m;
  }, [base]);

  const matchCount = filtered.reduce((n, t) => n + t.events.length, 0);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const selectView = (key) => {
    if (key === 'load-code') {
      setBookingOpen(true);
      setNavOpen(false);
      return;
    }
    setNavKey(key);
    // Sidebar 'stats-leagues' / 'stats-teams' both open the Statistics page,
    // which reads the active tab from navKey.
    setView(key.startsWith('stats') ? 'stats' : key);
    setNavOpen(false);
  };

  const onPick = (p) => {
    setPicks((prev) => {
      const same = prev.find((x) => x.matchKey === p.matchKey && x.market === p.market && x.outcome === p.outcome);
      if (same) return prev.filter((x) => x !== same);
      const rest = prev.filter((x) => x.matchKey !== p.matchKey);
      return [...rest, p];
    });
    setSlipOpen(true);
  };

  const applyBooking = (newPicks) => {
    if (!Array.isArray(newPicks) || !newPicks.length) return;
    setPicks((prev) => {
      const map = new Map(prev.map((p) => [p.matchKey, p]));
      for (const p of newPicks) map.set(p.matchKey, p);
      return [...map.values()];
    });
    setSlipOpen(true);
    flash('Booking code loaded into slip');
  };

  const runAutoPick = () => {
    const target = Math.max(1, Math.min(AUTO_MAX_PICKS, parseInt(autoTarget) || 20));
    const { picks: generated, eased } = collectAutoPicks(tournaments, {
      markets: autoMarkets,
      minOdds: autoMinOdds,
      target,
      filterEvent: (e, t) =>
        matchesDayRange(e.startTimeUTC, range) &&
        (league === 'all' || String(t.id) === league),
    });
    setPicks(generated);
    setSlipOpen(true);
    setAutoOpen(false);
    if (!generated.length) flash('Nothing matched your markets — try selecting more');
    else if (eased) flash(`Added ${generated.length} picks (odds floor eased a little)`);
    else flash(`Added ${generated.length} of ${target} picks`);
  };

  return (
    <div className="min-h-screen lg:pl-60">
      <Sidebar active={navKey} onSelect={selectView} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="pb-28">
        {view === 'home' && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setBookingOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-ink-950 font-bold px-4 py-2.5 text-sm shadow-lg shadow-emerald-500/15 cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                Load SportyBet Code
              </button>
              <button onClick={() => setAutoOpen(true)} disabled={!tournaments.length} className="flex items-center gap-2 rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-700 disabled:opacity-40 text-slate-200 font-bold px-4 py-2.5 text-sm cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7.1 18.2l1.9-5.8L4 8.8h6.1z" />
                </svg>
                Auto Pick
              </button>
              <button onClick={() => selectView('upcoming')} className="flex items-center gap-2 rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-700 text-slate-200 font-bold px-4 py-2.5 text-sm cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Upcoming
              </button>
              <button onClick={() => selectView('results')} className="flex items-center gap-2 rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-700 text-slate-200 font-bold px-4 py-2.5 text-sm cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 21h8m-4-4v4M6 4h12v6a6 6 0 01-12 0V4z" />
                </svg>
                Results
              </button>
              <button onClick={() => selectView('stats-leagues')} className="flex items-center gap-2 rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-700 text-slate-200 font-bold px-4 py-2.5 text-sm cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 20h18" />
                  <rect x="4" y="12" width="3.5" height="6" rx="1" />
                  <rect x="10.2" y="7" width="3.5" height="11" rx="1" />
                  <rect x="16.5" y="3" width="3.5" height="15" rx="1" />
                </svg>
                Stats
              </button>
            </div>
          </div>
        )}
      {view === 'stats' && (
        <StatsView
          onBack={() => selectView('home')}
          tab={navKey === 'stats-teams' ? 'teams' : 'leagues'}
          onTabChange={(t) => setNavKey(t === 'teams' ? 'stats-teams' : 'stats-leagues')}
        />
      )}
      {view === 'upcoming' && <MatchesView mode="upcoming" onBack={() => selectView('home')} />}
      {view === 'results' && <MatchesView mode="results" onBack={() => selectView('home')} />}

      {view !== 'home' && view !== 'stats' && view !== 'upcoming' && view !== 'results' && (
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-24 text-center">
          <p className="text-slate-400 font-semibold">Coming soon</p>
          <p className="text-sm text-slate-500 mt-1">Pick a section from the menu.</p>
        </main>
      )}

      {view === 'home' && (
        <>
      <header className="sticky top-0 z-30 border-b border-ink-700/70 bg-ink-950/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setNavOpen(true)}
              className="lg:hidden w-9 h-9 -ml-1 rounded-xl hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-xl">⚽</span>
            <span className="text-lg font-bold text-white tracking-tight">
              Mikeka<span className="text-emerald-400">.</span>
            </span>
          </div>
          <div className="relative flex-1 min-w-0 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team…"
              className="w-full rounded-xl bg-ink-800 border border-ink-700 pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-3 flex flex-wrap items-center gap-2">
          <DayFilter value={day} onChange={setDay} />
          <LeagueFilter tournaments={tournaments} counts={leagueCounts} value={league} onChange={setLeague} />
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-xs text-slate-500 hidden sm:block">
              <span className="font-bold text-slate-300 tabular-nums">{matchCount.toLocaleString()}</span> matches
              {range?.key ? <span> · {formatDay(range.key)}</span> : day === 'week' ? <span> · next 7 days</span> : <span> · today & tomorrow</span>}
            </div>
            <AiButton onClick={() => setAutoOpen(true)} disabled={!tournaments.length} />
          </div>
        </div>

      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
        {phase === 'error' ? (
          <div className="py-24 text-center">
            <p className="text-rose-400 font-semibold mb-2">Could not load odds</p>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button onClick={retry} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-5 py-2.5 cursor-pointer">
              Try again
            </button>
          </div>
        ) : phase === 'connecting' ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-[3px] border-ink-700 border-t-emerald-400 animate-spin" />
            <p className="text-sm text-slate-500 mt-4">Loading matches…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-slate-400 font-semibold mb-1">No matches{range?.key ? ` on ${formatDay(range.key)}` : day === 'week' ? ' in the next 7 days' : ' today or tomorrow'}</p>
            <p className="text-sm text-slate-500">
              {loading ? 'Still loading — more matches may appear.' : 'Try another day or clear your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {filtered.map((t) => (
              <section key={t.id}>
                <div className="flex items-baseline justify-between border-b border-ink-700 pb-2 mb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">{labelLeague(t.name, t.country)}</h2>
                  <span className="text-xs text-slate-500">{t.events.length} matches</span>
                </div>
                <div className="space-y-2">
                  {t.events.map((e) => {
                    const key = String(e.eventId);
                    const pick = picks.find((p) => p.matchKey === key);
                    return (
                      <MatchRow
                        key={key}
                        event={{ ...e, league: labelLeague(t.name, t.country) }}
                        expanded={expanded === key}
                        onToggle={() => setExpanded(expanded === key ? null : key)}
                        pick={pick}
                        onPick={onPick}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}


      </main>
        </>
      )}

      <SlipPanel
        picks={picks}
        open={slipOpen}
        onToggle={() => setSlipOpen((o) => !o)}
        onRemove={(p) => setPicks((prev) => prev.filter((x) => x !== p))}
        onClear={() => setPicks([])}
      />

      <AutoPickDialog
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        tournaments={tournaments}
        selections={autoMarkets}
        setSelections={setAutoMarkets}
        target={autoTarget}
        setTarget={setAutoTarget}
        minOdds={autoMinOdds}
        setMinOdds={setAutoMinOdds}
        onGenerate={runAutoPick}
      />
      <BookingLoadModal open={bookingOpen} onClose={() => setBookingOpen(false)} onApply={applyBooking} />

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-ink-800 border border-ink-700 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
      </div>
    </div>
  );
}
