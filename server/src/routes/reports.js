const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const historyService = require('../services/historyService');
const pool = require('../db/pool');
const {
  createReportSchema,
  statusChangeSchema,
  editReportSchema,
} = require('../validation');
const { AppError } = require('../errors');

// Middleware to check X-Role header
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.header('X-Role');
    if (!role || (role !== 'field_worker' && role !== 'coordinator')) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          "Valid 'X-Role' header ('field_worker' or 'coordinator') is required."
        )
      );
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Role '${role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    req.userRole = role;
    next();
  };
}

// Any authenticated role
const anyRole = requireRole(['field_worker', 'coordinator']);

/**
 * POST /api/reports
 * Role: field_worker
 * Idempotent creation of reports from outbox
 */
router.post('/reports', requireRole(['field_worker', 'coordinator']), async (req, res, next) => {
  try {
    const parseResult = createReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      throw new AppError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', details);
    }

    const { isNew, report } = await reportService.createReport(parseResult.data, req.userRole);

    return res.status(isNew ? 201 : 200).json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports
 * Role: any
 * Search and paginated list
 */
router.get('/reports', anyRole, async (req, res, next) => {
  try {
    const { status, priority, category, search, page, limit } = req.query;
    const result = await reportService.getReports({
      status,
      priority,
      category,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/:id
 * Role: any
 */
router.get('/reports/:id', anyRole, async (req, res, next) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    if (!report) {
      throw new AppError(404, 'NOT_FOUND', `Report '${req.params.id}' not found.`);
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/reports/:id
 * Role: coordinator
 * Edit report details (priority, category, description, location)
 */
router.patch('/reports/:id', requireRole(['coordinator']), async (req, res, next) => {
  try {
    const parseResult = editReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      throw new AppError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', details);
    }

    const updated = await reportService.editReportDetails(
      req.params.id,
      parseResult.data,
      req.userRole
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/:id/status
 * Role: coordinator
 * Change report status (transition verification & version conflict checked)
 */
router.post('/reports/:id/status', requireRole(['coordinator']), async (req, res, next) => {
  try {
    const parseResult = statusChangeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      throw new AppError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', details);
    }

    const updated = await reportService.updateReportStatus(
      req.params.id,
      parseResult.data,
      req.userRole
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/:id/history
 * Role: any
 * Returns audit history entries oldest first
 */
router.get('/reports/:id/history', anyRole, async (req, res, next) => {
  try {
    const report = await reportService.getReportById(req.params.id);
    if (!report) {
      throw new AppError(404, 'NOT_FOUND', `Report '${req.params.id}' not found.`);
    }
    const history = await historyService.getHistoryByReportId(pool, report.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
