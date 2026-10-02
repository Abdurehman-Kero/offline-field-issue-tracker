import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from './constants';

export const reportFormSchema = z.object({
  title: z
    .string()
    .min(3, 'Location or Title must be at least 3 characters long')
    .max(120, 'Location or Title cannot exceed 120 characters'),
  // Accepts the standard categories, or a custom description typed after picking 'Other'.
  category: z.string().min(1, 'Please specify the category'),
  priority: z.enum(PRIORITIES as any, {
    message: 'Please select a valid priority level',
  }),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(1000, 'Description cannot exceed 1000 characters'),
  reporterName: z
    .string()
    .min(2, 'Reporter name must be at least 2 characters')
    .max(80, 'Reporter name cannot exceed 80 characters'),
  latitude: z.union([
    z.number().min(-90).max(90),
    z.nan(),
    z.null(),
    z.undefined(),
  ]).optional(),
  longitude: z.union([
    z.number().min(-180).max(180),
    z.nan(),
    z.null(),
    z.undefined(),
  ]).optional(),
});

export type ReportFormValues = z.infer<typeof reportFormSchema>;
