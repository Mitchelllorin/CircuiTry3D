# CircuiTry3D

3D, interactive electric circuit builder (React + Three.js) with a Spring Boot backend for Ohm’s Law calculations.

## Monorepo Layout

- `frontend/`: React + Vite + Three.js app
  - `npm run dev`: start dev server on 5173 (proxy `/api` to backend if `VITE_API_PROXY` is set)
  - `npm run build`: production build to `frontend/dist`
  - `public/legacy.html`: original standalone UI preserved
- `backend/`: Spring Boot API
  - `mvn spring-boot:run`: start API on 8080

## API

- `POST /api/ohms-law`
  - Request JSON: any two of `voltage`, `current`, `resistance`
  - Response JSON: all three values filled using Ohm’s Law

## Dev Setup

- Frontend: set `frontend/.env` from `.env.example` if needed. For local proxy:
  - `VITE_API_PROXY=http://localhost:8080`
- Backend: no DB required.

### Commands

- Frontend
  - `cd frontend && npm install && npm run dev`
- Backend
  - `cd backend && ./mvnw spring-boot:run` (or `mvn spring-boot:run` if Maven installed)

## Deployment

- Frontend (Vercel/Netlify)
  - Build command: `npm ci && npm run build`
  - Publish directory: `frontend/dist`
  - Env: `VITE_API_BASE_URL` set to your backend URL (e.g. `https://your-api.onrender.com/api`)
- Backend (Render/Railway/Fly.io)
  - Java 17, build with `mvn -DskipTests package`, run with `java -jar target/*.jar`
  - Ensure CORS is enabled (provided) and health endpoint exposed

## Notes

- If you previously had `index.html` renamed, this scaffold uses `frontend/index.html` with entry `src/main.tsx`.
- Legacy single-file HTML is now at `frontend/public/legacy.html`.
