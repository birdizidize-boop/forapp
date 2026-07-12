# AWS Deploy Guide

Recommended first production path:

- Frontend: AWS Amplify Hosting
- Backend: Elastic Beanstalk for Flask
- Database: Amazon RDS for PostgreSQL
- Redis: Amazon ElastiCache
- Domain/HTTPS: Route 53 + ACM

## 1. Frontend on Amplify

Connect the Git repository in AWS Amplify Hosting.

If the GitHub repository root contains this generated workspace structure, set the Amplify app root to:

```txt
outputs/fora-cmp
```

If the GitHub repository root is already the app folder itself, leave app root empty or use `/`.

Use these settings:

```txt
Build file: amplify.yml
Build command: pnpm build
Output directory: dist
Environment variable:
VITE_API_URL=https://api.foragramm.com/api
```

Amplify will publish the React panel and serve it over AWS CDN.

## 2. Backend on Elastic Beanstalk

Deploy the `backend/` folder as the Beanstalk application source.

Important files:

- `application.py`: Beanstalk WSGI entrypoint
- `Procfile`: Gunicorn production command
- `requirements.txt`: Python dependencies
- `.env.production.example`: required production env values

Environment variables to set in Elastic Beanstalk:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@RDS_HOST:5432/fora_cmp
REDIS_URL=redis://ELASTICACHE_HOST:6379/0
JWT_SECRET_KEY=replace-with-a-long-random-secret
FRONTEND_ORIGIN=https://panel.foragramm.com
FLASK_ENV=production
```

After deployment, the health endpoint should respond:

```txt
https://api.foragramm.com/api/health
```

## 3. PostgreSQL on RDS

Create an RDS PostgreSQL instance in the same region/VPC as the backend.

Then run migrations from a trusted environment:

```bash
cd backend
flask --app application db upgrade
```

## 4. Redis on ElastiCache

Create an ElastiCache Redis/Valkey cluster in the same VPC.

Use the endpoint as:

```env
REDIS_URL=redis://ELASTICACHE_HOST:6379/0
```

## 5. Telegram webhook

Telegram requires a public HTTPS endpoint. After backend domain is live, set each bot webhook to:

```txt
https://api.foragramm.com/api/telegram/webhook/<bot_id>
```

The current endpoint accepts updates and documents the identity pipeline:

- extract Telegram user
- upsert `users` by `telegram_id`
- assign `fora_user_id` if new
- upsert `subscriptions` by `user_id + bot_id`
- write `telegram_action_events`

## 6. ECS Fargate option

For heavier production traffic, use `backend/Dockerfile` with ECS Fargate:

1. Build and push the backend image to ECR.
2. Create ECS task definition using the image.
3. Attach Application Load Balancer.
4. Set the same environment variables as Elastic Beanstalk.
5. Point `api.foragramm.com` to the load balancer.

Elastic Beanstalk is faster to start; ECS Fargate is cleaner for long-term container operations.
