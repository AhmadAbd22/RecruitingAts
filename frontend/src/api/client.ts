import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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
