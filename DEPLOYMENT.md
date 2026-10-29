# OFFPRINT (অফপ্রিন্ট) — Vercel Production Deployment & Environment Guide

This document provides a comprehensive, step-by-step operational guide for configuring, deploying, and maintaining the **OFFPRINT** photography portfolio, booking platform, and administration system on **Vercel** with **Supabase** (database, storage, auth) and **Google Cloud** (Calendar & Gmail integrations).

---

## 1. System Architecture Overview

OFFPRINT is built as a high-performance, modern web application designed for photographic studios and event agencies:

- **Frontend & Serverless Framework:** Next.js 16.4.3 (App Router, Turbopack, React 19, TypeScript, Tailwind CSS)
- **Deployment Platform:** Vercel (Edge Network + Serverless Functions)
- **Database & Storage:** Supabase (PostgreSQL 15+, Row-Level Security, Storage Buckets, Atomic Concurrency RPCs)
- **Third-Party Integrations:** Google Calendar API (automated schedule synchronisation) & Gmail API (branded notifications) with AES-256-GCM encrypted token persistence
- **File Upload Engine:** Hybrid client-direct uploads to Supabase Storage bypassing Vercel's 4.5 MB serverless body limit, with resilient server-side fallback

---

## 2. Prerequisites & Required Accounts

Before deploying, ensure you have active administrative access to:

1. **Vercel Account:** With permissions to create or connect projects ([vercel.com](https://vercel.com)).
2. **Supabase Project:** Connected project reference `qqklsbbysybzivifnykd` ([supabase.com](https://supabase.com)).
3. **Google Cloud Platform Console:** With an active project for OAuth 2.0 client credentials ([console.cloud.google.com](https://console.cloud.google.com)).
4. **Git Repository:** GitHub repository at [https://github.com/shshantoo/offprint-website](https://github.com/shshantoo/offprint-website).

---

## 3. Vercel Project Configuration

When importing this repository into Vercel, use the following build & project settings:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Framework Preset** | `Next.js` | Automatically detected by Vercel |
| **Root Directory** | `./` | Root of the repository |
| **Build Command** | `npm run build` | Runs `next build` with Turbopack |
| **Output Directory** | `.next` (default) | Managed by Next.js |
| **Install Command** | `npm install` | Uses `package-lock.json` |
| **Node.js Version** | `20.x` (or `18.x LTS`) | Configurable under *Settings → General → Node.js Version* |

---

## 4. Environment Variables Specification & `.env.vercel`

The root configuration file `.env.vercel` contains the complete specification for production deployment. It is strictly excluded from Git via `.gitignore`.

> **Important:** Client-safe variables prefixed with `NEXT_PUBLIC_` are exposed in browser JavaScript bundles. All non-prefixed variables (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY`) are server-only secrets and must NEVER be exposed client-side.

### 4.1 Variables Status & Audit Matrix

| Variable Name | Environment Scope | Secret? | Status in `.env.vercel` | Where to Obtain / Notes |
| :--- | :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Prod, Preview, Dev | No | **Configured** | Verified live URL: `https://qqklsbbysybzivifnykd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Prod, Preview, Dev | No | **Configured** | Verified publishable key: `sb_publishable_FSDszrBIjIbZFyeTsgCLrQ_t6Q7hDWp` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod, Preview, Dev | No | **Configured** | Backward-compatible alias for publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod, Preview, Dev | **YES** | **REQUIRED (Missing)** | Supabase Dashboard → **Project Settings → API → `service_role` (secret)** |
| `NEXT_PUBLIC_SITE_URL` | Production | No | **Pending Domain** | Set to canonical domain (e.g. `https://offprint.agency`). If omitted, auto-resolves to `VERCEL_PROJECT_PRODUCTION_URL` or `VERCEL_URL`. |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | No | **Pending Domain** | Alias for canonical URL. |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | Prod, Preview, Dev | No | **Configured** | Studio operational timezone: `Asia/Dhaka` (+06:00). |
| `ADMIN_EMAILS` | Prod, Preview, Dev | No | **Configured** | `admin@offprint.agency` (Verified in database `public.profiles`). |
| `GOOGLE_CLIENT_ID` | Prod, Preview, Dev | No | **Pending Google** | Google Cloud Console → **APIs & Services → Credentials → OAuth 2.0 Client IDs**. |
| `GOOGLE_CLIENT_SECRET` | Prod, Preview, Dev | **YES** | **REQUIRED SECRET** | Google Cloud Console → **OAuth 2.0 Client Secret**. |
| `GOOGLE_OAUTH_REDIRECT_URI` | Production, Preview | No | **Pending Domain** | Canonical OAuth callback: `https://offprint.agency/api/admin/integrations/google/callback`. If omitted, dynamically derived. |
| `GOOGLE_REDIRECT_URI` | Production, Preview | No | **Pending Domain** | Alias for `GOOGLE_OAUTH_REDIRECT_URI`. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Prod, Preview, Dev | **YES** | **REQUIRED SECRET** | 32-byte hex key (64 characters) for AES-256-GCM token encryption. Generate via Node.js crypto (see below). |
| `GOOGLE_CALENDAR_ID` | Prod, Preview, Dev | No | **Configured** | `primary` (or dedicated studio calendar email). |
| `GOOGLE_SENDER_EMAIL` | Prod, Preview, Dev | No | **Configured** | `inquiry@offprint.agency` (Gmail sender for booking confirmations). |
| `NEXT_PUBLIC_AGENCY_NAME` | Prod, Preview, Dev | No | **Configured** | `"OFFPRINT (অফপ্রিন্ট)"` |
| `NEXT_PUBLIC_AGENCY_PHONE` | Prod, Preview, Dev | No | **Configured** | Verified studio phone or empty string |
| `NEXT_PUBLIC_AGENCY_EMAIL` | Prod, Preview, Dev | No | **Configured** | `"inquiry@offprint.agency"` |
| `NEXT_PUBLIC_AGENCY_LOCATION` | Prod, Preview, Dev | No | **Configured** | `"Dhaka, Bangladesh"` |

---

### 4.2 Generating the Token Encryption Key

Generate a cryptographically secure 64-hex-character AES-256 key using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the 64-character output into `.env.vercel` as `GOOGLE_TOKEN_ENCRYPTION_KEY`.

---

## 5. Transferring Environment Variables to Vercel

### Method A: Automated Secure CLI Import (Recommended)

A dedicated security-hardened import script is provided at `scripts/import-env-to-vercel.mjs`.

#### Security Guarantees:
1. **Zero Secret Exposure:** Values are piped directly to the Vercel CLI via standard input (`stdin`). Secrets are **never** passed as CLI arguments, visible in process tables (`ps`), or printed in logs.
2. **Pre-flight Validation:** Rejects missing required variables (`SUPABASE_SERVICE_ROLE_KEY`) and unresolved placeholder text before any external API calls.
3. **Overwrite Protection:** Detects existing Vercel environment variables and prompts before replacing.
4. **Environment Isolation Warning:** Displays a prominent warning if live production Supabase credentials are being imported into Preview or Development.
5. **No Auto-Deploy:** Does NOT trigger a build or deployment.

#### Prerequisites for CLI Import:
```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Authenticate
vercel login

# 3. Link this local directory to your Vercel project
vercel link
```

#### Running the Importer:
```bash
# Test with a dry run (validates .env.vercel without making changes)
node scripts/import-env-to-vercel.mjs --dry-run --env=production

# Import verified variables into Production
node scripts/import-env-to-vercel.mjs --env=production

# Import into Preview (with interactive safety confirmation)
node scripts/import-env-to-vercel.mjs --env=preview
```

---

### Method B: Manual Configuration via Vercel Dashboard

If you prefer using the web interface:

1. Open your project on [vercel.com](https://vercel.com).
2. Navigate to **Settings → Environment Variables**.
3. For each variable in `.env.vercel`:
   - Enter the **Key**.
   - Enter the **Value**.
   - Check the target environments: **Production**, **Preview**, and/or **Development**.
   - For secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY`), ensure they are marked as **Sensitive**.
4. Click **Save**.

---

## 6. Environment-Specific Configuration (Production vs Preview)

| Setting | Production Environment | Preview / Branch Environment |
| :--- | :--- | :--- |
| **Domain Resolution** | Explicit custom domain, e.g. `https://offprint.agency` | Automatically derived from Vercel system variable `VERCEL_URL` (e.g. `https://project-git-branch.vercel.app`) |
| **Supabase Database** | Live production instance (`qqklsbbysybzivifnykd`) | Recommended: Dedicated staging project (or exercise caution if sharing production instance) |
| **Google Integrations** | Enabled with production OAuth redirect URI registered in Google Cloud Console | Keep Google credentials unset or use dedicated staging credentials to prevent test PRs from sending real emails or calendar invites |
| **Site URL Variable** | Set `NEXT_PUBLIC_SITE_URL=https://offprint.agency` | Leave `NEXT_PUBLIC_SITE_URL` unset (the app automatically falls back to `https://${process.env.VERCEL_URL}`) |

---

## 7. Supabase Production Configuration Checklist

Verify that the following configurations are active on the connected Supabase project (`qqklsbbysybzivifnykd`):

### 7.1 Applied Migrations
All 6 core migrations located in `supabase/migrations/` must be applied in order:
1. `20261028000001_initial_core_schema.sql` (Profiles, Leads, Products, Portfolio, Settings)
2. `20261028000002_booking_and_portal_schema.sql` (Services, Special Booking Types, Packages, Slots, Bookings, Google Integrations)
3. `20261028000003_atomic_booking_rpcs.sql` (Atomic booking creation, rescheduling, cancellation, and slot availability functions)
4. `20261028000004_storage_admin_security_and_special_events.sql` (Storage buckets, RLS, custom questions, event management)
5. `20261028000005_admin_credential_rpcs.sql` (Admin credential change RPCs, first login security flags)
6. `20261028000006_package_management_and_frame_printing.sql` (Package CRUD RPCs, frame printing pricing schemas, historical snapshots)

### 7.2 Storage Bucket Configuration
The application uses two Supabase Storage buckets:
- `portfolio-media`: Standard bucket, **Public: Enabled**, File Size Limit: **15 MB**, Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`.
- `product-media`: Standard bucket, **Public: Enabled**, File Size Limit: **15 MB**, Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`.

#### Row-Level Security on Storage Objects:
- **Public Read:** Enabled for all users on `portfolio-media` and `product-media`.
- **Authenticated Admin Write:** Permitted exclusively for users with `role = 'admin'` in `public.profiles`.

### 7.3 Direct-to-Browser Upload Architecture
Vercel enforces a strict **4.5 MB request payload limit** (`413 FUNCTION_PAYLOAD_TOO_LARGE`) on serverless function requests. To support high-resolution photography uploads:
- Both `PortfolioCMSClient.tsx` and `AdminPortalClient.tsx` upload files directly from the administrator's browser to Supabase Storage using authenticated browser client sessions.
- Files up to the full 15 MB bucket limit upload seamlessly without routing image bytes through Vercel serverless routes.
- If a browser upload encounters a network issue, the system automatically falls back to the server route `/api/admin/storage/portfolio`.

### 7.4 Supabase Authentication URL Settings
In the Supabase Dashboard under **Authentication → URL Configuration**:
- **Site URL:** Set to `https://offprint.agency` (or your primary production URL).
- **Redirect URLs:** Add the following patterns:
  - `https://offprint.agency/**`
  - `https://*.vercel.app/**` (allows preview deployments to handle auth callbacks)
  - `http://localhost:3000/**` (for local development)

### 7.5 Administrator Account
- Ensure at least one profile in `public.profiles` has `role = 'admin'`.
- The default administrator username is `shanto` with email `admin@offprint.agency`.
- When an administrator signs in for the first time, the system prompts them to configure their personal password and profile details via the secure `admin_change_credentials` RPC.

---

## 8. Google Cloud Platform Configuration Checklist

To enable Google Calendar synchronisation and automated Gmail booking notifications:

### 8.1 Enable Google APIs
In Google Cloud Console (**APIs & Services → Library**), enable:
1. **Google Calendar API**
2. **Gmail API**

### 8.2 Configure OAuth Consent Screen
In Google Cloud Console (**APIs & Services → OAuth consent screen**):
1. **User Type:** Select **External** (or **Internal** for Google Workspace).
2. **App Information:** App Name: `OFFPRINT`, User Support Email: `inquiry@offprint.agency`.
3. **Authorized Domains:** Add `offprint.agency` and `vercel.app`.
4. **Scopes:** Add the following scopes:
   - `https://www.googleapis.com/auth/calendar.events` (Manage calendar booking events)
   - `https://www.googleapis.com/auth/gmail.send` (Send booking notifications from studio address)
   - `https://www.googleapis.com/auth/userinfo.email` (Identify connected account)
5. **Publishing Status:** Set to **Production** (or add admin Google accounts as Test Users if in Testing status).

### 8.3 OAuth 2.0 Client Credentials
In Google Cloud Console (**APIs & Services → Credentials → OAuth 2.0 Client IDs**):
1. **Application Type:** Web application.
2. **Name:** `OFFPRINT Production Web Client`.
3. **Authorized JavaScript Origins:**
   - `https://offprint.agency`
   - `http://localhost:3000`
4. **Authorized Redirect URIs:**
   - `https://offprint.agency/api/admin/integrations/google/callback`
   - `http://localhost:3000/api/admin/integrations/google/callback`
   - *(Optional for Vercel preview)*: `https://<your-preview-domain>.vercel.app/api/admin/integrations/google/callback`

---

## 9. Post-Deployment Smoke Test Checklist

Once the production deployment is complete, execute the following verification steps:

### 1. Public Website & Assets
- [ ] Visit `https://offprint.agency/` — verify that hero banners, typography, and Bangladesh cultural design elements render smoothly.
- [ ] Visit `/works` — verify that photography portfolio galleries load images properly from Supabase Storage / Unsplash CDN.
- [ ] Visit `/print-solutions` and `/about` — confirm static pages display correctly.
- [ ] Test the contact form at `/contact` — submit a sample inquiry and verify it creates a record in `public.leads`.

### 2. Special Booking Flow (IUB 27th Convocation)
- [ ] Navigate to `/book/convocation` (or `/book/special/iub-27th-convocation`).
- [ ] Verify dynamic package cards display accurate names, inclusions, prices, and durations from Supabase.
- [ ] Test the optional frame-printing toggle: select print sizes and verify subtotal updates in real time.
- [ ] Pick an available date and timeslot on the interactive calendar.
- [ ] Submit the reservation with required student/convocation fields.
- [ ] Confirm redirection to `/booking/confirmation` with a unique booking reference code (e.g. `OFF-CONV-XXXXX`).

### 3. Traditional Photography Booking Flow
- [ ] Navigate to `/book/traditional`.
- [ ] Select a service (e.g. Portraiture, Commercial, Editorial).
- [ ] Verify slot availability calendar updates dynamically and matches Dhaka timezone (`Asia/Dhaka`).
- [ ] Complete a test reservation and verify booking confirmation.

### 4. Client Portal
- [ ] Navigate to `/client-portal`.
- [ ] Enter the booking reference code and client email address.
- [ ] Confirm the booking details, package summary, frame printing add-ons, and payment status display accurately.
- [ ] Verify reschedule and cancellation deadline rules function according to studio policy.

### 5. Admin Portal (`/admin-portal`)
- [ ] Navigate to `/admin-portal`.
- [ ] Sign in using administrator credentials (`shanto` / `admin@offprint.agency`).
- [ ] Verify overview stats, calendar schedules, and booking tables populate from the live database.
- [ ] Verify **Admin Navigation & Tab Persistence**:
  - Switch between tabs (Dashboard, Bookings, Calendar, Special Events, Workflow Stages, Portfolio, Registered Users, Integrations, CMS, Security).
  - Verify tabs switch instantly without displaying "Verifying administrator credentials..." spinners.
  - Refresh the page and confirm the selected tab persists via URL query parameters and session storage.
- [ ] Test **Registered Users Dossier**:
  - Open a registered user from the Registered Users tab.
  - Verify user statistics, BDT spending format (`BDT X,XXX`), and booking history display without runtime errors.
- [ ] Test **Workflow Stages & Photo-Bank Delivery**:
  - Navigate to the **Workflow Stages** tab.
  - Reorder stages, toggle client visibility, and configure photo-bank link delivery rules (e.g., link required, default validity duration in days, automatic email alerts).
  - Verify that transition rules and required link constraints are strictly enforced in the Booking Inspector modal.
- [ ] Test **Event Archive & Booking Associations**:
  - In Special Events & Services, link an active Special Event to an Event Archive in section 2.5.
  - Navigate to the public Work Archive page (`/works/[slug]`) and verify the direct booking button (`Book Session Now`) or "Booking Paused" status badge renders accurately.
- [ ] Test **Global Site Settings & Dynamic Footer**:
  - In Website Content & Leads → Global Site Settings, update brand details, contact email/phone, or toggle link visibility.
  - Verify the website footer updates immediately across all public routes.
- [ ] Test **Featured Event Slider on Homepage**:
  - In `/admin-portal` Portfolio & Work Archive, toggle **Featured on Dashboard** on one or more published event archives.
  - Verify the homepage's **Additional Gallery Portfolio Entries** section renders the minimalist automatic slider (6-second rotation, discreet controls, pause on hover/interaction, reduced-motion compliance).
  - Verify that when zero events are featured, a clean empty state is displayed without placeholder images or fabricated events.
- [ ] Test **Dynamic Event Archive Categories**:
  - In `/admin-portal` Account & Security / Settings → **Event Archive Categories**, create, rename, reorder, or toggle category status.
  - Verify real published archive counts update accurately.
  - Verify that deleting a category currently in use by archives performs a safe deactivation (`is_active: false`) preserving historical productions.
  - Navigate to `/works` and verify category filter buttons reflect live database categories with accurate counts.
- [ ] Test **Package Management**:
  - Edit an existing package's name, duration, price, or description.
  - Create a new package and change its display order.
  - Test package archiving: attempting to delete a package with historical bookings safely deactivates/archives it instead of breaking historical records.
- [ ] Test **Direct Storage Photo Upload**:
  - In Portfolio CMS or Event Cover Photo, upload an image (> 5 MB).
  - Confirm the direct-to-Supabase Storage upload succeeds without triggering Vercel 4.5 MB payload errors.
  - Verify the uploaded image renders immediately in the preview.
- [ ] Test **Google Integration**:
  - Click **Connect Google Calendar & Gmail**.
  - Authorize via the Google OAuth consent screen.
  - Confirm integration status shows "Connected" with connected email and active scopes.

---

## 10. Database Schema Migrations Summary

The following migrations have been applied to Supabase project `qqklsbbysybzivifnykd`:

1. **`20261028000001_storage_reconciler_and_booking_switches.sql`**: Added `booking_events.is_visible_on_booking_page`, `media_folders.physical_exists_in_bucket`, and media folder reconciliation triggers.
2. **`20261029000001_add_client_photo_delivery_to_bookings.sql`**: Added photo-bank delivery columns (`delivery_url`, `delivery_status`, `delivery_expires_at`, `delivery_validity_days`, `delivery_message`, `delivery_sent_at`, `delivery_email_status`).
3. **`20261030000001_event_associations_and_workflow_config.sql`**:
   - Created junction table `public.event_archive_booking_events` with cascading foreign keys and unique composite constraint `(archive_id, booking_event_id)`.
   - Added workflow stage configuration columns: `allow_link_delivery`, `is_link_required`, `send_email_on_delivery`, `auto_send_email`, and `default_validity_days`.
   - Configured the delivered stage (`slug = 'delivered'`) as default photo-bank eligible delivery stage with 14-day validity.
4. **`20261030000002_dynamic_event_categories.sql`**:
   - Created table `public.event_archive_categories` with RLS policies, unique slugs, unique names, sort ordering, and active flags.
   - Added `category_id` foreign key column to `public.event_archives` referencing `event_archive_categories(id) ON DELETE SET NULL`.
   - Seeded initial category **Convocation** and migrated existing live event archives to this relational category.
5. **`20261030000003_slider_settings.sql`**:
   - Centralized slider timing, interval, transition duration, and pause-on-hover configuration across all studio sliders (`hero_slider`, `archives_carousel`, `highlighted_events`, `event_hero_slider`) within `public.site_settings` under key `'slider_settings'`.
   - Guaranteed atomic validation, boundary clamping, and admin management through `/admin-portal` under *Website Content & Leads → Slider Settings*.
   - Completely purged obsolete prototype row `The Royal Crimson Wedding Story` from `public.portfolio_projects`.

---

## 11. Troubleshooting & FAQ

### Q: Why did uploads fail with `413 FUNCTION_PAYLOAD_TOO_LARGE`?
**A:** Vercel limits Serverless Function request payloads to 4.5 MB. The OFFPRINT codebase uses client-direct uploads (`getSupabaseBrowserClient().storage.from("portfolio-media").upload(...)`) so high-resolution photography files upload directly from the user's browser to Supabase Storage, bypassing Vercel functions entirely. Ensure your browser is signed in to the admin portal so Supabase RLS permits the upload.

### Q: Google OAuth callback returns `redirect_uri_mismatch`
**A:** The redirect URI sent by the application must match the exact URI registered in Google Cloud Console. Check that:
1. `https://offprint.agency/api/admin/integrations/google/callback` is added under **Authorized redirect URIs** in Google Cloud Console.
2. `NEXT_PUBLIC_SITE_URL` is set to `https://offprint.agency` in Vercel environment variables.

### Q: Booking times appear shifted by several hours
**A:** OFFPRINT operates in the **Asia/Dhaka** timezone (`+06:00`). Ensure `NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Dhaka` is configured in your environment variables. All date formatting utilities and calendar availability calculations strictly adhere to this timezone.

---

**OFFPRINT (অফপ্রিন্ট) Operations Team**  
*Document Version: 1.2.0 (Slider Timing CMS & Dynamic Homepage Ready)*
