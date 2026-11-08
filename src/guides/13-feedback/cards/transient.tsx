import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { lv } from '../shared'

/* ---------- 01 토스트 ---------- */
export function Toast() {
  const { D } = useMotion()
  const timers = useTimers()
  const dev = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null), toast = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined), onRef = useRef(false)
  const [on, setOnState] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>저장을 누르면 <b>잠깐 떴다가 사라져요</b></>)
  const setOn = (v: boolean) => { onRef.current = v; setOnState(v) }

  const save = () => {
    const again = onRef.current
    setOn(true)
    if (again) toast.current?.animate([{ transform: 'translate(-50%, 0) scale(1.06)' }, { transform: 'translate(-50%, 0) scale(1)' }], { duration: D(200) })
    setLog(again ? <>이미 떠 있으면 <b>쌓지 않고 교체</b> · 2초 다시 시작</> : <><b>표시 중</b> — 화면은 계속 조작할 수 있어요</>)
    timers.clear(timer.current)
    timer.current = timers.set(() => { setOn(false); setLog(<>2초 뒤 <b>저절로 사라짐</b> · 닫기 버튼 없음</>) }, D(2000))
  }

  const demo = useDemo({
    reset() { timers.clear(timer.current); setOn(false); setLog(<>저장을 누르면 <b>잠깐 떴다가 사라져요</b></>) },
    async play(c) { await c.press(dev.current, btn.current); await c.sleep(2700) },
  })

  return (
    <Card id="feedback-toast" num="01" title="토스트" en="Toast" desc="‘됐어요’를 잠깐 알려주고 스스로 사라져요. 누를 것도, 닫을 것도 없어요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">프로필 편집</div>
            <div className="pad">
              <div className="fb-avatar" />
              <div className="fb-lab">이름</div><div className="fb-field-f">Palmer</div>
              <div className="fb-lab">소개</div><div className="fb-field-f">UX를 기록하는 사람</div>
            </div>
            <div className="fb-grow" />
            <div className="pad"><button className="btn" ref={btn} onClick={save}>저장하기</button></div>
          </div>
          <div className={'toast' + (on ? ' on' : '')} ref={toast} role="status" aria-live="polite">✓ 저장됐어요</div>
        </Device>
      </Stage>
      <Info
        spec={[lv(2, '낮음'), ['지속', '2초 자동 닫힘'], ['행동', '없음']]}
        usage={[['언제', '저장·복사·전송 완료처럼 성공을 가볍게 확인시켜 줄 때'], ['주의', '실패나 되돌리기가 필요한 일엔 쓰지 마세요 — 놓치면 다시 볼 방법이 없어요']]}
      />
    </Card>
  )
}

/* ---------- 02 스낵바 ---------- */
type Photo = readonly [string, string, string]
const PHOTOS: Photo[] = [['한강 노을', 'g1', '오늘 18:42'], ['새벽 호수', 'g2', '어제'], ['여름 숲', 'g3', '11월 3일'], ['벚꽃길', 'g4', '4월 6일']]

export function Snackbar() {
  const { D } = useMotion()
  const dev = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null), undoBtn = useRef<HTMLButtonElement>(null), timerEl = useRef<HTMLSpanElement>(null)
  const removed = useRef<{ it: Photo; i: number } | null>(null)
  const anim = useRef<Animation | null>(null)
  const [items, setItems] = useState<Photo[]>(PHOTOS)
  const [bar, setBar] = useState(false)
  const [paused, setPaused] = useState(false)
  const [msg, setMsg] = useState('사진을 삭제했어요')
  const [log, setLog] = useState<ReactNode>(<>🗑을 누르고, 스낵바에 <b>마우스를 올려</b> 보세요</>)
  useEffect(() => () => anim.current?.cancel(), [])

  const hide = () => { setBar(false); setPaused(false); if (anim.current) { anim.current.cancel(); anim.current = null } }
  const del = (i: number) => {
    removed.current = { it: items[i], i }
    setItems(items.filter((_, j) => j !== i))
    setMsg('‘' + items[i][0] + '’을(를) 삭제했어요')
    anim.current?.cancel()
    setBar(true); setPaused(false)
    const a = timerEl.current!.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: D(4000), fill: 'both' })
    anim.current = a
    a.onfinish = () => { hide(); removed.current = null; setLog(<>4초가 지나 <b>삭제 확정</b> · 스낵바 자동 닫힘</>) }
    setLog(<>4초 안에 <b>실행 취소</b> 가능 — 올리면 타이머 정지</>)
  }
  const undo = () => {
    const r = removed.current
    if (!r) return
    setItems(its => { const n = its.slice(); n.splice(r.i, 0, r.it); return n })
    setLog(<>↩ <b>‘{r.it[0]}’ 복구</b> — 스낵바의 단 하나뿐인 행동</>)
    removed.current = null
    hide()
  }

  const demo = useDemo({
    reset() { hide(); setItems(PHOTOS); removed.current = null; setLog(<>🗑을 누르고, 스낵바에 <b>마우스를 올려</b> 보세요</>) },
    async play(c) {
      await c.press(dev.current, list.current?.querySelector<HTMLElement>('.fb-del') ?? null); await c.sleep(1600)
      await c.press(dev.current, undoBtn.current); await c.sleep(1000)
    },
  })

  return (
    <Card id="feedback-snack" num="02" title="스낵바" en="Snackbar" desc="결과를 알리면서 ‘실행 취소’ 같은 행동 하나를 함께 줘요. 손을 올리면 시간이 멈춰요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">최근 사진</div>
            <div ref={list}>
              {items.length ? items.map((it, i) => (
                <div className="li" style={{ cursor: 'default' }} key={it[0]}>
                  <span className={'fb-thumb ' + it[1]} /><span>{it[0]}<span className="sub">{it[2]}</span></span>
                  <button className="fb-del" aria-label={it[0] + ' 삭제'} onClick={() => del(i)}>🗑</button>
                </div>
              )) : <div className="fb-empty">사진이 없어요</div>}
            </div>
          </div>
          <div className={'snackbar' + (bar ? ' on' : '') + (paused ? ' paused' : '')} role="status" aria-live="polite"
            onPointerEnter={() => { const a = anim.current; if (a && a.playState === 'running') { a.pause(); setPaused(true); setLog(<>⏸ 포인터가 올라가 있어 <b>타이머 정지</b></>) } }}
            onPointerLeave={() => { const a = anim.current; if (a && a.playState === 'paused') { a.play(); setPaused(false); setLog(<>▶ 포인터가 떠나 <b>타이머 재개</b></>) } }}>
            <span>{msg}</span><button ref={undoBtn} onClick={undo}>실행 취소</button><span className="timer" ref={timerEl} />
          </div>
        </Device>
      </Stage>
      <Info
        spec={[lv(2, '낮음'), ['지속', '4초 · 호버 시 정지'], ['행동', '최대 1개']]}
        usage={[['언제', '삭제·보관·이동처럼 되돌릴 수 있는 작업을 방금 했을 때'], ['vs 토스트', '행동 버튼이 있으면 스낵바 — 읽고 누를 시간을 4초 이상 줘요']]}
      />
    </Card>
  )
}

/* ---------- 03 배너 ---------- */
type BK = 'info' | 'warn' | 'err'
const BANNERS: Record<BK, readonly [string, string, string, string, boolean]> = {
  info: ['ℹ️', '오늘 02:00–04:00 정기 점검', '점검 중엔 주문이 잠시 멈춰요.', '자세히 보기', true],
  warn: ['⚠️', '정기 결제에 실패했어요', '카드 한도를 확인하고 다시 등록해 주세요.', '결제 수단 변경', true],
  err: ['⛔', '인터넷 연결이 끊겼어요', '연결되면 자동으로 새로고침돼요.', '다시 시도', false],
}
const CHIPS: [BK, string][] = [['info', 'ℹ️ 점검 예고'], ['warn', '⚠️ 결제 실패'], ['err', '⛔ 오프라인']]
const MENU = [['📦', '', '주문 내역', '배송 중 1건'], ['💳', 'o', '결제 수단', '카드 2개'], ['🎟️', '', '쿠폰함', '사용 가능 3장'], ['⭐', 'o', '리뷰 관리', '작성 가능 2건']] as const

export function Banner() {
  const { D } = useMotion()
  const timers = useTimers()
  const dev = useRef<HTMLDivElement>(null), ctrl = useRef<HTMLDivElement>(null), slot = useRef<HTMLDivElement>(null)
  const curRef = useRef<BK | null>(null)
  const [cur, setCurState] = useState<BK | null>(null)
  const [shown, setShown] = useState<BK | null>(null) // 닫히는 동안에도 내용은 남겨둬요
  const [run, setRun] = useState(0)
  const [checking, setChecking] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>종류를 골라 <b>시스템 배너</b>를 띄워 보세요</>)
  const setCur = (k: BK | null) => { curRef.current = k; setCurState(k) }

  const close = (how: ReactNode) => { setCur(null); setLog(how) }
  const show = (k: BK) => {
    const d = BANNERS[k]
    setCur(k); setShown(k); setRun(r => r + 1); setChecking(false)
    setLog(d[4] ? <>아래 목록을 <b>밀어내고</b> 자리 차지 · ✕를 누를 때까지 유지</> : <><b>✕가 없어요</b> — 연결이 돌아와야 사라져요</>)
  }
  const act = (k: BK) => {
    if (k === 'err') {
      setChecking(true)
      timers.set(() => { if (curRef.current === 'err') close(<>연결 복구 → 문제가 풀려서 <b>배너가 스스로 사라짐</b></>) }, D(900))
    } else setLog(<><b>{BANNERS[k][3]}</b> 이동 — 배너는 해결 행동으로 이어져요</>)
  }

  const demo = useDemo({
    reset() { setCur(null); setLog(<>종류를 골라 <b>시스템 배너</b>를 띄워 보세요</>) },
    async play(c) {
      const box = dev.current?.parentElement ?? null
      const chip = (i: number) => ctrl.current?.children[i] as HTMLElement | null
      const q = (s: string) => slot.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(box, chip(1)); await c.sleep(1500)
      await c.press(dev.current, q('.x')); await c.sleep(900)
      await c.press(box, chip(2)); await c.sleep(1400)
      await c.press(dev.current, q('.act')); await c.sleep(1400)
    },
  })

  const d = shown && BANNERS[shown]
  return (
    <Card id="feedback-banner" num="03" title="배너" en="Banner" desc="화면 위에 자리를 차지하고 콘텐츠를 밀어내요. 사용자가 닫거나 문제가 풀릴 때까지 남아요." demo={demo}>
      <Stage log={log}>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">홈</div>
            <div className={'fb-bwrap' + (cur ? ' on' : '')}>
              <div ref={slot}>
                {shown && d && (
                  <div className={'fb-banner ' + shown} role={shown === 'info' ? 'status' : 'alert'} key={run}>
                    <span className="ico">{d[0]}</span>
                    <div><b>{d[1]}</b>{d[2]}<br /><button className="act" onClick={() => act(shown)}>{checking ? '연결 확인 중…' : d[3] + ' ›'}</button></div>
                    {d[4] && <button className="x" aria-label="배너 닫기" onClick={() => close(<><b>✕로 닫힘</b> — 목록이 다시 제자리로</>)}>✕</button>}
                  </div>
                )}
              </div>
            </div>
            {MENU.map(([ic, o, t, sub]) => (
              <div className="li" key={t}><i className={'ic' + (o ? ' o' : '')}>{ic}</i><span>{t}<span className="sub">{sub}</span></span><span className="chev">›</span></div>
            ))}
            <div className="li"><i className="ic">⚙️</i><span>설정</span><span className="chev">›</span></div>
          </div>
        </Device>
        <div className="fb-ctrl" ref={ctrl}>
          {CHIPS.map(([k, label]) => (
            <button key={k} className="chip" aria-pressed={cur === k}
              onClick={() => { if (curRef.current === k) close(<>같은 종류를 다시 눌러 <b>닫음</b></>); else show(k) }}>{label}</button>
          ))}
        </div>
      </Stage>
      <Info
        spec={[lv(3, '보통'), ['지속', '닫을 때까지'], ['위치', '콘텐츠 위 · 밀어냄']]}
        usage={[['언제', '점검 예고·결제 실패·연결 끊김처럼 해결될 때까지 계속 알아야 하는 상태'], ['주의', '해결 전엔 닫으면 안 되는 배너(오프라인)는 ✕를 빼고 해결 버튼을 주세요']]}
      />
    </Card>
  )
}
