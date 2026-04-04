import { z } from 'zod';
import { getAuthOrg } from '@/lib/auth';
import { error as errorResponse, success } from '@/lib/api-response';
import {
  formatZodError,
  getCertificateStatus,
  handleRouteError,
  resolveOrganizationId,
} from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

interface CertificateRow {
  id: string;
  subcontractor_id: string;
  org_id: string;
  file_path: string;
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
}

interface SubcontractorWithCertificatesRow {
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
  certificates?: CertificateRow[] | null;
}

export async function GET(
  _request: Request,
  context: { params: { id: string } },
): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const parsedParams = paramsSchema.safeParse(context.params);

    if (!parsedParams.success) {
      return errorResponse(formatZodError(parsedParams.error), 'VALIDATION_ERROR', 400);
    }

    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const { data, error } = await supabase
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
            subcontractor_id,
            org_id,
            file_path,
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
            additional_insured
          )
        `,
      )
      .eq('org_id', orgId)
      .eq('id', parsedParams.data.id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false, foreignTable: 'certificates' })
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Subcontractor not found.', 'NOT_FOUND', 404);
      }

      throw error;
    }

    const item = data as SubcontractorWithCertificatesRow;

    return success({
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
      certificates: (item.certificates ?? []).map((certificate) => ({
        ...certificate,
        status: getCertificateStatus(certificate.expiration_date),
      })),
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } },
): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const parsedParams = paramsSchema.safeParse(context.params);

    if (!parsedParams.success) {
      return errorResponse(formatZodError(parsedParams.error), 'VALIDATION_ERROR', 400);
    }

    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const { data, error } = await supabase
      .from('subcontractors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', parsedParams.data.id)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Subcontractor not found.', 'NOT_FOUND', 404);
      }

      throw error;
    }

    if (!data) {
      return errorResponse('Subcontractor not found.', 'NOT_FOUND', 404);
    }

    return Response.json({ success: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
