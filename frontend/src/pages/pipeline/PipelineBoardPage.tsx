import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { getPipeline, getPipelineStages, updateApplicationStage } from '../../api/client'
import type {
  ApplicationPipelineItemDto,
  PipelineApplication,
  PipelineStage,
  UpdateApplicationStageRequest,
} from '../../types/domain'
import { Button, EmptyState, PageHeader } from '../../components/shared'
import { StageColumn, StageMoveDrawer } from '../../components/pipeline'

/** Owner: Abdul-Manan */
export function PipelineBoardPage() {
  const [applications, setApplications] = useState<ApplicationPipelineItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [stagesLoading, setStagesLoading] = useState(true)
  const [stagesError, setStagesError] = useState<string | null>(null)
  const [stagesLoadAttempt, setStagesLoadAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stageId, setStageId] = useState('')
  const [reason, setReason] = useState('')
  const [stageUpdateError, setStageUpdateError] = useState<string | null>(null)
  const [stageUpdatePending, setStageUpdatePending] = useState(false)
  const stageUpdateLock = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadPipeline() {
      setLoading(true)
      setError(null)

      try {
        const data = await getPipeline()
        if (!cancelled) setApplications(data)
      } catch (cause) {
        if (cancelled) return
        if (axios.isAxiosError<{ message?: string }>(cause)) {
          setError(cause.response?.data?.message ?? cause.message)
        } else if (cause instanceof Error) {
          setError(cause.message)
        } else {
          setError('An unexpected error occurred while loading the pipeline.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPipeline()
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  useEffect(() => {
    let cancelled = false

    async function loadPipelineStages() {
      setStagesLoading(true)
      setStagesError(null)

      try {
        const data = await getPipelineStages()
        if (!cancelled) {
          setPipelineStages([...data].sort((a, b) => a.sortOrder - b.sortOrder))
        }
      } catch (cause) {
        if (cancelled) return
        if (axios.isAxiosError<{ message?: string }>(cause)) {
          setStagesError(cause.response?.data?.message ?? cause.message)
        } else if (cause instanceof Error) {
          setStagesError(cause.message)
        } else {
          setStagesError('An unexpected error occurred while loading pipeline stages.')
        }
      } finally {
        if (!cancelled) setStagesLoading(false)
      }
    }

    void loadPipelineStages()
    return () => {
      cancelled = true
    }
  }, [stagesLoadAttempt])

  const stages = new Map<string, { stageId: string; stageName: string; applications: PipelineApplication[] }>()
  for (const application of applications) {
    const key = JSON.stringify([application.pipelineStageId, application.stageName])
    let stage = stages.get(key)
    if (!stage) {
      stage = {
        stageId: application.pipelineStageId,
        stageName: application.stageName,
        applications: [],
      }
      stages.set(key, stage)
    }
    stage.applications.push({
      applicationId: application.applicationId,
      candidateId: application.candidateId,
      requisitionId: application.requisitionId,
      requisitionTitle: application.requisitionTitle,
      pipelineStageId: application.pipelineStageId,
      stageName: application.stageName,
      source: application.source,
      createdAt: application.createdAt,
    })
  }

  const selectedApplication = applications.find(
    (application) => application.applicationId === selectedId,
  )
  const selectedStage = pipelineStages.find((stage) => stage.pipelineStageId === stageId)
  const needsDisposition =
    selectedStage?.name === 'Disqualified' || selectedStage?.name === 'NFA'

  function selectApplication(applicationId: string) {
    const application = applications.find((item) => item.applicationId === applicationId)
    if (!application) return

    setSelectedId(applicationId)
    setStageId(application.pipelineStageId)
    setReason('')
    setStageUpdateError(null)
  }

  async function submitStageUpdate() {
    if (
      !selectedId ||
      !stageId ||
      stagesLoading ||
      stagesError ||
      pipelineStages.length === 0 ||
      stageUpdateLock.current
    ) return

    const dispositionReason = reason.trim()
    if (needsDisposition && !dispositionReason) {
      setStageUpdateError('A disposition reason is required for Disqualified or NFA.')
      return
    }

    const request: UpdateApplicationStageRequest = {
      pipelineStageId: stageId,
      dispositionReason: needsDisposition ? dispositionReason : null,
    }

    stageUpdateLock.current = true
    setStageUpdatePending(true)
    setStageUpdateError(null)

    try {
      await updateApplicationStage(selectedId, request)
      setSelectedId(null)
      setLoadAttempt((attempt) => attempt + 1)
    } catch (cause) {
      if (axios.isAxiosError<{ message?: string }>(cause)) {
        setStageUpdateError(
          cause.response?.data?.message ?? cause.message ?? 'Unable to update the application stage.',
        )
      } else if (cause instanceof Error) {
        setStageUpdateError(cause.message)
      } else {
        setStageUpdateError('An unexpected error occurred while updating the application stage.')
      }
    } finally {
      stageUpdateLock.current = false
      setStageUpdatePending(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Pipeline board"
        subtitle="Applications in requisitions you can access."
      />
      {stagesLoading ? (
        <div className="empty-state" role="status">Loading pipeline stages…</div>
      ) : stagesError ? (
        <div className="panel">
          <p className="error" role="alert">{stagesError}</p>
          <Button
            variant="primary"
            onClick={() => setStagesLoadAttempt((attempt) => attempt + 1)}
          >
            Retry stage catalog
          </Button>
        </div>
      ) : pipelineStages.length === 0 ? (
        <EmptyState
          title="No active pipeline stages"
          message="The stage catalog returned no active stages, so applications cannot be moved."
        />
      ) : null}
      {loading ? (
        <div className="empty-state" role="status">
          Loading pipeline…
        </div>
      ) : error ? (
        <div className="panel">
          <p className="error" role="alert">{error}</p>
          <Button variant="primary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            Retry
          </Button>
        </div>
      ) : applications.length === 0 ? (
        <EmptyState title="No applications" message="There are no applications in your accessible pipeline." />
      ) : (
        <div className="board-row">
          {[...stages.values()].map((stage) => (
            <StageColumn
              key={stage.stageId + stage.stageName}
              stageId={stage.stageId}
              stageName={stage.stageName}
              applications={stage.applications}
              selectedApplicationId={selectedId}
              onSelectApplication={selectApplication}
            />
          ))}
        </div>
      )}
      <StageMoveDrawer
        open={!!selectedApplication}
        applicationId={selectedId}
        candidateName="Update application stage"
        currentStageId={selectedApplication?.pipelineStageId}
        stages={pipelineStages}
        stagesLoading={stagesLoading}
        stagesError={stagesError}
        onRetryStages={() => setStagesLoadAttempt((attempt) => attempt + 1)}
        selectedStageId={stageId}
        dispositionReason={reason}
        onDispositionReasonChange={(value) => {
          setReason(value)
          setStageUpdateError(null)
        }}
        onStageChange={(value) => {
          setStageId(value)
          setStageUpdateError(null)
        }}
        needsDisposition={needsDisposition}
        error={stageUpdateError}
        isSubmitting={stageUpdatePending}
        canSubmitStage={!!pipelineStages.length && !stagesLoading && !stagesError}
        onClose={() => {
          if (stageUpdateLock.current) return
          setSelectedId(null)
          setStageUpdateError(null)
        }}
        onConfirm={() => void submitStageUpdate()}
      />
    </div>
  )
}
