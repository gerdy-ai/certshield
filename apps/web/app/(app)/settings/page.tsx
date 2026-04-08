import { AlertTriangle, Bell, Settings2 } from 'lucide-react';
import { PageShell, PageShellHeader } from '@/components/layout/page-shell';
import { SettingsPageClient } from '@/components/settings/settings-page-client';

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
          {title === 'Organization settings' ? <Settings2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
      </div>
    </article>
  );
}

export default function SettingsPage() {
  try {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Settings"
          title="Workspace settings"
          description="Manage editable organization-level notification settings and review how the current workspace is configured."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard
            title="Organization settings"
            description="This screen updates only the settings fields already supported by the authenticated settings API."
          />
          <SummaryCard
            title="Reminder coordination"
            description="Reminder lead-time toggles stay on the reminders page so settings workflows remain separated without expanding backend scope."
          />
        </section>

        <SettingsPageClient />
      </PageShell>
    );
  } catch {
    return (
      <PageShell>
        <PageShellHeader
          eyebrow="Settings"
          title="Workspace settings"
          description="Workspace settings could not be loaded for this organization."
        />

        <section className="surface-card p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to load settings</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Verify workspace access and the existing settings route configuration if this page remains unavailable.
              </p>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }
}
