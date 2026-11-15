import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { APP, Ico, MiniMap, OsSeg, Phone, SysDialog, type OS } from '../shared'
import { q } from '../util'

/* ---------- 01 알림 권한 ---------- */
const N_LOG = <>‘알림 받기’를 눌러 <b>시스템 창</b>을 띄워 보세요</>

export function Notify() {
  const m = useMotion()
  const timers = useTimers()
  const [os, setOs] = useState<OS>('ios')
  const [st, setSt] = useState<'idle' | 'on' | 'off'>('idle')
  const [dlg, setDlg] = useState(false)
  const [noti, setNoti] = useState(false)
  const [log, setLog] = useState<ReactNode>(N_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { timers.clear(); setNoti(false); setDlg(false); setSt('idle'); setLog(N_LOG) }
  const showNoti = (delay: number) => {
    timers.clear(); setNoti(false)
    timers.set(() => { setNoti(true); timers.set(() => setNoti(false), m.D(2600)) }, m.D(delay))
  }
  const answer = (allow: boolean) => {
    setDlg(false)
    if (allow) { setSt('on'); setLog(<><b>허용</b> → 빵이 나오면 화면 위에 알림이 내려와요</>); showNoti(900) }
    else { setSt('off'); setLog(<><b>허용 안 함</b> → 알림 대신 앱 안에서 준비 상황을 계속 보여줘요</>) }
  }
  const demo = useDemo({
    reset,
    async play(c) {
      await c.press(dev.current, q(dev.current, 'ask')); await c.sleep(1200)
      await c.press(dev.current, q(dev.current, 'n-yes')); await c.sleep(3400)
    },
  })

  const btns = os === 'ios'
    ? [{ k: 'n-no', label: '허용 안 함', on: () => answer(false) }, { k: 'n-yes', label: '허용', on: () => answer(true), strong: true }]
    : [{ k: 'n-yes', label: '허용', on: () => answer(true) }, { k: 'n-no', label: '허용 안함', on: () => answer(false) }]

  return (
    <Card id="pm-notify" num="01" title="알림 권한" en="Notification Permission" demo={demo}
      desc="앱이 화면 밖에서 말을 걸어도 되는지 묻는 창이에요. 받고 싶은 소식이 생긴 순간에 물어야 허용이 나와요.">
      <Stage log={log} logId="pm-notify-log">
        <OsSeg os={os} onChange={o => { setOs(o); reset() }} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">{APP}<span className="sp" /><span className={'pm-bell' + (st === 'on' ? ' on' : '')} role="img" aria-label={st === 'on' ? '알림 켜짐' : '알림 꺼짐'}><Ico n="bell" size={18} /></span></div>
            <div className="pm-body">
              <div className="pm-sub">주문 현황</div>
              <div className="pm-order">
                <span className="pm-thumb g1" />
                <div><b>소금빵 2개</b><span className="sub">물결동 빵집 · 굽는 중 (약 15분)</span></div>
              </div>
              <div className="pm-prog"><i /></div>
              {st === 'idle' && (
                <div className="pm-box">
                  <p>빵이 나오면 바로 알려드릴까요?</p>
                  <button className="btn sm" data-k="ask" onClick={() => { setDlg(true); setLog(<>주문 직후, <b>이유가 분명한 순간</b>에 묻는 게 좋아요</>) }}>알림 받기</button>
                </div>
              )}
              {st === 'on' && (
                <div className="pm-box ok">
                  <p>알림이 켜졌어요. 다 구워지면 알려드릴게요.</p>
                  <button className="btn ghost sm" onClick={() => { showNoti(150); setLog(<>알림은 <b>앱 이름 · 내용 · 시간</b>만 짧게</>) }}>테스트 알림 보내기</button>
                </div>
              )}
              {st === 'off' && (
                <div className="pm-box">
                  <p>알림이 꺼져 있어요. 이 화면에서 준비 상황을 계속 보여드릴게요.</p>
                </div>
              )}
            </div>
          </div>
          {noti && (
            <div className="pm-noti">
              <span className="pm-noti-ic"><Ico n="bell" size={14} /></span>
              <div><b>{APP}</b><span>주문하신 소금빵이 나왔어요!</span></div>
              <small>지금</small>
            </div>
          )}
          <SysDialog os={os} open={dlg} id="pm-notify-dt" icon="bell" btns={btns}
            title={os === 'ios' ? `‘${APP}’에서 알림을 보내려고 해요` : `${APP}에서 알림을 보내도록 허용할까요?`}
            body={os === 'ios' ? '알림에는 메시지, 소리, 아이콘 배지가 포함될 수 있어요. 설정에서 바꿀 수 있어요.' : undefined} />
        </Phone>
      </Stage>
      <Info
        spec={[['창 주인', '운영체제(OS)'], ['기회', '보통 한 번'], ['Android', '13부터 물어봐요']]}
        usage={[
          ['언제', '주문 준비, 답장 도착처럼 사용자가 ‘알려주면 좋겠다’ 싶은 소식이 생긴 순간'],
          ['주의', '앱을 켜자마자 묻지 마세요. 무엇을 알려줄지 모르면 대부분 거절하고, 그 기회는 돌아오지 않아요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 위치 권한 ---------- */
type Grant = 'while' | 'once' | 'deny' | null
const L_LOG = <>‘내 위치 찾기’를 누르고 <b>세 가지 선택지</b>를 골라 보세요</>

export function Location() {
  const [os, setOs] = useState<OS>('ios')
  const [dlg, setDlg] = useState(false)
  const [precise, setPrecise] = useState(true)
  const [grant, setGrant] = useState<Grant>(null)
  const [gotPrecise, setGotPrecise] = useState(true)
  const [log, setLog] = useState<ReactNode>(L_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { setDlg(false); setPrecise(true); setGrant(null); setLog(L_LOG) }
  const answer = (g: Exclude<Grant, null>) => {
    setDlg(false); setGrant(g); setGotPrecise(precise)
    const acc = precise ? '정확한 위치' : '대략적인 위치'
    if (g === 'while') setLog(<><b>앱 사용 중에만</b> · {acc} → 앱을 켜 둔 동안만 위치를 받아요</>)
    if (g === 'once') setLog(<><b>한 번만</b> · {acc} → 앱을 닫으면 허용이 사라져요</>)
    if (g === 'deny') setLog(<><b>허용 안 함</b> → 지도 대신 동네를 직접 고르게 해 주세요</>)
  }
  const demo = useDemo({
    reset,
    async play(c) {
      await c.press(dev.current, q(dev.current, 'ask')); await c.sleep(1000)
      await c.press(dev.current, q(dev.current, os === 'ios' ? 'prec' : 'prec-off')); await c.sleep(900)
      await c.press(dev.current, q(dev.current, 'l-while')); await c.sleep(2200)
    },
  })

  const W = { k: 'l-while', label: '앱 사용 중에만 허용', on: () => answer('while') }
  const O = { k: 'l-once', label: os === 'ios' ? '한 번만 허용' : '이번만 허용', on: () => answer('once') }
  const N = { k: 'l-no', label: os === 'ios' ? '허용 안 함' : '허용 안함', on: () => answer('deny') }
  const mode = grant === 'while' || grant === 'once' ? (gotPrecise ? 'precise' : 'approx') : 'none'

  return (
    <Card id="pm-location" num="02" title="위치 권한" en="Location Permission" demo={demo}
      desc="위치는 ‘얼마나 오래’와 ‘얼마나 정확히’를 따로 골라요. 앱 사용 중에만, 한 번만, 허용 안 함에 정확도 스위치가 붙어요.">
      <Stage log={log} logId="pm-location-log">
        <OsSeg os={os} onChange={o => { setOs(o); reset() }} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">근처 산책로</div>
            <MiniMap mode={mode} h={196} />
            <div className="pm-body">
              {grant === null && <button className="btn sm" data-k="ask" onClick={() => { setDlg(true); setLog(<>목적 문구와 함께 <b>OS 창</b>이 떠요</>) }}>내 위치 찾기</button>}
              {(grant === 'while' || grant === 'once') && (
                <>
                  <div className="pm-chips"><span className="badge blue">{grant === 'while' ? '앱 사용 중' : '이번 한 번'}</span><span className="badge done">{gotPrecise ? '정확한 위치' : '대략적인 위치'}</span></div>
                  <p className="pm-p">{gotPrecise ? '지금 서 있는 곳에서 가까운 산책로 3곳이에요.' : '동네 기준으로 산책로를 보여드려요.'}</p>
                  {grant === 'once' && <button className="btn ghost sm" data-k="relaunch" onClick={() => { setGrant(null); setLog(<>앱을 다시 켰더니 <b>또 물어봐요</b> — ‘한 번만’은 이번 실행에만 유효해요</>) }}>앱 껐다 켜기</button>}
                </>
              )}
              {grant === 'deny' && (
                <>
                  <p className="pm-p">위치 없이도 볼 수 있어요. 동네를 골라 주세요.</p>
                  <div className="pm-chips">{['솔빛동', '물결동', '바람동'].map(a => <button key={a} className="chip" onClick={() => setLog(<><b>{a}</b> 산책로 — 거절해도 기능이 이어져요</>)}>{a}</button>)}</div>
                </>
              )}
            </div>
          </div>
          <SysDialog os={os} open={dlg} id="pm-location-dt" icon="pin"
            btns={os === 'ios' ? [O, W, N] : [W, O, N]}
            title={os === 'ios' ? `‘${APP}’이 위치를 사용하도록 허용할까요?` : `${APP}에서 이 기기의 위치에 액세스하도록 허용할까요?`}
            body={os === 'ios' ? '가까운 산책로를 찾는 데 써요.' : undefined}>
            {os === 'ios' ? (
              <div className="pm-dmap">
                <MiniMap mode={precise ? 'precise' : 'approx'} h={88} />
                <button type="button" className="pm-prec" data-k="prec" aria-pressed={precise} onClick={() => { setPrecise(p => !p); setLog(<>정확한 위치 <b>{precise ? '끔' : '켬'}</b> — 지도 미리보기가 바로 바뀌어요</>) }}>
                  <Ico n="pin" size={12} />정확한 위치: {precise ? '켬' : '끔'}
                </button>
              </div>
            ) : (
              <div className="pm-acc" role="radiogroup" aria-label="위치 정확도">
                {([[true, '정확한 위치', 'prec-on'], [false, '대략적인 위치', 'prec-off']] as const).map(([v, label, k]) => (
                  <button key={k} type="button" role="radio" aria-checked={precise === v} data-k={k} onClick={() => { setPrecise(v); setLog(<><b>{label}</b>을 골랐어요</>) }}>
                    <svg viewBox="0 0 40 40" aria-hidden="true">
                      <circle cx="20" cy="20" r="18" className="pm-acc-bg" />
                      {v ? <circle cx="20" cy="20" r="4" className="pm-dot" /> : <circle cx="20" cy="20" r="12" className="pm-approx" />}
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </SysDialog>
        </Phone>
      </Stage>
      <Info
        spec={[['선택지', '3개 + 정확도'], ['한 번만', '앱 닫으면 끝'], ['항상 허용', '첫 창엔 없어요']]}
        usage={[
          ['언제', '지도, 주변 찾기, 길 안내처럼 위치가 기능의 중심일 때'],
          ['주의', '대략적인 위치를 골라도 앱이 돌아가게 만드세요. 동네 단위로 충분한 기능이 많아요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 카메라 권한 ---------- */
const C_LOG = <>‘영수증 찍기’를 눌러 <b>카메라를 허용</b>해 보세요</>

export function Camera() {
  const [os, setOs] = useState<OS>('ios')
  const [st, setSt] = useState<'idle' | 'cam' | 'off'>('idle')
  const [granted, setGranted] = useState(false)
  const [dlg, setDlg] = useState(false)
  const [shots, setShots] = useState(0)
  const [flash, setFlash] = useState(0)
  const [log, setLog] = useState<ReactNode>(C_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { setDlg(false); setSt('idle'); setGranted(false); setShots(0); setLog(C_LOG) }
  const ask = () => {
    if (granted) { setSt('cam'); setLog(<>이미 허용했으니 <b>창 없이 바로</b> 카메라가 켜져요</>); return }
    setDlg(true); setLog(<>찍기 버튼을 누른 <b>바로 그때</b> 물어봐요</>)
  }
  const allow = (once: boolean) => {
    setDlg(false); setGranted(!once); setSt('cam')
    setLog(<><b>{once ? '이번만 허용' : '허용'}</b> → 카메라가 켜지고 상태 표시줄에 <b>초록 점</b>이 떠요</>)
  }
  const shoot = () => {
    setFlash(f => f + 1); setShots(s => s + 1)
    setLog(<>찰칵 — 영수증 <b>{shots + 1}장</b> 저장</>)
  }
  const demo = useDemo({
    reset,
    async play(c) {
      await c.press(dev.current, q(dev.current, 'ask')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, 'c-ok')); await c.sleep(1100)
      await c.press(dev.current, q(dev.current, 'shot')); await c.sleep(900)
      await c.press(dev.current, q(dev.current, 'close')); await c.sleep(1400)
    },
  })

  const btns = os === 'ios'
    ? [{ k: 'c-no', label: '허용 안 함', on: () => { setDlg(false); setSt('off'); setLog(<><b>거절</b> → 막지 말고 앨범·직접 입력 길을 열어 줘요</>) } }, { k: 'c-ok', label: '허용', on: () => allow(false), strong: true }]
    : [{ k: 'c-ok', label: '앱 사용 중에만 허용', on: () => allow(false) }, { k: 'c-once', label: '이번만 허용', on: () => allow(true) }, { k: 'c-no', label: '허용 안함', on: () => { setDlg(false); setSt('off'); setLog(<><b>거절</b> → 막지 말고 앨범·직접 입력 길을 열어 줘요</>) } }]

  return (
    <Card id="pm-camera" num="03" title="카메라 권한" en="Camera Permission" demo={demo}
      desc="찍는 버튼을 누른 순간에 묻는 권한이에요. 켜져 있는 동안은 OS가 ‘사용 중’ 표시를 띄워 사용자가 알 수 있게 해요.">
      <Stage log={log} logId="pm-camera-log">
        <OsSeg os={os} onChange={o => { setOs(o); reset() }} />
        <Phone ref={dev} cam={st === 'cam'} light={st === 'cam'}>
          <div className="scr">
            <div className="bar">지출 기록</div>
            <div className="pm-body">
              <div className="pm-sub">11월 15일</div>
              <div className="pm-order"><span className="pm-thumb g2" /><div><b>점심 · 9,000원</b><span className="sub">물결동 국숫집</span></div></div>
              <div className="pm-order"><span className="pm-thumb g3" /><div><b>커피 · 4,500원</b><span className="sub">솔빛동 카페</span></div></div>
              {shots > 0 && <div className="pm-order"><span className="pm-thumb g4" /><div><b>영수증 {shots}장</b><span className="sub">방금 찍음 · 금액 읽는 중</span></div></div>}
              {st !== 'off' ? (
                <button className="btn sm pm-wide" data-k="ask" onClick={ask}><Ico n="cam" size={16} />영수증 찍기</button>
              ) : (
                <div className="pm-box">
                  <p>카메라가 꺼져 있어요. 다른 방법으로도 기록할 수 있어요.</p>
                  <div className="pm-chips">
                    <button className="btn ghost sm" onClick={() => setLog(<>사진 고르기는 <b>앨범 선택 창</b>이라 카메라 권한이 필요 없어요</>)}>앨범에서 고르기</button>
                    <button className="btn ghost sm" onClick={() => setLog(<><b>직접 입력</b> — 권한 없이도 기능이 끝까지 돼요</>)}>직접 입력</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {st === 'cam' && (
            <div className="pm-cam">
              <button className="pm-cam-x" data-k="close" aria-label="카메라 닫기" onClick={() => { setSt('idle'); setLog(<>닫자마자 카메라를 끄면 <b>초록 점도 사라져요</b></>) }}><Ico n="x" size={18} /></button>
              <div className="pm-receipt"><i /><i /><i /><i /><b /></div>
              <p>영수증을 네모 안에 맞춰 주세요</p>
              <button className="pm-shutter" data-k="shot" aria-label="촬영" onClick={shoot} />
              {flash > 0 && <span className="pm-flash" key={flash} />}
            </div>
          )}
          <SysDialog os={os} open={dlg} id="pm-camera-dt" icon="cam" btns={btns}
            title={os === 'ios' ? `‘${APP}’에서 카메라에 접근하려고 해요` : `${APP}에서 사진을 촬영하고 동영상을 녹화하도록 허용할까요?`}
            body={os === 'ios' ? '영수증을 찍어 지출을 기록하는 데 써요.' : undefined} />
        </Phone>
      </Stage>
      <Info
        spec={[['표시', '사용 중 초록 점'], ['대안', '앨범 · 직접 입력'], ['Android', '이번만 허용 있음']]}
        usage={[
          ['언제', '찍기·스캔·영상 통화 버튼을 누른 바로 그때'],
          ['주의', '카메라 화면을 닫으면 바로 꺼 주세요. 초록 점이 계속 켜져 있으면 몰래 찍는다고 느껴요'],
        ]}
      />
    </Card>
  )
}
