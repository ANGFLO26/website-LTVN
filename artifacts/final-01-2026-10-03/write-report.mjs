import fs from 'node:fs';
const directory = 'artifacts/final-01-2026-10-03/';
const read = name => fs.readFileSync(directory + name, 'utf8');
const json = name => JSON.parse(read(name));
const inventory = json('inventory.json');
const suites = json('regression-results.json');
const integrity = json('integrity-after.json');
const responsive = json('qa16/results.json');
const purposes = {
  'Public frontend': 'Public visibility, contact submission/error locking, empty/detail states, block renderer, links, authored News VI/EN.',
  'Admin frontend': 'Auth gate/session, strict mutation errors, authored bilingual editor, URL config and basic responsive layout.',
  'API': 'JWT/global guard, projections, mutation allowlists/date handling, public visibility/contact validation, News translations.',
  'Database/schema/migration': 'Additive news_event_translations table, VI-only backfill, migration journal/snapshot; NOT EXECUTED.',
  'Tests': '12 API e2e files (1 modified/11 new), plus new auth config unit spec.',
  'QA scripts': '14 dedicated browser suites + QA-14C1 static schema verification.',
  'Documentation/config': 'API auth/env/dependencies; Admin public-site/API env examples.',
  'Artifacts': '104 non-ignored existing QA evidence files, 146 files including ignored outputs; preserved.'
};
const report = `FINAL-01 — cumulative QA-01–16 local audit, 2026-10-03

A. Repository baseline
HEAD: ${integrity.headBefore}
Dirty cumulative working tree: 49 tracked modified files; 156 non-ignored cumulative untracked files, excluding FINAL-01 artifacts.
git diff --stat: 49 files changed, 2993 insertions(+), 695 deletions(-).
git diff --check: PASS before and after (line-ending notices only).
No reset/revert/stash, deletion, commit or push.

Area | Modified | New | Purpose
${inventory.filter(row => row.area !== 'UNCLASSIFIED').map(row => `${row.area} | ${row.modified.length} | ${row.new.length} | ${purposes[row.area]}`).join('\n')}
Complete per-file inventory: inventory.json. Unclassified: 0. No accidental temporary file in production source found.

B. Build/lint matrix
npm run build: PASS, includes VI/EN validation, TypeScript and production Vite build.
npm run build:admin: PASS, TypeScript and production Vite build.
npm run build:api: PASS.
npm run lint: PASS (root command covers src, scripts, vite.config.ts; does not claim a separate Admin/API lint).
git diff --check: PASS.
npm --prefix api run lint: FAIL, 1 known baseline error at api/src/database/seed.ts:1727 no-floating-promises.
seed.ts Git blob equals HEAD: bcf8916d3f56cbb9cd3272f339970631432ff458.
7 cumulative warnings: 6 unused values/parameters in news-translations.e2e-spec.ts and 1 unused sql import in news-events.service.ts.
No new lint error; no automatic fix.

C. API test matrix
npm --prefix api run test:e2e: 12/12 test files, 433/433 PASS. Expected count unchanged.
Files: app, auth, content-visibility, machines-mutation, media-mutation, news-mutation, news-translations, public-contact, qa03-date-control, standards-mutation, user-relations, users-mutation.
Additional npm --prefix api test: 2/2 files, 12/12 unit tests PASS.
All persistence providers are mocked or drizzle.mock SQL compiler controls; no real database.
The simulated translation-insert exception in api-e2e.log is an expected negative case.

D. Full browser regression
Suite | PASS checkpoints | Exit
${suites.map(row => `${row.suite} | ${row.passCheckpoints}/${row.passCheckpoints} | ${row.exitCode}`).join('\n')}
14/14 suites PASS; ${suites.reduce((sum,row) => sum + row.passCheckpoints,0)} PASS checkpoints. No suite skipped because it passed earlier.
QA-02/03/07 have no separate dedicated browser script in this tree. Their user-relations, qa03-date-control and content-visibility harnesses ran in the full API regression.
QA-14C1: 10/10 static checks PASS.
QA-14C4 and QA-15 outputs were redirected by their existing env options.
QA-16 was run from an artifact copy with only its output directory literal redirected; reverse-substitution equality verifies all original assertions unchanged. Original scripts and old artifacts were not edited.

E. Migration consistency
Offline serialization of compiled current schema exactly matches 0001 snapshot; differences=[]; SQL matches snapshot, sqlIssues=[].
0000 -> 0001 journal sequence valid, timestamps increase, snapshot prevId chain valid.
Initial snapshot has 11 tables; current has 12. Added table: public.news_event_translations. Altered legacy tables: NONE.
0001 is additive: translation table, FK cascade, locale check vi/en, globally unique translation slug, unique event/locale and indices.
Backfill copies title/slug/short_description/content/location/timestamps from legacy news_events into locale='vi' only.
No DROP legacy column/table, no generated EN data, no test/dev records in migrations.
Migration not executed. Evidence: migration-consistency.json; schema-static.log.

F. Cross-layer News translation contract
Admin form -> saveNewsEvent payload -> DTO -> Service -> schema -> public API -> DataContext -> NewsPage/ArticlePage inspected.
VI required: Admin and CREATE enforce it; authenticated UPDATE fails the same invariant (B2).
EN optional: blank EN omitted; authored EN sent separately, omitted translation preserved, no automatic translation.
JSON blocks: matching version/blocks shape, independent locale parser, safe unknown/malformed skipping. Admin type permits more block types than public supported renderer; intentional QA-12 skip-safe behavior.
VI/EN slugs: independent authored slugs; route switch works both directions; table has global unique slug.
Policy A: public lists filter authored EN, drafts hidden, VI-only public EN detail gives explicit unavailable UI and Vietnamese-version action; unknown slug gives true 404.
Public loader requests all authored locales, allowing unavailable-state distinction. Explicit API locale=en detail rejects VI-only with 404 per backend locale contract.
Independent tree proof: VI heading/paragraph/image/paragraph/quote -> H2/P/FIGURE/P/BLOCKQUOTE (5); EN paragraph/bullet_list/heading -> P/UL/H3 (3).
Dynamic News synthesized translation calls = 0.
Legacy VI title/excerpt/content work; legacy top-level location is lost (B3).
Admin form includes eventEndAt but API helper omits it (B1).
Non-blocking typing debt: Admin NewsEvent.content is non-nullable though database/translation content may be null; author/assignedUser interfaces use full User while API deliberately projects id/fullName. Current forms guard these reads; no crash observed.

Blocking findings (no remediation)
B1 / P1 — admin/src/services/api.ts:1982–2008, notably line 1993; NewsEventsPage.tsx:313,624,636.
Production Chromium UTC: enter end=2026-11-11T11:45 and start=09:00, Save -> POST sends eventStartAt but no eventEndAt. HTTP mock success closes modal; reopening end is empty. Editing end=2026-11-12T12:45 -> PUT again omits eventEndAt. Backend DTO/service/schema accept this field, so the loss occurs at Admin payload mapping.
Evidence: event-end-proof.json, event-end-browser-proof.mjs/.log, event-end-entered.png.
B2 / P2 — api/src/modules/news-events/news-events.service.ts:396,399,432,433.
Compiled actual Nest API + global JWT guard + in-memory DRIZZLE: PUT translations.vi={title:'',slug:'valid-vi-slug'} returns 200; PUT {title:'   ',slug:''} returns 200. Both writes overwrite parent and VI translation. Expected 400 with existing required VI preserved. NOT NULL alone does not reject empty strings.
Evidence: vi-update-proof.json, vi-update-proof.mjs/.log. No PostgreSQL used.
B3 / P2 — src/context/DataContext.tsx:77,357.
Legacy published event response without translations contains authored top-level location. Production public Chromium renders VI title/excerpt/body but .article-location count=0 and location text absent. ApiNewsEvent also omits the top-level location property. Current backend fills translations.vi, so this specifically violates promised legacy response compatibility.
Evidence: legacy-location-proof.json, legacy-location-browser-proof.mjs/.log, legacy-location-missing.png.

G. Auth/security checks and route inventory
Global APP_GUARD uses JWT verify, fixed HS256 issuer/audience and current active Admin account check. Missing/weak secret or invalid TTL fails closed; no fallback JWT secret.
Admin gate checks /auth/me on reload; Bearer token attached; 401/403 or expiry clears session and unmounts shell. Identity projections exclude passwordHash.
News author and Contacts assignedUser queries select only id/fullName; Users responses use explicit safe projection.
Public Contact ValidationPipe rejects unknown/system fields and service explicitly maps six visitor fields, forces status=new/null assignment/admin note/resolution.
Route | Public | Protected
/api/auth | POST /login | GET /me
/api/machines | GET list/detail, published only | POST, PUT/:id, DELETE/:id; GET /api/admin/machines list/detail all statuses
/api/news-events | GET list/detail, published only; authored locale projection | POST, PUT/:id, DELETE/:id; GET /api/admin/news-events list/detail all statuses
/api/contacts | POST, validated visitor fields | GET list/detail, PATCH/:id, PATCH/:id/status, DELETE/:id
/api/media | NONE | GET list/detail, POST, DELETE/:id
/api/standards | NONE | GET list/detail, POST, PUT/:id, DELETE/:id
/api/users | NONE | GET list/detail, POST, PUT/:id, DELETE/:id
/api | GET health | —
/api/docs | Swagger middleware remains accessible | API calls still guarded independently
Sensitive search: passwordHash is internal schema/auth/placeholder or random test fixtures; password is expected login input; JWT_SECRET/DATABASE_URL are environment reads/examples; API_KEY absent. No actual committed secret or frontend/public passwordHash leak found. Actual ignored .env credentials were not printed or used.

H. Config/local development
Authoritative Admin source: admin/src/config/urls.ts. VITE_PUBLIC_SITE_URL and VITE_API_BASE_URL are independent.
Missing/invalid production public-site config disables website/product/news links. DEV-only public fallback localhost:5173.
API defaults to same-origin /api; bare configured origin gets /api; Swagger derives verified /api/docs; normalization and rel=noopener noreferrer preserved.
QA-15 configured/trailing-slash/development/missing-invalid cases PASS; no production user-clickable hardcoded localhost URL.
Local Vite proxies use localhost:3000, Admin dev port 5174; public development 5173. Production hostname not required for this local testing contract.
API env example has blank JWT_SECRET, TTL=3600 and explicit local PostgreSQL sample. Root .env.example absent; examples are in admin/ and api/.
API database.module.ts has an unguarded localhost PostgreSQL fallback, not NODE_ENV-gated; intentional local default/legacy production config debt, not a user-clickable link. API main.ts logs localhost endpoints as startup diagnostics.
Local builds and mock API boot verified. Real API/DB login is unverified and needs valid JWT settings plus a separately provisioned bcrypt Admin.

I. Dev/test leftover audit
Occurrence | Production reachable? | Intentional? | Risk
Admin api.ts INITIAL_* read cache/defaults | Yes, API read failure | Legacy fallback explicitly retained by QA-04 | Sample/stale data may appear on read error; no failed mutation fallback
api/src/modules/auth/auth.config.spec.ts mocks | No, build excludes specs | Unit test | None for runtime
News Service queryOne catch for mock translation lookup | Yes on failed translation lookup | Test-compatibility branch | May mask lookup error; real DB behavior deferred
MachinesPage crypto.randomUUID at lines 421/498/576 | Yes | Editor child-row identifiers | No fake save success; mutation still requires API
API main console.log; seed console.log | Main startup / seed only if explicitly invoked | Diagnostics | Main localhost message may be misleading in deployed logs; seed not run
MediaPage Unsplash example URL / env example.com | User-invoked sample metadata / example config | Example | External sample asset dependence; no test Internet request
localhost | Admin DEV helper, Vite proxy, API local DB defaults/startup logs, tests/docs | Classified above | No hardcoded production Admin clickable link
TODO/FIXME/debugger/alert/Math.random/fake/HARDCODE/temporary | No active production match found in source scan | — | No new issue from these patterns
No test/QA fixture imported into production modules; embedded Admin INITIAL_* defaults are separately acknowledged as legacy reachable data.
News no longer uses translator autoTranslate/autoLocalized/toLocalized; Machines still does.

J. Storage audit
src/i18n.tsx:291,312 | localStorage ltv-language get/set | Language preference | Acceptable
admin/src/services/api.ts:1711,1720 | ltvn_admin_* get/set | Read cache; writes only after successful remote reads/mutations | No failed save/delete persistence; legacy cache debt
admin/src/App.tsx:229 | localStorage.clear | Explicit Settings reset | Clears whole origin storage; legacy reset semantics debt; not triggered in this audit
admin/src/services/auth.ts:30,36,47,92 | sessionStorage ltvn_admin_session | Token for current tab plus in-memory session | Cleared by logout/expiry/401/403; not local fake-save fallback
QA-04 error propagation remains intact; B1 is a field omitted from a successful HTTP payload, not a reinstated offline mutation fallback.

K. Internal routes/links
Public mappings: /, /gioi-thieu, /pac, /san-pham/:slug, /tin-tuc-su-kien, /tin-tuc/:slug, /lien-he, catch-all 404.
/baker-hughes is intentionally unmapped; remaining occurrences are commented links/route, exclusion guards, comments or product-family identifiers. Home card is inside JSX comment. QA-13 browser checks PASS.
Admin product/news links use real public routes via configured helper. No reachable internal route/link mismatch found in tested/source-generated links.
Admin screens use currentView buttons, not a separate guessed URL router. mailto/tel/anchors are intentional. External sites were not crawled.

L. Responsive final smoke
${[375,768,1440].map(width => { const rows=responsive.matrix.filter(row => row.width===width); return `${width}px | ${rows.length}/9 pages verified | max document overflow ${Math.max(...rows.map(row=>row.overflow))}px | Dashboard main ${rows.find(row=>row.page==='Dashboard').main.width}px`; }).join('\n')}
Pages: Login, Dashboard, Machines, News, Media, Standards, Users, Settings, Contacts.
Breakpoint max-width1023: off-canvas drawer with X/backdrop/Escape/navigation close; desktop1440 retains 260px sidebar.
Machine table wrapper scrolls locally (client341/scroll884); no document overflow. Machine/News modal vertical scroll verified to bottom and back, Save/Cancel reachable; bilingual tab values retained.
15/15 QA-16 tests PASS; page errors=[]; unexpected network requests=[]. New screenshots in qa16/ only.

M. Scope/document alignment
One active Admin auth role matches v1; no customer-account/ecommerce module found in routers/modules.
Legacy editor enum/default/select remains in Users form/schema but cannot authenticate; non-blocking legacy scope debt.
Contact page has email/tel actions and required email-oriented visitor contract. Backend also persists leads and Contacts Admin CRUD remains; non-blocking legacy debt versus v1 brief. No SMTP/email delivery implementation found, so real email delivery is not claimed.
News authored VI/EN and basic desktop-priority responsive behavior match brief except explicit B1/B2/B3 gaps.
Available project docs: README.md deployment guidance, api/AUTH.md, api/README.md framework boilerplate. Compared against authoritative v1 scope in user instructions; no separate product-design document present in repository.
Documentation debt: AUTH.md still contains pre-QA-04 fallback/save-success phrasing; README lists CORS_ORIGINS/DB_POOL_MAX/DB_TIMEOUT_MS not consumed by current source, whereas main enables CORS. No documentation or infrastructure changed.

N. Known technical debt (separate from failures)
Blocking: B1 event end dropped; B2 blank VI update accepted; B3 legacy VI location lost.
Non-blocking: API lint unchanged seed error + 7 cumulative warnings; Contacts Admin and editor UI legacy scope; Admin read-only INITIAL_* / cache/reset behavior; non-null/full-User interface overstatements; documentation/config drift.
Deferred: Machines legacy dynamic EN translator; placeholder/sample user hashes and valid-account provisioning; production DB env validation/CORS configuration; real DB unique/FK/rollback/backfill behavior.
QA-14C2 mock coverage limitation: T7 checks VI unchanged but not new EN value; T8 checks HTTP status only; T9 checks500 but does not prove rollback; translation lookup mock ignores SQL predicate. Passing mock tests are not evidence of PostgreSQL constraints/transactions. Real DB verification remains explicitly deferred, not silently claimed.

O. Files changed by FINAL-01
Production source/config/schema/original tests/scripts: NONE.
Only new reports/logs/audit helpers/reproduction proofs/screenshots/build variants under artifacts/final-01-2026-10-03/.
Ignored build outputs were regenerated by requested builds. Old QA artifact directories remain byte-for-byte unchanged.

P. Database status
REAL POSTGRESQL TEST: NOT EXECUTED
MIGRATION: NOT EXECUTED
No db:push, migrate, seed, PostgreSQL CRUD, Neon/remote database connection, commit/push/deploy/cleanup.

Q. Git state after audit
HEAD unchanged: ${integrity.headAfter}
Checked ${integrity.checkedRepositoryFiles} original repository files: modified/deleted=[], added outside FINAL-01=[].
Old artifacts: ${integrity.oldArtifactFilesBefore}/${integrity.oldArtifactFilesAfter} files, changed=[], added=[], deleted=[].
Tracked diff stat unchanged; diff --check PASS. git-status-after.txt and git-diff-after.txt preserve exact command output.
${read('git-diff-after.txt')}
Exact git status --short:
${read('git-status-after.txt')}

R. Final verdict
LOCAL RELEASE CANDIDATE BLOCKED
Exact blocking items: B1 (P1), B2 (P2), B3 (P2), with isolated executable reproduction evidence above.
Stopped after audit. No remediation or PostgreSQL test started.
`;
fs.writeFileSync(directory + 'FINAL-01-AUDIT.txt', report);
console.log('Saved FINAL-01-AUDIT.txt; source changes NONE; verdict BLOCKED (B1/B2/B3).');
