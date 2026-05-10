import { ServiceType } from './constants';
import { getServiceSpecificationSchema, type SpecificationField } from './service-specifications';
import type { LineItem } from './types';
import type { ServiceSpecifications } from './types';

export interface DesignTemplate {
  id: string;
  serviceType: ServiceType;
  title: string;
  imageUrl: string;
  material: string;
  finish: string;
  style: string;
  suggestedLineItems: LineItem[];
  suggestedSpecifications?: ServiceSpecifications;
  preferredDesign: string;
  initialDesignNotes: string;
}

const images = {
  grill: [
    '/landing/grill-concepts/cover.png',
    '/landing/grill-concepts/project-1.png',
    '/landing/grill-concepts/project-2.png',
  ],
  metal: [
    '/landing/custom-metalworks/cover.png',
    '/landing/custom-metalworks/project-1.png',
    '/landing/custom-metalworks/project-2.png',
  ],
  kitchen: [
    '/landing/commercial-kitchens/cover.png',
    '/landing/commercial-kitchens/project-1.jpg',
    '/landing/commercial-kitchens/project-2.png',
  ],
  completed: [
    '/landing/completed-works/cover.png',
    '/landing/completed-works/project-1.jpg',
    '/landing/completed-works/project-2.png',
  ],
  stall: [
    '/landing/food-stall-systems/cover.png',
    '/landing/food-stall-systems/project-1.png',
    '/landing/food-stall-systems/project-2.png',
  ],
} as const;

export function getDesignTemplatePlaceholderImage(
  serviceType?: string,
  title = 'Design Template',
): string {
  const label = title.replace(/&/g, 'and');
  const type = String(serviceType || ServiceType.CUSTOM).replace(/_/g, ' ').toUpperCase();
  const accent = serviceType === ServiceType.KITCHEN_COUNTER || serviceType === ServiceType.KITCHEN_CABINET
    ? '#2f7d68'
    : serviceType === ServiceType.GATES || serviceType === ServiceType.FENCES || serviceType === ServiceType.GRILLS
      ? '#5c7694'
      : serviceType === ServiceType.SIGNAGE
        ? '#8a6a2f'
        : '#64748b';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 520" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#f8fafc"/>
          <stop offset="1" stop-color="#dbe3ec"/>
        </linearGradient>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#cbd5e1" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="1200" height="520" fill="url(#bg)"/>
      <rect width="1200" height="520" fill="url(#grid)" opacity="0.55"/>
      <rect x="76" y="64" width="1048" height="336" rx="22" fill="#ffffff" opacity="0.82" stroke="#94a3b8" stroke-width="3"/>
      <path d="M160 328 H1040" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>
      <path d="M210 328 V156 M370 328 V156 M530 328 V156 M690 328 V156 M850 328 V156 M1010 328 V156" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.9"/>
      <path d="M160 156 H1040 M160 242 H1040" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.72"/>
      <path d="M140 418 H1060" stroke="#475569" stroke-width="3" stroke-dasharray="18 14" opacity="0.55"/>
      <text x="76" y="454" fill="#334155" font-family="Arial, sans-serif" font-size="34" font-weight="700">${label}</text>
      <text x="76" y="490" fill="#64748b" font-family="Arial, sans-serif" font-size="22" letter-spacing="3">${type} TEMPLATE PREVIEW</text>
      <text x="1030" y="490" fill="${accent}" font-family="Arial, sans-serif" font-size="22" font-weight="700" text-anchor="end">CONCEPT</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function item(
  label: string,
  notes: string,
  dimensions?: Partial<Pick<LineItem, 'length' | 'width' | 'height' | 'thickness' | 'area' | 'quantity'>>,
): LineItem {
  const length = dimensions?.length ?? 120;
  const width = dimensions?.width ?? 10;
  const height = dimensions?.height ?? 100;
  const thickness = dimensions?.thickness ?? 2;
  const area = dimensions?.area ?? Number((length * width).toFixed(2));
  return {
    label,
    length,
    width,
    height,
    thickness,
    area,
    quantity: dimensions?.quantity ?? 1,
    notes,
  };
}

function defaultTemplateSpecs(
  serviceType: ServiceType,
  index: number,
  material: string,
  finish: string,
  style: string,
): ServiceSpecifications {
  const variant = index + 1;
  switch (serviceType) {
    case ServiceType.DOOR:
      return {
        measurements: { roughOpeningWidth: 900 + index * 100, roughOpeningHeight: 2100, frameDepth: 75, doorLeafCount: variant === 2 ? 2 : 1 },
        siteConditions: { wallMaterial: 'Concrete or masonry opening', floorLevelCondition: 'Verify floor level on site', waterExposure: variant === 3 ? 'Medium' : 'Low' },
        materialsDesign: { frameMaterial: material, panelMaterial: variant === 2 ? 'Glass-ready panel provision' : 'Stainless sheet panel', finishType: finish, locksetType: 'Lever lockset' },
      };
    case ServiceType.WINDOW_FRAME:
      return {
        measurements: { openingWidth: 1200 + index * 100, openingHeight: 1000 + index * 100, frameDepth: 50, panelCount: variant === 1 ? 1 : 2 },
        siteConditions: { wallOpeningCondition: 'Verify square opening and waterproofing', exposure: variant === 1 ? 'Indoor' : 'Outdoor', existingFrameRemoval: false },
        materialsDesign: { frameMaterial: material, frameStyle: variant === 1 ? 'Fixed' : 'Sliding', finishType: finish, grillProvision: variant === 3 ? 'Security grill provision' : 'To confirm' },
      };
    case ServiceType.TABLE:
      return {
        measurements: { tableLength: 1800, tableWidth: 700 + index * 50, tableHeight: 850, topThickness: 1.5, loadRequirement: 'Commercial prep use' },
        siteConditions: { floorLevelCondition: 'Check leveling feet requirement', mobilityRequirement: variant === 2 ? 'Casters' : 'Fixed legs', foodGradeArea: true },
        materialsDesign: { topMaterial: material, frameMaterial: 'Stainless support frame', finishType: finish, undershelfRequirement: variant === 2 ? 'With lower shelf' : 'To confirm' },
      };
    case ServiceType.CHAIR:
      return {
        measurements: { seatWidth: 420, seatDepth: 420, seatHeight: 450, backrestHeight: variant === 1 ? 0 : 380, quantity: 1 },
        siteConditions: { useLocation: variant === 1 ? 'Dining area' : 'Indoor', floorSurface: 'Verify floor finish', stackableRequirement: variant === 2 },
        materialsDesign: { frameMaterial: material, seatMaterial: 'Customer-selected seat surface', finishType: finish, backrestStyle: style },
      };
    case ServiceType.SHELVING:
      return {
        measurements: { shelfLength: 1500, shelfDepth: 400 + index * 50, totalHeight: variant === 1 ? 0 : 1800, tierCount: variant === 1 ? 1 : 4, loadRequirement: 'Confirm stored item weight' },
        siteConditions: { mountingWallMaterial: 'Verify wall/base support', floorSupport: variant === 1 ? 'Wall brackets' : 'Floor standing', foodGradeArea: true },
        materialsDesign: { shelfMaterial: material, supportMaterial: 'Stainless brackets/frame', finishType: finish, edgeDetail: 'Hemmed safe edge' },
      };
    case ServiceType.KITCHEN_COUNTER:
      return {
        measurements: { counterLength: 2400, counterWidth: 700, counterHeight: 900, sinkCutout: variant === 1 ? 'Single sink provision' : 'To confirm', backsplashHeight: 150, applianceClearance: 'Confirm equipment layout' },
        siteConditions: { plumbingNearby: true, electricalNearby: variant !== 1, existingCabinetLayout: 'Verify site layout', floorType: 'Tile or concrete', appliancePlacement: 'To confirm' },
        materialsDesign: { stainlessGrade: material, counterFinish: finish, sinkConfiguration: variant === 1 ? 'Single bowl' : 'Custom', edgeStyle: 'Rounded front edge' },
      };
    case ServiceType.KITCHEN_CABINET:
      return {
        measurements: { cabinetLength: 1800, cabinetDepth: 600, cabinetHeight: variant === 2 ? 750 : 850, moduleCount: 3, shelfSpacing: 'Adjustable shelves' },
        siteConditions: { wallSupport: variant === 2 ? 'Verify wall anchoring' : 'Floor standing', plumbingNearby: variant === 1, electricalNearby: false, existingCabinetRemoval: false },
        materialsDesign: { bodyMaterial: material, doorType: variant === 1 ? 'Swing doors' : 'Sliding/swing to confirm', counterFinish: finish, handleType: 'Stainless pull handle' },
      };
    case ServiceType.STAIRCASE:
      return {
        measurements: { totalRise: 2800, stairRun: 3600, stairWidth: 900, treadCount: 14, landingCount: variant === 1 ? 1 : 0 },
        siteConditions: { mountingBase: 'Concrete landing/base', headroomClearance: 'Verify on site', indoorOutdoorExposure: variant === 2 ? 'Outdoor' : 'Indoor', existingStructureConnection: 'To confirm' },
        materialsDesign: { stringerMaterial: material, treadMaterial: 'Stainless or anti-slip tread', railingStyle: style, finishType: finish, antiSlipProvision: 'Recommended' },
      };
    case ServiceType.CUSTOM:
    case ServiceType.SIGNAGE:
      return {
        measurements: { primaryDimension: 'Confirm final dimensions on site', quantity: 1 },
        siteConditions: { installationLocation: 'To confirm', accessConstraints: 'Verify access during consultation' },
        materialsDesign: { materialPreference: material, finishPreference: finish, designDirection: style },
      };
    default:
      return {};
  }
}

function fallbackFieldValue(
  field: SpecificationField,
  index: number,
  material: string,
  finish: string,
  style: string,
): string | number | boolean {
  if (field.defaultValue !== undefined) return field.defaultValue;

  if (field.type === 'checkbox') return true;
  if (field.type === 'select') return field.options?.[index % Math.max(field.options.length, 1)]?.value || field.options?.[0]?.value || 'To confirm';
  if (field.type === 'number') {
    const key = field.key.toLowerCase();
    if (key.includes('height')) return 900 + index * 100;
    if (key.includes('width')) return 1200 + index * 100;
    if (key.includes('length') || key.includes('run')) return 2400 + index * 300;
    if (key.includes('spacing')) return 100 + index * 25;
    if (key.includes('thickness')) return 1.5 + index * 0.5;
    if (key.includes('count') || key.includes('quantity')) return index + 1;
    if (key.includes('depth')) return 50 + index * 25;
    if (key.includes('clearance')) return 900 + index * 100;
    return 1000 + index * 100;
  }

  const key = field.key.toLowerCase();
  if (key.includes('material') || key.includes('grade')) return material;
  if (key.includes('finish') || key.includes('coating')) return finish;
  if (key.includes('style') || key.includes('pattern') || key.includes('design') || key.includes('direction')) return style;
  if (key.includes('lock')) return 'Standard lock provision';
  if (key.includes('surface') || key.includes('base') || key.includes('wall') || key.includes('floor')) return 'Verify existing site condition';
  if (key.includes('exposure')) return 'Medium exposure';
  if (key.includes('plumbing')) return 'Verify plumbing access';
  if (key.includes('electrical')) return 'Verify electrical access';
  if (key.includes('drainage')) return 'Confirm drainage route';
  if (key.includes('clearance')) return 'Confirm required clearance';
  return 'To confirm with customer';
}

function completeTemplateSpecifications(
  serviceType: ServiceType,
  index: number,
  material: string,
  finish: string,
  style: string,
  source?: ServiceSpecifications,
): ServiceSpecifications {
  const schema = getServiceSpecificationSchema(serviceType);
  const next: ServiceSpecifications = {};

  schema.sections.forEach((entry) => {
    const existing = source?.[entry.key] || {};
    const target: Record<string, string | number | boolean> = {};

    entry.fields.forEach((field) => {
      const existingValue = existing[field.key];
      target[field.key] = existingValue !== undefined && existingValue !== ''
        ? existingValue
        : fallbackFieldValue(field, index, material, finish, style);
    });

    next[entry.key] = target;
  });

  return next;
}

function makeTemplate(
  serviceType: ServiceType,
  index: number,
  title: string,
  _imageUrl: string,
  material: string,
  finish: string,
  style: string,
  suggestedLineItems: LineItem[],
  suggestedSpecifications?: ServiceSpecifications,
): DesignTemplate {
  return {
    id: `${serviceType}-${index + 1}`,
    serviceType,
    title,
    imageUrl: getDesignTemplatePlaceholderImage(serviceType, title),
    material,
    finish,
    style,
    suggestedLineItems,
    suggestedSpecifications: completeTemplateSpecifications(
      serviceType,
      index,
      material,
      finish,
      style,
      suggestedSpecifications || defaultTemplateSpecs(serviceType, index, material, finish, style),
    ),
    preferredDesign: style,
    initialDesignNotes: `${title} selected as starting reference. Confirm final measurements, material grade, finish, mounting details, and custom changes with the customer.`,
  };
}

const catalog: Partial<Record<ServiceType, DesignTemplate[]>> = {
  [ServiceType.RAILINGS]: [
    makeTemplate(ServiceType.RAILINGS, 0, 'Horizontal Stainless Railing', images.metal[0], 'Stainless steel 304 tubular frame', 'Brushed satin finish', 'Modern horizontal bar railing', [item('Railing run', 'Confirm total run length, post spacing, and mounting surface.')], { measurements: { totalRunLength: 4200, railHeight: 1050, postSpacing: 1200 }, siteConditions: { mountingSurface: 'Concrete balcony', outdoorExposure: 'Medium' }, materialsDesign: { tubeMaterial: 'SS304 tubular', finishType: 'Brushed satin', handrailStyle: 'Horizontal' } }),
    makeTemplate(ServiceType.RAILINGS, 1, 'Glass Accent Railing', images.completed[1], 'Stainless steel posts with glass-ready clamps', 'Polished stainless finish', 'Contemporary railing with glass panel provision', [item('Railing section', 'Confirm glass panel count, height, and clamp spacing.')], { measurements: { totalRunLength: 3600, railHeight: 1050, sectionCount: 3 }, materialsDesign: { tubeMaterial: 'SS304 post + clamp', finishType: 'Polished', balusterStyle: 'Glass infill' } }),
    makeTemplate(ServiceType.RAILINGS, 2, 'Balcony Safety Railing', images.metal[1], 'Stainless steel 316 outdoor-grade frame', 'Weather-resistant brushed finish', 'Outdoor balcony safety railing', [item('Balcony railing', 'Confirm exposure, floor anchoring, and safety height.')], { measurements: { totalRunLength: 5200, railHeight: 1100, postSpacing: 1000 }, siteConditions: { outdoorExposure: 'High' }, materialsDesign: { tubeMaterial: 'SS316 outdoor', finishType: 'Weather brushed' } }),
  ],
  [ServiceType.GRILLS]: [
    makeTemplate(ServiceType.GRILLS, 0, 'Security Window Grill', images.grill[0], 'Stainless steel square bar', 'Powder-coated black finish', 'Clean geometric security grill', [item('Window grill panel', 'Confirm window opening size and hinge or fixed mounting.')], { measurements: { windowWidth: 1200, windowHeight: 1500, barSpacing: 100 }, materialsDesign: { barMaterial: 'SS square bar', grillPattern: 'Grid', finishType: 'Powder-coated black' } }),
    makeTemplate(ServiceType.GRILLS, 1, 'Decorative Grill Pattern', images.grill[1], 'Stainless steel flat bar and round bar', 'Brushed stainless finish', 'Decorative patterned grill', [item('Decorative grill panel', 'Confirm pattern spacing and frame thickness.')], { measurements: { windowWidth: 1000, windowHeight: 1400, frameDepth: 50 }, materialsDesign: { barMaterial: 'Flat + round bar', grillPattern: 'Decorative', finishType: 'Brushed stainless' } }),
    makeTemplate(ServiceType.GRILLS, 2, 'Minimal Linear Grill', images.grill[2], 'Stainless steel round bar', 'Matte powder-coated finish', 'Minimal linear grill design', [item('Linear grill panel', 'Confirm bar spacing and latch requirements.')], { measurements: { windowWidth: 1100, windowHeight: 1300, barSpacing: 120 }, materialsDesign: { openingDirection: 'Fixed', lockProvision: 'Latch-ready', finishType: 'Matte powder coat' } }),
  ],
  [ServiceType.GATES]: [
    makeTemplate(ServiceType.GATES, 0, 'Sliding Stainless Gate', images.metal[2], 'Stainless steel tubular frame', 'Brushed satin finish', 'Sliding gate with clean horizontal lines', [item('Gate leaf', 'Confirm clear opening, track length, and motor provision.')], { measurements: { gateWidth: 3600, gateHeight: 1800, openingClearance: 3700 }, materialsDesign: { frameMaterial: 'SS tubular', motionType: 'Sliding', lockType: 'Dropbolt + latch' } }),
    makeTemplate(ServiceType.GATES, 1, 'Swing Gate Frame', images.completed[0], 'Stainless steel frame with sheet accents', 'Powder-coated charcoal finish', 'Two-panel swing gate', [item('Swing gate pair', 'Confirm leaf width, hinge posts, and lockset.')], { measurements: { gateWidth: 3200, gateHeight: 1700, panelCount: 2 }, materialsDesign: { frameMaterial: 'SS frame', motionType: 'Swing', paintFinish: 'Charcoal powder coat' } }),
    makeTemplate(ServiceType.GATES, 2, 'Mixed Panel Gate', images.stall[1], 'Stainless frame with perforated panel inserts', 'Semi-gloss powder coat', 'Privacy gate with panel inserts', [item('Gate panel set', 'Confirm privacy panel height and gap spacing.')], { measurements: { gateWidth: 3000, gateHeight: 1800 }, siteConditions: { groundSlope: 'Slight', fenceConnection: 'Right side wall' }, materialsDesign: { panelStyle: 'Perforated insert', lockType: 'Lever lock' } }),
  ],
  [ServiceType.FENCES]: [
    makeTemplate(ServiceType.FENCES, 0, 'Linear Boundary Fence', images.metal[1], 'Stainless steel posts and horizontal rails', 'Brushed outdoor finish', 'Modern linear perimeter fence', [item('Fence run', 'Confirm total boundary length, post spacing, and gate connection.', { length: 6000, width: 60, height: 1500 })], { measurements: { totalRunLength: 6000, fenceHeight: 1500, postSpacing: 1200 }, siteConditions: { mountingSurface: 'Concrete footing or wall top', outdoorExposure: 'High' }, materialsDesign: { tubeMaterial: 'SS304 tubular', finishType: 'Brushed outdoor', panelStyle: 'Horizontal rail' } }),
    makeTemplate(ServiceType.FENCES, 1, 'Privacy Panel Fence', images.completed[1], 'Stainless frame with sheet or perforated inserts', 'Powder-coated charcoal finish', 'Privacy fence with panel inserts', [item('Privacy fence bay', 'Confirm panel opacity, height, and bay count.', { length: 2400, width: 50, height: 1800, quantity: 3 })], { measurements: { totalRunLength: 7200, fenceHeight: 1800, panelCount: 3 }, siteConditions: { windExposure: 'Medium', existingWallConnection: 'To confirm' }, materialsDesign: { panelMaterial: 'Perforated stainless insert', finishType: 'Charcoal powder coat', frameMaterial: 'SS rectangular tube' } }),
    makeTemplate(ServiceType.FENCES, 2, 'Security Fence Extension', images.grill[2], 'Stainless steel vertical bars and top rail', 'Matte protective coating', 'Security-focused fence extension', [item('Fence extension', 'Confirm existing wall height, anchor detail, and bar spacing.', { length: 5000, width: 40, height: 900 })], { measurements: { totalRunLength: 5000, extensionHeight: 900, barSpacing: 100 }, siteConditions: { existingBase: 'Masonry wall', accessConstraints: 'Verify drilling access' }, materialsDesign: { barMaterial: 'SS round bar', finishType: 'Matte protective coat', topDetail: 'Continuous top rail' } }),
  ],
  [ServiceType.DOOR]: [
    makeTemplate(ServiceType.DOOR, 0, 'Stainless Utility Door', images.metal[1], 'Stainless sheet and tubular frame', 'Brushed stainless finish', 'Industrial stainless door', [item('Door assembly', 'Confirm rough opening, swing direction, and hardware.')]),
    makeTemplate(ServiceType.DOOR, 1, 'Glass-Framed Door', images.completed[2], 'Stainless frame with glass provision', 'Polished stainless finish', 'Glass-ready stainless door frame', [item('Door frame', 'Confirm glass thickness and lockset location.')]),
    makeTemplate(ServiceType.DOOR, 2, 'Service Access Door', images.kitchen[1], 'Stainless steel sheet', 'Hairline finish', 'Commercial service access door', [item('Access door', 'Confirm opening size and ventilation requirements.')]),
  ],
  [ServiceType.WINDOW_FRAME]: [
    makeTemplate(ServiceType.WINDOW_FRAME, 0, 'Fixed Window Frame', images.grill[1], 'Stainless steel angle and flat bar', 'Brushed stainless finish', 'Fixed stainless window frame', [item('Window frame', 'Confirm glass size and frame depth.')]),
    makeTemplate(ServiceType.WINDOW_FRAME, 1, 'Sliding Window Frame', images.grill[2], 'Stainless steel track and frame', 'Powder-coated finish', 'Sliding stainless frame', [item('Sliding frame', 'Confirm panel count and track clearance.')]),
    makeTemplate(ServiceType.WINDOW_FRAME, 2, 'Security Frame Set', images.grill[0], 'Stainless steel frame with grill provision', 'Matte black finish', 'Window frame with security grill', [item('Frame and grill set', 'Confirm opening size and security pattern.')]),
  ],
  [ServiceType.TABLE]: [
    makeTemplate(ServiceType.TABLE, 0, 'Stainless Work Table', images.kitchen[2], 'Stainless steel 304 top and legs', 'Brushed food-grade finish', 'Commercial kitchen work table', [item('Table top', 'Confirm length, width, height, and shelf requirement.')]),
    makeTemplate(ServiceType.TABLE, 1, 'Prep Table With Shelf', images.stall[2], 'Stainless steel top with lower shelf', 'Food-grade satin finish', 'Preparation table with undershelf', [item('Prep table', 'Confirm shelf clearance and caster requirement.')]),
    makeTemplate(ServiceType.TABLE, 2, 'Custom Utility Table', images.completed[2], 'Stainless steel frame and top', 'Brushed finish', 'Custom utility table', [item('Utility table', 'Confirm load capacity and working height.')]),
  ],
  [ServiceType.CHAIR]: [
    makeTemplate(ServiceType.CHAIR, 0, 'Stainless Stool Frame', images.metal[0], 'Stainless tubular frame', 'Brushed finish', 'Minimal stool frame', [item('Chair frame', 'Confirm seat height and seat material.')]),
    makeTemplate(ServiceType.CHAIR, 1, 'Utility Chair Frame', images.metal[1], 'Stainless steel tubular frame', 'Powder-coated finish', 'Utility chair frame', [item('Chair assembly', 'Confirm backrest and seat dimensions.')]),
    makeTemplate(ServiceType.CHAIR, 2, 'Custom Seat Support', images.completed[0], 'Stainless support frame', 'Satin finish', 'Custom seat support', [item('Seat support', 'Confirm mounting points and load requirement.')]),
  ],
  [ServiceType.SHELVING]: [
    makeTemplate(ServiceType.SHELVING, 0, 'Wall-Mounted Shelf', images.kitchen[0], 'Stainless steel shelf with brackets', 'Food-grade brushed finish', 'Wall-mounted stainless shelf', [item('Shelf run', 'Confirm wall material, length, depth, and bracket spacing.')]),
    makeTemplate(ServiceType.SHELVING, 1, 'Multi-Tier Rack', images.stall[0], 'Stainless steel rack frame', 'Brushed stainless finish', 'Multi-tier storage rack', [item('Rack unit', 'Confirm tier count, height, and shelf spacing.')]),
    makeTemplate(ServiceType.SHELVING, 2, 'Heavy-Duty Shelf', images.completed[2], 'Stainless steel heavy-duty frame', 'Matte stainless finish', 'Heavy-duty shelving unit', [item('Shelf unit', 'Confirm load capacity and footprint.')]),
  ],
  [ServiceType.KITCHEN_COUNTER]: [
    makeTemplate(ServiceType.KITCHEN_COUNTER, 0, 'Commercial Counter Line', images.kitchen[0], 'Stainless steel 304 countertop', 'Food-grade brushed finish', 'Commercial kitchen counter', [item('Counter section', 'Confirm counter length, depth, backsplash, and sink cutouts.')]),
    makeTemplate(ServiceType.KITCHEN_COUNTER, 1, 'Prep Counter With Storage', images.kitchen[1], 'Stainless steel counter with cabinet base', 'Satin stainless finish', 'Prep counter with storage', [item('Counter base', 'Confirm storage layout and access side.')]),
    makeTemplate(ServiceType.KITCHEN_COUNTER, 2, 'Food Stall Counter', images.stall[1], 'Stainless steel counter and display frame', 'Brushed finish', 'Food stall service counter', [item('Service counter', 'Confirm frontage, display opening, and equipment clearance.')]),
  ],
  [ServiceType.KITCHEN_CABINET]: [
    makeTemplate(ServiceType.KITCHEN_CABINET, 0, 'Stainless Base Cabinet', images.kitchen[2], 'Stainless steel cabinet body', 'Hairline stainless finish', 'Commercial base cabinet', [item('Cabinet module', 'Confirm module count, door type, and internal shelf spacing.')]),
    makeTemplate(ServiceType.KITCHEN_CABINET, 1, 'Wall Cabinet System', images.kitchen[0], 'Stainless steel wall cabinet', 'Brushed stainless finish', 'Wall-mounted kitchen cabinet', [item('Wall cabinet', 'Confirm wall support and cabinet height.')]),
    makeTemplate(ServiceType.KITCHEN_CABINET, 2, 'Custom Storage Cabinet', images.completed[1], 'Stainless steel cabinet frame', 'Satin finish', 'Custom stainless storage cabinet', [item('Storage cabinet', 'Confirm compartments and locking requirement.')]),
  ],
  [ServiceType.STAIRCASE]: [
    makeTemplate(ServiceType.STAIRCASE, 0, 'Stainless Stair Rail Set', images.metal[2], 'Stainless steel rail and posts', 'Brushed finish', 'Stair railing set', [item('Stair rail', 'Confirm stair run, landing count, and mounting points.')]),
    makeTemplate(ServiceType.STAIRCASE, 1, 'Industrial Stair Detail', images.completed[0], 'Stainless steel tread and rail parts', 'Anti-slip brushed finish', 'Industrial stair detail', [item('Stair section', 'Confirm tread count and width.')]),
    makeTemplate(ServiceType.STAIRCASE, 2, 'Custom Stair Guard', images.metal[1], 'Stainless tubular guard rail', 'Powder-coated finish', 'Custom stair guard rail', [item('Guard rail', 'Confirm height, run length, and post spacing.')]),
  ],
  [ServiceType.BALUSTRADE]: [
    makeTemplate(ServiceType.BALUSTRADE, 0, 'Stair Balustrade Set', images.completed[2], 'Stainless steel handrail and balusters', 'Brushed satin finish', 'Stair balustrade with vertical pickets', [item('Balustrade run', 'Confirm stair pitch, handrail height, and baluster spacing.', { length: 3800, width: 50, height: 1050 })], { measurements: { totalRunLength: 3800, railHeight: 1050, balusterSpacing: 100 }, siteConditions: { mountingSurface: 'Concrete stair side', indoorOutdoorExposure: 'Indoor' }, materialsDesign: { handrailMaterial: 'SS304 round tube', balusterStyle: 'Vertical pickets', finishType: 'Brushed satin' } }),
    makeTemplate(ServiceType.BALUSTRADE, 1, 'Glass Balustrade Provision', images.metal[2], 'Stainless posts with glass clamp provision', 'Polished stainless finish', 'Glass-ready balustrade system', [item('Glass balustrade section', 'Confirm glass thickness, clamp spacing, and edge clearance.', { length: 3200, width: 50, height: 1100 })], { measurements: { totalRunLength: 3200, railHeight: 1100, sectionCount: 3 }, siteConditions: { mountingSurface: 'Finished floor or side mount', safetyClearance: 'Confirm glass edge clearance' }, materialsDesign: { postMaterial: 'SS316 posts', infillType: 'Glass provision', finishType: 'Polished stainless' } }),
    makeTemplate(ServiceType.BALUSTRADE, 2, 'Balcony Balustrade', images.metal[0], 'Stainless tubular frame and infill bars', 'Weather-resistant brushed finish', 'Outdoor balcony balustrade', [item('Balcony balustrade', 'Confirm balcony edge length, water exposure, and anchor detail.', { length: 4800, width: 60, height: 1100 })], { measurements: { totalRunLength: 4800, railHeight: 1100, postSpacing: 1000 }, siteConditions: { outdoorExposure: 'High', mountingSurface: 'Concrete slab edge' }, materialsDesign: { frameMaterial: 'SS316 tubular', infillStyle: 'Horizontal bars', finishType: 'Weather brushed' } }),
  ],
  [ServiceType.CANOPY]: [
    makeTemplate(ServiceType.CANOPY, 0, 'Stainless Canopy Frame', images.completed[0], 'Stainless steel canopy frame', 'Weather-resistant brushed finish', 'Outdoor canopy frame', [item('Canopy frame', 'Confirm projection, width, and roofing material.')], { measurements: { projectionLength: 1800, totalWidth: 4200, supportPostCount: 3 }, materialsDesign: { roofingMaterial: 'Polycarbonate', structuralMaterial: 'SS frame' } }),
    makeTemplate(ServiceType.CANOPY, 1, 'Service Area Canopy', images.kitchen[1], 'Stainless frame with panel provision', 'Satin finish', 'Service area canopy', [item('Canopy section', 'Confirm support posts and drain direction.')], { measurements: { projectionLength: 1500, totalWidth: 3000, heightClearance: 2600 }, siteConditions: { drainageAccess: 'Rear downspout', roofConnectionType: 'Wall anchor' } }),
    makeTemplate(ServiceType.CANOPY, 2, 'Custom Shade Frame', images.metal[2], 'Stainless tubular frame', 'Powder-coated finish', 'Custom shade canopy frame', [item('Shade frame', 'Confirm mounting surface and span.')], { siteConditions: { windExposure: 'High', existingSupportStructure: 'Concrete columns' }, materialsDesign: { finishCoating: 'Powder coat', drainageStyle: 'Front gutter' } }),
  ],
  [ServiceType.SIGNAGE]: [
    makeTemplate(ServiceType.SIGNAGE, 0, 'Stainless Letter Signage', images.completed[0], 'Stainless steel cut letters', 'Brushed stainless finish', 'Wall-mounted letter signage', [item('Letter signage set', 'Confirm wording, letter height, wall surface, and mounting method.', { length: 1800, width: 40, height: 300 })], { measurements: { signWidth: 1800, signHeight: 300, letterDepth: 40 }, siteConditions: { installationLocation: 'Exterior wall', wallMaterial: 'Concrete or cladding' }, materialsDesign: { materialPreference: 'SS304 cut letters', finishPreference: 'Brushed stainless', lightingProvision: 'To confirm' } }),
    makeTemplate(ServiceType.SIGNAGE, 1, 'Box-Type Sign Frame', images.stall[0], 'Stainless frame with acrylic or panel face', 'Powder-coated frame finish', 'Box signage frame with face panel provision', [item('Sign box frame', 'Confirm sign face size, lighting access, and electrical route.', { length: 2400, width: 120, height: 600 })], { measurements: { signWidth: 2400, signHeight: 600, signDepth: 120 }, siteConditions: { electricalAccess: 'Verify nearby power route', mountingSurface: 'Storefront fascia' }, materialsDesign: { frameMaterial: 'SS frame', faceMaterial: 'Acrylic or ACP panel', finishPreference: 'Powder-coated frame' } }),
    makeTemplate(ServiceType.SIGNAGE, 2, 'Directional Sign Stand', images.metal[1], 'Stainless post and sign panel frame', 'Satin stainless finish', 'Freestanding directional signage', [item('Directional sign stand', 'Confirm panel count, base plate size, and viewing direction.', { length: 600, width: 80, height: 1600 })], { measurements: { signWidth: 600, signHeight: 400, standHeight: 1600 }, siteConditions: { floorSurface: 'Tile or concrete', accessConstraints: 'Verify walkway clearance' }, materialsDesign: { postMaterial: 'SS tubular post', panelFrame: 'SS angle frame', finishPreference: 'Satin stainless' } }),
  ],
  [ServiceType.CUSTOM]: [
    makeTemplate(ServiceType.CUSTOM, 0, 'Custom Metalwork Reference', images.metal[0], 'Stainless steel, grade to confirm', 'Finish to confirm', 'Custom fabrication reference', [item('Custom item', 'Confirm purpose, dimensions, material, and finish.')]),
    makeTemplate(ServiceType.CUSTOM, 1, 'Commercial Fabrication Reference', images.completed[0], 'Stainless steel frame and panels', 'Brushed or powder-coated finish', 'Commercial custom fabrication', [item('Custom assembly', 'Confirm use case, location, and special constraints.')]),
    makeTemplate(ServiceType.CUSTOM, 2, 'Kitchen Fabrication Reference', images.kitchen[0], 'Food-grade stainless steel', 'Food-grade brushed finish', 'Kitchen custom fabrication', [item('Custom kitchen item', 'Confirm equipment clearance and sanitation requirements.')]),
  ],
};

export function getDesignTemplates(serviceType?: string): DesignTemplate[] {
  const key = serviceType as ServiceType | undefined;
  if (key && catalog[key]?.length) return catalog[key]!;
  return catalog[ServiceType.CUSTOM]!;
}
