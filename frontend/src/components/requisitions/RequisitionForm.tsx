export type RequisitionFormValues = {
  title: string
  department: string
  employmentType: string
  seniority: string
  skills: string
  jobDescription: string
}

export type RequisitionFormProps = {
  values: RequisitionFormValues
  onChange: (values: RequisitionFormValues) => void
  onSubmit?: () => void | Promise<void>
  submitLabel?: string
  disabled?: boolean
  error?: string | null
}

/** Owner: Amina — create/edit requisition fields. */
export function RequisitionForm({
  values,
  onChange,
  onSubmit,
  submitLabel = 'Save',
  disabled = false,
  error,
}: RequisitionFormProps) {
  const set = <K extends keyof RequisitionFormValues>(key: K, value: RequisitionFormValues[K]) =>
    onChange({ ...values, [key]: value })

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <label className="field">
        Title
        <input
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          required
          disabled={disabled}
        />
      </label>
      <label className="field">
        Department
        <input
          value={values.department}
          onChange={(e) => set('department', e.target.value)}
          required
          disabled={disabled}
        />
      </label>
      <div className="row">
        <label className="field grow">
          Employment
          <select
            value={values.employmentType}
            onChange={(e) => set('employmentType', e.target.value)}
            disabled={disabled}
            required
          >
            <option>FullTime</option>
            <option>Contract</option>
          </select>
        </label>
        <label className="field grow">
          Seniority
          <select
            value={values.seniority}
            onChange={(e) => set('seniority', e.target.value)}
            disabled={disabled}
            required
          >
            <option>Junior</option>
            <option>Mid</option>
            <option>Senior</option>
          </select>
        </label>
      </div>
      <label className="field">
        Skills
        <input
          value={values.skills}
          onChange={(e) => set('skills', e.target.value)}
          required
          disabled={disabled}
        />
      </label>
      <label className="field">
        Job description
        <textarea
          value={values.jobDescription}
          onChange={(e) => set('jobDescription', e.target.value)}
          required
          disabled={disabled}
        />
      </label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        {disabled ? 'Creating…' : submitLabel}
      </button>
    </form>
  )
}
