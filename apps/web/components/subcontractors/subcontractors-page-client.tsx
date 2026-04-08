'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CertStatus } from '../../../../shared/types';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
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

type CreateSubcontractorResponse = {
  data: {
    id: string;
    org_id: string;
    first_name: string;
    last_name: string;
    company_name: string;
    email: string;
    phone?: string;
    upload_token: string;
    deleted_at?: string;
    created_at: string;
  };
};

type ErrorResponse = {
  error?: string;
};

type DetailState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: SubcontractorDetail; error: null }
  | { status: 'error'; data: null; error: string };

type FormState = {
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

const initialFormState: FormState = {
  company_name: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
};

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

function getUploadUrl(token: string) {
  if (typeof window === 'undefined') {
    return `/upload/${token}`;
  }

  return `${window.location.origin}/upload/${token}`;
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

function UploadLinkModal({
  item,
  onClose,
}: {
  item: SubcontractorListItem;
  onClose: () => void;
}) {
  const [copiedValue, setCopiedValue] = useState<'url' | 'token' | null>(null);
  const uploadUrl = getUploadUrl(item.upload_token);

  useEffect(() => {
    if (!copiedValue) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedValue(null), 1600);

    return () => window.clearTimeout(timeout);
  }, [copiedValue]);

  async function copyValue(value: string, type: 'url' | 'token') {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(type);
    } catch {
      setCopiedValue(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close upload link dialog"
        className="absolute inset-0 bg-foreground/35 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="app-shell-shadow surface-card relative z-10 w-full max-w-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
              Upload link
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {formatDisplayName(item)}
            </h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Share this public upload link with the subcontractor so they can submit a certificate directly.
            </p>
          </div>
          <Button aria-label="Close upload link dialog" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="surface-subtle space-y-3 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Public upload URL</p>
            <p className="break-all text-sm text-foreground">{uploadUrl}</p>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" onClick={() => void copyValue(uploadUrl, 'url')}>
                {copiedValue === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedValue === 'url' ? 'Copied' : 'Copy URL'}
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={uploadUrl} rel="noreferrer" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  Open page
                </a>
              </Button>
            </div>
          </div>

          <div className="surface-subtle space-y-3 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Upload token</p>
            <p className="break-all font-mono text-xs text-foreground">{item.upload_token}</p>
            <Button size="sm" variant="outline" onClick={() => void copyValue(item.upload_token, 'token')}>
              {copiedValue === 'token' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedValue === 'token' ? 'Copied' : 'Copy token'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawerContent({
  item,
  state,
  onClose,
  onOpenUploadModal,
}: {
  item: SubcontractorListItem;
  state: DetailState;
  onClose: () => void;
  onOpenUploadModal: () => void;
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
            <Button size="sm" variant="outline" onClick={onOpenUploadModal}>
              <LinkIcon className="h-4 w-4" />
              Upload link
            </Button>
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
            <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
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
  const [roster, setRoster] = useState(subcontractors);
  const [selectedId, setSelectedId] = useState<string | null>(subcontractors[0]?.id ?? null);
  const [detailState, setDetailState] = useState<DetailState>({
    status: 'idle',
    data: null,
    error: null,
  });
  const { pushToast } = useToast();
  const [formValues, setFormValues] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadModalId, setUploadModalId] = useState<string | null>(null);

  useEffect(() => {
    setRoster(subcontractors);
    setSelectedId((current) => current ?? subcontractors[0]?.id ?? null);
  }, [subcontractors]);

  const selectedSubcontractor = useMemo(
    () => roster.find((item) => item.id === selectedId) ?? null,
    [roster, selectedId],
  );

  const uploadModalItem = useMemo(
    () => roster.find((item) => item.id === uploadModalId) ?? null,
    [roster, uploadModalId],
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
          const message = error instanceof Error ? error.message : 'Unable to load subcontractor details.';
          setDetailState({
            status: 'error',
            data: null,
            error: message,
          });
          pushToast({ tone: 'error', title: 'Unable to load subcontractor', description: message });
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [pushToast, selectedId]);

  function updateFormValue<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateSubcontractor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const payload = {
      company_name: formValues.company_name.trim(),
      first_name: formValues.first_name.trim(),
      last_name: formValues.last_name.trim(),
      email: formValues.email.trim(),
      ...(formValues.phone.trim() ? { phone: formValues.phone.trim() } : {}),
    };

    try {
      const response = await fetch('/api/subcontractors', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as CreateSubcontractorResponse | ErrorResponse | null;

      if (!response.ok || !result || !('data' in result)) {
        throw new Error(result && 'error' in result && result.error ? result.error : 'Unable to create subcontractor.');
      }

      const createdItem: SubcontractorListItem = {
        id: result.data.id,
        company_name: result.data.company_name,
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        email: result.data.email,
        created_at: result.data.created_at,
        upload_token: result.data.upload_token,
        latest_certificate_status: 'pending',
        latest_certificate: null,
        ...(result.data.phone ? { phone: result.data.phone } : {}),
      };

      setRoster((current) => [createdItem, ...current]);
      setSelectedId(createdItem.id);
      setUploadModalId(createdItem.id);
      setFormValues(initialFormState);
      setFormSuccess('Subcontractor created. Share the upload link to collect the first certificate.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create subcontractor.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <div className="surface-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-border/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Subcontractor roster</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Live workspace records with certificate status pulled from the current backend data model.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedSubcontractor ? (
                  <Button size="sm" variant="outline" onClick={() => setUploadModalId(selectedSubcontractor.id)}>
                    <LinkIcon className="h-4 w-4" />
                    Upload link
                  </Button>
                ) : null}
                <div className="rounded-md bg-secondary px-3 py-2 text-left sm:text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active records</p>
                  <p className="text-lg font-semibold text-foreground">{roster.length}</p>
                </div>
              </div>
            </div>

            {roster.length > 0 ? (
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
                    {roster.map((item) => {
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
              <div className="px-4 py-8 sm:px-5">
                <EmptyState
                  icon={Building2}
                  title="No subcontractors yet"
                  description="Use the form below to add your first subcontractor and generate a secure upload link."
                />
              </div>
            )}
          </div>

          <section className="surface-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <Plus className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Add subcontractor</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Create a workspace record and immediately expose the public upload link for certificate collection.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCreateSubcontractor}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field htmlFor="company_name" label="Company name">
                  <Input
                    id="company_name"
                    maxLength={200}
                    name="company_name"
                    placeholder="North Ridge Electrical"
                    required
                    value={formValues.company_name}
                    onChange={(event) => updateFormValue('company_name', event.target.value)}
                  />
                </Field>
                <Field htmlFor="email" label="Email">
                  <Input
                    id="email"
                    maxLength={320}
                    name="email"
                    placeholder="insurance@northridge.example"
                    required
                    type="email"
                    value={formValues.email}
                    onChange={(event) => updateFormValue('email', event.target.value)}
                  />
                </Field>
                <Field htmlFor="first_name" label="First name">
                  <Input
                    id="first_name"
                    maxLength={100}
                    name="first_name"
                    placeholder="Avery"
                    required
                    value={formValues.first_name}
                    onChange={(event) => updateFormValue('first_name', event.target.value)}
                  />
                </Field>
                <Field htmlFor="last_name" label="Last name">
                  <Input
                    id="last_name"
                    maxLength={100}
                    name="last_name"
                    placeholder="Brooks"
                    required
                    value={formValues.last_name}
                    onChange={(event) => updateFormValue('last_name', event.target.value)}
                  />
                </Field>
                <Field htmlFor="phone" label="Phone">
                  <Input
                    id="phone"
                    maxLength={50}
                    name="phone"
                    placeholder="(555) 867-5309"
                    value={formValues.phone}
                    onChange={(event) => updateFormValue('phone', event.target.value)}
                  />
                </Field>
              </div>

              {formError ? (
                <div className="surface-subtle flex items-start gap-3 border-destructive/20 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <p>{formError}</p>
                </div>
              ) : null}

              {formSuccess ? (
                <div className="surface-subtle flex items-start gap-3 border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                  <Check className="mt-0.5 h-4 w-4" />
                  <p>{formSuccess}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isSubmitting ? 'Creating subcontractor...' : 'Add subcontractor'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Required fields follow the existing `POST /api/subcontractors` contract.
                </p>
              </div>
            </form>
          </section>
        </div>

        <div className="xl:min-h-[640px] xl:min-w-0">
          {selectedSubcontractor ? (
            <DrawerContent
              item={selectedSubcontractor}
              state={detailState}
              onClose={() => setSelectedId(null)}
              onOpenUploadModal={() => setUploadModalId(selectedSubcontractor.id)}
            />
          ) : (
            <EmptyDrawerState />
          )}
        </div>
      </section>

      {uploadModalItem ? (
        <UploadLinkModal item={uploadModalItem} onClose={() => setUploadModalId(null)} />
      ) : null}
    </>
  );
}
