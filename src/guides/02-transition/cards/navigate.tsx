import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { css, dir, done } from '../shared'

/* ---------- 01 푸시 ---------- */
const SETTINGS = [['🔔', '알림'], ['👤', '계정'], ['🔒', '개인정보'], ['🎨', '화면']] as const

export function Push() {
  const { A, clearA } = useMotion()
  const dev = useRef<HTMLDivElement>(null), a = useRef<HTMLDivElement>(null), b = useRef<HTMLDivElement>(null), sh = useRef<HTMLDivElement>(null)
  const st = useRef({ open: false, busy: false, gen: 0 })
  const [title, setTitle] = useState('알림')
  const [log, setLog] = useState<ReactNode>(<>항목을 눌러 <b>한 단계 들어가기</b></>)

  const go = async (toOpen: boolean, t?: string) => {
    const s = st.current
    if (s.busy || s.open === toOpen) return
    s.busy = true
    const g = s.gen
    if (t) setTitle(t)
    clearA(a.current, b.current, sh.current)
    const f = dir(toOpen)
    css(b.current, { transform: toOpen ? 'translateX(0)' : 'translateX(100%)' })
    css(a.current, { transform: toOpen ? 'translateX(-30%)' : 'none' })
    css(sh.current, { opacity: toOpen ? 0.2 : 0 })
    const an = A(b.current!, f({ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }), 300)
    A(a.current!, f({ transform: 'translateX(0)' }, { transform: 'translateX(-30%)' }), 300)
    A(sh.current!, f({ opacity: 0 }, { opacity: 0.2 }), 300)
    s.open = toOpen
    setLog(toOpen ? <>설정 → <b>{t}</b> (한 단계 깊이)</> : <><b>뒤로</b> — 반대 방향으로 복귀</>)
    await done(an)
    if (g === s.gen) s.busy = false
  }

  const demo = useDemo({
    reset() {
      const s = st.current
      s.gen++; s.open = false; s.busy = false
      clearA(a.current, b.current, sh.current)
      css(b.current, { transform: 'translateX(100%)' }); css(a.current, { transform: 'none' }); css(sh.current, { opacity: 0 })
    },
    async play(c) {
      await c.press(dev.current, a.current?.querySelector<HTMLElement>('.li') ?? null); await c.sleep(1400)
      await c.press(dev.current, b.current?.querySelector<HTMLElement>('.back') ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="t-push" num="01" title="푸시" en="Push" desc="새 화면이 오른쪽에서 밀고 들어오고, 이전 화면은 왼쪽으로 살짝 밀려나요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr" ref={a} style={{ zIndex: 0 }}>
            <div className="bar">설정</div>
            {SETTINGS.map(([ic, n]) => (
              <div className="li" key={n} onClick={() => go(true, n)}><i className="ic">{ic}</i>{n}<span className="chev">›</span></div>
            ))}
            <div className="shade" ref={sh} />
          </div>
          <div className="scr" ref={b} style={{ transform: 'translateX(100%)', boxShadow: '-6px 0 16px rgba(0,0,0,.08)' }}>
            <div className="bar"><button className="back" aria-label="뒤로" onClick={() => go(false)}>‹</button><span>{title}</span></div>
            <div className="pad">
              <div className="fake-line" style={{ width: '50%' }} />
              <div className="fake-line" />
              <div className="fake-line" style={{ width: '75%' }} />
              <div className="fake-line" style={{ width: '60%' }} />
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['방향', '→ 수평'], ['시간', '300ms'], ['이징', 'Standard']]}
        usage={[['언제', '목록 → 상세처럼 계층을 한 단계 깊이 들어갈 때'], ['규칙', '뒤로 가면 반드시 반대 방향으로 돌아와야 해요']]}
      />
    </Card>
  )
}

/* ---------- 02 모달 등장 ---------- */
export function ModalPresent() {
  const { A, clearA } = useMotion()
  const dev = useRef<HTMLDivElement>(null), a = useRef<HTMLDivElement>(null), b = useRef<HTMLDivElement>(null), sh = useRef<HTMLDivElement>(null)
  const openBtn = useRef<HTMLButtonElement>(null), closeBtn = useRef<HTMLButtonElement>(null)
  const st = useRef({ open: false, busy: false, gen: 0 })
  const [log, setLog] = useState<ReactNode>(<>버튼을 눌러 <b>독립된 작업 열기</b></>)

  const go = async (toOpen: boolean, msg?: ReactNode) => {
    const s = st.current
    if (s.busy || s.open === toOpen) return
    s.busy = true
    const g = s.gen
    clearA(a.current, b.current, sh.current)
    css(b.current, { transform: toOpen ? 'none' : 'translateY(110%)' })
    css(a.current, { transform: toOpen ? 'translateY(14px) scale(.92)' : 'none', borderRadius: toOpen ? '14px' : '0' })
    css(sh.current, { opacity: toOpen ? 0.25 : 0 })
    const dur = toOpen ? 350 : 250, ease = toOpen ? EASE.out : EASE.in
    const f = dir(toOpen)
    const an = A(b.current!, f({ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }), dur, ease)
    A(a.current!, f({ transform: 'none', borderRadius: '0px' }, { transform: 'translateY(14px) scale(.92)', borderRadius: '14px' }), dur, ease)
    A(sh.current!, f({ opacity: 0 }, { opacity: 0.25 }), dur, ease)
    s.open = toOpen
    setLog(toOpen ? <>아래에서 <b>덮으며 등장</b> — 뒤 화면은 물러남</> : msg)
    await done(an)
    if (g === s.gen) s.busy = false
  }

  const demo = useDemo({
    reset() {
      const s = st.current
      s.gen++; s.open = false; s.busy = false
      clearA(a.current, b.current, sh.current)
      css(b.current, { transform: 'translateY(110%)' }); css(a.current, { transform: 'none', borderRadius: '0' }); css(sh.current, { opacity: 0 })
    },
    async play(c) {
      await c.press(dev.current, openBtn.current); await c.sleep(1500)
      await c.press(dev.current, closeBtn.current); await c.sleep(400)
    },
  })

  return (
    <Card id="t-modal" num="02" title="모달 등장" en="Modal Present" desc="새 화면이 아래에서 올라와 덮고, 뒤 화면은 살짝 작아지며 물러나요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev} className="black" light>
          <div className="scr" ref={a} style={{ transformOrigin: '50% 0', zIndex: 0 }}>
            <div className="bar">피드</div>
            <div className="pad">
              <div className="fake-line" style={{ width: '40%' }} />
              <div style={{ height: 80, borderRadius: 10, background: 'var(--surface-2)' }} />
              <div className="fake-line" />
              <div className="fake-line" style={{ width: '70%' }} />
            </div>
            <div style={{ flex: 1 }} />
            <div className="pad"><button className="btn" ref={openBtn} onClick={() => go(true)}>✎ 새 글 쓰기</button></div>
            <div className="shade" ref={sh} />
          </div>
          <div className="scr" ref={b} style={{ top: 34, paddingTop: 0, borderRadius: '14px 14px 0 0', transform: 'translateY(110%)', zIndex: 5 }}>
            <div className="bar">
              <button ref={closeBtn} onClick={() => go(false, <><b>취소</b> — 아래로 내려가며 닫힘</>)}>취소</button>
              <span className="sp" style={{ textAlign: 'center' }}>새 게시물</span>
              <button onClick={() => go(false, <><b>등록</b> 완료 — 원래 화면으로</>)}>등록</button>
            </div>
            <div className="pad">
              <div style={{ height: 120, borderRadius: 10, border: '1px dashed var(--line)', display: 'grid', placeItems: 'center', fontSize: 13, color: 'var(--text-3)' }}>무슨 생각을 하고 있나요?</div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['방향', '↑ 수직'], ['시간', '350ms / 닫기 250ms'], ['이징', 'Decelerate']]}
        usage={[['언제', '글쓰기·결제·로그인처럼 흐름에서 잠깐 벗어나는 독립 작업'], ['규칙', '‘취소/완료’로 닫고, 끝나면 원래 자리로 돌아와요']]}
      />
    </Card>
  )
}

/* ---------- 03 페이드 스루 ---------- */
const FT_NAMES = ['홈', '검색', '프로필']
const FT_ICONS = ['⌂', '⌕', '◉']
const Tile = () => <div style={{ height: 60, borderRadius: 10, background: 'var(--surface-2)' }} />

export function FadeThrough() {
  const { A, clearA } = useMotion()
  const dev = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null)
  const scrs = useRef<(HTMLDivElement | null)[]>([])
  const st = useRef({ cur: 0, busy: false, gen: 0 })
  const [on, setOn] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>하단 탭으로 <b>서로 관계없는 화면</b> 이동</>)

  const init = () => scrs.current.forEach((s, i) => {
    clearA(s)
    css(s, { opacity: i === 0 ? 1 : 0, transform: 'none', pointerEvents: i === 0 ? 'auto' : 'none' })
  })
  useLayoutEffect(() => init(), []) // 첫 화면만 보이게

  const go = async (i: number) => {
    const s = st.current
    if (s.busy || i === s.cur) return
    s.busy = true
    const g = s.gen
    const out = scrs.current[s.cur]!, inn = scrs.current[i]!
    clearA(out, inn)
    css(out, { opacity: 0, pointerEvents: 'none' })
    css(inn, { opacity: 1, transform: 'none', pointerEvents: 'auto' })
    A(out, [{ opacity: 1 }, { opacity: 0 }], 90, EASE.in)
    const an = A(inn, [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'scale(1)' }], 210, EASE.out, 90)
    setOn(i)
    setLog(<>{FT_NAMES[s.cur]} 사라짐 → <b>{FT_NAMES[i]}</b> 나타남</>)
    s.cur = i
    await done(an)
    if (g === s.gen) s.busy = false
  }

  const demo = useDemo({
    reset() { const s = st.current; s.gen++; init(); s.cur = 0; s.busy = false; setOn(0) },
    async play(c) {
      const btn = (i: number) => bar.current?.children[i] as HTMLElement | null
      await c.press(dev.current, btn(1)); await c.sleep(1100)
      await c.press(dev.current, btn(2)); await c.sleep(1100)
      await c.press(dev.current, btn(0)); await c.sleep(400)
    },
  })

  const ref = (i: number) => (el: HTMLDivElement | null) => { scrs.current[i] = el }
  return (
    <Card id="t-fade" num="03" title="페이드 스루" en="Fade Through" desc="이전 화면이 먼저 사라지고, 새 화면이 살짝 커지며 나타나요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="ft-wrap">
              <div className="ft-scr" ref={ref(0)}>
                <b style={{ fontSize: 17 }}>홈</b>
                <div className="ft-hero" />
                <div className="fake-line" /><div className="fake-line" style={{ width: '70%' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Tile /><Tile /></div>
              </div>
              <div className="ft-scr" ref={ref(1)}>
                <b style={{ fontSize: 17 }}>검색</b>
                <div className="ft-search">🔍 무엇을 찾고 있나요?</div>
                <div className="chips"><span className="chip">카페</span><span className="chip">전시</span><span className="chip">산책로</span></div>
                <div className="muted" style={{ marginTop: 6 }}>최근 검색</div>
                <div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '45%' }} />
              </div>
              <div className="ft-scr" ref={ref(2)}>
                <b style={{ fontSize: 17 }}>프로필</b>
                <div className="ft-avatar" />
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15 }}>Palmer</div>
                <div className="ft-stats"><div><b>128</b>게시물</div><div><b>2.4k</b>팔로워</div><div><b>310</b>팔로잉</div></div>
              </div>
            </div>
            <div className="tabbar" ref={bar}>
              {FT_NAMES.map((n, i) => <button key={n} className={on === i ? 'on' : ''} onClick={() => go(i)}><i>{FT_ICONS[i]}</i>{n}</button>)}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['나감', '90ms'], ['들어옴', '210ms · 92→100%'], ['이징', 'Standard']]}
        usage={[['언제', '하단 탭바처럼 공간적 관계가 없는 화면끼리 바꿀 때'], ['규칙', '두 화면이 겹쳐 보이지 않게 ‘나감 → 들어옴’ 순서로']]}
      />
    </Card>
  )
}
