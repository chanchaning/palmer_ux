import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from 'react'
import { Range, Seg, useTimers } from '../../components/ui'
import { resolveSemantic, useSys, type SysConfig } from '../store'
import { CodeBlock, Note, Section, SliderRow, SysGrid } from '../ui'
import './state.css'

/* ---------- 미리보기 색: config 의 시맨틱 값을 라이트·다크 둘 다 변수로 ---------- */
const ROLES = ['bg', 'surface', 'text', 'text-sub', 'border', 'primary', 'on-primary', 'danger', 'success'] as const
function pvVars(c: SysConfig): CSSProperties {
  const o: Record<string, string> = {}
  for (const r of ROLES) { o[`--pl-${r}`] = resolveSemantic(c, 'light', r); o[`--pd-${r}`] = resolveSemantic(c, 'dark', r) }
  return o as CSSProperties
}

/* ---------- 이징 문자열 → 진행 함수 ---------- */
function easingFn(s: string): (x: number) => number {
  const kw: Record<string, number[]> = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] }
  const m = s.match(/cubic-bezier\(([^)]+)\)/)
  const [x1, y1, x2, y2] = m ? m[1].split(',').map(Number) : kw[s.trim()] ?? kw.ease
  const bz = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return x => {
    let lo = 0, hi = 1, t = x
    for (let i = 0; i < 32; i++) { if (bz(x1, x2, t) < x) lo = t; else hi = t; t = (lo + hi) / 2 }
    return bz(y1, y2, t)
  }
}

/* =================================================================
 * 1) 컴포넌트 6대 상태
 * ================================================================= */
type St = 'default' | 'hover' | 'pressed' | 'focus' | 'disabled' | 'loading'
const STATES: { id: St; en: string; ko: string; why: string; sel: string }[] = [
  { id: 'default', en: 'Default', ko: '기본', why: '아무 일도 없을 때의 모습', sel: '.button' },
  { id: 'hover', en: 'Hover', ko: '마우스 올림', why: '누를 수 있다는 신호. 터치 기기엔 없어요', sel: ':hover' },
  { id: 'pressed', en: 'Pressed', ko: '누르는 중', why: '눌렀다는 즉각 반응', sel: ':active' },
  { id: 'focus', en: 'Focus', ko: '키보드 포커스', why: '지금 어디에 있는지. 접근성 필수', sel: ':focus-visible' },
  { id: 'disabled', en: 'Disabled', ko: '비활성', why: '지금은 못 눌러요. 이유를 함께 알려요', sel: ':disabled' },
  { id: 'loading', en: 'Loading', ko: '처리 중', why: '두 번 누르지 않게 막고 진행을 보여줘요', sel: '[aria-busy]' },
]

const Spin = ({ className = '' }: { className?: string }) => <i className={'st-spin ' + className} aria-hidden="true" />

function SampleBtn({ s }: { s: St }) {
  return (
    <span className={'pv-btn is-' + s} aria-hidden="true">
      {s === 'loading' ? <><Spin /> 저장 중</> : '저장하기'}
    </span>
  )
}
function SampleInput({ s }: { s: St }) {
  return (
    <span className={'pv-input is-' + s} aria-hidden="true">
      <span className={s === 'default' || s === 'hover' || s === 'disabled' ? 'ph' : ''}>{s === 'default' || s === 'hover' || s === 'disabled' ? '아이디' : 'palmer'}</span>
      {s === 'focus' && <span className="caret" />}
      {s === 'loading' && <Spin className="end" />}
    </span>
  )
}

type Live = { hover: boolean; press: boolean; focus: boolean }
const NONE: Live = { hover: false, press: false, focus: false }
const litOf = (l: Live, disabled: boolean, loading: boolean): St[] => {
  if (disabled) return ['disabled']
  const out: St[] = []
  if (loading) out.push('loading')
  if (l.hover) out.push('hover')
  if (l.press) out.push('pressed')
  if (l.focus) out.push('focus')
  return out.length ? out : ['default']
}

function ComponentStates() {
  const T = useTimers()
  const [disabled, setDisabled] = useState(false)
  const [b, setB] = useState<Live>(NONE)
  const [i, setI] = useState<Live>(NONE)
  const [bLoading, setBLoading] = useState(false)
  const [iLoading, setILoading] = useState(false)
  const [msg, setMsg] = useState<ReactNode>('')
  const [val, setVal] = useState('')
  const deb = useRef<number | undefined>(undefined)
  const bLit = litOf(b, disabled, bLoading)
  const iLit = litOf(i, disabled, iLoading)
  const lit = new Set<St>([...bLit, ...iLit].filter(x => x !== 'default'))
  if (!lit.size) lit.add('default')

  useEffect(() => { if (disabled) { setB(NONE); setI(NONE) } }, [disabled])

  const handlers = (set: (fn: (l: Live) => Live) => void) => ({
    onPointerEnter: () => set(l => ({ ...l, hover: true })),
    onPointerLeave: () => set(l => ({ ...l, hover: false, press: false })),
    onPointerDown: () => set(l => ({ ...l, press: true })),
    onPointerUp: () => set(l => ({ ...l, press: false })),
    onFocus: (e: FocusEvent<HTMLElement>) => { const fv = e.currentTarget.matches(':focus-visible'); set(l => ({ ...l, focus: fv })) },
    onBlur: () => set(l => ({ ...l, focus: false, press: false })),
  })
  const bh = handlers(setB)
  const ih = handlers(setI)

  const save = () => {
    if (bLoading || disabled) return
    setBLoading(true); setMsg('저장하는 중이에요…')
    T.set(() => { setBLoading(false); setMsg(<><b>저장했어요.</b> 로딩 중에는 다시 눌러도 반응하지 않아요.</>) }, 1600)
  }
  const type = (v: string) => {
    setVal(v)
    if (deb.current) T.clear(deb.current)
    setILoading(false)
    if (!v) { setMsg(''); return }
    deb.current = T.set(() => {
      setILoading(true); setMsg('아이디 중복을 확인하는 중이에요…')
      deb.current = T.set(() => { setILoading(false); setMsg(<><b>사용할 수 있는 아이디예요.</b> 입력을 멈추면 확인을 시작해요.</>) }, 1200)
    }, 500)
  }

  return (
    <>
      <div className="st-matrix" role="table" aria-label="상태별 버튼과 입력창 모습">
        {STATES.map(s => (
          <div key={s.id} className={'st-col' + (lit.has(s.id) ? ' on' : '')} role="row" data-st={s.id}>
            <div className="st-col-head" role="rowheader">
              <b>{s.en}</b><span>{s.ko}</span>
            </div>
            <div className="st-cell" role="cell"><SampleBtn s={s.id} /></div>
            <div className="st-cell" role="cell"><SampleInput s={s.id} /></div>
            <div className="st-why" role="cell">{s.why}</div>
            <code className="st-sel" role="cell">{s.sel}</code>
          </div>
        ))}
      </div>

      <div className="st-live">
        <div className="st-live-head">
          <b>직접 해보기</b>
          <span className="muted">마우스를 올리고, 누르고, <kbd>Tab</kbd>으로 들어와 <kbd>Space</kbd>를 눌러 보세요. 위 표에서 지금 상태가 켜져요.</span>
        </div>
        <div className="st-live-row">
          <label className="st-field">
            <span className="st-label">아이디</span>
            <input className="pv-input live" data-live="input" value={val} disabled={disabled} aria-busy={iLoading || undefined}
              placeholder="아이디" onChange={e => type(e.target.value)} {...ih} />
            {iLoading && <Spin className="in-field" />}
          </label>
          <button type="button" className="pv-btn live" data-live="button" disabled={disabled} aria-busy={bLoading || undefined}
            aria-disabled={bLoading || undefined} onClick={save} {...bh}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setB(l => ({ ...l, press: true })) }}
            onKeyUp={() => setB(l => ({ ...l, press: false }))}>
            {bLoading ? <><Spin /> 저장 중</> : '저장하기'}
          </button>
          <label className="st-check">
            <input type="checkbox" checked={disabled} onChange={e => setDisabled(e.target.checked)} /> Disabled로 바꾸기
          </label>
        </div>
        <div className="st-now">
          <span>버튼 <b data-now="button">{bLit.map(s => STATES.find(x => x.id === s)!.en).join(' + ')}</b></span>
          <span>입력창 <b data-now="input">{iLit.map(s => STATES.find(x => x.id === s)!.en).join(' + ')}</b></span>
        </div>
        <p className="st-msg" role="status" aria-live="polite">{msg}</p>
      </div>
    </>
  )
}

const CHECKS: [string, ReactNode][] = [
  ['six', <>6가지 상태를 모두 디자인했나요? (특히 Focus·Disabled·Loading이 자주 빠져요)</>],
  ['focus', <><code>outline: none</code>으로 지우지 않고 <code>:focus-visible</code>로 포커스를 보여주나요?</>],
  ['hover', <>Hover에만 정보를 숨기지 않았나요? 터치 화면에는 Hover가 없어요.</>],
  ['disabled', <>Disabled 버튼 옆에 왜 못 누르는지, 무엇을 하면 되는지 알려주나요?</>],
  ['loading', <>Loading 중 버튼 폭이 그대로이고, 두 번 눌려도 한 번만 처리되나요?</>],
  ['color', <>상태를 색만으로 구분하지 않나요? (모양·아이콘·글자도 함께)</>],
  ['motion', <>상태 전환 시간이 <code>--duration-fast</code> 안팎으로 짧은가요?</>],
]

function Checklist() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const n = CHECKS.filter(([k]) => on[k]).length
  return (
    <>
      <ul className="st-checklist">
        {CHECKS.map(([k, t]) => (
          <li key={k}>
            <label><input type="checkbox" checked={!!on[k]} onChange={e => setOn(o => ({ ...o, [k]: e.target.checked }))} /><span>{t}</span></label>
          </li>
        ))}
      </ul>
      <div className="st-progress" aria-live="polite"><div style={{ width: (n / CHECKS.length) * 100 + '%' }} /><span>{n} / {CHECKS.length}</span></div>
      <Note>로딩 버튼을 더 자세히 비교하려면 <a href="#/loading/loading-button">로딩 버튼 →</a>, 포커스 링은 <a href="#/system/a11y">접근성 탭 →</a>에서 볼 수 있어요.</Note>
    </>
  )
}

function stateCSS(c: SysConfig) {
  return `.button {
  background: var(--color-primary);
  color: var(--color-on-primary);
  transition:
    background-color var(--duration-fast) var(--ease-standard), /* ${c.motion.fast}ms */
    transform var(--duration-fast) var(--ease-standard);
}
/* Hover — 마우스가 있는 기기에서만 */
@media (hover: hover) {
  .button:hover { background: color-mix(in srgb, var(--color-primary), #000 12%); }
}
/* Pressed */
.button:active { background: color-mix(in srgb, var(--color-primary), #000 22%); transform: scale(.97); }
/* Focus — outline: none 금지, 키보드일 때만 링 */
.button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
/* Disabled */
.button:disabled { background: var(--color-border); color: var(--color-text-sub); cursor: not-allowed; }
/* Loading — 폭 유지, 중복 클릭 막기 */
.button[aria-busy="true"] { cursor: progress; pointer-events: none; }

.input { border: 1px solid var(--color-border); }
.input:hover { border-color: var(--color-text-sub); }
.input:focus-visible {
  outline: none; /* 아래 테두리+그림자로 대신 보여줘요 */
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent);
}
.input:disabled { background: var(--color-surface); color: var(--color-text-sub); }`
}

/* =================================================================
 * 2) 데이터 화면 4대 상태
 * ================================================================= */
type DS = 'loading' | 'empty' | 'error' | 'ideal'
type Len = 'one' | 'normal' | 'long'
type Fit = 'wrap' | 'ellipsis' | 'clamp'

const LONG_TITLE = (() => {
  const base = '가을 니트 카디건 베이지 오버핏 울 혼방 데일리 아우터 '
  return base.repeat(Math.ceil(1000 / base.length)).slice(0, 1000)
})()
const LONG_DESC = 'https://shop.example.com/products/autumn-knit-cardigan-beige-oversized-wool-blend-daily-outer-limited-edition 링크처럼 띄어쓰기 없는 긴 글자도 섞여 있어요. ' + '부드러운 울 혼방 소재로 가볍게 걸치기 좋아요. '.repeat(20)
const TEXT: Record<Len, { title: string; desc: string }> = {
  one: { title: '가', desc: '네' },
  normal: { title: '가을 니트 카디건 베이지', desc: '부드러운 울 혼방 소재로 가볍게 걸치기 좋아요. 세탁기 울 코스로 빨 수 있어요.' },
  long: { title: LONG_TITLE, desc: LONG_DESC },
}
const ITEMS = [
  { title: '코튼 와이드 팬츠', desc: '허리 밴딩으로 편하게 입어요.', price: '39,000원', st: '배송 중' },
  { title: '캔버스 토트백', desc: '노트북이 들어가는 넉넉한 크기예요.', price: '24,000원', st: '배송 완료' },
]
const FIT_CSS: Record<Fit, string> = {
  wrap: `/* 다 보여주기: 긴 단어·URL도 상자 안에서 줄바꿈 */
.title, .desc {
  word-break: keep-all;     /* 한글은 어절 단위로 */
  overflow-wrap: anywhere;  /* 띄어쓰기 없는 긴 글자는 아무 데서나 */
}
.item { min-height: 72px; } /* 1자일 때도 높이 유지 */`,
  ellipsis: `/* 한 줄 말줄임 */
.title, .desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;             /* flex 자식이면 꼭 필요해요 */
}`,
  clamp: `/* 여러 줄 말줄임 (line-clamp) */
.title, .desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}`,
}

function DataStates() {
  const T = useTimers()
  const [ds, setDs] = useState<DS>('ideal')
  const [ld, setLd] = useState<'skeleton' | 'spinner'>('skeleton')
  const [len, setLen] = useState<Len>('normal')
  const [fit, setFit] = useState<Fit>('clamp')
  const retry = () => { setDs('loading'); T.set(() => setDs('ideal'), 1400) }
  const t = TEXT[len]
  const hint: Record<Len, Record<Fit, string>> = {
    one: { wrap: '1자일 때 카드 높이·썸네일 정렬이 무너지지 않는지 봐요.', ellipsis: '짧은 글자에는 말줄임이 영향을 주지 않아요.', clamp: '짧은 글자에는 줄임이 영향을 주지 않아요. 높이는 최소값으로 잡아 두세요.' },
    normal: { wrap: '보통 길이에서는 두세 줄로 자연스럽게 감겨요.', ellipsis: '한 줄을 넘으면 …으로 잘려요. 핵심어를 앞에 두세요.', clamp: '두 줄까지 보여주고 나머지는 …으로 잘라요.' },
    long: { wrap: '1,000자가 모두 보여서 목록이 끝없이 길어져요. 화면 안에서 스크롤해 보세요.', ellipsis: '아무리 길어도 한 줄. 대신 전체 내용은 상세 화면에서 보여줘야 해요.', clamp: '두 줄로 고정돼 목록 리듬이 유지돼요. 실무에서 가장 무난한 선택이에요.' },
  }
  return (
    <div className="ds-wrap">
      <div className="ds-ctrl">
        <div className="ctl-row"><span className="ctl-label">상태</span>
          <Seg value={ds} onChange={setDs} options={[['loading', '로딩'], ['empty', '빈 화면'], ['error', '에러'], ['ideal', '정상']]} className="ds-seg-state" />
        </div>
        {ds === 'loading' && (
          <div className="ctl-row"><span className="ctl-label">로딩 표시</span>
            <Seg value={ld} onChange={setLd} options={[['skeleton', '스켈레톤'], ['spinner', '스피너']]} />
          </div>
        )}
        {ds === 'ideal' && <>
          <div className="ctl-row"><span className="ctl-label">첫 항목 글자 수</span>
            <Seg value={len} onChange={setLen} options={[['one', '1자'], ['normal', '보통'], ['long', '1,000자']]} className="ds-seg-len" />
          </div>
          <div className="ctl-row"><span className="ctl-label">넘칠 때 처리</span>
            <Seg value={fit} onChange={setFit} options={[['wrap', '줄바꿈'], ['ellipsis', '말줄임 1줄'], ['clamp', 'line-clamp 2줄']]} className="ds-seg-fit" />
          </div>
          <Note tone="tip">{hint[len][fit]} <span className="muted">제목 {t.title.length.toLocaleString()}자</span></Note>
          <CodeBlock code={FIT_CSS[fit]} maxHeight={240} />
        </>}
        <ul className="ds-legend">
          <li className={ds === 'loading' ? 'on' : ''}><b>로딩</b> 자리를 미리 잡아 화면이 튀지 않게 해요. <a href="#/loading/loading-skeleton">스켈레톤 →</a></li>
          <li className={ds === 'empty' ? 'on' : ''}><b>빈 화면</b> 왜 비었는지와 다음 행동을 알려줘요. <a href="#/empty/empty-first">첫 사용 →</a></li>
          <li className={ds === 'error' ? 'on' : ''}><b>에러</b> 무엇이 잘못됐는지, 어떻게 고치는지 쉬운 말로. <a href="#/empty/empty-error">오류 화면 →</a></li>
          <li className={ds === 'ideal' ? 'on' : ''}><b>정상</b> 1자부터 아주 긴 글까지 실제 데이터로 검증해요. <a href="#/feedback/feedback-inline">인라인 오류 →</a></li>
        </ul>
      </div>

      <div className="ds-frame" data-ds={ds} data-fit={fit}>
        <div className="ds-bar"><span>주문 내역</span><span className="ds-bar-sub">{ds === 'ideal' ? '3건' : ''}</span></div>
        <div className="ds-body" tabIndex={0} aria-label="데이터 화면 미리보기">
          {ds === 'loading' && ld === 'skeleton' && (
            <div className="ds-list" aria-busy="true" aria-label="불러오는 중">
              {[0, 1, 2].map(k => (
                <div className="ds-item" key={k}>
                  <span className="ds-thumb st-sk" />
                  <div className="ds-txt"><span className="st-sk" style={{ width: '70%', height: 14 }} /><span className="st-sk" style={{ width: '90%', height: 10 }} /><span className="st-sk" style={{ width: '40%', height: 10 }} /></div>
                </div>
              ))}
            </div>
          )}
          {ds === 'loading' && ld === 'spinner' && (
            <div className="ds-center" aria-busy="true"><Spin className="big" /><span>주문 내역을 불러오는 중이에요</span></div>
          )}
          {ds === 'empty' && (
            <div className="ds-center">
              <span className="ds-ill" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 16h32l-3 24H11z" /><path d="M17 16a7 7 0 0 1 14 0" /></svg>
              </span>
              <b>아직 주문이 없어요</b>
              <span>첫 주문을 하면 여기서 배송 상황을 볼 수 있어요.</span>
              <button type="button" className="pv-btn sm">상품 둘러보기</button>
            </div>
          )}
          {ds === 'error' && (
            <div className="ds-center">
              <span className="ds-ill err" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="24" cy="24" r="17" /><path d="M24 15v11M24 32v.5" /></svg>
              </span>
              <b>주문 내역을 불러오지 못했어요</b>
              <span>인터넷 연결을 확인하고 다시 시도해 주세요.</span>
              <button type="button" className="pv-btn sm" onClick={retry} data-act="retry">다시 시도</button>
            </div>
          )}
          {ds === 'ideal' && (
            <ul className="ds-list ideal">
              {[{ ...t, price: '59,000원', st: '결제 완료' }, ...ITEMS].map((it, k) => (
                <li className={'ds-item' + (k === 0 ? ' first' : '')} key={k}>
                  <span className="ds-thumb" aria-hidden="true" />
                  <div className="ds-txt">
                    <b className="ds-title" title={k === 0 && fit !== 'wrap' ? it.title.slice(0, 200) : undefined}>{it.title}</b>
                    <span className="ds-desc">{it.desc}</span>
                    <span className="ds-meta"><span className="ds-price">{it.price}</span><span className="ds-badge">{it.st}</span></span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* =================================================================
 * 3) 모션: linear vs ease-out
 * ================================================================= */
type MK = 'fast' | 'normal' | 'slow'
const MK_LABEL: Record<MK, string> = { fast: 'fast · 호버·토글', normal: 'normal · 메뉴·드롭다운', slow: 'slow · 모달·시트' }
const EASES: [string, string][] = [
  ['cubic-bezier(0.2, 0, 0, 1)', '강조 감속'],
  ['cubic-bezier(0, 0, 0.2, 1)', '감속 (0,0,.2,1)'],
  ['ease-out', 'CSS ease-out'],
]
const BALL = 28

function Motion() {
  const { config, update } = useSys()
  const [k, setK] = useState<MK>('normal')
  const ms = config.motion[k]
  const ez = config.motion.easing
  const lanes = useRef<(HTMLDivElement | null)[]>([])
  const anims = useRef<Animation[]>([])
  const T = useTimers()
  const first = useRef(true)
  const f = easingFn(ez)
  const ok = ms >= 150 && ms <= 300

  const play = () => {
    anims.current.forEach(a => a.cancel())
    anims.current = []
    lanes.current.forEach((ln, idx) => {
      const ball = ln?.querySelector<HTMLElement>('.mo-ball')
      if (!ln || !ball) return
      const d = ln.clientWidth - BALL - 12
      anims.current.push(ball.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${d}px)` }], { duration: ms, easing: idx === 0 ? 'linear' : ez, fill: 'forwards' }))
    })
  }
  const playRef = useRef(play)
  playRef.current = play
  // 값이 바뀌면 잠시 뒤 자동 재생
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const id = T.set(() => playRef.current(), 280)
    return () => T.clear(id)
  }, [ms, ez, T])
  useEffect(() => () => { anims.current.forEach(a => a.cancel()) }, [])

  const setMs = (v: number) => update(c => ({ ...c, motion: { ...c.motion, [k]: v } }))
  const half = Math.round(f(0.5) * 100)

  const code = `:root {
  --duration-fast: ${config.motion.fast}ms;   /* 호버·토글 같은 작은 변화 */
  --duration-normal: ${config.motion.normal}ms; /* 메뉴·드롭다운 열기 */
  --duration-slow: ${config.motion.slow}ms;   /* 모달·시트처럼 큰 이동 */
  --ease-standard: ${ez};
}
.menu {
  transition:
    opacity var(--duration-normal) var(--ease-standard),
    transform var(--duration-normal) var(--ease-standard);
}
/* 움직임 줄이기 설정을 존중해요 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}`

  return (
    <div className="mo-wrap">
      <div className="mo-stage">
        {(['linear', 'ease-out'] as const).map((name, idx) => (
          <div key={name} className="mo-lane-wrap">
            <div className="mo-lane-head"><b>{name === 'linear' ? 'linear' : 'ease-out 계열'}</b><code>{idx === 0 ? 'linear' : ez}</code></div>
            <div className="mo-lane" ref={el => { lanes.current[idx] = el }} data-lane={name}>
              <span className={'mo-ball' + (idx ? ' b' : '')} />
              {Array.from({ length: 11 }, (_, i) => {
                const p = idx === 0 ? i / 10 : f(i / 10)
                return <span key={i} className="mo-tick" style={{ left: `calc(6px + ${BALL / 2}px + (100% - ${BALL + 12}px) * ${p.toFixed(4)})` }} />
              })}
            </div>
          </div>
        ))}
        <div className="mo-foot">
          <button type="button" className="btn sm" onClick={play} data-act="play">▶ 재생</button>
          <span className="muted">점은 같은 시간 간격마다 공이 있는 자리예요. 시간이 절반 지났을 때 linear는 <b>50%</b>, ease-out 계열은 <b>{half}%</b> 이동해서 더 빠르게 느껴져요.</span>
        </div>
      </div>
      <div className="mo-ctrl">
        <div className="ctl-row"><span className="ctl-label">수정할 토큰</span>
          <Seg value={k} onChange={setK} options={(['fast', 'normal', 'slow'] as const).map(x => [x, x] as const)} className="mo-seg-k" />
        </div>
        <SliderRow label={<>--duration-{k} <span className="muted">({MK_LABEL[k]})</span></>} value={ms} unit="ms" ok={ok}
          hint={ok ? '권장 범위 150~300ms 안이에요.' : ms < 150 ? '너무 빨라서 변화가 안 보일 수 있어요.' : '300ms를 넘으면 답답하게 느껴질 수 있어요.'}>
          <div className="mo-range">
            <span className="mo-band" aria-hidden="true"><span>권장 150~300</span></span>
            <Range value={ms} min={100} max={600} step={10} onChange={setMs} label={`--duration-${k} (ms)`} />
          </div>
        </SliderRow>
        <div className="ctl-row col"><span className="ctl-label">--ease-standard</span>
          <Seg value={ez} onChange={v => update(c => ({ ...c, motion: { ...c.motion, easing: v } }))} options={EASES.map(([v, l]) => [v, l] as const)} className="mo-seg-ez" />
        </div>
        <CodeBlock code={code} maxHeight={260} />
        <Note>들어올 때는 감속(ease-out), 나갈 때는 가속(ease-in)이 기본이에요. 곡선을 직접 비교하려면 <a href="#/easing/easing-out">이즈 아웃 →</a>, <a href="#/easing/easing-in">이즈 인 →</a></Note>
      </div>
    </div>
  )
}

export default function StateTab() {
  const { config } = useSys()
  return (
    <div data-sys="state" style={{ ...pvVars(config), ['--st-dur' as string]: config.motion.fast + 'ms' }}>
      <SysGrid>
        <Section id="sys-state-six" wide title="컴포넌트 6대 상태"
          desc="버튼과 입력창 하나에도 상태가 6가지 있어요. 하나라도 빠지면 사용자는 '눌렸나?', '어디 있지?'를 고민하게 돼요. 미리보기 색은 컬러 탭의 토큰을 써요.">
          <ComponentStates />
        </Section>
        <Section id="sys-state-check" title="상태 체크리스트" desc="디자인을 넘기기 전에 하나씩 확인해요.">
          <Checklist />
        </Section>
        <Section id="sys-state-css" title="상태 CSS" desc="토큰 이름은 상단 '내보내기'의 tokens.css와 같아요.">
          <CodeBlock code={stateCSS(config)} maxHeight={420} />
        </Section>
        <Section id="sys-state-data" wide title="데이터 화면 4대 상태"
          desc="목록 하나도 로딩·빈 화면·에러·정상 네 가지 모습을 미리 그려 둬야 해요. 정상 상태에서는 글자 수를 바꿔 줄바꿈과 말줄임을 확인해 보세요.">
          <DataStates />
        </Section>
        <Section id="sys-state-motion" wide title="모션 시간과 이징"
          desc="같은 거리를 같은 시간에 움직여도 곡선에 따라 느낌이 달라요. 시간을 바꾸면 내보내기의 --duration 토큰에 바로 반영돼요.">
          <Motion />
        </Section>
      </SysGrid>
    </div>
  )
}
