export type ApiGapBannerProps = {
  contract: string
  note: string
}

/** Flag UI built ahead of a missing API contract. */
export function ApiGapBanner({ contract, note }: ApiGapBannerProps) {
  return (
    <div className="api-gap" role="note">
      <strong>API gap</strong> · <code>{contract}</code> — {note}
    </div>
  )
}
