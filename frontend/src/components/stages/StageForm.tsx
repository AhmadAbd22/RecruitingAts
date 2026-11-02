export type StageFormValues = {
  name: string
  sortOrder: number
}

export type StageFormProps = {
  values: StageFormValues
  onChange: (values: StageFormValues) => void
  onSubmit?: () => void | Promise<void>
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
        void onSubmit?.()
      }}
    >
      <label className="field">
        Name
        <input
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          required
          disabled={disabled}
        />
      </label>
      <label className="field">
        Sort order
        <input
          type="number"
          value={values.sortOrder}
          onChange={(e) => onChange({ ...values, sortOrder: Number(e.target.value) || 0 })}
          disabled={disabled}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        {submitLabel}
      </button>
    </form>
  )
}
