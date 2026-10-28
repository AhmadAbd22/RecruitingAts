import axios, { HttpStatusCode } from "axios";

import { getCountries, getCountryCallingCode } from "react-phone-number-input";

import countryNames from "react-phone-number-input/locale/en";

import type { CandidateListItem } from "../../types/domain";

export type CandidateDetail = CandidateListItem & {
  skills: string | null;
  consentDate: string | null;
  createdAt: string;
};

export type DuplicateResult = {
  isDuplicate: boolean;
  matches: CandidateListItem[];
};

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

  if (error.response.status === HttpStatusCode.Unauthorized) {
    return "Your session has expired. Please sign in again.";
  }

  if (error.response.status === HttpStatusCode.Forbidden) {
    return "You do not have permission to perform this action.";
  }

  if (error.response.status === HttpStatusCode.NotFound) {
    return "The requested candidate or resume was not found.";
  }

  const body = error.response.data;

  const validationMessages = Object.values(body?.errors ?? {})
    .flat()
    .join(" ");

  return (
    validationMessages ||
    body?.message ||
    body?.title ||
    "The request could not be completed."
  );
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
