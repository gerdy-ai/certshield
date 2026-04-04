# CertShield — Multi-Agent Build Spec

See full spec at: https://claude.ai/public/artifacts/dc17b595-1d80-4e2a-bcc1-c6520e3c9484

## Quick Reference

**Product**: CertShield — Subcontractor Certificate of Insurance (COI) Tracking SaaS
**Stack**: Next.js 14, Supabase, Clerk, Stripe, Anthropic Claude, Inngest, Resend, Twilio
**Design**: Shield Teal (#0F6E56), Inter font, 8/12/20px border-radius system

## Agent Assignments
- Agent 1: Frontend (Next.js UI, marketing site, all pages)
- Agent 2: Backend (API routes, database, AI parsing, background jobs)
- Agent 3: Infrastructure (repo setup, auth, billing, CI/CD) — RUNS FIRST

## Build Order
1. Agent 3 scaffolds monorepo + infra
2. Agents 1 & 2 work in parallel after infra is ready
