'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Mail, RefreshCw, Settings2, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SettingsResponse = {
  data: OrganizationSettings;
};

type ErrorResponse = {
  error?: string;
};

type OrganizationSettings = {
  id: string;
  name: string;
  slug: string;
  clerk_org_id: string;
  plan: 'starter' | 'growth' | 'agency';
  notification_email: string | null;
  webhook_url: string | null;
  reminder_30d_email: boolean;
  reminder_14d_email: boolean;
  reminder_7d_email: boolean;
  reminder_30d_sms: boolean;
  reminder_14d_sms: boolean;
  reminder_7d_sms: boolean;
  created_at: string;
};

type EditableSettings = Pick<OrganizationSettings, 'notification_email' | 'webhook_url'>;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatPlan(plan: OrganizationSettings['plan']) {
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        props.className,
      )}
    />
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="surface-subtle px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </article>
  );
}

export function SettingsPageClient() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [draft, setDraft] = useState<EditableSettings | null>(null);
  const [savedDraft, setSavedDraft] = useState<EditableSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isDirty = useMemo(() => {
    if (!draft || !savedDraft) {
      return false;
    }

    return draft.notification_email !== savedDraft.notification_email || draft.webhook_url !== savedDraft.webhook_url;
  }, [draft, savedDraft]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/settings', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = (await response.json()) as SettingsResponse | ErrorResponse;
        const requestError = 'error' in payload ? payload.error : undefined;

        if (!response.ok || !('data' in payload)) {
          throw new Error(requestError ?? 'Unable to load organization settings.');
        }

        const nextDraft = {
          notification_email: payload.data.notification_email,
          webhook_url: payload.data.webhook_url,
        };

        setSettings(payload.data);
        setDraft(nextDraft);
        setSavedDraft(nextDraft);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setSettings(null);
        setDraft(null);
        setSavedDraft(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load organization settings.');
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();

    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }

    const timeout = window.setTimeout(() => setSaveSuccess(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [saveSuccess]);

  function updateDraft(key: keyof EditableSettings, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setSaveError(null);
    setSaveSuccess(null);
  }

  function resetDraft() {
    if (!savedDraft) {
      return;
    }

    setDraft(savedDraft);
    setSaveError(null);
    setSaveSuccess(null);
  }

  async function saveSettings() {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json().catch(() => null)) as SettingsResponse | ErrorResponse | null;

      if (!response.ok || !payload || !('data' in payload)) {
        throw new Error(payload && 'error' in payload ? payload.error ?? 'Unable to save settings.' : 'Unable to save settings.');
      }

      const nextDraft = {
        notification_email: payload.data.notification_email,
        webhook_url: payload.data.webhook_url,
      };

      setSettings(payload.data);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setSaveSuccess('Organization settings saved.');
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)]">
      <div className="surface-card p-5">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Organization settings</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Update the editable workspace-level notification fields already supported by the existing settings API.
            </p>
          </div>
          <Button
            disabled={loading}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading organization settings...
          </div>
        ) : error ? (
          <div className="mt-5 surface-subtle flex items-start gap-3 border-destructive/20 px-4 py-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>{error}</p>
          </div>
        ) : settings && draft ? (
          <div className="space-y-5 pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard label="Organization name" value={settings.name} />
              <MetricCard label="Workspace slug" value={settings.slug} />
              <MetricCard label="Current plan" value={formatPlan(settings.plan)} />
              <MetricCard label="Created" value={formatDateTime(settings.created_at)} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  Notification email
                </span>
                <Input
                  placeholder="ops@example.com"
                  type="email"
                  value={draft.notification_email ?? ''}
                  onChange={(event) => updateDraft('notification_email', event.target.value)}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  Workspace notifications route to this address when provided.
                </p>
              </label>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Webhook className="h-4 w-4 text-primary" />
                  Webhook URL
                </span>
                <Input
                  placeholder="https://example.com/certshield"
                  type="url"
                  value={draft.webhook_url ?? ''}
                  onChange={(event) => updateDraft('webhook_url', event.target.value)}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  Leave blank to disable outgoing webhook delivery for this organization.
                </p>
              </label>
            </div>

            {saveError ? (
              <div className="surface-subtle flex items-start gap-3 border-destructive/20 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <p>{saveError}</p>
              </div>
            ) : null}

            {saveSuccess ? (
              <div className="surface-subtle flex items-start gap-3 border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                <Check className="mt-0.5 h-4 w-4" />
                <p>{saveSuccess}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!isDirty || isSaving} type="button" onClick={() => void saveSettings()}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save settings'}
              </Button>
              <Button disabled={!isDirty || isSaving} type="button" variant="outline" onClick={resetDraft}>
                Reset
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="surface-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Settings2 className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Scope</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              This page stays on the current backend contract. It edits notification fields and leaves reminder timing controls on the reminders page.
            </p>
          </div>
        </div>

        {settings ? (
          <div className="mt-5 space-y-4">
            <div className="surface-subtle px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Reminder channels</p>
              <div className="mt-3 grid gap-2 text-sm text-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Email reminders enabled</span>
                  <span className="font-medium">
                    {Number(settings.reminder_30d_email) + Number(settings.reminder_14d_email) + Number(settings.reminder_7d_email)} / 3
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>SMS reminders enabled</span>
                  <span className="font-medium">
                    {Number(settings.reminder_30d_sms) + Number(settings.reminder_14d_sms) + Number(settings.reminder_7d_sms)} / 3
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              Reminder lead-time toggles already use the same settings resource on the dedicated reminders screen, so this page avoids duplicating that workflow.
            </p>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
