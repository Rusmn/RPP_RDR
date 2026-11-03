# FitCheck

Sistem pakar rekomendasi outfit berbasis **Ripple Down Rules (RDR)**. Dibangun dengan React, Vite, JavaScript, Tailwind CSS, dan Lucide. Seluruh inferensi dan penyimpanan berjalan di browser tanpa backend atau API AI.

## Menjalankan

Memerlukan Node.js 20.19+ atau 22.12+.

```sh
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite. Build produksi: `npm run build`.

## Menggunakan aplikasi

1. Mulai dari satu rule `R0: TRUE → Casual`.
2. Konsultasikan kasus Casual, 25°C, Indoor, Sunny, lalu **Setujui**. Persetujuan pertama menyimpan cornerstone R0.
3. Ubah acara menjadi Formal dan konsultasikan. Klik **Koreksi**, pilih Formal, gunakan kondisi `Acara = Formal`, lalu **Simpan rule baru**.
4. Konsultasikan Formal pada 33°C. Koreksi menjadi Light Formal dengan `Suhu >= 30`.
5. Konsultasikan Semi-Formal pada 25°C. Koreksi menjadi Smart Casual dengan `Acara = Semi-Formal`.
6. Buka **Eksplorasi RDR** untuk melihat pohon KB. Klik node untuk detail, klik **Buka cabang** untuk mengembangkan pohon, lalu jalankan penelusuran per langkah.

**Contoh interaktif** menyediakan pohon empat rule dan empat skenario PRD tanpa mengubah KB pengguna. Kondisi, cornerstone, dan materi RDR dibuka lewat klik; tidak ditampilkan sekaligus.

## Perilaku RDR

- TRUE memperbarui kesimpulan dan mengikuti `trueChildId` (kanan).
- FALSE mempertahankan kesimpulan dan mengikuti `falseChildId` (kiri).
- Hasil adalah kesimpulan terakhir dari node yang cocok.
- Rule koreksi ditambahkan di cabang kosong terakhir pada traversal.
- Kondisi harus TRUE pada kasus baru dan FALSE pada cornerstone kesimpulan terakhir.
- Semua kasus yang telah disetujui diuji ulang sebelum rule disimpan. Perubahan hasil menyebabkan penolakan.
- Koreksi yang valid juga menyimpan kasus beserta keputusan pakar sebagai validasi.
- KB disimpan pada LocalStorage `fitcheck.rdr.v1`; reset mengembalikan R0. Data rusak dikembalikan ke KB awal dengan pemberitahuan.

## QA

```sh
npm test
npm run dev
# Di terminal lain:
npm run qa
```

QA browser memakai Playwright dengan Google Chrome yang terpasang. Dapat disesuaikan melalui `QA_URL` dan `QA_BROWSER`. Untuk Chromium Playwright, jalankan `npx playwright install chromium` dan sesuaikan launcher jika Chrome tidak tersedia.

- Pengujian engine: skenario PRD, semua operator, validasi cornerstone, regresi kasus, struktur tree, persistensi, dan pemulihan data.
- Pengujian browser: konsultasi, persetujuan, koreksi, ekspansi tree, langkah simulasi, reset, refresh, input tidak valid, dan tampilan responsif.
- Audit aksesibilitas otomatis WCAG 2.1 AA dengan axe pada halaman konsultasi, koreksi, dan RDR.
- Screenshot dan laporan QA tersedia di folder `qa/`.

Lihat `qa/QA-REPORT.md` untuk hasil dan tautan screenshot.

## Struktur

- `src/engine/rdr.js`: model data, traversal, akuisisi rule, integritas, dan LocalStorage loader.
- `src/components/CorrectionPanel.jsx`: koreksi dan perbandingan cornerstone.
- `src/components/RDRPage.jsx`: pohon interaktif, detail rule, simulasi, dan materi RDR.
- `src/components/OutfitArt.jsx`: ilustrasi SVG lokal tanpa request eksternal.
- `src/App.jsx`: konsultasi, state aplikasi, navigasi, dan reset.

Font DM Sans disimpan lokal dengan lisensi OFL di `public/fonts/`. LocalStorage terpisah untuk setiap browser, perangkat, dan origin; tidak disinkronkan antarperangkat.
