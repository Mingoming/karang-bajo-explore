# TODO — Karang Bajo Explore

## Status Proyek

- **Nama Proyek:** Karang Bajo Explore
- **Fase Saat Ini:** Phase 5 — Admin Dashboard (content management in progress)
- **Progress Implementasi:** Shell administrator serta modul pengelolaan Profil Desa, Destinasi, Homestay, UMKM, Rumah Adat, Acara Budaya, Paket Wisata, dan Media federasi selesai secara lokal; migration Media belum diterapkan ke hosted development; validasi autentikasi manual selesai kecuali password recovery
- **Status Dokumentasi:** ☑ Completed
- **Kesiapan Deployment:** Belum siap

## Legenda Status

- ☐ Not Started
- ◐ In Progress
- ☑ Completed
- ⚠ Blocked

## Blockers Aktif

- ⚠ Region Supabase belum dipilih.
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
- ☑ Definisikan private bucket `tourism-media` dalam forward-only migration lokal
- ☑ Tetapkan private Storage dan future server-side signed URL delivery
- ☑ Tetapkan Server Action dan platform Storage sebagai trusted upload-validation boundary
- ☑ Buat initial migration lokal
- ☑ Aktifkan RLS pada application tables
- ☑ Buat public-safe read views dan policies
- ☑ Buat administrator mutation policies
- ☑ Buat dan uji Storage policies administrator secara lokal
- ☐ Terapkan migration Media ke hosted development project setelah review
- ☐ Generate database types

## Phase 2C — Local Database and RLS Test Suite

- ☑ Buat deterministic pgTAP database test suite
- ☑ Uji sole-administrator authorization dan denied identities
- ☑ Uji anonymous published-only exposure dan private-field isolation
- ☑ Uji lifecycle, slug, coordinates, prices, events, media, consent, packages, dan seed
- ☑ Jalankan 274 assertions terhadap database lokal dengan 0 failure, termasuk private Storage, RPC-only mutation Media, penolakan direct table mutation, sinkronisasi thumbnail, fallback primary, dan batas 10 gambar
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
- ☑ Storage policies lokal lulus pengujian izin.
- ☐ Storage policies Media diterapkan dan diverifikasi pada hosted development.

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

- ☑ Traditional House admin list
- ☑ Traditional House create sebagai draft
- ☑ Traditional House edit dan lifecycle sesuai applied migration
- ☑ Traditional House validation, normalization, cultural placeholder checks, hidden slug generation, dan duplicate handling
- ☑ Traditional House lightweight application tests dan focused pgTAP coverage

### Traditional House Credential-Backed Browser Validation

- ☑ Administrator dapat membuka `/admin/rumah-adat`.
- ☑ Administrator dapat membuat record rumah adat baru sebagai `draft`.
- ☑ Data rumah adat yang dibuat tetap tersimpan setelah refresh.
- ☑ Administrator dapat mengubah nama, deskripsi, sejarah, makna budaya, lokasi, informasi kunjungan, status unggulan, dan urutan tampilan.
- ☑ Latitude dan longitude dapat dibiarkan kosong bersama-sama.
- ☑ Pengisian hanya latitude atau hanya longitude ditolak.
- ☑ Tautan Google Maps selain HTTP/HTTPS ditolak.
- ☑ Administrator dapat mengubah status rumah adat dari `draft` menjadi `archived`.
- ☑ Administrator dapat memulihkan rumah adat dari `archived` menjadi `draft`.
- ☑ Publikasi tidak tersedia atau ditolak selama metadata thumbnail wajib belum tersedia.
- ☑ Informasi budaya atau kunjungan yang masih berupa placeholder ditolak untuk publikasi.
- ☑ Nama atau slug yang duplikat ditolak dengan pesan aman dalam bahasa Indonesia.
- ☑ Pengguna terautentikasi non-administrator tidak dapat mengakses daftar, create, atau edit rumah adat.

- ☐ CRUD Pranata Adat Bayan
- ☐ CRUD Cultural Articles
- ☑ Cultural Event admin list
- ☑ Cultural Event create sebagai draft
- ☑ Cultural Event edit dan lifecycle sesuai applied migration
- ☑ Cultural Event timezone WITA, exact-date, dan uncertain-date handling
- ☑ Cultural Event validation, placeholder checks, hidden slug generation, contact consent, dan duplicate handling
- ☑ Cultural Event lightweight application tests dan focused pgTAP coverage

### Cultural Event Credential-Backed Browser Validation

- ☑ Administrator dapat membuka `/admin/acara-budaya`.
- ☑ Administrator dapat membuat acara budaya baru sebagai `draft`.
- ☑ Data acara budaya yang dibuat tetap tersimpan setelah refresh.
- ☑ Administrator dapat mengubah judul, deskripsi, jenis acara, lokasi, penyelenggara, kontak, informasi pengunjung, status unggulan, dan waktu acara.
- ☑ Waktu acara yang disimpan dan ditampilkan tetap benar dalam WITA (`Asia/Makassar`).
- ☑ Tanggal kalender yang tidak valid ditolak.
- ☑ Waktu selesai yang lebih awal daripada waktu mulai ditolak.
- ☑ Acara yang hanya memiliki catatan tanggal tetap berstatus `draft`.
- ☑ Administrator dapat mengubah status acara dari `draft` menjadi `archived`.
- ☑ Administrator dapat memulihkan acara dari `archived` menjadi `draft`.
- ☑ Publikasi tidak tersedia atau ditolak selama metadata thumbnail wajib belum tersedia.
- ☑ Publikasi tidak tersedia atau ditolak tanpa waktu mulai yang telah dikonfirmasi.
- ☑ Publikasi informasi kontak tanpa persetujuan yang tercatat ditolak.
- ☑ Slug hasil generasi yang duplikat ditolak dengan pesan aman dalam bahasa Indonesia.
- ☑ Pengguna terautentikasi non-administrator tidak dapat mengakses daftar, create, atau edit acara budaya.

- ☑ Tourism Package admin list
- ☑ Tourism Package create sebagai draft
- ☑ Tourism Package edit dan lifecycle sesuai applied migration
- ☑ Tourism Package duration, price, facilities, hidden slug, dan publication-readiness validation
- ☑ Tourism Package ordered destination association dengan pencegahan duplikasi dan normalisasi urutan
- ☑ Tourism Package lightweight application tests dan focused pgTAP coverage

### Tourism Package Credential-Backed Browser Validation

- ☑ Administrator dapat membuka `/admin/paket-wisata`.
- ☑ Administrator dapat membuat paket wisata baru sebagai `draft`.
- ☑ Data paket wisata yang dibuat tetap tersimpan setelah refresh.
- ☑ Administrator dapat mengubah nama, jenis, durasi, satuan durasi, harga, catatan harga, fasilitas, suvenir, ringkasan, deskripsi, status unggulan, dan urutan tampilan.
- ☑ Administrator dapat menambahkan beberapa destinasi ke paket berstatus `draft`.
- ☑ Administrator dapat mengubah urutan destinasi terpilih.
- ☑ Destinasi duplikat ditolak.
- ☑ Catatan dan urutan destinasi tetap tersimpan setelah refresh.
- ☑ Harga kosong diterima sebagai tidak tersedia.
- ☑ Harga `0` diterima sebagai gratis.
- ☑ Harga positif diterima.
- ☑ Durasi nol, pecahan, atau tidak valid ditolak.
- ☑ Relasi destinasi hanya dapat diubah ketika paket berstatus `draft`.
- ☑ Publikasi tidak tersedia atau ditolak selama metadata thumbnail wajib belum tersedia.
- ☑ Publikasi tidak tersedia atau ditolak tanpa sedikitnya satu destinasi.
- ☑ Publikasi tidak tersedia atau ditolak ketika salah satu destinasi terpilih belum berstatus `published`.
- ☑ Konten paket yang masih berupa placeholder ditolak untuk publikasi.
- ☑ Administrator dapat mengubah status paket dari `draft` menjadi `archived`.
- ☑ Administrator dapat memulihkan paket dari `archived` menjadi `draft`.
- ☑ Nama paket atau slug hasil generasi yang duplikat ditolak dengan pesan aman dalam bahasa Indonesia.
- ☑ Pengguna terautentikasi non-administrator tidak dapat mengakses daftar, create, atau edit paket wisata.
- ☑ Antarmuka tidak melaporkan penulisan parent atau relasi yang parsial sebagai penyimpanan berhasil.
- ⚠ Fault-injected browser validation untuk jalur kegagalan kompensasi: NOT TESTED.

- ☑ Homestay admin list
- ☑ Homestay create sebagai draft
- ☑ Homestay edit dan lifecycle sesuai applied migration
- ☑ Homestay validation, normalization, hidden slug generation, dan duplicate handling
- ☑ Homestay lightweight application tests dan focused pgTAP coverage

### Homestay Credential-Backed Browser Validation

- ☑ Administrator dapat membuka `/admin/homestay`.
- ☑ Administrator dapat membuat homestay baru sebagai `draft`.
- ☑ Data homestay yang dibuat tetap tersimpan setelah refresh.
- ☑ Administrator dapat mengubah nama, deskripsi, alamat, harga per malam, fasilitas, dan urutan tampilan.
- ☑ Latitude dan longitude dapat dibiarkan kosong bersama-sama.
- ☑ Pengisian hanya latitude atau hanya longitude ditolak.
- ☑ Harga per malam negatif atau tidak valid ditolak.
- ☑ Fasilitas multiline dinormalisasi dan baris kosong dihapus.
- ☑ Administrator dapat mengubah status homestay dari `draft` menjadi `archived`.
- ☑ Administrator dapat memulihkan homestay dari `archived` menjadi `draft`.
- ☑ Publikasi tidak tersedia atau ditolak selama metadata thumbnail wajib belum tersedia.
- ☑ Publikasi informasi kontak tanpa persetujuan yang tercatat ditolak.
- ☑ Nama homestay atau slug yang duplikat ditolak dengan pesan aman dalam bahasa Indonesia.
- ☑ Pengguna terautentikasi non-administrator tidak dapat mengakses daftar, create, atau edit homestay.

- ☑ UMKM admin list
- ☑ UMKM create sebagai draft
- ☑ UMKM edit dan lifecycle sesuai applied migration
- ☑ UMKM validation, normalization, hidden slug generation, contact-consent handling, dan duplicate handling
- ☑ UMKM lightweight application tests dan focused pgTAP coverage

### UMKM Credential-Backed Browser Validation

- ☑ Administrator dapat membuka `/admin/umkm`.
- ☑ Administrator dapat membuat record UMKM baru sebagai `draft`.
- ☑ Data UMKM yang dibuat tetap tersimpan setelah refresh.
- ☑ Administrator dapat mengubah nama usaha, kategori, deskripsi, alamat, kontak, dan urutan tampilan.
- ☑ Latitude dan longitude dapat dibiarkan kosong bersama-sama.
- ☑ Pengisian hanya latitude atau hanya longitude ditolak.
- ☑ Administrator dapat mengubah status UMKM dari `draft` menjadi `archived`.
- ☑ Administrator dapat memulihkan UMKM dari `archived` menjadi `draft`.
- ☑ Publikasi tidak tersedia atau ditolak selama metadata thumbnail wajib belum tersedia.
- ☑ Publikasi ditolak ketika koordinat, nomor telepon, dan nomor WhatsApp semuanya tidak tersedia.
- ☑ Publikasi informasi kontak tanpa persetujuan yang tercatat ditolak.
- ☑ Nama usaha atau slug yang duplikat ditolak dengan pesan aman dalam bahasa Indonesia.
- ☑ Pengguna terautentikasi non-administrator tidak dapat mengakses daftar, create, atau edit UMKM.

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

- ☑ Federated Media overview untuk enam modul induk yang didukung
- ☑ Media Upload melalui authenticated server client
- ☑ Browser preview lokal dan administrator signed URL berumur pendek
- ☐ Image compression
- ☑ File-type dan binary-signature validation untuk JPEG, PNG, dan WebP
- ☑ File-size validation maksimal 5 MiB
- ☐ Dimension validation
- ☑ Alt text wajib dan caption opsional
- ☑ Image ordering mulai dari 0
- ☑ Maksimal 10 gambar dan satu primary image per parent
- ☑ RPC-only metadata mutation; direct `INSERT`, `UPDATE`, dan `DELETE` untuk role `authenticated` dicabut pada enam image table yang didukung
- ☑ Sinkronisasi transactional primary image dan parent thumbnail
- ☑ Replace image dengan kompensasi objek baru saat metadata gagal
- ☑ Remove image, fallback primary, dan thumbnail clearing
- ☐ Missing-image warning
- ◐ Orphan-file cleanup dicatat aman saat Storage cleanup gagal; maintenance cleanup belum dibuat
- ☐ Public signed-URL delivery setelah verifikasi parent published
- ☑ Lightweight Media tests dan focused pgTAP Storage/RPC coverage

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
- ⚠ `SCHEMA.md` says a published homestay should normally have an image, while the applied migration hard-requires a thumbnail pair before publication. The administrator form follows the applied migration; media and thumbnail creation remain deferred.
- ⚠ `DESIGN.md` still lists facilities representation as pending even though the applied migration and approved rules use `text[]`. Homestay facilities follow the applied schema.
- ⚠ `DESIGN.md` proposes a homestay map picker. The approved homestay administration task excludes GIS, so this module supports manual nullable coordinate pairs only.
- ⚠ `SCHEMA.md` describes UMKM category as controlled text, but neither the documents nor the applied migration define an approved value list or reference table. The administrator form follows the applied migration by accepting required nonblank category text without inventing a taxonomy.
- ⚠ `PRD.md`, `RULES.md`, and `DESIGN.md` require a UMKM map picker. The approved UMKM administration task excludes maps and GIS, so this module supports manual nullable coordinate pairs only.
- ⚠ The applied UMKM schema contains no price, product, service, or inventory fields. The administrator module does not represent these concepts through unrelated fields.
- ⚠ `PRD.md` permits incomplete traditional-house drafts, while the applied migration requires both `name` and `description` on every row. The administrator form follows the applied migration.
- ⚠ The applied migration hard-requires a thumbnail pair before traditional-house publication, while the narrative documentation describes images more generally. Media remains outside this module, so records without existing thumbnail metadata cannot be published here.
- ⚠ `PRD.md`, `RULES.md`, and `DESIGN.md` require a traditional-house map picker. The approved administration task excludes maps and GIS, so this module supports manual nullable coordinate pairs only.
- ⚠ The applied traditional-house schema contains no contact, publication-consent, opening-hours, price, donation, facilities, or source-note fields. The administrator module does not represent these concepts through unrelated fields.
- ⚠ `PRD.md` permits a cultural event without a confirmed date to be published when an approved `date_note` exists, while the applied migration requires `start_at` for every published event. The administrator module follows the applied migration: date-note-only events remain draft and are never upcoming.
- ⚠ `DESIGN.md` still lists event timezone and uncertain-date classification as pending even though the approved rules, `SCHEMA.md`, and applied migration establish `Asia/Makassar`, `all_day`, and date-note-only records remaining draft. The administrator module follows those resolved rules.
- ⚠ `DESIGN.md` proposes an event location picker and public preview. The approved Cultural Event administration task excludes maps, GIS, and preview routes, so this module supports manual nullable coordinate pairs only.
- ⚠ Trigger publikasi pada applied migration memastikan sedikitnya satu destinasi berstatus `published`, tetapi tidak menolak destinasi tambahan berstatus `draft` yang sudah terhubung. Modul administrator menerapkan aturan dokumentasi yang lebih ketat dengan mewajibkan semua destinasi terpilih berstatus `published` sebelum publikasi; migration tidak diubah dalam tahap ini.
- ⚠ Penyimpanan parent paket dan `package_destinations` belum transaksional. Create memvalidasi seluruh input sebelum parent ditulis, memakai satu batch insert relasi, lalu mencoba kompensasi terverifikasi bila batch gagal. Applied RLS tidak memberi administrator izin hard-delete pada `tourism_packages` dan foreign key relasi memakai `ON DELETE RESTRICT`; karena itu fallback terkuat tanpa perubahan database adalah mengarsipkan parent draft secara terverifikasi, mengganti slug draft gagal agar submission dapat dicoba ulang, dan melaporkan kegagalan, bukan success.
- ⚠ Update relasi draft menyimpan snapshot server-side, menyinkronkan relasi sebelum parent, dan mencoba memulihkan snapshot bila sinkronisasi atau parent update gagal. Kompensasi ini memperkecil state parsial tetapi bukan jaminan atomic; RPC database transaksional yang tetap menghormati sole-admin authorization masih direkomendasikan sebelum production.
- ⚠ Applied migration mengizinkan perubahan catatan pada relasi destinasi paket yang sudah `published`, sedangkan antarmuka administrator membatasi seluruh penyuntingan susunan dan catatan relasi ke status `draft` agar workflow lebih aman dan konsisten.

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
