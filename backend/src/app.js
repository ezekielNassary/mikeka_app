import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(__dirname, '..', 'public');
const indexHtml = path.join(clientDir, 'index.html');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (config.env !== 'test') app.use(morgan('dev'));

app.use('/api', routes);

// Serve the built React SPA (copied to backend/public by `pnpm build`) for all
// non-API routes, so the whole app runs on this single port.
if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
} else {
  app.get('/', (req, res) => res.json({ name: 'Mikeka API', version: '1.0.0' }));
  console.warn('[app] built client not found — run "pnpm build" to serve the app from this port');
}

app.use(notFound);
app.use(errorHandler);

export default app;
