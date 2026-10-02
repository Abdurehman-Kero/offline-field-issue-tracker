const pool = require('./pool');
const migrate = require('./migrate');

const SEED_REPORTS = [
  {
    clientId: '11111111-1111-4111-8111-111111111111',
    category: 'Water Point',
    description: 'Community hand pump pressure valve is cracked and leaking non-potable water.',
    locationText: 'Sector 4, Kebele 02 Central Square',
    latitude: 9.012345,
    longitude: 38.765432,
    priority: 'Critical',
    status: 'In Progress',
    reporterName: 'Abebe Bikila',
    assignedTo: 'Engineer Dawit',
    reportedAt: '2026-09-28T08:30:00Z',
    version: 3,
    history: [
      {
        event_type: 'CREATED',
        note: 'Report logged on field device',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-28T08:30:00Z',
      },
      {
        event_type: 'SUBMITTED',
        from_value: 'Draft',
        to_value: 'Submitted',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-28T08:35:00Z',
      },
      {
        event_type: 'SYNCED',
        to_value: 'Submitted',
        note: 'Uploaded to regional server',
        actor_role: 'system',
        source: 'server',
        occurred_at: '2026-09-28T09:00:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Submitted',
        to_value: 'Assigned',
        note: 'Assigned to Engineer Dawit',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-28T10:15:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Assigned',
        to_value: 'In Progress',
        note: 'Dispatching repair crew with replacement valve gasket',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-28T11:00:00Z',
      },
    ],
  },
  {
    clientId: '22222222-2222-4222-8222-222222222222',
    category: 'Water Point',
    description: 'Water well in central square is broken and dripping dirty water.',
    locationText: 'sector 4, kebele 02 central square', // duplicate match candidate!
    latitude: 9.012350,
    longitude: 38.765440,
    priority: 'High',
    status: 'Submitted',
    reporterName: 'Fatima Zahra',
    assignedTo: null,
    reportedAt: '2026-09-28T14:15:00Z',
    version: 1,
    history: [
      {
        event_type: 'CREATED',
        note: 'Created on mobile client',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-28T14:15:00Z',
      },
      {
        event_type: 'SUBMITTED',
        from_value: 'Draft',
        to_value: 'Submitted',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-28T14:20:00Z',
      },
      {
        event_type: 'SYNCED',
        to_value: 'Submitted',
        actor_role: 'system',
        source: 'server',
        occurred_at: '2026-09-28T15:00:00Z',
      },
    ],
  },
  {
    clientId: '33333333-3333-4333-8333-333333333333',
    category: 'Equipment Damage',
    description: 'Solar power inverter panel casing cracked by falling tree branch.',
    locationText: 'Health Post Clinic B, Ridge Road',
    latitude: 9.045000,
    longitude: 38.720000,
    priority: 'High',
    status: 'Assigned',
    reporterName: 'Kero Abdurehman',
    assignedTo: 'Technician Solomon',
    reportedAt: '2026-09-29T07:10:00Z',
    version: 2,
    history: [
      {
        event_type: 'CREATED',
        note: 'Logged offline during morning inspection',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-29T07:10:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Submitted',
        to_value: 'Assigned',
        note: 'Assigned to Technician Solomon for solar assessment',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-29T09:30:00Z',
      },
    ],
  },
  {
    clientId: '44444444-4444-4444-8444-444444444444',
    category: 'Safety Concern',
    description: 'Uncovered 3-meter deep trench along primary school pedestrian walkway.',
    locationText: 'School District Zone 1, Gate 2',
    latitude: 9.023400,
    longitude: 38.741200,
    priority: 'Critical',
    status: 'Resolved',
    reporterName: 'Helen Tesfaye',
    assignedTo: 'Safety Officer Marta',
    reportedAt: '2026-09-27T11:00:00Z',
    version: 3,
    history: [
      {
        event_type: 'CREATED',
        note: 'Reported urgently by patrolling monitor',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-27T11:00:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Submitted',
        to_value: 'Assigned',
        note: 'Assigned to Safety Officer Marta',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-27T11:20:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'In Progress',
        to_value: 'Resolved',
        note: 'Steel trench safety cover installed and high-visibility barrier erected.',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-27T16:45:00Z',
      },
    ],
  },
  {
    clientId: '55555555-5555-4555-8555-555555555555',
    category: 'Service Interruption',
    description: 'Cellular booster generator run out of fuel during scheduled maintenance window.',
    locationText: 'Hilltop Repeater Tower 09',
    latitude: 9.081100,
    longitude: 38.802000,
    priority: 'High',
    status: 'In Progress',
    reporterName: 'Yared Lemma',
    assignedTo: 'Logistics Team Alpha',
    reportedAt: '2026-09-29T13:40:00Z',
    version: 2,
    history: [
      {
        event_type: 'CREATED',
        note: 'Reported during power grid outage',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-29T13:40:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Assigned',
        to_value: 'In Progress',
        note: 'Diesel fuel resupply tanker dispatched',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-29T15:00:00Z',
      },
    ],
  },
  {
    clientId: '66666666-6666-4666-8666-666666666666',
    category: 'Maintenance',
    description: 'Routine quarterly desilting required for municipal drainage culvert.',
    locationText: 'Culvert 14, Eastern Bypass',
    latitude: 8.991200,
    longitude: 38.775000,
    priority: 'Low',
    status: 'Submitted',
    reporterName: 'Mulugeta Assefa',
    assignedTo: null,
    reportedAt: '2026-09-30T06:15:00Z',
    version: 1,
    history: [
      {
        event_type: 'CREATED',
        note: 'Scheduled maintenance check item',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-30T06:15:00Z',
      },
    ],
  },
  {
    clientId: '77777777-7777-4777-8777-777777777777',
    category: 'Other',
    description: 'Private vehicle parked across warehouse loading dock without authorization.',
    locationText: 'Depot 3 Logistics Yard',
    latitude: 9.030500,
    longitude: 38.711000,
    priority: 'Low',
    status: 'Rejected',
    reporterName: 'Mulugeta Assefa',
    assignedTo: null,
    reportedAt: '2026-09-26T09:00:00Z',
    version: 2,
    history: [
      {
        event_type: 'CREATED',
        note: 'Gate security check',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-26T09:00:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Submitted',
        to_value: 'Rejected',
        note: 'Not an infrastructure issue. Referred to local parking enforcement.',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-26T09:45:00Z',
      },
    ],
  },
  {
    clientId: '88888888-8888-4888-8888-888888888888',
    category: 'Water Point',
    description: 'Gravity-fed tap stand pressure is zero at dawn hours.',
    locationText: 'Village 8 Upper Ridge',
    latitude: 9.060100,
    longitude: 38.790200,
    priority: 'Medium',
    status: 'Assigned',
    reporterName: 'Chaltu Regassa',
    assignedTo: 'Plumbing Unit C',
    reportedAt: '2026-09-29T16:00:00Z',
    version: 2,
    history: [
      {
        event_type: 'CREATED',
        note: 'Created on field tablet',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-29T16:00:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Submitted',
        to_value: 'Assigned',
        note: 'Assigned to Plumbing Unit C',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-29T17:10:00Z',
      },
    ],
  },
  {
    clientId: '99999999-9999-4999-8999-999999999999',
    category: 'Equipment Damage',
    description: 'Radio communications aerial bent by high crosswinds.',
    locationText: 'Emergency Dispatch Center Mast 4',
    latitude: 9.015000,
    longitude: 38.750000,
    priority: 'Medium',
    status: 'In Progress',
    reporterName: 'Kero Abdurehman',
    assignedTo: 'Telecom Contractor',
    reportedAt: '2026-09-30T07:45:00Z',
    version: 2,
    history: [
      {
        event_type: 'CREATED',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-30T07:45:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Assigned',
        to_value: 'In Progress',
        note: 'Climbing team evaluating harness safety before repair',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-30T08:30:00Z',
      },
    ],
  },
  {
    clientId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    category: 'Safety Concern',
    description: 'Downed electrical cable resting near flooded agricultural ditch.',
    locationText: 'Irrigation Canal Km 4, South Sector',
    latitude: 8.975000,
    longitude: 38.712000,
    priority: 'Critical',
    status: 'In Progress',
    reporterName: 'Fatima Zahra',
    assignedTo: 'Power Utility Emergency Crew',
    reportedAt: '2026-09-30T09:10:00Z',
    version: 2,
    history: [
      {
        event_type: 'CREATED',
        note: 'Area cordoned off with caution tape immediately',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-30T09:10:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'Submitted',
        to_value: 'Assigned',
        note: 'Assigned with highest priority to Power Utility',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-30T09:25:00Z',
      },
    ],
  },
  {
    clientId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    category: 'Service Interruption',
    description: 'Chlorination dosage pump offline due to power surge.',
    locationText: 'Regional Water Treatment Facility 1',
    latitude: 9.055000,
    longitude: 38.740000,
    priority: 'Critical',
    status: 'Resolved',
    reporterName: 'Abebe Bikila',
    assignedTo: 'Chemical Plant Tech',
    reportedAt: '2026-09-25T14:00:00Z',
    version: 3,
    history: [
      {
        event_type: 'CREATED',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-25T14:00:00Z',
      },
      {
        event_type: 'STATUS_CHANGED',
        from_value: 'In Progress',
        to_value: 'Resolved',
        note: 'Blown fuse replaced and backup surge protector installed.',
        actor_role: 'coordinator',
        source: 'server',
        occurred_at: '2026-09-25T18:30:00Z',
      },
    ],
  },
  {
    clientId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    category: 'Maintenance',
    description: 'Fencing around perimeter water reservoir needs replacement barb wire.',
    locationText: 'Reservoir Tank Hill 7',
    latitude: 9.072000,
    longitude: 38.789000,
    priority: 'Medium',
    status: 'Submitted',
    reporterName: 'Chaltu Regassa',
    assignedTo: null,
    reportedAt: '2026-09-30T10:00:00Z',
    version: 1,
    history: [
      {
        event_type: 'CREATED',
        note: 'Logged during bi-weekly site walk',
        actor_role: 'field_worker',
        source: 'client',
        occurred_at: '2026-09-30T10:00:00Z',
      },
    ],
  },
];

async function seed() {
  await migrate();
  console.log('Seeding initial report data...');

  const client = await pool.getClient();
  try {
    await client.query('BEGIN');

    // Clean existing tables for clean seed
    await client.query('DELETE FROM report_history;');
    await client.query('DELETE FROM reports;');

    const insertedIds = {};

    for (const r of SEED_REPORTS) {
      const insertSql = `
        INSERT INTO reports (
          client_id, category, description, location_text,
          latitude, longitude, priority, status, reporter_name,
          assigned_to, reported_at, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, client_id;
      `;
      const res = await client.query(insertSql, [
        r.clientId,
        r.category,
        r.description,
        r.locationText,
        r.latitude,
        r.longitude,
        r.priority,
        r.status,
        r.reporterName,
        r.assignedTo,
        r.reportedAt,
        r.version,
      ]);

      const insertedId = res.rows[0].id;
      insertedIds[r.clientId] = insertedId;

      // Insert history
      for (const h of r.history) {
        await client.query(
          `
          INSERT INTO report_history (
            report_id, event_type, from_value, to_value, note, actor_role, source, occurred_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `,
          [
            insertedId,
            h.event_type,
            h.from_value || null,
            h.to_value || null,
            h.note || null,
            h.actor_role,
            h.source,
            h.occurred_at || new Date().toISOString(),
          ]
        );
      }
    }

    // Mark the duplicate link between report 2 and report 1
    const rep1Id = insertedIds['11111111-1111-4111-8111-111111111111'];
    const rep2Id = insertedIds['22222222-2222-4222-8222-222222222222'];
    if (rep1Id && rep2Id) {
      await client.query(
        'UPDATE reports SET possible_duplicate_of = $1 WHERE id = $2;',
        [rep1Id, rep2Id]
      );
      await client.query(
        `
        INSERT INTO report_history (
          report_id, event_type, from_value, to_value, note, actor_role, source
        ) VALUES ($1, 'DUPLICATE_FLAGGED', NULL, $2, 'Flagged as possible duplicate of earlier Kebele 02 water point report', 'system', 'server');
      `,
        [rep2Id, rep1Id]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${SEED_REPORTS.length} reports with full audit histories successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seed;
