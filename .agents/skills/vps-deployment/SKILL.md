```skill
---
name: vps-deployment
description: VPS deployment instructions for the RMV System. This project uses DigitalOcean VPS with Docker and Nginx — NOT Vercel. Use this skill when deploying, troubleshooting production, or verifying deployments.
metadata:
  author: rmv-team
  version: "1.0.0"
---

# VPS Deployment — RMV System

## CRITICAL: This project does NOT use Vercel

The RMV System is deployed on a **DigitalOcean VPS** using Docker containers and Nginx. Never suggest or use Vercel, Netlify, or any serverless platform features.

## Production Infrastructure

| Item             | Value                          |
| ---------------- | ------------------------------ |
| VPS Provider     | DigitalOcean                   |
| VPS IP           | `188.166.177.69`               |
| Domain           | `rmvfabrication.app`           |
| OS               | Ubuntu + Docker                |
| SSL              | Let's Encrypt (auto-renewed)   |
| Reverse Proxy    | Nginx                          |
| Database         | MongoDB Atlas (external)       |
| CI/CD            | GitHub Actions                 |

## Architecture

```
Internet → Nginx (SSL :443) ─┬─ /api/*       → rmv-api:5000 (Express/Node)
                              ├─ /socket.io/* → rmv-api:5000 (WebSocket)
                              └─ /*           → rmv-web:80 (Vite build → Nginx)
```

### Containers

| Container    | Image             | Port | Purpose                     |
| ------------ | ----------------- | ---- | --------------------------- |
| `rmv-api`    | Custom (Node 22)  | 5000 | Express API server          |
| `rmv-web`    | Custom (Nginx)    | 80   | React SPA (Vite build)      |
| `rmv-nginx`  | nginx:1.27-alpine | 443  | Reverse proxy + SSL         |
| `rmv-certbot`| certbot/certbot   | —    | Auto-renews SSL certificates|

## How to Deploy

### Automatic (Preferred)

Just push to `main`. GitHub Actions handles everything:

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

The pipeline will:
1. Run CI (type-check + build)
2. SSH into VPS
3. Pull latest code
4. Rebuild Docker containers
5. Run health checks
6. Run smoke tests
7. Prune old images

### Using MCP GitHub

For larger features, use the MCP GitHub workflow:

```
1. mcp_github_create_branch → feature/your-feature
2. Make changes locally
3. mcp_github_push_files → push to feature branch
4. mcp_github_create_pull_request → open PR to main
5. Review and verify
6. mcp_github_merge_pull_request → merge to main (triggers deploy)
```

## Post-Deployment Verification

After pushing to main, wait ~2-3 minutes for GitHub Actions to complete, then use Playwright:

```
browser_navigate → https://rmvfabrication.app
browser_snapshot → Verify the app loads
browser_console_messages → Check for errors
browser_take_screenshot → Visual confirmation
```

## Build Process (Frontend)

The rmv-web Dockerfile:
1. `npm ci` — Install dependencies
2. `vite build` — Build production bundle
3. Copy `dist/` to Nginx container
4. Serve with Nginx on port 80

Output goes to `rmv-web/dist/` which contains:
- `index.html` — SPA entry point
- `assets/` — JS/CSS chunks (hashed filenames)

## What NOT to Do

- Do NOT use `vercel deploy` or any Vercel CLI commands
- Do NOT create `vercel.json` or `.vercel/` files
- Do NOT use Vercel Edge Functions or Serverless Functions
- Do NOT use `next/` or Next.js patterns (this is plain Vite + React)
- Do NOT run `npm run build` on the VPS directly — Docker handles it
- Do NOT modify `rmv-server/` unless explicitly told to work on backend

## Troubleshooting Production

If something breaks in production:

1. **Check GitHub Actions** — Did the deploy succeed?
   ```
   mcp_github_list_commits → see latest commits
   ```

2. **Verify with Playwright** — Navigate to production URL
   ```
   browser_navigate → https://rmvfabrication.app
   browser_console_messages → check for errors
   ```

3. **Check container health** (if you have VPS access):
   ```bash
   docker ps                          # All containers running?
   docker logs rmv-web --tail 50      # Nginx logs
   docker logs rmv-api --tail 50      # API logs
   ```

4. **Rollback** — Revert the commit and push:
   ```bash
   git revert HEAD
   git push origin main
   ```

## GitHub Repositories

| Repo     | URL                                          |
| -------- | -------------------------------------------- |
| Frontend | `https://github.com/potatsukki/rmv-web`      |
| Backend  | `https://github.com/potatsukki/rmv-server`   |

Only modify `rmv-web` unless explicitly told to work on backend.
```
