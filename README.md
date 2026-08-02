# Karang Bajo Explore

Karang Bajo Explore adalah sistem informasi pariwisata berbasis WebGIS untuk Desa Karang Bajo. Aplikasi menyediakan informasi wisata publik dan dashboard administrasi untuk mengelola konten yang telah diverifikasi.

## Status

Proyek berada pada tahap **release preparation / pre-production**.

Fitur utama yang telah tersedia:

- Homepage publik dengan koleksi konten terbit
- Daftar dan detail destinasi
- Filter kategori destinasi
- Daftar dan detail paket wisata
- Daftar dan detail homestay
- Daftar dan detail UMKM
- Daftar dan detail rumah adat
- Daftar dan detail acara budaya
- Peta wisata interaktif
- Login administrator tunggal
- Dashboard pengelolaan konten
- Lifecycle draft, published, archived, dan restore
- Private media storage dengan signed URL
- Upload dan replacement media
- Normalisasi gambar menjadi WebP
- SEO metadata foundation
- Robots rules
- Automated application tests
- CI quality gate

Pekerjaan yang masih diperlukan sebelum production release:

- Kontak pusat dan WhatsApp
- Persetujuan final scope MVP
- Logo dan favicon resmi
- Production domain
- Canonical URL dan sitemap
- Supabase production project
- Vercel production project
- Password recovery production validation
- Dependency security review
- Verifikasi seluruh konten
- Backup dan restore test
- Administrator acceptance testing

## Stack

- Next.js 16 dengan App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Supabase Auth, Database, dan Storage
- Leaflet dan OpenStreetMap
- Sharp untuk normalisasi gambar
- ESLint 9
- Prettier 3
- Node.js 22+
- npm

## Menjalankan Secara Lokal

Prasyarat:

- Node.js 22 atau lebih baru
- npm
- Supabase development project atau Supabase lokal

Instal dependency:

```bash
npm ci
```

Salin .env.example menjadi .env.local, lalu isi:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Jalankan development server:

```bash
npm run dev
```

Aplikasi dapat dibuka melalui:
http://localhost:3000

## Quality Gate

Jalankan seluruh pemeriksaan release:

```bash
npm run check
```

Perintah tersebut menjalankan:

```
format:check
lint
typecheck
test
build
```

Perintah individual:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
```

## Database dan Storage

Seluruh migration yang dibutuhkan aplikasi berada di:

```
supabase/migrations/
```

Database target harus menerapkan migration, RLS, Storage policy, dan konfigurasi administrator yang sesuai sebelum aplikasi digunakan.

Private bucket yang digunakan aplikasi:

```
tourism-media
```

Media publik diberikan melalui signed URL yang dibuat oleh server. URL media sementara tidak boleh digunakan sebagai permanent Open Graph image.

## Dokumentasi

Dokumentasi produk dan teknis berada di direktori:

```
docs/
```

Dokumen yang menjadi rujukan utama:

- PROJECT.md
- PRD.md
- ARCHITECTURE.md
- SCHEMA.md
- DESIGN.md
- RULES.md
- ROADMAP.md
- TODO.md
- MVP_RELEASE_SCOPE.md

## Aturan Konten

Informasi budaya, sejarah, tradisi, kontak, lokasi, dan harga tidak boleh dibuat atau ditebak.

Konten hanya boleh diterbitkan setelah diverifikasi oleh pihak desa, pengelola, atau narasumber yang berwenang.

Placeholder dan informasi yang belum diverifikasi tidak boleh tampil pada halaman publik.

## Logo Sementara

Aplikasi masih menggunakan logo KKN Desa Karang Bajo.

Logo tersebut harus diganti dengan identitas resmi atau identitas netral yang telah disetujui sebelum production release.
