No‑Ocular submission fixes

Summary
- Ensure consultation reports that proceed without an ocular ("no_ocular") include project description fields required by the backend.
- Sync description fields to sibling consultation reports when saving the draft so server-side validation won't block submission.
- Fix ocular report validation to ignore empty line-item rows so a valid on-site visit can proceed even when the editor contains placeholder/blank rows.

Files changed
- src/pages/visit-reports/VisitReportPage.tsx
  - Ensure `discussionNotes` falls back to `initialDesignNotes` when saving consultation drafts.
  - Ensure `customerRequirements` and `notes` fall back to `discussionNotes` or `initialDesignNotes` when saving.
  - When saving sibling consultation reports, also propagate `discussionNotes`, `customerRequirements`, and `notes` so sibling drafts are not missing description fields.

Why
- The backend requires a project description or requirement notes before allowing creation of a project when `consultationOutcome === 'no_ocular'`.
- Previously some fields were only kept in the UI (or in different fields), and were not always included in the `PUT /visit-reports/:id` payload — causing a validation error: "Proceeding without ocular requires complete project details. Missing: project description or requirement notes.".

How to test
1. Open a consultation visit report marked to proceed without ocular.
2. Fill or confirm at least one of: Discussion Notes or Initial Design Notes, measurements, and attachments (photos or reference images).
3. Click **Save Draft** — confirm success toast.
4. Click **Create Project** — should no longer show the backend validation error and should proceed to the project page or show a success toast.

Notes
- This is a small defensive frontend fix to ensure existing UI data is sent to the server before submit. Server-side validation remains unchanged.
- If you want stronger guarantees, we can also include `photoKeys` / `referenceImageKeys` into sibling sync (currently only description fields and schedule info are synced).

Patch file
- See `rmv-no-ocular-fallback.patch` in repository root.