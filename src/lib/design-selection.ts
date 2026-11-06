import { SERVICE_TYPE_LABELS } from './constants';

export const MAX_SELECTED_DESIGNS = 20;

interface DesignSelectionIdentity {
  id: string;
  serviceId: string;
}

export function hasDesignSelection(
  selectedDesigns: DesignSelectionIdentity[],
  design: DesignSelectionIdentity,
) {
  return selectedDesigns.some((selected) => (
    selected.id === design.id && selected.serviceId === design.serviceId
  ));
}

export function toggleDesignSelection<T extends DesignSelectionIdentity>(
  selectedDesigns: T[],
  design: T,
) {
  return hasDesignSelection(selectedDesigns, design)
    ? selectedDesigns.filter((selected) => (
        selected.id !== design.id || selected.serviceId !== design.serviceId
      ))
    : [...selectedDesigns, design];
}

interface ReportItemIdentity {
  serviceType?: string;
  serviceTypeCustom?: string;
  selectedDesignTemplateId?: string;
  selectedDesignTemplateName?: string;
}

/** Category of a visit report item, e.g. "Gates" or a custom label. */
export function getReportItemCategory(report: ReportItemIdentity) {
  return report.serviceTypeCustom?.trim()
    || (report.serviceType ? SERVICE_TYPE_LABELS[report.serviceType] || report.serviceType : '')
    || 'Untitled Item';
}

/** Item label: the customer-selected design name, else its category. */
export function getReportItemLabel(report: ReportItemIdentity) {
  return report.selectedDesignTemplateName?.trim() || getReportItemCategory(report);
}

/** One item per selected design; reports without a design are one item per service. */
export function getReportItemKey(report: ReportItemIdentity) {
  const designId = report.selectedDesignTemplateId?.trim();
  return designId ? `design:${designId}` : `type:${report.serviceType || 'custom'}`;
}
