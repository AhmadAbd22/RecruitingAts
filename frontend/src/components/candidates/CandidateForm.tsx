export type CandidateFormValues = {
  fullName: string
  email: string
  phone: string
  skills: string
  source: string
}

export type CandidateFormProps = {
  values: CandidateFormValues
  onChange: (values: CandidateFormValues) => void
  onCheckDuplicates?: () => void
  onSubmit?: () => void
}

/** Owner: Ibtesam */
export function CandidateForm({
  values,
  onChange,
  onCheckDuplicates,
  onSubmit,
}: CandidateFormProps) {
  const set = <K extends keyof CandidateFormValues>(key: K, value: CandidateFormValues[K]) =>
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
        Full name
        <input value={values.fullName} onChange={(e) => set('fullName', e.target.value)} />
      </label>
      <label className="field">
        Email
        <input
          type="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </label>
      <label className="field">
        Phone
        <input value={values.phone} onChange={(e) => set('phone', e.target.value)} />
      </label>
      <label className="field">
        Skills
        <input value={values.skills} onChange={(e) => set('skills', e.target.value)} />
      </label>
      <label className="field">
        Source
        <select value={values.source} onChange={(e) => set('source', e.target.value)}>
          <option>Referral</option>
          <option>LinkedIn</option>
          <option>Career site</option>
          <option>Agency</option>
        </select>
      </label>
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={onCheckDuplicates}>
          Check duplicates
        </button>
        <button type="submit" className="btn btn-primary">
          Create
        </button>
      </div>
      {/* TODO: POST /api/candidates + duplicates */}
    </form>
  )
}
