// ── Roles ──
export enum Role {
  CUSTOMER = 'customer',
  APPOINTMENT_AGENT = 'appointment_agent',
  SALES_STAFF = 'sales_staff',
  ENGINEER = 'engineer',
  CASHIER = 'cashier',
  ADMIN = 'admin',
  FABRICATION_STAFF = 'fabrication_staff',
}

export enum StaffAvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  ON_LEAVE = 'on_leave',
}

// ── Appointment ──
export enum AppointmentStatus {
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  ON_THE_WAY = 'on_the_way',
  ARRIVED_AT_SITE = 'arrived_at_site',
  IN_PROGRESS = 'in_progress',
  READY_FOR_OCULAR = 'ready_for_ocular',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULE_REQUESTED = 'reschedule_requested',
}

export enum AppointmentType {
  OFFICE = 'office',
  OCULAR = 'ocular',
}

export enum AppointmentAttendanceStatus {
  SCHEDULED = 'scheduled',
  ON_TIME = 'on_time',
  LATE_ARRIVAL = 'late_arrival',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show',
  CUSTOMER_DECLINED = 'customer_declined',
}

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  [AppointmentType.OFFICE]: 'Consultation',
  [AppointmentType.OCULAR]: 'Ocular Visit',
};

export const SLOT_CODES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'] as const;
export type SlotCode = (typeof SLOT_CODES)[number];

// ── Project ──
export enum ProjectStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  BLUEPRINT = 'blueprint',
  APPROVED = 'approved',
  PAYMENT_PENDING = 'payment_pending',
  READY_FOR_OCULAR = 'ready_for_ocular',
  FABRICATION = 'fabrication',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ContractStatus {
  MISSING = 'missing',
  UPLOADED = 'uploaded',
}

// ── Blueprint ──
export enum BlueprintStatus {
  UPLOADED = 'uploaded',
  REVISION_REQUESTED = 'revision_requested',
  REVISION_UPLOADED = 'revision_uploaded',
  APPROVED = 'approved',
}

export enum BlueprintComponent {
  BLUEPRINT = 'blueprint',
  COSTING = 'costing',
}

// ── Payment ──
export enum PaymentStageStatus {
  PENDING = 'pending',
  PROOF_SUBMITTED = 'proof_submitted',
  VERIFIED = 'verified',
  DECLINED = 'declined',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  GCASH = 'gcash',
  PAYMONGO = 'paymongo',
  QRPH = 'qrph',
}

// ── Fabrication ──
export enum FabricationStatus {
  QUEUED = 'queued',
  SITE_PREPARATION = 'site_preparation',
  MEASUREMENT_LAYOUT = 'measurement_layout',
  MATERIAL_PREP = 'material_prep',
  CUTTING = 'cutting',
  WELDING = 'welding',
  ASSEMBLY = 'assembly',
  FABRICATION_INSTALLATION = 'fabrication_installation',
  WELDING_ASSEMBLY = 'welding_assembly',
  FINISHING = 'finishing',
  QUALITY_CHECK = 'quality_check',
  READY_FOR_DELIVERY = 'ready_for_delivery',
  TURNOVER = 'turnover',
  DONE = 'done',
}

export enum DeliveryType {
  SHOP_FABRICATED = 'shop_fabricated',
  ON_SITE_INSTALLATION = 'on_site_installation',
}

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  [DeliveryType.SHOP_FABRICATED]: 'Shop-fabricated / Deliverable',
  [DeliveryType.ON_SITE_INSTALLATION]: 'On-site / Installation',
};

// ── Cash ──
export enum CashCollectionStatus {
  COLLECTED = 'collected',
  RECEIVED = 'received',
  DISCREPANCY = 'discrepancy',
}

// ── Ocular Fee Payment Choice ──
export enum OcularFeePaymentChoice {
  ONLINE = 'online',
  CASH = 'cash',
}


// ── Notification ──
export enum NotificationCategory {
  APPOINTMENT = 'appointment',
  PROJECT = 'project',
  BLUEPRINT = 'blueprint',
  PAYMENT = 'payment',
  FABRICATION = 'fabrication',
  SYSTEM = 'system',
}

// ── Visit Report ──
export enum VisitReportStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  RETURNED = 'returned',
  COMPLETED = 'completed',
}

// ── Service Type (fabrication categories) ──
export enum ServiceType {
  RAILINGS = 'railings',
  GRILLS = 'grills',
  GATES = 'gates',
  FENCES = 'fences',
  KITCHEN_COUNTER = 'kitchen_counter',
  KITCHEN_CABINET = 'kitchen_cabinet',
  TABLE = 'table',
  CHAIR = 'chair',
  SHELVING = 'shelving',
  DOOR = 'door',
  WINDOW_FRAME = 'window_frame',
  CANOPY = 'canopy',
  STAIRCASE = 'staircase',
  BALUSTRADE = 'balustrade',
  SIGNAGE = 'signage',
  CUSTOM = 'custom',
}

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  [ServiceType.RAILINGS]: 'Railings',
  [ServiceType.GRILLS]: 'Grills',
  [ServiceType.GATES]: 'Gates',
  [ServiceType.FENCES]: 'Fences',
  [ServiceType.KITCHEN_COUNTER]: 'Kitchen Counter',
  [ServiceType.KITCHEN_CABINET]: 'Kitchen Cabinet',
  [ServiceType.TABLE]: 'Table',
  [ServiceType.CHAIR]: 'Chair',
  [ServiceType.SHELVING]: 'Shelving',
  [ServiceType.DOOR]: 'Door',
  [ServiceType.WINDOW_FRAME]: 'Window Frame',
  [ServiceType.CANOPY]: 'Canopy',
  [ServiceType.STAIRCASE]: 'Staircase',
  [ServiceType.BALUSTRADE]: 'Balustrade',
  [ServiceType.SIGNAGE]: 'Signage',
  [ServiceType.CUSTOM]: 'Custom',
};

const SHOP_FABRICATED_SERVICE_TYPES = new Set<string>([
  ServiceType.TABLE,
  ServiceType.CHAIR,
]);

const ON_SITE_INSTALLATION_SERVICE_TYPES = new Set<string>([
  ServiceType.RAILINGS,
  ServiceType.GRILLS,
  ServiceType.GATES,
  ServiceType.FENCES,
  ServiceType.KITCHEN_COUNTER,
  ServiceType.KITCHEN_CABINET,
  ServiceType.DOOR,
  ServiceType.WINDOW_FRAME,
  ServiceType.CANOPY,
  ServiceType.STAIRCASE,
  ServiceType.BALUSTRADE,
]);

export function getDefaultDeliveryType(serviceType?: string): DeliveryType | undefined {
  if (serviceType && SHOP_FABRICATED_SERVICE_TYPES.has(serviceType)) {
    return DeliveryType.SHOP_FABRICATED;
  }
  if (serviceType && ON_SITE_INSTALLATION_SERVICE_TYPES.has(serviceType)) {
    return DeliveryType.ON_SITE_INSTALLATION;
  }
  return undefined;
}

// ── Measurement Unit ──
export enum MeasurementUnit {
  CM = 'cm',
  INCHES = 'inches',
  FEET = 'feet',
  METERS = 'meters',
}

export const MEASUREMENT_UNIT_LABELS: Record<string, string> = {
  [MeasurementUnit.CM]: 'cm',
  [MeasurementUnit.INCHES]: 'in',
  [MeasurementUnit.FEET]: 'ft',
  [MeasurementUnit.METERS]: 'm',
};

// ── Environment / Site Condition ──
export enum Environment {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  SEMI_COVERED = 'semi_covered',
}

export const ENVIRONMENT_LABELS: Record<string, string> = {
  [Environment.INDOOR]: 'Indoor',
  [Environment.OUTDOOR]: 'Outdoor',
  [Environment.SEMI_COVERED]: 'Semi-covered',
};
