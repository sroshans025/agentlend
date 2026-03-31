# AgentLend Deployment (Vercel + Render)

## Architecture

- Frontend: Vercel (root directory: `frontend`)
- Backend API: Render Web Service (root directory: `backend`)
- Database: Render Postgres (defined in `render.yaml`)

## 1) Deploy Backend to Render

### Option A: Blueprint deploy (recommended)

1. Push repository to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select this repository.
4. Render reads `render.yaml` and creates:
   - `agentlend-backend` web service
   - `agentlend-db` Postgres database
5. In Render service settings, fill all env vars marked `sync: false`.
6. Set `BACKEND_CORS_ORIGINS` to your Vercel domain, for example:
   - `https://your-project.vercel.app`
7. Deploy and confirm health endpoint:
   - `https://<render-service-url>/health`

### Option B: Manual Render service setup

- Environment: `Python`
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Then add environment variables from `backend/.env.example`.

## 2) Deploy Frontend to Vercel

1. In Vercel, click **Add New...** -> **Project**.
2. Import this repository.
3. Set **Root Directory** to `frontend`.
4. Add environment variable:
   - `VITE_API_BASE_URL=https://<render-service-url>`
5. Deploy.

## 3) Post-deploy wiring checklist

- Render backend responds at `/health`.
- Vercel frontend can call backend (loan requests, logs, admin endpoints).
- `BACKEND_CORS_ORIGINS` exactly matches Vercel origin (no trailing slash).

## Notes

- Backend now supports Render-style `postgres://...` URLs automatically.
- CORS is now environment-driven via `BACKEND_CORS_ORIGINS`.
- For custom domain on Vercel, update `BACKEND_CORS_ORIGINS` in Render accordingly.
