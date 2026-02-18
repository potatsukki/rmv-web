import type { Role } from './constants';

// ── Auth ──
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: Role[];
  isEmailVerified: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  csrfToken: string | null;
}

// ── Appointment ──
export interface Appointment {
  _id: string;
  customerId: string;
  customerName?: string;
  salesStaffId?: string;
  salesStaffName?: string;
  type: string;
  date: string;
  slotCode: string;
  status: string;
  purpose?: string;
  address?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  location?: { lat: number; lng: number };
  distanceKm?: number;
  ocularFee?: number;
  ocularFeeBreakdown?: {
    label: string;
    isWithinNCR: boolean;
    baseFee: number;
    baseCoveredKm: number;
    perKmRate: number;
    additionalDistanceKm: number;
    additionalFee: number;
    total: number;
  };
  ocularFeeMethod?: string;
  rescheduleCount: number;
  maxReschedules: number;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Project ──
export interface Project {
  _id: string;
  appointmentId: string;
  customerId: string;
  customerName?: string;
  salesStaffId?: string;
  salesStaffName?: string;
  title: string;
  serviceType?: string;
  description?: string;
  siteAddress?: string;
  measurements?: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    thickness?: number;
    unit: string;
  };
  materialType?: string;
  finishColor?: string;
  quantity?: number;
  notes?: string;
  status: string;
  engineerIds: string[];
  fabricationLeadId?: string;
  fabricationAssistantIds: string[];
  mediaKeys: string[];
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Blueprint ──
export interface Blueprint {
  _id: string;
  projectId: string;
  version: number;
  blueprintKey: string;
  costingKey: string;
  blueprintApproved: boolean;
  costingApproved: boolean;
  status: string;
  revisionNotes?: string;
  revisionRefKeys: string[];
  quotation?: {
    materials: number;
    labor: number;
    fees: number;
    total: number;
    breakdown?: string;
    estimatedDuration?: string;
    engineerNotes?: string;
  };
  createdAt: string;
}

// ── Payment ──
export interface PaymentStage {
  stageId: string;
  label: string;
  percentage: number;
  amount: number;
  status: string;
}

export interface PaymentPlan {
  _id: string;
  projectId: string;
  totalAmount: number;
  stages: PaymentStage[];
  isImmutable: boolean;
  createdAt: string;
}

export interface Payment {
  _id: string;
  projectId: string;
  stageId: string;
  method: string;
  amountPaid: number;
  referenceNumber?: string;
  proofKey?: string;
  status: string;
  declineReason?: string;
  receiptNumber?: string;
  receiptKey?: string;
  creditFromPrevious: number;
  excessCredit: number;
  createdAt: string;
}

// ── Fabrication ──
export interface FabricationUpdate {
  _id: string;
  projectId: string;
  status: string;
  notes: string;
  photoKeys: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

// ── Notification ──
export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  category: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

// ── Cash ──
export interface CashCollection {
  _id: string;
  appointmentId: string;
  salesStaffId: string;
  salesStaffName?: string;
  customerId?: string;
  customerName?: string;
  amountCollected: number;
  amountReceived?: number;
  notes?: string;
  photoKey?: string;
  status: string;
  receivedBy?: string;
  receivedAt?: string;
  createdAt: string;
}

// ── API Response ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

// ── Visit Report ──
export interface VisitReport {
  _id: string;
  appointmentId: string;
  customerId: string;
  customerName?: string;
  salesStaffId: string;
  salesStaffName?: string;
  status: string;
  visitType: string;
  actualVisitDateTime?: string;
  measurements?: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    thickness?: number;
    unit: string;
    raw?: string;
  };
  materials?: string;
  finishes?: string;
  preferredDesign?: string;
  customerRequirements?: string;
  notes?: string;
  photoKeys: string[];
  videoKeys: string[];
  sketchKeys: string[];
  referenceImageKeys: string[];
  returnReason?: string;
  createdAt: string;
  updatedAt: string;
}
