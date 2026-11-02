import axios from "axios";

type ApiFailure = {
  message?: string;
  title?: string;
  errors?: Record<string, string[]>;
};

export function getInterviewError(error: unknown): string {
  if (!axios.isAxiosError<ApiFailure>(error)) {
    return "An unexpected error occurred. Please try again.";
  }

  if (!error.response) {
    return "Cannot reach the backend. Check that it is running.";
  }

  if (error.response.status === 401) {
    return "Please sign in again.";
  }

  const body = error.response.data;
  const validation = Object.values(body?.errors ?? {})
    .flat()
    .join(" ");

  return (
    validation ||
    body?.message ||
    body?.title ||
    "The request could not be completed."
  );
}

export function formatInterviewTime(value: string): string {
  // Interview dates returned by this backend are stored in UTC.
  return value.slice(0, 19).replace("T", " ") + " UTC";
}
