export async function submitLatestBlueprintDraft<T>(
  pendingSaves: Iterable<Promise<unknown>>,
  saveLatest: () => Promise<unknown>,
  finalize: () => Promise<T>,
): Promise<T> {
  // Older autosaves must finish before the final snapshot is written.
  await Promise.allSettled([...pendingSaves]);
  await saveLatest();
  return finalize();
}
