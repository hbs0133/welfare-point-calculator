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
