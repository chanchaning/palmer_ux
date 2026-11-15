import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { CheckSvg, Knob } from '../shared'
import { fin, reduced, useRun } from '../util'

/* ---------- 01 체크 그리기 ---------- */
export function CheckDraw() {
  const { A, clearA } = useMotion()
  const [ms, setMs] = useState(600)
  const [ring, setRing] = useState(true)
  const [done, setDone] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const play = async (d = ms, r = ring) => {
    const s = box.current?.querySelector('.dn-ck')
    const c = s?.querySelector('.dn-ck-c'), p = s?.querySelector('.dn-ck-p')
    if (!s || !c || !p) return
    clearA(s, c, p)
    setDone(false)
    const t = reduced() ? 1 : d
    const cd = r ? Math.round(t * 0.55) : 0
    const pd = r ? t - cd : t
    if (r) A(c, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], cd, EASE.out)
    const last = A(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], pd, EASE.out, cd)
    A(s, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], 260, EASE.std, t)
    await fin(last)
    setDone(true)
  }
  const demo = useDemo({
    reset() { setDone(false); const s = box.current?.querySelector('.dn-ck'); clearA(s, s?.querySelector('.dn-ck-c'), s?.querySelector('.dn-ck-p')) },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(1400) },
  })
  return (
    <Card id="done-check" num="01" title="체크 그리기" en="Check Draw" demo={demo}
      desc="원이 그려지고 그 안에 체크가 쓱 그어져요. 가장 짧고 확실한 ‘끝났어요’예요.">
      <Stage log={<>{ring ? <>원 <b>{Math.round(ms * 0.55)}ms</b> → 체크 <b>{ms - Math.round(ms * 0.55)}ms</b></> : <>체크만 <b>{ms}ms</b></>}{ms >= 1200 ? ' · 저장 한 번에 1초는 길어요' : ms <= 300 ? ' · 빠르지만 그려지는 게 보여요' : ' · 손으로 긋는 속도와 비슷해요'}</>}>
        <div className="box dn-box" ref={box}>
          <div className="dn-ck-wrap">
            <CheckSvg size={84} className={ring ? '' : 'noring'} />
            <p className={'dn-ck-msg' + (done ? ' on' : '')} aria-hidden={!done}>저장했어요</p>
          </div>
          <button className="btn" ref={btn} onClick={() => play()}>저장하기</button>
          <div className="dn-ctrl">
            <Knob label="시간"><Seg value={ms} onChange={v => { setMs(v); play(v) }} options={[[300, '0.3초'], [600, '0.6초'], [1200, '1.2초']]} /></Knob>
            <Knob label="원"><Seg value={ring ? 1 : 0} onChange={v => { setRing(!!v); play(ms, !!v) }} options={[[1, '원 + 체크'], [0, '체크만']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시간', '300–600ms'], ['순서', '원 → 체크'], ['방법', 'stroke-dashoffset']]}
        usage={[
          ['언제', '저장, 설정 변경, 복사처럼 자주 하는 작은 일이 끝났을 때'],
          ['원리', '선 길이를 1로 맞추고(pathLength="1") 점선 간격을 1에서 0으로 줄이면, 선이 손으로 긋듯 나타나요.'],
          ['주의', '체크만으로는 무엇이 끝났는지 몰라요. ‘저장했어요’처럼 짧은 문구를 꼭 같이 보여주고, 화면 낭독기에도 알려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 할 일 줄긋기 ---------- */
const TODOS = ['장보기 목록 정리', '세탁소에 맡기기', '보고서 초안 보내기', '물 2L 마시기']
type St = 'todo' | 'strike' | 'done'
type After = 'stay' | 'move' | 'hide'
export function StrikeThrough() {
  const m = useMotion()
  const timers = useTimers()
  const [st, setSt] = useState<Record<string, St>>({})
  const [after, setAfter] = useState<After>('move')
  const [log, setLog] = useState<ReactNode>(<>네모를 눌러 할 일을 <b>끝내</b> 보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const get = (t: string): St => st[t] ?? 'todo'
  const toggle = (t: string) => {
    if (get(t) !== 'todo') {
      setSt(s => ({ ...s, [t]: 'todo' }))
      setLog(<><b>{t}</b> 되돌렸어요</>)
      return
    }
    setSt(s => ({ ...s, [t]: 'strike' }))
    setLog(<>줄이 그어지는 동안 <b>잠깐 머물러요</b></>)
    timers.set(() => {
      setSt(s => (s[t] === 'strike' ? { ...s, [t]: 'done' } : s))
      setLog(<><b>{t}</b> 완료 · {after === 'move' ? '아래 ‘끝낸 일’로 옮겼어요' : after === 'hide' ? '목록에서 숨겼어요' : '그 자리에 남겨 뒀어요'}</>)
    }, m.D(reduced() ? 150 : 700))
  }
  const left = TODOS.filter(t => after === 'stay' || get(t) !== 'done')
  const doneList = TODOS.filter(t => get(t) === 'done')
  const row = (t: string, inDone = false) => {
    const s = get(t)
    return (
      <li key={t} className={'dn-todo ' + s + (inDone ? ' moved' : '')}>
        <label className="opt"><input type="checkbox" checked={s !== 'todo'} onChange={() => toggle(t)} aria-label={t + (s === 'todo' ? ' 완료' : ' 되돌리기')} /></label>
        <span className="dn-todo-t">{t}<i className={'dn-strike' + (s === 'todo' ? '' : ' on') + (inDone || s === 'done' ? ' static' : '')} aria-hidden="true" /></span>
      </li>
    )
  }
  const demo = useDemo({
    reset() { timers.clear(); setSt({}) },
    async play(c) {
      for (let i = 0; i < 2; i++) {
        const cb = box.current?.querySelector<HTMLInputElement>('.dn-todo.todo input')
        if (!cb) break
        c.tap(box.current, cb); await c.sleep(200); cb.click(); await c.sleep(1300)
      }
    },
  })
  return (
    <Card id="done-strike" num="02" title="할 일 줄긋기" en="Strike-through" demo={demo}
      desc="글자 위로 줄이 그어진 뒤, 끝낸 일은 아래로 비켜나요. 종이 메모에 줄 긋는 기분이에요.">
      <Stage log={log}>
        <div className="box left dn-box" ref={box}>
          <ul className="dn-todos">{left.map(t => row(t))}</ul>
          {after === 'move' && doneList.length > 0 && (
            <div className="dn-done-sec">
              <span className="dn-sec-l">끝낸 일 {doneList.length}</span>
              <ul className="dn-todos">{doneList.map(t => row(t, true))}</ul>
            </div>
          )}
          {after === 'hide' && doneList.length > 0 && <p className="dn-hidden">끝낸 일 {doneList.length}개는 숨겼어요</p>}
          <div className="dn-ctrl">
            <Knob label="끝낸 뒤"><Seg value={after} onChange={v => { setAfter(v) }} options={[['stay', '그 자리'], ['move', '아래로'], ['hide', '숨기기']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['줄 긋기', '250–350ms'], ['머무름', '0.5–1초'], ['방향', '왼 → 오']]}
        usage={[
          ['언제', '할 일 목록, 장보기 목록, 체크리스트처럼 하나씩 지워 가는 화면'],
          ['실무', '줄이 다 그어지기 전에 항목이 사라지면 ‘뭘 끝냈지?’ 싶어요. 잠깐 머문 뒤 옮기고, 되돌리기를 열어 둬요.'],
          ['주의', '줄 긋기만으로는 화면 낭독기에 상태가 안 전해져요. 체크박스의 checked 값과 ‘완료’ 문구로 함께 알려요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 버튼 모핑 ---------- */
type Ph = 'idle' | 'load' | 'ok' | 'fail' | 'okWide' | 'failWide'
export function ButtonMorph() {
  const [ph, setPh] = useState<Ph>('idle')
  const [result, setResult] = useState<'ok' | 'fail'>('ok')
  const [wait, setWait] = useState(1200)
  const { run, stop } = useRun()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const go = (r = result, w = wait) => run(async sl => {
    setPh('idle'); await sl(60)
    setPh('load'); await sl(w)
    setPh(r); await sl(r === 'ok' ? 900 : 700)
    setPh(r === 'ok' ? 'okWide' : 'failWide')
  })
  const click = () => {
    if (ph === 'load' || ph === 'ok' || ph === 'fail') return
    if (ph === 'okWide') { stop(); setPh('idle'); return }
    go()
  }
  const label: Record<Ph, ReactNode> = {
    idle: '32,400원 결제하기',
    load: <span className="dn-spin" aria-hidden="true" />,
    ok: <CheckSvg size={26} circle={false} className="draw" />,
    fail: <b aria-hidden="true">!</b>,
    okWide: '결제했어요 · 처음으로',
    failWide: '다시 시도하기',
  }
  const logs: Record<Ph, ReactNode> = {
    idle: <>버튼이 <b>그 자리에서</b> 진행과 결과를 보여줘요</>,
    load: <>동그랗게 줄어들어 <b>기다리는 중</b>{wait > 2000 ? ' · 오래 걸리면 무엇을 하는지 글로도 알려요' : ''}</>,
    ok: <><b>체크</b>로 바뀌었어요</>,
    fail: <>빨간 원이 <b>좌우로 흔들려요</b></>,
    okWide: <>다시 펼쳐지며 <b>결과를 글로</b> 남겨요</>,
    failWide: <>실패 이유와 <b>다시 시도</b>를 바로 줘요</>,
  }
  const demo = useDemo({
    reset() { stop(); setPh('idle') },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(wait + 2200) },
  })
  const busy = ph === 'load'
  return (
    <Card id="done-morph" num="03" title="버튼 모핑" en="Button Morph" demo={demo}
      desc="누른 버튼이 동그랗게 줄어 돌다가, 체크로 바뀌고 다시 펼쳐져요. 눈을 다른 데로 옮기지 않아도 돼요.">
      <Stage log={logs[ph]}>
        <div className="box dn-box" ref={box}>
          <button ref={btn} className={'dn-morph ' + ph} onClick={click} aria-busy={busy}
            aria-label={busy ? '결제하는 중' : ph === 'ok' ? '결제 완료' : ph === 'fail' ? '결제 실패' : undefined}>
            <span className="dn-morph-in" key={ph}>{label[ph]}</span>
          </button>
          {ph === 'failWide' && <p className="dn-err">카드 한도를 넘었어요. 다른 카드로 해 볼까요?</p>}
          <div className="dn-ctrl">
            <Knob label="결과"><Seg value={result} onChange={v => { setResult(v); go(v) }} options={[['ok', '성공'], ['fail', '실패']]} /></Knob>
            <Knob label="기다림"><Seg value={wait} onChange={v => { setWait(v); go(result, v) }} options={[[1200, '1.2초'], [3000, '3초']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['줄어들기', '250–300ms'], ['결과 유지', '0.8–1초'], ['모양', '버튼 → 원 → 버튼']]}
        usage={[
          ['언제', '결제, 신청, 저장처럼 버튼 하나로 몇 초 안에 끝나는 일'],
          ['실무', '줄어든 동안에는 다시 누르지 못하게 막고(중복 결제 방지), aria-busy로 진행 중임을 알려요.'],
          ['주의', '원 안에는 글이 안 들어가요. 몇 초 넘게 걸리면 무엇을 하는지 버튼 밖에 글로 보여주고, 실패도 꼭 글로 설명해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 진행률 완료 ---------- */
type End = 'done' | 'vanish'
export function ProgressDone() {
  const [p, setP] = useState(0)
  const [phase, setPhase] = useState<'ready' | 'run' | 'done' | 'gone'>('ready')
  const [end, setEnd] = useState<End>('done')
  const [hold, setHold] = useState(400)
  const { run, stop } = useRun()
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const go = (e = end, h = hold) => run(async sl => {
    setPhase('run'); setP(0)
    for (let v = 0; v <= 100; v += 4) { setP(v); await sl(v > 80 ? 70 : 45) }
    setP(100)
    if (h) await sl(h)
    setPhase(e === 'done' ? 'done' : 'gone')
  })
  const demo = useDemo({
    reset() { stop(); setP(0); setPhase('ready') },
    async play(c) { await c.press(box.current, btn.current); await c.sleep(3600) },
  })
  const log = phase === 'ready' ? <>올리기를 누르면 막대가 차올라요</>
    : phase === 'run' ? <>올리는 중 <b>{p}%</b></>
    : phase === 'done' ? <><b>100%</b>에서 {hold ? '잠깐 머문 뒤 ' : ''}<b>완료</b>로 바뀌었어요</>
    : <>막대가 그냥 사라졌어요 · <b>끝난 걸까요, 멈춘 걸까요?</b></>
  return (
    <Card id="done-progress" num="04" title="진행률 완료" en="Progress to Complete" demo={demo}
      desc="막대가 끝까지 차면 초록 체크와 ‘완료’로 바뀌어요. 끝을 분명히 보여줘야 기다림이 보상받아요.">
      <Stage log={log}>
        <div className="box left dn-box" ref={box}>
          <div className={'dn-up ' + phase}>
            <div className="dn-up-ic" aria-hidden="true">{phase === 'done' ? <CheckSvg size={22} circle={false} className="draw" /> : 'ZIP'}</div>
            <div className="dn-up-body">
              <div className="dn-up-top"><b>여행사진_제주.zip</b><span>{phase === 'done' ? '올렸어요' : phase === 'gone' ? '' : phase === 'run' ? `${p}%` : '24MB'}</span></div>
              {phase !== 'gone' && (
                <div className="dn-bar" role="progressbar" aria-label="올리기 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
                  <i style={{ width: p + '%' }} />
                </div>
              )}
              {phase === 'done' && <small className="dn-up-sub">24MB · 방금 · 공유 폴더에 있어요</small>}
            </div>
          </div>
          <button className="btn" ref={btn} onClick={() => go()} disabled={phase === 'run'}>{phase === 'ready' ? '올리기' : '다시 올리기'}</button>
          <div className="dn-ctrl">
            <Knob label="끝맺음"><Seg value={end} onChange={v => { setEnd(v); go(v) }} options={[['done', '완료로 바뀜'], ['vanish', '그냥 사라짐']]} /></Knob>
            <Knob label="100%에서"><Seg value={hold} onChange={v => { setHold(v); go(end, v) }} options={[[0, '바로'], [400, '0.4초 머묾']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['100% 머묾', '300–500ms'], ['색', '진행 → 성공색'], ['함께', '결과 문구']]}
        usage={[
          ['언제', '파일 올리기·내려받기, 설치, 내보내기처럼 몇 초 이상 걸리는 일'],
          ['실무', '99%에서 바로 사라지면 끝을 못 봐요. 100%를 잠깐 보여주고, 결과물이 어디 있는지(공유 폴더 등) 알려줘요.'],
          ['주의', '색만 초록으로 바꾸면 색을 구분하기 어려운 사람은 놓쳐요. 체크 아이콘과 ‘올렸어요’ 글을 같이 써요.'],
        ]}
      />
    </Card>
  )
}
