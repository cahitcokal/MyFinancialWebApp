-- Supabase Dashboard > SQL Editor'da bir kez çalıştırın.
-- Kullanıcıları Authentication > Users bölümünden oluşturun ve aşağıdaki tabloya ekleyin.

create table if not exists public.allowed_users (
  email text primary key,
  role text not null default 'member',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint allowed_users_email_lowercase check (email = lower(email)),
  constraint allowed_users_role_check check (role in ('admin', 'member'))
);

alter table public.allowed_users add column if not exists role text not null default 'member';
alter table public.allowed_users drop constraint if exists allowed_users_role_check;
alter table public.allowed_users add constraint allowed_users_role_check check (role in ('admin', 'member'));

alter table public.allowed_users enable row level security;

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where enabled = true
      and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.allowed_users
  where enabled = true
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  limit 1;
$$;

revoke all on function public.is_allowed_user() from public, anon;
grant execute on function public.is_allowed_user() to authenticated;
revoke all on function public.get_my_role() from public, anon;
grant execute on function public.get_my_role() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'asset_transactions',
    'cash_transactions',
    'home_assets',
    'market_prices',
    'muhammed_debts',
    'muhammed_incomes',
    'muhammed_payments',
    'children_cash',
    'children_gold'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists "allowed users full access" on public.%I', table_name);
      execute format('drop policy if exists "allowed users can read" on public.%I', table_name);
      execute format('drop policy if exists "allowed users can insert" on public.%I', table_name);
      execute format('drop policy if exists "admins can update" on public.%I', table_name);
      execute format('drop policy if exists "admins can delete" on public.%I', table_name);
      execute format(
        'create policy "allowed users can read" on public.%I for select to authenticated using (auth.uid() is not null and public.is_allowed_user())',
        table_name
      );
      execute format(
        'create policy "allowed users can insert" on public.%I for insert to authenticated with check (auth.uid() is not null and public.is_allowed_user())',
        table_name
      );
      execute format(
        'create policy "admins can update" on public.%I for update to authenticated using (public.get_my_role() = ''admin'') with check (public.get_my_role() = ''admin'')',
        table_name
      );
      execute format(
        'create policy "admins can delete" on public.%I for delete to authenticated using (public.get_my_role() = ''admin'')',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- Örnek:
-- Admin örneği:
-- insert into public.allowed_users (email, role) values ('admin@example.com', 'admin');
-- Member örneği:
-- insert into public.allowed_users (email, role) values ('member@example.com', 'member');
