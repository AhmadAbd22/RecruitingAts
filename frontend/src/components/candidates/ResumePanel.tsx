import { Button } from '../shared'

export type ResumePanelProps = {
  hasResume: boolean
  fileName?: string | null
  canManage?: boolean
  onDownload?: () => void
  onUpload?: (file: File) => void
}

/** Owner: Ibtesam — POST/GET resume */
export function ResumePanel({
  hasResume,
  fileName,
  canManage,
  onDownload,
  onUpload,
}: ResumePanelProps) {
  return (
    <section className="panel">
      <h2>Résumé</h2>
      {hasResume ? (
        <>
          <p>
            <strong>{fileName || 'resume.pdf'}</strong>
          </p>
          <div className="row">
            <Button onClick={onDownload}>Download PDF</Button>
            {canManage ? (
              <label className="btn btn-ghost">
                Replace
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onUpload?.(f)
                  }}
                />
              </label>
            ) : null}
          </div>
        </>
      ) : canManage ? (
        <label className="btn btn-primary">
          Upload PDF
          <input
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload?.(f)
            }}
          />
        </label>
      ) : (
        <p className="muted">No résumé on file.</p>
      )}
    </section>
  )
}
