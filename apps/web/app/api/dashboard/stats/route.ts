import { getAuthOrg } from '@/lib/auth';
import { handleRouteError, resolveOrganizationId } from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';

export async function GET(): Promise<Response> {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);
    const soonDate = new Date(today);
    soonDate.setDate(soonDate.getDate() + 30);
    const soonString = soonDate.toISOString().slice(0, 10);

    const [
      totalSubsResult,
      activeCertsResult,
      expiringSoonResult,
      expiredResult,
    ] = await Promise.all([
      supabase
        .from('subcontractors')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('deleted_at', null),
      supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gt('expiration_date', soonString),
      supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('expiration_date', todayString)
        .lte('expiration_date', soonString),
      supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .lt('expiration_date', todayString),
    ]);

    const results = [totalSubsResult, activeCertsResult, expiringSoonResult, expiredResult];
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      throw failedResult.error;
    }

    return Response.json({
      total_subs: totalSubsResult.count ?? 0,
      active_certs: activeCertsResult.count ?? 0,
      expiring_soon: expiringSoonResult.count ?? 0,
      expired: expiredResult.count ?? 0,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
