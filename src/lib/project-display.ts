type ProjectSiteAddressSource = {
  siteAddress?: string;
  siteAddressStructured?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    zip?: string;
    addressType?: 'personal' | 'business';
  };
  visitReportId?: unknown;
};

export function getItemScopedProjectValue<T>(
  itemValue: T | undefined,
  legacyProjectValue: T | undefined,
  hasMultipleItems: boolean,
) {
  return hasMultipleItems ? itemValue : itemValue ?? legacyProjectValue;
}

function isPlaceholderAddress(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return true;
  return /^(tbd|n\/a|na|unknown)$/i.test(normalized);
}

function formatStructuredAddress(structured?: ProjectSiteAddressSource['siteAddressStructured']) {
  if (!structured) return '';
  const parts = [structured.street, structured.barangay, structured.city, structured.province, structured.zip]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.join(', ');
}

function getVisitReportAddress(report?: unknown) {
  if (!report) return '';

  const typedReport = report as {
    appointmentId?: string | { formattedAddress?: string; customerAddress?: string };
    recommendedOcularAddress?: { formattedAddress?: string };
  };
  const appointment = typeof typedReport.appointmentId === 'string' ? null : typedReport.appointmentId;
  const ocularAddress = typedReport.recommendedOcularAddress?.formattedAddress?.trim() || '';
  const appointmentAddress = appointment?.formattedAddress?.trim() || appointment?.customerAddress?.trim() || '';
  const formatted = ocularAddress || appointmentAddress;

  return isPlaceholderAddress(formatted) ? '' : formatted;
}

export function getProjectDisplaySiteAddress(project?: ProjectSiteAddressSource | null, visitReport?: unknown) {
  if (!project) return '';

  const directAddress = isPlaceholderAddress(project.siteAddress) ? '' : project.siteAddress?.trim() || '';
  if (directAddress) return directAddress;

  const structuredAddress = formatStructuredAddress(project.siteAddressStructured);
  if (structuredAddress) return structuredAddress;

  const visitReportAddress = getVisitReportAddress(visitReport || project.visitReportId);
  return visitReportAddress;
}
