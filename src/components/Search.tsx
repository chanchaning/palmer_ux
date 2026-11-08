import { useEffect, useMemo, useRef, useState } from 'react'
import { guides } from '../guides/registry'
import { IconSearch } from './icons'

interface Hit { href: string; title: string; sub: string; guide: string; kind: 'guide' | 'card' }

const ALL: Hit[] = guides.flatMap(g => [
  { href: '#/' + g.id, title: g.nav, sub: g.title, guide: g.num + ' ' + g.group, kind: 'guide' as const },
  ...g.cards.map(c => ({ href: `#/${g.id}/${c.id}`, title: c.title, sub: c.desc, guide: `${g.num} ${g.nav}`, kind: 'card' as const })),
])
const norm = (s: string) => s.toLowerCase().replace(/[\s·・\-_/]/g, '')

/** ⌘K 검색 */
export function Search({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  const hits = useMemo(() => {
    const k = norm(q)
    if (!k) return ALL.filter(h => h.kind === 'guide')
    const score = (h: Hit) => {
      const t = norm(h.title), s = norm(h.sub)
      if (t.startsWith(k)) return 0
      if (t.includes(k)) return 1
      if (s.includes(k)) return 2
      if (norm(h.guide).includes(k)) return 3
      return -1
    }
    return ALL.map(h => [score(h), h] as const).filter(([s]) => s >= 0).sort((a, b) => a[0] - b[0]).map(([, h]) => h).slice(0, 40)
  }, [q])

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => input.current?.focus()) } }, [open])
  useEffect(() => { setSel(0) }, [q])
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null
  const go = (h?: Hit) => { if (!h) return; location.hash = h.href; onClose() }

  return (
    <div className="search-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-box" role="dialog" aria-modal="true" aria-label="검색">
        <label className="search-input">
          <IconSearch />
          <input ref={input} value={q} placeholder="컴포넌트, 패턴, 법칙 이름…" onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(hits.length - 1, s + 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
              else if (e.key === 'Enter') go(hits[sel])
              else if (e.key === 'Escape') onClose()
            }} />
          <kbd>Esc</kbd>
        </label>
        <ul className="search-list" ref={list}>
          {hits.length === 0 && <li className="search-empty">‘{q}’에 맞는 카드가 없어요. 다른 이름으로 찾아보세요.</li>}
          {hits.map((h, i) => (
            <li key={h.href} data-i={i}>
              <a href={h.href} className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={e => { e.preventDefault(); go(h) }}>
                <span className="search-kind">{h.kind === 'guide' ? '가이드' : h.guide}</span>
                <b>{h.title}</b>
                <small>{h.sub}</small>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
