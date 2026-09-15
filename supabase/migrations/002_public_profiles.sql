-- Perfiles públicos: solamente información segura para mostrar junto a las reseñas.
-- NO expone el role ni otros datos privados de profiles.

create or replace view public.public_profiles as
select
  id,
  display_name,
  avatar_url
from public.profiles;

grant select on public.public_profiles to anon;
grant select on public.public_profiles to authenticated;