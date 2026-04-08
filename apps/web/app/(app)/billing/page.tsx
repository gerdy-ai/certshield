import { AlertTriangle, CreditCard, Receipt } from 'lucide-react';
import { BillingPageClient } from '@/components/billing/billing-page-client';
import { PageShell, PageShellHeader } from '@/components/layout/page-shell';

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
          {title === 'Billing status' ? <CreditCard className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
        </span>
      </div>
    </article>
  );
}

export default function BillingPage() {
  try {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Billing"
          title="Plan and subscription"
          description="Review the current workspace plan and the Stripe customer and subscription identifiers already available on the organization record."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard
            title="Billing status"
            description="This page reads directly from the authenticated billing status API so plan and Stripe identifiers match backend state."
          />
          <SummaryCard
            title="Current implementation"
            description="The frontend surfaces subscription metadata only and does not add checkout or billing mutation flows."
          />
        </section>

        <BillingPageClient />
      </PageShell>
    );
  } catch {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Billing"
          title="Plan and subscription"
          description="Billing information could not be loaded for this workspace."
        />

        <section className="surface-card p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to load billing</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Verify workspace access and billing route configuration if subscription state remains unavailable.
              </p>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }
}
