# OFFPRINT (অফপ্রিন্ট) — Vercel Production Deployment Guide

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
4. **Git Repository:** GitHub, GitLab, or Bitbucket repository containing this codebase.

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

## 4. Environment Variables Specification

Configure the following environment variables in the Vercel Dashboard under **Project Settings → Environment Variables**.

> **Important:** Client-safe variables prefixed with `NEXT_PUBLIC_` are exposed in browser JavaScript bundles. All non-prefixed variables (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY`) are server-only secrets.

### Complete Environment Variables Matrix

| Variable Name | Environments | Secret? | Description & Value Format |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | No | Supabase project REST URL, e.g. `https://qqklsbbysybzivifnykd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development | No | Supabase public client API key (new publishable key or legacy anon key) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | No | Supabase public anon key (backward-compatible alias) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | **YES** | Supabase service role key. Required for privileged atomic operations, admin auth checks, and server-side RPCs. **Never expose to client.** |
| `NEXT_PUBLIC_SITE_URL` | Production (and Preview if custom domain) | No | Canonical public domain, e.g. `https://offprint.agency`. If omitted in Preview, the app automatically falls back to `VERCEL_URL`. |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | No | Alias for canonical URL, e.g. `https://offprint.agency`. |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | Production, Preview, Development | No | Studio operational timezone: `Asia/Dhaka` (+06:00). Used for appointment calculations and calendar sync. |
| `ADMIN_EMAILS` | Production, Preview, Development | No | Comma-separated admin email addresses for fallback server-side checks, e.g. `admin@offprint.agency`. Primary check uses `public.profiles.role = 'admin'`. |
| `GOOGLE_CLIENT_ID` | Production, Preview, Development | No | Google Cloud Console OAuth 2.0 Client ID, e.g. `xxxxxx.apps.googleusercontent.com`. |
| `GOOGLE_CLIENT_SECRET` | Production, Preview, Development | **YES** | Google Cloud Console OAuth 2.0 Client Secret. |
| `GOOGLE_OAUTH_REDIRECT_URI` | Production, Preview | No | Canonical OAuth callback URI: `https://offprint.agency/api/admin/integrations/google/callback`. If omitted, dynamically resolved via `getSiteBaseUrl()`. |
| `GOOGLE_REDIRECT_URI` | Production, Preview | No | Alias for `GOOGLE_OAUTH_REDIRECT_URI`. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Production, Preview, Development | **YES** | 32-byte hex string (64 characters) for AES-256-GCM encryption of stored OAuth refresh tokens. |
| `GOOGLE_CALENDAR_ID` | Production, Preview, Development | No | Target calendar identifier (e.g. `primary` or a dedicated studio calendar address). |
| `GOOGLE_SENDER_EMAIL` | Production, Preview, Development | No | Sender email address for booking notification emails (e.g. `inquiry@offprint.agency`). |
| `NEXT_PUBLIC_AGENCY_NAME` | Production, Preview, Development | No | Brand name: `"OFFPRINT (অফপ্রিন্ট)"` |
| `NEXT_PUBLIC_AGENCY_PHONE` | Production, Preview, Development | No | Studio contact telephone number: `"+880 1700-000000"` |
| `NEXT_PUBLIC_AGENCY_EMAIL` | Production, Preview, Development | No | Studio public inquiry email: `"inquiry@offprint.agency"` |
| `NEXT_PUBLIC_AGENCY_LOCATION` | Production, Preview, Development | No | Studio physical location: `"Dhaka, Bangladesh"` |

### Generating the Token Encryption Key

Generate a cryptographically secure 64-hex-character AES-256 key using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the resulting output as the value for `GOOGLE_TOKEN_ENCRYPTION_KEY` in Vercel.

---

## 5. Supabase Production Checklist

Verify that the following configurations are active on the connected Supabase project (`qqklsbbysybzivifnykd`):

### 5.1 Applied Migrations
All 6 core migrations located in `supabase/migrations/` must be applied in order:
1. `20261028000001_initial_core_schema.sql` (Profiles, Leads, Products, Portfolio, Settings)
2. `20261028000002_booking_and_portal_schema.sql` (Services, Special Booking Types, Packages, Slots, Bookings, Google Integrations)
3. `20261028000003_atomic_booking_rpcs.sql` (Atomic booking creation, rescheduling, cancellation, and slot availability functions)
4. `20261028000004_storage_admin_security_and_special_events.sql` (Storage buckets, RLS, custom questions, event management)
5. `20261028000005_admin_credential_rpcs.sql` (Admin credential change RPCs, first login security flags)
6. `20261028000006_package_management_and_frame_printing.sql` (Package CRUD RPCs, frame printing pricing schemas, historical snapshots)

### 5.2 Storage Bucket Configuration
The application uses two Supabase Storage buckets:
- `portfolio-media`: Standard bucket, **Public: Enabled**, File Size Limit: **15 MB**, Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`.
- `product-media`: Standard bucket, **Public: Enabled**, File Size Limit: **15 MB**, Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`.

#### Row-Level Security on Storage Objects:
- **Public Read:** Enabled for all users on `portfolio-media` and `product-media`.
- **Authenticated Admin Write:** Permitted exclusively for users with `role = 'admin'` in `public.profiles`.

### 5.3 Direct-to-Browser Upload Architecture
Vercel enforces a strict **4.5 MB request payload limit** (`413 FUNCTION_PAYLOAD_TOO_LARGE`) on serverless function requests. To support high-resolution photography uploads:
- Both `PortfolioCMSClient.tsx` and `AdminPortalClient.tsx` upload files directly from the administrator's browser to Supabase Storage using authenticated browser client sessions.
- Files up to the full 15 MB bucket limit upload seamlessly without routing image bytes through Vercel serverless routes.
- If a browser upload encounters a network issue, the system automatically falls back to the server route `/api/admin/storage/portfolio`.

### 5.4 Supabase Authentication URL Settings
In the Supabase Dashboard under **Authentication → URL Configuration**:
- **Site URL:** Set to `https://offprint.agency` (or your primary production URL).
- **Redirect URLs:** Add the following patterns:
  - `https://offprint.agency/**`
  - `https://*.vercel.app/**` (allows preview deployments to handle auth callbacks)
  - `http://localhost:3000/**` (for local development)

### 5.5 Administrator Account
- Ensure at least one profile in `public.profiles` has `role = 'admin'`.
- The default administrator username is `shanto` with email `admin@offprint.agency`.
- When an administrator signs in for the first time, the system prompts them to configure their personal password and profile details via the secure `admin_change_credentials` RPC.

---

## 6. Google Cloud Platform Configuration Checklist

To enable Google Calendar synchronisation and automated Gmail booking notifications:

### 6.1 Enable Google APIs
In Google Cloud Console (**APIs & Services → Library**), enable:
1. **Google Calendar API**
2. **Gmail API**

### 6.2 Configure OAuth Consent Screen
In Google Cloud Console (**APIs & Services → OAuth consent screen**):
1. **User Type:** Select **External** (or **Internal** for Google Workspace).
2. **App Information:** App Name: `OFFPRINT`, User Support Email: `inquiry@offprint.agency`.
3. **Authorized Domains:** Add `offprint.agency` and `vercel.app`.
4. **Scopes:** Add the following scopes:
   - `https://www.googleapis.com/auth/calendar.events` (Manage calendar booking events)
   - `https://www.googleapis.com/auth/gmail.send` (Send booking notifications from studio address)
   - `https://www.googleapis.com/auth/userinfo.email` (Identify connected account)
5. **Publishing Status:** Set to **Production** (or add admin Google accounts as Test Users if in Testing status).

### 6.3 OAuth 2.0 Client Credentials
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

## 7. Security Hardening & Edge Headers

The production build includes pre-configured security headers in `next.config.ts`:

- `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing exploits)
- `X-Frame-Options: SAMEORIGIN` (Protects against clickjacking attacks)
- `X-XSS-Protection: 1; mode=block` (Legacy browser XSS filter)
- `Referrer-Policy: strict-origin-when-cross-origin` (Safeguards referrer privacy)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (Restricts browser sensor access)

Database transactions are strictly guarded by PostgreSQL Row-Level Security (RLS) on all 19 public tables. Client booking writes and package modifications use concurrency-safe stored procedures (`create_booking_atomic`, `delete_or_archive_package`) with explicit table-level advisory locks to prevent race conditions and overbooking.

---

## 8. Deployment Procedures

### Method A: Deploy via Vercel Dashboard (Recommended)

1. Push all code changes to your Git repository (`main` or production branch).
2. Go to [vercel.com/new](https://vercel.com/new) and select your Git repository.
3. In the project creation wizard:
   - Select **Next.js** framework preset.
   - Expand the **Environment Variables** section.
   - Copy and paste all required environment variables from [Section 4](#4-environment-variables-specification).
4. Click **Deploy**. Vercel will build and deploy the application across its global edge network.

### Method B: Deploy via Vercel CLI

Ensure the Vercel CLI is installed and authenticated:

```bash
# 1. Install Vercel CLI globally (if not already installed)
npm install -g vercel

# 2. Authenticate
vercel login

# 3. Deploy to preview for testing
vercel

# 4. Deploy to production
vercel --prod
```

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

## 10. Troubleshooting & FAQ

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
*Document Version: 1.0.0 (Production Ready)*

