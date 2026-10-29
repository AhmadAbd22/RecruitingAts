export type MatchScoreBadgeProps = {
  score?: number | null
  label?: string | null
}

/** Owner: Abdul-Manan — advisory only (FR-APP-004 / API gap). */
export function MatchScoreBadge({ score, label = 'Advisory' }: MatchScoreBadgeProps) {
  if (score == null) return null
  return (
    <span className="score" title="Advisory — never auto hire/reject">
      {score}%<em>{label}</em>
    </span>
  )
}
