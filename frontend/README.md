# CostLens Frontend

React + Vite frontend for CostLens.

## Local Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set:

```env
VITE_API_URL=http://localhost:3000/api
```

## Docker

The frontend is built with Vite and served by nginx.

From the project root:

```bash
docker compose up --build frontend
```
