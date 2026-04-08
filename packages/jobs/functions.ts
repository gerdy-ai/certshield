import { parseCertificatePdf } from '@certshield/ai';
import { createServiceRoleSupabaseClient } from '@certshield/db/client';
import { inngest } from './inngest';

type ParseStatus = 'pending' | 'processing' | 'complete' | 'failed';
type ReminderType = 'email' | 'sms';
type ReminderDays = 7 | 14 | 30;

interface CertificateUploadedEventData {
  certificateId: string;
}

interface CertificateParseRow {
  id: string;
  file_path: string;
  file_name: string;
}

interface ReminderOrgRow {
  notification_email: string | null;
  reminder_30d_email: boolean | null;
  reminder_14d_email: boolean | null;
  reminder_7d_email: boolean | null;
  reminder_30d_sms: boolean | null;
  reminder_14d_sms: boolean | null;
  reminder_7d_sms: boolean | null;
}

interface ReminderSubcontractorRow {
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  company_name: string;
}

interface ReminderCertificateRow {
  id: string;
  org_id: string;
  subcontractor_id: string;
  file_name: string;
  expiration_date: string;
  organizations: ReminderOrgRow | ReminderOrgRow[] | null;
  subcontractors: ReminderSubcontractorRow | ReminderSubcontractorRow[] | null;
}

interface ReminderSendResult {
  success: boolean;
  errorMessage: string | null;
}

const reminderDays: ReminderDays[] = [30, 14, 7];

function getErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }

  return 'Unknown error.';
}

function asSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysUntil(expirationDate: string, fromDate: Date): ReminderDays | null {
  const expiration = new Date(`${expirationDate}T00:00:00.000Z`);
  const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  const days = Math.round((expiration.getTime() - from.getTime()) / 86_400_000);

  if (days === 7 || days === 14 || days === 30) {
    return days;
  }

  return null;
}

function isReminderEnabled(org: ReminderOrgRow, type: ReminderType, days: ReminderDays): boolean {
  if (type === 'email') {
    if (days === 30) return org.reminder_30d_email ?? true;
    if (days === 14) return org.reminder_14d_email ?? true;
    return org.reminder_7d_email ?? true;
  }

  if (days === 30) return org.reminder_30d_sms ?? false;
  if (days === 14) return org.reminder_14d_sms ?? false;
  return org.reminder_7d_sms ?? false;
}

async function setParseStatus(
  certificateId: string,
  parseStatus: ParseStatus,
  parseError: string | null,
): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const update: Record<string, unknown> = {
    parse_status: parseStatus,
    parse_error: parseError,
  };

  if (parseStatus === 'complete' || parseStatus === 'failed') {
    update.parsed_at = new Date().toISOString();
  }

  const { error } = await supabase.from('certificates').update(update).eq('id', certificateId);

  if (error) {
    throw error;
  }
}

async function sendReminder(
  certificate: ReminderCertificateRow,
  subcontractor: ReminderSubcontractorRow,
  type: ReminderType,
  daysBeforeExpiry: ReminderDays,
): Promise<ReminderSendResult> {
  if (type === 'email') {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return {
        success: false,
        errorMessage: 'Email reminder skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.',
      };
    }

    if (!subcontractor.email) {
      return {
        success: false,
        errorMessage: 'Email reminder skipped: subcontractor email is missing.',
      };
    }

    return {
      success: false,
      errorMessage: `Email reminder for ${certificate.file_name} at ${daysBeforeExpiry} days was prepared, but the Resend provider integration is not implemented yet.`,
    };
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    return {
      success: false,
      errorMessage: 'SMS reminder skipped: Twilio environment variables are not configured.',
    };
  }

  if (!subcontractor.phone) {
    return {
      success: false,
      errorMessage: 'SMS reminder skipped: subcontractor phone is missing.',
    };
  }

  return {
    success: false,
    errorMessage: `SMS reminder for ${certificate.file_name} at ${daysBeforeExpiry} days was prepared, but the Twilio provider integration is not implemented yet.`,
  };
}

async function hasExistingReminderLog(
  certificateId: string,
  type: ReminderType,
  daysBeforeExpiry: ReminderDays,
): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('reminder_logs')
    .select('id')
    .eq('certificate_id', certificateId)
    .eq('reminder_type', type)
    .eq('days_before_expiry', daysBeforeExpiry)
    .eq('success', true)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}

async function insertReminderLog(
  certificate: ReminderCertificateRow,
  type: ReminderType,
  daysBeforeExpiry: ReminderDays,
  result: ReminderSendResult,
): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from('reminder_logs').insert({
    certificate_id: certificate.id,
    subcontractor_id: certificate.subcontractor_id,
    org_id: certificate.org_id,
    reminder_type: type,
    days_before_expiry: daysBeforeExpiry,
    success: result.success,
    error_message: result.errorMessage,
  });

  if (error) {
    throw error;
  }
}

export const parseUploadedCertificate = inngest.createFunction(
  { id: 'parse-uploaded-certificate', name: 'Parse uploaded certificate' },
  { event: 'cert/uploaded' },
  async ({ event, step }) => {
    const { certificateId } = event.data as CertificateUploadedEventData;

    if (!certificateId) {
      throw new Error('cert/uploaded event is missing certificateId.');
    }

    await step.run('mark-processing', async () => {
      await setParseStatus(certificateId, 'processing', null);
    });

    try {
      const certificate = await step.run('load-certificate', async () => {
        const supabase = createServiceRoleSupabaseClient();
        const { data, error } = await supabase
          .from('certificates')
          .select('id, file_path, file_name')
          .eq('id', certificateId)
          .single();

        if (error || !data) {
          throw error ?? new Error('Certificate not found.');
        }

        return data as CertificateParseRow;
      });

      const bytes = (await step.run('download-pdf', async () => {
        const supabase = createServiceRoleSupabaseClient();
        const { data, error } = await supabase.storage.from('certs').download(certificate.file_path);

        if (error || !data) {
          throw error ?? new Error('Certificate PDF could not be downloaded.');
        }

        return await data.arrayBuffer();
      })) as ArrayBuffer;

      const parseResult = (await step.run('parse-pdf', async () =>
        parseCertificatePdf({
          fileName: certificate.file_name,
          mimeType: 'application/pdf',
          bytes,
        }),
      )) as Awaited<ReturnType<typeof parseCertificatePdf>>;

      await step.run('persist-parse-result', async () => {
        const supabase = createServiceRoleSupabaseClient();
        const update = {
          parse_status: parseResult.success ? 'complete' : 'failed',
          parsed_at: new Date().toISOString(),
          parse_error: parseResult.error,
          insurer_name: parseResult.fields.insurer_name,
          policy_number: parseResult.fields.policy_number,
          policy_type: parseResult.fields.policy_type,
          coverage_amount: parseResult.fields.coverage_amount,
          effective_date: parseResult.fields.effective_date,
          expiration_date: parseResult.fields.expiration_date,
          certificate_holder: parseResult.fields.certificate_holder,
          additional_insured: parseResult.fields.additional_insured,
        };
        const { error } = await supabase.from('certificates').update(update).eq('id', certificateId);

        if (error) {
          throw error;
        }
      });

      return {
        certificateId,
        parseStatus: parseResult.success ? 'complete' : 'failed',
        warnings: parseResult.warnings,
      };
    } catch (cause) {
      const errorMessage = getErrorMessage(cause);

      await step.run('mark-failed', async () => {
        await setParseStatus(certificateId, 'failed', errorMessage);
      });

      return {
        certificateId,
        parseStatus: 'failed',
        error: errorMessage,
      };
    }
  },
);

export const processDailyReminders = inngest.createFunction(
  { id: 'process-daily-reminders', name: 'Process daily certificate reminders' },
  { cron: '0 13 * * *' },
  async ({ step }) => {
    const today = new Date();
    const reminderDates = reminderDays.map((days) => toDateString(addDays(today, days)));

    const certificates = await step.run('load-expiring-certificates', async () => {
      const supabase = createServiceRoleSupabaseClient();
      const { data, error } = await supabase
        .from('certificates')
        .select(
          `
            id,
            org_id,
            subcontractor_id,
            file_name,
            expiration_date,
            organizations (
              notification_email,
              reminder_30d_email,
              reminder_14d_email,
              reminder_7d_email,
              reminder_30d_sms,
              reminder_14d_sms,
              reminder_7d_sms
            ),
            subcontractors (
              email,
              phone,
              first_name,
              last_name,
              company_name
            )
          `,
        )
        .eq('parse_status', 'complete')
        .in('expiration_date', reminderDates);

      if (error) {
        throw error;
      }

      return (data ?? []) as ReminderCertificateRow[];
    });

    const results = await step.run('send-enabled-reminders', async () => {
      let sent = 0;
      let skipped = 0;
      let failed = 0;

      for (const certificate of certificates) {
        const org = asSingle(certificate.organizations);
        const subcontractor = asSingle(certificate.subcontractors);
        const daysBeforeExpiry = daysUntil(certificate.expiration_date, today);

        if (!org || !subcontractor || !daysBeforeExpiry) {
          skipped += 1;
          continue;
        }

        for (const type of ['email', 'sms'] as const) {
          if (!isReminderEnabled(org, type, daysBeforeExpiry)) {
            skipped += 1;
            continue;
          }

          const alreadyLogged = await hasExistingReminderLog(certificate.id, type, daysBeforeExpiry);

          if (alreadyLogged) {
            skipped += 1;
            continue;
          }

          const result = await sendReminder(certificate, subcontractor, type, daysBeforeExpiry);
          await insertReminderLog(certificate, type, daysBeforeExpiry, result);

          if (result.success) {
            sent += 1;
          } else {
            failed += 1;
          }
        }
      }

      return {
        sent,
        skipped,
        failed,
      };
    });

    return {
      scanned: certificates.length,
      ...results,
    };
  },
);

export const inngestFunctions = [parseUploadedCertificate, processDailyReminders];
