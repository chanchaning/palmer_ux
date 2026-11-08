import { useMemo, useState, type ReactNode } from 'react'
import { Term, TermList } from '../../components/Term'
import { Range, Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { DASH_TABS } from '../DashPage'
import { SAFE_ALARMS, SAFE_CENTER, SAFE_EVENT, SAFE_PLACE, SAFE_RANGES, SAFE_SITES, rng, type Pri } from '../data'
import { AnalogBar, CaseCard, Cite, Finding, Hmi, PriBadge, Refs } from '../ui'
import './intro.css'

/** 사전(glossary.ts)에 없는 이 탭 전용 용어 */
const X: Record<string, string> = {
  '상황실': '현장 여러 곳의 센서·CCTV·알람을 한곳에 모아 지켜보는 방이에요. 공장이나 물류센터의 안전관리 상황실이 여기에 해당해요.',
  '%LEL': '가연성 가스가 폭발할 수 있는 가장 낮은 농도를 100으로 볼 때, 지금 농도가 얼마인지예요. 10%LEL이면 폭발 농도의 10분의 1이에요.',
  'ppm': '백만분의 1을 뜻하는 단위예요. 일산화탄소 50ppm은 공기 100만 중 50이 일산화탄소라는 뜻이에요.',
  '밀폐공간': '지하 탱크나 맨홀처럼 드나드는 곳이 좁고 공기가 잘 안 바뀌는 곳이에요. 산소가 부족하거나 유해 가스가 고이기 쉬워요.',
  '위치 태그': '작업자가 몸에 다는 작은 장치예요. 지금 어느 구역에 있는지를 시스템에 알려 줘요.',
  '웨어러블': '작업자가 몸에 차는 기기예요. 넘어짐이나 오래 움직이지 않음을 감지해 알려 줘요.',
  '교정': '센서 눈금을 기준 가스나 기준 값에 맞춰 바로잡는 일이에요. 기한이 지나면 값이 실제와 달라질 수 있어요.',
  '빈 상태': '보여 줄 이벤트가 하나도 없을 때의 화면이에요. 관제 화면에서는 이게 가장 흔하고, 가장 중요한 상태예요.',
}

/* ================= 1. 세 가지 대시보드 비교 ================= */
const KINDS = ['분석형', '경영형', '관제형'] as const
type Kind = typeof KINDS[number]
const COMPARE: { row: string; v: Record<Kind, ReactNode> }[] = [
  { row: '누가 보나', v: { 분석형: '분석가 · 기획자', 경영형: '경영진 · 팀장', 관제형: '교대로 근무하는 상황실 근무자' } },
  { row: '얼마나 오래', v: { 분석형: '질문 하나를 푸는 동안', 경영형: '회의 때 몇 분', 관제형: <><b>교대 내내 8~12시간</b> 띄워 둬요</> } },
  { row: '어디서', v: { 분석형: '개인 PC', 경영형: '회의실 · 메일 · 휴대폰', 관제형: '상황실 벽면 화면 + 여러 대 모니터' } },
  { row: '무엇을 묻나', v: { 분석형: '왜 그랬지? 무엇과 관련 있지?', 경영형: '목표대로 가고 있나?', 관제형: <><b>지금 괜찮은가?</b> 무엇이 이상한가? 무엇을 해야 하나?</> } },
  { row: '값이 바뀌는 주기', v: { 분석형: '필요할 때', 경영형: '하루 · 주 · 월', 관제형: '몇 초~몇 분마다 계속' } },
  { row: '대부분의 시간에 하는 일', v: { 분석형: '깊이 파고들기', 경영형: '훑어보기', 관제형: <><b>'아무 일 없음'을 확인</b>하기</> } },
  { row: '잘못되면', v: { 분석형: '결론이 틀려서 다시 분석해요', 경영형: '결정이 늦어져요', 관제형: <><b>화재 · 가스 누출 · 사람이 다침.</b> 놓치면 바로 현장에 피해가 나요</> } },
  { row: '좋은 화면이란', v: { 분석형: '깊이 파고들 수 있는 화면', 경영형: '요약이 정확한 화면', 관제형: <>평소엔 조용하고, <b>드문 이상은 놓칠 수 없는</b> 화면</> } },
]

function Compare() {
  const [focus, setFocus] = useState<Kind>('관제형')
  return (
    <div className="in-cmp">
      <div className="in-row">
        <span className="muted">강조해서 보기</span>
        <Seg value={focus} onChange={setFocus} options={KINDS.map(k => [k, k] as const)} />
      </div>
      <div className="sys-table-wrap">
        <table className="sys-table in-cmp-t">
          <thead><tr><th style={{ width: 120 }}>구분</th>{KINDS.map(k => <th key={k} className={k === focus ? 'on' : ''}>{k}{k === '관제형' && ' (운영형)'}</th>)}</tr></thead>
          <tbody>
            {COMPARE.map(r => (
              <tr key={r.row}>
                <th scope="row">{r.row}</th>
                {KINDS.map(k => <td key={k} className={k === focus ? 'on' : ''}>{r.v[k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================= 흔한 실수: before / after 목업 ================= */
const OLD_FEED = [
  { t: '02:13:58', k: '화재', w: '제2공장 도장 부스', m: '연기 감지' },
  { t: '02:13:41', k: '가스', w: '화학물질 창고', m: '가연성 가스 경보' },
  { t: '02:13:20', k: '침입', w: '물류센터 상하차장', m: '위험구역 진입' },
  { t: '02:12:57', k: '추락', w: '신축 현장 고소작업', m: '안전대 미체결' },
  { t: '02:12:31', k: '쓰러짐', w: '신축 현장 지하', m: '작업자 무응답' },
]
const sitesWorkers = (id: string) => SAFE_SITES.find(s => s.id === id)!.zones.reduce((a, z) => a + z.workers, 0)
const SENSOR_N = SAFE_SITES.reduce((a, s) => a + s.zones.reduce((b, z) => b + z.sensors.length, 0), 0)

function OldHead({ title }: { title: string }) {
  return (
    <div className="in-old-bar">
      <b>{title}</b>
      <span><i className="lamp" aria-hidden="true" />정상 운영 중</span>
    </div>
  )
}

function DemoBefore() {
  return (
    <div className="in-old" role="img" aria-label="흔한 화면: 데모 이벤트가 진짜처럼 빨간 글씨로 흘러가는 다크 대시보드">
      <OldHead title="통합 안전관리 시스템" />
      <div className="in-old-kpi">
        <div><small>오늘 이벤트</small><b className="red">128</b></div>
        <div><small>화재</small><b className="red">7</b></div>
        <div><small>가스</small><b className="red">12</b></div>
        <div><small>보호구</small><b className="red">41</b></div>
      </div>
      <ul className="in-old-feed">
        {OLD_FEED.map(f => <li key={f.t}><span>{f.t}</span><b className="red">[{f.k}]</b><span>{f.w}</span><span className="red">{f.m}</span></li>)}
      </ul>
      <p className="in-old-cap">이 다섯 줄은 전부 화면이 비어 보이지 않게 넣어 둔 데모 이벤트예요. 진짜 화재가 섞여도 구분할 수 없어요.</p>
    </div>
  )
}
function DemoAfter() {
  return (
    <Hmi title={`${SAFE_CENTER} · 전체 개요`} right="02:14:05" className="in-mk">
      <div className="in-mk-sites">
        {SAFE_SITES.map(s => <div key={s.id}><b>{s.name}</b><span>정상 · 인원 {sitesWorkers(s.id)}명</span></div>)}
      </div>
      <div className="in-mk-empty">
        <b>지금 울리는 알람 없음</b>
        <span>센서 {SENSOR_N}/{SENSOR_N}개 응답 · 마지막 수신 02:14:04</span>
      </div>
      <p className="in-mk-note">훈련용 이벤트는 '훈련 모드'에서만 띄워요. 그때는 화면 전체에 '훈련 중' 띠를 둘러요.</p>
    </Hmi>
  )
}

function LiveBefore() {
  return (
    <div className="in-old" role="img" aria-label="흔한 화면: 끊긴 영상과 녹화 영상에도 빨간 실시간 표시가 붙어 있음">
      <OldHead title="CCTV 모니터링" />
      <div className="in-old-cams">
        {['도장 부스 입구', '화학물질 창고', '상하차장'].map((c, i) => (
          <div key={c} className="cam">
            <span className="live"><i aria-hidden="true" />실시간</span>
            <span className="cam-name">{c}</span>
            <span className="cam-t">02:1{i === 0 ? '4:05' : i === 1 ? '1:02' : '4:05'}</span>
          </div>
        ))}
      </div>
      <p className="in-old-cap">가운데 화면은 3분 전에 멈췄어요. 오른쪽은 녹화 재생 중이에요. 그런데 세 화면 모두 '실시간'이라고 말해요.</p>
    </div>
  )
}
function LiveAfter() {
  return (
    <Hmi title="제2공장 · CCTV" right="02:14:05" className="in-mk">
      <div className="in-mk-cams">
        <div className="cam"><span className="tag">실시간 · 02:14:05</span><span className="cam-name">도장 부스 입구</span></div>
        <div className="cam stale"><span className="tag warn">영상 끊김 · 마지막 화면 02:11:02 (3분 전)</span><span className="cam-name">화학물질 창고</span></div>
        <div className="cam rec"><span className="tag">녹화 재생 · 01:50 장면</span><span className="cam-name">상하차장</span></div>
      </div>
      <p className="in-mk-note">'실시간'은 지금 받은 영상에만 붙여요. 끊긴 영상은 빗금과 마지막 시각, 녹화는 재생 시각을 따로 보여 줘요.</p>
    </Hmi>
  )
}

function CrowdBefore() {
  return (
    <div className="in-old" role="img" aria-label="흔한 화면: 영상, 지도, 절차, 채팅, 통계가 한 화면에 빽빽하게 들어감">
      <OldHead title="스마트 안전 통합 대시보드" />
      <div className="in-old-grid">
        <div className="p cams"><small>CCTV 16분할</small><span className="g16">{Array.from({ length: 16 }, (_, i) => <i key={i} />)}</span></div>
        <div className="p"><small>현장 지도</small><span className="map"><i className="r" /><i /><i className="r" /><i /><i className="r" /></span></div>
        <div className="p"><small>대응 절차</small><span className="txt">1. 작업 중지 2. 위험 제거 3. 구조 4. 대피 5. 신고…</span></div>
        <div className="p"><small>채팅</small><span className="txt">반장: 확인 중 / 설비팀: 이동 중 / …</span></div>
        <div className="p"><small>월별 통계</small><span className="bars">{[5, 8, 3, 9, 6, 7].map((h, i) => <i key={i} style={{ height: h * 8 + '%' }} />)}</span></div>
        <div className="p"><small>이벤트</small><span className="txt red">[가스] 화학물질 창고 12%LEL<br />[보호구] 상하차장<br />[설비] 프레스 3호기</span></div>
      </div>
      <p className="in-old-cap">지금 괜찮은가요? 5초 안에 답해 보세요.</p>
    </div>
  )
}
function CrowdAfter() {
  const a = SAFE_ALARMS[2]
  return (
    <Hmi title={`${SAFE_CENTER} · 전체 개요`} right="02:14:05" className="in-mk">
      <div className="in-mk-sites big">
        {SAFE_SITES.map(s => {
          const hit = s.id === 'F'
          return <div key={s.id} className={hit ? 'alarm' : ''}><b>{s.name}</b><span>{hit ? <><PriBadge p={a.pri} /> 알람 1건</> : '정상'}</span></div>
        })}
      </div>
      <div className="in-mk-al"><PriBadge p={a.pri} /><b>{a.where}</b><span>{a.what}</span></div>
      <p className="in-mk-note">벽면에는 "지금 괜찮은가?"의 답만 둬요. CCTV, 절차, 채팅은 알람을 눌러 들어간 구역 화면이나 옆 모니터에서 열어요.</p>
    </Hmi>
  )
}

function Mistakes() {
  return (
    <div className="in-cases">
      <CaseCard sev="치명" title="이벤트가 없으면 허전하다고 샘플 데이터로 채워 둬요"
        now={<>평소 화면이 비어 보이면 "일 안 하는 시스템"처럼 보인다는 이유로 데모 이벤트나 샘플 숫자를 띄워 둬요. 빨간 글씨가 늘 흘러가요.</>}
        why={<>안전관리 화면이 해서는 안 되는 일이에요. 근무 시간 대부분의 정답은 '아무 일 없음'인데, 그걸 확인할 수 없게 돼요. 처음 보는 것(1단계 지각)이 거짓이면 이해와 예측도 함께 무너져요<Cite n={1} />. 늘 빨간 화면을 보면 사람은 빨강을 무시하게 돼요.</>}
        fix={<><b>빈 상태를 '이상 없음'이라는 정보로 바꿔요.</b> "지금 울리는 알람 없음"과 함께 응답한 센서 수, 마지막 수신 시각을 보여 줘요. 데모는 '훈련 모드'로만 띄우고, 화면 전체에 훈련 표시를 둘러요.</>}
        before={<DemoBefore />} after={<DemoAfter />} />
      <CaseCard sev="높음" title="끊긴 영상과 녹화 영상에도 '실시간'이라고 붙여요"
        now={<>CCTV 칸마다 빨간 점과 '실시간' 글자가 고정으로 붙어 있어요. 영상이 멈춰도, 녹화를 틀어도 그대로예요.</>}
        why={<>멈춘 화면이 정상처럼 보이는 게 가장 위험해요. 근무자는 멈춘 화면을 보고 "구역이 조용하다"고 판단해요. 위의 센서 오류처럼, 틀린 1단계는 틀린 판단으로 이어져요<Cite n={1} />. 게다가 빨강을 장식처럼 쓰면 진짜 알람의 빨강이 약해져요<Cite n={4} />.</>}
        fix={<><b>'실시간'은 지금 받은 영상에만 붙여요.</b> 영상 시각을 늘 표시하고, 끊기면 빗금과 "마지막 화면 몇 분 전"을 띄워요. 녹화는 다른 표시로 구분해요. 표시는 회색으로 두고 빨강은 알람에만 써요.</>}
        before={<LiveBefore />} after={<LiveAfter />} />
      <CaseCard sev="높음" title="영상·지도·절차·채팅·통계를 한 화면에 다 넣어요"
        now={<>"한눈에 다 보인다"는 이유로 CCTV 16분할, 지도, 대응 절차, 채팅, 월별 통계를 한 장에 넣어요. 칸마다 글자는 10px 남짓이에요.</>}
        why={<>"지금 괜찮은가?"에 5초 안에 답할 수 없어요. 한 화면에서 한눈에 볼 것은 지금의 판단에 필요한 정보뿐이에요<Cite n={5} />. 전체 개요 화면은 맡은 범위의 상태만 보여 주는 곳이에요<Cite n={4} />. 월별 통계는 지금의 결정이 아니에요(아래 '전략·전술·운영' 참고).</>}
        fix={<><b>질문 하나에 화면 하나.</b> 벽면 전체 개요는 현장 3곳의 상태와 알람만 보여 줘요. 영상과 절차는 알람을 눌러 들어간 구역 화면(레벨 2~3)에서 열어요. 통계는 경영형 화면으로 보내요.</>}
        before={<CrowdBefore />} after={<CrowdAfter />} />
    </div>
  )
}

/* ================= 2. 상황 인식 3단계 (Endsley) ================= */
const NOW_LABEL = '14:42'
const LEL = SAFE_RANGES.lel
/** 화학물질 창고 지난 60분 가연성 가스 — 35분 전부터 분당 약 0.3%LEL씩 오르는 중, 마지막 값 12%LEL */
const G_PAST = (() => {
  const r = rng(11)
  const a = Array.from({ length: 61 }, (_, i) => {
    const m = i - 60
    return (m < -35 ? 1.5 : 1.5 + 0.3 * (m + 35)) + (r() - 0.5) * 0.8
  })
  a[60] = 12
  return a.map(v => +Math.max(0, v).toFixed(1))
})()
const FAULT_GAIN = 0.46 // 센서 오류: 실제의 약 절반으로 읽힘
const slopeOf = (a: number[]) => {
  const s = a.slice(-31), n = s.length, mx = (n - 1) / 2
  const my = s.reduce((p, v) => p + v, 0) / n
  let num = 0, den = 0
  s.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) ** 2 })
  return num / den
}
const addMin = (hhmm: string, m: number) => {
  const [h, mm] = hhmm.split(':').map(Number)
  const t = h * 60 + mm + m
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

type SaLv = 1 | 2 | 3
const SA_STEPS: { lv: SaLv; name: string; q: string }[] = [
  { lv: 1, name: '지각(보기)', q: '무엇이 보이나?' },
  { lv: 2, name: '이해', q: '그게 무슨 뜻인가?' },
  { lv: 3, name: '예측', q: '앞으로 어떻게 되나?' },
]
const ALARM_AT = LEL.alarm[1]

function TrendChart({ past, slope, proj }: { past: number[]; slope: number; proj: boolean }) {
  const W = 520, H = 190, L = 34, R = 26, T = 12, B = 26
  const x = (m: number) => L + ((m + 60) / 120) * (W - L - R)
  const y = (v: number) => T + (1 - (v - LEL.min) / (LEL.max - LEL.min)) * (H - T - B)
  const last = past[past.length - 1]
  const d = past.map((v, i) => `${i ? 'L' : 'M'}${x(i - 60).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const endV = Math.min(LEL.max, last + slope * 60)
  const hit = slope > 0 ? (ALARM_AT - last) / slope : Infinity
  const nb = LEL.normal
  return (
    <svg className="in-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`화학물질 창고 가연성 가스 추세. 지난 60분 ${past[0]}%LEL에서 ${last}%LEL.`}>
      <rect className="band" x={L} width={W - L - R} y={y(nb[1])} height={y(nb[0]) - y(nb[1])} />
      <line className="al" x1={L} x2={W - R} y1={y(ALARM_AT)} y2={y(ALARM_AT)} />
      <text className="lbl" x={L + 6} y={y(ALARM_AT) - 5}>경보 {ALARM_AT}%LEL</text>
      <text className="lbl" x={L + 6} y={y(nb[1]) - 5}>정상 범위 {nb[0]}~{nb[1]}%LEL</text>
      {[0, 20, 40, 60].map(v => <text key={v} className="ax" x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text>)}
      {[-60, -30, 0, 30, 60].map(m => <text key={m} className="ax" x={x(m)} y={H - 8} textAnchor="middle">{m === 0 ? '지금' : (m > 0 ? '+' : '') + m + '분'}</text>)}
      <line className="now" x1={x(0)} x2={x(0)} y1={T} y2={H - B} />
      <path className="line" d={d} />
      {proj && <path className="proj" d={`M${x(0)},${y(last)}L${x(60)},${y(endV)}`} />}
      {proj && hit <= 60 && <circle className="hit" cx={x(hit)} cy={y(ALARM_AT)} r="5" />}
      <circle className="dot" cx={x(0)} cy={y(last)} r="3.5" />
    </svg>
  )
}

function SituationAwareness() {
  const [lv, setLv] = useState<SaLv>(1)
  const [fault, setFault] = useState(false)
  const [quality, setQuality] = useState(false)
  const real = G_PAST
  const shown = useMemo(() => (fault ? real.map(v => +(v * FAULT_GAIN).toFixed(1)) : real), [fault, real])
  const v = Math.round(shown[shown.length - 1])
  const slope = slopeOf(shown)
  const realSlope = slopeOf(real)
  const hit = Math.round((ALARM_AT - v) / slope)
  const realHit = Math.round((ALARM_AT - 12) / realSlope)
  const nb = LEL.normal
  const high = v > nb[1]
  const flagged = fault && quality

  const concl: Record<SaLv, { shown: string; truth: string }> = {
    1: { shown: `화학물질 창고 가연성 가스 ${v}%LEL`, truth: '화학물질 창고 가연성 가스 12%LEL' },
    2: { shown: high ? `정상 범위(${nb[0]}~${nb[1]}%LEL)보다 높아요. 경보(${ALARM_AT}%LEL)까지는 아직이에요` : `정상 범위(${nb[0]}~${nb[1]}%LEL) 안이에요. 괜찮아요`, truth: '정상 범위보다 높아요. 경보까지는 아직이에요' },
    3: { shown: hit <= 120 ? `이 속도로 오르면 약 ${hit}분 뒤(${addMin(NOW_LABEL, hit)}쯤) 경보 ${ALARM_AT}%LEL에 닿아요` : '2시간 안에는 경보에 닿지 않을 것 같아요', truth: `약 ${realHit}분 뒤 경보에 닿아요 → 지금 환기를 늘리고 누출 점검을 보내야 해요` },
  }
  const wrong = fault && !quality

  return (
    <div className="in-sa">
      <ol className="in-sa-steps" aria-label="상황 인식 단계">
        {SA_STEPS.map((s, i) => (
          <li key={s.lv}>
            <button type="button" className={'in-sa-step' + (lv === s.lv ? ' on' : '') + (s.lv <= lv ? ' reached' : '')} aria-pressed={lv === s.lv} onClick={() => setLv(s.lv)}>
              <small>{s.lv}단계</small>
              <b>{s.name}</b>
              <span>{s.q}</span>
            </button>
            {i < 2 && <span className="in-sa-arrow" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>

      <div className="in-sa-body">
        <Hmi title={`${SAFE_CENTER} · 제2공장`} right={NOW_LABEL} className="in-sa-hmi">
          <div className="in-sa-tile">
            <div className="in-sa-name">화학물질 창고 <small>가스 센서 · 가연성 가스</small></div>
            <div className={'in-sa-val' + (flagged ? ' susp' : '')}>
              <b>{v}</b><span>%LEL</span>
              {flagged && <em>계측 의심</em>}
            </div>
            {lv >= 2 && (
              <div className="in-sa-l2">
                <AnalogBar value={v} min={LEL.min} max={LEL.max} normal={nb} alarm={LEL.alarm} unit="%LEL" name="화학물질 창고 가연성 가스" w={260} />
                <div className="in-sa-scale" aria-hidden="true">{([[0, '0'], [LEL.normal[1], String(LEL.normal[1])], [ALARM_AT, '경보 ' + ALARM_AT], [LEL.max, String(LEL.max)]] as [number, string][]).map(([n, l]) => <span key={n} style={{ left: (n / LEL.max) * 100 + '%' }}>{l}</span>)}</div>
                <p>{flagged ? '교정 기한이 지났고, 옆 센서 값과도 맞지 않아요. 이 값을 믿기 전에 먼저 확인해요.' : high ? '정상 범위보다 높아요' : '정상 범위 안이에요'}</p>
              </div>
            )}
            {lv >= 3 && (
              <div className="in-sa-l3">
                <TrendChart past={shown} slope={slope} proj={!flagged} />
                <p>{flagged ? '예측선을 그리지 않았어요. 값이 의심스러울 때 예측선을 그리면, 틀린 예측을 믿게 돼요.' : concl[3].shown}</p>
              </div>
            )}
          </div>
        </Hmi>

        <div className="in-sa-side">
          <div className="in-sa-ctl">
            <label className="in-check"><input type="checkbox" checked={fault} onChange={e => setFault(e.target.checked)} /> <span><b>센서 오류 넣기</b> 가스 센서의 <Term k="교정" d={X['교정']} /> 기한이 지나 감도가 떨어졌어요. 값이 실제의 절반쯤으로 읽혀요</span></label>
            <label className={'in-check' + (fault ? '' : ' dim')}><input type="checkbox" checked={quality} disabled={!fault} onChange={e => setQuality(e.target.checked)} /> <span><b>값 품질 표시 켜기</b> 교정 기한이 지났거나 옆 센서와 맞지 않으면 값 옆에 '계측 의심'을 붙여요</span></label>
          </div>
          <ol className="in-sa-chain" aria-label="근무자가 내리는 판단">
            {SA_STEPS.map(s => {
              const active = s.lv <= lv
              const st = !active ? 'idle' : flagged ? 'check' : wrong ? 'bad' : 'ok'
              return (
                <li key={s.lv} className={'in-sa-c ' + st}>
                  <span className="k">{s.lv}단계 {s.name}</span>
                  {active ? (
                    <>
                      <b>{flagged ? (s.lv === 1 ? `읽힌 값은 ${v}%LEL예요. 확인이 필요해요` : '판단을 미뤄요 → 휴대용 측정기로 현장 값을 먼저 확인') : concl[s.lv].shown}</b>
                      {wrong && <span className="truth"><i aria-hidden="true">✕</i> 실제: {concl[s.lv].truth}</span>}
                    </>
                  ) : <span className="muted">단계를 눌러 열어 보세요</span>}
                </li>
              )
            })}
          </ol>
          {wrong && lv === 3 && <p className="in-sa-msg">세 판단이 모두 틀렸어요. 근무자는 아무 실수도 하지 않았는데요. <b>처음 본 값(1단계)이 틀리면 이해와 예측도 함께 틀려요.</b></p>}
        </div>
      </div>
    </div>
  )
}

/* ================= 3. 상황실 화면의 하루 ================= */
type PhaseId = 'take' | 'calm' | 'sign' | 'resp' | 'hand'
const PHASES: { id: PhaseId; from: number; to: number }[] = [
  { id: 'take', from: 0, to: 10 }, { id: 'calm', from: 10, to: 375 }, { id: 'sign', from: 375, to: 390 },
  { id: 'resp', from: 390, to: 415 }, { id: 'calm', from: 415, to: 710 }, { id: 'hand', from: 710, to: 720 },
]
const PH: Record<PhaseId, { name: string; job: ReactNode; screen: string[]; link: [string, string] }> = {
  take: { name: '근무 넘겨받기', job: '앞 근무자가 남긴 일을 넘겨받아요.', screen: ['아직 안 끝난 일과 잠시 꺼 둔(보류) 알람을 한 화면에 모아요', '지난 근무에 있었던 특별한 일을 요약해요', '맡은 현장 3곳이 지금 정상인지 한눈에 보여요'], link: ['#/dash/ops', '08 교대 인수인계'] },
  calm: { name: '평온', job: "'아무 일 없음'을 빠르게 확인하고 넘어가요.", screen: ['정상일 땐 회색으로 조용하게, 눈에 띄지 않게 해요', '움직이거나 깜빡이는 것이 없어요', '몇 초만 훑어봐도 "괜찮다"를 알 수 있어야 해요'], link: ['#/dash/color', '02 회색이 기본, 색은 신호'] },
  sign: { name: '이상 조짐', job: '알람은 아직 없어요. 하지만 도장 부스 가스 농도가 조금씩 오르고 있어요.', screen: ['지금 값보다 흐름(추세)을 보여 줘요. 천천히 오르는 농도가 먼저 보이게요', '정상 범위 띠 위에 값을 그려 "어디쯤인지" 보여 줘요', '알람이 울리기 전에 근무자가 먼저 알아채게 해요'], link: ['#/dash/context', '04 값보다 맥락'] },
  resp: { name: '사고 대응', job: '도장 부스에서 연기가 감지됐어요. 몇 분 안에 작업 중지와 대피를 판단해야 해요.', screen: ['원인이 된 알람 하나를 맨 위에 둬요. 뒤따라 생긴 알람은 묶어요', '알람을 누르면 그 구역 화면과 CCTV로 바로 가요', '무엇을 해야 하는지(대응 절차)도 바로 보여 줘요'], link: ['#/dash/alarm', '03 알람 설계'] },
  hand: { name: '근무 넘겨주기', job: '다음 근무자에게 넘겨요.', screen: ['이번 근무에 생긴 일을 시간 순서대로 보여 줘요', '아직 안 끝난 일과, 알람을 꺼 둔 이유를 남겨요', '넘겨준 기록이 다음 근무자의 첫 화면이 돼요'], link: ['#/dash/ops', '08 교대 인수인계'] },
}
const phaseAt = (t: number) => PHASES.find(p => t >= p.from && t < p.to) ?? PHASES[PHASES.length - 1]
const clock = (t: number) => addMin('08:00', Math.min(719, t))
/** 도장 부스 가연성 가스(%LEL) — 이상 조짐 때 조금씩 오름 (가상) */
const boothGas = (t: number) => (t >= 375 && t < 415 ? Math.min(9, 3 + Math.round((t - 375) * 0.4)) : 3)
interface DayAlarm { a: typeof SAFE_ALARMS[number]; zone: string; from: number; ack: number; to: number }
const DAY_ALARMS: DayAlarm[] = [
  { a: SAFE_ALARMS[0], zone: 'F2', from: 390, ack: 392, to: 415 },
  { a: SAFE_ALARMS[4], zone: 'W3', from: 600, ack: 601, to: 606 },
]

function DayTimeline() {
  const [t, setT] = useState(300)
  const p = phaseAt(t)
  const info = PH[p.id]
  const calm = PHASES.filter(x => x.id === 'calm').reduce((s, x) => s + x.to - x.from, 0)
  const active = DAY_ALARMS.filter(d => t >= d.from && t < d.to)
  const zoneState = (id: string): { txt: string; bad: boolean } => {
    const al = active.find(d => d.zone === id)
    if (al) return { txt: SAFE_EVENT[al.a.type].name, bad: true }
    if (id === 'F2' && boothGas(t) > 3) return { txt: `가스 ${boothGas(t)}%LEL ↑`, bad: false }
    return { txt: '정상', bad: false }
  }
  return (
    <div className="in-day">
      <div className="in-day-strip" aria-hidden="true">
        {PHASES.map((x, i) => (
          <i key={i} className={'s ' + x.id + (x === p ? ' on' : '')} style={{ left: (x.from / 720) * 100 + '%', width: ((x.to - x.from) / 720) * 100 + '%' }} />
        ))}
        <b className="cur" style={{ left: (t / 720) * 100 + '%' }} />
      </div>
      <div className="in-day-range">
        <Range value={t} min={0} max={719} onChange={setT} label="근무 시각" />
        <div className="in-day-ticks" aria-hidden="true">{['08:00', '11:00', '14:00', '17:00', '20:00'].map(s => <span key={s}>{s}</span>)}</div>
      </div>
      <div className="in-day-jump" role="group" aria-label="시간대로 이동">
        {(['take', 'calm', 'sign', 'resp', 'hand'] as PhaseId[]).map(id => {
          const first = PHASES.find(x => x.id === id)!
          return (
            <button key={id} type="button" className={'in-day-jb ' + id + (p.id === id ? ' on' : '')} aria-pressed={p.id === id} onClick={() => setT(id === 'calm' ? 300 : first.from + Math.floor((first.to - first.from) / 2))}>
              <i aria-hidden="true" /> {PH[id].name}
            </button>
          )
        })}
      </div>

      <div className="in-day-body">
        <Hmi title="전체 현장 개요" right={clock(t)} className="in-day-hmi">
          <div className="in-day-subs">
            {SAFE_SITES.map(s => {
              const hits = active.filter(d => s.zones.some(z => z.id === d.zone))
              const pr = hits.length ? (Math.min(...hits.map(h => h.a.pri)) as Pri) : null
              return (
                <div key={s.id} className={'in-day-sub' + (pr ? ' alarm' : '')}>
                  <div className="h"><b>{s.name}</b>{pr && <PriBadge p={pr} />}</div>
                  {s.zones.map(z => {
                    const st = zoneState(z.id)
                    return (
                      <div key={z.id} className="f">
                        <span>{z.name}</span>
                        <small>{z.workers}명</small>
                        <em className={st.bad ? 'bad' : st.txt === '정상' ? '' : 'warn'}>{st.txt}</em>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div className="in-day-al" aria-live="off">
            {active.length === 0 ? <span className="none">지금 울리는 알람 없음</span> : active.map(d => (
              <div key={d.a.id} className={'row' + (t < d.ack ? ' unack' : '')}>
                <PriBadge p={d.a.pri} />
                <b>{d.a.where}</b><span>{d.a.what}</span><small>{t < d.ack ? '미확인' : '확인됨'}</small>
              </div>
            ))}
          </div>
        </Hmi>
        <div className="in-day-info">
          <div className="in-day-ph"><span className={'sw ' + p.id} aria-hidden="true" /><b>{info.name}</b><small>{clock(p.from)}~{clock(p.to - 1)}</small></div>
          <p className="in-day-job">{info.job}</p>
          <div className="in-day-k">이때 화면이 해줘야 하는 일</div>
          <ul>{info.screen.map(s => <li key={s}>{s}</li>)}</ul>
          <a href={info.link[0]}>{info.link[1]} →</a>
        </div>
      </div>
      <p className="in-day-foot">이 예시 근무 12시간 중 <b>{Math.round((calm / 720) * 100)}%</b>가 평온이에요. 화면은 그 긴 시간 동안 조용해야 해요. 그리고 사고가 난 몇 분 동안은 절대 놓칠 수 없게 눈에 띄어야 해요. 이 두 가지를 함께 해내는 게 관제 화면 디자인이에요.</p>
    </div>
  )
}

/* ================= 4. 의사결정 수준 분류 (Sarikaya) ================= */
type Dec = '전략' | '전술' | '운영'
const DECS: { id: Dec; who: string; span: string; ex: string }[] = [
  { id: '전략', who: '경영진', span: '몇 달 ~ 몇 년', ex: '방향을 정해요' },
  { id: '전술', who: '안전 관리자 · 기획자', span: '며칠 ~ 몇 주', ex: '사람·장비를 어디에 쓸지 정해요' },
  { id: '운영', who: '상황실 근무자', span: '지금 ~ 몇 시간', ex: '지금 조치해요' },
]
const QUIZ: { q: string; a: Dec }[] = [
  { q: '지금 화학물질 창고 가스 농도가 괜찮은가?', a: '운영' },
  { q: '3년 안에 모든 현장에 가스 센서를 새로 깔까?', a: '전략' },
  { q: '이번 주 보호구 미착용이 가장 많았던 구역은?', a: '전술' },
  { q: '도장 부스에서 연기 감지. 지금 작업을 멈출까?', a: '운영' },
  { q: '다음 달 어느 현장의 안전 교육을 먼저 할까?', a: '전술' },
  { q: '올해 다친 사람 수를 작년보다 줄였나?', a: '전략' },
]

function DecisionQuiz() {
  const [ans, setAns] = useState<(Dec | null)[]>(() => QUIZ.map(() => null))
  const done = ans.filter(Boolean).length
  const right = ans.filter((a, i) => a === QUIZ[i].a).length
  return (
    <div className="in-dec">
      <div className="in-dec-lad" aria-label="의사결정 수준">
        {DECS.map(d => (
          <div key={d.id} className={'in-dec-l' + (d.id === '운영' ? ' me' : '')}>
            <b>{d.id}</b>
            <span>{d.who}</span>
            <small>{d.span} · {d.ex}</small>
            {d.id === '운영' && <em>상황실 화면은 여기예요</em>}
          </div>
        ))}
      </div>
      <ul className="in-dec-q">
        {QUIZ.map((x, i) => {
          const a = ans[i]
          return (
            <li key={i} className={a ? (a === x.a ? 'ok' : 'no') : ''}>
              <span className="q">"{x.q}"</span>
              <Seg value={a ?? ('' as Dec)} onChange={v => setAns(s => s.map((y, j) => (j === i ? v : y)))} options={DECS.map(d => [d.id, d.id] as const)} />
              <span className="r" aria-live="polite">{a ? (a === x.a ? '✓ 맞아요' : `✕ ${x.a}에 가까워요`) : ''}</span>
            </li>
          )
        })}
      </ul>
      <div className="in-row">
        <span className="muted">{done} / {QUIZ.length} 답함 · 맞힘 <b>{right}</b></span>
        <span className="in-grow" />
        <button type="button" className="btn sm ghost" onClick={() => setAns(QUIZ.map(() => null))} disabled={!done}>다시 하기</button>
      </div>
    </div>
  )
}

/* ================= 5. Bach 디자인 패턴 8그룹 ================= */
const BACH: { g: string; kind: '구성 요소' | '구성 방식'; ex: string; ops: string; link: [string, string] }[] = [
  { g: '데이터 정보', kind: '구성 요소', ex: '값 하나 · 계산한 값 · 기준값', ops: '안전관리 화면에서는 "기준값"이 핵심이에요. 가스 12%LEL 옆에 정상 범위(10%LEL 이하)를 함께 둬요.', link: ['#/dash/context', '04'] },
  { g: '메타 정보', kind: '구성 요소', ex: '데이터 출처 · 안내 문구 · 주석', ops: '"데이터에 대한 정보"예요. 마지막으로 값을 받은 시각, 센서 통신 상태, 영상이 실시간인지 녹화인지가 여기 들어가요. 화면이 멈췄을 때 알아채게 해 줘요.', link: ['#/dash/realtime', '05'] },
  { g: '시각 표현', kind: '구성 요소', ex: '숫자 · 추세 화살표 · 표', ops: '숫자만 두지 않아요. 정상 범위가 그려진 막대(아날로그 막대)와 추세를 함께 붙여요.', link: ['#/dash/context', '04'] },
  { g: '상호작용', kind: '구성 요소', ex: '탐색 · 이동 · 필터와 초점', ops: '안전관리에서는 "이동"이 가장 중요해요. 알람을 누르면 그 구역 화면과 CCTV로 바로 가요.', link: ['#/dash/levels', '01'] },
  { g: '화면 공간', kind: '구성 방식', ex: '한 화면에 맞춤 · 화면 밖으로 넘침 · 누르면 세부', ops: '벽면 화면은 스크롤 없이 한 화면에 다 들어가게 해요. 자세한 내용은 각자 화면에서 눌러서 봐요.', link: ['#/dash/room', '07'] },
  { g: '구조', kind: '구성 방식', ex: '한 페이지 · 단계형(위계) · 나란히(병렬)', ops: '관제는 단계형이에요. 전체 현장 → 현장 → 구역 → 센서 순서로 들어가요.', link: ['#/dash/levels', '01'] },
  { g: '페이지 배치', kind: '구성 방식', ex: '열린 배치 · 표 배치 · 묶음 배치', ops: '현장과 구역 단위로 묶어 배치해요. 현장이 실제로 나뉜 방식과 화면이 묶인 방식을 같게 해요.', link: ['#/dash/map', '06'] },
  { g: '색', kind: '구성 방식', ex: '구별용 색 · 여러 차트 공통 색 · 뜻이 있는 색', ops: '관제에서는 뜻이 있는 색(의미 색)만 써요. 그것도 비정상일 때만요.', link: ['#/dash/color', '02'] },
]

function BachGroups() {
  const [sel, setSel] = useState(0)
  const b = BACH[sel]
  return (
    <div className="in-bach">
      <div className="in-bach-grid">
        {(['구성 요소', '구성 방식'] as const).map(k => (
          <div key={k} className="in-bach-col">
            <div className="in-bach-k">{k === '구성 요소' ? '구성 요소 패턴 — 무엇을 보여주나' : '구성 방식 패턴 — 어떻게 배치하나'}</div>
            <div className="in-bach-cells">
              {BACH.map((x, i) => x.kind === k && (
                <button key={x.g} type="button" className={'in-bach-c' + (i === sel ? ' on' : '')} aria-pressed={i === sel} onClick={() => setSel(i)}>
                  <b>{x.g}</b><small>{x.ex}</small>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="in-bach-d" aria-live="polite">
        <b>{b.g}</b> <span className="muted">— 안전관리 화면에서는</span>
        <p>{b.ops} <a href={b.link[0]}>{b.link[1]} 탭에서 →</a></p>
      </div>
    </div>
  )
}

/* ================= 6. 공통 예시 소개 ================= */
const RANGE_ROWS: { k: keyof typeof SAFE_RANGES; alarm: string }[] = [
  { k: 'lel', alarm: `${SAFE_RANGES.lel.alarm[1]}%LEL 초과` },
  { k: 'co', alarm: `${SAFE_RANGES.co.alarm[1]}ppm 초과` },
  { k: 'temp', alarm: `${SAFE_RANGES.temp.alarm[1]}℃ 초과` },
  { k: 'vib', alarm: `${SAFE_RANGES.vib.alarm[1]}mm/s 초과` },
]
function Scenario() {
  return (
    <div className="in-scn">
      <Hmi title={SAFE_CENTER} right="가상 현장 3곳 · 구역 9개" className="in-scn-hmi">
        <div className="in-scn-grid">
          {SAFE_SITES.map(s => (
            <div key={s.id} className="in-scn-sub">
              <b>{s.name} <small>{s.kind}</small></b>
              <div className="in-scn-h" aria-hidden="true"><span>구역</span><span>인원</span><span>센서</span></div>
              {s.zones.map(z => (
                <div key={z.id} className="in-scn-f">
                  <span>{z.name}</span>
                  <span className="n">{z.workers}명</span>
                  <span className="s">{z.sensors.length ? z.sensors.join(' · ') : 'CCTV · 위치 태그'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Hmi>
      <div className="in-scn-side">
        <p>이 영역의 모든 탭은 <b>{SAFE_PLACE}</b>의 {SAFE_CENTER} 하나로 설명해요. 제조·물류·건설 현장 3곳, 구역 9개, 그리고 알람 몇 개가 나와요.</p>
        <p>감지하는 일은 어느 안전관리 시스템에나 있는 것들이에요. {Object.values(SAFE_EVENT).map(e => e.name).join(', ')}.</p>
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>측정값</th><th>정상 범위</th><th>경보가 울리는 값</th></tr></thead>
            <tbody>
              {RANGE_ROWS.map(r => {
                const g = SAFE_RANGES[r.k]
                const unit = g.unit === '%LEL' ? <Term k="%LEL" d={X['%LEL']} /> : g.unit === 'ppm' ? <Term k="ppm" d={X['ppm']} /> : g.unit
                return <tr key={r.k}><td>{g.name}</td><td>{g.normal.join('~')}{unit}</td><td>{r.alarm}</td></tr>
              })}
            </tbody>
          </table>
        </div>
        <Note>예시의 회사·현장·사람·수치는 모두 가상이에요. 법정 기준값이나 실제 설비의 기준이 아니에요. 막대 읽는 법: 삼각형은 지금 값, 진한 띠는 정상 범위, 빗금은 경보 범위예요.</Note>
      </div>
    </div>
  )
}

/* ================= 7. 탭 지도 ================= */
const GROUP: Record<string, string> = { intro: '원리', levels: '구조', color: '표시', alarm: '알람', context: '표시', realtime: '표시', map: '구조', room: '환경', ops: '실무', fe: '실무' }
const TABS = DASH_TABS.map(t => ({ id: t.id, n: t.num, name: t.name, g: GROUP[t.id] ?? '' }))
type Role = 'all' | 'design' | 'plan' | 'fe'
const PATHS: Record<Role, { label: string; ids: string[]; why: string }> = {
  all: { label: '처음부터 전부', ids: TABS.map(t => t.id), why: '순서대로 읽으면 원리 → 구조 → 표시 → 알람 → 환경 → 실무로 이어져요.' },
  design: { label: '디자이너', ids: ['intro', 'color', 'context', 'levels', 'alarm', 'realtime', 'map', 'room'], why: '색과 표시 방식부터 익혀요. 그다음 화면 단계(위계)와 알람으로 넓혀요.' },
  plan: { label: '기획자', ids: ['intro', 'levels', 'alarm', 'ops', 'room', 'color'], why: '기획자가 만드는 문서의 중심은 화면 목록(위계)과 안전 이벤트 정의서예요.' },
  fe: { label: 'FE 개발자', ids: ['intro', 'realtime', 'fe', 'context', 'alarm', 'levels'], why: '구현할 때 가장 자주 부딪히는 문제는 값 갱신, 연결 끊김, 많은 데이터 처리예요.' },
}

function TabMap() {
  const [role, setRole] = useState<Role>('design')
  const path = PATHS[role]
  return (
    <div className="in-map">
      <div className="in-row">
        <span className="muted">나는</span>
        <Seg value={role} onChange={setRole} options={(Object.keys(PATHS) as Role[]).map(r => [r, PATHS[r].label] as const)} />
      </div>
      <ol className="in-map-grid">
        {TABS.map(t => {
          const k = path.ids.indexOf(t.id)
          return (
            <li key={t.id} className={k >= 0 ? 'on' : 'off'}>
              <a href={'#/dash/' + t.id}>
                <span className="ord" aria-label={k >= 0 ? `읽는 순서 ${k + 1}번째` : '이번 순서에서는 건너뜀'}>{k >= 0 ? k + 1 : '–'}</span>
                <span className="t"><small>{t.n} · {t.g}</small><b>{t.name}</b></span>
              </a>
            </li>
          )
        })}
      </ol>
      <p className="muted in-map-why">{path.why}</p>
    </div>
  )
}

/* ================= 탭 ================= */
export default function Tab() {
  return (
    <div data-dash="intro">
      <TermList keys={['관제', '상황실', '운영자', '상황 인식', 'HMI', '빈 상태', '정상 범위', '추세', '%LEL', 'ppm', '교정', '밀폐공간', '위치 태그', '웨어러블']} extra={X} />
      <SysGrid>
        <Section id="dash-intro-what" wide title="관제 화면은 구경하는 화면이 아니라 지키는 화면이에요"
          gist="관제 화면은 평소엔 조용하고, 이상이 생기면 바로 눈에 띄어야 해요."
          desc={<>공항 관제탑을 떠올려 보세요. 하루 종일 지켜보다가, 문제가 생기면 바로 대응해요. 공장의 안전관리 <Term k="상황실" d={X['상황실']} /> 화면도 같아요. 이름은 똑같이 '대시보드'지만, 분석·경영 대시보드와는 쓰는 사람이 달라요. 보는 시간도, 잘못됐을 때의 피해도 달라요.</>}>
          <Compare />
          <Note tone="tip"><b>제가 처음 관제 화면을 맡았을 때 가장 많이 한 실수</b>는 "예쁘고 정보가 많은 화면"을 만들려고 한 거예요. 상황실 <Term k="운영자">근무자</Term>에게 좋은 화면은 정보가 많은 화면이 아니에요. <b>12시간 동안 봐도 피곤하지 않고, 이상이 생기면 바로 보이는</b> 화면이에요.</Note>
        </Section>

        <Section id="dash-intro-mistakes" wide title="흔한 실수 — 평소 화면을 사고 화면처럼 만들어요"
          gist="'아무 일 없음'을 확인할 수 없는 화면은 사고도 못 알려 줘요."
          desc={<>업계에서 흔히 보는 안전관리 대시보드는 '평소'를 디자인하지 않아요. 비어 보이면 채우고, 멈춰도 '실시간'이라 말하고, 모든 걸 한 장에 넣어요. 카드마다 '흔한 화면'과 '업그레이드하면'을 눌러 비교해 보세요. 화면 속 회사와 수치는 모두 가상이에요.</>}>
          <Mistakes />
        </Section>

        <Section id="dash-intro-sa" wide title="상황 인식 3단계 — 보고, 이해하고, 예측해요"
          gist="처음 본 값이 틀리면 이해와 예측도 함께 틀려요. 화면은 세 단계를 다 도와야 해요."
          desc={<>운전할 때를 떠올려 보세요. "앞차 브레이크등이 켜졌다(보기) → 앞차가 선다(이해) → 곧 부딪힌다(예측)". 상황실 근무자 머릿속에서도 이 세 단계가 돌아가요. 이걸 <Term k="상황 인식" />이라고 하고, Endsley가 세 단계로 나눴어요<Cite n={1} />. 화면은 이 세 단계를 빠르게 밟도록 도와야 해요. 단계를 눌러 화면이 어떻게 달라지는지 보세요. 센서 오류도 넣어 보세요.</>}>
          <Finding src={<>Endsley (1995), Human Factors 37(1) — 한국어 요약</>}>
            상황 인식은 세 단계로 쌓여요. 먼저 눈앞의 요소를 <u>지각</u>해요(1단계, 보기). 다음으로 그 뜻을 <u>이해</u>해요(2단계). 마지막으로 가까운 미래를 <u>예측</u>해요(3단계). 앞 단계가 틀리면 뒤 단계도 함께 틀려요.
          </Finding>
          <SituationAwareness />
          <Note>숫자 '12%LEL'만 보여 주는 화면은 1단계(보기)까지만 도와요. '정상 범위에서 어디쯤인지'(이해)와 '언제 경보에 닿는지'(예측)는 근무자가 머릿속으로 계산해야 해요. 안전관리 화면에서는 이 계산을 화면이 대신해 줘야 해요. <Term k="정상 범위" />를 그리는 법은 <a href="#/dash/context">04 값보다 맥락</a>에서 이어져요. 값이 믿을 만한지, 화면이 멈추지 않았는지는 <a href="#/dash/realtime">05 실시간 갱신</a>에서 다뤄요.</Note>
        </Section>

        <Section id="dash-intro-day" wide title="근무 12시간 동안 화면이 하는 일"
          gist="근무 시간 대부분은 평온해요. 화면은 조용하다가 사고 때만 확 눈에 띄어야 해요."
          desc="낮 근무 12시간(08:00~20:00)을 예로 들었어요. 막대를 움직이거나 시간대 버튼을 눌러 보세요. 그 순간 상황실 화면이 무엇을 해 줘야 하는지 나와요.">
          <DayTimeline />
        </Section>

        <Section id="dash-intro-types" wide title="관제 화면은 '지금 당장'의 결정을 도와요"
          gist="관제 화면은 '지금 무엇을 할까'에 답해요. 몇 년짜리 질문은 다른 화면에서 다뤄요."
          desc={<>대시보드는 어떤 결정을 돕는지에 따라 나눌 수 있어요. 몇 년을 내다보는 결정은 전략, 몇 주 단위의 결정은 전술, 지금 당장의 결정은 운영이에요<Cite n={2} />. Sarikaya 등은 대시보드를 한 가지로 정의하지 않았어요. 목적, 보는 사람, 데이터에 따라 여러 유형으로 정리했어요. 아래 질문마다 어느 수준인지 골라 보세요.</>}>
          <DecisionQuiz />
          <Note>같은 데이터라도 질문의 수준이 다르면 화면도 달라야 해요. 예를 들어 "올해 무재해 며칠째"나 월별 사고 통계를 상황실 벽면에 크게 띄우면, 지금 생긴 이상을 보여 줄 자리가 줄어요.</Note>
        </Section>

        <Section id="dash-intro-bach" wide title="대시보드를 만드는 8가지 패턴 — 안전관리에서는 이렇게 써요"
          gist="기준값, 알람에서 바로 이동, 단계형 구조, 비정상에만 쓰는 색이 핵심이에요."
          desc={<>Bach 등은 대시보드 144개를 분석했어요. 그리고 자주 쓰이는 디자인 방식(패턴)을 8개 그룹으로 정리했어요<Cite n={3} />. 그룹을 누르면 안전관리 화면에서는 어떻게 쓰는지 나와요.</>}>
          <BachGroups />
        </Section>

        <Section id="dash-intro-scenario" title="모든 탭에서 쓰는 가상의 안전관리 상황실"
          gist="현장 3곳, 구역 9개짜리 가상 상황실 하나로 모든 탭을 설명해요."
          desc={<>어느 회사에나 있을 법한 산업 안전관리 상황실이에요. 다른 탭에서도 같은 현장과 구역 이름이 계속 나와요. 지하 <Term k="밀폐공간" d={X['밀폐공간']} />처럼 위험한 곳에는 센서를, 센서가 없는 구역에는 CCTV와 <Term k="위치 태그" d={X['위치 태그']} />를 써요.</>}>
          <Scenario />
        </Section>

        <Section id="dash-intro-map" title="내 역할에 맞는 읽는 순서"
          gist="처음부터 다 읽지 않아도 돼요. 내 역할에 필요한 탭부터 읽어요."
          desc="역할을 고르면 먼저 읽을 탭에 순서 번호가 붙어요.">
          <TabMap />
          <Note>이 영역은 고성능 <Term k="HMI" /> 표준인 ISA-101을 자주 인용해요<Cite n={4} />. HMI는 사람이 기계를 보고 조작하는 화면이에요. 원래 공장 자동화 쪽 표준이지만, 안전관리·전력·교통 관제에도 같은 원리가 통해요.</Note>
        </Section>

        <Refs items={[
          { kind: 'paper', text: 'Endsley, M. R. (1995). Toward a Theory of Situation Awareness in Dynamic Systems. Human Factors, 37(1).', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'paper', text: 'Sarikaya, A., Correll, M., Bartram, L., Tory, M., Fisher, D. (2019). What Do We Talk About When We Talk About Dashboards? IEEE TVCG 25(1).', url: 'https://www.tableau.com/research/publications/what-do-we-talk-about-when-we-talk-about-dashboards' },
          { kind: 'paper', text: 'Bach, B. et al. (2023). Dashboard Design Patterns. IEEE TVCG 29(1):342–352. 패턴 그룹 이름은 프로젝트 사이트 기준.', url: 'https://dashboarddesignpatterns.github.io' },
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015 Human Machine Interfaces for Process Automation Systems (고성능 HMI)', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'book', text: 'Few, S. Information Dashboard Design (2006, 2판 2013) — 한 화면에서 한눈에 보는 정보' },
          { kind: 'practice', text: '하루 타임라인의 시간 배분, 의사결정 수준별 기간, 역할별 읽는 순서는 설명을 위한 예시예요.' },
          { kind: 'practice', text: "'흔한 실수'의 흔한 화면은 업계에서 자주 보이는 패턴을 일반화한 가상 화면이에요. 특정 회사나 제품을 가리키지 않아요." },
        ]} />
      </SysGrid>
    </div>
  )
}
