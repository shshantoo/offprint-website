# OFFPRINT (অফপ্রিন্ট) — Photography Portfolio, Booking System, Client Portal & Admin CMS

**OFFPRINT (অফপ্রিন্ট)** is a full-stack photography agency portfolio, dual-pathway appointment booking system, client portal, Google Calendar & Gmail integration suite, and unified Admin CMS/CRM for a Govt. Registered photography and print studio in Dhaka, Bangladesh (Est. Sep 2025).

---

## 🏛️ Platform Architecture & Core Modules

1. **Public Portfolio & Print Archive**:
   - Editorial photography showcase (`/works`), physical print & bespoke merchandise catalog (`/print-solutions`), agency credentials (`/about`), and inquiries desk (`/contact`).
2. **Dual-Pathway Photography Booking System (`/book`)**:
   - **IUB 27th Convocation Photography (`/book/convocation`)**: Event-driven booking calendar with administrator-configurable dates, sessions, time slots, per-slot capacities, buffer periods, blackout blocks, and convocation packages.
   - **Traditional Photography Booking (`/book/traditional`)**: Flexible booking flow for portraits, corporate events, weddings, product campaigns, and custom services governed by studio operating hours, buffers, notice windows, and shared resource-pool concurrency.
3. **Concurrency & Timezone Engine (`Asia/Dhaka`)**:
   - Authoritative database reservations powered by PostgreSQL advisory locks (`pg_advisory_xact_lock`) and row-level locking (`SELECT ... FOR UPDATE`) to prevent double-booking, overbooking, and cross-pathway schedule collisions.
4. **Client Authentication & Self-Service Portal (`/client-portal`)**:
   - Supabase Auth registration, sign-in, and password recovery.
   - Upcoming, completed, and cancelled reservations view; atomic self-service rescheduling and cancellation with policy cutoff enforcement.
5. **Hidden Admin Portal (`/admin-portal`)**:
   - Protected by Supabase Auth + server-verified `profiles.role = 'admin'` (never linked in public navigation).
   - Includes Executive Overview, Bookings CRM, Day/Week/Month Admin Calendar, Convocation & Traditional Schedule Manager, Google Calendar + Gmail OAuth & Email Template Studio, and Website CMS (Site Settings, Portfolio, Print Catalog, and Leads).

---

## 🎨 Editorial Light Design System

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| **Primary Background** | `#FAF7F2` | Warm alabaster cream page canvas |
| **Secondary Surface** | `#F4EFE6` | Soft editorial sand section contrast |
| **Card Surface** | `#FFFFFF` | Crisp gallery card surface |
| **Borders & Dividers** | `#E5DEC9` | Warm stone border |
| **Primary Accent** | `#3A2008` | Deep espresso brown |
| **Secondary Accent** | `#5C4028` | Muted cocoa |
| **Highlight Accent** | `#A66D35` | Restrained editorial bronze |
| **Primary Typography** | `#141210` | Rich gallery black |

---

## 📁 Key Routes

### Public Website & Booking Flows
- `/` — Editorial homepage with hero showcase, booking CTAs, flagship works, services bento, print bridge, and bespoke quote builder
- `/book` — Booking gateway presenting **IUB 27th Convocation Photography** and **Traditional Photography Booking**
- `/book/convocation` — Live IUB 27th Convocation calendar, session/package selector, slot picker, and reservation checkout
- `/book/traditional` — Traditional photography service selector, package picker, live date/slot calendar, and checkout
- `/booking/confirmation` — Reservation confirmation receipt (`OFP-YYYY-XXXXXX`) with policy summary and Client Portal link
- `/works` — Filterable photography and cinematography archive
- `/print-solutions` — Physical print and bespoke merchandise catalog
- `/about` — Studio story, registration credentials, and Dhaka headquarters
- `/contact` — Direct studio communications and project inquiry form

### Authenticated Portals
- `/client-portal` — Client authentication and booking management dashboard
- `/client-portal/bookings/[id]` — Detailed reservation view with policy-aware reschedule and cancel controls
- `/admin-portal` — Direct-URL-only Admin CMS, CRM, Schedule Manager, and Google Integrations console (`/admin/*` redirects here)

---

## 🗄️ Supabase Database Setup & Migrations

### 1. Environment Variables (`.env.local`)

Configure `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qqklsbbysybzivifnykd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_FSDszrBIjIbZFyeTsgCLrQ_t6Q7hDWp
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_FSDszrBIjIbZFyeTsgCLrQ_t6Q7hDWp

# Recommended for privileged server-side admin operations & atomic RPCs:
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Comma-separated emails automatically granted admin role upon sign-in:
ADMIN_EMAILS=admin@offprint.bd

# Application URL & Default Timezone:
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Dhaka
```

### 2. Apply the Database Schema in Supabase

Open the **Supabase Dashboard → SQL Editor** for project `qqklsbbysybzivifnykd` and execute either:

- **Option A (Single Consolidated Script)**: Run [`supabase/schema.sql`](./supabase/schema.sql), which applies the complete schema, enums, RLS policies, atomic PostgreSQL RPCs, and initial seed data in one idempotent run.
- **Option B (Sequential Migrations)**: Run the migration files in [`supabase/migrations/`](./supabase/migrations/) in order:
  1. `supabase/migrations/20261028000001_initial_core_schema.sql`
  2. `supabase/migrations/20261028000002_booking_and_portal_schema.sql`
  3. `supabase/migrations/20261028000003_atomic_booking_rpcs.sql`

### 3. Granting Administrator Access (`/admin-portal`)

To promote a registered Supabase user to Administrator:

1. Sign up or sign in once at `/client-portal` or `/admin-portal`, **or** add your email to `ADMIN_EMAILS` in `.env.local`.
2. Or run the following SQL in the **Supabase SQL Editor**:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', updated_at = timezone('utc'::text, now())
   WHERE email = 'your-admin-email@example.com';
   ```

---

## 🔗 Google Calendar & Gmail OAuth 2.0 Setup

OFFPRINT synchronizes confirmed, rescheduled, and cancelled bookings with **Google Calendar API v3** and sends branded `multipart/alternative` HTML + plain-text emails through **Gmail API v1**.

### 1. Google Cloud Console Configuration
1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Navigate to **APIs & Services → Library** and enable:
   - **Google Calendar API**
   - **Gmail API**
3. Navigate to **APIs & Services → OAuth consent screen**:
   - Configure the consent screen (External or Internal) and add scopes:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Add your Google account as a Test User if the app is in Testing mode.
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI:
     ```text
     http://localhost:3000/api/admin/integrations/google/callback
     ```
     *(Add your production domain equivalent when deploying.)*
5. Copy the **Client ID** and **Client Secret** into `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/admin/integrations/google/callback
   GOOGLE_TOKEN_ENCRYPTION_KEY=generate-a-32-byte-secret-for-aes-256-gcm
   ```

### 2. Connecting Google in the Admin Portal
1. Sign in at `/admin-portal` with an administrator account.
2. Open the **Google & Emails** tab.
3. Click **Connect Google Account** to authorize Google Calendar and Gmail access, or configure a Manual Refresh Token if preferred.
4. Select or specify the target Google Calendar ID (`primary` by default), toggle Calendar Sync and Gmail Notifications, and use **Send Test Email** to verify delivery.

---

## 🧪 Verification & Commands

```bash
# Run automated unit & concurrency test suite (9 tests)
npm test

# Type-check TypeScript across the codebase
npx tsc --noEmit

# Run ESLint verification
npm run lint

# Build production Next.js bundle
npm run build
```
