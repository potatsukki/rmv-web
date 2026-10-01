import { describe, expect, it } from 'vitest';

import { QUOTATION_COPY } from './quotation-copy';

describe('QUOTATION_COPY', () => {
  it('uses direct wording for the quote timing fields', () => {
    expect(QUOTATION_COPY).toEqual({
      detailsHeading: 'Quote Details',
      validityLabel: 'Quote Valid For',
      estimatedTimeLabel: 'Estimated Completion Time',
    });
  });
});
