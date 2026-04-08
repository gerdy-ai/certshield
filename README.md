# CertShield

Construction COI tracking for subcontractor compliance.

## Apps

- **Product app:** `apps/web` → <http://localhost:3000>
- **Marketing app:** `apps/marketing` → <http://localhost:3001>

## Prerequisites

- Node 22+
- pnpm (or `npx pnpm`)

## First-time local setup

From the repo root:

```bash
cd /home/vibecode/projects/certshield
cp infra/env.example .env.local
```

Then edit `.env.local` and provide real values for:

- Clerk
- Supabase
- Stripe
- Inngest
- Anthropic
- Resend / Twilio if testing reminders

## Install

```bash
npx pnpm install
```

## Run locally (development)

### Product app only

```bash
npx pnpm --filter @certshield/web dev
```

Open: <http://localhost:3000>

### Marketing app only

```bash
npx pnpm --filter @certshield/marketing dev
```

Open: <http://localhost:3001>

### Both apps in parallel

```bash
npx pnpm dev
```

## Production-like local run

Build everything:

```bash
npx pnpm build
```

Run product app:

```bash
npx pnpm --filter @certshield/web start
```

Run marketing app:

```bash
npx pnpm --filter @certshield/marketing start
```

## Validation

Type-check everything:

```bash
npx pnpm -r type-check
```

Build everything:

```bash
npx pnpm build
```

## What is verified locally right now

The following currently pass in this repo:

- monorepo type-check
- monorepo production build

## What still requires real env-backed testing

These are not meaningfully testable without valid credentials and services:

- Clerk sign-in / org membership flow
- Supabase database + storage behavior
- public certificate uploads end-to-end
- AI parse job execution
- Inngest event/job execution
- Stripe webhook lifecycle
- email/SMS reminder delivery

## Suggested smoke test order

1. Start both apps
2. Confirm marketing site loads on port 3001
3. Confirm product app loads on port 3000
4. Sign in via Clerk
5. Create a subcontractor
6. Open upload link modal
7. Upload a sample PDF through `/upload/[token]`
8. Verify certificate appears in dashboard/certificates pages
9. Verify parse status transitions
10. Check reminders/settings/billing pages load cleanly

## Notes

- The product is complete to the current spec and pushed to GitHub.
- Remaining work is QA, deployment, and post-spec iteration.
