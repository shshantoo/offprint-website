# OFFPRINT (অফপ্রিন্ট)

**OFFPRINT** is a full-stack corporate agency portfolio and bespoke lead management CRM platform for a Govt. Registered agency in Bangladesh (Est. Sep 2025) with 50+ delivered projects across summits, institutions, corporate entities, restaurants, and clothing brands.

---

## 🏛️ Agency Overview & Dual Core Wings

1. **Media & Coverage Wing**:
   - Corporate summits, seminars, workshops, brand documentaries, executive headshots, and seasonal bespoke weddings.
2. **Physical Print & Merch Solutions Wing**:
   - 650 GSM cotton blind debossed business cards, 12mm optical clear acrylic frames, custom executive swag gift boxes, laser-engraved metal pens, and heavy-duty summit roll-up banners.
3. **Bespoke Pricing Model**:
   - Strictly offline / bespoke quotation based. Clients submit a project draft/inquiry; the team handles deals via direct calls.

---

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
- **UI Architecture**: Glassmorphism, ambient glows, micro-interactions, [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Backend & DB**: [Supabase](https://supabase.com/) (PostgreSQL with RLS, Enums & Storage buckets) + LocalStorage/In-Memory resilient offline fallback
- **State & Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation

---

## 🎨 Brand Design Tokens

| Token | Hex Value | Description |
| :--- | :--- | :--- |
| **Primary Accent** | `#4a2805` | Deep Espresso Brown |
| **Accent Glow / Tint** | `#c98a4b` | Warm Bronze |
| **Secondary Accent** | `#6e3c08` | Light Brown |
| **Base Background** | `#0a0a0a` | True Rich Black |
| **Surface / Cards** | `#141210` | Warm Charcoal Surface |
| **Borders** | `#26201b` | Subtle Charcoal Border |
| **Typography Text** | `#f5f0eb` | Linen / Off-White High-Contrast |
| **Muted Labels** | `#a89f91` | Warm Muted Gray |

---

## 📁 Key Routes

- `/` — Homepage with ambient glow hero, flagship showcase, services bento grid, print solutions bridge, and interactive quote builder
- `/works` — Complete production archive with search, category filtering, and lightbox modal
- `/print-solutions` — Dedicated physical merchandise and print catalog with MOQ specifications and sample order modals
- `/about` — Agency history, Govt. Registration credentials, Dhaka headquarters, and offline pricing ethos
- `/contact` — Direct telephone/email communications desk and embedded draft form
- `/admin/leads` — Full CRM pipeline with status filter, inline status selector, admin notes editor, one-click direct phone/email triggers, and CSV export
- `/admin/portfolio` — Portfolio CMS to add, edit, delete, and toggle flagship status
- `/admin/products` — Physical merchandise CMS for managing products and material specifications

---

## 🔐 Administrative Access

- **Admin URL**: [`/admin/leads`](http://localhost:3000/admin/leads)
- **Master Security Passcode**: `OFFPRINT2026`

---

## 🗄️ Database Setup (Supabase)

To link your remote Supabase database:
1. Create a project in [Supabase](https://supabase.com/).
2. Run the SQL schema in `supabase/schema.sql` inside the Supabase SQL Editor.
3. (Optional) Run `supabase/seed.sql` to populate sample corporate projects and products.
4. Copy your Supabase URL and Anon Key into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ADMIN_PASSCODE=OFFPRINT2026
   ```

*Note: The platform includes a fallback layer that operates with mock seed data and browser storage when Supabase environment variables are omitted.*

---

## 📦 GitHub Deployment

This repository is published on GitHub at:
[https://github.com/shshantoo/offprint-website](https://github.com/shshantoo/offprint-website)
   ```bash
   git push -u origin main
   ```
