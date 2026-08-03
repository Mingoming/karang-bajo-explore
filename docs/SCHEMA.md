# Database Schema

## 1. Document Purpose

This document defines the logical data model for the Karang Bajo Tourism Information System.

It specifies:

* Entities
* Columns
* Relationships
* Primary and foreign keys
* Constraints
* Indexes
* Nullability
* Default values
* Publication rules
* Audit fields
* Archive and restore behavior
* Content ownership boundaries
* Naming conventions

This document does not contain SQL, migration syntax, API definitions, or implementation code.

The model will later be translated into Supabase PostgreSQL migrations.

---

# 2. Database Philosophy

The database must remain understandable and maintainable after the initial development team is no longer involved.

The model follows these principles:

1. Keep entities aligned with real content concepts.
2. Avoid storing the same information in multiple places.
3. Use explicit foreign-key relationships.
4. Use normalized relationships where practical.
5. Avoid premature abstraction.
6. Store structured data in PostgreSQL and binary files in Supabase Storage.
7. Separate content types with different ownership or lifecycle rules.
8. Preserve publication history through audit fields and archiving; Version 1 has no permanent deletion.
9. Use predictable naming so developers and AI coding agents can understand the model.
10. Introduce additional tables only when they represent a meaningful domain responsibility.

---

# 3. Core Conventions

## 3.1 Primary Keys

Every table uses a UUID primary key named:

```text
id
```

UUIDs are preferred because they:

* Avoid predictable sequential identifiers
* Work well across distributed development environments
* Can be generated independently
* Reduce migration conflicts
* Match Supabase conventions

---

## 3.2 Table Naming

All table names use:

* `snake_case`
* Plural nouns

Examples:

```text
destinations
destination_images
tourism_packages
package_destinations
```

---

## 3.3 Column Naming

Columns use `snake_case`.

Foreign-key columns use the singular related entity name followed by `_id`.

Examples:

```text
category_id
destination_id
created_by
updated_by
```

---

## 3.4 Relationship Naming

Application-level relationships should use singular names for one related record and plural names for collections.

Examples:

```text
destination.category
destination.images
tourism_package.destinations
```

---

## 3.5 Date and Time

Date-time columns should use timezone-aware timestamps.

Standard audit timestamps are:

```text
created_at
updated_at
```

Event-specific dates are separate from auditing dates.

---

## 3.6 Publication Status

The standard publication status values are:

```text
draft
published
archived
```

Meaning:

* `draft`: visible only to authorized administrators
* `published`: eligible for display on the public website
* `archived`: retained in the database but removed from normal public presentation

Publication status should exist on public content entities whose visibility must be controlled.

All new managed records default to `draft`. The single administrator may publish, archive, and restore. Restore always changes `archived` to `draft`. No Version 1 table exposes permanent deletion as an application operation.

## 3.7 Public Slugs

Slug-bearing records use application-generated slugs. Slugs are not ordinary administrator input. A slug may be regenerated while a record has never been published, but after the first transition to `published` it is immutable, including after archive and restore.

## 3.8 Price Values

All Version 1 price fields use a non-negative numeric value with Indonesian-rupiah semantics:

* `0` means free.
* `null` means the price is unavailable.
* A positive value is an amount in Indonesian rupiah.

`price_note` is optional and contains visitor-facing clarification only.

---

# 4. Complete Entity Relationship Diagram

```text
+------------------+      +----------------------+    +----------------+
| village_profiles |      | destination_categories|    | site_settings  |
+--------+---------+      +----------+-----------+    +----------------+
         |                           |
         | 1                         | 1
         |                           |
         |                       many|
         |                           v
         |                  +----------------+
         |                  |  destinations  |
         |                  +--+----------+--+
         |                     |          |
         |                   1 |          | many
         |                     |          |
         |                     v          v
         |          +------------------+  +----------------------+
         |          |destination_images|  | package_destinations |
         |          +------------------+  +----------+-----------+
         |                                          |
         |                                          | many
         |                                          v
         |                                +-------------------+
         |                                | tourism_packages  |
         |                                +---------+---------+
         |                                          |
         |                                          | 1
         |                                          v
         |                                +-------------------+
         |                                |  package_images   |
         |                                +-------------------+
         |
         +-----------------------------+
         |                             |
         | 1                           | 1
         |                             |
         v                             v
+-------------------+        +-------------------+
|  cultural_events |        | traditional_houses|
+---------+---------+        +---------+---------+
          |                            |
          | 1                          | 1
          v                            v
+----------------------+      +--------------------------+
| cultural_event_images|      | traditional_house_images |
+----------------------+      +--------------------------+

+-------------------+        +-------------------------------+
| cultural_articles|        | customary_institution_articles|
+---------+---------+        +---------------+---------------+
          |                                  |
          | 1                                | 1
          v                                  v
+-----------------------+        +-----------------------------------+
|cultural_article_images|        |customary_institution_article_images|
+-----------------------+        +-----------------------------------+

+-------------+                 +----------------+
|  homestays  |                 |     umkms      |
+------+------+                 +--------+-------+
       |                                  |
       | 1                                | 1
       v                                  v
+-----------------+              +----------------+
| homestay_images |              |  umkm_images   |
+-----------------+              +----------------+

+-------------+
| gallery_items|
+-------------+

+----------+
| contacts |
+----------+
```

Audit relationships are omitted from the ERD for readability.

The following audit fields may reference the single Supabase Auth administrator identity:

```text
created_by
updated_by
```

---

# 5. Shared Content Columns

Unless explicitly stated otherwise, public content tables include:

| Column       | Purpose                            |
| ------------ | ---------------------------------- |
| `id`         | UUID primary key                   |
| `status`     | Publication state                  |
| `created_at` | Record creation timestamp          |
| `updated_at` | Most recent modification timestamp |
| `created_by` | User who created the record        |
| `updated_by` | User who last updated the record   |

The following tables should generally use these fields:

* `village_profiles`
* `destinations`
* `tourism_packages`
* `homestays`
* `umkms`
* `traditional_houses`
* `cultural_articles`
* `customary_institution_articles`
* `cultural_events`
* `gallery_items`
* `contacts`
* `site_settings`

Image association tables require creation auditing but generally do not require publication status because their visibility follows their parent content.

---

# 6. Authentication and Administrator Identity

Version 1 does not add application `users`, `roles`, or `user_roles` tables. Supabase Auth owns the single administrator identity and credentials.

The configured administrator Auth UUID is the only authenticated identity allowed by administrative RLS policies. Anonymous visitors receive only published public read access. Any other authenticated identity receives no dashboard or mutation access.

Content audit fields `created_by` and `updated_by` may reference `auth.users.id` for the administrator. Authentication secrets, role codes, invitation state, and account-management data are not application entities in Version 1.

Administrator identity configuration is stored as one nullable Auth UUID in `private.app_config`. The `private` schema is not exposed through the public Data API and grants no access to `anon` or `authenticated`. The reusable `public.is_admin()` function compares `auth.uid()` with that protected UUID, returns false for anonymous and all other authenticated identities, and uses a fixed secure `search_path`. The UUID remains unset until the real administrator Auth account exists.

The currently linked Supabase project is the development project. Production will use a separate Supabase project before final deployment.

---

# 7. Village Entity

## 7.1 `village_profiles`

### Purpose

Stores the official public profile of Desa Karang Bajo.

The initial production system supports one active village profile.

### Columns

| Column            | Description                  | Nullable | Default           |
| ----------------- | ---------------------------- | -------: | ----------------- |
| `id`              | Profile UUID                 |       No | None              |
| `name`            | Official village name        |       No | None              |
| `slug`            | Stable public URL identifier |       No | None              |
| `summary`         | Short village introduction   |      Yes | `null`            |
| `description`     | Main village profile content |      Yes | `null`            |
| `history`         | General village history      |      Yes | `null`            |
| `vision`          | Public village vision text   |      Yes | `null`            |
| `mission`         | Public village mission text  |      Yes | `null`            |
| `address`         | Official public address      |      Yes | `null`            |
| `latitude`        | Village reference latitude   |      Yes | `null`            |
| `longitude`       | Village reference longitude  |      Yes | `null`            |
| `google_maps_url` | External Google Maps link    |      Yes | `null`            |
| `status`          | Publication status           |       No | `draft`           |
| `published_at`    | First publication timestamp  |      Yes | `null`            |
| `created_at`      | Creation timestamp           |       No | Current timestamp |
| `updated_at`      | Modification timestamp       |       No | Current timestamp |
| `created_by`      | Creator                      |       No | None              |
| `updated_by`      | Administrator who last updated the record |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

* `created_by` → `auth.users.id`
* `updated_by` → `auth.users.id`

### Unique Constraints

* `slug`
* Only one village profile record should exist in Version 1

### Indexes

* Unique index on `slug`
* Index on `status`

### Business Rules

1. The profile represents the village generally.
2. Destination-specific history must not be stored here.
3. Cultural institution details belong in their own content tables.
4. Village contact methods should be stored in `contacts`.
5. Coordinates must be valid if provided.
6. A published profile must have a name and sufficient public description.

---

# 8. Destination Entities

## 8.1 `destination_categories`

### Purpose

Stores the three fixed Version 1 destination categories:

```text
Alam
Budaya
Religi
```

These rows are seeded system data and are read-only in the dashboard.

### Columns

| Column          | Description                   | Nullable | Default           |
| --------------- | ----------------------------- | -------: | ----------------- |
| `id`            | Category UUID                 |       No | None              |
| `name`          | Human-readable category name  |       No | None              |
| `slug`          | URL-safe category identifier  |       No | None              |
| `display_order` | Fixed public ordering priority |       No | None              |

### Primary Key

```text
id
```

### Unique Constraints

* `name`
* `slug`

### Indexes

* Unique index on `slug`
* Index on `display_order`

### Business Rules

1. The only rows are `Alam` (`alam`), `Budaya` (`budaya`), and `Religi` (`religi`).
2. Application migrations seed the rows in that order.
3. The dashboard cannot create, edit, archive, restore, delete, or reorder categories.
4. Every destination references exactly one of these rows.

---

## 8.2 `destinations`

### Purpose

Stores tourism destinations displayed on the public website and interactive map.

### Columns

| Column              | Description                                               | Nullable | Default           |
| ------------------- | --------------------------------------------------------- | -------: | ----------------- |
| `id`                | Destination UUID                                          |       No | None              |
| `category_id`       | Destination category                                      |       No | None              |
| `name`              | Official public destination name                          |       No | None              |
| `slug`              | Stable URL identifier                                     |       No | None              |
| `summary`           | Short description used in cards and previews              |       No | None              |
| `description`       | Main visitor-facing destination information               |       No | None              |
| `history`           | Destination-specific history or background                |      Yes | `null`            |
| `latitude`          | Geographic latitude                                       |       No | None              |
| `longitude`         | Geographic longitude                                      |       No | None              |
| `google_maps_url`   | Optional external Google Maps location or navigation link |      Yes | `null`            |
| `opening_hours`     | Human-readable operational or visitor hours               |      Yes | `null`            |
| `entrance_fee`      | Informational entrance fee amount                         |      Yes | `null`            |
| `price_note`        | Optional conditions or explanation of the entrance fee    |      Yes | `null`            |
| `facilities`        | PostgreSQL list of available visitor facilities           |       No | Empty array       |
| `contact_name`      | Optional destination contact person or organization       |      Yes | `null`            |
| `contact_phone`     | Optional contact phone number                             |      Yes | `null`            |
| `contact_consent_confirmed` | Whether publication consent for entity contact data is recorded |       No | `false` |
| `thumbnail_path`    | Storage path of the selected thumbnail                    |      Yes | `null`            |
| `thumbnail_bucket`  | Storage bucket containing the thumbnail                   |      Yes | `null`            |
| `is_featured`       | Whether the destination may be highlighted publicly       |       No | `false`           |
| `display_order`     | Manual ordering priority                                  |       No | `0`               |
| `status`            | Publication status                                        |       No | `draft`           |
| `published_at`      | First publication timestamp                                |      Yes | `null`            |
| `created_at`        | Creation timestamp                                        |       No | Current timestamp |
| `updated_at`        | Modification timestamp                                    |       No | Current timestamp |
| `created_by`        | Creator                                                   |       No | None              |
| `updated_by`        | Last updater                                              |       No | None              |

### Field Explanations

#### `name`

The official name shown to visitors.

#### `slug`

A stable URL identifier used for destination detail routes.

#### `summary`

A concise overview for listing cards, search results, and map previews.

#### `description`

The primary destination content. It should describe the place from a visitor perspective.

#### `history`

Stores history specific to this destination. General village history belongs in `village_profiles`.

#### `category_id`

Connects the destination to one destination category.

Version 1 assigns one primary category per destination to keep management simple.

#### `latitude`

The north-south coordinate.

Valid range:

```text
-90 to 90
```

#### `longitude`

The east-west coordinate.

Valid range:

```text
-180 to 180
```

#### `google_maps_url`

An optional external link for navigation or opening the location in Google Maps.

It is not the primary GIS data source.

#### `opening_hours`

Human-readable information such as visitor hours or appointment requirements.

A normalized weekly schedule is intentionally omitted because current requirements do not justify the additional complexity.

#### `entrance_fee`

Stores the base informational amount.

It must not be treated as a payment transaction value.

#### `price_note`

Explains conditions such as:

* Fee ranges
* Cloth rental
* Guide inclusion
* Community contribution
* Prices subject to confirmation

#### `facilities`

A PostgreSQL `text[]` list of visitor facilities. An empty array means that no facilities have been entered. Arbitrary JSON objects and a separate facilities table are not used.

Examples:

* Parking
* Toilets
* Guide
* Rest area

The migration may use a PostgreSQL array or structured JSON, provided the representation is consistently validated.

#### `contact_name`

The responsible person, group, or manager for visitor inquiries.

#### `contact_phone`

Public contact number specific to the destination.

#### `thumbnail_path`

References the selected image used in destination cards.

The underlying file remains in Supabase Storage.

#### `status`

Controls public visibility.

### Primary Key

```text
id
```

### Foreign Keys

* `category_id` → `destination_categories.id`
* `created_by` → `auth.users.id`
* `updated_by` → `auth.users.id`

### Unique Constraints

* `slug`
* `name` should normally be unique among non-archived destinations

### Indexes

* Unique index on `slug`
* Index on `category_id`
* Index on `status`
* Index on `is_featured`
* Index on `display_order`
* Composite index on `status`, `category_id`
* Composite index on `status`, `display_order`

### Nullable Fields

The following may be null:

* `history`
* `google_maps_url`
* `opening_hours`
* `entrance_fee`
* `price_note`
* `contact_name`
* `contact_phone`
* `thumbnail_path`
* `thumbnail_bucket`
* `published_at`

### Default Values

* `is_featured`: `false`
* `display_order`: `0`
* `status`: `draft`
* `facilities`: empty array
* `created_at`: current timestamp
* `updated_at`: current timestamp

### Business Rules

1. Published destinations require:

   * Name
   * Slug
   * Summary
   * Description
   * Category
   * Valid coordinates
2. Latitude and longitude must be stored together.
3. A destination must reference one of the three fixed category rows.
4. The Google Maps URL must not replace coordinate storage.
5. The thumbnail must correspond to an available stored image.
6. A destination may belong to multiple tourism packages.
7. Archived destinations remain recoverable and restore to draft.
8. A destination with package associations cannot be permanently deleted in Version 1.
9. `entrance_fee` follows the shared numeric price contract and `price_note` is optional.
10. General village or customary institution content must not be duplicated in destination descriptions.
11. The administrator form supports map picking and manual latitude/longitude entry.
12. The generated slug remains unchanged after first publication.
13. If destination contact data is published, `contact_consent_confirmed` must be true.

---

## 8.3 `destination_images`

### Purpose

Stores gallery images associated with destinations.

Images are separated from `destinations` because:

* A destination may have multiple images.
* Image ordering changes independently.
* Captions and alternative text belong to individual images.
* Media can be added or removed without changing destination content.

### Columns

| Column           | Description                                      | Nullable | Default           |
| ---------------- | ------------------------------------------------ | -------: | ----------------- |
| `id`             | Image UUID                                       |       No | None              |
| `destination_id` | Parent destination                               |       No | None              |
| `storage_bucket` | Supabase Storage bucket                          |       No | None              |
| `storage_path`   | Object path inside the bucket                    |       No | None              |
| `caption`        | Optional visible image caption                   |      Yes | `null`            |
| `alt_text`       | Accessible image description                     |       No | None              |
| `display_order`  | Image sequence                                   |       No | `0`               |
| `is_primary`     | Whether the image is the preferred primary image |       No | `false`           |
| `created_at`     | Creation timestamp                               |       No | Current timestamp |
| `created_by`     | Uploading user                                   |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

* `destination_id` → `destinations.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Composite uniqueness on `storage_bucket` and `storage_path`
* At most one primary image per destination

### Indexes

* Index on `destination_id`
* Composite index on `destination_id`, `display_order`
* Composite index on `destination_id`, `is_primary`

### Business Rules

1. Every image must belong to one destination.
2. Alt text is required.
3. Display order must be zero or greater.
4. The referenced storage file must exist.
5. Removing the record does not automatically prove that the storage object was deleted.
6. A destination may have zero images while in draft state.
7. Published destinations should have at least one usable image.

---

# 9. Tourism Package Entities

## 9.1 `tourism_packages`

### Purpose

Stores informational tourism packages offered to visitors.

The system publishes package information but does not manage bookings or payments.

### Columns

| Column                | Description                                            | Nullable | Default           |
| --------------------- | ------------------------------------------------------ | -------: | ----------------- |
| `id`                  | Package UUID                                           |       No | None              |
| `name`                | Package name                                           |       No | None              |
| `slug`                | Stable URL identifier                                  |       No | None              |
| `package_type`        | Package tier or classification                         |       No | None              |
| `duration_value`      | Numeric duration                                       |       No | None              |
| `duration_unit`       | Duration unit                                          |       No | None              |
| `price`               | Informational package price                            |      Yes | `null`            |
| `price_note`          | Price conditions or clarification                      |      Yes | `null`            |
| `included_facilities` | PostgreSQL list of included services or facilities     |       No | Empty array       |
| `souvenir`            | Souvenir information                                   |      Yes | `null`            |
| `summary`             | Short package overview                                 |      Yes | `null`            |
| `description`         | Complete package description                           |       No | None              |
| `thumbnail_path`      | Selected package thumbnail path                        |      Yes | `null`            |
| `thumbnail_bucket`    | Thumbnail bucket                                       |      Yes | `null`            |
| `is_featured`         | Whether the package can appear in highlighted sections |       No | `false`           |
| `display_order`       | Manual ordering                                        |       No | `0`               |
| `status`              | Publication status                                     |       No | `draft`           |
| `published_at`        | First publication timestamp                             |      Yes | `null`            |
| `created_at`          | Creation timestamp                                     |       No | Current timestamp |
| `updated_at`          | Modification timestamp                                 |       No | Current timestamp |
| `created_by`          | Creator                                                |       No | None              |
| `updated_by`          | Last updater                                           |       No | None              |

### Package Type

Version 1 supports exactly:

```text
budget
standard
premium
```

The database should enforce a controlled set of accepted values.

A lookup table is not required unless package types later become administrator-managed content.

### Duration

Duration is divided into:

```text
duration_value
duration_unit
```

Example:

```text
1 day
2 days
4 hours
```

This is preferable to one uncontrolled text field because it preserves sortable structured data.

### Price

`price` follows the shared Version 1 numeric Indonesian-rupiah contract. `price_note` is optional.

### Primary Key

```text
id
```

### Foreign Keys

* `created_by` → `auth.users.id`
* `updated_by` → `auth.users.id`

### Unique Constraints

* `slug`
* Package name should normally be unique among non-archived packages

### Indexes

* Unique index on `slug`
* Index on `package_type`
* Index on `status`
* Index on `is_featured`
* Index on `display_order`

### Business Rules

1. Published packages must include:

   * Name
   * Type
   * Duration
   * Description
   * At least one destination
2. Duration must be greater than zero.
3. `price` uses the shared contract: `0` is free, `null` unavailable, and positive values are Indonesian rupiah.
4. Package price is informational and does not create a payment obligation.
5. Included facilities should describe package inclusions, not destination facilities.
6. A package may contain multiple destinations.
7. A destination may appear in multiple packages.
8. Package destinations must be ordered.
9. An archived package preserves its historical relationships and restores to draft.
10. `price_note` is optional.
11. The generated slug remains unchanged after first publication.

---

## 9.2 `package_destinations`

### Purpose

Implements the many-to-many relationship between tourism packages and destinations.

### Columns

| Column           | Description                                | Nullable | Default           |
| ---------------- | ------------------------------------------ | -------: | ----------------- |
| `id`             | Relationship UUID                          |       No | None              |
| `package_id`     | Tourism package                            |       No | None              |
| `destination_id` | Included destination                       |       No | None              |
| `display_order`  | Destination order within the package       |       No | `0`               |
| `notes`          | Optional package-specific destination note |      Yes | `null`            |
| `created_at`     | Relationship creation timestamp            |       No | Current timestamp |
| `created_by`     | User who added the relationship            |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

* `package_id` → `tourism_packages.id`
* `destination_id` → `destinations.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Composite uniqueness on `package_id` and `destination_id`

### Indexes

* Index on `package_id`
* Index on `destination_id`
* Composite index on `package_id`, `display_order`

### Business Rules

1. A destination may appear only once in the same package.
2. Archived destinations may not be added.
3. Published packages should reference published destinations.
4. `notes` must only contain package-specific context.
5. Destination descriptions must remain owned by `destinations`.

---

## 9.3 `package_images`

### Purpose

Stores images associated with tourism packages.

### Columns

| Column           | Description                  | Nullable | Default           |
| ---------------- | ---------------------------- | -------: | ----------------- |
| `id`             | Image UUID                   |       No | None              |
| `package_id`     | Parent package               |       No | None              |
| `storage_bucket` | Storage bucket               |       No | None              |
| `storage_path`   | File path                    |       No | None              |
| `caption`        | Optional caption             |      Yes | `null`            |
| `alt_text`       | Accessible image description |       No | None              |
| `display_order`  | Image order                  |       No | `0`               |
| `is_primary`     | Primary package image        |       No | `false`           |
| `created_at`     | Creation timestamp           |       No | Current timestamp |
| `created_by`     | Uploading user               |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

* `package_id` → `tourism_packages.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Composite uniqueness on `storage_bucket` and `storage_path`
* At most one primary image per package

### Indexes

* Index on `package_id`
* Composite index on `package_id`, `display_order`

### Business Rules

Package images must not duplicate destination images unless the duplication is intentional and separately managed.

---

# 10. Homestay Entities

## 10.1 `homestays`

### Purpose

Stores public information about homestays available to visitors.

The entity does not manage room inventory or reservations.

### Columns

| Column             | Description                   | Nullable | Default           |
| ------------------ | ----------------------------- | -------: | ----------------- |
| `id`               | Homestay UUID                 |       No | None              |
| `name`             | Public homestay name          |       No | None              |
| `slug`             | Stable URL identifier         |       No | None              |
| `owner_name`       | Optional homestay owner or manager |      Yes | `null`         |
| `phone`            | Optional public contact phone |      Yes | `null`            |
| `contact_consent_confirmed` | Whether publication consent for owner and contact data is recorded |       No | `false` |
| `description`      | Visitor-facing description    |       No | None              |
| `address`          | Textual location              |      Yes | `null`            |
| `latitude`         | Latitude                      |      Yes | `null`            |
| `longitude`        | Longitude                     |      Yes | `null`            |
| `google_maps_url`  | External Google Maps link     |      Yes | `null`            |
| `price_per_night`  | Informational nightly price   |      Yes | `null`            |
| `price_note`       | Pricing details or inclusions |      Yes | `null`            |
| `facilities`       | PostgreSQL facility list      |       No | Empty array       |
| `thumbnail_path`   | Thumbnail storage path        |      Yes | `null`            |
| `thumbnail_bucket` | Thumbnail bucket              |      Yes | `null`            |
| `status`           | Publication status            |       No | `draft`           |
| `published_at`     | First publication timestamp   |      Yes | `null`            |
| `is_featured`      | Highlight eligibility         |       No | `false`           |
| `display_order`    | Public ordering               |       No | `0`               |
| `created_at`       | Creation timestamp            |       No | Current timestamp |
| `updated_at`       | Modification timestamp        |       No | Current timestamp |
| `created_by`       | Creator                       |       No | None              |
| `updated_by`       | Last updater                  |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

Audit references to `auth.users.id`.

### Unique Constraints

* `slug`
* Name should normally be unique among non-archived homestays

### Indexes

* Unique index on `slug`
* Index on `status`
* Index on `is_featured`
* Index on `display_order`

### Business Rules

1. A published homestay requires:

   * Name
   * Description
2. `price_per_night` uses the shared contract: `0` is free, `null` unavailable, and positive values are Indonesian rupiah.
3. Latitude and longitude must either both be present or both be null.
4. The entity does not track:

   * Available rooms
   * Check-in status
   * Reservations
   * Payments
5. Facilities belong to the homestay and must not be copied into tourism packages.
6. Contact details are optional and require recorded publication consent.
7. `price_note` is optional.
8. A published homestay with valid coordinates may appear on the public map.
9. The administrator form supports map picking and manual latitude/longitude entry.
10. The generated slug remains unchanged after first publication.
11. If owner or contact data is published, `contact_consent_confirmed` must be true.

---

## 10.2 `homestay_images`

### Purpose

Stores the gallery for a homestay.

### Columns

| Column           | Description                  | Nullable | Default           |
| ---------------- | ---------------------------- | -------: | ----------------- |
| `id`             | Image UUID                   |       No | None              |
| `homestay_id`    | Parent homestay              |       No | None              |
| `storage_bucket` | Storage bucket               |       No | None              |
| `storage_path`   | Storage object path          |       No | None              |
| `caption`        | Optional caption             |      Yes | `null`            |
| `alt_text`       | Accessible image description |       No | None              |
| `display_order`  | Display sequence             |       No | `0`               |
| `is_primary`     | Primary homestay image       |       No | `false`           |
| `created_at`     | Creation timestamp           |       No | Current timestamp |
| `created_by`     | Uploading user               |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

* `homestay_id` → `homestays.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Composite uniqueness on `storage_bucket` and `storage_path`
* At most one primary image per homestay

### Indexes

* Index on `homestay_id`
* Composite index on `homestay_id`, `display_order`

### Business Rules

A published homestay should normally have at least one image, but this should not block initial draft creation.

---

# 11. UMKM Entities

## 11.1 `umkms`

### Purpose

Stores public information about local micro, small, and medium enterprises.

The table name uses the project term `umkms` for consistency, although UMKM is already an Indonesian abbreviation.

### Columns

| Column             | Description                  | Nullable | Default           |
| ------------------ | ---------------------------- | -------: | ----------------- |
| `id`               | UMKM UUID                    |       No | None              |
| `business_name`    | Public business name         |       No | None              |
| `slug`             | Stable URL identifier        |       No | None              |
| `owner_name`       | Business owner or manager    |      Yes | `null`            |
| `category`         | Business or product category |       No | None              |
| `description`      | Public business description  |       No | None              |
| `address`          | Textual business location    |      Yes | `null`            |
| `latitude`         | Latitude                     |      Yes | `null`            |
| `longitude`        | Longitude                    |      Yes | `null`            |
| `google_maps_url`  | External map link            |      Yes | `null`            |
| `contact_name`     | Public contact person        |      Yes | `null`            |
| `contact_phone`    | Public contact phone         |      Yes | `null`            |
| `contact_whatsapp` | Public WhatsApp contact      |      Yes | `null`            |
| `contact_consent_confirmed` | Whether publication consent for owner and contact data is recorded |       No | `false` |
| `thumbnail_path`   | Thumbnail storage path       |      Yes | `null`            |
| `thumbnail_bucket` | Thumbnail bucket             |      Yes | `null`            |
| `status`           | Publication status           |       No | `draft`           |
| `published_at`     | First publication timestamp  |      Yes | `null`            |
| `is_featured`      | Highlight eligibility        |       No | `false`           |
| `display_order`    | Public ordering              |       No | `0`               |
| `created_at`       | Creation timestamp           |       No | Current timestamp |
| `updated_at`       | Modification timestamp       |       No | Current timestamp |
| `created_by`       | Creator                      |       No | None              |
| `updated_by`       | Last updater                 |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

Audit references to `auth.users.id`.

### Unique Constraints

* `slug`
* Business name should normally be unique among non-archived records

### Indexes

* Unique index on `slug`
* Index on `category`
* Index on `status`
* Index on `is_featured`
* Index on `display_order`

### Business Rules

1. A published UMKM requires:

   * Business name
   * Category
   * Description
   * At least one valid public contact method or location
2. Coordinates must be stored together.
3. The platform does not manage:

   * Product inventory
   * Shopping carts
   * Orders
   * Payments
4. Owner and per-entity contact information are optional and require recorded publication consent.
5. Category remains a controlled text value in Version 1.
6. A separate UMKM category table should only be introduced if category management becomes operationally necessary.
7. A visitable published UMKM with valid coordinates may appear on the public map.
8. The administrator form supports map picking and manual latitude/longitude entry.
9. UMKM Tenun uses exactly the same approved coordinate pair as Kampung Adat so the map groups both records into one marker.
10. The generated slug remains unchanged after first publication.
11. If owner or contact data is published, `contact_consent_confirmed` must be true.

---

## 11.2 `umkm_images`

### Purpose

Stores gallery images for UMKM records.

### Columns

| Column           | Description                  | Nullable | Default           |
| ---------------- | ---------------------------- | -------: | ----------------- |
| `id`             | Image UUID                   |       No | None              |
| `umkm_id`        | Parent UMKM                  |       No | None              |
| `storage_bucket` | Storage bucket               |       No | None              |
| `storage_path`   | Storage object path          |       No | None              |
| `caption`        | Optional caption             |      Yes | `null`            |
| `alt_text`       | Accessible image description |       No | None              |
| `display_order`  | Display sequence             |       No | `0`               |
| `is_primary`     | Primary image                |       No | `false`           |
| `created_at`     | Creation timestamp           |       No | Current timestamp |
| `created_by`     | Uploading user               |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

* `umkm_id` → `umkms.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Composite uniqueness on `storage_bucket` and `storage_path`
* At most one primary image per UMKM

### Indexes

* Index on `umkm_id`
* Composite index on `umkm_id`, `display_order`

---

# 12. Culture Entities

Culture-related information is deliberately separated into four responsibilities:

1. Traditional houses
2. General cultural articles
3. Bayan customary institution articles
4. Cultural events

They must not be combined into one generic content table because they have different:

* Meanings
* Data fields
* Public navigation
* Editorial ownership
* Publication lifecycle
* Geographic requirements
* Event scheduling requirements

A single generic table would require excessive nullable fields and weaken content boundaries.

---

## 12.1 `traditional_houses`

### Purpose

Documents traditional houses or traditional-house locations relevant to Karang Bajo tourism and cultural preservation.

### Columns

| Column                  | Description                          | Nullable | Default           |
| ----------------------- | ------------------------------------ | -------: | ----------------- |
| `id`                    | Traditional house UUID               |       No | None              |
| `name`                  | Public name                          |       No | None              |
| `slug`                  | Stable URL identifier                |       No | None              |
| `summary`               | Short public summary                 |      Yes | `null`            |
| `description`           | Main descriptive content             |       No | None              |
| `history`               | House-specific historical background |      Yes | `null`            |
| `cultural_significance` | Cultural meaning or function         |      Yes | `null`            |
| `location_name`         | Hamlet or locality description       |      Yes | `null`            |
| `latitude`              | Latitude                             |      Yes | `null`            |
| `longitude`             | Longitude                            |      Yes | `null`            |
| `google_maps_url`       | External map link                    |      Yes | `null`            |
| `visitor_information`   | Visitor rules or access guidance     |      Yes | `null`            |
| `thumbnail_path`        | Thumbnail path                       |      Yes | `null`            |
| `thumbnail_bucket`      | Thumbnail bucket                     |      Yes | `null`            |
| `status`                | Publication status                   |       No | `draft`           |
| `published_at`          | First publication timestamp          |      Yes | `null`            |
| `is_featured`           | Highlight eligibility                |       No | `false`           |
| `display_order`         | Public ordering                      |       No | `0`               |
| `created_at`            | Creation timestamp                   |       No | Current timestamp |
| `updated_at`            | Modification timestamp               |       No | Current timestamp |
| `created_by`            | Creator                              |       No | None              |
| `updated_by`            | Last updater                         |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

Audit references to `auth.users.id`.

### Unique Constraints

* `slug`
* Name should normally be unique among non-archived records

### Indexes

* Unique index on `slug`
* Index on `status`
* Index on `is_featured`
* Index on `display_order`

### Business Rules

1. Traditional-house history belongs here, not in general culture articles.
2. Visitor guidance should respect customary rules.
3. Coordinates are optional; a published traditional house with valid coordinates may appear on the public map.
4. When one coordinate is provided, both must be provided.
5. The administrator must verify cultural claims with an appropriate local source before direct publication; no application approval workflow exists.
6. The administrator form supports map picking and manual latitude/longitude entry.
7. The generated slug remains unchanged after first publication.

---

## 12.2 `traditional_house_images`

### Purpose

Stores images associated with traditional houses.

### Columns

Uses the standard image structure:

* `id`
* `traditional_house_id`
* `storage_bucket`
* `storage_path`
* `caption`
* `alt_text`
* `display_order`
* `is_primary`
* `created_at`
* `created_by`

### Primary Key

```text
id
```

### Foreign Keys

* `traditional_house_id` → `traditional_houses.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Unique storage bucket and path
* At most one primary image per traditional house

### Indexes

* Index on `traditional_house_id`
* Composite index on `traditional_house_id`, `display_order`

---

## 12.3 `cultural_articles`

### Purpose

Stores general cultural, historical, traditional, and community knowledge that does not primarily describe a traditional house, customary institution, or scheduled event.

### Columns

| Column             | Description                           | Nullable | Default           |
| ------------------ | ------------------------------------- | -------: | ----------------- |
| `id`               | Article UUID                          |       No | None              |
| `title`            | Article title                         |       No | None              |
| `slug`             | Stable URL identifier                 |       No | None              |
| `summary`          | Short article introduction            |      Yes | `null`            |
| `content`          | Complete article body                 |       No | None              |
| `article_category` | General cultural topic classification |      Yes | `null`            |
| `source_note`      | Source or verification context        |      Yes | `null`            |
| `thumbnail_path`   | Thumbnail path                        |      Yes | `null`            |
| `thumbnail_bucket` | Thumbnail bucket                      |      Yes | `null`            |
| `status`           | Publication status                    |       No | `draft`           |
| `is_featured`      | Highlight eligibility                 |       No | `false`           |
| `published_at`     | First publication timestamp            |      Yes | `null`            |
| `created_at`       | Creation timestamp                    |       No | Current timestamp |
| `updated_at`       | Modification timestamp                |       No | Current timestamp |
| `created_by`       | Creator                               |       No | None              |
| `updated_by`       | Last updater                          |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

Audit references to `auth.users.id`.

### Unique Constraints

* `slug`

### Indexes

* Unique index on `slug`
* Index on `article_category`
* Index on `status`
* Index on `is_featured`
* Index on `published_at`

### Business Rules

1. This table must not contain articles whose main subject is the structure or role of Bayan customary institutions.
2. Scheduled event data belongs in `cultural_events`.
3. Traditional-house-specific information belongs in `traditional_houses`.
4. Published articles should include a verified title and content.
5. `source_note` may record interview, document, or community verification context.

---

## 12.4 `cultural_article_images`

### Purpose

Stores images associated with cultural articles.

### Columns

* `id`
* `cultural_article_id`
* `storage_bucket`
* `storage_path`
* `caption`
* `alt_text`
* `display_order`
* `is_primary`
* `created_at`
* `created_by`

### Primary Key

```text
id
```

### Foreign Keys

* `cultural_article_id` → `cultural_articles.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Unique storage bucket and path
* At most one primary image per article

### Indexes

* Index on `cultural_article_id`
* Composite index on `cultural_article_id`, `display_order`

---

## 12.5 `customary_institution_articles`

### Purpose

Stores articles specifically documenting Bayan customary institutions, customary officeholders, responsibilities, structures, rules, and institutional history.

This entity is separate because customary institution content represents formal and culturally sensitive institutional knowledge.

### Columns

| Column               | Description                                              | Nullable | Default           |
| -------------------- | -------------------------------------------------------- | -------: | ----------------- |
| `id`                 | Article UUID                                             |       No | None              |
| `title`              | Article title                                            |       No | None              |
| `slug`               | Stable URL identifier                                    |       No | None              |
| `summary`            | Short article summary                                    |      Yes | `null`            |
| `content`            | Complete article body                                    |       No | None              |
| `institution_name`   | Name of the customary institution or structure discussed |      Yes | `null`            |
| `institution_role`   | Main role or responsibility                              |      Yes | `null`            |
| `historical_context` | Institution-specific history                             |      Yes | `null`            |
| `source_note`        | Source and verification context                          |      Yes | `null`            |
| `thumbnail_path`     | Thumbnail path                                           |      Yes | `null`            |
| `thumbnail_bucket`   | Thumbnail bucket                                         |      Yes | `null`            |
| `status`             | Publication status                                       |       No | `draft`           |
| `is_featured`        | Highlight eligibility                                    |       No | `false`           |
| `published_at`       | First publication timestamp                               |      Yes | `null`            |
| `created_at`         | Creation timestamp                                       |       No | Current timestamp |
| `updated_at`         | Modification timestamp                                   |       No | Current timestamp |
| `created_by`         | Creator                                                  |       No | None              |
| `updated_by`         | Last updater                                             |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

Audit references to `auth.users.id`.

### Unique Constraints

* `slug`

### Indexes

* Unique index on `slug`
* Index on `institution_name`
* Index on `status`
* Index on `is_featured`
* Index on `published_at`

### Business Rules

1. Customary institution information must not be merged into general cultural articles merely for convenience.
2. Published content should be verified by an appropriate customary or village authority.
3. Living individuals' private information must not be published without permission.
4. The article may describe roles without requiring individual officeholder data.
5. Institutional history belongs here, while general village history belongs in `village_profiles`.

---

## 12.6 `customary_institution_article_images`

### Purpose

Stores images related to customary institution articles.

### Columns

* `id`
* `customary_institution_article_id`
* `storage_bucket`
* `storage_path`
* `caption`
* `alt_text`
* `display_order`
* `is_primary`
* `created_at`
* `created_by`

### Primary Key

```text
id
```

### Foreign Keys

* `customary_institution_article_id` → `customary_institution_articles.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Unique storage bucket and path
* At most one primary image per article

### Indexes

* Index on `customary_institution_article_id`
* Composite index on parent ID and display order

---

## 12.7 `cultural_events`

### Purpose

Stores cultural, traditional, ceremonial, and tourism events.

Events are separate from articles because events have dates, times, locations, and temporal status.

### Columns

| Column                | Description                                                          | Nullable | Default           |
| --------------------- | -------------------------------------------------------------------- | -------: | ----------------- |
| `id`                  | Event UUID                                                           |       No | None              |
| `title`               | Event title                                                          |       No | None              |
| `slug`                | Stable URL identifier                                                |       No | None              |
| `summary`             | Short event summary                                                  |      Yes | `null`            |
| `description`         | Complete event description                                           |       No | None              |
| `event_type`          | Event classification                                                 |      Yes | `null`            |
| `start_at`            | Event start date and time                                            |      Yes | `null`            |
| `end_at`              | Event end date and time                                              |      Yes | `null`            |
| `all_day`             | Whether the confirmed occurrence is all-day                          |       No | `false`           |
| `date_note`           | Text for dates that are customary, approximate, or not yet confirmed |      Yes | `null`            |
| `location_name`       | Event location name                                                  |      Yes | `null`            |
| `address`             | Textual address                                                      |      Yes | `null`            |
| `latitude`            | Event latitude                                                       |      Yes | `null`            |
| `longitude`           | Event longitude                                                      |      Yes | `null`            |
| `google_maps_url`     | External map link                                                    |      Yes | `null`            |
| `organizer`           | Responsible organizer                                                |      Yes | `null`            |
| `contact_phone`       | Public event contact                                                 |      Yes | `null`            |
| `contact_consent_confirmed` | Whether publication consent for event contact data is recorded      |       No | `false`           |
| `visitor_information` | Attendance rules or visitor guidance                                 |      Yes | `null`            |
| `thumbnail_path`      | Thumbnail path                                                       |      Yes | `null`            |
| `thumbnail_bucket`    | Thumbnail bucket                                                     |      Yes | `null`            |
| `status`              | Publication status                                                   |       No | `draft`           |
| `is_featured`         | Highlight eligibility                                                |       No | `false`           |
| `published_at`        | First publication timestamp                                          |      Yes | `null`            |
| `created_at`          | Creation timestamp                                                   |       No | Current timestamp |
| `updated_at`          | Modification timestamp                                               |       No | Current timestamp |
| `created_by`          | Creator                                                              |       No | None              |
| `updated_by`          | Last updater                                                         |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

Audit references to `auth.users.id`.

### Unique Constraints

* `slug`

Two events may share the same title if they represent different occurrences.

### Indexes

* Unique index on `slug`
* Index on `status`
* Index on `start_at`
* Index on `end_at`
* Index on `event_type`
* Index on `is_featured`
* Composite index on `status`, `start_at`

### Business Rules

1. `end_at` cannot be earlier than `start_at`.
2. Latitude and longitude must appear together.
3. An event without a confirmed `start_at` remains draft even when `date_note` explains the uncertainty. Date-note-only records are never classified as upcoming.
4. Date-specific occurrences should not be overwritten with unrelated future events.
5. Past events should normally remain available as archived documentation rather than being deleted.
6. Event descriptions must not duplicate general cultural article content.
7. Event visibility is controlled through publication status, not only by date.
8. No placeholder title, description, date note, location, or schedule content may be published.
9. The generated slug remains unchanged after first publication.
10. If event contact data is published, `contact_consent_confirmed` must be true.
11. Application date and time presentation uses `Asia/Makassar`.
12. `all_day` distinguishes an all-day confirmed occurrence from a timed occurrence.
13. Every occurrence is a separate record; recurrence rules are not stored.

---

## 12.8 `cultural_event_images`

### Purpose

Stores event images.

### Columns

* `id`
* `cultural_event_id`
* `storage_bucket`
* `storage_path`
* `caption`
* `alt_text`
* `display_order`
* `is_primary`
* `created_at`
* `created_by`

### Primary Key

```text
id
```

### Foreign Keys

* `cultural_event_id` → `cultural_events.id`
* `created_by` → `auth.users.id`

### Unique Constraints

* Unique storage bucket and path
* At most one primary image per event

### Indexes

* Index on `cultural_event_id`
* Composite index on parent ID and display order

---

# 13. Gallery Entity

## 13.1 `gallery_items`

### Purpose

Stores standalone gallery content that is not owned by a destination, homestay, UMKM, package, article, traditional house, or event.

This table should not be used as a generic replacement for all dedicated image tables.

### Columns

| Column           | Description                             | Nullable | Default           |
| ---------------- | --------------------------------------- | -------: | ----------------- |
| `id`             | Gallery item UUID                       |       No | None              |
| `title`          | Optional public title                   |      Yes | `null`            |
| `storage_bucket` | Storage bucket                          |       No | None              |
| `storage_path`   | Storage object path                     |       No | None              |
| `thumbnail_path` | Optional separately generated thumbnail |      Yes | `null`            |
| `caption`        | Visible caption                         |      Yes | `null`            |
| `alt_text`       | Accessible image description            |       No | None              |
| `category`       | Gallery grouping                        |      Yes | `null`            |
| `taken_at`       | Original image date when known          |      Yes | `null`            |
| `display_order`  | Public order                            |       No | `0`               |
| `status`         | Publication status                      |       No | `draft`           |
| `created_at`     | Creation timestamp                      |       No | Current timestamp |
| `updated_at`     | Modification timestamp                  |       No | Current timestamp |
| `created_by`     | Uploading user                          |       No | None              |
| `updated_by`     | Last updater                            |       No | None              |

### Primary Key

```text
id
```

### Foreign Keys

Audit references to `auth.users.id`.

### Unique Constraints

* Composite uniqueness on `storage_bucket` and `storage_path`

### Indexes

* Index on `status`
* Index on `category`
* Index on `display_order`
* Index on `taken_at`

### Business Rules

1. Every gallery image requires alt text.
2. Images strongly associated with one content record should use that content's dedicated image table.
3. `gallery_items` is for cross-cutting or standalone documentation.
4. Archiving a gallery record must not destroy the underlying storage object.

---

# 14. Contact Entity

## 14.1 `contacts`

### Purpose

Stores official public contact channels.

Examples include:

* Village office
* Tourism information
* Pokdarwis
* Email
* Phone
* WhatsApp
* Social media

### Columns

| Column          | Description                      | Nullable | Default           |
| --------------- | -------------------------------- | -------: | ----------------- |
| `id`            | Contact UUID                     |       No | None              |
| `label`         | Public contact label             |       No | None              |
| `contact_type`  | Type of contact channel          |       No | None              |
| `value`         | Contact value                    |       No | None              |
| `url`           | Clickable URL when applicable    |      Yes | `null`            |
| `description`   | Optional explanatory text        |      Yes | `null`            |
| `display_order` | Public ordering                  |       No | `0`               |
| `status`        | Publication status               |       No | `draft`           |
| `created_at`    | Creation timestamp               |       No | Current timestamp |
| `updated_at`    | Modification timestamp           |       No | Current timestamp |
| `created_by`    | Creator                          |       No | None              |
| `updated_by`    | Last updater                     |       No | None              |

### Primary Key

```text
id
```

### Unique Constraints

A composite uniqueness rule should prevent duplicate non-archived combinations of:

```text
contact_type
value
```

### Indexes

* Index on `contact_type`
* Index on `status`
* Index on `display_order`

### Business Rules

1. Only approved public contact information may be published.
2. Contact values must be validated according to their type.
3. Technical service credentials must never be stored here.
4. Destination-, event-, homestay-, or UMKM-specific contacts remain optional on their owning records and require recorded publication consent.
5. The central primary WhatsApp CTA is not selected from this table; it is the `primary_whatsapp_number` site setting.

---

# 15. Site Settings Entity

## 15.1 `site_settings`

### Purpose

Stores limited administrator-manageable public configuration.

It is not a general-purpose technical configuration table.

### Columns

| Column        | Description                                 | Nullable | Default           |
| ------------- | ------------------------------------------- | -------: | ----------------- |
| `id`          | Setting UUID                                |       No | None              |
| `key`         | Stable machine-readable setting key         |       No | None              |
| `value`       | Setting value                               |      Yes | `null`            |
| `value_type`  | Expected value type                         |       No | `text`            |
| `label`       | Human-readable dashboard label              |       No | None              |
| `description` | Explanation for administrators              |      Yes | `null`            |
| `is_public`   | Whether the value may be read publicly      |       No | `false`           |
| `is_editable` | Whether administrators may change the value |       No | `true`            |
| `created_at`  | Creation timestamp                          |       No | Current timestamp |
| `updated_at`  | Modification timestamp                      |       No | Current timestamp |
| `created_by`  | Creator                                     |       No | None              |
| `updated_by`  | Last updater                                |       No | None              |

### Primary Key

```text
id
```

### Unique Constraints

* `key`

### Indexes

* Unique index on `key`
* Index on `is_public`
* Index on `is_editable`

### Business Rules

1. Setting keys must remain stable.
2. Secrets must never be stored in this table.
3. Environment-specific configuration belongs in deployment environment variables.
4. Public editorial content must not be stored as arbitrary settings.
5. Values must be validated according to `value_type`.
6. The table should contain only a small, controlled set of documented settings.
7. Version 1 must create the public editable key `primary_whatsapp_number` as the central visitor inquiry CTA after the real administrator UUID is available. The initial schema migration must not fabricate an audit UUID merely to seed this row.

Possible value types:

```text
text
number
boolean
url
json
```

The `json` type should only be used when a structured setting cannot be represented more clearly.

---

# 16. GIS Data Model

## 16.1 Coordinate Representation

Geographic positions use:

```text
latitude
longitude
```

PostGIS geometry is intentionally not used.

The following content may store coordinates:

* Village profile
* Destinations
* Homestays
* UMKM
* Traditional houses
* Cultural events

The Version 1 public tourism map reads only published destinations, traditional houses, homestays, and visitable UMKM. Village-profile and event coordinates remain detail-page data unless a future requirement changes the map scope.

---

## 16.2 Coordinate Constraints

Latitude must remain within:

```text
-90 to 90
```

Longitude must remain within:

```text
-180 to 180
```

Coordinates must follow an all-or-nothing rule:

* Both latitude and longitude are present
* Or both are null

Destinations are the exception because map display is a core requirement; destination coordinates are mandatory.

---

## 16.3 Why PostGIS Is Not Used

The production scope requires:

* Point placement
* Marker rendering
* Popup display
* External navigation links

It does not require:

* Polygon storage
* Buffer analysis
* Spatial intersections
* Nearest-neighbor queries
* Server-side routing
* Spatial aggregation

Using standard coordinate fields keeps the schema:

* Easier to understand
* Easier to migrate
* Easier to maintain
* Proportional to the actual requirements

PostGIS should only be introduced when a validated requirement depends on spatial database functions.

---

## 16.4 Leaflet Consumption

Leaflet consumes published records containing:

```text
id
name
slug
latitude
longitude
category
summary
thumbnail reference
```

The frontend converts latitude and longitude values into Leaflet marker coordinates.

The database does not store Leaflet-specific objects or map configuration.

## 16.5 Shared-Location Marker Rule

Published mappable records with the same approved latitude and longitude are grouped into one map marker. The marker payload contains every represented record so the popup can link to each relevant detail page.

UMKM Tenun must store the same approved coordinate pair as Kampung Adat. It must not introduce a nearby synthetic coordinate merely to separate markers.

Administrator location forms for coordinate-bearing records support both map picking and manual latitude/longitude entry. Both paths write the same validated numeric columns.

---

# 17. Image and File Storage Model

## 17.1 Separation of Responsibilities

PostgreSQL stores:

* Storage bucket name
* Storage path
* Thumbnail path
* Caption
* Alt text
* Display order
* Content association
* Audit metadata

Supabase Storage stores:

* Actual image files
* Generated thumbnails
* Optimized WebP assets

The relational database must not store image binary data.

---

## 17.2 Why Images Use Dedicated Tables

Images are not embedded as repeated columns such as:

```text
image_1
image_2
image_3
```

Dedicated image tables are required because they support:

* Bounded image collections with a maximum of ten images per parent
* Explicit ownership
* Individual captions
* Individual alt text
* Independent ordering
* Primary-image selection
* Separate audit information
* Cleaner parent tables

---

## 17.3 Storage Paths

A storage path should be stable and unique within its bucket.

A path uses the approved server-generated convention:

```text
{entity-type}/{entity-id}/{generated-uuid}.{extension}
```

The private bucket is `tourism-media`. Supported extensions are `jpg`, `png`, and `webp`; original filenames are not stored in paths.

---

## 17.4 Thumbnail References

Parent content tables may store:

```text
thumbnail_bucket
thumbnail_path
```

These fields are cached references to the selected display thumbnail.

The authoritative gallery relationship remains in the relevant image table.

When a primary image changes, the thumbnail reference must remain synchronized.

This deliberate denormalization is allowed because it simplifies frequent listing queries, provided synchronization is enforced consistently.

Narrow transactional functions enforce synchronization. Selecting a primary image clears the prior primary row and copies the selected bucket/path to the parent. Deleting a primary image selects the remaining lowest-order image or clears both parent thumbnail fields when no image remains and the parent lifecycle constraints permit it.

The approved RPC responsibilities are divided across `media_insert`, `media_update`, `media_set_primary`, `media_replace`, `media_reorder`, and `media_delete`. Together they validate ownership, maintain normalized order, preserve exactly one primary while images remain, synchronize parent thumbnails, return replaced or deleted paths for Storage cleanup, and apply deterministic fallback behavior.

For the six supported image tables, authenticated administration retains `SELECT` but direct `INSERT`, `UPDATE`, and `DELETE` are revoked. All metadata mutations pass through administrator-only database functions with fixed `search_path`, static entity mappings, and explicit parent/image ownership checks. Table constraints independently require the `tourism-media` bucket and an owning entity/parent path.

The first federated administrator implementation supports `destination_images`, `package_images`, `homestay_images`, `umkm_images`, `traditional_house_images`, and `cultural_event_images`. Article-image tables remain part of the schema but are not exposed by the media administrator until their parent administrator modules exist.

For content types that expose thumbnail references, both `thumbnail_bucket` and `thumbnail_path` are required before publication. Additional gallery images remain optional. Image pixel and byte limits are application/upload validation rules and are not encoded as database constraints.

---

# 18. Publication Status Model

Publication status should exist on:

* `village_profiles`
* `destinations`
* `tourism_packages`
* `homestays`
* `umkms`
* `traditional_houses`
* `cultural_articles`
* `customary_institution_articles`
* `cultural_events`
* `gallery_items`
* `contacts`

Publication status is not required on:

* `destination_categories`, because the three rows are fixed system data
* Image association tables
* `package_destinations`
* `site_settings`

Site settings use `is_public` rather than publication status because settings have a different visibility model.

Image visibility follows the parent content's status.

Anonymous and non-administrator authenticated clients do not receive direct base-table grants. Public reads use explicit security-definer, column-limited views named `published_*` plus `public_site_settings`. Each view filters to published or explicitly public rows and omits private source notes, consent metadata, and audit columns. Base tables remain protected by RLS and are available only to the configured administrator.

---

## 18.1 Status Transitions

Typical transitions are:

```text
draft → published
published → archived
archived → draft
```

New records default to `draft`. Restored records always return to `draft` and must pass publication validation before they can be published again.

---

## 18.2 Publication Requirements

A record must satisfy its entity-specific required fields before becoming published.

Status alone does not guarantee valid public content.

---

# 19. Auditing

Every content table must include:

```text
created_at
updated_at
created_by
updated_by
```

## 19.1 Purpose of Audit Fields

Audit fields provide:

* Accountability
* Editorial traceability
* Easier troubleshooting
* Safer handover
* Change investigation
* Support for future revision history
* Identification of administrator contributions

---

## 19.2 Audit Rules

1. `created_at` and `created_by` must not change after record creation.
2. `updated_at` and `updated_by` must change when editorial data changes.
3. System-maintained timestamp changes must be consistent.
4. Administrator account recovery or replacement must not erase historical UUID references.
5. Audit fields do not replace full version history.
6. A dedicated content revision model should only be added if required later.

---

# 20. Archive and Restore Strategy

Version 1 managed content is retained through publication status rather than soft deletion. Content entities do not include `deleted_at` or `deleted_by`, and the dashboard exposes no permanent-delete action.

Rules:

1. Archiving changes a published or draft record to `archived`.
2. Archived records never appear publicly.
3. Archived records remain visible in an administrator recovery view.
4. Restoring changes an archived record to `draft`.
5. Restored records must revalidate required fields, uniqueness, and relationships before publication.
6. A slug that has ever been published remains unchanged through archive and restore.
7. Fixed destination categories cannot be archived or deleted.
8. Controlled replacement or cleanup of image files and junction rows is an internal media/relationship operation, not permanent deletion of the parent content record.

---

# 21. Relationship Definitions

## 21.1 Destination Categories and Destinations

```text
destination_categories one-to-many destinations
```

Each destination has one primary category.

Each category may contain many destinations.

---

## 21.3 Destinations and Images

```text
destinations one-to-many destination_images
```

Each image belongs to exactly one destination.

---

## 21.4 Packages and Destinations

```text
tourism_packages many-to-many destinations
through package_destinations
```

A package contains multiple destinations.

A destination may appear in multiple packages.

---

## 21.5 Packages and Images

```text
tourism_packages one-to-many package_images
```

---

## 21.6 Homestays and Images

```text
homestays one-to-many homestay_images
```

---

## 21.7 UMKM and Images

```text
umkms one-to-many umkm_images
```

---

## 21.8 Traditional Houses and Images

```text
traditional_houses one-to-many traditional_house_images
```

---

## 21.9 Cultural Articles and Images

```text
cultural_articles one-to-many cultural_article_images
```

---

## 21.10 Customary Institution Articles and Images

```text
customary_institution_articles
one-to-many
customary_institution_article_images
```

---

## 21.11 Cultural Events and Images

```text
cultural_events one-to-many cultural_event_images
```

---

## 21.12 Village Relationship

Conceptually:

```text
Desa Karang Bajo
    |
    +-- village profile
    +-- destinations
    +-- tourism packages
    +-- homestays
    +-- UMKM
    +-- traditional houses
    +-- cultural articles
    +-- customary institution articles
    +-- cultural events
    +-- contacts
```

Version 1 does not require a separate `villages` table because the system represents one village.

Adding `village_id` to every table would create repetitive data without current value.

A `villages` entity should only be introduced if the platform expands to multiple villages.

---

# 22. Content Ownership Boundaries

## 22.1 Village Profile

Owns:

* General village introduction
* General village history
* Official address
* General vision and mission
* Village-wide description

Does not own:

* Destination-specific descriptions
* Customary institution details
* Event schedules
* Homestay data
* UMKM data

---

## 22.2 Destination

Owns:

* Destination name
* Destination history
* Visitor description
* Coordinates
* Destination facilities
* Entrance fee
* Destination contact
* Destination images

Does not own:

* Package price
* General village history
* General cultural articles
* Homestay information

---

## 22.3 Tourism Package

Owns:

* Package type
* Package duration
* Package price
* Included services
* Souvenir
* Ordered package itinerary
* Package-specific notes

Does not own:

* Destination master descriptions
* Destination coordinates
* Homestay inventory
* Booking data

---

## 22.4 Traditional House

Owns:

* House-specific identity
* History
* Cultural significance
* Visitor rules
* Location
* House images

Does not own:

* General customary institution structures
* General village history
* Scheduled cultural events

---

## 22.5 Cultural Article

Owns:

* General cultural knowledge
* Traditions
* Community practices
* Cultural interpretation
* Supporting cultural images

Does not own:

* Traditional-house master data
* Customary institution structures
* Event schedules

---

## 22.6 Customary Institution Article

Owns:

* Bayan customary institution information
* Institutional roles
* Institutional history
* Customary structures
* Verified institutional documentation

Does not own:

* General village profile
* Traditional-house visitor data
* Event occurrences

---

## 22.7 Cultural Event

Owns:

* Event title
* Date and time
* Event location
* Organizer
* Attendance information
* Event-specific images

Does not own:

* General cultural explanations
* Permanent destination information

---

## 22.8 Homestay

Owns:

* Homestay identity
* Owner
* Contact
* Nightly price
* Facilities
* Location
* Homestay images

Does not own:

* Reservations
* Room inventory
* Tourism package pricing

---

## 22.9 UMKM

Owns:

* Business identity
* Owner
* Category
* Description
* Location
* Contact methods
* Business images

Does not own:

* Product inventory
* Orders
* Payment transactions

---

## 22.10 Gallery

Owns:

* Standalone visual documentation
* General village gallery images
* Cross-cutting visual content

Does not replace dedicated content image tables.

---

# 23. Normalization Decisions

## 23.1 Normalized Relationships

The following relationships are normalized:

* Packages and destinations
* Content and multiple images
* Destinations and categories

---

## 23.2 Controlled Denormalization

The following duplication is intentionally allowed:

```text
thumbnail_path
thumbnail_bucket
```

These references may exist on parent content tables to simplify high-frequency public listing queries.

The authoritative image collection remains in the dedicated image table.

---

## 23.3 Structured Lists

Fields such as:

* Facilities
* Included facilities

Use PostgreSQL `text[]` with an empty-array default when:

* The list has no independent business identity
* Items are edited only as part of the parent content
* No cross-entity reporting is required
* Validation remains consistent

A separate facilities table is intentionally omitted from Version 1.

---

# 24. Fields Intentionally Omitted

## 24.1 Booking

No booking entities are included.

Omitted concepts include:

* Reservations
* Booking status
* Guest details
* Availability
* Cancellation

Reason:

The platform is informational in Version 1.

---

## 24.2 Payments

No payment entities are included.

Omitted concepts include:

* Transactions
* Payment methods
* Invoices
* Refunds
* Settlement status

Reason:

Payment introduces financial and operational responsibilities outside the approved scope.

---

## 24.3 Ratings and Reviews

No rating or review tables are included.

Reason:

They would require:

* Visitor accounts
* Moderation
* Abuse prevention
* Review verification
* Privacy rules

---

## 24.4 Favorites

No favorites table is included.

Reason:

Favorites require visitor accounts or persistent anonymous tracking, neither of which is required.

---

## 24.5 Recommendation Data

No recommendation or user-behavior entities are included.

Reason:

The system does not have validated recommendation requirements or sufficient behavioral data.

---

## 24.6 Route Data

No route, graph, travel-time, or pathfinding entities are included.

Reason:

Navigation is delegated to external map services.

---

## 24.7 PostGIS Geometry

No geometry or geography columns are included.

Reason:

Latitude and longitude satisfy current map requirements.

---

## 24.8 Multi-Village Support

No `villages` table is included.

Reason:

The production system currently serves only Desa Karang Bajo.

---

## 24.9 Content Revisions

No complete revision-history table is included.

Reason:

Audit metadata is sufficient for Version 1.

A revision system may be added if administrators require version comparison or rollback.

---

## 24.10 Translation Tables

The current database schema is single-language. No multilingual translation entity, locale column, translated field, translated public view, or translation-specific policy exists.

Reason:

The approved bilingual public-shell Phase 1 localizes static application copy only. It does not store or publish English database-managed content and therefore requires no schema change.

Database translation is a future, separately reviewed capability beginning with a proposed Village Profile pilot. Any translation columns or tables require an approved logical model, migration, RLS and public-view review, admin workflow, and publication rules before implementation. This document does not imply that those structures currently exist.

---

# 25. Complete Table Summary

| Table                                  | Responsibility                                |
| -------------------------------------- | --------------------------------------------- |
| `private.app_config`                   | Protected singleton administrator UUID configuration |
| `village_profiles`                     | Official village profile                      |
| `destination_categories`               | Destination classification                    |
| `destinations`                         | Tourism destination master data               |
| `destination_images`                   | Destination galleries                         |
| `tourism_packages`                     | Tourism package information                   |
| `package_destinations`                 | Package-to-destination relationship           |
| `package_images`                       | Package galleries                             |
| `homestays`                            | Homestay information                          |
| `homestay_images`                      | Homestay galleries                            |
| `umkms`                                | Local UMKM information                        |
| `umkm_images`                          | UMKM galleries                                |
| `traditional_houses`                   | Traditional-house documentation               |
| `traditional_house_images`             | Traditional-house galleries                   |
| `cultural_articles`                    | General cultural articles                     |
| `cultural_article_images`              | Cultural article images                       |
| `customary_institution_articles`       | Bayan customary institution articles          |
| `customary_institution_article_images` | Customary institution article images          |
| `cultural_events`                      | Cultural and traditional events               |
| `cultural_event_images`                | Cultural event images                         |
| `gallery_items`                        | Standalone public gallery content             |
| `contacts`                             | Official public contact channels              |
| `site_settings`                        | Limited administrator-managed public settings |

---

# 26. Relationship Summary

| Parent                           | Relationship                  | Child                                         |
| -------------------------------- | ----------------------------- | --------------------------------------------- |
| `destination_categories`         | One-to-many                   | `destinations`                                |
| `destinations`                   | One-to-many                   | `destination_images`                          |
| `tourism_packages`               | Many-to-many                  | `destinations` through `package_destinations` |
| `tourism_packages`               | One-to-many                   | `package_images`                              |
| `homestays`                      | One-to-many                   | `homestay_images`                             |
| `umkms`                          | One-to-many                   | `umkm_images`                                 |
| `traditional_houses`             | One-to-many                   | `traditional_house_images`                    |
| `cultural_articles`              | One-to-many                   | `cultural_article_images`                     |
| `customary_institution_articles` | One-to-many                   | `customary_institution_article_images`        |
| `cultural_events`                | One-to-many                   | `cultural_event_images`                       |
| `auth.users`                     | One-to-many audit references  | Content and image records                     |

---

# 27. Complete ERD

```text
destination_categories
  1
  |
  | many
destinations
  |
  +-- 1 to many destination_images
  |
  +-- many to many tourism_packages
          through package_destinations


tourism_packages
  |
  +-- 1 to many package_images
  |
  +-- many to many destinations
          through package_destinations


homestays
  |
  +-- 1 to many homestay_images


umkms
  |
  +-- 1 to many umkm_images


traditional_houses
  |
  +-- 1 to many traditional_house_images


cultural_articles
  |
  +-- 1 to many cultural_article_images


customary_institution_articles
  |
  +-- 1 to many customary_institution_article_images


cultural_events
  |
  +-- 1 to many cultural_event_images


village_profiles
  |
  +-- singleton public village profile


gallery_items
  |
  +-- standalone public images


contacts
  |
  +-- public contact channels


site_settings
  |
  +-- controlled public configuration
```

---

# 28. Future Migration Notes

When translating this logical model into Supabase PostgreSQL migrations:

1. Define shared publication-status values consistently.
2. Add database constraints for latitude and longitude ranges.
3. Enforce coordinate pair consistency.
4. Enforce non-negative price and duration values.
5. Add partial uniqueness rules for primary images.
6. Define foreign-key retention behavior explicitly; parent content is never permanently deleted in Version 1.
7. Preserve administrator audit references when Auth credentials are recovered or replaced.
8. Avoid cascading deletion from parent content to storage files.
9. Enable Row Level Security on all application tables.
10. Separate public read policies from administrative write policies.
11. Ensure draft and archived content is never publicly readable.
12. Create indexes based on public listing and dashboard query patterns.
13. Generate `updated_at` consistently.
14. Do not create application user or role tables for Version 1.
15. Restrict authenticated policies to the configured administrator Auth UUID.
16. Seed controlled publication statuses or implement them as a database enum.
17. Define a documented synchronization rule for primary images and thumbnail paths.
18. Preserve storage bucket and path together in every media reference.
19. Test restore behavior before production handover.
20. Do not add translation fields, tables, views, or policies as part of bilingual public-shell Phase 1; future database translation requires a separately approved schema revision.
21. Store facilities and included facilities as `text[]` with an empty-array default.
22. Enforce the approved Indonesian-rupiah price semantics and optional `price_note` fields.
23. Do not add booking, payment, rating, review, or PostGIS entities without an approved architecture and PRD change.
