import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSettingsSchema } from '@certshield/db/schemas';
import { getAuthOrg } from '@/lib/auth';
import { error as errorResponse, success } from '@/lib/api-response';
import {
  formatZodError,
  handleRouteError,
  resolveOrganizationId,
} from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';

interface OrganizationSettingsRow {
  id: string;
  name: string;
  slug: string;
  clerk_org_id: string;
  plan: 'starter' | 'growth' | 'agency';
  notification_email: string | null;
  webhook_url: string | null;
  reminder_30d_email: boolean | null;
  reminder_14d_email: boolean | null;
  reminder_7d_email: boolean | null;
  reminder_30d_sms: boolean | null;
  reminder_14d_sms: boolean | null;
  reminder_7d_sms: boolean | null;
  created_at: string;
}

const settingsSelect = `
  id,
  name,
  slug,
  clerk_org_id,
  plan,
  notification_email,
  webhook_url,
  reminder_30d_email,
  reminder_14d_email,
  reminder_7d_email,
  reminder_30d_sms,
  reminder_14d_sms,
  reminder_7d_sms,
  created_at
`;

function mapSettings(row: OrganizationSettingsRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    clerk_org_id: row.clerk_org_id,
    plan: row.plan,
    notification_email: row.notification_email,
    webhook_url: row.webhook_url,
    reminder_30d_email: row.reminder_30d_email ?? true,
    reminder_14d_email: row.reminder_14d_email ?? true,
    reminder_7d_email: row.reminder_7d_email ?? true,
    reminder_30d_sms: row.reminder_30d_sms ?? false,
    reminder_14d_sms: row.reminder_14d_sms ?? false,
    reminder_7d_sms: row.reminder_7d_sms ?? false,
    created_at: row.created_at,
  };
}

async function loadSettings(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select(settingsSelect)
    .eq('id', orgId)
    .single();

  if (error || !data) {
    throw error ?? new Error('Organization not found.');
  }

  return mapSettings(data as OrganizationSettingsRow);
}

export async function GET(): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);

    return success(await loadSettings(supabase, orgId));
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const body = await request.json().catch(() => null);
    const parsedBody = updateSettingsSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        formatZodError(parsedBody.error),
        'VALIDATION_ERROR',
        400,
      );
    }

    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const updates = Object.fromEntries(
      Object.entries(parsedBody.data).filter(
        ([, value]) => value !== undefined,
      ),
    );

    if (Object.keys(updates).length === 0) {
      return success(await loadSettings(supabase, orgId));
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select(settingsSelect)
      .single();

    if (error || !data) {
      throw error ?? new Error('Organization not found.');
    }

    return success(mapSettings(data as OrganizationSettingsRow));
  } catch (cause) {
    if (cause instanceof SyntaxError) {
      return errorResponse('Invalid JSON body.', 'VALIDATION_ERROR', 400);
    }

    return handleRouteError(cause);
  }
}
