# Candidate duplicate policy

The requested policy checks email and phone only. Names are not duplicate keys.

- Neither field matches: create normally.
- Only email or phone matches: return the matching candidates and require acknowledgement.
- Both fields match the same existing candidate: block creation, including acknowledged requests.
- Email matches one person and phone matches another: show both as possible matches and require acknowledgement.

Email is trimmed and compared without case differences. Phone input is normalized using the selected country or its international prefix. Existing local/international phone spellings are included in matching.

The duplicate response includes `isDuplicate`, `isHardDuplicate`, `canCreateAnyway`, `matchesEmail`, `matchesPhone`, and `matches`. Warnings, confirmation text and save notices mention only the contact fields that actually matched. A warning returns HTTP 409 until `confirmDuplicate=true` is explicitly sent. A hard duplicate always returns 409. User messages do not display API parameter names.

The frontend shows the matching records and Use existing. Save with duplicate opens a confirmation popup; cancelling saves nothing. Editing candidate contact details clears the previous match result.

Candidate creation requires a non-empty PDF resume up to 5 MB. The frontend sends the candidate fields and the file together as `multipart/form-data` to `POST /api/candidates`, with `confirmDuplicate` in the query string. The file field is named `file`. The browser supplies the multipart boundary; clients must not force `application/json`. The controller uses `[FromForm]` for the candidate fields and accepts `IFormFile` through inferred file binding, so Swagger can describe the multipart request.

The backend validates and saves the PDF before inserting the candidate. Invalid or missing PDFs do not create candidate rows. If saving the database record fails, the newly saved file is deleted. `POST /api/candidates/{id}/resume` remains available to replace an existing candidate's resume; it is not a second registration step. JSON-only creation is no longer accepted.

Migration `20261029145522_AllowAcknowledgedCandidateDuplicates` changes individual email/phone indexes to non-unique indexes and adds a unique email/phone pair index. This intentionally replaces the earlier individual uniqueness policy. Existing rows are retained.

Add to requisition is available from both the pool and candidate profile for users with `APPLICATIONS.MANAGE`. The shared dialog lists accessible published requisitions. The backend still enforces scope, publication status, and one application per candidate/job pair.

Validation includes 28 candidate/PDF-storage unit cases and live API/browser checks for required PDFs, invalid and oversized files, the exact 5 MB boundary, multipart creation, Swagger generation, duplicate confirmation, all five legacy phone spellings and the hiring-manager Add to requisition flow. Download checks cover JSON error blobs, HTML, empty responses and invalid PDF headers. A delayed-response check confirms old search requests are cancelled.

The complete backend test project currently has an unrelated compilation error in `RequisitionStatusTests.cs`: it uses an outdated `HiringManagerEmployeeId` request parameter. That file was excluded from compilation for the targeted candidate/storage test run. Requisition production code was not changed.
