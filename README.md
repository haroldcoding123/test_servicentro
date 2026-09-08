# ServiLocal

Proyecto reorganizado en backend y frontend para separar la API en Node.js/Express de la aplicación en Vue + Vite.

## Estructura

```text
servicentro/
├── backend/
│   ├── admin.json
│   ├── users.json
│   ├── uploads/
│   ├── node_modules/
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── index.html
├── README.md
├── index.html
├── Perfil de tecnico.html
├── perfil_cliente.html
└── .git/
```

## Backend

La API se ejecuta desde la carpeta `backend/`.

```bash
cd backend
npm install
npm run dev
```

El servidor corre por defecto en:

- http://localhost:3000

Incluye endpoints para login, registro, perfil, fotos, favoritos, técnicos públicos y panel admin.

## Frontend

La interfaz se ejecuta desde la carpeta `frontend/` con Vue + Vite + Tailwind.

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible por defecto en:

- http://localhost:5173

## Estado de migración

Los HTML base del proyecto se revisaron y se migraron a componentes Vue dentro de la carpeta `frontend/src/components/` para mantener la lógica visual y la estructura del proyecto en una app más mantenible.

## Notas

- El backend usa archivos locales dentro de `backend/` para evitar rutas absolutas del equipo original.
- Las fotos subidas y los datos de usuarios se almacenan en `backend/uploads/` y `backend/users.json` / `backend/admin.json`.
- La raíz del proyecto ya no contiene la lógica del servidor; se dejó únicamente la documentación y los archivos estáticos antiguos como referencia temporal.

