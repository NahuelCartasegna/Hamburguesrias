# 🍔 Hamburguesitas v2

Aplicación React + Vite + Supabase para registrar y puntuar hamburgueserías.

## Modelo actual

La nota se calcula por evaluación con estos pesos:

- Hamburguesa: 35%
- Papas: 25%
- Calidad/Precio: 20%
- Tiempo: 10%
- Local: 5%
- Packaging: 5%

Si una categoría está sin puntuar, el peso disponible se normaliza entre las categorías que sí tienen nota.

## Características

- Base vacía: no incluye seed ni datos de las planillas anteriores.
- Login con Supabase Auth.
- Roles: `user`, `editor`, `admin`.
- Restaurantes editables por `editor`/`admin`.
- Imágenes con Supabase Storage.
- Web, Instagram, dirección, descripción y notas.
- Evaluaciones asociadas al usuario autenticado.
- RLS para separar lectura pública de escritura protegida.

## Estructura

```text
src/
├── components/
│   ├── AuthPanel.jsx
│   └── RestaurantForm.jsx
├── lib/
│   ├── scoring.js
│   └── supabase.js
├── App.jsx
├── main.jsx
└── styles.css

supabase/
├── migrations/
│   └── 001_initial_schema.sql
└── README.md
```

## 1. Crear la base

1. Crear un proyecto en Supabase.
2. SQL Editor -> ejecutar `supabase/migrations/001_initial_schema.sql`.
3. La base queda vacía a propósito.
4. Authentication -> crear tu primer usuario.
5. Copiar su UUID y hacerlo admin:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DEL_USUARIO';
```

## 2. Ejecutar localmente

Requiere Node.js 20+.

```bash
npm install
copy .env.example .env
```

En Linux/macOS:

```bash
cp .env.example .env
```

Completar `.env` con la URL raíz de Supabase y la publishable/anon key.

```bash
npm run dev
```

## 3. Flujo recomendado para cargar datos de nuevo

1. Entrar como admin.
2. Crear una hamburguesería.
3. Cargar imagen, links, dirección y notas.
4. Agregar la primera evaluación.
5. Crear usuarios adicionales desde Supabase Auth.
6. Darles `user` o `editor` según corresponda.

## 4. Roles

### user
- Ver restaurantes y evaluaciones.
- Crear sus propias evaluaciones.
- Editar sus propias evaluaciones.

### editor
- Todo lo anterior.
- Crear y editar restaurantes.
- Subir/reemplazar imágenes.

### admin
- Todo lo anterior.
- Eliminar restaurantes/evaluaciones.
- Administrar roles desde Supabase.

## 5. Vercel

Variables de producción:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

No usar nunca `service_role` ni una secret key con prefijo `VITE_`.
