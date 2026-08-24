import type { ComponentType } from 'react';
import { Fence, Grid3X3, House, Layers, ShieldCheck, Umbrella, Utensils, Wrench } from 'lucide-react';

import { ServiceType } from './constants';

export interface ServiceProject {
  title: string;
  image: string;
  alt: string;
  description?: string;
  measurements?: string[];
  estimatedPrice?: string;
  priceNote?: string;
  detailGroups?: Array<{
    title: string;
    items: string[];
  }>;
}

export interface ServiceProjectReference extends ServiceProject {
  id: string;
  serviceId: string;
  serviceLabel: string;
  serviceType: ServiceType;
}

export interface ServiceCollection {
  id: string;
  label: string;
  eyebrow: string;
  shortDescription: string;
  capabilityDescription: string;
  bestFor: string;
  scopeNote: string;
  coverImage: string;
  tags: string[];
  systems: string[];
  icon: ComponentType<{ className?: string }>;
  serviceType: ServiceType;
  projects: ServiceProject[];
  measurementNotes?: string[];
}

const service = (
  id: string,
  label: string,
  eyebrow: string,
  shortDescription: string,
  capabilityDescription: string,
  bestFor: string,
  scopeNote: string,
  coverImage: string,
  tags: string[],
  systems: string[],
  icon: ServiceCollection['icon'],
  serviceType: ServiceType,
  projects: ServiceProject[],
  measurementNotes: string[] = [],
): ServiceCollection => ({ id, label, eyebrow, shortDescription, capabilityDescription, bestFor, scopeNote, coverImage, tags, systems, icon, serviceType, projects, measurementNotes });

export const SERVICE_CATALOG: ServiceCollection[] = [
  service('railings', 'Railings', 'Stainless Railings', 'Stainless railing systems for balconies, stairs, terraces, and safety edges.', 'Custom railing work is planned around the site, the intended use, and the finished look required for the space.', 'Balconies, stairways, terraces, walkways, and commercial safety edges.', 'Site measurement, fabrication, finishing, and installation preparation.', '/landing/services/railings.png', ['Made-to-measure layouts', 'Stainless steel fabrication', 'Indoor and outdoor applications'], ['Handrails', 'Guardrails', 'Balcony railings', 'Stair railings'], Layers, ServiceType.RAILINGS, [
    { title: 'Commercial stainless guardrail', image: '/landing/services/railings/01-commercial-stainless-guardrail.png', alt: 'Commercial stainless steel guardrail', description: 'A heavy-duty stainless guardrail for storefronts, ramps, entrances, and commercial walkways. Built with strong posts, horizontal rails, rounded handrail ends, and secure base plates for practical safety and a clean appearance.', detailGroups: [{ title: 'Measurements', items: ['Total run length: 1 m – 20 m+', 'Rail height: 900 mm – 1100 mm', 'Post spacing: 900 mm – 1200 mm', 'Rail count: 2 – 5 horizontal rails'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 / SS316', 'Tube size: 38 mm – 50 mm handrail', 'Thickness: 1.2 mm – 2.0 mm+', 'Finish: brushed satin / polished'] }, { title: 'Installation & quote', items: ['Floor-mounted base plates on concrete, tile, or steel base', 'Anchors: expansion bolts or chemical anchors, confirmed on site', 'Send site photos, total length, height, and mounting surface for a quote'] }] },
    { title: 'Outdoor stainless stair railing', image: '/landing/services/railings/02-outdoor-stainless-stair-railing.png', alt: 'Outdoor stainless steel stair railing', description: 'A stainless railing system for exterior concrete stairs, building entrances, and outdoor steps. Designed with angled handrails, horizontal bars, sturdy posts, and visible base plates for safe access.', detailGroups: [{ title: 'Measurements', items: ['Stair run length: custom per stair', 'Number of steps: site-specific', 'Rail height: 900 mm – 1100 mm', 'Landing length: as required'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 / SS316 outdoor recommended', 'Tube size: 38 mm – 50 mm handrail', 'Thickness: 1.2 mm – 2.0 mm+', 'Finish: brushed / satin / polished'] }, { title: 'Installation & quote', items: ['Tread-mounted or side-mounted on concrete stairs', 'Outdoor exposure is reviewed to select the correct stainless grade', 'Send stair photos, step count, slope, total length, and mounting surface'] }] },
    { title: 'Terrace stainless railing', image: '/landing/services/railings/03-terrace-stainless-railing.png', alt: 'Stainless steel terrace railing', description: 'A stainless railing system for terrace, deck, balcony edge, or open outdoor areas. Built with horizontal rails, sturdy posts, top handrail, and secure base plates for safety and a clean modern look.', detailGroups: [{ title: 'Measurements', items: ['Total perimeter length: 2 m – 30 m+', 'Rail height: 1000 mm – 1100 mm', 'Post spacing: 900 mm – 1200 mm', 'Corner count: site-specific'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 / SS316', 'Tube size: 38 mm – 50 mm handrail', 'Rail count: 3 – 6 horizontal rails', 'Finish: brushed / satin / polished'] }, { title: 'Installation & quote', items: ['Floor-mounted base plates on tile, concrete, or deck slab', 'Open edge, parapet, or raised curb is confirmed on site', 'Send terrace photos, perimeter measurements, corner count, and floor material'] }] },
    { title: 'Indoor stainless stair railing', image: '/landing/services/railings/04-indoor-stainless-stair-railing.png', alt: 'Indoor stainless stair railing', description: 'An indoor stainless stair railing for residential or commercial stairs. Built with angled top handrail, vertical posts, horizontal bars, and clean mounting plates following the staircase slope.', detailGroups: [{ title: 'Measurements', items: ['Stair run length: custom per stair', 'Rail height: 900 mm – 1100 mm', 'Post spacing: 900 mm – 1200 mm', 'Stair material: concrete / tile / marble / wood'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 typical', 'Tube size: 38 mm – 50 mm handrail', 'Thickness: 1.2 mm – 1.5 mm+', 'Finish: brushed satin / polished'] }, { title: 'Installation & quote', items: ['Tread-mounted or side-mounted based on stair width and edge condition', 'Wall clearance and top/bottom landings are reviewed before fabrication', 'Send stair photos, step count, run length, and stair material'] }] },
    { title: 'Glass stainless balcony railing', image: '/landing/services/railings/05-glass-stainless-balcony-railing.png', alt: 'Glass and stainless balcony railing', description: 'A modern glass and stainless balcony railing with stainless posts, clear glass panels, clamps, top rail, and secure base plates. Good for balconies, terraces, and commercial frontage where visibility and safety matter.', detailGroups: [{ title: 'Measurements', items: ['Total run length: 1 m – 20 m+', 'Glass height: 900 mm – 1100 mm', 'Glass panel width: custom per span', 'Post spacing: based on glass panels'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 / SS316', 'Glass: tempered or laminated tempered', 'Glass thickness: 10 mm – 12 mm+', 'Finish: brushed or polished stainless'] }, { title: 'Installation & quote', items: ['Side clamps, post clamps, or base channel selected for the layout', 'Concrete, tile, and balcony slab conditions affect anchoring', 'Send balcony photos, measurements, edge condition, and preferred glass style'] }] },
    { title: 'Wall-mounted stainless handrail', image: '/landing/services/railings/06-wall-mounted-stainless-handrail.png', alt: 'Wall-mounted stainless steel handrail', description: 'A wall-mounted stainless safety handrail for hallways, ramps, clinics, shops, homes, and commercial spaces. Built with round stainless tubing, wall brackets, screw plates, and clean practical installation.', detailGroups: [{ title: 'Measurements', items: ['Total handrail length: 1 m – 30 m+', 'Handrail height: 850 mm – 950 mm typical', 'Bracket spacing: 800 mm – 1200 mm', 'Return ends: straight / returned / capped'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 typical', 'Tube size: 38 mm – 50 mm', 'Thickness: 1.2 mm – 1.5 mm+', 'Finish: brushed satin / polished'] }, { title: 'Installation & quote', items: ['Wall brackets with round plates for concrete, tile, drywall, or masonry', 'Wall material determines the correct anchors', 'Send wall photos, total length, wall material, and desired height'] }] },
    { title: 'Balcony horizontal stainless railing', image: '/landing/services/railings/07-balcony-horizontal-stainless-railing.png', alt: 'Balcony horizontal stainless steel railing', description: 'A horizontal stainless balcony railing for residential balconies and elevated edges. Built with round posts, multiple horizontal rails, top handrail, base plates, and a clean stainless finish.', detailGroups: [{ title: 'Measurements', items: ['Balcony length: 1 m – 20 m+', 'Rail height: 1000 mm – 1100 mm', 'Post spacing: 900 mm – 1200 mm', 'Rail count: 4 – 6 horizontal rails'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 / SS316', 'Tube size: 38 mm – 50 mm handrail', 'Thickness: 1.2 mm – 2.0 mm+', 'Finish: brushed / satin / polished'] }, { title: 'Installation & quote', items: ['Floor-mounted base plates on concrete, tile, or balcony slab', 'Outdoor exposure and edge condition are reviewed before fabrication', 'Send balcony photos, length, height, floor material, and edge condition'] }] },
  ]),
  service('gates', 'Gates', 'Stainless Gates', 'Custom gates designed for practical access, security, and a clean finished frontage.', 'Each gate is fabricated around the opening, operation style, and material finish needed for the property.', 'Residential entrances, pedestrian access, driveways, and commercial boundaries.', 'Measurement, custom fabrication, fit-up, and installation planning.', '/landing/services/gates.png', ['Custom opening sizes', 'Swing and sliding options', 'Durable metal fabrication'], ['Double swing gates', 'Sliding gates', 'Pedestrian gates', 'Security gates'], Fence, ServiceType.GATES, [
    { title: 'Double swing gate', image: '/landing/services/gates/01-gates-double-swing-stainless-gate.png', alt: 'Double swing stainless steel gate', description: 'A two-panel stainless gate designed for residential driveways and property entrances, with hinged panels, posts, rails, and latch hardware.', measurements: ['Typical opening width: 6 ft – 16 ft+', 'Typical height: 4 ft – 7 ft+', 'Confirm swing clearance and panel split'] },
    { title: 'Modern metal gate', image: '/landing/services/gates/02-gates-modern-mixed-metal-gate.png', alt: 'Modern mixed metal gate', description: 'A custom modern gate with a painted steel frame and stainless accent strips or panels. The layout can be adapted for privacy, airflow, and the intended frontage.', measurements: ['Typical opening width: 6 ft – 16 ft+', 'Typical height: 4 ft – 7 ft+', 'Horizontal slat layout and gap spacing are custom'] },
    { title: 'Commercial security gate', image: '/landing/services/gates/03-gates-commercial-security-gate.png', alt: 'Commercial security gate', description: 'A reinforced gate approach for storefronts, service entrances, and commercial properties where practical access control is needed.', measurements: ['Typical opening width: 4 ft – 16 ft+', 'Typical height: 6 ft – 9 ft+', 'Bar spacing and panel configuration are confirmed on site'] },
    { title: 'Pedestrian gate', image: '/landing/services/gates/04-gates-pedestrian-stainless-gate.png', alt: 'Stainless pedestrian gate', description: 'A compact single gate for side entrances, walkways, utility access, and home entry points, with a custom hinge and latch arrangement.', measurements: ['Typical opening width: 2.5 ft – 4 ft+', 'Typical height: 4 ft – 7 ft+', 'Confirm hinge side and opening direction'] },
    { title: 'Sliding Stainless Gate', image: '/landing/services/gates/05-gates-sliding-stainless-gate.png', alt: 'Sliding stainless steel gate', description: 'A stainless sliding gate for residential driveways and property entrances, with a fabricated frame, sliding track, rollers, guide post, and lock provision.', estimatedPrice: '₱45,000 – ₱180,000+' },
    { title: 'Decorative Stainless Gate', image: '/landing/services/gates/06-gates-decorative-stainless-gate.png', alt: 'Decorative stainless steel gate', description: 'A stainless residential gate with decorative bar patterns, balanced rails, clean welds, hinges, latch hardware, and durable stainless finishing.', estimatedPrice: '₱35,000 – ₱140,000+' },
  ], ['Final dimensions are confirmed from the clear site opening.', 'Opening style, privacy level, and hardware are selected during consultation.']),
  service('kitchen-counter', 'Kitchen Counter', 'Stainless Kitchen Counters', 'Custom stainless counters and workstations for commercial and residential food preparation areas.', 'Counter layouts are shaped around workflow, storage, sink placement, and the actual dimensions of the site.', 'Commercial kitchens, food preparation areas, utility spaces, and residential kitchens.', 'Measurement, fabrication, fitting, finishing, and installation coordination.', '/landing/services/kitchen-counter.png', ['Custom workstation layouts', 'Storage and sink integration', 'Professional stainless finishing'], ['Prep counters', 'Sink counters', 'Island worktables', 'Storage workstations'], Utensils, ServiceType.KITCHEN_COUNTER, [
    { title: 'Corner counter with open shelf', image: '/landing/services/kitchen-counter/01-kitchen-counter-corner-open-shelf.png', alt: 'Stainless corner kitchen counter with open shelf' },
    { title: 'Sink and drainer workstation', image: '/landing/services/kitchen-counter/02-kitchen-counter-sink-drainer-drawers.png', alt: 'Stainless sink and drainer workstation' },
    { title: 'Island preparation table', image: '/landing/services/kitchen-counter/03-kitchen-counter-island-prep-table.png', alt: 'Stainless kitchen island preparation table' },
    { title: 'Drawer base workstation', image: '/landing/services/kitchen-counter/04-kitchen-counter-drawer-base-workstation.png', alt: 'Stainless drawer base workstation' },
    { title: 'Sink Counter with Sliding Storage', image: '/landing/services/kitchen-counter/05-kitchen-counter-sink-sliding-storage.png', alt: 'Stainless sink counter with sliding-door storage', description: 'A straight stainless kitchen counter with a built-in sink, backsplash, and sliding-door base storage for compact commercial or home kitchen layouts.', estimatedPrice: '₱18,000 – ₱45,000+' },
    { title: 'L-Type Commercial Kitchen Counter', image: '/landing/services/kitchen-counter/06-kitchen-counter-l-shape-commercial.png', alt: 'L-shaped stainless commercial kitchen counter', description: 'An L-shaped stainless counter layout for commercial kitchens, food stalls, prep rooms, and restaurants, planned around the site, appliances, plumbing, and storage needs.', estimatedPrice: '₱45,000 – ₱120,000+' },
  ]),
  service('canopy', 'Canopy', 'Metal Canopies', 'Protective canopy fabrication for entrances, walkways, carports, and storefronts.', 'Canopy systems are designed around site coverage, support requirements, drainage, and the intended finish.', 'Walkways, garage areas, entrances, storefronts, and covered outdoor spaces.', 'Site review, frame fabrication, finishing, and installation preparation.', '/landing/services/canopy.png', ['Custom coverage layouts', 'Metal support framing', 'Outdoor-ready fabrication'], ['Walkway canopies', 'Carport covers', 'Entrance canopies', 'Storefront canopies'], Umbrella, ServiceType.CANOPY, [
    { title: 'Walkway canopy', image: '/landing/services/canopy/01-canopy-walkway-stainless-canopy.png', alt: 'Stainless steel walkway canopy' },
    { title: 'Garage carport canopy', image: '/landing/services/canopy/02-canopy-garage-carport-canopy.png', alt: 'Metal garage carport canopy' },
    { title: 'Storefront canopy', image: '/landing/services/canopy/03-canopy-storefront-metal-canopy.png', alt: 'Storefront metal canopy' },
    { title: 'Entrance canopy', image: '/landing/services/canopy/04-canopy-polycarbonate-entrance-canopy.png', alt: 'Polycarbonate entrance canopy with metal frame' },
  ]),
  service('staircase', 'Staircase', 'Custom Staircases', 'Staircase fabrication with practical layouts, durable construction, and coordinated railing work.', 'Stair projects are developed around circulation, site dimensions, material finish, and safe everyday use.', 'Homes, commercial spaces, mezzanines, access stairs, and renovation projects.', 'Site measurement, fabrication planning, finishing, and installation coordination.', '/landing/services/staircase.png', ['Custom-fit stair layouts', 'Coordinated railings', 'Residential and commercial use'], ['Stair frames', 'Treads', 'Handrails', 'Guardrail integration'], House, ServiceType.STAIRCASE, [
    { title: 'Stainless staircase installation', image: '/landing/services/staircase.png', alt: 'Stainless staircase installation' },
    { title: 'Indoor stainless stair railing', image: '/landing/services/railings/04-indoor-stainless-stair-railing.png', alt: 'Indoor stainless stair railing', description: 'An indoor stainless stair railing for residential or commercial stairs. Built with angled top handrail, vertical posts, horizontal bars, and clean mounting plates following the staircase slope.', detailGroups: [{ title: 'Measurements', items: ['Stair run length: custom per stair', 'Rail height: 900 mm – 1100 mm', 'Post spacing: 900 mm – 1200 mm', 'Stair material: concrete / tile / marble / wood'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 typical', 'Tube size: 38 mm – 50 mm handrail', 'Thickness: 1.2 mm – 1.5 mm+', 'Finish: brushed satin / polished'] }, { title: 'Installation & quote', items: ['Tread-mounted or side-mounted based on stair width and edge condition', 'Wall clearance and top/bottom landings are reviewed before fabrication', 'Send stair photos, step count, run length, and stair material'] }] },
    { title: 'Glass stainless balcony railing', image: '/landing/services/railings/05-glass-stainless-balcony-railing.png', alt: 'Glass and stainless balcony railing', description: 'A modern glass and stainless balcony railing with stainless posts, clear glass panels, clamps, top rail, and secure base plates. Good for balconies, terraces, and commercial frontage where visibility and safety matter.', detailGroups: [{ title: 'Measurements', items: ['Total run length: 1 m – 20 m+', 'Glass height: 900 mm – 1100 mm', 'Glass panel width: custom per span', 'Post spacing: based on glass panels'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 / SS316', 'Glass: tempered or laminated tempered', 'Glass thickness: 10 mm – 12 mm+', 'Finish: brushed or polished stainless'] }, { title: 'Installation & quote', items: ['Side clamps, post clamps, or base channel selected for the layout', 'Concrete, tile, and balcony slab conditions affect anchoring', 'Send balcony photos, measurements, edge condition, and preferred glass style'] }] },
    { title: 'Wall-mounted stainless handrail', image: '/landing/services/railings/06-wall-mounted-stainless-handrail.png', alt: 'Wall-mounted stainless steel handrail', description: 'A wall-mounted stainless safety handrail for hallways, ramps, clinics, shops, homes, and commercial spaces. Built with round stainless tubing, wall brackets, screw plates, and clean practical installation.', detailGroups: [{ title: 'Measurements', items: ['Total handrail length: 1 m – 30 m+', 'Handrail height: 850 mm – 950 mm typical', 'Bracket spacing: 800 mm – 1200 mm', 'Return ends: straight / returned / capped'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 typical', 'Tube size: 38 mm – 50 mm', 'Thickness: 1.2 mm – 1.5 mm+', 'Finish: brushed satin / polished'] }, { title: 'Installation & quote', items: ['Wall brackets with round plates for concrete, tile, drywall, or masonry', 'Wall material determines the correct anchors', 'Send wall photos, total length, wall material, and desired height'] }] },
    { title: 'Balcony horizontal stainless railing', image: '/landing/services/railings/07-balcony-horizontal-stainless-railing.png', alt: 'Balcony horizontal stainless steel railing', description: 'A horizontal stainless balcony railing for residential balconies and elevated edges. Built with round posts, multiple horizontal rails, top handrail, base plates, and a clean stainless finish.', detailGroups: [{ title: 'Measurements', items: ['Balcony length: 1 m – 20 m+', 'Rail height: 1000 mm – 1100 mm', 'Post spacing: 900 mm – 1200 mm', 'Rail count: 4 – 6 horizontal rails'] }, { title: 'Material & finish', items: ['Stainless grade: SS304 / SS316', 'Tube size: 38 mm – 50 mm handrail', 'Thickness: 1.2 mm – 2.0 mm+', 'Finish: brushed / satin / polished'] }, { title: 'Installation & quote', items: ['Floor-mounted base plates on concrete, tile, or balcony slab', 'Outdoor exposure and edge condition are reviewed before fabrication', 'Send balcony photos, length, height, floor material, and edge condition'] }] },
    { title: 'Outdoor stair railing', image: '/landing/services/railings/02-outdoor-stainless-stair-railing.png', alt: 'Outdoor stair railing' },
    { title: 'Commercial guardrail', image: '/landing/services/railings/01-commercial-stainless-guardrail.png', alt: 'Commercial stainless guardrail beside stairs' },
  ]),
  service('kitchen-cabinet', 'Kitchen Cabinet', 'Stainless Kitchen Cabinets', 'Functional stainless cabinets and storage systems for clean, durable kitchen workspaces.', 'Cabinet systems are arranged around storage needs, available space, access, and the kitchen workflow.', 'Commercial kitchens, utility rooms, food preparation spaces, and storage areas.', 'Custom sizing, fabrication, finishing, and fitting around the approved layout.', '/landing/services/kitchen-cabinet.png', ['Tailored storage layouts', 'Stainless construction', 'Practical kitchen organization'], ['Tall cabinets', 'Base cabinets', 'Wall cabinets', 'Open shelf storage'], Grid3X3, ServiceType.KITCHEN_CABINET, [
    { title: 'Tall storage cabinet', image: '/landing/services/kitchen-cabinet/01-kitchen-cabinet-tall-storage.png', alt: 'Tall stainless kitchen storage cabinet' },
    { title: 'Drawer and shelf cabinet', image: '/landing/services/kitchen-cabinet/02-kitchen-cabinet-drawers-open-shelves.png', alt: 'Stainless cabinet with drawers and open shelves' },
    { title: 'Overhead cabinet', image: '/landing/services/kitchen-cabinet/03-kitchen-cabinet-overhead-wall-mounted.png', alt: 'Wall mounted stainless kitchen cabinet' },
    { title: 'Full cabinet system', image: '/landing/services/kitchen-cabinet/04-kitchen-cabinet-full-system.png', alt: 'Full stainless kitchen cabinet system' },
    { title: 'Base Stainless Kitchen Cabinet', image: '/landing/services/kitchen-cabinet/05-kitchen-cabinet-base-storage.png', alt: 'Stainless base kitchen cabinet', description: 'An under-counter stainless base cabinet with practical doors, handles, sturdy legs, and storage for compact kitchens, wash areas, and commercial workspaces.', estimatedPrice: '₱20,000 – ₱60,000+' },
  ]),
  service('fences', 'Fences', 'Custom Fences', 'Metal fence fabrication for defined boundaries, security, and a clean exterior finish.', 'Fence work is tailored to the property line, access needs, material choice, and the desired level of visibility.', 'Residential boundaries, commercial properties, gates, and perimeter improvements.', 'Site review, material planning, fabrication, finishing, and installation coordination.', '/landing/services/fences.png', ['Custom boundary layouts', 'Durable metal fabrication', 'Matched gate integration'], ['Perimeter fences', 'Metal panels', 'Property boundaries', 'Gate coordination'], ShieldCheck, ServiceType.FENCES, [
    { title: 'Custom metal fence', image: '/landing/services/fences.png', alt: 'Custom metal fence' },
    { title: 'Decorative stainless gate', image: '/landing/services/gates/06-gates-decorative-stainless-gate.png', alt: 'Decorative stainless steel gate' },
    { title: 'Commercial security gate', image: '/landing/services/gates/03-gates-commercial-security-gate.png', alt: 'Commercial security gate at property boundary' },
    { title: 'Modern mixed metal gate', image: '/landing/services/gates/02-gates-modern-mixed-metal-gate.png', alt: 'Modern mixed metal gate and fence style' },
  ]),
  service('custom', 'Custom Fabrication', 'Custom Metalworks', 'Custom stainless and metal fabrication shaped around the function, dimensions, and finish your project needs.', 'From utility stations to specialty structures, each custom job begins with the required use, space, and material details.', 'Special-purpose workstations, storage, food-service fixtures, and unique project requirements.', 'Consultation, measurement, fabrication, finishing, and project-specific installation support.', '/landing/services/custom.png', ['Built around your requirements', 'Stainless and metal options', 'Project-specific fabrication'], ['Utility stations', 'Storage systems', 'Food-service fixtures', 'Specialty metalwork'], Wrench, ServiceType.CUSTOM, [
    { title: 'Stainless storage cabinet', image: '/landing/services/custom/01-custom-stainless-storage-cabinet.png', alt: 'Custom stainless storage cabinet' },
    { title: 'Food cart kiosk frame', image: '/landing/services/custom/02-custom-food-cart-kiosk-frame.png', alt: 'Custom food cart kiosk frame' },
    { title: 'Utility frame', image: '/landing/services/custom/03-custom-metal-partition-utility-frame.png', alt: 'Custom metal partition utility frame' },
    { title: 'Stainless work table', image: '/landing/services/custom/04-custom-stainless-work-table.png', alt: 'Custom stainless work table' },
    { title: 'Stainless Shelving & Storage Rack', image: '/landing/services/custom/05-custom-stainless-shelves-racks.png', alt: 'Custom stainless shelving and storage rack', description: 'Custom stainless shelves and commercial storage racks for kitchens, restaurants, clinics, stockrooms, warehouses, and utility rooms.', estimatedPrice: '₱8,000 – ₱60,000+' },
    { title: 'Stainless Sink & Utility Station', image: '/landing/services/custom/06-custom-stainless-sink-utility-station.png', alt: 'Custom stainless sink and utility station', description: 'A custom stainless sink station with work surfaces, backsplash, shelving, and plumbing provisions for food preparation, wash areas, laboratories, or commercial kitchens.', estimatedPrice: '₱12,000 – ₱90,000+' },
  ]),
];

const PROJECT_DESCRIPTIONS: Record<string, string> = {
  'Double swing gate': 'A double swing stainless gate for residential driveways, home entrances, and small compounds. Built with two hinged panels, sturdy side posts, vertical bars, horizontal rails, latch hardware, and clean stainless fabrication for secure daily use.',
  'Modern metal gate': 'A modern custom metal gate using a painted steel frame with stainless steel accent strips or panels. Good for residential front gates that need a clean modern look while staying practical, durable, and buildable.',
  'Commercial security gate': 'A heavy-duty commercial security gate for storefronts, warehouses, service entrances, and business properties. Built with strong vertical bars, a reinforced frame, secure posts, heavy hinges, and lock hardware for practical access control.',
  'Pedestrian gate': 'A single pedestrian stainless gate for side entrances, walkways, utility access, and home entry points. Built with a compact frame, vertical bars, hinge post, latch handle, lockset, and clean welded joints.',
  'Corner counter with open shelf': 'A space-saving corner stainless counter layout with sink, open lower shelving, and mixed storage. Good for small kitchens, food businesses, prep corners, and layouts that need practical storage without making the area feel crowded.',
  'Sink and drainer workstation': 'A stainless counter with integrated sink, drainboard, drawers, and lower storage. Best for washing, rinsing, food preparation, and kitchen areas that need clean water flow with organized storage.',
  'Island preparation table': 'A heavy-duty stainless island prep table with an open lower shelf. Ideal for food preparation, sorting, packing, baking, and commercial kitchen work areas that need a durable center workstation.',
  'Drawer base workstation': 'A premium stainless workstation counter with sink, drawers, cabinet storage, backsplash, and a wide prep surface. Good for kitchens that need both working space and organized storage.',
  'Walkway canopy': 'A long stainless or painted steel walkway canopy for building sides, entrance paths, and covered walkways. Built with evenly spaced posts, roof framing, metal or polycarbonate roofing, base plates, wall anchors, and practical rain protection.',
  'Garage carport canopy': 'A heavy-duty metal garage or carport canopy for residential driveways and parking areas. Built with steel posts, cross beams, metal roof sheets, base plates, roof slope, gutter provision, and durable outdoor fabrication.',
  'Storefront canopy': 'A metal canopy for storefronts, shop entrances, business fronts, and commercial doors. Built with wall brackets, a steel frame, support posts when needed, roof panels, wall anchors, clean welds, and practical drainage.',
  'Entrance canopy': 'A lightweight polycarbonate entrance canopy for homes, offices, and small business entrances. Built with a steel support frame, translucent roof sheets, wall brackets, proper bolts, clean seams, and weather-protective coverage.',
  'Tall storage cabinet': 'A tall freestanding stainless steel storage cabinet with double doors, internal shelving, sturdy legs, and a durable brushed finish. Best for cookware, containers, dry goods, supplies, and kitchen tools in food businesses, stockrooms, and heavy-use kitchens.',
  'Drawer and shelf cabinet': 'A custom stainless base cabinet with drawers, swing-door storage, and open shelf sections. Good for kitchens that need organized storage, quick-access shelves, and a durable stainless work surface.',
  'Overhead cabinet': 'A wall-mounted stainless kitchen cabinet with swing doors and open shelf sections. Ideal above counters, prep areas, and dishwashing zones where extra storage is needed without using floor space.',
  'Full cabinet system': 'A complete stainless kitchen cabinet system with base cabinets, drawers, overhead cabinets, backsplash, and sink-area storage. Best for restaurants, food businesses, commercial kitchens, and heavy-use home kitchens.',
  'Stainless storage cabinet': 'A fully custom fabricated stainless steel storage cabinet for kitchens, stockrooms, laundry areas, food businesses, clinics, restaurants, and utility spaces. Built to customer dimensions with heavy-duty construction, adjustable shelves, durable hinges, and a brushed finish.',
  'Food cart kiosk frame': 'Custom stainless and painted steel food carts, kiosks, mobile counters, and business carts built around the customer concept. Suitable for milk tea, coffee, street food, snack bars, and retail kiosks.',
  'Utility frame': 'Custom fabricated steel and stainless partitions, divider frames, protective barriers, utility frames, storage frames, and structural metal works for residential and commercial applications.',
  'Stainless work table': 'A heavy-duty stainless work table fabricated to the required dimensions for food preparation, restaurants, commissaries, bakeries, hospitals, laboratories, and commercial kitchens.',
  'Stainless staircase installation': 'A made-to-measure metal staircase system planned around the floor-to-floor height, available footprint, landing position, access route, and intended daily use. The frame, treads, railings, and mounting points are coordinated as one installation.',
  'Indoor stair railing': 'An indoor stainless stair railing for residential or commercial stairs, with an angled top handrail, vertical posts, horizontal bars, and clean mounting plates that follow the staircase slope.',
  'Outdoor stair railing': 'A stainless railing system for exterior concrete stairs, entrances, and outdoor steps, with angled handrails, horizontal bars, sturdy posts, and secure base plates for safe access.',
  'Commercial guardrail': 'A heavy-duty stainless guardrail for storefronts, ramps, entrances, commercial walkways, and stair edges, using strong posts, horizontal rails, rounded handrail ends, and secure base plates.',
  'Custom metal fence': 'A made-to-measure metal fence for residential or commercial boundaries. The panel layout, post spacing, height, visibility, gate connection, finish, and footing requirements are planned around the actual property line and ground condition.',
  'Decorative stainless gate': 'A stainless residential gate with a simple decorative bar pattern, balanced vertical and horizontal bars, clean welds, proper hinges, latch hardware, side posts, and a durable stainless finish.',
  'Modern mixed metal gate': 'A modern boundary design combining a painted steel frame with stainless accent strips or panels, adaptable for the required privacy, airflow, gate connection, and exterior finish.',
};

for (const serviceItem of SERVICE_CATALOG) {
  for (const project of serviceItem.projects) {
    if (PROJECT_DESCRIPTIONS[project.title]) project.description = PROJECT_DESCRIPTIONS[project.title];
  }
}

export const LEGACY_SERVICE_REDIRECTS: Record<string, string> = {
  'completed-works': 'kitchen-counter',
  'food-stall-works': 'custom',
  'gasline-fire-suppression': 'custom',
};

export function getServiceById(id: string | undefined) {
  return SERVICE_CATALOG.find((item) => item.id === id);
}

function projectSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getServiceProjectId(serviceId: string, projectTitle: string) {
  return `${serviceId}-${projectSlug(projectTitle)}`;
}

export function getServiceProjectReferences(service: ServiceCollection): ServiceProjectReference[] {
  return service.projects.map((project) => ({
    ...project,
    id: getServiceProjectId(service.id, project.title),
    serviceId: service.id,
    serviceLabel: service.label,
    serviceType: service.serviceType,
  }));
}

export function findServiceProjectReference({
  serviceId,
  serviceType,
  designId,
  designName,
  designImage,
}: {
  serviceId?: string;
  serviceType?: string;
  designId?: string;
  designName?: string;
  designImage?: string;
}) {
  const service = SERVICE_CATALOG.find((item) => (
    (serviceId && item.id === serviceId)
    || (!serviceId && serviceType && item.serviceType === serviceType)
  ));
  if (!service) return undefined;

  const normalizedDesignName = designName?.trim().toLowerCase();

  return getServiceProjectReferences(service).find((project) => (
    (designId && project.id === designId)
    || (normalizedDesignName && project.title.trim().toLowerCase() === normalizedDesignName)
    || (designImage && project.image === designImage)
  ));
}
