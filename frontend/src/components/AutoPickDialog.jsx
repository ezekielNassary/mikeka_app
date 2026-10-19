import { useEffect, useMemo } from 'react';
import { availableAutoMarkets, AUTO_MAX_PICKS } from '../lib/autoPick.js';

export default function AutoPickDialog({
  open,
  onClose,
  tournaments,
  selections,
  setSelections,
  target,
  setTarget,
  minOdds,
  setMinOdds,
  onGenerate,
}) {
  const markets = useMemo(() => availableAutoMarkets(tournaments), [tournaments]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Expand a whole-category selection into its explicit line/side keys.
  const expandCat = (cat) => {
    const info = markets.find((m) => m.cat === cat);
    const keys = [];
    if (!info) return keys;
    for (const l of info.lines) {
      if (cat === 'ou') keys.push(`${cat}:${l}:over`, `${cat}:${l}:under`);
      else keys.push(`${cat}:${l}`);
    }
    return keys;
  };

  const toggleCat = (cat, on) => {
    const rest = selections.filter((k) => k !== cat && !k.startsWith(`${cat}:`));
    setSelections(on ? [...rest, cat] : rest);
  };

  const toggleLine = (cat, line, on) => {
    const key = `${cat}:${line}`;
    let base = [...selections];
    if (base.includes(cat)) {
      base = base.filter((k) => k !== cat);
      for (const k of expandCat(cat)) if (!base.includes(k)) base.push(k);
    }
    if (on) { if (!base.includes(key)) base.push(key); }
    else base = base.filter((k) => k !== key);
    setSelections(base);
  };

  const toggleSide = (cat, line, side, on) => {
    const key = `${cat}:${line}:${side}`;
    let base = [...selections];
    if (base.includes(cat)) {
      base = base.filter((k) => k !== cat);
      for (const k of expandCat(cat)) if (!base.includes(k)) base.push(k);
    }
    if (on) { if (!base.includes(key)) base.push(key); }
    else base = base.filter((k) => k !== key);
    setSelections(base);
  };

  const selectAll = () => setSelections(markets.map((m) => m.cat));
  const clearAll = () => setSelections([]);

  const none = selections.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl animate-fade-in">
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-700">
          <div className="flex items-center gap-2">
            <span className="ai-gradient text-transparent bg-clip-text font-black text-lg">AI</span>
            <span className="font-bold text-slate-100">Auto Slip Builder</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-ink-800 text-slate-400 flex items-center justify-center cursor-pointer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">1. Pick your markets</span>
              <div className="flex items-center gap-2">
                <button onClick={selectAll} className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer">Select all</button>
                <button onClick={clearAll} className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer">Clear</button>
              </div>
            </div>

            {markets.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">Markets are still loading — try again in a moment.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {markets.map(({ cat, label, lines }) => {
                  const catOn = selections.includes(cat);
                  const anySub = lines.some(
                    (l) =>
                      selections.includes(`${cat}:${l}`) ||
                      selections.includes(`${cat}:${l}:over`) ||
                      selections.includes(`${cat}:${l}:under`)
                  );
                  const showLines = lines.length > 0 && (catOn || anySub);
                  const withSides = cat === 'ou';
                  return (
                    <div key={cat} className="rounded-xl border border-ink-700 bg-ink-850/60 px-3 py-2.5">
                      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={catOn}
                          ref={(el) => { if (el) el.indeterminate = !catOn && anySub; }}
                          onChange={(e) => toggleCat(cat, e.target.checked)}
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-200">{label}</span>
                        {lines.length > 0 && <span className="text-[10px] text-slate-500">({lines.length})</span>}
                      </label>

                      {showLines && (
                        <div className="mt-2 pl-6 space-y-1">
                          {withSides
                            ? lines.map((l) => (
                                <div key={l} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                  {['over', 'under'].map((side) => {
                                    const key = `${cat}:${l}:${side}`;
                                    return (
                                      <label key={side} className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={catOn || selections.includes(key)}
                                          onChange={(e) => toggleSide(cat, l, side, e.target.checked)}
                                          className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        {side === 'over' ? 'Over' : 'Under'} {l}
                                      </label>
                                    );
                                  })}
                                </div>
                              ))
                            : lines.map((l) => (
                                <label key={l} className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={catOn || selections.includes(`${cat}:${l}`)}
                                    onChange={(e) => toggleLine(cat, l, e.target.checked)}
                                    className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  {l} + GG/NG
                                </label>
                              ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">2. Set your targets</span>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <label className="rounded-xl border border-ink-700 bg-ink-850/60 px-3 py-2.5">
                <span className="block text-[11px] text-slate-400 mb-1">Number of matches</span>
                <input
                  type="number"
                  min={1}
                  max={AUTO_MAX_PICKS}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-transparent text-lg font-bold text-slate-100 focus:outline-none tabular-nums"
                />
              </label>
              <label className="rounded-xl border border-ink-700 bg-ink-850/60 px-3 py-2.5">
                <span className="block text-[11px] text-slate-400 mb-1">Minimum odds</span>
                <input
                  type="number"
                  step="0.01"
                  min={1.01}
                  value={minOdds}
                  onChange={(e) => setMinOdds(e.target.value)}
                  className="w-full bg-transparent text-lg font-bold text-slate-100 focus:outline-none tabular-nums"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Pick exact Over/Under lines too — you can take Over 1.5 without Under 1.5. We choose the safest odd per match and ease the odds floor if needed.
            </p>
          </section>
        </div>

        <footer className="px-5 py-4 border-t border-ink-700">
          <button
            onClick={onGenerate}
            disabled={none}
            className="relative w-full rounded-xl py-3 font-bold text-ink-950 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="ai-gradient absolute inset-0" />
            <span className="relative flex items-center justify-center gap-2">
              <svg className="ai-spark w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l1.9 5.2L19 9l-5.1 1.8L12 16l-1.9-5.2L5 9l5.1-1.8L12 2z" />
              </svg>
              {none ? 'Select at least one market' : 'Generate slip'}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}
