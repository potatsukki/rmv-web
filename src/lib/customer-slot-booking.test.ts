import { describe, expect, it } from 'vitest';

import { describeCustomerSlotBooking, type CustomerSlotBooking } from './customer-slot-booking';

// User request 2026-11-27: clicking an "Already booked" slot shows the customer's own appointment.
const consultation: CustomerSlotBooking = {
  appointmentId: 'appt-1', appointmentNumber: 'APT-20261127-0003', type: 'office',
  date: '2026-11-27', slotCode: '13:00', status: 'confirmed', salesStaffAssigned: true,
};

describe('describeCustomerSlotBooking', () => {
  it('describes a consultation with its number, one-hour time range and status', () => {
    const details = describeCustomerSlotBooking(consultation);
    expect(details.kind).toBe('Consultation');
    expect(details.reference).toBe('APT-20261127-0003');
    expect(details.when).toBe('Nov 27, 2026 · 1:00 PM – 2:00 PM');
    expect(details.status.label).toBe('Appointed');
  });

  it('names a project ocular visit with its project number', () => {
    const details = describeCustomerSlotBooking({
      ...consultation, type: 'ocular', slotCode: '15:00', projectNumber: 'PRJ-2026-00120',
    });
    expect(details.kind).toBe('Ocular Visit');
    expect(details.reference).toBe('APT-20261127-0003 · PRJ-2026-00120');
    expect(details.when).toBe('Nov 27, 2026 · 3:00 PM – 4:00 PM');
  });

  it('shows Requested while no sales staff is assigned', () => {
    const details = describeCustomerSlotBooking({ ...consultation, status: 'requested', salesStaffAssigned: false });
    expect(details.status.label).toBe('Requested');
  });
});
