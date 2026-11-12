/**
 * For data that other users change (appointment, project and payment status). Cached rows still
 * render first, but the query revalidates whenever it mounts and when the window regains focus,
 * so a page left open in another window never keeps showing an old status.
 */
export const LIVE_QUERY_OPTIONS = { staleTime: 0, refetchOnWindowFocus: true } as const;
