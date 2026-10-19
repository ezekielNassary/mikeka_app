// Statistical outlook builder — evidence-based market suggestions
function buildOutlook(hs, as, homeName, awayName) {
  if (!hs || !as) return { goals: [], corners: [], result: null, note: 'Insufficient data' };
  const n = hs.n + as.n;
  const goals = [];
  const conf = (sup, tot) => { const r = sup / tot; return r >= 0.9 ? 'HIGH' : r >= 0.7 ? 'MEDIUM' : 'LOW'; };
  const push = (market, sup, why) => goals.push({ market, support: `${sup}/${n}`, confidence: conf(sup, n), why });
  const o15 = hs.o15 + as.o15, o25 = hs.o25 + as.o25, o35 = hs.o35 + as.o35;
  const u25 = hs.u25 + as.u25, u35 = hs.u35 + as.u35, btts = hs.btts + as.btts;
  if (o15 / n >= 0.7) push('Over 1.5 goals', o15, `${o15} of the last ${n} combined matches exceeded 1.5 goals (${homeName}: ${hs.o15}/5, ${awayName}: ${as.o15}/5).`);
  if (o25 / n >= 0.7) push('Over 2.5 goals', o25, `${o25} of the last ${n} combined matches exceeded 2.5 goals (${homeName}: ${hs.o25}/5, ${awayName}: ${as.o25}/5).`);
  if (u25 / n >= 0.7) push('Under 2.5 goals', u25, `${u25} of the last ${n} combined matches stayed under 2.5 (${homeName}: ${hs.u25}/5, ${awayName}: ${as.u25}/5).`);
  if (o35 / n >= 0.7) push('Over 3.5 goals', o35, `${o35} of the last ${n} combined matches exceeded 3.5 goals.`);
  if (u35 / n >= 0.7) push('Under 3.5 goals', u35, `${u35} of the last ${n} combined matches stayed under 3.5.`);
  if (btts / n >= 0.7) push('BTTS (both teams to score)', btts, `Both teams scored in ${btts} of the last ${n} combined matches (${homeName}: ${hs.btts}/5, ${awayName}: ${as.btts}/5).`);
  const corners = [];
  if (hs.avgCornersTotal != null && as.avgCornersTotal != null) {
    const combined = (hs.avgCornersTotal + as.avgCornersTotal) / 2;
    const dataN = hs.cornersCount + as.cornersCount;
    for (const line of [7.5, 8.5, 9.5, 10.5]) {
      if (combined > line + 0.3 && dataN >= 6) {
        corners.push({ market: `Over ${line} corners`, support: `Combined recent avg ${combined.toFixed(1)}`, confidence: combined > line + 1.5 ? 'HIGH' : 'MEDIUM', why: `Average total corners is ${combined.toFixed(1)} (${homeName} ${hs.avgCornersTotal}, ${awayName} ${as.avgCornersTotal}) across ${dataN}/10 matches with corner data — above the ${line} line.` });
      }
    }
  }
  let result = null;
  const hPts = hs.wins * 3 + hs.draws, aPts = as.wins * 3 + as.draws;
  const gap = hPts - aPts;
  if (gap >= 5) result = { market: `${homeName} win`, confidence: 'MEDIUM', why: `${homeName} form (${hs.wins}W-${hs.draws}D-${hs.losses}L, ${hPts} pts) clearly stronger than ${awayName} (${as.wins}W-${as.draws}D-${as.losses}L, ${aPts} pts).` };
  else if (gap <= -5) result = { market: `${awayName} win`, confidence: 'MEDIUM', why: `${awayName} form (${as.wins}W-${as.draws}D-${as.losses}L, ${aPts} pts) clearly stronger than ${homeName} (${hs.wins}W-${hs.draws}D-${hs.losses}L, ${hPts} pts).` };
  else if (hs.draws >= 3 && as.draws >= 2) result = { market: 'Draw', confidence: 'LOW', why: `Both teams drew often recently (${homeName} ${hs.draws}/5, ${awayName} ${as.draws}/5).` };
  return { goals, corners, result };
}

export { buildOutlook };
