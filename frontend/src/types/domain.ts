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

export type RequisitionListItem = {
  requisitionId: string
  title: string
  department: string
  status: RequisitionStatus | string
  openings: number
  budgetMin?: number | null
  budgetMax?: number | null
}

export type CandidateListItem = {
  candidateId: string
  fullName: string
  email: string
  phone: string
  source?: string | null
  hasResume: boolean
}

export type PipelineApplication = {
  applicationId: string
  candidateId: string
  candidateName?: string
  requisitionId: string
  requisitionTitle: string
  pipelineStageId: string
  stageName: string
  source?: string | null
  matchScore?: number | null
  matchLabel?: string | null
  createdAt: string
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
