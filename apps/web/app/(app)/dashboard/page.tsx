import type { CertStatus } from '../../../../../shared/types';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  FileWarning,
} from 'lucide-react';
import { PageShell, PageShellHeader } from '@/components/layout/page-shell';
import { getAuthOrg } from '@/lib/auth';
import { getCertificateStatus, resolveOrganizationId } from '@/lib/api-route';
import { createUserClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type SupabaseClient = Awaited<ReturnType<typeof createUserClient>>;

type DashboardStats = {
  active_certs: number;
  expired: number;
  expiring_soon: number;
  total_subs: number;
};

type AttentionSummary = {
  items: AttentionItem[];
  pendingCount: number;
};

type AttentionItem = {
  id: string;
  file_name: string;
  expiration_date: string | null;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';
  subcontractor_name: string;
  status: Extract<CertStatus, 'expired' | 'expiring_soon' | 'pending'>;
  uploaded_at: string;
};

type CertificateAttentionRow = {
  id: string;
  file_name: string;
  uploaded_at: string;
  expiration_date: string | null;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';
  subcontractors:
    | {
        first_name: string;
        last_name: string;
        company_name: string;
      }
    | {
        first_name: string;
        last_name: string;
        company_name: string;
      }[]
    | null;
};

function getDateBounds() {
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);
  const soonDate = new Date(today);
  soonDate.setDate(soonDate.getDate() + 30);

  return {
    todayString,
    soonString: soonDate.toISOString().slice(0, 10),
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Awaiting expiration date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatSubcontractorName(row: CertificateAttentionRow) {
  const subcontractor = Array.isArray(row.subcontractors)
    ? row.subcontractors[0]
    : row.subcontractors;

  if (!subcontractor) {
    return 'Unknown subcontractor';
  }

  return subcontractor.company_name || `${subcontractor.first_name} ${subcontractor.last_name}`.trim();
}

async function getDashboardStats(supabase: SupabaseClient, orgId: string): Promise<DashboardStats> {
  const { todayString, soonString } = getDateBounds();
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

  const failedResult = [
    totalSubsResult,
    activeCertsResult,
    expiringSoonResult,
    expiredResult,
  ].find((result) => result.error);

  if (failedResult?.error) {
    throw failedResult.error;
  }

  return {
    total_subs: totalSubsResult.count ?? 0,
    active_certs: activeCertsResult.count ?? 0,
    expiring_soon: expiringSoonResult.count ?? 0,
    expired: expiredResult.count ?? 0,
  };
}

async function getAttentionSummary(
  supabase: SupabaseClient,
  orgId: string,
): Promise<AttentionSummary> {
  const { todayString, soonString } = getDateBounds();
  const baseSelect = `
    id,
    file_name,
    uploaded_at,
    expiration_date,
    parse_status,
    subcontractors!inner (
      first_name,
      last_name,
      company_name
    )
  `;

  const [expiredResult, expiringSoonResult, pendingResult, pendingCountResult] = await Promise.all([
    supabase
      .from('certificates')
      .select(baseSelect)
      .eq('org_id', orgId)
      .lt('expiration_date', todayString)
      .order('expiration_date', { ascending: true })
      .limit(4),
    supabase
      .from('certificates')
      .select(baseSelect)
      .eq('org_id', orgId)
      .gte('expiration_date', todayString)
      .lte('expiration_date', soonString)
      .order('expiration_date', { ascending: true })
      .limit(4),
    supabase
      .from('certificates')
      .select(baseSelect)
      .eq('org_id', orgId)
      .is('expiration_date', null)
      .order('uploaded_at', { ascending: false })
      .limit(4),
    supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .is('expiration_date', null),
  ]);

  const failedResult = [expiredResult, expiringSoonResult, pendingResult, pendingCountResult].find(
    (result) => result.error,
  );

  if (failedResult?.error) {
    throw failedResult.error;
  }

  const items = [
    ...((expiredResult.data ?? []) as CertificateAttentionRow[]).map((row) => ({
      id: row.id,
      file_name: row.file_name,
      expiration_date: row.expiration_date,
      parse_status: row.parse_status,
      subcontractor_name: formatSubcontractorName(row),
      status: 'expired' as const,
      uploaded_at: row.uploaded_at,
    })),
    ...((expiringSoonResult.data ?? []) as CertificateAttentionRow[]).map((row) => ({
      id: row.id,
      file_name: row.file_name,
      expiration_date: row.expiration_date,
      parse_status: row.parse_status,
      subcontractor_name: formatSubcontractorName(row),
      status: 'expiring_soon' as const,
      uploaded_at: row.uploaded_at,
    })),
    ...((pendingResult.data ?? []) as CertificateAttentionRow[]).map((row) => ({
      id: row.id,
      file_name: row.file_name,
      expiration_date: row.expiration_date,
      parse_status: row.parse_status,
      subcontractor_name: formatSubcontractorName(row),
      status: getCertificateStatus(row.expiration_date) as 'pending',
      uploaded_at: row.uploaded_at,
    })),
  ];

  const priority: Record<AttentionItem['status'], number> = {
    expired: 0,
    expiring_soon: 1,
    pending: 2,
  };

  return {
    items: items
      .sort((left, right) => {
        const priorityDiff = priority[left.status] - priority[right.status];

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        if (left.expiration_date && right.expiration_date) {
          return left.expiration_date.localeCompare(right.expiration_date);
        }

        return right.uploaded_at.localeCompare(left.uploaded_at);
      })
      .slice(0, 8),
    pendingCount: pendingCountResult.count ?? 0,
  };
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  detail: string;
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: AttentionItem['status'] }) {
  const labelMap: Record<AttentionItem['status'], string> = {
    expired: 'Expired',
    expiring_soon: 'Expiring soon',
    pending: 'Pending review',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'expired' && 'bg-destructive/10 text-destructive',
        status === 'expiring_soon' && 'bg-amber-100 text-amber-800',
        status === 'pending' && 'bg-secondary text-secondary-foreground',
      )}
    >
      {labelMap[status]}
    </span>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const expirationLabel =
    item.status === 'pending'
      ? 'Missing expiration date'
      : item.status === 'expired'
        ? `Expired ${formatDate(item.expiration_date)}`
        : `Expires ${formatDate(item.expiration_date)}`;

  return (
    <tr className="border-t border-border/80">
      <td className="px-4 py-4 align-top sm:px-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{item.subcontractor_name}</p>
          <p className="text-sm text-muted-foreground">{item.file_name}</p>
        </div>
      </td>
      <td className="px-4 py-4 align-top sm:px-5">
        <div className="space-y-2">
          <StatusBadge status={item.status} />
          <p className="text-sm text-muted-foreground">{expirationLabel}</p>
        </div>
      </td>
      <td className="px-4 py-4 align-top text-sm text-muted-foreground sm:px-5">
        <div className="space-y-1">
          <p>Parse: {item.parse_status}</p>
          <p>Uploaded {formatDateTime(item.uploaded_at)}</p>
        </div>
      </td>
    </tr>
  );
}

export default async function DashboardPage() {
  try {
    const { orgId: clerkOrgId } = await getAuthOrg();
    const supabase = await createUserClient();
    const orgId = await resolveOrganizationId(supabase, clerkOrgId);
    const [stats, attentionSummary] = await Promise.all([
      getDashboardStats(supabase, orgId),
      getAttentionSummary(supabase, orgId),
    ]);
    const needsAttentionCount = stats.expired + stats.expiring_soon + attentionSummary.pendingCount;
    const attentionItems = attentionSummary.items;

    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Dashboard"
          title="Certificate overview"
          description="Track portfolio health, monitor renewals approaching within 30 days, and identify certificates that still need review."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Subcontractors"
            value={stats.total_subs}
            detail="Active subcontractor records in the current workspace."
            icon={Building2}
          />
          <MetricCard
            label="Active certificates"
            value={stats.active_certs}
            detail="Certificates clear beyond the next 30-day renewal window."
            icon={CheckCircle2}
          />
          <MetricCard
            label="Expiring soon"
            value={stats.expiring_soon}
            detail="Certificates reaching expiration in the next 30 days."
            icon={Clock3}
          />
          <MetricCard
            label="Expired"
            value={stats.expired}
            detail="Certificates already past expiration and needing immediate follow-up."
            icon={AlertTriangle}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_0.75fr]">
          <div className="surface-card overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-border/80 px-4 py-4 sm:px-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Needs attention</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Expired, expiring, and pending certificates surfaced from current backend data.
                </p>
              </div>
              <div className="rounded-md bg-secondary px-3 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Open issues
                </p>
                <p className="text-lg font-semibold text-foreground">{needsAttentionCount}</p>
              </div>
            </div>

            {attentionItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                        Subcontractor
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                        Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionItems.map((item) => (
                      <AttentionRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-10 text-center sm:px-5">
                <p className="text-sm font-medium text-foreground">No certificates need attention.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Expired, expiring soon, and pending items will appear here when they exist.
                </p>
              </div>
            )}
          </div>

          <aside className="surface-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <FileWarning className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Focus summary</h2>
                <p className="text-sm text-muted-foreground">Current renewal pressure across the workspace.</p>
              </div>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div className="surface-subtle flex items-center justify-between px-4 py-3">
                <dt className="text-muted-foreground">Immediate escalations</dt>
                <dd className="font-semibold text-foreground">{stats.expired}</dd>
              </div>
              <div className="surface-subtle flex items-center justify-between px-4 py-3">
                <dt className="text-muted-foreground">30-day renewals</dt>
                <dd className="font-semibold text-foreground">{stats.expiring_soon}</dd>
              </div>
              <div className="surface-subtle flex items-center justify-between px-4 py-3">
                <dt className="text-muted-foreground">Pending certificate review</dt>
                <dd className="font-semibold text-foreground">{attentionSummary.pendingCount}</dd>
              </div>
            </dl>

            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              This slice stays intentionally narrow: overview metrics and a triage queue now exist,
              while detail management pages remain in later frontend tasks.
            </p>
          </aside>
        </section>
      </PageShell>
    );
  } catch {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Dashboard"
          title="Certificate overview"
          description="Dashboard data could not be loaded for this workspace."
        />

        <section className="surface-card p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to load overview data</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                The page depends on the authenticated dashboard and certificate data sources.
                Verify workspace membership and backend environment configuration if this persists.
              </p>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }
}
