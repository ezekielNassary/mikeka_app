import { Router } from 'express';
import { getPool } from '../db/index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM matches ORDER BY id DESC LIMIT 50');
    res.json({ matches: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
