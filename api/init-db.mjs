import { ensureSchema } from './lib/db.mjs';

async function init() {
  try {
    await ensureSchema();
    console.log('Database schema initialized successfully');
  } catch (e) {
    console.log('Schema init skipped (no database URL configured):', e.message);
  }
}

init();
