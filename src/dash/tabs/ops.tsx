/* 08 기획 · 운영 정의 — 알람 정의서, 우선순위 매트릭스, 대응 절차, 교대 인수인계, 알람 KPI */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Range, Seg } from '../../components/ui'
import { download } from '../../system/export'
import { Note, Section, SysGrid } from '../../system/ui'
import { ALARMS, CENTER, PRI, rng, type Pri } from '../data'
import { Cite, Finding, Hmi, PriBadge, Refs } from '../ui'
import './ops.css'

/* ================= 공용 ================= */
const csvCell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const toCSV = (rows: (string | number)[][]) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n')
const mdCell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ')
function Dl({ name, text, type, children, ghost = true }: { name: string; text: string; type: string; children: ReactNode; ghost?: boolean }) {
  return <button type="button" className={'btn sm' + (ghost ? ' ghost' : '')} onClick={() => download(name, text, type)}>{children}</button>
}

/* ================= 1. 화면보다 먼저 정할 것 ================= */
const ARTS: { n: string; who: string; when: string; out: string; d: string; to: string }[] = [
  { n: '알람 정의서', who: '기획 · 운영 전문가 · 설비 담당', when: '화면 설계 전, 그리고 분기마다', out: '.csv / .md', d: '어떤 조건에서 울리고, 왜 그 우선순위이고, 무엇을 하라는 건지 한 줄씩 정해요(알람 합리화).', to: 'dash-ops-def' },
  { n: '대응 절차 카드', who: '운영자 · 감독자', when: '알람을 정의할 때 같이', out: '알람마다 1장', d: '알람을 누르면 바로 열리는 짧은 절차. 알람 정의서의 ‘대응’ 칸이 자라서 카드가 돼요.', to: 'dash-ops-sop' },
  { n: '교대 인수인계', who: '교대하는 두 운영자', when: '매 교대', out: '화면 + 기록', d: '진행 중 이슈, 보류한 알람, 서비스에서 뺀 설비를 다음 사람이 확인하고 넘겨받아요.', to: 'dash-ops-handover' },
  { n: '알람 KPI', who: '운영 책임자 · 기획', when: '매주 · 매월', out: '대시보드', d: '알람이 너무 많지 않은지, 폭주가 있었는지, 늘 떠 있는 알람이 없는지 재요. 결과로 정의서를 고쳐요.', to: 'dash-ops-kpi' },
]
function Cycle() {
  return (
    <ol className="op-cycle">
      {ARTS.map((a, i) => (
        <li key={a.n}>
          <a href={'#' + a.to} className="op-art" onClick={e => { e.preventDefault(); document.getElementById(a.to)?.scrollIntoView({ behavior: 'smooth' }) }}>
            <span className="n">{i + 1}</span>
            <b>{a.n}</b>
            <p>{a.d}</p>
            <dl><dt>누가</dt><dd>{a.who}</dd><dt>언제</dt><dd>{a.when}</dd><dt>결과물</dt><dd>{a.out}</dd></dl>
          </a>
          <span className="op-arrow" aria-hidden="true">{i < ARTS.length - 1 ? '→' : '↺'}</span>
        </li>
      ))}
    </ol>
  )
}

/* ================= 2. 우선순위 매트릭스 ================= */
type Sev = 'minor' | 'major' | 'severe'
type Tm = 'long' | 'mid' | 'short'
const SEV: { id: Sev; n: string; d: string }[] = [
  { id: 'severe', n: '심각', d: '넓은 지역 정전, 사람이 다칠 위험' },
  { id: 'major', n: '중대', d: '일부 고객 정전, 설비가 상할 수 있음' },
  { id: 'minor', n: '경미', d: '고객 영향 없음, 성능이 조금 떨어짐' },
]
const TM: { id: Tm; n: string; d: string }[] = [
  { id: 'long', n: '30분 넘게', d: '천천히 나빠짐' },
  { id: 'mid', n: '10~30분', d: '오늘 근무 안에 손써야 함' },
  { id: 'short', n: '10분 미만', d: '지금 움직여야 함' },
]
const MX: Record<Sev, Record<Tm, Pri>> = {
  severe: { long: 2, mid: 1, short: 1 },
  major: { long: 3, mid: 2, short: 1 },
  minor: { long: 3, mid: 3, short: 2 },
}
const SEV_N = Object.fromEntries(SEV.map(s => [s.id, s.n])) as Record<Sev, string>
const TM_N = Object.fromEntries(TM.map(s => [s.id, s.n])) as Record<Tm, string>

function PriorityMatrix() {
  const [sev, setSev] = useState<Sev>('major')
  const [tm, setTm] = useState<Tm>('mid')
  const [needs, setNeeds] = useState(true)
  const p = MX[sev][tm]
  return (
    <div className="op-mx">
      <div className="op-mx-q">
        <span>운영자가 무언가를 해야 하나요?</span>
        <Seg value={needs ? 'y' : 'n'} onChange={v => setNeeds(v === 'y')} options={[['y', '예, 조치가 필요해요'], ['n', '아니요, 알기만 하면 돼요']]} />
      </div>
      <div className={'op-mx-grid' + (needs ? '' : ' off')} role="grid" aria-label="결과 심각도와 대응 가능 시간으로 정하는 우선순위">
        <div className="op-mx-corner" role="presentation"><small>결과 심각도 ↓ · 대응 가능 시간 →</small></div>
        {TM.map(t => <div key={t.id} className="op-mx-th" role="columnheader"><b>{t.n}</b><small>{t.d}</small></div>)}
        {SEV.map(s => (
          <Fragment key={s.id}>
            <div className="op-mx-rh" role="rowheader"><b>{s.n}</b><small>{s.d}</small></div>
            {TM.map(t => {
              const on = needs && sev === s.id && tm === t.id
              return (
                <button key={t.id} type="button" role="gridcell" className={'op-mx-cell' + (on ? ' on' : '')} disabled={!needs} aria-pressed={on}
                  aria-label={`${s.n}, ${t.n}: 우선순위 ${MX[s.id][t.id]} ${PRI[MX[s.id][t.id]].name}`} onClick={() => { setSev(s.id); setTm(t.id) }}>
                  <PriBadge p={MX[s.id][t.id]} size={24} />
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
      <div className="op-mx-out" aria-live="polite">
        {needs ? (
          <><PriBadge p={p} label size={24} /><p>결과가 <b>{SEV_N[sev]}</b>하고 손쓸 시간이 <b>{TM_N[tm]}</b> 남았으면 우선순위 {p}. 대응 목표는 <b>{PRI[p].respond}</b>예요.</p></>
        ) : (
          <><span className="op-noalarm">알람 아님</span><p>운영자가 할 일이 없으면 알람으로 울리지 않아요. <b>이벤트 기록</b>으로 남기고, 필요하면 보고서에서 봐요. 출입문 개방처럼 ‘알면 좋은 것’이 알람 목록을 채우면 진짜 알람이 묻혀요.</p></>
        )}
      </div>
    </div>
  )
}

/* ================= 3. 알람 정의서 ================= */
interface Def { id: string; where: string; what: string; cond: string; delay: string; db: string; sev: Sev; tm: Tm; cause: string; check: string; action: string; owner: string }
const DEF_EXTRA: Record<string, Omit<Def, 'id' | 'where' | 'what' | 'action'>> = {
  'A-101': { cond: '산단 1선 CB 트립 신호', delay: '없음(즉시)', db: '해당 없음', sev: 'severe', tm: 'short', cause: '선로 고장(수목 접촉, 설비 파손 등)', check: '고장 표시기(FI), 계통도의 정전 구간', owner: '배전 관제 당번' },
  'A-102': { cond: '부하율 > 95%', delay: '15분 지속', db: '3%p (92% 아래로 내려가야 해제)', sev: 'major', tm: 'mid', cause: '수요 급증, 인접 선로 절체로 부하 이동', check: '부하 추세, 인접 선로 여유', owner: '배전 관제 당번' },
  'A-103': { cond: '유온 > 90℃', delay: '5분 지속', db: '5℃', sev: 'major', tm: 'mid', cause: '과부하, 냉각팬 고장', check: '냉각팬 상태, 부하율', owner: '변전 설비 담당' },
  'A-104': { cond: '전압 < 22.4kV', delay: '10분 지속', db: '0.1kV', sev: 'minor', tm: 'long', cause: '선로 끝 부하 증가, 탭 위치', check: '선로 끝 전압 추세, 같은 변전소 다른 선로', owner: '배전 관제 당번' },
  'A-105': { cond: '통신 응답 없음', delay: '3회 연속 실패', db: '해당 없음', sev: 'minor', tm: 'long', cause: '통신 단말 고장, 통신망 장애', check: '주변 개폐기 통신 상태', owner: '통신 담당' },
  'A-106': { cond: '출입문 열림 접점', delay: '1분 지속', db: '해당 없음', sev: 'minor', tm: 'long', cause: '예정된 작업, 무단 출입', check: 'CCTV, 작업 일지', owner: '보안 담당' },
}
const seedDefs = (): Def[] => ALARMS.map(a => ({ id: a.id, where: a.where, what: a.what, action: a.action, ...DEF_EXTRA[a.id] }))
const COLS: [keyof Def, string][] = [['id', '알람 ID'], ['where', '설비'], ['what', '알람 내용'], ['cond', '조건(기준값)'], ['delay', '지속 시간'], ['db', '히스테리시스'], ['sev', '결과 심각도'], ['tm', '대응 가능 시간'], ['cause', '원인'], ['check', '확인 방법'], ['action', '대응'], ['owner', '담당']]
const show = (d: Def, k: keyof Def) => (k === 'sev' ? SEV_N[d.sev] : k === 'tm' ? TM_N[d.tm] : String(d[k]))
function defsCSV(ds: Def[]) { return toCSV([[...COLS.map(c => c[1]), '우선순위'], ...ds.map(d => [...COLS.map(([k]) => show(d, k)), `${MX[d.sev][d.tm]} ${PRI[MX[d.sev][d.tm]].name}`])]) }
function defsMD(ds: Def[]) {
  const L = [`# ${CENTER} 알람 정의서 (예시)`, '', '> 우선순위는 결과 심각도 × 대응 가능 시간 매트릭스로 정해요. 운영자가 할 일이 없으면 알람이 아니라 이벤트예요.', '']
  for (const d of ds) {
    const p = MX[d.sev][d.tm]
    L.push(`## ${d.id} · ${d.where} — ${d.what}`, '', '| 항목 | 내용 |', '|---|---|')
    L.push(`| 우선순위 | ${p} ${PRI[p].name} (대응 ${PRI[p].respond}) |`)
    for (const [k, n] of COLS.slice(3)) L.push(`| ${n} | ${mdCell(show(d, k))} |`)
    L.push('')
  }
  L.push('## 검토 기록', '', '| 날짜 | 검토자 | 바꾼 것 | 이유 |', '|---|---|---|---|', '| | | | |')
  return L.join('\n')
}

function DefEditor() {
  const [ds, setDs] = useState<Def[]>(seedDefs)
  const [sel, setSel] = useState(0)
  const d = ds[sel]
  const set = (k: keyof Def, v: string) => setDs(a => a.map((x, i) => (i === sel ? { ...x, [k]: v } : x)))
  const add = () => {
    const n = ds.length + 1
    setDs(a => [...a, { id: `A-${100 + n}`, where: '', what: '', cond: '', delay: '', db: '', sev: 'minor', tm: 'long', cause: '', check: '', action: '', owner: '' }])
    setSel(ds.length)
  }
  const del = () => { if (ds.length <= 1) return; setDs(a => a.filter((_, i) => i !== sel)); setSel(s => Math.max(0, s - 1)) }
  const dist = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0 } as Record<Pri, number>
    ds.forEach(x => c[MX[x.sev][x.tm]]++)
    return ([3, 2, 1] as Pri[]).map(p => ({ p, n: c[p], pct: Math.round((c[p] / ds.length) * 100) }))
  }, [ds])
  const TARGET: Record<Pri, number> = { 3: 80, 2: 15, 1: 5 }
  const p = MX[d.sev][d.tm]
  const fld = (k: keyof Def, label: string, ph = '', wide = false) => (
    <label className={'op-f' + (wide ? ' wide' : '')}><span>{label}</span>
      <input value={String(d[k])} placeholder={ph} onChange={e => set(k, e.target.value)} />
    </label>
  )
  return (
    <div className="op-def">
      <div className="op-def-grid">
        <div className="op-def-list">
          <div className="sys-table-wrap">
            <table className="sys-table op-def-t">
              <thead><tr><th>알람</th><th>조건</th><th>우선순위</th></tr></thead>
              <tbody>
                {ds.map((x, i) => (
                  <tr key={i} className={i === sel ? 'on' : ''}>
                    <td><button type="button" className="op-def-pick" aria-pressed={i === sel} onClick={() => setSel(i)}><b>{x.id}</b> {x.where || '(설비 미정)'}<small>{x.what || '알람 내용을 적어요'}</small></button></td>
                    <td>{x.cond}{x.delay && <small> · {x.delay}</small>}</td>
                    <td><PriBadge p={MX[x.sev][x.tm]} label /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="op-row">
            <button type="button" className="btn sm ghost" onClick={add}>+ 알람 추가</button>
            <button type="button" className="btn sm ghost" disabled={ds.length <= 1} onClick={del}>선택 삭제</button>
            <button type="button" className="btn sm ghost" onClick={() => { setDs(seedDefs()); setSel(0) }}>예시로 되돌리기</button>
          </div>
          <div className="op-dist">
            <b>이 정의서의 우선순위 분포</b>
            {dist.map(x => (
              <div key={x.p} className="op-dist-row">
                <PriBadge p={x.p} label />
                <div className="op-dist-bar" role="img" aria-label={`${PRI[x.p].name} ${x.pct}%, 권장 약 ${TARGET[x.p]}%`}>
                  <i style={{ width: x.pct + '%' }} className={'p' + x.p} />
                  <s style={{ left: TARGET[x.p] + '%' }} />
                </div>
                <span>{x.n}개 · {x.pct}%</span>
              </div>
            ))}
            <small>세로 눈금은 보고된 권장 분포(주의 80 · 높음 15 · 긴급 5%)예요 <Cite n={3} />. 6개뿐인 예시라 맞지 않는 게 당연해요. 알람이 수백 개 쌓였을 때 비교해요.</small>
          </div>
        </div>
        <div className="op-def-form">
          <div className="op-def-head"><b>{d.id}</b><PriBadge p={p} label /><span className="muted">대응 {PRI[p].respond}</span></div>
          <div className="op-fs">
            {fld('where', '설비', '예: 강변 1선')}
            {fld('what', '알람 내용', '예: 부하율 95% 초과 15분 지속')}
            {fld('cond', '조건(기준값)', '예: 부하율 > 95%')}
            {fld('delay', '지속 시간(켜짐 지연)', '예: 15분 지속')}
            {fld('db', '히스테리시스(해제 여유)', '예: 3%p')}
            <label className="op-f"><span>결과 심각도</span>
              <select value={d.sev} onChange={e => set('sev', e.target.value)}>{SEV.map(s => <option key={s.id} value={s.id}>{s.n} — {s.d}</option>)}</select>
            </label>
            <label className="op-f"><span>대응 가능 시간</span>
              <select value={d.tm} onChange={e => set('tm', e.target.value)}>{TM.map(s => <option key={s.id} value={s.id}>{s.n} — {s.d}</option>)}</select>
            </label>
            {fld('cause', '예상 원인', '예: 수요 급증')}
            {fld('check', '확인 방법', '예: 부하 추세, 인접 선로 여유')}
            {fld('action', '대응(무엇을 하라)', '동사로 끝나게', true)}
            {fld('owner', '담당', '예: 배전 관제 당번')}
          </div>
        </div>
      </div>
      <div className="op-row">
        <span className="muted">입력한 내용 그대로 내려받아요. 엑셀에서 열면 한글이 깨지지 않게 UTF-8 BOM을 넣었어요.</span>
        <span className="op-grow" />
        <Dl name="알람정의서.csv" text={defsCSV(ds)} type="text/csv;charset=utf-8">CSV 내려받기</Dl>
        <Dl name="알람정의서.md" text={defsMD(ds)} type="text/markdown;charset=utf-8">마크다운 내려받기</Dl>
        <Dl name="알람정의서.json" text={JSON.stringify(ds.map(x => ({ ...x, priority: MX[x.sev][x.tm] })), null, 2)} type="application/json" ghost={false}>JSON 내려받기</Dl>
      </div>
    </div>
  )
}

/* ================= 4. 기준값 · 지속 시간 · 히스테리시스 ================= */
const DB_N = 240 // 2시간, 30초 간격
const DB_DATA = (() => {
  const r = rng(2026)
  let drift = 0
  return Array.from({ length: DB_N }, (_, i) => {
    drift = drift * 0.82 + (r() - 0.5) * 1.9
    return +(92.6 + Math.sin((i / DB_N) * Math.PI * 2.1 - 0.6) * 2.8 + drift).toFixed(2)
  })
})()
function runAlarm(data: number[], sp: number, db: number, delayPts: number) {
  const spans: [number, number][] = []
  let active = -1, above = 0
  data.forEach((v, i) => {
    if (active < 0) {
      above = v > sp ? above + 1 : 0
      if (v > sp && above > delayPts) active = i
    } else if (v < sp - db) { spans.push([active, i]); active = -1; above = 0 }
  })
  if (active >= 0) spans.push([active, data.length - 1])
  return spans
}
function Deadband() {
  const [sp, setSp] = useState(95)
  const [db, setDb] = useState(0)
  const [dl, setDl] = useState(0) // 분
  const spans = runAlarm(DB_DATA, sp, db, dl * 2)
  const raw = runAlarm(DB_DATA, sp, 0, 0).length
  const w = 1000, h = 230, lo = 86, hi = 100
  const x = (i: number) => 36 + (i / (DB_N - 1)) * (w - 46)
  const y = (v: number) => 12 + (1 - (v - lo) / (hi - lo)) * (h - 40)
  const path = DB_DATA.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const shortest = spans.length ? Math.min(...spans.map(s => s[1] - s[0])) / 2 : 0
  return (
    <div className="op-db">
      <div className="op-db-ctl">
        <div className="op-sl"><div><span>기준값</span><b>{sp}%</b></div><Range value={sp} min={90} max={99} onChange={setSp} label="기준값" /></div>
        <div className="op-sl"><div><span>히스테리시스(해제 여유)</span><b>{db}%p</b></div><Range value={db} min={0} max={5} step={0.5} onChange={setDb} label="히스테리시스" /></div>
        <div className="op-sl"><div><span>지속 시간(켜짐 지연)</span><b>{dl}분</b></div><Range value={dl} min={0} max={10} onChange={setDl} label="지속 시간" /></div>
      </div>
      <Hmi title="강변 1선 부하율 · 2시간 (가상)" right={<>알람 <b className={'op-db-n' + (spans.length > 3 ? ' bad' : '')}>{spans.length}번</b> 울림</>}>
        <div className="op-scroll">
          <svg viewBox={`0 0 ${w} ${h}`} className="op-db-svg" role="img" aria-label={`2시간 동안 알람 ${spans.length}번. 기준값만 쓰면 ${raw}번.`}>
            {[86, 90, 94, 98].map(v => <g key={v}><line className="grid" x1={36} x2={w - 10} y1={y(v)} y2={y(v)} /><text className="ax" x={30} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
            {spans.map(([a, b], i) => <rect key={i} className="on-span" x={x(a)} y={8} width={Math.max(2, x(b) - x(a))} height={h - 32} />)}
            {db > 0 && <rect className="band" x={36} width={w - 46} y={y(sp)} height={y(sp - db) - y(sp)} />}
            <line className="sp" x1={36} x2={w - 10} y1={y(sp)} y2={y(sp)} />
            {db > 0 && <line className="sp off" x1={36} x2={w - 10} y1={y(sp - db)} y2={y(sp - db)} />}
            <path className="ln" d={path} />
            {spans.map(([a], i) => <path key={'m' + i} className="mk" d={`M${x(a)} 6 l5 8 h-10z`} />)}
            {['0분', '30분', '60분', '90분', '120분'].map((t, i) => <text key={t} className="ax" x={36 + (i / 4) * (w - 46)} y={h - 6} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{t}</text>)}
          </svg>
        </div>
        <div className="op-db-leg"><span><i className="l" />부하율</span><span><i className="sp" />기준값(켜짐)</span>{db > 0 && <span><i className="sp off" />해제 기준</span>}<span><i className="on" />알람 켜진 구간</span></div>
      </Hmi>
      <p className="op-db-sum" aria-live="polite">
        기준값만 쓰면 2시간에 <b>{raw}번</b> 켜졌다 꺼져요(채터링, 알람이 깜빡이듯 반복). 지금 설정은 <b>{spans.length}번</b>
        {spans.length > 0 && <>, 가장 짧은 알람은 <b>{shortest}분</b></>}. 히스테리시스 3%p · 지속 시간 몇 분만 줘도 같은 상황을 한 번의 알람으로 묶을 수 있어요.
      </p>
    </div>
  )
}

/* ================= 5. 대응 절차 카드 ================= */
type Step = string | { q: string; yes: string; no: string }
const SOP: Record<string, { first: string; steps: Step[]; who: string; link?: [string, string] }> = {
  'A-101': { first: '정전 범위부터 확인해요.', who: '배전 운영 감독자 · 현장 출동반', link: ['#/dash/map', '단선도 열기 (06 탭)'], steps: [
    '계통도에서 산단 1선 CB 트립과 정전 구간을 확인해요.',
    '고장 표시기(FI)로 고장 구간을 좁혀요.',
    { q: '고장 구간이 한 구간으로 좁혀졌나요?', yes: '그 구간 양쪽 개폐기를 원격으로 열어 분리해요.', no: '현장 순시를 요청하고, 의심 구간을 나눠 하나씩 시험 투입해요.' },
    '변전소 CB를 투입해 고장 구간 앞쪽을 복구해요.',
    { q: '역송 받을 산단 2선의 부하 여유가 있나요?', yes: '연계 T/S를 닫아 뒤쪽 구간을 역송해요.', no: '구간을 더 나눠 일부만 넘기고, 감독자에게 보고해요.' },
    '현장 출동반에 고장 구간과 위치(지도)를 전달해요.',
    '조작 시각과 내용을 기록하고 감독자에게 보고해요.',
  ] },
  'A-102': { first: '오르는 중인지, 멈췄는지 추세부터 봐요.', who: '배전 관제 당번', steps: [
    '강변 1선 부하 추세(최근 1시간)를 확인해요.',
    '연계된 인접 선로(강변 2선)의 현재 부하를 확인해요.',
    { q: '절체 뒤에도 강변 2선이 정상 범위 안인가요?', yes: '연계 개폐기로 일부 구간을 강변 2선으로 절체해요.', no: '감독자에게 보고하고 다른 연계 선로를 찾아요.' },
    '절체 뒤 15분간 두 선로 부하를 지켜봐요.',
    '조치 내용을 기록해요.',
  ] },
  'A-103': { first: '냉각팬이 돌고 있는지부터 봐요.', who: '변전 설비 담당', steps: [
    '주변압기 냉각팬 동작 상태를 원격으로 확인해요.',
    { q: '냉각팬이 정상 동작 중인가요?', yes: '부하를 줄이도록 일부 선로 절체를 검토해요.', no: '팬을 원격으로 기동해 보고, 안 되면 현장 점검을 요청해요.' },
    '유온 추세를 15분간 지켜봐요.',
    '조치 내용을 기록해요.',
  ] },
  'A-104': { first: '선로 끝만 낮은지, 변전소 전체가 낮은지 나눠 봐요.', who: '배전 관제 당번', steps: [
    '북부 2선 끝 전압 추세를 확인해요.',
    '같은 변전소 다른 선로(북부 1·3선) 전압과 비교해요.',
    { q: '변전소 모선 전압도 낮나요?', yes: '변전소 탭 조정을 검토해요(감독자 승인).', no: '선로 부하를 확인하고 선로 전압 조정을 검토해요.' },
    '조치 내용을 기록해요.',
  ] },
  'A-105': { first: '한 대만 끊겼는지, 통신망 전체 문제인지 봐요.', who: '통신 담당', steps: [
    '통신을 한 번 더 시도해요.',
    { q: '주변 개폐기들도 같이 끊겼나요?', yes: '통신망 장애로 보고 통신 담당에게 연락해요.', no: '해당 개폐기 현장 점검을 요청해요.' },
    '복구 전까지 이 개폐기를 ‘서비스 제외’로 표시해요.',
    '교대 인수인계에 적어요.',
  ] },
  'A-106': { first: 'CCTV로 누가 있는지부터 봐요.', who: '보안 담당', steps: [
    'CCTV로 출입문 주변을 확인해요.',
    { q: '오늘 예정된 작업이 있나요?', yes: '작업 일지와 맞춰 보고, 해제 시각을 정해 알람을 보류(shelve)해요.', no: '보안 담당과 감독자에게 바로 연락해요.' },
    '확인 결과를 기록해요.',
  ] },
}
function SopCards() {
  const [id, setId] = useState('A-101')
  const [done, setDone] = useState<Record<string, boolean[]>>({})
  const [br, setBr] = useState<Record<string, ('yes' | 'no' | undefined)[]>>({})
  const a = ALARMS.find(x => x.id === id)!, s = SOP[id]
  const dn = done[id] ?? [], bb = br[id] ?? []
  const n = s.steps.filter((_, i) => dn[i]).length
  const tick = (i: number) => setDone(o => ({ ...o, [id]: s.steps.map((_, j) => (j === i ? !dn[j] : !!dn[j])) }))
  const pick = (i: number, v: 'yes' | 'no') => { setBr(o => ({ ...o, [id]: s.steps.map((_, j) => (j === i ? v : bb[j])) })); if (!dn[i]) tick(i) }
  return (
    <div className="op-sop">
      <Hmi title="알람 목록" right={`${ALARMS.length}건`} className="op-sop-list">
        <ul>
          {ALARMS.map(x => (
            <li key={x.id}><button type="button" className={'op-sop-a' + (x.id === id ? ' on' : '')} aria-pressed={x.id === id} onClick={() => setId(x.id)}>
              <PriBadge p={x.pri} /><span><b>{x.where}</b><small>{x.what}</small></span><i aria-hidden="true">절차 ›</i>
            </button></li>
          ))}
        </ul>
      </Hmi>
      <article className="op-card" aria-live="polite" aria-label={`${a.id} 대응 절차`}>
        <header>
          <div className="op-card-top"><PriBadge p={a.pri} label /><span className="muted">{a.id} · 대응 {PRI[a.pri].respond}</span></div>
          <h4>{a.where} — {a.what}</h4>
          <p className="op-first"><b>먼저</b> {s.first}</p>
        </header>
        <ol className="op-steps">
          {s.steps.map((st, i) => (
            <li key={i} className={dn[i] ? 'done' : ''}>
              <label className="op-chk"><input type="checkbox" checked={!!dn[i]} onChange={() => tick(i)} /><span className="n">{i + 1}</span></label>
              {typeof st === 'string' ? <span>{st}</span> : (
                <div className="op-branch">
                  <span><b>판단</b> {st.q}</span>
                  <div className="op-row">
                    <button type="button" className="chip" aria-pressed={bb[i] === 'yes'} onClick={() => pick(i, 'yes')}>예</button>
                    <button type="button" className="chip" aria-pressed={bb[i] === 'no'} onClick={() => pick(i, 'no')}>아니요</button>
                  </div>
                  {bb[i] && <span className="op-then">→ {bb[i] === 'yes' ? st.yes : st.no}</span>}
                </div>
              )}
            </li>
          ))}
        </ol>
        <footer>
          <span>연락: {s.who}</span>
          {s.link && <a href={s.link[0]}>{s.link[1]}</a>}
          <span className="op-prog"><i style={{ width: (n / s.steps.length) * 100 + '%' }} /></span>
          <span className="muted">{n}/{s.steps.length} · 개정 2026-10-02 · 승인 운영 책임자 (가상)</span>
        </footer>
      </article>
    </div>
  )
}

/* ================= 6. 교대 인수인계 ================= */
interface HoItem { id: string; kind: '진행 중' | '보류' | '서비스 제외'; pri?: Pri; t: string; d: string }
const HO_ITEMS: HoItem[] = [
  { id: 'h1', kind: '진행 중', pri: 1, t: '산단 1선 구간 3 고장 — 수리 중', d: '구간 1·2 복구, 구간 4는 산단 2선에서 역송 중. 현장 출동반 2조 작업 중, 완료 예정 19:30.' },
  { id: 'h2', kind: '진행 중', pri: 2, t: '산단 2선 부하율 90% (역송 때문)', d: '경보 95% 아래. 저녁 수요 오르면 다시 확인. 수리 끝나면 연계 T/S 열고 원상 복구.' },
  { id: 'h3', kind: '보류', pri: 3, t: '북부 변전소 출입문 개방 — 보류', d: '정기 점검 작업(작업 일지 #1108). 18:00 보류 해제 예정. 해제 뒤 다시 울리면 보안 담당 연락.' },
  { id: 'h4', kind: '서비스 제외', pri: 3, t: '강변 2선 R/C-12 — 서비스 제외', d: '통신 두절. 현장 점검 요청함(내일 오전). 그동안 이 개폐기는 원격 조작 불가.' },
]
function Handover() {
  const [from, setFrom] = useState('김주간')
  const [to, setTo] = useState('이야간')
  const [ok, setOk] = useState<Record<string, boolean>>({})
  const [memo, setMemo] = useState('내일 09:00 북부 2선 탭 조정 작업 예정(감독자 승인 완료).')
  const [signed, setSigned] = useState(false)
  const all = HO_ITEMS.every(x => ok[x.id])
  const md = useMemo(() => {
    const L = [`# 교대 인수인계 — ${CENTER}`, '', `- 교대: 주간 → 야간 (18:00)`, `- 인계: ${from} / 인수: ${to}`, '']
    for (const k of ['진행 중', '보류', '서비스 제외'] as const) {
      L.push(`## ${k}`, '')
      HO_ITEMS.filter(x => x.kind === k).forEach(x => L.push(`- [${ok[x.id] ? 'x' : ' '}] ${x.pri ? `(우선순위 ${x.pri}) ` : ''}**${x.t}** — ${x.d}`))
      L.push('')
    }
    L.push('## 특이 사항', '', memo || '(없음)', '', `## 확인`, '', signed ? `- ${to} 인수 확인 완료` : '- 인수 확인 전')
    return L.join('\n')
  }, [from, to, ok, memo, signed])
  return (
    <div className="op-ho">
      <Hmi title="교대 인수인계 · 주간 → 야간 18:00" right={signed ? '인수 완료' : '인수 확인 중'} className="op-ho-hmi">
        <div className="op-ho-people">
          <label>인계 <input value={from} onChange={e => setFrom(e.target.value)} aria-label="인계자" /></label>
          <span aria-hidden="true">→</span>
          <label>인수 <input value={to} onChange={e => setTo(e.target.value)} aria-label="인수자" /></label>
        </div>
        {(['진행 중', '보류', '서비스 제외'] as const).map(k => (
          <div key={k} className="op-ho-grp">
            <b>{k} <small>{HO_ITEMS.filter(x => x.kind === k).length}</small></b>
            {HO_ITEMS.filter(x => x.kind === k).map(x => (
              <label key={x.id} className={'op-ho-item' + (ok[x.id] ? ' ok' : '')}>
                <input type="checkbox" checked={!!ok[x.id]} disabled={signed} onChange={() => setOk(o => ({ ...o, [x.id]: !o[x.id] }))} />
                <span>{x.pri && <PriBadge p={x.pri} />}</span>
                <span><b>{x.t}</b><small>{x.d}</small></span>
              </label>
            ))}
          </div>
        ))}
        <label className="op-ho-memo"><b>특이 사항</b><textarea rows={2} value={memo} disabled={signed} onChange={e => setMemo(e.target.value)} /></label>
        <div className="op-ho-sign">
          <span>{all ? '모든 항목을 확인했어요.' : `인수자가 ${HO_ITEMS.filter(x => !ok[x.id]).length}개 항목을 더 확인해야 해요.`}</span>
          <button type="button" className="btn sm" disabled={!all} onClick={() => setSigned(v => !v)}>{signed ? '인수 취소' : `${to} 인수 확인`}</button>
        </div>
      </Hmi>
      <div className="op-ho-side">
        <ul className="op-why">
          <li><b>말로만 넘기지 않아요.</b> 보류한 알람과 서비스 제외 설비는 화면에서 조용해서, 적지 않으면 다음 사람은 존재 자체를 몰라요.</li>
          <li><b>인수자가 하나씩 체크해요.</b> 인계자가 ‘다 말했다’가 아니라 인수자가 ‘다 들었다’를 확인해요. 모두 체크해야 인수 버튼이 켜져요.</li>
          <li><b>보류엔 해제 시각을 적어요.</b> ISA-18.2에서 보류(shelved)는 운영자가 잠깐 끈 상태예요 <Cite n={1} />. 끝이 없는 보류는 잊힌 알람이 돼요.</li>
          <li><b>기록으로 남겨요.</b> 다음 교대, 사고 조사, 알람 KPI가 모두 이 기록을 봐요.</li>
        </ul>
        <div className="op-row">
          <Dl name="교대인수인계.md" text={md} type="text/markdown;charset=utf-8" ghost={false}>인수인계 템플릿 내려받기(.md)</Dl>
        </div>
      </div>
    </div>
  )
}

/* ================= 7. 알람 KPI ================= */
interface Tag { n: string; pre: number; post: number; pPre: Pri; pPost: Pri }
const TAGS: Tag[] = [
  { n: '강변 1선 부하율 높음', pre: 0.9, post: 0.06, pPre: 1, pPost: 2 },
  { n: '북부 2선 전압 낮음', pre: 0.6, post: 0.05, pPre: 2, pPost: 3 },
  { n: '강변 2선 R/C-12 통신 두절', pre: 0.5, post: 0.03, pPre: 2, pPost: 3 },
  { n: '북부 변전소 출입문 개방', pre: 0.35, post: 0, pPre: 2, pPost: 3 },
  { n: '산단 1선 부하율 높음', pre: 0.3, post: 0.05, pPre: 1, pPost: 2 },
  { n: '산업단지 변전소 주변압기 유온', pre: 0.2, post: 0.04, pPre: 1, pPost: 2 },
  { n: '강변 3선 R/C-5 배터리 낮음', pre: 0.15, post: 0.02, pPre: 2, pPost: 3 },
  ...['북부 1선 R/C-7 통신 지연', '강변 변전소 축전지 전압', '산단 3선 전압 낮음', '북부 3선 부하율 높음', '강변 2선 부하율 높음', '산단 2선 R/C-4 통신 두절', '북부 변전소 냉각팬 정지', '강변 변전소 출입문 개방', '산단 1선 R/C-11 배터리 낮음', '북부 2선 R/C-3 통신 두절', '강변 3선 전압 높음', '산업단지 변전소 소방 설비 이상', '산단 3선 부하율 높음', '강변 1선 R/C-8 통신 두절', '북부 1선 전압 낮음', '산단 2선 전압 낮음', '강변 변전소 주변압기 유온']
    .map((n, i) => ({ n, pre: 0.012 + (i % 6) * 0.009, post: 0.01 + (i % 5) * 0.006, pPre: ((i % 3) + 1) as Pri, pPost: (i % 9 === 0 ? 1 : i % 4 === 0 ? 2 : 3) as Pri })),
]
/** 폭주: [날, 시작 10분 칸, 칸 수, 칸당 알람 수(전), 칸당(후)] — 연쇄 알람 */
const FLOODS: [number, number, number, number, number][] = [[0, 53, 2, 14, 2], [2, 84, 3, 22, 3], [4, 117, 2, 13, 2], [5, 19, 5, 16, 1]]
const DAY_N = ['월', '화', '수', '목', '금', '토', '일']
function poisson(r: () => number, l: number) { if (l <= 0) return 0; const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r() } while (p > L); return k - 1 }
function simKpi(after: boolean) {
  const r = rng(after ? 811 : 810)
  const win = Array.from({ length: 7 }, () => new Array<number>(144).fill(0))
  const perTag = TAGS.map(() => 0)
  const perPri: Record<Pri, number> = { 1: 0, 2: 0, 3: 0 }
  for (let d = 0; d < 7; d++) for (let w = 0; w < 144; w++) {
    const tod = 0.45 + 1.1 * Math.max(0, Math.sin(((w / 6 - 6) / 12) * Math.PI)) // 낮(6~18시)에 많고 밤에 적게
    TAGS.forEach((t, i) => {
      const k = poisson(r, (after ? t.post : t.pre) * tod)
      if (k) { win[d][w] += k; perTag[i] += k; perPri[after ? t.pPost : t.pPre] += k }
    })
  }
  for (const [d, s, n, pre, post] of FLOODS) for (let j = 0; j < n; j++) {
    const k = after ? post : pre + Math.floor(r() * 4)
    win[d][s + j] += k; perPri[after ? 3 : 2] += Math.ceil(k * 0.6); perPri[after ? 2 : 1] += k - Math.ceil(k * 0.6)
  }
  const total = win.flat().reduce((a, b) => a + b, 0)
  const flood = win.flat().filter(v => v > 10).length
  const top = TAGS.map((t, i) => ({ n: t.n, c: perTag[i] })).sort((a, b) => b.c - a.c)
  const tagTotal = perTag.reduce((a, b) => a + b, 0)
  const prSum = perPri[1] + perPri[2] + perPri[3]
  return {
    win, total, perHour: total / (7 * 24), per10: total / (7 * 144), floodPct: (flood / (7 * 144)) * 100, flood,
    top: top.slice(0, 10), top10Share: top.slice(0, 10).reduce((a, b) => a + b.c, 0) / tagTotal, tagTotal,
    dist: ([1, 2, 3] as Pri[]).map(p => ({ p, pct: Math.round((perPri[p] / prSum) * 100) })),
    stale: after ? 3 : 11,
  }
}
function Kpi() {
  const [after, setAfter] = useState(false)
  const k = useMemo(() => simKpi(after), [after])
  const max = Math.max(...k.top.map(t => t.c))
  const tiles: { n: string; v: string; target: string; ok: boolean; sub: string }[] = [
    { n: '운영자 1명당 10분 알람', v: k.per10.toFixed(1) + '개', target: '약 1개', ok: k.per10 <= 1.2, sub: `시간당 ${k.perHour.toFixed(1)}개 · 일주일 ${k.total.toLocaleString('ko-KR')}개` },
    { n: '폭주 구간 비율', v: k.floodPct.toFixed(1) + '%', target: '1% 미만', ok: k.floodPct < 1, sub: `10분에 10개 넘은 칸 ${k.flood}개 / 1,008칸` },
    { n: '오래 떠 있는 알람', v: k.stale + '개', target: '하루 5개 미만', ok: k.stale < 5, sub: '24시간 넘게 활성 상태' },
    { n: '긴급(1) 비율', v: k.dist[0].pct + '%', target: '약 5%', ok: k.dist[0].pct <= 8, sub: k.dist.map(d => `${PRI[d.p].name} ${d.pct}%`).join(' · ') },
  ]
  let cum = 0
  return (
    <div className="op-kpi">
      <div className="op-row">
        <Seg value={after ? 'a' : 'b'} onChange={v => setAfter(v === 'a')} options={[['b', '합리화 전'], ['a', '합리화 후']]} />
        <span className="muted">같은 일주일을 알람 정의를 고치기 전과 후로 계산했어요(가상 기록).</span>
      </div>
      <div className="op-tiles">
        {tiles.map(t => (
          <div key={t.n} className={'op-tile' + (t.ok ? ' ok' : ' bad')}>
            <small>{t.n}</small>
            <b>{t.v}</b>
            <span className={'op-target'}>{t.ok ? '목표 안' : '목표 넘음'} · 목표 {t.target}</span>
            <small className="sub">{t.sub}</small>
          </div>
        ))}
      </div>
      <div className="op-kpi-grid">
        <figure className="op-heat">
          <figcaption><b>10분 칸마다 알람 수</b><span className="muted">가로 0시 → 24시, 세로 요일</span></figcaption>
          <div className="op-scroll">
            <svg viewBox="0 0 760 170" className="op-heat-svg" role="img" aria-label={`일주일 알람 히트맵. 폭주 칸 ${k.flood}개.`}>
              {k.win.map((row, d) => (
                <g key={d}>
                  <text className="ax" x={14} y={14 + d * 21 + 12} textAnchor="middle">{DAY_N[d]}</text>
                  {row.map((v, w) => (
                    <rect key={w} x={30 + w * 5} y={14 + d * 21} width={4.4} height={18}
                      className={v > 10 ? 'flood' : v >= 5 ? 'c4' : v >= 2 ? 'c2' : v === 1 ? 'c1' : 'c0'} />
                  ))}
                </g>
              ))}
              {[0, 6, 12, 18, 24].map(hh => <text key={hh} className="ax" x={30 + hh * 30} y={166} textAnchor="middle">{hh}시</text>)}
            </svg>
          </div>
          <div className="op-heat-leg"><span><i className="c0" />0</span><span><i className="c1" />1</span><span><i className="c2" />2~4</span><span><i className="c4" />5~10</span><span><i className="flood" />10개 넘음(폭주)</span></div>
        </figure>
        <figure className="op-pareto">
          <figcaption><b>자주 울린 알람 상위 10개</b><span className="muted">전체의 {Math.round(k.top10Share * 100)}%</span></figcaption>
          <ol>
            {k.top.map((t, i) => {
              cum += t.c
              return (
                <li key={t.n}>
                  <span className="n">{i + 1}</span>
                  <span className="t">{t.n}</span>
                  <span className="bar"><i style={{ width: (t.c / max) * 100 + '%' }} /></span>
                  <span className="c">{t.c}</span>
                  <span className="cum">{Math.round((cum / k.tagTotal) * 100)}%</span>
                </li>
              )
            })}
          </ol>
          <small className="muted">오른쪽 끝 숫자는 누적 비율. 연쇄(폭주) 알람은 제외했어요.</small>
        </figure>
      </div>
    </div>
  )
}

/* ================= 8. 인터뷰 · 섀도잉 ================= */
const QS: { g: string; items: [string, string][] }[] = [
  { g: '평소 업무', items: [
    ['근무 중 가장 오래 띄워 두는 화면은 무엇인가요?', '레벨 2(주 작업 화면) 후보예요.'],
    ['아무 일 없을 때 화면에서 무엇을 확인하나요?', '‘평온함 확인’에 필요한 최소 정보를 알아내요.'],
    ['화면을 몇 번, 어떤 순서로 바꾸나요?', '자주 오가는 화면은 한 번에 닿게 해요.'],
  ] },
  { g: '이상 상황', items: [
    ['최근 가장 힘들었던 상황을 처음부터 이야기해 주세요.', '일반론보다 실제 사례가 정확해요.'],
    ['그때 무엇을 보고 ‘이상하다’고 알았나요?', '지각(상황 인식 1단계)의 단서예요.'],
    ['필요한 정보를 어디서 찾았나요? 화면 밖(전화, 종이)도요.', '화면에 없는 정보를 찾아요.'],
  ] },
  { g: '알람', items: [
    ['무시해도 되는 알람이 있나요? 왜 그런가요?', '합리화 1순위 후보예요.'],
    ['울리면 바로 일어나는 알람은 무엇인가요?', '진짜 긴급의 기준을 알아내요.'],
    ['같은 원인으로 알람이 줄줄이 뜬 적이 있나요?', '연쇄 억제 대상이에요.'],
  ] },
  { g: '교대 · 환경', items: [
    ['교대할 때 말로만 전하는 것이 있나요?', '인수인계 화면에 넣을 항목이에요.'],
    ['벽면 큰 화면은 누가, 언제 보나요?', '레벨 1 화면의 실제 쓰임을 확인해요.'],
    ['야간엔 조명을 어떻게 하나요?', '다크·라이트 화면 결정 근거예요(07 탭).'],
  ] },
]
function Interview() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const md = useMemo(() => {
    const L = ['# 관제 운영자 인터뷰 질문지', '', '- 대상: ', '- 날짜: ', '- 진행: ', '']
    QS.forEach(g => { L.push(`## ${g.g}`, ''); g.items.forEach(([q, w]) => L.push(`- [${on[q] ? 'x' : ' '}] ${q}`, `  - 왜 묻나: ${w}`, '  - 답: ')); L.push('') })
    L.push('## 섀도잉 기록지', '', '| 시각 | 본 화면 | 한 일 | 막힌 곳 · 혼잣말 | 메모 |', '|---|---|---|---|---|')
    for (let i = 0; i < 8; i++) L.push('| | | | | |')
    return L.join('\n')
  }, [on])
  const n = Object.values(on).filter(Boolean).length, tot = QS.reduce((a, g) => a + g.items.length, 0)
  return (
    <div className="op-iv">
      <div className="op-iv-grid">
        {QS.map(g => (
          <div key={g.g} className="op-iv-g">
            <b>{g.g}</b>
            <ul>
              {g.items.map(([q, w]) => (
                <li key={q}><label>
                  <input type="checkbox" checked={!!on[q]} onChange={() => setOn(o => ({ ...o, [q]: !o[q] }))} />
                  <span>{q}<small>{w}</small></span>
                </label></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="op-shadow">
        <b>섀도잉(옆에 앉아 지켜보기) 기록지 예시</b>
        <div className="sys-table-wrap">
          <table className="sys-table">
            <thead><tr><th>시각</th><th>본 화면</th><th>한 일</th><th>막힌 곳 · 혼잣말</th></tr></thead>
            <tbody>
              <tr><td>14:02</td><td>알람 목록</td><td>소리 끄고 산단 1선 알람 확인</td><td>“어디까지 나간 거지?” — 정전 범위가 목록에 없음</td></tr>
              <tr><td>14:03</td><td>계통도 → 지도</td><td>고장 표시기 보고 구간 추정</td><td>지도로 넘어가자 선택이 풀려서 다시 찾음</td></tr>
              <tr><td>14:05</td><td>종이 연락처</td><td>현장 출동반에 전화</td><td>연락처가 화면에 없음 → 대응 절차 카드 후보</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="op-row">
        <span className="muted">고른 질문 {n}/{tot}. 고른 질문은 체크된 채로 내려받아져요.</span>
        <span className="op-grow" />
        <Dl name="관제_인터뷰_질문지.md" text={md} type="text/markdown;charset=utf-8" ghost={false}>질문지 + 기록지 내려받기(.md)</Dl>
      </div>
    </div>
  )
}

/* ================= 탭 ================= */
const LINKS: [string, string, string][] = [
  ['#/plan/prd', '기획 01 · 문제 정의 · PRD', '알람 정의서의 각 줄은 인수 조건으로 바꿔 쓸 수 있어요.'],
  ['#/plan/policy', '기획 04 · 정책 · 예외', '상태 다이어그램 작성법 → 알람 상태(미확인·확인·보류)에 그대로 써요.'],
  ['#/plan/collab', '기획 08 · 협업 · 소통', '요구사항 받는 법, 회의록 — 운영자 인터뷰 정리에 써요.'],
  ['#/plan/metrics', '기획 06 · 지표 · 데이터', '지표 정의서 쓰는 법 → 알람 KPI 정의에 써요.'],
  ['#/plan/qa', '기획 09 · QA · 출시', '출시 체크리스트 — 알람 테스트(일부러 울려 보기)를 넣어요.'],
  ['#/dash/alarm', '관제 03 · 알람 설계', '알람 상태, 폭주 시뮬레이션, 좋은 알람 문구.'],
]

export default function Tab() {
  return (
    <div data-dash="ops">
      <SysGrid>
        <Section id="dash-ops-why" wide title="화면보다 먼저 정해야 할 네 가지"
          desc="관제 화면이 좋아지는 건 대부분 그리기 전에 정해져요. 어떤 알람이 왜 울리고, 울리면 무엇을 하고, 교대 때 무엇을 넘기고, 잘 되고 있는지 어떻게 재는지예요.">
          <Cycle />
          <Finding src={<>ANSI/ISA-18.2 알람의 정의 — 한국어 요약 <Cite n={1} /></>}>
            알람은 설비 고장이나 공정 이탈처럼 운영자의 대응이 필요한 비정상 상태를 알리는 것이에요. 대응할 게 없으면 알람이 아니에요.
          </Finding>
          <Note>이 탭의 알람·절차·사람 이름·기록은 모두 <b>가상의 {CENTER}</b> 예시예요. 기준값과 시간은 실제 설비 기준이 아니에요.</Note>
        </Section>

        <Section id="dash-ops-matrix" title="우선순위는 ‘느낌’이 아니라 두 질문으로"
          desc="결과가 얼마나 심각한가 × 손쓸 시간이 얼마나 남았나. 칸을 눌러 보세요.">
          <PriorityMatrix />
          <Note>알람 관리 표준은 우선순위를 3~4단계 이하로 두고, 결과의 심각도와 대응 시간으로 정하게 해요 <Cite n={1} /><Cite n={2} />. 칸에 들어간 숫자(10분·30분, 심각도 설명)는 <b>예시</b>예요. 팀이 처음 한 번 합의해서 정의서 맨 앞에 적어 둬요.</Note>
        </Section>

        <Section id="dash-ops-flood-why" title="왜 하나하나 정의해야 하나"
          desc="알람이 많을수록 사람은 알람을 덜 믿어요.">
          <div className="op-fatigue">
            <div className="op-fatigue-bar" role="img" aria-label="보고된 수치: 임상 알람의 72에서 99퍼센트가 거짓이거나 조치가 필요 없었다">
              <i style={{ left: '72%', width: '27%' }} />
              <span style={{ left: '72%' }}>72%</span><span style={{ left: '99%' }}>99%</span>
            </div>
            <p>의료 분야에서 임상 알람의 <b>72~99%</b>가 거짓이거나 조치가 필요 없었다고 보고됐어요(Sendelbach & Funk 2013, 2차 인용) <Cite n={4} />. 어린이 병원 연구에서는 중환자실 87.1%, 일반 병동 99.0%가 조치 불필요였어요. 알람 대부분이 헛울림이면 사람은 알람에 무뎌져요. 이걸 알람 피로라고 불러요.</p>
          </div>
          <div className="op-norm">
            <b>보고된 알람 관리 목표값</b>
            <ul>
              <li><span>평상시</span><b>10분에 약 1개</b><small>운영자 1명당 · 시간당 6개 · 하루 약 150개 미만</small></li>
              <li><span>폭주</span><b>10분에 10개 초과</b><small>폭주 구간은 전체의 1% 미만</small></li>
              <li><span>분포</span><b>80 · 15 · 5%</b><small>주의 · 높음 · 긴급 (3단계일 때)</small></li>
              <li><span>오래 떠 있는</span><b>하루 5개 미만</b><small>계속 활성인 알람</small></li>
            </ul>
            <small className="muted">2차 자료에서 확인한 ISA-18.2·EEMUA 191 쪽 목표값이에요 <Cite n={3} />. 그대로 기준으로 옮기기보다 우리 현장을 재는 출발점으로 써요.</small>
          </div>
        </Section>

        <Section id="dash-ops-def" wide title="알람 정의서 — 한 알람에 한 줄, 빈칸 없이"
          desc="알람 합리화(rationalization)는 알람 하나하나에 ‘왜 있나, 언제 울리나, 무엇을 하라는 건가’를 적는 일이에요. 왼쪽에서 고르고 오른쪽에서 고쳐 보세요. 우선순위는 매트릭스로 자동 계산돼요.">
          <DefEditor />
          <Note tone="tip"><b>빈칸이 곧 숙제예요.</b> ‘대응’ 칸을 못 채우는 알람은 대부분 알람이 아니라 이벤트예요. ‘원인’ 칸을 못 채우면 운영자도 모른다는 뜻이니, 확인 방법을 먼저 정해요. 정의서 맨 아래 검토 기록(날짜·검토자·바꾼 것·이유)을 꼭 남겨요.</Note>
        </Section>

        <Section id="dash-ops-deadband" wide title="기준값만으로는 부족해요 — 지속 시간과 히스테리시스"
          desc="부하율이 95% 언저리에서 출렁이면, 기준값만 정한 알람은 켜졌다 꺼졌다를 반복해요. 슬라이더를 움직여 같은 2시간에 알람이 몇 번 울리는지 보세요.">
          <Deadband />
          <SysPair>
            <Note><b>지속 시간(켜짐 지연)</b>: 기준값을 넘은 채로 정한 시간이 지나야 울려요. 잠깐 튀는 값을 걸러요. 대신 그만큼 늦게 알아요. 긴급(1) 알람엔 짧게 둬요.</Note>
            <Note><b>히스테리시스(데드밴드)</b>: 켜진 알람은 기준값보다 조금 더 내려가야 꺼져요. 기준값 근처에서 깜빡이는 채터링을 막아요. 둘 다 정의서에 칸이 있어야 하는 이유예요 <Cite n={1} />.</Note>
          </SysPair>
        </Section>

        <Section id="dash-ops-sop" wide title="대응 절차 카드 — 알람에서 바로 열려야 해요"
          desc="알람을 고르면 그 알람의 절차가 열려요. 단계를 체크하고, 판단 지점에서 예·아니요를 골라 보세요.">
          <SopCards />
          <div className="op-rules">
            <div><b>첫 줄은 ‘먼저 볼 것’</b><p>긴 설명보다 첫 행동 하나. 급할 땐 첫 줄만 읽어요.</p></div>
            <div><b>한 단계 = 한 동사</b><p>“확인해요”, “열어요”, “연락해요”. 두 가지를 한 줄에 넣지 않아요.</p></div>
            <div><b>판단은 예·아니요로</b><p>“상황에 따라”라고 쓰지 않고, 무엇을 보고 어느 쪽으로 가는지 적어요.</p></div>
            <div><b>한 화면에 다 보이게</b><p>스크롤해야 하면 절차가 너무 길어요. 길면 나눠요.</p></div>
            <div><b>연락처와 관련 화면을 카드 안에</b><p>섀도잉에서 가장 자주 보는 장면이 종이 연락처를 찾는 모습이에요.</p></div>
            <div><b>개정일·승인자</b><p>오래된 절차는 위험해요. 누가 언제 확인했는지 적어요.</p></div>
          </div>
        </Section>

        <Section id="dash-ops-handover" wide title="교대 인수인계 화면"
          desc="진행 중 이슈, 보류 중 알람, 서비스에서 뺀 설비, 특이 사항. 인수자가 하나씩 확인해야 인수가 끝나요.">
          <Handover />
        </Section>

        <Section id="dash-ops-kpi" wide title="알람 KPI — 매주 재고, 정의서를 고쳐요"
          desc="10분당 알람 수, 폭주 구간 비율, 오래 떠 있는 알람, 우선순위 분포, 자주 울리는 상위 10개. ‘합리화 후’로 바꿔 보세요.">
          <Kpi />
          <Note>목표값은 2차 자료로 확인한 보고된 수치예요 <Cite n={3} />. 상위 몇 개 알람이 전체의 대부분을 차지하는 경우가 실무에선 흔해요 <Cite n={6} />. 그래서 합리화는 수백 개를 한꺼번에 보는 것보다 <b>상위 10개부터</b> 고치는 게 효과가 커요. 이 예시의 수치는 가상 기록으로 계산한 값이에요.</Note>
        </Section>

        <Section id="dash-ops-interview" wide title="운영자에게 물어볼 것, 옆에서 볼 것"
          desc="관제 화면 요구사항은 회의실보다 관제실에서 나와요. 인터뷰로 ‘무엇을 하는지’를 듣고, 섀도잉으로 ‘실제로 어떻게 하는지’를 봐요.">
          <Interview />
          <Note tone="tip"><b>말과 행동은 달라요.</b> 인터뷰에선 “알람은 다 봐요”라고 해도, 옆에서 보면 특정 알람은 소리만 끄고 넘겨요. 그 차이가 합리화 1순위예요. 상황 인식 3단계(지각·이해·예측)로 기록을 나눠 보면 화면이 어느 단계를 못 돕는지 보여요 <Cite n={5} />.</Note>
        </Section>

        <Section id="dash-ops-links" wide title="기획 노트와 이어 읽기" desc="관제 화면 기획도 결국 기획의 기본기 위에 있어요.">
          <ul className="op-links">
            {LINKS.map(([h, t, d]) => <li key={h}><a href={h}><b>{t}</b><small>{d}</small></a></li>)}
          </ul>
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'ANSI/ISA-18.2 (IEC 62682) Management of Alarm Systems for the Process Industries — 알람의 정의, 합리화, 우선순위, 알람 상태(보류·설계상 억제·서비스 제외) (2차 해설)', url: 'https://www.processonline.com.au/content/software-it/article/improving-alarm-management-with-isa-18-2-part-2-1141142642' },
          { kind: 'standard', text: 'EEMUA 191 Alarm Systems — A Guide to Design, Management and Procurement (2차 해설)', url: 'https://open-exam-prep.com/study-guides/nebosh-hse-process-safety/process-hazard-control/alarm-management-eemua191' },
          { kind: 'reported', text: '알람 관리 목표값: 10분에 약 1개, 10분에 10개 초과는 폭주, 폭주 구간 1% 미만, 우선순위 80/15/5%, 오래 떠 있는 알람 하루 5개 미만 (업체 해설)', url: 'https://ifactoryapp.com/industries/oil-and-gas/alarm-management-isa-18-2-rationalization-flooding' },
          { kind: 'reported', text: '알람 피로(의료): Sendelbach & Funk (2013), AACN Advanced Critical Care — 임상 알람 72~99% 거짓·조치 불필요(2차 인용). 어린이 병원 연구 — 중환자실 87.1%, 일반 병동 99.0% 조치 불필요', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4456276' },
          { kind: 'paper', text: 'Endsley, M. R. (1995). Toward a Theory of Situation Awareness in Dynamic Systems. Human Factors 37(1).', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'practice', text: '상위 10개 알람부터 합리화, 대응 절차 카드, 교대 인수인계 확인, 섀도잉 기록 — 관제 운영 실무 방식' },
        ]} />
      </SysGrid>
    </div>
  )
}

function SysPair({ children }: { children: ReactNode }) { return <div className="op-pair">{children}</div> }
