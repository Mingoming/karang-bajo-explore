# Remaining Bilingual Verticals Implementation Freeze

Version: 1.0
Status: technical implementation freeze; implementation not authorized by this document

This document freezes the implementation contracts for the remaining repeatable
English public verticals:

1. Cultural Events (`cultural_events`)
2. Tourism Packages (`tourism_packages`)
3. Homestays (`homestays`)
4. UMKM/local businesses (`umkms`)

It is subordinate to:

- `docs/BILINGUAL_IMPLEMENTATION_DESIGN.md`
- `docs/BILINGUAL_PUBLIC_ROLLOUT_PLAN.md`
- `docs/TRADITIONAL_HOUSE_BILINGUAL_IMPLEMENTATION_DESIGN.md`

Destination and Traditional House are completed reference verticals. Their
database-owned lifecycle, RPC-only mutation, fail-closed projection, source-slug,
media-ownership, cache, and test boundaries are reused where compatible. Domain
fingerprint fields and eligibility rules below are independent contracts; no
Destination or Traditional House fingerprint is copied by implication.

No SQL, migration, application code, test, package, configuration, Storage, or
Supabase state is changed by this document.

## 1. Freeze boundary and non-negotiable rules

### 1.1 Decisions frozen here

- Translation storage uses Option C: dedicated typed parent translation tables,
  typed image translation tables, and no polymorphic translation table.
- English detail routes use the existing source slug. There is no English slug,
  redirect registry, or translated-slug editor in these verticals.
- The only technical principal is the protected administrator. There are no new
  translator, reviewer, publisher, or service roles.
- Actors are derived by the database from `auth.uid()`. Application actions may
  authenticate the administrator, but may not submit actor identity as authority.
- Translation base tables and review-event tables are RPC-only. Application code
  never reads or writes them directly.
- The database, not React or a loader, computes freshness, stale state, source
  blocking, primary-image eligibility, and publication eligibility.
- English public projections read only dedicated fail-closed English views. They
  never read source base tables or translation base tables directly.
- Indonesian source content is a read-only admin reference only. It is never an
  English fallback, including for body text, metadata, labels, captions, alt text,
  package stops, or contact labels.
- Source archival or unpublication removes English eligibility immediately.
  Source restoration never republishes English automatically.
- Translation archive, unpublish, restore, publish, and republish are explicit
  lifecycle operations. Saving a draft never publishes it.
- `edit_revision` is the optimistic-concurrency checkpoint. Fingerprints and
  source/media revisions are database-owned freshness evidence and are never
  accepted from a client.
- Canonical URL, sitemap, hreflang, production origin, and cache state never
  determine content eligibility. They belong to the deferred shared SEO/locale
  phase.

### 1.2 Launch-safety decisions

- All four domains are implemented as separate verticals with separate database
  migrations and separate pgTAP suites. This permits domain-local review,
  rollback, and failure isolation.
- Package English itinerary notes are deliberately omitted from the first
  English package route. `package_destinations.notes` remains source-only and is
  never exposed as Indonesian text. It still participates in the strict package
  relationship revision so a reviewed package aggregate is not silently reused
  after an itinerary record changes.
- Package English publication is all-or-nothing for its current itinerary: every
  current destination relation must resolve to a current eligible English
  Destination projection. An incomplete itinerary is suppressed rather than
  rendered with Indonesian destination names or silently shortened.
- No separate SEO title/description columns are added to these domain tables.
  Phase 3C owns metadata composition from safe translated identity/summary fields
  and approved English dictionaries.
- No capacity, availability, booking, inventory, commerce, recurrence, or
  reservation behavior is introduced. The current source schema has no
  authoritative capacity field for these four domains.

## 2. Current architecture inventory

| Domain | Source parent | Source media | Current Indonesian routes | Current public projections | Relationships and special rules |
| --- | --- | --- | --- | --- | --- |
| Cultural Events | `public.cultural_events` | `public.cultural_event_images` | `/acara-budaya`, `/acara-budaya/[slug]` | `published_cultural_events`, `published_cultural_event_images` | `start_at` is required for published source rows; presentation uses Asia/Makassar; contact phone requires consent. |
| Tourism Packages | `public.tourism_packages` | `public.package_images` | `/paket-wisata`, `/paket-wisata/[slug]` | `published_tourism_packages`, `published_package_images` and `published_package_destinations` | `package_destinations` is an ordered many-to-many aggregate; existing transactional RPCs own relationship mutations. |
| Homestays | `public.homestays` | `public.homestay_images` | `/homestay`, `/homestay/[slug]` | `published_homestays`, `published_homestay_images` | Numeric price, coordinates, owner/phone, and consent are source-controlled; no availability or capacity model exists. |
| UMKM/local businesses | `public.umkms` | `public.umkm_images` | `/umkm`, `/umkm/[slug]` | `published_umkms`, `published_umkm_images` | Published source requires reachability and consent rules; owner/contact names are source-controlled proper-name values. |

Existing Indonesian admin actions remain the source mutation boundary. Existing
generic media RPCs remain the binary/media mutation boundary. The new bilingual
database layer adds database-owned counters, typed translation rows, lifecycle
RPCs, cascades, and English views without changing Indonesian public behavior.

## 3. Shared translation and lifecycle contract

### 3.1 Parent field rules

Every parent translation table has exactly one English row per source parent,
enforced by a restrictive foreign key and a unique `(source_id, locale)` key.
The locale is constrained to `en`. Parent English columns are nullable while a
draft is being prepared. They are not prefilled by the UI or database.

For every translated field:

- a required source field requires a nonblank English value at review and
  publication;
- a source `NULL`, empty, or trim-only optional value requires English `NULL`;
- a populated optional source value requires a nonblank English value at review
  and publication;
- English prose may never be added when the source has no semantic value;
- proper names or preserved local terms may remain unchanged only as an explicit
  human-authored review decision;
- source-empty optional values are not represented by an English placeholder;
- draft omission is permitted only while the field is being prepared, never as a
  way to publish incomplete content.

The canonical trim set and null rules are the shared fingerprint rules in
Section 5. A blank value is not made valid by a client-side validator alone.

### 3.2 Stored and derived states

Source state is exactly `draft`, `published`, or `archived`. “Unpublished” is an
operation, represented for source rows by the existing `published -> archived`
transition. Source restore is `archived -> draft`.

Translation state uses:

- `translation_status`: `draft`, `published`, or `archived`;
- `review_state`: `pending`, `reviewed`, or `rejected`;
- freshness: derived `current` or `stale`, never a client-controlled stored
  status;
- source blocking: a database-derived reason when the source is not eligible.

The observable lifecycle is deterministic:

| Logical state | Required database state | Public result |
| --- | --- | --- |
| Draft | `draft/pending` | Never public |
| Reviewed | `draft/reviewed` with current captured checkpoints and terminology confirmation | Never public until explicit publication |
| Published | `published/reviewed` with current checkpoints and published source | Public only if the complete view predicate passes |
| Stale | `published/reviewed` with a changed current fingerprint/token | Never public; fresh review and republish required |
| Rejected | `draft/rejected` with nonblank reason and actor | Never public |
| Archived | `archived` with `archived_at` | Never public |
| Source-blocked | Any translation state while source is archived/unpublished or otherwise source-ineligible | Never public |
| Republished | A new publication event through `republish` after prior publication history | Public only after all current predicates pass |

The following operations are required for each parent and image translation:

`save_draft`, `review`, `reject`, `publish`, `republish`, `archive`,
`unpublish`, and `restore`.

Every mutation:

1. verifies `requireAdministrator()` at the server boundary;
2. derives the actor from `auth.uid()` inside the database function;
3. locks/re-reads the source, translation, and relevant media in the approved
   order;
4. checks the submitted expected `edit_revision`;
5. computes current tokens inside the database transaction;
6. writes the translation and an append-only event, or rolls back completely;
7. never accepts actor, fingerprint, source revision, publication timestamp, or
   slug as client authority.

`review` requires a current published source, current source/media token,
complete source-mirroring fields, and `terminology_review_confirmed = true`.
`publish` is only for a translation with no historical `published_at`;
`republish` is required whenever historical `published_at` is non-null. A stale
translation cannot publish from its old checkpoint.

Source archive/unpublish applies the source-blocking cascade in the same
transaction. Published/reviewed rows become non-public draft/pending with their
current review checkpoint cleared; rejected rows lose their current rejection
checkpoint; archived translations remain archived. All receive the required
source-blocking audit event. Source restore leaves all translation rows
non-public. Translation restore returns only to draft/pending.

Published English fields are not edited in place. A content edit withdraws the
current review/publication checkpoint, increments `edit_revision`, and requires
fresh review and publication. There is no translation hard-delete operation.

### 3.3 Image translation rules

Each source image has one English image translation row keyed by
`(source_image_id, locale)`. Every image is informative because the current
schema has no decorative-image flag.

- `alt_text` may be empty in draft but must be nonblank at review/publication.
- A primary image must have a current, published English image translation with
  nonblank English alt text. If it does not, the parent English row is suppressed.
- A non-primary image with missing, stale, archived, or unpublished translation
  is omitted independently; it does not suppress the parent.
- If source `caption` is `NULL`, empty, or trim-only, English `caption` must be
  `NULL`. An English caption may not be invented.
- If source `caption` is populated, English caption may be `NULL` or a reviewed
  nonblank English caption. A missing English caption does not suppress an
  otherwise eligible image.
- Source `alt_text` must be nonblank. A legacy invalid source image fails closed.
- Image translation rows never copy storage bucket/path. The source image owns
  binary identity and Storage cleanup.
- Image lifecycle changes use image translation RPCs only; they never call
  `media_insert`, `media_update`, `media_replace`, `media_set_primary`,
  `media_reorder`, or `media_delete`.

### 3.4 Cultural terminology and ownership

The same protected administrator is the technical editor, reviewer, publisher,
and content owner. A human cultural/content owner must approve event names,
proper names, local terms, cultural terminology, package/destination names,
homestay/UMKM names, and any preserved source wording before the database review
RPC accepts the row. This is an operational content gate, not a new database
role and not a reason to invent content in the plan.

## 4. Domain contract: Cultural Events

### 4.1 Parent translation fields

The parent table is `public.cultural_event_translations`. Its translated fields
are exactly: `title`, `summary`, `description`, `event_type`, `date_note`,
`location_name`, `address`, `organizer`, and `visitor_information`.

| Source field | Classification | English contract |
| --- | --- | --- |
| `id` | Identity | Shared source identity; immutable FK. |
| `title` | Translation-relevant | Required English title; source is required. |
| `slug` | Route key | Shared source slug; no English slug; excluded from text fingerprint. |
| `summary` | Translation-relevant | Conditional; English `NULL` exactly when source is empty. |
| `description` | Translation-relevant | Required English description; source is required. |
| `event_type` | Translation-relevant | Conditional translated free text; no guessed category dictionary. |
| `start_at` | Schedule presentation and freshness | Shared confirmed UTC instant; included in source fingerprint; displayed in Asia/Makassar. |
| `end_at` | Schedule presentation and freshness | Shared optional UTC instant; included in source fingerprint; never inferred. |
| `all_day` | Schedule presentation and freshness | Shared boolean; included in source fingerprint. |
| `date_note` | Translation-relevant | Conditional translated note; date-note-only source rows cannot publish. |
| `location_name` | Translation-relevant | Conditional translated location text. |
| `address` | Translation-relevant | Conditional translated address prose. |
| `latitude` | Locale-neutral presentation | Shared validated coordinate; excluded from translation text fingerprint. |
| `longitude` | Locale-neutral presentation | Shared validated coordinate; excluded from translation text fingerprint. |
| `google_maps_url` | Locale-neutral operational value | Shared validated URL; never translated. |
| `organizer` | Translation-relevant | Conditional translated organizer text; proper names may be retained by review. |
| `contact_phone` | Locale-neutral contact value | Shared only when source consent permits; no translated phone value. |
| `contact_consent_confirmed` | Governance gate | Source publication/visibility rule; never translated or used as English prose. |
| `visitor_information` | Translation-relevant | Conditional translated visitor information. |
| `thumbnail_path` | Media reference | Source-owned cached pair; excluded from text fingerprint. |
| `thumbnail_bucket` | Media reference | Source-owned cached pair; must resolve to the primary child image. |
| `status` | Lifecycle gate | Must be `published`; archive/unpublish blocks English. |
| `is_featured` | Presentation control | Shared ordering/featured value; no retranslation. |
| `published_at` | Publication metadata | Source-controlled timestamp; not a translation input. |
| `created_at` | Audit metadata | Not a translation input. |
| `updated_at` | Audit/concurrency metadata | Not the freshness decision; source fingerprint is authoritative. |
| `created_by` | Audit identity | Private; never projected. |
| `updated_by` | Audit identity | Private; never projected. |

Source `start_at` is mandatory for publication. `end_at` is allowed only with a
valid `start_at` and cannot precede it. `date_note` supplements confirmed timing;
it never creates or infers a date. English presentation localizes the shared
instants in Asia/Makassar and does not store a second English date.

### 4.2 Cultural Event fingerprint contract

The five database-owned versioned helpers are fixed as follows. Each returns
`<marker>:<64 lowercase hexadecimal SHA-256 digest>` except the shared serializer
is not itself a domain token.

| Helper | Exact marker | Ordered keys after `version` |
| --- | --- | --- |
| `private.cultural_event_source_fingerprint_v1` | `cultural-event-source-v1` | `title`, `summary`, `description`, `event_type`, `start_at`, `end_at`, `all_day`, `date_note`, `location_name`, `address`, `organizer`, `visitor_information` |
| `private.cultural_event_translation_fingerprint_v1` | `cultural-event-translation-v1` | `title`, `summary`, `description`, `event_type`, `date_note`, `location_name`, `address`, `organizer`, `visitor_information` |
| `private.cultural_event_image_translation_fingerprint_v1` | `cultural-event-media-translation-v1` | `alt_text`, `caption` |
| `private.cultural_event_image_media_fingerprint_v1` | `cultural-event-media-v1` | `cultural_event_image_id`, `storage_bucket`, `storage_path`, `caption`, `alt_text`, `binary_revision` |
| `private.cultural_event_thumbnail_media_fingerprint_v1` | `cultural-event-thumbnail-media-v1` | `cultural_event_id`, `thumbnail_bucket`, `thumbnail_path`, `primary_image_id`, `primary_image_media_fingerprint` |

`start_at` and `end_at` use canonical UTC `timestamptz` text; `all_day` uses JSON
boolean. Optional text uses JSON `null` for source `NULL`, empty, or trim-only
values. Required invalid source values reject fingerprint computation and make
the public projection fail closed. No slug, coordinates, URL, contact phone,
consent flag, lifecycle state, featured flag, order, timestamps, or audit actor
is in the text token. Primary media identity is in the separate thumbnail token.

### 4.3 Cultural Event eligibility and stale matrix

The English parent view requires: published source; confirmed `start_at`; valid
source lifecycle/consent/thumbnail constraints; published/reviewed current
parent translation; required and source-conditional English fields; a matching
primary child image; and a current published/reviewed primary image translation
with nonblank English alt. Optional gallery children are joined independently.

| Operation | Parent translation | Image translation | Public result and next action |
| --- | --- | --- | --- |
| `title`, `description`, event type, translated location/organizer/visitor text edit | Stale | Unchanged | Parent omitted; fresh review and publish/republish. |
| `summary`, `date_note` or schedule (`start_at`, `end_at`, `all_day`) edit | Stale | Unchanged | Parent omitted; fresh review; no date inference. |
| Coordinate, Google Maps URL, featured, or display-order edit | Current if source remains eligible | Unchanged | Revalidate affected routes; no retranslation. |
| Contact phone/consent edit | No text stale; source gate re-evaluated | Unchanged | Source is suppressed if its consent rule fails; otherwise shared value updates without fallback. |
| Slug change while source is unpublished | Current | Unchanged | Invalidate trusted old and new detail paths; no retranslation or redirect. |
| Source publish, archive, unpublish, restore | Source-blocking cascade; restore never promotes | Child rows remain independently stored | Archive/unpublish immediately suppresses; restore requires source publish then fresh review and explicit publication. |
| Non-primary media insert/reorder/delete | No parent stale | New child starts draft; reorder does not stale; deleted child is omitted | Parent remains eligible; affected collection/detail/media caches revalidate. |
| Primary selection or thumbnail pair change | Stale through thumbnail token | Child does not stale solely from selection | Parent omitted until fresh parent review/republish; selected primary still needs eligible English alt. |
| Primary or gallery caption/alt/path/binary edit | Primary: stale through thumbnail token; gallery: parent token unchanged | Affected child stale | Primary invalidates parent until both checkpoints are fresh; gallery is omitted independently. |
| Primary deletion with fallback | Stale through new thumbnail token | Deleted row has no fabricated event | Parent requires fresh review and eligible fallback primary; non-primary deletion is independent. |

### 4.4 Cultural Event database and route contract

Planned English views are `published_english_cultural_events` and
`published_english_cultural_event_images`. The parent projection exposes only
source identity/slug, safe translated fields, shared confirmed schedule and
location values, consent-safe contact value, ordering/featured data, publication
timestamps needed by the public model, and the child-owned primary media
reference after the matching-primary proof. Audit actors, consent flags,
fingerprints, review state, and private reasons are excluded.

English routes are:

- `/en/cultural-events` from `/acara-budaya`;
- `/en/cultural-events/[slug]` from `/acara-budaya/[slug]`.

Date formatting is English UI over shared source instants. No English date or
event recurrence is fabricated. Missing/stale/ineligible detail data is a
controlled `notFound()` result; an empty eligible list is a localized empty
state; a technical database error is not converted to an empty success.

## 5. Domain contract: Tourism Packages

### 5.1 Parent, relationship, and image fields

The parent table is `public.tourism_package_translations`. Its translated
fields are exactly `name`, `duration_unit`, `price_note`, `included_facilities`,
`souvenir`, `summary`, and `description`. `package_type` is a fixed source enum
whose English label is a reviewed dictionary value, not a translation row.

| Source object/field | Classification | English contract |
| --- | --- | --- |
| `tourism_packages.id` | Identity | Shared source identity and restrictive FK. |
| `tourism_packages.name` | Translation-relevant | Required English package name; proper names require review. |
| `tourism_packages.slug` | Route key | Shared source slug; no English slug. |
| `tourism_packages.package_type` | Fixed vocabulary | Shared token; English label comes from an approved dictionary. |
| `tourism_packages.duration_value` | Shared numeric presentation | Source number is reused; strict package revision still captures the row update. |
| `tourism_packages.duration_unit` | Translation-relevant | Required when source is nonblank; translated unit label/text. |
| `tourism_packages.price` | Shared numeric presentation | Source numeric value is reused; no English number is invented. |
| `tourism_packages.price_note` | Translation-relevant | Conditional English text; source-empty requires English `NULL`. |
| `tourism_packages.included_facilities` | Translation-relevant array | English array must preserve source cardinality and order; empty source requires `[]`. |
| `tourism_packages.souvenir` | Translation-relevant | Conditional English text; source-empty requires English `NULL`. |
| `tourism_packages.summary` | Translation-relevant | Conditional English summary. |
| `tourism_packages.description` | Translation-relevant | Required English description; source is required. |
| `tourism_packages.thumbnail_path/bucket` | Media reference | Separate thumbnail media token; source-owned. |
| `is_featured`, `display_order` | Presentation controls | Shared values; strict package revision captures the row update. |
| `status`, `published_at` | Lifecycle/publication gate | Source must be published; status is not translated. |
| `created_at`, `updated_at`, `created_by`, `updated_by` | Audit metadata | Private/non-translated. |
| `package_destinations.id` | Relationship identity | Shared relation identity. |
| `package_destinations.package_id` | Relationship identity | Must reference this package. |
| `package_destinations.destination_id` | Relationship identity | Shared destination identity; English name comes only from eligible Destination projection. |
| `package_destinations.display_order` | Relationship presentation | Shared ordered itinerary; strict relationship revision input. |
| `package_destinations.notes` | Source-only relationship note | Not rendered in the initial English package route; strict relationship revision input; never shown in Indonesian as English. |
| relation `created_at`, `created_by` | Audit metadata | Private/non-translated. |

This freeze deliberately adds no package relation-note translation table. A
future relation-note contract would be a new reviewed schema decision. The first
English package view omits notes entirely. It must not shorten or relabel an
itinerary to hide a missing translation.

### 5.2 Tourism Package revision and fingerprint contract

Packages use strict row plus relationship revision, not a translation-relevant
field-only freshness decision. The database adds one positive
`tourism_packages.aggregate_revision` counter. Existing trusted transactional
package RPCs increment it exactly once for every committed package-row mutation
and every package-destination insert, update, delete, membership, order, or note
change. The counter is database-owned and cannot be submitted by a client.

The exact parent source token is:

`tourism-package-source-v1:<lowercase-package-uuid>:<positive-aggregate-revision>`

The exact relationship token is:

`tourism-package-relationship-v1:<lowercase-package-uuid>:<positive-aggregate-revision>`

Both tokens use the same aggregate revision deliberately. The relationship token
is retained separately for audit and diagnosis. It is not a second concurrency
counter.

The remaining exact helpers are:

| Helper | Exact marker | Ordered keys after `version` |
| --- | --- | --- |
| `private.tourism_package_translation_fingerprint_v1` | `tourism-package-translation-v1` | `name`, `duration_unit`, `price_note`, `included_facilities`, `souvenir`, `summary`, `description` |
| `private.tourism_package_image_translation_fingerprint_v1` | `tourism-package-media-translation-v1` | `alt_text`, `caption` |
| `private.tourism_package_image_media_fingerprint_v1` | `tourism-package-media-v1` | `package_image_id`, `storage_bucket`, `storage_path`, `caption`, `alt_text`, `binary_revision` |
| `private.tourism_package_thumbnail_media_fingerprint_v1` | `tourism-package-thumbnail-media-v1` | `tourism_package_id`, `thumbnail_bucket`, `thumbnail_path`, `primary_image_id`, `primary_image_media_fingerprint` |

The parent translation captures both source and relationship tokens, the
translation fingerprint, and the thumbnail token. Parent source values such as
price, duration number, enum token, featured flag, and order do not need English
prose, but strict aggregate revision still requires fresh review after their
trusted mutation. All array/null/UTF-8/number rules are the shared rules in
Section 5; no sorting or deduplication is permitted.

### 5.3 Tourism Package eligibility and stale matrix

An English package is eligible only when the source package is published and
passes its existing publication contract; the parent translation is published,
reviewed, current, and complete; the primary package image is eligible; and
every current `package_destinations` row points to a published, currently
eligible English Destination projection. Package relations are ordered by the
source order. If any relation is unavailable, the complete package is omitted.

| Operation | Parent translation | Image/relationship effect | Public result and next action |
| --- | --- | --- | --- |
| Any package-row mutation, including price, duration, enum, text, featured, or order | Stale through strict aggregate revision | Image rows do not stale unless their media changes | Package omitted until fresh review and publish/republish. |
| Relation insert/delete/order/note/membership change | Stale through relationship revision | No image stale solely from relation change | Package omitted; fresh package review and publish/republish. Notes remain unrendered. |
| Related Destination becomes stale, unpublished, archived, or incomplete | Package translation need not be mutated | Relation eligibility fails | Whole package omitted; it returns when all related English Destination projections are current. |
| Related Destination remains eligible but its English title changes | Package translation remains current | View reads the current eligible Destination projection | Revalidate package routes; no Indonesian destination-name fallback. |
| Package slug change while unpublished | Current | No translation stale | Invalidate trusted old and new package detail paths; no redirect. |
| Source publish/archive/unpublish/restore | Source blocking; restore never promotes | Child rows remain independent | Source archive/unpublish suppresses; source restore requires source publish, package review, and explicit publication. |
| Non-primary media insert/reorder/delete | No parent stale | New/deleted/order-only child independent | Parent remains eligible; child omission and route cache behavior are independent. |
| Primary selection or thumbnail change | Stale through thumbnail token | Child does not stale solely from selection | Parent requires fresh parent review; primary child still requires eligible English alt. |
| Image caption/alt/path/binary change | Primary: parent stale through thumbnail token; gallery: parent token unchanged | Affected child stale | Primary blocks package; gallery is omitted independently. |

### 5.4 Tourism Package routes and public data

English routes are:

- `/en/tourism-packages` from `/paket-wisata`;
- `/en/tourism-packages/[slug]` from `/paket-wisata/[slug]`.

Planned views are `published_english_tourism_packages`,
`published_english_tourism_package_images`, and a safe relationship projection
used internally by the package view. The relationship projection exposes only
the source relation identity/order and eligible translated Destination data. It
does not expose `package_destinations.notes`.

Price and duration numbers, package type tokens, source destination IDs, and
source timestamps remain source-controlled. English labels for package type and
duration units are approved dictionaries or reviewed translation values as
specified above. No booking, payment, capacity, availability, or route
optimization is introduced.

## 6. Domain contract: Homestays

### 6.1 Parent translation fields

The parent table is `public.homestay_translations`. Its translated fields are
exactly `name`, `description`, `address`, `price_note`, and `facilities`.

| Source field | Classification | English contract |
| --- | --- | --- |
| `id` | Identity | Shared restrictive FK identity. |
| `name` | Translation-relevant | Required English name; proper name retention requires review. |
| `slug` | Route key | Shared source slug; no English slug. |
| `owner_name` | Locale-neutral proper name | Shared only when source consent permits; not translated. |
| `phone` | Locale-neutral contact value | Shared only when source consent permits; not translated. |
| `contact_consent_confirmed` | Governance gate | Source-controlled; never English prose. |
| `description` | Translation-relevant | Required English description; source is required. |
| `address` | Translation-relevant | Conditional English address prose. |
| `latitude`, `longitude` | Locale-neutral presentation | Shared validated coordinates; excluded from translation text fingerprint. |
| `google_maps_url` | Locale-neutral operational value | Shared validated URL; never translated. |
| `price_per_night` | Shared numeric presentation and freshness | Source numeric value is reused; included in source fingerprint because it affects the reviewed English price presentation. |
| `price_note` | Translation-relevant | Conditional English price note. |
| `facilities` | Translation-relevant array | English array preserves source cardinality/order; empty source requires `[]`. |
| `thumbnail_path`, `thumbnail_bucket` | Media reference | Separate thumbnail token; source-owned. |
| `status` | Lifecycle gate | Must be published; archive/unpublish blocks English. |
| `published_at` | Publication metadata | Shared source timestamp; not translated. |
| `is_featured`, `display_order` | Presentation controls | Shared values; no retranslation. |
| `created_at`, `updated_at` | Audit metadata | Not translation inputs. |
| `created_by`, `updated_by` | Audit identities | Private; never projected. |

No capacity or availability field exists. The English route must not invent one
or imply booking availability. Owner/phone changes are source-controlled
contact changes, not translated prose; if a source mutation violates its
consent/publication contract, the public source is suppressed immediately.

### 6.2 Homestay fingerprint contract

| Helper | Exact marker | Ordered keys after `version` |
| --- | --- | --- |
| `private.homestay_source_fingerprint_v1` | `homestay-source-v1` | `name`, `description`, `address`, `price_per_night`, `price_note`, `facilities` |
| `private.homestay_translation_fingerprint_v1` | `homestay-translation-v1` | `name`, `description`, `address`, `price_note`, `facilities` |
| `private.homestay_image_translation_fingerprint_v1` | `homestay-media-translation-v1` | `alt_text`, `caption` |
| `private.homestay_image_media_fingerprint_v1` | `homestay-media-v1` | `homestay_image_id`, `storage_bucket`, `storage_path`, `caption`, `alt_text`, `binary_revision` |
| `private.homestay_thumbnail_media_fingerprint_v1` | `homestay-thumbnail-media-v1` | `homestay_id`, `thumbnail_bucket`, `thumbnail_path`, `primary_image_id`, `primary_image_media_fingerprint` |

Price is included because the rendered English offer contains the source price
and a reviewed price presentation. Coordinates, map URL, owner/phone/contact
consent, slug, lifecycle, featured/order, timestamps, and audit actors are not
text-token inputs. Contact/consent remains an independent source eligibility
gate. Facilities is a non-null ordered array with exact source cardinality and
duplicate preservation.

### 6.3 Homestay eligibility and stale matrix

The English parent requires a published source, valid source consent/thumbnail
rules, a current complete parent translation, and an eligible current primary
English image. Gallery images are optional.

| Operation | Parent translation | Image effect | Public result and next action |
| --- | --- | --- | --- |
| Name, description, address, price, price note, or facilities change | Stale | Unchanged | Parent omitted until fresh review and publish/republish. |
| Coordinates or Google Maps URL change | Current if source remains eligible | Unchanged | Revalidate routes; no retranslation. |
| Owner/phone/contact-consent change | No text stale unless source gate fails | Unchanged | Shared contact updates immediately when permitted; invalid consent blocks source. |
| Slug change while unpublished | Current | Unchanged | Invalidate trusted old/new detail paths; no redirect or English slug. |
| Source lifecycle change | Source-blocking cascade; restore never promotes | Child rows remain independent | Archive/unpublish suppresses; source restore requires fresh source publication and translation publication. |
| Media upload/reorder/non-primary delete | No parent stale except a selected-thumbnail change | New/order-only/deleted child independent | Parent stays eligible; optional child behavior remains fail-independent. |
| Primary selection/thumbnail change | Stale through thumbnail token | Selection alone does not stale child | Parent requires fresh review/republish and eligible primary child. |
| Primary/gallery media metadata or binary change | Primary parent stale; gallery parent token unchanged | Affected child stale | Primary suppresses parent; gallery omitted independently. |

### 6.4 Homestay routes and public data

English routes are:

- `/en/homestays` from `/homestay`;
- `/en/homestays/[slug]` from `/homestay/[slug]`.

Planned views are `published_english_homestays` and
`published_english_homestay_images`. Safe projections may expose source
coordinates, validated map URL, numeric price, consent-safe owner/phone values,
featured/order data, and source timestamps, but never consent flags or private
audit fields. No Indonesian address, facility, description, price note, caption,
or alt fallback is allowed.

## 7. Domain contract: UMKM/local businesses

### 7.1 Parent translation fields

The parent table is `public.umkm_translations`. Its translated fields are
exactly `business_name`, `category`, `description`, and `address`.

| Source field | Classification | English contract |
| --- | --- | --- |
| `id` | Identity | Shared restrictive FK identity. |
| `business_name` | Translation-relevant | Required English business name; proper-name retention requires review. |
| `slug` | Route key | Shared source slug; no English slug. |
| `owner_name` | Locale-neutral proper name | Shared only when consent permits; not translated. |
| `category` | Translation-relevant free text | Required English category when source is populated; no guessed dictionary fallback. |
| `description` | Translation-relevant | Required English description; source is required. |
| `address` | Translation-relevant | Conditional English address prose. |
| `latitude`, `longitude` | Locale-neutral reachability | Shared validated coordinates; not translated. |
| `google_maps_url` | Locale-neutral operational value | Shared validated URL; not translated. |
| `contact_name` | Locale-neutral proper name | Shared only when consent permits; there is no source contact-label field to translate. |
| `contact_phone`, `contact_whatsapp` | Locale-neutral contact values | Shared only when consent permits; no translated contact values. |
| `contact_consent_confirmed` | Governance gate | Source-controlled; never English prose. |
| `thumbnail_path`, `thumbnail_bucket` | Media reference | Separate thumbnail token; source-owned. |
| `status` | Lifecycle gate | Must be published; archive/unpublish blocks English. |
| `published_at` | Publication metadata | Shared source timestamp; not translated. |
| `is_featured`, `display_order` | Presentation controls | Shared values; no retranslation. |
| `created_at`, `updated_at` | Audit metadata | Not translation inputs. |
| `created_by`, `updated_by` | Audit identities | Private; never projected. |

The existing publication reachability rule remains authoritative: a published
UMKM needs latitude or phone or WhatsApp. Consent remains authoritative for
owner/contact values. There is no capacity, price, inventory, commerce, or
shopping behavior in this vertical. Static English labels such as “Contact” are
dictionary-owned; no Indonesian label is used as fallback.

### 7.2 UMKM fingerprint contract

| Helper | Exact marker | Ordered keys after `version` |
| --- | --- | --- |
| `private.umkm_source_fingerprint_v1` | `umkm-source-v1` | `business_name`, `category`, `description`, `address` |
| `private.umkm_translation_fingerprint_v1` | `umkm-translation-v1` | `business_name`, `category`, `description`, `address` |
| `private.umkm_image_translation_fingerprint_v1` | `umkm-media-translation-v1` | `alt_text`, `caption` |
| `private.umkm_image_media_fingerprint_v1` | `umkm-media-v1` | `umkm_image_id`, `storage_bucket`, `storage_path`, `caption`, `alt_text`, `binary_revision` |
| `private.umkm_thumbnail_media_fingerprint_v1` | `umkm-thumbnail-media-v1` | `umkm_id`, `thumbnail_bucket`, `thumbnail_path`, `primary_image_id`, `primary_image_media_fingerprint` |

Contact values, owner/contact proper names, coordinates, map URL, consent,
reachability, slug, lifecycle, featured/order, timestamps, and audit actors are
excluded from the text token. They remain source-controlled public values or
eligibility gates. A contact update therefore does not automatically require
retranslation, but it always revalidates the source predicate and invalidates
the affected English routes.

### 7.3 UMKM eligibility and stale matrix

| Operation | Parent translation | Image effect | Public result and next action |
| --- | --- | --- | --- |
| Business name, category, description, or address edit | Stale | Unchanged | Parent omitted until fresh review and publish/republish. |
| Contact/owner value, coordinate, map URL, consent, or reachability edit | Current if source remains eligible | Unchanged | Shared values/gates update without translation fallback; invalid reachability or consent suppresses source. |
| Slug change while unpublished | Current | Unchanged | Invalidate trusted old/new detail paths; no redirect. |
| Source lifecycle change | Source-blocking cascade; restore never promotes | Child rows remain independent | Archive/unpublish suppresses; source restoration requires fresh source publication and translation publication. |
| Media upload/reorder/non-primary delete | No parent stale except selected-thumbnail change | New/order-only/deleted child independent | Parent remains eligible; optional gallery behavior is independent. |
| Primary selection/thumbnail change | Stale through thumbnail token | Selection alone does not stale child | Parent requires fresh review/republish and eligible primary child. |
| Primary/gallery media metadata or binary change | Primary parent stale; gallery parent token unchanged | Affected child stale | Primary suppresses parent; gallery omitted independently. |

### 7.4 UMKM routes and public data

English routes are:

- `/en/local-businesses` from `/umkm`;
- `/en/local-businesses/[slug]` from `/umkm/[slug]`.

Planned views are `published_english_umkms` and
`published_english_umkm_images`. Only approved translated business identity,
category, description, and address are used as English prose. Consent-safe
source contact/proper-name values may be shown as shared source data. A free-text
Indonesian category or address is never silently displayed on an English route.

## 8. Canonical fingerprint serialization

All domain SHA-256 helpers above use one shared byte serializer, but each domain
owns its marker and ordered field list. The serializer is frozen as follows:

1. Construct a compact UTF-8 JSON object whose first key is `version`, followed
   by the listed keys in exactly the documented order. Object-key sorting and
   PostgreSQL `jsonb::text` output are not used.
2. Normalize text by replacing CRLF with LF, replacing remaining CR with LF,
   then trimming only U+0009, U+000A, U+000B, U+000C, U+000D, and U+0020 at both
   edges. No Unicode normalization, transliteration, case folding, locale
   conversion, or internal-whitespace rewriting occurs.
3. Optional `NULL`, empty, and trim-only text serialize as JSON `null`. Required
   null/empty source values are invalid and fail closed. Missing optional keys
   are never omitted.
4. Arrays are non-null where the source schema declares them non-null. Empty
   arrays serialize as `[]`; element order and duplicates are preserved; every
   element must be nonblank after normalization. No sorting, deduplication, or
   locale mapping occurs. English arrays must preserve source cardinality/order.
5. `timestamptz` values serialize as canonical UTC instants. Numeric values use
   canonical PostgreSQL numeric text after rejecting non-finite values. UUIDs use
   lowercase canonical hyphenated text. Booleans use JSON booleans.
6. Required invalid legacy values cause the helper/public predicate to fail
   closed. No migration or view silently repairs content.
7. SHA-256 is over the exact UTF-8 bytes and returns the marker followed by a
   colon and 64 lowercase hexadecimal characters.

Fingerprints never include lifecycle fields, publication timestamps, audit
actors, client slugs, SEO URLs, sitemap state, production origin, or cache state.
The package strict token is the explicit aggregate-revision exception defined in
Section 5.2.

## 9. Database object inventory and ownership

### 9.1 Per-domain objects

Each domain migration creates the following typed objects. Names use the domain
prefix shown in the tables above; no polymorphic `source_type/source_id` table is
created.

| Domain | Parent table | Image table | Parent history | Image history | Public parent view | Public image view |
| --- | --- | --- | --- | --- | --- | --- |
| Cultural Events | `cultural_event_translations` | `cultural_event_image_translations` | `cultural_event_translation_review_events` | `cultural_event_image_translation_review_events` | `published_english_cultural_events` | `published_english_cultural_event_images` |
| Tourism Packages | `tourism_package_translations` | `tourism_package_image_translations` | `tourism_package_translation_review_events` | `tourism_package_image_translation_review_events` | `published_english_tourism_packages` | `published_english_tourism_package_images` |
| Homestays | `homestay_translations` | `homestay_image_translations` | `homestay_translation_review_events` | `homestay_image_translation_review_events` | `published_english_homestays` | `published_english_homestay_images` |
| UMKM | `umkm_translations` | `umkm_image_translations` | `umkm_translation_review_events` | `umkm_image_translation_review_events` | `published_english_umkms` | `published_english_umkm_images` |

Each parent translation table contains its exact domain fields plus:

`id`, source FK, `locale`, `translation_status`, `review_state`, captured source
revision/token(s), captured thumbnail token, translation fingerprint,
`contract_version`, `terminology_review_confirmed`, review/rejection/publication/
archive metadata, `edit_revision`, created/updated timestamps, and database-owned
audit actor FKs. Package parent rows also contain the captured strict source and
relationship tokens. Image tables contain `id`, source-image FK, `locale`,
`alt_text`, nullable `caption`, media/translation fingerprints, contract version,
terminology confirmation, lifecycle/review/publication metadata, edit revision,
timestamps, and audit actor FKs.

Review-event rows contain immutable prior/new lifecycle and review states,
database-derived actor, occurred timestamp, current source/media checkpoints,
translation fingerprint where applicable, event type, and reason where required.
They do not duplicate parent identity. Every source/image and event FK is
`ON DELETE RESTRICT`; no source, translation, or event hard-delete RPC exists.

### 9.2 RPC and helper inventory

For every domain and both parent/image families, create these exact RPC names:

- `<domain>_translation_admin_read`
- `<domain>_translation_review_history`
- `<domain>_translation_save_draft`
- `<domain>_translation_review`
- `<domain>_translation_reject`
- `<domain>_translation_publish`
- `<domain>_translation_republish`
- `<domain>_translation_archive`
- `<domain>_translation_unpublish`
- `<domain>_translation_restore`

The image equivalents use `<domain>_image_translation_` in the name. Every
mutation takes the expected `edit_revision`; review/publication takes no client
fingerprint or actor. Admin reads return source reference, English fields,
derived lifecycle/freshness/source-blocking state, checkpoints, and history-safe
data without exposing private table access.

Each migration also owns:

- database-owned source and image revision triggers;
- source-to-parent and source-image-to-child stale cascade helpers;
- current-primary and matching-thumbnail fail-closed helpers;
- the exact five domain fingerprint helpers (plus package relationship/source
  token helpers);
- relation-local append-only review-event guards;
- indexes for source FK/locale uniqueness, lifecycle/review queues, captured
  freshness tokens, image parent/order, and history `(translation_id,
  occurred_at desc)` lookups.

All helper/function/constraint/index/trigger/policy names are relation-local,
schema-qualified where PostgreSQL permits it, and must be audited for unique
names under PostgreSQL's 63-byte identifier limit before migration execution.
No two long names may rely on silent identifier truncation.

### 9.3 Ownership, RLS, grants, and security

| Object/category | Owner | Application access |
| --- | --- | --- |
| Source parent/image rows | Existing database owner and existing protected source/media RPC boundary | Preserve current Indonesian/admin RLS and generic media behavior. |
| Translation parent/image tables | Database owner | RLS enabled; no direct application table grants or allowing client policies. |
| Review-event tables | Database owner | RLS enabled; no direct SELECT/INSERT/UPDATE/DELETE grants; append-only lifecycle/media functions insert events. |
| Fingerprint/revision/cascade helpers and triggers | Database owner | `SECURITY DEFINER` only where cross-table authority requires it; fixed empty/`pg_catalog` search path; direct client EXECUTE revoked. |
| Admin read/history/lifecycle RPCs | Database owner | `authenticated` may invoke the named RPC boundary; each function verifies `auth.uid()` and `public.is_admin()`; anonymous callers are denied. |
| Public English views | Database owner | `anon` and `authenticated` receive SELECT only on explicit safe projections. |
| Storage objects | Existing `tourism-media` Storage owner and generic media RPC boundary | No new bucket/path contract; image translations never own binaries. |
| Admin React/forms | Application administrator workflow | UI is not an authority; it calls server actions/RPCs and displays DB-derived state. |

Private projection wrappers, fingerprint helpers, cascade helpers, and audit
tables must not become public oracles. Public clients receive only the approved
view allowlists. `SECURITY DEFINER` functions schema-qualify dependencies and
derive actors from `auth.uid()`; no client-supplied actor UUID is trusted.

## 10. Migration and rollback strategy

### 10.1 Migration choice

Use one migration per domain, executed in rollout order:

1. `<timestamp>_cultural_event_bilingual_database.sql`
2. `<timestamp>_tourism_package_bilingual_database.sql`
3. `<timestamp>_homestay_bilingual_database.sql`
4. `<timestamp>_umkm_bilingual_database.sql`

The timestamp prefix is generated by the migration tool and is not an
architectural decision. The one-domain-per-migration choice is frozen because:

- event schedule semantics, package aggregate revision, homestay pricing, and
  UMKM consent/reachability have different freshness contracts;
- a failed pgTAP suite must not leave three unrelated domains coupled to the
  same rollback;
- reviewers can approve exact tables, views, grants, and media compatibility per
  domain;
- public route adoption can be stopped after one complete vertical;
- rollback can remove one domain's new views/RPCs/tables without dropping an
  unrelated translation family.

### 10.2 Execution order inside each migration

1. Run a read-only legacy validation/reporting step for invalid source/media
   relationships. It must be deterministic, private, non-destructive, and
   fail-closed; it never repairs, fabricates actors, or publishes content.
2. Add/backfill database-owned source/image revision metadata without changing
   existing Indonesian eligibility.
3. Install typed translation and append-only history tables with restrictive
   FKs, checks, unique keys, and indexes.
4. Install canonical fingerprint helpers, revision triggers, source/media
   cascades, primary-image helpers, and append-only guards.
5. Install admin read/history/lifecycle RPCs with actor and expected-revision
   checks.
6. Install column-limited English parent/image views and only their public SELECT
   grants.
7. Validate generic media RPC compatibility, identifier lengths, grants, and
   fail-closed legacy cases in pgTAP before application adoption.

Migration rollback is non-destructive after any data exists: revoke English view
grants and route exposure, retain drafts/history/content/media, and return the
application to the prior Indonesian-safe projections. A pre-adoption schema
rollback may remove empty domain objects in dependency order only after checking
that no rows exist. External Storage objects are never claimed to be recreated by
database rollback.

## 11. Administrator workflow freeze

### 11.1 UI architecture

Each vertical extends its existing protected Indonesian edit page with a clearly
separate English translation workspace, following the completed Destination and
Traditional House patterns. No separate public-facing translation route is
needed. Existing source forms and media galleries remain intact.

Each workspace contains:

- a read-only Indonesian source reference and trusted source slug/revision;
- empty-by-default English fields;
- database-derived Draft, Awaiting review, Reviewed, Published, Stale,
  Rejected, Archived, and Source blocked presentation;
- source-empty guidance that prevents invented optional content;
- a separate English parent editor and image metadata editor;
- review history and stale/source-blocking reason from the admin RPC;
- save draft, submit review, reject, publish, republish, archive, unpublish, and
  restore actions according to the database state machine;
- administrator-only server actions with no client actor IDs, fingerprints, or
  authoritative slugs.

The initial package workspace has no English itinerary-note inputs. It displays
the source itinerary as a read-only structural reference and explains that
English publication requires every destination relation to have a current
eligible Destination projection.

### 11.2 Feature modules and routes

Planned parent/image feature modules are:

| Domain | Parent module | Image module | Existing admin integration |
| --- | --- | --- | --- |
| Cultural Events | `features/cultural-event-translation/` | `features/cultural-event-image-translation/` | `app/admin/acara-budaya/[id]/edit/page.tsx` |
| Tourism Packages | `features/tourism-package-translation/` | `features/tourism-package-image-translation/` | `app/admin/paket-wisata/[id]/edit/page.tsx` |
| Homestays | `features/homestay-translation/` | `features/homestay-image-translation/` | `app/admin/homestay/[id]/edit/page.tsx` |
| UMKM | `features/umkm-translation/` | `features/umkm-image-translation/` | `app/admin/umkm/[id]/edit/page.tsx` |

Each module contains `model.ts`, `data.ts`, `actions.ts`, and a form component
named for the domain. Image forms remain metadata-only. Existing source actions,
source validation, generic media actions, and Storage code are not copied into
translation modules.

### 11.3 Action-to-RPC mapping

| UI intent | Database operation | Required authority |
| --- | --- | --- |
| Draft English translation | `<domain>_translation_save_draft` | Admin, expected parent `edit_revision` |
| Submit parent review | `<domain>_translation_review` | Admin, current source token, terminology confirmation |
| Reject parent | `<domain>_translation_reject` | Admin, nonblank reason |
| Publish first time | `<domain>_translation_publish` | Admin, reviewed/current, no prior publication |
| Republish | `<domain>_translation_republish` | Admin, reviewed/current, prior publication history |
| Archive/unpublish/restore parent | Corresponding parent RPC | Admin, expected revision; restore never publishes |
| Draft/review/reject/publish/republish/archive/unpublish/restore image metadata | Corresponding image RPC | Admin, trusted source-image state and expected image revision |

No action writes a translation table directly. A failed authorization must
produce no privileged read, mutation RPC, or revalidation. A failed database
mutation produces no success revalidation. Revalidation occurs only after the
mutation RPC returns success and uses a server/database-derived current slug.

## 12. Public English route and metadata contract

The frozen page/source matrix is:

| English route | Indonesian source route | Source entity | English source |
| --- | --- | --- | --- |
| `/en/cultural-events` | `/acara-budaya` | `cultural_events` + `cultural_event_images` | `published_english_cultural_events` and eligible image view |
| `/en/cultural-events/[slug]` | `/acara-budaya/[slug]` | One cultural event and its images | Same fail-closed views; source slug only |
| `/en/tourism-packages` | `/paket-wisata` | `tourism_packages`, `package_destinations`, contributing Destinations, and package images | `published_english_tourism_packages` plus safe relationship/image projections |
| `/en/tourism-packages/[slug]` | `/paket-wisata/[slug]` | One package aggregate and all eligible itinerary relations | Same views; source slug only |
| `/en/homestays` | `/homestay` | `homestays` + `homestay_images` | `published_english_homestays` and eligible image view |
| `/en/homestays/[slug]` | `/homestay/[slug]` | One homestay and its images | Same fail-closed views; source slug only |
| `/en/local-businesses` | `/umkm` | `umkms` + `umkm_images` | `published_english_umkms` and eligible image view |
| `/en/local-businesses/[slug]` | `/umkm/[slug]` | One UMKM and its images | Same fail-closed views; source slug only |

Public loaders use only the domain's English views and the existing published
media signer. They never query parent source tables, translation tables, admin
RPCs, or service-role clients. A list omits individually ineligible entities and
shows an English empty state when none are eligible. A database error remains a
technical error. A detail row that is missing, stale, source-blocked, archived,
or incomplete returns controlled `notFound()`/noindex behavior.

English static labels, breadcrumbs, cards, date/price/unit labels, empty states,
and error states come from approved English dictionaries or domain-reviewed
translation fields. Shared components receive explicit localized copy and
explicit `href`; they do not know the locale or synthesize route prefixes.

SEO ownership is separate from content eligibility:

- domain English translation fields own approved descriptive content;
- the shared Phase 3C metadata layer owns title/description composition and
  localized Open Graph/Twitter values;
- the route owns the current source-slug path and noindex/not-found result;
- Phase 3C owns canonical origin, alternates, hreflang, sitemap, robots, and
  reciprocal dynamic switching;
- no SEO failure can make an otherwise content-eligible database row become an
  Indonesian fallback or a translated row appear when its content predicate is
  false.

## 13. Cache invalidation freeze

### 13.1 Source mutations

For each domain's successful source mutation that can affect English content,
freshness, source eligibility, media identity, or route identity, the server:

1. reads the trusted pre-mutation source slug/owner state;
2. completes the source mutation through the existing trusted action/RPC;
3. invalidates the English collection and trusted old detail path immediately
   after confirmed success;
4. reads the trusted resulting source row; if it succeeds and the slug changed,
   invalidates the trusted new/current detail path;
5. preserves existing Indonesian/admin revalidation.

It never uses a hidden/form-submitted slug as cache authority. Create success
always invalidates the collection even when a post-write read fails. Failed
mutations produce no success revalidation.

### 13.2 Media mutations

For `media_insert`, `media_update`, `media_replace`, `media_set_primary`,
`media_reorder`, and `media_delete`, only the trusted database owner mapping
determines the domain and slug. A successful mutation for a Cultural Event,
Package, Homestay, or UMKM invalidates that domain's English collection and
trusted detail path. It does not invalidate unrelated English domains. Existing
Destination and Traditional House invalidation remains intact.

The affected detail path is invalidated after the media mutation succeeds, even
when the target image is later absent from a trusted refresh. If the refresh
returns a changed trusted slug, both old and new paths are invalidated. Storage
cleanup is unchanged and is never performed by translation actions.

### 13.3 Translation mutations

Every successful parent/image translation lifecycle operation revalidates its
admin edit route. Public collection/detail routes are revalidated when the row
was public, is being withdrawn, or can affect a required primary image; using the
trusted current slug is safe for all successful operations. A source/media
mutation and a translation mutation never broaden invalidation to all `/en`
routes or the whole site.

## 14. Test and evidence freeze

### 14.1 Database suites

Reserve these suites, executed after existing suites `001` through `017`:

| Suite | Domain | Minimum behavioral coverage |
| --- | --- | --- |
| `018_cultural_event_bilingual_database.test.sql` | Cultural Events | Exact fields/markers/null rules, WITA schedule, date-note blocking, consent, lifecycle/history, RLS/grants, expected revisions, source/media stale cascades, primary/gallery independence, public views, no fallback, restrictive FKs. |
| `019_tourism_package_bilingual_database.test.sql` | Tourism Packages | Aggregate revision and relationship-note staleness, relation ordering/membership, every-related-Destination eligibility, price/duration neutrality, lifecycle/history, media/primary/gallery behavior, public all-or-nothing itinerary, RLS/grants, no fallback. |
| `020_homestay_bilingual_database.test.sql` | Homestays | Source/translation arrays, price/price-note semantics, consent/contact gates, no capacity behavior, lifecycle/history, media stale matrix, primary/gallery independence, public views, no fallback, restrictive FKs. |
| `021_umkm_bilingual_database.test.sql` | UMKM | Business/category/address contracts, proper-name/contact policy, consent/reachability, no price/capacity semantics, lifecycle/history, media stale matrix, primary/gallery independence, public views, no fallback, restrictive FKs. |

Every suite must prove runtime behavior, not only object existence. It must
assert anonymous/authenticated direct-table denial, admin actor derivation,
exact marker literals, source-empty caption/null branches, duplicate/invalid
primary fail-closed behavior, stale republish rejection, fresh review/republish,
and generic media compatibility for non-domain entities.

### 14.2 Application and route tests

For each domain add focused parent/image translation action tests and list/detail
English route tests. They must prove:

- `requireAdministrator()` exactly once before any privileged read/mutation;
- authorization failure yields zero reads, mutations, and revalidation;
- actions use only approved RPC names and expected revisions;
- source-empty invented English is rejected through the real action body with zero
  mutation RPCs;
- no direct source/translation table read occurs in English loaders or actions;
- lifecycle state and stale warnings are database-derived;
- cultural terminology confirmation is required at the review RPC boundary;
- image actions never call generic media or Storage mutation methods;
- revalidation follows successful mutation, never precedes it, and uses trusted
  old/current slug values;
- source archive/unpublish, stale, primary-image failure, and missing
  translation are fail-closed with no Indonesian fallback;
- source errors are not treated as empty success;
- optional gallery children fail independently while primary failure suppresses
  the parent;
- Indonesian admin/public/source behavior remains unchanged.

Existing source tests to extend are:

- `tests/cultural-events.test.mjs`
- `tests/tourism-packages.test.mjs`
- `tests/homestays.test.mjs`
- `tests/umkm.test.mjs`
- `tests/media.test.mjs`

New or focused public/admin suites should be named consistently with the
completed verticals, for example:

- `tests/cultural-event-translation.test.mjs`
- `tests/cultural-event-image-translation.test.mjs`
- `tests/public-cultural-events-en.test.mjs`
- `tests/public-cultural-event-detail-en.test.mjs`
- corresponding `tourism-package`, `homestay`, and `umkm` parent/image/public
  suites.

Metadata tests must prove safe English title/description, localized static copy,
no Indonesian fallback, no signed media URL in metadata, noindex for unavailable
detail data, and no Phase 3C canonical/hreflang/sitemap behavior before that
phase is approved.

### 14.3 Shared regression evidence

The full database suite, `npm.cmd run check`, `git diff --check`, focused source,
media, admin, public, and metadata tests are required for each vertical. The
existing Destination and Traditional House suites must remain green. Package
implementation must also preserve existing transactional package tests and all
generic media tests for unrelated entities.

## 15. Safe reuse without risky abstraction

Reuse:

- `public.publication_status`, `public.is_admin()`, and the existing administrator
  auth helper;
- the typed per-domain source models/data loaders and current admin forms;
- the existing generic media RPCs, Storage path/claim/cleanup behavior, and
  published-media signer;
- the database fingerprint serializer byte contract, only as a serializer;
- the lifecycle/RLS/grant/event patterns proven by Destination and Traditional
  House;
- explicit-copy shared public components and the route manifest;
- existing cache/revalidation helpers with domain-specific trusted owner/slug
  resolution.

Do not introduce:

- a generic polymorphic translation table;
- dynamic table-name lifecycle RPCs;
- a client-side freshness or publication algorithm;
- a shared JSON translation payload;
- duplicate localized source tables;
- a new role hierarchy;
- a translation-owned Storage path or binary upload flow;
- a generic cache invalidation of all English routes;
- package itinerary notes as Indonesian fallback content.

Typed domain RPC wrappers may share internal implementation conventions, but
their table names, fields, fingerprints, eligibility predicates, and pgTAP
contracts remain domain-specific and auditable.

## 16. Execution roadmap

The following is the implementation order. It is a frozen execution roadmap, not
an invitation to reopen architectural choices.

### 16.1 Shared prerequisite and Phase 3C boundary

The approved shared locale/SEO phase remains separate from domain database work.
It may be implemented before or after a vertical only when the rollout gates
authorize it. It owns reciprocal language switching, canonical URLs, production
origin, alternates/hreflang, sitemap, robots/indexability, shared metadata, and
shared locale dictionaries. It does not own domain translation lifecycle or
database eligibility.

### 16.2 Phase 3E — Cultural Events

1. Review the frozen event field/fingerprint/schedule/consent matrix.
2. Apply one event migration and run suite `018` plus generic media regression.
3. Implement parent/image RPC-backed admin workspace in the existing event edit
   page.
4. Add English views, loaders, list/detail routes, explicit localized copy, and
   trusted source/media cache invalidation.
5. Run source, admin, public, metadata, accessibility, and Indonesian regression
   evidence. Stop if any event or generic media invariant fails.

### 16.3 Phase 3F — Tourism Packages

1. Review the strict aggregate/relationship revision and all-or-nothing itinerary
   contract.
2. Apply one package migration and run suite `019`, existing package transactional
   suites, and generic media regression.
3. Integrate parent/image translation workspace without bypassing transactional
   package source RPCs. Do not add an English relation-note editor.
4. Add English package views/loaders/routes that join only eligible English
   Destination projections and omit relation notes.
5. Add trusted package source/media/translation revalidation and test old/new
   source slugs, hidden destination relations, and price/duration behavior.

### 16.4 Phase 3G — Homestays

1. Review the price/price-note/facilities/consent matrix and no-capacity boundary.
2. Apply one homestay migration and run suite `020` plus media regression.
3. Add parent/image admin workspace while preserving source/contact editor.
4. Add English views/loaders/routes and trusted source/media/translation cache
   invalidation.
5. Test consent changes, shared contact values, price freshness, primary/gallery
   behavior, no availability invention, and Indonesian regression.

### 16.5 Phase 3H — UMKM/local businesses

1. Review the free-text category, proper-name, consent, and reachability matrix.
2. Apply one UMKM migration and run suite `021` plus media regression.
3. Add parent/image admin workspace with human-reviewed proper-name policy.
4. Add English `/en/local-businesses` routes and safe translated projections.
5. Test source contact/reachability gates, no translated contact-label invention,
   no price/capacity behavior, trusted cache invalidation, and Indonesian
   regression.

### 16.6 Phase 3I and later shared composition

After the four verticals are independently complete, the English Tourism Map and
Contact compositions may consume their eligible projections under their own
approved scope. No duplicate map/contact translation table is created.

English homepage integration, if authorized, consumes eligible domain projections
and omits untranslated items; it does not create a homepage content table.
Shared bilingual search/indexing remains a future technical gate until its source
projection and privacy contract is approved.

3K is a future search/readiness gate, not an approved implementation phase.
3L is a production/pre-production authorization and validation gate, not an
approved implementation phase. Neither gate grants migration, deployment, or
content-publication authority.

## 17. Completion criteria

### 17.1 A vertical is complete only when

- its dedicated migration is reviewed and local reset succeeds;
- its numbered pgTAP suite passes with runtime behavioral assertions;
- all parent/image translation access is RPC-only and administrator-authorized;
- exact marker, normalization, null, array, schedule/price/contact/relationship,
  and stale matrices are covered;
- public English list/detail loaders use only fail-closed views and signed
  translated media;
- primary-image and optional-gallery behavior is proven;
- source/archive/unpublish/restore and stale republish behavior is proven;
- source and media mutations invalidate only the correct English collection/detail
  paths using trusted slugs and failure-safe ordering;
- no Indonesian fallback exists in body, metadata, UI labels, images, package
  stops, or relation notes;
- existing Indonesian/admin/generic-media behavior remains green;
- `npm.cmd run check` and `git diff --check` pass;
- accessibility, desktop, and 390-pixel browser smoke evidence is available when
  the implementation phase reaches its merge gate.

### 17.2 Bilingual v1 pre-production gate

Before any pre-production or production action, all four verticals must have
complete evidence, a reviewed route matrix, an approved content/terminology
owner, safe rollback documentation, and a production validation plan. English
content remains unpublished until explicit content-publication authorization.

## 18. Technical decisions and operational gates

### 18.1 Remaining technical decisions

None. The following are resolved by this freeze:

- dedicated typed tables rather than generic/JSON storage;
- one migration per domain;
- exact parent/image field sets;
- package strict aggregate and relationship revision;
- package relation-note omission for the initial launch;
- source-slug routes and no redirects/English slugs;
- exact domain markers and ordered fields;
- source-empty/null and array rules;
- primary-image blocking and gallery independence;
- source archive/unpublish/restore semantics;
- admin-only RPC boundaries and database-owned actors;
- trusted domain-scoped cache invalidation;
- no capacity/availability/booking/commerce behavior;
- Phase 3C ownership of shared SEO/locale work;
- 3K/3L as future gates rather than approved implementation phases.

### 18.2 Operational gates, not planning blockers

These gates must be satisfied before the corresponding action, but do not reopen
the technical contract:

- Version 1.0/full bilingual scope approval remains pending under the rollout
  plan.
- Each domain needs an identified English content/terminology owner and reviewer.
- Human review is required for cultural terms, proper names, contact/privacy
  decisions, event terminology, package labels, and preserved local wording.
- Migration execution, merge, deployment, hosted access, database mutation, and
  public content publication each require their own authorization.
- Production origin and shared SEO policy require Phase 3C approval.
- Pre-production and production post-action validation must be ready before the
  corresponding production action.

No operational gate authorizes invented translations, machine translation,
Indonesian fallback, direct table writes, hosted Supabase access, or production
publication by itself.

## 19. Master freeze recommendation

**MASTER FREEZE READY** for stakeholder approval and subsequent domain-by-domain
implementation. No technical design decision remains open for Cultural Events,
Tourism Packages, Homestays, or UMKM/local businesses. Implementation remains
subject to the separate scope, content, migration, merge, deployment, and
publication authorization gates above.
