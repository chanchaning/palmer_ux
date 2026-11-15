import { useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'

/* ================= 01 기본 ================= */
type Look = 'solid' | 'faint' | 'text'
const LOOK_LOG: Record<Look, ReactNode> = {
  solid: <>채워진 배경 · 진한 글자 — <b>‘누를 수 있다’</b>가 바로 보여요</>,
  faint: <>흐린 버튼은 <b>비활성처럼</b> 보여서 손이 잘 안 가요</>,
  text: <>글자만 있으면 <b>버튼인지 그냥 글인지</b> 헷갈려요</>,
}
const DEF_LOG = <>모양을 바꿔 보고 <b>주문하기</b>를 눌러 보세요</>

export function DefaultState() {
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [look, setLook] = useState<Look>('solid')
  const [n, setN] = useState(0)
  const [log, setLog] = useState<ReactNode>(DEF_LOG)
  const pick = (l: Look) => { setLook(l); setLog(LOOK_LOG[l]) }
  const order = () => { setN(x => x + 1); setLog(look === 'solid' ? <>주문을 넣었어요 · <b>{n + 1}번째</b></> : <>눌리긴 해요. 하지만 <b>{look === 'faint' ? '꺼진 버튼' : '설명 글'}</b>처럼 보여 지나치기 쉬워요</>) }

  const demo = useDemo({
    reset() { setLook('solid'); setN(0); setLog(DEF_LOG) },
    async play(c) {
      await c.press(box.current, btn.current); await c.sleep(1100)
      pick('faint'); await c.sleep(1600)
      pick('text'); await c.sleep(1600)
      pick('solid'); await c.sleep(500)
    },
  })

  return (
    <Card id="bstate-default" num="01" title="기본" en="Default · Enabled" demo={demo}
      desc="아무 일도 일어나지 않은 평소 모습이에요. 다른 모든 상태는 이 모습에서 ‘무엇이 바뀌는지’로 정해져요.">
      <Stage log={log} logId="bstate-default-log">
        <div className="box bs-box" ref={box}>
          <Seg value={look} onChange={pick} options={[['solid', '기본 버튼'], ['faint', '흐린 버튼'], ['text', '글자만']]} />
          <div className="bs-sheet">
            <div className="bs-sum"><span>아이스 라떼 × 2</span><b>11,000원</b></div>
            <div className="bs-measure">
              <button ref={btn} type="button" className={'bs-btn wide' + (look === 'faint' ? ' faint' : look === 'text' ? ' textonly' : '')} onClick={order}>주문하기</button>
              {look === 'solid' && <span className="bs-ruler" aria-hidden="true">↕ 44px</span>}
            </div>
          </div>
          <div className="bs-tags" aria-hidden="true">
            <span>배경 <b>{look === 'solid' ? '주 색' : look === 'faint' ? '연한 색' : '없음'}</b></span>
            <span>글자 대비 <b>{look === 'faint' ? '2:1 ✕' : '4.5:1 이상'}</b></span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['높이', '44px 이상'], ['라벨', '동사 · 2~5글자'], ['대비', '글자 4.5:1']]}
        usage={[
          ['언제', '모든 버튼의 출발점이에요. 호버·눌림·비활성은 전부 이 모습을 기준으로 조금씩 바꿔요'],
          ['주의', '기본 상태를 흐리게 만들면 비활성과 구분이 안 돼요. 한 화면의 주 버튼은 하나만 채워진 색으로 두세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 02 호버 ================= */
type HoverMode = 'base' | 'hover' | 'touch'
const HOVER_LOG = <>마우스를 <b>올려</b> 보세요. 터치 기기로도 바꿔 보세요</>

export function HoverState() {
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<HoverMode>('base')
  const [tip, setTip] = useState(false)
  const [log, setLog] = useState<ReactNode>(HOVER_LOG)
  const touch = mode === 'touch'

  const pick = (m: HoverMode) => {
    setMode(m); setTip(false)
    setLog(m === 'hover' ? <>호버: 배경이 <b>12% 진해지고</b> 커서가 손가락 모양이 돼요</>
      : m === 'touch' ? <>터치 화면엔 ‘올려두기’가 없어요 — <b>호버로만 숨긴 설명은 영영 안 보여요</b></>
        : HOVER_LOG)
  }
  const enter = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') setLog(<>손가락은 <b>닿는 순간이 곧 누름</b>이라 호버 단계가 없어요</>)
    else if (!touch) setLog(<>마우스를 올리자 <b>배경이 진해졌어요</b> — 누를 수 있다는 신호예요</>)
  }
  const tipEnter = (e: PointerEvent<HTMLButtonElement>) => { if (e.pointerType === 'mouse' && !touch) setTip(true) }

  const demo = useDemo({
    reset() { setMode('base'); setTip(false); setLog(HOVER_LOG) },
    async play(c) {
      c.tap(box.current, btn.current); pick('hover'); await c.sleep(1500)
      setTip(true); setLog(<>ⓘ에 올리면 설명이 떠요 — 마우스가 있을 때만요</>); await c.sleep(1500)
      pick('touch'); await c.sleep(2000)
      pick('base'); await c.sleep(400)
    },
  })

  return (
    <Card id="bstate-hover" num="02" title="호버" en="Hover" demo={demo}
      desc="마우스를 올렸을 때 살짝 바뀌는 모습이에요. ‘이건 누를 수 있어요’라는 작은 신호예요.">
      <Stage log={log} logId="bstate-hover-log">
        <div className={'box bs-box' + (touch ? ' bs-nohover' : '')} ref={box}>
          <Seg value={mode} onChange={pick} options={[['base', '기본'], ['hover', '호버 보기'], ['touch', '터치 기기']]} />
          <div className="bs-sheet">
            <div className="bs-sum">
              <span>배송비 포함 합계
                <span className="bs-tipwrap">
                  <button type="button" className="bs-info" aria-label="합계 설명 보기" aria-expanded={tip}
                    onPointerEnter={tipEnter} onPointerLeave={e => { if (e.pointerType === 'mouse') setTip(false) }}
                    onClick={() => { setTip(t => !t); setLog(<>설명은 <b>눌러도 열리게</b> 해야 터치에서도 보여요</>) }}>i</button>
                  {tip && <span className="bs-tip" role="tooltip">배송비 3,000원이 포함돼요</span>}
                </span>
              </span>
              <b>14,000원</b>
            </div>
            <button ref={btn} type="button" className={'bs-btn wide' + (mode === 'hover' ? ' is-hover' : '')} onPointerEnter={enter}
              onClick={() => setLog(touch ? <>터치는 호버 없이 <b>바로 눌림</b>으로 넘어가요</> : <>결제 화면으로 넘어가요</>)}>결제하기</button>
          </div>
          <div className="bs-tags" aria-hidden="true">
            <span>배경 <b>{mode === 'hover' ? '12% 진하게' : '그대로'}</b></span>
            <span>커서 <b>{touch ? '없음' : 'pointer'}</b></span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['바뀌는 것', '배경 8–12% 진하게'], ['시간', '100–150ms'], ['조건', '@media (hover: hover)']]}
        usage={[
          ['언제', '마우스를 쓰는 화면에서 누를 수 있는 것과 아닌 것을 구분해 줄 때'],
          ['주의', '터치에는 호버가 없어요. 중요한 설명이나 메뉴를 호버에만 숨기지 말고, 눌러서도 열리게 하세요. 호버 스타일은 hover 미디어 쿼리 안에만 두세요'],
        ]}
      />
    </Card>
  )
}

/* ================= 03 포커스 ================= */
const ACTIONS = ['취소', '임시 저장', '발행']
const FOCUS_LOG = <>여기를 한 번 누른 뒤 <kbd>Tab</kbd> 키로 버튼 사이를 옮겨 보세요</>

export function FocusState() {
  const box = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'ring' | 'none'>('ring')
  const [fx, setFx] = useState<number | null>(null)
  const [key, setKey] = useState(0)
  const [log, setLog] = useState<ReactNode>(FOCUS_LOG)
  const none = mode === 'none'

  const onFocus = (i: number) => (e: FocusEvent<HTMLButtonElement>) => {
    const kb = e.currentTarget.matches(':focus-visible')
    setLog(kb
      ? none ? <>지금 <b>‘{ACTIONS[i]}’</b>에 있는데… 화면에선 <b>어디인지 안 보여요</b></> : <>키보드로 <b>‘{ACTIONS[i]}’</b>에 왔어요 — 링이 위치를 알려줘요</>
      : <>마우스로 누르면 링이 안 나와요 — <b>:focus-visible</b>은 키보드일 때만 켜져요</>)
  }
  const pick = (m: 'ring' | 'none') => { setMode(m); setLog(m === 'none' ? <><code>outline: none</code> — 키보드 사용자는 <b>길을 잃어요</b></> : <>링이 돌아왔어요: <b>2px · 간격 2px</b></>) }

  const demo = useDemo({
    reset() { setMode('ring'); setFx(null); setLog(FOCUS_LOG) },
    async play(c) {
      for (const i of [0, 1, 2]) { setKey(k => k + 1); setFx(i); setLog(<><kbd>Tab</kbd> → <b>‘{ACTIONS[i]}’</b></>); await c.sleep(750) }
      await c.sleep(400)
      pick('none'); setFx(0); await c.sleep(700)
      for (const i of [1, 2]) { setKey(k => k + 1); setFx(i); await c.sleep(750) }
      setLog(<>링이 없으면 <b>지금 어디인지</b> 알 수 없어요</>); await c.sleep(1300)
      pick('ring'); await c.sleep(1100); setFx(null)
    },
  })

  return (
    <Card id="bstate-focus" num="03" title="포커스" en="Focus · :focus-visible" demo={demo}
      desc="키보드로 버튼에 들어왔을 때 둘레에 생기는 링이에요. 마우스 커서 대신 ‘지금 여기 있어요’를 알려줘요.">
      <Stage log={log} logId="bstate-focus-log">
        <div className={'box bs-box' + (none ? ' bs-noring' : '')} ref={box}>
          <Seg value={mode} onChange={pick} options={[['ring', '포커스 링'], ['none', 'outline: none']]} />
          <div className="bs-sheet">
            <div className="bs-doc"><b>새 글</b><span>오늘의 원두 이야기…</span></div>
            <div className="bs-row" onMouseLeave={() => setFx(null)}>
              {ACTIONS.map((a, i) => (
                <button key={a} type="button" className={'bs-btn' + (i < 2 ? ' ghost' : '') + (fx === i ? ' is-focus' : '')}
                  onFocus={onFocus(i)} onBlur={() => setFx(null)} onClick={() => setLog(<>‘{a}’을 눌렀어요</>)}>{a}</button>
              ))}
            </div>
          </div>
          <div className="bs-keys" aria-hidden="true"><kbd key={key} className={fx !== null ? 'hit' : ''}>Tab</kbd><span>다음</span><kbd>Shift</kbd>+<kbd>Tab</kbd><span>이전</span></div>
        </div>
      </Stage>
      <Info
        spec={[['링', '2px · 간격 2px'], ['대비', '주변과 3:1 이상'], ['선택자', ':focus-visible']]}
        usage={[
          ['언제', '모든 버튼에 꼭 있어야 해요. 키보드·스위치 기기 사용자에겐 마우스 커서와 같아요'],
          ['주의', 'outline: none으로 지우지 마세요. 마우스 클릭 때 링이 거슬린다면 :focus 대신 :focus-visible을 쓰면 키보드일 때만 보여요'],
        ]}
      />
    </Card>
  )
}
