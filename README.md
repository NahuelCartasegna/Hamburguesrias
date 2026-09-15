# Hamburguesitas

Ranking de hamburgueserías con React + Vite + Supabase.

## Funcionalidades

- Ranking ponderado:
  - Hamburguesa 35%
  - Papas 25%
  - Calidad/Precio 20%
  - Tiempo 10%
  - Local 5%
  - Packaging 5%
- Evaluaciones por usuario.
- Comentario obligatorio en evaluaciones nuevas/editadas.
- Edición y eliminación de evaluaciones propias.
- Administrador puede eliminar evaluaciones.
- Fecha de creación/actualización de cada evaluación.
- Modo claro/oscuro.
- Vista de tarjetas o lista.
- Imagen, web, Instagram y dirección por hamburguesería.
- Roles `user`, `editor`, `admin`.
- Los editores solicitan creación o cambios.
- Los administradores aprueban o rechazan solicitudes.
- Favicon de hamburguesa.

## Variables de entorno

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

No agregues `/rest/v1/` a `VITE_SUPABASE_URL`.

## Supabase

Ejecutar:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/003_rating_permissions.sql
supabase/migrations/004_restaurant_approval.sql
```

No se cargan datos iniciales.

## Vercel

- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Perfil y privacidad de evaluaciones

- Ejecutá `supabase/migrations/005_profiles.sql` después de las migraciones anteriores.
- Los usuarios tienen un `username` obligatorio y único.
- Desde **Mi perfil** pueden cambiar su username y elegir identidad pública o privada.
- Si el perfil es privado, las evaluaciones muestran `Usuario` y el username privado no se expone en `public_profiles`.
- Las evaluaciones ahora muestran el puntaje general en grande y permiten desplegar el detalle con los puntajes por categoría, comentario y fecha.
