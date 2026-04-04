import { certificateFilterSchema } from '@certshield/db/schemas';
import { getAuthOrg } from '@/lib/auth';
import { error as errorResponse } from '@/lib/api-response';
import {
  formatZodError,
  getCertificateStatus,
  handleRouteError,
  resolveOrganizationId,
} from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';

interface CertificateListRow {
  id: string;
  subcontractor_id: string;
  org_id: string;
  file_name: string;
  uploaded_at: string;
  parsed_at: string | null;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';
  insurer_name: string | null;
  policy_number: string | null;
  policy_type: string | null;
  coverage_amount: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  certificate_holder: string | null;
  additional_insured: boolean | null;
  subcontractors:
    | {
        first_name: string;
        last_name: string;
        company_name: string;
        deleted_at: string | null;
      }
    | {
        first_name: string;
        last_name: string;
        company_name: string;
        deleted_at: string | null;
      }[]
    | null;
}

function getStatusDateBounds() {
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);
  const soonDate = new Date(today);
  soonDate.setDate(soonDate.getDate() + 30);

  return {
    todayString,
    soonString: soonDate.toISOString().slice(0, 10),
  };
}

function getSubcontractorName(row: CertificateListRow): string {
  const subcontractor = Array.isArray(row.subcontractors)
    ? row.subcontractors[0]
    : row.subcontractors;

  if (!subcontractor) {
    return '';
  }

  return subcontractor.company_name || `${subcontractor.first_name} ${subcontractor.last_name}`.trim();
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsedQuery = certificateFilterSchema.safeParse(searchParams);

    if (!parsedQuery.success) {
      return errorResponse(formatZodError(parsedQuery.error), 'VALIDATION_ERROR', 400);
    }

    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const { status, from, to, page, limit } = parsedQuery.data;
    const { todayString, soonString } = getStatusDateBounds();
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    let query = supabase
      .from('certificates')
      .select(
        `
          id,
          subcontractor_id,
          org_id,
          file_name,
          uploaded_at,
          parsed_at,
          parse_status,
          insurer_name,
          policy_number,
          policy_type,
          coverage_amount,
          effective_date,
          expiration_date,
          certificate_holder,
          additional_insured,
          subcontractors!inner (
            first_name,
            last_name,
            company_name,
            deleted_at
          )
        `,
        { count: 'exact' },
      )
      .eq('org_id', orgId)
      .is('subcontractors.deleted_at', null)
      .order('uploaded_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (from) {
      query = query.gte('expiration_date', from);
    }

    if (to) {
      query = query.lte('expiration_date', to);
    }

    if (status === 'pending') {
      query = query.is('expiration_date', null);
    } else if (status === 'expired') {
      query = query.lt('expiration_date', todayString);
    } else if (status === 'expiring_soon') {
      query = query.gte('expiration_date', todayString).lte('expiration_date', soonString);
    } else if (status === 'active') {
      query = query.gt('expiration_date', soonString);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as CertificateListRow[];

    return Response.json({
      data: rows.map((row) => ({
        id: row.id,
        subcontractor_id: row.subcontractor_id,
        org_id: row.org_id,
        file_name: row.file_name,
        uploaded_at: row.uploaded_at,
        parsed_at: row.parsed_at ?? undefined,
        parse_status: row.parse_status,
        insurer_name: row.insurer_name ?? undefined,
        policy_number: row.policy_number ?? undefined,
        policy_type: row.policy_type ?? undefined,
        coverage_amount: row.coverage_amount ?? undefined,
        effective_date: row.effective_date ?? undefined,
        expiration_date: row.expiration_date ?? undefined,
        certificate_holder: row.certificate_holder ?? undefined,
        additional_insured: row.additional_insured ?? undefined,
        status: getCertificateStatus(row.expiration_date),
        subcontractor_name: getSubcontractorName(row),
      })),
      total: count ?? 0,
      page,
      limit,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
