import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'

type Dev = 'mobile' | 'tablet' | 'web'
const DEVICES: Record<Dev, { name: string; cm: string; dist: number; w: number; h: number; body: number; cap: number; sub: number; head: number; range: [number, number]; rangeTxt: string; spec: string[] }> = {
  mobile: { name: '모바일', cm: '약 30cm', dist: 30, w: 22, h: 40, body: 15, cap: 12.5, sub: 19, head: 25, range: [15, 22], rangeTxt: '한글 15~22자', spec: ['14~16px (iOS 17pt)', '12~13px', '18~20px', '22~28px'] },
  tablet: { name: '태블릿', cm: '약 40cm', dist: 40, w: 46, h: 34, body: 17, cap: 13.5, sub: 21, head: 29, range: [25, 35], rangeTxt: '한글 25~35자', spec: ['16~18px', '13~14px', '20~22px', '26~32px'] },
  web: { name: '데스크톱 웹', cm: '약 50~70cm', dist: 60, w: 60, h: 40, body: 17, cap: 13, sub: 22, head: 36, range: [30, 40], rangeTxt: '한글 30~40자', spec: ['16~18px (최소 16px)', '12~14px', '20~24px', '28~40px 이상'] },
}

/* ---------- 01 시청 거리와 기본 크기 ---------- */
export function Distance() {
  const [dev, setDev] = useState<Dev>('mobile')
  const box = useRef<HTMLDivElement>(null)
  const d = DEVICES[dev]
  const demo = useDemo({
    reset() { setDev('mobile') },
    async play(c) {
      for (const k of ['tablet', 'web', 'mobile'] as const) {
        await c.sleep(1300)
        await c.press(box.current, box.current?.querySelector<HTMLElement>(`[data-k="${k}"]`) ?? null)
      }
    },
  })
  return (
    <Card id="type-distance" num="01" title="시청 거리와 기본 크기" en="Viewing Distance" demo={demo}
      desc="눈에서 화면이 멀어질수록(모바일 < 태블릿 < 웹) 기본 글자는 커져야 해요.">
      <Stage log={<><b>{d.name}</b> · 평균 시청 거리 {d.cm} · 본문 {d.spec[0]}</>}>
        <div className="box left" ref={box}>
          <Seg value={dev} onChange={setDev} className="full"
            options={(Object.keys(DEVICES) as Dev[]).map(k => [k, <span data-k={k} key={k}>{DEVICES[k].name}</span>] as const)} />
          <div className="ty-dist" aria-hidden="true">
            <span className="ty-eye">👀</span>
            <div className="ty-ruler"><span style={{ width: (d.dist / 70) * 100 + '%' }} /><em style={{ left: (d.dist / 70) * 50 + '%' }}>{d.cm}</em></div>
            <div className="ty-dev" style={{ width: d.w, height: d.h }} />
          </div>
          <div className="ty-scale">
            <div><small>대제목 {d.spec[3]}</small><span style={{ fontSize: d.head, fontWeight: 700, lineHeight: 1.25 }}>오늘의 소식</span></div>
            <div><small>소제목 {d.spec[2]}</small><span style={{ fontSize: d.sub, fontWeight: 600 }}>이번 주 인기 글</span></div>
            <div><small>본문 {d.spec[0]}</small><span style={{ fontSize: d.body }}>읽기 편한 글자는 거리에 맞춰요</span></div>
            <div><small>캡션 {d.spec[1]}</small><span style={{ fontSize: d.cap, color: 'var(--text-3)' }}>3분 전 · 조회 1,204</span></div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['단위', '웹 rem · Android sp · iOS pt'], ['한 줄', d.rangeTxt]]}
        usage={[
          ['원리', '같은 글자도 멀리서 보면 작아 보여요. 기기마다 평균 시청 거리가 달라서 기본 크기도 달라져요.'],
          ['실무', '디자인 툴에서는 px로 그리고, 개발에서는 웹 rem, 안드로이드 sp, iOS pt로 바꿔요.'],
          ['주의', '캡션도 11px 미만으로는 내려가지 않게 해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 한 줄 글자 수 ---------- */
const PARA = '좋은 글은 눈이 다음 줄의 시작을 쉽게 찾을 수 있어야 해요. 한 줄이 너무 길면 줄을 바꿀 때 길을 잃고, 너무 짧으면 시선이 자주 꺾여서 리듬이 끊겨요. 그래서 기기마다 알맞은 줄 길이가 있어요.'
export function LineLength() {
  const [dev, setDev] = useState<Dev>('mobile')
  const [w, setW] = useState(300)
  const [maxW, setMaxW] = useState(460)
  const [charW, setCharW] = useState(16)
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const cv = document.createElement('canvas').getContext('2d')
    if (cv) { cv.font = '16px Pretendard, sans-serif'; setCharW(cv.measureText('가나다라마바사아자차').width / 10) }
    const ro = new ResizeObserver(() => setMaxW(Math.max(200, el.clientWidth - 40)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const width = Math.min(w, maxW)
  const chars = Math.floor(width / charW)
  const [lo, hi] = DEVICES[dev].range
  const ok = chars >= lo && chars <= hi
  return (
    <Card id="type-measure" num="02" title="한 줄 글자 수" en="Line Length"
      desc="한 줄에 들어가는 글자 수가 읽는 리듬을 정해요. 기기마다 알맞은 범위가 있어요.">
      <Stage log={ok ? <><b>{chars}자</b> — {DEVICES[dev].name}에 딱 좋아요 ({DEVICES[dev].rangeTxt})</> : <><b>{chars}자</b> — {chars < lo ? '너무 짧아 시선이 자주 꺾여요' : '너무 길어 다음 줄을 찾기 어려워요'} ({DEVICES[dev].rangeTxt})</>}>
        <div className="box left" ref={box}>
          <Seg value={dev} onChange={setDev} options={(Object.keys(DEVICES) as Dev[]).map(k => [k, DEVICES[k].name] as const)} />
          <div className="ty-label"><span>본문 폭 {Math.round(width)}px · 16px 본문</span><b className={ok ? 'ty-ok' : 'ty-bad'}>한 줄 약 {chars}자</b></div>
          <Range value={w} min={160} max={maxW} onChange={setW} label="본문 폭" />
          <div className="ty-measure" style={{ width }}><p>{PARA}</p></div>
        </div>
      </Stage>
      <Info
        spec={[['모바일', '15~22자'], ['태블릿', '25~35자'], ['웹', '30~40자']]}
        usage={[
          ['원리', '영문은 50~75자가 정석이지만, 한글은 글자 하나가 정사각형에 가까워 더 적은 글자 수가 편해요.'],
          ['실무', '본문 컨테이너에 max-width를 걸어 줄 길이를 고정해요. 예: max-width: 36em.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 rem vs px ---------- */
export function RemPx() {
  const [base, setBase] = useState(16)
  const scale = base / 16
  return (
    <Card id="type-rem" num="09" title="rem vs px" en="Relative Units"
      desc="사용자가 브라우저 기본 글자 크기를 키우면 rem은 따라 커지고, px는 그대로 남아요.">
      <Stage log={base === 16 ? <>브라우저 기본 글자 크기를 <b>키워보세요</b></> : <>기본 {base}px → rem 글자는 <b>{base}px</b>, px 글자는 여전히 <b>16px</b></>}>
        <div className="box left">
          <div className="ty-label"><span>브라우저 설정 · 기본 글꼴 크기</span><b>{base}px {base === 16 ? '(보통)' : base > 16 ? '(크게)' : '(작게)'}</b></div>
          <Range value={base} min={12} max={28} step={2} onChange={setBase} label="브라우저 기본 글꼴 크기" />
          <div className="ty-browser">
            <div className="bar"><i /><i /><i /> palmer.design/notice</div>
            <div className="ty-units">
              <div><small>font-size: 16px</small><p style={{ fontSize: 16 }}>공지사항을 확인해 주세요. 변경된 이용약관이 적용돼요.</p></div>
              <div><small>font-size: 1rem → {base}px</small><p style={{ fontSize: 16 * scale }}>공지사항을 확인해 주세요. 변경된 이용약관이 적용돼요.</p></div>
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['기준', '1rem = 브라우저 기본(보통 16px)']]}
        usage={[
          ['원리', 'rem은 브라우저 기본 글자 크기에 대한 상대 단위예요. 저시력 사용자의 설정을 존중해요.'],
          ['실무', '글자 크기·여백은 rem, 1px 테두리처럼 커지면 안 되는 것만 px로 써요.'],
          ['주의', 'html { font-size: 62.5% } 같은 트릭은 사용자 설정을 덮어쓸 수 있어 신중히 써요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 10 타입 스케일 ---------- */
const RATIOS = [[1.125, '1.125 메이저 세컨드'], [1.2, '1.2 마이너 서드'], [1.25, '1.25 메이저 서드'], [1.333, '1.333 완전 4도'], [1.5, '1.5 완전 5도']] as const
const STEPS: [string, number, number, string][] = [
  ['Display', 4, 700, '디자인은 숫자로 말해요'],
  ['H1', 3, 700, '읽히는 제목 만들기'],
  ['H2', 2, 700, '본문과의 대비'],
  ['H3', 1, 600, '소제목은 한 단계 위'],
  ['Body', 0, 400, '본문은 기준이 되는 크기예요'],
  ['Caption', -1, 400, '부가 설명 · 3분 전'],
]
export function TypeScale() {
  const [base, setBase] = useState(16)
  const [ratio, setRatio] = useState<number>(1.25)
  const preset = (b: number, r: number) => { setBase(b); setRatio(r) }
  const head = Math.round(base * Math.pow(ratio, 3))
  return (
    <Card id="type-scale" num="10" title="위계 대비와 타입 스케일" en="Type Scale"
      desc="본문을 기준으로 일정한 비율을 곱해 크기를 정하면 위계가 자연스럽게 생겨요.">
      <Stage log={<>본문 <b>{base}px</b> × <b>{ratio}</b>ⁿ → H1 <b>{head}px</b> (본문의 {(head / base).toFixed(1)}배)</>}>
        <div className="box left">
          <div className="ty-row">
            <Seg value={ratio} onChange={setRatio} options={RATIOS.map(([r]) => [r, String(r)] as const)} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn ghost sm" onClick={() => preset(15, 1.2)}>모바일</button>
              <button className="btn ghost sm" onClick={() => preset(16, 1.333)}>데스크톱</button>
            </div>
          </div>
          <div className="ty-label"><span>본문 크기 · {RATIOS.find(r => r[0] === ratio)?.[1]}</span><b>{base}px</b></div>
          <Range value={base} min={13} max={20} onChange={setBase} label="본문 크기" />
          <div className="ty-steps">
            {STEPS.map(([name, n, w, txt]) => {
              const px = base * Math.pow(ratio, n)
              return (
                <div key={name}>
                  <small>{name}</small><code>{Math.round(px)}px</code>
                  <span style={{ fontSize: Math.min(px, 64), fontWeight: w, lineHeight: px >= 24 ? 1.25 : 1.5, letterSpacing: px >= 24 ? '-0.02em' : 0 }}>{txt}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['모바일', '비율 1.2 내외'], ['데스크톱', '1.25~1.5 (본문 16 vs 타이틀 40)']]}
        usage={[
          ['원리', '화면이 넓을수록 시선이 흩어지기 쉬워요. 데스크톱에서는 본문과 제목의 차이를 더 과감하게 줘요.'],
          ['실무', '스케일 값을 디자인 토큰(--font-h1 등)으로 정해 두고 그 안에서만 골라 써요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 11 태블릿: 최대 너비와 2단 ---------- */
const ARTICLE = '태블릿을 가로로 돌리면 화면 폭이 크게 늘어나요. 글이 화면 끝에서 끝까지 이어지면 눈이 한 줄을 따라가다 지쳐요. 본문 폭을 제한하거나, 신문처럼 두 단으로 나누면 한 줄 길이가 알맞게 돌아와요. 여백은 낭비가 아니라 읽기를 위한 공간이에요.'
export function TabletLayout() {
  const [mode, setMode] = useState<'full' | 'max' | 'two'>('full')
  const log: Record<typeof mode, ReactNode> = {
    full: <>가로 화면 전체 폭 — 한 줄이 <b>60자 이상</b>으로 길어져요</>,
    max: <>본문 최대 너비 <b>600~700px</b> — 한 줄 약 35자로 돌아와요</>,
    two: <>신문처럼 <b>2단</b> — 넓은 화면을 쓰면서도 줄 길이는 짧게</>,
  }
  return (
    <Card id="type-tablet" num="11" title="태블릿: 최대 너비와 2단" en="Max-width & Columns"
      desc="가로 모드에서 글이 끝없이 늘어나지 않게 폭을 제한하거나 두 단으로 나눠요.">
      <Stage log={log[mode]}>
        <div className="box left">
          <Seg value={mode} onChange={setMode} options={[['full', '전체 폭'], ['max', '최대 너비 680px'], ['two', '2단']]} />
          <div className="ty-tablet">
            <div className={'col' + (mode === 'two' ? ' two' : '')} style={{ maxWidth: mode === 'max' ? '58%' : '100%' }}>
              <h5>넓은 화면에서 글 읽기</h5>
              <p>{ARTICLE}</p><p>{ARTICLE}</p>
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['본문 최대 너비', '600~700px'], ['대안', '2단 그리드']]}
        usage={[
          ['언제', '태블릿 가로 모드, 넓은 데스크톱 화면의 긴 글'],
          ['주의', '2단은 위아래로 오가며 읽어야 하니 단의 높이가 화면보다 길어지지 않게 해요.'],
        ]}
      />
    </Card>
  )
}
