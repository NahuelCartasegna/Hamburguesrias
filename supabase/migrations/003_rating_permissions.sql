-- =========================================================
-- Permisos para editar/eliminar evaluaciones
-- =========================================================

-- Los usuarios pueden actualizar sus propias evaluaciones.
-- Los editores y admins también pueden actualizar evaluaciones.
drop policy if exists "Users can update own ratings" on public.ratings;

create policy "Users can update own ratings"
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


-- Los usuarios pueden eliminar sus propias evaluaciones
-- y los admins pueden eliminar cualquier evaluación.
drop policy if exists "Users can delete own ratings" on public.ratings;

create policy "Users can delete own ratings"
on public.ratings
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);


-- =========================================================
-- Comentario obligatorio
-- =========================================================
--
-- NOT VALID permite aplicar la restricción a partir de ahora
-- sin romper registros antiguos que eventualmente tengan
-- comentarios vacíos/null.
--
-- Para nuevas evaluaciones y modificaciones:
-- el comentario debe existir y tener al menos un carácter
-- distinto de espacio.

alter table public.ratings
drop constraint if exists ratings_notes_required;

alter table public.ratings
add constraint ratings_notes_required
check (
  notes is not null
  and btrim(notes) <> ''
) not valid;