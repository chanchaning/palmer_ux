import { useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { lv } from '../shared'

/* ---------- 04 모달 ---------- */
const BG_ITEMS = [['🔔', '알림 설정'], ['🔑', '비밀번호 변경'], ['🚪', '로그아웃']] as const

export function Modal() {
  const { D } = useMotion()
  const dev = useRef<HTMLDivElement>(null), dlg = useRef<HTMLDivElement>(null), scrim = useRef<HTMLDivElement>(null)
  const openLi = useRef<HTMLDivElement>(null), cancel = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<ReactNode>(<><b>계정 삭제</b>를 눌러 보세요</>)

  const set = (on: boolean, how?: ReactNode) => {
    setOpen(on)
    if (on) { cancel.current?.focus({ preventScroll: true }); setLog(<><b>모든 흐름이 멈춤</b> — 뒤 화면을 눌러 보세요</>) }
    else setLog(how)
  }

  const demo = useDemo({
    reset() { setOpen(false); setLog(<><b>계정 삭제</b>를 눌러 보세요</>) },
    async play(c) {
      await c.press(dev.current, openLi.current); await c.sleep(1100)
      await c.press(dev.current, scrim.current); await c.sleep(1300)
      await c.press(dev.current, cancel.current); await c.sleep(700)
    },
  })

  return (
    <Card id="feedback-modal" num="04" title="모달" en="Modal Dialog" desc="하던 일을 완전히 멈추고 답을 요구해요. 뒤 화면은 잠기고, 버튼으로만 빠져나가요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">계정</div>
            {BG_ITEMS.map(([ic, t]) => (
              <div className="li" key={t} onClick={() => setLog(<><b>{t}</b> 열림 — 모달이 없으면 자유롭게 이동</>)}><i className="ic">{ic}</i>{t}<span className="chev">›</span></div>
            ))}
            <div className="li fb-danger-li" ref={openLi} onClick={() => set(true)}><i className="ic o">🗑</i>계정 삭제<span className="chev">›</span></div>
          </div>
          <div className={'scrim' + (open ? ' on' : '')} ref={scrim} onClick={() => {
            dlg.current?.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.05)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: D(240) })
            setLog(<>👆 뒤 화면은 <b>잠겨 있어요</b> · 답하기 전엔 못 나가요</>)
          }} />
          <div className={'dialog' + (open ? ' on' : '')} ref={dlg} role="alertdialog" aria-modal="true" aria-labelledby="feedback-modal-t" aria-describedby="feedback-modal-d"
            onKeyDown={e => { if (e.key === 'Escape') set(false, <><b>Esc = 취소</b>로 닫힘</>) }}>
            <div className="ic-big">!</div>
            <h4 id="feedback-modal-t">계정을 삭제할까요?</h4>
            <p id="feedback-modal-d">주문 내역과 쿠폰이 모두 사라지고 되돌릴 수 없어요.</p>
            <div className="row">
              <button className="btn ghost sm" ref={cancel} onClick={() => set(false, <><b>취소</b> — 아무 일도 일어나지 않았어요</>)}>취소</button>
              <button className="btn danger sm" onClick={() => set(false, <><b>삭제</b> 결정 완료 (데모라 실제로 지우진 않아요)</>)}>삭제</button>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[lv(5, '최고'), ['배경', '잠금 · 스크림'], ['닫기', '버튼 · Esc = 취소']]}
        usage={[['언제', '삭제·결제·로그아웃처럼 되돌릴 수 없고 지금 결정해야 하는 일'], ['주의', '자주 띄우면 습관적으로 ‘확인’을 눌러요 — 정말 위험한 순간에만 쓰세요']]}
      />
    </Card>
  )
}

/* ---------- 05 바텀시트 ---------- */
const SHARE = [['✉', '메시지로 보내기'], ['🔗', '링크 복사'], ['⬇', '앨범에 저장'], ['⋯', '더보기']] as const

export function BottomSheet() {
  const dev = useRef<HTMLDivElement>(null), sheet = useRef<HTMLDivElement>(null), scrim = useRef<HTMLDivElement>(null), openBtn = useRef<HTMLButtonElement>(null)
  const drag = useRef({ y0: null as number | null, dy: 0, moved: false })
  const [on, setOn] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>오른쪽 위 <b>공유</b>를 눌러 보세요</>)

  const setT = (v: string) => { if (sheet.current) sheet.current.style.transform = v }
  const setS = (v: boolean, how?: ReactNode) => {
    setOn(v); setT('')
    setLog(v ? <>시트가 올라옴 — <b>배경 탭</b>이나 <b>끌어내리기</b>로 닫혀요</> : how)
  }
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { y0: e.clientY, dy: 0, moved: false }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent) => {
    const d = drag.current
    if (d.y0 === null) return
    d.dy = Math.max(0, e.clientY - d.y0)
    if (d.dy > 4) d.moved = true
    setT('translateY(' + d.dy + 'px)')
  }
  const end = () => {
    const d = drag.current
    if (d.y0 === null) return
    d.y0 = null
    setDragging(false)
    if (d.dy > 40) setS(false, <><b>아래로 끌어내려</b> 닫힘</>)
    else setT('')
  }

  const demo = useDemo({
    reset() { setOn(false); setT(''); setLog(<>오른쪽 위 <b>공유</b>를 눌러 보세요</>) },
    async play(c) {
      await c.press(dev.current, openBtn.current); await c.sleep(1300)
      await c.press(dev.current, scrim.current); await c.sleep(800)
    },
  })

  return (
    <Card id="feedback-sheet" num="05" title="바텀시트" en="Bottom Sheet" desc="아래에서 올라와 선택지를 보여줘요. 모달보다 가벼워서 배경을 누르거나 끌어내리면 닫혀요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">사진<span className="sp" /><button ref={openBtn} onClick={() => setS(true)}>공유</button></div>
            <div style={{ flex: 1, margin: 12, borderRadius: 14 }} className="g2" />
            <div className="pad" style={{ paddingTop: 0 }}><div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" style={{ width: '40%' }} /></div>
          </div>
          <div className={'scrim' + (on ? ' on' : '')} ref={scrim} onClick={() => setS(false, <><b>배경 탭</b>으로 닫힘 — 아무것도 고르지 않아도 OK</>)} />
          <div className={'sheet' + (on ? ' on' : '') + (dragging ? ' dragging' : '')} ref={sheet} role="dialog" aria-label="공유하기">
            <button className="grabber" aria-label="시트 닫기" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
              onClick={() => { if (!drag.current.moved) setS(false, <><b>손잡이 탭</b>으로 닫힘</>) }} />
            {SHARE.map(([i, t]) => (
              <button className="sheet-item" key={t} onClick={() => setS(false, <><b>{t}</b> 선택하고 닫힘</>)}><i>{i}</i>{t}</button>
            ))}
          </div>
        </Device>
      </Stage>
      <Info
        spec={[lv(4, '높음'), ['닫기', '배경 탭 · 끌어내리기'], ['위치', '엄지 닿는 하단']]}
        usage={[['언제', '공유·정렬·옵션 선택처럼 지금 화면과 이어지는 짧은 선택'], ['vs 모달', '결정을 강요하지 않아요 — 그냥 닫고 원래 일로 돌아갈 수 있어요']]}
      />
    </Card>
  )
}

/* ---------- 06 인라인 오류 ---------- */
type F = 'email' | 'pw'
const FIELDS: F[] = ['email', 'pw']
const HINT: Record<F, string> = { email: '로그인할 때 쓰는 주소예요', pw: '8자 이상, 숫자를 섞어 주세요' }
const RULE: Record<F, (v: string) => string> = {
  email: v => !v ? '이메일을 입력해 주세요' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '‘@’ 뒤에 도메인까지 써 주세요 (예: name@mail.com)' : '',
  pw: v => !v ? '비밀번호를 입력해 주세요' : v.length < 8 ? '8자 이상이어야 해요 (지금 ' + v.length + '자)' : !/\d/.test(v) ? '숫자를 하나 이상 넣어 주세요' : '',
}
interface FieldState { invalid: boolean; cls: '' | 'err' | 'ok'; text: string }
const fresh = (): Record<F, FieldState> => ({ email: { invalid: false, cls: '', text: HINT.email }, pw: { invalid: false, cls: '', text: HINT.pw } })

export function InlineError() {
  const box = useRef<HTMLDivElement>(null)
  const inputs = useRef<Record<F, HTMLInputElement | null>>({ email: null, pw: null })
  const vals = useRef<Record<F, string>>({ email: '', pw: '' })
  const touched = useRef<Record<F, boolean>>({ email: false, pw: false })
  const inv = useRef<Record<F, boolean>>({ email: false, pw: false })
  const [val, setVal] = useState<Record<F, string>>({ email: '', pw: '' })
  const [fs, setFs] = useState(fresh)
  const [log, setLog] = useState<ReactNode>(<>입력하고 <b>다른 칸으로 이동</b>하면 검사해요</>)

  const check = (f: F, quiet?: boolean) => {
    const err = RULE[f](vals.current[f].trim())
    inv.current[f] = !!err
    setFs(s => ({ ...s, [f]: { invalid: !!err, cls: err ? 'err' : 'ok', text: err ? '⚠ ' + err : '✓ 좋아요' } }))
    if (!quiet) setLog(err ? <><b>칸 바로 아래</b>에 이유 표시 · aria-invalid=true</> : <><b>고치자마자</b> 오류가 사라짐</>)
    return !err
  }
  const input = (f: F, v: string) => {
    vals.current[f] = v
    setVal(s => ({ ...s, [f]: v }))
    touched.current[f] = true
    if (inv.current[f]) check(f)
  }
  const blur = (f: F) => {
    if (!vals.current[f] && !touched.current[f]) return
    touched.current[f] = true
    check(f)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad = FIELDS.filter(f => !check(f, true))
    if (bad.length) { inputs.current[bad[0]]?.focus({ preventScroll: true }); setLog(<>제출 시 오류 <b>{bad.length}개</b> → 첫 번째 칸으로 포커스 이동</>) }
    else setLog(<>✓ <b>가입 완료</b> — 모든 칸 통과</>)
  }

  const demo = useDemo({
    reset() {
      FIELDS.forEach(f => { vals.current[f] = ''; touched.current[f] = false; inv.current[f] = false })
      setVal({ email: '', pw: '' }); setFs(fresh())
      setLog(<>입력하고 <b>다른 칸으로 이동</b>하면 검사해요</>)
    },
    async play(c) {
      const type = async (f: F, text: string) => { for (const ch of text) { input(f, vals.current[f] + ch); await c.sleep(70) } }
      c.tap(box.current, inputs.current.email); await type('email', 'palmer@mail'); touched.current.email = true; check('email'); await c.sleep(1300)
      c.tap(box.current, inputs.current.email); await type('email', '.com'); await c.sleep(900)
      c.tap(box.current, inputs.current.pw); await type('pw', 'waffle'); check('pw'); await c.sleep(1200)
    },
  })

  const field = (f: F, label: string, type: string, auto: string, ph: string) => (
    <div className="fb-field">
      <label htmlFor={'feedback-inline-' + f}>{label}</label>
      <input id={'feedback-inline-' + f} type={type} autoComplete={auto} placeholder={ph} aria-invalid={fs[f].invalid}
        aria-describedby={'feedback-inline-' + f + '-msg'} ref={el => { inputs.current[f] = el }}
        value={val[f]} onChange={e => input(f, e.target.value)} onBlur={() => blur(f)} />
      <div className={'fb-msg' + (fs[f].cls ? ' ' + fs[f].cls : '')} id={'feedback-inline-' + f + '-msg'} aria-live="polite">{fs[f].text}</div>
    </div>
  )

  return (
    <Card id="feedback-inline" num="06" title="인라인 오류" en="Inline Validation" desc="문제가 있는 입력칸 바로 아래에 이유를 적어줘요. 칸을 벗어날 때 검사하고, 고치면 바로 사라져요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}>
          <form className="fb-form" noValidate onSubmit={submit}>
            {field('email', '이메일', 'email', 'off', 'name@example.com')}
            {field('pw', '비밀번호', 'password', 'new-password', '8자 이상, 숫자 포함')}
            <button className="btn" type="submit">가입하기</button>
          </form>
        </div>
      </Stage>
      <Info
        spec={[lv(2, '낮음'), ['검사', 'blur 시 · 고칠 땐 즉시'], ['접근성', 'aria-invalid · describedby']]}
        usage={[['언제', '폼 입력 형식·필수값처럼 ‘어디가, 왜’ 틀렸는지 칸 단위로 알려줄 때'], ['주의', '타이핑 도중에 빨간 글씨부터 띄우지 마세요 — 다 쓰고 나갈 때 검사해요']]}
      />
    </Card>
  )
}
