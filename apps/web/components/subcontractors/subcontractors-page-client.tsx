'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CertStatus } from '../../../../shared/types';
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LatestCertificate = {
  id: string;
  expiration_date: string | null;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';
  status: CertStatus;
  uploaded_at: string;
};

export type SubcontractorListItem = {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  created_at: string;
  upload_token: string;
  latest_certificate_status: CertStatus;
  latest_certificate: LatestCertificate | null;
};

type CertificateDetail = {
  id: string;
  file_name: string;
  uploaded_at: string;
  parsed_at: string | null;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';
  insurer_name: string | null;
  policy_number: string | null;
  policy_type: string | null;
  coverage_amount: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  certificate_holder: string | null;
  additional_insured: boolean | null;
  status: CertStatus;
};

type SubcontractorDetail = {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  created_at: string;
  upload_token: string;
  certificates: CertificateDetail[];
};

type SubcontractorDetailResponse = {
  data: SubcontractorDetail;
};

type DetailState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: SubcontractorDetail; error: null }
  | { status: 'error'; data: null; error: string };

function formatDisplayName(item: Pick<SubcontractorListItem, 'company_name' | 'first_name' | 'last_name'>) {
  return item.company_name || `${item.first_name} ${item.last_name}`.trim() || 'Unnamed subcontractor';
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return 'Pending review';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatCoverageAmount(value: number | null) {
  if (typeof value !== 'number') {
    return 'Not extracted';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusCopy(status: CertStatus) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expiring_soon':
      return 'Expiring soon';
    case 'expired':
      return 'Expired';
    case 'pending':
      return 'Pending review';
    default:
      return status;
  }
}

function StatusBadge({ status }: { status: CertStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'active' && 'bg-emerald-100 text-emerald-800',
        status === 'expiring_soon' && 'bg-amber-100 text-amber-800',
        status === 'expired' && 'bg-destructive/10 text-destructive',
        status === 'pending' && 'bg-secondary text-secondary-foreground',
      )}
    >
      {getStatusCopy(status)}
    </span>
  );
}

function EmptyDrawerState() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background/40 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <ChevronRight className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">Select a subcontractor</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Choose a row to inspect contact details and the latest certificate history in the side panel.
      </p>
    </div>
  );
}

function DrawerContent({
  item,
  state,
  onClose,
}: {
  item: SubcontractorListItem;
  state: DetailState;
  onClose: () => void;
}) {
  return (
    <aside className="surface-card flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Subcontractor detail
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {formatDisplayName(item)}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={item.latest_certificate_status} />
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              Added {formatDate(item.created_at)}
            </span>
          </div>
        </div>
        <Button aria-label="Close detail panel" size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="surface-subtle px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Primary contact</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {`${item.first_name} ${item.last_name}`.trim() || 'Not provided'}
            </p>
          </div>
          <div className="surface-subtle px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Upload token</p>
            <p className="mt-2 break-all font-mono text-xs text-foreground">{item.upload_token}</p>
          </div>
          <div className="surface-subtle px-4 py-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Email
            </p>
            <p className="mt-2 text-sm text-foreground">{item.email}</p>
          </div>
          <div className="surface-subtle px-4 py-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </p>
            <p className="mt-2 text-sm text-foreground">{item.phone ?? 'Not provided'}</p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Certificate history</h3>
              <p className="text-sm text-muted-foreground">
                Existing certificates tied to this subcontractor.
              </p>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="surface-subtle flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading certificate details...
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="surface-subtle flex items-start gap-3 px-4 py-4 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <p>{state.error}</p>
            </div>
          ) : null}

          {state.status === 'success' && state.data.certificates.length === 0 ? (
            <div className="surface-subtle px-4 py-4 text-sm text-muted-foreground">
              No certificates have been uploaded for this subcontractor yet.
            </div>
          ) : null}

          {state.status === 'success'
            ? state.data.certificates.map((certificate) => (
                <article key={certificate.id} className="surface-subtle space-y-4 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{certificate.file_name}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Uploaded {formatDate(certificate.uploaded_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={certificate.status} />
                      <span className="inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Parse: {certificate.parse_status}
                      </span>
                    </div>
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Expiration</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {formatDateOnly(certificate.expiration_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Effective</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {formatDateOnly(certificate.effective_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Insurer</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {certificate.insurer_name ?? 'Not extracted'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Coverage</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {formatCoverageAmount(certificate.coverage_amount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Policy type</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {certificate.policy_type ?? 'Not extracted'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Policy number</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {certificate.policy_number ?? 'Not extracted'}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))
            : null}
        </section>
      </div>
    </aside>
  );
}

export function SubcontractorsPageClient({
  subcontractors,
}: {
  subcontractors: SubcontractorListItem[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(subcontractors[0]?.id ?? null);
  const [detailState, setDetailState] = useState<DetailState>({
    status: 'idle',
    data: null,
    error: null,
  });

  const selectedSubcontractor = useMemo(
    () => subcontractors.find((item) => item.id === selectedId) ?? null,
    [selectedId, subcontractors],
  );

  useEffect(() => {
    if (!selectedId) {
      setDetailState({ status: 'idle', data: null, error: null });
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setDetailState({ status: 'loading', data: null, error: null });

      try {
        const response = await fetch(`/api/subcontractors/${selectedId}`, {
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error('Unable to load subcontractor details.');
        }

        const payload = (await response.json()) as SubcontractorDetailResponse;

        if (!cancelled) {
          setDetailState({ status: 'success', data: payload.data, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setDetailState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unable to load subcontractor details.',
          });
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Subcontractor roster</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Live workspace records with certificate status pulled from the current backend data model.
            </p>
          </div>
          <div className="rounded-md bg-secondary px-3 py-2 text-left sm:text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active records</p>
            <p className="text-lg font-semibold text-foreground">{subcontractors.length}</p>
          </div>
        </div>

        {subcontractors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                    Subcontractor
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                    Certificate
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                    Activity
                  </th>
                </tr>
              </thead>
              <tbody>
                {subcontractors.map((item) => {
                  const selected = item.id === selectedId;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-t border-border/80 transition-colors',
                        selected ? 'bg-primary/[0.05]' : 'hover:bg-background/70',
                      )}
                    >
                      <td className="px-4 py-4 align-top sm:px-5">
                        <button
                          className="group flex w-full items-start justify-between gap-4 text-left"
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {formatDisplayName(item)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {`${item.first_name} ${item.last_name}`.trim() || 'No contact name'}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                              selected ? 'translate-x-0.5 text-primary' : 'group-hover:translate-x-0.5',
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-muted-foreground sm:px-5">
                        <div className="space-y-1">
                          <p>{item.email}</p>
                          <p>{item.phone ?? 'No phone provided'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top sm:px-5">
                        <div className="space-y-2">
                          <StatusBadge status={item.latest_certificate_status} />
                          <p className="text-sm text-muted-foreground">
                            {item.latest_certificate
                              ? `Expires ${formatDateOnly(item.latest_certificate.expiration_date)}`
                              : 'No certificate uploaded yet'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-muted-foreground sm:px-5">
                        <div className="space-y-1">
                          <p>Created {formatDate(item.created_at)}</p>
                          <p>
                            {item.latest_certificate
                              ? `Uploaded ${formatDate(item.latest_certificate.uploaded_at)}`
                              : 'Awaiting first upload'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center sm:px-5">
            <p className="text-sm font-medium text-foreground">No subcontractors yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              F4 adds the roster and detail workflow only. Creation flows remain in the next frontend task.
            </p>
          </div>
        )}
      </div>

      <div className="xl:min-h-[640px]">
        {selectedSubcontractor ? (
          <DrawerContent
            item={selectedSubcontractor}
            state={detailState}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <EmptyDrawerState />
        )}
      </div>
    </section>
  );
}
