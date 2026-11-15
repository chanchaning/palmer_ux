/* 09 브라우저 · 기기 — 데모 모음. fixed=false 문제 그대로, true 해결 적용 */
import { Component, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Range, Seg, useTimers } from '../../components/ui'
import { Meter } from '../ui'

/* ---------- 01 100vh와 모바일 주소창 ---------- */
const SCREEN = 300 // 주소창이 접혔을 때 보이는 높이 = 큰 뷰포트(lvh)
const BAR = 52     // 펼친 주소창 · 툴바 높이
export function VhDemo({ fixed }: { fixed: boolean }) {
  const [bar, setBar] = useState(true)
  const visible = bar ? SCREEN - BAR : SCREEN
  const h = fixed ? visible : SCREEN // 100vh 는 주소창이 접힌 기준(lvh)이라 늘 300
  const hidden = Math.max(0, h - visible)
  return (
    <div className="bw-col">
      <div className="bw-vh">
        <div className="bw-vh-phone" style={{ height: SCREEN }}>
          <div className="bw-vh-page" style={{ height: h }}>
            <div className="bw-vh-top">주문서</div>
            <div className="bw-vh-lines"><i /><i /><i className="s" /><i /><i className="s" /></div>
            <div className="bw-vh-cta">32,800원 결제하기</div>
          </div>
          <div className={'bw-vh-toolbar' + (bar ? ' on' : '')} style={{ height: bar ? BAR : 0 }} aria-hidden="true">
            <span>palmer-shop.kr</span><small>‹ ›  ⇪  ⧉</small>
          </div>
        </div>
        <div className="bw-vh-units">
          <b>이 폰의 단위 값</b>
          <span className={!fixed ? 'on' : ''}><code>100vh</code>{SCREEN}px</span>
          <span><code>100lvh</code>{SCREEN}px</span>
          <span><code>100svh</code>{SCREEN - BAR}px</span>
          <span className={fixed ? 'on' : ''}><code>100dvh</code>{visible}px</span>
          <small>주소창 {bar ? '펼침' : '접힘'}</small>
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => setBar(b => !b)}>{bar ? '아래로 스크롤 (주소창 접힘)' : '맨 위로 (주소창 펼침)'}</button>
      </div>
      <div className="dv-meters">
        <Meter label={`화면 높이 (100${fixed ? 'dvh' : 'vh'})`} value={`${h}px`} />
        <Meter label="실제로 보이는 높이" value={`${visible}px`} />
        <Meter label="버튼이 가려진 높이" value={`${hidden}px`} bad={hidden > 0} />
      </div>
    </div>
  )
}

/* ---------- 02 Mac · Windows 글자 굵기 ---------- */
type RGB = [number, number, number]
const rgbOf = (s: string): RGB => {
  const n = (s.match(/-?[\d.]+(e-?\d+)?/g) ?? ['0', '0', '0']).map(Number)
  return s.startsWith('color(') ? [n[0] * 255, n[1] * 255, n[2] * 255] : [n[0], n[1], n[2]]
}
const lum = ([r, g, b]: RGB) => {
  const f = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: RGB, b: RGB) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const AA_TEXT = '이번 달 결제 예정 금액은 32,800원이에요. 자동 결제일은 매월 15일이에요.'
export function AntialiasDemo({ fixed }: { fixed: boolean }) {
  const txt = useRef<HTMLParagraphElement>(null)
  const [cr, setCr] = useState(0)
  const [smooth, setSmooth] = useState<'antialiased' | 'auto'>('antialiased')
  const isMac = /Macintosh|Mac OS X/.test(navigator.userAgent) && !/iPhone|iPad/.test(navigator.userAgent)
  useLayoutEffect(() => {
    const calc = () => {
      const el = txt.current
      if (!el?.parentElement) return
      setCr(ratio(rgbOf(getComputedStyle(el).color), rgbOf(getComputedStyle(el.parentElement).backgroundColor)))
    }
    calc()
    const mo = new MutationObserver(calc)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', calc)
    return () => { mo.disconnect(); mq.removeEventListener('change', calc) }
  }, [])
  const size = fixed ? 15 : 12
  const weight = fixed ? 450 : 300
  return (
    <div className="bw-col">
      <div className="bw-aa">
        <div className="bw-aa-pane mac">
          <small>macOS · 흉내</small>
          <p ref={txt} style={{ fontSize: size, fontWeight: weight }}>{AA_TEXT}</p>
        </div>
        <div className="bw-aa-pane win">
          <small>Windows · ClearType 흉내</small>
          <p style={{ fontSize: size, fontWeight: weight + (fixed ? 30 : 120) }}>{AA_TEXT}</p>
        </div>
      </div>
      <div className="dv-meters">
        <Meter label="본문 크기 · 굵기" value={`${size}px · ${weight}`} bad={!fixed} />
        <Meter label="글자 명암비 (실측)" value={`${cr.toFixed(1)} : 1`} bad={cr < 4.5} />
        <Meter label="OS 간 굵기 차이 (흉내)" value={fixed ? '작아요' : '커요'} bad={!fixed} />
      </div>
      <div className="bw-aa-real">
        <div className="dv-row">
          <Seg value={smooth} onChange={setSmooth} options={[['antialiased', 'antialiased'], ['auto', 'auto']]} />
          <span className="dv-log">{isMac ? <>이 기기는 macOS라 <b>실제로</b> 달라져요</> : <>macOS가 아니라서 이 스위치는 <b>아무 변화가 없어요</b></>}</span>
        </div>
        <p style={{ WebkitFontSmoothing: smooth } as CSSProperties}>-webkit-font-smoothing: {smooth} — 같은 글자, 같은 굵기예요.</p>
      </div>
    </div>
  )
}

/* ---------- 03 커스텀 스크롤바 · scrollbar-gutter ---------- */
const SB_ROWS = ['봄 신상 니트', '린넨 셔츠', '와이드 슬랙스', '캔버스 토트백', '울 머플러', '데님 재킷', '코튼 양말 3종', '버킷햇', '레더 벨트', '패딩 조끼']
const isFirefox = () => typeof CSS !== 'undefined' && CSS.supports('-moz-appearance', 'none')
export function ScrollbarDemo({ fixed }: { fixed: boolean }) {
  const few = useRef<HTMLDivElement>(null)
  const many = useRef<HTMLDivElement>(null)
  const [m, setM] = useState({ bar: 0, shift: 0, ready: false })
  useLayoutEffect(() => {
    const measure = () => {
      const a = few.current, b = many.current
      if (!a || !b) return
      const bar = b.offsetWidth - b.clientWidth - 2 // 테두리 1px × 2
      setM({ bar, shift: Math.abs(a.clientWidth - b.clientWidth), ready: true })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (few.current) ro.observe(few.current)
    return () => ro.disconnect()
  }, [])
  const ff = isFirefox()
  const std = typeof CSS !== 'undefined' && CSS.supports('scrollbar-width', 'thin')
  const rule = fixed ? (std ? '표준 속성' : '-webkit- 대체') : ff ? '안 먹어요' : '-webkit- 전용'
  const list = (n: number) => SB_ROWS.slice(0, n).map((r, i) => <div className="bw-sb-row" key={r}><span>{r}</span><b>{((19 + i * 7) * 1000 % 90000 + 9000).toLocaleString('ko-KR')}원</b></div>)
  const cls = 'bw-sb-box ' + (fixed ? 'good' : 'bad')
  return (
    <div className="bw-col">
      <div className="bw-sb-pair">
        <div><small>글 3개 (스크롤 없음)</small><div className={cls} ref={few} tabIndex={0} aria-label="짧은 목록">{list(3)}</div></div>
        <div><small>글 10개 (스크롤 생김)</small><div className={cls} ref={many} tabIndex={0} aria-label="긴 목록">{list(10)}</div></div>
      </div>
      <div className="dv-meters">
        <Meter label="스크롤바 폭 (실측)" value={m.ready ? `${m.bar}px` : '—'} />
        <Meter label="내용 폭 차이 (실측)" value={m.ready ? `${m.shift}px` : '—'} bad={m.ready ? m.shift > 0 : undefined} />
        <Meter label="스크롤바 꾸밈" value={rule} bad={!fixed && ff ? true : undefined} />
      </div>
      <p className="dv-log">{m.ready && m.bar === 0
        ? <>이 기기는 스크롤바가 내용 위에 <b>겹쳐 떠요(overlay)</b>. 폭이 0px이라 밀림이 안 보여요. Windows 데스크톱에서 열면 차이가 보여요.</>
        : fixed ? <>스크롤바 자리를 <b>미리 비워 둬서</b> 두 목록의 가격 위치가 같아요</> : <>오른쪽 가격 위치를 비교해 보세요. 스크롤바가 생긴 쪽이 <b>왼쪽으로 밀려요</b></>}</p>
    </div>
  )
}

/* ---------- 04 백그라운드 전환 시 통신 중단 ---------- */
const UNITS = 20 // 0.5MB × 20 = 10MB
type Phase = 'idle' | 'up' | 'bg' | 'fail' | 'done'
export function BackgroundDemo({ fixed }: { fixed: boolean }) {
  const [vis, setVis] = useState(document.visibilityState)
  const [hides, setHides] = useState(0)
  const [phase, setPhaseS] = useState<Phase>('idle')
  const [sent, setSent] = useState(0)
  const [waste, setWaste] = useState(0)
  const [beacon, setBeacon] = useState('—')
  const [away, setAway] = useState(false)
  const t = useTimers()
  const phaseR = useRef<Phase>('idle')
  const sentR = useRef(0)
  const setPhase = (p: Phase) => { phaseR.current = p; setPhaseS(p) }
  const setUnits = (n: number) => { sentR.current = n; setSent(n) }
  const act = useRef({ bg: () => {}, back: () => {} })

  // 앱이 백그라운드로 가면: 문제 = 통째로 실패, 해결 = 끝난 조각까지 남기고 멈춤
  const goBg = () => {
    setBeacon(fixed ? 'sendBeacon 전달' : '유실')
    if (phaseR.current !== 'up') return
    const now = sentR.current
    if (fixed) {
      const keep = Math.floor(now / 2) * 2 // 1MB 조각 단위로 남아요
      setWaste(w => w + (now - keep)); setUnits(keep); setPhase('bg')
    } else {
      setWaste(w => w + now); setUnits(0); setPhase('fail')
    }
  }
  const comeBack = () => { if (phaseR.current === 'bg') setPhase('up') } // 해결: 보이면 이어서
  useEffect(() => { act.current = { bg: goBg, back: comeBack } })

  useEffect(() => { // 진짜 visibilitychange
    const on = () => {
      setVis(document.visibilityState)
      if (document.hidden) { setHides(h => h + 1); act.current.bg() } else act.current.back()
    }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  useEffect(() => {
    if (phase !== 'up') return
    const id = setInterval(() => {
      const n = sentR.current + 1
      setUnits(Math.min(UNITS, n))
      if (n >= UNITS) setPhase('done')
    }, 220)
    return () => clearInterval(id)
  }, [phase])

  const start = () => { setUnits(0); setBeacon('—'); setPhase('up') }
  const switchApp = () => {
    goBg(); setAway(true)
    t.set(() => { setAway(false); comeBack() }, 1800)
  }
  const mb = (u: number) => (u / 2).toFixed(1).replace('.0', '') + 'MB'
  const pct = (sent / UNITS) * 100
  const label: Record<Phase, ReactNode> = {
    idle: '업로드 전', up: fixed ? `조각 ${Math.min(10, Math.floor(sent / 2) + 1)}/10 올리는 중` : '한 번에 올리는 중',
    bg: '멈춤 · 돌아오면 이어서', fail: '네트워크 연결이 끊겼어요', done: '올리기 완료',
  }
  return (
    <div className="bw-col">
      <div className="bw-bg-screen">
        <b>영상 올리기 · trip.mp4 (10MB)</b>
        <div className={'bw-bg-bar' + (fixed ? ' chunks' : '')}><i style={{ width: pct + '%' }} className={phase === 'fail' ? 'fail' : ''} /></div>
        <span className={'bw-bg-state ' + phase}>{label[phase]}</span>
        {away && <div className="bw-bg-away">다른 앱 쓰는 중…</div>}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={start} disabled={phase === 'up' || phase === 'bg'}>{phase === 'fail' ? '처음부터 다시' : '업로드 시작'}</button>
        <button type="button" className="btn sm ghost" onClick={switchApp} disabled={away}>앱 전환했다 돌아오기</button>
      </div>
      <div className="dv-meters">
        <Meter label="올린 양" value={`${mb(sent)} / 10MB`} />
        <Meter label="버려진 전송량" value={mb(waste)} bad={waste > 2} />
        <Meter label="떠날 때 기록" value={beacon} bad={beacon === '—' ? undefined : !fixed} />
        <Meter label="지금 이 탭 (실제)" value={vis} />
        <Meter label="탭 숨김 감지 (실제)" value={`${hides}번`} />
      </div>
      <p className="dv-log">업로드 중에 <b>진짜로 다른 탭으로 갔다 와도</b> 똑같이 동작해요. 마지막 두 칸은 이 탭의 실제 <code>visibilitychange</code> 값이에요.</p>
    </div>
  )
}

/* ---------- 05 서드파티 쿠키 차단 (ITP) ---------- */
type Br = 'safari' | 'firefox' | 'chrome'
type Way = 'cookie' | 'token' | 'saa' | 'chips' | 'same'
type Res = [0 | 1 | 2, string] // 0 실패 · 1 성공 · 2 조건부
const ITP: Record<Way, Record<Br, Res>> = {
  cookie: {
    safari: [0, 'ITP가 서드파티 쿠키를 모두 막아요'],
    firefox: [0, '쿠키가 사이트마다 따로 저장돼서, 결제사 사이트에서 한 로그인이 안 보여요'],
    chrome: [2, '기본은 아직 보내지만, 시크릿 모드나 사용자가 막으면 똑같이 풀려요'],
  },
  token: {
    safari: [1, '쿠키 대신 Authorization 헤더로 보내요'], firefox: [1, '쿠키 대신 Authorization 헤더로 보내요'], chrome: [1, '쿠키 대신 Authorization 헤더로 보내요'],
  },
  saa: {
    safari: [1, '버튼을 누르고 허락하면 쿠키를 받아요 (그 사이트에 직접 방문한 적이 있어야 해요)'],
    firefox: [1, '버튼을 누르고 허락하면 쿠키를 받아요'], chrome: [1, '버튼을 누르면 쿠키를 받아요 (조건 충족 시)'],
  },
  chips: {
    safari: [2, '지원 여부가 버전마다 달라요. 꼭 실제 기기로 확인해요'],
    firefox: [1, 'iframe 안에서 새로 로그인한 세션이 이 사이트 전용으로 남아요'],
    chrome: [1, 'iframe 안에서 새로 로그인한 세션이 이 사이트 전용으로 남아요'],
  },
  same: {
    safari: [1, 'pay.palmer-shop.kr 은 같은 사이트라 퍼스트파티 쿠키예요'],
    firefox: [1, 'pay.palmer-shop.kr 은 같은 사이트라 퍼스트파티 쿠키예요'],
    chrome: [1, 'pay.palmer-shop.kr 은 같은 사이트라 퍼스트파티 쿠키예요'],
  },
}
const WAY_LABEL: [Way, string][] = [['token', '토큰 전달'], ['saa', 'Storage Access'], ['chips', 'CHIPS'], ['same', '같은 사이트']]
export function ItpDemo({ fixed }: { fixed: boolean }) {
  const [br, setBr] = useState<Br>('safari')
  const [way, setWay] = useState<Way>('token')
  const w: Way = fixed ? way : 'cookie'
  const [ok, note] = ITP[w][br]
  const okCount = (['safari', 'firefox', 'chrome'] as Br[]).filter(b => ITP[w][b][0] === 1).length
  const host = w === 'same' ? 'pay.palmer-shop.kr' : 'pay.dalpay.io'
  return (
    <div className="bw-col">
      <div className="dv-row">
        <Seg value={br} onChange={setBr} options={[['safari', 'Safari'], ['firefox', 'Firefox'], ['chrome', 'Chrome']]} />
      </div>
      {fixed && <Seg value={way} onChange={setWay} options={WAY_LABEL} />}
      <div className="bw-itp">
        <div className="bw-itp-url">palmer-shop.kr/checkout</div>
        <div className="bw-itp-body">
          <b>주문 결제</b>
          <div className={'bw-itp-frame s' + ok}>
            <small>iframe · {host}</small>
            {ok === 0 ? <><span>로그인이 필요해요</span><em>로그인해도 다시 열면 또 풀려요</em></>
              : <><span>김하늘님 · 저장된 카드 2개</span><em>{ok === 2 ? '조건에 따라 풀릴 수 있어요' : '로그인 유지'}</em></>}
          </div>
        </div>
      </div>
      <p className="dv-log"><b>{br === 'safari' ? 'Safari' : br === 'firefox' ? 'Firefox' : 'Chrome'}</b> · {note}</p>
      <div className="dv-meters">
        <Meter label="이 브라우저" value={ok === 1 ? '유지' : ok === 2 ? '조건부' : '풀림'} bad={ok === 1 ? false : true} />
        <Meter label="세 브라우저 모두 유지" value={`${okCount} / 3`} bad={okCount < 3} />
      </div>
    </div>
  )
}

/* ---------- 06 번역 확장 프로그램의 DOM 변경 ---------- */
const DICT: Record<string, string> = { '좋아요 ': 'Like ', '오늘의 레시피': "Today's recipe", '들기름 막국수': 'Perilla oil buckwheat noodles' }
/** 자동 번역 도구 흉내: 글자 노드를 <font><font>번역</font></font> 로 바꿔 끼워요 */
function fakeTranslate(root: HTMLElement) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const list: Text[] = []
  while (tw.nextNode()) list.push(tw.currentNode as Text)
  let n = 0
  for (const t of list) {
    const v = t.nodeValue ?? ''
    if (!v.trim() || t.parentElement?.closest('[translate="no"], .notranslate')) continue
    const outer = document.createElement('font'), inner = document.createElement('font')
    outer.style.verticalAlign = inner.style.verticalAlign = 'inherit'
    inner.textContent = DICT[v] ?? v
    outer.append(inner)
    t.replaceWith(outer)
    n++
  }
  return n
}
function LikeButton({ fixed, onReport }: { fixed: boolean; onReport: (real: number, shown: string) => void }) {
  const [liked, setLiked] = useState(false)
  const [n, setN] = useState(12)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => { onReport(n, (btn.current?.textContent ?? '').replace(/\D/g, '')) })
  return (
    <button type="button" ref={btn} className={'bw-like' + (liked ? ' on' : '')} onClick={() => { setLiked(!liked); setN(liked ? n - 1 : n + 1) }}>
      {liked && <span className="bw-heart" aria-hidden="true">♥</span>}
      {fixed ? <><span>좋아요 </span><span translate="no">{n}</span></> : <>좋아요 {n}</>}
    </button>
  )
}
class DemoBoundary extends Component<{ children: ReactNode; onError: (e: Error) => void; onReset: () => void }, { err: Error | null }> {
  state: { err: Error | null } = { err: null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error) { this.props.onError(err) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="bw-ext-crash" role="alert">
        <b>이 영역이 멈췄어요</b>
        <code>{this.state.err.name}: {this.state.err.message.slice(0, 120)}</code>
        <button type="button" className="btn sm" onClick={this.props.onReset}>다시 그리기</button>
      </div>
    )
  }
}
export function ExtensionDemo({ fixed }: { fixed: boolean }) {
  const [gen, setGen] = useState(0)
  const [on, setOn] = useState(false)
  const [frags, setFrags] = useState(0)
  const [crashes, setCrashes] = useState(0)
  const [rep, setRep] = useState({ real: 12, shown: '12' })
  const card = useRef<HTMLDivElement>(null)
  const translate = () => { if (card.current && !on) { setFrags(fakeTranslate(card.current)); setOn(true) } }
  const reset = () => { setGen(g => g + 1); setOn(false); setFrags(0) }
  const report = (real: number, shown: string) => setRep(r => (r.real === real && r.shown === shown ? r : { real, shown }))
  const stale = on && String(rep.real) !== rep.shown
  return (
    <div className="bw-col">
      <div className="bw-ext-wrap">
        <DemoBoundary key={gen} onError={() => setCrashes(c => c + 1)} onReset={reset}>
          <div className="bw-ext-card" ref={card}>
            <small>오늘의 레시피</small>
            <b>들기름 막국수</b>
            <LikeButton fixed={fixed} onReport={report} />
          </div>
        </DemoBoundary>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={translate} disabled={on}>{on ? '번역됨 (영어)' : '자동 번역 켜기 (흉내)'}</button>
        <span className="dv-log">{on ? <>이제 <b>♥ 좋아요</b>를 눌러 보세요</> : <>먼저 번역을 켜요</>}</span>
      </div>
      <div className="dv-meters">
        <Meter label="끼워 넣은 font 조각" value={frags} />
        <Meter label="멈춘 횟수" value={crashes} bad={crashes > 0} />
        <Meter label="화면 숫자 / 실제 값" value={`${rep.shown || '—'} / ${rep.real}`} bad={on ? stale : undefined} />
      </div>
    </div>
  )
}

/* ---------- 07 타임존 ---------- */
const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const show = (d: Date, timeZone: string) => new Intl.DateTimeFormat('ko-KR', { timeZone, month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
export function TimezoneDemo({ fixed }: { fixed: boolean }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [min, setMin] = useState(23 * 60)
  const hh = Math.floor(min / 60), mm = min % 60
  const local = new Date(2026, 10, 15, hh, mm) // 이 기기 시간대의 2026-11-15 hh:mm
  const naive = `2026-11-15T${pad(hh)}:${pad(mm)}:00` // ✕ 오프셋 없는 문자열
  const stored = fixed ? local.toISOString() : naive
  const back = fixed ? new Date(stored) : new Date(naive + 'Z') // ✕ 서버가 UTC라고 믿고 읽어요
  const listDate = fixed ? dayKey(back, tz) : local.toISOString().slice(0, 10) // ✕ UTC 날짜를 잘라 써요
  const trueKey = dayKey(local, tz)
  const diffH = Math.round((back.getTime() - local.getTime()) / 36e5)
  const utc = local.getTimezoneOffset() === 0
  return (
    <div className="bw-col">
      <div className="bw-tz-pick">
        <span>글 쓴 시각 <b>11월 15일 {pad(hh)}:{pad(mm)}</b></span>
        <Range value={min} min={0} max={1430} step={10} onChange={setMin} label="글 쓴 시각" />
        <div className="dv-row">
          <button type="button" className="btn sm ghost" onClick={() => setMin(30)}>새벽 0:30</button>
          <button type="button" className="btn sm ghost" onClick={() => setMin(23 * 60)}>밤 11:00</button>
        </div>
      </div>
      <div className="bw-tz-card">
        <div><small>서버에 저장된 값</small><code>"{stored}"</code></div>
        <div><small>글 상세에 찍힌 시각</small><b>{show(back, tz)}</b></div>
        <div><small>목록의 날짜</small><b>{listDate}</b></div>
        {fixed && tz !== 'Asia/Seoul' && <div><small>서울 기준으로 보면</small><b>{show(back, 'Asia/Seoul')}</b></div>}
      </div>
      <div className="dv-meters">
        <Meter label="이 기기 시간대 (실제)" value={tz} />
        <Meter label="상세 시각 어긋남" value={`${diffH > 0 ? '+' : ''}${diffH}시간`} bad={diffH !== 0} />
        <Meter label="목록 날짜" value={listDate === trueKey ? '맞아요' : '틀려요'} bad={listDate !== trueKey} />
      </div>
      <p className="dv-log">{utc
        ? <>이 기기는 <b>UTC</b>라 어긋남이 안 보여요. 개발 서버·CI가 UTC면 이 버그를 놓치는 이유예요.</>
        : <>슬라이더를 <b>새벽</b>과 <b>밤</b>으로 옮겨 보세요. 어느 쪽에서 날짜가 틀리는지는 시간대마다 달라요.</>}</p>
    </div>
  )
}

/* ---------- 08 고스트 클릭 ---------- */
export function GhostDemo({ fixed }: { fixed: boolean }) {
  const [open, setOpen] = useState(true)
  const [ghost, setGhost] = useState(0)
  const [log, setLog] = useState<ReactNode>('시트의 확인 버튼을 눌러 보세요')
  const [hit, setHit] = useState(false)
  const closedAt = useRef(0)
  const screen = useRef<HTMLDivElement>(null)
  const okBtn = useRef<HTMLButtonElement>(null)
  const t = useTimers()
  const close = () => { if (!open) return; closedAt.current = performance.now(); setOpen(false); setLog('시트를 닫았어요') }
  // 마우스에선 브라우저가 이렇게 하지 않아서, 터치에서 일어나는 일을 흉내 내요: 같은 자리에 click을 한 번 더
  const ghostAt = (x: number, y: number) => t.set(() => {
    const el = document.elementFromPoint(x, y)?.closest('[data-under]')
    if (el instanceof HTMLElement && screen.current?.contains(el)) el.click()
  }, 30)
  const under = () => {
    if (performance.now() - closedAt.current < 500) {
      setGhost(g => g + 1); setHit(true); t.set(() => setHit(false), 600)
      setLog(<>닫자마자 뒤에 있던 <b>주문 취소</b>까지 눌렸어요</>)
    } else setLog('주문 취소를 직접 눌렀어요 (데모라 아무 일도 없어요)')
  }
  const auto = () => {
    setOpen(true)
    t.set(() => {
      const r = okBtn.current?.getBoundingClientRect()
      if (!r) return
      closedAt.current = performance.now(); setOpen(false); setLog('시트를 닫았어요')
      if (!fixed) ghostAt(r.left + r.width / 2, r.top + r.height / 2)
    }, 350)
  }
  const badProps = {
    onTouchEnd: close, // ✕ 손을 떼는 순간 닫아요 → 뒤따르는 click이 아래 요소에 떨어져요
    onMouseUp: (e: MouseEvent) => { close(); ghostAt(e.clientX, e.clientY) },
    onClick: close,
  }
  return (
    <div className="bw-col">
      <div className="bw-gh-screen" ref={screen}>
        <div className="bw-gh-list">
          <b>주문 #20261115</b>
          <span>들기름 막국수 밀키트 × 2</span>
          <span>배송 준비 중</span>
        </div>
        <button type="button" className={'bw-gh-under' + (hit ? ' hit' : '')} data-under onClick={under}>주문 취소</button>
        {open && (
          <div className="bw-gh-sheet" role="dialog" aria-label="안내">
            <b>배송지가 바뀌었어요</b>
            <span>서울시 성동구 성수이로 00</span>
            <button type="button" ref={okBtn} className="btn bw-gh-ok" {...(fixed ? { onClick: close } : badProps)}>확인</button>
          </div>
        )}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" onClick={() => setOpen(true)} disabled={open}>시트 다시 열기</button>
        <button type="button" className="btn sm" onClick={auto}>자동으로 한 번 눌러 보기</button>
      </div>
      <div className="dv-meters">
        <Meter label="닫는 이벤트" value={fixed ? 'click' : 'touchend'} />
        <Meter label="뒤에서 같이 눌림" value={`${ghost}번`} bad={ghost > 0} />
      </div>
      <p className="dv-log">{log}</p>
    </div>
  )
}

/* ---------- 09 flex gap 미지원 ---------- */
const detectFlexGap = () => {
  const d = document.createElement('div')
  d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden'
  d.append(document.createElement('div'), document.createElement('div'))
  document.body.append(d)
  const ok = d.scrollHeight === 1
  d.remove()
  return ok
}
const GAP_CARDS = ['카페', '베이커리', '브런치', '디저트', '와인바', '포장']
export function GapDemo({ fixed }: { fixed: boolean }) {
  const [old, setOld] = useState(true)
  const [real] = useState(detectFlexGap)
  const list = useRef<HTMLDivElement>(null)
  const [g, setG] = useState({ x: 0, y: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const els = [...(list.current?.children ?? [])].map(e => e.getBoundingClientRect())
      if (els.length < 2) return
      const x = Math.round(els[1].left - els[0].right)
      const next = els.find(r => r.top > els[0].bottom - 1)
      const y = next ? Math.round(next.top - els[0].bottom) : 0
      setG(p => (p.x === x && p.y === y ? p : { x, y }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (list.current) ro.observe(list.current)
    return () => ro.disconnect()
  }, [old])
  return (
    <div className="bw-col">
      <Seg value={old ? 1 : 0} onChange={v => setOld(v === 1)} options={[[1, '옛 iPhone (iOS 14.4) 흉내'], [0, '요즘 브라우저']]} />
      <div className={'bw-gap-stage' + (old ? ' bw-old' : '')}>
        <div className={'bw-gap-list' + (fixed ? ' fallback' : '')} ref={list}>
          {GAP_CARDS.map(c => <div className="bw-gap-card" key={c}><i />{c}</div>)}
        </div>
      </div>
      <div className="dv-meters">
        <Meter label="가로 간격 (실측)" value={`${g.x}px`} bad={g.x < 6} />
        <Meter label="세로 간격 (실측)" value={`${g.y}px`} bad={g.y < 6} />
        <Meter label="이 브라우저의 flex gap (실제)" value={real ? '지원' : '미지원'} />
      </div>
    </div>
  )
}

/* ---------- 10 노치 · safe-area ---------- */
type Orient = 'p' | 'l'
const INSET: Record<Orient, { t: number; b: number; l: number; r: number }> = {
  p: { t: 44, b: 26, l: 0, r: 0 },
  l: { t: 0, b: 18, l: 40, r: 40 },
}
export function SafeAreaDemo({ fixed }: { fixed: boolean }) {
  const [o, setO] = useState<Orient>('p')
  const phone = useRef<HTMLDivElement>(null)
  const [cov, setCov] = useState(0)
  const ins = INSET[o]
  useLayoutEffect(() => {
    const p = phone.current
    if (!p) return
    const P = p.getBoundingClientRect()
    const inner = { l: P.left + p.clientLeft, t: P.top + p.clientTop, r: P.left + p.clientLeft + p.clientWidth, b: P.top + p.clientTop + p.clientHeight }
    const bands = [
      { l: inner.l, r: inner.r, t: inner.t, b: inner.t + ins.t },
      { l: inner.l, r: inner.r, t: inner.b - ins.b, b: inner.b },
      { l: inner.l, r: inner.l + ins.l, t: inner.t, b: inner.b },
      { l: inner.r - ins.r, r: inner.r, t: inner.t, b: inner.b },
    ]
    const n = [...p.querySelectorAll('[data-txt]')].filter(el => {
      const r = el.getBoundingClientRect()
      return bands.some(z => r.left < z.r - 0.5 && r.right > z.l + 0.5 && r.top < z.b - 0.5 && r.bottom > z.t + 0.5)
    }).length
    setCov(n)
  }, [o, ins])
  const vars = { '--sat': ins.t + 'px', '--sab': ins.b + 'px', '--sal': ins.l + 'px', '--sar': ins.r + 'px' } as CSSProperties
  return (
    <div className="bw-col">
      <Seg value={o} onChange={setO} options={[['p', '세로'], ['l', '가로']]} />
      <div className="bw-sa-wrap">
        <div className={'bw-sa-phone ' + o + (fixed ? ' safe' : '')} ref={phone} style={vars}>
          <div className="bw-sa-head"><span data-txt>‹</span><b data-txt>주문 내역</b><span data-txt>편집</span></div>
          <div className="bw-sa-list">
            {['들기름 막국수 · 배송 완료', '현미 누룽지 · 배송 중', '유자청 · 주문 접수'].map(x => <div key={x}>{x}</div>)}
          </div>
          <div className="bw-sa-tabs">{['홈', '검색', '주문', 'MY'].map(x => <span key={x} data-txt>{x}</span>)}</div>
          <i className="bw-sa-notch" aria-hidden="true" />
          <i className="bw-sa-home" aria-hidden="true" />
          <i className="bw-sa-zone" aria-hidden="true" />
        </div>
      </div>
      <div className="dv-meters">
        <Meter label="가려진 글자·버튼 (실측)" value={`${cov}개`} bad={cov > 0} />
        <Meter label="env() 흉내 값" value={`위 ${ins.t} · 아래 ${ins.b} · 옆 ${ins.l}`} />
      </div>
      <p className="dv-log">점선 영역이 <code>safe-area-inset</code>이에요. 노치·상태 표시줄·홈 바가 차지하는 자리예요.</p>
    </div>
  )
}
