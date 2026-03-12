import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultServerEnvPath = path.resolve(workspaceRoot, '..', 'rmv-server', '.env');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;
    const separator = trimmed.indexOf('=');
    if (separator === -1) return acc;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    acc[key] = value.replace(/^['"]|['"]$/g, '');
    return acc;
  }, {});
}

const localEnv = loadDotEnv(defaultServerEnvPath);

const config = {
  baseUrl: process.env.CONTRAST_AUDIT_BASE_URL || process.env.BASE_URL || 'http://localhost:5173',
  email: process.env.CONTRAST_AUDIT_EMAIL || localEnv.SUPER_ADMIN_EMAIL,
  password: process.env.CONTRAST_AUDIT_PASSWORD || localEnv.SUPER_ADMIN_PASSWORD,
  browserChannel: process.env.CONTRAST_AUDIT_BROWSER_CHANNEL || 'chrome',
};

if (!config.email || !config.password) {
  console.error('Missing credentials. Set CONTRAST_AUDIT_EMAIL and CONTRAST_AUDIT_PASSWORD, or provide rmv-server/.env locally.');
  process.exit(1);
}

async function ensureLoggedIn(page) {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('input[placeholder="Enter your email"]').fill(config.email);
  await page.locator('input[placeholder="Enter your password"]').fill(config.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30000 }),
    page.getByRole('button', { name: 'Sign In' }).click(),
  ]);
}

async function forceDarkMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('rmv-theme', 'dark');
    document.documentElement.dataset.theme = 'dark';
  });
  await page.waitForTimeout(250);
}

async function resolveFirstHref(page, selector, predicate = (href) => Boolean(href)) {
  const locator = page.locator(selector);
  const count = await locator.count();

  for (let index = 0; index < count; index += 1) {
    const href = await locator.nth(index).getAttribute('href');
    if (href && predicate(href)) return href;
  }

  throw new Error(`No matching href found for selector: ${selector}`);
}

async function openFirstRowDetail(page, listPath, rowSelector, detailPathPattern) {
  await page.goto(`${config.baseUrl}${listPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await forceDarkMode(page);
  await waitForPageReady(page);
  await page.waitForSelector(rowSelector, { timeout: 30000 });
  await Promise.all([
    page.waitForURL((url) => detailPathPattern.test(url.pathname), { timeout: 30000 }),
    page.locator(rowSelector).first().click({ force: true }),
  ]);
  await forceDarkMode(page);
}

async function openFirstProjectDetail(page) {
  await page.goto(`${config.baseUrl}/projects`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await forceDarkMode(page);
  await waitForPageReady(page);
  const detailHref = await resolveFirstHref(
    page,
    'a[href^="/projects/"]',
    (href) => /^\/projects\/[^/]+$/.test(href),
  );
  await page.goto(`${config.baseUrl}${detailHref}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await forceDarkMode(page);
  await page.waitForSelector('[role="tablist"]', { timeout: 30000 });
}

async function openProjectTab(page, tabName) {
  await page.getByRole('tab', { name: tabName }).click({ force: true });
  await page.waitForTimeout(250);
  await forceDarkMode(page);
  await page.waitForTimeout(150);
}

async function openAddUserDialog(page) {
  await page.goto(`${config.baseUrl}/users`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await forceDarkMode(page);
  const trigger = page.getByRole('button', { name: /^Add User$/ }).first();
  await trigger.click({ force: true });
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await forceDarkMode(page);
  await page.waitForTimeout(150);
}

async function waitForPageReady(page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading this page...'),
    { timeout: 30000 },
  );
}

async function auditRenderedContrast(page, rootSelector = 'body') {
  return page.evaluate((scopeSelector) => {
    const root = document.querySelector(scopeSelector);
    if (!root) {
      return { failureCount: 1, failures: [{ text: `Missing root: ${scopeSelector}`, ratio: 0, threshold: 0 }] };
    }

    const colorContext = document.createElement('canvas').getContext('2d');

    const parseHexColor = (value) => {
      const hex = value.slice(1);
      const expanded = hex.length === 3 || hex.length === 4
        ? hex.split('').map((part) => part + part).join('')
        : hex;

      if (expanded.length !== 6 && expanded.length !== 8) return null;

      const channels = expanded.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16));
      if (!channels || channels.some((channel) => Number.isNaN(channel))) return null;

      return {
        r: channels[0],
        g: channels[1],
        b: channels[2],
        a: channels[3] != null ? channels[3] / 255 : 1,
      };
    };

    const parseRgbColor = (value) => {
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number(part.trim().replace('%', '')));
      if (parts.length < 3 || parts.some((part, index) => index < 3 && Number.isNaN(part))) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };

    const toByte = (value) => {
      const clamped = Math.min(1, Math.max(0, value));
      return Math.round(clamped * 255);
    };

    const linearToSrgb = (value) => {
      if (value <= 0.0031308) return 12.92 * value;
      return 1.055 * (value ** (1 / 2.4)) - 0.055;
    };

    const parseAlpha = (value) => {
      if (value == null) return 1;
      const numeric = Number.parseFloat(value);
      if (Number.isNaN(numeric)) return 1;
      return value.trim().endsWith('%') ? numeric / 100 : numeric;
    };

    const parseOklabColor = (value) => {
      const match = value.match(/oklab\(([^)]+)\)/i);
      if (!match) return null;

      const [labPart, alphaPart] = match[1].split('/').map((part) => part.trim());
      const parts = labPart.split(/\s+/).filter(Boolean);
      if (parts.length < 3) return null;

      const lightnessRaw = parts[0];
      const lightness = lightnessRaw.endsWith('%')
        ? Number.parseFloat(lightnessRaw) / 100
        : Number.parseFloat(lightnessRaw);
      const a = Number.parseFloat(parts[1]);
      const b = Number.parseFloat(parts[2]);

      if ([lightness, a, b].some(Number.isNaN)) return null;

      const l = lightness + 0.3963377774 * a + 0.2158037573 * b;
      const m = lightness - 0.1055613458 * a - 0.0638541728 * b;
      const s = lightness - 0.0894841775 * a - 1.291485548 * b;

      const l3 = l ** 3;
      const m3 = m ** 3;
      const s3 = s ** 3;

      const r = linearToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3);
      const g = linearToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3);
      const bChannel = linearToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3);

      return {
        r: toByte(r),
        g: toByte(g),
        b: toByte(bChannel),
        a: parseAlpha(alphaPart),
      };
    };

    const parseOklchColor = (value) => {
      const match = value.match(/oklch\(([^)]+)\)/i);
      if (!match) return null;

      const [lchPart, alphaPart] = match[1].split('/').map((part) => part.trim());
      const parts = lchPart.split(/\s+/).filter(Boolean);
      if (parts.length < 3) return null;

      const lightnessRaw = parts[0];
      const chroma = Number.parseFloat(parts[1]);
      const hueRaw = parts[2].replace(/deg$/i, '');
      const lightness = lightnessRaw.endsWith('%')
        ? Number.parseFloat(lightnessRaw) / 100
        : Number.parseFloat(lightnessRaw);
      const hue = Number.parseFloat(hueRaw);

      if ([lightness, chroma, hue].some(Number.isNaN)) return null;

      const hueRadians = (hue * Math.PI) / 180;
      const a = chroma * Math.cos(hueRadians);
      const b = chroma * Math.sin(hueRadians);

      return parseOklabColor(`oklab(${lightness} ${a} ${b} / ${alphaPart ?? '1'})`);
    };

    const parseColor = (value) => {
      if (!value) return null;

      if (value.startsWith('#')) {
        return parseHexColor(value);
      }

      if (value.startsWith('oklch(')) {
        return parseOklchColor(value);
      }

      if (value.startsWith('oklab(')) {
        return parseOklabColor(value);
      }

      const rgb = parseRgbColor(value);
      if (rgb) return rgb;

      if (!colorContext) return null;

      colorContext.fillStyle = '#000';
      colorContext.fillStyle = value;
      const normalized = colorContext.fillStyle;

      if (normalized.startsWith('#')) {
        return parseHexColor(normalized);
      }

      return parseRgbColor(normalized);
    };

    const blend = (fg, bg) => {
      const alpha = fg.a ?? 1;
      return {
        r: fg.r * alpha + bg.r * (1 - alpha),
        g: fg.g * alpha + bg.g * (1 - alpha),
        b: fg.b * alpha + bg.b * (1 - alpha),
        a: 1,
      };
    };

    const luminance = ({ r, g, b }) => {
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };

    const contrast = (fg, bg) => {
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const sampleGradient = (backgroundImage) => {
      if (!backgroundImage || backgroundImage === 'none' || !backgroundImage.includes('gradient')) return null;
      const matches = [...backgroundImage.matchAll(/rgba?\([^)]*\)/gi)].map((entry) => parseColor(entry[0])).filter(Boolean);
      if (!matches.length) return null;
      return {
        r: matches.reduce((sum, color) => sum + color.r, 0) / matches.length,
        g: matches.reduce((sum, color) => sum + color.g, 0) / matches.length,
        b: matches.reduce((sum, color) => sum + color.b, 0) / matches.length,
        a: Math.min(matches.reduce((sum, color) => sum + (color.a ?? 1), 0) / matches.length, 1),
      };
    };

    const getBackground = (element) => {
      let current = element;
      let background = { r: 15, g: 23, b: 42, a: 1 };

      while (current) {
        const style = getComputedStyle(current);
        const gradient = sampleGradient(style.backgroundImage);
        if (gradient) {
          background = blend(gradient, background);
          break;
        }
        const bgColor = parseColor(style.backgroundColor);
        if (bgColor && bgColor.a > 0) {
          background = blend(bgColor, background);
          break;
        }
        current = current.parentElement;
      }

      return background;
    };

    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const hasOwnText = (element) => {
      const text = (element.innerText || element.textContent || '').trim();
      if (!text) return false;
      const childText = Array.from(element.children).map((child) => child.textContent || '').join('').trim();
      return element.children.length === 0 || text !== childText;
    };

    const candidates = [root, ...Array.from(root.querySelectorAll('*'))].filter((element) => {
      if (!(element instanceof HTMLElement) || !isVisible(element)) return false;
      const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('placeholder') || '';
      return hasOwnText(element) || Boolean(ariaLabel);
    });

    const failures = candidates.map((element) => {
      const style = getComputedStyle(element);
      const fg = parseColor(style.color);
      if (!fg) return null;
      const bg = getBackground(element);
      const ratio = contrast(fg.a < 1 ? blend(fg, bg) : fg, bg);
      const fontSize = Number.parseFloat(style.fontSize || '16');
      const fontWeight = Number.parseInt(style.fontWeight || '400', 10);
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const threshold = isLarge ? 3 : 4.5;
      if (ratio >= threshold) return null;
      return {
        text: (element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 160),
        ratio: Number(ratio.toFixed(2)),
        threshold,
        tag: element.tagName,
        className: element.className,
      };
    }).filter(Boolean);

    return { failureCount: failures.length, failures };
  }, rootSelector);
}

const routeAudits = [
  {
    name: 'projects-list',
    run: async (page) => {
      await page.goto(`${config.baseUrl}/projects`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await forceDarkMode(page);
      await waitForPageReady(page);
      return auditRenderedContrast(page);
    },
  },
  {
    name: 'project-detail',
    run: async (page) => {
      await openFirstProjectDetail(page);
      return auditRenderedContrast(page, 'main');
    },
  },
  {
    name: 'project-blueprint-tab',
    run: async (page) => {
      await openFirstProjectDetail(page);
      await openProjectTab(page, 'Blueprint');
      return auditRenderedContrast(page, 'main');
    },
  },
  {
    name: 'project-fabrication-tab',
    run: async (page) => {
      await openFirstProjectDetail(page);
      await openProjectTab(page, 'Fabrication');
      return auditRenderedContrast(page, 'main');
    },
  },
  {
    name: 'appointments-list',
    run: async (page) => {
      await page.goto(`${config.baseUrl}/appointments`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await forceDarkMode(page);
      await waitForPageReady(page);
      return auditRenderedContrast(page);
    },
  },
  {
    name: 'appointment-detail',
    run: async (page) => {
      await openFirstRowDetail(page, '/appointments', 'table tbody tr', /^\/appointments\/[^/]+$/);
      await page.waitForFunction(() => document.body.innerText.includes('Appointment Details'), { timeout: 30000 });
      return auditRenderedContrast(page);
    },
  },
  {
    name: 'visit-reports-list',
    run: async (page) => {
      await page.goto(`${config.baseUrl}/visit-reports`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await forceDarkMode(page);
      return auditRenderedContrast(page);
    },
  },
  {
    name: 'visit-report-detail',
    run: async (page) => {
      await openFirstRowDetail(page, '/visit-reports', 'table tbody tr', /^\/visit-reports\/[^/]+$/);
      await page.waitForFunction(() => document.body.innerText.includes('Visit Report Details'), { timeout: 30000 });
      return auditRenderedContrast(page);
    },
  },
  {
    name: 'users-page',
    run: async (page) => {
      await page.goto(`${config.baseUrl}/users`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await forceDarkMode(page);
      return auditRenderedContrast(page);
    },
  },
  {
    name: 'users-add-dialog',
    run: async (page) => {
      await openAddUserDialog(page);
      return auditRenderedContrast(page, '[role="dialog"]');
    },
  },
  {
    name: 'users-row-action-menu',
    run: async (page) => {
      await page.goto(`${config.baseUrl}/users`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await forceDarkMode(page);
      await page.locator('table tbody tr td:last-child button').first().click({ force: true });
      await page.waitForSelector('[role="menu"]', { timeout: 10000 });
      await forceDarkMode(page);
      await page.waitForTimeout(150);
      return auditRenderedContrast(page, '[role="menu"]');
    },
  },
  {
    name: 'settings-config-dialog',
    run: async (page) => {
      await page.goto(`${config.baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await forceDarkMode(page);
      await page.getByRole('button', { name: 'Edit' }).first().click({ force: true });
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await forceDarkMode(page);
      await page.waitForTimeout(150);
      return auditRenderedContrast(page, '[role="dialog"]');
    },
  },
];

const browser = await chromium.launch({ headless: true, channel: config.browserChannel });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

try {
  await ensureLoggedIn(page);

  const results = [];
  for (const routeAudit of routeAudits) {
    const result = await routeAudit.run(page);
    results.push({ name: routeAudit.name, ...result });
  }

  const failureGroups = results.filter((result) => result.failureCount > 0);
  console.log(JSON.stringify({ baseUrl: config.baseUrl, results }, null, 2));

  if (failureGroups.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}