import { AlertTriangle, BellRing, MailCheck } from 'lucide-react';
import { PageShell, PageShellHeader } from '@/components/layout/page-shell';
import { RemindersPageClient } from '@/components/reminders/reminders-page-client';

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
          {title === 'Reminder log' ? <BellRing className="h-5 w-5" /> : <MailCheck className="h-5 w-5" />}
        </span>
      </div>
    </article>
  );
}

export default function RemindersPage() {
  try {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Reminders"
          title="Reminder delivery"
          description="Review reminder attempts for expiring certificates and update the active email and SMS lead-time settings for this workspace."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard
            title="Reminder log"
            description="The activity table reads directly from the authenticated reminders API so the page reflects backend delivery history."
          />
          <SummaryCard
            title="Delivery settings"
            description="The settings panel updates only the existing organization reminder fields required for reminder scheduling."
          />
        </section>

        <RemindersPageClient />
      </PageShell>
    );
  } catch {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Reminders"
          title="Reminder delivery"
          description="Reminder activity could not be loaded for this workspace."
        />

        <section className="surface-card p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to load reminders</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Verify workspace access and reminder route configuration if reminder data remains unavailable.
              </p>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }
}
