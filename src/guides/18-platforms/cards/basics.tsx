import { useRef, useState, type ReactNode } from 'react'
import { EASE, useMotion } from '../../../lib/motion'
import { Icon, Lines, MSeg2, PfCard, PfRange, type IconName } from '../shared'

/* ================= A1 실무 핵심 규격 ================= */
const DENS = {
  m: [[1, 'mdpi'], [1.5, 'hdpi'], [2, 'xhdpi'], [3, 'xxhdpi'], [4, 'xxxhdpi']],
  h: [[1, '@1x'], [2, '@2x'], [3, '@3x']],
} as const

function DensHalf({ s, x, onPick }: { s: 'm' | 'h'; x: number; onPick: (x: number) => void }) {
  const u = s === 'm' ? 'dp' : 'pt'
  const cell = 48 / x
  return (
    <div className={'pf-half ' + (s === 'm' ? 'pf-m' : 'pf-h')} data-side={s}>
      <div className="hd">{s === 'm' ? 'Material' : 'HIG'}<span>{s === 'm' ? 'dp · sp' : 'pt'}</span></div>
      <MSeg2 value={x} onChange={onPick} options={DENS[s]} data-dens={s} />
      <div className="pf-dens">
        <span className="pf-pxgrid" style={{
          backgroundImage: 'linear-gradient(to right, color-mix(in srgb, var(--c) 45%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--c) 45%, transparent) 1px, transparent 1px)',
          backgroundSize: cell + 'px ' + cell + 'px',
        }} />
        <span className="r">
          1{u} = <b>{x}px</b><br />아이콘 24{u} = <b>{24 * x}px</b><br />
          {s === 'm' ? <>글자 16sp = <b>{16 * x}px</b></> : <>글자 17pt = <b>{17 * x}px</b></>}
        </span>
      </div>
    </div>
  )
}

function UnitTile() {
  const [xm, setXm] = useState(1)
  const [xh, setXh] = useState(1)
  const [log, setLog] = useState<ReactNode>(<>네모 하나가 <b>1단위</b>, 안쪽 칸이 실제 픽셀이에요.</>)
  const label = (s: 'm' | 'h', x: number) => DENS[s].find(d => d[0] === x)?.[1]
  return (
    <section className="pf-tile" data-tile="unit">
      <h3>기본 단위 <small>밀도를 바꿔보세요</small></h3>
      <div className="pf-two">
        <DensHalf s="m" x={xm} onPick={x => { setXm(x); setLog(<>머티리얼 <b>{label('m', x)}</b>: 화면이 촘촘해도 24dp 아이콘은 <b>같은 실제 크기</b>로 보여요.</>) }} />
        <DensHalf s="h" x={xh} onPick={x => { setXh(x); setLog(<>HIG <b>{label('h', x)}</b>: 1pt에 픽셀 <b>{x}×{x}개</b>가 들어가요.</>) }} />
      </div>
      <div className="log" data-log="unit">{log}</div>
    </section>
  )
}

function Hit({ n, show, onHit }: { n: 48 | 44; show: boolean; onHit: (msg: ReactNode) => void }) {
  const { D } = useMotion()
  const el = useRef<HTMLDivElement>(null)
  const unit = n === 48 ? 'dp' : 'pt', name = n === 48 ? '머티리얼' : 'HIG'
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const h = el.current!
    const r = h.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const dx = x - r.width / 2, dy = y - r.height / 2
    const inArea = Math.abs(dx) <= n && Math.abs(dy) <= n
    const inIcon = Math.abs(dx) <= 24 && Math.abs(dy) <= 24
    h.querySelectorAll('.tapd').forEach(d => d.remove())
    const d = document.createElement('span')
    d.className = 'tapd'
    d.style.left = x + 'px'; d.style.top = y + 'px'
    d.style.background = inArea ? 'var(--c)' : 'var(--danger)'
    h.appendChild(d)
    d.animate([{ transform: 'scale(2.4)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], { duration: D(260), easing: EASE.out })
    const dist = Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 2)
    onHit(inArea
      ? <>{name} — <b>눌렸어요</b> {inIcon ? '(아이콘 위)' : '(아이콘 밖이지만 터치 영역 안 · 중심에서 ' + dist + unit + ')'}</>
      : <>{name} — <b>빗나갔어요</b> (중심에서 {dist}{unit}, 영역은 ±{n / 2}{unit})</>)
  }
  return (
    <div className={'pf-hit' + (show ? '' : ' hide')} data-hit={n} ref={el} onPointerDown={down}>
      <span className="area" style={{ width: n * 2, height: n * 2 }} />
      <span className="ico"><Icon k="star" /></span>
      <span className="sz">{n}{unit}</span>
    </div>
  )
}

function TouchTile() {
  const [show, setShow] = useState(true)
  const [log, setLog] = useState<ReactNode>(<>별 주변을 눌러보세요. 아이콘 밖이어도 <b>터치 영역 안이면 눌려요</b>.</>)
  return (
    <section className="pf-tile" data-tile="touch">
      <h3>최소 터치 영역 <small>같은 24단위 아이콘</small></h3>
      <div className="pf-two">
        <div className="pf-half pf-m"><div className="hd">Material<span>48 × 48dp</span></div><Hit n={48} show={show} onHit={setLog} /></div>
        <div className="pf-half pf-h"><div className="hd">HIG<span>44 × 44pt</span></div><Hit n={44} show={show} onHit={setLog} /></div>
      </div>
      <div className="row">
        <button className="pf-toggle" data-hitbtn aria-pressed={show} onClick={() => {
          const on = !show
          setShow(on)
          setLog(on ? <>점선이 <b>실제로 눌리는 영역</b>이에요. 48dp가 44pt보다 살짝 넓어요.</> : <>눈에 보이는 건 <b>아이콘 24단위</b>뿐이지만 영역은 그대로예요.</>)
        }}>터치 영역 보기</button>
        <span className="muted">1단위 = 2px 확대 · 실제 비율</span>
      </div>
      <div className="log" data-log="touch">{log}</div>
    </section>
  )
}

const ROLES = {
  m: [['Body Large', 16, 400], ['Title Large', 22, 400], ['Headline Large', 32, 400], ['Display Large', 57, 400], ['Label Large', 14, 500]],
  h: [['Body', 17, 400], ['Headline', 17, 600], ['Title 1', 28, 400], ['Large Title', 34, 400], ['Caption 1', 12, 400]],
} as const

function FontHalf({ s, i, onNext }: { s: 'm' | 'h'; i: number; onNext: () => void }) {
  const [n, sz, w] = ROLES[s][i]
  return (
    <div className={'pf-half ' + (s === 'm' ? 'pf-m' : 'pf-h')}>
      <div className="hd">{s === 'm' ? 'Material' : 'HIG'}<span>{s === 'm' ? 'Roboto · Noto Sans' : 'SF Pro · 산돌고딕 Neo'}</span></div>
      <div className="pf-type" data-type={s} role="button" tabIndex={0} style={{ fontSize: sz * 0.7, fontWeight: w }}
        onClick={onNext} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNext() } }}>
        {sz > 30 ? 'Aa 가' : 'Aa 가나다 123'}
      </div>
      <div className="muted" data-tname={s}>{n} · {sz}{s === 'm' ? 'sp' : 'pt'}</div>
    </div>
  )
}

function FontTile() {
  const [im, setIm] = useState(0)
  const [ih, setIh] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>기기에 설치된 <b>시스템 서체</b>로 보여요 (크기는 70% 축소).</>)
  const next = (s: 'm' | 'h') => {
    const i = ((s === 'm' ? im : ih) + 1) % ROLES[s].length
    ;(s === 'm' ? setIm : setIh)(i)
    setLog(<>{s === 'm' ? '머티리얼 ' : 'HIG '}<b>{ROLES[s][i][0]}</b> {ROLES[s][i][1]}{s === 'm' ? 'sp' : 'pt'} — 본문 기본은 머티리얼 16sp, HIG 17pt예요.</>)
  }
  return (
    <section className="pf-tile" data-tile="font">
      <h3>기본 서체 <small>글자를 눌러 역할 바꾸기</small></h3>
      <div className="pf-two">
        <FontHalf s="m" i={im} onNext={() => next('m')} />
        <FontHalf s="h" i={ih} onNext={() => next('h')} />
      </div>
      <div className="log" data-log="font">{log}</div>
    </section>
  )
}

export function Spec() {
  return (
    <PfCard id="spec" num="A1" wide title="실무 핵심 규격" en="Key Specs"
      desc="단위·터치 영역·서체는 숫자부터 달라요. 표로 한눈에 보고, 아래에서 직접 확인해요.">
      <div className="pf-tblwrap">
        <table className="pf-tbl">
          <colgroup><col className="k" /><col /><col /></colgroup>
          <thead><tr><th></th><th className="a">● Material Design (Android)</th><th className="b">● Apple HIG (iOS)</th></tr></thead>
          <tbody>
            <tr><th>기본 단위</th><td className="m"><b>dp</b> (density-independent pixel)<small>글자 크기는 sp · 160dpi에서 1dp = 1px</small></td><td className="h"><b>pt</b> (point)<small>글자 크기도 pt · @1x에서 1pt = 1px</small></td></tr>
            <tr><th>최소 터치 영역</th><td className="m"><b>48 × 48dp</b><small>아이콘이 24dp여도 터치 영역은 48dp</small></td><td className="h"><b>44 × 44pt</b><small>보이는 크기보다 넓게 잡아요</small></td></tr>
            <tr><th>기본 서체</th><td className="m"><b>Roboto</b> · 한글 Noto Sans (본고딕)</td><td className="h"><b>San Francisco (SF Pro)</b> · 한글 Apple SD 산돌고딕 Neo</td></tr>
            <tr><th>뒤로 가기</th><td className="m"><b>시스템 내비게이션</b>(제스처·하단 버튼) + 상단 ←<small>제스처 모드에선 양쪽 가장자리 스와이프</small></td><td className="h"><b>좌측 끝 스와이프</b> + 좌측 상단 ‹ 뒤로<small>버튼에 이전 화면 이름이 붙어요</small></td></tr>
            <tr><th>입체감</th><td className="m"><b>그림자(Elevation)</b> + 표면 색 톤<small>높을수록 표면이 기본색 쪽으로 물들어요</small></td><td className="h"><b>반투명 블러(Materials)</b> + 레이어 겹침<small>뒤 콘텐츠가 비쳐 보여요</small></td></tr>
            <tr><th>상단 바 정렬</th><td className="m"><b>주로 좌측</b> (일부 중앙 정렬)</td><td className="h"><b>중앙</b> 또는 스크롤하면 작아지는 <b>좌측 큰 타이틀</b></td></tr>
          </tbody>
        </table>
      </div>
      <div className="pf-tiles">
        <UnitTile />
        <TouchTile />
        <FontTile />
      </div>
    </PfCard>
  )
}

/* ================= A2 뒤로 가기 · 입체감 · 상단 바 ================= */
type SetLog = (n: ReactNode) => void

function BackPane({ s, setLog }: { s: 'm' | 'h'; setLog: SetLog }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(s === 'm' ? '네트워크' : 'Wi-Fi')
  const [btn3, setBtn3] = useState(false)
  const [drag, setDrag] = useState(false)
  const bk = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null), det = useRef<HTMLDivElement>(null), bubble = useRef<HTMLSpanElement>(null)
  const st = useRef<{ x0: number; edge: 'l' | 'r'; w: number; dx: number } | null>(null)
  const name = s === 'm' ? '머티리얼' : 'HIG'

  const go = (l: string) => {
    setLabel(l); setOpen(true)
    setLog(s === 'm'
      ? (btn3 ? <>머티리얼 — <b>←</b> 또는 하단 <b>◀ 버튼</b>으로 돌아가요.</> : <>머티리얼 — <b>←</b> 또는 <b>왼쪽·오른쪽 가장자리</b>에서 안쪽으로 밀어요.</>)
      : <>HIG — <b>‹ 설정</b>을 누르거나 <b>왼쪽 가장자리</b>를 끌어요.</>)
  }
  const close = (how: string) => {
    setOpen(false)
    if (det.current) det.current.style.transform = ''
    if (list.current) list.current.style.transform = ''
    setLog(<>{name} — <b>{how}</b>(으)로 돌아왔어요.</>)
  }
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open || btn3) return
    const r = bk.current!.getBoundingClientRect(), x = e.clientX - r.left
    const edge = x < 18 ? 'l' : x > r.width - 18 ? 'r' : null
    if (!edge) return
    if (s === 'h' && edge === 'r') { setLog(<>HIG는 <b>왼쪽 가장자리</b>에서만 뒤로 가요.</>); return }
    st.current = { x0: e.clientX, edge, w: r.width, dx: 0 }
    bk.current!.setPointerCapture(e.pointerId)
    if (s === 'h') setDrag(true)
    e.preventDefault()
  }
  const move = (e: React.PointerEvent) => {
    const t = st.current
    if (!t) return
    let dx = e.clientX - t.x0
    dx = t.edge === 'l' ? Math.max(0, dx) : Math.min(0, dx)
    t.dx = dx
    const b = bubble.current, d = det.current!, l = list.current!
    if (s === 'm' && b) {
      const k = Math.min(1, Math.abs(dx) / 50)
      b.style.opacity = String(k)
      b.style.left = t.edge === 'l' ? Math.min(Math.abs(dx), 50) * 0.5 - 6 + 'px' : 'auto'
      b.style.right = t.edge === 'r' ? Math.min(Math.abs(dx), 50) * 0.5 - 6 + 'px' : 'auto'
      b.style.transform = t.edge === 'r' ? 'scaleX(-1)' : ''
      d.style.transform = 'scale(' + (1 - k * 0.06) + ')'
    } else {
      d.style.transform = 'translateX(' + dx + 'px)'
      l.style.transform = 'translateX(' + (-30 + (dx / t.w) * 30) + '%)'
    }
  }
  const end = () => {
    const t = st.current
    if (!t) return
    st.current = null
    setDrag(false)
    if (bubble.current) bubble.current.style.opacity = '0'
    if (s === 'm') {
      det.current!.style.transform = ''
      if (Math.abs(t.dx) > 40) close((t.edge === 'l' ? '왼쪽' : '오른쪽') + ' 가장자리 제스처')
    } else if (t.dx > t.w * 0.35) close('왼쪽 가장자리 스와이프')
    else {
      det.current!.style.transform = ''; list.current!.style.transform = ''
      setLog(<>HIG — 조금만 끌면 <b>제자리로</b> 돌아가요. 1/3 넘게 끌어요.</>)
    }
  }
  const cls = 'pf-bk' + (open ? ' open' : '') + (btn3 ? ' btn3' : '') + (drag ? ' drag' : '')
  const handlers = { onPointerDown: down, onPointerMove: move, onPointerUp: end, onPointerCancel: end }

  if (s === 'm') return (
    <div className="pf-half pf-m">
      <div className="hd">Material<span>시스템 백 + ←</span></div>
      <div className={cls} data-bk="m" ref={bk} {...handlers}>
        <div className="pg list" ref={list}>
          <div className="pf-mbar sm"><b>설정</b></div>
          {['네트워크', '디스플레이', '알림'].map(g => <button key={g} className="pf-mli pf-rp" data-go={g} onClick={() => go(g)}>{g}</button>)}
        </div>
        <div className="pg det" ref={det}>
          <div className="pf-mbar sm"><button className="pf-ib pf-rp" data-back aria-label="뒤로" onClick={() => close('상단 ←')}><Icon k="back" /></button><b data-dt>{label}</b></div>
          <Lines />
        </div>
        <span className="pf-edge l" /><span className="pf-edge r" />
        <div className="pf-sysnav">
          <span className="handle" />
          <span className="btns">
            <button data-sysback aria-label="시스템 뒤로" onClick={() => { if (open) close('시스템 ◀ 버튼'); else setLog(<>첫 화면에서 ◀를 누르면 <b>앱이 닫혀요</b>.</>) }}>◀</button>
            <button aria-label="홈">●</button><button aria-label="최근 앱">■</button>
          </span>
        </div>
        <span className="pf-bubble" ref={bubble}><Icon k="chev" /></span>
      </div>
      <MSeg2 value={btn3 ? 'b' : 'g'} data-navmode="" options={[['g', '제스처'], ['b', '3버튼']]} onChange={v => {
        setBtn3(v === 'b')
        setLog(v === 'b' ? <>머티리얼 3버튼 모드 — 하단 <b>◀</b>가 시스템 뒤로 가기예요.</> : <>머티리얼 제스처 모드 — <b>양쪽 가장자리</b> 어디서든 안쪽으로 밀어요.</>)
      }} />
    </div>
  )
  return (
    <div className="pf-half pf-h">
      <div className="hd">HIG<span>좌측 스와이프 + ‹</span></div>
      <div className={cls} data-bk="h" ref={bk} {...handlers}>
        <div className="pg list" ref={list}>
          <div className="pf-hbar"><span /><b className="pf-htitle">설정</b><span /></div>
          <div className="pf-grp">
            {['Wi-Fi', '디스플레이', '알림'].map(g => <button key={g} className="pf-hli" data-go={g} onClick={() => go(g)}>{g}<span className="pf-chev"><Icon k="chevr" /></span></button>)}
          </div>
        </div>
        <div className="pg det" ref={det}>
          <div className="pf-hbar"><button className="pf-tint" data-back onClick={() => close('‹ 뒤로 버튼')}><Icon k="chev" />설정</button><b className="pf-htitle" data-dt>{label}</b><span /></div>
          <Lines />
        </div>
        <span className="pf-edge l" />
        <span className="pf-homebar" />
      </div>
      <div className="muted">왼쪽 가장자리를 잡고 끌어보세요</div>
    </div>
  )
}

function BackTile() {
  const [log, setLog] = useState<ReactNode>(<>목록에서 <b>항목을 눌러</b> 들어가 보세요.</>)
  return (
    <section className="pf-tile" data-tile="back">
      <h3>뒤로 가기 <small>항목을 눌러 들어간 뒤 돌아와 보세요</small></h3>
      <div className="pf-two"><BackPane s="m" setLog={setLog} /><BackPane s="h" setLog={setLog} /></div>
      <div className="log" data-log="back">{log}</div>
    </section>
  )
}

const DP = [0, 1, 3, 6, 8, 12], TONE = [0, 5, 8, 11, 12, 14]
const MAT = [['얇게', 6, 45], ['보통', 14, 62], ['두껍게', 26, 80]] as const

function ElevTile() {
  const [lv, setLv] = useState(1)
  const [mat, setMat] = useState(1)
  const [log, setLog] = useState<ReactNode>(<>왼쪽은 <b>레벨</b>을 올리고, 오른쪽은 <b>유리판을 끌어</b> 보세요.</>)
  const gl = useRef<HTMLDivElement>(null), blobs = useRef<HTMLDivElement>(null)
  const gd = useRef<{ x: number; y: number; l: number; t: number } | null>(null)
  const dp = DP[lv]
  const blur = 'blur(' + MAT[mat][1] + 'px) saturate(180%)'
  const gEnd = () => { if (gd.current) { gd.current = null; setLog(<>HIG — 그림자보다 <b>뒤가 비치는 정도</b>로 층을 구분해요.</>) } }
  return (
    <section className="pf-tile" data-tile="elev">
      <h3>입체감 <small>그림자 vs 반투명</small></h3>
      <div className="pf-two">
        <div className="pf-half pf-m">
          <div className="hd">Material<span>Elevation</span></div>
          <div className="pf-elev">
            <div className="pf-ecard" data-ecard style={{
              background: 'color-mix(in srgb, var(--accent) ' + TONE[lv] + '%, var(--surface))',
              boxShadow: dp ? '0 ' + (dp * 0.45).toFixed(1) + 'px ' + (dp * 1.4).toFixed(1) + 'px rgba(0,0,0,' + (0.1 + dp * 0.012).toFixed(3) + '), 0 1px 2px rgba(0,0,0,.12)' : 'none',
              border: dp ? '0' : '1px solid var(--line)',
            }}>카드<small>Level {lv} · {dp}dp</small></div>
          </div>
          <PfRange value={lv} min={0} max={5} label="엘리베이션 레벨" data-elev="" onChange={v => {
            setLv(v); setLog(<>머티리얼 Level {v} — 높을수록 <b>그림자가 커지고 표면이 파랗게 물들어요</b>.</>)
          }} />
        </div>
        <div className="pf-half pf-h">
          <div className="hd">HIG<span>Materials</span></div>
          <div className="pf-blobs" data-blobs ref={blobs}>
            <span className="bl" style={{ width: 70, height: 70, left: -10, top: 40, background: 'var(--accent)' }} />
            <span className="bl" style={{ width: 60, height: 60, right: 6, top: -8, background: 'var(--b)' }} />
            <span className="bl" style={{ width: 46, height: 46, left: '45%', top: 76, background: '#0ca678' }} />
            <span className="tx">반투명 재질은 뒤에 있는 색과 글자를 흐릿하게 비춰요. 레이어가 겹쳐 있다는 걸 알려줘요.</span>
            <div className="pf-glass" data-glass ref={gl}
              style={{ backdropFilter: blur, WebkitBackdropFilter: blur, background: 'color-mix(in srgb, var(--surface) ' + MAT[mat][2] + '%, transparent)' }}
              onPointerDown={e => { const g = gl.current!; gd.current = { x: e.clientX, y: e.clientY, l: g.offsetLeft, t: g.offsetTop }; g.setPointerCapture(e.pointerId) }}
              onPointerMove={e => {
                const d = gd.current, g = gl.current!, b = blobs.current!
                if (!d) return
                const mx = b.clientWidth - g.offsetWidth, my = b.clientHeight - g.offsetHeight
                g.style.left = Math.max(0, Math.min(mx, d.l + e.clientX - d.x)) + 'px'
                g.style.top = Math.max(0, Math.min(my, d.t + e.clientY - d.y)) + 'px'
              }}
              onPointerUp={gEnd} onPointerCancel={gEnd}>끌어서 옮기기</div>
          </div>
          <MSeg2 value={mat} data-mat="" options={[[0, '얇게'], [1, '보통'], [2, '두껍게']]} onChange={v => {
            setMat(v); setLog(<>HIG 재질 <b>{MAT[v][0]}</b> — 두꺼울수록 뒤가 덜 비쳐요.</>)
          }} />
        </div>
      </div>
      <div className="log" data-log="elev">{log}</div>
    </section>
  )
}

const Ic2 = ({ k }: { k: IconName }) => <span className="ic2"><Icon k={k} /></span>
const TbLines = () => <><span className="fake-line fl" style={{ width: '70%' }} /><span className="fake-line fl" /><span className="fake-line fl" style={{ width: '50%' }} /></>
const Tint = ({ children }: { children: ReactNode }) => <span style={{ color: 'var(--c)', fontSize: 14, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{children}</span>

type TbmV = 'small' | 'center' | 'medium' | 'large'
function TbM({ v }: { v: TbmV }) {
  if (v === 'small') return <><div className="bar"><Ic2 k="back" /><span className="ttl">제목</span><Ic2 k="search" /><Ic2 k="more" /></div><TbLines /></>
  if (v === 'center') return <><div className="bar"><Ic2 k="menu" /><span className="ttl c">제목</span><Ic2 k="person" /></div><TbLines /></>
  return (
    <>
      <div className="bar"><Ic2 k="back" /><span className="ttl" /><Ic2 k="more" /></div>
      <div className="big" style={v === 'medium' ? { fontSize: 21 } : { fontSize: 27, paddingTop: 10 }}>제목</div>
      <TbLines />
    </>
  )
}
function TbH({ v }: { v: 'inline' | 'large' }) {
  if (v === 'inline') return (
    <>
      <div className="bar"><Tint><Icon k="chev" />뒤로</Tint><span className="ttl c" style={{ fontWeight: 600 }}>제목</span><span style={{ color: 'var(--c)', fontSize: 14, minWidth: 30, textAlign: 'right' }}>편집</span></div>
      <TbLines />
    </>
  )
  return (
    <>
      <div className="bar"><Tint><Icon k="chev" />뒤로</Tint><span className="ttl" /><span style={{ color: 'var(--c)', fontSize: 14 }}>편집</span></div>
      <div className="big" style={{ fontSize: 27, fontWeight: 700 }}>제목</div>
      <TbLines />
    </>
  )
}
const BAR_MSG: Record<string, ReactNode> = {
  small: <>머티리얼 <b>Small</b> — 제목이 왼쪽, 가장 기본이에요.</>,
  center: <>머티리얼 <b>Center-aligned</b> — 메인 화면 등에서 가운데 정렬도 써요.</>,
  medium: <>머티리얼 <b>Medium</b> — 제목이 바 아래 왼쪽에 크게, 스크롤하면 바 안으로 접혀요.</>,
  large: <>머티리얼 <b>Large</b> — 더 큰 제목, 역시 왼쪽 정렬이에요.</>,
  hinline: <>HIG <b>기본</b> — 제목이 가운데, 왼쪽엔 ‹ 이전 화면 이름이 와요.</>,
  hlarge: <>HIG <b>큰 타이틀</b> — 왼쪽에 크게, 스크롤하면 작아져 가운데로 가요 (01번 카드).</>,
}

function BarTile() {
  const [vm, setVm] = useState<TbmV>('small')
  const [vh, setVh] = useState<'inline' | 'large'>('inline')
  const [log, setLog] = useState<ReactNode>(<>머티리얼은 <b>제목이 왼쪽</b>, HIG는 <b>가운데</b>가 기본이에요.</>)
  return (
    <section className="pf-tile" data-tile="bar">
      <h3>상단 바 정렬 <small>종류를 바꿔보세요</small></h3>
      <div className="pf-two">
        <div className="pf-half pf-m">
          <div className="hd">Material<span>Top App Bar</span></div>
          <div className="pf-tb" data-tb="m"><TbM v={vm} /></div>
          <MSeg2 value={vm} data-tbs="m" options={[['small', 'Small'], ['center', 'Center'], ['medium', 'Medium'], ['large', 'Large']]}
            onChange={v => { setVm(v); setLog(BAR_MSG[v]) }} />
        </div>
        <div className="pf-half pf-h">
          <div className="hd">HIG<span>Navigation Bar</span></div>
          <div className="pf-tb" data-tb="h"><TbH v={vh} /></div>
          <MSeg2 value={vh} data-tbs="h" options={[['inline', '기본 (중앙)'], ['large', '큰 타이틀']]}
            onChange={v => { setVh(v); setLog(BAR_MSG['h' + v]) }} />
        </div>
      </div>
      <div className="log" data-log="bar">{log}</div>
    </section>
  )
}

export function Feel() {
  return (
    <PfCard id="feel" num="A2" wide title="뒤로 가기 · 입체감 · 상단 바" en="Platform Feel"
      desc="같은 화면도 돌아가는 방법, 깊이를 표현하는 방식, 제목 위치가 달라요.">
      <div className="pf-tiles">
        <BackTile />
        <ElevTile />
        <BarTile />
      </div>
    </PfCard>
  )
}

