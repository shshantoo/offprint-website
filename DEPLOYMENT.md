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
6. **`20261030000004_print_merch_visibility.sql`**:
   - Set default public visibility of Physical Print & Merchandise sections, promotional links, and public navbar items to false (OFF) within `public.site_settings` under keys `'homepage_config'` (`show_print_bridge: false`) and `'general'` (`show_print_links: false`, `show_print_merch_frontend: false`).
   - Integrated dynamic brand logo marks (`offprint-colour-logo.png`, `offprint-black-logo.png`, and `offprint-white-logo.png`) respecting scene contrast without redundant text.

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

## 12. Scheduled Sessions & Time Slots Control Center + Brand Logo Correction

### 12.1 Unified Schedule Configuration & Generation Mechanics
- **Location:** Admin Portal → *Special Events & Services → Select Event → 2. Schedule Configuration & Generator* tab.
- **Form Controls:**
  - `From Date` & `End Date (To)`
  - `Operating Days of Week` (`Sun` through `Sat` toggle buttons)
  - `Daily Operating Hours` (`Daily Start Time`, `Daily End Time`)
  - `Booking Slot Settings`:
    - **Duration:** Appointment time occupied by each client (`Slot End = Slot Start + Duration`).
    - **Interval:** Frequency of appointment start times (`Next Start = Prev Start + Interval`).
    - **Default Capacity:** Number of concurrent clients permitted per slot.
    - **Buffer After:** Studio turnaround buffer added to effective reservation block.
  - `Break Periods Builder:` Custom periods (e.g. Lunch Break, Staff Changeover) with start & end times. Any slot overlapping `[break_start, break_end]` is never generated.
  - `Studio Timezone Notice:` Displays `Asia/Dhaka (+06:00)` explicitly.
- **Interactive Schedule Preview Modal:**
  - Diff calculation comparing proposed schedule with live Supabase database.
  - Displays proposed sessions, fresh slots to create (`+X`), existing retained slots (`=X`), unbooked slots to prune (`-X`), and guaranteed active confirmed bookings preserved (`✓ X`).
  - Strict preservation: Active confirmed bookings are never deleted or orphaned during schedule regeneration.

### 12.2 Scheduled Sessions Management
- Searchable and filterable table of generated sessions for each operating date.
- Columns: Date (formatted in Dhaka locale), Session Title, Operating Window, Slot Count, Total Capacity, Confirmed Bookings, Remaining Availability, Status (`Active` / `Inactive`).
- Actions:
  - **View Slots:** One-click filtering of the individual slots management table to the selected session date.
  - **Edit:** Override session date, title, operating hours, capacity, and active status.
  - **Delete:** Safe deletion check prevents removing sessions with active confirmed bookings with human-readable conflict errors.

### 12.3 Individual Bookable Time Slots Management
- Granular control over every generated slot with session dropdown filter, status filter (`Available`, `Fully Booked`, `Blocked`, `Past`), and search.
- Columns: Checkbox, Date, Time Window (`10:00 AM – 10:30 AM BST`), Capacity, Booked Count, Remaining, Status Badge.
- Slot Actions:
  - **Modify Capacity:** Instant capacity adjustment enforcing `capacity >= booked_count`.
  - **Modify Time:** Adjust slot start and end times within session bounds.
  - **Block / Restore:** 1-click toggle to exclude a slot from public booking without deleting client records.
  - **Safe Delete:** Deletes unbooked slots; prevents deleting slots with active bookings and suggests blocking instead.
- **Bulk Management Toolbar:** Checkbox selection for multiple slots to bulk Block, Restore, Set Capacity, or Delete Unused unbooked slots.

### 12.4 Brand Logo Visibility & Aspect Ratio Standardization
- **Original Asset Microscopic Margin Problem:** Original 3000x2400 PNGs contained 78% transparent margin vertically and 46% horizontally (visible logo was only 1615x551), making rendered height ~8px when styled with `h-9` or `h-10`.
- **Trimmed Derivative Assets:** Trimmed all three variants in `public/brand/` to crisp, lossless 1615x551 dimensions (~2.93:1 aspect ratio):
  - `public/brand/offprint-colour-logo.png`
  - `public/brand/offprint-black-logo.png`
  - `public/brand/offprint-white-logo.png`
- **Standardized Display Dimensions:**
  - Desktop Header: `w-[155px] sm:w-[170px] md:w-[195px] lg:w-[205px] max-h-[72px] shrink-0 object-contain` (~190–205px wide on desktop).
  - Mobile Header: `w-[155px] sm:w-[170px]` (~155–170px wide).
  - Admin Header & Login: `w-[180px] sm:w-[195px]`.
  - Client Portal: `w-[170px] sm:w-[190px]`.
  - Footer: `w-[165px] sm:w-[180px] md:w-[185px]`.
- **Contrast Adaptation:** White logo mark on dark hero/background, Black logo mark on light scrolled headers and admin cards. Pure logo mark without text.

---

## 13. Release 1.4.0 — Dynamic Booking Packages, Form Builder, Event CMS & Slot Holds

### 13.1 Package Management & Pricing Snapshots
- **Dedicated Admin Tab:** "Packages & Pricing" sub-navigation inside Special Events management (`/admin-portal`).
- **Complete Package CRUD:** Add, edit, reorder, active/inactive toggles, and safe delete (`delete_or_archive_package` RPC preserves historical bookings).
- **Inline Editing:** Quick in-place price and description editing without opening modal dialogs.
- **Server-Verified Pricing:** Client-submitted prices are verified server-side against database snapshots before reservation.
- **Dynamic Client Presentation:**
  - **1 Active Package:** Integrated directly into event overview without redundant Step 1.
  - **≥ 2 Active Packages:** Step 1 comparison cards for package selection.
  - **0 Active Packages:** Clean event overview without placeholder or demo records.

### 13.2 Dynamic Booking Form Builder
- **Admin Form Builder:** Dedicated "Booking Form" tab to configure custom questions per event.
- **Supported Field Types:** `short_text`, `long_text`, `email`, `phone`, `number`, `dropdown`, `radio` (single choice), `checkbox` (multiple choice), `date`, and `heading` (section dividers).
- **1-Click Seed:** "Seed Standard IUB Convocation Fields" button instantly sets up the 13 standard convocation questions (Contact, Academic, Preferences, and Notes).
- **Live Form Preview:** Interactive client form preview modal in the admin panel to test inputs before publishing.

### 13.3 Structured Event Information Blocks
- **Separation of Presentation from Policies:** Admin "Event Highlights & Info" tab manages highlighted cards (Venue, Configured Sessions count, Reschedule/Cancellation Cutoff, Timezone & Hold Duration, and Custom Blocks).
- **Operational Policy Integrity:** Editing display blocks changes only public presentation; operational cutoff rules and hold timers in the database remain authoritative.

### 13.4 Clean Slot Duration Labels
- Public booking calendars display clean time ranges (e.g., `10:00 AM – 10:30 AM · 30m`), completely omitting internal buffer labels (`+ 60m buffer`).

### 13.5 Temporary Slot Hold & Concurrency Protection
- **Configurable Hold Duration:** 1 to 60 minutes (default 5 minutes) per event (`booking_events.slot_hold_duration_mins`).
- **Atomic Holds:** Table `booking_slot_holds` with atomic RPCs (`acquire_slot_hold`, `release_slot_hold`, `consume_slot_hold`).
- **Client Reservation Banner:** Real-time countdown timer banner (`"Your selected time slot is temporarily reserved while you complete your booking. Time remaining: MM:SS"`).
- **Automatic Expiration & Release:** Held slots expire automatically and return to available capacity for other visitors.
- **Refresh Resilience:** Flow tokens stored in client `sessionStorage` preserve holds across page refreshes.

---

## 14. Release 1.5.0 — Booking Form & Package Corrections, Frame Add-on Pricing, Admin Diagnostics & Mobile UX

### 14.1 Streamlined Package Presentation
- Predefined, auto-generated deliverable bullets (4-line repetitive checklists) removed completely from both admin editor and public client-facing booking pages (`ConvocationBookingClient`, `TraditionalBookingClient`, `EventPackagesEditor`).
- Display is strictly streamlined to:
  - **Package Name**
  - **Package Price** (with formatted BDT currency)
  - **Package Description** (the genuine, editable description text configured by administrators in `/admin-portal`).

### 14.2 Admin Error Diagnostics & Direct Save Endpoints
- Eradicated error-masking bug where PostgREST schema errors triggered generic visitor fallback (`"Booking service is temporarily updating..."`) inside `/admin-portal`.
- Implemented `formatAdminError` in `src/lib/booking/admin-error.ts` to preserve authentic database error codes (`code`, `details`, `hint`, `status`).
- Added dedicated targeted save endpoints in `/api/admin/events` for:
  - `event_custom_questions`
  - `event_info_blocks`
  - `event_frame_config`
  - `event_slot_hold_duration`

### 14.3 Decoupled Dynamic Booking Form Engine
- Completely decoupled public booking inputs from hardcoded static fields (`clientName`, `clientEmail`, `clientPhone`, `guestsCount`, `companyOrInstitution`).
- 100% of the client information section is driven dynamically by `custom_questions` (`q.is_visible !== false`). Hiding or deleting a field immediately removes it from the public form.
- Added support for new field types and layout configurations:
  - `select_box` (with horizontal or vertical layout and single/multiple select modes).
  - `radio` (horizontal or vertical layout).
  - `long_text` (multi-line textarea), `short_text`, `dropdown`, `checkbox`, `email`, `phone`, `number`, `date`, and `heading`.
- Seamlessly prefills authenticated user profile data from `/api/client/profile`.
- Enforces booking validation rule: at least one confirmation contact method (valid email or phone) must be provided upon submission.

### 14.4 Frame and Print Add-on Management & Pricing
- Created dedicated admin editor `EventFrameAddonsEditor.tsx` integrated as Tab 3 in Special Events management.
- Supports comprehensive preset loading, custom frame option creation/editing, reordering, active toggling, and direct database persistence.
- **Strict Visibility Rule:** If framing is disabled, or no active frame options exist, or all options are deactivated, the framing section and any mention of "Step 3: Archival Frame & Print" is completely omitted from the public booking experience.
- Real-time client total price calculation: `Total Price = Package Base Price + (Frame Unit Price × Quantity)`.

### 14.5 Mobile Responsive UX & Slot Selection
- **Internal Mobile Scrolling:** Time slots are contained within a dedicated internal scrollable area on mobile devices (`max-h-[360px] touch-pan-y scrollbar-thin`) to prevent page jumpiness.
- **Smooth Navigation Flow:** Upon successful slot hold acquisition, automatically and smoothly scrolls to `#booking-reservation-details`.
- **Selected Slot Banner:** Displays a sticky/compact selected-slot card on mobile with a "Change slot" button that smoothly returns the user to `#booking-calendar-section`.
- **Mobile Footer Optimization:** Vertically stacked footer sections on mobile, enlarged tap targets (`w-9 h-9` with `w-4 h-4` icons), increased vertical tap padding (`py-1`), and standard logo sizing (`w-[150px] sm:w-[170px] md:w-[185px]`).

---

## 15. Release 1.6.0 — Passwordless Client Portal & Package-Linked Convocation Scheduling

### 15.1 Passwordless Client Portal Access
- **Complete Elimination of Client Passwords:**
  - Password inputs, "Create Password", "Set New Password", password registration, and password recovery forms completely removed from `/client-portal`.
  - Clients never need to choose, remember, or reset a password.
  - Dedicated administrative authentication at `/admin` and `/admin-portal` remains completely separate, secure, and unaffected.
- **Two-Step Email OTP Verification Flow:**
  - **Step 1 (Email Submission):** Clean input field for booking email address with one-click verification code dispatch via Supabase Auth (`signInWithOtp` with `{ shouldCreateUser: true }`).
  - **Step 2 (Passcode Entry):** 6-digit OTP code verification via `verifyOtp` with `{ type: 'email' }`.
  - **Resend Protection & Cooldown:** Enforces a 60-second cooldown timer between resend requests and 10-minute code validity.
  - **Single-Click Switch:** Allows switching email addresses seamlessly without page refreshes.
- **Identity Verification & Booking Retrospection:**
  - Once verified, the client portal displays all upcoming, completed, and cancelled bookings associated with the email address.
  - Automatically backfills historical unlinked bookings created under the verified email (`user_id = null`) to the authenticated client account upon sign-in.
  - Displays clean, polite empty state when a verified client has zero reservations on record, guiding them to book a session.

### 15.2 Package-Linked Convocation Scheduling & Multi-Duration Slot Generation
- **Session-to-Package Junction Association:**
  - Deployed database junction table `public.event_session_packages (id, session_id, package_id)` with foreign key constraints, indexes, and RLS policies.
  - Added "Available Packages for This Session" configuration in `/admin-portal` (`SpecialEventsAdminClient.tsx` session modal), allowing administrators to explicitly attach packages to sessions.
- **Multi-Duration Schedule Generation:**
  - Upgraded schedule generator (`src/lib/booking/schedule-generator.ts`) to group packages by distinct durations (e.g. 30m vs 60m).
  - Automatically generates discrete time-slot grids matching each package duration, tagging slots with their duration and compatible `package_ids`.
- **Package-First Client Booking Flow:**
  - Client selects their preferred portrait package (or package is auto-selected if exactly 1 is configured).
  - Public booking calendar and availability APIs filter slots strictly to those matching the selected package and its appointment duration.
  - Switching packages immediately releases any held slot, clears slot selections, and recomputes the calendar for the new package duration.
- **Cross-Package Resource Overlap & Concurrency Protection:**
  - Availability engine (`computeConvocationSlots`) and reservation workflow (`executeCreateBookingWorkflow`) verify slot duration against package duration.
  - Overlapping appointment check (`intervalsOverlap`) ensures bookings for extended sessions (e.g. 60m) automatically lock all overlapping slots across other durations on the primary studio resource pool.
  - Slot holds acquire package association (`package_id` in `booking_slot_holds` and `acquire_slot_hold` RPC), preventing concurrent hold clashes across packages.

---

## 16. Release 1.7.0 — Package CRUD Resilience, Safe Deletion & Schedule Configuration Package Attachment

### 16.1 Package Creation, Update & Safe Deletion Resilience
- **Database Migration `20261102000002_package_crud_and_schedule_package_linking.sql`:**
  - Deployed `public.upsert_photography_package(jsonb)` RPC with `SECURITY DEFINER` and explicit `GRANT EXECUTE TO anon, authenticated, service_role`.
  - Deployed `public.delete_or_archive_package(uuid)` RPC with `SECURITY DEFINER` and explicit `GRANT EXECUTE TO anon, authenticated, service_role`.
  - Updated `public.is_admin()` and RLS policies on `public.photography_packages` and `public.event_session_packages`.
- **Safe Deletion Rules Engine:**
  - **Case A (Unused Package):** Package has 0 bookings -> permanently deleted from database and schedule references cleaned up.
  - **Case B (Session-Linked Package with 0 Bookings):** Cleans up `public.event_session_packages` junction rows without affecting sessions or other packages.
  - **Case C (Package with Bookings):** Has active, confirmed, or historical bookings -> safely archived (`is_active = false`) for future bookings while strictly preserving booking records, pricing snapshots, and client receipts.
- **Dual-Layer API Handler:**
  - In `/api/admin/events`, package operations attempt `upsert_photography_package` and `delete_or_archive_package` RPCs first, with a comprehensive TypeScript fallback.
  - Package schema (`photographyPackageSchema`) sanitizes empty IDs to `undefined`, defaults empty descriptions to `"Event Portrait Package"`, and supports appointment durations down to 5 minutes.
- **Admin Package Editor UI (`EventPackagesEditor.tsx`):**
  - Added dedicated safe deletion confirmation dialog explaining Case A vs Case C.
  - Added quick Enable/Disable toggle on each package card with instant feedback.
  - Guaranteed `id: undefined` on creation to eliminate PostgREST primary key conflicts.

### 16.2 Direct Package Selection in Schedule Configuration Parameters
- **Dedicated Package Selection Section in Schedule Parameters:**
  - Located directly in `Admin Portal → Special Events & Services → Select Convocation Event → Tab 1 (Scheduling) → Schedule Configuration Parameters`.
  - Positioned near the top of the form, BEFORE generating sessions and time slots.
  - Displays each package's name, price, appointment duration (`duration_mins`), and active status badge.
  - Includes select package, remove package, search packages, and Select All / Clear shortcuts.
- **Summary Table: Packages Attached to This Schedule:**
  - Shows attached packages with their duration, base price, and active status.
- **In-Workflow Quick Package Creation Modal:**
  - Includes a `+ Create New Package` shortcut button directly inside the scheduling form so administrators can define and attach new packages without leaving the scheduling tab.
- **Schedule Generation Attachment:**
  - Requires at least one active package before allowing schedule generation.
  - Passes selected package IDs to both `preview_schedule` and `rebuild_event_schedule`.
  - Generates discrete time slots matching each package duration, automatically excluding break periods.
  - Links sessions to packages in `event_session_packages` and tags generated slots with `duration_mins` and `package_ids`.
  - Persists `schedule_package_ids` in `booking_events`.

---

---

## 17. Release 1.7.3 — Critical Production Fix: bookings_check2 Constraint Violation

- **Root Cause Identification:**
  - Evaluated exact definition of PostgreSQL CHECK constraint `public.bookings_check2`:
    `CHECK ((booking_type = 'convocation' AND event_id IS NOT NULL AND (slot_id IS NOT NULL OR status = 'cancelled')) OR (booking_type = 'traditional' AND (service_id IS NOT NULL OR status = 'cancelled')))`
  - Production bookings for Convocation require both `event_id` and `slot_id` to be non-null unless `status = 'cancelled'`.
  - In cases where slots were unlinked or rebooked, nullifying `slot_id` on confirmed convocation records triggered `bookings_check2`.
- **Resolution:**
  - Guaranteed `event_id` and `slot_id` are strictly populated on all active convocation booking creations and updates.
  - Ensured slot unlinking only applies to cancelled bookings or retains valid slot references with capacity release.
  - Preserved all historical bookings without alteration.

---

## 18. Release 1.8.0 — Multi-Package & Multi-Slot Basket, Loading Animations & Automatic Storage Discovery

### 18.1 Multi-Package & Multi-Slot Reservation Basket
- **Basket Data Model & Migration `20261103000002_multi_slot_booking_group_and_folder_discovery.sql`:**
  - Added `booking_group_id` UUID, `booking_group_ref` (`OFP-YYYY-GXXXXX`), `group_total_amount`, and `is_primary_group_item` to `public.bookings`.
  - Created indexes `idx_bookings_group_id` and `idx_bookings_group_ref`.
- **Multi-Slot Hold Coexistence:**
  - Upgraded `acquire_slot_hold` RPC and `/api/bookings/hold` to allow sibling holds under the same `flow_token` to coexist in the basket without auto-releasing previous holds.
  - Upgraded `release_slot_hold` RPC to release specific holds cleanly by `(slot_id, flow_token)` or `hold_id`.
- **Schedule Coexistence for Differing Durations:**
  - Updated schedule generator and `/api/admin/events` so 30-minute sessions (10:00–10:30) and 60-minute sessions (10:00–11:00) coexist on the same date without collision on unique `(event_id, start_at, end_at)`.
  - Slots with identical duration merge `package_ids` cleanly.
  - Targeted pruning prunes only unbooked slots belonging to the target package.
- **Authoritative Server-Side Basket Pricing:**
  - Calculates authoritative package subtotal ($\sum \text{Unit Price} \times \text{Slots}$), frame add-on pricing, and grand total in `calculateAndVerifyMultiBookingPrice`.
  - Browser cannot submit or tamper with prices.
- **Atomic Multi-Booking Confirmation (`executeCreateMultiBookingWorkflow`):**
  - Group checkout creates $N$ individual booking rows (one for each package-slot) atomically.
  - Every row strictly satisfies `bookings_check2` and is linked via `booking_group_id` and `booking_group_ref`.
  - Dispatches a single consolidated calendar invitation and branded confirmation email.
- **Client & Admin Portals:**
  - Client Portal and Admin Portal display grouped badges (`Group: OFP-YYYY-GXXXXX`) linking related bookings.

### 18.2 Site-Wide Lightweight Loading Animations
- **Immediate Visual Pending Feedback on Convocation Slots:**
  - Clicking any available time slot instantly updates the slot button state (`pendingSlotId === slot.slot_id`) showing an inline spinner, "Reserving slot...", `cursor-wait`, and disabling the button to prevent double-clicks.
  - Smooth animation with zero unprompted page scrolling.
- **Interactive Feedback Across Async Operations:**
  - Loading spinners and disabled states on package save/delete, schedule generation, and booking submission.

### 18.3 Automatic Supabase Storage Folder Discovery
- **Physical Storage Source of Truth:**
  - In `src/lib/data-service.ts`, implemented `discoverAndReconcileStorageFolders(type, customClient)` querying `portfolio-media` (`event-archives/*` and `event-archive-highlights/*`).
  - Discovers folders directly from physical storage (e.g., `IUB 23rd Convocation`, `NSU 25th Convocation`) and reconciles them into `media_folders` without manual database inserts or synchronization scripts.
  - Automatically filters `.emptyFolderPlaceholder` and dotfiles from photo counts and gallery listings.

### 18.4 Brand Logo Display & Contrast Rules
- **Logo Mark Exclusivity:**
  - Rendered strictly as the standalone brand logo mark throughout the entire website (headers, footers, admin portal, and client portal) without any redundant text.
- **Context-Aware Dynamic Contrast:**
  - Dark scenes (transparent navigation over hero media) use `/brand/offprint-white-logo.png`.
  - Light scenes (scrolled navbar, footers, admin portal, client portal) use `/brand/offprint-black-logo.png` (or `/brand/offprint-colour-logo.png`).

---

**OFFPRINT (অফপ্রিন্ট) Operations Team**  
*Document Version: 1.8.0 (Multi-Package & Multi-Slot Basket, Loading Animations & Automatic Storage Discovery Verified)*
