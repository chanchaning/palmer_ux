import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { Card, Info, Stage, useDemo } from '../../components/Card'
import { EASE, useMotion } from '../../lib/motion'

export type StyleId = 'flat' | 'skeu' | 'mat' | 'neu' | 'glass' | 'clay' | 'brut' | 'bento' | 'dark' | 'liquid' | 'y2k' | 'min' | '3d'

const TOTAL = 204 // 3:24
const fmt = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')

/** 재생 버튼을 눌렀을 때 스타일별 설명 (dark는 테마에 따라 따로) */
const PRESS: Record<StyleId, ReactNode> = {
  flat: <>눌림은 <b>색만 한 톤 진해져요</b> — 그림자·입체감 없음</>,
  skeu: <><b>버튼이 실제로 눌려 들어가요</b> — 안쪽 그림자 + 1px 하강</>,
  mat: <><b>잉크 리플</b>이 퍼지고 그림자(고도)가 높아져요</>,
  neu: <>볼록하던 버튼이 <b>안으로 파였어요</b> — 그런데 잘 보이나요?</>,
  glass: <><b>유리가 더 밝아지고</b> 빛이 번져요 — 뒤 배경이 그대로 비쳐요</>,
  clay: <><b>말랑하게 찌그러졌다</b> 스프링처럼 튕겨 돌아와요</>,
  brut: <>그림자 4px만큼 <b>버튼이 밀려 내려가고</b> 그림자는 0</>,
  bento: <><b>타일 하나만</b> 반응해요 — 타일마다 독립된 정보 단위</>,
  dark: '',
  liquid: <><b>물방울처럼 부풀고</b> 가장자리 빛이 강해져요</>,
  y2k: <><b>젤 버튼이 핑크로</b> 바뀌며 픽셀 반짝이가 터져요</>,
  min: <>장식 없이 <b>채움 반전</b> 하나로 눌림을 표현해요</>,
  '3d': <>아랫면(두께) 4px이 사라지며 <b>버튼이 내려앉아요</b></>,
}

/** 반복 스위치를 눌렀을 때 덧붙이는 설명 */
const SW: Partial<Record<StyleId, ReactNode>> = {
  neu: <>켜짐 상태가 <b>색 점 하나</b>뿐이라 구분이 약해요</>,
  glass: <>켜진 색도 <b>반투명</b> — 배경에 따라 달라 보여요</>,
  liquid: <>스위치를 누르고 있으면 <b>손잡이가 렌즈처럼 커져요</b></>,
  brut: <>켜짐 = <b>원색 채움</b>, 손잡이는 각진 사각형</>,
  min: <>켜짐 = <b>흑백 반전</b></>,
  skeu: <>실제 스위치처럼 <b>홈 안에서 금속 손잡이</b>가 움직여요</>,
}

const Y2K_PX: [number, number, string][] = [[8, 12, ''], [86, 10, 'pk'], [14, 82, 'pk'], [90, 76, ''], [50, 6, ''], [70, 90, 'pk']]

/** 화면에 보이는 동안만 true (배경 애니메이션 실행용) */
function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(es => es.forEach(e => setOn(e.isIntersecting)), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return on
}

export interface StyleCardProps {
  s: StyleId
  num: string
  title: string
  en: string
  desc: ReactNode
  log: ReactNode
  spec: [ReactNode, ReactNode][]
  usage: [ReactNode, ReactNode][]
}

/** 같은 음악 플레이어 위젯을 스타일만 바꿔 그리는 카드 */
export function StyleCard({ s, num, title, en, desc, log: initLog, spec, usage }: StyleCardProps) {
  const m = useMotion()
  const box = useRef<HTMLDivElement>(null)
  const playBtn = useRef<HTMLButtonElement>(null)
  const swBtn = useRef<HTMLButtonElement>(null)
  const themeBtn = useRef<HTMLButtonElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const live = useOnScreen(box)

  const [on, setOn] = useState(false)
  const [ended, setEnded] = useState(false)
  const [p, setPState] = useState(25)
  const [rep, setRep] = useState(false)
  const [dark, setDark] = useState(false)
  const [log, setLog] = useState<ReactNode>(initLog)
  const pRef = useRef(25)
  const drag = useRef(false)

  const setP = (v: number) => {
    const c = Math.max(0, Math.min(100, v))
    pRef.current = c
    setPState(c)
  }

  const darkMsg = (d: boolean) => d
    ? <>다크: 버튼이 <b>#2C2C2C → #3D3D3D</b>로 밝아져요 — 밝을수록 높은 층</>
    : <>라이트: 눌린 버튼은 <b>그림자가 커져서</b> 떠올라요</>

  const setPlay = (v: boolean, end = false) => {
    setOn(v)
    setEnded(!v && end)
    if (v) {
      if (pRef.current >= 100) setP(0)
      setLog(s === 'dark' ? darkMsg(dark) : PRESS[s])
    } else {
      setLog(end ? <>끝까지 재생했어요 · <b>다시 재생</b>을 눌러 보세요</> : <><b>일시정지</b> · 버튼이 원래 상태로 돌아왔어요</>)
    }
  }

  // 재생 중 진행 바 이동 (끝에 닿으면 자동 정지)
  useEffect(() => {
    if (!on) return
    let raf = 0, last = 0
    const tick = (now: number) => {
      const dt = (now - (last || now)) / 1000
      last = now
      const np = Math.min(100, pRef.current + dt * 6 / (m.isSlow() ? 4 : 1))
      pRef.current = np
      setPState(np)
      if (np >= 100) {
        setOn(false); setEnded(true)
        setLog(<>끝까지 재생했어요 · <b>다시 재생</b>을 눌러 보세요</>)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, m])

  const onPlay = (e: MouseEvent<HTMLButtonElement>) => {
    const play = e.currentTarget
    const next = !on
    setPlay(next)
    if (s === 'mat') {
      const r = play.getBoundingClientRect()
      const x = e.clientX ? e.clientX - r.left : r.width / 2, y = e.clientY ? e.clientY - r.top : r.height / 2
      const size = Math.max(r.width, r.height) * 2.2, rp = document.createElement('span')
      rp.className = 'st-ripple'
      Object.assign(rp.style, { width: size + 'px', height: size + 'px', left: x - size / 2 + 'px', top: y - size / 2 + 'px' })
      play.appendChild(rp)
      m.A(rp, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], 600, EASE.out).onfinish = () => rp.remove()
    }
    if (s === 'clay') {
      const a = m.A(play, [{ transform: 'scale(1)' }, { transform: 'scale(1.08,.84)' }, { transform: 'scale(.96,1.06)' }, { transform: 'scale(1)' }], 520, EASE.out)
      a.onfinish = () => a.cancel()
    }
    if (s === 'liquid') {
      const a = m.A(play, [{ transform: 'scale(1)' }, { transform: 'scale(1.1,1.16)' }, { transform: 'scale(.98,.96)' }, { transform: 'scale(1)' }], 560, EASE.out)
      a.onfinish = () => a.cancel()
    }
    if (s === 'y2k' && next && box.current) {
      const b = box.current, pr = m.rel(b, play)
      for (let i = 0; i < 8; i++) {
        const sp = document.createElement('span')
        sp.className = 'st-px st-burst' + (i % 2 ? ' pk' : '')
        sp.style.left = pr.left + pr.width / 2 + 'px'
        sp.style.top = pr.top + pr.height / 2 + 'px'
        b.appendChild(sp)
        const ang = (i / 8) * Math.PI * 2, dist = 40 + Math.random() * 30
        m.A(sp, [{ transform: 'translate(0,0) scale(.4)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist * 1.6}px,${Math.sin(ang) * dist}px) scale(1.2)`, opacity: 0 }], 700, EASE.out).onfinish = () => sp.remove()
      }
    }
  }

  const onSwitch = () => {
    const v = !rep
    setRep(v)
    setLog(<>반복 재생 <b>{v ? '켜짐' : '꺼짐'}</b>{SW[s] && <> · {SW[s]}</>}</>)
  }

  const setTheme = (d: boolean) => {
    setDark(d)
    setLog(d ? <>다크: 그림자 대신 <b>배경 → 카드 → 버튼 순으로 밝아져요</b></> : <>라이트: 층의 높이를 <b>그림자 크기</b>로 구분해요</>)
  }

  // 진행 바 (포인터 + 키보드)
  const moved = () => setLog(<><b>{fmt((pRef.current / 100) * TOTAL)}</b> 지점으로 이동했어요</>)
  const fromX = (x: number) => {
    const r = track.current!.getBoundingClientRect()
    setP(((x - r.left) / r.width) * 100)
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromX(e.clientX) }
  const onMove = (e: PointerEvent<HTMLDivElement>) => { if (drag.current) fromX(e.clientX) }
  const onUp = () => { if (!drag.current) return; drag.current = false; moved() }

  const demo = useDemo({
    reset() {
      setPlay(false); setP(25); setRep(false)
      if (s === 'dark') setTheme(false)
    },
    async play(c) {
      const b = box.current
      if (s === 'dark') {
        await c.press(b, playBtn.current); await c.sleep(1300)
        await c.press(b, themeBtn.current); await c.sleep(1600)
        await c.press(b, playBtn.current); await c.sleep(700); await c.press(b, playBtn.current); await c.sleep(1300)
        return
      }
      await c.press(b, playBtn.current); await c.sleep(1500)
      await c.press(b, swBtn.current); await c.sleep(1100)
      await c.press(b, playBtn.current); await c.sleep(400)
    },
  })

  const blobs = (s === 'glass' || s === 'liquid') && <div className="st-blobs"><i /><i /><i /><i /></div>
  const ev = dark ? ['#121212', '#1E1E1E', '#2C2C2C'] : ['#EEF0F3', '그림자 S', '그림자 L']

  return (
    <Card id={'style-' + s} num={num} title={title} en={en} desc={desc} demo={demo}>
      <Stage log={log} logId={'style-' + s + '-log'}>
        <div ref={box} data-s={s}
          className={'box st-box s-' + s + (s === 'dark' && dark ? ' is-dark' : '') + (live ? ' st-live' : '')}>
          {s === 'dark' && <>
            <span className="st-note">{dark ? 'DARK' : 'LIGHT'}</span>
            <button ref={themeBtn} className="st-theme" aria-pressed={dark} onClick={() => setTheme(!dark)}>{dark ? '☀ 라이트로' : '☾ 다크로'}</button>
          </>}
          {blobs}
          {s === 'liquid' && <div className="st-word">LIQUID</div>}
          {s === 'y2k' && Y2K_PX.map(([x, y, c], i) => (
            <span key={i} className={'st-px ' + c} style={{ left: x + '%', top: y + '%', animationDelay: i * 0.27 + 's' }} />
          ))}
          <div className={'mp' + (on ? ' on' : '')}>
            <div className="mp-art"><i>♪</i></div>
            <div className="mp-meta"><b>새벽 산책</b><small>Palmer · Lo-fi</small></div>
            <div className="mp-rep">
              <span>반복 재생</span>
              <button ref={swBtn} className="mp-sw" role="switch" aria-checked={rep} aria-label="반복 재생" onClick={onSwitch} />
            </div>
            <div className="mp-bar">
              <div ref={track} className="mp-track" role="slider" tabIndex={0} aria-label="재생 위치"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)}
                style={{ '--p': p + '%' } as CSSProperties}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault()
                    setP(pRef.current + (e.key === 'ArrowRight' ? 5 : -5))
                    moved()
                  }
                }}>
                <span className="mp-rail" /><span className="mp-fill" /><span className="mp-knob" />
              </div>
              <div className="mp-time"><span className="mp-cur">{fmt((p / 100) * TOTAL)}</span><span>3:24</span></div>
            </div>
            <button ref={playBtn} className="mp-play" aria-pressed={on} onClick={onPlay}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path className="ic-play" d="M7 4.5v15l13-7.5z" />
                <g className="ic-pause"><rect x="5.5" y="4.5" width="4.5" height="15" rx="1" /><rect x="14" y="4.5" width="4.5" height="15" rx="1" /></g>
              </svg>
              <span className="mp-lbl">{on ? '일시정지' : ended ? '다시 재생' : '재생'}</span>
            </button>
          </div>
          {s === 'dark' && (
            <div className="st-elev">
              <div><b>배경</b><span>{ev[0]}</span></div>
              <div><b>카드</b><span>{ev[1]}</span></div>
              <div><b>버튼</b><span>{ev[2]}</span></div>
            </div>
          )}
        </div>
      </Stage>
      <Info spec={spec} usage={usage} />
    </Card>
  )
}
