import { describe, expect, it, vi } from 'vitest';
import { submitLatestBlueprintDraft } from './blueprint-draft-submission';

describe('blueprint draft submission', () => {
  it('saves the entered 3000 before finalizing even before autosave starts', async () => {
    let storedAmount = 0;
    const result = await submitLatestBlueprintDraft(
      [],
      async () => { storedAmount = 3000; },
      async () => storedAmount,
    );
    expect(result).toBe(3000);
  });

  it('waits for a slow stale autosave before saving the latest costing', async () => {
    let finishAutosave!: () => void;
    let storedAmount = 0;
    const staleSave = new Promise<void>((resolve) => { finishAutosave = resolve; })
      .then(() => { storedAmount = 1; });
    const saveLatest = vi.fn(async () => { storedAmount = 3000; });
    const finalize = vi.fn(async () => storedAmount);
    const submission = submitLatestBlueprintDraft([staleSave], saveLatest, finalize);

    await Promise.resolve();
    expect(saveLatest).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
    finishAutosave();
    expect(await submission).toBe(3000);
  });

  it('does not finalize when saving the latest amount fails', async () => {
    const finalize = vi.fn(async () => 1);
    await expect(submitLatestBlueprintDraft(
      [],
      async () => { throw new Error('Save failed'); },
      finalize,
    )).rejects.toThrow('Save failed');
    expect(finalize).not.toHaveBeenCalled();
  });

  it('retries the latest snapshot after an older autosave fails', async () => {
    let storedAmount = 0;
    const result = await submitLatestBlueprintDraft(
      [Promise.reject(new Error('Old autosave failed'))],
      async () => { storedAmount = 3000; },
      async () => storedAmount,
    );
    expect(result).toBe(3000);
  });
});
