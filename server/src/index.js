require('dotenv').config();
const app = require('./app');
const migrate = require('./db/migrate');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await migrate();
    app.listen(PORT, () => {
      console.log(`Issue Tracker API server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };
