import { tier, kickoffState } from '../lib/constants.js';

const MAIN_RE = /^(1x2|match result|full[- ]?time result)$/i;
const isMainMarket = (m) => !m.specifier && MAIN_RE.test((m.name || '').trim());
const STRONG_PROB = 0.7;

const shortLabel = (m) => `${m.name}${m.specifier ? ' ' + m.specifier : ''}`;

// All outcomes ranked by probability, best first. We surface the top 3,
// preferring the >70% ones and topping up with the next best when there aren't
// enough strong picks.
const collectTop = (markets, n = 3) => {
  const out = [];
  for (const m of markets) {
    const label = shortLabel(m);
    for (const o of m.outcomes || []) {
      if (typeof o.probability === 'number') out.push({ market: m, label, outcome: o });
    }
  }
  return out.sort((a, b) => b.outcome.probability - a.outcome.probability).slice(0, n);
};

const toPick = (event, market, label, o) => ({
  matchKey: String(event.eventId),
  eventId: event.eventId,
  homeTeam: event.homeTeam,
  awayTeam: event.awayTeam,
  league: event.league,
  startTime: event.startTime,
  startTimeUTC: event.startTimeUTC,
  status: event.status,
  market: label,
  outcome: o.desc,
  odds: o.odds,
  probability: o.probability,
  marketId: market.marketId,
  outcomeId: o.outcomeId,
  specifier: market.specifier || '',
});

function OddButton({ outcome, active, onClick, hint }) {
  return (
    <button
      onClick={onClick}
      className={`min-w-0 flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all cursor-pointer hover:brightness-125 ${active ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-ink-900' : ''} ${tier(outcome.probability)}`}
    >
      <span className="w-full truncate text-[11px] font-semibold leading-tight">{outcome.desc}</span>
      {hint && <span className="w-full truncate text-[9px] leading-tight opacity-60">{hint}</span>}
      <span className="tabular-nums font-bold text-sm leading-tight">
        {outcome.odds.toFixed(2)}
        <span className="ml-1 text-[10px] font-medium opacity-60">{Math.round(outcome.probability * 100)}%</span>
      </span>
    </button>
  );
}

function MarketRow({ market, event, pick, onPick, cols = 'grid-cols-2 sm:grid-cols-3' }) {
  const label = shortLabel(market);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 truncate">{label}</div>
      <div className={`grid ${cols} gap-1.5`}>
        {market.outcomes.map((o, i) => {
          const active = pick && pick.market === label && pick.outcome === o.desc;
          return (
            <OddButton key={i} outcome={o} active={active} onClick={() => onPick(toPick(event, market, label, o))} />
          );
        })}
      </div>
    </div>
  );
}

export default function MatchRow({ event, expanded, onToggle, pick, onPick }) {
  const markets = event.markets || [];
  const mainMarket = markets.find(isMainMarket) || markets[0];
  const strong = collectTop(markets, 3);
  const allStrong = strong.length === 3 && strong.every((s) => s.outcome.probability > STRONG_PROB);
  const kick = kickoffState(event.startTimeUTC, event.status);

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850/60 overflow-hidden animate-fade-in">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 sm:px-3.5 py-3 text-left cursor-pointer hover:bg-ink-800/50">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-slate-100 text-sm sm:text-base">{event.homeTeam}</span>
            <span className="text-slate-500 text-xs">vs</span>
            <span className="font-semibold text-slate-100 text-sm sm:text-base">{event.awayTeam}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
            <span>{event.startTime || 'TBD'}</span>
            {kick.live ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold uppercase text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
            ) : kick.ended ? (
              <span className="px-1.5 py-0.5 rounded bg-ink-700 text-slate-400 font-bold uppercase text-[9px]">Ended</span>
            ) : (
              event.status && event.status.toLowerCase() !== 'not start' && (
                <span className="text-slate-600">{event.status}</span>
              )
            )}
          </div>
        </div>
        {markets.length > 0 && (
          <span className="hidden sm:inline text-[10px] font-semibold text-slate-500 shrink-0">
            {expanded ? 'Less' : `${markets.length} markets`}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {kick.started && (
        <div className="px-3 sm:px-3.5 -mt-1 pb-2 text-[10px] text-slate-500">
          {kick.ended ? 'This match has ended.' : 'This match is live.'}
        </div>
      )}

      {/* Collapsed: top 3 picks — the >70% ones first, topped up if needed. */}
      {!expanded && (
        <div className="px-3 sm:px-3.5 pb-3">
          {strong.length > 0 ? (
            <>
              <div className={`text-[10px] uppercase tracking-wide mb-1 ${allStrong ? 'text-emerald-400' : 'text-slate-400'}`}>
                {allStrong ? 'Strong picks · over 70%' : 'Top picks'}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {strong.map((s, i) => {
                  const active = pick && pick.market === s.label && pick.outcome === s.outcome.desc;
                  return (
                    <OddButton
                      key={i}
                      outcome={s.outcome}
                      hint={s.label}
                      active={active}
                      onClick={() => onPick(toPick(event, s.market, s.label, s.outcome))}
                    />
                  );
                })}
              </div>
            </>
          ) : mainMarket ? (
            <MarketRow market={mainMarket} event={event} pick={pick} onPick={onPick} cols="grid-cols-3" />
          ) : null}
        </div>
      )}

      {/* Expanded: all markets. */}
      {expanded && (
        <div className="px-3 sm:px-3.5 pb-3 space-y-3">
          {markets.map((m, i) => (
            <MarketRow key={i} market={m} event={event} pick={pick} onPick={onPick} />
          ))}
        </div>
      )}

      {!expanded && markets.length > 0 && (
        <button
          onClick={onToggle}
          className="w-full text-center text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 py-2 border-t border-ink-700/60 cursor-pointer"
        >
          Show all {markets.length} markets
        </button>
      )}
    </div>
  );
}
