import type { PipelineApplication } from '../../types/domain'
import { ApplicationCard } from './ApplicationCard'
import { EmptyState } from '../shared'

export type StageColumnProps = {
  stageId: string
  stageName: string
  stageColor?: string
  applications: PipelineApplication[]
  selectedApplicationId?: string | null
  onSelectApplication?: (applicationId: string) => void
}

/** Owner: Abdul-Manan */
export function StageColumn({
  stageId,
  stageName,
  stageColor = '#64748b',
  applications,
  selectedApplicationId,
  onSelectApplication,
}: StageColumnProps) {
  return (
    <section className="stage-column" data-stage-id={stageId}>
      <header className="stage-column-head">
        <h2>
          <span className="rail" style={{ background: stageColor }} />
          {stageName}
        </h2>
        <span className="count">{applications.length}</span>
      </header>
      <div className="stage-column-body">
        {applications.length === 0 ? (
          <EmptyState title="Empty" message="No applications" />
        ) : (
          applications.map((a) => (
            <ApplicationCard
              key={a.applicationId}
              applicationId={a.applicationId}
              candidateName={a.candidateName || 'Candidate'}
              candidateEmail={a.candidateEmail}
              requisitionTitle={a.requisitionTitle}
              source={a.source}
              matchScore={a.matchScore}
              matchLabel={a.matchLabel}
              stageColor={stageColor}
              selected={selectedApplicationId === a.applicationId}
              onSelect={onSelectApplication}
            />
          ))
        )}
      </div>
    </section>
  )
}
