import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const app = require('./server/src/app.js');
const migrate = require('./server/src/db/migrate.js');
const pool = require('./server/src/db/pool.js');
const seed = require('./server/src/db/seed.js');

const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  try {
    // 1. Run database migrations
    await migrate();

    // 2. Check if reports table is empty, seed if empty
    try {
      const checkRes = await pool.query('SELECT COUNT(*) FROM reports;');
      const count = parseInt(checkRes.rows[0].count, 10);
      if (count === 0) {
        console.log('Database empty, seeding demo reports...');
        await seed();
      }
    } catch (seedErr: any) {
      console.warn('Initial seed check error:', seedErr?.message);
    }

    // 3. Mount Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        root: path.resolve(__dirname, 'client'),
        configFile: path.resolve(__dirname, 'client/vite.config.js'),
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // Production static file serving
      const distPath = path.resolve(__dirname, 'client/dist');
      app.use(express.static(distPath));
      app.get('*', (req: express.Request, res: express.Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
