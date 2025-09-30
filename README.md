## AI Outliner

AI Outliner is a full‑stack app that lets users upload an image, process it into high‑contrast outlines (PNG/JPEG), and download the result. It uses a React + Vite client with Supabase Auth/Storage and a Node/Express image processing server powered by Sharp and Potrace.

### Monorepo layout
- `client/`: React app (Vite, Tailwind). Handles auth, upload to Supabase Storage, and calls the server API.
- `server/`: Express service that fetches the image from Supabase public URL, processes it, and returns PNG/JPEG.

---

## Prerequisites
- Node.js 18+ (recommended: 20+)
- A Supabase project (for Auth + Storage)

---

## Environment variables

Create `.env` files in the respective folders.

### client/.env
```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_API_URL=http://localhost:8000
```

### server/.env
```bash
PORT=8000
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

Notes:
- The client uses `VITE_*` variables (exposed to the browser).
- The server requires the Supabase Service Role key to list buckets/perform server‑side checks; keep it secret.

---

## Supabase setup
1. In your Supabase project, enable Email/Password auth (or your preferred provider).
2. Create a public Storage bucket named `uploads`.
3. Ensure the bucket is public (the app generates public URLs which the server fetches).

---

## Install and run

Run installs at the repo root once (workspaces are not configured; install per package):

```bash
# Client
cd client
npm install

# Server (separate terminal)
cd ../server
npm install
```

### Development
In two terminals:

```bash
# Terminal 1: server
cd server
npm run dev

# Terminal 2: client
cd client
npm run dev
```

Client will start on `http://localhost:5173` (Vite). Server listens on `http://localhost:8000` (configurable via `PORT`).

### Production builds
```bash
# Client build
cd client
npm run build

# Server build
cd ../server
npm run build
npm start
```

---

## CORS and origins
The server whitelists these origins by default:
- `http://localhost:5173`
- `http://localhost:5174`
- `https://ai-outliner.vercel.app`
- `https://aioutliner1.vercel.app`

If you host the client elsewhere, add the origin in `server/src/index.mts` under `allowedOrigins`.

---

## API

### Health checks
- `GET /` – basic health/status
- `GET /health` – tests Supabase connectivity and reports readiness

### Process image
- `POST /process-image`
  - Body: JSON
  - Request:
    ```json
    {
      "image_path": "https://<public-url-to-image>",
      "format": "png" | "jpeg"
    }
    ```
  - Response: image bytes with appropriate `Content-Type`.

Example using curl:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image_path": "https://YOUR-SUPABASE-PUBLIC-URL/example.png",
    "format": "png"
  }' \
  http://localhost:8000/process-image --output processed.png
```

---

## Client usage
1. Sign up/sign in (Supabase Auth).
2. Upload a PNG/JPG (max 5MB). The file is stored at `uploads/<userId>/<timestamp>-<filename>`.
3. Click “Process Image”. The client requests the server with the public URL.
4. Preview and download the processed image as PNG/JPEG.

---

## Troubleshooting
- Missing Supabase vars (client): ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist; the app throws on startup if not set.
- Server 400/408/500: check server logs; timeouts or fetch errors usually indicate the image URL is not public or network‑blocked.
- CORS blocked: add your frontend origin to `allowedOrigins` in `server/src/index.mts` and restart the server.
- Large/slow images: try smaller images; server enforces timeouts and resizes before vectorization.

---

## Tech stack
- Client: React 19, Vite, Tailwind, Supabase JS, react‑hot‑toast
- Server: Node/Express, Sharp, Potrace, Supabase JS

---

## License
MIT


