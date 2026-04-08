# CertShield Build Pipeline

## Backend (Agent 2 tasks)

- [x] B1: Zod schemas + API helpers (packages/db/schemas.ts, auth helpers)
- [x] B2: Dashboard stats + subcontractors CRUD routes
- [x] B3: Upload route (public, PDF validation, Supabase storage)
- [x] B4: Certificates routes + signed URL generation
- [x] B5: AI PDF parsing (packages/ai/parseCert.ts)
- [x] B6: Inngest jobs (cert/uploaded handler, daily reminders)
- [x] B7: Reminders, settings, billing routes
- [x] B8: Stripe webhook handler
- [x] B9: RLS policies for all tables

## Frontend (Agent 1 tasks)

- [x] F1: Design system setup (tailwind config, shadcn theme, global styles)
- [x] F2: App layout (sidebar, top bar, providers)
- [ ] F3: Dashboard overview page (metric cards + attention table)
- [ ] F4: Subcontractors list + side drawer
- [ ] F5: Add subcontractor form + upload link modal
- [ ] F6: Public upload page (/upload/[token])
- [ ] F7: Certificates page (filterable table + detail modal)
- [ ] F8: Reminders page (log table + settings)
- [ ] F9: Settings + billing pages
- [ ] F10: Marketing landing page
- [ ] F11: Empty states, loading skeletons, toasts, mobile responsive

## Current: Frontend F3 next
