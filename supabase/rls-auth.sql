-- Supabase Dashboard > SQL Editor'da bir kez çalıştırın.
-- Kullanıcıları Authentication > Users bölümünden oluşturun ve aşağıdaki tabloya ekleyin.

create table if not exists public.allowed_users (
  email text primary key,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint allowed_users_email_lowercase check (email = lower(email))
);

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

revoke all on function public.is_allowed_user() from public, anon;
grant execute on function public.is_allowed_user() to authenticated;

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
      execute format(
        'create policy "allowed users full access" on public.%I for all to authenticated using (auth.uid() is not null and public.is_allowed_user()) with check (auth.uid() is not null and public.is_allowed_user())',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- Örnek:
-- insert into public.allowed_users (email) values ('izinli.kullanici@example.com');
