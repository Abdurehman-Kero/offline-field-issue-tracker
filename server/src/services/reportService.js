const pool = require('../db/pool');
const { canTransition } = require('../workflow');
const { AppError } = require('../errors');
const historyService = require('./historyService');

function toApiReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    category: row.category,
    description: row.description,
    locationText: row.location_text,
    latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
    priority: row.priority,
    status: row.status,
    reporterName: row.reporter_name,
    assignedTo: row.assigned_to,
    reportedAt: row.reported_at ? new Date(row.reported_at).toISOString() : null,
    receivedAt: row.received_at ? new Date(row.received_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    version: row.version,
    possibleDuplicateOf: row.possible_duplicate_of,
  };
}

async function createReport(data, role) {
  const client = await pool.getClient();
  try {
    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO reports (
        client_id, category, description, location_text,
        latitude, longitude, priority, status, reporter_name, reported_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (client_id) DO NOTHING
      RETURNING *;
    `;

    const values = [
      data.clientId,
      data.category,
      data.description,
      data.locationText,
      data.latitude !== undefined ? data.latitude : null,
      data.longitude !== undefined ? data.longitude : null,
      data.priority || 'Medium',
      data.status || 'Submitted',
      data.reporterName,
      data.reportedAt,
    ];

    const insertRes = await client.query(insertSql, values);

    // If row was not inserted, report already exists (idempotency check)
    if (insertRes.rows.length === 0) {
      const existingRes = await client.query('SELECT * FROM reports WHERE client_id = $1;', [
        data.clientId,
      ]);
      await client.query('COMMIT');
      return {
        isNew: false,
        report: toApiReport(existingRes.rows[0]),
      };
    }

    let createdReport = insertRes.rows[0];

    // Store unsent client history events
    if (Array.isArray(data.history) && data.history.length > 0) {
      for (const ev of data.history) {
        await historyService.addHistoryEntry(client, {
          reportId: createdReport.id,
          eventType: ev.eventType,
          fromValue: ev.fromValue,
          toValue: ev.toValue,
          note: ev.note,
          actorRole: ev.actorRole || 'field_worker',
          source: 'client',
          occurredAt: ev.occurredAt,
        });
      }
    } else {
      // Add initial CREATED event if not supplied
      await historyService.addHistoryEntry(client, {
        reportId: createdReport.id,
        eventType: 'CREATED',
        fromValue: null,
        toValue: 'Draft',
        note: 'Report created locally on device',
        actorRole: 'field_worker',
        source: 'client',
      });
      await historyService.addHistoryEntry(client, {
        reportId: createdReport.id,
        eventType: 'SUBMITTED',
        fromValue: 'Draft',
        toValue: 'Submitted',
        note: 'Report queued for synchronization',
        actorRole: 'field_worker',
        source: 'client',
      });
    }

    // Add server SYNCED event
    await historyService.addHistoryEntry(client, {
      reportId: createdReport.id,
      eventType: 'SYNCED',
      fromValue: null,
      toValue: 'Submitted',
      note: 'Report received and saved by server',
      actorRole: 'system',
      source: 'server',
    });

    // Check for possible duplicate:
    // Same category, same normalized location text, reported within 24 hours, not Rejected
    const dupSql = `
      SELECT id FROM reports
      WHERE id != $1
        AND category = $2
        AND lower(trim(location_text)) = lower(trim($3))
        AND status != 'Rejected'
        AND reported_at >= ($4::timestamptz - interval '24 hours')
        AND reported_at <= ($4::timestamptz + interval '24 hours')
      ORDER BY reported_at ASC
      LIMIT 1;
    `;
    const dupRes = await client.query(dupSql, [
      createdReport.id,
      createdReport.category,
      createdReport.location_text,
      createdReport.reported_at,
    ]);

    if (dupRes.rows.length > 0) {
      const matchId = dupRes.rows[0].id;
      const updateDupSql = `
        UPDATE reports
        SET possible_duplicate_of = $1
        WHERE id = $2
        RETURNING *;
      `;
      const updated = await client.query(updateDupSql, [matchId, createdReport.id]);
      createdReport = updated.rows[0];

      await historyService.addHistoryEntry(client, {
        reportId: createdReport.id,
        eventType: 'DUPLICATE_FLAGGED',
        fromValue: null,
        toValue: matchId,
        note: `Flagged as possible duplicate of earlier report (${matchId})`,
        actorRole: 'system',
        source: 'server',
      });
    }

    await client.query('COMMIT');

    return {
      isNew: true,
      report: toApiReport(createdReport),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getReports({ status, priority, category, search, page = 1, limit = 50 }) {
  const offset = (Math.max(1, page) - 1) * limit;
  const whereClauses = [];
  const params = [];
  let paramIdx = 1;

  if (status) {
    whereClauses.push(`status = $${paramIdx++}`);
    params.push(status);
  }
  if (priority) {
    whereClauses.push(`priority = $${paramIdx++}`);
    params.push(priority);
  }
  if (category) {
    whereClauses.push(`category = $${paramIdx++}`);
    params.push(category);
  }
  if (search) {
    whereClauses.push(`(
      description ILIKE $${paramIdx} OR
      location_text ILIKE $${paramIdx} OR
      reporter_name ILIKE $${paramIdx}
    )`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) FROM reports ${whereSql};`;
  const countRes = await pool.query(countSql, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const querySql = `
    SELECT * FROM reports
    ${whereSql}
    ORDER BY reported_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  params.push(limit, offset);

  const listRes = await pool.query(querySql, params);
  const items = listRes.rows.map(toApiReport);

  return {
    items,
    page: Number(page),
    limit: Number(limit),
    total,
  };
}

async function getReportById(id) {
  // Allow lookup by UUID id or client_id
  const query = `
    SELECT * FROM reports
    WHERE id::text = $1 OR client_id::text = $1
    LIMIT 1;
  `;
  const res = await pool.query(query, [id]);
  if (res.rows.length === 0) {
    return null;
  }
  return toApiReport(res.rows[0]);
}

async function updateReportStatus(id, { toStatus, note, assignedTo, version }, role) {
  if (role !== 'coordinator') {
    throw new AppError(403, 'FORBIDDEN', "Only coordinators can update report status.");
  }

  const current = await getReportById(id);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', `Report with ID '${id}' not found.`);
  }

  const check = canTransition(current.status, toStatus, role, { note, assignedTo });
  if (!check.ok) {
    throw new AppError(422, 'INVALID_TRANSITION', check.message);
  }

  const client = await pool.getClient();
  try {
    await client.query('BEGIN');

    const updateSql = `
      UPDATE reports
      SET status = $1,
          assigned_to = COALESCE($2, assigned_to),
          version = version + 1,
          updated_at = now()
      WHERE id = $3 AND version = $4
      RETURNING *;
    `;
    const res = await client.query(updateSql, [toStatus, assignedTo || null, current.id, version]);

    if (res.rows.length === 0) {
      // Version conflict check
      const fresh = await client.query('SELECT version FROM reports WHERE id = $1', [current.id]);
      await client.query('ROLLBACK');
      if (fresh.rows.length > 0) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Conflict: report was modified by another user (current version: ${fresh.rows[0].version}, provided: ${version}). Please reload latest data.`
        );
      }
      throw new AppError(404, 'NOT_FOUND', `Report '${id}' not found.`);
    }

    const updated = res.rows[0];

    await historyService.addHistoryEntry(client, {
      reportId: updated.id,
      eventType: 'STATUS_CHANGED',
      fromValue: current.status,
      toValue: toStatus,
      note: note || (assignedTo ? `Assigned to ${assignedTo}` : null),
      actorRole: role,
      source: 'server',
    });

    await client.query('COMMIT');
    return toApiReport(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function editReportDetails(id, updates, role) {
  if (role !== 'coordinator') {
    throw new AppError(403, 'FORBIDDEN', "Only coordinators can edit report details.");
  }

  const current = await getReportById(id);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', `Report with ID '${id}' not found.`);
  }

  if (current.status === 'Resolved' || current.status === 'Rejected') {
    throw new AppError(
      422,
      'REPORT_LOCKED',
      `Cannot edit details of a report that is ${current.status}.`
    );
  }

  const client = await pool.getClient();
  try {
    await client.query('BEGIN');

    const updateSql = `
      UPDATE reports
      SET category = COALESCE($1, category),
          description = COALESCE($2, description),
          location_text = COALESCE($3, location_text),
          latitude = CASE WHEN $4::numeric IS NOT NULL THEN $4::numeric ELSE latitude END,
          longitude = CASE WHEN $5::numeric IS NOT NULL THEN $5::numeric ELSE longitude END,
          priority = COALESCE($6, priority),
          version = version + 1,
          updated_at = now()
      WHERE id = $7 AND version = $8
      RETURNING *;
    `;

    const res = await client.query(updateSql, [
      updates.category || null,
      updates.description || null,
      updates.locationText || null,
      updates.latitude !== undefined ? updates.latitude : null,
      updates.longitude !== undefined ? updates.longitude : null,
      updates.priority || null,
      current.id,
      updates.version,
    ]);

    if (res.rows.length === 0) {
      const fresh = await client.query('SELECT version FROM reports WHERE id = $1', [current.id]);
      await client.query('ROLLBACK');
      if (fresh.rows.length > 0) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Conflict: report was modified by another user (current version: ${fresh.rows[0].version}, provided: ${updates.version}). Please reload latest data.`
        );
      }
      throw new AppError(404, 'NOT_FOUND', `Report '${id}' not found.`);
    }

    const updated = res.rows[0];

    // Compute changed summary
    const changes = [];
    if (updates.category && updates.category !== current.category) {
      changes.push(`Category: ${current.category} -> ${updates.category}`);
    }
    if (updates.priority && updates.priority !== current.priority) {
      changes.push(`Priority: ${current.priority} -> ${updates.priority}`);
    }
    if (updates.locationText && updates.locationText !== current.locationText) {
      changes.push(`Location updated`);
    }
    if (updates.description && updates.description !== current.description) {
      changes.push(`Description updated`);
    }

    await historyService.addHistoryEntry(client, {
      reportId: updated.id,
      eventType: 'DETAILS_EDITED',
      fromValue: current.category,
      toValue: updated.category,
      note: changes.join('; ') || 'Details updated by coordinator',
      actorRole: role,
      source: 'server',
    });

    await client.query('COMMIT');
    return toApiReport(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  toApiReport,
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  editReportDetails,
};
