-- ============================================================
-- Hero Shelf Check — Patch 003
-- Auto-creates rep_users record when a new user confirms their
-- email. This is the activation step — no manual Supabase entry
-- needed after this trigger is in place.
--
-- Also sends an admin notification row to new_signups log table
-- so the admin can see who has signed up.
--
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: create a log table for new signups (admin visibility)
create table if not exists public.signup_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  signed_up_at timestamptz not null default now()
);

-- Step 2: function that fires on new auth user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Auto-create rep_users record with role = 'rep'
  insert into public.rep_users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)   -- fallback: use email prefix as name
    ),
    'rep'
  )
  on conflict (id) do nothing;   -- safe to re-run, won't duplicate

  -- Log the signup for admin visibility
  insert into public.signup_log (user_id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );

  return new;
end;
$$ language plpgsql security definer;

-- Step 3: attach trigger to auth.users (fires on every new signup)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Step 4: RLS on signup_log — admin can read, no one can write directly
alter table public.signup_log enable row level security;

create policy "signup_log_admin_read" on public.signup_log
  for select using (
    exists (
      select 1 from public.rep_users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Step 5: verify (shows existing users who may need rep_users created manually)
select u.id, u.email, u.created_at, r.id as has_rep_record
from auth.users u
left join public.rep_users r on r.id = u.id
order by u.created_at desc
limit 20;
