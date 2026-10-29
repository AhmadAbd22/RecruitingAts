import { useEffect, useState } from 'react';
import { requisitionApi } from '../../services/requisitionApi';
import type { RequisitionDetail as IRequisitionDetail } from '../../types/requisition';
import { Permissions, RequisitionStatuses } from '../../types/requisition';

export interface RequisitionDetailProps {
    requisitionId: string;
    userPermissions: string[];
    onBack: () => void;
}

export function RequisitionDetailView({
    requisitionId,
    userPermissions,
    onBack,
}: RequisitionDetailProps) {
    const [detail, setDetail] = useState < IRequisitionDetail | null > (null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < string | null > (null);
    const [reasonInput, setReasonInput] = useState('');
    const [modalAction, setModalAction] = useState < 'reject' | 'hold' | 'close' | 'cancel' | null > (null);

    // Claim-based permission checks matching Permissions.cs
    const canApprove = userPermissions.includes(Permissions.RequisitionsApprove);
    const canManage = userPermissions.includes(Permissions.RequisitionsManage);
    const canEditBudget = userPermissions.includes(Permissions.CompensationEdit);
    const canViewBudget = userPermissions.includes(Permissions.CompensationView);

    // Budget state
    const [editingBudget, setEditingBudget] = useState(false);
    const [minBudget, setMinBudget] = useState < number | '' > ('');
    const [maxBudget, setMaxBudget] = useState < number | '' > ('');

    // Team Member state
    const [newEmployeeId, setNewEmployeeId] = useState('');
    const [newTeamRole, setNewTeamRole] = useState('Recruiter');

    useEffect(() => {
        loadDetail();
    }, [requisitionId]);

    const loadDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await requisitionApi.getById(requisitionId);
            setDetail(data);
            setMinBudget(data.budgetMin ?? '');
            setMaxBudget(data.budgetMax ?? '');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error loading details.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionFn: () => Promise<IRequisitionDetail>) => {
        try {
            setError(null);
            const updated = await actionFn();
            setDetail(updated);
            setModalAction(null);
            setReasonInput('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Action failed.';
            setError(message);
        }
    };

    const handleReasonSubmit = () => {
        if (!reasonInput.trim()) {
            setError('Reason is required.');
            return;
        }
        if (modalAction === 'reject') {
            handleAction(() => requisitionApi.reject(requisitionId, reasonInput));
        } else if (modalAction) {
            handleAction(() => requisitionApi.changeStatus(requisitionId, modalAction, reasonInput));
        }
    };

    const handleSaveBudget = async () => {
        handleAction(() =>
            requisitionApi.updateBudget(
                requisitionId,
                minBudget === '' ? null : Number(minBudget),
                maxBudget === '' ? null : Number(maxBudget)
            )
        );
        setEditingBudget(false);
    };

    const handleAddTeamMember = async () => {
        if (!newEmployeeId) return;
        handleAction(() => requisitionApi.addTeamMember(requisitionId, newEmployeeId, newTeamRole));
        setNewEmployeeId('');
    };

    const handleRemoveTeamMember = async (memberId: string) => {
        try {
            setError(null);
            await requisitionApi.removeTeamMember(requisitionId, memberId);
            loadDetail();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to remove team member.';
            setError(message);
        }
    };

    if (loading) return <div>Loading details...</div>;
    if (error && !detail) {
        return (
            <div style={{ padding: '20px' }}>
                <button onClick={onBack}>&larr; Back</button>
                <div style={{ color: 'red', marginTop: '20px' }}>{error}</div>
            </div>
        );
    }
    if (!detail) return null;

    const { status } = detail;

    return (
        <div style={{ padding: '20px', maxWidth: '900px' }}>
            <button onClick={onBack}>&larr; Back to List</button>

            <h2>{detail.title}</h2>
            <p><strong>Status:</strong> {detail.status}</p>
            {detail.statusReason && (
                <p style={{ color: '#d9534f' }}><strong>Reason:</strong> {detail.statusReason}</p>
            )}

            {error && (
                <div style={{ color: 'red', padding: '10px', background: '#ffe6e6', marginBottom: '15px' }}>
                    {error}
                </div>
            )}

            {/* --- WORKFLOW ACTION BAR --- */}
            <div style={{ display: 'flex', gap: '10px', margin: '20px 0', padding: '15px', background: '#f5f5f5' }}>
                {status === RequisitionStatuses.Draft && canManage && (
                    <button onClick={() => handleAction(() => requisitionApi.submitForApproval(requisitionId))}>
                        Submit for Approval
                    </button>
                )}

                {status === RequisitionStatuses.PendingApproval && canApprove && (
                    <>
                        <button onClick={() => handleAction(() => requisitionApi.approve(requisitionId))}>Approve</button>
                        <button onClick={() => setModalAction('reject')}>Reject</button>
                    </>
                )}

                {status === RequisitionStatuses.Approved && canManage && (
                    <button onClick={() => handleAction(() => requisitionApi.publish(requisitionId))}>Publish</button>
                )}

                {(status === RequisitionStatuses.Published || status === RequisitionStatuses.OnHold) && canManage && (
                    <>
                        <button onClick={() => handleAction(() => requisitionApi.changeStatus(requisitionId, 'fill', 'Position filled.'))}>
                            Mark as Filled
                        </button>
                        <button onClick={() => setModalAction('hold')}>Put On Hold</button>
                        <button onClick={() => setModalAction('close')}>Close</button>
                        <button onClick={() => setModalAction('cancel')}>Cancel</button>
                    </>
                )}
            </div>

            {/* --- STATUS REASON FORM --- */}
            {modalAction && (
                <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', background: '#fff' }}>
                    <h4>Provide Reason for Action ({modalAction})</h4>
                    <input
                        type="text"
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        placeholder="Enter reason..."
                        style={{ width: '80%', padding: '8px' }}
                    />
                    <div style={{ marginTop: '10px' }}>
                        <button onClick={handleReasonSubmit}>Confirm</button>
                        <button onClick={() => setModalAction(null)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* --- DETAILS & BUDGET --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <h3>Overview</h3>
                    <p><strong>Department:</strong> {detail.department}</p>
                    <p><strong>Employment Type:</strong> {detail.employmentType}</p>
                    <p><strong>Seniority:</strong> {detail.seniority}</p>
                    <p><strong>Openings:</strong> {detail.openings}</p>
                    <p><strong>Hiring Manager:</strong> {detail.hiringManagerName}</p>
                </div>

                <div>
                    <h3>Budget</h3>
                    {canViewBudget ? (
                        <div>
                            <p>Min: {detail.budgetMin != null ? `$${detail.budgetMin}` : 'Not set'}</p>
                            <p>Max: {detail.budgetMax != null ? `$${detail.budgetMax}` : 'Not set'}</p>
                            {canEditBudget && !editingBudget && (
                                <button onClick={() => setEditingBudget(true)}>Edit Budget</button>
                            )}
                            {editingBudget && (
                                <div style={{ marginTop: '10px' }}>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={minBudget}
                                        onChange={(e) => setMinBudget(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={maxBudget}
                                        onChange={(e) => setMaxBudget(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                    <button onClick={handleSaveBudget}>Save</button>
                                    <button onClick={() => setEditingBudget(false)}>Cancel</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p><em>You do not have permission to view budget information.</em></p>
                    )}
                </div>
            </div>

            {/* --- TEAM MEMBERS --- */}
            <div style={{ marginTop: '30px' }}>
                <h3>Team Members</h3>
                <ul>
                    {detail.team.map((m) => (
                        <li key={m.requisitionTeamMemberId} style={{ marginBottom: '5px' }}>
                            {m.employeeName} - <strong>{m.teamRole}</strong>
                            {m.teamRole !== 'Owner' && canManage && (
                                <button
                                    onClick={() => handleRemoveTeamMember(m.requisitionTeamMemberId)}
                                    style={{ marginLeft: '10px', color: 'red' }}
                                >
                                    Remove
                                </button>
                            )}
                        </li>
                    ))}
                </ul>

                {canManage && (
                    <div style={{ marginTop: '15px' }}>
                        <h4>Add Team Member</h4>
                        <input
                            type="text"
                            placeholder="Employee GUID"
                            value={newEmployeeId}
                            onChange={(e) => setNewEmployeeId(e.target.value)}
                        />
                        <select value={newTeamRole} onChange={(e) => setNewTeamRole(e.target.value)}>
                            <option value="Recruiter">Recruiter</option>
                            <option value="Interviewer">Interviewer</option>
                            <option value="Collaborator">Collaborator</option>
                        </select>
                        <button onClick={handleAddTeamMember}>Add Member</button>
                        <p style={{ fontSize: '12px', color: '#666' }}>Note: Owners cannot be added through this endpoint.</p>
                    </div>
                )}
            </div>
        </div>
    );
}