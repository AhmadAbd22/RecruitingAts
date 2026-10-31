import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getRequisitionById } from '../../api/client'
import type { RequisitionListItem } from '../../types/domain'

export function RequisitionDetailPage() {
    const { id } = useParams<{ id: string }>()
    const [requisition, setRequisition] = useState<RequisitionListItem | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            getRequisitionById(id)
                .then((data) => setRequisition(data))
                .catch((err) => console.error(err))
                .finally(() => setLoading(false))
        }
    }, [id])

    if (loading) {
        return <div className="page" > Loading...</div>
    }

    return (
        <div className= "page" >
        <h1>{ requisition?.title ?? 'Requisition Detail'
} </h1>
    < p > Department: { requisition?.department } </p>
        < p > Status: { requisition?.status } </p>
            </div>
  )
}