/* 09 FE · 구현 — 흔한 실수, 데이터 전송, 재연결, 대량 시계열 그리기(실측), 업데이트 묶기, 오래 켜 두는 화면, 시간, 접근성
 * 예시: 가상의 가람산업 통합 안전관리 상황실 (data.ts SAFE_*) */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Term, TermList } from '../../components/Term'
import { Range, Seg } from '../../components/ui'
import { download } from '../../system/export'
import { CodeBlock, Note, Section, SysGrid } from '../../system/ui'
import { SAFE_ALARMS, SAFE_CENTER, SAFE_RANGES, SAFE_SITES, rng, type Pri } from '../data'
import { CaseCard, Cite, Finding, Hmi, PriBadge, Refs, useVisibleInterval } from '../ui'
import './fe.css'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** 구역 9곳의 대표 센서값 — 경보 기준을 100으로 볼 때 지금 값(가상) */
const ZONE_BASE = [42, 58, 64, 20, 18, 46, 24, 16, 38]
const ZONES = SAFE_SITES.flatMap(s => s.zones.map(z => ({ id: z.id, name: z.name, site: s.name }))).map((z, i) => ({ ...z, base: ZONE_BASE[i] }))
const LEL = SAFE_RANGES.lel

/* ================= 0. 흔한 실수 ================= */
/** 흔한 화면에서 쓰는 초록 램프 (정상인데도 깜빡여요 — 일부러 보여주는 나쁜 예) */
const Lamp = () => <i className="mk-lamp" aria-hidden="true" />
const SENS = [
  { z: '도장 부스', v: '3%LEL', t: '14:05:02', q: false },
  { z: '화학물질 창고', v: '4%LEL', t: '13:40:11', q: true },
  { z: '상하차장 일산화탄소', v: '12ppm', t: '14:05:01', q: false },
  { z: '지하 밀폐공간 산소', v: '20.8%', t: '14:05:02', q: false },
]
function MkQualityBefore() {
  return (
    <Hmi dark title="가스 센서 현황" right={<span className="mk-red">● 실시간</span>} className="fe-mk">
      <ul className="mk-rows">
        {SENS.map(s => <li key={s.z}><Lamp /><span>{s.z}</span><b>{s.v}</b><em className="mk-ok">정상</em></li>)}
      </ul>
      <p className="mk-foot">서버가 보낸 품질 정보: <span className="mk-red">불확실</span> — 화면에서 쓰지 않음</p>
    </Hmi>
  )
}
function MkQualityAfter() {
  return (
    <Hmi title="가스 센서 현황" right="갱신 14:05:02" className="fe-mk up">
      <div className="mk-banner">값 불확실 1건 — 정상 개수에서 뺐어요</div>
      <ul className="mk-rows">
        {SENS.map(s => (
          <li key={s.z} className={s.q ? 'q' : ''}>
            <span className="mk-q" aria-hidden="true">{s.q ? '?' : ''}</span><span>{s.z}</span><b>{s.v}</b>
            <em>{s.q ? `불확실 · ${s.t} 이후 새 값 없음` : ''}</em>
          </li>
        ))}
      </ul>
    </Hmi>
  )
}
const RECENT = ['보호구 미착용', '위험구역 접근', '보호구 미착용', '설비 이상', '위험구역 접근', '보호구 미착용']
function MkCapBefore() {
  return (
    <Hmi dark title="최근 이벤트 50건" right={<span className="mk-red">50/50</span>} className="fe-mk">
      <ul className="mk-rows dense">
        {RECENT.map((t, i) => <li key={i}><span className="mk-t">14:19:{(47 - i * 7).toString().padStart(2, '0')}</span><span className="mk-red">{t}</span><span>물류센터 · 상하차장</span></li>)}
        <li className="mk-more">… 44건 더 · 이전 이벤트는 ‘이력’ 메뉴에서</li>
      </ul>
      <p className="mk-foot">14:02에 시작된 도장 부스 화재 알람(진행 중)은 51번째로 밀려 목록에 없어요</p>
    </Hmi>
  )
}
function MkCapAfter() {
  return (
    <Hmi title="진행 중 알람 3건 · 전부" right="우선순위 → 발생 시각" className="fe-mk up">
      <ul className="mk-rows">
        <li><PriBadge p={1} /><span>제2공장 · 도장 부스</span><b>연기 + 온도 급상승</b><em>14:02 · 17분째</em></li>
        <li><PriBadge p={2} /><span>제2공장 · 화학물질 창고</span><b>가스 12%LEL</b><em>14:04</em></li>
        <li><PriBadge p={3} /><span>물류센터 · 상하차장</span><b>안전모 미착용</b><em>14:19 · 같은 종류 41건 묶음</em></li>
      </ul>
      <p className="mk-sub">최근 이벤트 50건은 이 아래에 따로 보여줘요</p>
    </Hmi>
  )
}
const GAP_PTS = Array.from({ length: 40 }, (_, i) => ({ i, v: 5 + Math.sin(i / 4) * 1.2 + (i > 16 && i < 26 ? Math.sin(((i - 16) / 10) * Math.PI) * 4 : 0) }))
function GapChart({ fill }: { fill: boolean }) {
  const x = (i: number) => 8 + i * 7.6, y = (v: number) => 96 - v * 7.4
  const gap = (i: number) => i > 16 && i < 26
  const seg = (arr: typeof GAP_PTS) => arr.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  return (
    <svg viewBox="0 0 310 104" className="mk-chart" role="img" aria-label={fill ? '끊긴 구간을 다시 받아 채운 그래프. 그 구간에 가스 농도가 잠깐 올랐다 내려온 것이 보여요.' : '끊긴 구간 양 끝을 직선으로 이은 그래프. 그 사이의 상승이 보이지 않아요.'}>
      {fill && <rect className="gapband" x={x(16.5)} y={4} width={x(25.5) - x(16.5)} height={92} />}
      <path className="ln" d={seg(fill ? GAP_PTS : GAP_PTS.filter(p => !gap(p.i)))} />
      {fill && GAP_PTS.filter(p => gap(p.i)).map(p => <circle key={p.i} className="late" cx={x(p.i)} cy={y(p.v)} r={2.4} />)}
      {fill && <text className="lab" x={x(21)} y={102} textAnchor="middle">다시 받은 30초</text>}
    </svg>
  )
}
function MkGapBefore() {
  return <Hmi dark title="화학물질 창고 가스 · 최근 5분" right={<span className="mk-ok">● 정상</span>} className="fe-mk"><GapChart fill={false} /><p className="mk-foot">30초 끊긴 동안의 값이 없는데도 선이 매끈하게 이어져 있어요</p></Hmi>
}
function MkGapAfter() {
  return <Hmi title="화학물질 창고 가스 · 최근 5분" right="갱신 14:05:02" className="fe-mk up"><GapChart fill /><p className="mk-sub">끊긴 30초 사이에 9%LEL까지 올랐다 내려온 게 보여요. 끝내 못 받은 구간은 선을 끊고 빗금으로 비워요</p></Hmi>
}
const WID = [['요약 숫자', '14:02:05'], ['알람 목록', '14:02:01'], ['현장 지도', '14:01:58'], ['가스 추세', '14:02:04'], ['출입 인원', '14:01:55'], ['CCTV 상태', '14:02:03']]
function MkPollBefore() {
  return (
    <Hmi dark title="상황실 메인 · 위젯 6개" right={<span className="mk-red">요청 1,440번/분</span>} className="fe-mk">
      <div className="mk-wid">{WID.map(([n, t]) => <div key={n}><b>{n}</b><small>5초마다 따로 요청</small><span>{t}</span></div>)}</div>
      <p className="mk-foot">위젯 6개 × 1분에 12번 × 상황실 화면 20대. 위젯마다 다른 순간을 보여줘요</p>
    </Hmi>
  )
}
function MkPollAfter() {
  return (
    <Hmi title="상황실 메인 · 위젯 6개" right="연결 1개 · 갱신 14:02:05" className="fe-mk up">
      <div className="mk-wid">{WID.map(([n]) => <div key={n}><b>{n}</b><small>공용 저장소 구독</small><span>14:02:05</span></div>)}</div>
      <p className="mk-sub">서버 연결 하나 → 공용 저장소 → 위젯은 구독만 해요. 모든 위젯이 같은 순간을 보여줘요</p>
    </Hmi>
  )
}
function Mistakes() {
  return (
    <div className="fe-cases">
      <CaseCard sev="치명" title="서버가 ‘값 불확실’이라고 보내도 메인 목록은 정상처럼 그려요"
        before={<MkQualityBefore />} after={<MkQualityAfter />}
        now={<>서버는 센서값마다 <Term k="값 품질">품질 정보</Term>(좋음·불확실·나쁨)를 같이 보내요. 그런데 메인 목록은 숫자만 꺼내 그려요. 13:40에 멈춘 가스 센서가 25분째 <b>초록 ‘정상’</b>으로 떠 있어요.</>}
        why={<>안전관리 화면이 해서는 안 되는 일이에요. 상황 인식은 ‘보기 → 이해 → 예측’ 순서예요. 첫 단계에서 잘못 보면 뒤 단계도 모두 틀려요 <Cite n={10} />. 멈춘 센서는 가스가 새도 알려 주지 않아요. 그런데 화면은 ‘안전하다’고 말해요.</>}
        fix={<>품질과 마지막 수신 시각을 값과 <b>한 묶음</b>으로 받아요. 목록·지도·요약 숫자는 같은 함수로 그려요. ‘불확실’ 값은 물음표와 빗금으로 표시해요. 정상 개수에서 빼고 따로 세어 맨 위에 띄워요.</>} />
      <CaseCard sev="치명" title="최근 50건만 받아서, 알람이 쏟아지면 진행 중인 화재 알람이 잘려요"
        before={<MkCapBefore />} after={<MkCapAfter />}
        now={<>목록 API가 ‘최근 50건’만 돌려줘요. 평소엔 충분해 보여요. 그런데 보호구 감지가 연달아 쏟아지면 14:02에 시작된 화재 알람이 51번째로 밀려나요.</>}
        why={<>알람 관리 표준 쪽에서는 10분에 알람 10개가 넘으면 ‘폭주’로 봐요(보고된 수치) <Cite n={11} />. 폭주 때 50건은 금방 차요. 진행 중 알람은 ‘지금 상태’예요. 최근 기록 몇 건과 같은 것으로 다루면 안 돼요.</>}
        fix={<>API를 둘로 나눠요. ① <b>진행 중 알람 전부</b>(개수 제한 없음, 넘치면 ‘더 있음’ 표시) ② 최근 이벤트 n건. 진행 중 목록은 우선순위, 그다음 발생 시각 순으로 정렬해요. 같은 종류가 쏟아지면 한 줄로 묶어요.</>} />
      <CaseCard sev="높음" title="다시 연결되면 끊긴 구간을 선으로 매끈하게 이어 버려요"
        before={<MkGapBefore />} after={<MkGapAfter />}
        now={<>30초 동안 연결이 끊겼다 돌아와요. 차트 라이브러리는 기본 설정대로 앞뒤 점을 직선으로 이어요. 그 사이에 가스가 <Term k="%LEL">9%LEL</Term>까지 올랐다 내려왔는데 아무도 몰라요.</>}
        why={<>사고를 조사할 때 가장 먼저 찾는 게 바로 그 구간이에요. SSE는 다시 연결할 때 마지막으로 받은 번호를 서버에 보내 줘요 <Cite n={2} />. 하지만 서버와 화면이 그 번호를 쓰지 않으면 소용이 없어요.</>}
        fix={<>메시지마다 순서 번호(seq)를 붙여요. 다시 연결하면 ‘마지막 번호 이후’를 받아 채워요. 다시 받은 점은 속이 빈 점으로 그려요. 끝내 못 받은 구간은 <b>선을 끊고 빗금</b>으로 비워요.</>} />
      <CaseCard sev="보통" title="위젯마다 따로 폴링해서 요청이 몰리고, 한 화면이 서로 다른 순간을 보여줘요"
        before={<MkPollBefore />} after={<MkPollAfter />}
        now={<>요약 숫자, 알람 목록, 지도, 추세 위젯이 각자 5초 타이머로 서버에 물어요. 화면 20대면 1분에 1,440번이에요. 위젯마다 갱신 시각이 달라서, 요약은 ‘알람 3건’인데 목록은 4건일 때도 있어요.</>}
        why={<>같은 화면 안에서 숫자가 다르면 근무자는 어느 쪽을 믿을지부터 따져야 해요. 그만큼 판단이 늦어져요. 서버가 잠깐 멈췄다 살아나면 모든 위젯이 한꺼번에 몰려요(아래 재연결 섹션).</>}
        fix={<>서버 연결은 <b>하나</b>만 둬요(SSE 또는 웹소켓). 받은 값은 공용 저장소에 넣고, 위젯은 저장소를 구독만 해요. 갱신 시각은 화면 전체에 하나만 보여줘요.</>} />
      <CaseCard good sev="보통" title="필터 설정을 못 불러와도 알람을 숨기지 않아요(안전 쪽으로 실패)"
        now={<>‘내 구역만 보기’ 같은 필터 설정을 서버에서 받아요. 그 요청이 실패하면 필터 없이 <b>전체 알람</b>을 보여줘요. 맨 위에는 “필터를 불러오지 못해 전체 알람을 보여줘요” 배너를 띄워요.</>}
        why={<>반대로 하면 필터가 실패할 때 빈 목록이 나와요. 빈 목록은 ‘알람 없음’과 구별이 안 돼요. 안전관리 화면에서 가장 위험한 거짓말이에요.</>}
        fix={<>필터 기본값을 ‘전부 보이기’로 둬요. 오류 처리(<code>catch</code>)에서 빈 배열을 돌려주지 않아요. 테스트에 ‘필터 API 실패’ 경우를 꼭 넣어요.</>} />
    </div>
  )
}

/* ================= 1. 데이터 전송 방식 ================= */
type Method = 'poll' | 'long' | 'sse' | 'ws'
const T = 30, OW = 0.18 // 30초 구간, 한 방향 전송 0.18초 (가상)
const EV = [2.1, 2.6, 7.8, 13.0, 13.4, 13.9, 21.5, 27.2]
interface Arrow { a: number; b: number; up: boolean; k: 'req' | 'res' | 'push' | 'hs' | 'msg' }
interface Lane { arrows: Arrow[]; got: { e: number; at: number }[]; reqs: number; conn: boolean }
function simulate(m: Method): Lane {
  const arrows: Arrow[] = [], got: { e: number; at: number }[] = []
  const left = [...EV]
  const take = (until: number, at: number) => { while (left.length && left[0] <= until) got.push({ e: left.shift()!, at }) }
  if (m === 'poll') {
    let reqs = 0
    for (let t = 0; t < T; t += 5) {
      reqs++; arrows.push({ a: t, b: t + OW, up: true, k: 'req' })
      const s = t + OW; arrows.push({ a: s, b: s + OW, up: false, k: 'res' }); take(s, s + OW)
    }
    return { arrows, got, reqs, conn: false }
  }
  if (m === 'long') {
    let t = 0, reqs = 0
    while (t < T) {
      reqs++; arrows.push({ a: t, b: t + OW, up: true, k: 'req' })
      const s = t + OW
      const r = left.length && left[0] <= s ? s : Math.min(left[0] ?? Infinity, s + 15)
      if (r > T) break
      arrows.push({ a: r, b: r + OW, up: false, k: 'res' }); take(r, r + OW)
      t = r + OW
    }
    return { arrows, got, reqs, conn: false }
  }
  arrows.push({ a: 0, b: OW, up: true, k: 'hs' }, { a: OW, b: 2 * OW, up: false, k: 'hs' })
  for (const e of EV) { arrows.push({ a: e, b: e + OW, up: false, k: 'push' }); got.push({ e, at: e + OW }) }
  if (m === 'ws') arrows.push({ a: 16.2, b: 16.2 + OW, up: true, k: 'msg' })
  return { arrows, got, reqs: 1, conn: true }
}
const METHODS: { id: Method; n: string; d: string }[] = [
  { id: 'poll', n: '폴링 (5초마다)', d: '정해진 간격마다 “새 거 있어요?” 하고 물어봐요' },
  { id: 'long', n: '롱폴링', d: '서버가 새 소식이 생길 때까지 답을 미뤄요' },
  { id: 'sse', n: 'SSE', d: '연결 하나를 열어 두고, 서버가 브라우저로 한 방향으로 보내요' },
  { id: 'ws', n: '웹소켓', d: '연결 하나를 열어 두고, 양쪽이 언제든 주고받아요' },
]
function Transport() {
  const sims = useMemo(() => Object.fromEntries(METHODS.map(m => [m.id, simulate(m.id)])) as Record<Method, Lane>, [])
  const [now, setNow] = useState(() => (reduced() ? T : 0))
  const [play, setPlay] = useState(false)
  const ref = useVisibleInterval(() => setNow(n => { const v = Math.min(T, n + 0.15); if (v >= T) setPlay(false); return v }), 50, play)
  const W = 1000, X0 = 96, x = (t: number) => X0 + (t / T) * (W - X0 - 14), LH = 78
  return (
    <div className="fe-tr" ref={ref}>
      <div className="fe-row">
        <button type="button" className="btn sm" onClick={() => { if (now >= T) setNow(0); setPlay(p => !p) }}>{play ? '일시정지' : now >= T ? '처음부터 재생' : '재생'}</button>
        <button type="button" className="btn sm ghost" onClick={() => { setPlay(false); setNow(T) }}>끝까지 보기</button>
        <span className="muted">서버에서 생긴 변화 {EV.length}건(●)이 브라우저에 언제 도착하는지 보세요. 시각 {now.toFixed(1)}초</span>
      </div>
      <div className="fe-scroll">
        <svg viewBox={`0 0 ${W} ${METHODS.length * LH + 26}`} className="fe-tr-svg" role="img" aria-label="네 가지 전송 방식의 요청·응답 시간축 비교">
          <defs>
            <marker id="fe-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" className="ah" /></marker>
          </defs>
          {METHODS.map((m, li) => {
            const top = li * LH + 6, cy = top + 16, sy = top + 58, L = sims[m.id]
            return (
              <g key={m.id}>
                <text className="ln-n" x={6} y={top + 12}>{m.n}</text>
                <text className="ln-s" x={6} y={cy + 14}>브라우저</text>
                <text className="ln-s" x={6} y={sy + 4}>서버</text>
                <line className={'lane' + (L.conn && now > 2 * OW ? ' conn' : '')} x1={X0} x2={W - 14} y1={cy} y2={cy} />
                <line className="lane" x1={X0} x2={W - 14} y1={sy} y2={sy} />
                {L.conn && now > 2 * OW && <rect className="pipe" x={x(2 * OW)} y={cy + 4} width={Math.max(0, x(now) - x(2 * OW))} height={sy - cy - 8} />}
                {L.arrows.filter(a => a.a <= now).map((a, i) => {
                  const f = Math.min(1, (now - a.a) / (a.b - a.a))
                  const y1 = a.up ? cy : sy, y2 = a.up ? sy : cy
                  return <line key={i} className={'ar k-' + a.k} x1={x(a.a)} y1={y1} x2={x(a.a) + (x(a.b) - x(a.a)) * f} y2={y1 + (y2 - y1) * f} markerEnd={f >= 1 ? 'url(#fe-ah)' : undefined} />
                })}
                {EV.map(e => {
                  const g = L.got.find(v => v.e === e), done = g && g.at <= now
                  return e <= now ? <g key={e}>
                    <circle className={'ev' + (done ? ' done' : '')} cx={x(e)} cy={sy} r={4.5} />
                    {done && <line className="lat" x1={x(e)} x2={x(g!.at)} y1={sy + 9} y2={sy + 9} />}
                  </g> : null
                })}
                {m.id === 'ws' && now > 16.2 && <text className="ln-s" x={x(16.2) + 6} y={cy + 30}>확인 신호(ack)도 같은 연결로</text>}
              </g>
            )
          })}
          {[0, 5, 10, 15, 20, 25, 30].map(t => <text key={t} className="ax" x={x(t)} y={METHODS.length * LH + 20} textAnchor="middle">{t}초</text>)}
          <line className="now" x1={x(now)} x2={x(now)} y1={2} y2={METHODS.length * LH + 6} />
        </svg>
      </div>
      <div className="fe-tr-stats">
        {METHODS.map(m => {
          const L = sims[m.id], ds = L.got.map(g => g.at - g.e)
          const avg = ds.reduce((a, b) => a + b, 0) / ds.length, mx = Math.max(...ds)
          return (
            <div key={m.id}><b>{m.n}</b><span>HTTP 요청 <b>{L.reqs}</b>번</span><span>평균 지연 <b>{avg.toFixed(1)}초</b> · 최대 <b>{mx.toFixed(1)}초</b></span><small>{m.d}</small></div>
          )
        })}
      </div>
    </div>
  )
}

/* ================= 1-2. 네 방식 자세히 — 동작, 장단점, 조심할 점 ================= */
interface MethodInfo {
  how: string
  steps: string[]
  pros: string[]
  cons: string[]
  safety: string
  traps: string[]
  code: string
}
const DETAIL: Record<Method, MethodInfo> = {
  poll: {
    how: '5분마다 현관문을 열어 택배가 왔는지 보는 것과 같아요. 택배가 없어도 매번 나가 봐요.',
    steps: [
      '브라우저가 타이머로 정해진 간격(예: 5초)마다 서버에 “지금 상태 주세요”라고 요청해요.',
      '서버는 그 순간의 상태를 바로 답하고 요청을 끝내요. 변화가 없어도 같은 답을 보내요.',
      '브라우저는 답을 받아 화면을 고치고, 다음 간격까지 기다려요.',
    ],
    pros: [
      '가장 단순해요. 평범한 HTTP 요청이라 서버·프록시·방화벽 어디서든 막히지 않아요.',
      '요청마다 따로라서 서버가 연결을 기억할 필요가 없어요. 서버를 여러 대로 늘리기 쉬워요.',
      '끊겨도 다음 요청이 곧 재연결이에요. 재연결 코드를 따로 만들 필요가 없어요.',
      '캐시, 인증 헤더, 에러 처리 같은 기존 API 도구를 그대로 써요.',
    ],
    cons: [
      '변화가 화면에 도착하기까지 최대 간격만큼 늦어요. 5초 간격이면 화재 알람도 최대 5초 늦게 떠요.',
      '변화가 없어도 계속 요청해요. 화면 100대 × 5초 간격이면 1분에 1,200번이에요.',
      '간격 사이에 생겼다 사라진 짧은 변화는 아예 못 볼 수 있어요(다음 요청 때 이미 정상).',
      '간격을 줄이면 지연은 줄지만 요청 수가 그만큼 늘어요. 둘을 동시에 잡을 수 없어요.',
    ],
    safety: '일일 점검 현황, 시간별 출입 인원처럼 몇 분 단위로 바뀌는 지표에 잘 맞아요. 긴급 알람 목록에는 맞지 않아요.',
    traps: [
      '응답이 간격보다 오래 걸리면 요청이 겹쳐요. setInterval 대신 “응답을 받은 뒤 다음 요청 예약”으로 만들어요.',
      '“변경분만 주세요”를 하려면 마지막으로 받은 번호나 시각을 같이 보내요. 안 그러면 매번 전체를 받아요.',
      '탭이 가려졌을 때는 간격을 늘리거나 멈춰요. 다시 보이면 바로 한 번 받아요.',
    ],
    code: `// 응답을 받은 뒤에 다음 요청을 예약해요 (요청이 겹치지 않게)
let since = 0, timer = 0
async function tick() {
  try {
    const r = await fetch(\`/api/alarms?since=\${since}\`)
    const { items, last } = await r.json()
    apply(items); since = last
  } catch { markStale() }            // 실패하면 '오래된 값' 표시
  timer = window.setTimeout(tick, 5000)
}
tick()`,
  },
  long: {
    how: '택배 기사에게 전화해 “오면 알려 주세요” 하고 끊지 않고 기다리는 것과 같아요. 소식이 오면 끊고, 바로 다시 전화해요.',
    steps: [
      '브라우저가 “새 소식 있으면 주세요”라고 요청해요.',
      '서버는 새 소식이 없으면 바로 답하지 않고 요청을 붙잡고 기다려요(보통 20~60초까지).',
      '새 소식이 생기면 그때 답하고 요청을 끝내요. 기다리다 시간이 다 되면 빈 답을 보내요.',
      '브라우저는 답을 받자마자 다음 요청을 다시 보내요. 이것을 계속 반복해요.',
    ],
    pros: [
      '평범한 HTTP라서 웹소켓이 막힌 회사망·오래된 프록시에서도 대부분 동작해요.',
      '소식이 생기면 바로 답하므로 지연이 짧아요. 폴링보다 빈 요청이 훨씬 적어요.',
      '기존 API 서버에 기능 하나를 더하는 방식이라 새 기술 없이 시작할 수 있어요.',
    ],
    cons: [
      '소식 하나마다 요청이 한 번 끝나고 새로 열려요. 소식이 많을수록 요청 수와 헤더 낭비가 늘어요.',
      '답을 받고 다음 요청을 보내기 전 아주 짧은 틈이 생겨요. 그 사이 생긴 소식은 번호(커서)로 다시 받아야 해요.',
      '서버는 기다리는 요청을 화면 수만큼 붙잡고 있어요. 요청 하나에 스레드 하나를 쓰는 서버는 금방 바닥나요.',
      '중간의 프록시·로드밸런서가 “응답 없는 오래된 요청”을 잘라 버릴 수 있어요. 기다리는 시간을 그보다 짧게 맞춰요.',
    ],
    safety: '웹소켓·SSE를 쓸 수 없는 폐쇄망이나 오래된 장비가 섞인 현장에서 대안으로 써요. 새로 만든다면 SSE를 먼저 검토해요.',
    traps: [
      '매 요청에 마지막으로 받은 번호를 보내야 틈 사이의 소식을 놓치지 않아요.',
      '빈 답(시간 초과)은 오류가 아니에요. 오류일 때만 백오프로 기다렸다 다시 요청해요.',
      '여러 탭이 같은 요청을 동시에 붙잡으면 브라우저 연결 수 제한에 걸릴 수 있어요.',
    ],
    code: `// 답이 오면 바로 다음 요청. 서버는 소식이 생길 때까지 답을 미뤄요
let since = 0
async function loop() {
  for (;;) {
    try {
      const r = await fetch(\`/api/alarms/wait?since=\${since}&timeout=25\`)
      if (r.status === 204) continue          // 25초 동안 소식 없음 → 다시
      const { items, last } = await r.json()
      apply(items); since = last
    } catch { await sleep(backoff()) }        // 오류일 때만 쉬었다가
  }
}`,
  },
  sse: {
    how: '라디오를 켜 두는 것과 같아요. 방송국(서버)이 말하면 그냥 들려요. 하지만 라디오로 방송국에 말을 걸 수는 없어요.',
    steps: [
      '브라우저가 EventSource로 요청을 하나 보내고, 서버는 그 응답을 끝내지 않고 열어 둬요.',
      '서버는 소식이 생길 때마다 같은 응답에 “id · 이벤트 종류 · 데이터” 한 덩어리를 이어서 써요.',
      '연결이 끊기면 브라우저가 알아서 다시 연결하고, 마지막으로 받은 id를 Last-Event-ID 헤더로 보내요.',
      '서버는 그 id 이후의 소식부터 다시 보내요. 브라우저에서 서버로 보낼 일은 따로 API를 불러요.',
    ],
    pros: [
      '받기만 하는 화면에 딱 맞아요. 안전관리 상황실 화면의 대부분이 받기예요.',
      '재연결과 “마지막 번호 이후부터 다시 받기”가 표준에 들어 있어요. 직접 만들 게 적어요.',
      '평범한 HTTP 응답이라 기존 인증 쿠키, 서버 로그, HTTP/2를 그대로 써요.',
      '서버 코드가 단순해요. 응답에 글자를 이어 쓰기만 하면 돼요.',
    ],
    cons: [
      '서버 → 브라우저 한 방향뿐이에요. 확인(ack) 같은 응답은 따로 API로 보내요.',
      '글자(UTF-8)만 보낼 수 있어요. 이진 데이터는 글자로 바꿔야 해서 커져요.',
      'HTTP/1.1에서는 브라우저가 한 도메인에 연결을 6개까지만 열어요. 탭을 여러 개 열면 막힐 수 있어서 HTTP/2가 필요해요.',
      '브라우저 기본 EventSource는 요청 헤더를 직접 넣을 수 없어요. 토큰 인증은 쿠키나 별도 방법을 써요.',
    ],
    safety: '알람 목록, 센서값, 연결 상태처럼 서버가 알려 주기만 하면 되는 상황실 화면의 기본 선택이에요.',
    traps: [
      '중간 프록시(예: nginx)가 응답을 모았다 한꺼번에 보내면 실시간이 아니게 돼요. 버퍼링을 꺼요.',
      '소식이 없어도 15~30초마다 빈 줄(주석) 하나를 보내요. 그래야 중간 장비가 연결을 끊지 않고, 화면도 살아 있는지 알아요.',
      '서버가 id를 붙이지 않으면 자동 재연결이 있어도 놓친 구간을 못 받아요.',
    ],
    code: `// 브라우저: 재연결과 Last-Event-ID 는 브라우저가 알아서 해요
const es = new EventSource('/api/alarms/stream', { withCredentials: true })
es.addEventListener('alarm', e => apply(JSON.parse(e.data)))
es.onerror = () => markStale()      // 끊김 배너 (재연결은 자동)

// 서버가 쓰는 글자 형식
// id: 1042
// event: alarm
// data: {"id":"S-101","pri":1,"where":"도장 부스"}
//
// : ping   ← 소식이 없을 때 연결 유지용 주석`,
  },
  ws: {
    how: '전화 통화와 같아요. 한 번 연결하면 양쪽이 언제든 말할 수 있어요. 하지만 끊기면 다시 거는 것도, 어디까지 들었는지도 직접 챙겨야 해요.',
    steps: [
      '브라우저가 HTTP 요청으로 “웹소켓으로 바꿔요(Upgrade)”를 보내고, 서버가 받아들이면 연결이 바뀌어요.',
      '그 뒤로는 HTTP가 아니라 작은 묶음(프레임)으로 양쪽이 언제든 주고받아요.',
      '연결이 끊기면 브라우저는 close 이벤트만 알려 줘요. 다시 연결하는 일은 코드가 해요.',
      '다시 연결한 뒤 놓친 구간은 마지막 번호를 보내 직접 다시 받아요.',
    ],
    pros: [
      '양방향이에요. 확인(ack), 구독할 구역 바꾸기, 채팅처럼 브라우저도 자주 보내는 화면에 맞아요.',
      '메시지마다 붙는 머리말이 2~14바이트로 아주 작아요. 1초에 수십 건씩 오가도 가벼워요.',
      '글자와 이진 데이터를 모두 보낼 수 있어요. 영상 메타데이터나 압축한 센서 묶음도 바로 보내요.',
    ],
    cons: [
      '재연결, 놓친 구간 다시 받기, 살아 있는지 확인(하트비트)을 모두 직접 만들어야 해요.',
      '서버가 연결마다 상태를 들고 있어서, 서버를 여러 대로 늘리거나 배포할 때 연결을 옮기는 설계가 필요해요.',
      '일부 회사망·보안 프록시는 Upgrade 요청을 막아요. 그럴 때를 위한 대체 방식이 필요해요.',
      '브라우저 WebSocket도 요청 헤더를 직접 넣을 수 없어요. 인증은 쿠키, 연결 직후 첫 메시지, 짧게 쓰는 토큰으로 해요.',
    ],
    safety: '근무자가 화면에서 알람 확인·보류, 구역 구독 변경을 자주 보내거나 여러 근무자가 같은 화면 상태를 함께 바꾸는 상황실에 맞아요.',
    traps: [
      '보낸 메시지가 서버에 닿았다는 보장이 없어요. 확인(ack)처럼 중요한 명령은 서버의 응답 번호를 받고 나서 “처리됨”으로 표시해요.',
      'onclose만 믿지 마세요. 랜선이 빠지면 몇 분 동안 close가 안 올 수 있어요. 하트비트가 일정 시간 안 오면 끊긴 것으로 판정해요.',
      '보내는 쪽이 받는 쪽보다 빠르면 bufferedAmount가 계속 쌓여요. 쌓인 양을 보고 보내기를 늦춰요.',
    ],
    code: `// 하트비트가 끊기면 직접 끊고 다시 연결해요 (onclose 를 기다리지 않음)
let ws: WebSocket, last = 0, seen = Date.now()
function open() {
  ws = new WebSocket(\`/ws/alarms?since=\${last}\`)
  ws.onmessage = e => {
    seen = Date.now()
    const m = JSON.parse(e.data)
    if (m.type === 'ping') return
    apply(m); last = m.seq
  }
  ws.onclose = () => setTimeout(open, backoff())
}
setInterval(() => { if (Date.now() - seen > 30_000) ws.close() }, 5_000)
open()`,
  },
}

/** 표 형태 비교 — 행은 항목, 열은 방식 */
const COMPARE: [string, string, string, string, string][] = [
  ['연결 모양', '요청마다 새로 열고 닫음', '요청 하나를 오래 열어 두고, 답이 오면 새로 엶', '응답 하나를 계속 열어 둠', 'HTTP로 시작해 웹소켓 연결로 바꿈'],
  ['누가 먼저 말하나', '항상 브라우저', '항상 브라우저 (서버는 답을 미룸)', '연결 뒤에는 서버', '양쪽 모두 언제든'],
  ['변화가 도착하는 시간', '최대 간격만큼 늦음', '바로 (다음 요청 전 틈 제외)', '바로', '바로'],
  ['변화가 없을 때', '그래도 계속 요청', '기다리다 시간 초과 후 다시 요청', '연결 유지용 주석만 가끔', '하트비트만 가끔'],
  ['소식 하나당 낭비', 'HTTP 헤더 전체 (수백 바이트~수 KB)', 'HTTP 헤더 전체', '몇 줄짜리 글자', '머리말 2~14바이트'],
  ['보낼 수 있는 데이터', '무엇이든 (일반 HTTP)', '무엇이든 (일반 HTTP)', '글자(UTF-8)만', '글자와 이진 데이터'],
  ['끊긴 뒤 다시 연결', '다음 요청이 곧 재연결', '다음 요청이 곧 재연결', '브라우저가 자동', '직접 만들어야 함'],
  ['놓친 구간 다시 받기', 'since 값을 직접 보냄', 'since 값을 직접 보냄', 'Last-Event-ID 자동 전송 (서버가 id를 붙여야 함)', '직접 만들어야 함'],
  ['회사망·프록시 통과', '거의 항상 됨', '대부분 됨 (오래 기다리면 잘릴 수 있음)', '대부분 됨 (버퍼링 끄기 필요)', 'Upgrade를 막는 곳이 있음'],
  ['서버를 여러 대로 늘리기', '쉬움', '보통', '보통 (연결이 한 서버에 머묾)', '어려움 (연결 상태를 들고 있음)'],
  ['직접 만들 코드 양', '적음', '보통', '적음', '많음'],
]

const SHORT: Record<Method, string> = { poll: '폴링', long: '롱폴링', sse: 'SSE', ws: '웹소켓' }
function MethodDetail() {
  const [m, setM] = useState<Method>('sse')
  const d = DETAIL[m], name = SHORT[m]
  return (
    <div className="fe-md">
      <div className="fe-row">
        <Seg value={m} onChange={setM} options={METHODS.map(x => [x.id, SHORT[x.id]] as const)} />
      </div>
      <div className="fe-md-card" aria-live="polite">
        <p className="fe-md-how"><b>{name}</b>{d.how}</p>
        <div className="fe-md-block">
          <h5>어떻게 움직이나</h5>
          <ol className="fe-md-steps">{d.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
        <div className="fe-md-pc">
          <div className="fe-md-block"><h5>장점</h5><ul>{d.pros.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          <div className="fe-md-block"><h5>단점</h5><ul>{d.cons.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
        <div className="fe-md-pc">
          <div className="fe-md-block">
            <h5>안전관리 화면에서는</h5>
            <p>{d.safety}</p>
            <h5>만들 때 조심할 점</h5>
            <ul>{d.traps.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <CodeBlock label={`TypeScript · ${name} 기본 모양`} code={d.code} maxHeight={360} />
        </div>
      </div>
    </div>
  )
}

function MethodCompare() {
  return (
    <div className="sys-table-wrap">
      <table className="sys-table fe-cmp">
        <thead><tr><th>항목</th><th>폴링</th><th>롱폴링</th><th>SSE</th><th>웹소켓</th></tr></thead>
        <tbody>{COMPARE.map(r => <tr key={r[0]}>{r.map((c, i) => i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

const PICK: [string, string][] = [
  ['몇 분에 한 번 바뀌는 지표뿐이에요', '폴링. 가장 단순하고 고장 날 곳이 적어요.'],
  ['서버가 알려 주기만 하면 돼요 (알람·센서값)', 'SSE. 재연결과 놓친 구간 받기가 표준에 있어요.'],
  ['브라우저도 1초에 여러 번 보내요 (확인·구독 변경·함께 편집)', '웹소켓. 대신 재연결·하트비트·놓친 구간을 직접 만들어요.'],
  ['SSE·웹소켓이 막힌 망이에요', '롱폴링. 마지막 번호(since)를 꼭 같이 보내요.'],
]
function MethodPick() {
  return (
    <div className="fe-pick">
      <h5>무엇을 고를까 — 질문 하나로</h5>
      <dl>{PICK.map(([q, a]) => <div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}</dl>
    </div>
  )
}

/* ================= 2. 재연결: 지수 백오프 + 지터 ================= */
type Strat = 'fixed' | 'exp' | 'jitter'
const STRAT_N: Record<Strat, string> = { fixed: '1초마다 고정', exp: '지수 백오프', jitter: '지수 백오프 + 지터' }
function herd(st: Strat, down: number) {
  const r = rng(77), N = 40, H = 60
  const rows: number[][] = []
  let total = 0, lastOk = 0
  for (let c = 0; c < N; c++) {
    let t = r() * 0.4, n = 0
    const at: number[] = []
    while (t < H) {
      const base = Math.min(30, 2 ** n)
      t += st === 'fixed' ? 1 : st === 'exp' ? base : r() * base
      at.push(t); total++; n++
      if (t >= down) { lastOk = Math.max(lastOk, t); break }
    }
    rows.push(at)
  }
  const bins = new Array(H).fill(0)
  rows.flat().forEach(t => { if (t < H) bins[Math.floor(t)]++ })
  return { rows, bins, total, peak: Math.max(...bins), lastOk }
}
function Herd() {
  const [st, setSt] = useState<Strat>('exp')
  const [down, setDown] = useState(20)
  const h = useMemo(() => herd(st, down), [st, down])
  const W = 1000, X0 = 40, x = (t: number) => X0 + (t / 60) * (W - X0 - 10)
  const bmax = Math.max(40, h.peak)
  return (
    <div className="fe-herd">
      <div className="fe-row">
        <Seg value={st} onChange={setSt} options={(Object.keys(STRAT_N) as Strat[]).map(k => [k, STRAT_N[k]] as const)} />
        <label className="fe-inline">서버 장애 시간 <b>{down}초</b><Range value={down} min={5} max={45} onChange={setDown} label="서버 장애 시간" style={{ width: 160 }} /></label>
      </div>
      <div className="fe-scroll">
        <svg viewBox={`0 0 ${W} 300`} className="fe-herd-svg" role="img" aria-label={`상황실 화면 40대의 재접속 시도. 총 ${h.total}번, 가장 붐빈 1초에 ${h.peak}번.`}>
          <rect className="down" x={x(0)} y={4} width={x(down) - x(0)} height={176} />
          <text className="ax" x={x(down / 2)} y={18} textAnchor="middle">서버 장애</text>
          {h.rows.map((row, c) => row.map((t, i) => t < 60 && <circle key={c + '-' + i} className={'try' + (t >= down ? ' ok' : '')} cx={x(t)} cy={26 + c * 3.8} r={t >= down ? 2.6 : 1.8} />))}
          {h.bins.map((v, i) => <rect key={i} className={'bin' + (i === Math.floor(down) ? ' rec' : '')} x={x(i) + 1} width={Math.max(1, x(1) - x(0) - 2)} y={290 - (v / bmax) * 96} height={(v / bmax) * 96} />)}
          <line className="axl" x1={X0} x2={W - 10} y1={290} y2={290} />
          {[0, 10, 20, 30, 40, 50, 60].map(t => <text key={t} className="ax" x={x(t)} y={300} textAnchor="middle">{t}초</text>)}
          <text className="ax" x={4} y={200}>1초당</text><text className="ax" x={4} y={212}>시도</text>
        </svg>
      </div>
      <div className="fe-kv" aria-live="polite">
        <span>총 재접속 시도 <b>{h.total}번</b></span>
        <span>가장 붐빈 1초 <b>{h.peak}번</b></span>
        <span>모두 다시 붙은 시각 <b>{h.lastOk.toFixed(1)}초</b></span>
      </div>
      <p className="fe-p">{st === 'fixed' ? '1초마다 다시 접속하면 장애 내내 서버를 두드려요. 화면이 수백 대라면 서버가 살아나자마자 다시 쓰러질 수 있어요.'
        : st === 'exp' ? '기다리는 간격을 1초, 2초, 4초…처럼 두 배씩 늘리면 시도 수는 줄어요. 하지만 같은 순간에 끊긴 화면들은 같은 순간에 다시 몰려요(그래프의 세로 줄무늬).'
        : '기다리는 시간에 무작위 값(지터)을 섞으면 몰림이 흩어져요. 시도 수도 적고, 가장 붐빈 1초의 시도 수도 낮아요.'}</p>
    </div>
  )
}

interface Pt { seq: number; v: number; late?: boolean; fake?: boolean }
type Gap = 'resync' | 'blank' | 'fill'
const GAP_N: Record<Gap, string> = { resync: '놓친 구간 다시 받기', blank: '빈칸으로 두기', fill: '더미 값으로 채우기' }
const valAt = (seq: number) => { const r = rng(seq * 9301 + 49297); return +(6 + Math.sin(seq / 7) * 2 + (r() - 0.5) * 1).toFixed(1) }
function LiveReconnect() {
  const [on, setOn] = useState(true)
  const [gap, setGap] = useState<Gap>('resync')
  const [marks, setMarks] = useState(true)
  const s = useRef({ t: 60, downUntil: 0, conn: true, attempt: 0, nextAt: 0, lastSeq: 60, data: Array.from({ length: 60 }, (_, i) => ({ seq: i + 1, v: valAt(i + 1) })) as Pt[], log: [] as string[], r: rng(42) })
  const [, force] = useState(0)
  const delay = (n: number) => { const d = Math.min(16, 2 ** n); return d / 2 + s.current.r() * (d / 2) }
  const ref = useVisibleInterval(() => {
    const c = s.current
    c.t += 0.25
    const up = c.t >= c.downUntil, seqNow = Math.floor(c.t)
    const log = (m: string) => { c.log = [`${seqNow.toString().padStart(4, '0')}  ${m}`, ...c.log].slice(0, 6) }
    if (c.conn) {
      if (!up) { c.conn = false; c.attempt = 0; c.nextAt = c.t + delay(0); log(`연결 끊김 감지 · 재시도 #1 ${(c.nextAt - c.t).toFixed(1)}초 뒤`) }
      else if (seqNow > c.lastSeq) { c.data.push({ seq: seqNow, v: valAt(seqNow) }); c.lastSeq = seqNow }
    } else if (c.t >= c.nextAt) {
      if (up) {
        const missed = seqNow - c.lastSeq - 1
        if (gap === 'resync' && missed > 0) {
          for (let q = c.lastSeq + 1; q < seqNow; q++) c.data.push({ seq: q, v: valAt(q), late: true })
          log(`연결됨 · ${c.lastSeq}번 이후 요청(since) → 놓친 ${missed}개 받음`)
        } else if (gap === 'fill' && missed > 0) {
          const lv = c.data.find(p => p.seq === c.lastSeq)?.v ?? valAt(c.lastSeq)
          for (let q = c.lastSeq + 1; q < seqNow; q++) c.data.push({ seq: q, v: lv, fake: true })
          log(`연결됨 · 놓친 ${missed}개를 마지막 값 ${lv}로 채움 (더미)`)
        } else log(missed > 0 ? `연결됨 · 놓친 ${missed}개는 빈칸으로 남음` : '연결됨')
        c.data.push({ seq: seqNow, v: valAt(seqNow) }); c.lastSeq = seqNow; c.conn = true
      } else { c.attempt++; c.nextAt = c.t + delay(c.attempt); log(`재시도 #${c.attempt} 실패 · 다음 ${(c.nextAt - c.t).toFixed(1)}초 뒤`) }
    }
    c.data = c.data.filter(p => p.seq > seqNow - 60) // 최근 60초만 (링버퍼처럼)
    force(v => v + 1)
  }, 250, on)
  const c = s.current, seqNow = Math.floor(c.t)
  const W = 600, H = 150, x = (q: number) => 10 + ((q - (seqNow - 59)) / 59) * (W - 20), y = (v: number) => 10 + (1 - v / 12) * (H - 20)
  const sorted = [...c.data].sort((a, b) => a.seq - b.seq)
  const path = (ps: Pt[]) => { let d = ''; ps.forEach((p, i) => { d += (i && ps[i - 1].seq === p.seq - 1 ? 'L' : 'M') + x(p.seq).toFixed(1) + ',' + y(p.v).toFixed(1) }); return d }
  // 점 표시를 켜면 더미 구간은 진짜 선과 떼어 점선으로 그려요. 끄면 흔한 화면처럼 한 줄로 이어져요.
  const real = marks ? sorted.filter(p => !p.fake) : sorted
  const fakeRuns: Pt[][] = []
  if (marks) sorted.forEach((p, i) => {
    if (!p.fake) return
    const prev = sorted[i - 1], run = fakeRuns[fakeRuns.length - 1]
    if (prev?.fake && run) run.push(p)
    else fakeRuns.push(prev ? [prev, p] : [p])
    const next = sorted[i + 1]
    if (next && !next.fake) fakeRuns[fakeRuns.length - 1].push(next)
  })
  const nFake = sorted.filter(p => p.fake).length, nLate = sorted.filter(p => p.late).length
  return (
    <div className="fe-live" ref={ref}>
      <div className="fe-row">
        <button type="button" className="btn sm" disabled={!c.conn || c.downUntil > c.t} onClick={() => { c.downUntil = c.t + 10; force(v => v + 1) }}>통신 10초 끊기</button>
        <Seg value={gap} onChange={setGap} options={(Object.keys(GAP_N) as Gap[]).map(k => [k, GAP_N[k]] as const)} />
        <button type="button" className="chip" aria-pressed={marks} onClick={() => setMarks(v => !v)}>점으로 값의 출처 표시</button>
        <button type="button" className="btn sm ghost" onClick={() => setOn(v => !v)}>{on ? '시뮬레이션 멈춤' : '다시 시작'}</button>
      </div>
      <Hmi title={`화학물질 창고 가연성 가스(${LEL.unit}) · 최근 60초`} right={c.conn ? <>연결됨 · 마지막 번호(seq) {c.lastSeq}</> : <b className="fe-bad">끊김 · 재시도 #{c.attempt + 1} {Math.max(0, c.nextAt - c.t).toFixed(1)}초 뒤</b>}>
        <div className="fe-live-grid">
          <svg viewBox={`0 0 ${W} ${H}`} className={'fe-live-svg' + (c.conn ? '' : ' stale')} role="img" aria-label={`최근 60초 가연성 가스 추세. 다시 받은 값 ${nLate}개, 더미로 채운 값 ${nFake}개.`}>
            {!c.conn && <rect className="hatch" x={x(c.lastSeq)} y={0} width={W - x(c.lastSeq)} height={H} />}
            <path className="ln" d={path(real)} />
            {fakeRuns.map((r, i) => <path key={i} className="fake" d={path(r)} />)}
            {marks && sorted.map(p => p.fake
              ? <path key={p.seq} className="fk" d={`M${x(p.seq) - 2.4},${y(p.v) - 2.4}l4.8,4.8m0,-4.8l-4.8,4.8`} />
              : <circle key={p.seq} className={p.late ? 'late' : 'pt'} cx={x(p.seq)} cy={y(p.v)} r={p.late ? 2.6 : 1.7} />)}
          </svg>
          <ol className="fe-log" aria-live="polite">{c.log.length ? c.log.map((l, i) => <li key={i}>{l}</li>) : <li className="muted">‘통신 10초 끊기’를 눌러 보세요</li>}</ol>
        </div>
      </Hmi>
      <ul className="fe-legend" aria-label="점의 뜻">
        <li><svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="2.4" className="pt" /></svg>작은 점 · 제때 실시간으로 받은 값</li>
        <li><svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="3.4" className="late" /></svg>속이 빈 점 · 끊긴 구간을 재연결 뒤 서버에서 다시 받은 진짜 값</li>
        <li><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.6,3.6l6.8,6.8m0,-6.8l-6.8,6.8" className="fk" /></svg>엑스 표시 · 받지 못해 화면이 마지막 값으로 채운 더미 값</li>
        <li><svg viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="3" width="12" height="8" className="hatch" /></svg>빗금 · 지금 끊겨서 값이 들어오지 않는 구간</li>
      </ul>
    </div>
  )
}

/* ================= 3. 대량 시계열 그리기 (실측) ================= */
type Rend = 'svg' | 'canvas'
type Ds = 'none' | 'nth' | 'minmax' | 'lttb'
const DS_N: Record<Ds, string> = { none: '원본 그대로', nth: 'n개마다 1개', minmax: '구간별 최소·최대', lttb: 'LTTB' }
const SIZES = [1_000, 10_000, 100_000] as const
const TH = 1600 // 그릴 점 수 목표 ≈ 화면 폭(px) × 2
interface Series { x: Float64Array; y: Float64Array; lo: number; hi: number; spikeAt: number }
const cache = new Map<number, Series>()
function getSeries(n: number): Series {
  const hit = cache.get(n); if (hit) return hit
  const r = rng(n), x = new Float64Array(n), y = new Float64Array(n)
  let drift = 0
  for (let i = 0; i < n; i++) {
    drift = drift * 0.995 + (r() - 0.5) * 0.6
    x[i] = i; y[i] = 62 + Math.sin((i / n) * Math.PI * 4) * 12 + drift + (r() - 0.5) * 3
  }
  const spikeAt = Math.floor(n * 0.618)
  y[spikeAt] += 34; y[spikeAt + 1] += 18 // 설비 충돌 순간 짧은 진동 급등
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < n; i++) { if (y[i] < lo) lo = y[i]; if (y[i] > hi) hi = y[i] }
  const s = { x, y, lo, hi, spikeAt }; cache.set(n, s); return s
}
function nth(s: Series, th: number) {
  const k = Math.ceil(s.x.length / th); if (k <= 1) return { x: s.x, y: s.y }
  const m = Math.ceil(s.x.length / k), x = new Float64Array(m), y = new Float64Array(m)
  for (let i = 0, j = 0; i < s.x.length; i += k, j++) { x[j] = s.x[i]; y[j] = s.y[i] }
  return { x, y }
}
function minmax(s: Series, th: number) {
  const n = s.x.length; if (n <= th) return { x: s.x, y: s.y }
  const b = Math.floor(th / 2), size = n / b, x = new Float64Array(b * 2), y = new Float64Array(b * 2)
  for (let i = 0; i < b; i++) {
    const a = Math.floor(i * size), e = Math.min(n, Math.floor((i + 1) * size))
    let mi = a, ma = a
    for (let j = a; j < e; j++) { if (s.y[j] < s.y[mi]) mi = j; if (s.y[j] > s.y[ma]) ma = j }
    const [p, q] = mi < ma ? [mi, ma] : [ma, mi]
    x[i * 2] = s.x[p]; y[i * 2] = s.y[p]; x[i * 2 + 1] = s.x[q]; y[i * 2 + 1] = s.y[q]
  }
  return { x, y }
}
/** Largest-Triangle-Three-Buckets (Steinarsson 2013) */
function lttb(s: Series, th: number) {
  const { x: xs, y: ys } = s, n = xs.length
  if (th >= n || th < 3) return { x: xs, y: ys }
  const ox = new Float64Array(th), oy = new Float64Array(th), every = (n - 2) / (th - 2)
  let a = 0, k = 1
  ox[0] = xs[0]; oy[0] = ys[0]
  for (let i = 0; i < th - 2; i++) {
    const s0 = Math.floor((i + 1) * every) + 1, e0 = Math.min(Math.floor((i + 2) * every) + 1, n)
    let ax = 0, ay = 0
    for (let j = s0; j < e0; j++) { ax += xs[j]; ay += ys[j] }
    ax /= (e0 - s0) || 1; ay /= (e0 - s0) || 1
    const rs = Math.floor(i * every) + 1, re = Math.floor((i + 1) * every) + 1
    let best = -1, next = rs
    for (let j = rs; j < re; j++) {
      const area = Math.abs((xs[a] - ax) * (ys[j] - ys[a]) - (xs[a] - xs[j]) * (ay - ys[a]))
      if (area > best) { best = area; next = j }
    }
    ox[k] = xs[next]; oy[k] = ys[next]; k++; a = next
  }
  ox[k] = xs[n - 1]; oy[k] = ys[n - 1]
  return { x: ox, y: oy }
}
const DS_FN: Record<Ds, (s: Series, th: number) => { x: Float64Array; y: Float64Array }> = { none: s => ({ x: s.x, y: s.y }), nth, minmax, lttb }
interface Run { n: number; rend: Rend; ds: Ds; pts: number; tDs: number; tDraw: number; tFrame: number; spike: boolean }
const BW = 800, BH = 220
const nextPaint = () => new Promise<void>(res => requestAnimationFrame(() => setTimeout(res, 0)))
const fmtN = (n: number) => n.toLocaleString('ko-KR')

function Bench() {
  const [n, setN] = useState<number>(10_000)
  const [rend, setRend] = useState<Rend>('svg')
  const [ds, setDs] = useState<Ds>('none')
  const [runs, setRuns] = useState<Run[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [shown, setShown] = useState<Rend>('svg')
  const pathRef = useRef<SVGPathElement>(null)
  const canRef = useRef<HTMLCanvasElement>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const once = async (N: number, R: Rend, D: Ds): Promise<Run | null> => {
    const s = getSeries(N)
    const sx = BW / (N - 1), sy = (BH - 20) / (s.hi - s.lo)
    flushSync(() => setShown(R)) // 그릴 요소를 먼저 보이게 (크기 계산용)
    const t0 = performance.now()
    const p = DS_FN[D](s, TH)
    const t1 = performance.now()
    if (R === 'svg') {
      const el = pathRef.current; if (!el) return null
      let d = ''
      for (let i = 0; i < p.x.length; i++) d += (i ? 'L' : 'M') + (p.x[i] * sx).toFixed(1) + ',' + (BH - 10 - (p.y[i] - s.lo) * sy).toFixed(1)
      el.setAttribute('d', d)
      el.getBBox() // 도형 계산을 여기서 끝내게
    } else {
      const cv = canRef.current; if (!cv) return null
      const dpr = window.devicePixelRatio || 1
      const w = cv.clientWidth || BW
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * BH / BW) }
      const ctx = cv.getContext('2d'); if (!ctx) return null
      const k = cv.width / BW
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, BW, BH)
      ctx.strokeStyle = getComputedStyle(cv).color; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i < p.x.length; i++) { const X = p.x[i] * sx, Y = BH - 10 - (p.y[i] - s.lo) * sy; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y) }
      ctx.stroke()
    }
    const t2 = performance.now()
    await nextPaint()
    const t3 = performance.now()
    let spike = false
    for (let i = 0; i < p.y.length; i++) if (p.y[i] >= s.hi - 0.001) { spike = true; break }
    return { n: N, rend: R, ds: D, pts: p.x.length, tDs: t1 - t0, tDraw: t2 - t1, tFrame: t3 - t1, spike }
  }
  const measure = async () => {
    setBusy('측정 중')
    await nextPaint()
    const r = await once(n, rend, ds)
    if (alive.current) { if (r) setRuns(a => [r, ...a].slice(0, 14)); setBusy(null) }
  }
  const all = async () => {
    const combos: [number, Rend, Ds][] = []
    for (const N of SIZES) for (const R of ['svg', 'canvas'] as Rend[]) for (const D of ['none', 'lttb'] as Ds[]) combos.push([N, R, D])
    const out: Run[] = []
    for (let i = 0; i < combos.length; i++) {
      if (!alive.current) return
      setBusy(`전체 비교 ${i + 1}/${combos.length}`)
      await new Promise(res => setTimeout(res, 40)) // 사이사이 숨 쉴 틈 — 화면이 멈춘 것처럼 보이지 않게
      const r = await once(...combos[i]); if (r) out.push(r)
    }
    if (alive.current) { setRuns(out.reverse()); setBusy(null) }
  }
  const maxT = Math.max(16, ...runs.map(r => r.tFrame))
  const last = runs[0]
  return (
    <div className="fe-bench">
      <div className="fe-bench-ctl">
        <div><span>점 개수</span><Seg value={n} onChange={setN} options={SIZES.map(v => [v, fmtN(v)] as const)} /></div>
        <div><span>그리는 방식</span><Seg value={rend} onChange={setRend} options={[['svg', 'SVG'], ['canvas', 'Canvas']]} /></div>
        <div><span>다운샘플링</span><Seg value={ds} onChange={setDs} options={(Object.keys(DS_N) as Ds[]).map(k => [k, DS_N[k]] as const)} /></div>
      </div>
      <div className="fe-row">
        <button type="button" className="btn sm" disabled={!!busy} onClick={measure}>이 설정으로 그리고 재기</button>
        <button type="button" className="btn sm ghost" disabled={!!busy} onClick={all}>전체 비교 (12가지)</button>
        <button type="button" className="btn sm ghost" disabled={!!busy || !runs.length} onClick={() => setRuns([])}>기록 지우기</button>
        <span className="muted" aria-live="polite">{busy ?? (n === 100_000 && ds === 'none' ? '10만 개 원본은 기기에 따라 잠깐 멈칫할 수 있어요.' : '버튼을 누를 때만 그려요.')}</span>
      </div>
      <Hmi title={`프레스 라인 3호기 진동 · ${last ? fmtN(last.n) : fmtN(n)}개 측정값 (가상)`} right={last ? <>그린 점 {fmtN(last.pts)}개 · {last.rend === 'svg' ? 'SVG' : 'Canvas'} · {DS_N[last.ds]}</> : '아직 그리지 않았어요'}>
        <div className="fe-bench-stage">
          <svg viewBox={`0 0 ${BW} ${BH}`} className="fe-bench-svg" style={{ display: shown === 'svg' ? 'block' : 'none' }} aria-hidden="true"><path ref={pathRef} /></svg>
          <canvas ref={canRef} className="fe-bench-cv" style={{ display: shown === 'canvas' ? 'block' : 'none' }} aria-hidden="true" />
          {last && <span className={'fe-spike' + (last.spike ? '' : ' lost')}>{last.spike ? '충돌 순간 최댓값이 보여요' : '충돌 순간 최댓값이 사라졌어요'}</span>}
        </div>
      </Hmi>
      {runs.length > 0 && (
        <div className="sys-table-wrap">
          <table className="sys-table fe-runs">
            <thead><tr><th>측정값 수</th><th>방식</th><th>다운샘플링</th><th>그린 점</th><th>점 줄이기</th><th>그리기</th><th>다음 화면까지</th><th>최댓값</th></tr></thead>
            <tbody>
              {runs.map((r, i) => (
                <tr key={i}>
                  <td>{fmtN(r.n)}</td><td>{r.rend === 'svg' ? 'SVG' : 'Canvas'}</td><td>{DS_N[r.ds]}</td><td>{fmtN(r.pts)}</td>
                  <td className="num">{r.tDs.toFixed(1)}ms</td><td className="num">{r.tDraw.toFixed(1)}ms</td>
                  <td><span className="fe-bar"><i style={{ width: Math.max(2, (r.tFrame / maxT) * 100) + '%' }} className={r.tFrame > 50 ? 'slow' : ''} /><b>{r.tFrame.toFixed(1)}ms</b></span></td>
                  <td>{r.spike ? '남음' : <b className="fe-bad">사라짐</b>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="fe-p">‘다음 화면까지’는 점 줄이기, 그리기, 브라우저가 화면에 실제로 보여 주기까지 모두 더한 시간이에요. 이 브라우저에서 <b>지금 실제로 잰 값</b>이라 기기·브라우저마다 달라요. 50ms(0.05초)를 넘으면 막대가 진해져요.</p>
    </div>
  )
}

/* ================= 4. 업데이트 묶기 ================= */
type BMode = 'each' | 'raf' | 'skip'
const BMODE_N: Record<BMode, string> = { each: '메시지마다 렌더', raf: '프레임당 한 번', skip: '프레임당 한 번 + 같으면 건너뛰기' }
function Batching() {
  const [mode, setMode] = useState<BMode>('each')
  const [on, setOn] = useState(false)
  const [vals, setVals] = useState(() => ZONES.map(z => z.base))
  const stats = useRef({ msgs: 0, renders: 0 })
  const [rate, setRate] = useState({ msgs: 0, renders: 0 })
  const pend = useRef<Map<number, number>>(new Map())
  const raf = useRef(0)
  const r = useRef(rng(5))
  const modeRef = useRef(mode); modeRef.current = mode
  useLayoutEffect(() => { stats.current.renders++ })
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const flush = () => {
    raf.current = 0
    const p = pend.current; pend.current = new Map()
    setVals(prev => {
      let changed = false
      const next = prev.map((v, i) => { if (!p.has(i)) return v; const nv = p.get(i)!; if (modeRef.current === 'skip' && Math.round(nv) === Math.round(v)) return v; changed = true; return nv })
      return changed || modeRef.current !== 'skip' ? next : prev
    })
  }
  const feed = useVisibleInterval(() => {
    for (let k = 0; k < 4; k++) { // 16ms마다 4건 ≈ 초당 250건
      const i = Math.floor(r.current() * ZONES.length)
      const v = ZONES[i].base + (r.current() - 0.5) * 1.3
      stats.current.msgs++
      if (modeRef.current === 'each') flushSync(() => setVals(prev => prev.map((x, j) => (j === i ? v : x))))
      else { pend.current.set(i, v); if (!raf.current) raf.current = requestAnimationFrame(flush) }
    }
  }, 16, on)
  const meter = useVisibleInterval(() => { setRate({ ...stats.current }); stats.current = { msgs: 0, renders: 0 } }, 1000, on)
  return (
    <div className="fe-batch" ref={feed}>
      <div className="fe-row" ref={meter}>
        <Seg value={mode} onChange={setMode} options={(Object.keys(BMODE_N) as BMode[]).map(k => [k, BMODE_N[k]] as const)} />
        <button type="button" className="btn sm" onClick={() => { setOn(v => !v); setRate({ msgs: 0, renders: 0 }) }}>{on ? '멈추기' : '메시지 보내기 시작'}</button>
      </div>
      <div className="fe-batch-grid">
        <Hmi title="구역 9곳 대표 센서 · 경보 기준 대비" right="초당 약 250건 수신">
          <ul className="fe-bars">
            {ZONES.map((f, i) => (
              <li key={f.id}><span>{f.name}</span><i><b style={{ width: Math.min(100, vals[i]) + '%' }} /></i><em>{Math.round(vals[i])}%</em></li>
            ))}
          </ul>
        </Hmi>
        <div className="fe-meter" aria-live="off">
          <div><small>받은 메시지 / 초</small><b>{on ? rate.msgs : '—'}</b></div>
          <div><small>React 렌더 / 초</small><b className={on && rate.renders > 90 ? 'fe-bad' : ''}>{on ? rate.renders : '—'}</b></div>
          <p>{mode === 'each' ? '메시지가 올 때마다 바로 다시 그리게(flushSync) 했어요. 그래서 렌더 수가 메시지 수만큼 늘어요. 모니터는 보통 1초에 60번쯤 화면을 바꿔요. 그보다 많이 그린 건 아무도 못 보는 헛수고예요.'
            : mode === 'raf' ? '메시지는 임시 보관함(버퍼)에 모아 둬요. 그리고 requestAnimationFrame으로 다음 화면을 그리기 직전에 한 번만 반영해요. 렌더 수가 모니터가 1초에 화면을 바꾸는 횟수(주사율) 근처로 떨어져요.'
            : '화면에 보이는 값(소수점 없는 %)이 그대로면 상태를 바꾸지 않아요. 그래서 렌더 자체를 건너뛰어요.'}</p>
        </div>
      </div>
    </div>
  )
}

/* ================= 5. 오래 켜 두는 화면 ================= */
function GrowthChart() {
  const W = 600, H = 190, per = 9 * 3 // 구역 9곳 × 센서 3개, 1초에 1번
  const x = (h: number) => 50 + (h / 12) * (W - 64), maxPts = per * 3600 * 12
  const y = (v: number) => H - 26 - (v / maxPts) * (H - 46)
  const cap = per * 3600
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fe-grow-svg" role="img" aria-label="12시간 근무 동안 메모리에 쌓이는 점 수. 배열에 계속 쌓으면 116만 개, 1시간 링버퍼는 9만 7천 개에서 멈춰요.">
      {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}><line className="grid" x1={50} x2={W - 14} y1={y(maxPts * f)} y2={y(maxPts * f)} /><text className="ax" x={44} y={y(maxPts * f) + 4} textAnchor="end">{Math.round((maxPts * f) / 10000)}만</text></g>)}
      <path className="leak" d={`M${x(0)},${y(0)} L${x(12)},${y(maxPts)}`} />
      <path className="ring" d={`M${x(0)},${y(0)} L${x(1)},${y(cap)} L${x(12)},${y(cap)}`} />
      <text className="lab" x={x(7.6)} y={y(maxPts * 0.63) - 10} textAnchor="end">배열에 계속 push</text>
      <text className="lab" x={x(12)} y={y(cap) - 8} textAnchor="end">1시간 링버퍼</text>
      {[0, 2, 4, 6, 8, 10, 12].map(h => <text key={h} className="ax" x={x(h)} y={H - 8} textAnchor="middle">{h}시간</text>)}
    </svg>
  )
}
function RingBuffer() {
  const N = 16
  const [head, setHead] = useState(5)
  const [seq, setSeq] = useState(5)
  const ref = useVisibleInterval(() => { setHead(h => (h + 1) % N); setSeq(s => s + 1) }, 700, !reduced())
  const slots = Array.from({ length: N }, (_, i) => { const age = (head - 1 - i + N) % N; return seq - age > 0 ? seq - age : null })
  return (
    <div className="fe-ring" ref={ref}>
      <svg viewBox="-80 -80 160 160" className="fe-ring-svg" role="img" aria-label={`칸 ${N}개짜리 링버퍼. 새 값이 가장 오래된 칸을 덮어써요.`}>
        {slots.map((v, i) => {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * 58, y = Math.sin(a) * 58
          const isNew = i === (head - 1 + N) % N, isOld = i === head
          return <g key={i}>
            <circle className={'slot' + (isNew ? ' new' : '') + (isOld ? ' old' : '') + (v === null ? ' empty' : '')} cx={x} cy={y} r={11} />
            <text x={x} y={y + 3.5} textAnchor="middle" className="sv">{v ?? ''}</text>
          </g>
        })}
        <text x={0} y={-4} textAnchor="middle" className="rc">칸 {N}개</text>
        <text x={0} y={12} textAnchor="middle" className="rc2">#{seq} 까지 받음</text>
      </svg>
      <ul className="fe-ring-leg"><li><i className="new" />방금 쓴 칸</li><li><i className="old" />다음에 덮어쓸 가장 오래된 칸</li></ul>
    </div>
  )
}
function PageApis() {
  const [vis, setVis] = useState(() => document.visibilityState)
  const [hid, setHid] = useState(0)
  const [wl, setWl] = useState<'off' | 'on' | 'unsupported' | 'error'>(() => ('wakeLock' in navigator ? 'off' : 'unsupported'))
  const sent = useRef<WakeLockSentinel | null>(null)
  const want = useRef(false)
  useEffect(() => {
    const on = () => {
      setVis(document.visibilityState)
      if (document.visibilityState === 'hidden') setHid(h => h + 1)
      else if (want.current && !sent.current) void lock() // 탭으로 돌아오면 다시 잡기
    }
    document.addEventListener('visibilitychange', on)
    return () => { document.removeEventListener('visibilitychange', on); want.current = false; void sent.current?.release(); sent.current = null }
  }, [])
  const lock = async () => {
    try {
      const s = await navigator.wakeLock.request('screen')
      sent.current = s; setWl('on')
      s.addEventListener('release', () => { sent.current = null; setWl(w => (w === 'on' ? 'off' : w)) })
    } catch { setWl('error'); want.current = false }
  }
  const toggle = async () => {
    if (sent.current) { want.current = false; await sent.current.release(); sent.current = null; setWl('off') }
    else { want.current = true; await lock() }
  }
  return (
    <div className="fe-apis">
      <div className="fe-api">
        <small>document.visibilityState</small>
        <b>{vis === 'visible' ? 'visible — 보이는 중' : 'hidden — 가려짐'}</b>
        <span>이 페이지가 가려진 횟수 <b>{hid}</b>번. 다른 탭을 눌렀다 돌아와 보세요.</span>
        <p>탭이 가려진 동안에는 그리기를 멈춰요. 돌아오면 그동안 쌓인 값을 한 번에 받아 다시 그려요. 이 페이지의 시뮬레이션도 모두 화면에 보일 때만 돌아요.</p>
      </div>
      <div className="fe-api">
        <small>Screen Wake Lock API</small>
        <b>{wl === 'on' ? '화면 꺼짐 방지 켜짐' : wl === 'unsupported' ? '이 브라우저는 지원하지 않아요' : wl === 'error' ? '요청이 거절됐어요' : '화면 꺼짐 방지 꺼짐'}</b>
        <button type="button" className="btn sm" disabled={wl === 'unsupported'} onClick={toggle} aria-pressed={wl === 'on'}>{wl === 'on' ? '해제하기' : '화면 꺼짐 방지 켜기'}</button>
        <p>안전관리 상황실 화면은 절전 모드로 꺼지면 안 돼요. 탭이 가려지면 브라우저가 화면 꺼짐 방지를 자동으로 풀어요. 그래서 돌아왔을 때 다시 요청해요(이 데모도 그렇게 해요). 브라우저가 지원하지 않으면 운영체제 전원 설정으로 막아요.</p>
      </div>
    </div>
  )
}

/* ================= 6. 시간: 서버 시각 기준 ================= */
function ClockSkew() {
  const [off, setOff] = useState(-90) // 이 PC 시계가 서버보다 몇 초 틀렸나
  const [now, setNow] = useState(() => Date.now())
  const ref = useVisibleInterval(() => setNow(Date.now()), 1000)
  const base = useRef(Date.now() - 75_000) // 마지막 데이터가 서버 시각으로 75초 전에 도착
  const rtt = 0.12
  const client = now + off * 1000
  // NTP 방식: t0 보냄(클라) t1 받음(서버) t2 보냄(서버) t3 받음(클라)
  const t0 = 0, t1 = -off + rtt / 2, t2 = t1 + 0.01, t3 = rtt + 0.01
  const est = ((t1 - t0) + (t2 - t3)) / 2
  const ago = (ms: number) => { const s = Math.round(ms / 1000); if (s < 0) return `${-s}초 뒤(미래)`; if (s < 5) return '방금'; return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초 전` : `${s}초 전` }
  const fmt = (ms: number, tz?: string) => new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz }).format(ms)
  const naive = client - base.current, fixed = client + est * 1000 - base.current
  return (
    <div className="fe-clock" ref={ref}>
      <label className="fe-inline">이 PC 시계 오차 <b>{off > 0 ? '+' : ''}{off}초{off < 0 ? ' (느림)' : off > 0 ? ' (빠름)' : ''}</b><Range value={off} min={-180} max={180} step={15} onChange={setOff} label="PC 시계 오차" style={{ width: 200 }} /></label>
      <div className="fe-clock-grid">
        <div className="fe-ntp">
          <svg viewBox="0 0 300 130" role="img" aria-label="시각 맞추기: 네 번의 시각 기록으로 서버와의 차이를 계산해요">
            <line className="lane" x1={40} x2={290} y1={30} y2={30} /><line className="lane" x1={40} x2={290} y1={100} y2={100} />
            <text className="ax" x={4} y={34}>브라우저</text><text className="ax" x={4} y={104}>서버</text>
            <line className="ar" x1={70} y1={30} x2={140} y2={100} /><line className="ar" x1={160} y1={100} x2={230} y2={30} />
            <text className="tk" x={70} y={20} textAnchor="middle">t0</text><text className="tk" x={140} y={118} textAnchor="middle">t1</text>
            <text className="tk" x={160} y={118} textAnchor="middle">t2</text><text className="tk" x={230} y={20} textAnchor="middle">t3</text>
          </svg>
          <p>차이 = ((t1 − t0) + (t2 − t3)) ÷ 2 <Cite n={8} /><br />계산한 차이 <b>{est > 0 ? '+' : ''}{est.toFixed(1)}초</b> (오가는 시간 {Math.round(rtt * 1000)}ms 가정)</p>
        </div>
        <Hmi title="마지막 갱신" right={`서버 ${fmt(now, 'Asia/Seoul')}`}>
          <div className="fe-ago">
            <div className="bad"><small>PC 시계로 계산</small><b>{ago(naive)}</b><span>PC 시각 {fmt(client, 'Asia/Seoul')}</span></div>
            <div><small>서버 시각으로 보정</small><b>{ago(fixed)}</b><span>갱신 {fmt(base.current, 'Asia/Seoul')} (KST)</span></div>
          </div>
        </Hmi>
      </div>
      <p className="fe-p">PC 시계가 느리면 오래된 값이 방금 들어온 것처럼 보여요. 안전관리 화면에서 가장 위험한 건 <b>멈춘 화면이 정상처럼 보이는 것</b>이에요(05 탭). 그래서 기준 시각은 서버가 정해요. 브라우저는 서버와의 차이만 계산해서 고쳐 보여줘요. 화면에 표시할 땐 <code>Asia/Seoul</code>처럼 시간대를 정해 둬요. 기록을 남기거나 <Term k="API" />로 주고받을 땐 <code>2026-11-08T14:02:08+09:00</code>처럼 시간대가 붙은 형식을 써요.</p>
    </div>
  )
}

/* ================= 7. 접근성 ================= */
interface Ann { p: Pri; t: string; how: string }
const ANN_TEXT: Record<Pri, string> = {
  1: `긴급 알람, ${SAFE_ALARMS[0].where.replace(' · ', ' ')}, ${SAFE_ALARMS[0].what}`,
  2: `높음 알람, ${SAFE_ALARMS[2].where.replace(' · ', ' ')}, 가연성 가스 12%LEL`,
  3: `주의 알람, ${SAFE_ALARMS[4].where.replace(' · ', ' ')}, ${SAFE_ALARMS[4].what}`,
}
function A11yDemo() {
  const [list, setList] = useState<{ id: number; p: Pri; ack: boolean }[]>([])
  const [said, setSaid] = useState<Ann[]>([])
  const [assertive, setAssertive] = useState('')
  const [polite, setPolite] = useState('')
  const [calm, setCalm] = useState(false)
  const id = useRef(0)
  const raise = (p: Pri) => {
    id.current++
    setList(l => [{ id: id.current, p, ack: false }, ...l].slice(0, 5))
    if (p === 1) { setAssertive(''); requestAnimationFrame(() => setAssertive(ANN_TEXT[1])) }
    if (p === 2) { setPolite(''); requestAnimationFrame(() => setPolite(ANN_TEXT[2])) }
    setSaid(s => [{ p, t: ANN_TEXT[p], how: p === 1 ? 'assertive — 읽던 것을 끊고 바로 읽어요' : p === 2 ? 'polite — 지금 읽던 문장이 끝나면 읽어요' : '읽지 않아요 — 목록에만 추가' }, ...s].slice(0, 4))
  }
  return (
    <div className="fe-a11y">
      <div className="fe-sr" aria-live="assertive" aria-atomic="true">{assertive}</div>
      <div className="fe-sr" aria-live="polite" aria-atomic="true">{polite}</div>
      <div className="fe-row">
        {([1, 2, 3] as Pri[]).map(p => <button key={p} type="button" className="btn sm ghost fe-raise" onClick={() => raise(p)}><PriBadge p={p} /> 알람 발생</button>)}
        <button type="button" className="chip" aria-pressed={calm} onClick={() => setCalm(v => !v)}>‘동작 줄이기’ 켠 것처럼 보기</button>
      </div>
      <div className="fe-a11y-grid">
        <Hmi title="알람 목록" right={`${list.filter(a => !a.ack).length}건 미확인`}>
          <ul className={'fe-alist' + (calm ? ' calm' : '')}>
            {list.length === 0 && <li className="empty">위 버튼으로 알람을 만들어 보세요</li>}
            {list.map(a => (
              <li key={a.id} className={(a.ack ? 'ack' : 'unack') + ' p' + a.p}>
                <PriBadge p={a.p} /><span className="tx">{ANN_TEXT[a.p].split(', ').slice(1).join(', ')}</span>
                {!a.ack && <em className="tag">미확인</em>}
                {!a.ack && <button type="button" className="btn sm ghost" onClick={() => setList(l => l.map(x => (x.id === a.id ? { ...x, ack: true } : x)))}>확인</button>}
              </li>
            ))}
          </ul>
        </Hmi>
        <div className="fe-said">
          <b>스크린 리더(화면 낭독기)가 읽는 내용 (흉내)</b>
          <ol>{said.length ? said.map((s, i) => <li key={i}><PriBadge p={s.p} /><span>“{s.t}”<small>{s.how}</small></span></li>) : <li className="muted">아직 없어요</li>}</ol>
        </div>
      </div>
      <p className="fe-p">미확인 알람은 1초에 한 번 깜빡여요. 기준은 초당 3회 이하예요 <Cite n={7} />. 운영체제에서 ‘동작 줄이기’를 켰거나 위 버튼을 누르면 깜빡이지 않아요. 대신 굵은 테두리와 ‘미확인’ 글자로만 구분해요. 깜빡임이 없어도 상태를 알 수 있어야 해요.</p>
    </div>
  )
}

/* ================= 8. 체크리스트 ================= */
const CHECK: { g: string; items: string[] }[] = [
  { g: '연결', items: ['서버가 보내는 일이 대부분이면 SSE, 브라우저도 자주 보내면 웹소켓을 골랐다', '재연결은 지수 백오프 + 지터로 하고, 최대 대기 간격을 정했다', '메시지마다 순서 번호(seq)가 있고, 재연결 때 마지막 번호 이후를 다시 받는다', '끊긴 동안 화면에 끊김 배너와 마지막 갱신 시각을 보여준다'] },
  { g: '그리기', items: ['점이 화면 폭보다 훨씬 많으면 최대·최소를 지키는 다운샘플링을 쓴다', '수천 개가 넘는 점은 Canvas로 그린다(또는 실제로 재 보고 정했다)', '갱신은 requestAnimationFrame으로 프레임당 한 번 반영한다', '보이는 값이 같으면 렌더하지 않는다'] },
  { g: '오래 켜 두기', items: ['구독·타이머·이벤트 리스너를 모두 정리(cleanup)한다', '시계열은 링버퍼로 최근 N개만 메모리에 둔다', '탭이 가려지면 그리기를 멈추고, 돌아오면 다시 받는다', '화면 꺼짐 방지(Wake Lock)를 쓰고, 돌아올 때 다시 요청한다', '8시간 이상 켜 두고 메모리 그래프를 확인했다'] },
  { g: '시간 · 접근성', items: ['표시 시각은 서버 기준으로 보정하고 시간대를 정했다', '긴급 알람만 aria-live="assertive", 나머지는 polite 또는 없음', '깜빡임은 초당 3회 이하, 동작 줄이기 설정이면 멈춘다', '우선순위는 색 + 모양 + 글자로 구분한다'] },
]
function Checklist() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const tot = CHECK.reduce((a, g) => a + g.items.length, 0), n = Object.values(on).filter(Boolean).length
  const md = useMemo(() => ['# 안전관리 대시보드 FE 체크리스트', '', ...CHECK.flatMap(g => [`## ${g.g}`, '', ...g.items.map(t => `- [${on[t] ? 'x' : ' '}] ${t}`), ''])].join('\n'), [on])
  return (
    <div className="fe-check">
      <div className="fe-check-grid">
        {CHECK.map(g => (
          <div key={g.g} className="fe-check-g">
            <b>{g.g}</b>
            <ul>{g.items.map(t => <li key={t}><label><input type="checkbox" checked={!!on[t]} onChange={() => setOn(o => ({ ...o, [t]: !o[t] }))} /><span>{t}</span></label></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="fe-row">
        <span className="muted">{n} / {tot} 확인</span><span className="fe-grow" />
        <button type="button" className="btn sm" onClick={() => download('안전관리화면_FE_체크리스트.md', md, 'text/markdown;charset=utf-8')}>체크리스트 내려받기(.md)</button>
      </div>
    </div>
  )
}

const CODE_WS = `// 재연결: 지수 백오프 + 지터, 마지막 seq 이후 다시 받기
type Msg = { seq: number; sensor: string; value: number }

export function connect(url: string, onMsg: (m: Msg) => void, onState: (s: 'open' | 'retry', wait?: number) => void) {
  let ws: WebSocket | null = null
  let lastSeq = 0, attempt = 0, timer = 0, closed = false

  const open = () => {
    ws = new WebSocket(\`\${url}?since=\${lastSeq}\`)      // 서버는 since 이후를 먼저 보내요
    ws.onopen = () => { attempt = 0; onState('open') }
    ws.onmessage = e => {
      const m: Msg = JSON.parse(e.data)
      if (m.seq <= lastSeq) return                       // 중복은 버려요
      lastSeq = m.seq
      onMsg(m)
    }
    ws.onclose = () => {
      if (closed) return
      const cap = Math.min(30_000, 1_000 * 2 ** attempt++) // 1s, 2s, 4s … 최대 30s
      const wait = Math.random() * cap                   // full jitter: 0 ~ cap 사이 무작위
      onState('retry', wait)
      timer = window.setTimeout(open, wait)
    }
  }
  open()
  return () => { closed = true; clearTimeout(timer); ws?.close() } // 정리 함수
}`
const CODE_RAF = `// 메시지는 모아 두고, 프레임당 한 번만 상태에 반영
import { useEffect, useRef, useState } from 'react'

export function useRafBatch<T>(initial: Record<string, T>, same: (a: T, b: T) => boolean) {
  const [state, setState] = useState(initial)
  const pending = useRef(new Map<string, T>())
  const raf = useRef(0)

  const push = (key: string, value: T) => {
    pending.current.set(key, value)
    if (!raf.current) raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const p = pending.current; pending.current = new Map()
      setState(prev => {
        let changed = false
        const next = { ...prev }
        p.forEach((v, k) => { if (!(k in prev) || !same(prev[k], v)) { next[k] = v; changed = true } })
        return changed ? next : prev                     // 같으면 렌더하지 않아요
      })
    })
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return [state, push] as const
}`
const CODE_PAGE = `// 가려지면 멈추고, 돌아오면 다시 받기 + 화면 꺼짐 방지
useEffect(() => {
  let lock: WakeLockSentinel | null = null
  const grab = async () => { try { lock = await navigator.wakeLock?.request('screen') ?? null } catch { /* 거절됨 */ } }

  const onVis = () => {
    if (document.visibilityState === 'hidden') stream.pause()
    else { stream.resume({ since: lastSeq }); void grab() } // Wake Lock 은 가려지면 풀려요
  }
  void grab()
  document.addEventListener('visibilitychange', onVis)
  return () => { document.removeEventListener('visibilitychange', onVis); void lock?.release() }
}, [])`

/* ================= 탭 ================= */
const EXTRA: Record<string, string> = {
  '%LEL': '불이 붙을 수 있는 가장 낮은 가스 농도를 100으로 볼 때 지금 농도예요. 10%LEL이면 그 최저 농도의 10분의 1이에요.',
  '값 품질': '센서값을 얼마나 믿을 수 있는지 서버가 함께 보내는 표시예요. 좋음·불확실·나쁨처럼 나눠요. 센서가 멈추면 ‘불확실’이 돼요.',
}

export default function Tab() {
  return (
    <div data-dash="fe">
      <TermList keys={['폴링', '롱폴링', 'SSE', '웹소켓', '백오프', '지터', '다운샘플링', 'LTTB', 'Canvas', 'SVG', '링버퍼', '메모리 누수', 'aria-live', 'API']} extra={EXTRA} />
      <SysGrid>
        <Section id="dash-fe-mistakes" wide title="흔한 실수 — 화면은 멀쩡한데 데이터가 거짓말을 해요"
          gist="FE 실수는 화면에 안 보여요. 그래서 ‘안전해 보이는 거짓’이 돼요."
          desc={<>FE에서 생기는 실수는 디자인 리뷰로 잡히지 않아요. 화면은 깔끔한데, 그 뒤에서 값이 멈추거나 잘리거나 매끈하게 꾸며져요. 업계 안전관리 대시보드에서 흔히 보는 네 가지와 잘한 예 하나예요. ‘흔한 화면’과 ‘업그레이드하면’을 눌러 비교해 보세요.</>}>
          <Mistakes />
          <Note>예시의 현장·센서·시각·수치는 모두 가상의 {SAFE_CENTER} 예시예요. 실제 설비 기준값이 아니에요.</Note>
        </Section>

        <Section id="dash-fe-transport" wide title="데이터를 어떻게 받을까 — 폴링, 롱폴링, SSE, 웹소켓"
          gist="상황실 화면처럼 받기만 하면 SSE, 자주 보내기도 하면 웹소켓이 맞아요."
          desc={<>택배 확인에 비유하면 쉬워요. 5분마다 현관에 나가 보는 게 <Term k="폴링" />, 택배가 오면 기사가 초인종을 눌러 주는 게 <Term k="SSE" />·<Term k="웹소켓" />이에요. 같은 30초 동안 서버에서 변화 8건이 생겨요. 네 방식이 요청을 몇 번 보내고, 변화가 화면에 몇 초 늦게 도착하는지 재생해 보세요. 아래 회색 막대가 늦어진 시간(지연)이에요.</>}>
          <Transport />
          <h4 className="fe-h4">네 방식을 하나씩 자세히</h4>
          <p className="fe-p">방식을 골라 보세요. 어떻게 움직이는지, 장점과 단점, 안전관리 화면에서 언제 쓰는지, 만들 때 조심할 점과 기본 코드를 차례로 보여줘요.</p>
          <MethodDetail />
          <h4 className="fe-h4">항목별로 나란히 비교</h4>
          <MethodCompare />
          <MethodPick />
          <Note>통신 시간과 사건 시각은 비교를 위해 만든 <b>가상 값</b>이에요. 실제 차이는 네트워크와 서버에 따라 달라요. 안전관리 화면은 대부분 ‘받기’만 해서 SSE로 충분한 경우가 많아요. 설비 비상 정지나 대피 방송 같은 명령은 보통 따로 만든 <Term k="API" />로 보내요(확인 절차 포함).</Note>
        </Section>

        <Section id="dash-fe-reconnect" wide title="끊겼다 다시 연결하기 — 백오프, 지터, 놓친 구간"
          gist="기다리는 시간을 늘리고 흩어서 다시 붙어요. 놓친 값은 다시 받아요."
          desc={<>점심시간 종이 울리자마자 모두 엘리베이터 앞에 몰리면 아무도 못 타죠. 서버도 같아요. 상황실과 현장 사무실 화면 수십 대가 같은 서버를 보고 있어요. 서버가 잠깐 멈추면 모두가 동시에 다시 접속하려 해요. <Term k="백오프" />와 <Term k="지터" /> 전략을 바꿔 보세요.</>}>
          <Herd />
          <LiveReconnect />
          <SysPair>
            <Note tone="warn"><b>점은 끊긴 구간을 제대로 보려고 찍어요.</b> 선이 매끈하게 이어져 있다고 그동안 값을 다 받았다는 뜻은 아니에요. 끊긴 동안 마지막 값을 복사하거나 미리 넣어 둔 더미 값으로 빈칸을 채우는 화면이 있어요. 그러면 가스 농도가 오르던 순간도 평평한 정상처럼 보여요. ‘더미 값으로 채우기’를 고르고 끊어 본 뒤 ‘점으로 값의 출처 표시’를 꺼 보세요. 그러면 진짜 값과 가짜 값을 구분할 수 없어요. 그래서 값이 있어 보여도 점을 보고 제때 받은 값인지, 다시 받은 값인지, 채운 값인지 확인해요. 채운 값은 화면에서 반드시 다르게 그리고, 조사 기록에는 남기지 않아요.</Note>
            <Note><b>마지막 번호(seq)를 기억해요.</b> 서버가 메시지마다 순서 번호를 붙이면, 다시 연결할 때 “1042번 이후 주세요”라고 할 수 있어요. ‘빈칸으로 두기’를 고르고 끊어 보면 그래프에 구멍이 남아요. 그 구멍이 바로 사고 조사 때 찾는 구간일 수 있어요.</Note>
            <Note tone="tip"><b>끊긴 동안 화면이 할 일.</b> 끊겼다는 배너와 마지막 갱신 시각을 보여줘요. 오래된 값은 빗금이나 회색으로 바꿔요. 다시 연결하는 중이라는 것과 다음 시도까지 남은 시간도 보여줘요. 자세한 화면 표현은 05 실시간 갱신 탭에 있어요.</Note>
          </SysPair>
        </Section>

        <Section id="dash-fe-bench" wide title="점 10만 개 그리기 — 이 브라우저에서 직접 재요"
          gist="점은 화면 폭만큼만 그려요. 줄일 땐 최댓값이 사라지지 않게 해요."
          desc={<>1초마다 잰 값을 하루 모으면 센서 하나에 8만 6천 개예요. 점 개수, 그리는 방식(<Term k="SVG" />·<Term k="Canvas" />), <Term k="다운샘플링" />(점 줄이기)을 바꿔 가며 실제로 걸리는 시간을 재 보세요. 데이터 한가운데에 설비가 부딪힌 순간의 짧은 진동 급등이 숨어 있어요.</>}>
          <Bench />
          <SysPair>
            <Finding src={<>Steinarsson (2013) LTTB · Jugel 등 (2014) M4 — 한국어 요약 <Cite n={3} /><Cite n={4} /></>}>
              화면 폭보다 많은 점은 어차피 눈에 보이지 않아요. 화면 한 칸(픽셀)마다 모양을 지키는 점만 남기면, 같은 그림을 훨씬 빨리 그릴 수 있어요.
            </Finding>
            <Note tone="warn"><b>‘n개마다 1개’는 위험해요.</b> 고르게 솎아 내면 점 1~2개로 된 진동 급등이 사라질 수 있어요. 안전관리 화면에서는 최댓값·최솟값이 곧 사건이에요. 구간마다 최소·최대를 남기거나 <Term k="LTTB" />처럼 모양을 지키는 방법을 써요. 확대하면 원본을 다시 불러와요.</Note>
          </SysPair>
        </Section>

        <Section id="dash-fe-batch" title="업데이트 묶기 — 화면 한 장에 한 번만 반영"
          gist="메시지가 아무리 많아도 화면은 1초에 60번쯤만 다시 그리면 돼요."
          desc={<>영화는 1초에 24장을 보여줘요. 그 사이에 그림을 더 그려도 관객은 못 봐요. 초당 250건이 들어와도 화면은 보통 1초에 60번쯤 바뀌어요. 방식을 바꿔 <Term k="렌더" d="바뀐 데이터에 맞춰 화면을 다시 그리는 일이에요. React에서는 컴포넌트 함수가 다시 실행되는 것이에요." /> 수를 비교해 보세요.</>}>
          <Batching />
        </Section>

        <Section id="dash-fe-time" title="시각은 서버 기준으로"
          gist="시각은 서버가 정하고, 브라우저는 차이만 계산해서 고쳐요."
          desc="내 손목시계가 3분 느리면, 3분 전 일이 방금 일어난 것처럼 느껴져요. 상황실 PC 시계가 틀리면 ‘마지막 갱신 n초 전’이 틀린 시간을 보여줘요. 슬라이더로 PC 시계를 틀어 보세요.">
          <ClockSkew />
        </Section>

        <Section id="dash-fe-longrun" wide title="8~12시간 켜 두는 화면 — 메모리와 화면 꺼짐"
          gist="근무 내내 켜 두는 화면은 메모리가 계속 늘지 않고, 화면이 꺼지지 않게 만들어요."
          desc={<>안전관리 상황실 화면은 새로고침 없이 근무 내내 켜져 있어요. 잠깐 써 보는 웹페이지에서는 안 보이던 문제가 몇 시간 뒤에 나와요. 대표적인 게 <Term k="메모리 누수" />예요.</>}>
          <div className="fe-long-grid">
            <figure className="fe-fig">
              <figcaption><b>점 개수가 근무 시간에 따라 어떻게 쌓이나</b><span className="muted">구역 9곳 × 센서 3개, 1초에 1번 (계산)</span></figcaption>
              <GrowthChart />
              <small className="muted">12시간이면 116만 개예요. 숫자만 Float64로 담아도 점 하나에 16바이트(x·y)라 약 19MB예요. 객체로 담으면 훨씬 커요. 1시간 링버퍼는 약 9만 7천 개에서 더 늘지 않아요.</small>
            </figure>
            <figure className="fe-fig">
              <figcaption><b><Term k="링버퍼" /></b><span className="muted">회전초밥 레일처럼 정해진 칸을 돌려 쓰는 배열</span></figcaption>
              <RingBuffer />
            </figure>
          </div>
          <div className="fe-leaks">
            {[
              ['해제 안 한 구독', 'useEffect에서 연 웹소켓·SSE·이벤트 리스너를 정리 함수(cleanup)에서 닫지 않았어요. 그러면 화면을 오갈 때마다 연결이 하나씩 늘어요.'],
              ['멈추지 않는 타이머', 'setInterval로 만든 타이머를 clearInterval로 멈추지 않았어요. 그러면 이미 사라진 화면 조각(컴포넌트)의 상태를 계속 고치려 해요.'],
              ['계속 쌓이는 배열', '시간별 값을 data.push()로 넣기만 하고 지우지 않았어요. 링버퍼나 “최근 N개만 남기기”로 바꿔요.'],
              ['떨어진 DOM 참조', '화면에서 지운 차트 요소를 변수나 Map에 계속 붙잡고 있어요. 그러면 브라우저가 메모리에서 치우지 못해요.'],
            ].map(([t, d]) => <div key={t}><b>{t}</b><p>{d}</p></div>)}
          </div>
          <PageApis />
          <CodeBlock label="TypeScript · 가려지면 멈추고 화면 꺼짐 방지" code={CODE_PAGE} />
        </Section>

        <Section id="dash-fe-a11y" wide title="알람 접근성 — 화면 낭독기가 언제 끼어들어 읽을까"
          gist="긴급 알람만 바로 끼어들어 읽고, 나머지는 기다렸다 읽거나 목록에만 둬요."
          desc={<><Term k="aria-live" />는 화면을 보지 못하는 사람에게 바뀐 내용을 읽어 주게 해요. 회의 중에 모두가 끼어들면 아무 말도 안 들리죠. 모든 알람을 assertive(바로 끼어들기)로 하면 스크린 리더가 쉴 새 없이 말을 끊어요.</>}>
          <A11yDemo />
          <Note>긴급(1)만 <code>aria-live="assertive"</code>, 높음(2)은 <code>polite</code>, 주의(3)는 목록에만 둬요 <Cite n={6} />. 안전관리 화면에서는 화재·작업자 무응답 같은 긴급 알람만 말을 끊고 읽어요. 보호구 미착용까지 끼어들면 정작 화재 안내를 놓쳐요. 알람이 한꺼번에 쏟아질 때(폭주)는 하나씩 읽지 말고 “긴급 알람 12건”처럼 요약해서 한 번만 읽어요.</Note>
        </Section>

        <Section id="dash-fe-code" wide title="코드와 체크리스트" gist="코드는 시작점으로 복사해 쓰고, 체크리스트는 출시 전 리뷰에 써요." desc="복사해서 시작점으로 쓰세요. 체크리스트는 출시 전 리뷰에 그대로 써요.">
          <SysPair>
            <CodeBlock label="TypeScript · 웹소켓 재연결" code={CODE_WS} maxHeight={420} />
            <CodeBlock label="TypeScript · 프레임당 한 번 반영" code={CODE_RAF} maxHeight={420} />
          </SysPair>
          <Checklist />
        </Section>

        <Refs items={[
          { kind: 'standard', text: 'IETF RFC 6455 (2011). The WebSocket Protocol.', url: 'https://www.rfc-editor.org/rfc/rfc6455' },
          { kind: 'standard', text: 'WHATWG HTML Living Standard — Server-sent events (EventSource, Last-Event-ID)', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
          { kind: 'paper', text: 'Steinarsson, S. (2013). Downsampling Time Series for Visual Representation. 석사 논문, University of Iceland — LTTB', url: 'https://skemman.is/handle/1946/15343' },
          { kind: 'paper', text: 'Jugel, U., Jerzak, Z., Hackenbroich, G., Markl, V. (2014). M4: A Visualization-Oriented Time Series Data Aggregation. PVLDB 7(10).' },
          { kind: 'standard', text: 'W3C Page Visibility · Screen Wake Lock API', url: 'https://www.w3.org/TR/screen-wake-lock/' },
          { kind: 'standard', text: 'W3C WAI-ARIA 1.2 — aria-live (assertive · polite)', url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-live' },
          { kind: 'standard', text: 'WCAG 2.1 성공 기준 2.3.1 — 초당 3회 이하 깜빡임', url: 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html' },
          { kind: 'standard', text: 'IETF RFC 5905 (2010). Network Time Protocol Version 4 — 시각 차이 계산', url: 'https://www.rfc-editor.org/rfc/rfc5905' },
          { kind: 'practice', text: '지수 백오프와 지터(재접속이 한꺼번에 몰리지 않게 흩기), 링버퍼, requestAnimationFrame으로 업데이트 묶기, 진행 중 알람과 최근 이벤트 API 나누기, 안전 쪽으로 실패하기 — 프런트엔드·분산 시스템 실무 방식' },
          { kind: 'paper', text: 'Endsley, M. R. (1995). Toward a Theory of Situation Awareness in Dynamic Systems. Human Factors 37(1) — 보기 → 이해 → 예측, 앞 단계가 틀리면 뒤도 틀림', url: 'https://en.wikipedia.org/wiki/Situation_awareness' },
          { kind: 'reported', text: 'ANSI/ISA-18.2 · EEMUA 191 알람 관리 목표값 — 10분에 10개 초과면 알람 폭주 (업체 해설)', url: 'https://ifactoryapp.com/industries/oil-and-gas/alarm-management-isa-18-2-rationalization-flooding' },
        ]} />
      </SysGrid>
    </div>
  )
}

function SysPair({ children }: { children: ReactNode }) { return <div className="fe-pair">{children}</div> }
