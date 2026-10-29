export type PanelCandidate = {
  employeeId: string
  name: string
  teamRole: string
}

export type PanelPickerProps = {
  members: PanelCandidate[]
  selectedEmployeeIds: string[]
  leadEmployeeId: string | null
  onToggleMember: (employeeId: string) => void
  onLeadChange: (employeeId: string) => void
}

/** Owner: Abdul-Manan — panel from requisition interviewer team; one lead. */
export function PanelPicker({
  members,
  selectedEmployeeIds,
  leadEmployeeId,
  onToggleMember,
  onLeadChange,
}: PanelPickerProps) {
  if (members.length === 0) {
    return <p className="muted">No interviewer-capable team members on this requisition.</p>
  }

  return (
    <div className="stack">
      {members.map((m) => {
        const checked = selectedEmployeeIds.includes(m.employeeId)
        return (
          <div key={m.employeeId} className="row between">
            <label className="row gap">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleMember(m.employeeId)}
              />
              {m.name} <span className="chip chip-neutral">{m.teamRole}</span>
            </label>
            <label className="row gap muted">
              <input
                type="radio"
                name="panel-lead"
                checked={leadEmployeeId === m.employeeId}
                disabled={!checked}
                onChange={() => onLeadChange(m.employeeId)}
              />
              Lead
            </label>
          </div>
        )
      })}
    </div>
  )
}
