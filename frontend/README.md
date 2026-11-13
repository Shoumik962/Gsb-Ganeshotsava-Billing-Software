# Ganeshotsav React Frontend

Independent React + Vite + Tailwind frontend. The UI, hooks, assets, and components are contained here. No backend Python or database credentials are placed in this directory.

Copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:8000`, then `npm ci`, `npm run dev`. For production behind a same-origin reverse proxy, omit `VITE_API_URL` or set it to the API origin at build time. Never put Razorpay secret/JWT secret in the Vite environment; only the backend may hold these secrets.

New tabs include **Staff Operations**, for auth-protected Devotee/Family IDs, master addresses, duplicate review and GPS house-visit planning. The public Seva/Donation pages now use the live backend catalogue and Razorpay verified order API. The visual map is a radius coordinate plot; actual road navigation opens Google Maps.

The original app assets, theme, temple metadata and content live under `src`. Some original temple metadata and the embedded About page map are placeholders requiring Trust approval before launch.

For GitHub setup and CI, see `../docs/GITHUB_SETUP.md` in the full-stack ZIP.
