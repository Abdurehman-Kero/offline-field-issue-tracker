/**
 * History Service - Append-only audit trail for reports
 */

function toApiHistory(row) {
  if (!row) return null;
  return {
    id: row.id.toString(),
    reportId: row.report_id,
    eventType: row.event_type,
    fromValue: row.from_value,
    toValue: row.to_value,
    note: row.note,
    actorRole: row.actor_role,
    source: row.source,
    occurredAt: row.occurred_at,
  };
}

async function addHistoryEntry(client, entry) {
  const query = `
    INSERT INTO report_history (
      report_id, event_type, from_value, to_value, note, actor_role, source, occurred_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, now()))
    RETURNING *;
  `;
  const values = [
    entry.reportId,
    entry.eventType,
    entry.fromValue || null,
    entry.toValue || null,
    entry.note || null,
    entry.actorRole,
    entry.source || 'server',
    entry.occurredAt || null,
  ];

  const res = await client.query(query, values);
  return toApiHistory(res.rows[0]);
}

async function getHistoryByReportId(db, reportId) {
  const query = `
    SELECT * FROM report_history
    WHERE report_id = $1
    ORDER BY id ASC;
  `;
  const res = await db.query(query, [reportId]);
  return res.rows.map(toApiHistory);
}

module.exports = {
  toApiHistory,
  addHistoryEntry,
  getHistoryByReportId,
};
