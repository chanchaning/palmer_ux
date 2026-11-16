import type { ReactNode } from 'react'

/** 라벨 + 선택지 */
export function Knob({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="mc-knob"><span className="mc-knob-l">{label}</span>{children}</div>
}
