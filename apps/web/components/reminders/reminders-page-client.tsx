'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Check, Loader2, Mail, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

type ReminderChannel = 'email' | 'sms';
type ReminderSettingKey =
  | 'reminder_30d_email'
  | 'reminder_14d_email'
  | 'reminder_7d_email'
  | 'reminder_30d_sms'
  | 'reminder_14d_sms'
  | 'reminder_7d_sms';

type ReminderLogItem = {
  id: string;
  reminder_type: ReminderChannel;
  days_before_expiry: number;
  sent_at: string;
  success: boolean;
  error_message?: string;
  certificate: {
    file_name: string;
    expiration_date?: string;
  } | null;
  subcontractor: {
    first_name: string;
    last_name: string;
    company_name: string;
    email: string;
  } | null;
};

type ReminderLogResponse = {
  data: ReminderLogItem[];
  total: number;
  page: number;
  limit: number;
};

type ReminderSettings = {
  reminder_30d_email: boolean;
  reminder_14d_email: boolean;
  reminder_7d_email: boolean;
  reminder_30d_sms: boolean;
  reminder_14d_sms: boolean;
  reminder_7d_sms: boolean;
};

type SettingsResponse = {
  data: ReminderSettings;
};

type ErrorResponse = {
  error?: string;
};

const PAGE_SIZE = 20;

const reminderSettingsConfig: Array<{
  days: 30 | 14 | 7;
  copy: string;
  emailKey: Extract<ReminderSettingKey, `reminder_${30 | 14 | 7}d_email`>;
  smsKey: Extract<ReminderSettingKey, `reminder_${30 | 14 | 7}d_sms`>;
}> = [
  { days: 30, copy: 'Early notice for renewals that need planning time.', emailKey: 'reminder_30d_email', smsKey: 'reminder_30d_sms' },
  { days: 14, copy: 'Mid-cycle follow-up before expiration gets close.', emailKey: 'reminder_14d_email', smsKey: 'reminder_14d_sms' },
  { days: 7, copy: 'Final reminder window for high-risk upcoming expirations.', emailKey: 'reminder_7d_email', smsKey: 'reminder_7d_sms' },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatSubcontractorName(item: ReminderLogItem['subcontractor']) {
  if (!item) {
    return 'Unknown subcontractor';
  }

  const contactName = `${item.first_name} ${item.last_name}`.trim();
  return item.company_name || contactName || 'Unknown subcontractor';
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-4 w-4 rounded border border-input text-primary shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        props.className,
      )}
    />
  );
}

function ChannelBadge({ channel }: { channel: ReminderChannel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        channel === 'email' && 'bg-primary/10 text-primary',
        channel === 'sms' && 'bg-secondary text-secondary-foreground',
      )}
    >
      {channel === 'email' ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
      {channel === 'email' ? 'Email' : 'SMS'}
    </span>
  );
}

function ResultBadge({
  errorMessage,
  success,
}: {
  errorMessage: string | undefined;
  success: boolean;
}) {
  return (
    <div className="space-y-1">
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
          success ? 'bg-emerald-100 text-emerald-800' : 'bg-destructive/10 text-destructive',
        )}
      >
        {success ? 'Sent' : 'Failed'}
      </span>
      {!success && errorMessage ? (
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export function RemindersPageClient() {
  const [logs, setLogs] = useState<ReminderLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<ReminderSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  const settingsDirty = useMemo(() => {
    if (!settings || !savedSettings) {
      return false;
    }

    return (Object.keys(settings) as ReminderSettingKey[]).some((key) => settings[key] !== savedSettings[key]);
  }, [savedSettings, settings]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLogs() {
      setLogsLoading(true);
      setLogsError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        const response = await fetch(`/api/reminders?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = (await response.json()) as ReminderLogResponse | ErrorResponse;
        const requestError = 'error' in payload ? payload.error : undefined;

        if (!response.ok || !('data' in payload)) {
          throw new Error(requestError ?? 'Unable to load reminder activity.');
        }

        setLogs(payload.data);
        setTotal(payload.total);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setLogs([]);
        setTotal(0);
        setLogsError(error instanceof Error ? error.message : 'Unable to load reminder activity.');
      } finally {
        setLogsLoading(false);
      }
    }

    void loadLogs();

    return () => controller.abort();
  }, [logsRefreshKey, page]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      setSettingsLoading(true);
      setSettingsError(null);

      try {
        const response = await fetch('/api/settings', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = (await response.json()) as SettingsResponse | ErrorResponse;
        const requestError = 'error' in payload ? payload.error : undefined;

        if (!response.ok || !('data' in payload)) {
          throw new Error(requestError ?? 'Unable to load reminder settings.');
        }

        setSettings(payload.data);
        setSavedSettings(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSettings(null);
        setSavedSettings(null);
        setSettingsError(error instanceof Error ? error.message : 'Unable to load reminder settings.');
      } finally {
        setSettingsLoading(false);
      }
    }

    void loadSettings();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }

    const timeout = window.setTimeout(() => setSaveSuccess(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [saveSuccess]);

  function updateSetting(key: ReminderSettingKey, value: boolean) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setSaveError(null);
    setSaveSuccess(null);
  }

  function resetSettings() {
    if (!savedSettings) {
      return;
    }

    setSettings(savedSettings);
    setSaveError(null);
    setSaveSuccess(null);
  }

  async function handleSaveSettings() {
    if (!settings) {
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
        body: JSON.stringify(settings),
      });
      const payload = (await response.json().catch(() => null)) as SettingsResponse | ErrorResponse | null;

      if (!response.ok || !payload || !('data' in payload)) {
        throw new Error(payload && 'error' in payload ? payload.error ?? 'Unable to save reminder settings.' : 'Unable to save reminder settings.');
      }

      setSettings(payload.data);
      setSavedSettings(payload.data);
      setSaveSuccess('Reminder settings saved.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save reminder settings.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <div className="surface-card overflow-hidden">
        <div className="border-b border-border/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Reminder activity</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Live delivery attempts from the authenticated reminders API, ordered from most recent to oldest.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                disabled={logsLoading}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => {
                  setPage(1);
                  setLogsRefreshKey((current) => current + 1);
                }}
              >
                <RefreshCw className={cn('h-4 w-4', logsLoading && 'animate-spin')} />
                Refresh
              </Button>
              <div className="rounded-md bg-secondary px-3 py-2 text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total attempts</p>
                <p className="text-lg font-semibold text-foreground">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center gap-3 px-4 py-14 text-sm text-muted-foreground sm:px-5">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reminder activity for this workspace.
          </div>
        ) : logsError ? (
          <div className="px-4 py-8 sm:px-5">
            <div className="surface-subtle flex items-start gap-3 border-destructive/20 px-4 py-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p>{logsError}</p>
            </div>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Reminder
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Certificate
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Result
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Sent at
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-border/80 align-top transition-colors hover:bg-background/70">
                      <td className="px-4 py-4 sm:px-5">
                        <div className="space-y-2">
                          <ChannelBadge channel={log.reminder_type} />
                          <p className="text-sm font-medium text-foreground">
                            {log.days_before_expiry} days before expiry
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-foreground">{formatSubcontractorName(log.subcontractor)}</p>
                          <p className="text-muted-foreground">
                            {log.subcontractor?.email ?? 'No contact email on record'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-foreground">
                            {log.certificate?.file_name ?? 'Unknown certificate'}
                          </p>
                          <p className="text-muted-foreground">
                            Expires {formatDateOnly(log.certificate?.expiration_date)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <ResultBadge errorMessage={log.error_message} success={log.success} />
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                        {formatDateTime(log.sent_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom}-{showingTo} of {total} reminder attempts.
              </p>
              <div className="flex items-center gap-2">
                <Button disabled={page <= 1 || logsLoading} size="sm" variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <div className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                  Page {page} of {totalPages}
                </div>
                <Button
                  disabled={page >= totalPages || logsLoading}
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-4 py-8 sm:px-5">
            <EmptyState
              icon={Bell}
              title="No reminder activity yet"
              description="Reminder attempts will appear here after daily jobs evaluate expiring certificates."
            />
          </div>
        )}
      </div>

      <aside className="surface-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Bell className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Reminder settings</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Update the existing organization reminder fields without expanding the broader settings surface.
            </p>
          </div>
        </div>

        {settingsLoading ? (
          <div className="mt-5 surface-subtle flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reminder settings...
          </div>
        ) : settingsError ? (
          <div className="mt-5 surface-subtle flex items-start gap-3 border-destructive/20 px-4 py-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>{settingsError}</p>
          </div>
        ) : settings ? (
          <>
            <div className="mt-5 overflow-hidden rounded-lg border border-border/80">
              <div className="grid grid-cols-[minmax(0,1.2fr)_120px_120px] bg-muted/50">
                <div className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Lead time
                </div>
                <div className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </div>
                <div className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  SMS
                </div>
              </div>

              {reminderSettingsConfig.map((item, index) => (
                <div
                  key={item.days}
                  className={cn(
                    'grid grid-cols-[minmax(0,1.2fr)_120px_120px]',
                    index > 0 && 'border-t border-border/80',
                  )}
                >
                  <div className="px-4 py-4">
                    <p className="text-sm font-medium text-foreground">{item.days}-day reminder</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                  </div>
                  <label className="flex items-center justify-center px-4 py-4">
                    <span className="sr-only">{item.days}-day email reminder</span>
                    <Input
                      checked={settings[item.emailKey]}
                      type="checkbox"
                      onChange={(event) => updateSetting(item.emailKey, event.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-center px-4 py-4">
                    <span className="sr-only">{item.days}-day sms reminder</span>
                    <Input
                      checked={settings[item.smsKey]}
                      type="checkbox"
                      onChange={(event) => updateSetting(item.smsKey, event.target.checked)}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
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
                <Button
                  disabled={!settingsDirty || isSaving}
                  type="button"
                  onClick={() => void handleSaveSettings()}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isSaving ? 'Saving...' : 'Save settings'}
                </Button>
                <Button disabled={!settingsDirty || isSaving} type="button" variant="outline" onClick={resetSettings}>
                  Reset
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Changes apply to the current organization only and use the existing `PATCH /api/settings` contract.
              </p>
            </div>
          </>
        ) : null}
      </aside>
    </section>
  );
}
