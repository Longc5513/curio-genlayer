import type { ReactNode } from 'react'

interface Props {
  tone?: 'neutral' | 'warning' | 'danger' | 'success'
  title: string
  children: ReactNode
  action?: ReactNode
}

export function StatePanel({ tone = 'neutral', title, children, action }: Props) {
  return (
    <section className={`state-panel state-panel--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      {action}
    </section>
  )
}
