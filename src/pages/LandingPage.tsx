import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Armchair,
  ArrowRight,
  ArrowUpFromLine,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  ChefHat,
  ClipboardList,
  Clock3,
  DoorClosed,
  DoorOpen,
  Drill,
  Fence,
  Frame,
  Grid3x3,
  Handshake,
  Layers,
  MapPin,
  Mail,
  PenTool,
  Ruler,
  ShieldCheck,
  Truck,
  Umbrella,
  Utensils,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { useAuthStore } from '@/stores/auth.store';
import { ServiceType, SERVICE_TYPE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

type LandingService = {
  type: ServiceType;
  label: string;
  imageUrl: string;
  description: string;
  Icon: LucideIcon;
  variants?: ServiceVariant[];
};

export type ServiceSpecItem = {
  label: string;
  value: string;
  note?: string;
  required?: boolean;
};

export type ServiceSpecGroup = {
  title: string;
  items: ServiceSpecItem[];
};

export type ServiceVariant = {
  id: string;
  title: string;
  image: string;
  description: string;
  estimatedPrice: string;
  priceNote: string;
  confirmationGroups: ServiceSpecGroup[];
};

type ServiceDetailMetadata = {
  fullDescription: string;
  specGroups: ServiceSpecGroup[];
  estimatedPrice: string;
  priceNote: string;
};

const SERVICE_IMAGE_PATHS: Record<ServiceType, string> = {
  [ServiceType.RAILINGS]: '/landing/services/railings.png',
  [ServiceType.GRILLS]: '/landing/services/grills.png',
  [ServiceType.GATES]: '/landing/services/gates.png',
  [ServiceType.FENCES]: '/landing/services/fences.png',
  [ServiceType.KITCHEN_COUNTER]: '/landing/services/kitchen-counter.png',
  [ServiceType.KITCHEN_CABINET]: '/landing/services/kitchen-cabinet.png',
  [ServiceType.TABLE]: '/landing/services/table.png',
  [ServiceType.CHAIR]: '/landing/services/chair.png',
  [ServiceType.SHELVING]: '/landing/services/shelving.png',
  [ServiceType.DOOR]: '/landing/services/door.png',
  [ServiceType.WINDOW_FRAME]: '/landing/services/window-frame.png',
  [ServiceType.CANOPY]: '/landing/services/canopy.png',
  [ServiceType.STAIRCASE]: '/landing/services/staircase.png',
  [ServiceType.BALUSTRADE]: '/landing/services/balustrade.png',
  [ServiceType.SIGNAGE]: '/landing/services/signage.png',
  [ServiceType.CUSTOM]: '/landing/services/custom.png',
};

const SERVICE_ICONS: Record<ServiceType, LucideIcon> = {
  [ServiceType.RAILINGS]: Fence,
  [ServiceType.GRILLS]: Grid3x3,
  [ServiceType.GATES]: DoorOpen,
  [ServiceType.FENCES]: Fence,
  [ServiceType.KITCHEN_COUNTER]: Utensils,
  [ServiceType.KITCHEN_CABINET]: ChefHat,
  [ServiceType.TABLE]: BookOpen,
  [ServiceType.CHAIR]: Armchair,
  [ServiceType.SHELVING]: Layers,
  [ServiceType.DOOR]: DoorClosed,
  [ServiceType.WINDOW_FRAME]: Frame,
  [ServiceType.CANOPY]: Umbrella,
  [ServiceType.STAIRCASE]: ArrowUpFromLine,
  [ServiceType.BALUSTRADE]: Fence,
  [ServiceType.SIGNAGE]: PenTool,
  [ServiceType.CUSTOM]: Wrench,
};

const SERVICE_DESCRIPTIONS: Record<ServiceType, string> = {
  [ServiceType.RAILINGS]: 'Stainless railings for balconies, stairs, and safety edges.',
  [ServiceType.GRILLS]: 'Protective metal grills for openings, storefronts, and homes.',
  [ServiceType.GATES]: 'Custom steel gates built for security, access, and style.',
  [ServiceType.FENCES]: 'Durable fences for residential, commercial, and perimeter needs.',
  [ServiceType.KITCHEN_COUNTER]: 'Stainless counters for prep, service, and daily kitchen use.',
  [ServiceType.KITCHEN_CABINET]: 'Built-in stainless cabinets for organized kitchen storage.',
  [ServiceType.TABLE]: 'Work tables and dining tables fabricated to size.',
  [ServiceType.CHAIR]: 'Metal seating frames and custom chair fabrication.',
  [ServiceType.SHELVING]: 'Strong shelving for kitchens, stockrooms, and display areas.',
  [ServiceType.DOOR]: 'Metal and stainless doors for access, utility, and security.',
  [ServiceType.WINDOW_FRAME]: 'Window frames made for clean fit, strength, and finish.',
  [ServiceType.CANOPY]: 'Canopies for storefront shade, weather cover, and entries.',
  [ServiceType.STAIRCASE]: 'Steel stair systems for homes, shops, and commercial spaces.',
  [ServiceType.BALUSTRADE]: 'Balustrades with polished safety and architectural finish.',
  [ServiceType.SIGNAGE]: 'Fabricated signage frames and branded metal installations.',
  [ServiceType.CUSTOM]: 'Custom stainless and metal works built to your project specs.',
};

const SERVICE_QUOTE_DISCLAIMER =
  'Final quotation depends on actual measurements, material grade/thickness, finish, and installation requirements.';

const SERVICE_DETAIL_METADATA: Partial<Record<ServiceType, ServiceDetailMetadata>> = {
  [ServiceType.KITCHEN_COUNTER]: {
    fullDescription:
      'Fabricated stainless kitchen counters for prep, washing, service, and daily commercial or home kitchen use. Built around your working layout, plumbing points, cutouts, and preferred finish.',
    specGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Counter Length', value: '4 ft – 12 ft+', note: 'Maps to counterLength. Include straight, L-shape, or U-shape runs.', required: true },
          { label: 'Counter Width / Depth', value: '24 in – 30 in', note: 'Maps to counterWidth. Verify appliance and walkway clearance.', required: true },
          { label: 'Counter Height', value: '34 in – 36 in', note: 'Maps to counterHeight. Can be adjusted for prep, service, or display use.', required: true },
          { label: 'Backsplash Height', value: '4 in – 12 in', note: 'Maps to backsplashHeight. Recommended near walls, prep, and sink zones.' },
          { label: 'Sink / Appliance Cutouts', value: 'As required', note: 'Maps to sinkCutout and applianceClearance. Fixture sizes must be confirmed.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 food-grade typical', note: 'SS201 may fit budget builds; SS316 is better for corrosive or outdoor exposure.', required: true },
          { label: 'Thickness / Gauge', value: '1.0 mm – 1.5 mm+', note: 'Thicker material is recommended for sinks, heavy prep, and high-use counters.' },
          { label: 'Counter Finish', value: 'Hairline / brushed / satin', note: 'Maps to counterFinish. Brushed finishes hide daily use marks better.', required: true },
          { label: 'Edge Style', value: 'Hemmed / rounded / front lip', note: 'Maps to edgeStyle. Edge detail affects comfort, cleaning, and fabrication labor.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Nearby', value: 'Confirm if sink is included', note: 'Maps to plumbingNearby. Drain, faucet, and supply locations affect cutouts.' },
          { label: 'Electrical Nearby', value: 'Confirm if appliances sit on counter', note: 'Maps to electricalNearby and appliancePlacement.' },
          { label: 'Existing Cabinet Layout', value: 'Counter-only or with base', note: 'Maps to existingCabinetLayout. Existing supports may need adjustment.' },
          { label: 'Floor / Wall Condition', value: 'Tile or concrete preferred', note: 'Maps to floorType. Uneven surfaces may require leveling or shimming.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, rough sketch, sink specs, and measurements', note: 'Include wall-to-wall dimensions, plumbing points, and appliance sizes.', required: true },
          { label: 'Optional Add-ons', value: 'Sink bowl, undershelf, cabinet base, splash guard', note: 'Add-ons change material, labor, and installation scope.' },
        ],
      },
    ],
    estimatedPrice: 'Estimate starts around ₱18,000 - ₱65,000+.',
    priceNote:
      'Estimate-only range for standard stainless counter work; large layouts, thicker gauges, sink bowls, and installation complexity can increase cost.',
  },
  [ServiceType.KITCHEN_CABINET]: {
    fullDescription:
      'Custom stainless kitchen cabinets for organized storage, prep support, and heavy-use kitchen environments. Suitable for base cabinets, wall-mounted modules, shelves, and sliding or swing-door storage.',
    specGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Cabinet Length', value: '3 ft – 12 ft+', note: 'Maps to cabinetLength. Based on wall run, base run, or kitchen zone.', required: true },
          { label: 'Cabinet Depth', value: '18 in – 24 in', note: 'Maps to cabinetDepth. Depends on storage depth and counter overhang.', required: true },
          { label: 'Cabinet Height', value: '30 in – 84 in', note: 'Maps to cabinetHeight. Base, overhead, or full-height cabinet options.', required: true },
          { label: 'Module Count', value: '1 – 6+ modules', note: 'Maps to moduleCount. Affects door count, divisions, and fabrication time.' },
          { label: 'Shelf Spacing', value: 'Adjustable or fixed', note: 'Maps to shelfSpacing. Confirm stored item height and load.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Body Material', value: 'SS201 / SS304 stainless body', note: 'Maps to bodyMaterial. SS304 is better for wet and food-prep areas.', required: true },
          { label: 'Thickness / Gauge', value: '0.8 mm – 1.5 mm+', note: 'Heavier cabinet use and larger doors benefit from thicker material.' },
          { label: 'Cabinet Finish', value: 'Hairline / brushed / satin', note: 'Maps to counterFinish. Finish affects cleaning and visible marks.', required: true },
          { label: 'Door Type', value: 'Swing / sliding / open shelf', note: 'Maps to doorType. Sliding doors need track clearance.' },
          { label: 'Handle / Lock', value: 'Pull handle, recessed handle, lock provision', note: 'Maps to handleType and lockProvision.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Wall Support', value: 'Required for overhead cabinets', note: 'Maps to wallSupport. Wall material and anchors must be verified.' },
          { label: 'Plumbing / Electrical Nearby', value: 'Confirm for sink or appliance zones', note: 'Maps to plumbingNearby and electricalNearby.' },
          { label: 'Existing Cabinet Removal', value: 'Optional', note: 'Maps to existingCabinetRemoval. Removal affects labor and schedule.' },
          { label: 'Floor Level Condition', value: 'Verify before final fit', note: 'Maps to floorLevelCondition. Uneven floor affects alignment.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Module layout, photos, dimensions, door direction, shelf needs', note: 'Include wall support photos for overhead cabinets.', required: true },
          { label: 'Optional Add-ons', value: 'Locks, drawers, adjustable shelves, sink base, custom handles', note: 'Add-ons change hardware and fabrication cost.' },
        ],
      },
    ],
    estimatedPrice: 'Estimate starts around ₱25,000 - ₱95,000+.',
    priceNote:
      'Estimate-only range for cabinet modules; final cost depends on module count, doors, shelves, grade, finish, and site installation.',
  },
  [ServiceType.RAILINGS]: {
    fullDescription:
      'Stainless railings for balconies, stairs, ramps, landings, and safety edges. Designed for clean alignment, durable mounting, and a polished finish that fits residential or commercial spaces.',
    specGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Total Run Length', value: '1 m – 20 m+', note: 'Maps to totalRunLength. Measure every stair, landing, balcony, and edge run.', required: true },
          { label: 'Rail Height', value: '900 mm – 1100 mm', note: 'Maps to railHeight. Final height depends on site and safety requirements.', required: true },
          { label: 'Post Spacing', value: '900 mm – 1200 mm', note: 'Maps to postSpacing. Adjusted for strength, layout, and substrate.', required: true },
          { label: 'Tube Diameter', value: '38 mm – 50 mm', note: 'Maps to tubeDiameter. Common handrail sizes are 1.5 in to 2 in.' },
          { label: 'Material Thickness', value: '1.2 mm – 2.0 mm+', note: 'Maps to materialThickness. Outdoor or high-traffic areas may need heavier gauge.' },
          { label: 'Section Count / Stair Alignment', value: 'Straight, landing + run, or custom', note: 'Maps to sectionCount and stairAlignment.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Tube Material', value: 'SS304 indoor / SS316 outdoor', note: 'Maps to tubeMaterial. SS316 is preferred for weather or corrosive exposure.', required: true },
          { label: 'Finish Type', value: 'Brushed satin / polished', note: 'Maps to finishType. Polished finish costs more and shows marks faster.', required: true },
          { label: 'Handrail Style', value: 'Round, square, horizontal, vertical', note: 'Maps to handrailStyle.' },
          { label: 'Baluster / Infill Style', value: 'Horizontal bars, vertical pickets, glass provision', note: 'Maps to balusterStyle.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Surface mount / side mount / core drilled', note: 'Maps to mountType. Mounting method changes anchors and labor.' },
          { label: 'Mounting Surface', value: 'Concrete, steel, or mixed base', note: 'Maps to mountingSurface and baseMaterial.' },
          { label: 'Outdoor Exposure', value: 'Low / medium / high', note: 'Maps to outdoorExposure. Exposure affects grade and finish recommendation.' },
          { label: 'Balcony Edge Condition', value: 'Verify slab edge and waterproofing', note: 'Maps to balconyEdgeCondition.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site edge photos, run lengths, safety height, mount surface', note: 'Include stair pitch and landing photos when applicable.', required: true },
          { label: 'Optional Add-ons', value: 'Glass clamps, decorative infill, heavy posts, custom caps', note: 'Add-ons affect material, welding, and finishing work.' },
        ],
      },
    ],
    estimatedPrice: 'Estimate starts around ₱3,500 - ₱9,500 per linear meter.',
    priceNote:
      'Estimate-only range for typical stainless railing runs; curves, glass, custom patterns, heavier posts, and difficult mounting may increase cost.',
  },
  [ServiceType.GATES]: {
    fullDescription:
      'Custom steel and stainless gates for secured access, storefronts, homes, and property entries. Built around your opening size, swing or sliding movement, panel style, and lock provisions.',
    specGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Gate Width', value: '3 ft – 16 ft+', note: 'Maps to gateWidth. Measure clear opening from post to post.', required: true },
          { label: 'Gate Height', value: '4 ft – 7 ft+', note: 'Maps to gateHeight. Depends on privacy, security, and design preference.', required: true },
          { label: 'Opening Clearance', value: 'Confirm full swing or slide path', note: 'Maps to openingClearance. Sliding gates need track and side parking space.' },
          { label: 'Post Height', value: 'Based on gate height and footing', note: 'Maps to postHeight. Existing posts must be checked.' },
          { label: 'Panel Count', value: '1 – 2 panels', note: 'Maps to panelCount. Larger openings may need double swing or segmented panels.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'Stainless, mild steel, or mixed metal', note: 'Maps to frameMaterial. Larger gates need heavier frame sections.', required: true },
          { label: 'Frame Tube', value: '1.5 in – 3 in', note: 'Heavier gates need larger tubes and stronger posts.' },
          { label: 'Panel Style', value: 'Horizontal bars, sheet panel, perforated, custom', note: 'Maps to panelStyle.' },
          { label: 'Paint / Finish Type', value: 'Brushed stainless / powder coat / painted', note: 'Maps to paintFinish.' },
          { label: 'Lock Type', value: 'Latch, dropbolt, lever lock, heavy-duty hardware', note: 'Maps to lockType.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Motion Type', value: 'Swing / sliding', note: 'Maps to motionType. Sliding gates need wheel and track allowance.' },
          { label: 'Wheel Requirement', value: 'For sliding gates', note: 'Maps to wheelRequirement. Wheel size depends on weight and track.' },
          { label: 'Ground Slope', value: 'Flat / slight / steep', note: 'Maps to groundSlope. Slope affects swing clearance and track work.' },
          { label: 'Concrete Base', value: 'Confirm footing or existing slab', note: 'Maps to concreteBase.' },
          { label: 'Vehicle Clearance / Fence Connection', value: 'Confirm driveway and side connections', note: 'Maps to vehicleClearance and fenceConnection.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Opening photos, post-to-post size, height, slope, motion type', note: 'Include photos of posts, floor, driveway, and side clearance.', required: true },
          { label: 'Optional Add-ons', value: 'Automation provision, privacy panels, heavy locks, decorative inserts', note: 'Add-ons change hardware, electrical prep, and fabrication time.' },
        ],
      },
    ],
    estimatedPrice: 'Estimate starts around ₱28,000 - ₱120,000+.',
    priceNote:
      'Estimate-only range for custom gate fabrication; automation, large spans, decorative panels, and site preparation can increase cost.',
  },
  [ServiceType.CANOPY]: {
    fullDescription:
      'Fabricated canopies for storefront shade, entry protection, weather cover, and outdoor working areas. Built with structural supports and finish options matched to exposure and mounting conditions.',
    specGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Projection Length', value: '2 ft – 8 ft+', note: 'Maps to projectionLength. This is how far the canopy extends outward.', required: true },
          { label: 'Total Width', value: '4 ft – 20 ft+', note: 'Maps to totalWidth. Based on storefront, entry, or covered work area.', required: true },
          { label: 'Height Clearance', value: '7 ft – 12 ft+', note: 'Maps to heightClearance. Confirm entrance, signage, and vehicle clearance.' },
          { label: 'Support Post Count', value: '0 – 4+ posts', note: 'Maps to supportPostCount. Wall-mounted canopies may not need front posts.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Roofing Material', value: 'Polycarbonate / metal / glass', note: 'Maps to roofingMaterial. Material affects heat, noise, weight, and price.', required: true },
          { label: 'Structural Material', value: 'Stainless, GI, or painted steel frame', note: 'Maps to structuralMaterial. Frame choice depends on span and exposure.', required: true },
          { label: 'Frame Size', value: '1.5 in – 3 in', note: 'Larger spans and wind exposure require heavier frame sections.' },
          { label: 'Finish Coating', value: 'Brushed stainless / powder coat / painted', note: 'Maps to finishCoating.' },
          { label: 'Drainage Style', value: 'Front gutter, side drain, or open edge', note: 'Maps to drainageStyle.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Roof Connection Type', value: 'Wall anchor / fascia / post-supported', note: 'Maps to roofConnectionType. Wall structure must be verified.' },
          { label: 'Outdoor / Wind Exposure', value: 'Low / medium / high', note: 'Maps to outdoorExposure and windExposure. Exposure affects anchoring and frame size.' },
          { label: 'Drainage Access', value: 'Confirm water discharge route', note: 'Maps to drainageAccess.' },
          { label: 'Existing Support Structure', value: 'Concrete wall, beams, columns, or none', note: 'Maps to existingSupportStructure.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Facade photos, width, projection, wall material, drainage route', note: 'Include photos showing mounting points and overhead clearance.', required: true },
          { label: 'Optional Add-ons', value: 'Gutter, downspout, lighting provision, thicker frame, post footing', note: 'Add-ons affect structural and installation scope.' },
        ],
      },
    ],
    estimatedPrice: 'Estimate starts around ₱18,000 - ₱85,000+.',
    priceNote:
      'Estimate-only range for standard canopy work; roofing material, wind exposure, support structure, drainage, and installation access affect final cost.',
  },
  [ServiceType.CUSTOM]: {
    fullDescription:
      'Custom stainless and metal fabrication for special layouts, one-off fixtures, frames, displays, utility pieces, and site-specific requirements that do not fit a standard service category.',
    specGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Primary Dimension', value: 'Project-specific', note: 'Maps to primaryDimension. Example: 2400 x 900 x 850 mm.', required: true },
          { label: 'Quantity', value: '1 pc – bulk order', note: 'Maps to quantity. Multiple pieces may reduce per-piece setup cost.' },
          { label: 'Component Count', value: 'Single item or multiple assemblies', note: 'Separate frames, panels, shelves, or brackets if needed.' },
          { label: 'Load / Use Requirement', value: 'Light, standard, or heavy-duty', note: 'Needed for material thickness and structural support decisions.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Material Preference', value: 'Stainless / steel / GI / aluminum / mixed metal', note: 'Maps to materialPreference. Material choice affects strength and price.', required: true },
          { label: 'Thickness / Gauge', value: '0.8 mm – 3.0 mm+', note: 'Depends on load, use, and durability target.' },
          { label: 'Finish Preference', value: 'Brushed / polished / painted / powder-coated / custom', note: 'Maps to finishPreference.' },
          { label: 'Design Direction', value: 'Reference style, sketch, or functional requirement', note: 'Maps to designDirection. Include design references when available.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Installation Location', value: 'Indoor, outdoor, kitchen, storefront, utility area', note: 'Maps to installationLocation.' },
          { label: 'Mounting Points', value: 'Wall, floor, ceiling, counter, or freestanding', note: 'Needed to plan anchors and support.' },
          { label: 'Access Constraints', value: 'Narrow stairs, elevator limits, operating hours', note: 'Maps to accessConstraints. Access affects delivery and installation labor.' },
          { label: 'Installation Need', value: 'Optional / required', note: 'On-site installation adds labor and logistics.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Purpose, dimensions, quantity, material, finish, photos, sketch', note: 'Custom work needs enough detail to separate fabrication from installation scope.', required: true },
          { label: 'Optional Add-ons', value: 'Wheels, locks, lighting, glass, wood inserts, removable panels', note: 'Special features change hardware, finish, and fabrication sequence.' },
        ],
      },
    ],
    estimatedPrice: 'Estimate depends on approved scope; typical custom work starts around ₱10,000+.',
    priceNote:
      'Estimate-only starting point for simple custom fabrication; detailed drawings, materials, quantity, and installation requirements define the final quote.',
  },
};

const SERVICE_ORDER: ServiceType[] = [
  ServiceType.RAILINGS,
  ServiceType.GRILLS,
  ServiceType.GATES,
  ServiceType.FENCES,
  ServiceType.KITCHEN_COUNTER,
  ServiceType.KITCHEN_CABINET,
  ServiceType.TABLE,
  ServiceType.CHAIR,
  ServiceType.SHELVING,
  ServiceType.DOOR,
  ServiceType.WINDOW_FRAME,
  ServiceType.CANOPY,
  ServiceType.STAIRCASE,
  ServiceType.BALUSTRADE,
  ServiceType.SIGNAGE,
  ServiceType.CUSTOM,
];

const KITCHEN_COUNTER_VARIANTS: ServiceVariant[] = [
  {
    id: 'corner-open-shelf',
    title: 'Corner Counter with Open Shelf',
    image: '/landing/services/kitchen-counter/01-kitchen-counter-corner-open-shelf.png',
    description:
      'A space-saving corner stainless counter layout with sink, open lower shelving, and mixed storage. Good for small kitchens, food businesses, prep corners, and layouts that need practical storage without making the area feel crowded.',
    estimatedPrice: '₱30,000 – ₱85,000+',
    priceNote:
      'Final cost depends on wall length, sink size, shelving layout, cabinet doors, steel grade, thickness, and installation condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Layout Type', value: 'Corner / L-shape', required: true, note: 'Maps to layoutType. Confirm left/right orientation and wall-to-wall dimensions.' },
          { label: 'Counter Length', value: 'Custom per wall', required: true, note: 'Maps to counterLength. Include both wall runs and corner allowance.' },
          { label: 'Counter Width / Depth', value: '24 in – 30 in', required: true, note: 'Maps to counterWidth. Verify walkway and appliance clearance.' },
          { label: 'Counter Height', value: '34 in – 36 in', required: true, note: 'Maps to counterHeight. Can be adjusted for prep, service, or washing use.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 food-grade typical', required: true, note: 'Maps to stainlessGrade. SS201 may fit budget builds; SS316 is better for corrosive or outdoor exposure.' },
          { label: 'Thickness / Gauge', value: '1.0 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Thicker material is recommended for sinks, heavy prep, and high-use counters.' },
          { label: 'Counter Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to counterFinish. Brushed finishes hide daily use marks better.' },
          { label: 'Edge Style', value: 'Hemmed / rounded / front lip', note: 'Maps to edgeStyle. Edge detail affects comfort, cleaning, and fabrication labor.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Nearby', value: 'Confirm if sink is included', required: true, note: 'Maps to plumbingNearby. Drain, faucet, and supply locations affect cutouts.' },
          { label: 'Floor / Wall Condition', value: 'Tile or concrete preferred', note: 'Maps to floorType. Uneven surfaces may require leveling or shimming.' },
          { label: 'Shelf Type', value: 'Open shelf / closed cabinet / mixed', required: true, note: 'Maps to shelfType. Storage layout affects materials and labor.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, wall measurements, sink specs', required: true, note: 'Include wall-to-wall dimensions, plumbing points, appliance sizes, and desired shelf layout.' },
          { label: 'Optional Add-ons', value: 'Cabinet doors, splash guard, undershelf, drawer locks', note: 'Add-ons change material, labor, and installation scope.' },
        ],
      },
    ],
  },
  {
    id: 'sink-drainer-drawers',
    title: 'Sink & Drainer Stainless Counter',
    image: '/landing/services/kitchen-counter/02-kitchen-counter-sink-drainer-drawers.png',
    description:
      'A stainless counter with integrated sink, drainboard, drawers, and lower storage. Best for washing, rinsing, food preparation, and kitchen areas that need clean water flow with organized storage.',
    estimatedPrice: '₱25,000 – ₱65,000+',
    priceNote:
      'Final cost depends on sink bowl size, drainboard length, drawer count, steel grade, material thickness, backsplash height, and plumbing cutouts.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Counter Length', value: '5 ft – 12 ft+', required: true, note: 'Maps to counterLength. Include full wall run and available sink/drainer space.' },
          { label: 'Counter Width / Depth', value: '24 in – 30 in', required: true, note: 'Maps to counterWidth. Verify appliance and walkway clearance.' },
          { label: 'Counter Height', value: '34 in – 36 in', required: true, note: 'Maps to counterHeight. Standard working height can be adjusted.' },
          { label: 'Backsplash Height', value: '4 in – 12 in', note: 'Maps to backsplashHeight. Recommended near walls, sink, and wet zones.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 food-grade typical', required: true, note: 'Maps to stainlessGrade. Recommended for food prep and wet areas.' },
          { label: 'Thickness / Gauge', value: '1.0 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Thicker material is better for sink and heavy use.' },
          { label: 'Counter Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to counterFinish. Brushed finish is practical for daily use.' },
          { label: 'Sink Position', value: 'Left / right / center', required: true, note: 'Maps to sinkPosition. Affects plumbing and workflow.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Nearby', value: 'Confirm drain and supply points', required: true, note: 'Maps to plumbingNearby. Required for sink and faucet placement.' },
          { label: 'Electrical Nearby', value: 'Confirm if appliances sit on counter', note: 'Maps to electricalNearby. Useful if machines or small appliances will be placed nearby.' },
          { label: 'Existing Cabinet Layout', value: 'Counter-only or with base', note: 'Maps to existingCabinetLayout. Existing supports may need adjustment.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, sink specs, drainboard direction, measurements', required: true, note: 'Include wall-to-wall dimensions, plumbing points, and preferred sink placement.' },
          { label: 'Optional Add-ons', value: 'Faucet hole, drawer locks, cabinet partitions, splash guard', note: 'Add-ons affect material and labor.' },
        ],
      },
    ],
  },
  {
    id: 'island-prep-table',
    title: 'Island Prep Table',
    image: '/landing/services/kitchen-counter/03-kitchen-counter-island-prep-table.png',
    description:
      'A heavy-duty stainless island prep table with an open lower shelf. Ideal for food preparation, sorting, packing, baking, and commercial kitchen work areas that need a durable center workstation.',
    estimatedPrice: '₱15,000 – ₱55,000+',
    priceNote:
      'Final cost depends on table size, steel grade, frame reinforcement, lower shelf, caster wheels, edge style, and material thickness.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Table Length', value: '4 ft – 10 ft+', required: true, note: 'Maps to tableLength. Confirm available floor space and workflow clearance.' },
          { label: 'Table Width', value: '24 in – 36 in+', required: true, note: 'Maps to tableWidth. Wider tables need stronger frame support.' },
          { label: 'Table Height', value: '34 in – 36 in', required: true, note: 'Maps to tableHeight. Can be customized for prep or packing use.' },
          { label: 'Lower Shelf Height', value: 'Custom', note: 'Maps to lowerShelfHeight. Depends on storage needs and item size.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 or SS201 depending on budget', required: true, note: 'Maps to stainlessGrade. SS304 is recommended for food prep.' },
          { label: 'Thickness / Gauge', value: '1.0 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Thicker top is better for heavy preparation.' },
          { label: 'Finish', value: 'Brushed / satin', required: true, note: 'Maps to counterFinish. Practical finish for food prep areas.' },
          { label: 'Frame Type', value: 'Standard / reinforced', note: 'Maps to frameType. Reinforced frame recommended for heavy loads.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Placement Area', value: 'Center island / wall-side / production area', required: true, note: 'Maps to placementArea. Confirms access and workflow.' },
          { label: 'Floor Condition', value: 'Level floor preferred', note: 'Maps to floorType. Uneven floor may require adjustable feet.' },
          { label: 'Mobility', value: 'Fixed feet / caster wheels', note: 'Maps to mobility. Caster wheels are useful for movable prep stations.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Desired size, use case, load requirement, site photos', required: true, note: 'Include what will be placed on the table and if it needs to move.' },
          { label: 'Optional Add-ons', value: 'Caster wheels, undershelf, reinforced frame, rounded edges', note: 'Add-ons affect cost and fabrication time.' },
        ],
      },
    ],
  },
  {
    id: 'drawer-base-workstation',
    title: 'Drawer Base Workstation Counter',
    image: '/landing/services/kitchen-counter/04-kitchen-counter-drawer-base-workstation.png',
    description:
      'A premium stainless workstation counter with sink, drawers, cabinet storage, backsplash, and wide prep surface. Good for kitchens that need both working space and organized storage.',
    estimatedPrice: '₱35,000 – ₱95,000+',
    priceNote:
      'Final cost depends on total counter length, drawer count, cabinet layout, sink bowl size, backsplash height, material grade, and installation complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Counter Length', value: '6 ft – 14 ft+', required: true, note: 'Maps to counterLength. Confirm full wall run and appliance clearances.' },
          { label: 'Counter Width / Depth', value: '24 in – 30 in', required: true, note: 'Maps to counterWidth. Verify workspace and walkway clearance.' },
          { label: 'Counter Height', value: '34 in – 36 in', required: true, note: 'Maps to counterHeight. Standard prep height can be customized.' },
          { label: 'Drawer Count', value: '2 – 6+', required: true, note: 'Maps to drawerCount. Drawer quantity affects labor, hardware, and cost.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 recommended', required: true, note: 'Maps to stainlessGrade. Best for food prep and wet kitchen environments.' },
          { label: 'Thickness / Gauge', value: '1.2 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Recommended for premium counters with drawers and sink.' },
          { label: 'Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to counterFinish. Brushed finish hides daily marks better.' },
          { label: 'Handle Style', value: 'Recessed / bar handle', note: 'Maps to handleStyle. Recessed handles keep the front clean and safe.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Nearby', value: 'Confirm if sink is included', required: true, note: 'Maps to plumbingNearby. Drain, faucet, and supply locations affect cutouts.' },
          { label: 'Cabinet Type', value: 'Swing door / sliding door / open shelf', required: true, note: 'Maps to cabinetType. Storage configuration affects fabrication labor.' },
          { label: 'Electrical Nearby', value: 'Confirm if appliances sit on counter', note: 'Maps to electricalNearby. Useful for mixers, appliances, or machines.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, rough sketch, sink specs, measurements', required: true, note: 'Include wall-to-wall dimensions, plumbing points, appliance sizes, and drawer preference.' },
          { label: 'Optional Add-ons', value: 'Drawer locks, cabinet partitions, backsplash, sink bowl', note: 'Add-ons affect material, hardware, and labor.' },
        ],
      },
    ],
  },
  {
    id: 'sink-sliding-storage',
    title: 'Sink Counter with Sliding Storage',
    image: '/landing/services/kitchen-counter/05-kitchen-counter-sink-sliding-storage.png',
    description:
      'A straight stainless kitchen counter with built-in sink, backsplash, and sliding-door base storage. Good for washing, food prep, and compact commercial or home kitchen layouts.',
    estimatedPrice: '₱18,000 – ₱45,000+',
    priceNote:
      'Final cost depends on counter length, sink bowl size, sliding door system, steel grade, thickness, backsplash height, and plumbing cutouts.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Counter Length', value: '4 ft – 10 ft+', required: true, note: 'Maps to counterLength. Include straight run and wall clearance.' },
          { label: 'Counter Width / Depth', value: '24 in – 30 in', required: true, note: 'Maps to counterWidth. Verify appliance and walkway clearance.' },
          { label: 'Counter Height', value: '34 in – 36 in', required: true, note: 'Maps to counterHeight. Can be adjusted for prep, service, or display use.' },
          { label: 'Backsplash Height', value: '4 in – 12 in', note: 'Maps to backsplashHeight. Recommended near walls, prep, and sink zones.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 food-grade typical', required: true, note: 'Maps to stainlessGrade. SS201 may fit budget builds; SS316 is better for corrosive exposure.' },
          { label: 'Thickness / Gauge', value: '1.0 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Thicker material is recommended for sinks and high-use counters.' },
          { label: 'Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to counterFinish. Brushed finishes hide daily use marks better.' },
          { label: 'Door Type', value: 'Sliding stainless doors', required: true, note: 'Maps to doorType. Sliding doors save space in tight work areas.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Nearby', value: 'Confirm if sink is included', required: true, note: 'Maps to plumbingNearby. Drain, faucet, and supply locations affect cutouts.' },
          { label: 'Floor / Wall Condition', value: 'Tile or concrete preferred', note: 'Maps to floorType. Uneven surfaces may require leveling or shimming.' },
          { label: 'Storage Layout', value: 'Full sliding base / partial storage', note: 'Maps to storageLayout. Confirms storage access and internal shelf needs.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, wall measurements, sink specs', required: true, note: 'Include wall-to-wall dimensions, plumbing points, and preferred sink side.' },
          { label: 'Optional Add-ons', value: 'Sink bowl, faucet hole, undershelf, cabinet base, splash guard', note: 'Add-ons change material, labor, and installation scope.' },
        ],
      },
    ],
  },
  {
    id: 'l-shape-commercial',
    title: 'L-Type Commercial Kitchen Counter',
    image: '/landing/services/kitchen-counter/06-kitchen-counter-l-shape-commercial.png',
    description:
      'An L-shaped stainless counter layout for commercial kitchens, food stalls, prep rooms, and restaurants. Built around wall dimensions, appliance placement, plumbing points, and storage needs.',
    estimatedPrice: '₱45,000 – ₱120,000+',
    priceNote:
      'Final cost depends on total wall length, number of cabinets/drawers, sink and appliance cutouts, backsplash coverage, steel thickness, and installation complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Layout Type', value: 'L-shape / U-shape / wall-to-wall', required: true, note: 'Maps to layoutType. Confirm full wall runs and corner direction.' },
          { label: 'Total Counter Length', value: '8 ft – 20 ft+', required: true, note: 'Maps to counterLength. Include both sides of the L-shape.' },
          { label: 'Counter Width / Depth', value: '24 in – 30 in', required: true, note: 'Maps to counterWidth. Verify clearance for appliances and walkways.' },
          { label: 'Counter Height', value: '34 in – 36 in', required: true, note: 'Maps to counterHeight. Can be adjusted for prep or service use.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 recommended', required: true, note: 'Maps to stainlessGrade. Recommended for commercial kitchens and food prep.' },
          { label: 'Thickness / Gauge', value: '1.2 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Stronger material recommended for large layouts.' },
          { label: 'Finish', value: 'Brushed / satin', required: true, note: 'Maps to counterFinish. Practical finish for commercial use.' },
          { label: 'Storage Type', value: 'Drawers / cabinets / open shelves / mixed', required: true, note: 'Maps to storageType. Storage choice affects fabrication labor.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Nearby', value: 'Confirm sink and drain location', required: true, note: 'Maps to plumbingNearby. Required for sink and wet zones.' },
          { label: 'Appliance Placement', value: 'Stove, chiller, prep equipment', note: 'Maps to appliancePlacement. Appliance sizes affect counter layout and cutouts.' },
          { label: 'Existing Wall Condition', value: 'Tile / concrete / other', note: 'Maps to wallCondition. Affects backsplash, supports, and installation.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, rough sketch, measurements, appliance sizes', required: true, note: 'Include wall-to-wall dimensions, plumbing points, appliance placement, and storage preference.' },
          { label: 'Optional Add-ons', value: 'Drawers, cabinets, backsplash, open shelves, sink cutout', note: 'Add-ons change material, labor, and installation scope.' },
        ],
      },
    ],
  },
];

const KITCHEN_CABINET_VARIANTS: ServiceVariant[] = [
  {
    id: 'tall-storage',
    title: 'Tall Stainless Storage Cabinet',
    image: '/landing/services/kitchen-cabinet/01-kitchen-cabinet-tall-storage.png',
    description:
      'A tall freestanding stainless steel storage cabinet with double doors, internal shelving, sturdy legs, and durable brushed finish. Best for storing cookware, containers, dry goods, supplies, and kitchen tools in food businesses, stockrooms, and heavy-use kitchens.',
    estimatedPrice: '₱28,000 – ₱85,000+',
    priceNote:
      'Final cost depends on cabinet height, width, shelf count, steel grade, thickness, handles, locks, and installation or delivery requirements.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Cabinet Height', value: '5 ft – 7 ft+', required: true, note: 'Maps to cabinetHeight. Confirm ceiling clearance and delivery access.' },
          { label: 'Cabinet Width', value: '2 ft – 5 ft+', required: true, note: 'Maps to cabinetWidth. Width affects shelf span and door weight.' },
          { label: 'Cabinet Depth', value: '18 in – 24 in+', required: true, note: 'Maps to cabinetDepth. Confirm stored item size and walkway clearance.' },
          { label: 'Shelf Count', value: '3 – 6+ shelves', required: true, note: 'Maps to shelfCount. Shelf count depends on storage needs and item height.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS201 / SS304', required: true, note: 'Maps to stainlessGrade. SS304 is recommended for wet or food-prep environments.' },
          { label: 'Thickness / Gauge', value: '0.8 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Heavier storage needs thicker material.' },
          { label: 'Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to cabinetFinish. Brushed finish is practical for daily use.' },
          { label: 'Handle / Lock', value: 'Pull handle / recessed handle / lock provision', note: 'Maps to handleType and lockProvision. Locks are useful for supply storage.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Placement Area', value: 'Kitchen / stockroom / utility area', required: true, note: 'Maps to placementArea. Confirms environment and clearance.' },
          { label: 'Floor Condition', value: 'Level floor preferred', note: 'Maps to floorType. Uneven floors may require adjustable feet.' },
          { label: 'Delivery Access', value: 'Doorway, hallway, stairs, elevator', note: 'Maps to deliveryAccess. Tall cabinets need access check before fabrication.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Size, shelf count, use case, site photos', required: true, note: 'Include height, width, depth, storage purpose, and delivery access.' },
          { label: 'Optional Add-ons', value: 'Locks, adjustable shelves, wheels, reinforced shelves', note: 'Add-ons affect hardware, labor, and material cost.' },
        ],
      },
    ],
  },
  {
    id: 'drawers-open-shelves',
    title: 'Drawers & Open Shelves Cabinet',
    image: '/landing/services/kitchen-cabinet/02-kitchen-cabinet-drawers-open-shelves.png',
    description:
      'A custom stainless base cabinet with drawers, swing-door storage, and open shelf sections. Good for kitchens that need organized storage, quick-access shelves, and a durable stainless work surface.',
    estimatedPrice: '₱35,000 – ₱95,000+',
    priceNote:
      'Final cost depends on total length, drawer count, shelf layout, cabinet doors, steel grade, material thickness, and hardware.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Cabinet Length', value: '5 ft – 12 ft+', required: true, note: 'Maps to cabinetLength. Confirm full wall run and available work area.' },
          { label: 'Cabinet Depth', value: '24 in – 30 in', required: true, note: 'Maps to cabinetDepth. Verify walkway and appliance clearance.' },
          { label: 'Cabinet Height', value: '34 in – 36 in', required: true, note: 'Maps to cabinetHeight. Standard counter height can be adjusted.' },
          { label: 'Drawer Count', value: '2 – 6+', required: true, note: 'Maps to drawerCount. Drawer count affects hardware, labor, and cost.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 recommended', required: true, note: 'Maps to stainlessGrade. Recommended for food prep and wet kitchen areas.' },
          { label: 'Thickness / Gauge', value: '1.0 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Thicker material improves durability.' },
          { label: 'Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to cabinetFinish. Brushed finish hides daily marks better.' },
          { label: 'Storage Type', value: 'Drawers / swing doors / open shelves / mixed', required: true, note: 'Maps to storageType. Storage mix affects fabrication labor.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Floor / Wall Condition', value: 'Tile or concrete preferred', note: 'Maps to floorType. Uneven surfaces may require leveling.' },
          { label: 'Plumbing Nearby', value: 'Confirm if placed near sink', note: 'Maps to plumbingNearby. Wet zones may need cutouts or spacing.' },
          { label: 'Appliance Clearance', value: 'Confirm nearby equipment', note: 'Maps to applianceClearance. Appliance sizes affect cabinet layout.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, rough sketch, measurements, drawer preference', required: true, note: 'Include wall-to-wall dimensions and desired drawer/shelf layout.' },
          { label: 'Optional Add-ons', value: 'Drawer locks, cabinet partitions, backsplash, adjustable shelves', note: 'Add-ons affect hardware and fabrication time.' },
        ],
      },
    ],
  },
  {
    id: 'overhead-wall-mounted',
    title: 'Overhead Wall-Mounted Cabinet',
    image: '/landing/services/kitchen-cabinet/03-kitchen-cabinet-overhead-wall-mounted.png',
    description:
      'A wall-mounted stainless kitchen cabinet with swing doors and open shelf sections. Ideal for overhead storage above counters, prep areas, dishwashing zones, and compact kitchens that need extra storage without using floor space.',
    estimatedPrice: '₱22,000 – ₱70,000+',
    priceNote:
      'Final cost depends on cabinet length, height, door count, shelf sections, wall support, steel grade, thickness, and mounting complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Cabinet Length', value: '3 ft – 10 ft+', required: true, note: 'Maps to cabinetLength. Confirm wall run and mounting area.' },
          { label: 'Cabinet Height', value: '18 in – 36 in+', required: true, note: 'Maps to cabinetHeight. Depends on storage needs and ceiling clearance.' },
          { label: 'Cabinet Depth', value: '12 in – 18 in+', required: true, note: 'Maps to cabinetDepth. Avoid making overhead cabinets too deep for safety.' },
          { label: 'Module Count', value: '1 – 4+ modules', note: 'Maps to moduleCount. Modules affect door count and partitions.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS201 / SS304', required: true, note: 'Maps to stainlessGrade. SS304 is recommended for wet or food-prep areas.' },
          { label: 'Thickness / Gauge', value: '0.8 mm – 1.2 mm+', required: true, note: 'Maps to thickness. Wall-mounted cabinets need proper weight control.' },
          { label: 'Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to cabinetFinish. Brushed finish is practical for daily use.' },
          { label: 'Door Type', value: 'Swing doors / open shelf / mixed', required: true, note: 'Maps to doorType. Door type affects hinges and clearance.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Wall Support', value: 'Required for overhead cabinet', required: true, note: 'Maps to wallSupport. Wall material and anchors must be verified.' },
          { label: 'Mounting Surface', value: 'Concrete / tile / metal frame / wood backing', required: true, note: 'Maps to mountingSurface. Mounting surface affects safety and installation.' },
          { label: 'Counter Clearance', value: 'Confirm space above counter', note: 'Maps to counterClearance. Ensure enough working clearance below cabinet.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Wall photos, cabinet size, mounting surface, shelf needs', required: true, note: 'Include wall material, desired height, and counter clearance.' },
          { label: 'Optional Add-ons', value: 'Open shelf section, locks, adjustable shelves, custom handles', note: 'Add-ons affect labor, hardware, and mounting.' },
        ],
      },
    ],
  },
  {
    id: 'full-system',
    title: 'Full Stainless Cabinet System',
    image: '/landing/services/kitchen-cabinet/04-kitchen-cabinet-full-system.png',
    description:
      'A complete stainless kitchen cabinet system with base cabinets, drawers, overhead cabinets, backsplash, and sink-area storage. Best for restaurants, food businesses, commercial kitchens, and heavy-use home kitchens.',
    estimatedPrice: '₱80,000 – ₱220,000+',
    priceNote:
      'Final cost depends on total wall length, number of modules, drawer count, overhead cabinets, sink cutouts, backsplash coverage, steel grade, and installation complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Total Cabinet Length', value: '8 ft – 20 ft+', required: true, note: 'Maps to cabinetLength. Include base and overhead wall runs.' },
          { label: 'Base Cabinet Depth', value: '24 in – 30 in', required: true, note: 'Maps to cabinetDepth. Verify workspace and walkway clearance.' },
          { label: 'Overhead Cabinet Size', value: 'Custom', required: true, note: 'Maps to overheadCabinetSize. Confirm height, depth, and wall clearance.' },
          { label: 'Module Count', value: '4 – 10+ modules', required: true, note: 'Maps to moduleCount. More modules increase hardware and labor.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 recommended', required: true, note: 'Maps to stainlessGrade. Recommended for commercial kitchen and food prep use.' },
          { label: 'Thickness / Gauge', value: '1.0 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Heavier use needs stronger material.' },
          { label: 'Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to cabinetFinish. Practical finish for commercial use.' },
          { label: 'Storage Type', value: 'Drawers / doors / overhead / mixed', required: true, note: 'Maps to storageType. Storage configuration affects fabrication scope.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Nearby', value: 'Confirm sink and drain location', required: true, note: 'Maps to plumbingNearby. Sink location affects cutouts and cabinet layout.' },
          { label: 'Wall Support', value: 'Required for overhead cabinets', required: true, note: 'Maps to wallSupport. Wall material and anchors must be verified.' },
          { label: 'Electrical / Appliance Clearance', value: 'Confirm outlet and appliance positions', note: 'Maps to electricalNearby and appliancePlacement. Appliance sizes affect layout.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, wall measurements, rough sketch, sink/appliance sizes', required: true, note: 'Include base run, overhead run, plumbing points, and storage preference.' },
          { label: 'Optional Add-ons', value: 'Drawer locks, backsplash, sink base, open shelves, adjustable shelves', note: 'Add-ons affect material, hardware, and labor.' },
        ],
      },
    ],
  },
  {
    id: 'base-storage',
    title: 'Base Stainless Kitchen Cabinet',
    image: '/landing/services/kitchen-cabinet/05-kitchen-cabinet-base-storage.png',
    description:
      'A simple under-counter stainless base cabinet with brushed stainless doors, practical handles, sturdy legs, and clean storage space. Good for compact kitchens, washing areas, prep counters, and commercial storage.',
    estimatedPrice: '₱20,000 – ₱60,000+',
    priceNote:
      'Final cost depends on cabinet length, door count, shelf layout, steel grade, thickness, countertop or backsplash inclusion, and installation condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Cabinet Length', value: '3 ft – 10 ft+', required: true, note: 'Maps to cabinetLength. Confirm wall run and available work area.' },
          { label: 'Cabinet Depth', value: '18 in – 24 in+', required: true, note: 'Maps to cabinetDepth. Depends on storage and counter depth.' },
          { label: 'Cabinet Height', value: '34 in – 36 in', required: true, note: 'Maps to cabinetHeight. Standard counter height can be adjusted.' },
          { label: 'Door Count', value: '2 – 4+ doors', required: true, note: 'Maps to doorCount. Door count depends on cabinet length and access needs.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS201 / SS304', required: true, note: 'Maps to stainlessGrade. SS304 is better for wet or food-prep zones.' },
          { label: 'Thickness / Gauge', value: '0.8 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Thicker material is better for heavy use.' },
          { label: 'Finish', value: 'Hairline / brushed / satin', required: true, note: 'Maps to cabinetFinish. Brushed finish hides daily marks better.' },
          { label: 'Door Type', value: 'Swing / sliding', note: 'Maps to doorType. Sliding doors save space in tight areas.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Existing Counter', value: 'Confirm if cabinet goes under counter', note: 'Maps to existingCounter. Existing counters may need adjustment.' },
          { label: 'Floor Condition', value: 'Level floor preferred', note: 'Maps to floorType. Uneven floors may require adjustable feet.' },
          { label: 'Plumbing Nearby', value: 'Confirm if near sink', note: 'Maps to plumbingNearby. Wet zones may need spacing or cutouts.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, measurements, door type, shelf needs', required: true, note: 'Include wall run, depth, height, and whether there is an existing counter.' },
          { label: 'Optional Add-ons', value: 'Internal shelf, sliding doors, locks, backsplash, custom handles', note: 'Add-ons affect material and labor.' },
        ],
      },
    ],
  },
];

const RAILINGS_VARIANTS: ServiceVariant[] = [
  {
    id: 'commercial-guardrail',
    title: 'Commercial Stainless Guardrail',
    image: '/landing/services/railings/01-commercial-stainless-guardrail.png',
    description:
      'A heavy-duty stainless guardrail for storefronts, ramps, entrances, and commercial walkways. Built with strong posts, horizontal rails, rounded handrail ends, and secure base plates for practical safety and clean appearance.',
    estimatedPrice: '₱3,500 – ₱9,500 per linear meter',
    priceNote:
      'Final cost depends on total length, post spacing, rail count, tube size, stainless grade, mounting surface, and installation difficulty.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Total Run Length', value: '1 m – 20 m+', required: true, note: 'Maps to totalRunLength. Measure every straight run, corner, ramp, and entrance edge.' },
          { label: 'Rail Height', value: '900 mm – 1100 mm', required: true, note: 'Maps to railHeight. Final height depends on site and safety needs.' },
          { label: 'Post Spacing', value: '900 mm – 1200 mm', required: true, note: 'Maps to postSpacing. Adjusted for strength and mounting surface.' },
          { label: 'Rail Count', value: '2 – 5 horizontal rails', required: true, note: 'Maps to railCount. Rail count affects safety spacing and material cost.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 / SS316', required: true, note: 'Maps to stainlessGrade. SS316 is better for outdoor or corrosive exposure.' },
          { label: 'Tube Size', value: '38 mm – 50 mm handrail', required: true, note: 'Maps to tubeSize. Common handrail sizes are 1.5 in to 2 in.' },
          { label: 'Thickness / Gauge', value: '1.2 mm – 2.0 mm+', required: true, note: 'Maps to thickness. Heavy traffic areas need thicker material.' },
          { label: 'Finish', value: 'Brushed satin / polished', required: true, note: 'Maps to finishType. Brushed finish is practical for daily use.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Floor-mounted base plates', required: true, note: 'Maps to mountType. Base plate size depends on rail height and load.' },
          { label: 'Mounting Surface', value: 'Concrete / tile / steel base', required: true, note: 'Maps to mountingSurface. Surface affects anchor choice.' },
          { label: 'Anchor Type', value: 'Expansion bolts / chemical anchors', note: 'Maps to anchorType. Site condition determines final anchor type.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, total length, height, mounting surface', required: true, note: 'Include walkway/ramp photos, floor material, and required safety coverage.' },
          { label: 'Optional Add-ons', value: 'Rounded ends, heavier posts, extra rails, corner returns', note: 'Add-ons affect material and labor.' },
        ],
      },
    ],
  },
  {
    id: 'outdoor-stair-railing',
    title: 'Outdoor Stainless Stair Railing',
    image: '/landing/services/railings/02-outdoor-stainless-stair-railing.png',
    description:
      'A stainless railing system for exterior concrete stairs, building entrances, and outdoor steps. Designed with angled handrails, horizontal bars, sturdy posts, and visible base plates for safe access.',
    estimatedPrice: '₱4,000 – ₱10,500 per linear meter',
    priceNote:
      'Final cost depends on stair slope, number of steps, total rail length, post placement, stainless grade, tube size, and outdoor exposure.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Stair Run Length', value: 'Custom per stair', required: true, note: 'Maps to stairRunLength. Measure slope length and landing sections.' },
          { label: 'Number of Steps', value: 'Site-specific', required: true, note: 'Maps to stepCount. Step count affects post layout and rail angle.' },
          { label: 'Rail Height', value: '900 mm – 1100 mm', required: true, note: 'Maps to railHeight. Confirm safe handrail height along stair slope.' },
          { label: 'Landing Length', value: 'As required', note: 'Maps to landingLength. Include top and bottom landing rail sections.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 / SS316 outdoor recommended', required: true, note: 'Maps to stainlessGrade. SS316 is better for weather exposure.' },
          { label: 'Tube Size', value: '38 mm – 50 mm handrail', required: true, note: 'Maps to tubeSize. Larger tubes improve grip and durability.' },
          { label: 'Thickness / Gauge', value: '1.2 mm – 2.0 mm+', required: true, note: 'Maps to thickness. Outdoor stairs benefit from stronger material.' },
          { label: 'Finish', value: 'Brushed / satin / polished', required: true, note: 'Maps to finishType. Brushed is easier to maintain outdoors.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Stair tread mounted / side mounted', required: true, note: 'Maps to mountType. Mounting type depends on stair edge and space.' },
          { label: 'Mounting Surface', value: 'Concrete stairs', required: true, note: 'Maps to mountingSurface. Concrete condition affects anchor safety.' },
          { label: 'Outdoor Exposure', value: 'Low / medium / high', note: 'Maps to outdoorExposure. Exposure affects stainless grade recommendation.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Stair photos, step count, slope, total length, mounting surface', required: true, note: 'Include top, side, and front photos of the stair area.' },
          { label: 'Optional Add-ons', value: 'Extra mid rails, rounded ends, heavier posts, side mounting', note: 'Add-ons change fabrication and installation scope.' },
        ],
      },
    ],
  },
  {
    id: 'terrace-railing',
    title: 'Terrace Stainless Railing',
    image: '/landing/services/railings/03-terrace-stainless-railing.png',
    description:
      'A stainless railing system for terrace, deck, balcony edge, or open outdoor areas. Built with horizontal rails, sturdy posts, top handrail, and secure base plates for safety and a clean modern look.',
    estimatedPrice: '₱3,800 – ₱10,000 per linear meter',
    priceNote:
      'Final cost depends on total terrace length, corner sections, post spacing, stainless grade, rail count, tube size, and mounting condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Total Perimeter Length', value: '2 m – 30 m+', required: true, note: 'Maps to totalRunLength. Include all terrace edges and corners.' },
          { label: 'Rail Height', value: '1000 mm – 1100 mm', required: true, note: 'Maps to railHeight. Confirm required safety height.' },
          { label: 'Post Spacing', value: '900 mm – 1200 mm', required: true, note: 'Maps to postSpacing. Adjusted for corner layout and strength.' },
          { label: 'Corner Count', value: 'Site-specific', note: 'Maps to cornerCount. Corners affect welding and fitting work.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 / SS316', required: true, note: 'Maps to stainlessGrade. SS316 is better for outdoor and weather-exposed areas.' },
          { label: 'Tube Size', value: '38 mm – 50 mm handrail', required: true, note: 'Maps to tubeSize. Tube size affects strength and appearance.' },
          { label: 'Rail Count', value: '3 – 6 horizontal rails', required: true, note: 'Maps to railCount. More rails increase material and labor.' },
          { label: 'Finish', value: 'Brushed / satin / polished', required: true, note: 'Maps to finishType. Brushed finish is practical for outdoor use.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Floor-mounted base plates', required: true, note: 'Maps to mountType. Confirm tile/concrete thickness and edge condition.' },
          { label: 'Mounting Surface', value: 'Tile / concrete / deck slab', required: true, note: 'Maps to mountingSurface. Surface affects anchors and base plates.' },
          { label: 'Edge Condition', value: 'Open edge / parapet / raised curb', note: 'Maps to edgeCondition. Edge type affects post placement.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Terrace photos, perimeter measurements, corner count, floor material', required: true, note: 'Include photos of every edge and corner.' },
          { label: 'Optional Add-ons', value: 'Extra rails, heavy posts, corner returns, polished finish', note: 'Add-ons affect cost and fabrication time.' },
        ],
      },
    ],
  },
  {
    id: 'indoor-stair-railing',
    title: 'Indoor Stainless Stair Railing',
    image: '/landing/services/railings/04-indoor-stainless-stair-railing.png',
    description:
      'An indoor stainless stair railing for residential or commercial stairs. Built with angled top handrail, vertical posts, horizontal bars, and clean mounting plates following the staircase slope.',
    estimatedPrice: '₱3,500 – ₱9,000 per linear meter',
    priceNote:
      'Final cost depends on stair length, stair angle, landing sections, post count, rail count, tube size, finish, and mounting style.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Stair Run Length', value: 'Custom per stair', required: true, note: 'Maps to stairRunLength. Include sloped sections and landings.' },
          { label: 'Rail Height', value: '900 mm – 1100 mm', required: true, note: 'Maps to railHeight. Confirm comfortable and safe handrail height.' },
          { label: 'Post Spacing', value: '900 mm – 1200 mm', required: true, note: 'Maps to postSpacing. Adjusted based on tread layout.' },
          { label: 'Stair Material', value: 'Concrete / tile / marble / wood', required: true, note: 'Maps to stairMaterial. Material affects drilling and anchors.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 typical', required: true, note: 'Maps to stainlessGrade. Recommended for clean indoor use.' },
          { label: 'Tube Size', value: '38 mm – 50 mm handrail', required: true, note: 'Maps to tubeSize. Common handrail sizes are 1.5 in to 2 in.' },
          { label: 'Thickness / Gauge', value: '1.2 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Thicker tubes improve strength.' },
          { label: 'Finish', value: 'Brushed satin / polished', required: true, note: 'Maps to finishType. Finish affects appearance and maintenance.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Tread-mounted / side-mounted', required: true, note: 'Maps to mountType. Depends on stair width and edge condition.' },
          { label: 'Stair Edge Condition', value: 'Open side / wall side / mixed', note: 'Maps to stairEdgeCondition. Affects rail layout and support.' },
          { label: 'Wall Clearance', value: 'Confirm nearby wall or opening', note: 'Maps to wallClearance. Ensures enough clearance for handrail.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Stair photos, step count, run length, stair material', required: true, note: 'Include side view, top landing, and bottom landing photos.' },
          { label: 'Optional Add-ons', value: 'Rounded handrail ends, extra rails, polished finish, custom post style', note: 'Add-ons change cost and finish work.' },
        ],
      },
    ],
  },
  {
    id: 'glass-stainless-balcony',
    title: 'Glass Stainless Balcony Railing',
    image: '/landing/services/railings/05-glass-stainless-balcony-railing.png',
    description:
      'A modern glass and stainless balcony railing with stainless posts, clear glass panels, clamps, top rail, and secure base plates. Good for balconies, terraces, and commercial frontage where visibility and safety matter.',
    estimatedPrice: '₱7,500 – ₱16,500 per linear meter',
    priceNote:
      'Final cost depends on glass thickness, glass panel size, stainless grade, post spacing, clamp type, top rail, and installation complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Total Run Length', value: '1 m – 20 m+', required: true, note: 'Maps to totalRunLength. Include straight runs and corner sections.' },
          { label: 'Glass Height', value: '900 mm – 1100 mm', required: true, note: 'Maps to glassHeight. Confirm safety height and top rail level.' },
          { label: 'Glass Panel Width', value: 'Custom per span', required: true, note: 'Maps to glassPanelWidth. Panel size affects cost and installation.' },
          { label: 'Post Spacing', value: 'Based on glass panels', required: true, note: 'Maps to postSpacing. Depends on panel width and clamp layout.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 / SS316', required: true, note: 'Maps to stainlessGrade. SS316 is better for outdoor exposure.' },
          { label: 'Glass Type', value: 'Tempered glass / laminated tempered', required: true, note: 'Maps to glassType. Final glass spec depends on safety requirements.' },
          { label: 'Glass Thickness', value: '10 mm – 12 mm+', required: true, note: 'Maps to glassThickness. Thicker glass improves strength and safety.' },
          { label: 'Finish', value: 'Brushed / polished stainless', required: true, note: 'Maps to finishType. Finish affects appearance and maintenance.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Clamp Type', value: 'Side clamps / post clamps / base channel', required: true, note: 'Maps to clampType. Clamp type affects glass layout and cost.' },
          { label: 'Mounting Surface', value: 'Concrete / tile / balcony slab', required: true, note: 'Maps to mountingSurface. Surface affects anchors and post base.' },
          { label: 'Edge Condition', value: 'Balcony edge / parapet / slab top', note: 'Maps to edgeCondition. Edge condition affects installation safety.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Balcony photos, measurements, edge condition, preferred glass style', required: true, note: 'Include all corners, slab edge, and mounting area photos.' },
          { label: 'Optional Add-ons', value: 'Top rail, thicker glass, polished finish, corner glass panels', note: 'Add-ons affect material and labor.' },
        ],
      },
    ],
  },
  {
    id: 'wall-mounted-handrail',
    title: 'Wall-Mounted Stainless Handrail',
    image: '/landing/services/railings/06-wall-mounted-stainless-handrail.png',
    description:
      'A wall-mounted stainless safety handrail for hallways, ramps, clinics, shops, homes, and commercial spaces. Built with round stainless tubing, wall brackets, screw plates, and clean practical installation.',
    estimatedPrice: '₱2,800 – ₱7,500 per linear meter',
    priceNote:
      'Final cost depends on total length, bracket count, wall material, tube size, stainless grade, bends, end caps, and installation access.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Total Handrail Length', value: '1 m – 30 m+', required: true, note: 'Maps to handrailLength. Include straight runs, ramp sections, and returns.' },
          { label: 'Handrail Height', value: '850 mm – 950 mm typical', required: true, note: 'Maps to handrailHeight. Confirm comfortable grip height.' },
          { label: 'Bracket Spacing', value: '800 mm – 1200 mm', required: true, note: 'Maps to bracketSpacing. Adjusted based on wall strength and tube length.' },
          { label: 'Return Ends', value: 'Straight / returned / capped', note: 'Maps to returnEnds. End style affects safety and fabrication.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 typical', required: true, note: 'Maps to stainlessGrade. SS316 may be used for outdoor or corrosive areas.' },
          { label: 'Tube Size', value: '38 mm – 50 mm', required: true, note: 'Maps to tubeSize. Common handrail sizes are 1.5 in to 2 in.' },
          { label: 'Thickness / Gauge', value: '1.2 mm – 1.5 mm+', required: true, note: 'Maps to thickness. Heavier use may need thicker tube.' },
          { label: 'Finish', value: 'Brushed satin / polished', required: true, note: 'Maps to finishType. Brushed is practical for frequent contact.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Wall Material', value: 'Concrete / tile / drywall / masonry', required: true, note: 'Maps to wallMaterial. Wall material determines anchors.' },
          { label: 'Mount Type', value: 'Wall brackets with round plates', required: true, note: 'Maps to mountType. Bracket layout affects strength.' },
          { label: 'Site Use', value: 'Ramp / hallway / clinic / shop / home', note: 'Maps to siteUse. Use case affects height and bracket spacing.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Wall photos, total length, wall material, desired height', required: true, note: 'Include photos of start/end points and any corners.' },
          { label: 'Optional Add-ons', value: 'Return bends, extra brackets, polished finish, removable sections', note: 'Add-ons change fabrication and installation scope.' },
        ],
      },
    ],
  },
  {
    id: 'balcony-horizontal-railing',
    title: 'Balcony Horizontal Stainless Railing',
    image: '/landing/services/railings/07-balcony-horizontal-stainless-railing.png',
    description:
      'A horizontal stainless balcony railing for residential balconies and elevated edges. Built with round posts, multiple horizontal rails, top handrail, base plates, and clean stainless finish.',
    estimatedPrice: '₱3,500 – ₱9,500 per linear meter',
    priceNote:
      'Final cost depends on balcony length, post spacing, rail count, tube size, stainless grade, corner sections, and installation condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Balcony Length', value: '1 m – 20 m+', required: true, note: 'Maps to balconyLength. Measure every straight section and corner.' },
          { label: 'Rail Height', value: '1000 mm – 1100 mm', required: true, note: 'Maps to railHeight. Confirm safety height from finished floor.' },
          { label: 'Post Spacing', value: '900 mm – 1200 mm', required: true, note: 'Maps to postSpacing. Adjusted for safety and strength.' },
          { label: 'Rail Count', value: '4 – 6 horizontal rails', required: true, note: 'Maps to railCount. Rail count affects material and spacing.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 / SS316', required: true, note: 'Maps to stainlessGrade. SS316 is better for outdoor or weather-exposed balconies.' },
          { label: 'Tube Size', value: '38 mm – 50 mm handrail', required: true, note: 'Maps to tubeSize. Tube size affects look and durability.' },
          { label: 'Thickness / Gauge', value: '1.2 mm – 2.0 mm+', required: true, note: 'Maps to thickness. Outdoor balcony railings benefit from thicker material.' },
          { label: 'Finish', value: 'Brushed / satin / polished', required: true, note: 'Maps to finishType. Brushed finish is easier to maintain.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Floor-mounted base plates', required: true, note: 'Maps to mountType. Base plates and anchors must match slab condition.' },
          { label: 'Mounting Surface', value: 'Concrete / tile / balcony slab', required: true, note: 'Maps to mountingSurface. Surface affects drilling and anchors.' },
          { label: 'Outdoor Exposure', value: 'Low / medium / high', note: 'Maps to outdoorExposure. Exposure affects grade and maintenance.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Balcony photos, length, height, floor material, edge condition', required: true, note: 'Include photos of the slab, corners, and mounting surface.' },
          { label: 'Optional Add-ons', value: 'Extra rails, heavier posts, rounded ends, polished finish', note: 'Add-ons affect material and labor.' },
        ],
      },
    ],
  },
];

const GATES_VARIANTS: ServiceVariant[] = [
  {
    id: 'double-swing-stainless-gate',
    title: 'Double Swing Stainless Gate',
    image: '/landing/services/gates/01-gates-double-swing-stainless-gate.png',
    description:
      'A double swing stainless gate for residential driveways, home entrances, and small compounds. Built with two hinged panels, sturdy side posts, vertical bars, horizontal rails, latch hardware, and clean stainless fabrication for secure daily use.',
    estimatedPrice: '₱35,000 – ₱120,000+',
    priceNote:
      'Final cost depends on opening width, gate height, tube size, stainless grade, panel design, hinge hardware, lock system, post condition, and installation complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Gate Width', value: '6 ft – 16 ft+', required: true, note: 'Maps to gateWidth. Measure clear opening from post to post.' },
          { label: 'Gate Height', value: '4 ft – 7 ft+', required: true, note: 'Maps to gateHeight. Depends on privacy, security, and design preference.' },
          { label: 'Panel Count', value: '2 swing panels', required: true, note: 'Maps to panelCount. Confirm equal panels or uneven panel split.' },
          { label: 'Opening Clearance', value: 'Confirm full swing path', required: true, note: 'Maps to openingClearance. Swing gates need clear inward or outward movement.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'SS201 / SS304 stainless', required: true, note: 'Maps to frameMaterial. SS304 is better for outdoor durability.' },
          { label: 'Frame Tube Size', value: '1.5 in – 3 in', required: true, note: 'Maps to frameTube. Larger gates need heavier frame sections.' },
          { label: 'Infill Style', value: 'Vertical bars / horizontal bars / mixed', required: true, note: 'Maps to panelStyle. Infill design affects weight and cost.' },
          { label: 'Finish', value: 'Brushed / polished stainless', required: true, note: 'Maps to finishType. Brushed finish is easier to maintain outdoors.' },
          { label: 'Lock Type', value: 'Latch / padlock provision / lever lock', note: 'Maps to lockType. Lock choice affects hardware and security.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Motion Type', value: 'Double swing', required: true, note: 'Maps to motionType. Confirm inward or outward swing.' },
          { label: 'Hinge Type', value: 'Heavy-duty weld-on hinges', required: true, note: 'Maps to hingeType. Hinge size depends on gate weight.' },
          { label: 'Post Condition', value: 'Existing posts / new posts needed', required: true, note: 'Maps to postCondition. Weak posts may need replacement.' },
          { label: 'Ground Slope', value: 'Flat / slight slope / uneven', note: 'Maps to groundSlope. Slope affects bottom clearance.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Opening photos, post-to-post width, height, swing direction', required: true, note: 'Include photos of posts, driveway, floor slope, and latch side.' },
          { label: 'Optional Add-ons', value: 'Heavy locks, drop bolts, decorative bars, automation provision', note: 'Add-ons affect hardware, labor, and final cost.' },
        ],
      },
    ],
  },
  {
    id: 'modern-mixed-metal-gate',
    title: 'Modern Mixed Metal Gate',
    image: '/landing/services/gates/02-gates-modern-mixed-metal-gate.png',
    description:
      'A modern custom metal gate using a painted steel frame with stainless steel accent strips or panels. Good for residential front gates that need a clean modern look while staying practical, durable, and buildable.',
    estimatedPrice: '₱45,000 – ₱150,000+',
    priceNote:
      'Final cost depends on gate size, painted frame thickness, stainless accent quantity, panel layout, hinges or rollers, lock hardware, finish coating, and site installation.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Gate Width', value: '6 ft – 16 ft+', required: true, note: 'Maps to gateWidth. Measure clear opening and driveway access.' },
          { label: 'Gate Height', value: '4 ft – 7 ft+', required: true, note: 'Maps to gateHeight. Confirm privacy and design target.' },
          { label: 'Panel Layout', value: 'Horizontal slats / mixed panels', required: true, note: 'Maps to panelLayout. Layout affects material quantity and labor.' },
          { label: 'Gap Spacing', value: 'Custom', note: 'Maps to gapSpacing. Spacing affects privacy, airflow, and look.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Main Frame', value: 'Painted steel / powder-coated steel', required: true, note: 'Maps to frameMaterial. Steel frame is practical for large gates.' },
          { label: 'Stainless Accent', value: 'SS201 / SS304 strips', required: true, note: 'Maps to stainlessAccent. SS304 is better for outdoor exposure.' },
          { label: 'Coating Finish', value: 'Painted / powder-coated', required: true, note: 'Maps to coatingFinish. Final coating affects durability and color.' },
          { label: 'Accent Finish', value: 'Brushed / polished stainless', note: 'Maps to accentFinish. Brushed is easier to maintain.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Motion Type', value: 'Swing / sliding', required: true, note: 'Maps to motionType. Confirm preferred gate movement.' },
          { label: 'Hardware', value: 'Hinges / rollers / track', required: true, note: 'Maps to hardwareType. Hardware depends on motion type.' },
          { label: 'Post Condition', value: 'Existing posts / new posts needed', required: true, note: 'Maps to postCondition. Posts must support gate weight.' },
          { label: 'Concrete Base', value: 'Confirm floor and track area', note: 'Maps to concreteBase. Sliding gates need track support.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Opening photos, measurements, preferred color, design reference', required: true, note: 'Include post photos, driveway photos, and desired privacy level.' },
          { label: 'Optional Add-ons', value: 'Stainless accents, privacy panels, automation provision, heavy lockset', note: 'Add-ons change material, labor, and hardware cost.' },
        ],
      },
    ],
  },
  {
    id: 'commercial-security-gate',
    title: 'Commercial Security Gate',
    image: '/landing/services/gates/03-gates-commercial-security-gate.png',
    description:
      'A heavy-duty commercial security gate for storefronts, warehouses, service entrances, and business properties. Built with strong vertical bars, reinforced frame, secure posts, heavy hinges, and lock hardware for practical access control.',
    estimatedPrice: '₱40,000 – ₱160,000+',
    priceNote:
      'Final cost depends on opening size, bar spacing, frame thickness, hinge or sliding system, lock hardware, steel grade, post reinforcement, and installation condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Opening Width', value: '4 ft – 16 ft+', required: true, note: 'Maps to gateWidth. Measure clear commercial entry opening.' },
          { label: 'Gate Height', value: '6 ft – 9 ft+', required: true, note: 'Maps to gateHeight. Higher gates need stronger posts and frame.' },
          { label: 'Bar Spacing', value: 'Custom safety/security spacing', required: true, note: 'Maps to barSpacing. Spacing affects security and material count.' },
          { label: 'Panel Count', value: 'Single / double / sliding', required: true, note: 'Maps to panelCount. Depends on opening width and access needs.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'Stainless / painted steel / mixed metal', required: true, note: 'Maps to frameMaterial. Commercial gates may need heavier steel.' },
          { label: 'Bar Material', value: 'Round bar / square tube / flat bar', required: true, note: 'Maps to barMaterial. Bar type affects strength and appearance.' },
          { label: 'Thickness / Gauge', value: 'Heavy-duty recommended', required: true, note: 'Maps to thickness. High-traffic areas need stronger material.' },
          { label: 'Finish', value: 'Brushed stainless / painted / powder-coated', required: true, note: 'Maps to finishType. Finish depends on exposure and budget.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Motion Type', value: 'Swing / sliding / fixed security gate', required: true, note: 'Maps to motionType. Confirm access requirements.' },
          { label: 'Mounting Surface', value: 'Concrete / steel frame / masonry', required: true, note: 'Maps to mountingSurface. Surface determines anchors and posts.' },
          { label: 'Locking System', value: 'Padlock provision / deadbolt / commercial lock', required: true, note: 'Maps to lockType. Security level affects hardware.' },
          { label: 'Site Access', value: 'Storefront / warehouse / service entrance', note: 'Maps to siteAccess. Access affects installation schedule and labor.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Opening photos, measurements, security purpose, mount surface', required: true, note: 'Include photos of wall sides, floor, ceiling clearance, and lock side.' },
          { label: 'Optional Add-ons', value: 'Reinforced frame, heavy lockset, closer, automation provision, anti-rust coating', note: 'Add-ons affect cost and fabrication time.' },
        ],
      },
    ],
  },
  {
    id: 'pedestrian-stainless-gate',
    title: 'Pedestrian Stainless Gate',
    image: '/landing/services/gates/04-gates-pedestrian-stainless-gate.png',
    description:
      'A single pedestrian stainless gate for side entrances, walkways, utility access, and home entry points. Built with a compact frame, vertical bars, hinge post, latch handle, lockset, and clean welded joints.',
    estimatedPrice: '₱12,000 – ₱45,000+',
    priceNote:
      'Final cost depends on gate height, gate width, stainless grade, bar spacing, lockset, hinge post, wall condition, and installation requirements.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Gate Width', value: '2.5 ft – 4 ft+', required: true, note: 'Maps to gateWidth. Confirm walkway opening width.' },
          { label: 'Gate Height', value: '4 ft – 7 ft+', required: true, note: 'Maps to gateHeight. Depends on privacy and security needs.' },
          { label: 'Bar Spacing', value: 'Custom', required: true, note: 'Maps to barSpacing. Spacing affects security and look.' },
          { label: 'Opening Direction', value: 'Left-hand / right-hand swing', required: true, note: 'Maps to openingDirection. Confirm hinge side and latch side.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'SS201 / SS304 stainless', required: true, note: 'Maps to frameMaterial. SS304 is better for outdoor exposure.' },
          { label: 'Bar Type', value: 'Round bars / square tube', required: true, note: 'Maps to barType. Bar style affects look and cost.' },
          { label: 'Finish', value: 'Brushed / polished stainless', required: true, note: 'Maps to finishType. Brushed finish is practical for daily contact.' },
          { label: 'Lockset', value: 'Lever lock / deadbolt / padlock provision', required: true, note: 'Maps to lockType. Lockset depends on use case.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Post-mounted / wall-mounted', required: true, note: 'Maps to mountType. Depends on available wall or post support.' },
          { label: 'Hinge Post', value: 'Existing / new post needed', required: true, note: 'Maps to hingePost. Weak posts may need fabrication.' },
          { label: 'Floor Clearance', value: 'Confirm base clearance', note: 'Maps to floorClearance. Needed if floor is uneven or sloped.' },
          { label: 'Wall Condition', value: 'Concrete / hollow block / steel post', note: 'Maps to wallCondition. Affects anchors and support.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Opening photos, width, height, hinge side, lock preference', required: true, note: 'Include photos of both side walls/posts and floor condition.' },
          { label: 'Optional Add-ons', value: 'Lockset, closer, privacy plate, decorative bars, kick plate', note: 'Add-ons change hardware and fabrication cost.' },
        ],
      },
    ],
  },
  {
    id: 'sliding-stainless-gate',
    title: 'Sliding Stainless Gate',
    image: '/landing/services/gates/05-gates-sliding-stainless-gate.png',
    description:
      'A stainless sliding gate for residential driveways and property entrances. Built with a strong rectangular frame, horizontal bars or panels, bottom track, rollers, guide post, lock area, and proper concrete floor contact.',
    estimatedPrice: '₱45,000 – ₱180,000+',
    priceNote:
      'Final cost depends on gate span, sliding track length, roller system, frame size, stainless grade, panel design, guide posts, lock hardware, and installation complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Gate Width', value: '8 ft – 18 ft+', required: true, note: 'Maps to gateWidth. Measure full driveway opening.' },
          { label: 'Gate Height', value: '4 ft – 7 ft+', required: true, note: 'Maps to gateHeight. Confirm privacy and security target.' },
          { label: 'Slide Parking Space', value: 'Opening width + allowance', required: true, note: 'Maps to slideParkingSpace. Sliding gates need side space to fully open.' },
          { label: 'Track Length', value: 'Custom', required: true, note: 'Maps to trackLength. Track length depends on opening and parking space.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'SS201 / SS304 stainless', required: true, note: 'Maps to frameMaterial. SS304 is better for outdoor durability.' },
          { label: 'Frame Tube Size', value: '2 in – 3 in+', required: true, note: 'Maps to frameTube. Larger spans need heavier frame.' },
          { label: 'Panel Style', value: 'Horizontal bars / panels / mixed', required: true, note: 'Maps to panelStyle. Panel style affects weight and airflow.' },
          { label: 'Finish', value: 'Brushed / polished stainless', required: true, note: 'Maps to finishType. Brushed finish is practical for outdoor use.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Motion Type', value: 'Sliding gate', required: true, note: 'Maps to motionType. Requires track, rollers, and side clearance.' },
          { label: 'Roller System', value: 'V-groove / heavy-duty rollers', required: true, note: 'Maps to rollerSystem. Roller size depends on gate weight.' },
          { label: 'Track Surface', value: 'Concrete driveway preferred', required: true, note: 'Maps to trackSurface. Track must be level and strong.' },
          { label: 'Guide Post', value: 'Required', required: true, note: 'Maps to guidePost. Keeps the gate aligned while sliding.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Driveway photos, opening width, side parking space, floor condition', required: true, note: 'Include full front view, track path, and side clearance photos.' },
          { label: 'Optional Add-ons', value: 'Automation provision, heavy-duty rollers, stainless panels, lockset, guide post', note: 'Add-ons affect hardware and installation scope.' },
        ],
      },
    ],
  },
  {
    id: 'decorative-stainless-gate',
    title: 'Decorative Stainless Gate',
    image: '/landing/services/gates/06-gates-decorative-stainless-gate.png',
    description:
      'A stainless residential gate with simple decorative bar patterns, balanced vertical and horizontal bars, clean welds, proper hinges, latch hardware, side posts, and durable stainless finish. Elegant but still practical and buildable.',
    estimatedPrice: '₱35,000 – ₱140,000+',
    priceNote:
      'Final cost depends on gate size, decorative pattern complexity, tube size, stainless grade, hinge hardware, lockset, polishing, and installation condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Gate Width', value: '6 ft – 16 ft+', required: true, note: 'Maps to gateWidth. Measure clear opening from post to post.' },
          { label: 'Gate Height', value: '4 ft – 7 ft+', required: true, note: 'Maps to gateHeight. Confirm target privacy and appearance.' },
          { label: 'Pattern Area', value: 'Full panel / mid-panel / accent only', required: true, note: 'Maps to patternArea. Decorative area affects labor and material.' },
          { label: 'Panel Count', value: 'Single / double swing', required: true, note: 'Maps to panelCount. Depends on opening width and entrance type.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'SS201 / SS304 stainless', required: true, note: 'Maps to frameMaterial. SS304 is better for outdoor durability.' },
          { label: 'Tube / Bar Size', value: 'Custom by design', required: true, note: 'Maps to tubeSize. Pattern strength depends on tube size.' },
          { label: 'Finish', value: 'Brushed / polished stainless', required: true, note: 'Maps to finishType. Polished finish costs more and shows marks faster.' },
          { label: 'Decorative Style', value: 'Simple bars / geometric accents / custom pattern', note: 'Maps to decorativeStyle. More complex designs increase fabrication time.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Motion Type', value: 'Swing / sliding', required: true, note: 'Maps to motionType. Confirm preferred opening movement.' },
          { label: 'Hardware', value: 'Hinges / latch / lockset / rollers if sliding', required: true, note: 'Maps to hardwareType. Hardware depends on gate weight and motion type.' },
          { label: 'Post Condition', value: 'Existing posts / new posts needed', required: true, note: 'Maps to postCondition. Decorative gates still need strong posts.' },
          { label: 'Ground Slope', value: 'Flat / slight slope / uneven', note: 'Maps to groundSlope. Affects bottom clearance and movement.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Opening photos, measurements, design reference, preferred finish', required: true, note: 'Include front view, side posts, driveway floor, and sample pattern if available.' },
          { label: 'Optional Add-ons', value: 'Custom pattern, polished finish, automation provision, heavy locks, privacy backing', note: 'Add-ons affect material, labor, and final cost.' },
        ],
      },
    ],
  },
];

const CANOPY_VARIANTS: ServiceVariant[] = [
  {
    id: 'walkway-stainless-canopy',
    title: 'Walkway Stainless Canopy',
    image: '/landing/services/canopy/01-canopy-walkway-stainless-canopy.png',
    description:
      'A long stainless or painted steel walkway canopy for building sides, entrance paths, and covered walkways. Built with evenly spaced posts, roof framing, metal or polycarbonate roofing, base plates, wall anchors, and practical rain protection.',
    estimatedPrice: '₱4,500 – ₱12,000 per square meter',
    priceNote:
      'Final cost depends on total covered length, roof width, post spacing, steel size, roofing material, wall connection, gutter needs, and installation condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Covered Length', value: '3 m – 30 m+', required: true, note: 'Maps to coveredLength. Measure the full walkway run from start to end.' },
          { label: 'Canopy Projection / Width', value: '1 m – 3 m+', required: true, note: 'Maps to canopyProjection. Projection affects frame strength and roof material.' },
          { label: 'Clear Height', value: '2.2 m – 3 m+', required: true, note: 'Maps to clearHeight. Confirm walking clearance under the canopy.' },
          { label: 'Post Spacing', value: '1.5 m – 3 m typical', required: true, note: 'Maps to postSpacing. Post spacing depends on roof load and site layout.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'Stainless / painted steel / powder-coated steel', required: true, note: 'Maps to frameMaterial. Material choice affects durability and cost.' },
          { label: 'Roof Material', value: 'Metal sheet / polycarbonate / insulated panel', required: true, note: 'Maps to roofMaterial. Roof material affects heat, noise, and price.' },
          { label: 'Frame Size', value: 'Custom by span', required: true, note: 'Maps to frameSize. Longer spans need larger beams and posts.' },
          { label: 'Finish', value: 'Brushed stainless / painted / powder-coated', required: true, note: 'Maps to finishType. Outdoor frames need proper weather-resistant finish.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Freestanding posts / wall-attached / mixed', required: true, note: 'Maps to mountType. Mounting depends on building wall and walkway layout.' },
          { label: 'Mounting Surface', value: 'Concrete / tile / pavement', required: true, note: 'Maps to mountingSurface. Surface affects base plates and anchors.' },
          { label: 'Drainage', value: 'Gutter / downspout / roof slope', required: true, note: 'Maps to drainage. Drainage prevents water pooling and splashback.' },
          { label: 'Wall Condition', value: 'Concrete / masonry / existing structure', note: 'Maps to wallCondition. Wall condition affects anchors and brackets.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Site photos, length, width, clear height, roof material', required: true, note: 'Include full walkway photos, wall side, floor surface, and drainage direction.' },
          { label: 'Optional Add-ons', value: 'Gutter, downspout, thicker posts, lighting provision, painted finish', note: 'Add-ons affect material, labor, and final cost.' },
        ],
      },
    ],
  },
  {
    id: 'garage-carport-canopy',
    title: 'Garage / Carport Canopy',
    image: '/landing/services/canopy/02-canopy-garage-carport-canopy.png',
    description:
      'A heavy-duty metal garage or carport canopy for residential driveways and parking areas. Built with steel posts, cross beams, metal roof sheets, base plates, roof slope, gutter provision, and durable outdoor fabrication.',
    estimatedPrice: '₱55,000 – ₱250,000+',
    priceNote:
      'Final cost depends on parking area size, number of posts, roof span, roofing material, steel thickness, gutter system, coating finish, and site preparation.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Covered Area', value: '1-car / 2-car / custom size', required: true, note: 'Maps to coveredArea. Confirm vehicle count and driveway size.' },
          { label: 'Canopy Length', value: '4 m – 10 m+', required: true, note: 'Maps to canopyLength. Length depends on vehicle and parking coverage.' },
          { label: 'Canopy Width', value: '2.5 m – 6 m+', required: true, note: 'Maps to canopyWidth. Width affects beam size and post layout.' },
          { label: 'Clear Height', value: '2.4 m – 3 m+', required: true, note: 'Maps to clearHeight. Confirm vehicle clearance and roof slope.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'Painted steel / galvanized steel / stainless accents', required: true, note: 'Maps to frameMaterial. Painted or galvanized steel is common for carports.' },
          { label: 'Roof Material', value: 'Rib-type metal sheet / insulated panel / polycarbonate', required: true, note: 'Maps to roofMaterial. Roof material affects heat and rain noise.' },
          { label: 'Beam / Post Size', value: 'Custom by span', required: true, note: 'Maps to frameSize. Larger spans need stronger beams and posts.' },
          { label: 'Finish', value: 'Painted / powder-coated / anti-rust coating', required: true, note: 'Maps to finishType. Outdoor structures need weather-resistant finish.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Freestanding posts / wall-attached / mixed', required: true, note: 'Maps to mountType. Depends on driveway and house wall condition.' },
          { label: 'Base Plates', value: 'Anchored to concrete', required: true, note: 'Maps to basePlates. Concrete strength affects anchors.' },
          { label: 'Roof Slope', value: 'Required for drainage', required: true, note: 'Maps to roofSlope. Slope prevents water pooling.' },
          { label: 'Drainage', value: 'Gutter / downspout optional', note: 'Maps to drainage. Helps direct rainwater away from driveway.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Driveway photos, length, width, height clearance, preferred roof material', required: true, note: 'Include full driveway view, house wall, floor condition, and drainage direction.' },
          { label: 'Optional Add-ons', value: 'Gutter, downspout, thicker posts, painted finish, lighting provision', note: 'Add-ons affect cost and installation time.' },
        ],
      },
    ],
  },
  {
    id: 'storefront-metal-canopy',
    title: 'Storefront Metal Canopy',
    image: '/landing/services/canopy/03-canopy-storefront-metal-canopy.png',
    description:
      'A metal canopy for storefronts, shop entrances, business fronts, and commercial doors. Built with wall brackets, steel frame, support posts when needed, roof panels, wall anchors, clean welds, and practical drainage.',
    estimatedPrice: '₱25,000 – ₱120,000+',
    priceNote:
      'Final cost depends on storefront width, projection, roof material, frame thickness, wall mounting condition, support post needs, drainage details, and finish.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Storefront Width', value: '2 m – 10 m+', required: true, note: 'Maps to storefrontWidth. Measure full entrance or frontage coverage.' },
          { label: 'Projection', value: '0.8 m – 2.5 m+', required: true, note: 'Maps to projection. Projection affects bracket and frame strength.' },
          { label: 'Mounting Height', value: 'Custom', required: true, note: 'Maps to mountingHeight. Confirm door clearance and signage clearance.' },
          { label: 'Support Post Count', value: 'None / 2 posts / custom', note: 'Maps to supportPostCount. Larger projections may need posts.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'Stainless / painted steel / powder-coated steel', required: true, note: 'Maps to frameMaterial. Material depends on budget and exposure.' },
          { label: 'Roof Material', value: 'Metal sheet / polycarbonate / insulated panel', required: true, note: 'Maps to roofMaterial. Roof choice affects look, heat, and rain noise.' },
          { label: 'Bracket Style', value: 'Wall-mounted / post-supported / mixed', required: true, note: 'Maps to bracketStyle. Bracket style affects strength and appearance.' },
          { label: 'Finish', value: 'Brushed stainless / painted / powder-coated', required: true, note: 'Maps to finishType. Finish affects maintenance and weather resistance.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Wall-mounted with brackets', required: true, note: 'Maps to mountType. Wall strength must be checked before fabrication.' },
          { label: 'Wall Material', value: 'Concrete / masonry / steel frame / tile', required: true, note: 'Maps to wallMaterial. Wall material affects anchors and bracket design.' },
          { label: 'Drainage', value: 'Roof slope / gutter / downspout', required: true, note: 'Maps to drainage. Drainage protects entrance area.' },
          { label: 'Site Access', value: 'Storefront / sidewalk / commercial frontage', note: 'Maps to siteAccess. Access affects installation schedule and safety.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Storefront photos, width, projection, mounting height, wall material', required: true, note: 'Include front view, side view, wall condition, and preferred roof type.' },
          { label: 'Optional Add-ons', value: 'Gutter, downspout, lighting provision, thicker frame, painted finish', note: 'Add-ons affect material, labor, and final cost.' },
        ],
      },
    ],
  },
  {
    id: 'polycarbonate-entrance-canopy',
    title: 'Polycarbonate Entrance Canopy',
    image: '/landing/services/canopy/04-canopy-polycarbonate-entrance-canopy.png',
    description:
      'A lightweight polycarbonate entrance canopy for homes, offices, and small business entrances. Built with a steel support frame, translucent roof sheets, wall brackets, proper bolts, clean seams, and weather-protective coverage.',
    estimatedPrice: '₱18,000 – ₱85,000+',
    priceNote:
      'Final cost depends on entrance width, canopy projection, polycarbonate thickness, frame material, bracket design, wall anchors, roof slope, and installation condition.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Entrance Width', value: '1.2 m – 5 m+', required: true, note: 'Maps to entranceWidth. Measure door and side clearance.' },
          { label: 'Projection', value: '0.8 m – 2 m+', required: true, note: 'Maps to projection. Projection affects bracket strength and rain coverage.' },
          { label: 'Mounting Height', value: 'Custom', required: true, note: 'Maps to mountingHeight. Confirm door swing and head clearance.' },
          { label: 'Panel Count', value: 'Custom by width', note: 'Maps to panelCount. Panel count depends on sheet size and frame grid.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Frame Material', value: 'Stainless / painted steel / powder-coated steel', required: true, note: 'Maps to frameMaterial. Frame material affects durability and look.' },
          { label: 'Roof Material', value: 'Polycarbonate sheet', required: true, note: 'Maps to roofMaterial. Good for lightweight entrance cover.' },
          { label: 'Panel Thickness', value: '6 mm – 10 mm+ typical', required: true, note: 'Maps to panelThickness. Thicker panels improve durability.' },
          { label: 'Finish', value: 'Painted / powder-coated / brushed stainless', required: true, note: 'Maps to finishType. Finish should match the building exterior.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Mount Type', value: 'Wall-mounted brackets', required: true, note: 'Maps to mountType. Brackets must match wall strength and projection.' },
          { label: 'Wall Material', value: 'Concrete / masonry / tile / existing frame', required: true, note: 'Maps to wallMaterial. Wall material affects anchors.' },
          { label: 'Roof Slope', value: 'Required for drainage', required: true, note: 'Maps to roofSlope. Prevents water pooling on polycarbonate.' },
          { label: 'Drainage', value: 'Front drip edge / gutter optional', note: 'Maps to drainage. Helps control rainwater flow.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Entrance photos, width, projection, wall material, preferred frame color', required: true, note: 'Include full entrance view, side view, wall condition, and door clearance.' },
          { label: 'Optional Add-ons', value: 'Gutter, thicker polycarbonate, painted frame, lighting provision, side cover', note: 'Add-ons affect material and labor.' },
        ],
      },
    ],
  },
];

const CUSTOM_VARIANTS: ServiceVariant[] = [
  {
    id: 'stainless-storage-cabinet',
    title: 'Stainless Storage Cabinet',
    image: '/landing/services/custom/01-custom-stainless-storage-cabinet.png',
    description:
      'A fully custom fabricated stainless steel storage cabinet designed for kitchens, stockrooms, laundry areas, food businesses, clinics, restaurants, and utility spaces. Built to customer dimensions with heavy-duty construction, adjustable shelves, durable hinges, brushed stainless finish, and long service life.',
    estimatedPrice: '₱18,000 – ₱95,000+',
    priceNote:
      'Final price depends on cabinet size, stainless grade, shelf count, door type, thickness, finish, accessories, and installation requirements.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Cabinet Width', value: '600 mm – 2400 mm+', required: true, note: 'Overall cabinet width.' },
          { label: 'Cabinet Height', value: '900 mm – 2400 mm+', required: true, note: 'Overall finished height.' },
          { label: 'Cabinet Depth', value: '450 mm – 700 mm', required: true, note: 'Depends on storage requirement.' },
          { label: 'Shelf Count', value: 'Custom', note: 'Number of internal shelves.' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS304 recommended', required: true, note: 'SS201 available for budget builds.' },
          { label: 'Thickness', value: '0.8 mm – 1.5 mm+', required: true, note: 'Heavier gauge for commercial use.' },
          { label: 'Door Style', value: 'Swing / Sliding', required: true, note: 'Depends on available space.' },
          { label: 'Finish', value: 'Brushed / Hairline', required: true, note: 'Most commercial projects use brushed finish.' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Placement', value: 'Freestanding / Wall Mounted', required: true, note: 'Determines fabrication.' },
          { label: 'Floor Condition', value: 'Tile / Concrete', note: 'Used for leveling.' },
          { label: 'Accessories', value: 'Locks, adjustable shelves, caster wheels', note: 'Changes fabrication scope.' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Photos, dimensions, intended use', required: true },
          { label: 'Optional Add-ons', value: 'Glass doors, locks, caster wheels, drawers, ventilation slots' },
        ],
      },
    ],
  },
  {
    id: 'food-cart-kiosk',
    title: 'Food Cart / Kiosk Frame',
    image: '/landing/services/custom/02-custom-food-cart-kiosk-frame.png',
    description:
      'Custom stainless and painted steel food carts, kiosks, mobile counters, and business carts built around your concept. Suitable for milk tea, coffee, street food, snack bars, and retail kiosks.',
    estimatedPrice: '₱35,000 – ₱180,000+',
    priceNote:
      'Price varies depending on size, roofing, wheels, storage, sinks, electrical provisions, stainless coverage, and accessories.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Overall Length', value: 'Project-specific', required: true },
          { label: 'Overall Width', value: 'Project-specific', required: true },
          { label: 'Overall Height', value: 'Project-specific', required: true },
          { label: 'Serving Counter Height', value: 'Project-specific' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Coverage', value: 'Custom' },
          { label: 'Painted Steel Frame', value: 'Custom' },
          { label: 'Counter Material', value: 'Custom' },
          { label: 'Roofing Type', value: 'Custom' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Fixed or Mobile', value: 'Customer preference', required: true },
          { label: 'Wheel Type', value: 'Custom' },
          { label: 'Sink Requirement', value: 'Optional / required' },
          { label: 'Electrical Provision', value: 'Optional / required' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Concept sketch, reference photos, dimensions, intended business', required: true },
          { label: 'Optional Add-ons', value: 'Lighting, menu frame, roof, sink, cabinets, drawers, branding space' },
        ],
      },
    ],
  },
  {
    id: 'metal-partition',
    title: 'Metal Partition / Utility Frame',
    image: '/landing/services/custom/03-custom-metal-partition-utility-frame.png',
    description:
      'Custom fabricated steel and stainless partitions, divider frames, protective barriers, utility frames, storage frames, and structural metal works for residential and commercial applications.',
    estimatedPrice: '₱15,000 – ₱120,000+',
    priceNote:
      'Pricing depends on overall dimensions, steel size, finish, installation method, and complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Overall Width', value: 'Project-specific', required: true },
          { label: 'Overall Height', value: 'Project-specific', required: true },
          { label: 'Opening Size', value: 'Project-specific' },
          { label: 'Frame Layout', value: 'Project-specific', required: true },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Tube Size', value: 'Project-specific', required: true },
          { label: 'Steel Type', value: 'Painted steel / stainless / mixed metal', required: true },
          { label: 'Finish', value: 'Project-specific', required: true },
          { label: 'Paint Color', value: 'Customer preference' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Wall Mounted', value: 'Optional / required' },
          { label: 'Floor Mounted', value: 'Optional / required' },
          { label: 'Anchor Type', value: 'Site-dependent' },
          { label: 'Existing Structure', value: 'Must be checked before quote' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Measurements, photos, desired layout', required: true },
          { label: 'Optional Add-ons', value: 'Powder coating, stainless finish, removable panels' },
        ],
      },
    ],
  },
  {
    id: 'stainless-work-table',
    title: 'Stainless Work Table',
    image: '/landing/services/custom/04-custom-stainless-work-table.png',
    description:
      'Heavy-duty stainless work tables fabricated to your required dimensions for food preparation, restaurants, commissaries, bakeries, hospitals, laboratories, and commercial kitchens.',
    estimatedPrice: '₱10,000 – ₱65,000+',
    priceNote:
      'Price depends on size, backsplash, undershelf, wheels, sink cutout, stainless thickness, and fabrication complexity.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Length', value: 'Project-specific', required: true },
          { label: 'Width', value: 'Project-specific', required: true },
          { label: 'Height', value: 'Project-specific', required: true },
          { label: 'Backsplash Height', value: 'Optional / required' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS201 / SS304 / SS316', required: true },
          { label: 'Thickness', value: 'Project-specific', required: true },
          { label: 'Finish', value: 'Brushed / hairline / satin', required: true },
          { label: 'Undershelf', value: 'Optional / required' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Adjustable Feet', value: 'Optional / required' },
          { label: 'Caster Wheels', value: 'Optional / required' },
          { label: 'Sink Cutout', value: 'Optional / required' },
          { label: 'Wall Placement', value: 'Confirm site position' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Dimensions, intended use, equipment placement', required: true },
          { label: 'Optional Add-ons', value: 'Drawers, undershelf, backsplash, sink bowl, caster wheels' },
        ],
      },
    ],
  },
  {
    id: 'stainless-storage-rack',
    title: 'Stainless Shelving & Storage Rack',
    image: '/landing/services/custom/05-custom-stainless-shelves-racks.png',
    description:
      'Custom stainless storage shelves and commercial racks fabricated for kitchens, bakeries, restaurants, clinics, pharmacies, stockrooms, warehouses, and utility rooms.',
    estimatedPrice: '₱8,000 – ₱60,000+',
    priceNote:
      'Pricing depends on rack size, shelf quantity, loading capacity, stainless grade, and fabrication details.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Rack Width', value: 'Project-specific', required: true },
          { label: 'Rack Height', value: 'Project-specific', required: true },
          { label: 'Rack Depth', value: 'Project-specific', required: true },
          { label: 'Shelf Quantity', value: 'Project-specific', required: true },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS201 / SS304 / SS316', required: true },
          { label: 'Tube Size', value: 'Project-specific', required: true },
          { label: 'Shelf Thickness', value: 'Project-specific', required: true },
          { label: 'Finish', value: 'Brushed / hairline / satin', required: true },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Freestanding', value: 'Optional / required' },
          { label: 'Wall Anchoring', value: 'Optional / required' },
          { label: 'Adjustable Feet', value: 'Optional / required' },
          { label: 'Loading Capacity', value: 'Confirm expected load', required: true },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Dimensions, expected load, intended location', required: true },
          { label: 'Optional Add-ons', value: 'Extra shelves, caster wheels, adjustable shelves, wall brackets' },
        ],
      },
    ],
  },
  {
    id: 'stainless-sink-station',
    title: 'Stainless Sink & Utility Station',
    image: '/landing/services/custom/06-custom-stainless-sink-utility-station.png',
    description:
      'Custom stainless sink stations for restaurants, food preparation, wash areas, commissaries, laboratories, and commercial kitchens. Fabricated with integrated work surfaces, backsplashes, shelving, and plumbing provisions.',
    estimatedPrice: '₱12,000 – ₱90,000+',
    priceNote:
      'Final pricing depends on sink size, number of bowls, drainboards, shelving, backsplash, plumbing layout, and stainless thickness.',
    confirmationGroups: [
      {
        title: 'Measurements',
        items: [
          { label: 'Overall Length', value: 'Project-specific', required: true },
          { label: 'Overall Width', value: 'Project-specific', required: true },
          { label: 'Bowl Size', value: 'Project-specific', required: true },
          { label: 'Backsplash Height', value: 'Optional / required' },
        ],
      },
      {
        title: 'Material & Finish',
        items: [
          { label: 'Stainless Grade', value: 'SS201 / SS304 / SS316', required: true },
          { label: 'Thickness', value: 'Project-specific', required: true },
          { label: 'Number of Bowls', value: 'Project-specific', required: true },
          { label: 'Finish', value: 'Brushed / hairline / satin', required: true },
        ],
      },
      {
        title: 'Installation',
        items: [
          { label: 'Plumbing Location', value: 'Must be confirmed', required: true },
          { label: 'Faucet Requirement', value: 'Optional / required' },
          { label: 'Drainboard', value: 'Optional / required' },
          { label: 'Existing Wall/Floor Condition', value: 'Must be checked before quote' },
        ],
      },
      {
        title: 'Quote Requirements',
        items: [
          { label: 'Needed Before Quote', value: 'Photos, plumbing location, dimensions', required: true },
          { label: 'Optional Add-ons', value: 'Additional sink bowls, drainboards, shelves, undershelf, faucet holes' },
        ],
      },
    ],
  },
];

export const LANDING_SERVICE_VARIANTS: Partial<Record<ServiceType, ServiceVariant[]>> = {
  [ServiceType.KITCHEN_COUNTER]: KITCHEN_COUNTER_VARIANTS,
  [ServiceType.KITCHEN_CABINET]: KITCHEN_CABINET_VARIANTS,
  [ServiceType.RAILINGS]: RAILINGS_VARIANTS,
  [ServiceType.GATES]: GATES_VARIANTS,
  [ServiceType.CANOPY]: CANOPY_VARIANTS,
  [ServiceType.CUSTOM]: CUSTOM_VARIANTS,
};

const REAL_SERVICES: LandingService[] = SERVICE_ORDER.map((type) => ({
  type,
  label: SERVICE_TYPE_LABELS[type] ?? type,
  imageUrl: SERVICE_IMAGE_PATHS[type],
  description: SERVICE_DESCRIPTIONS[type],
  Icon: SERVICE_ICONS[type],
  variants: LANDING_SERVICE_VARIANTS[type],
}));

const FEATURED_SERVICES = [
  ServiceType.RAILINGS,
  ServiceType.GATES,
  ServiceType.KITCHEN_COUNTER,
  ServiceType.CANOPY,
  ServiceType.STAIRCASE,
  ServiceType.KITCHEN_CABINET,
  ServiceType.FENCES,
  ServiceType.CUSTOM,
].map((type) => REAL_SERVICES.find((service) => service.type === type)!);

const HERO_TRUST_ITEMS: Array<{ title: string; Icon: LucideIcon }> = [
  {
    title: 'Premium Quality Materials',
    Icon: ShieldCheck,
  },
  {
    title: 'Expert Fabrication',
    Icon: Drill,
  },
  {
    title: 'On-Time Delivery',
    Icon: CalendarCheck,
  },
  {
    title: 'Satisfaction Guaranteed',
    Icon: BadgeCheck,
  },
];

const FEATURED_PROJECTS = [
  {
    title: 'Commercial Kitchen Fit-Out',
    category: 'Commercial',
    image: '/landing/commercial-kitchens/cover.png',
  },
  {
    title: 'Stainless Kitchen System',
    category: 'Stainless Installation',
    image: '/landing/hotel-kitchens/cover.png',
  },
  {
    title: 'Food Stall Fabrication',
    category: 'Custom Fabrication',
    image: '/landing/food-stall-works/cover.png',
  },
  {
    title: 'Custom Stainless Metalwork',
    category: 'Residential',
    image: '/landing/custom-metalworks/project-1.png',
  },
];

const ABOUT_BENEFITS: Array<{ title: string; Icon: LucideIcon }> = [
  {
    title: 'High Quality Materials',
    Icon: ShieldCheck,
  },
  {
    title: 'Expert Fabrication',
    Icon: Drill,
  },
  {
    title: 'Satisfaction Guaranteed',
    Icon: BadgeCheck,
  },
];

const PROCESS_TRUST_ITEMS: Array<{ title: string; description: string; Icon: LucideIcon }> = [
  {
    title: 'Made to Measure',
    description: 'Fabrication planned around the actual project dimensions.',
    Icon: Ruler,
  },
  {
    title: 'Site Reviewed',
    description: 'Project conditions are checked before final scope and pricing.',
    Icon: ClipboardList,
  },
  {
    title: 'Quality Checked',
    description: 'Work is reviewed through fabrication and finishing stages.',
    Icon: BadgeCheck,
  },
  {
    title: 'Installation Support',
    description: 'Finished work is prepared for delivery and site installation.',
    Icon: Truck,
  },
];

const MATERIAL_CHECKLIST = [
  '304 and 316 stainless steel options',
  'Precision cutting and welding',
  'Professional finishing techniques',
  'Strict quality review',
];

const TRUST_REASONS: Array<{ title: string; description: string; Icon: LucideIcon }> = [
  {
    title: 'Clear Project Communication',
    description: 'Scope, measurements, and project requirements are reviewed before fabrication begins.',
    Icon: ClipboardList,
  },
  {
    title: 'Custom-Built Solutions',
    description: 'Every fabrication is shaped around the function, finish, and dimensions the project needs.',
    Icon: PenTool,
  },
  {
    title: 'Reliable Fabrication Process',
    description: 'From site review to finishing and installation, each stage follows a clear working process.',
    Icon: Handshake,
  },
];

const OFFICE_LOCATION = {
  label: 'RMV Stainless Steel Fabrication',
  address: 'BIR Village, Novaliches, Quezon City, Metro Manila 1118',
  plusCode: 'M3X3+RF4, Dahlia Ext, Quezon City, Metro Manila',
  lat: 14.6995125,
  lng: 121.053703125,
  email: 'rmvstainless@gmail.com',
  hours: 'Mon - Sat: 8:00 AM - 6:00 PM',
  directionsUrl: 'https://www.google.com/maps?q=14.6995125,121.053703125',
  embedUrl: 'https://www.google.com/maps?q=14.6995125,121.053703125&z=16&output=embed',
};

export function LandingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const bookingTarget = user ? '/appointments/book' : '/login';
  const [selectedService, setSelectedService] = useState<LandingService | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const goToBooking = () => navigate(bookingTarget);
  const selectedServiceDetail = selectedService ? SERVICE_DETAIL_METADATA[selectedService.type] : undefined;
  const selectedVariant = selectedService?.variants?.[selectedVariantIndex] ?? null;
  const activeSpecGroups = selectedVariant?.confirmationGroups ?? selectedServiceDetail?.specGroups ?? [];
  const hasVariants = Boolean(selectedService?.variants?.length);
  const displayImage = selectedVariant?.image ?? selectedService?.imageUrl;
  const displayTitle = selectedVariant?.title ?? selectedService?.label;
  const displayDescription =
    selectedVariant?.description ?? selectedServiceDetail?.fullDescription ?? selectedService?.description;
  const displayPrice = selectedVariant?.estimatedPrice ?? selectedServiceDetail?.estimatedPrice;
  const displayPriceNote = selectedVariant?.priceNote ?? selectedServiceDetail?.priceNote;
  const bookService = (service: LandingService) => {
    if (user) {
      navigate('/appointments/book?serviceType=' + encodeURIComponent(service.type));
      return;
    }

    navigate('/login');
  };

  const renderSpecGroup = (group: ServiceSpecGroup) => (
    <section
      key={group.title}
      className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="h-1.5 w-1.5 rounded-full bg-[#FFD700]" />
        <h4 className="text-xs font-black uppercase tracking-[0.18em] text-white">{group.title}</h4>
      </div>

      <div className="divide-y divide-white/10">
        {group.items.map((item) => (
          <div key={item.label} className="py-3 first:pt-1 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-bold text-white">{item.label}</p>
              {item.required && (
                <span className="rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#FFD700]">
                  Required
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#FFD700]/90">{item.value}</p>
            {item.note && <p className="mt-1 text-xs leading-5 text-white/56">{item.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-[#030405] text-white selection:bg-[#FFD700]/30 selection:text-white">
      <LandingNavbar />

      <main>
        <section id="hero" className="relative flex min-h-[720px] scroll-mt-16 items-end overflow-hidden border-b border-white/10 bg-[#090B0D] pt-16 lg:h-svh lg:min-h-[640px] lg:max-h-[900px] lg:pt-[72px]">
          <img
            src="/landing/hero/hero-stainless-railing-bg.png"
            alt="Architectural stainless steel railing installation"
            className="absolute inset-0 h-full w-full object-cover object-[62%_center] lg:object-center"
          />
          <div className="absolute inset-0 bg-black/28" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,11,13,0.99)_0%,rgba(9,11,13,0.94)_28%,rgba(9,11,13,0.72)_48%,rgba(9,11,13,0.18)_82%)]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#090B0D] via-[#090B0D]/70 to-transparent" />

          <div className="relative mx-auto flex w-[min(calc(100%_-_32px),1480px)] flex-col justify-end pb-8 pt-16 sm:w-[min(calc(100%_-_48px),1480px)] sm:pb-10 lg:pb-6">
            <div className="max-w-[760px] py-10 sm:py-14 lg:py-6">
              <p className="font-['Inter',sans-serif] text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#F5B400] sm:text-xs">
                RMV Stainless Steel Fabrication
              </p>

              <h1 className="mt-5 font-['Sora',sans-serif] text-[clamp(3rem,6vw,5.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.055em] text-white">
                <span className="block">Built With</span>
                <span className="block text-[#F5B400]">Precision.</span>
                <span className="block">Made to Last.</span>
              </h1>

              <p className="mt-6 max-w-xl font-['Inter',sans-serif] text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
                Premium stainless steel fabrication for residential, commercial, and industrial projects.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#services"
                  className="inline-flex min-h-[52px] items-center justify-center gap-4 rounded-md border border-[#F5B400] bg-[#F5B400] px-7 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-[#090B0D] shadow-[0_16px_40px_rgba(245,180,0,0.2)] transition duration-200 hover:-translate-y-0.5 hover:border-[#FFD047] hover:bg-[#FFD047] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400] sm:min-w-48"
                >
                  Our Services
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="#projects"
                  className="inline-flex min-h-[52px] items-center justify-center gap-4 rounded-md border border-white/35 bg-black/30 px-7 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#F5B400] hover:text-[#F5B400] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400] sm:min-w-48"
                >
                  View Projects
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="grid border-t border-white/12 pt-5 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4">
              {HERO_TRUST_ITEMS.map(({ title, Icon }) => (
                <div key={title} className="flex min-h-14 items-center gap-3 border-b border-white/[0.08] py-3 sm:border-b-0 lg:px-3 lg:first:pl-0">
                  <Icon className="h-5 w-5 shrink-0 text-[#F5B400]" strokeWidth={1.8} aria-hidden="true" />
                  <span className="max-w-[12rem] text-[0.66rem] font-bold uppercase leading-4 tracking-[0.08em] text-white/86">
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="services"
          className="scroll-mt-16 border-b border-[#E4E6E8] bg-[#F7F7F5] py-16 text-[#111417] sm:py-20 lg:scroll-mt-[72px] lg:py-28"
        >
          <div className="mx-auto grid w-[min(calc(100%_-_32px),1440px)] gap-10 sm:w-[min(calc(100%_-_48px),1440px)] lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[290px_minmax(0,1fr)] xl:gap-16">
            <div className="lg:pt-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F5B400]">Our</p>
              <h2 className="mt-2 font-['Sora',sans-serif] text-[clamp(2rem,4vw,3.75rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em]">
                Services
              </h2>
              <p className="mt-5 max-w-sm font-['Inter',sans-serif] text-base leading-7 text-[#5D646B]">
                High-quality stainless and metal fabrication tailored to residential, commercial, and industrial project needs.
              </p>
              <a
                href="#service-grid"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-[#111417] px-5 text-[0.68rem] font-extrabold uppercase tracking-[0.11em] text-[#111417] transition duration-200 hover:-translate-y-0.5 hover:bg-[#111417] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400]"
              >
                View All Services
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div id="service-grid" className="grid scroll-mt-24 gap-4 min-[430px]:grid-cols-2 lg:grid-cols-4">
              {FEATURED_SERVICES.map((service) => {
                const Icon = service.Icon;

                return (
                  <button
                    key={service.type}
                    type="button"
                    onClick={() => {
                      setSelectedVariantIndex(0);
                      setSelectedService(service);
                    }}
                    className="group relative min-h-[220px] overflow-hidden rounded-lg border border-black/10 bg-[#12161A] text-left shadow-[0_18px_50px_rgba(12,16,20,0.1)] transition duration-200 hover:-translate-y-1 hover:border-[#F5B400] hover:shadow-[0_24px_58px_rgba(12,16,20,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400] lg:min-h-[238px]"
                    aria-label={`View details for ${service.label}`}
                  >
                    <img
                      src={service.imageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090B0D] via-[#090B0D]/72 to-transparent" />
                    <div className="relative flex min-h-[220px] flex-col justify-end p-5 lg:min-h-[238px]">
                      <Icon className="mb-auto h-6 w-6 text-[#F5B400]" strokeWidth={1.7} aria-hidden="true" />
                      <h3 className="font-['Sora',sans-serif] text-base font-extrabold uppercase leading-tight text-white">
                        {service.label}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/72">
                        {service.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section id="projects" className="scroll-mt-16 border-b border-white/10 bg-[#090B0D] py-16 sm:py-20 lg:scroll-mt-[72px] lg:py-28">
          <div className="mx-auto grid w-[min(calc(100%_-_32px),1440px)] gap-10 sm:w-[min(calc(100%_-_48px),1440px)] lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[290px_minmax(0,1fr)] xl:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start lg:pt-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F5B400]">Featured</p>
              <h2 className="mt-2 font-['Sora',sans-serif] text-[clamp(2rem,4vw,3.75rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em] text-white">
                Projects
              </h2>
              <p className="mt-5 max-w-sm font-['Inter',sans-serif] text-base leading-7 text-[#8F969D]">
                A selection of stainless fabrication work showing practical layouts, clean finishes, and custom project execution.
              </p>
              <button
                type="button"
                onClick={goToBooking}
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-white/35 px-5 text-[0.68rem] font-extrabold uppercase tracking-[0.11em] text-white transition duration-200 hover:-translate-y-0.5 hover:border-[#F5B400] hover:text-[#F5B400] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400]"
              >
                Start a Project
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
              {FEATURED_PROJECTS.map((project) => (
                <article
                  key={project.title}
                  className="group w-[82vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-lg border border-white/10 bg-[#12161A] shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:w-auto sm:max-w-none"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                  <div className="border-t border-white/10 p-5">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.15em] text-[#F5B400]">{project.category}</p>
                    <h3 className="mt-2 font-['Sora',sans-serif] text-base font-bold leading-6 text-white">{project.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about-rmv" className="border-b border-[#E4E6E8] bg-[#F7F7F5] py-16 text-[#111417] sm:py-20 lg:py-28">
          <div className="mx-auto grid w-[min(calc(100%_-_32px),1240px)] items-center gap-10 sm:w-[min(calc(100%_-_48px),1240px)] lg:grid-cols-2 lg:gap-16">
            <div className="overflow-hidden rounded-lg bg-[#12161A] shadow-[0_18px_50px_rgba(12,16,20,0.12)]">
              <img
                src="/landing/completed-works/project-1.jpg"
                alt="RMV stainless fabrication work in progress"
                className="aspect-[4/3] h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F5B400]">About RMV</p>
              <h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,3.75rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em]">
                Quality Fabrication.<br />Trusted Service.
              </h2>
              <p className="mt-6 max-w-xl font-['Inter',sans-serif] text-base leading-7 text-[#5D646B]">
                RMV Stainless Steel Fabrication specializes in custom stainless and metal works for homes, businesses, and industrial project requirements. Each job is shaped around practical use, accurate measurements, and a finish built for its environment.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {ABOUT_BENEFITS.map(({ title, Icon }) => (
                  <div key={title} className="flex items-center gap-3 sm:block">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#F5B400] bg-[#F5B400] text-[#090B0D]">
                      <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <h3 className="text-sm font-extrabold uppercase leading-5 tracking-[-0.01em] sm:mt-3">{title}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-white/10 bg-[#12161A]">
          <img src="/landing/completed-works/cover.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.08]" />
          <div className="absolute inset-0 bg-[#090B0D]/85" />
          <div className="relative mx-auto grid w-[min(calc(100%_-_32px),1440px)] grid-cols-2 sm:w-[min(calc(100%_-_48px),1440px)] lg:grid-cols-4">
            {PROCESS_TRUST_ITEMS.map(({ title, description, Icon }, index) => (
              <article
                key={title}
                className={cn(
                  'min-h-[190px] px-4 py-8 text-center sm:px-6 lg:py-10',
                  index % 2 === 1 && 'border-l border-white/10',
                  index > 1 && 'border-t border-white/10 lg:border-t-0',
                  index > 0 && 'lg:border-l lg:border-white/10',
                )}
              >
                <Icon className="mx-auto h-7 w-7 text-[#F5B400]" strokeWidth={1.7} aria-hidden="true" />
                <h3 className="mt-4 font-['Sora',sans-serif] text-base font-extrabold uppercase text-[#F5B400]">{title}</h3>
                <p className="mx-auto mt-2 max-w-[15rem] text-sm leading-6 text-white/62">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="materials" className="scroll-mt-16 border-b border-[#E4E6E8] bg-[#F7F7F5] py-16 text-[#111417] sm:py-20 lg:scroll-mt-[72px] lg:py-28">
          <div className="mx-auto grid w-[min(calc(100%_-_32px),1320px)] items-center gap-12 sm:w-[min(calc(100%_-_48px),1320px)] lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F5B400]">Materials &amp; Process</p>
              <h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,3.75rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em]">
                Built on Quality.<br />Focused on Precision.
              </h2>
              <p className="mt-6 max-w-xl font-['Inter',sans-serif] text-base leading-7 text-[#5D646B]">
                RMV works with stainless material options and a fabrication process built around accurate measurements, practical detailing, clean welding, and professional finishing.
              </p>

              <ul className="mt-7 grid gap-3">
                {MATERIAL_CHECKLIST.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold text-[#30363B] sm:text-base">
                    <BadgeCheck className="h-5 w-5 shrink-0 text-[#F5B400]" strokeWidth={2} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="/about"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-[#111417] px-5 text-[0.68rem] font-extrabold uppercase tracking-[0.11em] text-[#111417] transition duration-200 hover:-translate-y-0.5 hover:bg-[#111417] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5B400]"
              >
                Learn More
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <img
                src="/landing/commercial-kitchens/project-1.jpg"
                alt="Stainless steel profiles and commercial kitchen fabrication"
                className="col-span-2 aspect-[2/1] w-full rounded-lg object-cover"
                loading="lazy"
              />
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[#12161A]">
                <img
                  src="/landing/custom-metalworks/project-1.png"
                  alt="Custom stainless fabrication installation"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <img
                src="/landing/services/railings/01-commercial-stainless-guardrail.png"
                alt="Finished stainless steel guardrail"
                className="aspect-[4/3] h-full w-full rounded-lg object-cover"
                loading="lazy"
              />
              <img
                src="/landing/services/kitchen-counter/01-kitchen-counter-corner-open-shelf.png"
                alt="Brushed stainless steel kitchen counter finish"
                className="col-span-2 aspect-[2/0.72] h-full w-full rounded-lg object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#090B0D] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto w-[min(calc(100%_-_32px),1220px)] sm:w-[min(calc(100%_-_48px),1220px)]">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F5B400]">Why Clients Choose RMV</p>
              <h2 className="mt-3 font-['Sora',sans-serif] text-[clamp(2rem,4vw,3.75rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.04em] text-white">
                Built Around Your Project.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {TRUST_REASONS.map(({ title, description, Icon }) => (
                <article key={title} className="rounded-lg border border-white/10 bg-[#191E23] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-7">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#F5B400]/55 text-[#F5B400]">
                    <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 font-['Sora',sans-serif] text-lg font-extrabold leading-6 text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#D4D7DA]/72">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#F5B400] py-10 text-[#090B0D] sm:py-12">
          <img src="/landing/completed-works/cover.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.08] mix-blend-multiply" />
          <div className="relative mx-auto grid w-[min(calc(100%_-_32px),1320px)] items-center gap-7 sm:w-[min(calc(100%_-_48px),1320px)] lg:grid-cols-[1.1fr_1fr_auto] lg:gap-12">
            <h2 className="font-['Sora',sans-serif] text-[clamp(2rem,4vw,4rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.04em]">
              Ready to Start<br />Your Project?
            </h2>
            <p className="max-w-md font-['Inter',sans-serif] text-base font-medium leading-7 text-black/72">
              Let&apos;s bring your ideas to life with precision fabrication and premium quality.
            </p>
            <button
              type="button"
              onClick={goToBooking}
              className="inline-flex min-h-[52px] items-center justify-center gap-4 rounded-md border border-[#090B0D] bg-[#090B0D] px-7 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#191E23] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#090B0D]"
            >
              Request a Quote
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        <div className="hidden" aria-hidden="true">
          <div className="mx-auto grid w-[min(calc(100%_-_32px),1440px)] gap-10 py-14 sm:w-[min(calc(100%_-_48px),1440px)] sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_1.35fr_0.9fr] lg:gap-8 lg:py-16">
            <div>
              <div className="flex items-center gap-3">
                <img src="/RMV_circle_true_transparent_v2.png" alt="" className="h-12 w-12 object-contain" />
                <div>
                  <p className="font-['Sora',sans-serif] text-lg font-extrabold text-white">RMV</p>
                  <p className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white/55">Stainless Fabrication</p>
                </div>
              </div>
              <p className="mt-5 max-w-xs text-sm leading-6 text-white/58">
                Custom stainless and metal fabrication for residential, commercial, and industrial project requirements.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Quick Links</h3>
              <nav className="mt-5 grid gap-3 text-sm text-white/58" aria-label="Footer navigation">
                <a href="#hero" className="hover:text-[#F5B400]">Home</a>
                <a href="#services" className="hover:text-[#F5B400]">Services</a>
                <a href="#projects" className="hover:text-[#F5B400]">Projects</a>
                <a href="/about" className="hover:text-[#F5B400]">About Us</a>
                <a href="#materials" className="hover:text-[#F5B400]">Materials</a>
                <a href="#contact" className="hover:text-[#F5B400]">Contact</a>
              </nav>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Our Services</h3>
              <div className="mt-5 grid gap-3 text-sm text-white/58">
                {FEATURED_SERVICES.slice(0, 6).map((service) => (
                  <button
                    key={service.type}
                    type="button"
                    onClick={() => {
                      setSelectedVariantIndex(0);
                      setSelectedService(service);
                    }}
                    className="min-h-6 text-left hover:text-[#F5B400] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B400]"
                  >
                    {service.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Contact Us</h3>
              <div className="mt-5 grid gap-4 text-sm leading-6 text-white/58">
                <a href={`mailto:${OFFICE_LOCATION.email}`} className="flex items-start gap-3 hover:text-[#F5B400]">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" aria-hidden="true" />
                  {OFFICE_LOCATION.email}
                </a>
                <a href={OFFICE_LOCATION.directionsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-[#F5B400]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" aria-hidden="true" />
                  {OFFICE_LOCATION.address}
                </a>
                <p className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B400]" aria-hidden="true" />
                  {OFFICE_LOCATION.hours}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Service Areas</h3>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-white/58">
                <p>Quezon City</p>
                <p>Metro Manila</p>
                <p>Project coverage confirmed during consultation.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10">
            <div className="mx-auto flex w-[min(calc(100%_-_32px),1440px)] flex-col gap-3 py-5 text-xs text-white/42 sm:w-[min(calc(100%_-_48px),1440px)] sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 RMV Stainless Steel Fabrication. All rights reserved.</p>
              <div className="flex gap-5">
                <a href="/privacy" className="hover:text-[#F5B400]">Privacy Policy</a>
                <a href="/terms" className="hover:text-[#F5B400]">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
        <PublicFooter />
      </main>

      <Dialog
        open={Boolean(selectedService)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedService(null);
            setSelectedVariantIndex(0);
          }
        }}
      >
        <DialogContent className="max-h-[94dvh] w-[calc(100vw-1.5rem)] max-w-[420px] gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#06080a] p-0 text-white shadow-[0_24px_90px_rgba(0,0,0,0.65)] sm:w-[calc(100vw-2rem)] sm:max-w-[1200px] lg:max-h-[92dvh]">
          {selectedService && selectedServiceDetail && (
            <div className="flex max-h-[94dvh] min-w-0 flex-col lg:max-h-[92dvh]">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.75fr)]">
                  <div className="min-w-0 p-3 sm:p-4 lg:p-5">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
                      <img
                        src={displayImage}
                        alt={displayTitle}
                        className="h-[220px] w-full object-cover sm:h-[360px] lg:h-[430px]"
                      />
                      {hasVariants && (
                        <div className="absolute bottom-3 left-3 rounded-full border border-white/12 bg-black/50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/82 backdrop-blur">
                          {String(selectedVariantIndex + 1).padStart(2, '0')} / {selectedService.variants?.length}
                        </div>
                      )}
                    </div>

                    {hasVariants && selectedService.variants && (
                      <div className="-mx-1 mt-3 flex max-w-full gap-2 overflow-x-auto px-1 pb-2 sm:gap-3">
                        {selectedService.variants.map((variant, index) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantIndex(index)}
                            aria-label={`View ${variant.title}`}
                            className={cn(
                              'group w-[84px] shrink-0 rounded-xl border p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 sm:w-[112px]',
                              index === selectedVariantIndex
                                ? 'border-[#FFD700] bg-[#FFD700]/10 ring-1 ring-[#FFD700]/60'
                                : 'border-white/10 bg-white/[0.03] hover:border-[#FFD700]/50',
                            )}
                          >
                            <div className="relative overflow-hidden rounded-lg">
                              <img
                                src={variant.image}
                                alt={variant.title}
                                className="h-14 w-full object-cover sm:h-20"
                                loading="lazy"
                              />
                              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-black text-[#FFD700]">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-[9px] font-bold leading-3 text-white/75 group-hover:text-white sm:text-[10px] sm:leading-4">
                              {variant.title}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 border-t border-white/10 p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
                    <DialogHeader className="space-y-3 text-left">
                      <p className="label-font text-[10px] font-black uppercase tracking-[0.28em] text-[#FFD700]">
                        Service Detail
                      </p>
                      <DialogTitle className="headline-font text-2xl font-black uppercase leading-none tracking-[0.06em] text-white sm:text-4xl">
                        {selectedService.label}
                      </DialogTitle>
                      {selectedVariant && (
                        <div className="pt-2">
                          <p className="label-font text-[10px] font-black uppercase tracking-[0.22em] text-[#FFD700]">
                            Selected Variant
                          </p>
                          <h3 className="mt-2 text-lg font-black leading-tight text-white sm:text-2xl">{selectedVariant.title}</h3>
                        </div>
                      )}
                      <DialogDescription className="max-w-none text-sm leading-7 text-white/68 sm:text-base">
                        {displayDescription}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-5 rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFD700]">Estimated Price Range</h3>
                        <span className="rounded-full border border-[#FFD700]/25 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#FFD700]">
                          Quote-based
                        </span>
                      </div>
                      <p className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{displayPrice}</p>
                      <p className="mt-3 text-sm leading-6 text-white/64">{displayPriceNote}</p>
                    </div>
                  </div>
                </div>

                <section className="min-w-0 space-y-5 border-t border-white/10 p-4 sm:p-5 lg:p-6">
                  <div>
                    <p className="label-font text-[10px] font-black uppercase tracking-[0.28em] text-[#FFD700]">
                      Project Specification Guide
                    </p>
                    <h3 className="headline-font mt-2 text-xl font-black uppercase tracking-[0.1em] text-white sm:text-2xl">
                      What Sales Staff Will Confirm
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      These details help RMV prepare an accurate quote for the selected service.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {activeSpecGroups.map(renderSpecGroup)}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                    <p className="text-sm leading-6 text-white/70">{SERVICE_QUOTE_DISCLAIMER}</p>
                  </div>
                </section>
              </div>

              <DialogFooter className="min-w-0 shrink-0 gap-3 border-t border-white/10 bg-[#06080a]/95 p-3 backdrop-blur sm:flex-row sm:justify-end sm:space-x-0 sm:p-4">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full min-w-0 rounded-md border-white/20 bg-transparent px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:border-white/45 hover:bg-white/10 hover:text-white sm:w-auto sm:px-6 sm:text-[11px] sm:tracking-[0.16em]"
                  >
                    Close
                  </Button>
                </DialogClose>
                <button
                  type="button"
                  onClick={() => bookService(selectedService)}
                  style={{ backgroundColor: '#FFD700', backgroundImage: 'none' }}
                  className="inline-flex h-11 w-full min-w-0 cursor-pointer items-center justify-center rounded-md border border-[#FFD700] px-5 text-[10px] font-black uppercase tracking-[0.12em] text-black shadow-[0_14px_38px_rgba(255,215,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffe766] hover:brightness-110 hover:shadow-[0_18px_46px_rgba(255,215,0,0.36)] active:translate-y-0 active:scale-[0.98] sm:w-auto sm:px-6 sm:text-[11px] sm:tracking-[0.16em]"
                >
                  Book This Service
                  <ArrowRight className="ml-2 h-4 w-4 text-black" />
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
