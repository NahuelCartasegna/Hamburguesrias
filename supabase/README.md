# Supabase

Ejecutá las migraciones en este orden dentro del proyecto Supabase:

1. `001_initial_schema.sql`
2. `003_rating_permissions.sql`
3. `004_restaurant_approval.sql`

La aplicación no incluye datos iniciales: las hamburgueserías se cargan desde la propia app.

## Roles

Los roles posibles son `user`, `editor` y `admin`.

Para convertir un usuario en admin:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DEL_USUARIO';
```

Para convertirlo en editor:

```sql
update public.profiles
set role = 'editor'
where id = 'UUID_DEL_USUARIO';
```

## Aprobación

- `user`: puede evaluar hamburgueserías.
- `editor`: puede solicitar creación o cambios de hamburgueserías.
- `admin`: puede aprobar/rechazar solicitudes y crear/editar/eliminar directamente.

Los editores no tienen `INSERT`/`UPDATE` directo sobre `restaurants`; sus cambios pasan por `restaurant_requests`.
