/* 모바일에서 표(.sys-table)를 카드처럼 쌓아 보이도록, 각 칸에 열 제목(data-label)을 붙여요.
 * 실제 쌓는 모양은 system.css 의 @media (max-width: 767px) 에서 처리해요. */
import { useEffect, type RefObject } from 'react'

function label(root: HTMLElement) {
  root.querySelectorAll<HTMLTableElement>('table.sys-table').forEach(t => {
    const heads = [...t.querySelectorAll('thead tr:last-child th')].map(th => th.textContent?.trim() ?? '')
    if (!heads.length) return
    t.classList.add('is-stack')
    t.querySelectorAll('tbody tr').forEach(tr => {
      ;[...tr.children].forEach((cell, i) => {
        const l = heads[i] ?? ''
        if (cell.getAttribute('data-label') !== l) cell.setAttribute('data-label', l)
      })
    })
  })
}

export function useStackTables(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    label(el)
    let raf = 0
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => label(el)) })
    mo.observe(el, { childList: true, subtree: true })
    return () => { mo.disconnect(); cancelAnimationFrame(raf) }
  }, [ref])
}
