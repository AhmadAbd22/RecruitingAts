import type { EmployeeListItem } from '../../types/domain'

export type RequisitionFormValues = {
  title: string
  department: string
  employmentType: string
  seniority: string
  skills: string
  jobDescription: string
  hiringManagerEmployeeId: string
  openings: number
}

export type RequisitionFormProps = {
  values: RequisitionFormValues
  onChange: (values: RequisitionFormValues) => void
  onSubmit?: () => void | Promise<void>
  submitLabel?: string
  disabled?: boolean
  saving?: boolean
  error?: string | null
  employees: EmployeeListItem[]
}

/** Owner: Amina — create/edit requisition fields. */
export function RequisitionForm({
  values,
  onChange,
  onSubmit,
  submitLabel = 'Save',
  disabled = false,
  saving = false,
  error,
  employees,
}: RequisitionFormProps) {
  const set = <K extends keyof RequisitionFormValues>(key: K, value: RequisitionFormValues[K]) =>
    onChange({ ...values, [key]: value })

  return (
    <form
      className="stack requisition-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <section className="form-section" aria-label="Job overview">
        <h3>Job overview</h3>
        <label className="field">
          Job title
          <input
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            required
            disabled={disabled}
            placeholder="e.g. .NET Developer"
          />
        </label>
        <label className="field">
          Department
          <input
            value={values.department}
            onChange={(e) => set('department', e.target.value)}
            required
            disabled={disabled}
            placeholder="e.g. Engineering"
          />
        </label>
        <div className="form-grid">
          <label className="field grow">
            Employment type
            <select
              value={values.employmentType}
              onChange={(e) => set('employmentType', e.target.value)}
              disabled={disabled}
              required
            >
              <option value="FullTime">Full time</option>
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
              <option value="Mid">Mid level</option>
              <option>Senior</option>
            </select>
          </label>
        </div>
      </section>
      <section className="form-section" aria-label="Hiring team and capacity">
        <h3>Hiring team and capacity</h3>
        <div className="form-grid">
          <label className="field">
            Hiring manager
            <select value={values.hiringManagerEmployeeId}
              onChange={(e) => set('hiringManagerEmployeeId', e.target.value)} required disabled={disabled}>
              <option value="">Select an employee</option>
              {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>
                {employee.fullName} - {employee.department}
              </option>)}
            </select>
          </label>
          <label className="field">
            Open positions
            <input type="number" min={1} max={1000} required disabled={disabled}
              value={values.openings} onChange={(e) => set('openings', Number(e.target.value))} />
          </label>
        </div>
        <p className="field-hint">Choose who is responsible for hiring. Use the job team to grant access to the requisition.</p>
      </section>
      <section className="form-section" aria-label="Skills and description">
        <h3>Skills and description</h3>
        <label className="field">
          Skills
          <input
            value={values.skills}
            onChange={(e) => set('skills', e.target.value)}
            required
            disabled={disabled}
            placeholder="e.g. C#, ASP.NET Core, SQL Server"
          />
        </label>
        <label className="field">
          Job description
          <textarea
            value={values.jobDescription}
            onChange={(e) => set('jobDescription', e.target.value)}
            required
            disabled={disabled}
            placeholder="Describe the role, responsibilities and experience you need."
            rows={5}
          />
        </label>
      </section>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {saving ? 'Creating...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
