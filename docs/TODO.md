# TODO — Karang Bajo Explore

## Status Proyek

- **Nama Proyek:** Karang Bajo Explore
- **Fase Saat Ini:** Phase 5 — Admin Dashboard (Village Profile and Destination Management)
- **Progress Implementasi:** Shell administrator, modul pengelolaan Profil Desa, serta daftar, create, dan edit Destinasi selesai; validasi autentikasi manual selesai kecuali password recovery; modul produk lain belum dimulai
- **Status Dokumentasi:** ☑ Completed
- **Kesiapan Deployment:** Belum siap

## Legenda Status

- ☐ Not Started
- ◐ In Progress
- ☑ Completed
- ⚠ Blocked

## Blockers Aktif

- ⚠ Region Supabase belum dipilih.
- ⚠ Strategi visibilitas Storage untuk media draft belum diputuskan.
- ⚠ Batas validasi upload tepercaya belum diputuskan.
- ⚠ Spesifikasi final ukuran, jumlah, dan kewajiban gambar belum disetujui.
- ⚠ Pemilik akun produksi dan prosedur backup belum ditetapkan.
- ⚠ Provider tile OpenStreetMap, caching, monitoring, dan retensi log belum diputuskan.

---

# Phase 1 — Project Foundation

- ☐ Folder structure sesuai `design.md`
- ☑ Next.js foundation
- ☑ Dokumentasi proyek difinalisasi
- ☑ ESLint dikonfigurasi dan lulus
- ☑ Prettier dikonfigurasi
- ☑ Tailwind CSS foundation
- ☑ Shared configuration
- ☑ Environment validation
- ☑ `.env.example`
- ☑ Git repository diinisialisasi
- ☑ npm dan `package-lock.json` tersedia
- ☐ Route group public, auth, dan admin
- ☑ Base loading state
- ☑ Base error state
- ☑ Base not-found page
- ☐ Preview deployment awal
- ☑ README setup lokal

## Phase 1 Completion Gate

- ☐ Aplikasi berjalan secara lokal.
- ☑ Production build berhasil.
- ☑ Type check berhasil.
- ☑ Lint berhasil.
- ☐ Preview deployment dapat diakses.
- ☐ Tidak ada secret dalam repository.

---

# Phase 2 — Supabase Setup

## Phase 2A — Local Foundation and Project Linking

- ☑ Install Supabase CLI sebagai development dependency lokal
- ☑ Inisialisasi workspace lokal Supabase
- ☑ Siapkan `config.toml`, direktori migration kosong, dan `seed.sql` kosong
- ☑ Perbarui template nama environment variable publik
- ☑ Tautkan workspace lokal ke remote Supabase project
- ☑ Verifikasi daftar migration remote secara read-only

## Phase 2B — Initial Database Migration Draft

- ☑ Rekonsiliasi logical schema dengan keputusan Phase 2B
- ☑ Buat migration draft bertimestamp melalui Supabase CLI
- ☑ Definisikan seluruh tabel Version 1, constraints, audit fields, dan indexes dalam draft
- ☑ Definisikan protected administrator configuration dan `public.is_admin()` dalam draft
- ☑ Definisikan RLS dan kebijakan administrator dalam draft
- ☑ Definisikan public-safe views yang mengecualikan private fields dalam draft
- ☑ Tambahkan deterministic seed untuk Alam, Budaya, dan Religi
- ☑ Docker lokal tersedia; initial migration dan seed berhasil diterapkan dari database kosong
- ☑ Terapkan migration ke remote development project
- ☑ Jalankan database lint pada remote development project tanpa error
- ☑ Jalankan pengujian RLS terhadap database lokal

- ☑ Buat Supabase development project
- ⚠ Pilih region Supabase
- ☑ Konfigurasi environment variables lokal
- ☑ Konfigurasi server Supabase client
- ☑ Konfigurasi browser Supabase client
- ☑ Tetapkan mekanisme UUID administrator tunggal melalui `private.app_config` dan `public.is_admin()`
- ☑ Tetapkan timezone event `Asia/Makassar` dan aturan event tanpa tanggal pasti tetap draft
- ☑ Konfigurasi Supabase Auth untuk administrator tunggal
- ☑ Buat akun administrator awal
- ☑ Konfigurasi session refresh melalui Next.js Proxy
- ☐ Konfigurasi Storage buckets
- ⚠ Tetapkan strategi media draft dan public
- ⚠ Tetapkan trusted upload-validation boundary
- ☑ Buat initial migration lokal
- ☑ Aktifkan RLS pada application tables
- ☑ Buat public-safe read views dan policies
- ☑ Buat administrator mutation policies
- ☐ Buat Storage policies
- ☐ Generate database types

## Phase 2C — Local Database and RLS Test Suite

- ☑ Buat deterministic pgTAP database test suite
- ☑ Uji sole-administrator authorization dan denied identities
- ☑ Uji anonymous published-only exposure dan private-field isolation
- ☑ Uji lifecycle, slug, coordinates, prices, events, media, consent, packages, dan seed
- ☑ Jalankan 96 assertions terhadap database lokal dengan 0 failure, termasuk integritas khusus pengelolaan destinasi
- ☑ Database lint untuk schema `public` dan `private` lulus tanpa error

## Phase 2C.1 — Coordinate Integrity Correction and Test Completion

- ☑ Perbaiki seluruh nullable latitude/longitude pair constraints pada initial migration
- ☑ Verifikasi both-null, complete pair, half-null, dan coordinate ranges melalui pgTAP
- ☑ Terapkan initial migration dan seed dari database lokal kosong
- ☑ Selesaikan pgTAP suite dengan 84 assertions lulus

## Phase 2 Completion Gate

- ☑ Migration dapat dijalankan dari database kosong.
- ☑ Anonymous hanya dapat membaca konten published.
- ☑ Anonymous tidak dapat melakukan mutation.
- ☑ Identity selain administrator tidak mendapat akses administratif pada database.
- ☑ Draft dan archived tidak dapat dibaca publik.
- ☐ Storage policies lulus pengujian izin.

---

# Phase 3 — Database

- ☐ Village Profile
- ☐ Fixed Destination Categories: Alam, Budaya, Religi
- ☐ Destinations
- ☐ Destination Images
- ☐ Traditional Houses
- ☐ Traditional House Images
- ☐ Pranata Adat Bayan
- ☐ Pranata Adat Images
- ☐ Cultural Articles
- ☐ Cultural Article Images
- ☐ Cultural Events
- ☐ Cultural Event Images
- ☐ Tourism Packages
- ☐ Package Destinations
- ☐ Package Images
- ☐ Homestays
- ☐ Homestay Images
- ☐ UMKM
- ☐ UMKM Images
- ☐ Gallery Items
- ☐ Contacts
- ☐ Site Settings
- ☐ Audit fields
- ☐ Publication lifecycle: draft, published, archived
- ☐ Restore archived content to draft
- ☐ Slug generation and publication lock
- ☐ Coordinate constraints
- ☐ Price constraints
- ☐ Required indexes
- ☐ Migration tests

## Phase 3 Completion Gate

- ☐ Seluruh struktur sesuai `schema.md`.
- ☐ Tidak ada table atau field tambahan tanpa persetujuan.
- ☐ Semua constraints utama teruji.
- ☐ Tidak ada permanent-delete workflow.

---

# Phase 4 — Public Website

## Foundation

- ☐ Public layout
- ☐ Public navigation
- ☐ Mobile navigation
- ☐ Footer
- ☐ Shared loading states
- ☐ Shared empty states
- ☐ Shared error states

## Pages

- ☐ Homepage
- ☐ Village Profile
- ☐ Destination List
- ☐ Destination category filter
- ☐ Destination Detail
- ☐ Interactive Map page
- ☐ Traditional House list
- ☐ Traditional House detail
- ☐ Pranata Adat Bayan list
- ☐ Pranata Adat Bayan detail
- ☐ Culture Articles list
- ☐ Culture Article detail
- ☐ Tourism Packages list
- ☐ Tourism Package detail
- ☐ Homestays list
- ☐ Homestay detail
- ☐ UMKM list
- ☐ UMKM detail
- ☐ Cultural Events list
- ☐ Cultural Event detail
- ☐ Gallery
- ☐ Contact

## Quality

- ☐ Published-only public queries
- ☐ Public not-found behavior
- ☐ Responsive design
- ☐ Mobile-first layout
- ☐ SEO metadata
- ☐ Canonical URLs
- ☐ Sitemap published-only
- ☐ Robots rules
- ☐ Open Graph fallback
- ☐ Structured data yang relevan

## Phase 4 Completion Gate

- ☐ Semua route publik MVP tersedia.
- ☐ Draft dan archived tidak muncul.
- ☐ Halaman dapat digunakan pada mobile.
- ☐ Konten kosong tidak menghasilkan section rusak.
- ☐ Metadata tidak memuat informasi budaya yang belum terverifikasi.

---

# Phase 5 — Admin Dashboard

## Authentication

- ☑ Login
- ☑ Logout
- ☑ Forgot Password
- ☑ Reset Password
- ☑ Auth callback
- ☑ Session expiration handling
- ☑ Protected admin routes

### Authentication Validation

- ☑ Administrator login succeeds.
- ☑ Authenticated administrator session persists after refresh.
- ☑ Logout removes administrator access.
- ☑ Invalid credentials are rejected with a generic response.
- ☑ An authenticated non-administrator is denied access.
- ⚠ Password recovery end-to-end validation: NOT TESTED

## Dashboard

- ☑ Admin layout shell
- ☑ Desktop sidebar and active navigation
- ☑ Responsive mobile navigation
- ☑ Dashboard header and administrator identity display
- ☑ Protected placeholder module routes
- ☐ Dashboard summary
- ☐ Draft content summary
- ☐ Upcoming events summary
- ☐ Recently updated content

## Content Management

- ☑ Create, view, and update singleton Village Profile (tanpa deletion, media, atau workflow publikasi)
- ☑ Destination admin list dan pencarian nama berbasis server
- ☑ Destination create sebagai draft
- ☑ Destination edit dan lifecycle sesuai applied migration
- ☑ Destination validation, normalization, hidden slug generation, dan duplicate handling
- ☑ Destination lightweight application tests dan focused pgTAP coverage

### Destination Credential-Backed Browser Validation

- ☑ Administrator dapat membuka `/admin/destinasi`.
- ☑ Administrator dapat membuat destinasi baru sebagai `draft`.
- ☑ Pembuatan yang berhasil melakukan redirect secara konsisten dan menampilkan feedback sukses.
- ☑ Data destinasi yang dibuat tetap tersimpan setelah refresh.
- ☑ Administrator dapat mengubah nama, ringkasan, koordinat, kategori, dan urutan tampilan destinasi.
- ☑ Administrator dapat mengubah status destinasi dari `draft` menjadi `archived`.
- ☑ Administrator dapat memulihkan destinasi dari `archived` menjadi `draft`.
- ☑ Koordinat yang kosong atau tidak valid ditolak.
- ☑ Konflik nama atau slug duplikat menghasilkan pesan error aman dalam bahasa Indonesia.
- ☑ Publikasi tidak tersedia atau ditolak selama metadata thumbnail wajib belum tersedia.
- ☑ Pengguna terautentikasi non-administrator tidak dapat mengakses daftar, create, atau edit destinasi.

- ☐ CRUD Traditional House
- ☐ CRUD Pranata Adat Bayan
- ☐ CRUD Cultural Articles
- ☐ CRUD Cultural Events
- ☐ CRUD Tourism Packages
- ☐ CRUD Homestays
- ☐ CRUD UMKM
- ☐ CRUD Gallery
- ☐ CRUD Contact
- ☐ Website Settings

## Workflow

- ☐ Save Draft
- ☐ Preview
- ☐ Publish
- ☐ Archive
- ☐ Restore to Draft
- ☐ Search
- ☐ Status filtering
- ☐ Unsaved-change warning
- ☐ Destructive confirmation
- ☐ Slug generation
- ☐ Slug lock after first publication

## Media

- ☐ Media Upload
- ☐ Browser preview
- ☐ Image compression
- ☐ File-type validation
- ☐ File-size validation
- ☐ Dimension validation
- ☐ Alt text
- ☐ Caption
- ☐ Image ordering
- ☐ Primary image
- ☐ Replace image safely
- ☐ Remove image
- ☐ Missing-image warning
- ☐ Orphan-file cleanup

## Phase 5 Completion Gate

- ☐ Administrator dapat mengelola seluruh konten MVP.
- ☐ Tidak ada user-management atau role-management screen.
- ☐ Permanent deletion tidak tersedia.
- ☐ Dashboard dapat digunakan pada mobile.
- ☐ Semua mutation memeriksa administrator pada server dan RLS.

---

# Phase 6 — GIS

- ☐ Leaflet integration
- ☐ OpenStreetMap tile layer
- ⚠ Pilih provider tile produksi
- ☐ OpenStreetMap attribution
- ☐ Destination markers
- ☐ Traditional House markers
- ☐ Homestay markers
- ☐ Visitable UMKM markers
- ☐ Combined marker untuk koordinat identik
- ☐ UMKM Tenun berbagi marker Kampung Adat
- ☐ Marker popup
- ☐ Category filters
- ☐ Map legend
- ☐ Fit bounds
- ☐ Single-marker focus
- ☐ Empty-map state
- ☐ Invalid-coordinate handling
- ☐ Google Maps external link
- ☐ Textual map alternative
- ☐ Mobile map behavior
- ☐ User-location control
- ☐ Map Picker
- ☐ Manual latitude/longitude input
- ☐ GeoJSON validator
- ☐ GeoJSON coordinate conversion
- ☐ Duplicate candidate report
- ☐ Category mapping
- ☐ Initial GeoJSON import
- ☐ Imported records start as draft
- ☐ Manual coordinate review

## Phase 6 Completion Gate

- ☐ Marker berasal dari data tersimpan.
- ☐ Koordinat invalid tidak menghasilkan marker.
- ☐ Marker gabungan tidak tumpang tindih.
- ☐ Peta gagal tidak merusak halaman.
- ☐ QGIS tidak dibutuhkan untuk pembaruan harian.

---

# Phase 7 — Testing

## Unit

- ☐ Validation schemas
- ☐ Slug utilities
- ☐ Coordinate validation
- ☐ GeoJSON conversion
- ☐ Data mapping
- ☐ Publication checks
- ☐ Price validation
- ☐ Event-date validation
- ☐ Package-stop ordering
- ☐ Storage-path generation

## Integration

- ☐ Public published-only queries
- ☐ Authentication
- ☐ Administrator authorization
- ☐ RLS allowed paths
- ☐ RLS denied paths
- ☐ Content mutations
- ☐ Image metadata
- ☐ Package destination ordering
- ☐ Archive and restore
- ☐ Storage policies

## End-to-End

- ☐ Login
- ☐ Logout
- ☐ Password recovery
- ☐ Create destination
- ☐ Edit destination
- ☐ Select coordinates
- ☐ Upload image
- ☐ Publish destination
- ☐ Verify public appearance
- ☐ Open map marker
- ☐ Create package
- ☐ Reorder package destinations
- ☐ Archive content
- ☐ Restore content

## Quality Review

- ☐ Responsive testing
- ☐ Accessibility testing
- ☐ Keyboard testing
- ☐ Performance review
- ☐ Validation review
- ☐ Error-state review
- ☐ Empty-state review
- ☐ Public flow testing
- ☐ Admin flow testing
- ☐ Physical mobile-device testing
- ☐ Village acceptance testing

## Phase 7 Completion Gate

- ☐ Type check lulus.
- ☐ Lint lulus.
- ☐ Unit tests lulus.
- ☐ Integration tests lulus.
- ☐ Critical E2E tests lulus.
- ☐ Tidak ada defect critical atau high yang terbuka.

---

# Phase 8 — Deployment and Handover

## Production Setup

- ☐ Tetapkan owner resmi repository
- ☐ Buat Supabase production project
- ☐ Buat Vercel production project
- ☐ Konfigurasi production environment variables
- ☐ Terapkan production migrations
- ☐ Terapkan production RLS
- ☐ Terapkan production Storage policies
- ☐ Buat akun administrator produksi
- ☐ Konfigurasi domain
- ☐ Aktifkan HTTPS
- ☐ Production smoke test
- ☐ Release tag

## SEO and Content

- ☐ Final SEO review
- ☐ Final sitemap review
- ☐ Final robots review
- ☐ Replace temporary KKN logo
- ☐ Verify all public contacts
- ☐ Verify all cultural information
- ☐ Remove all placeholder content
- ☐ Update final screenshots

## Backup

- ⚠ Tetapkan backup owner
- ⚠ Tetapkan backup frequency
- ⚠ Tetapkan backup retention
- ☐ Database backup
- ☐ Media backup
- ☐ QGIS backup
- ☐ Original image archive
- ☐ Restore test
- ☐ Credential recovery record

## Handover

- ☐ Administrator Guide
- ☐ Backup Guide
- ☐ Image Management Guide
- ☐ Deployment documentation
- ☐ Known limitations
- ☐ Administrator training
- ☐ Password-recovery demonstration
- ☐ Content creation demonstration
- ☐ Image upload demonstration
- ☐ Publish demonstration
- ☐ Archive demonstration
- ☐ Backup demonstration
- ☐ Account ownership transfer
- ☐ Handover acceptance

## Phase 8 Completion Gate

- ☐ Production domain dan HTTPS aktif.
- ☐ Draft tidak dapat diakses publik.
- ☐ Administrator dapat mengelola konten tanpa developer.
- ☐ Backup dan restore telah diuji.
- ☐ Akun produksi tidak dimiliki pribadi oleh mahasiswa.
- ☐ Pelatihan dan handover selesai.

---

# Known Issues

## Dependency Audit Status

- ⚠ Full npm audit: 12 high-severity findings.
- ⚠ Production-only audit: 3 high-severity findings.
- ⚠ Development-only findings include the ESLint dependency chain.
- ⚠ Production transitive findings originate from PostCSS and Sharp bundled through Next.js.
- ⚠ No compatible stable Next.js upgrade is currently available.
- ⚠ `npm audit fix --force` must not be used because it proposes an incompatible breaking downgrade.
- ⚠ Reassess these findings before media processing or production deployment.

## Deferred Documentation Reconciliation

- ⚠ `DESIGN.md` uses `/admin/event-adat`, while the approved implementation remains `/admin/acara-budaya`. Reconcile the documentation naming separately without renaming the implemented route or adding modules outside the approved dashboard shell.
- ⚠ `PRD.md`, `RULES.md`, and `DESIGN.md` allow incomplete destination drafts and describe coordinates as publication requirements, while the applied migration requires `summary`, `description`, `latitude`, and `longitude` on every destination row. The administrator form follows the applied migration.
- ⚠ The applied migration hard-requires a thumbnail pair before destination publication and permits `draft → archived`; general lifecycle documentation presents a narrower typical flow. Media remains outside the current module, so destinations without existing thumbnail metadata cannot be published here.
- ⚠ `DESIGN.md` proposes `/admin/destinasi/baru`, React Hook Form/Zod, and a map picker. The approved destination task uses `/admin/destinasi/tambah`, typed native validation, and manual coordinates without GIS or new form dependencies.
- ⚠ The initial migration header still describes the file as a draft that has not been pushed, while the migration is already applied to the hosted development project. Reconcile that stale comment separately without changing the applied schema.

---

# Future Features

- ☐ Booking
- ☐ Payments
- ☐ Visitor Analytics
- ☐ QR Code
- ☐ Recommendation Engine
- ☐ Trip Planner
- ☐ Multi-language
- ☐ Offline Map
- ☐ Ratings and Reviews
- ☐ Favorites
- ☐ AI Chatbot
- ☐ Native Mobile App
- ☐ Advanced GIS
- ☐ Route Optimization
- ☐ Homestay Availability
- ☐ Package Participant Limits
- ☐ Structured Package Stop Timing
- ☐ Automatic Event Recurrence
- ☐ Multi-village Support

---

# Notes

- Ganti logo KKN sementara sebelum production release.
- Verifikasi seluruh informasi budaya dengan pihak desa atau sumber adat yang berwenang.
- Jangan mempublikasikan placeholder, catatan wawancara mentah, atau informasi yang belum diverifikasi.
- Semua record baru dan hasil import wajib dimulai sebagai draft.
- Jangan menambahkan user, editor, role management, atau invitation flow pada Version 1.
- Jangan menambahkan booking, pembayaran, review, rating, atau route optimization.
- Pertahankan kategori destinasi tetap: Alam, Budaya, dan Religi.
- Slug tidak boleh berubah setelah publikasi pertama.
- UMKM Tenun harus menggunakan marker gabungan dengan Kampung Adat.
- Simpan arsip foto resolusi asli di luar Supabase Storage.
- Perbarui screenshot setelah UI final.
- Perbarui status task setiap kali pull request digabung.
- Catat bug baru pada bagian Known Issues.
- Jangan menandai task selesai sebelum type check, lint, dan test terkait dijalankan.
