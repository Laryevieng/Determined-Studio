# PROJECT PLAN: Sistem SCM Internal Determined Studio

> Dokumen ini adalah **sumber kebenaran tunggal** untuk membangun dan menjalankan sistem pencatatan satu pintu Determined Studio. Ditulis agar dapat dikerjakan agent AI tanpa riwayat chat. Isinya sudah memuat keputusan, aturan bisnis, skema database yang **sudah dijalankan dan diuji**, daftar task, dan cara memeriksa hasil.

| Item | Isi |
|---|---|
| Edisi | 3.0 (agent-ready) |
| Tanggal | 4 November 2026 |
| Status | Siap dikerjakan. Tidak ada kode aplikasi yang dibuat pada edisi ini; basis data sudah diverifikasi (lihat Lampiran F) |
| Mitra | Determined Studio, konveksi: kaos sablon (Plastisol dan DTF), kemeja korsa, **PDH**, dan **PDL** |
| Pengguna sistem | Admin, karyawan produksi, pemilik. Pelanggan tidak memiliki akun |
| Tim | Kelompok 2, Prodi Sistem Informasi, Universitas Kuningan (Angga Wira Pirmansah, Hari Inaka Hermawan, Muhamad Ikhsan Syabani, Ripky Paturohman) |
| Stack | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Row Level Security, Storage), Zod, Vitest, Playwright |
| Dasar | Wawancara pemilik, admin, dan produksi (25 Oktober 2026), Lembar Kerja Kelompok 2 (Lokakarya PBL Tahap 1), Lembar Tugas Praktikum 4, prompt build v1 dan v2 |
| Tujuan | Satu catatan terpusat untuk pesanan, stok bahan baku, dan pengemasan, sehingga (1) pesanan tidak diterima saat bahan habis, (2) stok kain cocok dengan kain di rak, (3) ukuran yang dikemas sama dengan yang dipesan |
| Warna merek | `#A678B9` 20%, `#8CA9BC` 40%, `#8B7CC7` 40% (aturan di §7) |
| Filter UI & kode | `antislop` v3.2.32 (`miqdadbadjuber/anti-slop`) terpasang di `.agents/skills/` dengan pointer di `AGENTS.md`; clone sumber di `anti-slop/` (aturan di §7.13 dan D-29) |
| Verifikasi basis data | 13 berkas migrasi (0001 sampai 0013) dimuat di PostgreSQL 16; 119 assertion lulus; uji 8 penerimaan serentak lulus. Tidak diuji: pg_cron, Supabase Auth dan Storage nyata, JWT lewat PostgREST |

**Isi:** §0 Protokol Agent · §1 Status · §2 Ringkasan · §3 Stack · §4 Keputusan · §5 Peran · §6 Domain · §7 Design System · §8 Arsitektur · §9 Skema Database · §10 Keamanan · §11 Layar · §12 Pesan dan UX · §13 Pengujian · §14 Deployment · §15 Task · §16 Risiko · §17 Non-goal · §18 Pertanyaan · §19 Glosarium · Lampiran A sampai F.

---

## 0. PROTOKOL AGENT (BACA DULU, SETIAP SESI)

### 0.1 Cara memakai dokumen ini

1. Baca berurutan: `AGENTS.md` → §0 → §1 (STATUS) → 5 entri terakhir Lampiran D → Lampiran E (Ledger Prompt).
2. Kerjakan **hanya** task yang ditunjuk prompt. Baca bagian "Kerjakan" dan "Selesai jika" task itu di §15, plus bagian plan yang disebut prompt.
3. Setelah selesai: jalankan gate, centang task, perbarui §1, tulis entri Lampiran D, perbarui Lampiran E, lalu lapor.
4. Plan ini berada di `docs/PROJECT_PLAN.md`. Bila belum dipindahkan, berkasnya `PROJECT_PLAN.md` di root workspace.

### 0.2 Aturan yang tidak boleh dilanggar

1. **Plan menang.** Bila kode dan plan berbeda, ikuti plan, kecuali ada entri di §4 yang mengubahnya.
2. **Jangan mengarang data usaha.** Harga, kebutuhan kain per potong, ukuran, rekening bank, batas stok, dan nama bahan berasal dari pemilik. Pakai placeholder `TODO(pemilik)` dan catat di §18. Data contoh hanya boleh fiktif dan bernama berawalan `CONTOH`.
3. **Jangan menebak.** Bila plan ambigu, ambil default di §18, catat asumsi di Lampiran D, lanjutkan. Jangan memperluas ruang lingkup.
4. **Aturan bisnis kritis hidup di database** (R1 sampai R13, §6.14). Antarmuka hanya membantu pengguna dan tidak menjadi satu-satunya penjaga.
5. **Tabel append-only** (`stock_movements`, `audit_logs`, `order_revisions`, `packing_checks`, `order_status_history`): tidak boleh ada UPDATE atau DELETE. Koreksi berupa baris baru yang menunjuk baris asal.
6. **Tidak ada tulis langsung ke tabel bisnis dari klien** selain yang tercantum di §10.2. Semua perubahan lewat fungsi RPC (Lampiran B).
7. **Kunci service role** hanya untuk pembuatan pengguna (task P3-04) dan skrip uji atau bootstrap. Tidak pernah masuk bundel klien. Pemeriksaan: `grep -r "service_role\|SUPABASE_SECRET" .next` tidak menemukan apa pun.
8. **Secret** tidak boleh masuk repo, log, komentar, laporan, atau tangkapan layar. Jangan commit `.env*` selain `.env.example`.
9. **Dependensi** hanya whitelist §3.2. Menambah paket butuh entri keputusan di §4.
10. **Bahasa:** antarmuka dan pesan galat Bahasa Indonesia, lewat `lib/messages.ts`. Kode, nama tabel, dan kolom bahasa Inggris.
11. **Mobile-first.** Layar produksi harus dapat dipakai di lebar 360 px, target sentuh minimal 48 px.
12. **Warna** hanya dari token §7. Proporsi 20/40/40 dan kontras diuji di G5.
13. **Jangan melemahkan RLS, grant, atau uji** untuk menghilangkan galat. Perbaiki penyebabnya.
14. **Jangan mengklaim hasil** (penurunan kesalahan, penghematan waktu) tanpa pengukuran. Laporkan hanya hasil uji yang benar-benar dijalankan; yang belum dijalankan ditulis "belum diuji".
15. **Migrasi yang sudah dipush** ke DEV atau PRODUKSI tidak boleh diedit. Buat migrasi baru.
16. **Satu task selesai** hanya bila semua butir "Selesai jika" terpenuhi dan gate lulus.
17. **Filter antislop.** Pekerjaan UI, copy, aksesibilitas, tata letak mobile, dan komentar kode mengikuti skill lokal `antislop` v3.2.32 di `.agents/skills/` (dirujuk `AGENTS.md`, detail §7.13). Arah visual tetap dari §7; bila ada aturan yang berbenturan, §0.2 dan §7 menang.

### 0.3 Alur satu task

1. Baca task dan bagian plan terkait. 2. Periksa `git status`. 3. Kerjakan sesuai "Kerjakan", commit kecil. 4. Tulis atau perbarui uji. 5. Jalankan gate. 6. Periksa tampilan di 360 px dan 1366 px bila menyentuh UI. 7. Centang task.

### 0.4 Penutupan sesi

Setiap prompt diakhiri: gate, centang task di §15 (hanya bila lulus), perbarui §1, entri baru Lampiran D (template Lampiran C), baris Lampiran E berstatus `MENUNGGU`, commit. Bila kuota hampir habis: berhenti rapi, tulis entri `WIP` dengan satu kalimat "Langkah berikutnya".

### 0.5 Ukuran task

S: kurang dari 1 jam kerja agent, satu berkas utama. M: beberapa berkas, satu fitur. L: fitur lintas lapisan (database, aksi server, layar, uji).

### 0.6 Format LAPORAN

`Prompt NN percobaan ke-k | Status SELESAI/SEBAGIAN/GAGAL | tiap kriteria "Selesai jika": LULUS/GAGAL | hasil gate | file diubah | "Cek manual untuk pemilik" (3 sampai 5 langkah) | asumsi dan masalah`.

### 0.7 Gate

| Gate | Perintah | Kapan |
|---|---|---|
| G1 | `npm run lint && npm run typecheck && npm run test` | Setiap prompt |
| G2 | G1 + `npm run build` | Prompt yang menutup fase atau mengubah rute |
| G3 | `npm run db:reset && npm run db:test` (Supabase lokal) atau `npm run db:test:pg` (PostgreSQL 16 lokal dengan stub, Lampiran F) | Prompt yang menyentuh database |
| G4 | `npm run test:e2e` | Prompt yang menyentuh alur E2E |
| G5 | `npm run check:contrast && npm run check:color-share && npm run test:a11y` | Prompt yang menyentuh tampilan, dan gerbang akhir tiap fase UI |

### 0.8 Konvensi commit

`tipe(P?-??): ringkasan`, dengan tipe `feat`, `fix`, `test`, `docs`, `chore`, `refactor`, `db`. Satu task boleh banyak commit. Jangan commit `.env*`.

### 0.9 Ledger dan `/1allclear`

Pemilik menyetujui hasil sebuah prompt dengan mengawali prompt berikutnya `/1allclear`. Agent lalu menandai prompt sebelumnya `DISETUJUI` di Lampiran E. Tanpa awalan itu, bila prompt sebelumnya belum `DISETUJUI`, agent berhenti dan bertanya. Hanya pemilik yang menyetujui. Status: `BELUM`, `MENUNGGU`, `DISETUJUI`, `GAGAL`, `WIP`.

---

## 1. STATUS SAAT INI (diperbarui agent setiap sesi)

| Item | Nilai |
|---|---|
| Fase aktif | Fase 0 (selesai, menunggu Gerbang Fase 0 dan `/1allclear` untuk masuk Fase 1) |
| Prompt aktif | 03 / 53 (selesai, menunggu `/1allclear`) |
| Task berikutnya | P1-01, P1-02 (Prompt 04, Fase 1: Design System) |
| Terakhir diperbarui | 26 November 2026 (Prompt 03: P0-04, P0-05, P0-06 selesai) |
| Blocker | Tidak ada |
| Langkah pemilik yang menunggu | Verifikasi Gerbang Fase 0 (`/api/health`, 404, uji format) sebelum Prompt 04; LANGKAH PEMILIK 1 (project Supabase DEV), sebelum Prompt 08 |

Ringkasan: Seluruh task Fase 0 (`P0-01` sampai `P0-06`) selesai dan dicentang. `.env.example`, validasi `lib/env.ts` (`server-only`), `/api/health`, `not-found.tsx`, `error.tsx`, `lang="id"`, `robots: noindex`, `lib/format.ts`, `lib/messages.ts`, dan `lib/errors.ts` (49 kode Lampiran A) lulus G1 (13/13 tes) dan G2 (`npm run build`). Siap masuk Fase 1 setelah `/1allclear`.

---

## 2. RINGKASAN PROYEK DAN HASIL WAWANCARA

### 2.1 Apa yang dibangun

Aplikasi web internal yang dipakai admin, produksi, dan pemilik Determined Studio sebagai **catatan satu pintu**: pesanan diinput sekali, stok bahan dicatat oleh produksi, pesanan tidak dapat diterima bila bahan tidak cukup, dan pengemasan baru selesai bila yang dikemas sama dengan yang dipesan. Aplikasi ini sistem sungguhan yang akan dipakai harian, jadi keamanan, ketepatan stok, dan keterbacaan di ponsel menjadi syarat utama.

### 2.2 Fakta usaha (sumber: wawancara 25 Oktober 2026)

| Topik | Fakta |
|---|---|
| Produk | Kaos sablon (Plastisol dan DTF) untuk komunitas dan lingkungan kampus; kemeja korsa atau PDH berbahan American Drill. **Edisi ini menambah PDH dan PDL** sebagai lini produk (detail di §6 dan §18) |
| Volume | Rata-rata 5 sampai 10 pesanan per bulan; 20 sampai 75 potong per pesanan; nilai transaksi Rp2.500.000 sampai Rp5.000.000 per pesanan (rentang wawancara, bukan omzet) |
| Siklus pesanan | Chat WhatsApp → konsultasi → kesepakatan harga → invoice → uang muka (DP) 50% → SPK → pemotongan kain → sablon atau bordir → penjahitan → pemeriksaan kualitas dan pengemasan → pelunasan → pengiriman |
| Kebijakan | Pesanan dihentikan sampai DP diterima. DP hangus bila pelanggan membatalkan setelah bahan baku dibeli. Bila supplier kehabisan bahan, admin menawarkan alternatif warna atau bahan atau penyesuaian tenggat; **keputusan akhir ada pada pemilik** |
| Pembayaran | Transfer BCA atau Mandiri. Admin memvalidasi lewat mutasi mobile banking. Barang ditahan bila bukti terindikasi palsu atau dana belum settled |
| Stok | Buku tulis, direkap admin ke Excel tiap minggu. Selisih stok **kain** terjadi 3 sampai 4 kali per bulan, salah satunya karena sisa potongan dipakai tanpa dicatat. Stok tinta relatif stabil karena ada rutinitas pemeriksaan dan pengisian ulang |
| Pencatatan | Satu pesanan ditulis di chat WhatsApp, buku besar, dan kertas SPK; penyalinan manual sekitar 1 sampai 2 jam per hari. Catatan revisi dapat tidak berpindah ke SPK; SPK kertas dapat rusak atau kotor |
| Kesalahan | Kesalahan produksi (ukuran atau desain) sekitar 1 sampai 2 kali per bulan. Keluhan pelanggan 1 sampai 2 kasus per bulan, didominasi kesalahan ukuran akibat barang tertukar saat pengemasan; retur selesai sekitar 2 sampai 3 hari, biaya produksi ulang dan pengiriman ditanggung penuh, estimasi Rp150.000 sampai Rp300.000 |
| Keterlambatan | Penjahitan terkendala kapasitas dan kehadiran penjahit; pengeringan sablon manual dipengaruhi cuaca; revisi ukuran setelah pemotongan menyebabkan kerugian material |
| Pengiriman | Kargo (luar kota), Lalamove atau GoCar (dalam kota), antar langsung atau diambil pelanggan (jarak dekat) |
| Perangkat | Laptop admin Core i3, PC desainer, smartphone Android dan iPhone. Wi-Fi 50 Mbps yang stabilitasnya turun saat cuaca buruk. File desain mentah 50 sampai 300 MB membuat laptop admin melambat saat dipratinjau |
| Pelaporan | Arus kas bulanan dan rekap volume produksi (potong), dari rekap Excel mingguan |

Angka di atas berasal dari keterangan narasumber dan belum diukur. Sistem ini menjadi alat untuk mengukurnya.

### 2.3 Tiga masalah yang diselesaikan

| Masalah | Akar | Aturan penjaga | Uji |
|---|---|---|---|
| Admin menerima pesanan saat stok habis | Stok dicek dengan ingatan atau buku, tidak ada reservasi | R2, R3 | U1, U2, U3 |
| Stok kain tidak cocok dengan kain di rak | Pemakaian dan sisa potongan tidak dicatat saat memotong; rekap hanya mingguan | R4, R5, R6 | U4, U5, U12 |
| Ukuran yang dikemas berbeda dari yang dipesan | Tidak ada pencocokan sebelum paket ditutup | R9 | U7, U8, U13 |

Masalah turunan: pencatatan berulang tiga media (R1, R7) dan jejak pembayaran (R8, R10).

### 2.4 Di dalam dan di luar lingkup

**MVP:** login dan tiga peran; master data (kategori, produk, kebutuhan kain per ukuran, bahan, pelanggan); pesanan satu pintu dengan item per ukuran dan penerima personal; revisi bernomor versi; cek stok dengan blokir, reservasi, dan override pemilik; pencatatan stok oleh produksi; SPK digital dan antrean produksi; verifikasi pengemasan per baris pesanan; DP dan pelunasan dengan jejak; pengiriman; opname mingguan; dasbor, laporan, ekspor CSV; audit log.

**Fase 2 (struktur data disiapkan, belum dibuat):** antrean offline penuh, label QR per paket, laporan arus kas otomatis, thumbnail otomatis dari file mentah, notifikasi push.

**Di luar lingkup:** akun atau portal pelanggan, integrasi WhatsApp, marketplace, payment gateway, integrasi bank, akuntansi lengkap, stok barang jadi, penjadwalan penjahit.

---

## 3. STACK DAN LINGKUNGAN

### 3.1 Tabel versi (diisi agent pada P0-01)

Versi terbaru di npm per 4 November 2026 hanya rujukan. Versi yang dipakai adalah hasil `create-next-app@16` dan lockfile. Jangan menaikkan major tanpa entri §4.

| Item | Asumsi plan | Rujukan npm (4 Nov 2026) | Nilai terverifikasi |
|---|---|---|---|
| Node.js | 22 LTS atau lebih baru | v22.22.2 (sandbox) | `v24.21.0` |
| npm | 10 atau lebih baru | 10.9.7 | `12.2.1` |
| next | 16.x, App Router, `proxy.ts`, tanpa `src/` | 16.4.5 | `16.4.3` (App Router di `app/`, tanpa `src/`, belum ada `proxy.ts`; `next.config.ts` mengaktifkan `cacheComponents: true`, `partialPrefetching: true`) |
| react, react-dom | 19.x | 19.3.1 | `19.3.0`, `19.3.0` |
| typescript | versi yang dibawa create-next-app; `strict: true` | 7.0.2 | `^5` terpasang `5.9.3` (`strict: true` aktif di `tsconfig.json`) |
| tailwindcss, @tailwindcss/postcss | 4.x | 4.3.4 | `tailwindcss` `^4` (`4.3.3`); `@tailwindcss/postcss` belum terpasang, diganti `@tailwindcss/turbopack` `^4` (`4.3.3`) di `package.json` & `next.config.ts` |
| @supabase/supabase-js | 2.x | 2.118.0 | Belum terpasang |
| @supabase/ssr | 0.x | 0.12.7 | Belum terpasang |
| zod | 4.x | 4.6.7 | `4.6.7` (terpasang di `package.json` bersama `server-only@0.0.1` pada P0-04) |
| react-hook-form, @hookform/resolvers | 7.x | 7.91.0, 7.0.2 | Belum terpasang |
| vitest | versi stabil terbaru | 5.1.0 | `5.1.2` (terpasang di P0-03 bersama `prettier@3.10.1` dan `@types/node@22.20.7`) |
| @playwright/test, @axe-core/playwright | stabil | 1.64.1, 4.14.0 | Belum terpasang |
| pngjs | 7.x (uji proporsi warna) | 7.0.0 | Belum terpasang |
| supabase (CLI) | stabil | 3.0.0 | Tidak terpasang (`supabase` tidak ditemukan di PATH) |
| Docker Desktop | opsional (Supabase lokal) | n/a | Tidak terpasang (`docker` tidak di PATH; `C:\Program Files\Docker` kosong tanpa biner) |
| PostgreSQL 16 lokal | alternatif tanpa Docker (Lampiran F) | n/a | Tidak terpasang (`psql` tidak di PATH; `C:\Program Files\PostgreSQL` tidak ada) |
| Git, sistem operasi, shell | catat apa adanya | n/a | `git version 2.56.1.windows.1` (`.git` diinisialisasi di root proyek pada P0-02; `anti-slop/` diabaikan di `.gitignore`); Microsoft Windows 11 Home Single Language (`Windows NT 10.0.26200.0`); Windows PowerShell `5.1.26100.9818` |

Catatan kompatibilitas: bila typescript, eslint, atau vitest versi terbaru tidak cocok dengan `eslint-config-next` atau `create-next-app`, pakai versi yang dipasang create-next-app dan catat di Lampiran D. Itu bukan pelanggaran plan.

### 3.2 Dependensi yang diizinkan (whitelist)

`next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `server-only`. Dev: `eslint`, `eslint-config-next`, `prettier`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`, `@axe-core/playwright`, `pngjs`, `supabase`, `@types/*`. Menambah paket lain (mis. pustaka tabel, kalender, PDF) butuh entri keputusan.

### 3.3 Struktur folder (tanpa `src/`)

```
determined-scm/
  app/
    (auth)/masuk/  lupa-sandi/  atur-sandi/
    (app)/layout.tsx                      # shell per peran, penjaga sesi
    (app)/page.tsx                        # alihkan menurut peran
    (app)/pesanan/  baru/  [id]/  [id]/ubah/  [id]/spk/  [id]/invoice/  [id]/rincian/
    (app)/produksi/  [id]/
    (app)/stok/  catat/  opname/
    (app)/pengemasan/[id]/
    (app)/persetujuan/
    (app)/dasbor/
    (app)/laporan/
    (app)/master/  kategori/ produk/ bahan/ pelanggan/ pengguna/ pengaturan/ kesiapan/
    (app)/audit/
    api/health/route.ts   api/ekspor/[nama]/route.ts
    globals.css           not-found.tsx   error.tsx
  components/ui/          # Button, Input, Select, Field, Badge, Card, Dialog, Toast, Skeleton, ...
  components/domain/      # StatusBadge, SizeMatrix, StockPanel, ItemEditor, PackingMatrix, ...
  components/print/       # PrintSheet, SpkSheet, InvoiceSheet, DetailSheet
  lib/
    env.ts  format.ts  messages.ts  errors.ts  rpc.ts
    supabase/ server.ts browser.ts admin.ts(server-only) proxy.ts
    auth/ session.ts roles.ts
    validation/ order.ts material.ts stock.ts packing.ts ...
    domain/ items.ts size-diff.ts status.ts
    hooks/ use-draft.ts
  proxy.ts                # segarkan sesi, arahkan tamu ke /masuk
  supabase/ config.toml  migrations/  tests/  seed.sql
  scripts/ check-contrast.mjs  check-color-share.mjs  bootstrap-owner.sql  backup-export.mjs
  tests/ unit/  e2e/  sql/
  docs/ PROJECT_PLAN.md  RUNBOOK.md  PANDUAN_ADMIN.md  PANDUAN_PRODUKSI.md
  .agents/skills/         # skill antislop v3.2.32 (core, ui, copywriting, human, layoutmobile, code)
  anti-slop/              # clone repositori miqdadbadjuber/anti-slop (dikecualikan di ESLint & tsconfig)
  AGENTS.md               # memuat ringkasan proyek dan blok pointer antislop (<!-- antislop:start/end -->)
```

### 3.4 Skrip npm

`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `test:a11y`, `check:contrast`, `check:color-share`, `db:reset`, `db:test`, `db:test:pg`, `db:types`, `db:push`, `backup`.

### 3.5 Variabel lingkungan

| Variabel | Lingkup | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | klien dan server | URL aplikasi |
| `NEXT_PUBLIC_SUPABASE_URL` | klien dan server | URL proyek |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | klien dan server | kunci publik (anon) |
| `SUPABASE_SECRET_KEY` | **server saja** | service role; hanya P3-04 dan skrip |
| `SESSION_IDLE_MINUTES` | server | default 480 |
| `LOGIN_MAX_ATTEMPTS` | server | default 8 per 15 menit |

`lib/env.ts` memvalidasi dengan Zod dan menolak mengimpor variabel server di kode klien.

---

## 4. LOG KEPUTUSAN

Format: kode, keputusan, alasan. Perubahan keputusan menambah baris baru, bukan menimpa.

| Kode | Keputusan | Alasan |
|---|---|---|
| D-01 | Aplikasi internal. Tidak ada akun pelanggan dan tidak ada halaman publik selain `/masuk` | Data harga, kontak, dan stok sensitif; kebutuhan nyata hanya tiga peran |
| D-02 | Basis data Supabase (Postgres). Spreadsheet hanya sebagai ekspor laporan | Transaksi, constraint, dan RLS dibutuhkan R2, R3, R11, R12; spreadsheet tidak menjamin pada akses bersamaan |
| D-03 | Aturan bisnis kritis dijalankan sebagai fungsi database (`SECURITY DEFINER`, satu transaksi) | Aturan tetap berlaku walau UI salah; konkurensi ditangani database |
| D-04 | Klien tidak menulis tabel bisnis langsung; semua lewat RPC. Pengecualian di §10.2 | Satu jalur penulisan yang dapat diaudit |
| D-05 | Uang `integer` rupiah penuh; kuantitas stok `numeric(14,3)` | Tidak ada pembulatan uang; kain dalam meter berdesimal |
| D-06 | Stok fisik selalu turunan dari `stock_movements` (append-only), dua kolam: `main` dan `remnant` | Mencegah angka stok diubah diam-diam; sisa potongan terlacak |
| D-07 | Ketersediaan = stok fisik kolam `main` dikurangi reservasi aktif. Dapat negatif hanya lewat override pemilik (backorder) | Pesanan berikutnya otomatis diblokir selama bahan belum masuk |
| D-08 | `material_hold` dan `on_hold` adalah flag pada pesanan, bukan status | Status tetap linear; hold dapat datang dan pergi tanpa merusak alur |
| D-09 | Hanya bahan `track_per_order = true` yang dicadangkan dan dikeluarkan per pesanan (kain, aksesori). Tinta, film, benang dikendalikan batas minimum dan opname | Sesuai wawancara: tinta stabil, selisih ada di kain |
| D-10 | Kebutuhan kain per ukuran (`product_size_specs`) wajib. Tanpa itu pesanan tidak dapat diterima (`CONSUMPTION_RULE_MISSING`) | Mencegah kebutuhan terhitung terlalu kecil secara diam-diam |
| D-11 | PDH dan PDL dimodelkan sebagai kategori produk dengan personalisasi opsional per baris (`recipient_label`) dan ukuran `KHUSUS` dengan `size_note`. Verifikasi pengemasan per **baris pesanan**, bukan hanya per ukuran | Seragam dinas sering bernama per orang; salah penerima setara salah ukuran |
| D-12 | Fungsi bisnis mengembalikan `jsonb {ok, code, ...}` untuk hasil bisnis negatif; `exception` hanya untuk pelanggaran izin atau transisi | Hasil negatif yang perlu dicatat (mis. ketidakcocokan pengemasan) tidak ikut dibatalkan transaksi |
| D-13 | Service role hanya untuk membuat pengguna dan skrip uji | Meminimalkan permukaan serangan |
| D-14 | Next.js 16, App Router, `proxy.ts`, tanpa `src/` | Selaras dengan stack terbaru |
| D-15 | Validasi Zod yang sama di klien dan server | Satu aturan, dua tempat |
| D-16 | Palet 20/40/40: `#A678B9` 20%, `#8CA9BC` 40%, `#8B7CC7` 40%. Teks di atas fill warna dasar memakai tinta `#1F1B2E`; teks di atas putih memakai turunan gelap 700 | Warna dasar tidak lulus 4,5:1 dengan teks putih (3,5; 2,47; 3,62). Diuji di G5 |
| D-17 | File desain mentah tidak diunggah. Sistem menyimpan tautan dan thumbnail maksimal 2 MB di bucket privat | Batas penyimpanan dan laptop admin Core i3 |
| D-18 | Formulir pesanan menyimpan draf lokal (`localStorage`) dan memulihkannya. Antrean offline penuh masuk Fase 2 | Wi-Fi tidak stabil, biaya rendah |
| D-19 | Reservasi kedaluwarsa dilepas oleh `pg_cron` tiap 30 menit | Pesanan tanpa DP tidak mengunci bahan selamanya |
| D-20 | Zona waktu Asia/Jakarta untuk nomor pesanan dan laporan; waktu disimpan UTC | Nomor `DS-YYMM-NNNN` mengikuti bulan lokal |
| D-21 | Satu pengguna boleh punya beberapa peran | Admin kadang merangkap packing |
| D-22 | Cadangan: paket Pro (harian bawaan), atau paket gratis dengan ekspor mingguan di luar Supabase dan aktivitas harian | Paket gratis menjeda proyek tidak aktif dan tidak punya cadangan harian |
| D-23 | Komponen UI sendiri (Tailwind, class-variance-authority, lucide-react), tanpa pustaka UI berat | Ukuran bundel kecil, kontrol penuh atas kontras dan target sentuh |
| D-24 | Cetak memakai CSS print (SPK, invoice, lembar rincian), tanpa pustaka PDF | Admin Core i3, tanpa dependensi tambahan |
| D-25 | Ekspor CSV memakai UTF-8 BOM dan pemisah titik koma | Terbaca benar di Excel berlokal Indonesia |
| D-26 | Pembatalan otomatis pesanan tanpa DP saat reservasi kedaluwarsa; pemilik dapat membuat ulang lewat Salin Pesanan | Sederhana; tidak ada status tambahan |
| D-27 | `DITAHAN` dari v1 menjadi flag `on_hold`; `DITERIMA_MENUNGGU_BAHAN` dari v1 menjadi `material_hold` | Lihat D-08 |
| D-28 | Revisi setelah pemotongan hanya mengubah ukuran, penerima, dan catatan ukuran pada baris yang ada; jumlah tetap | Mencegah kebutuhan bahan bertambah tanpa pencatatan; menjaga keterkaitan paket |
| D-29 | Memasang filter `antislop` v3.2.32 (`miqdadbadjuber/anti-slop`) secara lokal di `.agents/skills/` dengan pointer `AGENTS.md` serta clone sumber di `anti-slop/` (dikecualikan dari ESLint dan TypeScript) | Mencegah pola AI slop pada UI, copy, aksesibilitas, tata letak mobile, dan komentar kode tanpa mengubah arah desain §7; bila terjadi benturan aturan, plan tetap menang |
| D-30 | Mempertahankan `@tailwindcss/turbopack` (`^4`, `4.3.3`) bawaan templat `create-next-app@16.4.3` sebagai loader Tailwind v4 di `next.config.ts` dan memperbarui `@types/node` ke `^22` (`22.20.7`) | Menjaga kompatibilitas bawaan Next.js 16.4.3 Turbopack tanpa membuang konfigurasi awal (§3.1) serta memenuhi peer dependency `vitest@5.1.2` (`@types/node ^22 \|\| >=24`) |

---

## 5. PERAN, IZIN, DAN ALUR PENGGUNA

### 5.1 Tiga peran

| Kemampuan | Admin | Produksi | Pemilik |
|---|---|---|---|
| Membuat dan mengubah pesanan sebelum pemotongan | Ya | Tidak | Ya |
| Melihat harga, DP, kontak, dan ringkasan chat | Ya | **Tidak** | Ya |
| Menandai DP dan pelunasan, memvalidasi mutasi | Ya | Tidak | Ya |
| Melihat stok dan hasil cek stok | Ya (baca) | Ya | Ya |
| Mencatat stok masuk, sisa terpakai | Tidak | Ya | Ya |
| Mulai pemotongan, pindah tahap produksi | Tidak | Ya | Ya |
| Menyimpan paket dan menyelesaikan pengemasan | Tidak | Ya | Ya |
| Mengirim dan menyelesaikan pesanan | Ya | Tidak | Ya |
| Mengajukan override, revisi terlambat, pengecualian pengemasan | Ya (kecuali pengecualian: produksi juga) | Pengecualian pengemasan | Ya |
| Menyetujui override, revisi terlambat, selisih opname, pengecualian | Tidak | Tidak | **Ya** |
| Penyesuaian stok langsung, hapus DP hangus, rollback status | Tidak | Tidak | Ya |
| Mengelola pengguna, peran, master data, pengaturan | Tidak | Tidak | Ya |
| Melihat audit log, laporan | Tidak | Tidak | Ya |

Peran jamak: pemilik dapat memberi `produksi` kepada admin yang merangkap packing. Semua aksi tercatat atas nama pelaku.

### 5.2 Alur utama

**A. Pesanan baru.** Admin mengisi formulir (satu pintu). Panel cek stok menampilkan kebutuhan dan ketersediaan langsung. Bila cukup: **Terima** (invoice terbit, bahan direservasi). Bila kurang: tombol Terima nonaktif dan layar menampilkan kekurangan.

**B. Stok kurang.** Pilihan admin: ganti bahan atau warna dari daftar pengganti, ubah tenggat, atau **ajukan override**. Pemilik menyetujui dengan alasan dan perkiraan tanggal bahan tiba; pesanan diterima dengan `material_hold` dan tidak dapat mulai pemotongan sebelum bahan masuk.

**C. DP dan SPK.** Admin mencatat bukti DP, memvalidasi terhadap mutasi, menandai *settled*. DP penuh membuka status `dp_received`; admin menerbitkan SPK.

**D. Produksi.** Produksi melihat antrean menurut tenggat. **Mulai Pemotongan** mewajibkan pemakaian aktual setiap bahan yang dicadangkan dan sisa potongan. Lalu tahap sablon atau bordir, penjahitan, QC dan pengemasan. Alasan keterlambatan (cuaca, kapasitas penjahit, menunggu bahan, revisi) dicatat saat tahap selesai.

**E. Pengemasan.** Produksi mengisi jumlah aktual per baris pesanan untuk tiap paket. Selesai hanya bila semua baris tepat. Selisih ditampilkan, mis. "L kurang 2, XL lebih 2", atau untuk PDH personal: "Budi (M) belum terkemas".

**F. Pelunasan dan pengiriman.** Pelunasan settled membuka `ready_to_ship`; admin mengirim (kargo, Lalamove, GoCar, antar, ambil) lalu menyelesaikan.

**G. Pembatalan.** Sebelum pemotongan oleh admin atau pemilik; sesudahnya hanya pemilik. DP hangus hanya oleh pemilik dan hanya bila bahan sudah dibeli dan DP sudah settled.

---

## 6. DOMAIN DAN ATURAN BISNIS

### 6.1 Kategori produk

| Kategori | Ukuran awal | Personalisasi | Catatan |
|---|---|---|---|
| Kaos Sablon | S, M, L, XL, XXL, XXXL | tidak | Plastisol atau DTF; pesanan massal 20 sampai 75 potong |
| Kemeja Korsa | S sampai XXXL | tidak | American Drill |
| PDH (Pakaian Dinas Harian) | S sampai XXXL + `KHUSUS` | ya | nama atau jabatan per potong, bordir, emblem |
| PDL (Pakaian Dinas Lapangan) | S sampai XXXL + `KHUSUS` | ya | detail bahan dan atribut menunggu pemilik (Q-01 sampai Q-04) |

Daftar ukuran dan aturan personalisasi di atas adalah **nilai awal sementara** (`TODO(pemilik)`) dan dapat diubah pemilik lewat Master Data. Produk adalah model yang dipesan (mis. "PDH Lengan Panjang American Drill"), milik sebuah kategori.

### 6.2 Ukuran dan `KHUSUS`

Ukuran baku mengikuti `size_options` kategori. Ukuran `KHUSUS` (ukur badan) wajib memiliki `size_note` (mis. lingkar dada dan panjang lengan) dan wajib punya baris `product_size_specs` dengan `size = 'KHUSUS'` agar kebutuhan kain terhitung.

### 6.3 Baris pesanan dan personalisasi

Satu **baris pesanan** (`order_items`) = produk + ukuran + jumlah + kain. Kaos massal memakai jumlah besar per baris (mis. L × 12). PDH atau PDL personal memakai satu baris per penerima (jumlah 1, `recipient_label` terisi). Verifikasi pengemasan membandingkan jumlah terkemas per **baris**, sehingga baju tertukar antarpenerima terdeteksi walau ukurannya sama. Kolom `spec` (jsonb) memuat dekorasi: `{"decorations":[{"technique":"bordir","position":"dada_kanan","text":"..."}]}` dengan teknik `plastisol`, `dtf`, `bordir`, `emblem`, `patch`.

### 6.4 Bahan dan pelacakan

`materials.kind`: `fabric`, `ink`, `dtf_film`, `transfer_paper`, `thread`, `accessory`, `other`. `track_per_order = true` (kain, aksesori seperti kancing dan emblem): dicadangkan saat pesanan diterima, dikeluarkan saat pemotongan. `false` (tinta, film, benang): hanya batas minimum dan opname. `blocks_acceptance = true` membuat kekurangan memblokir penerimaan.

### 6.5 Rumus kebutuhan

- Kain: `jumlah × fabric_per_unit(produk, ukuran) × (1 + waste_percent/100)`, dijumlah per bahan kain yang dipilih pada baris.
- Bahan lain yang dilacak: `jumlah × qty_per_unit(produk, bahan)` (mis. 7 kancing per PDH).
- `waste_percent` hanya berlaku untuk kain (default 5, `TODO(pemilik)`).
- Tanpa baris spesifikasi kain untuk (produk, ukuran): hasil `CONSUMPTION_RULE_MISSING`.

### 6.6 Stok

Pergerakan: `purchase_in` (+, kolam main), `cutting_out` (−, main, terkait pesanan), `remnant_in` (+, remnant), `remnant_used` (−, remnant, terkait pesanan), `adjustment` (bertanda, wajib alasan). Stok fisik = jumlah pergerakan per bahan per kolam. Cek stok hanya memakai kolam `main`.

### 6.7 Reservasi

Dibuat saat **Terima**; kedaluwarsa `reservation_expiry_days` (default 3) sampai DP settled; setelah DP penuh tidak lagi kedaluwarsa; menjadi `consumed` saat Mulai Pemotongan; menjadi `released` saat batal atau kedaluwarsa. Dua penerimaan bersamaan pada stok terakhir menghasilkan tepat satu yang berhasil (baris bahan dikunci berurutan menurut id).

### 6.8 Status pesanan

`draft` → `accepted` → `dp_received` → `spk_issued` → `cutting` → `decorating` (boleh dilewati) → `sewing` → `qc_packing` → `awaiting_final_payment` → `ready_to_ship` → `shipped` → `completed`; cabang `cancelled`. Jika pelunasan sudah settled sebelum pengemasan selesai, pengemasan langsung menuju `ready_to_ship`. Mundur hanya oleh pemilik (tabel `status_transitions`, `is_rollback`).

### 6.9 Pembayaran

`payments.status`: `proof_received` → `settled` atau `rejected`. DP penuh = jumlah DP settled ≥ `dp_amount` (default 50% dari total). Siap kirim = total settled ≥ `agreed_total`. Pembayaran sebagian diperbolehkan. Nominal rekening BCA dan Mandiri untuk invoice disimpan di `studio_settings.bank_accounts` (`TODO(pemilik)`).

### 6.10 Pengemasan

`save_package` menyimpan isi paket. `verify_packing` dan `complete_packing` membandingkan terkemas dengan dipesan per baris. Selisih mengembalikan `PACKING_MISMATCH` beserta baris bermasalah dan mencatat satu baris `packing_checks` dengan hasil `mismatch` (transaksi tidak dibatalkan). Pengecualian hanya lewat persetujuan pemilik. Opsi pemeriksa kedua (`require_second_checker`): pemeriksa tidak boleh pengemas paket.

### 6.11 Revisi

Sebelum pemotongan: `revise_order` mengganti item, menaikkan versi, memeriksa ulang stok. Konflik versi ditolak. Sesudah pemotongan: `request_late_revision` dengan estimasi kerugian, disetujui pemilik, hanya ubah ukuran, penerima, catatan ukuran.

### 6.12 Opname mingguan

`submit_count`: selisih ≤ `count_tolerance_pct` dari stok sistem (default 2%) langsung diterapkan sebagai penyesuaian; selisih lebih besar menunggu persetujuan pemilik. Alasan wajib bila ada selisih.

### 6.13 Pelaporan

Pesanan aktif menurut tenggat; stok menipis; selisih opname per minggu; kesalahan pengemasan per bulan; durasi tahap dan alasan keterlambatan; volume potong per bulan; penerimaan pembayaran per bulan. Ekspor CSV. Angka baseline wawancara dipakai sebagai pembanding setelah sistem dipakai, bukan sebagai target.

### 6.14 Aturan bisnis R1 sampai R13

| Kode | Aturan | Penegak (database) | Uji |
|---|---|---|---|
| R1 | Satu pintu: pesanan dibuat hanya lewat formulir; SPK, antrean, dan lembar rincian dihasilkan dari data yang sama | `create_draft_order`, `v_orders_production` | U6 |
| R2 | Pesanan tidak diterima bila bahan kurang; override hanya oleh pemilik | `accept_order`, `request_override`, `decide_approval` | U1, U2 |
| R3 | Reservasi saat diterima; dilepas saat batal atau kedaluwarsa; dua penerimaan bersamaan aman | `private.accept_core`, `release_expired_reservations` | U3, U16 |
| R4 | Mulai Pemotongan wajib pemakaian aktual dan sisa; pergerakan tidak berubah | `start_cutting`, `record_movement`, grant | U4 |
| R5 | Sisa potongan di kolam terpisah; pemakaian tercatat | `remnant_in`, `remnant_used` | U5 |
| R6 | Opname mingguan dengan persetujuan selisih besar | `submit_count`, `decide_approval` | U12 |
| R7 | Revisi bernomor versi; revisi terlambat butuh persetujuan | `revise_order`, `request_late_revision` | U6 |
| R8 | DP wajib sebelum produksi; jejak waktu dan pelaku; dasar DP hangus | `record_payment`, `settle_payment`, `cancel_order` | U9 |
| R9 | Pengemasan cocok per baris pesanan | `save_package`, `complete_packing` | U7, U8, U13 |
| R10 | Siap kirim hanya setelah pelunasan settled | `settle_payment`, `ship_order` | U9 |
| R11 | Audit dan tabel append-only | `log_audit`, grant | U11 |
| R12 | Produksi tanpa harga dan kontak | RLS, `v_orders_production` | U10 |
| R13 | Hold dan override berjejak; pemilik terakhir dilindungi | `set_hold`, `guard_last_owner` | U17, U18 |

---

## 7. DESIGN SYSTEM

### 7.1 Prinsip

Alat kerja harian di lantai produksi dan meja admin. Utamakan keterbacaan, tombol besar, satu tugas utama per layar, dan angka yang jelas. Tidak ada dekorasi yang menghambat. Mobile-first: produksi memakai smartphone (Android dan iPhone).

### 7.2 Palet dan proporsi 20/40/40

| Keluarga | Warna dasar | Porsi | Peran |
|---|---|---|---|
| **Violet** | `#8B7CC7` | **40%** | Merek utama: top bar, tombol utama (turunan 600), tautan dan fokus (turunan 700), item navigasi aktif, deret grafik 1 |
| **Steel** | `#8CA9BC` | **40%** | Permukaan tenang: sidebar dan bottom-nav, header tabel dan panel, pita bagian, garis aksen kartu, deret grafik 2 |
| **Orchid** | `#A678B9` | **20%** | Aksen: lencana penting, CTA kunci (Terima Pesanan, Selesaikan Pengemasan), penanda perhatian, deret grafik 3 |
| Netral | `#FFFFFF`, `#F7F5FB`, `#1F1B2E`, `#5B5870` | n/a | Kartu, latar halaman, teks, teks sekunder |
| Status | hijau, kuning, merah (§7.3) | n/a | Hanya untuk keadaan: berhasil, perhatian, galat |

**Arti porsi:** dari seluruh piksel *berwarna* pada layar utama (saturasi sedang sampai kuat; netral, tinta, dan warna status tidak dihitung), sebaran keluarga mendekati 40% violet, 40% steel, 20% orchid, toleransi ±10 poin persentase rata-rata lima layar. Pengukurnya skrip `scripts/check-color-share.mjs` (§7.12).

### 7.3 Token (disalin ke `app/globals.css`)

```css
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  /* violet: 40% (merek utama) */
  --color-violet-50: #F7F6FB;
  --color-violet-100: #F1EFF8;
  --color-violet-200: #E2DEF1;
  --color-violet-300: #C5BEE3;
  --color-violet-400: #A89DD5;
  --color-violet-500: #8B7CC7;
  --color-violet-600: #685D95;
  --color-violet-700: #5A5181;
  --color-violet-800: #4C446D;
  --color-violet-900: #3F385A;
  /* steel: 40% (permukaan tenang) */
  --color-steel-50: #F7F9FA;
  --color-steel-100: #F1F5F7;
  --color-steel-200: #E2EAEE;
  --color-steel-300: #C6D4DE;
  --color-steel-400: #A9BECD;
  --color-steel-500: #8CA9BC;
  --color-steel-600: #697F8D;
  --color-steel-700: #5B6E7A;
  --color-steel-800: #4D5D67;
  --color-steel-900: #3F4C55;
  /* orchid: 20% (aksen) */
  --color-orchid-50: #F9F6FA;
  --color-orchid-100: #F4EFF7;
  --color-orchid-200: #E9DDEE;
  --color-orchid-300: #D2BCDC;
  --color-orchid-400: #BC9ACA;
  --color-orchid-500: #A678B9;
  --color-orchid-600: #7C5A8B;
  --color-orchid-700: #6C4E78;
  --color-orchid-800: #5B4266;
  --color-orchid-900: #4B3653;
  /* netral */
  --color-canvas: #F7F5FB;
  --color-surface: #FFFFFF;
  --color-ink: #1F1B2E;
  --color-muted: #5B5870;
  --color-line: #E3E0EE;
  --color-line-strong: #7B7791;
  /* status */
  --color-success-bg: #E6F4EC;
  --color-success-fg: #14633F;
  --color-warning-bg: #FFF3D6;
  --color-warning-fg: #7A4B00;
  --color-danger-bg: #FDE8E6;
  --color-danger-fg: #A42018;
  --radius-control: 10px;
  --radius-card: 14px;
  --radius-dialog: 18px;
}

:focus-visible { outline: 2px solid var(--color-violet-700); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

### 7.4 Pemakaian warna per elemen

| Elemen | Latar | Teks atau garis |
|---|---|---|
| Top bar | `violet-500` | `ink` |
| Sidebar desktop dan bottom-nav mobile | `steel-500` | `ink`; item aktif: latar `violet-100`, teks `violet-700`, penanda kiri `violet-600` |
| Latar halaman | `canvas` | `ink` |
| Kartu dan panel | `surface` (putih), garis `line`, pita judul `steel-100` | judul `ink` |
| Tombol utama | `violet-600` (hover `violet-700`) | putih |
| Tombol aksen (CTA kunci, satu per layar) | `orchid-700` (hover `orchid-800`) | putih |
| Tombol sekunder | putih, garis `steel-700` | `steel-700` |
| Tombol bahaya | `danger-bg`, garis `danger-fg` | `danger-fg` |
| Header tabel | `steel-100` | `steel-700` atau `ink` |
| Tautan | n/a | `violet-700`, bergaris bawah |
| Fokus (semua kontrol) | n/a | kontur 2 px `violet-700`, offset 2 px |
| Isian | putih, garis `line-strong` | `ink`; placeholder `muted` |
| Grafik | deret 1 `violet-500`, 2 `steel-500`, 3 `orchid-500` | label `ink` (bukan warna deret) |
| Peringatan stok menipis | `warning-bg` | `warning-fg` |
| Galat | `danger-bg` | `danger-fg` |
| Berhasil | `success-bg` | `success-fg` |

Aturan keras: **teks putih tidak boleh diletakkan di atas warna dasar 500** (kontras 3,5; 2,47; 3,62). Di atas fill 500 pakai `ink`. Putih hanya di atas 600 atau lebih gelap.

### 7.5 Kontras terhitung (WCAG 2.2, dihitung dengan skrip `check-contrast.mjs`)

| Pasangan (depan di atas latar) | Warna | Rasio | Syarat | Hasil |
|---|---|---|---|---|
| ink di atas surface | `#1F1B2E` / `#FFFFFF` | 16,74:1 | ≥ 4,5:1 | lulus |
| ink di atas canvas | `#1F1B2E` / `#F7F5FB` | 15,47:1 | ≥ 4,5:1 | lulus |
| muted di atas surface | `#5B5870` / `#FFFFFF` | 6,83:1 | ≥ 4,5:1 | lulus |
| muted di atas canvas | `#5B5870` / `#F7F5FB` | 6,31:1 | ≥ 4,5:1 | lulus |
| ink di atas violet-500 | `#1F1B2E` / `#8B7CC7` | 4,63:1 | ≥ 4,5:1 | lulus |
| ink di atas steel-500 | `#1F1B2E` / `#8CA9BC` | 6,79:1 | ≥ 4,5:1 | lulus |
| ink di atas orchid-500 | `#1F1B2E` / `#A678B9` | 4,79:1 | ≥ 4,5:1 | lulus |
| putih di atas violet-600 | `#FFFFFF` / `#685D95` | 5,85:1 | ≥ 4,5:1 | lulus |
| putih di atas orchid-700 | `#FFFFFF` / `#6C4E78` | 7,00:1 | ≥ 4,5:1 | lulus |
| violet-700 di atas surface | `#5A5181` / `#FFFFFF` | 7,17:1 | ≥ 4,5:1 | lulus |
| steel-700 di atas surface | `#5B6E7A` / `#FFFFFF` | 5,31:1 | ≥ 4,5:1 | lulus |
| orchid-700 di atas surface | `#6C4E78` / `#FFFFFF` | 7,00:1 | ≥ 4,5:1 | lulus |
| violet-700 di atas violet-100 | `#5A5181` / `#F1EFF8` | 6,30:1 | ≥ 4,5:1 | lulus |
| steel-700 di atas steel-100 | `#5B6E7A` / `#F1F5F7` | 4,84:1 | ≥ 4,5:1 | lulus |
| success-fg di atas success-bg | `#14633F` / `#E6F4EC` | 6,42:1 | ≥ 4,5:1 | lulus |
| warning-fg di atas warning-bg | `#7A4B00` / `#FFF3D6` | 6,72:1 | ≥ 4,5:1 | lulus |
| danger-fg di atas danger-bg | `#A42018` / `#FDE8E6` | 6,38:1 | ≥ 4,5:1 | lulus |
| line-strong di atas surface (garis isian, non-teks) | `#7B7791` / `#FFFFFF` | 4,29:1 | ≥ 3,0:1 | lulus |
| putih di atas violet-500 (DILARANG) | `#FFFFFF` / `#8B7CC7` | 3,62:1 | tidak boleh dipakai | gagal (dilarang) |
| putih di atas steel-500 (DILARANG) | `#FFFFFF` / `#8CA9BC` | 2,47:1 | tidak boleh dipakai | gagal (dilarang) |
| putih di atas orchid-500 (DILARANG) | `#FFFFFF` / `#A678B9` | 3,50:1 | tidak boleh dipakai | gagal (dilarang) |
| steel-500 di atas surface (DILARANG sebagai teks) | `#8CA9BC` / `#FFFFFF` | 2,47:1 | tidak boleh dipakai | gagal (dilarang) |

`steel-500` dan `steel-600` hanya untuk fill dan hiasan; **dilarang** sebagai warna teks di atas putih (2,47:1 dan 4,18:1).

### 7.6 Tipografi

Font: **Plus Jakarta Sans** lewat `next/font/google` (berat 400, 500, 600, 700, subset latin), fallback `ui-sans-serif, system-ui`. Ukuran dasar 16 px (mencegah zoom otomatis iOS pada isian). Skala: judul halaman 24/32 semibold; judul bagian 20/28; judul kartu 16/24 semibold; badan 16/24; tabel dan keterangan 14/20; label kecil 12/16 (hanya pelengkap). Angka stok, uang, dan jumlah memakai `font-variant-numeric: tabular-nums`. Uang diformat `Rp1.500.000`; kuantitas `14,5 m`.

### 7.7 Spasi, bentuk, gerak

Grid 4 px. Radius: kontrol 10 px, kartu 14 px, dialog 18 px. Bayangan lembut satu tingkat untuk kartu dan dialog. Target sentuh minimal 48 × 48 px pada layar produksi. Gerak singkat (≤ 150 ms) dan dimatikan bila `prefers-reduced-motion`.

### 7.8 Komponen

| Komponen | Varian | Catatan |
|---|---|---|
| Button | utama, aksen, sekunder, bahaya, ikon | tinggi 48 px di mobile; keadaan `loading` menonaktifkan klik ganda |
| Field | teks, angka, tanggal, pilih, area teks | label selalu tampak, pesan galat di bawah isian, `aria-describedby` |
| NumberStepper | jumlah per ukuran | tombol − dan + 48 px; isian numerik; untuk lantai produksi |
| Badge | status pesanan, status pembayaran, hold | lihat §7.10 |
| Card, Panel | biasa, peringatan, galat | pita judul `steel-100` |
| DataTable | desktop tabel; mobile berubah menjadi kartu | kolom prioritas, urut, filter |
| SizeMatrix | ukuran × jumlah (dipesan, terkemas, selisih) | selisih merah bila ≠ 0 |
| StockPanel | bahan, butuh, tersedia, kurang | kurang berwarna `danger`; dapat diperbarui langsung |
| ItemEditor | baris pesanan (produk, ukuran, jumlah, kain, penerima) | mode matriks untuk kaos massal |
| PackingMatrix | baris pesanan × paket | indikator selisih langsung |
| Dialog | konfirmasi, formulir singkat | fokus terkunci, Esc menutup |
| Toast | berhasil, galat | `role="status"` atau `role="alert"` |
| EmptyState, Skeleton, ErrorState | n/a | setiap daftar dan halaman memiliki ketiganya |
| PrintSheet | A4 | CSS print; sembunyikan navigasi |

### 7.9 Tata letak responsif

Breakpoint: `sm` 640, `md` 768, `lg` 1024. **Mobile (< 1024):** top bar `violet-500`, konten satu kolom, bottom-nav `steel-500` maksimal 5 item menurut peran. **Desktop (≥ 1024):** sidebar 260 px `steel-500`, top bar, konten maks 1200 px. Layar produksi dirancang untuk 360 px lebih dulu.

### 7.10 Peta status ke tampilan

| Status | Keluarga | Label |
|---|---|---|
| `draft` | steel (100/700) | Draf |
| `accepted` | violet (100/700) | Diterima, menunggu DP |
| `dp_received` | violet | DP diterima |
| `spk_issued` | violet | SPK terbit |
| `cutting`, `decorating`, `sewing` | orchid (100/700) | Pemotongan, Sablon atau bordir, Penjahitan |
| `qc_packing` | orchid | QC dan pengemasan |
| `awaiting_final_payment` | warning | Menunggu pelunasan |
| `ready_to_ship` | success | Siap kirim |
| `shipped`, `completed` | success | Dikirim, Selesai |
| `cancelled` | netral (abu) | Dibatalkan |
| flag `material_hold` | warning | Menunggu bahan (+ ETA) |
| flag `on_hold` | danger | Ditahan (+ alasan) |

### 7.11 Aksesibilitas

Semua kontrol dapat dioperasikan keyboard; fokus tampak jelas; label pada setiap isian; status tidak hanya bergantung pada warna (selalu ada teks atau ikon); ukuran teks tidak turun di bawah 12 px; zoom 200% tidak merusak tata letak; `axe` tanpa pelanggaran serius pada layar utama.

### 7.12 Uji proporsi warna dan kontras (G5)

1. `npm run check:contrast` memeriksa semua pasangan token (tabel §7.5). Gagal bila ada pasangan di bawah ambang.
2. Playwright mengambil tangkapan layar lima layar pada 1366×768 dan 390×844 dengan data contoh: `/pesanan`, `/pesanan/[id]`, `/produksi`, `/stok`, `/dasbor` (pemilik). Disimpan di `tests/e2e/__shots__/`.
3. `npm run check:color-share` menjalankan `scripts/check-color-share.mjs` pada semua tangkapan: mengelompokkan piksel berwarna menurut rona (steel 170°–230°, violet 230°–268°, orchid 268°–330°), menghitung porsi, **lulus bila rata-rata dalam ±10 poin dari 40/40/20**.
4. Bila gagal, atur pemakaian (mis. perluas pita steel, kurangi fill orchid) tanpa mengubah warna dasar. Hasil ukur dicantumkan di laporan.

Skrip dan uji validasinya (gambar sintetis) ada di Lampiran F.

### 7.13 Filter antislop (UI, copy, aksesibilitas, mobile, komentar)

Proyek ini memasang `antislop` v3.2.32 (`miqdadbadjuber/anti-slop`) di `.agents/skills/` dengan pointer otomatis pada `AGENTS.md` (keputusan D-29). Sumber clone berada di `anti-slop/` dan dikecualikan dari ESLint serta TypeScript agar tidak mengganggu gate G1–G5.

- **Skill terpasang (6 modul):** `antislop` (aturan inti dan Delivery Gate), `antislop-ui` (tata letak, komponen, visual, performa), `antislop-copywriting` (label, tombol, pesan UI, larangan angka palsu), `antislop-human` (kontras, fokus keyboard, aksesibilitas), `antislop-layoutmobile` (reflow responsif dan target sentuh 360 px), serta `antislop-code` (kebersihan komentar kode).
- **Peran bersama §7:** §7 menyediakan arah visual (palet 20/40/40, tipografi Plus Jakarta Sans, komponen, dan peta status), sedangkan `antislop` menyaring pola generik AI dan memastikan keluaran siap pakai. Bila ada aturan yang berbenturan, `PROJECT_PLAN.md` §0.2 dan §7 menang.
- **Mode dan pemeriksaan:** gunakan mode `during` saat mengerjakan prompt UI, copy, atau komponen, lalu sertakan pemeriksaan Delivery Gate (PASS/FAIL) bersama G5. Gunakan mode `after` untuk audit pasca-pengerjaan (Prompt Khusus G).

---

## 8. ARSITEKTUR APLIKASI

### 8.1 Lapisan

```
Browser (admin, produksi, pemilik)
  -> Next.js (Server Components + Server Actions)
       lib/validation (Zod)  ->  lib/rpc.ts (typed)  ->  Supabase (sesi pengguna)
                                                          Postgres: RLS + fungsi RPC (R1..R13)
                                                          Auth, Storage (thumbnail)
  admin client (service role) hanya: server action buat pengguna, skrip uji
```

Server Component membaca data lewat klien Supabase bersesi pengguna (RLS berlaku). Penulisan lewat Server Action yang memanggil RPC. Tidak ada route handler untuk mutasi kecuali `/api/health` dan `/api/ekspor/[nama]` (baca saja, khusus pemilik).

### 8.2 Pembungkus RPC bertipe (`lib/rpc.ts`)

```ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { mapDbError, type AppErrorCode } from '@/lib/errors';

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; detail?: unknown; message: string };

type Fn = keyof Database['public']['Functions'];

export async function callRpc<F extends Fn>(
  name: F, args: Database['public']['Functions'][F]['Args'],
): Promise<RpcResult<Database['public']['Functions'][F]['Returns']>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) return { ok: false, ...mapDbError(error.message) };           // exception: FORBIDDEN, INVALID_TRANSITION, ...
  const body = data as { ok?: boolean; code?: string } | null;
  if (body && body.ok === false && body.code) return { ok: false, ...mapDbError(body.code, body) };  // hasil bisnis negatif
  return { ok: true, data: data as never };
}
```

### 8.3 Pola Server Action

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { callRpc } from '@/lib/rpc';
import { requireRole } from '@/lib/auth/roles';

const schema = z.object({ orderId: z.uuid() });

export async function acceptOrderAction(input: unknown) {
  await requireRole(['admin', 'pemilik']);                 // pemeriksaan awal; database tetap penjaga utama
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: 'VALIDATION', message: 'Data tidak valid.' };
  const res = await callRpc('accept_order', { p_order_id: parsed.data.orderId });
  if (res.ok) revalidatePath(`/pesanan/${parsed.data.orderId}`);
  return res;                                              // UI menampilkan res.message dan res.detail (mis. tabel kekurangan)
}
```

Aturan: setiap action memvalidasi masukan, memanggil satu RPC, dan mengembalikan `RpcResult`. Tidak ada logika bisnis di action.

### 8.4 Penanganan galat

`mapDbError` memetakan kode (Lampiran A) ke pesan Indonesia dan `AppErrorCode`. Hasil `ok:false` dengan `detail` (kekurangan, selisih pengemasan, bahan tanpa aturan) diteruskan ke komponen yang menampilkannya (StockPanel, SizeMatrix). Galat tak dikenal tampil sebagai "Terjadi kesalahan. Coba lagi" dan dicatat tanpa data pribadi.

### 8.5 Draf lokal (NF3)

Hook `useDraft(key, schema)` menyimpan isian formulir pesanan ke `localStorage` setiap 1 detik tanpa tindakan, memulihkannya saat halaman dimuat, menawarkan "Pulihkan draf" dan menghapusnya setelah simpan berhasil. Kunci memuat id pengguna. Tidak menyimpan data kontak pelanggan.

### 8.6 Konkurensi dan klik ganda

Tombol aksi memakai `useTransition` dan menonaktifkan diri selama proses. Database menjamin idempoten: penerimaan kedua pada pesanan yang sama gagal karena status bukan `draft`; pembayaran ganda dicegah dengan pemeriksaan status.

### 8.7 Caching

Halaman stok, pesanan, dan antrean produksi `dynamic = 'force-dynamic'` dan tidak di-cache. Data master (kategori, produk) boleh di-cache singkat dengan tag dan di-revalidate saat berubah.

### 8.8 Penyimpanan berkas

Bucket privat `design-thumbnails`. Unggah dari server (Server Action) setelah memeriksa tipe (jpeg, png, webp) dan ukuran ≤ 2 MB; tampil lewat signed URL berumur pendek. Tautan file mentah (Google Drive, dsb.) disimpan sebagai teks.

---

## 9. SKEMA DATABASE (TERVERIFIKASI)

### 9.1 Berkas migrasi

Berkas 0001 sampai 0013 **sudah dimuat berurutan ke PostgreSQL 16** dengan stub Supabase (Lampiran F) dan lulus 119 assertion serta uji konkurensi. Berkas 0014 dan 0015 belum diuji. Salin apa adanya ke `supabase/migrations/` dengan awalan stempel waktu (mis. `20261105000100_foundation.sql`), urutan tetap.

| Urutan | Berkas | Isi | Diuji |
|---|---|---|---|
| 1 | `0001_foundation` | ekstensi, tipe enum, `studio_settings`, `set_updated_at` | ya |
| 2 | `0002_identity` | `profiles`, `user_roles`, `has_role`, `has_any_role`, trigger pengguna baru | ya |
| 3 | `0003_master_data` | kategori, produk, spesifikasi kain per ukuran, bahan, pengganti, konsumsi, pelanggan | ya |
| 4 | `0004_orders` | pesanan, item (validasi PDH/PDL), revisi, riwayat status, berkas desain, penomoran | ya |
| 5 | `0005_stock` | pergerakan, reservasi, opname | ya |
| 6 | `0006_production_packing` | log tahap, paket, pemeriksaan, pembayaran, pengiriman | ya |
| 7 | `0007_approvals_audit` | persetujuan, audit log dan pemicu audit | ya |
| 8 | `0008_functions_core` | penomoran, draf, revisi, hitung kebutuhan, cek dan pratinjau stok, terima, override | ya |
| 9 | `0009_functions_stock` | pergerakan, mulai pemotongan, opname, revisi terlambat, keputusan persetujuan | ya |
| 10 | `0010_functions_flow` | status, pembayaran, pengemasan, pengiriman, batal, hold, pengguna | ya |
| 11 | `0011_views` | stok, antrean produksi, laporan | ya |
| 12 | `0012_rls_grants` | RLS, kebijakan, grant, hak eksekusi | ya |
| 13 | `0013_reference_data` | satu baris pengaturan, transisi status, kategori awal | ya |
| 14 | `0014_cron` | penjadwal pelepasan reservasi | **tidak** (pg_cron) |
| 15 | `0015_storage` | bucket dan kebijakan thumbnail | **tidak** (Storage nyata) |

### 9.2 Aturan penerapan

1. Urutan di atas wajib. Berkas 0013 dijalankan setelah 0012 (pemilik tabel melewati RLS).
2. Setelah dipush ke DEV atau PRODUKSI, berkas tidak diedit; perubahan lewat migrasi baru (§0.2 #15).
3. Setiap fungsi baru **wajib** diberi `grant execute` eksplisit; default privilege sudah mencabutnya dari `anon` dan `authenticated`.
4. Fungsi bisnis berada di schema `public` agar dapat dipanggil lewat `supabase.rpc`; fungsi pembantu di schema `private` yang tidak terpapar API (di dashboard, pastikan "exposed schemas" hanya `public`).
5. Di dashboard Supabase: matikan pendaftaran mandiri (Auth > Providers > Email > *Allow new users to sign up* = off) dan matikan pemaparan otomatis tabel dan fungsi baru bila opsinya ada.

### 9.3 SQL migrasi (isi lengkap, terverifikasi)

#### 9.3.1 `0001_foundation.sql`: Fondasi

```sql
create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;
revoke all on schema private from public;

create type public.app_role            as enum ('admin', 'produksi', 'pemilik');
create type public.order_status        as enum ('draft','accepted','dp_received','spk_issued','cutting','decorating','sewing',
                                                'qc_packing','awaiting_final_payment','ready_to_ship','shipped','completed','cancelled');
create type public.production_stage    as enum ('cutting','decorating','sewing','qc_packing');
create type public.payment_kind        as enum ('dp','final');
create type public.payment_status      as enum ('proof_received','settled','rejected');
create type public.stock_pool          as enum ('main','remnant');
create type public.stock_movement_type as enum ('purchase_in','cutting_out','remnant_in','remnant_used','adjustment');
create type public.material_kind       as enum ('fabric','ink','dtf_film','transfer_paper','thread','accessory','other');
create type public.shipment_method     as enum ('cargo','lalamove','gocar','hand_delivery','customer_pickup');
create type public.approval_kind       as enum ('stock_override','late_revision','count_variance','packing_exception');
create type public.approval_status     as enum ('pending','approved','rejected');
create type public.reservation_status  as enum ('active','released','consumed');
create type public.count_status        as enum ('applied','pending_approval','rejected');
create type public.delay_reason        as enum ('seamstress_capacity','drying_weather','waiting_material','revision','other');
create type public.customer_group      as enum ('community','campus','institution','brand','individual','other');
create type public.packing_result      as enum ('match','mismatch','exception');

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.studio_settings (
  id smallint primary key default 1 check (id = 1),                       -- satu baris saja
  studio_name text not null default 'Determined Studio',
  contact_whatsapp text,
  address text,
  bank_accounts jsonb not null default '[]'::jsonb,                       -- [{bank, account_number, account_name}]
  dp_percent smallint not null default 50 check (dp_percent between 1 and 100),
  waste_percent numeric(5,2) not null default 5 check (waste_percent between 0 and 50),   -- hanya untuk kain
  reservation_expiry_days smallint not null default 3 check (reservation_expiry_days between 1 and 60),
  count_tolerance_pct numeric(5,2) not null default 2 check (count_tolerance_pct between 0 and 100),
  require_second_checker boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_studio_settings_updated before update on public.studio_settings
  for each row execute function public.set_updated_at();
```

#### 9.3.2 `0002_identity.sql`: Identitas dan peran

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Satu pengguna boleh punya lebih dari satu peran (mis. admin yang merangkap packing).
-- Tidak ada jalur tulis dari klien selain pemilik (lihat RLS).
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_any_role(p_roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
     where ur.user_id = (select auth.uid()) and p.is_active and ur.role = any (p_roles));
$$;

create or replace function public.has_role(p_role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_any_role(array[p_role]);
$$;
```

#### 9.3.3 `0003_master_data.sql`: Master data

```sql
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  size_options text[] not null default '{}',                 -- ukuran baku; 'KHUSUS' selalu diizinkan bila produk punya spesifikasinya
  supports_personalization boolean not null default false,   -- nama atau label penerima per potong (mis. PDH/PDL)
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_categories_updated before update on public.product_categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  technique_notes text,                                      -- mis. Plastisol, DTF, bordir, emblem
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_category on public.products(category_id);
create index idx_products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- Kebutuhan kain per potong menurut ukuran. Tanpa baris ini sebuah item tidak dapat dihitung dan pesanan tidak dapat diterima.
create table public.product_size_specs (
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (length(trim(size)) > 0),
  fabric_per_unit numeric(10,3) not null check (fabric_per_unit > 0),
  note text,
  primary key (product_id, size)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind public.material_kind not null,
  unit text not null,                                        -- meter, kg, lembar, pcs, ...
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  track_per_order boolean not null default true,             -- true: dicadangkan dan dikeluarkan per pesanan; false: hanya batas minimum dan opname
  blocks_acceptance boolean not null default true,           -- true: stok kurang memblokir penerimaan pesanan
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_materials_updated before update on public.materials
  for each row execute function public.set_updated_at();

create table public.material_alternatives (
  material_id uuid not null references public.materials(id) on delete cascade,
  alternative_id uuid not null references public.materials(id) on delete cascade,
  note text,
  primary key (material_id, alternative_id),
  check (material_id <> alternative_id)
);

-- Bahan selain kain yang ikut dicadangkan per potong (mis. emblem, kancing).
create table public.consumption_rules (
  product_id uuid not null references public.products(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete restrict,
  qty_per_unit numeric(10,3) not null check (qty_per_unit > 0),
  primary key (product_id, material_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  group_type public.customer_group not null default 'other',
  phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customers_name_trgm on public.customers using gin (name extensions.gin_trgm_ops);
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();
```

#### 9.3.4 `0004_orders.sql`: Pesanan

```sql
create table public.order_counters (
  period text primary key,                                   -- YYMM (zona Asia/Jakarta)
  last_value integer not null default 0
);

create table public.status_transitions (
  from_status public.order_status not null,
  to_status public.order_status not null,
  is_rollback boolean not null default false,
  primary key (from_status, to_status)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status public.order_status not null default 'draft',
  deadline date not null,
  agreed_total integer not null default 0 check (agreed_total >= 0),     -- rupiah penuh (integer)
  dp_amount integer not null default 0 check (dp_amount >= 0),
  invoice_number text unique,
  invoice_issued_at timestamptz,
  current_version integer not null default 1,
  material_hold boolean not null default false,              -- true: diterima lewat override saat bahan kurang; tidak boleh mulai pemotongan
  material_hold_eta date,
  material_purchased_at timestamptz,                         -- dasar aturan DP hangus
  on_hold boolean not null default false,
  hold_reason text,
  packing_exception_ok boolean not null default false,
  dp_forfeited boolean not null default false,
  cancel_reason text,
  chat_summary text,                                         -- ringkasan kesepakatan WhatsApp (hanya admin dan pemilik)
  notes text,                                                -- catatan internal (hanya admin dan pemilik)
  production_notes text,                                     -- catatan untuk produksi (tanpa harga atau kontak)
  accepted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_dp_not_above_total check (dp_amount <= agreed_total)
);
create index idx_orders_status_deadline on public.orders(status, deadline);
create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_created on public.orders(created_at desc);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  line_no integer not null,
  product_id uuid not null references public.products(id) on delete restrict,
  size text not null,
  quantity integer not null check (quantity between 1 and 5000),
  fabric_material_id uuid not null references public.materials(id) on delete restrict,
  recipient_label text,                                      -- nama atau jabatan penerima (personalisasi PDH/PDL), opsional
  size_note text,                                            -- ukuran badan untuk ukuran KHUSUS
  spec jsonb not null default '{}'::jsonb,                   -- teknik, posisi, teks, logo, warna benang
  unique (order_id, line_no)
);
create index idx_order_items_order on public.order_items(order_id);

create or replace function public.validate_order_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cat public.product_categories%rowtype; v_kind public.material_kind;
begin
  select c.* into v_cat
    from public.products p join public.product_categories c on c.id = p.category_id
   where p.id = new.product_id and p.is_active;
  if not found or not v_cat.is_active then raise exception 'INVALID_ITEM:PRODUCT'; end if;
  if new.size <> 'KHUSUS' and not (new.size = any (v_cat.size_options)) then raise exception 'INVALID_ITEM:SIZE'; end if;
  if new.size = 'KHUSUS' and nullif(trim(new.size_note), '') is null then raise exception 'INVALID_ITEM:SIZE_NOTE'; end if;
  if new.recipient_label is not null and not v_cat.supports_personalization then raise exception 'INVALID_ITEM:PERSONALIZATION'; end if;
  select kind into v_kind from public.materials where id = new.fabric_material_id and is_active;
  if v_kind is distinct from 'fabric'::public.material_kind then raise exception 'INVALID_ITEM:FABRIC'; end if;
  return new;
end $$;
create trigger trg_order_items_validate before insert or update on public.order_items
  for each row execute function public.validate_order_item();

create table public.order_revisions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  version integer not null,
  summary text not null,
  snapshot jsonb not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (order_id, version)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  reason text,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index idx_status_history_order on public.order_status_history(order_id, created_at);

create table public.design_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  label text not null,
  url text,                                                  -- tautan ke file mentah (tidak disimpan di Supabase)
  thumbnail_path text,                                       -- path di bucket design-thumbnails (maks 2 MB)
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (url is not null or thumbnail_path is not null)
);
create index idx_design_files_order on public.design_files(order_id);
```

#### 9.3.5 `0005_stock.sql`: Stok

```sql
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  pool public.stock_pool not null default 'main',
  movement_type public.stock_movement_type not null,
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  order_id uuid references public.orders(id) on delete restrict,
  ref_movement_id uuid references public.stock_movements(id),   -- koreksi menunjuk pergerakan asal
  reason text,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint chk_movement_sign check (
       (movement_type = 'purchase_in'  and quantity_delta > 0 and pool = 'main')
    or (movement_type = 'cutting_out'  and quantity_delta < 0 and pool = 'main'   and order_id is not null)
    or (movement_type = 'remnant_in'   and quantity_delta > 0 and pool = 'remnant' and order_id is not null)
    or (movement_type = 'remnant_used' and quantity_delta < 0 and pool = 'remnant' and order_id is not null)
    or (movement_type = 'adjustment' and nullif(trim(reason), '') is not null))
);
create index idx_movements_material_pool on public.stock_movements(material_id, pool);
create index idx_movements_order on public.stock_movements(order_id) where order_id is not null;

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index uq_reservation_active on public.stock_reservations(order_id, material_id) where status = 'active';
create index idx_reservation_material_active on public.stock_reservations(material_id) where status = 'active';

create table public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  pool public.stock_pool not null default 'main',
  counted_on date not null default (timezone('Asia/Jakarta', now()))::date,
  system_qty numeric(14,3) not null,
  counted_qty numeric(14,3) not null check (counted_qty >= 0),
  variance numeric(14,3) not null,
  reason text,
  status public.count_status not null,
  counted_by uuid default auth.uid(),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_counts_material on public.stock_counts(material_id, counted_on desc);
```

#### 9.3.6 `0006_production_packing.sql`: Produksi, pengemasan, pembayaran, pengiriman

```sql
create table public.production_stage_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage public.production_stage not null,
  started_at timestamptz not null default now(),
  started_by uuid default auth.uid(),
  finished_at timestamptz,
  finished_by uuid,
  delay_reason public.delay_reason,
  delay_note text
);
create index idx_stage_logs_order on public.production_stage_logs(order_id, started_at);
create unique index uq_stage_log_open on public.production_stage_logs(order_id) where finished_at is null;

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  package_no integer not null check (package_no > 0),
  packed_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (order_id, package_no)
);
create table public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unique (package_id, order_item_id)
);
create index idx_package_items_item on public.package_items(order_item_id);

create table public.packing_checks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  result public.packing_result not null,
  diffs jsonb not null default '[]'::jsonb,
  checked_by uuid default auth.uid(),
  checked_at timestamptz not null default now()
);
create index idx_packing_checks_order on public.packing_checks(order_id, checked_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind public.payment_kind not null,
  amount integer not null check (amount > 0),
  bank text,
  note text,
  status public.payment_status not null default 'proof_received',
  received_at timestamptz not null default now(),
  recorded_by uuid default auth.uid(),
  settled_at timestamptz,
  validated_by uuid
);
create index idx_payments_order on public.payments(order_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method public.shipment_method not null,
  tracking_note text,
  shipped_at timestamptz not null default now(),
  delivered_at timestamptz,
  note text,
  created_by uuid default auth.uid()
);
```

#### 9.3.7 `0007_approvals_audit.sql`: Persetujuan dan audit

```sql
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  kind public.approval_kind not null,
  order_id uuid references public.orders(id) on delete cascade,
  requested_by uuid not null default auth.uid(),
  reason text not null check (length(trim(reason)) > 0),
  payload jsonb not null default '{}'::jsonb,
  status public.approval_status not null default 'pending',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);
create index idx_approvals_pending on public.approvals(status, created_at) where status = 'pending';
create unique index uq_approval_pending_order_kind on public.approvals(order_id, kind) where status = 'pending' and order_id is not null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_table_time on public.audit_logs(table_name, created_at desc);

create or replace function public.log_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
  values (tg_table_name,
          coalesce(to_jsonb(coalesce(new, old))->>'id', to_jsonb(coalesce(new, old))->>'user_id'),
          tg_op, (select auth.uid()),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['orders','order_items','payments','approvals','stock_counts','packing_checks',
                           'user_roles','materials','consumption_rules','product_size_specs','studio_settings','shipments']
  loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.log_audit()', t);
  end loop;
end $$;
```

#### 9.3.8 `0008_functions_core.sql`: Fungsi inti

```sql
-- ============ fungsi pembantu (schema private, tidak terbuka ke API) ============
create or replace function private.next_order_number() returns text
language plpgsql security definer set search_path = public as $$
declare v_period text := to_char(timezone('Asia/Jakarta', now()), 'YYMM'); v_n integer;
begin
  insert into public.order_counters as c (period, last_value) values (v_period, 1)
  on conflict (period) do update set last_value = c.last_value + 1
  returning last_value into v_n;
  return 'DS-' || v_period || '-' || lpad(v_n::text, 4, '0');
end $$;

create or replace function private.order_items_json(p_order_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'product_id', product_id, 'size', size, 'quantity', quantity,
           'fabric_material_id', fabric_material_id) order by line_no), '[]'::jsonb)
    from public.order_items where order_id = p_order_id;
$$;

create or replace function private.order_snapshot(p_order_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deadline', o.deadline, 'agreed_total', o.agreed_total, 'production_notes', o.production_notes,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', i.id, 'line_no', i.line_no, 'product_id', i.product_id, 'size', i.size, 'quantity', i.quantity,
                'fabric_material_id', i.fabric_material_id, 'recipient_label', i.recipient_label,
                'size_note', i.size_note, 'spec', i.spec) order by i.line_no), '[]'::jsonb)
                from public.order_items i where i.order_id = o.id))
    from public.orders o where o.id = p_order_id;
$$;

-- Kebutuhan bahan per pesanan. Kain: jumlah x kebutuhan per ukuran x (1 + toleransi buangan).
-- Bahan lain: jumlah x kebutuhan per potong. Hanya bahan dengan track_per_order = true yang dihitung.
create or replace function private.compute_needs(p_items jsonb)
returns table (material_id uuid, needed numeric)
language sql stable security definer set search_path = public as $$
  with items as (
    select (e->>'product_id')::uuid as product_id, e->>'size' as size,
           (e->>'quantity')::integer as qty, (e->>'fabric_material_id')::uuid as fabric_id
      from jsonb_array_elements(p_items) e
  ), waste as (select waste_percent from public.studio_settings where id = 1),
  fabric as (
    select i.fabric_id as mid, sum(i.qty * s.fabric_per_unit) * (1 + (select waste_percent from waste) / 100.0) as qty
      from items i join public.product_size_specs s on s.product_id = i.product_id and s.size = i.size
     group by i.fabric_id
  ), others as (
    select r.material_id as mid, sum(i.qty * r.qty_per_unit) as qty
      from items i join public.consumption_rules r on r.product_id = i.product_id
     group by r.material_id
  ), merged as (select * from fabric union all select * from others)
  select m.mid, round(sum(m.qty), 3)
    from merged m join public.materials mat on mat.id = m.mid
   where mat.track_per_order
   group by m.mid;
$$;

create or replace function private.missing_specs(p_items jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(distinct jsonb_build_object('product_id', i.product_id, 'size', i.size)), '[]'::jsonb)
    from (select (e->>'product_id')::uuid as product_id, e->>'size' as size from jsonb_array_elements(p_items) e) i
    left join public.product_size_specs s on s.product_id = i.product_id and s.size = i.size
   where s.product_id is null;
$$;

-- Stok tersedia = stok fisik kolam utama - reservasi aktif (milik pesanan lain).
create or replace function private.material_available(p_material_id uuid, p_exclude_order uuid default null) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(quantity_delta) from public.stock_movements where material_id = p_material_id and pool = 'main'), 0)
       - coalesce((select sum(quantity) from public.stock_reservations
                    where material_id = p_material_id and status = 'active'
                      and (p_exclude_order is null or order_id <> p_exclude_order)), 0);
$$;

-- Satu-satunya jalur perubahan status. Menjaga tabel transisi, riwayat, dan log tahap produksi.
create or replace function private.change_status(p_order_id uuid, p_to public.order_status, p_reason text default null,
                                                 p_delay public.delay_reason default null, p_delay_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_from public.order_status; v_hold boolean;
begin
  select status, on_hold into v_from, v_hold from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_hold and p_to <> 'cancelled' then raise exception 'ORDER_ON_HOLD'; end if;
  if not exists (select 1 from public.status_transitions where from_status = v_from and to_status = p_to) then
    raise exception 'INVALID_TRANSITION:% -> %', v_from, p_to;
  end if;
  update public.production_stage_logs
     set finished_at = now(), finished_by = (select auth.uid()), delay_reason = p_delay, delay_note = p_delay_note
   where order_id = p_order_id and finished_at is null;
  if p_to in ('cutting','decorating','sewing','qc_packing') then
    insert into public.production_stage_logs (order_id, stage) values (p_order_id, p_to::text::public.production_stage);
  end if;
  update public.orders set status = p_to where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, reason) values (p_order_id, v_from, p_to, p_reason);
end $$;

-- Inti penerimaan pesanan. Pemanggil sudah mengunci baris pesanan.
create or replace function private.accept_core(p_order public.orders, p_allow_shortage boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_items jsonb; v_missing jsonb; v_short jsonb; v_cfg public.studio_settings; v_dp integer; v_inv text;
begin
  select * into v_cfg from public.studio_settings where id = 1;
  v_items := private.order_items_json(p_order.id);
  if jsonb_array_length(v_items) = 0 then return jsonb_build_object('ok', false, 'code', 'EMPTY_ORDER'); end if;
  if p_order.agreed_total <= 0 then return jsonb_build_object('ok', false, 'code', 'PRICE_MISSING'); end if;
  v_missing := private.missing_specs(v_items);
  if jsonb_array_length(v_missing) > 0 then
    return jsonb_build_object('ok', false, 'code', 'CONSUMPTION_RULE_MISSING', 'missing', v_missing);
  end if;

  -- kunci baris bahan berurutan menurut id agar dua penerimaan bersamaan tidak saling menunggu (deadlock)
  perform 1 from public.materials
   where id in (select n.material_id from private.compute_needs(v_items) n) order by id for update;

  select jsonb_agg(jsonb_build_object('material_id', n.material_id, 'material_name', m.name, 'unit', m.unit,
                   'needed', n.needed, 'available', av.available, 'shortage', n.needed - av.available) order by m.name)
    into v_short
    from private.compute_needs(v_items) n
    join public.materials m on m.id = n.material_id
    cross join lateral (select private.material_available(n.material_id, p_order.id) as available) av
   where m.blocks_acceptance and n.needed > av.available;

  if v_short is not null and not p_allow_shortage then
    return jsonb_build_object('ok', false, 'code', 'STOCK_SHORTAGE', 'shortages', v_short);
  end if;

  insert into public.stock_reservations (order_id, material_id, quantity, expires_at)
  select p_order.id, n.material_id, n.needed, now() + make_interval(days => v_cfg.reservation_expiry_days)
    from private.compute_needs(v_items) n;

  v_dp := round(p_order.agreed_total * v_cfg.dp_percent / 100.0);
  v_inv := 'INV-' || substr(p_order.order_number, 4);
  update public.orders
     set accepted_at = now(), invoice_number = v_inv, invoice_issued_at = now(), dp_amount = v_dp,
         material_hold = (v_short is not null)
   where id = p_order.id;
  perform private.change_status(p_order.id, 'accepted', case when v_short is not null then 'Diterima dengan override stok' end);
  return jsonb_build_object('ok', true, 'invoice_number', v_inv, 'dp_amount', v_dp, 'material_hold', v_short is not null,
                            'shortages', coalesce(v_short, '[]'::jsonb));
end $$;

-- ============ fungsi publik ============
create or replace function public.create_draft_order(
  p_customer_id uuid, p_deadline date, p_agreed_total integer, p_chat_summary text,
  p_production_notes text, p_notes text, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_number text; v_item jsonb; v_line integer := 0;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_ORDER'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'INVALID_ITEM:TOO_MANY'; end if;
  if p_deadline is null or p_deadline < (timezone('Asia/Jakarta', now()))::date then raise exception 'INVALID_DEADLINE'; end if;
  if p_agreed_total is null or p_agreed_total < 0 then raise exception 'INVALID_PRICE'; end if;
  if not exists (select 1 from public.customers where id = p_customer_id and is_active) then raise exception 'CUSTOMER_NOT_FOUND'; end if;

  v_number := private.next_order_number();
  insert into public.orders (order_number, customer_id, deadline, agreed_total, chat_summary, production_notes, notes)
  values (v_number, p_customer_id, p_deadline, p_agreed_total, p_chat_summary, p_production_notes, p_notes)
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_line := v_line + 1;
    insert into public.order_items (order_id, line_no, product_id, size, quantity, fabric_material_id, recipient_label, size_note, spec)
    values (v_id, v_line, (v_item->>'product_id')::uuid, v_item->>'size', (v_item->>'quantity')::integer,
            (v_item->>'fabric_material_id')::uuid, nullif(trim(v_item->>'recipient_label'), ''),
            nullif(trim(v_item->>'size_note'), ''), coalesce(v_item->'spec', '{}'::jsonb));
  end loop;
  insert into public.order_revisions (order_id, version, summary, snapshot) values (v_id, 1, 'Versi awal', private.order_snapshot(v_id));
  insert into public.order_status_history (order_id, from_status, to_status) values (v_id, null, 'draft');
  return jsonb_build_object('order_id', v_id, 'order_number', v_number);
end $$;

-- Revisi sebelum pemotongan: mengganti seluruh item, menaikkan versi, memeriksa ulang stok bila pesanan sudah diterima.
create or replace function public.revise_order(
  p_order_id uuid, p_expected_version integer, p_items jsonb, p_deadline date,
  p_agreed_total integer, p_production_notes text, p_summary text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_o public.orders; v_item jsonb; v_line integer := 0; v_missing jsonb; v_short jsonb; v_cfg public.studio_settings; v_new_ver integer;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_summary), '') is null then raise exception 'SUMMARY_REQUIRED'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_ORDER'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_o.status not in ('draft','accepted','dp_received','spk_issued') then raise exception 'REVISION_LOCKED'; end if;
  if v_o.on_hold then raise exception 'ORDER_ON_HOLD'; end if;
  if v_o.current_version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;
  select * into v_cfg from public.studio_settings where id = 1;

  if v_o.status <> 'draft' then
    v_missing := private.missing_specs(p_items);
    if jsonb_array_length(v_missing) > 0 then return jsonb_build_object('ok', false, 'code', 'CONSUMPTION_RULE_MISSING', 'missing', v_missing); end if;
    perform 1 from public.materials
     where id in (select n.material_id from private.compute_needs(p_items) n union
                  select r.material_id from public.stock_reservations r where r.order_id = p_order_id and r.status = 'active')
     order by id for update;
    select jsonb_agg(jsonb_build_object('material_id', n.material_id, 'material_name', m.name, 'unit', m.unit,
                     'needed', n.needed, 'available', av.available, 'shortage', n.needed - av.available))
      into v_short
      from private.compute_needs(p_items) n join public.materials m on m.id = n.material_id
      cross join lateral (select private.material_available(n.material_id, p_order_id) as available) av
     where m.blocks_acceptance and n.needed > av.available;
    if v_short is not null and not v_o.material_hold then
      return jsonb_build_object('ok', false, 'code', 'STOCK_SHORTAGE', 'shortages', v_short);
    end if;
    update public.stock_reservations set status = 'released', closed_at = now() where order_id = p_order_id and status = 'active';
    insert into public.stock_reservations (order_id, material_id, quantity, expires_at)
    select p_order_id, n.material_id, n.needed,
           case when v_o.status = 'accepted' then now() + make_interval(days => v_cfg.reservation_expiry_days) end
      from private.compute_needs(p_items) n;
  end if;

  delete from public.order_items where order_id = p_order_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_line := v_line + 1;
    insert into public.order_items (order_id, line_no, product_id, size, quantity, fabric_material_id, recipient_label, size_note, spec)
    values (p_order_id, v_line, (v_item->>'product_id')::uuid, v_item->>'size', (v_item->>'quantity')::integer,
            (v_item->>'fabric_material_id')::uuid, nullif(trim(v_item->>'recipient_label'), ''),
            nullif(trim(v_item->>'size_note'), ''), coalesce(v_item->'spec', '{}'::jsonb));
  end loop;

  v_new_ver := v_o.current_version + 1;
  update public.orders
     set current_version = v_new_ver, deadline = coalesce(p_deadline, deadline),
         agreed_total = coalesce(p_agreed_total, agreed_total), production_notes = coalesce(p_production_notes, production_notes),
         dp_amount = case when status = 'accepted' and coalesce(p_agreed_total, agreed_total) > 0
                          then round(coalesce(p_agreed_total, agreed_total) * v_cfg.dp_percent / 100.0) else dp_amount end
   where id = p_order_id;
  insert into public.order_revisions (order_id, version, summary, snapshot) values (p_order_id, v_new_ver, trim(p_summary), private.order_snapshot(p_order_id));
  return jsonb_build_object('ok', true, 'version', v_new_ver);
end $$;

create or replace function public.check_stock(p_order_id uuid)
returns table (material_id uuid, material_name text, unit text, needed numeric, on_hand numeric,
               reserved_other numeric, available numeric, shortage numeric, blocks_acceptance boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.has_any_role(array['admin','produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  return query
  select n.material_id, m.name, m.unit, n.needed,
         coalesce((select sum(s.quantity_delta) from public.stock_movements s where s.material_id = n.material_id and s.pool = 'main'), 0),
         coalesce((select sum(r.quantity) from public.stock_reservations r
                    where r.material_id = n.material_id and r.status = 'active' and r.order_id <> p_order_id), 0),
         private.material_available(n.material_id, p_order_id),
         greatest(n.needed - private.material_available(n.material_id, p_order_id), 0),
         m.blocks_acceptance
    from private.compute_needs(private.order_items_json(p_order_id)) n
    join public.materials m on m.id = n.material_id
   order by m.name;
end $$;

create or replace function public.accept_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_o public.orders;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_o.status <> 'draft' then raise exception 'INVALID_TRANSITION:% -> accepted', v_o.status; end if;
  if v_o.on_hold then raise exception 'ORDER_ON_HOLD'; end if;
  return private.accept_core(v_o, false);
end $$;

create or replace function public.request_override(p_order_id uuid, p_reason text, p_eta date) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_status public.order_status; v_id uuid;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason), '') is null or p_eta is null then raise exception 'REASON_AND_ETA_REQUIRED'; end if;
  select status into v_status from public.orders where id = p_order_id;
  if v_status is distinct from 'draft' then raise exception 'INVALID_TRANSITION'; end if;
  insert into public.approvals (kind, order_id, reason, payload)
  values ('stock_override', p_order_id, trim(p_reason), jsonb_build_object('eta', p_eta)) returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'ALREADY_PENDING';
end $$;

-- Pratinjau ketersediaan untuk formulir yang belum disimpan (tidak menulis apa pun).
create or replace function public.preview_stock(p_items jsonb, p_order_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_missing jsonb; v_rows jsonb;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('missing', '[]'::jsonb, 'rows', '[]'::jsonb, 'blocked', false);
  end if;
  v_missing := private.missing_specs(p_items);
  select coalesce(jsonb_agg(jsonb_build_object(
           'material_id', n.material_id, 'material_name', m.name, 'unit', m.unit, 'needed', n.needed,
           'available', av.available, 'shortage', greatest(n.needed - av.available, 0), 'blocks_acceptance', m.blocks_acceptance)
           order by m.name), '[]'::jsonb)
    into v_rows
    from private.compute_needs(p_items) n
    join public.materials m on m.id = n.material_id
    cross join lateral (select private.material_available(n.material_id, p_order_id) as available) av;
  return jsonb_build_object('missing', v_missing, 'rows', v_rows,
    'blocked', jsonb_array_length(v_missing) > 0 or exists (select 1 from jsonb_array_elements(v_rows) r where (r->>'shortage')::numeric > 0 and (r->>'blocks_acceptance')::boolean));
end $$;
```

#### 9.3.9 `0009_functions_stock.sql`: Fungsi stok dan persetujuan

```sql
-- Bila stok fisik sudah menutup seluruh reservasi aktif sebuah bahan, pesanan yang menunggu bahan dibebaskan.
create or replace function private.refresh_material_holds(p_material_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  for v_order in
    select o.id from public.orders o
     where o.material_hold and o.status in ('accepted','dp_received','spk_issued')
       and exists (select 1 from public.stock_reservations r
                    where r.order_id = o.id and r.status = 'active' and r.material_id = any (p_material_ids))
  loop
    if not exists (
      select 1 from public.stock_reservations r
       where r.order_id = v_order and r.status = 'active'
         and (select coalesce(sum(s.quantity_delta), 0) from public.stock_movements s where s.material_id = r.material_id and s.pool = 'main')
           < (select coalesce(sum(r2.quantity), 0) from public.stock_reservations r2 where r2.material_id = r.material_id and r2.status = 'active')
    ) then
      update public.orders set material_hold = false, material_hold_eta = null where id = v_order;
    end if;
  end loop;
end $$;

-- Pergerakan stok manual. purchase_in dan remnant_used: p_quantity positif (tanda diberikan fungsi).
-- adjustment: p_quantity bertanda (hanya pemilik). cutting_out dan remnant_in hanya lewat start_cutting.
create or replace function public.record_movement(p_material_id uuid, p_type public.stock_movement_type, p_quantity numeric,
                                                 p_reason text default null, p_order_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_delta numeric; v_pool public.stock_pool := 'main'; v_bal numeric; v_id uuid;
begin
  if p_type in ('cutting_out','remnant_in') then raise exception 'USE_START_CUTTING'; end if;
  if p_type = 'adjustment' then
    if not public.has_role('pemilik') then raise exception 'FORBIDDEN'; end if;
  elsif not public.has_any_role(array['produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_quantity is null or p_quantity = 0 or (p_type <> 'adjustment' and p_quantity < 0) then raise exception 'INVALID_QUANTITY'; end if;

  perform 1 from public.materials where id = p_material_id and is_active for update;
  if not found then raise exception 'MATERIAL_NOT_FOUND'; end if;

  if p_type = 'purchase_in' then v_delta := p_quantity;
  elsif p_type = 'remnant_used' then
    if p_order_id is null then raise exception 'ORDER_REQUIRED'; end if;
    v_delta := -p_quantity; v_pool := 'remnant';
  else v_delta := p_quantity; end if;

  select coalesce(sum(quantity_delta), 0) into v_bal from public.stock_movements where material_id = p_material_id and pool = v_pool;
  if v_bal + v_delta < 0 then
    return jsonb_build_object('ok', false, 'code', case when v_pool = 'remnant' then 'REMNANT_INSUFFICIENT' else 'NEGATIVE_STOCK' end, 'balance', v_bal);
  end if;

  insert into public.stock_movements (material_id, pool, movement_type, quantity_delta, order_id, reason)
  values (p_material_id, v_pool, p_type, v_delta, p_order_id, nullif(trim(p_reason), '')) returning id into v_id;
  if v_delta > 0 and v_pool = 'main' then perform private.refresh_material_holds(array[p_material_id]); end if;
  return jsonb_build_object('ok', true, 'movement_id', v_id, 'balance', v_bal + v_delta);
end $$;

-- Mulai pemotongan: mewajibkan pemakaian aktual setiap bahan yang dicadangkan dan data sisa potongan.
create or replace function public.start_cutting(p_order_id uuid, p_usage jsonb, p_remnants jsonb default '[]'::jsonb,
                                                p_confirm_no_remnant boolean default false, p_allow_negative boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_o public.orders; v_rem jsonb := coalesce(p_remnants, '[]'::jsonb); v_missing jsonb; v_extra jsonb; v_short jsonb; v_over jsonb; r record;
begin
  if not public.has_any_role(array['produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_allow_negative and not public.has_role('pemilik') then raise exception 'FORBIDDEN'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_o.status <> 'spk_issued' then raise exception 'INVALID_TRANSITION:% -> cutting', v_o.status; end if;
  if v_o.on_hold then raise exception 'ORDER_ON_HOLD'; end if;
  if v_o.material_hold then return jsonb_build_object('ok', false, 'code', 'MATERIAL_HOLD', 'eta', v_o.material_hold_eta); end if;
  if p_usage is null or jsonb_typeof(p_usage) <> 'array' or jsonb_array_length(p_usage) = 0 or jsonb_typeof(v_rem) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'USAGE_REQUIRED');
  end if;
  if exists (select 1 from jsonb_to_recordset(p_usage) as u(material_id uuid, quantity numeric) where u.material_id is null or u.quantity is null or u.quantity < 0)
     or exists (select 1 from jsonb_to_recordset(v_rem) as m(material_id uuid, quantity numeric) where m.material_id is null or m.quantity is null or m.quantity <= 0) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_QUANTITY');
  end if;

  select jsonb_agg(jsonb_build_object('material_id', rs.material_id, 'material_name', mt.name)) into v_missing
    from public.stock_reservations rs join public.materials mt on mt.id = rs.material_id
   where rs.order_id = p_order_id and rs.status = 'active'
     and rs.material_id not in (select u.material_id from jsonb_to_recordset(p_usage) as u(material_id uuid, quantity numeric));
  if v_missing is not null then return jsonb_build_object('ok', false, 'code', 'USAGE_MISSING', 'missing', v_missing); end if;

  select jsonb_agg(distinct u.material_id) into v_extra from jsonb_to_recordset(p_usage) as u(material_id uuid, quantity numeric)
   where u.material_id not in (select material_id from public.stock_reservations where order_id = p_order_id and status = 'active');
  if v_extra is not null then return jsonb_build_object('ok', false, 'code', 'USAGE_NOT_RESERVED', 'materials', v_extra); end if;

  if not p_confirm_no_remnant and jsonb_array_length(v_rem) = 0 then return jsonb_build_object('ok', false, 'code', 'REMNANT_REQUIRED'); end if;
  select jsonb_agg(jsonb_build_object('material_id', m.material_id)) into v_over
    from (select material_id, sum(quantity) as quantity from jsonb_to_recordset(v_rem) as x(material_id uuid, quantity numeric) group by material_id) m
    left join (select material_id, sum(quantity) as quantity from jsonb_to_recordset(p_usage) as x(material_id uuid, quantity numeric) group by material_id) u
           on u.material_id = m.material_id
   where u.material_id is null or m.quantity > u.quantity;
  if v_over is not null then return jsonb_build_object('ok', false, 'code', 'REMNANT_EXCEEDS_USAGE', 'materials', v_over); end if;

  perform 1 from public.materials
   where id in (select u.material_id from jsonb_to_recordset(p_usage) as u(material_id uuid, quantity numeric)) order by id for update;
  select jsonb_agg(jsonb_build_object('material_id', u.material_id, 'material_name', mt.name, 'on_hand', b.bal, 'usage', u.quantity)) into v_short
    from (select material_id, sum(quantity) as quantity from jsonb_to_recordset(p_usage) as x(material_id uuid, quantity numeric) group by material_id) u
    join public.materials mt on mt.id = u.material_id
    cross join lateral (select coalesce(sum(s.quantity_delta), 0) as bal from public.stock_movements s
                         where s.material_id = u.material_id and s.pool = 'main') b
   where b.bal < u.quantity;
  if v_short is not null and not p_allow_negative then
    return jsonb_build_object('ok', false, 'code', 'STOCK_PHYSICAL_SHORT', 'shortages', v_short);
  end if;

  for r in select material_id, sum(quantity) as quantity from jsonb_to_recordset(p_usage) as x(material_id uuid, quantity numeric) group by material_id having sum(quantity) > 0 loop
    insert into public.stock_movements (material_id, pool, movement_type, quantity_delta, order_id, reason)
    values (r.material_id, 'main', 'cutting_out', -r.quantity, p_order_id, 'Pemakaian pemotongan');
  end loop;
  for r in select material_id, sum(quantity) as quantity from jsonb_to_recordset(v_rem) as x(material_id uuid, quantity numeric) group by material_id loop
    insert into public.stock_movements (material_id, pool, movement_type, quantity_delta, order_id, reason)
    values (r.material_id, 'remnant', 'remnant_in', r.quantity, p_order_id, 'Sisa potongan');
  end loop;
  update public.stock_reservations set status = 'consumed', closed_at = now(), expires_at = null
   where order_id = p_order_id and status = 'active';
  perform private.change_status(p_order_id, 'cutting');
  return jsonb_build_object('ok', true);
end $$;

-- Opname: selisih kecil (<= toleransi) langsung diterapkan; selisih besar menunggu persetujuan pemilik.
create or replace function public.submit_count(p_material_id uuid, p_pool public.stock_pool, p_counted numeric, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_sys numeric; v_var numeric; v_tol numeric; v_count uuid; v_status public.count_status; v_mv uuid;
begin
  if not public.has_any_role(array['produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_counted is null or p_counted < 0 then raise exception 'INVALID_QUANTITY'; end if;
  perform 1 from public.materials where id = p_material_id and is_active for update;
  if not found then raise exception 'MATERIAL_NOT_FOUND'; end if;
  select coalesce(sum(quantity_delta), 0) into v_sys from public.stock_movements where material_id = p_material_id and pool = p_pool;
  v_var := p_counted - v_sys;
  if v_var <> 0 and nullif(trim(p_reason), '') is null then raise exception 'REASON_REQUIRED'; end if;
  select abs(v_sys) * count_tolerance_pct / 100.0 into v_tol from public.studio_settings where id = 1;

  if v_var = 0 or abs(v_var) <= v_tol then
    v_status := 'applied';
    insert into public.stock_counts (material_id, pool, system_qty, counted_qty, variance, reason, status, decided_by, decided_at)
    values (p_material_id, p_pool, v_sys, p_counted, v_var, nullif(trim(p_reason), ''), v_status, (select auth.uid()), now()) returning id into v_count;
    if v_var <> 0 then
      insert into public.stock_movements (material_id, pool, movement_type, quantity_delta, reason)
      values (p_material_id, p_pool, 'adjustment', v_var, 'Opname: ' || trim(p_reason)) returning id into v_mv;
      if v_var > 0 and p_pool = 'main' then perform private.refresh_material_holds(array[p_material_id]); end if;
    end if;
  else
    v_status := 'pending_approval';
    insert into public.stock_counts (material_id, pool, system_qty, counted_qty, variance, reason, status)
    values (p_material_id, p_pool, v_sys, p_counted, v_var, trim(p_reason), v_status) returning id into v_count;
    insert into public.approvals (kind, reason, payload)
    values ('count_variance', trim(p_reason), jsonb_build_object('count_id', v_count));
  end if;
  return jsonb_build_object('ok', true, 'count_id', v_count, 'status', v_status, 'variance', v_var, 'system_qty', v_sys);
end $$;

create or replace function public.mark_materials_purchased(p_order_id uuid, p_at timestamptz default now()) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['admin','produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  update public.orders set material_purchased_at = coalesce(p_at, now())
   where id = p_order_id and status in ('accepted','dp_received','spk_issued') and not on_hold;
  if not found then raise exception 'INVALID_TRANSITION'; end if;
end $$;

-- Revisi setelah pemotongan dimulai: hanya ukuran, penerima, dan catatan ukuran pada baris yang sudah ada (jumlah tetap).
create or replace function public.request_late_revision(p_order_id uuid, p_changes jsonb, p_summary text, p_loss_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_status public.order_status; v_id uuid; c record;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_summary), '') is null or nullif(trim(p_loss_note), '') is null then raise exception 'REASON_REQUIRED'; end if;
  select status into v_status from public.orders where id = p_order_id;
  if v_status not in ('cutting','decorating','sewing','qc_packing') then raise exception 'INVALID_TRANSITION'; end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) = 0 then raise exception 'EMPTY_ORDER'; end if;
  for c in select * from jsonb_to_recordset(p_changes) as x(order_item_id uuid) loop
    if not exists (select 1 from public.order_items where id = c.order_item_id and order_id = p_order_id) then raise exception 'INVALID_ITEM'; end if;
  end loop;
  insert into public.approvals (kind, order_id, reason, payload)
  values ('late_revision', p_order_id, trim(p_summary), jsonb_build_object('changes', p_changes, 'loss_note', trim(p_loss_note)))
  returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'ALREADY_PENDING';
end $$;

create or replace function public.decide_approval(p_approval_id uuid, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.approvals; o public.orders; v_res jsonb; c record; v_ver integer; v_mv uuid; v_cnt public.stock_counts;
begin
  if not public.has_role('pemilik') then raise exception 'FORBIDDEN'; end if;
  select * into a from public.approvals where id = p_approval_id for update;
  if not found then raise exception 'APPROVAL_NOT_FOUND'; end if;
  if a.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;

  if p_approve then
    if a.kind = 'stock_override' then
      select * into o from public.orders where id = a.order_id for update;
      if o.status <> 'draft' then raise exception 'INVALID_TRANSITION'; end if;
      v_res := private.accept_core(o, true);
      if not (v_res->>'ok')::boolean then return v_res; end if;
      update public.orders set material_hold_eta = (a.payload->>'eta')::date where id = o.id and material_hold;
    elsif a.kind = 'count_variance' then
      select * into v_cnt from public.stock_counts where id = (a.payload->>'count_id')::uuid for update;
      perform 1 from public.materials where id = v_cnt.material_id for update;
      insert into public.stock_movements (material_id, pool, movement_type, quantity_delta, reason)
      values (v_cnt.material_id, v_cnt.pool, 'adjustment', v_cnt.counted_qty - (select coalesce(sum(quantity_delta),0) from public.stock_movements where material_id = v_cnt.material_id and pool = v_cnt.pool),
              'Opname disetujui: ' || coalesce(v_cnt.reason, ''));
      update public.stock_counts set status = 'applied', decided_by = (select auth.uid()), decided_at = now() where id = v_cnt.id;
      if v_cnt.pool = 'main' then perform private.refresh_material_holds(array[v_cnt.material_id]); end if;
    elsif a.kind = 'packing_exception' then
      update public.orders set packing_exception_ok = true where id = a.order_id;
    elsif a.kind = 'late_revision' then
      select * into o from public.orders where id = a.order_id for update;
      for c in select * from jsonb_to_recordset(a.payload->'changes') as x(order_item_id uuid, size text, recipient_label text, size_note text) loop
        update public.order_items
           set size = coalesce(c.size, size), recipient_label = coalesce(nullif(trim(c.recipient_label), ''), recipient_label),
               size_note = coalesce(nullif(trim(c.size_note), ''), size_note)
         where id = c.order_item_id and order_id = o.id;
      end loop;
      v_ver := o.current_version + 1;
      update public.orders set current_version = v_ver where id = o.id;
      insert into public.order_revisions (order_id, version, summary, snapshot)
      values (o.id, v_ver, 'Revisi setelah pemotongan: ' || a.reason || ' | Estimasi kerugian: ' || (a.payload->>'loss_note'), private.order_snapshot(o.id));
    end if;
    update public.approvals set status = 'approved', decided_by = (select auth.uid()), decided_at = now(), decision_note = p_note where id = a.id;
  else
    if a.kind = 'count_variance' then
      update public.stock_counts set status = 'rejected', decided_by = (select auth.uid()), decided_at = now() where id = (a.payload->>'count_id')::uuid;
    end if;
    update public.approvals set status = 'rejected', decided_by = (select auth.uid()), decided_at = now(), decision_note = p_note where id = a.id;
  end if;
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end);
end $$;
```

#### 9.3.10 `0010_functions_flow.sql`: Fungsi alur

```sql
-- Perpindahan status produksi yang tidak punya fungsi khusus.
create or replace function public.transition_status(p_order_id uuid, p_to public.order_status, p_reason text default null,
                                                    p_delay public.delay_reason default null, p_delay_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_to = 'spk_issued' then
    if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  elsif p_to in ('decorating','sewing','qc_packing') then
    if not public.has_any_role(array['produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  else
    raise exception 'USE_DEDICATED_FUNCTION';
  end if;
  perform private.change_status(p_order_id, p_to, p_reason, p_delay, p_delay_note);
end $$;

create or replace function public.rollback_status(p_order_id uuid, p_to public.order_status, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_from public.order_status;
begin
  if not public.has_role('pemilik') then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'REASON_REQUIRED'; end if;
  select status into v_from from public.orders where id = p_order_id;
  if not exists (select 1 from public.status_transitions where from_status = v_from and to_status = p_to and is_rollback) then
    raise exception 'INVALID_TRANSITION:% -> %', v_from, p_to;
  end if;
  perform private.change_status(p_order_id, p_to, 'Mundur: ' || trim(p_reason));
end $$;

create or replace function public.record_payment(p_order_id uuid, p_kind public.payment_kind, p_amount integer, p_bank text default null, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_status public.order_status; v_id uuid;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select status into v_status from public.orders where id = p_order_id;
  if p_kind = 'dp' and v_status is distinct from 'accepted' then raise exception 'INVALID_TRANSITION'; end if;
  if p_kind = 'final' and v_status not in ('qc_packing','awaiting_final_payment') then raise exception 'INVALID_TRANSITION'; end if;
  insert into public.payments (order_id, kind, amount, bank, note) values (p_order_id, p_kind, p_amount, p_bank, p_note) returning id into v_id;
  return v_id;
end $$;

-- Admin memvalidasi bukti terhadap mutasi bank, lalu menandai settled. DP settled penuh membuka SPK; pelunasan penuh membuka pengiriman.
create or replace function public.settle_payment(p_payment_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.payments; o public.orders; v_paid_kind integer; v_paid_all integer;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  select * into p from public.payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if p.status <> 'proof_received' then raise exception 'ALREADY_DECIDED'; end if;
  select * into o from public.orders where id = p.order_id for update;
  update public.payments set status = 'settled', settled_at = now(), validated_by = (select auth.uid()) where id = p.id;
  select coalesce(sum(amount), 0) into v_paid_kind from public.payments where order_id = o.id and kind = p.kind and status = 'settled';
  select coalesce(sum(amount), 0) into v_paid_all from public.payments where order_id = o.id and status = 'settled';
  if p.kind = 'dp' and o.status = 'accepted' and v_paid_kind >= o.dp_amount then
    perform private.change_status(o.id, 'dp_received');
    update public.stock_reservations set expires_at = null where order_id = o.id and status = 'active';
  elsif p.kind = 'final' and o.status = 'awaiting_final_payment' and v_paid_all >= o.agreed_total then
    perform private.change_status(o.id, 'ready_to_ship');
  end if;
  return jsonb_build_object('ok', true, 'paid_total', v_paid_all);
end $$;

create or replace function public.reject_payment(p_payment_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_note), '') is null then raise exception 'REASON_REQUIRED'; end if;
  update public.payments set status = 'rejected', note = coalesce(note || ' | ', '') || trim(p_note), validated_by = (select auth.uid())
   where id = p_payment_id and status = 'proof_received';
  if not found then raise exception 'ALREADY_DECIDED'; end if;
end $$;

-- ===== Pengemasan =====
create or replace function private.packing_lines(p_order_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('order_item_id', i.id, 'line_no', i.line_no, 'size', i.size,
           'recipient_label', i.recipient_label, 'ordered', i.quantity, 'packed', coalesce(pk.q, 0),
           'diff', coalesce(pk.q, 0) - i.quantity) order by i.line_no), '[]'::jsonb)
    from public.order_items i
    left join lateral (select sum(pi.quantity)::integer as q from public.package_items pi where pi.order_item_id = i.id) pk on true
   where i.order_id = p_order_id;
$$;

create or replace function public.save_package(p_order_id uuid, p_package_no integer, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_status public.order_status; v_pkg uuid; c record;
begin
  if not public.has_any_role(array['produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is distinct from 'qc_packing' then raise exception 'INVALID_TRANSITION'; end if;
  if p_package_no is null or p_package_no < 1 then raise exception 'INVALID_PACKAGE'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_PACKAGE'; end if;
  insert into public.packages (order_id, package_no) values (p_order_id, p_package_no)
  on conflict (order_id, package_no) do update set packed_by = (select auth.uid()), updated_at = now() returning id into v_pkg;
  delete from public.package_items where package_id = v_pkg;
  for c in select * from jsonb_to_recordset(p_items) as x(order_item_id uuid, quantity integer) loop
    if c.quantity is null or c.quantity <= 0 then raise exception 'INVALID_PACKAGE'; end if;
    if not exists (select 1 from public.order_items where id = c.order_item_id and order_id = p_order_id) then raise exception 'INVALID_ITEM'; end if;
    insert into public.package_items (package_id, order_item_id, quantity) values (v_pkg, c.order_item_id, c.quantity);
  end loop;
  return v_pkg;
end $$;

create or replace function public.verify_packing(p_order_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_lines jsonb;
begin
  if not public.has_any_role(array['admin','produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  v_lines := private.packing_lines(p_order_id);
  return jsonb_build_object('ok', not exists (select 1 from jsonb_array_elements(v_lines) l where (l->>'diff')::integer <> 0), 'lines', v_lines);
end $$;

-- Selesai hanya bila jumlah aktual per baris pesanan (ukuran, penerima) sama dengan pesanan. Ketidakcocokan dicatat dan dikembalikan sebagai hasil.
create or replace function public.complete_packing(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders; v_lines jsonb; v_bad jsonb; v_cfg public.studio_settings; v_paid integer; v_result public.packing_result;
begin
  if not public.has_any_role(array['produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status <> 'qc_packing' then raise exception 'INVALID_TRANSITION:% -> packing_done', o.status; end if;
  if o.on_hold then raise exception 'ORDER_ON_HOLD'; end if;
  select * into v_cfg from public.studio_settings where id = 1;
  if v_cfg.require_second_checker and exists (select 1 from public.packages where order_id = o.id and packed_by = (select auth.uid())) then
    return jsonb_build_object('ok', false, 'code', 'SECOND_CHECKER_REQUIRED');
  end if;
  v_lines := private.packing_lines(o.id);
  select coalesce(jsonb_agg(l), '[]'::jsonb) into v_bad from jsonb_array_elements(v_lines) l where (l->>'diff')::integer <> 0;
  if jsonb_array_length(v_bad) > 0 and not o.packing_exception_ok then
    insert into public.packing_checks (order_id, result, diffs) values (o.id, 'mismatch', v_bad);
    return jsonb_build_object('ok', false, 'code', 'PACKING_MISMATCH', 'lines', v_bad);
  end if;
  v_result := case when jsonb_array_length(v_bad) > 0 then 'exception' else 'match' end;
  insert into public.packing_checks (order_id, result, diffs) values (o.id, v_result, v_bad);
  update public.orders set packing_exception_ok = false where id = o.id;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id and status = 'settled';
  perform private.change_status(o.id, case when v_paid >= o.agreed_total then 'ready_to_ship' else 'awaiting_final_payment' end::public.order_status);
  return jsonb_build_object('ok', true, 'result', v_result);
end $$;

create or replace function public.request_packing_exception(p_order_id uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.has_any_role(array['admin','produksi','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'REASON_REQUIRED'; end if;
  if not exists (select 1 from public.orders where id = p_order_id and status = 'qc_packing') then raise exception 'INVALID_TRANSITION'; end if;
  insert into public.approvals (kind, order_id, reason) values ('packing_exception', p_order_id, trim(p_reason)) returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'ALREADY_PENDING';
end $$;

-- ===== Pengiriman dan penutupan =====
create or replace function public.ship_order(p_order_id uuid, p_method public.shipment_method, p_tracking text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders; v_paid integer;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status <> 'ready_to_ship' then raise exception 'INVALID_TRANSITION:% -> shipped', o.status; end if;
  if o.on_hold then raise exception 'ORDER_ON_HOLD'; end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id and status = 'settled';
  if v_paid < o.agreed_total then return jsonb_build_object('ok', false, 'code', 'PAYMENT_NOT_SETTLED', 'paid', v_paid, 'total', o.agreed_total); end if;
  insert into public.shipments (order_id, method, tracking_note, note) values (o.id, p_method, p_tracking, p_note);
  perform private.change_status(o.id, 'shipped');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.complete_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  perform private.change_status(p_order_id, 'completed');
  update public.shipments set delivered_at = now() where order_id = p_order_id;
end $$;

create or replace function public.cancel_order(p_order_id uuid, p_reason text, p_forfeit_dp boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'REASON_REQUIRED'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status in ('shipped','completed','cancelled') then raise exception 'INVALID_TRANSITION'; end if;
  if o.status in ('cutting','decorating','sewing','qc_packing','awaiting_final_payment','ready_to_ship') and not public.has_role('pemilik') then
    raise exception 'FORBIDDEN';
  end if;
  if p_forfeit_dp then
    if not public.has_role('pemilik') then raise exception 'FORBIDDEN'; end if;
    if o.material_purchased_at is null or not exists (select 1 from public.payments where order_id = o.id and kind = 'dp' and status = 'settled') then
      raise exception 'FORFEIT_NOT_ALLOWED';
    end if;
  end if;
  update public.stock_reservations set status = 'released', closed_at = now() where order_id = o.id and status = 'active';
  update public.orders set cancel_reason = trim(p_reason), dp_forfeited = coalesce(p_forfeit_dp, false) where id = o.id;
  perform private.change_status(o.id, 'cancelled', trim(p_reason));
end $$;

create or replace function public.set_hold(p_order_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['admin','pemilik']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'REASON_REQUIRED'; end if;
  update public.orders set on_hold = true, hold_reason = trim(p_reason) where id = p_order_id and status not in ('completed','cancelled');
  if not found then raise exception 'INVALID_TRANSITION'; end if;
end $$;

create or replace function public.release_hold(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('pemilik') then raise exception 'FORBIDDEN'; end if;
  update public.orders set on_hold = false, hold_reason = null where id = p_order_id;
end $$;

-- Dipanggil penjadwal (pg_cron) saja. Membatalkan pesanan yang belum menerima DP dan reservasinya kedaluwarsa.
create or replace function private.release_expired_reservations() returns integer
language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_n integer := 0;
begin
  for v_order in
    select o.id from public.orders o
     where o.status = 'accepted'
       and exists (select 1 from public.stock_reservations r where r.order_id = o.id and r.status = 'active' and r.expires_at < now())
     for update skip locked
  loop
    update public.stock_reservations set status = 'released', closed_at = now() where order_id = v_order and status = 'active';
    update public.orders set cancel_reason = 'Batas waktu DP terlewat (otomatis)' where id = v_order;
    perform private.change_status(v_order, 'cancelled', 'Batas waktu DP terlewat (otomatis)');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ===== Pengguna =====
create or replace function public.set_user_active(p_user_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('pemilik') then raise exception 'FORBIDDEN'; end if;
  if not p_active and p_user_id = (select auth.uid()) then raise exception 'CANNOT_DEACTIVATE_SELF'; end if;
  update public.profiles set is_active = p_active where id = p_user_id;
end $$;

create or replace function public.guard_last_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'pemilik' and not exists (
       select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
        where ur.role = 'pemilik' and p.is_active and ur.user_id <> old.user_id) then
    raise exception 'LAST_OWNER';
  end if;
  return old;
end $$;
create trigger trg_guard_last_owner before delete on public.user_roles for each row execute function public.guard_last_owner();
```

#### 9.3.11 `0011_views.sql`: View

```sql
-- Saldo stok per bahan dan kolam. View ini dipanggil lewat fungsi atau view lain yang sudah memfilter peran.
create or replace view public.v_stock_overview with (security_invoker = true) as
select m.id as material_id, m.name, m.kind, m.unit, m.min_stock, m.track_per_order, m.blocks_acceptance, m.is_active,
       coalesce(b.main_qty, 0)    as on_hand_main,
       coalesce(b.remnant_qty, 0) as on_hand_remnant,
       coalesce(r.reserved, 0)    as reserved,
       coalesce(b.main_qty, 0) - coalesce(r.reserved, 0) as available,
       (coalesce(b.main_qty, 0) - coalesce(r.reserved, 0)) < m.min_stock as is_low
  from public.materials m
  left join (select material_id,
                    sum(quantity_delta) filter (where pool = 'main')    as main_qty,
                    sum(quantity_delta) filter (where pool = 'remnant') as remnant_qty
               from public.stock_movements group by material_id) b on b.material_id = m.id
  left join (select material_id, sum(quantity) as reserved
               from public.stock_reservations where status = 'active' group by material_id) r on r.material_id = m.id;

-- Tampilan pesanan untuk produksi: tanpa harga, kontak, dan catatan internal. Sengaja berjalan dengan hak pemilik view
-- (security definer) dan difilter peran di dalamnya; peran produksi tidak punya akses ke tabel orders atau customers.
create or replace view public.v_orders_production with (security_invoker = false) as
select o.id, o.order_number, o.status, o.deadline, c.name as customer_name, o.production_notes,
       o.material_hold, o.material_hold_eta, o.on_hold, o.hold_reason, o.current_version,
       (select coalesce(sum(i.quantity), 0) from public.order_items i where i.order_id = o.id)::integer as total_pieces,
       o.updated_at
  from public.orders o join public.customers c on c.id = o.customer_id
 where public.has_any_role(array['admin','produksi','pemilik']::public.app_role[]);

-- Antrean produksi: pesanan yang sudah punya SPK sampai pengemasan, menurut tenggat.
create or replace view public.v_production_queue with (security_invoker = false) as
select * from public.v_orders_production
 where status in ('spk_issued','cutting','decorating','sewing','qc_packing')
 order by deadline, order_number;

create or replace view public.v_packing_errors_monthly with (security_invoker = true) as
select date_trunc('month', timezone('Asia/Jakarta', checked_at))::date as month,
       count(*) filter (where result = 'mismatch')  as mismatch_attempts,
       count(*) filter (where result = 'exception') as exceptions,
       count(*) filter (where result = 'match')     as clean_completions
  from public.packing_checks group by 1;

create or replace view public.v_stage_durations with (security_invoker = true) as
select l.order_id, l.stage, l.started_at, l.finished_at,
       extract(epoch from (l.finished_at - l.started_at)) / 3600.0 as hours, l.delay_reason, l.delay_note
  from public.production_stage_logs l where l.finished_at is not null;

create or replace view public.v_monthly_volume with (security_invoker = true) as
select date_trunc('month', timezone('Asia/Jakarta', o.created_at))::date as month,
       count(distinct o.id) as orders, sum(i.quantity)::integer as pieces
  from public.orders o join public.order_items i on i.order_id = o.id
 where o.status <> 'cancelled' group by 1;
```

#### 9.3.12 `0012_rls_grants.sql`: RLS dan grant

```sql
-- Prinsip: tidak ada akses anon. Penulisan data bisnis hanya lewat fungsi (security definer) yang memeriksa peran.
revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all functions in schema public from public, anon, authenticated;
-- Fungsi baru tidak boleh otomatis dapat dieksekusi oleh API. Beri grant eksplisit pada tiap migration.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
-- Tabel append-only: tidak ada peran API (termasuk service_role) yang boleh mengubah atau menghapus barisnya.
revoke update, delete, truncate on public.stock_movements, public.audit_logs, public.order_revisions,
  public.packing_checks, public.order_status_history from authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to authenticated, service_role;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ===== Baca =====
create policy sel_internal on public.profiles            for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_roles_own on public.user_roles          for select to authenticated using (user_id = (select auth.uid()) or (select public.has_role('pemilik')));
create policy sel_settings on public.studio_settings      for select to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy sel_cat on public.product_categories        for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_prod on public.products                 for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_specs on public.product_size_specs      for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_mat on public.materials                 for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_alt on public.material_alternatives     for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_rules on public.consumption_rules       for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_cust on public.customers                for select to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy sel_orders on public.orders                 for select to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy sel_items on public.order_items             for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_revs on public.order_revisions          for select to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy sel_hist on public.order_status_history     for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_files on public.design_files            for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_mv on public.stock_movements            for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_res on public.stock_reservations        for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_counts on public.stock_counts           for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_stage on public.production_stage_logs   for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_pkg on public.packages                  for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_pkgi on public.package_items            for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_pchk on public.packing_checks           for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_pay on public.payments                  for select to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy sel_ship on public.shipments                for select to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy sel_trans on public.status_transitions      for select to authenticated using ((select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy sel_appr on public.approvals                for select to authenticated using ((select public.has_role('pemilik')) or requested_by = (select auth.uid()));
create policy sel_audit on public.audit_logs              for select to authenticated using ((select public.has_role('pemilik')));

grant select on public.profiles, public.user_roles, public.studio_settings, public.product_categories, public.products,
  public.product_size_specs, public.materials, public.material_alternatives, public.consumption_rules, public.customers,
  public.orders, public.order_items, public.order_revisions, public.order_status_history, public.design_files,
  public.stock_movements, public.stock_reservations, public.stock_counts, public.production_stage_logs, public.packages,
  public.package_items, public.packing_checks, public.payments, public.shipments, public.status_transitions,
  public.approvals, public.audit_logs to authenticated;
grant select on public.v_stock_overview, public.v_orders_production, public.v_production_queue,
  public.v_packing_errors_monthly, public.v_stage_durations, public.v_monthly_volume to authenticated;

-- ===== Tulis langsung (selebihnya lewat fungsi) =====
-- Profil sendiri: hanya nama dan telepon. Mengaktifkan atau menonaktifkan pengguna lewat set_user_active.
create policy upd_profile_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant update (full_name, phone) on public.profiles to authenticated;

-- Peran pengguna dan master data: hanya pemilik.
create policy owner_roles_ins on public.user_roles for insert to authenticated with check ((select public.has_role('pemilik')));
create policy owner_roles_del on public.user_roles for delete to authenticated using ((select public.has_role('pemilik')));
grant insert, delete on public.user_roles to authenticated;

create policy owner_settings_upd on public.studio_settings for update to authenticated
  using ((select public.has_role('pemilik'))) with check ((select public.has_role('pemilik')));
grant update (studio_name, contact_whatsapp, address, bank_accounts, dp_percent, waste_percent, reservation_expiry_days,
              count_tolerance_pct, require_second_checker) on public.studio_settings to authenticated;

do $$
declare t text;
begin
  foreach t in array array['product_categories','products','product_size_specs','materials','material_alternatives','consumption_rules'] loop
    execute format('create policy owner_ins on public.%I for insert to authenticated with check ((select public.has_role(''pemilik'')))', t);
    execute format('create policy owner_upd on public.%I for update to authenticated using ((select public.has_role(''pemilik''))) with check ((select public.has_role(''pemilik'')))', t);
    execute format('create policy owner_del on public.%I for delete to authenticated using ((select public.has_role(''pemilik'')))', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Pelanggan dan berkas desain: admin dan pemilik.
create policy cust_ins on public.customers for insert to authenticated with check ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy cust_upd on public.customers for update to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[]))) with check ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
grant insert, update on public.customers to authenticated;
create policy files_ins on public.design_files for insert to authenticated with check ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy files_del on public.design_files for delete to authenticated using ((select public.has_any_role(array['admin','pemilik']::public.app_role[])));
grant insert, delete on public.design_files to authenticated;

-- ===== Fungsi yang boleh dipanggil dari aplikasi =====
grant execute on function
  public.has_any_role(public.app_role[]), public.has_role(public.app_role),
  public.create_draft_order(uuid, date, integer, text, text, text, jsonb),
  public.revise_order(uuid, integer, jsonb, date, integer, text, text),
  public.check_stock(uuid), public.preview_stock(jsonb, uuid), public.accept_order(uuid), public.request_override(uuid, text, date),
  public.record_movement(uuid, public.stock_movement_type, numeric, text, uuid),
  public.start_cutting(uuid, jsonb, jsonb, boolean, boolean),
  public.submit_count(uuid, public.stock_pool, numeric, text),
  public.mark_materials_purchased(uuid, timestamptz),
  public.request_late_revision(uuid, jsonb, text, text),
  public.decide_approval(uuid, boolean, text),
  public.transition_status(uuid, public.order_status, text, public.delay_reason, text),
  public.rollback_status(uuid, public.order_status, text),
  public.record_payment(uuid, public.payment_kind, integer, text, text),
  public.settle_payment(uuid), public.reject_payment(uuid, text),
  public.save_package(uuid, integer, jsonb), public.verify_packing(uuid), public.complete_packing(uuid),
  public.request_packing_exception(uuid, text),
  public.ship_order(uuid, public.shipment_method, text, text), public.complete_order(uuid),
  public.cancel_order(uuid, text, boolean), public.set_hold(uuid, text), public.release_hold(uuid),
  public.set_user_active(uuid, boolean)
to authenticated;
-- Fungsi pemicu dan penjadwal tidak dibuka: log_audit, handle_new_user, set_updated_at, validate_order_item, guard_last_owner.
```

#### 9.3.13 `0013_reference_data.sql`: Data referensi

```sql
insert into public.studio_settings (id) values (1) on conflict (id) do nothing;

insert into public.status_transitions (from_status, to_status, is_rollback) values
  ('draft','accepted',false), ('draft','cancelled',false),
  ('accepted','dp_received',false), ('accepted','cancelled',false),
  ('dp_received','spk_issued',false), ('dp_received','cancelled',false),
  ('spk_issued','cutting',false), ('spk_issued','cancelled',false),
  ('cutting','decorating',false), ('cutting','sewing',false), ('cutting','cancelled',false),
  ('decorating','sewing',false), ('decorating','cancelled',false),
  ('sewing','qc_packing',false), ('sewing','cancelled',false),
  ('qc_packing','awaiting_final_payment',false), ('qc_packing','ready_to_ship',false), ('qc_packing','cancelled',false),
  ('awaiting_final_payment','ready_to_ship',false), ('awaiting_final_payment','cancelled',false),
  ('ready_to_ship','shipped',false), ('shipped','completed',false),
  -- jalur mundur: hanya pemilik, dengan alasan (diatur di fungsi rollback_status)
  ('decorating','cutting',true),
  ('sewing','decorating',true), ('qc_packing','sewing',true), ('awaiting_final_payment','qc_packing',true),
  ('ready_to_ship','awaiting_final_payment',true)
on conflict do nothing;

-- Kategori awal. TODO(pemilik): daftar ukuran dan aturan personalisasi di bawah adalah nilai awal sementara.
insert into public.product_categories (name, slug, size_options, supports_personalization, sort_order) values
  ('Kaos Sablon',  'kaos-sablon',  array['S','M','L','XL','XXL','XXXL'], false, 1),
  ('Kemeja Korsa', 'kemeja-korsa', array['S','M','L','XL','XXL','XXXL'], false, 2),
  ('PDH',          'pdh',          array['S','M','L','XL','XXL','XXXL'], true,  3),
  ('PDL',          'pdl',          array['S','M','L','XL','XXL','XXXL'], true,  4)
on conflict (slug) do nothing;
```

#### 9.3.14 `0014_cron.sql`: Penjadwal (tidak diuji lokal)

```sql
-- Dijalankan di proyek Supabase (pg_cron tersedia di Database > Extensions). Tidak diuji pada PostgreSQL lokal.
create extension if not exists pg_cron;
select cron.schedule('release-expired-reservations', '*/30 * * * *', $$select private.release_expired_reservations();$$);
```


### 9.4 Migrasi 0015: bucket thumbnail (tidak diuji lokal)

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-thumbnails', 'design-thumbnails', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy thumb_select on storage.objects for select to authenticated
  using (bucket_id = 'design-thumbnails' and (select public.has_any_role(array['admin','produksi','pemilik']::public.app_role[])));
create policy thumb_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'design-thumbnails' and (select public.has_any_role(array['admin','pemilik']::public.app_role[])));
create policy thumb_delete on storage.objects for delete to authenticated
  using (bucket_id = 'design-thumbnails' and (select public.has_any_role(array['admin','pemilik']::public.app_role[])));
```

Uji di Supabase lokal atau DEV: admin dapat unggah, produksi hanya membaca, anon ditolak, file 3 MB ditolak.

### 9.5 `supabase/config.toml` (butir yang wajib diperiksa)

`[auth] enable_signup = false`; `minimum_password_length = 10`; `jwt_expiry` sesuai kebijakan sesi; `[auth.email] enable_confirmations = true`; `[api] schemas = ["public"]`. Setelan serupa di dashboard untuk DEV dan PRODUKSI.

### 9.6 Data contoh DEV (`supabase/seed.sql`)

Hanya fiktif, semua berawalan `CONTOH`: 3 pengguna (satu per peran), 2 pelanggan, 4 bahan (2 kain, 1 aksesori, 1 tinta), 3 produk (kaos, PDH, PDL) dengan spesifikasi kain per ukuran, contoh aturan konsumsi, stok awal. **Tidak ikut ke PRODUKSI.** Data nyata masuk lewat layar Master Data dan opname pertama (P11-03).

### 9.7 Tipe TypeScript

`npm run db:types` menjalankan `supabase gen types typescript --local > lib/supabase/types.ts` (atau `--project-id` untuk DEV). Berkas hasil di-commit.

---

## 10. KEAMANAN DAN HAK AKSES

### 10.1 Model

Tidak ada akses anonim. Semua tabel memakai RLS. Pengguna hanya dapat membaca sesuai peran dan menulis lewat fungsi yang memeriksa peran di dalamnya (`has_any_role`, memakai `auth.uid()`). Pengguna nonaktif atau tanpa peran ditolak semua fungsi.

### 10.2 Tulis langsung dari klien (satu-satunya)

| Tabel | Operasi | Siapa | Catatan |
|---|---|---|---|
| `profiles` | UPDATE `full_name`, `phone` | pemilik baris | aktivasi lewat `set_user_active` |
| `user_roles` | INSERT, DELETE | pemilik | pemilik terakhir dilindungi pemicu |
| `studio_settings` | UPDATE kolom pengaturan | pemilik | |
| `product_categories`, `products`, `product_size_specs`, `materials`, `material_alternatives`, `consumption_rules` | INSERT, UPDATE, DELETE | pemilik | |
| `customers` | INSERT, UPDATE | admin, pemilik | |
| `design_files` | INSERT, DELETE | admin, pemilik | |

Tabel lain tidak dapat ditulis langsung oleh peran aplikasi.

### 10.3 Baca (ringkas)

| Tabel | Admin | Produksi | Pemilik |
|---|---|---|---|
| `orders`, `customers`, `payments`, `shipments`, `order_revisions`, `studio_settings` | ya | **tidak** | ya |
| `order_items`, `order_status_history`, `design_files`, stok, reservasi, opname, tahap, paket, pemeriksaan | ya | ya | ya |
| `approvals` | milik sendiri | milik sendiri | semua |
| `audit_logs` | tidak | tidak | ya |
| `v_orders_production`, `v_production_queue` | ya | ya | ya |

### 10.4 View `security definer`

`v_orders_production` dan `v_production_queue` sengaja berjalan dengan hak pemilik view dan memfilter peran di dalamnya, karena produksi tidak punya akses ke tabel `orders` dan `customers`. Kolom: nomor, status, tenggat, nama pelanggan, catatan produksi, flag hold, jumlah potong. **Tidak ada** harga, DP, ringkasan chat, catatan internal, atau kontak. Linter keamanan Supabase akan memperingatkan view jenis ini; peringatan itu diterima dan dicatat di Lampiran D.

### 10.5 Pengerasan

1. Header: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` minimal, dan `Content-Security-Policy` yang mengizinkan hanya origin sendiri, Supabase, dan font.
2. Pembatasan percobaan login (pengaturan rate limit Auth) dan tampilan galat yang tidak membocorkan keberadaan akun.
3. Sesi berakhir otomatis setelah `SESSION_IDLE_MINUTES` tanpa aktivitas.
4. Kata sandi sementara untuk pengguna baru wajib diganti pada login pertama.
5. MFA (TOTP) disarankan untuk akun pemilik.
6. `npm audit --omit=dev` tanpa kerentanan tinggi atau kritis yang belum dicatat.
7. Tidak ada `console.log` data pelanggan atau kunci.

### 10.6 Uji hak akses wajib

Anon tidak dapat membaca tabel maupun memanggil fungsi; produksi tidak melihat `orders`, `customers`, `payments`, `audit_logs` dan tidak dapat memanggil fungsi admin; admin tidak dapat menulis `stock_movements` maupun memanggil `record_movement`, `decide_approval`, `set_user_active`; tidak ada peran yang dapat UPDATE atau DELETE tabel append-only; pengguna nonaktif atau tanpa peran ditolak; fungsi pemicu dan schema `private` tidak dapat dipanggil dari API (Lampiran F, T01 sampai T24).

---

## 11. LAYAR DAN KOMPONEN

Rute dalam grup `(app)` memerlukan sesi; peran yang tidak berhak diarahkan ke beranda perannya (admin → `/pesanan`, produksi → `/produksi`, pemilik → `/dasbor`).

| Rute | Peran | Tujuan | Data | Aksi (RPC) | Keadaan khusus |
|---|---|---|---|---|---|
| `/masuk` | tamu | Login | n/a | Auth | galat umum tanpa membocorkan akun |
| `/atur-sandi` | semua | Ganti sandi pertama | n/a | Auth | wajib setelah sandi sementara |
| `/pesanan` | admin, pemilik | Daftar pesanan menurut tenggat | `orders` + pelanggan | n/a | filter status, cari nomor atau nama, kartu di mobile |
| `/pesanan/baru` | admin, pemilik | Pesanan satu pintu | master data | `create_draft_order`, `preview_stock` | draf lokal, StockPanel langsung, mode matriks ukuran |
| `/pesanan/[id]` | admin, pemilik | Detail: ringkasan, item, stok, pembayaran, produksi, pengemasan, riwayat | `orders`, `order_items`, `payments`, `order_revisions`, `order_status_history` | `accept_order`, `request_override`, `record_payment`, `settle_payment`, `reject_payment`, `transition_status`, `cancel_order`, `set_hold`, `mark_materials_purchased`, `ship_order`, `complete_order` | badge hold, ETA bahan, hitung mundur reservasi |
| `/pesanan/[id]/ubah` | admin, pemilik | Revisi bernomor versi | item saat ini | `revise_order`, `request_late_revision` | konflik versi, terkunci setelah pemotongan |
| `/pesanan/[id]/spk` | admin, produksi, pemilik | SPK cetak | `v_orders_production`, `order_items` | n/a | hanya versi aktif, A4 |
| `/pesanan/[id]/invoice` | admin, pemilik | Invoice cetak | `orders`, `studio_settings` | n/a | memuat DP dan rekening |
| `/pesanan/[id]/rincian` | semua internal | Lembar rincian per paket (tanpa harga) | paket, item | n/a | cetak |
| `/produksi` | produksi, pemilik | Antrean menurut tenggat | `v_production_queue` | n/a | mobile-first, badge menunggu bahan |
| `/produksi/[id]` | produksi, pemilik | Aksi tahap: mulai pemotongan, pindah tahap | reservasi, item | `start_cutting`, `transition_status` | formulir pemakaian per bahan, alasan keterlambatan |
| `/stok` | semua internal | Ringkasan stok, menipis, riwayat | `v_stock_overview`, `stock_movements` | n/a | filter bahan, kolam main dan sisa |
| `/stok/catat` | produksi, pemilik | Catat stok masuk dan sisa terpakai | `materials` | `record_movement` | angka besar, konfirmasi |
| `/stok/opname` | produksi, pemilik | Opname mingguan | stok sistem | `submit_count` | selisih besar menunggu persetujuan |
| `/pengemasan/[id]` | produksi, pemilik | Pengemasan per baris pesanan | `package_items`, `order_items` | `save_package`, `verify_packing`, `complete_packing`, `request_packing_exception` | PackingMatrix, selisih langsung |
| `/persetujuan` | pemilik | Kotak persetujuan | `approvals` | `decide_approval` | override, revisi terlambat, opname, pengecualian |
| `/dasbor` | pemilik | Ringkasan | view | n/a | pesanan aktif, tenggat dekat, stok menipis, persetujuan, ketidakcocokan |
| `/laporan` | pemilik | Laporan dan ekspor CSV | view | n/a | `/api/ekspor/[nama]` |
| `/master/*` | pemilik (pelanggan: admin juga) | Master data dan pengaturan | tabel master | tulis langsung (§10.2), `set_user_active` | halaman Kesiapan Data |
| `/audit` | pemilik | Audit log | `audit_logs` | n/a | filter tabel, pelaku, waktu |
| `/api/health` | publik | Pemeriksaan hidup | n/a | n/a | tanpa data rahasia |

---

## 12. PESAN GALAT DAN ATURAN UX

1. Semua teks dari `lib/messages.ts`. Kode galat dipetakan di Lampiran A.
2. **Stok kurang** tampil sebagai tabel: bahan, butuh, tersedia, kurang (satuan jelas). Contoh: "American Drill Navy kurang 4,0 meter (butuh 14,0, tersedia 10,0)". Di bawahnya tiga tindakan: ganti bahan atau warna, ubah tenggat, ajukan override.
3. **Selisih pengemasan** tampil per baris: "L kurang 2", "XL lebih 2", atau untuk PDH personal "Budi (M) belum terkemas" dan "Sari (L) terkemas 2, dipesan 1". Fungsi `lib/domain/size-diff.ts` membuat teksnya dari `lines` hasil `verify_packing`.
4. Aksi merusak (batal, hanguskan DP, tolak) memakai dialog konfirmasi dengan alasan wajib.
5. Angka: uang `Rp1.500.000`, meter `14,5 m`, tanggal `4 Nov 2026`, jam WIB.
6. Layar produksi: satu tugas utama, tombol 48 px, tidak ada tabel lebar; isian jumlah memakai NumberStepper.
7. Setiap daftar punya keadaan kosong yang menyebut langkah berikutnya; setiap halaman punya skeleton dan keadaan galat.
8. Tidak ada kata teknis di UI ("RPC", "RLS", "transaksi"). Gunakan istilah usaha: "pemakaian kain", "sisa potongan", "uang muka".
9. Ukuran `KHUSUS` selalu menampilkan `size_note`.
10. Pemblokiran dijelaskan dengan alasan dan langkah, bukan hanya tombol nonaktif.

---

## 13. PENGUJIAN

### 13.1 Lapisan

SQL (aturan database): skenario Lampiran F dipindahkan ke `supabase/tests/` (pgTAP) dan `tests/sql/`. Unit (Vitest): format, pemeta galat, util item, size-diff, kontras. E2E (Playwright): alur utama per peran. Aksesibilitas (axe), kontras, proporsi warna. Performa dan konkurensi dengan skrip.

### 13.2 Uji penerimaan

| Uji | Skenario | Hasil yang diharapkan | Lapisan |
|---|---|---|---|
| U1 | Stok kain 10 m, pesanan butuh 14 m | Terima ditolak, kekurangan 4,0 tampil | SQL, E2E |
| U2 | Admin ajukan override; pemilik setujui | Diterima dengan `material_hold` dan ETA; tidak masuk antrean pemotongan | SQL, E2E |
| U3 | Dua pesanan butuh 6 m dari stok 10 m, juga paralel | Tepat satu diterima; 8 serentak pada stok 10 m dan 3 m per pesanan: tepat 3 diterima | SQL, skrip |
| U4 | Mulai Pemotongan tanpa pemakaian atau tanpa sisa | Ditolak (`USAGE_*`, `REMNANT_REQUIRED`) | SQL, E2E |
| U5 | Sisa potongan dicatat dan dipakai | Muncul di kolam sisa; pemakaian terkait pesanan | SQL |
| U6 | Revisi sebelum dan sesudah pemotongan | Versi naik; SPK hanya versi aktif; revisi terlambat menunggu pemilik; jumlah tetap | SQL, E2E |
| U7 | Pengemasan tepat dalam dua paket | Dapat diselesaikan | SQL, E2E |
| U8 | Aktual L 8 dan XL 2 untuk pesanan L 10 | Diblokir; "L kurang 2, XL lebih 2"; tercatat di `packing_checks` | SQL, E2E |
| U9 | DP dan pelunasan | Tanpa DP tidak ada SPK; tanpa pelunasan settled tidak siap kirim; waktu dan pelaku tercatat | SQL, E2E |
| U10 | Produksi membuka harga, kontak, pembayaran | Tidak dapat (0 baris atau ditolak) | SQL, E2E |
| U11 | Audit | Semua aksi U1 sampai U10 muncul di audit log | SQL |
| U12 | Opname | Selisih ≤ 2% langsung; lebih besar menunggu pemilik | SQL, E2E |
| U13 | PDH personal: 4 baris, salah satu tidak terkemas atau tertukar | Baris terkait ditandai; selesai hanya bila semua tepat | SQL, E2E |
| U14 | Ukuran `KHUSUS` tanpa `size_note` | Ditolak (`INVALID_ITEM:SIZE_NOTE`) | SQL |
| U15 | Ukuran tanpa spesifikasi kain | `CONSUMPTION_RULE_MISSING`, tidak diterima | SQL, E2E |
| U16 | Reservasi kedaluwarsa | Pesanan tanpa DP dibatalkan otomatis; reservasi dilepas | SQL |
| U17 | Pesanan ditahan | Tidak berpindah status; hanya pemilik melepas | SQL |
| U18 | Pemilik terakhir | Tidak dapat dihapus atau dinonaktifkan | SQL |
| U19 | Anon | Tidak dapat membaca atau memanggil apa pun | SQL |
| U20 | Draf lokal | Isian pulih setelah muat ulang atau koneksi putus | E2E |

### 13.3 Kebutuhan nonfungsional

| Kode | Kebutuhan | Cara ukur |
|---|---|---|
| NF1 | Pencarian riwayat pesanan < 5 detik pada 2.000 pesanan | seed 2.000 pesanan, `EXPLAIN ANALYZE`, waktu di UI |
| NF2 | Halaman pesanan < 5 detik di laptop kelas Core i3 | Lighthouse atau Playwright dengan CPU 4× lebih lambat dan jaringan 3G cepat |
| NF3 | Isian tidak hilang saat koneksi putus | E2E: putuskan jaringan, isi, muat ulang, pulihkan |
| NF4 | Keamanan akses | §10.5 |
| NF5 | Produksi tanpa harga dan kontak | U10 |
| NF6 | Cadangan dan pemulihan | uji pulih ke proyek kosong (P11-04) |
| NF7 | Kemudahan | satu karyawan baru mencatat stok dan pengemasan dengan panduan satu halaman; catat waktu dan hambatan |
| NF8 | Tampilan | G5: kontras, proporsi 20/40/40, axe, 360 px |

Angka adalah target awal. Laporan menuliskan hasil ukur sebenarnya atau "belum diuji".

### 13.4 Data uji

2.000 pesanan sintetis (berlabel CONTOH) untuk NF1; skenario PDH dengan 4 baris personal; skenario kaos massal 14 × S; 8 pesanan serentak untuk konkurensi.

---

## 14. DEPLOYMENT, CADANGAN, DAN SERAH TERIMA

### 14.1 Lingkungan

| Lingkungan | Tujuan | Data |
|---|---|---|
| Lokal | pengembangan (Supabase lokal atau PostgreSQL 16 dengan stub) | seed fiktif |
| DEV (Supabase) | integrasi dan uji | seed fiktif |
| PRODUKSI (Supabase) | dipakai studio | data nyata saja |

### 14.2 Paket Supabase

Pengembangan: paket gratis. Pemakaian harian studio: paket Pro (cadangan harian bawaan, proyek tidak dijeda) atau paket gratis dengan syarat: ada aktivitas harian, ekspor cadangan mingguan ke penyimpanan di luar Supabase, dan uji pemulihan. Harga dan batas dicek ulang di halaman resmi Supabase sebelum keputusan (P11-01).

### 14.3 Cadangan

`npm run backup` menjalankan `supabase db dump` (skema dan data) ke berkas bertanggal dan menyimpannya di luar Supabase; jadwal mingguan; simpan 8 minggu terakhir. **Uji pemulihan** ke proyek kosong sebelum go-live dan tiap kuartal. Catat hasilnya di RUNBOOK.

### 14.4 Penjadwal

`pg_cron` menjalankan `private.release_expired_reservations()` tiap 30 menit. Aktifkan ekstensi lewat dashboard sesuai dokumentasi Supabase terbaru, lalu jalankan migrasi 0014. Verifikasi: tabel `cron.job` memuat tugas, dan pesanan uji kedaluwarsa terbatalkan.

### 14.5 Hosting aplikasi

Vercel atau Cloudflare Pages (`TODO(pemilik)` memilih; periksa syarat penggunaan untuk keperluan usaha). Variabel lingkungan §3.5; redirect URL Auth; SMTP untuk email sandi; domain atau subdomain bawaan.

### 14.6 Data awal PRODUKSI

Bukan seed contoh. Urutan: pemilik pertama (bootstrap) → pengguna admin dan produksi → master data (kategori, produk, kebutuhan kain per ukuran, bahan, batas minimum, rekening, pengaturan) → **opname pertama** sebagai stok awal.

### 14.7 Jalan paralel dan evaluasi

Dua minggu: pesanan dicatat di sistem dan di buku lama. Perbandingan jumlah pesanan dan hasil opname menjadi dasar berhenti memakai buku. Satu bulan setelah go-live: ukur indikator terhadap baseline wawancara (penyalinan 1 sampai 2 jam per hari; selisih stok kain 3 sampai 4 per bulan; keluhan salah ukuran 1 sampai 2 per bulan; kesalahan produksi 1 sampai 2 per bulan) tanpa menjanjikan persentase.

### 14.8 Dokumen serah terima

`docs/RUNBOOK.md` (sistem tidak dapat dibuka, lupa kata sandi, stok tidak cocok, proyek dijeda, pemulihan cadangan), `docs/PANDUAN_ADMIN.md` dan `docs/PANDUAN_PRODUKSI.md` (masing-masing satu halaman), formulir serah terima akses.

---

## 15. DAFTAR TASK

Ukuran: S, M, L (§0.5). "Bergantung" menyebut task yang harus selesai lebih dulu. Centang hanya bila **semua** butir "Selesai jika" terpenuhi dan gate lulus. Task bertanda [PEMILIK] dikerjakan pemilik; agent memverifikasi.

### Fase 0. Audit dan Fondasi

- [x] **P0-01 Audit lingkungan** (ukuran S; bergantung: n/a)
  - Kerjakan:
    - Isi tabel §3.1 kolom 'Nilai terverifikasi' dari fakta nyata: `node -v`, `npm -v`, `git --version`, ada atau tidaknya Docker, sistem operasi, shell, isi `package.json` bila ada.
    - Cek apakah folder aplikasi sudah ada. Catat: Next.js terpasang atau belum, ada `src/` atau tidak, Tailwind ada atau tidak, lokasi `.git`.
    - Catat selisih dengan asumsi plan di Lampiran D. Jangan mengubah kode dan jangan memasang paket.
  - Selesai jika:
    - Tidak ada baris §3.1 yang masih bertuliskan '(isi)'.
    - Selisih dengan asumsi plan tercatat di Lampiran D.
    - `git status` hanya menunjukkan perubahan pada dokumen plan.

- [x] **P0-02 Inisialisasi proyek** (ukuran M; bergantung: P0-01)
  - Kerjakan:
    - Bila belum ada: `npx create-next-app@16` dengan TypeScript, Tailwind, ESLint, App Router, tanpa `src/`, alias `@/*`. Bila sudah ada, sesuaikan dengan struktur §3.3 tanpa membuang kode.
    - Buat struktur folder §3.3 (folder kosong diberi `.gitkeep`). Pindahkan plan ke `docs/PROJECT_PLAN.md`. Perbarui `AGENTS.md` berisi ringkasan §0.2, peta dokumen, dan perintah sambil mempertahankan blok pointer `<!-- antislop:start -->` sampai `<!-- antislop:end -->` serta folder `.agents/skills/`.
    - Aktifkan `strict` di `tsconfig.json` (pertahankan pengecualian `anti-slop` dan `.agents` di `exclude`). Tambahkan skrip npm §3.4 (yang belum bisa dijalankan diberi pesan 'belum tersedia').
  - Selesai jika:
    - `npm run dev` menampilkan halaman awal.
    - Struktur folder sesuai §3.3.
    - `AGENTS.md` (termasuk blok pointer `antislop`), `.agents/skills/`, dan `docs/PROJECT_PLAN.md` ada.

- [x] **P0-03 Lint, tipe, uji, dan CI** (ukuran M; bergantung: P0-02)
  - Kerjakan:
    - Pasang Prettier, konfigurasi ESLint (pertahankan pengecualian `anti-slop/**` dan `.agents/**` di `globalIgnores`), Vitest dengan satu uji contoh, dan struktur `tests/unit`.
    - Buat GitHub Actions: `lint`, `typecheck`, `test` pada setiap push dan pull request (G1).
    - Tambahkan `.gitignore` untuk `.env*` (kecuali `.env.example`), `.next`, `node_modules`, `tests/e2e/__shots__`, dan `anti-slop/` (karena membawa `.git` sendiri; skill aktif tetap di `.agents/skills/`).
  - Selesai jika:
    - G1 hijau lokal.
    - Alur CI berjalan hijau pada commit awal.

- [x] **P0-04 Lingkungan dan env** (ukuran S; bergantung: P0-02)
  - Kerjakan:
    - Buat `.env.example` berisi semua variabel §3.5 dengan komentar, tanpa nilai nyata.
    - Buat `lib/env.ts`: skema Zod untuk variabel publik dan variabel server; impor variabel server di kode klien harus gagal saat build (`server-only`).
    - Uji unit: env tidak lengkap menghasilkan galat yang jelas.
  - Selesai jika:
    - `.env.example` lengkap.
    - Uji `lib/env.ts` lulus.
    - `grep -r SUPABASE_SECRET_KEY` hanya menemukan `.env.example`, `lib/env.ts`, dan kode server.

- [x] **P0-05 Halaman dasar dan kesehatan** (ukuran S; bergantung: P0-02)
  - Kerjakan:
    - Buat `app/api/health/route.ts` (status ok, waktu; tanpa data rahasia), `app/not-found.tsx`, `app/error.tsx` dengan teks Indonesia yang ramah.
    - Atur `lang="id"`, judul dan deskripsi, `robots: noindex` pada seluruh situs (aplikasi internal).
  - Selesai jika:
    - `/api/health` mengembalikan JSON ok.
    - Rute sembarang menampilkan 404 ramah.
    - Seluruh halaman bermeta `noindex`.

- [x] **P0-06 Utilitas format dan pesan** (ukuran M; bergantung: P0-03)
  - Kerjakan:
    - `lib/format.ts`: `rupiah(n)` → `Rp1.500.000`, `meter(n)` → `14,5 m`, tanggal dan jam WIB, angka desimal koma, parser angka Indonesia.
    - `lib/messages.ts`: struktur pesan Indonesia (kosong dulu, diisi bertahap). `lib/errors.ts`: `AppErrorCode`, `mapDbError(message|code, detail?)` memakai tabel Lampiran A.
    - Uji unit untuk format dan pemeta galat (setiap kode di Lampiran A punya pesan).
  - Selesai jika:
    - Uji format lulus (pembulatan, ribuan, desimal koma).
    - Setiap kode Lampiran A terpetakan; kode tak dikenal menghasilkan pesan umum.
    - G1 hijau.

### Fase 1. Design System

- [ ] **P1-01 Token warna dan tipografi** (ukuran M; bergantung: P0-02)
  - Kerjakan:
    - Salin token §7.3 ke `app/globals.css` (`@theme`). Pasang font Plus Jakarta Sans lewat `next/font/google`.
    - Buat halaman sementara `/dev/tokens` (hanya di lingkungan non-produksi) yang menampilkan palet, skala tipografi, dan kontras; dihapus di P1-05.
    - Pastikan tidak ada warna heksa di luar token pada komponen (aturan ESLint atau pemeriksaan grep sederhana).
  - Selesai jika:
    - Palet dan tipografi tampil di `/dev/tokens` pada 360 px dan 1366 px.
    - Tidak ada warna heksa liar di `components/` dan `app/` selain `globals.css`.

- [ ] **P1-02 Skrip kontras dan proporsi warna** (ukuran M; bergantung: P1-01)
  - Kerjakan:
    - Salin `scripts/check-contrast.mjs` dan `scripts/check-color-share.mjs` dari Lampiran F. Daftarkan sebagai `check:contrast` dan `check:color-share`.
    - Tambahkan uji unit untuk fungsi `classify`, `shareOfPng`, dan `verdict` dengan gambar sintetis (komposisi ideal lulus, komposisi salah gagal, netral dan status diabaikan).
    - Tambahkan `tests/unit/color-tokens.test.ts` yang memastikan token di `globals.css` sama dengan `TOKENS` di skrip.
  - Selesai jika:
    - `npm run check:contrast` lulus semua pasangan.
    - Uji sintetis: ideal 40/40/20 lulus; dominan orchid gagal.
    - Token CSS dan token skrip sinkron.

- [ ] **P1-03 Komponen dasar** (ukuran L; bergantung: P1-01)
  - Kerjakan:
    - Bangun komponen §7.8 tingkat dasar: Button (varian utama, aksen, sekunder, bahaya, ikon; keadaan loading), Field (teks, angka, tanggal, pilih, area teks), Badge, Card, Dialog, Toast, Skeleton, EmptyState, ErrorState.
    - Aturan: tinggi kontrol 48 px di mobile; fokus kontur 2 px `violet-700`; label selalu tampak; teks putih hanya di atas 600 atau lebih gelap.
    - Halaman sementara `/dev/komponen` menampilkan semua varian dan keadaan.
  - Selesai jika:
    - Semua varian tampil dan dapat dioperasikan keyboard.
    - G5 bagian kontras lulus.
    - Tidak ada teks putih di atas fill 500.

- [ ] **P1-04 Komponen data** (ukuran L; bergantung: P1-03)
  - Kerjakan:
    - DataTable (tabel di desktop, kartu di mobile, kolom prioritas, urut, filter, keadaan kosong), StatusBadge (peta §7.10), NumberStepper, StatCard.
    - SizeMatrix (ukuran × dipesan, terkemas, selisih; baris personal menampilkan `recipient_label`) dan StockPanel (bahan, butuh, tersedia, kurang). Terima data statis dulu.
    - Uji komponen untuk pemformatan selisih dan kondisi kekurangan.
  - Selesai jika:
    - Komponen tampil benar di 360 px dan 1366 px dengan data contoh.
    - Selisih dan kekurangan berwarna sesuai §7.10, dan ada teks selain warna.

- [ ] **P1-05 Shell aplikasi per peran** (ukuran L; bergantung: P1-04)
  - Kerjakan:
    - Layout `(app)`: top bar `violet-500`, sidebar `steel-500` (desktop) dan bottom-nav (mobile), navigasi menurut peran (admin: Pesanan, Stok, Pelanggan; produksi: Antrean, Stok, Opname; pemilik: Dasbor, Pesanan, Persetujuan, Laporan, Master).
    - Halaman placeholder tiap rute §11 dengan data contoh statis dan skeleton. Hapus `/dev/tokens` dan `/dev/komponen`.
    - Ambil tangkapan layar lima layar (§7.12) pada dua ukuran dan jalankan `check:color-share`; atur pemakaian warna sampai lulus.
  - Selesai jika:
    - Navigasi berbeda per peran (dengan peran palsu sementara).
    - `check:color-share` rata-rata dalam ±10 poin dari 40/40/20; hasil dilaporkan.
    - Tidak ada rute `/dev/*` tersisa.

- [ ] **P1-06 Kerangka cetak** (ukuran S; bergantung: P1-03)
  - Kerjakan:
    - Komponen PrintSheet (A4, margin, kop studio dari pengaturan, nomor halaman) dan CSS print yang menyembunyikan navigasi.
    - Halaman contoh `/dev/cetak` untuk memeriksa hasil Cetak ke PDF; hapus setelah SPK (P7-01) selesai.
  - Selesai jika:
    - Cetak ke PDF A4 tidak memuat navigasi atau bayangan.
    - Kop studio terbaca; tabel tidak terpotong di tengah baris.

### Fase 2. Database dan Keamanan

- [ ] **P2-00 [PEMILIK] Project Supabase DEV** (ukuran S; bergantung: P0-04)
  - Kerjakan:
    - Dikerjakan pemilik (LANGKAH PEMILIK 1 di prompting-struktur). Agent hanya memverifikasi tanpa mencetak secret.
  - Selesai jika:
    - `.env.local` ada dan tiga variabel Supabase terisi (cek terisi atau kosong saja).
    - `npx supabase projects list` menampilkan project ter-link.
    - Pendaftaran mandiri dimatikan di dashboard.

- [ ] **P2-01 Init Supabase CLI** (ukuran S; bergantung: P2-00)
  - Kerjakan:
    - `npx supabase init`; atur `config.toml` sesuai §9.5; folder `migrations`, `tests`, `seed.sql`.
    - Skrip `db:reset`, `db:test`, `db:test:pg`, `db:types`, `db:push`. Salin stub dan skrip uji dari Lampiran F ke `tests/sql/` untuk jalur `db:test:pg`.
  - Selesai jika:
    - `supabase/config.toml` ada dan `enable_signup = false`.
    - `npm run db:test:pg` berjalan (walau belum ada migrasi) atau memberi pesan jelas bila PostgreSQL 16 tidak tersedia.

- [ ] **P2-02 Migrasi 0001 dan 0002** (ukuran M; bergantung: P2-01)
  - Kerjakan:
    - Salin SQL §9.3 berkas 0001 dan 0002 persis ke `supabase/migrations/`.
    - Jalankan di lokal; pastikan trigger pengguna baru membuat profil.
  - Selesai jika:
    - Migrasi 0001 dan 0002 berjalan tanpa galat.
    - Tabel `profiles`, `user_roles`, `studio_settings` ada dan fungsi `has_role` dapat dipanggil.

- [ ] **P2-03 Migrasi 0003 dan 0004** (ukuran M; bergantung: P2-02)
  - Kerjakan:
    - Salin 0003 (master data) dan 0004 (pesanan, item, revisi, riwayat, berkas desain).
    - Periksa pemicu `validate_order_item`: produk aktif, ukuran valid, personalisasi hanya kategori yang mendukung, kain berjenis fabric.
  - Selesai jika:
    - Semua tabel §9 ada.
    - Pesanan dengan ukuran di luar daftar atau personalisasi pada kaos ditolak oleh pemicu.

- [ ] **P2-04 Migrasi 0005 sampai 0007** (ukuran M; bergantung: P2-03)
  - Kerjakan:
    - Salin 0005 (stok), 0006 (produksi, paket, pembayaran, pengiriman), 0007 (persetujuan, audit).
    - Periksa constraint tanda pergerakan stok dan indeks unik reservasi aktif.
  - Selesai jika:
    - Pergerakan `purchase_in` negatif ditolak; `cutting_out` tanpa pesanan ditolak.
    - Dua reservasi aktif untuk pasangan (pesanan, bahan) yang sama ditolak.

- [ ] **P2-05 Migrasi 0008 (fungsi inti)** (ukuran L; bergantung: P2-04)
  - Kerjakan:
    - Salin 0008: `next_order_number`, `compute_needs`, `missing_specs`, `material_available`, `change_status`, `accept_core`, `create_draft_order`, `revise_order`, `check_stock`, `preview_stock`, `accept_order`, `request_override`.
    - Muat bersama 0013 (transisi status) agar `change_status` dapat diuji.
  - Selesai jika:
    - Pesanan draf terbuat dengan nomor `DS-YYMM-0001`.
    - `accept_order` menolak stok kurang (kekurangan 4 pada stok 10 dan butuh 14).
    - `preview_stock` bekerja untuk formulir yang belum disimpan.

- [ ] **P2-06 Migrasi 0009 (stok dan persetujuan)** (ukuran L; bergantung: P2-05)
  - Kerjakan:
    - Salin 0009: `refresh_material_holds`, `record_movement`, `start_cutting`, `submit_count`, `mark_materials_purchased`, `request_late_revision`, `decide_approval`.
  - Selesai jika:
    - `start_cutting` menolak pemakaian atau sisa yang kosong; sukses mengubah stok dan reservasi.
    - Opname besar menunggu persetujuan; keputusan pemilik menerapkan penyesuaian.

- [ ] **P2-07 Migrasi 0010 (alur)** (ukuran L; bergantung: P2-06)
  - Kerjakan:
    - Salin 0010: `transition_status`, `rollback_status`, pembayaran, pengemasan, pengiriman, pembatalan, hold, `release_expired_reservations`, pengguna, pelindung pemilik terakhir.
  - Selesai jika:
    - Alur penuh dari draf sampai selesai berjalan lewat fungsi.
    - Pengemasan salah mengembalikan `PACKING_MISMATCH` dan tetap menyimpan satu catatan.

- [ ] **P2-08 Migrasi 0011 sampai 0015** (ukuran L; bergantung: P2-07)
  - Kerjakan:
    - Salin 0011 (view), 0012 (RLS dan grant), 0013 (referensi), 0014 (cron), 0015 (storage).
    - 0014 dan 0015 hanya dijalankan di Supabase (bukan stub). Aktifkan ekstensi pg_cron sesuai dokumentasi Supabase terbaru.
  - Selesai jika:
    - RLS aktif di seluruh tabel public (query pemeriksaan dilampirkan).
    - Anon tidak dapat mengeksekusi fungsi public mana pun.
    - Bucket `design-thumbnails` privat dan kebijakannya aktif di DEV.

- [ ] **P2-09 Uji SQL (port Lampiran F)** (ukuran L; bergantung: P2-08)
  - Kerjakan:
    - Pindahkan skenario T01 sampai T24 di Lampiran F menjadi uji pgTAP di `supabase/tests/` (atau pertahankan skrip `t.ok` di `tests/sql/` untuk `db:test:pg`). Pertahankan nama assertion.
    - Jalankan G3. Laporkan jumlah assertion lulus.
  - Selesai jika:
    - 119 assertion (atau setara pgTAP) lulus.
    - Skrip konkurensi (8 penerimaan serentak) lulus: tepat 3 diterima.

- [ ] **P2-10 Tipe dan pembungkus RPC** (ukuran M; bergantung: P2-08)
  - Kerjakan:
    - `npm run db:types`; buat `lib/supabase/types.ts`. Implementasikan `lib/rpc.ts` (§8.2) dan lengkapi `mapDbError` dengan seluruh kode Lampiran A.
    - Uji unit: hasil `ok:false` dengan `detail` diteruskan; exception diubah menjadi pesan.
  - Selesai jika:
    - `callRpc` bertipe untuk semua fungsi Lampiran B.
    - Uji pemeta galat lulus untuk semua kode.

- [ ] **P2-11 Konkurensi dan kedaluwarsa di DEV** (ukuran M; bergantung: P2-09)
  - Kerjakan:
    - Skrip Node (`tests/sql/concurrency.mjs`) yang memanggil `accept_order` paralel terhadap DEV dengan akun uji; verifikasi hasil dan total reservasi.
    - Uji manual pelepasan reservasi: set `expires_at` lampau pada pesanan uji, jalankan fungsi atau tunggu cron, verifikasi pembatalan.
  - Selesai jika:
    - 8 permintaan serentak pada stok 10 m dan 3 m per pesanan: tepat 3 diterima, reservasi 9 m.
    - Pesanan tanpa DP yang kedaluwarsa dibatalkan otomatis dan reservasinya dilepas.

### Fase 3. Autentikasi dan Pengguna

- [ ] **P3-01 Klien Supabase dan penjaga sesi** (ukuran M; bergantung: P2-10)
  - Kerjakan:
    - `lib/supabase/server.ts`, `browser.ts`, `proxy.ts` (paket `@supabase/ssr`); `proxy.ts` menyegarkan sesi dan mengarahkan tamu ke `/masuk`. `lib/auth/roles.ts`: `getSessionUser()`, `requireRole(roles)`.
    - `lib/supabase/admin.ts` (`server-only`, kunci service role) hanya diimpor oleh action pembuatan pengguna (P3-04).
  - Selesai jika:
    - Tamu yang membuka rute `(app)` diarahkan ke `/masuk`.
    - `requireRole` menolak peran yang tidak sesuai.
    - Pemeriksaan bundel klien tidak menemukan `service_role`.

- [ ] **P3-02 Login dan sandi** (ukuran M; bergantung: P3-01)
  - Kerjakan:
    - Halaman `/masuk` (email, sandi), `/atur-sandi` (wajib setelah sandi sementara), `/lupa-sandi`, keluar. Galat umum tanpa membocorkan akun. Batas waktu sesi menurut `SESSION_IDLE_MINUTES`.
    - Uji E2E: login berhasil, sandi salah, sesi berakhir, pengguna nonaktif ditolak.
  - Selesai jika:
    - Login dan keluar bekerja untuk tiga peran.
    - Galat login tidak membedakan 'akun tidak ada' dan 'sandi salah'.

- [ ] **P3-03 [PEMILIK] Akun pemilik pertama** (ukuran S; bergantung: P3-02)
  - Kerjakan:
    - Dikerjakan pemilik (LANGKAH PEMILIK 2). Agent membuat `scripts/bootstrap-owner.sql` dan memverifikasi bahwa tepat satu pemilik aktif ada.
  - Selesai jika:
    - Pemilik dapat login dan melihat menu pemilik.
    - Skrip bootstrap tidak memuat kata sandi atau email nyata.

- [ ] **P3-04 Manajemen pengguna** (ukuran L; bergantung: P3-03)
  - Kerjakan:
    - Halaman `/master/pengguna` (pemilik): buat pengguna (server action memakai admin client, kata sandi sementara acak), beri atau cabut peran (peran jamak), aktif atau nonaktif lewat `set_user_active`, reset sandi sementara.
    - Tampilkan galat `LAST_OWNER` dan `CANNOT_DEACTIVATE_SELF` dengan pesan Indonesia.
  - Selesai jika:
    - Pemilik membuat admin dan produksi; admin yang diberi peran produksi dapat membuka layar produksi.
    - Pemilik terakhir tidak dapat dihapus atau dinonaktifkan.

- [ ] **P3-05 Profil dan uji izin UI** (ukuran M; bergantung: P3-04)
  - Kerjakan:
    - Halaman profil (nama, telepon, ganti sandi). Uji E2E matriks rute per peran: setiap rute §11 diakses oleh tiga peran dan satu tamu; hasil sesuai tabel.
  - Selesai jika:
    - Matriks rute per peran lulus.
    - Produksi tidak dapat membuka rute admin dan pemilik.

### Fase 4. Master Data

- [ ] **P4-01 Pengaturan studio** (ukuran M; bergantung: P3-05)
  - Kerjakan:
    - Halaman `/master/pengaturan` (pemilik): nama studio, WhatsApp, alamat, rekening (BCA dan Mandiri: bank, nomor, atas nama), persen DP, persen buangan kain, hari kedaluwarsa reservasi, toleransi opname, pemeriksa kedua.
    - Validasi Zod sesuai constraint tabel (`dp_percent` 1 sampai 100, `waste_percent` 0 sampai 50). Nilai awal ditandai 'default, belum dikonfirmasi pemilik'.
  - Selesai jika:
    - Perubahan tersimpan dan tercatat di audit log.
    - Nilai di luar batas ditolak di form dan di database.

- [ ] **P4-02 Kategori dan ukuran** (ukuran M; bergantung: P4-01)
  - Kerjakan:
    - Halaman `/master/kategori`: daftar kategori (Kaos Sablon, Kemeja Korsa, PDH, PDL), ukuran baku (`size_options`), personalisasi (`supports_personalization`), aktif atau tidak, urutan.
    - Penyunting ukuran sebagai daftar yang dapat diurutkan; ukuran `KHUSUS` dijelaskan sebagai opsi otomatis bila produk punya spesifikasinya.
  - Selesai jika:
    - Pemilik mengubah ukuran dan personalisasi PDH.
    - Kaos tetap menolak `recipient_label`.

- [ ] **P4-03 Produk dan kebutuhan kain per ukuran** (ukuran L; bergantung: P4-02)
  - Kerjakan:
    - Halaman `/master/produk`: produk milik kategori, catatan teknik, aktif. Editor matriks kebutuhan kain per ukuran (`product_size_specs`) dengan satuan meter; baris `KHUSUS` opsional.
    - Peringatan bila ukuran baku sebuah produk belum punya spesifikasi kain.
  - Selesai jika:
    - Pemilik menambah produk PDH dengan spesifikasi S sampai XXXL dan KHUSUS.
    - Produk dengan ukuran tanpa spesifikasi tampil di daftar 'belum siap'.

- [ ] **P4-04 Bahan, pengganti, dan konsumsi** (ukuran L; bergantung: P4-03)
  - Kerjakan:
    - Halaman `/master/bahan`: nama, jenis, satuan, batas minimum, `track_per_order`, `blocks_acceptance`, aktif. Bahan pengganti (pasangan bahan) dan aturan konsumsi non-kain per produk (mis. kancing 7 per PDH).
    - Penjelasan singkat di UI tentang arti `track_per_order` dan `blocks_acceptance` dalam bahasa usaha.
  - Selesai jika:
    - Pemilik menambah kain, aksesori, dan tinta dengan pengaturan berbeda.
    - Bahan pengganti tampil pada panel kekurangan stok (uji di P6-01).

- [ ] **P4-05 Pelanggan** (ukuran M; bergantung: P4-01)
  - Kerjakan:
    - Halaman `/master/pelanggan` (admin dan pemilik): tambah, ubah, nonaktif, pencarian cepat (trigram), kelompok (komunitas, kampus, instansi, brand, perorangan, lainnya). Kontak hanya terlihat admin dan pemilik.
    - Pilihan pelanggan pada formulir pesanan memakai pencarian dan 'tambah cepat'.
  - Selesai jika:
    - Admin menambah dan mencari pelanggan.
    - Produksi tidak melihat kontak di layar mana pun (uji di P10-02).

- [ ] **P4-06 Kesiapan data** (ukuran S; bergantung: P4-04)
  - Kerjakan:
    - Halaman `/master/kesiapan` (pemilik): daftar yang membuat pesanan tidak dapat diterima, yaitu produk atau ukuran tanpa spesifikasi kain, kain tanpa batas minimum, rekening kosong, pengaturan default belum dikonfirmasi.
    - Tampilkan jumlah masalah di dasbor pemilik.
  - Selesai jika:
    - Data yang belum siap tampil dengan tautan ke layar perbaikan.
    - Daftar kosong bila semua siap.

### Fase 5. Pesanan Satu Pintu

- [ ] **P5-01 Skema validasi dan draf lokal** (ukuran M; bergantung: P4-04)
  - Kerjakan:
    - `lib/validation/order.ts` (Zod): header pesanan dan baris item (produk, ukuran, jumlah 1 sampai 5000, kain, penerima, catatan ukuran, spesifikasi dekorasi). `lib/domain/items.ts`: pengelompokan baris, konversi ke JSON RPC, hitung total potong.
    - `lib/hooks/use-draft.ts` (§8.5) dengan uji unit (simpan, pulihkan, hapus).
  - Selesai jika:
    - Validasi menolak `KHUSUS` tanpa catatan ukuran dan personalisasi pada kategori yang tidak mendukung.
    - Uji draf lulus.

- [ ] **P5-02 Formulir Pesanan Baru** (ukuran L; bergantung: P5-01)
  - Kerjakan:
    - Halaman `/pesanan/baru`: pelanggan, tenggat, harga disepakati, ringkasan chat, catatan produksi, catatan internal, ItemEditor (baris per produk, ukuran, jumlah, kain, penerima, `size_note`, dekorasi). Mode matriks ukuran untuk kaos massal (satu produk, banyak ukuran sekaligus).
    - Simpan sebagai draf lewat `create_draft_order`. Tampilkan ringkasan total potong dan galat per baris.
  - Selesai jika:
    - Admin membuat pesanan kaos 14 × S dan pesanan PDH 4 baris personal.
    - Draf pulih setelah muat ulang.
    - Nomor pesanan format `DS-YYMM-NNNN`.

- [ ] **P5-03 Daftar dan detail pesanan** (ukuran L; bergantung: P5-02)
  - Kerjakan:
    - `/pesanan`: DataTable menurut tenggat, filter status, pencarian nomor atau nama (NF1), StatusBadge dan badge hold. `/pesanan/[id]`: tab Ringkasan, Item, Stok, Pembayaran, Produksi, Pengemasan, Riwayat; riwayat status dari `order_status_history`.
    - Produksi tidak membuka rute ini (diarahkan ke antrean).
  - Selesai jika:
    - Pencarian pada 2.000 pesanan data uji di bawah 5 detik (hasil ukur dilaporkan).
    - Tab dapat dibuka tanpa galat untuk semua status.

- [ ] **P5-04 Revisi bernomor versi** (ukuran M; bergantung: P5-03)
  - Kerjakan:
    - `/pesanan/[id]/ubah`: memuat versi aktif; kirim `revise_order` dengan versi yang diharapkan dan ringkasan wajib. Tampilkan konflik versi dan tombol muat ulang. Tampilkan diff antarversi dari `order_revisions`.
    - Setelah status `cutting`, halaman mengarahkan ke permintaan revisi terlambat (P7-06).
  - Selesai jika:
    - Revisi menaikkan versi dan menyesuaikan reservasi (uji U6).
    - Versi usang ditolak dengan pesan jelas.

- [ ] **P5-05 Salin pesanan dan berkas desain** (ukuran M; bergantung: P5-03)
  - Kerjakan:
    - Tombol Salin sebagai draf baru (membuat `create_draft_order` dari item pesanan lama, tenggat kosong untuk diisi). Berkas desain: tautan file mentah dan unggah thumbnail ≤ 2 MB ke bucket `design-thumbnails`; tampil lewat signed URL.
    - Validasi tipe (jpeg, png, webp) dan ukuran di server.
  - Selesai jika:
    - Pesanan lama tersalin menjadi draf baru.
    - File 3 MB ditolak; produksi dapat melihat thumbnail tetapi tidak dapat mengunggah.

### Fase 6. Cek Stok dan Penerimaan

- [ ] **P6-01 Panel cek stok langsung** (ukuran L; bergantung: P5-02)
  - Kerjakan:
    - Pada formulir dan detail, StockPanel memanggil `preview_stock` (formulir) atau `check_stock` (tersimpan) setiap item berubah (debounce 400 ms). Tampilkan bahan, butuh, tersedia, kurang, dan ukuran tanpa spesifikasi.
    - Saat ada kekurangan: tampilkan tiga tindakan (ganti bahan dari pengganti, ubah tenggat, ajukan override). Tombol Terima nonaktif dengan alasan tertulis.
  - Selesai jika:
    - Uji U1: stok 10, butuh 14: panel menampilkan kurang 4,0 dan Terima nonaktif.
    - Ukuran tanpa spesifikasi menampilkan penjelasan (U15).

- [ ] **P6-02 Terima pesanan dan invoice** (ukuran M; bergantung: P6-01)
  - Kerjakan:
    - Tombol Terima memanggil `accept_order`; tangani `STOCK_SHORTAGE`, `CONSUMPTION_RULE_MISSING`, `PRICE_MISSING`, `EMPTY_ORDER`. Setelah berhasil tampilkan nomor invoice dan DP.
    - Halaman `/pesanan/[id]/invoice` cetak (kop studio, rekening BCA dan Mandiri dari pengaturan, rincian item, total, DP).
  - Selesai jika:
    - Pesanan dengan stok cukup berstatus `accepted`, DP 50% dari total.
    - Invoice tercetak rapi dan tidak memuat data produksi internal.

- [ ] **P6-03 Override stok** (ukuran M; bergantung: P6-02)
  - Kerjakan:
    - Admin: dialog Ajukan Override (alasan dan ETA wajib) memanggil `request_override`. Pemilik: kotak `/persetujuan` menampilkan permintaan, tombol Setujui atau Tolak memanggil `decide_approval`.
    - Badge 'Menunggu bahan' dengan ETA pada daftar dan detail; pesanan itu tidak muncul di antrean pemotongan.
  - Selesai jika:
    - Uji U2 lulus di E2E.
    - Admin tidak dapat menyetujui (`FORBIDDEN`).

- [ ] **P6-04 DP, SPK, dan pembatalan** (ukuran L; bergantung: P6-03)
  - Kerjakan:
    - Tab Pembayaran: `record_payment` (DP), validasi `settle_payment` atau `reject_payment`, riwayat pembayaran. Setelah DP penuh status `dp_received`; tombol Terbitkan SPK memanggil `transition_status`.
    - `mark_materials_purchased`. Pembatalan: `cancel_order` dengan alasan wajib; opsi Hanguskan DP hanya untuk pemilik dan hanya aktif bila bahan sudah dibeli dan DP settled.
  - Selesai jika:
    - Uji U9 (bagian DP) lulus.
    - Admin tidak melihat opsi hanguskan DP; pemilik melihatnya sesuai syarat.

- [ ] **P6-05 Hold, rollback, dan kedaluwarsa tampil** (ukuran M; bergantung: P6-04)
  - Kerjakan:
    - Tombol Tahan Pesanan (admin, pemilik) dengan alasan; Lepas Penahanan (pemilik). Rollback status (pemilik, dengan alasan). Hitung mundur reservasi untuk pesanan `accepted` tanpa DP.
    - Tampilkan pesanan yang dibatalkan otomatis beserta alasan 'Batas waktu DP terlewat'.
  - Selesai jika:
    - Uji U16 dan U17 lulus.
    - Pesanan ditahan tidak dapat berpindah status dari UI.

### Fase 7. Produksi dan Stok

- [ ] **P7-01 Antrean produksi dan SPK digital** (ukuran L; bergantung: P6-04)
  - Kerjakan:
    - `/produksi`: kartu per pesanan dari `v_production_queue`, urut tenggat, badge menunggu bahan, jumlah potong, catatan produksi. Mobile-first 360 px.
    - `/pesanan/[id]/spk` cetak: nomor, versi aktif, matriks ukuran dan jumlah (baris personal dengan penerima), bahan, dekorasi, tenggat, catatan; hanya versi aktif.
  - Selesai jika:
    - Produksi melihat antrean tanpa harga dan kontak.
    - SPK tercetak A4 dan tidak memuat versi lama.

- [ ] **P7-02 Ringkasan stok dan catat stok** (ukuran L; bergantung: P7-01)
  - Kerjakan:
    - `/stok`: `v_stock_overview` (fisik, sisa, reservasi, tersedia, batas minimum, menipis), riwayat pergerakan per bahan. `/stok/catat`: stok masuk (`purchase_in`) dan pemakaian sisa (`remnant_used` dengan pesanan tujuan) lewat `record_movement`; layar dengan angka besar.
    - Tangani `NEGATIVE_STOCK` dan `REMNANT_INSUFFICIENT`.
  - Selesai jika:
    - Produksi mencatat pembelian kain 20 m dan saldo bertambah.
    - Admin hanya membaca (tombol catat tidak tampil).

- [ ] **P7-03 Mulai pemotongan** (ukuran L; bergantung: P7-02)
  - Kerjakan:
    - `/produksi/[id]`: bila status `spk_issued`, formulir Mulai Pemotongan menampilkan setiap bahan yang dicadangkan dengan isian pemakaian aktual (bawaan: jumlah rencana) dan bagian Sisa Potongan (tambah baris; opsi 'tidak ada sisa' dengan konfirmasi).
    - Tangani `MATERIAL_HOLD`, `USAGE_*`, `REMNANT_*`, `STOCK_PHYSICAL_SHORT`. Pemilik saja yang melihat opsi izinkan stok negatif.
  - Selesai jika:
    - Uji U4 dan U5 lulus di E2E.
    - Setelah mulai, stok utama turun, kolam sisa naik, reservasi `consumed`.

- [ ] **P7-04 Tahap produksi dan keterlambatan** (ukuran M; bergantung: P7-03)
  - Kerjakan:
    - Tombol besar untuk pindah ke Sablon atau Bordir (bisa dilewati), Penjahitan, QC dan Pengemasan lewat `transition_status`. Saat menyelesaikan tahap, tanya alasan keterlambatan opsional (cuaca pengeringan, kapasitas penjahit, menunggu bahan, revisi, lainnya).
    - Tampilkan durasi tiap tahap dari `v_stage_durations`.
  - Selesai jika:
    - Tahap tercatat dengan waktu dan pelaku.
    - Alasan keterlambatan tersimpan pada tahap yang baru diselesaikan.

- [ ] **P7-05 Opname mingguan** (ukuran L; bergantung: P7-02)
  - Kerjakan:
    - `/stok/opname`: daftar bahan dengan stok sistem dan isian hitungan fisik; alasan wajib bila selisih. `submit_count`; selisih besar masuk `/persetujuan`. Pengingat mingguan di dasbor produksi dan pemilik.
    - Laporan selisih per bahan per minggu (tabel dan ekspor).
  - Selesai jika:
    - Uji U12 lulus.
    - Selisih besar tidak mengubah stok sebelum disetujui.

- [ ] **P7-06 Revisi setelah pemotongan** (ukuran M; bergantung: P7-04)
  - Kerjakan:
    - Admin: `/pesanan/[id]/ubah` setelah `cutting` menampilkan formulir terbatas (ukuran, penerima, catatan ukuran per baris; jumlah dikunci) dengan ringkasan dan estimasi kerugian wajib, memanggil `request_late_revision`. Pemilik menyetujui di `/persetujuan`.
    - Riwayat revisi memuat estimasi kerugian.
  - Selesai jika:
    - Uji U6 (revisi terlambat) lulus.
    - Jumlah tidak dapat diubah dari formulir.

### Fase 8. Pengemasan dan Pengiriman

- [ ] **P8-01 Layar pengemasan** (ukuran L; bergantung: P7-04)
  - Kerjakan:
    - `/pengemasan/[id]` (status `qc_packing`): PackingMatrix menampilkan baris pesanan (ukuran, penerima) dan kolom paket; NumberStepper per sel; tombol Tambah Paket; `save_package` per paket.
    - Indikator selisih langsung dari `verify_packing`: hijau bila tepat, merah dengan teks bila tidak.
  - Selesai jika:
    - Pesanan PDH 4 baris personal dapat dikemas dalam dua paket.
    - Selisih tampil per baris tanpa memuat ulang halaman.

- [ ] **P8-02 Selesaikan pengemasan dan pengecualian** (ukuran L; bergantung: P8-01)
  - Kerjakan:
    - Tombol Selesaikan memanggil `complete_packing`; tangani `PACKING_MISMATCH` dengan pesan dari `lib/domain/size-diff.ts` ('L kurang 2, XL lebih 2' atau 'Budi (M) belum terkemas'), `SECOND_CHECKER_REQUIRED`.
    - Pengecualian: `request_packing_exception` (alasan wajib); pemilik menyetujui; penyelesaian berikutnya bertanda `exception`.
  - Selesai jika:
    - Uji U7, U8, U13 lulus di E2E.
    - Setiap ketidakcocokan tercatat di `packing_checks`.

- [ ] **P8-03 Lembar rincian dan label paket** (ukuran S; bergantung: P8-02)
  - Kerjakan:
    - `/pesanan/[id]/rincian` cetak per paket: nomor pesanan, nomor paket, baris (ukuran, penerima, jumlah), tanpa harga dan tanpa kontak. Label paket sederhana (nomor pesanan, nama pelanggan, paket n dari m).
  - Selesai jika:
    - Cetak A4 rapi.
    - Tidak ada harga atau kontak pada lembar.

- [ ] **P8-04 Pelunasan, pengiriman, penyelesaian** (ukuran L; bergantung: P8-02)
  - Kerjakan:
    - Pelunasan: `record_payment` (final), `settle_payment`; saat total settled ≥ total, status `ready_to_ship`. `ship_order` (kargo, Lalamove, GoCar, antar langsung, diambil; catatan resi) dan `complete_order`.
    - Tangani `PAYMENT_NOT_SETTLED` dan hold.
  - Selesai jika:
    - Uji U9 (bagian pelunasan) lulus.
    - Pesanan tidak dapat dikirim sebelum pelunasan settled.

- [ ] **P8-05 Laporan kesalahan pengemasan** (ukuran S; bergantung: P8-02)
  - Kerjakan:
    - Halaman laporan (pemilik) dari `v_packing_errors_monthly` dan daftar kejadian (pesanan, baris, selisih, pelaku, waktu).
  - Selesai jika:
    - Kejadian ketidakcocokan dari uji tampil di laporan.
    - Hanya pemilik yang dapat membuka.

### Fase 9. Dasbor, Laporan, Audit

- [ ] **P9-01 Dasbor pemilik** (ukuran M; bergantung: P8-04)
  - Kerjakan:
    - `/dasbor`: StatCard pesanan aktif per status, pesanan mendekati tenggat (≤ 3 hari), stok menipis, persetujuan menunggu, ketidakcocokan pengemasan bulan ini, jumlah masalah kesiapan data.
  - Selesai jika:
    - Angka dasbor sama dengan hasil kueri manual.
    - Dasbor terbuka di bawah 5 detik pada data uji.

- [ ] **P9-02 Dasbor admin dan produksi** (ukuran S; bergantung: P9-01)
  - Kerjakan:
    - Beranda admin: pesanan menunggu tindakan (draf, belum DP, menunggu pelunasan, siap kirim). Beranda produksi: antrean hari ini, stok menipis, pengingat opname.
  - Selesai jika:
    - Tiap peran melihat tindakan berikutnya pada beranda perannya.

- [ ] **P9-03 Laporan dan ekspor CSV** (ukuran L; bergantung: P9-01)
  - Kerjakan:
    - `/laporan`: rekap pesanan, volume potong per bulan (`v_monthly_volume`), penerimaan pembayaran per bulan, selisih stok mingguan, durasi tahap dan penyebab keterlambatan. `/api/ekspor/[nama]` (pemilik saja) mengunduh CSV UTF-8 BOM dengan pemisah titik koma.
  - Selesai jika:
    - CSV terbuka benar di Excel (kolom terpisah, huruf Indonesia utuh).
    - Peran selain pemilik ditolak di rute ekspor.

- [ ] **P9-04 Audit log dan kotak persetujuan** (ukuran M; bergantung: P9-01)
  - Kerjakan:
    - `/audit` (pemilik): daftar `audit_logs` dengan filter tabel, pelaku, rentang waktu; tampilan sebelum dan sesudah. `/persetujuan` menampilkan semua jenis persetujuan dengan detail yang cukup untuk memutuskan.
  - Selesai jika:
    - Aksi uji muncul di audit log dengan pelaku dan waktu (U11).
    - Admin dan produksi tidak dapat membuka `/audit`.

### Fase 10. Kualitas

- [ ] **P10-01 Uji unit menyeluruh** (ukuran M; bergantung: P9-04)
  - Kerjakan:
    - Lengkapi uji unit: format, pemeta galat, util item, size-diff, draf, validasi, kontras, klasifikasi warna. Target cakupan logika domain ≥ 80% (dilaporkan, bukan alat untuk menurunkan kualitas uji).
  - Selesai jika:
    - `npm run test` hijau.
    - Laporan cakupan ada.

- [ ] **P10-02 Matriks izin** (ukuran L; bergantung: P10-01)
  - Kerjakan:
    - Uji SQL hak akses per peran per tabel dan fungsi (positif dan negatif) serta uji rute per peran di Playwright. Pastikan T01 sampai T24 Lampiran F tetap lulus.
  - Selesai jika:
    - Anon, produksi, admin, pemilik, pengguna nonaktif, dan pengguna tanpa peran diuji pada setiap tabel dan fungsi.
    - Tidak ada celah: produksi tidak membaca harga atau kontak.

- [ ] **P10-03 Konkurensi dan idempotensi** (ukuran M; bergantung: P10-02)
  - Kerjakan:
    - Uji paralel: 8 penerimaan serentak; dua pencatatan stok serentak; klik ganda Terima; dua tab menyelesaikan pengemasan; pembatalan saat penerimaan. Verifikasi stok dan reservasi konsisten.
  - Selesai jika:
    - Tidak ada reservasi yang melebihi stok; tidak ada pergerakan ganda.
    - Hasil uji dilampirkan.

- [ ] **P10-04 Uji E2E alur utama** (ukuran L; bergantung: P10-03)
  - Kerjakan:
    - Playwright dengan data contoh: U1 sampai U13 dan U15 sampai U17, memakai skenario kaos massal dan PDH personal. Gunakan akun uji per peran.
  - Selesai jika:
    - `npm run test:e2e` hijau.
    - Setiap uji penerimaan berstatus lulus, gagal, atau belum diuji dengan bukti.

- [ ] **P10-05 Aksesibilitas, kontras, dan proporsi warna** (ukuran M; bergantung: P10-04)
  - Kerjakan:
    - Jalankan axe pada layar utama, `check:contrast`, tangkapan layar lima layar pada 360 px dan 1366 px lalu `check:color-share`. Perbaiki pelanggaran serius.
  - Selesai jika:
    - G5 lulus.
    - Proporsi rata-rata dalam ±10 poin dari 40/40/20 (angka dilaporkan).
    - Semua layar produksi dapat dipakai di 360 px.

- [ ] **P10-06 Performa dan pengerasan** (ukuran L; bergantung: P10-05)
  - Kerjakan:
    - NF1 (2.000 pesanan), NF2 (CPU 4× lebih lambat, 3G cepat), NF3 (putus koneksi). Pengerasan §10.5: header, batas laju, audit dependensi, pemeriksaan bundel. Tulis `docs/TEST_REPORT.md` memuat hasil nyata.
  - Selesai jika:
    - NF1 sampai NF3 memiliki angka hasil ukur atau 'belum diuji' beserta alasan.
    - `npm audit --omit=dev` tanpa kerentanan tinggi tak tercatat.
    - Tidak ada cacat berat terbuka.

### Fase 11. Deployment dan Serah Terima

- [ ] **P11-01 [PEMILIK+agent] Supabase PRODUKSI dan keputusan paket** (ukuran M; bergantung: P10-06)
  - Kerjakan:
    - Pemilik membuat proyek PRODUKSI (LANGKAH PEMILIK 3) dan memutuskan paket (Pro atau gratis dengan syarat §14.2). Agent memverifikasi pengaturan Auth (signup off, panjang sandi), mendorong migrasi 0001 sampai 0015 (tanpa seed contoh), dan menulis `docs/RUNBOOK.md`.
  - Selesai jika:
    - Migrasi terpasang di PRODUKSI; RLS aktif.
    - Keputusan paket dan jadwal cadangan tertulis di RUNBOOK.

- [ ] **P11-02 Deploy aplikasi** (ukuran M; bergantung: P11-01)
  - Kerjakan:
    - Deploy ke hosting terpilih (LANGKAH PEMILIK 4). Atur variabel lingkungan, redirect URL Auth, SMTP, domain. Jalankan pemeriksaan `/api/health` dan login pemilik.
  - Selesai jika:
    - Aplikasi PRODUKSI dapat dibuka dan login pemilik berhasil.
    - Tidak ada rahasia di bundel klien.

- [ ] **P11-03 Data awal PRODUKSI** (ukuran M; bergantung: P11-02)
  - Kerjakan:
    - Bersama pemilik (LANGKAH PEMILIK 5): buat pengguna admin dan produksi, isi master data nyata (kategori, produk, kebutuhan kain per ukuran, bahan, batas minimum, rekening, pengaturan), lalu opname pertama sebagai stok awal. Halaman Kesiapan Data harus kosong.
  - Selesai jika:
    - Tidak ada data CONTOH di PRODUKSI.
    - Stok awal tercatat sebagai pergerakan opname beralasan.
    - Kesiapan Data tidak menyisakan masalah.

- [ ] **P11-04 Cadangan dan pemulihan** (ukuran M; bergantung: P11-03)
  - Kerjakan:
    - Implementasikan `npm run backup` dan jadwalnya (atau konfirmasi cadangan harian Pro). Uji pemulihan ke proyek kosong dan catat langkah serta hasilnya di RUNBOOK. Aktifkan monitoring galat dasar dan verifikasi pg_cron.
  - Selesai jika:
    - Pemulihan ke proyek kosong berhasil dan terdokumentasi.
    - `cron.job` memuat tugas pelepasan reservasi.

- [ ] **P11-05 Panduan dan pelatihan** (ukuran M; bergantung: P11-04)
  - Kerjakan:
    - Tulis `docs/PANDUAN_ADMIN.md` dan `docs/PANDUAN_PRODUKSI.md` (masing-masing satu halaman, langkah bergambar atau berurut). Uji NF7: satu karyawan baru mencatat stok dan pengemasan dengan panduan; catat waktu dan hambatan.
  - Selesai jika:
    - Dua panduan satu halaman ada.
    - Hasil uji kemudahan (waktu dan hambatan) tercatat.

- [ ] **P11-06 Jalan paralel dan go-live** (ukuran M; bergantung: P11-05)
  - Kerjakan:
    - Jalan paralel dua minggu bersama buku lama (LANGKAH PEMILIK 6). Bandingkan jumlah pesanan dan hasil opname. Setelah kriteria berhenti memakai buku terpenuhi, go-live dan serah terima akses. Rencanakan evaluasi satu bulan terhadap baseline (§14.7).
  - Selesai jika:
    - Kriteria berhenti memakai buku tertulis dan terpenuhi.
    - Formulir serah terima akses terisi.
    - Jadwal evaluasi satu bulan ada.

---
## 16. RISIKO DAN KETERGANTUNGAN

| # | Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|---|
| 1 | Kebutuhan kain per potong belum diukur atau salah, sehingga cek stok salah | Tinggi | Tinggi | Ukur pada tiga pesanan nyata per kategori; mulai dengan buangan lebih besar; pemilik meninjau; halaman Kesiapan Data (P4-06) |
| 2 | Stok awal tidak sama dengan kain di rak | Tinggi | Tinggi | Opname pertama menyeluruh sebelum jalan paralel (P11-03) |
| 3 | Produksi tidak konsisten mencatat | Sedang | Tinggi | Mulai Pemotongan wajib pemakaian dan sisa; layar ringkas 360 px; pemilik menegakkan kebiasaan |
| 4 | Detail PDH dan PDL belum diketahui (personalisasi, ukuran khusus, urutan produksi) | Tinggi | Sedang | Model fleksibel (kategori, `KHUSUS`, penerima per baris); pertanyaan Q-01 sampai Q-04; default di §18 |
| 5 | Wi-Fi tidak stabil | Sedang | Sedang | Draf lokal (D-18); offline penuh Fase 2 |
| 6 | Proyek Supabase gratis dijeda atau tanpa cadangan | Sedang | Tinggi | Pro, atau ekspor mingguan dan aktivitas harian; uji pemulihan |
| 7 | Kebijakan RLS atau grant salah | Rendah | Tinggi | Uji positif dan negatif per peran (T01 sampai T24); kunci service role hanya di server |
| 8 | Perubahan permintaan di tengah jalan | Sedang | Sedang | Ruang lingkup §2.4 dikunci; permintaan baru dicatat sebagai keputusan |
| 9 | Admin merangkap pekerjaan lain sehingga input tertunda | Sedang | Sedang | Input satu kali; peran jamak; layar ringkas |
| 10 | Kode hasil agent salah atau tidak teruji | Sedang | Tinggi | Gate G1 sampai G5; persetujuan pemilik per prompt; seluruh anggota memahami kode yang digabung |
| 11 | pg_cron atau Storage berperilaku berbeda dari dugaan | Sedang | Sedang | Tidak diuji lokal; diuji di DEV (P2-08, P2-11) |
| 12 | Pengguna belum siap | Sedang | Tinggi | Panduan satu halaman, jalan paralel dua minggu, pemilik sebagai sponsor |

Ketergantungan fase: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. Fase 1 dan 2 dapat berjalan berdampingan setelah P0-06 bila ada dua orang; agent tunggal mengerjakan berurutan.

---

## 17. NON-GOAL

Akun pelanggan, WhatsApp API, marketplace, payment gateway, integrasi bank, akuntansi dan jurnal, stok barang jadi, penjadwalan penjahit dan kapasitas, notifikasi push dan email massal, aplikasi native, multi-cabang, antrean offline penuh (Fase 2), label QR dan pemindaian (Fase 2), thumbnail otomatis dari file mentah (Fase 2).

---

## 18. PERTANYAAN UNTUK PEMILIK DAN NILAI DEFAULT

Agent memakai default dan mencatat asumsinya di Lampiran D. Jawaban pemilik menggantikan default lewat Master Data atau migrasi baru.

| Kode | Pertanyaan | Default |
|---|---|---|
| Q-01 | Apakah PDH dan PDL memakai nama atau jabatan personal per potong? | Ya, opsional per baris (`recipient_label`) |
| Q-02 | Apakah ada ukuran khusus (ukur badan) untuk PDH dan PDL? Bagaimana ukuran dicatat? | Ya, `KHUSUS` dengan `size_note` bebas teks |
| Q-03 | Urutan produksi PDH dan PDL: bordir atau emblem sebelum atau sesudah dijahit? | Mengikuti urutan status pesanan (`decorating` sebelum `sewing`, boleh dilewati) |
| Q-04 | Bahan, atribut (emblem, patch, kancing), dan detail lain PDL | Dicatat sebagai bahan aksesori dan `spec` dekorasi |
| Q-05 | Satuan stok kain: meter, kg, atau lembar? | Meter |
| Q-06 | Kebutuhan kain per potong menurut produk dan ukuran | Belum ada; pesanan tidak dapat diterima sampai diisi (D-10) |
| Q-07 | Daftar bahan baku awal, batas minimum, dan bahan mana yang dicadangkan per pesanan | Kain dan aksesori dilacak; tinta, film, benang tidak |
| Q-08 | Persen buangan kain | 5% |
| Q-09 | Persen DP | 50% (sesuai wawancara) |
| Q-10 | Lama reservasi sebelum DP masuk | 3 hari |
| Q-11 | Toleransi selisih opname tanpa persetujuan | 2% dari stok sistem |
| Q-12 | Nomor rekening BCA dan Mandiri untuk invoice | Kosong sampai diisi pemilik |
| Q-13 | Daftar ukuran per kategori | S, M, L, XL, XXL, XXXL (sementara) |
| Q-14 | Siapa yang membeli bahan dan mencatat tanggal pembelian? | Admin atau produksi dapat menandai |
| Q-15 | Printer untuk SPK, invoice, lembar rincian | Cetak A4 dari peramban |
| Q-16 | Jumlah pengguna dan perangkat masing-masing | Tiga peran, minimal tiga akun |
| Q-17 | Perlu pemeriksa kedua pada pengemasan? | Tidak (admin sering merangkap packing) |
| Q-18 | Hosting aplikasi dan paket Supabase | Vercel atau Cloudflare Pages; Pro saat dipakai harian |
| Q-19 | Apakah pembelian bahan dicatat per pesanan atau global? | Global (stok bersama); penanda `material_purchased_at` per pesanan |
| Q-20 | Batas jam kerja untuk pengingat opname mingguan | Senin pagi |

---

## 19. GLOSARIUM

**SPK** Surat Perintah Kerja. **DP** uang muka. **PDH** Pakaian Dinas Harian. **PDL** Pakaian Dinas Lapangan. **Settled** dana sudah terkonfirmasi di rekening menurut mutasi. **Kolam stok** pemisahan stok kain utama (`main`) dan sisa potongan (`remnant`). **Reservasi** pencadangan bahan untuk pesanan yang sudah diterima. **Override** persetujuan pemilik untuk menerima pesanan walau bahan kurang. **Material hold** pesanan diterima lewat override dan menunggu bahan. **Opname** penghitungan fisik stok. **Baris pesanan** satu kombinasi produk, ukuran, kain, dan (bila ada) penerima. **Append-only** hanya boleh ditambah, tidak diubah atau dihapus. **RLS** Row Level Security. **RPC** fungsi database yang dipanggil dari aplikasi.

---

## LAMPIRAN A. KODE GALAT DAN PESAN

Jenis: **E** = exception (pesan dimulai kode), **R** = hasil `ok:false` (`code` pada jsonb). Pesan adalah isi `lib/messages.ts`.

| Kode | Jenis | Pesan Indonesia |
|---|---|---|
| `FORBIDDEN` | E | Anda tidak memiliki izin untuk tindakan ini. |
| `ORDER_NOT_FOUND` | E | Pesanan tidak ditemukan. |
| `INVALID_TRANSITION` | E | Tindakan ini tidak dapat dilakukan pada status pesanan saat ini. |
| `ORDER_ON_HOLD` | E | Pesanan sedang ditahan. Hubungi pemilik. |
| `VERSION_CONFLICT` | E | Pesanan sudah diubah orang lain. Muat ulang lalu ulangi perubahan. |
| `REVISION_LOCKED` | E | Pesanan sudah masuk pemotongan. Ajukan revisi terlambat. |
| `EMPTY_ORDER` | E, R | Pesanan belum memiliki item. |
| `INVALID_ITEM:PRODUCT` | E | Produk tidak aktif atau tidak ditemukan. |
| `INVALID_ITEM:SIZE` | E | Ukuran tidak tersedia untuk kategori ini. |
| `INVALID_ITEM:SIZE_NOTE` | E | Ukuran khusus wajib disertai catatan ukuran. |
| `INVALID_ITEM:PERSONALIZATION` | E | Kategori ini tidak mendukung nama atau penerima per potong. |
| `INVALID_ITEM:FABRIC` | E | Bahan yang dipilih bukan kain atau tidak aktif. |
| `INVALID_ITEM:TOO_MANY` | E | Terlalu banyak baris (maksimal 200). |
| `INVALID_ITEM` | E | Baris pesanan tidak valid. |
| `INVALID_DEADLINE` | E | Tenggat tidak boleh sebelum hari ini. |
| `INVALID_PRICE` | E | Harga tidak valid. |
| `CUSTOMER_NOT_FOUND` | E | Pelanggan tidak ditemukan atau tidak aktif. |
| `SUMMARY_REQUIRED` | E | Ringkasan perubahan wajib diisi. |
| `REASON_REQUIRED` | E | Alasan wajib diisi. |
| `REASON_AND_ETA_REQUIRED` | E | Alasan dan perkiraan tanggal bahan tiba wajib diisi. |
| `ALREADY_PENDING` | E | Sudah ada permintaan serupa yang menunggu keputusan. |
| `ALREADY_DECIDED` | E | Permintaan ini sudah diputuskan. |
| `APPROVAL_NOT_FOUND` | E | Permintaan persetujuan tidak ditemukan. |
| `USE_START_CUTTING` | E | Pemakaian kain dicatat lewat Mulai Pemotongan. |
| `USE_DEDICATED_FUNCTION` | E | Perubahan status ini memakai tombol khusus. |
| `INVALID_QUANTITY` | E, R | Jumlah tidak valid. |
| `MATERIAL_NOT_FOUND` | E | Bahan tidak ditemukan. |
| `ORDER_REQUIRED` | E | Pesanan tujuan wajib dipilih. |
| `INVALID_PACKAGE` | E | Isi paket tidak valid. |
| `INVALID_AMOUNT` | E | Nominal pembayaran tidak valid. |
| `PAYMENT_NOT_FOUND` | E | Pembayaran tidak ditemukan. |
| `FORFEIT_NOT_ALLOWED` | E | DP hanya dapat dihanguskan bila bahan sudah dibeli dan DP sudah settled. |
| `LAST_OWNER` | E | Pemilik terakhir tidak dapat dihapus atau dinonaktifkan. |
| `CANNOT_DEACTIVATE_SELF` | E | Anda tidak dapat menonaktifkan akun sendiri. |
| `STOCK_SHORTAGE` | R | Stok bahan kurang. Lihat tabel kekurangan. Ganti bahan, ubah tenggat, atau ajukan override. |
| `CONSUMPTION_RULE_MISSING` | R | Kebutuhan kain belum diatur untuk produk dan ukuran ini. Minta pemilik mengisinya. |
| `PRICE_MISSING` | R | Harga disepakati belum diisi. |
| `MATERIAL_HOLD` | R | Pesanan menunggu bahan (perkiraan: tanggal ETA). Pemotongan belum dapat dimulai. |
| `USAGE_REQUIRED` | R | Isi pemakaian bahan. |
| `USAGE_MISSING` | R | Pemakaian belum diisi untuk bahan yang dicadangkan. |
| `USAGE_NOT_RESERVED` | R | Ada bahan yang tidak dicadangkan untuk pesanan ini. |
| `REMNANT_REQUIRED` | R | Isi sisa potongan, atau konfirmasi tidak ada sisa. |
| `REMNANT_EXCEEDS_USAGE` | R | Sisa potongan melebihi pemakaian. |
| `STOCK_PHYSICAL_SHORT` | R | Stok fisik tidak cukup untuk pemakaian ini. Catat pembelian atau lakukan opname dulu. |
| `NEGATIVE_STOCK` | R | Stok tidak boleh menjadi negatif. |
| `REMNANT_INSUFFICIENT` | R | Sisa potongan tidak cukup. |
| `PACKING_MISMATCH` | R | Isi paket belum sama dengan pesanan. Lihat selisih per baris. |
| `SECOND_CHECKER_REQUIRED` | R | Pemeriksaan harus dilakukan orang lain selain pengemas. |
| `PAYMENT_NOT_SETTLED` | R | Pelunasan belum settled. Pesanan belum dapat dikirim. |

---

## LAMPIRAN B. PETA FUNGSI RPC

| Fungsi | Peran | Hasil atau kode |
|---|---|---|
| `create_draft_order(customer, deadline, total, chat, prod_notes, notes, items)` | admin, pemilik | `{order_id, order_number}` |
| `revise_order(order, expected_version, items, deadline, total, prod_notes, summary)` | admin, pemilik | `{ok, version}` atau `STOCK_SHORTAGE`, `CONSUMPTION_RULE_MISSING` |
| `check_stock(order)` | semua internal | tabel bahan (butuh, fisik, reservasi lain, tersedia, kurang) |
| `preview_stock(items, order?)` | admin, pemilik | `{missing, rows, blocked}` |
| `accept_order(order)` | admin, pemilik | `{ok, invoice_number, dp_amount, material_hold}` atau kode R |
| `request_override(order, reason, eta)` | admin, pemilik | id persetujuan |
| `decide_approval(approval, approve, note)` | pemilik | `{ok, status}` atau kode R |
| `record_movement(material, type, qty, reason, order?)` | produksi, pemilik (penyesuaian: pemilik) | `{ok, movement_id, balance}` atau `NEGATIVE_STOCK`, `REMNANT_INSUFFICIENT` |
| `start_cutting(order, usage, remnants, confirm_no_remnant, allow_negative)` | produksi, pemilik | `{ok}` atau kode R |
| `submit_count(material, pool, counted, reason)` | produksi, pemilik | `{ok, status, variance}` |
| `mark_materials_purchased(order, at)` | admin, produksi, pemilik | void |
| `request_late_revision(order, changes, summary, loss_note)` | admin, pemilik | id persetujuan |
| `transition_status(order, to, reason, delay, delay_note)` | spk: admin, pemilik; tahap: produksi, pemilik | void |
| `rollback_status(order, to, reason)` | pemilik | void |
| `record_payment(order, kind, amount, bank, note)` | admin, pemilik | id pembayaran |
| `settle_payment(payment)` | admin, pemilik | `{ok, paid_total}` |
| `reject_payment(payment, note)` | admin, pemilik | void |
| `save_package(order, package_no, items)` | produksi, pemilik | id paket |
| `verify_packing(order)` | semua internal | `{ok, lines}` |
| `complete_packing(order)` | produksi, pemilik | `{ok, result}` atau `PACKING_MISMATCH`, `SECOND_CHECKER_REQUIRED` |
| `request_packing_exception(order, reason)` | semua internal | id persetujuan |
| `ship_order(order, method, tracking, note)` | admin, pemilik | `{ok}` atau `PAYMENT_NOT_SETTLED` |
| `complete_order(order)` | admin, pemilik | void |
| `cancel_order(order, reason, forfeit_dp)` | admin, pemilik (hangus dan pasca-pemotongan: pemilik) | void |
| `set_hold(order, reason)`, `release_hold(order)` | admin dan pemilik; pelepasan: pemilik | void |
| `set_user_active(user, active)` | pemilik | void |
| `private.release_expired_reservations()` | pg_cron | jumlah pesanan dibatalkan |

---

## LAMPIRAN C. TEMPLATE ENTRI HANDOFF

```
### [YYYY-MM-DD HH:MM] Prompt NN | Task: P?-?? | Status: SELESAI | SEBAGIAN | GAGAL | WIP
- Dikerjakan: (daftar singkat)
- Gate: G1 ... G5 (lulus atau gagal, ringkas)
- File utama: (daftar)
- Keputusan atau asumsi baru: (kode D- bila ada)
- Hasil ukur: (angka nyata, atau "belum diuji")
- Cek manual untuk pemilik: (3 sampai 5 langkah)
- Langkah berikutnya: (satu kalimat)
```

## LAMPIRAN D. HANDOFF LOG

(Terbaru di bawah.)

### [2026-11-04 00:00] Edisi 3.0 | Task: n/a | Status: SELESAI
- Dikerjakan: Dokumen dibuat dari wawancara 25 Okt 2026, Lembar Kerja Kelompok 2, LTP4, prompt build v1 dan v2. Ditambah kategori PDH dan PDL, palet 20/40/40, dan skema database yang diverifikasi.
- Gate: SQL 0001 sampai 0013 dimuat di PostgreSQL 16; 119 assertion lulus; uji 8 penerimaan serentak lulus; `check-contrast` lulus; `check-color-share` lulus pada gambar sintetis.
- Keputusan baru: D-01 sampai D-28. Perubahan dari v1: `DITAHAN` dan `DITERIMA_MENUNGGU_BAHAN` menjadi flag (D-27); verifikasi pengemasan per baris pesanan (D-11).
- Hasil ukur: tidak ada pengukuran di lapangan.
- Belum diuji: pg_cron, Supabase Auth dan Storage nyata, JWT PostgREST, tampilan aplikasi (belum dibuat).
- Langkah berikutnya: Prompt 01 (audit lingkungan, P0-01).

### [2026-11-25] Pra-P0-01 | Task: n/a (Setup filter antislop) | Status: SELESAI
- Dikerjakan: Clone `https://github.com/miqdadbadjuber/anti-slop` (v3.2.32) ke `anti-slop/`, pemasangan 6 skill ke `.agents/skills/` lewat `anti-slop/cli/lib/install.mjs`, penulisan pointer ke `AGENTS.md`, pengecualian `anti-slop/**` dan `.agents/**` di `eslint.config.mjs` dan `tsconfig.json`, serta pembaruan dokumen `PROJECT_PLAN.md` (D-29, §0.2 #17, §3.3, §7.13, catatan P0-02/P0-03) dan `prompting-struktur.txt`.
- Gate: `npm run lint` dan `npx tsc --noEmit` lulus tanpa galat maupun peringatan (G1 lengkap belum tersedia sebelum P0-03).
- File utama: `AGENTS.md`, `.agents/skills/*`, `anti-slop/`, `eslint.config.mjs`, `tsconfig.json`, `PROJECT_PLAN.md`, `prompting-struktur.txt`.
- Keputusan atau asumsi baru: D-29 (filter `antislop` v3.2.32 lokal; §0.2 dan §7 tetap menang bila ada benturan).
- Hasil ukur: belum diuji (tampilan aplikasi belum dibuat).
- Cek manual untuk pemilik: pastikan folder `.agents/skills/` berisi 6 skill `antislop`, `AGENTS.md` memuat blok `<!-- antislop:start/end -->`, lalu mulai Prompt 01 (`P0-01`).
- Langkah berikutnya: Prompt 01 (audit lingkungan, P0-01).

### [2026-11-26 00:00] Prompt 01 | Task: P0-01 | Status: SEBAGIAN
- Dikerjakan: Mengaudit lingkungan nyata (`node -v`, `npm -v`, `git --version`, cek `docker`/`psql`/`supabase`, versi OS dan PowerShell, inspeksi `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, struktur direktori `app/` dan `public/`), lalu mengisi seluruh 17 baris §3.1 dan mencatat seluruh selisih dengan asumsi plan. Tidak ada kode aplikasi diubah dan tidak ada paket dipasang.
- Kondisi folder apa adanya: Proyek Next.js 16.4.3 (`proyek-scm@0.1.0`) sudah ada dari templat `create-next-app` tanpa `src/` (`app/favicon.ico`, `app/globals.css`, `app/layout.tsx` masih `lang="en"` dengan font Geist, `app/page.tsx`, `public/*.svg`, `next.config.ts`, `eslint.config.mjs` dengan ESLint `9.39.5` & `eslint-config-next` `16.4.3`, `tsconfig.json` `strict: true` & alias `@/*`, `.gitignore`, `README.md`, `node_modules/`, `.next/`). Selain itu terdapat `.agents/skills/` (6 skill `antislop` v3.2.32), `AGENTS.md`, `anti-slop/`, `PROJECT_PLAN.md` (masih di root, belum di `docs/`), dan `prompting-struktur.txt`. Belum ada `proxy.ts`, `components/`, `lib/`, `supabase/`, `scripts/`, `tests/`, maupun `docs/`.
- Selisih dengan asumsi plan: (1) Root proyek belum memiliki repositori `.git` (`git status` gagal: `not a git repository`; `.git` hanya ada di `anti-slop\.git`), sehingga commit dan pemeriksaan `git status` belum dapat lulus; (2) `package.json` hanya memiliki skrip `dev`, `build`, `start`, `lint`—belum ada skrip `typecheck` maupun `test` (baru dijadwalkan di P0-02/P0-03); (3) Tailwind 4 (`4.3.3`) memakai `@tailwindcss/turbopack` (`4.3.3`) di `next.config.ts`, bukan `@tailwindcss/postcss` (dan `@tailwindcss/turbopack` belum ada di whitelist §3.2; perlu keputusan §4 pada P0-02); (4) `next.config.ts` mengaktifkan `cacheComponents: true` dan `partialPrefetching: true`; (5) Node `v24.21.0` dan npm `12.2.1` lebih baru dari asumsi 22 LTS / 10+, sedangkan TypeScript `5.9.3` mengikuti templat `create-next-app` (diizinkan catatan kompatibilitas §3.1); (6) Docker Desktop, PostgreSQL 16 lokal (`psql`), dan Supabase CLI belum terpasang (berdampak pada opsi G3 lokal di Fase 2).
- Gate: G1 parsial — `npm run lint` LULUS (0 error, 0 warning); `npm run typecheck` GAGAL (`Missing script: "typecheck"`, catatan: `npx tsc --noEmit` langsung LULUS tanpa galat); `npm run test` GAGAL (`Missing script: "test"`). Karena G1 belum penuh dan `.git` belum ada, task `P0-01` tidak dicentang dan commit tidak dilakukan.
- File utama: `PROJECT_PLAN.md` (§1, §3.1, Lampiran D, Lampiran E).
- Keputusan atau asumsi baru: Tidak ada keputusan baru yang diubah; selisih `@tailwindcss/turbopack` dan kebutuhan `git init` dicatat untuk diputuskan/dikerjakan pada P0-02.
- Hasil ukur: belum diuji (audit lingkungan saja).
- Cek manual untuk pemilik: (1) Buka `PROJECT_PLAN.md` §3.1 dan pastikan tidak ada baris bertuliskan `(isi)`; (2) Periksa daftar 6 selisih lingkungan di Lampiran D; (3) Putuskan apakah ingin menjalankan `git init` sebelum Prompt 02 dan apakah mempertahankan `@tailwindcss/turbopack` (dicatat di §4 pada P0-02) atau beralih ke `@tailwindcss/postcss`; (4) Siapkan pemasangan Docker Desktop atau PostgreSQL 16 lokal bila ingin menjalankan uji SQL lokal G3 sebelum Fase 2 (Prompt 08).
- Langkah berikutnya: Setelah pemilik menyetujui hasil audit dengan `/1allclear` (dan menginisialisasi Git atau mengizinkan inisialisasi di awal Prompt 02), lanjut ke Prompt 02 (`P0-02`, `P0-03`).

### [2026-11-26 00:25] Prompt 02 | Task: P0-02, P0-03 | Status: SELESAI
- Dikerjakan: (P0-02) Membuat seluruh struktur folder §3.3 dengan `.gitkeep` pada folder kosong, memindahkan `PROJECT_PLAN.md` ke `docs/PROJECT_PLAN.md`, memperbarui `AGENTS.md` (ringkasan §0.2, peta dokumen, perintah & gate sambil mempertahankan blok pointer `<!-- antislop:start/end -->` dan `.agents/skills/`), menambahkan seluruh skrip npm §3.4 di `package.json` (skrip yang belum aktif mencetak `belum tersedia`), serta menginisialisasi repositori Git lokal dan mendorong ke `https://github.com/Laryevieng/Determined-Studio.git` (`main`). (P0-03) Memasang `prettier@3.10.1`, `vitest@5.1.2`, dan `@types/node@22.20.7` (whitelist §3.2), menyiapkan `.prettierrc`, `.prettierignore`, `vitest.config.mts`, uji contoh `tests/unit/smoke.test.ts`, alur CI `.github/workflows/ci.yml` (Gate G1), memperbarui `.gitignore` (`!.env.example`, `/tests/e2e/__shots__/`, `/anti-slop/`), serta memperbaiki skrip `typecheck` menjadi `next typegen && tsc --noEmit` (`089e16c`) setelah CI awal (`9bb839b`, run `45664012023`) gagal di langkah Typecheck karena tipe rute `.next/types` belum dibangkitkan pada runner bersih.
- Gate: G1 LULUS (`npm run lint`: 0 error/warning; `npm run typecheck`: `next typegen && tsc --noEmit` 0 error; `npm run test`: 1/1 test lulus; `npx prettier --check` lulus). G2 LULUS (`npm run build` lulus untuk rute `/` dan `/_not-found`; catatan: Next.js 16.4.3 sempat berhenti sekali menampilkan pengingat penasihat keamanan dan lulus pada percobaan berikutnya). `npm run dev` diverifikasi di `http://localhost:3000` (HTTP 200, judul `Create Next App`). GitHub Actions CI LULUS hijau (`conclusion: success`, run `45664511919` pada commit `089e16c`).
- File utama: `package.json`, `package-lock.json`, `AGENTS.md`, `.gitignore`, `.prettierrc`, `.prettierignore`, `vitest.config.mts`, `tests/unit/smoke.test.ts`, `.github/workflows/ci.yml`, `docs/PROJECT_PLAN.md`, struktur folder §3.3 (`app/`, `components/`, `lib/`, `supabase/`, `scripts/`, `tests/`).
- Keputusan atau asumsi baru: D-30 (pertahankan `@tailwindcss/turbopack` bawaan `create-next-app@16.4.3` dan perbarui `@types/node` ke `^22` untuk peer dependency `vitest@5.1.2`).
- Hasil ukur: `npm run test` 1/1 lulus (874 ms); `npm run build` kompilasi 2,4 s + TypeScript 5,7 s; `http://localhost:3000` HTTP 200 (16.180 byte); GitHub Actions CI run `45664511919` lulus penuh (`Lint`, `Typecheck`, `Unit test`).
- Cek manual untuk pemilik: (1) Buka `https://github.com/Laryevieng/Determined-Studio/actions` dan pastikan alur CI berwarna hijau; (2) Buka `http://localhost:3000` dan pastikan halaman awal Next.js tampil normal; (3) Periksa `AGENTS.md`, `.agents/skills/`, dan `docs/PROJECT_PLAN.md` sudah utuh; (4) Awali Prompt 03 (`P0-04`, `P0-05`, `P0-06`) dengan `/1allclear`.
- Langkah berikutnya: Awali Prompt 03 (`P0-04`, `P0-05`, `P0-06`) dengan `/1allclear`.

### [2026-11-26 00:33] Prompt 03 | Task: P0-04, P0-05, P0-06 | Status: SELESAI
- Dikerjakan: (P0-04) Memasang `zod@4.6.7` dan `server-only@0.0.1` (whitelist §3.2), membuat `.env.example` (seluruh 6 variabel §3.5 tanpa nilai nyata), `lib/env.public.ts` (skema variabel publik aman untuk klien), `lib/env.ts` (penjaga `server-only` + skema server termasuk `SUPABASE_SECRET_KEY` dan default `SESSION_IDLE_MINUTES=480`, `LOGIN_MAX_ATTEMPTS=8`), dan `tests/unit/env.test.ts`. (P0-05) Membuat `app/api/health/route.ts` (`{status: "ok", timestamp}`, `Cache-Control: no-store`), `app/not-found.tsx`, `app/error.tsx` berbahasa Indonesia dengan target sentuh 48 px, serta memperbarui `app/layout.tsx` (`lang="id"`, judul/deskripsi Determined Studio, `robots: { index: false, follow: false }`). (P0-06) Membuat `lib/format.ts` (`rupiah`, `angka`, `meter`, `tanggalWib`, `tanggalJamWib`, `parseAngkaId`), `lib/messages.ts` (seluruh 49 pesan Lampiran A + `VALIDATION` + `UNKNOWN`), `lib/errors.ts` (`AppErrorCode`, `mapDbError` termasuk prefix exception Postgres dan substitusi ETA `MATERIAL_HOLD`), serta `tests/unit/format.test.ts` dan `tests/unit/errors.test.ts`.
- Gate: G1 LULUS (`npm run lint`: 0 error/warning; `npm run typecheck`: 0 error; `npm run test`: 4 file, 13/13 tes lulus dalam 1,12 s). G2 LULUS (`npm run build`: rute `/`, `/_not-found`, `/api/health` sukses setelah pengingat penasihat keamanan Next.js 16.4.3). Pemeriksaan keamanan: `grep SUPABASE_SECRET_KEY` hanya muncul di `.env.example`, `lib/env.ts`, `tests/unit/env.test.ts`, dan dokumen; bundel klien `.next/static` memiliki 0 kemunculan `service_role|SUPABASE_SECRET`. Verifikasi HTTP lokal: `/api/health` HTTP 200 JSON ok; `/` HTTP 200 dengan `lang="id"` dan `noindex`; `/rute-tidak-ada-cek-404` HTTP 404 menampilkan "Halaman tidak ditemukan" dan `noindex`. Delivery Gate `antislop` (mode during): PASS pada `app/not-found.tsx`, `app/error.tsx`, `lib/messages.ts`, dan komentar kode.
- File utama: `.env.example`, `lib/env.public.ts`, `lib/env.ts`, `lib/format.ts`, `lib/messages.ts`, `lib/errors.ts`, `app/api/health/route.ts`, `app/layout.tsx`, `app/not-found.tsx`, `app/error.tsx`, `tests/unit/env.test.ts`, `tests/unit/format.test.ts`, `tests/unit/errors.test.ts`, `package.json`, `package-lock.json`, `docs/PROJECT_PLAN.md`.
- Keputusan atau asumsi baru: Memisahkan `lib/env.public.ts` (diimpor ulang oleh `lib/env.ts`) agar komponen klien di fase mendatang tetap dapat membaca variabel `NEXT_PUBLIC_*` tanpa melanggar penjaga `server-only` pada `lib/env.ts`.
- Hasil ukur: 13/13 uji unit lulus (1,12 s); `/api/health` HTTP 200; `/rute-tidak-ada-cek-404` HTTP 404; 0 kebocoran `SUPABASE_SECRET`/`service_role` di `.next/static`.
- Cek manual untuk pemilik: (1) Buka `http://localhost:3000/api/health` dan pastikan keluar JSON `{ "status": "ok", "timestamp": "..." }`; (2) Buka `http://localhost:3000/rute-acak` dan pastikan tampil halaman 404 ramah berbahasa Indonesia; (3) Periksa sumber halaman (`Ctrl+U`) untuk memastikan `<html lang="id">` dan `<meta name="robots" content="noindex, nofollow"/>`; (4) Jalankan `npm run test` dan pastikan 13 tes lulus (termasuk `Rp1.500.000`, `14,5 m`, dan 49 kode Lampiran A).
- Langkah berikutnya: Periksa Gerbang Fase 0, lalu awali Prompt 04 (`P1-01`, `P1-02`, Fase 1 Design System) dengan `/1allclear`.

---

## LAMPIRAN E. LEDGER PROMPT

Status: `BELUM`, `MENUNGGU` (agent selesai, menunggu pemilik), `DISETUJUI` (pemilik lewat `/1allclear`), `GAGAL`, `WIP`. Agent memperbarui baris sendiri menjadi `MENUNGGU`; hanya pemilik menyetujui.

| No | Fase | Task | Judul | Status | Tanggal | Catatan |
|---|---|---|---|---|---|---|
| 01 | 0 | P0-01 | Audit lingkungan | DISETUJUI | 2026-11-26 | Disetujui via `/1allclear`; `.git` dan G1 aktif di P0-02/P0-03 |
| 02 | 0 | P0-02, P0-03 | Inisialisasi proyek, lint, dan CI | DISETUJUI | 2026-11-26 | Disetujui via `/1allclear`; CI GitHub Actions hijau (run `45664511919`) |
| 03 | 0 | P0-04, P0-05, P0-06 | Env, halaman dasar, utilitas format | MENUNGGU | 2026-11-26 | P0-04, P0-05, P0-06 selesai & dicentang; G1 (13/13 tes) & G2 lulus; Fase 0 siap melewati Gerbang Fase 0 |
| 04 | 1 | P1-01, P1-02 | Token warna 20/40/40 dan skrip uji | BELUM | | |
| 05 | 1 | P1-03 | Komponen dasar | BELUM | | |
| 06 | 1 | P1-04 | Komponen data | BELUM | | |
| 07 | 1 | P1-05, P1-06 | Shell aplikasi per peran dan kerangka cetak | BELUM | | |
| 08 | 2 | P2-00, P2-01 | Supabase DEV dan init CLI | BELUM | | |
| 09 | 2 | P2-02, P2-03 | Migrasi 0001 sampai 0004 | BELUM | | |
| 10 | 2 | P2-04 | Migrasi 0005 sampai 0007 | BELUM | | |
| 11 | 2 | P2-05 | Migrasi 0008: fungsi inti | BELUM | | |
| 12 | 2 | P2-06 | Migrasi 0009: stok dan persetujuan | BELUM | | |
| 13 | 2 | P2-07 | Migrasi 0010: alur | BELUM | | |
| 14 | 2 | P2-08 | Migrasi 0011 sampai 0015 | BELUM | | |
| 15 | 2 | P2-09 | Uji SQL | BELUM | | |
| 16 | 2 | P2-10, P2-11 | Tipe, pembungkus RPC, dan uji konkurensi | BELUM | | |
| 17 | 3 | P3-01, P3-02 | Klien Supabase, penjaga sesi, login | BELUM | | |
| 18 | 3 | P3-03, P3-04 | Pemilik pertama dan manajemen pengguna | BELUM | | |
| 19 | 3 | P3-05 | Profil dan uji izin UI | BELUM | | |
| 20 | 4 | P4-01, P4-02 | Pengaturan studio dan kategori | BELUM | | |
| 21 | 4 | P4-03 | Produk dan kebutuhan kain per ukuran | BELUM | | |
| 22 | 4 | P4-04 | Bahan, pengganti, konsumsi | BELUM | | |
| 23 | 4 | P4-05, P4-06 | Pelanggan dan kesiapan data | BELUM | | |
| 24 | 5 | P5-01, P5-02 | Validasi dan formulir Pesanan Baru | BELUM | | |
| 25 | 5 | P5-03 | Daftar dan detail pesanan | BELUM | | |
| 26 | 5 | P5-04 | Revisi bernomor versi | BELUM | | |
| 27 | 5 | P5-05 | Salin pesanan dan berkas desain | BELUM | | |
| 28 | 6 | P6-01 | Panel cek stok langsung | BELUM | | |
| 29 | 6 | P6-02 | Terima pesanan dan invoice | BELUM | | |
| 30 | 6 | P6-03 | Override stok | BELUM | | |
| 31 | 6 | P6-04 | DP, SPK, dan pembatalan | BELUM | | |
| 32 | 6 | P6-05 | Hold, rollback, kedaluwarsa | BELUM | | |
| 33 | 7 | P7-01 | Antrean produksi dan SPK digital | BELUM | | |
| 34 | 7 | P7-02 | Ringkasan stok dan catat stok | BELUM | | |
| 35 | 7 | P7-03 | Mulai pemotongan | BELUM | | |
| 36 | 7 | P7-04 | Tahap produksi dan keterlambatan | BELUM | | |
| 37 | 7 | P7-05, P7-06 | Opname mingguan dan revisi terlambat | BELUM | | |
| 38 | 8 | P8-01 | Layar pengemasan | BELUM | | |
| 39 | 8 | P8-02 | Selesaikan pengemasan dan pengecualian | BELUM | | |
| 40 | 8 | P8-03 | Lembar rincian dan label paket | BELUM | | |
| 41 | 8 | P8-04, P8-05 | Pelunasan, pengiriman, laporan kesalahan | BELUM | | |
| 42 | 9 | P9-01, P9-02 | Dasbor pemilik, admin, produksi | BELUM | | |
| 43 | 9 | P9-03, P9-04 | Laporan, ekspor CSV, audit, persetujuan | BELUM | | |
| 44 | 10 | P10-01, P10-02 | Uji unit dan matriks izin | BELUM | | |
| 45 | 10 | P10-03 | Konkurensi dan idempotensi | BELUM | | |
| 46 | 10 | P10-04 | Uji E2E alur utama | BELUM | | |
| 47 | 10 | P10-05 | Aksesibilitas, kontras, proporsi warna | BELUM | | |
| 48 | 10 | P10-06 | Performa dan pengerasan | BELUM | | |
| 49 | 11 | P11-01 | Supabase PRODUKSI dan RUNBOOK | BELUM | | |
| 50 | 11 | P11-02 | Deploy aplikasi | BELUM | | |
| 51 | 11 | P11-03 | Data awal PRODUKSI | BELUM | | |
| 52 | 11 | P11-04, P11-05 | Cadangan, pemulihan, panduan | BELUM | | |
| 53 | 11 | P11-06 | Jalan paralel dan go-live | BELUM | | |

---
## LAMPIRAN F. CATATAN VERIFIKASI DAN BERKAS UJI

### F.1 Lingkungan dan hasil

- PostgreSQL 16.15 (Ubuntu 24.04), peran `anon`, `authenticated`, `service_role`, dan `auth.uid()` ditiru oleh stub F.2.
- 13 berkas migrasi (0001 sampai 0013) dimuat berurutan tanpa galat. Berkas 0014 (pg_cron) dan 0015 (storage) tidak dimuat.
- Skenario uji F.3: **119 assertion** (nama di F.5) lulus semua, dijalankan sebagai peran `authenticated` dan `anon` lewat `set role` dan `set request.jwt.claim.sub`.
- Uji konkurensi F.4: 8 sesi psql serentak memanggil `accept_order` untuk 8 pesanan (3 m per pesanan) pada stok 10 m: tepat 3 diterima, 5 ditolak, total reservasi 9 m.
- `check-contrast.mjs`: semua pasangan lulus. `check-color-share.mjs`: gambar sintetis 40/40/20 lulus, gambar dominan orchid gagal.
- **Tidak diuji:** pg_cron (0014), Storage nyata (0015), Supabase Auth, JWT lewat PostgREST, tampilan aplikasi.

### F.2 Stub Supabase (hanya untuk uji lokal, bukan migrasi)

```sql
-- HANYA UNTUK PENGUJIAN LOKAL (bukan migration). Meniru bagian Supabase yang dipakai skema.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists extensions;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, service_role, anon;
grant execute on function auth.uid() to authenticated, service_role, anon;
grant usage on schema extensions to anon, authenticated, service_role;
```

### F.3 Skenario uji SQL

Jalankan dengan `psql` (memakai meta-perintah `\set`) pada database kosong setelah stub dan migrasi 0001 sampai 0013 dimuat. Urutan: `00_setup.sql`, `01_flow.sql`, `02_flow2.sql`, `03_flow3.sql`. Pesan `LULUS: ...` muncul sebagai NOTICE; galat menghentikan skrip.

#### `tests/sql/00_setup.sql`

```sql
\set ON_ERROR_STOP on
create schema if not exists t;
create or replace function t.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin if p_cond is not true then raise exception 'GAGAL: %', p_name; end if; raise notice 'LULUS: %', p_name; end $$;
create or replace function t.raises(p_sql text, p_code text, p_name text) returns void language plpgsql as $$
declare v_msg text;
begin
  begin execute p_sql; exception when others then v_msg := sqlerrm; end;
  if v_msg is null then raise exception 'GAGAL (tidak ada galat): %', p_name; end if;
  if position(p_code in v_msg) = 0 then raise exception 'GAGAL (galat berbeda "%"): %', v_msg, p_name; end if;
  raise notice 'LULUS: %', p_name;
end $$;
grant usage on schema t to public; grant execute on all functions in schema t to public;

-- pengguna
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','pemilik@contoh.test','{"full_name":"CONTOH Pemilik"}'),
 ('00000000-0000-0000-0000-0000000000a2','admin@contoh.test','{"full_name":"CONTOH Admin"}'),
 ('00000000-0000-0000-0000-0000000000a3','produksi@contoh.test','{"full_name":"CONTOH Produksi"}'),
 ('00000000-0000-0000-0000-0000000000a4','adminpack@contoh.test','{"full_name":"CONTOH Admin Merangkap Packing"}'),
 ('00000000-0000-0000-0000-0000000000a5','tanparole@contoh.test','{"full_name":"CONTOH Tanpa Peran"}');
insert into public.user_roles (user_id, role) values
 ('00000000-0000-0000-0000-0000000000a1','pemilik'),
 ('00000000-0000-0000-0000-0000000000a2','admin'),
 ('00000000-0000-0000-0000-0000000000a3','produksi'),
 ('00000000-0000-0000-0000-0000000000a4','admin'),('00000000-0000-0000-0000-0000000000a4','produksi');

update public.studio_settings set waste_percent = 0 where id = 1;   -- angka uji tepat: 14 potong x 1,0 m = 14 m

insert into public.customers (id, name, group_type) values
 ('c0000000-0000-0000-0000-000000000001','CONTOH Komunitas Futsal','community'),
 ('c0000000-0000-0000-0000-000000000002','CONTOH Dinas Kecamatan','institution');

insert into public.materials (id, name, kind, unit, min_stock, track_per_order) values
 ('b0000000-0000-0000-0000-000000000001','CONTOH American Drill Navy','fabric','meter',5,true),
 ('b0000000-0000-0000-0000-000000000002','CONTOH American Drill Hijau Dinas','fabric','meter',5,true),
 ('b0000000-0000-0000-0000-000000000003','CONTOH Kancing PDH','accessory','pcs',50,true),
 ('b0000000-0000-0000-0000-000000000004','CONTOH Tinta Plastisol Putih','ink','kg',2,false);

insert into public.products (id, category_id, name, slug)
 select 'd0000000-0000-0000-0000-000000000001', id, 'CONTOH Kaos Cotton','contoh-kaos' from public.product_categories where slug='kaos-sablon';
insert into public.products (id, category_id, name, slug)
 select 'd0000000-0000-0000-0000-000000000002', id, 'CONTOH PDH Lengan Panjang','contoh-pdh' from public.product_categories where slug='pdh';
insert into public.products (id, category_id, name, slug)
 select 'd0000000-0000-0000-0000-000000000003', id, 'CONTOH PDL Lapangan','contoh-pdl' from public.product_categories where slug='pdl';

insert into public.product_size_specs (product_id, size, fabric_per_unit) values
 ('d0000000-0000-0000-0000-000000000001','S',1.0),('d0000000-0000-0000-0000-000000000001','M',1.1),
 ('d0000000-0000-0000-0000-000000000001','L',1.2),('d0000000-0000-0000-0000-000000000001','XL',1.3),
 ('d0000000-0000-0000-0000-000000000002','M',2.0),('d0000000-0000-0000-0000-000000000002','L',2.2),
 ('d0000000-0000-0000-0000-000000000002','XL',2.4),('d0000000-0000-0000-0000-000000000002','KHUSUS',2.6),
 ('d0000000-0000-0000-0000-000000000003','L',2.5),('d0000000-0000-0000-0000-000000000003','XL',2.7);
insert into public.consumption_rules (product_id, material_id, qty_per_unit) values
 ('d0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003', 7),   -- 7 kancing per PDH
 ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004', 0.05); -- tinta tidak dilacak per pesanan
insert into public.material_alternatives (material_id, alternative_id, note) values
 ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','CONTOH pengganti');
```

#### `tests/sql/01_flow.sql`

```sql
\set ON_ERROR_STOP on
\set owner 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a1''; set role authenticated;'
\set admin 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a2''; set role authenticated;'
\set prod  'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a3''; set role authenticated;'
\set adminpack 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a4''; set role authenticated;'
\set norole 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a5''; set role authenticated;'
\set anon 'reset role; set role anon;'
\set su 'reset role;'

reset role;
create table if not exists t.ctx (k text primary key, v text); grant all on t.ctx to public;
create or replace function t.put(p_k text, p_v text) returns void language sql as $$ insert into t.ctx values (p_k, p_v) on conflict (k) do update set v = excluded.v $$;
create or replace function t.get(p_k text) returns text language sql stable as $$ select v from t.ctx where k = p_k $$;
grant execute on all functions in schema t to public;

\echo '== T01 anon tidak punya akses'
:anon
do $$ begin
  perform t.raises('select count(*) from public.orders', 'permission denied', 'T01a anon tidak dapat membaca orders');
  perform t.raises('select public.has_role(''admin'')', 'permission denied', 'T01b anon tidak dapat memanggil has_role');
end $$;

\echo '== T02 stok awal oleh produksi'
:prod
do $$ declare r jsonb; begin
  r := public.record_movement('b0000000-0000-0000-0000-000000000001', 'purchase_in', 10, 'stok awal uji');
  perform t.ok((r->>'ok')::boolean and (r->>'balance')::numeric = 10, 'T02a produksi mencatat stok masuk 10 meter');
  perform t.raises($q$select public.record_movement('b0000000-0000-0000-0000-000000000001','adjustment', 5, 'x')$q$, 'FORBIDDEN', 'T02b produksi tidak boleh menyesuaikan stok langsung');
  perform t.raises($q$update public.stock_movements set quantity_delta = 99$q$, 'permission denied', 'T02c pergerakan stok tidak dapat diubah');
  perform t.raises($q$delete from public.stock_movements$q$, 'permission denied', 'T02d pergerakan stok tidak dapat dihapus');
end $$;

\echo '== T03 admin: hak akses dan validasi item'
:admin
do $$ declare r jsonb; begin
  perform t.raises($q$select public.record_movement('b0000000-0000-0000-0000-000000000001','purchase_in', 5, 'x')$q$, 'FORBIDDEN', 'T03a admin tidak boleh mencatat stok');
  perform t.raises($q$insert into public.stock_movements (material_id, movement_type, quantity_delta, reason) values ('b0000000-0000-0000-0000-000000000001','adjustment',1,'x')$q$, 'permission denied', 'T03b admin tidak dapat menulis stock_movements langsung');
  perform t.raises($q$select public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 7, 100000, null, null, null,
      jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001','recipient_label','Budi')))$q$,
      'INVALID_ITEM:PERSONALIZATION', 'T03c personalisasi ditolak untuk kaos');
  perform t.raises($q$select public.create_draft_order('c0000000-0000-0000-0000-000000000002', current_date + 7, 100000, null, null, null,
      jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000002','size','KHUSUS','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001')))$q$,
      'INVALID_ITEM:SIZE_NOTE', 'T03d ukuran KHUSUS wajib catatan ukuran');
  perform t.raises($q$select public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date - 1, 100000, null, null, null,
      jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001')))$q$,
      'INVALID_DEADLINE', 'T03e tenggat lampau ditolak');
end $$;

\echo '== T04 cek stok memblokir penerimaan (U1)'
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 14, 3000000, 'CONTOH: sepakat 14 kaos S', 'sablon dada', 'catatan internal',
         jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',14,'fabric_material_id','b0000000-0000-0000-0000-000000000001')));
  v_id := (r->>'order_id')::uuid; perform t.put('A', v_id::text);
  perform t.ok((r->>'order_number') ~ '^DS-[0-9]{4}-0001$', 'T04a nomor pesanan format DS-YYMM-0001');
  r := public.accept_order(v_id);
  perform t.ok((r->>'ok')::boolean is false and r->>'code' = 'STOCK_SHORTAGE', 'T04b penerimaan ditolak saat stok kurang');
  perform t.ok((r->'shortages'->0->>'shortage')::numeric = 4.000 and (r->'shortages'->0->>'available')::numeric = 10.000, 'T04c kekurangan 4 dari tersedia 10 (kebutuhan 14)');
  perform t.ok((select status from public.orders where id = v_id) = 'draft', 'T04d status tetap draft');
  perform t.ok((select count(*) from public.stock_reservations where order_id = v_id) = 0, 'T04e tidak ada reservasi');
  perform t.ok((select shortage from public.check_stock(v_id) limit 1) = 4.000, 'T04f check_stock melaporkan kekurangan 4');
  r := public.preview_stock(jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',14,'fabric_material_id','b0000000-0000-0000-0000-000000000001')));
  perform t.ok((r->>'blocked')::boolean and (r->'rows'->0->>'shortage')::numeric = 4.000, 'T04g preview_stock pada formulir belum tersimpan memblokir dan melaporkan kekurangan 4');
  r := public.preview_stock(jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','XXL','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001')));
  perform t.ok(jsonb_array_length(r->'missing') = 1 and (r->>'blocked')::boolean, 'T04h preview_stock melaporkan ukuran tanpa aturan konsumsi');
end $$;

\echo '== T05 aturan konsumsi kosong tidak boleh lolos diam-diam'
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 14, 500000, null, null, null,
         jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','XXL','quantity',2,'fabric_material_id','b0000000-0000-0000-0000-000000000001')));
  v_id := (r->>'order_id')::uuid;
  r := public.accept_order(v_id);
  perform t.ok(r->>'code' = 'CONSUMPTION_RULE_MISSING', 'T05a ukuran tanpa aturan konsumsi menghasilkan CONSUMPTION_RULE_MISSING');
end $$;

\echo '== T06 override pemilik (U2) dan status menunggu bahan'
:admin
do $$ declare v_ap uuid; begin
  v_ap := public.request_override(t.get('A')::uuid, 'Supplier restock Jumat', current_date + 5);
  perform t.put('AP', v_ap::text);
  perform t.raises(format('select public.decide_approval(%L, true)', v_ap), 'FORBIDDEN', 'T06a admin tidak dapat menyetujui override');
  perform t.raises(format('select public.request_override(%L, ''lagi'', current_date + 3)', t.get('A')), 'ALREADY_PENDING', 'T06b tidak ada dua permintaan override tertunda');
end $$;
:owner
do $$ declare r jsonb; o public.orders; begin
  r := public.decide_approval(t.get('AP')::uuid, true, 'Disetujui');
  perform t.ok((r->>'ok')::boolean, 'T06c pemilik menyetujui override');
  select * into o from public.orders where id = t.get('A')::uuid;
  perform t.ok(o.status = 'accepted' and o.material_hold and o.material_hold_eta = current_date + 5, 'T06d pesanan diterima dengan material_hold dan ETA');
  perform t.ok(o.dp_amount = 1500000 and o.invoice_number ~ '^INV-[0-9]{4}-0001$', 'T06e invoice terbit dan DP 50 persen');
  perform t.ok((select quantity from public.stock_reservations where order_id = o.id and status='active') = 14.000, 'T06f reservasi 14 meter dibuat');
  perform t.ok((select available from public.v_stock_overview where material_id = 'b0000000-0000-0000-0000-000000000001') = -4.000, 'T06g stok tersedia negatif -4 (backorder)');
end $$;

\echo '== T07 pesanan lain diblokir selama stok tersedia negatif'
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000002', current_date + 10, 400000, null, null, null,
         jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',2,'fabric_material_id','b0000000-0000-0000-0000-000000000001')));
  v_id := (r->>'order_id')::uuid; perform t.put('B', v_id::text);
  r := public.accept_order(v_id);
  perform t.ok(r->>'code' = 'STOCK_SHORTAGE', 'T07a pesanan B diblokir karena bahan sudah dipesan pesanan A');
end $$;

\echo '== T08 pembelian bahan membebaskan hold; B kini dapat diterima'
:prod
do $$ declare r jsonb; begin
  r := public.record_movement('b0000000-0000-0000-0000-000000000001', 'purchase_in', 20, 'restock');
  perform t.ok((r->>'balance')::numeric = 30, 'T08a saldo 30 setelah pembelian 20');
end $$;
:su
do $$ begin
  perform t.ok((select not material_hold from public.orders where id = t.get('A')::uuid), 'T08b hold pesanan A dibebaskan setelah stok menutup reservasi');
end $$;

:admin
do $$ declare r jsonb; begin
  r := public.accept_order(t.get('B')::uuid);
  perform t.ok((r->>'ok')::boolean and not (r->>'material_hold')::boolean, 'T08c pesanan B kini diterima tanpa hold (stok 30, reservasi 16)');
end $$;

\echo '== T09 RLS menurut peran'
:prod
do $$ begin
  perform t.ok((select count(*) from public.orders) = 0, 'T09a produksi tidak melihat tabel orders');
  perform t.ok((select count(*) from public.customers) = 0, 'T09b produksi tidak melihat pelanggan');
  perform t.ok((select count(*) from public.payments) = 0, 'T09c produksi tidak melihat pembayaran');
  perform t.ok((select count(*) from public.v_orders_production) >= 2, 'T09d produksi melihat v_orders_production');
  perform t.ok((select count(*) from public.audit_logs) = 0, 'T09e produksi tidak melihat audit log');
  perform t.ok(not exists (select 1 from information_schema.columns where table_schema='public' and table_name='v_orders_production' and column_name in ('agreed_total','dp_amount','chat_summary','notes','invoice_number')),
               'T09f v_orders_production tidak memuat harga, DP, ringkasan chat, catatan internal');
end $$;
:norole
do $$ begin
  perform t.ok((select count(*) from public.v_orders_production) = 0, 'T09g pengguna tanpa peran tidak melihat apa pun');
  perform t.raises($q$select * from public.check_stock('00000000-0000-0000-0000-000000000000')$q$, 'FORBIDDEN', 'T09h pengguna tanpa peran ditolak fungsi');
end $$;
:admin
do $$ begin
  perform t.ok((select count(*) from public.orders) >= 3, 'T09i admin melihat orders');
  perform t.ok((select count(*) from public.audit_logs) = 0, 'T09j admin tidak melihat audit log');
end $$;
:owner
do $$ begin perform t.ok((select count(*) from public.audit_logs) > 0, 'T09k pemilik melihat audit log berisi catatan'); end $$;

\echo '== T10 DP dan SPK'
:admin
do $$ declare p uuid; r jsonb; begin
  perform t.raises(format('select public.transition_status(%L, ''spk_issued'')', t.get('A')), 'INVALID_TRANSITION', 'T10a SPK tidak dapat terbit sebelum DP');
  p := public.record_payment(t.get('A')::uuid, 'dp', 1000000, 'BCA', 'DP sebagian');
  r := public.settle_payment(p);
  perform t.ok((select status from public.v_orders_production where id = t.get('A')::uuid) = 'accepted', 'T10b DP sebagian belum membuka SPK');
  p := public.record_payment(t.get('A')::uuid, 'dp', 500000, 'Mandiri', 'pelunasan DP');
  r := public.settle_payment(p);
  perform t.ok((select status from public.v_orders_production where id = t.get('A')::uuid) = 'dp_received', 'T10c DP penuh settled menjadikan dp_received');
  perform t.ok((select expires_at is null from (select expires_at from public.stock_reservations where order_id = t.get('A')::uuid and status = 'active') x), 'T10d reservasi tidak lagi kedaluwarsa setelah DP');
  perform public.transition_status(t.get('A')::uuid, 'spk_issued');
  perform t.ok((select status from public.v_orders_production where id = t.get('A')::uuid) = 'spk_issued', 'T10e SPK terbit');
end $$;

\echo '== T11 mulai pemotongan wajib pemakaian dan sisa (U4, U5)'
:prod
do $$ declare r jsonb; begin
  r := public.start_cutting(t.get('A')::uuid, '[]'::jsonb);
  perform t.ok(r->>'code' = 'USAGE_REQUIRED', 'T11a pemakaian kosong ditolak');
  r := public.start_cutting(t.get('A')::uuid, jsonb_build_array(jsonb_build_object('material_id','b0000000-0000-0000-0000-000000000002','quantity',3)));
  perform t.ok(r->>'code' in ('USAGE_MISSING'), 'T11b bahan dicadangkan tanpa pemakaian ditolak');
  r := public.start_cutting(t.get('A')::uuid, jsonb_build_array(jsonb_build_object('material_id','b0000000-0000-0000-0000-000000000001','quantity',14.5)));
  perform t.ok(r->>'code' = 'REMNANT_REQUIRED', 'T11c sisa potongan wajib diisi atau dikonfirmasi tidak ada');
  r := public.start_cutting(t.get('A')::uuid, jsonb_build_array(jsonb_build_object('material_id','b0000000-0000-0000-0000-000000000001','quantity',14.5)),
                            jsonb_build_array(jsonb_build_object('material_id','b0000000-0000-0000-0000-000000000001','quantity',20)));
  perform t.ok(r->>'code' = 'REMNANT_EXCEEDS_USAGE', 'T11d sisa melebihi pemakaian ditolak');
  r := public.start_cutting(t.get('A')::uuid, jsonb_build_array(jsonb_build_object('material_id','b0000000-0000-0000-0000-000000000001','quantity',14.5)),
                            jsonb_build_array(jsonb_build_object('material_id','b0000000-0000-0000-0000-000000000001','quantity',0.5)));
  perform t.ok((r->>'ok')::boolean, 'T11e pemotongan dimulai dengan pemakaian 14,5 dan sisa 0,5');
end $$;
:su
do $$ begin
  perform t.ok((select on_hand_main from public.v_stock_overview where material_id='b0000000-0000-0000-0000-000000000001') = 15.5, 'T11f stok utama 30 - 14,5 = 15,5');
  perform t.ok((select on_hand_remnant from public.v_stock_overview where material_id='b0000000-0000-0000-0000-000000000001') = 0.5, 'T11g kolam sisa 0,5');
  perform t.ok((select status from public.orders where id = t.get('A')::uuid) = 'cutting', 'T11h status cutting');
  perform t.ok((select count(*) from public.stock_reservations where order_id = t.get('A')::uuid and status = 'consumed') = 1, 'T11i reservasi A berstatus consumed');
  perform t.ok((select count(*) from public.production_stage_logs where order_id = t.get('A')::uuid and stage = 'cutting' and finished_at is null) = 1, 'T11j log tahap cutting terbuka');
end $$;

\echo '== T12 tahap produksi dan alasan keterlambatan'
:prod
do $$ begin
  perform public.transition_status(t.get('A')::uuid, 'decorating');
  perform public.transition_status(t.get('A')::uuid, 'sewing', null, 'drying_weather', 'hujan, pengeringan sablon tertunda');
  perform public.transition_status(t.get('A')::uuid, 'qc_packing', null, 'seamstress_capacity', 'penjahit tidak lengkap');
  perform t.raises(format('select public.transition_status(%L, ''decorating'')', t.get('A')), 'INVALID_TRANSITION', 'T12a tahap tidak dapat mundur lewat transition_status');
end $$;
:admin
do $$ begin
  perform t.raises(format('select public.transition_status(%L, ''sewing'')', t.get('B')), 'FORBIDDEN', 'T12b admin tidak mengubah tahap produksi');
end $$;
:su
do $$ begin
  perform t.ok((select count(*) from public.v_stage_durations where order_id = t.get('A')::uuid) = 3, 'T12c tiga tahap tercatat durasinya');
  perform t.ok((select delay_reason from public.production_stage_logs where order_id = t.get('A')::uuid and stage='decorating') = 'drying_weather', 'T12d alasan keterlambatan cuaca tersimpan');
end $$;
```

#### `tests/sql/02_flow2.sql`

```sql
\set ON_ERROR_STOP on
\set owner 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a1''; set role authenticated;'
\set admin 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a2''; set role authenticated;'
\set prod  'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a3''; set role authenticated;'
\set adminpack 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a4''; set role authenticated;'
\set su 'reset role;'

\echo '== T13 verifikasi pengemasan per ukuran (U7, U8)'
:prod
do $$ declare r jsonb; v_item uuid; begin
  select id into v_item from public.order_items where order_id = t.get('A')::uuid;
  perform t.put('A_ITEM', v_item::text);
  perform public.save_package(t.get('A')::uuid, 1, jsonb_build_array(jsonb_build_object('order_item_id', v_item, 'quantity', 10)));
  r := public.verify_packing(t.get('A')::uuid);
  perform t.ok((r->>'ok')::boolean is false and (r->'lines'->0->>'diff')::int = -4, 'T13a verify_packing: dipesan 14, dikemas 10, selisih -4');
  r := public.complete_packing(t.get('A')::uuid);
  perform t.ok(r->>'code' = 'PACKING_MISMATCH', 'T13b penyelesaian pengemasan diblokir saat selisih');
  perform public.save_package(t.get('A')::uuid, 2, jsonb_build_array(jsonb_build_object('order_item_id', v_item, 'quantity', 4)));
  r := public.complete_packing(t.get('A')::uuid);
  perform t.ok((r->>'ok')::boolean and r->>'result' = 'match', 'T13c dua paket 10 + 4 = 14 dapat diselesaikan');
end $$;
:su
do $$ begin
  perform t.ok((select count(*) from public.packing_checks where order_id = t.get('A')::uuid and result = 'mismatch') = 1, 'T13d ketidakcocokan tersimpan di packing_checks walau fungsi tidak melempar galat');
  perform t.ok((select status from public.orders where id = t.get('A')::uuid) = 'awaiting_final_payment', 'T13e status menunggu pelunasan');
end $$;

\echo '== T14 pengemasan PDH dengan penerima personal per potong'
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000002', current_date + 20, 4800000, 'CONTOH PDH kecamatan', 'bordir nama dada kanan', null,
        jsonb_build_array(
          jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000002','size','M','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001','recipient_label','CONTOH Kepala Seksi'),
          jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000002','size','L','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001','recipient_label','CONTOH Staf Pertama'),
          jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000002','size','XL','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001','recipient_label','CONTOH Staf Kedua'),
          jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000002','size','KHUSUS','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000001','recipient_label','CONTOH Kepala Dinas','size_note','lingkar dada 112 cm, panjang lengan 64 cm')));
  v_id := (r->>'order_id')::uuid; perform t.put('P', v_id::text);
  r := public.accept_order(v_id);
  perform t.ok(r->>'code' = 'STOCK_SHORTAGE' and jsonb_array_length(r->'shortages') = 1 and r->'shortages'->0->>'material_name' like '%Kancing%', 'T14a kancing PDH (7 per potong, 28 total) kurang dan memblokir');
end $$;
:prod
do $$ begin perform public.record_movement('b0000000-0000-0000-0000-000000000003','purchase_in',100,'kancing masuk'); end $$;
:admin
do $$ declare r jsonb; begin
  r := public.accept_order(t.get('P')::uuid);
  perform t.ok((r->>'ok')::boolean, 'T14b PDH diterima setelah kancing masuk');
  perform t.ok((select quantity from public.stock_reservations where order_id = t.get('P')::uuid and material_id = 'b0000000-0000-0000-0000-000000000003' and status='active') = 28, 'T14c kancing dicadangkan 28 pcs');
  perform t.ok((select quantity from public.stock_reservations where order_id = t.get('P')::uuid and material_id = 'b0000000-0000-0000-0000-000000000001' and status='active') = 9.2, 'T14d kain dicadangkan 9,2 m (2,0 + 2,2 + 2,4 + 2,6)');
end $$;
:su
update public.orders set status = 'qc_packing' where id = (select t.get('P')::uuid);
insert into public.production_stage_logs (order_id, stage) values ((select t.get('P')::uuid), 'qc_packing');
:prod
do $$ declare r jsonb; v_lines uuid[]; begin
  select array_agg(id order by line_no) into v_lines from public.order_items where order_id = t.get('P')::uuid;
  perform public.save_package(t.get('P')::uuid, 1, jsonb_build_array(
     jsonb_build_object('order_item_id', v_lines[1], 'quantity', 1), jsonb_build_object('order_item_id', v_lines[2], 'quantity', 1), jsonb_build_object('order_item_id', v_lines[3], 'quantity', 1)));
  r := public.complete_packing(t.get('P')::uuid);
  perform t.ok(r->>'code' = 'PACKING_MISMATCH' and jsonb_array_length(r->'lines') = 1 and (r->'lines'->0->>'size') = 'KHUSUS', 'T14e baris PDH ukuran KHUSUS yang tidak ikut terkemas terdeteksi');
  perform public.save_package(t.get('P')::uuid, 2, jsonb_build_array(jsonb_build_object('order_item_id', v_lines[1], 'quantity', 1)));
  r := public.complete_packing(t.get('P')::uuid);
  perform t.ok(r->>'code' = 'PACKING_MISMATCH' and exists (select 1 from jsonb_array_elements(r->'lines') l where (l->>'diff')::int = 1 and l->>'size' = 'M'), 'T14f kelebihan satu M (salah penerima) terdeteksi sebagai +1');
  perform public.save_package(t.get('P')::uuid, 2, jsonb_build_array(jsonb_build_object('order_item_id', v_lines[4], 'quantity', 1)));
  r := public.complete_packing(t.get('P')::uuid);
  perform t.ok((r->>'ok')::boolean, 'T14g semua baris tepat: pengemasan PDH selesai');
end $$;

\echo '== T15 pelunasan, pengiriman, selesai'
:admin
do $$ declare p uuid; r jsonb; begin
  perform t.raises(format('select public.ship_order(%L, ''lalamove'')', t.get('A')), 'INVALID_TRANSITION', 'T15a tidak dapat dikirim sebelum pelunasan settled');
  p := public.record_payment(t.get('A')::uuid, 'final', 1500000, 'BCA', 'pelunasan');
  r := public.settle_payment(p);
  perform t.ok((select status from public.orders where id = t.get('A')::uuid) = 'ready_to_ship', 'T15b pelunasan settled membuka siap kirim');
  r := public.ship_order(t.get('A')::uuid, 'lalamove', 'order lalamove CONTOH', null);
  perform t.ok((r->>'ok')::boolean and (select status from public.orders where id = t.get('A')::uuid) = 'shipped', 'T15c pesanan dikirim');
  perform public.complete_order(t.get('A')::uuid);
  perform t.ok((select status from public.orders where id = t.get('A')::uuid) = 'completed' and (select delivered_at is not null from public.shipments where order_id = t.get('A')::uuid), 'T15d pesanan selesai dan tanggal terima tercatat');
end $$;

\echo '== T16 revisi sebelum dan sesudah pemotongan (U6)'
:admin
do $$ declare r jsonb; v_id uuid; v_item uuid; v_ap uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 12, 600000, null, null, null,
       jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','M','quantity',2,'fabric_material_id','b0000000-0000-0000-0000-000000000001')));
  v_id := (r->>'order_id')::uuid; perform t.put('Q', v_id::text);
  perform t.raises(format('select public.revise_order(%L, 99, %L::jsonb, null, null, null, ''x'')', v_id, '[{"product_id":"d0000000-0000-0000-0000-000000000001","size":"L","quantity":2,"fabric_material_id":"b0000000-0000-0000-0000-000000000001"}]'), 'VERSION_CONFLICT', 'T16a versi usang ditolak');
  r := public.revise_order(v_id, 1, '[{"product_id":"d0000000-0000-0000-0000-000000000001","size":"L","quantity":3,"fabric_material_id":"b0000000-0000-0000-0000-000000000001"}]'::jsonb, null, 900000, null, 'Pelanggan menambah jumlah');
  perform t.ok((r->>'ok')::boolean and (r->>'version')::int = 2, 'T16b revisi draf menaikkan versi menjadi 2');
  perform t.ok((select count(*) from public.order_revisions where order_id = v_id) = 2, 'T16c dua versi tersimpan');
end $$;
:su
update public.orders set status = 'sewing' where id = (select t.get('Q')::uuid);
:admin
do $$ declare v_item uuid; v_ap uuid; begin
  select id into v_item from public.order_items where order_id = t.get('Q')::uuid;
  perform t.raises(format('select public.revise_order(%L, 2, %L::jsonb, null, null, null, ''x'')', t.get('Q'), '[{"product_id":"d0000000-0000-0000-0000-000000000001","size":"S","quantity":3,"fabric_material_id":"b0000000-0000-0000-0000-000000000001"}]'), 'REVISION_LOCKED', 'T16d revisi biasa terkunci setelah pemotongan');
  v_ap := public.request_late_revision(t.get('Q')::uuid, jsonb_build_array(jsonb_build_object('order_item_id', v_item, 'size', 'XL')), 'Pelanggan salah ukuran', 'sekitar 1,3 m kain terpotong salah');
  perform t.put('QAP', v_ap::text);
end $$;
:owner
do $$ declare r jsonb; begin
  r := public.decide_approval(t.get('QAP')::uuid, true, 'setuju');
  perform t.ok((r->>'ok')::boolean and (select size from public.order_items where order_id = t.get('Q')::uuid) = 'XL' and (select current_version from public.orders where id = t.get('Q')::uuid) = 3, 'T16e revisi terlambat disetujui: ukuran berubah menjadi XL, versi 3');
  perform t.ok((select quantity from public.order_items where order_id = t.get('Q')::uuid) = 3, 'T16f jumlah tidak berubah');
  perform t.ok((select summary from public.order_revisions where order_id = t.get('Q')::uuid and version = 3) like '%Estimasi kerugian%', 'T16g estimasi kerugian tercatat pada riwayat revisi');
end $$;

\echo '== T17 opname mingguan (U12)'
:prod
do $$ declare r jsonb; v_sys numeric; begin
  select on_hand_main into v_sys from public.v_stock_overview where material_id = 'b0000000-0000-0000-0000-000000000001';
  perform t.put('SYS', v_sys::text);
  perform t.raises(format('select public.submit_count(%L, ''main'', %s)', 'b0000000-0000-0000-0000-000000000001', v_sys + 1), 'REASON_REQUIRED', 'T17a selisih tanpa alasan ditolak');
  r := public.submit_count('b0000000-0000-0000-0000-000000000001', 'main', v_sys + 0.1, 'selisih kecil hitungan ulang');
  perform t.ok(r->>'status' = 'applied', 'T17b selisih dalam toleransi 2 persen langsung diterapkan');
  r := public.submit_count('b0000000-0000-0000-0000-000000000001', 'main', 5, 'kain terpakai tidak tercatat');
  perform t.ok(r->>'status' = 'pending_approval', 'T17c selisih besar menunggu persetujuan pemilik');
  perform t.ok((select on_hand_main from public.v_stock_overview where material_id = 'b0000000-0000-0000-0000-000000000001') = v_sys + 0.1, 'T17d stok belum berubah sebelum persetujuan');
end $$;
:owner
do $$ declare v_ap uuid; begin
  select id into v_ap from public.approvals where kind = 'count_variance' and status = 'pending';
  perform public.decide_approval(v_ap, true, 'hitungan fisik benar');
  perform t.ok((select on_hand_main from public.v_stock_overview where material_id = 'b0000000-0000-0000-0000-000000000001') = 5, 'T17e setelah disetujui stok sistem menjadi 5');
end $$;
```

#### `tests/sql/03_flow3.sql`

```sql
\set ON_ERROR_STOP on
\set owner 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a1''; set role authenticated;'
\set admin 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a2''; set role authenticated;'
\set prod  'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a3''; set role authenticated;'
\set adminpack 'reset role; set request.jwt.claim.sub to ''00000000-0000-0000-0000-0000000000a4''; set role authenticated;'
\set su 'reset role;'

:prod
do $$ begin perform public.record_movement('b0000000-0000-0000-0000-000000000002','purchase_in',40,'hijau masuk'); end $$;

\echo '== T18 pembatalan dan aturan DP hangus'
:admin
do $$ declare r jsonb; v_id uuid; p uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 9, 900000, null, null, null,
       jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',3,'fabric_material_id','b0000000-0000-0000-0000-000000000002')));
  v_id := (r->>'order_id')::uuid; perform t.put('S', v_id::text);
  r := public.accept_order(v_id); perform t.ok((r->>'ok')::boolean, 'T18a pesanan S diterima (hijau tersedia)');
  p := public.record_payment(v_id, 'dp', 450000, 'BCA', null); perform public.settle_payment(p);
  perform t.raises(format('select public.cancel_order(%L, ''batal'', true)', v_id), 'FORBIDDEN', 'T18b admin tidak dapat menghanguskan DP');
  perform public.mark_materials_purchased(v_id);
end $$;
:owner
do $$ declare v_id uuid := t.get('S')::uuid; begin
  perform public.cancel_order(v_id, 'Pelanggan membatalkan setelah bahan dibeli', true);
  perform t.ok((select status = 'cancelled' and dp_forfeited from public.orders where id = v_id), 'T18c pemilik membatalkan dan menghanguskan DP (bahan sudah dibeli)');
  perform t.ok((select count(*) from public.stock_reservations where order_id = v_id and status = 'active') = 0, 'T18d reservasi dilepas');
end $$;
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 9, 300000, null, null, null,
       jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000002')));
  v_id := (r->>'order_id')::uuid; perform public.accept_order(v_id); perform t.put('S2', v_id::text);
end $$;
:owner
do $$ begin
  perform t.raises(format('select public.cancel_order(%L, ''batal'', true)', t.get('S2')), 'FORFEIT_NOT_ALLOWED', 'T18e DP tidak dapat hangus bila belum ada DP settled atau bahan belum dibeli');
end $$;
:admin
do $$ begin
  perform public.cancel_order(t.get('S2')::uuid, 'Pelanggan batal sebelum DP', false);
  perform t.ok((select status = 'cancelled' and not dp_forfeited from public.orders where id = t.get('S2')::uuid), 'T18f admin membatalkan sebelum DP tanpa hangus');
end $$;

\echo '== T19 revisi pesanan yang sudah diterima memeriksa ulang stok'
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 9, 900000, null, null, null,
       jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',3,'fabric_material_id','b0000000-0000-0000-0000-000000000002')));
  v_id := (r->>'order_id')::uuid; perform public.accept_order(v_id); perform t.put('V', v_id::text);
  r := public.revise_order(v_id, 1, '[{"product_id":"d0000000-0000-0000-0000-000000000001","size":"S","quantity":200,"fabric_material_id":"b0000000-0000-0000-0000-000000000002"}]'::jsonb, null, null, null, 'tambah besar');
  perform t.ok(r->>'code' = 'STOCK_SHORTAGE', 'T19a revisi yang melampaui stok ditolak');
  perform t.ok((select quantity from public.stock_reservations where order_id = v_id and status = 'active') = 3.000 and (select quantity from public.order_items where order_id = v_id) = 3, 'T19b reservasi dan item tidak berubah setelah penolakan');
  r := public.revise_order(v_id, 1, '[{"product_id":"d0000000-0000-0000-0000-000000000001","size":"L","quantity":5,"fabric_material_id":"b0000000-0000-0000-0000-000000000002"}]'::jsonb, null, null, null, 'ganti ukuran dan jumlah');
  perform t.ok((r->>'ok')::boolean and (select quantity from public.stock_reservations where order_id = v_id and status = 'active') = 6.000, 'T19c revisi yang muat menyesuaikan reservasi menjadi 6 m (5 x 1,2)');
end $$;

\echo '== T20 reservasi kedaluwarsa dilepas penjadwal'
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 9, 300000, null, null, null,
       jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',1,'fabric_material_id','b0000000-0000-0000-0000-000000000002')));
  v_id := (r->>'order_id')::uuid; perform public.accept_order(v_id); perform t.put('W', v_id::text);
end $$;
:su
update public.stock_reservations set expires_at = now() - interval '1 hour' where order_id = (select t.get('W')::uuid);
do $$ declare n integer; begin
  n := private.release_expired_reservations();
  perform t.ok(n >= 1 and (select status from public.orders where id = t.get('W')::uuid) = 'cancelled', 'T20a pesanan tanpa DP yang kedaluwarsa dibatalkan otomatis');
  perform t.ok((select count(*) from public.stock_reservations where order_id = t.get('W')::uuid and status = 'active') = 0, 'T20b reservasi dilepas');
  perform t.ok((select status from public.orders where id = t.get('V')::uuid) = 'accepted', 'T20c pesanan lain tidak terpengaruh');
end $$;

\echo '== T21 penahanan pesanan (hold)'
:admin
do $$ declare p uuid; begin
  perform public.set_hold(t.get('V')::uuid, 'Bukti transfer terindikasi palsu');
  p := public.record_payment(t.get('V')::uuid, 'dp', 450000, 'BCA', null);
  perform t.raises(format('select public.settle_payment(%L)', p), 'ORDER_ON_HOLD', 'T21a pesanan yang ditahan tidak berpindah status');
  perform t.raises(format('select public.release_hold(%L)', t.get('V')), 'FORBIDDEN', 'T21b admin tidak dapat melepas penahanan');
end $$;
:owner
do $$ begin perform public.release_hold(t.get('V')::uuid); perform t.ok(not (select on_hold from public.orders where id = t.get('V')::uuid), 'T21c pemilik melepas penahanan'); end $$;

\echo '== T22 pengguna dan peran'
:su
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a2';
:admin
do $$ begin perform t.raises($q$select public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 3, 1, null, null, null, '[{}]'::jsonb)$q$, 'FORBIDDEN', 'T22a pengguna nonaktif ditolak'); end $$;
:owner
do $$ begin perform public.set_user_active('00000000-0000-0000-0000-0000000000a2', true); perform t.ok(true, 'T22b pemilik mengaktifkan kembali pengguna'); end $$;
:admin
do $$ begin
  perform t.raises($q$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000a2','pemilik')$q$, 'row-level security', 'T22c admin tidak dapat memberi dirinya peran pemilik');
  perform t.raises($q$update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a3'$q$, 'permission denied', 'T22d admin tidak dapat menonaktifkan pengguna lain lewat tabel');
end $$;
:owner
do $$ begin
  perform t.raises($q$delete from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000a1' and role = 'pemilik'$q$, 'LAST_OWNER', 'T22e pemilik terakhir tidak dapat dihapus');
  perform t.raises($q$select public.set_user_active('00000000-0000-0000-0000-0000000000a1', false)$q$, 'CANNOT_DEACTIVATE_SELF', 'T22f pemilik tidak menonaktifkan dirinya sendiri');
end $$;

\echo '== T23 pemeriksa kedua pada pengemasan dan pengecualian'
:owner
update public.studio_settings set require_second_checker = true where id = 1;
:admin
do $$ declare r jsonb; v_id uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 9, 300000, null, null, null,
       jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',2,'fabric_material_id','b0000000-0000-0000-0000-000000000002')));
  v_id := (r->>'order_id')::uuid; perform public.accept_order(v_id); perform t.put('R', v_id::text);
end $$;
:su
update public.orders set status = 'qc_packing' where id = (select t.get('R')::uuid);
:adminpack
do $$ declare v_item uuid; r jsonb; begin
  select id into v_item from public.order_items where order_id = t.get('R')::uuid;
  perform public.save_package(t.get('R')::uuid, 1, jsonb_build_array(jsonb_build_object('order_item_id', v_item, 'quantity', 2)));
  r := public.complete_packing(t.get('R')::uuid);
  perform t.ok(r->>'code' = 'SECOND_CHECKER_REQUIRED', 'T23a pengemas tidak boleh memeriksa sendiri bila pemeriksa kedua diwajibkan');
end $$;
:prod
do $$ declare r jsonb; begin
  r := public.complete_packing(t.get('R')::uuid);
  perform t.ok((r->>'ok')::boolean, 'T23b pemeriksa berbeda dapat menyelesaikan');
end $$;
:owner
update public.studio_settings set require_second_checker = false where id = 1;
:admin
do $$ declare r jsonb; v_id uuid; v_ap uuid; begin
  r := public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 9, 300000, null, null, null,
       jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',4,'fabric_material_id','b0000000-0000-0000-0000-000000000002')));
  v_id := (r->>'order_id')::uuid; perform public.accept_order(v_id); perform t.put('X', v_id::text);
end $$;
:su
update public.orders set status = 'qc_packing' where id = (select t.get('X')::uuid);
:prod
do $$ declare v_item uuid; r jsonb; begin
  select id into v_item from public.order_items where order_id = t.get('X')::uuid;
  perform public.save_package(t.get('X')::uuid, 1, jsonb_build_array(jsonb_build_object('order_item_id', v_item, 'quantity', 3)));
  perform t.put('XITEM', v_item::text);
  r := public.complete_packing(t.get('X')::uuid);
  perform t.ok(r->>'code' = 'PACKING_MISMATCH', 'T23c selisih diblokir sebelum pengecualian');
  perform t.put('XAP', public.request_packing_exception(t.get('X')::uuid, 'Satu potong dikirim menyusul')::text);
end $$;
:owner
do $$ begin perform public.decide_approval(t.get('XAP')::uuid, true, 'boleh kirim bertahap'); end $$;
:prod
do $$ declare r jsonb; begin
  r := public.complete_packing(t.get('X')::uuid);
  perform t.ok((r->>'ok')::boolean and r->>'result' = 'exception', 'T23d dengan pengecualian disetujui pemilik, pengemasan selesai bertanda exception');
end $$;

\echo '== T24 hak eksekusi fungsi'
:su
do $$ begin
  perform t.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                            where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')), 'T24a anon tidak dapat mengeksekusi fungsi public mana pun');
  perform t.ok(not has_function_privilege('authenticated', 'public.log_audit()', 'execute')
           and not has_function_privilege('authenticated', 'public.validate_order_item()', 'execute')
           and not has_function_privilege('authenticated', 'public.guard_last_owner()', 'execute'), 'T24b fungsi pemicu tidak dapat dipanggil dari API');
  perform t.ok(not has_schema_privilege('authenticated', 'private', 'usage') and not has_schema_privilege('anon', 'private', 'usage'), 'T24c schema private tertutup untuk API');
  perform t.ok((select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) = 0, 'T24d RLS aktif pada seluruh tabel public');
  perform t.ok((select count(*) from public.audit_logs where table_name = 'orders') > 5, 'T24e audit log mencatat perubahan orders');
end $$;
```

### F.4 Uji konkurensi (bash)

```bash
#!/bin/bash
PSQL="su postgres -c"
q() { su postgres -c "psql -q -At -d dstest -c \"$1\""; }
cd /home/claude/gen
./runtests.sh 00_setup.sql >/dev/null 2>&1
q "insert into public.materials (id,name,kind,unit,min_stock) values ('b0000000-0000-0000-0000-0000000000f1','CONTOH Kain Uji Konkurensi','fabric','meter',0)"
q "insert into public.stock_movements (material_id,movement_type,quantity_delta,reason) values ('b0000000-0000-0000-0000-0000000000f1','purchase_in',10,'uji')"
ids=()
for i in 1 2 3 4 5 6 7 8; do
  id=$(q "set request.jwt.claim.sub to '00000000-0000-0000-0000-0000000000a2'; select (public.create_draft_order('c0000000-0000-0000-0000-000000000001', current_date + 9, 300000, null, null, null, jsonb_build_array(jsonb_build_object('product_id','d0000000-0000-0000-0000-000000000001','size','S','quantity',3,'fabric_material_id','b0000000-0000-0000-0000-0000000000f1')))->>'order_id')" | tail -1)
  ids+=("$id")
done
# 8 penerimaan serentak pada stok 10 m (tiap pesanan butuh 3 m): paling banyak 3 yang boleh lolos
for id in "${ids[@]}"; do
  ( su postgres -c "psql -q -At -d dstest -c \"reset role; set request.jwt.claim.sub to '00000000-0000-0000-0000-0000000000a2'; set role authenticated; select public.accept_order('$id')->>'ok'\"" > /tmp/conc_$id.out 2>&1 ) &
done
wait
ok=$(cat /tmp/conc_*.out | grep -c true); no=$(cat /tmp/conc_*.out | grep -c false)
sum=$(q "select coalesce(sum(quantity),0) from public.stock_reservations where material_id='b0000000-0000-0000-0000-0000000000f1' and status='active'")
echo "diterima=$ok ditolak=$no total_reservasi=${sum} m (stok 10 m)"
[ "$ok" = "3" ] && [ "$no" = "5" ] && echo "LULUS: konkurensi 8 penerimaan serentak, tepat 3 diterima, tidak ada pemakaian melebihi stok" || echo "GAGAL: konkurensi"
rm -f /tmp/conc_*.out
```

Catatan: skrip memakai `su postgres -c psql`; sesuaikan perintah koneksi di mesin lokal. Di DEV Supabase, ganti dengan skrip Node (P2-11) yang memanggil `accept_order` memakai akun uji.

### F.5 Daftar assertion

- T01a anon tidak dapat membaca orders
- T01b anon tidak dapat memanggil has_role
- T02a produksi mencatat stok masuk 10 meter
- T02b produksi tidak boleh menyesuaikan stok langsung
- T02c pergerakan stok tidak dapat diubah
- T02d pergerakan stok tidak dapat dihapus
- T03a admin tidak boleh mencatat stok
- T03b admin tidak dapat menulis stock_movements langsung
- T03c personalisasi ditolak untuk kaos
- T03d ukuran KHUSUS wajib catatan ukuran
- T03e tenggat lampau ditolak
- T04a nomor pesanan format DS-YYMM-0001
- T04b penerimaan ditolak saat stok kurang
- T04c kekurangan 4 dari tersedia 10 (kebutuhan 14)
- T04d status tetap draft
- T04e tidak ada reservasi
- T04f check_stock melaporkan kekurangan 4
- T04g preview_stock pada formulir belum tersimpan memblokir dan melaporkan kekurangan 4
- T04h preview_stock melaporkan ukuran tanpa aturan konsumsi
- T05a ukuran tanpa aturan konsumsi menghasilkan CONSUMPTION_RULE_MISSING
- T06a admin tidak dapat menyetujui override
- T06b tidak ada dua permintaan override tertunda
- T06c pemilik menyetujui override
- T06d pesanan diterima dengan material_hold dan ETA
- T06e invoice terbit dan DP 50 persen
- T06f reservasi 14 meter dibuat
- T06g stok tersedia negatif -4 (backorder)
- T07a pesanan B diblokir karena bahan sudah dipesan pesanan A
- T08a saldo 30 setelah pembelian 20
- T08b hold pesanan A dibebaskan setelah stok menutup reservasi
- T08c pesanan B kini diterima tanpa hold (stok 30, reservasi 16)
- T09a produksi tidak melihat tabel orders
- T09b produksi tidak melihat pelanggan
- T09c produksi tidak melihat pembayaran
- T09d produksi melihat v_orders_production
- T09e produksi tidak melihat audit log
- T09f v_orders_production tidak memuat harga, DP, ringkasan chat, catatan internal
- T09g pengguna tanpa peran tidak melihat apa pun
- T09h pengguna tanpa peran ditolak fungsi
- T09i admin melihat orders
- T09j admin tidak melihat audit log
- T09k pemilik melihat audit log berisi catatan
- T10a SPK tidak dapat terbit sebelum DP
- T10b DP sebagian belum membuka SPK
- T10c DP penuh settled menjadikan dp_received
- T10d reservasi tidak lagi kedaluwarsa setelah DP
- T10e SPK terbit
- T11a pemakaian kosong ditolak
- T11b bahan dicadangkan tanpa pemakaian ditolak
- T11c sisa potongan wajib diisi atau dikonfirmasi tidak ada
- T11d sisa melebihi pemakaian ditolak
- T11e pemotongan dimulai dengan pemakaian 14,5 dan sisa 0,5
- T11f stok utama 30 - 14,5 = 15,5
- T11g kolam sisa 0,5
- T11h status cutting
- T11i reservasi A berstatus consumed
- T11j log tahap cutting terbuka
- T12a tahap tidak dapat mundur lewat transition_status
- T12b admin tidak mengubah tahap produksi
- T12c tiga tahap tercatat durasinya
- T12d alasan keterlambatan cuaca tersimpan
- T13a verify_packing: dipesan 14, dikemas 10, selisih -4
- T13b penyelesaian pengemasan diblokir saat selisih
- T13c dua paket 10 + 4 = 14 dapat diselesaikan
- T13d ketidakcocokan tersimpan di packing_checks walau fungsi tidak melempar galat
- T13e status menunggu pelunasan
- T14a kancing PDH (7 per potong, 28 total) kurang dan memblokir
- T14b PDH diterima setelah kancing masuk
- T14c kancing dicadangkan 28 pcs
- T14d kain dicadangkan 9,2 m (2,0 + 2,2 + 2,4 + 2,6)
- T14e baris PDH ukuran KHUSUS yang tidak ikut terkemas terdeteksi
- T14f kelebihan satu M (salah penerima) terdeteksi sebagai +1
- T14g semua baris tepat: pengemasan PDH selesai
- T15a tidak dapat dikirim sebelum pelunasan settled
- T15b pelunasan settled membuka siap kirim
- T15c pesanan dikirim
- T15d pesanan selesai dan tanggal terima tercatat
- T16a versi usang ditolak
- T16b revisi draf menaikkan versi menjadi 2
- T16c dua versi tersimpan
- T16d revisi biasa terkunci setelah pemotongan
- T16e revisi terlambat disetujui: ukuran berubah menjadi XL, versi 3
- T16f jumlah tidak berubah
- T16g estimasi kerugian tercatat pada riwayat revisi
- T17a selisih tanpa alasan ditolak
- T17b selisih dalam toleransi 2 persen langsung diterapkan
- T17c selisih besar menunggu persetujuan pemilik
- T17d stok belum berubah sebelum persetujuan
- T17e setelah disetujui stok sistem menjadi 5
- T18a pesanan S diterima (hijau tersedia)
- T18b admin tidak dapat menghanguskan DP
- T18c pemilik membatalkan dan menghanguskan DP (bahan sudah dibeli)
- T18d reservasi dilepas
- T18e DP tidak dapat hangus bila belum ada DP settled atau bahan belum dibeli
- T18f admin membatalkan sebelum DP tanpa hangus
- T19a revisi yang melampaui stok ditolak
- T19b reservasi dan item tidak berubah setelah penolakan
- T19c revisi yang muat menyesuaikan reservasi menjadi 6 m (5 x 1,2)
- T20a pesanan tanpa DP yang kedaluwarsa dibatalkan otomatis
- T20b reservasi dilepas
- T20c pesanan lain tidak terpengaruh
- T21a pesanan yang ditahan tidak berpindah status
- T21b admin tidak dapat melepas penahanan
- T21c pemilik melepas penahanan
- T22a pengguna nonaktif ditolak
- T22b pemilik mengaktifkan kembali pengguna
- T22c admin tidak dapat memberi dirinya peran pemilik
- T22d admin tidak dapat menonaktifkan pengguna lain lewat tabel
- T22e pemilik terakhir tidak dapat dihapus
- T22f pemilik tidak menonaktifkan dirinya sendiri
- T23a pengemas tidak boleh memeriksa sendiri bila pemeriksa kedua diwajibkan
- T23b pemeriksa berbeda dapat menyelesaikan
- T23c selisih diblokir sebelum pengecualian
- T23d dengan pengecualian disetujui pemilik, pengemasan selesai bertanda exception
- T24a anon tidak dapat mengeksekusi fungsi public mana pun
- T24b fungsi pemicu tidak dapat dipanggil dari API
- T24c schema private tertutup untuk API
- T24d RLS aktif pada seluruh tabel public
- T24e audit log mencatat perubahan orders

### F.6 Skrip proporsi warna dan kontras

`scripts/check-color-share.mjs`:

```js
// Uji proporsi warna merek 20/40/40: #A678B9 (orchid) 20%, #8CA9BC (steel) 40%, #8B7CC7 (violet) 40%.
// Cara kerja: baca tangkapan layar PNG, ambil piksel "berwarna" (saturasi HSV >= 0.10 dan kecerahan 0.35-0.97),
// bagi menurut rona ke tiga keluarga, hitung porsi masing-masing. Netral (putih, abu, tinta) dan warna status
// (hijau, kuning, merah) di luar rentang rona merek tidak dihitung.
import fs from 'node:fs';
import { PNG } from 'pngjs';

export const TARGET = { steel: 40, violet: 40, orchid: 20 };
export const TOLERANCE_PP = 10; // selisih maksimum dalam poin persentase

export function classify(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max / 255, s = max === 0 ? 0 : (max - min) / max;
  if (s < 0.10 || v < 0.35 || v > 0.97) return null;
  let h;
  const d = max - min;
  if (d === 0) return null;
  if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h >= 170 && h < 230) return 'steel';
  if (h >= 230 && h < 268) return 'violet';
  if (h >= 268 && h < 330) return 'orchid';
  return null;
}

export function shareOfPng(buf) {
  const png = PNG.sync.read(buf);
  const count = { steel: 0, violet: 0, orchid: 0 };
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] < 255) continue;
    const c = classify(png.data[i], png.data[i + 1], png.data[i + 2]);
    if (c) count[c]++;
  }
  const total = count.steel + count.violet + count.orchid;
  if (total === 0) return null;
  return Object.fromEntries(Object.entries(count).map(([k, n]) => [k, (100 * n) / total]));
}

export function verdict(share) {
  if (!share) return { ok: false, reason: 'tidak ada piksel berwarna merek' };
  const diffs = Object.entries(TARGET).map(([k, t]) => [k, Math.abs(share[k] - t)]);
  const bad = diffs.filter(([, d]) => d > TOLERANCE_PP);
  return { ok: bad.length === 0, bad };
}

if (process.argv[1] && process.argv[1].endsWith('check-color-share.mjs')) {
  const files = process.argv.slice(2);
  if (files.length === 0) { console.error('Pemakaian: node scripts/check-color-share.mjs layar1.png layar2.png ...'); process.exit(2); }
  const sum = { steel: 0, violet: 0, orchid: 0 }; let n = 0;
  for (const f of files) {
    const s = shareOfPng(fs.readFileSync(f));
    if (!s) { console.log(`${f}: tidak ada piksel berwarna merek`); continue; }
    console.log(`${f}: steel ${s.steel.toFixed(1)}%  violet ${s.violet.toFixed(1)}%  orchid ${s.orchid.toFixed(1)}%`);
    for (const k of Object.keys(sum)) sum[k] += s[k]; n++;
  }
  const avg = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / Math.max(n, 1)]));
  const v = verdict(n ? avg : null);
  console.log(`RATA-RATA: steel ${avg.steel.toFixed(1)}% (40)  violet ${avg.violet.toFixed(1)}% (40)  orchid ${avg.orchid.toFixed(1)}% (20)  toleransi ${TOLERANCE_PP} poin`);
  console.log(v.ok ? 'LULUS' : 'GAGAL: ' + JSON.stringify(v.bad));
  process.exit(v.ok ? 0 : 1);
}
```

`scripts/check-contrast.mjs`:

```js
// Uji kontras WCAG 2.2: pasangan teks/latar wajib >= 4,5:1 (teks biasa) dan >= 3:1 (komponen UI besar).
export const TOKENS = {
  ink: '#1F1B2E', muted: '#5B5870', white: '#FFFFFF', canvas: '#F7F5FB',
  violet500: '#8B7CC7', violet600: '#685D95', violet700: '#5A5181', violet100: '#F1EFF8',
  steel500: '#8CA9BC', steel700: '#5B6E7A', steel100: '#F1F5F7',
  orchid500: '#A678B9', orchid700: '#6C4E78', orchid100: '#F4EFF7',
  successBg: '#E6F4EC', successFg: '#14633F', warningBg: '#FFF3D6', warningFg: '#7A4B00', dangerBg: '#FDE8E6', dangerFg: '#A42018',
};
export const PAIRS = [
  ['ink', 'white', 4.5], ['ink', 'canvas', 4.5], ['muted', 'white', 4.5], ['muted', 'canvas', 4.5],
  ['ink', 'violet500', 4.5], ['ink', 'steel500', 4.5], ['ink', 'orchid500', 4.5],
  ['white', 'violet600', 4.5], ['white', 'violet700', 4.5], ['violet700', 'white', 4.5], ['violet700', 'violet100', 4.5],
  ['steel700', 'white', 4.5], ['steel700', 'steel100', 4.5], ['orchid700', 'white', 4.5], ['orchid700', 'orchid100', 4.5],
  ['successFg', 'successBg', 4.5], ['warningFg', 'warningBg', 4.5], ['dangerFg', 'dangerBg', 4.5],
  ['violet600', 'white', 3], ['steel500', 'white', 1], // steel500 putih hanya dekoratif; tidak boleh dipakai sebagai teks
];
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
if (process.argv[1] && process.argv[1].endsWith('check-contrast.mjs')) {
  let fail = 0;
  for (const [fg, bg, min] of PAIRS) {
    const r = ratio(TOKENS[fg], TOKENS[bg]); const ok = r >= min;
    if (!ok) fail++;
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${fg} di atas ${bg}: ${r.toFixed(2)}:1 (min ${min}:1)`);
  }
  process.exit(fail ? 1 : 0);
}
```

Uji sintetis (`tests/unit/color-share.synthetic.test.ts` atau `synth.mjs`):

```js
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { shareOfPng, verdict } from './check-color-share.mjs';
function make(path, parts) {
  const W = 200, H = 100, png = new PNG({ width: W, height: H });
  const total = parts.reduce((a, p) => a + p[1], 0);
  let px = 0; const order = [];
  for (const [hex, n] of parts) for (let i = 0; i < Math.round(n / total * W * H); i++) order.push(hex);
  while (order.length < W * H) order.push('#FFFFFF');
  for (let i = 0; i < W * H; i++) {
    const n = parseInt(order[i].slice(1), 16);
    png.data[i * 4] = n >> 16; png.data[i * 4 + 1] = (n >> 8) & 255; png.data[i * 4 + 2] = n & 255; png.data[i * 4 + 3] = 255;
  }
  fs.writeFileSync(path, PNG.sync.write(png));
}
// 1) komposisi ideal ditambah banyak piksel netral dan status (harus diabaikan)
make('/tmp/ideal.png', [['#A678B9', 10], ['#8CA9BC', 20], ['#8B7CC7', 20], ['#FFFFFF', 30], ['#F7F5FB', 10], ['#1F1B2E', 5], ['#B3261E', 3], ['#14633F', 2]]);
// 2) komposisi salah: dominan orchid
make('/tmp/salah.png', [['#A678B9', 50], ['#8CA9BC', 10], ['#8B7CC7', 10], ['#FFFFFF', 30]]);
for (const f of ['/tmp/ideal.png', '/tmp/salah.png']) {
  const s = shareOfPng(fs.readFileSync(f)); const v = verdict(s);
  console.log(f, JSON.stringify(Object.fromEntries(Object.entries(s).map(([k, x]) => [k, +x.toFixed(1)]))), v.ok ? 'LULUS' : 'GAGAL');
}
```

---