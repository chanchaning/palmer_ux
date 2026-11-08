import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react'
import '../system/system.css'
import './plan.css'

/** 기획 노트 탭 — 파일: src/plan/tabs/<id>.tsx (default export) */
export const PLAN_TABS: { id: string; num: string; name: string; desc: string; load: () => Promise<{ default: ComponentType }> }[] = [
  { id: 'map', num: '00', name: '산출물 지도', desc: '기획자와 디자이너가 단계마다 무엇을 만드는지', load: () => import('./tabs/map') },
  { id: 'prd', num: '01', name: '문제 정의 · PRD', desc: 'PRD, 유저 스토리, 인수 조건(AC)', load: () => import('./tabs/prd') },
  { id: 'flow', num: '02', name: '구조 · 동선', desc: '정보 구조도(IA), 유저 플로우와 플로우차트', load: () => import('./tabs/flow') },
  { id: 'storyboard', num: '03', name: '화면설계서', desc: '와이어프레임과 번호 디스크립션 쓰는 법', load: () => import('./tabs/storyboard') },
  { id: 'policy', num: '04', name: '정책 · 예외', desc: '상태 다이어그램, 권한 매트릭스, 엣지 케이스', load: () => import('./tabs/policy') },
  { id: 'priority', num: '05', name: '우선순위', desc: 'RICE, MoSCoW, 무엇을 먼저 만들까', load: () => import('./tabs/priority') },
  { id: 'metrics', num: '06', name: '지표 · 데이터', desc: 'AARRR 퍼널, 이벤트 택소노미, A/B 테스트', load: () => import('./tabs/metrics') },
  { id: 'admin', num: '07', name: '백오피스 · 연동', desc: '어드민·CMS 설계, 외부 API, 실시간과 배치', load: () => import('./tabs/admin') },
  { id: 'collab', num: '08', name: '협업 · 소통', desc: '요구사항 받는 법, 회의록, 일정과 변경 관리', load: () => import('./tabs/collab') },
  { id: 'qa', num: '09', name: 'QA · 출시', desc: '테스트 시나리오, 결함 등급, 출시 체크리스트, 회고', load: () => import('./tabs/qa') },
]
const LAZY: Record<string, LazyExoticComponent<ComponentType>> = Object.fromEntries(PLAN_TABS.map(t => [t.id, lazy(t.load)]))

export function PlanPage({ tab }: { tab: string }) {
  const cur = PLAN_TABS.find(t => t.id === tab) ?? PLAN_TABS[0]
  const Tab = LAZY[cur.id]
  useEffect(() => { document.title = `${cur.name} · 기획 노트 · Palmer의 웹 도감` }, [cur])
  return (
    <section className="page on planpage" data-page="plan">
      <div className="page-head">
        <div>
          <div className="kicker"><span className="kicker-num" aria-hidden="true">{cur.num}</span><span className="kicker-group">기획 노트</span></div>
          <h2 className="page-title">{cur.name}</h2>
          <p className="page-desc">{cur.desc}</p>
        </div>
      </div>
      <nav className="jump sys-tabs" aria-label="기획 노트 목차">
        {PLAN_TABS.map(t => (
          <a key={t.id} href={'#/plan/' + t.id} className={'plan-tab' + (t.id === cur.id ? ' on' : '')} aria-current={t.id === cur.id ? 'page' : undefined}>{t.num} {t.name}</a>
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
  const i = PLAN_TABS.findIndex(t => t.id === cur)
  const prev = PLAN_TABS[i - 1], next = PLAN_TABS[i + 1]
  return (
    <div className="plan-pn">
      {prev ? <a href={'#/plan/' + prev.id}><small>이전</small>{prev.num} {prev.name}</a> : <span />}
      {next ? <a href={'#/plan/' + next.id} className="next"><small>다음</small>{next.num} {next.name}</a> : <span />}
    </div>
  )
}
