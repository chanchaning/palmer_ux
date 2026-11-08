import { Suspense, useEffect, useRef, useState } from 'react'
import type { Guide } from '../guides/registry'

/** 가이드 페이지: 헤더 · 점프 칩(스크롤 스파이) · 본문 */
export function GuidePage({ guide, focusCard }: { guide: Guide; focusCard?: string }) {
  const { Component } = guide
  return (
    <section className="page on" data-page={guide.id} key={guide.id}>
      <div className="page-head">
        <div>
          <div className="kicker">
            <span className="kicker-num" aria-hidden="true">{guide.num}</span>
            <span className="kicker-group">{guide.group}</span>
          </div>
          <h2 className="page-title">{guide.title}</h2>
          <p className="page-desc">{guide.desc}</p>
        </div>
        <div className="stats">
          {guide.stats.map(([n, l]) => <div className="stat" key={l}><b>{n}</b><span>{l}</span></div>)}
        </div>
      </div>
      <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
        <JumpAndBody guideId={guide.id} focusCard={focusCard}><Component /></JumpAndBody>
      </Suspense>
    </section>
  )
}

interface Chip { id: string; label: string }

function JumpAndBody({ children, guideId, focusCard }: { children: React.ReactNode; guideId: string; focusCard?: string }) {
  const body = useRef<HTMLDivElement>(null)
  const jump = useRef<HTMLDivElement>(null)
  const [chips, setChips] = useState<Chip[]>([])
  const [active, setActive] = useState(-1)

  // 카드에서 칩 목록 수집 + 등장 효과
  useEffect(() => {
    const cards = [...(body.current?.querySelectorAll<HTMLElement>('.card') ?? [])]
    setChips(cards.map((c, i) => {
      const h = c.querySelector('h2')?.cloneNode(true) as HTMLElement | undefined
      h?.querySelectorAll('.en-title').forEach(e => e.remove())
      const num = c.querySelector('.num')?.textContent ?? ''
      if (!c.id) c.id = 'card-' + i
      return { id: c.id, label: (num + ' ' + (h?.textContent ?? '')).replace(/\s*vs\s*/, ' · ').trim() }
    }))
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('reveal'); io.unobserve(e.target) }
    }), { threshold: 0.08 })
    cards.forEach(c => io.observe(c))
    return () => io.disconnect()
  }, [])

  // 딥링크(#/가이드/카드)로 들어오면 그 카드로 이동하고 잠깐 강조
  useEffect(() => {
    if (!focusCard || !chips.length) return
    const el = document.getElementById(focusCard)
    if (!el) return
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('focus-flash')
      setTimeout(() => el.classList.remove('focus-flash'), 1600)
    }, 120)
    return () => clearTimeout(t)
  }, [focusCard, chips.length])

  // 스크롤 스파이
  useEffect(() => {
    let raf = 0
    const spy = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const cards = [...(body.current?.querySelectorAll<HTMLElement>('.card') ?? [])]
        const topbar = document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? 64
        const line = topbar + (jump.current?.offsetHeight ?? 0) + 40
        let idx = -1
        cards.forEach((c, i) => { if (c.getBoundingClientRect().top <= line) idx = i })
        setActive(idx)
      })
    }
    window.addEventListener('scroll', spy, { passive: true })
    spy()
    return () => { window.removeEventListener('scroll', spy); cancelAnimationFrame(raf) }
  }, [chips.length])

  // 활성 칩을 가운데로
  useEffect(() => {
    const j = jump.current, b = j?.children[active] as HTMLElement | undefined
    if (j && b) j.scrollTo({ left: b.offsetLeft - j.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' })
  }, [active])

  return (
    <>
      <div className="jump" ref={jump}>
        {chips.map((c, i) => (
          <button key={c.id} className={i === active ? 'on' : ''}
            onClick={() => {
              document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              history.replaceState(null, '', `#/${guideId}/${c.id}`) // 공유 가능한 주소
            }}>
            {c.label}
          </button>
        ))}
      </div>
      <div ref={body}>{children}</div>
    </>
  )
}
