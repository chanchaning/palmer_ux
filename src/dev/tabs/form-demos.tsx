/* 07 폼 · 입력 — 데모 모음. fixed=false 문제 그대로, true 해결 적용 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent as RDragEvent, type FocusEvent as RFocusEvent, type KeyboardEvent as RKeyboardEvent } from 'react'
import { useTimers } from '../../components/ui'
import { Meter } from '../ui'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const kb = (b: number) => (b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + 'MB' : Math.round(b / 1024) + 'KB')

/** 사용자가 입력한 것처럼 값을 넣어요 — React의 onChange까지 실제로 불려요 */
function setNative(el: HTMLInputElement, v: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
/** 컴포넌트가 사라지면 같이 멈추는 대기 */
function useSleep() {
  const timers = useTimers()
  return (ms: number) => new Promise<void>(r => { timers.set(r, ms) })
}

/* ---------- 01 한글 IME 중복 전송 ---------- */
type Msg = { id: number; text: string; me: boolean }
export function ImeDemo({ fixed }: { fixed: boolean }) {
  const [text, setText] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, text: '내일 회의 몇 시예요?', me: false }])
  const [ignored, setIgnored] = useState(0)
  const [log, setLog] = useState('')
  const [busy, setBusy] = useState(false)
  const inp = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const seq = useRef(1)
  const sleep = useSleep()

  useLayoutEffect(() => { const l = list.current; if (l) l.scrollTop = l.scrollHeight }, [msgs])

  const onKeyDown = (e: RKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    // keyCode 229 = 'IME가 처리 중인 키'. 사파리는 조합이 끝난 뒤 isComposing=false 로 오기도 해서 같이 봐요
    if (fixed && (e.nativeEvent.isComposing || e.keyCode === 229)) { setIgnored(n => n + 1); return }
    e.preventDefault()
    if (!text.trim()) return
    setMsgs(m => [...m, { id: seq.current++, text, me: true }])
    setText('')
  }

  const mine = msgs.filter(m => m.me)
  let broken = 0 // 앞 말풍선의 끝 글자가 또 간 경우(조각) + 똑같은 말풍선이 또 간 경우
  for (let i = 1; i < mine.length; i++) if (mine[i - 1].text.endsWith(mine[i].text)) broken++

  const simulate = async () => {
    const el = inp.current
    if (!el || busy) return
    setBusy(true)
    el.focus()
    setNative(el, '내일 봬요')
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '요' }))
    setLog('① ‘요’를 조합하는 중이에요')
    await sleep(350)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true }))
    setLog('② Enter keydown — isComposing: true (조합 중)')
    await sleep(350)
    // 입력칸이 비워졌다면, IME가 붙잡고 있던 ‘요’를 빈 칸에 확정해 넣어요
    if (el.value === '') setNative(el, '요')
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '요' }))
    setLog('③ compositionend — 조합이 끝났어요')
    await sleep(350)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, isComposing: false, bubbles: true, cancelable: true }))
    setLog('④ Enter keydown — isComposing: false (한 번 더 와요)')
    await sleep(300)
    setLog(fixed ? '조합 중 Enter는 건너뛰고, 조합이 끝난 Enter로 한 번만 보냈어요' : 'Enter 두 번이 모두 전송돼서 ‘요’가 따로 한 번 더 갔어요')
    setBusy(false)
  }

  return (
    <div className="fm-col">
      <div className="fm-chat" ref={list} aria-label="대화">
        {msgs.map(m => <div key={m.id} className={'fm-bubble' + (m.me ? ' me' : '')}>{m.text}</div>)}
      </div>
      <div className="dv-row">
        <input ref={inp} className="fm-input fm-grow" value={text} onChange={e => setText(e.target.value)} onKeyDown={onKeyDown}
          placeholder="한글로 쓰고 Enter" aria-label="메시지" enterKeyHint="send" />
        <button type="button" className="btn sm" onClick={simulate} disabled={busy}>IME 흉내</button>
      </div>
      <div className="dv-meters">
        <Meter label="보낸 말풍선" value={mine.length} />
        <Meter label="중복 · 조각 전송" value={broken} bad={broken > 0} />
        <Meter label="조합 중 Enter 건너뜀" value={ignored} bad={fixed ? false : undefined} />
      </div>
      <p className="dv-log">{log || <>‘IME 흉내’는 한글 입력기가 보내는 이벤트 순서를 그대로 재생해요.</>}</p>
    </div>
  )
}

/* ---------- 02 동적 필드 검증 꼬임 ---------- */
type Row = { id: number; name: string }
const PEOPLE: Row[] = [{ id: 1, name: '김하늘' }, { id: 2, name: '' }, { id: 3, name: '박도윤' }]
const need = (v: string) => (v.trim() ? null : '이름을 적어 주세요')
export function DynamicDemo({ fixed }: { fixed: boolean }) {
  const [rows, setRows] = useState(PEOPLE)
  const [byIndex, setByIndex] = useState<(string | null)[]>(() => PEOPLE.map(r => need(r.name)))
  const [byId, setById] = useState<Record<number, string | null>>(() => Object.fromEntries(PEOPLE.map(r => [r.id, need(r.name)])))
  const [log, setLog] = useState('')
  const nid = useRef(4)

  const errOf = (r: Row, i: number) => (fixed ? byId[r.id] : byIndex[i]) ?? null
  const edit = (i: number, v: string) => {
    const id = rows[i].id
    setRows(rs => rs.map((r, j) => (j === i ? { ...r, name: v } : r)))
    if (fixed) setById(e => ({ ...e, [id]: need(v) }))
    else setByIndex(e => { const n = [...e]; n[i] = need(v); return n })
  }
  const remove = (i: number) => {
    const r = rows[i]
    setRows(rs => rs.filter((_, j) => j !== i))
    if (fixed) setById(e => { const n = { ...e }; delete n[r.id]; return n })
    // ✕ 문제 그대로: 에러 배열은 그대로 — 뒤 줄이 앞으로 당겨지며 지운 줄의 에러를 물려받아요
    setLog(`${i + 1}번째 줄(${r.name || '빈 칸'})을 지웠어요`)
  }
  const add = () => { setRows(rs => [...rs, { id: nid.current++, name: '' }]); setLog('빈 줄을 추가했어요 (아직 검사 전)') }
  const reset = () => {
    setRows(PEOPLE); setByIndex(PEOPLE.map(r => need(r.name))); setById(Object.fromEntries(PEOPLE.map(r => [r.id, need(r.name)]))); setLog('')
  }

  const shown = rows.filter((r, i) => errOf(r, i)).length
  const wrong = rows.filter((r, i) => !!errOf(r, i) !== !!need(r.name)).length
  return (
    <div className="fm-col">
      <div className="fm-rows">
        {rows.map((r, i) => {
          const err = errOf(r, i)
          return (
            <div className="fm-frow" key={fixed ? r.id : i}>
              <span className="fm-fnum">{i + 1}</span>
              <div className="fm-fcell">
                <input className={'fm-input' + (err ? ' is-err' : '')} value={r.name} onChange={e => edit(i, e.target.value)}
                  placeholder="참석자 이름" aria-label={`${i + 1}번째 참석자`} aria-invalid={!!err} />
                {err && <small className="fm-err">{err}</small>}
              </div>
              <button type="button" className="btn ghost sm" onClick={() => remove(i)} aria-label={`${i + 1}번째 줄 지우기`}>지우기</button>
            </div>
          )
        })}
      </div>
      <div className="dv-row">
        <button type="button" className="btn ghost sm" onClick={add}>+ 줄 추가</button>
        <button type="button" className="btn ghost sm" onClick={reset}>처음부터</button>
      </div>
      <div className="dv-meters">
        <Meter label="실제로 빈 줄" value={rows.filter(r => !r.name.trim()).length} />
        <Meter label="에러 표시된 줄" value={shown} />
        <Meter label="엉뚱한 에러" value={wrong} bad={wrong > 0} />
      </div>
      <p className="dv-log">{log ? <>{log}. {wrong ? <b>멀쩡한 줄에 에러가 붙었어요</b> : <b>에러가 제자리에 있어요</b>}</> : '2번째 줄(빈 칸)을 지워 보세요.'}</p>
    </div>
  )
}

/* ---------- 03 자동 완성이 엉뚱한 칸을 채움 ---------- */
const SAVED = { user: 'haneul@palmer.dev', pass: 'old-pass-1234' }
type Fill = { label: string; what: string; wrong: boolean }
const TEXTY = ['text', 'email', 'tel', '']
/** 비밀번호 관리자의 판단을 단순하게 흉내 내요 — 칸의 실제 type · autocomplete · form 속성을 읽어요 */
function fakeAutofill(root: HTMLElement): Fill[] {
  const inputs = [...root.querySelectorAll('input')]
  const out: Fill[] = []
  const tok = (el: HTMLInputElement) => (el.getAttribute('autocomplete') ?? '').toLowerCase().split(/\s+/)
  const groups = new Set(inputs.filter(i => i.type === 'password').map(i => i.form))
  for (const g of groups) {
    const ins = inputs.filter(i => i.form === g)
    const firstPw = ins.findIndex(i => i.type === 'password')
    // ① username · email 토큰이 있으면 그 칸 ② 없으면 비밀번호 바로 앞 글자 칸 (autocomplete="off"는 무시)
    const user = ins.find(i => tok(i).some(t => t === 'username' || t === 'email'))
      ?? ins.slice(0, firstPw).reverse().find(i => TEXTY.includes(i.getAttribute('type') ?? '') && !tok(i).includes('one-time-code'))
    if (user) {
      user.value = SAVED.user; user.classList.add('fm-filled')
      const wrong = user.dataset.expect === 'none'
      if (wrong) user.classList.add('fm-wrong')
      out.push({ label: user.dataset.label ?? '', what: SAVED.user, wrong })
    }
    let filledPw = false
    for (const p of ins.filter(i => i.type === 'password')) {
      if (tok(p).includes('new-password')) { p.classList.add('fm-suggest'); out.push({ label: p.dataset.label ?? '', what: '강력한 비밀번호 제안', wrong: false }); continue }
      if (filledPw) continue
      filledPw = true
      p.value = SAVED.pass; p.classList.add('fm-filled')
      const wrong = p.dataset.expect === 'new'
      if (wrong) p.classList.add('fm-wrong')
      out.push({ label: p.dataset.label ?? '', what: '저장된 옛 비밀번호', wrong })
    }
  }
  return out
}
export function AutofillDemo({ fixed }: { fixed: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [fills, setFills] = useState<Fill[] | null>(null)
  const stop = (e: { preventDefault: () => void }) => e.preventDefault()
  const clear = () => {
    box.current?.querySelectorAll('input').forEach(i => { if (!i.hidden) i.value = ''; i.classList.remove('fm-filled', 'fm-wrong', 'fm-suggest') })
    setFills(null)
  }
  const run = () => {
    const root = box.current
    if (!root) return
    clear()
    setFills(fakeAutofill(root))
  }
  const wrong = fills?.filter(f => f.wrong).length ?? 0
  return (
    <div className="fm-col">
      <div className="fm-af" ref={box}>
        <div className="fm-af-top">
          <b>팔머몰</b>
          {fixed
            ? <form role="search" onSubmit={stop} className="fm-grow"><input type="search" name="q" autoComplete="off" className="fm-input" placeholder="상품 검색" aria-label="상품 검색" data-label="상품 검색" data-expect="none" /></form>
            : <input type="text" name="q" autoComplete="off" className="fm-input fm-grow" placeholder="상품 검색" aria-label="상품 검색" data-label="상품 검색" data-expect="none" />}
        </div>
        <div className="fm-af-body">
          <h5>비밀번호 다시 만들기</h5>
          {fixed ? (
            <form onSubmit={stop} className="fm-af-form">
              <input type="text" name="username" autoComplete="username" defaultValue={SAVED.user} hidden readOnly data-label="숨은 아이디 칸" />
              <label>새 비밀번호<input type="password" name="new" autoComplete="new-password" className="fm-input" data-label="새 비밀번호" data-expect="new" /></label>
              <label>새 비밀번호 확인<input type="password" name="new2" autoComplete="new-password" className="fm-input" data-label="새 비밀번호 확인" data-expect="new" /></label>
            </form>
          ) : (
            <div className="fm-af-form">
              <label>새 비밀번호<input type="password" autoComplete="off" className="fm-input" data-label="새 비밀번호" data-expect="new" /></label>
              <label>새 비밀번호 확인<input type="password" autoComplete="off" className="fm-input" data-label="새 비밀번호 확인" data-expect="new" /></label>
            </div>
          )}
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={run}>브라우저 자동 완성 흉내</button>
        <button type="button" className="btn ghost sm" onClick={clear}>비우기</button>
      </div>
      <div className="dv-meters">
        <Meter label="자동으로 채운 칸" value={fills ? fills.filter(f => f.what !== '강력한 비밀번호 제안').length : '—'} />
        <Meter label="엉뚱하게 채운 칸" value={fills ? wrong : '—'} bad={fills ? wrong > 0 : undefined} />
      </div>
      {fills && (
        <ul className="fm-fills">
          {fills.length === 0 && <li>채울 칸을 찾지 못했어요</li>}
          {fills.map((f, i) => <li key={i} className={f.wrong ? 'bad' : 'good'}><b>{f.label}</b> ← {f.what}</li>)}
        </ul>
      )}
    </div>
  )
}

/* ---------- 04 number 입력칸 휠 ---------- */
const PRICE = 50000
const comma = (v: string) => { const d = v.replace(/\D/g, '').replace(/^0+(?=\d)/, ''); return d ? fmt(Number(d)) : '' }
export function WheelDemo({ fixed }: { fixed: boolean }) {
  const [val, setVal] = useState(fixed ? fmt(PRICE) : String(PRICE))
  const [wheels, setWheels] = useState(0)
  const [moved, setMoved] = useState(0)
  const lastWheel = useRef(0)
  const inp = useRef<HTMLInputElement>(null)
  const amount = Number(val.replace(/[^\d.-]/g, '') || 0)

  const onWheel = () => { // 금액 칸에 포커스가 있는 채로 굴린 휠만 세요
    if (document.activeElement !== inp.current) return
    lastWheel.current = performance.now(); setWheels(n => n + 1)
  }
  const onChange = (v: string) => {
    if (performance.now() - lastWheel.current < 250) setMoved(n => n + 1) // 휠 직후에 바뀐 값
    setVal(fixed ? comma(v) : v)
  }
  const simulate = () => { // 휠 3칸 = 크롬이 stepDown을 3번 하는 것과 같아요
    const el = inp.current
    if (!el) return
    el.focus()
    setWheels(n => n + 3)
    if (el.type === 'number') { el.stepDown(3); setVal(el.value); setMoved(n => n + 3) }
  }
  return (
    <div className="fm-col">
      <div className="fm-sheet" onWheel={onWheel}>
        <div className="fm-sheet-line"><span>상품</span><b>가을 니트 · 1개</b></div>
        <div className="fm-sheet-line"><span>배송</span><b>무료</b></div>
        <label className="fm-sheet-field">
          <span>송금할 금액 (원)</span>
          {fixed
            ? <input ref={inp} className="fm-input" type="text" inputMode="numeric" pattern="[0-9,]*" value={val} onChange={e => onChange(e.target.value)} aria-label="송금할 금액" />
            : <input ref={inp} className="fm-input" type="number" step={100} value={val} onChange={e => onChange(e.target.value)} aria-label="송금할 금액" />}
        </label>
        {['받는 분: 이도윤', '은행: 팔머은행', '메모: 10월 모임비', '보내는 날: 오늘', '수수료: 없음', '예약 송금: 안 함'].map(t => <div className="fm-sheet-line" key={t}><span>{t.split(':')[0]}</span><b>{t.split(': ')[1]}</b></div>)}
      </div>
      <div className="dv-row">
        <button type="button" className="btn ghost sm" onClick={simulate}>휠 3칸 흉내</button>
        <button type="button" className="btn ghost sm" onClick={() => { setVal(fixed ? fmt(PRICE) : String(PRICE)); setWheels(0); setMoved(0) }}>처음부터</button>
      </div>
      <div className="dv-meters">
        <Meter label="저장될 금액" value={fmt(amount) + '원'} bad={amount !== PRICE} />
        <Meter label="포커스 두고 휠 굴림" value={wheels} />
        <Meter label="휠로 바뀐 횟수" value={moved} bad={moved > 0} />
      </div>
      <p className="dv-log">금액 칸을 한 번 누른 뒤, 마우스를 칸 위에 둔 채 목록을 휠로 내려 보세요.</p>
    </div>
  )
}

/* ---------- 05 드래그 앤 드롭 기본 동작 ---------- */
type Got = { name: string; size: number; url?: string }
export function DndDemo({ fixed }: { fixed: boolean }) {
  const [over, setOver] = useState(false)
  const [left, setLeft] = useState<string | null>(null)
  const [files, setFiles] = useState<Got[]>([])
  const [leaves, setLeaves] = useState(0)
  const [log, setLog] = useState('')
  const zone = useRef<HTMLDivElement>(null)
  const zoneTook = useRef(false)
  const urls = useRef<string[]>([])

  useEffect(() => {
    // 안전장치 — 데모가 떠 있는 동안은 페이지 어디에 파일을 놓아도 브라우저가 열지 않아요 (두 모드 모두)
    const guard = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault() }
    window.addEventListener('dragover', guard)
    window.addEventListener('drop', guard)
    const list = urls.current
    return () => {
      window.removeEventListener('dragover', guard)
      window.removeEventListener('drop', guard)
      list.forEach(u => URL.revokeObjectURL(u))
    }
  }, [])

  const take = (fl: FileList) => {
    const got = [...fl].map(f => {
      const url = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined
      if (url) urls.current.push(url)
      return { name: f.name, size: f.size, url }
    })
    setFiles(fs => [...got, ...fs].slice(0, 4))
    setLog(`파일 ${got.length}개를 받았어요`)
  }

  /* 드롭 구역 — 우리가 짠 코드 */
  const zoneOver = (e: RDragEvent) => {
    zoneTook.current = fixed
    if (fixed) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } // ✓ 이게 있어야 drop이 와요
    setOver(true)
  }
  const zoneDrop = (e: RDragEvent) => {
    if (!fixed) return // 문제 그대로: dragover를 안 막았으니 원래는 drop 자체가 오지 않아요
    e.preventDefault()
    take(e.dataTransfer.files)
  }
  /* 바깥 틀 — 데모 안전장치. 실제 이동은 늘 막고, 문제 모드에선 '막지 않았다면' 일어났을 일을 보여줘요 */
  const wrapOver = (e: RDragEvent) => { if (!zone.current?.contains(e.target as Node)) zoneTook.current = false; e.preventDefault() }
  const wrapDrop = (e: RDragEvent) => {
    e.preventDefault()
    setOver(false)
    if (!e.dataTransfer.types.includes('Files')) return
    if (zoneTook.current) return
    const name = e.dataTransfer.files[0]?.name ?? '사진.jpg'
    if (fixed) { setLog('구역 밖에 놓았지만 window 가드가 막아서 그대로예요'); return }
    setLeft(name); setLeaves(n => n + 1)
  }

  const simulate = async () => {
    const el = zone.current
    if (!el) return
    const c = document.createElement('canvas'); c.width = 160; c.height = 110
    const g = c.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, 0, 110); grd.addColorStop(0, '#6ec3f4'); grd.addColorStop(1, '#1f5fa8')
    g.fillStyle = grd; g.fillRect(0, 0, 160, 110); g.fillStyle = '#ffd166'; g.beginPath(); g.arc(120, 30, 14, 0, 7); g.fill()
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'))
    if (!blob || !zone.current) return
    const dt = new DataTransfer()
    dt.items.add(new File([blob], '여름 바다.png', { type: 'image/png' }))
    for (const t of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }))
  }

  return (
    <div className="fm-col">
      <div className="fm-dnd-wrap" onDragOver={wrapOver} onDrop={wrapDrop}>
        <div className="fm-post">
          <div className="fm-post-line" /><div className="fm-post-line s" />
          <span>작성 중인 후기 · 사진 첨부</span>
        </div>
        <div ref={zone} className={'fm-zone' + (over ? ' on' : '')} onDragEnter={() => setOver(true)} onDragOver={zoneOver} onDragLeave={() => setOver(false)} onDrop={zoneDrop}>
          {files.length ? (
            <div className="fm-thumbs">
              {files.map((f, i) => <figure key={i}>{f.url ? <img src={f.url} alt="" /> : <i>파일</i>}<figcaption>{f.name} · {kb(f.size)}</figcaption></figure>)}
            </div>
          ) : <span>사진을 여기에 끌어다 놓으세요</span>}
        </div>
        {left && (
          <div className="fm-left" role="alert">
            <b>브라우저가 파일을 열어 이 페이지를 떠났어요</b>
            <code>file:///C:/Users/haneul/Pictures/{left}</code>
            <small>작성 중이던 후기는 사라졌어요 (흉내)</small>
            <button type="button" className="btn sm" onClick={() => setLeft(null)}>뒤로 가기</button>
          </div>
        )}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={simulate}>파일 끌어 놓기 흉내</button>
        <span className="dv-log">{log || '실제 파일을 끌어다 놓아도 돼요'}</span>
      </div>
      <div className="dv-meters">
        <Meter label="받은 파일" value={files.length} />
        <Meter label="페이지 이탈" value={leaves} bad={leaves > 0} />
      </div>
    </div>
  )
}

/* ---------- 06 모바일 키보드가 입력칸을 가림 ---------- */
const KB_H = 190
export function KeyboardDemo({ fixed }: { fixed: boolean }) {
  const [open, setOpen] = useState(false)
  const [m, setM] = useState<{ hidden: number; bar: boolean } | null>(null)
  const [tick, setTick] = useState(0)
  const phone = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const keys = useRef<HTMLDivElement>(null)
  const focused = useRef<HTMLElement | null>(null)
  const timers = useTimers()

  const measure = useCallback(() => {
    const f = focused.current, k = keys.current, b = bar.current
    if (!f || !k || !b || !k.classList.contains('on')) { setM(null); return }
    const kr = k.getBoundingClientRect(), fr = f.getBoundingClientRect(), br = b.getBoundingClientRect()
    const hidden = Math.max(0, Math.min(fr.height, fr.bottom - kr.top))
    setM({ hidden: Math.round(hidden), bar: br.bottom <= kr.top + 1 })
  }, [])
  useEffect(() => {
    if (!open) return
    // 해결 적용: visualViewport resize 때처럼, 줄어든 화면 안으로 포커스된 칸을 스크롤해요 (진짜 페이지는 건드리지 않게 직접 계산)
    const id = timers.set(() => {
      const f = focused.current, s = body.current
      if (fixed && f && s) {
        const fr = f.getBoundingClientRect(), sr = s.getBoundingClientRect()
        const want = fr.top - sr.top - (sr.height - fr.height) / 2
        s.scrollTo({ top: s.scrollTop + want, behavior: 'smooth' })
      }
      timers.set(measure, 320)
    }, 280)
    return () => timers.clear(id)
  }, [open, fixed, tick, measure, timers])

  const onFocus = (e: RFocusEvent<HTMLElement>) => { focused.current = e.target; setOpen(true); setTick(t => t + 1) }
  const onBlur = (e: RFocusEvent<HTMLElement>) => { if (!phone.current?.contains(e.relatedTarget as Node)) { setOpen(false); setM(null); focused.current = null } }

  const field = (label: string, ph: string) => (
    <label className="fm-ph-field">{label}<input className="fm-input" inputMode="none" placeholder={ph} onFocus={onFocus} onBlur={onBlur} /></label>
  )
  return (
    <div className="fm-kb-wrap">
      <div className="fm-ph" ref={phone}>
        <div className="fm-ph-screen" style={fixed && open ? { bottom: KB_H } : undefined}>
          <div className="fm-ph-head">주문서</div>
          <div className="fm-ph-body" ref={body} onScroll={() => open && measure()}>
            {field('받는 분', '이름')}
            {field('연락처', '010-0000-0000')}
            <div className="fm-ph-line" /><div className="fm-ph-line s" /><div className="fm-ph-line" />
            {field('배송 메모', '문 앞에 놔 주세요')}
          </div>
          <div className="fm-ph-bar" ref={bar}><button type="button" className="btn fm-ph-pay" onMouseDown={e => e.preventDefault()}>32,000원 결제하기</button></div>
        </div>
        <div className={'fm-keys' + (open ? ' on' : '')} ref={keys} aria-hidden="true">
          {['ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ', 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ', 'ㅋㅌㅊㅍㅠㅜㅡ'].map(r => <div key={r}>{[...r].map(k => <span key={k}>{k}</span>)}</div>)}
          <div><span className="w">123</span><span className="sp">스페이스</span><button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => (document.activeElement as HTMLElement | null)?.blur()}>완료</button></div>
        </div>
      </div>
      <div className="fm-col fm-kb-side">
        <div className="dv-meters">
          <Meter label="키보드" value={open ? '올라옴' : '내려감'} />
          <Meter label="입력칸이 가려진 높이" value={m ? m.hidden + 'px' : '—'} bad={m ? m.hidden > 0 : undefined} />
          <Meter label="결제 버튼" value={m ? (m.bar ? '보여요' : '가려짐') : '—'} bad={m ? !m.bar : undefined} />
        </div>
        <p className="dv-log">맨 아래 <b>배송 메모</b> 칸을 눌러 보세요. {fixed ? '화면 높이를 키보드 위까지로 줄이고, 누른 칸을 가운데로 스크롤해요.' : '키보드가 화면 위를 덮기만 해요.'}</p>
      </div>
    </div>
  )
}

/* ---------- 07 고해상도 사진 원본 업로드 ---------- */
type Shot = { w: number; h: number; bytes: number; type: string; ms: number; url: string }
const UP_MBPS = 10 // LTE 업로드 10Mbps 가정
function paintPhoto(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#ffb36b'); sky.addColorStop(0.55, '#ff7a8a'); sky.addColorStop(1, '#3b2a6b')
  g.fillStyle = sky; g.fillRect(0, 0, w, h)
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(w * 0.7, h * 0.42, h * 0.09, 0, 7); g.fill()
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < 4; k++) { // 산 능선 네 겹
    g.fillStyle = ['#5b3f7a', '#45306a', '#2e2150', '#1c1436'][k]
    g.beginPath(); g.moveTo(0, h)
    for (let x = 0; x <= w; x += 40) g.lineTo(x, h * (0.55 + k * 0.1) - Math.sin(x / (300 + k * 90) + k) * h * 0.06 - rnd() * h * 0.02)
    g.lineTo(w, h); g.fill()
  }
  // 카메라 센서 노이즈 — 256px 타일을 깔아서 빠르게
  const t = document.createElement('canvas'); t.width = 256; t.height = 256
  const tg = t.getContext('2d')!, img = tg.createImageData(256, 256), d = new Uint32Array(img.data.buffer)
  for (let i = 0; i < d.length; i++) { const v = (rnd() * 255) | 0; d[i] = (255 << 24) | (v << 16) | (v << 8) | v }
  tg.putImageData(img, 0, 0)
  g.globalAlpha = 0.16; g.fillStyle = g.createPattern(t, 'repeat')!; g.fillRect(0, 0, w, h); g.globalAlpha = 1
  return c
}
const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob>((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('encode'))), type, q))
export function ResizeDemo({ fixed }: { fixed: boolean }) {
  const [step, setStep] = useState('')
  const [orig, setOrig] = useState<Shot | null>(null)
  const [out, setOut] = useState<Shot | null>(null)
  const urls = useRef<string[]>([])
  const alive = useRef(true)
  useEffect(() => { alive.current = true; const list = urls.current; return () => { alive.current = false; list.forEach(u => URL.revokeObjectURL(u)) } }, [])
  const keep = (b: Blob) => { const u = URL.createObjectURL(b); urls.current.push(u); return u }
  const frame = () => new Promise(r => requestAnimationFrame(r))

  const run = async () => {
    setOrig(null); setOut(null)
    setStep('4000×3000 사진을 만드는 중…'); await frame(); await frame()
    let t = performance.now()
    const big = paintPhoto(4000, 3000)
    const raw = await toBlob(big, 'image/jpeg', 0.95) // 폰 카메라가 저장하는 원본 JPEG 대신
    big.width = big.height = 0 // 48MB 캔버스 메모리 바로 놓기
    if (!alive.current) return
    const o: Shot = { w: 4000, h: 3000, bytes: raw.size, type: 'JPEG', ms: performance.now() - t, url: keep(raw) }
    setOrig(o)
    if (!fixed) { setStep('원본을 그대로 올려요'); return }
    setStep('긴 변 1600px로 줄이는 중…'); await frame()
    t = performance.now()
    const bmp = await createImageBitmap(raw) // EXIF 회전도 반영돼요 (imageOrientation 기본값 from-image)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    const g = c.getContext('2d')!; g.imageSmoothingQuality = 'high'; g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close()
    const small = await toBlob(c, 'image/webp', 0.8)
    if (!alive.current) return
    setOut({ w: c.width, h: c.height, bytes: small.size, type: small.type === 'image/webp' ? 'WebP' : 'PNG', ms: performance.now() - t, url: keep(small) })
    setStep('줄인 사진을 올려요')
  }
  const up = fixed ? out : orig
  const upSec = up ? (up.bytes * 8) / (UP_MBPS * 1e6) : 0
  return (
    <div className="fm-col">
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={run}>사진 찍어 올리기</button>
        <span className="dv-log">{step || '진짜로 큰 사진을 만들어 크기를 재요'}</span>
      </div>
      <div className="fm-shots">
        <figure className={orig ? '' : 'empty'}>{orig && <img src={orig.url} alt="원본 사진" />}<figcaption>원본 {orig ? `${orig.w}×${orig.h} · ${kb(orig.bytes)}` : ''}</figcaption></figure>
        {fixed && <figure className={out ? '' : 'empty'}>{out && <img src={out.url} alt="줄인 사진" />}<figcaption>올릴 사진 {out ? `${out.w}×${out.h} · ${out.type} · ${kb(out.bytes)}` : ''}</figcaption></figure>}
      </div>
      <div className="dv-meters">
        <Meter label="올리는 크기" value={up ? `${up.w}×${up.h}` : '—'} />
        <Meter label="올리는 용량" value={up ? kb(up.bytes) : '—'} bad={up ? up.bytes > 1024 * 1024 : undefined} />
        {fixed && <Meter label="줄이는 데 든 시간" value={out ? Math.round(out.ms) + 'ms' : '—'} />}
        <Meter label={`업로드 예상 (${UP_MBPS}Mbps)`} value={up ? upSec.toFixed(1) + '초' : '—'} bad={up ? upSec > 1 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 08 날짜 직접 입력 검증 ---------- */
const mask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 8); return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join('-') }
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const iso = (dt: Date) => dt.toISOString().slice(0, 10)
function checkDate(s: string, fixed: boolean): { ok: boolean; saved?: string; msg: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, msg: 'YYYY-MM-DD로 적어 주세요' }
  const [y, m, d] = s.split('-').map(Number)
  if (m < 1 || m > 12) return { ok: false, msg: '월은 1~12예요' }
  if (d < 1 || d > 31) return { ok: false, msg: '일은 1~31이에요' }
  if (fixed && d > daysIn(y, m)) return { ok: false, msg: `${y}년 ${m}월은 ${daysIn(y, m)}일까지 있어요` }
  const saved = iso(new Date(Date.UTC(y, m - 1, d))) // Date는 없는 날을 다음 달로 넘겨요
  return { ok: true, saved, msg: saved === s ? '저장했어요' : `${saved}로 바뀌어 저장됐어요` }
}
const CASES: [string, boolean][] = [['2026-02-31', false], ['2026-02-29', false], ['2028-02-29', true], ['2026-04-31', false], ['2026-11-15', true]]
export function DateDemo({ fixed }: { fixed: boolean }) {
  const [v, setV] = useState('2026-02-31')
  const [ran, setRan] = useState(false)
  const r = v.length === 10 ? checkDate(v, fixed) : null
  const results = CASES.map(([s, real]) => ({ s, real, ...checkDate(s, fixed) }))
  const leaked = results.filter(x => !x.real && x.ok).length
  return (
    <div className="fm-col">
      <label className="fm-date">
        <span>예약 날짜</span>
        <input className={'fm-input' + (r && !r.ok ? ' is-err' : '')} inputMode="numeric" placeholder="YYYY-MM-DD" value={v} onChange={e => setV(mask(e.target.value))} aria-label="예약 날짜" />
        <small className={r ? (r.ok ? (r.saved !== v ? 'fm-err' : 'fm-okmsg') : 'fm-err') : ''}>{r ? r.msg : '숫자만 쳐도 - 가 들어가요'}</small>
      </label>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={() => setRan(true)}>까다로운 날짜 5개 넣어 보기</button>
      </div>
      {ran && (
        <table className="fm-dtable">
          <thead><tr><th>입력</th><th>진짜 있는 날</th><th>결과</th></tr></thead>
          <tbody>
            {results.map(x => (
              <tr key={x.s} className={!x.real && x.ok ? 'bad' : ''}>
                <td>{x.s}</td><td>{x.real ? '있어요' : '없어요'}</td><td>{x.ok ? (x.saved === x.s ? '저장' : `저장 → ${x.saved}`) : '거절'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="dv-meters">
        <Meter label="통과한 없는 날짜" value={ran ? `${leaked} / 3` : '—'} bad={ran ? leaked > 0 : undefined} />
      </div>
    </div>
  )
}

/* ---------- 09 Enter 키 다중 제출 ---------- */
export function EnterDemo({ fixed }: { fixed: boolean }) {
  const [name, setName] = useState('이하늘')
  const [pending, setPending] = useState(false)
  const [presses, setPresses] = useState(0)
  const [orders, setOrders] = useState(0)
  const [blocked, setBlocked] = useState(0)
  const inflight = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const inp = useRef<HTMLInputElement>(null)
  const timers = useTimers()
  const sleep = useSleep()

  const order = () => {
    if (fixed) {
      if (inflight.current) { setBlocked(n => n + 1); return } // ✓ 함수 입구에서 막아요
      inflight.current = true
    }
    setPending(true)
    timers.set(() => setOrders(n => n + 1), 150) // 서버에 주문이 들어가는 시점
    timers.set(() => { setPending(false); inflight.current = false }, 1200)
  }
  const simulate = async () => {
    inp.current?.focus()
    for (let i = 0; i < 5; i++) {
      setPresses(n => n + 1)
      // 문제 그대로: input의 keydown Enter 핸들러 / 해결 적용: Enter가 일으키는 폼 제출(requestSubmit)
      if (fixed) form.current?.requestSubmit()
      else inp.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }))
      await sleep(60)
    }
  }
  return (
    <div className="fm-col">
      {fixed ? (
        <form ref={form} className="fm-order" onSubmit={e => { e.preventDefault(); order() }}>
          <label>받는 분<input ref={inp} className="fm-input" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.isTrusted) setPresses(n => n + 1) }} /></label>
          <button type="submit" className="btn" disabled={pending}>{pending ? '주문하는 중…' : '32,000원 주문하기'}</button>
        </form>
      ) : (
        <div className="fm-order">
          <label>받는 분<input ref={inp} className="fm-input" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (e.isTrusted) setPresses(n => n + 1); order() } }} /></label>
          <button type="button" className="btn" disabled={pending} onClick={order}>{pending ? '주문하는 중…' : '32,000원 주문하기'}</button>
        </div>
      )}
      <div className="dv-row">
        <button type="button" className="btn ghost sm" onClick={simulate}>Enter 5번 연타 흉내</button>
        <button type="button" className="btn ghost sm" onClick={() => { setPresses(0); setOrders(0); setBlocked(0) }}>처음부터</button>
      </div>
      <div className="dv-meters">
        <Meter label="Enter 누름" value={presses} />
        <Meter label="서버에 들어간 주문" value={orders} bad={orders > 1} />
        <Meter label="막은 중복 제출" value={blocked} bad={fixed ? false : undefined} />
      </div>
      <p className="dv-log">입력칸에서 Enter를 빠르게 여러 번 눌러 보세요. 버튼은 바로 회색이 되지만 {fixed ? <b>주문은 한 번만</b> : <b>Enter는 계속 주문을 보내요</b>}.</p>
    </div>
  )
}

/* ---------- 10 제어 · 비제어 혼용 ---------- */
const TERMS = [['tos', '이용약관 동의 (필수)'], ['privacy', '개인정보 수집 동의 (필수)'], ['ads', '혜택 알림 받기 (선택)']] as const
type Agree = Record<(typeof TERMS)[number][0], boolean>
const NONE: Agree = { tos: false, privacy: false, ads: false }
export function ControlledDemo({ fixed }: { fixed: boolean }) {
  const [agree, setAgree] = useState<Agree>(NONE)
  const [offKeys, setOffKeys] = useState('')
  const [busy, setBusy] = useState(false)
  const refs = useRef<Partial<Record<keyof Agree, HTMLInputElement | null>>>({})
  const allRef = useRef<HTMLInputElement>(null)
  const sleep = useSleep()
  const all = TERMS.every(([k]) => agree[k])

  useLayoutEffect(() => { // 화면(DOM)의 체크와 React 상태가 다른 칸을 세요
    setOffKeys(TERMS.filter(([k]) => refs.current[k] && refs.current[k]!.checked !== agree[k]).map(([k]) => k).join(','))
  }, [agree])
  const off = offKeys ? offKeys.split(',').length : 0
  const follow = async () => { // 실제 클릭을 순서대로 — 개인정보 직접 체크 → 전체 동의 → 전체 동의 해제
    if (busy) return
    setBusy(true)
    for (const el of [refs.current.privacy, allRef.current, allRef.current]) { await sleep(450); el?.click() }
    setBusy(false)
  }
  const reset = () => { setAgree({ ...NONE }); TERMS.forEach(([k]) => { const el = refs.current[k]; if (el) el.checked = false }) }
  return (
    <div className="fm-col">
      <div className="fm-terms">
        <label className="fm-check all"><input ref={allRef} type="checkbox" checked={all} onChange={e => { const v = e.target.checked; setAgree({ tos: v, privacy: v, ads: v }) }} />전체 동의</label>
        {TERMS.map(([k, label]) => (
          <label className="fm-check" key={k}>
            {fixed
              ? <input ref={el => { refs.current[k] = el }} type="checkbox" checked={agree[k]} onChange={e => setAgree(a => ({ ...a, [k]: e.target.checked }))} />
              : <input ref={el => { refs.current[k] = el }} type="checkbox" defaultChecked={agree[k]} onChange={e => setAgree(a => ({ ...a, [k]: e.target.checked }))} />}
            {label}
            <em className={offKeys.includes(k) ? 'off' : ''}>상태 {agree[k] ? '✓' : '—'}</em>
          </label>
        ))}
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={follow} disabled={busy}>따라 눌러 보기</button>
        <button type="button" className="btn ghost sm" onClick={reset} disabled={busy}>처음부터</button>
      </div>
      <div className="dv-meters">
        <Meter label="화면과 상태가 다른 칸" value={off} bad={off > 0} />
        <Meter label="서버로 갈 필수 동의" value={agree.tos && agree.privacy ? '동의' : '미동의'} />
      </div>
      <p className="dv-log">‘개인정보’를 직접 체크 → 전체 동의 → 전체 동의 해제 순서로 눌러요. 칸 옆 ‘상태’는 React가 아는 값이에요.</p>
    </div>
  )
}
