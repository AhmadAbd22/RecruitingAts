import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import './DateField.css'

type DateFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}

// Keep the calendar's local day as YYYY-MM-DD; UTC conversion could change the day.
function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function DateField({ label, value, onChange, required = false, disabled = false }: DateFieldProps) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(new Date())
  const selected = value ? new Date(`${value}T00:00:00`) : undefined
  const selectedYear = selected?.getFullYear() ?? new Date().getFullYear()
  const currentYear = new Date().getFullYear()

  function closeCalendar() {
    dialog.current?.close()
    setOpen(false)
  }

  function openCalendar() {
    setMonth(selected ?? new Date())
    setOpen(true)
    dialog.current?.showModal()
  }

  function chooseDate(date: Date | undefined) {
    onChange(date ? dateValue(date) : '')
    closeCalendar()
  }

  return (
    <div className="field date-field">
      <label htmlFor={id}>{label}{required && <span className="date-required" aria-hidden="true"> *</span>}</label>
      <div className="date-entry">
        <input id={id} type="date" value={value} required={required} disabled={disabled}
          aria-describedby={`${id}-hint`} onChange={(event) => onChange(event.target.value)}
          onClick={(event) => { event.preventDefault(); openCalendar() }} />
        <button type="button" className="date-open" disabled={disabled}
          aria-label={`Open calendar for ${label}`} aria-haspopup="dialog" aria-expanded={open}
          aria-controls={`${id}-calendar`} onClick={openCalendar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" /></svg>
        </button>
      </div>
      <span id={`${id}-hint`} className="field-hint">{selected
        ? selected.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Pick from the calendar or type a date.'}</span>
      {createPortal(
        <dialog ref={dialog} id={`${id}-calendar`} className="date-calendar" aria-labelledby={`${id}-title`}
          onClose={() => setOpen(false)}
          onCancel={(event) => { event.preventDefault(); event.stopPropagation(); closeCalendar() }}
          onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation() }}
          onClick={(event) => { if (event.target === event.currentTarget) closeCalendar() }}>
          <div className="date-calendar-content">
            <header className="date-calendar-head">
              <div><span>Choose a date</span><h2 id={`${id}-title`}>{label}</h2></div>
              <button type="button" className="date-calendar-close" aria-label="Close calendar" onClick={closeCalendar}>×</button>
            </header>
            {open && <DayPicker mode="single" required selected={selected} onSelect={chooseDate}
              month={month} onMonthChange={setMonth} captionLayout="dropdown" navLayout="after"
              startMonth={new Date(Math.min(currentYear - 100, selectedYear), 0)}
              endMonth={new Date(Math.max(currentYear + 20, selectedYear), 11)}
              showOutsideDays fixedWeeks autoFocus />}
            <footer className="date-calendar-foot">
              <button type="button" className="btn btn-ghost" onClick={() => chooseDate(new Date())}>Today</button>
              <button type="button" className="btn btn-ghost" disabled={!value} onClick={() => chooseDate(undefined)}>Clear date</button>
            </footer>
          </div>
        </dialog>, document.body,
      )}
    </div>
  )
}
