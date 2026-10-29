export type StageFormValues = {
  name: string
  sortOrder: number
}

export type StageFormProps = {
  values: StageFormValues
  onChange: (values: StageFormValues) => void
  onSubmit?: () => void
  submitLabel?: string
}

/** Owner: Amina */
export function StageForm({
  values,
  onChange,
  onSubmit,
  submitLabel = 'Add stage',
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
          onChange={(e) => onChange({ ...values, name: e.target.value })}
        />
      </label>
      <label className="field">
        Sort order
        <input
          type="number"
          value={values.sortOrder}
          onChange={(e) => onChange({ ...values, sortOrder: Number(e.target.value) || 0 })}
        />
      </label>
      <button type="submit" className="btn btn-primary">
        {submitLabel}
      </button>
    </form>
  )
}
