const labels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
}

export function StatusBadge({ status }: { status: string }) {
  const label = labels[status] || status
  return <span className={`status status--${status}`}>{label}</span>
}
