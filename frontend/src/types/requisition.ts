// Permission claim strings matching Permissions.cs
export const Permissions = {
    RequisitionsViewAll: 'REQUISITIONS.ALL_REQS.VIEW',
    RequisitionsManage: 'REQUISITIONS.MANAGE',
    RequisitionsApprove: 'REQUISITIONS.APPROVE',
    CompensationView: 'ATS.COMPENSATION.VIEW',
    CompensationEdit: 'ATS.COMPENSATION.EDIT',
};

// Requisition Status constants matching backend state machine
export const RequisitionStatuses = {
    Draft: 'Draft',
    PendingApproval: 'PendingApproval',
    Approved: 'Approved',
    Published: 'Published',
    OnHold: 'OnHold',
    Filled: 'Filled',
    Closed: 'Closed',
    Cancelled: 'Cancelled',
};

export interface RequisitionListItem {
    requisitionId: string;
    title: string;
    department: string;
    status: string;
    openings: number;
    budgetMin?: number | null;
    budgetMax?: number | null;
}

export interface TeamMemberDto {
    requisitionTeamMemberId: string;
    employeeId: string;
    employeeName: string;
    teamRole: string;
}

export interface RequisitionDetail {
    requisitionId: string;
    title: string;
    department: string;
    employmentType: string;
    seniority: string;
    skills: string;
    jobDescription: string;
    openings: number;
    status: string;
    statusReason?: string | null;
    hiringManagerEmployeeId: string;
    hiringManagerName: string;
    budgetMin?: number | null;
    budgetMax?: number | null;
    team: TeamMemberDto[];
}

export interface CreateRequisitionRequest {
    title: string;
    department: string;
    employmentType: string;
    seniority: string;
    skills: string;
    jobDescription: string;
    openings: number;
    hiringManagerEmployeeId: string;
}