# CircuiTry3D Frontend

## Scripts

- `npm run dev` — start Vite dev server on 5173 (proxy `/api` when `VITE_API_PROXY` set)
- `npm run build` — production build to `dist`
- `npm run preview` — preview the production build

## Env

- `VITE_API_PROXY` — local dev proxy to backend (e.g., `http://localhost:8080`)
- `VITE_API_BASE_URL` — base URL the app will call (e.g., `/api` in prod, full URL otherwise)

## Notes

- Legacy single-file UI is at `public/legacy.html`.
