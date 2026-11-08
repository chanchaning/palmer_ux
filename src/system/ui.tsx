/* 디자인 시스템 탭 공용 UI */
import { useState, type ReactNode } from 'react'

/** 탭 안의 한 덩어리(카드). wide=true 면 그리드 전체 폭 */
export function Section({ id, title, desc, wide, aside, children }: {
  id: string; title: ReactNode; desc?: ReactNode; wide?: boolean; aside?: ReactNode; children: ReactNode
}) {
  return (
    <section className={'sys-sec' + (wide ? ' wide' : '')} id={id}>
      <header className="sys-sec-head">
        <div>
          <h3>{title}</h3>
          {desc && <p>{desc}</p>}
        </div>
        {aside}
      </header>
      <div className="sys-sec-body">{children}</div>
    </section>
  )
}

/** 탭 본문 그리드 */
export function SysGrid({ children }: { children: ReactNode }) {
  return <div className="sys-grid">{children}</div>
}

/** 짧은 설명 + 실무 팁 */
export function Note({ children, tone }: { children: ReactNode; tone?: 'tip' | 'warn' }) {
  return <div className={'sys-note' + (tone ? ' is-' + tone : '')}>{children}</div>
}

/** 코드 블록 + 복사 */
export function CodeBlock({ code, label = 'CSS', maxHeight = 320 }: { code: string; label?: string; maxHeight?: number }) {
  const [ok, setOk] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(code) } catch { /* 복사 불가 환경 */ }
    setOk(true); setTimeout(() => setOk(false), 1400)
  }
  return (
    <div className="sys-code">
      <div className="sys-code-bar"><span>{label}</span><button className="btn ghost sm" onClick={copy}>{ok ? '✓ 복사됨' : '복사'}</button></div>
      <pre style={{ maxHeight }}><code>{code}</code></pre>
    </div>
  )
}

/** 슬라이더 한 줄 (라벨 · 값) */
export function SliderRow({ label, value, unit = '', children, hint, ok }: { label: ReactNode; value: ReactNode; unit?: string; children: ReactNode; hint?: ReactNode; ok?: boolean }) {
  return (
    <div className="sys-slider">
      <div className="sys-slider-top"><span>{label}</span><b className={ok === undefined ? '' : ok ? 'is-ok' : 'is-bad'}>{value}{unit}</b></div>
      {children}
      {hint && <div className="sys-slider-hint">{hint}</div>}
    </div>
  )
}
