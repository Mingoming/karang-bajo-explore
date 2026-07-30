# Karang Bajo Explore

Karang Bajo Explore adalah fondasi platform informasi pariwisata Desa Karang Bajo. Versi 1 akan menyajikan informasi alam, budaya, tradisi, dan layanan wisata dalam bahasa Indonesia.

## Status

Fase saat ini mencakup **Admin Dashboard** dan **Public Website Milestone 3**. Fondasi Supabase dan autentikasi administrator tersedia bersama modul Profil Desa, Destinasi, Homestay, UMKM, Rumah Adat, Acara Budaya, Paket Wisata, serta Media federasi untuk enam jenis konten. Halaman publik daftar dan detail destinasi sudah menggunakan data published-only, sedangkan federated public-media boundary untuk enam parent dan signed URL berumur pendek telah selesai divalidasi secara lokal. Hosted validation, homepage live data, route publik untuk lima domain lain, dan GIS masih tertunda.

## Stack yang Disetujui

- Next.js 16 dengan App Router pada root `app/`
- React 19
- TypeScript dalam strict mode
- Tailwind CSS 4
- ESLint 9
- Prettier 3
- npm dan `package-lock.json`

## Menjalankan Secara Lokal

Prasyarat: Node.js 22+ dan npm.

```bash
npm ci
npm run dev
```

Salin nama variabel dari `.env.example` ke `.env.local`, lalu isi URL dan publishable key Supabase development. Buka `http://localhost:3000` pada browser. Migration Media `20260730001921_federated_admin_media.sql`, Tourism Package transactional RPC `20260730044746_tourism_package_transactional_rpcs.sql`, public destination signed media `20260730072852_public_destination_signed_media.sql`, dan federated public media `20260730094319_federated_public_media_delivery.sql` harus tersedia pada project Supabase yang digunakan. Migration federated public media baru tervalidasi lokal dan belum diterapkan pada hosted development.

## Perintah Pengembangan

```bash
npm run dev
npm run lint
npm run format
npm run format:check
npm run build
npm run start
```

## Dokumentasi

Dokumentasi produk dan teknis berada di [`docs/`](docs/). Baca dokumen yang relevan sebelum mengubah arsitektur, schema, desain, aturan, atau urutan implementasi.

## Aturan Konten

Fakta budaya tidak boleh dibuat, ditebak, atau diterbitkan tanpa verifikasi dari pihak desa atau sumber adat yang berwenang. Placeholder dan informasi yang belum terverifikasi tidak boleh menjadi konten publik.

## Logo Sementara

Aplikasi masih menggunakan logo KKN Desa Karang Bajo. Logo ini wajib diganti dengan identitas resmi sebelum deployment produksi.
