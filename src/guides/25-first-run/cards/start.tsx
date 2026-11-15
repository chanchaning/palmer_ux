import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { APP, Flow, Ico, Mark, Phone, type IcoName } from '../shared'
import { FEED, q, stageOf } from '../util'

function Feed() {
  return (
    <div className="fr-feed">
      {FEED.map(([n, t], i) => (
        <div className="fr-post fr-in" key={n}><span className={'fr-av g' + (i + 1)} /><div><b>{n}</b><p>{t}</p></div></div>
      ))}
    </div>
  )
}

/* ---------- 01 스플래시 ---------- */
const SP_LOG = <>홈 화면에서 <b>{APP}</b> 아이콘을 눌러 앱을 열어 보세요</>
const APPS = ['메모', '날씨', '사진', '시계', '지도', '음악', '계산기']

export function Splash() {
  const m = useMotion()
  const timers = useTimers()
  const [mode, setMode] = useState<'fit' | 'long'>('fit')
  const [view, setView] = useState<'launcher' | 'splash' | 'home'>('launcher')
  const [log, setLog] = useState<ReactNode>(SP_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { timers.clear(); setView('launcher'); setLog(SP_LOG) }
  const open = () => {
    const ms = mode === 'fit' ? 700 : 3000
    setView('splash'); setLog(mode === 'fit' ? <>첫 화면을 준비하는 동안만 <b>로고</b>…</> : <>준비는 끝났는데 <b>로고를 일부러</b> 더 보여주는 중…</>)
    timers.set(() => {
      setView('home')
      setLog(mode === 'fit'
        ? <><b>0.7초</b> — 준비되자마자 사라져서 거의 못 느껴요</>
        : <><b>3초</b> — 매일 여는 앱이면 하루 3초씩 기다리는 셈이에요</>)
    }, m.D(ms))
  }
  const demo = useDemo({
    reset,
    async play(c) {
      const st = stageOf(dev.current)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="fit"]') ?? null); await c.sleep(300)
      await c.press(dev.current, q(dev.current, 'open')); await c.sleep(1900)
      await c.press(dev.current, q(dev.current, 'exit')); await c.sleep(500)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="long"]') ?? null); await c.sleep(300)
      await c.press(dev.current, q(dev.current, 'open')); await c.sleep(3800)
    },
  })

  return (
    <Card id="fr-splash" num="01" title="스플래시" en="Splash · Launch Screen" demo={demo}
      desc="앱을 누르고 첫 화면이 그려지기 전까지 잠깐 보이는 화면이에요. 기다림을 덮는 막이지, 보여주려고 세우는 무대가 아니에요.">
      <Stage log={log} logId="fr-splash-log">
        <Flow at={0} />
        <Seg value={mode} onChange={v => { setMode(v); reset() }} className="fr-seg" options={[['fit', '준비되면 바로'], ['long', '일부러 3초']]} />
        <Phone ref={dev}>
          <div className="scr">
            {view === 'launcher' && (
              <div className="fr-launch">
                {APPS.map((n, i) => <span key={n} className="fr-app"><i className={'g' + ((i % 4) + 1)} />{n}</span>)}
                <button className="fr-app me" data-k="open" aria-label={APP + ' 열기'} onClick={open}><i><Mark size={26} /></i>{APP}</button>
              </div>
            )}
            {view === 'splash' && <div className="fr-splash"><Mark size={64} /><b>{APP}</b></div>}
            {view === 'home' && (
              <>
                <div className="bar">{APP}<span className="sp" /><button data-k="exit" onClick={() => { setView('launcher'); setLog(SP_LOG) }}>나가기</button></div>
                <Feed />
              </>
            )}
          </div>
        </Phone>
      </Stage>
      <Info
        spec={[['길이', '준비될 때까지만'], ['내용', '로고 하나'], ['기본 제공', 'iOS · Android 모두']]}
        usage={[
          ['언제', '앱을 켤 때 첫 화면을 그릴 준비가 끝나기 전까지 — 모든 앱이 거쳐요'],
          ['주의', '일부러 늘리거나 광고·공지를 넣지 마세요. 첫 화면과 같은 배경색으로 이어지면 더 빨라 보여요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 온보딩 ---------- */
const SLIDES: { ic: IcoName; t: string; d: string }[] = [
  { ic: 'leaf', t: '하루 한 줄이면 자라요', d: '짧게 기록할 때마다 새싹이 한 뼘씩 커요.' },
  { ic: 'bell', t: '잊을 때쯤 살짝 알려줘요', d: '정한 시간에만, 하루 한 번만 알려드려요.' },
  { ic: 'users', t: '친구와 같이 키워요', d: '서로의 새싹에 물을 줄 수 있어요.' },
]
const OB_LOG = <>밀어서 넘기거나 <b>다음</b>을 눌러 보세요. <b>건너뛰기</b>는 언제든 돼요</>

export function Onboarding() {
  const [idx, setIdx] = useState(0)
  const [dx, setDx] = useState(0)
  const [drag, setDrag] = useState(false)
  const [done, setDone] = useState<null | 'skip' | 'all'>(null)
  const [log, setLog] = useState<ReactNode>(OB_LOG)
  const start = useRef<number | null>(null)
  const dev = useRef<HTMLDivElement>(null)
  const last = SLIDES.length - 1

  const reset = () => { setIdx(0); setDx(0); setDone(null); setLog(OB_LOG) }
  const go = (i: number) => { const v = Math.max(0, Math.min(last, i)); setIdx(v); setLog(<><b>{v + 1}/{SLIDES.length}</b> · {SLIDES[v].t}</>) }
  const finish = (how: 'skip' | 'all') => {
    setDone(how)
    setLog(how === 'skip' ? <><b>건너뛰기</b> → {idx + 1}장만 보고 바로 홈. 막지 않아요</> : <>{SLIDES.length}장을 다 보고 <b>시작하기</b></>)
  }
  const down = (e: PointerEvent<HTMLDivElement>) => { start.current = e.clientX; setDrag(true); e.currentTarget.setPointerCapture(e.pointerId) }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return
    let d = e.clientX - start.current
    if ((idx === 0 && d > 0) || (idx === last && d < 0)) d /= 3
    setDx(d)
  }
  const up = () => {
    if (start.current === null) return
    start.current = null; setDrag(false)
    if (dx < -40) go(idx + 1); else if (dx > 40) go(idx - 1)
    setDx(0)
  }
  const demo = useDemo({
    reset,
    async play(c) {
      await c.press(dev.current, q(dev.current, 'next')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, 'next')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, 'next')); await c.sleep(1400)
    },
  })

  return (
    <Card id="fr-onboard" num="02" title="온보딩" en="Onboarding Carousel" demo={demo}
      desc="처음 온 사람에게 이 앱이 무엇을 해주는지 몇 장으로 보여줘요. 점으로 남은 장 수를 알리고, 건너뛰기는 첫 장부터 둬요.">
      <Stage log={log} logId="fr-onboard-log">
        <Flow at={1} />
        <Phone ref={dev}>
          <div className="scr">
            {done ? (
              <>
                <div className="bar">{APP}<span className="sp" /><button onClick={reset}>처음부터</button></div>
                <Feed />
              </>
            ) : (
              <div className="fr-ob">
                <div className="fr-ob-top"><button className="fr-link" data-k="skip" onClick={() => finish('skip')}>건너뛰기</button></div>
                <div className="fr-ob-view" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                  <div className={'fr-ob-track' + (drag ? ' drag' : '')} style={{ transform: `translateX(calc(${-idx * 100}% + ${dx}px))` }}>
                    {SLIDES.map((s, i) => (
                      <div className="fr-ob-slide" key={s.t} aria-hidden={i !== idx}>
                        <div className="fr-big"><Ico n={s.ic} size={40} /></div>
                        <h3>{s.t}</h3>
                        <p>{s.d}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="fr-dots">
                  {SLIDES.map((s, i) => <button key={s.t} aria-label={`${i + 1}번째 화면`} aria-current={i === idx ? 'step' : undefined} className={i === idx ? 'on' : ''} onClick={() => go(i)} />)}
                </div>
                <button className="btn fr-wide" data-k="next" onClick={() => idx === last ? finish('all') : go(idx + 1)}>{idx === last ? '시작하기' : '다음'}</button>
              </div>
            )}
          </div>
        </Phone>
      </Stage>
      <Info
        spec={[['장수', '3장 이하'], ['건너뛰기', '첫 장부터'], ['내용', '기능보다 혜택']]}
        usage={[
          ['언제', '앱의 쓸모가 한눈에 안 보이거나, 쓰는 방식이 낯선 앱일 때 — 빼도 되는 단계예요'],
          ['주의', '기능 설명서가 되면 아무도 안 읽어요. 혜택 한 줄씩만, 마지막엔 바로 쓸 수 있는 버튼으로'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 간편 로그인 ---------- */
type LView = 'main' | 'sheet' | 'loading' | 'email' | 'phone' | 'done' | 'browse'
const LG_LOG = <>원하는 방법을 골라 <b>로그인</b>해 보세요</>

export function QuickLogin() {
  const m = useMotion()
  const timers = useTimers()
  const [view, setView] = useState<LView>('main')
  const [prov, setProv] = useState('A')
  const [method, setMethod] = useState('')
  const [lastUsed, setLastUsed] = useState<string | null>(null)
  const [val, setVal] = useState('')
  const [log, setLog] = useState<ReactNode>(LG_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { timers.clear(); setView('main'); setLastUsed(null); setVal(''); setLog(LG_LOG) }
  const login = (how: string) => {
    setView('loading'); setMethod(how)
    timers.set(() => { setView('done'); setLog(<><b>{how}</b>로 가입 끝 — 비밀번호를 만들 필요가 없었어요</>) }, m.D(1000))
  }
  const sso = (p: string) => { setProv(p); setView('sheet'); setLog(<>간편 로그인 {p} 쪽 확인 창 — <b>무엇을 공유하는지</b> 보여줘요</>) }
  const valid = view === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val) : /^01\d-?\d{3,4}-?\d{4}$/.test(val)
  const demo = useDemo({
    reset,
    async play(c) {
      await c.press(dev.current, q(dev.current, 'sso-A')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, 'ok')); await c.sleep(2000)
      await c.press(dev.current, q(dev.current, 'logout')); await c.sleep(1600)
    },
  })

  const ssoBtn = (p: string) => (
    <button className="fr-sso" key={p} data-k={'sso-' + p} onClick={() => sso(p)}>
      <span className="fr-sso-ic">{p}</span>간편 로그인 {p}로 계속하기
      {lastUsed === '간편 로그인 ' + p && <em className="fr-recent">최근 사용</em>}
    </button>
  )

  return (
    <Card id="fr-login" num="03" title="간편 로그인" en="Quick · Social Login" demo={demo}
      desc="이미 쓰는 다른 계정이나 이메일·전화번호로 한 번에 가입해요. 비밀번호 만들기를 건너뛰니 첫 관문이 낮아져요.">
      <Stage log={log} logId="fr-login-log">
        <Flow at={2} />
        <Phone ref={dev}>
          <div className="scr">
            {(view === 'main' || view === 'sheet' || view === 'loading') && (
              <div className="fr-login">
                <div className="fr-login-hero"><Mark size={52} /><b>{APP}</b><p>하루 한 줄로 키우는 습관</p></div>
                {ssoBtn('A')}
                {ssoBtn('B')}
                <div className="fr-or"><span>또는</span></div>
                <div className="fr-row2">
                  <button className="btn ghost sm" data-k="email" onClick={() => { setVal(''); setView('email'); setLog(<>이메일은 <b>인증 메일</b>로 확인해요</>) }}><Ico n="mail" size={15} />이메일{lastUsed === '이메일' && <em className="fr-recent">최근</em>}</button>
                  <button className="btn ghost sm" data-k="phone" onClick={() => { setVal(''); setView('phone'); setLog(<>전화번호는 <b>문자 인증번호</b>로 확인해요</>) }}><Ico n="phone" size={15} />전화번호{lastUsed === '전화번호' && <em className="fr-recent">최근</em>}</button>
                </div>
                <button className="fr-link" data-k="browse" onClick={() => { setView('browse'); setLog(<><b>로그인은 나중에</b> — 저장하려는 순간에 권해요</>) }}>먼저 둘러볼게요</button>
              </div>
            )}
            {(view === 'email' || view === 'phone') && (
              <>
                <div className="bar"><button className="back" aria-label="뒤로" onClick={() => setView('main')}>‹</button>{view === 'email' ? '이메일로 계속하기' : '전화번호로 계속하기'}</div>
                <div className="fr-form fr-in">
                  <label>{view === 'email' ? '이메일 주소' : '휴대폰 번호'}
                    <input type={view === 'email' ? 'email' : 'tel'} inputMode={view === 'email' ? 'email' : 'numeric'} autoComplete={view === 'email' ? 'email' : 'tel'}
                      placeholder={view === 'email' ? 'name@example.com' : '010-0000-0000'} value={val} onChange={e => setVal(e.target.value)} />
                  </label>
                  <small className={val && !valid ? 'bad' : ''}>{val && !valid ? (view === 'email' ? '이메일 모양을 확인해 주세요' : '숫자 10–11자리를 넣어 주세요') : '가입과 로그인이 한 번에 돼요'}</small>
                  <button className="btn fr-wide" disabled={!valid} onClick={() => login(view === 'email' ? '이메일' : '전화번호')}>{view === 'email' ? '인증 메일 보내기' : '인증번호 받기'}</button>
                </div>
              </>
            )}
            {(view === 'done' || view === 'browse') && (
              <>
                <div className="bar">{APP}<span className="sp" />{view === 'done'
                  ? <button data-k="logout" onClick={() => { setLastUsed(method); setView('main'); setLog(<>다시 오면 <b>‘최근 사용’</b> 표시 — 다른 방법으로 또 가입해 계정이 둘로 갈라지는 걸 막아요</>) }}>로그아웃</button>
                  : <button onClick={() => setView('main')}>로그인</button>}</div>
                <div className="fr-hello fr-in">{view === 'done' ? <><b>반가워요!</b><span>{method}로 로그인했어요</span></> : <><b>둘러보는 중</b><span>기록을 남기려면 로그인이 필요해요</span></>}</div>
                <Feed />
              </>
            )}
          </div>
          <div className={'scrim' + (view === 'sheet' ? ' on' : '')} onClick={() => setView('main')} />
          <div className={'sheet' + (view === 'sheet' ? ' on' : '')} inert={view !== 'sheet'} role="dialog" aria-label={'간편 로그인 ' + prov}>
            <div className="fr-sheet">
              <span className="fr-sso-ic lg">{prov}</span>
              <b>간편 로그인 {prov}로 계속할까요?</b>
              <p>‘{APP}’에 이름과 이메일 주소를 알려줘요.</p>
              <button className="btn sm" data-k="ok" onClick={() => login('간편 로그인 ' + prov)}>계속하기</button>
              <button className="fr-link" onClick={() => { setView('main'); setLog(LG_LOG) }}>취소</button>
            </div>
          </div>
          {view === 'loading' && <div className="fr-cover"><div className="spinner" /></div>}
        </Phone>
      </Stage>
      <Info
        spec={[['버튼', '간편 2–3개 + 이메일'], ['둘러보기', '로그인 미루기'], ['재방문', '최근 사용 표시']]}
        usage={[
          ['언제', '가입 단계를 줄이고 싶을 때 — 이름·이메일 칸과 비밀번호 만들기를 한 번에 건너뛰어요'],
          ['주의', '첫 화면부터 로그인을 강요하지 마세요. 둘러보기를 열어 두고, 저장하거나 글을 쓰려는 순간에 권해도 늦지 않아요'],
        ]}
      />
    </Card>
  )
}
