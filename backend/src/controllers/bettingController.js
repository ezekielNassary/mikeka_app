import { getPool } from '../db/index.js';

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'SL' + s;
};

function parseSlip(row) {
  let selections = [];
  try { selections = typeof row.selections === 'string' ? JSON.parse(row.selections) : row.selections || []; } catch { /* keep [] */ }
  return { ...row, selections };
}

export async function saveSlip(req, res) {
  try {
    const pool = getPool();
    const userId = req.user.id;
    const name = String(req.body.name || '').trim().slice(0, 120) || null;
    const raw = Array.isArray(req.body.selections) ? req.body.selections : [];

    const selections = [];
    const seen = new Set();
    for (const s of raw) {
      if (!s || !s.homeTeam || !s.awayTeam || !s.market || !s.outcome) {
        return res.status(400).json({ error: 'Each pick needs teams, market and outcome' });
      }
      const odds = Number(s.odds);
      if (!Number.isFinite(odds) || odds <= 1.0) return res.status(400).json({ error: 'Each pick needs odds > 1.0' });
      const key = s.matchKey || `${s.homeTeam}|${s.awayTeam}|${s.market}|${s.outcome}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pick = {
        homeTeam: String(s.homeTeam).trim().slice(0, 120),
        awayTeam: String(s.awayTeam).trim().slice(0, 120),
        league: String(s.league || '').trim().slice(0, 120),
        startTime: s.startTime || s.startTimeUTC || null,
        market: String(s.market).trim().slice(0, 200),
        outcome: String(s.outcome).trim().slice(0, 200),
        odds: odds.toFixed(2),
        probability: s.probability != null ? Number(s.probability) : null,
        matchKey: key,
        eventId: s.eventId || null,
        marketId: s.marketId || null,
        outcomeId: s.outcomeId || null,
        specifier: s.specifier || '',
      };
      selections.push(pick);
    }
    if (!selections.length) return res.status(400).json({ error: 'No valid picks to save' });

    const totalOdds = selections.reduce((p, x) => p * Number(x.odds), 1);
    let shareCode;
    for (let i = 0; i < 5; i++) {
      shareCode = genCode();
      try {
        await pool.query('INSERT INTO user_slips (user_id, name, selections, total_odds, share_code) VALUES (?,?,?,?,?)',
          [userId, name, JSON.stringify(selections), totalOdds.toFixed(2), shareCode]);
        break;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') shareCode = null; else throw e;
      }
    }
    if (!shareCode) return res.status(500).json({ error: 'Could not generate unique share code' });

    const [rows] = await pool.query('SELECT * FROM user_slips WHERE share_code=? LIMIT 1', [shareCode]);
    res.json({ success: true, slip: parseSlip(rows[0]) });
  } catch (e) {
    console.error('[betting:saveSlip]', e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function listSlips(req, res) {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM user_slips WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    res.json({ slips: rows.map(parseSlip) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getSlipByCode(req, res) {
  try {
    const pool = getPool();
    const code = (req.params.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'code required' });
    const [rows] = await pool.query('SELECT * FROM user_slips WHERE share_code=? LIMIT 1', [code]);
    if (!rows.length) return res.status(404).json({ error: 'Slip not found' });
    res.json({ slip: parseSlip(rows[0]) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteSlip(req, res) {
  try {
    const pool = getPool();
    const id = req.params.id;
    const [rows] = await pool.query('SELECT user_id FROM user_slips WHERE id=? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Slip not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your slip' });
    await pool.query('DELETE FROM user_slips WHERE id=?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
