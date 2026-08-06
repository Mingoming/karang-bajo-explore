# Bilingual Public Rollout Plan

## 1. Status and decision gate

This document is the Phase 3A documentation and contract audit for a proposed
full bilingual public-content workstream.

| Decision area | Current position | Meaning |
| --- | --- | --- |
| Implementation status | Proposed planning only | No English domain route, translation table, migration, or admin workflow is authorized by this document. |
| Scope approval | Pending explicit stakeholder decision | The authoritative `docs/MVP_RELEASE_SCOPE.md` records “Version 1.0 scope approval: Pending explicit stakeholder decision” and “Current decision status: Pending explicit stakeholder approval.” Full bilingual rollout remains outside that documented Version 1.0 scope boundary. |
| Target release | Version 1.1 or another post-V1 release | The release target remains a proposal and has no committed delivery date. |
| Production authorization | Not granted | No production deployment, hosted read-only inspection, database mutation, or content publication is authorized. |
| Content approval | Pending per domain | No English tourism or cultural content may be invented, machine-translated, or published without an authorized source and reviewer. |

The existing English public shell and Village Profile pilot are implemented
baseline capabilities. They are not evidence that the remaining English
domains are complete or that a full rollout has stakeholder approval.

The four concepts below remain separate throughout this plan:

1. implementation status;
2. release-scope approval;
3. production authorization; and
4. content and terminology approval.

Merging or reviewing this document is not rollout approval, a change to the
documented Version 1.0 scope boundary, production authorization, database
mutation approval, or English content publication approval.

## 2. Current-state inventory

### 2.1 Repository baseline

The audited baseline is branch
docs/full-bilingual-public-rollout at HEAD
f2226bd56081293b5002f0339a07acfc0a04cbd2. The root-level app directory is
the App Router directory; src/app is not used. The checked-out dependency
versions are Next.js 16.3.0, React 19.2.4, TypeScript 5.x, ESLint 9.x, and
eslint-config-next 16.3.0.

The repository has no generated database types in types/. Existing source
types are feature-local TypeScript types. The current database migration
boundary ends at
supabase/migrations/20260804065739_village_profile_translation.sql.

### 2.2 Locale implementation

The repository contains a custom locale mechanism, not a confirmed
internationalization framework:

- lib/i18n/locale.ts defines the id and en locale types and derives the
  locale from the pathname.
- proxy.ts injects a sanitized internal locale header and preserves the
  existing authentication/session-refresh boundary.
- lib/i18n/dictionaries.ts contains typed Indonesian and English interface
  dictionaries.
- config/public-routes.ts contains a ten-key semantic route manifest.
- config/public-navigation.ts omits a locale route when the manifest has no
  approved counterpart.
- components/public/language-switcher.tsx renders a reciprocal link only when
  the current path has a known counterpart.

No next-intl, react-intl, global getDictionary helper, browser-language
redirect, or locale-prefixed admin/auth flow was found. The English homepage
uses static dictionary copy and a narrow, language-neutral contact/platform
projection. It does not load Indonesian tourism descriptions.

### 2.3 Indonesian public route inventory

The current Indonesian public route families are:

| Domain | List or singleton route | Detail route | Current source behavior |
| --- | --- | --- | --- |
| Homepage | / | None | Combines the published Village Profile excerpt and six published domain collections. |
| Village Profile | /profil-desa | None | Reads the published Village Profile projection. |
| Destinations | /destinasi | /destinasi/[slug] | Reads published_destinations and published destination images. |
| Homestays | /homestay | /homestay/[slug] | Reads published_homestays and published homestay images. |
| Traditional houses | /rumah-adat | /rumah-adat/[slug] | Reads published_traditional_houses and published traditional-house images. |
| Cultural events | /acara-budaya | /acara-budaya/[slug] | Reads published_cultural_events and published cultural-event images. |
| Tourism packages | /paket-wisata | /paket-wisata/[slug] | Reads published_tourism_packages and published package relations/images. |
| UMKM | /umkm | /umkm/[slug] | Reads published_umkms and published UMKM images. |
| Tourism map | /peta-wisata | None | Combines published destinations, homestays, UMKM, and traditional houses with valid coordinates. |
| Official contacts | /kontak | None | Reads published_contacts and public_site_settings through the existing public-safe boundary. |

The current App Router files are grouped under app/(public), so the route
group name does not appear in the URL.

### 2.4 Existing English pages

The implemented English content pages are exactly:

- /en, implemented by app/en/page.tsx;
- /en/village-profile, implemented by app/en/village-profile/page.tsx.

app/en/[...notFound]/page.tsx is a catch-all not-found route that invokes
notFound(). It is not an implemented translated content page and must not be
counted as one. app/en/loading.tsx, app/en/error.tsx, and app/en/not-found.tsx
are English state handlers; app/en/error.tsx remains the route error
boundary/state handler, not the catch-all not-found route.

The current English behavior is:

- /en renders the localized shell, static availability copy, and approved
  language-neutral contact/platform links.
- /en/village-profile queries only the
  published_english_village_profiles view.
- A missing English Village Profile projection calls notFound().
- A technical query failure throws a route error.
- The English Village Profile metadata is localized and uses no Indonesian
  descriptive fallback.
- The English language switcher currently exposes only the reciprocal home and
  Village Profile links.

### 2.5 Existing Village Profile translation pilot

The reviewed pilot in
supabase/migrations/20260804065739_village_profile_translation.sql provides
the primary repository reference:

- public.village_profile_translations is one explicit table with a foreign
  key to public.village_profiles and a unique source/locale pair.
- The locale is constrained to en.
- The table uses draft, published, and archived publication states.
- New rows begin as draft.
- The database lifecycle trigger prevents editing non-draft translated fields
  and captures publication metadata server-side.
- Publication requires the Indonesian source to be published, requires name
  and description, and requires every translated field whose source field is
  populated.
- source_updated_at_at_publish records the source updated_at value at
  publication.
- public.published_english_village_profiles joins the published Indonesian
  source and the published English row and requires the source timestamp to
  match. This suppresses stale English publication without copying Indonesian
  descriptive fields into the English projection.
- The base table is protected by RLS and is not anonymously readable.
- Anonymous and authenticated public reads use the column-limited view.
- Administrator actions use explicitly granted RPCs for saving a draft,
  publishing, archiving, and restoring.
- Direct application table mutations and anonymous RPC execution are denied.

The application reference is split between
features/village-profile-translation and
features/public-village-profile. The English form is embedded in the existing
Indonesian admin Village Profile page. The public loader maps only the
approved projection, normalizes coordinates and map URLs, and classifies
ready, not-found, and technical-error results.

Reusable patterns are the explicit source foreign key, source/locale
uniqueness, server-captured source freshness, lifecycle-gated publication,
RLS, administrator-only RPC mutation, and a public-safe projection.
Village Profile singleton behavior, its exact fields, the embedded admin
placement, and its one-row invariant are specific to that pilot and must not
be copied blindly to repeatable domains.

## 3. Scope and non-scope

### 3.1 Proposed scope

If stakeholders approve a post-V1 workstream, it may cover:

- English list and detail projections for the approved tourism domains.
- Explicitly maintained English translations linked to Indonesian source rows.
- Independent translation lifecycle and stale-source suppression.
- English public list/detail routes, language switching, metadata, sitemap,
  navigation, map, contact, and homepage integration.
- Dedicated tests for database authorization, public projections, application
  states, SEO, accessibility, and Indonesian regression.

### 3.2 Explicit non-scope for this document

This Phase 3A change does not:

- create an application route;
- create or modify a React component;
- create a migration or change database schema;
- change the Version 1.0 release boundary;
- translate or publish tourism, historical, or cultural content;
- add machine translation;
- add English slugs;
- access local or hosted Supabase;
- run Supabase CLI commands;
- install, update, or remove dependencies;
- modify package.json or package-lock.json;
- change the existing Village Profile pilot;
- authorize production deployment or content publication.

General Cultural Articles, Bayan Customary Institution Articles, and a
standalone gallery have no current public route implementation and are not
silently added to this plan.

## 4. Target bilingual route contract

The following names are proposed counterparts, not approved routes. No route
is created in Phase 3A.

| Indonesian route | Proposed English route | Recommendation and open naming decision |
| --- | --- | --- |
| / | /en | Retain the existing implemented pair. |
| /profil-desa | /en/village-profile | Retain the existing pilot name. |
| /destinasi | /en/destinations | Recommended for clear tourism semantics. Stakeholders should confirm the plural noun. |
| /destinasi/[slug] | /en/destinations/[slug] | Recommended source-slug detail pairing. |
| /rumah-adat | /en/traditional-houses | Recommended because the current domain means more than generic houses. |
| /rumah-adat/[slug] | /en/traditional-houses/[slug] | Recommended source-slug detail pairing. |
| /acara-budaya | /en/cultural-events | Recommended; event terminology needs cultural-owner review. |
| /acara-budaya/[slug] | /en/cultural-events/[slug] | Recommended source-slug detail pairing. |
| /paket-wisata | /en/tour-packages | Recommended over the ambiguous /en/packages. |
| /paket-wisata/[slug] | /en/tour-packages/[slug] | Recommended source-slug detail pairing. |
| /homestay | /en/homestays | Recommended plural navigation label and stable domain meaning. |
| /homestay/[slug] | /en/homestays/[slug] | Recommended source-slug detail pairing. |
| /umkm | /en/local-businesses | Recommended for visitor clarity; stakeholders must confirm how the official UMKM term is presented. |
| /umkm/[slug] | /en/local-businesses/[slug] | Recommended source-slug detail pairing. |
| /peta-wisata | /en/tourism-map | Recommended over the ambiguous /en/map. |
| /kontak | /en/contact | Recommended as the singular public information destination. |

Destination category filtering should remain a filter of the destinations
collection, using the existing stable category slugs, rather than adding
three new top-level English routes. Whether the visible category labels remain
the official Indonesian names or receive approved English labels is an
unresolved terminology decision.

The English route names must be confirmed together with:

- the public navigation labels;
- breadcrumb labels;
- route-switching behavior;
- sitemap inclusion;
- canonical and alternate URLs after a production origin is approved.

## 5. Translation content contract

### 5.1 Common rules

For every translated domain:

1. The Indonesian source row remains authoritative.
2. The English row is editorial content, not a computed machine translation.
3. No automatic machine translation is allowed.
4. English pages never silently fall back to Indonesian body text, summaries,
   labels, captions, or metadata descriptions.
5. Only an explicitly published and source-current English row is public.
6. Missing translations are omitted from English collections. A requested
   detail with no current translation uses the documented English not-found
   behavior so that an Indonesian source is not exposed as a misleading
   substitute.
7. Translation status is independent of Indonesian source status but public
   publication requires both records to be eligible.
8. Every translation references exactly one source record and one locale.
9. A reviewed source-revision strategy determines when a published
   translation becomes stale until a reviewer confirms it against the new
   source.
10. Source archival, unpublishing, or deletion removes the English projection
    from public reads. Version 1 has no permanent-delete workflow.
11. Proper names, customary terms, titles, cultural names, and locally
    specific terminology require an approved editorial policy and review.
12. Source and translation timestamps must be retained for audit and stale
    detection without exposing private audit identities publicly.

### 5.2 Candidate field rules

Candidate translated fields are natural-language fields such as names,
titles, summaries, descriptions, histories, visitor information, facilities,
price notes, event notes, contact labels, and SEO title/description. They are
not approved translations; each domain gate must confirm the exact field
list.

Identifiers, source foreign keys, locale codes, stable source slugs, numeric
prices, capacities where present, coordinates, URLs, phone numbers, media
references, ordering flags, timestamps, and publication controls may remain
shared when their repository schema confirms that they are not language
content. An operational or address field stored as free text is not
automatically locale-neutral merely because it describes a real-world value.

If an English page cannot provide an approved English rendering of a
descriptive field, it must omit that field or use the domain's documented
unavailable state. It must not print the Indonesian value as a fallback.

### 5.3 Media contract

Existing public media is attached through entity-specific image tables and
published-safe image views. Public loaders batch short-lived signed media URLs
server-side; signed URLs are not persisted or used as metadata URLs.

English pages may reuse an approved source image reference when the source
entity and its English translation are both eligible. Reusing a file does not
authorize copying Indonesian caption or alt text into English. Every
informative image actually rendered on an English page must have approved
English alternative text. Decorative images must use the documented
decorative-image behavior and must not receive invented descriptive text.
Indonesian alt text must not silently appear as an English fallback. English
captions are optional only when the content contract says they are not
displayed. Each domain must separately decide where English alt-text and
caption data are stored, whether missing English alt text suppresses only
that media item or blocks publication of the parent translation, and how
primary-image and collection-card eligibility behave when translated media
text is unavailable.

## 6. Domain-by-domain contract audit

The entries below describe confirmed current evidence followed by proposed
investigation and implementation boundaries. Proposed fields and schema
directions are not migrations.

### 6.1 Destinations

- Current routes: /destinasi and /destinasi/[slug]. Admin pages and actions
  exist under admin/destinasi. The destination category rows are read-only
  seeded data.
- Source and current projection: destinations and destination_images are
  exposed through published_destinations and
  published_destination_images. features/public-destinations/data.ts also
  reads destination_categories.
- Candidate English content: name, summary, description, history, opening
  hours, price note, facility items, and any approved visitor-facing contact
  name. Category labels require a terminology decision.
- Shared values: source id, category id, source slug, latitude, longitude,
  Google Maps URL, entrance fee, contact phone, consent result, media
  references, featured flag, display order, and publication timestamps.
- No fallback: Indonesian description, summary, history, facilities, price
  note, contact label, image caption, image alt text, and metadata
  description must not appear on an English route without an approved
  English contract.
- Media and slug: reuse published destination image references; prefer the
  existing source slug for the English detail route. Do not create an English
  slug in this phase.
- List/detail projection: a list returns only destinations with a current
  published translation and shared published-safe fields. A detail is keyed
  by the source slug and joins the current translation, category policy, and
  eligible media. The category filter must not return an Indonesian-only
  item in an English result.
- Metadata and stale behavior: title and description come from the current
  English translation or approved static collection copy. The selected
  source-revision strategy determines which source updates suppress the
  English row; source status, archival, unpublication, deletion eligibility,
  and translated semantic changes always suppress outdated English content.
- Admin and schema concerns: a likely dedicated destination translation
  table needs a destination_id foreign key, locale=en constraint, unique
  source/locale pair, translated text fields, optional translated SEO fields,
  lifecycle state, source revision marker, timestamps, audit fields, RLS,
  administrator-only mutation, and a public-safe projection. The exact
  treatment of media text and categories is unresolved.
- Tests: constraints and publication completeness; category and slug
  pairing; public list/detail; images; stale suppression; consent-safe
  contact fields; metadata; language switching; no Indonesian fallback;
  administrator denial and lifecycle tests.

### 6.2 Destination categories

- Current source: destination_categories contains only the fixed seeded rows
  Alam, Budaya, and Religi. The migration constrains their names and slugs;
  the dashboard has no category CRUD workflow.
- Proposed English behavior: retain stable category slugs for filtering.
  Visible English category labels require an approved term policy. They may
  be finite interface dictionary values or stored translations, but this plan
  does not choose a translated label.
- Shared values: category id, slug, fixed ordering, and relationship to a
  destination.
- No fallback: do not silently present a guessed English meaning for a
  cultural or official category name.
- Schema and admin concerns: no translation table is needed for the map or
  filter if stakeholders approve a finite dictionary mapping. A category
  translation table would require a category_id foreign key, locale
  constraint, unique pair, RLS, and published projection. No category admin
  workflow should be added without scope approval.
- Tests: fixed-row integrity, filter slug behavior, approved label parity,
  and no accidental category mutation.

### 6.3 Traditional houses

- Current routes: /rumah-adat and /rumah-adat/[slug]. Admin pages and actions
  exist under admin/rumah-adat.
- Source and current projection: traditional_houses and
  traditional_house_images are exposed through
  published_traditional_houses and published_traditional_house_images.
- Candidate English content: name, summary, description, history, cultural
  significance, location name, and visitor information. Proper names and
  culturally specific terms require review.
- Shared values: source id, source slug, coordinates, Google Maps URL, media
  references, featured flag, order, and publication timestamps. The applied
  schema has no contact, price, or consent fields for this entity.
- No fallback: Indonesian cultural explanation, history, visitor
  information, location text, captions, and alt text are not English
  content.
- Media and slug: reuse approved image files and source slug; require an
  English media-text decision before showing informative media.
- Projection and stale behavior: list/detail results join only current
  published translations to the published-safe source projection. Source
  archival, unpublication, or deletion eligibility always removes the
  English result; other source updates follow the selected source-revision
  strategy.
- Admin and schema concerns: a dedicated translation table keyed by
  traditional_house_id is the likely direction. It needs explicit
  translated fields, source/locale uniqueness, lifecycle, source revision,
  RLS, admin RPC boundary, safe archive/restore, and public column
  allowlisting.
- Tests: cultural-field completeness, placeholder rejection, RLS, lifecycle,
  source freshness, route not-found behavior, media reuse, metadata, and
  Indonesian regression.

### 6.4 Cultural events

- Current routes: /acara-budaya and /acara-budaya/[slug]. Admin pages and
  actions exist under admin/acara-budaya.
- Source and current projection: cultural_events and
  cultural_event_images are exposed through published_cultural_events and
  published_cultural_event_images. Published rows require a confirmed
  start_at and the application presents times in Asia/Makassar.
- Candidate English content: title, summary, description, event type,
  date note, location name, address, organizer, and visitor information.
  Event names and cultural terminology require authorized review.
- Shared values: source id, source slug, start/end instants, all_day,
  coordinates, Google Maps URL, contact phone subject to consent, media
  references, publication status, and timestamps. Date formatting is
  localized presentation of shared instants, not a second invented date.
- No fallback: Indonesian event explanations, date notes, locations,
  organizer labels, visitor information, captions, and metadata cannot
  appear in English output without review.
- Media and slug: reuse source event media and source slug. A translation
  does not change event timing or consent rules.
- Projection and stale behavior: an English event is public only when the
  source remains published with a confirmed date and the English row is
  published and current. Date-note-only records remain unavailable.
- Admin and schema concerns: a dedicated cultural_event_id translation table
  should preserve the source time semantics while translating only approved
  text. Review must cover time display, source revision, status transitions,
  contact consent, RLS, and public projection.
- Tests: WITA rendering, date and location fields, stale suppression,
  publication completeness, contact consent, route pairing, metadata,
  not-found/error states, and permission denial.

### 6.5 Tourism packages

- Current routes: /paket-wisata and /paket-wisata/[slug]. Admin pages and
  actions exist under admin/paket-wisata.
- Source and current projection: tourism_packages,
  package_destinations, and package_images are exposed through
  published_tourism_packages, published_package_destinations, and
  published_package_images. The application uses transactional package RPCs
  for administrator mutations.
- Candidate English content: package name, summary, description, duration
  unit label, price note, included facilities, souvenir information,
  package-specific destination notes, and approved package-type labels.
- Shared values: package id, source slug, package type token, duration
  value, price, relation ids and order, destination ids, media references,
  featured/order flags, and timestamps. The related destination identity
  must come from a current English destination projection or be omitted.
- No fallback: Indonesian package descriptions, facility names, souvenir
  text, relation notes, destination names, and metadata cannot be shown on
  an English package route.
- Media and slug: reuse package media and the source slug. Package
  itinerary order is shared; translated destination names require their own
  current destination translations.
- Projection and stale behavior: a package list/detail must join current
  package translation and only current English destination relations. A
  package with no translatable eligible itinerary must follow an explicit
  availability rule rather than silently showing Indonesian stops.
- Admin and schema concerns: a likely package_id translation table needs
  package text fields, source/locale uniqueness, source revision, lifecycle,
  RLS, and safe RPC mutation. Translation of relation notes may require a
  relation-specific child table or an explicit omission rule. No duplicated
  localized package table should be introduced without a separate decision.
- Tests: transactional source/translation publication, relation ordering,
  hidden destination suppression, stale source changes, public projection,
  price neutrality, route metadata, and admin authorization.

### 6.6 Homestays

- Current routes: /homestay and /homestay/[slug]. Admin pages and actions
  exist under admin/homestay.
- Source and current projection: homestays and homestay_images are exposed
  through published_homestays and published_homestay_images.
- Candidate English content: name, description, address presentation, price
  note, facilities, and any approved visitor-facing label. Owner names are
  proper-name data unless an authorized policy says otherwise.
- Shared values: source id, source slug, owner/manager proper name where
  unchanged, phone, coordinates, Google Maps URL, numeric price per night,
  consent result, media references, featured/order flags, and timestamps.
- No fallback: Indonesian descriptions, facilities, address prose, price
  notes, captions, alt text, and metadata descriptions are not English
  output.
- Media and slug: reuse approved homestay images and source slug. No booking,
  availability, or inventory behavior is added by this plan.
- Projection and stale behavior: only a current published translation may
  contribute an English list card or detail. Untranslated homestays are
  omitted from English collections.
- Admin and schema concerns: a dedicated homestay_id translation table
  should preserve consent and numeric values from the source while
  separately managing translated text, source freshness, lifecycle, RLS,
  administrator mutation, and public projection.
- Tests: consent-safe contacts, coordinate pairing, price display,
  lifecycle, stale suppression, list/detail state behavior, media, metadata,
  and Indonesian regression.

### 6.7 UMKM and local businesses

- Current routes: /umkm and /umkm/[slug]. Admin pages and actions exist under
  admin/umkm.
- Source and current projection: umkms and umkm_images are exposed through
  published_umkms and published_umkm_images.
- Candidate English content: business name presentation, category,
  description, address presentation, and approved contact labels.
  Business and product names may be proper names and require an editorial
  decision rather than literal translation.
- Shared values: source id, source slug, owner/contact names when retained
  as proper names, phone/WhatsApp values, coordinates, Google Maps URL,
  consent result, media references, featured/order flags, and timestamps.
- No fallback: Indonesian business descriptions, free-text categories,
  address prose, contact labels, captions, alt text, and metadata cannot be
  used as English body content without approval.
- Media and slug: reuse approved UMKM images and source slug. The existing
  publication reachability and contact-consent rules remain source rules.
- Projection and stale behavior: English list and detail queries require a
  current translation and a published source. Missing business translations
  are omitted from the English homepage and collection.
- Admin and schema concerns: a dedicated umkm_id translation table is the
  likely direction, with explicit field policy for category and proper
  names, source/locale uniqueness, revision marker, lifecycle, RLS, admin
  mutation, and public-safe projection.
- Tests: consent and reachability, category terminology policy, source
  freshness, public list/detail, media, metadata, not-found behavior,
  language switching, and denied administrator paths.

### 6.8 Official contacts

- Current route: /kontak. Admin contact pages manage contacts and a central
  WhatsApp setting. The public loaders read published_contacts and
  public_site_settings; the English shell currently exposes only approved
  language-neutral contact/platform values.
- Candidate English content: contact label and description. Phone numbers,
  email addresses, URL values, contact type, and the central WhatsApp
  setting are locale-neutral when their source validation permits reuse.
- No fallback: do not show an Indonesian contact label or description on
  /en/contact. If a channel has no approved English label, use the explicit
  unavailable behavior or an approved finite type label; do not guess.
- Media and slug: no entity media or detail slug is involved. The central
  setting remains one source of truth and is not duplicated per locale.
- Projection and stale behavior: an English contact projection must filter
  published source rows and join approved contact translations where needed.
  Contact-label and description changes, and phone/URL changes referenced by
  the translation, follow the selected source-revision and review policy.
- Admin and schema concerns: no translation table is needed for purely
  locale-neutral values. If labels or descriptions are translated, a
  contact_id translation table with source/locale uniqueness, lifecycle,
  revision marker, RLS, admin mutation, and a public-safe projection is
  required. Site-setting translation storage is not justified by the
  current central-value behavior.
- Tests: published-only contact reads, value and URL safety, consent/privacy
  boundaries, English unavailable state, no Indonesian fallback, language
  switch, metadata, RLS, and central-setting regression.

### 6.9 Tourism map content

- Current route: /peta-wisata. features/public-map/data.ts combines the
  published destination, homestay, UMKM, and traditional-house loaders.
  Items without a valid coordinate are excluded and equal coordinate pairs
  are grouped into one marker.
- Proposed English behavior: the map has no independent content source.
  It should consume the current English projections of those four source
  domains, with English title, summary, category label, popup labels, and
  route links. Coordinates, map URLs, marker grouping, ids, and media
  references remain shared source values.
- No fallback: an item without a current English projection must not appear
  with an Indonesian title or summary. The page may show a documented empty
  or unavailable state when no eligible English items remain.
- Schema concerns: no map translation table is needed. The domain
  translation views must expose the source id, current English text, and
  locale-neutral coordinates safely. Category label policy must be shared
  with destinations.
- Tests: coordinate validation, marker grouping, category filtering,
  translated popup/link pairing, hidden untranslated items, empty/error
  states, mobile rendering, and Indonesian map regression.

### 6.10 English homepage collection integration

- Current behavior: the Indonesian homepage uses Promise.all and six
  published collection loaders with deterministic small limits. The English
  homepage currently does not query those domain collections.
- Proposed behavior: the English homepage must use the same source domains
  through current English projections and must not create a duplicate
  homepage content table. A collection item without an eligible English
  translation is omitted. The English Village Profile excerpt is included
  only when its pilot projection is current and published.
- Shared values: collection order rules, source ids, image references,
  numeric/URL values, and published timestamps remain source-controlled.
- No fallback: no Indonesian card title, summary, category, or descriptive
  excerpt may be used in an English homepage section.
- Schema concerns: no homepage translation table is needed for collection
  membership. Any static section heading or explanatory copy belongs in the
  reviewed interface dictionary or approved page content contract.
- Tests: collection isolation, per-domain empty states, published-only
  counts, media behavior, error isolation, stale suppression, responsive
  homepage rendering, and Indonesian homepage regression.

### 6.11 Shared navigation and language switching

- Current behavior: the ten-key route manifest contains English paths only
  for home and Village Profile. The switcher renders a real reciprocal link
  only for those paths; it does not fabricate a prefixed route for an
  Indonesian-only domain.
- Proposed behavior: add a manifest counterpart only after the English
  route's published projection and metadata contract are ready. For detail
  routes, switch by source identity and source slug, then verify that the
  English translation is current. If unavailable, do not render a link that
  promises content; use the documented unavailable behavior.
- Shared values: source route identity, stable source slug, route key, and
  approved UI dictionary keys.
- No fallback: do not mix Indonesian navigation labels, headings, state
  text, or breadcrumbs into an English page except approved proper nouns or
  terminology.
- Schema concerns: no database translation table is required for static
  navigation UI. Route availability must be derived from published-safe
  English projections, not from a client-controlled locale or an
  administrator-only base-table read.
- Tests: manifest parity, reciprocal links, detail route pairing, unavailable
  link suppression, proxy locale trust, no browser redirect, keyboard
  accessibility, and Indonesian navigation regression.

### 6.12 Metadata and not-found behavior

- Current behavior: features/seo/public-metadata.ts builds localized title,
  description, Open Graph type/site name/locale, and Twitter summary metadata.
  Current pages do not emit metadataBase, canonical URLs, alternates, or
  hreflang. No app/sitemap file was found. app/robots.ts disallows admin and
  auth paths while allowing public paths. Existing detail metadata uses
  published-safe source metadata and no signed media URL.
- Proposed behavior: each English list/detail page must generate metadata from
  current English projection data or approved static dictionary copy. English
  descriptive metadata cannot use Indonesian fallback. Missing or stale
  detail translations are noindex and use the English not-found behavior.
- Schema concerns: translated SEO title and description may be columns in
  the dedicated domain translation table or a separately justified
  translation projection. They require the same source foreign key, locale
  uniqueness, lifecycle, stale marker, audit, RLS, and public projection
  rules. No final column placement is selected here.
- Tests: title/description source isolation, localized Open Graph locale,
  canonical and alternate generation after origin approval, sitemap
  eligibility, robots behavior, noindex for unavailable routes, not-found
  status, no signed media metadata, and Indonesian SEO regression.

## 7. Slug, deletion, and publication contract

### 7.1 Slug strategy

The recommended strategy is to use the existing Indonesian/source slug for
the English detail route, while resolving the record through a shared source
identity:

| Criterion | Existing source slug | Separate English slug |
| --- | --- | --- |
| Cross-locale switching | Direct and stable | Requires a translation lookup and separate availability handling. |
| Uniqueness | Already enforced per source domain | Requires new locale-aware uniqueness and collision rules. |
| Editorial workflow | No second identifier to maintain | Adds slug editing, review, redirects, and accidental drift risk. |
| Stale behavior | Source slug remains stable while translation publication is gated | Stale or changed translated slugs require redirect and sitemap policy. |
| SEO | Stable URL identity across languages; language is expressed by path | Potentially more natural English URLs but greater redirect and canonical complexity. |
| Implementation complexity | Lower and consistent with the current immutable-after-publication rule | Higher and not supported by current routes or schema. |

The source-slug strategy is a recommendation, not an implementation change.
English slugs must not be added in Phase 3A. If stakeholders choose English
slugs later, the design must specify a unique source/locale slug, immutable
publication behavior, source-id route switching, redirects, stale handling,
canonical URLs, and rollback before a migration is reviewed.

### 7.2 Lifecycle and deletion

New translations begin as draft. Drafts may be edited and saved. Explicit
administrator publication is required. Published translations may be
archived; archived translations may be restored to draft. Published
translated fields are not edited in place. A new review and explicit
republish are required after a source change classified as
translation-relevant by the selected domain strategy. A strict row-level
strategy may classify every source update as stale. Source archival or
unpublication always removes public English eligibility. Locale-neutral
operational changes do not automatically require retranslation unless the
selected domain contract classifies them as affecting English presentation.

Source archival or unpublication removes the English row from public
projections. Source deletion remains restricted by the existing Version 1
no-permanent-delete and foreign-key rules. Translation deletion is not a
public operation; archive/restore is the recoverable lifecycle.

## 8. Translation lifecycle and stale-source suppression

The Village Profile pilot supplies the reusable fail-closed pattern. Each
repeatable domain must explicitly choose and test one reviewed
source-freshness strategy in its migration review:

- Strict row-level revision: every source `updated_at` change makes the
  translation stale.
- Translation-relevant revision: only changes to fields that affect
  translated meaning or approved English presentation advance a dedicated
  revision or fingerprint and make the translation stale.

Strict row-level revision is the safe default when translation-relevant
changes cannot be reliably distinguished. Locale-neutral operational changes
such as display order, featured flag, coordinates, or a shared validated URL
must not be claimed to require retranslation unless the selected domain
contract says they affect the English presentation. Changes to source status,
archival, unpublication, deletion eligibility, or translated semantic content
must always suppress outdated English content. Public content must fail
closed whenever freshness cannot be proven.

For each domain in Sections 6.1–6.8, and for the source domains consumed by
the map and homepage, the migration review must record the selected strategy,
its affected fields, and database/application tests for the stale boundary.
The concurrency revision used to reject stale administrator writes and the
translation-freshness revision used to decide public eligibility may be
related, but they must not be treated as automatically identical.

The lifecycle pattern is:

1. Read the source row and current translation under the appropriate boundary.
2. Allow a draft to be incomplete while it is being prepared.
3. At publication, lock or otherwise re-read the source and verify that it is
   published.
4. Validate required translated fields and source-populated optional fields.
5. Capture the selected source revision or freshness fingerprint on the
   server.
6. Expose public content only when source status is published, translation
   status is published, locale is en, and the stored source revision or
   fingerprint still matches the selected strategy.
7. When the selected strategy classifies a source change as translation-
   relevant, classify the translation as stale and exclude it from public
   reads.
8. Require source review and explicit republish before English visibility is
   restored.

The public view or RPC must enforce the current-source condition; an
application-only freshness check is insufficient. A stale status may remain
stored for administrator diagnosis, but stale English content must not
remain publicly visible.

Future repeatable-domain workflows must also define concurrent update
behavior. A stale admin form must not overwrite a newer source or
translation silently. Save and publish operations should re-read the source
and translation revision and return a conflict requiring reload when the
revision changed. The exact optimistic-concurrency mechanism is an open
implementation decision for the domain migration review.

## 9. Public query and projection contract

Every future English public query must satisfy all of the following:

- Read through a public-safe view or narrowly scoped public RPC, never a
  translation base table.
- Join the translated row to its source with an explicit foreign key.
- Filter source status and translation status independently.
- Filter locale exactly to en.
- Require the stored source revision or freshness fingerprint to match the
  current source revision according to the selected domain strategy.
- Select an explicit column allowlist.
- Exclude audit identities, lifecycle internals, source notes, consent flags,
  and other private fields.
- Preserve source-controlled locale-neutral values from the eligible source
  row rather than duplicating them into translation content.
- Use deterministic list ordering and safe slug validation.
- Return a distinct technical-error result rather than treating an error as
  an empty successful translation.
- Detect singleton or relationship invariant violations rather than
  selecting an arbitrary row.
- Attach media only through the existing published-parent media boundary and
  do not place expiring signed URLs in metadata.

List routes may omit rows without a current translation and show an explicit
empty state. Detail routes must not reveal Indonesian source content when the
English translation is missing, stale, archived, incomplete, or unpublished.

## 10. Admin workflow contract

### 10.1 Required behavior

Each translatable domain's administrator workflow must expose:

- a source content summary and link or reference;
- source update timestamp or revision;
- translation status and freshness;
- a completion indicator for required translated fields;
- editable English fields only;
- a read-only source reference;
- save-draft, publish, archive, and restore actions allowed by lifecycle;
- a stale-source warning that explains why public visibility is suppressed;
- explicit source-review confirmation before publication;
- field and form validation errors without losing draft values;
- a preview that is authenticated and noindex, or an explicitly approved
  alternative that cannot leak drafts;
- concurrent-update conflict handling;
- administrator authorization at the server and database boundaries;
- audit evidence for who changed the row and when, without public exposure.

Publishing must never write back into the Indonesian source form. A source
edit and a translation edit are separate mutations with separate feedback.
There is no automatic publication after saving a draft.

### 10.2 Embedded versus dedicated workflow

The existing singleton Village Profile translation remains embedded in the
Indonesian admin profile page because that is the implemented pilot pattern.

For repeatable tourism domains, dedicated translation pages linked from the
existing Indonesian edit page are recommended. They keep the source form
focused, show a stable source snapshot, make per-language lifecycle explicit,
and reduce accidental source overwrite. An embedded panel may be accepted
for a very small domain only after its validation, stale warning, and
concurrency behavior remain clear on mobile.

This is a proposed UX decision, not a new route authorization. Each domain
phase must confirm its admin URL, permissions, preview policy, and rollback
behavior before implementation.

## 11. Public rendering and SEO contract

### 11.1 Canonical and language alternates

After a production origin is explicitly approved, every indexable English
route must emit a self-canonical URL. Indonesian and English counterparts may
emit reciprocal alternates and hreflang links only when both projections are
eligible. A route with no current translation must not advertise an English
alternate.

The exact origin, language code set, x-default policy, query-filter
canonicalization, and trailing-slash policy remain unresolved. No
production-origin URL is invented in this document.

### 11.2 Metadata and Open Graph

English titles and descriptions come from approved English translation fields
or approved static UI copy. They must not fall back to Indonesian
descriptions. Open Graph and Twitter metadata must be localized and must not
use a temporary signed media URL. A permanent approved image may be reused
only after its ownership and accessibility text are verified.

List pages, detail pages, the homepage, the map, and contact pages each need
an explicit metadata test. Missing or stale dynamic content gets noindex
metadata and the English not-found or unavailable state.

### 11.3 Sitemap and robots

The future sitemap must include only eligible public routes: the English
homepage and current published English list/detail routes. It must exclude
draft, archived, stale, incomplete, unavailable, and not-found translations.
The policy for category query variants and translated detail last-modified
timestamps must be reviewed before implementation.

Public English routes may remain crawlable under the public robots policy.
Admin, auth, preview, and unavailable paths must remain noindex or
disallowed as appropriate. Sitemap work must wait for an approved production
origin and a reviewed route inventory.

### 11.4 Rendering and state behavior

Every English route must distinguish:

- loading;
- published content;
- empty collection;
- unavailable translation;
- technical error; and
- not found.

Breadcrumbs, internal links, navigation labels, map popups, and card labels
must use the English dictionary or approved English content. Only approved
proper nouns and explicitly preserved local terms may remain unchanged.
Mixed-language UI is not a fallback strategy.

Next.js 16 route conventions used by the repository are compatible with
server-resolved dynamic params, route-level loading/error/not-found files, and
server metadata generation. The existing route-group and root app structure
must be retained.

## 12. Schema option comparison

No schema option is being implemented in Phase 3A. Each domain requires a
separate reviewed migration or an explicitly approved decision that no
translation storage is needed.

| Option | Integrity, RLS, and query safety | Lifecycle, typing, RPC, and tests | Rollback and maintainability | Decision |
| --- | --- | --- | --- | --- |
| Dedicated translation table per domain | Strong source foreign key, explicit locale uniqueness, clear RLS, narrow public views, and predictable joins. | Typed fields and domain RPCs are straightforward; stale markers and status transitions are explicit and testable. | More tables and migrations, but local rollback and domain ownership are clear. | Recommended for repeatable translated content. |
| Shared polymorphic translation table | Cannot enforce a normal foreign key to every source table; parent type and id validation make RLS and public queries harder to reason about. | Generic RPCs weaken typing and complicate field completeness, stale checks, and invariant tests. | Fewer tables but greater long-term coupling and unsafe deletion risk. | Not recommended merely to reduce table count. |
| JSON translation column | Weak field-level constraints, weaker query typing, and difficult public allowlisting. | Status and stale logic become application-heavy; RPC and pgTAP coverage must duplicate JSON rules. | Fewer migrations initially, but schema evolution and rollback are opaque. | Not recommended merely because it appears faster. |
| Duplicated localized domain table | Can use foreign keys, but duplicates shared prices, coordinates, media, slugs, and lifecycle state. | Admin and TypeScript models drift; synchronization and concurrent source changes are harder. | High data drift and deletion complexity. | Not recommended. |
| No database translation storage | Safe and simple for static interface strings and genuinely locale-neutral values such as URLs or phone numbers. | No translation lifecycle exists, so it cannot support translated domain content or stale review. | Lowest maintenance only where no translated editorial field exists. | Recommended for navigation, map mechanics, homepage composition, and pure contact values. |

The recommended dedicated-table direction should normally include:

- a source foreign key with restrictive deletion behavior;
- locale constrained to en for this rollout;
- unique source/locale pair;
- explicit translated content columns;
- optional translated SEO fields;
- draft, published, and archived status;
- server-captured source revision or source_updated_at_at_publish;
- created/updated timestamps and administrator audit fields;
- RLS with administrator-only base access;
- administrator-only mutation functions or an equally narrow server boundary;
- a published-only, column-limited public projection;
- indexes for source/locale/status/freshness lookups;
- tests for source changes, publication, permissions, deletion, and
  concurrency.

The exact table names, fields, functions, grants, indexes, and migration
ordering must be designed and reviewed one domain at a time.

## 13. Security and RLS requirements

Future translation storage must preserve the repository's existing
single-administrator boundary:

- Anonymous users can select only published-safe projections.
- The translation base table is not anonymously readable.
- Non-administrator authenticated users cannot read or mutate translation
  base rows.
- Direct table INSERT, UPDATE, and DELETE are denied to application roles
  where RPC-only mutation is chosen.
- Security-definer functions use a fixed search path, verify the configured
  administrator through public.is_admin(), and expose only the intended
  operation.
- Public views exclude audit identities, source notes, internal status
  metadata, consent flags, and private contact data.
- Source foreign keys and restrictive deletion behavior prevent orphaned
  translations.
- Published projections require both source and translation publication plus
  current source freshness.
- Media access remains bounded by the published source parent and the
  existing server-side signing boundary.
- No service-role shortcut, credential, hosted URL, administrator UUID, or
  private identifier is placed in application output or documentation.

## 14. Test contract

### 14.1 Database tests

Each domain migration and projection must test:

- source foreign-key integrity and restrictive deletion;
- locale constraint and unique source/locale pair;
- required translated fields and source-populated conditional fields;
- indexes used by public and admin queries;
- RLS for anonymous, administrator, and denied authenticated identities;
- grants on base tables, public views, and mutation functions;
- draft, published, archived, and restore-to-draft lifecycle;
- explicit publication and no automatic publication;
- server-captured source revision;
- stale suppression after source changes classified by the selected
  source-revision strategy; mandatory suppression after archive or unpublish;
  and correct eligibility after a reviewed republish;
- public-safe projection column allowlists;
- consent and private-field isolation;
- media parent visibility and deletion behavior;
- package relation and translated-destination behavior where applicable;
- concurrent source changes and stale admin writes;
- invariant violations such as duplicate rows or duplicate public
  projections.

### 14.2 Application tests

Required application coverage includes:

- English list and detail route loading;
- published, empty, unavailable, technical-error, and not-found states;
- no Indonesian body-text, metadata, label, caption, or alt-text fallback;
- route pairing and language-switching availability;
- source-slug behavior and stale translation suppression;
- canonical, alternates, hreflang, Open Graph, robots, and sitemap behavior
  once those features are implemented;
- breadcrumb and internal-link locale correctness;
- English homepage, map, and contact collection filtering;
- media reuse without signed URL metadata leakage;
- administrator draft, publish, archive, restore, stale warning, preview,
  conflict, and validation behavior;
- permission denial for non-administrator identities;
- Indonesian route and navigation regression;
- keyboard and 390-pixel viewport behavior.

### 14.3 Release tests

Each implementation phase must run:

- npm.cmd run check;
- local pgTAP against the reviewed local schema, without requiring hosted
  access;
- a local-target production build;
- browser smoke testing on desktop and a 390-pixel viewport;
- an English/Indonesian route matrix;
- accessibility checks for navigation, forms, states, and media;
- deployment and rollback readiness review.

Hosted read-only inspection requires separate approval. Database mutation,
content entry, content publication, and production deployment each require
their own approval gates. Phase 3A performs none of them.

## 15. Incremental rollout sequence

The recommended sequence is deliberately split into independently reviewable
phases. Each phase must have one primary responsibility.

| Phase | Primary responsibility | Prerequisites | Scope and acceptance boundary | Explicit non-goals |
| --- | --- | --- | --- | --- |
| 3A | Contract and schema audit | Current baseline and stakeholder review | This plan, route contract, field matrix, schema decision, security/test gates, and open-decision record are reviewed. | No route, migration, component, translation, or content. |
| 3B | Destination end-to-end pilot | Phase scope authorization, destination content owner, terminology decision, reviewed destination schema contract and migration plan | Implemented destination migration review, translation storage, RLS, public list/detail, admin workflow, stale suppression, metadata, and tests pass. | No other domain rollout or shared SEO expansion beyond what the pilot needs. |
| 3C | Shared bilingual navigation, metadata, and SEO hardening | 3B route evidence and approved production-origin policy | Reciprocal switching, canonical, alternates, hreflang, sitemap, robots, breadcrumbs, and route matrix are reviewed. | No unapproved domain pages or content. |
| 3D | Traditional Houses | 3A gate, cultural terminology owner, 3B/3C patterns | Traditional-house translation, admin lifecycle, public projection, media text policy, and tests pass. | No cultural articles or customary-institution articles. |
| 3E | Cultural Events | Event owner, terminology review, time and consent rules | Event translation, WITA presentation, publication/stale rules, and tests pass. | No event recurrence, booking, or date inference. |
| 3F | Tourism Packages | Destination projection availability, package owner, relation policy | Package translation, ordered translated itinerary, transactional admin boundary, and tests pass. | No booking, payment, or route optimization. |
| 3G | Homestays | Homestay content owner and consent review | Homestay translation, shared prices/contacts, public projection, admin workflow, and tests pass. | No availability, inventory, or reservation system. |
| 3H | UMKM/local businesses | Business content owner and terminology review | UMKM translation, proper-name policy, consent-safe contacts, and tests pass. | No commerce, inventory, or shopping flow. |
| 3I | Contact and Tourism Map | Domain projections and contact-owner approval | English contact and map routes consume current projections and pass privacy, empty, and locale tests. | No duplicate contact settings or map content table. |
| 3J | Homepage integration and complete regression | All approved domain phases and origin policy | English homepage collections, shared navigation, full route matrix, accessibility, release, and rollback evidence pass. | No automatic rollout to additional locales or domains. |

Every phase requires a migration review if schema changes, a rollback
decision, database and application tests, acceptance criteria, and a
documented list of non-goals. No giant implementation PR should combine
multiple unrelated domains.

## 16. Acceptance gates and stop conditions

### 16.1 Entry gates — before an implementation phase starts

Before an implementation phase starts, confirm:

- stakeholder scope authorization for the phase;
- the included domain decision;
- an English content owner and reviewer;
- terminology and proper-name policy;
- route and slug decisions where applicable;
- the reviewed translated-field contract;
- the reviewed schema and migration plan;
- RLS and public-projection design;
- administrator workflow and preview design;
- production or hosted-access authorization where relevant.

Implementation test evidence is not an entry gate; it belongs to the
completion boundary after implementation exists.

### 16.2 Merge and implementation-phase completion gates

Before merge or implementation-phase completion, confirm as applicable:

- implemented migration review where schema changed;
- database and application tests;
- route, metadata, not-found, language-switching, sitemap, and regression
  tests where applicable;
- accessibility checks;
- `npm run check`;
- local database evidence where database behavior changed;
- desktop and 390-pixel browser smoke testing;
- rollback documentation appropriate to the change.

Before the corresponding production action, separately confirm:

- production migration authorization before production migration;
- deployment authorization before production deployment;
- content publication authorization before public content publication;
- production post-action validation readiness.

Merging reviewed code or documentation does not itself require production or
content-publication authorization.

### 16.3 Stop conditions

Stop the affected phase when:

- scope authorization is missing or conflicts with the documented Version 1.0
  scope boundary;
- an English field lacks an authorized source or reviewer;
- machine translation or invented cultural content is proposed;
- the schema cannot enforce source ownership and locale uniqueness;
- public reads can see draft, archived, stale, incomplete, or source-unpublished
  translations;
- Indonesian text would be used as an unapproved English fallback;
- RLS or grants allow anonymous or non-administrator base-table access;
- the selected source-revision strategy can leave stale English public;
- slug switching, canonical, or alternate behavior is ambiguous;
- a migration is not independently reviewable or rollback-aware;
- admin preview or publication can expose draft content;
- required application, database, accessibility, or browser tests fail;
- production target, hosted access, mutation approval, or content ownership
  is uncertain.

## 17. Content ownership and verification

The village or an explicitly designated official source owns the Indonesian
source content. A designated English editor prepares the English draft. An
authorized village, customary, or subject-matter reviewer verifies names,
history, cultural meaning, terminology, addresses, contacts, prices,
schedules, coordinates, and visitor claims as applicable.

The workflow should retain non-public evidence of:

- source record and source revision;
- English editor and review responsibility;
- terminology decisions;
- review date;
- publication decision;
- later source changes that caused staleness.

The public projection must not expose private reviewer identities or raw
source notes unless a separate approved policy permits it. A developer,
language model, or machine translator cannot be the sole content authority.

## 18. Open stakeholder decisions

The following decisions remain unresolved and must be recorded before the
affected implementation phase:

1. Whether full bilingual public content is a Version 1.1/post-V1 priority.
2. Which domains are included in the first approved workstream.
3. Whether the proposed English route names are accepted.
4. Whether source slugs are accepted for English detail routes.
5. Proper-name, customary-term, and cultural-terminology policy.
6. English labels for Alam, Budaya, and Religi.
7. Exact translated field list for addresses, opening hours, facilities,
   price notes, event notes, contact labels, and relation notes.
8. Where English alt-text and caption data are stored; whether missing English
   alt text suppresses only the media item or blocks parent publication; and
   how primary-image and collection-card eligibility behave when translated
   media text is unavailable.
9. Dedicated admin translation pages versus a small embedded panel per
   domain; the recommendation is dedicated pages for repeatable domains.
10. Source-revision and stale-source granularity per domain, including the
    strict row-level versus translation-relevant revision/fingerprint choice
    and which operational fields affect English presentation.
11. Optimistic-concurrency and source-review confirmation mechanics.
12. Canonical production origin, language codes, x-default, query filter
    canonicalization, and sitemap last-modified policy.
13. English unavailable-versus-not-found behavior for each route type.
14. Content owners, translators, reviewers, and acceptance responsibilities.
15. Caching and revalidation behavior for current English projections.
16. Whether any additional post-V1 domains, locales, or translation types are
    approved.

## 19. Stakeholder decision record template

Use one record per approved scope decision:

| Field | Decision record |
| --- | --- |
| Decision title | Pending |
| Decision status | Pending stakeholder approval |
| Target release | Version 1.1 or post-V1, if approved |
| Included domains | Pending |
| Excluded domains | Pending |
| Content owner | Pending |
| English editor and reviewer | Pending |
| Terminology/proper-name policy | Pending |
| Route and slug policy | Pending |
| Schema direction | Pending reviewed migration |
| RLS and public projection review | Pending |
| Admin workflow and preview policy | Pending |
| SEO/origin policy | Pending |
| Test and acceptance evidence | Pending |
| Production authorization | Not granted by this document |
| Content publication authorization | Not granted by this document |
| Approver, date, and reference | Pending |
| Exceptions and rollback owner | Pending |

## 20. Final boundary

This plan is a proposed architecture and contract audit only. It documents
what a future full bilingual rollout would need to prove, but it does not
authorize implementation. The existing documented Version 1.0 scope boundary
remains unchanged, and its approval status remains “Pending explicit
stakeholder decision” in docs/MVP_RELEASE_SCOPE.md.
No stakeholder approval, production authorization, database mutation
approval, or content publication approval is implied by creating, reviewing,
merging, or linking this document.
