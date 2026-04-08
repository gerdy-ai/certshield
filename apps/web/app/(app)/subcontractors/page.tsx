import type { CertStatus } from '../../../../../shared/types';
import { AlertTriangle, Building2, ShieldCheck } from 'lucide-react';
import { PageShell, PageShellHeader } from '@/components/layout/page-shell';
import {
  SubcontractorsPageClient,
  type SubcontractorListItem,
} from '@/components/subcontractors/subcontractors-page-client';
import { getAuthOrg } from '@/lib/auth';
import { getCertificateStatus, resolveOrganizationId } from '@/lib/api-route';
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

function mapSubcontractor(item: SubcontractorRow): SubcontractorListItem {
  const latestCertificate = item.certificates?.[0] ?? null;
  const latestStatus: CertStatus = latestCertificate
    ? getCertificateStatus(latestCertificate.expiration_date)
    : 'pending';

  return {
    id: item.id,
    company_name: item.company_name,
    first_name: item.first_name,
    last_name: item.last_name,
    email: item.email,
    created_at: item.created_at,
    upload_token: item.upload_token,
    latest_certificate_status: latestStatus,
    ...(item.phone ? { phone: item.phone } : {}),
    latest_certificate: latestCertificate
      ? {
          id: latestCertificate.id,
          expiration_date: latestCertificate.expiration_date,
          parse_status: latestCertificate.parse_status,
          status: latestStatus,
          uploaded_at: latestCertificate.uploaded_at,
        }
      : null,
  };
}

async function getSubcontractors(): Promise<SubcontractorListItem[]> {
  const { orgId: clerkOrgId } = await getAuthOrg();
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

  if (error) {
    throw error;
  }

  return ((data ?? []) as SubcontractorRow[]).map(mapSubcontractor);
}

function SummaryCard({
  description,
  title,
  value,
}: {
  description: string;
  title: string;
  value: number;
}) {
  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {title === 'Subcontractors' ? (
            <Building2 className="h-5 w-5" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
        </span>
      </div>
    </article>
  );
}

export default async function SubcontractorsPage() {
  try {
    const subcontractors = await getSubcontractors();
    const withCertificates = subcontractors.filter((item) => item.latest_certificate !== null).length;

    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Subcontractors"
          title="Subcontractor management"
          description="Review active subcontractors, inspect contact records, and open certificate detail from a persistent side panel."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard
            title="Subcontractors"
            value={subcontractors.length}
            description="Workspace subcontractor records currently available for certificate tracking."
          />
          <SummaryCard
            title="With certificates"
            value={withCertificates}
            description="Subcontractors that already have at least one uploaded certificate on file."
          />
        </section>

        <SubcontractorsPageClient subcontractors={subcontractors} />
      </PageShell>
    );
  } catch {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Subcontractors"
          title="Subcontractor management"
          description="Subcontractor records could not be loaded for this workspace."
        />

        <section className="surface-card p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to load subcontractors</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                The roster depends on the authenticated workspace and subcontractor data sources.
                Verify workspace membership and backend environment configuration if this persists.
              </p>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }
}
