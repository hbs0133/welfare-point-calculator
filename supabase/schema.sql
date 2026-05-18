create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (
    category in ('club', 'exercise', 'bookEducationOffice')
  ),
  amount integer not null check (amount > 0),
  memo text not null default '',
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists "Users can read own expenses" on public.expenses;
drop policy if exists "Users can insert own expenses" on public.expenses;
drop policy if exists "Users can update own expenses" on public.expenses;
drop policy if exists "Users can delete own expenses" on public.expenses;

create policy "Users can read own expenses"
on public.expenses
for select
using (auth.uid() = user_id);

create policy "Users can insert own expenses"
on public.expenses
for insert
with check (auth.uid() = user_id);

create policy "Users can update own expenses"
on public.expenses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own expenses"
on public.expenses
for delete
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_expenses_updated_at on public.expenses;

create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

create index if not exists expenses_user_date_idx
on public.expenses (user_id, date desc);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = user_id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.split_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  category text not null check (
    category in ('club', 'exercise', 'bookEducationOffice')
  ),
  total_amount integer not null check (total_amount > 0),
  per_person_amount integer not null check (per_person_amount > 0),
  participant_count integer not null check (participant_count >= 2),
  memo text not null default '',
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.split_request_recipients (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.split_requests(id) on delete cascade,
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected')
  ),
  accepted_expense_id uuid references public.expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, recipient_id)
);

alter table public.split_requests enable row level security;
alter table public.split_request_recipients enable row level security;

create or replace function public.is_split_request_recipient(target_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.split_request_recipients
    where request_id = target_request_id
      and recipient_id = auth.uid()
  );
$$;

drop policy if exists "Users can read related split requests" on public.split_requests;
drop policy if exists "Users can insert own split requests" on public.split_requests;
drop policy if exists "Users can update own split requests" on public.split_requests;
drop policy if exists "Users can delete own split requests" on public.split_requests;

create policy "Users can read related split requests"
on public.split_requests
for select
using (
  requester_id = auth.uid()
  or public.is_split_request_recipient(id)
);

create policy "Users can insert own split requests"
on public.split_requests
for insert
with check (requester_id = auth.uid());

create policy "Users can update own split requests"
on public.split_requests
for update
using (requester_id = auth.uid())
with check (requester_id = auth.uid());

create policy "Users can delete own split requests"
on public.split_requests
for delete
using (requester_id = auth.uid());

drop policy if exists "Users can read own split recipients" on public.split_request_recipients;
drop policy if exists "Requesters can insert split recipients" on public.split_request_recipients;
drop policy if exists "Recipients can update own split recipient" on public.split_request_recipients;

create policy "Users can read own split recipients"
on public.split_request_recipients
for select
using (recipient_id = auth.uid());

create policy "Requesters can insert split recipients"
on public.split_request_recipients
for insert
with check (
  exists (
    select 1
    from public.split_requests
    where id = request_id
      and requester_id = auth.uid()
  )
);

create policy "Recipients can update own split recipient"
on public.split_request_recipients
for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop trigger if exists set_split_requests_updated_at on public.split_requests;

create trigger set_split_requests_updated_at
before update on public.split_requests
for each row
execute function public.set_updated_at();

create index if not exists profiles_email_idx
on public.profiles (email);

create index if not exists profiles_display_name_idx
on public.profiles (display_name);

create index if not exists split_requests_requester_date_idx
on public.split_requests (requester_id, date desc);

create index if not exists split_request_recipients_recipient_status_idx
on public.split_request_recipients (recipient_id, status, created_at desc);
