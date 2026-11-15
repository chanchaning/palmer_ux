import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { APP, Ico, MiniMap, OsSeg, Phone, SysDialog, type OS } from '../shared'
import { q, stageOf } from '../util'

/* ---------- 04 미리 안내 ---------- */
type PMode = 'direct' | 'prime'
const P_LOG = <>방식을 고르고 <b>{APP}</b> 앱 아이콘을 눌러 보세요</>
const LAUNCH = ['메모', '날씨', '사진', '시계', '지도', '음악', '계산기']

export function Prime() {
  const m = useMotion()
  const timers = useTimers()
  const [mode, setMode] = useState<PMode>('prime')
  const [view, setView] = useState<'launcher' | 'prime' | 'home'>('launcher')
  const [dlg, setDlg] = useState(false)
  const [chance, setChance] = useState(1)
  const [result, setResult] = useState<'on' | 'off' | null>(null)
  const [log, setLog] = useState<ReactNode>(P_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { timers.clear(); setView('launcher'); setDlg(false); setChance(1); setResult(null); setLog(P_LOG) }
  const open = () => {
    if (mode === 'direct') {
      setView('home')
      timers.set(() => { setDlg(true); setLog(<>켜자마자 <b>시스템 창</b> — 무엇 때문인지 아직 몰라요</>) }, m.D(450))
    } else {
      setView('prime'); setLog(<>시스템 창 전에 <b>앱이 만든 안내 화면</b>으로 이유부터 말해요</>)
    }
  }
  const answer = (allow: boolean) => {
    setDlg(false); setChance(0); setResult(allow ? 'on' : 'off'); setView('home')
    setLog(allow
      ? <><b>허용</b> — 이유를 알고 고른 허용이라 나중에 끄는 일도 적어요</>
      : <><b>거절</b> → 시스템 창 기회를 다 썼어요. 이제는 설정에서만 켤 수 있어요</>)
  }
  const demo = useDemo({
    reset,
    async play(c) {
      const st = stageOf(dev.current)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="direct"]') ?? null); await c.sleep(500)
      await c.press(dev.current, q(dev.current, 'open')); await c.sleep(1400)
      await c.press(dev.current, q(dev.current, 'p-no')); await c.sleep(1800)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="prime"]') ?? null); await c.sleep(500)
      await c.press(dev.current, q(dev.current, 'open')); await c.sleep(1500)
      await c.press(dev.current, q(dev.current, 'later')); await c.sleep(1800)
      await c.press(dev.current, q(dev.current, 'ask2')); await c.sleep(1000)
      await c.press(dev.current, q(dev.current, 'yes')); await c.sleep(1000)
      await c.press(dev.current, q(dev.current, 'p-yes')); await c.sleep(1500)
    },
  })

  return (
    <Card id="pm-prime" num="04" title="미리 안내" en="Pre-permission Priming" demo={demo}
      desc="시스템 창을 띄우기 전에 앱이 직접 만든 화면으로 이유를 먼저 말해요. 여기서 ‘나중에’를 고르면 귀한 시스템 창 기회를 아낄 수 있어요.">
      <Stage log={log} logId="pm-prime-log">
        <Seg value={mode} onChange={v => { setMode(v); reset() }} className="pm-seg" options={[['direct', '바로 묻기'], ['prime', '미리 안내 후 묻기']]} />
        <Phone ref={dev}>
          <div className="scr">
            {view === 'launcher' && (
              <div className="pm-launch">
                {LAUNCH.map((n, i) => <span key={n} className="pm-app"><i className={'g' + ((i % 4) + 1)} />{n}</span>)}
                <button className="pm-app me" data-k="open" aria-label={APP + ' 열기'} onClick={open}><i>모</i>{APP}</button>
              </div>
            )}
            {view === 'prime' && (
              <div className="pm-prime">
                <div className="pm-big"><Ico n="bell" size={34} /></div>
                <h3>빵이 나오면 바로 알려드릴게요</h3>
                <ul>
                  <li><Ico n="check" size={15} />주문한 빵이 다 구워지면</li>
                  <li><Ico n="check" size={15} />단골 가게에 새 빵이 나오면</li>
                  <li className="no"><Ico n="x" size={15} />광고 알림은 보내지 않아요</li>
                </ul>
                <button className="btn pm-wide" data-k="yes" onClick={() => { setDlg(true); setLog(<>‘알림 받기’를 누른 사람에게만 <b>시스템 창</b>을 보여줘요</>) }}>알림 받기</button>
                <button className="pm-link" data-k="later" onClick={() => { setView('home'); setLog(<>‘나중에’는 앱이 만든 버튼 — <b>시스템 창 기회가 그대로</b> 남아요</>) }}>나중에 할게요</button>
              </div>
            )}
            {view === 'home' && (
              <>
                <div className="bar">{APP}</div>
                <div className="pm-body">
                  <div className="pm-sub">오늘 구운 빵</div>
                  <div className="pm-order"><span className="pm-thumb g1" /><div><b>소금빵</b><span className="sub">물결동 빵집 · 2,500원</span></div></div>
                  <div className="pm-order"><span className="pm-thumb g4" /><div><b>무화과 깜파뉴</b><span className="sub">바람동 빵집 · 6,800원</span></div></div>
                  {result === null && chance > 0 && !dlg && (
                    <div className="pm-box">
                      <p>주문하면 다 구워졌을 때 알려드릴 수 있어요.</p>
                      <button className="btn ghost sm" data-k="ask2" onClick={() => { setView('prime'); setLog(<>주문 같은 <b>좋은 순간</b>에 안내 화면을 다시 보여줘요</>) }}>알림 켜기</button>
                    </div>
                  )}
                  {result && <div className="pm-box"><p>알림 {result === 'on' ? '켜짐' : '꺼짐'}</p></div>}
                </div>
              </>
            )}
          </div>
          <SysDialog os="ios" open={dlg} id="pm-prime-dt"
            title={`‘${APP}’에서 알림을 보내려고 해요`} body="알림에는 메시지, 소리, 아이콘 배지가 포함될 수 있어요."
            btns={[{ k: 'p-no', label: '허용 안 함', on: () => answer(false) }, { k: 'p-yes', label: '허용', on: () => answer(true), strong: true }]} />
        </Phone>
        <div className="pm-meter" aria-label={'시스템 창 기회 ' + chance + '번 남음'}>
          시스템 창 기회 <span className={'pm-pip' + (chance > 0 ? ' on' : '')} /> <b>{chance}번 남음</b>
          <button className="btn ghost sm" onClick={reset}>처음으로</button>
        </div>
      </Stage>
      <Info
        spec={[['순서', '앱 안내 → 시스템 창'], ['나중에', '기회를 아껴요'], ['안내 화면', '혜택 2–3줄']]}
        usage={[
          ['언제', '거절당하면 핵심 기능이 크게 줄어드는 권한 — 알림, 위치, 사진'],
          ['주의', '안내 화면에서 ‘다음’ 하나만 두고 무조건 시스템 창으로 보내면 의미가 없어요. ‘나중에’를 꼭 함께 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 시스템 모달 ---------- */
type Part = 'app' | 'title' | 'purpose' | 'btns'
const PARTS: [Part, string, 'OS' | '앱'][] = [['app', '앱 이름', 'OS'], ['title', '제목', 'OS'], ['purpose', '목적 문구', '앱'], ['btns', '버튼', 'OS']]
const DEF_PURPOSE = '가까운 산책로를 찾는 데 써요.'
const S_LOG = <>아래 칩에 올리면 <b>누가 쓴 부분</b>인지 보여요</>

export function SystemPrompt() {
  const [os, setOs] = useState<OS>('ios')
  const [hl, setHl] = useState<Part | null>(null)
  const [purpose, setPurpose] = useState(DEF_PURPOSE)
  const [open, setOpen] = useState(true)
  const [answered, setAnswered] = useState<string | null>(null)
  const [denials, setDenials] = useState(0)
  const [nudge, setNudge] = useState(0)
  const [log, setLog] = useState<ReactNode>(S_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { setHl(null); setPurpose(DEF_PURPOSE); setOpen(true); setAnswered(null); setDenials(0); setLog(S_LOG) }
  const answer = (label: string, deny: boolean) => {
    setOpen(false); setAnswered(label)
    if (deny) setDenials(d => d + 1)
    setLog(<><b>{label}</b> — 이 답은 OS가 기억해요. ‘다시 요청하기’를 눌러 보세요</>)
  }
  const again = () => {
    if (answered && !answered.startsWith('허용 안')) { setLog(<>이미 허용 — OS가 <b>창 없이 바로 허락</b>을 돌려줘요</>); return }
    if (os === 'and' && denials < 2) { setOpen(true); setLog(<>Android는 거절을 <b>한 번 더</b> 물을 수 있어요 — 두 번째 거절부터 안 떠요</>); return }
    setLog(<>요청해도 <b>창이 안 떠요</b>. OS가 지난 답 ‘{answered}’만 조용히 돌려줘요</>)
  }
  const demo = useDemo({
    reset,
    async play(c) {
      const st = stageOf(dev.current)
      await c.press(st, q(st, 'part-purpose')); await c.sleep(600)
      const text = '산책로를 찾을 때만 위치를 써요.'
      setPurpose('')
      for (let i = 1; i <= text.length; i++) { setPurpose(text.slice(0, i)); await c.sleep(55) }
      await c.sleep(600)
      await c.press(st, q(st, 'title')); await c.sleep(1300)
      setHl(null)
      await c.press(dev.current, q(dev.current, 's-no')); await c.sleep(1300)
      await c.press(st, q(st, 'again')); await c.sleep(1800)
    },
  })

  const isOs = (p: Part) => p !== 'purpose'
  const btns = os === 'ios'
    ? [['s-once', '한 번만 허용'], ['s-while', '앱 사용 중에만 허용'], ['s-no', '허용 안 함']]
    : [['s-while', '앱 사용 중에만 허용'], ['s-once', '이번만 허용'], ['s-no', '허용 안함']]

  return (
    <Card id="pm-system" num="05" title="시스템 모달" en="System Permission Prompt" demo={demo}
      desc="허용 창은 앱이 아니라 OS가 그려요. 제목과 버튼은 못 바꾸고, 앱이 쓸 수 있는 건 ‘왜 쓰는지’ 한 줄뿐이에요. 띄울 수 있는 횟수도 정해져 있어요.">
      <Stage log={log} logId="pm-system-log">
        <OsSeg os={os} onChange={o => { setOs(o); reset() }} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">근처 산책로</div>
            <MiniMap mode={answered && !answered.startsWith('허용 안') ? 'precise' : 'none'} h={180} />
            <div className="pm-body"><p className="pm-p">{answered ? '답: ' + answered : '위치를 묻는 중…'}</p></div>
          </div>
          <div className={'pm-scrim' + (open ? ' on' : '')} />
          <div className={'pm-sys ' + os + (open ? ' on' : '')} role="alertdialog" aria-modal="true" aria-labelledby="pm-system-dt" inert={!open} data-hl={hl ?? undefined}>
            {os === 'and' && <div className="pm-sys-ic"><Ico n="pin" size={22} /></div>}
            <h4 id="pm-system-dt">
              <span data-part="app">{os === 'ios' ? `‘${APP}’` : APP}</span>
              <span data-part="title" key={nudge} className={nudge ? 'pm-shake' : undefined}>{os === 'ios' ? '이 위치를 사용하도록 허용할까요?' : '에서 이 기기의 위치에 액세스하도록 허용할까요?'}</span>
            </h4>
            {os === 'ios' && <p data-part="purpose">{purpose || <em className="pm-empty">(문구 없음 — 이대로면 앱이 멈춰요)</em>}</p>}
            <div className="pm-sys-btns stack" data-part="btns">
              {btns.map(([k, l]) => <button type="button" key={k} data-k={k} onClick={() => answer(l, k === 's-no')}>{l}</button>)}
            </div>
          </div>
        </Phone>
        <div className="pm-parts">
          {PARTS.map(([p, label, who]) => (
            <button key={p} type="button" className="chip" data-k={'part-' + p} aria-pressed={hl === p}
              onPointerEnter={e => { if (e.pointerType === 'mouse') setHl(p) }}
              onPointerLeave={e => { if (e.pointerType === 'mouse') setHl(null) }}
              onFocus={() => setHl(p)} onBlur={() => setHl(null)}
              onClick={() => { setHl(p); setLog(isOs(p) ? <><b>{label}</b> — OS가 정해요. 앱은 못 바꿔요</> : os === 'ios' ? <><b>{label}</b> — 앱이 쓰는 유일한 자리예요</> : <>Android 창에는 <b>앱 문구가 안 들어가요</b> — 이유는 앱 화면에서 먼저 말해요</>) }}>
              {label}<small className={'pm-who' + (who === '앱' ? ' mine' : '')}>{who}</small>
            </button>
          ))}
        </div>
        <label className="pm-field">
          <span>목적 문구 고쳐 보기 {os === 'and' && '(Android 창에는 안 나와요)'}</span>
          <input value={purpose} maxLength={48} disabled={os === 'and'} onChange={e => { setPurpose(e.target.value); setHl('purpose') }} onBlur={() => setHl(null)} />
        </label>
        <div className="pm-chips mid">
          <button className="btn ghost sm" data-k="title" onClick={() => { setNudge(n => n + 1); setHl('title'); setLog(<>제목·버튼은 <b>OS 몫</b>이라 바꿀 수 없어요 — 앱마다 같아야 믿을 수 있거든요</>) }}><Ico n="lock" size={14} />제목 바꾸기</button>
          {answered && <button className="btn sm" data-k="again" onClick={again}>다시 요청하기</button>}
        </div>
      </Stage>
      <Info
        spec={[['앱이 쓰는 곳', '목적 문구 한 줄'], ['횟수', 'iOS 1번 · Android 2번'], ['꾸미기', '불가']]}
        usage={[
          ['언제', '앱이 처음으로 그 권한이 필요한 기능을 실행할 때 — 코드에서 요청하면 OS가 띄워요'],
          ['주의', '목적 문구는 ‘서비스 이용을 위해’처럼 뭉뚱그리지 말고 무엇에 쓰는지 구체적으로 쓰세요. iOS는 이 문구가 없으면 창 대신 앱을 멈춰요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 설정으로 보내기 ---------- */
type SView = 'app' | 'root' | 'appset' | 'loc'
type Loc = 'never' | 'ask' | 'while'
const LOC_LABEL: Record<Loc, string> = { never: '안 함', ask: '다음번에 묻기', while: '앱을 사용하는 동안' }
const SET_LOG = <>거절한 뒤예요. <b>설정 열기</b>로 다시 켜 보세요</>

export function SendToSettings() {
  const [link, setLink] = useState<'app' | 'root'>('app')
  const [view, setView] = useState<SView>('app')
  const [loc, setLoc] = useState<Loc>('never')
  const [cam, setCam] = useState(false)
  const [noti, setNoti] = useState(true)
  const [ret, setRet] = useState(0)
  const [log, setLog] = useState<ReactNode>(SET_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { setView('app'); setLoc('never'); setCam(false); setNoti(true); setRet(0); setLog(SET_LOG) }
  const open = () => {
    if (link === 'app') { setView('appset'); setLog(<>앱 설정 화면으로 <b>바로</b> — 위치 한 줄만 바꾸면 돼요</>) }
    else { setView('root'); setLog(<>설정 첫 화면이에요. <b>{APP}</b>을 직접 찾아야 해요 — 여기서 많이 포기해요</>) }
  }
  const back = () => {
    setView('app'); setRet(r => r + 1)
    if (loc === 'while') setLog(<>돌아오자마자 <b>권한을 다시 확인</b> → 새로고침 없이 지도가 떠요</>)
    else if (loc === 'ask') setLog(<>‘다음번에 묻기’ → 이제 앱이 <b>시스템 창을 다시</b> 띄울 수 있어요</>)
    else setLog(<>아직 꺼져 있어요 — 화면은 그대로, 다른 길을 계속 보여줘요</>)
  }
  const demo = useDemo({
    reset,
    async play(c) {
      await c.press(dev.current, q(dev.current, 'open')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, 's-loc')); await c.sleep(900)
      await c.press(dev.current, q(dev.current, 'r-while')); await c.sleep(900)
      await c.press(dev.current, q(dev.current, 'ret')); await c.sleep(2000)
    },
  })

  const crumb = <button className="pm-crumb" data-k="ret" onClick={back}>◀ {APP}</button>
  return (
    <Card id="pm-settings" num="06" title="설정으로 보내기" en="Send to Settings" demo={demo}
      desc="시스템 창을 더는 띄울 수 없을 때 쓰는 마지막 길이에요. 앱 설정 화면으로 바로 보내고, 돌아오면 권한을 다시 확인해요.">
      <Stage log={log} logId="pm-settings-log">
        <Seg value={link} onChange={v => { setLink(v); reset() }} className="pm-seg" options={[['app', '앱 설정으로 바로'], ['root', '설정 첫 화면으로']]} />
        <Phone ref={dev}>
          {view === 'app' && (
            <div className="scr pm-in" key={'a' + ret}>
              <div className="bar">근처 산책로</div>
              {loc === 'while' ? (
                <>
                  <MiniMap mode="precise" h={200} />
                  <div className="pm-body"><p className="pm-p">가까운 산책로 3곳을 찾았어요.</p></div>
                </>
              ) : (
                <>
                  <MiniMap mode="none" h={150} />
                  <div className="pm-body">
                    <div className="pm-box">
                      <b className="pm-box-t"><Ico n="lock" size={15} />위치 권한이 꺼져 있어요</b>
                      <p>설정 › {APP} › 위치에서 ‘앱을 사용하는 동안’을 골라 주세요.</p>
                      <button className="btn sm" data-k="open" onClick={open}>설정 열기</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {view === 'root' && (
            <div className="scr pm-set pm-in">
              {crumb}
              <div className="bar">설정</div>
              <div className="pm-set-list">
                {['Wi-Fi', '블루투스', '알림', '개인정보 보호'].map(n => <div className="pm-set-row" key={n}><span className="pm-set-ic"><Ico n="gear" size={13} /></span>{n}<Ico n="chev" size={14} /></div>)}
                <div className="pm-set-gap" />
                {['가나 메모', APP, '바다 날씨', '하늘 사진'].map(n => n === APP
                  ? <button className="pm-set-row" key={n} data-k="s-app" onClick={() => { setView('appset'); setLog(<>찾았어요. 이제 <b>위치</b>로 들어가요</>) }}><span className="pm-set-ic me">모</span>{n}<Ico n="chev" size={14} /></button>
                  : <div className="pm-set-row" key={n}><span className="pm-set-ic g2" />{n}<Ico n="chev" size={14} /></div>)}
              </div>
            </div>
          )}
          {view === 'appset' && (
            <div className="scr pm-set pm-in">
              {crumb}
              <div className="bar">{link === 'root' && <button className="back" aria-label="뒤로" onClick={() => setView('root')}>‹</button>}{APP}</div>
              <div className="pm-set-list">
                <button className="pm-set-row" data-k="s-loc" onClick={() => setView('loc')}><span className="pm-set-ic"><Ico n="pin" size={13} /></span>위치<em>{LOC_LABEL[loc]}</em><Ico n="chev" size={14} /></button>
                <div className="pm-set-row"><span className="pm-set-ic"><Ico n="cam" size={13} /></span>카메라<button className="switch" role="switch" aria-checked={cam} aria-label="카메라" onClick={() => setCam(v => !v)} /></div>
                <div className="pm-set-row"><span className="pm-set-ic"><Ico n="bell" size={13} /></span>알림<button className="switch" role="switch" aria-checked={noti} aria-label="알림" onClick={() => setNoti(v => !v)} /></div>
              </div>
            </div>
          )}
          {view === 'loc' && (
            <div className="scr pm-set pm-in">
              {crumb}
              <div className="bar"><button className="back" aria-label="뒤로" onClick={() => setView('appset')}>‹</button>위치</div>
              <div className="pm-set-list" role="radiogroup" aria-label="위치 접근 허용">
                {(Object.keys(LOC_LABEL) as Loc[]).map(k => (
                  <button key={k} className="pm-set-row" role="radio" aria-checked={loc === k} data-k={'r-' + k}
                    onClick={() => { setLoc(k); setLog(<><b>{LOC_LABEL[k]}</b> — 왼쪽 위 ‘◀ {APP}’으로 돌아가요</>) }}>
                    {LOC_LABEL[k]}{loc === k && <span className="pm-tick"><Ico n="check" size={16} /></span>}
                  </button>
                ))}
              </div>
              <p className="pm-set-foot">앱 설명: 가까운 산책로를 찾는 데 써요.</p>
            </div>
          )}
        </Phone>
      </Stage>
      <Info
        spec={[['때', '다시 못 물을 때'], ['링크', '앱 설정 화면 바로'], ['돌아오면', '권한 다시 확인']]}
        usage={[
          ['언제', '이미 거절해서 시스템 창을 더 띄울 수 없는데, 사용자가 그 기능을 쓰려고 할 때'],
          ['주의', '‘설정에서 켜 주세요’만 쓰지 말고 어디서 무엇을 고를지 경로를 적어 주세요. 돌아왔을 때 다시 확인하지 않으면 켜고 와도 화면이 그대로예요'],
        ]}
      />
    </Card>
  )
}
