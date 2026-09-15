# Supabase

## Primera instalación

1. Crear un proyecto en Supabase.
2. Abrir **SQL Editor**.
3. Ejecutar `migrations/001_initial_schema.sql`.
4. No ejecutar ningún seed: la base queda vacía.
5. Crear el primer usuario desde la app.
6. Convertir ese usuario en `admin` desde SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DEL_USUARIO';
```

Podés obtener el UUID desde **Authentication -> Users**.

## Roles

- `user`: puede ver y cargar/editar sus propias evaluaciones.
- `editor`: además puede crear y editar hamburgueserías y subir imágenes.
- `admin`: además puede borrar restaurantes/evaluaciones y administrar roles mediante SQL.

## Importante

El rol se cambia desde Supabase, no desde el frontend. Así un usuario no puede elevarse a admin manipulando la aplicación.
