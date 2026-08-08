# RMV Web Frontend Guide

This repository contains the RMV System frontend built with React, TypeScript, Vite, Tailwind CSS v4, and React Query.

## Quick Start

Prerequisites:

- Node.js 22 or newer
- npm
- Backend API running locally at `http://localhost:5000`

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Frontend local URL:

```text
http://localhost:5173
```

## Scripts

```bash
npm run dev                    # Start Vite dev server
npm run build                  # TypeScript build + production bundle
npm run preview                # Preview production build
npm run test                   # Run Vitest suite
npm run test:contrast          # Run contrast regression test
npm run audit:contrast:browser # Browser-based contrast audit
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- React Query
- Zustand
- Axios
- Radix UI primitives
- Leaflet / React Leaflet
- Firebase client SDK (web auth)
- Socket.IO client

## Project Structure

```text
rmv-web/
|-- public/                    Static assets, logos, help media, sitemap
|-- src/
|   |-- components/            Reusable UI, layout, auth, shared components
|   |-- hooks/                 React Query hooks and data-access hooks
|   |-- lib/                   API client, types, constants, helpers
|   |-- pages/                 Route-level pages
|   |-- stores/                Zustand stores (auth/theme/notifications)
|   |-- App.tsx                Route tree and route guards
|   `-- main.tsx               App bootstrap and providers
|-- scripts/                   Utility and audit scripts
|-- output/                    Local test screenshot artifacts
|-- index.html
|-- vite.config.ts
`-- package.json
```

## Runtime Behavior

### API communication

- Frontend requests go to `/api/v1/...`.
- Vite proxy forwards:
  - `/api` to `http://localhost:5000`
  - `/socket.io` to `http://localhost:5000` (WebSocket enabled)
- Proxy config is in `vite.config.ts`.

### Auth and CSRF flow

- CSRF token is fetched from `/api/v1/csrf-token`.
- Mutating requests attach `X-CSRF-Token`.
- Access tokens are stored per tab, and refresh flow is handled by Axios interceptors in `src/lib/api.ts`.
- On token expiry, frontend attempts refresh once before redirecting to login.

### Routing and role guards

- Route definitions live in `src/App.tsx`.
- Role-restricted routes use `ProtectedRoute`.
- Public routes include:
  - `/`
  - `/collections`
  - `/login`
  - `/register`
  - OTP/2FA/reset-password routes

## Main App Areas

- `/dashboard`
- `/appointments`
- `/appointments/book`
- `/appointments/create-for-customer`
- `/appointments/:id`
- `/projects`
- `/projects/:id`
- `/payments`
- `/cash`
- `/reports`
- `/users`
- `/settings`
- `/slot-management`
- `/help/*`

## Role Model (Frontend)

Role constants are defined in `src/lib/constants.ts`:

- `customer`
- `appointment_agent`
- `sales_staff`
- `engineer`
- `cashier`
- `admin`
- `fabrication_staff`

Navigation visibility and route access are derived from these roles.

## Environment and Configuration Notes

This frontend repository does not currently depend on a local `.env` file for core runtime values.

Current behavior:

- API base path is hardcoded as `/api/v1` in `src/lib/api.ts`.
- Legacy host `rmvfabrication.app` is redirected to canonical `www.rmvfabrication.app` in `src/main.tsx`.
- Firebase web config is currently hardcoded in `src/lib/firebase.ts`.

If you later migrate values to env variables, use Vite-style keys (`VITE_*`) and reference them with `import.meta.env`.

## Development Workflow

When adding a new page:

1. Create page component in `src/pages/`.
2. Add hook or API call in `src/hooks/` or `src/lib/api.ts`.
3. Add route in `src/App.tsx`.
4. Add navigation entry in `src/components/layout/navigation.ts` when needed.
5. Reuse existing UI primitives from `src/components/ui/`.

When adding a new API-backed feature:

1. Add endpoint wrapper in relevant hook (`src/hooks/...`).
2. Keep request/response typing in `src/lib/types.ts`.
3. Handle loading/error states in page-level components.
4. Add role checks in route and UI actions.

## Quality Checks Before Push

```bash
npm run build
npm run test
```

Optional accessibility contrast check:

```bash
npm run test:contrast
npm run audit:contrast:browser
```

## Troubleshooting

Frontend cannot reach backend:

- Ensure backend is running at `http://localhost:5000`.
- Ensure Vite dev server is running on `http://localhost:5173`.
- Check browser network calls for `/api/v1/*`.

CSRF errors on write actions:

- Confirm `/api/v1/csrf-token` returns success.
- Confirm backend cookie/CORS settings are valid for local dev.

Login works but subsequent calls fail:

- Check refresh-token and access-token handling in `src/lib/api.ts`.
- Inspect 401/403 retry behavior in Axios interceptors.

Routing shows unauthorized:

- Check role values in auth state and route guard `allowedRoles`.

## Files to Read First

1. `src/App.tsx`
2. `src/lib/api.ts`
3. `src/lib/constants.ts`
4. `src/lib/types.ts`
5. `src/components/layout/navigation.ts`
6. `src/hooks/useAppointments.ts`
7. `src/hooks/useProjects.ts`
8. `src/hooks/usePayments.ts`

## Project Screenshot

![RMV role-based dashboard](https://raw.githubusercontent.com/sean-camara/sean-camara-portfolio/main/public/assets/rmv-screenshot.png)

## Project Context and Architecture

This frontend is part of an academic capstone modeled on a local fabrication business workflow. It is not presented as paid client work or confirmed daily-use production software. React pages and role guards consume the `/api/v1` Express API; Axios interceptors coordinate cookies, CSRF tokens, access-token refresh, and errors. Typed hooks connect customer, staff, engineer, cashier, fabrication, and administrator views to shared backend workflows.

## Testing Strategy

Vitest tests cover address helpers, authentication routing, configuration safety, role/project access, engineer and report workflows, theme state, and dark-mode contrast regressions. Run `npm run test`, `npm run test:contrast`, and `npm run build`. No coverage percentage is published. Full browser workflows, assistive-technology checks, and live payment/file-provider paths need additional testing.

## Deployment

The production build is generated with `npm run build`. The frontend is deployed as part of the RMV Docker/Nginx environment documented in the backend operations guide. The public capstone demo is available at <https://www.rmvfabrication.app>.

## Known Limitations

- The capstone remains under development and is not claimed to be in daily business use.
- Firebase configuration and the `/api/v1` base path are currently embedded in source rather than a sanitized environment template.
- Provider-backed workflows require compatible backend sandbox or deployment configuration.

## Future Improvements

- Move environment-dependent public configuration behind a documented Vite environment schema.
- Expand browser coverage across every authenticated role and workflow transition.
- Add automated accessibility checks to the regular quality gate.

## License

No license file is currently included. All rights are reserved unless a license is added later.
