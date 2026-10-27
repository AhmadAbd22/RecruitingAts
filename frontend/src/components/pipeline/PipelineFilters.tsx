export type PipelineFilterOption = { value: string; label: string }

export type PipelineFiltersProps = {
  requisitionId: string
  source: string
  requisitionOptions: PipelineFilterOption[]
  sourceOptions: PipelineFilterOption[]
  onRequisitionChange: (value: string) => void
  onSourceChange: (value: string) => void
}

/** Owner: Abdul-Manan */
export function PipelineFilters({
  requisitionId,
  source,
  requisitionOptions,
  sourceOptions,
  onRequisitionChange,
  onSourceChange,
}: PipelineFiltersProps) {
  return (
    <div className="row wrap">
      <label className="field">
        Requisition
        <select value={requisitionId} onChange={(e) => onRequisitionChange(e.target.value)}>
          {requisitionOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Source
        <select value={source} onChange={(e) => onSourceChange(e.target.value)}>
          {sourceOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
