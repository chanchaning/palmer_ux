import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

export type V = 'bad' | 'good'

export const won = (n: number) => n.toLocaleString('ko-KR') + '원'

/** 🚫 다크 패턴 / ✅ 좋은 대안 2단 토글 (원본 .dp-seg 그대로) */
export function DpSeg({ value, onChange }: { value: V; onChange: (v: V) => void }) {
  const opts: [V, string][] = [['bad', '🚫 다크 패턴'], ['good', '✅ 좋은 대안']]
  return (
    <div className="dp-seg" data-v={value}>
      <span className="dp-thumb" />
      {opts.map(([v, label]) => (
        <button key={v} type="button" data-v={v} aria-pressed={value === v} onClick={() => { if (value !== v) onChange(v) }}>{label}</button>
      ))}
    </div>
  )
}

/** 한쪽 화면 (배지 + 부제 + 내용) */
export function Pane({ v, cur, sub, subId, children }: { v: V; cur: V; sub: ReactNode; subId?: string; children: ReactNode }) {
  return (
    <div className="dp-pane" data-v={v} hidden={v !== cur}>
      <div className="dp-top">
        <span className={'dp-badge ' + v}>{v === 'bad' ? '다크 패턴' : '좋은 대안'}</span>
        <span className="muted" id={subId}>{sub}</span>
      </div>
      {children}
    </div>
  )
}

/** 짧게 깜빡여 '다시 불러왔어요' 표시 */
export function flash(el: Element | null) {
  if (!el) return
  el.classList.remove('dp-flash')
  void (el as HTMLElement).offsetWidth
  el.classList.add('dp-flash')
}

/** 카드가 화면에 보이는지 감시 (ref 요소가 속한 카드 기준) */
export function useSeen(ref: RefObject<HTMLElement | null>, cb: (on: boolean) => void) {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    const el = ref.current?.closest('.t-card') ?? ref.current
    if (!el) return
    const io = new IntersectionObserver(es => cbRef.current(es[es.length - 1].isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
}

export const Spacer = () => <div style={{ flex: 1 }} />
