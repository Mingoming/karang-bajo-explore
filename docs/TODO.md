# TODO — Karang Bajo Explore

## Current Release Authority

Bagian ini adalah sumber status saat ini. Checklist fase di bawah dipertahankan sebagai catatan implementasi historis; checklist tersebut bukan otorisasi deployment dan tidak menggantikan [`docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`](PRODUCTION_DEPLOYMENT_RUNBOOK.md). Item `☐`, `◐`, dan `⚠` di dalam checklist historis bukan current release blocker atau task assignment kecuali disalin ke bagian aktif dengan evidence terbaru.

- **Release source:** protected `main` pada `ef171a60a1f1097930411d456c98f2f9d38df57d`.
- **Release history:** PR #50 telah di-merge.
- **Baseline produksi yang diberikan untuk rekonsiliasi ini:** migration `20260910090000_bilingual_media_replacement_path_contract.sql` telah diterapkan ke hosted Supabase dan pending migrations setelah deployment adalah `0`.
- **Media incident:** media replacement-path incident berstatus `CLOSED`; tidak diperlukan mutation content atau Storage untuk incident tersebut.
- **Repository boundary:** CI `Quality` menjalankan `npm ci` dan `npm run check`; CI tidak menerapkan Supabase migrations dan tidak membuktikan application deployment.
- **Deployment boundary:** application deployment dan hosted database migration deployment adalah langkah terpisah.
- **Dokumentasi:** status release dan runbook direkonsiliasi pada branch ini; hosted facts di atas berasal dari release evidence yang diberikan, bukan dari akses hosted oleh audit ini.

## Current Open Work

- Jalankan `npm.cmd run check` dan validasi focused/database/browser yang relevan untuk setiap perubahan berikutnya; gunakan suite dan inventory saat ini, bukan angka tetap historis.
- Simpan release evidence untuk owner produksi, backup/recovery, canonical origin dan aset SEO, verifikasi content, acceptance administrator, dan browser smoke bila evidence tersebut belum tercatat di tempat yang disetujui.
- Reconcile checklist historis lain hanya ketika ada evidence baru; jangan membuka kembali blocker lama tanpa reproduksi atau keputusan release yang baru.

## Content and Data Follow-up

- Verifikasi contacts, cultural information, addresses, prices, schedules, coordinates, dan publication consent dari sumber yang berwenang sebelum publication.
- Review English translation against approved source material; jangan menganggap route atau migration availability sebagai content approval.
- Jangan mengarang atau memperbaiki production content maupun Storage tanpa root-cause evidence, authorization, dan publication decision yang sesuai.

## Status Proyek

- **Nama Proyek:** Karang Bajo Explore
- **Fase Saat Ini:** Release baseline dan post-deployment closeout
- **Branch Dasar Pengembangan:** protected `main`
- **Progress Implementasi:** Core public domains, administration modules, GIS, media delivery, SEO foundation, kontak resmi terpusat, automated tests, bilingual workflows, dan CI quality gate tersedia pada `main`.
- **Status Dokumentasi:** ☑ Release documentation direkonsiliasi pada branch ini
- **Status deployment:** Baseline produksi di atas telah diberikan sebagai deployed; future release tetap mengikuti runbook dan approval gates.

## Legenda Status

- ☐ Not Started
- ◐ In Progress
- ☑ Completed
- ⚠ Blocked

## Superseded Release Blockers

Daftar blocker pre-production sebelumnya dihapus dari status aktif karena bertentangan dengan baseline produksi yang diberikan. Jangan menganggap owner, domain, backup, content acceptance, atau approval status selesai maupun belum selesai tanpa release evidence terbaru yang disetujui.

## Completed Release Work on `main`

- ☑ Protected `main` berada pada release source yang diberikan dan PR #50 telah di-merge.
- ☑ Migration `20260910090000_bilingual_media_replacement_path_contract.sql` termasuk dalam applied production baseline yang diberikan; hosted pending migrations setelah deployment adalah `0`.
- ☑ Media replacement-path incident ditutup; tidak ada corrective source, data, atau Storage mutation yang diperlukan untuk incident tersebut.
- ☑ Public domains, administrator workflows, bilingual workflows, media delivery, GIS, SEO foundation, automated tests, dan CI quality gate tersedia pada current `main`.
- ☑ Dedicated production deployment runbook tersedia di `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`.

PR lama seperti PR #1–#4 dan PR #12–#14 tetap dapat ditelusuri melalui Git history sebagai milestone historis; PR tersebut bukan batas release saat ini.

---

## Historical Implementation Checklist (Non-Actionable)

Bagian Phase 1–7 di bawah hanya untuk traceability terhadap rencana implementasi lama. Unchecked items di dalamnya tidak boleh dibaca sebagai blocker release saat ini; current active work berada pada `Current Open Work`, `Content and Data Follow-up`, follow-up Phase 8, dan bagian `Deferred / Future`.

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
- ☑ Definisikan dan terapkan private bucket `tourism-media`
- ☑ Tetapkan private Storage dan future server-side signed URL delivery
- ☑ Tetapkan Server Action dan platform Storage sebagai trusted upload-validation boundary
- ☑ Buat initial migration lokal
- ☑ Aktifkan RLS pada application tables
- ☑ Buat public-safe read views dan policies
- ☑ Buat administrator mutation policies
- ☑ Buat dan uji Storage policies administrator secara lokal
- ☑ Media schema, RLS, dan Storage policy contract tersedia pada migration history; hosted deployment status dicatat hanya dalam release evidence.
- ☐ Generate database types

## Phase 2C — Local Database and RLS Test Suite

- ☑ Buat deterministic pgTAP database test suite
- ☑ Uji sole-administrator authorization dan denied identities
- ☑ Uji anonymous published-only exposure dan private-field isolation
- ☑ Uji lifecycle, slug, coordinates, prices, events, media, consent, packages, dan seed
- ☑ Local pgTAP database suite mencakup private Storage, RPC-only mutation Media, transactional Tourism Package RPC, official-contact dan site-setting RLS, penolakan direct table mutation, atomic rollback, sinkronisasi thumbnail, fallback primary, batas 10 gambar, federated published-media access, dan English Village Profile; jalankan current suite sebelum release berikutnya.
- ☑ Database lint untuk schema `public` dan `private` lulus tanpa error

## Phase 2C.1 — Coordinate Integrity Correction and Test Completion

- ☑ Perbaiki seluruh nullable latitude/longitude pair constraints pada initial migration
- ☑ Verifikasi both-null, complete pair, half-null, dan coordinate ranges melalui pgTAP
- ☑ Terapkan initial migration dan seed dari database lokal kosong
- ☑ Selesaikan pgTAP suite yang relevan dengan current schema contract; gunakan hasil suite saat ini pada setiap release.

## Phase 2 Completion Gate

- ☑ Migration dapat dijalankan dari database kosong.
- ☑ Anonymous hanya dapat membaca konten published.
- ☑ Anonymous tidak dapat melakukan mutation.
- ☑ Identity selain administrator tidak mendapat akses administratif pada database.
- ☑ Draft dan archived tidak dapat dibaca publik.
- ☑ Storage policies lokal lulus pengujian izin.
- ☑ Storage policies Media lulus validasi lokal; hosted authorization dan upload evidence tetap menjadi bagian release record terpisah.
- ☑ Authorization contract menolak identity non-administrator dan akses URL publik biasa ke object private dalam validasi yang relevan.

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

- ☑ Public layout
- ☑ Public navigation foundation dengan in-page links untuk domain yang belum diimplementasikan
- ☑ Mobile navigation yang keyboard-accessible
- ☑ Footer tanpa informasi kontak yang dibuat-buat
- ☑ Shared loading presentation primitive
- ☑ Shared empty-state presentation primitive
- ☑ Shared error presentation primitive

## Pages

- ☑ Homepage visual foundation dan komposisi placeholder eksplisit
- ☑ Homepage published-data dan signed-media integration untuk enam domain Media
- ☑ Village Profile
- ☑ Destination List
- ☑ Destination category filter
- ☑ Destination Detail
- ☑ Interactive Map page
- ☑ Traditional House list
- ☑ Traditional House detail
- ☐ Pranata Adat Bayan list
- ☐ Pranata Adat Bayan detail
- ☐ Culture Articles list
- ☐ Culture Article detail
- ☑ Tourism Packages list
- ☑ Tourism Package detail dengan destinasi terbit terurut
- ☑ Homestays list
- ☑ Homestay detail
- ☑ UMKM list
- ☑ UMKM detail
- ☑ Cultural Events list
- ☑ Cultural Event detail
- ☐ Gallery
- ☑ Contact dengan kanal published-only dan fallback aman saat belum dikonfigurasi
- ☑ CTA WhatsApp utama terpusat pada homepage, footer, dan halaman detail publik

## Quality

- ☑ Published-only public queries untuk enam domain yang tersedia
- ☑ Public not-found behavior untuk route detail yang tersedia
- ☑ Responsive design untuk route publik yang tersedia
- ☑ Mobile-first layout untuk route publik yang tersedia
- ☑ SEO metadata tanpa signed URL untuk route publik yang tersedia
- ☑ Robots rules
- ☐ Canonical URLs — menunggu final production origin.
- ☐ Published-only sitemap — menunggu final production origin.
- ☐ Permanent social preview fallback — menunggu aset resmi yang telah disetujui.

### Destination Public Milestone 2

- ☑ Query list dan detail menggunakan public-safe view yang hanya memuat destinasi `published`.
- ☑ Slug yang tidak dikenal serta destinasi draft/archived menghasilkan not-found tanpa membocorkan konten.
- ☑ Primary image dan galeri mengikuti urutan tersimpan dengan fallback aman ketika signed URL gagal.
- ☑ Signed URL destinasi dibuat server-side secara batch dengan TTL 600 detik hanya untuk path database yang dimiliki destinasi published.
- ☑ Metadata list/detail menggunakan nama dan ringkasan terverifikasi tanpa signed URL sementara sebagai Open Graph image.
- ☑ Integrasi data destinasi dan signed media pada homepage.
- ☑ Federated public-media authorization dan batch signing digunakan oleh route publik enam jenis parent.
- ☑ Federated public-media migration `20260730094319_federated_public_media_delivery.sql` termasuk dalam migration history current `main`; status hosted mengikuti applied baseline dan pending list pada release evidence.

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
- ☐ Password recovery credential-backed validation — deferred because the Supabase built-in email provider reached its fixed email rate limit.

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

- ☑ Create, view, update, dan lifecycle singleton Village Profile (tanpa deletion atau media)
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
- ☑ Transactional `tourism_package_create` dan `tourism_package_update` RPC dengan sole-admin authorization, row locking, complete-set validation, dan atomic rollback
- ☑ Direct mutation `tourism_packages` dan `package_destinations` dicabut dari `authenticated`; aplikasi menggunakan RPC untuk seluruh create dan edit
- ☑ Tourism Package focused application dan pgTAP coverage tersedia pada current suite.
- ☑ Transactional Tourism Package migration `20260730044746_tourism_package_transactional_rpcs.sql` termasuk dalam current migration history; hosted status mengikuti release evidence.
- ◐ Credential-backed hosted administrator, non-administrator, dan atomic-rollback validation harus ditautkan ke release record yang disetujui; audit dokumentasi ini tidak menjalankannya.

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
- ☑ Contact admin list, create, edit, reorder, publish, archive, dan restore
- ☑ Validasi native kontak resmi, URL aman, lifecycle, serta duplicate handling
- ☑ Pengaturan nomor WhatsApp utama terpusat dengan status configured/unconfigured
- ☑ Official Contact lightweight application tests dan focused pgTAP RLS coverage

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
- ☑ Parent Media Gallery `/admin/media/kelola` dengan seluruh gambar milik parent, badge primary, jumlah `n/10`, dan grid responsif
- ☑ Navigasi overview → galeri parent → tambah/edit; create berhasil kembali ke galeri parent
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
- ☑ Federated public signed-URL delivery untuk parent dan consumer yang didukung tersedia pada current `main`; hosted status mengikuti release evidence.
- ☑ Media tests dan focused pgTAP Storage/RPC coverage tersedia pada current suite; jangan gunakan total historis tetap.
- ☑ Media replacement-path contract tersedia pada current `main`; supplied production incident untuk `/homestay/kaki-rinjani` telah ditutup tanpa data atau Storage correction.

### Media Credential-Backed Browser Validation

- ☑ Administrator dapat membuka galeri Media per parent.
- ☑ Galeri menampilkan seluruh gambar yang dimiliki parent dan jumlah gambar yang benar.
- ☑ Administrator dapat menambahkan gambar kedua dan kembali ke galeri setelah upload berhasil.
- ☑ Data gambar dan jumlah galeri tetap konsisten setelah upload.
- ☑ Administrator dapat membuka dan mengubah metadata gambar.
- ☑ Administrator dapat mengganti primary image dan galeri menampilkan state primary yang sesuai.
- ☑ Administrator dapat kembali dari edit ke galeri parent.
- ☑ Administrator dapat menghapus gambar tanpa merusak konsistensi galeri dan primary image.
- ☑ Credential-backed non-administrator Media authorization validation: PASS
- ☑ Akses object private melalui URL publik biasa ditolak: PASS

## Phase 5 Completion Gate

- ☐ Administrator dapat mengelola seluruh konten MVP.
- ☐ Tidak ada user-management atau role-management screen.
- ☐ Permanent deletion tidak tersedia.
- ☐ Dashboard dapat digunakan pada mobile.
- ☐ Semua mutation memeriksa administrator pada server dan RLS.

---

# Phase 6 — GIS

## Public Tourism Map

- ☑ Interactive Map page
- ☑ Leaflet integration
- ☑ OpenStreetMap tile layer untuk development
- ⚠ Pilih provider tile produksi
- ☑ OpenStreetMap attribution
- ☑ Destination markers
- ☑ Traditional House markers
- ☑ Homestay markers
- ☑ Visitable UMKM markers
- ☑ Combined marker untuk koordinat identik
- ⚠ UMKM Tenun berbagi marker Kampung Adat — menunggu koordinat survei nyata yang telah diverifikasi
- ☑ Marker popup
- ☑ Category filters untuk kategori destinasi
- ☐ Map legend terpisah
- ☑ Fit bounds untuk beberapa marker
- ☑ Single-marker focus
- ☑ Empty-map state
- ☑ Invalid-coordinate handling
- ☑ Google Maps external link dengan coordinate fallback
- ☑ Textual map alternative
- ☑ Mobile map behavior
- ☑ Peta tetap menyediakan fallback ketika tile gagal
- ☑ Tidak meminta atau menyimpan lokasi perangkat pengguna

## Administrator Coordinate Entry

- ☑ Reusable Map Picker
- ☑ Manual latitude/longitude input
- ☑ Sinkronisasi input manual dan pemilihan titik pada peta
- ☑ Required coordinate picker untuk Destinasi
- ☑ Optional coordinate picker untuk Homestay
- ☑ Optional coordinate picker untuk UMKM
- ☑ Optional coordinate picker untuk Rumah Adat
- ☑ Optional coordinate picker untuk Acara Budaya
- ☑ Optional coordinate picker untuk Profil Desa
- ☑ Validasi pasangan latitude dan longitude
- ☑ Validasi coordinate range
- ☑ Deterministic coordinate formatting

## Survey Data Import

- ☐ GeoJSON validator
- ☐ GeoJSON coordinate conversion
- ☐ Duplicate candidate report
- ☐ Category mapping untuk data import
- ☐ Initial GeoJSON import
- ☐ Imported records start as draft
- ☐ Manual coordinate review
- ⚠ Import data koordinat hasil survei ditunda sampai data sumber diverifikasi

## Phase 6 Completion Gate

- ☑ Marker aplikasi berasal dari published data yang tersimpan.
- ☑ Koordinat invalid tidak menghasilkan marker.
- ☑ Record dengan koordinat identik digabungkan dalam satu marker.
- ☑ Kegagalan tile peta tidak merusak keseluruhan halaman.
- ☑ Peta menyediakan daftar lokasi sebagai alternatif tekstual.
- ☑ QGIS tidak dibutuhkan untuk pembaruan koordinat harian.
- ⚠ Provider tile produksi belum ditetapkan.
- ☐ Alur import GeoJSON dan review data survei belum selesai.

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
- ◐ Critical browser/E2E evidence harus dicatat per release; TODO ini tidak menyatakan adanya aggregate browser run saat ini.
- ☐ Tidak ada defect critical atau high yang terbuka.

---

# Phase 8 — Deployment and Handover

Checklist deployment lama yang menyatakan pre-production setup telah disupersede. Status deployment saat ini hanya boleh diambil dari current release authority dan evidence record pada runbook.

## Current release evidence

- ☑ Release source, PR #50, latest migration, hosted pending state, dan media-incident closeout dicatat pada bagian `Current Release Authority`.
- ☑ Application deployment dan hosted database migration deployment diperlakukan sebagai langkah terpisah.
- ◐ Exact application deployment identity, production owner, target classification, backup/recovery owner, dan handover acceptance harus ditautkan ke release record; TODO ini tidak mengarang nilainya.

## SEO and Content follow-ups

- ☑ Public robots rules foundation.
- ☑ Shared SEO metadata untuk route konten publik.
- ☑ Metadata detail membaca published-safe metadata.
- ☑ Missing public content menggunakan noindex.
- ☑ Metadata tidak menggunakan signed private media URL.
- ◐ Canonical URLs, published-only sitemap, dan permanent Open Graph asset menunggu origin/aset produksi yang disetujui.
- ☐ Final SEO, sitemap, dan robots review pada deployment produksi.
- ☐ Replace temporary KKN logo jika aset resmi telah disetujui.
- ☐ Verify all public contacts, cultural information, dan placeholder removal.
- ☐ Update final screenshots bila diperlukan oleh handover.

## Backup and Handover records

- ☐ Record backup owner, frequency, retention, dan recovery procedure.
- ☐ Record or perform approved database, media, QGIS, dan original-image backup.
- ☐ Complete an approved restore test.
- ☐ Record credential recovery tanpa menyimpan secret.
- ☐ Complete administrator, backup, image-management, deployment, dan known-limitations guides.
- ☐ Complete administrator training, workflow demonstrations, account ownership transfer, dan handover acceptance.

## Phase 8 Completion Gate

- ☐ Release evidence identifies the approved application commit and target.
- ☐ Read-only post-deployment verification and production smoke evidence are complete.
- ☐ Content publication and operational ownership are explicitly accepted.
- ☐ Backup/recovery and handover evidence are complete.
- ☐ No runbook stop condition remains open.

---

# Known Issues

## Dependency Audit Status

- ◐ Dependency and quality status must be refreshed from the current lockfile, `npm.cmd run check`, CI `Quality`, and the release evidence for the relevant commit; old baseline SHAs, fixed test totals, and historical audit findings are not current release authority.
- ⚠ Future audits may change as the npm advisory database changes; dependency monitoring remains ongoing maintenance.
- ⚠ `npm audit fix --force` remains prohibited because it can propose incompatible breaking changes.

## Deferred Documentation Reconciliation

- ⚠ `DESIGN.md` uses `/admin/event-adat`, while the approved implementation remains `/admin/acara-budaya`. Reconcile the documentation naming separately without renaming the implemented route or adding modules outside the approved dashboard shell.
- ⚠ `PRD.md`, `RULES.md`, and `DESIGN.md` allow incomplete destination drafts and describe coordinates as publication requirements, while the applied migration requires `summary`, `description`, `latitude`, and `longitude` on every destination row. The administrator form follows the applied migration.
- ⚠ The applied migration hard-requires a thumbnail pair before destination publication and permits `draft → archived`; general lifecycle documentation presents a narrower typical flow. Media remains outside the current module, so destinations without existing thumbnail metadata cannot be published here.
- ⚠ `DESIGN.md` proposes `/admin/destinasi/baru`, React Hook Form/Zod, and a map picker. The approved destination task uses `/admin/destinasi/tambah`, typed native validation, and manual coordinates without GIS or new form dependencies.
- ⚠ The initial migration header and related schema documents retain historical deployment wording. Reconcile that documentation separately without changing the applied schema; this task makes no schema mutation.
- ⚠ `SCHEMA.md` says a published homestay should normally have an image, while the applied migration hard-requires a thumbnail pair before publication. The administrator form follows the applied migration; media and thumbnail creation remain deferred.
- ⚠ `DESIGN.md` still lists facilities representation as pending even though the applied migration and approved rules use `text[]`. Homestay facilities follow the applied schema.
- ⚠ `DESIGN.md` proposes a homestay map picker. The approved homestay administration task excludes GIS, so this module supports manual nullable coordinate pairs only.
- ⚠ `SCHEMA.md` describes UMKM category as controlled text, but neither the documents nor the applied migration define an approved value list or reference table. The administrator form follows the applied migration by accepting required nonblank category text without inventing a taxonomy.
- ⚠ `PRD.md`, `RULES.md`, and `DESIGN.md` require a UMKM map picker. The approved UMKM administration task excludes maps and GIS, so this module supports manual nullable coordinate pairs only.
- ⚠ The applied UMKM schema contains no price, product, service, or inventory fields. The administrator module does not represent these concepts through unrelated fields.
- ⚠ Milestone 4 meminta kapasitas Homestay, tetapi applied schema dan `published_homestays` tidak memiliki field kapasitas; halaman publik tidak mengarang nilai tersebut.
- ⚠ Milestone 4 meminta produk/layanan dan marketplace UMKM bila tersedia, tetapi applied schema dan `published_umkms` tidak memilikinya; halaman publik hanya menampilkan field yang benar-benar tersedia.
- ⚠ `PRD.md` permits incomplete traditional-house drafts, while the applied migration requires both `name` and `description` on every row. The administrator form follows the applied migration.
- ⚠ The applied migration hard-requires a thumbnail pair before traditional-house publication, while the narrative documentation describes images more generally. Media remains outside this module, so records without existing thumbnail metadata cannot be published here.
- ⚠ `PRD.md`, `RULES.md`, and `DESIGN.md` require a traditional-house map picker. The approved administration task excludes maps and GIS, so this module supports manual nullable coordinate pairs only.
- ⚠ The applied traditional-house schema contains no contact, publication-consent, opening-hours, price, donation, facilities, or source-note fields. The administrator module does not represent these concepts through unrelated fields.
- ⚠ `PRD.md` permits a cultural event without a confirmed date to be published when an approved `date_note` exists, while the applied migration requires `start_at` for every published event. The administrator module follows the applied migration: date-note-only events remain draft and are never upcoming.
- ⚠ `DESIGN.md` still lists event timezone and uncertain-date classification as pending even though the approved rules, `SCHEMA.md`, and applied migration establish `Asia/Makassar`, `all_day`, and date-note-only records remaining draft. The administrator module follows those resolved rules.
- ⚠ `DESIGN.md` proposes an event location picker and public preview. The approved Cultural Event administration task excludes maps, GIS, and preview routes, so this module supports manual nullable coordinate pairs only.
- ☑ Transactional Tourism Package RPC menutup perbedaan trigger lama dengan mewajibkan seluruh destinasi berstatus `published` sebelum publikasi; direct client mutation telah dicabut.
- ☑ Transactional Tourism Package RPC menggantikan kompensasi aplikasi: parent dan complete ordered destination set sekarang commit atau rollback bersama.
- ☑ Penyuntingan relasi paket non-draft ditolak pada RPC database dan antarmuka administrator.

---

# Bilingual Public-Shell Foundation

- ☑ Path-derived locale uses a sanitized Proxy-injected internal request header without changing admin/auth session handling.
- ☑ Root locale dynamic-rendering and caching behavior validated under Next.js 16.
- ☑ Typed `id` and `en` dictionaries and the ten-key semantic public-route manifest implemented.
- ☑ `/en` implemented as the only Phase 1 English route without querying Indonesian domain content.
- ☑ Public header, mobile navigation, footer, homepage static UI, contact CTA UI, and external-tourism-link UI localized.
- ☑ `/` and `/en` language switcher implemented without inventing unsupported English equivalents.
- ☑ Dictionary-parity, route-manifest, metadata, no-fallback, admin-isolation, and Indonesian-regression tests added.
- ☑ Server-rendered `<html lang="id">` and `<html lang="en">` validated through local HTTP responses.

## English Public Content and Bilingual Rollout — Current `main`

- ☑ Database-backed English content, explicit per-domain translation contracts, lifecycle validation, RLS boundaries, and no-fallback behavior are implemented on current `main`.
- ☑ The current implementation covers Village Profile plus destination, tourism package, homestay, UMKM/local-business, traditional-house, and cultural-event public route families.
- ☑ The current implementation includes the applicable administrator source, English translation, and English image-translation workflows; Village Profile remains a singleton translation workflow without media translation.
- ☑ PR #12, PR #13, and PR #14 remain useful historical milestones for the Village Profile rollout, not the current bilingual scope boundary.
- ☑ The supplied production baseline states that the latest bilingual media migration is applied and that hosted pending migrations after deployment are `0`.
- ◐ Domain-by-domain English content verification, translation freshness, publication approval, administrator acceptance, browser smoke, and SEO evidence must be recorded in the approved release record.

This section records implemented delivery, not permission to publish content or mutate a hosted target. Future scope outside the current implementation remains subject to stakeholder approval and the separate gates in [`docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`](PRODUCTION_DEPLOYMENT_RUNBOOK.md).

---

# Bilingual Public Rollout — Implemented Delivery and Content Gate

The rollout implementation is present on current `main`; the former “proposed implementation authorization” wording is obsolete. Availability of routes, schema, or workflows does not by itself authorize production migration, content publication, or a future-scope commitment.

- ☑ Route pairs, localized shell behavior, terminology contracts, and no-fallback policy are implemented in the current route/configuration surface.
- ☑ Per-domain schema, RLS, publication, stale-source, deletion, and media contracts are represented by the current migrations and application workflows.
- ☑ The phased implementation has repository-backed application and database tests; run the current relevant suite for each future release.
- ◐ English content owners and review responsibilities must be assigned for every public domain before publication.
- ◐ Each route family must pass its database, application, browser, rendering, SEO, and regression gates for the release in scope.
- ◐ Production content publication and post-deployment validation remain separately authorized release activities.

The complete design history, audit, sequence, and acceptance gates remain in [`docs/BILINGUAL_PUBLIC_ROLLOUT_PLAN.md`](BILINGUAL_PUBLIC_ROLLOUT_PLAN.md).
---

# Deferred / Future Features

## Proposed Version 1.1 Deferrals — Pending Explicit Approval

- ◐ General Cultural Articles
- ◐ Bayan Customary Institution Articles
- ◐ Standalone Public Gallery
- ◐ Advanced Dashboard Analytics
- ◐ Responsive image derivatives
- ◐ Advanced structured data
- ◐ Visitor analytics

Usulan di atas belum disetujui. Item tersebut tidak boleh diperlakukan sebagai deferral resmi Version 1.0 sampai persetujuan scope dicatat.

- ☐ Booking
- ☐ Payments
- ☐ QR Code
- ☐ Recommendation Engine
- ☐ Trip Planner
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
