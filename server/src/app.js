const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const healthRoutes = require('./routes/health');
const reportsRoutes = require('./routes/reports');
const { errorHandler } = require('./errors');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // Allow Vite preview and iframe integration
    frameguard: false,            // Allow rendering inside AI Studio preview iframe
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Mount API endpoints
app.use('/api', healthRoutes);
app.use('/api', reportsRoutes);

// Central error handler
app.use(errorHandler);

module.exports = app;
