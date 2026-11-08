/* 08 기획 · 운영 정의 — 흔한 실수, 안전 이벤트 정의서, 우선순위 매트릭스, 대응 절차, 교대 인수인계·일일 점검, 알람 KPI
 * 예시: 가상의 가람산업 통합 안전관리 상황실 (data.ts SAFE_*) */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Term, TermList } from '../../components/Term'
import { Range, Seg } from '../../components/ui'
import { download } from '../../system/export'
import { Note, Section, SysGrid } from '../../system/ui'
import { PRI, SAFE_ALARMS, SAFE_CENTER, SAFE_EVENT, SAFE_SOP, rng, type Pri } from '../data'
import { CaseCard, Cite, Finding, Hmi, PriBadge, Refs } from '../ui'
import './ops.css'

/* ================= 공용 ================= */
const csvCell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const toCSV = (rows: (string | number)[][]) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n')
const mdCell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ')
function Dl({ name, text, type, children, ghost = true }: { name: string; text: string; type: string; children: ReactNode; ghost?: boolean }) {
  return <button type="button" className={'btn sm' + (ghost ? ' ghost' : '')} onClick={() => download(name, text, type)}>{children}</button>
}

/* ================= 0. 흔한 실수 ================= */
const Lamp = () => <i className="mk-lamp" aria-hidden="true" />
function MkDefBefore() {
  return (
    <Hmi dark title="같은 가스 누출, 화면 세 곳" right={<span className="mk-red">기준 3벌</span>} className="op-mk">
      <div className="mk-three">
        <div><small>상황실 벽면</small><b className="mk-org">가스 경고 12%</b><span>기준 10% · 주황</span></div>
        <div><small>현장 태블릿</small><b className="mk-ok"><Lamp /> 정상</b><span>기준 20%</span></div>
        <div><small>문자 알림</small><b className="mk-red">[긴급] 가스 알람 발생</b><span>위치·값 없음</span></div>
      </div>
      <p className="mk-foot">기준값은 화면 개발자가 각자 코드에 적었어요. 누가 언제 정했는지 아무도 몰라요</p>
    </Hmi>
  )
}
function MkDefAfter() {
  return (
    <Hmi title="정의서 한 줄 → 화면 세 곳" right="S-103 · 개정 2026-10-02" className="op-mk up">
      <div className="mk-defrow">
        <b>S-103</b><span>가연성 가스 &gt; 10%LEL</span><span>1분 지속</span><span>해제 8%LEL</span><PriBadge p={2} label /><span>환경안전 담당</span>
      </div>
      <div className="mk-three">
        {['상황실 벽면', '현장 태블릿', '문자 알림'].map(w => (
          <div key={w}><small>{w}</small><b><PriBadge p={2} /> 화학물질 창고</b><span>12%LEL (기준 10) · S-103</span></div>
        ))}
      </div>
    </Hmi>
  )
}
function MkLogBefore() {
  return (
    <Hmi dark title="알람 목록" right={<span className="mk-red">미확인 2</span>} className="op-mk">
      <ul className="mk-rows">
        <li><span className="mk-red">■ 화재</span><span>도장 부스 연기 감지</span><button type="button" tabIndex={-1} aria-hidden="true">확인</button><button type="button" tabIndex={-1} aria-hidden="true">오경보</button></li>
        <li><span className="mk-red">■ 가스</span><span>화학물질 창고 12%</span><button type="button" tabIndex={-1} aria-hidden="true">확인</button><button type="button" tabIndex={-1} aria-hidden="true">오경보</button></li>
      </ul>
      <p className="mk-foot">버튼을 누르면 줄이 사라져요. 누가, 언제, 왜 눌렀는지 어디에도 남지 않아요</p>
    </Hmi>
  )
}
function MkLogAfter() {
  const L: [string, string, string][] = [
    ['14:02:08', '발생', '연기 감지기 2개 + 온도 급상승 (시스템)'],
    ['14:02:31', '확인', '상황실 당번 A · 23초 만에'],
    ['14:03:10', '대피 방송', '상황실 당번 A'],
    ['14:15:40', '진화', '자체 소방대'],
    ['14:40:02', '정상 복귀 확인', '현장 안전관리자 · “다시 불붙음 없음”'],
  ]
  return (
    <Hmi title="S-101 도장 부스 화재 · 조치 기록" right="수정·삭제 불가" className="op-mk up">
      <ol className="mk-tl">{L.map(([t, a, w]) => <li key={t}><time>{t}</time><b>{a}</b><span>{w}</span></li>)}</ol>
      <p className="mk-sub">‘오경보’는 이유(감지기 오작동 · 허가된 작업 · 시험)를 골라야 눌러져요</p>
    </Hmi>
  )
}
function MkSopBefore() {
  return (
    <Hmi dark title={<><span className="mk-red">■ 작업자 무응답</span> · 지하 밀폐공간</>} right="절차 열림" className="op-mk">
      <div className="mk-sop">
        <b>비상 대응 절차 (공통)</b>
        <ol><li>화재 경보 버튼을 눌러요</li><li>가까운 소화기 위치를 확인해요</li><li>구역 전원을 차단해요</li><li>소방서에 신고해요</li></ol>
      </div>
      <p className="mk-foot">모든 알람에 같은 ‘공통 절차’가 열려요. 쓰러진 사람을 구하는 내용이 없어요</p>
    </Hmi>
  )
}
function MkSopAfter() {
  return (
    <Hmi title={<>작업자 무응답 · 지하 밀폐공간</>} right="종류: 작업자 무응답 절차" className="op-mk up">
      <div className="mk-sop">
        <p><b>먼저</b> 감시인을 무전으로 불러 바로 확인해요.</p>
        <ol><li>산소·일산화탄소 값부터 봐요</li><li>값이 나쁘면 공기호흡기를 쓴 구조자만 들어가요</li><li>감시인 혼자 들어가지 않게 해요</li><li>119에 입구 위치를 알려요</li></ol>
      </div>
    </Hmi>
  )
}
function Mistakes() {
  return (
    <div className="op-cases">
      <CaseCard sev="치명" title="이벤트 정의서가 없어서, 같은 가스 누출이 화면마다 다른 기준·다른 우선순위로 떠요"
        before={<MkDefBefore />} after={<MkDefAfter />}
        now={<>기준값을 정한 문서가 없어요. 상황실 벽면, 현장 태블릿, 문자 알림을 서로 다른 사람이 만들면서 각자 코드에 기준을 적었어요. 같은 12%LEL이 한 곳에선 ‘경고’, 한 곳에선 ‘정상’, 한 곳에선 ‘긴급’이에요.</>}
        why={<>이건 디자인 문제가 아니라 기획이 빠진 거예요. 알람 관리 표준은 알람마다 기준·우선순위·대응을 한 곳에 정해 두라고 해요(합리화) <Cite n={1} />. 기준이 세 벌이면 근무자마다 다르게 판단해요. 사고가 나면 “어느 화면이 맞았나”부터 다투게 돼요.</>}
        fix={<>정의서를 <b>유일한 출처</b>로 만들어요. 화면·문자·보고서는 모두 정의서 ID(S-103)를 읽어 그려요. 화면 코드 안에 기준값을 따로 적지 않아요. 기준을 바꾸면 검토 기록(날짜·검토자·이유)을 남겨요.</>} />
      <CaseCard sev="높음" title="조치 이력이 남지 않아요 — ‘확인’을 누르면 알람이 그냥 사라져요"
        before={<MkLogBefore />} after={<MkLogAfter />}
        now={<>‘확인’과 ‘오경보’ 버튼이 줄을 지우기만 해요. 누가 언제 봤는지, 왜 오경보라고 했는지 남지 않아요. 교대할 때는 기억에 기대서 말로 전해요.</>}
        why={<>알람 관리 표준은 ‘미확인’과 ‘확인됨’을 다른 상태로 다뤄요 <Cite n={1} />. 기록이 없으면 ‘확인까지 걸린 시간’도, ‘오래 떠 있는 알람’ 같은 KPI도 잴 수 없어요 <Cite n={3} />. 사고 조사에서 “누가 언제 봤나”에 답할 수 없어요.</>}
        fix={<>확인·보류·오경보·정상 복귀 버튼은 모두 <b>누가·언제·왜</b>를 남겨요. 오경보는 이유를 골라야 눌러지게 해요. 기록은 고치거나 지울 수 없게 해요. 이 기록이 KPI와 인수인계의 재료가 돼요.</>} />
      <CaseCard sev="높음" title="대응 절차가 이벤트 종류와 안 맞아요 — 작업자 무응답에 화재 절차가 열려요"
        before={<MkSopBefore />} after={<MkSopAfter />}
        now={<>절차 화면은 있지만 모든 알람에 같은 ‘비상 대응 공통 절차’가 열려요. 밀폐공간에서 작업자가 응답이 없는데, 첫 줄은 “화재 경보 버튼을 눌러요”예요.</>}
        why={<>급할 때 사람은 첫 줄만 읽어요 <Cite n={6} />. 첫 행동이 틀리면 가장 귀한 몇 분을 잃어요. 사고 대응의 공통 순서에도 ‘2차 피해 방지’가 따로 있어요. 밀폐공간 구조는 그 단계가 첫 줄에 와야 해요.</>}
        fix={<>절차를 <b>이벤트 종류마다</b> 하나씩 만들어요(화재, 가스, 작업자 무응답 …). 정의서에 절차 이름을 적고, 연결이 비어 있으면 정의서를 저장할 수 없게 해요. 아래 ‘대응 절차 카드’가 그렇게 연결돼 있어요.</>} />
      <CaseCard good sev="보통" title="센서가 보내는 주기의 3배 동안 소식이 없으면 ‘연결 안 됨’으로 정해 둬요"
        now={<>정의서에 ‘통신’ 줄을 따로 둬요. 가스 센서는 10초마다 값을 보내요. 그래서 30초 동안 소식이 없으면 ‘연결 안 됨’ 이벤트(우선순위 3)를 만들어요. 화면에서는 그 센서값을 회색과 빗금으로 바꿔요.</>}
        why={<>한 번만 놓쳐도 끊김으로 보면 헛울림이 많아요. 너무 오래 기다리면 멈춘 값을 정상으로 믿게 돼요. 센서마다 ‘보내는 주기’를 기준으로 정하면 어느 센서에나 같은 규칙을 쓸 수 있어요 <Cite n={6} />.</>}
        fix={<>정의서에 ‘수집 주기’ 칸을 더해요. 웨어러블(1초), 진동 센서(1분)처럼 주기가 달라도 같은 규칙으로 판정해요. 화면 05 탭의 ‘신선도’ 표시와 같은 기준을 써요.</>} />
    </div>
  )
}

/* ================= 1. 화면보다 먼저 정할 것 ================= */
const ARTS: { n: string; who: string; when: string; out: string; d: string; to: string }[] = [
  { n: '안전 이벤트 정의서', who: '기획 · 안전관리자 · 설비 담당', when: '화면 설계 전, 그리고 분기마다', out: '.csv / .md', d: '이벤트마다 한 줄씩 정해요. 언제 울리는지, 왜 그 우선순위인지, 울리면 누가 무엇을 하는지예요(알람 합리화).', to: 'dash-ops-def' },
  { n: '대응 절차 카드', who: '상황실 근무자 · 현장 안전관리자', when: '이벤트를 정의할 때 같이', out: '이벤트 종류마다 1장', d: '알람을 누르면 바로 열리는 짧은 행동 순서예요. 정의서의 ‘대응’ 칸을 자세히 풀어 쓴 것이에요.', to: 'dash-ops-sop' },
  { n: '교대 인수인계 · 일일 점검', who: '교대하는 두 근무자', when: '매 교대', out: '화면 + 기록', d: '진행 중인 일, 잠시 꺼 둔(보류한) 알람, 점검으로 뺀 센서를 다음 근무자가 하나씩 확인해요. 감지기·CCTV가 살아 있는지도 점검해요.', to: 'dash-ops-handover' },
  { n: '알람 KPI', who: '운영 책임자 · 기획', when: '매주 · 매월', out: '대시보드', d: '알람이 너무 많지 않은지, 한꺼번에 쏟아진 적은 없는지, 계속 떠 있는 알람은 없는지 숫자로 재요. 그 결과를 보고 정의서를 고쳐요.', to: 'dash-ops-kpi' },
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
  { id: 'severe', n: '심각', d: '사람이 크게 다치거나 화재·폭발로 번질 수 있음' },
  { id: 'major', n: '중대', d: '다칠 수 있음, 설비 손상이나 작업 중단' },
  { id: 'minor', n: '경미', d: '바로 다칠 위험은 없음, 규칙 위반·성능 저하' },
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
          <><PriBadge p={p} label size={24} /><p>결과가 <b>{SEV_N[sev]}</b>하고 손쓸 시간이 <b>{TM_N[tm]}</b> 남았으면 우선순위 {p}예요. 대응 목표는 <b>{PRI[p].respond}</b>예요.</p></>
        ) : (
          <><span className="op-noalarm">알람 아님</span><p>운영자가 할 일이 없으면 알람으로 울리지 않아요. <b><Term k="기록용 이벤트" d="근무자가 할 일은 없지만 기록으로 남겨 두는 일이에요. 예: 허가받은 작업자가 출입 게이트를 지나감.">기록용 이벤트</Term></b>로 남기고, 필요하면 보고서에서 봐요. 출입 게이트 통과처럼 ‘알면 좋은 것’까지 알람 목록에 올라오면, 진짜 알람이 그 사이에 묻혀요.</p></>
        )}
      </div>
    </div>
  )
}

/* ================= 3. 알람 정의서 ================= */
interface Def { id: string; where: string; what: string; cond: string; delay: string; db: string; sev: Sev; tm: Tm; cause: string; check: string; action: string; owner: string }
const DEF_EXTRA: Record<string, Omit<Def, 'id' | 'where' | 'what' | 'action'>> = {
  'S-101': { cond: '연기 감지기 2개 이상 동시 감지, 또는 온도가 1분에 8℃ 넘게 오름', delay: '없음(즉시)', db: '해당 없음', sev: 'severe', tm: 'short', cause: '도료·용제에 불이 붙음, 전기 합선', check: 'CCTV 영상, 주변 감지기, 구역 온도 추세', owner: '상황실 당번 · 자체 소방대' },
  'S-102': { cond: '웨어러블 움직임 없음 + 호출에 응답 없음', delay: '30초', db: '해당 없음', sev: 'severe', tm: 'short', cause: '산소 부족·유해가스 흡입, 넘어짐', check: '감시인 무전, 산소·일산화탄소 센서값', owner: '밀폐공간 감시인 · 상황실 당번' },
  'S-103': { cond: '가연성 가스 > 10%LEL', delay: '1분 지속', db: '2%LEL (8%LEL 아래로 내려가야 해제)', sev: 'major', tm: 'mid', cause: '용기·배관 누출, 환기 장치 멈춤', check: '가스 추세, 환기 장치 상태, 옆 센서값', owner: '환경안전 담당' },
  'S-104': { cond: '크레인 인양 중 + 위치 태그가 작업 반경 안', delay: '5초', db: '반경 밖 2m', sev: 'severe', tm: 'short', cause: '신호수 자리 비움, 통로 표시가 지워짐', check: 'CCTV, 크레인 인양 상태', owner: '크레인 신호수 · 현장 안전관리자' },
  'S-105': { cond: 'CCTV 감지: 안전모 없음', delay: '10초 지속', db: '해당 없음', sev: 'minor', tm: 'long', cause: '착용 습관, 더운 날씨', check: 'CCTV 영상으로 사람이 확인', owner: '구역 반장' },
  'S-106': { cond: '진동 > 4.5mm/s', delay: '5분 지속', db: '0.5mm/s', sev: 'minor', tm: 'long', cause: '베어링 마모, 고정 볼트 풀림', check: '진동·모터 온도 추세', owner: '설비팀' },
}
const seedDefs = (): Def[] => SAFE_ALARMS.map(a => ({ id: a.id, where: a.where, what: a.what, action: a.action, ...DEF_EXTRA[a.id] }))
const COLS: [keyof Def, string][] = [['id', '이벤트 ID'], ['where', '위치'], ['what', '이벤트 내용'], ['cond', '조건(기준값)'], ['delay', '지속 시간'], ['db', '히스테리시스'], ['sev', '결과 심각도'], ['tm', '대응 가능 시간'], ['cause', '원인'], ['check', '확인 방법'], ['action', '대응'], ['owner', '담당']]
const show = (d: Def, k: keyof Def) => (k === 'sev' ? SEV_N[d.sev] : k === 'tm' ? TM_N[d.tm] : String(d[k]))
function defsCSV(ds: Def[]) { return toCSV([[...COLS.map(c => c[1]), '우선순위'], ...ds.map(d => [...COLS.map(([k]) => show(d, k)), `${MX[d.sev][d.tm]} ${PRI[MX[d.sev][d.tm]].name}`])]) }
function defsMD(ds: Def[]) {
  const L = [`# ${SAFE_CENTER} 안전 이벤트 정의서 (예시)`, '', '> 우선순위는 두 질문으로 정해요. 결과가 얼마나 심각한가(결과 심각도), 손쓸 시간이 얼마나 남았나(대응 가능 시간). 근무자가 할 일이 없으면 알람이 아니라 기록용 이벤트예요.', '> 모든 기준값은 설명용 가상 값이에요. 실제 기준은 사업장의 위험성 평가와 법정 기준을 따라요.', '']
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
    setDs(a => [...a, { id: `S-${100 + n}`, where: '', what: '', cond: '', delay: '', db: '', sev: 'minor', tm: 'long', cause: '', check: '', action: '', owner: '' }])
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
              <thead><tr><th>이벤트</th><th>조건</th><th>우선순위</th></tr></thead>
              <tbody>
                {ds.map((x, i) => (
                  <tr key={i} className={i === sel ? 'on' : ''}>
                    <td><button type="button" className="op-def-pick" aria-pressed={i === sel} onClick={() => setSel(i)}><b>{x.id}</b> {x.where || '(위치 미정)'}<small>{x.what || '이벤트 내용을 적어요'}</small></button></td>
                    <td>{x.cond}{x.delay && <small> · {x.delay}</small>}</td>
                    <td><PriBadge p={MX[x.sev][x.tm]} label /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="op-row">
            <button type="button" className="btn sm ghost" onClick={add}>+ 이벤트 추가</button>
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
            <small>막대 위 세로 눈금은 보고된 권장 비율이에요(주의 80 · 높음 15 · 긴급 5%) <Cite n={3} />. 예시는 이벤트가 6개뿐이라 안 맞는 게 당연해요. 수백 개 쌓였을 때 비교해요.</small>
          </div>
        </div>
        <div className="op-def-form">
          <div className="op-def-head"><b>{d.id}</b><PriBadge p={p} label /><span className="muted">대응 {PRI[p].respond}</span></div>
          <div className="op-fs">
            {fld('where', '위치', '예: 제2공장 · 화학물질 창고')}
            {fld('what', '이벤트 내용', '예: 가연성 가스 12%LEL')}
            {fld('cond', '조건(기준값)', '예: 가연성 가스 > 10%LEL')}
            {fld('delay', '지속 시간(켜짐 지연)', '예: 1분 지속')}
            {fld('db', '히스테리시스(해제 여유)', '예: 2%LEL')}
            <label className="op-f"><span>결과 심각도</span>
              <select value={d.sev} onChange={e => set('sev', e.target.value)}>{SEV.map(s => <option key={s.id} value={s.id}>{s.n} — {s.d}</option>)}</select>
            </label>
            <label className="op-f"><span>대응 가능 시간</span>
              <select value={d.tm} onChange={e => set('tm', e.target.value)}>{TM.map(s => <option key={s.id} value={s.id}>{s.n} — {s.d}</option>)}</select>
            </label>
            {fld('cause', '예상 원인', '예: 배관 누출')}
            {fld('check', '확인 방법', '예: 가스 추세, 환기 장치 상태')}
            {fld('action', '대응(무엇을 할지)', '“~해요”처럼 행동으로 끝나게', true)}
            {fld('owner', '담당', '예: 환경안전 담당')}
          </div>
        </div>
      </div>
      <div className="op-row">
        <span className="muted">입력한 내용 그대로 내려받아요. CSV는 엑셀에서 열어도 한글이 깨지지 않게 저장했어요(UTF-8 BOM).</span>
        <span className="op-grow" />
        <Dl name="안전이벤트정의서.csv" text={defsCSV(ds)} type="text/csv;charset=utf-8">CSV 내려받기</Dl>
        <Dl name="안전이벤트정의서.md" text={defsMD(ds)} type="text/markdown;charset=utf-8">마크다운 내려받기</Dl>
        <Dl name="안전이벤트정의서.json" text={JSON.stringify(ds.map(x => ({ ...x, priority: MX[x.sev][x.tm] })), null, 2)} type="application/json" ghost={false}>JSON 내려받기</Dl>
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
    drift = drift * 0.82 + (r() - 0.5) * 0.85
    return +(8.9 + Math.sin((i / DB_N) * Math.PI * 2.1 - 0.6) * 1.25 + drift).toFixed(2)
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
  const [sp, setSp] = useState(10)
  const [db, setDb] = useState(0)
  const [dl, setDl] = useState(0) // 분
  const spans = runAlarm(DB_DATA, sp, db, dl * 2)
  const raw = runAlarm(DB_DATA, sp, 0, 0).length
  const w = 1000, h = 230, lo = 5, hi = 13
  const x = (i: number) => 36 + (i / (DB_N - 1)) * (w - 46)
  const y = (v: number) => 12 + (1 - (v - lo) / (hi - lo)) * (h - 40)
  const path = DB_DATA.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const shortest = spans.length ? Math.min(...spans.map(s => s[1] - s[0])) / 2 : 0
  return (
    <div className="op-db">
      <div className="op-db-ctl">
        <div className="op-sl"><div><span>기준값</span><b>{sp}%LEL</b></div><Range value={sp} min={8} max={12} step={0.5} onChange={setSp} label="기준값" /></div>
        <div className="op-sl"><div><span>히스테리시스(해제 여유)</span><b>{db}%LEL</b></div><Range value={db} min={0} max={3} step={0.5} onChange={setDb} label="히스테리시스" /></div>
        <div className="op-sl"><div><span>지속 시간(켜짐 지연)</span><b>{dl}분</b></div><Range value={dl} min={0} max={10} onChange={setDl} label="지속 시간" /></div>
      </div>
      <Hmi title="화학물질 창고 가연성 가스 · 2시간 (가상)" right={<>알람 <b className={'op-db-n' + (spans.length > 3 ? ' bad' : '')}>{spans.length}번</b> 울림</>}>
        <div className="op-scroll">
          <svg viewBox={`0 0 ${w} ${h}`} className="op-db-svg" role="img" aria-label={`2시간 동안 알람 ${spans.length}번. 기준값만 쓰면 ${raw}번.`}>
            {[6, 8, 10, 12].map(v => <g key={v}><line className="grid" x1={36} x2={w - 10} y1={y(v)} y2={y(v)} /><text className="ax" x={30} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
            {spans.map(([a, b], i) => <rect key={i} className="on-span" x={x(a)} y={8} width={Math.max(2, x(b) - x(a))} height={h - 32} />)}
            {db > 0 && <rect className="band" x={36} width={w - 46} y={y(sp)} height={y(sp - db) - y(sp)} />}
            <line className="sp" x1={36} x2={w - 10} y1={y(sp)} y2={y(sp)} />
            {db > 0 && <line className="sp off" x1={36} x2={w - 10} y1={y(sp - db)} y2={y(sp - db)} />}
            <path className="ln" d={path} />
            {spans.map(([a], i) => <path key={'m' + i} className="mk" d={`M${x(a)} 6 l5 8 h-10z`} />)}
            {['0분', '30분', '60분', '90분', '120분'].map((t, i) => <text key={t} className="ax" x={36 + (i / 4) * (w - 46)} y={h - 6} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{t}</text>)}
          </svg>
        </div>
        <div className="op-db-leg"><span><i className="l" />가연성 가스(%LEL)</span><span><i className="sp" />기준값(켜짐)</span>{db > 0 && <span><i className="sp off" />해제 기준(꺼짐)</span>}<span><i className="on" />알람 켜진 구간</span></div>
      </Hmi>
      <p className="op-db-sum" aria-live="polite">
        기준값만 쓰면 2시간 동안 알람이 <b>{raw}번</b> 켜졌다 꺼져요. 이렇게 깜빡이듯 반복하는 걸 <Term k="채터링" d="알람이 기준값 근처에서 짧게 켜졌다 꺼졌다를 반복하는 것이에요. 고장 난 형광등이 깜빡이는 것과 비슷해요." />이라고 해요. 지금 설정으로는 <b>{spans.length}번</b>
        {spans.length > 0 && <>, 가장 짧은 알람은 <b>{shortest}분</b></>}이에요. 히스테리시스 2%LEL과 지속 시간 1~2분만 줘도, 같은 상황을 알람 몇 번으로 줄일 수 있어요.
      </p>
    </div>
  )
}

/* ================= 5. 대응 절차 카드 ================= */
type Step = string | { q: string; yes: string; no: string }
/** 대응 절차는 이벤트 '종류'마다 하나씩 — 알람 ID가 아니라 SAFE_EVENT 종류로 연결해요 */
const SOP: Record<string, { first: string; steps: Step[]; who: string; link?: [string, string] }> = {
  fire: { first: 'CCTV로 연기·불꽃을 눈으로 확인해요.', who: '자체 소방대 · 현장 안전관리자 · 119', link: ['#/dash/map', '대피 경로 보기 (06 탭)'], steps: [
    '그 구역 작업을 멈추고 대피 방송을 내보내요.',
    { q: 'CCTV에 불꽃이나 짙은 연기가 보이나요?', yes: '119에 신고하고 자체 소방대를 출동시켜요.', no: '자체 소방대에 현장 확인을 요청해요. 감지기 오작동인지 2분 안에 판단해요.' },
    '옆 구역 사이 방화문이 닫혔는지 확인해요.',
    '집결지 인원과 출입 기록을 맞춰 봐요.',
    { q: '확인되지 않은 사람이 있나요?', yes: '위치 태그의 마지막 위치를 소방대에 전달해요.', no: '인원 확인 완료를 기록하고 감독자에게 보고해요.' },
    '조치 시각과 내용을 기록해요.',
  ] },
  down: { first: '감시인을 무전으로 불러 바로 확인해요.', who: '밀폐공간 감시인 · 현장 안전관리자 · 119', steps: [
    '감시인에게 작업자 상태를 확인해요.',
    { q: '산소·일산화탄소 센서값이 정상인가요?', yes: '구조 장비를 들고 2명 이상 함께 들어가요.', no: '공기호흡기를 쓴 구조자만 들어가요. 감시인 혼자 들어가지 않게 해요.' },
    '119에 신고하고 들어갈 입구 위치를 알려요.',
    '구조한 시각과 작업자 상태를 기록해요.',
  ] },
  gas: { first: '오르는 중인지, 멈췄는지 추세부터 봐요.', who: '환경안전 담당', steps: [
    '최근 30분 가스 추세와 옆 센서값을 확인해요.',
    '환기 장치가 돌고 있는지 확인해요.',
    { q: '경보 기준(25%LEL)에 가까워지고 있나요?', yes: '창고 출입을 막고 안에 있는 사람을 내보내요.', no: '누출 점검을 요청하고 15분간 지켜봐요.' },
    '조치 내용을 기록해요.',
  ] },
  zone: { first: '크레인 신호수에게 바로 정지를 요청해요.', who: '크레인 신호수 · 현장 안전관리자', steps: [
    '무전으로 인양 정지를 요청해요.',
    'CCTV로 작업자가 반경 밖으로 나갔는지 확인해요.',
    { q: '신호수가 자리에 있었나요?', yes: '통로 표시와 출입 통제선을 점검해요.', no: '신호수를 다시 배치할 때까지 인양을 멈춰요.' },
    '기록하고 현장 안전관리자에게 보고해요.',
  ] },
  ppe: { first: 'CCTV 영상으로 사람이 직접 확인해요.', who: '구역 반장', steps: [
    'CCTV 영상으로 감지가 맞는지 확인해요.',
    { q: '정말 안전모를 쓰지 않았나요?', yes: '구역 반장에게 알려 착용하게 해요.', no: '오감지로 표시하고 이유를 적어요. 감지 기준을 고칠 때 써요.' },
    '기록해요.',
  ] },
  equip: { first: '진동이 계속 오르는지 추세부터 봐요.', who: '설비팀', steps: [
    '진동과 모터 온도 추세를 확인해요.',
    { q: '경보 기준(7mm/s)에 가까워지고 있나요?', yes: '설비를 멈추고 설비팀에 점검을 요청해요.', no: '설비팀에 점검을 예약하고 교대 인수인계에 적어요.' },
    '조치 내용을 기록해요.',
  ] },
}
function SopCards() {
  const [id, setId] = useState('S-101')
  const [done, setDone] = useState<Record<string, boolean[]>>({})
  const [br, setBr] = useState<Record<string, ('yes' | 'no' | undefined)[]>>({})
  const a = SAFE_ALARMS.find(x => x.id === id)!, s = SOP[a.type]
  const dn = done[id] ?? [], bb = br[id] ?? []
  const n = s.steps.filter((_, i) => dn[i]).length
  const tick = (i: number) => setDone(o => ({ ...o, [id]: s.steps.map((_, j) => (j === i ? !dn[j] : !!dn[j])) }))
  const pick = (i: number, v: 'yes' | 'no') => { setBr(o => ({ ...o, [id]: s.steps.map((_, j) => (j === i ? v : bb[j])) })); if (!dn[i]) tick(i) }
  return (
    <div className="op-sop">
      <Hmi title="알람 목록" right={`${SAFE_ALARMS.length}건`} className="op-sop-list">
        <ul>
          {SAFE_ALARMS.map(x => (
            <li key={x.id}><button type="button" className={'op-sop-a' + (x.id === id ? ' on' : '')} aria-pressed={x.id === id} onClick={() => setId(x.id)}>
              <PriBadge p={x.pri} /><span><b>{x.where}</b><small>{x.what}</small></span><i aria-hidden="true">절차 ›</i>
            </button></li>
          ))}
        </ul>
      </Hmi>
      <article className="op-card" aria-live="polite" aria-label={`${a.id} 대응 절차`}>
        <header>
          <div className="op-card-top"><PriBadge p={a.pri} label /><span className="muted">{a.id} · 대응 {PRI[a.pri].respond}</span><span className="op-kind">종류: {SAFE_EVENT[a.type].name} 절차</span></div>
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
          <span className="muted">{n}/{s.steps.length} · 개정 2026-10-02 · 승인 안전보건 책임자 (가상)</span>
        </footer>
      </article>
    </div>
  )
}

/* ================= 6. 교대 인수인계 ================= */
interface HoItem { id: string; kind: '진행 중' | '보류' | '서비스 제외'; pri?: Pri; t: string; d: string }
const HO_ITEMS: HoItem[] = [
  { id: 'h1', kind: '진행 중', pri: 1, t: '제2공장 도장 부스 화재 — 진화 후 감시 중', d: '14:02 화재, 14:15 진화. 다시 불이 붙는지 소방대 1명이 지켜보는 중. 도장 부스 출입 금지 유지, 19:00 다시 점검.' },
  { id: 'h2', kind: '진행 중', pri: 2, t: '화학물질 창고 가연성 가스 12%LEL', d: '환기 장치를 켠 뒤 9%LEL까지 내려옴. 누출 점검은 내일 오전. 경보 기준 25%LEL보다는 낮음. 저녁에 다시 확인.' },
  { id: 'h3', kind: '보류', pri: 3, t: '물류센터 상하차장 CCTV-3 보호구 감지 — 보류', d: '렌즈에 이슬이 맺혀 잘못 감지하는 일이 잦음(작업 요청 #1108). 18:00에 보류를 풀 예정. 푼 뒤에도 잦으면 설비팀에 연락.' },
  { id: 'h4', kind: '서비스 제외', pri: 3, t: '신축 현장 지하 밀폐공간 산소 센서 #2 — 서비스 제외', d: '교정 중(내일 오전 복귀). 그동안 작업 전에 휴대용 측정기로 재고 기록함.' },
]
function Handover() {
  const [from, setFrom] = useState('주간 당번 A')
  const [to, setTo] = useState('야간 당번 B')
  const [ok, setOk] = useState<Record<string, boolean>>({})
  const [memo, setMemo] = useState('내일 09:00 신축 현장 타워크레인 정기 점검. 크레인 반경 출입 통제(현장 안전관리자 승인 완료).')
  const [signed, setSigned] = useState(false)
  const all = HO_ITEMS.every(x => ok[x.id])
  const md = useMemo(() => {
    const L = [`# 교대 인수인계 — ${SAFE_CENTER}`, '', `- 교대: 주간 → 야간 (18:00)`, `- 인계: ${from} / 인수: ${to}`, '']
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
          <li><b>말로만 넘기지 않아요.</b> 보류한 알람과 서비스 제외 센서는 화면에서 울리지 않아요. 적어 두지 않으면 다음 사람은 그런 게 있는지조차 몰라요.</li>
          <li><b>받는 사람이 하나씩 체크해요.</b> 넘기는 사람(인계자)이 ‘다 말했다’로 끝내지 않아요. 받는 사람(인수자)이 ‘다 들었다’를 직접 확인해요. 모두 체크해야 인수 버튼이 켜져요.</li>
          <li><b>보류할 땐 다시 켤 시각을 적어요.</b> 알람 관리 표준 ISA-18.2에서 보류(shelved)는 운영자가 알람을 잠깐 꺼 둔 상태예요 <Cite n={1} />. 끝나는 시각이 없으면 아무도 기억하지 못하는 알람이 돼요.</li>
          <li><b>기록으로 남겨요.</b> 다음 교대 근무자, 사고 조사, 알람 KPI가 모두 이 기록을 봐요.</li>
          <li><b>이름 대신 역할로 적어요.</b> 화면과 기록에는 ‘야간 당번 B’처럼 역할을 써요. 연락처는 권한이 있는 사람만 열어 봐요.</li>
        </ul>
        <div className="op-row">
          <Dl name="교대인수인계.md" text={md} type="text/markdown;charset=utf-8" ghost={false}>인수인계 템플릿 내려받기(.md)</Dl>
        </div>
      </div>
    </div>
  )
}

/* ================= 6-1. 일일 안전 점검 ================= */
const DAILY: [string, string][] = [
  ['화재 감지기 통신', '끊긴 감지기가 0개인지 봐요. 있으면 위치와 이유를 적어요.'],
  ['가스 센서 값 품질', '‘불확실’ 표시가 0개인지 봐요. 멈춘 센서는 안전해 보여요.'],
  ['CCTV 화면', '꺼진 화면이 없는지, 녹화 중 표시가 맞는지 봐요.'],
  ['웨어러블 착용', '오늘 출입한 인원과 웨어러블을 켠 인원이 같은지 봐요.'],
  ['비상 방송', '시험 방송을 한 번 내보내고 현장에서 들렸는지 확인해요.'],
  ['대피 경로 표시', '공사·자재 적치로 막힌 길이 지도에 반영됐는지 봐요.'],
  ['보류 · 서비스 제외 목록', '다시 켤 시각이 지났는데 아직 꺼진 것이 없는지 봐요.'],
]
function DailyCheck() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const n = DAILY.filter(([t]) => on[t]).length
  const md = useMemo(() => [`# 일일 안전 점검 — ${SAFE_CENTER}`, '', '- 날짜: ', '- 점검자(역할): ', '', ...DAILY.map(([t, d]) => `- [${on[t] ? 'x' : ' '}] **${t}** — ${d}`), '', '## 이상 내용', '', '| 항목 | 내용 | 조치 | 담당 |', '|---|---|---|---|', '| | | | |'].join('\n'), [on])
  return (
    <div className="op-daily">
      <b>교대 시작 5분 — 일일 안전 점검 <small>{n}/{DAILY.length}</small></b>
      <ul>
        {DAILY.map(([t, d]) => (
          <li key={t}><label><input type="checkbox" checked={!!on[t]} onChange={() => setOn(o => ({ ...o, [t]: !o[t] }))} /><span><b>{t}</b><small>{d}</small></span></label></li>
        ))}
      </ul>
      <div className="op-row"><Dl name="일일안전점검.md" text={md} type="text/markdown;charset=utf-8">점검표 내려받기(.md)</Dl></div>
    </div>
  )
}

/* ================= 7. 알람 KPI ================= */
interface Tag { n: string; pre: number; post: number; pPre: Pri; pPost: Pri }
const TAGS: Tag[] = [
  { n: '상하차장 안전모 미착용', pre: 0.9, post: 0.06, pPre: 1, pPost: 3 },
  { n: '지게차 통로 위험구역 접근', pre: 0.6, post: 0.05, pPre: 2, pPost: 2 },
  { n: '프레스 라인 3호기 진동', pre: 0.5, post: 0.03, pPre: 2, pPost: 3 },
  { n: '출입 게이트 통과', pre: 0.35, post: 0, pPre: 2, pPost: 3 },
  { n: '고층 랙 구역 보호구 미착용', pre: 0.3, post: 0.05, pPre: 1, pPost: 3 },
  { n: '도장 부스 온도 높음', pre: 0.2, post: 0.04, pPre: 1, pPost: 2 },
  { n: '타워크레인 반경 접근', pre: 0.15, post: 0.02, pPre: 2, pPost: 1 },
  ...['상하차장 일산화탄소', '화학물질 창고 가스 센서 통신', 'CCTV-7 영상 끊김', '고소작업 구역 안전대 미체결', '프레스 라인 모터 온도', '지하 밀폐공간 산소 낮음', '물류센터 출입문 열림', '도장 부스 배기팬 정지', '웨어러블 배터리 낮음', '고층 랙 구역 접근', '신축 현장 CCTV-2 영상 끊김', '프레스 라인 1호기 진동', '상하차장 보호조끼 미착용', '타워크레인 풍속 높음', '화학물질 창고 출입', '지게차 과속', '도장 부스 가스 센서 통신']
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
    { n: '운영자 1명이 10분에 받는 알람', v: k.per10.toFixed(1) + '개', target: '약 1개', ok: k.per10 <= 1.2, sub: `시간당 ${k.perHour.toFixed(1)}개 · 일주일 ${k.total.toLocaleString('ko-KR')}개` },
    { n: '폭주 구간 비율', v: k.floodPct.toFixed(1) + '%', target: '1% 미만', ok: k.floodPct < 1, sub: `10분에 10개 넘은 칸 ${k.flood}개 / 1,008칸` },
    { n: '오래 떠 있는 알람', v: k.stale + '개', target: '하루 5개 미만', ok: k.stale < 5, sub: '24시간 넘게 꺼지지 않은 알람' },
    { n: '긴급(1) 비율', v: k.dist[0].pct + '%', target: '약 5%', ok: k.dist[0].pct <= 8, sub: k.dist.map(d => `${PRI[d.p].name} ${d.pct}%`).join(' · ') },
  ]
  let cum = 0
  return (
    <div className="op-kpi">
      <div className="op-row">
        <Seg value={after ? 'a' : 'b'} onChange={v => setAfter(v === 'a')} options={[['b', '합리화 전'], ['a', '합리화 후']]} />
        <span className="muted">같은 일주일을 두 번 계산했어요. 알람 정의를 고치기 전과 고친 후예요(가상 기록).</span>
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
          <small className="muted">오른쪽 끝 숫자는 1위부터 그 줄까지 더한 비율(누적)이에요. 화재 한 건에서 줄줄이 쏟아진 연쇄 알람(폭주)은 뺐어요.</small>
        </figure>
      </div>
    </div>
  )
}

/* ================= 8. 인터뷰 · 섀도잉 ================= */
const QS: { g: string; items: [string, string][] }[] = [
  { g: '평소 업무', items: [
    ['근무 중 가장 오래 띄워 두는 화면은 무엇인가요?', '평소 가장 오래 보는 주 작업 화면(레벨 2, 현장 단위)을 정할 단서예요.'],
    ['아무 일 없을 때 화면에서 무엇을 확인하나요?', '“지금 별일 없다”를 확인하는 데 꼭 필요한 정보가 무엇인지 알아내요.'],
    ['화면을 몇 번, 어떤 순서로 바꾸나요?', '자주 오가는 화면은 한 번에 갈 수 있게 만들어요.'],
  ] },
  { g: '이상 상황', items: [
    ['최근 가장 힘들었던 상황을 처음부터 이야기해 주세요.', '“보통은요” 같은 일반론보다 실제 사례가 더 정확해요.'],
    ['그때 무엇을 보고 ‘이상하다’고 알았나요?', '이상을 ‘알아챈’ 단서예요(상황 인식 1단계, 보기).'],
    ['필요한 정보를 어디서 찾았나요? 화면 밖(전화, 종이)도요.', '화면에 없어서 따로 찾아보는 정보를 알아내요.'],
  ] },
  { g: '알람', items: [
    ['무시해도 되는 알람이 있나요? 왜 그런가요?', '정리(합리화)할 1순위 후보예요.'],
    ['울리면 바로 일어나는 알람은 무엇인가요?', '진짜 긴급한 알람이 무엇인지 기준을 알아내요.'],
    ['화재 한 건에 알람이 줄줄이 뜬 적이 있나요?', '연기 감지기·CCTV·가스·출입 이벤트가 한꺼번에 뜨면, 원인 하나만 남기고 나머지는 묶을(억제) 대상이에요.'],
  ] },
  { g: '교대 · 환경', items: [
    ['교대할 때 말로만 전하는 것이 있나요?', '인수인계 화면에 넣을 항목이에요.'],
    ['사고가 나면 사람 수는 어떻게 세나요? 종이 명단인가요?', '집결지 인원과 출입 기록을 맞춰 보는 화면이 필요한지 알려 줘요(06 탭).'],
    ['벽면 큰 화면은 누가, 언제 보나요?', '전체 현황 화면(레벨 1)을 실제로 어떻게 쓰는지 확인해요.'],
    ['야간엔 조명을 어떻게 하나요?', '어두운 화면과 밝은 화면 중 무엇을 쓸지 정하는 근거예요(07 탭).'],
  ] },
]
function Interview() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const md = useMemo(() => {
    const L = ['# 안전관리 상황실 근무자 인터뷰 질문지', '', '- 대상: ', '- 날짜: ', '- 진행: ', '']
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
              <tr><td>14:02</td><td>알람 목록</td><td>소리 끄고 도장 부스 화재 알람 확인</td><td>“거기 몇 명 있었지?” — 구역 인원이 목록에 없음</td></tr>
              <tr><td>14:03</td><td>CCTV → 현장 지도</td><td>연기 확인 뒤 대피 방송</td><td>지도로 넘어가자 선택이 풀려서 구역을 다시 찾음</td></tr>
              <tr><td>14:08</td><td>종이 명단</td><td>집결지 인원과 출입 기록 맞춰 보기</td><td>출입 기록이 화면에 없음 → 인원 확인 화면 후보</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="op-row">
        <span className="muted">고른 질문 {n}/{tot}. 고른 질문은 체크된 채로 내려받아져요.</span>
        <span className="op-grow" />
        <Dl name="상황실_인터뷰_질문지.md" text={md} type="text/markdown;charset=utf-8" ghost={false}>질문지 + 기록지 내려받기(.md)</Dl>
      </div>
    </div>
  )
}

/* ================= 탭 ================= */
const LINKS: [string, string, string][] = [
  ['#/plan/prd', '기획 01 · 문제 정의 · PRD', '이벤트 정의서의 각 줄은 인수 조건으로 바꿔 쓸 수 있어요.'],
  ['#/plan/policy', '기획 04 · 정책 · 예외', '상태 다이어그램 그리는 법을 알람 상태(미확인·확인·보류)에 그대로 써요.'],
  ['#/plan/collab', '기획 08 · 협업 · 소통', '요구사항 받는 법과 회의록 쓰는 법을 운영자 인터뷰 정리에 써요.'],
  ['#/plan/metrics', '기획 06 · 지표 · 데이터', '지표 정의서 쓰는 법을 알람 KPI를 정할 때 써요.'],
  ['#/plan/qa', '기획 09 · QA · 출시', '출시 체크리스트에 알람 테스트(일부러 울려 보기)를 넣어요.'],
  ['#/dash/alarm', '관제 03 · 알람 설계', '알람 상태, 알람 폭주 시뮬레이션, 좋은 알람 문구를 다뤄요.'],
]

const EXTRA: Record<string, string> = {
  '안전 이벤트 정의서': '화재·가스·위험구역 접근 같은 이벤트마다 조건, 지속 시간, 우선순위, 대응, 담당을 한 줄씩 적은 표예요. 알람 정의서라고도 해요.',
  '%LEL': '불이 붙을 수 있는 가장 낮은 가스 농도를 100으로 볼 때 지금 농도예요. 10%LEL이면 그 최저 농도의 10분의 1이에요.',
  '감시인': '밀폐공간처럼 위험한 곳에서 작업할 때, 들어가지 않고 밖에서 작업자를 계속 지켜보는 사람이에요.',
  '일일 안전 점검': '교대를 시작할 때 감지기·CCTV·방송이 제대로 살아 있는지 확인하는 짧은 점검이에요.',
}

export default function Tab() {
  return (
    <div data-dash="ops">
      <TermList keys={['운영자', '우선순위', '알람 합리화', '대응 절차', '인수인계', '보류', '서비스 제외', '히스테리시스', '지속 시간', '알람 폭주', '알람 피로', 'KPI', '상황 인식']} extra={EXTRA} />
      <SysGrid>
        <Section id="dash-ops-why" wide title="화면보다 먼저 정해야 할 네 가지"
          gist="좋은 안전관리 화면은 그리기 전에 정한 네 가지 문서에서 나와요."
          desc={<>좋은 안전관리 화면은 대부분 그리기 전에 결정돼요. 정할 것은 네 가지예요. 어떤 이벤트가 왜 울리나, 울리면 누가 무엇을 하나, 교대 때 무엇을 넘기나, 잘 되고 있는지 어떻게 재나.</>}>
          <Cycle />
          <Finding src={<>ANSI/ISA-18.2 알람의 정의 — 한국어 요약 <Cite n={1} /></>}>
            알람은 <Term k="운영자" />가 무언가 해야 하는 비정상 상태를 알리는 신호예요. 설비가 고장 났거나 공정이 정상 범위를 벗어난 경우가 그래요. 할 일이 없으면 알람이 아니에요.
          </Finding>
          <Note>이 탭의 이벤트·절차·역할·기록은 모두 <b>가상의 가람산업 {SAFE_CENTER}</b> 예시예요. 기준값과 시간은 설명용이에요. 법정 기준이나 실제 설비 기준이 아니에요.</Note>
        </Section>

        <Section id="dash-ops-mistakes" wide title="흔한 실수 — 화면은 있는데 ‘누가, 언제, 무엇을’이 없어요"
          gist="정의서·이력·절차가 빠지면 화면이 아무리 예뻐도 사고 때 무너져요."
          desc={<>업계 안전관리 대시보드에서 흔히 보는 문제는 화면보다 그 뒤의 ‘정의’에서 생겨요. 기준을 누가 정했는지, 조치를 누가 했는지, 무엇을 해야 하는지가 비어 있어요. ‘흔한 화면’과 ‘업그레이드하면’을 눌러 비교해 보세요.</>}>
          <Mistakes />
        </Section>

        <Section id="dash-ops-matrix" title="우선순위는 감이 아니라 두 질문으로 정해요"
          gist="얼마나 심각한가, 시간이 얼마나 남았나. 이 둘로 1·2·3을 정해요."
          desc={<>응급실에서 환자 순서를 정하는 것과 비슷해요. 얼마나 위험한지, 얼마나 빨리 손써야 하는지를 봐요. 알람의 <Term k="우선순위" />도 두 질문으로 정해요. 결과가 얼마나 심각한가, 손쓸 시간이 얼마나 남았나. 칸을 눌러 보세요.</>}>
          <PriorityMatrix />
          <Note>알람 관리 표준은 우선순위를 3~4단계 이하로 두라고 해요. 그리고 결과가 얼마나 심각한지와 대응할 시간으로 정하게 해요 <Cite n={1} /><Cite n={2} />. 표 안의 숫자(10분·30분)와 심각도 설명은 <b>예시</b>예요. 팀이 처음에 한 번 합의하고, 정의서 맨 앞에 적어 둬요.</Note>
        </Section>

        <Section id="dash-ops-flood-why" title="알람을 왜 하나하나 정해야 하나"
          gist="헛울림이 많으면 사람들이 알람을 무시해요. 그래서 하나씩 따져요."
          desc="양치기 소년 이야기처럼, 알람이 자주 헛울리면 사람들은 알람을 덜 믿게 돼요.">
          <div className="op-fatigue">
            <div className="op-fatigue-bar" role="img" aria-label="보고된 수치: 임상 알람의 72에서 99퍼센트가 거짓이거나 조치가 필요 없었다">
              <i style={{ left: '72%', width: '27%' }} />
              <span style={{ left: '72%' }}>72%</span><span style={{ left: '99%' }}>99%</span>
            </div>
            <p>병원에서 환자 상태를 알리는 알람(임상 알람)의 <b>72~99%</b>가 거짓이거나 조치가 필요 없었다고 보고됐어요(Sendelbach & Funk 2013, 2차 인용) <Cite n={4} />. 어린이 병원 연구에서도 중환자실 알람의 87.1%, 일반 병동 알람의 99.0%가 조치할 필요가 없었어요. 알람 대부분이 헛울림이면 사람은 알람에 무뎌져요. 이걸 <Term k="알람 피로" />라고 불러요.</p>
          </div>
          <div className="op-norm">
            <b>보고된 알람 관리 목표값</b>
            <ul>
              <li><span>평상시</span><b>10분에 약 1개</b><small>운영자 1명당 · 한 시간에 6개 · 하루 약 150개 미만</small></li>
              <li><span><Term k="폭주" /></span><b>10분에 10개 초과</b><small>폭주 구간은 전체의 1% 미만</small></li>
              <li><span>분포</span><b>80 · 15 · 5%</b><small>주의 · 높음 · 긴급 (3단계일 때)</small></li>
              <li><span>오래 떠 있음</span><b>하루 5개 미만</b><small>꺼지지 않고 계속 떠 있는 알람</small></li>
            </ul>
            <small className="muted">알람 관리 표준(ISA-18.2·EEMUA 191) 쪽 목표값을 2차 자료에서 확인한 것이에요 <Cite n={3} />. 그대로 기준으로 삼기보다, 우리 현장을 재 보는 출발점으로 써요.</small>
          </div>
        </Section>

        <Section id="dash-ops-def" wide title="안전 이벤트 정의서 — 한 이벤트에 한 줄, 빈칸 없이"
          gist="이벤트마다 조건·지속 시간·우선순위·대응·담당을 빈칸 없이 적어요."
          desc={<>알람 대청소라고 생각하면 쉬워요. <Term k="알람 합리화" />는 이벤트 하나하나에 ‘왜 있나, 언제 울리나, 울리면 누가 무엇을 하나’를 적는 일이에요. 안전관리 화면에서는 화재·가스·위험구역 접근·보호구·작업자 무응답·설비 이상이 한 정의서에 모여요. 왼쪽 표에서 이벤트를 고르고 오른쪽에서 고쳐 보세요. 우선순위는 위의 두 질문 표에 따라 자동으로 계산돼요.</>}>
          <DefEditor />
          <Note tone="tip"><b>빈칸이 곧 숙제예요.</b> ‘대응’ 칸을 못 채우면 그건 대부분 알람이 아니라 기록용 이벤트예요. ‘원인’ 칸을 못 채우면 운영자도 원인을 모른다는 뜻이에요. 그럴 땐 확인 방법부터 정해요. 정의서 맨 아래에는 검토 기록(날짜·검토자·바꾼 것·이유)을 꼭 남겨요.</Note>
        </Section>

        <Section id="dash-ops-deadband" wide title="기준값만으로는 부족해요 — 지속 시간과 히스테리시스"
          gist="조금 기다렸다 울리고, 충분히 내려가야 꺼지게 하면 깜빡이지 않아요."
          desc={<>에어컨이 26도에서 켜지고 26도에서 바로 꺼지면 계속 켜졌다 꺼졌다 하겠죠. 알람도 같아요. 화학물질 창고의 가연성 가스가 <Term k="%LEL">10%LEL</Term> 언저리에서 오르내리면, 기준값 하나만 정한 알람은 켜졌다 꺼졌다를 반복해요. 슬라이더를 움직여 같은 2시간 동안 알람이 몇 번 울리는지 보세요.</>}>
          <Deadband />
          <SysPair>
            <Note><b><Term k="지속 시간" />(켜짐 지연)</b>: 값이 기준을 넘은 채로 정한 시간이 지나야 울려요. 잠깐 튀는 값을 걸러 내요. 대신 그만큼 늦게 알게 돼요. 그래서 긴급(1) 알람은 짧게 둬요.</Note>
            <Note><b><Term k="히스테리시스" />(<Term k="데드밴드" />)</b>: 켜진 알람은 기준값보다 조금 더 내려가야 꺼져요. 기준값 근처에서 깜빡이는 채터링을 막아요. 그래서 정의서에 두 칸이 다 있어야 해요 <Cite n={1} />.</Note>
          </SysPair>
        </Section>

        <Section id="dash-ops-sop" wide title="대응 절차 카드 — 알람에서 바로 열려야 해요"
          gist="알람을 누르면 그 자리에서 할 일 순서가 바로 보여야 해요."
          desc={<>요리 레시피 카드처럼, 이벤트 종류마다 할 일을 순서대로 적은 카드예요(<Term k="대응 절차" />). 카드는 공통 순서를 따르되, 종류마다 첫 행동이 달라요. 알람을 고르면 그 종류의 절차가 열려요. 단계를 체크하고, 판단 지점에서 예·아니요를 골라 보세요.</>}>
          <ol className="op-common" aria-label="사고 대응 공통 순서">
            <li className="h">사고 대응 공통 순서</li>
            {SAFE_SOP.map((t, i) => <li key={t}><span className="n">{i + 1}</span>{t}</li>)}
          </ol>
          <SopCards />
          <div className="op-rules">
            <div><b>첫 줄은 ‘먼저 볼 것’</b><p>긴 설명보다 첫 행동 하나를 적어요. 급할 땐 첫 줄만 읽으니까요.</p></div>
            <div><b>한 단계 = 한 동사</b><p>“확인해요”, “열어요”, “연락해요”. 두 가지를 한 줄에 넣지 않아요.</p></div>
            <div><b>판단은 예·아니요로</b><p>“상황에 따라”라고 쓰지 않고, 무엇을 보고 어느 쪽으로 가는지 적어요.</p></div>
            <div><b>한 화면에 다 보이게</b><p>스크롤해야 하면 절차가 너무 길어요. 길면 나눠요.</p></div>
            <div><b>연락처와 관련 화면을 카드 안에</b><p>운영자 옆에서 지켜보면(섀도잉) 종이 연락처를 뒤지는 모습이 가장 자주 보여요.</p></div>
            <div><b>개정일·승인자</b><p>오래된 절차는 위험해요. 누가 언제 확인했는지 적어요.</p></div>
          </div>
        </Section>

        <Section id="dash-ops-handover" wide title="교대 인수인계와 일일 안전 점검"
          gist="받는 사람이 하나씩 확인하고, 감지기가 살아 있는지 점검해야 교대가 끝나요."
          desc={<>병원 간호사가 근무를 바꿀 때 환자 상태를 하나하나 넘기는 것과 같아요(<Term k="인수인계" />). 진행 중인 일, <Term k="보류" /> 중인 알람, <Term k="서비스 제외">서비스에서 뺀</Term> 센서, 특이 사항을 넘겨요. 받는 사람(인수자)이 하나씩 확인해야 인수가 끝나요. 인수한 뒤에는 감지기·CCTV가 살아 있는지 일일 점검을 해요.</>}>
          <Handover />
          <DailyCheck />
        </Section>

        <Section id="dash-ops-kpi" wide title="알람 KPI — 매주 숫자로 재고 정의서를 고쳐요"
          gist="자주 울리는 상위 10개부터 고치면 효과가 가장 커요."
          desc={<>건강검진처럼 알람 상태를 정기적으로 숫자로 재요(<Term k="KPI" />). 10분당 알람 수, 폭주 구간 비율, 오래 떠 있는 알람, 우선순위 비율, 자주 울린 상위 10개를 봐요. ‘합리화 후’로 바꿔 보세요.</>}>
          <Kpi />
          <Note>목표값은 2차 자료로 확인한 보고된 수치예요 <Cite n={3} />. 실무에서는 상위 몇 개 알람이 전체의 대부분을 차지하는 경우가 흔해요 <Cite n={6} />. 그래서 <Term k="합리화" />는 수백 개를 한꺼번에 보는 것보다 <b>상위 10개부터</b> 고치는 게 효과가 커요. 이 예시의 수치는 가상 기록으로 계산한 값이에요.</Note>
        </Section>

        <Section id="dash-ops-interview" wide title="운영자에게 물어볼 것, 옆에서 볼 것"
          gist="물어보는 것만으론 부족해요. 옆에서 실제로 일하는 모습을 봐요."
          desc="안전관리 화면에 필요한 것은 회의실보다 상황실과 현장에서 나와요. 인터뷰로는 ‘무엇을 하는지’를 듣고, 섀도잉(옆에 앉아 지켜보기)으로는 ‘실제로 어떻게 하는지’를 봐요.">
          <Interview />
          <Note tone="tip"><b>말과 행동은 달라요.</b> 인터뷰에선 “알람은 다 봐요”라고 해도, 옆에서 보면 보호구 미착용 알람은 소리만 끄고 넘겨요. 그 차이가 정리(합리화) 1순위예요. 기록을 <Term k="상황 인식" /> 3단계로 나눠 보세요. 운전 중 “앞차 브레이크등이 켜졌다(지각) → 앞차가 선다(이해) → 곧 부딪힌다(예측)”와 같은 단계예요. 화면이 어느 단계를 못 돕는지 보여요 <Cite n={5} />.</Note>
        </Section>

        <Section id="dash-ops-links" wide title="기획 노트와 이어 읽기" gist="이벤트 정의서·인수인계·KPI는 기획 노트의 기본기를 그대로 써요." desc="안전관리 화면 기획도 결국 기획의 기본기 위에 있어요.">
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
          { kind: 'practice', text: '상위 10개 알람부터 합리화, 이벤트 종류별 대응 절차 카드(급할 땐 첫 줄만 읽음), 교대 인수인계 확인, 일일 점검, 수집 주기의 3배로 ‘연결 안 됨’ 판정, 섀도잉 기록 — 안전관리 상황실 운영 실무 방식' },
        ]} />
      </SysGrid>
    </div>
  )
}

function SysPair({ children }: { children: ReactNode }) { return <div className="op-pair">{children}</div> }
