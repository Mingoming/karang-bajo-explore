# Application Design

## Karang Bajo Tourism Information System

**Status:** Phase 1 — Project Foundation
**Application:** Next.js App Router
**Primary language:** Indonesian
**Deployment unit:** One Next.js project on Vercel

---

# 0. Document Authority and Approved Version 1 Decisions

## 0.1 Document Purpose

This document translates the approved project context, system architecture, and logical data model into an implementable Next.js application design.

It defines:

* Application boundaries
* Route structure
* Rendering strategy
* Feature-module ownership
* Data-access patterns
* Authentication and authorization behavior
* Form behavior
* Map integration
* Media workflows
* Loading, validation, and error states
* Testing priorities
* Initial data migration
* Implementation sequence

This document does not redefine:

* Product requirements
* Database entities
* Database columns
* Row Level Security policy syntax
* SQL migrations
* Visual branding
* Cultural or historical facts

Source documents:

* `project.md`
* `architecture.md`
* `schema.md`

When this document conflicts with those documents, the conflict must be resolved before implementation.

---

## 0.2 Approved Version 1 Design Baseline

### Access and Administration

Version 1 has one anonymous visitor state and one authenticated administrator state. The administrator can create, edit, publish, archive, restore, upload media, and manage settings. There are no editor roles, additional user accounts, user or role management screens, invitations, or approval queues. Supabase Auth remains required for the administrator account.

New content starts as draft. Restore returns archived content to draft. Permanent deletion is not exposed.

### Language and Content Identity

Version 1 is Indonesian-only. Slugs are generated automatically, hidden from normal forms, and immutable after first publication.

Destination category selection uses the fixed values `Alam`, `Budaya`, and `Religi`. There is no destination-category management route or dashboard navigation item.

### Pricing and Contact

Price inputs are numeric. `0` is displayed as free, `null` as unavailable, and positive values as Indonesian rupiah. `price_note` is optional.

One central WhatsApp number is the primary CTA for all visitor inquiries. Optional destination, event, homestay, and UMKM contacts are secondary and appear only when publication consent is recorded.

### Map Sources and Location Forms

Destinations, traditional houses, homestays, and visitable UMKM may appear on the public map. Identical approved coordinate pairs render as one combined marker. UMKM Tenun shares the Kampung Adat coordinates and marker; it must not produce an overlapping duplicate.

Every administrator form that manages coordinates provides both a map picker and manual latitude/longitude fields.

### Repository Conventions

The existing root `app/` structure is retained. The project uses npm and the existing `package-lock.json`. Tailwind CSS is approved. Static browser assets are stored under `public/`.

### Version 1 Boundary — Package Participant Limits

The requested package form includes participant limits, but `schema.md` does not define minimum or maximum participant columns.

**Application decision:**

* Version 1 must not display editable participant-limit fields.
* Developers must not place participant limits inside `description`, `included_facilities`, or another unrelated field.
* Adding participant limits requires an approved `schema.md` change and database migration.

### Version 1 Boundary — Package Stop Estimated Time and Activity

The requested design includes:

* Estimated time per stop
* Activity at each stop

The current `package_destinations` model supports:

* `display_order`
* `notes`

It does not contain structured estimated-time or activity fields.

**Application decision:**

* Version 1 supports selecting and ordering destinations.
* `notes` may contain a short package-specific explanation but must not be treated as a structured activity or estimated-time model.
* The public interface must not present calculated stop durations.
* Structured stop activity and timing require an approved schema revision.

---

### Customary Institution Article Routes

`schema.md` defines:

```text
customary_institution_articles
```

The requested public routes only provide:

```text
/budaya-adat/pranata-adat-bayan
```

without a detail route.

**Application decision:**

Use:

```text
/budaya-adat/pranata-adat-bayan
/budaya-adat/pranata-adat-bayan/[slug]
```

The first route is the article index or overview. The second route displays an individual verified article.

The dashboard also requires:

```text
/admin/pranata-adat
/admin/pranata-adat/baru
/admin/pranata-adat/[id]/edit
```

Without these routes, the application would have no explicit management interface for a schema entity required by the project.

---

### Event Recurrence

The requested application design mentions recurring events, but `schema.md` models individual event records and contains no recurrence rule.

**Application decision:**

Version 1 stores each event occurrence as a separate record.

No recurring event scheduler or recurrence editor is included.

---

# 1. Application Overview

The system consists of two interfaces inside one Next.js application.

```text
Next.js Application
├── Public Website
│   ├── Village information
│   ├── Tourism destinations
│   ├── Interactive tourism map
│   ├── Tourism packages
│   ├── Culture and customary institutions
│   ├── Traditional houses
│   ├── Cultural events
│   ├── Homestays
│   ├── UMKM
│   ├── Gallery
│   └── Public contacts
│
└── Protected Admin Dashboard
    ├── Content management
    ├── Publication management
    ├── Coordinate management
    ├── Media management
    └── Public site settings
```

---

## 1.1 Shared Responsibilities

The public website and dashboard may share:

* TypeScript domain types
* Data mapping functions
* Zod schemas where validation rules are identical
* Supabase client factories
* Media-path utilities
* Slug utilities
* Coordinate validators
* Publication-status constants
* Reusable low-level UI components
* Formatting utilities

Shared code must not imply shared access rights.

A component being reusable does not make its data public.

---

## 1.2 Responsibilities That Must Remain Separate

The following must remain logically separate:

| Public website             | Admin dashboard                              |
| -------------------------- | -------------------------------------------- |
| Reads published content    | Reads draft, published, and archived content |
| Optimized for visitors     | Optimized for village officers               |
| Search-engine indexable    | Excluded from indexing                       |
| No content mutations       | Performs authorized mutations                |
| No administrative metadata | Shows status and audit information           |
| No private user data       | Shows only the current administrator identity needed for the session |
| No publication controls    | Provides draft, publish, and archive actions |

Public components must not receive administrative fields unless needed for public rendering.

Admin components must not depend on public-page layouts.

---

## 1.3 Application Boundary

The application remains one deployment unit.

It must not be split into:

* Separate public and admin repositories
* Separate backend service
* Separate map service
* Separate media service
* Microservices

Logical separation is achieved through:

* App Router route groups
* Protected layouts
* Feature modules
* Centralized authorization
* Separate query functions
* Separate public and admin presentation components

---

# 2. Route Design

## 2.1 Route Tree

```text
app/
├── layout.tsx
├── globals.css
│
├── (public)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── profil-desa/
│   │   └── page.tsx
│   ├── destinasi/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       └── not-found.tsx
│   ├── peta-wisata/
│   │   └── page.tsx
│   ├── paket-wisata/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       └── not-found.tsx
│   ├── budaya-adat/
│   │   ├── page.tsx
│   │   ├── artikel/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── pranata-adat-bayan/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── rumah-adat/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   └── event-adat/
│   │       ├── page.tsx
│   │       └── [slug]/
│   │           └── page.tsx
│   ├── homestay/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── umkm/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── galeri/
│   │   └── page.tsx
│   ├── kontak/
│   │   └── page.tsx
│   ├── sitemap.ts
│   └── robots.ts
│
├── (auth)/
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── lupa-password/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx
│
├── auth/
│   └── callback/
│       └── route.ts
│
├── admin/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── destinasi/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── paket-wisata/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── rumah-adat/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── artikel-budaya/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── pranata-adat/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── event-adat/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── homestay/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── umkm/
│   │   ├── page.tsx
│   │   ├── baru/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── galeri/
│   │   └── page.tsx
│   ├── profil-desa/
│   │   └── page.tsx
│   ├── kontak/
│   │   └── page.tsx
│   ├── media/
│   │   └── page.tsx
│   └── pengaturan/
│       └── page.tsx
│
├── not-found.tsx
├── error.tsx
└── loading.tsx
```

---

## 2.2 Public Route Responsibilities

| Route                                    | Purpose                        | Expected data                            | Rendering                                     | Main interaction                         |
| ---------------------------------------- | ------------------------------ | ---------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| `/`                                      | Tourism homepage               | Featured published content               | Server Component                              | Navigate to detail and list pages        |
| `/profil-desa`                           | Official village profile       | Published village profile                | Server Component                              | Read village information                 |
| `/destinasi`                             | Destination discovery          | Published destinations and categories    | Server-first with optional client filter      | Filter and open details                  |
| `/destinasi/[slug]`                      | Destination detail             | One published destination and images     | Server Component                              | View map and navigation link             |
| `/peta-wisata`                           | Full tourism map               | Published map-safe destination summaries | Server wrapper with Client map                | Filter and open marker                   |
| `/paket-wisata`                          | Package listing                | Published packages                       | Server Component                              | Open package details                     |
| `/paket-wisata/[slug]`                   | Package detail                 | Package and ordered destinations         | Server Component with optional map client     | Review package sequence                  |
| `/budaya-adat`                           | Culture section landing        | Featured culture content                 | Server Component                              | Open culture sections                    |
| `/budaya-adat/artikel`                   | Cultural article list          | Published cultural articles              | Server Component                              | Open article                             |
| `/budaya-adat/artikel/[slug]`            | Cultural article detail        | One published article                    | Server Component                              | Read verified content                    |
| `/budaya-adat/pranata-adat-bayan`        | Customary institution overview | Published customary institution articles | Server Component                              | Open article                             |
| `/budaya-adat/pranata-adat-bayan/[slug]` | Customary article detail       | One published customary article          | Server Component                              | Read verified content                    |
| `/budaya-adat/rumah-adat`                | Traditional-house list         | Published traditional houses             | Server Component                              | Open detail                              |
| `/budaya-adat/rumah-adat/[slug]`         | Traditional-house detail       | One published house and images           | Server Component                              | View details and location                |
| `/budaya-adat/event-adat`                | Event list                     | Published events                         | Server Component                              | Browse upcoming and past events          |
| `/budaya-adat/event-adat/[slug]`         | Event detail                   | One published event                      | Server Component                              | View schedule and location               |
| `/homestay`                              | Homestay list                  | Published homestays                      | Server Component                              | Contact or open detail                   |
| `/homestay/[slug]`                       | Homestay detail                | One published homestay and images        | Server Component                              | View facilities and contact              |
| `/umkm`                                  | UMKM list                      | Published UMKM                           | Server Component                              | Browse categories and details            |
| `/umkm/[slug]`                           | UMKM detail                    | One published UMKM and images            | Server Component                              | View contact and location                |
| `/galeri`                                | Standalone public gallery      | Published gallery items                  | Server Component with client lightbox if used | View images                              |
| `/kontak`                                | Official contacts              | Published contacts and public settings   | Server Component                              | Open phone, WhatsApp, email, or map link |

---

## 2.3 Authentication Routes

### `/login`

**Status:** Public, but redirects authenticated administrators to `/admin`.

**Responsibilities:**

* Email and password input
* Authentication feedback
* Link to password recovery
* No public user registration

**Rendering:**

* Server-rendered shell
* Client form for immediate field interaction
* Authentication mutation performed server-side or through the approved Supabase authentication flow

---

### `/lupa-password`

Included because Supabase Auth supports password recovery.

**Responsibilities:**

* Accept administrator email
* Trigger recovery email
* Show neutral response that does not reveal whether an account exists

---

### `/reset-password`

**Responsibilities:**

* Accept recovery session
* Validate new password
* Update password
* Redirect to login or dashboard after success

Invalid or expired recovery sessions must display a specific recovery error and provide a link to request a new email.

---

### `/auth/callback`

A Route Handler used only for the Supabase Auth callback flow.

It must not contain unrelated application mutations.

---

## 2.4 Admin Route Responsibilities

All `/admin` routes are protected.

The admin layout must verify an authenticated Supabase session belonging to the configured single administrator identity. Any other identity is denied.

| Route group                     | Purpose                                  | Main actions                                    | Rendering                                     |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| `/admin`                        | Operational overview                     | View drafts, upcoming events, recent changes    | Server Component                              |
| `/admin/destinasi`              | Destination management                   | List, search, filter, preview, publish, archive | Server list with client controls where needed |
| `/admin/destinasi/baru`         | Create destination                       | Save draft, upload media, preview               | Interactive form                              |
| `/admin/destinasi/[id]/edit`    | Edit destination                         | Update, publish, archive, preview               | Server-loaded interactive form                |
| `/admin/paket-wisata`           | Package management                       | List, preview, publish, archive                 | Server list                                   |
| `/admin/paket-wisata/baru`      | Create package                           | Set identity, destinations, order, media        | Interactive form                              |
| `/admin/paket-wisata/[id]/edit` | Edit package                             | Update sequence and publication                 | Interactive form                              |
| `/admin/rumah-adat`             | Traditional-house management             | List, create, edit, preview, publish            | Mixed server and client                       |
| `/admin/artikel-budaya`         | General culture article management       | Draft, edit, preview, publish                   | Mixed server and client                       |
| `/admin/pranata-adat`           | Customary institution article management | Draft, verify, preview, publish                 | Mixed server and client                       |
| `/admin/event-adat`             | Event management                         | Create occurrence, update, archive              | Mixed server and client                       |
| `/admin/homestay`               | Homestay management                      | CRUD-like editorial workflow                    | Mixed server and client                       |
| `/admin/umkm`                   | UMKM management                          | CRUD-like editorial workflow                    | Mixed server and client                       |
| `/admin/galeri`                 | Standalone gallery management            | Upload, caption, reorder, archive               | Client interaction with server mutations      |
| `/admin/profil-desa`            | Singleton village-profile editor         | Edit, preview, publish                          | Server-loaded interactive form                |
| `/admin/kontak`                 | Additional public contact management     | Add, edit, reorder, publish, archive, restore   | Interactive page                              |
| `/admin/media`                  | Media reference overview                 | Find usage and identify orphan candidates       | Server-first                                  |
| `/admin/pengaturan`             | Public settings                          | Edit approved settings including central WhatsApp | Interactive form                            |

---

# 3. Proposed Folder Structure

The project retains the root-based application structure and must not migrate to `src/`.

```text
app/
├── (public)/
├── (auth)/
├── auth/
├── admin/
├── layout.tsx
├── globals.css
├── error.tsx
├── loading.tsx
└── not-found.tsx

components/
├── layout/
├── public/
├── admin/
├── forms/
├── map/
└── ui/

features/
├── destinations/
├── destination-categories/
├── packages/
├── culture/
├── customary-institutions/
├── traditional-houses/
├── events/
├── homestays/
├── umkm/
├── village-profile/
├── gallery/
├── contacts/
├── media/
└── settings/

lib/
├── supabase/
├── validation/
├── maps/
├── media/
└── utilities/

types/
config/
constants/
public/
proxy.ts

supabase/
├── migrations/
├── seed.sql
└── policies/

qgis/
├── source/
└── exports/

scripts/
└── import-initial-destinations.ts
```

---

## 3.1 `app`

### Responsibility

Owns:

* Routes
* Route layouts
* Route-level loading states
* Route-level error boundaries
* Metadata entry points
* Page composition

### Must Not Contain

* Raw Supabase queries
* Reusable business validation
* Storage-path construction
* Feature-specific mutation logic
* Large reusable presentational components

### Likely Files

* `page.tsx`
* `layout.tsx`
* `loading.tsx`
* `error.tsx`
* `not-found.tsx`
* `route.ts`
* `sitemap.ts`
* `robots.ts`

Pages should compose feature functions and components rather than implement domain logic directly.

---

## 3.2 `components/layout`

### Responsibility

Reusable application-shell components.

Likely components:

* `PublicHeader`
* `PublicFooter`
* `AdminSidebar`
* `AdminHeader`
* `MobileNavigation`
* `Breadcrumbs`
* `PageContainer`

### Must Not Contain

* Destination-specific cards
* Supabase calls
* Feature mutation logic
* Authorization policy decisions

---

## 3.3 `components/public`

### Responsibility

Cross-feature public presentation components.

Examples:

* `SectionHeading`
* `ContentHero`
* `PublicEmptyState`
* `ContactCallToAction`
* `ImageGallery`
* `PublicationDate`

### Must Not Contain

* Feature-specific database mapping
* Admin controls
* Raw database types

Components used by only one feature should remain in that feature module.

---

## 3.4 `components/admin`

### Responsibility

Reusable dashboard patterns.

Examples:

* `AdminPageHeader`
* `StatusBadge`
* `ContentTable`
* `RowActions`
* `ArchiveDialog`
* `PublishDialog`
* `AdminEmptyState`
* `FormSection`
* `UnsavedChangesDialog`

### Must Not Contain

* Feature-specific field definitions
* Raw Supabase mutation logic
* Authorization rules embedded in visual components

---

## 3.5 `components/forms`

### Responsibility

Reusable form controls that have the same behavior across multiple features.

Examples:

* `TextField`
* `TextAreaField`
* `CurrencyField`
* `CoordinateFields`
* `PublicationStatusField`
* `FacilitiesInput`
* `ImagePicker`
* `FormErrorSummary`

### Must Not Contain

* Complete destination or event forms
* Feature-specific submission logic
* Entity-specific Zod schemas

---

## 3.6 `components/map`

### Responsibility

Reusable Leaflet presentation primitives.

Examples:

* `TourismMap`
* `LocationPicker`
* `MapLegend`
* `MapFallback`
* `UserLocationControl`

Feature-specific marker-data mapping remains in the appropriate feature module.

---

## 3.7 `components/ui`

### Responsibility

Low-level reusable interface primitives.

Examples:

* Button
* Input
* Dialog
* Drawer
* Tabs
* Badge
* Card
* Skeleton
* Alert
* Pagination

These components must remain domain-neutral.

---

## 3.8 `features`

Each feature module owns one domain responsibility.

Recommended internal pattern:

```text
features/destinations/
├── components/
├── data/
│   ├── queries/
│   └── mutations/
├── forms/
├── schemas/
├── mappers/
├── types/
└── constants/
```

Small features do not need every subdirectory. Avoid creating empty structural folders.

### Feature Ownership

| Feature                  | Owns                                                 |
| ------------------------ | ---------------------------------------------------- |
| `destinations`           | Destination lists, details, forms, map summaries     |
| `destination-categories` | Fixed category constants and category presentation   |
| `packages`               | Package forms, destination ordering, package details |
| `culture`                | General cultural articles                            |
| `customary-institutions` | Bayan customary institution articles                 |
| `traditional-houses`     | Traditional-house content                            |
| `events`                 | Cultural events                                      |
| `homestays`              | Homestay content                                     |
| `umkm`                   | UMKM content                                         |
| `village-profile`        | Singleton village profile                            |
| `gallery`                | Standalone gallery items                             |
| `contacts`               | Public contact channels                              |
| `media`                  | Upload orchestration and media reference management  |
| `settings`               | Approved site settings                               |

### Must Not Be Placed in Feature Modules

* Global Supabase client construction
* Generic UI primitives
* Cross-feature environment configuration
* Database migration files

---

## 3.9 `lib/supabase`

### Responsibility

Centralizes Supabase access setup.

Likely files:

```text
client.ts
server.ts
middleware.ts
auth.ts
errors.ts
```

Responsibilities include:

* Browser client creation
* Server client creation
* Cookie-aware session handling
* Authentication helpers
* Supabase error normalization

### Must Not Contain

* Destination queries
* Event mutations
* Feature-specific mapping
* UI messages for individual forms

---

## 3.10 `lib/validation`

### Responsibility

Cross-feature validation primitives.

Examples:

* Coordinate validation
* Slug format
* Phone format
* Publication status
* URL format
* File metadata rules

Entity-specific schemas remain in feature modules.

---

## 3.11 `lib/maps`

### Responsibility

Map-level utility logic.

Examples:

* Coordinate-range checks
* Safe marker conversion
* Default Karang Bajo map configuration
* Bounds calculation
* Marker-style lookup
* Google Maps navigation URL validation

Must not query Supabase.

---

## 3.12 `lib/media`

### Responsibility

Cross-feature media utilities.

Examples:

* File-name normalization
* Unique object-name generation
* Storage-path building
* Allowed MIME types
* Dimension limits
* Image compression configuration
* Orphan-cleanup helpers

Feature-specific database association remains in feature modules.

---

## 3.13 `lib/utilities`

### Responsibility

Small domain-neutral utilities.

Examples:

* Date formatting
* Currency display
* Text truncation
* Null-safe formatting

This directory must not become a miscellaneous location for business logic.

---

## 3.14 `types`

### Responsibility

Types shared across multiple unrelated features.

Examples:

* `PublicationStatus`
* `PaginatedResult`
* `ActionResult`
* `SelectOption`

Raw generated Supabase database types may also be stored here or in `lib/supabase`, but application-facing types remain feature-owned where possible.

---

## 3.15 `config`

### Responsibility

Validated runtime configuration.

Examples:

* Public site URL
* Supabase URL presence
* Supabase anonymous key presence
* Map defaults
* Public contact fallbacks where approved

Secrets must not be exported to browser code.

---

## 3.16 `constants`

### Responsibility

Stable application constants.

Examples:

* Publication-status labels
* Package type labels
* Supported image formats
* Admin navigation entries

Do not place mutable site content here.

---

## 3.17 `supabase`

### Responsibility

Owns database migration and policy artifacts.

```text
supabase/
├── migrations/
├── seed.sql
└── policies/
```

* `migrations/`: ordered production schema changes
* `seed.sql`: controlled system seed data
* `policies/`: policy documentation or separated policy scripts if used by the project workflow

This directory must not contain application UI code.

---

## 3.18 `qgis`

```text
qgis/
├── source/
└── exports/
```

* `source/`: QGIS project files and original validated geographic sources
* `exports/`: reviewed GeoJSON or CSV exports prepared for import

QGIS files are not runtime dependencies.

---

## 3.19 `scripts`

Contains controlled maintenance or migration scripts.

Initial script:

```text
import-initial-destinations.ts
```

It must not become a second backend.

Scripts must:

* Be manually invoked
* Validate input
* Produce reviewable output
* Avoid publishing imported content automatically

---

# 4. Rendering Strategy

## 4.1 Default: Server Components

Server Components are the default for:

* Public pages
* Public list pages
* Detail pages
* Dashboard overview
* Admin list pages
* Data-loading wrappers
* Metadata generation
* Authorization checks

Reasons specific to this project:

* Public tourism content must be indexable.
* Supabase credentials and access decisions remain server-side.
* Less JavaScript is sent to mobile visitors.
* Administrative data can be loaded before rendering protected pages.
* Public queries remain centralized.

---

## 4.2 Client Components

Client Components are limited to browser-dependent interactions.

Approved use cases:

* Leaflet maps
* Coordinate picker
* Immediate category filtering
* Media uploader
* Drag-and-drop image ordering
* Package destination reordering
* Modal dialogs
* Mobile navigation
* Form state managed by React Hook Form
* Unsaved-change detection
* Image lightbox
* User-location control

A component must not become client-side merely because one child requires interaction. Keep the smallest practical interactive boundary.

---

## 4.3 Primary Mutation Pattern: Server Actions

Server Actions are the primary mutation mechanism for dashboard forms.

They are used for:

* Creating content
* Updating content
* Publishing content
* Archiving content
* Updating image metadata
* Reordering relationships
* Updating public contacts
* Updating approved settings

### Why Server Actions Are Primary

* Mutations remain close to the Next.js application.
* Authentication can be checked server-side.
* Zod validation can run before database access.
* Form errors can be returned directly.
* No separate custom API layer is required.
* The project maintains one predictable mutation pattern.

---

## 4.4 Limited Route Handler Use

Route Handlers are limited to cases that require an HTTP endpoint.

Approved cases:

* Supabase Auth callback
* A future controlled import endpoint only if explicitly approved
* A future upload endpoint only if direct upload cannot satisfy validation requirements

Normal content CRUD must not be split arbitrarily between Server Actions and Route Handlers.

---

## 4.5 Browser-to-Storage Upload

Large media files should not be passed through a Server Action as the default path.

Recommended upload sequence:

1. Server verifies authenticated user and permission.
2. Browser validates and compresses the image.
3. Browser uploads using an authenticated Supabase client.
4. Server Action records or updates image metadata.
5. Failed metadata persistence triggers cleanup or marks the object as orphaned.

Browser upload does not bypass Storage policies.

---

# 5. Data Access Design

## 5.1 Centralized Data Access

UI components must not call Supabase directly.

Feature data access follows this pattern:

```text
features/destinations/data/
├── queries/
│   ├── get-published-destinations
│   ├── get-published-destination-by-slug
│   ├── get-map-destinations
│   ├── get-admin-destinations
│   └── get-admin-destination-by-id
│
└── mutations/
    ├── create-destination
    ├── update-destination
    ├── publish-destination
    ├── archive-destination
    └── restore-destination
```

File extensions are omitted because this document does not define code files.

---

## 5.2 Feature Separation

Each feature separates:

| Layer              | Responsibility                                |
| ------------------ | --------------------------------------------- |
| Query functions    | Read approved subsets of data                 |
| Mutation functions | Perform authorized writes                     |
| Zod schemas        | Validate application input                    |
| Mappers            | Convert database rows into application models |
| Components         | Render already-prepared data                  |
| Forms              | Manage browser input and submission state     |
| Types              | Define application-facing structures          |

---

## 5.3 Supabase Client Types

### Server Client

Used for:

* Public server-rendered queries
* Admin queries
* Server Actions
* Authentication checks
* Metadata generation

It reads and writes session cookies through the approved Next.js Supabase integration.

### Browser Client

Used only for:

* Authenticated direct media upload
* Browser authentication state where required
* Password recovery client flow where required

It must use only browser-safe configuration.

### Privileged Credentials

Service-role credentials:

* Must never be included in browser bundles
* Must not be used for normal dashboard mutations
* Must not be used to bypass RLS during routine requests
* May only be used in controlled administrative scripts or server-only maintenance tasks after explicit review

---

## 5.4 Public Queries

Public queries must enforce:

* `status = published`
* Published parent relationships
* Minimum fields required by the page

Examples:

The map query should return only:

* ID
* Name
* Slug
* Summary
* Category
* Latitude
* Longitude
* Thumbnail reference
* Google Maps URL

It should not return full history, audit users, or administrative fields.

---

## 5.5 Admin Queries

Admin queries must verify:

1. Valid authenticated Supabase session
2. Session identity matches the configured administrator

Admin list queries may return:

* ID
* Name or title
* Status
* Updated time
* Featured state
* Relevant event date
* Thumbnail

They should not retrieve full long-form content for every row.

---

## 5.6 Raw Row Mapping

Raw database rows must be converted before reaching presentation components.

Mappers handle:

* Null normalization
* Date parsing
* Publication-status typing
* Storage URL construction
* Numeric coordinate conversion
* Ordered image collections
* Package destination ordering
* Public-safe field selection

Presentation components must not depend on Supabase-generated row shapes.

---

## 5.7 Error Normalization

Supabase errors are converted into application error categories.

Recommended categories:

```text
AUTH_REQUIRED
FORBIDDEN
NOT_FOUND
VALIDATION_FAILED
CONFLICT
STORAGE_FAILED
DATABASE_UNAVAILABLE
UNKNOWN
```

User-facing messages must be defined by action context.

Examples:

| Technical category             | User-facing message                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `CONFLICT` during slug generation | “Alamat halaman otomatis sudah digunakan. Ubah nama sebelum publikasi pertama atau periksa data yang ada.” |
| `STORAGE_FAILED` during upload | “Gambar belum berhasil diunggah. Periksa koneksi lalu coba lagi.”                                         |
| `FORBIDDEN` during publish     | “Sesi administrator tidak valid. Silakan masuk kembali.”                                                  |
| `DATABASE_UNAVAILABLE`         | “Data belum dapat disimpan karena layanan sedang tidak tersedia. Data pada formulir tetap dipertahankan.” |

---

# 6. Public Website Design

# 6.1 Homepage

## Section Order

```text
1. Navigation
2. Hero
3. Village Introduction
4. Featured Destinations
5. Interactive Map Preview
6. Culture and Customary Institutions Teaser
7. Tourism Packages
8. Upcoming Cultural Events
9. Homestay and UMKM Preview
10. Gallery
11. Contact Call-to-Action
12. Footer
```

---

## 6.1.1 Navigation

**Data source:** Static route configuration and limited public settings.

**Responsibility:**

* Provide access to primary sections
* Indicate current section
* Provide mobile menu
* Avoid exposing admin navigation

**Missing-content fallback:**

Navigation remains available even when a section has no published records. A section with no content displays its own empty state.

**Mobile behavior:**

Collapsible menu with keyboard-operable trigger and explicit close button.

**Destination:**

Primary public routes.

---

## 6.1.2 Hero

**Data source:** Published village profile and approved hero-media setting.

**Responsibility:**

* Display village name
* Display short introduction
* Provide one or two primary navigation actions

**Fallback:**

* Use village name and summary.
* Use a local bundled fallback image when no approved hero image exists.
* Do not use placeholder history.

**Mobile behavior:**

Text remains readable without relying on text over detailed image areas.

**Interaction destination:**

* Destinations
* Village profile

---

## 6.1.3 Village Introduction

**Data source:** Published `village_profiles`.

**Responsibility:**

Show a shortened village summary and link to the full profile.

**Fallback:**

Hide the section when no published profile exists. Do not display lorem ipsum.

**Mobile behavior:**

Single-column layout.

---

## 6.1.4 Featured Destinations

**Data source:** Published destinations with `is_featured = true`.

**Responsibility:**

Show a limited selection of destination cards.

Recommended limit:

```text
3 to 6 destinations
```

**Fallback:**

Use the latest or manually ordered published destinations when no featured item is configured.

If no destination is published, show a neutral empty state without an empty carousel.

**Mobile behavior:**

Horizontal controlled card scroll or one-column list. Content must not require hover.

**Interaction destination:**

`/destinasi/[slug]`

---

## 6.1.5 Interactive Map Preview

**Data source:** Published destination map summaries.

**Responsibility:**

* Show a lightweight preview
* Display markers
* Link to full map

**Fallback:**

If no valid markers exist, show a link to the destination list instead of an empty map.

**Mobile behavior:**

Fixed minimum height with touch-friendly controls.

**Interaction destination:**

`/peta-wisata`

---

## 6.1.6 Culture and Customary Institutions Teaser

**Data source:**

* Featured cultural articles
* Featured customary institution articles
* Featured traditional houses

**Responsibility:**

Introduce cultural sections without reproducing full article content.

**Fallback:**

Show only subsections with published content.

**Mobile behavior:**

Stacked cards.

**Interaction destination:**

Relevant culture detail or index route.

---

## 6.1.7 Tourism Packages

**Data source:** Featured or ordered published packages.

**Responsibility:**

Display:

* Package name
* Type
* Duration
* Price when available
* Short summary
* Included destination count

**Fallback:**

Hide the section when no package is published.

**Mobile behavior:**

Cards stack vertically. Do not force three-column price comparison on small screens.

**Interaction destination:**

`/paket-wisata/[slug]`

---

## 6.1.8 Upcoming Cultural Events

**Data source:**

Published events where:

* `start_at` is in the future, or
* `date_note` indicates an unconfirmed or customary date

**Responsibility:**

Show upcoming events separately from archived event documentation.

**Fallback:**

Display: “Belum ada jadwal event adat yang dipublikasikan.”

Do not fabricate a date from historical patterns.

---

## 6.1.9 Homestay and UMKM Preview

**Data source:** Featured published homestays and UMKM.

**Responsibility:**

Provide compact discovery links.

**Fallback:**

Display only the content type that has published records.

**Mobile behavior:**

Separate sections or clearly labeled card groups.

---

## 6.1.10 Gallery

**Data source:** Published `gallery_items`.

**Responsibility:**

Show a limited visual preview.

**Fallback:**

Hide when no gallery item exists.

**Mobile behavior:**

Two-column image grid or horizontal preview. Full-screen lightbox must have a close button and keyboard support.

---

## 6.1.11 Contact Call-to-Action

**Data source:** Public `primary_whatsapp_number` site setting.

**Responsibility:**

Provide a clear next step for tourism inquiries.

The central WhatsApp action is the primary CTA on every visitor inquiry surface. The `/kontak` page lists additional published channels. If the central number is unavailable, show a configuration-safe fallback link to `/kontak` without promoting an entity-specific contact as the global primary.

Do not expose private administrator contacts.

---

## 6.2 List Pages

### Filtering

Filtering is included only where it improves discovery.

| Page             | Filter                                                        |
| ---------------- | ------------------------------------------------------------- |
| Destinations     | Destination category                                          |
| UMKM             | UMKM category                                                 |
| Events           | Upcoming and past                                             |
| Culture articles | Article category when populated                               |
| Gallery          | Gallery category when populated                               |
| Homestays        | No filter in initial version unless record count justifies it |
| Packages         | Package type                                                  |

### Search

Search is not mandatory for every list.

The following search support is a proposal pending the public-search scope decision:

* Destinations
* UMKM
* Admin content lists

Public search remains simple text matching. No external search engine is introduced.

### Pagination

Use simple pagination when a list exceeds the agreed page size.

Recommended default:

```text
12 public cards per page
20 admin rows per page
```

For small datasets, render the complete list without artificial pagination.

### Empty States

Empty states must distinguish:

* No published content
* No result for current filter
* Data unavailable due to failure

Examples:

* “Belum ada destinasi yang dipublikasikan.”
* “Tidak ada destinasi dalam kategori ini.”
* “Daftar destinasi belum dapat dimuat. Coba muat ulang halaman.”

### Card Responsibilities

A public card shows only:

* Thumbnail
* Name or title
* Short summary
* Relevant classification
* One key item such as duration, event date, or location
* Detail-page link

Cards must not reproduce full descriptions.

---

## 6.3 Detail Pages

Detail pages share structural conventions but not one generic component.

---

### 6.3.1 Destination Detail

Recommended structure:

1. Breadcrumb
2. Name, category, summary
3. Primary image
4. Main description
5. Destination-specific history
6. Visitor information
7. Facilities
8. Contact
9. Map
10. Google Maps navigation action
11. Gallery
12. Related package links where available

Do not display empty sections.

---

### 6.3.2 Tourism Package Detail

Recommended structure:

1. Breadcrumb
2. Package name and type
3. Duration and informational price
4. Summary
5. Description
6. Included facilities
7. Souvenir information
8. Ordered destination stops
9. Marker map of included destinations
10. Contact call-to-action

The map must not draw or claim an optimized road route.

---

### 6.3.3 Traditional House Detail

Recommended structure:

1. Breadcrumb
2. Name and locality
3. Summary
4. Description
5. Historical background
6. Cultural significance
7. Visitor information
8. Map when published coordinates are supplied
9. Gallery

The page must not present the traditional house as a generic natural-tourism destination.

---

### 6.3.4 Cultural Event Detail

Recommended structure:

1. Breadcrumb
2. Event title
3. Confirmed date or explicit date note
4. Location
5. Description
6. Visitor information
7. Organizer and consented optional public contact
8. Map when available
9. Event images

Unconfirmed dates must be labeled clearly.

---

### 6.3.5 Homestay Detail

Recommended structure:

1. Breadcrumb
2. Homestay name
3. Description
4. Owner or manager only with publication consent
5. Informational price
6. Facilities
7. Address and map
8. Central WhatsApp CTA, plus optional consented homestay contact
9. Gallery

Do not show booking availability.

---

### 6.3.6 UMKM Detail

Recommended structure:

1. Breadcrumb
2. Business name and category
3. Description
4. Owner when publication consent is recorded
5. Address and map
6. Central WhatsApp CTA, plus optional consented UMKM contact
7. Gallery

Do not display shopping-cart or order actions.

---

# 7. Map Module Design

## 7.1 Component Structure

```text
TourismMap
├── MapInitializer
├── MapItemLayer
│   └── GroupedMarker
│       └── MapItemPopup
├── CategoryFilter
├── MapLegend
├── UserLocationControl
└── MapFallback
```

---

## 7.2 Client and Server Boundaries

### Server Responsibilities

The route or Server Component:

* Fetches published destination, traditional-house, homestay, and visitable-UMKM summaries
* Removes unpublished records
* Maps raw database rows to a shared `MapItem`
* Excludes invalid coordinate pairs
* Groups identical approved coordinate pairs into one `MapMarkerGroup`
* Passes serializable data to the client map

### Client Responsibilities

The Leaflet module:

* Creates the map
* Adds OpenStreetMap tile layer
* Renders markers
* Handles filters
* Fits bounds
* Opens popups
* Requests browser geolocation
* Updates size after layout changes

All Leaflet components are Client Components.

---

## 7.3 Map Data Contract

Each `MapItem` contains only:

```text
id
entity_type
name
slug
summary
category_id when the item is a destination
category_name when the item is a destination
latitude
longitude
thumbnail_url
google_maps_url
```

The client receives marker groups containing one coordinate pair and one or more `MapItem` values. UMKM Tenun and Kampung Adat must be in the same group.

It does not receive:

* Full article content
* Audit fields
* Draft status
* Internal notes
* Administrator information

---

## 7.4 Marker Styles

Marker style is derived from a controlled category-style map in application configuration.

Each category may define:

* Marker icon
* Label
* Legend entry

Marker styles must not be stored as arbitrary executable configuration in the database.

Traditional houses, homestays, and UMKM use controlled type styles. Unknown destination categories cannot occur because `Alam`, `Budaya`, and `Religi` are fixed.

---

## 7.5 Map Focus

The initial center uses an approved Karang Bajo reference coordinate from project configuration or the published village profile.

Behavior:

1. If two or more valid markers exist, fit bounds to markers.
2. If one valid marker exists, center on that marker at an appropriate zoom.
3. If no marker exists, show a non-interactive fallback state.
4. Maximum automatic zoom must avoid excessive zoom on markers with nearly identical coordinates.

---

## 7.6 Invalid Coordinates

Invalid coordinates must be rejected at form validation and database-constraint levels.

The map module must still defend against invalid data.

A record is excluded from the map when:

* Latitude is missing
* Longitude is missing
* Latitude is outside `-90` to `90`
* Longitude is outside `-180` to `180`
* Values cannot be converted safely

Invalid records remain accessible through their normal list when otherwise published, but the map section must show “Lokasi peta belum tersedia.”

Invalid coordinate details should be logged server-side.

---

## 7.7 Popup Content

Popup content is intentionally compact:

* One or more represented item names
* Entity type and destination category where applicable
* Short summary
* Optional thumbnail
* Link to detail page
* Optional Google Maps navigation link

The popup must not contain the full destination description.

---

## 7.8 OpenStreetMap Tile Layer

Leaflet renders an approved OpenStreetMap-compatible tile endpoint.

The map must display required attribution.

The tile endpoint must be configurable so the project can change providers without changing feature logic.

---

## 7.9 Leaflet CSS and Browser Imports

Leaflet CSS must be loaded once through the application-level style strategy.

Browser-only Leaflet modules must not be evaluated during server rendering.

The map component must be loaded through a client boundary that disables server-side Leaflet execution.

---

## 7.10 Initialization Stability

To avoid duplicate-container and size-calculation errors:

* One mounted map component owns one container.
* Do not manually initialize a second Leaflet instance on the same element.
* Destroy map state when the component unmounts.
* Use stable container keys.
* Do not recreate the map for every filter change.
* Update marker layers instead of replacing the entire map.
* Trigger size invalidation after:

  * Tab activation
  * Drawer closure
  * Modal opening
  * Responsive container changes

---

## 7.11 User Location

The user-location button is optional.

When used:

* It requests browser permission only after explicit interaction.
* It does not persist visitor coordinates.
* Failure does not block map use.
* The interface explains denied or unavailable permission.

User location is not used for route optimization.

---

## 7.12 Mobile Map Behavior

Recommended heights:

* Mobile: `55vh`, with a practical minimum
* Tablet: `60vh`
* Desktop full map: `70vh`

Popup width must remain inside the viewport.

Filters may use a horizontal scroll row or bottom sheet on mobile.

The map must not trap page scrolling.

---

## 7.13 Map Accessibility Alternative

Every mapped item must also be available in a textual list with:

* Name
* Category
* Location summary
* Detail link
* Google Maps link when present

The interactive map must not be the only discovery interface.

---

# 8. Admin Dashboard Design

## 8.1 Navigation

Recommended navigation groups:

```text
Overview
├── Dashboard

Tourism Content
├── Destinations
├── Tourism Packages
├── Homestays
└── UMKM

Culture
├── Traditional Houses
├── Cultural Articles
├── Bayan Customary Institutions
└── Cultural Events

General Content
├── Village Profile
├── Gallery
└── Contacts

Administration
├── Media
└── Settings
```

Navigation has no role variants in Version 1. It is rendered only inside the authenticated administrator layout.

Hiding an entry is only a usability behavior. Authorization remains enforced server-side and through RLS.

---

## 8.2 Dashboard Overview

Recommended summary cards:

* Draft content count
* Published destination count
* Upcoming event count
* Media items requiring alt text, if such invalid data can exist
* Recently updated content

Avoid vanity metrics such as page views unless an approved analytics service is added.

---

## 8.3 Recent Content

Show:

* Content title
* Content type
* Status
* Last updated time
* Last updated time
* Edit action

Recommended limit:

```text
5 to 10 records
```

---

## 8.4 Draft Content

The dashboard should make unfinished work visible.

Draft section includes:

* Title
* Content type
* Last update
* Edit action

It must not automatically publish old drafts.

---

## 8.5 Upcoming Events

Show only published or draft events relevant to administrators, with clear status labels.

Events without confirmed dates appear separately as:

```text
Tanggal belum dikonfirmasi
```

---

## 8.6 Media Usage Indicator

The media overview may show:

* Total stored media records
* Media without parent association
* Missing alt text
* Storage object missing for a metadata record
* Suspected orphan files

It must not claim exact Supabase storage quota unless current quota data is reliably available.

---

## 8.7 Management Workflow

Content management pages generally support:

```text
List
Create
Edit
Preview
Publish
Archive
```

Normal workflows do not provide permanent deletion.

Restore may be available to Admin through a separate archived-content view.
Restore always returns the record to draft.

---

## 8.8 List-Page Pattern

Every admin list page includes:

1. Page title
2. One-sentence explanation
3. Primary create action where applicable
4. Search input where justified
5. Status filter
6. Entity-specific filter
7. Table or mobile cards
8. Pagination when required
9. Row actions
10. Empty state

### Row Actions

Recommended actions:

* Edit
* Preview
* Publish
* Archive
* Restore from the archived-content view

Permanent delete must not appear anywhere in the Version 1 dashboard.

---

## 8.9 Form-Page Pattern

Every form page includes:

1. Breadcrumb
2. Title
3. Current status
4. Grouped form sections
5. Persistent save controls
6. Validation summary
7. Preview action where useful
8. Cancel or return action
9. Unsaved-change protection

Recommended actions:

* `Simpan Draft`
* `Simpan Perubahan`
* `Pratinjau`
* `Terbitkan`
* `Arsipkan`

---

## 8.10 Destructive Actions

Archive requires:

* Explicit confirmation dialog
* Record name in the confirmation
* Explanation of public impact
* Disabled submit while processing

Typing the record name is unnecessary for routine archive actions.

---

# 9. Form Design

All administrative forms use:

* React Hook Form
* Zod
* Accessible labels
* Indonesian helper text
* Field-level errors
* Form-level error summary
* Server-side revalidation

Slug behavior:

* Automatically generated from the initial title or name
* Hidden from normal administrator forms
* May regenerate while a record has never been published
* Becomes immutable after first publication
* Validated for allowed format
* Checked for uniqueness on submission

---

## 9.1 Destination Form

```text
Informasi Dasar
├── Name
├── Category
├── Summary
├── Description
└── History

Informasi Pengunjung
├── Opening hours
├── Entrance fee
├── Price note
├── Facilities
├── Contact name
├── Contact phone
└── Publication consent confirmation

Lokasi
├── Latitude
├── Longitude
├── Interactive location picker
├── Coordinate validation
└── Google Maps URL

Media
├── Thumbnail
├── Gallery
├── Alt text
├── Caption
└── Display order

Publikasi
├── Featured
├── Display order
├── Status
└── Preview
```

### Required for Draft

* Name
* Category when known

### Required for Publication

* Name
* Category
* Summary
* Description
* Valid latitude
* Valid longitude
* At least one usable image, as a recommended publication rule

### Optional

* History
* Google Maps URL
* Opening hours
* Entrance fee
* Price note
* Facilities
* Contact
* Additional images

### Coordinate Selection

The administrator may:

* Enter latitude and longitude manually
* Click a location on the map
* Drag a marker to adjust the location

The UI uses the label:

```text
Pilih lokasi pada peta
```

not GIS terminology.

Selecting a point updates both coordinate fields.

---

## 9.2 Tourism Package Form

```text
Identitas Paket
├── Name
├── Package type
├── Summary
└── Description

Durasi dan Harga
├── Duration value
├── Duration unit
├── Price
└── Price note

Fasilitas Paket
├── Included facilities
└── Souvenir

Tujuan dalam Paket
├── Destination selector
├── Ordered destination list
└── Package-specific notes

Media
├── Thumbnail
└── Gallery

Publikasi
├── Featured
├── Display order
├── Status
└── Preview
```

### Required for Publication

* Name
* Package type
* Positive duration
* Description
* At least one destination

### Not Included Without Schema Change

* Minimum participants
* Maximum participants
* Structured estimated time per stop
* Structured activity per stop

---

## 9.3 Traditional House Form

```text
Informasi Dasar
├── Name
├── Summary
└── Description

Informasi Budaya
├── History
├── Cultural significance
└── Visitor information

Lokasi
├── Location name
├── Latitude
├── Longitude
├── Location picker
└── Google Maps URL

Media
├── Thumbnail
└── Gallery

Publikasi
├── Featured
├── Display order
├── Status
└── Preview
```

Coordinates are optional because not every traditional house needs a public marker.

The form supports map picking and manual latitude/longitude entry. The administrator verifies suitability before direct publication; there is no approval queue.

---

## 9.4 Cultural Article Form

```text
Informasi Artikel
├── Title
├── Summary
├── Article category
└── Content

Verifikasi Sumber
└── Source note

Media
├── Thumbnail
└── Supporting images

Publikasi
├── Featured
├── Status
└── Preview
```

`source_note` is visible only in the dashboard unless explicitly approved for public display.

Draft content may contain internal collection notes.

Placeholder text must never become public.

---

## 9.5 Customary Institution Article Form

```text
Informasi Artikel
├── Title
├── Summary
└── Content

Informasi Pranata
├── Institution name
├── Institution role
└── Historical context

Verifikasi
└── Source note

Media
├── Thumbnail
└── Supporting images

Publikasi
├── Featured
├── Status
└── Preview
```

The publication section must display a warning:

```text
Pastikan informasi telah diverifikasi oleh sumber adat atau pihak desa yang berwenang sebelum diterbitkan.
```

This is a verification reminder, not an approval workflow.

---

## 9.6 Cultural Event Form

```text
Informasi Event
├── Title
├── Summary
├── Description
└── Event type

Waktu
├── Start date and time
├── End date and time
└── Date note

Lokasi
├── Location name
├── Address
├── Latitude
├── Longitude
├── Location picker
└── Google Maps URL

Penyelenggara
├── Organizer
├── Contact phone
├── Publication consent confirmation
└── Visitor information

Media
├── Thumbnail
└── Event gallery

Publikasi
├── Featured
├── Status
└── Preview
```

### Date Rules

* End date cannot precede start date.
* Exact date fields may remain empty when `date_note` explains that the schedule is unconfirmed.
* The public preview must show exactly how the date will appear.
* No recurring-event controls are provided.
* Known placeholder text in any event publication field blocks publication.

---

## 9.7 Homestay Form

```text
Informasi Dasar
├── Name
├── Owner name
├── Phone
├── Publication consent confirmation
└── Description

Harga dan Fasilitas
├── Price per night
├── Price note
└── Facilities

Lokasi
├── Address
├── Latitude
├── Longitude
├── Location picker
└── Google Maps URL

Media
├── Thumbnail
└── Gallery

Publikasi
├── Featured
├── Display order
├── Status
└── Preview
```

No availability or room-inventory fields are shown.

The location section supports map picking and manual latitude/longitude entry. Price per night uses the shared numeric rupiah behavior, and `price_note` is optional.

---

## 9.8 UMKM Form

```text
Informasi Usaha
├── Business name
├── Owner name
├── Category
└── Description

Lokasi
├── Address
├── Latitude
├── Longitude
├── Location picker
└── Google Maps URL

Kontak
├── Contact name
├── Phone
├── WhatsApp
└── Publication consent confirmation

Media
├── Thumbnail
└── Gallery

Publikasi
├── Featured
├── Display order
├── Status
└── Preview
```

At least one contact method or location is required for publication.

The location section supports map picking and manual latitude/longitude entry. When the record is UMKM Tenun, it uses the Kampung Adat coordinate pair and combined public marker.

---

## 9.9 Village Profile Form

```text
Identitas Desa
├── Name
├── Summary
└── Description

Profil
├── History
├── Vision
└── Mission

Lokasi
├── Address
├── Latitude
├── Longitude
└── Google Maps URL

Publikasi
├── Status
└── Preview
```

The application treats this as a singleton form.

No “Create another village profile” action is shown in normal use.

---

## 9.10 Repeatable Fields

Facilities and similar list inputs use repeatable text rows.

Controls:

* Add item
* Edit item
* Remove item
* Reorder when order affects public display

Empty strings are removed before submission.

The interface uses labels such as:

```text
Tambah fasilitas
```

not array or JSON terminology.

---

## 9.11 Upload Failure Behavior

When an image upload fails:

* Preserve all text form values.
* Preserve already uploaded successful images.
* Identify the failed filename.
* Allow retry for that file.
* Do not submit a database image record for the failed object.
* Do not silently continue with a missing thumbnail when publication requires one.

---

# 10. Tourism Package Design

## 10.1 Admin Flow

```text
Create Package Draft
        |
        v
Enter Package Identity
        |
        v
Set Type, Duration, and Price
        |
        v
Add Included Facilities and Souvenir
        |
        v
Select Destinations
        |
        v
Reorder Destination Sequence
        |
        v
Add Package-Specific Notes
        |
        v
Upload Media
        |
        v
Preview
        |
        v
Publish When Authorized
```

---

## 10.2 Package Type

Controlled values:

* Budget
* Standard
* Premium

Application values must map to the database-approved values:

```text
budget
standard
premium
```

Administrators do not create arbitrary package types in Version 1.

---

## 10.3 Destination Selection

The selector shows only:

* Non-archived destinations
* Destination name
* Category
* Publication status

Draft destinations may be selected while editing a draft package.

A package cannot be published while it references unpublished or deleted destinations.

---

## 10.4 Ordering

Selected destinations appear in an ordered list.

Supported actions:

* Move up
* Move down
* Drag to reorder on devices where practical
* Remove from package
* Add package-specific note

Keyboard-accessible move controls are required even when drag-and-drop exists.

Order is stored in `package_destinations.display_order`.

---

## 10.5 Validation

The package form must reject:

* Duplicate destination selection
* Empty published package
* Zero or negative duration
* Negative price
* Deleted destination
* Unpublished destination during package publication
* Duplicate display order after normalization

Display order is normalized before submission.

---

## 10.6 Public Presentation

The public detail page shows an ordered sequence:

```text
Stop 1
Destination name
Package-specific note

Stop 2
Destination name
Package-specific note
```

The interface may use “urutan kunjungan” or “rangkaian destinasi”.

It must not claim:

* Fastest route
* Shortest route
* Calculated travel duration
* Optimized navigation

---

## 10.7 Package Map

The map displays included destination markers.

Marker numbering follows package order.

Optional straight lines between markers may only be used when clearly labeled as sequence visualization, not road routing. The safer Version 1 recommendation is markers without connecting lines.

---

# 11. Culture and Customary Content Design

## 11.1 Content Separation

| Content type                  | Application responsibility                                                 |
| ----------------------------- | -------------------------------------------------------------------------- |
| Cultural article              | General cultural knowledge and traditions                                  |
| Customary institution article | Bayan customary institution structure, role, and history                   |
| Traditional house             | House-specific history, significance, visitor rules, and optional location |
| Cultural event                | Time-bound event occurrence                                                |

These types must have separate:

* Admin routes
* Forms
* Queries
* Detail components
* Validation schemas
* Public navigation labels

---

## 11.2 Verification State

The database publication model contains:

* Draft
* Published
* Archived

There is no separate verified-status column.

Therefore:

* Draft represents unverified or incomplete editorial work.
* Published means the authorized publishing workflow considers the content suitable for public display.
* The application must not visually claim a formal verification state not represented in the approved data model.

For culturally sensitive content, the publish confirmation must ask the authorized user to confirm that source checking has been completed.

---

## 11.3 Draft Placeholders

Administrators may save incomplete draft content.

Rules:

* Drafts may contain internal placeholder text.
* Preview must show a visible “Draft Preview” banner.
* Public queries never return drafts.
* Placeholder patterns such as `Lorem ipsum`, `TBD`, or `Isi nanti` must block publication.

This publication validation is application-level and should be mirrored by editorial procedure.

---

## 11.4 Source and Interview Notes

Supported in the schema for:

* Cultural articles
* Customary institution articles

`source_note` may contain:

* Interview source
* Document reference
* Date of information collection
* Internal verification note

It is administrative content by default.

It must not appear publicly unless a product decision explicitly approves source display.

Traditional houses do not currently have a dedicated source-note field. The application must not invent one.

---

## 11.5 Traditional Houses Versus Destinations

A traditional house may be culturally visitable, but its primary record remains `traditional_houses`.

It differs from a general destination because it owns:

* Cultural significance
* House-specific history
* Visitor rules
* Optional public coordinate visibility

The application must not duplicate the same house as both a destination and traditional-house record unless the product requirements explicitly define why both records are necessary and how they relate.

The current schema has no direct relationship between them.

---

## 11.6 Event Dates

### Confirmed Date

Show localized start and end times.

### Unconfirmed Date

When `start_at` is empty and `date_note` exists, display:

```text
Jadwal belum dikonfirmasi
```

followed by the approved date note.

### No Date and No Note

The event must remain draft.

### Recurring Event

Each occurrence is entered separately in Version 1.

Historical event descriptions may remain archived or published as documentation according to the PRD, but the page must distinguish past events from upcoming events.

---

# 12. Media Management Design

## 12.1 Upload Workflow

```text
Admin selects image
        |
        v
Browser checks format, dimensions, and size
        |
        v
Browser compresses when appropriate
        |
        v
Authenticated upload to Supabase Storage
        |
        v
Server mutation saves media metadata
        |
        v
Image appears in form preview
```

---

## 12.2 Approved Formats

Accepted input:

* WebP
* JPEG
* PNG only when transparency or source characteristics require it

Preferred stored output:

* WebP for photographs
* PNG only for approved transparency requirements

Animated images are excluded unless explicitly approved.

SVG upload by administrators is excluded because of script and sanitization risk.

---

## 12.3 Provisional Limits

The values below remain a design proposal. They must not be implemented as authoritative limits until reconciled with `prd.md`, `rules.md`, the production service plan, and the Open Decisions table.

These are application defaults pending operational validation.

| Media use          | Recommended maximum dimensions | Recommended maximum stored size |                  Maximum count |
| ------------------ | -----------------------------: | ------------------------------: | -----------------------------: |
| Thumbnail          |                     1200 × 900 |                          800 KB |             1 selected primary |
| Gallery image      |                    1920 × 1440 |                          1.5 MB |                  12 per entity |
| Hero image         |                    2400 × 1350 |                            2 MB |                  1 active hero |
| Standalone gallery |                    1920 × 1440 |                          1.5 MB | Controlled by admin pagination |

Hard browser input limit before processing:

```text
10 MB per selected source file
```

Files above the input limit are rejected before upload.

These limits should be reviewed against the Supabase plan before production launch.

---

## 12.4 Compression

Browser compression should:

* Preserve reasonable visual quality
* Correct image orientation
* Reduce dimensions above the target
* Convert photographic JPEG or PNG input to WebP
* Avoid repeatedly recompressing an already optimized image unnecessarily

The administrator sees the resulting file size before upload where practical.

---

## 12.5 Storage Paths

Recommended deterministic structure:

```text
{entity_type}/{entity_id}/{image_id}-{normalized_filename}.webp
```

Examples:

```text
destinations/{destination_id}/{image_id}-lokok-bajo.webp
homestays/{homestay_id}/{image_id}-front-view.webp
```

The UUID prevents collisions.

Human-readable suffixes improve administration but are not treated as identifiers.

---

## 12.6 Upload Before Parent Creation

For new records, create the parent as a draft before uploading entity-owned images.

Flow:

1. Validate minimum identifying fields.
2. Create draft parent record.
3. Receive parent UUID.
4. Upload media into the deterministic parent path.
5. Save media associations.
6. Continue editing.

This avoids temporary storage paths with no stable owner.

---

## 12.7 Alt Text

Alt text is required for every public image record.

Guidance shown to administrators:

```text
Jelaskan isi gambar secara singkat untuk pengguna yang tidak dapat melihat gambar.
```

Avoid:

* File names
* “Image of”
* Unverified cultural interpretation

Decorative application assets are handled separately from managed content images.

---

## 12.8 Captions

Captions are optional.

Use captions for:

* Identifying a location
* Naming an activity
* Providing approved context
* Crediting a source when required

Captions do not replace alt text.

---

## 12.9 Image Ordering

Gallery images support:

* Move up
* Move down
* Drag reorder where practical
* Set as primary
* Remove association

Order updates are persisted as one controlled mutation.

---

## 12.10 Replacing Images

When replacing an image:

1. Upload and validate the new object.
2. Save new metadata.
3. Update primary or thumbnail references.
4. Confirm successful rendering.
5. Remove the previous metadata association.
6. Queue or perform safe deletion of the old storage object.

Never delete the old object before the replacement is confirmed.

---

## 12.11 Orphaned Files

An orphan is a Storage object without a valid database association.

Cleanup design:

* Do not delete immediately after a failed metadata write.
* Record or log suspected orphan path.
* Provide an admin-only maintenance view or controlled script.
* Delete only after a grace period and reference check.

Recommended grace period:

```text
7 days
```

This is an operational recommendation pending approval.

---

## 12.12 Missing Images

When a referenced file is unavailable:

* Render a local fallback placeholder.
* Log the missing path server-side.
* Do not expose the raw storage path publicly.
* Show an admin warning on the edit page.

---

## 12.13 Original Archives

Supabase Storage contains optimized website assets, not the only original archive.

The KKN team and village owner should retain original high-resolution files in an approved backup location outside the production bucket.

---

# 13. Authentication and Authorization Design

## 13.1 Login Flow

```text
Administrator opens /login
        |
        v
Submits email and password
        |
        v
Supabase Auth validates identity
        |
        v
Application verifies configured administrator identity
        |
        +-- identity does not match --> deny access and sign out
        |
        v
Redirect to /admin
```

---

## 13.2 Protected Route Handling

The `/admin` layout performs the primary route protection.

Behavior:

| Condition                                      | Result                                         |
| ---------------------------------------------- | ---------------------------------------------- |
| No session                                     | Redirect to `/login`                           |
| Session belongs to configured administrator    | Render dashboard                               |
| Session belongs to any other identity          | Deny, sign out, and log configuration mismatch |

Individual mutations repeat authorization checks.

---

## 13.3 Administrator Responsibilities

The single administrator may:

* Create and edit content
* Save drafts and preview
* Publish content
* Archive content
* Restore archived content to draft
* Upload and manage media
* Select a fixed destination category
* Manage additional contacts and approved settings

The administrator cannot manage destination categories, users, roles, invitations, approval queues, or permanent deletion because those functions do not exist in Version 1.

---

## 13.4 Session Refresh

The Next.js Supabase session integration must refresh authentication cookies through the approved Next.js 16 `proxy.ts` and server-client pattern.

Expired sessions result in:

* Preservation of unsaved browser form state where possible
* Redirect to login
* Return path back to the relevant admin page after successful login

Sensitive form submissions must not be retried automatically after session expiration without user confirmation.

---

## 13.5 Logout

Logout must:

* End the Supabase session
* Clear application authentication state
* Redirect to `/login`
* Prevent returning to protected cached pages through browser navigation

---

## 13.6 Administrator Account Replacement

There is no account-management UI. Replacing the administrator account is an operational Supabase procedure. The configured identity must be updated through the approved deployment/database mechanism, the previous identity must lose access, and existing content and audit UUIDs must remain intact.

---

## 13.7 Authorization Layers

Authorization is enforced at:

1. Navigation presentation
2. Protected layouts and pages
3. Server Actions
4. Data-access functions
5. Supabase Row Level Security
6. Storage policies

Hiding a button is never considered sufficient authorization.

---

# 14. Validation Design

Validation operates at three levels.

---

## 14.1 Client-Side Usability Validation

Purpose:

* Provide immediate feedback
* Prevent avoidable submission
* Help non-technical administrators correct fields

Examples:

* Required title
* Invalid URL format
* Negative price
* Missing coordinate pair
* Oversized image
* Unsupported file type
* End date before start date

Client validation is not a security boundary.

---

## 14.2 Server-Side Application Validation

Every mutation revalidates input with Zod.

Server validation handles:

* Required publication fields
* Administrator identity verification
* Slug format
* Coordinate ranges
* Price constraints
* Package destination uniqueness
* Event date order
* Valid publication transitions
* Parent-child relationship checks
* Placeholder-content publication blocking

The server does not trust browser validation results.

---

## 14.3 Database Constraints and RLS

Database constraints enforce persistent integrity.

Examples already defined by `schema.md`:

* Unique slugs
* Coordinate ranges
* Coordinate pair consistency
* Non-negative values
* Valid foreign keys
* Unique package-destination association
* One primary image per parent
* Valid authorization policies

---

## 14.4 Why All Three Are Required

| Layer              | Protects against                                        |
| ------------------ | ------------------------------------------------------- |
| Client             | User mistakes and poor form experience                  |
| Server application | Bypassed clients and business-rule violations           |
| Database and RLS   | Invalid persistent state and unauthorized direct access |

No one layer replaces the others.

---

## 14.5 Validation Examples

### Coordinates

* Latitude: `-90` to `90`
* Longitude: `-180` to `180`
* Both present or both absent
* Destination coordinates mandatory for publication

### Slug

* Lowercase
* Letters, numbers, and hyphens
* No leading or trailing hyphen
* Unique among applicable records
* Hidden from normal forms
* Immutable after first publication

### Prices

* Numeric
* `0` displays as free
* `null` displays as unavailable
* Positive values display as Indonesian rupiah
* Optional `price_note` supplies clarification
* No currency conversion

### Publication Status

Allowed values:

* Draft
* Published
* Archived

UI labels use Indonesian, while database values follow approved identifiers.

### Images

* Allowed type
* Valid file signature
* Within input size
* Within stored dimension and size target
* Alt text required
* Parent record exists

### Package Order

* No duplicate destination
* Consecutive normalized order
* At least one destination before publishing

---

# 15. State and Feedback Design

## 15.1 Initial Loading

Public pages use route-level skeletons only for content that cannot render immediately.

Avoid full-page spinners.

Admin lists may show:

* Header immediately
* Table skeleton
* Disabled controls until data loads

Leaflet map loading uses a fixed-size map placeholder to prevent layout shift.

---

## 15.2 Form Submission

During submission:

* Disable the submitted action
* Show the action text, such as `Menyimpan...`
* Prevent duplicate submission
* Preserve field values
* Keep unrelated navigation available only when safe

---

## 15.3 Successful Save

Messages identify the result:

* “Destinasi disimpan sebagai draft.”
* “Perubahan destinasi berhasil disimpan.”
* “Artikel berhasil diterbitkan.”
* “Urutan destinasi dalam paket berhasil diperbarui.”

After success:

* Refresh affected admin data
* Revalidate public content when publication changed
* Keep the user on the edit page or return to list according to the action

---

## 15.4 Validation Failure

Behavior:

* Show a form-level summary
* Focus the first invalid field
* Show field-specific messages
* Preserve entered data
* Do not clear uploaded successful media

Example:

```text
Destinasi belum dapat diterbitkan. Lengkapi ringkasan, deskripsi, koordinat, dan gambar utama.
```

---

## 15.5 Supabase Failure

Messages must identify the failed operation.

Examples:

* “Daftar destinasi belum dapat dimuat dari server.”
* “Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.”
* “Status publikasi belum berubah. Konten masih berstatus draft.”

Do not show database error codes to users.

---

## 15.6 Image Upload Failure

Show:

* Failed filename
* Cause category when known
* Retry action
* Remove action

Example:

```text
foto-rumah-adat.jpg belum berhasil diunggah karena ukurannya melebihi batas setelah diproses.
```

---

## 15.7 Empty Lists

Examples:

* “Belum ada paket wisata.”
* “Belum ada artikel pranata adat.”
* “Belum ada gambar pada galeri.”

Admin empty states include the next valid action when authorized.

---

## 15.8 No Search Results

Example:

```text
Tidak ada destinasi yang cocok dengan pencarian “lokok”.
```

Provide a clear filter-reset action.

---

## 15.9 Unavailable Public Content

For a missing or unpublished slug:

* Return `404`
* Show a public not-found page
* Do not reveal that a draft record exists

---

## 15.10 Offline or Unstable Connection

For browser interactions:

* Preserve form state
* Show connection warning
* Do not claim a save succeeded
* Allow explicit retry
* Avoid automatic repeated uploads

Public pages may show previously browser-cached assets, but the application must not claim full offline support.

---

## 15.11 Destructive Confirmation

Archive confirmation states:

* What will be archived
* That it disappears publicly
* That it can be restored by an authorized administrator

User deactivation confirmation states:

* The user loses dashboard access
* Existing content and audit history remain

---

## 15.12 Session Expiration

Example message:

```text
Sesi Anda telah berakhir. Masuk kembali untuk melanjutkan.
```

When possible, preserve unsaved form state locally for the current browser session.

Do not store sensitive administrative form content indefinitely in browser storage.

---

# 16. Error Handling and Logging

## 16.1 User-Facing Errors

User-facing errors must:

* Use Indonesian
* Identify the operation
* Explain the current state
* Provide the next step
* Avoid technical internals

Bad:

```text
Something went wrong.
```

Preferred:

```text
Gambar belum berhasil disimpan. Data teks tetap tersimpan sebagai draft. Coba unggah gambar kembali.
```

---

## 16.2 Server-Side Logging

Log:

* Error category
* Route or action
* Feature
* Authenticated user ID where appropriate
* Record ID
* Safe Supabase error code
* Timestamp
* Correlation identifier where implemented

Do not log:

* Passwords
* Tokens
* Secret keys
* Full private contact data
* Raw uploaded file contents
* Complete cultural draft text unless essential for debugging

---

## 16.3 Development Logs

Development may include:

* Stack traces
* Validation diagnostics
* Supabase response details
* Query timing

These must not be exposed in production responses.

---

## 16.4 Production-Safe Errors

Production responses expose:

* Stable application error category
* Human-readable message
* Retry guidance
* Optional reference code

They do not expose:

* SQL details
* Table internals
* Storage credentials
* Stack traces
* Policy definitions

---

## 16.5 Unexpected Supabase Failures

Public page:

* Render available static layout
* Show section-level failure where possible
* Avoid failing the entire homepage because one optional section fails

Admin mutation:

* Treat operation as failed unless confirmed
* Preserve form data
* Do not optimistically mark as saved
* Log the failure

---

## 16.6 Missing Images

Public:

* Display local fallback
* Preserve page layout
* Keep alt behavior appropriate

Admin:

* Show missing-file warning
* Provide replacement action
* Log the storage path internally

---

## 16.7 Invalid Map Data

* Exclude invalid marker
* Keep textual destination accessible
* Log the record ID
* Show admin validation warning
* Do not center the map at coordinate `0,0`

---

## 16.8 Not-Found Pages

Entity detail routes use not-found behavior when:

* Slug does not exist
* Record is not published
* Parent publication rules fail

The public page must not distinguish these cases.

---

# 17. Accessibility

Minimum requirements:

## 17.1 Structure

* Semantic `header`, `nav`, `main`, `section`, and `footer`
* One primary page heading
* Logical heading order
* Skip-to-content link

## 17.2 Keyboard Access

All actions must be usable without a pointer:

* Navigation
* Filters
* Dialogs
* Forms
* Image controls
* Package ordering
* Lightbox
* Map alternatives

Leaflet itself is not the only location interface.

## 17.3 Focus

* Visible focus indicator
* Focus moves into opened dialog
* Focus returns to trigger after dialog closes
* Validation failure focuses the first invalid field

## 17.4 Forms

* Every field has a visible label
* Helper text is associated with the input
* Error messages use accessible relationships
* Required fields are identified in text, not only color
* Grouped fields use fieldset and legend where appropriate

## 17.5 Images

* Managed content images require meaningful alt text
* Captions do not replace alt text
* Decorative visual assets use empty alt text

## 17.6 Contrast

Text, controls, status badges, and focus states must meet appropriate contrast levels.

Publication status must not rely only on color.

## 17.7 Modals

* Accessible name
* Focus trap
* Escape key support where safe
* Explicit close button
* Background interaction disabled

## 17.8 Reduced Motion

Respect reduced-motion preferences for:

* Navigation transitions
* Carousels
* Modal animation
* Map-related animated movement where possible

## 17.9 Map Alternative

The destination list must expose:

* Destination name
* Category
* Detail page
* External map link when available

Users must be able to access all destination content without interacting with Leaflet.

---

# 18. Responsive Design

## 18.1 Breakpoints

```text
Mobile: below 768px
Tablet: 768px–1023px
Desktop: 1024px and above
```

These breakpoints guide layout behavior, not device detection.

---

## 18.2 Public Navigation

### Mobile

* Collapsible navigation
* Full-width touch targets
* Subsections grouped clearly
* No hover-dependent menus

### Tablet

* Compact navigation or expandable menu depending on available width

### Desktop

* Horizontal primary navigation
* Culture submenu where appropriate

---

## 18.3 Map

| Device  | Behavior                                                 |
| ------- | -------------------------------------------------------- |
| Mobile  | Tall single-column map, filters above or in bottom sheet |
| Tablet  | Map with compact filter panel                            |
| Desktop | Map with optional side list                              |

Popup dimensions must not exceed viewport width.

---

## 18.4 Destination Cards

* Mobile: one column or controlled horizontal preview
* Tablet: two columns
* Desktop: three or four columns depending on content width

Card height must not depend on identical summary lengths.

---

## 18.5 Package Comparison

Do not use a wide comparison table on mobile.

Use:

* Stacked package cards
* Clearly labeled type, duration, and price
* Separate detail pages

---

## 18.6 Admin Tables

Mobile behavior:

* Convert simple tables to cards, or
* Use controlled horizontal scrolling for data that must retain columns

Row actions must remain visible without hover.

---

## 18.7 Forms

### Mobile

* Single column
* Full-width inputs
* Sticky or clearly reachable save actions
* Location picker below coordinate fields

### Tablet

* Primarily single column
* Two-column rows only for paired values, such as latitude and longitude

### Desktop

* Two columns only where related fields benefit
* Long text editors remain full width

Complex forms must not become dense multi-column grids.

---

## 18.8 Image Galleries

* Mobile: two-column thumbnails
* Tablet: three columns
* Desktop: four or more depending on available width

Ordering controls remain keyboard and touch accessible.

---

## 18.9 Modal Behavior

On mobile, complex dialogs should become full-screen sheets or pages.

Destructive confirmations remain compact but must fit without horizontal scrolling.

---

# 19. SEO and Metadata Design

## 19.1 Route Metadata

Every public route defines:

* Page title
* Description
* Canonical URL
* Open Graph title
* Open Graph description
* Open Graph image when available

Admin and authentication routes use `noindex`.

---

## 19.2 Title Pattern

Recommended pattern:

```text
{Page or Entity Name} | Wisata Desa Karang Bajo
```

Homepage:

```text
Wisata Desa Karang Bajo
```

Exact public naming should be confirmed before launch.

---

## 19.3 Descriptions

Metadata descriptions use:

* Published summaries
* Short approved village information
* Confirmed event details

They must not:

* Add unverified cultural claims
* Invent superlatives
* Claim official historical facts not present in approved content

---

## 19.4 Open Graph Images

Priority:

1. Selected thumbnail
2. Primary gallery image
3. Approved site-wide fallback image

Missing Supabase media falls back to a bundled application image.

---

## 19.5 Canonical URLs

Canonical URLs use the production domain and stable slug route.

Draft preview URLs must not become canonical.

---

## 19.6 Sitemap

The sitemap includes only:

* Public static routes
* Published destinations
* Published packages
* Published traditional houses
* Published cultural articles
* Published customary institution articles
* Published events
* Published homestays
* Published UMKM

Admin, auth, preview, draft, and archived routes are excluded.

---

## 19.7 Robots

* Public content may be indexed.
* `/admin`
* `/login`
* `/lupa-password`
* `/reset-password`
* Auth callback
* Preview routes

must not be indexed.

---

## 19.8 Structured Data

Appropriate structured data may include:

* `TouristAttraction` for destinations when fields are accurate
* `Event` for confirmed cultural events
* `LodgingBusiness` for homestays when published information is sufficient
* `LocalBusiness` for UMKM where appropriate
* `BreadcrumbList`

Do not generate event structured data with fabricated dates.

Do not emit incomplete or misleading schema markup.

---

# 20. Caching and Data Freshness

## 20.1 Public Content

Public pages may use Next.js caching with controlled revalidation.

Recommended baseline:

```text
Revalidate every 1 hour
```

Suitable for:

* Homepage
* Public list pages
* Public detail pages
* Public map data

Tourism content does not require second-level freshness.

---

## 20.2 Admin Content

Admin pages must request current data.

Admin queries should not use long-lived public caching.

After mutation:

* Refresh current admin route
* Invalidate affected public route data when publication-visible content changes

---

## 20.3 On-Demand Revalidation

On-demand revalidation is recommended for:

* Publishing
* Returning published content to draft
* Archiving
* Updating published content
* Changing primary image
* Reordering published content
* Updating public contacts or settings

Affected paths should be revalidated by feature.

Example:

Publishing a destination affects:

* `/`
* `/destinasi`
* `/destinasi/[slug]`
* `/peta-wisata`
* Related package pages

---

## 20.4 Stale Content Control

The mutation result must distinguish:

* Database save succeeded
* Public cache invalidation succeeded
* Public cache invalidation failed

If invalidation fails after the data save:

* Do not roll back valid content automatically.
* Log the failure.
* Show the administrator that publication succeeded but may take until scheduled revalidation to appear.

---

## 20.5 Avoided Complexity

Version 1 does not use:

* Redis caching
* Distributed cache invalidation
* Background cache workers
* Client-side global query cache as the primary data layer

---

# 21. Testing Design

## 21.1 Unit Tests

Required targets:

* Zod validation schemas
* Slug normalization
* Coordinate validation
* Publication eligibility rules
* Price and duration validation
* Event date validation
* Map-row mapping
* Storage-path generation
* Supabase error mapping
* Package order normalization

---

## 21.2 Integration Tests

Required flows:

* Public queries return only published records
* Admin queries reject unauthenticated access
* Any identity other than the configured administrator cannot access admin data or mutations
* Destination create and update
* Publication validation
* Archive behavior
* Restore returns archived content to draft
* Image metadata association
* Primary-image synchronization
* Package-destination uniqueness
* Package-stop ordering
* Event date-note behavior
* Password recovery callback handling

Tests should use a dedicated non-production Supabase environment where practical.

---

## 21.3 End-to-End Tests

Critical flows:

1. Admin login
2. Failed login
3. Password recovery
4. Create destination draft
5. Edit destination
6. Select coordinates on map
7. Upload destination image
8. Publish destination as the administrator
9. Destination appears on public list
10. Destination detail loads
11. Map marker opens the correct popup, including combined co-located records
12. Google Maps link is available when configured
13. Create package
14. Add multiple destinations
15. Reorder package destinations
16. Publish package
17. Package order appears publicly
18. Create cultural article draft
19. Archive published content
20. Archived content disappears publicly
21. Restore archived content to draft
22. Event placeholder content cannot be published
23. UMKM Tenun and Kampung Adat use one combined marker
24. Logout
25. Protected route redirects after logout

---

## 21.4 Manual Village-Officer Acceptance Testing

At least one authorized village officer should test:

* Login
* Creating a destination
* Editing text
* Selecting coordinates
* Uploading and reordering images
* Saving a draft
* Previewing content
* Publishing, if authorized
* Finding and editing an existing record
* Archiving a record
* Understanding validation messages
* Using the dashboard on a phone

Acceptance criteria should focus on whether the officer can complete tasks without developer assistance.

Observed confusion must result in interface or helper-text revision before handover.

---

## 21.5 Testing Boundaries

Version 1 does not require:

* Large-scale load simulation
* Multi-region failure testing
* Complex contract-test infrastructure
* Cross-browser testing on obsolete browsers

Minimum browser coverage should include current versions of:

* Chrome or Edge
* Safari on iPhone
* Android Chrome

---

# 22. Initial Data Migration

## 22.1 Migration Flow

```text
QGIS
  |
  v
GeoJSON Export
  |
  v
Validation Script
  |
  v
Field Mapping
  |
  v
Supabase Insert
  |
  v
Manual Dashboard Review
  |
  v
Publish
```

---

## 22.2 QGIS Export

QGIS exports reviewed destination points as GeoJSON.

Exported data should include, where available:

* Source identifier
* Destination name
* Category label
* Coordinates
* Source notes
* Existing description references

QGIS remains the source of initial coordinate validation, not public content publication.

---

## 22.3 Coordinate Order

GeoJSON coordinates use:

```text
[longitude, latitude]
```

Database columns use:

```text
latitude
longitude
```

The import script must explicitly reverse the GeoJSON array into named database fields.

It must never infer coordinate order from numeric appearance alone.

---

## 22.4 Validation Script

The import script validates:

* Geometry type is Point
* Coordinate array has two numeric values
* Longitude is `-180` to `180`
* Latitude is `-90` to `90`
* Name is present
* Category can be mapped
* Slug can be generated
* Duplicate candidates are reported
* Unknown fields are preserved in an import report, not silently discarded

---

## 22.5 Duplicate Prevention

Duplicate checks use a combination of:

* Normalized name
* Existing slug
* Coordinate proximity for review
* Existing external source identifier when available

The script must not automatically merge records based only on nearby coordinates.

Potential duplicates are skipped or inserted only after manual confirmation.

---

## 22.6 Slug Mapping

Slugs are generated from the destination name.

When a slug conflicts:

* The script does not invent an arbitrary suffix silently.
* It records the conflict.
* An administrator or migration operator resolves the final slug.

---

## 22.7 Category Mapping

QGIS category labels map to existing `destination_categories`.

Unknown categories:

* Are reported
* Do not create arbitrary production categories automatically
* Require category review before import

---

## 22.8 Missing Fields

Imported records may lack:

* Summary
* Description
* History
* Opening hours
* Entrance fee
* Facilities
* Contact
* Images

Missing optional fields remain empty.

Missing publication-required content prevents publication but not draft import.

---

## 22.9 Initial Status

Every imported destination starts as:

```text
draft
```

Reasons:

* Coordinate validity does not guarantee editorial validity.
* Imported descriptions may be incomplete.
* Images may not yet be associated.
* Category mapping may need review.
* Village officers should approve the public record.

---

## 22.10 Import Report

The script must produce a report containing:

* Imported count
* Skipped count
* Validation failures
* Duplicate candidates
* Unknown categories
* Generated slugs
* Record IDs created
* Source-file identifier

---

## 22.11 Post-Import Review

Village officers review imported records through the dashboard.

Required review:

* Name
* Category
* Coordinate placement
* Summary
* Description
* Visitor information
* Images
* Publication status

---

## 22.12 QGIS After Migration

After initial import:

* Daily coordinate updates occur through the dashboard.
* QGIS is used only for occasional external validation or new batch preparation.
* QGIS does not connect directly to the production content workflow.
* The website always reads Supabase data.

---

# 23. Implementation Order

## 23.1 Phase 1 — Project Setup

Establish:

* Next.js App Router
* TypeScript
* Linting and formatting
* Base environment validation
* Route groups
* Repository conventions

Dependency:

Everything else requires a stable application foundation.

---

## 23.2 Phase 2 — Supabase Clients and Environment Configuration

Implement:

* Server client
* Browser client
* Session integration
* Environment validation
* Error normalization foundation

Dependency:

Authentication and data access depend on centralized Supabase access.

---

## 23.3 Phase 3 — Database Migrations and RLS

Translate `schema.md` into:

* Tables
* Constraints
* Indexes
* RLS
* Storage policies
* Seed fixed destination categories

Dependency:

Feature development requires stable data contracts.

Schema conflicts identified in this document must be resolved before adding unsupported form fields.

---

## 23.4 Phase 4 — Authentication

Implement:

* Login
* Logout
* Password recovery
* Callback
* Protected admin layout
* Configured administrator identity check

Dependency:

Admin CRUD should not be developed against temporary authorization.

---

## 23.5 Phase 5 — Shared Layout and UI Foundation

Implement:

* Public shell
* Admin shell
* Navigation
* Breadcrumbs
* Form primitives
* Dialogs
* Status badges
* Loading and error patterns
* Responsive containers

Dependency:

Feature interfaces require consistent reusable patterns.

---

## 23.6 Phase 6 — Destination Data Access

Implement first complete feature data layer:

* Public destination queries
* Admin queries
* Mappers
* Validation schemas
* Mutation foundation

Reason:

Destinations exercise content, coordinates, images, categories, publication, and map requirements.

---

## 23.7 Phase 7 — Public Destination List and Detail

Implement:

* `/destinasi`
* `/destinasi/[slug]`
* Metadata
* Empty and not-found states
* Published-only queries

Dependency:

Provides public rendering foundation before map integration.

---

## 23.8 Phase 8 — Leaflet Map

Implement:

* Map module
* Marker styles
* Filters
* Popup summaries
* Bounds
* Invalid coordinate handling
* `/peta-wisata`
* Destination, traditional-house, homestay, and visitable-UMKM markers
* Combined marker groups for identical coordinate pairs

Dependency:

Uses the established destination data contract.

---

## 23.9 Phase 9 — Destination Admin CRUD

Implement:

* Fixed category selection
* Destination list
* Create
* Edit
* Draft
* Preview
* Publish
* Archive
* Coordinate picker
* Manual latitude and longitude entry

Dependency:

Authentication, schema, public rendering, and map behavior are already stable.

---

## 23.10 Phase 10 — Storage and Image Upload

Implement:

* Media validation
* Compression
* Direct authenticated upload
* Metadata association
* Image ordering
* Primary image
* Thumbnail synchronization
* Missing and orphan handling

Dependency:

Destination CRUD provides the first parent entity for end-to-end testing.

---

## 23.11 Phase 11 — Packages and Package Destinations

Implement:

* Package queries
* Package form
* Ordered destination selector
* Public list and detail
* Package map only if the remaining scope decision makes it mandatory

Do not add unsupported participant or stop-timing fields.

---

## 23.12 Phase 12 — Culture and Customary Content

Implement separately:

* Cultural articles
* Customary institution articles
* Traditional houses
* Verification warnings
* Source-note admin handling
* Public detail pages

Reason:

These features require careful editorial boundaries and must not be generalized into one content table.

---

## 23.13 Phase 13 — Events

Implement:

* Individual event occurrences
* Confirmed and unconfirmed date behavior
* Upcoming and past lists
* Event map
* Public metadata

---

## 23.14 Phase 14 — Homestays and UMKM

Implement:

* Public and admin flows
* Coordinates
* Contact actions
* Media galleries
* Informational prices
* Publication-consent controls
* UMKM Tenun and Kampung Adat marker grouping

No booking, inventory, or commerce behavior.

---

## 23.15 Phase 15 — Village Profile, Gallery, Contacts, and Settings

Implement:

* Singleton profile editor
* Standalone gallery
* Additional contact ordering
* Controlled settings with central WhatsApp number
* Homepage composition

Homepage is completed after its source features exist.

---

## 23.16 Phase 16 — Testing

Execute:

* Unit tests
* Integration tests
* End-to-end tests
* Mobile browser testing
* Accessibility checks
* Village-officer acceptance testing

---

## 23.17 Phase 17 — Deployment

Prepare:

* Production Supabase project
* Production Vercel project
* Environment variables
* Domain
* Storage buckets
* RLS review
* Backup test
* Monitoring and safe error logs

---

## 23.18 Phase 18 — Handover

Deliver:

* Administrator guide
* Account-ownership records
* Backup procedure
* Content editorial guide
* Media preparation guide
* Recovery contacts
* Training session
* Acceptance sign-off

---

# 24. Open Decisions

| Decision                                 | Current risk                                                         | Recommendation                                                                                     | Status           |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| Facilities representation and display    | Schema still permits array or JSON and display rules are not final   | Choose one storage representation; display only entered non-empty values                            | Pending approval |
| Supabase region                          | Latency and data residency depend on region                          | Select the nearest available stable region to primary users before production creation             | Pending approval |
| Environment topology                     | Local, development, preview, and production responsibilities are not final | Define the required Supabase and Vercel environments before Phase 2                            | Pending approval |
| Production account ownership             | Personal student accounts create handover risk                       | Use an official village or institution-controlled email as owner                                   | Pending approval |
| Backup procedure                         | Owner, frequency, retention, location, and restore testing are not final | Assign each operational responsibility before production                                       | Pending approval |
| Public database column exposure          | Row visibility does not protect private columns such as `source_note` | Choose column grants, public views, or server-only public access before RLS implementation          | Pending approval |
| Storage bucket visibility                | A public bucket can expose draft media by URL                        | Choose private/signed versus separated public/pending bucket strategy                               | Pending approval |
| Trusted upload validation boundary       | Browser-only validation can be bypassed                              | Choose the server or trusted-platform verification path before media implementation                 | Pending approval |
| Media dimensions, byte limits, and counts | Existing document recommendations differ and affect storage and validation | Approve one canonical media specification against the service plan                            | Pending approval |
| Published destination image requirement  | Fallback behavior and publication validation are not aligned         | Decide whether a primary image is required for publication                                         | Pending approval |
| Thumbnail and orphan synchronization     | Denormalized paths and failed uploads can drift                      | Finalize transaction and cleanup ownership before media implementation                              | Pending approval |
| Original media archive location          | Supabase optimized images are not sufficient archives                | Assign an external village-owned archive before handover                                           | Pending approval |
| Event time zone and uncertain-date classification | Upcoming/past classification can be wrong                     | Define time zone, all-day semantics, and classification for `date_note`-only events                 | Pending approval |
| Package-map requirement                  | PRD describes the map as optional while delivery plans treat it as required | Decide whether the Version 1 package map is mandatory                                          | Pending approval |
| Public search scope                      | PRD and page design do not agree on required public search           | Approve the pages that require search in Version 1                                                  | Pending approval |
| Site-settings key list                   | Only `primary_whatsapp_number` is fixed                              | Approve every additional editable key before migration                                             | Pending approval |
| Import provenance                        | Import reporting is required but persistent source fields are not defined | Decide report-only versus stored import batch/source metadata                                  | Pending approval |
| OpenStreetMap tile provider              | Production usage and availability depend on the selected endpoint    | Select and document the production tile provider and attribution terms                              | Pending approval |
| Next.js caching and invalidation          | Publication changes may remain stale or cause excessive reads         | Choose the Next.js 16 cache model and invalidation strategy                                         | Pending approval |
| Logging, monitoring, and retention        | Production failures may go unnoticed                                | Define operational logging destination, alerting, and retention                                    | Pending approval |
| Analytics                                | Not in approved architecture                                         | Exclude until privacy, ownership, and tool choice are approved                                     | Pending approval |
| Preview URL behavior                     | Draft preview may leak content                                       | Require authenticated preview and apply `noindex`                                                  | Pending approval |
| Administrator identity configuration     | RLS and the application need one stable way to identify the sole administrator UUID | Choose and document the secure deployment/database configuration mechanism before Phase 2 | Pending approval |

---

# 25. Final Implementation Checklist

## Routes

* [ ] Public route group created
* [ ] Auth route group created
* [ ] Protected admin route group created
* [ ] Culture article and customary institution routes remain separate
* [ ] Public detail routes return `404` for unpublished records
* [ ] Admin and auth routes use `noindex`

## Feature Modules

* [ ] Each domain has one explicit feature owner
* [ ] Queries, mutations, validation, mapping, and UI are separated
* [ ] No generic content abstraction replaces materially different entities
* [ ] No raw Supabase query exists in arbitrary UI components

## Authentication

* [ ] Login implemented with Supabase Auth
* [ ] Password recovery implemented
* [ ] Auth callback implemented
* [ ] Logout invalidates protected access
* [ ] Session refresh works
* [ ] Only the configured administrator identity is accepted

## Authorization

* [ ] Protected layouts verify the configured administrator identity
* [ ] Every mutation checks authorization
* [ ] RLS and Storage policies enforce the same boundaries
* [ ] No user, role, invitation, or approval-management route exists

## Data Access

* [ ] Server and browser Supabase clients are centralized
* [ ] Public queries return only published records
* [ ] Admin queries return current data
* [ ] Raw rows are mapped into application types
* [ ] Supabase errors are normalized
* [ ] Service-role credentials never reach browser code

## Forms

* [ ] React Hook Form used for interactive admin forms
* [ ] Zod validates client and server input
* [ ] Fields use Indonesian labels and helper text
* [ ] Slugs are generated, hidden, and immutable after first publication
* [ ] Unsaved-change warning implemented
* [ ] Publication validation differs from draft validation
* [ ] Unsupported package fields are not added without schema approval
* [ ] Coordinate forms provide map picking and manual latitude/longitude entry
* [ ] Per-entity contact fields require publication-consent confirmation

## Map

* [ ] Leaflet runs only in Client Components
* [ ] OpenStreetMap attribution is displayed
* [ ] Marker data is public-safe and minimal
* [ ] Invalid coordinates are excluded safely
* [ ] Bounds behavior is tested for zero, one, and many markers
* [ ] Mobile height and popup behavior are tested
* [ ] Mapped items provide a non-map alternative
* [ ] Google Maps links do not replace stored coordinates
* [ ] Destinations, traditional houses, homestays, and visitable UMKM are supported
* [ ] Identical coordinate pairs render one combined marker
* [ ] UMKM Tenun and Kampung Adat do not render overlapping markers

## Media

* [ ] Browser type and size checks implemented
* [ ] Images are compressed before upload
* [ ] Deterministic storage paths implemented
* [ ] Alt text is required
* [ ] Image ordering is accessible
* [ ] Primary image and thumbnail references stay synchronized
* [ ] Failed uploads do not clear form data
* [ ] Missing-image fallback exists
* [ ] Orphan cleanup procedure exists
* [ ] Original high-resolution archive owner is assigned

## Validation

* [ ] Coordinate ranges enforced
* [ ] Coordinate pairs enforced
* [ ] Unique slug conflicts handled clearly
* [ ] Prices enforce `0` free, `null` unavailable, positive Indonesian rupiah, and optional `price_note`
* [ ] Event end date cannot precede start date
* [ ] Package destinations cannot duplicate
* [ ] Publication status transitions are validated
* [ ] Placeholder content cannot be published, including event placeholders

## States and Errors

* [ ] Route loading states avoid layout shift
* [ ] Form submission prevents duplicate actions
* [ ] Save, publish, and archive messages are specific
* [ ] Empty and no-result states are distinct
* [ ] Session-expiration behavior is defined
* [ ] User-facing errors do not expose internals
* [ ] Server logs exclude secrets and sensitive content

## Accessibility

* [ ] Semantic landmarks implemented
* [ ] Keyboard navigation tested
* [ ] Visible focus states present
* [ ] Form errors associated with fields
* [ ] Dialog focus management works
* [ ] Reduced-motion preference respected
* [ ] Images have meaningful alt text
* [ ] Map information is available as text

## Responsive Design

* [ ] Public navigation tested below 768 px
* [ ] Admin forms remain single-column on mobile
* [ ] Admin tables convert safely or scroll deliberately
* [ ] Package cards do not require wide comparison tables
* [ ] Map controls remain touch accessible
* [ ] Galleries and modals fit small screens

## SEO

* [ ] Public metadata generated from published content
* [ ] Canonical URLs use production domain
* [ ] Open Graph fallback image exists
* [ ] Sitemap contains published content only
* [ ] Draft previews are excluded from indexing
* [ ] Event structured data requires confirmed dates

## Caching

* [ ] Public revalidation policy configured
* [ ] Admin data bypasses long-lived caching
* [ ] Publishing triggers affected route revalidation
* [ ] Cache invalidation failure is logged and communicated safely
* [ ] No unnecessary external cache service introduced

## Testing

* [ ] Validation unit tests complete
* [ ] Data mapper tests complete
* [ ] Auth integration tests complete
* [ ] CRUD integration tests complete
* [ ] Package ordering tests complete
* [ ] Critical E2E flows pass
* [ ] iPhone Safari and Android Chrome checked
* [ ] Village-officer acceptance test completed

## Migration

* [ ] QGIS source files backed up
* [ ] GeoJSON coordinate order handled correctly
* [ ] Duplicate detection report generated
* [ ] Unknown categories require review
* [ ] Imported records remain draft
* [ ] Manual coordinate and content review completed

## Deployment

* [ ] Production Supabase project configured
* [ ] Production Vercel project configured
* [ ] Environment variables validated
* [ ] RLS and Storage policies reviewed
* [ ] Domain ownership documented
* [ ] Production account ownership transferred
* [ ] Database restore tested
* [ ] Media backup tested

## Handover

* [ ] Administrator guide delivered
* [ ] Content-verification process documented
* [ ] Media preparation guide delivered
* [ ] Backup owner assigned
* [ ] Credential recovery documented
* [ ] Village officers trained
* [ ] Final access list reviewed
* [ ] Handover acceptance recorded
