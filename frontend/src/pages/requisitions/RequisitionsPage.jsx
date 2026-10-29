import { useState } from 'react';
import { RequisitionList } from '../components/requisitions/RequisitionList';
import { RequisitionDetailView } from '../components/requisitions/RequisitionDetail';
import { CreateRequisitionModal } from '../components/requisitions/CreateRequisitionModal';

export function RequisitionsPage() {
    const [selectedId, setSelectedId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // User permissions passed from your auth context or decoded JWT claim
    // Replace these example claims with your actual current logged-in user permissions
    const userPermissions = [
        'REQUISITIONS.MANAGE',
        'REQUISITIONS.APPROVE',
        'ATS.COMPENSATION.VIEW',
        'ATS.COMPENSATION.EDIT',
    ];

    return (
        <div style={{ padding: '20px' }}>
            {/* 1. Detail View */}
            {selectedId ? (
                <RequisitionDetailView
                    requisitionId={selectedId}
                    userPermissions={userPermissions}
                    onBack={() => setSelectedId(null)}
                />
            ) : (
                /* 2. List View */
                <RequisitionList
                    userPermissions={userPermissions}
                    onSelect={(id) => setSelectedId(id)}
                    onCreateNew={() => setShowCreateModal(true)}
                />
            )}

            {/* 3. Create Modal Popup */}
            {showCreateModal && (
                <CreateRequisitionModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(newId) => {
                        setShowCreateModal(false);
                        setSelectedId(newId); // Immediately navigate to the newly created requisition detail
                    }}
                />
            )}
        </div>
    );
}