# CivicConnect

**A citizen-powered municipal issue reporting platform.**

Citizens report civic problems (potholes, garbage, drainage, streetlights, water issues) with photos and GPS. The municipality admin dashboard tracks and resolves every complaint with a full status history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router v7 |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| Storage | Supabase Storage (`issue-images` bucket) |
| Icons | lucide-react |
| Deployment | Vercel (SPA rewrites configured) |

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon/public key** from  
   `Project Settings → API`.

### 3. Enable email/password authentication

1. In the Supabase dashboard go to `Authentication → Providers`.
2. Make sure **Email** is enabled.
3. Under `Authentication → Settings`, disable **Confirm email** if you want instant login during development (optional but recommended for hackathon).

### 4. Run the database schema

1. Open the Supabase **SQL Editor**.
2. Copy the entire contents of [`supabase/schema.sql`](./supabase/schema.sql).
3. Paste and **Run** it.

This creates:
- `profiles`, `issues`, `issue_updates` tables
- PostgreSQL enums for status, category, role
- `handle_new_user()` trigger (auto-creates profile on sign-up)
- `set_updated_at()` trigger
- `is_admin()` and `make_admin()` helper functions
- All Row Level Security (RLS) policies
- `issue-images` storage bucket with policies
- Performance indexes

### 5. Configure storage (already done by schema.sql)

The schema creates the `issue-images` storage bucket automatically.  
Verify it exists at `Storage → Buckets` in your Supabase dashboard.

### 6. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

> ⚠️ **Never commit `.env` to git.** It is listed in `.gitignore`.

### 7. Start the development server

```bash
npm run dev
```

The app will be available at `https://civicconnect-red.vercel.app`. (Locally runs on `http://localhost:5173`)

---

## Creating the First Admin

After running the schema and registering your account through the app:

1. Open the Supabase **SQL Editor**.
2. Run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

Or using the helper function:

```sql
SELECT public.make_admin(
  (SELECT id FROM public.profiles WHERE email = 'your@email.com')
);
```

3. Sign out and sign back in — you will now see the **Admin Dashboard** at `/admin`.

---

## Application Routes

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Sign in with email + password |
| `/register` | Public | Create a new citizen account |
| `/` | Citizen | Home dashboard with recent reports |
| `/report` | Citizen | Submit a new civic complaint |
| `/my-issues` | Citizen | View all your submitted complaints |
| `/issues/:id` | Citizen | Complaint detail + status timeline |
| `/admin` | Admin only | Municipality dashboard |
| `/admin/issues/:id` | Admin only | Update complaint status + add response |

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Linked to `auth.users` |
| `full_name` | text | Set from sign-up metadata |
| `email` | text | Synced from auth |
| `phone` | text | Optional |
| `role` | enum | `user` \| `admin` |
| `created_at` | timestamptz | |

### `issues`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `complaint_code` | text | e.g. `CIV-AB12CD34` |
| `reporter_id` | uuid | FK → profiles |
| `category` | enum | garbage, road_damage, drainage, water, streetlight, other |
| `title` | text | |
| `description` | text | |
| `image_url` | text | Supabase Storage URL |
| `latitude` | float8 | GPS |
| `longitude` | float8 | GPS |
| `location_text` | text | Landmark description |
| `status` | enum | submitted → ... → resolved |
| `admin_response` | text | Latest admin note |
| `resolution_image_url` | text | Admin uploaded photo |
| `resolved_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |

### `issue_updates`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `issue_id` | uuid | FK → issues |
| `status` | enum | Status at time of update |
| `note` | text | Description of the action |
| `updated_by` | uuid | FK → profiles |
| `created_at` | timestamptz | |

---

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. TypeScript errors will prevent the build — fix all type errors first.

---

## Vercel Deployment

The project is already configured for Vercel SPA deployment via [`vercel.json`](./vercel.json).

### Steps

1. Push your project to GitHub (make sure `.env` is **not** committed).

2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.

3. Set environment variables in Vercel's project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Deploy. Vercel will auto-detect Vite and run `npm run build`.

5. Your Supabase project's **Site URL** (Authentication → URL Configuration) should be set to your Vercel deployment URL.

---

## Security Model

| Actor | Can do | Cannot do |
|---|---|---|
| Anonymous | Access `/login`, `/register` only | Access any other page |
| Citizen | Create, read own complaints; upload photos; read own status history | Read other citizens' data; change status; access admin |
| Admin | Read all complaints; update any status; add response; upload resolution photo; read all history | — |

All access control is enforced both at the frontend (route guards) and at the database (RLS policies).

---

## Issue Status Flow

```
submitted → under_review → assigned → in_progress → resolved
                                                   ↘ rejected
```

Every status change creates an entry in `issue_updates`, giving the citizen a full timeline view.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key (safe to expose) |

> The anon key is a **publishable** key — it is safe to include in frontend code. All data access is controlled by Row Level Security policies in PostgreSQL.
