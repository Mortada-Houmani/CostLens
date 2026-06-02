# CostLens API

NestJS backend for the CostLens API.

## Local Development

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and set `DATABASE_URL` to your Neon PostgreSQL connection string.

The database runs on Neon from the start. Do not run PostgreSQL locally for this project.

Local Docker can start Redis for development:

```bash
docker compose up -d redis
```

Run the API in development mode:

```bash
npm run start:dev
```

The API uses `/api` as its global route prefix.

## Docker

From the project root, run the full stack:

```bash
docker compose up --build
```

The Docker setup includes Redis, backend, and frontend. PostgreSQL is not included because CostLens uses Neon.

## Scripts

```bash
npm run build
npm run start
npm run start:dev
npm run lint
npm run test
```
