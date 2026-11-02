export type StatusChipProps = {
  status: string
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
}

const defaultTone = (status: string): StatusChipProps['tone'] => {
  const s = status.toLowerCase()
  if (['published', 'approved', 'hired', 'completed', 'filled', 'scheduled'].some((x) => s.includes(x)))
    return 'ok'
  if (['pending', 'hold', 'draft', 'interview'].some((x) => s.includes(x))) return 'warn'
  if (['closed', 'cancel', 'reject', 'disqual', 'nfa', 'noshow'].some((x) => s.includes(x)))
    return 'danger'
  return 'neutral'
}

export function StatusChip({ status, tone }: StatusChipProps) {
  return <span className={`chip chip-${tone ?? defaultTone(status)}`}>{status}</span>
}
