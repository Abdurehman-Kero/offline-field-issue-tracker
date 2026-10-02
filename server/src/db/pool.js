// Database Connection Pool
// Supports real PostgreSQL via DATABASE_URL, or embedded PGlite when none is configured.
// PGlite is an in-memory database — data is lost on server restart. Use PostgreSQL for production.

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let poolInstance = null;
let pgliteInstance = null;

// Initialize embedded PGlite and run the schema migration so tables exist.
// We only do this once; subsequent calls return the same instance.
async function getPglite() {
  if (pgliteInstance) return pgliteInstance;

  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.waitReady;

  // Run the schema so tables are present before any query hits the DB.
  const sqlPath = path.join(__dirname, 'migrations', '001_init.sql');
  const schemaSql = fs.readFileSync(sqlPath, 'utf8');
  await db.exec(schemaSql);

  pgliteInstance = db;
  return pgliteInstance;
}

// Wrap a PGlite instance to match the pg Pool client interface.
function makePgliteClient(db) {
  return {
    async query(text, params) {
      if (!params || params.length === 0) {
        const res = await db.exec(text);
        const last = Array.isArray(res) && res.length > 0 ? res[res.length - 1] : res;
        return {
          rows: (last && last.rows) || [],
          rowCount: (last && last.rows ? last.rows.length : (last && last.affectedRows)) || 0,
        };
      }
      const res = await db.query(text, params);
      return {
        rows: res.rows || [],
        rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
      };
    },
    // No-op — PGlite has no connection pool to release back to.
    release() {},
  };
}

const pool = {
  // Execute a parameterized SQL query.
  async query(text, params) {
    if (process.env.DATABASE_URL) {
      if (!poolInstance) {
        poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
      }
      return poolInstance.query(text, params);
    }

    // No DATABASE_URL — use embedded PGlite.
    const db = await getPglite();
    return makePgliteClient(db).query(text, params);
  },

  // Get a client for transactional operations (BEGIN / COMMIT / ROLLBACK).
  async getClient() {
    if (process.env.DATABASE_URL) {
      if (!poolInstance) {
        poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
      }
      return poolInstance.connect();
    }

    // No DATABASE_URL — return a PGlite-backed client.
    const db = await getPglite();
    return makePgliteClient(db);
  },

  // Gracefully close all open connections.
  async end() {
    if (poolInstance) {
      await poolInstance.end();
      poolInstance = null;
    }
    if (pgliteInstance) {
      await pgliteInstance.close();
      pgliteInstance = null;
    }
  },
};

module.exports = pool;
