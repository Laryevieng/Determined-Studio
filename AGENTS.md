# AGENTS.md — Sistem SCM Internal Determined Studio

## Peta Dokumen

- `docs/PROJECT_PLAN.md`: sumber kebenaran tunggal (protokol §0, status §1, stack §3, keputusan §4, peran §5, domain & R1–R13 §6, Design System §7, arsitektur §8, skema SQL §9, keamanan §10, layar §11, task §15, pertanyaan §18, Lampiran A–F).
- `prompting-struktur.txt`: urutan 53 prompt terstruktur dan 7 prompt khusus (`A`–`G`).
- `.agents/skills/`: 6 skill lokal `antislop` v3.2.32 (dirujuk pada blok pointer di bawah).

## Alur Wajib Setiap Sesi

1. Baca berurutan: `AGENTS.md` → `docs/PROJECT_PLAN.md` §0 → §1 (STATUS) → 5 entri terakhir Lampiran D → Lampiran E (Ledger Prompt).
2. Cek Ledger Lampiran E: bila prompt sebelumnya belum `DISETUJUI` dan pesan tidak diawali `/1allclear`, berhenti dan tanyakan kepada pemilik. Bila diawali `/1allclear`, tandai prompt sebelumnya `DISETUJUI` lalu lanjut.
3. Kerjakan hanya task yang ditunjuk prompt (baca "Kerjakan" dan "Selesai jika" di §15).
4. Penutup (§0.4): jalankan gate relevan, centang task di §15 hanya bila seluruh kriteria dan gate lulus, perbarui §1, tulis entri Lampiran D memakai template Lampiran C, ubah baris prompt di Lampiran E menjadi `MENUNGGU`, lalu commit dengan format `tipe(P?-??): ringkasan`.

## Ringkasan Aturan Keras (§0.2)

- **Plan menang:** bila kode dan plan berbeda, ikuti `docs/PROJECT_PLAN.md`, kecuali ada entri keputusan di §4.
- **Jangan mengarang data usaha:** pakai placeholder `TODO(pemilik)` atau data contoh fiktif berawalan `CONTOH`.
- **Aturan bisnis di database:** penegakan R1–R13 hidup di Postgres lewat RPC `SECURITY DEFINER` dan RLS; klien tidak menulis langsung ke tabel bisnis di luar §10.2.
- **Tabel append-only:** `stock_movements`, `audit_logs`, `order_revisions`, `packing_checks`, `order_status_history` tidak boleh di-`UPDATE` atau `DELETE`.
- **Keamanan rahasia:** `SUPABASE_SECRET_KEY` (service role) hanya untuk pembuatan pengguna (`P3-04`) dan skrip uji; tidak boleh masuk bundel klien (`.next`), repo, atau log. Jangan commit `.env*` selain `.env.example`.
- **Dependensi:** hanya whitelist §3.2; penambahan paket wajib entri keputusan di §4.
- **Bahasa dan UX:** antarmuka & pesan galat Bahasa Indonesia lewat `lib/messages.ts`; kode, tabel, dan kolom Bahasa Inggris. Mobile-first 360 px dengan target sentuh minimal 48 px.
- **Warna dan aksesibilitas:** hanya dari token §7; proporsi warna 40% Violet (`#8B7CC7`), 40% Steel (`#8CA9BC`), 20% Orchid (`#A678B9`) ±10 poin; teks putih dilarang di atas fill dasar `500`.
- **Filter antislop:** terapkan skill lokal `.agents/skills/` (§7.13, D-29) bersama §7; bila berbenturan, §0.2 dan §7 menang.
- **Kejujuran laporan:** jangan melemahkan RLS, grant, atau uji; laporkan hanya hasil uji yang benar-benar dijalankan (yang belum dijalankan tulis `belum diuji`).

## Perintah dan Gate (§0.7, §0.8)

- **G1 (setiap prompt):** `npm run lint && npm run typecheck && npm run test`
- **G2 (tutup fase / ubah rute):** G1 + `npm run build`
- **G3 (ubah database):** `npm run db:reset && npm run db:test` atau `npm run db:test:pg`
- **G4 (alur E2E):** `npm run test:e2e`
- **G5 (tampilan / gerbang fase UI):** `npm run check:contrast && npm run check:color-share && npm run test:a11y`
- **Format commit:** `tipe(P?-??): ringkasan` (`feat`, `fix`, `test`, `docs`, `chore`, `refactor`, `db`).

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.agents/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->
