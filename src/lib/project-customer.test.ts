import { describe, expect, it } from 'vitest';
import { projectCustomerName } from './project-customer';

describe('projectCustomerName', () => {
  it('reads the populated customer like the projects list', () => {
    expect(projectCustomerName({ customerId: { _id: 'c1', firstName: 'kiryu', lastName: 'KAZUMA' } })).toBe('Kiryu Kazuma');
  });

  it('prefers an explicit customerName', () => {
    expect(projectCustomerName({ customerId: { _id: 'c1', firstName: 'A', lastName: 'B' }, customerName: ' Juan Dela Cruz ' })).toBe('Juan Dela Cruz');
  });

  it('returns nothing for an unpopulated or missing customer', () => {
    expect(projectCustomerName({ customerId: 'c1' })).toBe('');
    expect(projectCustomerName({ customerId: '' })).toBe('');
    expect(projectCustomerName({ customerId: 'c1', customerName: '  ' })).toBe('');
  });
});
