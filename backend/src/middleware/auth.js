import jwt from 'jsonwebtoken';
import { getPool } from '../db/index.js';
import { USAGE_LOG_LIMIT, config } from '../config.js';

const JWT_SECRET = config.jwtSecret;
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[auth] JWT_SECRET not set — using built-in fallback');
}

export function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required. Please log in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

export async function trackUsage(userId, action, detail) {
  try {
    const pool = getPool();
    if (!pool) return;
    await pool.query('INSERT INTO usage_log (user_id, action, detail) VALUES (?,?,?)', [userId, action, detail || null]);
    await pool.query(
      `DELETE FROM usage_log
       WHERE user_id = ? AND id NOT IN (
         SELECT id FROM (SELECT id FROM usage_log WHERE user_id = ? ORDER BY id DESC LIMIT ${USAGE_LOG_LIMIT}) t
       )`, [userId, userId]
    );
  } catch (e) {}
}

export function adminRequired(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  next();
}

export function superRequired(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin privileges required.' });
  }
  next();
}

export { JWT_SECRET };
