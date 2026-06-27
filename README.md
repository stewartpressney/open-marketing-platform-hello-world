# Hello World — React + Vite + Express + Oat

Minimal full-stack hello world.

- **Client:** React 18 + Vite, styled with [Oat](https://oat.ink) (`@knadh/oat`) — semantic HTML, no classes
- **Server:** Express, one endpoint: `GET /api/hello`

## Run

```bash
npm install
npm run dev
```

- Client: http://localhost:5173 (proxies `/api` to Express)
- API: http://localhost:3001/api/hello

## Production

```bash
npm run build
npm start   # Express serves dist/ on :3001
```
