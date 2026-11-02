export type StageFormValues = {
  name: string
  sortOrder: number
}

export type StageFormProps = {
  values: StageFormValues
  onChange: (values: StageFormValues) => void
  onSubmit?: () => void
  submitLabel?: string
  disabled?: boolean
}

/** Owner: Amina */
export function StageForm({
  values,
  onChange,
  onSubmit,
  submitLabel = 'Add stage',
  disabled = false,
}: StageFormProps) {
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <label className="field">
        Name
        <input
          value={values.name}
          required maxLength={100} disabled={disabled} autoFocus
          onChange={(e) => onChange({ ...values, name: e.target.value })}
        />
      </label>
      <label className="field">
        Sort order
        <input
          type="number"
          required min={2} max={99} disabled={disabled}
          value={values.sortOrder}
          onChange={(e) => onChange({ ...values, sortOrder: Number(e.target.value) || 0 })}
        />
      </label>
      <p className="muted management-hint">Use 2 to 99. Lower numbers appear earlier in the pipeline.</p>
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        {submitLabel}
      </button>
    </form>
  )
}
