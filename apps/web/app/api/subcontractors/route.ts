import { createSubcontractorSchema, subcontractorFilterSchema } from '@certshield/db/schemas';
import { getAuthOrg } from '@/lib/auth';
import { error as errorResponse, success } from '@/lib/api-response';
import {
  formatZodError,
  getCertificateStatus,
  handleRouteError,
  resolveOrganizationId,
} from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';

interface LatestCertificateRow {
  id: string;
  expiration_date: string | null;
  uploaded_at: string;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';
}

interface SubcontractorRow {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  upload_token: string;
  created_at: string;
  deleted_at: string | null;
  certificates?: LatestCertificateRow[] | null;
}

function mapSubcontractor(item: SubcontractorRow) {
  const latestCertificate = item.certificates?.[0] ?? null;

  return {
    id: item.id,
    org_id: item.org_id,
    first_name: item.first_name,
    last_name: item.last_name,
    company_name: item.company_name,
    email: item.email,
    phone: item.phone ?? undefined,
    upload_token: item.upload_token,
    deleted_at: item.deleted_at ?? undefined,
    created_at: item.created_at,
    latest_certificate_status: latestCertificate
      ? getCertificateStatus(latestCertificate.expiration_date)
      : 'pending',
    latest_certificate: latestCertificate
      ? {
          id: latestCertificate.id,
          expiration_date: latestCertificate.expiration_date,
          uploaded_at: latestCertificate.uploaded_at,
          parse_status: latestCertificate.parse_status,
          status: getCertificateStatus(latestCertificate.expiration_date),
        }
      : null,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsedQuery = subcontractorFilterSchema.safeParse(searchParams);

    if (!parsedQuery.success) {
      return errorResponse(formatZodError(parsedQuery.error), 'VALIDATION_ERROR', 400);
    }

    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const { search, status, page, limit } = parsedQuery.data;

    let query = supabase
      .from('subcontractors')
      .select(
        `
          id,
          org_id,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          upload_token,
          created_at,
          deleted_at,
          certificates (
            id,
            expiration_date,
            uploaded_at,
            parse_status
          )
        `,
      )
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('uploaded_at', { ascending: false, foreignTable: 'certificates' })
      .limit(1, { foreignTable: 'certificates' });

    if (search) {
      query = query.or(
        [
          `first_name.ilike.%${search}%`,
          `last_name.ilike.%${search}%`,
          `company_name.ilike.%${search}%`,
          `email.ilike.%${search}%`,
        ].join(','),
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as SubcontractorRow[];
    const filteredRows = rows
      .map(mapSubcontractor)
      .filter((item) => (status ? item.latest_certificate_status === status : true));
    const start = (page - 1) * limit;

    return Response.json({
      data: filteredRows.slice(start, start + limit),
      total: filteredRows.length,
      page,
      limit,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const body = await request.json().catch(() => null);
    const parsedBody = createSubcontractorSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(formatZodError(parsedBody.error), 'VALIDATION_ERROR', 400);
    }

    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const { data, error } = await supabase
      .from('subcontractors')
      .insert({
        org_id: orgId,
        ...parsedBody.data,
      })
      .select(
        `
          id,
          org_id,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          upload_token,
          created_at,
          deleted_at
        `,
      )
      .single();

    if (error || !data) {
      throw error ?? new Error('Failed to create subcontractor.');
    }

    return success(
      {
        id: data.id,
        org_id: data.org_id,
        first_name: data.first_name,
        last_name: data.last_name,
        company_name: data.company_name,
        email: data.email,
        phone: data.phone ?? undefined,
        upload_token: data.upload_token,
        deleted_at: data.deleted_at ?? undefined,
        created_at: data.created_at,
      },
      201,
    );
  } catch (cause) {
    if (cause instanceof SyntaxError) {
      return errorResponse('Invalid JSON body.', 'VALIDATION_ERROR', 400);
    }

    return handleRouteError(cause);
  }
}
