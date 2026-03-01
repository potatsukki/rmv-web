```skill
---
name: mcp-workflow
description: Defines the AI development workflow using MCP GitHub and Playwright tools for the RMV System. Use this skill for every coding task to ensure changes are coded, tested visually in the browser, and deployed correctly via VPS (NOT Vercel).
metadata:
  author: rmv-team
  version: "1.0.0"
---

# MCP Development Workflow — RMV System

This skill defines the mandatory workflow for every code change in the RMV frontend (rmv-web). The AI must follow these steps for every task.

## Project Context

| Item           | Value                                      |
| -------------- | ------------------------------------------ |
| Frontend Repo  | `https://github.com/potatsukki/rmv-web`    |
| Backend Repo   | `https://github.com/potatsukki/rmv-server` |
| Domain         | `rmvfabrication.app`                       |
| VPS IP         | `188.166.177.69`                           |
| VPS Provider   | DigitalOcean (Ubuntu + Docker)             |
| Hosting        | **VPS with Docker + Nginx** (NOT Vercel)   |
| Frontend Stack | React + Vite + Tailwind CSS + shadcn/ui    |
| Dev Server     | `npm run dev` (Vite on localhost:5173)      |
| Production     | Docker container served by Nginx            |

## CRITICAL: No Vercel

This project does **NOT** use Vercel for deployment. The frontend is:
- Built with `vite build`
- Containerized with Docker (multi-stage: build → Nginx)
- Deployed on a DigitalOcean VPS at `188.166.177.69`
- Served via Nginx reverse proxy with SSL (Let's Encrypt)
- CI/CD is handled by GitHub Actions, not Vercel

Do NOT suggest or use any Vercel-specific features (Edge Functions, Vercel CLI, vercel.json, etc.).

## Mandatory Workflow for Every Task

### Step 1: Understand & Plan
- Read the user's request carefully
- Search the codebase for relevant files
- Plan the changes before writing code

### Step 2: Implement the Code
- Make the code changes following project conventions
- Use shadcn/ui components, Tailwind CSS, and React best practices
- Ensure TypeScript types are correct

### Step 3: Verify with Playwright (Browser Testing)
After making changes, **always** use Playwright MCP to visually verify:

1. **Navigate** to the relevant page in the running dev server (`http://localhost:5173`)
2. **Take a snapshot** to verify the UI renders correctly
3. **Interact** with the changed elements (click buttons, fill forms, etc.)
4. **Take a screenshot** if there are visual issues to debug
5. **Check the browser console** for JavaScript errors

This replaces the need for the user to manually screenshot errors. The AI should proactively catch and fix issues by seeing the browser directly.

#### Playwright Usage Patterns

```
# Always start by navigating to the page
browser_navigate → http://localhost:5173/[route]

# Take an accessibility snapshot to see the page structure
browser_snapshot → verify elements exist and are correct

# Take a screenshot for visual verification
browser_take_screenshot → see exactly what the user sees

# Check for console errors
browser_console_messages → catch JavaScript runtime errors

# Interact with elements
browser_click → test buttons, links, navigation
browser_fill_form → test form inputs
browser_select_option → test dropdowns
```

### Step 4: Fix Any Issues
- If Playwright reveals errors or visual problems, fix them immediately
- Re-verify with Playwright after each fix
- Repeat until the page works correctly

### Step 5: Deployment (When Ready)
Deployment happens via `git push` to `main`:

```bash
# The CI/CD pipeline handles everything:
git add .
git commit -m "feat: description of changes"
git push origin main
# GitHub Actions → SSH into VPS → docker compose rebuild → health checks
```

To verify production after deployment:
```
# Navigate to production URL
browser_navigate → https://rmvfabrication.app/[route]

# Verify it works in production
browser_snapshot → confirm deployment success
```

## MCP GitHub Usage

Use MCP GitHub tools for repository operations:

### Branch Management
- **Create feature branches** for larger changes before merging to main
- **List branches** to check existing work

### Pull Requests
- **Create PRs** for code review when working on significant features
- **List PRs** to check open work
- **Merge PRs** when approved

### Issues
- **Create issues** to track bugs found during Playwright testing
- **Search issues** to check for known problems
- **Comment on issues** with Playwright screenshots as evidence

### Code Search
- **Search code** across the repository for patterns and references

## When NOT to Touch Backend

If the user says "don't touch the backend" or "rmv-web only":
- Do NOT modify anything in `rmv-server/`
- Do NOT create PRs against the backend repo
- Only work within the `rmv-web/` directory
- API changes should be noted as requirements for the backend team

## Error Handling Workflow

When the user reports an error:
1. Use Playwright to **navigate to the page** and reproduce the error
2. Check **browser console** for error messages
3. Take a **snapshot/screenshot** to understand the current state
4. Fix the code
5. **Re-verify with Playwright** to confirm the fix works
6. Report back with confirmation

This eliminates the need for the user to screenshot errors manually.
```
