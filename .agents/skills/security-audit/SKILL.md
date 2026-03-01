```skill
---
name: security-audit
description: Act as an ethical hacker to find and fix security vulnerabilities in the RMV System. Use this skill when the user mentions security, vulnerabilities, penetration testing, hacking, or hardening. Actively attacks the codebase AND the live browser using Playwright MCP to find real exploitable issues, then fixes them.
metadata:
  author: rmv-team
  version: "1.0.0"
---

# Security Audit & Ethical Hacking — RMV System

When the user asks about security, act as a **professional penetration tester / ethical hacker**. Actively hunt for vulnerabilities in the code AND in the running application via Playwright browser testing.

## Mindset

Think like an attacker:
- What can be bypassed?
- What inputs are not validated?
- What data is exposed that shouldn't be?
- What can a malicious user do if they manipulate requests?
- What happens if auth is missing or broken?

## Attack Methodology

### Phase 1: Static Code Analysis (Codebase Scan)

Search the codebase for common vulnerability patterns:

#### 1. Cross-Site Scripting (XSS)
```
# Search for dangerous patterns
grep: dangerouslySetInnerHTML
grep: innerHTML
grep: document.write
grep: eval(
grep: v-html
grep: href={.*user    # Dynamic href injection
```
- Check if user input is rendered without sanitization
- Look for URL parameters reflected in the DOM
- Check if React's built-in XSS protection is bypassed anywhere

#### 2. Authentication & Authorization Flaws
```
# Search for auth issues
grep: useAuthStore
grep: token
grep: localStorage.*token
grep: sessionStorage
grep: cookie
grep: Bearer
grep: role|roles|isAdmin|canAccess
```
- Are tokens stored securely? (HttpOnly cookies > localStorage)
- Is role checking done client-side only? (can be bypassed)
- Are there routes without auth guards?
- Can users access other users' data by changing IDs in URLs?

#### 3. Sensitive Data Exposure
```
# Search for exposed secrets
grep: API_KEY|SECRET|PASSWORD|PRIVATE
grep: console.log.*token|password|secret
grep: .env
grep: hardcoded credentials
```
- Are API keys or secrets in the frontend code?
- Is sensitive data logged to the console?
- Are error messages too verbose (leak stack traces)?

#### 4. Insecure Direct Object References (IDOR)
```
# Search for direct ID usage in API calls
grep: /api/v1.*/:id
grep: params.id
grep: useParams
```
- Can user A access user B's resources by changing the ID?
- Are API endpoints properly checking ownership?

#### 5. CSRF Protection
```
grep: csrf|CSRF|xsrf|XSRF
grep: SameSite
grep: X-CSRF-Token
```
- Are state-changing requests protected against CSRF?
- Are cookies set with SameSite attribute?

#### 6. Input Validation
```
grep: zod|yup|joi|validate
grep: encodeURIComponent|decodeURIComponent
grep: sanitize|escape|DOMPurify
```
- Is form input validated before sending to API?
- Are file uploads restricted by type and size?
- Is there SQL/NoSQL injection potential in search params?

#### 7. Dependency Vulnerabilities
```bash
# Run in terminal
cd rmv-web && npm audit
```

### Phase 2: Browser-Based Attacks (Playwright MCP)

Actively attack the running application through the browser:

#### Attack 1: XSS Injection Testing
```
# Navigate to forms and input fields
browser_navigate → http://localhost:5173/[page-with-forms]

# Try injecting script tags in every input
browser_fill_form → <script>alert('XSS')</script>
browser_fill_form → <img src=x onerror=alert('XSS')>
browser_fill_form → javascript:alert('XSS')
browser_fill_form → "><script>alert('XSS')</script>
browser_fill_form → ' onmouseover='alert(1)

# Submit and check if script executes
browser_click → submit button
browser_console_messages → check for XSS execution
browser_snapshot → check if payload rendered as HTML
```

#### Attack 2: Authentication Bypass
```
# Try accessing protected pages without login
browser_navigate → http://localhost:5173/projects
browser_snapshot → should redirect to login, not show data

browser_navigate → http://localhost:5173/users
browser_snapshot → should redirect to login

browser_navigate → http://localhost:5173/settings
browser_snapshot → should redirect to login

# Try accessing admin-only pages as a regular user
# Login as regular user first, then:
browser_navigate → http://localhost:5173/users
browser_snapshot → should show access denied
```

#### Attack 3: IDOR Testing
```
# Login as User A
# Navigate to User A's resource
browser_navigate → http://localhost:5173/projects/USER_A_PROJECT_ID
browser_snapshot → should work

# Try accessing User B's resource
browser_navigate → http://localhost:5173/projects/USER_B_PROJECT_ID
browser_snapshot → should deny access or show 403
```

#### Attack 4: Client-Side Manipulation
```
# Check if role/auth checks can be bypassed via console
browser_evaluate → localStorage.getItem('token')
browser_evaluate → JSON.parse(atob(localStorage.getItem('token').split('.')[1]))

# Try modifying stored auth data
browser_evaluate → localStorage.setItem('user', JSON.stringify({roles:['super_admin']}))
browser_navigate → http://localhost:5173/users
browser_snapshot → should NOT grant admin access from client manipulation
```

#### Attack 5: API Endpoint Probing
```
# Check for exposed API endpoints via browser
browser_evaluate → fetch('/api/v1/users').then(r=>r.json()).then(console.log)
browser_console_messages → check what data is returned

# Try accessing API without auth
browser_evaluate → fetch('/api/v1/projects', {headers:{}}).then(r=>r.status).then(console.log)
browser_console_messages → should return 401

# Try NoSQL injection in search
browser_evaluate → fetch('/api/v1/projects?search[$gt]=').then(r=>r.json()).then(console.log)
browser_console_messages → check response
```

#### Attack 6: File Upload Attacks
```
# If there's a file upload, try uploading dangerous files
# Test with script files disguised as images
browser_navigate → page with file upload
browser_file_upload → malicious.html renamed to image.jpg
browser_snapshot → should reject the file
```

#### Attack 7: Rate Limiting
```
# Try brute-forcing login
# Rapidly submit login form multiple times
browser_navigate → http://localhost:5173/login
# Submit wrong credentials 20+ times rapidly
browser_fill_form → wrong credentials
browser_click → login button
# Repeat...
browser_snapshot → should show rate limit after ~5 attempts
```

#### Attack 8: Open Redirect
```
# Test for open redirect vulnerabilities
browser_navigate → http://localhost:5173/login?redirect=https://evil.com
browser_fill_form → valid credentials
browser_click → login
# After login, check if redirected to evil.com
browser_snapshot → should NOT redirect to external URL
```

#### Attack 9: Clickjacking
```
# Check if X-Frame-Options or CSP frame-ancestors is set
browser_evaluate → fetch('/').then(r => r.headers.get('x-frame-options'))
browser_evaluate → fetch('/').then(r => r.headers.get('content-security-policy'))
```

#### Attack 10: Information Disclosure
```
# Check for exposed source maps in production
browser_navigate → https://rmvfabrication.app/assets/[any-js-file].map
browser_snapshot → should return 404

# Check response headers for version disclosure
browser_evaluate → fetch('/').then(r => [...r.headers.entries()])
browser_console_messages → look for Server, X-Powered-By headers

# Check for sensitive data in HTML source
browser_evaluate → document.documentElement.innerHTML.match(/api[_-]?key|secret|password/gi)
```

### Phase 3: Dependency & Configuration Audit

```bash
# Check for known vulnerabilities in dependencies
npm audit

# Check for outdated packages with known CVEs
npm outdated

# Check if .env files are in .gitignore
cat .gitignore | grep env

# Check for secrets in git history
git log --all --oneline -20
```

### Phase 4: Security Headers Check (Production)

```
browser_navigate → https://rmvfabrication.app
browser_evaluate → fetch(window.location.href).then(r => Object.fromEntries(r.headers))
```

Verify these headers exist:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` or `SAMEORIGIN`
- `Content-Security-Policy`
- `Referrer-Policy`
- `Permissions-Policy`
- No `X-Powered-By` header (information leak)
- No `Server` version disclosure

## Vulnerability Report Format

After testing, report findings in this format:

```
## 🔴 CRITICAL
- [Vuln Name] — Description, location, exploit steps, fix

## 🟠 HIGH
- [Vuln Name] — Description, location, exploit steps, fix

## 🟡 MEDIUM
- [Vuln Name] — Description, location, exploit steps, fix

## 🔵 LOW
- [Vuln Name] — Description, location, exploit steps, fix

## ✅ PASSED
- [Check Name] — What was tested and confirmed secure
```

## Fixing Vulnerabilities

After finding vulnerabilities, **fix them immediately**:

1. **Report** the vulnerability with severity
2. **Show** the vulnerable code
3. **Fix** the code
4. **Re-test** with Playwright to confirm the fix works
5. **Move to next** vulnerability

### Common Fixes

| Vulnerability | Fix |
|--------------|-----|
| XSS | Use React's built-in escaping, add DOMPurify for rich text |
| Auth bypass | Add route guards, verify tokens server-side |
| IDOR | Add ownership checks in API, don't trust client IDs |
| CSRF | Use CSRF tokens, SameSite cookies |
| Info disclosure | Remove console.logs, disable source maps in prod |
| Missing headers | Add security headers in Nginx config |
| Dependency CVEs | `npm audit fix` or upgrade packages |
| Rate limiting | Implement rate limiting middleware |
| Open redirect | Whitelist allowed redirect URLs |
| Clickjacking | Add X-Frame-Options header |

## Scope

### Frontend (rmv-web) — Always in scope
- React components and pages
- Client-side auth logic
- Forms and user input handling
- API call patterns
- Route protection
- Local storage usage
- Dependencies

### Browser (Playwright) — Always in scope
- Live application at localhost:5173 (dev)
- Live application at rmvfabrication.app (production)
- DOM manipulation
- Console errors
- Network requests
- Cookie and storage inspection

### Backend (rmv-server) — Only when user says so
- Do NOT attack or modify backend unless explicitly asked
- Note backend issues as recommendations for the backend team

## When to Trigger This Skill

Activate when the user says any of:
- "check security"
- "find vulnerabilities"
- "pen test" / "penetration test"
- "security audit"
- "is this secure?"
- "hack my app"
- "check for XSS / CSRF / injection"
- "harden my app"
- "security review"
```
