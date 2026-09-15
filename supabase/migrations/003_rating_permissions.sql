-- Permisos y reglas para editar/eliminar evaluaciones.
-- Si ya ejecutaste este cambio anteriormente, podés saltearlo.

drop policy if exists "Users can update own ratings" on public.ratings;
drop policy if exists "ratings own update" on public.ratings;
create policy "ratings own update"
on public.ratings
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_editor_or_admin()
)
with check (
  user_id = auth.uid()
  or public.is_editor_or_admin()
);

drop policy if exists "Users can delete own ratings" on public.ratings;
drop policy if exists "ratings own delete" on public.ratings;
create policy "ratings own delete"
on public.ratings
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

alter table public.ratings
  drop constraint if exists ratings_notes_required;

alter table public.ratings
  add constraint ratings_notes_required
  check (
    notes is not null
    and btrim(notes) <> ''
  ) not valid;
