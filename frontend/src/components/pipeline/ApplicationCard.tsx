import { MatchScoreBadge } from './MatchScoreBadge'

export type ApplicationCardProps = {
  applicationId: string
  candidateName: string
  requisitionTitle: string
  source?: string | null
  matchScore?: number | null
  matchLabel?: string | null
  createdAtLabel?: string
  selected?: boolean
  stageColor?: string
  onSelect?: (applicationId: string) => void
}

/** Owner: Abdul-Manan */
export function ApplicationCard({
  applicationId,
  candidateName,
  requisitionTitle,
  source,
  matchScore,
  matchLabel,
  createdAtLabel,
  selected,
  stageColor = '#64748b',
  onSelect,
}: ApplicationCardProps) {
  return (
    <button
      type="button"
      className={`app-card${selected ? ' selected' : ''}`}
      style={{ borderLeftColor: stageColor }}
      onClick={() => onSelect?.(applicationId)}
    >
      <strong>{candidateName}</strong>
      <span className="muted">{requisitionTitle}</span>
      <div className="row between">
        <span className="source-tag">{source || '—'}</span>
        <MatchScoreBadge score={matchScore} label={matchLabel} />
      </div>
      {createdAtLabel ? <span className="mono muted">{createdAtLabel}</span> : null}
    </button>
  )
}
