import Link from 'next/link';

const featureCards = [
  {
    title: 'Track every subcontractor in one place',
    description:
      'Keep vendor contacts, policy details, and certificate status organized by project instead of scattered across inboxes and spreadsheets.',
  },
  {
    title: 'Catch expirations before they block work',
    description:
      'See upcoming renewals early so your team can follow up before a subcontractor arrives on site with lapsed coverage.',
  },
  {
    title: 'Keep project teams audit-ready',
    description:
      'Maintain a clear record of current COIs, missing documents, and follow-up history for owners, GCs, and risk managers.',
  },
];

const workflowSteps = [
  {
    name: 'Collect',
    detail: 'Send upload links to subcontractors and centralize inbound certificates without exposing the internal app.',
  },
  {
    name: 'Review',
    detail: 'Surface key certificate details and identify which vendors still need compliant or current coverage.',
  },
  {
    name: 'Remind',
    detail: 'Automate renewal follow-up so expired insurance does not become a same-day fire drill for the field.',
  },
];

const productSignals = [
  'Built for construction operations, compliance, and project admin teams',
  'Designed around certificate renewals, vendor follow-up, and audit visibility',
  'Separate marketing surface from the authenticated product workspace',
];

export default function MarketingHomePage() {
  return (
    <main>
      <section className="px-6 pb-20 pt-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-shield">
                CertShield
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                COI tracking for construction teams
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="#features"
                className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
              >
                Features
              </Link>
              <Link
                href="http://localhost:3000/sign-in"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white/80 px-4 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Sign in
              </Link>
            </div>
          </header>

          <section className="surface-card app-shell-shadow mt-6 overflow-hidden">
            <div className="grid gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-14">
              <div>
                <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                  Construction insurance compliance, without spreadsheet chasing
                </div>
                <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Keep subcontractor COIs current before expired coverage slows a project down.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  CertShield helps general contractors and project teams track certificates
                  of insurance, spot upcoming expirations, and stay ahead of vendor follow-up
                  across active jobs.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="http://localhost:3000/sign-in"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Start tracking COIs
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-white/80 px-6 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    See how it works
                  </Link>
                </div>
                <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  {productSignals.map((signal) => (
                    <li key={signal} className="surface-subtle p-4 leading-6">
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="surface-subtle p-5 sm:p-6">
                <div className="rounded-lg border border-primary/10 bg-white p-5 shadow-soft">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/80">
                    Why teams switch
                  </p>
                  <div className="mt-5 space-y-5">
                    <div>
                      <p className="text-3xl font-semibold text-foreground">1 workspace</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Replace fragmented inbox threads and jobsite spreadsheets with a single
                        source of truth.
                      </p>
                    </div>
                    <div className="border-t border-border pt-5">
                      <p className="text-3xl font-semibold text-foreground">Early visibility</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Know which policies are expiring before access, payment, or compliance
                        gets blocked.
                      </p>
                    </div>
                    <div className="border-t border-border pt-5">
                      <p className="text-3xl font-semibold text-foreground">Less manual follow-up</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Give operations teams a cleaner renewal process without building a custom
                        workflow around email reminders.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section id="features" className="px-6 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-shield">
              Value proposition
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for the construction teams responsible for keeping coverage current.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              CertShield focuses on the operational work that actually causes delays: missing
              certificates, expired policies, and too many subcontractors to chase manually.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article key={feature.title} className="surface-card p-6">
                <div className="h-10 w-10 rounded-md bg-primary/10" />
                <h3 className="mt-5 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-shield">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              A simple workflow for collecting, reviewing, and renewing COIs.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The marketing site stays focused on one job: helping prospective customers
              understand how CertShield reduces compliance friction before they enter the app.
            </p>
          </div>

          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <article key={step.name} className="surface-card flex gap-5 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{step.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg bg-shield px-6 py-10 text-white shadow-soft sm:px-8 lg:px-12 lg:py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">
              Call to action
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Replace last-minute COI chasing with a process your project team can trust.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
              CertShield gives construction teams a dedicated system for certificate tracking,
              renewal visibility, and subcontractor follow-up.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="http://localhost:3000/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-md bg-white px-6 text-sm font-medium text-shield hover:bg-white/90"
              >
                Open the product
              </Link>
              <Link
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/30 px-6 text-sm font-medium text-white hover:bg-white/10"
              >
                Review features
              </Link>
            </div>
          </div>

          <footer className="mt-6 flex flex-col gap-2 border-t border-border/80 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>CertShield</p>
            <p>Construction COI tracking for subcontractor compliance.</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
