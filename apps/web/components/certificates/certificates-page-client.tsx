'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CertStatus } from '../../../../shared/types';
import {
  CalendarRange,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type CertificateListItem = {
  id: string;
  subcontractor_id: string;
  org_id: string;
  file_name: string;
  uploaded_at: string;
  parsed_at?: string;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';
  insurer_name?: string;
  policy_number?: string;
  policy_type?: string;
  coverage_amount?: number;
  effective_date?: string;
  expiration_date?: string;
  certificate_holder?: string;
  additional_insured?: boolean;
  status: CertStatus;
  subcontractor_name: string;
};

type CertificateListResponse = {
  data: CertificateListItem[];
  total: number;
  page: number;
  limit: number;
};

type Filters = {
  status: '' | CertStatus;
  from: string;
  to: string;
};

type ViewRouteResponse = {
  signed_url?: string;
  error?: string;
};

type ErrorResponse = {
  error?: string;
};

const PAGE_SIZE = 20;

const initialFilters: Filters = {
  status: '',
  from: '',
  to: '',
};

function formatDateTime(value: string | null | undefined) {
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

function formatCoverageAmount(value: number | null | undefined) {
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

function getParseStatusCopy(status: CertificateListItem['parse_status']) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Processing';
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        props.className,
      )}
    />
  );
}

function Field({
  children,
  label,
  htmlFor,
}: {
  children: React.ReactNode;
  label: string;
  htmlFor: string;
}) {
  return (
    <label className="space-y-2" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
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

function ParseStatusBadge({
  status,
}: {
  status: CertificateListItem['parse_status'];
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'complete' && 'bg-emerald-100 text-emerald-800',
        status === 'processing' && 'bg-primary/10 text-primary',
        status === 'pending' && 'bg-secondary text-secondary-foreground',
        status === 'failed' && 'bg-destructive/10 text-destructive',
      )}
    >
      {getParseStatusCopy(status)}
    </span>
  );
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="surface-subtle px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function CertificateDetailModal({
  certificate,
  onClose,
}: {
  certificate: CertificateListItem;
  onClose: () => void;
}) {
  const [viewState, setViewState] = useState<{
    status: 'idle' | 'loading' | 'error';
    error: string | null;
  }>({
    status: 'idle',
    error: null,
  });

  async function handleOpenFile() {
    setViewState({ status: 'loading', error: null });

    try {
      const response = await fetch(`/api/certificates/${certificate.id}/view`, {
        method: 'GET',
        cache: 'no-store',
      });
      const payload = (await response.json()) as ViewRouteResponse;

      if (!response.ok || !payload.signed_url) {
        throw new Error(payload.error ?? 'Unable to open the signed certificate file.');
      }

      window.open(payload.signed_url, '_blank', 'noopener,noreferrer');
      setViewState({ status: 'idle', error: null });
    } catch (error) {
      setViewState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unable to open the signed certificate file.',
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close certificate detail dialog"
        className="absolute inset-0 bg-foreground/35 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="app-shell-shadow surface-card relative z-10 w-full max-w-3xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
              Certificate detail
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {certificate.file_name}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {certificate.subcontractor_name || 'Unknown subcontractor'} · Uploaded{' '}
              {formatDateTime(certificate.uploaded_at)}
            </p>
          </div>
          <Button aria-label="Close certificate detail dialog" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={certificate.status} />
            <ParseStatusBadge status={certificate.parse_status} />
            {typeof certificate.additional_insured === 'boolean' ? (
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {certificate.additional_insured ? 'Additional insured' : 'Not additional insured'}
              </span>
            ) : null}
          </div>

          {viewState.error ? (
            <div className="surface-subtle border-destructive/20 px-4 py-3 text-sm text-destructive">
              {viewState.error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleOpenFile()} disabled={viewState.status === 'loading'}>
              {viewState.status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Open signed file
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          <dl className="grid gap-4 md:grid-cols-2">
            <MetadataItem label="Subcontractor" value={certificate.subcontractor_name || 'Unknown subcontractor'} />
            <MetadataItem label="Insurer" value={certificate.insurer_name ?? 'Not extracted'} />
            <MetadataItem label="Policy number" value={certificate.policy_number ?? 'Not extracted'} />
            <MetadataItem label="Policy type" value={certificate.policy_type ?? 'Not extracted'} />
            <MetadataItem label="Coverage amount" value={formatCoverageAmount(certificate.coverage_amount)} />
            <MetadataItem label="Certificate holder" value={certificate.certificate_holder ?? 'Not extracted'} />
            <MetadataItem label="Effective date" value={formatDateOnly(certificate.effective_date)} />
            <MetadataItem label="Expiration date" value={formatDateOnly(certificate.expiration_date)} />
            <MetadataItem label="Uploaded" value={formatDateTime(certificate.uploaded_at)} />
            <MetadataItem label="Parsed" value={formatDateTime(certificate.parsed_at)} />
          </dl>
        </div>
      </div>
    </div>
  );
}

export function CertificatesPageClient() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);
  const [certificates, setCertificates] = useState<CertificateListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCertificateId, setOpenCertificateId] = useState<string | null>(null);

  const selectedCertificate = useMemo(
    () => certificates.find((certificate) => certificate.id === openCertificateId) ?? null,
    [certificates, openCertificateId],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadCertificates() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        if (filters.status) {
          params.set('status', filters.status);
        }

        if (filters.from) {
          params.set('from', filters.from);
        }

        if (filters.to) {
          params.set('to', filters.to);
        }

        const response = await fetch(`/api/certificates?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = (await response.json()) as CertificateListResponse | ErrorResponse;
        const requestError = 'error' in payload ? payload.error : undefined;

        if (!response.ok || !('data' in payload)) {
          throw new Error(requestError ?? 'Unable to load certificates.');
        }

        setCertificates(payload.data);
        setTotal(payload.total);
        setOpenCertificateId((current) =>
          current && payload.data.some((certificate) => certificate.id === current) ? current : null,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setCertificates([]);
        setTotal(0);
        setOpenCertificateId(null);
        setError(error instanceof Error ? error.message : 'Unable to load certificates.');
      } finally {
        setLoading(false);
      }
    }

    void loadCertificates();

    return () => controller.abort();
  }, [filters, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  return (
    <>
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Certificate table</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Filter by backend-supported status and expiration date range, then open a row for parsed metadata.
              </p>
            </div>
            <div className="rounded-md bg-secondary px-3 py-2 text-left lg:text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Results</p>
              <p className="text-lg font-semibold text-foreground">{total}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,180px)_auto]">
            <Field htmlFor="status" label="Status">
              <Select
                id="status"
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value as Filters['status'])}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring soon</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending review</option>
              </Select>
            </Field>

            <Field htmlFor="from" label="Expiration from">
              <Input
                id="from"
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter('from', event.target.value)}
              />
            </Field>

            <Field htmlFor="to" label="Expiration to">
              <Input
                id="to"
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter('to', event.target.value)}
              />
            </Field>

            <div className="flex items-end gap-3">
              <Button type="button" variant="outline" onClick={resetFilters}>
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 px-4 py-6 sm:px-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="px-4 py-8 sm:px-5">
            <div className="surface-subtle border-destructive/20 px-4 py-4 text-sm text-destructive">
              {error}
            </div>
          </div>
        ) : certificates.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Certificate
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Subcontractor
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Coverage
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5">
                      Activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((certificate) => {
                    const selected = certificate.id === openCertificateId;

                    return (
                      <tr
                        key={certificate.id}
                        className={cn(
                          'border-t border-border/80 transition-colors',
                          selected ? 'bg-primary/[0.05]' : 'hover:bg-background/70',
                        )}
                      >
                        <td className="px-4 py-4 align-top sm:px-5">
                          <button
                            className="group flex w-full items-start justify-between gap-4 text-left"
                            type="button"
                            onClick={() => setOpenCertificateId(certificate.id)}
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{certificate.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {certificate.policy_number ?? 'Policy number pending'}
                              </p>
                            </div>
                            <FileText
                              className={cn(
                                'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors',
                                selected ? 'text-primary' : 'group-hover:text-primary',
                              )}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted-foreground sm:px-5">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {certificate.subcontractor_name || 'Unknown subcontractor'}
                            </p>
                            <p>{certificate.insurer_name ?? 'Insurer pending extraction'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted-foreground sm:px-5">
                          <div className="space-y-1">
                            <p>{formatCoverageAmount(certificate.coverage_amount)}</p>
                            <p>
                              Expires {formatDateOnly(certificate.expiration_date)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top sm:px-5">
                          <div className="space-y-2">
                            <StatusBadge status={certificate.status} />
                            <ParseStatusBadge status={certificate.parse_status} />
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted-foreground sm:px-5">
                          <div className="space-y-1">
                            <p>Uploaded {formatDateTime(certificate.uploaded_at)}</p>
                            <p>Parsed {formatDateTime(certificate.parsed_at)}</p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-border/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom}-{showingTo} of {total} certificates
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages}
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
              icon={CalendarRange}
              title="No certificates match these filters"
              description="Adjust the status or expiration date range to broaden the results."
            />
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="surface-card p-5 xl:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Filter behavior</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Status filters map directly to the current API semantics. Date filters apply against
                `expiration_date`, so pending certificates without an extracted expiration stay in the
                pending slice unless a date range excludes them.
              </p>
            </div>
          </div>
        </article>

        <article className="surface-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Selection</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {selectedCertificate
              ? `Selected ${selectedCertificate.file_name} for ${selectedCertificate.subcontractor_name || 'the current subcontractor'}.`
              : 'Select a table row to inspect detailed metadata and open the signed certificate file.'}
          </p>
        </article>
      </section>

      {selectedCertificate ? (
        <CertificateDetailModal
          certificate={selectedCertificate}
          onClose={() => setOpenCertificateId(null)}
        />
      ) : null}
    </>
  );
}
