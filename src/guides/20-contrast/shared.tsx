import { createContext, useContext, type ReactNode } from 'react'
import { visionMatrix, type Vision } from './lib'

/** 다른 카드에서 테스트기로 색을 보내는 통로 */
export const TesterCtx = createContext<{ load: (fg: string, bg: string) => void }>({ load: () => {} })
export const useTester = () => useContext(TesterCtx)

export function Verdict({ ok, children }: { ok: boolean; children?: ReactNode }) {
  return <span className={ok ? 'ct-pass' : 'ct-fail'}>{ok ? '✓ 통과' : '✕ 미달'}{children}</span>
}

/** 대비율 위치 (로그 눈금, 1~21 → 0~100%) */
export const ratioPos = (r: number) => (Math.log(r) / Math.log(21)) * 100

/** 색각 이상 SVG 필터 정의 (요소에 filter: url(#id) 로 사용) */
export function VisionFilters({ prefix }: { prefix: string }) {
  const list: Vision[] = ['protan', 'deutan', 'tritan', 'achroma']
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {list.map(v => (
          <filter id={`${prefix}-${v}`} key={v} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={visionMatrix(v) ?? ''} />
          </filter>
        ))}
      </defs>
    </svg>
  )
}
