import { MatchScoreBadge } from './MatchScoreBadge'

export type ApplicationCardProps = {
  applicationId: string
  candidateName: string
  candidateEmail?: string
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
  candidateEmail,
  requisitionTitle,
  source,
  matchScore,
  matchLabel,
  createdAtLabel,
  selected,
  stageColor = '#087d6d',
  onSelect,
}: ApplicationCardProps) {
  return (
    <button
      type="button"
      className={`app-card${selected ? ' selected' : ''}`}
      style={{ borderLeftColor: stageColor }}
      onClick={() => onSelect?.(applicationId)}
    >
      <span className="pipeline-person"><span className="pipeline-avatar" aria-hidden="true">{candidateName.trim().charAt(0).toUpperCase()}</span><strong>{candidateName}</strong></span>
      <span className="muted">{candidateEmail?.trim() || 'Email unavailable'}</span>
      <span className="pipeline-job"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18" /></svg>{requisitionTitle}</span>
      <div className="row between">
        <span className="source-tag">{source || '—'}</span>
        <span className="pipeline-card-meta"><MatchScoreBadge score={matchScore} label={matchLabel} /><svg className="pipeline-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></span>
      </div>
      {createdAtLabel ? <span className="mono muted">{createdAtLabel}</span> : null}
    </button>
  )
}
