import { Fragment, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { HSeg, Icon, clamp, segBtn, useStateRef, vars, vibrate } from '../shared'

/* ---------- 10 컨텍스트 메뉴 ---------- */
type Person = { name: string; msg: string; me: string; c: string; pin?: boolean }
const PEOPLE: Person[] = [
  { name: '김디자', msg: '내일 리뷰 자료 공유드릴게요!', me: '좋아요, 기다릴게요 🙌', c: '' },
  { name: '박기획', msg: '시안 B안이 더 좋아 보여요', me: '저도 그렇게 생각해요', c: 'o' },
  { name: '이개발', msg: '빌드 올렸어요. 확인 부탁해요', me: '오 빠르네요 👍', c: '' },
  { name: '정와플', msg: '점심 뭐 먹을까요?', me: '국밥 어때요?', c: 'o' },
  { name: '최리서치', msg: '인터뷰 일정 잡았어요', me: '감사해요!', c: '' },
]
const CM_INIT: ReactNode = <>대화를 <b>0.5초 길게</b> 눌러보세요 (마우스는 우클릭도 돼요)</>

export function ContextMenu() {
  const m = useMotion()
  const timers = useTimers()
  const [items, setItemsS, itemsRef] = useStateRef<Person[]>(PEOPLE)
  const setItems = (f: (l: Person[]) => Person[]) => setItemsS(f(itemsRef.current))
  const [pressing, setPressing] = useState<string | null>(null)
  const [openP, setOpenP, openRef] = useStateRef<Person | null>(null)
  const [log, setLog] = useState<ReactNode>(CM_INIT)
  const dev = useRef<HTMLDivElement>(null)
  const listEl = useRef<HTMLDivElement>(null)
  const prev = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const ring = useRef<SVGSVGElement | null>(null)
  const pressRef = useRef<{ name: string; x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<Person | null>(null)
  useEffect(() => () => { ring.current?.remove() }, [])

  const itemEl = (name: string) => listEl.current?.querySelector<HTMLElement>(`[data-name="${CSS.escape(name)}"]`) ?? null
  const killRing = () => { ring.current?.remove(); ring.current = null }
  const cancelPress = (msg?: ReactNode) => {
    timers.clear(timer.current); timer.current = 0; killRing()
    pressRef.current = null; setPressing(null)
    if (msg) setLog(msg)
  }
  const openMenu = (p: Person) => {
    cancelPress()
    vibrate(10)
    flushSync(() => { setPreview(p); setOpenP(p) })
    const d = dev.current, it = itemEl(p.name), pv = prev.current, mn = menu.current
    if (d && it && pv && mn) {
      const H = d.clientHeight, r = m.rel(d, it)
      const ph = pv.offsetHeight, mh = mn.offsetHeight
      const top = clamp(r.top - 8, 34, H - ph - mh - 22)
      pv.style.top = top + 'px'; mn.style.top = top + ph + 10 + 'px'
      m.clearA(pv, mn)
      m.A(pv, [{ transform: 'translateY(' + (r.top - top) + 'px) scale(.9)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], 340, EASE.spring)
      m.A(mn, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], 300, EASE.spring, 60)
    }
    setLog(<><b>{p.name}</b> — 배경이 흐려지고 미리보기 + 빠른 실행 메뉴</>)
  }
  const close = (msg?: ReactNode) => { if (!openRef.current) return; setOpenP(null); if (msg) setLog(msg) }
  const startPress = (name: string, x: number, y: number) => {
    const d = dev.current, p = itemsRef.current.find(i => i.name === name)
    if (!d || !p) return
    cancelPress()
    pressRef.current = { name, x, y }; setPressing(name)
    const r = d.getBoundingClientRect()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'hig-cm-ring'); svg.setAttribute('viewBox', '0 0 36 36')
    const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circ.setAttribute('cx', '18'); circ.setAttribute('cy', '18'); circ.setAttribute('r', '14')
    svg.appendChild(circ)
    svg.style.left = x - r.left - d.clientLeft + 'px'; svg.style.top = y - r.top - d.clientTop + 'px'
    d.appendChild(svg); ring.current = svg
    circ.animate([{ strokeDashoffset: 88 }, { strokeDashoffset: 0 }], { duration: m.D(500), easing: 'linear', fill: 'forwards' })
    setLog(<>누르고 있는 중… <b>0.5초</b></>)
    timer.current = timers.set(() => openMenu(p), m.D(500))
  }
  const itemOf = (t: EventTarget) => (t as HTMLElement).closest<HTMLElement>('.hig-cm-item')?.dataset.name ?? null

  const onDown = (e: RPointerEvent) => {
    const n = itemOf(e.target)
    if (!n || openRef.current || e.button > 0) return
    startPress(n, e.clientX, e.clientY)
  }
  const onMove = (e: RPointerEvent) => {
    const p = pressRef.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress(<>움직여서 취소 — <b>스크롤</b>로 인식했어요</>)
  }
  const onCtx = (e: RMouseEvent) => {
    e.preventDefault()
    const n = itemOf(e.target), p = itemsRef.current.find(i => i.name === n)
    if (p && !openRef.current) openMenu(p)
  }
  const onKey = (e: KeyboardEvent) => {
    const n = itemOf(e.target), p = itemsRef.current.find(i => i.name === n)
    if (p && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) { e.preventDefault(); openMenu(p) }
  }
  const act = (a: string) => {
    const p = openRef.current
    if (!p) return
    if (a === 'copy') {
      try { navigator.clipboard?.writeText(p.msg).catch(() => {}) } catch { /* 무시 */ }
      close(<><b>복사하기</b> — “{p.msg}”</>)
    } else if (a === 'reply') close(<><b>{p.name}</b>에게 답장 — 대화방을 열지 않고 바로 실행</>)
    else if (a === 'pin') {
      close(<><b>{p.name}</b> 대화를 상단에 고정했어요</>)
      flushSync(() => setItems(list => [{ ...p, pin: true }, ...list.filter(i => i.name !== p.name)]))
      const el = itemEl(p.name)
      if (el) m.A(el, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], 260, EASE.out)
    } else {
      close(<><b>{p.name}</b> 대화를 삭제했어요</>)
      const el = itemEl(p.name)
      if (el) {
        m.A(el, [{ opacity: 1, height: el.offsetHeight + 'px' }, { opacity: 0, height: '0px', paddingTop: '0px', paddingBottom: '0px' }], 260, EASE.std)
          .onfinish = () => setItems(list => list.filter(i => i.name !== p.name))
      } else setItems(list => list.filter(i => i.name !== p.name))
    }
  }

  const demo = useDemo({
    reset() {
      cancelPress(); setOpenP(null)
      listEl.current?.querySelectorAll('.hig-cm-item').forEach(el => m.clearA(el))
      setItemsS(PEOPLE); setLog(CM_INIT)
    },
    async play(c) {
      const it = listEl.current?.querySelectorAll<HTMLElement>('.hig-cm-item')[1]
      if (!it) return
      const r = it.getBoundingClientRect()
      startPress(it.dataset.name ?? '', r.left + r.width * 0.4, r.top + r.height / 2)
      await c.sleep(1900)
      await c.press(dev.current, menu.current?.querySelector<HTMLElement>('button[data-act="pin"]') ?? null); await c.sleep(1200)
    },
  })

  return (
    <Card id="hig-ctx" num="10" title="컨텍스트 메뉴" en="Context Menu" demo={demo}
      desc="길게 누르면 배경이 흐려지고, 그 항목의 미리보기와 빠른 실행 메뉴가 떠올라요.">
      <Stage log={log}>
        <div className="device hig-cm-dev" id="hig-cm-dev" ref={dev}>
          <div className="statusbar"><span>9:41</span><span>●●● 100%</span></div>
          <div className="scr">
            <div className="bar">메시지</div>
            <div id="hig-cm-list" ref={listEl} onPointerDown={onDown} onPointerMove={onMove}
              onPointerUp={() => { if (timer.current) cancelPress(<>짧게 눌렀어요 — 대화방이 열리는 동작이에요. <b>길게</b> 눌러보세요</>) }}
              onPointerCancel={() => cancelPress()}
              onPointerLeave={() => { if (timer.current) cancelPress(<>손가락이 벗어나서 취소됐어요</>) }}
              onContextMenu={onCtx} onKeyDown={onKey}>
              {items.map(p => (
                <div key={p.name} className={'li hig-cm-item' + (pressing === p.name ? ' press' : '')} tabIndex={0} data-name={p.name}>
                  <i className={'ic round ' + p.c}>{p.name[0]}</i>
                  <span><b className="hig-cm-nm">{p.name}{p.pin && <span className="hig-cm-pin">📌</span>}</b><span className="sub">{p.msg}</span></span>
                </div>
              ))}
            </div>
          </div>
          <div className={'hig-cm-ov' + (openP ? ' on' : '')} id="hig-cm-ov"
            onClick={e => { if (e.target === e.currentTarget) close(<>바깥을 눌러 <b>닫기</b> — 블러가 걷히며 원래 화면으로</>) }}>
            <div className="hig-cm-prev" id="hig-cm-prev" ref={prev}>
              {preview && <><h5>{preview.name}</h5><div className="hig-cm-bub">{preview.msg}</div><div className="hig-cm-bub me">{preview.me}</div></>}
            </div>
            <div className="hig-cm-menu" id="hig-cm-menu" ref={menu}>
              <button data-act="reply" onClick={() => act('reply')}>답장 <Icon name="reply" /></button>
              <button data-act="copy" onClick={() => act('copy')}>복사하기 <Icon name="copy" /></button>
              <button data-act="pin" onClick={() => act('pin')}>상단에 고정 <Icon name="pin" /></button>
              <button data-act="delete" onClick={() => act('delete')}>삭제 <Icon name="trash" /></button>
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['조작', '길게 누르기 · 우클릭'], ['표현', '배경 블러 + 미리보기 + 메뉴']]}
        usage={[
          ['언제', '항목을 열지 않고 미리 보거나, 복사·공유·삭제 같은 자주 쓰는 동작을 빠르게 할 때'],
          ['주의', '여기에만 있는 기능을 숨기지 마세요. 메뉴의 동작은 다른 곳에서도 할 수 있어야 해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 11 편집 메뉴 ---------- */
type Seg = { t: string; mk?: boolean }
const ORIG: Seg[] = [{ t: '좋은 인터페이스는 콘텐츠를 앞세우고 스스로는 조용히 물러나요. 글자를 길게 누르거나 마우스로 끌어서 선택해 보세요.' }]
const SENT: [string, string][] = [
  ['좋은 인터페이스는 콘텐츠를 앞세우고 스스로는 조용히 물러나요.', 'A good interface puts content first and quietly steps back.'],
  ['글자를 길게 누르거나 마우스로 끌어서 선택해 보세요.', 'Press and hold, or drag with the mouse, to select the text.'],
]
const EM_INIT: ReactNode = <>문장 일부를 <b>드래그해서 선택</b>하거나 시뮬레이션을 눌러보세요</>
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s)

/** 문단 조각 배열에서 [s, e) 글자를 ins(표시 mark)로 바꿔요 */
function replaceSegs(segs: Seg[], s: number, e: number, ins: string): Seg[] {
  const out: Seg[] = []
  let pos = 0, done = false
  for (const g of segs) {
    const a = pos, b = pos + g.t.length
    pos = b
    if (a < s) out.push({ ...g, t: g.t.slice(0, Math.min(g.t.length, s - a)) })
    if (!done && b >= s) { out.push({ t: ins, mk: true }); done = true }
    if (b > e) out.push({ ...g, t: g.t.slice(Math.max(0, e - a)) })
  }
  if (!done) out.push({ t: ins, mk: true })
  return out.filter(g => g.t)
}

export function EditMenu() {
  const timers = useTimers()
  const [segs, setSegs] = useState<Seg[]>(ORIG)
  const [menuOn, setMenuOn] = useState(false)
  const [page2, setPage2, page2Ref] = useStateRef(false)
  const [pos, setPos] = useState<{ left: number; top: number; ax: number; below: boolean }>({ left: 0, top: 0, ax: 0, below: false })
  const [tr, setTr] = useState<{ text: string; hit: string | null } | null>(null)
  const [log, setLog] = useState<ReactNode>(EM_INIT)
  const box = useRef<HTMLDivElement>(null)
  const p = useRef<HTMLParagraphElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const saved = useRef<Range | null>(null)
  const clip = useRef('')
  const selT = useRef(0)

  const hide = () => { setMenuOn(false); setPos(s => ({ ...s, below: false })); saved.current = null; page2Ref.current = false; setPage2(false) }
  const place = (r: DOMRect) => {
    const bx = box.current, mn = menu.current
    if (!bx || !mn) return
    flushSync(() => { setMenuOn(true); setPage2(page2Ref.current) })
    const b = bx.getBoundingClientRect()
    const mw = mn.offsetWidth, mh = mn.offsetHeight, bw = bx.clientWidth
    const cx = r.left + r.width / 2 - b.left
    const left = clamp(cx - mw / 2, 6, Math.max(6, bw - mw - 6))
    let top = r.top - b.top - mh - 10, below = false
    if (top < 4) { top = r.bottom - b.top + 10; below = true }
    setPos({ left, top, below, ax: clamp(cx - left, 14, mw - 14) })
  }
  const firstRect = (range: Range) => { const rs = range.getClientRects(); return rs.length ? rs[0] : range.getBoundingClientRect() }
  const show = (range: Range) => {
    saved.current = range.cloneRange()
    place(firstRect(range))
    const t = range.toString().trim()
    setLog(<>“<b>{cut(t, 18)}</b>” 선택 — 바로 위에 편집 메뉴가 떠요</>)
  }
  const check = () => {
    const s = getSelection()
    if (!s || !s.rangeCount || s.isCollapsed) { if (!menu.current?.matches(':hover')) hide(); return }
    const r = s.getRangeAt(0)
    if (!p.current?.contains(r.commonAncestorContainer)) { hide(); return }
    if (!r.toString().trim()) return
    page2Ref.current = false; show(r)
  }
  const fns = useRef({ check, hide })
  fns.current = { check, hide }

  useEffect(() => {
    const onSel = () => { timers.clear(selT.current); selT.current = timers.set(() => fns.current.check(), 160) }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (saved.current && !menu.current?.contains(t) && !p.current?.contains(t)) fns.current.hide()
    }
    const onResize = () => fns.current.hide()
    document.addEventListener('selectionchange', onSel)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('selectionchange', onSel)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onResize)
    }
  }, [timers])

  const restoreSel = () => { if (!saved.current) return; const s = getSelection(); s?.removeAllRanges(); s?.addRange(saved.current) }
  const clearSel = () => getSelection()?.removeAllRanges()
  const onMenuClick = (e: RMouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button'), sv = saved.current
    if (!btn || !sv) return
    const a = btn.dataset.a, text = sv.toString()
    if (a === 'more' || a === 'back') {
      page2Ref.current = a === 'more'
      place(firstRect(sv))
      setLog(page2Ref.current ? <><b>›</b> 를 누르면 다음 항목이 이어져요</> : <>다시 <b>첫 페이지</b></>)
      return
    }
    if (a === 'copy') {
      clip.current = text
      const done = (how: string) => setLog(<><b>복사하기</b> — “{cut(text, 20)}” {how}</>)
      let usedApi = false
      try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
          usedApi = true
          const keep = sv.cloneRange()
          navigator.clipboard.writeText(text).then(() => done('클립보드에 담았어요'), () => {
            const s = getSelection(); s?.removeAllRanges(); s?.addRange(keep)
            try { document.execCommand('copy') } catch { /* 무시 */ }
            s?.removeAllRanges()
            done('클립보드에 담았어요')
          })
        }
      } catch { usedApi = false }
      if (!usedApi) {
        restoreSel()
        let ok = false
        try { ok = document.execCommand('copy') } catch { /* 무시 */ }
        done(ok ? '클립보드에 담았어요' : '(이 환경은 클립보드 접근 불가 · 데모 안에 보관)')
      }
      hide(); clearSel(); return
    }
    if (a === 'paste') {
      if (!clip.current) { setLog(<>붙여넣을 내용이 없어요 — 먼저 <b>복사하기</b>를 해보세요</>); return }
      const para = p.current
      if (para) {
        const pre = document.createRange()
        pre.selectNodeContents(para); pre.setEnd(sv.startContainer, sv.startOffset)
        const s = pre.toString().length, len = sv.toString().length
        setSegs(g => replaceSegs(g, s, s + len, clip.current))
      }
      setLog(<><b>붙여넣기</b> — 선택한 자리를 복사한 글자로 바꿨어요</>)
      hide(); clearSel(); return
    }
    if (a === 'tr') {
      const t = text.trim(), hit = SENT.find(([ko]) => ko.indexOf(t) >= 0)
      setTr({ text: t, hit: hit ? hit[1] : null })
      setLog(<><b>번역</b> — 앱을 벗어나지 않고 선택한 글을 바로 번역해요</>)
      hide(); clearSel(); return
    }
    setLog(<><b>{btn.textContent}</b> — 선택한 내용으로 바로 이어지는 동작이에요</>)
    hide(); clearSel()
  }
  const simulate = () => {
    const para = p.current
    if (!para) return
    const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT)
    let node: Node | null, target = '콘텐츠를 앞세우고', found: [Text, number] | null = null
    while ((node = walker.nextNode())) { const t = node as Text, i = t.data.indexOf(target); if (i >= 0) { found = [t, i]; break } }
    if (!found) {
      const n = para.firstChild && para.firstChild.nodeType === 3 ? para.firstChild as Text : null
      if (!n) return
      found = [n, 0]; target = n.data.slice(0, Math.min(6, n.data.length))
    }
    const r = document.createRange(); r.setStart(found[0], found[1]); r.setEnd(found[0], found[1] + target.length)
    const s = getSelection(); s?.removeAllRanges(); s?.addRange(r)
    timers.clear(selT.current); page2Ref.current = false; show(r)
  }
  const resetAll = () => {
    hide(); setTr(null); setSegs(ORIG); clip.current = ''
    const s = getSelection()
    if (s && s.rangeCount && p.current?.contains(s.getRangeAt(0).commonAncestorContainer)) s.removeAllRanges()
  }
  const q = (s: string) => menu.current?.querySelector<HTMLElement>(s) ?? null

  const demo = useDemo({
    reset() { resetAll(); setLog(EM_INIT) },
    async play(c) {
      await c.press(box.current, box.current?.querySelector<HTMLElement>('#hig-em-sim') ?? null); await c.sleep(1500)
      const cp = q('button[data-a="copy"]'); if (cp) { await c.press(box.current, cp); await c.sleep(1300) }
      simulate(); await c.sleep(1100)
      const t = q('button[data-a="tr"]'); if (t) { await c.press(box.current, t); await c.sleep(800) }
    },
  })

  const prevent = (e: { preventDefault: () => void }) => e.preventDefault()

  return (
    <Card id="hig-editm" num="11" title="편집 메뉴" en="Edit Menu" demo={demo}
      desc="텍스트를 선택하면 바로 위에 ‘복사하기 · 붙여넣기 · 번역’ 캡슐 메뉴가 떠요.">
      <Stage log={log}>
        <div className="box left hig-em-box" id="hig-em-box" ref={box}>
          <p className="hig-em-p" id="hig-em-p" ref={p}>
            {segs.map((g, i) => (g.mk ? <mark key={i} className="hig-em-mk">{g.t}</mark> : <Fragment key={i}>{g.t}</Fragment>))}
          </p>
          <div className={'hig-em-menu' + (menuOn ? ' on' : '') + (pos.below ? ' below' : '')} id="hig-em-menu" ref={menu}
            style={{ left: pos.left, top: pos.top, ...vars({ '--ax': pos.ax + 'px' }) } as CSSProperties}
            onPointerDown={prevent} onMouseDown={prevent} onClick={onMenuClick}>
            {page2
              ? <><button data-a="back" aria-label="이전">‹</button><button data-a="look">찾아보기</button><button data-a="share">공유…</button></>
              : <><button data-a="copy">복사하기</button><button data-a="paste">붙여넣기</button><button data-a="tr">번역</button><button data-a="more" aria-label="더 보기">›</button></>}
          </div>
          <div className="hig-em-tools">
            <button className="btn sm ghost" id="hig-em-sim" onClick={simulate}>선택 시뮬레이션</button>
            <button className="btn sm ghost" id="hig-em-reset" onClick={() => { resetAll(); setLog(EM_INIT) }}>원래대로</button>
          </div>
          <div className={'hig-em-tr' + (tr ? ' on' : '')} id="hig-em-tr">
            {tr && <><span>번역 · 한국어 → 영어</span><b>{tr.text}</b>{tr.hit ? <span>“{tr.hit}” (문장 번역)</span> : <span>실제 기기에서는 시스템 번역 시트가 열려요</span>}</>}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['위치', '선택 영역 바로 위'], ['항목', '복사하기 · 붙여넣기 · 번역']]}
        usage={[
          ['언제', '텍스트·이미지를 선택했을 때 그 선택에 대한 편집 동작'],
          ['주의', '선택을 가리지 않게 위(공간이 없으면 아래)에 띄우고, 꼬리가 선택을 가리켜요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 12 팝오버 ---------- */
type PK = 'fmt' | 'share' | 'more'
const PO_NAMES: Record<PK, string> = { fmt: '서식', share: '공유', more: '더 보기' }
const PO_INIT: ReactNode = <>상단 버튼(Aa · 공유 · ⋯)을 눌러보세요</>
const FS: [string, number][] = [['작게', 11], ['보통', 13], ['크게', 16]]

export function Popover() {
  const m = useMotion()
  const [openK, setOpenK, openRef] = useStateRef<PK | null>(null)
  const [narrow, setNarrow, narrowRef] = useStateRef(false)
  const [fs, setFs] = useState(13)
  const [sheetK, setSheetK] = useState<PK | null>(null)
  const [pos, setPos] = useState({ left: 0, top: 0, ax: 0 })
  const [log, setLog] = useState<ReactNode>(PO_INIT)
  const frame = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const doc = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const tb = useRef<HTMLDivElement>(null)

  const close = (msg?: ReactNode) => {
    if (!openRef.current) return
    setOpenK(null)
    if (msg) setLog(msg)
  }
  const open = (k: PK, btn: HTMLElement) => {
    if (openRef.current === k) { close(<>같은 버튼을 다시 누르면 <b>닫혀요</b></>); return }
    close()
    if (narrowRef.current) {
      setOpenK(k); setSheetK(k)
      setLog(<>좁은 화면에선 팝오버 대신 <b>시트</b>로 올라와요 — {PO_NAMES[k]}</>)
      return
    }
    flushSync(() => setOpenK(k))
    const f = frame.current, pv = pop.current
    if (f && pv) {
      const r = m.rel(f, btn), fw = f.clientWidth, pw = pv.offsetWidth
      const cx = r.left + r.width / 2
      const left = clamp(cx - pw / 2, 6, fw - pw - 6)
      setPos({ left, top: r.top + r.height + 9, ax: clamp(cx - left, 16, pw - 16) })
    }
    setLog(<><b>{PO_NAMES[k]}</b> 팝오버 — 꼬리가 누른 버튼을 정확히 가리켜요</>)
  }
  const content = (k: PK) => k === 'fmt'
    ? <><div className="hig-po-h">텍스트 크기</div>
      {FS.map(([n, s]) => (
        <button key={s} className="hig-po-row" data-fs={s}
          onClick={() => { setFs(s); setLog(<>텍스트 크기 <b>{n}</b> — 팝오버를 연 채로 결과를 바로 확인해요</>) }}>{n}<span>{s === fs ? '✓' : ''}</span></button>
      ))}</>
    : k === 'share'
      ? <><div className="hig-po-h">공유</div><div className="hig-po-share">
        {[['💬', '메시지'], ['✉️', '메일'], ['📝', '메모'], ['🔗', '링크 복사']].map(([e, n]) => (
          <button key={n} className="hig-po-sh" data-n={n} onClick={() => close(<><b>{n}</b> — 고르면 팝오버는 바로 사라져요</>)}><i>{e}</i>{n}</button>
        ))}</div></>
      : <><div className="hig-po-h">더 보기</div>
        {([['상단에 고정', '📌'], ['복제', '⧉'], ['삭제', '🗑']] as const).map(([n, e]) => (
          <button key={n} className={'hig-po-row' + (n === '삭제' ? ' danger' : '')} data-n={n}
            onClick={() => close(<><b>{n}</b> — 고르면 팝오버는 바로 사라져요</>)}>
            {n}<span style={n === '삭제' ? { color: 'var(--danger)' } : undefined}>{e}</span>
          </button>
        ))}</>

  useEffect(() => {
    const onResize = () => { if (openRef.current && !narrowRef.current) { openRef.current = null; setOpenK(null) } }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [openRef, narrowRef, setOpenK])

  const changeSeg = (v: 'wide' | 'narrow') => {
    close(); setNarrow(v === 'narrow')
    setLog(v === 'narrow' ? <><b>좁은 화면</b> — 같은 버튼이 시트를 띄워요</> : <><b>넓은 화면</b> — 버튼 옆에 팝오버로 떠요</>)
  }
  const tbBtn = (i: number) => tb.current?.querySelectorAll<HTMLElement>('button')[i] ?? null

  const demo = useDemo({
    reset() { close(); setNarrow(false); setFs(13); setSheetK(null); setLog(PO_INIT) },
    async play(c) {
      const f = frame.current
      await c.press(f, tbBtn(0)); await c.sleep(900)
      const big = pop.current?.querySelector<HTMLElement>('button[data-fs="16"]') ?? null
      if (big) { await c.press(f, big); await c.sleep(1100) }
      await c.press(f, tbBtn(1)); await c.sleep(1400)
      c.tap(f, doc.current); close(<>바깥을 누르면 <b>바로 닫혀요</b> — 배경은 어두워지지 않아요</>); await c.sleep(900)
      await c.press(seg.current, segBtn(seg.current, 'narrow')); await c.sleep(700)
      await c.press(f, tbBtn(2)); await c.sleep(1500)
      await c.press(f, scrim.current); await c.sleep(600)
      await c.press(seg.current, segBtn(seg.current, 'wide')); await c.sleep(400)
    },
  })

  const TB: [PK, string, ReactNode][] = [['fmt', '서식', 'Aa'], ['share', '공유', <Icon name="share" />], ['more', '더 보기', <Icon name="more" />]]

  return (
    <Card id="hig-pop" num="12" title="팝오버" en="Popover" demo={demo}
      desc="iPad·Mac에서 누른 버튼을 화살표 꼬리로 가리키며 뜨는 임시 창이에요. 바깥을 누르면 닫혀요.">
      <Stage log={log}>
        <div className="box hig-po-box" id="hig-po-box">
          <HSeg ref={seg} id="hig-po-seg" value={narrow ? 'narrow' : 'wide'} onChange={changeSeg} options={[['wide', 'iPad · Mac'], ['narrow', 'iPhone (좁은 화면)']]} />
          <div className={'hig-po-frame' + (narrow ? ' narrow' : '')} id="hig-po-frame" ref={frame}
            onPointerDown={e => {
              if (!openRef.current || narrowRef.current) return
              const t = e.target as HTMLElement
              if (t.closest('.hig-po-pop') || t.closest('#hig-po-tb button')) return
              close(<>바깥을 누르면 <b>바로 닫혀요</b> — 배경은 어두워지지 않아요</>)
            }}>
            <div className="hig-po-tb" id="hig-po-tb" ref={tb}>
              <span className="sp">회의록</span>
              {TB.map(([k, label, ic]) => (
                <button key={k} data-k={k} aria-label={label} className={openK === k ? 'on' : undefined} onClick={e => open(k, e.currentTarget)}>{ic}</button>
              ))}
            </div>
            <div className="hig-po-doc" id="hig-po-doc" ref={doc} style={vars({ '--fs': fs + 'px' })}>
              <h4>11월 디자인 리뷰</h4><p>탭 바 아이콘을 정리하고, 설정 화면에 큰 타이틀을 적용하기로 했어요.</p><p>다음 회의 · 11월 15일</p>
            </div>
            <div className={'hig-po-pop' + (openK && !narrow ? ' on' : '')} id="hig-po-pop" ref={pop}
              style={{ left: pos.left, top: pos.top, ...vars({ '--ax': pos.ax + 'px' }) } as CSSProperties}>
              {openK && !narrow && content(openK)}
            </div>
            <div className={'hig-po-scrim' + (openK && narrow ? ' on' : '')} id="hig-po-scrim" ref={scrim} onClick={() => close(<>배경을 눌러 <b>시트 닫기</b></>)} />
            <div className={'hig-po-sheet' + (openK && narrow ? ' on' : '')} id="hig-po-sheet">
              {sheetK && <><div className="grabber" />{content(sheetK)}</>}
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['플랫폼', 'iPad · Mac'], ['형태', '버튼을 가리키는 꼬리'], ['좁은 화면', '시트로 대체']]}
        usage={[
          ['언제', '서식·공유·옵션처럼 지금 작업을 벗어나지 않고 잠깐 고를 때'],
          ['주의', '팝오버 위에 또 팝오버를 띄우지 마세요. 좁은 화면에서는 시트로 바꿔 보여줘요.'],
        ]}
      />
    </Card>
  )
}
