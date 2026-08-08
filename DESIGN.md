# RMV Landing Page Design Specification

## Scope and source of truth

This document defines the visual system and implementation plan for the public `/` landing page only. Existing authentication, booking, service identifiers, service-detail modal behavior, API integrations, and every non-landing route remain unchanged. `PublicNavbar`, `AppLayout`, About, service detail, booking, dashboard, admin, and authentication pages are outside this redesign.

## Visual direction

The page is a premium industrial portfolio for real stainless-steel fabrication work. It combines architectural photography, editorial typography, disciplined black-and-yellow accents, warm-white content sections, and compact proof points. The visual rhythm alternates dark photographic sections with light information sections. It must feel practical and trustworthy rather than futuristic, glossy, or template-like.

Yellow is reserved for active navigation, labels, icons, primary actions, statistics/trust markers, and restrained hover indicators. Stainless-steel imagery remains the dominant visual asset.

## Section order

1. Sticky landing navigation
2. Full-height hero and four-item trust row
3. Services split layout with eight image cards
4. Featured projects split layout with four project cards
5. About RMV two-column section
6. Dark trust/statistics strip using non-fabricated proof statements
7. Materials and process two-column section with image collage
8. `Why Clients Choose RMV` trust section (used instead of invented testimonials)
9. Full-width yellow project CTA
10. Five-column landing footer

## Layout system

- Primary container: `width: min(calc(100% - 40px), 1440px)` with auto inline margins.
- Compact content container: maximum `1180px` when long text or narrow two-column content benefits from a shorter line length.
- Hero content maximum width: `1480px`; copy column maximum `760px`.
- Desktop section block padding: `104px` to `120px`.
- Tablet section block padding: `80px` to `88px`.
- Mobile section block padding: `64px` to `72px`.
- Standard grid gap: `24px`; compact card gap: `16px`; mobile gap: `14px` to `18px`.
- Text columns remain between `32ch` and `64ch` depending on hierarchy.

## Responsive breakpoints

- Base/mobile: `320px` and up.
- Small mobile refinement: `390px`.
- Two-column cards: `640px`.
- Tablet layouts: `768px`.
- Desktop navigation and split sections: `1024px`.
- Wide desktop: `1280px`.
- Maximum-content refinement: `1440px`.

Target review widths: `360`, `390`, `430`, `768`, `1024`, `1280`, and `1440` pixels.

## Typography

- Primary family: `Sora`, with `Inter`/system sans-serif fallback; both already exist in the project.
- Supporting/body family: `Inter`, with system sans-serif fallback.
- Hero heading: `clamp(3rem, 7vw, 6.75rem)`, weight `800`, line-height `0.92`, letter-spacing `-0.055em`.
- Section heading: `clamp(2rem, 4vw, 3.75rem)`, weight `800`, line-height `0.98`, letter-spacing `-0.04em`.
- CTA heading: `clamp(2rem, 4vw, 4rem)`, weight `800`, line-height `0.95`.
- Card title: `1rem` to `1.125rem`, weight `700` to `800`, line-height `1.2`.
- Body: `1rem`, weight `400` to `500`, line-height `1.7`.
- Small labels: `0.72rem` to `0.78rem`, weight `700`, uppercase, letter-spacing `0.18em`.
- Navigation: `0.76rem`, weight `700`, uppercase, letter-spacing `0.09em`.

## Color palette

- Near-black: `#090B0D`
- Dark charcoal: `#12161A`
- Elevated dark surface: `#191E23`
- Warm white: `#F7F7F5`
- Soft gray: `#D4D7DA`
- Muted gray text: `#8F969D`
- Industrial yellow: `#F5B400`
- Yellow hover: `#FFD047`
- Dark border: `rgba(255, 255, 255, 0.10)`
- Light border: `#E4E6E8`
- Dark text on light sections: `#111417`
- Secondary dark text: `#5D646B`

## Buttons

- Minimum height: `48px`; mobile primary actions use `52px` where space allows.
- Primary: yellow background, near-black text, `1px` yellow border, `6px` radius, uppercase bold label, arrow icon.
- Primary hover: `#FFD047`, translate upward no more than `2px`, modest shadow.
- Dark CTA button: near-black background, white text, dark border; hover uses charcoal.
- Outline dark-background button: transparent black, white border at 35%, white text; hover uses yellow border and yellow text.
- Outline light-background button: transparent, `#111417` border and text; hover fills near-black and turns text white.
- Focus: visible `2px #F5B400` outline with `3px` offset.

## Cards

- Service cards: photographic background, `8px` radius, dark full-card gradient overlay, yellow icon, white title, muted one-line description, minimum desktop height `188px`.
- Project cards: `8px` radius, `3:4` visual ratio, image above a dark information panel, yellow category label.
- Trust cards: elevated dark surface, `8px` radius, subtle border, yellow outlined icon container.
- Card hover: translate upward no more than `4px`; image scales to a maximum of `1.04`; border shifts toward yellow; shadow deepens slightly.
- Light cards use `0 18px 50px rgba(12, 16, 20, 0.10)`.
- Dark cards use `0 20px 50px rgba(0, 0, 0, 0.28)`.

## Radius and borders

- Buttons: `6px`.
- Standard cards and imagery: `8px`.
- Small icon holders: circular or `6px` rounded squares.
- Avoid pill-shaped containers except tiny labels.
- All dark cards: `1px solid rgba(255,255,255,0.10)`.
- All light cards: `1px solid #E4E6E8`.

## Images and overlays

- Use repository images only; no remote stock URLs.
- All content images use `object-fit: cover`, explicit aspect ratios, and meaningful alt text.
- Hero: `/landing/hero/hero-stainless-railing-bg.png`, positioned center-right on desktop and 62% center on mobile.
- Hero overlay: left-to-right gradient from `rgba(9,11,13,0.98)` through `rgba(9,11,13,0.72)` to `rgba(9,11,13,0.18)`, plus a subtle bottom fade.
- Service image overlay: top transparent-to-bottom near-black, with an additional low-opacity full black wash.
- About image: crop the left fabrication portion of `/landing/about-legacy-welder.png` so its embedded legacy copy is never displayed.
- Project and collage imagery must not be stretched or reused within the same section.

## Navigation

- A landing-only navigation component prevents visual changes on About or service-detail pages.
- Fixed top position, `72px` desktop and `64px` mobile height, high stacking order.
- Initial state: translucent near-black over the hero with a subtle border.
- After scrolling approximately `36px`: solid `#090B0D`, stronger border, light shadow.
- Desktop: brand left, main links balanced in the center, phone and quote CTA right.
- `Home` is yellow with a short underline; other links reveal a yellow underline on hover/focus.
- Mobile: brand, quote shortcut, and menu button remain visible. The menu expands below the bar, uses 48px touch rows, exposes all links and phone contact, and locks body scrolling while open.
- Menu button includes `aria-expanded`, `aria-controls`, and a clear accessible label.

## Section-specific behavior

### Hero

- Minimum desktop height: `720px`; mobile minimum approximately `700px` including trust row.
- Copy aligned left and vertically centered below the fixed navigation.
- Headline line breaks: `BUILT WITH` / `PRECISION.` / `MADE TO LAST.` with only `PRECISION.` yellow.
- CTAs stack on narrow mobile and sit inline from `640px`.
- Trust row uses four equal items on desktop, two columns on mobile, yellow line icons, and no fabricated metrics.

### Services

- Warm-white background.
- Desktop: `280px` intro rail plus an eight-card, four-column grid.
- Tablet: intro full width; cards form two columns.
- Mobile: single column at `360px`; two columns may be used from `430px` when labels remain readable.
- Existing service names and service modal/booking behavior are preserved.

### Featured projects

- Near-black background.
- Desktop: `260px` intro rail plus four equal project cards.
- Tablet: intro full width and two-column cards.
- Mobile: horizontally scrollable, snap-aligned cards approximately `82vw` wide.
- Uses existing RMV gallery imagery and generic truthful categories only.

### About RMV

- Warm-white background, two equal columns on desktop.
- Image ratio approximately `4:3`; copy column vertically centered.
- Three benefit items use yellow circular/outlined icon holders.

### Trust/statistics strip

- Dark charcoal background with a faint industrial image texture created through an existing image and black overlay.
- No unverified numbers. Four equal columns use yellow icons and factual non-numeric statements: made to measure, site reviewed, quality checked, and installation support.
- Tablet/mobile becomes two columns.

### Materials and process

- Warm-white background.
- Desktop: `42/58` copy-to-collage split.
- Checklist uses yellow check icons and only capabilities already supported by service data: 304/316 options, precision cutting/welding, professional finishing, and quality review.
- Collage uses a two-column grid: one wide/top image and three supporting images with consistent `8px` radius.

### Trust section

- Replaces testimonials because the repository contains no verified client quotes.
- Near-black background, centered heading, three dark cards.
- Cards: Clear Project Communication, Custom-Built Solutions, Reliable Fabrication Process.

### Final CTA

- Full-width `#F5B400` band with subtle existing-project-image texture under a low-opacity yellow overlay.
- Desktop uses a three-part grid: heading, support copy, black action button.
- Mobile stacks with full-width button.

### Footer

- `#090B0D` background, five responsive columns: Brand, Quick Links, Our Services, Contact Us, Service Areas.
- Real contact values come from the existing `OFFICE_LOCATION` constant.
- No social icons are shown because verified social URLs are unavailable.
- Service area wording is limited to the verified Quezon City/Metro Manila business location and asks users to confirm project coverage.
- Bottom row links only to existing `/privacy` and `/terms` routes.

## Accessibility

- Semantic `header`, `nav`, `main`, `section`, `article`, and `footer` landmarks.
- One `h1`; section headings follow with `h2`; card headings use `h3`.
- Every image has contextual alt text; decorative images use empty alt text.
- All cards that trigger the service dialog are real buttons.
- Anchor navigation uses valid links and scroll-margin to account for the sticky header.
- Focus rings are visible on dark and light surfaces.
- Minimum target size is `44px`.
- Color contrast meets WCAG AA for body copy and controls.
- Mobile menu exposes state and locks background scrolling.
- Layout remains understandable without motion.

## Animation and transitions

- Standard transition: `transform 220ms ease, opacity 220ms ease, border-color 220ms ease, background-color 220ms ease, color 220ms ease`.
- No scroll-reveal library, parallax, constant movement, particles, or glow effects.
- Navigation background transition is the only scroll-driven visual change.
- `prefers-reduced-motion: reduce` disables smooth scrolling and all meaningful transforms/transitions through existing global rules.

## Reusable component plan

- `LandingNavbar`: landing-only sticky desktop/mobile navigation and quote behavior.
- `SectionIntro`: consistent label, heading, description, and optional action treatment.
- `ServiceCard`: clickable image card that opens the existing service dialog.
- `ProjectCard`: project image and truthful category panel.
- `BenefitItem`: compact icon-and-copy proof point.
- `TrustCard`: capability card used instead of a fake testimonial.
- `LandingFooter`: five-column footer rendered by the landing page.

The section components may remain local to `LandingPage.tsx` because they are specific to this route; the navbar is separated because it owns scroll and mobile-menu state.

## Files created or edited

- `DESIGN.md` — design source of truth.
- `src/components/landing/LandingNavbar.tsx` — new landing-only navigation.
- `src/pages/LandingPage.tsx` — landing sections, data presentation, existing service modal, and footer.

No backend, routing, authentication, booking, shared app layout, About page, or service-detail page files will be changed.

## Authentication Pages

This section is the source of truth for the public `/login` and `/register` routes. It complements the landing-page system above; it does not change the landing-page specification or authenticated application screens.

Password recovery, email verification, two-factor verification, Google profile completion, and required password-change screens reuse the same authentication shell, form controls, imagery, footer, responsive rules, and accessibility requirements. Their existing routes and security flows remain unchanged.

### Visual direction and layout

- Authentication is industrial, architectural, calm, and secure: near-black `#090B0D` and charcoal `#12161A` surfaces, warm white `#F7F7F5`, muted text `#8F969D`, and restrained RMV yellow `#F5B400` with `#FFD047` hover.
- Desktop uses a centered shell with a maximum width around `1500px`, a fine `rgba(255,255,255,0.12)` outline, and controlled outer margins. Login places the photographic panel left and form right at approximately `50/50`; registration reverses it at approximately `48/52`.
- The shell uses `min-height: 100svh`. Login should not introduce unnecessary scrolling on common laptops. Registration may use natural page scrolling when its complete form cannot fit; nested scrollbars are not allowed.
- At `1024px`, reduce panel padding and nonessential decoration while retaining the split layout. At `768px`, switch to a form-first single column with a short visual banner. At `640px`, stack first and last name fields. Target widths are `360`, `390`, `430`, `768`, `1024`, `1280`, and `1440` pixels.

### Shared components

- `AuthLayout` owns the reversible visual/form shell, the desktop trust strip, and the compact footer.
- `AuthVisualPanel` uses local RMV photography, a readable dark overlay, the transparent RMV mark, and variant-specific copy. Login uses the indoor staircase/railing image; registration crops the fabrication portion of the existing welder image so embedded legacy copy is never shown.
- `AuthField`, `PasswordField`, and `GoogleAuthButton` supply consistent field chrome, accessible errors, visibility controls, and social-sign-in presentation without changing the existing request or Firebase behavior.
- The established-year label is `EST. 2018`, based on the existing About page. Footer copyright uses `new Date().getFullYear()`.

### Forms, controls, and states

- Form panels use `width: min(100%, 560px)` and padding of `72px` large desktop, `56px` desktop, `40px` tablet, and `24px` mobile.
- Labels are uppercase, `0.75rem`, weight `700`, with moderate letter spacing. Inputs are 50–52px high with `4–6px` radius, `rgba(255,255,255,0.025)` background, neutral borders, warm-white values, and muted placeholders.
- Hover strengthens the border; focus uses a yellow border plus a `3px rgba(245,180,0,0.12)` ring. Field errors use `#E45858` and concise text below the matching field; success uses `#43A66B`. Server failures use a persistent `role="alert"` block and retain entered values.
- Password visibility is a real `type="button"` with a changing accessible name, 44px target, visible focus, and no submit behavior. All fields use connected labels, appropriate autocomplete, `aria-invalid`, and `aria-describedby` when errors exist.
- Primary actions are full-width yellow, minimum 52px, 4–6px radius, uppercase bold labels, and a small arrow that moves at most 3px. Loading disables interaction and changes labels to `SIGNING IN…` or `CREATING ACCOUNT…` without changing size.
- Google actions remain secondary: dark background, neutral border, official multicolor G icon, accessible name, and no fake sign-in behavior. A slim divider and `OR` label separate email and Google actions.
- The registration terms control remains tied to its current validation and legal routes, with a 20px visible checkbox, full clickable label, keyboard focus, and inline error. Login has no Remember Me control because the application does not expose a separate persistent-session setting.

### Page content and imagery

- Login visual content: RMV Stainless Steel Fabrication; `BUILT WITH / PRECISION. / MADE TO LAST.` with only `PRECISION.` yellow; factual residential, commercial, and industrial fabrication copy; Premium Quality Materials, Expert Fabrication, and On-Time Delivery indicators.
- Login form content: Back to Home, `WELCOME BACK`, `Sign in to your account`, and truthful account-management supporting copy. Existing email/password login, forgot-password route, Google sign-in, redirects, two-factor flow, profile completion, and role-aware destinations remain unchanged.
- Registration uses the form first, `Create Account` heading with yellow `Account`, existing name/email/mobile/password/confirmation/terms fields, and existing lockout and password-strength behavior. Its visual panel uses a restrained brand frame, RMV Fabrication, `EST. 2018`, and no unverified statistics or certifications.
- A compact desktop trust strip uses Secure Access, Trusted Process, and Dedicated Support. Mobile hides it rather than pushing primary form controls below the fold. Footer contains the dynamic copyright and existing `/privacy` and `/terms` links only.

### Accessibility and motion

- Use semantic `main`, `aside`, `form`, and `footer` landmarks; preserve logical tab order and 44px minimum interactive targets.
- Decorative icons/images are hidden from assistive technology where appropriate; background imagery is never the only carrier of information. Maintain WCAG AA contrast and readable browser-autofill values.
- Use only border, background, color, transform, and opacity transitions around 180ms. Respect `prefers-reduced-motion: reduce`; no particles, pulsing glows, parallax, or repeated floating animation.

### Files created or edited

- `DESIGN.md` — adds this authentication source of truth.
- `src/components/auth/AuthLayout.tsx` — shared desktop/mobile shell, visual panels, trust strip, and footer.
- `src/components/auth/AuthFields.tsx` — reusable text/password and Google authentication controls.
- `src/pages/auth/LoginPage.tsx` and `src/pages/auth/RegisterPage.tsx` — presentation and accessible state integration only.
- `src/index.css` — scoped authentication layout and control styles.

## Workspace / Dashboard System

This section is the source of truth for authenticated RMV customer workspace pages. It complements the landing and authentication specifications above. Customer page content is redesigned for `/dashboard`, `/notifications`, `/appointments`, `/projects`, and `/payments`; authenticated staff and admin screens retain their existing information architecture while sharing the same permanent-dark shell.

### Direction and layout

- The workspace is permanently dark: near-black `#090B0D` canvas, `#101417` surfaces, `#171D21` elevated panels, warm-white `#F7F7F5` content, muted `#9AA3AC`, and RMV yellow `#F5B400` for active navigation, key actions, and restrained status emphasis. Blue, purple, gradients, and silver effects must not dominate the workspace.
- Desktop uses a fixed 280px navigation rail and a 76px sticky top bar. Page content is constrained to `1500px`, uses one document scrollbar, and keeps a minimum 24px desktop gutter. Mobile becomes a compact top bar plus accessible drawer and bottom navigation.
- Reuse local RMV fabrication imagery only. Page heroes use distinct images with a black overlay; imagery never makes text unreadable or substitutes for actual project data.
- All cards use 10px or smaller radii, subtle `rgba(255,255,255,0.10)` borders, calm shadows, and no glassmorphism. Pills are reserved for compact status values and filter controls.

### Shared workspace behavior

- The sidebar provides only real role-authorized routes. Customer navigation is Dashboard, Notifications, Appointments, Projects, and Payments; project blueprints, invoices, and quotes remain in their existing detail flows rather than becoming invented routes.
- The top bar preserves global search, `Ctrl/Cmd + K`, unread notification access, profile actions, Help Center, and sign-out. Search remains functional and role-aware.
- Every collection uses a consistent page label, concise headline, contextual search, factual filters, responsive rows/cards, meaningful empty/error/loading states, and pagination only where there is more than one page.
- Use existing APIs and real values only. Do not manufacture project media, financial figures, dates, progress, invoices, reviews, people, or status information.
- Minimum interactive target is 44px. Focus rings use RMV yellow. The mobile drawer traps focus, closes on Escape/backdrop, and prevents background scrolling. `prefers-reduced-motion` disables nonessential transitions.

### Customer pages

- **Dashboard:** Show a personal greeting, factual counts for active projects, pending visits, pending payments, and fabrication activity; an accurate project breakdown; recent notifications; an active project spotlight when available; and the existing appointment-booking path as the primary CTA.
- **Notifications:** Keep existing read state and mutations, category filtering, search, timestamps, linked destinations, and pagination. Unread state is visible without relying on color alone.
- **Appointments:** Show only the customer-relevant data and existing actions. Filters are All, Needs Action, Completed, and Cancelled. Desktop is a structured table; mobile is a compact card list. Booking remains the current flow.
- **Projects:** Present real service, status, dates, and project navigation. A neutral service icon or verified service image is used when project media is unavailable. Creating a project continues through appointment/quote intake rather than a fake direct-create action.
- **Payments:** Keep plans, receipts, invoices, checkout, and status behavior intact. Project stage and payment state remain distinct and are shown only from real API data.

### Responsive review and acceptance

- Review at `360`, `390`, `430`, `768`, `1024`, `1280`, and `1440` pixels.
- There is no light-mode selection, theme flash, horizontal overflow, clipped controls, or nested page scrolling.
- Landing, authentication, role permissions, API flows, dialogs, maps, payments, Socket.IO notifications, and existing staff/admin operations remain functional.
