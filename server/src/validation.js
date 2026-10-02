const { z } = require('zod');

const CATEGORIES = [
  'Water Point',
  'Equipment Damage',
  'Service Interruption',
  'Safety Concern',
  'Maintenance',
  'Other',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const clientHistoryEventSchema = z.object({
  eventType: z.enum([
    'CREATED',
    'SUBMITTED',
    'SYNC_FAILED',
    'SYNCED',
    'STATUS_CHANGED',
    'DETAILS_EDITED',
    'DUPLICATE_FLAGGED',
  ]),
  fromValue: z.string().nullable().optional(),
  toValue: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  actorRole: z.enum(['field_worker', 'coordinator', 'system']).default('field_worker'),
  occurredAt: z.string().datetime().optional(),
});

const createReportSchema = z
  .object({
    clientId: z.string().uuid({ message: 'Must be a valid UUID' }),
    category: z.string().trim().min(1, { message: 'Category is required' }),
    description: z
      .string()
      .trim()
      .min(10, { message: 'Must be at least 10 characters' })
      .max(1000, { message: 'Must be at most 1000 characters' }),
    locationText: z
      .string()
      .trim()
      .min(3, { message: 'Must be at least 3 characters' })
      .max(200, { message: 'Must be at most 200 characters' }),
    latitude: z
      .number()
      .min(-90, { message: 'Latitude must be between -90 and 90' })
      .max(90, { message: 'Latitude must be between -90 and 90' })
      .nullable()
      .optional(),
    longitude: z
      .number()
      .min(-180, { message: 'Longitude must be between -180 and 180' })
      .max(180, { message: 'Longitude must be between -180 and 180' })
      .nullable()
      .optional(),
    priority: z.enum(PRIORITIES).default('Medium'),
    status: z.literal('Submitted', {
      errorMap: () => ({ message: "Initial submitted status must be 'Submitted'" }),
    }),
    reporterName: z
      .string()
      .trim()
      .min(2, { message: 'Reporter name must be at least 2 characters' })
      .max(80, { message: 'Reporter name must be at most 80 characters' }),
    reportedAt: z
      .string()
      .datetime({ message: 'Must be a valid ISO timestamp' })
      .refine(
        (val) => {
          const fiveMinInFuture = Date.now() + 5 * 60 * 1000;
          return new Date(val).getTime() <= fiveMinInFuture;
        },
        { message: 'Reported time cannot be more than 5 minutes in the future' }
      ),
    history: z.array(clientHistoryEventSchema).optional().default([]),
  })
  .refine(
    (data) => {
      const hasLat = data.latitude !== undefined && data.latitude !== null;
      const hasLng = data.longitude !== undefined && data.longitude !== null;
      return (hasLat && hasLng) || (!hasLat && !hasLng);
    },
    {
      message: 'Both latitude and longitude must be provided together, or neither',
      path: ['latitude'],
    }
  );

const statusChangeSchema = z.object({
  toStatus: z.enum(['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected']),
  note: z.string().trim().optional(),
  assignedTo: z.string().trim().optional(),
  version: z.number().int().min(1, { message: 'Version is required and must be an integer >= 1' }),
});

const editReportSchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    description: z
      .string()
      .trim()
      .min(10, { message: 'Must be at least 10 characters' })
      .max(1000, { message: 'Must be at most 1000 characters' })
      .optional(),
    locationText: z
      .string()
      .trim()
      .min(3, { message: 'Must be at least 3 characters' })
      .max(200, { message: 'Must be at most 200 characters' })
      .optional(),
    latitude: z
      .number()
      .min(-90)
      .max(90)
      .nullable()
      .optional(),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .nullable()
      .optional(),
    priority: z.enum(PRIORITIES).optional(),
    version: z.number().int().min(1, { message: 'Version is required and must be an integer >= 1' }),
  })
  .refine(
    (data) => {
      const hasLat = data.latitude !== undefined && data.latitude !== null;
      const hasLng = data.longitude !== undefined && data.longitude !== null;
      if (data.latitude !== undefined || data.longitude !== undefined) {
        return (hasLat && hasLng) || (!hasLat && !hasLng);
      }
      return true;
    },
    {
      message: 'Both latitude and longitude must be provided together, or neither',
      path: ['latitude'],
    }
  );

module.exports = {
  CATEGORIES,
  PRIORITIES,
  createReportSchema,
  statusChangeSchema,
  editReportSchema,
};
