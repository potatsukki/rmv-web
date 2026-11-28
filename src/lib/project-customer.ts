import { formatPersonName } from '@/lib/address';
import type { Project } from '@/lib/types';

/**
 * Customer's display name for a project. The project detail API sends the
 * customer as a populated `customerId`, not as `customerName`.
 */
export function projectCustomerName(project: Pick<Project, 'customerId' | 'customerName'>) {
  const explicit = typeof project.customerName === 'string' ? project.customerName.trim() : '';
  if (explicit) return explicit;
  const customer = project.customerId;
  if (!customer || typeof customer === 'string') return '';
  return formatPersonName(customer.firstName, customer.lastName);
}
