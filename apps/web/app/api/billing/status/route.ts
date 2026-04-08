import { getAuthOrg } from '@/lib/auth';
import { success } from '@/lib/api-response';
import { handleRouteError, resolveOrganizationId } from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';

interface BillingStatusRow {
  id: string;
  plan: 'starter' | 'growth' | 'agency';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export async function GET(): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const { data, error } = await supabase
      .from('organizations')
      .select('id, plan, stripe_customer_id, stripe_subscription_id')
      .eq('id', orgId)
      .single();

    if (error || !data) {
      throw error ?? new Error('Organization not found.');
    }

    const billingStatus = data as BillingStatusRow;

    return success({
      org_id: billingStatus.id,
      plan: billingStatus.plan,
      stripe_customer_id: billingStatus.stripe_customer_id,
      stripe_subscription_id: billingStatus.stripe_subscription_id,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
