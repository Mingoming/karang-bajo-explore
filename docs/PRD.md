# Product Requirements Document

## Karang Bajo Tourism Information System

**Product stage:** Production Version
**Document responsibility:** Defines what the product must do

---

# 0. Document Scope and Product Conflicts

## 0.1 Document Purpose

This document defines:

* Product goals
* Product users
* Version 1 scope
* Functional requirements
* User stories
* Non-functional requirements
* Acceptance criteria
* Success metrics
* Product risks
* Future scope

This document does not define:

* Application structure
* Database entities or columns
* Technical implementation
* Infrastructure
* Visual branding
* Cultural or historical content

Source documents:

* `project.md`
* `architecture.md`
* `schema.md`
* `design.md`

---

## 0.2 Approved Version 1 Product Decisions

Version 1 uses one anonymous public access state and one authenticated administrator access state. The administrator has full approved content-management capability. Editor roles, role management, user management, invitations, and approval workflows are excluded.

The product is Indonesian-only. New records start as draft; the administrator may create, edit, publish, archive, restore, upload media, and manage approved settings. Permanent deletion is unavailable.

Destination categories are fixed to `Alam`, `Budaya`, and `Religi` and are not dashboard-managed. Slugs are generated automatically, hidden from normal forms, and frozen after first publication.

All price fields are numeric: `0` means free, `null` means unavailable, and a positive value is Indonesian rupiah. `price_note` is optional.

One central WhatsApp number is the primary visitor inquiry call-to-action. Per-entity contacts are optional and require publication consent.

Destinations, traditional houses, homestays, and visitable UMKM may appear on the public map. Records sharing one physical location use one combined marker. In particular, UMKM Tenun shares the Kampung Adat marker and must not create a duplicate overlapping marker.

### Version 1 Boundary — Package Participant Limits

`design.md` requests participant limits, but the approved data model does not support structured participant-limit values.

**Version 1 product rule:**

Participant limits are not included.

They must not be represented through unrelated text fields.

**Status:** Out of scope until the product and data model are revised.

---

### Version 1 Boundary — Package Stop Activity and Estimated Time

The requested package workflow mentions structured activity and estimated time for each stop. The approved data model supports destination order and a package-specific note only.

**Version 1 product rule:**

* Administrators may select destinations.
* Administrators may arrange destinations in visit order.
* Administrators may add a short note for each destination.
* The system does not manage structured duration or activity per stop.

**Status:** Deferred.

---

### Version 1 Boundary — Recurring Events

The product references traditional events, but no recurring-event model is approved.

**Version 1 product rule:**

Each event occurrence is managed as an individual event.

**Status:** Approved for Version 1.

---

### Version 1 Boundary — Traditional House as Destination

Traditional houses and tourism destinations are separate product features.

The current product model does not define a relationship between a traditional house and a destination record.

**Version 1 product rule:**

A traditional house remains a separate module and may appear on the public map directly. It must not be duplicated as a tourism destination merely to gain map visibility.

**Status:** Approved for Version 1.

---

# 1. Product Overview

Karang Bajo Tourism Information System is the official digital tourism information platform for Desa Karang Bajo.

The product centralizes visitor-facing tourism, cultural, accommodation, local-business, event, and geographic information.

It also provides a protected administration area through which the single authenticated administrator maintains the published information.

The product is intended for continued use after the KKN program ends.

It is a production system, not a temporary campaign website or prototype.

---

# 2. Product Goals

## 2.1 Primary Goals

The product must:

1. Promote tourism destinations in Desa Karang Bajo.
2. Centralize official tourism information.
3. Make destinations easier to discover.
4. Present tourism locations through an interactive map.
5. Preserve and publish approved cultural information.
6. Document traditional houses and Bayan customary institutions.
7. Publish tourism packages.
8. Publish cultural and traditional events.
9. Introduce local homestays and UMKM.
10. Help visitors obtain practical information before visiting.
11. Enable village administrators to maintain content independently.
12. Keep unpublished or unverified content out of public access.

---

## 2.2 Product Outcomes

The expected outcomes are:

* Visitors no longer depend on scattered information sources.
* Village tourism information has one official publication channel.
* Cultural information can be maintained over time.
* Destination locations are consistent between content and maps.
* Authorized village officers can update content without developer assistance.
* The product remains manageable with limited operational resources.

---

# 3. Users

## 3.1 Tourists

### Description

Tourists include domestic and international visitors seeking information about Desa Karang Bajo.

### Goals

* Discover destinations
* Understand village tourism options
* View destination locations
* Learn about culture and customary institutions
* Compare tourism packages
* Find accommodation and local businesses
* Obtain contact information
* Plan a visit independently

### Needs

* Clear and accurate content
* Mobile-friendly access
* Easy navigation
* Practical visitor information
* Correct destination coordinates
* Fast-loading images
* Visible event dates and status
* Direct external map navigation

### Main Activities

* Browse destinations
* Filter destinations by category
* Open destination details
* Use the tourism map
* Browse tourism packages
* Read cultural articles
* View traditional houses
* Check cultural events
* Find homestays
* Find UMKM
* View the gallery
* Contact village tourism representatives

### Permissions

* View published public content
* Use filters and map interactions
* Open external contact and navigation links

Tourists cannot:

* Access drafts
* Modify content
* Access the dashboard
* View internal source notes
* View administrator information

### Pain Points

* Tourism information is scattered
* Location descriptions may be unclear
* Social media posts may be outdated
* Cultural information may be incomplete or inconsistent
* Visitors may not know whom to contact
* Poor mobile presentation may make trip planning difficult

---

## 3.2 Village Government

### Description

Village Government represents the official owner and long-term operator of the product.

### Goals

* Maintain an official tourism information source
* Ensure public information is accurate
* Preserve village and cultural documentation
* Control what information is published
* Maintain ownership after handover
* Ensure responsible use of official content

### Needs

* Clear content ownership
* Controlled publishing authority
* Secure administrator access
* Simple content-management workflows
* Backup and account-ownership procedures
* Reliable handover documentation

### Main Activities

* Verify content before publication
* Publish and archive content
* Restore archived content
* Manage public settings
* Review cultural and historical information
* Review destination coordinates
* Maintain official contacts

### Permissions

The single administrator may:

* Manage all approved content
* Publish and archive
* Manage site settings
* Restore archived content
* Manage media

### Pain Points

* Limited technical staff
* Dependence on temporary student teams
* Loss of credentials after handover
* Unclear responsibility for content updates
* Risk of inaccurate cultural publication
* Difficulty operating complex systems

---

## 3.3 Pokdarwis

### Description

Pokdarwis acts as a tourism-information contributor and operational stakeholder outside the authenticated product boundary.

### Goals

* Promote tourism activities
* Maintain destination and package information
* Provide practical visitor details
* Support event and tourism promotion
* Coordinate public tourism contacts

### Needs

* A clear offline process for providing information to the administrator
* A central WhatsApp channel for visitor and stakeholder inquiries

### Main Activities

* Provide destination and package information to the administrator
* Provide event and media updates to the administrator
* Help verify operational tourism information

### Permissions

Pokdarwis has no separate authenticated account or dashboard role in Version 1.

### Pain Points

* Tourism information may change frequently
* Photos may have inconsistent quality
* Package details may not yet be standardized
* Coordinates may be collected inaccurately
* Publishing responsibility may be unclear

---

## 3.4 Authenticated Administrator

### Description

The authenticated administrator is the only Version 1 dashboard user and is responsible for preparing and maintaining content.

### Goals

* Create complete and accurate content
* Keep visitor information current
* Upload suitable media
* Prepare and verify drafts before publication
* Correct errors without developer support

### Needs

* Clear forms
* Indonesian labels and instructions
* Field-level validation
* Safe draft saving
* Preview before publication
* Clear upload feedback
* Protection against accidental data loss
* Consistent actions across content types

### Main Activities

* Create drafts
* Edit existing content
* Upload and reorder images
* Enter coordinates
* Select one of the fixed destination categories
* Add package destinations
* Preview content
* Search existing records
* Review validation errors

### Permissions

Version 1 permissions:

* Create
* Edit
* Upload media
* Save drafts
* Preview
* Publish
* Archive
* Restore
* Manage approved settings

Version 1 does not provide role management, user management, invitations, approval queues, or permanent deletion.

### Pain Points

* Technical terminology
* Long forms without clear grouping
* Losing unsaved data
* Unclear validation messages
* Confusion between draft and published content
* Difficulty resizing or preparing images
* Accidental destructive actions

---

# 4. MVP Scope

Version 1 includes the minimum complete set required for an official village tourism information platform.

| Feature                              | Included in MVP | Reason                                                |
| ------------------------------------ | --------------: | ----------------------------------------------------- |
| Village Profile                      |             Yes | Provides official village context                     |
| Tourism Destinations                 |             Yes | Core tourism discovery feature                        |
| Destination Detail                   |             Yes | Provides complete visitor information                 |
| Interactive Tourism Map              |             Yes | Makes locations easier to understand                  |
| Tourism Packages                     |             Yes | Supports tourism offering publication                 |
| Traditional Houses                   |             Yes | Documents specific cultural assets                    |
| Cultural Articles                    |             Yes | Preserves general cultural information                |
| Bayan Customary Institution Articles |             Yes | Preserves institution-specific information            |
| Cultural Events                      |             Yes | Publishes scheduled tourism and cultural activities   |
| Homestays                            |             Yes | Helps visitors find accommodation information         |
| UMKM                                 |             Yes | Promotes local businesses                             |
| Gallery                              |             Yes | Provides visual documentation                         |
| Contact                              |             Yes | Gives visitors an official communication channel      |
| Authentication                       |             Yes | Protects administration access                        |
| Admin Dashboard                      |             Yes | Enables independent village content maintenance       |
| Media Management                     |             Yes | Required for all image-based content                  |
| Site Settings                        |             Yes | Allows limited management of approved public settings |

---

## 4.1 MVP Boundary

Version 1 is an information-management and information-publication system.

It is not a transaction platform.

The system helps visitors discover, understand, and contact tourism providers. It does not confirm reservations, process money, calculate optimal trips, or create visitor accounts.

---

# 5. Out of Scope

| Feature                    | Status       | Reason                                                                       |
| -------------------------- | ------------ | ---------------------------------------------------------------------------- |
| Online booking             | Out of scope | Requires availability, confirmation, cancellation, and operational ownership |
| Payment gateway            | Out of scope | Introduces financial, refund, and reconciliation responsibilities            |
| Visitor reviews            | Out of scope | Requires user accounts and moderation                                        |
| Ratings                    | Out of scope | Requires review integrity and abuse prevention                               |
| Favorites                  | Out of scope | Requires visitor identity or tracking                                        |
| Trip planner               | Out of scope | Requires a broader itinerary model                                           |
| Route optimization         | Out of scope | Current map requirement is location display only                             |
| Offline maps               | Out of scope | Requires tile packaging and synchronization                                  |
| AI chatbot                 | Out of scope | No validated support use case or content-governance model                    |
| Recommendation engine      | Out of scope | Insufficient content volume and behavioral data                              |
| Advanced GIS analysis      | Out of scope | Not required for point-based tourism discovery                               |
| Native mobile app          | Out of scope | Responsive web access is sufficient for Version 1                            |
| Product ordering           | Out of scope | UMKM is informational, not e-commerce                                        |
| Room inventory             | Out of scope | Homestays are informational, not booking providers                           |
| Visitor registration       | Out of scope | Public access does not require accounts                                      |
| Social commenting          | Out of scope | Requires moderation and identity management                                  |
| Multi-village management   | Out of scope | Product serves Desa Karang Bajo only                                         |
| Automatic event recurrence | Out of scope | Each occurrence is managed separately                                        |
| Multilingual publishing    | Out of scope | Version 1 is Indonesian-only                                                  |
| Package participant limits | Out of scope | No approved product or data model                                            |
| Structured stop timing     | Out of scope | No approved package-stop model                                               |

---

# 6. Product Features

# 6.1 Village Profile

## Purpose

Provide an official public overview of Desa Karang Bajo.

## Description

The product must present the village identity, general description, history, vision, mission, address, and approved location information.

Only one current village profile is managed in Version 1.

## Users

* Tourists
* Village Government
* Administrator

## Business Value

* Establishes official product identity
* Centralizes village background information
* Reduces conflicting descriptions across pages
* Supports destination and cultural context

## Priority

**Must Have**

## Dependencies

* Authentication
* Admin Dashboard
* Publication workflow
* Media or public visual configuration where applicable

## Functional Requirements

1. Visitors must be able to open the village-profile page.
2. The page must show only published profile content.
3. Authorized administrators must be able to edit the profile.
4. The profile must support saving as draft.
5. Authorized publishers must be able to publish or archive the profile.
6. The application must prevent ordinary users from creating multiple active profiles.
7. Empty optional sections must not appear publicly.
8. Draft content must not appear in public navigation or public output.

## Acceptance Criteria

* [ ] A visitor can open the published village profile.
* [ ] The public profile contains the approved village name.
* [ ] Draft changes remain invisible to visitors.
* [ ] An authorized user can save incomplete content as draft.
* [ ] Only one active village profile is presented publicly.
* [ ] Empty history, vision, or mission sections are hidden.
* [ ] Archived profile content is not publicly accessible.

---

# 6.2 Tourism Destinations

## Purpose

Allow visitors to discover tourism destinations in Desa Karang Bajo.

## Description

The destination feature presents a public list of published destinations with categories, summaries, images, and access to destination details.

Administrators manage destination information and publication state through the dashboard.

## Users

* Tourists
* Pokdarwis
* Administrator
* Village Government

## Business Value

* Core tourism promotion
* Centralized destination information
* Easier visitor discovery
* Consistent link between content and coordinates

## Priority

**Must Have**

## Dependencies

* Destination categories
* Media Management
* Interactive Tourism Map
* Authentication
* Admin Dashboard

## Functional Requirements

1. Visitors must be able to view a list of published destinations.
2. Every destination card must provide:

   * Destination name
   * Category
   * Summary
   * Thumbnail or fallback image
   * Link to detail
3. Visitors must be able to filter destinations by category.
4. The filter must offer a way to return to all categories.
5. The public list must not include drafts or archived records.
6. The administrator must be able to:

   * Create a destination
   * Edit a destination
   * Save a draft
   * Preview a destination
   * Publish
   * Archive
   * Restore archived content to draft
7. The administrator must assign exactly one of the fixed categories: `Alam`, `Budaya`, or `Religi`.
8. Categories must not have dashboard create, edit, archive, delete, or reorder actions.
9. The slug must be generated automatically, hidden from the normal form, and remain unchanged after first publication.
10. The system must validate required publication information before publishing.
11. A destination must not appear publicly without valid coordinates.
12. A published destination must appear in the destination list after public content refresh.
13. A destination returned to draft or archived must disappear publicly.
14. The destination form must support both map picking and manual latitude/longitude entry.
15. `entrance_fee` follows the Version 1 numeric price semantics and its optional explanatory field is `price_note`.

## Acceptance Criteria

* [x] Visitors can discover all published destinations.
* [x] Category filtering changes the visible destination set.
* [x] An empty category result shows a clear message.
* [x] Draft destinations never appear publicly.
* [x] Archived destinations never appear publicly.
* [ ] A newly published destination appears publicly.
* [ ] A destination without valid coordinates cannot be published.
* [x] A destination card links to the correct detail page.
* [x] Missing thumbnails use the approved fallback image.
* [ ] Administrators can search destination records by name.

---

# 6.3 Destination Detail

## Purpose

Provide complete visitor-facing information for one destination.

## Description

The destination detail page presents approved information such as description, destination-specific history, opening hours, entrance fee information, facilities, contact details, images, location, and external map navigation.

## Users

* Tourists

## Business Value

* Helps visitors understand what to expect
* Reduces incomplete or inconsistent information
* Supports visit planning
* Connects content with location

## Priority

**Must Have**

## Dependencies

* Tourism Destinations
* Interactive Tourism Map
* Media Management
* Contact data on the destination

## Functional Requirements

1. Each published destination must have a public detail page.
2. The page must show:

   * Name
   * Category
   * Summary
   * Description
   * Primary image or fallback
   * Location map
3. The page may show when available:

   * History
   * Opening hours
   * Entrance fee
   * Optional price note
   * Facilities
   * Contact
   * Gallery
   * Google Maps navigation
4. Empty optional sections must not be displayed.
5. A draft or archived destination URL must not expose content.
6. The map marker must use the destination’s approved coordinates.
7. Gallery images must follow the configured display order.
8. External navigation must open the stored destination link when available.
9. The page must provide a useful alternative when the interactive map is unavailable.

## Acceptance Criteria

* [x] A published destination opens through its public URL.
* [x] Its category and main description are visible.
* [ ] The map location matches the saved coordinates.
* [x] The gallery respects the administrator-defined order.
* [x] A Google Maps action is visible only when a valid link exists.
* [x] Missing optional fields do not create empty headings.
* [x] Draft and archived destinations return a not-found result.
* [x] Visitors can access location information without relying only on the interactive map.

---

# 6.4 Interactive Tourism Map

## Purpose

Help visitors understand the geographic distribution of tourism destinations.

## Description

The tourism map displays published destinations, traditional houses, homestays, and visitable UMKM over a base map. It allows destination-category filtering and provides compact popups.

The map is a discovery tool. It does not calculate routes.

## Users

* Tourists
* Administrators previewing destination locations

## Business Value

* Improves location understanding
* Connects destination content with geography
* Helps mobile visitors open navigation
* Identifies invalid or missing location information during content management

## Priority

**Must Have**

## Dependencies

* Published mappable content
* Valid latitude and longitude
* Destination categories

## Functional Requirements

1. The map must display published destinations, traditional houses, homestays, and visitable UMKM that have valid coordinates.
2. Draft and archived records must not appear.
3. Each marker must display a popup containing the relevant item or items:

   * Destination name
   * Category
   * Short summary
   * Detail-page link
4. The popup may show:

   * Thumbnail
   * Google Maps navigation action
5. Visitors must be able to filter destination markers by the fixed categories.
6. Marker appearance must distinguish categories.
7. The initial view must focus on Karang Bajo.
8. The map must fit available markers when appropriate.
9. The map must handle:

   * No marker
   * One marker
   * Multiple markers
10. Invalid coordinates must not create broken markers.
11. The map must be usable on mobile.
12. The system may offer a user-location button after explicit visitor action.
13. Visitor location must not be stored.
14. The map must provide OpenStreetMap attribution.
15. The map must provide an alternative destination list.
16. The system must not claim route optimization or calculated travel times.
17. Records with the same approved coordinate pair must render as one combined marker rather than overlapping markers.
18. UMKM Tenun must use the same combined marker as Kampung Adat and must not render a second overlapping marker.

## Acceptance Criteria

* [ ] Every valid published mappable record is represented on the map.
* [ ] No draft or archived destination appears.
* [ ] Marker popups link to the correct destination.
* [ ] Category filtering hides and shows the expected markers.
* [ ] A single marker is centered appropriately.
* [ ] Multiple markers fit within the visible map.
* [ ] No-marker state displays a clear fallback.
* [ ] Invalid coordinates do not break the page.
* [ ] The map works at mobile screen widths.
* [ ] Google Maps opens only when a valid destination link exists.
* [ ] Denied user-location permission does not block map use.
* [ ] No optimized route is displayed.
* [ ] UMKM Tenun and Kampung Adat render as one marker with access to both relevant public records.

---

# 6.5 Tourism Packages

## Purpose

Publish structured tourism package options for visitors.

## Description

The feature presents tourism packages grouped into controlled package types:

* Budget
* Standard
* Premium

Each package communicates what visitors receive and the ordered destinations included.

The product does not process bookings or payments.

## Users

* Tourists
* Pokdarwis
* Administrator
* Village Government

## Business Value

* Converts scattered tourism offerings into understandable options
* Helps visitors compare package levels
* Promotes multiple destinations together
* Supports Pokdarwis tourism operations

## Priority

**Must Have**

## Dependencies

* Tourism Destinations
* Media Management
* Publication workflow
* Contact feature

## Functional Requirements

1. Visitors must be able to browse published tourism packages.
2. Every package must have one approved type:

   * Budget
   * Standard
   * Premium
3. A package may include:

   * Name
   * Summary
   * Description
   * Type
   * Duration
   * Price
   * Optional `price_note`
   * Included facilities
   * Souvenir information
   * Images
4. A package must include at least one destination before publication.
5. Administrators must be able to select multiple destinations.
6. Administrators must be able to arrange destinations in visit order.
7. The same destination must not be added twice to one package.
8. A package may include a short note for each destination.
9. Visitors must see package destinations in the stored order.
10. A package must not be published when it contains an unpublished or archived destination.
11. The administrator must be able to:

* Save draft
* Preview
* Publish
* Archive
* Restore archived content to draft

12. Package price is numeric: `0` means free, `null` means unavailable, and a positive value is Indonesian rupiah. `price_note` is optional.
13. The product must not process booking, availability, or payment.
14. A package map may display ordered markers.
15. A package map must not claim to show an optimized road route.
16. Creating or editing a package and its complete ordered destination set must be one atomic administrator-only database mutation; any invalid item or failed write must leave both tables unchanged.

## Acceptance Criteria

* [ ] Visitors can distinguish Budget, Standard, and Premium packages.
* [ ] A package detail explains duration, price, and included facilities.
* [ ] Package destinations appear in administrator-defined order.
* [ ] Duplicate destination selection is rejected.
* [ ] A package without destinations cannot be published.
* [ ] A package with an unpublished destination cannot be published.
* [ ] Draft packages do not appear publicly.
* [ ] Archived packages disappear publicly.
* [ ] Package price is displayed as information only.
* [ ] No booking or payment action is available.
* [ ] The map does not claim route optimization.
* [ ] Participant-limit fields are not presented in Version 1.
* [x] Local database tests confirm package create, metadata update, relationship replacement, removal, and reordering roll back as one operation on failure.
* [x] Direct authenticated mutations are revoked and both package mutation RPCs enforce sole-administrator authorization.
* [x] The transactional RPC migration is applied to hosted development; credential-backed administrator operations, non-administrator rejection, and atomic rollback on invalid destination or ordering input are verified.

---

# 6.6 Traditional Houses

## Purpose

Document and present traditional houses as specific cultural assets.

## Description

Traditional-house content provides house-specific description, history, cultural significance, visitor guidance, location where approved, and images.

It remains separate from general cultural articles and general tourism destinations.

## Users

* Tourists
* Village Government
* Administrator

## Business Value

* Preserves house-specific cultural information
* Supports cultural tourism
* Prevents cultural assets from being reduced to generic destination content
* Enables controlled publication of visitor rules

## Priority

**Must Have**

## Dependencies

* Media Management
* Authentication
* Admin Dashboard
* Cultural verification process

## Functional Requirements

1. Visitors must be able to browse published traditional houses.
2. Each published house must have a detail page.
3. The detail page must support:

   * Name
   * Summary
   * Description
   * History
   * Cultural significance
   * Visitor information
   * Images
4. Location information is optional, and a published house with valid coordinates may appear on the public map.
5. The application must not require public coordinates for every house.
6. The administrator decides whether supplied coordinates are suitable for publication as part of the direct publish action; there is no approval workflow.
7. Administrators must be able to save incomplete house information as draft.
8. Draft and archived houses must not be public.
9. The application must not automatically duplicate a traditional house as a tourism destination.
10. Placeholder or unverified historical content must not be published.
11. The form must support map picking and manual latitude/longitude entry.

## Acceptance Criteria

* [ ] Visitors can browse all published traditional houses.
* [ ] Each published record has a working detail page.
* [ ] Optional map information is hidden when unavailable.
* [ ] Visitor rules appear only when supplied.
* [ ] Draft content remains private.
* [ ] Archived houses disappear publicly.
* [ ] Placeholder cultural content blocks publication.
* [ ] The public page does not invent historical or customary facts.

---

# 6.7 Cultural Articles

## Purpose

Publish general cultural, historical, and community information that does not belong to another culture-specific feature.

## Description

Cultural articles cover general traditions, practices, cultural context, and approved historical information.

They do not represent traditional-house master information, customary institution documentation, or event occurrences.

## Users

* Tourists
* Village Government
* Administrator

## Business Value

* Preserves cultural knowledge
* Provides context for tourism experiences
* Centralizes verified cultural publication
* Supports long-form editorial content

## Priority

**Must Have**

## Dependencies

* Cultural verification process
* Media Management
* Publication workflow

## Functional Requirements

1. Visitors must be able to browse published cultural articles.
2. Each published article must have a detail page.
3. Articles must support:

   * Title
   * Summary
   * Main content
   * Category when used
   * Images
4. The administrator must be able to record internal source or interview notes.
5. Internal source notes must not appear publicly by default.
6. Articles may be saved as draft while information is being collected.
7. Draft placeholders must not appear publicly.
8. Publishing must require complete title and content.
9. Cultural articles must not be used to replace:

   * Traditional-house records
   * Customary institution articles
   * Cultural event records
10. Archived articles must remain unavailable publicly.

## Acceptance Criteria

* [ ] Visitors can open published articles.
* [ ] Draft and archived articles are not public.
* [ ] Internal source notes are not visible publicly.
* [ ] Empty optional summaries or categories do not create broken layouts.
* [ ] Placeholder text prevents publication.
* [ ] The article does not claim unsupported cultural facts.
* [ ] The administrator can preview the public presentation before publication.

---

# 6.8 Bayan Customary Institution Articles

## Purpose

Document and publish verified information about Bayan customary institutions.

## Description

This feature covers institution-specific history, roles, responsibilities, structures, and related customary context.

It is separate from general cultural articles because it represents formal and potentially sensitive institutional information.

## Users

* Tourists
* Village Government
* Cultural authorities
* Administrator

## Business Value

* Preserves institution-specific knowledge
* Reduces mixing of general culture and formal customary structures
* Supports responsible cultural tourism education
* Gives village authorities publication control

## Priority

**Must Have**

## Dependencies

* Cultural verification process
* Admin publishing authority
* Media Management

## Functional Requirements

1. Visitors must be able to browse published customary institution articles.
2. Each article must have a detail page.
3. The feature must support:

   * Title
   * Summary
   * Main content
   * Institution name
   * Institution role
   * Historical context
   * Images
4. The administrator must be able to record source notes.
5. Source notes remain private by default.
6. The product must warn publishers to verify information with an appropriate local source.
7. Draft and placeholder content must not be public.
8. Private information about living individuals must not be required.
9. Customary institution content must not be merged into general cultural articles for convenience.

## Acceptance Criteria

* [ ] Visitors can browse published customary institution articles.
* [ ] Each published article has a working detail page.
* [ ] Draft and archived content remains private.
* [ ] Internal source notes remain private.
* [ ] Publication requires complete content.
* [ ] The publisher sees a verification reminder.
* [ ] Placeholder content blocks publication.
* [ ] No private personal information is required for publication.

---

# 6.9 Cultural Events

## Purpose

Publish cultural, traditional, ceremonial, and tourism event information.

## Description

Each event record represents one event occurrence or one event announcement.

Events may have confirmed dates or an approved note explaining that the date is not yet confirmed.

## Users

* Tourists
* Pokdarwis
* Village Government
* Administrator

## Business Value

* Promotes cultural events
* Helps visitors plan attendance
* Preserves past-event documentation
* Centralizes event contacts and visitor rules

## Priority

**Must Have**

## Dependencies

* Media Management
* Contact information
* Optional map data
* Publication workflow

## Functional Requirements

1. Visitors must be able to browse published events.
2. Upcoming and past events must be distinguishable.
3. A detail page must support:

   * Title
   * Summary
   * Description
   * Confirmed date and time
   * Date note
   * Location
   * Organizer
   * Contact
   * Visitor information
   * Images
4. An end date must not be earlier than the start date.
5. An event without a confirmed date may be published only when an approved date note exists.
6. An event without a date and without a date note must remain draft.
7. Each recurring occurrence must be entered separately.
8. Draft and archived events must not appear publicly.
9. Event dates must not be inferred automatically from previous years.
10. A past event may remain published as documentation or be archived according to content policy.
11. Event visibility must not depend only on whether the date has passed.
12. No placeholder event title, description, date note, location, or schedule content may be published.

## Acceptance Criteria

* [ ] Visitors can distinguish upcoming and past events.
* [ ] Confirmed dates display correctly.
* [ ] Unconfirmed dates are labeled clearly.
* [ ] An event with neither date nor date note cannot be published.
* [ ] An invalid date range is rejected.
* [ ] Draft and archived events are not public.
* [ ] Recurring events are entered as separate occurrences.
* [ ] No future date is fabricated from historical patterns.
* [ ] Optional location and contact sections disappear when empty.

---

# 6.10 Homestays

## Purpose

Help visitors discover local accommodation information.

## Description

The feature publishes homestay identity, owner or manager, description, informational price, facilities, location, contact, and images.

It does not manage room availability or reservations.

## Users

* Tourists
* Administrator using information supplied with publication consent
* Pokdarwis
* Village Government

## Business Value

* Supports visitor planning
* Promotes local accommodation
* Centralizes approved homestay contacts
* Avoids dependence on scattered social-media information

## Priority

**Must Have**

## Dependencies

* Media Management
* Map support
* Contact information
* Publication workflow

## Functional Requirements

1. Visitors must be able to browse published homestays.
2. Each homestay must have a detail page.
3. The page must support:

   * Name
   * Owner or manager
   * Phone
   * Description
   * Informational nightly price
   * Optional `price_note`
   * Facilities
   * Location
   * Images
4. Per-homestay contact information is optional and must be published only when consent is recorded.
5. Coordinates are optional but must be valid when provided.
6. The product must not show:

   * Room availability
   * Reservation status
   * Booking actions
   * Payment actions
7. The administrator must be able to create, edit, preview, publish, archive, and restore.
8. Draft and archived homestays must not appear publicly.
9. A published homestay with valid coordinates may appear on the public map.
10. The form must support map picking and manual latitude/longitude entry.
11. `price_per_night` follows the Version 1 numeric price semantics and `price_note` is optional.

## Acceptance Criteria

* [ ] Visitors can browse published homestays.
* [ ] Each published homestay has a detail page.
* [ ] Price is presented as informational.
* [ ] Contact action uses approved public information.
* [ ] Optional map is hidden when coordinates are unavailable.
* [ ] Draft and archived records remain private.
* [ ] No room inventory or booking action exists.
* [ ] Empty optional fields are hidden.

---

# 6.11 UMKM

## Purpose

Promote local businesses and products relevant to village tourism.

## Description

The feature publishes business identity, owner when publication consent is recorded, category, description, location, contact, and images.

The system does not sell products or manage inventory.

## Users

* Tourists
* Administrator using information supplied with publication consent
* Pokdarwis
* Village Government

## Business Value

* Supports local economic promotion
* Helps visitors discover village businesses
* Centralizes approved UMKM contacts
* Connects tourism promotion with local products

## Priority

**Must Have**

## Dependencies

* Media Management
* Contact actions
* Optional map
* Publication workflow

## Functional Requirements

1. Visitors must be able to browse published UMKM.
2. Visitors must be able to view UMKM details.
3. UMKM content must support:

   * Business name
   * Category
   * Description
   * Owner when publication consent is recorded
   * Address
   * Coordinates
   * Phone or WhatsApp
   * Images
4. The UMKM list may be filtered by category.
5. At least one usable contact method or location must be present before publication.
6. The feature must not include:

   * Product inventory
   * Shopping cart
   * Order form
   * Payment
7. Draft and archived UMKM must not appear publicly.
8. Owner information must be optional for public display.
9. Owner and per-UMKM contact information require recorded publication consent.
10. A visitable published UMKM with valid coordinates may appear on the public map.
11. The form must support map picking and manual latitude/longitude entry.
12. UMKM Tenun shares the Kampung Adat coordinates and must be represented in the same combined marker rather than as a duplicate marker.

## Acceptance Criteria

* [ ] Visitors can browse published UMKM.
* [ ] Category filtering works when multiple categories exist.
* [ ] A published UMKM has either contact information or usable location information.
* [ ] Owner information is hidden when unavailable or publication consent is not recorded.
* [ ] Draft and archived UMKM remain private.
* [ ] No purchase or payment feature exists.
* [ ] External contact links work when supplied.

---

# 6.12 Gallery

## Purpose

Provide visual documentation not owned by a more specific content feature.

## Description

The public gallery presents standalone approved images of village tourism, culture, activities, and community documentation.

Images strongly tied to a destination, event, package, homestay, UMKM, article, or traditional house belong to that feature instead.

## Users

* Tourists
* Administrator
* Village Government

## Business Value

* Strengthens visual tourism promotion
* Preserves general village documentation
* Prevents unrelated images from being forced into other content types

## Priority

**Must Have**

## Dependencies

* Media Management
* Publication workflow

## Functional Requirements

1. Visitors must be able to view published gallery items.
2. Gallery items must support:

   * Image
   * Alt text
   * Optional title
   * Optional caption
   * Optional category
3. Administrators must be able to:

   * Upload
   * Preview
   * Reorder
   * Publish
   * Archive
4. Draft and archived gallery items must not appear publicly.
5. The gallery must provide an accessible image-viewing experience.
6. Gallery items must not duplicate dedicated content images without an editorial reason.

## Acceptance Criteria

* [ ] Published images appear in configured order.
* [ ] Draft and archived images remain private.
* [ ] Every public image has alt text.
* [ ] Missing image files use a fallback without breaking the page.
* [ ] Visitors can close expanded image views by keyboard and pointer.
* [ ] Administrators can reorder gallery items.
* [ ] A gallery item can be replaced without losing its caption unexpectedly.

---

# 6.13 Contact

## Purpose

Provide visitors with official and approved communication channels.

## Description

The contact feature publishes public channels such as phone, WhatsApp, email, social media, tourism information contacts, or village-office contacts. One central village WhatsApp number is the primary call-to-action for all visitor inquiries.

## Users

* Tourists
* Village Government
* Pokdarwis
* Admin

## Business Value

* Gives visitors a clear next step
* Reduces reliance on unofficial contacts
* Supports tourism inquiries
* Maintains contact ownership centrally

## Priority

**Must Have**

## Dependencies

* Admin Dashboard
* Publication workflow

## Functional Requirements

1. Visitors must be able to open a contact page.
2. The page must show only published contact channels.
3. The central WhatsApp number must be configured as an approved public site setting and used as the primary inquiry CTA across public pages.
4. Each additional contact must have:

   * Label
   * Contact type
   * Contact value
5. A contact may have:

   * Clickable link
   * Description
6. The administrator must be able to:

   * Add
   * Edit
   * Reorder
   * Publish
   * Archive
   * Restore
7. Technical credentials must never be treated as public contacts.
8. Destination-, event-, homestay-, and UMKM-specific contacts remain optional and owned by those features.
9. Per-entity contacts require recorded publication consent.
10. Private administrator contacts must never be inferred to be public contacts.

## Acceptance Criteria

* [ ] Visitors can see all published official contacts.
* [ ] Phone, email, WhatsApp, and external links work when configured.
* [ ] Draft and archived contacts remain private.
* [ ] The central WhatsApp CTA is visually primary and consistent across public inquiry surfaces.
* [ ] Duplicate identical contact channels are rejected or flagged.
* [ ] Technical credentials are never displayed.
* [ ] Empty contact page shows an approved fallback message.

---

# 6.14 Authentication

## Purpose

Ensure that only the configured administrator can access administrative functions.

## Description

Authentication provides login, logout, session handling, password recovery, and dashboard protection.

There is no public visitor account system.

## Users

* Single authenticated administrator

## Business Value

* Protects official content
* Preserves accountability
* Supports controlled handover
* Prevents anonymous modification

## Priority

**Must Have**

## Dependencies

* Admin Dashboard

## Functional Requirements

1. The administrator must be able to log in using the configured Supabase Auth credentials.
2. Invalid credentials must not grant access.
3. The authenticated administrator must be redirected away from the login page when appropriate.
4. The administrator must be able to log out.
5. All dashboard pages must require authentication.
6. The system must support password recovery.
7. Password recovery responses must not reveal whether an email account exists.
8. Expired sessions must require reauthentication.
9. Any authenticated Supabase user other than the configured administrator must not receive dashboard access.
10. Unauthorized users must not gain access by entering an admin URL directly.
11. Authentication errors must use clear, non-technical messages.
12. There must be no public registration, invitation, or additional-account flow.

## Acceptance Criteria

* [ ] The configured administrator can log in.
* [ ] Invalid credentials are rejected.
* [ ] Any other Supabase Auth identity is denied dashboard access.
* [ ] Unauthenticated access to `/admin` is redirected.
* [ ] Direct navigation to protected pages does not bypass protection.
* [ ] Logout removes dashboard access.
* [ ] Expired sessions require login again.
* [ ] Password recovery can be requested.
* [ ] Recovery does not reveal account existence.
* [ ] No visitor registration feature exists.

---

# 6.15 Admin Dashboard

## Purpose

Allow authorized village users to maintain the public tourism platform independently.

## Description

The dashboard provides a consistent management interface for all approved content types.

It emphasizes direct tasks and avoids technical terminology.

## Users

* Single authenticated administrator

## Business Value

* Enables long-term village ownership
* Removes the need for code changes during daily content management
* Supports controlled publication
* Centralizes editorial responsibility

## Priority

**Must Have**

## Dependencies

* Authentication
* All managed content features
* Media Management

## Functional Requirements

1. The dashboard must show a clear navigation structure.
2. The dashboard overview must show useful content status, including:

   * Draft count
   * Published destination count
   * Upcoming event count
   * Recently updated content
3. Each content-management feature must support applicable actions:

   * List
   * Create
   * Edit
   * Preview
   * Publish
   * Archive
4. Permanent deletion must not exist in Version 1.
5. List pages must support:

   * Clear page title
   * Short explanation
   * Primary action
   * Search where relevant
   * Status filter
   * Row actions
   * Empty state
6. Form pages must:

   * Group related fields
   * Explain unfamiliar fields
   * Mark required fields
   * Support draft saving
   * Preserve data after validation failure
   * Warn about unsaved changes
7. Publication actions are available to the authenticated administrator.
8. Archive actions must require confirmation.
9. Dashboard labels and guidance must use clear Indonesian.
10. The administrator must not need to understand database, storage, or GIS terminology.
11. Dashboard pages must remain usable on mobile devices.
12. The administrator must be able to find and edit existing content without developer assistance.

## Acceptance Criteria

* [ ] The authenticated administrator can reach all management sections.
* [ ] Anonymous visitors cannot access dashboard navigation or operations.
* [ ] Search finds matching records on supported list pages.
* [ ] Status filtering returns the correct records.
* [ ] Draft saving preserves incomplete work.
* [ ] Validation errors identify the affected fields.
* [ ] Archive requires explicit confirmation.
* [ ] Archived content disappears publicly.
* [ ] Mobile users can complete a basic content edit.
* [ ] Village officers can complete agreed critical tasks during acceptance testing.

---

# 6.16 Media Management

## Purpose

Allow administrators to prepare, upload, organize, replace, and remove public images safely.

## Description

Media ownership remains federated through entity-specific image tables. The first administrator implementation supports destinations, packages, traditional houses, events, homestays, and UMKM. Article and standalone-gallery media remain deferred until their parent administrator modules exist.

## Users

* Single authenticated administrator

## Business Value

* Improves public content quality
* Controls storage use
* Supports accessible image descriptions
* Reduces broken or oversized images
* Enables consistent visual management

## Priority

**Must Have**

## Dependencies

* Authentication
* Managed content records

## Supported Formats

* WebP
* JPEG
* PNG when necessary

Unsupported in Version 1:

* SVG uploads through the dashboard
* Executable files
* Video uploads
* Animated-image workflows
* AVIF, PDF, audio, and `application/octet-stream`

## Functional Requirements

1. The administrator must be able to select approved image files.
2. The product must reject unsupported formats.
3. The product must reject files above the approved source-file limit.
4. Uploaded images must show a preview.
5. Every image must have nonblank alt text.
6. Captions must be optional.
7. The administrator must be able to reorder images from display order zero.
8. The administrator must be able to select one primary image where supported.
9. The administrator must be able to replace an image.
10. The administrator must be able to remove an owned image.
11. Replacing an image must not remove the old valid image before the replacement succeeds.
12. Failed metadata writes must compensate by removing the newly uploaded object.
13. The database must synchronize primary-image state and parent thumbnail references transactionally.
14. The system must report incomplete Storage cleanup without reporting complete success.
15. Original high-resolution files must be retained outside the production media store by the content owner.
16. A published record should not expose an image whose metadata or file is unavailable.
17. The administrator must be able to open a parent-level gallery showing every owned image and the current image count out of ten.
18. Parent gallery image cards must identify the primary image and link to image editing.
19. Create and edit mutations must use server-bound parent ownership and reject submitted entity or parent identity.
20. Public media signing must accept only database-owned paths for published destination, tourism package, homestay, UMKM, traditional-house, and cultural-event parents through a fixed server allowlist.
21. Draft, archived, orphaned, malformed, and cross-entity media paths must not be eligible for public signing or anonymous object reads.

## Approved Product Limits

* One private bucket: `tourism-media`.
* Allowed types: JPEG, PNG, and WebP with matching binary signatures.
* Maximum source-file size: 5 MiB.
* Maximum images per supported parent: 10.
* Maximum primary images per parent: 1.
* No image cropping, compression, dimension transformation, or bulk upload in this phase.

## Acceptance Criteria

* [x] Supported JPEG, PNG, and WebP images can be uploaded through the administrator workflow.
* [x] Unsupported files and MIME/signature mismatches are rejected before Storage upload.
* [x] Images larger than 5 MiB are rejected clearly.
* [x] Every managed image requires nonblank alt text.
* [x] A parent gallery displays all owned images, the `n/10` count, and a primary badge.
* [x] Successful creation returns to the owning parent gallery and updates its count.
* [x] Image display order can be edited.
* [x] A primary image can be selected and remains synchronized with the parent thumbnail.
* [x] Replacement preserves the previous image until the database accepts its replacement.
* [x] Deleting a primary image selects a deterministic fallback; deleting the last image clears the parent thumbnail.
* [ ] Credential-backed fault injection confirms failed upload and compensation paths without corrupting existing images.
* [ ] Missing files do not break public pages.
* [ ] Removed images no longer appear publicly.
* [ ] Orphaned-file cleanup does not remove referenced files.
* [x] The federated six-parent public-media authorization and batch-signing boundary passes local application and database tests.
* [ ] The federated public-media migration and credential-backed access behavior are validated on hosted development.
* [ ] Public pages for package, homestay, UMKM, traditional house, and cultural event media consume the shared delivery boundary.

---

# 6.17 Site Settings

## Purpose

Allow the administrator to manage a limited set of approved public settings.

## Description

Site Settings contains only values that must be editable without changing the product itself.

It is not a general-purpose configuration or page-builder feature.

## Users

* Admin

## Business Value

* Supports handover
* Allows controlled public updates
* Avoids developer involvement for minor approved changes
* Prevents arbitrary technical configuration

## Priority

**Must Have**

## Dependencies

* Authentication
* Final approved settings list

## Functional Requirements

1. Only the configured administrator may manage protected settings.
2. Each setting must have:

   * Clear label
   * Explanation
   * Expected value type
3. The system must validate values before saving.
4. Only approved public settings may be exposed publicly.
5. Technical secrets must never be stored as site settings.
6. Long-form editorial content must not be placed in settings.
7. Non-editable system settings must be visibly read-only or hidden.
8. Changes that affect public content must appear after public content refresh.
9. Version 1 must include one approved `primary_whatsapp_number` setting for the central visitor inquiry CTA.

## Acceptance Criteria

* [ ] Admin can edit approved settings.
* [ ] Invalid values are rejected.
* [ ] Secret credentials cannot be entered as ordinary public settings.
* [ ] Public settings are visible only when approved for public use.
* [ ] Read-only settings cannot be changed through the interface.
* [ ] Setting changes do not create duplicate content ownership.

---

# 7. User Stories

## 7.1 Tourists

### Village Profile

As a tourist, I want to read the village profile so that I understand the destination before visiting.

### Destinations

As a tourist, I want to browse destinations so that I can choose places that interest me.

As a tourist, I want to filter destinations by category so that I can focus on the type of tourism I prefer.

### Destination Detail

As a tourist, I want to view complete destination information so that I know what to expect.

As a tourist, I want to see entrance-fee and opening-hour information so that I can prepare before visiting.

### Map

As a tourist, I want to see destinations on a map so that I understand where they are located.

As a tourist, I want to open a destination in Google Maps so that I can start navigation.

### Packages

As a tourist, I want to compare tourism packages so that I understand the available options.

As a tourist, I want to see package destinations in visit order so that I understand the planned sequence.

### Traditional Houses

As a tourist, I want to read about traditional houses so that I understand their cultural significance.

### Culture

As a tourist, I want to read verified cultural articles so that I do not depend on unverified sources.

### Customary Institutions

As a tourist, I want to learn about Bayan customary institutions so that I understand their role and context.

### Events

As a tourist, I want to see cultural event schedules so that I can plan attendance.

As a tourist, I want unconfirmed event dates to be labeled clearly so that I do not mistake them for confirmed schedules.

### Homestays

As a tourist, I want to browse homestays so that I can find local accommodation.

### UMKM

As a tourist, I want to discover local UMKM so that I can support local businesses.

### Gallery

As a tourist, I want to view village tourism photos so that I can understand the atmosphere before visiting.

### Contact

As a tourist, I want an official contact channel so that I can ask for current information.

---

## 7.2 Administrator

### Destinations

As the administrator, I want to create a destination draft so that I can complete information gradually.

As the administrator, I want to choose a destination location on a map or enter latitude and longitude manually so that I can use the most practical method.

As the administrator, I want to preview a destination so that I can check its public presentation.

### Packages

As the administrator, I want to add multiple destinations to a package so that I can represent a complete visit sequence.

As the administrator, I want to reorder package destinations so that the public sequence matches the planned visit.

### Culture

As the administrator, I want to save source notes privately so that the team can preserve verification context.

As the administrator, I want draft placeholders to stay private so that incomplete information is never presented as fact.

### Events

As the administrator, I want to save an event with an unconfirmed-date note so that the public can receive accurate scheduling context.

### Media

As the administrator, I want images to be compressed before upload so that I do not need to prepare every image manually.

As the administrator, I want upload failures to preserve my form data so that I do not lose completed work.

### Dashboard

As the administrator, I want to search existing content so that I can update it quickly.

As the administrator, I want clear validation messages so that I know what must be corrected.

---

## 7.3 Ownership and Handover

### Publishing

As an Admin, I want to publish approved content so that visitors can access it.

As an Admin, I want to archive outdated content so that it disappears publicly without being permanently lost.

### Settings

As an Admin, I want to update approved public settings so that minor changes do not require a developer.

### Handover

As a village owner, I want the product accounts and documentation to be transferred formally so that the system remains operational after KKN.

---

# 8. Publication and Content Rules

## 8.1 Publication States

Managed public content supports:

* Draft
* Published
* Archived

### Draft

* Visible to authorized dashboard users
* Not visible publicly
* May be incomplete
* May contain internal editorial notes

### Published

* Visible publicly
* Must satisfy publication requirements
* Must contain approved content
* Must not contain placeholder text

### Archived

* Retained for recordkeeping
* Removed from normal public access
* May be restored by the administrator
* Cannot be permanently deleted in Version 1

Restoring archived content returns it to draft. If a record has ever been published, its generated slug remains unchanged.

---

## 8.2 Publication Requirements

Before publication, content must:

1. Contain all mandatory public fields.
2. Pass validation.
3. Not contain known placeholder text.
4. Use approved images where images are required.
5. Use valid coordinates when location is mandatory.
6. Reference only valid published related content.
7. Be published by the authenticated administrator.
8. Satisfy cultural verification procedures when relevant.
9. Use an automatically generated slug that becomes immutable after first publication when the content type has a public slug route.

---

## 8.3 Cultural Content Rules

1. The product must not generate cultural or historical facts.
2. Draft notes must not appear publicly.
3. Unverified information remains draft.
4. Internal source notes remain private by default.
5. Date uncertainty must be communicated explicitly.
6. Sensitive location information may remain unpublished.
7. Personal information must not be required unless necessary and approved.

---

# 9. Admin Usability Requirements

## 9.1 General Requirements

The dashboard must:

* Use Indonesian labels
* Avoid technical terms
* Use consistent actions
* Preserve form input after errors
* Explain required corrections
* Allow draft saving
* Provide preview
* Make publication status obvious
* Confirm destructive actions
* Work on mobile screens
* Avoid requiring administrator knowledge of:

  * Databases
  * Storage paths
  * GIS formats
  * Deployment
  * Code

---

## 9.2 Required Action Labels

Recommended consistent labels:

* Tambah
* Simpan Draft
* Simpan Perubahan
* Pratinjau
* Terbitkan
* Arsipkan
* Pulihkan
* Batal
* Coba Lagi

Terminology must remain consistent across features.

---

## 9.3 Error Message Requirements

Every error message must explain:

* What failed
* Whether data was saved
* What the user should do next

The product must not use a generic error message as the only feedback.

---

# 10. Non-Functional Requirements

# 10.1 Performance

1. Public pages must remain usable on typical mobile connections.
2. Large images must not be delivered without optimization.
3. Main public content should appear without waiting for unnecessary interaction scripts.
4. The homepage must not load every full content record.
5. Map data must contain only information required for markers and popups.
6. User actions must provide visible feedback within one second, even when the operation is still processing.
7. Public pages should meet agreed performance checks before launch.

### Acceptance Criteria

* [ ] Public pages remain usable on a mid-range mobile device.
* [ ] No source image above the approved public-media limit is served directly.
* [ ] The homepage loads summaries rather than full detail content.
* [ ] Map interaction does not block access to the destination list.
* [ ] Save and upload actions show immediate progress feedback.

---

# 10.2 Availability

1. The public website should remain available without village-managed servers.
2. A failure in one optional homepage section should not make the entire homepage unusable.
3. Missing images must not break the surrounding page.
4. Public content must provide clear failure states when temporarily unavailable.
5. The village must have a documented recovery path for product ownership and backups.

### Acceptance Criteria

* [ ] Optional-section failure does not remove the complete homepage.
* [ ] Missing media uses fallback presentation.
* [ ] Public errors provide a retry or alternative route.
* [ ] Account-recovery ownership is documented.

---

# 10.3 Accessibility

1. Public and administrative functions must be usable by keyboard.
2. Forms must have visible labels.
3. Errors must be associated with fields.
4. Images must have meaningful alternative text.
5. Status must not rely on color alone.
6. Modal dialogs must support keyboard closing and focus management.
7. The interactive map must have a textual alternative.
8. Visible focus states must be present.
9. Reduced-motion preferences must be respected.
10. Text and controls must have sufficient contrast.

### Acceptance Criteria

* [ ] A keyboard user can complete login and basic content editing.
* [ ] Every public managed image has alt text.
* [ ] Map destinations are available through a list.
* [ ] Form errors can be identified without relying only on color.
* [ ] Dialogs can be operated without a pointer.

---

# 10.4 Security

1. Dashboard access requires authentication.
2. Only the configured single administrator identity may access protected functions.
3. The configured administrator may perform the approved Version 1 management actions.
4. Public users must not access draft, archived, or internal content.
5. Hiding a button must not be the only permission control.
6. Passwords, credentials, and security keys must never be displayed.
7. File uploads must reject unsupported and unsafe files.
8. Password recovery must not reveal whether an account exists.
9. Session expiration must revoke protected access.
10. Replacing the configured administrator account must preserve audit history.

### Acceptance Criteria

* [ ] Unauthorized dashboard requests are blocked.
* [ ] Anonymous visitors and any non-configured Auth identities cannot access administrator functions.
* [ ] Draft content cannot be retrieved publicly.
* [ ] Unsafe file formats are rejected.
* [ ] Removing or replacing the configured administrator identity removes access from the previous identity.
* [ ] Secret values are not visible through Site Settings.

---

# 10.5 Maintainability

1. Daily content updates must not require source-code changes.
2. Product behavior must remain consistent across content features.
3. Account ownership must be transferable.
4. Backup procedures must identify responsible owners.
5. Administrator documentation must be delivered before handover.
6. Product scope must not depend on unsupported features.
7. Content ownership boundaries must remain clear.

### Acceptance Criteria

* [ ] A village officer can update published content without developer help.
* [ ] A documented owner exists for production accounts.
* [ ] Backup and restore procedures are documented.
* [ ] Feature responsibilities are understandable from the dashboard.
* [ ] No daily workflow depends on QGIS or source-code editing.

---

# 10.6 Usability

1. Administrators must understand the purpose of each field.
2. Technical terminology must be avoided.
3. Long forms must be divided into meaningful sections.
4. Draft saving must be available.
5. Failed validation must preserve input.
6. Destructive actions must require confirmation.
7. Public navigation must expose all main tourism sections.
8. Mobile visitors must be able to read and act without zooming the layout manually.

### Acceptance Criteria

* [ ] Village officers complete agreed tasks during supervised acceptance testing.
* [ ] Form validation does not clear entered information.
* [ ] Archive actions require confirmation.
* [ ] Mobile navigation exposes all public sections.
* [ ] Unfamiliar fields include clear helper text.

---

# 10.7 SEO

1. Every public page must have a meaningful title and description.
2. Published detail pages must have stable public URLs.
3. Draft and admin pages must not appear in search results.
4. Only published content must appear in the public sitemap.
5. Missing media must use an approved social-sharing fallback where applicable.
6. Metadata must not exaggerate or invent cultural claims.
7. Event metadata must not include unconfirmed dates as confirmed dates.

### Acceptance Criteria

* [ ] Published content has a page title and description.
* [ ] Admin and draft pages are excluded from indexing.
* [ ] Sitemap excludes unpublished content.
* [ ] Event metadata uses confirmed information only.
* [ ] Cultural metadata matches published editorial content.

---

# 10.8 Responsiveness

1. Public pages must work below 768 px.
2. Maps and popups must remain usable on mobile.
3. Admin forms must use a usable single-column layout on small screens.
4. Admin lists must remain accessible through cards or controlled horizontal scrolling.
5. Gallery interactions must fit the viewport.
6. Package information must not depend on wide comparison tables.
7. Touch targets must be practical on mobile devices.

### Acceptance Criteria

* [ ] Public navigation works below 768 px.
* [ ] Destination cards remain readable on mobile.
* [ ] The administrator can save a draft on a phone.
* [ ] Map popups remain within the viewport.
* [ ] No critical action requires hover.

---

# 11. Success Metrics

## 11.1 Operational Metrics

The product is successful when:

1. Authorized village administrators can log in independently.
2. Administrators can create and publish content without developer assistance.
3. Administrators can archive outdated content safely.
4. Production account ownership is transferred and documented.
5. Backups are performed according to the approved schedule.
6. At least one village officer completes the required acceptance tasks.

---

## 11.2 Content Metrics

1. Official village profile is published.
2. Validated tourism destinations are centralized.
3. Every published destination has valid coordinates.
4. Cultural sections contain only approved public information.
5. Published images display correctly.
6. Public contacts are current and approved.
7. No known placeholder text appears publicly.

---

## 11.3 Visitor Experience Metrics

1. Visitors can reach a destination detail from the homepage or destination list.
2. Visitors can filter destinations by category.
3. Visitors can open published destination locations on the map.
4. Visitors can use the map on mobile.
5. Visitors can find homestay and UMKM information.
6. Visitors can identify confirmed and unconfirmed event dates.
7. Visitors can find an official contact channel.

---

## 11.4 Initial Product Targets

Before production acceptance:

* 100% of published destinations have valid coordinate pairs.
* 100% of public managed images have alt text.
* 100% of public content excludes placeholder text.
* 100% of Admin routes reject unauthenticated access.
* 100% of archived content is excluded from public listings.
* 100% of published package destinations appear in the configured order.
* At least one trained village officer completes the end-to-end content workflow.

---

# 12. Product Risks and Mitigation

## 12.1 Content Is Not Yet Available

### Risk

Development may finish before accurate tourism and cultural content is collected.

### Impact

* Empty public sections
* Pressure to publish placeholders
* Unverified information presented as fact

### Mitigation

* Allow draft records
* Block known placeholders from publication
* Hide empty public sections
* Assign content owners
* Maintain a content-completion checklist
* Require review before publication

---

## 12.2 Inconsistent Image Quality

### Risk

Images may vary greatly in size, orientation, composition, and quality.

### Impact

* Slow pages
* Poor visual consistency
* Excessive storage use
* Broken layouts

### Mitigation

* Set upload limits
* Compress images
* Provide crop and preparation guidance
* Use fallback images
* Retain original images outside production storage
* Train the designated administrator

---

## 12.3 GPS Inaccuracies

### Risk

Coordinates collected from phones or written sources may be inaccurate.

### Impact

* Incorrect map marker
* Visitor confusion
* Navigation to the wrong location
* Cultural-location sensitivity

### Mitigation

* Validate initial coordinates in QGIS
* Provide a dashboard location picker
* Require coordinate review before publication
* Allow sensitive traditional-house locations to remain unpublished
* Provide external map-link review

---

## 12.4 Lack of Administrator Training

### Risk

Village officers may not understand content status, media preparation, or publication workflow.

### Impact

* Outdated content
* Accidental archiving
* Weak image quality
* Dependence on developers

### Mitigation

* Use consistent Indonesian labels
* Provide task-based training
* Deliver an administrator guide
* Conduct acceptance testing with officers
* Limit permissions to necessary actions
* Use archive and restore; do not provide permanent deletion

---

## 12.5 Administrator Publication Error

### Risk

The single administrator may publish inaccurate, unverified, or non-consensual content.

### Impact

* Unverified publication
* Delayed updates
* Privacy or consent violations

### Mitigation

* Record content-verification and consent responsibility
* Use preview and draft workflows before direct publication
* Provide cultural verification reminders

---

## 12.6 Future Ownership

### Risk

Production accounts may remain under a student's personal email.

### Impact

* Loss of access
* Failed renewals
* Inability to restore or deploy
* Security risk after KKN

### Mitigation

* Use village- or institution-controlled accounts
* Document recovery details
* Transfer account ownership
* Maintain at least two authorized owners where supported
* Review access before final handover

---

## 12.7 Backup Not Performed

### Risk

Cloud service availability may be mistaken for a complete backup strategy.

### Impact

* Loss of media
* Loss of cultural records
* Incomplete restoration
* Dependence on one account

### Mitigation

* Assign backup owner
* Approve backup frequency
* Back up content and images separately
* Retain QGIS source files
* Test restoration before handover

---

## 12.8 Contact Information Becomes Outdated

### Risk

Phone numbers, WhatsApp accounts, and tourism contacts may change.

### Impact

Visitors cannot reach the responsible party.

### Mitigation

* Assign contact owner
* Review public contacts periodically
* Allow simple contact updates
* Archive outdated contacts
* Display only approved public contact information

---

## 12.9 Event Information Becomes Misleading

### Risk

Traditional events may not have fixed dates or may change.

### Impact

Visitors may rely on incorrect schedules.

### Mitigation

* Support explicit unconfirmed-date notes
* Do not infer dates automatically
* Distinguish past and upcoming events
* Require event review before publication
* Assign an event-information owner

---

# 13. Future Enhancements

Future features require validated need, responsible ownership, and revised product approval.

| Enhancement                | Reason postponed                                                |
| -------------------------- | --------------------------------------------------------------- |
| Online booking             | Requires availability, confirmation, and cancellation workflows |
| Payment gateway            | Requires financial ownership, refunds, and reconciliation       |
| Homestay inventory         | Requires frequent operational updates                           |
| Package participant limits | Requires approved package rules and supporting data             |
| Structured stop activities | Requires an expanded package-stop model                         |
| Recommendation engine      | Requires sufficient content and usage data                      |
| Trip planner               | Requires itinerary, time, and visitor preference models         |
| Route optimization         | Requires routing data and a validated need                      |
| Offline map                | Requires map packaging and synchronization                      |
| QR codes                   | Useful only after public URLs and signage plans stabilize       |
| Visitor analytics          | Requires privacy and ownership decisions                        |
| Tourism heatmap            | Requires sufficient reliable visitor-location data              |
| Ratings and reviews        | Requires visitor accounts and moderation                        |
| Favorites                  | Requires persistent visitor identity or tracking                |
| AI chatbot                 | Requires controlled knowledge and maintenance processes         |
| Native mobile app          | Responsive web must be evaluated first                          |
| Multilingual content       | Version 1 is Indonesian-only; translation requires a future scope change |
| Multi-village support      | Current product serves one village                              |
| Event recurrence           | Individual event entries are sufficient for Version 1           |
| Social-media integration   | Requires platform ownership and content rules                   |
| Notification service       | Requires subscriber consent and operational ownership           |

---

# 14. MVP Release Criteria

Version 1 is ready for production only when:

1. All Must Have features are either complete or explicitly deferred through approved scope change.
2. Authentication and the single-administrator access boundary pass acceptance testing.
3. No draft or archived content is publicly accessible.
4. Public destination markers use validated coordinates.
5. Critical public pages work on mobile.
6. Cultural content has approved owners and review procedures.
7. Media limits and upload behavior are tested.
8. Production accounts are owned by an approved village or institutional representative.
9. Backup and recovery procedures are documented.
10. At least one village administrator completes critical dashboard tasks.
11. No placeholder content is publicly visible.
12. Out-of-scope transaction features are absent.

---

# 15. Acceptance Checklist

## Status Definitions

* **Ready:** Requirement is complete and accepted.
* **Incomplete:** Requirement belongs in Version 1 but is not yet accepted.
* **Out of Scope:** Requirement is intentionally excluded from Version 1.

---

## 15.1 Core Public Features

| Feature                              | Ready | Incomplete | Out of Scope |
| ------------------------------------ | :---: | :--------: | :----------: |
| Village Profile                      |  [ ]  |     [ ]    |      [ ]     |
| Destination List                     |  [ ]  |     [ ]    |      [ ]     |
| Destination Category Filter          |  [ ]  |     [ ]    |      [ ]     |
| Destination Detail                   |  [ ]  |     [ ]    |      [ ]     |
| Interactive Tourism Map              |  [ ]  |     [ ]    |      [ ]     |
| Google Maps Navigation               |  [ ]  |     [ ]    |      [ ]     |
| Tourism Package List                 |  [ ]  |     [ ]    |      [ ]     |
| Tourism Package Detail               |  [ ]  |     [ ]    |      [ ]     |
| Ordered Package Destinations         |  [ ]  |     [ ]    |      [ ]     |
| Traditional Houses                   |  [ ]  |     [ ]    |      [ ]     |
| Cultural Articles                    |  [ ]  |     [ ]    |      [ ]     |
| Bayan Customary Institution Articles |  [ ]  |     [ ]    |      [ ]     |
| Cultural Events                      |  [ ]  |     [ ]    |      [ ]     |
| Homestays                            |  [ ]  |     [ ]    |      [ ]     |
| UMKM                                 |  [ ]  |     [ ]    |      [ ]     |
| Gallery                              |  [ ]  |     [ ]    |      [ ]     |
| Contact Page                         |  [ ]  |     [ ]    |      [ ]     |

---

## 15.2 Administration

| Feature                      | Ready | Incomplete | Out of Scope |
| ---------------------------- | :---: | :--------: | :----------: |
| Admin Login                  |  [ ]  |     [ ]    |      [ ]     |
| Logout                       |  [ ]  |     [ ]    |      [ ]     |
| Password Recovery            |  [ ]  |     [ ]    |      [ ]     |
| Protected Dashboard          |  [ ]  |     [ ]    |      [ ]     |
| Single Administrator Access  |  [ ]  |     [ ]    |      [ ]     |
| Dashboard Overview           |  [ ]  |     [ ]    |      [ ]     |
| Content Search               |  [ ]  |     [ ]    |      [ ]     |
| Status Filtering             |  [ ]  |     [ ]    |      [ ]     |
| Draft Saving                 |  [ ]  |     [ ]    |      [ ]     |
| Public Preview               |  [ ]  |     [ ]    |      [ ]     |
| Publishing                   |  [ ]  |     [ ]    |      [ ]     |
| Archiving                    |  [ ]  |     [ ]    |      [ ]     |
| Restore Archived Content     |  [ ]  |     [ ]    |      [ ]     |
| Site Settings                |  [ ]  |     [ ]    |      [ ]     |

---

## 15.3 Media

| Feature                   | Ready | Incomplete | Out of Scope |
| ------------------------- | :---: | :--------: | :----------: |
| WebP Upload               |  [ ]  |     [ ]    |      [ ]     |
| JPEG Upload               |  [ ]  |     [ ]    |      [ ]     |
| Conditional PNG Upload    |  [ ]  |     [ ]    |      [ ]     |
| File-Type Validation      |  [ ]  |     [ ]    |      [ ]     |
| File-Size Validation      |  [ ]  |     [ ]    |      [ ]     |
| Image Compression         |  [ ]  |     [ ]    |      [ ]     |
| Upload Preview            |  [ ]  |     [ ]    |      [ ]     |
| Alt Text                  |  [ ]  |     [ ]    |      [ ]     |
| Caption                   |  [ ]  |     [ ]    |      [ ]     |
| Image Ordering            |  [ ]  |     [ ]    |      [ ]     |
| Primary Image Selection   |  [ ]  |     [ ]    |      [ ]     |
| Image Replacement         |  [ ]  |     [ ]    |      [ ]     |
| Missing-Image Fallback    |  [ ]  |     [ ]    |      [ ]     |
| Orphan Cleanup            |  [ ]  |     [ ]    |      [ ]     |
| External Original Archive |  [ ]  |     [ ]    |      [ ]     |

---

## 15.4 Product Quality

| Requirement                      | Ready | Incomplete | Out of Scope |
| -------------------------------- | :---: | :--------: | :----------: |
| Mobile Public Navigation         |  [ ]  |     [ ]    |      [ ]     |
| Mobile Tourism Map               |  [ ]  |     [ ]    |      [ ]     |
| Mobile Admin Forms               |  [ ]  |     [ ]    |      [ ]     |
| Keyboard Navigation              |  [ ]  |     [ ]    |      [ ]     |
| Visible Focus States             |  [ ]  |     [ ]    |      [ ]     |
| Accessible Form Errors           |  [ ]  |     [ ]    |      [ ]     |
| Text Alternative for Map         |  [ ]  |     [ ]    |      [ ]     |
| Published-Only Sitemap           |  [ ]  |     [ ]    |      [ ]     |
| Draft Pages Excluded from Search |  [ ]  |     [ ]    |      [ ]     |
| Specific Error Messages          |  [ ]  |     [ ]    |      [ ]     |
| Placeholder Publication Block    |  [ ]  |     [ ]    |      [ ]     |
| Village-Officer Acceptance Test  |  [ ]  |     [ ]    |      [ ]     |

---

## 15.5 Migration and Handover

| Requirement                       | Ready | Incomplete | Out of Scope |
| --------------------------------- | :---: | :--------: | :----------: |
| QGIS Coordinate Validation        |  [ ]  |     [ ]    |      [ ]     |
| Initial Destination Import        |  [ ]  |     [ ]    |      [ ]     |
| Imported Records Start as Draft   |  [ ]  |     [ ]    |      [ ]     |
| Duplicate Review                  |  [ ]  |     [ ]    |      [ ]     |
| Production Account Ownership      |  [ ]  |     [ ]    |      [ ]     |
| Backup Owner                      |  [ ]  |     [ ]    |      [ ]     |
| Database Backup Procedure         |  [ ]  |     [ ]    |      [ ]     |
| Media Backup Procedure            |  [ ]  |     [ ]    |      [ ]     |
| Administrator Guide               |  [ ]  |     [ ]    |      [ ]     |
| Media Preparation Guide           |  [ ]  |     [ ]    |      [ ]     |
| Administrator Training            |  [ ]  |     [ ]    |      [ ]     |
| Credential Recovery Documentation |  [ ]  |     [ ]    |      [ ]     |

---

## 15.6 Explicitly Out of Scope

| Feature                    | Ready | Incomplete | Out of Scope |
| -------------------------- | :---: | :--------: | :----------: |
| Online Booking             |  [ ]  |     [ ]    |      [x]     |
| Payment Gateway            |  [ ]  |     [ ]    |      [x]     |
| Visitor Reviews            |  [ ]  |     [ ]    |      [x]     |
| Ratings                    |  [ ]  |     [ ]    |      [x]     |
| Favorites                  |  [ ]  |     [ ]    |      [x]     |
| Trip Planner               |  [ ]  |     [ ]    |      [x]     |
| Route Optimization         |  [ ]  |     [ ]    |      [x]     |
| Offline Maps               |  [ ]  |     [ ]    |      [x]     |
| AI Chatbot                 |  [ ]  |     [ ]    |      [x]     |
| Recommendation Engine      |  [ ]  |     [ ]    |      [x]     |
| Advanced GIS Analysis      |  [ ]  |     [ ]    |      [x]     |
| Native Mobile Application  |  [ ]  |     [ ]    |      [x]     |
| UMKM E-commerce            |  [ ]  |     [ ]    |      [x]     |
| Homestay Room Inventory    |  [ ]  |     [ ]    |      [x]     |
| Public Visitor Accounts    |  [ ]  |     [ ]    |      [x]     |
| Additional Admin Accounts  |  [ ]  |     [ ]    |      [x]     |
| Editor Roles               |  [ ]  |     [ ]    |      [x]     |
| Role and User Management   |  [ ]  |     [ ]    |      [x]     |
| Invitation Flows           |  [ ]  |     [ ]    |      [x]     |
| Approval Workflows         |  [ ]  |     [ ]    |      [x]     |
| Permanent Deletion         |  [ ]  |     [ ]    |      [x]     |
| Multilingual Publishing    |  [ ]  |     [ ]    |      [x]     |
| Automatic Event Recurrence |  [ ]  |     [ ]    |      [x]     |
| Package Participant Limits |  [ ]  |     [ ]    |      [x]     |
| Structured Stop Timing     |  [ ]  |     [ ]    |      [x]     |
