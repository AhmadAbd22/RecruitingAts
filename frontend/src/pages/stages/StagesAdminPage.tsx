import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  createWorkingPipelineStage,
  listAdminPipelineStages,
  renamePipelineStage,
  setPipelineStageActive,
  type PipelineStageAdmin,
} from '../../api/client'
import { StageCatalogTable, StageForm } from '../../components/stages'
import type { StageFormValues } from '../../components/stages'
import { Button, EmptyState, Modal, PageHeader } from '../../components/shared'
import type { PipelineStage } from '../../types/domain'

function toCatalogStage(stage: PipelineStageAdmin): PipelineStage {
  return {
    pipelineStageId: stage.pipelineStageId,
    name: stage.name,
    sortOrder: stage.sortOrder,
    isReserved: stage.isReserved,
    isTerminal: stage.isTerminal,
    terminal: stage.isTerminal,
    isActive: stage.isActive,
  }
}

/** Owner: Amina — FR-ATS-003 admin-managed working stages. */
export function StagesAdminPage() {
  const [stages, setStages] = useState<PipelineStageAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<StageFormValues>({ name: '', sortOrder: 10 })
  const [createPending, setCreatePending] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renamePending, setRenamePending] = useState(false)

  async function loadStages() {
    setLoading(true)
    setError(null)
    try {
      const items = await listAdminPipelineStages()
      setStages(items)
    } catch (cause) {
      if (axios.isAxiosError<{ message?: string }>(cause)) {
        setError(cause.response?.data?.message ?? cause.message)
      } else if (cause instanceof Error) {
        setError(cause.message)
      } else {
        setError('Unable to load pipeline stages.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStages()
  }, [])

  return (
    <div className="page">
      <PageHeader
        title="Pipeline stages"
        subtitle="Reserved stages are locked. Working stages can be added, renamed, or deactivated."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            Add working stage
          </Button>
        }
      />
      {actionError ? (
        <p className="error" role="alert">
          {actionError}
        </p>
      ) : null}
      {loading ? (
        <EmptyState title="Loading stages" message="Loading the stage catalog…" />
      ) : error ? (
        <div className="panel">
          <p className="error" role="alert">
            {error}
          </p>
          <Button variant="primary" onClick={() => void loadStages()}>
            Retry
          </Button>
        </div>
      ) : (
        <StageCatalogTable
          stages={stages.map(toCatalogStage)}
          onRename={(pipelineStageId) => {
            const stage = stages.find((s) => s.pipelineStageId === pipelineStageId)
            if (!stage || stage.isReserved) return
            setRenameId(pipelineStageId)
            setRenameValue(stage.name)
            setActionError(null)
          }}
          onDeactivate={async (pipelineStageId) => {
            const stage = stages.find((s) => s.pipelineStageId === pipelineStageId)
            if (!stage || stage.isReserved) return
            setActionError(null)
            try {
              const updated = await setPipelineStageActive(pipelineStageId, !stage.isActive)
              setStages((current) =>
                current.map((item) =>
                  item.pipelineStageId === updated.pipelineStageId ? updated : item,
                ),
              )
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setActionError(cause.response?.data?.message ?? cause.message)
              } else if (cause instanceof Error) {
                setActionError(cause.message)
              } else {
                setActionError('Unable to update stage activity.')
              }
            }
          }}
        />
      )}
      <Modal open={open} title="Add working stage" onClose={() => !createPending && setOpen(false)}>
        <StageForm
          values={form}
          onChange={setForm}
          submitLabel={createPending ? 'Adding…' : 'Add stage'}
          onSubmit={async () => {
            if (createPending) return
            setCreatePending(true)
            setCreateError(null)
            try {
              const created = await createWorkingPipelineStage(form.name.trim(), form.sortOrder)
              setStages((current) => [...current, created])
              setForm({ name: '', sortOrder: 10 })
              setOpen(false)
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setCreateError(cause.response?.data?.message ?? cause.message)
              } else if (cause instanceof Error) {
                setCreateError(cause.message)
              } else {
                setCreateError('Unable to create the working stage.')
              }
            } finally {
              setCreatePending(false)
            }
          }}
        />
        {createError ? (
          <p className="error" role="alert">
            {createError}
          </p>
        ) : null}
      </Modal>
      <Modal
        open={renameId !== null}
        title="Rename working stage"
        onClose={() => !renamePending && setRenameId(null)}
        footer={
          <div className="row end">
            <Button variant="ghost" disabled={renamePending} onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={renamePending || !renameValue.trim()}
              onClick={async () => {
                if (!renameId || renamePending) return
                setRenamePending(true)
                setActionError(null)
                try {
                  const updated = await renamePipelineStage(renameId, renameValue.trim())
                  setStages((current) =>
                    current.map((item) =>
                      item.pipelineStageId === updated.pipelineStageId ? updated : item,
                    ),
                  )
                  setRenameId(null)
                } catch (cause) {
                  if (axios.isAxiosError<{ message?: string }>(cause)) {
                    setActionError(cause.response?.data?.message ?? cause.message)
                  } else if (cause instanceof Error) {
                    setActionError(cause.message)
                  } else {
                    setActionError('Unable to rename the stage.')
                  }
                } finally {
                  setRenamePending(false)
                }
              }}
            >
              {renamePending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <label className="field">
          Name
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            disabled={renamePending}
            autoFocus
          />
        </label>
      </Modal>
    </div>
  )
}
