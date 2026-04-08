'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, CreditCard, Loader2, RefreshCw, Receipt, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BillingStatus = {
  org_id: string;
  plan: 'starter' | 'growth' | 'agency';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type BillingStatusResponse = {
  data: BillingStatus;
};

type ErrorResponse = {
  error?: string;
};

function formatPlan(plan: BillingStatus['plan']) {
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
}

function getPlanSummary(plan: BillingStatus['plan']) {
  switch (plan) {
    case 'starter':
      return 'Starter workspace with baseline certificate tracking enabled.';
    case 'growth':
      return 'Growth workspace configured for broader operational coverage.';
    case 'agency':
      return 'Agency workspace aligned to higher-volume portfolio management.';
    default:
      return 'Current workspace plan.';
  }
}

function StatusPill({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-secondary text-secondary-foreground',
      )}
    >
      {label}
    </span>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="surface-subtle px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {icon}
        </span>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="break-all text-sm font-medium text-foreground">{value}</p>
        </div>
      </div>
    </article>
  );
}

export function BillingPageClient() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBilling() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/billing/status', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = (await response.json()) as BillingStatusResponse | ErrorResponse;
        const requestError = 'error' in payload ? payload.error : undefined;

        if (!response.ok || !('data' in payload)) {
          throw new Error(requestError ?? 'Unable to load billing status.');
        }

        setBilling(payload.data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setBilling(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load billing status.');
      } finally {
        setLoading(false);
      }
    }

    void loadBilling();

    return () => controller.abort();
  }, [refreshKey]);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
      <div className="surface-card p-5">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Subscription status</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Live billing details for the current organization from the authenticated billing status API.
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
            Loading billing status...
          </div>
        ) : error ? (
          <div className="mt-5 surface-subtle flex items-start gap-3 border-destructive/20 px-4 py-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>{error}</p>
          </div>
        ) : billing ? (
          <div className="space-y-5 pt-5">
            <div className="surface-subtle flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill active={true} label={`${formatPlan(billing.plan)} plan`} />
                  <StatusPill active={Boolean(billing.stripe_subscription_id)} label={billing.stripe_subscription_id ? 'Subscription linked' : 'No subscription id'} />
                  <StatusPill active={Boolean(billing.stripe_customer_id)} label={billing.stripe_customer_id ? 'Customer linked' : 'No customer id'} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{getPlanSummary(billing.plan)}</p>
              </div>
              <div className="rounded-md bg-background px-4 py-3 text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Organization</p>
                <p className="text-sm font-medium text-foreground">{billing.org_id}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailCard
                icon={<BadgeCheck className="h-4 w-4" />}
                label="Plan"
                value={formatPlan(billing.plan)}
              />
              <DetailCard
                icon={<Users className="h-4 w-4" />}
                label="Organization id"
                value={billing.org_id}
              />
              <DetailCard
                icon={<CreditCard className="h-4 w-4" />}
                label="Stripe customer"
                value={billing.stripe_customer_id ?? 'Not linked yet'}
              />
              <DetailCard
                icon={<Receipt className="h-4 w-4" />}
                label="Stripe subscription"
                value={billing.stripe_subscription_id ?? 'Not linked yet'}
              />
            </div>
          </div>
        ) : null}
      </div>

      <aside className="surface-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Current scope</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              The frontend reflects billing data already stored on the organization record. It does not introduce checkout, portal, or mutation flows.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="surface-subtle px-4 py-4">
            <p className="text-sm font-medium text-foreground">Production note</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Stripe identifiers can be absent before the first successful subscription lifecycle event. This view keeps that state explicit instead of assuming a linked account.
            </p>
          </div>
        </div>
      </aside>
    </section>
  );
}
