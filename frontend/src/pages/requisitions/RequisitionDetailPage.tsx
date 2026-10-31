import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  approveRequisition,
  addRequisitionTeamMember,
  cancelRequisition,
  closeRequisition,
  fillRequisition,
  getEmployees,
  getRequisition,
  holdRequisition,
  Permissions,
  publishRequisition,
  rejectRequisition,
  removeRequisitionTeamMember,
  submitRequisition,
  updateRequisitionBudget,
} from '../../api/client'
import { usePermissions } from '../../auth/usePermission'
import {
  BudgetPanel,
  StatusActions,
  TeamPanel,
} from '../../components/requisitions'
import { Button, EmptyState, Modal, PageHeader, StatusChip } from '../../components/shared'
import type { RequisitionDetail } from '../../types/domain'
import type { EmployeeListItem } from '../../types/domain'

/** Owner: Amina (+ team panel: Abdul-Manan) */
export function RequisitionDetailPage() {
  const { id } = useParams()
  const { can } = usePermissions()
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitPending, setSubmitPending] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [approvePending, setApprovePending] = useState(false)
  const [rejectPending, setRejectPending] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectValidationError, setRejectValidationError] = useState<string | null>(null)
  const [publishPending, setPublishPending] = useState(false)
  const [holdPending, setHoldPending] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [holdValidationError, setHoldValidationError] = useState<string | null>(null)
  const [closePending, setClosePending] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [closeValidationError, setCloseValidationError] = useState<string | null>(null)
  const [cancelPending, setCancelPending] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelValidationError, setCancelValidationError] = useState<string | null>(null)
  const [fillPending, setFillPending] = useState(false)
  const [fillOpen, setFillOpen] = useState(false)
  const [fillReason, setFillReason] = useState('')
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [employeesError, setEmployeesError] = useState<string | null>(null)
  const [addTeamPending, setAddTeamPending] = useState(false)
  const [addTeamError, setAddTeamError] = useState<string | null>(null)
  const [removeTeamPending, setRemoveTeamPending] = useState(false)
  const [removeTeamError, setRemoveTeamError] = useState<string | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [budgetMinInput, setBudgetMinInput] = useState('')
  const [budgetMaxInput, setBudgetMaxInput] = useState('')
  const [budgetPending, setBudgetPending] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRequisition() {
      if (!id) {
        setLoading(false)
        setNotFound(true)
        return
      }

      setLoading(true)
      setNotFound(false)
      setError(null)

      try {
        const detail = await getRequisition(id)
        if (!cancelled) setRequisition(detail)
      } catch (cause) {
        if (cancelled) return
        setRequisition(null)
        if (axios.isAxiosError<{ message?: string }>(cause)) {
          if (cause.response?.status === 404) {
            setNotFound(true)
          } else {
            setError(cause.response?.data?.message ?? cause.message)
          }
        } else if (cause instanceof Error) {
          setError(cause.message)
        } else {
          setError('An unexpected error occurred while loading the requisition.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadRequisition()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    async function loadEmployees() {
      setEmployeesLoading(true)
      setEmployeesError(null)
      try {
        const items = await getEmployees()
        if (!cancelled) setEmployees(items)
      } catch (cause) {
        if (cancelled) return
        if (axios.isAxiosError<{ message?: string }>(cause)) {
          setEmployeesError(cause.response?.data?.message ?? cause.message)
        } else if (cause instanceof Error) {
          setEmployeesError(cause.message)
        } else {
          setEmployeesError('Unable to load active employees.')
        }
      } finally {
        if (!cancelled) setEmployeesLoading(false)
      }
    }

    void loadEmployees()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="page">
        <EmptyState title="Loading requisition" message="Loading requisition details…" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="page">
        <EmptyState title="Requisition not found" message="This requisition does not exist or is not in your scope." />
      </div>
    )
  }

  if (error || !requisition) {
    return (
      <div className="page">
        <EmptyState
          title="Unable to load requisition"
          message={error ?? 'Requisition details are unavailable.'}
        />
      </div>
    )
  }

  const owner = requisition.team.find((member) => member.teamRole === 'Owner')
  const canViewCompensation = can(Permissions.CompensationView)
  const canEditCompensation = can(Permissions.CompensationEdit) && canViewCompensation

  return (
    <div className="page">
      <PageHeader
        title={requisition.title}
        subtitle={requisition.department}
        actions={<StatusChip status={requisition.status} />}
      />
      <section className="panel stack">
        <h2>Requisition information</h2>
        <p><strong>Department:</strong> {requisition.department}</p>
        <p><strong>Employment type:</strong> {requisition.employmentType}</p>
        <p><strong>Seniority:</strong> {requisition.seniority}</p>
        <p><strong>Skills:</strong> {requisition.skills}</p>
        <p><strong>Hiring manager:</strong> {requisition.hiringManagerName}</p>
        <p><strong>Owner:</strong> {owner?.employeeName ?? 'Not provided by API'}</p>
        {requisition.statusReason ? (
          <p><strong>Status reason:</strong> {requisition.statusReason}</p>
        ) : null}
        <div>
          <strong>Job description</strong>
          <p>{requisition.jobDescription}</p>
        </div>
      </section>
      <div className="grid-2">
        <section className="panel">
          <h2>Workflow</h2>
          <StatusActions
            status={requisition.status}
            canManage={can(Permissions.RequisitionsManage)}
            canApprove={can(Permissions.RequisitionsApprove)}
            submitPending={submitPending}
            approvePending={approvePending}
            rejectPending={rejectPending}
            publishPending={publishPending}
            holdPending={holdPending}
            closePending={closePending}
            cancelPending={cancelPending}
            fillPending={fillPending}
            onSubmit={async () => {
              if (!id || submitPending) return

              setSubmitPending(true)
              setActionMessage(null)
              setActionError(null)

              try {
                await submitRequisition(id)
                const refreshed = await getRequisition(id)
                setRequisition(refreshed)
                setActionMessage('Requisition submitted for approval.')
              } catch (cause) {
                if (axios.isAxiosError<{ message?: string }>(cause)) {
                  setActionError(
                    cause.response?.data?.message ??
                      'Unable to submit the requisition for approval.',
                  )
                } else if (cause instanceof Error) {
                  setActionError(cause.message)
                } else {
                  setActionError('Unable to submit the requisition for approval.')
                }
              } finally {
                setSubmitPending(false)
              }
            }}
            onApprove={async () => {
              if (!id || approvePending) return

              setApprovePending(true)
              setActionMessage(null)
              setActionError(null)

              try {
                await approveRequisition(id)
                const refreshed = await getRequisition(id)
                setRequisition(refreshed)
                setActionMessage('Requisition approved.')
              } catch (cause) {
                if (axios.isAxiosError<{ message?: string }>(cause)) {
                  setActionError(
                    cause.response?.data?.message ?? 'Unable to approve the requisition.',
                  )
                } else if (cause instanceof Error) {
                  setActionError(cause.message)
                } else {
                  setActionError('Unable to approve the requisition.')
                }
              } finally {
                setApprovePending(false)
              }
            }}
            onReject={() => {
              setRejectReason('')
              setRejectValidationError(null)
              setActionError(null)
              setRejectOpen(true)
            }}
            onPublish={async () => {
              if (!id || publishPending) return

              setPublishPending(true)
              setActionMessage(null)
              setActionError(null)

              try {
              await publishRequisition(id)
              const refreshed = await getRequisition(id)
              setRequisition(refreshed)
              setActionMessage('Requisition published.')
              } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setActionError(
                  cause.response?.data?.message ?? 'Unable to publish the requisition.',
                )
              } else if (cause instanceof Error) {
                setActionError(cause.message)
              } else {
                setActionError('Unable to publish the requisition.')
              }
              } finally {
              setPublishPending(false)
              }
            }}
            onHold={() => {
              setHoldReason('')
              setHoldValidationError(null)
              setActionError(null)
              setHoldOpen(true)
            }}
            onClose={() => {
              setCloseReason('')
              setCloseValidationError(null)
              setActionError(null)
              setCloseOpen(true)
            }}
            onCancel={() => {
              setCancelReason('')
              setCancelValidationError(null)
              setActionError(null)
              setCancelOpen(true)
            }}
            onFill={() => {
              setFillReason('')
              setActionError(null)
              setFillOpen(true)
            }}
          />
          {actionMessage ? <p role="status">{actionMessage}</p> : null}
          {actionError ? <p className="error" role="alert">{actionError}</p> : null}
        </section>
        <BudgetPanel
          budgetMin={requisition.budgetMin}
          budgetMax={requisition.budgetMax}
          canView={canViewCompensation}
          canEdit={canEditCompensation}
          onEdit={() => {
            setBudgetMinInput(
              requisition.budgetMin === null || requisition.budgetMin === undefined
                ? ''
                : String(requisition.budgetMin),
            )
            setBudgetMaxInput(
              requisition.budgetMax === null || requisition.budgetMax === undefined
                ? ''
                : String(requisition.budgetMax),
            )
            setBudgetError(null)
            setBudgetOpen(true)
          }}
        />
      </div>
      <TeamPanel
        members={requisition.team}
        employees={employees}
        employeesLoading={employeesLoading}
        employeesError={employeesError}
        addPending={addTeamPending}
        addError={addTeamError}
        onAdd={async (employeeId, teamRole) => {
          if (!id || addTeamPending) return false

          setAddTeamPending(true)
          setAddTeamError(null)
          setActionMessage(null)

          try {
            const updated = await addRequisitionTeamMember(id, employeeId, teamRole)
            setRequisition(updated)
            setActionMessage('Teammate added successfully.')
            return true
          } catch (cause) {
            if (axios.isAxiosError<{ message?: string }>(cause)) {
              setAddTeamError(cause.response?.data?.message ?? 'Unable to add teammate.')
            } else if (cause instanceof Error) {
              setAddTeamError(cause.message)
            } else {
              setAddTeamError('Unable to add teammate.')
            }
            return false
          } finally {
            setAddTeamPending(false)
          }
        }}
        removePending={removeTeamPending}
        removeError={removeTeamError}
        onRemove={async (requisitionTeamMemberId) => {
          if (!id || removeTeamPending) return false

          setRemoveTeamPending(true)
          setRemoveTeamError(null)
          setActionMessage(null)

          try {
            await removeRequisitionTeamMember(id, requisitionTeamMemberId)
            const refreshed = await getRequisition(id)
            setRequisition(refreshed)
            setActionMessage('Teammate removed successfully.')
            return true
          } catch (cause) {
            if (axios.isAxiosError<{ message?: string }>(cause)) {
              setRemoveTeamError(
                cause.response?.data?.message ?? 'Unable to remove teammate.',
              )
            } else if (cause instanceof Error) {
              setRemoveTeamError(cause.message)
            } else {
              setRemoveTeamError('Unable to remove teammate.')
            }
            return false
          } finally {
            setRemoveTeamPending(false)
          }
        }}
        canManage={can(Permissions.RequisitionsManage)}
      />
      <Modal
        open={rejectOpen}
        title="Reject requisition"
        onClose={() => {
          if (!rejectPending) {
            setRejectOpen(false)
            setRejectValidationError(null)
          }
        }}
        footer={
          <div className="row end">
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={rejectPending}
            >
              Cancel
            </Button>
            <Button
              variant="warn"
              type="submit"
              form="reject-requisition-form"
              disabled={rejectPending}
            >
              {rejectPending ? 'Rejecting…' : 'Reject requisition'}
            </Button>
          </div>
        }
      >
        <form
          id="reject-requisition-form"
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault()
            const trimmedReason = rejectReason.trim()
            if (!trimmedReason) {
              setRejectValidationError('A rejection reason is required.')
              return
            }
            if (!id || rejectPending) return

            setRejectPending(true)
            setRejectValidationError(null)
            setActionMessage(null)
            setActionError(null)

            try {
              await rejectRequisition(id, trimmedReason)
              const refreshed = await getRequisition(id)
              setRequisition(refreshed)
              setRejectOpen(false)
              setRejectReason('')
              setActionMessage('Requisition rejected and returned to Draft.')
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setActionError(
                  cause.response?.data?.message ?? 'Unable to reject the requisition.',
                )
              } else if (cause instanceof Error) {
                setActionError(cause.message)
              } else {
                setActionError('Unable to reject the requisition.')
              }
            } finally {
              setRejectPending(false)
            }
          }}
        >
          <label className="field">
            Rejection reason
            <textarea
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value)
                if (rejectValidationError) setRejectValidationError(null)
              }}
              required
              disabled={rejectPending}
              autoFocus
            />
          </label>
          {rejectValidationError ? (
            <p className="error" role="alert">{rejectValidationError}</p>
          ) : null}
          {actionError ? <p className="error" role="alert">{actionError}</p> : null}
        </form>
      </Modal>
      <Modal
        open={budgetOpen}
        title="Edit budget"
        onClose={() => {
          if (!budgetPending) {
            setBudgetOpen(false)
            setBudgetError(null)
          }
        }}
        footer={
          <div className="row end">
            <Button
              variant="ghost"
              onClick={() => setBudgetOpen(false)}
              disabled={budgetPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="budget-form"
              disabled={budgetPending}
            >
              {budgetPending ? 'Saving…' : 'Save budget'}
            </Button>
          </div>
        }
      >
        <form
          id="budget-form"
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault()
            const minText = budgetMinInput.trim()
            const maxText = budgetMaxInput.trim()
            const min = minText === '' ? null : Number(minText)
            const max = maxText === '' ? null : Number(maxText)

            if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) {
              setBudgetError('Budget values must be valid numbers or left blank.')
              return
            }
            if ((min !== null && min < 0) || (max !== null && max < 0)) {
              setBudgetError('Budget values cannot be negative.')
              return
            }
            if (min !== null && max !== null && min > max) {
              setBudgetError('Minimum budget must be less than or equal to maximum budget.')
              return
            }
            if (!id || budgetPending) return

            setBudgetPending(true)
            setBudgetError(null)
            try {
              await updateRequisitionBudget(id, min, max)
              const refreshed = await getRequisition(id)
              setRequisition(refreshed)
              setBudgetOpen(false)
              setActionMessage('Budget updated successfully.')
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setBudgetError(
                  cause.response?.data?.message ?? 'Unable to update the budget.',
                )
              } else if (cause instanceof Error) {
                setBudgetError(cause.message)
              } else {
                setBudgetError('Unable to update the budget.')
              }
            } finally {
              setBudgetPending(false)
            }
          }}
        >
          <label className="field">
            Minimum budget
            <input
              type="number"
              min="0"
              step="any"
              value={budgetMinInput}
              onChange={(event) => setBudgetMinInput(event.target.value)}
              disabled={budgetPending}
            />
          </label>
          <label className="field">
            Maximum budget
            <input
              type="number"
              min="0"
              step="any"
              value={budgetMaxInput}
              onChange={(event) => setBudgetMaxInput(event.target.value)}
              disabled={budgetPending}
            />
          </label>
          <p className="muted">Leave either field blank to clear it.</p>
          {budgetError ? <p className="error" role="alert">{budgetError}</p> : null}
        </form>
      </Modal>
      <Modal
        open={holdOpen}
        title="Put requisition on hold"
        onClose={() => {
          if (!holdPending) {
            setHoldOpen(false)
            setHoldValidationError(null)
          }
        }}
        footer={
          <div className="row end">
            <Button
              variant="ghost"
              onClick={() => setHoldOpen(false)}
              disabled={holdPending}
            >
              Cancel
            </Button>
            <Button
              variant="warn"
              type="submit"
              form="hold-requisition-form"
              disabled={holdPending}
            >
              {holdPending ? 'Holding…' : 'Confirm hold'}
            </Button>
          </div>
        }
      >
        <form
          id="hold-requisition-form"
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault()
            const trimmedReason = holdReason.trim()
            if (!trimmedReason) {
              setHoldValidationError('A reason is required to put a requisition on hold.')
              return
            }
            if (!id || holdPending) return

            setHoldPending(true)
            setHoldValidationError(null)
            setActionMessage(null)
            setActionError(null)

            try {
              await holdRequisition(id, trimmedReason)
              const refreshed = await getRequisition(id)
              setRequisition(refreshed)
              setHoldOpen(false)
              setHoldReason('')
              setActionMessage('Requisition placed on hold.')
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setActionError(
                  cause.response?.data?.message ?? 'Unable to put the requisition on hold.',
                )
              } else if (cause instanceof Error) {
                setActionError(cause.message)
              } else {
                setActionError('Unable to put the requisition on hold.')
              }
            } finally {
              setHoldPending(false)
            }
          }}
        >
          <label className="field">
            Reason
            <textarea
              value={holdReason}
              onChange={(event) => {
                setHoldReason(event.target.value)
                if (holdValidationError) setHoldValidationError(null)
              }}
              required
              disabled={holdPending}
              autoFocus
            />
          </label>
          {holdValidationError ? (
            <p className="error" role="alert">{holdValidationError}</p>
          ) : null}
          {actionError ? <p className="error" role="alert">{actionError}</p> : null}
        </form>
      </Modal>
      <Modal
        open={closeOpen}
        title="Close requisition"
        onClose={() => {
          if (!closePending) {
            setCloseOpen(false)
            setCloseValidationError(null)
          }
        }}
        footer={
          <div className="row end">
            <Button
              variant="ghost"
              onClick={() => setCloseOpen(false)}
              disabled={closePending}
            >
              Cancel
            </Button>
            <Button
              variant="warn"
              type="submit"
              form="close-requisition-form"
              disabled={closePending}
            >
              {closePending ? 'Closing…' : 'Confirm close'}
            </Button>
          </div>
        }
      >
        <form
          id="close-requisition-form"
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault()
            const trimmedReason = closeReason.trim()
            if (!trimmedReason) {
              setCloseValidationError('A reason is required to close a requisition.')
              return
            }
            if (!id || closePending) return

            setClosePending(true)
            setCloseValidationError(null)
            setActionMessage(null)
            setActionError(null)

            try {
              await closeRequisition(id, trimmedReason)
              const refreshed = await getRequisition(id)
              setRequisition(refreshed)
              setCloseOpen(false)
              setCloseReason('')
              setActionMessage('Requisition closed.')
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setActionError(
                  cause.response?.data?.message ?? 'Unable to close the requisition.',
                )
              } else if (cause instanceof Error) {
                setActionError(cause.message)
              } else {
                setActionError('Unable to close the requisition.')
              }
            } finally {
              setClosePending(false)
            }
          }}
        >
          <label className="field">
            Reason
            <textarea
              value={closeReason}
              onChange={(event) => {
                setCloseReason(event.target.value)
                if (closeValidationError) setCloseValidationError(null)
              }}
              required
              disabled={closePending}
              autoFocus
            />
          </label>
          {closeValidationError ? (
            <p className="error" role="alert">{closeValidationError}</p>
          ) : null}
          {actionError ? <p className="error" role="alert">{actionError}</p> : null}
        </form>
      </Modal>
      <Modal
        open={cancelOpen}
        title="Cancel requisition"
        onClose={() => {
          if (!cancelPending) {
            setCancelOpen(false)
            setCancelValidationError(null)
          }
        }}
        footer={
          <div className="row end">
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={cancelPending}
            >
              Cancel
            </Button>
            <Button
              variant="warn"
              type="submit"
              form="cancel-requisition-form"
              disabled={cancelPending}
            >
              {cancelPending ? 'Cancelling…' : 'Confirm cancellation'}
            </Button>
          </div>
        }
      >
        <form
          id="cancel-requisition-form"
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault()
            const trimmedReason = cancelReason.trim()
            if (!trimmedReason) {
              setCancelValidationError('A reason is required to cancel a requisition.')
              return
            }
            if (!id || cancelPending) return

            setCancelPending(true)
            setCancelValidationError(null)
            setActionMessage(null)
            setActionError(null)

            try {
              await cancelRequisition(id, trimmedReason)
              const refreshed = await getRequisition(id)
              setRequisition(refreshed)
              setCancelOpen(false)
              setCancelReason('')
              setActionMessage('Requisition cancelled.')
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setActionError(
                  cause.response?.data?.message ?? 'Unable to cancel the requisition.',
                )
              } else if (cause instanceof Error) {
                setActionError(cause.message)
              } else {
                setActionError('Unable to cancel the requisition.')
              }
            } finally {
              setCancelPending(false)
            }
          }}
        >
          <label className="field">
            Reason
            <textarea
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value)
                if (cancelValidationError) setCancelValidationError(null)
              }}
              required
              disabled={cancelPending}
              autoFocus
            />
          </label>
          {cancelValidationError ? (
            <p className="error" role="alert">{cancelValidationError}</p>
          ) : null}
          {actionError ? <p className="error" role="alert">{actionError}</p> : null}
        </form>
      </Modal>
      <Modal
        open={fillOpen}
        title="Mark requisition as filled"
        onClose={() => {
          if (!fillPending) setFillOpen(false)
        }}
        footer={
          <div className="row end">
            <Button
              variant="ghost"
              onClick={() => setFillOpen(false)}
              disabled={fillPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="fill-requisition-form"
              disabled={fillPending}
            >
              {fillPending ? 'Filling…' : 'Confirm filled'}
            </Button>
          </div>
        }
      >
        <form
          id="fill-requisition-form"
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!id || fillPending) return

            setFillPending(true)
            setActionMessage(null)
            setActionError(null)

            try {
              await fillRequisition(id, fillReason)
              const refreshed = await getRequisition(id)
              setRequisition(refreshed)
              setFillOpen(false)
              setFillReason('')
              setActionMessage('Requisition marked as filled.')
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setActionError(
                  cause.response?.data?.message ?? 'Unable to mark the requisition as filled.',
                )
              } else if (cause instanceof Error) {
                setActionError(cause.message)
              } else {
                setActionError('Unable to mark the requisition as filled.')
              }
            } finally {
              setFillPending(false)
            }
          }}
        >
          <label className="field">
            Reason (optional)
            <textarea
              value={fillReason}
              onChange={(event) => setFillReason(event.target.value)}
              disabled={fillPending}
              autoFocus
            />
          </label>
          <p className="muted">
            Leave blank to use the default reason: “Position successfully filled.”
          </p>
          {actionError ? <p className="error" role="alert">{actionError}</p> : null}
        </form>
      </Modal>
    </div>
  )
}
