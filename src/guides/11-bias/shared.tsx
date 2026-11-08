import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { EASE, useMotion } from '../../lib/motion'

export type AB = 'a' | 'b'

export interface ABState {
  v: AB
  /** quiet=true면 화면 전환 효과 없이 바꿔요 (자동 재생 초기화용) */
  set: (v: AB, quiet?: boolean) => void
  anim: { current: boolean }
}

/** 적용 전 / 적용 후 상태. onChange는 바뀔 때마다(조용히 바꿀 때도) 불려요 */
export function useAB(onChange?: (v: AB, quiet: boolean) => void): ABState {
  const [v, setV] = useState<AB>('a')
  const anim = useRef(false)
  return {
    v,
    anim,
    set(nv, quiet = false) { anim.current = !quiet; setV(nv); onChange?.(nv, quiet) },
  }
}

/** 적용 전 / 적용 후 토글 (원본 .bias-ab 그대로) */
export function ABSeg({ ab, ref }: { ab: ABState; ref?: Ref<HTMLDivElement> }) {
  return (
    <div className={'bias-ab' + (ab.v === 'b' ? ' is-b' : '')} ref={ref}>
      <span className="bias-ab-thumb" />
      {(['a', 'b'] as const).map(k => (
        <button key={k} type="button" data-ab={k} aria-pressed={ab.v === k} onClick={() => { if (ab.v !== k) ab.set(k) }}>
          {k === 'a' ? '적용 전' : '적용 후'}
        </button>
      ))}
    </div>
  )
}

/** 한쪽 화면. 보일 때 살짝 올라오며 나타나요 */
export function View({ k, ab, children }: { k: AB; ab: ABState; children: ReactNode }) {
  const m = useMotion()
  const ref = useRef<HTMLDivElement>(null)
  const on = ab.v === k
  useLayoutEffect(() => {
    const el = ref.current
    if (!on || !el || !ab.anim.current) return
    m.clearA(el)
    m.A(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 240, EASE.out)
  }, [on, ab.anim, m])
  return <div data-v={k} hidden={!on} ref={ref}>{children}</div>
}

/** 토글 버튼 찾기 (자동 재생용) */
export const abBtn = (seg: HTMLElement | null, k: AB) => seg?.querySelector<HTMLElement>(`button[data-ab="${k}"]`) ?? null

export const fmt = (n: number) => n.toLocaleString('ko-KR')

/** '주의' 문구 끝의 다크 패턴 가이드 링크 */
export const DpLink = () => <a href="#/darkpattern">다크 패턴 보기</a>
