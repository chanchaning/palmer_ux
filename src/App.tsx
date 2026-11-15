import { useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GuidePage } from './components/GuidePage'
import { Home } from './components/Home'
import { Search } from './components/Search'
import { SystemPage } from './system/SystemPage'
import { PLAN_TABS, PlanPage } from './plan/PlanPage'
import { DASH_TABS, DashPage } from './dash/DashPage'
import { DEV_TABS, DevPage } from './dev/DevPage'
import { groups, guides } from './guides/registry'
import { useSlowMotion } from './lib/motion'
import { IconDoc, IconGrid, IconHome, IconMenu, IconSearch, IconSlow, IconTheme, IconUp } from './components/icons'

/* 로고: src/assets/logo.webp(+ logo-still.png)가 있으면 이미지, 없으면 'P' 글자 */
const logoFiles = import.meta.glob<string>('./assets/logo*.{webp,png}', { eager: true, query: '?url', import: 'default' })
const LOGO = logoFiles['./assets/logo.webp']
const LOGO_STILL = logoFiles['./assets/logo-still.png']
function Logo({ size = 40 }: { size?: number }) {
  if (!LOGO) return <span className="logo" style={{ width: size, height: size }}>P</span>
  return (
    <picture>
      {LOGO_STILL && <source srcSet={LOGO_STILL} media="(prefers-reduced-motion: reduce)" />}
      <img className="logo-img" src={LOGO} alt="" width={size} height={size} style={{ width: size, height: size }} />
    </picture>
  )
}

/** 주소: #/ (홈) · #/guide-id · #/guide-id/card-id  (예전 #guide-id 도 지원) */
function useHashRoute() {
  const read = () => {
    // 쿼리(?fg=..)는 라우팅에서 제외 — 가이드가 직접 읽어요
    const [g = '', c = '', i = ''] = location.hash.replace(/^#\/?/, '').split('?')[0].split('/')
    return { g: decodeURIComponent(g), c: decodeURIComponent(c), i: decodeURIComponent(i) }
  }
  const [id, setId] = useState(read)
  useEffect(() => {
    const on = () => setId(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return id
}

/* 스크롤 복원 — 방문 기록 칸마다 이름표(history.state.k)를 붙이고 위치를 sessionStorage에 적어 둬요.
 * 이름표가 이미 있는 칸으로 오면 뒤로·앞으로 가기라서 그 위치로 돌려 놓고, 없으면 새 이동이라 맨 위에서 시작해요. */
const SCROLL_KEY = 'palmer-scroll'
const readScroll = (): Record<string, number> => {
  try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') } catch { return {} }
}
const writeScroll = (m: Record<string, number>) => {
  try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m)) } catch { /* 저장 불가 환경 */ }
}
const entryKey = () => (history.state as { k?: string } | null)?.k
/** 화면이 lazy로 늦게 길어지니, 목표 위치까지 스크롤할 수 있을 때까지 잠깐 기다렸다 옮겨요 */
function restoreTo(y: number) {
  let n = 0, raf = 0
  const stop = () => { cancelAnimationFrame(raf); removeEventListener('wheel', stop); removeEventListener('touchstart', stop); removeEventListener('keydown', stop) }
  const tick = () => {
    const max = document.documentElement.scrollHeight - innerHeight
    if (max >= y || n++ > 90) { window.scrollTo({ top: Math.min(y, Math.max(max, 0)), behavior: 'instant' }); stop(); return }
    raf = requestAnimationFrame(tick)
  }
  // 기다리는 사이 사용자가 직접 스크롤하면 손대지 않아요
  addEventListener('wheel', stop, { passive: true }); addEventListener('touchstart', stop, { passive: true }); addEventListener('keydown', stop)
  tick()
  return stop
}

type Theme = 'light' | 'dark' | null
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem('palmer-theme') as Theme) ?? null } catch { return null }
  })
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme
    else delete document.documentElement.dataset.theme
    try { if (theme) localStorage.setItem('palmer-theme', theme) } catch { /* 저장 불가 환경 */ }
  }, [theme])
  const toggle = () => {
    const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(dark ? 'light' : 'dark')
  }
  return toggle
}

export default function App() {
  const route = useHashRoute()
  const isSystem = route.g === 'system'
  const isPlan = route.g === 'plan'
  const isDash = route.g === 'dash'
  const isDev = route.g === 'dev'
  const isArea = isSystem || isPlan || isDash || isDev
  const guide = isArea ? null : guides.find(g => g.id === route.g) ?? null
  const [search, setSearch] = useState(false)

  // ⌘K / Ctrl+K / '/' 로 검색 열기
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearch(s => !s) }
      else if (e.key === '/' && !typing) { e.preventDefault(); setSearch(true) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
  const toggleTheme = useTheme()
  const [slow, setSlow] = useSlowMotion()
  const [drawer, setDrawer] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)

  // 페이지 이동: 새로 온 곳은 맨 위, 뒤로·앞으로 가기는 떠날 때 위치로
  const pageKey = (guide?.id ?? route.g) + '/' + (isArea ? route.c : '')
  const navKey = route.g + '/' + route.c + '/' + route.i
  const lastPage = useRef<string | null>(null)
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    let k = entryKey()
    const revisit = !!k
    if (!k) {
      k = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      history.replaceState({ ...(history.state as object | null), k }, '')
    }
    const pageChanged = lastPage.current !== pageKey
    lastPage.current = pageKey
    if (revisit) {
      const y = readScroll()[k]
      if (y != null) return restoreTo(y)
    }
    // 같은 페이지 안의 카드·항목 주소는 각 화면이 그 위치로 스크롤해요
    if (pageChanged) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [navKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDrawer(false)
    document.title = guide ? `${guide.nav} · Palmer의 웹 도감` : 'Palmer의 웹 도감 · 경험 노하우'
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }, [guide, isSystem, isPlan, isDash, isDev, isArea && route.c])

  // 스크롤 진행 막대 · 맨 위로 버튼
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight
        if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
        setShowTop(scrollY > innerHeight * 0.8)
        const k = entryKey()
        if (k) { const m = readScroll(); m[k] = Math.round(scrollY); writeScroll(m) }
      })
    }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    on()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [])

  return (
    <div className="app">
      <aside className={'side' + (drawer ? ' open' : '')}>
        <a className="brand" href="#/"><Logo /><div><b>Palmer</b><small>경험 노하우 웹 도감</small></div></a>
        <nav className="side-nav">
          <a href="#/" title="홈" className={!guide && !isArea ? 'on' : ''}><span className="ico"><IconHome /></span><span className="txt">홈</span></a>
          <div className="side-area">디자인</div>
          <a href="#/system" title="디자인 시스템" className={isSystem ? 'on' : ''}><span className="ico"><IconGrid /></span><span className="txt">디자인 시스템</span></a>
          {groups.map(gr => (
            <div key={gr.name} style={{ display: 'contents' }}>
              <div className="side-group">{gr.name}</div>
              {gr.items.map(g => (
                <a key={g.id} href={'#/' + g.id} title={g.nav} className={g.id === guide?.id ? 'on' : ''}>
                  <span className="ico">{g.num}</span><span className="txt">{g.nav}</span><span className="cnt">{g.count}</span>
                </a>
              ))}
            </div>
          ))}
          <div className="side-area">기획</div>
          {PLAN_TABS.map(t => (
            <a key={t.id} href={'#/plan/' + t.id} title={t.name} className={isPlan && (route.c || 'map') === t.id ? 'on' : ''}>
              <span className="ico">{t.id === 'map' ? <IconDoc /> : t.num}</span><span className="txt">{t.name}</span>
            </a>
          ))}
          <div className="side-area">개발</div>
          {DEV_TABS.map(t => (
            <a key={t.id} href={'#/dev/' + t.id} title={t.name} className={isDev && (route.c || 'map') === t.id ? 'on' : ''}>
              <span className="ico">{t.id === 'map' ? <IconDoc /> : t.num}</span><span className="txt">{t.name}</span>
            </a>
          ))}
          <div className="side-area">대시보드</div>
          {DASH_TABS.map(t => (
            <a key={t.id} href={'#/dash/' + t.id} title={t.name} className={isDash && (route.c || 'intro') === t.id ? 'on' : ''}>
              <span className="ico">{t.num}</span><span className="txt">{t.name}</span>
            </a>
          ))}
        </nav>
        <div className="side-foot">{guides.length}개 가이드 · 계속 추가 중</div>
      </aside>
      <div className={'side-backdrop' + (drawer ? ' on' : '')} onClick={() => setDrawer(false)} />

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="메뉴 열기" onClick={() => setDrawer(true)}><IconMenu /></button>
          <h1><a href="#/">Palmer의 웹 도감</a></h1>
          {(guide || isArea) && <span className="crumb">{guide ? guide.nav : isSystem ? '디자인 시스템' : isDash ? '관제 대시보드' : isDev ? 'FE 개발 노트' : '기획 노트'}</span>}
          <div className="top-actions">
            <button className="pill-btn search-btn" onClick={() => setSearch(true)}><IconSearch /> <span className="lbl">검색</span><kbd>⌘K</kbd></button>
            {guide?.motion && (
              <button className="pill-btn" aria-pressed={slow} onClick={() => setSlow(!slow)}><IconSlow /> <span className="lbl">슬로우 모션</span></button>
            )}
            <button className="pill-btn" onClick={toggleTheme}><IconTheme /> <span className="lbl">테마</span></button>
          </div>
          <div className="scroll-progress" ref={bar} />
        </header>
        <div className="content">
          <ErrorBoundary resetKey={navKey}>
          {isDev
            ? <DevPage tab={route.c} item={route.i} />
            : isDash
            ? <DashPage tab={route.c} />
            : isPlan
            ? <PlanPage tab={route.c} />
            : isSystem
            ? <SystemPage tab={route.c} />
            : guide
              ? <GuidePage guide={guide} focusCard={route.c} key={guide.id} />
              : <Home onSearch={() => setSearch(true)} logo={<Logo size={72} />} />}
          </ErrorBoundary>
          <footer>Palmer의 웹 도감 · 질문이 생길 때마다 채워가요</footer>
        </div>
      </div>

      <button className={'to-top' + (showTop ? ' on' : '')} aria-label="맨 위로"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><IconUp /></button>
      <Search open={search} onClose={() => setSearch(false)} />
    </div>
  )
}
