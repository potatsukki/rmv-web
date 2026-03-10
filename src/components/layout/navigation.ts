import { Role } from '@/lib/constants';
import {
  Calendar,
  FolderKanban,
  CreditCard,
  BarChart3,
  Settings,
  Users,
  Bell,
  Home,
  Banknote,
  ClipboardList,
  CalendarOff,
  CalendarPlus,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const sidebarNavGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: Home, roles: Object.values(Role) },
      { label: 'Notifications', path: '/notifications', icon: Bell, roles: Object.values(Role) },
    ],
  },
  {
    title: 'Project Management',
    items: [
      {
        label: 'Appointments',
        path: '/appointments',
        icon: Calendar,
        roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN],
      },
      {
        label: 'Create Appointment',
        path: '/appointments/create-for-customer',
        icon: CalendarPlus,
        roles: [Role.APPOINTMENT_AGENT],
      },
      {
        label: 'Visit Reports',
        path: '/visit-reports',
        icon: ClipboardList,
        roles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
      },
      {
        label: 'Projects',
        path: '/projects',
        icon: FolderKanban,
        roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN],
      },
    ],
  },
  {
    title: 'Financials',
    items: [
      {
        label: 'Payments',
        path: '/payments',
        icon: CreditCard,
        roles: [Role.CUSTOMER, Role.CASHIER, Role.ADMIN],
      },
      {
        label: 'Cash Flow',
        path: '/cash',
        icon: Banknote,
        roles: [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN],
      },
      {
        label: 'Cashier Queue',
        path: '/cashier-queue',
        icon: CreditCard,
        roles: [Role.CASHIER, Role.ADMIN],
      },
      {
        label: 'Ocular Fee Queue',
        path: '/ocular-fee-queue',
        icon: CreditCard,
        roles: [Role.CASHIER, Role.ADMIN],
      },
      {
        label: 'Refund Requests',
        path: '/refund-requests',
        icon: ReceiptText,
        roles: [Role.CASHIER, Role.ADMIN],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Reports',
        path: '/reports',
        icon: BarChart3,
        roles: [Role.ADMIN, Role.CASHIER],
      },
      { label: 'Manage Accounts', path: '/users', icon: Users, roles: [Role.ADMIN] },
      { label: 'Slot Management', path: '/slot-management', icon: CalendarOff, roles: [Role.ADMIN, Role.APPOINTMENT_AGENT] },
      { label: 'Settings', path: '/settings', icon: Settings, roles: [Role.ADMIN] },
    ],
  },
];

export const mobileBottomTabItems: NavItem[] = [
  { label: 'Home', path: '/dashboard', icon: Home, roles: Object.values(Role) },
  {
    label: 'Visits',
    path: '/appointments',
    icon: Calendar,
    roles: [Role.CUSTOMER, Role.APPOINTMENT_AGENT, Role.SALES_STAFF, Role.ADMIN],
  },
  {
    label: 'Reports',
    path: '/visit-reports',
    icon: ClipboardList,
    roles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    roles: [Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN],
  },
  {
    label: 'Payments',
    path: '/payments',
    icon: CreditCard,
    roles: [Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN],
  },
  {
    label: 'Queue',
    path: '/cashier-queue',
    icon: ReceiptText,
    roles: [Role.CASHIER, Role.ADMIN],
  },
  {
    label: 'Cash',
    path: '/cash',
    icon: Banknote,
    roles: [Role.CASHIER],
  },
  {
    label: 'Analytics',
    path: '/reports',
    icon: BarChart3,
    roles: [Role.CASHIER],
  },
];

export const mobileMenuItems: NavItem[] = [
  {
    label: 'Visit Reports',
    path: '/visit-reports',
    icon: ClipboardList,
    roles: [Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN],
  },
  {
    label: 'Cash Management',
    path: '/cash',
    icon: Banknote,
    roles: [Role.SALES_STAFF, Role.CASHIER, Role.ADMIN],
  },
  {
    label: 'Cashier Queue',
    path: '/cashier-queue',
    icon: CreditCard,
    roles: [Role.CASHIER, Role.ADMIN],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    roles: [Role.ADMIN, Role.CASHIER],
  },
  { label: 'Manage Accounts', path: '/users', icon: Users, roles: [Role.ADMIN] },
  { label: 'Slot Management', path: '/slot-management', icon: CalendarOff, roles: [Role.ADMIN, Role.APPOINTMENT_AGENT] },
  { label: 'Create Appointment', path: '/appointments/create-for-customer', icon: CalendarPlus, roles: [Role.APPOINTMENT_AGENT] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: [Role.ADMIN] },
];

export function getVisibleNavigationPaths(roles: Role[]): Set<string> {
  const paths = new Set<string>();
  const allItems = [
    ...sidebarNavGroups.flatMap((group) => group.items),
    ...mobileBottomTabItems,
    ...mobileMenuItems,
  ];

  for (const item of allItems) {
    if (roles.some((role) => item.roles.includes(role))) {
      paths.add(item.path);
    }
  }

  return paths;
}