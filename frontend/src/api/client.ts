import axios from 'axios'
import type {
  ApplicationPipelineItemDto,
  CandidateListItem,
  CreateRequisitionRequest,
  CreateRequisitionResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  EmployeeListItem,
  PipelineStage,
  RequisitionDetail,
  RequisitionListItem,
  UpdateApplicationStageRequest,
} from '../types/domain'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

/** FormData must keep multipart boundary — never force application/json. */
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    const headers = config.headers
    if (headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type')
    } else if (headers) {
      delete (headers as Record<string, unknown>)['Content-Type']
    }
  }
  return config
})

export type UserDto = {
  id: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
}

export const Permissions = {
  RequisitionsViewAll: 'REQUISITIONS.ALL_REQS.VIEW',
  RequisitionsManage: 'REQUISITIONS.MANAGE',
  RequisitionsApprove: 'REQUISITIONS.APPROVE',
  CompensationView: 'ATS.COMPENSATION.VIEW',
  CompensationEdit: 'ATS.COMPENSATION.EDIT',
  PoolView: 'POOL.VIEW',
  CandidatesManage: 'CANDIDATES.MANAGE',
  ApplicationsManage: 'APPLICATIONS.MANAGE',
  InterviewsSchedule: 'INTERVIEWS.SCHEDULE',
  InterviewsFeedbackAdd: 'INTERVIEWS.FEEDBACK.ADD',
  StagesManage: 'STAGES.MANAGE',
  UsersManage: 'USERS.MANAGE',
} as const

export function hasPermission(user: UserDto | null | undefined, permission: string) {
  return !!user?.permissions.includes(permission)
}

export async function getHealth() {
  const { data } = await api.get<{ status: string; service: string }>('/health')
  return data
}

export async function login(email: string, password: string) {
  const { data } = await api.post<UserDto>('/auth/login', { email, password })
  return data
}

export async function register(email: string, password: string, fullName: string) {
  const { data } = await api.post<UserDto>('/auth/register', {
    email,
    password,
    fullName,
  })
  return data
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function getMe() {
  const { data } = await api.get<UserDto>('/auth/me')
  return data
}

export async function searchCandidates(query: string) {
  const { data } = await api.get<CandidateListItem[]>('/candidates', {
    params: { q: query },
  })
  return data
}

export async function searchApplicationCandidates(query: string) {
  const { data } = await api.get<CandidateListItem[]>('/applications/candidates', {
    params: { q: query },
  })
  return data
}

export async function getRequisitions() {
  const { data } = await api.get<RequisitionListItem[]>('/requisitions')
  return data
}

export async function getEmployees() {
  const { data } = await api.get<EmployeeListItem[]>('/employees')
  return data
}

export async function getRequisition(requisitionId: string) {
  const { data } = await api.get<RequisitionDetail>(`/requisitions/${requisitionId}`)
  return data
}

export async function submitRequisition(requisitionId: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/submit`)
  return data
}

export async function approveRequisition(requisitionId: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/approve`)
  return data
}

export async function rejectRequisition(requisitionId: string, reason: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/reject`, {
    reason,
  })
  return data
}

export async function publishRequisition(requisitionId: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/publish`)
  return data
}

export async function holdRequisition(requisitionId: string, reason: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/hold`, {
    reason,
  })
  return data
}

export async function closeRequisition(requisitionId: string, reason: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/close`, {
    reason,
  })
  return data
}

export async function cancelRequisition(requisitionId: string, reason: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/cancel`, {
    reason,
  })
  return data
}

export async function fillRequisition(requisitionId: string, reason: string) {
  const { data } = await api.post<RequisitionDetail>(`/requisitions/${requisitionId}/fill`, {
    reason,
  })
  return data
}

export async function updateRequisitionBudget(
  requisitionId: string,
  budgetMin: number | null,
  budgetMax: number | null,
) {
  const { data } = await api.put<RequisitionDetail>(
    `/requisitions/${requisitionId}/budget`,
    { budgetMin, budgetMax },
  )
  return data
}

export async function addRequisitionTeamMember(
  requisitionId: string,
  employeeId: string,
  teamRole: 'Recruiter' | 'TechnicalInterviewer' | 'FinalInterviewer',
) {
  const { data } = await api.post<RequisitionDetail>(
    `/requisitions/${requisitionId}/team-members`,
    { employeeId, teamRole },
  )
  return data
}

export async function removeRequisitionTeamMember(
  requisitionId: string,
  requisitionTeamMemberId: string,
) {
  const { data } = await api.delete<{ message: string }>(
    `/requisitions/${requisitionId}/team-members/${requisitionTeamMemberId}`,
  )
  return data
}

export async function createRequisition(request: CreateRequisitionRequest) {
  const { data } = await api.post<CreateRequisitionResponse>('/requisitions', request)
  return data
}

export async function getPipeline() {
  const { data } = await api.get<ApplicationPipelineItemDto[]>('/applications/pipeline')
  return data
}

export async function getPipelineStages() {
  const { data } = await api.get<PipelineStage[]>('/applications/stages')
  return data
}

export async function createApplication(request: CreateApplicationRequest) {
  const { data } = await api.post<CreateApplicationResponse>('/applications', request)
  return data
}

export async function updateApplicationStage(
  applicationId: string,
  request: UpdateApplicationStageRequest,
) {
  await api.patch<void>(`/applications/${applicationId}/stage`, request)
}
