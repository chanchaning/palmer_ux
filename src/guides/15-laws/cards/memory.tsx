import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Card, Info, Stage } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { Cat, ResRow, fmt, shake } from '../shared'

/* ---------- 01 제이콥의 법칙 ---------- */
export function Jakob() {
  const [layout, setLayout] = useState<0 | 1>(0)
  const [running, setRunning] = useState(false)
  const [best, setBest] = useState<[number | null, number | null]>([null, null])
  const [log, setLog] = useState<ReactNode>(<><b>측정 시작</b>을 누르고 <b>장바구니</b>를 찾아 눌러보세요</>)
  const t0 = useRef(0)
  const site = useRef<HTMLDivElement>(null)

  const start = () => { t0.current = performance.now(); setRunning(true); setLog(<>⏱ 측정 중… <b>장바구니</b>는 어디 있을까요?</>) }
  const onSite = (e: MouseEvent) => {
    const hit = (e.target as HTMLElement).closest('[data-cart]')
    if (!running) { if (hit) setLog(<>먼저 <b>측정 시작</b>을 눌러주세요</>); return }
    if (!hit) { shake(site.current); return }
    const ms = performance.now() - t0.current
    setRunning(false)
    setBest(b => { const n = [...b] as typeof b; n[layout] = n[layout] ? Math.min(n[layout]!, ms) : ms; return n })
    setLog(layout === 0
      ? <>찾는 데 <b>{fmt(ms)}</b> — 예상한 자리에 있어서 바로 찾았어요</>
      : <>찾는 데 <b>{fmt(ms)}</b> — 익숙하지 않은 자리라 헤맸어요</>)
  }
  const max = Math.max(best[0] ?? 0, best[1] ?? 0, 1)
  const body = <div className="lw-body">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>

  return (
    <Card id="laws-jakob" num="01" tag={<Cat>기대와 인지</Cat>} title="제이콥의 법칙" en="Jakob's Law"
      desc="사람들은 새 서비스도 이미 익숙한 다른 서비스처럼 동작하길 기대해요.">
      <Stage log={log}>
        <div className="box left">
          <div className="lw-toolbar">
            <Seg value={layout} onChange={v => { setLayout(v); setRunning(false) }} options={[[0, '익숙한 배치'], [1, '낯선 배치']]} />
            <button className="btn sm orange" onClick={start}>▶ 측정 시작</button>
          </div>
          <div className={'lw-site' + (running ? ' running' : '')} ref={site} onClick={onSite}>
            {layout === 0 ? (
              <>
                <div className="lw-hd">
                  <span className="lw-logo">SHOP</span><div className="lw-search">🔍 상품 검색</div>
                  <button className="lw-ico" aria-label="내 정보">👤</button>
                  <button className="lw-ico" data-cart aria-label="장바구니">🛒<span className="dotc">2</span></button>
                </div>
                {body}
              </>
            ) : (
              <>
                <div className="lw-hd">
                  <button className="lw-ico" aria-label="도움말">?</button><span style={{ flex: 1 }} />
                  <button className="lw-ico" aria-label="알림">✦</button><span className="lw-logo">SHOP</span>
                </div>
                {body}
                <div className="lw-ft">
                  <button>회사소개</button><button>이용약관</button><button>공지</button>
                  <button data-cart>바구니(2)</button><button>고객센터</button><button>채용</button>
                </div>
              </>
            )}
          </div>
          <div className="lw-res">
            <ResRow label="익숙한 배치" ratio={(best[0] ?? 0) / max} value={best[0] ? fmt(best[0]) : '–'} />
            <ResRow label="낯선 배치" ratio={(best[1] ?? 0) / max} value={best[1] ? fmt(best[1]) : '–'} orange />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['핵심', '멘탈 모델'], ['효과', '학습 비용 ↓']]}
        usage={[
          ['개념', '사용자는 대부분의 시간을 다른 사이트에서 보내요. 그곳에서 익힌 방식을 그대로 가져와요.'],
          ['실무', '로고는 왼쪽 위, 검색은 돋보기와 함께 상단, 장바구니는 오른쪽 위에 둬요.'],
          ['주의', '새로움이 필요하면 익숙한 틀은 지키고 한 부분씩만 바꿔요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 밀러의 법칙 ---------- */
export function Miller() {
  const [chunk, setChunk] = useState<0 | 1>(1)
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'done'>('idle')
  const [input, setInput] = useState('')
  const [tally, setTally] = useState({ 1: [0, 0], 0: [0, 0] } as Record<0 | 1, [number, number]>)
  const [log, setLog] = useState<ReactNode>(<>12자리 카드 번호를 <b>3초</b> 보고 외워보세요</>)
  const bar = useRef<HTMLSpanElement>(null)
  const inp = useRef<HTMLInputElement>(null)
  const timers = useTimers()

  const group = (s: string) => (chunk ? s.replace(/(\d{4})(?=\d)/g, '$1 ') : s)
  const masked = chunk ? '●●●● ●●●● ●●●●' : '●●●●●●●●●●●●'

  const show = () => {
    timers.clear()
    const a = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('')
    setAnswer(a); setInput(''); setPhase('show')
    bar.current?.getAnimations().forEach(x => x.cancel())
    bar.current?.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 3000, easing: 'linear', fill: 'forwards' })
    setLog(chunk ? <><b>4자리씩 3덩어리</b>로 외워보세요</> : <><b>12개 숫자</b>를 한 줄로 외워보세요</>)
    timers.set(() => { setPhase('input'); setLog(<>기억나는 대로 입력하고 <b>확인</b></>); setTimeout(() => inp.current?.focus()) }, 3000)
  }
  const check = () => {
    if (phase !== 'input') return
    const got = input.replace(/\D/g, '')
    let wrong = 0
    for (let i = 0; i < 12; i++) if (got[i] !== answer[i]) wrong++
    setTally(t => ({ ...t, [chunk]: [t[chunk][0] + (wrong ? 0 : 1), t[chunk][1] + 1] }))
    setPhase('done')
    setLog(wrong
      ? <>✗ <b>{wrong}자리</b> 틀렸어요 — {chunk ? '덩어리로도 쉽지 않죠?' : '한 줄은 7±2를 훌쩍 넘어요'}</>
      : <>✓ <b>전부 정답</b>! {chunk ? '덩어리 3개만 기억하면 됐어요' : '대단한 기억력이에요'}</>)
  }
  const revealed = phase === 'show' || phase === 'done'

  return (
    <Card id="laws-miller" num="02" tag={<Cat>기대와 인지</Cat>} title="밀러의 법칙" en="Miller's Law"
      desc="사람은 한 번에 7±2개 정도만 기억해요. 덩어리로 묶으면 더 많이 기억해요.">
      <Stage log={log}>
        <div className="box left">
          <div className="lw-slots" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <i key={n} className={n === 7 ? 'c' : n >= 5 ? 'r' : ''}>{n}</i>)}
          </div>
          <div className="muted" style={{ textAlign: 'center' }}>단기 기억 용량 ≈ 5~9개</div>
          <div className="lw-toolbar">
            <Seg value={chunk} onChange={setChunk} options={[[1, '덩어리로 (청킹)'], [0, '한 줄로']]} />
            <button className="btn sm orange" onClick={show} disabled={phase === 'show'}>3초 동안 외우기</button>
          </div>
          <div className={'lw-num' + (revealed ? '' : ' mask')}>{revealed ? group(answer) : masked}</div>
          <div className="lw-count"><span ref={bar} style={{ transform: 'scaleX(0)' }} /></div>
          <div className="lw-inrow">
            <input ref={inp} className="lw-in" inputMode="numeric" placeholder="기억나는 대로 입력" value={input}
              disabled={phase !== 'input'} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) check() }} />
            <button className="btn sm" onClick={check} disabled={phase !== 'input'}>확인</button>
          </div>
          <div className="lw-res">
            <ResRow label="덩어리로" ratio={tally[1][1] ? tally[1][0] / tally[1][1] : 0} value={`${tally[1][0]} / ${tally[1][1]}`} />
            <ResRow label="한 줄로" ratio={tally[0][1] ? tally[0][0] / tally[0][1] : 0} value={`${tally[0][0]} / ${tally[0][1]}`} orange />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['용량', '7±2'], ['기법', '청킹(Chunking)']]}
        usage={[
          ['개념', '단기 기억은 용량이 작아요. 정보를 의미 있는 덩어리로 묶으면 부담이 줄어요.'],
          ['실무', '전화·카드 번호는 3~4자리씩 끊고, 긴 메뉴는 카테고리로 묶어요.'],
          ['주의', '“메뉴는 7개까지”라는 뜻이 아니에요. 외워야 하는 정보에 적용해요.'],
        ]}
      />
    </Card>
  )
}
