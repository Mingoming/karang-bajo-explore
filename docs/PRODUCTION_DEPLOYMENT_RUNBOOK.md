# Production Deployment Runbook

## 1. Purpose and release authority

This runbook defines the controlled release procedure for the Karang Bajo Tourism Information System. It is an operational procedure, not authorization to deploy, access a hosted target, change production data, or publish content.

Before each release, create or locate the approved release evidence record and verify the current state at execution time:

- the current `origin/main` or other approved release source SHA;
- the pull request, reviewed head, and merged commit for the release;
- the current ordered migration inventory and exact pending migration filenames;
- the CI result for the exact reviewed head or merged SHA;
- the application deployment status and non-sensitive deployment identifier;
- the hosted target identity and database state through separately authorized read-only inspection;
- any incident or production issue status from current evidence, not from this reusable procedure.

The repository-backed boundaries are:

- migrations are ordered under `supabase/migrations/`; inspect the current inventory for every release;
- `.github/workflows/ci.yml` runs the `Quality` job with `npm ci` and `npm run check`;
- the CI workflow contains no Supabase migration command and does not prove application deployment;
- application deployment and hosted database migration deployment are separate release steps;
- use `config/public-routes.ts`, `features/`, and `app/` to determine the public and administrator scope in the release under review.

Do not turn a previous release record, migration list, test result, CI run, deployment status, or incident decision into a permanent assumption in this runbook.

## 2. Hard rules

1. All repository changes use a feature branch and pull request.
2. Never commit directly to `main`.
3. Perform an adversarial review of the release diff before commit and before merge.
4. Keep the protected `main` branch and required `Quality` check enforced.
5. Do not expose credentials, tokens, sensitive project identifiers, administrator identifiers, private URLs, or secret environment values in commands, logs, screenshots, evidence, issues, or pull requests.
6. Do not access a hosted target until the required hosted read-only authorization is explicit.
7. Read-only authorization does not authorize database, Storage, configuration, user, or content mutation.
8. Do not create a migration when the existing schema and migration history already support the release.
9. Apply only migrations present in the reviewed release baseline and explicitly approved for the target.
10. Do not run remote `migration repair` unless a separately authorized, proven migration-history incident requires it.
11. Never run `supabase db reset` against production.
12. Do not use a data or Storage repair as a substitute for diagnosing a code, schema, media-path, or contract root cause.
13. Do not infer, invent, translate, publish, or correct cultural information without verification by an authorized source.
14. Do not invent contact details, addresses, prices, schedules, map coordinates, or WhatsApp numbers.
15. Do not publish placeholders or unverified content.
16. Do not use destructive dependency remediation such as `npm audit fix --force`.
17. Stop immediately when evidence conflicts with the approved release scope.
18. Deployment operators must not combine approval, execution, and final acceptance into one unreviewed role.

## 3. Release scope and accountable roles

The application release must be built from the exact approved commit identified in the release record. The database release must be compared against the ordered migration inventory in that commit. Identify the migration boundary by filename, not by a hardcoded migration count.

Relevant source and evidence locations include:

- `package.json` for the quality gate and current application test scripts;
- `.github/workflows/ci.yml` for the repository CI boundary;
- `supabase/migrations/` for the migration inventory;
- `supabase/tests/database/` for database tests;
- `config/public-routes.ts` and public route implementations for the bilingual route contract;
- `features/` and `app/` for administrator, translation, image, media, and public workflows;
- the release evidence record for hosted, platform, content, browser, and operational results.

At minimum, identify these roles before deployment:

| Role | Responsibility |
| --- | --- |
| Release approver | Approves the exact commit, scope, and GO/NO-GO decision |
| Database approver | Separately approves hosted read-only inspection and database mutation |
| Database operator | Executes only the approved database procedure |
| Application operator | Deploys the approved application commit through the approved platform |
| Content verifier | Confirms Indonesian and English content against authorized sources |
| Production owner | Accepts operational ownership, access control, recovery, and handover |
| Independent reviewer | Reviews evidence and confirms that stop conditions were not bypassed |

One person may hold multiple roles only when the separation-of-duty risk is explicitly accepted and recorded.

## 4A. Pre-merge validation

Complete these steps on a feature branch before commit or merge:

1. Trace the requested change through its callers, routes, migrations, tests, and documentation.
2. Inspect the complete diff and confirm that unrelated `.gitignore` or `AGENTS.md` changes are not silently included.
3. Run `git diff --check`.
4. On Windows, run the repository quality gate as `npm.cmd run check`. This covers formatting, lint, typecheck, the current application test sequence, and the production build defined by `package.json`.
5. Run the relevant focused application tests and, for schema or policy changes, the current database tests under `supabase/tests/database/` against an approved local test target.
6. Run representative browser smoke checks for public or administrator UI changes. If the browser runtime is unavailable, record `NOT RUN` and do not claim a browser pass.
7. Inspect migration SQL and the complete ordered migration inventory. Reuse an existing schema contract when it already supports the change; create no speculative migration.
8. Perform an adversarial review before committing: look for false release claims, stale path or locale assumptions, missing authorization checks, leaked secrets, destructive commands, and incomplete rollback evidence. A failed review is a STOP condition.

The pull request must describe the exact source change, validation performed, migration boundary if relevant, and any evidence that remains `NOT RUN`.

## 4B. Merge and application/source deployment

After review:

1. Commit only on the feature branch.
2. Push the feature branch and open or update the pull request.
3. Wait for the required `Quality` check and final pull-request review. A failed CI check, unexpected pull-request diff, or changed reviewed head is a STOP condition.
4. Merge through the protected `main` workflow. Never push a direct `main` commit.
5. Verify the merged commit SHA before deployment.
6. Deploy the approved application commit through the approved application platform and record the non-sensitive deployment identifier and timestamp. An application deployment failure is a STOP condition.
7. After application deployment, perform the pending-migration decision in Section 4C.

CI and merge do not imply that Supabase migrations were applied. The repository CI workflow does not perform that operation. Likewise, an application-platform deployment does not prove database deployment.

If the application requires a schema state that is not yet validated, stage or hold application traffic according to the approved release plan until Section 4C succeeds. Do not use an application deployment to bypass the database gate.

## 4C. Pending migration decision and hosted database deployment

This is a separate, explicitly authorized operation. No hosted access or mutation is implied by a merged pull request, a passing CI job, or an application deployment.

Before hosted inspection, obtain explicit read-only authorization identifying the target as the approved production target. Do not confuse it with a development or preview target. Then:

1. Inspect the target read-only and record migration history, schema compatibility, RLS/grants, backup readiness, and recovery ownership without recording secrets.
2. Enumerate the migrations in the approved commit in lexical order and inspect the SQL in the approved boundary.
3. Immediately before any possible `supabase db push`, record the exact pending migration filenames from the approved read-only inspection.
4. If the exact pending list is empty, do not run `supabase db push`. Continue directly to Section 4D for post-deployment application verification and production/browser smoke.
5. If the pending list contains only the expected, approved migration or migrations, obtain separate database mutation approval naming the exact target, commit, pending migration filenames, operator, execution window, backup/recovery evidence, rollback owner, and post-deployment verifier.
6. Run `supabase db push` only when the pending list exactly matches that approval. Record the command outcome without secrets, then perform read-only database and schema verification before Section 4D.
7. If any unexpected, later, missing, or unexplained migration appears, stop. Do not repair or reorder history to make the push appear safe.

Never run production `supabase db reset`. Never run remote `migration repair` without a separately authorized and proven migration-history incident. A migration error is handled by Section 4E, not by blind retries.

## 4D. Post-deployment read-only verification and production smoke

For both the no-migration-pending path and the expected-migration path, complete post-deployment application verification before declaring the release usable:

- confirm the database gate completed without an unresolved error;
- when a migration ran, confirm the target has no unexpected pending migration and its history matches the approved filenames;
- when a migration ran, verify required schema, views, RLS, grants, and administrator authorization behavior;
- verify anonymous access remains limited to published public-safe data;
- verify the application deployment corresponds to the approved commit;
- inspect representative application responses, runtime logs, and media requests without writing data or Storage objects;
- run the production smoke matrix below and record every row as `PASS`, `FAIL`, or `NOT RUN`.

Any post-deployment verification failure is a STOP condition and requires investigation. Production/browser smoke must pass before the release can be marked `CLOSED`; a `FAIL` or required `NOT RUN` result does not close the release.

Application availability does not authorize content publication. Complete the content gate separately, with an authorized verifier and evidence for Indonesian and English content where applicable. Close the release only after the required content, operational, verification, and smoke evidence is complete.

### Production smoke matrix

| Area | Scenario | Expected result |
| --- | --- | --- |
| Public shell | Open `/` and `/en` | Each localized shell loads without server/client error or unintended descriptive fallback |
| Village profile | Open `/profil-desa` and `/en/village-profile` | Published content, locale links, and no-fallback behavior are correct |
| Destinations | Open `/destinasi` and `/en/destinations`, plus representative details | Published content and safe not-found behavior are correct |
| Tourism packages | Open `/paket-wisata` and `/en/tourism-packages`, plus representative details | Ordered published destinations and localized content render correctly |
| Homestays | Open `/homestay` and `/en/homestays`, plus representative details | Published content and localized detail rendering are correct |
| Local businesses | Open `/umkm` and `/en/local-businesses`, plus representative details | Published content and localized detail rendering are correct |
| Traditional houses | Open `/rumah-adat` and `/en/traditional-houses`, plus representative details | Verified published content renders correctly |
| Cultural events | Open `/acara-budaya` and `/en/cultural-events`, plus representative details | Published content and event state render correctly |
| Tourism map | Open `/peta-wisata` and `/en/tourism-map` | Approved coordinates and localized map UI render correctly |
| Contact | Open `/kontak` and `/en/contact` | Only approved contact data is visible |
| Navigation | Switch between Indonesian and English route pairs | Locale behavior and links remain correct |
| Media | Open representative published pages with media | Authorized signed-media delivery works; no broken-image regression is present |
| Representative media path | Inspect each in-scope previously reported or high-risk media path | The image request and decode succeed; on recurrence capture the evidence listed in Section 6 |
| Public authorization | Anonymous visitor accesses public and protected behavior | Published public-safe data is visible; protected behavior is denied |
| Admin authentication | Approved administrator signs in and opens an applicable workflow | Access succeeds through the approved flow |
| Admin authorization | Non-administrator accesses an admin route | Access is denied |
| Lifecycle | Draft or archived content exists | It is not exposed publicly; published content appears intentionally |
| SEO | Inspect representative metadata, canonical, robots, sitemap, and language metadata | No temporary signed URL or unverified claim is embedded |
| Errors | Open an unknown public slug | Safe not-found behavior is returned |
| Responsive UI | Test representative desktop and 390 px viewports | Navigation and core content remain usable |
| Logs | Review deployment/runtime logs | No credential or sensitive identifier is exposed |

For a recurring image failure, record the exact timestamp, `img.complete`, `naturalWidth`/`naturalHeight`, sanitized `currentSrc`, failed-request HTTP status, and browser console/network error. Do not replace media before the cause is reproducible and authorized.

## 4E. Rollback and stop procedure

### Application regression

When the database is valid but the application introduces a regression:

1. Stop further content publication.
2. Preserve the failing deployment and smoke evidence without secrets.
3. Restore the last known-good application deployment.
4. Confirm compatibility with the current database and repeat critical smoke checks.
5. Open a corrective feature branch and pull request. Do not rewrite or force-push protected release history.

### Migration failure or uncertain target state

1. Stop all subsequent deployment steps and investigate read-only first.
2. Preserve the exact error and target-state evidence without secrets.
3. Do not blindly rerun the migration.
4. Determine transaction and migration-history state through approved read-only inspection.
5. Escalate to the database approver and recovery owner.
6. Use only an approved backup/restore or forward-fix decision.
7. Require renewed approval before any additional mutation.

Never invent a down migration. Never use remote `migration repair` as a generic recovery step. Never use production `db reset`.

### Data, Storage, or content issue

Stop the affected publication path and preserve evidence. Diagnose the application, schema, authorization, and media-path contract first. Any data or Storage correction requires a proven root cause and its own explicit authorization; do not use it as a substitute for a code/schema root-cause fix. Factual content corrections require the approved administrator lifecycle, an authorized source, verification, and a new publication decision.

## 5. Content publication gate

Before publishing or republishing public content:

- an authorized content verifier confirms the source;
- Indonesian content, English content, contacts, locations, prices, schedules, and coordinates are verified where present;
- English translations are reviewed against the approved source and are not stale;
- proper names and culturally specific terms follow the editorial decision;
- placeholders and fabricated claims are absent;
- publication states are intentional and the evidence record identifies the verifier.

Machine-generated or developer-inferred translation alone is insufficient for production approval. Application or migration availability does not prove content correctness.

## 6. Stop conditions and recurring-image evidence

Immediately stop and declare `NO-GO` when any of the following occurs:

- `Local validation FAIL` -> `STOP`;
- `Adversarial review FAIL` -> `STOP`;
- `CI FAIL` -> `STOP`;
- unexpected pull-request diff or changed reviewed head -> `STOP`;
- application deployment FAIL -> `STOP`;
- the branch, commit, or release scope differs from the approved baseline -> `STOP`;
- an unexpected diff, secret, sensitive identifier, or policy weakening appears -> `STOP`;
- the target cannot be proven to be the approved production candidate -> `STOP`;
- hosted read-only or mutation authorization is missing; no database mutation may proceed;
- the exact pending migration list is unexpected, later than the approved boundary, or unexplained -> `STOP`;
- migration execution is partial or uncertain -> `STOP`;
- DB migration FAIL -> `STOP`; investigate read-only first;
- schema drift, RLS, grants, or administrator authorization differ from the reviewed model -> `STOP`;
- backup or recovery ownership is absent -> `STOP`;
- application rollback is unavailable -> `STOP`;
- post-deployment verification FAIL -> `STOP` and investigate;
- production/browser smoke FAIL -> investigate and do not close the release;
- required browser smoke is unavailable or `NOT RUN` -> do not close the release;
- Indonesian or English content, contact data, coordinates, schedules, or cultural claims are unverified -> `STOP`;
- an operator is asked to exceed the approved action scope -> `STOP`;
- evidence is incomplete or contradictory -> `STOP`.

If the homestay image failure recurs, do not infer the root cause from `naturalWidth=0` alone. Preserve:

- exact timestamp;
- `img.complete`;
- `naturalWidth` and `naturalHeight`;
- sanitized current `src`/`currentSrc`;
- failed request HTTP status;
- browser console and network error.

## 7. Evidence record and final decision

Create one release evidence record containing:

| Field | Required value |
| --- | --- |
| Release identifier | Human-readable release name |
| Approved source | Full merged commit SHA |
| Pull request/review | PR and adversarial-review evidence |
| CI evidence | Required check result and link/reference |
| Local validation | `npm.cmd run check` and relevant focused tests |
| Database tests | Current `supabase/tests/database/` result when relevant |
| Migration inventory | Ordered filenames from the approved commit |
| Pending migration list | Exact filenames immediately before any `supabase db push`, or `NONE` |
| Hosted read-only approval | Approval reference and timestamp |
| Mutation approval | Separate approval reference and timestamp, if a push occurs |
| Database verification | Read-only post-deployment outcome |
| Application deployment | Approved commit, non-sensitive deployment identifier, and timestamp |
| Content verification | Indonesian/English outcome and verifier |
| Smoke matrix | Per-row `PASS`, `FAIL`, or `NOT RUN` evidence |
| Rollback readiness | Last known-good application and recovery readiness |
| Exceptions | Explicitly approved exceptions, or `None` |
| Final decision | `GO` or `NO-GO` |
| Decision timestamp | Recorded decision time |

For any recurring image incident, add the Section 6 browser/network fields to the evidence record. Redact credentials, secret environment values, sensitive project identifiers, administrator identifiers, and private URLs.

### Final GO/NO-GO checklist

#### A. Pre-merge validation

- [ ] Feature branch and pull request used.
- [ ] Adversarial review completed before commit and merge.
- [ ] `git diff --check` passes.
- [ ] `npm.cmd run check` passes.
- [ ] Relevant application, database, and browser checks are recorded.
- [ ] Migration SQL and ordered inventory reviewed when relevant.

#### B. Merge and source/application deployment

- [ ] Required CI checks pass.
- [ ] Exact approved commit is merged to protected `main`.
- [ ] Application deployment uses that exact commit and the approved platform.
- [ ] Application deployment identity and timestamp are recorded without secrets.
- [ ] CI/app deployment has not been treated as database deployment.

#### C. Hosted database migration deployment

- [ ] Hosted read-only inspection was separately authorized.
- [ ] Target identity, backup, and recovery ownership are confirmed.
- [ ] Exact pending migration filenames were recorded immediately before push.
- [ ] Pending list is empty, or exactly matches separate mutation approval.
- [ ] No unexpected later migration or unexplained drift exists.
- [ ] No production `db reset` or unauthorized remote migration repair was used.
- [ ] Database mutation approval exists before `supabase db push`.

#### D. Post-deployment verification

- [ ] Migration status and schema/security checks pass read-only.
- [ ] Application serves the approved commit.
- [ ] Critical public, admin, media, responsive, and SEO smoke rows pass.
- [ ] Recurring-image evidence is complete if an image failure occurred.
- [ ] Content verifier records approved Indonesian/English content state.

#### E. Rollback/stop and closeout

- [ ] Last known-good application and recovery path are available.
- [ ] No stop condition remains open.
- [ ] All exceptions are explicitly approved.
- [ ] Final `GO`/`NO-GO` decision is recorded.

If any required item is unchecked, ambiguous, or unsupported by evidence, the decision is `NO-GO`.
