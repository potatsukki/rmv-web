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

// ── Appointment ──
export enum AppointmentStatus {
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULE_REQUESTED = 'reschedule_requested',
}

export enum AppointmentType {
  OFFICE = 'office',
  OCULAR = 'ocular',
}

export const SLOT_CODES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'] as const;
export type SlotCode = (typeof SLOT_CODES)[number];

// ── Project ──
export enum ProjectStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  BLUEPRINT = 'blueprint',
  APPROVED = 'approved',
  PAYMENT_PENDING = 'payment_pending',
  FABRICATION = 'fabrication',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
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
  MATERIAL_PREP = 'material_prep',
  CUTTING = 'cutting',
  WELDING = 'welding',
  FINISHING = 'finishing',
  QUALITY_CHECK = 'quality_check',
  READY_FOR_DELIVERY = 'ready_for_delivery',
  DONE = 'done',
}

// ── Cash ──
export enum CashCollectionStatus {
  COLLECTED = 'collected',
  RECEIVED = 'received',
  DISCREPANCY = 'discrepancy',
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
