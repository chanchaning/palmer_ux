import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { bump, fv } from '../shared'

/* ---------- 01 별점 ---------- */
const STAR_WORDS = ['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요']
const STAR_LOG = <>마우스를 올리면 <b>미리보기</b>, 누르면 <b>확정</b></>

export function Star() {
  const [val, setVal] = useState(0)
  const [pv, setPv] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(STAR_LOG)
  const box = useRef<HTMLDivElement>(null)
  const grp = useRef<HTMLDivElement>(null)
  const star = (i: number) => (grp.current?.children[i] as HTMLElement | undefined) ?? null

  const preview = (v: number) => { setPv(v); setLog(<><b>{v}점 미리보기</b> — 아직 저장 안 됨</>) }
  const set = (v: number, how?: string) => { setVal(v); setPv(null); setLog(<><b>{v}점 저장</b>{how ? ' · ' + how : ''}</>) }
  const onKey = (e: KeyboardEvent) => {
    const d = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 } as Record<string, number>)[e.key]
    let v: number | null = null
    if (d) v = Math.max(1, Math.min(5, (val || 0) + d))
    if (e.key === 'Home') v = 1
    if (e.key === 'End') v = 5
    if (v === null) return
    e.preventDefault(); set(v, '키보드 ' + e.key.replace('Arrow', '')); star(v - 1)?.focus()
  }

  const demo = useDemo({
    reset() { setVal(0); setPv(null); setLog(STAR_LOG) },
    async play(c) {
      for (const i of [1, 2, 3]) { c.tap(box.current, star(i)); preview(i + 1); await c.sleep(420) }
      await c.press(box.current, star(3)); await c.sleep(900)
      set(5, '키보드 → 로 한 칸 올림'); await c.sleep(900)
    },
  })

  const shown = pv ?? val
  return (
    <Card id="rating-star" num="01" title="별점" en="Star Rating" demo={demo}
      desc="별 다섯 개 중 몇 개를 채우느냐로 만족도를 매겨요. 올리면 미리보기, 눌러야 확정돼요.">
      <Stage log={log} logId="rating-star-log">
        <div className="box rt-box" ref={box}>
          <div className="rt-prod"><span className="rt-thumb g1" /><div><b>오가닉 코튼 셔츠</b><span>구매 확정 · 11월 2일</span></div></div>
          <p className="rt-q">상품은 만족스러우셨나요?</p>
          <div className={'rt-stars' + (pv !== null ? ' pv' : '')} ref={grp} role="radiogroup" aria-label="별점 선택" onKeyDown={onKey}
            onPointerLeave={() => { setPv(null); if (val) setLog(<>포인터가 나가면 <b>{val}점</b>으로 복귀</>) }}>
            {[1, 2, 3, 4, 5].map((v, i) => (
              <button key={v} className="rt-s" role="radio" aria-checked={v === val} aria-label={v + '점'}
                tabIndex={(val ? v === val : i === 0) ? 0 : -1} style={fv(i < shown ? 1 : 0)}
                onPointerEnter={e => { if (e.pointerType === 'mouse') preview(v) }}
                onClick={() => set(v, '클릭')} />
            ))}
          </div>
          <div className="rt-label">
            {pv !== null ? <>{STAR_WORDS[pv]}<small>미리보기</small></> : val ? <>{STAR_WORDS[val]}<small>{val} / 5</small></> : '별을 눌러 평가해 주세요'}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['척도', '1–5 정수'], ['키보드', '← → 화살표'], ['역할', 'radiogroup']]}
        usage={[
          ['언제', '상품·장소·콘텐츠처럼 누구나 바로 이해하는 만족도를 받을 때'],
          ['주의', '미리보기와 확정 색을 다르게 — 손을 떼면 원래 값으로 돌아와야 해요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 반별점 ---------- */
const HALF_WORDS: Record<number, string> = {
  0.5: '최악이에요', 1: '많이 별로예요', 1.5: '별로예요', 2: '아쉬워요', 2.5: '그럭저럭이에요',
  3: '보통이에요', 3.5: '괜찮아요', 4: '좋아요', 4.5: '아주 좋아요', 5: '인생작이에요',
}
const HALF_LOG = <>별의 <b>왼쪽 절반</b>과 <b>오른쪽 절반</b>을 비교해 보세요</>

export function HalfStar() {
  const [val, setVal] = useState(0)
  const [pv, setPv] = useState<number | null>(null)
  const [log, setLog] = useState<ReactNode>(HALF_LOG)
  const box = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const star = (i: number) => (wrap.current?.children[i] as HTMLElement | undefined) ?? null

  const fromX = (x: number) => {
    const stars = [...(wrap.current?.children ?? [])]
    for (let i = 0; i < stars.length; i++) {
      const r = stars[i].getBoundingClientRect()
      if (x < r.left) return Math.max(0.5, i)
      if (x < r.left + r.width / 2) return i + 0.5
      if (x <= r.right) return i + 1
    }
    return 5
  }
  const preview = (v: number) => {
    setPv(v)
    setLog(<>{v % 1 ? <>별 <b>왼쪽 절반</b></> : <>별 <b>오른쪽 절반</b></>} → <b>{v.toFixed(1)}점</b> 미리보기</>)
  }
  const commit = (v: number, how?: string) => { setVal(v); setPv(null); setLog(<><b>{v.toFixed(1)}점</b> 확정{how ? ' · ' + how : ''}</>) }
  const restore = () => setPv(null)

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = true
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    preview(fromX(e.clientX))
  }
  const onUp = (e: PointerEvent) => {
    if (!drag.current) return
    drag.current = false
    commit(fromX(e.clientX), e.pointerType === 'mouse' ? '클릭' : '손을 뗀 위치')
  }
  const onKey = (e: KeyboardEvent) => {
    const d = ({ ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 } as Record<string, number>)[e.key]
    if (!d) return
    e.preventDefault()
    commit(Math.max(0.5, Math.min(5, (val || 0) + d)), '키보드 0.5씩')
  }

  const demo = useDemo({
    reset() { setVal(0); setPv(null); drag.current = false; setLog(HALF_LOG) },
    async play(c) {
      c.tap(box.current, star(2)); preview(2.5); await c.sleep(700)
      c.tap(box.current, star(2)); preview(3); await c.sleep(700)
      c.tap(box.current, star(3)); commit(3.5, '4번째 별의 왼쪽 절반'); await c.sleep(1100)
      c.tap(box.current, star(4)); commit(4.5, '5번째 별의 왼쪽 절반'); await c.sleep(700)
    },
  })

  const shown = pv ?? val
  return (
    <Card id="rating-half" num="02" title="반별점" en="Half-star Rating" demo={demo}
      desc="별의 왼쪽 절반을 누르면 0.5점, 오른쪽을 누르면 1점. 포인터 위치로 정밀하게 매겨요.">
      <Stage log={log} logId="rating-half-log">
        <div className="box rt-box" ref={box}>
          <div className="rt-big">{shown.toFixed(1)}<small> / 5</small></div>
          <div className={'rt-stars lg' + (pv !== null ? ' pv' : '')} ref={wrap} role="slider" tabIndex={0} aria-label="반별점"
            aria-valuemin={0.5} aria-valuemax={5} aria-valuenow={val} aria-valuetext={val ? val + '점, ' + HALF_WORDS[val] : '평가 안 함'}
            onPointerMove={e => { if (e.pointerType === 'mouse' || drag.current) preview(fromX(e.clientX)) }}
            onPointerDown={onDown} onPointerUp={onUp}
            onPointerCancel={() => { drag.current = false; restore() }}
            onPointerLeave={() => { if (!drag.current) restore() }}
            onKeyDown={onKey}>
            {[0, 1, 2, 3, 4].map(i => <span key={i} className="rt-s" style={fv(Math.max(0, Math.min(1, shown - i)))} />)}
          </div>
          <div className="rt-label">{pv !== null ? HALF_WORDS[pv] : val ? HALF_WORDS[val] : '별 위에서 움직여 보세요'}</div>
        </div>
      </Stage>
      <Info
        spec={[['척도', '0.5 단위 · 10단계'], ['판정', '별 너비의 50%'], ['터치', '끌어서 조정']]}
        usage={[
          ['언제', '영화·책·와인처럼 ‘4점은 아쉽고 5점은 과한’ 세밀한 평가가 필요할 때'],
          ['주의', '모바일에선 별이 작아 반쪽 터치가 어려워요 — 별을 크게, 드래그를 허용'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 이모지 평가 ---------- */
const FACES: [string, string][] = [['😡', '매우 불만'], ['😕', '불만'], ['😐', '보통'], ['🙂', '만족'], ['😍', '매우 만족']]
const FOLLOW = ['', '불편을 드려 죄송해요. 어떤 점이 문제였나요?', '아쉬운 점을 알려주시면 고칠게요.', '더 나아지려면 무엇이 필요할까요?', '감사해요! 좋았던 점을 알려주세요.', '최고의 칭찬이에요 💛 한 줄 후기 남길래요?']
const EMOJI_LOG = <>표정을 눌러 <b>감정으로 평가</b>해 보세요</>

export function Emoji() {
  const [v, setV] = useState(0)
  const [log, setLog] = useState<ReactNode>(EMOJI_LOG)
  const box = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const face = (i: number) => (wrap.current?.children[i] as HTMLElement | undefined) ?? null

  const set = (n: number) => {
    setV(n)
    if (n) setLog(<><b>{FACES[n - 1][1]}</b> 선택 · 다음 질문이 감정에 맞게 바뀜</>)
  }
  const demo = useDemo({
    reset() { setV(0); setLog(EMOJI_LOG) },
    async play(c) {
      await c.press(box.current, face(3)); await c.sleep(1000)
      await c.press(box.current, face(1)); await c.sleep(1000)
      await c.press(box.current, face(4)); await c.sleep(600)
    },
  })

  return (
    <Card id="rating-emoji" num="03" title="이모지 평가" en="Emoji Rating" demo={demo}
      desc="숫자 대신 표정으로 기분을 고르게 해요. 고른 얼굴이 커지고 이름표가 붙어요.">
      <Stage log={log} logId="rating-emoji-log">
        <div className="box rt-box" ref={box}>
          <p className="rt-q">오늘 상담은 어떠셨나요?</p>
          <div className={'rt-faces' + (v ? ' has' : '')} ref={wrap} role="radiogroup" aria-label="상담 만족도">
            {FACES.map(([e, nm], i) => (
              <button key={nm} className="rt-face" role="radio" aria-checked={i + 1 === v} onClick={() => set(i + 1)}>{e}<span>{nm}</span></button>
            ))}
          </div>
          <div className="rt-label" aria-live="polite">{v ? <>{FACES[v - 1][1]}<small>{v} / 5</small></> : ' '}</div>
          <div className="rt-follow" style={{ textAlign: 'center' }}>{v ? FOLLOW[v] : '얼굴 하나를 골라 주세요'}</div>
        </div>
      </Stage>
      <Info
        spec={[['척도', '5단계 감정'], ['선택', 'scale 1.3 + 라벨'], ['나머지', '흑백 처리']]}
        usage={[
          ['언제', '상담·배송·앱 사용 직후처럼 가볍게, 빠르게 기분을 묻고 싶을 때'],
          ['주의', '이모지는 기기마다 모양이 달라요 — 글자 라벨을 꼭 함께 붙이세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 좋아요/싫어요 ---------- */
type Thumb = 'up' | 'down'
const THUMB_NAME: Record<Thumb, string> = { up: '👍 도움돼요', down: '👎 도움 안 돼요' }
const THUMB_LOG = <>하나를 누르면 <b>다른 하나는 자동 해제</b></>

export function Thumbs() {
  const [state, setState] = useState<Thumb | null>(null)
  const [log, setLog] = useState<ReactNode>(THUMB_LOG)
  const box = useRef<HTMLDivElement>(null)
  const up = useRef<HTMLButtonElement>(null)
  const down = useRef<HTMLButtonElement>(null)

  const click = (k: Thumb) => {
    const prev = state
    const next = state === k ? null : k
    setState(next)
    if (next) bump((next === 'up' ? up : down).current)
    if (!next) setLog(<>같은 버튼 다시 누름 → <b>{THUMB_NAME[k]} 취소</b> (−1)</>)
    else if (prev) setLog(<><b>{THUMB_NAME[prev]} −1</b> → <b>{THUMB_NAME[next]} +1</b> 로 전환</>)
    else setLog(<><b>{THUMB_NAME[next]} +1</b> · 한 번 더 누르면 취소</>)
  }
  const demo = useDemo({
    reset() { setState(null); setLog(THUMB_LOG) },
    async play(c) {
      await c.press(box.current, up.current); await c.sleep(1100)
      await c.press(box.current, down.current); await c.sleep(1300)
      await c.press(box.current, down.current); await c.sleep(900)
    },
  })

  return (
    <Card id="rating-thumbs" num="04" title="좋아요/싫어요" en="Thumbs Up / Down" demo={demo}
      desc="둘 중 하나만 고를 수 있는 이진 평가예요. 같은 버튼을 다시 누르면 취소돼요.">
      <Stage log={log} logId="rating-thumbs-log">
        <div className="box rt-box" ref={box}>
          <div className="rt-review">
            <div className="who"><i>김</i>김와플 · ★ 5</div>
            <p>사이즈가 정사이즈예요. 두 번 세탁했는데 줄지 않았고 보풀도 없어요.</p>
          </div>
          <p className="rt-q">이 리뷰가 도움이 되었나요?</p>
          <div className="rt-thumbs">
            <button className="rt-tb up" ref={up} aria-pressed={state === 'up'} aria-label="도움돼요" onClick={() => click('up')}>
              <i>👍</i><b>{128 + (state === 'up' ? 1 : 0)}</b>
            </button>
            <button className="rt-tb down" ref={down} aria-pressed={state === 'down'} aria-label="도움 안 돼요" onClick={() => click('down')}>
              <i>👎</i><b>{12 + (state === 'down' ? 1 : 0)}</b>
            </button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['선택', '0 또는 1개'], ['재클릭', '취소'], ['속성', 'aria-pressed']]}
        usage={[
          ['언제', '리뷰 도움 여부, 도움말 문서 평가, 추천 콘텐츠 피드백처럼 판단이 단순할 때'],
          ['주의', '전환할 때 양쪽 숫자가 함께 바뀌어야 해요 — 한쪽만 오르면 중복 집계예요'],
        ]}
      />
    </Card>
  )
}
