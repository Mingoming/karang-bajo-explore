# Development Rules

## Karang Bajo Tourism Information System

**Project stage:** Phase 1 — Project Foundation
**Document authority:** Mandatory implementation constraints
**Applies to:** Developers, reviewers, maintainers, and AI coding agents

---

# 0. Document Purpose

This document defines mandatory rules for implementing the Karang Bajo Tourism Information System.

It governs:

* Scope boundaries
* Approved technologies
* Code organization
* Supabase access
* Authentication and authorization
* Data integrity
* GIS behavior
* Media handling
* Cultural content integrity
* Validation
* Security
* Accessibility
* Testing
* Documentation
* AI coding-agent behavior
* Definition of Done

This document does not replace:

* `project.md`
* `prd.md`
* `architecture.md`
* `schema.md`
* `design.md`
* `roadmap.md`

Developers must consult the authoritative document for each type of decision.

---

# 1. Rule Priority

## 1.1 Document Authority Order

When project documents appear to conflict, use the following authority order:

1. `project.md`
2. `prd.md`
3. `architecture.md`
4. `schema.md`
5. `design.md`
6. `rules.md`
7. `roadmap.md`

The authority order does not permit one document to redefine a concern owned by another document.

Use the following responsibility boundaries:

| Concern                                                   | Authoritative document |
| --------------------------------------------------------- | ---------------------- |
| Permanent project context and boundaries                  | `project.md`           |
| Product behavior and MVP scope                            | `prd.md`               |
| System boundaries and technology responsibilities         | `architecture.md`      |
| Tables, fields, relationships, and persistent constraints | `schema.md`            |
| Routes, modules, rendering, forms, and application flow   | `design.md`            |
| Mandatory implementation constraints                      | `rules.md`             |
| Delivery sequence and progress                            | `roadmap.md`           |

## 1.2 Conflict Handling

When a material conflict is found:

1. Stop the affected implementation.
2. Identify the conflicting statements.
3. Identify the documents involved.
4. Describe the product, data, security, or maintenance impact.
5. Request an explicit decision.
6. Update the authoritative document.
7. Resume implementation only after the conflict is resolved.

Developers and AI agents must not silently choose an interpretation.

A material conflict includes:

* Different access permissions
* Different field requirements
* Different scope boundaries
* Different publication behavior
* Different technology choices
* Different content ownership
* Different relationship definitions
* Different security expectations

Minor wording differences that do not change behavior do not require implementation to stop.

---

# 2. Approved Version 1 Baseline and Remaining Decisions

Version 1 has exactly two access states: anonymous public visitor and one authenticated administrator. Supabase Auth is required. The administrator can create, edit, publish, archive, restore, upload media, and manage approved settings.

Editor roles, additional accounts, role management, user management, invitations, approval workflows, and permanent deletion are prohibited. New content starts as draft, restore returns content to draft, and Version 1 is Indonesian-only.

Destination categories are fixed to `Alam`, `Budaya`, and `Religi` and are not dashboard-managed. Slugs are generated automatically, hidden from normal forms, and immutable after first publication.

Price fields are numeric: `0` is free, `null` unavailable, and positive values Indonesian rupiah. `price_note` is optional. One central WhatsApp number is the primary visitor CTA; optional per-entity contacts require publication consent.

Destinations, traditional houses, homestays, and visitable UMKM may appear on the map. Identical coordinate pairs use one combined marker; UMKM Tenun shares the Kampung Adat marker. Coordinate forms provide both map picking and manual latitude/longitude entry.

The root `app/` structure, npm with the existing `package-lock.json`, Tailwind CSS, and `public/` for static browser assets are approved.

The following decisions are not final and must not be silently resolved in code.

| Decision                              | Interim rule                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Facilities representation and display | Do not finalize migration until array versus JSON is selected; render only non-empty values |
| Supabase region                      | Select before production project creation                                     |
| Production account ownership         | Do not hand over through personal student-owned accounts                       |
| Backup procedure                      | Owner, frequency, retention, location, and restore test must be documented before production |
| Public database column exposure       | Source notes remain administrator-only; choose grants, views, or server-only access before RLS |
| Storage bucket visibility             | Do not place draft media in a publicly readable path before the strategy is approved |
| Trusted upload validation boundary    | Browser validation alone is not an approved security boundary                 |
| Media dimensions, byte limits, counts, and image requirement | Do not treat conflicting recommendations as final                 |
| Original media archive location       | Assign a village-owned external archive before handover                       |
| Analytics                             | Excluded unless privacy, ownership, and provider are approved                  |
| Preview URL behavior                  | Preview must remain authenticated and `noindex` until finalized                |
| Administrator identity configuration  | Do not implement RLS until the secure single-UUID mechanism is documented      |
| Event time zone and uncertain dates   | Do not invent classification behavior for date-note-only events                |
| Package map and public search scope    | Do not promote optional behavior to required until approved                    |
| Site-settings keys and import provenance | Add no extra setting or provenance column until approved                    |
| OSM provider, Next.js caching, and monitoring | Finalize before the affected production implementation phase              |

These remaining decisions must be finalized at their roadmap phase gate.

---

# 3. Scope Rules

## 3.1 Approved Scope

Implementation must be limited to the approved Version 1 product scope in `prd.md`.

Version 1 includes:

* Village profile
* Tourism destinations
* Fixed destination categories
* Destination detail
* Interactive tourism map
* Tourism packages
* Traditional houses
* Cultural articles
* Bayan customary institution articles
* Cultural events
* Homestays
* UMKM
* Gallery
* Public contacts
* Authentication
* Admin dashboard
* Media management
* Controlled site settings

## 3.2 Prohibited Scope Expansion

Version 1 must not include:

* Online booking
* Payment gateway
* Reviews
* Ratings
* Favorites
* Visitor accounts
* Trip planner
* Route optimization
* Recommendation engine
* AI chatbot
* Offline maps
* Native mobile application
* Product inventory
* Shopping cart
* Homestay availability
* Room inventory
* Automatic event recurrence
* Advanced GIS analysis
* Public comments
* Multi-village management
* Package participant limits
* Structured activity per package stop
* Structured timing per package stop
* Additional administrator or editor accounts
* Role and user management
* Invitation flows
* Approval workflows
* Permanent deletion
* Multilingual publishing

Do not add optional features merely because they are common on tourism websites.

## 3.3 Scope Change Process

When a requested change affects approved scope:

1. Identify the new or changed product behavior.
2. Identify affected documents.
3. State whether the change affects:

   * Product requirements
   * Data model
   * Authorization
   * Architecture
   * User interface
   * Testing
   * Operations
4. Obtain approval.
5. Update the documentation.
6. Implement only after the approved documents are consistent.

Do not add a route, table, column, dependency, service, or role merely to support an unapproved idea.

---

# 4. Approved Technology Rules

## 4.1 Approved Stack

The approved production stack is:

* Next.js
* App Router
* TypeScript
* Tailwind CSS
* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage
* Leaflet
* OpenStreetMap
* React Hook Form
* Zod
* Vercel
* QGIS for initial geographic preparation and specialist validation

npm is the package manager, and the existing `package-lock.json` must remain the lockfile.

## 4.2 Prohibited Technology Substitution

The following must not be introduced in Version 1 without explicit approval:

* Laravel
* Express
* Firebase
* MySQL
* PostGIS
* Prisma
* Docker as a production dependency
* Kubernetes
* Redis
* RabbitMQ
* GraphQL
* Microservices
* A second backend
* A second authentication platform
* A second database
* Commercial map SDKs as the main map
* Multiple global state-management libraries
* Unnecessary UI frameworks
* Enterprise CMS platforms
* Plugin systems

Do not replace an approved technology because another technology is more familiar to an individual developer.

## 4.3 Platform Responsibility

Use each platform only for its approved responsibility.

| Technology          | Approved responsibility                            |
| ------------------- | -------------------------------------------------- |
| Next.js             | Public website and admin application               |
| Supabase PostgreSQL | Structured persistent data                         |
| Supabase Auth       | Administrative authentication                      |
| Supabase Storage    | Managed public media                               |
| Leaflet             | Interactive map rendering                          |
| OpenStreetMap       | Base-map context                                   |
| QGIS                | Initial coordinate validation and data preparation |
| Vercel              | Next.js deployment                                 |

Do not make QGIS part of daily content management.

Do not use Google Maps as the primary embedded map.

Google Maps integration is limited to approved external navigation links.

---

# 5. Dependency Rules

## 5.1 Adding Dependencies

Before adding a dependency, document:

* Its purpose
* The specific requirement it satisfies
* Why approved platform capabilities are insufficient
* Alternatives considered
* Maintenance risk
* Security risk
* Client bundle impact, when relevant
* Whether it introduces overlapping responsibility

## 5.2 Dependency Constraints

Developers must:

* Prefer framework and platform capabilities
* Avoid overlapping libraries
* Remove unused dependencies
* Keep dependencies actively maintained
* Pin versions according to the project package policy
* Record significant dependency decisions
* Review browser bundle impact for client-side packages

Developers must not:

* Add a library for trivial formatting
* Add a global state library without demonstrated need
* Add multiple form libraries
* Add multiple validation libraries
* Add multiple date libraries without justification
* Add a second map library
* Add a second upload system
* Add packages that require a new production service without approval

---

# 6. TypeScript Rules

## 6.1 Compiler Rules

* TypeScript strict mode is mandatory.
* New code must pass the project type check.
* Compiler errors must not be suppressed to complete a task.
* `skipLibCheck` must not be used as a substitute for resolving application type errors.

## 6.2 Type Safety

Do not use `any` unless:

1. No safe alternative exists.
2. The use is isolated.
3. The reason is documented.
4. Data is validated before reaching domain logic.

Prefer:

* Domain-specific types
* Discriminated unions
* Explicit nullable values
* Validated unknown data
* Narrow types for publication status and fixed category identifiers

Do not use type assertions to bypass uncertainty.

Avoid:

```text
value as Destination
```

unless the value has already passed a trusted mapper or validator.

## 6.3 Type Separation

The following must remain separate types:

* Raw database rows
* Form inputs
* Mutation inputs
* Public view models
* Admin list models
* Map marker data
* Storage upload metadata

Do not treat these structures as interchangeable.

## 6.4 Nullability

Nullable fields defined in `schema.md` must remain explicit.

Do not convert an unknown or absent value to an empty string globally when the distinction matters.

Use application mapping to decide whether a null value becomes:

* Hidden section
* Empty form field
* Fallback text
* Validation error

---

# 7. Next.js Rules

## 7.1 Application Model

* Use App Router.
* Keep one Next.js project.
* Keep the existing root `app/` structure; do not migrate application code to `src/`.
* Store static browser assets under `public/`.
* Use Server Components by default.
* Use Client Components only for browser interaction.
* Keep public, authentication, and admin route concerns separate.

## 7.2 Server Components

Use Server Components for:

* Public page composition
* Public data retrieval
* Admin data retrieval
* Metadata
* Authorization checks
* List pages
* Detail pages
* Dashboard overview

Do not convert a complete page to a Client Component because one child uses browser state.

## 7.3 Client Components

Client Components are permitted for:

* Leaflet
* Browser geolocation
* React Hook Form
* Image upload and preview
* Image reordering
* Package-destination reordering
* Modal dialogs
* Mobile navigation
* Immediate browser-side filters
* Unsaved-change detection

Client Components must receive prepared data.

They must not contain arbitrary raw database queries.

## 7.4 Mutation Pattern

Server Actions are the primary mutation pattern.

Use Server Actions for:

* Create
* Update
* Publish
* Archive
* Restore
* Reordering
* Media metadata changes
* Controlled settings changes

Route Handlers are limited to:

* Authentication callbacks
* An HTTP endpoint explicitly required by an approved external flow
* An approved import endpoint

Do not implement the same mutation through both Server Actions and Route Handlers without documented justification.

## 7.5 Page Components

Page components must:

* Resolve route input
* Call feature-level queries
* Handle not-found behavior
* Compose presentation components
* Define route metadata when required

Page components must not:

* Contain long mutation logic
* Build raw Supabase queries
* Define entity validation schemas
* Build Storage paths
* Contain authorization-policy tables
* Implement unrelated feature logic

---

# 8. Component Rules

## 8.1 Responsibility

Every component must have one clear responsibility.

Approved examples:

* `DestinationCard`
* `DestinationForm`
* `DestinationMapMarker`
* `PackageStopEditor`
* `TraditionalHouseDetail`
* `PublicationStatusBadge`
* `ArchiveConfirmationDialog`

Avoid names such as:

* `GenericCard`
* `UniversalForm`
* `ContentManager`
* `DataComponent`
* `DynamicEverything`

unless the abstraction has a proven cross-feature responsibility.

## 8.2 Abstraction Rules

Do not create a generic abstraction until:

* At least two real use cases exist
* Their behavior is materially identical
* The abstraction reduces duplication without hiding domain rules
* Ownership remains clear

Do not force materially different entities into:

* One generic detail page
* One universal content form
* One generic culture table
* One generic media relationship
* One generic publication mutation with hidden entity behavior

## 8.3 Public and Admin Separation

* Admin components must not be imported into public routes.
* Public cards must not contain admin controls.
* Shared UI primitives must remain domain-neutral.
* Authorization decisions must not be embedded inside low-level visual components.

## 8.4 Component Size

Split a component when it contains unrelated responsibilities.

Do not split only because the file exceeds an arbitrary line count.

A component may remain moderately large if it represents one coherent form or view.

---

# 9. Feature Module Rules

Each feature must own its domain behavior.

Recommended feature responsibilities:

```text
features/{feature}/
├── components/
├── data/
├── schemas/
├── types/
├── actions/
└── utilities/
```

The exact structure may be smaller when a feature does not need every directory.

## 9.1 Feature Ownership

Each feature module owns:

* Data-access functions
* Mutation functions
* Validation schemas
* Mapping functions
* Feature-specific types
* Feature-specific components
* Feature-specific constants
* Publication eligibility rules

## 9.2 Cross-Feature Rules

* Do not place feature code in global utility directories.
* Do not duplicate the same query in multiple routes.
* Do not let one feature directly modify another feature’s records.
* Use explicit orchestration for approved cross-feature workflows.
* Avoid circular dependencies.
* Do not import admin form logic into public components.
* Do not import public page presentation into mutation logic.

## 9.3 Specific Feature Boundaries

Maintain separate feature ownership for:

* Cultural articles
* Customary institution articles
* Traditional houses
* Cultural events

Do not merge these into a generic `culture-content` implementation that removes their distinct rules.

---

# 10. Supabase Client Rules

## 10.1 Client Types

Centralize Supabase clients in:

```text
lib/supabase/
```

Maintain separate approved clients for:

* Server use
* Browser use
* Exceptional server-only administrative use, when approved

Do not instantiate arbitrary clients throughout the application.

## 10.2 Credential Rules

* Never expose the service-role key to the browser.
* Never commit environment files.
* Never log secret credentials.
* Browser code may use only approved public variables.
* Service-role credentials must not be used for routine dashboard mutations.
* Privileged access must remain server-only.
* Do not use privileged credentials merely to avoid writing RLS policies.

## 10.3 Access Enforcement

Public queries must return only approved public data.

Admin operations must be protected by:

* Valid authentication
* Match with the configured single administrator identity
* Server-side checks
* Row Level Security
* Storage policies

No one layer replaces another.

---

# 11. Data-Access Rules

## 11.1 Centralization

All persistent data interaction must pass through feature-owned data-access functions.

Presentation components must not build Supabase queries.

## 11.2 Query Requirements

Queries must:

* Select only required fields
* Use explicit ordering
* Distinguish published and administrative use
* Respect publication status
* Handle expected nullability
* Return mapped application data
* Report query failures

Queries must not silently convert a service failure into an empty list.

The application must distinguish:

* No records
* No matching search result
* Not found
* Access denied
* Invalid data
* Service failure

## 11.3 Public Queries

Public queries must require:

* Published status
* Valid published parent relationships
* Publicly allowed fields only

Public queries must not return:

* Draft content
* Archived content
* Audit users
* Internal source notes
* Administrative metadata
* Private user information

## 11.4 Admin Queries

Admin list queries should retrieve summaries rather than all content.

Full records should be loaded for:

* Edit
* Preview
* Detail review

Admin pages must prioritize current data over long-lived caching.

## 11.5 Relationship Loading

Do not load all related images or content when the current view only requires:

* Count
* Thumbnail
* Name
* Status
* Summary

Avoid unbounded relationship queries.

---

# 12. Database Rules

## 12.1 Schema Authority

All table names, column names, relationships, nullability, and constraints must follow `schema.md`.

Do not:

* Introduce alternate names
* Add columns without updating `schema.md`
* Add tables without approval
* Store unsupported feature data in arbitrary text or JSON fields
* Store relationship IDs as comma-separated text
* Duplicate destination data inside package records

## 12.2 Keys and Relationships

* Use UUID primary keys where defined.
* Respect foreign keys.
* Respect unique constraints.
* Preserve explicit many-to-many relationships.
* Package destinations must use the approved junction relationship.
* Images must use dedicated image entities.
* User audit references must remain valid after account deactivation.

## 12.3 Publication Values

Publication values must use the approved lifecycle:

* `draft`
* `published`
* `archived`

Do not introduce additional publication states without updating the authoritative documents.

Do not represent:

* Verification
* Approval
* Rejection
* Scheduled publication

as hidden status strings unless the product model is revised.

## 12.4 Delete Rules

Version 1 content uses archive and restore, not soft delete or permanent delete.

* The dashboard must expose no permanent-delete action.
* Archive retains the record and removes it from public access.
* Restore changes an archived record to draft.
* Fixed destination categories cannot be archived or deleted.
* Controlled relationship or image-object cleanup is an internal maintenance operation and must not delete the parent content record.

## 12.5 Migrations

Database migrations are the deployed schema source of truth.

Every schema change must include:

* Migration
* `schema.md` update
* Relevant application change
* Relevant validation change
* RLS review
* Test updates

Do not manually alter production schema without a committed migration.

---

# 13. Authentication Rules

* Supabase Auth is the only approved authentication system.
* Public visitors do not require accounts.
* There is no public registration.
* There is no invitation or additional-account flow.
* All admin routes require authentication.
* Session validation must occur in trusted server boundaries.
* Invalid sessions must not render protected data.
* Only the configured administrator identity may retain access.
* Logout must terminate protected access.
* Password recovery must use the approved Supabase flow.
* Do not create custom password storage.
* Password-recovery responses must not reveal whether an arbitrary email exists.

## 13.1 Protected Route Behavior

| Condition                                   | Required behavior                        |
| ------------------------------------------- | ---------------------------------------- |
| No valid session                            | Redirect to login                        |
| Configured administrator session            | Allow protected access                   |
| Any other authenticated identity            | Deny, sign out, and log mismatch         |
| Expired session                             | Require login again                      |

## 13.2 Authentication Error Messages

Messages must be specific but must not disclose sensitive account state.

Allowed:

* “Email atau kata sandi tidak valid.”
* “Sesi Anda telah berakhir. Silakan masuk kembali.”
* “Akun ini tidak memiliki akses ke dashboard.”

Avoid:

* “Email exists but password is wrong.”
* Internal provider error text
* Authentication identifiers

---

# 14. Authorization Rules

## 14.1 Access States

Version 1 recognizes only anonymous visitor and configured authenticated administrator. Do not create role identifiers, role tables, permission matrices, user-management routes, invitation state, or approval-workflow state.

## 14.2 Administrator Permissions

The administrator may:

* Manage all approved content
* Publish
* Archive
* Restore
* Manage protected settings
* Manage media
* Review administrative records

Restore always returns archived content to draft. Permanent deletion is unavailable.

## 14.4 Enforcement

Authorization must be enforced through:

1. Navigation visibility
2. Protected page checks
3. Server Action checks
4. Data-access checks
5. RLS
6. Storage policies

Do not rely only on hiding buttons.

Every protected mutation must verify the configured administrator identity again on the server.

---

# 15. Row Level Security Rules

* Enable RLS on every client-accessible application table.
* Public read policies must expose only published content.
* Anonymous users must not create, update, archive, or delete content.
* Authenticated policies must permit only the configured administrator identity.
* Storage policies must use the same authorization model.
* Policy definitions must be version-controlled.
* Do not disable RLS to simplify development.
* Do not ship temporary open policies.
* Test permitted and denied operations.

## 15.1 Required RLS Test Cases

At minimum, verify:

* Anonymous user reads published content
* Anonymous user cannot read drafts
* Anonymous user cannot mutate content
* Configured administrator reads and performs approved management actions
* Any other authenticated identity cannot read administrator-only data or mutate content
* Restore changes archived content to draft
* Public Storage access does not expose private files

---

# 16. Validation Rules

Validation must exist at three levels:

1. Form level
2. Server application level
3. Database level

## 16.1 Zod and React Hook Form

* Zod is the application validation source.
* React Hook Form manages form state and immediate feedback.
* Server Actions must validate again.
* Client-side validation is not a security boundary.
* Do not expose raw database errors.

## 16.2 General Input Rules

* Required text must not be whitespace-only.
* Slugs must follow the approved format.
* Price fields are numeric: `0` means free, `null` unavailable, and positive values Indonesian rupiah.
* `price_note` is optional.
* Durations must be positive.
* Date ranges must be logical.
* Coordinate pairs must be complete.
* URLs must use approved formats.
* Contact values must match their declared type.
* Optional per-entity contact data requires a recorded publication-consent flag.
* Publication status must be valid.
* Repeatable list items must not contain empty entries.
* Duplicate package destinations must be rejected.
* Image metadata must be complete before publication.

## 16.3 Publication Validation

Draft validation and publication validation must remain separate.

Drafts may be incomplete.

Publishing must verify all required public fields.

Publication must be blocked when content contains known placeholder indicators, including:

* `Lorem ipsum`
* `TBD`
* `TODO`
* `Isi nanti`
* `Belum diisi`
* Other explicitly configured placeholder markers

Do not block legitimate content merely because it contains a common word. Placeholder detection must be reviewed and specific.

Event publication must apply this rule to the title, summary, description, date note, location, and schedule fields. No event placeholder may be published.

## 16.4 Validation Messages

Messages must:

* Use understandable Indonesian
* Identify the affected field
* Explain how to correct it
* Avoid internal terminology

Preferred:

```text
Latitude harus berada antara -90 dan 90.
```

Avoid:

```text
Constraint violation on destinations_latitude_check.
```

---

# 17. GIS and Coordinate Rules

## 17.1 Coordinate Storage

Production data stores:

* `latitude`
* `longitude`

Do not add PostGIS geometry in Version 1.

## 17.2 Coordinate Order

Database order:

```text
latitude, longitude
```

GeoJSON order:

```text
longitude, latitude
```

Conversion must be explicit and tested.

Never infer coordinate order from the values.

## 17.3 Coordinate Ranges

* Latitude: `-90` to `90`
* Longitude: `-180` to `180`

Both values must be present together unless the feature permits no public location.

Destination coordinates are mandatory before publication.

## 17.4 Coordinate Use

* Leaflet must receive validated coordinates only.
* Invalid coordinates must not produce markers.
* Do not use `0,0` as a fallback.
* Map markers must come from persisted records.
* Do not hardcode production destination arrays.
* Google Maps navigation must use approved links or validated coordinates.
* Public text lists must remain available when a record cannot be mapped.

## 17.5 QGIS Rules

QGIS may be used for:

* Initial coordinate review
* Initial data preparation
* Batch validation
* Specialist correction
* GeoJSON export

QGIS must not be required for:

* Daily content editing
* Routine publication
* Normal map display
* Administrator location updates

Village officers manage daily coordinates through the dashboard.

Every administrator form that stores coordinates must provide both map picking and manual latitude/longitude entry.

---

# 18. Leaflet Rules

* Leaflet components must be Client Components.
* Browser-only Leaflet code must not execute during server rendering.
* Load Leaflet CSS through the approved application-level entry point.
* One mounted map container must own one Leaflet map instance.
* Map container dimensions must be explicit.
* Apply the approved size-invalidation behavior after container changes.
* Do not apply global image styles that break map tiles.
* Display required OpenStreetMap attribution.
* Do not remove attribution.
* Destination marker categories must use only `alam`, `budaya`, or `religi`.
* Popup content must remain a summary.
* The relevant entity detail page remains the source of complete information.
* Provide a textual mapped-item alternative.
* Tile failure must not break the rest of the page.

## 18.1 Map Data Rules

Map data may include only what the map needs:

* ID
* Name
* Slug
* Summary
* Category
* Entity type
* Coordinates
* Thumbnail
* External navigation link

Do not send:

* Full history
* Full article content
* Audit details
* Source notes
* User details
* Draft state

## 18.2 Map Behavior Rules

The map must handle:

* No valid markers
* One valid marker
* Multiple markers
* Category filtering
* Invalid coordinates
* Mobile view
* Tile failure
* Denied geolocation
* Combined markers for identical approved coordinate pairs

The public tourism map may include published destinations, traditional houses, homestays, and visitable UMKM. Records with exactly the same approved coordinates must share one combined marker. UMKM Tenun and Kampung Adat must never render as overlapping duplicate markers.

Do not describe package marker sequence as:

* Optimized route
* Fastest route
* Shortest route
* Calculated route

---

# 19. Content Integrity Rules

This project documents living cultural and customary information.

The following rules are mandatory:

* Do not invent history.
* Do not invent rituals.
* Do not invent customary-office duties.
* Do not invent event dates.
* Do not infer cultural facts from names.
* Do not convert draft interview notes automatically into public articles.
* Do not present placeholder text as real content.
* Do not publish unverified cultural information.
* Do not expose sensitive customary information without administrator verification of publication suitability.
* Do not publish private information about living individuals without a valid need and recorded consent.
* Preserve local terminology where appropriate.
* Do not replace local terminology with misleading generic language.
* Do not exaggerate cultural claims in titles, metadata, or summaries.
* Do not translate culturally specific terms literally when the meaning would be distorted.

## 19.1 Cultural Publication

Publishing cultural or customary content requires:

* Identified content owner
* Complete public content
* Source or editorial verification process
* Authenticated administrator
* No known placeholder text
* No private internal source notes in public output

The software provides reminders and validation but no approval workflow. Publication status must not be presented as proof of formal cultural verification.

## 19.2 Source Notes

Source notes must:

* Remain administrative by default
* Not appear in public queries
* Not be included in metadata
* Not be copied automatically into the article
* Avoid unnecessary sensitive personal information

---

# 20. Publication Rules

## 20.1 Lifecycle

The approved content lifecycle is:

```text
draft
→ published
→ archived
```

The approved restore transition is:

```text
archived → draft
```

## 20.2 Default Status

* New manually created content starts as draft.
* Imported content starts as draft.
* Placeholder content remains draft.
* Content must never be published automatically after import.

## 20.3 Public Visibility

Only published content may appear publicly.

Archived content remains available to the administrator in the recovery view.

## 20.4 Preview

Draft previews must:

* Require authentication
* Require the configured administrator identity
* Be excluded from indexing
* Show a visible draft indicator
* Avoid exposing content through ordinary public URLs

## 20.5 Publication Actions

Publishing must:

* Validate required fields
* Validate relationships
* Validate media requirements
* Validate coordinates where required
* Validate cultural-content rules
* Confirm administrator identity
* Trigger public-content refresh
* Record publication time where supported

Archiving must not physically delete the record. Restoring returns it to draft.

---

# 21. Media Rules

## 21.1 Storage Responsibility

* Store image files in Supabase Storage.
* Store paths and metadata in PostgreSQL.
* Do not store image binaries in PostgreSQL.
* Do not use the repository for managed public uploads.
* Original high-resolution archives must remain outside Supabase production storage.

## 21.2 Approved Formats

Preferred:

* WebP

Allowed:

* JPEG for photographs when conversion is unavailable
* PNG when transparency or lossless rendering is required

Rejected:

* SVG through the dashboard
* Executable formats
* Video
* Animated media unless separately approved
* Files whose actual content does not match the declared type

## 21.3 File Validation

Validate:

* MIME type
* File signature where practical
* Extension
* Source size
* Dimensions
* Resulting compressed size
* Image decode success

Do not trust the original filename or browser-provided MIME type alone.

## 21.4 File Naming

Use:

* Stable entity ownership
* Deterministic folder structure
* Unique generated identifier
* Normalized safe filename suffix

Do not use:

* User-provided filename as the unique key
* Spaces or unsafe path characters
* Personal information in file paths
* Sequential public filenames that can collide

Recommended patterns:

```text
destinations/{destination_id}/thumbnail-{uuid}.webp
destinations/{destination_id}/gallery/{uuid}.webp
events/{event_id}/{uuid}.webp
traditional-houses/{house_id}/{uuid}.webp
```

## 21.5 Image Metadata

Every public content image requires:

* Storage bucket
* Storage path
* Alt text
* Display order
* Parent association
* Creation audit

Caption is optional.

Primary-image rules must be enforced where applicable.

## 21.6 Replacement

Image replacement must follow this sequence:

1. Validate new image.
2. Upload new image.
3. Confirm upload success.
4. Save new metadata.
5. Update primary or thumbnail reference.
6. Confirm new public reference.
7. Remove previous association.
8. Perform safe old-file cleanup.

Do not delete the valid previous image before the replacement succeeds.

## 21.7 Removal and Orphans

Removing metadata and deleting Storage objects are separate operations.

Do not leave orphaned files indefinitely.

Do not delete a Storage object until the system confirms that no valid record references it.

Orphan cleanup must:

* Be authorized
* Use a grace period
* Check references
* Log deletions
* Avoid public-request-time bulk cleanup

---

# 22. Provisional Image Size Targets

The values below are a prior proposal, not an approved Version 1 contract. They conflict with `prd.md` and `design.md` recommendations and must not be implemented until one canonical media specification is approved.

## 22.1 Thumbnail

* Recommended maximum width: `800 px`
* Target file size: `80–200 KB`

## 22.2 Gallery Image

* Recommended maximum width: `1600 px`
* Target file size: `150–500 KB`

## 22.3 Hero Image

* Recommended maximum width: `1920 px`
* Target file size: `300–700 KB`

## 22.4 Hard Limits

* Initial source-file hard limit: `10 MB`
* Files above the hard limit must be rejected before upload.
* Do not silently degrade an image to unusable quality.
* Do not use full-size gallery images as card thumbnails.
* Use responsive image delivery where supported.

If approved limits change, update:

* `prd.md`
* `design.md`
* `rules.md`
* Client validation
* Server validation
* Administrator guidance
* Tests

---

# 23. Form Rules

* All controls require visible labels.
* Use Indonesian helper text for unfamiliar fields.
* Do not expose internal database terminology.
* Group fields by administrator task.
* Mark required fields clearly.
* Preserve entered data after recoverable failure.
* Prevent duplicate submissions.
* Warn about unsaved changes where appropriate.
* Destructive actions require confirmation.
* Permanent delete must not exist as a Version 1 form or list action.
* Validation errors must appear near the affected fields.
* A form-level error summary is required for long forms.
* Publication and draft actions must be visually distinct.
* Do not show success before all required operations succeed.

## 23.1 Terminology

Prefer:

| Use                | Avoid                       |
| ------------------ | --------------------------- |
| Titik lokasi       | Geometry                    |
| Status publikasi   | Enum status                 |
| Urutan kunjungan   | Junction order              |
| Gambar utama       | Primary media relation      |
| Simpan Draft       | Insert draft record         |
| Arsipkan           | Hapus permanen              |
| Pranata Adat Bayan | Generic institution content |

## 23.2 Slug Rules

* Slug is generated automatically from the initial name or title.
* Slug is hidden from normal administrator forms.
* Automatic regeneration is allowed only before first publication.
* Slug becomes immutable after first publication and remains unchanged through archive and restore.
* Slug conflicts must produce a clear validation message.
* Do not silently append arbitrary suffixes.

## 23.3 Coordinate Form Rules

Every administrator form that stores coordinates must provide:

* Latitude
* Longitude
* Map picker
* Current marker preview
* Clear invalid-coordinate feedback

Selecting a point must update both fields.

Manual entry must update the marker when valid.

---

# 24. Error-Handling Rules

* Do not suppress errors silently.
* Do not expose stack traces.
* Do not expose Supabase internals.
* Do not expose database table names to public users.
* Do not expose credentials.
* Do not convert every failure into “no data”.
* Log technical context server-side.

Every user-facing error must explain:

1. What failed
2. Whether any data was saved
3. What the user can do next

## 24.1 Examples

Avoid:

```text
Something went wrong.
```

Prefer:

```text
Foto belum berhasil diunggah. Data destinasi belum disimpan. Periksa koneksi lalu coba lagi.
```

Prefer:

```text
Artikel berhasil disimpan sebagai draft, tetapi gambar utama belum berhasil diunggah. Coba unggah gambar kembali.
```

Prefer:

```text
Konten belum dapat diterbitkan karena masih terdapat teks placeholder.
```

## 24.2 Logging

Server logs may include:

* Error category
* Feature
* Action
* Safe user ID
* Safe record ID
* Timestamp
* Safe provider error code
* Correlation identifier

Do not log:

* Password
* Token
* Service key
* Complete private source notes
* Complete file data
* Sensitive personal information
* Raw environment variables

---

# 25. Loading and Empty-State Rules

## 25.1 Loading

* Every asynchronous section must define a loading state.
* Avoid full-page spinners when one section is loading.
* Preserve layout dimensions.
* Map loading must reserve map height.
* Form submission must show the current action.
* Prevent duplicate clicks while processing.

## 25.2 Empty States

Admin empty states must:

* Explain that no record exists
* Offer an appropriate primary action when permitted

Public empty states must:

* Avoid exposing draft counts
* Avoid implying that content does not exist internally
* Explain whether no published content is available

## 25.3 No Search Results

A search with no results must differ from an empty database.

Examples:

```text
Belum ada destinasi yang dipublikasikan.
```

```text
Tidak ada destinasi yang cocok dengan pencarian “lokok”.
```

## 25.4 Map Empty States

Distinguish:

* No published destination
* Published records without valid coordinates
* Map tiles unavailable
* Map data failed to load

The textual destination list must remain usable.

---

# 26. Accessibility Rules

* Use semantic HTML.
* Preserve heading hierarchy.
* Provide a skip-to-content link.
* Support keyboard navigation.
* Provide visible focus states.
* Associate labels, helper text, and errors with controls.
* Do not communicate state through color alone.
* Informative images require alt text.
* Decorative images use empty alt text.
* Interactive icons require accessible labels.
* Maintain adequate contrast.
* Respect reduced-motion preferences.
* Do not autoplay audio or video.
* Navigation must be usable without hover.
* The map must have an equivalent textual list.

## 26.1 Dialogs

Dialogs must:

* Have an accessible name
* Move focus into the dialog
* Keep focus within the dialog
* Support Escape when safe
* Provide an explicit close action
* Return focus to the trigger

## 26.2 Ordering Controls

Image and package-stop ordering must provide keyboard-accessible controls.

Drag-and-drop alone is not sufficient.

Provide:

* Move up
* Move down

where ordering is required.

---

# 27. Responsive Rules

Target ranges:

```text
Mobile: below 768px
Tablet: 768px–1023px
Desktop: 1024px and above
```

Mandatory rules:

* Design mobile-first.
* Public navigation must work on narrow screens.
* Map controls must remain usable.
* Popups must remain inside the viewport.
* Avoid fixed-width content causing overflow.
* Admin tables must have approved mobile behavior.
* Forms must use a single column on mobile.
* Paired fields may share a row only when still readable.
* Do not reduce touch targets below accessible dimensions.
* Test long local names.
* Test real descriptions.
* No critical action may depend on hover.
* Modal content must fit small screens.

Admin tables may:

* Become cards
* Use controlled horizontal scrolling

They must not compress text and actions until they become unusable.

---

# 28. SEO Rules

* Only published content is indexable.
* Draft, archived, admin, authentication, and preview routes must not be indexed.
* Every public detail page requires a unique title and description.
* Metadata must come from approved content.
* Do not fabricate metadata.
* Generate canonical URLs.
* Include only published pages in the sitemap.
* Exclude archived content.
* Use approved Open Graph images.
* Do not make unverified cultural claims.
* Do not represent an unconfirmed event date as confirmed.
* Published slugs are immutable, so canonical public URLs remain stable.

If public content lacks a meaningful summary, use an approved neutral fallback or omit the metadata field rather than inventing copy.

---

# 29. Performance Rules

* Avoid unnecessary Client Components.
* Load Leaflet only on routes requiring maps.
* Do not load complete galleries on list pages.
* Use optimized images.
* Avoid large browser libraries for small interactions.
* Do not fetch the same data repeatedly in one render path.
* Select only required fields.
* Cache public content according to `design.md`.
* Admin content must prioritize freshness.
* Do not introduce Redis or advanced caching without measured need.
* Measure before optimizing.
* Do not sacrifice correctness or accessibility for a score.

## 29.1 Homepage

The homepage must use summaries and limited featured content.

It must not load:

* Every destination description
* Every event record
* Every gallery image
* Complete package relationships
* All admin-managed fields

## 29.2 Map

The map receives compact marker data only.

Do not send full destination content to the map merely because it is available.

---

# 30. Testing Rules

At minimum, maintain:

## 30.1 Unit Tests

Test:

* Validation schemas
* Coordinate validation
* GeoJSON coordinate conversion
* Slug utilities
* Data mapping
* Publication eligibility
* Price validation
* Event date validation
* Package order normalization
* Storage-path generation
* Error normalization

## 30.2 Integration Tests

Test:

* Published-only public queries
* Authenticated admin queries
* Authenticated mutations
* Denied mutations
* RLS behavior
* Storage authorization
* Image metadata association
* Primary image behavior
* Package-destination uniqueness
* Package order persistence
* Configured administrator identity enforcement
* Denial of any other authenticated identity

## 30.3 End-to-End Tests

Test critical flows:

* Login
* Invalid login
* Logout
* Password recovery
* Create destination
* Edit destination
* Save draft
* Select map coordinate
* Upload image
* Replace image
* Publish destination
* Verify public appearance
* Open map marker
* Open destination detail
* Create package
* Select destinations
* Reorder package stops
* Publish package
* Archive content
* Verify archived content disappears
* Restore archived content to draft
* Verify a non-configured identity is denied
* Verify event placeholders cannot be published
* Verify UMKM Tenun and Kampung Adat share one marker

## 30.4 Testing Conduct

* Test successful and denied paths.
* Do not mock away authorization in the only integration test.
* Add regression tests for production-impacting bugs where practical.
* Do not claim tests passed unless they ran.
* State tests that were not run.
* Test critical mobile flows on a physical phone where possible.
* Manual testing with village officers is required before handover.

---

# 31. Migration Rules

For initial QGIS or GeoJSON migration:

* Validate the GeoJSON structure.
* Preserve source files.
* Record import date and source.
* Explicitly convert `[longitude, latitude]`.
* Import records as draft.
* Detect duplicate candidates.
* Do not overwrite manually reviewed records without approval.
* Map categories to approved existing categories.
* Report missing and unsupported fields.
* Produce an import summary.
* Do not treat QGIS as the operational database.

## 31.1 Import Summary

The import report must show:

* Inserted
* Skipped
* Invalid
* Duplicate candidates
* Unknown categories
* Generated slugs
* Created record IDs
* Source file
* Import date

## 31.2 Duplicate Handling

Do not automatically merge solely because:

* Names are similar
* Coordinates are close
* Slugs conflict

Flag candidates for manual review.

## 31.3 Publishing Imported Data

Imported data must not be published automatically.

Manual review must cover:

* Name
* Category
* Coordinate
* Summary
* Description
* Images
* Visitor information
* Cultural sensitivity
* Publication status

---

# 32. Version Control Rules

* Use Git.
* Do not commit secrets.
* Do not commit `.env.local`.
* Do not commit build output.
* Commit migrations.
* Commit policy definitions.
* Commit relevant documentation changes.
* Use clear commit messages.
* Avoid unrelated changes in one commit.
* Do not commit original high-resolution media.
* Record stable release points.
* Protect the production branch according to team workflow.

## 32.1 Commit Scope

A commit should represent one coherent change.

Examples:

Approved:

```text
feat(destinations): add destination draft form
```

```text
fix(map): exclude invalid destination coordinates
```

```text
docs(schema): define package destination ordering
```

Avoid:

```text
update project
```

```text
fix things
```

```text
final changes
```

## 32.2 Generated Files

Do not manually edit generated files unless the generation workflow requires it.

Generated database types must be regenerated after relevant schema changes.

---

# 33. Documentation Rules

Update the authoritative document when behavior changes.

| Change                                 | Required document |
| -------------------------------------- | ----------------- |
| Product behavior                       | `prd.md`          |
| Architecture or production service     | `architecture.md` |
| Table, field, constraint, relationship | `schema.md`       |
| Route, module, form, application flow  | `design.md`       |
| Implementation constraint              | `rules.md`        |
| Delivery sequence or status            | `roadmap.md`      |
| Permanent project boundary             | `project.md`      |

Mandatory rules:

* Do not knowingly let code and documentation diverge.
* Do not duplicate full decisions across every document.
* Reference the authoritative document.
* Update documentation before or alongside significant implementation.
* Do not document unapproved behavior as completed.
* Do not mark pending decisions as final.

---

# 34. AI Coding Agent Rules

## 34.1 Before Coding

An AI coding agent must:

1. Read all project documents.
2. Inspect the existing repository.
3. Identify the feature owner.
4. Identify relevant scope constraints.
5. Identify relevant schema fields.
6. Identify authorization requirements.
7. Report material conflicts.
8. State expected files to change.
9. State the validation and test plan.

The agent should not ask a question when the answer already exists in project documentation or existing code.

The agent must ask or stop when a genuinely blocking product, schema, architecture, or authorization decision is unresolved.

## 34.2 During Coding

An AI coding agent must:

* Make the smallest coherent change
* Follow existing patterns
* Avoid unrelated refactoring
* Avoid adding dependencies without justification
* Preserve type safety
* Preserve RLS
* Preserve public and admin separation
* Avoid generic abstractions without demonstrated need
* Avoid dummy production content
* Avoid fabricated cultural information
* Handle loading, error, and empty states
* Add or update tests where relevant

## 34.3 Prohibited AI-Agent Behavior

An AI coding agent must not:

* Add features outside the PRD
* Redesign the schema
* Redesign architecture silently
* Replace approved technologies
* Expose secrets
* Disable RLS
* Use service-role credentials in browser code
* Invent cultural or historical information
* Create fake event schedules
* Publish placeholder content
* Add dummy production accounts
* Claim tests passed without running them
* Rewrite unrelated modules for style preference
* Permanently delete protected content
* Add a generic abstraction without proven repetition
* Hide unresolved assumptions

## 34.4 After Coding

The agent must report:

* Files changed
* Behavior implemented
* Scope boundaries respected
* Tests run
* Commands run
* Test results
* Tests not run
* Unresolved limitations
* Documentation impact
* Any assumptions made

---

# 35. Code Review Rules

Reject a change when it:

* Violates MVP scope
* Adds an unapproved technology
* Adds an unapproved dependency
* Bypasses RLS
* Exposes secrets
* Performs raw Supabase queries in arbitrary UI components
* Duplicates business logic
* Uses unvalidated coordinates
* Publishes drafts
* Exposes archived content
* Breaks mobile behavior
* Invents cultural content
* Omits required error states
* Changes schema without migration and documentation
* Uses hidden UI as the only authorization control
* Permanently deletes protected content
* Leaves media orphaning unhandled
* Introduces inaccessible critical interactions
* Adds unsupported package fields
* Adds visitor registration
* Adds booking or payment behavior
* Uses QGIS as daily operational storage
* Claims optimized routing

## 35.1 Review Questions

A reviewer must verify:

1. Is the behavior in the PRD?
2. Does the implementation follow the approved architecture?
3. Does persistent data follow `schema.md`?
4. Are authorization checks present at all required layers?
5. Can public users access only published data?
6. Are error and empty states distinct?
7. Is mobile behavior defined?
8. Is accessibility preserved?
9. Are cultural-content rules followed?
10. Were relevant tests run?
11. Does documentation need updating?

---

# 36. Definition of Done

A task is complete only when:

* Behavior matches `prd.md`.
* Implementation follows `architecture.md`.
* Application structure follows `design.md`.
* Persistent data follows `schema.md`.
* These rules are satisfied.
* TypeScript passes.
* Lint passes.
* Relevant tests pass.
* Loading states are handled.
* Empty states are handled.
* Error states are handled.
* Mobile behavior is checked.
* Accessibility is checked.
* Authorization is verified.
* Public and admin boundaries are preserved.
* Documentation is updated where required.
* No secrets remain.
* No temporary debugging code remains.
* No placeholder production content remains.
* Acceptance criteria are demonstrably met.

“Code written” is not equivalent to “done.”

## 36.1 Incomplete Task Reporting

When a task cannot meet Definition of Done, report:

* What is complete
* What is incomplete
* Why it is incomplete
* What decision or dependency blocks it
* Which tests were not run
* Whether the incomplete state is safe to merge

Do not label a partial implementation as complete.

---

# 37. Exception Process

A rule may be violated only through an explicit exception.

The exception request must include:

1. Rule being violated
2. Concrete reason
3. Requirement that cannot otherwise be met
4. Alternatives considered
5. Security impact
6. Maintenance impact
7. Scope impact
8. Data impact
9. Responsible owner
10. Removal or review condition
11. Documentation changes
12. Explicit approval

Temporary shortcuts must include:

* Owner
* Reason
* Expiration or removal condition
* Follow-up task
* Risk description

Do not hide exceptions inside implementation details.

Do not use “temporary” as justification without a removal plan.

---

# 38. Pre-Merge Checklist

## Scope

* [ ] Change is included in the approved MVP.
* [ ] No booking, payment, reviews, ratings, favorites, AI, or route optimization was added.
* [ ] No unsupported package field was introduced.
* [ ] No public visitor account behavior was added.

## Approved Stack

* [ ] Only approved technologies are used.
* [ ] No second backend or database was introduced.
* [ ] New dependencies have documented justification.
* [ ] No overlapping library was added.

## TypeScript

* [ ] Strict type checking passes.
* [ ] No unjustified `any` was introduced.
* [ ] No unsafe assertion bypasses validation.
* [ ] Nullable fields are handled explicitly.

## Next.js and Components

* [ ] Server Components are used by default.
* [ ] Client boundaries are limited.
* [ ] Page components do not contain raw business logic.
* [ ] Public and admin components remain separated.
* [ ] No premature universal abstraction was added.

## Data Access

* [ ] Supabase access is centralized.
* [ ] UI components do not contain raw Supabase queries.
* [ ] Queries select only required fields.
* [ ] Query failure is not disguised as an empty state.
* [ ] Public and admin queries use separate visibility rules.

## Schema

* [ ] Table and column names follow `schema.md`.
* [ ] No undocumented field or table was added.
* [ ] Relationships remain explicit.
* [ ] Package destinations use the approved relationship.
* [ ] Archive and restore rules are preserved; no permanent-delete operation exists.
* [ ] Migration is included when required.

## Authentication

* [ ] Protected routes require authentication.
* [ ] Session expiration is handled.
* [ ] Only the configured administrator identity is accepted.
* [ ] No custom password storage exists.
* [ ] Password-recovery behavior does not expose account existence.

## Authorization

* [ ] Administrator identity is checked server-side.
* [ ] RLS enforces access.
* [ ] Storage policies enforce access.
* [ ] No user, role, invitation, or approval-management feature exists.
* [ ] Authorization is not implemented only through hidden buttons.

## RLS

* [ ] RLS remains enabled.
* [ ] Anonymous users can read only approved published content.
* [ ] Denied operations were tested.
* [ ] No routine service-role bypass was introduced.
* [ ] Policy changes are version-controlled.

## GIS

* [ ] Latitude and longitude order is correct.
* [ ] GeoJSON conversion is explicit where relevant.
* [ ] Coordinate ranges are validated.
* [ ] Invalid coordinates do not create markers.
* [ ] No PostGIS dependency was introduced.
* [ ] Package sequence is not described as optimized routing.

## Leaflet

* [ ] Leaflet runs only in browser-compatible boundaries.
* [ ] Map initializes once per container.
* [ ] Container dimensions are defined.
* [ ] OpenStreetMap attribution remains visible.
* [ ] Map failure does not break the page.
* [ ] A textual location alternative exists.

## Media

* [ ] Files are stored in Supabase Storage.
* [ ] Binary files are not stored in PostgreSQL.
* [ ] File type, size, and dimensions are validated.
* [ ] Filenames are generated safely.
* [ ] Alt text is required.
* [ ] Replacement is failure-safe.
* [ ] Orphan cleanup is addressed.
* [ ] Original archives are not committed to Git.

## Validation

* [ ] Client validation exists where useful.
* [ ] Server validation is authoritative.
* [ ] Database constraints remain intact.
* [ ] Publication validation is stricter than draft validation.
* [ ] Placeholder content cannot be published.
* [ ] Indonesian error messages are clear.

## Content Integrity

* [ ] No cultural or historical facts were invented.
* [ ] No unconfirmed event date was presented as confirmed.
* [ ] Source notes remain private.
* [ ] Sensitive location or personal information was reviewed.
* [ ] Local terminology was preserved appropriately.

## Error and State Handling

* [ ] Loading state exists.
* [ ] Empty state exists.
* [ ] Search-empty state is distinct.
* [ ] Service failure is distinct.
* [ ] Error messages explain what failed and what to do.
* [ ] No raw internal error is shown.

## Accessibility

* [ ] Semantic structure is preserved.
* [ ] Keyboard access works.
* [ ] Focus states are visible.
* [ ] Form errors are associated with fields.
* [ ] Dialog behavior is accessible.
* [ ] Images have correct alt behavior.
* [ ] Critical ordering actions do not depend only on drag-and-drop.
* [ ] Map content has a text alternative.

## Responsiveness

* [ ] Public navigation works below 768 px.
* [ ] Admin forms remain usable on mobile.
* [ ] Map controls and popups fit small screens.
* [ ] No critical action requires hover.
* [ ] Long content does not create horizontal overflow.

## Tests

* [ ] Relevant unit tests pass.
* [ ] Relevant integration tests pass.
* [ ] Authorization denial is tested.
* [ ] Relevant end-to-end tests pass.
* [ ] Regression tests were added where practical.
* [ ] Tests not run are reported honestly.
* [ ] Critical mobile flow was checked.

## Documentation

* [ ] Authoritative documentation remains accurate.
* [ ] Schema changes include schema documentation.
* [ ] Product changes include PRD changes.
* [ ] Application-flow changes include design changes.
* [ ] New constraints include rules changes.
* [ ] No pending decision was documented as final.

## Security

* [ ] No secrets were committed.
* [ ] No secret was logged.
* [ ] No privileged credential reached browser code.
* [ ] Upload behavior rejects unsafe files.
* [ ] Draft and archived content remain private.
* [ ] Public responses expose no private user information.

## AI Agent Compliance

* [ ] Existing code was inspected before changes.
* [ ] Material conflicts were reported.
* [ ] No unrelated refactor was performed.
* [ ] No unapproved dependency was introduced.
* [ ] Files changed were reported.
* [ ] Tests run were reported accurately.
* [ ] Assumptions and limitations were disclosed.
