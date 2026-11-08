# InternIQ Product Readiness Plan

Assessment date: 2026-11-09. Percentages are scope estimates, not test scores or a claim of a production launch.

## Current readiness

| Area | Estimate | Evidence | Remaining gap |
| --- | ---: | --- | --- |
| Local-first product scope | 85% | Local SQLite registration/sign-in, account-scoped profile/saved/applications/checklist, resume drafts, community/events, public live-feed adapters, role matching, resume tools, interview practice, networking drafts, offer comparison, branding tips, GitHub profile lookup, dashboard workspace, alert preferences, and optional email delivery are implemented. A live refresh during this assessment returned 165 roles (101 Greenhouse, 50 Lever, 14 Ashby); Jobicy responded with no matching roles. All 165 had titles, companies, locations, descriptions, dates, and HTTPS application URLs, with no duplicate URLs. Source-provided dates on 26 roles are over a year old even though the public boards still return them; a sample of older application pages loaded successfully, but the employer page remains the authority on application status. The demo account signs in and reaches the dashboard. Sixteen student routes have passed desktop/mobile rendering checks. | Source coverage and freshness are not guaranteed; some tools are intentionally browser-local, and a first-run database stays empty until a live refresh. OCR, password recovery, user acceptance, and production-grade account operations remain out of scope for this local prototype. |
| Agentic / retrieval prototype | 70% | Chunking, embedding/index interfaces, PostgreSQL/pgvector retrieval, and structured mentor output are implemented. SQLite role matching works offline with explainable term/profile overlap. | No configured PostgreSQL, Gemini, or Groq credentials; a live scrape → embed → vector retrieve → grounded mentor journey has not been demonstrated in this workspace. |
| Production readiness | 25% | Local CI commands and end-to-end checks cover the main auth and browsing journeys; deployment definitions exist for a future hosted environment. | No staging deployment, production secrets, monitoring/alerts, recovery exercise, accessibility review, or user acceptance results. |

These estimates track implemented scope separately from operating evidence. The local prototype can demonstrate sign-up, sign-in, live-source refresh, internship search, dashboard workflows, and browser tools. It is not a hosted service, and optional vector/LLM paths have not been validated with live provider credentials.

## Implemented in this delivery

- [x] Make internship browsing and the six browser-local career tools public while keeping saved items, application tracking, profile data, and semantic search behind verified authentication.
- [x] Route signed-out visitors from `/` to the public feed and provide a sign-in link after a guest save attempt.
- [x] Add deterministic backend tests for identity boundaries, search validation, ingestion normalization, embedding reuse, retrieval ordering, and the authenticated mentor route's grounded structured response.
- [x] Add six simulated-browser interaction tests covering resume drafting, template handoff, PDF rejection, interview practice, networking copy, and offer comparison.
- [x] Add four simulated-browser internship-feed tests covering URL-backed search, guest sign-in return, semantic search routing, and signed-in save/application actions.
- [x] Add a simulated-browser mentor test covering the authenticated request context, structured response, citations, next steps, and recommended internship.
- [x] Add Chromium end-to-end smoke tests for public search, guest sign-in return, mobile feed layout, and guest access to all six browser-local career tools.
- [x] Add strict TypeScript checking for the app, frontend tests, and Vite configs.
- [x] Add backend test dependencies and run the suite in CI.
- [x] Build a browser-local resume editor with preview, local autosave, plain-text export, and print/save-to-PDF.
- [x] Replace the resume scanner placeholder with a local PDF text checklist and optional job-description keyword comparison; bundle its PDF worker locally and cap file size/pages.
- [x] Add three template choices connected to the resume builder.
- [x] Add role-specific interview practice prompts with self-review guidance.
- [x] Add personalized networking-message drafts with clipboard copy.
- [x] Add side-by-side offer arithmetic for contract pay and student-entered benefit value.
- [x] Remove the dead placeholder component and obsolete CDN-worker resume analyzer.
- [x] Verify the demo user can sign in through the app and load the authenticated dashboard.
- [x] Add a dashboard workspace with direct grouped links to opportunity, profile, and career-prep workflows.
- [x] Add account-scoped alert preferences, interval-aware in-app polling, and opt-in Resend/local-log email delivery with retries and signed one-click unsubscribe.
- [x] Retry queued alert emails in the background when delivery is configured; discard messages for deleted or opted-out accounts and retain unprocessed messages after a provider failure.
- [x] Guide new students from an incomplete profile to add skills, set a target role, view ranked matches, and enable alerts.
- [x] Keep the floating help control clear of the dashboard onboarding action and fit the GitHub tracker search row on a 375px viewport.
- [x] Remove invented internship seeding; test fixtures are isolated to backend tests, and the product feed uses fetched public postings only.
- [x] Show source-by-source counts and states after a live refresh so students can tell which boards returned roles and which had no matches.
- [x] Check the main routes for resume tools, interview practice, networking, salary comparison, profile, saved items, applications, community/events, branding, and GitHub lookup.
- [x] Review screenshots for all 16 student routes at desktop and mobile sizes; the automated sweep reports no horizontal overflow or uncaught browser errors. Route checks confirm named controls, alt attributes, one visible page heading, and one main landmark; Axe scans WCAG 2.0, 2.1, and 2.2 A/AA rules at each route after entrance animations settle. Automated checks supplement, but do not replace, a full manual accessibility review.
- [x] Verify the A4 resume print output is one page for a sample draft, excludes editor controls, and can be read by the browser-local scanner. Exercise unsupported file type, oversized PDF, and malformed-PDF error paths.

The browser-side resume, interview, networking, and compensation tools make no AI or market-data claims. Resume drafts are stored in the browser and synced to SQLite for signed-in users; the scanner reads PDF text locally. The calculator formats user-entered figures and excludes tax, exchange rates, and external wage benchmarks.

## Remaining delivery gates

### A. Full local and UI verification

- [x] Local frontend lint, strict typecheck, production build, 19 frontend interaction tests, six Chromium end-to-end tests, and 63 backend tests pass in the current workspace.
- [x] Exercise public feed, local registration/session restore/sign-in/profile save, mobile layout, and guest access to the browser-local career tools in Chromium.
- [x] Sign in to the local demo account and verify the authenticated dashboard renders.
- [x] Visually review every career-tool route and responsive layouts beyond the internship feed.
- [x] Verify print-to-PDF round-trip through the resume scanner, plus unsupported, oversized, and malformed PDF handling.
- [x] Add automated frontend interaction coverage for all six career tools.
- [x] Add automated frontend coverage for URL-backed keyword search, semantic search routing, guest sign-in return, authenticated save/application actions (controlled API responses), and real-browser access to guest career tools.
- [x] Add automated frontend coverage for the mentor interaction flow, including the structured response and source rendering.
- [x] Remove unmounted legacy pages/layouts that duplicated current routes or exposed stale links; document the remaining manual external-API probes.

**Exit evidence:** local lint/type/build, 19 frontend interaction tests, 63 backend tests, six Chromium journeys, a 16-route responsive/Axe accessibility sweep, a source-refresh walkthrough, and a print-to-scan browser walkthrough pass. This establishes a repeatable local prototype walkthrough; staged provider-backed retrieval, full manual accessibility review, and product acceptance remain separate gates.

### B. Staging integration

- [ ] Configure Supabase Auth, PostgreSQL with pgvector, Gemini embeddings, and Groq output using secrets kept outside source control.
- [ ] Apply the schema and verify database roles/permissions, migrations, CORS, health checks, and auth-token validation.
- [ ] Run a real source refresh → normalized records → chunking/embedding → pgvector retrieval → schema-valid grounded response.
- [ ] Verify private saved/application/profile data stays scoped to the authenticated account.
- [ ] Verify the frontend against the deployed API and capture staging smoke-check results.

**Exit evidence:** a deployed staging system completes the student journey with provider-backed data and passes security, reliability, and functional checks.

### C. Production release

- [ ] Review source-site permissions, rate limits, data retention, privacy disclosure, and takedown handling.
- [ ] Configure secrets rotation, logs/alerts, backups, restore test, scraper failure alerts, and an operational runbook.
- [ ] Complete accessibility and responsive review, product acceptance, and incident/recovery rehearsal.
- [ ] Deploy frontend, API, database, and scheduled scraper; verify the production domain and monitoring.

**Exit evidence:** signed product acceptance, operational ownership, tested recovery, and observed production behavior. Production readiness is distinct from code completion.

## Provisional technology readiness

For this software project, use a software-specific interpretation of the NASA TRL scale: [NASA Earth Science and Technology Office TRL definitions](https://esto.nasa.gov/trl/). Current internal assessment: **provisional TRL 4, laboratory prototype**. The repository contains functionally integrated code paths and deterministic local validation with controlled data/providers. This is an engineering estimate, not an external certification.

| Gate | Evidence required before claiming it |
| --- | --- |
| TRL 3 | Critical functions demonstrated as a proof of concept with documented results. |
| TRL 4 — current provisional ceiling | Critical software components integrated and validated in a controlled local environment; retain test outputs and environment notes. |
| TRL 5 | End-to-end software interfaces run against realistic staging data/services in an environment representative of intended use, with measured results. |
| TRL 6–7 | Functional prototype demonstrated on realistic workloads, then integrated and shown in the intended operational environment. |
| TRL 8–9 | Full verification, operational documentation/support, and sustained successful operation in the real environment. |

Do not raise the rating on the basis of added code, a successful build, or mocked tests alone. Record the test environment, data representativeness, integrations, outcomes, and known limitations for each assessment.

## Time estimate and dependencies

- Eighteen frontend interaction tests, six Chromium end-to-end tests, 63 backend tests, strict frontend type-checking, lint, and the production build pass locally. Live staging and production remain gated on external services and credentials.
- A first staging integration pass is estimated at **0.5–1.5 focused days after** valid database, model-provider, auth, and cloud access are available. Provider approval, database provisioning, or source-site changes can extend that calendar time.
- Production launch time is not responsibly estimable until staging results, product acceptance, monitoring, and operating ownership are known.
- At the last workspace audit, `.env`, provider credentials, a live PostgreSQL/pgvector instance, and cloud project access were unavailable. No TRL above the local prototype level is supported by evidence yet.
