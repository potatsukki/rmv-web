import type { Role, StaffAvailabilityStatus, AppointmentStatus } from './constants';

// ── Auth ──
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  addressData?: {
    id?: string;
    label?: string;
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    addressType?: 'personal' | 'business';
    lat?: number;
    lng?: number;
    formattedAddress?: string;
    isDefault?: boolean;
  };
  savedAddresses?: UserAddress[];
  roles: Role[];
  isEmailVerified: boolean;
  isActive: boolean;
  availabilityStatus?: StaffAvailabilityStatus;
  availabilityNote?: string;
  availabilityUpdatedAt?: string;
  activeShift?: {
    sessionId: string;
    shiftStartAt: string;
    shiftEndAt?: string;
    isCurrent: boolean;
    reminderSentAt?: string;
  };
  expiredShift?: {
    sessionId: string;
    shiftStartAt: string;
    shiftEndAt?: string;
    isCurrent: boolean;
    reminderSentAt?: string;
  };
  availabilitySetupRequired?: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled?: boolean;
  provider?: 'local' | 'google';
  firebaseUid?: string | null;
  photoURL?: string;
  notificationPreferences?: {
    appointment: boolean;
    payment: boolean;
    blueprint: boolean;
    fabrication: boolean;
    project: boolean;
    emailNotifications?: boolean;
  };
  themePreference?: 'light' | 'dark' | 'system';
  createdAt: string;
}

export interface UserAddress {
  id?: string;
  label?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  addressType?: 'personal' | 'business';
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  isDefault?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  csrfToken: string | null;
}

export interface SalesStaffLookupUser {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  availabilityStatus?: StaffAvailabilityStatus;
  availabilityNote?: string;
  availabilityUpdatedAt?: string;
  activeShift?: User['activeShift'];
  expiredShift?: User['expiredShift'];
  availabilitySetupRequired?: boolean;
  assignmentEligible?: boolean;
  assignmentBlockedReason?: string;
}

export interface Session {
  _id: string;
  browser: string;
  os: string;
  device: string;
  location: string;
  ipAddress: string;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface LoginActivity {
  _id: string;
  browser: string;
  os: string;
  device: string;
  location: string;
  ipAddress: string;
  status: 'success' | 'failed';
  failReason?: string;
  createdAt: string;
}

export interface CustomerSiteDetails {
  serviceTypes?: string[];
  serviceType?: string;
  serviceTypeCustom?: string;
  measurementUnit?: string;
  lineItems?: LineItem[];
  siteConditions?: SiteConditions;
  materials?: string;
  finishes?: string;
  preferredDesign?: string;
  specifications?: ServiceSpecifications;
  customerRequirements?: string;
  notes?: string;
  photoKeys?: string[];
  videoKeys?: string[];
  sketchKeys?: string[];
  referenceImageKeys?: string[];
}

// ── Appointment ──
export interface Appointment {
  _id: string;
  canonicalAppointmentId?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  salesStaffId?:
    | string
    | {
      _id: string;
      firstName: string;
      lastName: string;
      availabilityStatus?: string;
      availabilityNote?: string;
    };
  salesStaffName?: string;
  type: string;
  date: string;
  slotCode: string;
  recommendedOcularDate?: string;
  recommendedOcularSlot?: string;
  status: string;
  attendanceStatus?: string;
  actualArrivalAt?: string;
  consultationStartedAt?: string;
  consultationCompletedAt?: string;
  attendanceNotes?: string;
  attendanceUpdatedAt?: string;
  attendanceOverrideReason?: string;
  purpose?: string;
  serviceTypes?: string[];
  serviceType?: string;
  serviceTypeCustom?: string;
  selectedDesignTemplateId?: string;
  selectedDesignTemplateName?: string;
  selectedDesignTemplateImageUrl?: string;
  address?: string;
  customerAddress?: string;
  formattedAddress?: string;
  addressStructured?: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zip: string;
    addressType?: 'personal' | 'business';
  };
  latitude?: number;
  longitude?: number;
  location?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
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
  ocularFeePaymentChoice?: 'online' | 'cash';
  ocularFeePaid?: boolean;
  ocularFeeProofKey?: string;
  ocularFeeReferenceNumber?: string;
  ocularFeeStatus?: 'pending' | 'cash_pending' | 'proof_submitted' | 'verified' | 'declined';
  ocularFeeDeclineReason?: string;
  paymongoCheckoutSessionId?: string;
  paymongoCheckoutUrl?: string;
  rescheduleReason?: string;
  previousStatusBeforeReschedule?: AppointmentStatus;
  rescheduleCount: number;
  maxReschedules: number;
  requestedRescheduleDate?: string;
  requestedRescheduleSlotCode?: string;
  projectNumber?: string;
  cancelReason?: string;
  internalNotes?: string;
  customerSiteDetails?: CustomerSiteDetails;
  siteDetailsStatus?: 'pending' | 'submitted' | 'skipped';
  addressType?: 'personal' | 'business';
  initialDesignKeys?: string[];
  initialDesignNotes?: string;
  initialDesignStatus?: 'pending' | 'submitted' | 'skipped';
  consultationReportSubmitted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentQueueSampleProject {
  projectId: string;
  title: string;
  serviceType?: string;
  status: string;
  path: string;
}

export interface AppointmentQueueActions {
  reviewReportPath?: string;
  projectPath?: string;
  createProjectPath?: string;
}

export interface AppointmentQueueItem {
  appointment: Appointment;
  segment: 'upcoming' | 'recent';
  actions: AppointmentQueueActions;
  sampleProjects: AppointmentQueueSampleProject[];
}

export interface AppointmentQueueResponse {
  items: AppointmentQueueItem[];
  upcomingCount: number;
  recentCount: number;
  recentWindowDays: number;
  generatedAt: string;
}

// ── Project ──
export interface Project {
  _id: string;
  appointmentId: string;
  customerId: string | { _id: string; firstName: string; lastName: string; email?: string };
  customerName?: string;
  salesStaffId?: string | { _id: string; firstName: string; lastName: string; availabilityStatus?: string; availabilityNote?: string };
  salesStaffName?: string;
  projectNumber?: string;
  title: string;
  totalCost?: number;
  serviceType?: string;
  serviceTypes?: string[];
  description?: string;
  siteAddress?: string;
  siteAddressStructured?: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zip: string;
    addressType?: 'personal' | 'business';
  };
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
  initialDesignKeys?: string[];
  initialDesignNotes?: string;
  initialDesignBackfill?: {
    isSyntheticDemo: boolean;
    reason: string;
    backfilledAt: string;
    backfilledBy?: string | { _id: string; firstName: string; lastName: string };
  };
  designReviewStatus?: 'pending' | 'approved' | 'declined' | 'not_required';
  designReviewedBy?: string | { _id: string; firstName: string; lastName: string };
  designReviewedAt?: string;
  designReviewNotes?: string;
  status: string;
  engineerIds: (string | { _id: string; firstName: string; lastName: string; phone?: string })[];
  fabricationLeadId?: string | { _id: string; firstName: string; lastName: string };
  fabricationAssistantIds: (string | { _id: string; firstName: string; lastName: string })[];
  visitReportId?: string | VisitReport;
  items?: ProjectItem[];
  mediaKeys: string[];
  contractStatus?: 'missing' | 'uploaded';
  contractFileKey?: string;
  contractFileName?: string;
  contractContentType?: string;
  contractFileSize?: number;
  contractUploadedAt?: string;
  contractUploadedBy?: string | { _id: string; firstName: string; lastName: string };
  contractKey?: string;
  contractGeneratedAt?: string;
  contractSignedAt?: string;
  contractSignatureKey?: string;
  originalContractDownloadedAt?: string;
  cancelReason?: string;
  installationConfirmedAt?: string;
  customerReview?: {
    rating?: number;
    comment?: string;
    submittedAt?: string;
    submittedBy?: string | { _id: string; firstName: string; lastName: string };
    skippedAt?: string;
    skippedReason?: string;
  };
  latestBlueprintStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  _id: string;
  projectId: string;
  appointmentId: string;
  consultationVisitReportId?: string | VisitReport;
  ocularVisitReportId?: string | VisitReport;
  serviceType: string;
  serviceTypeCustom?: string;
  title: string;
  status: string;
  measurements?: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    thickness?: number;
    unit?: string;
    raw?: string;
  };
  measurementUnit?: string;
  lineItems?: LineItem[];
  materials?: string;
  finishes?: string;
  preferredDesign?: string;
  specifications?: ServiceSpecifications;
  customerRequirements?: string;
  notes?: string;
  initialDesignKeys?: string[];
  initialDesignNotes?: string;
  selectedDesignTemplateId?: string;
  selectedDesignTemplateName?: string;
  selectedDesignTemplateImageUrl?: string;
  designReviewStatus?: 'pending' | 'approved' | 'declined' | 'not_required';
  designReviewedBy?: string | User;
  designReviewedAt?: string;
  designReviewNotes?: string;
  installationConfirmedAt?: string;
  mediaKeys?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Blueprint ──
export type QuotationComplexity = 'simple' | 'standard' | 'complex';
export type QuotationPaymentOption = 'full' | 'milestone';
export type QuotationReviewStatus = 'draft' | 'for_review' | 'approved' | 'sent_to_customer';

export interface QuotationInternalCosts<T = number> {
  estimatedMaterials: T;
  fabricationWork: T;
  finishingPolishing: T;
  installation: T;
  deliveryMobilization: T;
  overheadMisc: T;
  markupProfit: T;
}

export interface QuotationMilestone {
  label: string;
  description?: string;
  percentage?: number;
  amount?: number;
  trigger?: string;
}

export interface Blueprint {
  _id: string;
  projectId: string;
  projectItemId?: string;
  version: number;
  blueprintKey: string;
  designKey?: string;
  costingKey?: string;
  blueprintApproved: boolean;
  costingApproved: boolean;
  status: string;
  revisionNotes?: string;
  revisionRefKeys: string[];
  quotationReviewStatus?: QuotationReviewStatus;
  quotationReviewedBy?: string;
  quotationReviewedAt?: string;
  quotationSentAt?: string;
  uploadedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  quotation?: {
    internalCosts?: QuotationInternalCosts;
    costPreset?: {
      serviceType?: string;
      complexity?: QuotationComplexity;
      suggestedAt?: string;
      suggestedValues?: Partial<QuotationInternalCosts>;
    };
    discount?: number;
    subtotal?: number;
    total: number;
    paymentOption?: QuotationPaymentOption;
    paymentMilestones?: QuotationMilestone[];
    validityDays?: number;
    systemEstimatedDuration?: string;
    adjustedEstimatedDuration?: string;
    estimatedDuration?: string;
    inclusions?: string;
    exclusions?: string;
    engineerNotes?: string;
    materials?: number;
    labor?: number;
    fees?: number;
    lineItems?: {
      label: string;
      quantity: number;
      materials: number;
      labor: number;
      amount: number;
    }[];
    breakdown?: string;
  };
  createdAt: string;
}

export interface BlueprintDraftFile {
  key: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface BlueprintDraft {
  _id: string;
  projectId: string;
  projectItemId?: string;
  mode: 'initial' | 'revision';
  sourceBlueprintId?: string;
  files?: {
    blueprint?: BlueprintDraftFile | null;
    design?: BlueprintDraftFile | null;
    costing?: BlueprintDraftFile | null;
  };
  quotation?: {
    internalCosts?: Partial<QuotationInternalCosts<string>>;
    costPreset?: {
      serviceType?: string;
      complexity?: QuotationComplexity;
      suggestedAt?: string;
      suggestedValues?: Partial<QuotationInternalCosts<string>>;
    };
    discount?: string;
    subtotal?: string;
    total?: string;
    paymentOption?: QuotationPaymentOption;
    systemEstimatedDuration?: string;
    adjustedEstimatedDuration?: string;
    inclusions?: string;
    exclusions?: string;
    lineItems?: {
      label: string;
      quantity: number;
      materials: string;
      labor: string;
    }[];
    fees?: string;
    validityDays?: string;
    breakdown?: string;
    estimatedDuration?: string;
    engineerNotes?: string;
    paymentMilestones?: QuotationMilestone[];
  };
  createdBy?: Pick<User, '_id' | 'firstName' | 'lastName' | 'phone'>;
  lastEditedBy?: Pick<User, '_id' | 'firstName' | 'lastName' | 'phone'>;
  createdAt: string;
  updatedAt: string;
}

// ── Payment ──
export interface PaymentStage {
  stageId: string;
  label: string;
  description?: string;
  percentage: number;
  amount: number;
  status: string;
  amountPaid?: number;
  remainingBalance?: number;
  // Payment activation (fabrication-driven)
  activatedAt?: string | null;
  headsUpSentAt?: string | null;
  remindersSent?: number;
  lastReminderAt?: string | null;
  escalatedToCashier?: boolean;
}

export interface PaymentPlan {
  _id: string;
  projectId: string;
  projectItemId?: string;
  totalAmount: number;
  stages: PaymentStage[];
  isPayInFull?: boolean;
  isImmutable: boolean;
  createdAt: string;
}

export interface Payment {
  _id: string;
  projectId: string;
  projectItemId?: string;
  stageId: string;
  method: string;
  amountPaid: number;
  referenceNumber?: string;
  proofKey?: string;
  status: string;
  declineReason?: string;
  cashierSignatureKey?: string;
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
  projectItemId?: string;
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
  link?: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

// ── Audit Log ──
export interface AuditLog {
  _id: string;
  action: string;
  actorId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
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

export interface LineItem {
  label: string;
  length?: number;
  width?: number;
  height?: number;
  area?: number;
  thickness?: number;
  quantity: number;
  notes?: string;
}

export interface SiteConditions {
  environment: string;
  floorType?: string;
  wallMaterial?: string;
  hasElectrical?: boolean;
  hasPlumbing?: boolean;
  accessNotes?: string;
  obstaclesOrConstraints?: string;
}

export interface ServiceSpecifications {
  measurements?: Record<string, string | number | boolean>;
  siteConditions?: Record<string, string | number | boolean>;
  materialsDesign?: Record<string, string | number | boolean>;
  additional?: Record<string, string | number | boolean>;
}

export interface VisitReport {
  _id: string;
  appointmentId: string | (Partial<Appointment> & { _id: string });
  projectItemId?: string;
  customerId: string;
  customerName?: string;
  salesStaffId: string;
  salesStaffName?: string;
  status: string;
  visitType: string;
  actualVisitDateTime?: string;

  serviceType: string;
  serviceTypeCustom?: string;

  measurementUnit?: string;
  lineItems?: LineItem[];

  // Legacy flat measurements (old reports)
  measurements?: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    thickness?: number;
    unit: string;
    raw?: string;
  };

  siteConditions?: SiteConditions;

  materials?: string;
  finishes?: string;
  preferredDesign?: string;
  specifications?: ServiceSpecifications;
  customerRequirements?: string;
  notes?: string;

  // Consultation-specific fields
  discussionNotes?: string;
  consultationOutcome?: 'schedule_ocular' | 'no_ocular';
  noOcularReason?: string;
  productsDiscussed?: string;
  designPreferences?: string;
  materialOptions?: string;
  projectScope?: string;
  initialDesignKeys?: string[];
  initialDesignNotes?: string;
  selectedDesignTemplateId?: string;
  selectedDesignTemplateName?: string;
  selectedDesignTemplateImageUrl?: string;
  recommendedOcularDate?: string;
  recommendedOcularSlot?: string;
  recommendedOcularAddressId?: string;
  recommendedOcularAddress?: UserAddress;
  relatedOcularAppointment?: Partial<Appointment> & { _id: string };
  linkedProjectId?: string;

  photoKeys: string[];
  videoKeys: string[];
  sketchKeys: string[];
  referenceImageKeys: string[];
  returnReason?: string;
  sampleProjects?: AppointmentQueueSampleProject[];
  createdAt: string;
  updatedAt: string;
}
