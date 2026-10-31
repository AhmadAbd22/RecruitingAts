const BASE_URL = '/api/Requisitions';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unexpected error occurred.' }));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
    }
    return response.json();
};

export interface CreateRequisitionRequest {
    title: string;
    department?: string;
    location?: string;
    headcount?: number;
    [key: string]: any;
}

export interface StatusReasonRequest {
    reason: string;
}

export interface UpdateBudgetRequest {
    budgetMin?: number;
    budgetMax?: number;
}

export interface AddTeamMemberRequest {
    employeeId: string; // Guid string format
    teamRole: string;
}

export const requisitionsService = {
    // GET: api/Requisitions
    async getAll() {
        const response = await fetch(BASE_URL, { headers: getHeaders() });
        return handleResponse(response);
    },

    // GET: api/Requisitions/{id}
    async getById(id: string) {
        const response = await fetch(`${BASE_URL}/${id}`, { headers: getHeaders() });
        return handleResponse(response);
    },

    // POST: api/Requisitions
    async create(data: CreateRequisitionRequest) {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/submit
    async submitForApproval(id: string) {
        const response = await fetch(`${BASE_URL}/${id}/submit`, {
            method: 'POST',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/approve
    async approve(id: string) {
        const response = await fetch(`${BASE_URL}/${id}/approve`, {
            method: 'POST',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/reject
    async reject(id: string, reason: string) {
        const response = await fetch(`${BASE_URL}/${id}/reject`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ reason }),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/publish
    async publish(id: string) {
        const response = await fetch(`${BASE_URL}/${id}/publish`, {
            method: 'POST',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/hold
    async hold(id: string, reason: string) {
        const response = await fetch(`${BASE_URL}/${id}/hold`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ reason }),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/close
    async close(id: string, reason: string) {
        const response = await fetch(`${BASE_URL}/${id}/close`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ reason }),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/cancel
    async cancel(id: string, reason: string) {
        const response = await fetch(`${BASE_URL}/${id}/cancel`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ reason }),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/fill
    async fill(id: string, reason?: string) {
        const response = await fetch(`${BASE_URL}/${id}/fill`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ reason: reason || 'Position successfully filled.' }),
        });
        return handleResponse(response);
    },

    // PUT: api/Requisitions/{id}/budget
    async updateBudget(id: string, budgetData: UpdateBudgetRequest) {
        const response = await fetch(`${BASE_URL}/${id}/budget`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(budgetData),
        });
        return handleResponse(response);
    },

    // POST: api/Requisitions/{id}/team-members
    async addTeamMember(id: string, memberData: AddTeamMemberRequest) {
        const response = await fetch(`${BASE_URL}/${id}/team-members`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(memberData),
        });
        return handleResponse(response);
    },

    // DELETE: api/Requisitions/{id}/team-members/{teamMemberId}
    async removeTeamMember(id: string, teamMemberId: string) {
        const response = await fetch(`${BASE_URL}/${id}/team-members/${teamMemberId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },
};