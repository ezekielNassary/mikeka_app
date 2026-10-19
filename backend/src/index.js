import app from './app.js';
import { config } from './config.js';
import { initDb } from './db/index.js';

initDb();

app.listen(config.port, () => {
  console.log(`Mikeka API listening on http://localhost:${config.port} (${config.env})`);
});
