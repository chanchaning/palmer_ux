import { useMemo, useState, type ReactNode } from 'react'
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
  { row: '갱신', v: { 분석형: '필요할 때', 경영형: '하루 · 주 · 월', 관제형: '초~분 단위로 계속' } },
  { row: '대부분의 시간', v: { 분석형: '파고들기', 경영형: '훑어보기', 관제형: <><b>'아무 일 없음'을 확인</b>하기</> } },
  { row: '실패의 대가', v: { 분석형: '잘못된 결론, 다시 분석', 경영형: '늦은 결정', 관제형: <><b>정전 · 설비 손상 · 안전사고.</b> 놓치면 바로 현장 피해예요</> } },
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
  { lv: 1, name: '지각', q: '무엇이 보이나?' },
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
    2: { shown: high ? `정상 범위(${nb[0]}~${nb[1]}%)보다 높아요. 아직 경보(95%) 전` : `정상 범위(${nb[0]}~${nb[1]}%) 안이에요. 괜찮아요`, truth: '정상 범위보다 높아요. 아직 경보 전' },
    3: { shown: hit <= 120 ? `이 속도면 약 ${hit}분 뒤(${addMin(NOW_LABEL, hit)}쯤) 95% 도달 예상` : '2시간 안에는 95%에 닿지 않을 것 같아요', truth: `약 ${realHit}분 뒤 95% 도달 예상 → 지금 부하 절체를 준비해야 해요` },
  }
  const wrong = fault && !quality

  return (
    <div className="in-sa">
      <ol className="in-sa-steps" aria-label="상황 인식 단계">
        {SA_STEPS.map((s, i) => (
          <li key={s.lv}>
            <button type="button" className={'in-sa-step' + (lv === s.lv ? ' on' : '') + (s.lv <= lv ? ' reached' : '')} aria-pressed={lv === s.lv} onClick={() => setLv(s.lv)}>
              <small>Level {s.lv}</small>
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
                <p>{flagged ? '같은 변전소의 다른 계측과 맞지 않아요. 값을 믿기 전에 확인이 필요해요.' : high ? '정상 범위 위 — 높음' : '정상 범위 안'}</p>
              </div>
            )}
            {lv >= 3 && (
              <div className="in-sa-l3">
                <TrendChart past={shown} slope={slope} proj={!flagged} />
                <p>{flagged ? '예측을 멈췄어요. 계측이 의심될 때 예측선을 그리면 틀린 자신감을 줘요.' : concl[3].shown}</p>
              </div>
            )}
          </div>
        </Hmi>

        <div className="in-sa-side">
          <div className="in-sa-ctl">
            <label className="in-check"><input type="checkbox" checked={fault} onChange={e => setFault(e.target.checked)} /> <span><b>센서 오류 넣기</b> 변류기(CT, 전류를 재는 센서) 배선 문제로 실제의 절반쯤으로 읽혀요</span></label>
            <label className={'in-check' + (fault ? '' : ' dim')}><input type="checkbox" checked={quality} disabled={!fault} onChange={e => setQuality(e.target.checked)} /> <span><b>값 품질 표시 켜기</b> 다른 계측과 어긋나면 '계측 의심'을 붙여요</span></label>
          </div>
          <ol className="in-sa-chain" aria-label="운영자가 내리는 판단">
            {SA_STEPS.map(s => {
              const active = s.lv <= lv
              const st = !active ? 'idle' : flagged ? 'check' : wrong ? 'bad' : 'ok'
              return (
                <li key={s.lv} className={'in-sa-c ' + st}>
                  <span className="k">Level {s.lv} {s.name}</span>
                  {active ? (
                    <>
                      <b>{flagged ? (s.lv === 1 ? `읽힌 값 ${v}% — 확인 필요` : '판단 보류 → 현장·다른 계측 확인') : concl[s.lv].shown}</b>
                      {wrong && <span className="truth"><i aria-hidden="true">✕</i> 실제: {concl[s.lv].truth}</span>}
                    </>
                  ) : <span className="muted">단계를 눌러 열어 보세요</span>}
                </li>
              )
            })}
          </ol>
          {wrong && lv === 3 && <p className="in-sa-msg">세 판단이 모두 틀렸어요. 운영자는 아무 잘못도 하지 않았는데요. <b>지각이 틀리면 이해와 예측도 함께 틀려요.</b></p>}
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
const PH: Record<PhaseId, { name: string; job: string; screen: string[]; link: [string, string] }> = {
  take: { name: '교대 인수', job: '앞 근무자가 남긴 일을 넘겨받아요.', screen: ['진행 중인 이슈와 보류 중인 알람을 한 화면에', '지난 근무의 특이 사항 요약', '내가 볼 범위가 지금 정상인지 한눈에'], link: ['#/dash/ops', '08 교대 인수인계'] },
  calm: { name: '평온', job: "'아무 일 없음'을 빠르게 확인하고 넘어가요.", screen: ['회색조로 조용하게 — 정상은 눈에 띄지 않게', '움직이는 것·깜빡이는 것 없음', '몇 초 훑어보면 "괜찮다"가 끝나야 해요'], link: ['#/dash/color', '02 회색이 기본, 색은 신호'] },
  sign: { name: '이상 징후', job: '아직 알람은 없지만 무언가 기울고 있어요.', screen: ['값보다 추세 — 천천히 오르는 부하를 먼저 보여 주기', '정상 범위 띠 위에 값을 그려 "어디쯤인지"', '알람이 울리기 전에 운영자가 먼저 알아채게'], link: ['#/dash/context', '04 값보다 맥락'] },
  resp: { name: '사고 대응', job: '차단기 트립(차단기가 스스로 끊김). 몇 분 안에 판단해야 해요.', screen: ['원인 알람 하나를 맨 위에, 연쇄 알람은 묶어서', '알람을 누르면 해당 화면으로 바로 이동', '무엇을 하라는지(대응 절차)까지 바로'], link: ['#/dash/alarm', '03 알람 설계'] },
  hand: { name: '교대 인계', job: '다음 근무자에게 넘겨요.', screen: ['이번 근무에 생긴 일을 시간순으로', '아직 끝나지 않은 일과 보류 사유', '인계 기록이 다음 근무자의 첫 화면이 돼요'], link: ['#/dash/ops', '08 교대 인수인계'] },
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
            {active.length === 0 ? <span className="none">활성 알람 없음</span> : active.map(d => (
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
      <p className="in-day-foot">이 예시 근무 12시간 중 <b>{Math.round((calm / 720) * 100)}%</b>가 평온이에요. 화면은 그 긴 시간 동안 조용해야 하고, 남은 몇 분 동안은 놓칠 수 없어야 해요. 두 가지를 동시에 만족시키는 게 관제 화면 디자인이에요.</p>
    </div>
  )
}

/* ================= 4. 의사결정 수준 분류 (Sarikaya) ================= */
type Dec = '전략' | '전술' | '운영'
const DECS: { id: Dec; who: string; span: string; ex: string }[] = [
  { id: '전략', who: '경영진', span: '몇 달 ~ 몇 년', ex: '방향을 정해요' },
  { id: '전술', who: '관리자 · 기획자', span: '며칠 ~ 몇 주', ex: '자원을 나눠요' },
  { id: '운영', who: '현장 운영자', span: '지금 ~ 몇 시간', ex: '지금 조치해요' },
]
const QUIZ: { q: string; a: Dec }[] = [
  { q: '지금 강변 1선 부하가 괜찮은가?', a: '운영' },
  { q: '5년 뒤 산업단지 수요에 맞춰 변전소를 늘릴까?', a: '전략' },
  { q: '이번 주 알람이 가장 많았던 설비는?', a: '전술' },
  { q: '산단 1선 트립 — 어느 구간을 먼저 분리하나?', a: '운영' },
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
  { g: '데이터 정보', kind: '구성 요소', ex: '개별 값 · 파생 값 · 기준값', ops: '관제에선 "기준값"이 핵심이에요. 값 옆에 정상 범위를 함께 둬요.', link: ['#/dash/context', '04'] },
  { g: '메타 정보', kind: '구성 요소', ex: '데이터 출처 · 고지 · 주석', ops: '마지막 갱신 시각과 통신 상태가 메타 정보예요. 멈춘 화면을 알아채게 해요.', link: ['#/dash/realtime', '05'] },
  { g: '시각 표현', kind: '구성 요소', ex: '숫자 · 추세 화살표 · 표', ops: '숫자만 두지 않고 아날로그 막대와 추세를 붙여요.', link: ['#/dash/context', '04'] },
  { g: '상호작용', kind: '구성 요소', ex: '탐색 · 이동 · 필터와 초점', ops: '관제에선 "이동"이 가장 중요해요. 알람에서 해당 화면으로 바로 가요.', link: ['#/dash/levels', '01'] },
  { g: '화면 공간', kind: '구성 방식', ex: '한 화면에 맞춤 · 넘침 · 요청 시 세부', ops: '벽면 화면은 스크롤 없이 한 화면에 맞춰요. 세부는 개인 화면에서 요청할 때.', link: ['#/dash/room', '07'] },
  { g: '구조', kind: '구성 방식', ex: '한 페이지 · 위계형 · 병렬', ops: '관제는 위계형이에요. 전체 → 구역 → 설비 → 진단.', link: ['#/dash/levels', '01'] },
  { g: '페이지 배치', kind: '구성 방식', ex: '열린 배치 · 표 배치 · 묶음 배치', ops: '변전소·계통 단위로 묶어 배치해요. 현장 구조와 화면 구조를 맞춰요.', link: ['#/dash/map', '06'] },
  { g: '색', kind: '구성 방식', ex: '구별용 · 공유 · 의미 색', ops: '관제에선 "의미 색"만 써요. 그것도 비정상에만요.', link: ['#/dash/color', '02'] },
]

function BachGroups() {
  const [sel, setSel] = useState(0)
  const b = BACH[sel]
  return (
    <div className="in-bach">
      <div className="in-bach-grid">
        {(['구성 요소', '구성 방식'] as const).map(k => (
          <div key={k} className="in-bach-col">
            <div className="in-bach-k">{k === '구성 요소' ? '구성 요소 패턴 — 무엇을 보여주나' : '구성 방식 패턴 — 어떻게 엮나'}</div>
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
        <p>이 영역의 모든 탭은 <b>{CENTER}</b> 하나로 설명해요. 변전소 3곳, 22.9kV 배전선로 9개, 그리고 몇 개의 알람이에요.</p>
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>측정값</th><th>정상 범위</th><th>경보</th></tr></thead>
            <tbody>
              <tr><td>부하율</td><td>{RANGES.load.normal.join('~')}%</td><td>95% 초과</td></tr>
              <tr><td>전압</td><td>{RANGES.kv.normal.join('~')}kV</td><td>22.0 미만 · 23.8 초과</td></tr>
              <tr><td>변압기 유온</td><td>{RANGES.temp.normal.join('~')}℃</td><td>90℃ 초과</td></tr>
            </tbody>
          </table>
        </div>
        <Note>예시 수치는 모두 가상이에요. 실제 설비의 기준값이 아니에요. 막대의 삼각형이 현재 값, 진한 띠가 정상 범위, 빗금이 경보 범위예요.</Note>
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
  design: { label: '디자이너', ids: ['intro', 'color', 'context', 'levels', 'alarm', 'realtime', 'map', 'room'], why: '색과 표시 방식부터 잡고, 위계와 알람으로 넓혀요.' },
  plan: { label: '기획자', ids: ['intro', 'levels', 'alarm', 'ops', 'room', 'color'], why: '화면 목록(위계)과 알람 정의서가 기획 산출물의 중심이에요.' },
  fe: { label: 'FE 개발자', ids: ['intro', 'realtime', 'fe', 'context', 'alarm', 'levels'], why: '갱신·끊김·대량 데이터가 구현에서 가장 자주 부딪히는 문제예요.' },
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
      <SysGrid>
        <Section id="dash-intro-what" wide title="관제 화면은 '보는' 화면이 아니라 '지키는' 화면이에요"
          desc="대시보드라는 이름은 같아도, 관제 화면은 분석·경영 대시보드와 쓰는 사람도, 쓰는 시간도, 실패했을 때의 결과도 달라요.">
          <Compare />
          <Note tone="tip"><b>제가 처음 관제 화면을 맡았을 때 가장 많이 틀린 부분</b>은 "예쁘고 정보가 많은 화면"을 만들려고 한 거예요. 관제 운영자에게 좋은 화면은 정보가 많은 화면이 아니라, <b>12시간 동안 피곤하지 않고 이상이 생기면 바로 보이는</b> 화면이에요.</Note>
        </Section>

        <Section id="dash-intro-sa" wide title="상황 인식 3단계 — 지각, 이해, 예측"
          desc={<>관제 화면이 도와야 하는 건 결국 운영자의 '상황 인식'이에요. Endsley는 이를 세 단계로 나눴어요<Cite n={1} />. 단계를 눌러 같은 정보가 어떻게 달라지는지 보고, 센서 오류를 넣어 보세요.</>}>
          <Finding src={<>Endsley (1995), Human Factors 37(1) — 한국어 요약</>}>
            상황 인식은 요소를 <u>지각</u>하고(Level 1), 그 뜻을 <u>이해</u>하고(Level 2), 가까운 미래를 <u>예측</u>하는(Level 3) 세 단계로 쌓여요. 앞 단계가 틀리면 뒤 단계도 틀려요.
          </Finding>
          <SituationAwareness />
          <Note>숫자 83%만 보여주는 화면은 Level 1까지만 도와요. 이해(정상 범위 대비 어디인가)와 예측(언제 경보에 닿나)을 운영자 머릿속 계산에 맡기는 셈이에요. 정상 범위를 그리는 법은 <a href="#/dash/context">04 값보다 맥락</a>, 값의 품질과 멈춘 화면은 <a href="#/dash/realtime">05 실시간 갱신</a>에서 이어져요.</Note>
        </Section>

        <Section id="dash-intro-day" wide title="관제 화면의 하루"
          desc="낮 근무 12시간(08:00~20:00)을 예시로 만들었어요. 막대를 움직이거나 시간대를 눌러, 그 순간 화면이 무엇을 해줘야 하는지 보세요.">
          <DayTimeline />
        </Section>

        <Section id="dash-intro-types" wide title="대시보드의 종류 중 관제는 어디에 있나"
          desc={<>Sarikaya 등은 대시보드를 하나로 정의하는 대신 목적·대상·데이터 같은 설계 공간으로 여러 유형을 정리했어요. 의사결정 수준으로 전략·전술·운영으로 나누기도 해요<Cite n={2} />. 질문마다 어느 수준인지 골라 보세요.</>}>
          <DecisionQuiz />
          <Note>같은 데이터라도 질문의 수준이 다르면 화면이 달라야 해요. "올해 정전 시간"을 관제 벽면에 크게 띄우면, 지금 생긴 이상을 볼 자리를 빼앗아요.</Note>
        </Section>

        <Section id="dash-intro-bach" wide title="대시보드 디자인 패턴 8그룹"
          desc={<>Bach 등은 대시보드 144개를 분석해 디자인 패턴을 8개 그룹으로 정리했어요<Cite n={3} />. 그룹을 누르면 관제 화면에서 무엇을 뜻하는지 나와요.</>}>
          <BachGroups />
        </Section>

        <Section id="dash-intro-scenario" title="이 영역의 공통 예시"
          desc="가상의 배전 관제센터예요. 다른 탭에서도 같은 변전소와 선로 이름이 나와요.">
          <Scenario />
        </Section>

        <Section id="dash-intro-map" title="이 영역을 읽는 순서"
          desc="역할을 고르면 먼저 읽을 탭에 순서 번호가 붙어요.">
          <TabMap />
          <Note>표준은 고성능 HMI(사람-기계 인터페이스) 표준인 ISA-101을 자주 인용해요<Cite n={4} />. 공정 자동화 쪽 표준이지만 전력·교통·통신 관제에도 같은 원리가 통해요.</Note>
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
