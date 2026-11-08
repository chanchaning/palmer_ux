import { useEffect, useRef, useState } from 'react'
import { GuidePage } from './components/GuidePage'
import { Home } from './components/Home'
import { Search } from './components/Search'
import { groups, guides } from './guides/registry'
import { useSlowMotion } from './lib/motion'
import { IconHome, IconSearch, IconSlow, IconTheme } from './components/icons'

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
    const [g = '', c = ''] = location.hash.replace(/^#\/?/, '').split('/')
    return { g: decodeURIComponent(g), c: decodeURIComponent(c) }
  }
  const [id, setId] = useState(read)
  useEffect(() => {
    const on = () => setId(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return id
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
  const guide = guides.find(g => g.id === route.g) ?? null
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

  // 페이지 이동 시 맨 위로 (즉시)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setDrawer(false)
    document.title = guide ? `${guide.nav} · Palmer의 디자인 가이드` : 'Palmer의 디자인 가이드'
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }, [guide])

  // 스크롤 진행 막대 · 맨 위로 버튼
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight
        if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
        setShowTop(scrollY > innerHeight * 0.8)
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
        <a className="brand" href="#/"><Logo /><div><b>Palmer</b><small>Design Guide</small></div></a>
        <nav className="side-nav">
          <a href="#/" title="홈" className={!guide ? 'on' : ''}><span className="ico"><IconHome /></span><span className="txt">홈</span></a>
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
        </nav>
        <div className="side-foot">{guides.length}개 가이드 · 계속 추가 중</div>
      </aside>
      <div className={'side-backdrop' + (drawer ? ' on' : '')} onClick={() => setDrawer(false)} />

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="메뉴 열기" onClick={() => setDrawer(true)}>☰</button>
          <h1><a href="#/">Palmer의 디자인 가이드</a></h1>
          {guide && <span className="crumb">{guide.nav}</span>}
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
          {guide
            ? <GuidePage guide={guide} focusCard={route.c} key={guide.id} />
            : <Home onSearch={() => setSearch(true)} logo={<Logo size={72} />} />}
          <footer>Palmer의 디자인 가이드 · 계속 추가 중</footer>
        </div>
      </div>

      <button className={'to-top' + (showTop ? ' on' : '')} aria-label="맨 위로"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
      <Search open={search} onClose={() => setSearch(false)} />
    </div>
  )
}
