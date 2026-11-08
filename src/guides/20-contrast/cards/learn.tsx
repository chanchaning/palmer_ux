import { useState } from 'react'
import { Card, Info, Stage } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'
import { AA, contrast, fmtRatio, luminance, parseColor, VISION_LABEL, type RGB, type Vision } from '../lib'
import { useTester, Verdict, VisionFilters } from '../shared'

const rgb = (hex: string) => parseColor(hex)!.rgb
const ratio = (a: string, b: string) => contrast(rgb(a), rgb(b))
const g = (v: number): RGB => [v, v, v]
const ghex = (v: number) => '#' + Math.round(v).toString(16).padStart(2, '0').repeat(3)

/** 테스트기로 보내기 버튼 */
function SendBtn({ fg, bg }: { fg: string; bg: string }) {
  const { load } = useTester()
  return <button className="btn ghost sm" onClick={() => load(fg, bg)}>테스트기로 보내기 ↑</button>
}

/* ---------- 04 대비율은 이렇게 계산해요 ---------- */
export function Formula() {
  const [v, setV] = useState(118)
  const r = contrast(g(v), [255, 255, 255])
  const L = luminance(g(v))
  const X = (gray: number) => 30 + (gray / 255) * 260
  const Y = (rr: number) => 120 - (Math.log(rr) / Math.log(21)) * 108
  const pts = Array.from({ length: 52 }, (_, i) => i * 5).map(gv => `${X(gv).toFixed(1)},${Y(contrast(g(gv), [255, 255, 255])).toFixed(1)}`).join(' ')
  return (
    <Card id="contrast-formula" num="04" title="대비율은 이렇게 계산해요" en="Relative Luminance"
      desc="색의 ‘사람 눈에 느껴지는 밝기(상대 휘도)’를 구해 밝은 쪽을 어두운 쪽으로 나눠요. 1:1(같은 색)부터 21:1(흰색과 검정)까지예요.">
      <Stage log={<>회색 <b>{ghex(v)}</b> on 흰색 = 휘도 {L.toFixed(3)} → (1 + 0.05) ÷ ({L.toFixed(3)} + 0.05) = <b>{fmtRatio(r)}:1</b></>}>
        <div className="box left">
          <svg className="ct-plot" viewBox="0 0 300 140" role="img" aria-label="회색 밝기에 따른 흰 배경 대비율">
            {[3, 4.5, 7].map(t => (
              <g key={t}>
                <line x1="30" x2="290" y1={Y(t)} y2={Y(t)} stroke="var(--line)" strokeDasharray="3 3" />
                <text x="26" y={Y(t) + 4} fontSize="10" fill="var(--text-3)" textAnchor="end">{t}</text>
              </g>
            ))}
            <text x="26" y={Y(21) + 4} fontSize="10" fill="var(--text-3)" textAnchor="end">21</text>
            <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
            <circle cx={X(v)} cy={Y(r)} r="6" fill={ghex(v)} stroke="var(--text)" strokeWidth="2" />
            <text x="30" y="136" fontSize="10" fill="var(--text-3)">검정 #000</text>
            <text x="290" y="136" fontSize="10" fill="var(--text-3)" textAnchor="end">흰색 #fff</text>
          </svg>
          <div className="ct-label"><span>글자 회색 밝기</span><b>{ghex(v)} · {fmtRatio(r)}:1</b></div>
          <Range value={v} min={0} max={255} onChange={setV} label="회색 밝기" />
          <div className="ct-sample" style={{ background: '#fff', color: ghex(v) }}><p>흰 바탕 위 이 회색 글자, 편하게 읽히나요?</p></div>
          <div className="ct-row"><span className="ct-hint">흰 바탕에서 본문(4.5:1)을 넘는 가장 연한 회색은 <b>#767676</b>이에요.</span><SendBtn fg={ghex(v)} bg="#ffffff" /></div>
        </div>
      </Stage>
      <Info
        spec={[['공식', '(L1 + 0.05) ÷ (L2 + 0.05)'], ['휘도', '0.2126R + 0.7152G + 0.0722B (선형화 후)']]}
        usage={[
          ['핵심', '초록이 밝기에 가장 큰 영향을 줘요. 그래서 같은 채도라도 노랑·연두는 흰 바탕에서 대비가 아주 낮아요.'],
          ['참고', 'WCAG 3 초안의 APCA는 글자 크기·굵기까지 반영하는 다른 계산식이에요. 현재 법·지침 기준은 이 대비율이에요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 AA와 AAA ---------- */
export function AaVsAaa() {
  const [lvl, setLvl] = useState<'aa' | 'aaa'>('aa')
  const fg = lvl === 'aa' ? '#767676' : '#595959'
  return (
    <Card id="contrast-aaa" num="05" title="AA와 AAA" en="Conformance Levels"
      desc="AA는 대부분의 서비스가 지켜야 하는 기본선, AAA는 저시력 사용자를 위한 더 높은 기준이에요. 이 도감은 AA를 기준으로 해요.">
      <Stage log={<>{lvl === 'aa' ? <>AA 최소선 <b>#767676</b> — {fmtRatio(ratio(fg, '#ffffff'))}:1</> : <>AAA 최소선 <b>#595959</b> — {fmtRatio(ratio(fg, '#ffffff'))}:1</>}</>}>
        <div className="box left">
          <Seg value={lvl} onChange={setLvl} options={[['aa', 'AA 최소선'], ['aaa', 'AAA 최소선']]} />
          <div className="ct-sample" style={{ background: '#fff', color: fg }}>
            <p style={{ fontSize: 16 }}>본문 16px — 공지사항은 매주 월요일에 갱신돼요. 변경된 약관은 다음 달 1일부터 적용돼요.</p>
          </div>
          <table className="diff" style={{ margin: 0, width: '100%' }}><tbody>
            <tr><th>등급</th><td>본문</td><td>큰 글씨</td></tr>
            <tr><th>AA</th><td><b>4.5 : 1</b></td><td><b>3 : 1</b></td></tr>
            <tr><th>AAA</th><td>7 : 1</td><td>4.5 : 1</td></tr>
            <tr><th>UI 요소</th><td colSpan={2}>3 : 1 (AA, 1.4.11)</td></tr>
          </tbody></table>
        </div>
      </Stage>
      <Info
        spec={[['국내', 'KWCAG 2.2 — 4.5:1'], ['권장 목표', 'AA']]}
        usage={[
          ['언제 AAA', '노년층·저시력 사용자 비중이 큰 서비스, 공공 안내, 긴 글을 오래 읽는 화면'],
          ['주의', 'AAA를 무리하게 맞추면 회색 단계가 사라져 위계가 무너질 수 있어요. 본문만 AAA로 올리는 것도 방법이에요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 큰 글씨의 기준 ---------- */
export function LargeText() {
  const [size, setSize] = useState(18)
  const [bold, setBold] = useState(false)
  const fg = '#8a8a8a', bg = '#ffffff'
  const r = ratio(fg, bg)
  const large = size >= 24 || (bold && size >= 18.66)
  const ok = r >= (large ? AA.large : AA.body)
  return (
    <Card id="contrast-large" num="06" title="‘큰 글씨’의 정확한 기준" en="Large Text"
      desc="큰 글씨는 3:1만 넘으면 돼요. 단, ‘큰 글씨’는 24px 이상, 또는 굵게(700) 18.66px 이상이에요.">
      <Stage log={<>{size}px {bold ? '굵게' : '보통'} → <b>{large ? '큰 글씨' : '일반 글씨'}</b>로 판정 · 대비 {fmtRatio(r)}:1 · {ok ? '통과' : '미달'}</>}>
        <div className="box left">
          <div className="ct-label"><span>글자 크기</span><b>{size}px = {(size * 0.75).toFixed(1)}pt</b></div>
          <Range value={size} min={12} max={36} onChange={setSize} label="글자 크기" />
          <label className="opt" style={{ fontSize: 14 }}><input type="checkbox" checked={bold} onChange={e => setBold(e.target.checked)} />굵게 (font-weight 700)</label>
          <div className="ct-sample" style={{ background: bg, color: fg }}>
            <p style={{ fontSize: size, fontWeight: bold ? 700 : 400, lineHeight: 1.3 }}>대비 3.4:1 회색 글씨</p>
          </div>
          <div className="ct-row"><span className="ct-hint">같은 색 <b>{fg}</b>({fmtRatio(r)}:1)이라도 크기·굵기에 따라 결과가 달라져요.</span><Verdict ok={ok} /></div>
        </div>
      </Stage>
      <Info
        spec={[['큰 글씨', '24px(18pt)+ · 굵은 18.66px(14pt)+'], ['기준', '3 : 1']]}
        usage={[
          ['함정', '디자인 툴의 굵기 600(SemiBold)은 ‘굵게’로 인정받지 못할 수 있어요. 안전하게 700 이상으로 봐요.'],
          ['주의', '모바일에서 화면을 확대하지 않는 사용자도 있어요. 큰 글씨 예외는 제목에만 쓰고 본문엔 쓰지 않아요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 UI 요소도 3:1 ---------- */
const BORDERS = ['#e5e5e3', '#c8c8c4', '#949490', '#767672'] as const
export function UiContrast() {
  const [b, setB] = useState<(typeof BORDERS)[number]>('#e5e5e3')
  const r = ratio(b, '#ffffff'), ok = r >= AA.ui
  return (
    <Card id="contrast-ui" num="07" title="UI 요소도 3:1이 필요해요" en="Non-text Contrast"
      desc="입력창 테두리, 꺼진 스위치, 아이콘 버튼, 포커스 링처럼 ‘알아봐야 쓸 수 있는’ 그래픽은 배경과 3:1 이상이어야 해요.">
      <Stage log={<>테두리 <b>{b}</b> · {fmtRatio(r)}:1 — {ok ? '어디가 입력창인지 보여요' : '입력창 경계가 사라져요'}</>}>
        <div className="box left">
          <Seg value={b} onChange={setB} options={BORDERS.map(x => [x, x] as const)} />
          <div className="ct-field-demo">
            <label>이메일</label>
            <div className="in" style={{ borderColor: b }}>name@example.com</div>
            <div className="row">
              <span className="sw" style={{ borderColor: b, color: b }} aria-label="꺼진 스위치" />
              <span style={{ fontSize: 13 }}>알림 받기 (꺼짐)</span>
              <span style={{ flex: 1 }} />
              <button className="ib" style={{ color: b }} aria-label="설정" tabIndex={-1}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>
              </button>
            </div>
          </div>
          <div className="ct-row"><span className="ct-hint">흔히 쓰는 연한 테두리(#e5e5e3)는 1.2:1이라 기준에 한참 못 미쳐요.</span><Verdict ok={ok} /></div>
        </div>
      </Stage>
      <Info
        spec={[['기준', 'WCAG 1.4.11 · 3 : 1'], ['대상', '테두리 · 아이콘 · 상태 표시 · 포커스']]}
        usage={[
          ['해결', '테두리를 진하게 하기 싫다면 입력창에 배경색을 깔아 영역을 구분해도 돼요(배경 대비 3:1).'],
          ['예외', '글자가 들어 있어 이미 버튼임을 알 수 있는 경우, 테두리 자체는 대상이 아니에요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 예외와 흔한 오해 ---------- */
const QUIZ: { name: string; sample: React.ReactNode; exempt: boolean; why: string }[] = [
  { name: '비활성 버튼', sample: <span style={{ color: '#b8b8b4', border: '1px solid #e2e2de', borderRadius: 6, padding: '3px 10px' }}>결제하기</span>, exempt: true, why: '누를 수 없는(disabled) 요소는 대비 기준에서 빠져요. 단, 왜 못 누르는지는 다른 방법으로 알려줘요.' },
  { name: '로고 속 글자', sample: <b style={{ color: '#ffd43b', letterSpacing: '-.02em' }}>sunny</b>, exempt: true, why: '로고·브랜드 이름은 예외예요.' },
  { name: '장식용 글자', sample: <span style={{ color: '#ececea', fontSize: 22, fontWeight: 800 }}>SALE</span>, exempt: true, why: '정보가 없는 순수 장식이면 예외예요. 같은 정보가 다른 곳에 글로 있어야 해요.' },
  { name: '입력창 placeholder', sample: <span style={{ color: '#c4c4c0', fontSize: 12 }}>예: 010-1234-5678</span>, exempt: false, why: '흔한 오해! 형식 힌트처럼 정보를 주면 4.5:1이 필요해요. 그래서 힌트는 placeholder 대신 입력창 아래에 쓰는 게 좋아요.' },
  { name: '이미지 속 글자', sample: <span style={{ background: 'linear-gradient(90deg,#ffd8a8,#fff3bf)', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>오늘만 특가</span>, exempt: false, why: '그림 파일 안에 있어도 읽어야 하는 글자면 검사 대상이에요.' },
]
export function Exemptions() {
  const [ans, setAns] = useState<Record<number, boolean>>({})
  const done = Object.keys(ans).length
  const right = QUIZ.filter((q, i) => i in ans && ans[i] === q.exempt).length
  return (
    <Card id="contrast-exempt" num="08" title="예외와 흔한 오해" en="Exceptions"
      desc="모든 글자가 대비 기준을 지켜야 하는 건 아니에요. 각 항목이 ‘예외’인지 ‘검사 대상’인지 맞혀보세요.">
      <Stage log={done ? <>{QUIZ.length}개 중 <b>{done}개</b> 답함 · <b>{right}개</b> 정답</> : <>각 줄에서 <b>예외</b> 또는 <b>검사 대상</b>을 골라보세요</>}>
        <div className="box left">
          <ul className="ct-quiz">
            {QUIZ.map((q, i) => (
              <li key={q.name}>
                <div className="smp">{q.sample}</div>
                <div className="q">
                  <b>{q.name}</b>
                  {i in ans ? (
                    <div className="ans">{ans[i] === q.exempt ? '⭕ 정답' : '❌ 아쉬워요'} — <b>{q.exempt ? '예외' : '검사 대상'}</b>. {q.why}</div>
                  ) : (
                    <div className="btns">
                      <button onClick={() => setAns(a => ({ ...a, [i]: true }))}>예외</button>
                      <button onClick={() => setAns(a => ({ ...a, [i]: false }))}>검사 대상</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {done > 0 && <button className="btn ghost sm" onClick={() => setAns({})}>다시 풀기</button>}
        </div>
      </Stage>
      <Info
        spec={[['예외', '비활성 · 로고 · 순수 장식'], ['대상', 'placeholder · 이미지 속 정보 글자']]}
        usage={[['팁', '“이걸 못 읽으면 사용자가 뭔가를 놓치나?”를 물어보세요. 놓친다면 검사 대상이에요.']]}
      />
    </Card>
  )
}

/* ---------- 09 색만으로 알리지 않기 ---------- */
export function ColorOnly() {
  const [vision, setVision] = useState<Vision>('normal')
  const [fixed, setFixed] = useState(false)
  const items = [
    { t: '결제 완료', c: '#2f9e44', i: '✓' },
    { t: '배송 지연', c: '#e8590c', i: '!' },
    { t: '결제 실패', c: '#e03131', i: '✕' },
  ]
  return (
    <Card id="contrast-color-only" num="09" title="색만으로 알리지 않기" en="Use of Color"
      desc="빨강·초록만으로 상태를 구분하면 색각 이상 사용자(남성 약 12명 중 1명)는 차이를 볼 수 없어요. 아이콘·글자·무늬를 함께 써요.">
      <Stage log={<>{VISION_LABEL[vision]}으로 보는 중 · {fixed ? <><b>아이콘과 무늬</b>가 있어 구분돼요</> : vision === 'normal' ? <>색으로만 구분하고 있어요</> : <><b>완료와 실패가 거의 같아 보여요</b></>}</>}>
        <div className="box left">
          <Seg value={vision} onChange={setVision} options={(['normal', 'protan', 'deutan', 'achroma'] as Vision[]).map(v => [v, VISION_LABEL[v]] as const)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, filter: vision !== 'normal' ? `url(#ctco-${vision})` : undefined }}>
            <div className="ct-status">
              {items.map(x => (
                <div key={x.t}><i style={{ background: x.c, color: '#fff', width: fixed ? 18 : 12, height: fixed ? 18 : 12, fontSize: 11 }}>{fixed ? x.i : ''}</i>주문 #10{x.t.length} · {x.t}</div>
              ))}
            </div>
            <div className="ct-bars" aria-label="이번 주 결과 막대">
              {[60, 30, 80, 45].map((h, i) => (
                <span key={i} style={{ height: h + '%', background: i % 2 ? '#e03131' : '#2f9e44', backgroundImage: fixed && i % 2 ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.55) 0 4px, transparent 4px 9px)' : undefined }} />
              ))}
            </div>
          </div>
          <VisionFilters prefix="ctco" />
          <label className="opt" style={{ fontSize: 14 }}><input type="checkbox" checked={fixed} onChange={e => setFixed(e.target.checked)} />아이콘·무늬 함께 쓰기</label>
        </div>
      </Stage>
      <Info
        spec={[['기준', 'WCAG 1.4.1 색의 사용'], ['방법', '아이콘 · 글자 · 무늬 · 위치']]}
        usage={[
          ['언제', '상태 배지, 그래프 범례, 입력 오류(빨간 테두리만 쓰지 말고 메시지 함께), 링크(밑줄 또는 3:1 이상 차이)'],
          ['주의', '시뮬레이션은 근사치예요. 실제 확인은 OS의 색상 필터로도 해보세요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 10 다크 모드의 함정 ---------- */
const DARK = {
  halation: { bad: ['#ffffff', '#000000'], good: ['#e8e8e3', '#121211'], t: '순수 흰색과 검정', badMsg: '21:1 최대 대비 — 글자가 번져 보이고(헐레이션) 오래 읽으면 피곤해요', goodMsg: '살짝 낮춘 흰색·검정 — 대비는 충분하고 눈은 편해요' },
  saturated: { bad: ['#2b4ad8', '#1c1c1a'], good: ['#8ea2ff', '#1c1c1a'], t: '채도 높은 색', badMsg: '라이트 모드의 진한 파랑을 그대로 쓰면 어두운 배경에 묻혀요', goodMsg: '밝고 덜 진한 파랑으로 바꾸면 읽혀요' },
  gray: { bad: ['#63635d', '#1c1c1a'], good: ['#9d9d95', '#1c1c1a'], t: '회색 그대로 가져오기', badMsg: '라이트 모드 회색을 그대로 쓰면 다크에서는 거의 안 보여요', goodMsg: '다크 모드용 회색을 따로 정해요' },
} as const
export function DarkPitfalls() {
  const [k, setK] = useState<keyof typeof DARK>('halation')
  const [good, setGood] = useState(false)
  const c = DARK[k], [fg, bg] = good ? c.good : c.bad
  const r = ratio(fg, bg)
  return (
    <Card id="contrast-dark" num="10" title="다크 모드의 함정" en="Dark Mode"
      desc="다크 모드는 색을 반전하는 게 아니라 다시 정하는 거예요. 대비가 너무 높아도, 라이트 색을 그대로 가져와도 문제가 생겨요.">
      <Stage log={<><b>{fmtRatio(r)}:1</b> — {good ? c.goodMsg : c.badMsg}</>}>
        <div className="box left">
          <Seg value={k} onChange={v => { setK(v); setGood(false) }} options={(Object.keys(DARK) as (keyof typeof DARK)[]).map(x => [x, DARK[x].t] as const)} />
          <Seg value={good ? 1 : 0} onChange={v => setGood(v === 1)} options={[[0, '흔한 실수'], [1, '고친 버전']]} />
          <div className="ct-sample" style={{ background: bg, color: fg, borderColor: '#333' }}>
            <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>이번 달 사용 요약</p>
            <p style={{ fontSize: 15 }}>지난달보다 지출이 12% 줄었어요. 가장 많이 쓴 곳은 식비예요.</p>
          </div>
          <div className="ct-row"><code style={{ fontSize: 12, color: 'var(--text-3)' }}>{fg} on {bg}</code><SendBtn fg={fg} bg={bg} /></div>
        </div>
      </Stage>
      <Info
        spec={[['배경', '순수 검정 대신 #121212 근처'], ['글자', '순수 흰색 대신 87~92% 밝기']]}
        usage={[
          ['원칙', '다크 모드에서는 위에 올라온 면일수록 밝게, 강조색은 채도를 낮추고 밝기를 올려요.'],
          ['주의', '라이트·다크 두 벌의 색 토큰을 따로 검사해요. 한쪽만 통과하는 경우가 아주 흔해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 11 브랜드 색이 미달일 때 ---------- */
const BRAND = '#ff7a1a'
const SOL = {
  asis: { bg: BRAND, fg: '#ffffff', t: '그대로', msg: '브랜드 주황 + 흰 글자 — 대비가 크게 부족해요' },
  darker: { bg: '#c2410c', fg: '#ffffff', t: '버튼만 진하게', msg: '같은 계열의 진한 주황을 ‘버튼용’으로 따로 둬요' },
  darktext: { bg: BRAND, fg: '#1b1b19', t: '글자를 검게', msg: '브랜드 색은 그대로, 글자를 어둡게 바꿔요' },
  accent: { bg: '#1b1b19', fg: '#ffffff', t: '포인트로만', msg: '버튼은 중립색, 브랜드 색은 아이콘·밑줄 같은 포인트에만' },
} as const
export function BrandColor() {
  const [k, setK] = useState<keyof typeof SOL>('asis')
  const s = SOL[k], r = ratio(s.fg, s.bg)
  return (
    <Card id="contrast-brand" num="11" title="브랜드 색이 기준에 못 미칠 때" en="Brand Colors"
      desc="밝고 선명한 브랜드 색은 흰 글자를 올리면 대비가 부족한 경우가 많아요. 브랜드를 지키면서 해결하는 방법이 있어요.">
      <Stage log={<><b>{fmtRatio(r)}:1</b> — {s.msg}</>}>
        <div className="box left">
          <Seg value={k} onChange={setK} options={(Object.keys(SOL) as (keyof typeof SOL)[]).map(x => [x, SOL[x].t] as const)} />
          <div className="ct-brand">
            <span style={{ fontSize: 13, color: '#63635d' }}>오늘 주문하면 내일 도착해요</span>
            <button style={{ background: s.bg, color: s.fg }} tabIndex={-1}>{k === 'accent' ? <>지금 주문하기 <span style={{ color: BRAND }}>→</span></> : '지금 주문하기'}</button>
            {k === 'accent' && <span style={{ height: 3, width: 60, borderRadius: 2, background: BRAND }} />}
          </div>
          <div className="ct-row"><code style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.fg} on {s.bg}</code><Verdict ok={r >= AA.body} /></div>
        </div>
      </Stage>
      <Info
        spec={[['방법', '버튼용 진한 색 · 어두운 글자 · 포인트 사용']]}
        usage={[
          ['실무', '디자인 시스템에 ‘브랜드 색’과 ‘글자를 올릴 수 있는 브랜드 색’을 따로 토큰으로 둬요.'],
          ['주의', '큰 글씨 예외(3:1)로 피해 가려면 버튼 글자가 24px 이상이어야 해요. 일반 버튼에선 통하지 않아요.'],
        ]}
      />
    </Card>
  )
}
