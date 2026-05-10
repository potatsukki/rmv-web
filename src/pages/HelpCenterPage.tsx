import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  FolderOpen,
  CalendarCheck,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfigs, useUpdateConfig } from '@/hooks/useConfig';
import { canAccessPath } from '@/lib/auth-routing';
import { Role } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

type HelpSection = { heading: string; body: string };

type HelpContent = {
  title: string;
  subtitle: string;
  sections: HelpSection[];
  roleSections?: Partial<Record<Role, HelpSection[]>>;
};

type SystemLink = {
  label: string;
  path: string;
};

type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  roles?: Role[];
  keywords?: string[];
  body: string[];
  checklist?: string[];
  systemLinks?: SystemLink[];
};

type HelpCategory = {
  slug: string;
  title: string;
  description: string;
  roles?: Role[];
  articles: HelpArticle[];
};

type SearchMatch = { category: HelpCategory; article: HelpArticle; score: number };
type QuickTopic = { label: string; query: string };

const FALLBACK_HELP: HelpContent = {
  title: 'Help Center',
  subtitle: 'Guides for bookings, payments, and project tracking.',
  sections: [
    {
      heading: 'Booking appointments',
      body: 'Use the Appointments page to create, reschedule, or monitor your visits.',
    },
    {
      heading: 'Payments',
      body: 'Use Payments to monitor stage payments and view your payment history.',
    },
    {
      heading: 'Project tracking',
      body: 'Use the Projects page to monitor blueprint, payment, and fabrication milestones.',
    },
    {
      heading: 'Need support?',
      body: 'Contact your assigned staff through the portal notifications channel.',
    },
  ],
  roleSections: {
    [Role.ADMIN]: [
      {
        heading: 'Admin maintenance',
        body: 'Use Settings and Slot Management for maintenance mode, holidays, and blocked slots.',
      },
    ],
    [Role.CASHIER]: [
      {
        heading: 'Cashier queue',
        body: 'Use Cashier Queue to verify customer payments.',
      },
    ],
  },
};

const ALL_ROLES = Object.values(Role) as Role[];
const APPOINTMENT_HELP_ROLES = [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN];
const VISIT_REPORT_HELP_ROLES = [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN];
const PROJECT_HELP_ROLES = [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN];
const BLUEPRINT_HELP_ROLES = [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN];
const PAYMENT_HELP_ROLES = [Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN];
const CASH_COLLECTION_HELP_ROLES = [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN];
const OPERATIONS_HELP_ROLES = [Role.ADMIN, Role.APPOINTMENT_AGENT, Role.CASHIER];
const SLOT_CONTROL_ROLES = [Role.ADMIN, Role.APPOINTMENT_AGENT];
const REPORTING_HELP_ROLES = [Role.CASHIER, Role.ADMIN];

const KNOWLEDGE_BASE: HelpCategory[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Core orientation for first-time users and daily navigation.',
    roles: ALL_ROLES,
    articles: [
      {
        slug: 'account-setup',
        title: 'Account Setup and Profile Completion',
        summary: 'Complete identity, location, and signature for full access.',
        roles: ALL_ROLES,
        body: [
          'Open Account Settings and complete your profile details, especially contact information and location.',
          'Verify your email and upload or draw your signature to remove most process blockers.',
          'Some role actions are hidden until profile requirements are met.',
        ],
        checklist: [
          'Verify email address',
          'Complete address or location fields',
          'Save a valid signature',
          'Review notification preferences',
        ],
        systemLinks: [
          { label: 'Profile Settings', path: '/account/profile' },
          { label: 'Security Settings', path: '/account/security' },
          { label: 'Account Information', path: '/account/info' },
        ],
      },
      {
        slug: 'system-navigation',
        title: 'System Navigation Map',
        summary: 'Understand sidebar groups, quick search, and the pages available to your role.',
        roles: ALL_ROLES,
        body: [
          'Use the sidebar and mobile navigation to move between the modules your account is allowed to access.',
          'Use the top-bar quick search to jump to pages, projects, appointments, and other records that your role can open.',
          'Help articles support deep links, so teams can point users directly to the right guidance page.',
        ],
        checklist: [
          'Pin your frequent workflow pages',
          'Use quick search keywords',
          'Bookmark high-value article links under /help routes',
        ],
        systemLinks: [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Notifications', path: '/notifications' },
        ],
      },
      {
        slug: 'security-and-session',
        title: 'Security, Sessions, and Access Recovery',
        summary: 'How login, verification, and account recovery behave across the platform.',
        roles: ALL_ROLES,
        body: [
          'Authentication relies on access and refresh token flows, and protected pages require valid authenticated sessions.',
          'If your account has required first-login password changes or incomplete profile data, the app can redirect you to complete those actions before normal navigation.',
          'Use account security pages for password updates and verification steps, and avoid sharing session contexts across devices.',
        ],
        checklist: [
          'Complete first-login password change when prompted',
          'Keep email verification active',
          'Use forgot-password flow for recovery instead of creating duplicate accounts',
        ],
        systemLinks: [
          { label: 'Security Settings', path: '/account/security' },
          { label: 'Notification Settings', path: '/account/notifications' },
        ],
      },
    ],
  },
  {
    slug: 'appointments-visits',
    title: 'Appointments and Visits',
    description: 'Lifecycle guidance for bookings, ocular payments, and reports.',
    roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
    articles: [
      {
        slug: 'appointment-lifecycle',
        title: 'Appointment Lifecycle',
        summary: 'From request to completion, including reschedules, no-shows, and declined consultations.',
        roles: APPOINTMENT_HELP_ROLES,
        body: [
          'Customers can book their own first office consultation, while appointment agents can create that consultation on behalf of a customer.',
          'Sales staff should only schedule ocular visits after consultation, not the customer’s first appointment.',
          'If the customer decides not to proceed during consultation, assigned sales staff can mark Customer Declined so the appointment is cancelled and the report workflow stops.',
          'Status changes are visible in the appointment detail flow and reflected in notifications.',
          'Cashiers and admins can coordinate on ocular fee queues when manual payment review is involved.',
        ],
        checklist: [
          'Confirm appointment details',
          'Track status transitions',
          'Record no-show, reschedule, or customer-declined outcomes from the appointment detail page',
        ],
        systemLinks: [
          { label: 'Appointments', path: '/appointments' },
          { label: 'Book Appointment', path: '/appointments/book' },
          { label: 'Create Appointment', path: '/appointments/create-for-customer' },
        ],
      },
      {
        slug: 'visit-report-flow',
        title: 'Visit Report Workflow',
        summary: 'How sales and engineering teams capture site findings.',
        roles: VISIT_REPORT_HELP_ROLES,
        body: [
          'Use Visit Reports to consolidate site measurements, customer requirements, and constraints.',
          'Keep reports concise but complete, because downstream blueprint and costing depend on accuracy.',
          'Use consistent language and include attachments where required by your team standards.',
        ],
        checklist: [
          'Attach measurements and findings',
          'Confirm project linkage',
          'Submit report for internal review',
        ],
        systemLinks: [{ label: 'Visit Reports', path: '/visit-reports' }],
      },
      {
        slug: 'ocular-fee-rules',
        title: 'Ocular Fee and Distance Rules',
        summary: 'Distance-based ocular fee behavior and verification expectations.',
        roles: APPOINTMENT_HELP_ROLES,
        body: [
          'Ocular pricing uses a base NCR fee and can increase based on measured distance for non-NCR locations.',
          'For routes that require fee verification, payment must be confirmed before dependent scheduling actions continue.',
          'Customers should keep their Account Profile address and saved map pin accurate, because sales staff schedule ocular visits from the saved customer location.',
        ],
        checklist: [
          'Customer updates Account Profile address and saved map pin before the sales consultation is completed',
          'Review computed ocular fee before payment',
          'Track fee verification status on appointment details',
        ],
        systemLinks: [
          { label: 'Appointments', path: '/appointments' },
          { label: 'Ocular Fee Queue', path: '/payments?tab=ocular-fees' },
        ],
      },
      {
        slug: 'appointment-status-reference',
        title: 'Appointment Status Reference',
        summary: 'Understand REQUESTED to COMPLETED paths, including exceptions.',
        roles: APPOINTMENT_HELP_ROLES,
        body: [
          'Appointments move through controlled states such as requested, confirmed, completed, cancelled, no-show, and reschedule requested.',
          'Office consultation attendance also tracks scheduled, on time, late arrival, in progress, completed, rescheduled, no-show, and customer declined.',
          'Each state affects what actions remain available to customer, agent, and assigned staff in the page UI.',
          'When troubleshooting, first confirm the current status before attempting follow-up actions like payments or report submission.',
        ],
        checklist: [
          'Validate current appointment status first',
          'Use history/timeline context before escalating',
          'Coordinate no-show, reschedule, and customer-declined decisions with assigned staff',
        ],
        systemLinks: [{ label: 'Appointments', path: '/appointments' }],
      },
    ],
  },
  {
    slug: 'projects-fabrication',
    title: 'Projects and Fabrication',
    description: 'Guides for project states, blueprint approvals, and production updates.',
    roles: PROJECT_HELP_ROLES,
    articles: [
      {
        slug: 'project-statuses',
        title: 'Project Status and Milestones',
        summary: 'Interpret statuses from draft through completion.',
        roles: PROJECT_HELP_ROLES,
        body: [
          'Project pages are the single source of truth for stage, payment, and fabrication progress.',
          'Use project tabs to switch context between blueprint decisions, payments, and production details.',
          'When a project completes, customer review and closeout actions become available.',
        ],
        checklist: [
          'Monitor status transitions',
          'Keep timeline updates current',
          'Review customer-facing updates before publishing',
        ],
        systemLinks: [{ label: 'Projects', path: '/projects' }],
      },
      {
        slug: 'fabrication-lifecycle',
        title: 'Fabrication Lifecycle Marker',
        summary: 'Track workshop progress through explicit lifecycle steps.',
        roles: PROJECT_HELP_ROLES,
        body: [
          'Fabrication updates are represented as lifecycle steps with clear progression markers.',
          'Quality check and post-check transitions should be communicated immediately to reduce ambiguity.',
          'Use project-level updates to ensure customer visibility and internal coordination.',
        ],
        checklist: [
          'Update lifecycle step on every major transition',
          'Log quality check outcomes clearly',
          'Confirm customer-visible status after each update',
        ],
        systemLinks: [{ label: 'Projects', path: '/projects' }],
      },
      {
        slug: 'blueprint-revision-loop',
        title: 'Blueprint and Costing Revision Loop',
        summary: 'How blueprint approval and revisions govern project progression.',
        roles: BLUEPRINT_HELP_ROLES,
        body: [
          'Blueprint and costing are reviewed as paired components and may go through multiple revision cycles before final approval.',
          'Projects should not advance to payment planning until both technical drawing and costing decisions are resolved.',
          'Revision requests should include clear context to minimize iteration delays and prevent inconsistent implementation assumptions.',
        ],
        checklist: [
          'Confirm both blueprint and costing status',
          'Attach clear revision rationale',
          'Re-validate customer approval before payment planning',
        ],
        systemLinks: [
          { label: 'Projects', path: '/projects' },
          { label: 'Visit Reports', path: '/visit-reports' },
        ],
      },
      {
        slug: 'fabrication-gates-and-payments',
        title: 'Fabrication Gates and Payment Dependencies',
        summary: 'Why some fabrication transitions require verified payment stages first.',
        roles: PROJECT_HELP_ROLES,
        body: [
          'Fabrication movement is sequential and guarded; not all statuses can be advanced if stage-payment prerequisites are unmet.',
          'Quality check and later steps are especially sensitive to payment verification rules in mixed installment plans.',
          'If progression appears blocked, review payment stage status before investigating fabrication update permissions.',
        ],
        checklist: [
          'Check installment stage verification states',
          'Confirm current fabrication step is valid next transition',
          'Coordinate with cashier/admin for blocked transitions',
        ],
        systemLinks: [
          { label: 'Projects', path: '/projects' },
          { label: 'Payments', path: '/payments' },
        ],
      },
    ],
  },
  {
    slug: 'payments',
    title: 'Payments',
    description: 'Rules for staged payments and cashier verification.',
    roles: PAYMENT_HELP_ROLES,
    articles: [
      {
        slug: 'customer-payments',
        title: 'Payment Checkout and Verification',
        summary: 'How PayMongo checkout, cash requests, and stage verification move through the system.',
        roles: PAYMENT_HELP_ROLES,
        keywords: ['paymongo', 'cash intent', 'invoice', 'stage payment', 'verification'],
        body: [
          'Eligible payment stages support PayMongo QR checkout and cash payment requests depending on the customer workflow.',
          'Cash intent requests move to pending verification queues so cashier review is auditable.',
          'Payment stage progression updates project visibility and financial reporting.',
        ],
        checklist: [
          'Confirm the correct payment stage before acting',
          'Use PayMongo checkout or request cash payment for the correct stage',
          'Monitor verification status in the payment timeline',
        ],
        systemLinks: [{ label: 'Payments', path: '/payments' }],
      },
      {
        slug: 'cashier-verification',
        title: 'Cashier Verification Queue',
        summary: 'Operational process for received payment records and cash collection checks.',
        roles: [Role.CASHIER, Role.ADMIN],
        keywords: ['cashier queue', 'payment record review', 'decline payment', 'verify payment'],
        body: [
          'Use Cashier Queue for received PayMongo payment records and cash verification decisions.',
          'Maintain strict decision discipline because approvals and rejections trigger customer notifications.',
          'Coordinate discrepancies with admin and document outcomes in the action context.',
        ],
        checklist: [
          'Validate amount and stage',
          'Approve or reject with clear reason',
          'Record discrepancy details when needed',
        ],
        systemLinks: [
          { label: 'Cashier Queue', path: '/payments?tab=cashier-queue' },
          { label: 'Cash Flow', path: '/cash' },
        ],
      },

      {
        slug: 'payment-stage-status-reference',
        title: 'Payment Stage Status Reference',
        summary: 'Interpret pending, awaiting cashier verification, verified, and declined outcomes.',
        roles: PAYMENT_HELP_ROLES,
        keywords: ['awaiting cashier verification', 'verified payment', 'declined payment', 'payment status'],
        body: [
          'Each payment stage follows strict status transitions that define what the current role can do next.',
          'Declined payment records require the customer to try payment again or coordinate the issue with staff.',
          'Verified stages can activate downstream project/fabrication transitions depending on plan and gate configuration.',
        ],
        checklist: [
          'Use the latest stage status before retrying payment',
          'Capture clear notes for any decline decision',
          'Monitor next-stage activation after verification',
        ],
        systemLinks: [
          { label: 'Payments', path: '/payments' },
          { label: 'Cashier Queue', path: '/payments?tab=cashier-queue' },
        ],
      },
      {
        slug: 'cash-collection-and-reconciliation',
        title: 'Cash Collection and Reconciliation',
        summary: 'Internal process for turnover, receiving, and discrepancy handling.',
        roles: CASH_COLLECTION_HELP_ROLES,
        keywords: ['cash collection', 'cash reconciliation', 'cash discrepancy'],
        body: [
          'Cash collection workflow tracks turnover from field/sales handling into cashier receipt and reconciliation steps.',
          'Discrepancy events should be recorded promptly with resolution notes for financial traceability.',
          'Treat reconciliation mismatches as process signals and resolve before end-of-cycle reporting cutoffs.',
        ],
        checklist: [
          'Record turnover details accurately',
          'Confirm received totals against expected',
          'Document and resolve discrepancies with context',
        ],
        systemLinks: [{ label: 'Cash Flow', path: '/cash' }],
      },
    ],
  },
  {
    slug: 'operations-admin',
    title: 'Operations and Reporting',
    description: 'Role-restricted controls for schedules, reporting, and platform governance.',
    roles: OPERATIONS_HELP_ROLES,
    articles: [
      {
        slug: 'customer-reviews-management',
        title: 'Customer Reviews Management',
        summary: 'View and manage customer feedback for completed projects.',
        roles: [Role.ADMIN],
        body: [
          'The Reviews page (located in the Administration sidebar) centralizes all feedback submitted by customers after project completion.',
          'Use the integrated search functionality to track ratings and comments referencing specific projects or clients.',
          'Review comments help identify trends in the fabrication and installation phases.',
        ],
        checklist: [
          'Regularly monitor new reviews',
          'Search for specific projects to review feedback',
        ],
        systemLinks: [{ label: 'Reviews', path: '/admin/reviews' }],
      },
      {
        slug: 'system-settings',
        title: 'System Settings and Content Controls',
        summary: 'Manage config-based behavior and platform-level options.',
        roles: [Role.ADMIN],
        body: [
          'Settings centralize operational toggles and system behavior values.',
          'Config-backed pages like Help can be maintained without redeploying frontend code.',
          'Use controlled updates and clear descriptions for each config key.',
        ],
        checklist: [
          'Review impact before saving config changes',
          'Use descriptive key descriptions',
          'Coordinate high-impact updates with operations',
        ],
        systemLinks: [{ label: 'Settings', path: '/settings' }],
      },
      {
        slug: 'slot-management',
        title: 'Slot Management and Calendar Governance',
        summary: 'Handle availability, holidays, and blocked schedules.',
        roles: SLOT_CONTROL_ROLES,
        body: [
          'Slot Management controls open and blocked booking windows.',
          'Use this carefully during holidays, high volume periods, and maintenance windows.',
          'Coordinate changes with agents and customer-facing announcements.',
        ],
        checklist: [
          'Confirm intended effective date',
          'Review affected bookings',
          'Publish guidance to affected teams',
        ],
        systemLinks: [{ label: 'Slot Management', path: '/slot-management' }],
      },
      {
        slug: 'user-role-governance',
        title: 'User and Role Governance',
        summary: 'Admin process for account lifecycle and role assignments.',
        roles: [Role.ADMIN],
        body: [
          'Manage Accounts is the authoritative panel for staff and customer account administration.',
          'Assign roles carefully to avoid accidental exposure of restricted modules.',
          'Use principle-of-least-privilege for operational safety and audit quality.',
        ],
        checklist: [
          'Validate user identity before role updates',
          'Assign minimum required roles',
          'Review high-privilege accounts regularly',
        ],
        systemLinks: [{ label: 'Manage Accounts', path: '/users' }],
      },
      {
        slug: 'maintenance-and-holiday-controls',
        title: 'Maintenance and Holiday Controls',
        summary: 'How operational blackout periods affect customer and staff workflows.',
        roles: SLOT_CONTROL_ROLES,
        body: [
          'Maintenance and holiday configuration influence slot availability, request timing, and operational expectations.',
          'Changes should be announced before effectivity to minimize appointment friction and support escalations.',
          'Always verify whether blocked dates or maintenance windows explain workflow constraints before debugging logic.',
        ],
        checklist: [
          'Confirm maintenance mode state',
          'Check configured holiday calendars',
          'Communicate impact to affected teams/users',
        ],
        systemLinks: [
          { label: 'Settings', path: '/settings' },
          { label: 'Slot Management', path: '/slot-management' },
        ],
      },
      {
        slug: 'reports-and-audit-readiness',
        title: 'Reports and Audit Readiness',
        summary: 'Use reporting and audit traces to validate operations and exceptions.',
        roles: REPORTING_HELP_ROLES,
        body: [
          'Operational reporting should align with verified payments, cash handling, and status transitions across the system.',
          'Cashiers should use reports together with queue history to validate daily reconciliation, while admins can combine reports with audit and timeline evidence for disputes.',
          'Use role-restricted report views responsibly and avoid exporting stale snapshots for official reconciliations.',
        ],
        checklist: [
          'Cross-check report window and filters',
          'Validate status timelines before escalation',
          'Reference audit notes in exception summaries',
        ],
        systemLinks: [{ label: 'Reports', path: '/reports' }],
      },
    ],
  },
  {
    slug: 'support-and-troubleshooting',
    title: 'Support and Troubleshooting',
    description: 'Issue triage playbooks for common blockers across customer and internal workflows.',
    roles: ALL_ROLES,
    articles: [
      {
        slug: 'common-blockers',
        title: 'Common Blockers and Quick Fixes',
        summary: 'Fast triage for access, status, and workflow gate issues.',
        roles: ALL_ROLES,
        keywords: ['blocked action', 'cannot proceed', 'forbidden', 'status blocked'],
        body: [
          'Most blockers are caused by unmet prerequisites, stale status assumptions, or role/ownership restrictions.',
          'Before escalating, verify status, role permissions, and required prior actions for the active workflow stage.',
          'Use timeline and queue context to identify whether the issue is waiting on another role action.',
        ],
        checklist: [
          'Check role and ownership eligibility',
          'Check current status and allowed transitions',
          'Check pending queue decisions and dependencies',
        ],
        systemLinks: [
          { label: 'Notifications', path: '/notifications' },
          { label: 'Dashboard', path: '/dashboard' },
        ],
      },
      {
        slug: 'escalation-playbook',
        title: 'Escalation Playbook',
        summary: 'How to escalate with enough context for fast resolution.',
        roles: ALL_ROLES,
        keywords: ['support escalation', 'issue report', 'ticket context', 'troubleshoot'],
        body: [
          'Escalations should include route/page context, current status, expected action, and observed blocking behavior.',
          'Attach relevant IDs and timestamps from the visible timeline to speed backend and operations investigation.',
          'Avoid duplicate tickets by checking active notifications and role queues before raising a new escalation.',
        ],
        checklist: [
          'Capture module, record ID, and status',
          'Document expected vs actual behavior clearly',
          'Include timeline evidence and related queue context',
        ],
        systemLinks: [{ label: 'Help Center', path: '/help' }],
      },
    ],
  },
];

const CUSTOMER_CATEGORY_SLUGS = new Set([
  'getting-started',
  'appointments-visits',
  'projects-fabrication',
  'payments',
  'support-and-troubleshooting',
]);

const INTERNAL_CATEGORY_SLUGS = new Set([
  'appointments-visits',
  'projects-fabrication',
  'payments',
  'operations-admin',
  'support-and-troubleshooting',
]);

function parseHelpValue(value: unknown): HelpContent {
  if (!value || typeof value !== 'object') return FALLBACK_HELP;

  const maybe = value as Partial<HelpContent> & { content?: string };

  const fromLegacyContent = typeof maybe.content === 'string'
    ? maybe.content
        .split('\n\n')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => {
          const [heading, ...rest] = chunk.split('\n');
          return {
            heading: heading || 'Section',
            body: rest.join('\n').trim(),
          };
        })
    : [];

  const normalizedSections = Array.isArray(maybe.sections)
    ? maybe.sections
        .map((section) => ({
          heading: typeof section?.heading === 'string' ? section.heading : '',
          body: typeof section?.body === 'string' ? section.body : '',
        }))
        .filter((section) => section.heading.trim() || section.body.trim())
    : fromLegacyContent;

  const roleSections: HelpContent['roleSections'] = {};
  for (const role of Object.values(Role)) {
    const roleChunks = maybe.roleSections?.[role];
    if (!Array.isArray(roleChunks)) continue;
    const normalized = roleChunks
      .map((section) => ({
        heading: typeof section?.heading === 'string' ? section.heading : '',
        body: typeof section?.body === 'string' ? section.body : '',
      }))
      .filter((section) => section.heading.trim() || section.body.trim());
    if (normalized.length > 0) roleSections[role] = normalized;
  }

  return {
    title: typeof maybe.title === 'string' && maybe.title.trim() ? maybe.title : FALLBACK_HELP.title,
    subtitle: typeof maybe.subtitle === 'string' ? maybe.subtitle : FALLBACK_HELP.subtitle,
    sections: normalizedSections.length > 0 ? normalizedSections : FALLBACK_HELP.sections,
    roleSections,
  };
}

function roleLabel(role: Role) {
  return role.replace(/_/g, ' ');
}

function canRoleSee(targetRoles: Role[] | undefined, userRoles: Role[]) {
  if (!targetRoles || targetRoles.length === 0) return true;
  return userRoles.some((role) => targetRoles.includes(role));
}

function getVisibleSystemLinks(systemLinks: SystemLink[] | undefined, userRoles: Role[]) {
  if (!systemLinks || systemLinks.length === 0) return undefined;
  const visibleLinks = systemLinks.filter((link) => canAccessPath(link.path, userRoles));
  return visibleLinks.length > 0 ? visibleLinks : undefined;
}

function getVisibleKnowledgeBase(isCustomerView: boolean, userRoles: Role[]) {
  const allowed = isCustomerView ? CUSTOMER_CATEGORY_SLUGS : INTERNAL_CATEGORY_SLUGS;
  return KNOWLEDGE_BASE
    .filter((category) => allowed.has(category.slug))
    .filter((category) => canRoleSee(category.roles, userRoles))
    .map((category) => ({
      ...category,
      articles: category.articles
        .filter((article) => canRoleSee(article.roles, userRoles))
        .map((article) => ({
          ...article,
          systemLinks: getVisibleSystemLinks(article.systemLinks, userRoles),
        })),
    }))
    .filter((category) => category.articles.length > 0);
}

function paragraphAnchorId(index: number) {
  return `point-${index + 1}`;
}

function paragraphAnchorTitle(text: string, index: number) {
  const normalized = text.trim();
  if (!normalized) return `Point ${index + 1}`;
  if (normalized.length <= 48) return normalized;
  return `${normalized.slice(0, 48)}...`;
}

function getArticleToc(article: HelpArticle) {
  const items: Array<{ id: string; title: string }> = [{ id: 'overview', title: 'Overview' }];
  article.body.forEach((block, textIdx) => {
    items.push({
      id: paragraphAnchorId(textIdx),
      title: paragraphAnchorTitle(block, textIdx),
    });
  });

  if (article.checklist && article.checklist.length > 0) {
    items.push({ id: 'checklist', title: 'Checklist' });
  }
  if (article.systemLinks && article.systemLinks.length > 0) {
    items.push({ id: 'system-links', title: 'Open in System' });
  }

  return items;
}

const SEARCH_SYNONYMS: Record<string, string[]> = {
  account: ['account', 'accounts', 'profile', 'login', 'password', 'security', 'session', 'access', 'recovery'],

  payment: ['payment', 'payments', 'invoice', 'paymongo', 'verify', 'verified', 'declined'],
  cashier: ['cashier', 'queue', 'verification', 'payment review'],
  booking: ['booking', 'book', 'appointment', 'schedule', 'reschedule', 'visit'],
  appointment: ['appointment', 'appointments', 'booking', 'visit', 'reschedule', 'no-show'],
  project: ['project', 'projects', 'blueprint', 'fabrication', 'milestone'],
  troubleshooting: ['troubleshooting', 'troubleshoot', 'issue', 'error', 'fix', 'support'],
  help: ['help', 'guide', 'faq', 'support', 'troubleshoot'],
};

const CUSTOMER_QUICK_TOPICS: QuickTopic[] = [
  { label: 'Account', query: 'account' },
  { label: 'Booking', query: 'booking' },
  { label: 'Payments', query: 'payment' },

  { label: 'Projects', query: 'project' },
  { label: 'Troubleshooting', query: 'troubleshooting' },
];

const INTERNAL_QUICK_TOPICS: QuickTopic[] = [
  { label: 'Account', query: 'account' },
  { label: 'Appointment Queue', query: 'appointment queue' },
  { label: 'Payments', query: 'cashier payment verification' },

  { label: 'Projects', query: 'project blueprint fabrication' },
  { label: 'Troubleshooting', query: 'troubleshooting' },
];

function expandSearchTerms(query: string) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const expanded = new Set<string>(tokens);
  for (const token of tokens) {
    if (SEARCH_SYNONYMS[token]) {
      for (const synonym of SEARCH_SYNONYMS[token]) {
        expanded.add(synonym.toLowerCase());
      }
    }
  }

  return Array.from(expanded);
}

function scoreMatch(haystack: string, terms: string[]) {
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (haystack.includes(term)) score += 1;
    if (haystack.includes(` ${term} `)) score += 1;
  }
  return score;
}

function getSearchMatches(query: string, visibleKnowledgeBase: HelpCategory[]): SearchMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  const searchTerms = expandSearchTerms(normalizedQuery);
  const flattened: SearchMatch[] = [];
  const seen = new Set<string>();

  for (const category of visibleKnowledgeBase) {
    const categoryHaystack = [category.title, category.description, category.slug].join(' ').toLowerCase();
    const categoryScore = scoreMatch(categoryHaystack, searchTerms);

    for (const article of category.articles) {
      const haystack = [
        category.title,
        category.description,
        category.slug,
        article.title,
        article.summary,
        article.slug,
        ...(article.keywords || []),
        ...(article.systemLinks?.map((link) => `${link.label} ${link.path}`) || []),
        ...article.body,
        ...(article.checklist || []),
      ]
        .join(' ')
        .toLowerCase();

      const articleScore = scoreMatch(haystack, searchTerms);
      const totalScore = articleScore + categoryScore;
      if (totalScore <= 0) continue;

      const key = `${category.slug}:${article.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      flattened.push({ category, article, score: totalScore });
    }
  }

  return flattened.sort((a, b) => b.score - a.score);
}

function getSectionIcon(heading: string) {
  const normalized = heading.toLowerCase();
  if (normalized.includes('payment')) return CreditCard;
  if (normalized.includes('book') || normalized.includes('appointment') || normalized.includes('visit')) return CalendarCheck;
  if (normalized.includes('project') || normalized.includes('fabrication')) return FolderOpen;
  if (normalized.includes('support') || normalized.includes('troubleshoot') || normalized.includes('help')) return HelpCircle;
  if (normalized.includes('next') || normalized.includes('step')) return ChevronRight;
  return BookOpen;
}

function getCategoryVisual(slug: string) {
  const visualMap: Record<string, { icon: ElementType; accent: string; glow: string }> = {
    'getting-started': { icon: BookOpen, accent: 'text-sky-300', glow: 'bg-sky-500/15 border-sky-400/25' },
    'appointments-visits': { icon: CalendarCheck, accent: 'text-emerald-300', glow: 'bg-emerald-500/15 border-emerald-400/25' },
    'projects-fabrication': { icon: FolderOpen, accent: 'text-violet-300', glow: 'bg-violet-500/15 border-violet-400/25' },
    payments: { icon: CreditCard, accent: 'text-amber-300', glow: 'bg-amber-500/15 border-amber-400/25' },
    'operations-admin': { icon: Settings, accent: 'text-cyan-300', glow: 'bg-cyan-500/15 border-cyan-400/25' },
    'support-and-troubleshooting': { icon: HelpCircle, accent: 'text-rose-300', glow: 'bg-rose-500/15 border-rose-400/25' },
  };

  return visualMap[slug] || { icon: Wrench, accent: 'text-blue-300', glow: 'bg-blue-500/15 border-blue-400/25' };
}

function getPopularArticles(categories: HelpCategory[]) {
  return categories
    .flatMap((category) => category.articles.map((article) => ({ category, article })))
    .slice(0, 6);
}

function HelpCategoryRoute({ categories }: { categories: HelpCategory[] }) {
  const { categorySlug } = useParams();
  const category = categories.find((item) => item.slug === categorySlug);

  if (!category) {
    return <Navigate to="/help" replace />;
  }

  const visual = getCategoryVisual(category.slug);
  const IconComp = visual.icon;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[1.4rem] border-[color:var(--color-border)]/60 bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.64))]">
        <CardHeader className="space-y-4 p-6">
          <Link to="/help" className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-[var(--text-metal-muted-color)] hover:text-[var(--color-card-foreground)]">
            Help Center <ChevronRight className="h-3.5 w-3.5" /> {category.title}
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${visual.glow}`}>
                <IconComp className={`h-7 w-7 ${visual.accent}`} />
              </div>
              <div>
                <CardTitle className="text-2xl text-[var(--color-card-foreground)]">{category.title}</CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-metal-color)]">
                  {category.description}
                </CardDescription>
              </div>
            </div>
            <Badge className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-100">
              {category.articles.length} articles
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {category.articles.map((article) => (
          <Link
            key={article.slug}
            to={`/help/${category.slug}/${article.slug}`}
            className="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/75 p-5 transition-all hover:-translate-y-0.5 hover:border-blue-400/40 hover:shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
          >
            <div>
              <h3 className="text-base font-semibold text-[var(--color-card-foreground)]">{article.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-metal-color)]">{article.summary}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-300">
              Read article <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function HelpArticleRoute({ categories }: { categories: HelpCategory[] }) {
  const { categorySlug, articleSlug } = useParams();
  const location = useLocation();
  const category = categories.find((item) => item.slug === categorySlug);
  const article = category?.articles.find((item) => item.slug === articleSlug);

  if (!category || !article) {
    return <Navigate to="/help" replace />;
  }

  const tocItems = useMemo(() => getArticleToc(article), [article]);

  useEffect(() => {
    if (!location.hash) return;
    const hashTarget = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(hashTarget);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [article.slug, location.hash]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="rounded-[1.4rem] border-[color:var(--color-border)]/60">
        <CardHeader className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-metal-muted-color)]">
            <Link to="/help" className="hover:text-[var(--color-card-foreground)]">Help</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/help/${category.slug}`} className="hover:text-[var(--color-card-foreground)]">
              {category.title}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[var(--color-card-foreground)]">{article.title}</span>
          </div>

          <div className="max-w-3xl">
            <CardTitle className="text-2xl text-[var(--color-card-foreground)]">{article.title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-relaxed text-[var(--text-metal-color)]">{article.summary}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <div id="overview" className="space-y-4 scroll-mt-28">
            {article.body.map((block, idx) => (
              <div key={`${article.slug}-p-${idx}`} id={paragraphAnchorId(idx)} className="scroll-mt-28">
                <p className="text-[15px] leading-7 text-[var(--text-metal-color)]">{block}</p>
              </div>
            ))}
          </div>

          {article.checklist && article.checklist.length > 0 && (
            <div id="checklist" className="scroll-mt-28 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">Checklist</p>
              <div className="mt-3 grid gap-2">
                {article.checklist.map((item, idx) => (
                  <p key={`${article.slug}-c-${idx}`} className="text-sm text-[var(--text-metal-color)]">- {item}</p>
                ))}
              </div>
            </div>
          )}

          {article.systemLinks && article.systemLinks.length > 0 && (
            <div id="system-links" className="scroll-mt-28 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-300">Open in system</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {article.systemLinks.map((item) => (
                  <Button key={`${article.slug}-${item.path}`} size="sm" variant="outline" className="rounded-lg" asChild>
                    <Link to={item.path}>{item.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <aside className="space-y-3 xl:sticky xl:top-24 xl:h-fit">
        <Card className="rounded-2xl border-[color:var(--color-border)]/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[var(--color-card-foreground)]">On this page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {tocItems.map((item) => (
              <a
                key={`${article.slug}-toc-${item.id}`}
                href={`#${item.id}`}
                className="block rounded-lg px-3 py-2 text-xs text-[var(--text-metal-color)] transition-colors hover:bg-[color:var(--color-muted)]/45 hover:text-[var(--color-card-foreground)]"
              >
                {item.title}
              </a>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/70">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">Topic</p>
            <Link to={`/help/${category.slug}`} className="mt-2 flex items-center justify-between rounded-lg border border-[color:var(--color-border)]/50 p-3 text-sm font-semibold text-[var(--color-card-foreground)] hover:bg-[color:var(--color-muted)]/35">
              {category.title}
              <ChevronRight className="h-4 w-4 text-[var(--text-metal-muted-color)]" />
            </Link>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export function HelpCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRoles = user?.roles || [];
  const isCustomerView = userRoles.includes(Role.CUSTOMER);
  const isAdmin = Boolean(userRoles.includes(Role.ADMIN));
  const isInternalView = !isCustomerView;
  const { data: configs, isLoading } = useConfigs();
  const updateConfig = useUpdateConfig();

  const visibleKnowledgeBase = useMemo(
    () => getVisibleKnowledgeBase(isCustomerView, userRoles),
    [isCustomerView, userRoles],
  );

  const helpConfig = useMemo(() => configs?.find((cfg) => cfg.key === 'help_center_content'), [configs]);
  const parsed = useMemo(() => parseHelpValue(helpConfig?.value), [helpConfig?.value]);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(parsed.title);
  const [subtitle, setSubtitle] = useState(parsed.subtitle);
  const [sections, setSections] = useState(parsed.sections);
  const [roleSections, setRoleSections] = useState<HelpContent['roleSections']>(parsed.roleSections || {});
  const [collapsedRoleGroups, setCollapsedRoleGroups] = useState<Partial<Record<Role, boolean>>>({});
  const [isManagedNotesOpen, setIsManagedNotesOpen] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();

  useEffect(() => {
    setSearch('');
  }, [location.pathname]);

  const viewRoleGroups = useMemo(
    () => userRoles
      .map((role) => ({ role, sections: roleSections?.[role] || [] }))
      .filter((group) => group.sections.length > 0),
    [roleSections, userRoles],
  );

  const quickTopics = useMemo(
    () => (isCustomerView ? CUSTOMER_QUICK_TOPICS : INTERNAL_QUICK_TOPICS),
    [isCustomerView],
  );

  const searchResults = useMemo(() => getSearchMatches(search, visibleKnowledgeBase), [search, visibleKnowledgeBase]);
  const popularArticles = useMemo(() => getPopularArticles(visibleKnowledgeBase), [visibleKnowledgeBase]);

  const startEdit = () => {
    setTitle(parsed.title);
    setSubtitle(parsed.subtitle);
    setSections(parsed.sections);
    setRoleSections(parsed.roleSections || {});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setTitle(parsed.title);
    setSubtitle(parsed.subtitle);
    setSections(parsed.sections);
    setRoleSections(parsed.roleSections || {});
    setIsEditing(false);
  };

  const addSection = () => {
    setSections((prev) => [...prev, { heading: 'New section', body: '' }]);
  };

  const updateSection = (index: number, key: 'heading' | 'body', value: string) => {
    setSections((prev) => prev.map((section, idx) => (idx === index ? { ...section, [key]: value } : section)));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      const nextItem = copy[nextIndex];
      if (!temp || !nextItem) return prev;
      copy[index] = nextItem;
      copy[nextIndex] = temp;
      return copy;
    });
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, idx) => idx !== index));
  };

  const upsertRoleSection = (role: Role, sectionIndex: number, key: 'heading' | 'body', value: string) => {
    setRoleSections((prev) => {
      const roleList = [...(prev?.[role] || [{ heading: '', body: '' }])];
      roleList[sectionIndex] = {
        ...(roleList[sectionIndex] || { heading: '', body: '' }),
        [key]: value,
      };
      return { ...prev, [role]: roleList };
    });
  };

  const addRoleSection = (role: Role) => {
    setRoleSections((prev) => ({
      ...prev,
      [role]: [...(prev?.[role] || []), { heading: 'Role-specific note', body: '' }],
    }));
  };

  const removeRoleSection = (role: Role, index: number) => {
    setRoleSections((prev) => {
      const next = (prev?.[role] || []).filter((_, idx) => idx !== index);
      return { ...prev, [role]: next };
    });
  };

  const moveRoleSection = (role: Role, index: number, direction: -1 | 1) => {
    setRoleSections((prev) => {
      const current = [...(prev?.[role] || [])];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return prev;
      const currentItem = current[index];
      const swapItem = current[nextIndex];
      if (!currentItem || !swapItem) return prev;
      current[index] = swapItem;
      current[nextIndex] = currentItem;
      return { ...prev, [role]: current };
    });
  };

  const toggleRoleGroup = (role: Role) => {
    setCollapsedRoleGroups((prev) => ({
      ...prev,
      [role]: !prev?.[role],
    }));
  };

  const saveHelp = async () => {
    try {
      await updateConfig.mutateAsync({
        key: 'help_center_content',
        value: {
          title: title.trim() || FALLBACK_HELP.title,
          subtitle: subtitle.trim(),
          sections: sections
            .map((section) => ({ heading: section.heading.trim(), body: section.body.trim() }))
            .filter((section) => section.heading || section.body),
          roleSections,
        },
        description: 'Help Center page content shown to authenticated users. Editable by admin.',
      });
      toast.success('Help Center content updated.');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update Help Center content.');
    }
  };

  const handleQuickTopicClick = (topic: QuickTopic) => {
    setSearch(topic.query);
    const matches = getSearchMatches(topic.query, visibleKnowledgeBase);
    const topMatch = matches[0];
    if (topMatch) {
      navigate(`/help/${topMatch.category.slug}/${topMatch.article.slug}`);
      return;
    }

    const expandedTerms = expandSearchTerms(topic.query);
    const categoryMatch = visibleKnowledgeBase.find((category) => {
      const haystack = [category.title, category.description, category.slug].join(' ').toLowerCase();
      return expandedTerms.some((term) => haystack.includes(term));
    });
    if (categoryMatch) {
      navigate(`/help/${categoryMatch.slug}`);
      return;
    }

    navigate('/help');
  };

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden rounded-[1.8rem] border-blue-400/20 bg-[radial-gradient(circle_at_50%_115%,rgba(37,99,235,0.5),transparent_35%),radial-gradient(circle_at_50%_120%,rgba(14,165,233,0.35),transparent_47%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.94))] shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.42),transparent_68%)]" />
        <CardHeader className="relative space-y-4 px-5 py-8 sm:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/30 bg-blue-500/20 shadow-[0_0_34px_rgba(59,130,246,0.35)]">
              <LifeBuoy className="h-6 w-6 text-blue-200" />
            </div>
            <CardTitle className="text-2xl text-white sm:text-3xl">
              {isCustomerView ? 'How can we help you?' : 'How can your team get help today?'}
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
              {isCustomerView
                ? 'Find answers about bookings, payments, account setup, and project tracking.'
                : 'Find internal guidance for queues, approvals, controls, operations, and troubleshooting.'}
            </CardDescription>
          </div>

          <div className="mx-auto w-full max-w-3xl space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-metal-muted-color)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 rounded-full border-blue-300/30 bg-slate-950/70 pl-10 text-slate-100 shadow-[0_0_30px_rgba(59,130,246,0.28)] placeholder:text-slate-500 focus-visible:ring-blue-400"
                placeholder={
                  isCustomerView
                    ? 'Search topics like account, booking, payments...'
                    : 'Search workflows, queues, approvals, troubleshooting...'
                }
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {quickTopics.map((topic) => (
                <Button
                  key={`quick-topic-${topic.label}`}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={() => handleQuickTopicClick(topic)}
                >
                  {topic.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {search.trim() && (
        <Card className="rounded-2xl border-[color:var(--color-border)]/60">
          <CardHeader>
            <CardTitle className="text-base text-[var(--color-card-foreground)]">Search Results</CardTitle>
            <CardDescription className="text-[var(--text-metal-color)]">
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'} for "{search.trim()}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-[var(--text-metal-color)]">No matching article found. Try another keyword.</p>
            ) : (
              searchResults.slice(0, 10).map((item) => (
                <button
                  key={`${item.category.slug}-${item.article.slug}`}
                  type="button"
                  onClick={() => navigate(`/help/${item.category.slug}/${item.article.slug}`)}
                  className="w-full rounded-lg border border-[color:var(--color-border)]/60 p-3 text-left transition-colors hover:bg-[color:var(--color-muted)]/35"
                >
                  <p className="text-sm font-semibold text-[var(--color-card-foreground)]">{item.article.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">{item.category.title}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Routes>
          <Route
            index
            element={
              <div className="space-y-5">
                <section className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--color-card-foreground)]">Browse Help Topics</h2>
                      <p className="text-sm text-[var(--text-metal-color)]">
                        Choose a topic and jump straight into the article you need.
                      </p>
                    </div>
                    <Link to="/help/support-and-troubleshooting" className="hidden text-xs font-semibold text-blue-300 hover:text-blue-200 sm:inline-flex">
                      View all articles <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleKnowledgeBase.map((category) => {
                      const visual = getCategoryVisual(category.slug);
                      const IconComp = visual.icon;
                      return (
                        <Link
                          key={`map-${category.slug}`}
                          to={`/help/${category.slug}`}
                          className="group flex min-h-[150px] flex-col justify-between rounded-2xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/70 p-5 transition-all hover:-translate-y-0.5 hover:border-blue-400/40 hover:shadow-[0_22px_50px_rgba(15,23,42,0.18)]"
                        >
                          <div>
                            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border ${visual.glow}`}>
                              <IconComp className={`h-5 w-5 ${visual.accent}`} />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--color-card-foreground)]">{category.title}</h3>
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-metal-color)]">{category.description}</p>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-xs">
                            <span className="text-[var(--text-metal-muted-color)]">{category.articles.length} articles</span>
                            <ChevronRight className="h-4 w-4 text-[var(--text-metal-muted-color)] transition-transform group-hover:translate-x-0.5 group-hover:text-blue-300" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <Card className="rounded-2xl border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/70">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base text-[var(--color-card-foreground)]">Popular Articles</CardTitle>
                          <CardDescription className="text-[var(--text-metal-color)]">
                            Useful guides based on your visible help topics.
                          </CardDescription>
                        </div>
                        <BookOpen className="h-5 w-5 text-blue-300" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {popularArticles.map(({ category, article }) => (
                        <Link
                          key={`popular-${category.slug}-${article.slug}`}
                          to={`/help/${category.slug}/${article.slug}`}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)]/50 p-3 transition-colors hover:bg-[color:var(--color-muted)]/35"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--color-card-foreground)]">{article.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-metal-muted-color)]">{category.title}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-metal-muted-color)] transition-transform group-hover:translate-x-0.5 group-hover:text-blue-300" />
                        </Link>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-[color:var(--color-border)]/60 bg-[color:var(--color-card)]/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-[var(--color-card-foreground)]">Need More Help?</CardTitle>
                      <CardDescription className="text-[var(--text-metal-color)]">
                        Quick support options when an article is not enough.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      {[
                        { title: 'Live Chat', text: 'Chat with support in real time.', icon: MessageCircle, tone: 'text-sky-300 bg-sky-500/15 border-sky-400/25' },
                        { title: 'Email Support', text: 'Send your question and get a reply.', icon: Mail, tone: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/25' },
                        { title: 'Call Support', text: 'Speak with a staff member during business hours.', icon: Phone, tone: 'text-violet-300 bg-violet-500/15 border-violet-400/25' },
                      ].map((item) => {
                        const IconComp = item.icon;
                        return (
                          <div key={item.title} className="rounded-2xl border border-[color:var(--color-border)]/50 p-4 text-center">
                            <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border ${item.tone}`}>
                              <IconComp className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-semibold text-[var(--color-card-foreground)]">{item.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--text-metal-color)]">{item.text}</p>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {isAdmin && isInternalView && (
                  isLoading ? (
                    <Card className="rounded-2xl border-[color:var(--color-border)]/60">
                      <CardContent className="py-10 text-sm text-[var(--text-metal-color)]">Loading help content...</CardContent>
                    </Card>
                  ) : (
                  <Card className="rounded-2xl border-[color:var(--color-border)]/60">
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg text-[var(--color-card-foreground)]">Managed Notes</CardTitle>
                        <CardDescription className="text-[var(--text-metal-color)]">
                          Admin-only config notes. Open this section only when you need to update the help copy.
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => setIsManagedNotesOpen((prev) => !prev)}
                        >
                          {isManagedNotesOpen ? <ChevronUp className="mr-1.5 h-4 w-4" /> : <ChevronDown className="mr-1.5 h-4 w-4" />}
                          {isManagedNotesOpen ? 'Hide' : 'Show'}
                        </Button>
                        {isManagedNotesOpen && !isEditing && (
                          <Button variant="outline" size="sm" className="rounded-lg" onClick={startEdit}>
                            <Pencil className="mr-1.5 h-4 w-4" /> Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {isManagedNotesOpen && (
                    <CardContent className="space-y-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">Title</p>
                            <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">Subtitle</p>
                            <Input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="h-10 rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">General Sections</p>
                              <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={addSection}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Section
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {sections.map((section, idx) => (
                                <div key={`section-${idx}`} className="space-y-2 rounded-xl border border-[color:var(--color-border)]/60 p-3">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={section.heading}
                                      onChange={(event) => updateSection(idx, 'heading', event.target.value)}
                                      className="h-9 rounded-lg"
                                      placeholder="Section heading"
                                    />
                                    <Button type="button" size="icon" variant="ghost" onClick={() => moveSection(idx, -1)} disabled={idx === 0}>
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="icon" variant="ghost" onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1}>
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => removeSection(idx)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <Textarea
                                    value={section.body}
                                    onChange={(event) => updateSection(idx, 'body', event.target.value)}
                                    className="min-h-[88px] rounded-lg"
                                    placeholder="Section details"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">Role-specific Sections</p>
                            <div className="space-y-3">
                              {Object.values(Role).map((role) => {
                                const roleList = roleSections?.[role] || [];
                                const isCollapsed = !!collapsedRoleGroups?.[role];
                                return (
                                  <div key={role} className="space-y-2 rounded-xl border border-[color:var(--color-border)]/60 p-3">
                                    <div className="flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => toggleRoleGroup(role)}
                                        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]"
                                      >
                                        {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                                        {roleLabel(role)}
                                        <span className="rounded-full bg-[color:var(--color-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-metal-color)]">
                                          {roleList.length}
                                        </span>
                                      </button>
                                      <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => addRoleSection(role)}>
                                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                                      </Button>
                                    </div>
                                    {!isCollapsed && roleList.length === 0 ? (
                                      <p className="text-xs text-[var(--text-metal-muted-color)]">No role-specific sections.</p>
                                    ) : !isCollapsed ? (
                                      roleList.map((section, idx) => (
                                        <div key={`${role}-${idx}`} className="space-y-2 rounded-lg border border-[color:var(--color-border)]/50 p-2">
                                          <div className="flex items-center gap-2">
                                            <Input
                                              value={section.heading}
                                              onChange={(event) => upsertRoleSection(role, idx, 'heading', event.target.value)}
                                              className="h-8 rounded-md"
                                              placeholder="Heading"
                                            />
                                            <Button type="button" size="icon" variant="ghost" onClick={() => moveRoleSection(role, idx, -1)} disabled={idx === 0}>
                                              <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button type="button" size="icon" variant="ghost" onClick={() => moveRoleSection(role, idx, 1)} disabled={idx === roleList.length - 1}>
                                              <ArrowDown className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          <Textarea
                                            value={section.body}
                                            onChange={(event) => upsertRoleSection(role, idx, 'body', event.target.value)}
                                            className="min-h-[72px] rounded-md"
                                            placeholder="Role guidance"
                                          />
                                          <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => removeRoleSection(role, idx)}>
                                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                                          </Button>
                                        </div>
                                      ))
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button className="rounded-lg" onClick={saveHelp} disabled={updateConfig.isPending}>
                              <Save className="mr-1.5 h-4 w-4" />
                              {updateConfig.isPending ? 'Saving...' : 'Save Help Content'}
                            </Button>
                            <Button variant="outline" className="rounded-lg" onClick={cancelEdit}>
                              <XCircle className="mr-1.5 h-4 w-4" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {sections.map((section, idx) => {
                            const IconComp = getSectionIcon(section.heading);
                            return (
                              <div key={`${section.heading}-${idx}`} className="rounded-xl border border-[color:var(--color-border)]/60 p-4">
                                <div className="flex items-start gap-3">
                                  <div className="silver-sheen flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-[0_10px_22px_rgba(15,23,42,0.1)]">
                                    <IconComp className="h-4.5 w-4.5 text-[#33414d]" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-semibold text-[var(--color-card-foreground)]">{section.heading}</h3>
                                    {section.body && (
                                      <p className="mt-1.5 whitespace-pre-line text-sm text-[var(--text-metal-color)]">{section.body}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {viewRoleGroups.length > 0 && (
                            <div className="space-y-3 rounded-xl border border-[color:var(--color-border)]/60 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">Role-specific guidance</p>
                              {viewRoleGroups.map((group) => {
                                const isCollapsed = !!collapsedRoleGroups?.[group.role];
                                return (
                                  <div key={`view-role-${group.role}`} className="rounded-lg border border-[color:var(--color-border)]/50 p-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleRoleGroup(group.role)}
                                      className="flex w-full items-center justify-between text-left"
                                    >
                                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">
                                        {roleLabel(group.role)} guidance
                                      </span>
                                      {isCollapsed ? (
                                        <ChevronDown className="h-4 w-4 text-[var(--text-metal-color)]" />
                                      ) : (
                                        <ChevronUp className="h-4 w-4 text-[var(--text-metal-color)]" />
                                      )}
                                    </button>
                                    {!isCollapsed && (
                                      <div className="mt-2 space-y-2">
                                        {group.sections.map((section, idx) => (
                                          <div key={`role-section-${group.role}-${idx}`} className="rounded-lg border border-[color:var(--color-border)]/50 p-3">
                                            <h4 className="text-sm font-semibold text-[var(--color-card-foreground)]">{section.heading}</h4>
                                            {section.body && (
                                              <p className="mt-1 whitespace-pre-line text-sm text-[var(--text-metal-color)]">{section.body}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                    )}
                  </Card>
                  )
                )}
              </div>
            }
          />
          <Route path=":categorySlug" element={<HelpCategoryRoute categories={visibleKnowledgeBase} />} />
          <Route path=":categorySlug/:articleSlug" element={<HelpArticleRoute categories={visibleKnowledgeBase} />} />
          <Route path="*" element={<Navigate to="/help" replace />} />
        </Routes>
    </div>
  );
}
