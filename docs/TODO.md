# TODO — Karang Bajo Explore

## Status Proyek

- **Nama Proyek:** Karang Bajo Explore
- **Fase Saat Ini:** Phase 1 — Project Foundation
- **Progress Implementasi:** 76%
- **Status Dokumentasi:** ☑ Completed
- **Kesiapan Deployment:** Belum siap

## Legenda Status

- ☐ Not Started
- ◐ In Progress
- ☑ Completed
- ⚠ Blocked

## Blockers Aktif

- ⚠ Mekanisme aman untuk menetapkan satu UUID administrator pada RLS belum diputuskan.
- ⚠ Region Supabase belum dipilih.
- ⚠ Strategi visibilitas Storage untuk media draft belum diputuskan.
- ⚠ Batas validasi upload tepercaya belum diputuskan.
- ⚠ Spesifikasi final ukuran, jumlah, dan kewajiban gambar belum disetujui.
- ⚠ Zona waktu dan aturan event tanpa tanggal pasti belum disetujui.
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
- ☐ Environment validation
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
- ⚠ Eksekusi migration pada database lokal — Docker belum tersedia
- ☐ Terapkan migration ke remote development project
- ☐ Jalankan pengujian RLS terhadap database lokal

- ☐ Buat Supabase development project
- ⚠ Pilih region Supabase
- ☐ Konfigurasi environment variables
- ☐ Konfigurasi server Supabase client
- ☐ Konfigurasi browser Supabase client
- ⚠ Tetapkan mekanisme UUID administrator tunggal
- ☐ Konfigurasi Supabase Auth
- ☐ Buat akun administrator awal
- ☐ Konfigurasi session refresh
- ☐ Konfigurasi Storage buckets
- ⚠ Tetapkan strategi media draft dan public
- ⚠ Tetapkan trusted upload-validation boundary
- ☐ Buat initial migrations
- ☐ Aktifkan RLS
- ☐ Buat public read policies
- ☐ Buat administrator mutation policies
- ☐ Buat Storage policies
- ☐ Generate database types

## Phase 2 Completion Gate

- ☐ Migration dapat dijalankan dari database kosong.
- ☐ Anonymous hanya dapat membaca konten published.
- ☐ Anonymous tidak dapat melakukan mutation.
- ☐ Identity selain administrator tidak mendapat akses dashboard.
- ☐ Draft dan archived tidak dapat dibaca publik.
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

- ☐ Login
- ☐ Logout
- ☐ Forgot Password
- ☐ Reset Password
- ☐ Auth callback
- ☐ Session expiration
- ☐ Protected admin routes

## Dashboard

- ☐ Admin layout
- ☐ Dashboard summary
- ☐ Draft content summary
- ☐ Upcoming events summary
- ☐ Recently updated content
- ☐ Responsive admin navigation

## Content Management

- ☐ CRUD Village Profile
- ☐ CRUD Destination
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

_Belum ada issue implementasi yang dicatat._

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
