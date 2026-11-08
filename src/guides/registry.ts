import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface GuideMeta {
  /** 라우트 (#/id) */
  id: string
  /** '01' 형식 번호 */
  num: string
  /** 사이드바 그룹 */
  group: string
  /** 사이드바 짧은 이름 */
  nav: string
  eyebrow: string
  title: string
  desc: string
  stats: [string, string][]
  /** 카드 수 (사이드바 표시) */
  count: number
  /** 슬로우 모션 버튼 노출 */
  motion?: boolean
}

export interface CardInfo { id: string; num: string; title: string; en: string; desc: string }

export interface Guide extends GuideMeta {
  Component: LazyExoticComponent<ComponentType>
  /** 카드 목록 (cards.json — 검색·홈·딥링크용) */
  cards: CardInfo[]
}

/* 가이드 폴더(src/guides/NN-id/)를 자동으로 찾아요.
 * meta.ts 는 바로 읽고, index.tsx(본문)는 처음 열 때 불러와요.
 * 폴더를 지우면 가이드도 사라져요. */
const metas = import.meta.glob<{ default: GuideMeta }>('./*/meta.ts', { eager: true })
const bodies = import.meta.glob<{ default: ComponentType }>('./*/index.tsx')
const cardLists = import.meta.glob<{ default: CardInfo[] }>('./*/cards.json', { eager: true })

export const guides: Guide[] = Object.entries(metas)
  .filter(([path, mod]) => mod.default?.id && mod.default?.num && bodies[path.replace(/meta\.ts$/, 'index.tsx')])
  .map(([path, mod]) => {
    const load = bodies[path.replace(/meta\.ts$/, 'index.tsx')]
    return { ...mod.default, Component: lazy(load), cards: cardLists[path.replace(/meta\.ts$/, 'cards.json')]?.default ?? [] }
  })
  .sort((a, b) => a.num.localeCompare(b.num))

/** 그룹별 묶음 (그룹은 번호순 첫 등장 순서) */
export const groups: { name: string; items: Guide[] }[] = [...new Set(guides.map(g => g.group))].map(name => ({
  name,
  items: guides.filter(g => g.group === name),
}))
