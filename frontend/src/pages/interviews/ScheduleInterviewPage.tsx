import { useState } from 'react'
import { PanelPicker } from '../../components/interviews'
import { ApiGapBanner, Button, PageHeader } from '../../components/shared'

/** Owner: Abdul-Manan */
export function ScheduleInterviewPage() {
  const [selected, setSelected] = useState<string[]>([])
  const [lead, setLead] = useState<string | null>(null)

  return (
    <div className="page">
      <PageHeader title="Schedule interview" subtitle="Panel from requisition team · one lead." />
      <ApiGapBanner contract="POST /api/interviews" note="Schedule + calendar log not in backend yet." />
      <div className="panel stack">
        <label className="field">
          Application
          <select>
            <option value="">Select application…</option>
          </select>
        </label>
        <div className="row">
          <label className="field grow">
            Type
            <select defaultValue="Technical">
              <option>Technical</option>
              <option>Panel</option>
              <option>Final</option>
            </select>
          </label>
          <label className="field grow">
            Mode
            <select defaultValue="Video">
              <option>Video</option>
              <option>Onsite</option>
              <option>Phone</option>
            </select>
          </label>
        </div>
        <label className="field">
          When
          <input type="datetime-local" />
        </label>
        <h3>Panel</h3>
        <PanelPicker
          members={[]}
          selectedEmployeeIds={selected}
          leadEmployeeId={lead}
          onToggleMember={(id) =>
            setSelected((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }
          onLeadChange={setLead}
        />
        <Button variant="primary">Schedule</Button>
      </div>
    </div>
  )
}
