// Copies the built frontend (frontend/dist) into the backend's static folder
// (backend/public) so the Express server can host the SPA on the same port.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'frontend', 'dist');
const dest = path.join(root, 'backend', 'public');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('[copy-dist] frontend/dist not found — run the frontend build first');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[copy-dist] ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
