# CertShield Build Pipeline

## Backend (Agent 2 tasks)
- [ ] B1: Zod schemas + API helpers (packages/db/schemas.ts, auth helpers)
- [ ] B2: Dashboard stats + subcontractors CRUD routes
- [ ] B3: Upload route (public, PDF validation, Supabase storage)
- [ ] B4: Certificates routes + signed URL generation
- [ ] B5: AI PDF parsing (packages/ai/parseCert.ts)
- [ ] B6: Inngest jobs (cert/uploaded handler, daily reminders)
- [ ] B7: Reminders, settings, billing routes
- [ ] B8: Stripe webhook handler
- [ ] B9: RLS policies for all tables

## Frontend (Agent 1 tasks)
- [ ] F1: Design system setup (tailwind config, shadcn theme, global styles)
- [ ] F2: App layout (sidebar, top bar, providers)
- [ ] F3: Dashboard overview page (metric cards + attention table)
- [ ] F4: Subcontractors list + side drawer
- [ ] F5: Add subcontractor form + upload link modal
- [ ] F6: Public upload page (/upload/[token])
- [ ] F7: Certificates page (filterable table + detail modal)
- [ ] F8: Reminders page (log table + settings)
- [ ] F9: Settings + billing pages
- [ ] F10: Marketing landing page
- [ ] F11: Empty states, loading skeletons, toasts, mobile responsive

## Current: B1
