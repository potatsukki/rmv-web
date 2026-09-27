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
