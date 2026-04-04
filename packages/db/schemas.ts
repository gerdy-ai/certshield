import { z } from 'zod';

const certStatusSchema = z.enum(['active', 'expiring_soon', 'expired', 'pending']);

const positiveIntFromQuery = z.coerce.number().int().positive();

const dateStringSchema = z.string().date();

export const paginationSchema = z.object({
  page: positiveIntFromQuery.optional().default(1),
  limit: positiveIntFromQuery.max(100).optional().default(20),
});

export const createSubcontractorSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  company_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1).max(50).optional(),
});

export const updateSettingsSchema = z.object({
  notification_email: z.string().trim().email().optional(),
  webhook_url: z.string().trim().url().optional(),
  reminder_30d_email: z.boolean().optional(),
  reminder_14d_email: z.boolean().optional(),
  reminder_7d_email: z.boolean().optional(),
  reminder_30d_sms: z.boolean().optional(),
  reminder_14d_sms: z.boolean().optional(),
  reminder_7d_sms: z.boolean().optional(),
});

export const certificateFilterSchema = z.object({
  status: certStatusSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  page: paginationSchema.shape.page,
  limit: paginationSchema.shape.limit,
});

export const subcontractorFilterSchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  status: certStatusSchema.optional(),
  page: paginationSchema.shape.page,
  limit: paginationSchema.shape.limit,
});

export const sendReminderSchema = z.object({
  certificate_id: z.string().uuid(),
});
