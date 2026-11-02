import axios from 'axios'

export function managementError(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Something went wrong. Please try again.'
  if (!error.response) return 'Cannot reach the server. Check your connection and try again.'
  if (error.response.status === 401) return 'Your session has expired. Please sign in again.'
  if (error.response.status === 403) return 'You do not have permission to do this.'
  return error.response.data?.message ?? error.response.data?.title ?? 'The request could not be completed.'
}
