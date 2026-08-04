# Production Deployment Runbook

## 1. Purpose and status

This runbook defines the controlled release procedure for the Karang Bajo Tourism Information System.

It is an operational document, not authorization to deploy.

The current repository baseline is pre-production. The hosted Supabase target previously used by the project is a development target. It must not be treated as the production target.

No hosted read-only access, database mutation, application deployment, content mutation, or public release may occur without the approvals defined below.

## 2. Hard rules

1. All repository changes must use a feature branch and pull request.
2. Never commit directly to `main`.
3. The protected `main` branch and required `Quality` check must remain enforced.
4. Do not expose credentials, tokens, sensitive project identifiers, administrator identifiers, private URLs, or secret environment values in commands, logs, screenshots, evidence, issues, or pull requests.
5. Do not access a hosted target until the hosted read-only preflight gate is explicitly approved.
6. Read-only preflight approval does not authorize database mutation.
7. Do not mutate a hosted database until the database mutation gate is explicitly approved.
8. Do not create a migration when the existing schema and migration history already support the release.
9. Apply only migrations present in the reviewed release baseline.
10. Do not infer, invent, translate, publish, or correct cultural information without verification by an authorized source.
11. Do not invent contact details, addresses, prices, schedules, map coordinates, or WhatsApp numbers.
12. Do not publish placeholders or unverified content.
13. Do not use destructive dependency remediation such as `npm audit fix --force`.
14. Stop immediately when evidence conflicts with the approved release scope.
15. Deployment operators must not combine approval, execution, and final acceptance into one unreviewed role.

## 3. Exact release scope

The application release must be built from an approved commit on `main`.

The database release scope ends at:

`supabase/migrations/20260804065739_village_profile_translation.sql`

At the reviewed baseline, this file is migration 6 of 6 and no later migration exists.

English Village Profile delivery is represented by:

- PR #12 — database support;
- PR #13 — public `/en/village-profile`;
- PR #14 — administrator English Village Profile workflow.

The validated automated baseline is:

- 23 application test files;
- 283 application tests;
- 448 local pgTAP assertions;
- `npm.cmd run check` passing;
- protected CI `Quality` passing;
- Vercel and Vercel Preview checks passing;
- local-target production build passing against local Supabase;
- no hosted Supabase host present in the validated local-target build output.

Anything outside this scope requires a new review and release decision.

## 4. Required roles

At minimum, identify the following accountable roles before deployment:

| Role | Responsibility |
| --- | --- |
| Release approver | Approves the exact commit, release scope, and GO/NO-GO decision |
| Database approver | Separately approves hosted read-only preflight and database mutation |
| Database operator | Executes only the approved database procedure |
| Application operator | Configures and deploys the approved application commit |
| Content verifier | Confirms Indonesian and English content against authorized sources |
| Production owner | Accepts operational ownership, access control, recovery, and handover |
| Independent reviewer | Reviews evidence and confirms that stop conditions were not bypassed |

One person may hold multiple roles only when this is explicitly accepted and the resulting separation-of-duty risk is recorded.

## 5. Required evidence

Before any production action, collect and retain:

- approved release commit SHA;
- pull request and review evidence;
- passing required CI evidence;
- passing `npm.cmd run check` evidence;
- passing local pgTAP evidence showing 448 assertions;
- migration inventory showing the translation migration as 6 of 6;
- evidence that no later migration is included;
- local-target production build evidence;
- scan evidence that build output does not contain a hosted Supabase host;
- approved production ownership;
- approved target classification;
- approved backup and recovery procedure;
- approved application environment-variable inventory without values;
- verified content inventory;
- completed smoke-test ownership;
- final GO/NO-GO record.

Secrets and sensitive identifiers must be redacted rather than copied into the evidence record.

## 6. Approval gates

### Gate A — Release-scope approval

Required before any hosted operation:

- exact `main` commit approved;
- release diff reviewed;
- CI and local validation passing;
- migration boundary confirmed;
- rollback responsibilities assigned;
- target owner and production owner confirmed.

Failure at this gate is a NO-GO.

### Gate B — Hosted read-only preflight approval

This is a separate approval.

It authorizes only the minimum read-only inspection needed to determine whether the proposed production target is compatible with the release.

It does not authorize:

- applying migrations;
- changing configuration;
- creating or changing users;
- changing administrator identity;
- changing Storage;
- inserting, updating, deleting, or publishing content;
- deploying the application.

The preflight evidence must establish, without exposing sensitive values:

- the inspected target is the explicitly approved production candidate;
- the target is not being confused with the hosted development target;
- migration history can be compared safely;
- backup and recovery responsibilities exist;
- required platform capabilities are available;
- no incompatible or unexpected later migration is present;
- no unexplained schema drift exists.

Any uncertainty produces a NO-GO pending investigation.

### Gate C — Database mutation approval

This is a separate approval granted only after Gate B passes.

Approval must identify:

- exact target classification;
- exact approved release commit;
- exact migration boundary;
- authorized operator;
- approved execution window;
- backup or recovery evidence;
- rollback owner;
- post-migration validation owner.

This runbook intentionally contains no hosted mutation command.

### Gate D — Application deployment approval

This gate occurs only after database mutation and post-migration validation pass.

It requires:

- approved application commit;
- correct production target classification;
- production environment configuration reviewed without exposing values;
- successful production build;
- database compatibility confirmed;
- application rollback mechanism confirmed.

### Gate E — Content publication approval

Application availability does not authorize content publication.

Content publication requires:

- authorized content verifier;
- verified Indonesian content;
- verified English content where applicable;
- verified contact and location information;
- verified publication status;
- confirmation that no placeholder or stale translation remains.

## 7. Deployment sequence

The mandatory order is:

1. Database preparation and approved migration execution.
2. Post-migration database validation.
3. Application configuration and deployment.
4. Application production smoke testing.
5. Verified content entry or verification.
6. Content publication.
7. Public content and translation smoke testing.
8. Final evidence consolidation and GO/NO-GO closure.

Do not deploy the application first when it requires a database state that has not been validated.

Do not publish content merely because the schema and application are available.

## 8. Database preparation

Before the approved mutation window:

- confirm the approved commit;
- enumerate repository migrations in lexical order;
- confirm the target migration is `20260804065739_village_profile_translation.sql`;
- confirm it is migration 6 of 6;
- confirm no later migration exists;
- compare approved migration history with the read-only preflight evidence;
- confirm recovery ownership;
- freeze unrelated schema work;
- record the pre-mutation evidence timestamp.

Stop when the hosted target contains an unexplained migration, incompatible schema state, or ambiguous environment identity.

## 9. Post-migration validation

After approved database mutation, validate before application deployment:

- migration execution completed without an unresolved error;
- migration history matches the approved six-migration boundary;
- required English Village Profile fields and database interfaces exist;
- existing Indonesian Village Profile behavior remains intact;
- RLS remains active where required;
- anonymous access remains limited to published public-safe data;
- non-administrator mutation remains denied;
- administrator workflow permissions remain constrained to the approved administrator model;
- no unexpected public grants were introduced;
- database validation evidence is retained without sensitive values.

A partially executed or uncertain migration is a stop condition. Do not repeatedly re-run mutation commands without diagnosis and renewed approval.

## 10. Application deployment

After database validation passes:

- use the exact approved `main` commit;
- configure only approved production environment variables;
- do not copy development target values by assumption;
- verify build-time output does not disclose sensitive values;
- complete the production build;
- deploy using the approved production application target;
- record deployment identity and timestamp without recording credentials;
- retain the immediately previous deployable application version for rollback.

The hosted development target must never be promoted conceptually by merely renaming its environment variables.

## 11. Verified English content

English Village Profile functionality being complete does not prove that production English content is correct.

Before publication:

- compare the English content with the authorized Indonesian source;
- require a reviewer competent to validate the translation;
- preserve proper names, customary terms, titles, and culturally specific terms according to the approved editorial decision;
- verify that untranslated placeholders are absent;
- verify that removed or corrected Indonesian claims are not retained in English;
- verify that Indonesian and English publication states are intentional;
- record the source and verifier without publishing private personal data.

Machine-generated or developer-inferred translation alone is insufficient for production approval.

## 12. Production smoke matrix

| Area | Scenario | Expected result |
| --- | --- | --- |
| Public shell | Open the Indonesian homepage | Page loads without server or client error |
| Public shell | Open the English homepage | English shell loads without unintended Indonesian descriptive fallback |
| Village Profile | Open the Indonesian Village Profile | Only approved published content is visible |
| English Village Profile | Open `/en/village-profile` | Verified English content renders correctly |
| English Village Profile | English content is unavailable or unpublished | Safe intentional state; no fabricated fallback |
| Navigation | Navigate between Indonesian and English Village Profile routes | Locale behavior and links remain correct |
| Public authorization | Anonymous visitor accesses public content | Only published public-safe data is returned |
| Public authorization | Anonymous visitor attempts protected behavior | Access is denied |
| Admin authentication | Approved administrator signs in | Access succeeds through the approved flow |
| Admin authorization | Non-administrator accesses admin route | Access is denied |
| Admin Village Profile | Administrator opens Indonesian workflow | Existing workflow remains usable |
| Admin English Profile | Administrator opens English workflow | Fields load and save according to approved behavior |
| Lifecycle | Draft English content exists | Draft content is not exposed publicly |
| Lifecycle | English content is published | Correct published content appears publicly |
| Content integrity | Compare Indonesian and English records | No stale or contradictory translation remains |
| Media | Open representative public pages with media | Authorized signed-media delivery works |
| Destinations | Open list and representative detail | Published content and not-found behavior work |
| Homestays | Open list and representative detail | Published content renders correctly |
| UMKM | Open list and representative detail | Published content renders correctly |
| Traditional houses | Open list and representative detail | Verified published content renders correctly |
| Cultural events | Open list and representative detail | Published content and event state render correctly |
| Tourism packages | Open list and representative detail | Ordered published destinations render correctly |
| Contact | Open contact page | Only approved contact data is visible |
| WhatsApp CTA | Inspect representative CTA | Approved configured destination is used |
| GIS | Open map and representative marker | Approved coordinates render correctly |
| SEO | Inspect representative metadata | No temporary signed URL or unverified claim is embedded |
| Errors | Open an unknown public slug | Safe not-found behavior is returned |
| Responsive UI | Test representative mobile viewport | Navigation and core content remain usable |
| Logs | Review deployment/runtime logs | No credential or sensitive identifier is exposed |

Every failed row requires triage. Critical authorization, data-integrity, migration, or content-verification failures produce an immediate NO-GO.

## 13. Rollback procedures

### 13.1 Application rollback

Use application rollback when the database is valid but the deployed application introduces a regression.

Actions:

1. Stop further content publication.
2. Record the failing deployment and smoke-test evidence.
3. Restore the last known-good application deployment.
4. Confirm that the restored application is compatible with the current database.
5. Repeat the critical smoke tests.
6. Open a corrective feature branch and pull request.
7. Do not rewrite or force-push protected release history.

### 13.2 Migration failure

A failed migration is not automatically reversible.

Actions:

1. Stop all subsequent deployment steps.
2. Preserve the exact error and target-state evidence without secrets.
3. Do not blindly rerun the migration.
4. Determine whether the transaction rolled back completely.
5. Compare actual migration history and schema state using an approved read-only inspection.
6. Escalate to the database approver and recovery owner.
7. Use the approved backup, restore, or forward-fix decision.
8. Require renewed approval before any additional mutation.

Never invent a down migration during the incident.

### 13.3 Incorrect content

When published content is factually wrong, unauthorized, or contains private information:

1. Stop related publication activity.
2. Move the affected content out of the public state using the approved administrator workflow.
3. Preserve an audit record without reproducing sensitive content unnecessarily.
4. Obtain corrected content from an authorized source.
5. Require content verification before republishing.
6. Confirm public caches and rendered pages no longer expose the incorrect content.

A content problem alone does not justify destructive database manipulation.

### 13.4 Stale translation

When English content no longer matches the approved Indonesian source:

1. Treat the English content as unverified.
2. Remove it from public availability through the approved lifecycle where necessary.
3. Record which Indonesian revision invalidated the translation.
4. Obtain and review a corrected translation.
5. Verify culturally specific terminology.
6. Republish only after the translation and publication state are approved.
7. Repeat the English Village Profile smoke tests.

Do not silently retain stale English content as an acceptable fallback.

## 14. Stop conditions

Immediately stop and declare NO-GO when any of the following occurs:

- branch, commit, or release scope differs from the approved baseline;
- required CI or local validation is not passing;
- migration count or order differs from the approved six-migration boundary;
- a later or unexplained migration exists;
- the target cannot be proven to be the approved production candidate;
- the hosted development target is being treated as production without explicit approval;
- read-only preflight has not been approved;
- database mutation has not been separately approved;
- backup or recovery ownership is absent;
- schema drift is unexplained;
- migration execution is partial or uncertain;
- RLS, grants, or administrator authorization differ from the reviewed model;
- a credential or sensitive identifier appears in evidence or logs;
- production environment configuration is copied from development without review;
- application rollback is unavailable;
- verified Indonesian or English content is unavailable;
- contact, address, map, price, schedule, or cultural information is unverified;
- a critical smoke test fails;
- evidence is incomplete or contradictory;
- an operator is asked to exceed the approved action scope.

## 15. Evidence record

Create one release evidence record containing:

| Field | Required value |
| --- | --- |
| Release identifier | Human-readable release name |
| Approved commit | Full commit SHA |
| Release approver | Accountable role or approved identity reference |
| Database approver | Accountable role or approved identity reference |
| Database operator | Accountable role or approved identity reference |
| Application operator | Accountable role or approved identity reference |
| Content verifier | Accountable role or approved identity reference |
| Production owner | Accountable role or approved identity reference |
| Independent reviewer | Accountable role or approved identity reference |
| CI evidence | Passing required checks |
| Local validation | `npm.cmd run check`, application tests, and pgTAP evidence |
| Migration boundary | Six migrations ending at the approved translation migration |
| Read-only preflight approval | Approval reference and timestamp |
| Mutation approval | Separate approval reference and timestamp |
| Database validation | Post-migration outcome |
| Application deployment | Deployment outcome and non-sensitive identifier |
| Content verification | Indonesian and English verification outcome |
| Smoke matrix | Per-row PASS, FAIL, or NOT RUN with evidence |
| Rollback readiness | Last known-good application and database recovery readiness |
| Exceptions | Explicitly approved exceptions, or `None` |
| Final decision | GO or NO-GO |
| Decision timestamp | Recorded deployment decision time |

Do not place credentials, secret environment values, sensitive project identifiers, administrator identifiers, or private URLs in this record.

## 16. Final GO/NO-GO checklist

### Release baseline

- [ ] Exact approved commit is on protected `main`.
- [ ] Required CI checks pass.
- [ ] `npm.cmd run check` passes.
- [ ] 23 application test files and 283 tests pass.
- [ ] 448 local pgTAP assertions pass.
- [ ] Local-target production build passes.
- [ ] Build evidence contains no hosted Supabase host.
- [ ] Release diff has completed adversarial review.

### Database

- [ ] Hosted read-only preflight was separately approved.
- [ ] The target is proven to be the approved production candidate.
- [ ] The target is not confused with hosted development.
- [ ] Migration inventory ends at migration 6 of 6.
- [ ] No later or unexplained migration exists.
- [ ] Backup and recovery ownership are confirmed.
- [ ] Database mutation was separately approved.
- [ ] Post-migration validation passes.
- [ ] RLS and authorization behavior remain correct.

### Application

- [ ] Application deployment was approved.
- [ ] Exact approved commit was deployed.
- [ ] Production configuration was independently reviewed.
- [ ] Application rollback is available.
- [ ] Critical application smoke tests pass.
- [ ] Logs expose no sensitive values.

### Content

- [ ] Indonesian production content is verified.
- [ ] English production content is verified.
- [ ] English content is not stale.
- [ ] Cultural and historical claims are authorized.
- [ ] Contacts, locations, prices, schedules, and coordinates are verified.
- [ ] No placeholder or fabricated content is public.
- [ ] Publication lifecycle states are correct.

### Acceptance

- [ ] Production owner accepts operational responsibility.
- [ ] Independent reviewer accepts the evidence.
- [ ] All critical smoke-matrix rows pass.
- [ ] No stop condition remains open.
- [ ] Final decision is explicitly recorded as GO.

If any required item is unchecked, ambiguous, or unsupported by evidence, the decision is NO-GO.
