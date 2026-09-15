-- Perfil: username obligatorio internamente + visibilidad pública de identidad.
-- Ejecutar después de 004_restaurant_approval.sql.

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists is_public boolean not null default true;

-- Genera usernames únicos para perfiles existentes.
do $$
declare
  p record;
  base text;
  candidate text;
  n integer;
begin
  for p in select id, display_name, username from public.profiles order by created_at, id loop
    if p.username is not null and btrim(p.username) <> '' then
      continue;
    end if;

    base := lower(regexp_replace(split_part(coalesce(p.display_name, 'usuario'), ' ', 1), '[^a-zA-Z0-9_]', '', 'g'));
    if base is null or btrim(base) = '' then base := 'usuario'; end if;
    if char_length(base) < 3 then base := base || 'user'; end if;
    base := left(base, 30);

    candidate := base;
    n := 2;
    while exists (select 1 from public.profiles x where lower(x.username) = lower(candidate) and x.id <> p.id) loop
      candidate := left(base, greatest(1, 30 - char_length('_' || n::text))) || '_' || n::text;
      n := n + 1;
    end loop;

    update public.profiles set username = candidate where id = p.id;
  end loop;
end $$;

alter table public.profiles alter column username set not null;

drop index if exists profiles_username_unique;
create unique index profiles_username_unique on public.profiles (lower(username));

alter table public.profiles drop constraint if exists profiles_username_length;
alter table public.profiles add constraint profiles_username_length
  check (char_length(btrim(username)) between 3 and 30);

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (btrim(username) ~ '^[a-zA-Z0-9_]+$');

-- La vista pública nunca expone el username de un usuario privado.
drop view if exists public.public_profiles;
create view public.public_profiles as
select
  id,
  case when is_public then username else 'Usuario' end as reviewer_name,
  is_public,
  avatar_url
from public.profiles;

grant select on public.public_profiles to anon;
grant select on public.public_profiles to authenticated;

-- Username único para usuarios nuevos, incluso si el prefijo del email se repite.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  n integer := 2;
begin
  base_username := lower(regexp_replace(
    split_part(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'usuario'), ' ', 1),
    '[^a-zA-Z0-9_]', '', 'g'
  ));

  if base_username is null or btrim(base_username) = '' then base_username := 'usuario'; end if;
  if char_length(base_username) < 3 then base_username := base_username || 'user'; end if;
  base_username := left(base_username, 30);
  candidate := base_username;

  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    candidate := left(base_username, greatest(1, 30 - char_length('_' || n::text))) || '_' || n::text;
    n := n + 1;
  end loop;

  insert into public.profiles (id, username, display_name, is_public, role)
  values (new.id, candidate, candidate, true, 'user')
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.update_my_profile(
  p_username text,
  p_is_public boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_username text;
  result public.profiles;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  cleaned_username := btrim(p_username);

  if cleaned_username = '' then raise exception 'El nombre de usuario es obligatorio.'; end if;
  if char_length(cleaned_username) < 3 then raise exception 'El nombre de usuario debe tener al menos 3 caracteres.'; end if;
  if char_length(cleaned_username) > 30 then raise exception 'El nombre de usuario no puede superar los 30 caracteres.'; end if;
  if cleaned_username !~ '^[a-zA-Z0-9_]+$' then raise exception 'El nombre de usuario solo puede contener letras, números y _.'; end if;

  if exists (
    select 1 from public.profiles
    where lower(username) = lower(cleaned_username) and id <> auth.uid()
  ) then raise exception 'Ese nombre de usuario ya está ocupado.'; end if;

  update public.profiles
  set username = cleaned_username,
      display_name = cleaned_username,
      is_public = coalesce(p_is_public, true),
      updated_at = now()
  where id = auth.uid()
  returning * into result;

  if result.id is null then raise exception 'No se encontró el perfil.'; end if;
  return result;
end;
$$;

grant execute on function public.update_my_profile(text, boolean) to authenticated;
