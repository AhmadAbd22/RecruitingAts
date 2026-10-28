# Talent Pool Module - API Responses

This document describes the responses returned by the Candidates / Talent Pool API. Example names, IDs, dates and trace IDs are illustrative.

## 1. Search candidates

`GET /api/candidates`

### 200 OK

Returns an array of up to 100 candidates, ordered by full name.

```json
[
  {
    "candidateId": "8a4d2a67-6e45-4af0-8466-5c0242753b08",
    "fullName": "Example Candidate",
    "email": "candidate@example.com",
    "phone": "+923123456789",
    "source": "Referral",
    "hasResume": true
  }
]
```

`source` contains the candidate's recorded source, such as `Referral`, `LinkedIn` or `Agency`. It can be `null` for older records created before source was required. New candidates must have a source. `hasResume` indicates whether a resume path is set on the candidate record.

Search results do not include `consentDate`; that field is returned in candidate details.

When no candidates match, the response is:

```json
[]
```

## 2. Get candidate details

`GET /api/candidates/{id}`

### 200 OK

Returns a candidate detail object:

```json
{
  "candidateId": "8a4d2a67-6e45-4af0-8466-5c0242753b08",
  "fullName": "Example Candidate",
  "email": "candidate@example.com",
  "phone": "+923123456789",
  "skills": ".NET, SQL Server",
  "source": "Referral",
  "consentDate": "2026-10-27T09:00:00",
  "hasResume": true,
  "createdAt": "2026-10-27T09:00:00"
}
```

`source` contains the saved source with leading and trailing spaces removed for newly created candidates. Older records can still return `null`.

`consentDate` contains the consent date supplied when the candidate was created. It is returned as a date/time string, as shown above, or `null` if no date was supplied. The API does not automatically set this field to the creation date.

`skills` can also be `null`. `createdAt` is returned as a date/time string.

### 404 Not Found

Returned when the candidate does not exist. This action uses ASP.NET Core's standard `ProblemDetails` error response, rather than the module's custom `message` response.

## 3. Check duplicates

`GET /api/candidates/duplicates`

### 200 OK - matches found

```json
{
  "isDuplicate": true,
  "matches": [
    {
      "candidateId": "8a4d2a67-6e45-4af0-8466-5c0242753b08",
      "fullName": "Example Candidate",
      "email": "candidate@example.com",
      "phone": "+923123456789",
      "source": "Referral",
      "hasResume": true
    }
  ]
}
```

Each item in `matches` has the same fields as a search result. Multiple matching candidates can be returned.

### 200 OK - no matches

```json
{
  "isDuplicate": false,
  "matches": []
}
```

### 400 Bad Request - no email or phone

```json
{
  "message": "Provide an email address or phone number."
}
```

### 400 Bad Request - invalid phone

```json
{
  "message": "Enter a valid phone number. Select a valid country for a local number, or include an international code starting with + or 00."
}
```

## 4. Create a candidate

`POST /api/candidates`

### 201 Created

Returns the candidate detail object shown in section 2. The returned `phone` is normalized to international E.164 format, and `hasResume` is `true` after successful creation. The `Location` response header points to the candidate details endpoint.

The returned `source` is the saved, trimmed value. For example, a source of `" Referral "` is returned as `"Referral"`. The returned `consentDate` is the supplied date, or `null` when it was omitted.

### 400 Bad Request - source or consent date validation

Creating a candidate without a source, with a blank source, or with a source longer than 100 characters returns a field-validation response. For example, a missing source produces:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Source": [
      "Candidate source is required."
    ]
  },
  "traceId": "example-request-trace-id"
}
```

An invalid consent date, such as text that cannot be read as a date, also returns a field-validation response. The `errors` object identifies the affected field; its exact message depends on the invalid value. Omitting the consent date is allowed and does not cause a validation error.

### 409 Conflict - duplicate candidate

```json
{
  "message": "A candidate with this email or phone already exists. Use the existing record.",
  "duplicate": {
    "isDuplicate": true,
    "matches": [
      {
        "candidateId": "8a4d2a67-6e45-4af0-8466-5c0242753b08",
        "fullName": "Example Candidate",
        "email": "candidate@example.com",
        "phone": "+923123456789",
        "source": "Referral",
        "hasResume": true
      }
    ]
  }
}
```

### 400 Bad Request - file or phone error

These errors return an object containing `message`, for example:

```json
{
  "message": "A PDF resume is required."
}
```

Possible `message` values are:

- `A PDF resume is required.`
- `PDF must be 5 MB or smaller.`
- `Only PDF files are allowed.`
- `The file does not have a PDF header.`
- `Enter a valid phone number. Select a valid country for a local number, or include an international code starting with + or 00.`

Field validation errors use the validation response described in section 7.

## 5. Upload or replace a resume

`POST /api/candidates/{id}/resume`

### 200 OK

Returns the candidate detail object shown in section 2, with `hasResume` set to `true`.

### 400 Bad Request

```json
{
  "message": "Please select a non-empty PDF file."
}
```

Possible `message` values are:

- `Please select a non-empty PDF file.`
- `Candidate not found.`
- `PDF must be 5 MB or smaller.`
- `Only PDF files are allowed.`
- `The file does not have a PDF header.`

A missing candidate currently returns **400** from this upload action.

## 6. Download a resume

`GET /api/candidates/{id}/resume`

### 200 OK

Returns the PDF file bytes, rather than JSON.

- Content type: `application/pdf`.
- Download filename: the candidate's full name followed by `.pdf`, for example `Example Candidate.pdf`.

### 404 Not Found

```json
{
  "message": "Candidate not found."
}
```

Possible `message` values are:

- `Candidate not found.`
- `No résumé uploaded.`
- `Résumé file missing on disk.`

## 7. Shared error responses

### 400 Bad Request - field validation

ASP.NET Core returns a validation problem response when a request field fails validation. For example:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "PhoneCountry": [
      "PhoneCountry must be a two-letter country code."
    ]
  },
  "traceId": "example-request-trace-id"
}
```

The `errors` object contains the affected field names and arrays of error messages. The actual fields, messages and trace ID depend on the request.

### 401 Unauthorized

Returned when the caller is not logged in. The configured authentication handler sets the status code without a custom JSON body.

### 403 Forbidden

Returned when the caller lacks the required permission. The configured authentication handler sets the status code without a custom JSON body.

### 415 Unsupported Media Type

The create and resume-upload actions can return this status when the request content type is unsupported. ASP.NET Core supplies the standard error response.

### 500 Internal Server Error

For an unexpected candidate API error caught before the response has started, the middleware returns:

```json
{
  "message": "An unexpected error occurred.",
  "traceId": "example-request-trace-id"
}
```
