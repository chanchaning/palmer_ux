import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react'
import { download, toCSS, toJSON, toTailwind } from './export'
import { SysProvider, useSys } from './store'
import './system.css'
import { useStackTables } from './stackTables'

/** 탭 목록 — 파일: src/system/tabs/<id>.tsx (default export) */
export const SYS_TABS: { id: string; name: string; desc: string; load: () => Promise<{ default: ComponentType }> }[] = [
  { id: 'type', name: '타이포그래피', desc: '크기·행간·자간·줄 길이 시뮬레이터, 기기별 위계', load: () => import('./tabs/type') },
  { id: 'color', name: '컬러', desc: '60:30:10 배색, 토큰 3계층, 명도 대비', load: () => import('./tabs/color') },
  { id: 'grid', name: '그리드', desc: '12·8·4 컬럼 오버레이, 배치 패턴과 스냅', load: () => import('./tabs/grid') },
  { id: 'space', name: '간격', desc: '4pt·8pt 간격 스케일, 오토 레이아웃과 Flexbox', load: () => import('./tabs/space') },
  { id: 'state', name: '상태·모션', desc: '컴포넌트 6대 상태, 데이터 4대 상태, 모션 시간', load: () => import('./tabs/state') },
  { id: 'structure', name: '구조', desc: '아토믹 디자인, F·Z 시선 패턴, 폴드 라인', load: () => import('./tabs/structure') },
  { id: 'a11y', name: '접근성·성능', desc: '키보드 탐색, 스크린 리더, 폰트·이미지 최적화', load: () => import('./tabs/a11y') },
  { id: 'principles', name: '원칙', desc: 'UX 법칙과 심리 편향 요약표', load: () => import('./tabs/principles') },
  { id: 'components', name: '컴포넌트 사전', desc: 'Material 3 vs Apple HIG 명칭표', load: () => import('./tabs/components') },
]
const LAZY: Record<string, LazyExoticComponent<ComponentType>> = Object.fromEntries(SYS_TABS.map(t => [t.id, lazy(t.load)]))

export function SystemPage({ tab }: { tab: string }) {
  const cur = SYS_TABS.find(t => t.id === tab) ?? SYS_TABS[0]
  return (
    <SysProvider tab={cur.id}>
      <Inner cur={cur} />
    </SysProvider>
  )
}

function Inner({ cur }: { cur: (typeof SYS_TABS)[number] }) {
  const { shareUrl, reset } = useSys()
  const [exp, setExp] = useState(false)
  const [copied, setCopied] = useState(false)
  const Tab = LAZY[cur.id]
  const root = useRef<HTMLElement>(null)
  useStackTables(root)
  useEffect(() => { document.title = `${cur.name} · 디자인 시스템 · Palmer의 웹 도감` }, [cur])
  const share = async () => {
    try { await navigator.clipboard.writeText(shareUrl()) } catch { /* 복사 불가 */ }
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  const go = (id: string) => {
    const q = location.hash.split('?')[1]
    location.hash = `#/system/${id}${q ? '?' + q : ''}`
  }
  return (
    <section ref={root} className="page on syspage" data-page="system">
      <div className="page-head">
        <div>
          <div className="kicker"><span className="kicker-num" aria-hidden="true">DS</span><span className="kicker-group">디자인 시스템</span></div>
          <h2 className="page-title">화면을 만드는 기초 재료</h2>
          <p className="page-desc">타이포그래피·컬러·그리드·간격을 직접 조절해 보고, 그 값을 바로 CSS·토큰 파일·Tailwind 설정으로 가져가세요. 상태·구조·접근성까지 화면을 설계할 때 매번 확인하는 기준을 한곳에 모았어요.</p>
        </div>
        <div className="sys-actions">
          <button className="btn sm" onClick={() => setExp(true)}>내보내기</button>
          <button className="btn ghost sm" onClick={share}>{copied ? '✓ 링크 복사됨' : '설정 링크 복사'}</button>
          <button className="btn ghost sm" onClick={reset}>초기화</button>
        </div>
      </div>
      <nav className="jump sys-tabs" aria-label="디자인 시스템 탭">
        {SYS_TABS.map(t => (
          <button key={t.id} className={t.id === cur.id ? 'on' : ''} aria-current={t.id === cur.id ? 'page' : undefined} onClick={() => go(t.id)} title={t.desc}>{t.name}</button>
        ))}
      </nav>
      <div className="sys-tab-desc">{cur.desc}</div>
      <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
        <Tab key={cur.id} />
      </Suspense>
      {exp && <ExportPanel onClose={() => setExp(false)} />}
    </section>
  )
}

function ExportPanel({ onClose }: { onClose: () => void }) {
  const { config } = useSys()
  const [fmt, setFmt] = useState<'css' | 'json' | 'tw'>('css')
  const [ok, setOk] = useState(false)
  const code = fmt === 'css' ? toCSS(config) : fmt === 'json' ? toJSON(config) : toTailwind(config)
  const name = fmt === 'css' ? 'tokens.css' : fmt === 'json' ? 'tokens.json' : 'tailwind.config.js'
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="search-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sys-export" role="dialog" aria-modal="true" aria-label="토큰 내보내기">
        <header>
          <b>내보내기</b>
          <div className="seg-x">
            {([['css', 'CSS 변수'], ['json', '토큰 JSON (W3C)'], ['tw', 'Tailwind']] as const).map(([k, l]) => (
              <button key={k} className={fmt === k ? 'on' : ''} onClick={() => setFmt(k)}>{l}</button>
            ))}
          </div>
          <button className="btn ghost sm" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <pre><code>{code}</code></pre>
        <footer>
          <span className="muted">지금 조절한 타이포·컬러·그리드·간격 값이 모두 담겨요.</span>
          <button className="btn ghost sm" onClick={async () => { try { await navigator.clipboard.writeText(code) } catch { /* */ } setOk(true); setTimeout(() => setOk(false), 1400) }}>{ok ? '✓ 복사됨' : '복사'}</button>
          <button className="btn sm" onClick={() => download(name, code, fmt === 'json' ? 'application/json' : 'text/plain')}>{name} 다운로드</button>
        </footer>
      </div>
    </div>
  )
}
