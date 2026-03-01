```skill
---
name: playwright-browser-testing
description: Use Playwright MCP to visually verify all UI changes in the browser. This skill should be triggered on EVERY code change to ensure the AI sees the browser directly instead of requiring the user to screenshot errors.
metadata:
  author: rmv-team
  version: "1.0.0"
---

# Playwright Browser Testing — RMV Web

Every code change MUST be verified visually using Playwright MCP browser tools. The AI should see exactly what the user sees — no more manual screenshotting.

## Core Principle

> **The AI must see the browser.** After every code change, use Playwright to navigate, inspect, interact, and verify. If something breaks, fix it before telling the user it's done.

## Dev Server

The RMV frontend runs on Vite:

```bash
# Start dev server (if not already running)
cd rmv-web && npm run dev
# → http://localhost:5173
```

## Testing Checklist (Run After Every Change)

### 1. Navigate to the Page
```
browser_navigate → http://localhost:5173/[relevant-route]
```

### 2. Take Accessibility Snapshot
```
browser_snapshot → Read the page structure, verify elements exist
```
Use this to confirm:
- Components render without crashing
- Text content is correct
- Buttons/links are present
- Form fields exist

### 3. Take Visual Screenshot
```
browser_take_screenshot → See exactly what the user would see
```
Use this to verify:
- Layout looks correct
- Styling is applied properly
- No visual glitches
- Responsive design works

### 4. Check Console for Errors
```
browser_console_messages → Catch runtime errors, warnings, failed API calls
```
Look for:
- React errors (hydration, hooks, key warnings)
- Network failures (API calls to /api/v1/*)
- TypeScript runtime errors
- Uncaught exceptions

### 5. Interact with UI Elements
```
browser_click → Test buttons, navigation links, tabs
browser_fill_form → Test input fields, textareas
browser_select_option → Test dropdown selects
browser_hover → Test hover states, tooltips
```

### 6. Test Responsive Views
```
browser_resize → width=375, height=812   # Mobile (iPhone)
browser_take_screenshot → Verify mobile layout

browser_resize → width=768, height=1024  # Tablet
browser_take_screenshot → Verify tablet layout

browser_resize → width=1440, height=900  # Desktop
browser_take_screenshot → Verify desktop layout
```

## Common RMV Routes to Test

| Route | Page | What to Verify |
|-------|------|----------------|
| `/` | Dashboard | Stats, charts, quick actions |
| `/login` | Login | Form, validation, auth flow |
| `/projects` | Projects List | Cards, filters, pagination |
| `/projects/:id` | Project Detail | Tabs, status, timeline |
| `/blueprints` | Blueprints | Project selector, approval buttons |
| `/payments` | Payments | Payment list, status badges |
| `/appointments` | Appointments | Calendar, booking flow |
| `/users` | Users (Admin) | User table, role management |
| `/settings` | Settings | Config forms |

## Error Reproduction Workflow

When the user says "there's a bug" or "something is broken":

1. **Navigate** to the reported page
2. **Snapshot** to see current state
3. **Console messages** to find errors
4. **Screenshot** to see visual issues
5. **Reproduce** the bug by interacting (click, type, etc.)
6. **Fix** the code
7. **Re-navigate** and verify the fix
8. **Report** back to the user with confirmation

## Authentication Testing

Many RMV pages require login. If you see a login redirect:

1. Navigate to `/login`
2. Fill in test credentials if available
3. Submit the form
4. Then navigate to the target page

## API-Dependent Pages

The frontend connects to the backend at `/api/v1/*`. If APIs are not running:
- Console will show network errors
- Pages may show loading states or error states
- Verify the error handling UI looks correct even without backend

## Production Verification

After deploying to VPS via `git push origin main`:

```
# Wait for GitHub Actions to complete (~2-3 minutes)
# Then verify production:

browser_navigate → https://rmvfabrication.app/[route]
browser_snapshot → Confirm it works
browser_take_screenshot → Visual verification
browser_console_messages → Check for production errors
```

## Performance Checks

When making performance-related changes:
```
browser_network_requests → Check API call count and size
browser_console_messages → Look for slow operation warnings
```

## DO NOT

- Do NOT tell the user to "check it yourself" — YOU check it with Playwright
- Do NOT skip browser verification on "small" changes — always verify
- Do NOT assume the change works — prove it with Playwright
- Do NOT ask the user to screenshot errors — use Playwright to see them yourself
```
