# Karang Bajo Explore

Karang Bajo Explore adalah fondasi platform informasi pariwisata Desa Karang Bajo. Versi 1 akan menyajikan informasi alam, budaya, tradisi, dan layanan wisata dalam bahasa Indonesia.

## Status

Fase saat ini adalah **Phase 1 — Project Foundation**. Repository ini baru berisi fondasi aplikasi; fitur produk, Supabase, autentikasi, database, dan GIS belum diimplementasikan.

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

Buka `http://localhost:3000` pada browser. Phase 1 belum memerlukan environment variable.

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
