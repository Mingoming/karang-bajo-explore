# MVP Release Scope

## Karang Bajo Explore Version 1.0

- **Release target:** Version 1.0 MVP
- **Current stage:** Release preparation
- **Environment:** Development / pre-production
- **Production deployment:** Not completed
- **Approval packet source baseline:** `190acf7a741329db8d072915b8e2845414fe8f4f`
- **Approval decision baseline:** Pending exact reviewed commit SHA
- **Validated application suite:** 23 test files / 283 tests
- **Validated local database suite:** 448 pgTAP assertions
- **Production target approval:** Pending
- **Version 1.0 scope approval:** Pending explicit stakeholder decision

---

## 1. Purpose

Dokumen ini mencatat batas release Version 1.0 yang sedang dipersiapkan.

Dokumen ini tidak menggantikan PRD. Perubahan terhadap fitur Must Have harus mendapat persetujuan scope yang eksplisit sebelum release.

---

## 2. Implemented Core Capabilities

Kemampuan berikut telah diimplementasikan pada release candidate:

### Public Website

- Homepage publik
- Destination list dan detail
- Destination category filter
- Tourism package list dan detail
- Homestay list dan detail
- UMKM list dan detail
- Traditional house list dan detail
- Cultural event list dan detail
- Interactive tourism map
- Published-only data access
- Signed public media
- Loading, empty, error, dan not-found states
- English homepage foundation
- English Village Profile public route
- English Village Profile administrator workflow
- English Village Profile translation lifecycle with stale-source suppression
- Public metadata foundation
- Robots rules
- Responsive public layout

### Administration

- Single-administrator authentication
- Login dan logout
- Forgot-password dan reset-password flow
- Protected administrator routes
- Village Profile administration
- Destination administration
- Tourism Package administration
- Homestay administration
- UMKM administration
- Traditional House administration
- Cultural Event administration
- Media administration
- Draft, published, archived, dan restore lifecycle
- Image upload dan replacement
- WebP image normalization
- Coordinate picker

### Quality and Security Foundations

- Row Level Security
- Private Storage bucket
- Server-side signed media delivery
- Database tests
- Application tests: 23 file test dengan 283 test case
- Lint
- Type checking
- Production build
- CI quality gate

---

## 3. Required Before Version 1.0 Release

Pekerjaan berikut masih wajib diselesaikan:

- Central contact and WhatsApp configuration
- Official logo and favicon
- Final production origin
- Canonical URLs
- Published-only sitemap
- Permanent social preview fallback
- Production Supabase project
- Production Vercel project
- Production administrator ownership
- Password recovery production validation
- Dependency vulnerability review
- Placeholder-content removal
- Cultural-content verification
- Mobile and keyboard acceptance testing
- Database backup
- Media backup
- Backup restore test
- Administrator acceptance test
- Production smoke test

---

## 4. Proposed Version 1.1 Deferrals

Fitur berikut diusulkan untuk dipindahkan ke Version 1.1 agar Version 1.0 dapat diluncurkan lebih cepat:

- General Cultural Articles
- Bayan Customary Institution Articles
- Standalone Public Gallery
- Advanced Dashboard Analytics
- Responsive image derivatives for multiple sizes
- Advanced structured data
- Visitor analytics

**Approval status:** Pending explicit scope approval.

Fitur tersebut tidak boleh dianggap resmi ditunda sampai keputusan scope dicatat dan disetujui.

---

## 5. Explicitly Out of Scope

Version 1.0 tidak mencakup:

- Online booking
- Payment gateway
- Visitor accounts
- Ratings and reviews
- Favorites
- AI chatbot
- Native mobile application
- Multi-language publishing beyond the implemented English Village Profile pilot
- Route optimization
- Package participant limits
- Structured package-stop duration
- Automatic event recurrence

---

## 6. Version 1.0 Scope Approval Packet

### Decision requested

Stakeholder diminta mengambil keputusan eksplisit terhadap dua hal berikut:

1. Menyetujui batas Version 1.0 sebagaimana tercatat dalam dokumen ini.
2. Menyetujui atau menolak pemindahan fitur pada bagian **Proposed Version 1.1 Deferrals** dari scope Version 1.0.

Persetujuan scope tidak memberikan persetujuan untuk hosted access, database mutation, deployment, content publication, atau production GO. Seluruh tindakan tersebut tetap tunduk pada gate terpisah dalam `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`.

### Proposed Version 1.0 interpretation

Version 1.0 mencakup:

- domain publik dan administrator yang telah tercatat sebagai implemented;
- interactive tourism map;
- centralized official contact capability;
- Indonesian public content;
- English homepage foundation;
- English Village Profile pilot;
- published-only data exposure;
- signed public media delivery;
- single-administrator content management;
- release-quality, security, and validation foundations yang telah diterapkan.

Version 1.0 tidak dianggap selesai hanya karena scope disetujui. Seluruh item pada bagian **Required Before Version 1.0 Release** dan **Release Gate** tetap wajib ditutup.

### Decision record

| Field | Required value |
| --- | --- |
| Decision status | `Pending`, `Approved`, atau `Rejected` |
| Scope baseline | Exact reviewed commit SHA |
| Version 1.0 scope | Approved atau rejected |
| Proposed Version 1.1 deferrals | Approved, rejected, atau approved with exceptions |
| Decision authority | Approved stakeholder role; do not place private contact details |
| Decision date | ISO date |
| Decision notes | Exceptions, conditions, atau required follow-up |
| Production authorization | Must remain separate from this scope decision |

**Current decision status:** Pending explicit stakeholder approval.

Merging this document does not constitute stakeholder approval. Status hanya boleh diubah setelah keputusan nyata dicatat dengan authority, tanggal, baseline commit, dan catatan keputusan yang memadai.

---

## 7. Release Gate

Version 1.0 hanya boleh diluncurkan apabila:

1. CI quality gate lulus.
2. Production build berhasil.
3. Tidak ada draft atau archived content yang dapat dibaca publik.
4. Administrator tunggal dapat login dan mengelola konten.
5. Password recovery berhasil pada production environment.
6. Seluruh public critical routes dapat digunakan pada mobile.
7. Seluruh koordinat publik telah diverifikasi.
8. Tidak ada placeholder content yang tampil publik.
9. Informasi budaya telah diverifikasi.
10. Production account ownership telah ditetapkan.
11. Database dan media backup tersedia.
12. Restore test berhasil.
13. Production smoke test berhasil.
14. Tidak ada defect critical atau high yang terbuka.
