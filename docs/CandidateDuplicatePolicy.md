# Candidate duplicate policy

The requested policy checks email and phone only. Names are not duplicate keys.

- Neither field matches: create normally.
- Only email or phone matches: return the matching candidates and require acknowledgement.
- Both fields match the same existing candidate: block creation, including acknowledged requests.
- Email matches one person and phone matches another: show both as possible matches and require acknowledgement.

Email is trimmed and compared without case differences. Phone input is normalized using the selected country or its international prefix. Existing local/international phone spellings are included in matching.

The duplicate response includes `isDuplicate`, `isHardDuplicate`, `canCreateAnyway`, `matchesEmail`, `matchesPhone`, and `matches`. Warnings, confirmation text and save notices mention only the contact fields that actually matched. A warning returns HTTP 409 until `confirmDuplicate=true` is explicitly sent. A hard duplicate always returns 409. User messages do not display API parameter names.

The frontend shows the matching records and Use existing. Save with duplicate opens a confirmation popup; cancelling saves nothing. Editing candidate contact details clears the previous match result. A PDF is checked before starting creation. Details are created with JSON at `POST /api/candidates`, then the PDF is uploaded to `POST /api/candidates/{id}/resume`. A failed upload retries against the existing candidate ID.

Migration `20261029145522_AllowAcknowledgedCandidateDuplicates` changes individual email/phone indexes to non-unique indexes and adds a unique email/phone pair index. This intentionally replaces the earlier individual uniqueness policy. Existing rows are retained.

Add to requisition is available from both the pool and candidate profile for users with `APPLICATIONS.MANAGE`. The shared dialog lists accessible published requisitions. The backend still enforces scope, publication status, and one application per candidate/job pair.

Validation includes nine candidate-policy unit cases and live browser checks for confirmation, cancellation, old local phone formats, server-side hard blocking, JSON creation, PDF upload and profile application linking. The existing pipeline stage catalog test currently references a missing shared `TestFixture`; it was excluded when compiling the new policy tests.
