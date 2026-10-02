// ============================================================================
// Database Migration Runner
// ============================================================================
// Reads and executes SQL migration scripts from database/migrations/
// ============================================================================

const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  const sqlPath = path.join(__dirname, 'migrations', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running database migration: 001_init.sql');
  await pool.query(sql);
  console.log('Migration completed successfully.');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrate;
