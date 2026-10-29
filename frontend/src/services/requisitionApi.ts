import type {
    CreateRequisitionRequest,
    RequisitionDetail,
    RequisitionListItem,
} from '../types/requisition';

const API_BASE = '/api/requisitions';

async function handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 404) {
        throw new Error('Requisition not found or not in your scope.');
    }

    if (!response.ok) {
        const errorText = await response.text();
        try {
            const parsed = JSON.parse(errorText);
            throw new Error(parsed.message || parsed.error || 'An error occurred.');
        } catch {
            throw new Error(errorText || `Request failed with status ${response.status}`);
        }
    }

    return response.json();
}

export const requisitionApi = {
    // GET /api/requisitions
    async list(): Promise<RequisitionListItem[]> {
        const res = await fetch(API_BASE, { headers: { 'Content-Type': 'application/json' } });
        return handleResponse<RequisitionListItem[]>(res);
    },

    // GET /api/requisitions/{id}
    async getById(id: string): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}`);
        return handleResponse<RequisitionDetail>(res);
    },

    // POST /api/requisitions
    async create(data: CreateRequisitionRequest): Promise<RequisitionDetail> {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse<RequisitionDetail>(res);
    },

    // POST /api/requisitions/{id}/submit
    async submitForApproval(id: string): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}/submit`, { method: 'POST' });
        return handleResponse<RequisitionDetail>(res);
    },

    // POST /api/requisitions/{id}/approve
    async approve(id: string): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}/approve`, { method: 'POST' });
        return handleResponse<RequisitionDetail>(res);
    },

    // POST /api/requisitions/{id}/reject
    async reject(id: string, reason: string): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        return handleResponse<RequisitionDetail>(res);
    },

    // POST /api/requisitions/{id}/publish
    async publish(id: string): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}/publish`, { method: 'POST' });
        return handleResponse<RequisitionDetail>(res);
    },

    // Generic status changer: hold, close, cancel, fill
    async changeStatus(
        id: string,
        endpoint: 'hold' | 'close' | 'cancel' | 'fill',
        reason: string
    ): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        return handleResponse<RequisitionDetail>(res);
    },

    // PUT /api/requisitions/{id}/budget
    async updateBudget(
        id: string,
        budgetMin: number | null,
        budgetMax: number | null
    ): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}/budget`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budgetMin, budgetMax }),
        });
        return handleResponse<RequisitionDetail>(res);
    },

    // POST /api/requisitions/{id}/team-members
    async addTeamMember(
        id: string,
        employeeId: string,
        teamRole: string
    ): Promise<RequisitionDetail> {
        const res = await fetch(`${API_BASE}/${id}/team-members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, teamRole }),
        });
        return handleResponse<RequisitionDetail>(res);
    },

    // DELETE /api/requisitions/{id}/team-members/{teamMemberId}
    async removeTeamMember(id: string, teamMemberId: string): Promise<void> {
        const res = await fetch(`${API_BASE}/${id}/team-members/${teamMemberId}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Failed to remove team member.');
        }
    },
};