import type { TeamMember } from '../../types/domain'
import { Button } from '../shared'

export type TeamPanelProps = {
  members: TeamMember[]
  onAdd?: () => void
  onRemove?: (requisitionTeamMemberId: string) => void
  canManage?: boolean
}

/** Owner: Abdul-Manan — team on requisition detail. */
export function TeamPanel({ members, onAdd, onRemove, canManage }: TeamPanelProps) {
  return (
    <section className="panel">
      <div className="row between">
        <h2>Team</h2>
        {canManage ? (
          <Button variant="primary" onClick={onAdd}>
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
              <Button variant="ghost" onClick={() => onRemove?.(m.requisitionTeamMemberId)}>
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {/* TODO: POST/DELETE /api/requisitions/{id}/team */}
    </section>
  )
}
