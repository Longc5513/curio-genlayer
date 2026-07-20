import type { BountyStatus } from '../lib/types'

const labels: Record<BountyStatus, string> = {
  open: 'Open',
  submitted: 'Awaiting consensus',
  more_info: 'More info requested',
  paid: 'Paid',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

export function StatusBadge({ status }: { status: BountyStatus }) {
  return <span className={`status status--${status}`}>{labels[status]}</span>
}
