export type FeedbackFormValues = {
  rating: number
  strengths: string
  concerns: string
  recommendation: string
}

export type FeedbackFormProps = {
  values: FeedbackFormValues
  onChange: (values: FeedbackFormValues) => void
  onSubmit?: () => void
}

/** Owner: Tayyab — FR-INT-006 */
export function FeedbackForm({ values, onChange, onSubmit }: FeedbackFormProps) {
  const set = <K extends keyof FeedbackFormValues>(key: K, value: FeedbackFormValues[K]) =>
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
        Rating (1–5)
        <select
          value={values.rating}
          onChange={(e) => set('rating', Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Strengths
        <textarea value={values.strengths} onChange={(e) => set('strengths', e.target.value)} />
      </label>
      <label className="field">
        Concerns
        <textarea value={values.concerns} onChange={(e) => set('concerns', e.target.value)} />
      </label>
      <label className="field">
        Recommendation
        <select
          value={values.recommendation}
          onChange={(e) => set('recommendation', e.target.value)}
        >
          <option>Advance</option>
          <option>Hold</option>
          <option>Reject</option>
        </select>
      </label>
      <button type="submit" className="btn btn-primary">
        Submit feedback
      </button>
      {/* TODO: POST feedback — API gap until interviews ship */}
    </form>
  )
}
