import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Range, Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { AnalogBar, CaseCard, Cite, Finding, Hmi, PriBadge, Refs, useVisibleInterval, type RefItem } from '../ui'
import { PRI, SAFE_ALARMS, SAFE_PLACE, SAFE_RANGES, rng, type Pri } from '../data'
import { Term, TermList } from '../../components/Term'
import './alarm.css'

/* 사전(src/lib/glossary.ts)에 없는 말 — 이 탭에서만 풀어 써요 */
const XT = {
  '채터링': '값이 경보선 바로 근처에서 오르내리며 알람이 울렸다 꺼졌다를 반복하는 것이에요. 문턱에 걸린 문이 계속 덜컹거리는 것과 비슷해요.',
  '연관 억제': '원인 알람 하나가 울리면, 그 때문에 당연히 따라오는 결과 알람은 원인 아래로 접어 두는 방법이에요. 지우는 게 아니라 눌러서 펼쳐 볼 수 있어요.',
  '%LEL': '가스가 불붙어 터질 수 있는 가장 낮은 농도를 100으로 볼 때, 지금 농도가 얼마인지예요. 10%LEL이면 그 위험선의 10분의 1이에요.',
  '오경보': '실제로는 위험이 없는데 울린 알람이에요. 먼지 때문에 연기 감지기가 울리는 경우가 대표적이에요. ‘헛알람’이라고도 해요.',
  '정상 복귀': '알람을 울린 값이 다시 정상 범위로 돌아온 상태예요. 값은 돌아왔어도, 사람이 아직 못 봤다면 알람은 끝나지 않은 거예요.',
  '웨어러블': '작업자가 몸에 차는 작은 장치예요. 넘어짐이나 오래 움직이지 않음을 감지해서 상황실로 알려요.',
}

/* 참고 문헌 번호 — Refs 순서와 같아요 */
const R = { isa182: 1, isa182kpi: 2, eemua: 3, sendel: 4, child: 5, isa101: 6, healey: 7, wcag: 8, palmer: 9, practice: 10 }

const pad = (n: number) => String(n).padStart(2, '0')
/** 분(소수) → 시각 문자열. base 는 시작 시각(분) */
const clock = (min: number, base = 13 * 60 + 30) => { const m = Math.floor(base + min); return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}` }
const alarmById = (id: string) => SAFE_ALARMS.find(a => a.id === id)!
/** 초 → 'hh:mm:ss' */
const hms = (s: number) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`
const T0 = 14 * 3600 + 5 * 60 + 40 // 목업 속 '지금' 14:05:40

/** 요소 너비 (차트를 글자 크기 그대로 반응형으로 그리려고) */
function useWidth<T extends HTMLElement>(init = 640) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(init)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(es => setW(Math.max(280, Math.round(es[0].contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/* ================= 0. 흔한 실수 — before/after 목업 ================= */
/** 화면에 보일 때만 ms 마다 1씩 오르는 카운터 */
function useTick(ms: number) {
  const [k, setK] = useState(0)
  const ref = useVisibleInterval(() => setK(x => x + 1), ms)
  return [ref, k] as const
}
/** 흔한 안전관리 화면 프레임 — 남색 바탕, 초록 램프, 빨강 글자 */
function BadHmi({ title, right, children }: { title: ReactNode; right?: ReactNode; children: ReactNode }) {
  return <Hmi dark className="al-bad" title={title} right={right}>{children}</Hmi>
}
const Lamp = () => <i className="al-lamp" aria-hidden="true" />
const RtnMark = () => <span className="al-ghost" title="정상 복귀 · 미확인"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="16" height="16" rx="2" /></svg>복귀</span>

/* A. 해제된 알람이 사라짐 */
function VanishBefore() {
  return (
    <div className="al-mk">
      <BadHmi title="통합 안전 모니터링" right={hms(T0)}>
        <div className="al-bad-ok"><Lamp />이상 없음 · 현재 알람 0건</div>
        <div className="al-bad-empty">표시할 알람이 없습니다</div>
        <div className="al-bad-foot">오늘 처리 이력 0건</div>
      </BadHmi>
      <p className="al-mk-cap">14:05:21에 ‘지하 밀폐공간 · 작업자 무응답’이 떴어요. 12초 뒤 움직임이 다시 잡히자 알람이 저절로 지워졌어요. 그사이 전화를 받던 근무자는 이 일이 있었는지 알 길이 없어요.</p>
    </div>
  )
}
function VanishAfter() {
  const [ack, setAck] = useState(false)
  return (
    <div className="al-mk">
      <Hmi title="알람 목록 · 신축 현장" right={hms(T0)}>
        {!ack ? (
          <div className="al-mk-row">
            <RtnMark />
            <time>14:05:21</time>
            <span className="w">지하 밀폐공간</span>
            <span className="x">작업자 무응답 12초 → 14:05:33 움직임 다시 감지</span>
            <button type="button" className="btn sm al-mk-btn" onClick={() => setAck(true)}>확인</button>
          </div>
        ) : (
          <div className="al-mk-done">
            <span>목록이 비었어요.</span>
            <span className="log"><time>{hms(T0)}</time> 근무자 2 확인 · 작업자와 통화, 이상 없음</span>
            <button type="button" className="btn sm ghost al-mk-btn" onClick={() => setAck(false)}>되돌리기</button>
          </div>
        )}
      </Hmi>
      <p className="al-mk-cap">값이 돌아와도 줄은 ‘복귀 · 미확인’으로 남아요. 색은 빼고 테두리만 남겨 급한 알람과 헷갈리지 않게 해요. ‘확인’을 눌러 보세요. 그때 사라지고, 이력이 남아요.</p>
    </div>
  )
}

/* B. 최신순 + 자동 넘김 */
const ATIME: Record<string, string> = { 'S-101': '14:02:05', 'S-102': '14:03:40', 'S-103': '14:04:10', 'S-104': '14:04:30', 'S-105': '14:05:02', 'S-106': '14:05:18' }
const NEWEST = [...SAFE_ALARMS].sort((a, b) => ATIME[b.id].localeCompare(ATIME[a.id]))
const BY_PRI = [...SAFE_ALARMS].sort((a, b) => a.pri - b.pri || ATIME[b.id].localeCompare(ATIME[a.id]))
function RotateBefore() {
  const [ref, k] = useTick(3000)
  const i = k % NEWEST.length, a = NEWEST[i]
  return (
    <div className="al-mk" ref={ref}>
      <BadHmi title="실시간 알람" right={<>최신순 · 3초마다 자동 넘김</>}>
        <div className="al-bad-card" aria-live="off">
          <span className="no">알람 {i + 1} / {NEWEST.length}</span>
          <b className="al-red">[경고] {a.what}</b>
          <span className="al-red w">{a.where}</span>
          <time>{ATIME[a.id]}</time>
        </div>
        <div className="al-bad-dots" aria-hidden="true">{NEWEST.map((x, j) => <i key={x.id} className={j === i ? 'on' : ''} />)}</div>
      </BadHmi>
      <p className="al-mk-cap">화재(도장 부스)는 가장 먼저 났어요. 그래서 맨 뒤 6번째예요. 한 바퀴 18초 중 3초만 화면에 있어요. 지금 보이는 건 {i === NEWEST.length - 1 ? '마침 화재예요.' : `${i + 1}번째 알람이에요. 화재가 나오려면 ${(NEWEST.length - 1 - i) * 3}초 남았어요.`}</p>
    </div>
  )
}
function RotateAfter() {
  return (
    <div className="al-mk">
      <Hmi title="알람 목록 · 우선순위순" right="자동 넘김 없음">
        <ol className="al-mk-list">
          {BY_PRI.map(a => (
            <li key={a.id} className={a.id === 'S-101' ? 'top' : ''}><PriBadge p={a.pri} /><time>{ATIME[a.id].slice(0, 5)}</time><span className="w">{a.where}</span><span className="x">{a.what}</span></li>
          ))}
        </ol>
      </Hmi>
      <p className="al-mk-cap">우선순위가 먼저, 같은 우선순위 안에서는 최신이 위예요. 화재는 처음부터 맨 위에 있고, 확인할 때까지 그 자리에 있어요.</p>
    </div>
  )
}

/* C. 확인·보류 없음, 오경보 기록 없음, 절차 안 맞음 */
function AckBefore() {
  const [gone, setGone] = useState(false)
  return (
    <div className="al-mk">
      <BadHmi title="이벤트 알림" right="14:04:10">
        {!gone ? (
          <div className="al-bad-pop">
            <b className="al-red">[경고] 가스 감지 — 화학물질 창고</b>
            <span>가연성 가스 12</span>
            <span className="sop">연결된 절차: 화재 대응 매뉴얼(공통) — 1. 소화기 위치 확인 2. 119 신고</span>
            <div className="btns">
              <button type="button" onClick={() => setGone(true)}>닫기</button>
              <button type="button" onClick={() => setGone(true)}>오경보 처리</button>
            </div>
          </div>
        ) : (
          <div className="al-bad-empty">표시할 이벤트가 없습니다<small>처리 이력: 없음</small></div>
        )}
      </BadHmi>
      <p className="al-mk-cap">{gone ? '어느 버튼을 눌러도 창이 사라지고, 아무 기록도 남지 않았어요. ' : '‘닫기’나 ‘오경보 처리’를 눌러 보세요. '}{gone && <button type="button" className="al-mk-link" onClick={() => setGone(false)}>다시 띄우기</button>}</p>
    </div>
  )
}
type AckSt = 'unack' | 'ack' | 'shelved'
function AckAfter() {
  const [st, setSt] = useState<AckSt>('unack')
  const [review, setReview] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const sec = useRef(14 * 3600 + 4 * 60 + 22)
  const add = (txt: string) => { sec.current += 9; setLog(l => [`${hms(sec.current)} 근무자 2 · ${txt}`, ...l].slice(0, 4)) }
  const reset = () => { setSt('unack'); setReview(false); setLog([]); sec.current = 14 * 3600 + 4 * 60 + 22 }
  const g = alarmById('S-103')
  return (
    <div className="al-mk">
      <Hmi title="알람 상세 · 제2공장" right="14:04:10 발생">
        <div className={'al-mk-detail st-' + st}>
          <div className="head">
            {st === 'unack' ? <span className="al-blink"><PriBadge p={2} /></span> : <PriBadge p={2} />}
            <b>{g.where}</b>
            <span className="tag">{st === 'unack' ? '미확인' : st === 'ack' ? '확인함' : '보류 · 30분 뒤 자동 해제'}{review ? ' · 오경보 검토 중' : ''}</span>
          </div>
          <p className="what">{g.what}</p>
          <div className="sop"><span>가스 이상 대응 절차</span><ol><li>환기 장치 가동 확인</li><li>누출 점검 요청</li><li>정상으로 돌아올 때까지 구역 출입 제한</li></ol></div>
          <div className="btns">
            <button type="button" className="btn sm" disabled={st !== 'unack'} onClick={() => { setSt('ack'); add('확인') }}>확인</button>
            <button type="button" className="btn sm ghost" disabled={st === 'shelved'} onClick={() => { setSt('shelved'); add('보류 30분 · 이유: 센서 교정 작업 중') }}>보류 30분</button>
            <button type="button" className="btn sm ghost" disabled={review} onClick={() => { setReview(true); if (st === 'unack') setSt('ack'); add('오경보 보고 · 이유: 센서 오염 의심 → 설비팀 점검 요청') }}>오경보 보고</button>
            <button type="button" className="btn sm ghost" onClick={reset}>처음으로</button>
          </div>
          <ol className="log" aria-label="조치 이력" aria-live="polite">
            {log.length === 0 ? <li className="none">조치 이력이 아직 없어요.</li> : log.map(l => <li key={l}>{l}</li>)}
          </ol>
        </div>
      </Hmi>
      <p className="al-mk-cap">버튼마다 하는 일이 달라요. 누를 때마다 시각·근무자·이유가 이력에 남아요. 오경보 보고는 알람을 지우지 않고 ‘검토 중’ 표시만 붙여요.</p>
    </div>
  )
}

/* D. 값이 바뀔 때마다 소리 */
const GAS_STEPS = [12, 13, 13, 14, 15, 15, 16]
function ResoundBefore() {
  const [ref, k] = useTick(2000)
  const v = GAS_STEPS[k % GAS_STEPS.length]
  const rings = 1 + k
  return (
    <div className="al-mk" ref={ref}>
      <BadHmi title="가스 감시 · 화학물질 창고" right="값이 오면 바로 갱신">
        <div className="al-bad-gas">
          <b className="al-red">가연성 가스 {v}%LEL</b>
          <span className="snd"><span className="al-wave" aria-hidden="true"><i /><i /><i /></span>삐— 같은 알람에서 {rings}번째 울림</span>
        </div>
      </BadHmi>
      <p className="al-mk-cap">숫자가 바뀔 때마다 소리가 처음부터 다시 울려요(실제 소리는 나지 않아요). 30분이면 수백 번이에요. 근무자는 결국 스피커 볼륨을 줄여요.</p>
    </div>
  )
}
function ResoundAfter() {
  const [ref, k] = useTick(2000)
  const v = GAS_STEPS[k % GAS_STEPS.length]
  return (
    <div className="al-mk" ref={ref}>
      <Hmi title="가스 감시 · 화학물질 창고" right="2초마다 갱신">
        <div className="al-mk-gas">
          <div className="top"><PriBadge p={2} /><span>가연성 가스</span><b>{v}<small>%LEL</small></b></div>
          <AnalogBar value={v} min={SAFE_RANGES.lel.min} max={SAFE_RANGES.lel.max} normal={SAFE_RANGES.lel.normal} alarm={SAFE_RANGES.lel.alarm} unit="%LEL" name="화학물질 창고 가연성 가스" w="100%" />
          <span className="snd">소리: 14:04:10에 1번 울림 · 확인해서 멈춤 · 값이 바뀌어도 다시 울리지 않음</span>
        </div>
      </Hmi>
      <p className="al-mk-cap">값은 화면에서 계속 바뀌어요. 소리는 새 알람이 생길 때와 우선순위가 오를 때(예: 25%LEL을 넘어 긴급으로)만 다시 울려요.</p>
    </div>
  )
}

/* E. 잘한 예 — 알람이 뜨면 CCTV 순환 멈춤 */
const CAMS = ['프레스 라인 1', '상하차장 2', '지게차 통로 1', '도장 부스 2', '타워크레인 1', '고소작업 3', '화학물질 창고 1', '정문 게이트']
function CamBox({ name, hot = false, big = false }: { name: string; hot?: boolean; big?: boolean }) {
  return <div className={'al-cam' + (hot ? ' hot' : '') + (big ? ' big' : '')}><span>CCTV · {name}</span>{hot && <em>연기 감지 구역</em>}</div>
}
function CamBefore() {
  const [ref, k] = useTick(3000)
  const page = k % 2
  return (
    <div className="al-mk" ref={ref}>
      <BadHmi title="CCTV · 자동 순환 3초" right={<span className="al-red">화재 알람 · 도장 부스</span>}>
        <div className="al-cam-grid">{CAMS.slice(page * 4, page * 4 + 4).map(c => <CamBox key={c} name={c} hot={c === '도장 부스 2'} />)}</div>
      </BadHmi>
      <p className="al-mk-cap">알람이 떠도 순환은 계속돼요. 도장 부스 카메라는 두 장 중 한 장에만 있어서, 3초 보이고 3초 사라져요.</p>
    </div>
  )
}
function CamAfter() {
  return (
    <div className="al-mk">
      <Hmi title="CCTV · 순환 멈춤 — 알람 카메라 고정" right={<><PriBadge p={1} /> 도장 부스 화재 · 미확인</>}>
        <div className="al-cam-focus">
          <CamBox name="도장 부스 2 (알람 연결)" hot big />
          <div className="al-cam-side">{['도장 부스 1', '도장 부스 출입구', '제2공장 비상구 2'].map(c => <CamBox key={c} name={c} />)}</div>
        </div>
      </Hmi>
      <p className="al-mk-cap">알람 구역 카메라를 크게, 바로 옆 카메라를 작게 붙여요. 근무자가 알람을 확인하면 순환이 다시 돌아요.</p>
    </div>
  )
}

function Mistakes() {
  return (
    <div className="al-cases">
      <CaseCard sev="치명" title="정상으로 돌아온 알람이 몇 초 뒤 흔적 없이 사라져요"
        before={<VanishBefore />} after={<VanishAfter />}
        now={<>값이 정상으로 돌아오면 알람 줄을 바로 지워요. 화면에는 초록 ‘이상 없음’만 남아요.</>}
        why={<>이건 안전관리 화면이 해서는 안 되는 일이에요. 작업자가 쓰러졌다가 12초 만에 일어났어도, 그 12초는 사고예요. 알람 관리 표준은 이런 경우를 <b>‘정상 복귀 · 미확인’</b>이라는 별도 상태로 둬요 <Cite n={R.isa182} />. 사람이 보기 전까지 알람은 끝난 게 아니에요. 지워 버리면 근무자는 무슨 일이 있었는지조차 몰라요.</>}
        fix={<>값이 돌아와도 줄을 <b>‘복귀 · 미확인’</b>으로 남겨요. 근무자가 <b>확인</b>을 눌러야 사라지고, 누가 언제 봤는지 이력에 남겨요. 작업자 무응답처럼 사람에 관한 알람은, 확인할 때 작업자에게 연락해 상태를 묻게 해요.</>} />

      <CaseCard sev="치명" title="우선순위를 매겨 놓고, 목록은 최신순으로 몇 초마다 넘어가요"
        before={<RotateBefore />} after={<RotateAfter />}
        now={<>알람 카드가 3초마다 자동으로 넘어가요. 순서는 들어온 순서(최신순)예요. 우선순위가 있어도 순서에는 쓰지 않고, 모든 글자가 빨강이에요.</>}
        why={<>우선순위는 ‘무엇부터 볼지’ 정하려고 매겨요 <Cite n={R.eemua} />. 최신순이면 가장 먼저 난 화재가 맨 뒤로 밀려요. 자동 넘김까지 겹치면 화재는 18초 중 3초만 화면에 있어요. 근무자가 마침 그 3초에 보고 있어야 해요. 운에 맡기는 화면이에요.</>}
        fix={<>목록은 <b>우선순위 → 시각</b> 순으로 세워요. 자동 넘김은 없애요. 긴급은 맨 위에, 확인할 때까지 고정해요. 긴급이 아닌 새 알람은 ‘새 알람 n건’으로 모아 둬요(<a href="#/dash/realtime">05 실시간 갱신</a>).</>} />

      <CaseCard sev="높음" title="‘확인’도 ‘보류’도 없고, ‘오경보 처리’는 눌러도 기록이 안 남아요"
        before={<AckBefore />} after={<AckAfter />}
        now={<>알람 창에 ‘닫기’와 ‘오경보 처리’ 버튼만 있어요. 둘 다 누르면 창이 사라지고 기록이 없어요. 대응 절차는 이벤트 종류와 상관없이 ‘화재 대응’ 하나가 붙어 있어요.</>}
        why={<>‘닫기’는 알람을 끄는 버튼이지, ‘봤다’는 표시가 아니에요. 표준은 <b>확인과 보류를 다른 상태</b>로 나눠요 <Cite n={R.isa182} />. 기록이 없으면 다음 근무자는 이 가스 알람이 처리됐는지 묻혔는지 알 수 없어요. 오경보도 기록이 쌓여야 고칠 센서를 찾을 수 있어요 <Cite n={R.practice} />. 가스 이상에 화재 절차가 뜨면, 근무자는 절차를 무시하는 법부터 배워요.</>}
        fix={<><b>확인 · 보류(시간 + 이유) · 오경보 보고(이유)</b>를 따로 둬요. 누를 때마다 시각·근무자·이유를 이력에 남겨요. 오경보 보고는 알람을 지우지 않고 ‘검토 중’만 붙여요. 대응 절차는 이벤트 종류마다 따로 연결해요(<a href="#/dash/ops">08 기획 · 운영 정의</a>).</>} />

      <CaseCard sev="높음" title="같은 알람인데 값이 바뀔 때마다 소리가 다시 울려요"
        before={<ResoundBefore />} after={<ResoundAfter />}
        now={<>가스 농도가 12, 13, 14%LEL로 바뀔 때마다 알람이 ‘새로 갱신’돼요. 그때마다 소리도 처음부터 다시 울려요.</>}
        why={<>소리는 화면을 안 보는 사람까지 부르는 가장 강한 신호예요. 같은 일로 계속 부르면 헛알람과 똑같이 피로가 쌓여요 <Cite n={R.sendel} />. 근무자가 볼륨을 줄이는 순간, 진짜 화재 소리도 같이 작아져요. 위 이야기에서 현장이 알람을 꺼 버린 것과 같은 길이에요.</>}
        fix={<>소리는 <b>새 알람이 생길 때</b>와 <b>우선순위가 오를 때</b>만 울려요. 값이 바뀌는 건 화면 숫자와 막대로만 알려요. 확인하면 소리가 멈추고, ‘소리만 끄기’와 ‘확인’은 따로 둬요(아래 소리 섹션).</>} />

      <CaseCard good sev="보통" title="알람이 뜨면 CCTV 자동 순환을 멈추고 그 카메라를 앞으로 가져와요"
        before={<CamBefore />} after={<CamAfter />}
        now={<>평소에는 CCTV 화면이 여러 카메라를 돌아가며 보여 줘요. 화재 알람이 뜨면 순환을 멈추고, 그 구역 카메라를 크게 띄워요. 확인을 누른 뒤에 순환을 다시 켜요.</>}
        why={<>알람을 받은 근무자가 가장 먼저 하는 일은 ‘진짜인지 눈으로 보기’예요. 순환이 계속 돌면 그 카메라가 다시 올 때까지 기다리거나, 손으로 찾아야 해요. 알람과 화면이 같은 곳을 가리키면 바로 판단할 수 있어요 <Cite n={R.practice} />.</>}
        fix={<>화면 위에 ‘순환 멈춤 · 알람 카메라 고정’처럼 <b>왜 멈췄는지</b> 적어요. 알람이 두 개 이상이면 우선순위가 높은 카메라부터 띄워요.</>} />
    </div>
  )
}

/* ================= 1. 알람 피로 ================= */
const FATIGUE = [
  { id: 'icu', label: '어린이 병원 중환자실', pct: 87.1, cite: R.child, kind: '연구 결과' },
  { id: 'ward', label: '어린이 병원 일반 병동', pct: 99.0, cite: R.child, kind: '연구 결과' },
  { id: 'low', label: '여러 연구 모음 · 가장 낮은 값', pct: 72, cite: R.sendel, kind: '보고된 수치' },
  { id: 'high', label: '여러 연구 모음 · 가장 높은 값', pct: 99, cite: R.sendel, kind: '보고된 수치' },
] as const
type FId = (typeof FATIGUE)[number]['id']

function Fatigue() {
  const [id, setId] = useState<FId>('icu')
  const f = FATIGUE.find(x => x.id === id)!
  // 알람 100번으로 바꿔서 보여줘요. 진짜 알람을 앞에 모아 세기 쉽게 해요.
  const N = 100
  const real = Math.max(1, Math.round(N * (100 - f.pct) / 100))
  const fake = N - real
  return (
    <div className="al-fat">
      <p className="al-fat-q">병원 모니터 알람이 <b>100번</b> 울렸다고 해 볼게요. 간호사가 정말 달려가야 했던 건 몇 번일까요?</p>
      <Seg value={id} onChange={setId} options={FATIGUE.map(x => [x.id, x.label] as const)} />
      <div className="al-fat-body">
        <div className="al-wf" role="img" aria-label={`알람 100번 중 정말 할 일이 있던 건 ${real}번, 가 보니 할 일이 없던 건 ${fake}번이에요`}>
          <div className="al-wf-grid" aria-hidden="true">
            {Array.from({ length: N }, (_, i) => <i key={i} className={i < real ? 'r' : ''} />)}
          </div>
          <div className="al-wf-key" aria-hidden="true">
            <span><i className="r" />네모 하나 = 알람 1번 · <b>진짜 할 일이 있던 알람 {real}번</b></span>
            <span><i />가 보니 할 일이 없던 알람 {fake}번</span>
          </div>
        </div>
        <div className="al-fat-side">
          <div className="al-fat-num"><span>100번 중 진짜 할 일이 있던 알람</span><b>{real}번</b><Cite n={f.cite} /></div>
          <p>나머지 <b>{fake}번</b>은 달려가 봐도 할 일이 없었어요. 이런 일이 반복되면 사람은 알람이 울려도 ‘또 별일 아니겠지’ 하게 돼요. 양치기 소년 이야기와 같아요.</p>
          <p>안전관리 화면도 똑같아요. 헛알람이 많을수록 진짜 화재나 쓰러짐 알람을 놓쳐요.</p>
          <p className="muted">{f.kind === '보고된 수치' ? `여러 병원 연구를 모은 리뷰 논문에 실린 범위예요(헛알람 ${f.pct}%). 원래 연구를 옮겨 인용한 값이에요(보고된 수치).` : `한 어린이 병원에서 환자 모니터(심장 박동·호흡 등) 알람을 지켜본 연구예요. 헛알람 비율 ${f.pct}%를 100번 기준으로 반올림했어요.`}</p>
        </div>
      </div>
    </div>
  )
}

/* ================= 2. 알람 상태 다이어그램 (ISA-18.2) ================= */
type S = 'NORM' | 'UNACK' | 'ACKED' | 'RTNUN' | 'SHLVD' | 'DSUPR' | 'OOSRV'
const ST: Record<S, { name: string; sub: string; screen: string; sound: string; list: string }> = {
  NORM: { name: '정상', sub: '아무 표시 없음', screen: '회색 그대로예요. 눈에 띌 게 없어요.', sound: '없음', list: '알람 목록에 없어요.' },
  UNACK: { name: '비정상 · 미확인', sub: '색 + 깜빡임 + 소리', screen: '우선순위 색과 모양이 깜빡여요. 화면에서 가장 눈에 띄어야 하는 상태예요.', sound: '울려요', list: '알람 목록 맨 위에 와요.' },
  ACKED: { name: '비정상 · 확인함', sub: '색은 그대로, 깜빡임 멈춤', screen: '운영자가 봤다는 표시로 깜빡임만 멈춰요. 값은 아직 비정상이라 색은 남아요.', sound: '멈춰요', list: '목록에 남아요(확인함 표시).' },
  RTNUN: { name: '정상 복귀 · 미확인', sub: '값은 돌아옴, 확인 대기', screen: '값은 정상으로 돌아왔지만, 운영자가 아직 못 봤어요. 색은 빼고 테두리만 남겨 확인을 기다려요. 표시 방법은 시스템마다 달라요.', sound: '없음', list: '목록에 ‘복귀’로 남아요. 확인하면 사라져요.' },
  SHLVD: { name: '보류', sub: '운영자가 잠시 미룸', screen: '회색 ‘보류’ 표시와 남은 시간이 붙어요. 시간이 지나면 저절로 풀려요.', sound: '없음', list: '알람 목록에서 빠지고 ‘보류 목록’으로 가요.' },
  DSUPR: { name: '설계상 억제', sub: '시스템이 조건 보고 막음', screen: '회색 ‘억제’ 표시와 이유가 붙어요. 예를 들어 프레스를 막 켠 뒤 2분 동안은 진동이 잠깐 높은 게 예상된 일이에요.', sound: '없음', list: '‘억제 목록’에서 이유와 함께 보여요.' },
  OOSRV: { name: '서비스 제외', sub: '정비 중이라 뺌', screen: '센서를 정비하는 중이라 값 자체를 믿을 수 없어요. 그래서 값도 회색 빗금으로 흐리게 보여요.', sound: '없음', list: '‘서비스 제외 목록’에서 보여요.' },
}
type Ev = 'abn' | 'nrm' | 'ack' | 'shelve' | 'unshelve' | 'sup' | 'unsup' | 'oos' | 'ret'
const EV: Record<Ev, { label: string; who: string }> = {
  abn: { label: '진동 4.5mm/s 넘김', who: '측정값' }, nrm: { label: '진동 정상으로', who: '측정값' },
  ack: { label: '확인', who: '운영자' }, shelve: { label: '보류 30분', who: '운영자' }, unshelve: { label: '보류 해제', who: '운영자' },
  sup: { label: '설비 가동 시작(2분)', who: '시스템' }, unsup: { label: '가동 안정됨', who: '시스템' },
  oos: { label: '센서 정비 시작', who: '정비' }, ret: { label: '정비 끝, 복귀', who: '정비' },
}
const BASE: S[] = ['NORM', 'UNACK', 'ACKED', 'RTNUN']
function step(s: S, abn: boolean, e: Ev): { s: S; abn: boolean } | null {
  const back = (a: boolean): S => (a ? 'UNACK' : 'NORM')
  switch (e) {
    case 'abn': if (abn) return null; return { abn: true, s: s === 'NORM' || s === 'RTNUN' ? 'UNACK' : s }
    case 'nrm': if (!abn) return null; return { abn: false, s: s === 'UNACK' ? 'RTNUN' : s === 'ACKED' ? 'NORM' : s }
    case 'ack': return s === 'UNACK' ? { s: 'ACKED', abn } : s === 'RTNUN' ? { s: 'NORM', abn } : null
    case 'shelve': return s === 'UNACK' || s === 'ACKED' || s === 'RTNUN' ? { s: 'SHLVD', abn } : null
    case 'unshelve': return s === 'SHLVD' ? { s: back(abn), abn } : null
    case 'sup': return BASE.includes(s) ? { s: 'DSUPR', abn } : null
    case 'unsup': return s === 'DSUPR' ? { s: back(abn), abn } : null
    case 'oos': return BASE.includes(s) ? { s: 'OOSRV', abn } : null
    case 'ret': return s === 'OOSRV' ? { s: back(abn), abn } : null
  }
}
/* 다이어그램 좌표 (viewBox 680×330) */
const NODE: Record<S, [number, number, number]> = { // cx, cy, w
  NORM: [95, 165, 150], UNACK: [405, 165, 150], ACKED: [250, 50, 150], RTNUN: [250, 280, 150],
  SHLVD: [612, 92, 150], DSUPR: [612, 172, 150], OOSRV: [612, 252, 150],
}
const EDGES: { from: S; to: S; d: string; lx: number; ly: number; anchor: 'start' | 'middle' | 'end'; label: string }[] = [
  { from: 'NORM', to: 'UNACK', d: 'M172 165 L326 165', lx: 250, ly: 156, anchor: 'middle', label: '값이 경보선 넘음' },
  { from: 'UNACK', to: 'ACKED', d: 'M380 137 L310 78', lx: 362, ly: 100, anchor: 'start', label: '확인' },
  { from: 'ACKED', to: 'NORM', d: 'M190 78 L122 137', lx: 140, ly: 100, anchor: 'end', label: '값 돌아옴' },
  { from: 'UNACK', to: 'RTNUN', d: 'M378 193 L300 252', lx: 312, ly: 214, anchor: 'end', label: '값 돌아옴' },
  { from: 'RTNUN', to: 'UNACK', d: 'M324 254 L402 195', lx: 382, ly: 240, anchor: 'start', label: '다시 넘음' },
  { from: 'RTNUN', to: 'NORM', d: 'M190 252 L122 193', lx: 140, ly: 236, anchor: 'end', label: '확인' },
]

function StateDiagram() {
  const [s, setS] = useState<S>('NORM')
  const [abn, setAbn] = useState(false)
  const [last, setLast] = useState<{ from: S; to: S } | null>(null)
  const [log, setLog] = useState<{ t: string; e: Ev; from: S; to: S }[]>([])
  const sec = useRef(14 * 3600 + 2 * 60 + 11)
  const fire = (e: Ev) => {
    const r = step(s, abn, e)
    if (!r) return
    sec.current += 17 + ((sec.current * 7) % 40)
    const t = `${pad(Math.floor(sec.current / 3600) % 24)}:${pad(Math.floor(sec.current / 60) % 60)}:${pad(sec.current % 60)}`
    setLog(l => [{ t, e, from: s, to: r.s }, ...l].slice(0, 5))
    setLast({ from: s, to: r.s }); setS(r.s); setAbn(r.abn)
  }
  const reset = () => { setS('NORM'); setAbn(false); setLast(null); setLog([]) }
  const value = abn ? 5.1 : 3.2
  const groups: [string, Ev[]][] = [['측정값', ['abn', 'nrm']], ['운영자', ['ack', 'shelve', 'unshelve']], ['시스템 · 정비', ['sup', 'unsup', 'oos', 'ret']]]
  const suppressed = s === 'SHLVD' || s === 'DSUPR' || s === 'OOSRV'
  const st = ST[s]

  return (
    <div className="al-sd">
      <div className="al-sd-ctrl">
        {groups.map(([g, evs]) => (
          <div key={g} className="al-sd-group">
            <span className="al-sd-glabel">{g}</span>
            <div className="al-sd-btns">
              {evs.map(e => <button key={e} type="button" className="btn sm ghost" disabled={!step(s, abn, e)} onClick={() => fire(e)}>{EV[e].label}</button>)}
            </div>
          </div>
        ))}
        <button type="button" className="btn sm ghost al-sd-reset" onClick={reset}>처음으로</button>
      </div>
      <p className="muted al-sd-hint">지금 상태에서 할 수 있는 버튼만 눌려요. 억제 중에도 측정값은 바뀔 수 있어요. 억제가 풀리는 순간 값을 다시 보고 상태를 정해요.</p>

      <div className="al-sd-main">
        <div className="al-sd-svgwrap">
          <svg viewBox="0 0 700 340" className="al-sd-svg" role="img" aria-label={`알람 상태 다이어그램. 현재 상태: ${st.name}`}>
            <defs>
              <marker id="al-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" className="al-arr" /></marker>
              <marker id="al-arr-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" className="al-arr on" /></marker>
            </defs>
            <rect x="526" y="44" width="172" height="290" rx="14" className="al-sd-supbox" />
            <text x="612" y="32" textAnchor="middle" className="al-sd-cap">억제 상태</text>
            <text x="612" y="302" textAnchor="middle" className="al-sd-cap2">어디서든 들어가고,</text>
            <text x="612" y="318" textAnchor="middle" className="al-sd-cap2">나오면 값을 다시 봐요</text>
            {EDGES.map(ed => {
              const on = last && last.from === ed.from && last.to === ed.to
              return (
                <g key={ed.from + ed.to} className={'al-sd-edge' + (on ? ' on' : '')}>
                  <path d={ed.d} markerEnd={`url(#${on ? 'al-arr-on' : 'al-arr'})`} />
                  <text x={ed.lx} y={ed.ly} textAnchor={ed.anchor}>{ed.label}</text>
                </g>
              )
            })}
            {(Object.keys(NODE) as S[]).map(k => {
              const [cx, cy, w] = NODE[k]
              const on = k === s
              return (
                <g key={k} className={'al-sd-node' + (on ? ' on' : '') + (BASE.includes(k) ? '' : ' sup')}>
                  <rect x={cx - w / 2} y={cy - 27} width={w} height={54} rx="12" />
                  <text x={cx} y={cy - 4} textAnchor="middle" className="n">{ST[k].name}</text>
                  <text x={cx} y={cy + 15} textAnchor="middle" className="s">{ST[k].sub}</text>
                </g>
              )
            })}
          </svg>
          <p className="muted al-sd-swipe">그림을 옆으로 밀면 억제 상태 세 가지가 보여요.</p>
        </div>

        <div className="al-sd-side">
          <Hmi title="제2공장 · 프레스 라인" right={log[0]?.t ?? '14:02:11'}>
            <div className={'al-sd-tile st-' + s}>
              <div className="al-sd-tile-top">
                <span className="nm">3호기 모터 진동</span>
                <span className="ind" aria-live="polite">
                  {s === 'UNACK' && <span className="al-blink"><PriBadge p={3} /></span>}
                  {s === 'ACKED' && <PriBadge p={3} />}
                  {s === 'RTNUN' && <span className="al-ghost" title="정상 복귀 · 미확인"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" /></svg>복귀</span>}
                  {s === 'SHLVD' && <span className="al-tag">보류 · 30분 뒤 자동 해제</span>}
                  {s === 'DSUPR' && <span className="al-tag">억제 · 가동 시작 2분</span>}
                  {s === 'OOSRV' && <span className="al-tag">서비스 제외 · 정비</span>}
                </span>
              </div>
              <div className={'al-sd-val' + (s === 'OOSRV' ? ' oos' : '')}><b>{value}</b>mm/s</div>
              <AnalogBar value={value} min={SAFE_RANGES.vib.min} max={SAFE_RANGES.vib.max} normal={SAFE_RANGES.vib.normal} alarm={SAFE_RANGES.vib.alarm} unit="mm/s" name="3호기 모터 진동" w={220} />
            </div>
            <dl className="al-sd-dl">
              <div><dt>소리</dt><dd className={st.sound === '울려요' ? 'loud' : ''}>{st.sound === '울려요' ? <><span className="al-wave" aria-hidden="true"><i /><i /><i /></span>울리는 중</> : st.sound}</dd></div>
              <div><dt>알람 목록</dt><dd>{st.list}</dd></div>
              <div><dt>억제·보류 목록</dt><dd>{suppressed ? '1건 (이유와 함께 보여요)' : '0건'}</dd></div>
            </dl>
          </Hmi>
          <div className="al-sd-now">
            <h4>{st.name}</h4>
            <p>{st.screen}</p>
          </div>
          <ol className="al-sd-log" aria-label="상태 변화 기록">
            {log.length === 0 && <li className="muted">버튼을 눌러 보세요. ‘진동 4.5mm/s 넘김’부터 시작하면 돼요.</li>}
            {log.map((l, i) => <li key={log.length - i}><time>{l.t}</time><span><b>{EV[l.e].label}</b> · {ST[l.from].name} → {ST[l.to].name}</span></li>)}
          </ol>
        </div>
      </div>
    </div>
  )
}

/* ================= 3. 알람 폭주 시뮬레이터 ================= */
interface FEv { t: number; where: string; what: string; pri0: Pri; pri1: Pri; grp?: string; cons?: boolean; chat?: boolean; root?: boolean }
function makeFlood(): FEv[] {
  const r = rng(182)
  const E: FEv[] = [
    { t: 6.2, where: '물류센터 · 상하차장', what: '안전모 미착용 1명', pri0: 2, pri1: 3 },
    { t: 19.5, where: '제2공장 · 프레스 3호기', what: '모터 진동 5.1mm/s', pri0: 1, pri1: 3 },
    { t: 27.0, where: '신축 현장 · 고소작업', what: 'CCTV 3번 영상 끊김', pri0: 1, pri1: 3 },
    { t: 32.0, where: '제2공장 · 도장 부스', what: '화재 — 연기 + 온도 급상승', pri0: 1, pri1: 1, grp: 'fire', root: true },
    { t: 32.0, where: '제2공장 · 도장 부스', what: '불꽃 감지기 동작', pri0: 1, pri1: 1, grp: 'fire' },
    { t: 32.6, where: '제2공장 · 도장 부스', what: '자동 소화 설비 작동', pri0: 1, pri1: 1, grp: 'fire' },
    { t: 32.5, where: '제2공장 · 도장 부스', what: '배기팬 정지 (화재 연동)', pri0: 2, pri1: 3, cons: true },
    { t: 32.7, where: '제2공장 · 정문 게이트', what: '출입 통제 해제 (대피 연동)', pri0: 2, pri1: 3, cons: true },
    { t: 41.0, where: '제2공장 · 화학물질 창고', what: '실내 온도 빠르게 오름 (옆 구역 화재)', pri0: 1, pri1: 2 },
    { t: 88.0, where: '신축 현장 · 타워크레인', what: '인양 중 작업자 반경 진입', pri0: 1, pri1: 2 },
    { t: 110.4, where: '물류센터 · 상하차장', what: '안전모 미착용 1명', pri0: 2, pri1: 3 },
  ]
  for (let k = 1; k <= 14; k++) E.push({ t: 32.1 + r() * 1.6, where: `제2공장 · 연기 감지기 ${pad(k)}번`, what: '연기 감지', pri0: 1, pri1: 3, grp: 'smoke', cons: true })
  for (let k = 1; k <= 8; k++) E.push({ t: 32.2 + r() * 1.8, where: `제2공장 · 비상구 ${k}번`, what: '비상문 열림 (대피 중)', pri0: 1, pri1: 3, grp: 'door', cons: true })
  let t = 39.4
  for (let k = 0; k < 18; k++) { E.push({ t, where: '제2공장 · 도장 부스 CCTV 2번', what: '연기 감지', pri0: 1, pri1: 2, chat: true }); t += 1.4 + r() * 1.2 }
  ;[3, 5, 6].forEach((g, i) => E.push({ t: 44 + i * 1.3 + r() * 0.4, where: `제2공장 · 혼합실 가스 센서 ${g}번`, what: '가연성 가스 10%LEL 초과', pri0: 1, pri1: 2, grp: 'gas2' }))
  return E.sort((a, b) => a.t - b.t)
}
const FLOOD = makeFlood()
type Fix = 'dedupe' | 'cons' | 'deadband' | 'repri'
const FIX: { id: Fix; name: string; desc: string }[] = [
  { id: 'dedupe', name: '중복 묶기', desc: '같은 일을 여러 곳이 알리면 한 줄로 묶어요. 옆에 ‘×14’처럼 개수만 붙여요.' },
  { id: 'cons', name: '원인 알람만 표시', desc: '도장 부스에 불이 나면 주변 연기 감지기와 비상문 열림 알람은 당연히 따라와요. 원인(화재) 하나만 보여 주고 결과는 접어 둬요(연관 억제).' },
  { id: 'deadband', name: '지연 · 히스테리시스', desc: 'CCTV 연기 감지는 연기가 오락가락하면 울렸다 꺼졌다 해요(채터링). 일정 시간 넘어 있어야 울리고, 충분히 사라져야 풀리게 해요.' },
  { id: 'repri', name: '우선순위 다시 매기기', desc: '처음에 ‘일단 다 긴급’으로 둔 설정을 다시 매겨요. 기준은 얼마나 심각한지, 얼마나 빨리 대응해야 하는지예요. 알람 수는 그대로고, 무엇부터 볼지가 달라져요.' },
]
interface Row { e: FEv; n: number; hidden?: number }
function applyFix(on: Record<Fix, boolean>, upTo = 999): Row[] {
  const rows: Row[] = [], grp = new Map<string, Row>()
  let chatSeen = false, consHidden = 0
  let rootRow: Row | null = null
  for (const e of FLOOD) {
    if (e.t > upTo) break
    if (on.cons && e.cons) { consHidden++; if (rootRow) rootRow.hidden = consHidden; continue }
    if (on.deadband && e.chat) { if (chatSeen) continue; chatSeen = true }
    if (on.dedupe && e.grp) {
      const g = grp.get(e.grp)
      if (g) { g.n++; continue }
      const row = { e, n: 1 }; grp.set(e.grp, row); rows.push(row); if (e.root) rootRow = row; continue
    }
    const row = { e, n: 1 }; rows.push(row); if (e.root) rootRow = row
  }
  if (rootRow && consHidden) rootRow.hidden = consHidden
  return rows
}
const BUCKETS = 12

function FloodSim() {
  const [on, setOn] = useState<Record<Fix, boolean>>({ dedupe: false, cons: false, deadband: false, repri: false })
  const [tc, setTc] = useState(120)
  const [play, setPlay] = useState(false)
  const ref = useVisibleInterval(() => {
    setTc(t => { const n = Math.min(120, t + 0.5); if (n >= 120) setPlay(false); return n })
  }, 150, play)
  const all = useMemo(() => applyFix(on), [on])
  const shown = useMemo(() => applyFix(on, tc), [on, tc])
  const pri = (e: FEv): Pri => (on.repri ? e.pri1 : e.pri0)
  // 10분 단위 집계 — 묶인 줄은 1건으로 세요(운영자가 보는 줄 수)
  const buckets = useMemo(() => {
    const b = Array.from({ length: BUCKETS }, () => ({ 1: 0, 2: 0, 3: 0 } as Record<Pri, number>))
    for (const r of all) b[Math.min(BUCKETS - 1, Math.floor(r.e.t / 10))][on.repri ? r.e.pri1 : r.e.pri0]++
    return b
  }, [all, on.repri])
  const tot = (x: Record<Pri, number>) => x[1] + x[2] + x[3]
  const peak = Math.max(...buckets.map(tot))
  const floodN = buckets.filter(x => tot(x) > 10).length
  const raw = applyFix({ dedupe: false, cons: false, deadband: false, repri: false }).length
  const saved = (f: Fix) => {
    if (f === 'repri') return null
    const without = applyFix({ ...on, [f]: false }).length, withF = applyFix({ ...on, [f]: true }).length
    return without - withF
  }
  const p1 = all.filter(r => pri(r.e) === 1).length

  // 차트
  const [box, W] = useWidth<HTMLDivElement>()
  const narrow = W < 560
  const H = narrow ? 200 : 240, L = 30, RP = narrow ? 8 : 104, B = 26, T = 14, YMAX = 32
  const bw = (W - L - 4 - RP) / BUCKETS, gapW = narrow ? 3 : 6
  const y = (v: number) => T + (H - T - B) * (1 - v / YMAX)
  const curB = tc / 10

  return (
    <div className="al-fl" ref={ref}>
      <div className="al-fl-fix">
        {FIX.map(f => {
          const sv = saved(f.id)
          return (
            <label key={f.id} className={'al-fl-opt' + (on[f.id] ? ' on' : '')}>
              <input type="checkbox" checked={on[f.id]} onChange={() => setOn(o => ({ ...o, [f.id]: !o[f.id] }))} />
              <span><b>{f.name}</b>{sv !== null && <em>{sv > 0 ? `−${sv}줄` : ''}</em>}<small>{f.desc}</small></span>
            </label>
          )
        })}
      </div>

      <div className="al-fl-kpis">
        <div className={peak > 10 ? 'bad' : ''}><span>가장 바쁜 10분</span><b>{peak}<small>줄</small></b><em>{peak > 10 ? '폭주 (10줄 초과)' : peak > 1 ? '목표보다 많지만 폭주는 아님' : '목표 수준'}</em></div>
        <div className={floodN ? 'bad' : ''}><span>폭주였던 10분 구간</span><b>{floodN}<small> / {BUCKETS}</small></b><em>목표는 전체 시간의 1% 미만 <Cite n={R.isa182kpi} /></em></div>
        <div><span>2시간 동안 운영자가 본 줄</span><b>{all.length}<small>줄</small></b><em>처음 {raw}줄에서 {raw - all.length ? `${raw - all.length}줄 줄었어요` : '그대로'}</em></div>
        <div><span>그중 긴급</span><b>{p1}<small>줄</small></b><em>{on.repri ? '원인 알람만 긴급' : '거의 다 긴급'}</em></div>
      </div>

      <div className="al-fl-chart" ref={box}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`10분 단위 알람 수. 가장 많은 구간 ${peak}줄, 폭주 구간 ${floodN}개`}>
          {[0, 10, 20, 30].map(v => <g key={v} className="al-fl-grid"><line x1={L} x2={W - RP} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
          {buckets.map((b, i) => {
            let acc = 0
            const x = L + 4 + i * bw
            const future = i >= curB
            return (
              <g key={i} className={'al-fl-bar' + (future ? ' future' : '')}>
                {([1, 2, 3] as Pri[]).map(p => {
                  const v = b[p]; if (!v) return null
                  const y0 = y(acc), y1 = y(Math.min(YMAX, acc + v)); acc += v
                  return <rect key={p} className={'p' + p} x={x} width={bw - gapW} y={y1} height={Math.max(0, y0 - y1)} />
                })}
                {tot(b) > 0 && <text x={x + (bw - gapW) / 2} y={y(Math.min(YMAX, tot(b))) - 4} textAnchor="middle" className="v">{tot(b)}</text>}
                <text x={x + (bw - gapW) / 2} y={H - 8} textAnchor="middle" className="t">{i % (narrow ? 3 : 2) === 0 ? clock(i * 10) : ''}</text>
              </g>
            )
          })}
          <g className="al-fl-ref flood"><line x1={L} x2={W - RP + (narrow ? 0 : 6)} y1={y(10)} y2={y(10)} />{narrow ? <text x={L + 4} y={y(10) - 5}>폭주 기준 10</text> : <text x={W - RP + 10} y={y(10) + 4}>폭주 기준 10</text>}</g>
          <g className="al-fl-ref goal"><line x1={L} x2={W - RP + (narrow ? 0 : 6)} y1={y(1)} y2={y(1)} />{!narrow && <text x={W - RP + 10} y={y(1) + 4}>평소 목표 1</text>}</g>
          {tc < 120 && <line className="al-fl-cursor" x1={L + 4 + curB * bw} x2={L + 4 + curB * bw} y1={T} y2={H - B} />}
        </svg>
        <div className="al-fl-legend">
          {([1, 2, 3] as Pri[]).map(p => <span key={p}><PriBadge p={p} label /></span>)}
          <span className="muted">막대 높이는 10분 동안 목록에 새로 올라온 줄 수예요. 점선은 폭주 기준(10줄)과 평소 목표(1줄)예요.</span>
        </div>
      </div>

      <div className="al-fl-play">
        <button type="button" className="btn sm" onClick={() => { if (tc >= 120) setTc(0); setPlay(p => !p) }}>{play ? '일시정지' : tc >= 120 ? '처음부터 재생' : '이어서 재생'}</button>
        <div className="al-fl-scrub">
          <Range value={tc} min={0} max={120} step={0.5} onChange={v => { setPlay(false); setTc(v) }} label="재생 시각" />
        </div>
        <b className="al-fl-time">{clock(tc)}</b>
      </div>

      <Hmi title="알람 목록 · 제2공장 담당" right={`${clock(tc)} · ${shown.length}줄`} className="al-fl-hmi">
        <ol className="al-fl-list" aria-label="알람 목록">
          {shown.length === 0 && <li className="empty">조용해요. 14:02에 도장 부스에서 불이 나요.</li>}
          {[...shown].reverse().slice(0, 60).map((r, i) => (
            <li key={r.e.t + r.e.where + i} className={r.e.root ? 'root' : ''}>
              <time>{clock(r.e.t)}</time>
              <PriBadge p={pri(r.e)} />
              <span className="w">{r.n > 1 && on.dedupe ? r.e.where.replace(/ \d+번$/, ' 여러 곳') : r.e.where}</span>
              <span className="x">{r.e.what}{r.n > 1 && <b className="cnt">×{r.n}</b>}{r.hidden ? <small>연관 알람 {r.hidden}건 접힘</small> : null}</span>
            </li>
          ))}
        </ol>
      </Hmi>
    </div>
  )
}

/* ================= 4. 우선순위 분포 ================= */
const POOL = ['물류센터 상하차장 안전모 미착용', '제2공장 프레스 3호기 진동 4.5mm/s 초과', '신축 현장 고소작업 CCTV 3번 영상 끊김', '제2공장 화학물질 창고 출입문 열림', '물류센터 지게차 통로 보행자 접근', '신축 현장 게이트 보호조끼 미착용', '제2공장 프레스 1호기 모터 온도 70℃ 초과', '물류센터 상하차장 일산화탄소 25ppm 초과', '신축 현장 웨어러블 배터리 낮음', '제2공장 가스 센서 7번 통신 끊김', '물류센터 비상구 앞 적재물 감지', '신축 현장 출입 게이트 안전화 미착용', '제2공장 도장 부스 배기 풍량 낮음', '물류센터 고층 랙 구역 출입문 열림', '신축 현장 지하 조명 고장', '제2공장 프레스 2호기 진동 4.5mm/s 초과', '물류센터 CCTV 5번 영상 끊김', '신축 현장 타워크레인 CCTV 화질 낮음', '제2공장 정문 게이트 출입 카드 오류']
function PriorityMix() {
  const [n, setN] = useState<Record<Pri, number>>({ 1: 45, 2: 35, 3: 20 })
  const sum = n[1] + n[2] + n[3] || 1
  const share = (p: Pri) => (n[p] / sum) * 100
  const REC: Record<Pri, number> = { 1: 5, 2: 15, 3: 80 }
  const preset = (a: number, b: number, c: number) => setN({ 1: a, 2: b, 3: c })
  // 한 근무 시간의 알람 20건: 진짜 급한 화재는 가장 먼저 났고, 그 뒤로 다른 알람이 쌓였어요
  const list = useMemo(() => {
    const k1 = Math.max(1, Math.round((n[1] / sum) * 20)), k2 = Math.round((n[2] / sum) * 20)
    const r = rng(11)
    const items = POOL.map((w, i) => ({ w, t: 40 + i * 6 + Math.floor(r() * 4), p: 3 as Pri, real: false }))
    const order = items.map((_, i) => i).sort((a, b) => ((a * 7) % 19) - ((b * 7) % 19))
    order.forEach((idx, j) => { items[idx].p = j < k1 - 1 ? 1 : j < k1 - 1 + k2 ? 2 : 3 })
    const all = [{ w: '제2공장 도장 부스 화재 — 연기 + 온도 급상승', t: 32, p: 1 as Pri, real: true }, ...items]
    return all.sort((a, b) => a.p - b.p || b.t - a.t)
  }, [n, sum])
  const rank = list.findIndex(x => x.real) + 1
  const VIS = 6
  return (
    <div className="al-pm">
      <div className="al-pm-ctrl">
        {([1, 2, 3] as Pri[]).map(p => (
          <div key={p} className="al-pm-sl">
            <div className="al-pm-sl-top"><PriBadge p={p} label /><b>{n[p]}건 · {share(p).toFixed(0)}%</b></div>
            <Range value={n[p]} min={0} max={100} onChange={v => setN(o => ({ ...o, [p]: v }))} label={`${PRI[p].name} 알람 수`} />
          </div>
        ))}
        <div className="al-pm-pre">
          <span className="muted">예시로 맞추기</span>
          <button type="button" className="btn sm ghost" onClick={() => preset(70, 20, 10)}>일단 다 긴급</button>
          <button type="button" className="btn sm ghost" onClick={() => preset(45, 35, 20)}>흔한 첫 설정</button>
          <button type="button" className="btn sm ghost" onClick={() => preset(5, 15, 80)}>권장 비율</button>
        </div>
      </div>

      <div className="al-pm-bars">
        {[{ k: '우리 시스템', v: share }, { k: '권장 비율', v: (p: Pri) => REC[p] }].map(row => (
          <div key={row.k} className="al-pm-row">
            <span className="lab">{row.k}</span>
            <div className="bar" role="img" aria-label={`${row.k}: 긴급 ${row.v(1).toFixed(0)}%, 높음 ${row.v(2).toFixed(0)}%, 주의 ${row.v(3).toFixed(0)}%`}>
              {([1, 2, 3] as Pri[]).map(p => row.v(p) > 0 && (
                <i key={p} className={'p' + p} style={{ width: row.v(p) + '%' }}>{row.v(p) >= 9 && <span>{row.v(p).toFixed(0)}%</span>}</i>
              ))}
            </div>
          </div>
        ))}
        <p className="muted">권장 비율은 3단계일 때 주의 약 80%, 높음 약 15%, 긴급 약 5%예요(2차 자료에 보고된 값) <Cite n={R.isa182kpi} />. 4단계를 쓰면 가장 높은 단계는 1% 미만으로 둬요.</p>
      </div>

      <div className="al-pm-find">
        <Hmi title="알람 목록 · 우선순위순" right={`${list.length}건`}>
          <ol className="al-pm-list">
            {list.slice(0, VIS).map((x, i) => (
              <li key={x.w} className={x.real ? 'real' : ''}><span className="i">{i + 1}</span><PriBadge p={x.p} /><span>{x.w}</span><time>{clock(x.t, 13 * 60 + 30)}</time></li>
            ))}
          </ol>
          <div className="al-pm-more">{rank > VIS ? `아래로 ${list.length - VIS}건 더 · 진짜 급한 화재는 ${rank}번째에 있어요` : `아래로 ${list.length - VIS}건 더`}</div>
        </Hmi>
        <div className="al-pm-verdict">
          <b className="big">{rank}<small>번째</small></b>
          <p>진짜 급한 <b>도장 부스 화재</b>가 목록에서 몇 번째인지예요. 화재는 가장 먼저 났어요. 그 뒤로 ‘긴급’ 알람이 쌓이면 화재는 첫 화면 밖으로 밀려나요.</p>
          <p>안전모 미착용과 화재가 같은 ‘긴급’이면, 근무자는 둘을 같은 속도로 처리하게 돼요.</p>
          <p className="muted">한 화면에 보이는 줄은 {VIS}줄이에요. {rank > VIS ? '스크롤해야 찾을 수 있어요.' : '지금은 첫 화면에서 보여요.'}</p>
        </div>
      </div>
    </div>
  )
}

/* ================= 5. 알람 문구 ================= */
type Slot = 'where' | 'what' | 'how' | 'act'
const SLOT: Record<Slot, string> = { where: '어디', what: '무엇', how: '얼마나', act: '무엇을 하라' }
const TEXTS: { bad: string; miss: Partial<Record<Slot, string>>; id: string; what: string; how: string; p: Pri }[] = [
  { bad: 'FD_F2_03 ALM', id: 'S-101', what: '화재 — 연기 감지 + 온도 급상승', how: '14:02 · 감지기 2개 함께 동작', p: 1, miss: { where: '감지기 코드뿐이라 어느 구역인지 외우고 있어야 해요.', what: '‘FD’가 화재 감지기라는 걸 알아야 읽을 수 있어요.', how: '감지기 하나인지, 여러 개가 함께 울렸는지 알 수 없어요.', act: '할 일이 없어요.' } },
  { bad: 'GAS HI', id: 'S-103', what: '가연성 가스 높음', how: '12%LEL (정상 10%LEL 이하) · 20분째 오르는 중', p: 2, miss: { where: '어느 현장, 어느 센서인지 없어요.', how: '얼마나 높은지, 오르는 중인지 없어요.', act: '할 일이 없어요.' } },
  { bad: 'TAG-0412 NO MOTION', id: 'S-102', what: '작업자 무응답', how: '30초째 움직임 없음 · 밀폐공간 작업 중', p: 1, miss: { where: '태그 번호뿐이라 어디인지 몰라요. 밀폐공간인지 아닌지에 따라 대응이 달라져요.', how: '얼마나 오래 움직임이 없었는지 없어요.', act: '할 일이 없어요.' } },
  { bad: '위험구역 침입', id: 'S-104', what: '인양 중 작업자 반경 진입', how: '크레인 인양 중 · 반경 안 1명', p: 2, miss: { where: '어느 위험구역인지가 통째로 없어요.', how: '지금 인양 중인지, 몇 명인지 없어요.', act: '할 일이 없어요.' } },
]
function AlarmText() {
  const [i, setI] = useState(0)
  const x = TEXTS[i], a = alarmById(x.id)
  const good: Record<Slot, string> = { where: a.where, what: x.what, how: x.how, act: a.action }
  return (
    <div className="al-tx">
      <Seg value={i} onChange={setI} options={TEXTS.map((t, j) => [j, t.bad] as const)} className="al-tx-seg" />
      <div className="al-tx-cols">
        <div className="al-tx-card bad">
          <span className="h">지금 문구</span>
          <code className="al-tx-raw">{x.bad}</code>
          <ul>
            {(Object.keys(SLOT) as Slot[]).map(s => (
              <li key={s} className={x.miss[s] ? 'no' : 'yes'}>
                <b><span aria-hidden="true">{x.miss[s] ? '✕' : '✓'}</span> {SLOT[s]}</b>
                <span>{x.miss[s] ?? '있어요.'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="al-tx-card good">
          <span className="h">고친 문구</span>
          <div className="al-tx-row"><PriBadge p={x.p} /><b>{good.where}</b><span>{good.what}</span></div>
          <ul>
            {(Object.keys(SLOT) as Slot[]).map(s => (
              <li key={s} className="yes"><b><span aria-hidden="true">✓</span> {SLOT[s]}</b><span>{good[s]}</span></li>
            ))}
          </ul>
        </div>
      </div>
      <Note tone="tip"><b>목록 한 줄이 잘려도 읽히게 해요.</b> ‘어디 → 무엇’을 앞에 둬요. ‘얼마나’와 ‘할 일’은 줄을 누르면 펼쳐지게 해도 돼요. 할 일이 떠오르지 않는다면, 그건 알람이 아니라 기록(이벤트)으로 남길 일일 가능성이 커요.</Note>
    </div>
  )
}

/* ================= 6. 소리 ================= */
const TONE: Record<Pri, { hz: number; seq: [number, number][]; gap: number; repeat: boolean; desc: string }> = {
  1: { hz: 880, seq: [[150, 100], [150, 100], [150, 100]], gap: 600, repeat: true, desc: '짧게 세 번, 확인할 때까지 반복' },
  2: { hz: 660, seq: [[260, 160], [260, 160]], gap: 1600, repeat: true, desc: '두 번, 간격을 길게 두고 반복' },
  3: { hz: 520, seq: [[320, 0]], gap: 0, repeat: false, desc: '한 번만' },
}
function ToneStrip({ p }: { p: Pri }) {
  const tn = TONE[p], W = 300, SPAN = 4000
  const bars: [number, number][] = []
  let t = 0
  while (t < SPAN) {
    for (const [on, off] of tn.seq) { if (t >= SPAN) break; bars.push([t, on]); t += on + off }
    if (!tn.repeat) break
    t += tn.gap
  }
  return (
    <svg viewBox={`0 0 ${W} 28`} className={'al-tone p' + p} aria-hidden="true" preserveAspectRatio="none">
      <line x1="0" x2={W} y1="14" y2="14" />
      {bars.map(([s, d], i) => <rect key={i} x={(s / SPAN) * W} width={Math.max(2, (d / SPAN) * W)} y="4" height="20" rx="2" />)}
    </svg>
  )
}
function playOnce(p: Pri) {
  try {
    const ctx = new AudioContext(), tn = TONE[p]
    let t = ctx.currentTime + 0.05
    for (const [on, off] of tn.seq) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = tn.hz; o.type = 'sine'
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.01); g.gain.setValueAtTime(0.08, t + on / 1000 - 0.02); g.gain.linearRampToValueAtTime(0, t + on / 1000)
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + on / 1000 + 0.02)
      t += (on + off) / 1000
    }
    setTimeout(() => ctx.close(), (t - ctx.currentTime) * 1000 + 300)
  } catch { /* 소리를 낼 수 없는 환경 */ }
}
function Sound() {
  const [q, setQ] = useState<{ id: number; p: Pri; ack: boolean }[]>([])
  const [mute, setMute] = useState(false)
  const nid = useRef(1)
  const add = (p: Pri) => { setQ(x => [{ id: nid.current++, p, ack: false }, ...x].slice(0, 6)); setMute(false) }
  const un = q.filter(x => !x.ack)
  const top = un.length ? (Math.min(...un.map(x => x.p)) as Pri) : null
  const ring = top !== null && !mute && (TONE[top].repeat)
  return (
    <div className="al-snd">
      <div className="al-snd-pat">
        {([1, 2, 3] as Pri[]).map(p => (
          <div key={p} className="al-snd-row">
            <PriBadge p={p} label />
            <ToneStrip p={p} />
            <span className="d">{TONE[p].desc}</span>
            <button type="button" className="btn sm ghost" onClick={() => playOnce(p)} aria-label={`${PRI[p].name} 소리 한 번 들어 보기`}>들어 보기</button>
          </div>
        ))}
        <p className="muted">그림의 가로 길이는 4초예요. 소리 크기는 같고, 리듬과 음 높이로 구분해요. ‘들어 보기’를 누를 때만 작게 한 번 나요.</p>
      </div>

      <div className="al-snd-demo">
        <div className="al-snd-btns">
          <button type="button" className="btn sm ghost" onClick={() => add(1)}>긴급 알람 발생</button>
          <button type="button" className="btn sm ghost" onClick={() => add(3)}>주의 알람 발생</button>
          <button type="button" className="btn sm ghost" disabled={!ring} onClick={() => setMute(true)}>소리만 끄기</button>
          <button type="button" className="btn sm" disabled={!un.length} onClick={() => { setQ(x => x.map(y => ({ ...y, ack: true }))); setMute(false) }}>모두 확인</button>
        </div>
        <Hmi title="상황실 스피커" right={ring ? '울리는 중' : '조용함'}>
          <div className="al-snd-state" aria-live="polite">
            {ring ? <><span className="al-wave big" aria-hidden="true"><i /><i /><i /></span><span><b>{PRI[top!].name} 소리</b> 반복 중 — 아직 확인 안 한 알람 {un.length}건</span></>
              : top !== null && mute ? <span><b>무음</b> — 소리는 껐지만 미확인 {un.length}건은 계속 깜빡여요. 새 알람이 오면 다시 울려요.</span>
                : top !== null ? <span>주의 알람은 한 번만 울리고 멈췄어요. 미확인 {un.length}건은 목록에서 깜빡여요.</span>
                  : <span className="muted">미확인 알람이 없어요.</span>}
          </div>
          <ul className="al-snd-q">
            {q.map(x => <li key={x.id} className={x.ack ? 'ack' : ''}><span className={x.ack ? '' : 'al-blink'}><PriBadge p={x.p} /></span>{x.p === 1 ? '제2공장 도장 부스 — 화재' : '물류센터 상하차장 — 안전모 미착용'}<small>{x.ack ? '확인됨' : '미확인'}</small></li>)}
          </ul>
        </Hmi>
      </div>
    </div>
  )
}

/* ================= 7. 알람 추가 전 질문 ================= */
const QS: { q: string; no: ReactNode; yes?: ReactNode }[] = [
  { q: '이게 울리면 운영자가 해야 할 행동이 정해져 있나요?', no: <>알람이 아니라 <b>기록(이벤트)</b>으로 남겨요. 할 일이 없는 알람은 피로만 쌓아요.</> },
  { q: '알람을 본 뒤에 그 행동을 할 시간이 충분한가요?', no: <>너무 늦게 알려 주는 거예요. <b>더 일찍 울리게</b> 다시 설계해요. 기준값을 앞당기거나, 값이 오르는 추세를 보고 울리게 해요.</> },
  { q: '다른 알람이 같은 일을 이미 알려 주지 않나요?', no: <>원인 알람 하나만 남겨요. 나머지는 <b>묶거나, 원인 아래로 접어(<Term k="연관 억제" d={XT['연관 억제']} />)</b> 둬요. 화재 뒤에 따라오는 주변 연기 감지기·비상문 열림 알람이 대표적이에요.</> },
  { q: '평소에는 거의 울리지 않나요?', no: <>울렸다 꺼졌다를 반복한다면(<Term k="채터링" d={XT['채터링']} />) <b>지연 시간</b>이나 <Term k="히스테리시스" />를 넣어요. 특정 작업 중에만 울린다면 그 조건에서는 <Term k="설계상 억제"><b>설계상 억제</b></Term>해요.</> },
  { q: '우선순위를 ‘얼마나 심각한지 × 얼마나 빨리 대응해야 하는지’로 정했나요?', no: <>‘일단 긴급’으로 두면 안 돼요. 두 기준을 함께 보고 매겨요. 정의서 양식은 <a href="#/dash/ops">08 기획 · 운영 정의</a>에 있어요.</>, yes: <>좋아요. 이 알람은 넣어도 돼요. 정의서에 이 알람을 넣은 이유와 <Term k="대응 절차" />를 함께 적어 두세요.</> },
]
function AddCheck() {
  const [ans, setAns] = useState<(boolean | null)[]>(QS.map(() => null))
  const stop = ans.findIndex(a => a === false)
  const cur = stop >= 0 ? stop : ans.findIndex(a => a === null)
  const done = cur === -1
  const set = (i: number, v: boolean) => setAns(a => a.map((x, j) => (j < i ? x : j === i ? v : null)))
  return (
    <div className="al-ck">
      <ol>
        {QS.map((x, i) => {
          const vis = i <= (cur === -1 ? QS.length - 1 : cur)
          if (!vis) return null
          return (
            <li key={i} className={ans[i] === false ? 'stop' : ans[i] ? 'pass' : 'now'}>
              <span className="n">{i + 1}</span>
              <div>
                <p className="q">{x.q}</p>
                <div className="b">
                  <button type="button" className="chip" aria-pressed={ans[i] === true} onClick={() => set(i, true)}>예</button>
                  <button type="button" className="chip" aria-pressed={ans[i] === false} onClick={() => set(i, false)}>아니요</button>
                </div>
                {ans[i] === false && <p className="r">{x.no}</p>}
                {ans[i] === true && i === QS.length - 1 && <p className="r ok">{x.yes}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {(done || stop >= 0) && <button type="button" className="btn sm ghost" onClick={() => setAns(QS.map(() => null))}>다른 알람으로 다시</button>}
    </div>
  )
}

/* ================= 탭 ================= */
const REFS: RefItem[] = [
  { kind: 'standard', text: 'ANSI/ISA-18.2 (IEC 62682) 공장·발전소 같은 공정 산업의 알람 관리 표준 — 알람 상태가 바뀌는 규칙(정상·미확인·확인·복귀 미확인, 보류·설계상 억제·서비스 제외)을 정리한 자료', url: 'https://documentation.iconics.com/v10.97.3/Content/Alarming/Alarm%20Server/Alarm%20References/alarm-state-transition-diagram.htm' },
  { kind: 'reported', text: 'ISA-18.2 성능 기준(2차 자료): 운영자 1명당 10분에 약 1개, 10분에 10개 초과는 폭주, 폭주 시간 비율 1% 미만, 우선순위 비율 80/15/5, 오래 떠 있는 알람 하루 5개 미만', url: 'https://ifactoryapp.com/industries/oil-and-gas/alarm-management-isa-18-2-rationalization-flooding' },
  { kind: 'reported', text: 'EEMUA 191 알람 시스템 지침 요약(2차 자료): 평소 알람 양, 우선순위는 3~4단계', url: 'https://open-exam-prep.com/study-guides/nebosh-hse-process-safety/process-hazard-control/alarm-management-eemua191' },
  { kind: 'reported', text: 'Sendelbach & Funk (2013) “Alarm Fatigue: A Patient Safety Concern”, AACN Advanced Critical Care — 병원 알람의 72~99%가 가짜였거나 조치가 필요 없었어요(2차 인용)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4456276' },
  { kind: 'paper', text: '어린이 병원 환자 모니터 알람 관찰 연구 — 조치가 필요 없던 알람 비율: 중환자실 87.1%, 일반 병동 99.0%', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4456276' },
  { kind: 'standard', text: 'ANSI/ISA-101.01-2015 공정 자동화 HMI — 화면은 회색 위주로, 색은 비정상일 때만', url: 'https://blog.isa.org/the-high-performance-hmi' },
  { kind: 'paper', text: 'Healey 등, 전주의 처리(preattentive processing) — 색·모양·움직임은 찾으려 애쓰지 않아도 200~250ms 안에 눈에 띄어요' },
  { kind: 'standard', text: 'WCAG 2.1 성공 기준 2.3.1 — 깜빡임은 1초에 3번 이하', url: 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html' },
  { kind: 'practice', text: 'Palmer의 경험 — 알람이 너무 많아 현장에서 알람을 꺼 버린 일' },
  { kind: 'practice', text: '실무 경험 — 알람 문구 네 칸(어디·무엇·얼마나·할 일), 우선순위별 소리, ‘소리만 끄기’와 ‘확인’ 분리, 보류 자동 해제 시간, 알람 추가 전 질문' },
]

export default function Tab() {
  return (
    <div data-dash="alarm">
      <TermList keys={['알람 피로', '알람 폭주', '확인', '보류', '정상 복귀', '오경보', '설계상 억제', '서비스 제외', '채터링', '히스테리시스', '연관 억제', '우선순위', '대응 절차', '%LEL', '웨어러블']} extra={XT} />
      <SysGrid>
        <Section id="dash-alarm-why" wide title="알람이 많으면 알람을 안 믿게 돼요"
          gist="헛알람이 많으면 진짜 알람도 무시해요. 개수보다 믿을 수 있는지가 먼저예요."
          desc="양치기 소년 이야기와 같아요. ‘늑대다!’가 계속 거짓말이면, 진짜 늑대가 와도 아무도 안 믿어요. 알람도 너무 많으면 사람들이 무시하게 돼요. 놓친 알람보다 이게 더 흔한 문제예요. 병원 연구가 이 현상을 가장 잘 보여 줘요.">
          <Fatigue />
          <Finding src={<>Sendelbach & Funk (2013) 및 어린이 병원 관찰 연구 요약 <Cite n={R.sendel} /><Cite n={R.child} /></>}>
            알람 대부분이 헛걸음이면 사람은 알람을 덜 믿게 돼요. 이걸 <Term k="알람 피로" />라고 해요. 공장·물류센터·건설 현장을 지켜보는 안전관리 <Term k="관제">상황실</Term>도 똑같아요.
          </Finding>
          <figure className="al-story">
            <blockquote>
              <p>저도 이걸 실제로 겪었어요. 알람이 너무 많이 울리니까, 현장에서는 결국 알람을 다 꺼 버리더라고요.</p>
              <p>문제는 그 순간부터 진짜 위험한 알람도 같이 묻힌다는 거예요. 알람을 끄면 가짜든 진짜든 다 같이 꺼지니까요.</p>
              <p>그때 배웠어요. 알람은 ‘많이 울리는 것’보다 <b>‘울릴 때 믿을 수 있는 것’</b>이 훨씬 중요해요.</p>
              <p>그래서 저희는 알람을 끄는 대신 <b>우선순위를 다시 나누고</b>, <b>같은 일을 알리는 알람을 묶어서</b> 풀었어요. 두 방법 모두 아래에서 직접 켜 볼 수 있어요.</p>
            </blockquote>
            <div className="al-story-links">
              <a href="#dash-alarm-flood" onClick={e => { e.preventDefault(); document.getElementById('dash-alarm-flood')?.scrollIntoView({ behavior: 'smooth' }) }}>알람 묶기 — 아래 폭주 실험에서 ‘중복 묶기’와 ‘원인 알람만 표시’ 켜 보기</a>
              <a href="#dash-alarm-priority" onClick={e => { e.preventDefault(); document.getElementById('dash-alarm-priority')?.scrollIntoView({ behavior: 'smooth' }) }}>우선순위 다시 나누기 — 권장 비율(긴급 5 · 높음 15 · 주의 80)과 비교해 보기</a>
            </div>
            <figcaption>— Palmer <Cite n={R.palmer} /></figcaption>
          </figure>
        </Section>

        <Section id="dash-alarm-mistakes" wide title="흔한 실수 — 알람을 지우고, 섞고, 계속 울려요"
          gist="알람은 사람이 볼 때까지 남고, 급한 순서로 서고, 한 번만 울려야 해요."
          desc={<>업계에서 흔히 보는 안전관리 화면의 알람 문제예요. 사람의 실수가 아니라 화면 설계의 문제예요. 카드마다 ‘흔한 화면’과 ‘업그레이드하면’을 눌러 비교해 보세요. 예시 현장({SAFE_PLACE})과 수치는 모두 가상이에요.</>}>
          <Mistakes />
        </Section>

        <Section id="dash-alarm-states" wide title="알람은 일곱 가지 상태를 오가요"
          gist="‘확인’은 끄기가 아니라 ‘봤다’는 표시예요. 값이 돌아와야 알람이 끝나요."
          desc={<>휴대폰 부재중 전화를 떠올려 보세요. 전화가 끊겨도, 내가 보기 전까지 빨간 표시가 남아 있죠. 알람도 ‘울림/안 울림’ 두 가지가 아니에요. 세 가지를 합쳐 상태를 정해요. 값이 비정상인가, <Term k="운영자" />가 봤나, 누가 잠시 막아 뒀나예요. 그래서 일곱 가지 상태가 나와요 <Cite n={R.isa182} />. 버튼을 눌러 상태를 옮기고, 오른쪽 화면이 어떻게 바뀌는지 보세요.</>}>
          <StateDiagram />
          <div className="al-two">
            <Finding src={<>ANSI/ISA-18.2 · IEC 62682 알람 상태 모델 요약 <Cite n={R.isa182} /></>}>
              <Term k="확인">‘확인’</Term>은 알람을 끄는 게 아니라 ‘봤다’는 표시예요. 값이 정상으로 돌아오기 전까지 알람은 살아 있어요.
            </Finding>
            <Note tone="warn"><b>막아 둔 알람도 ‘없는 알람’이 아니에요.</b> <Term k="보류" />·<Term k="억제" />·<Term k="서비스 제외" />는 목록을 따로 만들어 모아 둬요. 목록에는 누가, 왜, 언제까지 막았는지 적어요. 보류에는 자동으로 풀리는 시간을 꼭 붙여요. 위에서 말한 ‘알람을 다 꺼 버린’ 현장은, 이 목록 없이 막기만 한 상태와 같아요.</Note>
          </div>
          <Note>깜빡임은 1초에 1번이에요. 빛 때문에 생기는 발작을 막는 기준(1초에 3번 이하)보다 느려요 <Cite n={R.wcag} />. 기기에서 ‘동작 줄이기’를 켜면 깜빡이는 대신 점선 테두리가 보여요. 예시의 이름과 수치는 모두 가상이에요.</Note>
        </Section>

        <Section id="dash-alarm-flood" wide title="고장 하나가 알람 수십 개가 돼요"
          gist="고장 하나가 알람 수십 개를 만들어요. 묶고 걸러야 진짜 원인이 보여요."
          desc={<>아파트 한 동에 불이 나면 집집마다 관리실에 전화하는 것과 같아요. 원인은 하나인데 전화는 수십 통이에요. 14:02, 제2공장 도장 부스에서 불이 나요. 연기가 퍼지면서 주변 연기 감지기 14개가 차례로 울려요. 사람들이 대피하면서 비상문 8개의 ‘열림’ 알람도 한꺼번에 떠요. 연기가 오락가락하자 CCTV 연기 감지는 울렸다 꺼졌다를 반복해요(<Term k="채터링" d={XT['채터링']} />). 안전관리 화면에서는 이 모든 게 화재 하나 때문이에요. 아래 개선 방법을 하나씩 켜 보세요.</>}>
          <div className="al-std">
            <div><b>10분에 1개</b><span>평소 운영자 1명이 받는 목표량이에요. 한 시간에 6개, 하루 약 150개 미만이에요</span></div>
            <div><b>10분에 10개 초과</b><span><Term k="알람 폭주" />예요. 이만큼 쏟아지면 사람은 목록을 다 읽지 못해요</span></div>
            <div><b>1% 미만</b><span>폭주 상태인 시간이 전체 시간에서 차지하는 비율의 목표예요</span></div>
            <div><b>하루 5개 미만</b><span>해결 안 된 채 오래 떠 있는 알람(stale) 수의 목표예요</span></div>
          </div>
          <p className="muted al-std-src">모두 알람 관리 표준(ISA-18.2, EEMUA 191)을 설명한 2차 자료에 보고된 수치예요 <Cite n={R.isa182kpi} /><Cite n={R.eemua} />.</p>
          <FloodSim />
          <Note tone="tip"><b>‘원인 알람만 표시’는 결과 알람을 지우는 게 아니에요.</b> 화재 줄 아래에 ‘연관 알람 24건 접힘’처럼 접어 두고, 누르면 펼쳐져요. 접힌 연기 감지기 수가 늘면 불이 번지고 있다는 뜻이라, 개수는 원인 줄에 계속 보여 줘요. 번지는 범위는 <a href="#/dash/map">06 지도 · 계통도</a>에서 봐요. 이 실험의 알람 흐름은 설명용으로 만든 가상 사례예요.</Note>
        </Section>

        <Section id="dash-alarm-priority" wide title="모두가 긴급이면 아무것도 긴급이 아니에요"
          gist="‘긴급’이 많을수록 진짜 급한 알람이 목록 아래로 묻혀요."
          desc={<>응급실에서 모든 환자에게 ‘가장 급함’ 표시를 붙이면, 정말 위독한 사람을 먼저 볼 수 없어요. 알람 <Term k="우선순위" />도 같아요. ‘무엇부터 볼지’ 정하는 도구인데, 높은 단계가 많을수록 쓸모가 없어져요. 안전관리 화면에서는 안전모 미착용과 화재가 같은 ‘긴급’이 되는 일이 흔해요. 슬라이더로 우리 시스템의 한 달 알람 비율을 넣어 보세요.</>}>
          <PriorityMix />
          <Note>우선순위 단계는 3~4개까지만 둬요 <Cite n={R.eemua} />. 단계마다 색·모양·숫자를 함께 쓰는 이유는 <a href="#/dash/color">02 회색이 기본, 색은 신호</a>에서 다뤄요. 이 탭에서 정한 대응 시간은 긴급 {PRI[1].respond}, 높음 {PRI[2].respond}, 주의 {PRI[3].respond}예요(가상).</Note>
        </Section>

        <Section id="dash-alarm-text" title="알람 문구에는 네 가지가 들어가요"
          gist="‘어디·무엇·얼마나·할 일’이 다 있어야 처음 온 사람도 바로 움직여요."
          desc="119에 ‘불났어요’만 말하면 출동할 수 없어요. 어디서, 무엇이, 얼마나인지 말해야 해요. 알람 한 줄도 같아요. 어디·무엇·얼마나·무엇을 하라에 답해야 해요. 안전관리 화면에서는 ‘어디’가 특히 중요해요. 같은 가스 알람도 밀폐공간이면 대응이 달라지니까요. 위의 나쁜 문구를 하나씩 눌러 보세요.">
          <AlarmText />
        </Section>

        <Section id="dash-alarm-sound" title="소리는 우선순위마다 다르게 내고, 확인하면 멈춰요"
          gist="소리는 가장 강한 신호라 아껴 써요. ‘소리 끄기’와 ‘확인’은 따로예요."
          desc="구급차 사이렌은 앞을 안 보던 사람도 돌아보게 해요. 알람 소리도 같아요. 화면을 안 보고 있는 사람까지 부르는 가장 강한 신호라서, 꼭 필요할 때만 써요.">
          <Sound />
          <Note><b>‘소리만 끄기’와 ‘확인’은 다른 버튼이에요.</b> 소리를 꺼도 알람은 미확인으로 남아 깜빡여요. <Term k="확인" />을 누르면 소리와 깜빡임이 함께 멈춰요. 새 알람이 오면 무음이 풀려요 <Cite n={R.practice} />.</Note>
        </Section>

        <Section id="dash-alarm-check" wide title="새 알람을 넣기 전에 물어볼 다섯 가지"
          gist="울려도 할 일이 없다면, 알람이 아니라 기록으로 남겨요."
          desc={<>알람 관리 표준(ISA-18.2)은 알람을 ‘<Term k="운영자" />가 뭔가 해야 하는 이상’을 알리는 것으로 봐요 <Cite n={R.isa182} />. 새 알람을 넣자는 요청이 오면 아래 다섯 질문을 차례로 물어요. ‘아니요’가 나오면 거기서 멈춰요.</>}>
          <AddCheck />
        </Section>

        <Refs items={REFS} />
      </SysGrid>
    </div>
  )
}
