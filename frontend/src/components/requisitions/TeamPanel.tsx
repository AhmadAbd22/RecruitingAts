import { useState } from 'react'
import type { TeamMember } from '../../types/domain'
import type { EmployeeListItem } from '../../types/domain'
import { Button, Modal } from '../shared'

export type TeamPanelProps = {
  members: TeamMember[]
  employees?: EmployeeListItem[]
  employeesLoading?: boolean
  employeesError?: string | null
  onAdd?: (
    employeeId: string,
    teamRole: 'Recruiter' | 'TechnicalInterviewer' | 'FinalInterviewer',
  ) => Promise<boolean>
  addPending?: boolean
  addError?: string | null
  onRemove?: (requisitionTeamMemberId: string) => Promise<boolean>
  removePending?: boolean
  removeError?: string | null
  canManage?: boolean
}

/** Owner: Abdul-Manan — team on requisition detail. */
export function TeamPanel({
  members,
  employees = [],
  employeesLoading = false,
  employeesError,
  onAdd,
  addPending = false,
  addError,
  onRemove,
  removePending = false,
  removeError,
  canManage,
}: TeamPanelProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [teamRole, setTeamRole] = useState<
    'Recruiter' | 'TechnicalInterviewer' | 'FinalInterviewer'
  >('Recruiter')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const assignedEmployeeIds = new Set(members.map((member) => member.employeeId))
  const eligibleEmployees = employees.filter(
    (employee) => !assignedEmployeeIds.has(employee.employeeId),
  )

  function openAddDialog() {
    setEmployeeId('')
    setTeamRole('Recruiter')
    setValidationError(null)
    setAddOpen(true)
  }

  function closeAddDialog() {
    if (!addPending) {
      setAddOpen(false)
      setValidationError(null)
    }
  }

  function closeRemoveDialog() {
    if (!removePending) setRemoveTarget(null)
  }

  return (
    <section className="panel">
      <div className="row between">
        <h2>Team</h2>
        {canManage ? (
          <Button variant="primary" onClick={openAddDialog}>
            Add teammate
          </Button>
        ) : null}
      </div>
      <ul className="plain-list">
        {members.map((m) => (
          <li key={m.requisitionTeamMemberId} className="row between">
            <span>
              {m.employeeName} <span className="chip chip-neutral">{m.teamRole}</span>
            </span>
            {canManage && m.teamRole !== 'Owner' ? (
              <Button
                variant="ghost"
                onClick={() => setRemoveTarget(m)}
                disabled={removePending}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <Modal
        open={addOpen}
        title="Add teammate"
        onClose={closeAddDialog}
        footer={
          <div className="row end">
            <Button variant="ghost" onClick={closeAddDialog} disabled={addPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="add-requisition-team-member-form"
              disabled={addPending || employeesLoading || eligibleEmployees.length === 0}
            >
              {addPending ? 'Adding…' : 'Add teammate'}
            </Button>
          </div>
        }
      >
        {employeesLoading ? (
          <p role="status">Loading active employees…</p>
        ) : employeesError ? (
          <p className="error" role="alert">{employeesError}</p>
        ) : eligibleEmployees.length === 0 ? (
          <p role="status">No eligible active employees are available to add.</p>
        ) : (
          <form
            id="add-requisition-team-member-form"
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!employeeId) {
                setValidationError('Select an employee.')
                return
              }
              if (!teamRole) {
                setValidationError('Select a team role.')
                return
              }

              setValidationError(null)
              const added = await onAdd?.(employeeId, teamRole)
              if (added) {
                setAddOpen(false)
                setEmployeeId('')
                setTeamRole('Recruiter')
              }
            }}
          >
            <label className="field">
              Employee
              <select
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value)
                  if (validationError) setValidationError(null)
                }}
                required
                disabled={addPending}
              >
                <option value="">Select an employee</option>
                {eligibleEmployees.map((employee) => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.fullName} · {employee.email} · {employee.department}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Team role
              <select
                value={teamRole}
                onChange={(event) =>
                  setTeamRole(
                    event.target.value as
                      | 'Recruiter'
                      | 'TechnicalInterviewer'
                      | 'FinalInterviewer',
                  )
                }
                required
                disabled={addPending}
              >
                <option value="Recruiter">Recruiter</option>
                <option value="TechnicalInterviewer">Technical interviewer</option>
                <option value="FinalInterviewer">Final interviewer</option>
              </select>
            </label>
            {validationError ? <p className="error" role="alert">{validationError}</p> : null}
            {addError ? <p className="error" role="alert">{addError}</p> : null}
          </form>
        )}
      </Modal>
      <Modal
        open={removeTarget !== null}
        title="Remove teammate"
        onClose={closeRemoveDialog}
        footer={
          <div className="row end">
            <Button variant="ghost" onClick={closeRemoveDialog} disabled={removePending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!removeTarget || removePending) return
                const removed = await onRemove?.(removeTarget.requisitionTeamMemberId)
                if (removed) setRemoveTarget(null)
              }}
              disabled={removePending}
            >
              {removePending ? 'Removing…' : 'Remove teammate'}
            </Button>
          </div>
        }
      >
        {removeTarget ? (
          <p>
            Remove {removeTarget.employeeName} from this requisition team?
          </p>
        ) : null}
        {removeError ? <p className="error" role="alert">{removeError}</p> : null}
      </Modal>
    </section>
  )
}
