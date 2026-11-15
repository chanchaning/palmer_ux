import type { ReactNode, Ref } from 'react'

/** 이 가이드에 나오는 가상의 앱 이름 */
export const APP = '새싹'

/** 첫 실행 순서: [이름, 거의 모든 앱에 필요한가] */
const STEPS: [string, boolean][] = [
  ['스플래시', true], ['온보딩', false], ['간편 로그인', false], ['약관 동의', false], ['프로필 설정', false],
  ['스켈레톤', true], ['웰컴 화면', true], ['코치마크', false], ['권한 요청', false],
]

/** 카드 위 순서 표시: 꽉 찬 점은 거의 모든 앱, 속 빈 점은 앱에 따라 */
export function Flow({ at }: { at: number }) {
  const [name, need] = STEPS[at]
  return (
    <div className="fr-flow" role="img" aria-label={`첫 실행 ${STEPS.length}단계 중 ${at + 1}번째, ${name}${need ? '' : ' (앱에 따라)'}`}>
      <ol aria-hidden="true">
        {STEPS.map(([n, nd], i) => <li key={n} title={n} className={(nd ? 'need' : 'skip') + (i === at ? ' on' : i < at ? ' past' : '')} />)}
      </ol>
      <span aria-hidden="true"><b>{at + 1}</b> / {STEPS.length} · {name}{!need && <em>앱에 따라</em>}</span>
    </div>
  )
}

/* ---- 선 아이콘 ---- */
const PATHS = {
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7',
  bell: 'M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5M10 19.5a2 2 0 0 0 4 0',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M21 20a6 6 0 0 0-4-5.6',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  phone: 'M8 3h8v18H8zM11 18h2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l4.5 4.5',
  plus: 'M12 5v14M5 12h14',
  home: 'M4 11l8-7 8 7v9H4z',
  book: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  shop: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
} as const
export type IcoName = keyof typeof PATHS
export function Ico({ n, size = 20 }: { n: IcoName; size?: number }) {
  return (
    <svg className="fr-ico" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[n]} />
    </svg>
  )
}

/** 가상의 앱 로고 (새싹 잎 두 장) */
export function Mark({ size = 48 }: { size?: number }) {
  return (
    <svg className="fr-mark" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path d="M24 42V24" />
      <path d="M24 26c-10 0-15-6-15-14 9 0 15 5 15 14z" />
      <path d="M24 24c0-9 6-14 15-14 0 8-5 14-15 14z" />
    </svg>
  )
}

export function Phone({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  return (
    <div className="device" ref={ref}>
      <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
      {children}
    </div>
  )
}
