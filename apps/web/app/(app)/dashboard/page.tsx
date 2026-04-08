import { PageShell, PageShellHeader } from '@/components/layout/page-shell';

export default function DashboardPage() {
  return (
    <PageShell>
      <PageShellHeader
        eyebrow="Dashboard"
        title="Workspace shell is in place."
        description="Backend routes are available. Dashboard metrics and attention queues can layer on top of this structure in the next milestone."
      />

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Next frontend slice</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build the dashboard overview against the existing APIs for stats,
            certificates, reminders, and subcontractors without changing backend behavior.
          </p>
        </div>
        <div className="surface-card p-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80">
            Ready APIs
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>`/api/dashboard/stats`</li>
            <li>`/api/certificates`</li>
            <li>`/api/subcontractors`</li>
            <li>`/api/reminders`</li>
            <li>`/api/settings`</li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
