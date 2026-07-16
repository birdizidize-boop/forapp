# Render Deploy

This is the recommended fallback deployment path while AWS credentials are blocked.

## What Render Will Create

The repository contains `render.yaml`, a Render Blueprint that creates:

- `fora-cmp-api`: Flask/Gunicorn backend web service
- `fora-cmp-panel`: React static frontend
- `fora-cmp-db`: Render PostgreSQL database

## Deploy Steps

1. Open Render:

```txt
https://dashboard.render.com/blueprints
```

2. Choose **New Blueprint Instance**.
3. Connect GitHub repository:

```txt
birdizidize-boop/forapp
```

4. Select branch:

```txt
main
```

5. Render should detect:

```txt
render.yaml
```

6. Confirm the resources and deploy.

## Expected URLs

Render will assign URLs similar to:

```txt
https://fora-cmp-panel.onrender.com
https://fora-cmp-api.onrender.com/api/health
```

The frontend build command receives the backend hostname through:

```txt
RENDER_BACKEND_HOSTNAME
```

and builds:

```txt
VITE_API_URL=https://$RENDER_BACKEND_HOSTNAME/api
```

## Important

The Blueprint uses Render free plans for the first deployment test:

```txt
plan: free
```

For production use, move at least the database to:

```txt
basic-256mb
```

and the backend web service to a paid plan if uptime matters.

## Telegram Webhook

After the backend URL is live, each bot webhook should point to:

```txt
https://fora-cmp-api.onrender.com/api/telegram/webhook/<bot_id>
```

Use the real backend URL Render gives you.

## Current AWS Blocker

AWS deployment is blocked by invalid AWS credentials:

```txt
InvalidClientTokenId
```

Render avoids this by deploying from GitHub OAuth instead of local AWS CLI credentials.
