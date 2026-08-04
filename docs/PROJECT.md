# Project Context

## Project Identity

**Project Name:** Karang Bajo Tourism Information System
**Tagline:** A WebGIS-based tourism information platform for Desa Karang Bajo.
**Project Type:** Production system
**Current Status:** Release preparation / pre-production

This project is a production system intended for long-term use and maintenance. It is not a prototype, demonstration application, or temporary KKN deliverable.

---

## Project Background

Desa Karang Bajo has tourism potential across several areas, including:

* Cultural tourism
* Traditional houses
* Natural tourism
* Homestays
* Local micro, small, and medium enterprises
* Tourism packages
* Traditional and cultural events

Tourism-related information is currently distributed across different sources and is not easily accessible to visitors.

The village also does not currently have a centralized digital platform through which authorized parties can publish, update, and maintain tourism information.

The project is intended to establish an official tourism information system that can continue to be operated by the Desa Karang Bajo government after the KKN program has ended.

---

## Project Objectives

The system must support the following objectives:

* Promote tourism destinations in Desa Karang Bajo.
* Provide an official and centralized source of tourism information.
* Present tourism-related locations through an interactive map.
* Document traditional houses and Bayan customary institutions.
* Introduce the history, culture, and customary identity of the village.
* Publish available tourism packages.
* Publish traditional and cultural events.
* Help visitors obtain the information required to plan a visit.
* Allow authorized village administrators to manage content without requiring technical knowledge.

---

## Target Users

### Primary Users

* Domestic tourists
* International tourists

### Secondary Users

* Desa Karang Bajo government
* Tourism awareness groups or Pokdarwis
* Local community members

### Administrative Access

* One authenticated village administrator

Version 1 has exactly two access states: an anonymous public visitor and one authenticated administrator. Supabase Auth protects the single administrator account. Version 1 does not include additional administrative accounts, editor roles, role management, user management, invitations, or approval workflows.

---

## Project Scope

### Public Information Platform

The public-facing system covers the following information areas:

* Home
* Village profile
* Tourism destinations
* Interactive map
* Tourism packages
* Homestays
* Local MSMEs
* Culture and Bayan customary institutions
* Traditional houses
* Cultural events
* Gallery
* Contact information

### Administration Platform

The administration system covers:

* Administrator authentication
* Tourism destination management
* Tourism package management
* Homestay management
* MSME management
* Gallery management
* Cultural article management
* Event management
* Village profile management
* Traditional-house and customary-institution management
* Contact and site-settings management
* Media management

The administrator can create, edit, publish, archive, restore, upload media, and manage approved settings. New content starts as draft. Permanent deletion is unavailable in Version 1.

Indonesian remains the default locale, existing Indonesian public URLs remain unchanged, and administration and authentication remain Indonesian-only. The merged bilingual public-shell Phase 1 adds only `/en` with translated static interface copy. It does not translate or expose database-managed Indonesian descriptive content.

Database-backed English content is approved as a separate Phase 2 using one explicit translation table per domain. Phase 2A is limited to a Village Profile translation pilot and the future `/en/village-profile` route. Other database-managed domains remain deferred until separately approved. No automatic or machine translation, Indonesian descriptive-content fallback, additional administrator role, or claim of complete bilingual content coverage is permitted.

Destination categories are the fixed values `Alam`, `Budaya`, and `Religi`. They are not managed through the dashboard.

Detailed feature behavior, validation rules, workflows, and acceptance criteria are defined separately in `prd.md`.

---

## GIS Context

GIS is a supporting component of the tourism information platform.

Its primary purpose is to visualize the geographic locations of tourism-related information published through the system.

The current GIS scope includes:

* Markers for destinations, traditional houses, homestays, and visitable UMKM
* Tourism categories
* Coordinate-based location display
* Interactive map presentation
* External map integration where required by the approved requirements

When multiple published records represent the same physical location, the public map must render one combined marker rather than overlapping duplicates. UMKM Tenun shares the Kampung Adat location and must be represented through the same marker.

Locations are represented using latitude and longitude coordinates.

The current project scope does not require advanced spatial operations, including:

* Buffer analysis
* Spatial intersection
* Nearest-neighbor queries
* Polygon analysis
* Route optimization
* Geospatial network analysis

Advanced GIS capabilities must not be introduced unless they are supported by validated operational requirements.

---

## Approved Technology Direction

The following technologies have been selected for the project:

| Area                         | Technology                  |
| ---------------------------- | --------------------------- |
| Frontend application         | Next.js                     |
| Programming language         | TypeScript                  |
| Styling                      | Tailwind CSS                |
| Interactive map              | Leaflet                     |
| Map data and tiles           | OpenStreetMap               |
| Backend platform             | Supabase                    |
| Database                     | PostgreSQL through Supabase |
| Authentication               | Supabase Auth               |
| File and image storage       | Supabase Storage            |
| Accepted managed image formats | JPEG, PNG, and WebP       |
| Application deployment       | Vercel                      |
| Initial GIS data preparation | QGIS                        |

The repository uses npm and the existing `package-lock.json`. The application keeps the current root `app/` structure, and static browser assets belong under `public/`.

Technology-specific configuration and architectural implementation belong in `architecture.md`.

---

## Architectural Constraints

The production system does not use the following technologies:

* Laravel
* Express
* Firebase
* MySQL
* PostGIS

Supabase is the primary backend platform for the initial production system.

Destination locations are stored as latitude and longitude values in PostgreSQL. PostGIS is not required because the approved scope does not currently include advanced spatial queries or spatial analysis.

QGIS is used only for initial geographic data preparation, coordinate inspection, and data validation. It is not part of the daily content-management workflow.

Routine tourism content management is performed through the web-based administration dashboard.

Images are stored in Supabase Storage.

The database stores references and metadata associated with the images rather than storing image binary data directly.

Architectural changes must be documented and justified before they are introduced.

---

## Non-Goals

The first production version does not include:

* Online tourism booking
* Online homestay booking
* Payment gateway integration
* Recommendation engine
* AI chatbot
* Route optimization
* Offline map support
* Native mobile application

These capabilities are outside the current project scope.

They may only be considered in future versions after the initial system is operational and an actual requirement has been identified.

---

## Success Criteria

The project is considered successful when:

* Authorized village administrators can independently manage tourism information.
* Visitors can discover tourism destinations without relying on scattered information sources.
* Official tourism information is available through one centralized platform.
* Cultural history, traditional houses, and Bayan customary institutions can be documented and maintained.
* Tourism locations displayed on the map remain consistent with the published destination data.
* Administrators can manage routine content without modifying source code.
* The system remains sufficiently simple for long-term village operation and maintenance.
* The system can continue operating after the KKN program has ended.

---

## Development Principles

All project decisions must follow these principles:

1. Keep the system as simple as the validated requirements allow.
2. Prefer maintainability over unnecessary technical complexity.
3. Avoid introducing technologies without a clear operational requirement.
4. Design the system for long-term sustainability.
5. Prioritize usability for the non-technical administrator.
6. Keep public information clear, accessible, and easy to navigate.
7. Maintain a clear separation between public content and administrative capabilities.
8. Treat cultural and customary information as official content that requires responsible management.
9. Validate and bound managed media to control storage and bandwidth usage; image processing remains separate future work.
10. Support future growth without prematurely implementing speculative features.
11. Ensure architectural decisions remain aligned with the actual scale of the village tourism platform.
12. Record significant scope or technology changes in the appropriate project documentation.

---

## Content Ownership and Maintenance

Tourism information published through the system is intended to become official village-managed content.

The village government, operating through the single authenticated administrator, is responsible for:

* Maintaining the accuracy of tourism information
* Updating outdated content
* Managing destination coordinates
* Maintaining cultural and historical documentation
* Publishing and updating event information
* Ensuring uploaded media is appropriate for public use
* Confirming publication consent before publishing optional per-entity contact details

One central village WhatsApp number is the primary visitor inquiry call-to-action across the public website. Entity-specific contacts remain optional and may be published only when consent has been recorded operationally.

The software must support this responsibility without assuming that administrators have software development knowledge.

---

## Scope Control

Features must not be added solely because they are technically possible.

A proposed feature should only enter the production scope when:

* It addresses an identified user or operational need.
* Its responsible administrator or stakeholder is known.
* The required information can be maintained after deployment.
* Its long-term maintenance cost is understood.
* It does not introduce disproportionate complexity.
* It has been recorded in the appropriate requirements documentation.

Ideas that have not been approved must remain outside the implementation scope.

---

## Document Authority

This document is the permanent context reference for the project.

It defines:

* The identity of the project
* The project background
* The project objectives
* The intended users
* The approved high-level scope
* The approved technology direction
* The architectural constraints
* The non-goals
* The project principles
* The relationship between project documents

This document must not contain detailed feature specifications, interface designs, database definitions, or coding rules.

---

## Document Relationships

Each project document has a separate responsibility.

### `project.md`

Contains permanent project context, objectives, boundaries, technology direction, and project principles.

### `prd.md`

Contains product requirements, user needs, functional requirements, workflows, feature behavior, and acceptance criteria.

### `architecture.md`

Contains system architecture, component responsibilities, service boundaries, data flow, deployment structure, and architectural decisions.

### `design.md`

Contains application structure, navigation, page definitions, user-interface behavior, responsive design direction, and design-system guidance.

### `schema.md`

Contains database entities, fields, relationships, constraints, indexes, storage metadata, and data-management rules.

### `rules.md`

Contains development constraints, coding conventions, security requirements, validation rules, naming conventions, and AI coding-session instructions.

Information must be placed in the document that owns that responsibility. Duplication between documents should be avoided.

---

## AI Coding Session Guidance

Before making changes to the project, an AI coding agent must:

1. Read `project.md`.
2. Read the project document relevant to the requested task.
3. Respect the approved scope and non-goals.
4. Avoid introducing unapproved frameworks, services, or infrastructure.
5. Avoid treating planned features as existing features.
6. Avoid implementing speculative capabilities.
7. Preserve simplicity and long-term maintainability.
8. Identify conflicts between requested changes and existing project documents.
9. Update the appropriate documentation when an approved decision changes.
10. Never silently override an existing architectural or scope decision.

When project documents conflict, the conflict must be identified before implementation proceeds.
