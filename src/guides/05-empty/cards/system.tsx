import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Empty, Hl, Phone, useAnatomy } from '../shared'

/* ---------- 04 오프라인 ---------- */
const FEED = ['김디자 님이 새 글을 올렸어요', '오늘의 추천 카페 5곳', '박기획 님이 회원님을 언급했어요', '11월 전시 모음']
const OFF_LOG = <>오른쪽 위 스위치로 <b>네트워크를 꺼</b> 보세요</>

export function Offline() {
  const { hl, spec } = useAnatomy()
  const m = useMotion()
  const [online, setOnline] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [log, setLog] = useState<ReactNode>(OFF_LOG)
  const onlineRef = useRef(true)
  const busy = useRef(false)
  const dev = useRef<HTMLDivElement>(null)
  const sw = useRef<HTMLButtonElement>(null)

  const setNet = (v: boolean) => { onlineRef.current = v; setOnline(v) }
  const retry = async () => {
    if (busy.current) return
    busy.current = true; setRetrying(true)
    setLog(<><b>다시 시도</b> — 연결을 확인하는 동안 스피너</>)
    await m.sleep(1300)
    busy.current = false; setRetrying(false)
    if (onlineRef.current) return
    setNet(true)
    setLog(<>✓ <b>다시 연결됐어요</b> — 피드를 새로 불러옴</>)
  }
  const toggle = () => {
    if (busy.current) return
    const v = !onlineRef.current
    setNet(v)
    setLog(v ? <>연결이 돌아오자 <b>자동으로 새로고침</b> — 버튼 안 눌러도 돼요</> : <>연결 끊김 → <b>오프라인 빈 화면</b> · 원인과 다시 시도 제공</>)
  }
  const demo = useDemo({
    reset() { setNet(true); busy.current = false; setRetrying(false); setLog(OFF_LOG) },
    async play(c) {
      await c.press(dev.current, sw.current); await c.sleep(1500)
      await c.press(dev.current, dev.current?.querySelector<HTMLElement>('.em-act .btn') ?? null); await c.sleep(2000)
    },
  })

  return (
    <Card id="empty-offline" num="04" title="오프라인" en="Offline" demo={demo}
      desc="네트워크가 끊겨 내용을 못 불러올 때예요. 사용자 탓이 아니라고 말하고 다시 시도할 길을 줘요.">
      <Stage log={log} logId="empty-offline-log">
        <Hl hl={hl}>
          <Phone ref={dev} sig={online ? '●●● 100%' : '✕ 100%'}>
            <div className="scr">
              <div className="bar">피드<span className="sp" /><span className="em-net">Wi-Fi</span>
                <button ref={sw} className="switch" role="switch" aria-checked={online} aria-label="네트워크 연결" onClick={toggle} />
              </div>
              <div className="em-scr">
                {online ? FEED.map((t, i) => (
                  <div className="em-row" key={t}><span className={'em-thumb g' + (i + 1)} /><span className="grow">{t}<span className="sub">{(i + 1) * 7}분 전</span></span></div>
                )) : (
                  <Empty ill="offline" title="인터넷에 연결되어 있지 않아요" desc="Wi-Fi나 모바일 데이터를 확인한 뒤 다시 시도해 주세요.">
                    <button className="btn sm" disabled={retrying} onClick={retry}>{retrying ? <><span className="em-spin" />연결하는 중…</> : '다시 시도'}</button>
                  </Empty>
                )}
              </div>
            </div>
          </Phone>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['톤', '안심 · 원인 설명'], ['행동', '다시 시도']]}
        usage={[
          ['언제', '첫 로딩부터 네트워크가 없어 보여줄 캐시조차 없을 때'],
          ['주의', '연결이 돌아오면 버튼을 안 눌러도 자동으로 새로고침해 주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 권한 필요 ---------- */
const PERM_LOG = <>버튼을 눌러 <b>권한을 요청</b>해 보세요</>

export function Permission() {
  const { hl, spec } = useAnatomy()
  const [state, setState] = useState<'ask' | 'ok' | 'deny'>('ask')
  const [dlg, setDlg] = useState(false)
  const [log, setLog] = useState<ReactNode>(PERM_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const q = (k: string) => dev.current?.querySelector<HTMLElement>('[data-k="' + k + '"]') ?? null

  const demo = useDemo({
    reset() { setDlg(false); setState('ask'); setLog(PERM_LOG) },
    async play(c) {
      await c.press(dev.current, q('ask')); await c.sleep(1100)
      await c.press(dev.current, q('deny')); await c.sleep(1600)
      await c.press(dev.current, q('settings')); await c.sleep(1000)
    },
  })

  return (
    <Card id="empty-perm" num="05" title="권한 필요" en="Permission Required" demo={demo}
      desc="카메라·위치 권한이 없어 기능이 비어 있어요. 왜 필요한지 먼저 말하고 시스템 창을 띄워요.">
      <Stage log={log} logId="empty-perm-log">
        <Hl hl={hl}>
          <Phone ref={dev}>
            <div className="scr">
              <div className="bar">QR 스캔</div>
              <div className="em-scr">
                {state === 'ok' ? (
                  <div className="em-cam"><div className="em-frame"><i /><i /><i /><i /><b /></div><p>QR 코드를 네모 안에 맞춰 주세요</p></div>
                ) : state === 'ask' ? (
                  <Empty ill="perm" title="QR을 읽으려면 카메라가 필요해요" desc="코드를 비추는 동안에만 카메라를 쓰고, 사진은 저장하지 않아요.">
                    <button className="btn sm" data-k="ask" onClick={() => { setDlg(true); setLog(<>이유를 먼저 읽은 뒤 <b>시스템 권한 창</b>이 떠요</>) }}>카메라 허용하기</button>
                  </Empty>
                ) : (
                  <Empty key="deny" ill="perm" title="카메라 권한이 꺼져 있어요" desc="설정 › 와플 › 카메라에서 켤 수 있어요. 사진에서 QR을 불러와도 돼요.">
                    <button className="btn sm" data-k="settings" onClick={() => { setState('ok'); setLog(<>설정에서 켜고 돌아오면 <b>바로 카메라 화면</b></>) }}>설정 열기</button>
                    <button className="btn ghost sm" onClick={() => setLog(<>권한 없이도 쓸 수 있는 <b>대안 경로</b> — 앨범에서 QR 선택</>)}>사진에서 불러오기</button>
                  </Empty>
                )}
              </div>
            </div>
            <div className={'scrim' + (dlg ? ' on' : '')} />
            <div className={'dialog' + (dlg ? ' on' : '')} role="alertdialog" aria-labelledby="empty-perm-dt">
              <h4 id="empty-perm-dt">‘와플’에서 카메라에 접근하려고 해요</h4>
              <p>QR 코드를 읽는 데에만 사용해요.</p>
              <div className="row">
                <button className="btn ghost sm" data-k="deny" onClick={() => { setDlg(false); setState('deny'); setLog(<><b>거부</b> → 다시 묻지 못하니 설정 안내와 대안 제공</>) }}>허용 안 함</button>
                <button className="btn sm" onClick={() => { setDlg(false); setState('ok'); setLog(<><b>허용</b> → 빈 화면 대신 카메라 미리보기</>) }}>허용</button>
              </div>
            </div>
          </Phone>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['순서', '설명 → 시스템 창'], ['거부 시', '설정 안내 · 대안']]}
        usage={[
          ['언제', '카메라·위치·알림·사진처럼 권한 없이는 화면이 텅 비는 기능'],
          ['주의', '거부하면 시스템 창은 다시 못 띄워요 — 설정 이동과 다른 방법을 함께 주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 오류 화면 ---------- */
const ORDERS: [string, string][] = [['무선 이어폰', '배송 중'], ['텀블러', '배송 완료'], ['노트 세트', '배송 완료'], ['데스크 매트', '배송 완료']]
const rid = () => 'REQ-' + Math.random().toString(16).slice(2, 6).toUpperCase()
const ERR_LOG = <>장애를 일으킨 뒤 <b>↻ 새로고침</b> 해 보세요</>
type View = { k: 'list' } | { k: 'loading' } | { k: 'err'; id: string; n: number }

export function ErrorState() {
  const { hl, spec } = useAnatomy()
  const m = useMotion()
  const timers = useTimers()
  const [down, setDown] = useState(false)
  const [view, setView] = useState<View>({ k: 'list' })
  const [toast, setToast] = useState<{ id: string; n: number } | null>(null)
  const [log, setLog] = useState<ReactNode>(ERR_LOG)
  const downRef = useRef(false)
  const busy = useRef(false)
  const tries = useRef(0)
  const toastT = useRef<number | undefined>(undefined)
  const dev = useRef<HTMLDivElement>(null)
  const srv = useRef<HTMLButtonElement>(null)
  const reload = useRef<HTMLButtonElement>(null)

  const setSrv = (v: boolean) => { downRef.current = v; setDown(v) }
  const load = async () => {
    if (busy.current) return
    busy.current = true
    setView({ k: 'loading' })
    await m.sleep(900)
    busy.current = false
    if (downRef.current) {
      tries.current++
      setView({ k: 'err', id: rid(), n: tries.current })
      setLog(tries.current > 1 ? <>아직 장애 중 · 재시도 <b>{tries.current}회</b> — 계속되면 문의로 안내</> : <>서버 500 → <b>사과 + 오류 코드 + 다시 시도/문의</b></>)
    } else {
      tries.current = 0
      setView({ k: 'list' })
      setLog(<>✓ <b>정상 응답</b> — 주문 내역 표시</>)
    }
  }
  const contact = (id: string) => {
    setToast(t => ({ id, n: (t?.n ?? 0) + 1 }))
    timers.clear(toastT.current)
    toastT.current = timers.set(() => setToast(null), m.D(2200))
    setLog(<><b>문의하기</b> — 오류 코드가 자동으로 첨부돼요</>)
  }
  const demo = useDemo({
    reset() {
      timers.clear(toastT.current); setToast(null)
      busy.current = false; tries.current = 0; setSrv(false); setView({ k: 'list' }); setLog(ERR_LOG)
    },
    async play(c) {
      const st = dev.current?.parentElement ?? null
      const q = (k: string) => dev.current?.querySelector<HTMLElement>('[data-k="' + k + '"]') ?? null
      await c.press(st, srv.current); await c.sleep(500)
      await c.press(dev.current, reload.current); await c.sleep(2000)
      await c.press(dev.current, q('cs')); await c.sleep(1800)
      await c.press(st, srv.current); await c.sleep(400)
      await c.press(dev.current, q('retry')); await c.sleep(1400)
    },
  })

  return (
    <Card id="empty-error" num="08" title="오류 화면" en="Error State" demo={demo}
      desc="서버가 응답하지 않아 비었어요. 사과하고, 다시 시도와 문의 경로를 함께 줘요.">
      <Stage log={log} logId="empty-error-log">
        <Hl hl={hl}>
          <Phone ref={dev}>
            <div className="scr">
              <div className="bar">주문 내역<span className="sp" /><button ref={reload} aria-label="새로고침" onClick={load}>↻</button></div>
              <div className="em-scr">
                {view.k === 'list' && ORDERS.map(o => (
                  <div className="em-row" key={o[0]}><span className="grow">{o[0]}<span className="sub">11월 주문</span></span><span className={'badge ' + (o[1] === '배송 중' ? 'ship' : 'done')}>{o[1]}</span></div>
                ))}
                {view.k === 'loading' && <div className="em-empty"><div className="spinner" /><div className="muted">불러오는 중…</div></div>}
                {view.k === 'err' && (
                  <Empty key={view.n} ill="error" title="일시적인 오류가 생겼어요" desc="잠시 후 다시 시도해 주세요. 계속되면 아래 코드를 알려주세요."
                    extra={<div className="em-code">오류 코드 <code>500 · {view.id}</code></div>}>
                    <button className="btn sm" data-k="retry" onClick={load}>다시 시도</button>
                    <button className="btn ghost sm" data-k="cs" onClick={() => contact(view.id)}>문의하기</button>
                  </Empty>
                )}
              </div>
            </div>
            {toast && <div className="em-mini-toast" key={toast.n}>💬 문의 창에 <b>500 · {toast.id}</b>가 첨부됐어요</div>}
          </Phone>
        </Hl>
        <div className="em-ctrl">
          <button ref={srv} className="chip" aria-pressed={down}
            onClick={() => { const v = !downRef.current; setSrv(v); setLog(v ? <>서버 장애 발생 — <b>↻ 새로고침</b> 해 보세요</> : <>서버 복구 — <b>다시 시도</b>를 눌러 보세요</>) }}>
            {down ? '🛠 서버 복구하기' : '💥 서버 장애 일으키기'}
          </button>
        </div>
      </Stage>
      <Info
        spec={[spec, ['정보', '오류 코드 · 요청 ID'], ['행동', '다시 시도 · 문의']]}
        usage={[
          ['언제', '서버 500, 타임아웃처럼 사용자가 해결할 수 없는 문제로 내용을 못 보여줄 때'],
          ['주의', '‘알 수 없는 오류’만 쓰지 마세요 — 문의할 때 쓸 코드를 보여주세요'],
        ]}
      />
    </Card>
  )
}
