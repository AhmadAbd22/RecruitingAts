import axios, { HttpStatusCode } from "axios";
import type { AxiosResponse } from "axios";

import { getCountries, getCountryCallingCode, parsePhoneNumber } from "react-phone-number-input";

import countryNames from "react-phone-number-input/locale/en";

import type { CandidateListItem } from "../../types/domain";

export type CandidateDetail = CandidateListItem & {
  skills: string | null;
  consentDate: string | null;
  createdAt: string;
};

export type DuplicateResult = {
  isDuplicate: boolean;
  isHardDuplicate: boolean;
  canCreateAnyway: boolean;
  matchesEmail: boolean;
  matchesPhone: boolean;
  matches: CandidateListItem[];
};

export function getMatchedContactFields(result: DuplicateResult): string {
  if (result.matchesEmail && result.matchesPhone) {
    return "email address and phone number";
  }
  if (result.matchesEmail) return "email address";
  if (result.matchesPhone) return "phone number";
  return "contact information";
}

export function getDuplicateMessage(result: DuplicateResult): string {
  if (result.isHardDuplicate) {
    return "This email address and phone number already belong to an existing candidate.";
  }
  if (result.matchesEmail && result.matchesPhone) {
    return "This email address and phone number are already used by existing candidates.";
  }
  return `This ${getMatchedContactFields(result)} is already used by another candidate.`;
}

export type ApiFailure = {
  message?: string;
  title?: string;
  errors?: Record<string, string[]>;
  duplicate?: DuplicateResult;
};

const MAX_RESUME_MB = 5;
const MAX_RESUME_BYTES = MAX_RESUME_MB * 1024 * 1024;

export function getApiError(error: unknown): string {
  if (!axios.isAxiosError<ApiFailure>(error)) {
    return "An unexpected error occurred. Please try again.";
  }

  if (!error.response) {
    return "Unable to contact the server. Please try again.";
  }

  return getResponseError(error.response.status, error.response.data);
}

function getResponseError(status: number, body?: ApiFailure, fallback = "The request could not be completed."): string {
  if (status === HttpStatusCode.Unauthorized) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === HttpStatusCode.Forbidden) {
    return "You do not have permission to perform this action.";
  }

  if (status === HttpStatusCode.NotFound) {
    return body?.message || "The requested candidate or resume was not found.";
  }

  const validationMessages = Object.values(body?.errors ?? {})
    .flat()
    .join(" ");

  return (
    validationMessages ||
    body?.message ||
    body?.title ||
    fallback
  );
}

export async function getResumeDownloadError(response: AxiosResponse<Blob>): Promise<string | null> {
  const contentType = String(response.headers["content-type"] ?? "")
    .split(";")[0].trim().toLowerCase();
  const file = response.data;

  if (response.status === HttpStatusCode.Ok && contentType === "application/pdf"
      && file.size > 0 && await file.slice(0, 5).text() === "%PDF-") {
    return null;
  }

  let body: ApiFailure | undefined;
  try {
    body = JSON.parse(await file.text()) as ApiFailure;
  } catch {
    // HTML, empty responses and invalid files are not downloadable PDFs.
  }
  return getResponseError(response.status, body, "The server did not return a valid PDF. Please try again.");
}

export function normalizeCandidatePhone(phone: string, countryCode: string): string | null {
  const country = phoneCountries.find((item) => item.code === countryCode);
  const number = parsePhoneNumber(phone.trim().replace(/^00/, "+"), country?.code);
  return number?.isValid() ? number.number : null;
}

export function getResumeError(file: File): string {
  if (file.size === 0) {
    return "Please select a non-empty PDF.";
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are allowed.";
  }

  if (file.size > MAX_RESUME_BYTES) {
    return `The PDF must be ${MAX_RESUME_MB} MB or smaller.`;
  }

  return "";
}

export const phoneCountries = getCountries()
  .map((code) => ({
    code,
    name: countryNames[code] ?? code,
    callingCode: getCountryCallingCode(code),
  }))
  .sort((first, second) => first.name.localeCompare(second.name));
