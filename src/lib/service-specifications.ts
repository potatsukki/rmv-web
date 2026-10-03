import { ServiceType } from './constants';
import type { ServiceSpecifications } from './types';

export type SpecificationFieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox';
export type SpecificationSectionKey = keyof ServiceSpecifications;

export interface SpecificationOption {
  label: string;
  value: string;
}

export interface SpecificationField {
  key: string;
  label: string;
  type: SpecificationFieldType;
  placeholder?: string;
  required?: boolean;
  unit?: string;
  options?: SpecificationOption[];
  defaultValue?: string | number | boolean;
}

export interface SpecificationSection {
  key: SpecificationSectionKey;
  label: string;
  warningMessage?: string;
  fields: SpecificationField[];
}

export interface ServiceSpecificationSchema {
  serviceType: string;
  sections: SpecificationSection[];
}

function section(key: SpecificationSectionKey, label: string, fields: SpecificationField[], warningMessage?: string): SpecificationSection {
  return { key, label, fields, warningMessage };
}

function option(value: string): SpecificationOption {
  return { value, label: value };
}

const railingSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.RAILINGS,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'totalRunLength', label: 'Total Run Length', type: 'number', unit: 'mm', required: true },
      { key: 'railHeight', label: 'Rail Height', type: 'number', unit: 'mm', required: true },
      { key: 'postSpacing', label: 'Post Spacing', type: 'number', unit: 'mm', required: true },
      { key: 'tubeDiameter', label: 'Tube Diameter', type: 'number', unit: 'mm' },
      { key: 'materialThickness', label: 'Material Thickness', type: 'number', unit: 'mm' },
      { key: 'mountType', label: 'Mount Type', type: 'select', options: [option('Surface mount'), option('Side mount'), option('Core drilled')] },
      { key: 'stairAlignment', label: 'Stair Alignment', type: 'select', options: [option('Not applicable'), option('Straight run'), option('Landing + run')] },
      { key: 'sectionCount', label: 'Section Count', type: 'number' },
    ], 'Complete core dimensions to keep fabrication estimates realistic.'),
    section('siteConditions', 'Site Conditions', [
      { key: 'mountingSurface', label: 'Mounting Surface', type: 'text' },
      { key: 'staircasePresent', label: 'Staircase Present', type: 'checkbox', defaultValue: false },
      { key: 'baseMaterial', label: 'Concrete or Steel Base', type: 'select', options: [option('Concrete'), option('Steel'), option('Mixed')] },
      { key: 'outdoorExposure', label: 'Outdoor Exposure', type: 'select', options: [option('Low'), option('Medium'), option('High')] },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'tubeMaterial', label: 'Tube Material', type: 'text', required: true },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
      { key: 'handrailStyle', label: 'Handrail Style', type: 'text' },
      { key: 'balusterStyle', label: 'Baluster Style', type: 'text' },
    ]),
  ],
};

const grillSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.GRILLS,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'windowWidth', label: 'Window Width', type: 'number', unit: 'mm', required: true },
      { key: 'windowHeight', label: 'Window Height', type: 'number', unit: 'mm', required: true },
      { key: 'barSpacing', label: 'Bar Spacing', type: 'number', unit: 'mm' },
      { key: 'frameDepth', label: 'Frame Depth', type: 'number', unit: 'mm' },
      { key: 'panelCount', label: 'Panel Count', type: 'number' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'windowMaterial', label: 'Window Material', type: 'text' },
      { key: 'wallOpeningCondition', label: 'Wall Opening Condition', type: 'text' },
      { key: 'exposure', label: 'Indoor/Outdoor Exposure', type: 'select', options: [option('Indoor'), option('Outdoor'), option('Mixed')] },
      { key: 'securityPriority', label: 'Security Priority', type: 'select', options: [option('Low'), option('Medium'), option('High')] },
      { key: 'accessRestriction', label: 'Access Restriction', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'barMaterial', label: 'Bar Material', type: 'text', required: true },
      { key: 'grillPattern', label: 'Grill Pattern', type: 'text' },
      { key: 'openingDirection', label: 'Opening Direction', type: 'select', options: [option('Fixed'), option('Inward'), option('Outward'), option('Sliding')] },
      { key: 'lockProvision', label: 'Lock Provision', type: 'text' },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
    ]),
  ],
};

const gateSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.GATES,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'gateWidth', label: 'Gate Width', type: 'number', unit: 'mm', required: true },
      { key: 'gateHeight', label: 'Gate Height', type: 'number', unit: 'mm', required: true },
      { key: 'openingClearance', label: 'Opening Clearance', type: 'number', unit: 'mm' },
      { key: 'postHeight', label: 'Post Height', type: 'number', unit: 'mm' },
      { key: 'panelCount', label: 'Panel Count', type: 'number' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'groundSlope', label: 'Ground Slope', type: 'text' },
      { key: 'concreteBase', label: 'Concrete Base', type: 'checkbox', defaultValue: false },
      { key: 'vehicleClearance', label: 'Vehicle Clearance', type: 'number', unit: 'mm' },
      { key: 'fenceConnection', label: 'Fence Connection', type: 'text' },
      { key: 'outdoorExposure', label: 'Outdoor Exposure', type: 'select', options: [option('Low'), option('Medium'), option('High')] },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'frameMaterial', label: 'Frame Material', type: 'text', required: true },
      { key: 'motionType', label: 'Swing or Sliding Type', type: 'select', options: [option('Swing'), option('Sliding')] },
      { key: 'wheelRequirement', label: 'Wheel Requirement', type: 'text' },
      { key: 'panelStyle', label: 'Panel Style', type: 'text' },
      { key: 'lockType', label: 'Lock Type', type: 'text' },
      { key: 'paintFinish', label: 'Paint/Finish Type', type: 'text' },
    ]),
  ],
};

const kitchenCounterSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.KITCHEN_COUNTER,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'counterLength', label: 'Counter Length', type: 'number', unit: 'mm', required: true },
      { key: 'counterWidth', label: 'Counter Width', type: 'number', unit: 'mm', required: true },
      { key: 'counterHeight', label: 'Counter Height', type: 'number', unit: 'mm', required: true },
      { key: 'sinkCutout', label: 'Sink Cutout', type: 'text' },
      { key: 'backsplashHeight', label: 'Backsplash Height', type: 'number', unit: 'mm' },
      { key: 'applianceClearance', label: 'Appliance Clearance', type: 'text' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'plumbingNearby', label: 'Plumbing Nearby', type: 'checkbox', defaultValue: false },
      { key: 'electricalNearby', label: 'Electrical Nearby', type: 'checkbox', defaultValue: false },
      { key: 'existingCabinetLayout', label: 'Existing Cabinet Layout', type: 'text' },
      { key: 'floorType', label: 'Tile or Concrete Flooring', type: 'text' },
      { key: 'appliancePlacement', label: 'Appliance Placement', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'stainlessGrade', label: 'Stainless Grade', type: 'text', required: true },
      { key: 'counterFinish', label: 'Counter Finish', type: 'text', required: true },
      { key: 'sinkConfiguration', label: 'Sink Configuration', type: 'text' },
      { key: 'edgeStyle', label: 'Edge Style', type: 'text' },
    ]),
  ],
};

const canopySchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.CANOPY,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'projectionLength', label: 'Projection Length', type: 'number', unit: 'mm', required: true },
      { key: 'totalWidth', label: 'Total Width', type: 'number', unit: 'mm', required: true },
      { key: 'heightClearance', label: 'Height Clearance', type: 'number', unit: 'mm' },
      { key: 'supportPostCount', label: 'Support Post Count', type: 'number' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'outdoorExposure', label: 'Outdoor Exposure', type: 'select', options: [option('Low'), option('Medium'), option('High')] },
      { key: 'windExposure', label: 'Wind Exposure', type: 'select', options: [option('Low'), option('Medium'), option('High')] },
      { key: 'drainageAccess', label: 'Drainage Access', type: 'text' },
      { key: 'roofConnectionType', label: 'Roof Connection Type', type: 'text' },
      { key: 'existingSupportStructure', label: 'Existing Support Structure', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'roofingMaterial', label: 'Roofing Material', type: 'text', required: true },
      { key: 'structuralMaterial', label: 'Structural Material', type: 'text', required: true },
      { key: 'finishCoating', label: 'Finish Coating', type: 'text' },
      { key: 'drainageStyle', label: 'Drainage Style', type: 'text' },
    ]),
  ],
};

const doorSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.DOOR,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'roughOpeningWidth', label: 'Rough Opening Width', type: 'number', unit: 'mm', required: true },
      { key: 'roughOpeningHeight', label: 'Rough Opening Height', type: 'number', unit: 'mm', required: true },
      { key: 'frameDepth', label: 'Frame Depth', type: 'number', unit: 'mm' },
      { key: 'doorLeafCount', label: 'Door Leaf Count', type: 'number', defaultValue: 1 },
      { key: 'swingDirection', label: 'Swing Direction', type: 'select', options: [option('Left hand'), option('Right hand'), option('Double swing'), option('Sliding')] },
      { key: 'hardwareClearance', label: 'Hardware Clearance', type: 'text' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'wallMaterial', label: 'Wall Material', type: 'text' },
      { key: 'floorLevelCondition', label: 'Floor Level Condition', type: 'text' },
      { key: 'waterExposure', label: 'Water Exposure', type: 'select', options: [option('Low'), option('Medium'), option('High')] },
      { key: 'accessSide', label: 'Access Side', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'frameMaterial', label: 'Frame Material', type: 'text', required: true },
      { key: 'panelMaterial', label: 'Panel Material', type: 'text' },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
      { key: 'locksetType', label: 'Lockset Type', type: 'text' },
      { key: 'ventilationProvision', label: 'Ventilation Provision', type: 'text' },
    ]),
  ],
};

const windowFrameSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.WINDOW_FRAME,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'openingWidth', label: 'Opening Width', type: 'number', unit: 'mm', required: true },
      { key: 'openingHeight', label: 'Opening Height', type: 'number', unit: 'mm', required: true },
      { key: 'frameDepth', label: 'Frame Depth', type: 'number', unit: 'mm' },
      { key: 'panelCount', label: 'Panel Count', type: 'number' },
      { key: 'glassThickness', label: 'Glass Thickness', type: 'number', unit: 'mm' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'wallOpeningCondition', label: 'Wall Opening Condition', type: 'text' },
      { key: 'exposure', label: 'Indoor/Outdoor Exposure', type: 'select', options: [option('Indoor'), option('Outdoor'), option('Mixed')] },
      { key: 'existingFrameRemoval', label: 'Existing Frame Removal', type: 'checkbox', defaultValue: false },
      { key: 'waterproofingConcern', label: 'Waterproofing Concern', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'frameMaterial', label: 'Frame Material', type: 'text', required: true },
      { key: 'frameStyle', label: 'Frame Style', type: 'select', options: [option('Fixed'), option('Sliding'), option('Awning'), option('Security frame')] },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
      { key: 'grillProvision', label: 'Grill Provision', type: 'text' },
    ]),
  ],
};

const shelvingSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.SHELVING,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'shelfLength', label: 'Shelf Length', type: 'number', unit: 'mm', required: true },
      { key: 'shelfDepth', label: 'Shelf Depth', type: 'number', unit: 'mm', required: true },
      { key: 'totalHeight', label: 'Total Height', type: 'number', unit: 'mm' },
      { key: 'tierCount', label: 'Tier Count', type: 'number', required: true },
      { key: 'loadRequirement', label: 'Load Requirement', type: 'text' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'mountingWallMaterial', label: 'Mounting Wall Material', type: 'text' },
      { key: 'floorSupport', label: 'Floor Support', type: 'text' },
      { key: 'clearanceRestriction', label: 'Clearance Restriction', type: 'text' },
      { key: 'foodGradeArea', label: 'Food Grade Area', type: 'checkbox', defaultValue: false },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'shelfMaterial', label: 'Shelf Material', type: 'text', required: true },
      { key: 'supportMaterial', label: 'Support Material', type: 'text' },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
      { key: 'edgeDetail', label: 'Edge Detail', type: 'text' },
    ]),
  ],
};

const kitchenCabinetSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.KITCHEN_CABINET,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'cabinetLength', label: 'Cabinet Length', type: 'number', unit: 'mm', required: true },
      { key: 'cabinetDepth', label: 'Cabinet Depth', type: 'number', unit: 'mm', required: true },
      { key: 'cabinetHeight', label: 'Cabinet Height', type: 'number', unit: 'mm', required: true },
      { key: 'moduleCount', label: 'Module Count', type: 'number' },
      { key: 'shelfSpacing', label: 'Shelf Spacing', type: 'text' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'wallSupport', label: 'Wall Support', type: 'text' },
      { key: 'plumbingNearby', label: 'Plumbing Nearby', type: 'checkbox', defaultValue: false },
      { key: 'electricalNearby', label: 'Electrical Nearby', type: 'checkbox', defaultValue: false },
      { key: 'existingCabinetRemoval', label: 'Existing Cabinet Removal', type: 'checkbox', defaultValue: false },
      { key: 'floorLevelCondition', label: 'Floor Level Condition', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'bodyMaterial', label: 'Body Material', type: 'text', required: true },
      { key: 'doorType', label: 'Door Type', type: 'text' },
      { key: 'counterFinish', label: 'Cabinet Finish', type: 'text', required: true },
      { key: 'handleType', label: 'Handle Type', type: 'text' },
      { key: 'lockProvision', label: 'Lock Provision', type: 'text' },
    ]),
  ],
};

const tableSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.TABLE,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'tableLength', label: 'Table Length', type: 'number', unit: 'mm', required: true },
      { key: 'tableWidth', label: 'Table Width', type: 'number', unit: 'mm', required: true },
      { key: 'tableHeight', label: 'Table Height', type: 'number', unit: 'mm', required: true },
      { key: 'topThickness', label: 'Top Thickness', type: 'number', unit: 'mm' },
      { key: 'loadRequirement', label: 'Load Requirement', type: 'text' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'floorLevelCondition', label: 'Floor Level Condition', type: 'text' },
      { key: 'mobilityRequirement', label: 'Mobility Requirement', type: 'select', options: [option('Fixed legs'), option('Casters'), option('Adjustable feet')] },
      { key: 'foodGradeArea', label: 'Food Grade Area', type: 'checkbox', defaultValue: false },
      { key: 'equipmentClearance', label: 'Equipment Clearance', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'topMaterial', label: 'Top Material', type: 'text', required: true },
      { key: 'frameMaterial', label: 'Frame Material', type: 'text' },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
      { key: 'undershelfRequirement', label: 'Undershelf Requirement', type: 'text' },
    ]),
  ],
};

const chairSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.CHAIR,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'seatWidth', label: 'Seat Width', type: 'number', unit: 'mm', required: true },
      { key: 'seatDepth', label: 'Seat Depth', type: 'number', unit: 'mm' },
      { key: 'seatHeight', label: 'Seat Height', type: 'number', unit: 'mm', required: true },
      { key: 'backrestHeight', label: 'Backrest Height', type: 'number', unit: 'mm' },
      { key: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1 },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'useLocation', label: 'Use Location', type: 'select', options: [option('Indoor'), option('Outdoor'), option('Commercial kitchen'), option('Dining area')] },
      { key: 'floorSurface', label: 'Floor Surface', type: 'text' },
      { key: 'stackableRequirement', label: 'Stackable Requirement', type: 'checkbox', defaultValue: false },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'frameMaterial', label: 'Frame Material', type: 'text', required: true },
      { key: 'seatMaterial', label: 'Seat Material', type: 'text' },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
      { key: 'backrestStyle', label: 'Backrest Style', type: 'text' },
    ]),
  ],
};

const staircaseSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.STAIRCASE,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'totalRise', label: 'Total Rise', type: 'number', unit: 'mm', required: true },
      { key: 'stairRun', label: 'Stair Run', type: 'number', unit: 'mm', required: true },
      { key: 'stairWidth', label: 'Stair Width', type: 'number', unit: 'mm' },
      { key: 'treadCount', label: 'Tread Count', type: 'number', required: true },
      { key: 'landingCount', label: 'Landing Count', type: 'number' },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'mountingBase', label: 'Mounting Base', type: 'text' },
      { key: 'headroomClearance', label: 'Headroom Clearance', type: 'text' },
      { key: 'indoorOutdoorExposure', label: 'Indoor/Outdoor Exposure', type: 'select', options: [option('Indoor'), option('Outdoor'), option('Mixed')] },
      { key: 'existingStructureConnection', label: 'Existing Structure Connection', type: 'text' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'stringerMaterial', label: 'Stringer Material', type: 'text', required: true },
      { key: 'treadMaterial', label: 'Tread Material', type: 'text' },
      { key: 'railingStyle', label: 'Railing Style', type: 'text' },
      { key: 'finishType', label: 'Finish Type', type: 'text', required: true },
      { key: 'antiSlipProvision', label: 'Anti-slip Provision', type: 'text' },
    ]),
  ],
};

const customSchema: ServiceSpecificationSchema = {
  serviceType: ServiceType.CUSTOM,
  sections: [
    section('measurements', 'Measurements', [
      { key: 'primaryDimension', label: 'Primary Dimension', type: 'text', required: true, placeholder: 'e.g., 2400 x 900 x 850 mm' },
      { key: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1 },
    ]),
    section('siteConditions', 'Site Conditions', [
      { key: 'installationLocation', label: 'Installation Location', type: 'text' },
      { key: 'accessConstraints', label: 'Access Constraints', type: 'textarea' },
    ]),
    section('materialsDesign', 'Materials & Design', [
      { key: 'materialPreference', label: 'Material Preference', type: 'text', required: true },
      { key: 'finishPreference', label: 'Finish Preference', type: 'text' },
      { key: 'designDirection', label: 'Design Direction', type: 'textarea' },
    ]),
    section('additional', 'Additional Specifications', [
      { key: 'clientNotes', label: 'Client Notes', type: 'textarea' },
    ]),
  ],
};

const fallbackSchema = (serviceType: string): ServiceSpecificationSchema => ({
  ...customSchema,
  serviceType,
});

const schemas: Partial<Record<ServiceType, ServiceSpecificationSchema>> = {
  [ServiceType.RAILINGS]: railingSchema,
  [ServiceType.GRILLS]: grillSchema,
  [ServiceType.GATES]: gateSchema,
  [ServiceType.KITCHEN_COUNTER]: kitchenCounterSchema,
  [ServiceType.CANOPY]: canopySchema,
  [ServiceType.DOOR]: doorSchema,
  [ServiceType.WINDOW_FRAME]: windowFrameSchema,
  [ServiceType.SHELVING]: shelvingSchema,
  [ServiceType.KITCHEN_CABINET]: kitchenCabinetSchema,
  [ServiceType.TABLE]: tableSchema,
  [ServiceType.CHAIR]: chairSchema,
  [ServiceType.STAIRCASE]: staircaseSchema,
  [ServiceType.FENCES]: railingSchema,
  [ServiceType.BALUSTRADE]: railingSchema,
  [ServiceType.CUSTOM]: customSchema,
  [ServiceType.SIGNAGE]: customSchema,
};

export function getServiceSpecificationSchema(serviceType?: string): ServiceSpecificationSchema {
  const key = serviceType as ServiceType | undefined;
  if (key && schemas[key]) return schemas[key]!;
  return fallbackSchema(serviceType || ServiceType.CUSTOM);
}

export function hasMeaningfulSpecifications(specifications?: ServiceSpecifications, section?: SpecificationSectionKey) {
  if (!specifications) return false;
  const sections = section ? [section] : (['measurements', 'siteConditions', 'materialsDesign', 'additional'] as SpecificationSectionKey[]);
  return sections.some((key) => Object.values(specifications[key] || {}).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    return value === true;
  }));
}

export function createDefaultSpecifications(serviceType?: string): ServiceSpecifications {
  const schema = getServiceSpecificationSchema(serviceType);
  const specifications: ServiceSpecifications = {};

  schema.sections.forEach((entry) => {
    const target: Record<string, string | number | boolean> = {};
    entry.fields.forEach((field) => {
      if (field.defaultValue !== undefined) target[field.key] = field.defaultValue;
    });
    if (Object.keys(target).length > 0) specifications[entry.key] = target;
  });

  return specifications;
}

export function normalizeServiceSpecifications(
  serviceType: string | undefined,
  current?: ServiceSpecifications,
): ServiceSpecifications {
  if (!current) return {};

  const next: ServiceSpecifications = {};
  (['measurements', 'siteConditions', 'materialsDesign', 'additional'] as SpecificationSectionKey[]).forEach((key) => {
    if (current[key]) next[key] = { ...current[key] };
  });

  if (serviceType === ServiceType.RAILINGS && next.siteConditions) {
    delete next.siteConditions.balconyEdgeCondition;
    if (next.siteConditions.mountingSurface === 'Concrete balcony') {
      next.siteConditions.mountingSurface = 'Concrete Balcony';
    }
  }

  return next;
}

export function mergeSpecificationsWithDefaults(serviceType: string | undefined, current?: ServiceSpecifications): ServiceSpecifications {
  const defaults = createDefaultSpecifications(serviceType);
  const next: ServiceSpecifications = { ...defaults };
  if (!current) return next;
  const normalized = normalizeServiceSpecifications(serviceType, current);

  (['measurements', 'siteConditions', 'materialsDesign', 'additional'] as SpecificationSectionKey[]).forEach((key) => {
    next[key] = {
      ...(defaults[key] || {}),
      ...(normalized[key] || {}),
    };
  });
  return next;
}

export function getMissingRequiredSpecificationFields(serviceType: string | undefined, specifications?: ServiceSpecifications) {
  const schema = getServiceSpecificationSchema(serviceType);
  const missing: string[] = [];

  schema.sections.forEach((entry) => {
    const source = specifications?.[entry.key] || {};
    entry.fields.forEach((field) => {
      if (!field.required) return;
      const value = source[field.key];
      const isMissing = value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);
      if (isMissing) missing.push(`${entry.label}: ${field.label}`);
    });
  });

  return missing;
}
