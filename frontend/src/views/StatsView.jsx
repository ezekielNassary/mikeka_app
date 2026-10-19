import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { fetchLeagues } from '../lib/statsApi.js';
import LeagueList from '../components/stats/LeagueList.jsx';
import LeagueDetail from '../components/stats/LeagueDetail.jsx';
import TeamSearch from '../components/stats/TeamSearch.jsx';
import TeamDetail from '../components/stats/TeamDetail.jsx';
import { StatsLoader } from '../components/stats/Loaders.jsx';

function Root({ onLeague, onTeam }) {
  const [tab, setTab] = useState('leagues');
  const leagues = useAsync((signal) => fetchLeagues(signal), []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-ink-700 bg-ink-850/50 p-1">
        {[
          { key: 'leagues', label: 'Leagues & Standings' },
          { key: 'teams', label: 'Teams & Form' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
              tab === t.key ? 'bg-emerald-500 text-ink-950' : 'text-slate-300 hover:bg-ink-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'leagues' ? (
        leagues.loading ? (
          <StatsLoader label="Loading leagues…" />
        ) : leagues.error ? (
          <div className="py-16 text-center">
            <p className="text-rose-400 font-semibold mb-1">Could not load leagues</p>
            <p className="text-xs text-slate-500 mb-4">{leagues.error}</p>
            <button onClick={leagues.retry} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-4 py-2 text-sm cursor-pointer">Retry</button>
          </div>
        ) : (
          <LeagueList data={leagues.data} onSelect={onLeague} />
        )
      ) : (
        <TeamSearch onSelect={onTeam} />
      )}
    </div>
  );
}

export default function StatsView({ onBack }) {
  const [stack, setStack] = useState([{ type: 'root' }]);
  const cur = stack[stack.length - 1];
  const push = (r) => setStack((s) => [...s, r]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const openTeam = (id) => { if (id) push({ type: 'team', id: String(id) }); };
  const atRoot = cur.type === 'root';

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 pb-28 animate-fade-in">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (atRoot ? onBack?.() : back())}
            className="w-9 h-9 rounded-xl border border-ink-700 hover:bg-ink-800 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Back"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Football Statistics</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 ml-[46px]">Standings, results and team form — powered by FotMob.</p>
      </header>

      {cur.type === 'root' && <Root onLeague={(id, name) => push({ type: 'league', id, name })} onTeam={(id) => openTeam(id)} />}
      {cur.type === 'league' && <LeagueDetail leagueId={cur.id} onBack={back} onTeam={openTeam} />}
      {cur.type === 'team' && <TeamDetail teamId={cur.id} onBack={back} onTeam={openTeam} />}
    </div>
  );
}
