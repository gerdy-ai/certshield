import { AlertTriangle, FileSearch, ShieldCheck } from 'lucide-react';
import { PageShell, PageShellHeader } from '@/components/layout/page-shell';
import { CertificatesPageClient } from '@/components/certificates/certificates-page-client';

function SummaryCard({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {title === 'Certificates' ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <FileSearch className="h-5 w-5" />
          )}
        </span>
      </div>
    </article>
  );
}

export default function CertificatesPage() {
  try {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Certificates"
          title="Certificate inventory"
          description="Filter the live certificate feed, inspect extracted metadata, and open the signed file for the selected record."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard
            title="Certificates"
            description="Table results come from the authenticated certificates API so filters stay aligned with backend query behavior."
          />
          <SummaryCard
            title="Review flow"
            description="Open a certificate row to inspect parsed fields, expiration details, and the secure signed file link."
          />
        </section>

        <CertificatesPageClient />
      </PageShell>
    );
  } catch {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Certificates"
          title="Certificate inventory"
          description="Certificate records could not be loaded for this workspace."
        />

        <section className="surface-card p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to load certificates</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Verify workspace access and backend configuration if certificate data remains unavailable.
              </p>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }
}
