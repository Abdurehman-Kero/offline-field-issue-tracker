/**
 * Status workflow rules for reports
 * Central source of truth for all status transitions and permission checks.
 */

const VALID_STATUSES = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];

const TRANSITIONS = [
  { from: 'Draft', to: 'Submitted', role: 'field_worker', needs: [] },
  { from: 'Submitted', to: 'Assigned', role: 'coordinator', needs: ['assignedTo'] },
  { from: 'Submitted', to: 'Rejected', role: 'coordinator', needs: ['note'] },
  { from: 'Assigned', to: 'In Progress', role: 'coordinator', needs: [] },
  { from: 'Assigned', to: 'Rejected', role: 'coordinator', needs: ['note'] },
  { from: 'In Progress', to: 'Resolved', role: 'coordinator', needs: ['note'] },
  { from: 'In Progress', to: 'Assigned', role: 'coordinator', needs: ['assignedTo'] },
  { from: 'Resolved', to: 'In Progress', role: 'coordinator', needs: ['note'] },
];

function canTransition(from, to, role, payload = {}) {
  if (!VALID_STATUSES.includes(from)) {
    return { ok: false, message: `Invalid current status '${from}'` };
  }
  if (!VALID_STATUSES.includes(to)) {
    return { ok: false, message: `Invalid target status '${to}'` };
  }
  if (from === 'Rejected') {
    return { ok: false, message: 'Rejected reports are final and cannot be transitioned' };
  }
  if (from === to) {
    return { ok: false, message: `Report is already in '${from}' status` };
  }

  const match = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!match) {
    return { ok: false, message: `Transition from '${from}' to '${to}' is not permitted` };
  }

  if (match.role !== role) {
    return {
      ok: false,
      message: `Only role '${match.role}' is allowed to transition '${from}' to '${to}' (current role: '${role}')`,
    };
  }

  for (const field of match.needs) {
    const val = payload[field];
    if (!val || (typeof val === 'string' && val.trim().length === 0)) {
      return { ok: false, message: `Transition to '${to}' requires '${field}'` };
    }
  }

  return { ok: true, message: null };
}

function getAllowedTransitions(from, role) {
  return TRANSITIONS.filter((t) => t.from === from && t.role === role).map((t) => ({
    to: t.to,
    needs: t.needs,
  }));
}

module.exports = {
  VALID_STATUSES,
  TRANSITIONS,
  canTransition,
  getAllowedTransitions,
};
