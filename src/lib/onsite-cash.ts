import { AppointmentStatus, AppointmentType } from '@/lib/constants';
import type { CashCollection } from '@/lib/types';

/**
 * On-site cash: during the ocular visit the sales staff records the cash the customer hands over for
 * the ocular fee (outside Metro Manila) or the design fee. It counts as paid at once; the cashier
 * receives the cash later in Cash Flow.
 */

/** The sales staff is at the site, or has just finished the ocular visit. */
export const ONSITE_CASH_STATUSES: readonly string[] = [
  AppointmentStatus.ARRIVED_AT_SITE,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
];

export interface OcularFeeState {
  type?: string;
  status?: string;
  ocularFee?: number | null;
  ocularFeePaid?: boolean;
  ocularFeeStatus?: string | null;
  ocularFeeBreakdown?: { total?: number } | null;
}

/** Unpaid ocular fee statuses the customer can still pay (`cash_pending` = old "pay on-site" choice). */
export const UNPAID_OCULAR_FEE_STATUSES = ['pending', 'cash_pending', 'declined'] as const;

export function isUnpaidOcularFeeStatus(status?: string | null) {
  return (UNPAID_OCULAR_FEE_STATUSES as readonly string[]).includes(status ?? '');
}

export function ocularFeeAmount(appointment: OcularFeeState) {
  return appointment.ocularFee ?? appointment.ocularFeeBreakdown?.total ?? 0;
}

/** The ocular fee is still due and no online payment is waiting for the cashier. */
export function ocularFeeAwaitingCash(appointment: OcularFeeState) {
  return appointment.type === AppointmentType.OCULAR
    && ocularFeeAmount(appointment) > 0
    && !appointment.ocularFeePaid
    && appointment.ocularFeeStatus !== 'proof_submitted';
}

/** The assigned sales staff can record the customer's cash now (at the site or right after the visit). */
export function canRecordOcularCashNow(appointment: OcularFeeState) {
  return ocularFeeAwaitingCash(appointment) && ONSITE_CASH_STATUSES.includes(appointment.status ?? '');
}

export type OnsiteCashKind = 'ocular' | 'design';

export function onsiteCashCopy(kind: OnsiteCashKind) {
  const fee = kind === 'ocular' ? 'ocular fee' : 'design fee';
  return {
    fee,
    title: kind === 'ocular' ? 'Record Cash Payment' : 'Collect Design Fee (Cash)',
    description: `Record the ${fee} the customer paid you in cash${kind === 'ocular' ? ' during the ocular visit' : ''}. It is marked paid right away and the customer gets an acknowledgement with a Collection No. The cashier issues the official receipt when you turn over the cash.`,
    acknowledgment: `The customer acknowledged in person that the ${fee} is non-refundable.`,
  };
}

/** The in-person acknowledgment is needed only when the customer has not confirmed it in the app. */
export function canSubmitOnsiteCash(customerAcknowledged: boolean, acknowledgedInPerson: boolean) {
  return customerAcknowledged || acknowledgedInPerson;
}

export function cashPersonName(ref: CashCollection['salesStaffId'] | undefined) {
  return ref && typeof ref === 'object' ? `${ref.firstName} ${ref.lastName}`.trim() : undefined;
}

/** "Collection No. CC-2026-00001 · OR pending" / "… · OR RMV-2026-00042" for a Cash Flow row. */
export function describeCollectionReceipt(collection: Pick<CashCollection, 'collectionNumber' | 'receiptNumber'>) {
  const or = collection.receiptNumber ? `OR ${collection.receiptNumber}` : 'OR pending';
  return collection.collectionNumber ? `Collection No. ${collection.collectionNumber} · ${or}` : collection.receiptNumber ? or : '';
}

/** Cash Flow row label, e.g. "Ocular Fee · Juan Dela Cruz · APT-20261126-0001". */
export function describeCashCollection(collection: CashCollection) {
  const fee = collection.feeType === 'design_fee' ? 'Design Fee' : 'Ocular Fee';
  const project = typeof collection.projectId === 'object' ? collection.projectId : undefined;
  const appointment = typeof collection.appointmentId === 'object' ? collection.appointmentId : undefined;
  const reference = project ? project.projectNumber || project.title : appointment?.appointmentNumber;
  return [fee, collection.customerName || cashPersonName(collection.customerId), reference].filter(Boolean).join(' · ');
}
