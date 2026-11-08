import { useEffect, useRef, useState } from 'react'
import { GuidePage } from './components/GuidePage'
import { groups, guides } from './guides/registry'
import { useSlowMotion } from './lib/motion'

/* 로고: src/assets/logo.webp(+ logo-still.png)가 있으면 이미지, 없으면 'P' 글자 */
const logoFiles = import.meta.glob<string>('./assets/logo*.{webp,png}', { eager: true, query: '?url', import: 'default' })
const LOGO = logoFiles['./assets/logo.webp']
const LOGO_STILL = logoFiles['./assets/logo-still.png']
function Logo() {
  if (!LOGO) return <span className="logo">P</span>
  return (
    <picture>
      {LOGO_STILL && <source srcSet={LOGO_STILL} media="(prefers-reduced-motion: reduce)" />}
      <img className="logo-img" src={LOGO} alt="" width={40} height={40} />
    </picture>
  )
}

/** 주소: #/guide-id  (예전 #guide-id 도 지원) */
function useHashRoute() {
  const read = () => location.hash.replace(/^#\/?/, '')
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
  const guide = guides.find(g => g.id === route) ?? guides[0]
  const toggleTheme = useTheme()
  const [slow, setSlow] = useSlowMotion()
  const [drawer, setDrawer] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)

  // 페이지 이동 시 맨 위로 (즉시)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setDrawer(false)
    if (guide) document.title = `${guide.nav} · Palmer의 디자인 가이드`
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

  if (!guide) return <p style={{ padding: 40 }}>가이드가 없어요.</p>

  return (
    <div className="app">
      <aside className={'side' + (drawer ? ' open' : '')}>
        <div className="brand"><Logo /><div><b>Palmer</b><small>Design Guide</small></div></div>
        <nav className="side-nav">
          {groups.map(gr => (
            <div key={gr.name} style={{ display: 'contents' }}>
              <div className="side-group">{gr.name}</div>
              {gr.items.map(g => (
                <a key={g.id} href={'#/' + g.id} title={g.nav} className={g.id === guide.id ? 'on' : ''}>
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
          <h1>Palmer의 디자인 가이드</h1>
          <span className="crumb">{guide.nav}</span>
          <div className="top-actions">
            {guide.motion && (
              <button className="pill-btn" aria-pressed={slow} onClick={() => setSlow(!slow)}>🐢 <span className="lbl">슬로우 모션</span></button>
            )}
            <button className="pill-btn" onClick={toggleTheme}>🌓 <span className="lbl">테마</span></button>
          </div>
          <div className="scroll-progress" ref={bar} />
        </header>
        <div className="content">
          <GuidePage guide={guide} key={guide.id} />
          <footer>Palmer의 디자인 가이드 · 계속 추가 중</footer>
        </div>
      </div>

      <button className={'to-top' + (showTop ? ' on' : '')} aria-label="맨 위로"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
    </div>
  )
}
