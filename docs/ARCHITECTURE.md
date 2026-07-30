# System Architecture

## 1. Document Purpose

This document defines the production architecture of the Karang Bajo Tourism Information System.

It establishes:

* System boundaries
* Major architectural components
* Responsibilities between components
* Data flow
* Technology responsibilities
* Deployment structure
* Security boundaries
* Backup strategy
* Long-term architectural constraints

This document does not define:

* Detailed feature requirements
* User-interface layouts
* Database tables or field definitions
* API payload structures
* Coding conventions
* Detailed implementation procedures

Those concerns belong in `prd.md`, `design.md`, `schema.md`, and `rules.md`.

---

## 2. Architecture Objectives

The architecture must support a production tourism information system that can continue operating after the KKN program ends.

The primary architectural objectives are:

1. Minimize the number of services that must be operated manually.
2. Allow village administrators to manage content without technical knowledge.
3. Keep public access separate from administrative access.
4. Use managed platforms for database, authentication, storage, and deployment.
5. Avoid infrastructure that requires dedicated system administration.
6. Support future growth without introducing speculative complexity.
7. Keep GIS functionality proportional to the actual tourism requirements.
8. Preserve clear ownership of content, media, geographic data, and application code.

The architecture prioritizes operational sustainability over technical sophistication.

---

## 3. Architecture Principles

### 3.1 Simplicity

The system uses a small number of managed services with clearly separated responsibilities.

New infrastructure must not be introduced when an existing platform already satisfies the requirement.

### 3.2 Maintainability

The architecture must remain understandable to future developers who were not involved in the initial implementation.

Application responsibilities, platform responsibilities, and data responsibilities must remain explicit.

### 3.3 Low Operational Burden

The village government is not expected to operate servers, maintain containers, configure operating systems, or manage database processes.

Infrastructure that requires continuous technical supervision is intentionally avoided.

### 3.4 Separation of Public and Administrative Concerns

The public website is optimized for tourism discovery and information access.

The administration dashboard is optimized for controlled content management.

The two areas may exist within the same Next.js application, but they must remain logically separated in routing, access control, responsibilities, and user experience.

### 3.5 Managed Backend Services

Authentication, database, and object storage are provided by Supabase.

This reduces the amount of custom backend infrastructure that must be built and maintained.

### 3.6 Controlled Extensibility

The architecture should support additional features when actual operational requirements emerge.

It must not include unused abstractions, services, or infrastructure solely for hypothetical future use.

### 3.7 GIS as a Supporting Capability

GIS exists to help users discover and understand tourism locations.

It is not the primary domain of the system and must not introduce unnecessary spatial infrastructure.

---

## 4. System Context

### 4.1 Primary System Context

```text
+--------------------+
|      Visitors      |
| Domestic and       |
| International      |
+---------+----------+
          |
          | HTTPS
          v
+--------------------+
|   Public Website   |
|      Next.js       |
+---------+----------+
          |
          | Read published content
          | and media references
          v
+--------------------+
|      Supabase      |
| Auth, Database,    |
| Storage Services   |
+----+-----------+---+
     |           |
     |           |
     v           v
+---------+   +----------------+
| Storage |   |   PostgreSQL   |
| Images  |   | Content and    |
| Media   |   | Configuration  |
+---------+   +----------------+
```

Visitors access published tourism information through the public website.

The public website retrieves structured content from the Supabase database and media assets from Supabase Storage.

Visitors do not directly access administrative functionality.

---

### 4.2 Administrative System Context

```text
+----------------------+
| Single Administrator |
+----------+-----------+
           |
           | Secure authentication
           v
+----------------------+
|   Admin Dashboard    |
|      Next.js         |
+----------+-----------+
           |
           | Authenticated operations
           v
+----------------------+
|   Supabase Services  |
+-----+----------+-----+
      |          |
      |          |
      v          v
+-----------+  +----------------+
| Supabase  |  |   PostgreSQL   |
| Storage   |  | Managed Content|
+-----------+  +----------------+
```

The single administrator authenticates through Supabase Auth. Any anonymous visitor or other Auth identity is denied administrative access.

All administrative changes are stored in Supabase and become available to the public website according to publication rules defined by the product requirements.

---

### 4.3 Complete System Context

```text
                             +----------------------+
                             |      QGIS User       |
                             | Initial GIS Data     |
                             | Preparation          |
                             +----------+-----------+
                                        |
                                        | Validated coordinates
                                        | and reference data
                                        v
+-------------+                +----------------------+
|   Visitors  |                | Single Administrator |
+------+------+                +----------+-----------+
       | HTTPS                            |
       |                                  | Secure login
       v                                  v
+----------------------+        +----------------------+
|   Public Website     |        |   Admin Dashboard    |
|      Next.js         |        |      Next.js         |
+----------+-----------+        +----------+-----------+
           |                               |
           | Read published data           | Manage content
           |                               |
           +---------------+---------------+
                           |
                           v
                +----------------------+
                |      Supabase        |
                | Auth, Database,      |
                | Storage              |
                +----+------------+----+
                     |            |
                     v            v
             +-------------+  +----------------+
             |   Storage   |  |   PostgreSQL   |
             | Images and  |  | Tourism Data   |
             | Media       |  | and Settings   |
             +-------------+  +----------------+
                     ^
                     |
                     | Optimized WebP media
                     |
             +-------+--------+
             | Media Upload   |
             | and Validation |
             +----------------+
```

---

## 5. High-Level Components

## 5.1 Public Website

The public website presents approved tourism information to visitors.

Its responsibilities are:

* Render public tourism content
* Provide discoverable and searchable page structures
* Display tourism locations on interactive maps
* Present optimized images
* Provide destination and cultural information
* Support mobile and desktop access
* Expose only published content
* Provide metadata suitable for search engines and social sharing

The public website must not:

* Expose administrative controls
* Permit anonymous content modification
* Contain private administrative data
* Perform advanced GIS processing
* Become dependent on QGIS during normal operation
* Implement booking or payment functionality in Version 1

---

## 5.2 Admin Dashboard

The admin dashboard is the controlled content-management area of the system.

Its responsibilities are:

* Authenticate the single administrator
* Provide content-management workflows
* Validate administrative input
* Manage publication state
* Upload and associate media
* Manage geographic coordinates
* Maintain public contact information and settings
* Restrict all operations to the configured administrator identity

The dashboard is not intended to be a general-purpose enterprise CMS.

It should contain only the controls required to manage the approved tourism information scope.

---

## 5.3 Authentication

Authentication verifies the identity of the single administrator.

Supabase Auth is responsible for:

* User sign-in
* Session handling
* Authentication state
* Password-based access
* Account identity

Authentication does not by itself determine what an administrator may manage.

Authorization rules must independently restrict access to protected data and operations.

---

## 5.4 Database

Supabase PostgreSQL stores structured application data.

Its responsibilities include storing:

* Tourism content
* Geographic coordinates
* Content relationships
* Publication state
* Administrative configuration
* Media metadata
* Contact and system settings

The database does not store raw image files.

Detailed table structures, constraints, relationships, and indexes belong in `schema.md`.

---

## 5.5 Storage

Supabase Storage stores approved entity-owned images in one private bucket named `tourism-media`.

Its responsibilities are:

* Persistent object storage
* Controlled administrative uploads
* Private media delivery through short-lived signed URLs
* Stable media references
* Integration with Supabase authorization policies

Storage must remain separate from structured database records.

The database stores media references and metadata, while Storage contains the actual files.

Anonymous visitors and non-administrator Auth identities have no direct bucket access. Administrator access is enforced by Storage policies through `public.is_admin()`. Future public pages must verify that the owning parent is published before generating a short-lived signed URL server-side; signed URLs are never persisted.

---

## 5.6 Map Service

The map service is implemented using Leaflet with OpenStreetMap as the base map source.

Its responsibilities are:

* Render interactive maps
* Display markers for destinations, traditional houses, homestays, and visitable UMKM
* Differentiate tourism categories
* Display location popups
* Connect map markers to destination details
* Provide external location or navigation links when required
* Combine records that use the same approved coordinate pair into one marker

Leaflet does not own tourism data.

It visualizes coordinates retrieved from the application data source.

---

## 5.7 GIS Preparation

QGIS supports initial geographic data preparation and validation.

Its responsibilities are limited to:

* Inspecting destination coordinates
* Validating location accuracy
* Preparing initial geographic reference data
* Reviewing coordinate placement
* Exporting or recording validated location information

QGIS is not part of the deployed web application.

It is not required for daily administration.

---

## 5.8 Media Management

Media management covers the lifecycle of images used by the public website.

Its responsibilities include:

* Accepting authorized uploads
* Validating supported formats
* Restricting invalid or unsafe files
* Enforcing practical file-size limits
* Accepting JPEG, PNG, and WebP images up to 5 MiB
* Verifying deterministic binary signatures rather than trusting filenames or browser MIME values
* Storing files in Supabase Storage
* Recording media metadata
* Associating media with content
* Supporting replacement and removal

Media ownership is federated through the existing entity-specific image tables. Every object belongs to exactly one parent and is stored at `{entity-type}/{entity-id}/{generated-uuid}.{extension}`. Entity types come from a server allowlist, while parent and image ownership are re-read on the server.

Each parent may have at most ten images and one primary image. Transactional database functions synchronize primary-image state with the parent's cached thumbnail bucket and path, normalize ordering, select a fallback primary after deletion, and clear the thumbnail pair when a draft or archived gallery becomes empty.

The `authenticated` role retains administrator read access to the six supported image tables but has no direct `INSERT`, `UPDATE`, or `DELETE` privilege. Metadata mutations use narrowly scoped `SECURITY DEFINER` functions owned by the database owner. Each function fixes its `search_path`, checks `public.is_admin()`, accepts only statically mapped entity/table combinations, and validates parent and image ownership before writing. `PUBLIC` and `anon` cannot execute these functions.

Uploads, replacements, and deletions use authenticated server mutations. Failed metadata writes remove newly uploaded objects. Replacement removes the old object only after the database points to the new object. Failed Storage cleanup is treated as an orphan-cleanup failure and is never reported as complete success.

Media management should remain understandable to non-technical administrators.

It must not expose storage paths, bucket internals, or infrastructure terminology unnecessarily.

---

## 5.9 Content Management

Content management controls how tourism information is created and maintained.

Its responsibilities are:

* Create content
* Edit content
* Publish, archive, and restore content
* Associate media
* Assign the fixed destination categories `Alam`, `Budaya`, and `Religi`
* Maintain destination coordinates
* Maintain descriptive and contact information
* Prevent unauthorized modification

Content-management responsibilities are implemented through the admin dashboard and enforced through Supabase authorization controls.

All new managed content starts as draft. The administrator can publish, archive, and restore; restoration returns content to draft. Version 1 exposes no permanent-delete operation. Public slugs are generated by the application, omitted from normal admin forms, and frozen after first publication.

All informational price columns use one numeric Indonesian-rupiah contract: `0` is free, `null` is unavailable, and a positive value is rupiah. Optional price explanation is stored as `price_note`.

---

## 6. Public Website Architecture

The public website is the primary visitor-facing delivery layer.

It presents approved information without exposing internal administrative workflows.

### 6.1 Public Sections

The public website includes:

* Homepage
* Village Profile
* Tourism Destinations
* Destination Detail
* Interactive Map
* Tourism Packages
* Traditional Houses
* Culture and Bayan Customary Institutions
* Cultural Events
* Homestays
* UMKM
* Gallery
* Contact

---

### 6.2 Homepage

The homepage provides an overview of the village tourism offering.

It may present selected published content from other sections, but it must not become a separate source of duplicated content.

Featured items should reference the same managed data used by destination, event, culture, package, and accommodation sections.

---

### 6.3 Village Profile

The village profile presents official information about Desa Karang Bajo.

It is managed through the dashboard and delivered as public content.

It should not contain internal government administration data unless explicitly approved for publication.

---

### 6.4 Tourism Destinations

The destinations section lists approved tourism destinations.

Its responsibilities include:

* Destination discovery
* Category-based presentation
* Image presentation
* Summary information
* Links to destination details
* Map location access

Only destinations marked for publication should appear publicly.

---

### 6.5 Destination Detail

The destination detail page presents complete visitor-facing information for one destination.

It may include:

* Description
* Category
* Images
* Location
* Geographic coordinates represented through a map
* Relevant visitor information
* External navigation link

The page does not perform booking, payment, or route optimization.

---

### 6.6 Interactive Map

The interactive map provides geographic visualization of published tourism locations.

Eligible Version 1 sources are destinations, traditional houses, homestays, and visitable UMKM. Only published records with valid coordinates are included.

It includes:

* Markers
* Categories
* Popups
* Links to destination details
* Optional external Google Maps location or navigation links

Records with the same approved latitude and longitude are grouped into one combined marker whose popup links to each represented record. UMKM Tenun must share the Kampung Adat marker and must not produce a duplicate overlapping marker.

OpenStreetMap remains the base map.

Google Maps integration is limited to external interoperability where required, such as opening a destination in Google Maps. It is not the primary map-rendering platform.

---

### 6.7 Tourism Packages

The tourism packages section presents packages prepared and published by the administrator.

It provides information only.

It does not process reservations, availability, payments, or transactions.

---

### 6.8 Traditional Houses

This section documents traditional houses relevant to the tourism and cultural context of Desa Karang Bajo.

Traditional houses may be associated with:

* Descriptive content
* Images
* Location information
* Cultural context

Detailed content structure belongs in the product and data documents.

---

### 6.9 Culture and Bayan Customary Institutions

This section documents:

* Local cultural information
* Bayan customary institutions
* Village history
* Customary roles
* Relevant traditions

Content must remain administratively controlled because it represents cultural and institutional information.

---

### 6.10 Cultural Events

The events section presents approved cultural and traditional events.

The public website displays event information but does not provide ticketing or reservation functionality.

---

### 6.11 Homestays

The homestay section presents approved accommodation information.

It may include contact and location information but does not manage room inventory, availability, or booking.

---

### 6.12 UMKM

The UMKM section presents local businesses and products approved for publication.

The platform acts as an information channel, not an e-commerce marketplace.

---

### 6.13 Gallery

The gallery presents approved visual documentation.

Gallery assets are served from Supabase Storage and associated with managed content records.

---

### 6.14 Contact

The contact section presents official contact information and visitor guidance. One central village WhatsApp number is the primary call-to-action across visitor inquiry surfaces. Optional entity-specific contact data is shown only when publication consent is recorded.

It does not require a customer-support ticketing system in Version 1.

---

### 6.15 Public Website Boundaries

The public website must not include:

* Administrative editing
* User registration for visitors
* Payment processing
* Booking workflows
* Private user profiles
* Internal village documents
* Complex search infrastructure
* Advanced geographic analysis
* Server-side route computation

---

## 7. Admin Dashboard Architecture

## 7.1 Dashboard Responsibilities

Authorized administrators can manage:

* Village Profile
* Destinations
* Packages
* Traditional Houses
* Culture Articles
* Events
* Homestays
* UMKM
* Gallery
* Contacts
* Media
* Settings

---

## 7.2 Dashboard Philosophy

The dashboard must be task-oriented rather than technically oriented.

The administrator should interact with concepts they understand, such as:

* Destination
* Event
* Homestay
* Gallery
* Contact
* Publication status

They should not be required to understand:

* Database tables
* Storage buckets
* API endpoints
* Geographic data formats
* Deployment environments
* Internal identifiers

---

## 7.3 Operational Simplicity

The dashboard should avoid:

* Highly configurable page builders
* Plugin systems
* Nested administrative workflows
* Multi-step approval engines
* Custom scripting
* Bulk tools without a validated operational need

Version 1 should provide direct and predictable content-management workflows.

---

## 7.4 Version 1 Access Model

Version 1 has exactly two access states:

* Anonymous public visitor
* One authenticated administrator

There is no dashboard user management, role table, role assignment, editor account, invitation flow, or approval workflow. Supabase Auth remains the identity and session provider for the single administrator account. Account provisioning and credential recovery are operational platform tasks, not product features.

---

## 7.5 Settings Management

Settings should contain only values that administrators are reasonably expected to maintain.

Examples include:

* Public contact information
* General village information
* Public social links
* Basic site-wide content

Settings must not become a storage location for arbitrary application behavior or technical configuration.

Technical configuration remains controlled through the deployment environment.

---

## 8. GIS Architecture

## 8.1 Role of GIS

GIS supports the management and visualization of tourism-related locations.

It provides geographic context for published destinations and related tourism information.

GIS is not treated as a separate enterprise platform.

---

## 8.2 Current GIS Capabilities

Version 1 supports:

* Coordinates for destinations, traditional houses, homestays, and visitable UMKM
* Interactive markers
* Tourism categories
* Map popups
* Links between markers and relevant public detail pages
* Combined markers for identical approved coordinate pairs
* External Google Maps integration
* Coordinate validation through QGIS

No advanced spatial analysis is required.

---

## 8.3 Coordinate Model

Tourism locations are stored using latitude and longitude values.

This model is sufficient because the system primarily needs to:

* Position markers
* Display eligible tourism locations
* Open external navigation services
* Associate published content with a geographic point

The application does not currently require spatial relationships between complex geographic objects.

---

## 8.4 Why PostGIS Is Not Used

PostGIS is intentionally excluded from Version 1.

The current GIS requirements do not require:

* Spatial indexing for large geographic datasets
* Polygon operations
* Buffer queries
* Geometric intersections
* Nearest-neighbor search
* Server-side route analysis
* Geographic aggregation

Adding PostGIS would introduce:

* Additional schema complexity
* Specialized query requirements
* Additional developer knowledge requirements
* More complicated debugging and maintenance
* Infrastructure that would remain largely unused

Standard PostgreSQL numeric coordinate fields are sufficient for the approved requirements.

PostGIS may only be reconsidered if future validated requirements depend on server-side spatial operations.

---

## 8.5 Role of QGIS

QGIS is an offline preparation and validation tool.

It is used during initial data collection and when geographic verification is required.

Typical QGIS responsibilities include:

1. Review collected coordinates.
2. Compare coordinates with map references.
3. Correct inaccurate coordinates.
4. Validate that destinations are positioned correctly.
5. Provide confirmed latitude and longitude values.
6. Supply those values to the content-management process.

QGIS does not publish directly to the website.

It is not required for routine editing.

---

## 8.6 GIS Data Flow

```text
Field Survey or Existing Reference
                |
                v
       Coordinate Collection
                |
                v
        QGIS Validation
                |
                v
  Latitude and Longitude Values
                |
                v
       Admin Dashboard Entry
                |
                v
     Supabase PostgreSQL
                |
                v
       Next.js Public Site
                |
                v
        Leaflet Markers
                |
                v
             Visitor
```

The website receives geographic data from Supabase, not directly from QGIS.

This keeps the live production system independent from desktop GIS software.

---

## 8.7 Google Maps Integration

Google Maps is not the map-rendering foundation of the platform.

It is used only where external interoperability provides value, such as:

* Opening a destination in Google Maps
* Starting navigation
* Sharing an external map location

This avoids maintaining two embedded map implementations.

---

## 9. Data Flow

## 9.1 Content Publication Flow

```text
Village Officer
      |
      v
Admin Dashboard
      |
      v
Authentication and Authorization
      |
      v
Supabase PostgreSQL
      |
      v
Next.js Public Website
      |
      v
Published Information
      |
      v
Visitor
```

The dashboard writes controlled content to Supabase.

The public website reads only data that is eligible for public presentation.

---

## 9.2 Destination Map Flow

```text
Village Officer
      |
      v
Destination Form
      |
      v
Latitude, Longitude, Category
      |
      v
Supabase PostgreSQL
      |
      v
Next.js Data Access
      |
      v
Leaflet Map
      |
      v
Marker and Popup
      |
      v
Visitor
```

Leaflet does not maintain a separate geographic dataset.

It renders the same destination data used by the public destination pages.

---

## 9.3 Image Upload Flow

```text
Authorized Administrator
          |
          v
   Dashboard Upload
          |
          v
 File Type and Size Validation
          |
          v
  WebP Optimization Requirement
          |
          v
   Supabase Storage
          |
          +-------------------+
          |                   |
          v                   v
   Stored Media File   Media Metadata Record
                              |
                              v
                     Supabase PostgreSQL
                              |
                              v
                      Next.js Website
                              |
                              v
                           Visitor
```

The image file and its descriptive metadata are managed separately.

This prevents large binary files from being stored directly in the relational database.

---

## 9.4 Administrative Authentication Flow

```text
Administrator
      |
      v
Login Interface
      |
      v
Supabase Auth
      |
      v
Authenticated Session
      |
      v
Authorization Evaluation
      |
      v
Permitted Dashboard Operations
```

Authentication identifies the user.

Authorization determines which data and operations are accessible.

---

## 10. Technology Stack

## 10.1 Next.js

### Purpose

Next.js is the application framework for both the public website and the administration dashboard.

### Responsibility

Next.js is responsible for:

* Routing
* Page rendering
* Public content delivery
* Administrative interfaces
* Integration with Supabase
* Search-engine-friendly page delivery
* Application-level validation
* Deployment through Vercel

### Why It Was Chosen

Next.js provides a suitable balance between:

* Public website performance
* Search-engine visibility
* TypeScript support
* Component reuse
* Structured routing
* Deployment simplicity
* Long-term ecosystem support

The project requires both content-focused public pages and a secure administration interface. Next.js can support both within one maintainable application.

### Alternatives Considered

* React with a standalone build tool
* Laravel
* Traditional server-rendered templates
* Separate frontend and backend applications

### Why Alternatives Were Rejected

A standalone React application would require additional decisions for routing, rendering, SEO, and deployment behavior.

Laravel would duplicate backend responsibilities already provided by Supabase and introduce a second server platform.

Traditional server-rendered templates would reduce flexibility for the interactive map and dashboard experience.

Separate frontend and backend applications would increase deployment and maintenance complexity without providing sufficient benefit for the current scope.

---

## 10.2 TypeScript

### Purpose

TypeScript is the primary programming language for the application.

### Responsibility

TypeScript provides:

* Static type checking
* Clear data contracts
* Safer refactoring
* Better development tooling
* Reduced runtime mistakes
* Shared types across public and administrative modules

### Why It Was Chosen

The system contains multiple content entities and administrative workflows.

TypeScript helps maintain consistency between:

* Supabase data
* Form input
* Application services
* Public components
* Dashboard components

It improves maintainability for future developers.

### Alternatives Considered

* JavaScript
* Separate strongly typed backend language

### Why Alternatives Were Rejected

JavaScript provides less protection against inconsistent data handling and makes large refactors less predictable.

A separate backend language would introduce another runtime, repository concern, and deployment process without a current architectural need.

---

## 10.3 Supabase

### Purpose

Supabase is the managed backend platform.

### Responsibility

Supabase provides:

* PostgreSQL database
* Authentication
* Storage
* Authorization support
* Managed backend connectivity

### Why It Was Chosen

Supabase consolidates several backend responsibilities within one platform.

This reduces:

* Infrastructure count
* Deployment burden
* Server maintenance
* Authentication implementation effort
* Media-management complexity

Its PostgreSQL foundation also preserves data portability and relational data capabilities.

### Alternatives Considered

* Custom Laravel backend
* Express backend
* Firebase
* Self-hosted PostgreSQL with custom services

### Why Alternatives Were Rejected

Laravel and Express require a separately deployed and maintained backend service.

Firebase uses a document-oriented data model that is less appropriate for the structured relationships expected across tourism content.

A self-hosted PostgreSQL environment would require database administration, server maintenance, security updates, and backup operations beyond the intended operational capacity.

---

## 10.4 Supabase PostgreSQL

### Purpose

Supabase PostgreSQL is the system of record for structured application data.

### Responsibility

It stores:

* Tourism content
* Publication state
* Relationships
* Coordinates
* Media metadata
* Administrative configuration
* Authorization-related data

### Why It Was Chosen

PostgreSQL provides:

* Reliable relational data management
* Strong constraints
* Transaction support
* Structured querying
* Mature tooling
* Long-term portability

The project contains multiple related information types that benefit from relational consistency.

### Alternatives Considered

* MySQL
* Firebase Firestore
* Embedded databases
* Separate managed database providers

### Why Alternatives Were Rejected

MySQL would require an additional database platform without providing a meaningful benefit over the PostgreSQL already included in Supabase.

Firestore is not the preferred model for strongly related content.

Embedded databases are inappropriate for a multi-user production web system.

A separate managed database provider would increase service count and configuration complexity.

---

## 10.5 Supabase Auth

### Purpose

Supabase Auth provides administrator identity and session management.

### Responsibility

It handles:

* Administrative login
* Session creation
* Session persistence
* Account identity
* Authentication integration with Supabase authorization

### Why It Was Chosen

It is directly integrated with the selected backend platform and supports Row Level Security.

This avoids maintaining a custom authentication server.

### Alternatives Considered

* Custom authentication
* Auth.js
* Firebase Authentication
* External identity providers

### Why Alternatives Were Rejected

Custom authentication introduces avoidable security and maintenance risks.

Auth.js is capable but would add another authentication abstraction when Supabase Auth already satisfies the requirement.

Firebase Authentication would introduce a second backend ecosystem.

External identity providers are unnecessary for the single Version 1 administrator.

---

## 10.6 Supabase Storage

### Purpose

Supabase Storage stores public website images and managed media assets.

### Responsibility

It provides:

* Object storage
* Media delivery
* Access control
* Integration with administrative authentication
* Stable file references

### Why It Was Chosen

It is integrated with Supabase authentication and authorization.

This keeps media, data, and administrative access within one managed platform.

### Alternatives Considered

* Local filesystem storage
* Vercel filesystem
* Cloudinary
* Amazon S3
* Firebase Storage

### Why Alternatives Were Rejected

Local filesystems and Vercel deployment storage are not appropriate for persistent user uploads.

Cloudinary provides advanced media capabilities that exceed the current requirements.

Amazon S3 would introduce separate credentials, policies, billing, and operational responsibilities.

Firebase Storage would introduce another platform without architectural benefit.

---

## 10.7 Leaflet

### Purpose

Leaflet provides interactive map rendering in the browser.

### Responsibility

It manages:

* Map display
* Marker rendering
* Popups
* Category visualization
* User interaction with map elements

### Why It Was Chosen

Leaflet is:

* Lightweight
* Open source
* Widely adopted
* Sufficient for point-based tourism visualization
* Independent from a proprietary map platform
* Compatible with OpenStreetMap

The project does not require a full enterprise GIS client.

### Alternatives Considered

* Google Maps JavaScript API
* Mapbox GL
* OpenLayers

### Why Alternatives Were Rejected

Google Maps would introduce API-key, billing, and provider-dependency concerns for the main map.

Mapbox GL provides capabilities beyond the current marker-based requirements and may introduce usage-based cost considerations.

OpenLayers is more suitable for complex GIS applications and would add unnecessary complexity for the current use case.

---

## 10.8 OpenStreetMap

### Purpose

OpenStreetMap provides the base map data displayed through Leaflet.

### Responsibility

It supplies the geographic visual context beneath tourism markers.

### Why It Was Chosen

OpenStreetMap is open, widely supported, and compatible with Leaflet.

It avoids making the main map dependent on a proprietary mapping platform.

### Alternatives Considered

* Google Maps
* Mapbox map tiles
* Custom map tile infrastructure

### Why Alternatives Were Rejected

Google Maps introduces platform dependency and potential billing complexity.

Mapbox provides advanced styling that is not required for Version 1.

Operating custom map tile infrastructure would create disproportionate infrastructure and maintenance requirements.

Production use must respect the usage policies of the selected tile provider. OpenStreetMap data and Leaflet do not by themselves guarantee unrestricted high-volume tile hosting.

---

## 10.9 QGIS

### Purpose

QGIS supports initial GIS data preparation and coordinate validation.

### Responsibility

It is used for:

* Coordinate inspection
* Location validation
* Initial GIS reference preparation
* Manual geographic verification

### Why It Was Chosen

QGIS is open source and provides mature desktop GIS capabilities without adding runtime dependencies to the web application.

### Alternatives Considered

* Manual coordinate entry without validation
* Proprietary desktop GIS
* Building GIS validation tools into the dashboard

### Why Alternatives Were Rejected

Unvalidated manual coordinate entry increases data-quality risk.

Proprietary GIS software would introduce licensing and accessibility concerns.

Building advanced coordinate-validation tools into the web dashboard would increase implementation scope for a workflow that is infrequent.

---

## 10.10 Vercel

### Purpose

Vercel hosts and deploys the Next.js application.

### Responsibility

It provides:

* Application builds
* Production deployment
* Preview deployment
* HTTPS delivery
* Environment configuration
* Integration with GitHub

### Why It Was Chosen

Vercel is closely aligned with Next.js and minimizes deployment administration.

It enables a small development team to maintain the application without operating a server.

### Alternatives Considered

* Self-hosted virtual server
* Shared hosting
* Container hosting
* Other serverless platforms

### Why Alternatives Were Rejected

A self-hosted virtual server requires operating-system maintenance, reverse-proxy configuration, security patching, and process supervision.

Shared hosting may not provide a suitable Next.js runtime.

Container hosting would add deployment configuration that is unnecessary for the current application.

Other serverless platforms may work but generally require more adaptation for Next.js than Vercel.

---

## 10.11 WebP

### Purpose

WebP is the standard image format for uploaded website media.

### Responsibility

It reduces file size while preserving suitable visual quality.

### Why It Was Chosen

Tourism websites are image-heavy.

WebP helps reduce:

* Storage usage
* Bandwidth usage
* Page load time
* Pressure on free or low-cost service limits

### Alternatives Considered

* JPEG
* PNG
* AVIF
* Original uploaded formats

### Why Alternatives Were Rejected

JPEG is less efficient for many website images.

PNG is unnecessarily large for photographic content.

AVIF may provide better compression but can add processing and compatibility considerations that are not required for the first version.

Allowing unrestricted original formats would create inconsistent storage and performance behavior.

Exceptions may be allowed for assets that require transparency or cannot be represented appropriately, but WebP remains the default.

---

## 11. Security Architecture

## 11.1 Authentication

Only the configured single administrator may access the dashboard.

Authentication is handled by Supabase Auth.

The public website does not require visitor accounts in Version 1.

---

## 11.2 Authorization

Authorization must be enforced independently from the user interface.

Hiding dashboard controls is not sufficient protection.

Access rules must protect:

* Administrative data
* Content modification
* Media upload
* Media replacement and association removal
* Settings modification

Authorization must follow the principle of least privilege.

---

## 11.3 Row Level Security

Row Level Security is the primary database-level authorization mechanism.

Its purpose is to ensure that database access remains restricted even when requests originate outside the expected dashboard interface.

RLS policies must distinguish between:

* Publicly readable content
* Content available only to the configured authenticated administrator
* Administrative mutation operations

Detailed policies belong in the implementation and data-security documentation.

---

## 11.4 Image Upload Validation

Media uploads must be validated at the application and platform boundary.

High-level validation must address:

* File type
* File size
* Supported extension
* Image validity
* File naming
* Unauthorized executable content
* Storage destination
* Upload permissions

The system must not trust the filename or browser-provided MIME type alone.

---

## 11.5 Environment Variables

Secrets and environment-specific configuration must not be stored in source code.

Environment variables are used for:

* Supabase connection configuration
* Public service configuration
* Server-side secrets
* Deployment-specific values

Only values explicitly safe for browser exposure may be included in public client-side configuration.

Sensitive credentials must remain server-side or platform-managed.

---

## 11.6 Public Data Exposure

Only content intended for publication should be publicly readable.

Administrative user details, internal settings, unpublished content, and operational metadata must not be exposed through public queries.

---

## 12. Deployment Architecture

## 12.1 Production Deployment Flow

```text
+-------------------+
|     Developer     |
+---------+---------+
          |
          | Commit and push
          v
+-------------------+
|      GitHub       |
| Source Repository |
+---------+---------+
          |
          | Deployment integration
          v
+-------------------+
|      Vercel       |
| Next.js Hosting   |
+---------+---------+
          |
          | Secure application access
          v
+-------------------+
|     Supabase      |
| Database, Auth,   |
| Storage           |
+---------+---------+
          |
          v
+-------------------+
|      Users        |
| Visitors and      |
| Administrators    |
+-------------------+
```

---

## 12.2 Runtime Architecture

```text
                        +----------------------+
                        |       Visitors       |
                        +----------+-----------+
                                   |
                                   | HTTPS
                                   v
+----------------------+  +----------------------+
|    Administrators    |->|   Vercel / Next.js  |
+----------------------+  +----------+-----------+
                                   |
                    +--------------+--------------+
                    |                             |
                    v                             v
          +-------------------+         +-------------------+
          | Supabase Database |         | Supabase Storage  |
          +-------------------+         +-------------------+
                    ^
                    |
                    v
          +-------------------+
          |   Supabase Auth   |
          +-------------------+
```

---

## 12.3 Deployment Responsibilities

### GitHub

GitHub is the source-of-truth repository for application code and technical documentation.

### Vercel

Vercel builds and serves the Next.js application.

### Supabase

Supabase hosts persistent application data, user authentication, and media.

### DNS and Domain

The public domain should point to the production Vercel deployment.

Domain ownership and renewal must be transferred to or controlled by an accountable village representative.

---

## 12.4 Environment Separation

At minimum, the project should distinguish between:

* Local development
* Production

A separate non-production Supabase project may be introduced if development activity creates unacceptable risk to production data.

Environment separation must remain proportional to the available maintenance capacity.

---

## 13. Backup Strategy

Backups are required because the system will contain tourism, cultural, geographic, and media information that may be difficult to reconstruct.

Long-term ownership cannot depend solely on the availability of one cloud account.

---

## 13.1 Database Backup

The PostgreSQL database must be backed up periodically.

The backup strategy should preserve:

* Tourism content
* Cultural content
* Coordinates
* Publication state
* Media metadata
* Settings
* Administrative configuration

Backups should be exportable in a standard PostgreSQL-compatible format where possible.

Backup responsibility, schedule, retention period, and restore ownership must be documented operationally before handover.

---

## 13.2 Image Backup

Supabase Storage content must be backed up independently from the database.

A database backup containing image URLs is not sufficient if the underlying files are lost.

Image backup should preserve:

* Original stored file
* Storage path
* File association
* Relevant metadata
* Folder or bucket structure where practical

A periodic copy should be retained outside the primary Supabase Storage account.

---

## 13.3 QGIS Backup

QGIS project files, coordinate references, exported layers, and field-survey data must be backed up.

These files provide evidence of how initial geographic data was validated.

QGIS backup should include:

* QGIS project files
* Source coordinate files
* Exported CSV or GeoJSON files
* Supporting notes
* Any locally referenced assets required to reopen the project

QGIS files must not exist only on one student's personal device.

---

## 13.4 Version Control Backup

Application code and technical documentation are stored in GitHub.

Version control preserves:

* Source-code history
* Documentation history
* Architectural decisions
* Deployment configuration
* Recovery from accidental code changes

Repository ownership must not remain dependent on a temporary personal account after handover.

At least one authorized village or institutional owner should have administrative access.

---

## 13.5 Credential Recovery

Operational ownership must include recovery access for:

* GitHub
* Vercel
* Supabase
* Domain registrar
* Official administrative email accounts

Backups are ineffective if the village loses access to the accounts required to restore or operate the system.

---

## 13.6 Backup Ownership

Each backup process must have an accountable owner.

A backup strategy without assigned responsibility, documented location, and restore procedure is not considered complete.

---

## 14. Future Extensibility

The architecture allows future capabilities to be added, but they are intentionally excluded from Version 1.

Future additions require validated requirements, maintenance ownership, and architectural review.

---

## 14.1 Booking

Booking is postponed because it requires:

* Availability management
* Reservation status
* Cancellation handling
* Administrator response procedures
* Notification workflows
* Operational ownership

Publishing tourism information does not require these responsibilities.

---

## 14.2 Payment

Payment integration is postponed because it introduces:

* Financial reconciliation
* Transaction security
* Refund handling
* Payment-provider dependency
* Regulatory and administrative obligations

Payment should not be added until there is a clear responsible organization and operating process.

---

## 14.3 Mobile Application

A native mobile application is postponed because the public website can provide mobile access through responsive design.

A native application would require:

* Separate development
* Separate release management
* Application-store maintenance
* Additional testing
* Long-term platform support

The current user needs do not justify this duplication.

---

## 14.4 Recommendation System

A recommendation engine is postponed because the system initially lacks sufficient user behavior data, content volume, and validated recommendation requirements.

Static categories and clear navigation are more appropriate for the initial scale.

---

## 14.5 Advanced GIS Analysis

Advanced spatial analysis is postponed because the current use case requires only location display.

It should only be reconsidered if future operations require spatial querying, regional analysis, route computation, or larger geographic datasets.

---

## 14.6 Offline Maps

Offline maps are postponed because they introduce:

* Tile packaging
* Synchronization
* Device storage management
* Licensing considerations
* More complex client behavior

They are not required for the current web-based information platform.

---

## 15. Architectural Decisions

| Decision                                                        | Reason                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Use one Next.js application for public and administrative areas | Reduces repository, deployment, and maintenance complexity while allowing logical separation                    |
| Use Supabase as the backend platform                            | Consolidates authentication, database, storage, and authorization support                                       |
| No Laravel backend                                              | Supabase already provides the required backend services, and a Laravel service would duplicate responsibilities |
| No Express backend                                              | A separate Node.js API layer is not justified by the current requirements                                       |
| Use PostgreSQL through Supabase                                 | Provides reliable relational storage and is already integrated with the backend platform                        |
| No MySQL                                                        | Introducing a second database platform provides no meaningful benefit                                           |
| Use Supabase Auth                                               | Avoids custom authentication infrastructure and integrates with RLS                                             |
| Use Supabase Storage                                            | Keeps persistent media management within the selected backend platform                                          |
| Store image metadata in PostgreSQL and files in Storage         | Separates structured records from binary objects                                                                |
| Use Leaflet                                                     | Lightweight, open source, and sufficient for marker-based tourism maps                                          |
| Use OpenStreetMap as the base map                               | Avoids dependency on a proprietary map provider for the main map                                                |
| Use Google Maps only as an external integration                 | Supports familiar navigation without duplicating the embedded map architecture                                  |
| Store latitude and longitude directly                           | Satisfies the current point-location requirements                                                               |
| No PostGIS in Version 1                                         | Current requirements do not justify spatial database complexity                                                 |
| Use QGIS only for preparation and validation                    | Preserves GIS accuracy without making desktop GIS part of daily operations                                      |
| Use Vercel                                                      | Minimizes operational burden for Next.js deployment                                                             |
| Use WebP for standard media                                     | Reduces storage and bandwidth usage                                                                             |
| No custom server infrastructure                                 | The village should not need to operate or patch servers                                                         |
| No microservices                                                | The project scale and team do not justify distributed-service complexity                                        |
| Public and admin concerns remain logically separated            | Protects administrative workflows and keeps visitor navigation focused                                          |
| Row Level Security is mandatory                                 | Authorization must be enforced at the data layer, not only in the interface                                     |
| GitHub is the source of truth for code and documentation        | Supports traceability, recovery, and handover                                                                   |
| Back up database, media, and GIS files separately               | Each contains different information and cannot fully replace the others                                         |
| Use one administrator account in Version 1                      | Keeps authentication and authorization proportional to the approved operating model                            |
| Use Indonesian-only managed content                             | Version 1 has no translation workflow or multilingual schema                                                    |
| Keep destination categories fixed                               | `Alam`, `Budaya`, and `Religi` are stable system data and require no dashboard management                       |
| Generate and freeze public slugs                                | Slugs stay out of routine forms and remain stable after first publication                                       |
| Use numeric Indonesian-rupiah price semantics                   | `0` means free, `null` unavailable, and positive values are rupiah; `price_note` remains optional                |
| Use one central WhatsApp CTA                                    | Visitor inquiries have one consistent village-owned primary channel                                             |
| Combine identical map coordinates                               | Co-located records use one marker; UMKM Tenun and Kampung Adat must not overlap                                 |
| Keep the root `app/` structure                                  | The current project structure is approved and will not migrate to `src/`                                        |
| Use npm with the existing lockfile                              | `package-lock.json` remains the reproducible dependency source                                                  |
| Use Tailwind CSS                                                | Tailwind is approved for Version 1 styling                                                                      |
| Store browser assets in `public/`                               | Framework-served static assets have one conventional repository location                                        |

---

## 16. Out of Scope for Version 1

## 16.1 Microservices

Microservices are excluded because the system does not have the scale, team structure, or independent deployment needs that justify distributed services.

They would introduce:

* Service coordination
* Network failure modes
* Distributed logging
* More deployments
* More complex testing
* Increased maintenance burden

---

## 16.2 Docker

Docker is excluded from the production architecture because the selected services are managed platforms.

The system does not require a custom production container runtime.

Developers may use local tooling independently, but Docker must not become a production dependency without a validated need.

---

## 16.3 Kubernetes

Kubernetes is excluded because there are no containerized production services requiring orchestration.

It would be operationally disproportionate to the system.

---

## 16.4 Redis

Redis is excluded because Version 1 does not require:

* Distributed caching
* Session storage
* Queues
* Rate-limit coordination
* High-volume ephemeral state

Introducing Redis would add another service without a current responsibility.

---

## 16.5 RabbitMQ or Other Message Brokers

Message brokers are excluded because the system has no asynchronous workflow requiring durable queues.

Content publication and media management can be completed through direct application and platform operations.

---

## 16.6 Custom Backend Server

A separately deployed custom backend is excluded because Supabase provides the required backend responsibilities.

A custom backend may only be introduced if a future requirement cannot be safely or maintainably handled through the existing architecture.

---

## 16.7 Server-Side GIS Analysis

Server-side GIS analysis is excluded because the system only requires point storage and map visualization.

There is no approved requirement for spatial computation.

---

## 16.8 Advanced Spatial Processing

The following are excluded:

* Buffer analysis
* Polygon analysis
* Spatial intersection
* Nearest-neighbor queries
* Route computation
* Topology processing
* Raster processing

These capabilities would require infrastructure and specialist maintenance not justified by Version 1.

---

## 16.9 Native Mobile Applications

Native Android and iOS applications are excluded.

The responsive public website is the supported mobile experience.

---

## 16.10 Offline-First Architecture

Offline synchronization, local databases, conflict resolution, and offline maps are excluded because the system is designed as an online tourism information platform.

---

## 16.11 Enterprise CMS Platforms

External enterprise CMS platforms are excluded because they would duplicate the content-management responsibilities of the custom dashboard and Supabase architecture.

---

## 16.12 Plugin Architecture

A plugin system is excluded because the project has a defined scope and a small administrative user base.

Plugin systems increase compatibility, security, and maintenance risk.

---

## 16.13 Event-Driven Distributed Architecture

Event buses, distributed consumers, and event-sourced patterns are excluded because the application does not require independent asynchronous domains.

---

## 16.14 Complex Caching Layers

Dedicated application caches are excluded until measured production behavior demonstrates a real performance need.

Premature caching would increase data-consistency and invalidation complexity.

---

## 17. Architecture Boundaries

The architecture is considered valid while the following conditions remain true:

* The system primarily publishes tourism information.
* Version 1 has exactly one authenticated administrator.
* Geographic data remains primarily point-based.
* Booking and payment remain outside the scope.
* Supabase satisfies the required backend capabilities.
* Vercel remains suitable for application deployment.
* The operational team does not require self-hosted infrastructure.

A formal architectural review is required when a proposed change introduces:

* Financial transactions
* Booking inventory
* Sensitive personal visitor data
* More than one administrative access level or account
* Large-scale GIS processing
* High-volume file processing
* External system integration
* Native mobile applications
* Custom background workers
* A separately deployed backend
* Significant regulatory obligations

---

## 18. Architecture Governance

Significant architectural changes must be documented before implementation.

A change is architecturally significant when it:

* Adds a new production service
* Replaces an approved technology
* Changes authentication or authorization boundaries
* Changes persistent data ownership
* Introduces a new deployment unit
* Adds financial or transactional workflows
* Adds advanced GIS processing
* Changes backup responsibilities
* Increases long-term operational requirements

Approved changes must be reflected in:

* `project.md` when permanent project context changes
* `architecture.md` when system structure changes
* `prd.md` when product scope changes
* `schema.md` when persistent data changes
* `design.md` when application interaction changes
* `rules.md` when development constraints change

Implementation must not silently diverge from the approved architecture.
