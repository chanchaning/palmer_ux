import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Info, Stage } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'
import { AA, contrast, fmtRatio, parseColor, toHex, VISION_LABEL, type RGB, type Vision } from '../lib'
import { useTester, VisionFilters } from '../shared'

/* ---------- 02 팔레트 일괄 검사 ---------- */
const DEFAULT_PAL = '#1b1b19 #4d4d48 #63635d #9d9d95\n#ffffff #f0f0ec #1c1c1a\n#3550ee #c2410c #c92a2a'
export function Palette() {
  const { load } = useTester()
  const [text, setText] = useState(DEFAULT_PAL)
  const [mode, setMode] = useState<'body' | 'large'>('body')
  const colors = useMemo(() => {
    const seen = new Set<string>()
    const out: { hex: string; rgb: RGB }[] = []
    for (const tok of text.split(/[\s,;]+/)) {
      const p = parseColor(tok)
      if (!p) continue
      const hex = toHex(p.rgb)
      if (seen.has(hex)) continue
      seen.add(hex); out.push({ hex, rgb: p.rgb })
      if (out.length >= 12) break
    }
    return out
  }, [text])
  const bad = text.split(/[\s,;]+/).filter(t => t && !parseColor(t))
  const need = mode === 'body' ? AA.body : AA.large
  let pass = 0, total = 0
  colors.forEach((a, i) => colors.forEach((b, j) => { if (i !== j) { total++; if (contrast(a.rgb, b.rgb) >= need) pass++ } }))

  return (
    <Card id="contrast-palette" num="02" title="팔레트 일괄 검사" en="Palette Matrix" className="wide"
      desc="디자인 시스템의 색을 한꺼번에 붙여넣으면 모든 글자·배경 조합의 대비를 표로 보여줘요. 칸을 누르면 위 테스트기로 보내요.">
      <Stage log={<>{colors.length}개 색 · <b>{total}개 조합</b> 중 <b>{pass}개</b>가 {mode === 'body' ? '본문(4.5:1)' : '큰 글씨·UI(3:1)'} 기준 통과{bad.length ? ` · 읽지 못한 값: ${bad.slice(0, 3).join(', ')}` : ''}</>}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="ct-pal-top">
            <textarea aria-label="검사할 색 목록" value={text} onChange={e => setText(e.target.value)} spellCheck={false}
              placeholder="#111 #333 #fff … 공백·쉼표·줄바꿈으로 구분 (최대 12개)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <Seg value={mode} onChange={setMode} options={[['body', '본문 4.5:1'], ['large', '큰 글씨·UI 3:1']]} />
              <button className="btn ghost sm" onClick={() => setText(DEFAULT_PAL)}>이 사이트 색으로 되돌리기</button>
            </div>
          </div>
          <div className="ct-matrix-wrap">
            <table className="ct-matrix">
              <thead>
                <tr><th style={{ textAlign: 'left' }}>글자 ↓ · 배경 →</th>{colors.map(c => <th key={c.hex}><i style={{ background: c.hex }} />{c.hex}</th>)}</tr>
              </thead>
              <tbody>
                {colors.map(fg => (
                  <tr key={fg.hex}>
                    <th style={{ textAlign: 'right' }}><i style={{ background: fg.hex }} />{fg.hex}</th>
                    {colors.map(bg => {
                      const r = contrast(fg.rgb, bg.rgb)
                      const self = fg.hex === bg.hex
                      const lvl = r >= AA.body ? 'body' : r >= AA.large ? 'large' : 'fail'
                      const ok = r >= need
                      return (
                        <td key={bg.hex}>
                          <button className={'ct-cell' + (self ? ' self' : ok ? '' : ' fail')} style={{ background: bg.hex, color: fg.hex, borderColor: ok && lvl === 'body' ? 'var(--ok)' : 'transparent' }}
                            data-mark={lvl === 'body' ? 'AA' : lvl === 'large' ? 'AA 큰' : ''} aria-label={`${fg.hex} 글자, ${bg.hex} 배경, ${fmtRatio(r)} 대 1`}
                            onClick={() => load(fg.hex, bg.hex)} tabIndex={self ? -1 : 0}>
                            <b>가 {fmtRatio(r)}</b><small>{lvl === 'body' ? '본문 OK' : lvl === 'large' ? '큰 글씨만' : '미달'}</small>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ct-legend"><span><b>AA</b> 본문까지 통과</span><span><b>AA 큰</b> 큰 글씨·UI만 통과</span><span>흐린 칸은 선택한 기준 미달</span></div>
        </div>
      </Stage>
      <Info
        spec={[['최대', '12색 · 132조합'], ['입력', 'HEX · 색 이름 (공백·쉼표·줄바꿈)']]}
        usage={[
          ['언제', '디자인 토큰을 정할 때, 회색 단계를 몇 개 둘지 고민할 때, “이 회색 위에 이 글자 써도 되나?”를 한 번에 확인할 때'],
          ['팁', '통과 칸만 모아 “허용 조합표”로 문서화하면 디자이너·개발자가 매번 계산하지 않아도 돼요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 이미지 위 글자 ---------- */
type Scene = 'sunset' | 'city' | 'flowers'
const W = 600, H = 340
/** 결정적 난수 */
const rng = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
function drawScene(c: CanvasRenderingContext2D, s: Scene, w = W, h = H) {
  c.save(); c.scale(w / W, h / H)
  if (s === 'sunset') {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b2d6e'); g.addColorStop(0.45, '#e56a5a'); g.addColorStop(0.7, '#ffc46b'); g.addColorStop(1, '#fff2c7')
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    c.fillStyle = '#fff8e1'; c.beginPath(); c.arc(420, 235, 46, 0, Math.PI * 2); c.fill()
    c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 6; i++) c.fillRect(0, 262 + i * 13, W, 3)
  } else if (s === 'city') {
    c.fillStyle = '#0d1426'; c.fillRect(0, 0, W, H)
    const r = rng(7)
    for (let x = 0; x < W; x += 34 + r() * 20) {
      const bh = 120 + r() * 200, bw = 30 + r() * 26
      c.fillStyle = '#18213a'; c.fillRect(x, H - bh, bw, bh)
      for (let y = H - bh + 8; y < H - 6; y += 12) for (let xx = x + 4; xx < x + bw - 6; xx += 9) if (r() > 0.55) { c.fillStyle = r() > 0.5 ? '#ffd56a' : '#f4f1ff'; c.fillRect(xx, y, 5, 6) }
    }
  } else {
    c.fillStyle = '#cfe9c6'; c.fillRect(0, 0, W, H)
    const r = rng(11), cols = ['#ffffff', '#ffe066', '#ff8fab', '#f8f9fa', '#ffd8a8', '#e599f7']
    for (let i = 0; i < 260; i++) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.beginPath(); c.arc(r() * W, r() * H, 4 + r() * 12, 0, Math.PI * 2); c.fill() }
  }
  c.restore()
}
type Overlay = 'none' | 'scrim' | 'gradient' | 'box'
const ZONE = { x0: 0.07, x1: 0.93, y0: 0.58, y1: 0.93 }

export function ImageText() {
  const [scene, setScene] = useState<Scene>('sunset')
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [amount, setAmount] = useState(45)
  const [textColor, setTextColor] = useState<'#ffffff' | '#111111'>('#ffffff')
  const [vision, setVision] = useState<Vision>('normal')
  const canvas = useRef<HTMLCanvasElement>(null)
  const thumbs = useRef<Record<Scene, HTMLCanvasElement | null>>({ sunset: null, city: null, flowers: null })
  const [stats, setStats] = useState({ min: 0, pass: 0, med: 0 })

  useEffect(() => {
    (Object.keys(thumbs.current) as Scene[]).forEach(s => {
      const cv = thumbs.current[s]; const c = cv?.getContext('2d'); if (cv && c) drawScene(c, s, cv.width, cv.height)
    })
  }, [])

  useEffect(() => {
    const cv = canvas.current, c = cv?.getContext('2d')
    if (!cv || !c) return
    drawScene(c, scene)
    // 글자 영역 픽셀을 샘플링해 오버레이를 합성한 뒤 대비 계산
    const x0 = Math.round(W * ZONE.x0), x1 = Math.round(W * ZONE.x1), y0 = Math.round(H * ZONE.y0), y1 = Math.round(H * ZONE.y1)
    const data = c.getImageData(x0, y0, x1 - x0, y1 - y0).data
    const tc = parseColor(textColor)!.rgb
    const ov = textColor === '#ffffff' ? [0, 0, 0] : [255, 255, 255]
    const a = amount / 100
    const rs: number[] = []
    for (let y = 0; y < y1 - y0; y += 3) for (let x = 0; x < x1 - x0; x += 3) {
      const i = (y * (x1 - x0) + x) * 4
      let alpha = 0
      if (overlay === 'scrim' || overlay === 'box') alpha = a
      else if (overlay === 'gradient') alpha = a * Math.min(1, ((y0 + y) / H - 0.35) / 0.55 + 0.15)
      alpha = Math.max(0, Math.min(1, alpha))
      const px: RGB = [0, 1, 2].map(k => data[i + k] * (1 - alpha) + ov[k] * alpha) as RGB
      rs.push(contrast(tc, px))
    }
    rs.sort((p, q) => p - q)
    setStats({ min: rs[0], med: rs[Math.floor(rs.length / 2)], pass: rs.filter(r => r >= AA.body).length / rs.length })
  }, [scene, overlay, amount, textColor])

  const ovColor = textColor === '#ffffff' ? '0,0,0' : '255,255,255'
  const a = amount / 100
  const ovStyle = overlay === 'scrim' ? { background: `rgba(${ovColor},${a})` }
    : overlay === 'gradient' ? { background: `linear-gradient(to bottom, rgba(${ovColor},0) 20%, rgba(${ovColor},${a * 0.6}) 55%, rgba(${ovColor},${a}) 90%)` } : undefined
  const ok = stats.min >= AA.body, okLarge = stats.min >= AA.large

  return (
    <Card id="contrast-image" num="03" title="이미지 위 글자" en="Text over Images"
      desc="사진 위 글자는 가장 밝은(또는 어두운) 부분을 기준으로 봐야 해요. 글자 영역의 모든 픽셀을 재서 가장 나쁜 대비를 알려줘요.">
      <Stage log={<>가장 나쁜 곳 <b className={ok ? 'ct-ok' : okLarge ? '' : 'ct-bad'}>{fmtRatio(stats.min)}:1</b> · {ok ? '본문까지 안전해요' : okLarge ? '큰 제목만 안전해요 — 작은 글씨는 위험' : '글자가 묻히는 곳이 있어요 — 오버레이를 올려보세요'}</>}>
        <div className="box left">
          <div className="ct-row">
            <div className="ct-thumbs" role="radiogroup" aria-label="배경 이미지">
              {(['sunset', 'city', 'flowers'] as Scene[]).map(s => (
                <button key={s} className={scene === s ? 'on' : ''} aria-label={{ sunset: '노을', city: '야경', flowers: '꽃밭' }[s]} onClick={() => setScene(s)}>
                  <canvas ref={el => { thumbs.current[s] = el }} width={108} height={64} />
                </button>
              ))}
            </div>
            <Seg value={textColor} onChange={setTextColor} options={[['#ffffff', '흰 글자'], ['#111111', '검은 글자']]} />
          </div>
          <div className="ct-img" style={vision !== 'normal' ? { filter: `url(#ctimg-${vision})` } : undefined}>
            <canvas ref={canvas} width={W} height={H} aria-label="배경 이미지" />
            <div className="ov" style={ovStyle} />
            <div className="txt" style={{ color: textColor, background: overlay === 'box' ? `rgba(${ovColor},${a})` : undefined }}>
              <b>주말엔 바다로 떠나요</b>
              <span>3월 15일까지 숙소 20% 할인</span>
            </div>
            <div className="zone" />
          </div>
          <VisionFilters prefix="ctimg" />
          <Seg value={overlay} onChange={setOverlay} className="full" options={[['none', '없음'], ['scrim', '전체 덮기'], ['gradient', '아래 그라데이션'], ['box', '글자 뒤 박스']]} />
          {overlay !== 'none' && (
            <>
              <div className="ct-label"><span>오버레이 농도</span><b>{amount}%</b></div>
              <Range value={amount} min={0} max={85} onChange={setAmount} label="오버레이 농도" />
            </>
          )}
          <div className="ct-stats">
            <div>가장 나쁜 곳<b className={ok ? 'ct-ok' : 'ct-bad'}>{fmtRatio(stats.min)}</b></div>
            <div>중간값<b>{fmtRatio(stats.med)}</b></div>
            <div>4.5:1 넘는 면적<b>{Math.round(stats.pass * 100)}%</b></div>
          </div>
          <div className="ct-vision"><span>색각 시뮬레이션</span>
            <Seg value={vision} onChange={setVision} options={(['normal', 'deutan', 'achroma'] as Vision[]).map(v => [v, VISION_LABEL[v]] as const)} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['기준', '글자 영역의 가장 나쁜 대비'], ['측정', '점선 영역 픽셀 전체']]}
        usage={[
          ['해결', '반투명 덮개(스크림), 아래쪽만 어두운 그라데이션, 글자 뒤 박스 순으로 효과가 커요.'],
          ['주의', '글자 그림자는 보조일 뿐이에요. 사진이 바뀌는 배너라면 가장 밝은 사진 기준으로 맞춰요.'],
        ]}
      />
    </Card>
  )
}
