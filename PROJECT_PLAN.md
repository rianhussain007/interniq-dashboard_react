# InternIQ Product Readiness Plan

Assessment date: 2026-11-08. This is an evidence-based engineering estimate for the code in this repository, not a claim of a live production launch.

## Current readiness

| Area | Estimate | Evidence | Remaining gap |
| --- | ---: | --- | --- |
| Agentic aggregator prototype | 80% | Scraper normalization, chunking, embedding/index interfaces, pgvector retrieval, structured mentor output, search filters, and deterministic unit/API tests are implemented. The public feed, guest sign-in return, and mobile layout now pass Chromium checks with controlled API data; semantic retrieval routing is covered with a controlled response. | No configured database/model/auth provider, so no real scrape → index → retrieve → grounded answer run or provider-backed authenticated journey has been exercised. |
| Whole dashboard prototype | 82% | Core dashboard, search, saved/application flows, resume analyzer, and all six previously empty career-tool routes now have usable workflows. Eleven interaction tests and three Chromium smoke tests cover career tools, public search, guest sign-in return, mobile layout, a protected resume-builder route, and structured mentor requests/responses. | A full visual review of every tool, print output, and PDF edge case remains; API responses and the browser auth session in automated UI tests are controlled fixtures. |
| Production readiness | 45% | GitHub CI passed for [`0234ad0`](https://github.com/rianhussain007/interniq-dashboard_react/actions/runs/42506572141), including frontend lint, strict type-checking, eleven simulated-browser interaction tests, build, 15 deterministic backend tests, Python syntax checks, and backend container build. `npm audit` reports zero vulnerabilities. | No provisioned staging environment, live-provider evidence, deployed app, production secrets, monitoring/alert checks, recovery exercise, or user acceptance results. |

These estimates track implementation and operating evidence separately. A compiled feature is not counted as a live integration. The prototype can be demonstrated today with controlled sample data; the current workspace cannot honestly demonstrate a live end-to-end service.

## Implemented in this delivery

- [x] Make internship browsing public while keeping saved items, application tracking, profile data, and semantic search behind verified authentication.
- [x] Route signed-out visitors from `/` to the public feed and provide a sign-in link after a guest save attempt.
- [x] Add deterministic backend tests for identity boundaries, search validation, ingestion normalization, embedding reuse, retrieval ordering, and the authenticated mentor route's grounded structured response.
- [x] Add six simulated-browser interaction tests covering resume drafting, template handoff, PDF rejection, interview practice, networking copy, and offer comparison.
- [x] Add four simulated-browser internship-feed tests covering URL-backed search, guest sign-in return, semantic search routing, and signed-in save/application actions.
- [x] Add a simulated-browser mentor test covering the authenticated request context, structured response, citations, next steps, and recommended internship.
- [x] Add Chromium end-to-end smoke tests for public search, guest sign-in return, mobile feed layout, and a protected resume-builder workflow using a test-only session.
- [x] Add strict TypeScript checking for the app, frontend tests, and Vite configs.
- [x] Add backend test dependencies and run the suite in CI.
- [x] Build a browser-local resume editor with preview, local autosave, plain-text export, and print/save-to-PDF.
- [x] Replace the resume scanner placeholder with a local PDF text checklist and optional job-description keyword comparison; bundle its PDF worker locally and cap file size/pages.
- [x] Add three template choices connected to the resume builder.
- [x] Add role-specific interview practice prompts with self-review guidance.
- [x] Add personalized networking-message drafts with clipboard copy.
- [x] Add side-by-side offer arithmetic for contract pay and student-entered benefit value.
- [x] Remove the dead placeholder component and obsolete CDN-worker resume analyzer.
- [x] Browser-check the guest internship feed and save-to-sign-in prompt using a local sample API.

The browser-side resume, interview, networking, and compensation tools make no AI or market-data claims. The resume draft is stored only in the user's browser; the scanner reads PDF text locally. The calculator formats user-entered figures and excludes tax, exchange rates, and external wage benchmarks.

## Remaining delivery gates

### A. Full local and UI verification

- [x] Local frontend lint, strict typecheck, production build, eleven frontend interaction tests, three Chromium smoke tests, 15 backend tests, and `npm audit` pass.
- [x] Exercise public feed, guest sign-in return, mobile feed layout, and the protected resume-builder route in Chromium with controlled local data.
- [ ] Visually review every career-tool route, print output, invalid PDF cases, and responsive layouts beyond the internship feed.
- [x] Add automated frontend interaction coverage for all six career tools.
- [x] Add automated frontend coverage for URL-backed keyword search, semantic search routing, guest sign-in return, authenticated save/application actions (controlled API responses), and a real-browser protected route.
- [x] Add automated frontend coverage for the mentor interaction flow, including the structured response and source rendering.
- [x] Remove unmounted legacy pages/layouts that duplicated current routes or exposed stale links; document the remaining manual external-API probes.

**Exit evidence:** clean CI plus a repeatable browser walkthrough for public search, sign-in, saving, application tracking, mentor/semantic search, print/PDF behavior, and all career tools.

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

- Eleven frontend interaction tests, three Chromium smoke tests, 15 backend tests, strict frontend type-checking, and the production build pass locally. The latest passing GitHub Actions run predates Chromium coverage; CI for that addition is pending. Live staging and production remain gated on external services and credentials.
- A first staging integration pass is estimated at **0.5–1.5 focused days after** valid database, model-provider, auth, and cloud access are available. Provider approval, database provisioning, or source-site changes can extend that calendar time.
- Production launch time is not responsibly estimable until staging results, product acceptance, monitoring, and operating ownership are known.
- At the last workspace audit, `.env`, provider credentials, a live PostgreSQL/pgvector instance, and cloud project access were unavailable. No TRL above the local prototype level is supported by evidence yet.
