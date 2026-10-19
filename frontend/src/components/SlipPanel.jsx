import { useState } from 'react';

const buildShareText = (picks, totalOdds) => {
  const lines = [
    '⚽ Mikeka Betting Slip',
    '',
    ...picks.map(
      (s, i) =>
        `${i + 1}. ${s.homeTeam} vs ${s.awayTeam}${s.startTime ? ` (${s.startTime})` : ''} — ${s.outcome} (${s.market}) @${Number(s.odds).toFixed(2)}${
          s.probability != null ? ` — ${Math.round(s.probability * 100)}% win chance` : ''
        }`
    ),
    '',
    `Total odds: ${Number(totalOdds).toFixed(2)}`,
    'Built with Mikeka',
  ];
  return lines.join('\n');
};

export default function SlipPanel({ picks, onRemove, onClear, open, onToggle }) {
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  const totalOdds = picks.reduce((p, s) => p * s.odds, 1);
  const combinedProb = picks.length ? picks.reduce((p, s) => p * (s.probability ?? 1), 1) : 0;

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const shareText = async () => {
    if (!picks.length) return flash('Add at least one pick first');
    try {
      await navigator.clipboard.writeText(buildShareText(picks, totalOdds));
      flash('Slip copied to clipboard');
    } catch {
      flash('Could not access clipboard');
    }
  };

  const downloadPdf = async () => {
    if (!picks.length) return flash('Nothing to export yet');
    setBusy('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      let y = 48;

      doc.setFont('helvetica', 'bold').setFontSize(16);
      doc.text('Mikeka Betting Slip', 48, y);
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(110);
      y += 16;
      doc.text(new Date().toLocaleString(), 48, y);

      y += 24;
      doc.setDrawColor(200).line(48, y - 8, W - 48, y - 8);
      doc.setTextColor(20).setFontSize(11);

      picks.forEach((s, i) => {
        if (y > 760) { doc.addPage(); y = 56; }
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${s.homeTeam} vs ${s.awayTeam}`, 48, y);
        doc.setFont('helvetica', 'normal').setTextColor(90);
        doc.text(`@${Number(s.odds).toFixed(2)}`, W - 100, y, { align: 'right' });
        y += 14;
        const meta = [s.startTime, s.market].filter(Boolean).join('  ·  ');
        if (meta) { doc.text(meta, 60, y); y += 13; }
        const prob = s.probability != null ? `  —  ${Math.round(s.probability * 100)}% win chance` : '';
        doc.text(`${s.outcome}${prob}`, 60, y);
        doc.setTextColor(20);
        y += 18;
      });

      doc.setDrawColor(200).line(48, y - 8, W - 48, y - 8);
      y += 8;
      doc.setFont('helvetica', 'bold').setFontSize(12);
      doc.text(`Total odds: ${totalOdds.toFixed(2)}`, 48, y);
      doc.text(`Combined win chance: ~${Math.round(combinedProb * 100)}%`, W - 48, y, { align: 'right' });
      y += 26;
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(140);
      doc.text('Probabilities are model estimates based on bookmaker odds — bet responsibly.', 48, y);

      doc.save(`mikeka-slip-${Date.now()}.pdf`);
    } catch (e) {
      flash('PDF export failed: ' + e.message);
    }
    setBusy('');
  };

  const createOnSportyBet = async () => {
    if (!picks.length) return flash('Add at least one pick first');
    const sportyPicks = picks.filter((p) => p.eventId && p.marketId && p.outcomeId);
    if (!sportyPicks.length) return flash('No picks with SportyBet IDs');
    setBusy('sporty');
    try {
      const r = await fetch('/api/odds/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: sportyPicks.map((p) => ({
            eventId: p.eventId,
            marketId: p.marketId,
            outcomeId: p.outcomeId,
            specifier: p.specifier || '',
          })),
        }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      const url = d.shareURL || `https://www.sportybet.com/tz/?shareCode=${d.shareCode}`;
      window.open(url, '_blank', 'noopener');
      flash(`SportyBet slip created: ${d.shareCode}`);
    } catch (e) {
      flash('SportyBet slip failed: ' + e.message);
    }
    setBusy('');
  };

  return (
    <>
      {!open && picks.length > 0 && (
        <button
          onClick={onToggle}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold px-5 py-3 shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <span className="text-lg">🎟️</span>
          <span>{picks.length} pick{picks.length > 1 ? 's' : ''}</span>
          <span className="tabular-nums opacity-80">@ {totalOdds.toFixed(2)}</span>
        </button>
      )}

      {open && (
        <aside className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] max-h-[80vh] flex flex-col rounded-2xl border border-ink-700 bg-ink-900/95 backdrop-blur shadow-2xl animate-fade-in">
          <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎟️</span>
              <span className="font-bold text-slate-100">Bet Slip</span>
              <span className="text-xs text-slate-500">{picks.length} pick{picks.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              {picks.length > 0 && (
                <button onClick={onClear} className="text-xs font-semibold text-slate-400 hover:text-rose-400 px-2 py-1 cursor-pointer">
                  Clear
                </button>
              )}
              <button
                onClick={onToggle}
                title="Hide slip"
                className="w-7 h-7 rounded-lg hover:bg-ink-800 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {picks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10 px-4">
                Tap any odd to add it to your slip. One pick per match.
              </p>
            ) : (
              picks.map((p) => (
                <div key={p.matchKey} className="rounded-xl border border-ink-700 bg-ink-850/60 p-2.5 animate-fade-in">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{p.homeTeam} vs {p.awayTeam}</p>
                      {p.startTime && (
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                          {p.startTime}
                        </p>
                      )}
                      <p className="text-[11px] text-emerald-400 truncate">{p.outcome} · {p.market}</p>
                    </div>
                    <button onClick={() => onRemove(p)} className="text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-slate-500">{Math.round((p.probability ?? 0) * 100)}% chance</span>
                    <span className="text-sm font-bold tabular-nums text-slate-100">@{p.odds.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <footer className="border-t border-ink-700 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Total odds</span>
              <span className="text-xl font-bold tabular-nums text-emerald-400">{picks.length ? totalOdds.toFixed(2) : '0.00'}</span>
            </div>
            {picks.length > 0 && (
              <div className="flex items-center justify-between mb-3 text-[11px] text-slate-500">
                <span>Combined win chance</span>
                <span className="font-semibold">~{Math.round(combinedProb * 100)}%</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={createOnSportyBet}
                disabled={!picks.length || busy === 'sporty'}
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 font-bold py-2 text-[11px] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
                {busy === 'sporty' ? 'Creating…' : 'SportyBet'}
              </button>
              <button
                onClick={shareText}
                disabled={!picks.length}
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold py-2 text-[11px] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
                Share
              </button>
              <button
                onClick={downloadPdf}
                disabled={!picks.length || busy === 'pdf'}
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold py-2 text-[11px] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                </svg>
                {busy === 'pdf' ? 'Making…' : 'PDF'}
              </button>
            </div>

            {toast && (
              <p className="text-[11px] text-center mt-2 text-emerald-400 font-semibold">{toast}</p>
            )}
            <p className="text-[10px] text-slate-600 text-center mt-2">Probabilities are model estimates. Bet responsibly.</p>
          </footer>
        </aside>
      )}
    </>
  );
}
