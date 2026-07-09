# Royal Billing Panel

Full WHMCS-style billing system with Razorpay + Cashfree payments, wallet, admin panel, and more.

## Structure

```
billing/
├── client/          # React + Vite frontend (Vercel)
├── server/          # Express + SQLite backend (Render / Railway / VPS)
├── package.json     # Root scripts
├── render.yaml      # Render deployment config
└── .gitignore
```

## Deployment

### Frontend → Vercel

1. Push repo to GitHub
2. Import `client/` as a new Vercel project
3. Add env var: `VITE_API_URL` = your backend URL (e.g. `https://royal-billing-api.onrender.com`)
4. Deploy

### Backend → Render

1. Push repo to GitHub
2. Create new Web Service on Render, connect repo
3. Render auto-detects `render.yaml` OR manually set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. Add a persistent disk (Render → your service → Disks) mounted at `/data`
5. Deploy

### Backend → Railway

1. Push repo to GitHub
2. Create new project on Railway, connect repo
3. Set root directory to `server`
4. Add env var: `PORT` = `3002`
5. Deploy

### Local Development

```bash
npm install        # Installs root + client + server deps
npm run dev        # Runs both client (8008) + server (3002)
```

## Environment Variables

### Client (`VITE_API_URL`)
- Default: `/api` (uses Vite proxy in dev)
- Production: `https://your-backend-url.com`

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `DB_PATH` | `./billing.db` | SQLite database path |
| `UPLOADS_DIR` | `./uploads` | File uploads directory |

## Admin Login

- Email: `admin@royaldev.com`
- Password: `admin123`
