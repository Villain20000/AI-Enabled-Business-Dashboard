# DataCore AI — Missing Features Implementation Plan

**Status:** Draft
**Created:** 2026-10-17
**Source:** Full repository audit (`npm run lint` and `npm run build` pass; no automated tests exist)
**Goal:** Turn the current UI shell into a working, production-safe SaaS product.

---

## 1. Executive Summary

The application has a solid Next.js/Supabase/Stripe/Gemini structure, but the
advertised "production-ready" feature set is not yet functional end to end.

Three areas are responsible for most of the gap:

1. **Data** — there is no way to load real business data; every new organization
   silently falls back to global mock rows.
2. **Alerts** — alert rules can be created, but nothing evaluates them or sends
   notifications.
3. **Billing lifecycle** — checkout and upgrades are currently unreachable or
   unsafe, and subscription state is incomplete.

Before those product features can be built safely, the P0 correctness and
security issues below must be fixed.

---

## 2. Scope

### In scope

- Fixing broken advertised flows (auth, org resolution, billing, AI, invites).
- Making the database migration reproducible on a fresh Supabase project.
- Enforcing RBAC and tenant isolation at the database layer.
- Data ingestion and dashboard data lifecycle.
- Alert evaluation and notification delivery.
- Complete Stripe subscription lifecycle.
- Team/organization lifecycle operations.
- AI conversation persistence, streaming, and usage visibility.
- Public API hardening and documentation.
- Tests, CI, observability, and deployment documentation.

### Out of scope

- Native mobile applications.
- A full BI query engine or arbitrary SQL access for customers.
- SOC 2 certification or a formal penetration test (recommended later).
- Enterprise SAML SSO in the first release; Google/GitHub OAuth comes first.
- Per-seat usage-based billing unless the pricing model changes.

---

## 3. Current Verified State

| Area | Current state |
|---|---|
| Build | `npm run build` passes |
| Lint | `npm run lint` passes, but the build skips ESLint (`ignoreDuringBuilds: true`) |
| Tests | None; no `test` script |
| Database | Migration alters tables that it never creates; no seed |
| Auth | Email/password UI exists; OAuth callback is missing |
| Billing | Checkout/portal are blocked by CSRF and client-side env issues |
| AI | AI routes are blocked by missing CSRF headers on the client |
| Alerts | "Run Check Now" is a timeout simulation |
| Data | No ingestion; mock fallback for all orgs |
| RBAC | Route handlers check permissions; RLS does not enforce them consistently |
| Audit | Listing works; retention, immutability, and several event types are missing |

---

## 4. Guiding Principles

- **Database is the security boundary.** Route-handler checks are not enough;
  RLS must enforce tenant and role isolation.
- **No silent fallbacks for production data.** Empty states are better than
  showing another organization's or global mock data.
- **Every mutation is auditable.** Successful and failed privileged actions
  should leave a trace.
- **Server owns secrets and price IDs.** Only `NEXT_PUBLIC_*` values may reach
  client components, and price IDs should be passed explicitly from the server.
- **Every fix ships with a test.** P0 fixes require at least one regression test.
- **Small, reversible migrations.** No destructive data changes without a
  documented backfill or manual step.

---

## 5. Phase 0 — Foundations

**Outcome:** A reproducible development environment with tests and generated
database types before feature work begins.

### 0.1 Environment validation

- [ ] Add a server-side env schema (`lib/env.ts`) using Zod.
- [ ] Validate Supabase, Stripe, Gemini, and app URL variables at startup.
- [ ] Replace `NEXT_PUBLIC_GEMINI_API_KEY` with server-only `GEMINI_API_KEY`.
- [ ] Fail fast when `SUPABASE_SERVICE_ROLE_KEY` is missing instead of silently
      falling back to the anon key in `lib/supabase/admin.ts`.
- [ ] Update `.env.example` and `README.md`.

**Acceptance:** Starting the app with missing required variables produces a
clear error naming the missing variable; no service-role operation can
accidentally run with the anon key.

### 0.2 Test harness

- [ ] Add Vitest for unit tests and Playwright for critical E2E flows.
- [ ] Add `test`, `test:unit`, and `test:e2e` scripts.
- [ ] Add a Supabase test database or local Supabase instance for RLS tests.
- [ ] Add test fixtures for organizations, members, plans, and API keys.

**Acceptance:** `npm test` runs locally and in CI.

### 0.3 Database types and seed

- [ ] Generate Supabase TypeScript types and replace `any` in data components.
- [ ] Add `supabase/config.toml`.
- [ ] Add a seed script that creates a demo org, owner, sample data, and a
      demo API key for local development only.
- [ ] Add a `db:reset` documented workflow.

**Acceptance:** A fresh clone can run migrations and seed data with one command.

### 0.4 CI

- [ ] Add GitHub Actions (or equivalent) running lint, typecheck, unit tests,
      build, and migration validation.
- [ ] Remove `ignoreDuringBuilds: true` once lint is clean in CI.

**Acceptance:** A pull request cannot merge with failing lint, types, tests, or
build.

---

## 6. Phase 1 — P0 Blockers

**Outcome:** The advertised core flows work and cannot be bypassed.

### 6.1 Fix the dashboard/onboarding redirect loop

**Problem:** `app/(app)/layout.tsx` redirects to `/onboarding` without an
`active_org_id` cookie; `app/onboarding/page.tsx` redirects to `/dashboard`
whenever the user has any org.

- [ ] Add a server-side org resolution helper with three outcomes:
      valid active org, choose-an-org, or no-org onboarding.
- [ ] Add `/select-org` for authenticated users with one or more orgs but no
      valid active cookie.
- [ ] Update `app/(app)/layout.tsx` to redirect to `/select-org` instead of
      `/onboarding` when orgs exist.
- [ ] Update `lib/auth/requireOrg.ts` with the same behavior.
- [ ] Change onboarding to redirect to `/select-org` when orgs exist.
- [ ] Add `/select-org` to middleware protected routes.
- [ ] Add a regression test for: user + org + no cookie never loops.

**Acceptance:** Clearing cookies, signing in with an existing account, or
returning from OAuth lands on an org chooser or dashboard — never a redirect
loop.

### 6.2 Centralize CSRF-safe client requests

**Problem:** AI and billing clients omit `x-requested-with`, while their route
handlers require it.

- [ ] Add `lib/api/client.ts` with `apiFetch` that sets JSON content type and
      `x-requested-with: XMLHttpRequest`.
- [ ] Migrate `AiInsights`, `NlqChat`, `BillingView`, `TeamView`, `ApiKeysView`,
      and settings audit calls to the helper.
- [ ] Add CSRF checks to invite acceptance and any other mutating route that
      currently lacks one.
- [ ] Add route tests that reject missing headers and accept valid ones.

**Acceptance:** AI generate/chat, checkout, portal, invites, API keys, and
settings mutations all succeed from the UI; requests without the header get 403.

### 6.3 Make Stripe checkout reachable and safe

**Problem:** `plans.ts` reads non-public env vars in a client bundle, and
checkout accepts arbitrary price IDs.

- [ ] Remove `process.env` reads from `lib/billing/plans.ts`.
- [ ] Resolve price IDs server-side and pass a `priceIds` map into
      `BillingView` as props.
- [ ] Keep `stripePriceId` out of client-side plan objects.
- [ ] Add the CSRF header to checkout/portal requests.
- [ ] Validate the submitted price ID against the server-side allowlist;
      reject unknown IDs with 400.
- [ ] Reuse an existing `stripe_customer_id` rather than creating duplicate
      customers.
- [ ] For existing subscriptions, use the billing portal or a subscription
      update instead of creating a second subscription.
- [ ] Add an idempotency key for checkout creation.

**Acceptance:** Free → Pro and Free → Enterprise open Stripe Checkout; an
existing customer can manage/cancel; an arbitrary price ID is rejected; no
duplicate Stripe customers are created.

### 6.4 Add the OAuth/email confirmation callback

**Problem:** OAuth returns to `/dashboard` without a session exchange route.

- [ ] Add `app/auth/callback/route.ts` using
      `exchangeCodeForSession` and a sanitized `next` parameter.
- [ ] Update `AuthForm` OAuth `redirectTo` to `/auth/callback`.
- [ ] Add an email-confirmation callback page.
- [ ] Allow `/auth/callback` and confirmation routes through middleware.
- [ ] Preserve `next` through login/signup and redirect after success.
- [ ] Handle `signUp()` returning no session: show "check your email" instead
      of redirecting to the dashboard.

**Acceptance:** Google/GitHub sign-in establishes a session; a new user lands
on onboarding/select-org; email confirmation returns to the intended page.

### 6.5 Repair invitation acceptance

**Problem:** Any authenticated user with a token can accept; login redirect is
ignored; no resend/copy fallback.

- [ ] Compare `user.email.toLowerCase()` with `invite.email.toLowerCase()` in
      `app/api/team/accept-invite/route.ts`; return 403 on mismatch.
- [ ] Add CSRF to the accept route and its client call.
- [ ] Add a token validation endpoint so the page can show the org/email before
      login without consuming the invite.
- [ ] Preserve the invite token through login and signup.
- [ ] Add "resend invitation" and "copy invite link" actions.
- [ ] If Supabase invite email fails, return the invite URL and show it to the
      admin instead of claiming success.
- [ ] Reject inviting an existing member, or change the flow to a role update.
- [ ] Do not allow invites to grant `owner`.
- [ ] Add tests for wrong-email, expired, revoked, and already-accepted tokens.

**Acceptance:** Only the invited email can accept; a new invitee can sign up,
confirm, return to the invite, and join; admins can copy or resend a link.

### 6.6 Make the migration reproducible

**Problem:** The migration alters tables that do not exist on a fresh project.

- [ ] Add a base schema migration that creates `sales_data`,
      `inventory_data`, `kpis`, and `alert_rules` before altering them.
- [ ] Define canonical columns used by the UI and components.
- [ ] Backfill or explicitly quarantine rows with null `org_id`.
- [ ] Make `org_id` `not null` after backfill.
- [ ] Add `data_sources` and `import_jobs` tables now for the ingestion phase.
- [ ] Add check constraints for plan/status/role values.
- [ ] Add a partial unique index enforcing at most one owner per org.
- [ ] Add indexes for invitation lookups (`org_id, email, status`) and
      organization lookup by Stripe customer ID.
- [ ] Document the migration order and the manual backfill decision.

**Acceptance:** `supabase db reset` succeeds on an empty project and produces a
schema the app can query without errors.

### 6.7 Fix RLS and RBAC enforcement

**Problem:** Database policies allow any member to perform owner/admin actions.

- [ ] Add a `security definer` helper such as
      `has_org_role(org_id uuid, allowed_roles text[])`.
- [ ] Rewrite `organization_members` policies to use the helper and avoid
      self-referential recursion.
- [ ] Restrict `organizations_update/delete` to owners.
- [ ] Restrict invitation management to owners/admins.
- [ ] Restrict API key management to owners/admins.
- [ ] Restrict feature-flag changes to owners; keep the server's
      "only disable" merge rule.
- [ ] Remove `audit_logs_insert` for normal users. Audit inserts should come
      from the service role, or from a narrowly scoped server route.
- [ ] Move organization rename out of the browser Supabase client into an API
      route with RBAC.
- [ ] Keep alert-rule writes for members but verify org membership in RLS.
- [ ] Add SQL/pgTAP tests for viewer/member/admin/owner boundaries.

**Acceptance:** A viewer or member calling Supabase directly cannot rename or
delete an org, manage invitations, manage API keys, or write arbitrary audit
rows. RLS tests pass for all four roles.

### 6.8 Repair billing webhooks

**Problem:** Webhook audit inserts use invalid UUIDs and the wrong org ID.

- [ ] Resolve the organization by `stripe_customer_id` for subscription
      events; never use a customer ID as `org_id`.
- [ ] Add an audit actor representation for system events (`actor_label` or
      null user + metadata) instead of writing `'stripe-webhook'` into a UUID
      column.
- [ ] Add a `stripe_events` idempotency table keyed by event ID.
- [ ] Store `stripe_subscription_id`, `subscription_status`,
      `current_period_end`, and `cancel_at_period_end`.
- [ ] Handle `checkout.session.completed`,
      `customer.subscription.created/updated/deleted`,
      `invoice.paid`, and `invoice.payment_failed`.
- [ ] Return a non-2xx response when a handler fails so Stripe retries;
      acknowledge duplicate events idempotently.
- [ ] Only map known configured price IDs; log unknown IDs without granting a
      plan.

**Acceptance:** Stripe CLI events update plan/status and produce audit entries;
duplicate events do not double-apply; failed handlers retry.

### 6.9 Fix signup and session UX

- [ ] Handle Supabase signup with and without a session.
- [ ] Add a "confirm your email" screen and resend option.
- [ ] Preserve `next` through auth.
- [ ] Align password rules across signup, reset, and settings.
- [ ] Add basic auth rate limiting (see 8.1).

**Acceptance:** Signup either lands in the app with a session or explains that
confirmation is required; users never bounce to login unexpectedly.

---

## 7. Phase 2 — Core Product Features

**Outcome:** Customers can load data, see real dashboards, receive alerts, and
manage a complete subscription.

### 7.1 Data ingestion and data lifecycle

**Problem:** There is no way to get real data into the product.

- [ ] Add a `/data` page with:
      - CSV upload and template download
      - column mapping and preview
      - validation errors per row
      - import history and status
      - sample-data loader for new orgs
- [ ] Add `POST /api/data/import` with size limits, MIME validation, row limits,
      and Zod row schemas.
- [ ] Add `POST /api/data/sample` to seed a new org explicitly.
- [ ] Add `GET /api/data/export` for CSV export.
- [ ] Add a `data_sources` record for uploaded data and future integrations.
- [ ] Store import errors in `import_jobs` for troubleshooting.
- [ ] Remove the global mock fallback from `app/(app)/dashboard/page.tsx`.
      Show an empty state with a "Load sample data" or "Import data" CTA.
- [ ] Add date-range filtering to the dashboard and aggregation queries.
- [ ] Add a canonical KPI/sales/inventory TypeScript type generated from the DB.
- [ ] Add tests for malformed CSV, oversized files, and cross-org isolation.

**Acceptance:** An owner uploads a valid CSV, sees row counts and the dashboard
reflects the data; invalid rows are reported without partially importing;
another org cannot see the data.

### 7.2 Alert evaluation and notifications

**Problem:** Alert rules are saved but never evaluated or delivered.

- [ ] Extend `alert_rules` with `enabled`, `last_checked_at`,
      `last_triggered_at`, `cooldown_seconds`, and `created_by`.
- [ ] Add `alert_events` with rule ID, org ID, trigger value, status, delivery
      payload, error, and timestamps.
- [ ] Add `lib/alerts/evaluate.ts` with pure comparison logic for `>`, `<`,
      `>=`, `<=`, `==`.
- [ ] Add a protected cron endpoint (for example `/api/cron/alerts`) using a
      `CRON_SECRET`, or a Supabase scheduled function.
- [ ] Add cooldown/deduplication so one condition does not spam recipients.
- [ ] Add email delivery through a transactional email provider.
- [ ] Add Slack incoming-webhook delivery.
- [ ] Add destination validation and a "send test" action.
- [ ] Replace the simulated `handleRunCheck` with a real evaluation call and
      show triggered/not-triggered results.
- [ ] Add alert history, acknowledgement, mute, and delete in Settings.
- [ ] Record `alert_check` usage and audit checks that trigger a notification.
- [ ] Add tests for threshold boundaries, cooldown, and failed delivery.

**Acceptance:** A rule fires when its condition is met, sends exactly one
notification per cooldown window, records an alert event, and does not fire for
non-matching data.

### 7.3 Complete the billing lifecycle

- [ ] Add subscription status and period fields to `organizations` (or a
      dedicated `subscriptions` table).
- [ ] Add a billing history/invoice list.
- [ ] Show payment-failure and past-due states with a grace period.
- [ ] Implement upgrade/downgrade through subscription updates with proration,
      or route all changes through the Stripe portal consistently.
- [ ] Sync seat limits and prevent inviting beyond the current plan.
- [ ] Add tax, coupon, trial, and cancellation-at-period-end fields if the
      pricing model requires them.
- [ ] Add an owner-facing "cancel subscription" path.
- [ ] Add webhook tests for created, updated, deleted, paid, and failed states.
- [ ] Add a plan-change confirmation screen showing proration.

**Acceptance:** An owner can upgrade, downgrade, cancel, and recover from a
failed payment without creating duplicate subscriptions or losing audit history.

### 7.4 Team and organization lifecycle

- [ ] Add ownership transfer with an explicit confirmation flow.
- [ ] Add "leave organization" for non-owners.
- [ ] Add organization deletion: soft-delete, grace period, purge job, and audit.
- [ ] Add resend invite, copy invite link, and bulk invite.
- [ ] Add member search and pagination.
- [ ] Add custom roles only if the four-role model proves insufficient.
- [ ] Add organization creation after onboarding.
- [ ] Add organization slug/domain settings.
- [ ] Add an SSO configuration surface for Enterprise.
- [ ] Enforce the `team` and `audit_log` plan features in pages and APIs.
- [ ] Add audit events for every organization/team mutation.

**Acceptance:** Owners can transfer ownership and delete an org safely; admins
can manage members; plan restrictions are enforced server-side.

### 7.5 AI product features

- [ ] Move `GEMINI_API_KEY` server-only and rotate any exposed key.
- [ ] Fetch org data server-side for chat/insights instead of trusting
      client-supplied `contextData`.
- [ ] Add strict payload size and row-count limits.
- [ ] Add streaming responses to the chat UI.
- [ ] Persist conversations and messages (`ai_conversations`, `ai_messages`).
- [ ] Add saved insights and an insights history.
- [ ] Render AI Markdown with `components/ui/markdown.tsx`.
- [ ] Add toast/inline errors for 403, 429, and 500 responses.
- [ ] Add retry, abort, and a visible remaining-AI-calls meter.
- [ ] Add feedback (helpful/not helpful) and optional regeneration.
- [ ] Make the system prompt configurable instead of hardcoding a
      pharmaceutical company.
- [ ] Add per-org token/cost accounting if Gemini billing requires it.
- [ ] Add prompt-injection and output-sanitization tests.

**Acceptance:** A user can ask a question, see a streamed Markdown answer, reload
the conversation later, and cannot forge another org's data context.

### 7.6 Public API completeness

- [ ] Publish an OpenAPI specification.
- [ ] Add an API docs page with authentication and examples.
- [ ] Add scopes (`metrics:read`, `insights:read`, `data:write`) and enforce them.
- [ ] Add key expiry, rotation, and optional IP allowlists.
- [ ] Add pagination, filtering, and date ranges to metrics.
- [ ] Add data import/write endpoints if customers need programmatic ingestion.
- [ ] Add per-key usage analytics and last-used IP.
- [ ] Replace the hardcoded 100/min limit with plan-based limits.
- [ ] Move rate limiting to a shared store so it works across instances.
- [ ] Add idempotency keys for write endpoints.
- [ ] Add API audit events that identify the key used.

**Acceptance:** A customer can create a scoped key, call documented endpoints,
see usage, and revoke the key; limits differ by plan.

---

## 8. Phase 3 — Security and Compliance

### 8.1 Auth and abuse protection

- [ ] Add persistent rate limiting to login, signup, password reset, invite
      acceptance, and all mutating routes.
- [ ] Add CAPTCHA or progressive delays for repeated failed logins.
- [ ] Add MFA (TOTP) and recovery codes.
- [ ] Add session listing and remote revoke.
- [ ] Add account deletion with data-retention rules.
- [ ] Add password strength requirements and breached-password checks if
      feasible.

### 8.2 Application security

- [ ] Replace the current CSP with a nonce-based policy; remove
      `unsafe-eval` and, if possible, `unsafe-inline`.
- [ ] Add request body size limits at the route/proxy layer.
- [ ] Add origin validation in addition to the custom CSRF header.
- [ ] Add security headers review (`X-Robots-Tag`, cache policies for auth pages).
- [ ] Add dependency scanning and `npm audit` in CI.
- [ ] Add secret scanning and a documented key-rotation runbook.
- [ ] Add a security review checklist for every new mutation route.

### 8.3 Audit and compliance

- [ ] Enforce plan-based audit retention with a scheduled cleanup job.
- [ ] Add audit search by user, resource, action, and date.
- [ ] Add CSV/JSON export.
- [ ] Add append-only protections and a hash chain or signed checkpoints.
- [ ] Add system-actor support for webhooks and cron jobs.
- [ ] Add audit events for login, logout, AI queries, data exports, and
      permission changes.
- [ ] Add data-subject export/deletion workflows.
- [ ] Document retention, backups, and incident response.

---

## 9. Phase 4 — UX and Platform

### 9.1 Responsive app shell

- [ ] Use `hooks/use-mobile.ts` to add a mobile sidebar/drawer.
- [ ] Make tables scroll or collapse on small screens.
- [ ] Verify auth and marketing pages on mobile.

### 9.2 App states

- [ ] Add `loading.tsx` for dashboard, team, API keys, audit, billing, settings.
- [ ] Add route-level `error.tsx` boundaries.
- [ ] Add a custom `not-found.tsx`.
- [ ] Add empty states for every data view.
- [ ] Add skeleton loaders rather than layout shifts.

### 9.3 Marketing and trust

- [ ] Add documentation, privacy, terms, security, support, and status pages.
- [ ] Replace "Live demo" with a seeded demo org and documented demo access, or
      remove the claim.
- [ ] Add per-page metadata, sitemap, robots.txt, and OG images.
- [ ] Add a real contact/sales flow instead of a toast that says "contact sales."
- [ ] Add accessibility review: labels, focus management, keyboard navigation,
      color contrast, and screen-reader checks.
- [ ] Add a notification center if in-app alerts are required.

---

## 10. Phase 5 — Quality and Operations

- [ ] Unit tests for RBAC, plans, limits, CSRF, sanitization, alert comparison,
      CSV parsing, and webhook mapping.
- [ ] Integration tests for every API route with mocked Supabase/Stripe/Gemini.
- [ ] RLS tests for viewer/member/admin/owner and cross-org isolation.
- [ ] E2E tests for signup, login, org creation, invite acceptance, AI, billing,
      data import, and alert delivery.
- [ ] Add structured logging with request IDs and org/user context.
- [ ] Add error tracking and alerting for server errors and webhook failures.
- [ ] Add `/api/health` for deployment checks.
- [ ] Add database backup/restore documentation and a restore drill.
- [ ] Add deployment documentation for Vercel and Supabase.
- [ ] Add a cron/scheduled-job deployment path.
- [ ] Remove unused dependencies and dead assets:
      `@tanstack/react-query`, `date-fns`, `motion`, `firebase-tools`,
      `hooks/use-mobile.ts` (or use it), and unused Markdown pieces if not wired.
- [ ] Add a release checklist and rollback procedure.

---

## 11. Delivery Sequence and Milestones

| Milestone | Contents | Exit criteria |
|---|---|---|
| M0 — Foundations | Env validation, test harness, DB types, seed, CI | Fresh clone builds, tests, and seeds |
| M1 — P0 blockers | 6.1–6.9 | No redirect loop; AI/billing/invites/OAuth work; migration and RLS tests pass |
| M2 — Data | 7.1 | Real CSV data appears on the dashboard; mock fallback removed |
| M3 — Alerts | 7.2 | Rules evaluate and deliver notifications with cooldowns |
| M4 — Billing lifecycle | 7.3, 6.8 | Upgrade/downgrade/cancel/payment failure handled |
| M5 — Team/org | 7.4 | Ownership transfer, deletion, resend, plan gating |
| M6 — AI + API | 7.5, 7.6 | Streaming chat, persistence, scoped/documented API |
| M7 — Hardening | Phase 3 | Security review, rate limits, CSP, audit retention |
| M8 — UX/QA | Phase 4–5 | Mobile, states, docs, full test suite, monitoring |

### Suggested first two sprints

**Sprint 1**
- 6.1 org resolution loop
- 6.2 CSRF helper
- 6.3 Stripe price IDs and checkout safety
- 6.4 OAuth callback
- 0.1 env validation
- Add regression tests for each fix

**Sprint 2**
- 6.5 invitations
- 6.6 migration bootstrap
- 6.7 RLS/RBAC
- 6.8 webhooks
- 6.9 signup UX

---

## 12. Definition of Done

A feature is done only when:

- [ ] The happy path works through the real UI, not just a route test.
- [ ] Permission checks exist in both the route handler and RLS.
- [ ] Cross-org isolation is tested.
- [ ] Errors are surfaced to the user and logged on the server.
- [ ] The mutation is audited where appropriate.
- [ ] Unit/integration tests cover the behavior and at least one failure case.
- [ ] `npm run lint`, typecheck, tests, and build pass.
- [ ] The README and environment documentation are updated.
- [ ] No secrets or service-role clients enter client bundles.

---

## 13. Open Decisions

1. **Data schema:** Keep the current denormalized `sales_data` / `inventory_data`
   shape, or introduce normalized orders/products tables?
2. **Billing model:** Flat plans or per-seat pricing? This determines whether
   Stripe subscription quantities are needed.
3. **Upgrade UX:** Use Stripe Checkout for first purchase and the customer
   portal for all later changes, or implement in-app subscription updates?
4. **Email provider:** Which transactional email service will handle invites,
   alerts, and billing notifications?
5. **Alert delivery:** Is Slack required at launch, or is email sufficient?
6. **Audit immutability:** Is append-only plus hash chain enough, or does the
   product need WORM storage for compliance?
7. **SSO scope:** Google/GitHub OAuth only, or SAML for Enterprise customers?
8. **Demo mode:** Should every new org get sample data automatically, or should
   data be explicitly imported?
9. **Background jobs:** Vercel Cron, Supabase scheduled functions, or an
   external queue?

---

## 14. Key File References

| Concern | Files |
|---|---|
| Org resolution | `app/(app)/layout.tsx`, `app/onboarding/page.tsx`, `lib/auth/requireOrg.ts` |
| CSRF | `lib/security/csrf.ts`, `components/dashboard/AiInsights.tsx`, `components/dashboard/NlqChat.tsx`, `app/(app)/billing/BillingView.tsx` |
| Billing | `lib/billing/plans.ts`, `lib/billing/stripe.ts`, `app/api/billing/*`, `app/(app)/billing/*` |
| Invitations | `app/api/team/accept-invite/route.ts`, `app/api/team/invite/route.ts`, `app/(auth)/accept-invite/[token]/page.tsx` |
| Auth | `components/auth/AuthForm.tsx`, `middleware.ts`, new `app/auth/callback/route.ts` |
| Schema/RLS | `supabase/migrations/0001_enterprise.sql` |
| Audit | `lib/audit/log.ts`, `app/(app)/audit/*`, `app/api/audit/route.ts` |
| Data | `app/(app)/dashboard/page.tsx`, `lib/mock-data.ts`, new `/data` routes |
| Alerts | `app/(app)/settings/SettingsView.tsx`, new `lib/alerts/*` |
| AI | `app/api/chat/route.ts`, `app/api/insights/route.ts`, `components/ui/markdown.tsx` |
| Public API | `app/api/v1/*`, `lib/auth/apiKeyAuth.ts` |

---

## 15. Success Criteria for the First Production Release

- [ ] A new user can sign up, confirm email, create an org, and import data.
- [ ] A dashboard shows only that org's real data, with an intentional empty
      state when no data exists.
- [ ] An owner can upgrade, downgrade, and cancel a subscription.
- [ ] An owner can invite a teammate, and only that teammate can accept.
- [ ] An admin can create an alert; the alert fires and delivers a notification.
- [ ] A user can ask an AI question and receive a streamed, persisted answer.
- [ ] A customer can create a scoped API key and call documented endpoints.
- [ ] A viewer cannot perform admin actions through the UI or direct Supabase
      calls.
- [ ] Every privileged action appears in the audit log.
- [ ] Lint, types, unit, integration, RLS, E2E, and build checks pass in CI.
- [ ] Production has error tracking, health checks, backups, and a rollback plan.

---

## 16. Implementation Progress

### Completed in the current pass

- [x] Org resolution loop fixed with `/select-org` and safe onboarding behavior.
- [x] Shared CSRF-safe client fetch helper; AI, billing, team, API-key, settings,
      onboarding, and invite requests updated.
- [x] OAuth/email callback and confirmation routes.
- [x] Signup no longer redirects without a session; post-auth redirects preserved.
- [x] Invite acceptance verifies the signed-in email, supports explicit accept,
      validates tokens without consuming them, and supports resend/copy-link.
- [x] Server-side Stripe price IDs, checkout allowlisting, and portal-based plan
      changes for existing customers.
- [x] Base schema migration and hardened RLS policies, including audit, owner,
      invitation, API-key, and feature-flag boundaries.
- [x] Stripe webhook idempotency, customer-to-org resolution, subscription state,
      payment-failure handling, and valid audit actors.
- [x] CSV import/export/templates, sample-data loading, import history, and real
      dashboard empty states.
- [x] Alert evaluation, cooldown deduplication, Slack/email-relay delivery,
      manual runs, history, and a secret-protected cron endpoint.
- [x] Ownership transfer, leave-organization, team plan gating, and audit plan gating.
- [x] Server-side AI data context, conversation/message persistence, Markdown
      rendering, and user-facing AI errors.
- [x] Unit tests (27), CI workflow, health endpoint, mobile navigation, loading,
      error, and 404 pages.
- [x] `0002_security_and_features.sql` now applies to a fresh database (it
      previously aborted on a malformed `owns_ai_conversation` function, so the
      new tables, billing columns, and hardened policies never existed).
- [x] Business data policies tightened so viewers are read-only at the database
      level, matching the application RBAC model.
- [x] `supabase/tests/rls.sql` (24 assertions) and a CI `database` job that
      applies the migrations to a clean Supabase Postgres image and runs the
      RLS suite.
- [x] Generated Supabase types (`lib/supabase/types.ts`, `npm run db:types`)
      wired into the browser/server/admin clients, with row aliases in
      `lib/supabase/rows.ts`. Every `any[]` prop and `as unknown as` cast in the
      dashboard, data, audit, team, billing, chat, and alert paths is gone.
- [x] Tenancy columns the application always populates
      (`organization_invitations.org_id`, `api_keys.org_id`) are `NOT NULL`;
      role strings read from the database go through a checked
      `parseOrgRole()` instead of an assertion.

### Still open

- [ ] Full billing lifecycle: invoices, proration, tax, coupons, trials, dunning.
- [ ] Public API scopes, expiry/rotation, per-key analytics, OpenAPI docs, and
      write/import endpoints.
- [ ] Enterprise SSO/SAML, MFA, account deletion, session management, and
      persistent auth rate limiting.
- [ ] AI streaming and a conversation-history UI.
- [ ] Audit immutability/hash chain, export, search, and legal hold.
- [ ] Demo seed, Docker deployment config, and E2E test suites (the RLS suite
      and generated types now exist).
- [ ] Error tracking, structured logging, backup/restore drills, and production
      runbooks.

### Verification

- `npm run lint` — passes.
- `npm run typecheck` — passes.
- `npm test` — 27 tests pass.
- `npm run build` — passes.
- Migrations `0000` → `0002` apply cleanly, in order, to a fresh Supabase
  Postgres 17 database (all 17 tables created).
- `supabase/tests/rls.sql` — 24 assertions pass against that database; the
  suite is also run in CI.
- Mutations that carried loose casts (audit metadata, Stripe webhook updates,
  CSV import/export, alert rules) were re-checked with `npm run typecheck`
  against the generated types.
