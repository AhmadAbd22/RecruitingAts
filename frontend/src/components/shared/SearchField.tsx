export type SearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
}: SearchFieldProps) {
  return (
    <label className="field">
      {label}
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
