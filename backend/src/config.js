import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always load backend/.env regardless of the process working directory (pm2
// may start the app from the repo root).
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'mikeka_db';
const USER_TZ = 'Africa/Dar_es_Salaam';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CACHE_DIR = process.env.CACHE_DIR || path.join(__dirname, '..', 'cache');
const USAGE_LOG_LIMIT = Number(process.env.USAGE_LOG_LIMIT) || 10;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

export const config = {
  port: Number(process.env.PORT) || 4000,
  env: process.env.NODE_ENV || 'development',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  dbHost: DB_HOST,
  dbPort: DB_PORT,
  dbUser: DB_USER,
  dbPassword: DB_PASSWORD,
  dbName: DB_NAME,
  userTz: USER_TZ,
  ua: UA,
  cacheDir: CACHE_DIR,
  usageLogLimit: USAGE_LOG_LIMIT,
  jwtSecret: process.env.JWT_SECRET || 'mikeka-secret-2026',
};

export { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, USER_TZ, UA, CACHE_DIR, USAGE_LOG_LIMIT };

export function fmtLocal(ts, withDate = true) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const opts = { timeZone: USER_TZ, hour: '2-digit', minute: '2-digit', hour12: false };
  if (withDate) { opts.day = '2-digit'; opts.month = '2-digit'; opts.year = 'numeric'; }
  return new Intl.DateTimeFormat('en-GB', opts).format(d).replace(',', '');
}

export function fmtLocalDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: USER_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = t => (parts.find(p => p.type === t) || {}).value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function toEpoch(v) {
  if (v == null) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.getTime();
}
