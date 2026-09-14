# 🍔 Hamburguesitas

MVP de una app web basada en `Hamburguesitas.xlsx`.

## Qué incluye

- Ranking visual de hamburgueserías.
- Las 5 categorías del Excel: Hamburguesa 40%, Papas 30%, Tiempo 15%, Local 10%, Packaging 5%.
- Precio.
- Varias evaluaciones por hamburguesería.
- Notas/comentarios.
- Búsqueda.
- Datos iniciales importados del Excel (16 hamburgueserías y 25 evaluaciones).
- Supabase/PostgreSQL como base de datos.

> En el Excel los `0` se interpretaron como campos sin calificar y se importan como `NULL`, para que no bajen artificialmente el promedio.

## 1. Crear Supabase

1. Creá un proyecto en Supabase.
2. Abrí **SQL Editor**.
3. Ejecutá `supabase.sql`.
4. Ejecutá `seed.sql`.

## 2. Configurar la app

Instalá Node.js 20+ y ejecutá:

```bash
npm install
```

Copiá `.env.example` a `.env` y completá:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Los valores están en Supabase en **Project Settings -> API**.

Luego:

```bash
npm run dev
```

Abrí la URL que indique Vite.

## 3. Publicarla gratis

La opción sencilla es Vercel:

```bash
npm run build
```

Subí el proyecto a GitHub y creá un proyecto nuevo en Vercel apuntando al repositorio. Agregá las mismas variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Importante sobre seguridad

Este MVP deja lectura/escritura pública para que puedas probarlo sin login. Si lo vas a publicar para otras personas, el siguiente paso debería ser agregar **Supabase Auth** y cambiar las policies de `supabase.sql` para que solo usuarios autenticados puedan modificar datos.

## Próximas mejoras que recomiendo

- Fotos de cada hamburguesería.
- Dirección + mapa.
- Link a Instagram.
- Precio por persona / menú.
- Historial de visitas.
- Comparador de dos hamburgueserías.
- Gráfico radar de las 5 categorías.
- Usuarios (Nahuel, Nati, etc.) con login.
- Configuración de pesos desde la propia app.
