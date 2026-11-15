import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { ITEM, PEOPLE, QR_N, pseudoQr, useToast } from '../data'
import { Article, Av, Ico, Thumb, Toast, type IcoName } from '../shared'

/** 클립보드에 쓰기. 막히면 false (http 페이지, 권한 거부, 오래된 브라우저 등) */
async function writeClipboard(text: string) {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/* ---------- 05 링크 복사 ---------- */
type LinkKind = 'raw' | 'utm' | 'short'
const LINKS: Record<LinkKind, string> = {
  raw: ITEM.url,
  utm: ITEM.url + '?utm_source=app&utm_medium=share&utm_campaign=autumn_camp',
  short: 'https://wkn.example/a8F2k',
}
const LINK_LOG = <><b>링크 복사</b>는 진짜로 클립보드에 써요 — 아래 칸에 붙여넣어 확인해 보세요</>

export function CopyLink() {
  const [kind, setKind] = useState<LinkKind>('raw')
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [paste, setPaste] = useState('')
  const [log, setLog] = useState<ReactNode>(LINK_LOG)
  const [toast, T] = useToast()
  const timers = useTimers()
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const urlBox = useRef<HTMLInputElement>(null)
  const segBox = useRef<HTMLDivElement>(null)

  const flash = () => { setCopied(true); timers.clear(); timers.set(() => setCopied(false), m.D(2000)) }
  /** simulated: 자동 재생일 땐 사용자의 클립보드를 건드리지 않아요 */
  const copy = async (text: string, simulated = false) => {
    if (simulated) { flash(); T.show('링크를 복사했어요'); setLog(<>(자동 재생은 흉내만) 버튼이 <b>✓ 복사됨</b>으로 바뀌고 토스트가 떠요</>); return }
    const ok = await writeClipboard(text)
    if (ok) {
      setFallback(false); flash(); T.show('링크를 복사했어요')
      setLog(<><b>복사 완료</b> — 버튼 글자와 토스트로 두 번 알려줘요</>)
    } else {
      setFallback(true)
      urlBox.current?.focus({ preventScroll: true }); urlBox.current?.select()
      setLog(<>클립보드가 막혔어요 → 주소를 <b>선택해 두고</b> 직접 복사하게 해요</>)
    }
  }
  const pick = (k: LinkKind) => {
    setKind(k); setCopied(false)
    setLog(k === 'raw' ? <><b>원본 주소</b> — 그대로라 믿음이 가요</> : k === 'utm' ? <><b>UTM</b> — 어디서 공유됐는지 셀 수 있지만 주소가 길어져요</> : <><b>짧은 링크</b> — 문자나 인쇄물에 좋지만 어디로 가는지 안 보여요</>)
  }

  const demo = useDemo({
    reset() { setKind('raw'); setCopied(false); setFallback(false); setPaste(''); T.hide(); timers.clear(); setLog(LINK_LOG) },
    async play(c) {
      const seg = (v: string) => segBox.current?.querySelector<HTMLElement>(`[data-v="${v}"]`) ?? null
      await c.sleep(400)
      c.tap(dev.current, dev.current?.querySelector('.sh-copybtn') ?? null); await c.sleep(200); await copy('', true); await c.sleep(1800)
      await c.press(segBox.current, seg('utm')); await c.sleep(1500)
      await c.press(segBox.current, seg('short')); await c.sleep(1300)
      c.tap(dev.current, dev.current?.querySelector('.sh-copybtn') ?? null); await c.sleep(200); await copy('', true); await c.sleep(900)
    },
  })

  const url = LINKS[kind]
  return (
    <Card id="share-link" num="05" title="링크 복사" en="Copy Link" demo={demo}
      desc="주소를 클립보드에 담아 어디든 붙여넣게 해요. 눌렀는지 모르기 쉬워서 피드백이 핵심이에요.">
      <Stage log={log} logId="share-link-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            <div className="bar"><span className="sh-back" aria-hidden="true">‹</span>공유</div>
            <div className="sh-linkpane">
              <div className="sh-linkcard big"><Thumb size={40} /><span>{ITEM.title}<small>{ITEM.host}</small></span></div>
              <input ref={urlBox} readOnly value={url} aria-label="공유 주소" className={'sh-urlbox' + (fallback ? ' warn' : '')} onFocus={e => e.currentTarget.select()} />
              {fallback && <div className="sh-warn">자동 복사가 막혔어요. 주소를 길게 눌러 복사해 주세요.</div>}
              <button type="button" className={'btn sh-copybtn' + (copied ? ' done' : '')} onClick={() => copy(url)}>
                <Ico n={copied ? 'check' : 'link'} size={16} />{copied ? '복사됨' : '링크 복사'}
              </button>
              <input className="sh-paste" aria-label="붙여넣기 확인 칸" placeholder="여기에 붙여넣어 확인해 보세요" value={paste} onChange={e => setPaste(e.target.value)} />
            </div>
            <Toast t={toast} />
          </div>
        </Device>
        <div ref={segBox}>
          <Seg value={kind} onChange={pick} options={[['raw', '원본'], ['utm', 'UTM 붙이기'], ['short', '짧은 링크']]} />
        </div>
      </Stage>
      <Info
        spec={[['API', 'navigator.clipboard.writeText'], ['피드백', '버튼 글자 + 토스트'], ['실패', '주소 선택해 두기']]}
        usage={[
          ['언제', '받을 사람이 어떤 앱을 쓰는지 모를 때. 공유 시트 맨 앞에 두면 가장 많이 눌려요'],
          ['주의', '클립보드 API는 https와 사용자 클릭에서만 돼요. 실패를 try/catch로 잡아 직접 복사할 길을 주고, UTM은 길어지니 보이는 곳엔 짧게 보여주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 QR 공유 ---------- */
type QrKind = 'profile' | 'invite' | 'wifi'
const QRS: Record<QrKind, { t: string; sub: string; data: string; ic: IcoName }> = {
  profile: { t: '하린의 캠핑 노트', sub: '내 프로필', data: 'https://weekendnote.example/u/harin', ic: 'user' },
  invite: { t: '토요일 캠핑 모임', sub: '모임 초대 · 24시간 동안', data: 'https://weekendnote.example/join/K7Q2', ic: 'cal' },
  wifi: { t: '캠핑장 와이파이', sub: '이름 Camp_Guest', data: 'WIFI:T:WPA;S:Camp_Guest;P:forest2026;;', ic: 'wifi' },
}
const QR_LOG = <>종류를 바꾸면 <b>무늬도 바뀌어요</b> — 스캔 흉내도 내 보세요</>

function QrSvg({ data }: { data: string }) {
  const g = useMemo(() => pseudoQr(data), [data])
  let d = ''
  g.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c} ${r}h1v1h-1z` }))
  return (
    <svg className="sh-qr" viewBox={`-2 -2 ${QR_N + 4} ${QR_N + 4}`} role="img" aria-label="QR 코드 (장식용 예시)" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={QR_N + 4} height={QR_N + 4} className="sh-qr-bg" />
      <path d={d} className="sh-qr-fg" />
    </svg>
  )
}

export function QrShare() {
  const [kind, setKind] = useState<QrKind>('profile')
  const [scan, setScan] = useState<'off' | 'scanning' | 'found'>('off')
  const [log, setLog] = useState<ReactNode>(QR_LOG)
  const [toast, T] = useToast()
  const timers = useTimers()
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const segBox = useRef<HTMLDivElement>(null)

  const q = QRS[kind]
  const pick = (k: QrKind) => {
    setKind(k); setScan('off'); timers.clear()
    setLog(k === 'wifi' ? <><b>와이파이 QR</b> — 링크가 아니라 이름·비밀번호를 담아요</> : k === 'invite' ? <><b>초대 QR</b> — 기한을 함께 적어 두면 안심돼요</> : <><b>프로필 QR</b> — 마주 앉은 사람과 친구 맺기</>)
  }
  const startScan = () => {
    setScan('scanning'); timers.clear()
    setLog(<>상대 카메라가 비추는 중 — 화면은 <b>밝게, 꺼지지 않게</b></>)
    timers.set(() => { setScan('found'); setLog(<>읽었어요 → 상대 화면에 <b>‘열기’</b> 안내가 떠요</>) }, m.D(1600))
  }

  const demo = useDemo({
    reset() { setKind('profile'); setScan('off'); timers.clear(); T.hide(); setLog(QR_LOG) },
    async play(c) {
      const seg = (v: string) => segBox.current?.querySelector<HTMLElement>(`[data-v="${v}"]`) ?? null
      await c.sleep(600)
      await c.press(segBox.current, seg('invite')); await c.sleep(1400)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.sh-scanbtn') ?? null); await c.sleep(2800)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.sh-scan-close') ?? null); await c.sleep(500)
      await c.press(segBox.current, seg('wifi')); await c.sleep(900)
    },
  })

  return (
    <Card id="share-qr" num="07" title="QR 공유" en="QR Code Share" demo={demo}
      desc="주소를 네모 무늬로 바꿔 화면에 띄워요. 옆에 있는 사람이 카메라로 찍으면 바로 열려요.">
      <Stage log={log} logId="share-qr-log">
        <Device ref={dev}>
          <div className="scr sh-scr sh-qrscr">
            <div className="bar"><span className="sh-back" aria-hidden="true">‹</span>QR로 공유<span className="sp" /><span className="sh-sun" title="화면 밝기 올림" aria-label="화면 밝기 올림">☀</span></div>
            <div className="sh-qrcard" key={kind}>
              <div className="sh-qr-hd"><i><Ico n={q.ic} size={16} /></i><span><b>{q.t}</b><small>{q.sub}</small></span></div>
              <QrSvg data={q.data} />
              <div className="sh-qr-url">{kind === 'wifi' ? '카메라로 찍으면 바로 연결돼요' : q.data.replace('https://', '')}</div>
            </div>
            <div className="sh-qr-act">
              <button type="button" className="btn ghost sm" onClick={() => { T.show('사진첩에 저장했어요'); setLog(<><b>이미지 저장</b> — 인쇄하거나 나중에 보여줄 때</>) }}><Ico n="dl" size={14} />저장</button>
              <button type="button" className="btn sm sh-scanbtn" onClick={startScan}><Ico n="scan" size={14} />스캔해 보기</button>
            </div>
            {scan !== 'off' && (
              <div className="sh-scan">
                <div className="sh-viewfinder"><QrSvg data={q.data} />{scan === 'scanning' && <span className="sh-beam" />}</div>
                {scan === 'found' && (
                  <div className="sh-found"><small>상대 휴대폰 화면</small><b>{kind === 'wifi' ? '‘Camp_Guest’에 연결할까요?' : q.data.replace('https://', '') + ' 열기'}</b></div>
                )}
                <button type="button" className="sh-scan-close" aria-label="스캔 닫기" onClick={() => { setScan('off'); timers.clear() }}><Ico n="close" size={14} /></button>
              </div>
            )}
            <Toast t={toast} />
          </div>
        </Device>
        <div ref={segBox}>
          <Seg value={kind} onChange={pick} options={[['profile', '프로필'], ['invite', '모임 초대'], ['wifi', '와이파이']]} />
        </div>
      </Stage>
      <Info
        spec={[['거리', '같은 공간'], ['담는 것', '주소 · 와이파이 · 연락처'], ['예시', '장식용 무늬 (스캔 안 됨)']]}
        usage={[
          ['언제', '마주 보고 있거나 화면·종이를 같이 볼 때. 상대 연락처를 몰라도 돼요'],
          ['주의', '다크 모드에서도 QR만큼은 밝은 바탕에 어두운 점으로 두고, 띄우는 동안 화면이 어두워지거나 꺼지지 않게 해 주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 근처 공유 ---------- */
type Dev = { id: string; n: string; kind: string; x: number; y: number; who: number }
const DEVICES: Dev[] = [
  { id: 'a', n: '하린의 폰', kind: '휴대폰', x: 26, y: 30, who: 0 },
  { id: 'b', n: '도윤의 태블릿', kind: '태블릿', x: 74, y: 40, who: 1 },
  { id: 'c', n: '거실 노트북', kind: '노트북', x: 40, y: 74, who: 3 },
]
type Step = 'idle' | 'wait' | 'send' | 'done' | 'no'
/** 기기가 하나씩 나타나요 */
const findLater = (timers: ReturnType<typeof useTimers>, D: (ms: number) => number, setFound: (fn: (f: string[]) => string[]) => void) =>
  DEVICES.forEach((d, i) => timers.set(() => setFound(f => (f.includes(d.id) ? f : [...f, d.id])), D(700 + i * 900)))
const NEAR_LOG = <>주변 기기를 찾는 중 — 나타난 기기를 눌러 보세요</>

export function Nearby() {
  const [found, setFound] = useState<string[]>([])
  const [target, setTarget] = useState<Dev | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [pct, setPct] = useState(0)
  const [log, setLog] = useState<ReactNode>(NEAR_LOG)
  const timers = useTimers()
  const m = useMotion()
  const dev = useRef<HTMLDivElement>(null)
  const recv = useRef<HTMLDivElement>(null)

  const discover = () => {
    timers.clear(); setFound([]); setTarget(null); setStep('idle'); setPct(0); setLog(NEAR_LOG)
    findLater(timers, m.D, setFound)
  }
  // 처음 그려질 때 한 번 찾기 시작
  useEffect(() => { findLater(timers, m.D, setFound) }, [timers, m])

  const ask = (d: Dev) => {
    if (step === 'wait' || step === 'send') return
    setTarget(d); setStep('wait'); setPct(0)
    setLog(<><b>{d.n}</b>에 요청 — 상대가 받을지 고를 때까지 기다려요</>)
  }
  const answer = (yes: boolean) => {
    if (!target) return
    if (!yes) { setStep('no'); setLog(<><b>{target.n}</b>에서 거절했어요 — 보낸 쪽에도 꼭 알려줘요</>); return }
    setStep('send'); setLog(<>수락! 두 화면에 <b>같은 진행률</b>이 보여요</>)
    for (let i = 1; i <= 10; i++) timers.set(() => {
      setPct(i * 10)
      if (i === 10) { setStep('done'); setLog(<>사진 3장 <b>보내기 완료</b> — 인터넷 없이 가까이에서 바로</>) }
    }, m.D(i * 200))
  }

  const demo = useDemo({
    reset() { discover() },
    async play(c) {
      await c.sleep(2400)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('[data-dev="a"]') ?? null); await c.sleep(1300)
      await c.press(recv.current, recv.current?.querySelector<HTMLElement>('[data-yes]') ?? null); await c.sleep(2600)
    },
  })

  const busy = step === 'wait' || step === 'send'
  return (
    <Card id="share-nearby" num="08" title="근처 공유" en="Nearby Share · Proximity Share" demo={demo}
      desc="블루투스·와이파이로 가까이 있는 기기를 찾아 인터넷 없이 바로 보내요. 받는 쪽이 수락해야 와요.">
      <Stage log={log} logId="share-nearby-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            <div className="bar">근처 공유<span className="sp" /><button type="button" onClick={discover}>다시 찾기</button></div>
            <div className="sh-file"><Thumb size={34} /><span><b>캠핑 사진 3장</b><small>8.4MB · 보내는 사람: 서윤</small></span></div>
            <div className="sh-radar" aria-label="주변 기기">
              <span className="sh-ring r1" /><span className="sh-ring r2" /><span className="sh-ring r3" />
              <span className="sh-me"><Av p={PEOPLE[2]} size={40} /></span>
              {DEVICES.filter(d => found.includes(d.id)).map(d => (
                <button type="button" key={d.id} data-dev={d.id} className={'sh-peer' + (target?.id === d.id ? ' ' + step : '')} style={{ left: d.x + '%', top: d.y + '%' }}
                  disabled={busy && target?.id !== d.id} onClick={() => ask(d)} aria-label={d.n + '에 보내기'}>
                  <Av p={PEOPLE[d.who]} size={36} />
                  <span>{d.n}</span>
                  {target?.id === d.id && step === 'send' && <i className="sh-prog" style={{ ['--p' as string]: pct + '%' }} />}
                </button>
              ))}
            </div>
            <div className="sh-near-st" aria-live="polite">
              {!target ? (found.length < DEVICES.length ? '주변 기기를 찾고 있어요…' : '보낼 기기를 눌러요')
                : step === 'wait' ? target.n + ' 응답 기다리는 중…' : step === 'send' ? '보내는 중 ' + pct + '%' : step === 'done' ? '✓ ' + target.n + '에 보냈어요' : target.n + '에서 거절했어요'}
            </div>
          </div>
        </Device>
        <div className={'sh-recv' + (target && step !== 'idle' ? ' on' : '')} ref={recv}>
          <div className="sh-recv-l">받는 쪽 · {target?.n ?? '상대 기기'}</div>
          {target && step === 'wait' ? (
            <>
              <p><b>서윤</b>님이 사진 3장(8.4MB)을 보내려고 해요</p>
              <div className="row">
                <button type="button" className="btn ghost sm" onClick={() => answer(false)}>거절</button>
                <button type="button" className="btn sm" data-yes onClick={() => answer(true)}>받기</button>
              </div>
            </>
          ) : target && step === 'send' ? <p>받는 중 {pct}%</p>
            : target && step === 'done' ? <p>✓ 사진첩에 저장했어요</p>
              : target && step === 'no' ? <p>거절했어요. 보낸 사람에게도 알렸어요.</p>
                : <p className="muted">기기를 고르면 상대 화면이 여기에 보여요</p>}
        </div>
      </Stage>
      <Info
        spec={[['거리', '몇 미터 안'], ['연결', '블루투스 + 와이파이'], ['받기', '수락해야 시작']]}
        usage={[
          ['언제', '같은 방에 있는 사람에게 큰 사진·영상을 바로 넘길 때. 데이터도, 연락처 저장도 필요 없어요'],
          ['주의', '낯선 사람이 사진을 밀어 넣지 못하게 공개 범위(연락처만 · 모두 10분)를 두고, 받기 전에 보낸 사람과 내용을 보여주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 공유 시트 (Web Share API) ---------- */
type Mode = 'auto' | 'custom'
const canNative = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const WEB_LOG = <><b>공유하기</b>를 누르면 브라우저가 지원하는지 먼저 확인해요</>
const CUSTOM: [IcoName, string, string][] = [['link', '링크 복사', 'copy'], ['msg', '메시지', 'sms:'], ['mail', '메일', 'mailto:'], ['qr', 'QR 코드', 'qr']]

export function WebShare() {
  const [mode, setMode] = useState<Mode>('auto')
  const [sheet, setSheet] = useState(false)
  const [log, setLog] = useState<ReactNode>(WEB_LOG)
  const [toast, T] = useToast()
  const dev = useRef<HTMLDivElement>(null)
  const segBox = useRef<HTMLDivElement>(null)
  const native = canNative()

  const data = { title: ITEM.title, text: '주말노트에서 본 글이에요', url: ITEM.url }
  const share = async () => {
    if (mode === 'auto' && native && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data)
        setLog(<><b>기본 공유 시트</b>로 공유했어요 — 앱 목록은 운영체제가 채워요</>)
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') setLog(<>사용자가 시트를 닫았어요 — <b>오류가 아니니</b> 조용히 넘어가요</>)
        else { setSheet(true); setLog(<>기본 공유가 실패 → <b>직접 만든 시트</b>로 대신해요</>) }
      }
      return
    }
    setSheet(true)
    setLog(mode === 'custom' ? <><b>직접 만든 시트</b> — 모양은 마음대로지만 앱 목록은 우리가 골라야 해요</> : <>이 브라우저는 navigator.share가 없어요 → <b>직접 만든 시트</b></>)
  }
  const act = async (k: string, l: string, simulated = false) => {
    setSheet(false)
    if (k === 'copy') {
      const ok = simulated ? true : await (async () => { try { await navigator.clipboard.writeText(ITEM.url); return true } catch { return false } })()
      T.show(ok ? '링크를 복사했어요' : '복사가 막혔어요')
      setLog(ok ? <><b>링크 복사</b> — 대체 시트에도 맨 앞에 두세요{simulated ? ' (자동 재생은 흉내만)' : ''}</> : <>클립보드가 막혔어요 — 주소를 직접 보여줘야 해요</>)
    } else if (k === 'qr') setLog(<><b>QR 코드</b> 화면으로 — 07번 카드처럼요</>)
    else setLog(<><b>{l}</b> — <code>{k}?body=…</code> 주소로 그 앱을 열어요</>)
  }

  const demo = useDemo({
    reset() { setMode('auto'); setSheet(false); T.hide(); setLog(WEB_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(segBox.current, segBox.current?.querySelector<HTMLElement>('[data-v="custom"]') ?? null); await c.sleep(800)
      await c.press(dev.current, q1('.sh-webshare')); await c.sleep(1500)
      c.tap(dev.current, q1('[data-k="copy"]')); await c.sleep(200); await act('copy', '링크 복사', true); await c.sleep(1400)
    },
  })

  return (
    <Card id="share-web" num="09" title="공유 시트 (웹)" en="Web Share API · Native vs Custom" demo={demo}
      desc="웹에서도 navigator.share로 휴대폰의 기본 공유 시트를 부를 수 있어요. 안 되는 곳에선 직접 만든 시트로 대신해요.">
      <Stage log={log} logId="share-web-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            <div className="sh-urlbar"><span>🔒 {ITEM.host}</span></div>
            <Article>
              <button type="button" className="btn sm sh-webshare" onClick={share}><Ico n="share" size={14} />공유하기</button>
            </Article>
            <Toast t={toast} />
            <div className={'scrim' + (sheet ? ' on' : '')} onClick={() => setSheet(false)} aria-hidden="true" />
            <div className={'sh-sheet ' + (sheet ? 'auto' : 'closed')} role="dialog" aria-label="공유 (직접 만든 시트)" aria-hidden={!sheet} inert={!sheet}>
              <div className="sh-sh-hd"><b>공유하기</b><button type="button" className="sh-x" aria-label="닫기" onClick={() => setSheet(false)}><Ico n="close" size={14} /></button></div>
              <div className="sh-linkcard"><Thumb size={30} /><span>{ITEM.title}<small>{ITEM.host}</small></span></div>
              <div className="sh-grid4">
                {CUSTOM.map(([ic, l, k]) => (
                  <button type="button" key={k} data-k={k} onClick={() => act(k, l)}><i><Ico n={ic} size={20} /></i><span>{l}</span></button>
                ))}
              </div>
            </div>
          </div>
        </Device>
        <div className="sh-webctl">
          <span className={'sh-support' + (native ? ' yes' : '')}>{native ? '이 브라우저: navigator.share 지원' : '이 브라우저: navigator.share 없음'}</span>
          <div ref={segBox}><Seg value={mode} onChange={v => { setMode(v); setLog(v === 'auto' ? <><b>자동</b> — 되면 기본 시트, 안 되면 직접 만든 시트</> : <><b>직접 만든 시트</b>만 쓰도록 고정</>) }}
            options={[['auto', '자동 감지'], ['custom', '직접 만든 시트']]} /></div>
        </div>
        <pre className="sh-code allow-select">{`if (navigator.share) {
  try { await navigator.share({ title, url }) }
  catch (e) { if (e.name !== 'AbortError') openSheet() }
} else openSheet()  // 대체 시트`}</pre>
      </Stage>
      <Info
        spec={[['기본', 'navigator.share'], ['확인', 'canShare · AbortError'], ['대체', '복사가 맨 앞인 시트']]}
        usage={[
          ['언제', '모바일 웹에서 공유 버튼을 둘 때. 기본 시트는 사용자가 쓰는 앱이 전부 나와서 가장 편해요'],
          ['vs 직접 만든 시트', '모양을 맞출 수 있지만 앱 목록을 우리가 골라야 해요. 데스크톱처럼 지원하지 않는 곳의 대체용으로 두세요'],
          ['주의', '사용자가 닫으면 AbortError가 나요. 오류 창을 띄우지 말고, share는 꼭 클릭 안에서 불러야 해요'],
        ]}
      />
    </Card>
  )
}
