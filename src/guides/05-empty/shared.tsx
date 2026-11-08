import { Fragment, useState, type ReactNode, type Ref } from 'react'

/* ---- 일러스트 (정적 SVG 조각) ---- */
const ILL = {
  first: '<circle cx="48" cy="50" r="40" class="i-bg"/><rect x="28" y="22" width="40" height="52" rx="7" class="i-sf i-ln"/><rect x="38" y="16" width="20" height="11" rx="4" class="i-a"/><path d="M37 42h22M37 51h16M37 60h10" class="i-ln"/><path d="M76 14l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" class="i-b"/><circle cx="20" cy="26" r="3" class="i-a"/>',
  search: '<circle cx="48" cy="50" r="40" class="i-bg"/><circle cx="43" cy="44" r="19" class="i-sf i-ln"/><path d="M57 58l14 14" class="i-ln" style="stroke-width:6"/><text x="43" y="51" text-anchor="middle" class="i-tx">?</text>',
  filter: '<circle cx="48" cy="50" r="40" class="i-bg"/><path d="M22 26h52L55 50v17l-14 7V50z" class="i-as i-la"/><circle cx="68" cy="66" r="11" class="i-dg"/><path d="M64 62l8 8M72 62l-8 8" class="i-lw"/>',
  offline: '<circle cx="48" cy="50" r="40" class="i-bg"/><path d="M30 66a13 13 0 0 1 1-26 17 17 0 0 1 32-5 13 13 0 0 1 3 31z" class="i-sf i-ln"/><path d="M24 24l48 50" class="i-ld"/>',
  perm: '<circle cx="48" cy="50" r="40" class="i-bg"/><rect x="20" y="32" width="52" height="38" rx="8" class="i-sf i-ln"/><path d="M36 32l4-7h12l4 7" class="i-ln i-nf"/><circle cx="46" cy="51" r="10" class="i-as i-la"/><rect x="60" y="60" width="20" height="16" rx="4" class="i-b"/><path d="M64 60v-4a6 6 0 0 1 12 0v4" class="i-lb i-nf"/>',
  done: '<circle cx="48" cy="50" r="40" class="i-bg"/><circle cx="48" cy="48" r="24" class="i-a"/><path d="M37 48l8 8 15-16" class="i-lw"/><rect x="16" y="22" width="6" height="10" rx="2" class="i-b" transform="rotate(-25 19 27)"/><rect x="74" y="18" width="6" height="10" rx="2" class="i-dg" transform="rotate(30 77 23)"/><circle cx="80" cy="72" r="3.5" class="i-b"/><circle cx="14" cy="64" r="3" class="i-a"/>',
  deleted: '<circle cx="48" cy="50" r="40" class="i-bg"/><path d="M32 34h32l-3 36a4 4 0 0 1-4 4H39a4 4 0 0 1-4-4z" class="i-sf i-ln"/><path d="M26 34h44M41 34v-6h14v6" class="i-ln i-nf"/><path d="M42 44v20M54 44v20" class="i-ln"/><path d="M70 18a10 10 0 1 1-9 6" class="i-lb i-nf"/><path d="M58 18l3 6 6-3" class="i-lb i-nf"/>',
  error: '<circle cx="48" cy="50" r="40" class="i-bg"/><path d="M48 20L78 72H18z" class="i-bs i-lb"/><path d="M48 40v15" class="i-lb"/><circle cx="48" cy="63" r="3" class="i-b"/>',
} as const
export type IllKey = keyof typeof ILL

/** 빈 화면: 일러스트 · 제목 · 설명 · (추가) · 행동 버튼 */
export function Empty({ ill, title, desc, extra, children }: {
  ill: IllKey; title: ReactNode; desc: ReactNode; extra?: ReactNode; children?: ReactNode
}) {
  return (
    <div className="em-empty">
      <div className="em-ill" data-part="ill"><svg viewBox="0 0 96 96" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ILL[ill] }} /></div>
      <div className="em-t" data-part="title">{title}</div>
      <p className="em-d" data-part="desc">{desc}</p>
      {extra}
      <div className="em-act" data-part="act">{children}</div>
    </div>
  )
}

/* ---- 구성 칩: 올리면 빈 화면의 해당 부분을 표시 ---- */
export type Part = 'ill' | 'title' | 'desc' | 'act'
const PARTS: [Part, string][] = [['ill', '일러스트'], ['title', '제목'], ['desc', '설명'], ['act', '행동 버튼']]

/** 카드 하나의 구성 하이라이트 상태 + Info spec 항목 */
export function useAnatomy() {
  const [hl, setHl] = useState<Part | null>(null)
  const spec: [ReactNode, ReactNode] = ['구성', <AnatomyButtons key="ana" hl={hl} set={setHl} />]
  return { hl, spec }
}

function AnatomyButtons({ hl, set }: { hl: Part | null; set: (p: Part | null) => void }) {
  return (
    <>
      {PARTS.map(([p, label], i) => (
        <Fragment key={p}>
          {i > 0 && '·'}
          <button type="button" aria-pressed={hl === p} title="빈 화면에서 이 부분을 표시해요"
            onPointerEnter={e => { if (e.pointerType === 'mouse') set(p) }}
            onPointerLeave={e => { if (e.pointerType === 'mouse') set(null) }}
            onFocus={() => set(p)} onBlur={() => set(null)} onClick={() => set(p)}>{label}</button>
        </Fragment>
      ))}
    </>
  )
}

/** 하이라이트 범위 (레이아웃에 영향 없음) */
export function Hl({ hl, children }: { hl: Part | null; children: ReactNode }) {
  return <div data-hl={hl ?? undefined} style={{ display: 'contents' }}>{children}</div>
}

/** 폰 화면 공통 (statusbar 오른쪽 문구를 바꿀 수 있는 버전) */
export function Phone({ children, sig = '●●● 100%', ref }: { children: ReactNode; sig?: string; ref?: Ref<HTMLDivElement> }) {
  return (
    <div className="device" ref={ref}>
      <div className="statusbar"><span>9:41</span><span>{sig}</span></div>
      {children}
    </div>
  )
}
