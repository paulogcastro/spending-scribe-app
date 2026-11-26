-- DinDin Flow — Schema para armazenamento por usuário e controle de acesso (Admin + RLS)
-- Cole este script no SQL Editor do Supabase e clique em "Run".

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  blocked_reason text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

grant select on table public.user_profiles to authenticated;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

-- Cria perfil automaticamente para novos cadastros (e-mail ou Google)
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, created_at, last_seen_at)
  values (new.id, coalesce(new.email, ''), coalesce(new.created_at, now()), now())
  on conflict (user_id) do update
    set email = coalesce(excluded.email, public.user_profiles.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Preenche perfis para usuários que já existiam antes deste script
insert into public.user_profiles (user_id, email, created_at, last_seen_at)
select id, coalesce(email, ''), coalesce(created_at, now()), coalesce(last_sign_in_at, created_at, now())
from auth.users
on conflict (user_id) do nothing;

-- Helpers de autorização (usados por RLS e RPCs)
create or replace function public.is_active_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.user_profiles
    where user_id = uid
      and status = 'blocked'
  );
$$;

create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = uid
      and role = 'admin'
      and status = 'active'
  );
$$;

-- Atualiza último acesso do usuário autenticado e retorna seu perfil de acesso
create or replace function public.touch_my_profile()
returns table (
  role text,
  status text,
  blocked_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  insert into public.user_profiles (user_id, email, last_seen_at)
  values (v_uid, v_email, now())
  on conflict (user_id) do update
    set email = case when excluded.email <> '' then excluded.email else public.user_profiles.email end,
        last_seen_at = now();

  return query
  select p.role, p.status, p.blocked_reason
  from public.user_profiles p
  where p.user_id = v_uid;
end;
$$;

grant execute on function public.touch_my_profile() to authenticated;

-- RPCs administrativas (validadas no servidor)
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  role text,
  status text,
  blocked_reason text,
  created_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores.';
  end if;

  return query
  select p.user_id, p.email, p.role, p.status, p.blocked_reason, p.created_at, p.last_seen_at
  from public.user_profiles p
  order by p.last_seen_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_user_status(
  target_user_id uuid,
  new_status text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Você não pode bloquear a sua própria conta.';
  end if;

  if new_status not in ('active', 'blocked') then
    raise exception 'Status inválido.';
  end if;

  update public.user_profiles
  set status = new_status,
      blocked_reason = case
        when new_status = 'blocked' then nullif(trim(coalesce(reason, '')), '')
        else null
      end
  where user_id = target_user_id;
end;
$$;

grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;

-- Tabela principal de dados financeiros por usuário
create table if not exists public.user_finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cycle_state jsonb,
  cycle_planning jsonb,
  expense_domain jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_finance_data enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.user_finance_data to authenticated;

drop policy if exists "Users can read own finance data" on public.user_finance_data;
create policy "Users can read own finance data"
  on public.user_finance_data
  for select
  using (auth.uid() = user_id and public.is_active_user(auth.uid()));

drop policy if exists "Users can insert own finance data" on public.user_finance_data;
create policy "Users can insert own finance data"
  on public.user_finance_data
  for insert
  with check (auth.uid() = user_id and public.is_active_user(auth.uid()));

drop policy if exists "Users can update own finance data" on public.user_finance_data;
create policy "Users can update own finance data"
  on public.user_finance_data
  for update
  using (auth.uid() = user_id and public.is_active_user(auth.uid()))
  with check (auth.uid() = user_id and public.is_active_user(auth.uid()));

drop policy if exists "Users can delete own finance data" on public.user_finance_data;
create policy "Users can delete own finance data"
  on public.user_finance_data
  for delete
  using (auth.uid() = user_id and public.is_active_user(auth.uid()));

-- Para definir sua conta como administradora, rode uma vez (trocando pelo seu e-mail):
-- update public.user_profiles set role = 'admin' where email = 'seu-email@exemplo.com';
