import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, type ReactNode } from 'react'
import { Card, Info, Stage } from '../../../components/Card'
import { Seg } from '../../../components/ui'
import { AA, AAA, blend, contrast, fmtRatio, nearestPassing, parseColor, simulate, toHex, VISION_LABEL, type RGB, type Vision } from '../lib'
import { ratioPos, Verdict } from '../shared'

/** 이 사이트의 실제 색 토큰 */
const PRESETS: { name: string; fg: string; bg: string }[] = [
  { name: '본문', fg: '#1b1b19', bg: '#ffffff' },
  { name: '보조 글자', fg: '#4d4d48', bg: '#ffffff' },
  { name: '회색 캡션', fg: '#63635d', bg: '#ffffff' },
  { name: '회색 · 회색 바탕', fg: '#63635d', bg: '#f0f0ec' },
  { name: '파랑 버튼', fg: '#ffffff', bg: '#3550ee' },
  { name: '주황 강조', fg: '#b23a0b', bg: '#ffffff' },
  { name: '다크 본문', fg: '#f1f1ec', bg: '#1c1c1a' },
  { name: '다크 캡션', fg: '#9d9d95', bg: '#1c1c1a' },
  { name: '다크 파랑', fg: '#7b93ff', bg: '#1c1c1a' },
  { name: '예전 회색 (수정 전)', fg: '#92928a', bg: '#ffffff' },
]

const readQuery = () => {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
  return { fg: q.get('fg'), bg: q.get('bg') }
}

function ColorField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error: boolean }) {
  const p = parseColor(value)
  return (
    <label className="ct-field">
      <span>{label}</span>
      <div className={'ct-input' + (error ? ' err' : '')}>
        <input type="color" aria-label={label + ' 선택'} value={p ? toHex(p.rgb) : '#000000'} onChange={e => onChange(e.target.value)} />
        <input type="text" aria-label={label + ' 값'} value={value} spellCheck={false} onChange={e => onChange(e.target.value)} />
      </div>
      {error && <span className="ct-err">색으로 읽을 수 없어요. 예: #333, 333333, rgb(51 51 51)</span>}
    </label>
  )
}

export interface TesterHandle { load: (fg: string, bg: string) => void }

export const Tester = forwardRef<TesterHandle>(function Tester(_, ref) {
  const init = readQuery()
  const [fgIn, setFgIn] = useState(init.fg ? '#' + init.fg.replace('#', '') : '#63635d')
  const [bgIn, setBgIn] = useState(init.bg ? '#' + init.bg.replace('#', '') : '#ffffff')
  const [vision, setVision] = useState<Vision>('normal')
  const [copied, setCopied] = useState(false)

  useImperativeHandle(ref, () => ({ load: (f, b) => { setFgIn(f); setBgIn(b); setVision('normal') } }), [])

  const fgP = parseColor(fgIn), bgP = parseColor(bgIn)
  const bg: RGB | null = bgP ? (bgP.alpha < 1 ? blend(bgP, [255, 255, 255]) : bgP.rgb) : null
  const fg: RGB | null = fgP && bg ? blend(fgP, bg) : null
  const ratio = fg && bg ? contrast(fg, bg) : null

  // 주소에 현재 조합 기록 (공유용)
  useEffect(() => {
    if (!fg || !bg) return
    const t = setTimeout(() => history.replaceState(null, '', `#/contrast?fg=${toHex(fg).slice(1)}&bg=${toHex(bg).slice(1)}`), 300)
    return () => clearTimeout(t)
  }, [fg && toHex(fg), bg && toHex(bg)]) // eslint-disable-line react-hooks/exhaustive-deps

  const sim = useMemo(() => (fg && bg ? { fg: simulate(fg, vision), bg: simulate(bg, vision) } : null), [fg && toHex(fg), bg && toHex(bg), vision]) // eslint-disable-line react-hooks/exhaustive-deps
  const simRatio = sim ? contrast(sim.fg, sim.bg) : null

  const fixes = useMemo(() => {
    if (!fg || !bg || !ratio || ratio >= AA.body) return []
    const out: { label: ReactNode; fg: string; bg: string; r: number; swatch: string }[] = []
    const f = nearestPassing(fg, bg, AA.body)
    if (f) out.push({ label: <>글자색만 바꾸기</>, fg: toHex(f), bg: toHex(bg), r: contrast(f, bg), swatch: toHex(f) })
    const b = nearestPassing(bg, fg, AA.body)
    if (b) out.push({ label: <>배경색만 바꾸기</>, fg: toHex(fg), bg: toHex(b), r: contrast(fg, b), swatch: toHex(b) })
    return out
  }, [fg && toHex(fg), bg && toHex(bg)]) // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    const url = location.href
    try { await navigator.clipboard.writeText(url) } catch { /* 클립보드 불가 환경 */ }
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }

  const r = ratio ?? 1
  const log = !ratio ? <>색 값을 확인해 주세요</>
    : r >= AA.body ? <><b>{fmtRatio(r)}:1</b> — 본문까지 AA 통과. 어떤 크기로 써도 괜찮아요</>
      : r >= AA.large ? <><b>{fmtRatio(r)}:1</b> — 큰 글씨·아이콘에만 쓸 수 있어요. 본문에는 부족해요</>
        : <><b>{fmtRatio(r)}:1</b> — 글자로 쓰기엔 대비가 부족해요. 아래 추천 색을 눌러보세요</>

  return (
    <Card id="contrast-tester" num="01" title="대비 테스트기" en="Contrast Checker" className="wide"
      desc="글자색과 배경색을 넣으면 대비율과 AA 통과 여부를 바로 계산해요. 이 페이지 주소를 복사하면 지금 조합을 그대로 공유할 수 있어요.">
      <Stage log={log}>
        <div className="ct-tester" style={{ width: '100%' }}>
          {/* 입력 */}
          <div className="ct-panel">
            <h4>색 입력</h4>
            <ColorField label="글자색" value={fgIn} onChange={setFgIn} error={!fgP} />
            <ColorField label="배경색" value={bgIn} onChange={setBgIn} error={!bgP} />
            <div className="ct-row">
              <button className="btn ghost sm" onClick={() => { setFgIn(bgIn); setBgIn(fgIn) }}>⇄ 서로 바꾸기</button>
              <button className="btn ghost sm" onClick={share}>{copied ? '✓ 링크 복사됨' : '링크 복사'}</button>
            </div>
            {fgP && fgP.alpha < 1 && <div className="ct-hint">반투명 글자색은 배경과 합성한 색({fg && toHex(fg)})으로 계산해요.</div>}
            <h4 style={{ marginTop: 4 }}>이 사이트의 색으로 해보기</h4>
            <div className="ct-presets">
              {PRESETS.map(p => (
                <button key={p.name} className="ct-preset" onClick={() => { setFgIn(p.fg); setBgIn(p.bg) }}>
                  <i style={{ background: p.bg, color: p.fg }}>가</i>{p.name}
                </button>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          <div className="ct-preview-wrap">
            <div className="ct-vision">
              <span>이렇게 보여요</span>
              <Seg value={vision} onChange={setVision}
                options={(['normal', 'protan', 'deutan', 'tritan', 'achroma'] as Vision[]).map(v => [v, VISION_LABEL[v]] as const)} />
            </div>
            <div className="ct-preview" style={sim ? { background: toHex(sim.bg), color: toHex(sim.fg) } : undefined}>
              <span className="p-tag">큰 글씨 · 24px</span>
              <h3>오늘 할 일 3개가 남았어요</h3>
              <span className="p-tag">굵은 큰 글씨 · 19px Bold</span>
              <h5>마감은 금요일 오후 6시예요</h5>
              <span className="p-tag">본문 · 16px</span>
              <p>글자색과 배경색의 밝기 차이가 충분해야 눈이 피곤하지 않아요. 작은 글씨일수록 더 큰 대비가 필요해요.</p>
              <small>캡션 · 13px — 3분 전 수정됨</small>
              <div className="ct-ui" aria-label="UI 요소 예시">
                <button className="b" tabIndex={-1}>확인</button>
                <span className="f">입력창 테두리</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </div>
            </div>
            {vision !== 'normal' && simRatio && ratio && (
              <div className="ct-hint">
                {VISION_LABEL[vision]} 시뮬레이션 대비 {fmtRatio(simRatio)}:1 (참고용). WCAG 판정은 원래 색 기준이에요.
              </div>
            )}
          </div>

          {/* 결과 */}
          <div className="ct-panel">
            <h4>결과</h4>
            <div className="ct-ratio"><b>{ratio ? fmtRatio(ratio) : '–'}</b><span>: 1</span></div>
            <div>
              <div className="ct-meter"><i style={{ left: ratioPos(r) + '%' }} /></div>
              <div className="ct-meter-lbl">
                <span style={{ left: '0%', transform: 'none' }}>1</span>
                <span style={{ left: ratioPos(3) + '%' }}>3</span>
                <span style={{ left: ratioPos(4.5) + '%' }}>4.5</span>
                <span style={{ left: ratioPos(7) + '%' }}>7</span>
                <span style={{ left: '100%', transform: 'translateX(-100%)' }}>21</span>
              </div>
            </div>
            <ul className="ct-checks">
              <li><span>본문 글자<small>AA · 4.5:1 이상</small></span><Verdict ok={r >= AA.body} /></li>
              <li><span>큰 글씨<small>AA · 3:1 · 24px 또는 굵은 18.66px 이상</small></span><Verdict ok={r >= AA.large} /></li>
              <li><span>UI 요소 · 그래픽<small>AA · 3:1 · 테두리, 아이콘, 포커스 링</small></span><Verdict ok={r >= AA.ui} /></li>
              <li className="aaa"><span>참고: AAA<small>본문 7:1 · 큰 글씨 4.5:1</small></span>
                <span className="ct-ref">{r >= AAA.body ? '본문까지 충족' : r >= AAA.large ? '큰 글씨만 충족' : '미충족'}</span></li>
            </ul>
            {fixes.length > 0 && (
              <div className="ct-fix">
                <h4>가장 가까운 통과 색 (본문 4.5:1)</h4>
                {fixes.map((f, i) => (
                  <button key={i} onClick={() => { setFgIn(f.fg); setBgIn(f.bg) }}>
                    <i style={{ background: f.swatch }} />
                    <span style={{ flex: 1 }}>{f.label}<br /><code>{f.fg} on {f.bg} · {fmtRatio(f.r)}:1</code></span>
                  </button>
                ))}
                <div className="ct-hint">색상과 채도는 그대로 두고 밝기만 조절했어요.</div>
              </div>
            )}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['계산', '(밝은 색 휘도 + 0.05) ÷ (어두운 색 휘도 + 0.05)'], ['판정 기준', 'WCAG 2.1 AA'], ['입력', 'HEX · rgb() · hsl() · 색 이름']]}
        usage={[
          ['언제', '디자인 시안의 색을 정할 때, 브랜드 색을 버튼에 쓸 때, 다크 모드 색을 따로 만들 때'],
          ['주의', '대비율은 소수 둘째 자리에서 내림해 보여줘요. 4.499는 4.5가 아니에요 — 반올림해서 통과시키면 안 돼요.'],
        ]}
      />
    </Card>
  )
})
