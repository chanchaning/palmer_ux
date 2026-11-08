import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { DemoPane, PairCard } from '../../../components/Card'
import { Range } from '../../../components/ui'

/* ---------- 07 칩 vs 배지 ---------- */
const FILTERS = ['전체', '카페', '맛집', '전시']

/** 숫자 배지 — tick이 바뀔 때마다 통통 튀어요(bump) */
function Count({ n, tick }: { n: number; tick: number }) {
  const el = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const c = el.current
    if (!c || !tick) return
    c.classList.remove('bump'); void c.offsetWidth
    if (n) c.classList.add('bump')
  }, [tick])
  return <span className={'count' + (n === 0 ? ' hide' : '')} ref={el}>{n > 99 ? '99+' : n}</span>
}

let chipSeq = 0
export function ChipVsBadge() {
  const [pressed, setPressed] = useState([true, false, false, false])
  const [tags, setTags] = useState(() => ['디자인', 'UX'].map(text => ({ id: ++chipSeq, text })))
  const [input, setInput] = useState('')
  const [chipLog, setChipLog] = useState<ReactNode>(<>사용자가 <b>직접 조작</b>하는 요소</>)
  const [bell, setBell] = useState(3)
  const [chat, setChat] = useState(12)
  const [tick, setTick] = useState(0)

  const pick = (i: number) => {
    let next: boolean[]
    if (i === 0) next = FILTERS.map((_, j) => j === 0)
    else {
      next = pressed.slice()
      next[i] = !next[i]
      next[0] = !next.slice(1).some(Boolean)
    }
    setPressed(next)
    setChipLog(<>필터: <b>{FILTERS.filter((_, j) => next[j]).join(', ')}</b></>)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.key !== 'Enter') return
    const v = input.trim()
    if (!v) return
    setTags(t => [...t, { id: ++chipSeq, text: v }])
    setInput('')
    setChipLog(`#${v} 추가됨`)
  }

  return (
    <PairCard id="c-chip" num="07" a="칩" b="배지" desc="눌러서 고르거나 지울 수 있으면 칩, 상태나 숫자를 붙여 보여주기만 하면 배지."
      diff={[
        ['상호작용', '있음 (선택·삭제·입력)', '없음 (읽기 전용)'],
        ['위치', '독립적으로 나열', '다른 요소 옆·모서리에 붙음'],
        ['용도', '필터, 태그, 선택된 값', '알림 개수, 상태, NEW 표시'],
      ]}>
      <DemoPane label="칩" en="Chip" log={chipLog}>
        <div className="stage">
          <div className="muted">필터 칩 · 눌러서 선택</div>
          <div className="chips">
            {FILTERS.map((f, i) => <button key={f} className="chip" aria-pressed={pressed[i]} onClick={() => pick(i)}>{f}</button>)}
          </div>
          <div className="muted">입력 칩 · Enter로 추가, ✕로 삭제</div>
          <div className="chips">
            {tags.map(t => (
              <span className="chip input" key={t.id}>#{t.text}
                <button aria-label={t.text + ' 삭제'} onClick={() => { setTags(ts => ts.filter(x => x.id !== t.id)); setChipLog(<><b>#{t.text}</b> 삭제됨</>) }}>✕</button>
              </span>
            ))}
            <input className="chip-input" placeholder="태그 입력" maxLength={8} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} />
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="배지" en="Badge" log={<>배지 자체는 <b>눌리지 않아요</b> — 상태 표시 전용</>}>
        <div className="stage">
          <div className="row">
            <div className="icon-row" style={{ gap: 16 }}>
              <span className="icon-btn" style={{ cursor: 'default' }}>🔔<Count n={bell} tick={tick} /></span>
              <span className="icon-btn" style={{ cursor: 'default' }}>💬<Count n={chat} tick={tick} /></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn ghost sm" onClick={() => { setBell(b => b + 1); setTick(t => t + 1) }}>알림 +1</button>
              <button className="btn ghost sm" onClick={() => { setBell(0); setChat(0); setTick(t => t + 1) }}>모두 읽음</button>
            </div>
          </div>
          <div>
            <div className="order"><span>무선 이어폰</span><span className="badge ship">배송중</span></div>
            <div className="order"><span>텀블러 <span className="badge new">NEW</span></span><span className="badge done">배송완료</span></div>
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 08 스피너 vs 스켈레톤 ---------- */
const RealContent = () => (
  <div className="loaded">
    <div className="profile"><span className="ph" /><div><div className="t1">Palmer</div><div className="t2">UX 디자이너 · 3분 전</div></div></div>
    <p className="content-p">비슷해 보이는 컴포넌트도 쓰임새가 다르면 이름도 달라요. 오늘은 토스트와 스낵바를 정리했어요.</p>
  </div>
)

/** 1.8초 로딩 상태 — run()으로 다시 시작 */
function useLoading() {
  const [run, setRun] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800)
    return () => clearTimeout(t)
  }, [run])
  return [loading, () => { setLoading(true); setRun(r => r + 1) }] as const
}

export function SpinnerVsSkeleton() {
  const [spin, runSpin] = useLoading()
  const [sk, runSk] = useLoading()
  return (
    <PairCard id="c-spinner" num="08" a="스피너" b="스켈레톤" desc="“기다려주세요”만 말하면 스피너, “이런 모양이 곧 나와요”까지 보여주면 스켈레톤."
      diff={[
        ['보여주는 것', '진행 중이라는 사실만', '곧 나올 콘텐츠의 윤곽'],
        ['체감 속도', '대기 시간이 길게 느껴짐', '더 빠르게 느껴짐'],
        ['용도', '버튼 처리, 짧은 작업, 전송', '피드·카드·목록 첫 로딩'],
      ]}>
      <DemoPane label="스피너" en="Spinner">
        <div className="stage">
          {spin ? <div className="center"><div className="spinner" /><div className="muted">불러오는 중…</div></div> : <RealContent />}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <span className="log" style={{ margin: 0 }}>레이아웃을 <b>미리 알 수 없음</b></span>
          <button className="btn ghost sm" disabled={spin} onClick={runSpin}>다시 로딩</button>
        </div>
      </DemoPane>
      <DemoPane side="b" label="스켈레톤" en="Skeleton">
        <div className="stage">
          {sk ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="profile">
                <span className="sk circle" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="sk" style={{ height: 12, width: '40%' }} /><span className="sk" style={{ height: 10, width: '60%' }} />
                </div>
              </div>
              <span className="sk" style={{ height: 10 }} /><span className="sk" style={{ height: 10 }} /><span className="sk" style={{ height: 10, width: '70%' }} />
            </div>
          ) : <RealContent />}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <span className="log" style={{ margin: 0 }}>자리를 <b>미리 잡아둠</b></span>
          <button className="btn ghost sm" disabled={sk} onClick={runSk}>다시 로딩</button>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 09 스테퍼 vs 슬라이더 ---------- */
const MIN = 1, MAX = 5, PRICE = 12900

export function StepperVsSlider() {
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(50)
  const stepLog = qty >= MAX ? <><b>최대 수량</b>에 도달 → + 비활성</> : qty <= MIN ? <><b>최소 수량</b> → − 비활성</> : <>한 번에 <b>1씩</b> 정확하게</>
  return (
    <PairCard id="c-stepper" num="09" a="스테퍼" b="슬라이더" desc="정확한 숫자를 하나씩 바꾸면 스테퍼, 넓은 범위에서 대략 고르면 슬라이더."
      diff={[
        ['정밀도', '높음 (정확한 값)', '낮음 (대략적인 값)'],
        ['범위', '좁음 (예: 1~10)', '넓음 (예: 0~100)'],
        ['용도', '수량, 인원, 박 수', '가격 범위, 볼륨, 밝기'],
      ]}>
      <DemoPane label="스테퍼" en="Stepper" log={stepLog}>
        <div className="stage">
          <div className="muted" style={{ textAlign: 'center' }}>수량 (1 ~ 5개)</div>
          <div className="stepper">
            <button aria-label="빼기" disabled={qty <= MIN} onClick={() => setQty(q => Math.max(MIN, q - 1))}>−</button>
            <output>{qty}</output>
            <button aria-label="더하기" disabled={qty >= MAX} onClick={() => setQty(q => Math.min(MAX, q + 1))}>+</button>
          </div>
          <div className="big">{(qty * PRICE).toLocaleString()}<small>원</small></div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="슬라이더" en="Slider" log={<>끌어서 <b>대략적인 범위</b>를 빠르게</>}>
        <div className="stage">
          <div className="muted" style={{ textAlign: 'center' }}>최대 가격 (0 ~ 100만원)</div>
          <div className="big">{price === 100 ? '제한 없음' : <>{price}<small>만원 이하</small></>}</div>
          <Range value={price} min={0} max={100} onChange={setPrice} label="최대 가격" />
          <div className="bars-caption"><span>0</span><span>100만원</span></div>
        </div>
      </DemoPane>
    </PairCard>
  )
}
