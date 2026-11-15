import type { ReactNode } from 'react'

/** 라벨 + 선택지 */
export function Knob({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="dn-knob"><span className="dn-knob-l">{label}</span>{children}</div>
}

/** 체크 아이콘 (선 그리기용 path 포함) */
export function CheckSvg({ size = 64, className = '', circle = true }: { size?: number; className?: string; circle?: boolean }) {
  return (
    <svg className={'dn-ck ' + className} width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      {circle && <circle className="dn-ck-c" cx="26" cy="26" r="23" pathLength={1} />}
      <path className="dn-ck-p" d="M15 27 l7.5 7.5 L38 19" pathLength={1} />
    </svg>
  )
}
