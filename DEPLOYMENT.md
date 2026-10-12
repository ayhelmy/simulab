# Deploying the frontend to Vercel

The backend runs on Railway (see the backend repo's `DEPLOYMENT.md`). Deploy it
first. You need its public domain, e.g. `https://simlearn-backend.up.railway.app`.

## 1. Import the project

Vercel → **Add New → Project** → import `ayhelmy/simulab`. Framework preset
**Next.js** is auto-detected; keep the default build/install commands.

## 2. Environment variables (Project → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/api/v1` |
| `BACKEND_URL` | `https://simlearn-backend.up.railway.app` |
| `NEXT_PUBLIC_UPLOAD_API_URL` | `https://simlearn-backend.up.railway.app/api/v1` |

- `BACKEND_URL` makes `next.config.ts` rewrite `/api/v1/*` to Railway. This keeps the
  HttpOnly refresh cookie first-party on the Vercel domain, so login persists and
  `proxy.ts` can see the session (`*.vercel.app` and `*.up.railway.app` are different
  sites, so calling Railway directly would drop the cookie).
- `NEXT_PUBLIC_UPLOAD_API_URL` sends large multipart uploads (WebGL builds, lesson files)
  straight to Railway, bypassing the proxy's request-size limit.
- These values are read at build time, so **redeploy after changing them**.

## 3. Link back to the backend

In Railway set `CORS_ORIGIN` to the Vercel production URL (e.g.
`https://simulab.vercel.app`) and redeploy the backend. To also allow preview
deployments, add their URLs comma-separated.
