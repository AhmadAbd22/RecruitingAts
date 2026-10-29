export type EmptyStateProps = {
  title?: string
  message: string
}

export function EmptyState({ title = 'Nothing here', message }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
