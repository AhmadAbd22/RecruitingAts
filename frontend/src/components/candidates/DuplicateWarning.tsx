import type { CandidateListItem } from '../../types/domain'

export type DuplicateWarningProps = {
  matches: CandidateListItem[]
  onUseExisting?: (candidateId: string) => void
  onCreateAnyway?: () => void
}

/** Owner: Ibtesam — FR-CAND-003 */
export function DuplicateWarning({ matches, onUseExisting, onCreateAnyway }: DuplicateWarningProps) {
  if (matches.length === 0) return null
  return (
    <div className="api-gap" role="alert">
      <strong>Possible duplicates</strong>
      <ul>
        {matches.map((m) => (
          <li key={m.candidateId}>
            {m.fullName} · {m.email} · {m.phone}{' '}
            <button type="button" className="btn btn-ghost" onClick={() => onUseExisting?.(m.candidateId)}>
              Use existing
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary" onClick={onCreateAnyway}>
        Create anyway
      </button>
    </div>
  )
}
