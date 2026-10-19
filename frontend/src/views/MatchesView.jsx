import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { fetchMatches } from '../lib/statsApi.js';
import { localDateKey, todayKey, formatDay } from '../lib/constants.js';
import Crest from '../components/stats/Crest.jsx';
import MatchLine from '../components/stats/MatchLine.jsx';
import MatchDetail from '../components/stats/MatchDetail.jsx';
import TeamDetail from '../components/stats/TeamDetail.jsx';
import { StatsLoader } from '../components/stats/Loaders.jsx';

const shiftKey = (key, delta) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return localDateKey(dt.getTime());
};

function DateBar({ date, setDate }) {
  const isToday = date === todayKey();
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setDate(shiftKey(date, -1))} className="w-9 h-9 rounded-xl border border-ink-700 hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer shrink-0" aria-label="Previous day">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <div className="flex-1 text-center">
        <p className="text-sm font-bold text-slate-100">{isToday ? 'Today' : formatDay(date)}</p>
        <p className="text-[10px] text-slate-500">{date}</p>
      </div>
      <button onClick={() => setDate(shiftKey(date, 1))} className="w-9 h-9 rounded-xl border border-ink-700 hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer shrink-0" aria-label="Next day">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
      {!isToday && (
        <button onClick={() => setDate(todayKey())} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-3 py-2 text-xs cursor-pointer shrink-0">Today</button>
      )}
    </div>
  );
}

function MatchList({ date, setDate, onMatch }) {
  const { data, loading, error, retry } = useAsync((signal) => fetchMatches(date, signal), [date]);

  return (
    <div className="space-y-5">
      <DateBar date={date} setDate={setDate} />

      {loading ? (
        <StatsLoader label="Loading matches…" />
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-rose-400 font-semibold mb-1">Could not load matches</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button onClick={retry} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-4 py-2 text-sm cursor-pointer">Retry</button>
        </div>
      ) : !data?.leagues?.length ? (
        <p className="text-sm text-slate-500 text-center py-16">No matches on {formatDay(date)}.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500"><span className="font-bold text-slate-300 tabular-nums">{data.total}</span> matches · {data.leagues.length} competitions</p>
          {data.leagues.map((l) => (
            <section key={l.id} className="animate-rise">
              <div className="flex items-center gap-2 border-b border-ink-700 pb-2 mb-2">
                <Crest src={l.logo} alt={l.name} size={22} />
                <h3 className="text-sm font-bold text-slate-200 truncate">{l.name}</h3>
                {l.ccode && <span className="text-[10px] uppercase text-slate-500">{l.ccode}</span>}
                <span className="ml-auto text-[11px] text-slate-500">{l.matches.length}</span>
              </div>
              <div className="space-y-2">
                {l.matches.map((m) => <MatchLine key={m.id} match={m} onMatch={() => onMatch(m)} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

export default function MatchesView({ onBack }) {
  const [date, setDate] = useState(() => todayKey());
  const [stack, setStack] = useState([{ type: 'list' }]);
  const cur = stack[stack.length - 1];
  const push = (r) => setStack((s) => [...s, r]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const atRoot = cur.type === 'list';
  const openTeam = (id) => { if (id) push({ type: 'team', id: String(id) }); };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 pb-28 animate-fade-in">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (atRoot ? onBack?.() : back())}
            className="w-9 h-9 rounded-xl border border-ink-700 hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Back"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-2xl">⚽</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Matches</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 ml-[46px]">Every match, every competition — tap one for team form &amp; stats.</p>
      </header>

      {cur.type === 'list' && <MatchList date={date} setDate={setDate} onMatch={(m) => push({ type: 'match', id: m.id })} />}
      {cur.type === 'match' && <MatchDetail matchId={cur.id} onBack={back} onTeam={openTeam} />}
      {cur.type === 'team' && <TeamDetail teamId={cur.id} onBack={back} onTeam={openTeam} />}
    </div>
  );
}
