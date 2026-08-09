-- ============================================================
-- CivicConnect – Complete Database Schema
-- Run this entire file in Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS and DROP IF EXISTS.
-- ============================================================

-- Enable required extensions
create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_status as enum (
    'submitted',
    'under_review',
    'assigned',
    'in_progress',
    'resolved',
    'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_category as enum (
    'garbage',
    'road_damage',
    'drainage',
    'water',
    'streetlight',
    'other'
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  email       text,
  role        public.user_role not null default 'user',
  created_at  timestamptz not null default now()
);

create table if not exists public.issues (
  id                   uuid primary key default gen_random_uuid(),
  complaint_code       text unique not null
                         default ('CIV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  reporter_id          uuid not null references public.profiles(id) on delete cascade,
  category             public.issue_category not null,
  title                text not null,
  description          text not null,
  image_url            text,
  latitude             double precision,
  longitude            double precision,
  location_text        text,
  status               public.issue_status not null default 'submitted',
  admin_response       text,
  assigned_to          uuid references public.profiles(id) on delete set null,
  resolution_image_url text,
  resolved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.issue_updates (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references public.issues(id) on delete cascade,
  status      public.issue_status not null,
  note        text,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists issues_reporter_idx   on public.issues(reporter_id);
create index if not exists issues_status_idx     on public.issues(status);
create index if not exists issues_category_idx   on public.issues(category);
create index if not exists issues_created_idx    on public.issues(created_at desc);
create index if not exists issue_updates_issue_idx on public.issue_updates(issue_id, created_at);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-update updated_at on issues
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists issues_updated_at on public.issues;
create trigger issues_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

-- Auto-create profile on new Supabase Auth user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Civic User'),
    new.phone,
    new.email
  )
  on conflict (id) do update
    set phone = excluded.phone,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper: check if a user is admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable
security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$;

-- Helper: promote a user to admin (call via SQL Editor)
create or replace function public.make_admin(uid uuid)
returns void language sql
security definer set search_path = public as $$
  update public.profiles set role = 'admin' where id = uid;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.issues       enable row level security;
alter table public.issue_updates enable row level security;

-- ---- profiles ----

drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

-- ---- issues ----

drop policy if exists "users create issues" on public.issues;
create policy "users create issues"
on public.issues for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "users read own issues" on public.issues;
create policy "users read own issues"
on public.issues for select
to authenticated
using (reporter_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "admins update issues" on public.issues;
create policy "admins update issues"
on public.issues for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ---- issue_updates ----

drop policy if exists "users read own updates" on public.issue_updates;
create policy "users read own updates"
on public.issue_updates for select
to authenticated
using (
  exists (
    select 1 from public.issues i
    where i.id = issue_updates.issue_id
      and (i.reporter_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

-- Citizens can insert the initial "submitted" update when they create a complaint.
-- Admins can insert any update for any issue.
drop policy if exists "users create own updates" on public.issue_updates;
create policy "users create own updates"
on public.issue_updates for insert
to authenticated
with check (
  -- Admin can insert any update
  public.is_admin(auth.uid())
  or
  -- Citizen can only insert an update for their own issue
  exists (
    select 1 from public.issues i
    where i.id = issue_updates.issue_id
      and i.reporter_id = auth.uid()
  )
);

-- ============================================================
-- STORAGE: issue-images bucket
-- ============================================================

insert into storage.buckets (id, name, public)
values ('issue-images', 'issue-images', true)
on conflict (id) do update set public = true;

-- Authenticated users can upload images
drop policy if exists "authenticated upload issue images" on storage.objects;
create policy "authenticated upload issue images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'issue-images');

-- Anyone (public) can view images (URLs are already public)
drop policy if exists "public read issue images" on storage.objects;
create policy "public read issue images"
on storage.objects for select
to public
using (bucket_id = 'issue-images');

-- Authenticated users can update their own uploaded objects
drop policy if exists "authenticated update issue images" on storage.objects;
create policy "authenticated update issue images"
on storage.objects for update
to authenticated
using (bucket_id = 'issue-images');

-- ============================================================
-- ADMIN CREATION
-- To make your account admin after registering, run:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'your@email.com';
--
-- Or using the helper function:
--   SELECT public.make_admin(
--     (SELECT id FROM public.profiles WHERE email = 'your@email.com')
--   );
-- ============================================================
