import { useMemo, useState, type ReactNode } from 'react'
import { Term, TermList } from '../../components/Term'
import { Range, Seg } from '../../components/ui'
import { Note, Section, SysGrid } from '../../system/ui'
import { ALARMS, CENTER, RANGES, SUBSTATIONS, rng, type Pri } from '../data'
import { AnalogBar, Cite, Finding, Hmi, PriBadge, Refs } from '../ui'
import './intro.css'

/* ================= 1. 세 가지 대시보드 비교 ================= */
const KINDS = ['분석형', '경영형', '관제형'] as const
type Kind = typeof KINDS[number]
const COMPARE: { row: string; v: Record<Kind, ReactNode> }[] = [
  { row: '누가 보나', v: { 분석형: '분석가 · 기획자', 경영형: '경영진 · 팀장', 관제형: '교대로 근무하는 운영자' } },
  { row: '얼마나 오래', v: { 분석형: '질문 하나를 푸는 동안', 경영형: '회의 때 몇 분', 관제형: <><b>교대 내내 8~12시간</b> 띄워 둬요</> } },
  { row: '어디서', v: { 분석형: '개인 PC', 경영형: '회의실 · 메일 · 휴대폰', 관제형: '관제실 벽면 화면 + 여러 대 모니터' } },
  { row: '무엇을 묻나', v: { 분석형: '왜 그랬지? 무엇과 관련 있지?', 경영형: '목표대로 가고 있나?', 관제형: <><b>지금 괜찮은가?</b> 무엇이 이상한가? 무엇을 해야 하나?</> } },
  { row: '값이 바뀌는 주기', v: { 분석형: '필요할 때', 경영형: '하루 · 주 · 월', 관제형: '몇 초~몇 분마다 계속' } },
  { row: '대부분의 시간에 하는 일', v: { 분석형: '깊이 파고들기', 경영형: '훑어보기', 관제형: <><b>'아무 일 없음'을 확인</b>하기</> } },
  { row: '잘못되면', v: { 분석형: '결론이 틀려서 다시 분석해요', 경영형: '결정이 늦어져요', 관제형: <><b>정전 · 설비 고장 · 안전사고.</b> 놓치면 바로 현장에 피해가 나요</> } },
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

/* ================= 2. 상황 인식 3단계 (Endsley) ================= */
const NOW_LABEL = '14:42'
/** 강변 1선 지난 60분 부하율 — 분당 약 0.3%p 오르는 중, 마지막 값 83% */
const R1_PAST = (() => {
  const r = rng(11)
  const a = Array.from({ length: 61 }, (_, i) => 65 + 0.3 * i + (r() - 0.5) * 1.6)
  a[60] = 83
  return a.map(v => +v.toFixed(1))
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

function TrendChart({ past, slope, proj }: { past: number[]; slope: number; proj: boolean }) {
  const W = 520, H = 190, L = 34, R = 26, T = 12, B = 26
  const x = (m: number) => L + ((m + 60) / 120) * (W - L - R)
  const y = (v: number) => T + (1 - (v - 20) / 90) * (H - T - B)
  const last = past[past.length - 1]
  const d = past.map((v, i) => `${i ? 'L' : 'M'}${x(i - 60).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const endV = Math.min(110, last + slope * 60)
  const hit = slope > 0 ? (95 - last) / slope : Infinity
  const nb = RANGES.load.normal
  return (
    <svg className="in-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`강변 1선 부하율 추세. 지난 60분 ${past[0]}%에서 ${last}%.`}>
      <rect className="band" x={L} width={W - L - R} y={y(nb[1])} height={y(nb[0]) - y(nb[1])} />
      <line className="al" x1={L} x2={W - R} y1={y(95)} y2={y(95)} />
      <text className="lbl" x={W - R} y={y(95) - 5} textAnchor="end">경보 95%</text>
      <text className="lbl" x={L + 6} y={y(nb[1]) + 14}>정상 범위 30~80%</text>
      {[20, 50, 80, 110].map(v => <text key={v} className="ax" x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text>)}
      {[-60, -30, 0, 30, 60].map(m => <text key={m} className="ax" x={x(m)} y={H - 8} textAnchor="middle">{m === 0 ? '지금' : (m > 0 ? '+' : '') + m + '분'}</text>)}
      <line className="now" x1={x(0)} x2={x(0)} y1={T} y2={H - B} />
      <path className="line" d={d} />
      {proj && <path className="proj" d={`M${x(0)},${y(last)}L${x(60)},${y(endV)}`} />}
      {proj && hit <= 60 && <circle className="hit" cx={x(hit)} cy={y(95)} r="5" />}
      <circle className="dot" cx={x(0)} cy={y(last)} r="3.5" />
    </svg>
  )
}

function SituationAwareness() {
  const [lv, setLv] = useState<SaLv>(1)
  const [fault, setFault] = useState(false)
  const [quality, setQuality] = useState(false)
  const real = R1_PAST
  const shown = useMemo(() => (fault ? real.map(v => +(v * FAULT_GAIN).toFixed(1)) : real), [fault, real])
  const v = Math.round(shown[shown.length - 1])
  const slope = slopeOf(shown)
  const realSlope = slopeOf(real)
  const hit = Math.round((95 - v) / slope)
  const realHit = Math.round((95 - 83) / realSlope)
  const nb = RANGES.load.normal
  const high = v > nb[1]
  const flagged = fault && quality

  const concl: Record<SaLv, { shown: string; truth: string }> = {
    1: { shown: `강변 1선 부하율 ${v}%`, truth: '강변 1선 부하율 83%' },
    2: { shown: high ? `정상 범위(${nb[0]}~${nb[1]}%)보다 높아요. 경보(95%)까지는 아직이에요` : `정상 범위(${nb[0]}~${nb[1]}%) 안이에요. 괜찮아요`, truth: '정상 범위보다 높아요. 경보까지는 아직이에요' },
    3: { shown: hit <= 120 ? `이 속도로 오르면 약 ${hit}분 뒤(${addMin(NOW_LABEL, hit)}쯤) 95%에 닿아요` : '2시간 안에는 95%에 닿지 않을 것 같아요', truth: `약 ${realHit}분 뒤 95%에 닿아요 → 지금 부하를 옆 선로로 옮길(절체) 준비를 해야 해요` },
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
        <Hmi title={`${CENTER} · 강변 변전소`} right={NOW_LABEL} className="in-sa-hmi">
          <div className="in-sa-tile">
            <div className="in-sa-name">강변 1선 <small>22.9kV 배전선로 · 부하율</small></div>
            <div className={'in-sa-val' + (flagged ? ' susp' : '')}>
              <b>{v}</b><span>%</span>
              {flagged && <em>계측 의심</em>}
            </div>
            {lv >= 2 && (
              <div className="in-sa-l2">
                <AnalogBar value={v} min={RANGES.load.min} max={RANGES.load.max} normal={nb} alarm={RANGES.load.alarm} unit="%" name="강변 1선 부하율" w={260} />
                <div className="in-sa-scale" aria-hidden="true"><span>0</span><span>정상 30~80</span><span>경보 95</span><span>120</span></div>
                <p>{flagged ? '같은 변전소의 다른 측정값과 맞지 않아요. 이 값을 믿기 전에 먼저 확인해요.' : high ? '정상 범위보다 높아요' : '정상 범위 안이에요'}</p>
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
            <label className="in-check"><input type="checkbox" checked={fault} onChange={e => setFault(e.target.checked)} /> <span><b>센서 오류 넣기</b> 전류를 재는 센서(변류기, CT)의 배선이 잘못됐어요. 값이 실제의 절반쯤으로 읽혀요</span></label>
            <label className={'in-check' + (fault ? '' : ' dim')}><input type="checkbox" checked={quality} disabled={!fault} onChange={e => setQuality(e.target.checked)} /> <span><b>값 품질 표시 켜기</b> 다른 측정값과 맞지 않으면 값 옆에 '계측 의심'을 붙여요</span></label>
          </div>
          <ol className="in-sa-chain" aria-label="운영자가 내리는 판단">
            {SA_STEPS.map(s => {
              const active = s.lv <= lv
              const st = !active ? 'idle' : flagged ? 'check' : wrong ? 'bad' : 'ok'
              return (
                <li key={s.lv} className={'in-sa-c ' + st}>
                  <span className="k">{s.lv}단계 {s.name}</span>
                  {active ? (
                    <>
                      <b>{flagged ? (s.lv === 1 ? `읽힌 값은 ${v}%예요. 확인이 필요해요` : '판단을 미뤄요 → 현장이나 다른 측정값을 먼저 확인') : concl[s.lv].shown}</b>
                      {wrong && <span className="truth"><i aria-hidden="true">✕</i> 실제: {concl[s.lv].truth}</span>}
                    </>
                  ) : <span className="muted">단계를 눌러 열어 보세요</span>}
                </li>
              )
            })}
          </ol>
          {wrong && lv === 3 && <p className="in-sa-msg">세 판단이 모두 틀렸어요. 운영자는 아무 실수도 하지 않았는데요. <b>처음 본 값(1단계)이 틀리면 이해와 예측도 함께 틀려요.</b></p>}
        </div>
      </div>
    </div>
  )
}

/* ================= 3. 관제 화면의 하루 ================= */
type PhaseId = 'take' | 'calm' | 'sign' | 'resp' | 'hand'
const PHASES: { id: PhaseId; from: number; to: number }[] = [
  { id: 'take', from: 0, to: 10 }, { id: 'calm', from: 10, to: 375 }, { id: 'sign', from: 375, to: 390 },
  { id: 'resp', from: 390, to: 415 }, { id: 'calm', from: 415, to: 710 }, { id: 'hand', from: 710, to: 720 },
]
const PH: Record<PhaseId, { name: string; job: ReactNode; screen: string[]; link: [string, string] }> = {
  take: { name: '근무 넘겨받기', job: '앞 근무자가 남긴 일을 넘겨받아요.', screen: ['아직 안 끝난 일과 잠시 꺼 둔(보류) 알람을 한 화면에 모아요', '지난 근무에 있었던 특별한 일을 요약해요', '내가 맡은 범위가 지금 정상인지 한눈에 보여요'], link: ['#/dash/ops', '08 교대 인수인계'] },
  calm: { name: '평온', job: "'아무 일 없음'을 빠르게 확인하고 넘어가요.", screen: ['정상일 땐 회색으로 조용하게, 눈에 띄지 않게 해요', '움직이거나 깜빡이는 것이 없어요', '몇 초만 훑어봐도 "괜찮다"를 알 수 있어야 해요'], link: ['#/dash/color', '02 회색이 기본, 색은 신호'] },
  sign: { name: '이상 조짐', job: '알람은 아직 없어요. 하지만 값이 조금씩 나쁜 쪽으로 가고 있어요.', screen: ['지금 값보다 흐름(추세)을 보여 줘요. 천천히 오르는 부하가 먼저 보이게요', '정상 범위 띠 위에 값을 그려 "어디쯤인지" 보여 줘요', '알람이 울리기 전에 운영자가 먼저 알아채게 해요'], link: ['#/dash/context', '04 값보다 맥락'] },
  resp: { name: '사고 대응', job: <>차단기가 스스로 전기를 끊었어요(<Term k="트립" />). 집 두꺼비집이 내려간 것과 같아요. 몇 분 안에 판단해야 해요.</>, screen: ['원인이 된 알람 하나를 맨 위에 둬요. 뒤따라 생긴 알람은 묶어요', '알람을 누르면 그 설비 화면으로 바로 가요', '무엇을 해야 하는지(대응 절차)도 바로 보여 줘요'], link: ['#/dash/alarm', '03 알람 설계'] },
  hand: { name: '근무 넘겨주기', job: '다음 근무자에게 넘겨요.', screen: ['이번 근무에 생긴 일을 시간 순서대로 보여 줘요', '아직 안 끝난 일과, 알람을 꺼 둔 이유를 남겨요', '넘겨준 기록이 다음 근무자의 첫 화면이 돼요'], link: ['#/dash/ops', '08 교대 인수인계'] },
}
const phaseAt = (t: number) => PHASES.find(p => t >= p.from && t < p.to) ?? PHASES[PHASES.length - 1]
const clock = (t: number) => addMin('08:00', Math.min(719, t))
const r1Load = (t: number) => {
  let v = 62 + 10 * Math.sin((Math.PI * (t - 60)) / 600)
  if (t >= 375 && t < 390) v += (t - 375) * 1.2
  if (t >= 390 && t < 405) v += 18
  if (t >= 405 && t < 415) v += 18 - (t - 405) * 1.8
  return Math.round(v)
}
interface DayAlarm { a: typeof ALARMS[number]; from: number; ack: number; to: number }
const DAY_ALARMS: DayAlarm[] = [
  { a: ALARMS[0], from: 390, ack: 392, to: 415 },
  { a: ALARMS[5], from: 600, ack: 601, to: 606 },
]

function DayTimeline() {
  const [t, setT] = useState(300)
  const p = phaseAt(t)
  const info = PH[p.id]
  const calm = PHASES.filter(x => x.id === 'calm').reduce((s, x) => s + x.to - x.from, 0)
  const active = DAY_ALARMS.filter(d => t >= d.from && t < d.to)
  const load = r1Load(t)
  const trip = t >= 390 && t < 415
  const subPri = (id: string): Pri | null => {
    const hits = active.filter(d => d.a.where.startsWith(id === 'N' ? '북부' : id === 'R' ? '강변' : '산'))
    return hits.length ? (Math.min(...hits.map(h => h.a.pri)) as Pri) : null
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
        <Hmi title="누리시 전체 개요" right={clock(t)} className="in-day-hmi">
          <div className="in-day-subs">
            {SUBSTATIONS.map(s => {
              const pr = subPri(s.id)
              return (
                <div key={s.id} className={'in-day-sub' + (pr ? ' alarm' : '')}>
                  <div className="h"><b>{s.name}</b>{pr && <PriBadge p={pr} />}</div>
                  {s.feeders.map(f => {
                    const val = f.id === 'R1' ? load : f.id === 'I1' && trip ? 0 : f.load
                    return (
                      <div key={f.id} className="f">
                        <span>{f.name}</span>
                        <AnalogBar value={val} min={0} max={120} normal={RANGES.load.normal} alarm={RANGES.load.alarm} unit="%" name={f.name} w={84} />
                        <em>{f.id === 'I1' && trip ? '트립' : val + '%'}</em>
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
  { id: '전술', who: '관리자 · 기획자', span: '며칠 ~ 몇 주', ex: '사람·장비를 어디에 쓸지 정해요' },
  { id: '운영', who: '현장 운영자', span: '지금 ~ 몇 시간', ex: '지금 조치해요' },
]
const QUIZ: { q: string; a: Dec }[] = [
  { q: '지금 강변 1선 부하가 괜찮은가?', a: '운영' },
  { q: '5년 뒤 산업단지 수요에 맞춰 변전소를 늘릴까?', a: '전략' },
  { q: '이번 주 알람이 가장 많았던 설비는?', a: '전술' },
  { q: '산단 1선이 트립됐다. 어느 구간을 먼저 끊어 낼까?', a: '운영' },
  { q: '다음 달 어느 선로를 먼저 보강하나?', a: '전술' },
  { q: '올해 정전 시간을 작년보다 줄였나?', a: '전략' },
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
            {d.id === '운영' && <em>관제 화면은 여기예요</em>}
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
  { g: '데이터 정보', kind: '구성 요소', ex: '값 하나 · 계산한 값 · 기준값', ops: '관제에서는 "기준값"이 핵심이에요. 값 옆에 정상 범위를 함께 둬요.', link: ['#/dash/context', '04'] },
  { g: '메타 정보', kind: '구성 요소', ex: '데이터 출처 · 안내 문구 · 주석', ops: '"데이터에 대한 정보"예요. 관제에서는 마지막으로 값을 받은 시각과 통신 상태가 여기 들어가요. 화면이 멈췄을 때 알아채게 해 줘요.', link: ['#/dash/realtime', '05'] },
  { g: '시각 표현', kind: '구성 요소', ex: '숫자 · 추세 화살표 · 표', ops: '숫자만 두지 않아요. 정상 범위가 그려진 막대(아날로그 막대)와 추세를 함께 붙여요.', link: ['#/dash/context', '04'] },
  { g: '상호작용', kind: '구성 요소', ex: '탐색 · 이동 · 필터와 초점', ops: '관제에서는 "이동"이 가장 중요해요. 알람을 누르면 그 설비 화면으로 바로 가요.', link: ['#/dash/levels', '01'] },
  { g: '화면 공간', kind: '구성 방식', ex: '한 화면에 맞춤 · 화면 밖으로 넘침 · 누르면 세부', ops: '벽면 화면은 스크롤 없이 한 화면에 다 들어가게 해요. 자세한 내용은 각자 화면에서 눌러서 봐요.', link: ['#/dash/room', '07'] },
  { g: '구조', kind: '구성 방식', ex: '한 페이지 · 단계형(위계) · 나란히(병렬)', ops: '관제는 단계형이에요. 전체 → 구역 → 설비 → 진단 순서로 들어가요.', link: ['#/dash/levels', '01'] },
  { g: '페이지 배치', kind: '구성 방식', ex: '열린 배치 · 표 배치 · 묶음 배치', ops: '변전소나 계통(서로 이어진 설비 묶음) 단위로 묶어 배치해요. 현장이 묶인 방식과 화면이 묶인 방식을 같게 해요.', link: ['#/dash/map', '06'] },
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
        <b>{b.g}</b> <span className="muted">— 관제 화면에서는</span>
        <p>{b.ops} <a href={b.link[0]}>{b.link[1]} 탭에서 →</a></p>
      </div>
    </div>
  )
}

/* ================= 6. 공통 예시 소개 ================= */
function Scenario() {
  return (
    <div className="in-scn">
      <Hmi title={CENTER} right="가상 설비 · 22.9kV 배전" className="in-scn-hmi">
        <div className="in-scn-grid">
          {SUBSTATIONS.map(s => (
            <div key={s.id} className="in-scn-sub">
              <b>{s.name}</b>
              <div className="in-scn-h" aria-hidden="true"><span>선로</span><span>부하율</span><span>전압</span><span>유온</span></div>
              {s.feeders.map(f => (
                <div key={f.id} className="in-scn-f">
                  <span>{f.name}</span>
                  <span className="v"><AnalogBar value={f.load} min={0} max={120} normal={RANGES.load.normal} alarm={RANGES.load.alarm} unit="%" name={f.name + ' 부하율'} w={56} /><em>{f.load}%</em></span>
                  <span className="n">{f.kv}</span>
                  <span className="n">{f.temp}℃</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Hmi>
      <div className="in-scn-side">
        <p><Term k="변전소" />는 큰 물탱크, <Term k="배전선로" />는 동네로 가는 수도관이라고 생각하면 쉬워요.</p>
        <p>이 영역의 모든 탭은 <b>{CENTER}</b> 하나로 설명해요. 변전소 3곳, 22.9<Term k="kV" /> 배전선로 9개, 그리고 알람 몇 개가 나와요.</p>
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>측정값</th><th>정상 범위</th><th>경보가 울리는 값</th></tr></thead>
            <tbody>
              <tr><td><Term k="부하율" /></td><td>{RANGES.load.normal.join('~')}%</td><td>95% 초과</td></tr>
              <tr><td><Term k="전압" /></td><td>{RANGES.kv.normal.join('~')}kV</td><td>22.0 미만 · 23.8 초과</td></tr>
              <tr><td>변압기 <Term k="유온" /></td><td>{RANGES.temp.normal.join('~')}℃</td><td>90℃ 초과</td></tr>
            </tbody>
          </table>
        </div>
        <Note>예시 수치는 모두 가상이에요. 실제 설비의 기준값이 아니에요. 막대 읽는 법: 삼각형은 지금 값, 진한 띠는 정상 범위, 빗금은 경보 범위예요.</Note>
      </div>
    </div>
  )
}

/* ================= 7. 탭 지도 ================= */
const TABS = [
  { id: 'intro', n: '00', name: '관제는 무엇이 다른가', g: '원리' },
  { id: 'levels', n: '01', name: '화면 위계', g: '구조' },
  { id: 'color', n: '02', name: '회색이 기본, 색은 신호', g: '표시' },
  { id: 'alarm', n: '03', name: '알람 설계', g: '알람' },
  { id: 'context', n: '04', name: '값보다 맥락', g: '표시' },
  { id: 'realtime', n: '05', name: '실시간 갱신', g: '표시' },
  { id: 'map', n: '06', name: '지도 · 계통도', g: '구조' },
  { id: 'room', n: '07', name: '관제실 환경', g: '환경' },
  { id: 'ops', n: '08', name: '기획 · 운영 정의', g: '실무' },
  { id: 'fe', n: '09', name: 'FE · 구현', g: '실무' },
]
type Role = 'all' | 'design' | 'plan' | 'fe'
const PATHS: Record<Role, { label: string; ids: string[]; why: string }> = {
  all: { label: '처음부터 전부', ids: TABS.map(t => t.id), why: '순서대로 읽으면 원리 → 구조 → 표시 → 알람 → 환경 → 실무로 이어져요.' },
  design: { label: '디자이너', ids: ['intro', 'color', 'context', 'levels', 'alarm', 'realtime', 'map', 'room'], why: '색과 표시 방식부터 익혀요. 그다음 화면 단계(위계)와 알람으로 넓혀요.' },
  plan: { label: '기획자', ids: ['intro', 'levels', 'alarm', 'ops', 'room', 'color'], why: '기획자가 만드는 문서의 중심은 화면 목록(위계)과 알람 정의서예요.' },
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
      <TermList keys={['관제', '운영자', '상황 인식', 'HMI', '변전소', '배전선로', 'kV', '부하율', '정상 범위', '추세', '차단기', '트립', '절체', '유온']} />
      <SysGrid>
        <Section id="dash-intro-what" wide title="관제 화면은 구경하는 화면이 아니라 지키는 화면이에요"
          gist="관제 화면은 평소엔 조용하고, 이상이 생기면 바로 눈에 띄어야 해요."
          desc={<>공항 관제탑을 떠올려 보세요. 하루 종일 지켜보다가, 문제가 생기면 바로 대응해요. <Term k="관제" /> 화면도 같아요. 이름은 똑같이 '대시보드'지만, 분석·경영 대시보드와는 쓰는 사람이 달라요. 보는 시간도, 잘못됐을 때의 피해도 달라요.</>}>
          <Compare />
          <Note tone="tip"><b>제가 처음 관제 화면을 맡았을 때 가장 많이 한 실수</b>는 "예쁘고 정보가 많은 화면"을 만들려고 한 거예요. <Term k="운영자">관제 운영자</Term>에게 좋은 화면은 정보가 많은 화면이 아니에요. <b>12시간 동안 봐도 피곤하지 않고, 이상이 생기면 바로 보이는</b> 화면이에요.</Note>
        </Section>

        <Section id="dash-intro-sa" wide title="상황 인식 3단계 — 보고, 이해하고, 예측해요"
          gist="처음 본 값이 틀리면 이해와 예측도 함께 틀려요. 화면은 세 단계를 다 도와야 해요."
          desc={<>운전할 때를 떠올려 보세요. "앞차 브레이크등이 켜졌다(보기) → 앞차가 선다(이해) → 곧 부딪힌다(예측)". 운영자 머릿속에서도 이 세 단계가 돌아가요. 이걸 <Term k="상황 인식" />이라고 하고, Endsley가 세 단계로 나눴어요<Cite n={1} />. 관제 화면은 이 세 단계를 빠르게 밟도록 도와야 해요. 단계를 눌러 화면이 어떻게 달라지는지 보세요. 센서 오류도 넣어 보세요.</>}>
          <Finding src={<>Endsley (1995), Human Factors 37(1) — 한국어 요약</>}>
            상황 인식은 세 단계로 쌓여요. 먼저 눈앞의 요소를 <u>지각</u>해요(1단계, 보기). 다음으로 그 뜻을 <u>이해</u>해요(2단계). 마지막으로 가까운 미래를 <u>예측</u>해요(3단계). 앞 단계가 틀리면 뒤 단계도 함께 틀려요.
          </Finding>
          <SituationAwareness />
          <Note>숫자 83%만 보여 주는 화면은 1단계(보기)까지만 도와요. '정상 범위에서 어디쯤인지'(이해)와 '언제 경보에 닿는지'(예측)는 운영자가 머릿속으로 계산해야 해요. <Term k="정상 범위" />를 그리는 법은 <a href="#/dash/context">04 값보다 맥락</a>에서 이어져요. 값이 믿을 만한지, 화면이 멈추지 않았는지는 <a href="#/dash/realtime">05 실시간 갱신</a>에서 다뤄요.</Note>
        </Section>

        <Section id="dash-intro-day" wide title="근무 12시간 동안 화면이 하는 일"
          gist="근무 시간 대부분은 평온해요. 화면은 조용하다가 사고 때만 확 눈에 띄어야 해요."
          desc="낮 근무 12시간(08:00~20:00)을 예로 들었어요. 막대를 움직이거나 시간대 버튼을 눌러 보세요. 그 순간 화면이 무엇을 해 줘야 하는지 나와요.">
          <DayTimeline />
        </Section>

        <Section id="dash-intro-types" wide title="관제 화면은 '지금 당장'의 결정을 도와요"
          gist="관제 화면은 '지금 무엇을 할까'에 답해요. 몇 년짜리 질문은 다른 화면에서 다뤄요."
          desc={<>대시보드는 어떤 결정을 돕는지에 따라 나눌 수 있어요. 몇 년을 내다보는 결정은 전략, 몇 주 단위의 결정은 전술, 지금 당장의 결정은 운영이에요<Cite n={2} />. Sarikaya 등은 대시보드를 한 가지로 정의하지 않았어요. 목적, 보는 사람, 데이터에 따라 여러 유형으로 정리했어요. 아래 질문마다 어느 수준인지 골라 보세요.</>}>
          <DecisionQuiz />
          <Note>같은 데이터라도 질문의 수준이 다르면 화면도 달라야 해요. 예를 들어 "올해 정전 시간"을 관제 벽면에 크게 띄우면, 지금 생긴 이상을 보여 줄 자리가 줄어요.</Note>
        </Section>

        <Section id="dash-intro-bach" wide title="대시보드를 만드는 8가지 패턴 — 관제에서는 이렇게 써요"
          gist="관제에서는 기준값, 알람에서 바로 이동, 단계형 구조, 비정상에만 쓰는 색이 핵심이에요."
          desc={<>Bach 등은 대시보드 144개를 분석했어요. 그리고 자주 쓰이는 디자인 방식(패턴)을 8개 그룹으로 정리했어요<Cite n={3} />. 그룹을 누르면 관제 화면에서는 어떻게 쓰는지 나와요.</>}>
          <BachGroups />
        </Section>

        <Section id="dash-intro-scenario" title="모든 탭에서 쓰는 가상의 관제센터"
          gist="변전소 3곳, 선로 9개짜리 가상 관제센터 하나로 모든 탭을 설명해요."
          desc="가상의 배전 관제센터예요. 다른 탭에서도 같은 변전소와 선로 이름이 계속 나와요.">
          <Scenario />
        </Section>

        <Section id="dash-intro-map" title="내 역할에 맞는 읽는 순서"
          gist="처음부터 다 읽지 않아도 돼요. 내 역할에 필요한 탭부터 읽어요."
          desc="역할을 고르면 먼저 읽을 탭에 순서 번호가 붙어요.">
          <TabMap />
          <Note>이 영역은 고성능 <Term k="HMI" /> 표준인 ISA-101을 자주 인용해요<Cite n={4} />. HMI는 사람이 기계를 보고 조작하는 화면이에요. 원래 공장 자동화 쪽 표준이지만, 전력·교통·통신 관제에도 같은 원리가 통해요.</Note>
        </Section>

        <Refs items={[
          { kind: 'paper', text: 'Endsley, M. R. (1995). Toward a Theory of Situation Awareness in Dynamic Systems. Human Factors, 37(1).', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'paper', text: 'Sarikaya, A., Correll, M., Bartram, L., Tory, M., Fisher, D. (2019). What Do We Talk About When We Talk About Dashboards? IEEE TVCG 25(1).', url: 'https://www.tableau.com/research/publications/what-do-we-talk-about-when-we-talk-about-dashboards' },
          { kind: 'paper', text: 'Bach, B. et al. (2023). Dashboard Design Patterns. IEEE TVCG 29(1):342–352. 패턴 그룹 이름은 프로젝트 사이트 기준.', url: 'https://dashboarddesignpatterns.github.io' },
          { kind: 'standard', text: 'ANSI/ISA-101.01-2015 Human Machine Interfaces for Process Automation Systems (고성능 HMI)', url: 'https://blog.isa.org/the-high-performance-hmi' },
          { kind: 'book', text: 'Few, S. Information Dashboard Design (2006, 2판 2013) — 한 화면에서 한눈에 보는 정보' },
          { kind: 'practice', text: '하루 타임라인의 시간 배분, 의사결정 수준별 기간, 역할별 읽는 순서는 설명을 위한 예시예요.' },
        ]} />
      </SysGrid>
    </div>
  )
}
