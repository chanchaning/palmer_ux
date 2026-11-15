import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { APP, Ico, MiniMap, OsSeg, Phone, SysDialog, Tile, type OS } from '../shared'
import { q, stageOf } from '../util'

/* ---------- 07 다시 묻기 ---------- */
type RS = 'never' | 'denied' | 'blocked' | 'granted'
const R_LOG = <>‘근처 산책로 보기’를 누르고 <b>거절</b>해 보세요</>

export function ReAsk() {
  const [os, setOs] = useState<OS>('ios')
  const [rs, setRs] = useState<RS>('never')
  const [used, setUsed] = useState(0)
  const [dlg, setDlg] = useState(false)
  const [sheet, setSheet] = useState<'why' | 'settings' | null>(null)
  const [log, setLog] = useState<ReactNode>(R_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const max = os === 'ios' ? 1 : 2

  const reset = () => { setRs('never'); setUsed(0); setDlg(false); setSheet(null); setLog(R_LOG) }
  const ask = () => { setDlg(true); setUsed(u => u + 1) }
  const feat = () => {
    if (rs === 'granted') { setLog(<>이미 허용 — <b>창 없이</b> 바로 지도를 보여줘요</>); return }
    if (rs === 'never') { ask(); setLog(<>기능을 누른 순간 <b>처음</b> 물어봐요</>); return }
    if (rs === 'denied') { setSheet('why'); setLog(<>한 번 거절 → 이번엔 <b>이유부터</b> 설명하고 다시 물어봐요</>); return }
    setSheet('settings'); setLog(<>더는 시스템 창을 못 띄워요 → <b>설정 안내</b>와 다른 길</>)
  }
  const answer = (allow: boolean) => {
    setDlg(false)
    if (allow) { setRs('granted'); setLog(<><b>허용</b> — 이유를 듣고 나서 마음이 바뀌었어요</>); return }
    if (os === 'ios' || used >= 2) {
      setRs('blocked')
      setLog(os === 'ios'
        ? <>iOS는 <b>한 번 거절하면 끝</b> — 다음부터 요청해도 창이 안 떠요</>
        : <>Android도 <b>두 번째 거절</b>부터는 OS가 알아서 거절해요</>)
    } else {
      setRs('denied'); setLog(<>Android는 거절해도 <b>한 번 더</b> 물을 수 있어요 — 단, 기능을 다시 쓸 때</>)
    }
  }
  const demo = useDemo({
    reset,
    async play(c) {
      const d = dev.current
      await c.press(d, q(d, 'feat')); await c.sleep(1000)
      await c.press(d, q(d, 'r-no')); await c.sleep(1500)
      await c.press(d, q(d, 'feat')); await c.sleep(1300)
      if (os === 'and') {
        await c.press(d, q(d, 'why-go')); await c.sleep(1000)
        await c.press(d, q(d, 'r-no')); await c.sleep(1500)
        await c.press(d, q(d, 'feat')); await c.sleep(1600)
      }
    },
  })

  const btns = os === 'ios'
    ? [{ k: 'r-no', label: '허용 안 함', on: () => answer(false) }, { k: 'r-yes', label: '앱 사용 중에만 허용', on: () => answer(true), strong: true }]
    : [{ k: 'r-yes', label: '앱 사용 중에만 허용', on: () => answer(true) }, { k: 'r-no', label: '허용 안함', on: () => answer(false) }]

  return (
    <Card id="pm-reask" num="07" title="다시 묻기" en="Re-ask in Context" demo={demo}
      desc="거절한 사람에게 다시 물을 땐 그 기능을 다시 쓰려는 순간을 골라요. 다만 OS가 허락하는 횟수가 정해져 있어요 — iOS는 한 번, Android는 두 번이에요.">
      <Stage log={log} logId="pm-reask-log">
        <OsSeg os={os} onChange={o => { setOs(o); reset() }} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">{APP}</div>
            <MiniMap mode={rs === 'granted' ? 'precise' : 'none'} h={180} />
            <div className="pm-body">
              <button className="btn sm pm-wide" data-k="feat" onClick={feat}><Ico n="pin" size={15} />근처 산책로 보기</button>
              <p className="pm-p">{rs === 'granted' ? '가까운 산책로 3곳이에요.' : rs === 'never' ? '아직 위치를 묻지 않았어요.' : rs === 'denied' ? '위치를 거절했어요 (다시 물을 수 있음)' : '위치를 거절했어요 (더는 못 물음)'}</p>
            </div>
          </div>
          <div className={'scrim' + (sheet ? ' on' : '')} onClick={() => setSheet(null)} />
          <div className={'sheet' + (sheet === 'why' ? ' on' : '')} inert={sheet !== 'why'} role="dialog" aria-label="위치가 필요한 이유">
            <div className="pm-sheet">
              <b>산책로를 찾으려면 위치가 필요해요</b>
              <p>지금 있는 곳에서 가까운 길만 골라 드려요. 위치는 저장하지 않아요.</p>
              <button className="btn sm" data-k="why-go" onClick={() => { setSheet(null); ask(); setLog(<>이유를 듣고 <b>두 번째 시스템 창</b> — 이게 마지막 기회예요</>) }}>계속</button>
              <button className="pm-link" onClick={() => { setSheet(null); setLog(<>‘괜찮아요’ — 기회를 쓰지 않고 그대로 둬요</>) }}>괜찮아요</button>
            </div>
          </div>
          <div className={'sheet' + (sheet === 'settings' ? ' on' : '')} inert={sheet !== 'settings'} role="dialog" aria-label="설정에서 켜기">
            <div className="pm-sheet">
              <b>설정에서 위치를 켜 주세요</b>
              <p>설정 › {APP} › 위치 › ‘앱을 사용하는 동안’</p>
              <button className="btn sm" data-k="set-open" onClick={() => { setSheet(null); setRs('granted'); setLog(<>설정에서 켜고 돌아와 <b>바로 지도</b> — ‘설정으로 보내기’ 카드 참고</>) }}>설정 열기</button>
              <button className="pm-link" onClick={() => { setSheet(null); setLog(<><b>동네 직접 고르기</b> — 권한 없이도 이어져요</>) }}>동네 직접 고르기</button>
            </div>
          </div>
          <SysDialog os={os} open={dlg} id="pm-reask-dt" icon="pin" btns={btns}
            title={os === 'ios' ? `‘${APP}’이 위치를 사용하도록 허용할까요?` : `${APP}에서 이 기기의 위치에 액세스하도록 허용할까요?`}
            body={os === 'ios' ? '가까운 산책로를 찾는 데 써요.' : undefined} />
        </Phone>
        <div className="pm-meter" aria-label={`시스템 창 ${used}번 씀, 최대 ${max}번`}>
          시스템 창 {Array.from({ length: max }, (_, i) => <span key={i} className={'pm-pip' + (i < used ? ' used' : ' on')} />)}
          <b>{Math.max(0, max - used)}번 남음</b>
        </div>
      </Stage>
      <Info
        spec={[['iOS', '한 번'], ['Android', '두 번 거절하면 끝'], ['다시 물을 때', '기능을 쓰는 순간']]}
        usage={[
          ['언제', '거절한 사람이 그 기능을 다시 쓰려고 할 때 — 앱을 켤 때마다가 아니라'],
          ['주의', '거절 직후 바로 또 묻지 마세요. 마지막 기회는 이유를 설명한 다음에 쓰고, 그 뒤엔 설정 안내로 넘어가요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 일부만 허용 ---------- */
const PHOTOS = Array.from({ length: 9 }, (_, i) => i)
const PA_LOG = <>‘사진 불러오기’를 누르고 <b>사진 선택…</b>을 골라 보세요</>

export function Partial() {
  const [kind, setKind] = useState<'photo' | 'loc'>('photo')
  const [access, setAccess] = useState<'none' | 'some' | 'all' | 'deny'>('none')
  const [dlg, setDlg] = useState(false)
  const [picker, setPicker] = useState(false)
  const [sel, setSel] = useState<number[]>([])
  const [draft, setDraft] = useState<number[]>([])
  const [prec, setPrec] = useState(false)
  const [ldlg, setLdlg] = useState(false)
  const [log, setLog] = useState<ReactNode>(PA_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = (k = kind) => {
    setAccess('none'); setDlg(false); setPicker(false); setSel([]); setDraft([]); setPrec(false); setLdlg(false)
    setLog(k === 'photo' ? PA_LOG : <>대략적인 위치만 허용한 상태예요. <b>길찾기</b>를 눌러 보세요</>)
  }
  const openPicker = () => { setDraft(sel); setPicker(true) }
  const demo = useDemo({
    reset: () => reset(),
    async play(c) {
      const d = dev.current
      if (kind === 'photo') {
        await c.press(d, q(d, 'ask')); await c.sleep(1000)
        await c.press(d, q(d, 'pick')); await c.sleep(800)
        for (const i of [1, 3, 4]) { await c.press(d, q(d, 'ph-' + i)); await c.sleep(350) }
        await c.press(d, q(d, 'done')); await c.sleep(1800)
      } else {
        await c.press(d, q(d, 'route')); await c.sleep(1000)
        await c.press(d, q(d, 'l-once')); await c.sleep(1800)
      }
    },
  })

  return (
    <Card id="pm-partial" num="08" title="일부만 허용" en="Partial Access" demo={demo}
      desc="‘전부’ 아니면 ‘거절’이 아니에요. 사진은 고른 것만, 위치는 대략적으로만 줄 수 있어요. 앱은 그 범위 안에서도 제대로 돌아가야 해요.">
      <Stage log={log} logId="pm-partial-log">
        <Seg value={kind} onChange={v => { setKind(v); reset(v) }} className="pm-seg" options={[['photo', '사진 일부만'], ['loc', '대략적 위치']]} />
        <Phone ref={dev}>
          {kind === 'photo' ? (
            <div className="scr">
              <div className="bar">산책 앨범</div>
              <div className="pm-body">
                {access === 'none' && (
                  <div className="pm-box">
                    <p>산책하며 찍은 사진으로 앨범을 만들어요.</p>
                    <button className="btn sm" data-k="ask" onClick={() => { setDlg(true); setLog(<>사진은 선택지가 <b>세 가지</b> — 일부, 전체, 거절</>) }}>사진 불러오기</button>
                  </div>
                )}
                {access === 'some' && (
                  <div className="pm-banner">
                    <span>고른 사진 <b>{sel.length}장</b>만 볼 수 있어요</span>
                    <button data-k="more" onClick={() => { openPicker(); setLog(<>언제든 <b>더 고르기</b> — 범위를 넓힐 길을 앱 안에 둬요</>) }}>더 고르기</button>
                  </div>
                )}
                {access === 'deny' && <div className="pm-box"><p>사진 없이도 글로 산책 기록을 남길 수 있어요.</p></div>}
                {(access === 'some' || access === 'all') && (
                  <div className="pm-grid">{(access === 'all' ? PHOTOS : sel).map(i => <Tile key={i} i={i} />)}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="scr">
              <div className="bar">동네 소식</div>
              <MiniMap mode={prec ? 'precise' : 'approx'} h={180} />
              <div className="pm-body">
                <div className="pm-chips"><span className="badge done">{prec ? '정확한 위치 · 이번만' : '대략적인 위치'}</span></div>
                <p className="pm-p">{prec ? '빵집까지 걸어서 6분, 큰길로 안내할게요.' : '물결동 근처 소식이에요. 동네 단위라 충분해요.'}</p>
                {!prec && <button className="btn sm" data-k="route" onClick={() => { setLdlg(true); setLog(<>정확도가 꼭 필요한 기능에서만 <b>잠깐 올려 달라고</b> 해요</>) }}>가까운 빵집 길찾기</button>}
              </div>
            </div>
          )}

          {picker && (
            <div className="pm-picker" role="dialog" aria-label="사진 선택">
              <div className="pm-picker-bar">
                <button onClick={() => setPicker(false)}>취소</button>
                <b>{draft.length}장 선택</b>
                <button data-k="done" className="strong" onClick={() => {
                  setPicker(false); setSel(draft); setAccess('some')
                  setLog(<>고른 <b>{draft.length}장</b>만 앱에 보여요 — 나머지 사진은 앱이 모르는 상태</>)
                }}>완료</button>
              </div>
              <div className="pm-grid">
                {PHOTOS.map(i => (
                  <button key={i} className="pm-pick" data-k={'ph-' + i} aria-pressed={draft.includes(i)} aria-label={`사진 ${i + 1}`}
                    onClick={() => setDraft(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i])}>
                    <Tile i={i} />{draft.includes(i) && <span className="pm-tick"><Ico n="check" size={12} /></span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <SysDialog os="ios" open={dlg} id="pm-partial-dt"
            title={`‘${APP}’이 사진에 접근하려고 해요`} body="고른 사진으로 산책 앨범을 만들어요."
            btns={[
              { k: 'pick', label: '사진 선택…', on: () => { setDlg(false); openPicker(); setLog(<>앱에 보여줄 사진만 <b>골라요</b></>) } },
              { k: 'all', label: '모든 사진 허용', on: () => { setDlg(false); setAccess('all'); setLog(<><b>전체 허용</b> — 앨범 전체가 앱에 보여요</>) } },
              { k: 'no', label: '허용 안 함', on: () => { setDlg(false); setAccess('deny'); setLog(<><b>거절</b> — 사진 없이 쓸 길을 남겨요</>) } },
            ]} />
          <SysDialog os="ios" open={ldlg} id="pm-partial-ldt"
            title={`‘${APP}’이 정확한 위치를 잠시 쓰려고 해요`} body="길 안내는 정확한 위치가 있어야 해요."
            btns={[
              { k: 'l-once', label: '이번만 정확한 위치 허용', on: () => { setLdlg(false); setPrec(true); setLog(<><b>이번만 정확하게</b> — 길찾기가 끝나면 다시 대략적으로 돌아가요</>) } },
              { k: 'l-no', label: '대략적인 위치 유지', on: () => { setLdlg(false); setLog(<>그대로 유지 — <b>동네 단위 안내</b>로 이어가요</>) } },
            ]} />
        </Phone>
      </Stage>
      <Info
        spec={[['사진', '고른 것만'], ['위치', '수 km 범위'], ['앱 할 일', '범위 넓힐 길']]}
        usage={[
          ['언제', '사진·연락처·위치처럼 전부가 아니어도 기능이 되는 권한'],
          ['주의', '일부만 줬다고 계속 ‘전체 허용’을 조르지 마세요. ‘더 고르기’처럼 사용자가 원할 때 넓힐 길만 남겨 둬요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 거절 뒤 화면 ---------- */
const AREAS = ['솔빛동', '물결동', '바람동']
const SHOPS: Record<string, [string, string][]> = {
  '': [['구름 베이커리', '오늘 인기 1위'], ['소금꽃 빵집', '소금빵 맛집'], ['아침결', '새벽 6시 오픈']],
  솔빛동: [['솔빛 제과', '단팥빵 · 도보 지도'], ['햇살 오븐', '식빵 전문']],
  물결동: [['물결동 빵집', '소금빵 · 깜파뉴'], ['작은 굽기', '쿠키 · 스콘'], ['파도 베이글', '베이글 12종']],
  바람동: [['바람 제빵소', '바게트'], ['느린 반죽', '천연 발효']],
}
const D_LOG = <>위치를 거절한 상태예요. <b>동네</b>를 골라 보세요</>

export function DeniedState() {
  const [mode, setMode] = useState<'good' | 'bad'>('good')
  const [area, setArea] = useState('')
  const [banner, setBanner] = useState(true)
  const [shake, setShake] = useState(0)
  const [log, setLog] = useState<ReactNode>(D_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = (m = mode) => { setArea(''); setBanner(true); setShake(0); setLog(m === 'good' ? D_LOG : <>나쁜 예예요. <b>확인</b>을 눌러 보세요</>) }
  const demo = useDemo({
    reset: () => reset(),
    async play(c) {
      const d = dev.current
      if (mode === 'bad') {
        await c.press(d, q(d, 'bad-ok')); await c.sleep(1200)
        await c.press(d, q(d, 'bad-ok')); await c.sleep(1600)
        await c.press(stageOf(d), stageOf(d)?.querySelector<HTMLElement>('button[data-v="good"]') ?? null); await c.sleep(800)
      }
      const d2 = dev.current
      await c.press(d2, q(d2, 'a-1')); await c.sleep(1300)
      await c.press(d2, q(d2, 'a-2')); await c.sleep(1100)
      await c.press(d2, q(d2, 'x')); await c.sleep(1200)
    },
  })

  return (
    <Card id="pm-denied" num="09" title="거절 뒤 화면" en="Denied State · Graceful Degradation" demo={demo}
      desc="권한이 없어도 앱은 멈추지 않아야 해요. 덜 편하더라도 직접 고르는 길로 기능을 이어가고, 켜는 방법은 작게 남겨 둬요.">
      <Stage log={log} logId="pm-denied-log">
        <Seg value={mode} onChange={v => { setMode(v); reset(v) }} className="pm-seg" options={[['good', '대신 쓸 길'], ['bad', '막다른 화면']]} />
        <Phone ref={dev}>
          {mode === 'good' ? (
            <div className="scr">
              <div className="bar">근처 빵집</div>
              {banner && (
                <div className="pm-banner top">
                  <Ico n="pin" size={15} />
                  <span>위치를 켜면 가까운 순으로 보여드려요</span>
                  <button data-k="on" onClick={() => setLog(<><b>켜기</b> → 설정 앱 화면으로 바로 (06 카드)</>)}>켜기</button>
                  <button className="pm-x" data-k="x" aria-label="안내 닫기" onClick={() => { setBanner(false); setLog(<>닫으면 <b>한동안 다시 안 띄워요</b> — 조르지 않기</>) }}><Ico n="x" size={14} /></button>
                </div>
              )}
              <div className="pm-body">
                <div className="pm-sub">어느 동네에서 찾을까요?</div>
                <div className="pm-chips">
                  {AREAS.map((a, i) => (
                    <button key={a} className="chip" data-k={'a-' + i} aria-pressed={area === a}
                      onClick={() => { const v = area === a ? '' : a; setArea(v); setLog(v ? <><b>{a}</b> 빵집 {SHOPS[a].length}곳 — 위치 없이도 기능은 그대로</> : D_LOG) }}>{a}</button>
                  ))}
                </div>
                <div className="pm-sub">{area ? area + ' 빵집' : '요즘 인기 빵집'}</div>
                {SHOPS[area].map(([n, s], i) => (
                  <div className="pm-order pm-in" key={area + n}><span className={'pm-thumb g' + ((i % 4) + 1)} /><div><b>{n}</b><span className="sub">{s}</span></div></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="scr pm-dead">
              <div className="bar">근처 빵집</div>
              <div className="pm-dead-in" key={shake} data-shake={shake > 0 || undefined}>
                <Ico n="lock" size={36} />
                <b>위치 권한이 필요합니다</b>
                <p>이 앱은 위치 권한 없이 사용할 수 없습니다.</p>
                <button className="btn sm" data-k="bad-ok" onClick={() => {
                  setShake(s => s + 1)
                  setLog(shake === 0 ? <><b>확인</b>을 눌러도 같은 화면 — 할 수 있는 게 없어요</> : <>또 같은 화면… 이쯤에서 <b>앱을 지워요</b></>)
                }}>확인</button>
              </div>
            </div>
          )}
        </Phone>
      </Stage>
      <Info
        spec={[['기능', '줄여서라도 계속'], ['대안', '직접 고르기 · 검색'], ['켜기 안내', '작게 · 닫을 수 있게']]}
        usage={[
          ['언제', '권한을 거절했거나, 일부만 줬거나, 나중에 설정에서 껐을 때'],
          ['주의', '권한 없이는 아무것도 못 하게 막지 마세요. 앱 심사에서도 ‘권한이 없으면 못 쓰는 앱’은 문제가 될 수 있어요'],
        ]}
      />
    </Card>
  )
}
