# Lead Autopilot

Aplikasi internal untuk otomatisasi lead generation dan outreach B2B. Fokus 2 jasa:

- **Building Management**: aplikasi manajemen gedung/apartemen/P3SRS/PPPSRS. Target kontak: Pengadaan/Bendahara/GA. Cakupan nasional.
- **Office Training**: training Microsoft Office/Excel untuk pabrik/perkantoran. Target kontak: GA/HRD/Training/Purchasing. Fokus Bekasi/Cikarang.

## Fitur

### Lead Management
- **Auto discover lead** via SerpAPI Google Maps (`/api/leads/discover`) berdasarkan query/service.
- **Import CSV/XLSX** (`/api/leads/import`) dengan normalisasi kolom umum.
- **Database leads** MySQL dengan dedupe `service_type + company_name + email`.
- **Filter lead**: search, service, status, last contacted.

### Outreach Otomatis
- **Daily outreach**: pilih 10 lead `new` per service/hari, generate pesan personal via LLM, kirim email + WhatsApp, simpan log.
- **Run manual** dari Dashboard atau endpoint cron `POST /api/run/daily` dengan `x-cron-secret`.
- **Scheduler PM2/cron worker**: jalan otomatis jam 08:00 WIB (`worker/scheduler.ts`).

### Email & WhatsApp Gateway
- **SMTP outbound**: Nodemailer; konfigurasi via Settings UI/DB atau env fallback.
- **IMAP inbound**: worker baca email unseen, simpan ke inbox, mark seen, bisa auto-reply AI.
- **Baileys WhatsApp**: worker QR login, kirim pesan, terima pesan masuk, simpan inbox, bisa auto-reply AI. `WA_DRY_RUN=true` default.

### Marketing AI
- **Generate pesan outreach** (subject/email/WA) via gateway OpenAI-compatible (HCNSEC default).
- **Auto-reply inbound** untuk email/WA berdasarkan riwayat pesan, data lead, dan system prompt.
- Konfigurasi AI/provider, prompt, toggle auto-reply, batas reply di Settings.

### Monitoring & Admin
- **Dashboard**: ringkasan lead, status WA, discover/import/run.
- **Leads**: filter/search/status riwayat kontak.
- **Outreach**: riwayat `daily_runs` dan `outreach_logs` dengan filter channel/status/service.
- **Inbox**: pesan masuk/keluar email & WA, filter channel/direction/search, auto-refresh.
- **Settings**: SMTP, AI provider, WhatsApp blast, IMAP, Marketing AI, profil, update password.
- **Login/auth**: cookie session HMAC, middleware guard, seed user `a@a.com / 123`.

## Tech Stack

| Layer | Tech |
|---|---|
| Web | Next.js 15 App Router, React 19, TypeScript |
| UI | Tailwind CSS v4, lucide-react, custom AppShell |
| DB | MySQL 8, `mysql2/promise`, raw SQL schema/migrate |
| Email out | Nodemailer SMTP |
| Email in | ImapFlow + mailparser |
| WhatsApp | @whiskeysockets/baileys (unofficial) |
| AI | OpenAI-compatible chat completions (HCNSEC default) |
| Lead discovery | SerpAPI Google Maps engine |
| Validation/util | zod, dotenv, xlsx, csv-parse |
| Process manager | PM2 + ecosystem.config.cjs |

## Struktur Penting

```text
lead-autopilot/
  ecosystem.config.cjs        # PM2: web, wa, imap, scheduler
  scripts/schema.sql          # DB schema
  scripts/migrate.ts          # create DB/tables + seed user/settings
  src/app/                    # Next.js pages & API routes
  src/lib/                    # db, auth, settings, leads, llm, email, whatsapp, inbox, discover
  src/middleware.ts           # auth guard
  worker/baileys.ts           # WhatsApp worker + inbound handler
  worker/imap.ts              # IMAP inbound poller
  worker/scheduler.ts         # daily 08:00 WIB outreach
  data/                       # wa-auth, wa-status.json (gitignored)
```

## Cara Kerja

1. **Auth**: user login -> cookie `la_session` ditandatangani HMAC. Middleware memproteksi page/API kecuali login dan cron endpoint.
2. **Lead masuk**: discover SerpAPI atau import CSV/XLSX -> normalisasi -> `upsertLeads` ke tabel `leads`.
3. **Outreach harian**: `/api/run/daily` atau scheduler memilih 10 lead `new` per service yang punya email/WA. LLM generate subject/email/WA. Email dikirim via SMTP; WA dikirim via Baileys worker (atau dry-run). Hasil dicatat ke `outreach_logs`, status lead diperbarui, ringkasan ke `daily_runs`.
4. **Inbound WA**: `worker/baileys.ts` menerima `messages.upsert`, simpan ke `inbox_messages`, cocokkan lead by WA, lalu auto-reply AI jika `marketing_ai.autoReplyWa` aktif.
5. **Inbound Email**: `worker/imap.ts` polling unseen IMAP, parse mail, simpan ke `inbox_messages`, mark seen, auto-reply AI jika `marketing_ai.autoReplyEmail` aktif.
6. **AI reply**: `generateReply` memakai config AI + system prompt + riwayat pesan + data lead; fallback aman jika API key kosong/gagal.

## Setup Lokal

1. Install dependency:
   ```bash
   cd lead-autopilot
   npm install
   ```
2. Salin env:
   ```bash
   copy .env.example .env.local
   ```
3. Isi `.env.local` minimal: `MYSQL_*`, `AUTH_SECRET`, `CRON_SECRET`. Opsional: `SMTP_*`, `IMAP_*`, `HCNSEC_*`, `SERPAPI_KEY`.
4. Migrasi DB + seed:
   ```bash
   npm run db:migrate
   ```
   Seed login: `a@a.com` / `123`.
5. Jalankan dev:
   ```bash
   npm run dev
   ```
6. Jalankan worker sesuai kebutuhan:
   ```bash
   npm run worker:wa
   npm run worker:imap
   npm run worker:scheduler
   ```

## Jalankan Semua Service dengan PM2

```bash
npm run build
pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 status
pm2 logs
```

Setelah perubahan kode:

```bash
npm run build
pm2 restart ecosystem.config.cjs --update-env
```

> Catatan Windows: `pm2 save` menyimpan process list. Agar auto-start saat boot, gunakan setup PM2 Windows/startup sesuai environment mesin.

## Konfigurasi Settings UI

Di `/settings` setelah login:
- **SMTP**: host/port/user/app password/from + test.
- **AI Provider**: base URL, API key, model + test.
- **WhatsApp Blast**: dry-run, daily limit, worker URL, delay, cek status.
- **IMAP**: host/port/user/app password/mailbox/poll/enabled.
- **Marketing AI**: toggle auto-reply email/WA, followup hours, max replies, system prompt.
- **Profil/Password**: update nama/email/password.

## Endpoint Utama

- `POST /api/auth/login` - login.
- `GET/POST /api/settings` - baca/simpan setting.
- `POST /api/leads/import` - import CSV/XLSX.
- `POST /api/leads/discover` - discover lead SerpAPI.
- `POST /api/run/daily` - jalankan outreach; auth session atau `x-cron-secret`.
- `GET /api/logs` - outreach logs filter.
- `GET /api/runs` - daily run history.
- `GET /api/inbox` - inbox messages.
- `GET /api/whatsapp/status` - status worker WA.

## Catatan Keamanan & Kepatuhan

- **Baileys unofficial**: risiko limit/ban WhatsApp. Gunakan nomor terpisah, rate limit, dry-run dulu.
- **Anti-spam/UU PDP**: hanya kontak B2B relevan, sertakan identitas pengirim, sediakan opt-out/stop dihubungi.
- **Secrets**: jangan commit `.env.local`, `data/wa-auth`, token, password. Gunakan `.env.example`.
- **HCNSEC** dipakai sebagai gateway LLM, bukan sumber data lead. Jangan mengarang data prospek.
