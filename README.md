# CircuiTry3D

3D, interactive, electric circuit builder. This repo now includes a React + Vite frontend and a Spring Boot backend.

## Development

- Frontend
  - cd frontend
  - npm install
  - npm run dev
  - Opens at http://localhost:5173
  - Legacy prototype is available at http://localhost:5173/prototype.html

- Backend
  - cd backend
  - ./mvnw spring-boot:run (or mvn spring-boot:run)
  - Serves API at http://localhost:8080

Vite dev server proxies /api/* to the backend.

## API

GET /api/ohms?voltage=5&resistance=100
- Returns JSON with voltage/current/resistance/power

## Deploy

- Frontend: deploy `frontend` to Netlify/Vercel. Build command: `npm run build`, Publish directory: `dist`.
- Backend: deploy `backend` to Render/Railway. Port: 8080.

