import { z } from 'zod';
import { getAuthOrg } from '@/lib/auth';
import { error as errorResponse } from '@/lib/api-response';
import { formatZodError, handleRouteError, resolveOrganizationId } from '@/lib/api-route';
import { createServiceRoleClient, createUserClient } from '@/lib/supabase';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

interface CertificateFileRow {
  file_path: string;
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

    const userSupabase = await createUserClient();
    const orgId = await resolveOrganizationId(userSupabase, clerkOrgId);
    const { data, error } = await userSupabase
      .from('certificates')
      .select('file_path')
      .eq('org_id', orgId)
      .eq('id', parsedParams.data.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Certificate not found.', 'NOT_FOUND', 404);
      }

      throw error;
    }

    const certificate = data as CertificateFileRow | null;

    if (!certificate) {
      return errorResponse('Certificate not found.', 'NOT_FOUND', 404);
    }

    const adminSupabase = createServiceRoleClient();
    const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
      .from('certs')
      .createSignedUrl(certificate.file_path, 15 * 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw signedUrlError ?? new Error('Failed to create signed URL.');
    }

    return Response.json({ signed_url: signedUrlData.signedUrl });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
