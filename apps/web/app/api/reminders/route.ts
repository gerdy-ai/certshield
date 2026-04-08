import { reminderLogFilterSchema } from '@certshield/db/schemas';
import { getAuthOrg } from '@/lib/auth';
import { error as errorResponse } from '@/lib/api-response';
import {
  formatZodError,
  handleRouteError,
  resolveOrganizationId,
} from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';

interface ReminderLogRow {
  id: string;
  certificate_id: string;
  subcontractor_id: string;
  org_id: string;
  reminder_type: 'email' | 'sms';
  days_before_expiry: number;
  sent_at: string;
  success: boolean;
  error_message: string | null;
  certificates:
    | {
        file_name: string;
        expiration_date: string | null;
      }
    | {
        file_name: string;
        expiration_date: string | null;
      }[]
    | null;
  subcontractors:
    | {
        first_name: string;
        last_name: string;
        company_name: string;
        email: string;
      }
    | {
        first_name: string;
        last_name: string;
        company_name: string;
        email: string;
      }[]
    | null;
}

function asSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const searchParams = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    const parsedQuery = reminderLogFilterSchema.safeParse(searchParams);

    if (!parsedQuery.success) {
      return errorResponse(
        formatZodError(parsedQuery.error),
        'VALIDATION_ERROR',
        400,
      );
    }

    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const { page, limit } = parsedQuery.data;
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;
    const { data, error, count } = await supabase
      .from('reminder_logs')
      .select(
        `
          id,
          certificate_id,
          subcontractor_id,
          org_id,
          reminder_type,
          days_before_expiry,
          sent_at,
          success,
          error_message,
          certificates (
            file_name,
            expiration_date
          ),
          subcontractors (
            first_name,
            last_name,
            company_name,
            email
          )
        `,
        { count: 'exact' },
      )
      .eq('org_id', orgId)
      .order('sent_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as ReminderLogRow[];

    return Response.json({
      data: rows.map((row) => {
        const certificate = asSingle(row.certificates);
        const subcontractor = asSingle(row.subcontractors);

        return {
          id: row.id,
          certificate_id: row.certificate_id,
          subcontractor_id: row.subcontractor_id,
          org_id: row.org_id,
          reminder_type: row.reminder_type,
          days_before_expiry: row.days_before_expiry,
          sent_at: row.sent_at,
          success: row.success,
          error_message: row.error_message ?? undefined,
          certificate: certificate
            ? {
                file_name: certificate.file_name,
                expiration_date: certificate.expiration_date ?? undefined,
              }
            : null,
          subcontractor: subcontractor
            ? {
                first_name: subcontractor.first_name,
                last_name: subcontractor.last_name,
                company_name: subcontractor.company_name,
                email: subcontractor.email,
              }
            : null,
        };
      }),
      total: count ?? 0,
      page,
      limit,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
