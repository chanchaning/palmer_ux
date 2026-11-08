/* 용어 풀이 — 어려운 말에 점선 밑줄, 누르거나 올리면 쉬운 뜻이 떠요.
 *   <Term k="트립" />              사전(src/lib/glossary.ts)의 뜻, 화면엔 '트립'
 *   <Term k="트립">트립돼요</Term>  화면 글자를 따로 지정
 *   <Term k="북부 1선" d="…" />     사전에 없는 말은 d 로 뜻을 직접
 *   <TermList keys={[…]} />        탭 위 '이 탭에 나오는 말' 상자 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { GLOSSARY } from '../lib/glossary'

export function Term({ k, d, children }: { k: string; d?: string; children?: ReactNode }) {
  const def = d ?? GLOSSARY[k]
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    // 팝업이 화면 밖으로 나가지 않게: 화면 좌우 12px 안으로 가둬요
    const r = ref.current?.getBoundingClientRect()
    if (r) {
      const w = Math.min(280, innerWidth * 0.8), want = Math.max(12, Math.min(r.left, innerWidth - 12 - w))
      setShift(want - r.left)
    }
    const off = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc) }
  }, [open])
  if (!def) return <>{children ?? k}</>
  return (
    <span className="term" ref={ref}
      onMouseEnter={e => { if (e.nativeEvent instanceof MouseEvent && matchMedia('(hover: hover)').matches) setOpen(true) }}
      onMouseLeave={() => { if (matchMedia('(hover: hover)').matches) setOpen(false) }}>
      <button type="button" className="term-w" aria-expanded={open} aria-describedby={open ? id : undefined}
        onClick={() => setOpen(o => !o)}>{children ?? k}</button>
      {open && <span className="term-pop" style={{ left: shift }} role="tooltip" id={id}><b>{k}</b>{def}</span>}
    </span>
  )
}

/** 탭 맨 위 '이 탭에 나오는 말' — 처음 읽기 전에 훑어보는 용어 상자 */
export function TermList({ keys, extra = {} }: { keys: string[]; extra?: Record<string, string> }) {
  const items = keys.map(k => [k, extra[k] ?? GLOSSARY[k]] as const).filter(([, d]) => d)
  const [open, setOpen] = useState(true)
  return (
    <section className="termlist">
      <button type="button" className="termlist-head" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <b>이 탭에 나오는 말</b><span>{items.length}개 · {open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <dl>
          {items.map(([k, d]) => <div key={k}><dt>{k}</dt><dd>{d}</dd></div>)}
        </dl>
      )}
    </section>
  )
}
