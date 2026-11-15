import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion, type Rect } from '../../../lib/motion'
import { APP, Flow, Ico, Mark, Phone, type IcoName } from '../shared'
import { FEED, q, stageOf } from '../util'

/* ---------- 07 웰컴 화면 ---------- */
const CHECK = ['첫 기록 남기기', '알림 시간 정하기', '친구 초대하기']
const BAD_TILES: [IcoName, string][] = [['book', '기록'], ['chart', '통계'], ['users', '친구'], ['shop', '상점'], ['gift', '이벤트'], ['gear', '설정']]
const W_LOG = <>처음 들어온 홈이에요. <b>가장 먼저 할 일</b>이 보이나요?</>

export function Welcome() {
  const [mode, setMode] = useState<'good' | 'bad'>('good')
  const [view, setView] = useState<'home' | 'write'>('home')
  const [text, setText] = useState('')
  const [doneN, setDoneN] = useState(0)
  const [popup, setPopup] = useState(true)
  const [toast, setToast] = useState(false)
  const [log, setLog] = useState<ReactNode>(W_LOG)
  const timers = useTimers()
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)

  const reset = (md = mode) => {
    timers.clear(); setView('home'); setText(''); setDoneN(0); setPopup(true); setToast(false)
    setLog(md === 'good' ? W_LOG : <>쿠폰 팝업, 배너, 똑같은 크기 버튼 6개 — <b>무엇부터?</b></>)
  }
  const save = () => {
    setView('home'); setDoneN(1); setToast(true)
    timers.set(() => setToast(false), m.D(2200))
    setLog(<>첫 기록 완료 — 체크리스트 <b>1/3</b>. 다음 할 일이 자연스럽게 이어져요</>)
  }
  const demo = useDemo({
    reset: () => reset(),
    async play(c) {
      const d = dev.current
      if (mode === 'bad') {
        await c.press(d, q(d, 'bad-x')); await c.sleep(1200)
        const st = stageOf(d)
        await c.press(st, st?.querySelector<HTMLElement>('button[data-v="good"]') ?? null); await c.sleep(900)
      }
      await c.press(dev.current, q(dev.current, 'go')); await c.sleep(600)
      const t = '오늘 물 6잔 마셨다'
      for (let i = 1; i <= t.length; i++) { setText(t.slice(0, i)); await c.sleep(70) }
      await c.sleep(400)
      await c.press(dev.current, q(dev.current, 'save')); await c.sleep(2000)
    },
  })

  return (
    <Card id="fr-welcome" num="07" title="웰컴 화면" en="Welcome Screen · First Home" demo={demo}
      desc="모든 준비를 마치고 처음 만나는 홈이에요. 이름을 불러 반기고, 지금 해볼 일 하나만 크게 보여줘요.">
      <Stage log={log} logId="fr-welcome-log">
        <Flow at={6} />
        <Seg value={mode} onChange={v => { setMode(v); reset(v) }} className="fr-seg" options={[['good', '다음 행동 하나'], ['bad', '전부 한꺼번에']]} />
        <Phone ref={dev}>
          <div className="scr">
            {mode === 'good' ? (view === 'home' ? (
              <>
                <div className="bar">{APP}</div>
                <div className="fr-wel fr-in">
                  <div className="fr-greet"><b>반가워요, 봄비 님</b><span>새싹이 첫 기록을 기다리고 있어요.</span></div>
                  {doneN === 0 ? (
                    <div className="fr-hero">
                      <Mark size={44} />
                      <b>오늘의 첫 한 줄 남기기</b>
                      <span>10초면 돼요</span>
                      <button className="btn sm" data-k="go" onClick={() => { setView('write'); setLog(<>버튼 하나를 눌렀더니 <b>바로 기록</b> — 길을 잃을 틈이 없어요</>) }}>기록하기</button>
                    </div>
                  ) : (
                    <div className="fr-hero done"><Ico n="check" size={28} /><b>첫 새싹이 돋았어요</b><span>내일 또 만나요</span></div>
                  )}
                  <div className="fr-check">
                    <div className="fr-lab">시작하기 {doneN}/{CHECK.length}</div>
                    {CHECK.map((t, i) => <div key={t} className={'fr-ck' + (i < doneN ? ' on' : '')}><span>{i < doneN && <Ico n="check" size={11} />}</span>{t}</div>)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bar"><button className="back" aria-label="뒤로" onClick={() => setView('home')}>‹</button>첫 기록</div>
                <div className="fr-form fr-in">
                  <label>오늘 한 줄
                    <textarea rows={4} value={text} placeholder="예: 오늘 물 6잔 마셨다" onChange={e => setText(e.target.value)} />
                  </label>
                  <button className="btn fr-wide" data-k="save" disabled={!text.trim()} onClick={save}>저장</button>
                </div>
              </>
            )) : (
              <>
                <div className="bar">{APP}</div>
                <div className="fr-wel">
                  <div className="fr-ad">신규 가입 이벤트 · 공지 3건 · 업데이트 안내</div>
                  <div className="fr-tiles">
                    {BAD_TILES.map(([ic, t]) => <button key={t} className="fr-tile" onClick={() => setLog(<><b>{t}</b>… 다 비슷해 보여서 아무거나 눌러 봐요</>)}><Ico n={ic} size={20} />{t}</button>)}
                  </div>
                  <div className="fr-ad">친구 초대하면 씨앗 100개!</div>
                </div>
                {popup && (
                  <div className="fr-pop fr-in" role="dialog" aria-label="이벤트">
                    <button className="fr-pop-x" data-k="bad-x" aria-label="닫기" onClick={() => { setPopup(false); setLog(<>팝업을 닫아도 <b>버튼 6개가 똑같이</b> 생겼어요 — 첫날 이탈이 많아요</>) }}><Ico n="x" size={16} /></button>
                    <Ico n="gift" size={34} />
                    <b>신규 가입 쿠폰 도착!</b>
                    <span>지금 상점에서 쓰세요</span>
                  </div>
                )}
              </>
            )}
          </div>
          {toast && <div className="fr-toast">첫 새싹이 돋았어요!</div>}
        </Phone>
      </Stage>
      <Info
        spec={[['다음 행동', '하나'], ['말투', '이름 불러 반기기'], ['체크리스트', '작게 · 선택']]}
        usage={[
          ['언제', '가입과 설정을 마치고 처음 홈에 들어왔을 때 — 거의 모든 앱이 거쳐요'],
          ['주의', '쿠폰·공지·기능 소개를 한꺼번에 띄우지 마세요. 첫날엔 가장 먼저 해볼 한 가지만 크게'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 코치마크 ---------- */
const TIPS = ['지난 기록은 여기서 찾아요', '오늘의 한 줄은 이 버튼으로 남겨요', '쌓인 기록은 ‘기록’ 탭에서 모아 봐요']
const CM_LOG = <>아래 <b>코치마크 보기</b>를 눌러 보세요</>

export function CoachMark() {
  const m = useMotion()
  const [step, setStep] = useState(-1)
  const [rect, setRect] = useState<Rect | null>(null)
  const [h, setH] = useState(406)
  const [log, setLog] = useState<ReactNode>(CM_LOG)
  const dev = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const d = dev.current
    if (step < 0 || !d) return
    const el = d.querySelector('[data-coach="' + step + '"]')
    if (el) { setRect(m.rel(d, el)); setH(d.clientHeight) }
  }, [step, m])

  const reset = () => { setStep(-1); setRect(null); setLog(CM_LOG) }
  const next = () => {
    if (step >= TIPS.length - 1) { setStep(-1); setLog(<>끝 — 이제 다시 안 띄워요. <b>3개 이하</b>로 짧게</>); return }
    setStep(step + 1); setLog(<><b>{step + 2}/{TIPS.length}</b> · {TIPS[step + 1]}</>)
  }
  const demo = useDemo({
    reset,
    async play(c) {
      const st = stageOf(dev.current)
      await c.press(st, q(st, 'start')); await c.sleep(1500)
      await c.press(dev.current, q(dev.current, 'next')); await c.sleep(1500)
      await c.press(dev.current, q(dev.current, 'next')); await c.sleep(1500)
      await c.press(dev.current, q(dev.current, 'next')); await c.sleep(900)
    },
  })

  const pad = 4
  const below = rect ? rect.top + rect.height / 2 < h / 2 : true
  return (
    <Card id="fr-coach" num="08" title="코치마크" en="Coach Mark · Spotlight" demo={demo}
      desc="화면을 어둡게 덮고 버튼 하나만 동그랗게 비춰 ‘여기 있어요’ 하고 짚어줘요. 한 번에 하나씩, 짧게 끝내요.">
      <Stage log={log} logId="fr-coach-log">
        <Flow at={7} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">{APP}<span className="sp" /><button data-coach="0" aria-label="검색" className="fr-icbtn"><Ico n="search" size={18} /></button></div>
            <div className="fr-feed">
              {FEED.map(([n, t], i) => <div className="fr-post" key={n}><span className={'fr-av g' + (i + 1)} /><div><b>{n}</b><p>{t}</p></div></div>)}
            </div>
            <button className="fr-fab" data-coach="1" aria-label="기록 추가"><Ico n="plus" size={22} /></button>
            <div className="tabbar">
              <button className="on"><Ico n="home" size={18} />홈</button>
              <button data-coach="2"><Ico n="book" size={18} />기록</button>
              <button><Ico n="users" size={18} />친구</button>
              <button><Ico n="me" size={18} />나</button>
            </div>
          </div>
          {step >= 0 && rect && (
            <>
              <div className="fr-block" />
              <div className="fr-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
              <div className="fr-tip" role="dialog" aria-label={`도움말 ${step + 1}/${TIPS.length}`} key={step}
                style={below ? { top: rect.top + rect.height + 12 } : { bottom: h - rect.top + 12 }}>
                <b>{TIPS[step]}</b>
                <div className="row">
                  <button className="fr-link" data-k="skip" onClick={() => { setStep(-1); setLog(<><b>건너뛰기</b> — 언제든 끌 수 있어야 해요</>) }}>건너뛰기</button>
                  <button className="btn sm" data-k="next" onClick={next}>{step === TIPS.length - 1 ? '알겠어요' : `다음 ${step + 1}/${TIPS.length}`}</button>
                </div>
              </div>
            </>
          )}
        </Phone>
        <button className="btn ghost sm" data-k="start" onClick={() => { setStep(0); setLog(<><b>1/{TIPS.length}</b> · {TIPS[0]}</>) }} disabled={step >= 0}>코치마크 보기</button>
      </Stage>
      <Info
        spec={[['한 번에', '하나만 비추기'], ['개수', '3개 이하'], ['끄기', '언제든 건너뛰기']]}
        usage={[
          ['언제', '첫 홈에서 꼭 알아야 할 버튼이 눈에 덜 띄거나, 새 기능이 생겼을 때 — 빼도 되는 단계예요'],
          ['주의', '버튼을 하나하나 다 설명하지 마세요. 처음 그 기능을 쓰려는 순간에 하나씩 짚는 편이 더 기억에 남아요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 권한 요청 ---------- */
type PKind = 'noti' | 'loc' | 'photo'
const P_LOG = <>방식을 고르고 <b>앱 처음 켜기</b>를 눌러 보세요</>

export function PermissionInContext() {
  const [mode, setMode] = useState<'burst' | 'ctx'>('burst')
  const [queue, setQueue] = useState<PKind[]>([])
  const [shown, setShown] = useState(0)
  const [no, setNo] = useState(0)
  const [ctxOn, setCtxOn] = useState(false)
  const [near, setNear] = useState<'idle' | 'ok' | 'no'>('idle')
  const [log, setLog] = useState<ReactNode>(P_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const cur = queue[0]

  const reset = () => { setQueue([]); setShown(0); setNo(0); setCtxOn(false); setNear('idle'); setLog(P_LOG) }
  const launch = () => {
    reset()
    if (mode === 'burst') { setQueue(['noti', 'loc', 'photo']); setShown(1); setLog(<>켜자마자 <b>허용 창 1/3</b> — 아직 아무것도 안 해봤는데요</>) }
    else { setCtxOn(true); setLog(<>홈부터 보여줘요. 창은 <b>기능을 쓸 때</b>만</>) }
  }
  const answer = (allow: boolean) => {
    const rest = queue.slice(1)
    const nn = no + (allow ? 0 : 1)
    setQueue(rest); setNo(nn)
    if (mode === 'burst') {
      if (rest.length) { setShown(s => s + 1); setLog(<>또 창… <b>허용 창 {4 - rest.length}/3</b></>) }
      else setLog(<>허용 창 <b>3번 연속</b>, 그중 {nn}개 거절 — 왜 필요한지 몰라 일단 다 막기 쉬워요</>)
    } else {
      setNear(allow ? 'ok' : 'no')
      setLog(allow ? <>‘근처 친구 찾기’를 누른 순간이라 <b>이유가 분명</b>해요 → 허용</> : <>거절해도 <b>동네를 직접 고르는</b> 길이 남아요</>)
    }
  }
  const demo = useDemo({
    reset,
    async play(c) {
      const st = stageOf(dev.current)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="burst"]') ?? null); await c.sleep(300)
      await c.press(st, q(st, 'launch')); await c.sleep(1000)
      for (let i = 0; i < 3; i++) { await c.press(dev.current, q(dev.current, 'p-no')); await c.sleep(800) }
      await c.sleep(800)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="ctx"]') ?? null); await c.sleep(300)
      await c.press(st, q(st, 'launch')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, 'near')); await c.sleep(1000)
      await c.press(dev.current, q(dev.current, 'p-yes')); await c.sleep(1500)
    },
  })

  const D: Record<PKind, [string, string]> = {
    noti: [`‘${APP}’에서 알림을 보내려고 해요`, '알림에는 메시지, 소리, 아이콘 배지가 포함될 수 있어요.'],
    loc: [`‘${APP}’이 위치를 사용하도록 허용할까요?`, mode === 'ctx' ? '근처 산책 친구를 찾을 때만 써요.' : '더 나은 서비스를 위해 사용합니다.'],
    photo: [`‘${APP}’이 사진에 접근하려고 해요`, '서비스 이용을 위해 필요합니다.'],
  }
  return (
    <Card id="fr-perm" num="09" title="권한 요청" en="Permission Request in Context" demo={demo}
      desc="알림·위치·사진 허용은 첫 실행 때 한꺼번에 묻지 않아요. 그 권한이 필요한 기능을 처음 누른 순간에 하나만 물어요.">
      <Stage log={log} logId="fr-perm-log">
        <Flow at={8} />
        <Seg value={mode} onChange={v => { setMode(v); reset() }} className="fr-seg" options={[['burst', '켜자마자 전부'], ['ctx', '필요할 때 하나씩']]} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">{APP}</div>
            <div className="fr-feed">
              {FEED.slice(0, 2).map(([n, t], i) => <div className="fr-post" key={n}><span className={'fr-av g' + (i + 1)} /><div><b>{n}</b><p>{t}</p></div></div>)}
              {ctxOn && (
                <div className="fr-near fr-in">
                  <Ico n="pin" size={18} />
                  {near === 'idle' && <><span>근처에서 같이 산책할 친구를 찾아볼까요?</span><button className="btn sm" data-k="near" onClick={() => { setQueue(['loc']); setLog(<>버튼을 누른 <b>바로 그때</b>, 위치 하나만 물어요</>) }}>근처 친구 찾기</button></>}
                  {near === 'ok' && <span>근처 친구 <b>3명</b>을 찾았어요</span>}
                  {near === 'no' && <span>위치 없이 <b>동네를 직접</b> 골라 찾을 수 있어요</span>}
                </div>
              )}
            </div>
          </div>
          <div className={'scrim' + (cur ? ' on' : '')} />
          <div className={'dialog fr-sys' + (cur ? ' on' : '')} role="alertdialog" aria-labelledby="fr-perm-dt" inert={!cur}>
            {mode === 'burst' && cur && <span className="fr-count">{shown}/3</span>}
            <h4 id="fr-perm-dt">{cur ? D[cur][0] : ''}</h4>
            <p>{cur ? D[cur][1] : ''}</p>
            <div className="fr-sys-btns">
              <button data-k="p-no" onClick={() => answer(false)}>허용 안 함</button>
              <button data-k="p-yes" className="strong" onClick={() => answer(true)}>허용</button>
            </div>
          </div>
        </Phone>
        <button className="btn ghost sm" data-k="launch" onClick={launch}>앱 처음 켜기</button>
      </Stage>
      <Info
        spec={[['시점', '기능을 처음 쓸 때'], ['한 번에', '권한 하나'], ['자세히', <a key="l" href="#/permission">권한 요청 가이드</a>]]}
        usage={[
          ['언제', '첫 실행 흐름 맨 끝, 사용자가 그 권한이 필요한 버튼을 처음 누른 순간 — 권한이 필요 없는 앱이면 빼요'],
          ['주의', <>‘더 나은 서비스를 위해’ 같은 문구로 한꺼번에 묻지 마세요. 묻기 전 안내, 거절 뒤 화면은 <a href="#/permission">권한 요청 가이드</a>에서 자세히 봐요</>],
        ]}
      />
    </Card>
  )
}
