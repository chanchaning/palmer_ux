import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo, type DemoCtx } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { EASE, useMotion } from '../../../lib/motion'
import { Ic, MdSeg, fill, useRipple } from '../shared'

/* ---------- 01 Elevation ---------- */
const SH = ['none',
  '0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15)',
  '0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15)',
  '0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15)',
  '0 2px 3px rgba(0,0,0,.3), 0 6px 10px 4px rgba(0,0,0,.15)',
  '0 4px 4px rgba(0,0,0,.3), 0 8px 12px 6px rgba(0,0,0,.15)']
const TINT = [0, 5, 8, 11, 12, 14]
const ROLE = ['배경과 같은 높이', '카드', '살짝 뜬 카드', '메뉴 · 검색 바', '눌린 FAB', '대화상자']
type ElMode = 'both' | 'shadow' | 'tone'

export function Elevation() {
  const [n, setN] = useState(2)
  const [mode, setMode] = useState<ElMode>('both')
  const box = useRef<HTMLDivElement>(null)
  const how = mode === 'both' ? '그림자와 표면 톤' : mode === 'shadow' ? '그림자만' : '표면 톤만'
  const log = n === 0 ? <><b>Level 0</b> — 배경에 붙은 평평한 종이예요</>
    : <><b>Level {n}</b> — {how}으로 {mode === 'tone' ? '밝기가 달라져 위에 있다는 걸 알려요' : '아래 종이 위에 떠 있어요'}</>
  const btn = (v: ElMode) => box.current?.querySelector<HTMLElement>('#material-elev-mode button[data-v="' + v + '"]') ?? null

  const demo = useDemo({
    reset() { setMode('both'); setN(0) },
    async play(c) {
      for (let k = 1; k <= 5; k++) { setN(k); await c.sleep(420) }
      await c.sleep(500)
      await c.press(box.current, btn('tone')); await c.sleep(1100)
      await c.press(box.current, btn('both')); setN(2)
    },
  })

  return (
    <Card id="material-elev" num="01" title="디지털 종이와 잉크" en="Elevation"
      desc="UI 요소를 빛과 그림자가 있는 종이로 봐요. 높이 떠 있을수록 더 중요한 요소예요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}>
          <MdSeg id="material-elev-mode" value={mode} onChange={setMode}
            options={[['both', '그림자 + 톤'], ['shadow', '그림자만'], ['tone', '톤만 (M3)']]} />
          <div className="md-el-area">
            <div className="md-el-back"><b style={{ fontSize: 12 }}>아래 종이 · Level 1</b><div className="fake-line" style={{ width: '80%' }} /><div className="fake-line" style={{ width: '55%' }} /></div>
            <div className={'md-el-paper' + (n === 0 ? ' flat' : '')} style={{
              boxShadow: mode === 'tone' ? 'none' : SH[n],
              backgroundColor: mode === 'shadow' ? 'var(--surface)' : 'color-mix(in srgb, var(--accent) ' + TINT[n] + '%, var(--surface))',
              transform: 'translateY(' + -n * 3 + 'px)',
            }}>
              <b>Level {n}</b><div className="fake-line" style={{ width: '85%' }} /><div className="fake-line" style={{ width: '65%' }} /><div className="fake-line" style={{ width: '40%' }} />
            </div>
            <span className="md-el-tag">배경 · Level 0</span>
          </div>
          <div className="md-el-side" aria-hidden="true">
            <span>옆에서 보면</span>
            <i className="md-el-shd" style={{ opacity: n ? 0.12 + n * 0.05 : 0, transform: 'scaleX(' + (1 + n * 0.06) + ')' }} />
            <i className="md-el-slab" style={{ bottom: 10 + n * 6 }} />
          </div>
          <div className="md-lab"><span>고도 (Elevation)</span><b>Level {n} · {ROLE[n]}</b></div>
          <input type="range" min={0} max={5} step={1} value={n} aria-label="고도 단계" style={fill(n, 0, 5)}
            onChange={e => setN(+e.target.value)} />
        </div>
      </Stage>
      <Info
        spec={[['단계', 'Level 0–5'], ['표현', '그림자 · 표면 톤']]}
        usage={[
          ['개념', '종이가 겹칠 때 생기는 그림자(고도)로 무엇이 위에 있고 무엇이 중요한지 알려줘요.'],
          ['M3', '그림자와 함께 표면 색 톤 차이(tonal elevation)로도 높이를 표현해요. 다크 모드에서 특히 잘 보여요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 Dynamic Color ---------- */
const WPS = [
  { n: '노을', c: ['#ffb37a', '#f2545b', '#6d2e5b'] },
  { n: '숲', c: ['#d8f3dc', '#52b788', '#1b4332'] },
  { n: '바다', c: ['#caf0f8', '#0096c7', '#023e8a'] },
  { n: '라벤더', c: ['#f3e8ff', '#a78bdb', '#5b3f9e'] },
  { n: '레몬', c: ['#fff6c7', '#f2c230', '#7a5c0e'] },
]
const POS = [[16, 22], [55, 55], [86, 84]]
const grad = (w: typeof WPS[number]) => 'linear-gradient(135deg, ' + w.c[0] + ', ' + w.c[1] + ' 55%, ' + w.c[2] + ')'
const hsl = (hex: string) => {
  const v = (hex.slice(1).match(/../g) ?? []).map(x => parseInt(x, 16) / 255)
  const mx = Math.max(...v), mn = Math.min(...v), l = (mx + mn) / 2, d = mx - mn
  let h = 0, s = 0
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (mx === v[0]) h = ((v[1] - v[2]) / d) % 6; else if (mx === v[1]) h = (v[2] - v[0]) / d + 2; else h = (v[0] - v[1]) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return { h, s, l, c: d }
}
const H = (h: number, s: number, l: number) => 'hsl(' + Math.round(((h % 360) + 360) % 360) + ',' + Math.round(Math.min(1, s) * 100) + '%,' + l + '%)'
const isDark = () => {
  const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g)
  return m ? (+m[0] * 0.3 + +m[1] * 0.59 + +m[2] * 0.11) < 128 : false
}
const pal = (h: number, s0: number, dark: boolean): Record<string, string> => {
  const s = Math.max(0.4, Math.min(0.85, s0))
  return dark ? {
    pri: H(h, s, 78), onPri: H(h, s, 18), pc: H(h, s * 0.7, 28), onPc: H(h, s, 90), secC: H(h, s * 0.3, 27), onSecC: H(h, s * 0.35, 88),
    terC: H(h + 60, s * 0.6, 28), onTerC: H(h + 60, s, 88), sf: H(h, s * 0.18, 9), sc: H(h, s * 0.16, 15), onSf: H(h, s * 0.12, 90), onSfV: H(h, s * 0.1, 70), ol: H(h, s * 0.08, 48),
    sec: H(h, s * 0.35, 75), ter: H(h + 60, s * 0.6, 78),
  } : {
    pri: H(h, s, 40), onPri: '#ffffff', pc: H(h, s, 90), onPc: H(h, s, 14), secC: H(h, s * 0.35, 89), onSecC: H(h, s * 0.4, 15),
    terC: H(h + 60, s * 0.7, 89), onTerC: H(h + 60, s, 15), sf: H(h, s * 0.3, 98), sc: H(h, s * 0.25, 93), onSf: H(h, s * 0.15, 11), onSfV: H(h, s * 0.1, 34), ol: H(h, s * 0.1, 60),
    sec: H(h, s * 0.35, 42), ter: H(h + 60, s * 0.6, 40),
  }
}
const seedOf = (i: number) => {
  const cs = WPS[i].c.map(hsl)
  let si = 0
  cs.forEach((c, k) => { if (c.c > cs[si].c) si = k })
  return { si, seed: cs[si] }
}
const seedMsg = (i: number): ReactNode => {
  const w = WPS[i], { si } = seedOf(i)
  return <><b>{w.n}</b> 배경에서 시드 <b style={{ color: w.c[si] }}>●</b> {w.c[si].toUpperCase()} 추출 → 테마 색 자동 적용</>
}
const DC_INIT = <>배경화면을 골라 <b>테마 색</b>이 바뀌는 걸 보세요</>

export function DynamicColor() {
  const m = useMotion()
  const [cur, setCur] = useState(0)
  const [dark, setDark] = useState(isDark)
  const [log, setLog] = useState<ReactNode>(() => seedMsg(0))
  const [alarm, setAlarm] = useState(true)
  const [tab, setTab] = useState(0)
  const [anim, setAnim] = useState(0)
  const wps = useRef<HTMLDivElement>(null)
  const wall = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLSpanElement>(null)
  const curRef = useRef(cur)
  curRef.current = cur

  // 테마가 바뀌면 팔레트 다시 계산
  useEffect(() => {
    const re = () => { setDark(isDark()); setLog(seedMsg(curRef.current)) }
    const mo = new MutationObserver(re)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', re)
    return () => { mo.disconnect(); mq.removeEventListener('change', re) }
  }, [])

  // 배경 교체 연출 (커밋 뒤에 실행)
  useLayoutEffect(() => {
    if (!anim) return
    const w = wall.current, r = ring.current
    if (w) { w.classList.remove('fade'); void w.offsetWidth; w.classList.add('fade') }
    r?.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.15)', offset: 0.35 }, { opacity: 1, transform: 'scale(1)', offset: 0.8 }, { opacity: 0, transform: 'scale(1)' }], { duration: m.D(1300), easing: EASE.std })
  }, [anim, m])

  const apply = (i: number) => { setCur(i); setLog(seedMsg(i)); setAnim(a => a + 1) }

  const w = WPS[cur], { si, seed } = seedOf(cur)
  const p = pal(seed.h, seed.s, dark)
  const vars = Object.fromEntries(Object.entries(p).map(([k, v]) => ['--dc-' + k, v])) as CSSProperties
  const s = Math.max(0.4, Math.min(0.85, seed.s))

  const demo = useDemo({
    reset() { setCur(0); setLog(DC_INIT) },
    async play(c) {
      for (const i of [2, 1, 3, 4, 0]) {
        await c.press(wps.current, wps.current?.querySelectorAll<HTMLElement>('button')[i] ?? null)
        await c.sleep(1400)
      }
    },
  })

  return (
    <Card id="material-dc" num="02" title="다이내믹 컬러" en="Dynamic Color · Material You"
      desc="배경화면에서 색을 뽑아 버튼·배경 같은 테마 색을 자동으로 맞춰요." demo={demo}>
      <Stage log={log}>
        <div className="md-wps" ref={wps} role="group" aria-label="배경화면 고르기">
          {WPS.map((x, i) => (
            <button key={x.n} className={'md-wp' + (i === cur ? ' on' : '')} style={{ background: grad(x) }}
              aria-label={x.n + ' 배경화면'} title={x.n} onClick={() => apply(i)} />
          ))}
        </div>
        <Device className="md-dc-dev" light style={vars}>
          <div className="scr md-dc-scr">
            <div className="md-dc-wall" ref={wall} style={{ background: grad(w) }}>
              <div className="md-dc-clock">9:41<small>11월 8일 일요일</small></div>
              <span className="md-dc-ring" ref={ring} style={{ left: POS[si][0] + '%', top: POS[si][1] + '%', background: w.c[si] }} />
            </div>
            <div className="md-dc-app">
              <div className="md-dc-hd"><b>오늘</b><span className="md-dc-av">P</span></div>
              <div className="md-dc-card"><small>다음 일정</small><b>디자인 리뷰</b><span>오후 3:00 · 회의실 B</span></div>
              <div className="md-dc-row"><button className="md-dc-btn" data-rip="">참석</button><button className="md-dc-btn t" data-rip="">나중에</button></div>
              <div className="md-dc-sw"><span>일정 알림 받기</span>
                <button className="md-dc-switch" role="switch" aria-checked={alarm} aria-label="일정 알림" onClick={() => setAlarm(a => !a)} />
              </div>
            </div>
            <div className="md-dc-nav">
              {([['home', '홈'], ['event', '일정'], ['person', '나']] as const).map(([ic, t], i) => (
                <button key={ic} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}><span data-rip=""><Ic n={ic} /></span>{t}</button>
              ))}
            </div>
            <button className="md-dc-fab" data-rip="" aria-label="새 일정"><Ic n="add" /></button>
          </div>
        </Device>
        <div className="md-pal">
          <div className="md-sw4">
            {([['Primary', p.pri], ['Secondary', p.sec], ['Tertiary', p.ter], ['Surface', p.sc]] as const).map(([n, c]) => (
              <div key={n}><span style={{ backgroundColor: c }} />{n}</div>
            ))}
          </div>
          <div className="md-tones" aria-label="Primary 톤 단계">
            {Array.from({ length: 11 }, (_, k) => <span key={k} style={{ backgroundColor: H(seed.h, s, k * 10) }} />)}
          </div>
          <div className="md-tones-l"><span>0 · 어두움</span><span>Primary 톤 팔레트</span><span>100 · 밝음</span></div>
        </div>
      </Stage>
      <Info
        spec={[['입력', '배경화면 1장'], ['출력', '톤 팔레트 → 역할 색']]}
        usage={[
          ['개념', '배경화면의 대표색(시드)에서 밝기만 다른 톤들을 만들고, Primary·Container·Surface 같은 역할에 나눠 줘요.'],
          ['주의', '앱 색이 사용자마다 달라져요. 색을 직접 쓰지 말고 역할 이름(토큰)으로 지정해야 대비가 유지돼요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 Ripple ---------- */
const RP_INIT = <>아무 곳이나 <b>눌러서 잉크</b>가 퍼지는 걸 보세요 (길게 누르면 유지)</>

export function Ripple() {
  const ripple = useRipple()
  const [log, setLog] = useState<ReactNode>(RP_INIT)
  const [like, setLike] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const likeRef = useRef<HTMLButtonElement>(null)

  const say = (host: HTMLElement, x: number, y: number) => {
    const r = host.getBoundingClientRect()
    const n = host.dataset.n || '요소'
    if (host.dataset.rip === 'u') setLog(<><b>{n}</b> · 경계 없는 리플 — 가운데서 원으로 번져요</>)
    else setLog(<><b>{n}</b> · 터치 지점 <b>({Math.round(x - r.left)}, {Math.round(y - r.top)})</b>에서 퍼져 모서리까지 채워요</>)
  }
  const fire = async (c: DemoCtx, host: HTMLElement | null | undefined, fx: number, fy: number, hold: number) => {
    if (!host) return
    const r = host.getBoundingClientRect(), x = r.left + r.width * fx, y = r.top + r.height * fy
    say(host, x, y)
    const rel = ripple(host, x, y)
    try { await c.sleep(hold) } finally { rel() }
  }

  const demo = useDemo({
    reset() { setLike(false); setLog(RP_INIT) },
    async play(c) {
      const li = box.current?.querySelectorAll<HTMLElement>('.md-li'), bt = box.current?.querySelectorAll<HTMLElement>('.md-btn')
      await fire(c, li?.[0], 0.12, 0.5, 300); await c.sleep(700)
      await fire(c, li?.[1], 0.85, 0.3, 300); await c.sleep(700)
      await fire(c, li?.[2], 0.5, 0.5, 900); await c.sleep(700)
      await fire(c, bt?.[0], 0.2, 0.5, 250); await c.sleep(600)
      await fire(c, likeRef.current, 0.5, 0.5, 250); setLike(true); await c.sleep(600)
    },
  })

  return (
    <Card id="material-ripple" num="03" title="리플 효과" en="Ripple"
      desc="누른 지점에서 잉크가 물결처럼 퍼져서, 어디를 눌렀는지 바로 알려줘요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}
          onPointerDown={e => { const h = (e.target as Element).closest<HTMLElement>('[data-rip]'); if (h) say(h, e.clientX, e.clientY) }}>
          <div className="md-cap">경계 있는 리플<em>터치 지점에서 시작 · 요소 밖으로 안 나가요</em></div>
          <div className="md-list">
            <button className="md-li md-sl" data-rip="" data-n="와이파이"><span className="md-av">📶</span><span>와이파이<small>연결됨 · Palmer_5G</small></span></button>
            <button className="md-li md-sl" data-rip="" data-n="블루투스"><span className="md-av">🎧</span><span>블루투스<small>이어폰 연결됨</small></span></button>
            <button className="md-li md-sl" data-rip="" data-n="배터리"><span className="md-av">🔋</span><span>배터리<small>82% · 약 9시간</small></span></button>
          </div>
          <div className="md-row">
            <button className="md-btn f" data-rip="" data-n="저장 버튼">저장</button>
            <button className="md-btn t" data-rip="" data-n="토널 버튼">임시 저장</button>
            <button className="md-btn o" data-rip="" data-n="아웃라인 버튼">취소</button>
          </div>
          <div className="md-cap">경계 없는 리플<em>아이콘 버튼 · 가운데서 원으로</em></div>
          <div className="md-rp-ibs">
            <button className={'md-ib' + (like ? ' on' : '')} data-rip="u" data-n="좋아요" ref={likeRef} aria-label="좋아요" onClick={() => setLike(v => !v)}><Ic n="star" /></button>
            <button className="md-ib" data-rip="u" data-n="공유" aria-label="공유"><Ic n="share" /></button>
            <button className="md-ib" data-rip="u" data-n="더보기" aria-label="더보기"><Ic n="more" /></button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['시작점', '터치 좌표'], ['종류', '경계 있음 · 없음']]}
        usage={[
          ['언제', '버튼·리스트·카드처럼 누를 수 있는 모든 요소의 기본 피드백이에요.'],
          ['주의', '리플은 ‘눌렸다’는 신호일 뿐이에요. 결과 화면 전환이 늦으면 따로 로딩을 보여줘요.'],
        ]}
      />
    </Card>
  )
}
