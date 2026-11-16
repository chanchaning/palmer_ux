import type { ReactNode } from 'react'

/** 라벨 + 선택지 */
export function Knob({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="hv-knob"><span className="hv-knob-l">{label}</span>{children}</div>
}
