import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format, addDays, getDay, startOfDay } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Send,
  RotateCcw,
  Ruler,
  Paintbrush,
  StickyNote,
  Camera,
  Calendar as CalendarIcon,
  MapPin,
  Layers,
  FolderOpen,
  AlertTriangle,
  Wrench,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { extractErrorMessage, extractLocalDateValue, serializeDateOnlyAsUtcNoon, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { PageError } from '@/components/shared/PageError';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PhotoUploadGrid } from '@/components/shared/PhotoUploadGrid';
import { FileUpload } from '@/components/shared/FileUpload';
import { ProjectNavigator } from '@/components/shared/ProjectNavigator';
import { DesignTemplateSelector } from '@/components/shared/DesignTemplateSelector';
import { ServiceSpecificationForm } from '@/components/shared/ServiceSpecificationForm';
import {
  useVisitReport,
  useUpdateVisitReport,
  useSubmitVisitReport,
  useReturnVisitReport,
  useReopenVisitReportForRepair,
  useVisitReportsByAppointment,
} from '@/hooks/useVisitReports';
import { useProjectByVisitReport } from '@/hooks/useProjects';
import { useHolidays } from '@/hooks/useConfig';
import { useAuthStore } from '@/stores/auth.store';
import {
  Role,
  AppointmentAttendanceStatus,
  ContractStatus,
  VisitReportStatus,
  ServiceType,
  MeasurementUnit,
  SERVICE_TYPE_LABELS,
  MEASUREMENT_UNIT_LABELS,
  ENVIRONMENT_LABELS,
  Environment,
  SLOT_CODES,
} from '@/lib/constants';
import type { ApiResponse, LineItem, ServiceSpecifications, SiteConditions, UserAddress, VisitReport } from '@/lib/types';
import { getDesignTemplatePlaceholderImage, type DesignTemplate } from '@/lib/design-templates';
import { getMissingRequiredSpecificationFields, getServiceSpecificationSchema, hasMeaningfulSpecifications, mergeSpecificationsWithDefaults } from '@/lib/service-specifications';


const DEFAULT_SITE_CONDITIONS: SiteConditions = {
  environment: Environment.INDOOR,
  hasElectrical: false,
  hasPlumbing: false,
};

function formatSlotTime(slotCode: string): string {
  const hour = parseInt(slotCode.split(':')[0] ?? '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

/** Mongoose populate may return an object with _id; this always gives the raw string ID. */
function rawId(field: unknown): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object' && '_id' in (field as Record<string, unknown>))
    return String((field as Record<string, unknown>)._id);
  return String(field);
}

function addressSelectionKey(address?: UserAddress | null): string {
  if (!address) return '';
  return address.id
    || address.formattedAddress
    || [address.street, address.barangay, address.city, address.province, address.zip].filter(Boolean).join(', ');
}

function isNonEmptyString(value?: string | null) {
  return Boolean(value?.trim());
}

function resolveVisitType(
  reportVisitType?: string,
  appointmentType?: string,
) {
  if (appointmentType === 'ocular') return 'ocular';
  if (appointmentType === 'office') return 'consultation';
  return reportVisitType || '';
}

function getIncompleteOcularFields(report: {
  actualVisitDateTime?: string;
  lineItems?: LineItem[];
  measurements?: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    thickness?: number;
    raw?: string;
  };
  siteConditions?: SiteConditions;
  materials?: string;
  finishes?: string;
  preferredDesign?: string;
  specifications?: ServiceSpecifications;
  photoKeys?: string[];
  initialDesignKeys?: string[];
  initialDesignNotes?: string;
  selectedDesignTemplateId?: string;
  selectedDesignTemplateName?: string;
  selectedDesignTemplateImageUrl?: string;
}) {
  const missing: string[] = [];

  if (!isNonEmptyString(report.actualVisitDateTime)) {
    missing.push('actual visit date and time');
  }

  const lineItems = (report.lineItems || []).filter((item) => item.label?.trim());
  const hasSpecMeasurements = hasMeaningfulSpecifications(report.specifications, 'measurements');
  if (lineItems.length > 0 && !hasSpecMeasurements) {
    lineItems.forEach((item, index) => {
      const isComplete = isNonEmptyString(item.label)
        && item.quantity >= 1
        && item.length != null
        && item.width != null
        && item.height != null
        && item.thickness != null
        && item.area != null
        && isNonEmptyString(item.notes);

      if (!isComplete) {
        missing.push(`complete measurement details for line item ${index + 1}`);
      }
    });
  } else {
    const legacy = report.measurements;
    const hasCompleteLegacyMeasurements = Boolean(
      legacy
      && legacy.length != null
      && legacy.width != null
      && legacy.height != null
      && legacy.thickness != null
      && legacy.area != null
      && isNonEmptyString(legacy.raw),
    );

    if (!hasCompleteLegacyMeasurements && !hasSpecMeasurements) {
      missing.push('at least one complete measurement item');
    }
  }

  if (!hasMeaningfulSpecifications(report.specifications, 'siteConditions')) {
    if (!isNonEmptyString(report.siteConditions?.environment)) missing.push('site environment');
    if (!isNonEmptyString(report.siteConditions?.floorType)) missing.push('floor type');
    if (!isNonEmptyString(report.siteConditions?.wallMaterial)) missing.push('wall material');
    if (!isNonEmptyString(report.siteConditions?.accessNotes)) missing.push('access notes');
    if (!isNonEmptyString(report.siteConditions?.obstaclesOrConstraints)) missing.push('obstacles or constraints');
  }

  if (!hasMeaningfulSpecifications(report.specifications, 'materialsDesign')) {
    if (!isNonEmptyString(report.materials)) missing.push('materials');
    if (!isNonEmptyString(report.finishes)) missing.push('finishes');
    if (!isNonEmptyString(report.preferredDesign)) missing.push('preferred design');
  }
  if ((report.photoKeys?.length || 0) === 0) missing.push('site photos');
  const hasInitialDesignReference = (report.initialDesignKeys?.length || 0) > 0
    || isNonEmptyString(report.selectedDesignTemplateId)
    || isNonEmptyString(report.selectedDesignTemplateName)
    || isNonEmptyString(report.selectedDesignTemplateImageUrl);
  if (!hasInitialDesignReference) missing.push('initial design files');

  return [...new Set(missing)];
}

function formatIncompleteOcularMessage(missingFields: string[]) {
  return `You have not yet provided information on: ${missingFields.join(', ')}.`;
}

function getServiceTypeLabel(serviceType?: string, customLabel?: string) {
  if (serviceType === ServiceType.CUSTOM) return customLabel || 'Custom';
  return serviceType ? SERVICE_TYPE_LABELS[serviceType] || serviceType : 'Custom';
}

function getAppointmentServiceLabels(appointment: unknown) {
  if (!appointment || typeof appointment !== 'object') return [];

  const value = appointment as {
    serviceTypes?: string[];
    serviceType?: string;
    serviceTypeCustom?: string;
  };
  const serviceTypes = value.serviceTypes?.length
    ? value.serviceTypes
    : value.serviceType
      ? [value.serviceType]
      : [];

  return serviceTypes.map((serviceType) => getServiceTypeLabel(serviceType, value.serviceTypeCustom));
}

function getAppointmentServiceTypeChoices(appointment: unknown) {
  if (!appointment || typeof appointment !== 'object') return [];

  const value = appointment as {
    serviceTypes?: string[];
    serviceType?: string;
    customerSiteDetails?: {
      serviceTypes?: string[];
    };
  };

  const combined = [
    ...(value.serviceTypes || []),
    ...(value.customerSiteDetails?.serviceTypes || []),
    ...(value.serviceType ? [value.serviceType] : []),
  ].filter(Boolean);

  return [...new Set(combined)];
}

function getLocalVisitParts(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const isoLocal = local.toISOString().slice(0, 16);
  return {
    dateTime: isoLocal,
    date: isoLocal.slice(0, 10),
    slot: `${String(local.getHours()).padStart(2, '0')}:00`,
  };
}

function sanitizeSpecificationsForSave(value: ServiceSpecifications): ServiceSpecifications | undefined {
  const next: ServiceSpecifications = {};

  Object.entries(value || {}).forEach(([sectionKey, sectionValue]) => {
    if (!sectionValue || typeof sectionValue !== 'object') return;

    const cleanSection: Record<string, string | number | boolean> = {};
    Object.entries(sectionValue as Record<string, unknown>).forEach(([fieldKey, fieldValue]) => {
      if (fieldValue === '' || fieldValue === null || fieldValue === undefined) return;
      if (typeof fieldValue === 'number' && !Number.isFinite(fieldValue)) return;
      if (typeof fieldValue === 'string' && fieldValue.trim() === '') return;
      if (typeof fieldValue === 'string' || typeof fieldValue === 'number' || typeof fieldValue === 'boolean') {
        cleanSection[fieldKey] = fieldValue;
      }
    });

    if (Object.keys(cleanSection).length > 0) {
      next[sectionKey as keyof ServiceSpecifications] = cleanSection;
    }
  });

  return Object.keys(next).length > 0 ? next : undefined;
}

function sanitizeLineItemsForSave(items: LineItem[]): LineItem[] {
  return items
    .filter((item) => item.label?.trim())
    .map((item) => {
      const cleanItem: LineItem = {
        label: item.label.trim(),
        quantity: Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1,
      };

      (['length', 'width', 'height', 'area', 'thickness'] as const).forEach((key) => {
        const value = item[key];
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          cleanItem[key] = value;
        }
      });

      if (item.notes?.trim()) {
        cleanItem.notes = item.notes.trim();
      }

      return cleanItem;
    });
}

export function VisitReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { data: report, isLoading, isError, refetch } = useVisitReport(id!);
  const appointmentId = report ? rawId(report.appointmentId) : isError && id ? id : '';
  const { data: siblingReports, isLoading: isAppointmentReportLookupLoading } = useVisitReportsByAppointment(appointmentId);

  const updateMutation = useUpdateVisitReport();
  const submitMutation = useSubmitVisitReport();
  const returnMutation = useReturnVisitReport();
  const reopenMutation = useReopenVisitReportForRepair();

  // Fetch the linked project (only when report is submitted/completed)
  const { data: linkedProject } = useProjectByVisitReport(
    report && report.status !== VisitReportStatus.DRAFT ? id : undefined,
  );

  const [submitOpen, setSubmitOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [repairReason, setRepairReason] = useState('');

  // ── Form state ──
  const [visitType, setVisitType] = useState('');
  const [actualVisitDateTime, setActualVisitDateTime] = useState('');
  const [actualVisitDate, setActualVisitDate] = useState('');   // 'YYYY-MM-DD'
  const [actualVisitTime, setActualVisitTime] = useState('');   // slot code e.g. '09:00'
  const [serviceType, setServiceType] = useState(ServiceType.CUSTOM as string);
  const [serviceTypeCustom, setServiceTypeCustom] = useState('');
  const [materials, setMaterials] = useState('');
  const [finishes, setFinishes] = useState('');
  const [preferredDesign, setPreferredDesign] = useState('');
  const [specifications, setSpecifications] = useState<ServiceSpecifications>({});
  const [customerRequirements, setCustomerRequirements] = useState('');
  const [notes, setNotes] = useState('');

  const [discussionNotes, setDiscussionNotes] = useState('');
  const [consultationOutcome, setConsultationOutcome] = useState<'schedule_ocular' | 'no_ocular'>('schedule_ocular');
  const [noOcularReason, setNoOcularReason] = useState('');
  const [initialDesignKeys, setInitialDesignKeys] = useState<string[]>([]);
  const [initialDesignNotes, setInitialDesignNotes] = useState('');
  const [selectedDesignTemplateId, setSelectedDesignTemplateId] = useState('');
  const [selectedDesignTemplateName, setSelectedDesignTemplateName] = useState('');
  const [selectedDesignTemplateImageUrl, setSelectedDesignTemplateImageUrl] = useState('');
  const [initialDesignUploading, setInitialDesignUploading] = useState(false);
  const [recommendedOcularDate, setRecommendedOcularDate] = useState('');
  const [recommendedOcularSlot, setRecommendedOcularSlot] = useState('');
  const [selectedOcularAddressId, setSelectedOcularAddressId] = useState('');
  const [customerSavedAddresses, setCustomerSavedAddresses] = useState<UserAddress[]>([]);
  const [ocularDateOpen, setOcularDateOpen] = useState(false);

  // Measurements
  const [measurementUnit, setMeasurementUnit] = useState(MeasurementUnit.CM as string);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Legacy measurements (for old reports)
  const [legacyLength, setLegacyLength] = useState('');
  const [legacyWidth, setLegacyWidth] = useState('');
  const [legacyHeight, setLegacyHeight] = useState('');
  const [legacyThickness, setLegacyThickness] = useState('');
  const [legacyMeasurementNotes, setLegacyMeasurementNotes] = useState('');

  // Site conditions
  const [siteConditions, setSiteConditions] = useState<SiteConditions>(DEFAULT_SITE_CONDITIONS);

  // File uploads
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [videoKeys, setVideoKeys] = useState<string[]>([]);
  const [sketchKeys, setSketchKeys] = useState<string[]>([]);
  const [referenceImageKeys, setReferenceImageKeys] = useState<string[]>([]);

  const [formLoaded, setFormLoaded] = useState(false);
  const [noOcularProjectEntryStarted, setNoOcularProjectEntryStarted] = useState(false);
  const [isSwitchingReport, setIsSwitchingReport] = useState(false);
  const saveDraftInFlightRef = useRef<Promise<VisitReport | null> | null>(null);
  const sourcePath = (location.state as { from?: string } | null)?.from;

  // Reset form when switching between reports (route :id changes)
  useEffect(() => {
    setFormLoaded(false);
    setNoOcularProjectEntryStarted(false);
    setIsSwitchingReport(false);
  }, [id]);

  useEffect(() => {
    if (consultationOutcome !== 'no_ocular') {
      setNoOcularProjectEntryStarted(false);
    }
  }, [consultationOutcome]);

  // Keep actualVisitDateTime in sync with separate date/time pickers
  useEffect(() => {
    if (actualVisitDate && actualVisitTime) {
      setActualVisitDateTime(`${actualVisitDate}T${actualVisitTime}`);
    } else if (actualVisitDate) {
      setActualVisitDateTime(`${actualVisitDate}T09:00`);
    } else {
      setActualVisitDateTime('');
    }
  }, [actualVisitDate, actualVisitTime]);

  // Fetch holidays & blocked slots for the selected visit date
  const visitDateYear = actualVisitDate ? actualVisitDate.slice(0, 4) : String(new Date().getFullYear());
  const { data: holidays } = useHolidays(visitDateYear);
  const appointmentType =
    report?.appointmentId && typeof report.appointmentId === 'object' && 'type' in (report.appointmentId as Record<string, unknown>)
      ? String((report.appointmentId as Record<string, unknown>).type)
      : undefined;
  const effectiveVisitType = resolveVisitType(report?.visitType, appointmentType);

  useEffect(() => {
    if (!report || effectiveVisitType !== 'consultation') return;
    const customerId = rawId(report.customerId);
    if (!customerId) return;

    let cancelled = false;
    api.get<ApiResponse<{ addressData?: UserAddress; savedAddresses?: UserAddress[] }>>(`/users/customers/${customerId}`)
      .then((res) => {
        if (cancelled) return;
        const customer = res.data.data;
        const addressMap = new Map<string, UserAddress>();
        [...(customer.savedAddresses || []), ...(customer.addressData ? [customer.addressData] : [])]
          .filter((address) => address.formattedAddress && address.lat != null && address.lng != null)
          .forEach((address) => {
            const key = addressSelectionKey(address);
            if (!key) return;
            const existing = addressMap.get(key);
            addressMap.set(key, existing ? { ...address, ...existing, isDefault: Boolean(existing.isDefault || address.isDefault) } : address);
          });
        const addresses = Array.from(addressMap.values());
        setCustomerSavedAddresses(addresses);
        const current = report.recommendedOcularAddressId || addressSelectionKey(report.recommendedOcularAddress);
        const defaultAddress = addresses.find((address) => addressSelectionKey(address) === current)
          || addresses.find((address) => address.isDefault)
          || addresses[0];
        setSelectedOcularAddressId(addressSelectionKey(defaultAddress));
      })
      .catch(() => {
        if (!cancelled) setCustomerSavedAddresses([]);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveVisitType, report?._id, report?.customerId]);

  // Build a set of holiday dates for fast lookup (YYYY-MM-DD)
  const holidayDates = useMemo(() => {
    if (!holidays) return new Set<string>();
    return new Set(holidays.map(h => h.date.slice(0, 10)));
  }, [holidays]);

  const isSalesStaff = user?.roles.includes(Role.SALES_STAFF);
  const isAdmin = user?.roles.includes(Role.ADMIN);
  const isEngineerOrAdmin =
    user?.roles.includes(Role.ENGINEER) || user?.roles.includes(Role.ADMIN);
  const linkedProjectId = linkedProject?._id || (report?.linkedProjectId ? rawId(report.linkedProjectId) : '');
  const isNoOcularProjectEntry = effectiveVisitType === 'consultation' && consultationOutcome === 'no_ocular';
  const isNoOcularProjectEntryPersisted = isNoOcularProjectEntry
    && (report?.consultationOutcome === 'no_ocular' || noOcularProjectEntryStarted);
  const isProjectCreationMode = effectiveVisitType === 'ocular' || isNoOcularProjectEntryPersisted;
  const canEditProjectDetailsInReport = effectiveVisitType === 'consultation' || isProjectCreationMode;
  const isConsultationDraftProject =
    effectiveVisitType === 'consultation' && linkedProject?.status === 'draft';

  // Calculation of payment dependency
  const appointment = report?.appointmentId;
  const isPopulatedAppt = appointment && typeof appointment === 'object' && 'ocularFeePaid' in (appointment as any);
  const appointmentRecord = appointment && typeof appointment === 'object'
    ? appointment as {
      _id?: string;
      type?: string;
      date?: string;
      slotCode?: string;
      status?: string;
      customerName?: string;
      customerPhone?: string;
      attendanceStatus?: string;
      actualArrivalAt?: string;
      consultationStartedAt?: string;
      consultationCompletedAt?: string;
      attendanceNotes?: string;
    }
    : null;
  const isAssignedSalesStaff = Boolean(
    isSalesStaff && appointmentRecord && (appointmentRecord as any).salesStaffId && rawId((appointmentRecord as any).salesStaffId) === String(user?._id),
  );
  const attendanceStatus = appointmentRecord?.attendanceStatus || AppointmentAttendanceStatus.SCHEDULED;
  const contactPersonLabel = [
    appointmentRecord?.customerName || report?.customerName,
    appointmentRecord?.customerPhone,
  ].filter(Boolean).join(' • ');
  const scheduledOcularVisitDateTime =
    effectiveVisitType === 'ocular' && appointmentRecord?.date && appointmentRecord?.slotCode
      ? `${appointmentRecord.date}T${appointmentRecord.slotCode}`
      : undefined;

  const isOcularFeeUnpaidOutsideNcr =
    effectiveVisitType === 'ocular' &&
    isPopulatedAppt &&
    !(appointment as any).ocularFeeBreakdown?.isWithinNCR &&
    ((appointment as any).ocularFee || 0) > 0 &&
    !(appointment as any).ocularFeePaid;

  const isSubmissionBlocked = isOcularFeeUnpaidOutsideNcr;
  const siblingScheduleSource = effectiveVisitType === 'consultation'
    ? siblingReports?.find((sibling) => Boolean(sibling.actualVisitDateTime))
    : undefined;
  const sharedActualVisitDateTime = report?.actualVisitDateTime || siblingScheduleSource?.actualVisitDateTime;
  const siblingOcularScheduleSource = effectiveVisitType === 'consultation'
    ? siblingReports?.find((sibling) => Boolean(sibling.recommendedOcularDate || sibling.recommendedOcularSlot))
    : undefined;
  const sharedRecommendedOcularDate = report?.recommendedOcularDate || siblingOcularScheduleSource?.recommendedOcularDate;
  const sharedRecommendedOcularSlot = report?.recommendedOcularSlot || siblingOcularScheduleSource?.recommendedOcularSlot;
  const isRecommendedOcularScheduleLocked = Boolean(
    effectiveVisitType === 'consultation'
    && siblingOcularScheduleSource
    && rawId(siblingOcularScheduleSource._id) !== id
    && sharedRecommendedOcularDate
    && sharedRecommendedOcularSlot,
  );
  const selectedOcularAddress = customerSavedAddresses.find((address) => addressSelectionKey(address) === selectedOcularAddressId)
    || customerSavedAddresses.find((address) => address.isDefault)
    || customerSavedAddresses[0];
  const hasSelectableOcularAddress = Boolean(selectedOcularAddress);
  const reportMatchesRoute = Boolean(report && rawId(report._id) === id);

  useEffect(() => {
    if (report && id && rawId(report._id) !== id) {
      navigate(`/visit-reports/${rawId(report._id)}`, { replace: true, state: location.state });
    }
  }, [id, location.state, navigate, report]);

  useEffect(() => {
    if (!isError || !id || !siblingReports?.length) return;
    navigate(`/visit-reports/${rawId(siblingReports[0]!._id)}`, { replace: true, state: location.state });
  }, [id, isError, location.state, navigate, siblingReports]);

  // Pre-fill form when data arrives
  if (report && reportMatchesRoute && !formLoaded) {
    setVisitType(effectiveVisitType);
    // Convert UTC ISO string to local date + time for split pickers
    const sharedVisitParts = getLocalVisitParts(sharedActualVisitDateTime);
    if (sharedVisitParts) {
      setActualVisitDateTime(sharedVisitParts.dateTime);
      setActualVisitDate(sharedVisitParts.date);
      setActualVisitTime(sharedVisitParts.slot);
    } else {
      setActualVisitDateTime('');
      setActualVisitDate('');
      setActualVisitTime('');
    }
    setServiceType(report.serviceType || ServiceType.CUSTOM);
    setServiceTypeCustom(report.serviceTypeCustom || '');
    setMaterials(report.materials || '');
    setFinishes(report.finishes || '');
    setPreferredDesign(report.preferredDesign || '');
    setSpecifications(mergeSpecificationsWithDefaults(report.serviceType, report.specifications));
    setCustomerRequirements(report.customerRequirements || '');
    setNotes(report.notes || '');

    // Consultation-specific fields
    setDiscussionNotes(report.discussionNotes || '');
    setConsultationOutcome(report.consultationOutcome || (sharedRecommendedOcularDate || sharedRecommendedOcularSlot ? 'schedule_ocular' : 'schedule_ocular'));
    setNoOcularReason(report.noOcularReason || '');
    setInitialDesignKeys(report.initialDesignKeys || []);
    setInitialDesignNotes(report.initialDesignNotes || '');
    setSelectedDesignTemplateId(report.selectedDesignTemplateId || '');
    setSelectedDesignTemplateName(report.selectedDesignTemplateName || '');
    setSelectedDesignTemplateImageUrl(report.selectedDesignTemplateImageUrl || '');
    setRecommendedOcularDate(sharedRecommendedOcularDate ? extractLocalDateValue(sharedRecommendedOcularDate) : '');
    setRecommendedOcularSlot(sharedRecommendedOcularSlot || '');
    setSelectedOcularAddressId(report.recommendedOcularAddressId || report.recommendedOcularAddress?.id || '');

    // New measurement system
    setMeasurementUnit(report.measurementUnit || MeasurementUnit.CM);
    setLineItems(report.lineItems || []);

    // Legacy measurements
    if (report.measurements) {
      setLegacyLength(report.measurements.length?.toString() || '');
      setLegacyWidth(report.measurements.width?.toString() || '');
      setLegacyHeight(report.measurements.height?.toString() || '');
      setLegacyThickness(report.measurements.thickness?.toString() || '');
      setLegacyMeasurementNotes(report.measurements.raw || '');
    }

    // Site conditions
    if (report.siteConditions) {
      setSiteConditions(report.siteConditions);
    }

    // File keys
    setPhotoKeys(report.photoKeys || []);
    setVideoKeys(report.videoKeys || []);
    setSketchKeys(report.sketchKeys || []);
    setReferenceImageKeys(report.referenceImageKeys || []);

    setFormLoaded(true);
  }

  const missingSpecificationWarnings = useMemo(
    () => getMissingRequiredSpecificationFields(serviceType, specifications),
    [serviceType, specifications],
  );

  if (isLoading) return <PageLoader />;
  if (isError && isAppointmentReportLookupLoading) return <PageLoader />;
  if (isError || !report) return <PageError onRetry={refetch} />;
  if (!reportMatchesRoute || !formLoaded) return <PageLoader />;

  const isDraft = report.status === VisitReportStatus.DRAFT;
  const isReturned = report.status === VisitReportStatus.RETURNED;
  const isSubmitted = report.status === VisitReportStatus.SUBMITTED;
  const isCompleted = report.status === VisitReportStatus.COMPLETED;
  const canEdit = isSalesStaff && (isDraft || isReturned);
  const canReturn =
    isEngineerOrAdmin && isSubmitted;
  const reportHasMeasuredLineItems = Boolean(report.lineItems?.some((item) =>
    item.length != null ||
    item.width != null ||
    item.height != null ||
    item.area != null ||
    item.thickness != null,
  ));
  const reportHasLegacyMeasurements = Boolean(
    report.measurements && (
      report.measurements.length != null ||
      report.measurements.width != null ||
      report.measurements.height != null ||
      report.measurements.area != null ||
      report.measurements.thickness != null ||
      report.measurements.raw
    ),
  );
  const reportHasMeasurements = reportHasMeasuredLineItems || reportHasLegacyMeasurements;
  const reportHasMeaningfulSpecifications = hasMeaningfulSpecifications(report.specifications);
  const canReopenForRepair = Boolean(
    effectiveVisitType === 'ocular' &&
    !canEdit &&
    !reportHasMeasurements &&
    (isSalesStaff || isAdmin) &&
    (isSubmitted || isCompleted)
  );

  // Detect if this is an old-style report (has legacy measurements but no lineItems)
  const isLegacyReport = !!(
    report.measurements &&
    (report.measurements.length != null ||
      report.measurements.width != null ||
      report.measurements.height != null) &&
    (!report.lineItems || report.lineItems.length === 0)
  );

  const serviceLabel =
    getServiceTypeLabel(serviceType, serviceTypeCustom);
  const headerServiceLabels = getAppointmentServiceLabels(report.appointmentId);
  const siblingServiceLabels = (siblingReports || [])
    .map((sibling) => getServiceTypeLabel(sibling.serviceType, sibling.serviceTypeCustom));
  const appointmentServiceLabel = [...new Set(
    (headerServiceLabels.length ? headerServiceLabels : siblingServiceLabels)
      .filter(Boolean),
  )].join(', ') || serviceLabel;
  const appointmentItemNames = appointmentServiceLabel
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const appointmentServiceChoices = getAppointmentServiceTypeChoices(report.appointmentId);
  const appointmentItemsText = appointmentItemNames.length > 1
    ? `both items (${appointmentItemNames.join(' and ')})`
    : `the item (${appointmentItemNames[0] || serviceLabel})`;
  const relatedOcularAppointment = report.relatedOcularAppointment;
  const appointmentNavigationId = relatedOcularAppointment?._id || rawId(report.appointmentId);
  const relatedOcularHasLocation = Boolean(
    relatedOcularAppointment?.customerLocation
    || relatedOcularAppointment?.formattedAddress
    || relatedOcularAppointment?.customerAddress,
  );
  const relatedOcularFeeRequired = Boolean((relatedOcularAppointment?.ocularFee || 0) > 0);
  const relatedOcularFeeConfirmed = Boolean(
    relatedOcularAppointment?.ocularFeePaid
    || relatedOcularAppointment?.ocularFeeStatus === 'verified'
    || relatedOcularAppointment?.ocularFeeStatus === 'cash_pending',
  );
  const ocularFollowUpStatus = !relatedOcularHasLocation
    ? {
      className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100',
      title: 'Waiting for Customer Site Location',
      description: 'The customer must submit the site map pin and address. The system will mark Metro Manila visits as free or require ocular fee payment when the site is outside Metro Manila.',
    }
    : relatedOcularFeeRequired && !relatedOcularFeeConfirmed
      ? {
        className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100',
        title: 'Waiting for Ocular Fee Payment',
        description: 'The customer submitted the site location. The ocular fee must be paid or marked for cash collection before the ocular visit can proceed.',
      }
      : {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-100',
        title: relatedOcularFeeRequired ? 'Site Location and Ocular Fee Confirmed' : 'Site Location Confirmed',
        description: relatedOcularFeeRequired
          ? 'The customer submitted the site map pin/address and the ocular fee is confirmed. Sales can proceed with the scheduled ocular visit.'
          : 'The customer submitted the site map pin/address. This Metro Manila ocular visit has no fee, so sales can proceed with the scheduled ocular visit.',
      };

  const handleDesignTemplateSelect = (template: DesignTemplate) => {
    setSelectedDesignTemplateId(template.id);
    setSelectedDesignTemplateName(template.title);
    setSelectedDesignTemplateImageUrl('');
    setMaterials(template.material);
    setFinishes(template.finish);
    setPreferredDesign(template.preferredDesign);
    setSpecifications(mergeSpecificationsWithDefaults(serviceType, template.suggestedSpecifications || specifications));
    setInitialDesignNotes(template.initialDesignNotes);
    setLineItems(template.suggestedLineItems.map((item) => ({ ...item })));
    toast.success(`${template.title} selected. You can still edit every populated field.`);
  };

  const saveDraft = async ({
    showSuccessToast = false,
    showErrorToast = true,
    syncSiblingReports = true,
  }: {
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    syncSiblingReports?: boolean;
  } = {}): Promise<VisitReport | null> => {
    if (saveDraftInFlightRef.current) {
      return saveDraftInFlightRef.current;
    }

    const savePromise = (async () => {
      try {
      const consultationVisitDateTime =
        effectiveVisitType === 'consultation'
          ? appointmentRecord?.consultationStartedAt
            || appointmentRecord?.actualArrivalAt
            || appointmentRecord?.consultationCompletedAt
            || sharedActualVisitDateTime
          : undefined;
      const visitDateTimeForSave = actualVisitDateTime || consultationVisitDateTime || scheduledOcularVisitDateTime;

      let normalizedActualVisitDateTime: string | undefined;
      if (visitDateTimeForSave) {
        const parsedDate = new Date(visitDateTimeForSave);
        if (Number.isNaN(parsedDate.getTime())) {
          if (showErrorToast) toast.error('Invalid visit date/time');
          return null;
        }
        normalizedActualVisitDateTime = parsedDate.toISOString();
      }

      // Build legacy measurements only if this is a legacy report
      let measurements: Record<string, unknown> | undefined;
      if (isLegacyReport) {
        measurements = {};
        if (legacyLength) measurements.length = parseFloat(legacyLength);
        if (legacyWidth) measurements.width = parseFloat(legacyWidth);
        if (legacyHeight) measurements.height = parseFloat(legacyHeight);
        if (legacyThickness) measurements.thickness = parseFloat(legacyThickness);
        if (legacyMeasurementNotes) measurements.raw = legacyMeasurementNotes;
      if (!Object.keys(measurements).length) measurements = undefined;
      }

      const lineItemsForSave = sanitizeLineItemsForSave(lineItems);
      const specificationsForSave = sanitizeSpecificationsForSave(specifications);

      const savedReport = await updateMutation.mutateAsync({
        id: id!,
        visitType: visitType || undefined,
        actualVisitDateTime: normalizedActualVisitDateTime,
        serviceType: serviceType || undefined,
        serviceTypeCustom: serviceTypeCustom || undefined,
        customerRequirements: customerRequirements || discussionNotes || initialDesignNotes || undefined,
        notes: notes || discussionNotes || initialDesignNotes || undefined,
        // Project detail fields can be captured during consultation and refined later.
        ...(canEditProjectDetailsInReport && {
          measurementUnit,
          lineItems: lineItemsForSave,
          measurements,
          siteConditions,
          materials: materials || undefined,
          finishes: finishes || undefined,
          preferredDesign: preferredDesign || undefined,
          specifications: specificationsForSave,
          customerRequirements: customerRequirements || undefined,
          notes: notes || undefined,
          photoKeys,
          videoKeys,
          sketchKeys,
          referenceImageKeys,
          initialDesignKeys,
          initialDesignNotes: initialDesignNotes || undefined,
          selectedDesignTemplateId: selectedDesignTemplateId || undefined,
          selectedDesignTemplateName: selectedDesignTemplateName || undefined,
          selectedDesignTemplateImageUrl: undefined,
        }),
        // Consultation-specific fields
        ...(visitType === 'consultation' && {
          discussionNotes: discussionNotes || initialDesignNotes || undefined,
            consultationOutcome,
            noOcularReason: noOcularReason || undefined,
            discussionNotes: discussionNotes || initialDesignNotes || undefined,
            customerRequirements: customerRequirements || discussionNotes || initialDesignNotes || undefined,
            notes: notes || discussionNotes || initialDesignNotes || undefined,
          ...(consultationOutcome === 'schedule_ocular' && {
            recommendedOcularDate: serializeDateOnlyAsUtcNoon(recommendedOcularDate),
            recommendedOcularSlot: recommendedOcularSlot || undefined,
            recommendedOcularAddressId: selectedOcularAddress?.id,
            recommendedOcularAddress: selectedOcularAddress,
          }),
          ...(consultationOutcome === 'no_ocular' && {
            recommendedOcularDate: undefined,
            recommendedOcularSlot: undefined,
            recommendedOcularAddressId: undefined,
            recommendedOcularAddress: undefined,
          }),
        }),
      });

      if (syncSiblingReports && visitType === 'consultation' && siblingReports?.length) {
        const siblingUpdates = siblingReports.filter((sibling) => (
          String(sibling._id) !== id &&
          [VisitReportStatus.DRAFT, VisitReportStatus.RETURNED].includes(sibling.status as VisitReportStatus)
        ));
        await Promise.all(siblingUpdates.map(async (sibling) => {
          try {
            await updateMutation.mutateAsync({
              id: String(sibling._id),
              visitType: 'consultation',
              actualVisitDateTime: normalizedActualVisitDateTime,
              consultationOutcome,
              noOcularReason: noOcularReason || undefined,
              ...(consultationOutcome === 'schedule_ocular' && {
                recommendedOcularDate: serializeDateOnlyAsUtcNoon(recommendedOcularDate),
                recommendedOcularSlot: recommendedOcularSlot || undefined,
                recommendedOcularAddressId: selectedOcularAddress?.id,
                recommendedOcularAddress: selectedOcularAddress,
              }),
              ...(consultationOutcome === 'no_ocular' && {
                recommendedOcularDate: undefined,
                recommendedOcularSlot: undefined,
                recommendedOcularAddressId: undefined,
                recommendedOcularAddress: undefined,
              }),
            });
          } catch (err) {
            const message = extractErrorMessage(err, 'Failed to save report');
            if (!message.toLowerCase().includes('draft or returned')) throw err;
          }
        }));
      }

      if (showSuccessToast) toast.success('Report saved');
      return savedReport;
    } catch (err) {
      if (showErrorToast) toast.error(extractErrorMessage(err, 'Failed to save report'));
      return null;
    }
    })();

    saveDraftInFlightRef.current = savePromise;
    try {
      return await savePromise;
    } finally {
      saveDraftInFlightRef.current = null;
    }
  };

  const handleSave = async () => {
    await saveDraft({ showSuccessToast: true, showErrorToast: true });
  };

  const handlePrimarySubmitClick = () => {
    if (linkedProjectId && isProjectCreationMode) {
      navigate(`/projects/${linkedProjectId}/contract`);
      return;
    }

    setSubmitOpen(true);
  };

  const handleBeforeProjectSwitch = async () => {
    setIsSwitchingReport(true);
    if (!canEdit) return true;
    const saved = await saveDraft({
      showSuccessToast: false,
      showErrorToast: true,
      syncSiblingReports: false,
    });
    if (!saved) setIsSwitchingReport(false);
    return Boolean(saved);
  };

  const handleSubmit = async () => {
    const isOcular = effectiveVisitType === 'ocular';
    const isConsultation = effectiveVisitType === 'consultation';
    const ocularVisitDateTime = actualVisitDateTime || scheduledOcularVisitDateTime;

    if (isOcular || isNoOcularProjectEntryPersisted) {
      const missingFields = getIncompleteOcularFields({
        actualVisitDateTime: isOcular ? ocularVisitDateTime : 'not-required-for-no-ocular',
        lineItems,
        measurements: isLegacyReport
          ? {
            length: legacyLength ? parseFloat(legacyLength) : undefined,
            width: legacyWidth ? parseFloat(legacyWidth) : undefined,
            height: legacyHeight ? parseFloat(legacyHeight) : undefined,
            thickness: legacyThickness ? parseFloat(legacyThickness) : undefined,
            raw: legacyMeasurementNotes || undefined,
          }
          : undefined,
        siteConditions,
        materials,
        finishes,
        preferredDesign,
        specifications,
        photoKeys,
        initialDesignKeys,
        initialDesignNotes,
        selectedDesignTemplateId,
        selectedDesignTemplateName,
        selectedDesignTemplateImageUrl,
      });

      if (missingFields.length > 0) {
        toast.error(formatIncompleteOcularMessage(missingFields), { duration: 7000 });
        setSubmitOpen(false);
        return;
      }
    }

    if (isConsultation && !isNoOcularProjectEntryPersisted) {
      if (attendanceStatus === AppointmentAttendanceStatus.NO_SHOW) {
        toast.error('Consultation report cannot be submitted because the consultation was marked as No Show. Save notes only.');
        return;
      }
      if (attendanceStatus === AppointmentAttendanceStatus.RESCHEDULED) {
        toast.error('Consultation report cannot be submitted because the consultation was marked as Rescheduled. Save notes only.');
        return;
      }
      if (attendanceStatus === AppointmentAttendanceStatus.CUSTOMER_DECLINED) {
        toast.error('Consultation report cannot be submitted because the customer declined to proceed. Save notes only.');
        return;
      }
      if (attendanceStatus !== AppointmentAttendanceStatus.COMPLETED) {
        toast.error('Complete the consultation attendance before submitting the consultation report.');
        return;
      }
      if (consultationOutcome === 'schedule_ocular' && (!recommendedOcularDate || !recommendedOcularSlot)) {
        toast.error('Select an ocular visit date and time slot before scheduling.');
        return;
      }
      if (consultationOutcome === 'schedule_ocular' && !hasSelectableOcularAddress) {
        toast.error('Select a saved customer address before scheduling the ocular visit.');
        return;
      }
      if (consultationOutcome === 'no_ocular' && !noOcularReason.trim()) {
        toast.error('Explain why ocular is not needed before proceeding without ocular.');
        return;
      }
      if (consultationOutcome === 'no_ocular') {
        const saved = await saveDraft({ showSuccessToast: false, showErrorToast: true });
        if (!saved) {
          return;
        }
        setNoOcularProjectEntryStarted(true);
        await refetch();
        setSubmitOpen(false);
        toast.success('Ocular skipped. Complete the project details, then click Create Project.', { duration: 5000 });
        return;
      }
    }

    try {
      const saved = await saveDraft({ showSuccessToast: false, showErrorToast: true });
      if (!saved) {
        setSubmitOpen(false);
        return;
      }

      if (isOcular || isNoOcularProjectEntryPersisted) {
        const missingPersistedFields = getIncompleteOcularFields({
          actualVisitDateTime: isOcular ? saved.actualVisitDateTime : 'not-required-for-no-ocular',
          lineItems: saved.lineItems,
          measurements: saved.measurements,
          siteConditions: saved.siteConditions,
          materials: saved.materials,
          finishes: saved.finishes,
          preferredDesign: saved.preferredDesign,
          specifications: saved.specifications,
          photoKeys: saved.photoKeys,
          initialDesignKeys: saved.initialDesignKeys,
          initialDesignNotes: saved.initialDesignNotes,
          selectedDesignTemplateId: saved.selectedDesignTemplateId,
          selectedDesignTemplateName: saved.selectedDesignTemplateName,
          selectedDesignTemplateImageUrl: saved.selectedDesignTemplateImageUrl,
        });

        if (missingPersistedFields.length > 0) {
          setSubmitOpen(false);
          toast.error(formatIncompleteOcularMessage(missingPersistedFields), { duration: 7000 });
          await refetch();
          return;
        }
      }

      const savedReportId = rawId(saved._id);
      const submittedReport = await submitMutation.mutateAsync(savedReportId);
      const submittedReportId = rawId(submittedReport._id);

      if (submittedReportId && submittedReportId !== savedReportId) {
        navigate(`/visit-reports/${submittedReportId}`, { replace: true, state: location.state });
        setSubmitOpen(false);
        toast.success(
          'Ocular visit scheduled. The consultation appointment has been completed and the customer can now submit the site location.',
          { duration: 5000 },
        );
        return;
      }

      if (isProjectCreationMode) {
        let projectId = linkedProjectId;
        if (!projectId) {
          const { data } = await api.get(`/projects/by-visit-report/${savedReportId}`);
          projectId = data?.data?._id;
        }
        toast.success('Project details saved. Upload the signed contract to submit it for engineering.', { duration: 5000 });
        if (projectId) navigate(`/projects/${projectId}/contract`);
      } else {
        toast.success(
          'Ocular visit scheduled. The consultation appointment has been completed and the customer can now submit the site location.',
          { duration: 5000 },
        );
      }
      setSubmitOpen(false);
    } catch (err) {
      setSubmitOpen(false);
      const message = extractErrorMessage(err, 'Failed to submit report');
      if (!message.includes('appointment must be marked as complete')) {
        toast.error(message);
        return;
      }
      const apptId = appointmentNavigationId || null;
      toast((t) => (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            The appointment must be marked as complete first before submitting reports.
          </p>
          {apptId && (
            <button
              type="button"
              onClick={() => { toast.dismiss(t.id); navigate(`/appointments/${apptId}`); }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 text-left"
            >
              Go to Appointment →
            </button>
          )}
        </div>
      ), { duration: 6000, icon: '⚠️' });
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning');
      return;
    }
    try {
      await returnMutation.mutateAsync({ id: id!, reason: returnReason });
      await refetch();
      toast.success('Report returned to sales staff');
      setReturnOpen(false);
      setReturnReason('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to return report'));
    }
  };

  const handleReopenForRepair = async () => {
    if (!repairReason.trim()) {
      toast.error('Please explain why this ocular report needs repair.');
      return;
    }
    try {
      await reopenMutation.mutateAsync({ id: id!, reason: repairReason.trim() });
      await refetch();
      toast.success('Ocular report reopened for repair. Sales can now correct and resubmit it.');
      setReopenOpen(false);
      setRepairReason('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to reopen report for repair'));
    }
  };

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
  }) => (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg border border-[#d7dde5] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-800 p-2">
        <Icon className="h-4 w-4 text-[#5a6675] dark:text-slate-400" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-[#46515f] dark:text-slate-300">{label}</p>
        <p className="text-sm text-[#667282] dark:text-slate-400">{value}</p>
      </div>
    </div>
  );

  const editCardClassName =
    'rounded-xl border border-[#cfd6df] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.26)]';

  const editInputClassName =
    'rounded-xl border-gray-200 bg-gray-50/50 text-gray-900 focus:border-[#6e6e73] focus:ring-[#6e6e73]/20 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/30 dark:focus:border-white/30 dark:focus:ring-[#d6b36a]/20';

  const editSectionClassName =
    'rounded-xl border border-[#cfd6df] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.96)_0%,rgba(10,17,26,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.26)]';

  if (isSwitchingReport) {
    return (
      <div className="flex min-h-[64vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#d9dee6] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.98)_100%)] px-10 py-9 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,34,0.98)_0%,rgba(8,14,22,0.98)_100%)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-300/25 dark:bg-blue-500/10 dark:text-blue-200">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Loading item details</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Saving the current item and opening the selected one.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(sourcePath || '/appointments?tab=visit-reports')}
            className="rounded-xl text-gray-500 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 truncate">
              {isProjectCreationMode
                ? (canEdit ? 'Creating Project' : 'Project Details')
                : (canEdit ? 'Edit Visit Report' : 'Visit Report Details')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5 flex items-center gap-2">
              <span className="truncate">{appointmentServiceLabel}</span>
              <span className="hidden sm:inline">&middot;</span>
              <span className="shrink-0">{effectiveVisitType === 'ocular' ? 'Ocular Visit' : isProjectCreationMode ? 'No Ocular' : 'Consultation'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={report.status} />
          </div>
        </div>

        {/* header address removed per request */}

        {report.appointmentId && typeof report.appointmentId === 'object' && effectiveVisitType === 'ocular' && contactPersonLabel && (
          <div className="rounded-xl border border-gray-100 bg-white/70 px-3 py-1.5 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Contact Person: {contactPersonLabel}
          </div>
        )}
      </div>

      {/* ── Project Navigator (multi-project strip) ── */}
        <ProjectNavigator
          appointmentId={appointmentId}
          activeReportId={String(report._id)}
          defaultVisitType={effectiveVisitType}
          addServiceOptions={appointmentServiceChoices}
          canAdd={isAssignedSalesStaff && (isDraft || isReturned) && effectiveVisitType !== 'ocular'}
          canEdit={!!(isSalesStaff || isAdmin) && effectiveVisitType !== 'ocular' && !isProjectCreationMode}
          onBeforeNavigate={handleBeforeProjectSwitch}
          onBeforeAdd={async () => {
            if (!canEdit) return true;
            const saved = await saveDraft({
              showSuccessToast: false,
              showErrorToast: true,
              syncSiblingReports: false,
            });
            return Boolean(saved);
          }}
        />

      {/* ── Return reason banner ── */}
      {report.returnReason && isReturned && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/40">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-100">
            Report Returned
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">{report.returnReason}</p>
        </div>
      )}

      {effectiveVisitType === 'ocular' && !reportHasMeasurements && !canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Measurements are missing from this ocular report</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                The engineer can still see the rest of the ocular notes and attachments, but this report does not contain measured line items or legacy dimensions yet.
              </p>
            </div>
          </div>
        </div>
      )}

      {isConsultationDraftProject && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Ocular visit is still required</p>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">
            This consultation created a draft project, but engineering cannot start until the ocular visit is finalized and its report is submitted.
          </p>
        </div>
      )}

      {/* Warning Banner: Unpaid Ocular Fee (outside NCR) */}
      {isOcularFeeUnpaidOutsideNcr && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Ocular Fee Payment Required
              </p>
              <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                This customer address is outside Metro Manila. You cannot create the project from this report until the ocular fee is fully paid and verified.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3.5 h-8 rounded-lg border-amber-200 bg-white text-xs font-medium text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                onClick={() => {
                  const apptId = appointmentNavigationId || null;
                  if (apptId) navigate(`/appointments/${apptId}`);
                }}
              >
                Go to Appointment to record payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── READ-ONLY VIEWS (for non-editors) ── */}
      {!canEdit && (
        <div className="space-y-6">
          <Card className={editCardClassName}>
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-slate-100">Report Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Layers} label="Items" value={serviceLabel} />
              <InfoRow
                icon={CalendarIcon}
                label="Created"
                value={format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}
              />
              {report.actualVisitDateTime && (
                <InfoRow
                  icon={CalendarIcon}
                  label="Visit Date"
                  value={format(new Date(report.actualVisitDateTime), 'MMM d, yyyy h:mm a')}
                />
              )}
            </CardContent>
          </Card>

          {/* Consultation Summary (read-only) */}
          {effectiveVisitType === 'consultation' && (
            <Card className="rounded-xl border-blue-100 dark:border-blue-900/60 dark:bg-slate-900/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                  <FolderOpen className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                  Project Discussed & Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {report.selectedDesignTemplateName && (
                  <div className="overflow-hidden rounded-xl border border-[#d8dee6] bg-[#f8fafc] shadow-[0_6px_18px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800/80">
                    <img
                      src={getDesignTemplatePlaceholderImage(report.serviceType, report.selectedDesignTemplateName)}
                      alt={report.selectedDesignTemplateName}
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Selected Design Reference</p>
                      <p className="mt-1 text-sm text-[#647080] dark:text-slate-400">{report.selectedDesignTemplateName}</p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-[#d8dee6] bg-[#f8fafc] p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800/80">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Discussion Notes for {serviceLabel}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-[#647080] dark:text-slate-400">
                    {report.discussionNotes || 'N/A'}
                  </p>
                </div>

                {(report.recommendedOcularDate || report.recommendedOcularSlot) && (
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                    <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-200 mb-3">Recommended Ocular Schedule</p>
                    <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-slate-400">
                      {report.recommendedOcularDate && (
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-blue-500/70" />
                          <span>Date: <strong>{format(new Date(`${extractLocalDateValue(report.recommendedOcularDate)}T00:00:00`), 'MMMM d, yyyy')}</strong></span>
                        </div>
                      )}
                      {report.recommendedOcularSlot && (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 flex items-center justify-center text-[10px] font-bold border border-blue-500/50 rounded-full text-blue-500/70">T</div>
                          <span>Time: <strong>{(() => {
                            const hour = parseInt(report.recommendedOcularSlot.split(':')[0] ?? '0');
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                            return `${display}:00 ${ampm}`;
                          })()}</strong></span>
                        </div>
                      )}
                    </div>
                    {report.consultationOutcome === 'schedule_ocular' && (
                      <div className={cn('mt-4 rounded-xl border px-4 py-3 text-sm', ocularFollowUpStatus.className)}>
                        <p className="font-semibold">{ocularFollowUpStatus.title}</p>
                        <p className="mt-1 text-xs opacity-90">{ocularFollowUpStatus.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {reportHasMeaningfulSpecifications && report.specifications && (
            <Card className={editSectionClassName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                  <Ruler className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  Item Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getServiceSpecificationSchema(report.serviceType).sections.map((section) => {
                  const values = report.specifications?.[section.key] || {};
                  const filled = section.fields.filter((field) => values[field.key] !== undefined && values[field.key] !== '');
                  if (!filled.length) return null;
                  return (
                    <div key={section.key} className="rounded-xl border border-[#d8dee6] bg-[#f8fafc] p-4 dark:border-slate-700 dark:bg-slate-800/80">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{section.label}</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#647080] dark:text-slate-300 sm:grid-cols-2">
                        {filled.map((field) => (
                          <div key={field.key}>
                            <span className="font-medium text-gray-700 dark:text-slate-200">{field.label}: </span>
                            <span>{String(values[field.key])}{field.unit ? ` ${field.unit}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {!reportHasMeaningfulSpecifications && report.lineItems && report.lineItems.length > 0 && (
            <Card className={editSectionClassName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                  <Ruler className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  Measurements ({MEASUREMENT_UNIT_LABELS[report.measurementUnit || 'cm'] || report.measurementUnit})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.lineItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-[#d8dee6] bg-[#f8fafc] p-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800/80">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#cfd6df] bg-white text-xs font-bold text-[#5e6977] shadow-[0_2px_8px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item.label}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#647080] dark:text-slate-400">
                          {item.length != null && <span>L: {item.length}</span>}
                          {item.width != null && <span>W: {item.width}</span>}
                          {item.height != null && <span>H: {item.height}</span>}
                          {item.thickness != null && <span>T: {item.thickness}</span>}
                          {item.area != null && <span>Area: {item.area}</span>}
                          <span>Qty: {item.quantity}</span>
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-xs text-[#7b8694] dark:text-slate-400">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!reportHasMeaningfulSpecifications && isLegacyReport && report.measurements && (
            <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                  <Ruler className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  Measurements (Legacy)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 text-sm text-gray-500 dark:text-slate-400">
                  {report.measurements.length != null && (
                    <span>Length: {report.measurements.length} {report.measurements.unit}</span>
                  )}
                  {report.measurements.width != null && (
                    <span>Width: {report.measurements.width} {report.measurements.unit}</span>
                  )}
                  {report.measurements.height != null && (
                    <span>Height: {report.measurements.height} {report.measurements.unit}</span>
                  )}
                  {report.measurements.thickness != null && (
                    <span>Thickness: {report.measurements.thickness} {report.measurements.unit}</span>
                  )}
                </div>
                {report.measurements.raw && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">{report.measurements.raw}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Site Conditions (read-only) — ocular only */}
          {!reportHasMeaningfulSpecifications && effectiveVisitType === 'ocular' && report.siteConditions && (
            <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                  <MapPin className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  Site Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow icon={MapPin} label="Environment" value={ENVIRONMENT_LABELS[report.siteConditions.environment] || report.siteConditions.environment} />
                {report.siteConditions.floorType && (
                  <InfoRow icon={Layers} label="Floor Type" value={report.siteConditions.floorType} />
                )}
                {report.siteConditions.wallMaterial && (
                  <InfoRow icon={Layers} label="Wall Material" value={report.siteConditions.wallMaterial} />
                )}
                {report.siteConditions.accessNotes && (
                  <InfoRow icon={StickyNote} label="Access Notes" value={report.siteConditions.accessNotes} />
                )}
                {report.siteConditions.obstaclesOrConstraints && (
                  <InfoRow icon={StickyNote} label="Obstacles" value={report.siteConditions.obstaclesOrConstraints} />
                )}
                <div className="flex gap-4 text-sm text-gray-500 dark:text-slate-400">
                  {report.siteConditions.hasElectrical && <span>Electrical nearby</span>}
                  {report.siteConditions.hasPlumbing && <span>Plumbing nearby</span>}
                </div>
              </CardContent>
            </Card>
          )}

          {(report.initialDesignKeys?.length || report.initialDesignNotes) && (
            <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                  <Paintbrush className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  Initial Design
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!!report.initialDesignKeys?.length && (
                  <FileUpload
                    folder="visit-reports/initial-design"
                    existingKeys={report.initialDesignKeys}
                    onUploadComplete={() => {}}
                    readOnly
                    label="Initial design files"
                  />
                )}
                {report.initialDesignNotes && (
                  <InfoRow icon={Paintbrush} label="Initial Design Notes" value={report.initialDesignNotes} />
                )}
              </CardContent>
            </Card>
          )}

          {(effectiveVisitType === 'ocular' || effectiveVisitType === 'consultation') && (
          <PhotoUploadGrid
            photoKeys={report.photoKeys || []}
            videoKeys={report.videoKeys || []}
            sketchKeys={report.sketchKeys || []}
            referenceImageKeys={report.referenceImageKeys || []}
            onPhotoKeysChange={() => {}}
            onVideoKeysChange={() => {}}
            onSketchKeysChange={() => {}}
            onReferenceImageKeysChange={() => {}}
            disabled
          />
          )}
        </div>
      )}

      {/* ── EDITABLE FORM (Sales Staff on DRAFT/RETURNED) ── */}
      {canEdit && (
        <div className="space-y-6">
          {/* Section 1: Visit Details */}
          <div className="space-y-6">
            {effectiveVisitType === 'ocular' && (
              <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-slate-100">
                    Visit Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {appointmentRecord?.date && appointmentRecord?.slotCode ? (
                      <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-sm text-cyan-900 dark:border-cyan-800/50 dark:bg-cyan-950/30 dark:text-cyan-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">Scheduled Site Visit</p>
                          <StatusBadge status={attendanceStatus} />
                        </div>
                        <p className="mt-1 text-cyan-800 dark:text-cyan-200">
                          {format(new Date(`${appointmentRecord.date}T00:00:00`), 'MMMM d, yyyy')} • {formatSlotTime(appointmentRecord.slotCode)}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
                        The scheduled ocular visit is not available yet. Confirm the appointment schedule before completing this report.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Consultation Summary (only for consultation visit type) */}
          {visitType === 'consultation' && !isProjectCreationMode && (
            <Card className={editSectionClassName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                  <FolderOpen className="h-5 w-5 text-gray-500 dark:text-slate-300" />
                  Project Discussed & Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 mb-4">
                  <Label className="text-[13px] font-medium text-gray-700 dark:text-slate-300">
                    Discussion Notes for {serviceLabel}
                  </Label>
                  <Textarea
                    value={discussionNotes}
                    onChange={(e) => setDiscussionNotes(e.target.value)}
                    placeholder={`Capture item-specific requirements, questions, and customer requests for ${serviceLabel.toLowerCase()}...`}
                    className={cn('min-h-[160px] mt-2', editInputClassName)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {canEditProjectDetailsInReport && (
            <Card className={editCardClassName}>
              <CardContent className="pt-6">
                <DesignTemplateSelector
                  serviceType={serviceType}
                  selectedTemplateId={selectedDesignTemplateId}
                  onSelect={handleDesignTemplateSelect}
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>
          )}

          {visitType === 'consultation' && isProjectCreationMode && (
            <Card className={editCardClassName}>
              <CardContent className="pt-6">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    Consultation Notes for {serviceLabel}
                  </p>
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/50">
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {report.discussionNotes || 'No discussion notes recorded.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sections 2-4: Project details captured during consultation and refined during ocular/no-ocular flows */}
          {canEditProjectDetailsInReport && (<>

          <Card className={editCardClassName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                <Ruler className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                Item Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {missingSpecificationWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
                  Missing recommended fields: {missingSpecificationWarnings.join(', ')}.
                </div>
              )}
              <ServiceSpecificationForm
                serviceType={serviceType}
                value={specifications}
                onChange={setSpecifications}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>

          <Card className={editCardClassName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                <Paintbrush className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                Initial Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Attach the initial design references or sketch notes that engineering should review next.
              </p>
              <FileUpload
                folder="visit-reports/initial-design"
                accept="image/*,.pdf"
                maxSizeMB={5}
                maxFiles={10}
                label="Upload initial design files"
                existingKeys={initialDesignKeys}
                onUploadComplete={setInitialDesignKeys}
                onUploadingChange={setInitialDesignUploading}
              />
              {selectedDesignTemplateName && (
                <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)]/60 bg-white/80 p-3 shadow-sm dark:bg-slate-950/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-sky-200/70 bg-slate-100 dark:border-sky-700/70 dark:bg-slate-900">
                    <img
                      src={getDesignTemplatePlaceholderImage(serviceType, selectedDesignTemplateName)}
                      alt={selectedDesignTemplateName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {selectedDesignTemplateName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Template reference
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl border border-[color:var(--color-border)]/60 bg-white/70 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-red-950/30 dark:hover:text-red-200"
                    onClick={() => {
                      setSelectedDesignTemplateId('');
                      setSelectedDesignTemplateName('');
                      setSelectedDesignTemplateImageUrl('');
                    }}
                    aria-label={`Remove ${selectedDesignTemplateName}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-gray-700">
                  Initial Design Notes
                </Label>
                <Textarea
                  value={initialDesignNotes}
                  onChange={(e) => setInitialDesignNotes(e.target.value)}
                  placeholder="Explain the design direction, references, or assumptions."
                  className={cn('min-h-[80px]', editInputClassName)}
                />
              </div>
            </CardContent>
          </Card>

          </>)}{/* end project-detail sections */}

          {/* Section 5: File Uploads */}
          {canEditProjectDetailsInReport && (
          <Card className={editCardClassName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-slate-100">
                <Camera className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                Photos & Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploadGrid
                photoKeys={photoKeys}
                videoKeys={videoKeys}
                sketchKeys={sketchKeys}
                referenceImageKeys={referenceImageKeys}
                onPhotoKeysChange={setPhotoKeys}
                onVideoKeysChange={setVideoKeys}
                onSketchKeysChange={setSketchKeys}
                onReferenceImageKeysChange={setReferenceImageKeys}
              />
            </CardContent>
          </Card>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">

        {canReturn && (
          <Button
            onClick={() => setReturnOpen(true)}
            disabled={returnMutation.isPending}
            variant="outline"
            className="border-[#c8c8cd] text-[#1d1d1f] hover:bg-[#f0f0f5] rounded-xl dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Return for Revision
          </Button>
        )}

        {canReopenForRepair && (
          <Button
            onClick={() => {
              setRepairReason('Reopened for repair because required ocular measurements were missing from the submitted report.');
              setReopenOpen(true);
            }}
            disabled={reopenMutation.isPending}
            variant="outline"
            className="border-amber-300 text-amber-900 hover:bg-amber-50 rounded-xl"
          >
            <Wrench className="mr-2 h-4 w-4" />
            Reopen for Repair
          </Button>
        )}

        {(canEdit || linkedProjectId) && (
          <div className="w-full space-y-3">
            {linkedProject?.contractStatus !== ContractStatus.UPLOADED && (
              <div className={cn(
                'rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100',
                !linkedProjectId && 'hidden',
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Signed contract not uploaded yet</p>
                      <p className="mt-0.5 text-xs">
                        Upload the signed contract first before engineering can claim this project.
                      </p>
                    </div>
                  </div>
                  {(isSalesStaff || isAdmin) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/projects/${linkedProjectId}/contract`)}
                      className="h-8 rounded-lg border-amber-400 bg-transparent text-amber-900 hover:bg-amber-100 dark:border-amber-300/50 dark:text-amber-100 dark:hover:bg-amber-500/20"
                    >
                      Upload Contract
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {canEdit && (
                <div className="flex gap-3 order-1 sm:order-none">
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending || initialDesignUploading}
                    className="rounded-xl [background-image:none] bg-[#223246] text-white hover:bg-[#31577a] dark:border dark:border-white/12 dark:[background-image:none] dark:bg-[#223246] dark:text-slate-100 dark:hover:bg-[#365f86]"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  {linkedProjectId && (
                    <Button
                      onClick={() => navigate(`/projects/${linkedProjectId}`)}
                      className="rounded-xl [background-image:none] bg-[#223246] text-white hover:bg-[#31577a] dark:border dark:border-white/12 dark:[background-image:none] dark:bg-[#223246] dark:text-slate-100 dark:hover:bg-[#365f86]"
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      {isConsultationDraftProject ? 'Go to Draft Project' : 'Go to Project'}
                    </Button>
                  )}
                  <Button
                    onClick={handlePrimarySubmitClick}
                    disabled={
                      initialDesignUploading
                      || (!linkedProjectId && (submitMutation.isPending || !!isSubmissionBlocked))
                    }
                    className="rounded-xl [background-image:none] bg-emerald-600 text-white hover:bg-emerald-500 dark:border dark:border-emerald-700/45 dark:[background-image:none] dark:bg-[#1f7a5b] dark:text-white dark:shadow-[0_12px_24px_rgba(16,97,71,0.24)] dark:hover:bg-[#2aa77c]"
                  >
                    {linkedProjectId && isProjectCreationMode
                      ? <FolderOpen className="mr-2 h-4 w-4" />
                      : effectiveVisitType === 'consultation' && !isProjectCreationMode
                      ? <CalendarIcon className="mr-2 h-4 w-4" />
                      : <Send className="mr-2 h-4 w-4" />}
                    {linkedProjectId && isProjectCreationMode
                      ? 'Upload Contract'
                      : effectiveVisitType === 'consultation' && !isProjectCreationMode ? 'Submit Consultation Outcome' : 'Create Project'}
                  </Button>
                </div>
              )}

              {isConsultationDraftProject && (isSalesStaff || isAdmin) && (
                <Button
                  onClick={() => navigate(`/appointments/${appointmentNavigationId}`)}
                  variant="outline"
                  className="rounded-xl border-[#c8c8cd] text-[#1d1d1f] hover:bg-[#f0f0f5] dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 sm:min-w-[220px]"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Go to Appointment
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Go to Appointment button is rendered beside the project button above when applicable */}
      </div>

      {/* ── Submit Confirmation ── */}
      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title={effectiveVisitType === 'consultation' && !isProjectCreationMode ? 'Consultation Outcome' : 'Create Project'}
        description={
          isProjectCreationMode
            ? effectiveVisitType === 'ocular'
              ? 'This will update the existing project with the on-site measurements and details collected during the ocular visit. The initial design package will also be submitted to engineering for approval, and the appointment will be marked as completed. Are you sure?'
              : 'This will create the internal draft project from the consultation details. You will be redirected to upload the signed contract before engineering can claim or progress the job.'
            : `Choose whether this consultation needs an ocular visit for ${appointmentItemsText}.`
        }
        confirmLabel={effectiveVisitType === 'consultation' && !isProjectCreationMode ? (consultationOutcome === 'schedule_ocular' ? 'Schedule Ocular Visit' : 'Proceed Without Ocular') : 'Create Project'}
        confirmClassName="rounded-xl [background-image:none] bg-emerald-600 text-white hover:bg-emerald-500 dark:border dark:border-emerald-700/45 dark:[background-image:none] dark:bg-[#1f7a5b] dark:text-white dark:shadow-[0_12px_24px_rgba(16,97,71,0.24)] dark:hover:bg-[#2aa77c]"
        isLoading={submitMutation.isPending || updateMutation.isPending}
        confirmDisabled={
          effectiveVisitType === 'consultation'
          && !isProjectCreationMode
          && (
            (consultationOutcome === 'schedule_ocular' && (!recommendedOcularDate || !recommendedOcularSlot || !hasSelectableOcularAddress))
            || (consultationOutcome === 'no_ocular' && !noOcularReason.trim())
          )
        }
        onConfirm={handleSubmit}
      >
        {effectiveVisitType === 'consultation' && !isProjectCreationMode && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConsultationOutcome('schedule_ocular')}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  consultationOutcome === 'schedule_ocular'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07]',
                )}
              >
                <p className="text-sm font-semibold">Schedule Ocular Visit</p>
                <p className="mt-1 text-xs opacity-80">Use this when site measurements or verification are needed.</p>
              </button>
              <button
                type="button"
                onClick={() => setConsultationOutcome('no_ocular')}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  consultationOutcome === 'no_ocular'
                    ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07]',
                )}
              >
                <p className="text-sm font-semibold">Proceed Without Ocular</p>
                <p className="mt-1 text-xs opacity-80">Use this when consultation details are enough to continue.</p>
              </button>
            </div>

            {consultationOutcome === 'schedule_ocular' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700 dark:text-slate-300">
                    Date
                  </Label>
                  <Popover open={ocularDateOpen && !isRecommendedOcularScheduleLocked} onOpenChange={(open) => {
                    if (!isRecommendedOcularScheduleLocked) setOcularDateOpen(open);
                  }}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={isRecommendedOcularScheduleLocked}
                        className={cn(
                          'flex h-11 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:border-white/30 dark:hover:bg-white/[0.08] dark:focus:ring-[#d6b36a]/20',
                          !recommendedOcularDate && 'text-gray-400 dark:text-slate-500',
                          isRecommendedOcularScheduleLocked && 'cursor-not-allowed opacity-70',
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500" />
                        {recommendedOcularDate
                          ? format(new Date(`${recommendedOcularDate}T00:00:00`), 'MMMM d, yyyy')
                          : 'Pick a date'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarUI
                        mode="single"
                        selected={recommendedOcularDate ? new Date(`${recommendedOcularDate}T00:00:00`) : undefined}
                        onSelect={(day) => {
                          if (day) {
                            setRecommendedOcularDate(format(day, 'yyyy-MM-dd'));
                            setOcularDateOpen(false);
                          }
                        }}
                        disabled={(day) => {
                          const dow = getDay(day);
                          if (dow === 0 || dow === 6) return true;
                          if (startOfDay(day) < startOfDay(addDays(new Date(), 3))) return true;
                          const dateStr = format(day, 'yyyy-MM-dd');
                          if (holidayDates.has(dateStr)) return true;
                          return false;
                        }}
                        fromMonth={addDays(new Date(), 3)}
                        className="rounded-xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700 dark:text-slate-300">
                    Time Slot
                  </Label>
                  <Select value={recommendedOcularSlot} onValueChange={setRecommendedOcularSlot} disabled={isRecommendedOcularScheduleLocked}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-gray-50/50 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:border-white/30 dark:focus:ring-[#d6b36a]/20">
                      <SelectValue placeholder="Select a slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_CODES.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {formatSlotTime(slot)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Ocular Site Address selector removed per UX request */}
                {isRecommendedOcularScheduleLocked && (
                  <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
                    Date and time were already set for this appointment's other item and cannot be changed here.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-gray-700 dark:text-slate-300">
                    Reason ocular is not needed
                  </Label>
                  <Textarea
                    value={noOcularReason}
                    onChange={(event) => setNoOcularReason(event.target.value)}
                    placeholder="Explain why consultation details are enough to continue without an ocular visit..."
                    className="min-h-[108px] rounded-xl border-gray-200 bg-gray-50/50 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>

      {/* ── Return Dialog ── */}
      <ConfirmDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return Visit Report"
        description=""
        variant="destructive"
        confirmLabel="Return Report"
        isLoading={returnMutation.isPending}
        onConfirm={handleReturn}
      >
        <div className="space-y-2.5">
          <Label className="text-[13px] font-semibold tracking-[0.01em] text-[color:var(--text-metal-color)] dark:text-slate-200">
            Reason for returning
          </Label>
          <Textarea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Explain what needs to be corrected..."
            className="min-h-[108px] rounded-[1.35rem] border-[color:var(--metal-input-border)] bg-[var(--metal-input-background)] px-4 py-3 text-[15px] text-[#182029] shadow-[var(--metal-input-shadow)] placeholder:text-[color:var(--text-metal-muted-color)] focus-visible:ring-[color:var(--color-ring)] dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen Ocular Report for Repair"
        description="This will move the report back to Returned so sales staff can correct the site data and resubmit it. The linked project stays visible, but engineers should wait for the repaired report."
        confirmLabel="Reopen Report"
        isLoading={reopenMutation.isPending}
        onConfirm={handleReopenForRepair}
      >
        <div className="space-y-2.5">
          <Label className="text-[13px] font-semibold tracking-[0.01em] text-[color:var(--text-metal-color)] dark:text-slate-200">
            Repair reason
          </Label>
          <Textarea
            value={repairReason}
            onChange={(e) => setRepairReason(e.target.value)}
            placeholder="Explain what needs to be fixed before engineering relies on this report..."
            className="min-h-[108px] rounded-[1.35rem] border-[color:var(--metal-input-border)] bg-[var(--metal-input-background)] px-4 py-3 text-[15px] text-[#182029] shadow-[var(--metal-input-shadow)] placeholder:text-[color:var(--text-metal-muted-color)] focus-visible:ring-[color:var(--color-ring)] dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
