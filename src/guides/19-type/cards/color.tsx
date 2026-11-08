import { useEffect, useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, Seg } from '../../../components/ui'

/* ---------- 06 명도 대비 ---------- */
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const PRESETS: [string, string][] = [
  ['#000000', '순수 검정'], ['#111111', '먹색'], ['#333333', '본문'], ['#666666', '부가'], ['#767676', '최소 회색'], ['#999999', '너무 연함'],
]
export function Contrast() {
  const [fg, setFg] = useState('#333333')
  const [bg, setBg] = useState('#ffffff')
  const box = useRef<HTMLDivElement>(null)
  const r = contrast(fg, bg)
  const pass = (t: number) => r >= t
  const demo = useDemo({
    reset() { setFg('#333333'); setBg('#ffffff') },
    async play(c) {
      for (const [hex] of [PRESETS[0], PRESETS[4], PRESETS[5], PRESETS[2]]) {
        await c.press(box.current, box.current?.querySelector<HTMLElement>(`[data-hex="${hex}"]`) ?? null)
        await c.sleep(1100)
      }
    },
  })
  const note = fg === '#000000' && bg === '#ffffff' ? '대비는 최고지만 눈부심(헐레이션)으로 오래 읽으면 피곤해요'
    : r < 4.5 ? '본문으로 쓰기엔 대비가 부족해요' : r < 7 ? '본문 기준(AA) 통과' : '아주 또렷해요(AAA)'
  return (
    <Card id="type-contrast" num="06" title="색상과 명도 대비" en="Contrast" demo={demo}
      desc="흰 배경에 순수 검정은 눈이 부셔요. 본문은 #111~#333, 부가 설명은 #666~#767676을 써요.">
      <Stage log={<>대비 <b>{r.toFixed(2)}:1</b> — {note}</>}>
        <div className="box left" ref={box}>
          <div className="ty-swatches">
            {PRESETS.map(([hex, name]) => (
              <button key={hex} data-hex={hex} className={fg === hex ? 'on' : ''} onClick={() => { setFg(hex); setBg('#ffffff') }}>
                <i style={{ background: hex }} />{name} {hex}
              </button>
            ))}
          </div>
          <div className="ty-pick">
            <label>글자 <input type="color" value={fg} onChange={e => setFg(e.target.value)} /></label>
            <label>배경 <input type="color" value={bg} onChange={e => setBg(e.target.value)} /></label>
          </div>
          <div className="ty-contrast" style={{ color: fg, background: bg }}>
            <span className="big">큰 글씨 제목 24px</span>
            <span style={{ fontSize: 16, lineHeight: 1.6 }}>본문 16px 글자는 배경과 최소 4.5:1 이상의 대비가 필요해요.</span>
          </div>
          <div className="ty-ratio"><b>{r.toFixed(2)}:1</b><span className="muted">WCAG 2.1 대비</span></div>
          <div className="ty-badges">
            <span className={pass(4.5) ? 'pass' : 'fail'}>본문 AA {pass(4.5) ? '통과' : '미달'} (4.5)</span>
            <span className={pass(7) ? 'pass' : 'fail'}>본문 AAA {pass(7) ? '통과' : '미달'} (7)</span>
            <span className={pass(3) ? 'pass' : 'fail'}>큰 글씨 AA {pass(3) ? '통과' : '미달'} (3)</span>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['본문 최소', '4.5:1'], ['큰 글씨', '3:1 (24px · 굵은 18.66px 이상)']]}
        usage={[
          ['원리', '대비는 두 색의 상대 휘도 비율이에요. #767676은 흰 배경에서 4.5:1을 겨우 넘는 가장 연한 회색이에요.'],
          ['주의', '회색 글자를 컬러 배경 위에 올리면 대비가 확 떨어져요. 배경이 바뀌면 다시 재요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 숫자 정렬 ---------- */
function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting))
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return [ref, vis] as const
}
const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000), cs = Math.floor((ms % 1000) / 10)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
export function Tabular() {
  const [ref, vis] = useInView<HTMLDivElement>()
  const [prices, setPrices] = useState([11900, 8100, 141000, 7110])
  const [t, setT] = useState(0)
  const [mode, setMode] = useState<'prop' | 'tab'>('prop')
  useEffect(() => {
    if (!vis) return
    const t0 = performance.now() - t
    const a = setInterval(() => setT(performance.now() - t0), 33)
    const b = setInterval(() => setPrices(p => p.map(v => Math.max(1000, Math.round((v + (Math.random() - 0.5) * v * 0.3) / 10) * 10))), 700)
    return () => { clearInterval(a); clearInterval(b) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vis])
  return (
    <Card id="type-num" num="07" title="숫자 정렬" en="Tabular Numbers"
      desc="가격표·통계·타이머처럼 숫자가 바뀌거나 세로로 쌓이면 숫자 폭을 고정해요.">
      <Stage log={mode === 'prop' ? <><b>proportional</b> — 1과 0의 폭이 달라 숫자가 바뀔 때마다 <b>덜덜 떨려요</b></> : <><b>tabular-nums</b> — 모든 숫자 폭이 같아 자릿수가 줄을 맞춰요</>}>
        <div className="box left" ref={ref}>
          <Seg value={mode} onChange={setMode} options={[['prop', '기본 (비례 폭)'], ['tab', 'tabular-nums']]} />
          <div className={'ty-timer ' + mode}>{fmtTime(t)}</div>
          <div className="ty-prices">
            <div><small>기본 (비례 폭)</small><ul className="prop">{prices.map((p, i) => <li key={i}>{p.toLocaleString()}원</li>)}</ul></div>
            <div><small>tabular-nums</small><ul className="tab">{prices.map((p, i) => <li key={i}>{p.toLocaleString()}원</li>)}</ul></div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['CSS', 'font-variant-numeric: tabular-nums']]}
        usage={[
          ['언제', '가격표, 표, 통계 대시보드, 타이머, 카운트다운, 실시간 시세'],
          ['주의', '문장 속 숫자에는 필요 없어요. 비례 폭이 더 자연스러워요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 08 iOS 자동 줌 ---------- */
export function IosZoom() {
  const [size, setSize] = useState<14 | 16>(14)
  const [zoom, setZoom] = useState(false)
  const dev = useRef<HTMLDivElement>(null)
  const inp = useRef<HTMLInputElement>(null)
  const demo = useDemo({
    reset() { setSize(14); setZoom(false); inp.current?.blur() },
    async play(c) {
      c.tap(dev.current, inp.current); await c.sleep(200); inp.current?.focus(); await c.sleep(1600)
      inp.current?.blur(); await c.sleep(700)
      setSize(16); await c.sleep(600)
      c.tap(dev.current, inp.current); await c.sleep(200); inp.current?.focus(); await c.sleep(1500)
      inp.current?.blur()
    },
  })
  return (
    <Card id="type-ios" num="08" title="입력창 16px 규칙" en="iOS Auto-zoom" demo={demo}
      desc="모바일 사파리는 16px보다 작은 입력창을 누르면 화면을 강제로 확대해요.">
      <Stage log={zoom ? <>입력창 <b>{size}px</b> → 화면이 <b>강제로 확대</b>돼 레이아웃이 깨졌어요</> : size === 16 ? <>입력창 <b>16px</b> — 눌러도 확대되지 않아요</> : <>입력창을 눌러보세요 (현재 <b>{size}px</b>)</>}>
        <Seg value={size} onChange={v => { setSize(v); setZoom(false) }} options={[[14, '입력창 14px'], [16, '입력창 16px']]} />
        <Device ref={dev}>
          <div className={'ty-zoomer' + (zoom ? ' zoom' : '')}>
            <b style={{ fontSize: 17 }}>로그인</b>
            <label>이메일</label>
            <input ref={inp} style={{ fontSize: size }} placeholder="name@example.com"
              onFocus={() => setZoom(size < 16)} onBlur={() => setZoom(false)} />
            <label>비밀번호</label>
            <input type="password" style={{ fontSize: size }} placeholder="••••••••" onFocus={() => setZoom(size < 16)} onBlur={() => setZoom(false)} />
            <button className="btn">로그인</button>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['입력창', 'font-size ≥ 16px'], ['대상', 'iOS 사파리 · 모바일 웹']]}
        usage={[
          ['원리', '작은 입력 글씨를 읽기 쉽게 하려고 브라우저가 자동으로 확대해요. 끝나도 원래 배율로 돌아오지 않아요.'],
          ['주의', 'maximum-scale=1로 확대를 막으면 접근성을 해쳐요. 글자 크기를 16px로 맞추는 게 정답이에요.'],
        ]}
      />
    </Card>
  )
}
