import { useState } from 'react';
import { requisitionApi } from '../../services/requisitionApi';

export function CreateRequisitionModal({ onClose, onCreated }) {
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        employmentType: 'Full-time',
        seniority: 'Mid',
        skills: '',
        jobDescription: '',
        openings: 1,
        hiringManagerEmployeeId: '',
    });

    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            setError(null);
            const created = await requisitionApi.create(formData);
            onCreated(created.requisitionId);
        } catch (err) {
            setError(err.message || 'Failed to create requisition.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: '25px', borderRadius: '5px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3>Create New Requisition</h3>
                {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Title:</label>
                        <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Department:</label>
                        <input required type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Hiring Manager Employee ID (GUID):</label>
                        <input required type="text" value={formData.hiringManagerEmployeeId} onChange={(e) => setFormData({ ...formData, hiringManagerEmployeeId: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Openings:</label>
                        <input type="number" min={1} value={formData.openings} onChange={(e) => setFormData({ ...formData, openings: Number(e.target.value) })} style={{ width: '100%', padding: '6px' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Skills:</label>
                        <input type="text" value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} style={{ width: '100%', padding: '6px' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Job Description:</label>
                        <textarea value={formData.jobDescription} onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })} style={{ width: '100%', height: '80px', padding: '6px' }} />
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '6px 12px' }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ padding: '6px 12px' }}>{submitting ? 'Creating...' : 'Create Requisition'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}