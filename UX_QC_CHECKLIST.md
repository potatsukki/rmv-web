# UX Quality Checklist

Use this checklist before considering any page complete.

## Clarity

- Primary action is obvious within the first viewport.
- Page heading explains purpose in one sentence or less.
- Search placeholder explains what can be searched.
- Filters reflect real decision points, not backend field names.

## Trust

- No action is shown when it cannot produce a meaningful result.
- Monetary amounts are validated before rendering as payable or due.
- Status labels communicate consequence, not just raw system state.
- Empty states do not imply missing data is an error when it is expected.

## Responsiveness

- Controls stay usable on tablet and laptop widths, not only mobile and desktop extremes.
- Search inputs never clip placeholder text at common widths.
- Filter chips can scroll or wrap without crushing primary controls.
- Tables degrade gracefully into cards or reduced columns where needed.

## State Quality

- Loading states preserve the page structure and likely final layout.
- Empty states explain what belongs on the page.
- Error states provide a retry path.
- Transitional states do not visually jump or collapse surrounding layout.

## Consistency

- Search bars, filter rows, badges, tables, and empty states use shared patterns.
- Repeated actions use the same wording across pages.
- Similar statuses use the same badge styling across modules.
- Page chrome does not duplicate hierarchy already provided by the app shell.