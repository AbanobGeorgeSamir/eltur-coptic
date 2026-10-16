# Eltor Coptic web client

Responsive React/Vite client for the shared church API. Production builds use the same-origin `/api` route, which Vercel forwards to the backend. MongoDB credentials belong only in the backend environment.

Use Node.js 20.19 or newer, as required by Vite.

## Local development

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Set `VITE_API_URL=http://localhost:8000/api` in `.env` for local development. Keep the production API URL unset so the app uses its same-origin `/api` proxy and secure browser session cookies.

The production build prerenders the public home, privacy, login, and signup routes with route-specific titles, descriptions, canonical URLs, and social metadata. The sitemap includes only indexable public pages; set `VITE_SITE_URL` to the production website origin when using a custom domain. Protected account routes are marked `noindex` and excluded in `robots.txt`.

Long public-content lists load in pages of 18 items, reducing initial response and render work. Versioned files under `/assets` are configured for long-lived immutable caching.

## Vercel routing

`vercel.json` sends unmatched paths to `index.html`, which lets React Router handle direct links and page refreshes. For a Vercel project rooted at `frontend`, use build command `npm run build` and output directory `dist`. If the Vercel project is rooted at the repository instead, the repository-root `vercel.json` runs the frontend build and sets the output directory to `frontend/dist`. Redeploy after changing the Root Directory; Vercel applies project-root and build settings on the next deployment.

## Checks

```powershell
npm test
npm run lint
npm run build
```
