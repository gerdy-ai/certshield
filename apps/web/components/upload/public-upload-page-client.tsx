'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const tokenPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UploadState =
  | { status: 'idle'; message: null }
  | { status: 'submitting'; message: null }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type UploadResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  code?: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(file: File) {
  const fileName = file.name.toLowerCase();
  return file.type === 'application/pdf' || fileName.endsWith('.pdf');
}

export function PublicUploadPageClient({ token }: { token: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', message: null });
  const isTokenValid = useMemo(() => tokenPattern.test(token), [token]);

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function setValidationError(message: string) {
    setUploadState({ status: 'error', message });
  }

  function handleFileSelection(file: File | null) {
    setUploadState({ status: 'idle', message: null });
    setSelectedFile(file);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedFile(null);
      resetInput();
      setValidationError('Only PDF files are accepted.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      resetInput();
      setValidationError('File size must be under 10MB.');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isTokenValid) {
      setValidationError('This upload link is not valid.');
      return;
    }

    if (!selectedFile) {
      setValidationError('Select a PDF certificate before uploading.');
      return;
    }

    if (!isPdfFile(selectedFile)) {
      setValidationError('Only PDF files are accepted.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setValidationError('File size must be under 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    setUploadState({ status: 'submitting', message: null });

    try {
      const response = await fetch(`/api/upload/${token}`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as UploadResponse | null;

      if (!response.ok) {
        setUploadState({
          status: 'error',
          message: payload?.error ?? 'Upload failed. Please try again.',
        });
        return;
      }

      setUploadState({
        status: 'success',
        message: payload?.message ?? 'Certificate received.',
      });
      setSelectedFile(null);
      resetInput();
    } catch {
      setUploadState({
        status: 'error',
        message: 'Network error. Please retry in a moment.',
      });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="surface-card app-shell-shadow w-full max-w-5xl overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-primary px-8 py-10 text-primary-foreground lg:px-10 lg:py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Public certificate upload
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Submit your certificate of insurance.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
              Use this secure upload page to send a PDF certificate directly to the CertShield
              workspace that requested it.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-primary-foreground/85">
              <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
                PDF only, up to 10MB per upload.
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
                After upload, the certificate is queued for review and processing.
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
                Keep this page separate from your internal app login. No sign-in is required here.
              </div>
            </div>
          </div>

          <div className="px-8 py-10 lg:px-10 lg:py-12">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
                Upload form
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Send a PDF certificate
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Choose a PDF file and submit it through this public upload link.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div
                className={cn(
                  'surface-subtle border-dashed px-5 py-5',
                  uploadState.status === 'error' && 'border-destructive/40',
                  uploadState.status === 'success' && 'border-emerald-300 bg-emerald-50/70',
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <UploadCloud className="h-5 w-5" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Certificate PDF</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Accepts `.pdf` files up to 10MB.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploadState.status === 'submitting'}
                  >
                    Choose file
                  </Button>
                </div>

                <input
                  ref={inputRef}
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  disabled={uploadState.status === 'submitting'}
                  name="file"
                  type="file"
                  onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                />

                <div className="mt-4 rounded-md border bg-background/80 px-4 py-3">
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No file selected yet.</p>
                  )}
                </div>
              </div>

              {uploadState.status === 'error' ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{uploadState.message}</p>
                  </div>
                </div>
              ) : null}

              {uploadState.status === 'success' ? (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{uploadState.message}</p>
                  </div>
                </div>
              ) : null}

              {!isTokenValid ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>This upload link format is invalid. Request a fresh link from the sender.</p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  className="sm:min-w-[180px]"
                  disabled={uploadState.status === 'submitting' || !isTokenValid}
                  type="submit"
                >
                  {uploadState.status === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    'Upload PDF'
                  )}
                </Button>
                {selectedFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={uploadState.status === 'submitting'}
                    onClick={() => {
                      setSelectedFile(null);
                      setUploadState({ status: 'idle', message: null });
                      resetInput();
                    }}
                  >
                    Clear selection
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
