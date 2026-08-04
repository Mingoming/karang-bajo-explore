# Implementation Roadmap

## Karang Bajo Tourism Information System

- **Project status:** Release preparation
- **Production code:** Core public domains, administration modules, GIS, media delivery, SEO foundation, public Village Profile, and centralized official contact/WhatsApp flows implemented
- **Documentation status:** Being synchronized with the current release candidate
- **Roadmap type:** Production implementation roadmap
- **Team context:** Small university KKN development team

> Historical phase checklists below remain as implementation records. Current release status is tracked through `TODO.md` and `MVP_RELEASE_SCOPE.md`.

---

# 0. Document Purpose

This document defines the implementation sequence from project setup to production handover.

It establishes:

* Implementation phases
* Dependencies
* Milestones
* Deliverables
* Completion criteria
* Testing progression
* Migration activities
* Handover activities
* Risks and mitigation
* Overall progress checklist

This document does not define:

* Product behavior
* Database design
* System architecture
* Detailed sprint tasks
* Daily developer assignments
* UI specifications

Authoritative references:

* `project.md`
* `prd.md`
* `architecture.md`
* `schema.md`
* `design.md`
* `rules.md`

---

# 1. Current Project State

| Area                        | Current status                      |
| --------------------------- | ----------------------------------- |
| Project context             | Defined                             |
| Product requirements        | Drafted                             |
| Architecture                | Defined                             |
| Logical schema              | Defined                             |
| Application design          | Defined                             |
| Development rules           | Defined                             |
| Roadmap                     | This document                       |
| Production repository       | Initialized with Next.js and npm lockfile |
| Hosted Supabase development target | Exists; not the production target     |
| Production Supabase target | Not approved; no production access or mutation authorized |
| Release-candidate code      | Implemented on `main`; not production-ready |
| Application tests           | 23 files and 283 tests passing      |
| Local database tests        | 448 pgTAP assertions passing         |
| GitHub quality gate         | Active `main` ruleset requires `Quality` |
| Initial tourism data        | Partially collected                 |
| Cultural content            | Incomplete                          |
| QGIS data                   | Requires validation and preparation |
| Production ownership        | Not finalized                       |
| Administrator access        | One Supabase Auth administrator approved |

---

## 1.1 Release Milestone Reconciliation

| Milestone or delivery | Implementation status | Remaining boundary |
| --------------------- | --------------------- | ------------------ |
| Milestone 5 GIS | Completed on `main` | Production coordinate/content verification and any approved initial-data import remain pending |
| Milestone 6 SEO, performance, and release quality gate | Merged through PR #1; README correction merged through PR #2 | Production origin, final assets, and production validation remain pending |
| Public Village Profile | Merged through PR #3 | Approved production profile content and acceptance remain pending |
| Centralized official contact and WhatsApp | Merged through PR #4, including `/kontak`, administrator contact management, and central WhatsApp configuration | Approved production contact data, ownership, and publication consent remain pending |
| English Village Profile database | Merged through PR #12 | Production migration approval and post-migration validation remain pending |
| Public English Village Profile | Merged through PR #13 at `/en/village-profile` | Verified English production content and smoke validation remain pending |
| Admin English Village Profile workflow | Merged through PR #14 | Production administrator acceptance and content verification remain pending |
| Production deployment runbook | Documented in `PRODUCTION_DEPLOYMENT_RUNBOOK.md` | Hosted read-only preflight and database mutation each require separate approval |

PRs #1 through #4 and PRs #12 through #14 are merged. PR #12 delivered the English Village Profile database migration, PR #13 delivered `/en/village-profile`, and PR #14 delivered the administrator workflow. The active development baseline is `main`, protected by an active repository ruleset that requires the `Quality` check.

The previously used hosted Supabase target is a development target. It must not be treated as the production target. No production target, hosted read-only preflight, database mutation, application deployment, or content publication is approved by this documentation update.

General Cultural Articles, Bayan Customary Institution Articles, the Standalone Public Gallery, Advanced Dashboard Analytics, responsive image derivatives, advanced structured data, and visitor analytics remain proposed Version 1.1 deferrals pending explicit approval.

---

# 2. Missing and Inconsistent Dependencies

The following decisions must be resolved at the specified phase gate.

| Decision                              | Affected phase             | Interim rule                                              | Required action                                      |
| ------------------------------------- | -------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Administrator identity configuration  | Phase 2 security           | Do not finalize RLS without a secure sole-admin UUID check | Document the deployment/database mechanism           |
| Public facilities display             | Feature implementation     | Render only entered non-empty values                       | Confirm presentation rule                            |
| Supabase region                       | Phase 2 platform setup     | No production project until selected                       | Select region                                        |
| Supabase, Vercel, repository ownership | Deployment and handover   | No personal student ownership at handover                  | Assign official institutional owner                  |
| Backup frequency and owner            | Deployment and handover    | Not finalized                                              | Approve operational procedure                       |
| Source-note public exposure           | Phase 2 security           | Administrator-only                                        | Select column grant, public view, or server-only path |
| Original media archive                | Media phase and handover   | Production assets still require an independent village-owned archive | Assign archive ownership and procedure before handover |
| Event temporal semantics              | Event implementation      | Do not infer uncertain dates                               | Define time zone, all-day, and upcoming/past rules   |
| Package map and public search         | Feature implementation    | Treat as optional                                          | Decide required Version 1 behavior                   |
| Settings keys and import provenance   | Database and import        | Only central WhatsApp key is fixed                         | Approve additional keys and report-only versus stored provenance |
| OSM provider, caching, and monitoring | GIS, public rendering, deployment | No production assumption                              | Select provider, Next.js 16 cache strategy, logs, alerts, and retention |
| Preview URL behavior                  | Admin content phase        | Authenticated and `noindex`                                | Finalize preview route behavior                      |

No phase may introduce data fields, permissions, or product behavior that contradict these interim rules.

---

# 3. Development Principles

The implementation must follow these principles:

1. Build foundations before features.
2. Stabilize persistent data before depending on it.
3. Complete authentication and authorization before protected content management.
4. Build one representative vertical feature before duplicating the pattern.
5. Use destinations as the first complete vertical slice.
6. Implement GIS only after destination data is stable.
7. Add media management after a valid parent-content workflow exists.
8. Maintain a deployable application at the end of every phase.
9. Test each layer when introduced.
10. Avoid rewriting completed modules unless requirements change.
11. Do not implement speculative future features.
12. Do not publish incomplete or unverified production content.
13. Treat deployment ownership and administrator training as project deliverables.

---

# 4. Roadmap Overview

```text
Phase 0 Decisions Complete
          |
          v
Phase 1 — Project Foundation
          |
          v
Phase 2 — Database and Security Foundation
          |
          v
Phase 3 — Authentication and Protected Application
          |
          v
Phase 4 — Core Content Vertical Slice
          |
          v
Phase 5 — GIS Integration and Initial Data Import
          |
          v
Phase 6 — Tourism and Supporting Content Features
          |
          v
Phase 7 — Administration Completion
          |
          v
Phase 8 — Quality Assurance and Village Validation
          |
          v
Phase 9 — Production Deployment
          |
          v
Phase 10 — Village Handover
```

Each phase must leave the application in a deployable state.

---

# 5. Suggested Timeline

This timeline assumes a small team with limited KKN availability and parallel content-collection responsibilities.

| Phase                          | Suggested duration | Main outcome                                  |
| ------------------------------ | -----------------: | --------------------------------------------- |
| Phase 0 — Decision gate        |          Complete | Version 1 product/access decisions recorded   |
| Phase 1 — Foundation           |           3–5 days | Runnable application and repository           |
| Phase 2 — Database foundation  |           5–7 days | Schema, RLS, Storage ready                    |
| Phase 3 — Authentication       |           4–6 days | Protected admin access                        |
| Phase 4 — Core content         |         10–14 days | First complete public/admin content flows     |
| Phase 5 — GIS                  |           5–8 days | Interactive map and imported draft locations  |
| Phase 6 — Tourism features     |         10–14 days | Packages, homestays, UMKM, culture completion |
| Phase 7 — Dashboard completion |           6–9 days | Consistent administration experience          |
| Phase 8 — Quality assurance    |          7–10 days | Product acceptance candidate                  |
| Phase 9 — Deployment           |           3–5 days | Stable production release                     |
| Phase 10 — Handover            |           3–5 days | Village ownership and training                |

**Estimated implementation window:** approximately 8–11 weeks.

The timeline must be shortened by reducing scope only through approved PRD changes, not by skipping security, validation, testing, or handover.

---

# 6. Phase 0 — Documentation and Decision Gate

## Objective

Record the approved Version 1 product, access, data, and repository boundaries before foundation work.

**Status:** Complete. The project has advanced to Phase 1.

## Deliverables

* Approved `project.md`
* Approved `prd.md`
* Approved `architecture.md`
* Approved `schema.md`
* Approved `design.md`
* Approved `rules.md`
* Approved `roadmap.md`
* Single-administrator access model
* Indonesian-default, single-language database baseline
* Final package feature boundary
* Fixed destination categories
* Archive-and-restore lifecycle
* Slug, price, contact, and map decisions
* Root application structure, npm, Tailwind CSS, and public-assets conventions

## Required Decisions

* [x] One Supabase Auth administrator may create, edit, publish, archive, restore, upload media, and manage settings.
* [x] Editor, role, user, invitation, and approval-workflow features are excluded.
* [x] Indonesian is the default locale; the original database-content baseline is single-language.
* [x] New content starts as draft and permanent deletion is excluded.
* [x] Package participant limits and structured stop timing/activity are excluded.
* [x] Traditional houses remain separate and may appear on the map directly.
* [x] Categories, slugs, prices, contacts, map entities, co-located markers, and location forms are defined.

## Dependencies

None.

## Risks

| Risk                         | Impact               | Mitigation                                       |
| ---------------------------- | -------------------- | ------------------------------------------------ |
| Stakeholders delay decisions | Later phases blocked | Conduct one focused approval meeting             |
| Decisions remain verbal      | Future conflict      | Record every decision in authoritative documents |
| Scope continues to expand    | Schedule failure     | Freeze Version 1 after approval                  |

## Completion Criteria

* [x] No unresolved product decision blocks Phase 1 foundation work.
* [x] Scope exclusions are recorded.
* [x] Documents use the approved Version 1 baseline.
* [x] Phase 1 may proceed without inventing product requirements.

---

# 7. Phase 1 — Project Foundation

## Objective

Create a reproducible and deployable development foundation.

## Deliverables

### Repository

* Git repository
* Protected production branch policy
* Clear commit convention
* `.gitignore`
* Pull-request or review process appropriate for the team

### Application

* Next.js App Router project
* TypeScript strict mode
* Existing root `app/` structure retained
* Tailwind CSS foundation
* Public route group
* Authentication route group
* Admin route group
* Base layouts
* Global error boundary
* Not-found page
* Loading-state foundation

### Code Quality

* ESLint
* Prettier
* Type-check command
* Lint command
* Test command placeholders
* Environment validation
* npm commands and existing `package-lock.json`

### Configuration

* Local environment-variable template without secrets
* Separate development and production configuration plan
* Initial project README
* Document index
* Static browser-asset convention under `public/`

### Platform Setup

* Development Supabase project
* Development Vercel project or preview deployment
* GitHub-to-Vercel integration

## Working Increment

At the end of this phase:

* The application builds successfully.
* Public, auth, and admin placeholder routes render.
* Preview deployment works.
* No business feature is implemented yet.

## Dependencies

* Phase 0 complete
* Approved technology stack
* Repository owner identified

## Risks

| Risk                               | Impact             | Mitigation                              |
| ---------------------------------- | ------------------ | --------------------------------------- |
| Incorrect initial folder structure | Early rework       | Follow `design.md`                      |
| Secrets committed                  | Security incident  | Add environment checks and review       |
| Too many libraries added early     | Maintenance burden | Add only approved minimum dependencies  |
| Personal repository ownership      | Handover risk      | Use transferable organization ownership |

## Completion Criteria

* [ ] Repository is accessible to the development team.
* [ ] Next.js application runs locally.
* [ ] Production build succeeds.
* [ ] TypeScript strict mode is active.
* [ ] Lint passes.
* [ ] Preview deployment succeeds.
* [ ] No secrets are committed.
* [ ] Route groups match `design.md`.
* [ ] Root `app/` structure is retained and no `src/` migration is introduced.
* [ ] npm and `package-lock.json` remain the package setup.
* [ ] Tailwind CSS is configured as the approved styling system.
* [ ] Static browser assets are placed under `public/`.
* [ ] README explains local setup.
* [ ] The increment is deployable.

---

# 8. Phase 2 — Database and Security Foundation

## Objective

Translate the approved logical model into a secure Supabase foundation.

## Deliverables

### Database

* Initial migration set
* All approved tables
* Primary keys
* Foreign keys
* Unique constraints
* Coordinate constraints
* Publication-status rules
* Audit fields
* Archive-and-restore status support without permanent deletion
* Seeded fixed destination categories: `Alam`, `Budaya`, and `Religi`
* Required indexes

### Authorization Foundation

* RLS enabled on application tables
* Public read policies
* Authenticated content-management policies
* Single-administrator policies
* Storage access policies

### Authentication Data

* Initial single-administrator Supabase Auth account procedure
* Secure configured administrator-identity mechanism
* No application user or role tables

### Storage

* Approved Storage buckets
* Folder conventions
* Supported file-policy boundaries
* Public and protected access rules

### Development Types

* Generated database types
* Shared publication-status types
* Initial application mappers

## Working Increment

At the end of this phase:

* Database migrations can be applied from zero.
* Public users can read only approved test published records.
* Anonymous users cannot mutate data.
* The configured administrator path and all denied anonymous/non-configured paths can be tested.
* Storage access follows approved policies.

## Dependencies

* Phase 1
* Approved `schema.md`
* Documented administrator identity configuration
* Approved Storage bucket strategy

## Risks

| Risk                                          | Impact                              | Mitigation                                     |
| --------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Schema changes during feature development     | Migration rework                    | Freeze MVP model before phase completion       |
| RLS too permissive                            | Data exposure                       | Test denied paths before proceeding            |
| RLS too restrictive                           | Development blocked                 | Build policy tests and documented matrix       |
| Service-role key used as shortcut             | Security and architecture violation | Prohibit routine bypass                        |
| Image tables and thumbnail references diverge | Broken media                        | Define synchronization rule before media phase |

## Completion Criteria

* [ ] Migrations apply to an empty development project.
* [ ] Migrations are committed.
* [ ] All required entities from `schema.md` exist.
* [ ] RLS is enabled.
* [ ] Anonymous mutation attempts fail.
* [ ] Draft and archived records are not publicly readable.
* [ ] Policies permit the configured administrator and deny every other identity.
* [ ] Storage policies are tested.
* [ ] Generated types are available.
* [ ] No undocumented field or table exists.
* [ ] The increment remains deployable.

---

# 9. Phase 3 — Authentication and Protected Application

## Objective

Establish secure access to the administration interface before protected features are built.

## Deliverables

### Authentication

* Login
* Logout
* Password recovery request
* Password reset
* Authentication callback
* Session refresh
* Session expiration handling

### Protected Access

* Protected `/admin` layout
* Configured administrator identity check
* Unauthorized state
* Return path after login where appropriate

### Admin Foundation

* Admin shell
* Sidebar
* Header
* Responsive navigation
* Current-administrator display
* Administrator navigation
* Basic dashboard landing page

## Working Increment

At the end of this phase:

* The configured administrator can log in and access the dashboard.
* Anonymous users cannot access admin pages.
* Any other authenticated identity is rejected.
* Logout removes protected access.

## Dependencies

* Phase 2
* Auth policies
* Configured administrator identity mechanism

## Risks

| Risk                                            | Impact                   | Mitigation                                |
| ----------------------------------------------- | ------------------------ | ----------------------------------------- |
| Authentication works but authorization does not | Protected data exposure  | Test direct URLs and mutations            |
| Replaced administrator retains session access   | Security issue           | Verify identity on protected requests     |
| Password recovery misconfigured                 | Admin lockout            | Test complete recovery flow               |
| Identity checks scattered                       | Inconsistent permissions | Centralize authorization                  |

## Completion Criteria

* [ ] Configured administrator login succeeds.
* [ ] Invalid login fails safely.
* [ ] Password recovery works.
* [ ] Unauthenticated admin access redirects.
* [ ] Any non-configured identity cannot access protected pages.
* [ ] Logout invalidates protected access.
* [ ] Admin routes are excluded from indexing.
* [ ] Administrator identity checks are centralized.
* [ ] The increment is deployable.

---

# 10. Phase 4 — Core Content Vertical Slice

## Objective

Implement the first complete public-to-admin content workflow and establish reusable patterns.

Destinations are the primary vertical slice because they exercise:

* Fixed categories
* Public listing
* Detail pages
* Publication status
* Coordinates
* Media ownership
* Search
* Filtering
* Preview
* Admin forms

## Phase 4A — Fixed Destination Categories and Destinations

### Deliverables

* Seeded fixed categories `Alam`, `Budaya`, and `Religi`
* Fixed category selector with no management route
* Destination admin list
* Destination create form
* Destination edit form
* Draft saving
* Publication validation
* Preview
* Publish, archive, and restore by the administrator
* Automatic hidden slug that freezes after first publication
* Public destination list
* Category filtering
* Destination detail
* Empty, loading, error, and not-found states
* Basic destination thumbnail support

### Completion Criteria

* [ ] The administrator can create and save a destination draft.
* [ ] The administrator can publish, archive, and restore to draft.
* [ ] Published destination appears publicly.
* [ ] Draft destination never appears publicly.
* [ ] Archived destination disappears publicly.
* [ ] Category filter works.
* [ ] Category management controls do not exist.
* [ ] Slug is hidden and immutable after first publication.
* [ ] Public detail route works.
* [ ] Validation messages use Indonesian.
* [ ] Direct unauthorized mutations fail.

---

## Phase 4B — Village Profile

### Deliverables

* Singleton profile editor
* Draft and published state
* Public village-profile page
* Homepage profile summary source
* Empty-section handling

### Completion Criteria

* [ ] Only one current profile is managed.
* [ ] Draft profile content remains private.
* [ ] Published profile appears publicly.
* [ ] Empty optional sections are hidden.

---

## Phase 4C — Traditional Houses

### Deliverables

* Admin list
* Create and edit forms
* Cultural significance fields
* Visitor-information fields
* Optional coordinate behavior
* Public list and detail
* Verification warning
* Draft placeholder blocking

### Completion Criteria

* [ ] Traditional-house content remains separate from destinations.
* [ ] Coordinates are optional.
* [ ] Unverified placeholder text cannot be published.
* [ ] Public detail works without map data.

---

## Phase 4D — Cultural Articles and Customary Institution Articles

### Deliverables

* Separate admin management areas
* Separate public indexes
* Separate detail pages
* Source-note handling
* Draft preview
* Verification warning
* Publication validation

### Completion Criteria

* [ ] General culture and customary institution content remain separate.
* [ ] Source notes are not public.
* [ ] Placeholder content cannot be published.
* [ ] Draft preview is protected.
* [ ] Public pages show only approved content.

---

## Phase 4E — Cultural Events

### Deliverables

* Event admin list and form
* Confirmed date handling
* Unconfirmed-date note
* Upcoming and past grouping
* Public event list and detail
* Optional location support

### Completion Criteria

* [ ] Invalid date ranges are rejected.
* [ ] Event without date or date note cannot publish.
* [ ] Recurring events are entered separately.
* [ ] Upcoming and past events are distinguishable.
* [ ] Draft events remain private.
* [ ] No placeholder event content can be published.

---

## Dependencies

* Phase 3
* Stable database schema
* Single-administrator authorization
* Content-validation patterns

## Risks

| Risk                                       | Impact                 | Mitigation                                    |
| ------------------------------------------ | ---------------------- | --------------------------------------------- |
| Attempt to generalize all content forms    | Hidden domain errors   | Keep explicit feature modules                 |
| Incomplete cultural content                | Empty production pages | Support drafts and hide empty public sections |
| Placeholder content published              | Credibility damage     | Publication validation and review             |
| Too many features developed simultaneously | Inconsistent patterns  | Complete destination vertical slice first     |

## Phase Completion Criteria

* [ ] Destination vertical slice is complete.
* [ ] Shared dashboard patterns are stable.
* [ ] Core public content pages work.
* [ ] Cultural features remain separated.
* [ ] All protected mutations enforce the configured administrator identity.
* [ ] All implemented features include tests.
* [ ] The increment is deployable.

---

# 11. Phase 5 — GIS Integration

## Objective

Connect stable destination content with geographic visualization and migrate validated initial location data.

GIS is implemented after destination content because the map depends on:

* Stable mappable-content identifiers
* Approved category relationships
* Valid publication rules
* Valid coordinate fields
* Public summary data
* Destination detail routes

Building the map before these dependencies would cause hardcoded data and later rework.

## Deliverables

### Public Map

* Leaflet integration
* OpenStreetMap tiles
* Karang Bajo initial focus
* Destination, traditional-house, homestay, and visitable-UMKM markers
* Category-based marker styles
* Marker popups
* Category filter
* Marker bounds behavior
* Google Maps external navigation
* Responsive behavior
* Textual mapped-item alternative
* Combined markers for identical coordinate pairs
* UMKM Tenun and Kampung Adat shared marker
* Empty and tile-failure states

### Admin Location Tools

* Coordinate fields
* Location picker
* Marker preview
* Manual coordinate entry
* Coordinate validation
* The same map-picker and manual-coordinate behavior on every coordinate form

### Initial Migration

* QGIS source review
* GeoJSON export
* Validation script
* Category mapping
* Duplicate reporting
* Draft import
* Manual review workflow
* Import report

## Working Increment

At the end of this phase:

* Published eligible records appear on the public map.
* The administrator can set coordinates through a map picker or manual entry.
* Initial validated locations exist as draft records.
* Invalid location data cannot break the public map.

## Dependencies

* Phase 4 destination model and routes
* QGIS source files
* Approved category mapping
* Import script environment
* Coordinate review owner

## Risks

| Risk                                | Impact                   | Mitigation                                  |
| ----------------------------------- | ------------------------ | ------------------------------------------- |
| Longitude and latitude reversed     | Incorrect locations      | Explicit conversion tests                   |
| GPS source inaccurate               | Visitor navigation error | QGIS and manual review                      |
| Map implemented with hardcoded data | Data inconsistency       | Use persisted published content records     |
| Map tiles fail                      | Broken page              | Keep textual list usable                    |
| Sensitive location published        | Cultural risk            | Administrator verification before publication |

## Completion Criteria

* [x] Leaflet loads only on required pages.
* [x] OpenStreetMap attribution is visible.
* [x] Valid published destinations, traditional houses, homestays, and visitable UMKM appear.
* [x] Invalid coordinates are excluded.
* [x] Category filter works.
* [x] Zero, one, and multiple marker states work.
* [x] Google Maps link opens correctly.
* [x] Mobile map is usable.
* [x] Location picker updates coordinates.
* [x] Manual latitude/longitude entry updates the marker.
* [x] Identical coordinate pairs render as one combined marker.
* [x] Shared-coordinate grouping prevents UMKM Tenun and Kampung Adat from rendering as separate overlapping markers when their approved coordinates match.
* [ ] GeoJSON conversion is tested.
* [ ] Imported records start as draft.
* [ ] Import report is produced.
* [ ] Initial locations receive manual review.
* [x] The implementation increment passes the release quality gate.

---

# 12. Phase 6 — Tourism and Supporting Features

## Objective

Complete visitor-facing tourism information after core content and GIS patterns are stable.

## Phase 6A — Tourism Packages

### Deliverables

* Package list and detail
* Budget, Standard, Premium types
* Numeric rupiah price and duration
* Optional `price_note`
* Included facilities
* Souvenir information
* Multiple destination selection
* Ordered package stops
* Package-specific notes
* Package preview
* Publish and archive
* Package marker map only if approved by the remaining scope decision

### Excluded

* Participant limits
* Structured activity per stop
* Structured stop duration
* Route optimization
* Booking
* Payment

### Completion Criteria

* [ ] Package type uses approved values.
* [ ] Package requires at least one destination.
* [ ] Duplicate destinations are rejected.
* [ ] Stops appear in saved order.
* [ ] Package cannot publish with unpublished destination.
* [ ] If included, the package map does not claim routing.
* [ ] `0` displays as free, `null` unavailable, and positive price as Indonesian rupiah.

---

## Phase 6B — Homestays

### Deliverables

* Admin management
* Public list and detail
* Optional consented owner or manager
* Optional consented phone
* Description
* Price
* Facilities
* Optional coordinates
* Gallery
* Contact actions

### Completion Criteria

* [ ] Published homestays are discoverable.
* [ ] Draft and archived records remain private.
* [ ] No booking or room inventory exists.
* [ ] Price is clearly informational.
* [ ] Price semantics and optional `price_note` are enforced.
* [ ] Map picker and manual coordinates both work.

---

## Phase 6C — UMKM

### Deliverables

* Admin management
* Public list and detail
* Category
* Optional consented per-entity contact
* Optional public map presence for visitable UMKM
* Gallery
* Category filtering when justified

### Completion Criteria

* [ ] Published UMKM are visible.
* [ ] At least one contact or location exists before publication.
* [ ] No cart, order, or payment exists.
* [ ] Owner information remains optional.
* [ ] UMKM Tenun shares the Kampung Adat marker.

---

## Phase 6D — Standalone Gallery and Contacts

### Deliverables

* Gallery list and management
* Public gallery
* Contact management
* Contact ordering
* Central WhatsApp CTA in site settings
* Public contact page

### Completion Criteria

* [ ] Gallery items are ordered.
* [ ] Every public image has alt text.
* [ ] Public contacts are approved.
* [ ] Private or technical contacts are excluded.
* [ ] Per-entity contacts require recorded publication consent.

---

## Dependencies

* Phase 4
* Phase 5
* Media management foundation
* Stable publication flow

## Risks

| Risk                                | Impact              | Mitigation                           |
| ----------------------------------- | ------------------- | ------------------------------------ |
| Package details are not finalized   | Feature delay       | Use approved reduced package model   |
| Homestay data becomes booking-like  | Scope expansion     | Keep information-only boundary       |
| UMKM content drifts into e-commerce | Scope expansion     | No inventory or transactions         |
| Duplicate media ownership           | Confusing galleries | Enforce content ownership boundaries |

## Phase Completion Criteria

* [ ] All MVP public content types exist.
* [ ] Package ordering works.
* [ ] Homestay and UMKM pages work.
* [ ] Gallery and contacts work.
* [ ] No out-of-scope transaction behavior exists.
* [ ] The increment is deployable.

---

# 13. Phase 7 — Administration Dashboard Completion

## Objective

Make all approved content manageable through a consistent interface for non-technical village officers.

Some dashboard capabilities are introduced earlier to support vertical slices. This phase completes and standardizes them.

## Deliverables

### Dashboard Overview

* Draft count
* Published destination count
* Upcoming events
* Recently updated content
* Content requiring attention where reliable

### Consistent List Pages

* Title
* Explanation
* Primary action
* Search
* Status filter
* Feature-specific filter
* Pagination where justified
* Row actions
* Empty state

### Consistent Forms

* Grouped fields
* Indonesian helper text
* Draft saving
* Preview
* Publish
* Archive
* Restore to draft
* Unsaved-change warning
* Validation summary

### Media Management

* Upload
* Preview
* Alt text
* Caption
* Ordering
* Primary image
* Replace
* Remove
* Missing-image warning
* Orphan candidate review

### Site Settings

* Approved settings only
* Type validation
* Admin-only access
* Read-only settings behavior
* Central `primary_whatsapp_number`

## Working Increment

At the end of this phase:

* Village officers can manage the complete MVP without source-code changes.
* The single administrator experience is consistent.
* Setting management is operational.
* Media workflows are safe.

## Dependencies

* Phases 3–6
* Approved settings list
* Storage and media policy

## Risks

| Risk                                           | Impact              | Mitigation                   |
| ---------------------------------------------- | ------------------- | ---------------------------- |
| Dashboard is technically correct but confusing | Failed handover     | Test with village officers   |
| Permanent deletion exposed                     | Data loss           | Exclude the operation entirely |
| Media upload succeeds but metadata fails       | Orphans             | Failure-safe upload sequence |
| Inconsistent forms                             | Training difficulty | Shared form patterns         |

## Completion Criteria

* [ ] All MVP content can be managed.
* [ ] Search and status filters work where required.
* [ ] Draft, preview, publish, archive, and restore are consistent.
* [ ] Media upload and replacement are safe.
* [ ] Orphan handling exists.
* [ ] No user, role, invitation, or approval-management screens exist.
* [ ] Dashboard works on mobile.
* [ ] Village officers can navigate without technical guidance.
* [ ] The increment is deployable.

---

# 14. Phase 8 — Quality Assurance

## Objective

Validate product behavior, security, accessibility, performance, and usability before production release.

Quality work occurs throughout earlier phases. This phase performs complete-system validation and fixes release-blocking defects.

## Deliverables

### Validation Review

* Required fields
* Publication eligibility
* Placeholder blocking
* Slug conflicts
* Coordinate validation
* Price and duration rules
* Event date rules
* Package ordering
* Image rules

### Accessibility Review

* Semantic structure
* Keyboard operation
* Focus states
* Form errors
* Dialogs
* Alt text
* Contrast
* Reduced motion
* Text alternative for maps

### Responsive Review

* Mobile public navigation
* Mobile map
* Mobile admin forms
* Admin lists
* Gallery
* Popups
* Modals
* Long local names and content

### Security Review

* Protected routes
* Single-administrator identity restriction
* RLS denied operations
* Storage policies
* Session expiration
* Denial of non-configured Auth identities
* Secret exposure
* Password recovery

### Performance Review

* Homepage data volume
* Image sizes
* Map payload
* Client-component use
* Public-page responsiveness
* Slow connection behavior

### Reliability Review

* Missing images
* Map tile failure
* Supabase query failure
* Upload failure
* Cache refresh
* Not-found pages

## Dependencies

* All MVP feature phases complete
* Test environment
* Representative production-like content
* Village test users

## Risks

| Risk                                 | Impact                   | Mitigation                                |
| ------------------------------------ | ------------------------ | ----------------------------------------- |
| QA postponed due schedule            | Production defects       | Reserve phase duration from project start |
| Only happy paths tested              | Security and data issues | Test denied and failure paths             |
| Placeholder data hides layout issues | Mobile defects           | Use realistic content lengths             |
| No actual village testing            | Poor usability           | Require acceptance session                |

## Completion Criteria

* [ ] Unit tests pass.
* [ ] Integration tests pass.
* [ ] Critical end-to-end tests pass.
* [ ] Denied authorization paths pass.
* [ ] No known critical or high-severity defect remains.
* [ ] Mobile flows are tested on actual devices.
* [ ] Accessibility blockers are resolved.
* [ ] Performance blockers are resolved.
* [ ] Missing-data states are tested.
* [ ] Village acceptance testing is completed.
* [ ] Release candidate is deployable.

---

# 15. Phase 9 — Production Deployment

## Objective

Deploy the accepted release using village-owned or institution-owned production services.

## Deliverables

### Production Services

* Production Supabase project
* Production Vercel project
* Production GitHub repository ownership
* Production domain
* HTTPS
* Production Storage buckets
* Production environment variables
* Production RLS
* Production Storage policies

### Release Activities

* Apply production migrations
* Seed fixed destination categories
* Create the single approved administrator account
* Import reviewed initial data as draft
* Upload approved media
* Publish approved content
* Verify public sitemap and indexing rules
* Test production login and logout
* Test password recovery
* Test map and contact actions

### Operational Readiness

* Database backup export
* Media backup
* QGIS backup
* Credential recovery record
* Release tag
* Rollback procedure
* Production smoke-test checklist

## Dependencies

* Phase 8 complete
* Account ownership approved
* Domain available
* Production content approved
* Backup owner assigned

## Risks

| Risk                                     | Impact              | Mitigation                           |
| ---------------------------------------- | ------------------- | ------------------------------------ |
| Production owned by personal account     | Future lockout      | Transfer before launch               |
| Environment variables misconfigured      | Application failure | Production configuration checklist   |
| RLS differs from development             | Security issue      | Apply version-controlled policies    |
| Domain or DNS delay                      | Launch delay        | Configure before final deadline      |
| Production data published without review | Credibility risk    | Import as draft and approve manually |

## Completion Criteria

* [ ] Production build succeeds.
* [ ] Production domain resolves.
* [ ] HTTPS is active.
* [ ] Supabase production migrations succeed.
* [ ] RLS is enabled in production.
* [ ] Storage policies are active.
* [ ] Public content is visible.
* [ ] Draft content is not visible.
* [ ] Admin login works.
* [ ] Password recovery works.
* [ ] Map markers match approved coordinates.
* [ ] Contacts work.
* [ ] Sitemap contains published content only.
* [ ] Backups are exported.
* [ ] Production smoke tests pass.
* [ ] Release is tagged.

---

# 16. Phase 10 — Village Handover

## Objective

Transfer product control, operational knowledge, and maintenance responsibility to the village.

Handover is part of the software project because a deployed system without accountable ownership, credentials, training, backups, and operational procedures is not a sustainable production system.

## Deliverables

### Administrator Guide

Must explain:

* Login
* Password recovery
* Dashboard navigation
* Creating content
* Editing content
* Uploading images
* Selecting coordinates
* Saving drafts
* Previewing
* Publishing
* Archiving
* Restoring where supported
* Managing users
* Managing contacts
* Updating settings

### Backup Guide

Must explain:

* What is backed up
* Who performs the backup
* Backup frequency
* Backup location
* Database export
* Media export
* QGIS backup
* Restore ownership
* Recovery contact

### Image Management Guide

Must explain:

* Accepted formats
* Image-size limits
* WebP preference
* Alt text
* Captions
* Image ordering
* Primary image
* Original archive retention
* Appropriate public-use permission

### Training

At minimum:

* One administrator training session
* One supervised content update
* One supervised image upload
* One supervised publish and archive flow
* One password-recovery demonstration
* One backup demonstration

### Ownership Transfer

Transfer or document control of:

* GitHub
* Vercel
* Supabase
* Domain
* Official administrator email
* Backup storage
* QGIS source files
* Original media archive

### Documentation Package

* Project documents
* README
* Administrator Guide
* Backup Guide
* Image Management Guide
* Deployment record
* Access-owner list
* Known limitations
* Future-scope list

## Dependencies

* Stable production deployment
* Approved village owners
* Trained administrators
* Completed documentation
* Backup process tested

## Risks

| Risk                              | Impact                       | Mitigation                                 |
| --------------------------------- | ---------------------------- | ------------------------------------------ |
| Training participant unavailable  | Handover incomplete          | Schedule early and appoint backup person   |
| Credentials remain with students  | Loss of control              | Complete transfer before sign-off          |
| Guide is too technical            | Admin dependence             | Use task-based Indonesian instructions     |
| Backup is documented but untested | False security               | Perform one actual backup and restore test |
| No long-term content owner        | Information becomes outdated | Assign ownership per content area          |

## Completion Criteria

* [ ] At least one Admin completes all critical tasks.
* [ ] At least one backup administrator is identified.
* [ ] Credentials are controlled by approved owners.
* [ ] Administrator Guide is delivered.
* [ ] Backup Guide is delivered.
* [ ] Image Management Guide is delivered.
* [ ] Backup procedure is demonstrated.
* [ ] QGIS files are transferred.
* [ ] Original media archive location is documented.
* [ ] Known limitations are documented.
* [ ] Handover acceptance is signed or formally recorded.

---

# 17. Task Dependency Graph

```text
Documentation Approval
        |
        v
Repository and Project Setup
        |
        v
Database Migrations
        |
        v
RLS and Storage Policies
        |
        v
Authentication and Administrator Identity Check
        |
        v
Protected Admin Foundation
        |
        v
Fixed Destination Category Seed
        |
        v
Destination CRUD and Publication
        |
        +----------------------+
        |                      |
        v                      v
Public Destination Pages     Media Workflow
        |                      |
        +----------+-----------+
                   |
                   v
             Leaflet Map
                   |
                   v
       QGIS / GeoJSON Import
                   |
                   v
       Remaining Content Features
                   |
                   v
     Packages, Homestays, UMKM
                   |
                   v
      Dashboard Standardization
                   |
                   v
    Full-System Quality Assurance
                   |
                   v
        Production Deployment
                   |
                   v
          Village Handover
```

---

# 18. Dependency Matrix

| Task                  | Requires                                             |
| --------------------- | ---------------------------------------------------- |
| Database migrations   | Approved schema                                      |
| RLS                   | Tables, sole administrator identity, publication rules |
| Authentication        | Supabase project and administrator account           |
| Protected dashboard   | Authentication and administrator identity check      |
| Destination CRUD      | Database, RLS, dashboard foundation                  |
| Public destinations   | Published-query rules and destination data           |
| Media upload          | Storage policies and parent record                   |
| Leaflet map           | Stable destination data and coordinates              |
| GeoJSON import        | Schema, category mapping, coordinate validation      |
| Tourism packages      | Destinations and package relationship                |
| Package map           | Packages and destination coordinates                 |
| Cultural publication  | Content validation and publishing authority          |
| Site settings         | Approved settings list and Admin authorization       |
| Production deployment | QA acceptance and account ownership                  |
| Handover              | Stable deployment, documentation, and training users |

---

# 19. Milestones

## M0 — Documentation Approved

### Success Criteria

* Core project documents are consistent.
* Access and scope decisions are recorded.
* Development may begin without assumptions.

---

## M1 — Foundation Ready

### Success Criteria

* Repository is initialized.
* Application builds.
* Preview deployment works.
* Environment setup is documented.
* No secrets are committed.

---

## M2 — Secure Data Foundation Ready

### Success Criteria

* Migrations apply cleanly.
* RLS is active.
* Storage policies are active.
* Public and protected access paths are tested.
* Fixed destination categories and administrator identity configuration exist.

---

## M3 — Authentication Ready

### Success Criteria

* The configured administrator login works.
* Protected routes reject anonymous users.
* Other authenticated identities are blocked.
* Logout and recovery work.
* Administrator-only layout exists.

---

## M4 — Core Public Content Ready

### Success Criteria

* Village profile works.
* Destination list and detail work.
* Core cultural sections work.
* Draft, published, and archived behavior works.
* Destination administration works.

---

## M5 — GIS Ready

### Success Criteria

* Published eligible destinations, traditional houses, homestays, and visitable UMKM appear on the map.
* Marker filtering works.
* Mobile map works.
* Coordinate picker works.
* Initial GeoJSON import is validated.
* Imported records remain drafts until review.
* UMKM Tenun and Kampung Adat share one marker.

---

## M6 — Tourism Information Complete

### Success Criteria

* Packages work with ordered destinations.
* Homestays work.
* UMKM works.
* Gallery works.
* Contacts work.
* No transaction features were introduced.

---

## M7 — Dashboard Ready

### Success Criteria

* All MVP content can be managed.
* Media workflows are safe.
* Settings management works.
* Dashboard is usable on mobile.
* Village officers can complete core tasks.

---

## M8 — Production Ready

### Success Criteria

* Automated and manual tests pass.
* Security and accessibility review pass.
* Production accounts are assigned.
* Backups are prepared.
* No release-blocking defect remains.

---

## M9 — Production Live

### Success Criteria

* Production domain and HTTPS work.
* Public content is live.
* Admin access works.
* Drafts remain private.
* Smoke tests pass.
* Release is tagged.

---

## M10 — Village Handover Complete

### Success Criteria

* Village controls production accounts.
* Guides are delivered.
* Training is completed.
* Backup is demonstrated.
* Handover is formally accepted.

---

# 20. Testing Roadmap

Testing must occur during every phase.

## 20.1 Phase 1

Test:

* Production build
* Type checking
* Lint
* Base route rendering
* Environment validation

## 20.2 Phase 2

Test:

* Migrations
* Constraints
* RLS allowed paths
* RLS denied paths
* Storage policies
* Administrator identity enforcement

## 20.3 Phase 3

Test:

* Login
* Logout
* Recovery
* Session expiration
* Non-configured authenticated identities
* Direct protected-route access
* Administrator-only navigation

## 20.4 Phase 4

Test:

* Validation schemas
* Public-only queries
* CRUD mutations
* Draft and publication transitions
* Not-found behavior
* Cultural placeholder blocking
* Event-date behavior

## 20.5 Phase 5

Test:

* Coordinate range
* GeoJSON conversion
* Zero markers
* One marker
* Multiple markers
* Marker filters
* Popup links
* Mobile map
* Tile failure
* Denied geolocation

## 20.6 Phase 6

Test:

* Package destination uniqueness
* Package ordering
* Package publication dependencies
* Homestay information-only boundary
* UMKM contact requirement
* Gallery ordering
* Contact links

## 20.7 Phase 7

Test:

* Search
* Filters
* Pagination where used
* Image upload
* Replacement
* Orphan handling
* Archive and restore consistency
* Settings permissions
* Mobile admin tasks

## 20.8 Phase 8

Run:

* Full unit test suite
* Full integration suite
* Critical end-to-end suite
* Accessibility review
* Responsive review
* Security review
* Performance review
* Village acceptance testing

## 20.9 Phase 9

Run production smoke tests:

* Homepage
* Public navigation
* Destination detail
* Map
* Contact action
* Login
* Draft privacy
* Publish and archive
* Image delivery
* Password recovery
* Sitemap

## 20.10 Phase 10

Conduct operational testing:

* Administrator creates draft
* Administrator uploads image
* Administrator selects coordinates
* Administrator publishes
* Administrator archives
* Administrator recovers password
* Backup owner exports backup

---

# 21. Data Migration Roadmap

```text
QGIS Source Data
       |
       v
GeoJSON Export
       |
       v
Schema and Coordinate Validation
       |
       v
Category and Slug Mapping
       |
       v
Duplicate Candidate Report
       |
       v
Supabase Draft Insert
       |
       v
Dashboard Manual Review
       |
       v
Village Approval
       |
       v
Publish
```

## 21.1 Preparation

* Preserve original QGIS project.
* Preserve source coordinate files.
* Review destination names.
* Confirm category list.
* Confirm coordinate reference.
* Export Point geometry only.

## 21.2 Validation

Validate:

* GeoJSON format
* Geometry type
* Longitude and latitude order
* Coordinate range
* Missing names
* Category mapping
* Duplicate candidates
* Existing slug conflicts

## 21.3 Import

Imported records must:

* Start as draft
* Record import source
* Not overwrite reviewed records
* Receive generated or reviewed slugs
* Use approved categories
* Produce an import report

## 21.4 Review

Village or content owners review:

* Name
* Category
* Coordinates
* Summary
* Description
* Images
* Visitor information
* Cultural appropriateness

## 21.5 Publication

Imported records are published only after:

* Required content is complete
* Coordinates are confirmed
* Media is verified as suitable for public use
* The administrator performs the direct publish action

## 21.6 Why Import Starts as Draft

Coordinate validity does not prove:

* Description accuracy
* Category accuracy
* Visitor information completeness
* Image ownership
* Cultural approval
* Publication readiness

Draft import prevents unreviewed field data from becoming official public information.

---

# 22. Documentation Roadmap

## 22.1 `project.md`

Update only when:

* Permanent project purpose changes
* Technology direction changes permanently
* System boundary changes
* Long-term ownership principle changes

Review points:

* Phase 0
* Before production handover

---

## 22.2 `prd.md`

Update when:

* Product behavior changes
* MVP scope changes
* Administrator access boundary changes
* Acceptance criteria change
* A future feature enters Version 1

Review points:

* Phase 0
* Before each new feature phase
* Before QA

---

## 22.3 `architecture.md`

Update when:

* A production service is added or replaced
* Deployment structure changes
* Authentication boundary changes
* Storage responsibility changes
* A separate backend is proposed

Review points:

* Phase 1
* Phase 2
* Before production deployment

---

## 22.4 `schema.md`

Update before:

* Adding a table
* Adding a field
* Changing nullability
* Changing a relationship
* Changing a constraint
* Changing archive or restore behavior

Review points:

* Phase 2
* Before every schema migration

---

## 22.5 `design.md`

Update when:

* Routes change
* Folder ownership changes
* Forms change materially
* Mutation patterns change
* Map behavior changes
* Admin workflows change

Review points:

* Phase 1
* Before each feature group
* Before dashboard completion

---

## 22.6 `rules.md`

Update when:

* A new implementation constraint is approved
* Dependency policy changes
* Security rule changes
* Testing rules change
* AI-agent behavior changes

Review points:

* Phase 1
* Before QA
* Before handover

---

## 22.7 `roadmap.md`

Update when:

* Phase order changes
* Scope is deferred
* A milestone is completed
* Delivery risk changes materially
* Handover date changes

Do not turn `roadmap.md` into a daily task list.

---

## 22.8 `README.md`

Create in Phase 1.

Update throughout development with:

* Local setup
* Required environment variables
* Development commands
* Testing commands
* Migration commands
* Deployment summary
* Documentation index

Finalize before Phase 9.

---

## 22.9 Administrator Guide

Draft during Phase 7.

Validate during Phase 8.

Finalize during Phase 10.

It must be task-oriented, not architecture-oriented.

---

# 23. Risk Management

| Risk                                                   | Likelihood | Impact   | Mitigation                                                |
| ------------------------------------------------------ | ---------- | -------- | --------------------------------------------------------- |
| Cultural information remains incomplete                | High       | High     | Draft workflow, content owner, hide empty sections        |
| Cultural information is published without verification | Medium     | Critical | Restricted publishing, verification checklist             |
| GPS coordinates are inaccurate                         | Medium     | High     | QGIS review, map picker, manual confirmation              |
| Latitude and longitude are reversed                    | Medium     | High     | Automated conversion tests                                |
| Image quality is inconsistent                          | High       | Medium   | Compression, size limits, image guide                     |
| Storage quota is exceeded                              | Medium     | High     | WebP, limits, usage review, external originals            |
| Production accounts remain personal                    | Medium     | Critical | Official ownership before launch                          |
| Administrator training is insufficient                 | Medium     | High     | Acceptance testing and task-based training                |
| Development schedule slips                             | High       | High     | Feature gating, no scope expansion, vertical slices       |
| Team rewrites completed modules                        | Medium     | Medium   | Stable patterns and review rules                          |
| RLS is misconfigured                                   | Medium     | Critical | Test allowed and denied paths                             |
| Administrator identity mechanism remains unresolved    | Medium     | Critical | Finalize before Phase 2 RLS implementation                |
| Package requirements expand late                       | High       | Medium   | Freeze supported package model                            |
| Domain or DNS setup is delayed                         | Medium     | Medium   | Begin ownership process early                             |
| Backups are not performed                              | Medium     | Critical | Assign owner and demonstrate export                       |
| Village contact information becomes outdated           | Medium     | Medium   | Assign contact-content owner                              |
| KKN ends before handover                               | Medium     | Critical | Start guides and account transfer before final deployment |
| Mobile admin interface is ignored                      | Medium     | High     | Test every form on mobile during implementation           |
| Placeholder content reaches production                 | Medium     | High     | Publication validator and QA scan                         |
| Orphaned images consume Storage                        | Medium     | Medium   | Reference checks and cleanup process                      |
| Map tiles become unavailable                           | Low        | Medium   | Textual alternative and graceful failure                  |

---

# 24. Risk Review Schedule

Risk review occurs:

* At Phase 0 completion
* At every milestone
* Before initial data import
* Before QA
* Before production deployment
* Before handover

A risk must be escalated when:

* It can block a milestone
* It can expose private or draft data
* It can publish inaccurate cultural information
* It can cause permanent data loss
* It can prevent village ownership
* It requires scope reduction

---

# 25. Bilingual and Future Roadmap

The bilingual public-shell foundation below is approved and merged. Its Next.js 16 pathname-derived Proxy locale mechanism and caching behavior have been validated. Database-backed English content is a separate Phase 2; only the Phase 2A Village Profile pilot is currently approved.

Bilingual phases after the approved Village Profile pilot and other future features may begin only after:

* Version 1 is stable
* Village ownership is active
* Actual user needs are documented
* Operational responsibility is assigned
* Product and architecture documents are updated

## Bilingual Rollout — Phase 1 Public-Shell Foundation — Complete

Approved scope:

* Preserve all unprefixed Indonesian public routes.
* Add `/en` as the only English route.
* Add typed `id` and `en` dictionaries and a semantic route manifest.
* Localize the public header, mobile navigation, footer, homepage static UI, contact CTA UI, and external-tourism-link UI.
* Render the correct server document language for `/` and `/en`.
* Show a language switcher only for the real `/` and `/en` equivalent pair.
* Emit localized basic metadata, including `en_US` Open Graph locale, without production-origin canonical or alternate links.
* Exclude database-managed Indonesian descriptive content from `/en` and provide no automatic fallback or translation.
* Reuse only approved language-neutral WhatsApp, Google Maps, and Tripadvisor values.

Explicit exclusions:

* Database migration or translation schema
* English domain list and detail routes
* Locale-prefixed admin or authentication
* Canonical, `hreflang`, alternate, or sitemap changes
* General Cultural Articles, Bayan Customary Institution Articles, or standalone gallery

## Phase 2A — Village Profile Translation Pilot — Design Approved

Objective:

* Prove database-backed English publication for the singleton Village Profile without changing Indonesian routes, content, administration language, or the one-administrator access model.

Approved design deliverables:

* One explicit `public.village_profile_translations` table; no polymorphic JSON translation table and no `_en` columns.
* A column-limited published-English Village Profile view.
* Translation lifecycle validation for `draft`, `published`, `archived`, and restore to `draft`.
* RLS, explicit grants, indexes, and administrator-only mutation through `public.is_admin()`.
* Server-recorded `source_updated_at_at_publish` comparison so stale translations remain hidden.
* Indonesian-language administrator editing and publication controls for the English translation.
* Future `/en/village-profile` route and server-resolved `/profil-desa` language-switcher equivalence that is exposed only when the English translation is publicly eligible.
* English loader, metadata, loading, error, empty, not-found, no-fallback, and source-staleness behavior.

Publication requirements:

* The source Village Profile is published.
* The translation locale is exactly `en` and its status is `published`.
* The reviewed source timestamp equals the source record's current `updated_at`.
* English `name` and `description` are present.
* Every populated source `summary`, `history`, `vision`, `mission`, and `address` has an approved English translation.
* Cultural and historical content has been verified with an authorized village or customary source without inventing a reviewer or approval workflow.

Implementation dependencies:

* A new reviewed migration that implements only the approved pilot objects.
* Updated database types or reviewed feature-local row types following the repository's approved type workflow.
* Local migration, RLS, lifecycle, stale-source, and public-view tests.
* Application tests for loader isolation, route equivalence, metadata, states, and Indonesian regression.
* Desktop and 390 px browser smoke validation for `/`, `/en`, `/profil-desa`, `/en/village-profile`, and `/admin`.

Exit criteria:

* Missing, draft, archived, stale, or source-unpublished translations never appear publicly.
* No Indonesian descriptive field is used as English fallback.
* Editing, archiving, restoring, or republishing the source cannot re-expose a stale translation.
* Anonymous and non-administrator identities cannot mutate or read translation base-table data.
* The configured administrator can create, validate, publish, archive, and restore the translation through the Indonesian admin UI.
* The approved English route and language switcher work without changing existing Indonesian or admin behavior.
* Migration application to any hosted project remains a separately authorized operation.

Explicit Phase 2A exclusions:

* Translation tables or English routes for any other domain
* English slugs
* Media alt-text or caption translations
* Contact translations
* Machine translation or Indonesian descriptive fallback
* Browser-language redirects
* Canonical, alternate-language, `hreflang`, sitemap, or production-origin work

## Later Bilingual Phases

Additional English domains require their own content, schema, route, privacy, media, and publication approval after the Village Profile pilot. Canonical URLs, future `hreflang="en"`, alternates, and locale-aware sitemap work wait for an approved production origin.

---

## Future Phase A — Visitor Analytics

Possible scope:

* Page traffic
* Popular destination pages
* Map engagement
* Contact-action counts

Prerequisites:

* Privacy policy
* Tool approval
* Data ownership
* Reporting owner

---

## Future Phase B — QR Code Integration

Possible scope:

* QR codes for destination signage
* QR codes for traditional houses
* QR codes for packages

Prerequisites:

* Stable public URLs
* Printed-signage ownership
* Redirect strategy

---

## Future Phase C — Booking

Possible scope:

* Package request
* Homestay request
* Availability
* Confirmation
* Cancellation

Prerequisites:

* Operational owner
* Response-time commitment
* Booking policy
* Personal-data policy
* Revised schema and architecture

---

## Future Phase D — Payments

Possible scope:

* Payment provider
* Transaction status
* Refund handling
* Reconciliation

Prerequisites:

* Legal and financial responsibility
* Booking system
* Accounting process
* Security review

---

## Future Phase E — Recommendation and Trip Planning

Possible scope:

* Suggested visits
* User-defined itinerary
* Package comparison
* Time-based planning

Prerequisites:

* Sufficient content
* User research
* Clear data model
* No misleading route claims

---

## Future Phase F — Advanced GIS

Possible scope:

* Route analysis
* Spatial proximity
* Regional coverage
* Heatmaps

Prerequisites:

* Validated operational need
* Larger geographic dataset
* Specialist ownership
* Architecture review
* Possible PostGIS review

---

## Future Phase G — Native Mobile Application

Prerequisites:

* Demonstrated limitations of the responsive website
* Mobile-specific user requirements
* Release and maintenance owner
* Separate product approval

---

# 26. Success Definition

The project is complete only when all of the following are true.

## Administrator Can Independently

* [ ] Log in.
* [ ] Recover access.
* [ ] Add a destination.
* [ ] Edit content.
* [ ] Select coordinates.
* [ ] Upload images.
* [ ] Add alt text.
* [ ] Save a draft.
* [ ] Preview content.
* [ ] Publish content.
* [ ] Archive outdated content.
* [ ] Restore archived content to draft.
* [ ] Update public contacts.
* [ ] Perform the documented backup process.

## Visitors Can

* [ ] Explore destinations.
* [ ] Filter destinations.
* [ ] Open destination details.
* [ ] Read village information.
* [ ] Read cultural information.
* [ ] Read customary institution information.
* [ ] View traditional houses.
* [ ] Browse tourism packages.
* [ ] View ordered package destinations.
* [ ] View cultural events.
* [ ] Browse homestays.
* [ ] Browse UMKM.
* [ ] Use the interactive map.
* [ ] Open Google Maps navigation.
* [ ] View the gallery.
* [ ] Contact the village through approved channels.

## Product Quality

* [ ] Draft and archived content remain private.
* [ ] RLS is active.
* [ ] Invalid coordinates do not break maps.
* [ ] Images are optimized.
* [ ] Public images have alt text.
* [ ] Placeholder cultural content is not public.
* [ ] Mobile behavior is accepted.
* [ ] Critical tests pass.
* [ ] No release-blocking defect remains.

## Operations and Ownership

* [ ] Production deployment is stable.
* [ ] Domain and HTTPS work.
* [ ] Production accounts have approved owners.
* [ ] Database backup exists.
* [ ] Media backup exists.
* [ ] QGIS backup exists.
* [ ] Original media archive is documented.
* [ ] Administrator training is complete.
* [ ] Handover documentation is complete.
* [ ] Handover acceptance is recorded.

---

# 27. Overall Implementation Checklist

## Documentation and Decisions

* [x] `project.md` approved for the Version 1 baseline
* [x] `prd.md` approved for the Version 1 baseline
* [x] `architecture.md` approved for the Version 1 baseline
* [x] `schema.md` approved for the Version 1 baseline
* [x] `design.md` approved for the Version 1 baseline
* [x] `rules.md` approved for the Version 1 baseline
* [x] `roadmap.md` approved for the Version 1 baseline
* [x] Single-administrator access approved
* [x] Indonesian-default baseline and bilingual public-shell Phase 1 boundary approved
* [x] Phase 2A Village Profile translation architecture, lifecycle, stale-source behavior, and route approved
* [x] Package boundary approved
* [x] Fixed categories, slugs, prices, contacts, maps, and lifecycle approved
* [ ] Content owners assigned
* [ ] Production account owners assigned

## Phase 1 — Foundation

* [ ] Repository created
* [ ] Branch policy defined
* [ ] Next.js initialized
* [ ] App Router enabled
* [ ] Root `app/` structure retained
* [ ] TypeScript strict mode enabled
* [ ] ESLint configured
* [ ] Prettier configured
* [ ] npm and existing `package-lock.json` retained
* [ ] Tailwind CSS configured
* [ ] Static browser assets use `public/`
* [ ] Environment template created
* [ ] Route groups created
* [ ] Base error and loading states created
* [ ] Preview deployment works
* [ ] README created

## Phase 2 — Database Foundation

* [ ] Development Supabase project created
* [ ] Initial migrations written
* [ ] Migrations apply from zero
* [ ] UUID keys defined
* [ ] Relationships defined
* [ ] Constraints defined
* [ ] Indexes defined
* [ ] Publication status defined
* [ ] Audit fields defined
* [ ] Archive and restore-to-draft defined
* [ ] Permanent deletion absent
* [ ] RLS enabled
* [ ] Public policies tested
* [ ] Admin policies tested
* [ ] Non-configured Auth identity denial tested
* [ ] Storage buckets created
* [ ] Storage policies tested
* [ ] Fixed destination categories seeded
* [ ] Single administrator identity mechanism configured
* [ ] Generated types created

## Phase 3 — Authentication

* [ ] Login works
* [ ] Invalid login handled
* [ ] Logout works
* [ ] Password recovery works
* [ ] Password reset works
* [ ] Session refresh works
* [ ] Protected admin layout works
* [ ] Any non-configured identity blocked
* [ ] Administrator-only navigation works
* [ ] Auth pages excluded from indexing

## Phase 4 — Core Content

* [ ] Fixed destination categories seeded and selectable
* [ ] No category management UI exists
* [ ] Destination draft created
* [ ] Destination edited
* [ ] Destination preview works
* [ ] Destination published
* [ ] Destination archived
* [ ] Destination restored to draft
* [ ] Public destination list works
* [ ] Category filter works
* [ ] Destination detail works
* [x] Village profile works
* [ ] Traditional houses work
* [ ] Cultural articles work
* [ ] Customary institution articles work
* [ ] Cultural events work
* [ ] Source notes remain private
* [ ] Placeholder publication blocking works

## Phase 5 — GIS

* [x] Leaflet integrated
* [x] OpenStreetMap tiles displayed
* [x] Attribution displayed
* [x] Destination markers displayed
* [x] Popups work
* [x] Category filters work
* [x] Bounds work
* [x] Single-marker behavior works
* [x] Empty map state works
* [x] Invalid coordinates excluded
* [x] Mobile map works
* [x] Google Maps links work
* [x] Location picker works
* [ ] GeoJSON validator works
* [x] Coordinate order tested
* [ ] Duplicate report works
* [ ] Initial import remains draft
* [ ] Imported records manually reviewed

## Phase 6 — Tourism Features

* [ ] Package list works
* [ ] Package detail works
* [ ] Budget type works
* [ ] Standard type works
* [ ] Premium type works
* [ ] Package destinations selectable
* [ ] Duplicate stops rejected
* [ ] Package stops reorderable
* [ ] Package order displayed publicly
* [ ] Package cannot publish with invalid destinations
* [ ] No route optimization claim
* [ ] Homestay list and detail work
* [ ] UMKM list and detail work
* [ ] Standalone gallery works
* [x] Public contact route and safe unconfigured fallback work
* [ ] No booking or payment exists

## Phase 7 — Dashboard Completion

* [ ] Dashboard overview works
* [ ] Draft summary works
* [ ] Upcoming event summary works
* [ ] Recent content works
* [ ] Search works
* [ ] Status filters work
* [ ] Empty states are consistent
* [ ] Form sections are consistent
* [ ] Unsaved-change warning works
* [ ] Archive confirmations work
* [ ] Media compression works
* [ ] Image preview works
* [ ] Image ordering works
* [ ] Primary image works
* [ ] Image replacement is safe
* [ ] Orphan handling works
* [x] Site Settings works
* [x] Central WhatsApp setting drives the primary visitor CTA
* [ ] No user, role, invitation, approval, or permanent-delete controls exist
* [ ] Mobile dashboard works

## Phase 8 — Quality Assurance

* [x] Unit tests pass
* [x] Integration tests pass
* [ ] End-to-end tests pass
* [x] RLS denial tests pass
* [x] Storage policy tests pass
* [ ] Accessibility review passes
* [ ] Keyboard flows pass
* [ ] Mobile public pages pass
* [ ] Mobile admin flows pass
* [x] Performance review completed
* [ ] Image-size review completed
* [x] Missing-image behavior tested
* [x] Map failure behavior tested
* [ ] Session expiration tested
* [ ] Village acceptance test completed
* [ ] Critical issues resolved

## Phase 9 — Deployment

* [ ] Production GitHub owner approved
* [ ] Production Supabase created
* [ ] Production Vercel created
* [ ] Production domain configured
* [ ] HTTPS active
* [ ] Production variables configured
* [ ] Production migrations applied
* [ ] Production RLS reviewed
* [ ] Production Storage policies reviewed
* [ ] Single administrator account created and configured
* [ ] Approved data imported
* [ ] Approved content published
* [ ] Public smoke tests pass
* [ ] Admin smoke tests pass
* [ ] Sitemap verified
* [ ] Backup exported
* [ ] Release tagged

## Phase 10 — Handover

* [ ] Administrator Guide complete
* [ ] Backup Guide complete
* [ ] Image Management Guide complete
* [ ] Deployment record complete
* [ ] Account-owner list complete
* [ ] Known limitations documented
* [ ] Admin training completed
* [ ] Publish flow demonstrated
* [ ] Archive flow demonstrated
* [ ] Password recovery demonstrated
* [ ] Backup demonstrated
* [ ] QGIS files transferred
* [ ] Original-media archive transferred
* [ ] Credentials transferred
* [ ] Backup owner confirmed
* [ ] Handover acceptance recorded

## Future Scope Exclusion

* [ ] No booking in Version 1
* [ ] No payment in Version 1
* [ ] No ratings or reviews
* [ ] No favorites
* [ ] No visitor registration
* [ ] No AI chatbot
* [ ] No recommendation engine
* [ ] No trip planner
* [ ] No offline map
* [ ] No native mobile app
* [ ] No advanced GIS
* [ ] No package participant limits
* [ ] No structured package-stop timing
* [ ] No automatic event recurrence
