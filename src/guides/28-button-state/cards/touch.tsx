import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { Check } from '../shared'

/* ================= 04 눌림 ================= */
const PRESS_LOG = <>버튼을 <b>꾹</b> 눌러 보고, 누른 채 <b>밖으로</b> 빼 보세요</>

export function PressedState() {
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<'on' | 'off'>('on')
  const [down, setDown] = useState(false)
  const [n, setN] = useState(0)
  const [log, setLog] = useState<ReactNode>(PRESS_LOG)
  const t0 = useRef(0)
  const off = mode === 'off'

  const press = () => { t0.current = performance.now(); setDown(true) }
  const release = () => {
    if (!down) return
    setDown(false)
    const ms = Math.round(performance.now() - t0.current)
    if (!off) setLog(<>눌린 시간 <b>{ms}ms</b> — 손을 떼는 순간 원래대로 돌아와요</>)
  }
  const leave = (e: PointerEvent<HTMLButtonElement>) => {
    if (!down) return
    setDown(false)
    if (e.pointerType !== 'touch' || e.buttons) setLog(<>누른 채 밖으로 빼면 <b>실행되지 않아요</b> — 잘못 누른 걸 되돌리는 길이에요</>)
  }
  const go = () => {
    const next = n + 1
    setN(next)
    if (off) setLog(<>반응이 없어 눌렸는지 몰라요 — <b>또 누르게</b> 돼요 ({next}번째)</>)
  }
  const pick = (m: 'on' | 'off') => { setMode(m); setLog(m === 'off' ? <>눌림 표시를 껐어요. <b>눌러 보세요</b></> : PRESS_LOG) }
  const fake = async (c: { sleep: (ms: number) => Promise<void>; tap: (a: HTMLElement | null, b: Element | null) => void }) => {
    c.tap(box.current, btn.current); setDown(true); await c.sleep(150); setDown(false); go()
  }

  const demo = useDemo({
    reset() { setMode('on'); setDown(false); setN(0); setLog(PRESS_LOG) },
    async play(c) {
      await fake(c); setLog(<>꾹: <b>3% 작아지고 22% 진해져요</b></>); await c.sleep(1200)
      await fake(c); await c.sleep(900)
      pick('off'); await c.sleep(700)
      await fake(c); await c.sleep(500); await fake(c); await c.sleep(1500)
      pick('on'); await c.sleep(400)
    },
  })

  return (
    <Card id="bstate-pressed" num="04" title="눌림" en="Pressed · :active" demo={demo}
      desc="손가락이나 마우스가 버튼을 누르고 있는 그 짧은 순간이에요. ‘눌렸어요’를 바로 느끼게 해줘요.">
      <Stage log={log} logId="bstate-pressed-log">
        <div className={'box bs-box' + (off ? ' bs-nopress' : '')} ref={box}>
          <Seg value={mode} onChange={pick} options={[['on', '눌림 표시'], ['off', '반응 없음']]} />
          <div className="bs-sheet">
            <div className="bs-steps" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} className={i <= n % 4 ? 'on' : ''} />)}</div>
            <div className="bs-sum"><span>회원 정보 입력</span><b>{(n % 4) + 1} / 4단계</b></div>
            <button ref={btn} type="button" className={'bs-btn wide' + (down ? ' is-press' : '')}
              onPointerDown={press} onPointerUp={release} onPointerLeave={leave} onPointerCancel={() => setDown(false)}
              onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press() }} onKeyUp={release}
              onClick={go}>다음</button>
          </div>
          <div className="bs-tags" aria-hidden="true">
            <span>크기 <b>{down && !off ? '97%' : '100%'}</b></span>
            <span>배경 <b>{down && !off ? '22% 진하게' : '그대로'}</b></span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['크기', 'scale(.97)'], ['색', '22% 진하게'], ['반응', '100ms 안']]}
        usage={[
          ['언제', '누를 수 있는 모든 것. 특히 터치 화면은 호버가 없어 눌림이 첫 반응이에요'],
          ['주의', '눌림은 손을 떼면 바로 사라져야 해요. 계속 남는 표시는 ‘선택됨’이에요. 결과는 손을 뗄 때 실행해서, 밖으로 빼면 취소되게 두세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 05 선택됨 ================= */
type Fmt = 'b' | 'i' | 'u'
const FMTS: [Fmt, string, string][] = [['b', 'B', '굵게'], ['i', 'I', '기울임'], ['u', 'U', '밑줄']]
const SEL_LOG = <>B · I · U를 눌러 <b>켜고 꺼</b> 보세요</>

export function SelectedState() {
  const box = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState<Record<Fmt, boolean>>({ b: true, i: false, u: false })
  const [show, setShow] = useState<'shape' | 'color'>('shape')
  const [log, setLog] = useState<ReactNode>(SEL_LOG)
  const toggle = (f: Fmt, label: string) => {
    const v = !on[f]
    setOn(o => ({ ...o, [f]: v }))
    setLog(<>‘{label}’ {v ? '켜짐' : '꺼짐'} — <code>aria-pressed="{String(v)}"</code>, 다시 누를 때까지 <b>그대로 남아요</b></>)
  }
  const pick = (s: 'shape' | 'color') => { setShow(s); setLog(s === 'color' ? <>글자색만 바꾸면 <b>켜진 게 어느 건지</b> 한참 봐야 해요</> : <>배경 + 테두리로 <b>켜진 게 바로</b> 보여요</>) }
  const btnOf = (f: Fmt) => box.current?.querySelector<HTMLElement>(`[data-f="${f}"]`) ?? null

  const demo = useDemo({
    reset() { setOn({ b: true, i: false, u: false }); setShow('shape'); setLog(SEL_LOG) },
    async play(c) {
      await c.press(box.current, btnOf('i')); await c.sleep(1300)
      await c.press(box.current, btnOf('b')); await c.sleep(1300)
      pick('color'); await c.sleep(1800)
      pick('shape'); await c.sleep(500)
    },
  })

  return (
    <Card id="bstate-selected" num="05" title="선택됨" en="Selected · Toggle On" demo={demo}
      desc="눌러서 켜 두면 다시 누를 때까지 유지되는 상태예요. 순간인 ‘눌림’과 달리 계속 남아요.">
      <Stage log={log} logId="bstate-selected-log">
        <div className={'box bs-box' + (show === 'color' ? ' bs-selcolor' : '')} ref={box}>
          <Seg value={show} onChange={pick} options={[['shape', '배경 + 테두리'], ['color', '글자색만']]} />
          <div className="bs-sheet">
            <div className="bs-tools" role="toolbar" aria-label="글자 모양">
              {FMTS.map(([f, k, label]) => (
                <button key={f} type="button" data-f={f} className={'bs-tog f-' + f} aria-pressed={on[f]} aria-label={label} onClick={() => toggle(f, label)}>
                  {k}{show === 'shape' && on[f] && <span className="bs-dot" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <p className="bs-text" style={{ fontWeight: on.b ? 800 : 400, fontStyle: on.i ? 'italic' : 'normal', textDecoration: on.u ? 'underline' : 'none' }}>
              오늘의 원두는 에티오피아예요.
            </p>
          </div>
          <div className="bs-tags" aria-hidden="true">
            {FMTS.map(([f, , label]) => <span key={f}>{label} <b>{String(on[f])}</b></span>)}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['속성', 'aria-pressed'], ['유지', '다시 누를 때까지'], ['표시', '배경 + 테두리']]}
        usage={[
          ['언제', '굵게·음소거·즐겨찾기처럼 켜고 끄는 버튼, 여러 개 중 고른 필터'],
          ['vs 눌림', '눌림(:active)은 손가락이 닿은 0.1초, 선택됨은 켜 둔 동안 내내예요. 선택된 버튼도 누르는 순간엔 눌림이 함께 보여요'],
          ['주의', '글자색만 살짝 바꾸면 켜졌는지 모르고, 색약이면 더 몰라요. 배경·테두리·아이콘 중 하나를 더하고 aria-pressed로 화면 낭독기에도 알려주세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 06 비활성 ================= */
type DMode = 'disabled' | 'aria' | 'open'
const DIS_LOG: Record<DMode, ReactNode> = {
  disabled: <><code>disabled</code> — 눌러도 <b>아무 반응이 없고</b>, Tab 키로도 건너뛰어요</>,
  aria: <><code>aria-disabled</code> — 흐리게 보이지만 <b>눌러서 이유</b>를 들을 수 있어요</>,
  open: <>켜 두기 — 누르면 <b>빠진 칸을 짚어</b> 줘요</>,
}

export function DisabledState() {
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const nameEl = useRef<HTMLInputElement>(null)
  const agreeEl = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<DMode>('disabled')
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState<{ name?: boolean; agree?: boolean }>({})
  const [why, setWhy] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<ReactNode>(DIS_LOG.disabled)
  const valid = name.trim().length > 0 && agree
  const missing = [!name.trim() && '이름', !agree && '약관 동의'].filter(Boolean).join('과 ')

  const pick = (m: DMode) => { setMode(m); setErr({}); setWhy(false); setDone(false); setLog(DIS_LOG[m]) }
  const submit = () => {
    if (valid) { setDone(true); setErr({}); setWhy(false); setLog(<><b>가입했어요!</b> 조건이 채워지면 어느 방식이든 똑같이 눌려요</>); return }
    if (mode === 'aria') { setWhy(true); setLog(<>흐린 버튼이지만 눌러 보니 <b>{missing}</b>이 필요하대요</>); return }
    const e = { name: !name.trim(), agree: !agree }
    setErr(e)
    ;(e.name ? nameEl.current : agreeEl.current)?.focus()
    setLog(<>빠진 <b>{missing}</b>을 바로 짚고, 첫 칸으로 커서를 옮겼어요</>)
  }
  /** disabled 버튼은 이벤트를 받지 않아서(pointer-events: none) 바깥에서 위치로 확인해요 */
  const sheetDown = (e: PointerEvent<HTMLDivElement>) => {
    if (mode !== 'disabled' || valid || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
      setLog(<>눌러도 <b>아무 일도</b> 없어요… 왜 안 되는지는 스스로 찾아야 해요</>)
  }

  const demo = useDemo({
    reset() { pick('disabled'); setName(''); setAgree(false) },
    async play(c) {
      c.tap(box.current, btn.current); setLog(<>눌러도 <b>아무 일도</b> 없어요… 왜 안 되는지는 스스로 찾아야 해요</>); await c.sleep(1700)
      pick('aria'); await c.sleep(600)
      await c.press(box.current, btn.current); await c.sleep(1700)
      pick('open'); await c.sleep(600)
      await c.press(box.current, btn.current); await c.sleep(1500)
      let s = ''
      for (const ch of '도토리') { s += ch; setName(s); await c.sleep(140) }
      setErr(x => ({ ...x, name: false }))
      c.tap(box.current, agreeEl.current); setAgree(true); setErr({}); await c.sleep(700)
      await c.press(box.current, btn.current); await c.sleep(900)
    },
  })

  const disabledProps = mode === 'disabled' ? { disabled: !valid } : mode === 'aria' ? { 'aria-disabled': !valid || undefined, 'aria-describedby': why ? 'bstate-why' : undefined } : {}

  return (
    <Card id="bstate-disabled" num="06" title="비활성" en="Disabled" demo={demo}
      desc="지금은 누를 수 없다는 상태예요. 흐린 모습만으로는 ‘왜’ 안 되는지 알 수 없어서 쓰는 방법이 중요해요.">
      <Stage log={log} logId="bstate-disabled-log">
        <div className="box bs-box" ref={box}>
          <Seg value={mode} onChange={pick} options={[['disabled', 'disabled'], ['aria', 'aria-disabled'], ['open', '켜 두고 알려주기']]} />
          <div className="bs-sheet bs-form" onPointerDown={sheetDown}>
            <label className={'bs-field' + (err.name ? ' err' : '')}>
              <span>이름</span>
              <input ref={nameEl} value={name} placeholder="이름을 입력하세요" autoComplete="off" aria-invalid={err.name || undefined}
                onChange={e => { setName(e.target.value); setDone(false); if (err.name) setErr(x => ({ ...x, name: false })) }} />
              {err.name && <em>이름을 입력해 주세요</em>}
            </label>
            <label className={'opt bs-agree' + (err.agree ? ' err' : '')}>
              <input ref={agreeEl} type="checkbox" checked={agree} aria-invalid={err.agree || undefined}
                onChange={e => { setAgree(e.target.checked); setDone(false); if (err.agree) setErr(x => ({ ...x, agree: false })) }} />
              이용 약관에 동의해요
            </label>
            {err.agree && <em className="bs-err-line">약관에 동의해야 가입할 수 있어요</em>}
            <button ref={btn} type="button" className={'bs-btn wide' + (done ? ' is-ok' : '')} onClick={submit} {...disabledProps}>
              {done ? <><Check /> 가입 완료</> : '가입하기'}
            </button>
            {why && !valid && <p className="bs-why" id="bstate-why">{missing}이 필요해요</p>}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모양', '회색 배경 · 흐린 글자'], ['커서', 'not-allowed'], ['포커스', 'disabled는 건너뜀']]}
        usage={[
          ['언제', '권한이 없거나 아직 열리지 않은 기능처럼, 사용자가 지금 당장 바꿀 수 없는 이유일 때'],
          ['차이', 'disabled는 클릭·Tab이 모두 막혀 화면 낭독기도 지나쳐요. aria-disabled는 흐리게 보여도 포커스와 클릭을 받아 이유를 알려줄 수 있어요'],
          ['주의', '입력이 덜 됐다는 이유로 막기보다, 버튼은 켜 두고 누르면 빠진 칸을 알려주는 쪽이 덜 답답해요. 막는다면 왜 막혔는지 바로 옆에 써 주세요'],
        ]}
      />
    </Card>
  )
}
