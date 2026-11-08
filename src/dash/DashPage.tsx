import { lazy, Suspense, useEffect, useRef, type ComponentType, type LazyExoticComponent } from 'react'
import '../system/system.css'
import '../plan/plan.css'
import './dash.css'
import { useStackTables } from '../system/stackTables'

/** 관제 대시보드 탭 — 파일: src/dash/tabs/<id>.tsx (default export) */
export const DASH_TABS: { id: string; num: string; name: string; desc: string; load: () => Promise<{ default: ComponentType }> }[] = [
  { id: 'intro', num: '00', name: '관제는 무엇이 다른가', desc: '계속 띄워 두는 화면, 상황 인식 3단계, 분석형과의 차이', load: () => import('./tabs/intro') },
  { id: 'levels', num: '01', name: '화면 위계', desc: '전체 → 구역 → 설비 → 진단, 4단계 화면과 이동', load: () => import('./tabs/levels') },
  { id: 'color', num: '02', name: '회색이 기본, 색은 신호', desc: '평상시는 차분하게, 비정상만 눈에 띄게', load: () => import('./tabs/color') },
  { id: 'alarm', num: '03', name: '알람 설계', desc: '우선순위, 상태, 확인과 보류, 알람 폭주', load: () => import('./tabs/alarm') },
  { id: 'context', num: '04', name: '값보다 맥락', desc: '정상 범위·추세·목표를 함께 보여주는 표시', load: () => import('./tabs/context') },
  { id: 'realtime', num: '05', name: '실시간 갱신', desc: '갱신 주기, 오래된 데이터, 끊김과 재연결', load: () => import('./tabs/realtime') },
  { id: 'map', num: '06', name: '지도 · 계통도', desc: '위치 기반 이상 표시, 겹침, 단선도', load: () => import('./tabs/map') },
  { id: 'room', num: '07', name: '관제실 환경', desc: '벽면 화면과 개인 화면, 시청 거리와 글자, 다크 화면', load: () => import('./tabs/room') },
  { id: 'ops', num: '08', name: '기획 · 운영 정의', desc: '알람 정의서, 대응 절차, 교대 인수인계', load: () => import('./tabs/ops') },
  { id: 'fe', num: '09', name: 'FE · 구현', desc: '웹소켓과 폴링, 대량 데이터 그리기, 오래 켜 두는 화면', load: () => import('./tabs/fe') },
]
const LAZY: Record<string, LazyExoticComponent<ComponentType>> = Object.fromEntries(DASH_TABS.map(t => [t.id, lazy(t.load)]))

export function DashPage({ tab }: { tab: string }) {
  const cur = DASH_TABS.find(t => t.id === tab) ?? DASH_TABS[0]
  const Tab = LAZY[cur.id]
  const root = useRef<HTMLElement>(null)
  useStackTables(root)
  useEffect(() => { document.title = `${cur.name} · 관제 대시보드 · Palmer의 웹 도감` }, [cur])
  return (
    <section ref={root} className="page on dashpage" data-page="dash">
      <div className="page-head">
        <div>
          <div className="kicker"><span className="kicker-num" aria-hidden="true">{cur.num}</span><span className="kicker-group">관제 대시보드</span></div>
          <h2 className="page-title">{cur.name}</h2>
          <p className="page-desc">{cur.desc}</p>
        </div>
      </div>
      <nav className="jump sys-tabs" aria-label="관제 대시보드 목차">
        {DASH_TABS.map(t => (
          <a key={t.id} href={'#/dash/' + t.id} className={'plan-tab' + (t.id === cur.id ? ' on' : '')} aria-current={t.id === cur.id ? 'page' : undefined}>{t.num} {t.name}</a>
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
  const i = DASH_TABS.findIndex(t => t.id === cur)
  const prev = DASH_TABS[i - 1], next = DASH_TABS[i + 1]
  return (
    <div className="plan-pn">
      {prev ? <a href={'#/dash/' + prev.id}><small>이전</small>{prev.num} {prev.name}</a> : <span />}
      {next ? <a href={'#/dash/' + next.id} className="next"><small>다음</small>{next.num} {next.name}</a> : <span />}
    </div>
  )
}
