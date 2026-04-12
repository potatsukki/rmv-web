import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  Pencil,
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
import { Separator } from '@/components/ui/separator';
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

type HelpMediaType = 'image' | 'video' | 'embed';

type HelpMedia = {
  type: HelpMediaType;
  title: string;
  url: string;
  caption?: string;
};
type HelpMediaBlock = { media: HelpMedia };
type HelpBodyBlock = string | HelpMediaBlock;
type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  roles?: Role[];
  keywords?: string[];
  body: HelpBodyBlock[];
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
      heading: 'Payments and refunds',
      body: 'Use Payments for stage payments and My Refunds for your refund request timeline.',
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
        body: 'Use Cashier Queue to verify customer payments and review refund requests.',
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
          {
            media: {
              type: 'image',
              title: 'Account Profile Page',
              url: '/help-media/account-profile.png',
              caption: 'Live screenshot of the Account Profile screen used for identity, location, and signature readiness.',
            },
          },
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
          {
            media: {
              type: 'image',
              title: 'Dashboard Navigation Snapshot',
              url: '/help-media/dashboard-overview.png',
              caption: 'Live screenshot showing sidebar groups, quick actions, and role-aware navigation context.',
            },
          },
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
        summary: 'From request to completion, including reschedules and no-shows.',
        roles: APPOINTMENT_HELP_ROLES,
        body: [
          'Customers can book their own first office consultation, while appointment agents can create that consultation on behalf of a customer.',
          {
            media: {
              type: 'image',
              title: 'Appointments Workspace Snapshot',
              url: '/help-media/appointments-overview.png',
              caption: 'Live screenshot of the Appointments workspace for lifecycle and status handling.',
            },
          },
          'Sales staff should only schedule ocular visits after consultation, not the customer’s first appointment.',
          'Status changes are visible in the appointment detail flow and reflected in notifications.',
          'Cashiers and admins can coordinate on ocular fee queues when payment proof is involved.',
        ],
        checklist: [
          'Confirm appointment details',
          'Track status transitions',
          'Handle reschedule requests promptly',
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
          {
            media: {
              type: 'image',
              title: 'Visit Reports Workspace Snapshot',
              url: '/help-media/visit-reports-overview.png',
              caption: 'Live screenshot of the Visit Reports module used by sales and engineering teams.',
            },
          },
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
          {
            media: {
              type: 'image',
              title: 'Ocular Fee Queue Snapshot',
              url: '/help-media/ocular-fee-queue.png',
              caption: 'Live screenshot of the ocular fee verification queue and status handling workflow.',
            },
          },
          'For routes that require fee verification, payment must be confirmed before dependent scheduling actions continue.',
          'Customers should ensure pinned locations are accurate to avoid incorrect fee calculations and reschedule delays.',
        ],
        checklist: [
          'Pin exact location before submitting',
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
          'Each state affects what actions remain available to customer, agent, and assigned staff in the page UI.',
          'When troubleshooting, first confirm the current status before attempting follow-up actions like payments or report submission.',
        ],
        checklist: [
          'Validate current appointment status first',
          'Use history/timeline context before escalating',
          'Coordinate no-show and reschedule decisions with assigned staff',
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
          {
            media: {
              type: 'image',
              title: 'Projects Workspace Snapshot',
              url: '/help-media/projects-overview.png',
              caption: 'Live screenshot from the Projects workspace where fabrication and milestone progress are tracked.',
            },
          },
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
    slug: 'payments-refunds',
    title: 'Payments and Refunds',
    description: 'Rules for staged payments, cashier verification, and refund tracking.',
    roles: PAYMENT_HELP_ROLES,
    articles: [
      {
        slug: 'customer-payments',
        title: 'Payment Submission and Verification',
        summary: 'How payment proof, cash intent, and stage verification move through the system.',
        roles: PAYMENT_HELP_ROLES,
        keywords: ['payment proof', 'cash intent', 'invoice', 'stage payment', 'verification'],
        body: [
          'Eligible payment stages support proof submission and cash intent requests depending on the user workflow.',
          {
            media: {
              type: 'image',
              title: 'Payments Workspace Snapshot',
              url: '/help-media/payments-overview.png',
              caption: 'Live screenshot of the Payments workspace where stage payments and statuses are reviewed.',
            },
          },
          'Cash intent requests move to pending verification queues so cashier review is auditable.',
          {
            media: {
              type: 'image',
              title: 'Cashier Queue Snapshot',
              url: '/help-media/cashier-queue.png',
              caption: 'Live screenshot of cashier verification workflow for proof and queue decisions.',
            },
          },
          'Payment stage progression updates project visibility and financial reporting.',
        ],
        checklist: [
          'Confirm the correct payment stage before acting',
          'Submit proof or cash intent with complete details',
          'Monitor verification status in the payment timeline',
        ],
        systemLinks: [{ label: 'Payments', path: '/payments' }],
      },
      {
        slug: 'cashier-verification',
        title: 'Cashier Verification Queue',
        summary: 'Operational process for pending proofs and cash collection checks.',
        roles: [Role.CASHIER, Role.ADMIN],
        keywords: ['cashier queue', 'proof review', 'decline payment', 'verify payment'],
        body: [
          'Use Cashier Queue for pending payment proofs and cash verification decisions.',
          {
            media: {
              type: 'image',
              title: 'Cashier Verification Queue Snapshot',
              url: '/help-media/cashier-queue.png',
              caption: 'Live screenshot of cashier verification where proof submissions are reviewed and actioned.',
            },
          },
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
        slug: 'refunds',
        title: 'Refund Request Workflow',
        summary: 'How refund requests are filed, reviewed, updated, and resolved.',
        roles: [Role.CUSTOMER, Role.CASHIER, Role.ADMIN],
        keywords: ['refund', 'refund request', 'cancel refund', 'denied refund', 'approved refund'],
        body: [
          'Refund requests should include complete account details, reason context, and the correct refund method.',
          {
            media: {
              type: 'image',
              title: 'Refund Requests Queue Snapshot',
              url: '/help-media/refund-requests-queue.png',
              caption: 'Live screenshot of refund queue filtering and status review in the Refund Requests workspace.',
            },
          },
          'Cashiers and admins review queue items and progress statuses until closure.',
          'Use timeline details for transparent history and audit readiness.',
        ],
        checklist: [
          'Ensure complete account and refund details',
          'Track the current refund status before following up',
          'Document the final disposition in the queue workflow',
        ],
        systemLinks: [
          { label: 'Payments Workspace', path: '/payments' },
          { label: 'Refunds Tab', path: '/payments' },
        ],
      },
      {
        slug: 'payment-stage-status-reference',
        title: 'Payment Stage Status Reference',
        summary: 'Interpret pending, proof submitted, verified, and declined outcomes.',
        roles: PAYMENT_HELP_ROLES,
        keywords: ['proof submitted', 'verified payment', 'declined payment', 'payment status'],
        body: [
          'Each payment stage follows strict status transitions that define what the current role can do next.',
          'Declined proofs require corrected re-submission and should include clear decline reasons for faster recovery.',
          'Verified stages can activate downstream project/fabrication transitions depending on plan and gate configuration.',
        ],
        checklist: [
          'Use the latest stage status before re-submitting proof',
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
        slug: 'system-settings',
        title: 'System Settings and Content Controls',
        summary: 'Manage config-based behavior and platform-level options.',
        roles: [Role.ADMIN],
        body: [
          'Settings centralize operational toggles and system behavior values.',
          {
            media: {
              type: 'image',
              title: 'System Settings Snapshot',
              url: '/help-media/settings-overview.png',
              caption: 'Live screenshot of admin settings used for platform-level controls and governance.',
            },
          },
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
          {
            media: {
              type: 'image',
              title: 'Slot Management Snapshot',
              url: '/help-media/slot-management-overview.png',
              caption: 'Live screenshot of slot controls for calendar governance, blocked windows, and availability rules.',
            },
          },
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
          {
            media: {
              type: 'image',
              title: 'Manage Accounts Snapshot',
              url: '/help-media/users-overview.png',
              caption: 'Live screenshot of user and role governance controls in the Manage Accounts module.',
            },
          },
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
          'Operational reporting should align with verified payments, refunds, cash handling, and status transitions across the system.',
          {
            media: {
              type: 'image',
              title: 'Reports Workspace Snapshot',
              url: '/help-media/reports-overview.png',
              caption: 'Live screenshot of reports and analytics views used for reconciliation and audit readiness.',
            },
          },
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
  'payments-refunds',
  'support-and-troubleshooting',
]);

const INTERNAL_CATEGORY_SLUGS = new Set([
  'appointments-visits',
  'projects-fabrication',
  'payments-refunds',
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

function mediaAnchorId(index: number) {
  return `media-${index + 1}`;
}

function getArticleToc(article: HelpArticle) {
  const items: Array<{ id: string; title: string }> = [{ id: 'overview', title: 'Overview' }];
  let textIdx = 0;
  let mediaIdx = 0;
  article.body.forEach((block) => {
    if (typeof block === 'string') {
      items.push({
        id: paragraphAnchorId(textIdx),
        title: paragraphAnchorTitle(block, textIdx),
      });
      textIdx += 1;
      return;
    }

    items.push({
      id: mediaAnchorId(mediaIdx),
      title: block.media.title,
    });
    mediaIdx += 1;
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
  refund: ['refund', 'refunds', 'cancel', 'denied', 'approved', 'reversal'],
  payment: ['payment', 'payments', 'invoice', 'proof', 'verify', 'verified', 'declined'],
  cashier: ['cashier', 'queue', 'verification', 'proof review'],
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
  { label: 'Refunds', query: 'refund' },
  { label: 'Projects', query: 'project' },
  { label: 'Troubleshooting', query: 'troubleshooting' },
];

const INTERNAL_QUICK_TOPICS: QuickTopic[] = [
  { label: 'Account', query: 'account' },
  { label: 'Appointment Queue', query: 'appointment queue' },
  { label: 'Payments', query: 'cashier payment verification' },
  { label: 'Refunds', query: 'refund' },
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
        ...article.body.map((block) => {
          if (typeof block === 'string') return block;
          return [block.media.title, block.media.caption || '', block.media.url].join(' ');
        }),
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
  if (normalized.includes('payment') || normalized.includes('refund')) return CreditCard;
  if (normalized.includes('book') || normalized.includes('appointment') || normalized.includes('visit')) return CalendarCheck;
  if (normalized.includes('project') || normalized.includes('fabrication')) return FolderOpen;
  if (normalized.includes('support') || normalized.includes('troubleshoot') || normalized.includes('help')) return HelpCircle;
  if (normalized.includes('next') || normalized.includes('step')) return ChevronRight;
  return BookOpen;
}

function resolveSafeExternalUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveEmbedUrl(raw: string): string | null {
  const safe = resolveSafeExternalUrl(raw);
  if (!safe) return null;
  const parsed = new URL(safe);
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname.startsWith('/embed/')) return parsed.toString();
    const id = parsed.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  if (host === 'loom.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    const id = segments[1];
    return id ? `https://www.loom.com/embed/${id}` : null;
  }

  return null;
}

function HelpCategoryRoute({ categories }: { categories: HelpCategory[] }) {
  const { categorySlug } = useParams();
  const category = categories.find((item) => item.slug === categorySlug);

  if (!category) {
    return <Navigate to="/help" replace />;
  }

  return (
    <Card className="rounded-2xl border-[color:var(--color-border)]/60">
      <CardHeader>
        <CardTitle className="text-lg text-[var(--color-card-foreground)]">{category.title}</CardTitle>
        <CardDescription className="text-[var(--text-metal-color)]">{category.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {category.articles.map((article) => (
          <Link
            key={article.slug}
            to={`/help/${category.slug}/${article.slug}`}
            className="group block rounded-xl border border-[color:var(--color-border)]/60 p-4 transition-colors hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]/35"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-card-foreground)]">{article.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-metal-color)]">{article.summary}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-metal-muted-color)] transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
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
    <Card className="rounded-2xl border-[color:var(--color-border)]/60">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-metal-muted-color)]">
          <Link to="/help" className="hover:text-[var(--color-card-foreground)]">Help</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/help/${category.slug}`} className="hover:text-[var(--color-card-foreground)]">
            {category.title}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[var(--color-card-foreground)]">{article.title}</span>
        </div>

        <div>
          <CardTitle className="text-lg text-[var(--color-card-foreground)]">{article.title}</CardTitle>
          <CardDescription className="mt-1 text-[var(--text-metal-color)]">{article.summary}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-[color:var(--color-border)]/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">On this page</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tocItems.map((item) => (
              <a
                key={`${article.slug}-toc-${item.id}`}
                href={`#${item.id}`}
                className="rounded-full border border-[color:var(--color-border)]/60 px-3 py-1 text-xs text-[var(--text-metal-color)] transition-colors hover:bg-[color:var(--color-muted)]/45"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>

        <div id="overview" className="space-y-3 scroll-mt-28">
          {(() => {
            let textIdx = 0;
            let mediaIdx = 0;
            return article.body.map((block, idx) => {
              if (typeof block === 'string') {
                const anchor = paragraphAnchorId(textIdx);
                textIdx += 1;
                return (
                  <div key={`${article.slug}-p-${idx}`} id={anchor} className="scroll-mt-28">
                    <p className="text-sm leading-relaxed text-[var(--text-metal-color)]">{block}</p>
                  </div>
                );
              }

              const media = block.media;
              const anchor = mediaAnchorId(mediaIdx);
              mediaIdx += 1;

              const mediaUrl = resolveSafeExternalUrl(media.url);
              const embedUrl = media.type === 'embed' ? resolveEmbedUrl(media.url) : null;

              return (
                <div key={`${article.slug}-m-${idx}`} id={anchor} className="scroll-mt-28 rounded-xl border border-[color:var(--color-border)]/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">{media.title}</p>
                  <div className="mt-2 overflow-hidden rounded-lg border border-[color:var(--color-border)]/60 bg-black/5">
                    {media.type === 'image' && mediaUrl && (
                      <img src={mediaUrl} alt={media.title} className="w-full h-auto object-cover" loading="lazy" />
                    )}

                    {media.type === 'video' && mediaUrl && (
                      <video controls className="w-full h-auto" preload="metadata">
                        <source src={mediaUrl} />
                        Your browser does not support this video format.
                      </video>
                    )}

                    {media.type === 'embed' && embedUrl && (
                      <iframe
                        title={media.title}
                        src={embedUrl}
                        className="w-full aspect-video"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}

                    {((media.type === 'embed' && !embedUrl) || (media.type !== 'embed' && !mediaUrl)) && (
                      <div className="p-4 text-sm text-[var(--text-metal-color)]">
                        Media preview unavailable. Please verify the media URL.
                      </div>
                    )}
                  </div>
                  {media.caption && (
                    <p className="mt-2 text-xs text-[var(--text-metal-muted-color)]">{media.caption}</p>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {article.checklist && article.checklist.length > 0 && (
          <div id="checklist" className="scroll-mt-28 rounded-xl border border-[color:var(--color-border)]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">Checklist</p>
            <div className="mt-2 space-y-1.5">
              {article.checklist.map((item, idx) => (
                <p key={`${article.slug}-c-${idx}`} className="text-sm text-[var(--text-metal-color)]">- {item}</p>
              ))}
            </div>
          </div>
        )}

        {article.systemLinks && article.systemLinks.length > 0 && (
          <div id="system-links" className="scroll-mt-28 rounded-xl border border-[color:var(--color-border)]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-metal-muted-color)]">Open in system</p>
            <div className="mt-2 flex flex-wrap gap-2">
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
    <div className="space-y-4">
      <Card className="metal-panel rounded-[1.6rem] border-[color:var(--color-border)]/60 overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-3 silver-sheen flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
              <LifeBuoy className="h-6 w-6 text-[#33414d]" />
            </div>
            <CardTitle className="text-2xl text-[var(--color-card-foreground)]">
              {isCustomerView ? 'How can we help you?' : 'How can your team get help today?'}
            </CardTitle>
            <CardDescription className="mt-1 text-[var(--text-metal-color)]">
              {isCustomerView
                ? 'Find answers about bookings, payments, refunds, account setup, and project tracking.'
                : 'Find internal guidance for queues, approvals, controls, operations, and troubleshooting.'}
            </CardDescription>
          </div>

          <div className="mx-auto w-full max-w-3xl space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-metal-muted-color)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-xl pl-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                placeholder={
                  isCustomerView
                    ? 'Search topics like account, booking, payments, refunds...'
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
                  className="rounded-full border-[color:var(--color-border)]/70 bg-white/70 text-xs text-[var(--text-metal-color)] hover:text-[var(--color-card-foreground)] dark:bg-transparent"
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

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit rounded-2xl border-[color:var(--color-border)]/60 xl:sticky xl:top-24">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[var(--color-card-foreground)]">
              {isCustomerView ? 'Customer Knowledge Layers' : 'Internal Knowledge Layers'}
            </CardTitle>
            <CardDescription className="text-[var(--text-metal-color)]">
              {isCustomerView
                ? 'Customer-facing guides for the full service journey.'
                : 'Team-facing guides for internal operations and controls.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <NavLink
              to="/help"
              end
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[color:var(--color-muted)] text-[var(--color-card-foreground)]'
                    : 'text-[var(--text-metal-color)] hover:bg-[color:var(--color-muted)]/40'
                }`
              }
            >
              {isCustomerView ? 'Customer Overview' : 'Internal Overview'}
            </NavLink>

            {visibleKnowledgeBase.map((category) => (
              <div key={category.slug} className="space-y-1.5">
                <NavLink
                  to={`/help/${category.slug}`}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-[color:var(--color-muted)] text-[var(--color-card-foreground)]'
                        : 'text-[var(--text-metal-color)] hover:bg-[color:var(--color-muted)]/40'
                    }`
                  }
                >
                  {category.title}
                </NavLink>
                <div className="ml-2 space-y-1 border-l border-[color:var(--color-border)]/60 pl-2">
                  {category.articles.map((article) => (
                    <NavLink
                      key={`${category.slug}-${article.slug}`}
                      to={`/help/${category.slug}/${article.slug}`}
                      className={({ isActive }) =>
                        `block rounded-md px-2 py-1.5 text-xs transition-colors ${
                          isActive
                            ? 'bg-[color:var(--color-muted)] text-[var(--color-card-foreground)]'
                            : 'text-[var(--text-metal-muted-color)] hover:bg-[color:var(--color-muted)]/35 hover:text-[var(--text-metal-color)]'
                        }`
                      }
                    >
                      {article.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Routes>
          <Route
            index
            element={
              <div className="space-y-5">
                <Card className="rounded-2xl border-[color:var(--color-border)]/60">
                  <CardHeader>
                    <CardTitle className="text-lg text-[var(--color-card-foreground)]">
                      {isCustomerView ? 'Customer Knowledge Map' : 'Internal Knowledge Map'}
                    </CardTitle>
                    <CardDescription className="text-[var(--text-metal-color)]">
                      Use layered routes like /help/getting-started/account-setup or /help/payments-refunds/refunds.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleKnowledgeBase.map((category) => {
                      const iconMap: Record<string, React.ElementType> = {
                        'getting-started': BookOpen,
                        'appointments-visits': CalendarCheck,
                        'projects-fabrication': FolderOpen,
                        'payments-refunds': CreditCard,
                        'operations-admin': Settings,
                        'support-and-troubleshooting': HelpCircle,
                      };
                      const IconComp = iconMap[category.slug] || Wrench;
                      return (
                      <Link
                        key={`map-${category.slug}`}
                        to={`/help/${category.slug}`}
                        className="group block rounded-[1.2rem] border border-[color:var(--color-border)]/60 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_20px_34px_rgba(18,22,27,0.1)] hover:border-[color:var(--color-border)]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="silver-sheen flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-[0_10px_22px_rgba(15,23,42,0.1)] transition-transform group-hover:scale-[1.04]">
                            <IconComp className="h-5 w-5 text-[#33414d]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-semibold text-[var(--color-card-foreground)]">{category.title}</h3>
                              <Badge
                                variant="secondary"
                                className="shrink-0 rounded-full border border-white/30 bg-[linear-gradient(180deg,#f7fafc_0%,#dbe3eb_100%)] px-2 py-0.5 text-[10px] font-semibold text-[#334155] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.9)_0%,rgba(15,23,42,0.95)_100%)] dark:text-slate-300"
                              >
                                {category.articles.length}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-metal-color)]">{category.description}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--text-metal-muted-color)] group-hover:text-[var(--color-card-foreground)] transition-colors">
                          Browse articles <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                      );
                    })}
                  </CardContent>
                </Card>

                {isInternalView && isLoading ? (
                  <Card className="rounded-2xl border-[color:var(--color-border)]/60">
                    <CardContent className="py-10 text-sm text-[var(--text-metal-color)]">Loading help content...</CardContent>
                  </Card>
                ) : isInternalView ? (
                  <Card className="rounded-2xl border-[color:var(--color-border)]/60">
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg text-[var(--color-card-foreground)]">Managed Notes</CardTitle>
                        <CardDescription className="text-[var(--text-metal-color)]">
                          Config-backed notes that admins can update without deployment.
                        </CardDescription>
                      </div>
                      {isAdmin && !isEditing && (
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={startEdit}>
                          <Pencil className="mr-1.5 h-4 w-4" /> Edit
                        </Button>
                      )}
                    </CardHeader>
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
                  </Card>
                ) : (
                  <Card className="rounded-2xl border-[color:var(--color-border)]/60">
                    <CardHeader>
                      <CardTitle className="text-lg text-[var(--color-card-foreground)]">Need More Help?</CardTitle>
                      <CardDescription className="text-[var(--text-metal-color)]">
                        If you cannot find what you need, contact support through notifications or your assigned staff.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sections.map((section, idx) => {
                        const IconComp = getSectionIcon(section.heading);
                        return (
                          <div key={`customer-note-${section.heading}-${idx}`} className="rounded-xl border border-[color:var(--color-border)]/60 p-4">
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
                    </CardContent>
                  </Card>
                )}
              </div>
            }
          />
          <Route path=":categorySlug" element={<HelpCategoryRoute categories={visibleKnowledgeBase} />} />
          <Route path=":categorySlug/:articleSlug" element={<HelpArticleRoute categories={visibleKnowledgeBase} />} />
          <Route path="*" element={<Navigate to="/help" replace />} />
        </Routes>
      </div>

      <Separator className="my-1" />
      <p className="text-xs text-[var(--text-metal-muted-color)]">
        Tip: Share deep links directly to a topic using URLs like /help/payments-refunds/cashier-verification.
      </p>
    </div>
  );
}
