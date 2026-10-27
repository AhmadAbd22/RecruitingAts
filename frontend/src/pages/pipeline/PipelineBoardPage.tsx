import { useState } from 'react'
import { ApiGapBanner, PageHeader } from '../../components/shared'
import {
  PipelineFilters,
  StageColumn,
  StageMoveDrawer,
} from '../../components/pipeline'

/** Owner: Abdul-Manan */
export function PipelineBoardPage() {
  const [req, setReq] = useState('all')
  const [source, setSource] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stageId, setStageId] = useState('')
  const [reason, setReason] = useState('')

  return (
    <div className="page">
      <PageHeader
        title="Pipeline board"
        subtitle="GET /api/applications/pipeline — compose columns + drawer."
      />
      <ApiGapBanner
        contract="matchScore on ApplicationPipelineItemDto"
        note="Advisory badge is UI-ready; field may be missing until FR-APP-004."
      />
      <PipelineFilters
        requisitionId={req}
        source={source}
        requisitionOptions={[{ value: 'all', label: 'All in scope' }]}
        sourceOptions={[
          { value: 'all', label: 'Any' },
          { value: 'Referral', label: 'Referral' },
          { value: 'LinkedIn', label: 'LinkedIn' },
        ]}
        onRequisitionChange={setReq}
        onSourceChange={setSource}
      />
      <div className="board-row">
        {/* TODO: map stages from API */}
        <StageColumn
          stageId="applied"
          stageName="Applied"
          applications={[]}
          selectedApplicationId={selectedId}
          onSelectApplication={setSelectedId}
        />
        <StageColumn
          stageId="screening"
          stageName="Screening"
          stageColor="#0f8b7a"
          applications={[]}
          selectedApplicationId={selectedId}
          onSelectApplication={setSelectedId}
        />
      </div>
      <StageMoveDrawer
        open={!!selectedId}
        applicationId={selectedId}
        stages={[]}
        selectedStageId={stageId}
        dispositionReason={reason}
        onDispositionReasonChange={setReason}
        onStageChange={setStageId}
        onClose={() => setSelectedId(null)}
        onConfirm={() => setSelectedId(null)}
      />
    </div>
  )
}
