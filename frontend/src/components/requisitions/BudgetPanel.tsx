export type BudgetPanelProps = {
  budgetMin?: number | null
  budgetMax?: number | null
  canView: boolean
  canEdit?: boolean
  onEdit?: () => void
}

/** Owner: Amina / Tayyab — compensation gating. */
export function BudgetPanel({
  budgetMin,
  budgetMax,
  canView,
  canEdit,
  onEdit,
}: BudgetPanelProps) {
  return (
    <section className="panel">
      <h2>Compensation</h2>
      {canView ? (
        <p>
          {budgetMin ?? '—'} – {budgetMax ?? '—'}
        </p>
      ) : (
        <p className="chip chip-warn">
          Budget information is restricted. You don't have permission to view compensation details.
        </p>
      )}
      {canEdit ? (
        <button type="button" className="btn btn-ghost" onClick={onEdit}>
          Edit budget
        </button>
      ) : null}
      {/* TODO: PUT budget + audit on view */}
    </section>
  )
}
