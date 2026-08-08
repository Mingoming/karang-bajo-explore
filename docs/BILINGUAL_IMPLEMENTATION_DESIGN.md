# Bilingual Implementation Design

Status: Phase 3B.1 technical architecture review

This document turns the approved Phase 3A bilingual public rollout contract into an
implementation design. It is a review artifact, not an implementation plan that
authorizes code, migration, deployment, publication, or production work.

## 1. Purpose and decision boundary

The reviewed inputs are:

- docs/BILINGUAL_PUBLIC_ROLLOUT_PLAN.md
- docs/MVP_RELEASE_SCOPE.md
- docs/ROADMAP.md
- the current application, Supabase migrations, RLS policies, storage workflow,
  admin workflow, and English Village Profile pilot

The current product decision remains pending explicit Version 1.0 stakeholder
approval. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: that approval
does not change the destination database contract. Phase 3A is documentation-only, and this Phase 3B.1 review does not
grant implementation authorization or production authorization.

This design does not create migrations, write SQL, modify application code,
modify package files, access Supabase, or introduce a fallback from English to
Indonesian. Any later implementation must be separately reviewed against the
Phase 3A gates.

The architectural recommendations are:

1. Use Option C, the hybrid translation approach: dedicated translation tables
   for database-backed public content and code or dictionary translations for
   neutral interface text.
2. Use strict row revision for Village Profile and the package aggregate,
   including package-destination relationships. Use a translation-relevant
   fingerprint for domains whose contracts exclude operational edits from
   English freshness.
3. Treat Reviewed as a persisted review checkpoint and Stale as a derived
   freshness result around the existing draft, published, and archived source
   lifecycle. Public projections remain fail-closed.

## 2. Current architecture inventory

### 2.1 Public routes and locale surface

The application uses the Next.js App Router with Indonesian routes as the
current public surface. English currently has only the homepage and the Village
Profile pilot.

| Content area | Current Indonesian route | Current English route | Phase 3A English target |
| --- | --- | --- | --- |
| Homepage | / | /en | /en |
| Village Profile | /profil-desa | /en/village-profile | /en/village-profile |
| Destinations | /destinasi and /destinasi/[slug] | None | /en/destinations and /en/destinations/[slug] |
| Traditional Houses | /rumah-adat and /rumah-adat/[slug] | None | /en/traditional-houses and /en/traditional-houses/[slug] |
| Cultural Events | /acara-budaya and /acara-budaya/[slug] | None | /en/cultural-events and /en/cultural-events/[slug] |
| Tour Packages | /paket-wisata and /paket-wisata/[slug] | None | /en/tour-packages and /en/tour-packages/[slug] |
| Homestays | /homestay and /homestay/[slug] | None | /en/homestays and /en/homestays/[slug] |
| Local businesses | /umkm and /umkm/[slug] | None | /en/local-businesses and /en/local-businesses/[slug] |
| Tourism map | /peta-wisata | None | /en/tourism-map |
| Contact | /kontak | None | /en/contact |

The English catch-all route is a not-found boundary, not a translated
content route. Locale selection, route mapping, navigation, dictionaries,
metadata helpers, and the language switcher are already represented by the
existing i18n and public-route modules. There is no general-purpose English
content loader or translator role today.

### 2.2 Common source, publication, and security model

The source schema uses the public publication status values draft, published,
and archived. Source rows also carry published_at, created_at, updated_at,
created_by, and updated_by as applicable. Source publication checks are enforced
by database constraints or triggers for required descriptions, thumbnails,
coordinates, consent, reachability, and event dates.

Base content tables are closed to anonymous and ordinary authenticated table
access. RLS policies permit the protected administrator to manage source rows.
Public access is provided through explicit published views rather than direct
base-table access. The views are security barriers with fixed projections and
exclude audit and private workflow fields. Related views generally require
published parents; package relationships require both the package and linked
destination to be published.

The private app_config table and public.is_admin() function currently support
one protected administrator. There is no separate reviewer, translator, or
publisher role hierarchy. A later role change must preserve the current
fail-closed public boundary.

### 2.3 Public entity and table inventory

The following is the current public content inventory. It includes source
tables, supporting relation and media tables, and the corresponding published
projections.

| Public entity | Current source table | Current publication projection | Relationships | Media |
| --- | --- | --- | --- | --- |
| Village Profile | village_profiles | published_village_profiles | One source profile | No dedicated image child table |
| Destination category | destination_categories | Direct public-readable fixed rows | Parent of destinations | None |
| Destination | destinations | published_destinations | Belongs to one category | destination_images |
| Destination image | destination_images | published_destination_images | Belongs to one destination | Storage object |
| Tourism package | tourism_packages | published_tourism_packages | Many-to-many with destinations | package_images |
| Package destination | package_destinations | published_package_destinations | Joins packages and destinations | None |
| Package image | package_images | published_package_images | Belongs to one package | Storage object |
| Homestay | homestays | published_homestays | Standalone public entity | homestay_images |
| Homestay image | homestay_images | published_homestay_images | Belongs to one homestay | Storage object |
| UMKM/local business | umkms | published_umkms | Standalone public entity | umkm_images |
| UMKM image | umkm_images | published_umkm_images | Belongs to one UMKM | Storage object |
| Traditional house | traditional_houses | published_traditional_houses | Standalone public entity | traditional_house_images |
| Traditional house image | traditional_house_images | published_traditional_house_images | Belongs to one house | Storage object |
| Cultural article | cultural_articles | published_cultural_articles | Standalone article entity | cultural_article_images |
| Cultural article image | cultural_article_images | published_cultural_article_images | Belongs to one article | Storage object |
| Customary institution article | customary_institution_articles | published_customary_institution_articles | Standalone article entity | customary_institution_article_images |
| Customary institution article image | customary_institution_article_images | published_customary_institution_article_images | Belongs to one article | Storage object |
| Cultural event | cultural_events | published_cultural_events | Standalone event entity | cultural_event_images |
| Cultural event image | cultural_event_images | published_cultural_event_images | Belongs to one event | Storage object |
| Gallery item | gallery_items | published_gallery_items | Standalone media item | Storage object |
| Contact entry | contacts | published_contacts | Standalone contact item | None |
| Public site setting | site_settings | public_site_settings | Key/value configuration | None |

The article, customary institution, and gallery entities have database
projections but no current public route in the reviewed application. They are
therefore inventory items and future design inputs, not implicit additions to
the Phase 3A route scope.

The source foreign keys use domain-specific relationships. Destination and
package image tables point to their owning entity. Package destinations point
to both a package and a destination, with uniqueness preventing duplicate
pairs. Image storage references are unique within their source image tables.
Source slugs are unique within their respective entities.

### 2.4 Publication projections and media

The existing published views expose explicit columns and exclude creator,
editor, consent, and other operational fields. Public site settings are
limited to rows marked public. Contacts expose sensitive values only when
consent permits it. The event projection also requires a usable start date.

The storage bucket is tourism-media. Storage object policies and the media RPC
layer restrict administration to the protected administrator. The supported
media workflow uploads, replaces, reorders, selects a primary item, and
deletes with compensation for storage failures. Public loaders validate the
trusted bucket and path, then create short-lived signed URLs; signed URLs are
not persisted as content metadata.

The public media configuration currently covers destinations, tourism
packages, homestays, UMKM, traditional houses, and cultural events. Public
loaders query published views, attach validated media, and fail closed on data
errors. The map loader combines published destinations, homestays, UMKM, and
traditional houses and groups valid coordinates.

The Phase 3A media contract requires approved English alt text for every
informative image rendered in English. Decorative images may remain without
descriptive alt text according to the final domain contract. Indonesian alt
text must not silently become English alt text.

### 2.5 Admin and publication workflow

Admin routes currently cover the profile, destinations, homestays, houses,
UMKM, events, packages, contacts, settings, and media. Forms trim and
validate source data, enforce domain-specific publication prerequisites, and
currently revalidate the affected admin paths after source or media mutation.
The existing destination and media actions do not uniformly revalidate the
current public Indonesian routes; that behavior remains an application
adoption task and is not claimed as an existing implementation capability.

The source workflow is currently draft, published, or archived. Publication
operations are domain-aware: coordinates, thumbnails, contact consent,
reachability, event dates, and package relationships are checked before a
source row can be public. Package relationship mutations use a transaction
aware operation. Media changes are handled separately through the protected
media workflow.

There is no existing translation reviewer queue or explicit translation
approval role. The design below therefore treats the current administrator as
the initial reviewer and publisher, while keeping the workflow separable for a
future least-privilege role model.

### 2.6 Current English Village Profile implementation

The Village Profile pilot is the existing reference implementation for
translation lifecycle and public safety.

The village_profile_translations table has one English row per source profile.
It stores translated name, summary, description, history, vision, mission, and
address fields; draft, published, and archived status; the source updated time
captured at publication; published_at; audit timestamps; and audit actors. The
source and locale pair is unique and indexed with status.

Database enforcement creates drafts, protects source and locale identity,
restricts lifecycle transitions, re-reads the source at publish time, requires
the source to be published, requires translated fields, and captures the
source revision at publication. Security-definer RPCs provide save-draft,
publish, archive, and restore operations only to the administrator.

The published_english_village_profiles view joins a published source to an
English published translation and requires the captured source timestamp to
match the current source updated time. The English loader reads only that
projection, returns a controlled not-found outcome when no eligible row
exists, and raises on data errors. The route and metadata path never falls
back to Indonesian. Admin form support is embedded beside the Indonesian
source form, and existing tests cover lifecycle, grants, stale suppression,
safe projection, no-fallback behavior, and route handling.

### 2.7 English page-to-source matrix

The following matrix is the authoritative translation-source map for the
English surface. A page may use shared dictionaries and source-neutral values,
but it may not use Indonesian prose as an English source. “Single source” means
one primary source entity; related images, categories, and publication
relationships are still checked as supporting data.

| English route | Indonesian source route | Source entity | Translation scope and notes |
| --- | --- | --- | --- |
| Home `/en` | `/` | `village_profiles` plus active domain entities | Scope: eligible Village Profile and domain projections plus locale dictionaries. Notes: derived page; omit ineligible items individually. |
| Village Profile `/en/village-profile` | `/profil-desa` | `village_profiles` | Scope: `village_profile_translations`. Notes: single source; not-found when the primary source is not eligible. |
| Destination list `/en/destinations` | `/destinasi` | `destinations`, `destination_categories`, and `destination_images` | Scope: eligible `destination_translations`, category, and media projections. Notes: derived list; omit ineligible destinations individually. |
| Destination detail `/en/destinations/[slug]` | `/destinasi/[slug]` | `destinations`, `destination_categories`, and `destination_images` | Scope: one `destination_translation` plus category, relationship, and media projections. Notes: single source with supporting data; not-found when the destination is not eligible. |
| Package list `/en/tour-packages` | `/paket-wisata` | `tourism_packages`, `package_destinations`, and contributing `destinations` | Scope: eligible package translations and package aggregate relationship projections. Notes: derived list; omit ineligible packages individually. |
| Package detail `/en/tour-packages/[slug]` | `/paket-wisata/[slug]` | `tourism_packages`, `package_destinations`, and contributing `destinations` | Scope: one package translation plus eligible destination, relation-note, and media projections. Notes: single source with supporting data; relation eligibility remains required. |
| Homestay list `/en/homestays` | `/homestay` | `homestays` and `homestay_images` | Scope: eligible homestay translations and media projections. Notes: derived list; omit ineligible homestays individually. |
| Homestay detail `/en/homestays/[slug]` | `/homestay/[slug]` | `homestays` and `homestay_images` | Scope: one homestay translation plus eligible media and shared source values. Notes: single source with supporting data. |
| `/en/traditional-houses` | `/rumah-adat` | `traditional_houses` and `traditional_house_images` | Scope: eligible `traditional_house_translations` and image projections. Notes: derived list; omit ineligible houses individually. |
| `/en/traditional-houses/[slug]` | `/rumah-adat/[slug]` | `traditional_houses` and `traditional_house_images` | Scope: one `traditional_house_translation` plus eligible image projections. Notes: single source with supporting data; not-found when the house is not eligible. |
| `/en/cultural-events` | `/acara-budaya` | `cultural_events` and `cultural_event_images` | Scope: eligible `cultural_event_translations` and image projections. Notes: derived list; source dates remain authoritative. |
| `/en/cultural-events/[slug]` | `/acara-budaya/[slug]` | `cultural_events` and `cultural_event_images` | Scope: one `cultural_event_translation` plus eligible image projections. Notes: single source with supporting data; source dates remain authoritative. |
| `/en/local-businesses` | `/umkm` | `umkms` and `umkm_images` | Scope: eligible `umkm_translations` and media projections. Notes: derived list; consent and neutral contact values remain source-controlled. |
| `/en/local-businesses/[slug]` | `/umkm/[slug]` | `umkms` and `umkm_images` | Scope: one `umkm_translation` plus eligible media and shared source values. Notes: single source with supporting data; consent and neutral contact values remain source-controlled. |
| Tourism map `/en/tourism-map` | `/peta-wisata` | `destinations`, `homestays`, `umkms`, and `traditional_houses` | Scope: eligible contributing domain translations and map display dictionaries. Notes: derived page; coordinates and URLs come from shared source data. |
| Contact `/en/contact` | `/kontak` | `contacts` | Scope: `contact_translations` only for approved localized labels/descriptions. Notes: phone, URL, type, and consent come from source data. |
| Metadata for any English route | Matching Indonesian source route | Current page source entity plus route manifest | Scope: the page’s eligible translation source plus dictionaries and route manifest. Notes: derived surface; metadata cannot create eligibility. |
| Navigation and language switcher | Shared route manifest and dictionaries | No content entity | Scope: locale dictionaries and approved route pairs. Notes: shared data; no translated entity row. |
| Breadcrumbs | Shared route manifest plus current entity | Current page source entity plus route manifest | Scope: dictionaries for fixed labels and the eligible translated title/name. Notes: derived surface. |
| English 404 and controlled not-found states | No Indonesian content route | No content entity | Scope: locale dictionary and route contract only. Notes: shared data; never a source-content fallback. |

Deferred article, customary-institution, and gallery routes have no English
page source in this rollout because they are not active routes. Any future
route must add a row to this matrix before implementation.

## 3. Translation strategy comparison

### Option A: one translation table per entity

This option creates a typed translation table for each translatable source
entity, such as destination_translations and homestay_translations, with
separate child tables for translated image metadata where needed.

Advantages:

- Each translation has a real foreign key to its source entity.
- Domain-specific translated fields, constraints, indexes, and publication
  checks remain explicit.
- Queries and published views resemble the existing Village Profile pilot.
- RLS and reviewer permissions can be expressed without a polymorphic source
  reference.

Disadvantages:

- Each new content domain requires a table, view, policy, and workflow change.
- Shared lifecycle behavior can drift if it is copied without a common
  contract.
- Many tables can increase migration and test surface.

Migration complexity is medium to high because every rich domain needs its own
schema and projection. Query complexity is low to medium because joins are
typed and predictable. Maintenance cost is medium to high because repeated
domain artifacts need shared conventions and regression tests. Future
scalability is strong for a finite set of rich content domains, but awkward
for arbitrary user-defined entity types or neutral interface strings.

### Option B: one generic translation table

This option stores all translations in one table keyed by a locale, a generic
entity type, and a source identifier, with translated values held in common
columns or a flexible payload.

Advantages:

- A small initial table footprint can support many entity types.
- Common locale and lifecycle queries appear uniform.
- Adding a new entity can avoid a new physical translation table.

Disadvantages:

- A generic source identifier cannot provide a normal foreign key to every
  source table.
- Entity-specific required fields, uniqueness rules, media links, and
  publication checks become application conventions.
- RLS must reason about a polymorphic source and is easier to misconfigure.
- Public queries need type branches, payload extraction, or broad joins.
- A single malformed row can complicate fail-closed behavior and debugging.

Migration complexity may look low for the first table but is high when
backfilling, validating, indexing, and constraining every domain. Query
complexity is high for public list, detail, metadata, and media projections.
Maintenance cost is high because schema guarantees move into shared code and
tests. Future scalability is broad in entity count but weak in relational
integrity, typed evolution, and operational clarity. This option is rejected
for this repository.

### Option C: hybrid approach

This option uses dedicated translation tables for rich, repeatable,
database-backed public content and code or dictionary translations for neutral
interface text. It does not introduce a generic polymorphic translation table.
Fixed destination category labels, route labels, navigation, control text,
empty states, and other interface strings remain in the locale dictionary.
Source values such as telephone numbers, URLs, coordinates, prices, and
availability data remain source data unless the domain contract explicitly
requires a localized presentation.

Advantages:

- Rich entities retain real foreign keys, typed fields, and domain-specific
  publication rules.
- Neutral strings do not acquire unnecessary database workflow or translation
  rows.
- Existing English Village Profile patterns can be reused for each content
  family.
- The database grows in proportion to actual translated content rather than
  every interface label.
- Each domain can select strict or fingerprint freshness without weakening
  relational integrity.

Disadvantages:

- Developers must decide whether a string is content or interface copy.
- The application has two translation sources: database rows and dictionaries.
- Cross-domain navigation and metadata need a disciplined locale contract.
- Each rich entity still requires dedicated schema, views, policies, and tests.

Migration complexity is medium: rich domains need dedicated tables, while
neutral surfaces need no data migration. Query complexity is low to medium:
public content uses typed joins and neutral text uses the existing dictionary
loader. Maintenance cost is medium and can be controlled with shared review
contracts, fixtures, and domain checklists. Future scalability is strong for
the known tourism domains and remains safe if later domains follow the same
typed-table rule.

### Recommendation

Recommend exactly Option C, the hybrid approach. Its database portion uses the
dedicated-table discipline of Option A for rich entities, while its neutral
portion avoids storing translations that do not belong to public content
records. Option B is rejected because the loss of foreign keys and typed
publication guarantees conflicts with the existing RLS and fail-closed
architecture.

## 4. Source revision strategy

### 4.1 Strategies

Strict row revision treats every source row update as a new revision. A
published translation records the source revision or source updated time that
was reviewed. Any later source update makes the translation ineligible until it
is reviewed and explicitly republished. This is the safest default where
relationships or aggregate meaning are difficult to classify.

A translation-relevant fingerprint canonicalizes only the source fields that
affect the English presentation, then records that fingerprint at translation
publication. An update to an operational or locale-neutral field does not
make English stale unless the domain contract includes that field in the
fingerprint. A change to a translated field, a visible relationship, a
publication prerequisite, or a field that changes the English presentation
does make the translation stale.

Both strategies must suppress public eligibility after archive, unpublish, or
removal of a source. A fingerprint is not permission to serve a translation
against an unpublished source. Source freshness and optimistic concurrency are
separate concerns: a form revision prevents lost writes, while the captured
revision or fingerprint determines translation freshness.

### 4.2 Domain revision contracts

The destination contract below is normative for Phase 3B. The remaining rows
are the approved strategy boundary for later phases; they do not create
additional Phase 3B tables or implementation work.

| Domain | Normative strategy | Revision scope | Reason |
| --- | --- | --- | --- |
| Village Profile | Strict row revision | The complete source row | The existing pilot already uses updated_at capture, and the profile is a small integrated narrative |
| Destination categories | Dictionary, no content revision | Fixed labels and filter terms | The three category labels are controlled interface vocabulary, not independently published records |
| Destinations | Translation-relevant fingerprint | The exact v1 destination fields in Section 13.2, plus the separate thumbnail media token | The destination page has typed narrative fields and shared visitor/location presentation; the exact set is fixed for Phase 3B |
| Traditional houses | Translation-relevant fingerprint | English-rendered identity, narrative, cultural significance, visitor information, and contracted visible fields | Separates descriptive content from operational maintenance |
| Cultural events | Translation-relevant fingerprint | Title, description, event classification, timing, location, organizer or visitor information, and contracted visible fields | An event schedule or location change is presentation-relevant; unrelated operational maintenance need not be |
| Tourism packages | Strict row plus relationship revision | Package row and package-destination membership, order, and notes | The aggregate meaning changes when included destinations or their order changes, making strict invalidation easier to audit |
| Homestays | Translation-relevant fingerprint | Name, description, location presentation, facilities, price presentation, and contracted visitor fields | Keeps operational contact maintenance from forcing a new narrative review unless it affects the English contract |
| UMKM/local businesses | Translation-relevant fingerprint | Business identity, description, category, location presentation, reachability presentation, and contracted visitor fields | Distinguishes business-content edits from routine contact maintenance |
| Contacts | Translation-relevant fingerprint if database-backed | Label, description, and any localized display text; values, URLs, and types remain source data | Contact records mix neutral values with potentially translatable labels |
| Map and homepage | Inherit source-domain freshness | The readiness of contributing domain rows and their translated projections | These are derived compositions, not independent source content |
| Cultural/customary articles | Fingerprint when activated | Article narrative and contracted visible metadata | They are currently outside the active route scope |
| Gallery items | Fingerprint for localized metadata; image alt metadata follows media policy | Title, caption, category label, and approved English alt text | Gallery is inventory-only today and must not be activated implicitly |

The destination fingerprint contract is defined in Section 13.3 and is the
only fingerprint contract implemented in Phase 3B. Its field ordering, null
representation, whitespace handling, number serialization, array ordering, and
version are fixed there. A future domain may not reuse the destination
fingerprint by implication; its own field set must be documented before that
domain is implemented. A fingerprint version change makes affected
translations stale.

## 5. Publication workflow

### 5.1 Normative state model

This is the single authoritative lifecycle interpretation for new Phase 3B
destination translated domains. It uses the existing source publication values
and adds explicit translation review metadata; it does not create competing
meanings for Reviewed, Stale, or Republished.

Source persistence has exactly these values:

- draft: editable Indonesian source that is not publicly eligible;
- published: Indonesian source that satisfies its source publication contract;
  and
- archived: retained source that is not publicly eligible.

Unpublished is an action, not a fourth stored source value. In the current
implementation it is the action published -> archived; a direct
published -> draft source transition is disallowed. Restore after archive is
the action archived -> draft. A later source publication is a separate
draft -> published action and never republishes English automatically.

Translation persistence has two fields with one derived freshness result:

- translation_status: draft, published, or archived;
- review_state: pending, reviewed, or rejected; and
- freshness: derived as current or stale by the algorithm in Section 13.3,
  never stored as an authoritative publication status.

The logical translation states are therefore deterministic:

- Draft = translation_status=draft, review_state=pending;
- Reviewed = translation_status=draft, review_state=reviewed, with the
  current source token captured at review;
- Published = translation_status=published, review_state=reviewed, and
  freshness=current while the source is published;
- Stale = translation_status=published but freshness=stale; this is derived
  and immediately ineligible;
- Rejected = translation_status=draft, review_state=rejected, with an
  auditable reason and actor;
- Archived = translation_status=archived, never publicly eligible; and
- Republished = the publication event that moves a reviewed translation to
  translation_status=published with a new publication timestamp and token.

The Village Profile pilot is an explicit compatibility exception. Its existing
`status`, `source_updated_at_at_publish`, `published_at`, and RPC behavior
remain authoritative. It has no full Phase 3B `review_state`/Reviewed/Rejected
workflow or typed review-event history, and Phase 3B does not retrofit those
objects or change the pilot scope. The lifecycle below is authoritative for
new destination translation rows only; the pilot continues to use its existing
draft, published, archived, and timestamp-match rules.

### 5.2 Normative state machine

Each transition has one named mutation, one actor rule, and one result. For
Phase 3B, translation base tables are RPC-only. The protected administrator
identified by `private.app_config.administrator_user_id` is the editor,
reviewer, publisher, and content owner. `public.is_admin()` and `auth.uid()`
are the only role checks.

| Transition | Allowed mutation and actor | Result, revision, and publication effect |
| --- | --- | --- |
| Create translation | `destination_translation_save_draft`, protected administrator, source may be draft, published, or archived | Insert `draft/pending`; `edit_revision=1`; no review or publication metadata; never eligible |
| Draft/pending -> draft/pending | `destination_translation_save_draft`, protected administrator, expected `edit_revision` must match | Replace English fields; clear current review/rejection metadata; increment `edit_revision`; no publication |
| Rejected -> draft/pending | `destination_translation_save_draft`, protected administrator, expected `edit_revision` must match | Replace rejected content; clear `review_state=rejected`, `rejected_at`, and current `review_reason`; increment `edit_revision`; remains non-public |
| Reviewed -> draft/pending | `destination_translation_save_draft`, protected administrator, expected `edit_revision` must match | Editing a reviewed translation withdraws the review; clear reviewed token and reviewer metadata; increment `edit_revision`; no publication |
| Published/current or published/stale -> draft/pending | `destination_translation_save_draft`, protected administrator, expected `edit_revision` must match | Editing an English publication unpublishes it before changing content; clear current review token; retain historical `published_at`; increment `edit_revision`; no public eligibility |
| Draft/pending -> reviewed | `destination_translation_review`, protected administrator acting as reviewer; source must be published and the current source/media tokens must be computed inside the RPC | Set `review_state=reviewed`, capture source revision, source fingerprint, thumbnail media fingerprint, and English translation fingerprint; set `reviewed_at` and `reviewed_by`; increment `edit_revision`; remains non-public |
| Draft/pending -> rejected | `destination_translation_reject`, protected administrator acting as reviewer; nonblank reason required | Set `review_state=rejected`; set `rejected_at`, `rejected_by`, current `review_reason`, and audit event; clear reviewed metadata; increment `edit_revision`; remains non-public |
| Reviewed -> rejected | `destination_translation_reject`, protected administrator acting as reviewer; nonblank reason required | Same rejected result and append-only audit event; increment `edit_revision`; remains non-public |
| Reviewed -> published | `destination_translation_publish`, protected administrator acting as publisher; all Section 13.3 checks run in one transaction | Set `translation_status=published`; set new `published_at` and `published_by`; clear `archived_at`; capture current tokens and fingerprint; increment `edit_revision`; eligible only when the predicate is true |
| Reviewed after a prior publication -> published | `destination_translation_republish`, protected administrator acting as publisher; all Section 13.3 checks run in one transaction | Same state as publish with a new `published_at`, `published_by`, reviewed checkpoint, and tokens; old publication is not restored |
| Published -> published/stale | `private.destination_translation_source_cascade()` after a translation-relevant source update, or the existing media RPC transaction after a media-content update | `translation_status` remains `published`; freshness becomes derived `stale`; public eligibility becomes false; no client mutation is needed |
| Reviewed -> draft/pending after a source fingerprint change | `private.destination_translation_source_cascade()` in the source transaction | Invalidate the review, clear reviewed metadata, append a source-change event, and increment `edit_revision`; no publication |
| Published or stale -> draft/pending by unpublish | `destination_translation_unpublish`, protected administrator acting as publisher | Clear current review checkpoint, retain historical `published_at`, set pending, increment `edit_revision`; public eligibility ends immediately |
| Any active translation -> archived | `destination_translation_archive`, protected administrator acting as publisher | Set `translation_status=archived`, set `archived_at`, increment `edit_revision`; public eligibility ends immediately |
| Archived -> draft/pending | `destination_translation_restore`, protected administrator acting as publisher | Set `translation_status=draft`, `review_state=pending`, clear `archived_at` and current review metadata, increment `edit_revision`; never publish automatically |
| Source draft -> published | Existing source lifecycle operation under the protected administrator | Source becomes published; translations remain in their current non-published state; no English publication occurs automatically |
| Source published -> archived (source unpublish) | Existing source lifecycle operation under the protected administrator; `private.destination_translation_source_cascade()` runs through `destinations_translation_source_cascade_trigger` in the same transaction | Every translation follows the complete Section 5.2.2 matrix; all English eligibility ends |
| Source archived -> draft (source restore) | Existing source lifecycle operation under the protected administrator | Source becomes draft; translations remain non-published; no English publication occurs |
| Source fingerprint unchanged after a non-translation-relevant update | Existing source mutation under the protected administrator | Source revision increments and caches are invalidated; translation review and publication remain current if every other predicate remains true |
| Source fingerprint changed after a published translation | Existing source mutation under the protected administrator; cascade records the change | Published translation remains stored as `published` but is derived stale and ineligible until edited, reviewed, and republished |
| Media bytes, path, caption, or source alt changed | Existing `media_replace` or `media_update` transaction; supported byte replacement is upload-new-object followed by the trusted RPC | `binary_revision` increments once; a published child translation becomes derived stale, while a reviewed draft child loses its review and returns to draft/pending; parent thumbnail changes also increment `thumbnail_binary_revision` and block the parent when applicable |
| Media upload or deletion | Existing `media_insert` or `media_delete` transaction | New media starts at revision 1; deletion removes the source image only when no translation/audit FK blocks it; a parent thumbnail deletion follows the exact operation contract below and may block the parent; caches are invalidated |
| Media order or primary flag changed | Existing `media_reorder` or `media_set_primary` transaction | `binary_revision` does not increment; primary changes update the parent thumbnail revision and therefore can block the parent; order-only changes do not stale translations; affected public page and media caches are invalidated |

Direct `draft -> published`, `rejected -> published`, `stale -> published`,
`archived -> published`, `source published -> draft`, and `source archived ->
published` transitions are disallowed. A stale translation must pass through
save-draft or unpublish, review, and publish/republish. Editing a reviewed,
published, or stale translation always withdraws its current review before the
new content is stored.

`private.destination_translation_source_cascade()` is the single authoritative
source-to-translation cascade function, invoked only by the relation-local
`destinations_translation_source_cascade_trigger`. It runs in the same
database transaction as the destination source update, compares the old and
new destination fingerprint and source status, and applies the status and
review transitions above. A translation-relevant fingerprint change leaves a
published row stored as `published` but derived stale, changes a reviewed
non-published row to `draft/pending`, and leaves draft or rejected rows in
their current non-public state while recording `source_changed`. A source
archive or unpublish uses the complete Section 5.2.2 matrix. Source restore
does not promote or rewrite translations. The source mutation cannot commit
while its cascade or audit event fails.

Every review, publish, republish, archive, restore, unpublish, rejection, and
source-blocking cascade re-reads the source and relevant media rows under the
same transaction. A captured token mismatch aborts the requested publication
or review and leaves the translation non-public.

The row metadata rules are also fixed. Save-draft, review withdrawal,
unpublish, archive, restore, source blocking, and media blocking clear the
current review checkpoint (`reviewed_at`, `reviewed_by`, and captured tokens)
unless the operation is the review or publication that creates that
checkpoint. Rejection sets `rejected_at`, `rejected_by`, and a nonblank
`review_reason`; a later save, review, archive, or restore clears those current
rejection fields. Publish and republish set `published_at` and `published_by`
to the current event actor and retain those values as historical last-
publication metadata after edit or unpublish. `publish` is allowed only when
there is no prior `published_at`; `republish` is required whenever a prior
publication exists, including after stale, unpublish, archive, or restore.
The event actor remains the immutable history record even when current row
metadata is cleared.

Every counter and `edit_revision` is a positive `bigint`. The trusted database
operation fails closed when an increment would exceed the maximum value; it
never wraps. Counter changes are database-owned and cannot be supplied by a
client. A workflow RPC locks the source destination first, then the relevant
source image rows in ascending ID order, then the translation row, and finally
appends its event. The image workflow uses the same order for destination,
source image, image translation, and event. An expected `edit_revision` mismatch
aborts the transaction with no partial metadata or event change.

#### 5.2.1 Destination media operation contract

The following eight source-media cases are normative. “Source revision” means
`destinations.source_revision`; “thumbnail revision” means
`destinations.thumbnail_binary_revision`; “image revision” means
`destination_images.binary_revision`.

| Case | Source and media effect | Revision effect | Translation and eligibility effect |
| --- | --- | --- | --- |
| A. Add non-primary image | Insert one source image with a new object path; parent metadata remains unchanged except the existing media transaction's audit update | New image revision = 1; parent source revision increments once; thumbnail revision unchanged | No parent or existing image translation becomes stale; a new child translation is independently draft/pending; list/detail/media caches invalidate |
| B. Reorder non-primary images | Change only `display_order` and normalize the owning gallery | Image revision unchanged; parent source revision increments once; thumbnail revision unchanged | No retranslation; public ordering and media caches invalidate |
| C. Delete non-primary image | Delete the row only when no child translation or audit FK exists, return its old path, and clean the object through the claim-aware compensation flow after commit | Deleted row has no later revision; parent source revision increments once; thumbnail revision unchanged | No remaining translation becomes stale; delete fails atomically when a dependency exists; media caches invalidate |
| D. Change primary image | Set the new primary and copy its bucket/path to the parent thumbnail pair | Selected image revision unchanged; parent source revision and thumbnail revision each increment once | Parent translation becomes source-media-stale and ineligible until reviewed and republished; child image translations do not stale solely from primary selection; caches invalidate |
| E. Replace bytes or path of the current primary | Upload a new object, atomically replace the source image path, and synchronize the parent thumbnail pair | Image revision increments once; parent source revision and thumbnail revision each increment once | Affected child translation becomes stale; parent translation becomes source-media-stale; both require their own review/republish when present |
| F. Edit current-primary caption or source alt | Update source image metadata without changing the parent thumbnail path | Image revision increments once; parent source revision increments once; thumbnail revision unchanged | Affected child translation becomes stale; parent translation remains eligible because its own thumbnail token and English thumbnail alt are unchanged |
| G. Delete primary with fallback | Select the lowest-order remaining image as primary and synchronize the parent thumbnail pair | Deleted row has no later revision; parent source revision and thumbnail revision each increment once; fallback image revision unchanged | Parent translation becomes source-media-stale; fallback child translation does not stale solely from selection; caches invalidate |
| H. Delete primary without fallback | The transaction may clear the parent thumbnail pair only when the source is not published; a published source fails the existing thumbnail publication constraint and the delete rolls back | On a permitted draft/archived delete, parent source revision and thumbnail revision each increment once; no deleted-row revision exists | Parent is ineligible until a valid thumbnail is restored and English is reviewed/republished; no source or Storage deletion is reported after a failed transaction |

Gallery images are optional, but a required source thumbnail is not. The
operation that changes the selected thumbnail therefore affects parent
eligibility even when the gallery child itself is optional.

#### 5.2.2 Source archive/unpublish state matrix

For the existing source contract, source unpublish is the
`published -> archived` transition. Source archive and source unpublish use
the same cascade. The source lifecycle operation, the source cascade, and all
translation-row and event changes occur in one transaction. The cascade
processes every existing parent English translation, not only currently
published rows, and appends exactly one `source_blocked` event per row with a
nonblank reason and the current source revision and source/media tokens. It
does not mutate child image-translation rows; the parent public projection
blocks those children, and the image workflow retains responsibility for their
own state.

| Translation state when the source is archived or unpublished | Immediate translation state and metadata | Audit and public result | Source restoration and next required action |
| --- | --- | --- | --- |
| Draft/not reviewed (`draft/pending`) | Remains `draft/pending`; current review and rejection metadata are NULL; any historical publication metadata is retained | One `source_blocked` event with unchanged state; never eligible | Source restore lands in `draft`; publish the source, then complete review before English publication |
| Rejected (`draft/rejected`) | Becomes `draft/pending`; current rejection reason, timestamp, and actor are cleared; historical publication metadata is retained | One `source_blocked` event records the prior state and reason; never eligible | Source restore does not restore the rejection checkpoint; edit or resubmit, review, then publish or republish according to publication history |
| Reviewed (`draft/reviewed`) | Becomes `draft/pending`; reviewed timestamp, actor, and captured tokens are cleared; historical publication metadata is retained | One `source_blocked` event; no publication occurs | Source restore does not promote the row; source publication is followed by a new review and explicit publish or republish |
| Published fresh | Becomes `draft/pending`; current review metadata and captured tokens are cleared; `published_at` and `published_by` remain historical last-publication metadata | One `source_blocked` event; omitted from every English projection immediately | Source restore does not promote it; source publication, fresh review, and `republish` are required because `published_at` is non-NULL |
| Published stale | Becomes `draft/pending` rather than remaining derived stale; current review metadata and captured tokens are cleared; historical publication metadata remains | One `source_blocked` event; already-ineligible content remains omitted | Source restore does not promote it; source publication, fresh review, and `republish` are required |
| Archived | Remains `archived`; `archived_at` and historical publication metadata remain; no current review or rejection checkpoint is restored | One `source_blocked` event with unchanged state; remains omitted | Source restore does not restore the translation. Run translation restore to `draft/pending`, then review and use `publish` only when `published_at` is NULL or `republish` otherwise |

Restoring the source from `archived` to `draft` never promotes a translation and
does not clear the source-blocked history. Publishing the restored source is a
new source lifecycle event; every non-archived translation must pass review
against the current tokens before publication. `publish` is allowed only when
the translation has never had a publication (`published_at IS NULL`), while
`republish` is required whenever a historical `published_at` exists, including
after source blocking, stale suppression, unpublish, archive, or restore. The
latest successful event replaces `published_at`; the event table is the
complete history, so no separate `first_published_at` column is added.

The source cascade does not reset child image-translation rows. After the
parent is reviewed and published or republished, each child is independently
re-evaluated: a child whose media and English fingerprints still match may
become visible again, while a stale, archived, missing, or otherwise
ineligible child remains omitted. A child requires new review only when its own
media or English translation contract changed; source archive and restore alone
do not fabricate a child edit or review event.

### 5.3 Permissions and responsibility

The protected administrator is the only Phase 3B technical principal for
destination translations. `public.is_admin()` and `auth.uid()` are technical
authorization checks; they are not a fabricated database role hierarchy. The
same administrator may perform editor, reviewer, publisher, and content-owner
responsibilities, and every action records `auth.uid()` as the actor. A future
least-privilege role
model may split these responsibilities without changing the state machine.

At minimum:

- Anonymous users can read only safe published projections.
- Authenticated non-admin users receive no direct base-table or translation
  management access.
- A translation editor can save drafts only through the approved workflow.
- A reviewer verifies meaning, required fields, source revision, media alt
  text, links, and route metadata before marking Reviewed.
- A publisher performs or authorizes the explicit publication action.
- Database functions enforce the same checks as the UI.

### 5.4 Content publication eligibility

English content publication eligibility is independent of SEO configuration.
It MUST NOT depend on a canonical URL, production origin, sitemap, or
hreflang output.
Publication eligibility never depends on canonical URL, sitemap, hreflang, or
production origin.

For Phase 3B, the destination parent predicate is exactly:

`destination_eligible(d, t)` is true if and only if all of these are true:

1. `d.status = 'published'`.
2. `d.category_id` references one of the three existing fixed destination
   categories.
3. `d.latitude` and `d.longitude` are non-null and satisfy the existing
   coordinate checks.
4. `d.thumbnail_bucket` and `d.thumbnail_path` are both non-null and
   nonblank, `d.thumbnail_bucket = 'tourism-media'`, and exactly one
   `public.destination_images` row for `d.id` has
   `storage_bucket = d.thumbnail_bucket`, `storage_path = d.thumbnail_path`,
   and `is_primary = true`. A parent-only or mismatched legacy thumbnail
   reference therefore cannot satisfy the English predicate.
5. If `d.contact_name` or `d.contact_phone` is non-null, then
   `d.contact_consent_confirmed = true`.
6. `t.translation_status = 'published'`, `t.review_state = 'reviewed'`, and
   `t.destination_id = d.id`, `t.locale = 'en'`.
7. `t.name`, `t.summary`, `t.description`, and `t.thumbnail_alt_text` are
   nonblank.
8. If the corresponding source field is nonblank, `t.history`,
   `t.opening_hours`, and `t.price_note` are nonblank. If
   `d.facilities` is nonempty, `t.facilities` is nonempty, has the same
   cardinality, and every element is nonblank. An empty source array requires
   an empty English array.
9. `t.captured_source_fingerprint` equals the current v1 destination source
   fingerprint and `t.captured_thumbnail_media_fingerprint` equals the
   current v1 thumbnail media fingerprint. `t.captured_source_revision` is
   retained for audit and concurrency evidence but is not compared for
   destination freshness.
10. `t.translation_fingerprint` equals the fingerprint recomputed from the
    stored English fields.
11. The safe public projection can be read without an error.

For Phase 3B, a destination image child is independently eligible exactly when
the parent destination predicate is true, the source image belongs to that
destination, the child has `translation_status='published'` and
`review_state='reviewed'`, `alt_text` is nonblank, and
`captured_media_fingerprint` and `translation_fingerprint` equal their
current recomputed values. Destination gallery images are optional: a missing
or ineligible child is omitted and does not suppress the eligible destination
parent. The required source thumbnail is governed by the parent predicate and
uses `destination_translations.thumbnail_alt_text`; it never uses an
Indonesian alt-text fallback or a child translation's alt text.

The matching-child requirement is an English delivery contract, not a change
to the existing Indonesian route. The current Indonesian destination loader
reads the published child image projection and signs child image references;
the current Storage read policy likewise authorizes published child rows. The
database schema has only a pair check on the parent thumbnail fields and no FK
from that pair to a child image, so legacy/manual parent-only and mismatched
paths are real possible states. Phase 3B leaves those states intact for
Indonesian delivery but excludes them from English eligibility. Future English
delivery signs the matching child-owned object after the parent view predicate
has proven same-destination ownership; the parent translation supplies the
English thumbnail alt. No English route may sign a parent-only path merely
because its pair is nonblank.

The source status, archival status, source publication checks, translation
status, review state, required fields, relationship checks, and token
comparisons above are the complete Phase 3B content predicate. Canonical URL,
production origin, sitemap, and hreflang are not inputs.

If any condition is false, omit the item or return the controlled not-found
outcome defined by the route contract. Do not expose a draft, stale, archived,
partially translated, or Indonesian-fallback record. The predicate is the same
in development, pre-production, and production.

### 5.5 SEO and indexability eligibility

SEO eligibility is a downstream property of an already content-eligible
English route. It MAY depend on the following conditions:

- the route contract resolves the current English path;
- the environment has an approved canonical origin;
- the canonical URL is current and uses the source-owned slug;
- alternate and hreflang URLs resolve only to eligible locale routes;
- the route is permitted to be indexed; and
- sitemap generation has the approved route and last-modified timestamp.

If a canonical origin, alternate route, hreflang mapping, or sitemap entry is
not available, the content remains governed by Section 5.4. The SEO layer
must emit noindex, omit the sitemap entry, or omit incomplete alternates as
appropriate; it must not make a published English projection disappear or
use Indonesian as a substitute. Production origin approval is therefore a
production SEO gate, not a content-publication gate.

## 6. Database design proposal

This section describes a target schema without writing SQL. It is a design
proposal only; no table, view, policy, function, index, or migration is being
created by this document.

### 6.1 Translation table family

The existing village_profile_translations table remains the pilot reference.
Phase 3B adds only the destination translation family and the revision
metadata required by that family. No traditional-house, event, package,
homestay, UMKM, contact, article, customary-institution, or gallery translation
table is created in Phase 3B.

The existing public.destinations table is altered by adding exactly:

- source_revision bigint NOT NULL DEFAULT 1 CHECK (source_revision > 0);
- thumbnail_binary_revision bigint NOT NULL DEFAULT 1 CHECK
  (thumbnail_binary_revision > 0).

The existing public.destination_images table is altered by adding exactly:

- binary_revision bigint NOT NULL DEFAULT 1 CHECK (binary_revision > 0);
- updated_at timestamptz NULL DEFAULT statement_timestamp();
- updated_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT.

The sole source-counter authority is the database-owned function
`private.enforce_destination_source_revision()`, invoked by the relation-local
trigger object `destinations_source_revision_trigger` on
`public.destinations`. The function runs `BEFORE UPDATE FOR EACH ROW`, is
`SECURITY DEFINER`, is owned by the database owner, declares
`SET search_path = pg_catalog`, and has `EXECUTE` revoked from `PUBLIC`,
`anon`, and `authenticated`; only the trigger invokes it. It uses `OLD` and
`NEW`, rejects a client-supplied change to either counter, increments
`source_revision` exactly once for every committed destination-row update, and
increments `thumbnail_binary_revision` exactly once when the trusted
operation changes the parent thumbnail bucket/path or records a supported byte
replacement. It does not write translation or audit rows. A direct function
call is not a supported mutation path and fails the trigger-only guard; the
outer transaction rolls back. Existing destination rows start at
`source_revision=1` and `thumbnail_binary_revision=1`.

The sole destination-image revision authority is the database-owned function
`private.enforce_destination_image_revision()`, invoked by the relation-local
trigger object `destination_images_revision_trigger` on
`public.destination_images`. It runs `BEFORE INSERT OR UPDATE FOR EACH ROW`, is
`SECURITY DEFINER`, is owned by the database owner, declares
`SET search_path = pg_catalog`, and has `EXECUTE` revoked from `PUBLIC`,
`anon`, and `authenticated`. On INSERT it sets `binary_revision=1`; on UPDATE
it increments `binary_revision` exactly once when bucket, path, source caption,
or source alt changes. It sets `updated_at=statement_timestamp()` and
`updated_by=auth.uid()` for every trusted INSERT or UPDATE, preserves the
revision for display-order and primary-only changes, and rejects client
changes to the revision or actor fields. It uses `OLD` and `NEW`, does not
write event rows, and fails closed when `auth.uid()` is missing or a counter
would overflow. Existing image rows start at `binary_revision=1`;
`updated_at` is backfilled from truthful `created_at` and historical
`updated_by` remains NULL because the last editor cannot be derived. No UUID is
fabricated.

The existing generic `media_insert`, `media_update`, `media_replace`,
`media_set_primary`, `media_reorder`, and `media_delete` functions remain the
source-media operation names. The exact adaptation is Strategy A: replace the
destination branch inside each existing definition in place, preserve every
existing function signature and grant boundary, and preserve the five
non-destination mappings. No wrapper or second generic media API is added.
Database maintenance and backfill run before the trigger is enabled and are
not a business mutation path. Each destination branch keeps the existing
parent lock first, image locks in UUID order, path validation, primary/order
normalization, and returned-path compensation semantics, but collapses the
current nested parent writes into at most one parent-row UPDATE per successful
named operation.

The destination branch effects are exact:

| Existing RPC | Destination branch and revision behavior | Translation/audit behavior | Storage cleanup behavior |
| --- | --- | --- | --- |
| `media_insert` | Upload-new-object metadata is verified, then the child row is inserted. `destination_images_revision_trigger` fires on INSERT and sets `binary_revision=1`; there is no child media-cascade UPDATE trigger or child event for a new row. Every successful destination insert performs exactly one parent UPDATE: it writes the new thumbnail pair when the row is primary/first, otherwise only the existing parent audit fields. In-place ordering does not issue a second parent UPDATE. | No child translation is fabricated. A later child translation starts draft/pending; a parent translation is affected only when the parent thumbnail token changes. | The new object is registered only after the metadata transaction can see it. A failed metadata call compensates through the claim/lease cleanup flow below. |
| `media_update` | The child UPDATE may change source alt, caption, display order, or primary flag. The image revision trigger fires once for each affected row; `binary_revision` increments only for source alt/caption changes. Every successful destination update performs exactly one parent UPDATE: selected-primary, fallback-primary, or current-parent audit fields are written in that single statement; in-place ordering does not issue a second parent UPDATE. | A source alt/caption change invokes the AFTER UPDATE image media cascade and one `media_changed` event per affected child translation. Primary-only and order-only updates invoke no child media event; a changed parent thumbnail invokes the source cascade. | No external object is replaced. |
| `media_replace` | The new object is uploaded first; the destination branch locks old and new path keys, verifies the new object, updates the child row once, and performs exactly one parent UPDATE: new selected thumbnail, deterministic fallback thumbnail, or audit-only parent update according to the existing primary result. The image revision trigger increments once for a path, source alt, or caption change; primary-only/order-only effects do not increment it. | A changed child media token invokes the image media cascade. A changed current-primary thumbnail invokes the source cascade and makes the parent media token stale. | The unchanged old path is returned. The caller claims and removes it only after commit; a failed metadata transaction claims and removes the new path. |
| `media_set_primary` | Lock the parent and selected images, update primary flags, copy the selected path to the parent, and perform one parent UPDATE. Child UPDATE revision triggers fire for primary flags but preserve `binary_revision`; the parent source and thumbnail revisions increment once. | No child media event is produced solely by selection. The parent source cascade records the parent effect when its thumbnail token changes. | No object is deleted. |
| `media_reorder` | Update only child `display_order` values, then perform the existing one parent audit/update write. Child UPDATE revision triggers preserve `binary_revision`; the parent source revision increments once and the thumbnail revision does not. | No child media event and no retranslation. Public ordering/cache dependents are invalidated. | No object is deleted. |
| `media_delete` | Lock the parent, child, and path key; enforce `ON DELETE RESTRICT` dependencies; delete the child row; normalize order and choose the deterministic fallback. A deleted row fires neither the image revision trigger nor the image media-cascade trigger because both are UPDATE/INSERT-only. A fallback or cleared parent thumbnail is one parent UPDATE and invokes the parent source triggers. | No deleted-row event is fabricated. Dependent translation or audit history blocks the delete atomically; otherwise only the parent fallback/source effect is recorded. | The old path is returned. The caller claims and removes it after commit; a failed transaction returns no cleanup authorization. |

The trigger distinction is normative: `destination_images_revision_trigger`
is `BEFORE INSERT OR UPDATE`, `destination_images_translation_media_cascade_trigger`
is `AFTER UPDATE` only, and `destinations_translation_source_cascade_trigger`
is `AFTER UPDATE` only. INSERT effects are RPC-explicit; UPDATE effects use
the named row triggers; DELETE effects use the `media_delete` RPC, foreign-key
restriction, fallback logic, and parent cascade. No contract says that every
media mutation fires an image UPDATE trigger or creates an image event.

#### 6.1.1 Trigger helper and trigger-object contract

The function name and the trigger-object name are different objects. Trigger
objects are relation-local names and are never schema-qualified. The following
contracts are normative:

- `private.enforce_destination_source_revision()` is the
  `SECURITY DEFINER`, database-owner, `SET search_path = pg_catalog` trigger
  function for `destinations_source_revision_trigger`. The trigger is on
  `public.destinations`, `BEFORE UPDATE FOR EACH ROW`, event `UPDATE`. It
  derives no actor and performs no cross-table writes. It owns only the two
  destination counters, rejects caller-supplied counter values, and aborts on
  overflow or any invalid `OLD`/`NEW` relationship. Direct `EXECUTE` is
  revoked from `PUBLIC`, `anon`, and `authenticated`; a direct invocation
  fails the trigger-only guard and cannot mutate a row.
- `private.enforce_destination_image_revision()` is the
  `SECURITY DEFINER`, database-owner, `SET search_path = pg_catalog` trigger
  function for `destination_images_revision_trigger`. The trigger is on
  `public.destination_images`, `BEFORE INSERT OR UPDATE FOR EACH ROW`, events
  `INSERT` and `UPDATE`. It owns only `binary_revision`, `updated_at`, and
  `updated_by`, derives the actor from `auth.uid()`, and rejects a missing
  actor, caller-supplied audit values, or overflow. Direct `EXECUTE` is
  revoked from `PUBLIC`, `anon`, and `authenticated`.
- `private.destination_translation_source_cascade()` is a
  `SECURITY DEFINER`, database-owner, `SET search_path = pg_catalog` trigger
  function for `destinations_translation_source_cascade_trigger`. The trigger
  is on `public.destinations`, `AFTER UPDATE FOR EACH ROW`, event `UPDATE`.
  It consumes `OLD` and `NEW` only after all existing source lifecycle and
  slug checks and the source-revision trigger accept the row. It derives
  `actor_id` from `auth.uid()`; it requires each affected parent row to have
  `destination_id = NEW.id` and `locale = 'en'`. A null actor, invalid
  destination relationship, unexpected locale, missing required source row, token-helper failure, event
  insert failure, or counter overflow raises an error and rolls back the
  complete source transaction. It locks the source destination, relevant
  source images in UUID order, parent English translations in ID order, and
  then inserts the typed event rows. Its only translation-table writes are to
  `public.destination_translations` and
  `public.destination_translation_review_events`; it never writes
  `public.destination_image_translations` or image-event rows. Source status
  changes use the Section 5.2.2 matrix; translation-relevant fingerprint
  changes invalidate affected parent checkpoints and append
  `source_changed`. A source archive or unpublish appends `source_blocked`
  for every existing parent translation, including unchanged draft, rejected,
  or archived rows, so the audit outcome is deterministic. A fingerprint-
  neutral update changes no translation state. Direct `EXECUTE` is revoked
  from `PUBLIC`, `anon`, and `authenticated`; direct calls fail the
  trigger-only guard and never perform a partial cascade.
- `private.destination_image_translation_media_cascade()` is a
  `SECURITY DEFINER`, database-owner, `SET search_path = pg_catalog` trigger
  function for `destination_images_translation_media_cascade_trigger`. The
  trigger is on `public.destination_images`, `AFTER UPDATE FOR EACH ROW`,
  event `UPDATE`. It compares `OLD` and `NEW` bucket, path, source caption,
  source alt, and the database-owned `binary_revision`. When the media token
  changes, it locks child image translations in ID order, derives the actor
  from `auth.uid()`, and writes only
  `public.destination_image_translations` and
  `public.destination_image_translation_review_events`. A published child
  remains stored as `published` but becomes derived stale; a reviewed
  non-published child becomes `draft/pending` with its current review metadata
  and captured token cleared; draft, rejected, and archived children remain
  non-public in their current state. Every affected child receives exactly one
  `media_changed` event. A primary-only or display-order-only update does not
  change the child media token and produces no child event; parent thumbnail
  eligibility is handled by the source cascade and parent thumbnail token.
  It validates that every child row has `destination_image_id = NEW.id` and
  that the source image remains attached to its destination before writing an
  event. A null actor, relationship mismatch, event failure, or token-helper
  failure raises and rolls back the media transaction. Direct `EXECUTE` is revoked
  from `PUBLIC`, `anon`, and `authenticated`; direct calls fail the
  trigger-only guard.
- `private.reject_destination_translation_review_event_mutation()` is a
  `SECURITY INVOKER` function owned by the database owner with
  `SET search_path = pg_catalog`. The relation-local trigger
  `destination_translation_review_events_append_only_trigger` targets
  `public.destination_translation_review_events` and runs `BEFORE UPDATE OR
  DELETE FOR EACH ROW`. It raises SQLSTATE `42501` for either operation and
  never returns a mutable row. `EXECUTE` is revoked from `PUBLIC`, `anon`, and
  `authenticated`; the trigger fires for all normal callers.
- `private.reject_destination_image_translation_review_event_mutation()` is a
  separate `SECURITY INVOKER` function owned by the database owner with
  `SET search_path = pg_catalog`. The relation-local trigger
  `destination_image_translation_review_events_append_only_trigger` targets
  `public.destination_image_translation_review_events` and runs `BEFORE
  UPDATE OR DELETE FOR EACH ROW`. It raises SQLSTATE `42501` for either
  operation and never returns a mutable row. `EXECUTE` is revoked from
  `PUBLIC`, `anon`, and `authenticated`; the trigger fires for all normal
  callers. The two trigger names are relation-local and are not interchangeable
  even though their enforcement contract is identical.

All six functions are invoked only in the transaction that owns their
mutation. No trigger is statement-level, and no trigger function accepts an
actor, revision, fingerprint, timestamp, or relationship from a client. The
function bodies use schema-qualified `public.*`, `private.*`, `auth.uid()`,
and `pg_catalog.*` references and do not depend on an ambient search path.
existing `private.set_updated_at()` and source lifecycle/slug trigger helpers
remain in their current relation-local trigger objects and continue to own
their existing fields; they are not source-counter, bilingual-cascade, or
audit authorities. A database-owner maintenance operation may disable or drop
a trigger during a controlled migration or rollback, but no deployed
application role has that authority and the design makes no absolute claim
against the database owner.

The following new tables are normative.

public.destination_translations has exactly these columns:

| Column | Type and nullability | Default | Constraint or meaning |
| --- | --- | --- | --- |
| id | uuid NOT NULL | extensions.gen_random_uuid() | Primary key |
| destination_id | uuid NOT NULL | None | Foreign key to destinations(id), ON DELETE RESTRICT |
| locale | text NOT NULL | 'en' | Check value is exactly en |
| name | text NOT NULL | None | Nonblank English identity |
| summary | text NOT NULL | None | Nonblank English summary |
| description | text NOT NULL | None | Nonblank English description |
| history | text | NULL | Required only when the source history is nonblank |
| opening_hours | text | NULL | Required only when the source value is nonblank |
| price_note | text | NULL | Required only when the source value is nonblank |
| facilities | text[] NOT NULL | '{}'::text[] | English elements preserve source order and cardinality |
| thumbnail_alt_text | text NOT NULL | None | Nonblank English alt text for the required source thumbnail |
| translation_status | public.publication_status NOT NULL | 'draft' | Draft, published, or archived |
| review_state | text NOT NULL | 'pending' | Check value is pending, reviewed, or rejected |
| captured_source_revision | bigint | NULL | Source revision observed at review/publication; positive when present |
| captured_source_fingerprint | text | NULL | Exact v1 source fingerprint observed at review/publication |
| captured_thumbnail_media_fingerprint | text | NULL | Exact v1 source-thumbnail fingerprint observed at review/publication |
| translation_fingerprint | text | NULL | Fingerprint of the stored English fields observed at review/publication |
| contract_version | text NOT NULL | 'destination-v1' | Check value is exactly destination-v1 |
| reviewed_at | timestamptz | NULL | Current review checkpoint |
| reviewed_by | uuid | NULL | Foreign key to auth.users(id), ON DELETE RESTRICT |
| review_reason | text | NULL | Current rejection reason only; full history is in the event table |
| rejected_at | timestamptz | NULL | Current rejection timestamp |
| rejected_by | uuid | NULL | Current rejection actor; foreign key to auth.users(id), ON DELETE RESTRICT |
| published_at | timestamptz | NULL | Most recent English publication or republish timestamp |
| published_by | uuid | NULL | Actor for the most recent English publication; foreign key to auth.users(id), ON DELETE RESTRICT |
| archived_at | timestamptz | NULL | Current translation-archive timestamp |
| edit_revision | bigint NOT NULL | 1 | Optimistic-concurrency value; positive |
| created_at | timestamptz NOT NULL | statement_timestamp() | Immutable creation instant |
| updated_at | timestamptz NOT NULL | statement_timestamp() | Last trusted mutation instant |
| created_by | uuid NOT NULL | None | Foreign key to auth.users(id), ON DELETE RESTRICT |
| updated_by | uuid NOT NULL | None | Foreign key to auth.users(id), ON DELETE RESTRICT |

destination_translations has the named unique constraint
destination_translations_source_locale_key on (destination_id, locale).
Its named checks are destination_translations_locale_check,
destination_translations_review_state_check,
destination_translations_content_check,
destination_translations_review_metadata_check,
destination_translations_rejection_metadata_check,
destination_translations_publication_metadata_check,
destination_translations_archive_metadata_check, and
destination_translations_edit_revision_check. They enforce, respectively:
the fixed locale; the three review states; nonblank required text and
nonblank facilities elements; reviewed metadata exactly when review_state is
reviewed; rejection reason, rejected_at, and rejected_by exactly when
review_state is rejected; all captured tokens, published_at, and published_by
when translation_status is published; archived_at when translation_status is
archived; and a positive edit revision. Rejected rows must have
translation_status=draft; archived rows must have review_state=pending and
must not retain a current review or rejection checkpoint; published rows must
have review_state=reviewed and must not have archived_at. Workflow transitions
are enforced by the named RPCs and source/media cascade operations, not by
client input.

public.destination_image_translations has exactly these columns:

| Column | Type and nullability | Default | Constraint or meaning |
| --- | --- | --- | --- |
| id | uuid NOT NULL | extensions.gen_random_uuid() | Primary key |
| destination_image_id | uuid NOT NULL | None | Foreign key to destination_images(id), ON DELETE RESTRICT |
| locale | text NOT NULL | 'en' | Check value is exactly en |
| alt_text | text NOT NULL | None | Nonblank English informative alt text |
| caption | text | NULL | English caption |
| translation_status | public.publication_status NOT NULL | 'draft' | Draft, published, or archived |
| review_state | text NOT NULL | 'pending' | Check value is pending, reviewed, or rejected |
| captured_media_fingerprint | text | NULL | Exact v1 source media fingerprint |
| translation_fingerprint | text | NULL | Fingerprint of the stored English media fields |
| contract_version | text NOT NULL | 'destination-media-v1' | Check value is exactly destination-media-v1 |
| reviewed_at | timestamptz | NULL | Current review checkpoint |
| reviewed_by | uuid | NULL | Foreign key to auth.users(id), ON DELETE RESTRICT |
| review_reason | text | NULL | Current rejection reason only |
| rejected_at | timestamptz | NULL | Current rejection timestamp |
| rejected_by | uuid | NULL | Current rejection actor; foreign key to auth.users(id), ON DELETE RESTRICT |
| published_at | timestamptz | NULL | Most recent English media publication timestamp |
| published_by | uuid | NULL | Actor for the most recent English media publication; foreign key to auth.users(id), ON DELETE RESTRICT |
| archived_at | timestamptz | NULL | Current media-translation archive timestamp |
| edit_revision | bigint NOT NULL | 1 | Optimistic-concurrency value; positive |
| created_at | timestamptz NOT NULL | statement_timestamp() | Immutable creation instant |
| updated_at | timestamptz NOT NULL | statement_timestamp() | Last trusted mutation instant |
| created_by | uuid NOT NULL | None | Foreign key to auth.users(id), ON DELETE RESTRICT |
| updated_by | uuid NOT NULL | None | Foreign key to auth.users(id), ON DELETE RESTRICT |

destination_image_translations has the named unique constraint
destination_image_translations_source_locale_key on
(destination_image_id, locale). Its named checks are
destination_image_translations_locale_check,
destination_image_translations_review_state_check,
destination_image_translations_content_check,
destination_image_translations_review_metadata_check,
destination_image_translations_rejection_metadata_check,
destination_image_translations_publication_metadata_check,
destination_image_translations_archive_metadata_check, and
destination_image_translations_edit_revision_check, with the same
semantics as the parent translation checks and with alt_text always required.
The rejection and publication checks include `rejected_by` and `published_by`
whenever their corresponding current timestamps are present. The image checks
apply the same draft/rejected, archived/pending, and published/reviewed state
requirements.

The two append-only audit tables are also Phase 3B tables. They preserve full
rejection and lifecycle history; the row-level review_reason fields retain
only the current rejection reason.

public.destination_translation_review_events has exactly:
id uuid NOT NULL DEFAULT extensions.gen_random_uuid() primary key;
destination_translation_id uuid NOT NULL referencing
destination_translations(id) ON DELETE RESTRICT; event_type text NOT NULL;
previous_translation_status public.publication_status NOT NULL;
new_translation_status public.publication_status NOT NULL;
previous_review_state text NOT NULL; new_review_state text NOT NULL;
actor_id uuid NOT NULL referencing auth.users(id) ON DELETE RESTRICT;
occurred_at timestamptz NOT NULL DEFAULT statement_timestamp();
source_revision bigint NOT NULL CHECK (source_revision > 0);
source_fingerprint text; thumbnail_media_fingerprint text;
translation_fingerprint text; and reason text. event_type is checked against
draft_saved, reviewed, rejected, published, republished, unpublished,
archived, restored, source_changed, and source_blocked. The event state columns are checked
against the same lifecycle values. A rejected or source-blocked event
requires a nonblank reason; every other event has a null reason. There are no
update or delete operations for this table.

public.destination_image_translation_review_events has exactly:
id uuid NOT NULL DEFAULT extensions.gen_random_uuid() primary key;
destination_image_translation_id uuid NOT NULL referencing
destination_image_translations(id) ON DELETE RESTRICT; event_type text NOT NULL;
previous_translation_status
public.publication_status NOT NULL; new_translation_status
public.publication_status NOT NULL; previous_review_state text NOT NULL;
new_review_state text NOT NULL; actor_id uuid NOT NULL referencing
auth.users(id) ON DELETE RESTRICT; occurred_at timestamptz NOT NULL DEFAULT
statement_timestamp(); binary_revision bigint NOT NULL CHECK (binary_revision
> 0); media_fingerprint text; translation_fingerprint text; and reason text.
Its event values are draft_saved, reviewed, rejected, published, republished,
unpublished, archived, restored, and media_changed; rejection requires a
nonblank reason and all other events require a null reason. There are no update
or delete operations for this table.

The audit event tables deliberately do not duplicate `destination_id` or
`destination_image_id`. The parent identity is derived through the immutable
translation foreign key and, for image events, through
`destination_image_translations.destination_image_id` and its parent image
foreign key. This removes a second source identity that could disagree with
the authoritative relationship.

Append-only enforcement is database-level. The relation-local trigger objects
`destination_translation_review_events_append_only_trigger` and
`destination_image_translation_review_events_append_only_trigger` run BEFORE
UPDATE OR DELETE FOR EACH ROW on their respective event tables and raise
SQLSTATE `42501` for every application caller. No UPDATE or DELETE privilege or
RPC exists. Lifecycle, source-cascade, and media-change SECURITY DEFINER
functions may INSERT only the event type and state pair they own. Their exact
trigger functions, owners, security modes, fixed search path, and revoked
direct execution are defined in Section 6.1.1. A controlled migration may use
database-owner maintenance privilege while installing or rolling back the
triggers, but deployed workflow functions have no bypass; this is not an
absolute claim against the database owner.

All four new tables use public.publication_status only for
translation_status; review states are constrained text because the existing
schema has no review enum. No generic source_type plus source_id translation
table is introduced.

### 6.2 Translated media metadata

Image binaries remain in the existing tourism-media storage model. Phase 3B
uses only the typed destination_image_translations child table defined in
Section 6.1. It references the exact source image row, uses the unique
source-image/locale key, and stores English alt text, optional English caption,
lifecycle metadata, review metadata, media fingerprint, and audit metadata.
It never copies storage_bucket or storage_path; the source image row remains
authoritative for binary identity and storage reference.

Missing English alt text suppresses the affected destination image. Destination
gallery images are optional in Phase 3B, so the parent destination remains
eligible. The required destination thumbnail uses
destination_translations.thumbnail_alt_text; it cannot use a source
Indonesian alt text. The current destination image schema has no decorative
flag, so every destination image child is treated as informative and requires
nonblank English alt text.

### 6.3 Package aggregate and relationships

Tourism packages require special treatment because their English meaning is
the package plus its ordered destination membership. The package translation
will be joined to:

- the published source package;
- the current published package-destination rows;
- published destination sources;
- eligible English destination translations;
- no relation-note translation in Phase 3B; relation-note localization is
  introduced only by the 3F package contract;
- eligible package image metadata.

The package revision strategy captures the package row and the
package-destination relationship revision as one aggregate revision. A
destination becoming archived, unpublished, stale, or otherwise ineligible
makes the affected package projection ineligible. Phase 3F has no alternate
reviewed representation unless a later document changes this rule.

### 6.4 Contact, category, map, and site-setting data

Destination categories remain fixed vocabulary and use the locale dictionary
rather than database translation rows. Navigation labels, route labels, map
controls, form messages, empty states, metadata templates, and other neutral
interface text also remain in dictionaries.

Contacts are outside Phase 3B. A later contact contract may use a typed contact
translation row for label and description, while phone values, URLs, contact
types, and consent decisions remain source data. No contact translation table
is created now.

The map has no independent source record. It composes translated identity and
description fields from eligible contributing entities while keeping
coordinates, URLs, and other operational values from the source projection.
The homepage likewise composes domain projections and dictionary text; it has
no independent translation row for a derived card.

Public site settings remain restricted to the existing public setting
projection. A setting that is interface copy belongs in dictionaries or a
future explicitly typed localized setting contract. An arbitrary JSON
translation payload is not introduced.

### 6.5 Keys, constraints, and indexes

The Phase 3B relational invariants are:

- destination_translations has exactly one row per destination and locale;
- destination_image_translations has exactly one row per destination image and
  locale;
- every translation and audit foreign key uses ON DELETE RESTRICT;
- a published translation requires the published source, required English
  fields, current fingerprints, and review metadata;
- a published image translation requires an eligible parent destination and
  current media metadata;
- public views use the exact predicates in Section 5.4 and never return
  archived, stale, unpublished, rejected, or incomplete rows;
- source slugs remain source-owned and unique; English routes use the source
  slug;
- locale is constrained to en;
- source identity, storage identity, and audit identity are never copied into
  translated content;
- every review and publication event captures the relevant source or media
  revision and fingerprint.

The exact Phase 3B indexes are:

| Index name | Table | Columns and order | Unique or predicate | Query need |
| --- | --- | --- | --- | --- |
| destination_translations_source_locale_key | destination_translations | destination_id ASC, locale ASC | UNIQUE constraint/index | Enforce one English row per destination and resolve the detail translation |
| destination_translations_public_lookup_idx | destination_translations | destination_id ASC, locale ASC | Non-unique partial index where translation_status = published and review_state = reviewed | Join eligible translation rows to destination list/detail projections |
| destination_translations_admin_queue_idx | destination_translations | review_state ASC, translation_status ASC, updated_at DESC | Non-unique | Load the embedded destination translation review queue |
| destination_image_translations_source_locale_key | destination_image_translations | destination_image_id ASC, locale ASC | UNIQUE constraint/index | Enforce one English row per source image and resolve image metadata |
| destination_image_translations_public_lookup_idx | destination_image_translations | destination_image_id ASC, locale ASC | Non-unique partial index where translation_status = published and review_state = reviewed | Join eligible English image metadata to source images |
| destination_translation_review_events_history_idx | destination_translation_review_events | destination_translation_id ASC, occurred_at DESC, id DESC | Non-unique | Load complete parent translation review and rejection history with deterministic ties |
| destination_image_translation_review_events_history_idx | destination_image_translation_review_events | destination_image_translation_id ASC, occurred_at DESC, id DESC | Non-unique | Load complete image translation review and rejection history with deterministic ties |

The existing destination source indexes remain in place:
destinations_category_idx, destinations_status_idx,
destinations_featured_idx, destinations_display_order_idx,
destinations_status_category_idx, destinations_status_display_order_idx,
destination_images_parent_idx, and destination_images_order_idx. No universal
cross-entity search index or speculative fingerprint index is part of Phase
3B. The two `(source_id, locale)` uniqueness constraints are the only unique
indexes introduced for translations; the lookup and history indexes are
non-unique and do not duplicate those constraints.

### 6.5.1 Relationship and delete matrix

Every Phase 3B foreign key is:

| Child table and column | Parent table and column | ON DELETE | ON UPDATE | Reason |
| --- | --- | --- | --- | --- |
| destinations.category_id | destination_categories.id | RESTRICT | NO ACTION | A category cannot be removed while a destination references it |
| destination_images.destination_id | destinations.id | RESTRICT | NO ACTION | Source media remains owned by its destination |
| destination_translations.destination_id | destinations.id | RESTRICT | NO ACTION | English translation cannot outlive its source |
| destination_translation_review_events.destination_translation_id | destination_translations.id | RESTRICT | NO ACTION | Audit history is append-only and retained |
| destination_image_translations.destination_image_id | destination_images.id | RESTRICT | NO ACTION | English media metadata cannot outlive source media |
| destination_image_translation_review_events.destination_image_translation_id | destination_image_translations.id | RESTRICT | NO ACTION | Media audit history is retained |
| All created_by, updated_by, reviewed_by, and actor_id columns | auth.users.id | RESTRICT | NO ACTION | Audit identity cannot be orphaned |

The event source identity is always derived through its translation foreign key;
there is no redundant event-level destination ID that can disagree with that
relationship. No ON UPDATE cascade exists because UUID source identities are
immutable. The trusted RPCs lock and verify the complete relationship before
inserting an event.

Hard-delete behavior is exact:

- A destination source row cannot be hard-deleted while any destination image,
  destination translation, package relation, or event reachable through a
  translation exists. Phase 3B exposes no destination hard-delete operation.
- A destination translation cannot be hard-deleted. Its retained review-event
  foreign key makes direct deletion fail; archive is the normal removal
  action.
- A destination image can be deleted only through media_delete and only when
  no image translation or event reachable through an image translation exists.
  The operation removes the source row and returns its old Storage path;
  claim-aware external cleanup follows only after commit. Deleting the row
  does not increment binary_revision.
- A destination image translation cannot be hard-deleted. Archive is the
  normal removal action.
- A review or rejection event cannot be updated or deleted. Retention is
  append-only for the Phase 3B design.
- Archive is reversible and preserves all relationships. It is the normal
  public-content removal mechanism; hard deletion is not a substitute for
  archive.

### 6.6 RLS, RPC, and published views

The existing security model is retained. public.is_admin() returns true only
when auth.uid() equals private.app_config.administrator_user_id. Phase 3B does
not add reviewer accounts, role tables, JWT claims, or a second authorization
system.

| Actor | Base-table SELECT | Base-table INSERT/UPDATE/DELETE | Workflow operations | RLS and identity rule |
| --- | --- | --- | --- | --- |
| Anonymous | No base-table access; SELECT only on safe published views | Denied | Denied | No authenticated identity; no base-table policy |
| Authenticated non-admin | No base-table access; SELECT only on safe published views | Denied | Denied | auth.uid() is non-null and public.is_admin() is false |
| Protected administrator as editor/content owner | No direct access to the four new workflow tables; read through admin RPCs | Denied directly; writes use RPCs | Save draft, review, reject, publish, republish, archive, unpublish, restore | auth.uid() is non-null and public.is_admin() is true |
| Protected administrator as approved reviewer | No direct access | Denied directly | Review and reject; the same identity may also save drafts | Same public.is_admin() check; role is a documented responsibility, not a new database role |
| Protected administrator as publisher | No direct access | Denied directly | Publish, republish, archive, unpublish, restore | Same public.is_admin() check; every operation records auth.uid() |

The table-level action rules are:

| Table | Anonymous SELECT | Authenticated non-admin SELECT | Protected administrator SELECT | INSERT/UPDATE/DELETE enforcement |
| --- | --- | --- | --- | --- |
| destinations | Denied; use published projections | Denied; use published projections | Existing policy USING public.is_admin() | Existing INSERT WITH CHECK requires public.is_admin(), draft status, created_by=auth.uid(), and updated_by=auth.uid(); existing UPDATE USING public.is_admin() and WITH CHECK requires public.is_admin() and updated_by=auth.uid(); DELETE is denied |
| destination_categories | Existing public SELECT policy | Existing public SELECT policy | Existing public SELECT policy | No Phase 3B mutation |
| destination_images | Denied; use published projections | Denied; use published projections | Existing protected-administrator direct base-table SELECT is retained for source-media administration and existing tests; public loaders use published projections | Direct INSERT, UPDATE, and DELETE remain denied; media_insert, media_update, media_replace, media_set_primary, media_reorder, and media_delete perform all writes and verify public.is_admin() |
| destination_translations | Denied; use published_english_destinations | Denied; use published_english_destinations | No direct table SELECT; use destination_translation_admin_read or review history RPCs | RLS is enabled with no allowing policy; direct INSERT, UPDATE, and DELETE are denied; workflow RPCs perform all writes |
| destination_image_translations | Denied; use published_english_destination_images | Denied; use published_english_destination_images | No direct table SELECT; use destination_image_translation_admin_read or review history RPCs | RLS is enabled with no allowing policy; direct INSERT, UPDATE, and DELETE are denied; image workflow RPCs perform all writes |
| destination_translation_review_events | Denied | Denied | No direct table SELECT; use destination_translation_review_history | RLS is enabled with no allowing policy; append-only workflow RPCs insert; UPDATE and DELETE are denied |
| destination_image_translation_review_events | Denied | Denied | No direct table SELECT; use destination_image_translation_review_history | RLS is enabled with no allowing policy; append-only image workflow/media RPCs insert; UPDATE and DELETE are denied |

The four new base tables have RLS enabled, no anonymous or authenticated
table grants, and no permissive table policies. Their SELECT, INSERT, UPDATE,
and DELETE operations are RPC-only. The admin read RPCs are
destination_translation_admin_read,
destination_image_translation_admin_read,
destination_translation_review_history, and
destination_image_translation_review_history. The workflow RPCs are
destination_translation_save_draft, destination_translation_review,
destination_translation_reject, destination_translation_publish,
destination_translation_republish, destination_translation_archive,
destination_translation_unpublish, and destination_translation_restore.
The image equivalents are destination_image_translation_save_draft,
destination_image_translation_review, destination_image_translation_reject,
destination_image_translation_publish,
destination_image_translation_republish,
destination_image_translation_archive,
destination_image_translation_unpublish, and
destination_image_translation_restore. They use the same actor, expected
edit_revision, review, rejection, publication, archive, unpublish, and restore
rules, with the image predicate and media fingerprint substituted for the
parent predicate.
Every RPC is SECURITY DEFINER, owned by the database owner, uses an empty
fixed search path with schema-qualified references, verifies auth.uid() and
public.is_admin(), and takes the expected edit_revision for mutations.
For the four new tables, the absence of an allowing policy means every
USING and WITH CHECK result is denied for direct callers; SECURITY DEFINER
RPCs are the only trusted execution path and perform their own actor,
relationship, lifecycle, expected-revision, and token checks.

The repository-derived Storage ownership inventory is complete below. The
helper audits every `Yes` row, including legacy parent-only thumbnail
references and the gallery thumbnail path. `site_settings.value` is not an
authoritative typed Storage reference and is intentionally excluded.

| Source relation | Column | Storage-backed? | Covered by helper? |
| --- | --- | --- | --- |
| `public.destinations` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.destination_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.tourism_packages` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.package_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.homestays` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.homestay_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.umkms` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.umkm_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.traditional_houses` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.traditional_house_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.cultural_articles` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.cultural_article_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.customary_institution_articles` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.customary_institution_article_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.cultural_events` | `thumbnail_bucket`, `thumbnail_path` | Yes | Yes |
| `public.cultural_event_images` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.gallery_items` | `storage_bucket`, `storage_path` | Yes | Yes |
| `public.gallery_items` | `thumbnail_path` (uses the row's `storage_bucket`; no separate thumbnail bucket exists) | Yes | Yes |
| `public.site_settings` | `value` | No; untyped setting data is not authoritative media ownership | Not applicable |

The repository audit found no Storage-backed path column in
`public.village_profiles`; `public.contacts.url` is an external contact URL,
not a Storage object reference. Those relations therefore have no helper
row. `public.site_settings.value` is listed explicitly because it is an
untyped setting field, but it is not an authoritative media ownership field.

The `tourism-media` bucket remains private. The exact Storage execution model
is a narrow authenticated-policy model, required by Supabase Storage RLS
semantics and the repository's existing `public.can_read_published_media`
convention. A Storage policy expression executes as the authenticated caller;
therefore a policy helper must be executable by `authenticated`, even when it
is `SECURITY DEFINER`. Granting no execution to that role would make the
policy fail closed for legitimate cleanup, while granting a broad data-reading
or mutation function would be unsafe.

The referenced-object helper is exactly
`private.tourism_media_object_is_unreferenced(p_bucket_id text,
p_object_name text) RETURNS boolean`. It is a SQL, `STABLE`, read-only,
`SECURITY DEFINER` function owned by the database owner, with
`SET search_path = ''`; every relation, column, and function dependency is
schema-qualified. It returns true only when no exact `(bucket,path)` pair in
the complete matrix above references the object. It returns only a boolean,
performs no mutation, exposes no rows or reference identities, and does not
call Storage. Its exact privileges are `REVOKE ALL` from `PUBLIC`, `anon`,
and `authenticated`, followed by `GRANT EXECUTE` to `authenticated`; there
is no general-purpose client data or mutation grant. The policy invocation is
the required direct call with `bucket_id` and `name` from the candidate
`storage.objects` row.

The bucket policy contract is split by operation:

- `INSERT` remains available only to `authenticated` callers passing the
  existing protected-administrator and validated source-media path checks.
  Anonymous and non-admin callers are denied.
- Direct `UPDATE` on `storage.objects` for `tourism-media` has no allowing
  policy for any application role. Same-path byte replacement is not a
  Phase 3B operation because PostgreSQL cannot observe external object bytes.
- Ordinary direct `DELETE` is removed. The only allowing policy is exactly:
  the bucket is `tourism-media`, `public.is_admin()` is true,
  `private.tourism_media_object_is_unreferenced(bucket_id, name)` is true,
  and `private.tourism_media_cleanup_claim_is_valid(bucket_id, name)` is
  true. Thus the DELETE policy explicitly evaluates the unreferenced helper;
  an administrator cannot delete an arbitrary object without a live,
  database-created cleanup claim.
- `SELECT` remains available to the protected administrator for source-media
  administration; anonymous and non-admin base-object reads remain denied.
  Public signed delivery remains governed by the existing published-source
  policy, and future English delivery uses only the eligible child-owned
  thumbnail contract in Section 13.8.

The replacement remains the relation-local `tourism_media_admin_delete`
policy on `storage.objects`, applies to `authenticated` DELETE evaluation,
and has no allowing `anon` policy. Its `USING` expression is exactly the
four-part condition above; there is no `WITH CHECK` clause for DELETE.

The cleanup claim is a database coordination object, not a general delete
API. `private.tourism_media_cleanup_claims` is owned by the database owner and
has exactly `(bucket_id text, object_name text, claim_token uuid,
state text, claimed_at timestamptz, expires_at timestamptz,
attempt_count bigint, last_error text)`; `(bucket_id, object_name)` is the
primary key. `state` is one of `active`, `deleting`, `failed`, or `expired`.
RLS is enabled on the table; it has no client table grants and no permissive
RLS policy. A claim lease is exactly five minutes; an expired claim cannot
authorize Storage DELETE.

The controlled cleanup RPCs are exact: `public.tourism_media_cleanup_claim(
p_bucket_id text, p_object_name text) RETURNS uuid`,
`public.tourism_media_cleanup_begin_delete(p_bucket_id text,
p_object_name text, p_claim_token uuid) RETURNS void`, and
`public.tourism_media_cleanup_finish(p_bucket_id text, p_object_name text,
p_claim_token uuid, p_deleted boolean, p_error text) RETURNS void`.
Each is `SECURITY DEFINER`, owned by the database owner, uses
`SET search_path = ''`, schema-qualifies all dependencies, verifies
`auth.uid()` and `public.is_admin()`, and has `EXECUTE` revoked from `PUBLIC`,
`anon`, and `authenticated` before a grant only to `authenticated` is
applied. The claim RPC locks the
exact object key, verifies the object exists in `storage.objects`, verifies
the unreferenced helper, and creates or reclaims one five-minute claim. The
begin RPC requires the matching token, a non-expired `active` claim, an
existing object, and a second unreferenced check, then changes the state to
`deleting`. The finish RPC requires the token; `p_deleted=true` is accepted
only when the Storage row is gone and removes the claim, while
`p_deleted=false` requires the object to remain, records `last_error`, marks
the claim `failed`, and makes it immediately retryable. A reaper may reclaim
only failed or expired claims through the same RPC; it cannot bypass the
unreferenced check.

`private.tourism_media_cleanup_claim_is_valid(p_bucket_id text,
p_object_name text) RETURNS boolean` is a `VOLATILE`, `SECURITY DEFINER`,
database-owner policy helper with `SET search_path = ''`. It acquires the
same transaction-scoped advisory lock used by metadata writers, verifies a
non-expired `deleting` claim, and rechecks
`private.tourism_media_object_is_unreferenced` while holding that lock. Its
direct `EXECUTE` privilege is revoked from `PUBLIC`, `anon`, and
`authenticated` before a grant only to `authenticated` is applied; it returns
only a boolean and performs no row mutation other than taking the
transaction-scoped lock. The advisory key is derived from the
exact bucket/path pair with
`pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
p_bucket_id || E'\\x01' || p_object_name, 0))`; hash collisions can serialize
unrelated objects but cannot authorize a wrong object.

Every trusted media RPC and every write boundary for every Storage reference
in the matrix acquires that same key before registering or changing a path,
verifies the object exists, and rejects an active or deleting claim. A
database-owned `private.tourism_media_reference_guard(p_bucket_id text,
p_object_name text) RETURNS void` trigger/helper has the fixed empty search
path, owns this check, and has direct execution revoked from all client roles.
Relation-local guards cover parent thumbnail pairs, child storage pairs, and
gallery storage and thumbnail paths. Direct DML on
`destination_images` remains denied and the six destination-mapped generic
media RPC branches are its only application write path. For every other
storage-owning relation, the repository's existing protected-admin mutation
boundary remains the application write path, but the relation-local guard
executes for every INSERT or UPDATE of its Storage columns; no new direct
table grant or bypass path is introduced. A
reference writer that already holds the key commits before a claim can be
created; a claim that already holds it blocks the writer and makes it fail.
An UPDATE that changes a bucket/path pair locks the old and new exact keys in
lexicographic `(bucket_id, object_name)` order before either value is changed;
all media RPCs and relation-local guards use that same order.
The Storage DELETE policy's claim helper holds the key through the Storage
transaction, so a reference cannot be inserted between the final check and
DELETE. This is the prevention mechanism; no pure, unlocked RLS check is
claimed to solve that TOCTOU race.

The cross-service consistency contract is also exact: database metadata is
authoritative for ownership and publication, while Storage bytes are an
external system and are not covered by a cross-service ACID claim.

| Case | Required sequence and outcome |
| --- | --- |
| A. Create/upload | Upload an object to the private bucket under a validated new path. The metadata RPC acquires the path key, verifies the Storage row, registers the child and any parent thumbnail, and commits. The object is temporarily unreferenced before registration but cannot be cleaned once registration commits. |
| B. New-object replacement | Upload the new path first. The replace RPC locks new and old path keys in deterministic order, verifies the new object, updates metadata and revisions atomically, commits, then returns the old path for claim/begin-delete/Storage-delete/finish cleanup. If metadata fails, the new path follows case E. |
| C. Delete referenced | Direct Storage DELETE fails because the helper is false. `media_delete` performs database-first FK/dependency checks and metadata mutation; only after commit may the returned old path enter the cleanup claim flow. A dependent translation or event causes the database mutation to roll back and grants no cleanup path. |
| D. Orphan cleanup | Claim the exact unreferenced object, mark it `deleting`, call Storage DELETE, and finish with an existence-verified result. No raw administrator DELETE is permitted. |
| E. Metadata RPC fails after upload | The uploaded path remains an unreferenced external object. Compensation claims it and uses the same controlled delete flow. The failed database transaction is not treated as having registered ownership. |
| F. Storage cleanup fails after DB mutation | The committed metadata mutation is not reversed. The object remains unreferenced, the failed claim records the error and is retryable, and no English view can use the deleted metadata row. |

This preserves the current upload-new-object/application compensation shape
while making the cleanup call claim-aware. No English view or public grant is
enabled while an unguarded destination byte mutation, direct referenced-object
delete, or unguarded Storage-reference write remains.

The RPC action contract is exact:

| Operation | INSERT | UPDATE | DELETE | Required state and checks |
| --- | --- | --- | --- | --- |
| save draft | Create a missing translation in draft/pending | Edit an existing translation only with matching edit_revision; reviewed, published, and stale edits reset to draft/pending | None | Normalize blank optional text to NULL; source identity and locale are immutable |
| review | None | Set review metadata and append reviewed event | None | Source published; current source and media fingerprints; all review fields complete |
| reject | None | Set rejected metadata and append rejected event | None | Draft/pending or reviewed state; nonblank reason |
| publish | None | Set published metadata and append published event | None | Reviewed state; exact destination_eligible predicate |
| republish | None | Set published metadata and append republished event | None | Reviewed state after a prior publication; exact destination_eligible predicate |
| archive | None | Set translation_status archived and append archived event | None | Any active translation; set archived_at |
| unpublish | None | Set draft/pending and append unpublished event | None | Published or stale translation; clear current review checkpoint |
| restore | None | Set draft/pending and append restored event | None | Archived translation only; never publish directly |

The existing destinations source table retains its current RLS policies for the
protected administrator, and source updates continue through the existing
source administration boundary. Phase 3B adds the source revision and
thumbnail revision fields plus the named source cascade trigger. Direct
destination image table DML is removed from the Phase 3B media boundary;
media_insert, media_update, media_replace, media_set_primary,
media_reorder, and media_delete are the sole image mutation operations. Their
existing protected-administrator checks remain authoritative.

The public views are public.published_english_destinations and
public.published_english_destination_images. Both are security-barrier views
with fixed explicit projections and security_invoker=false. Anonymous and
authenticated SELECT is granted only on these views. The first view joins
destinations, destination_categories, and destination_translations and
evaluates destination_eligible. The second view joins the first view to
destination_images and destination_image_translations and evaluates the exact
image predicate in Section 5.4. No public grant is placed on a base source,
translation, or audit table. Admin, metadata, sitemap, map, and homepage
loaders use these projections and do not reconstruct eligibility.

The view projections are exact. `published_english_destinations` returns only:
`id`, `category_id`, `name`, `slug`, `summary`, `description`, `history`,
`latitude`, `longitude`, `google_maps_url`, `opening_hours`, `entrance_fee`,
`price_note`, `facilities`, `contact_name`, `contact_phone`,
`thumbnail_bucket`, `thumbnail_path`, `is_featured`, `display_order`,
`source_published_at`, and `english_published_at`. The translated fields come
from the eligible English parent row; source-neutral and source-governed
fields come from the source row. `published_english_destination_images`
returns only `id`, `destination_id`, `storage_bucket`, `storage_path`,
`caption`, `alt_text`, `display_order`, and `is_primary`, with caption and
alt_text coming from the eligible English image child. Neither view exposes
review state, stale diagnostics, revision counters, fingerprints, consent,
actor IDs, audit timestamps, or source-only Indonesian prose. The view owner is
the database owner, `security_barrier=true`, `security_invoker=false`, and
SELECT is granted only to `anon` and `authenticated`; all base-table grants
remain closed.

#### 6.6.1 Exact RPC contract

The Phase 3B function names, parameter types, and return types are fixed below.
Mutation functions return exactly one composite row of the named translation
table after the mutation; read functions return zero or more rows of the named
table or event table. No function accepts an actor ID, source revision,
fingerprint, or lifecycle timestamp from the client.

| Function | Parameters, in order | Return type | Grant and authorization |
| --- | --- | --- | --- |
| `destination_translation_admin_read` | `p_destination_id uuid` | `SETOF public.destination_translations` | `authenticated` EXECUTE; `auth.uid()` present and `public.is_admin()` true |
| `destination_image_translation_admin_read` | `p_destination_image_id uuid` | `SETOF public.destination_image_translations` | `authenticated` EXECUTE; same check |
| `destination_translation_review_history` | `p_translation_id uuid` | `SETOF public.destination_translation_review_events` | `authenticated` EXECUTE; same check |
| `destination_image_translation_review_history` | `p_translation_id uuid` | `SETOF public.destination_image_translation_review_events` | `authenticated` EXECUTE; same check |
| `destination_translation_save_draft` | `p_destination_id uuid, p_expected_edit_revision bigint, p_name text, p_summary text, p_description text, p_history text, p_opening_hours text, p_price_note text, p_facilities text[], p_thumbnail_alt_text text` | `public.destination_translations` | `authenticated` EXECUTE; same check; NULL expected revision means create only |
| `destination_translation_review` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_translations` | `authenticated` EXECUTE; same check; source must be published and current tokens must pass |
| `destination_translation_reject` | `p_translation_id uuid, p_expected_edit_revision bigint, p_reason text` | `public.destination_translations` | `authenticated` EXECUTE; same check; nonblank reason |
| `destination_translation_publish` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_translations` | `authenticated` EXECUTE; same check; reviewed row with no prior publication |
| `destination_translation_republish` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_translations` | `authenticated` EXECUTE; same check; reviewed row with prior publication |
| `destination_translation_archive` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_translations` | `authenticated` EXECUTE; same check; active row |
| `destination_translation_unpublish` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_translations` | `authenticated` EXECUTE; same check; published or stale row |
| `destination_translation_restore` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_translations` | `authenticated` EXECUTE; same check; archived row only |
| `destination_image_translation_save_draft` | `p_destination_image_id uuid, p_expected_edit_revision bigint, p_alt_text text, p_caption text` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; NULL expected revision means create only |
| `destination_image_translation_review` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; source parent and image are eligible |
| `destination_image_translation_reject` | `p_translation_id uuid, p_expected_edit_revision bigint, p_reason text` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; nonblank reason |
| `destination_image_translation_publish` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; reviewed row with no prior publication |
| `destination_image_translation_republish` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; reviewed row with prior publication |
| `destination_image_translation_archive` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; active row |
| `destination_image_translation_unpublish` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; published or stale row |
| `destination_image_translation_restore` | `p_translation_id uuid, p_expected_edit_revision bigint` | `public.destination_image_translations` | `authenticated` EXECUTE; same check; archived row only |

Every listed function is `SECURITY DEFINER`, owned by the database owner,
declares `SET search_path = ''`, schema-qualifies every relation and function,
and is explicitly revoked from `PUBLIC`, `anon`, and ordinary authenticated
callers before the named authenticated grant is applied. The functions use a
fixed lock order: parent destination, relevant source image rows ordered by
UUID, target translation, then event insert. A missing row raises `P0002`, an
actor or authorization failure raises `42501`, an expected-revision or token
mismatch raises `55000`, invalid lifecycle/content input raises `23514`, an FK
failure raises `23503`, and a uniqueness conflict raises `23505`. The
transaction rolls back on every error. Each successful mutation increments
the target `edit_revision` exactly once and appends exactly one event,
including `draft_saved`; source and media cascade functions append their own
`source_changed`, `source_blocked`, or `media_changed` events in the same
transaction.

### 6.7 Ownership and responsibility matrix

For Phase 3B, the owner assignments are normative. The database owner owns
schema, functions, triggers, views, and RLS. The media/storage owner owns
source image operations and storage. The protected administrator configured by
private.app_config.administrator_user_id is the destination content owner,
translation editor, approved reviewer, and publisher. The application/platform
owner owns route loaders and cache invalidation. The release/operations owner
owns implementation evidence and rollback rehearsal. These assignments do not
authorize production migration, deployment, or content publication.

| Proposed object or responsibility | Owner type | Responsibility |
| --- | --- | --- |
| Source tables and source relation tables | Domain content owner; database owner | Indonesian source truth, source constraints, relation integrity, and revision events |
| Typed entity translation tables | Translation workflow owner; database owner | English fields, locale uniqueness, workflow metadata, token capture, and retention |
| Typed image translation tables | Translation workflow owner; media owner | English alt/caption review, media-token capture, and publication state |
| public.destination_translations | Protected administrator as destination content owner; database owner | Destination English content and exact Phase 3B lifecycle contract |
| public.destination_image_translations | Protected administrator as destination content owner; database owner; media/storage owner | Destination image English metadata, media token, and lifecycle contract |
| Destination translation review-event tables | Database owner; protected administrator as content owner | Append-only lifecycle, rejection, actor, token, and reason history |
| destinations.source_revision and destinations.thumbnail_binary_revision | Database owner; domain content owner | Monotonic source and thumbnail revision values |
| destination_images.binary_revision, updated_at, and updated_by | Media/storage owner; database owner | Media mutation revision and actor evidence |
| public.destinations / destinations_source_revision_trigger / private.enforce_destination_source_revision() | Database owner; security/RLS owner | One source-revision increment per committed destination-row UPDATE and exact thumbnail-revision classification; BEFORE UPDATE FOR EACH ROW |
| public.destination_images / destination_images_revision_trigger / private.enforce_destination_image_revision() | Database owner; media/storage owner | Binary-revision, updated_at, updated_by authority and overflow failure; BEFORE INSERT OR UPDATE FOR EACH ROW |
| public.destinations / destinations_translation_source_cascade_trigger / private.destination_translation_source_cascade() | Database owner; security/RLS owner | Atomic source fingerprint/status cascade and source-blocked audit events; AFTER UPDATE FOR EACH ROW |
| public.destination_images / destination_images_translation_media_cascade_trigger / private.destination_image_translation_media_cascade() | Database owner; media/storage owner | Atomic child media-token stale suppression and media_changed audit events; AFTER UPDATE FOR EACH ROW |
| public.destination_translation_review_events and public.destination_image_translation_review_events append-only trigger objects and private reject functions | Database owner; compliance/audit owner | Database-level rejection of UPDATE and DELETE for every normal caller; BEFORE UPDATE OR DELETE FOR EACH ROW |
| Phase 3B foreign keys, checks, unique constraints, and indexes | Database owner; security/RLS owner | Relationship integrity, invariant enforcement, uniqueness, and query support |
| Destination translation workflow RPCs | Database owner; protected administrator as workflow owner | Exact actor, expected-revision, state, token, and publication checks |
| Destination image translation workflow RPCs | Database owner; protected administrator as workflow owner; media/storage owner | Exact image actor, expected-revision, media-token, state, and publication checks |
| Destination translation admin-read and history RPCs | Database owner; security/RLS owner; protected administrator as workflow owner | Protected administrative projections and append-only history reads |
| public.published_english_destinations and public.published_english_destination_images | Database owner; application/platform owner | Fixed safe projections and fail-closed public eligibility |
| Package aggregate revision | Database owner; package content owner | Atomic revision changes for package rows and package-destination relations |
| English published entity views | Database owner; application content owner | Safe projections, content eligibility, deterministic ordering, and public grants |
| Derived homepage, map, and search projections | Application/platform owner; content owner | Composition only from eligible typed projections and omission behavior |
| Save-draft, review, publish, archive, and restore RPCs | Database owner; translation workflow owner | Atomic transitions, actor checks, token checks, and audit evidence |
| Fingerprint and canonicalization functions | Database owner; domain content owner | Versioned field sets, deterministic serialization, and revision-token production |
| RLS policies and grants | Security/RLS owner; database owner | Anonymous projection boundary, administrative access, fixed execution context, and grant tests |
| Tourism-media storage bucket and object policies | Media/storage owner; security/RLS owner | Bucket/path authorization, replacement, deletion, signed URL trust, and cleanup |
| private.tourism_media_object_is_unreferenced(p_bucket_id text, p_object_name text) | Database owner; security/RLS owner | STABLE read-only exact reference check evaluated by the Storage DELETE policy; boolean-only authenticated execution required by Storage RLS |
| private.tourism_media_cleanup_claims | Database owner; media/storage owner; security/RLS owner | Exact object claim lease, state, expiry, retry error, and one-claim-per-path coordination; no client table grants |
| private.tourism_media_cleanup_claim_is_valid(p_bucket_id text, p_object_name text) | Database owner; security/RLS owner | VOLATILE policy helper that holds the object lock, verifies a deleting claim, and rechecks unreferenced state; boolean-only authenticated execution |
| private.tourism_media_reference_guard(p_bucket_id text, p_object_name text) and relation-local reference guards | Database owner; security/RLS owner; media/storage owner | Serialize every authoritative Storage-reference write and reject an active/deleting cleanup claim |
| public.tourism_media_cleanup_claim(p_bucket_id text, p_object_name text) RETURNS uuid; public.tourism_media_cleanup_begin_delete(p_bucket_id text, p_object_name text, p_claim_token uuid) RETURNS void; public.tourism_media_cleanup_finish(p_bucket_id text, p_object_name text, p_claim_token uuid, p_deleted boolean, p_error text) RETURNS void | Database owner; media/storage owner | Authenticated protected-admin claim, begin, Storage-result verification, failure recording, and retry boundary; no ordinary DELETE API |
| Media binary revision metadata | Media/storage owner; database owner | Monotonic revision on byte/path/caption/alt changes and atomic replacement |
| Slug and future redirect registry | Application routing owner; SEO owner | Source-owned current slug, alias collision rules, retention, and non-revealing archived behavior |
| Cache invalidation and dependency registry | Application/platform owner | Path/tag invalidation for entity, aggregate, media, route, and derived-page dependents |
| SEO route manifest, canonical origin, metadata, hreflang, and sitemap configuration | SEO/release owner; application routing owner | Indexability only after content eligibility, environment origin policy, and timestamp mapping |
| Translation review | Assigned translation reviewer; domain content owner | Meaning, terminology, required fields, source token, media alt, links, and route context |
| Publication approval | Publication approver; content owner | Explicit English publication or republish after review; no automatic publication |
| Audit and rejection records | Translation workflow owner; compliance/audit owner | Actor, timestamp, token, decision, reason, and retention |
| Rollback and recovery procedure | Release/operations owner; database owner; content owner | Schema/application rollback, manual content recovery, and evidence retention |

Owner type is distinct from database technical ownership. The database owner
maintains enforcement, but the domain content owner remains accountable for
whether the English content is accurate and publishable.

## 7. Migration plan

This section defines the Phase 3B execution order without creating a migration
or SQL file. No English content is backfilled automatically.

### 7.1 Phase 3B forward order

The database DDL, trigger/function changes, RLS and grant changes, views, and
`storage.objects` policy changes run in one transaction with no intermediate
commit. A failure rolls back all database changes. External Storage API
uploads and deletions are not part of that database transaction and must use
the compensation rules in Sections 6.6 and 13.8. No English view or grant is
committed until the byte-mutation and referenced-object-delete boundaries are
closed. The sequence is:

1. Verify prerequisites: the existing destinations, destination_images,
   destination_categories, every storage-owning relation listed in Section
   6.6, the storage bucket, source lifecycle and slug triggers,
   `public.is_admin()`, current media RPCs, PostgreSQL `server_encoding =
   'UTF8'`, and the Village Profile pilot remain present and tested. Record
   any legacy invalid fingerprint input, parent-only/mismatched thumbnail,
   missing Storage object, or storage-reference claim conflict for the
   fail-closed migration validation; do not silently repair it.
2. Add `source_revision` and `thumbnail_binary_revision` to destinations and
   `binary_revision`, nullable `updated_at`, and nullable `updated_by` to
   destination_images. Initialize every existing source and image revision to
   1. Backfill image `updated_at=created_at`; leave historical `updated_by`
   NULL because no truthful last editor exists. Preserve all existing source
   values and add positive-value checks; add the future timestamp default only
   after the backfill. No new revision trigger is enabled in this step.
3. Create destination_translations and destination_image_translations with
   their complete columns, defaults, foreign keys, and named checks. Create
   both append-only review-event tables with their complete columns and
   foreign keys. Create all named unique constraints and indexes from Sections
   6.1 and 6.5 before any workflow grant exists.
4. Enable RLS on the four new tables, revoke their direct table grants from
   `PUBLIC`, `anon`, and `authenticated`, and create no permissive base-table
   policy. Create the exact fingerprint helper functions and the two
   append-only trigger functions and relation-local trigger objects. The
   append-only objects are installed before any workflow function is granted.
5. In the same transaction, create and install the source-revision function
   and `destinations_source_revision_trigger`, the destination-image revision
   function and `destination_images_revision_trigger`, the image-translation
   media-cascade function and `destination_images_translation_media_cascade_trigger`,
   and the source-cascade function and
   `destinations_translation_source_cascade_trigger` as one indivisible
   trigger set. No committed state can contain source-revision behavior
   without its source cascade, or image binary-revision behavior without its
   child media cascade. The cascade triggers are installed only after their
   translation and event tables, checks, helper functions, and RLS boundary
   exist; no direct source mutation is accepted between these operations
   because the transaction is uncommitted.
6. Replace the destination branches of the existing `media_insert`,
   `media_update`, `media_replace`, `media_set_primary`, `media_reorder`, and
   `media_delete` definitions in place, preserving their signatures, grants,
   five non-destination mappings, and current compensation return values.
   Implement the exact per-operation trigger distinction and one-parent-UPDATE
   rule in Section 6.1. No wrapper or second generic media API is introduced.
7. Create `private.tourism_media_cleanup_claims`, its exact primary key,
   checks, indexes, and owner; create the reference-lock/guard functions and
   relation-local guards for every Storage reference in the Section 6.6
   matrix. Create the exact three authenticated protected-admin cleanup RPCs,
   their grants, and their fixed five-minute claim behavior. Create the
   read-only `private.tourism_media_object_is_unreferenced` helper with its
   required authenticated policy grant and the claim-validity helper with its
   advisory-lock recheck. Replace the broad Storage DELETE policy with the
   exact helper-plus-live-claim boundary and revoke direct `storage.objects`
   UPDATE for `tourism-media`. Retain validated INSERT, protected-admin
   SELECT, public signed delivery, and the existing media RPC names. This
   step precedes every English view or public grant.
8. Create the admin-read RPCs, the eight destination translation workflow
   RPCs, and the eight destination image translation workflow RPCs from
   Section 6.6. Every function is `SECURITY DEFINER`, owned by the database
   owner, uses `SET search_path = ''`, qualifies every relation and function,
   verifies `public.is_admin()`, derives `auth.uid()`, and enforces the
   expected `edit_revision`.
9. Create the security-barrier views
   `published_english_destinations` and
   `published_english_destination_images` with the exact projections and
   predicates in Sections 5.4 and 6.6. Their owners are the database owner.
10. Grant SELECT on the two safe views to `anon` and `authenticated`. Grant
    only the named authenticated EXECUTE privileges on admin-read and
    workflow RPCs. Grant no base-table access. Verify the view, function,
    trigger, and policy owners are the database owner or the explicitly named
    security owner.
11. Run database tests for constraints, RLS, actor checks, every lifecycle
    transition, source/media stale suppression, the complete archive/unpublish
    matrix, no fallback, public-view projections, direct protected-admin media
    SELECT, helper privilege and policy invocation, direct Storage UPDATE
    denial, unclaimed and referenced-object DELETE denial, claim expiry,
    reference-write-versus-delete serialization, all six cleanup compensation
    cases, legacy parent-thumbnail mismatch/parent-only exclusion, orphan
    cleanup, and FK deletion behavior. No English row is published by the
    migration itself.
12. Run application compatibility tests for the current Indonesian routes,
    future negative English-route assertions, metadata, switching, cache
    invalidation, accessibility, and regression behavior. The current
    negative route tests remain valid during a database-only Phase 3B change;
    they are changed only by the future English route application PR.
13. Verify the complete implementation against this document, record database
    and application test evidence, run `npm run check`, perform desktop and
    390-pixel browser smoke, and complete the rollback rehearsal. This is a
    merge-quality gate and does not authorize production migration, deployment,
    or content publication.
14. Obtain the separate production-action authorizations described in the
    future 3L gate in Section 9 and the separate-gates contract in Section 10
    only before the corresponding production action. They are not part of a
    merge or documentation-completion decision.

### 7.2 Phase 3B rollback and compatibility order

Before application adoption, a rollback transaction first verifies that no
Phase 3B table or column that would be removed contains data. It then reverses
the dependency graph exactly: (1) stop English route adoption and revoke
public view grants, (2) remove the two public views, (3) revoke workflow,
admin-read, and cleanup-RPC EXECUTE grants, (4) remove workflow, admin-read,
and cleanup RPCs, (5) remove new RLS policies and base-table grants, (6)
replace the Phase 3B Storage policies with the pre-Phase 3B policies while no
English view or route is exposed, (7) drop the relation-local Storage-reference
guard objects and bilingual trigger objects in dependency order, including
`destinations_translation_source_cascade_trigger`,
`destination_images_translation_media_cascade_trigger`,
`destination_images_revision_trigger`,
`destinations_source_revision_trigger`, and both append-only event triggers,
(8) drop their trigger functions and the cleanup policy/guard functions, (9)
drop the cleanup-claim table after verifying it is empty, (10) drop the
fingerprint helpers, (11) restore the pre-Phase-3B generic media functions
while the existing source tables still exist, (12) remove event tables, (13)
remove the translation tables' foreign keys, checks, and indexes, (14) remove
the translation tables, and (15) remove the new source and media revision
columns. The Storage policy replacement in step (6) removes its dependency on
`private.tourism_media_object_is_unreferenced` and
`private.tourism_media_cleanup_claim_is_valid`; neither helper is dropped
before that replacement. Existing Indonesian routes, generic media mappings,
protected-admin media SELECT, and the current upload/cleanup compensation
workflow are preserved. If any table or column is nonempty, the rollback
aborts and leaves the schema unchanged.

The rollback database statements execute in one transaction. External Storage
objects are not deleted by schema rollback; referenced or generic media
objects remain available. If a pre-adoption object cleanup must be undone, it
uses the existing compensation record rather than assuming that a database
rollback can restore external bytes.

After application adoption, retain all new tables and rows, revoke public view
grants, remove English route exposure, and return application reads to the
previous safe projections. Do not remove source revision triggers, audit rows,
translation rows, or storage objects. Keep the Storage UPDATE denial while
any Phase 3B English data remains in the database; restoring the old policy
requires first disabling English publication and completing the pre-adoption
rollback sequence. The old application must ignore the new tables and
columns, and source status behavior for Indonesian content must remain
unchanged.

After public English publication, rollback is non-destructive: revoke public
grants and route exposure, restore the previous safe projection, and retain
all content and audit data. A production migration, deployment, or content
publication requires its separate authorization before that action. No
rollback step claims to reverse a committed source revision, append-only audit
event, publication timestamp, or external storage deletion.

Each Phase 3B database change is reviewed together with its source columns,
translation tables, constraints, indexes, RLS, functions, views, grants,
application loader, admin workflow, test evidence, and rollback step. No
change alters the existing Indonesian publication contract.

## 8. Risks and mitigations

| Risk | Failure mode | Mitigation |
| --- | --- | --- |
| Data consistency | Source and translation disagree on visible fields or relationships | Typed foreign keys, atomic publication checks, domain contracts, and published views that re-check eligibility |
| Stale translation | English remains visible after a meaningful source update | Strict revision or deterministic domain fingerprint, source archive/unpublish suppression, stale tests, and no fallback |
| False staleness | Routine operational maintenance creates unnecessary retranslation work | Documented fingerprint field sets and per-domain review of what affects English presentation |
| Aggregate drift | Package translation describes destinations or ordering that changed | Strict package plus relation revision and fail-closed package projection |
| Media accessibility | English page renders an image with Indonesian or missing informative alt text | Typed media translation metadata, explicit decorative policy, and accessibility gates |
| Authorization bypass | UI hides a transition but a direct call bypasses it | RLS, restricted base tables, security-definer operations with fixed search path, and grant tests |
| Role ambiguity | One administrator can publish without a recorded review checkpoint | Required reviewed metadata and explicit publish operation; separate reviewer/publisher roles later |
| Rollback | A schema or view change blocks Indonesian or English publication | Backward-compatible rollout order, projection rollback plan, restore procedure, and pre-production rehearsal |
| Partial migration | One domain has tables but lacks views, policies, or admin support | Treat each domain as a complete migration unit with acceptance evidence |
| Performance | Many joins for translation, media, and package membership slow public pages | Explicit projections, targeted indexes, bounded queries, realistic query-plan review, and short-lived media URLs |
| Leakage | Audit, consent, draft, or storage details reach public clients | Security-barrier projections, explicit column lists, base-table denial, and safe loader tests |
| Scope expansion | Deferred articles, gallery, or extra locales become implicit work | Keep deferred entities inventory-only and require a new approved phase decision |

## 9. Phase breakdown through production rollout

The approved implementation sequence ends at 3J. The phase names below
preserve that sequence. The entries after 3J are future implementation gates,
not approved implementation phases; completing a gate does not authorize the
corresponding production action.

### 3B - Destination architecture and first rich-content implementation

This document is the 3B.1 architecture review checkpoint. The later 3B
implementation slice, if separately authorized, covers the destination
translation table, destination image alt metadata, destination published
projection, RLS and workflow operations, English list/detail routes, route
switching, metadata, and domain tests. It must validate the chosen fingerprint
against the actual destination field contract.

### 3C - Shared navigation, metadata, and SEO contract

Define and test locale-aware navigation, route mappings, language switching,
canonical and alternate metadata, sitemap eligibility, not-found behavior,
and dictionary ownership. This phase must not create database translation rows
for neutral interface strings.

### 3D - Traditional houses

Implement the typed house translation and media metadata contract, list/detail
routes, public projection, admin workflow, stale behavior, accessibility,
metadata, and regression tests.

### 3E - Cultural events

Implement translated event narrative and visitor information, event media
metadata, date and location presentation, route behavior, stale suppression,
metadata, and tests. Source event eligibility remains authoritative.

### 3F - Tourism packages

Implement the package translation and aggregate relationship contract. Verify
ordered destinations, relation notes where approved, package media, source
and relation revisions, and fail-closed behavior when a contributing
destination is not eligible.

### 3G - Homestays

Implement homestay translation and media metadata, including the selected
fingerprint field set, operational-field classification, contact consent,
price presentation, route behavior, and tests.

### 3H - UMKM and local businesses

Implement UMKM translation and media metadata with business identity,
description, category, location, reachability, consent, and stale rules.
Verify that phone and WhatsApp values are not incorrectly translated or
exposed without source consent.

### 3I - Contacts and tourism map

Decide whether current contact records need localized labels or descriptions.
If they do, use typed contact translation rows; otherwise use source values
and dictionaries. Extend the map only by composing eligible domain
projections. Test coordinates, markers, source links, and localized display
fields without creating a map content table.

### 3J - Homepage and full regression

Compose the English homepage from eligible Village Profile and domain
projections. Validate language switching, route pairs, metadata, sitemap,
media, accessibility, loading and error states, stale suppression, and
Indonesian regression. Confirm that no deferred entity is exposed by an
English route accidentally.

### Future implementation gate 3K - Pre-production completion and release readiness

After an approved 3B-3J implementation slice, complete the merge-quality and
implementation-phase gates:

- reviewed migration design for every schema change;
- database and application tests;
- route, metadata, switching, sitemap, and regression tests for every changed
  route and projection;
- accessibility checks;
- npm run check;
- local database evidence for every changed database behavior;
- desktop and 390-pixel browser smoke;
- rollback documentation for every changed schema, view, workflow, or route.

Production migration, deployment, and content publication authorization are
separate decisions and are not implied by completing this gate or merging
reviewed code and documentation.

### Future implementation gate 3L - Production rollout

This is a production-action gate, not an approved implementation phase.
Before the corresponding production action, separately obtain:

- production migration authorization before a production migration;
- deployment authorization before a production deployment;
- content publication authorization before public English content publication;
- readiness for production post-action validation.

Roll out in a reversible order, validate source and English projections,
confirm stale and archive suppression, check public routes and metadata, and
record the result. If any fail-closed or data-integrity check fails, stop
publication and use the approved rollback path.

## 10. Acceptance and review checklist

The implementation design is ready for a later implementation review only
when reviewers can answer yes to the following:

- The selected Option C hybrid boundary is documented for every Phase 3A
  content area.
- Every rich translation has a typed source foreign key and a fixed locale
  contract.
- Every domain has a named strict or fingerprint revision strategy and field
  contract.
- Archive and unpublish always remove public English eligibility.
- A relevant source revision cannot leave a stale translation publicly
  visible.
- Package aggregate and relationship freshness are checked together.
- Informative English images have a reviewed alt-text path with no Indonesian
  fallback.
- Published public projections exclude audit, consent, draft, stale, and
  storage-private fields.
- RLS and trusted operations enforce the same lifecycle rules as the admin UI.
- Route, metadata, switching, sitemap, accessibility, browser, and Indonesian
  regression checks have an owner and evidence location.
- Rollback behavior is documented for every schema, view, or workflow change.
- Deferred article, customary institution, and gallery routes remain deferred.
- Version 1.0 approval, implementation authorization, production authorization,
  and content publication authorization are recorded as separate decisions.

Before merge or implementation-phase completion, require:

- implemented migration review for the Phase 3B schema;
- database and application tests;
- route, metadata, switching, sitemap, and regression tests for the destination
  list, destination detail, homepage, tourism map, and all changed projections;
- accessibility checks;
- npm run check;
- local database evidence for the Phase 3B database behavior;
- desktop and 390-pixel browser smoke;
- rollback documentation for the Phase 3B schema, views, workflow, and routes.

Before the corresponding production action, separately require:

- production migration authorization before production migration;
- deployment authorization before production deployment;
- content publication authorization before public content publication;
- production post-action validation readiness.

These are separate gates. Production or content-publication authorization is
not required merely to merge reviewed code or documentation, and merging does
not grant either authorization.

## 11. Traceability to Phase 3A

This design preserves the Phase 3A decisions:

- Version 1.0 approval remains pending.
- Phase 3A remains documentation-only.
- This document grants no implementation authorization.
- This document grants no production authorization.
- English routes do not fall back to Indonesian descriptive content.
- Stale-source behavior is fail-closed.
- Source archive and unpublish always suppress public English eligibility.
- Translation-relevant source changes require review and explicit republish.
- Strict row-level and translation-relevant fingerprint strategies can differ
  by domain without weakening the archive and unpublish rule.
- Rich public content is translated through typed domain contracts.
- Neutral interface text remains in locale dictionaries.
- Public media uses trusted signed URLs and reviewed English alt metadata.
- Existing Indonesian routes and publication behavior remain unchanged.
- Articles, customary institution content, and gallery remain outside the
  active route rollout unless separately approved.

## 12. Final implementation boundary

Any future implementation begins with a domain-level review of the destination
slice and the existing Village Profile pilot. It must not
start by introducing a generic translation table, broad anonymous access, a
polymorphic source foreign key, or an implicit production action.

This file is the complete Phase 3B.1 architecture proposal. It contains no
application implementation, migration file, SQL, package change, Supabase
operation, staged change, commit, push, or production publication.

## 13. Architecture self-review

This section is the explicit self-review requested after completion of the
design. It tightens the earlier domain summaries without changing the
Phase 3A boundary. No implementation is implied.

For this section:

- T means the stored value needs an approved English representation when it
  is rendered as public content.
- N means the field is not translated. It remains a source value, identifier,
  control, relationship, audit value, or media reference.
- P means an N field can affect public presentation and therefore cache
  invalidation or a domain freshness contract, but it does not require an
  English translation row by itself.
- G means a publication or eligibility gate. A G field is never a source for
  English prose, but a non-published value always removes public English
  eligibility.
- R means route or identity metadata. A route change needs URL handling, not
  an English prose translation.
- M means media ownership or media revision metadata.

Private fields are neither translated nor public. They are excluded from every
English translation contract and safe projection. In particular, source_note
for cultural and customary-institution articles is private source provenance;
it is not a T, N, or P public field and must never be copied into a public
translation row or view.

The classifications below are exhaustive for the current source tables and
their current media and relationship tables. The proposed translation tables
add translated T fields plus workflow metadata; they do not copy N source
fields.

### 13.1 Why Option C is objectively better here

Option C is preferable on measurable repository characteristics, not merely
because it is familiar:

| Repository characteristic | Consequence for the design |
| --- | --- |
| The schema has separate typed tables for destinations, houses, events, packages, homestays, UMKM, contacts, articles, and gallery items | A typed translation table preserves a real foreign key and domain constraints for each entity |
| Published access is already built from explicit security-barrier views | Per-domain views can add English eligibility checks without a generic payload decoder or a broad polymorphic join |
| Base tables deny public access and RLS is domain-specific | Per-domain policies and trusted operations are auditable; a generic entity_type/entity_id policy would be harder to prove safe |
| Entities have materially different required fields and publication checks | A destination thumbnail rule, event date rule, package aggregate rule, and UMKM reachability rule can remain typed |
| Package membership is a real many-to-many relation with ordering | A package translation can use a typed aggregate revision; a generic table cannot enforce the relation safely with one foreign key |
| Media is owned by separate child tables and storage RPCs | Typed image translation metadata can point to the exact image table and preserve storage ownership |
| The Village Profile pilot already uses a typed translation table, RPC lifecycle, and freshness-filtered public view | Option C extends a repository-proven pattern rather than introducing a second data access model |
| The public surface contains both editorial records and neutral interface strings | Database workflow is reserved for editorial records; dictionaries remain the correct owner for navigation, route labels, and controls |
| The active domain set is finite and known | The repeated table/view/policy work is bounded and buys relational integrity; generic extensibility is not a current product requirement |
| The repository has no public full-text search or arbitrary user-defined content types | Option B solves a scalability problem that does not exist while adding integrity and query risk |

Option C is therefore better than Option B because it keeps the strongest
properties already present in the repository: typed foreign keys, explicit
public projections, domain-specific publication constraints, and auditable RLS.
Its only additional complexity is the intentional distinction between
database-backed editorial content and dictionary-owned interface copy.

Option C does not mean that every entity must receive a translation table.
Fixed category vocabulary and neutral interface strings remain dictionary
entries. Rich content receives dedicated tables. That is the precise hybrid
boundary.

### 13.2 Exhaustive translation-relevance field contract

The following lists are the translation-relevance contract. For Phase 3B, the
destination table is authoritative and complete. “Translation-relevant” means
that a change requires a new English review under the selected destination
fingerprint, even when the English value is a shared source projection rather
than a translated column. “Media-relevant” means that the parent or image
translation becomes stale through a media fingerprint. A field excluded from
both fingerprints never requires retranslation, but it can still invalidate
routes or change source eligibility.

#### Village Profile: village_profiles

T fields:

- name
- summary
- description
- history
- vision
- mission
- address

N fields:

- id
- slug (R; the current profile route is static, but the source identity is
  still retained)
- latitude (P)
- longitude (P)
- google_maps_url (P)
- status (G)
- published_at (G)
- created_at
- updated_at (revision and audit control)
- created_by
- updated_by

The Village Profile uses strict row revision, so any approved source update
that changes updated_at suppresses the English row. The T list describes the
translation payload; strict freshness is intentionally broader.

#### Destination category: destination_categories

T fields in the database: none. The visible category labels are dictionary
entries for the fixed Alam, Budaya, and Religi vocabulary.

N fields:

- id
- name (fixed source vocabulary; dictionary-owned in English)
- slug (R and fixed filter identifier)
- display_order (P)

Categories remain fixed source vocabulary and are dictionary-owned in English.
Editorial category descriptions are deferred and would require a new typed
content contract in a future phase.

#### Destination: destinations

The authoritative Phase 3B source-field contract is:

| Field | Source entity | PostgreSQL type and nullability | Translation-relevant | Fingerprint input | Required for English publication | Existing English result after a source change |
| --- | --- | --- | --- | --- | --- | --- |
| id | public.destinations | uuid NOT NULL, generated primary key | No | Excluded | Yes, as identity | No stale; identity is immutable |
| category_id | public.destinations | uuid NOT NULL, FK to destination_categories | No | Excluded | Yes, referenced category must exist | No retranslation; invalidate destination list/detail and dictionary category projection |
| name | public.destinations | text NOT NULL, nonblank | Yes | Included in destination-v1 | Yes, translated name nonblank | Translation becomes stale |
| slug | public.destinations | text NOT NULL, unique, nonblank | No | Excluded | Yes, source route must resolve | No retranslation; immutable after first source publication; draft route resolution follows the current source slug |
| summary | public.destinations | text NOT NULL, nonblank | Yes | Included in destination-v1 | Yes, translated summary nonblank | Translation becomes stale |
| description | public.destinations | text NOT NULL, nonblank | Yes | Included in destination-v1 | Yes, translated description nonblank | Translation becomes stale |
| history | public.destinations | text NULL | Yes | Included in destination-v1 with explicit null | Required when source is nonblank | Translation becomes stale |
| latitude | public.destinations | numeric NOT NULL, -90 to 90 | Yes | Included in destination-v1 | Yes, source coordinate is valid | Translation becomes stale |
| longitude | public.destinations | numeric NOT NULL, -180 to 180 | Yes | Included in destination-v1 | Yes, source coordinate is valid | Translation becomes stale |
| google_maps_url | public.destinations | text NULL | Yes | Included in destination-v1 | No; shared value may be absent | Translation becomes stale |
| opening_hours | public.destinations | text NULL | Yes | Included in destination-v1 with explicit null | Required when source is nonblank | Translation becomes stale |
| entrance_fee | public.destinations | numeric NULL, value >= 0 | Yes | Included in destination-v1 | No; shared numeric value may be absent | Translation becomes stale |
| price_note | public.destinations | text NULL | Yes | Included in destination-v1 with explicit null | Required when source is nonblank | Translation becomes stale |
| facilities | public.destinations | text[] NOT NULL, default empty array | Yes | Included in destination-v1 with order and explicit null elements prohibited | English array must match source cardinality; empty source requires empty English array | Translation becomes stale |
| contact_name | public.destinations | text NULL | Yes | Included in destination-v1 | No; source proper name may be absent | Translation becomes stale |
| contact_phone | public.destinations | text NULL | No | Excluded | No; source value may be absent | No retranslation; invalidate public contact consumers |
| contact_consent_confirmed | public.destinations | boolean NOT NULL, default false | No, governance gate | Excluded | Yes when contact_name or contact_phone is present | No stale transition; false makes the source ineligible immediately and true does not auto-publish a blocked source |
| thumbnail_path | public.destinations | text NULL | No, media-relevant | Excluded from source fingerprint; included in thumbnail media fingerprint | Yes, paired with thumbnail_bucket | Parent translation becomes media-stale when the current thumbnail token differs |
| thumbnail_bucket | public.destinations | text NULL | No, media-relevant | Excluded from source fingerprint; included in thumbnail media fingerprint | Yes, paired with thumbnail_path and equal to tourism-media | Parent translation becomes media-stale when the current thumbnail token differs |
| thumbnail_binary_revision | public.destinations | bigint NOT NULL, default 1, > 0 | No, media-relevant | Included in thumbnail media fingerprint | Yes when a thumbnail exists | Parent translation becomes media-stale when it changes |
| is_featured | public.destinations | boolean NOT NULL, default false | No | Excluded | No | No retranslation; invalidate list, homepage, and map consumers |
| display_order | public.destinations | integer NOT NULL, default 0, >= 0 | No | Excluded | No | No retranslation; invalidate ordered list consumers |
| status | public.destinations | public.publication_status NOT NULL, default draft | No, lifecycle gate | Excluded | Must be published | Archive/unpublish cascades published translations to draft/pending; this is source-blocked, not stale |
| published_at | public.destinations | timestamptz NULL | No | Excluded | No direct dependency | No retranslation |
| created_at | public.destinations | timestamptz NOT NULL, statement_timestamp() default | No | Excluded | No | No retranslation |
| updated_at | public.destinations | timestamptz NOT NULL, statement_timestamp() default and trigger-maintained | No | Excluded | No | No retranslation when the destination fingerprint is unchanged |
| created_by | public.destinations | uuid NOT NULL, FK auth.users | No | Excluded | No | No retranslation |
| updated_by | public.destinations | uuid NOT NULL, FK auth.users | No | Excluded | No | No retranslation |
| source_revision | public.destinations | bigint NOT NULL, default 1, > 0 | No, concurrency/audit | Excluded | No direct dependency | Increments on every trusted source update; destination freshness uses the fingerprint, not this counter |

#### Destination image: destination_images

The authoritative Phase 3B source-image contract is:

| Field | Source entity | PostgreSQL type and nullability | Translation-relevant | Media fingerprint input | English result after a source change |
| --- | --- | --- | --- | --- | --- |
| id | public.destination_images | uuid NOT NULL, generated primary key | No | Included as identity | Child media translation resolves a different source row only through its FK |
| destination_id | public.destination_images | uuid NOT NULL, FK to destinations | No | Included through the parent relationship | Child image is omitted when its parent is not eligible |
| storage_bucket | public.destination_images | text NOT NULL, nonblank | No, media-relevant | Included | Child media translation becomes stale |
| storage_path | public.destination_images | text NOT NULL, nonblank | No, media-relevant | Included | Child media translation becomes stale |
| caption | public.destination_images | text NULL | No, media-relevant | Included | Child media translation becomes stale |
| alt_text | public.destination_images | text NOT NULL, nonblank | No, media-relevant | Included | Child media translation becomes stale; source alt text is never displayed as English alt text |
| display_order | public.destination_images | integer NOT NULL, default 0, >= 0 | No | Excluded | No retranslation; invalidate destination media consumers |
| is_primary | public.destination_images | boolean NOT NULL, default false | No | Excluded | No retranslation; invalidate destination media consumers |
| created_at | public.destination_images | timestamptz NOT NULL, statement_timestamp() default | No | Excluded | No retranslation |
| created_by | public.destination_images | uuid NOT NULL, FK auth.users | No | Excluded | No retranslation |
| binary_revision | public.destination_images | bigint NOT NULL, default 1, > 0 | No, media-relevant | Included | Child media translation becomes stale |
| updated_at | public.destination_images | timestamptz NULL, statement_timestamp() default for new trusted inserts | No | Excluded | No retranslation beyond binary_revision behavior |
| updated_by | public.destination_images | uuid NULL, FK auth.users | No | Excluded | No retranslation; historical NULL is allowed because no actor is fabricated |

Upload of a new source image starts binary_revision at 1. The supported
replacement path uploads a new Storage object and then changes the database
path through the trusted RPC; replacement path, source caption, or source alt
text increments binary_revision exactly once. Direct same-path Storage byte
replacement is denied by the Phase 3B bucket policy, because PostgreSQL cannot
observe object bytes. The database therefore makes no false claim that an
out-of-band byte change is fingerprint-detectable. Deletion does not increment
a deleted row; it is an eligibility and cache event, and the source-image FK
prevents deletion while a translation or event history depends on the row.
Display order and primary selection do not increment it.

#### Tourism package: tourism_packages

T fields:

- name
- duration_unit
- price_note
- included_facilities
- souvenir
- summary
- description

N fields:

- id
- slug (R)
- package_type (fixed enum vocabulary; English label comes from a dictionary)
- duration_value (P)
- price (P)
- thumbnail_path (M)
- thumbnail_bucket (M)
- is_featured (P)
- display_order (P)
- status (G)
- published_at (G)
- created_at
- updated_at
- created_by
- updated_by

#### Package destination relation: package_destinations

T fields:

- notes, if relation notes are rendered in English

N fields:

- id
- package_id
- destination_id
- display_order (P; changes aggregate presentation)
- created_at
- created_by

The relation membership and ordering are not translated values, but they are
part of the strict package aggregate revision.

#### Package image: package_images

T fields:

- caption
- alt_text

N fields:

- id
- package_id
- storage_bucket (M)
- storage_path (M)
- display_order (P)
- is_primary (P)
- created_at
- created_by

#### Homestay: homestays

T fields:

- name
- description
- address
- price_note
- facilities

N fields:

- id
- slug (R)
- owner_name (P; proper name)
- phone (P; source contact value)
- contact_consent_confirmed (G)
- latitude (P)
- longitude (P)
- google_maps_url (P)
- price_per_night (P; numeric source value)
- thumbnail_path (M)
- thumbnail_bucket (M)
- status (G)
- published_at (G)
- is_featured (P)
- display_order (P)
- created_at
- updated_at
- created_by
- updated_by

#### Homestay image: homestay_images

T fields:

- caption
- alt_text

N fields:

- id
- homestay_id
- storage_bucket (M)
- storage_path (M)
- display_order (P)
- is_primary (P)
- created_at
- created_by

#### UMKM/local business: umkms

T fields:

- business_name
- category
- description
- address

N fields:

- id
- slug (R)
- owner_name (P; proper name)
- latitude (P)
- longitude (P)
- google_maps_url (P)
- contact_name (P; proper name)
- contact_phone (P; source contact value)
- contact_whatsapp (P; source contact value)
- contact_consent_confirmed (G)
- thumbnail_path (M)
- thumbnail_bucket (M)
- status (G)
- published_at (G)
- is_featured (P)
- display_order (P)
- created_at
- updated_at
- created_by
- updated_by

#### UMKM image: umkm_images

T fields:

- caption
- alt_text

N fields:

- id
- umkm_id
- storage_bucket (M)
- storage_path (M)
- display_order (P)
- is_primary (P)
- created_at
- created_by

#### Traditional house: traditional_houses

T fields:

- name
- summary
- description
- history
- cultural_significance
- location_name
- visitor_information

N fields:

- id
- slug (R)
- latitude (P)
- longitude (P)
- google_maps_url (P)
- thumbnail_path (M)
- thumbnail_bucket (M)
- status (G)
- published_at (G)
- is_featured (P)
- display_order (P)
- created_at
- updated_at
- created_by
- updated_by

#### Traditional house image: traditional_house_images

T fields:

- caption
- alt_text

N fields:

- id
- traditional_house_id
- storage_bucket (M)
- storage_path (M)
- display_order (P)
- is_primary (P)
- created_at
- created_by

#### Cultural article: cultural_articles

T fields:

- title
- summary
- content
- article_category

Private fields (not translated and never projected):

- source_note

N fields:

- id
- slug (R)
- thumbnail_path (M)
- thumbnail_bucket (M)
- status (G)
- is_featured (P)
- published_at (G)
- created_at
- updated_at
- created_by
- updated_by

This entity has no current public route. The field contract becomes active only
if the deferred article route is approved.

#### Cultural article image: cultural_article_images

T fields:

- caption
- alt_text

N fields:

- id
- cultural_article_id
- storage_bucket (M)
- storage_path (M)
- display_order (P)
- is_primary (P)
- created_at
- created_by

#### Customary institution article: customary_institution_articles

T fields:

- title
- summary
- content
- institution_name
- institution_role
- historical_context

Private fields (not translated and never projected):

- source_note

N fields:

- id
- slug (R)
- thumbnail_path (M)
- thumbnail_bucket (M)
- status (G)
- is_featured (P)
- published_at (G)
- created_at
- updated_at
- created_by
- updated_by

Institution names may retain the original proper name inside the English
translation, but the field is owned by the translation row because it is
public display content. The initial terminology rule is to preserve customary
and proper names verbatim unless the designated content owner approves an
established English form; no automatic transliteration is permitted.

#### Customary institution article image: customary_institution_article_images

T fields:

- caption
- alt_text

N fields:

- id
- customary_institution_article_id
- storage_bucket (M)
- storage_path (M)
- display_order (P)
- is_primary (P)
- created_at
- created_by

#### Cultural event: cultural_events

T fields:

- title
- summary
- description
- event_type
- date_note
- location_name
- address
- organizer
- visitor_information

N fields:

- id
- slug (R)
- start_at (P; event presentation and scheduling)
- end_at (P; event presentation and scheduling)
- all_day (P)
- latitude (P)
- longitude (P)
- google_maps_url (P)
- contact_phone (P; source contact value)
- contact_consent_confirmed (G)
- thumbnail_path (M)
- thumbnail_bucket (M)
- status (G)
- is_featured (P)
- published_at (G)
- created_at
- updated_at
- created_by
- updated_by

The event date and location fields are not translated text, but the selected
event fingerprint includes them because changing them changes the meaning of
the English event presentation.

#### Cultural event image: cultural_event_images

T fields:

- caption
- alt_text

N fields:

- id
- cultural_event_id
- storage_bucket (M)
- storage_path (M)
- display_order (P)
- is_primary (P)
- created_at
- created_by

#### Gallery item: gallery_items

T fields:

- title
- caption
- alt_text
- category

N fields:

- id
- storage_bucket (M)
- storage_path (M)
- thumbnail_path (M)
- taken_at (P)
- display_order (P)
- status (G)
- created_at
- updated_at
- created_by
- updated_by

Gallery remains outside the active route scope. Its field contract is
inventory-only until the route and publication decision is reopened.

#### Contact entry: contacts

T fields:

- label
- description

N fields:

- id
- contact_type (machine classification; dictionary label if displayed)
- value (source contact value)
- url
- display_order (P)
- status (G)
- created_at
- updated_at
- created_by
- updated_by

Contact localization is deferred to 3I. Until that phase is separately
approved, current contact rows are not an English translation source. If 3I
activates them, only label and description may become typed translated
content; phone, URL, type, value, order, status, and consent remain source
data.

#### Public site setting: site_settings

T fields under the current contract: none. Neutral interface settings remain
dictionary-owned or source-owned.

N fields:

- id
- key
- value
- value_type
- label
- description
- is_public (G)
- is_editable
- created_at
- updated_at
- created_by
- updated_by

There is no localized site-setting exception in the initial rollout. A future
public text setting would require a new typed contract; arbitrary JSON and
implicit translation behavior are never allowed.

#### Existing Village Profile translation row: village_profile_translations

T fields:

- name
- summary
- description
- history
- vision
- mission
- address

N fields:

- id
- village_profile_id
- locale
- status
- source_updated_at_at_publish
- published_at
- created_at
- updated_at
- created_by
- updated_by

Future domain translation tables use the same split: translated content plus
workflow and freshness metadata. They do not duplicate source slugs,
coordinates, prices, contact values, storage paths, or audit identities.

### 13.3 Precise stale-detection computation

The public eligibility predicate is a database projection predicate, not a
route or cache decision. For Phase 3B it is the destination_eligible and
destination_image_eligible predicate defined in Section 5.4. A false
predicate omits a list item or returns the controlled detail not-found result.
It never falls back to Indonesian. Canonical URL, production origin, sitemap,
and hreflang are SEO/indexability inputs only and cannot change this content
predicate.

#### Strict row revision

For the Village Profile, the compatibility token is exactly the source
updated_at value captured in source_updated_at_at_publish. Freshness requires
exact timestamp equality with the current source updated_at and source status
published. Any approved source update that changes updated_at makes the
translation stale. Its existing pilot column remains authoritative until a
separate compatibility migration adopts a bigint revision.

For packages in 3F, strict revision applies to the package aggregate. The
aggregate token is aggregate-v1:<package_id>:<monotonic_aggregate_revision>.
The Phase 3F schema column is tourism_packages.aggregate_revision bigint NOT
NULL DEFAULT 1 CHECK (aggregate_revision > 0). The existing trusted package
transactions are the sole authority and increment it for every package-row
mutation and every package-destination insert, update, delete, membership,
ordering, or note change. The token is captured atomically with package
translation review and publication. The current package and every contributing
destination must also be published and eligible. This package column and
contract are outside the Phase 3B migration.

#### Translation-relevant fingerprint

Phase 3B uses database-owned, versioned helpers. Their exact signatures and
outputs are:

| Function | Parameter and return type | Version and ordered JSON keys |
| --- | --- | --- |
| `private.destination_source_fingerprint_v1` | `p_source public.destinations` -> `text` | `fingerprint-v1`; `version`, `name`, `summary`, `description`, `history`, `opening_hours`, `entrance_fee`, `price_note`, `facilities`, `latitude`, `longitude`, `google_maps_url`, `contact_name` |
| `private.destination_translation_fingerprint_v1` | `p_translation public.destination_translations` -> `text` | `translation-v1`; `version`, `name`, `summary`, `description`, `history`, `opening_hours`, `price_note`, `facilities`, `thumbnail_alt_text` |
| `private.destination_image_translation_fingerprint_v1` | `p_translation public.destination_image_translations` -> `text` | `destination-media-translation-v1`; `version`, `alt_text`, `caption` |
| `private.destination_thumbnail_media_fingerprint_v1` | `p_source public.destinations` -> `text` | `thumbnail-media-v1`; `version`, `destination_id`, `thumbnail_bucket`, `thumbnail_path`, `thumbnail_binary_revision` |
| `private.destination_image_media_fingerprint_v1` | `p_image public.destination_images` -> `text` | `media-v1`; `version`, `destination_image_id`, `storage_bucket`, `storage_path`, `caption`, `alt_text`, `binary_revision` |

Each wrapper constructs the listed object in the listed order and calls the
shared private contract `private.fingerprint_sha256_v1(p_version text,
p_ordered_key_values text[]) returns text`. The array is an even-length list
of alternating exact key names and already-canonical JSON values. The shared
helper emits a compact UTF-8 JSON object with no whitespace, hashes those
bytes with SHA-256, and returns exactly `<version>:<64 lowercase hexadecimal
digest>`. The JSON object begins with the `version` key and its string value;
the wrapper's remaining keys follow in the table order. JSON string escaping
is exact: quotation mark is `\"`, reverse solidus is `\\`, U+0008 is `\b`,
U+0009 is `\t`, U+000A is `\n`, U+000C is `\f`, and U+000D is `\r`;
every other U+0000 through U+001F character uses lowercase `\u00xx` with
exactly two lowercase hexadecimal digits in `xx`. Every other character,
including non-ASCII characters, is emitted directly in the database's UTF-8
encoding. This contract is not PostgreSQL `jsonb::text` output and does not
depend on object-key sorting.

All five wrapper functions and the shared helper are owned by the database
owner, `SECURITY INVOKER`, declare `SET search_path = pg_catalog`, qualify
their dependencies, and have `EXECUTE` revoked from `PUBLIC`, `anon`, and
`authenticated`. They are callable only by the trusted source cascade,
trusted media/workflow RPCs, or owned published views. No client, route
loader, rendered HTML, or cache may provide a fingerprint.

Canonical values are fixed mechanically. The repository documents
PostgreSQL major version 17 in `supabase/config.toml` but documents no
Unicode-normalization extension or primitive. The Phase 3B prerequisite is
`server_encoding = 'UTF8'`; v1 performs no NFD/NFC conversion, transliteration,
case folding, locale conversion, or Unicode-whitespace mapping. A string is
normalized in this exact order: replace every CRLF code-point sequence
U+000D U+000A with one LF U+000A; replace every remaining U+000D with LF; then remove only
leading and trailing characters from this exact six-code-point set:
U+0009 horizontal tab, U+000A line feed, U+000B vertical tab, U+000C form
feed, U+000D carriage return, and U+0020 space. No other code point is
trimmed or changed, and all internal whitespace, punctuation, case, and
non-ASCII UTF-8 bytes are preserved. The same function is used for source and
English text values.

After that normalization, NULL and empty values are distinct at input but
have this canonical result: an optional NULL or empty value emits JSON null;
a required NULL or empty value is invalid and is rejected. An optional value
containing only the six trim characters therefore emits JSON null. Missing
optional scalars emit JSON null and never omit their key. The only Phase 3B
array is `facilities`: a NULL array is invalid, an empty array emits `[]`,
every element is required to be non-NULL and nonempty after the exact string
normalization, element order is preserved, and duplicate elements are
preserved. No sorting, deduplication, filtering, or locale-specific array
mapping occurs. The English array must also preserve source cardinality and
order. A legacy source or translation row with a NULL/blank array element or
other invalid required value is not silently cleaned: migration validation
reports it, workflow fingerprint computation rejects it with SQLSTATE
`23514`, and the public eligibility layer catches that validation failure and
returns false. Such a row is fail-closed until a trusted content or media
operation repairs it.

UUID values use lowercase canonical hyphenated text. PostgreSQL `numeric`
values are canonicalized as `CASE WHEN value = 0 THEN '0' ELSE
trim_scale(value)::text END` after rejecting `NaN`, `Infinity`, and
`-Infinity`. The result must match the plain-decimal grammar
`^-?(0|[1-9][0-9]*)(\.[0-9]+)?$`; otherwise it is invalid. This uses the
PostgreSQL 17 `trim_scale` primitive and numeric output, not locale,
floating-point conversion, exponent notation, or a client formatter. Positive
bigint revisions are canonical base-10 integers with no leading zeroes. No
timestamp is an input to any Phase 3B fingerprint, so there is deliberately no
timestamp serialization in v1; a future fingerprint version must define one
before a timestamp is added. Stored bucket and path values are serialized exactly as
stored after their existing nonblank/path checks; no string trim, case
folding, slash rewriting, or Unicode normalization is performed on them.

Signed URLs, rendered HTML, request-time locale, cache keys, source_revision,
status, timestamps, audit actors, slug, category_id, contact_phone, consent,
ordering, featured state, and thumbnail storage fields are excluded from the
source fingerprint; thumbnail storage fields are included only in the
separate thumbnail-media fingerprint.

Raw fingerprint wrappers reject invalid required values. The database-owned
eligibility predicate catches those `23514` failures and returns false rather
than allowing a malformed legacy row to make a public view error. Therefore
the selected legacy behavior is fail-closed filtering, not silent cleanup and
not fallback rendering. Because every compliant implementation uses the same
ordered keys, exact six-code-point trim set, CR conversion order, NULL/empty
rules, array order/duplicate rules, numeric representation, UTF-8 JSON bytes,
and SHA-256 output format, two compliant implementations cannot produce
different hashes for the same valid row.

No relation collection is an input to the Phase 3B destination source
fingerprint. Destination image children are fingerprinted independently by
their immutable image ID; child collection order and `is_primary` are not
hashed. Display order is a presentation dependency, while primary selection is
represented by the parent thumbnail-media token. Relation membership and
ordering use the separate aggregate contracts in later phases and cannot be
silently folded into destination-v1.

The English snapshot helpers are recomputed from the stored translation row
at every review, publication, and public-view eligibility check. A mismatch
makes the row ineligible. The source cascade recomputes the source and
thumbnail helpers from `OLD` and `NEW` inside the source transaction.

#### Media freshness

The direct destination thumbnail token is the exact output of
`private.destination_thumbnail_media_fingerprint_v1()`.

The destination image token is the exact output of
`private.destination_image_media_fingerprint_v1()`.

The source media RPCs and the database revision trigger are the sole authority
for binary_revision. A new image row starts at 1. The supported new-object
replacement path, storage-path replacement, source caption change, and source
alt-text change increment binary_revision exactly once. Same-path Storage byte
replacement is denied before English exposure because Storage bytes are not
observable to a PostgreSQL fingerprint function; no fingerprint claim covers
an out-of-band operation. Display-order and primary-flag changes do not
increment it. A deleted row has no later revision comparison; deletion is
blocked while a translation or event history exists, and otherwise removes the
image and invalidates the affected routes. The direct thumbnail mutation is
handled by the source mutation boundary and increments
thumbnail_binary_revision for a bucket/path or supported byte replacement.

The complete Phase 3B stale algorithm is:

1. Lock and read the source destination, translation row, required thumbnail,
   and all requested source image rows in one trusted transaction.
2. Compute the current destination source fingerprint, thumbnail media
   fingerprint, and each current destination-image media fingerprint.
3. Recompute the parent or image English translation fingerprint from its
   stored fields.
4. Require the exact source and translation lifecycle states and required
   field conditions in Section 5.4.
5. For a parent translation, mark freshness derived stale when the source
   fingerprint, thumbnail media fingerprint, or English translation
   fingerprint differs. For an image child, mark freshness derived stale when
   its media or English translation fingerprint differs.
6. Treat source archive or unpublish as the separate source-blocked cascade
   defined in Section 5.2, not as an ordinary stale result.
7. Return eligible only when every predicate is true. Otherwise omit the row or
   return controlled not-found.

No client timestamp, signed URL, rendered HTML, cache value, canonical URL,
production origin, sitemap, or hreflang value participates in stale detection.

### 13.4 Slug handling, redirects, and canonical URLs

#### Source slug

The source slug is an Indonesian-source identity and routing field. It remains
owned by the source table, is unique within that source entity, and is not
copied into a translation row. It is not translated as prose.

The current source trigger also makes slug immutable after the first
publication. Today, an administrator can choose a slug before first
publication, but a published source cannot be renamed through the existing
workflow. Any future rename and redirect behavior described below therefore
requires a separately reviewed source-workflow change.

The initial English design uses the same source slug in the English route:

- source destination: /destinasi/[source-slug]
- English destination: /en/destinations/[source-slug]
- source house: /rumah-adat/[source-slug]
- English house: /en/traditional-houses/[source-slug]
- the same pattern applies to events, packages, homestays, and UMKM

The Village Profile currently has a static route, so its source slug is not
part of the current public URL. Destination category slugs remain fixed
filter identifiers and are not English content slugs.

#### English slug

There is no separate English slug in the initial design. The
English slug is the source slug alias. This avoids duplicate slug ownership,
translation-specific collisions, and a second route identity that could
point at a different source record.

A separate localized English slug would be a new field owned by the typed
translation table, with its own locale uniqueness, redirect history, and
review rules. It is not selected for this rollout and is deferred to a later
SEO-focused design; no implementation may assume localized English slugs.

#### Slug changes

Current implementation: a source slug may be selected before first
publication, and the existing trigger rejects a post-publication slug update.
There is no current redirect registry and an old slug returns the controlled
not-found response. Therefore no current implementation may rename a
published source or promise a redirect.

No Phase 3B source slug change is permitted after first publication. A future
routing phase may separately approve a source-owned alias registry; that is a
future routing/product decision, not a Phase 3B database dependency. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: approval of that future alias feature is outside this destination schema. If such a
change is approved, it keeps the same source ID and does not change translated
narrative or a fingerprint-domain token, but it invalidates route and SEO
caches. A strict domain follows its selected strict revision rule.

If that future redirect-enabled slug change is approved, it would:

- invalidates the old and new source and English route paths;
- invalidates list pages, metadata, sitemap, and homepage or map projections
  that contain the route;
- makes the new current URL the only canonical URL;
- updates reciprocal locale links to the new current paths;
- preserves the source ID as the lookup identity;
- must not resolve arbitrary old slugs by matching a changed title.

#### Redirects

The current Phase 3B behavior is a normal controlled not-found for an old
slug. If a later routing phase approves redirects, it must use a single-hop
permanent redirect from a retained old slug to the current slug only while the
source remains public. Redirect history would retain the source ID, domain, old
slug, current slug, creation time, and active flag, with collision checks and
single-hop resolution. Redirect chains would be collapsed to the current slug.
The current repository has no redirect-history table, so no Phase 3B migration
or implementation may guess a redirect target.

An old slug for an archived or unpublished source must not be used to reveal
that the record exists. It returns the controlled not-found or noindex
response unless the approved routing policy explicitly permits a non-revealing
redirect.

#### Canonical URLs

The application route contract owns canonical path construction. In the
current design, the source row owns the current source slug and the English
route uses that same slug alias; the deployment configuration owns the
canonical host and scheme. For an eligible English entity, the canonical is
the current English route using the source slug. For an eligible Indonesian
entity, it is the current Indonesian route. Canonical output must never point
from English to Indonesian content. When reciprocal routes exist, hreflang
alternates point to the current Indonesian and English URLs; they are omitted
when one locale is not SEO-eligible.

If localized English slugs are approved later, the English translation row
would own the locale-specific path slug and its uniqueness, while the source
row would continue to own the Indonesian slug. That change requires a new
route, redirect, canonical, and review contract and is outside this design.

The deployment origin owns the host and scheme. The route manifest owns path
mapping. The source row owns the slug. The translation row owns English
content eligibility, not URL identity. Old aliases never appear in canonical
tags or sitemaps.

### 13.5 SEO metadata ownership

SEO metadata has four separate owners:

1. The source and translation public projections own whether a record is
   eligible and provide the localized title, summary, and translated fields.
2. The locale dictionary owns neutral templates, labels, and fallback-free
   interface text.
3. The route manifest and metadata builder own title composition, description
   selection, canonical paths, hreflang paths, Open Graph locale, robots
   directives, and sitemap inclusion.
4. Deployment configuration owns the canonical origin. It must not be
   invented in a content row.

The initial English title derives from the translated name or title.
The English description derives from the translated summary, or from a
documented excerpt of the translated description when summary is absent.
There is no Indonesian fallback. If the required English content is absent,
the route is not eligible and its metadata is controlled not-found/noindex
metadata.

The current metadata implementation has localized title and description
builders but does not yet provide a complete canonical and alternate URL
contract for the future domain routes. Canonical, hreflang, and sitemap
ownership in this section is therefore a design target, not an existing
implementation capability.

The source slug is used to construct the URL, but it is not used as an
English title. published_at and updated_at are not silently treated as SEO
copy. The initial design derives SEO fields from display translations rather
than adding separate editable seo_title and seo_description fields. Separate
SEO override fields are deferred and are not part of the initial schema.

For structured data, the app uses only eligible English values, current
canonical URLs, trusted media URLs, and source facts that are safe for public
projection. Source and translation publication timestamps retain their
separate meanings.

### 13.6 Search behavior

The current repository has no public search route or public full-text index.
The existing search behavior is limited to administrator destination name
filtering. That admin query is not a public bilingual search contract.

The deferred future public behavior is:

- search is locale-scoped; English searches English-eligible projections and
  Indonesian searches Indonesian projections;
- English search indexes translated title/name, summary, description, and
  other approved T fields, plus dictionary-resolved category labels where
  useful;
- source-only Indonesian prose is never searched or shown as an English
  result;
- archived, unpublished, stale, incomplete, or media-ineligible records are
  excluded;
- source-neutral values such as prices, coordinates, phone numbers, and URLs
  may be displayed as structured result data but are not searched as
  translated prose unless separately approved;
- a result carries its source ID and current locale-specific route, not a
  guessed title-based URL;
- slug changes update the result URL and invalidate old search result caches;
- no machine translation is performed at query time.

A derived public search projection is compatible with Option C if it contains
only eligible records and references typed domain projections. It must not
become a generic translation storage table. Public search is deferred from the
initial implementation sequence. Until a future search phase is approved, the
repository keeps only administrator destination-name filtering and does not
create a public search index. Ranking, stemming, accent-insensitive matching,
category filters, and database-versus-external indexing are future design
work.

### 13.7 Cache invalidation

The current application uses request-level React cache wrappers and targeted
revalidatePath calls. It does not currently establish a persistent bilingual
tag cache or a public search cache. Request memoization is not a freshness
authority; the published views and revision token remain authoritative.

The current Indonesian contract is preserved. Current public dependency routes
are `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata`; current source
and media actions do not uniformly revalidate those public routes. The current
application invalidates only the admin paths listed below, and the existing
Village Profile pilot retains its own public invalidation. Phase 3B cannot
remove or rename any current path. The database never calls Next.js cache APIs
and cache state never changes publication eligibility.

#### Current application cache contract

This table records existing behavior, not a future requirement:

| Current mutation | Current admin paths revalidated | Current public behavior |
| --- | --- | --- |
| Source destination create, update, or source lifecycle action | `/admin/destinasi` and `/admin/destinasi/[id]/edit` | The actions do not revalidate `/`, `/destinasi`, `/destinasi/[slug]`, or `/peta-wisata`; the current loaders read their existing source projections |
| Source image add, reorder, primary change, source caption/alt edit, replacement, or deletion | `/admin/media`, `/admin/media/kelola`, and the affected `/admin/media/[id]/edit` path when an image edit is involved | The actions do not revalidate current public destination routes; existing upload-new-object and cleanup compensation remains unchanged |
| Village Profile source or English translation mutation | `/admin/profil-desa` | Existing actions also revalidate `/profil-desa`, `/en/village-profile`, and `/` |

#### Future Phase 3B application dependency matrix

The following matrix applies only when a future application change adopts the
destination English routes. It must revalidate current Indonesian dependents
when the source-rendered result changes, and must never revalidate a public
English route for a draft-only mutation that cannot alter an already eligible
projection. The future English destination paths are `/en/destinations` and
`/en/destinations/[slug]`; their aggregate dependents are `/en` and
`/en/tourism-map`.

| Future mutation | Admin paths | Current Indonesian dependents | Future English/public dependents | Metadata, sitemap, and media consequence |
| --- | --- | --- | --- | --- |
| Source destination create | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | `/`, `/destinasi`, and `/peta-wisata` when the new source is eligible; no detail path until a slug is public | None until an English translation is explicitly published | Revalidate source projections only; no English SEO or media invalidation without an eligible English row |
| Source destination content or neutral presentation update | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata` as their source projection changes | `/en/destinations`, `/en/destinations/[slug]`, `/en`, and `/en/tourism-map` when an eligible English row depends on the changed source projection | Translation-relevant changes require new review; neutral presentation changes still invalidate rendered dependents but do not require retranslation; metadata and sitemap are recomputed from current eligible rows |
| Source publish (`draft -> published`) | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata` when the source becomes eligible | None until an English translation is explicitly reviewed and published; source publication alone never creates English eligibility | Recompute source metadata and sitemap eligibility; no English entry or media invalidation is created by source publication alone |
| Source archive or unpublish | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata` | `/en/destinations`, `/en/destinations/[slug]`, `/en`, and `/en/tourism-map` | Remove affected metadata and sitemap eligibility; invalidate destination media consumers; parent cascade is authoritative |
| Source restore to draft | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata` | None, because source restore does not make English content eligible | Keep English metadata and sitemap omitted until a reviewed publication; no media invalidation beyond source projection changes |
| Source image add | `/admin/media`, `/admin/media/kelola`, affected destination edit path | `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata` if the source loader renders it | `/en/destinations/[slug]` and aggregate routes only if the source operation changes an eligible parent thumbnail; a non-primary image with no published child causes no English change | Invalidate the changed media collection and any new signed URL; no retranslation for an unreferenced optional child |
| Source image reorder or primary change | `/admin/media`, `/admin/media/kelola`, affected destination edit path | `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata` | Detail and aggregate English routes when gallery order or the parent thumbnail changes; list route when the thumbnail projection changes | Invalidate media collection; primary change changes the parent thumbnail token and requires parent review, while order-only change does not |
| Source image caption/alt edit, replacement, or deletion | `/admin/media`, `/admin/media/kelola`, affected `/admin/media/[id]/edit` path | `/`, `/destinasi`, `/destinasi/[slug]`, and `/peta-wisata` as source media is rendered | `/en/destinations`, `/en/destinations/[slug]`, `/en`, and `/en/tourism-map` when an eligible parent or child consumes the changed media | Invalidate replaced/deleted media identity and collection; media-token change makes the affected child stale and can make the parent stale when it is the thumbnail |
| Parent translation draft save | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | None | None for a never-published draft; the same paths when editing a currently eligible parent withdraws it to draft/stale-ineligible | No metadata or sitemap invalidation for a non-public draft; withdrawal removes the existing English entry and invalidates its media consumers |
| Parent translation review or rejection | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | None | None; review and rejection are non-public states | No public metadata, sitemap, or media invalidation unless the operation also changes an already eligible state, which the RPC disallows |
| Parent translation publish or republish | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | No Indonesian content change | `/en/destinations`, `/en/destinations/[slug]`, `/en`, and `/en/tourism-map` | Add or refresh eligible English metadata and sitemap entries; source media URLs remain the same unless the source token also changed |
| Parent translation unpublish or archive | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | None | `/en/destinations`, `/en/destinations/[slug]`, `/en`, and `/en/tourism-map` | Remove English metadata and sitemap eligibility; invalidate signed media consumers for the destination |
| Parent translation restore to draft | `/admin/destinasi`, `/admin/destinasi/[id]/edit` | None | None; restore never publishes | Keep English metadata and sitemap omitted; no public media invalidation unless the restored row was still erroneously cached |
| Image translation draft save | `/admin/media/[id]/edit`, `/admin/destinasi/[id]/edit` | None | None for a never-published child; detail and aggregate routes when editing a currently eligible child withdraws it | Remove the child from English media projections only when its existing public eligibility changes; no invalidation for an isolated draft |
| Image translation review or rejection | `/admin/media/[id]/edit`, `/admin/destinasi/[id]/edit` | None | None; review and rejection are non-public states | No public metadata or media invalidation unless a prior eligible state is withdrawn by a separate save/unpublish operation |
| Image translation publish or republish | `/admin/media/[id]/edit`, `/admin/destinasi/[id]/edit` | No Indonesian content change | `/en/destinations`, `/en/destinations/[slug]`, `/en`, and `/en/tourism-map` when the child is rendered | Refresh destination metadata where media affects it and invalidate the destination media collection |
| Image translation unpublish or archive | `/admin/media/[id]/edit`, `/admin/destinasi/[id]/edit` | None | `/en/destinations/[slug]` and aggregate routes when the child was rendered | Remove the child media projection and invalidate its signed media consumer; parent remains eligible because gallery children are optional |
| Image translation restore to draft | `/admin/media/[id]/edit`, `/admin/destinasi/[id]/edit` | None | None; restore never publishes | Keep the child omitted until review and publish; no public invalidation beyond defensive cache eviction |

Phase 3B has no public English package, search, or CDN cache. Persistent cache
identity is not part of this design. Request memoization and targeted path
revalidation are optimizations; the published views and revision tokens remain
authoritative. Any later persistent cache must include locale, domain, source
ID, current slug, and the relevant source or translation token. Signed media
URLs remain short-lived and are never persistent cache identity. The current
negative tests that assert the future English route files are absent remain
valid during a database-only Phase 3B change; only the future route
application PR changes those tests.

### 13.8 Media ownership

Media ownership is intentionally split:

- the source image table owns the image row, source parent relation, storage
  bucket, storage path, binary identity, display order, primary flag, revision,
  and source alt_text/caption;
- storage policies own object authorization and the permitted byte-operation
  boundary; media RPCs own upload association, replacement, deletion, and
  metadata synchronization;
- the English image translation child owns English alt_text, English
  caption when needed, locale, review state, source media token, and
  publication metadata;
- the parent translation owns translated entity prose, not the storage
  object;
- the public media delivery layer owns trusted signed URL creation and
  expiry, not the database translation row.

The same source binary may serve Indonesian and English. A locale does not
receive a copied object merely because its alt text differs. A new binary,
changed source caption, or changed source alt text is a media-content
revision. Changing only display order is a presentation change and must
invalidate pages, but does not require retranslation of the image description.
Changing the primary selection is also a presentation change for the child
image, but it changes the parent thumbnail token and therefore requires parent
English review when it changes the selected thumbnail. Direct same-path byte
updates are denied by the target Storage policy; the supported replacement is
new-object upload plus the trusted media RPC, with object cleanup compensation
when the database transaction fails.

The complete source-reference ownership matrix in Section 6.6 is
authoritative. Parent thumbnail bucket/path pairs are cached source references;
the current schema does not guarantee that a pair matches a child image row.
The parent and every child relation remain Storage owners for DELETE
authorization, so an object is removable only when no matrix row references
its exact bucket/path. The destination media RPCs are the Phase 3B metadata
deletion boundary; they delete metadata first and return the old path for the
claim-aware post-commit cleanup flow. No Storage deletion is allowed to leave
a live metadata reference or a published English row with a missing binary.

The parent-thumbnail delivery contract is exact:

- Current Indonesian delivery is unchanged. The existing destination loader
  reads published child-image rows and signs those child references. Existing
  parent-only or mismatched parent paths are not repaired, removed, or newly
  exposed by Phase 3B.
- Future English delivery requires the parent pair, the same-destination
  `destination_images` row, the exact bucket/path equality, and
  `is_primary=true`, as required by `destination_eligible`. The English view
  returns the parent pair only after that ownership proof; the delivery layer
  signs the matching child-owned object. Storage authorization therefore uses
  the existing child publication boundary and never treats a parent-only path
  as an English image.
- `destination_translations.thumbnail_alt_text` always owns the required
  English alt text for the direct thumbnail. `destination_image_translations`
  owns optional English metadata for gallery child images; it is not an
  alternate source for the parent thumbnail alt and is not required merely to
  publish the parent.
- The parent thumbnail bucket/path is excluded from the narrative source
  fingerprint and included in `destination_thumbnail_media_fingerprint_v1`
  together with `thumbnail_binary_revision`. A primary selection, path or
  supported byte replacement, or parent thumbnail-pair change increments the
  thumbnail revision and blocks the parent until review and explicit
  publication/republish.
- Phase 3B migration validation reports every parent-only, mismatched,
  non-primary, missing-object, or invalid-bucket thumbnail. It does not
  silently repair or backfill those rows and does not change Indonesian
  eligibility. Each such destination is English-ineligible until a trusted
  media operation establishes a matching primary child and the parent English
  translation is reviewed against the resulting token.

### 13.9 Publication timestamps

All persisted timestamps use PostgreSQL timestamptz and represent UTC instants.
The database default is statement_timestamp(). Clients cannot supply lifecycle
timestamps. Trusted triggers, source operations, translation RPCs, and media
RPCs are the only mutation authorities.

| Table and column | Type, default, and nullability | Mutation authority | Normative meaning |
| --- | --- | --- | --- |
| destinations.created_at | timestamptz NOT NULL DEFAULT statement_timestamp() | Insert boundary; immutable afterward | Source-row creation instant |
| destinations.updated_at | timestamptz NOT NULL DEFAULT statement_timestamp() | Existing update trigger | Last source-row mutation instant |
| destinations.published_at | timestamptz NULL | Existing source lifecycle trigger | First source publication instant; retained across later updates, archive, and restore |
| destination_images.created_at | timestamptz NOT NULL DEFAULT statement_timestamp() | media_insert; immutable afterward | Source-image creation instant |
| destination_images.updated_at | timestamptz NULL DEFAULT statement_timestamp() for new trusted inserts | destination-image revision trigger on `media_insert` INSERT and on affected child UPDATE statements from `media_update`, `media_replace`, `media_reorder`, and `media_set_primary`; `media_delete` has no deleted-row trigger | Last trusted source-image mutation instant; legacy rows are backfilled from created_at |
| destination_images.updated_by | uuid NULL REFERENCES auth.users(id) | destination-image revision trigger; legacy NULL is preserved | Actor for the last trusted source-image mutation; no historical actor is fabricated |
| destination_translations.created_at | timestamptz NOT NULL DEFAULT statement_timestamp() | destination_translation_save_draft on insert; immutable afterward | English translation-row creation instant |
| destination_translations.updated_at | timestamptz NOT NULL DEFAULT statement_timestamp() | Every destination translation RPC and source cascade | Last trusted translation-row mutation instant |
| destination_translations.reviewed_at | timestamptz NULL | destination_translation_review; cleared when content is edited, rejected, unpublished, archived, or source-blocked | Time the current English content was accepted against the captured source/media tokens |
| destination_translations.rejected_at | timestamptz NULL | destination_translation_reject; cleared on save, review, publish, restore, or archive | Time of the current rejection decision |
| destination_translations.rejected_by | uuid NULL | destination_translation_reject; cleared with rejected_at | Actor for the current rejection decision |
| destination_translations.published_at | timestamptz NULL | destination_translation_publish or destination_translation_republish | Most recent time this English translation became publicly eligible; retained as historical event data after edit or unpublish and replaced on republish |
| destination_translations.published_by | uuid NULL | destination_translation_publish or destination_translation_republish | Actor for the most recent English publication |
| destination_translations.archived_at | timestamptz NULL | destination_translation_archive; cleared by destination_translation_restore or a later publish | Time the current translation archive began |
| destination_image_translations.created_at | timestamptz NOT NULL DEFAULT statement_timestamp() | Image-translation save RPC on insert; immutable afterward | English image-translation creation instant |
| destination_image_translations.updated_at | timestamptz NOT NULL DEFAULT statement_timestamp() | Every image-translation workflow RPC or media freshness operation | Last trusted image-translation mutation instant |
| destination_image_translations.reviewed_at | timestamptz NULL | Image review RPC; cleared when content is edited, rejected, unpublished, archived, or media-blocked | Time the current English media metadata was accepted |
| destination_image_translations.rejected_at | timestamptz NULL | Image rejection RPC; cleared on save, review, publish, restore, or archive | Time of the current image rejection decision |
| destination_image_translations.rejected_by | uuid NULL | Image rejection RPC; cleared with rejected_at | Actor for the current image rejection decision |
| destination_image_translations.published_at | timestamptz NULL | Image publish or republish RPC | Most recent time English image metadata became publicly eligible |
| destination_image_translations.published_by | uuid NULL | Image publish or republish RPC | Actor for the most recent English media publication |
| destination_image_translations.archived_at | timestamptz NULL | Image archive RPC; cleared by image restore or later publish | Time the current image translation archive began |
| destination_translation_review_events.occurred_at | timestamptz NOT NULL DEFAULT statement_timestamp() | Append-only workflow RPC or source cascade | Exact UTC instant of the recorded review, rejection, publication, archive, restore, unpublish, or source-change event |
| destination_image_translation_review_events.occurred_at | timestamptz NOT NULL DEFAULT statement_timestamp() | Append-only image workflow RPC or UPDATE-driven media-change operation; `media_delete` creates no image event | Exact UTC instant of the recorded image workflow or media-change event |

In the current source schema, the publication-history trigger sets
published_at on first publication and preserves it after later published-row
updates, including archive and restore transitions. It is therefore a
historical first-publication timestamp, not a complete source publication
revision history. The bilingual design uses the monotonic source revision
token, not published_at, for stale detection. A separate source-publication
timestamp is not required for the initial rollout.

A translation `publish` RPC is valid only when the target row has
`published_at IS NULL`, meaning it has never been publicly published. A
`republish` RPC is valid only when `published_at IS NOT NULL`, including after
staleness, source blocking, unpublish, archive, or restore. The same rule
applies to parent and image translations. A republish receives a new
`reviewed_at` and `published_at`, records the current actor, and captures a new
source/media token; it does not restore the old English value or timestamp.
`published_at` is the latest successful publication event, while the
append-only event table retains all prior publication timestamps. There is no
`first_published_at` column in Phase 3B. An archive or unpublish does not
rewrite source publication history or erase translation publication history.

For English structured data, datePublished represents English translation
published_at. Source publication may be retained as a clearly labeled source
fact only when the public contract requires it. Sitemap last-modified uses the
latest eligible source revision or translation publication/review revision
relevant to the URL, never a future or hidden draft timestamp. This mapping is
normative for the initial rollout; a later SEO phase may add a separately
approved domain-specific policy.

### 13.10 Rollback behavior

Rollback has three distinct scopes and follows the exact reverse order in
Section 7.

Before application adoption, a schema rollback first verifies that no Phase 3B
table or removable column contains data. It then follows the dependency order
in Section 7.2: stop English route adoption; revoke public view, workflow,
admin-read, and cleanup-RPC grants; drop the public views and those RPCs;
remove new RLS policies and grants; replace the Phase 3B Storage policies with
the old policies while no English view or route is exposed; drop the
relation-local Storage-reference guards and source-cascade,
image-translation-media-cascade, image-revision, source-revision, and
append-only trigger objects; drop their functions, the cleanup claim table,
and then the fingerprint helpers; restore the prior generic media functions;
remove event tables; remove translation-table foreign keys, checks, and
indexes; drop the translation tables; and remove the new revision columns.
The policy replacement removes the dependency on
`private.tourism_media_object_is_unreferenced` and
`private.tourism_media_cleanup_claim_is_valid`; neither helper or the claim
table is dropped before that replacement.
Dependent trigger objects are always dropped before their functions. Existing
Indonesian routes, generic media mappings, protected-admin media SELECT, and
the current upload/cleanup compensation workflow are preserved. The rollback
aborts without changes if any removable table or column is nonempty.

All database rollback statements run in one transaction. External Storage
objects are not deleted by schema rollback and no database rollback claims to
recreate an externally deleted object; existing compensation records and the
unreferenced-object cleanup path remain the recovery boundary.

After application adoption but before public English content, the rollback
keeps all new tables and rows, revokes public view grants, removes English
route exposure, and returns loaders to the previous Indonesian-only or Village
Profile-safe projections. It does not delete drafts, review events, rejected
content, or media objects. The previous application must continue to ignore
the new tables and columns; the source revision and cascade triggers must not
change the existing Indonesian source contract. Keep the Phase 3B Storage
UPDATE denial while any English data remains; restoring it would reopen a
same-path byte mutation that the bilingual freshness model cannot observe.

After any public English publication, schema rollback is non-destructive:
revoke public grants and route exposure, restore the previous application
projection, and retain translation and audit data. Published production
content is not restored by dropping rows or reversing timestamps. A bad source
value is corrected through a new source revision and a new English review and
republish. A bad English value is re-entered as a draft and reviewed again.
Do not restore direct Storage UPDATE while retained English data or its audit
history exists; the old Indonesian permission is recoverable only in a
pre-publication rollback that has removed the English exposure boundary.

Irreversible effects are source revision increments, append-only audit events,
publication timestamps already recorded, and deletion of an external storage
object after a permitted media delete. Those effects require the production
authorization gates in Section 7; this design does not claim that a production
rollback can undo them.

Content rollback must never silently restore a stale or unpublished English
row. To undo a bad source change, restore the source content through the
normal reviewed source workflow; that produces a new source revision and
requires the English translation to be reviewed and republished against it.
To undo a bad translation in the initial rollout, the content owner re-enters
the intended text as a new draft, then obtains review and explicit republish.
The initial rollout supports manual rollback only; it does not
provide translation version history or automatic restoration of a prior
English value. Audit timestamps are not content snapshots. Append-only
translation versions or an approved snapshot store are deferred to a future
content-governance phase.

### 13.11 Soft delete versus archive

The current schema has status values draft, published, and archived. It does
not have deleted_at fields or a general soft-delete protocol.

Archive is the reversible public lifecycle action: the row remains available
to authorized administration, relationships remain intact, and public views
exclude it. Archive is therefore a functional soft unpublish, but it is not a
database deletion marker and must not be treated as one.

Unpublish moves a source or translation out of public eligibility while
leaving it available for correction. For sources, the current and initial
bilingual contract defines unpublish as published to archived. For
translations, unpublish is published or stale to draft/pending. The public
result is the same: no public English eligibility until a new reviewed
publication.

In the current source lifecycle, a published row cannot transition directly
to draft; the existing managed-content trigger permits published to archived,
then archived to draft. Therefore the current operational meaning of source
unpublish is archive. A future direct published-to-draft source action is
deferred and is not part of the bilingual workflow.

Permanent deletion is not part of the Phase 3A bilingual rollout. Existing
foreign keys and the Phase 3B relationship matrix restrict deletion of sources
with dependent translations, relations, images, or audit history. Source and
translation archive is the normal reversible public removal action. The only
Phase 3B hard-delete operation is media_delete for a source image with no
translation or audit dependency; storage cleanup uses the existing compensation
behavior. No source, translation, or audit hard-delete RPC exists.

### 13.12 Lifecycle outcomes for exceptional actions

| Action | Immediate source/translation result | Public English result | Required next step |
| --- | --- | --- | --- |
| Source archived | Source changes to archived; every existing parent translation follows the complete Section 5.2.2 matrix and receives exactly one source-blocked audit event | Omitted from English content projections; SEO may also omit metadata and sitemap entries | Restore source to draft; publish the source again; review every non-archived translation, restore archived translations separately, then publish or republish by `published_at` history |
| Source unpublished | Existing source unpublish is `published -> archived`; the same complete cascade applies even when the token still matches | Immediately omitted; no fallback | Correct the source, restore and publish it again, then review and publish or republish each translation according to its history |
| Translation unpublished | Translation changes from Published or Stale to Draft/Pending while the source remains independent | English record is omitted; Indonesian source is unaffected | Edit, review, and explicitly publish |
| Reviewer rejects | Translation changes from Reviewed to Draft/Rejected with an auditable reason and actor | No English result is exposed | Editor addresses the rejection, requests review again, and receives explicit publication |
| Source restored | Source changes from Archived to Draft; translations remain in their matrix states and are not promoted | English remains blocked | Publish the source, then review every non-archived translation; restore archived translations and review them; use publish only with NULL `published_at`, otherwise republish |
| Translation restored | Archived translation changes to Draft/Pending, never directly to Published | English remains omitted | Complete review and explicit publication; restore is never an implicit publish |

The UI may show a distinct stale, blocked, or rejected label, but the public
projection has only one safe answer: eligible or not eligible. Stale is
derived from the Section 13.3 token algorithm. Rejected is review_state=rejected
with an auditable reason; neither state is an alternative public status.

### 13.13 Decision register

This is the complete decision register. Every item has exactly one status:
Resolved, Deferred, or Production gate. No item in this register is an
undocumented implementation choice. Deferred rows are explicitly outside the
Phase 3B destination migration; Production gate rows are authorization or
release conditions. Neither category is an unresolved technical decision
needed to implement the destination database design. Business appointments and
acceptance assignments are marked `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`.

| ID | Area | Status | Selected value | Rationale and implementation consequence |
| --- | --- | --- | --- |
| D-01 | English slugs | Resolved | Use the source slug as the initial English route alias; localized English slugs are excluded. | Preserves the existing source-owned route contract; English loaders use the source slug and no translated slug column exists. |
| D-02 | Slug redirects | Deferred | No post-publication rename or redirect registry in the initial rollout. | No redirect table or alias behavior is implemented in Phase 3B; future aliases are outside the destination database migration and do not block it. |
| D-03 | Destination field and fingerprint contract | Resolved | Use the complete destination source-field table in Section 13.2 and the exact helper signatures, versions, key order, UTF-8 serialization, six-code-point trim set, CR conversion, NULL/empty rules, array order/duplicate rules, numeric rules, and invalid-legacy fail-closed behavior in Section 13.3. | The Phase 3B engineer uses those contracts without additional field or normalization approval; later domains require their own contract and do not alter the versioned destination helpers. |
| D-04 | Revision storage | Resolved | Add destinations.source_revision and destinations.thumbnail_binary_revision as database-owned bigint counters; add destination_images.binary_revision as a database-owned bigint counter; capture source and media fingerprints in typed translation rows; use nullable legacy media updated_by with no fabricated backfill actor; install the exact source/image revision and cascade triggers; adapt all six generic media RPC definitions in place with the per-operation effects in Section 6.1. | Trusted source/media operations increment counters exactly once under the fixed lock order; overflow fails closed; DELETE has no fabricated image revision/event; destination freshness compares exact fingerprints while counters provide audit and concurrency evidence. |
| D-05 | Stale representation | Resolved | Stale is derived from lifecycle and fingerprint comparison and is never stored as a publication status. | Views and trusted workflow code derive stale from the complete predicate; no freshness reason column is added or treated as an authority. |
| D-06 | Reviewer roles | Resolved | `public.is_admin()` and `auth.uid()` are the only technical authorization boundary; the protected administrator configured in private.app_config may perform content-owner, editor, reviewer, and publisher responsibilities. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: organizational appointment of that actor remains outside the schema. | No new role table, JWT role, or authentication architecture is added; every RPC verifies the technical boundary and records auth.uid(). |
| D-07 | Rejection audit | Resolved | Store the current rejection reason, rejected_at, and rejected_by on the translation row; append the complete event with actor, UTC timestamp, reason, state pair, source/media revision, and fingerprint in the typed review-event table; protect `public.destination_translation_review_events` and `public.destination_image_translation_review_events` with their separate named relation-local BEFORE UPDATE OR DELETE FOR EACH ROW trigger functions. | Rejection history is database-enforced append-only and retained; a nonblank reason and actor are mandatory and the row returns to draft/rejected. |
| D-08 | Translation history | Deferred | Initial content rollback is manual re-entry, review, and republish; no version table exists. | No version-history table is created in Phase 3B; event history is lifecycle evidence, not a content snapshot. |
| D-09 | Media alt ownership | Resolved | Parent translations own required direct-thumbnail alt text; destination_image_translations own destination-image alt and caption; source Indonesian alt text is never an English fallback. | Missing parent thumbnail alt blocks the parent; missing optional gallery child alt omits only that image. |
| D-10 | Media revisions and Storage byte authority | Resolved | New image rows start binary_revision at 1; supported new-object replacement, path, source caption, and source alt changes increment it once; order and primary selection do not increment it; deletion has no later row revision. Direct same-path Storage UPDATE is revoked, direct DELETE is allowed only when the required unreferenced helper and exact deleting claim both pass, every storage reference is covered by the matrix and lock guard, parent-only English thumbnails are fail-closed, and the image-media-cascade trigger owns child stale suppression. | Existing media RPC names remain the source metadata authority through in-place destination-branch replacement; current upload-new-object behavior remains compatible; media fingerprints make affected English rows stale; deletion is FK-blocked when dependent history exists and the six compensation cases are coordinated without a cross-service ACID claim. |
| D-11 | Contact localization | Deferred | No contact translation table is created in Phase 3B; contact localization belongs to 3I and can cover only approved labels/descriptions. | Phone, URL, type, and consent remain source values until that phase. |
| D-12 | Site settings | Resolved | Site settings remain shared source projection or dictionary data; no site-settings translation table exists. | Phase 3B creates no arbitrary JSON translation payload. |
| D-13 | Deferred entities | Deferred | Articles, customary-institution content, and gallery remain inventory-only with no active English route. | No translation table, route, or migration for those entities is included in Phase 3B. |
| D-14 | Package relation notes | Deferred | Relation-note localization is excluded until 3F; Phase 3B has no relation-note translation. | Package work later uses an explicit relation-note contract and does not change destination schema. |
| D-15 | Search | Deferred | No public bilingual search index exists in the initial sequence; administrator destination-name filtering remains the only search behavior. | Phase 3B creates no search table or index. |
| D-16 | Cache | Resolved | Preserve the current admin-only invalidation behavior and use the separate future Phase 3B dependency matrix in Section 13.7; no persistent bilingual tag, search, CDN, TTL, or tag-name contract exists. | Draft-only mutations do not invalidate public routes unless they withdraw an already eligible row; future route adoption extends current Indonesian invalidation without making cache state an eligibility authority. |
| D-17 | SEO overrides | Resolved | SEO title and description derive from eligible translated display fields; no editable SEO override columns exist. | Metadata cannot create content eligibility and no SEO table is added. |
| D-18 | SEO dates | Production gate | Use translation published_at for English datePublished and the latest eligible source or translation revision for sitemap last-modified. | This mapping is fixed for implementation; production SEO activation still requires the production gate. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: release activation is separate from database eligibility. |
| D-19 | Canonical origin | Production gate | Deployment configuration supplies the approved production host, scheme, and environment policy. | Origin is not stored in content and is not a publication prerequisite; production indexability waits for release approval. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: the approved production host is an operations decision, not a publication predicate. |
| D-20 | Locale expansion | Deferred | Locale en is the only stored translation locale and no Indonesian fallback exists. | Additional locales require a later locale contract and no arbitrary locale rows are accepted now. |
| D-21 | Derived-page omission | Resolved | Derived pages omit ineligible items individually; an ineligible primary detail source returns controlled not-found. | No route loader invents fallback content. |
| D-22 | Neutral source values | Resolved | IDs, coordinates, URLs, phone numbers, numeric prices, dates, booleans, ordering, featured state, and consent remain source projection values; the exact destination fingerprint list controls freshness. | The field contract, not an implementation guess, determines whether a source change triggers review. |
| D-23 | Archive restoration | Resolved | Source archive/unpublish applies the complete draft, reviewed, rejected, published-fresh, published-stale, and archived matrix in Section 5.2.2; source restore lands in draft without promotion; translation restore lands in draft/pending; review and publish or republish remain explicit. | The named source cascade trigger and workflow RPCs enforce the sequence atomically and retain publication history. |
| D-24 | Permanent deletion | Deferred | No source, translation, or audit hard-delete RPC exists; media_delete is allowed only without dependent translation or audit rows. | Archive is the normal removal action and FK restrictions preserve history. |
| D-25 | Version 1.1 priority and first workstream | Resolved | Destination is the sole Phase 3B implementation workstream; later phases follow the route/domain sequence in Section 9. | No engineer expands Phase 3B into another entity or creates later-domain tables. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: later prioritization does not change this database contract. |
| D-26 | English route names and labels | Resolved | Preserve the exact route names in Section 2.7: /en/destinations, /en/destinations/[slug], /en/traditional-houses, /en/traditional-houses/[slug], /en/cultural-events, /en/cultural-events/[slug], /en/local-businesses, and /en/local-businesses/[slug]. Dictionary labels and breadcrumbs use the route matrix; no rename occurs. | Phase 3B destination uses /en/destinations and /en/destinations/[slug]; no route alias or route-name decision remains. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: future route-label preferences cannot alter the Phase 3B route contract. |
| D-27 | Terminology and proper names | Resolved | Source proper names remain unchanged unless the content owner enters an explicit English form; fixed category labels are dictionary-owned; no machine translation or Indonesian fallback is permitted. | The protected administrator applies this rule during review and the translation rows store only reviewed English content. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: factual terminology acceptance is a content responsibility, not a missing schema choice. |
| D-28 | Translation administration | Resolved | Use the existing embedded administrator workflow at /admin/destinasi and /admin/destinasi/[id]/edit, with media at /admin/media and /admin/media/[id]/edit; all writes use the exact Section 6.6 RPCs and existing source-media SELECT compatibility. | No dedicated translation application, role hierarchy, or direct new-table write is introduced. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: the administrator's operational assignment does not alter RLS or function signatures. |
| D-29 | Concurrency and source-review confirmation | Resolved | Every translation row has edit_revision bigint; mutation RPCs require the expected value; revision helpers, source/media cascades, and review/publication RPCs lock the fixed relation order and recompute exact tokens inside the same transaction; Storage cleanup and every reference writer serialize the exact bucket/path through the claim lease and transaction-scoped advisory lock. | Lost writes, source mutations without cascade, publication against a changed source, and reference-registration-versus-Storage-delete races are rejected atomically at their respective database boundaries. |
| D-30 | Unavailable versus not-found | Resolved | Ineligible primary sources use controlled not-found; derived pages omit ineligible items; missing dictionaries and route pairs use the locale route contract. | No unavailable state becomes a public fallback and no Indonesian content is substituted. |
| D-31 | Content ownership and acceptance | Resolved | The protected administrator is the technical content-owner, reviewer, and publisher principal. Database evidence is recorded in supabase/tests/database, application evidence in tests, and implementation review evidence in the Phase 3B change review. `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: business acceptance and appointment remain separate from database authorization. | The technical evidence and RPC boundary are fixed; these assignments do not authorize production migration, deployment, or public content publication. |

D-28 is independently bounded as follows: current source and media mutations
continue to use the existing administrator paths and their existing admin-only
revalidation; the destination translation RPCs and English route invalidation
are future application-adoption behavior. Section 13.7 is authoritative when
the current and future cache contracts are read together, so no current public
English path or nonexistent translation UI is assumed.

### 13.13.1 Decision consistency matrix

This matrix checks the decisions most likely to conflict with the repository's
existing media, authorization, pilot, and Phase 3A contracts. `PASS` means no
technical design choice remains for the Phase 3B engineer. A stakeholder
assignment noted in a row is explicitly not a database design blocker.

| Decision | Status | Compatible with / evidence | Potential conflict | Resolution |
| --- | --- | --- | --- | --- |
| D-03 | PASS | Sections 6.1, 13.2, and 13.3 define the exact destination columns, translation fields, helper signatures, versions, ordered keys, UTF-8 serialization, normalization, invalid-input behavior, and canonical fingerprint inputs. | Earlier generic field descriptions could imply that every source field is translated, and generic trimming could be interpreted differently by two implementations. | The versioned helper contracts and destination-v1 field table are authoritative; neutral and operational fields remain source projection values, and the explicit byte contract is the only normalization contract. |
| D-04 | PASS | Sections 5.2, 6.1, 6.1.1, 6.6.1, and 13.3 define database-owned counters, overflow, fixed per-RPC trigger effects, locks, source/image cascades, and truthful historical actor handling. | Existing destination_images has no historical updated_by and existing generic media RPCs do not carry it; DELETE has no UPDATE trigger. | Keep updated_by nullable, backfill only updated_at from created_at, replace the destination branches in place, and let the named row triggers plus explicit DELETE RPC own future source/media operations. |
| D-06 | PASS | Sections 5.3, 6.6, and 6.7 retain the existing `public.is_admin()`/`auth.uid()` boundary. | The same Auth identity performs several business responsibilities. | Technical authorization remains one protected administrator; `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: organizational role separation may be decided later without changing this design. |
| D-07 | PASS | Sections 5.2, 6.1, 6.1.1, and 6.6.1 define rejected_at, rejected_by, reason, event actor, immutable event history, and the separate parent/image relation-local append-only trigger targets and grants. | Current pilot has no equivalent rejection event table. | The rejection contract applies only to new destination translation tables; Village Profile remains the documented legacy exception, and neither event table can be updated or deleted by a normal caller. |
| D-10 | PASS | Sections 5.2.1, 6.1, 6.1.1, 6.6, 7.1, 13.3, 13.8, and the Storage ownership matrix define A-H media effects, child cascade boundaries, all storage references, helper privilege, claim lease, race prevention, and parent-thumbnail delivery. | Existing Storage policy permits direct administrator UPDATE and broad DELETE; the schema permits parent-only thumbnail paths. | Revoke UPDATE, require both the exact unreferenced helper and a live deleting claim for DELETE, guard every reference writer with the same object lock, and fail English eligibility closed for parent-only/mismatched thumbnails; Indonesian delivery remains unchanged. |
| D-25 | PASS | Sections 1, 6.1, 7.1, and 9 restrict Phase 3B to destination and destination-image translation objects. | The repository contains many other public entities. | No later-domain table or migration is included; `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: later prioritization cannot expand this migration. |
| D-26 | PASS | Sections 2.1, 2.7, and 13.4 enumerate current source routes and exact English target routes. | English destination routes do not yet exist in application code. | The routes are future application-adoption paths and do not change source slug ownership or current Indonesian routes. |
| D-27 | PASS | Sections 5.3, 13.2, and 13.5 prohibit machine translation and Indonesian fallback. | Proper-name treatment requires human/content judgment. | The database stores only reviewed English text; `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: factual terminology acceptance is a content responsibility. |
| D-28 | PASS | Sections 6.6, 6.6.1, and 13.7 identify existing admin routes, retained source-media reads, exact RPCs, and cache responsibilities. | No translation UI or English route is currently implemented. | The document specifies the future application call boundary without authorizing implementation; no direct new-table DML is needed. |
| D-29 | PASS | Sections 5.2, 6.1, 6.6, 6.6.1, 7.1, and 13.3 define edit_revision, expected values, lock order, token recomputation, cleanup claims, and reference-write serialization. | A concurrent source/media mutation or cleanup-versus-registration race can occur across database and Storage transactions. | Database review/publication mismatches abort their transaction; Storage cleanup holds the exact object lock through policy evaluation and DELETE while all reference writers reject the live claim, so no cross-service ACID guarantee is needed. |
| D-30 | PASS | Sections 5.4, 13.3, 13.4, and 13.11 define controlled not-found, omission, no fallback, and source-owned slug behavior. | Route, cache, and SEO systems could otherwise be mistaken for eligibility. | The database view predicate remains authoritative and independent of canonical URL, sitemap, hreflang, origin, or cache. |
| D-31 | PASS | Sections 5.3, 6.7, 7.1, 9, and 10 define evidence and separate merge-quality from production gates. | Business acceptance and technical authorization are different responsibilities. | Technical evidence and function ownership are fixed; `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`: business appointment and production approval remain separate. |

No row in this matrix authorizes implementation, migration, deployment, or
content publication. Production migration, deployment, and content publication
remain separate actions requiring the gates in Sections 7 and 3L.

### 13.14 Self-review conclusion

Phase 3B destination database design is IMPLEMENTATION-COMPLETE.

The design is implementation-complete for Phase 3B database and schema work
within the destination scope. Its boundaries remain strict: typed domain
ownership, explicit translation relevance, deterministic freshness, source-owned
routing, locale-owned SEO presentation, safe media ownership, and separate
merge versus production authorization. The only non-technical assignments are
marked `STAKEHOLDER DECISION — NOT A DATABASE DESIGN BLOCKER`. Later domains
remain outside this contract and require their own documented field and
lifecycle additions.

This self-review changes documentation only. It does not modify application
code, create migrations, generate SQL, access Supabase, stage changes, commit,
push, or create a pull request.
