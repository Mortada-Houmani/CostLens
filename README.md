# CostLens

Cloud cost intelligence dashboard with a NestJS API, React frontend, Redis-backed scan queue, and Neon PostgreSQL.

## Screenshots

Add portfolio screenshots here after running the app locally or deploying it:

- Dashboard overview: `docs/screenshots/dashboard.png`
- Findings table: `docs/screenshots/findings.png`
- Scan details: `docs/screenshots/scan-details.png`
- AWS accounts: `docs/screenshots/aws-accounts.png`

## Docker

The database runs on Neon. Docker runs only Redis, the backend, and the frontend.

Create a root `.env` file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require&channel_binding=require
ENCRYPTION_KEY=replace-with-a-long-random-secret
VITE_API_URL=http://localhost:3000/api
VITE_DEMO_MODE=false
```

Start the stack:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Redis: localhost:6379

Stop the stack:

```bash
docker compose down
```

PostgreSQL is intentionally not included because CostLens uses Neon from the start.

## Security Notes

CostLens encrypts stored AWS secret access keys using `ENCRYPTION_KEY` and never returns `secretAccessKey` from API responses. For production, prefer AWS IAM Role ARN and STS AssumeRole instead of storing access keys.

## Limitations

- Authentication and per-user authorization are not implemented yet.
- AWS scanning currently covers a focused set of EC2, EBS, S3, and RDS checks.
- Fix commands are suggestions only and are never executed automatically.
- Demo mode uses mocked frontend data and does not represent a real AWS account.
- Terraform is structured for AWS deployment, but production hardening such as custom domains, TLS certificates, and secrets managers should be added before real customer use.

## Future Improvements

- Replace stored AWS access keys with IAM Role ARN onboarding and STS AssumeRole.
- Add authentication, organization scoping, and audit logging.
- Store sensitive runtime values in AWS Secrets Manager or SSM Parameter Store.
- Add more scanner rules, cost estimation models, and resource trend history.
- Add automated tests around scanner rules, queue processing, and API response contracts.

## Local Development

Start Redis:

```bash
docker compose up -d redis
```

Run the backend:

```bash
cd backend
npm install
npm run start:dev
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Demo Mode

The frontend can run with mocked data without requiring real AWS credentials or backend API calls on the dashboard, findings, scans, and AWS accounts pages.

Create or update `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_DEMO_MODE=true
```

Then start the frontend:

```bash
cd frontend
npm run dev
```

Set `VITE_DEMO_MODE=false` to use the real API integration again.

For the deployed CloudFront frontend, set the GitHub Secret `VITE_API_URL` to:

```text
/api
```

CloudFront forwards `/api/*` to the backend ALB, which avoids browser mixed-content blocking.

## Backend CI/CD

The backend deployment workflow lives at `.github/workflows/deploy-backend.yml`.

It runs on every push to `main` when files under `backend/` change, or when the deployment workflow file itself changes. It does not run for frontend-only changes.

Deployment flow:

1. Checkout the repository.
2. Configure AWS credentials from GitHub Secrets.
3. Log in to Amazon ECR.
4. Build the backend Docker image from `backend/Dockerfile`.
5. Tag the image as `latest` and as the Git commit SHA.
6. Push both image tags to ECR.
7. Download the current ECS task definition.
8. Render a new task definition using the new image URI.
9. Deploy the task definition to the ECS service.
10. Wait until the ECS service is stable.

Required GitHub Secrets:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
ECR_BACKEND_REPOSITORY
ECS_CLUSTER
ECS_SERVICE
ECS_TASK_DEFINITION
```

The ECS task definition must include a container named `costlens-backend`. The backend container listens on port `3000`.

Every qualifying push to `main` builds a new backend Docker image, pushes it to ECR, and deploys it to ECS. The workflow does not delete old ECR images.
