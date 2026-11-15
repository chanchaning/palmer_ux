import { lazy, Suspense, useEffect, useRef, type ComponentType, type LazyExoticComponent } from 'react'
import '../system/system.css'
import '../plan/plan.css'
import './dev.css'
import { useStackTables } from '../system/stackTables'

/** FE 개발 노트 탭 — 파일: src/dev/tabs/<id>.tsx (default export)
 *  주소: #/dev/<탭> · #/dev/<탭>/<항목 id> */
export const DEV_TABS: { id: string; num: string; name: string; desc: string; load: () => Promise<{ default: ComponentType }> }[] = [
  { id: 'map', num: '00', name: '한눈에 보기', desc: '100가지 함정을 증상·심각도·프레임워크로 찾아요', load: () => import('./tabs/map') },
  { id: 'perf', num: '01', name: '렌더링 · 성능', desc: '버벅임, 프리징, 느린 첫 화면, 발열', load: () => import('./tabs/perf') },
  { id: 'state', num: '02', name: '상태 관리', desc: '전역 상태, 비동기 상태, 동기화, 구독 해제', load: () => import('./tabs/state') },
  { id: 'framework', num: '03', name: '프레임워크 함정', desc: 'React · Vue · Angular 고유의 엣지 케이스', load: () => import('./tabs/framework') },
  { id: 'network', num: '04', name: '네트워크 · API', desc: '토큰 갱신, 재시도, 중복 호출, 실시간 연결', load: () => import('./tabs/network') },
  { id: 'routing', num: '05', name: '라우팅', desc: '새로고침 404, 뒤로 가기, 가드, 배포 직후 청크', load: () => import('./tabs/routing') },
  { id: 'style', num: '06', name: '스타일 · 디자인 시스템', desc: 'CSS 우선순위, 잘리는 레이어, 다크 모드, 접근성', load: () => import('./tabs/style') },
  { id: 'form', num: '07', name: '폼 · 입력', desc: '한글 입력, 동적 필드, 키보드, 다중 제출', load: () => import('./tabs/form') },
  { id: 'build', num: '08', name: '빌드 · 배포', desc: '번들 크기, 캐시, 환경 변수, 소스맵', load: () => import('./tabs/build') },
  { id: 'browser', num: '09', name: '브라우저 · 기기', desc: '100vh, 타임존, 터치, 노치, 확장 프로그램', load: () => import('./tabs/browser') },
  { id: 'debug', num: '10', name: '보안 · 디버깅', desc: 'XSS, 하얀 화면, 공급망, 테스트, 추적', load: () => import('./tabs/debug') },
]
const LAZY: Record<string, LazyExoticComponent<ComponentType>> = Object.fromEntries(DEV_TABS.map(t => [t.id, lazy(t.load)]))

export function DevPage({ tab, item }: { tab: string; item?: string }) {
  const cur = DEV_TABS.find(t => t.id === tab) ?? DEV_TABS[0]
  const Tab = LAZY[cur.id]
  const root = useRef<HTMLElement>(null)
  useStackTables(root)
  useEffect(() => { document.title = `${cur.name} · FE 개발 노트 · Palmer의 웹 도감` }, [cur])

  // #/dev/<탭>/<항목> 으로 들어오면 그 항목까지 스크롤 (탭 본문은 lazy라 잠깐 기다려요)
  useEffect(() => {
    if (!item) return
    let n = 0, t = 0
    const go = () => {
      const el = document.getElementById(item)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('dv-flash'); t = window.setTimeout(() => el.classList.remove('dv-flash'), 1600); return }
      if (n++ < 40) t = window.setTimeout(go, 50)
    }
    go()
    return () => clearTimeout(t)
  }, [cur.id, item])

  return (
    <section ref={root} className="page on devpage" data-page="dev">
      <div className="page-head">
        <div>
          <div className="kicker"><span className="kicker-num" aria-hidden="true">{cur.num}</span><span className="kicker-group">FE 개발 노트</span></div>
          <h2 className="page-title">{cur.name}</h2>
          <p className="page-desc">{cur.desc}</p>
        </div>
      </div>
      <nav className="jump sys-tabs" aria-label="FE 개발 노트 목차">
        {DEV_TABS.map(t => (
          <a key={t.id} href={'#/dev/' + t.id} className={'plan-tab' + (t.id === cur.id ? ' on' : '')} aria-current={t.id === cur.id ? 'page' : undefined}>{t.num} {t.name}</a>
        ))}
      </nav>
      <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
        <Tab key={cur.id} />
      </Suspense>
      <PrevNext cur={cur.id} />
    </section>
  )
}

function PrevNext({ cur }: { cur: string }) {
  const i = DEV_TABS.findIndex(t => t.id === cur)
  const prev = DEV_TABS[i - 1], next = DEV_TABS[i + 1]
  return (
    <div className="plan-pn">
      {prev ? <a href={'#/dev/' + prev.id}><small>이전</small>{prev.num} {prev.name}</a> : <span />}
      {next ? <a href={'#/dev/' + next.id} className="next"><small>다음</small>{next.num} {next.name}</a> : <span />}
    </div>
  )
}
