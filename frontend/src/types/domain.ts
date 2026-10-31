/** Shared DTO-shaped types for component props. Wire to API modules later. */

export type RequisitionStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Published'
  | 'OnHold'
  | 'Filled'
  | 'Closed'
  | 'Cancelled'

export type TeamRole =
  | 'Owner'
  | 'Recruiter'
  | 'TechnicalInterviewer'
  | 'FinalInterviewer'

export type InterviewStatus = 'Scheduled' | 'Completed' | 'NoShow'

export type TeamMember = {
  requisitionTeamMemberId: string
  employeeId: string
  employeeName: string
  teamRole: TeamRole | string
}

export type EmployeeListItem = {
  employeeId: string
  fullName: string
  email: string
  department: string
}

export type RequisitionListItem = {
  requisitionId: string
  title: string
  department: string
  status: RequisitionStatus | string
  openings: number
  budgetMin?: number | null
  budgetMax?: number | null
}

export type RequisitionDetail = {
  requisitionId: string
  title: string
  department: string
  employmentType: string
  seniority: string
  skills: string
  jobDescription: string
  openings: number
  status: RequisitionStatus | string
  statusReason?: string | null
  hiringManagerEmployeeId: string
  hiringManagerName: string
  budgetMin?: number | null
  budgetMax?: number | null
  team: TeamMember[]
}

export type CreateRequisitionRequest = {
  title: string
  department: string
  employmentType: string
  seniority: string
  skills: string
  jobDescription: string
}

export type CreateRequisitionResponse = RequisitionListItem & {
  hiringManagerEmployeeId: string
}

export type CandidateListItem = {
  candidateId: string
  fullName: string
  email: string
  phone: string
  source: string | null
  hasResume: boolean
}

export type PipelineApplication = {
  applicationId: string
  candidateId: string
  candidateName?: string
  candidateEmail?: string
  requisitionId: string
  requisitionTitle: string
  pipelineStageId: string
  stageName: string
  source?: string | null
  matchScore?: number | null
  matchLabel?: string | null
  createdAt: string
}

export type ApplicationPipelineItemDto = {
  applicationId: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  requisitionId: string
  requisitionTitle: string
  pipelineStageId: string
  stageName: string
  source: string | null
  createdAt: string
}

export type CreateApplicationRequest = {
  candidateId: string
  requisitionId: string
  source: string | null
}

export type CreateApplicationResponse = {
  applicationId: string
  candidateId: string
  requisitionId: string
  pipelineStageId: string
  source: string | null
  createdAt: string
}

export type UpdateApplicationStageRequest = {
  pipelineStageId: string
  dispositionReason: string | null
}

export type PipelineStage = {
  pipelineStageId: string
  name: string
  sortOrder: number
  color?: string
  isReserved?: boolean
  terminal?: boolean
}

export type InterviewListItem = {
  interviewId: string
  applicationId: string
  candidateName: string
  requisitionTitle: string
  scheduledAt: string
  type: string
  mode: string
  status: InterviewStatus | string
  panel: { employeeId: string; name: string; isLead: boolean }[]
}
