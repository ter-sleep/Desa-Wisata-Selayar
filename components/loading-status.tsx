import type { ReactNode } from 'react'

export function LoadingStatus({ className, children }: { className: string; children: ReactNode }) {
  return <div className={className} role="status">{children}</div>
}
