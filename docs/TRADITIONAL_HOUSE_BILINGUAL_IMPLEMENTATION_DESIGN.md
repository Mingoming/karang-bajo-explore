# Traditional House Bilingual Implementation Design

## 1. Status and boundary

This document is the Phase 3D.1 implementation design for Traditional Houses
(`Rumah Adat`). It is design-only. It authorizes no application change, SQL,
migration, test change, Supabase operation, translation entry, publication, or
deployment.

The authoritative cross-domain contracts are:

- `docs/BILINGUAL_IMPLEMENTATION_DESIGN.md`
- `docs/BILINGUAL_PUBLIC_ROLLOUT_PLAN.md`

The completed Destination bilingual vertical is used as an architectural
reference for RPC boundaries, database-owned freshness, public-safe views, and
administrator workflow. Its field list, thumbnail ownership, and fingerprint
inputs are not copied into this domain.

### 1.1 Design result

The Traditional House contract is implementation-ready after this document is
approved and the required cultural content owner is appointed. No technical
design question remains open in this document. Appointment of a human cultural
terminology owner and acceptance of individual translations are content and
release gates, not new database roles or publication predicates.

Phase 3D remains separate from the shared Phase 3C locale, navigation, and SEO
work. A 3D implementation must still be reviewed and tested before it is
merged or used for content publication.

## 2. Existing architecture and compatibility

### 2.1 Source model

The existing `public.traditional_houses` row is the Indonesian source. It has:

- required source text: `name`, `description`;
- nullable source text: `summary`, `history`, `cultural_significance`,
  `location_name`, `visitor_information`;
- source-owned `slug`;
- source-owned coordinates and `google_maps_url`;
- source-owned `thumbnail_bucket` and `thumbnail_path`;
- source publication state (`draft`, `published`, `archived`),
  `published_at`, featured/order fields, and audit timestamps.

`public.traditional_house_images` owns image binaries and source media
metadata. Its current `alt_text` is required and `caption` is nullable. The
image row is attached to its parent with a restrictive foreign key, and the
existing media RPC family owns image mutations. Direct application writes to
source media are not a new translation boundary.

The existing published-safe views are:

- `published_traditional_houses`;
- `published_traditional_house_images`.

They expose Indonesian source projections only. The current Indonesian routes
are `/rumah-adat` and `/rumah-adat/[slug]`; the current administrator workflow
is under `/admin/rumah-adat`. The protected administrator is enforced by
`requireAdministrator()` in application code and `public.is_admin()` at the
database boundary.

### 2.2 Reuse and non-reuse

Reuse from the Destination implementation is limited to:

- typed per-domain translation tables rather than a generic JSON payload;
- one `en` row per source identity;
- database-owned actor derivation with `auth.uid()`;
- RPC-only translation writes;
- append-only review events;
- optimistic `edit_revision` checks;
- current-source checks inside review/publication functions;
- fail-closed public views and targeted route revalidation.

Traditional House remains domain-specific for:

- its seven parent text fields;
- its cultural terminology review checklist;
- its source fingerprint field order;
- its primary-image-owned English alt text;
- its thumbnail matching and eligibility rule;
- its source/media cascade matrix.

No generic translation table, generic translation JSON, English slug column, or
machine-translation service is introduced.

## 3. Parent translation contract

The proposed parent table is `public.traditional_house_translations`. It has
one row for `(traditional_house_id, locale)` and accepts only `locale = 'en'`.
The English columns are exactly:

`name`, `summary`, `description`, `history`, `cultural_significance`,
`location_name`, and `visitor_information`.

The parent contract version is `traditional-house-v1` and is database-enforced
on every row. The image contract version is
`traditional-house-media-v1`. Version values are not client-selectable.

The table stores nullable text during draft preparation so that an incomplete
draft is representable. Database workflow functions, not the client, enforce
the review and publication rules below.

| English field | Draft | Review | Publication | Source-null/empty rule | May English add content absent from source? |
| --- | --- | --- | --- | --- | --- |
| `name` | Not required while drafting | Required and nonblank | Required and nonblank | The source contract requires a nonblank value; an invalid legacy source blocks publication | No |
| `summary` | Not required | Required only when the source summary is semantically nonempty | Same as review | Source `NULL` or semantic empty becomes English `NULL` | No |
| `description` | Not required while drafting | Required and nonblank | Required and nonblank | The source contract requires a nonblank value; an invalid legacy source blocks publication | No |
| `history` | Not required | Required only when the source history is semantically nonempty | Same as review | Source `NULL` or semantic empty becomes English `NULL` | No |
| `cultural_significance` | Not required | Required only when the source field is semantically nonempty | Same as review | Source `NULL` or semantic empty becomes English `NULL` | No |
| `location_name` | Not required | Required only when the source field is semantically nonempty | Same as review | Source `NULL` or semantic empty becomes English `NULL` | No |
| `visitor_information` | Not required | Required only when the source field is semantically nonempty | Same as review | Source `NULL` or semantic empty becomes English `NULL` | No |

For this table, semantic empty means `NULL` or a value that becomes empty after
the documented fingerprint trim normalization. The workflow may normalize a
submitted optional empty value to `NULL`, but it may not turn a source `NULL`
into English prose. If the source has a nonempty optional field, the English
field must be nonempty before review and publication. If the source has no
value, an English value is rejected rather than silently accepted.

Draft incompleteness does not relax the source-availability rule. It is valid
for a draft to omit a source-populated English field while it is being written;
it is not valid for a draft to invent a field for which the source has no
semantic value. No field is prefilled from Indonesian by the UI or database.

The source `name` may be retained unchanged when the human content owner
approves that proper name. That is an explicit human-authored decision, not an
automatic copy or translation.

## 4. Parent fingerprint and freshness

### 4.1 Versioned source fingerprint

The database-owned helper is:

`private.traditional_house_source_fingerprint_v1(p_source public.traditional_houses)`

It returns exactly:

`traditional-house-source-v1:<64 lowercase hexadecimal SHA-256 digest>`.

Its ordered JSON keys after `version` are exactly:

1. `name`
2. `summary`
3. `description`
4. `history`
5. `cultural_significance`
6. `location_name`
7. `visitor_information`

These fields are included because they are the source text whose English
meaning, cultural explanation, or visitor-facing prose is represented by the
parent translation.

The helper uses the shared Phase 3 fingerprint byte contract: UTF-8 compact
JSON, SHA-256, CRLF-to-LF conversion, remaining CR-to-LF conversion, and
trimming only U+0009, U+000A, U+000B, U+000C, U+000D, and U+0020 at the string
edges. It performs no transliteration, Unicode normalization, case folding,
locale conversion, sorting, or internal-whitespace rewriting. Optional
`NULL`, empty, and trim-only values serialize as JSON `null`; required invalid
values reject the helper and make public eligibility false.

There are no arrays in this contract, so no array ordering or duplicate rule is
needed for the parent fingerprint.

### 4.2 Explicit exclusions

| Field or condition | Fingerprint treatment | Reason |
| --- | --- | --- |
| `slug` | Excluded | It is a source route key, not English meaning. Published source slugs are immutable. A valid unpublished slug change changes cache identity but does not require retranslation by itself. |
| `latitude`, `longitude` | Excluded | Locale-neutral map values. A change can invalidate rendered pages but does not change translated prose. |
| `google_maps_url` | Excluded | A source-owned operational URL; its safety/publication validation is separate. |
| `is_featured`, `display_order` | Excluded | Presentation/order controls, not translation content. |
| `status`, `published_at` | Excluded | Publication is an independent eligibility predicate. Source archive/unpublish always blocks English regardless of fingerprint. |
| `created_at`, `updated_at`, audit actors | Excluded | Audit/concurrency metadata is not content. |
| `thumbnail_bucket`, `thumbnail_path` | Excluded from the text token | They are inputs to the separate thumbnail-media token below. |

`source_revision` is a database-owned concurrency/audit counter and is captured
with the fingerprint, but it is not a freshness input. This permits neutral
source updates to be rejected as stale writes without forcing retranslation.

### 4.3 Translation fingerprint

The database-owned helper is:

`private.traditional_house_translation_fingerprint_v1(p_translation public.traditional_house_translations)`

Its ordered keys are `version`, `name`, `summary`, `description`, `history`,
`cultural_significance`, `location_name`, and `visitor_information`, using the
same canonical serializer. Its version marker is
`traditional-house-translation-v1`. A current English row whose stored
translation fingerprint differs from the recomputed value is ineligible. This
protects the public view even if a legacy or future trusted path changes a
translation without a fresh review checkpoint.

### 4.4 Media tokens

The migration adds a database-owned positive `binary_revision` to
`traditional_house_images`. It starts at `1` and increments exactly once for a
supported binary replacement, storage-path change, source `alt_text` change,
or source `caption` change. Primary selection and display order do not change
the image binary token.

The image media helper is:

`private.traditional_house_image_media_fingerprint_v1(p_image public.traditional_house_images)`

with marker `traditional-house-media-v1` and ordered keys:
`version`, `traditional_house_image_id`, `storage_bucket`, `storage_path`,
`caption`, `alt_text`, and `binary_revision`.

The parent thumbnail helper is:

`private.traditional_house_thumbnail_media_fingerprint_v1(p_source public.traditional_houses, p_primary_image public.traditional_house_images)`

with marker `traditional-house-thumbnail-media-v1` and ordered keys:
`version`, `traditional_house_id`, `thumbnail_bucket`, `thumbnail_path`,
`primary_image_id`, and `primary_image_media_fingerprint`. The final value is
the exact current `traditional-house-media-v1` token for the source image, or
JSON `null` when the parent thumbnail pair does not resolve to a matching
primary image.

The parent text checkpoint therefore captures three separate facts:

- the current source text fingerprint;
- the current thumbnail-media fingerprint;
- the current English parent translation fingerprint.

The primary image's English translation fingerprint is not folded into the
parent text fingerprint. Primary image eligibility is checked directly by the
public parent predicate. A primary image English-alt change therefore requires
fresh image review before the image can be shown, but does not require parent
retranslation when the source thumbnail identity and source media token did not
change.

## 5. Image translation contract

The proposed child table is `public.traditional_house_image_translations`. It
has one row for `(traditional_house_image_id, locale)` and only accepts `en`.
The fields are `alt_text` and nullable `caption`.

| Field | Draft | Review/publication | Source behavior | Public effect |
| --- | --- | --- | --- | --- |
| `alt_text` | May be empty while drafting | Required and nonblank | Source alt must be nonblank; a null/blank legacy source image is fail-closed | Missing, stale, or unpublished English alt suppresses that image |
| `caption` | Optional | Optional | Source null/empty requires English null; a source caption may be omitted in English, but an English caption may not be invented without source caption content | A missing English caption does not suppress an otherwise eligible image |

Every Traditional House image is treated as informative because the source
schema has no decorative-image flag. Indonesian `alt_text` and `caption` are
never an English fallback. The application starts English fields empty and
shows Indonesian values only in a read-only reference panel.

Gallery translations are independent child records. Missing or stale
translation for a non-primary gallery image suppresses only that image. No
translation row is fabricated when a source image is uploaded.

## 6. Thumbnail and public-image policy

Traditional House intentionally differs from Destination: it has a source
image table with a primary row, while the source parent also caches the selected
thumbnail bucket/path. The English parent translation does not own a duplicate
thumbnail alt field.

An English Traditional House parent is eligible only when all of the following
are true:

1. the source is `published`;
2. the source thumbnail bucket/path pair is non-null and exactly matches one
   current `traditional_house_images` row belonging to that parent;
3. that matching row is the current primary image;
4. the matching image has a published, reviewed, current English image
   translation with nonblank English `alt_text`;
5. the parent source, thumbnail-media, and English-translation checkpoints are
   all current; and
6. the parent required/conditional English fields pass Section 3.

If a source thumbnail exists without a matching child image, the parent is
ineligible. If the primary image has no current English alt translation, the
parent is suppressed; the failure is not silently changed into a text-only
card. A non-primary image may be absent from the English gallery without
blocking the parent.

The collection and detail projections use the same parent eligibility rule.
The image projection independently filters every gallery child through the
current source-media and English-image checkpoints. No source Indonesian media
text is selected by an English view.

## 7. Stale cascade matrix

`Stale` is a derived freshness result, never a value in the source or
translation publication enum. `Source-blocked` is a separate derived result
used when the source is not publicly published. “Parent suppressed” means the
parent is absent from both English projections; “image suppressed” means only
that child is absent.

All route invalidation in this matrix is targeted to the Traditional House
English collection and the affected trusted detail path. It never makes cache
state an eligibility authority.

| Operation | Parent translation | Image translation | Public result | Review/republish requirement | English cache |
| --- | --- | --- | --- | --- | --- |
| Parent text edit to any Section 4.1 field | Published parent becomes derived stale; reviewed non-published checkpoint is cleared to draft/pending | No image stale cascade | Parent suppressed | Fresh parent review and `republish` when it has prior publication | `/en/traditional-houses` and current trusted detail slug |
| Valid source slug change while unpublished/draft | Not stale by content token | Not stale | Source remains non-public; a later source publication still requires the normal translation gate | No retranslation for slug alone; source-blocked rows still require fresh review | Collection, old trusted detail slug, and new trusted detail slug |
| Source publish (`draft -> published`) | No automatic promotion; source-blocked translations remain non-public | Child state is unchanged | No English row until parent and required image are explicitly eligible | Review plus `publish` or `republish` as dictated by publication history | Collection and trusted detail are defensively revalidated |
| Source unpublish or archive | Parent becomes `draft/pending` unless already archived; current checkpoint is cleared and publication history retained | Child rows are not mutated by the parent cascade | Parent and all children are suppressed immediately | Restore source, publish source, fresh parent review, then `publish`/`republish`; children still need their own review only if their own tokens changed | Collection and trusted current detail |
| Source restore (`archived -> draft`) | No promotion and no checkpoint restoration | Child state remains unchanged | Still non-public | Source must be published, then the parent must be reviewed again | Collection and trusted current detail |
| Upload a non-primary source image | No change | No existing child is fabricated or made stale | New image is omitted until its own translation is eligible | Image translation review before display | Collection and trusted detail are revalidated |
| Upload or select a new primary/thumbnail image | Parent thumbnail token changes; parent is stale or fails closed if no eligible primary child exists | The selected child is not stale solely because it became primary | Parent suppressed until the primary child is eligible | Fresh parent review/`republish`; selected image needs its own review/publication | Collection and trusted detail |
| Source image caption/alt metadata edit | Parent stale only when the changed image is the current primary; otherwise unchanged | Changed child becomes derived stale | Changed child suppressed; primary change also suppresses parent | Fresh image review; fresh parent review/`republish` only for current primary | Collection and trusted detail |
| Supported binary replacement or storage-path replacement | Same primary/non-primary rule as media metadata | Changed child becomes derived stale | Same as above | Fresh image review; parent review only when the thumbnail token changes | Collection and trusted detail |
| Primary flag change without media metadata change | Parent thumbnail token changes | No child media token change | Parent suppressed until the selected primary has eligible English alt | Fresh parent review/`republish`; no child retranslation solely for primary flag | Collection and trusted detail |
| Display-order change only | Not stale | Not stale | English gallery ordering changes; eligibility does not | No retranslation or review | Collection and trusted detail |
| Delete a non-primary image with no dependent history | No parent change | Deleted child has no fabricated stale event | Deleted child omitted | No review for the deleted row | Collection and trusted detail |
| Delete the current primary image | Parent thumbnail token changes to the deterministic fallback or null | Deleted child has no fabricated event | Parent suppressed if no eligible fallback; otherwise parent is stale until reviewed | Fresh parent review/`republish`; fallback child needs its own eligible translation | Collection and trusted detail |
| English parent draft save/review/reject | No public change unless a previously public row is explicitly withdrawn by its lifecycle operation | No change | Draft/review/rejected parent is omitted | No automatic publication | No public invalidation for a never-public row; invalidate if an eligible row is withdrawn |
| English parent publish/republish/archive/unpublish/restore | State changes according to Section 8 | Child state is independently evaluated | Parent projection changes only after the explicit lifecycle RPC | Exact action is required; no save auto-publishes | Collection and trusted detail when public eligibility changes |
| English image draft/review/reject/publish/republish/archive/unpublish/restore | Parent is affected only when the image is the required primary child | Child eligibility changes only through its RPC/checkpoint | Missing primary image blocks parent; optional child changes affect only that child | Exact image action is required; no parent fallback text | Collection and trusted detail when the child was eligible or is the primary |

Source archive/unpublish is not represented as ordinary stale. It is a
database-owned source-blocking transition and is applied in the same source
transaction as its parent translation changes. Child image translation rows
remain independently auditable and are not reset merely because their parent is
temporarily source-blocked.

## 8. Lifecycle and review workflow

### 8.1 Stored and derived states

The parent and image translation rows use `translation_status` values
`draft`, `published`, and `archived`, plus `review_state` values `pending`,
`reviewed`, and `rejected`.

The administrator-facing derived presentation is:

| Stored condition | Derived presentation | Public? |
| --- | --- | --- |
| `draft/pending` or `draft/rejected` | Draft or rejected | No |
| `draft/reviewed` with current checkpoints | Reviewed | No |
| `published/reviewed` with all current checkpoints | Published | Yes, subject to parent/image eligibility |
| `published/reviewed` with a changed checkpoint | Stale | No |
| `archived/*` | Archived | No |
| Source not published | Source-blocked | No |

The database read RPC returns the derived freshness and source-blocked reason;
React does not calculate publication eligibility.

### 8.2 Allowed transitions

- `save_draft` creates or updates only a draft/rejected translation and clears
  a rejection checkpoint when new content is saved.
- `review` is callable only after the administrator's cultural-terminology
  checklist attestation. It then locks the source and translation, validates
  source-populated field completeness and current fingerprints, and records
  `reviewed_by` and the checkpoints. The database records the attestation's
  technical actor; it does not assert that the actor has a particular cultural
  occupation or external appointment.
- `reject` requires a nonblank human reason, returns the row to
  `draft/rejected`, clears the current review checkpoint, and appends an
  immutable rejection event.
- `publish` is allowed only for a reviewed row with no historical publication.
- `republish` is required when `published_at` already exists, including after a
  source change, media change, archive, unpublish, or restoration.
- `archive` removes public eligibility and preserves recoverable history.
- `unpublish` withdraws a published translation to draft/pending while keeping
  historical publication metadata.
- `restore` changes an archived translation to draft/pending. It never
  restores publication or an old review checkpoint.
- Published English fields are not edited in place. To change them, withdraw or
  archive the translation, restore it to draft, save, review, and explicitly
  republish.

Source archive/unpublish applies the existing fail-closed source-blocking
matrix to every parent translation: non-archived rows become draft/pending with
current checkpoints cleared; archived rows remain archived; historical
publication metadata remains audit history. Source restoration never promotes
any translation. A source must be published again, followed by a fresh parent
review and explicit publication. Child image rows retain their own state and
are re-evaluated only after the parent is eligible again.

### 8.3 Publication timestamps and rollback

Review, publication, archive, rejection, and source/media checkpoint times are
database-generated UTC timestamps. `published_at` is the timestamp of the
latest successful `publish` or `republish`, and `published_by` is the
database-derived `auth.uid()` for that action. Historical publication evidence
is retained in the append-only event table; no first-publication column is
needed. Timestamps are never fingerprint inputs.

Phase 3D has no translation content-version table and no automatic content
rollback. A content rollback is manual: an administrator restores the approved
text in a draft, obtains cultural-owner review again, and explicitly publishes
or republishes it. Archive/restore is the recoverable lifecycle rollback for a
whole translation row. A deployment rollback must preserve the translation
tables and event history; the application may be returned to the prior route
behavior, but destructive table drops are not an operational rollback path.

### 8.4 Cultural terminology ownership

No system process generates an English name, history, cultural significance, or
traditional/local term. The workflow is:

1. A human content owner supplies the English text, preserving approved local
   names and terms where appropriate.
2. A human cultural terminology owner reviews proper names, customary terms,
   historical claims, cultural significance, and any explanatory rendering.
3. The protected administrator records the technical review through the normal
   RPC only after the review checklist confirms that the cultural terminology
   owner has approved the text. The checklist is an administrative attestation;
   the database records the technical reviewer and current fingerprints but
   cannot infer cultural expertise from an Auth identity.
4. The database records the technical actor and UTC checkpoint; it does not
   claim that a generic administrator identity is a separate cultural expert.

The technical authorization remains the single existing administrator
boundary. No translator, reviewer, publisher, or cultural-owner database role,
JWT claim, or role table is added.

To make the checklist gate deterministic without creating a new role, both
translation tables carry a database-owned `terminology_review_confirmed`
boolean. It is reset on draft save, rejection, restore, source blocking, or a
freshness cascade. The parent and image `review` RPCs require an explicit true
attestation parameter, set the flag, and record the reviewing `auth.uid()`;
`publish` and `republish` require the flag as part of the current checkpoint.
The event rows retain the attestation value with the review event. This flag is
an administrative assertion, not evidence that the database can independently
verify a person's cultural appointment.

## 9. Concurrency and revision semantics

### 9.1 Source and media revisions

The migration adds:

- `traditional_houses.source_revision bigint`, database-owned, positive,
  incremented once for every committed source-row update;
- `traditional_house_images.binary_revision bigint`, database-owned, positive,
  incremented for media-token changes as specified in Section 4.4;
- truthful media `updated_at` and nullable historical `updated_by` where needed;
  no actor is fabricated for existing rows.

Source and image revision triggers reject client-supplied counter or audit
values. The existing administrator source actions and federated media RPCs
remain the trusted mutation paths. An unobservable same-path Storage byte
replacement is not an English publication path; supported replacement must go
through the existing media operation so the revision is changed. The Phase 3D
Storage policy must not permit an administrator to replace bytes in place while
leaving the database token unchanged; it must either deny that operation or
require the existing replacement RPC. No broader Storage access is introduced.

### 9.2 Translation `edit_revision`

Each translation and image translation row has a positive database-owned
`edit_revision`. Every mutation RPC accepts `p_expected_edit_revision`; the
function locks the row and rejects a mismatch with a conflict SQLSTATE rather
than overwriting a newer draft, review, or lifecycle transition.

Review and publication capture the current source/media tokens inside the same
transaction that locks the source and translation. A client cannot submit a
fingerprint, actor UUID, publication timestamp, review actor, or source
revision as authority.

### 9.3 Lock and race behavior

The fixed lock order is:

1. source `traditional_houses` row;
2. relevant source image rows in UUID order;
3. parent translation rows in ID order;
4. relevant image translation rows in ID order.

A source/media mutation that commits before review causes the review's current
token or expected revision to fail. A review that locks first may publish a
current snapshot, after which the waiting source/media mutation commits and
deterministically cascades stale/source-blocked state. No application timestamp,
cache value, or form-hidden slug participates in the race decision.

## 10. Database objects and ownership

### 10.1 Tables and constraints

The new migration defines, without changing unrelated domains:

- `traditional_house_translations`, owned by the database owner, with
  restrictive FK to `traditional_houses`, unique `(traditional_house_id,
  locale)`, `locale = 'en'`, lifecycle/review metadata, checkpoints, audit
  actors, and positive `edit_revision`;
- `traditional_house_image_translations`, owned by the database owner, with
  restrictive FK to `traditional_house_images`, unique
  `(traditional_house_image_id, locale)`, `locale = 'en'`, alt/caption,
  lifecycle/review metadata, checkpoints, audit actors, and positive
  `edit_revision`;
- `traditional_house_translation_review_events`, append-only and owned by the
  database owner, with restrictive FK to the parent translation and immutable
  actor/time/state/token evidence;
- `traditional_house_image_translation_review_events`, append-only and owned
  by the database owner, with restrictive FK to the image translation and
  immutable actor/time/state/token evidence.

There is no translation hard-delete RPC. Source and translation deletion is
restricted by foreign keys and history. Archive is the recoverable removal
operation. Existing source-media delete remains subject to the media reference
and Storage cleanup contract; a media row with dependent translation/history is
not deletable.

### 10.2 Indexes

The migration provides:

- partial public lookup indexes on `(traditional_house_id, locale)` and
  `(traditional_house_image_id, locale)` for published/reviewed rows;
- an administrator queue index on review state, translation status, and
  descending `updated_at`;
- review-history indexes on each translation ID, descending `occurred_at`, and
  descending event ID;
- source/image revision and parent/image foreign-key indexes where the existing
  schema does not already provide them.

The public views use the source slug and deterministic source display order;
they do not rely on an arbitrary row when a uniqueness invariant is violated.

### 10.3 RLS, grants, and function ownership

- Anonymous users and authenticated non-administrators can select only the two
  published English views.
- Translation and review-event base tables have RLS enabled, no permissive
  application-role table policies, and no direct application-role DML grants.
- Protected administrators read translation state and history only through
  admin RPCs and mutate only through workflow RPCs.
- Security-definer RPCs are owned by the database owner, use a fixed search
  path, verify `public.is_admin()`, derive the actor from `auth.uid()`, and
  expose only their named operation.
- Private trigger, fingerprint, cascade, and eligibility helpers are owned by
  the database owner and are not executable by `PUBLIC`, `anon`, or
  `authenticated`.
- Review-event relations have separate append-only UPDATE/DELETE guards.
- Public views are security-barrier, explicit-column projections. They exclude
  audit identities, review reasons, internal states, fingerprints, source
  notes, and other private fields.

The proposed public RPC names are:

Parent:

- `traditional_house_translation_admin_read`
- `traditional_house_translation_review_history`
- `traditional_house_translation_save_draft`
- `traditional_house_translation_review(p_translation_id, p_expected_edit_revision, p_terminology_review_confirmed)`
- `traditional_house_translation_reject`
- `traditional_house_translation_publish`
- `traditional_house_translation_republish`
- `traditional_house_translation_archive`
- `traditional_house_translation_unpublish`
- `traditional_house_translation_restore`

Image:

- `traditional_house_image_translation_admin_read`
- `traditional_house_image_translation_review_history`
- `traditional_house_image_translation_save_draft`
- `traditional_house_image_translation_review(p_translation_id, p_expected_edit_revision, p_terminology_review_confirmed)`
- `traditional_house_image_translation_reject`
- `traditional_house_image_translation_publish`
- `traditional_house_image_translation_republish`
- `traditional_house_image_translation_archive`
- `traditional_house_image_translation_unpublish`
- `traditional_house_image_translation_restore`

These names describe the approved boundary; they are not being created in this
design-only phase.

## 11. Public projection and routes

The migration defines two public-safe views:

### `published_english_traditional_houses`

The view joins one current English parent translation to one published source
row and requires the complete parent predicate from Sections 4, 6, and 8. Its
allowlist contains:

- source identity and source slug;
- English parent text fields only;
- source coordinates and validated Google Maps URL;
- source featured/order values;
- source and translation publication timestamps needed by the public model;
- the source thumbnail bucket/path only as a media reference after the primary
  image match has passed.

### `published_english_traditional_house_images`

The view joins published source images to current eligible English image
translations and an eligible published parent. Its allowlist contains the
parent/image identity, source bucket/path/order/primary values, and English
`alt_text`/`caption`. It never selects Indonesian media text.

The application loaders read only these views and the existing server-side
media signer. They never read the translation base tables. The detail route
returns controlled not-found when the source, parent translation, required
primary image, or any required freshness condition is ineligible. The list
omits ineligible rows. No Indonesian body, summary, label, metadata, caption,
or alt fallback is allowed.

The Phase 3D route pair is:

| Indonesian source route | English route | Source identity |
| --- | --- | --- |
| `/rumah-adat` | `/en/traditional-houses` | `traditional_houses` + eligible translated images |
| `/rumah-adat/[slug]` | `/en/traditional-houses/[slug]` | one source row + one eligible parent translation + eligible images |

The English detail route uses the source slug. There is no English slug field,
redirect registry, or alternate slug in Phase 3D. A published source slug is
immutable under the existing source trigger. A valid slug edit is possible
only while the source is not publicly published; it invalidates old and new
trusted cache paths and does not invent a redirect. Canonical URLs,
alternates, hreflang, sitemap, robots, and production-origin policy remain
Phase 3C work.

## 12. Cache invalidation

### 12.1 Source and media actions

After a successful relevant source mutation, the server revalidates:

- `/en/traditional-houses`;
- the affected detail route using a slug read from trusted server/database
  state.

If a trusted source update can change the slug, the action captures the old
trusted slug before the update and the resulting trusted slug after the update,
then revalidates both detail paths plus the collection. It never uses a hidden
form slug or client-provided route value as authority.

The media action applies this only when the owner is `traditional-house`. It
resolves the parent ID and current slug from the existing server-read media
context or a narrow trusted read. Destination, package, homestay, UMKM, and
cultural-event media mutations do not invalidate Traditional House English
routes.

The relevant source/media operations are create/update/status transition,
thumbnail/primary selection, media upload, metadata update, supported binary
replacement, reorder, and delete. Revalidation is targeted to the two
Traditional House English routes; it does not broaden to all `/en` routes or
the entire site. The public views remain authoritative if revalidation is
missed.

### 12.2 Translation actions

Parent translation publish, republish, archive, unpublish, and any operation
that withdraws a previously eligible row revalidates the collection and the
trusted current detail path. Image translation lifecycle operations revalidate
the same paths when the child was eligible or is the required primary image.
Draft-only operations for a never-public row do not require public route
revalidation. The admin route is revalidated after every successful admin
operation.

## 13. Administrator workflow

The existing Indonesian editor remains the source editor. The translation
workflow is a dedicated section linked from or embedded in the existing
`/admin/rumah-adat/[id]/edit` page, following the approved repeatable-domain
pattern while keeping the Indonesian form separate.

The page shows:

- read-only Indonesian source fields and source revision/timestamp;
- empty-by-default English fields;
- derived parent status (`Draft`, `Reviewed`, `Published`, `Stale`,
  `Archived`, or `Source blocked`);
- source/media stale reason from the admin RPC;
- required-field and source-availability completion state;
- review history;
- save draft, review, reject, publish/republish, archive, unpublish, and
  restore actions as permitted by the database response;
- the primary-image reference and child image translation status.

Every server action calls `requireAdministrator()`, uses the authenticated
server client, sends `p_expected_edit_revision`, and calls one of the named
RPCs. It never accepts an actor UUID, fingerprint, source revision, or slug as
client authority. No React code derives eligibility or writes a translation
table.

The cultural terminology checklist is a human review responsibility. It does
not authorize automatic content generation and does not create a technical
role hierarchy.

## 14. Migration and implementation sequence

After design approval, execute the following independently reviewable steps.

1. **Contract gate:** approve this field/fingerprint/media matrix, assign the
   human cultural terminology owner, and confirm the existing exact route
   names. No content is entered at this gate.
2. **Database migration:** add one new migration, with a repository timestamp,
   for source/image revision metadata, the two typed translation tables, the two
   append-only event tables, fingerprint helpers, revision/cascade triggers,
   workflow RPCs, RLS/grants, and the two published English views. Adapt only
   the existing Traditional House branch of the federated media operations as
   required to maintain `binary_revision` and thumbnail effects. Do not modify
   unrelated domain mappings.
3. **Database evidence:** add the next ordered pgTAP suite,
   `supabase/tests/database/017_traditional_house_bilingual_database.test.sql`,
   covering all constraints, grants, actor checks, lifecycle transitions,
   exact markers, stale matrix, primary-image eligibility, source blocking,
   concurrency, and public allowlists.
4. **Server translation modules:** add typed parent and image translation
   `model.ts`, `data.ts`, and `actions.ts` modules. Keep all reads behind admin
   RPCs and all writes behind lifecycle RPCs. No direct translation-table query
   is permitted.
5. **Admin integration:** add parent and image translation forms and integrate
   them into `app/admin/rumah-adat/[id]/edit/page.tsx`. Preserve the existing
   Indonesian source and media editors. Add stale/reference/review-history and
   conflict presentation from database responses.
6. **English public loaders and routes:** add a domain-specific English loader
   that reads only `published_english_traditional_houses` and
   `published_english_traditional_house_images`, plus:
   `app/en/traditional-houses/page.tsx` and
   `app/en/traditional-houses/[slug]/page.tsx`. Add exact route constants to
   `config/public-routes.ts` without introducing locale switching or SEO
   aliases.
7. **Source/media cache adoption:** update
   `features/traditional-houses/actions.ts` and the Traditional House branch
   of `features/media/actions.ts` with trusted old/new slug handling and the
   route matrix in Section 12. Keep Indonesian/admin revalidation intact.
8. **Application evidence:** add focused parent/image workflow tests and
   English route tests; extend Traditional House/media/source regression tests
   for no fallback, no direct table access, stale suppression, primary-media
   behavior, trusted cache slugs, and Indonesian preservation.
9. **Release evidence:** run the repository check, focused tests, local pgTAP,
   production build, accessibility checks, desktop/390-pixel smoke, and the
   bilingual route matrix. Review rollback and content-publication approval
   separately.

## 15. Files likely affected after approval

This design phase changes only this document. The following is the expected
implementation scope, not a request to edit it now.

### New

- `docs/TRADITIONAL_HOUSE_BILINGUAL_IMPLEMENTATION_DESIGN.md` (this design)

After approval:

- `supabase/migrations/<timestamp>_traditional_house_bilingual_database.sql`
- `supabase/tests/database/017_traditional_house_bilingual_database.test.sql`
- `features/traditional-house-translation/model.ts`
- `features/traditional-house-translation/data.ts`
- `features/traditional-house-translation/actions.ts`
- `features/traditional-house-translation/traditional-house-translation-form.tsx`
- `features/traditional-house-image-translation/model.ts`
- `features/traditional-house-image-translation/data.ts`
- `features/traditional-house-image-translation/actions.ts`
- `features/traditional-house-image-translation/traditional-house-image-translation-form.tsx`
- `features/public-traditional-houses/english-data.ts`
- `features/public-traditional-houses/english-model.ts`
- `app/en/traditional-houses/page.tsx`
- `app/en/traditional-houses/[slug]/page.tsx`
- focused Traditional House translation, image, English-route, and cache tests.

### Existing files expected to be extended

- `features/traditional-houses/actions.ts`
- `features/traditional-houses/data.ts` (only if the trusted source/revision
  read contract needs the new database-owned fields)
- `features/media/actions.ts`
- `app/admin/rumah-adat/[id]/edit/page.tsx`
- `config/public-routes.ts`
- existing Traditional House/source/media regression tests.

No package, configuration, Storage bucket, unrelated domain, or current
Indonesian public component is part of the required design.

## 16. Test contract

### 16.1 Database tests

The Traditional House pgTAP suite must prove:

- source/image restrictive foreign keys and unique source/locale pairs;
- `locale = 'en'`, contract versions, lifecycle and review-state invariants;
- draft incompleteness versus review/publication completeness;
- source-null/English-null conditional fields;
- no English content when the source field is absent;
- exact parent, translation, image, and thumbnail fingerprint markers and
  deterministic output;
- source revision and image binary revision ownership/overflow behavior;
- source text, primary media, non-primary media, slug, reorder, delete, and
  source-blocking behavior from Section 7;
- stale published rows omitted by public views;
- primary-image English alt requirement and optional-gallery omission;
- no Indonesian media fallback;
- RLS/grants for anonymous, non-admin, and administrator identities;
- direct table DML denial and RPC actor derivation;
- expected edit-revision conflicts and review/publish races;
- append-only review history and no fabricated delete event;
- explicit public column allowlists and duplicate/invariant fail-closed behavior.

### 16.2 Application tests

Application tests must prove:

- English list/detail use only the two public English views;
- no import or query of Indonesian source loaders or translation base tables
  from English public code;
- no Indonesian fallback in body, summary, metadata, labels, captions, or alt;
- source-slug route behavior and controlled not-found for stale/ineligible rows;
- admin authorization, RPC mapping, expected revision propagation, and error
  handling;
- parent/image draft, review, rejection, publish, republish, archive,
  unpublish, restore, stale warning, and conflict presentation;
- primary-image missing-alt suppression and optional gallery omission;
- trusted old/new slug cache invalidation for source changes;
- Traditional-only media invalidation and no invalidation for unrelated media;
- Indonesian source/admin/public route regression;
- keyboard and 390-pixel behavior for the new admin/public states.

## 17. Phase boundary and deferred work

### Required in Phase 3D

- typed Traditional House parent and image translation schema;
- database-owned revisions, exact fingerprints, lifecycle RPCs, review events,
  RLS, grants, and public-safe views;
- source/media stale cascade and primary-image fail-closed policy;
- administrator workflow with source reference and no fallback;
- English Traditional House list/detail projections and source-slug routes;
- server-side signed media delivery from eligible source images;
- trusted, domain-scoped cache invalidation;
- database, application, accessibility, and Indonesian regression tests.

### Deferred to shared Phase 3C

- reciprocal locale switching and shared locale navigation;
- canonical URL and language-alternate policy;
- `hreflang`, sitemap, robots, and production-origin/indexability activation;
- shared bilingual SEO component/template work;
- cross-domain English search and shared search indexing;
- production deployment and public content-publication authorization.

Phase 3D may provide safe translated title/summary values to the existing route
metadata boundary only where required to avoid Indonesian fallback or draft
leakage. That does not activate the deferred cross-domain SEO contract.

## 18. Unresolved questions and recommendation

### Unresolved questions

None remain in the technical implementation contract. The following are
required gates, not unresolved schema decisions:

- a human cultural terminology/content owner must be assigned before English
  content is entered;
- individual English names, historical statements, cultural significance, and
  local terms require that owner's approval;
- implementation, migration, merge, deployment, and content publication each
  require their own authorization under the authoritative rollout gates.

### Recommendation

**READY** to implement Phase 3D after this design is approved and the cultural
terminology owner is assigned. This document itself changes no code, SQL,
migration, test, package, configuration, Storage, or Supabase state.
