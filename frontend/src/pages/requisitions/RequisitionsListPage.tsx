import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { createRequisition, getRequisitions, Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { RequisitionForm, RequisitionList } from '../../components/requisitions'
import type { RequisitionFormValues } from '../../components/requisitions'
import { Button, EmptyState, Modal, PageHeader } from '../../components/shared'
import type { RequisitionListItem } from '../../types/domain'

/** Owner: Amina — compose list + create modal; wire API. */
export function RequisitionsListPage() {
    const navigate = useNavigate()
    const canManage = usePermission(Permissions.RequisitionsManage)
    const canViewComp = usePermission(Permissions.CompensationView)
    const [requisitions, setRequisitions] = useState<RequisitionListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retryAttempt, setRetryAttempt] = useState(0)
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<RequisitionFormValues>({
        title: '',
        department: '',
        employmentType: 'FullTime',
        seniority: 'Mid',
        skills: '',
        jobDescription: '',
        openings: 1,
        hiringManagerEmployeeId: '',
    })
    const [createError, setCreateError] = useState<string | null>(null)
    const [createPending, setCreatePending] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function loadRequisitions() {
            setLoading(true)
            setError(null)

            try {
                const items = await getRequisitions()
                if (!cancelled) setRequisitions(items)
            } catch (cause) {
                if (cancelled) return
                if (axios.isAxiosError<{ message?: string }>(cause)) {
                    setError(cause.response?.data?.message ?? cause.message)
                } else if (cause instanceof Error) {
                    setError(cause.message)
                } else {
                    setError('An unexpected error occurred while loading requisitions.')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void loadRequisitions()
        return () => {
            cancelled = true
        }
    }, [retryAttempt])

    return (
        <div className= "page" >
        <PageHeader
        title="Requisitions"
    subtitle = "Requisitions in your scope."
    actions = {
        canManage?(
            <Button variant = "primary" onClick = {() => setOpen(true)
}>
    New requisition
        </Button>
          ) : null
        }
      />
{
    loading ? (
        <div className= "empty-state" role = "status" >
            Loading requisitions…
    </div>
      ) : error ? (
        <div className= "panel" >
        <p className="error" role = "alert" > { error } </p>
            < Button variant = "primary" onClick = {() => setRetryAttempt((attempt) => attempt + 1)
}>
    Retry
    </Button>
    </div>
      ) : requisitions.length === 0 ? (
    <EmptyState
          title= "No requisitions in scope"
          message = "There are no requisitions available to your account."
    />
      ) : (
    <RequisitionList
          items= { requisitions }
showBudget = { canViewComp }
onSelect = {(id) => navigate(`/requisitions/${id}`)}
        />
      )}
<Modal
        open={ open }
title = "Create requisition"
onClose = {() => {
    if (!createPending) {
        setOpen(false)
        setCreateError(null)
    }
}}
footer = { null}
    >
    <RequisitionForm
          values={ form }
onChange = { setForm }
submitLabel = "Create draft"
disabled = { createPending }
error = { createError }
onSubmit = { async() => {
    if (createPending) return

    setCreateError(null)
    setCreatePending(true)

    try {
        await createRequisition({
            title: form.title.trim(),
            department: form.department.trim(),
            employmentType: form.employmentType,
            seniority: form.seniority,
            skills: form.skills.trim(),
            jobDescription: form.jobDescription.trim(),
            openings: form.openings,
            hiringManagerEmployeeId: form.hiringManagerEmployeeId.trim(),
        })
        setOpen(false)
        setCreateError(null)
        setRetryAttempt((attempt) => attempt + 1)
    } catch (cause) {
        if (axios.isAxiosError<{ message?: string }>(cause)) {
            setCreateError(
                cause.response?.data?.message ??
                'Unable to create the requisition. Please review the form and try again.',
            )
        } else if (cause instanceof Error) {
            setCreateError(cause.message)
        } else {
            setCreateError('Unable to create the requisition. Please try again.')
        }
    } finally {
        setCreatePending(false)
    }
}}
        />
    </Modal>
    </div>
  )
}