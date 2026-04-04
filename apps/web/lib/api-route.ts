import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZodError } from 'zod';
import type { CertStatus } from '../../../shared/types';
import { error as errorResponse } from '@/lib/api-response';

export function formatZodError(error: ZodError): string {
  const [issue] = error.issues;

  if (!issue) {
    return 'Invalid request.';
  }

  if (issue.path.length === 0) {
    return issue.message;
  }

  return `${issue.path.join('.')}: ${issue.message}`;
}

export async function resolveOrganizationId(
  supabase: SupabaseClient,
  clerkOrgId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', clerkOrgId)
    .single();

  if (error || !data) {
    throw new Error('Organization not found.');
  }

  return data.id;
}

export function getCertificateStatus(expirationDate: string | null): CertStatus {
  if (!expirationDate) {
    return 'pending';
  }

  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);
  const soonDate = new Date(today);
  soonDate.setDate(soonDate.getDate() + 30);
  const soonString = soonDate.toISOString().slice(0, 10);

  if (expirationDate < todayString) {
    return 'expired';
  }

  if (expirationDate <= soonString) {
    return 'expiring_soon';
  }

  return 'active';
}

export function handleRouteError(cause: unknown): Response {
  if (cause instanceof Response) {
    return cause;
  }

  if (cause instanceof Error && cause.message === 'Organization not found.') {
    return errorResponse(cause.message, 'ORG_NOT_FOUND', 404);
  }

  return errorResponse('Internal server error.', 'INTERNAL_ERROR', 500);
}
