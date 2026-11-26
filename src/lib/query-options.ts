/**
 * For data that other users change (appointment, project and payment status). Cached rows still
 * render first, but the query revalidates whenever it mounts and when the window regains focus,
 * so a page left open in another window never keeps showing an old status.
 */
export const LIVE_QUERY_OPTIONS = { staleTime: 0, refetchOnWindowFocus: true } as const;

/** How often an open list re-checks the server while its tab is visible. */
export const LIVE_LIST_REFETCH_MS = 30_000;

/** A refetch interval that only runs while the tab is visible. */
export function whileTabVisible(ms: number) {
  return () => (typeof document === 'undefined' || document.visibilityState === 'visible' ? ms : false);
}

/**
 * For list pages people keep open (Appointments, Projects): also polls every 30 s while the tab
 * is visible, so changes made by other users show up even when no notification reaches this tab.
 */
export const LIVE_LIST_POLL_OPTIONS = {
  ...LIVE_QUERY_OPTIONS,
  refetchInterval: whileTabVisible(LIVE_LIST_REFETCH_MS),
} as const;
