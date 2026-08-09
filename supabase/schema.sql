-- ============================================================
-- CivicConnect – Complete Database Schema & Demo Accounts
-- Run this entire file in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_status as enum (
    'submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_category as enum (
    'garbage', 'road_damage', 'drainage', 'water', 'streetlight', 'other'
  );
exception when duplicate_object then null; end $$;

-- Tables
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

-- Indexes
create index if not exists issues_reporter_idx   on public.issues(reporter_id);
create index if not exists issues_status_idx     on public.issues(status);
create index if not exists issues_category_idx   on public.issues(category);
create index if not exists issues_created_idx    on public.issues(created_at desc);
create index if not exists issue_updates_issue_idx on public.issue_updates(issue_id, created_at);

-- Auto Confirm Trigger for Signups
create or replace function public.auto_confirm_user()
returns trigger language plpgsql
security definer set search_path = public, auth
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
before insert on auth.users
for each row execute function public.auto_confirm_user();

-- Auto Profile Trigger
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

-- Auto Confirm existing users
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;

-- Row Level Security
alter table public.profiles     enable row level security;
alter table public.issues       enable row level security;
alter table public.issue_updates enable row level security;

drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read" on public.profiles for select to authenticated
using (id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update to authenticated
using (id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "users create issues" on public.issues;
create policy "users create issues" on public.issues for insert to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "users read own issues" on public.issues;
create policy "users read own issues" on public.issues for select to authenticated
using (reporter_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "admins update issues" on public.issues;
create policy "admins update issues" on public.issues for update to authenticated
using ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "users read own updates" on public.issue_updates;
create policy "users read own updates" on public.issue_updates for select to authenticated
using (
  exists (
    select 1 from public.issues i
    where i.id = issue_updates.issue_id
      and (i.reporter_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin')
  )
);

drop policy if exists "users create own updates" on public.issue_updates;
create policy "users create own updates" on public.issue_updates for insert to authenticated
with check (
  (select role from public.profiles where id = auth.uid()) = 'admin'
  or
  exists (select 1 from public.issues i where i.id = issue_updates.issue_id and i.reporter_id = auth.uid())
);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('issue-images', 'issue-images', true)
on conflict (id) do update set public = true;

drop policy if exists "authenticated upload issue images" on storage.objects;
create policy "authenticated upload issue images" on storage.objects for insert to authenticated with check (bucket_id = 'issue-images');

drop policy if exists "public read issue images" on storage.objects;
create policy "public read issue images" on storage.objects for select to public using (bucket_id = 'issue-images');

drop policy if exists "authenticated update issue images" on storage.objects;
create policy "authenticated update issue images" on storage.objects for update to authenticated using (bucket_id = 'issue-images');

-- ============================================================
-- CREATE INSTANT DEMO ACCOUNTS (No signup configuration needed!)
-- ============================================================

-- Citizen: citizen@civicconnect.com / password123
do $$
declare
  cid uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'citizen@civicconnect.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', cid, 'authenticated', 'authenticated',
      'citizen@civicconnect.com', crypt('password123', gen_salt('bf')), now(),
      '{"full_name":"Test Citizen"}'::jsonb, now(), now()
    );
  end if;
end $$;

-- Admin: admin@civicconnect.com / password123
do $$
declare
  aid uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'admin@civicconnect.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', aid, 'authenticated', 'authenticated',
      'admin@civicconnect.com', crypt('password123', gen_salt('bf')), now(),
      '{"full_name":"Municipal Admin"}'::jsonb, now(), now()
    );
  end if;
end $$;

-- Make sure admin account has admin role
update public.profiles set role = 'admin' where email = 'admin@civicconnect.com';
