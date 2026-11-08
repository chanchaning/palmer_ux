import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Ic, MdSeg, fill, useWinDrag, type IconName } from '../shared'

const q = (root: ParentNode | null | undefined, sel: string) => root?.querySelector<HTMLElement>(sel) ?? null
const qa = (root: ParentNode | null | undefined, sel: string) => [...(root?.querySelectorAll<HTMLElement>(sel) ?? [])]

/* ---------- 08 Chips ---------- */
const FLT = ['와이파이', '주차', '반려동물', '24시간']
const SUG: [string, string][] = [['좋아요! 그때 봐요 👍', '좋아요! 👍'], ['몇 번 출구에서 볼까요?', '몇 번 출구?'], ['조금 늦을 것 같아요 🙏', '조금 늦어요']]
const CHIP_INIT = <>네 종류의 칩을 <b>하나씩 눌러</b> 차이를 느껴보세요</>
type InChip = { id: number; name: string }

export function Chips() {
  const seq = useRef(2)
  const init = (): InChip[] => [{ id: 0, name: '민지' }, { id: 1, name: '서준' }]
  const [inputs, setInputsS] = useState<InChip[]>(init)
  const inputsRef = useRef(inputs)
  const setInputs = (v: InChip[]) => { inputsRef.current = v; setInputsS(v) }
  const [flt, setFlt] = useState<string[]>([])
  const [tf, setTf] = useState('')
  const [inp, setInp] = useState('')
  const [log, setLog] = useState<ReactNode>(CHIP_INIT)
  const box = useRef<HTMLDivElement>(null)
  const inRef = useRef<HTMLInputElement>(null)

  const onList = FLT.filter(f => flt.includes(f))
  const n = Math.max(1, Math.round(128 / Math.pow(2.3, onList.length)))

  const addChip = (raw: string) => {
    const name = raw.trim().slice(0, 10)
    if (!name) return
    if (inputsRef.current.length >= 5) { setLog(<>받는 사람은 <b>5명까지</b>만 넣을 수 있어요</>); return }
    setInputs([...inputsRef.current, { id: seq.current++, name }])
    setLog(<><b>{name}</b> — 입력한 값이 하나의 <b>칩 덩어리</b>가 됐어요</>)
  }
  const toggleFlt = (f: string) => {
    const on = !flt.includes(f)
    const next = on ? [...flt, f] : flt.filter(x => x !== f)
    setFlt(next)
    setLog(<>필터 <b>{f}</b> {on ? '선택 — 앞에 ✓ 체크가 생겨요' : '해제'} ({next.length}개 적용)</>)
  }

  const demo = useDemo({
    reset() { setInputs(init()); setFlt([]); setTf(''); setInp(''); setLog(CHIP_INIT) },
    async play(c) {
      const b = box.current, f = qa(b, '#material-chip-filter .md-chip')
      await c.press(b, q(b, '#material-chip-assist .md-chip')); await c.sleep(1100)
      await c.press(b, f[0]); await c.sleep(700)
      await c.press(b, f[2]); await c.sleep(1000)
      addChip('하은'); await c.sleep(1000)
      await c.press(b, q(b, '.md-chip.inp button')); await c.sleep(1000)
      await c.press(b, q(b, '#material-chip-sug .md-chip'))
    },
  })

  return (
    <Card id="material-chips" num="08" title="칩 4종" en="Chips"
      desc="작고 둥근 사각형 버튼이에요. 역할에 따라 보조·필터·입력·추천 네 가지로 나눠요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}>
          <div className="md-cg">
            <div className="md-cap">Assist<em>보조 액션 · 스마트 답장</em></div>
            <div className="md-bubble">💬 금요일 저녁 7시에 강남역에서 봐요!</div>
            <div className="md-chips" id="material-chip-assist">
              <button className="md-chip" data-rip="" onClick={() => setLog(<>보조 액션 → 캘린더에 <b>금요일 19:00 · 강남역</b> 일정을 추가했어요</>)}><Ic n="event" />일정 추가</button>
              <button className="md-chip" data-rip="" onClick={() => setLog(<>보조 액션 → <b>강남역</b> 길찾기를 열어요</>)}><Ic n="place" />길찾기</button>
            </div>
          </div>
          <div className="md-cg">
            <div className="md-cap">Filter<em>선택하면 체크 표시</em></div>
            <div className="md-chips" id="material-chip-filter">
              {FLT.map(f => {
                const on = flt.includes(f)
                return (
                  <button key={f} className={'md-chip flt' + (on ? ' on' : '')} data-rip="" aria-pressed={on} onClick={() => toggleFlt(f)}>
                    <span className="md-chk"><Ic n="check" /></span>{f}
                  </button>
                )
              })}
            </div>
            <div className="md-cnt">조건에 맞는 카페 <b>{n}곳</b>{onList.length ? ' · ' + onList.join(', ') : ''}</div>
          </div>
          <div className="md-cg">
            <div className="md-cap">Input<em>입력이 덩어리로 · X로 지우기</em></div>
            <div className="md-inf" onClick={e => { if (e.target === e.currentTarget) inRef.current?.focus() }}>
              {inputs.map(ch => (
                <span key={ch.id} className="md-chip inp">
                  <span className="md-av">{ch.name[0]}</span>{ch.name}
                  <button aria-label={ch.name + ' 지우기'} onClick={() => {
                    setLog(<><b>{ch.name}</b> 칩을 X로 지웠어요</>)
                    setInputs(inputsRef.current.filter(x => x.id !== ch.id))
                    inRef.current?.focus()
                  }}><Ic n="close" /></button>
                </span>
              ))}
              <input ref={inRef} placeholder="받는 사람 입력 후 Enter" aria-label="받는 사람" autoComplete="off" value={inp}
                onChange={e => setInp(e.target.value)}
                onKeyDown={e => {
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(inp); setInp('') }
                  else if (e.key === 'Backspace' && !inp) {
                    const all = inputsRef.current
                    if (all.length) { setInputs(all.slice(0, -1)); setLog(<>빈 칸에서 <b>Backspace</b> — 마지막 칩을 지웠어요</>) }
                  }
                }} />
            </div>
          </div>
          <div className="md-cg">
            <div className="md-cap">Suggestion<em>상황에 맞춘 동적 추천</em></div>
            <input className="md-tf" placeholder="답장 쓰기…" aria-label="답장" autoComplete="off" value={tf} onChange={e => setTf(e.target.value)} />
            <div className="md-chips" id="material-chip-sug">
              {SUG.map(([s, label]) => (
                <button key={s} className="md-chip sug" data-rip="" onClick={() => { setTf(s); setLog(<>추천 칩을 눌러 <b>답장 칸이 채워졌어요</b> — 상황에 따라 추천이 바뀌어요</>) }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['Assist', '동작'], ['Filter', '선택'], ['Input', '입력값'], ['Suggestion', '추천']]}
        usage={[
          ['언제', '버튼보다 가볍게, 여러 개를 나란히 보여줄 때 써요. 필터와 입력 칩은 상태가 남고, 보조·추천 칩은 누르면 끝나요.'],
          ['주의', '칩을 화면의 주요 동작에 쓰지 않아요. 그건 버튼이나 FAB의 몫이에요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 Badges ---------- */
type BK = 'mail' | 'chat' | 'news' | 'me'
const NB: [BK, IconName, string][] = [['mail', 'mail', '메일'], ['chat', 'chat', '채팅'], ['news', 'bell', '소식'], ['me', 'person', '나']]
const bfmt = (n: number) => (n > 999 ? '999+' : String(n))

export function Badges() {
  const [st, setSt] = useState({ mail: 3, chat: 0, news: true })
  const [sel, setSel] = useState(0)
  const [bump, setBump] = useState<{ k: BK; n: number } | null>(null)
  const [log, setLog] = useState<ReactNode>(<>숫자를 늘리거나 탭을 눌러 <b>읽음 처리</b>해 보세요</>)
  const box = useRef<HTMLDivElement>(null)
  const refs = { mail: useRef<HTMLElement>(null), chat: useRef<HTMLElement>(null), news: useRef<HTMLElement>(null) }

  useLayoutEffect(() => {
    if (!bump || bump.k === 'me') return
    const el = refs[bump.k].current
    if (!el || el.classList.contains('off')) return
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump])

  const add = (k: 'mail' | 'chat', n: number) => {
    const v = st[k] + n
    setSt({ ...st, [k]: v }); setBump({ k, n: Date.now() })
    setLog(v > 999 ? <>메일 <b>{v.toLocaleString()}개</b> → 배지는 <b>999+</b>로 줄여 보여요</> : <>{k === 'mail' ? '메일' : '채팅'} <b>Large 배지 {v}</b> — 숫자 캡슐이 늘어나요</>)
  }
  const openTab = (i: number) => {
    setSel(i)
    const [k, , label] = NB[i]
    if (k === 'me') { setLog(<><b>나</b> 탭 — 알릴 게 없으면 배지도 없어요</>); return }
    const had = k === 'news' ? st.news : st[k] > 0
    setSt(k === 'news' ? { ...st, news: false } : { ...st, [k]: 0 })
    setLog(had ? <><b>{label}</b> 탭을 열어 확인 → 배지 <b>읽음 처리</b></> : <><b>{label}</b> 탭 — 새로운 내용이 없어요</>)
  }

  const demo = useDemo({
    reset() { setSt({ mail: 3, chat: 0, news: true }); setSel(3) },
    async play(c) {
      const b = box.current, tabs = qa(b, '.md-nb button')
      await c.press(b, q(b, '#material-bdg-c1')); await c.sleep(800)
      await c.press(b, q(b, '#material-bdg-m1')); await c.sleep(800)
      await c.press(b, q(b, '#material-bdg-m500')); await c.sleep(800)
      await c.press(b, q(b, '#material-bdg-m500')); await c.sleep(1200)
      await c.press(b, tabs[0]); await c.sleep(1100)
      await c.press(b, tabs[2])
    },
  })

  return (
    <Card id="material-badge" num="09" title="배지" en="Badges"
      desc="아이콘 모서리에 붙어 새 소식이나 개수를 알려줘요. 점(Small)과 숫자 캡슐(Large) 두 가지예요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}>
          <div className="md-legend"><span><i className="md-bdg dot" />Small · 새 소식 있음</span><span><i className="md-bdg">12</i>Large · 개수</span></div>
          <div className="md-nb">
            {NB.map(([k, ic, label], i) => (
              <button key={k} className={i === sel ? 'on' : ''} data-k={k} onClick={() => openTab(i)}>
                <span className="md-nbi md-sl" data-rip="">
                  <Ic n={ic} />
                  {k === 'mail' && <b className={'md-bdg' + (st.mail ? '' : ' off')} ref={refs.mail}>{bfmt(st.mail)}</b>}
                  {k === 'chat' && <b className={'md-bdg' + (st.chat ? '' : ' off')} ref={refs.chat}>{bfmt(st.chat)}</b>}
                  {k === 'news' && <b className={'md-bdg dot' + (st.news ? '' : ' off')} ref={refs.news} />}
                </span>{label}
              </button>
            ))}
          </div>
          <div className="md-ctl">
            <button className="md-btn t" data-rip="" id="material-bdg-m1" onClick={() => add('mail', 1)}>메일 +1</button>
            <button className="md-btn t" data-rip="" id="material-bdg-m500" onClick={() => add('mail', 500)}>메일 +500</button>
            <button className="md-btn t" data-rip="" id="material-bdg-c1" onClick={() => add('chat', 1)}>채팅 +1</button>
            <button className="md-btn t" data-rip="" id="material-bdg-news-btn"
              onClick={() => { setSt({ ...st, news: true }); setBump({ k: 'news', n: Date.now() }); setLog(<><b>Small 배지(점)</b> — 개수 없이 “새 소식 있음”만 알려요</>) }}>새 소식 ●</button>
            <button className="md-btn o" data-rip="" id="material-bdg-read" style={{ gridColumn: '1 / -1' }}
              onClick={() => { setSt({ mail: 0, chat: 0, news: false }); setLog(<><b>모두 읽음</b> — 배지가 모두 사라졌어요</>) }}>모두 읽음</button>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['Small', '점 · 내용 없음'], ['Large', '숫자 · 999+']]}
        usage={[
          ['언제', '개수가 중요하면 Large, “뭔가 새로 생겼다”만 알리면 Small을 써요.'],
          ['주의', '숫자가 너무 커지면 999+처럼 줄여요. 확인하면 바로 사라져야 신뢰가 쌓여요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 10 Divider ---------- */
type DvMode = 'full' | 'inset' | 'middle' | 'vert'
const DV_LABEL: Record<DvMode, string> = { full: '전체 폭', inset: '인셋', middle: '가운데 인셋', vert: '세로' }
const DV_NOTE: Record<DvMode, ReactNode> = {
  full: <><b>전체 폭</b> — 화면 끝에서 끝까지. 성격이 다른 구역을 나눌 때 써요.</>,
  inset: <><b>인셋</b> — 글자 시작점에 맞춰 왼쪽을 비워요. 같은 목록 안 항목 사이에 써요.</>,
  middle: <><b>가운데 인셋</b> — 양쪽을 모두 비워요. 카드 안처럼 가볍게 나눌 때 써요.</>,
  vert: <><b>세로</b> — 나란히 놓인 버튼이나 정보 사이를 나눠요.</>,
}

export function Divider() {
  const [mode, setMode] = useState<DvMode>('full')
  const box = useRef<HTMLDivElement>(null)
  const demo = useDemo({
    reset() { setMode('full') },
    async play(c) {
      const seg = q(box.current, '.md-seg')
      for (const v of ['inset', 'middle', 'vert', 'full']) { await c.sleep(900); await c.press(seg, q(seg, 'button[data-v="' + v + '"]')) }
    },
  })
  return (
    <Card id="material-divider" num="10" title="디바이더" en="Divider"
      desc="목록이나 영역 사이를 나누는 얇은 선이에요. 가로·세로, 들여쓰기 정도로 관계를 표현해요." demo={demo}>
      <Stage log={<>지금 <b>파란 선</b>이 {DV_LABEL[mode]} 디바이더예요</>}>
        <div className="box left" ref={box}>
          <MdSeg value={mode} onChange={setMode} options={(Object.keys(DV_LABEL) as DvMode[]).map(k => [k, DV_LABEL[k]] as const)} />
          <div className={'md-dvl m-' + mode}>
            <button className="md-li md-sl" data-rip=""><span className="md-av">민</span><span>김민지<small>오늘 회의 자료 공유드려요</small></span></button>
            <div className="md-dv" />
            <button className="md-li md-sl" data-rip=""><span className="md-av">서</span><span>이서준<small>점심 같이 드실 분?</small></span></button>
            <div className="md-dv" />
            <button className="md-li md-sl" data-rip=""><span className="md-av">하</span><span>박하은<small>시안 확인 부탁드려요</small></span></button>
            <div className="md-dv-sec" />
            <div className="md-vrow">
              <button data-rip=""><Ic n="chat" />답장</button><span className="md-vdv" />
              <button data-rip=""><Ic n="share" />전달</button><span className="md-vdv" />
              <button data-rip=""><Ic n="star" />별표</button>
            </div>
          </div>
          <p className="md-dv-note">{DV_NOTE[mode]}</p>
        </div>
      </Stage>
      <Info
        spec={[['방향', '가로 · 세로'], ['들여쓰기', '전체 · 인셋 · 가운데']]}
        usage={[
          ['언제', '전체 폭은 큰 구역 사이, 인셋은 같은 목록 안 항목 사이, 세로는 나란한 버튼·정보 사이에 써요.'],
          ['주의', '여백만으로 구분된다면 선을 빼요. 선이 많을수록 화면이 답답해져요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 11 Specs ---------- */
type SpTab = 'touch' | 'dp' | 'type' | 'bar'
const TAB_MSG: Record<SpTab, ReactNode> = {
  touch: <>아이콘을 눌러보고 <b>터치 영역</b>을 켜보세요</>,
  dp: <>밀도를 바꿔도 <b>48dp</b>는 같은 크기로 보여요</>,
  type: <>문장을 고쳐 <b>Roboto · Noto Sans</b> 미리보기</>,
  bar: <><b>←</b> 또는 아래 <b>시스템 내비게이션</b>으로 뒤로 가보세요</>,
}
const SCREENS: [string, string[]][] = [['설정', ['네트워크', '알림', '디스플레이']], ['알림 설정', ['앱 알림', '방해 금지', '잠금 화면']], ['앱 알림', ['메일', '메시지', '캘린더']]]
const TT: [IconName, string][] = [['search', '검색'], ['star', '별표'], ['more', '더보기']]

export function Specs() {
  const drag = useWinDrag()
  const [tab, setTabS] = useState<SpTab>('touch')
  const tabRef = useRef(tab)
  const [log, setLog] = useState<ReactNode>(TAB_MSG.touch)
  const [show, setShow] = useState(false)
  const [tight, setTight] = useState(false)
  const hits = useRef(0)
  const [k, setK] = useState(2)
  const [text, setText] = useState('Material 머티리얼 123')
  const [depth, setDepth] = useState(1)
  const [center, setCenter] = useState(false)
  const [sys, setSys] = useState<'gesture' | 'btn'>('gesture')
  const box = useRef<HTMLDivElement>(null)

  const showTab = (v: SpTab) => { setTabS(v); tabRef.current = v; setLog(TAB_MSG[v]) }
  const setDp = (v: number) => {
    setK(v)
    if (tabRef.current === 'dp') setLog(<><b>{v}x</b> 화면 — 48dp = <b>{48 * v}px</b>, 손가락에 닿는 크기는 같아요</>)
  }
  const back = (how: ReactNode) => {
    if (depth === 0) { setLog(<>첫 화면이에요 — 한 번 더 뒤로 가면 <b>앱을 나가요</b></>); return }
    const d = depth - 1
    setDepth(d)
    setLog(<>{how} → <b>{SCREENS[d][0]}</b>(으)로 돌아왔어요</>)
  }
  const ttBtn = (ic: IconName, n: string) => (
    <button key={n} className="md-tt" data-rip="u" data-n={n} aria-label={n}
      onClick={() => { hits.current++; setLog(<><b>{n}</b> 눌림 ({hits.current}번째) — {tight ? '좁은 영역 · 24dp' : '넉넉한 영역 · 48dp'}</>) }}><Ic n={ic} /></button>
  )
  const val = text || ' '

  const demo = useDemo({
    reset() { showTab('touch'); setShow(false); setTight(false) },
    async play(c) {
      const b = box.current, seg = q(b, '#material-sp-seg')
      await c.press(b, qa(b, '.md-tt')[1]); await c.sleep(700)
      await c.press(b, q(b, '#material-tt-show')); await c.sleep(1500)
      await c.press(seg, q(seg, 'button[data-v="dp"]')); await c.sleep(600)
      for (const v of [1, 2, 3]) { setDp(v); await c.sleep(800) }
      await c.press(seg, q(seg, 'button[data-v="bar"]')); await c.sleep(700)
      setDepth(2); await c.sleep(700)
      await c.press(b, q(b, '#material-ap-back')); await c.sleep(900)
      await c.press(seg, q(seg, 'button[data-v="touch"]'))
    },
  })

  return (
    <Card id="material-spec" num="11" title="규격 한눈에" en="Specs"
      desc="dp 단위, 48dp 터치 영역, Roboto 서체, 좌측 정렬 상단 바처럼 머티리얼만의 기준을 확인해요." demo={demo}>
      <Stage log={log}>
        <div className="box left" ref={box}>
          <MdSeg id="material-sp-seg" value={tab} onChange={showTab} options={[['touch', '터치 영역'], ['dp', 'dp 단위'], ['type', '서체'], ['bar', '상단 바·뒤로']]} />

          <div className={'md-pn' + (tab === 'touch' ? ' on' : '')} data-p="touch">
            <div className={'md-tbar' + (show ? ' show-tt' : '') + (tight ? ' tight' : '')}
              onClick={e => { if (!(e.target as Element).closest('.md-tt') && tight) setLog(<><b>빗나갔어요!</b> 영역이 아이콘만큼 작으면 이렇게 돼요</>) }}>
              {ttBtn('back', '뒤로')}
              <span className="md-ab-t">사진</span>
              {TT.map(([ic, n]) => ttBtn(ic, n))}
            </div>
            <div className="md-tt-row"><span>보이지 않는 터치 영역 보기</span>
              <button className="switch" role="switch" aria-checked={show} id="material-tt-show" aria-label="터치 영역 보기"
                onClick={() => { const on = !show; setShow(on); setLog(on ? <>주황 점선이 <b>48×48dp</b> 터치 영역, 파란 칸이 <b>24dp</b> 아이콘이에요</> : <>터치 영역은 <b>눈에 안 보여도</b> 늘 있어요</>) }} />
            </div>
            <MdSeg value={tight ? '24' : '48'} options={[['48', '48×48dp 영역'], ['24', '아이콘 크기만 (24dp)']]}
              onChange={v => { setTight(v === '24'); setLog(v === '24' ? <>아이콘 크기만큼만 누를 수 있으면 <b>빗나가기 쉬워요</b></> : <>아이콘은 24dp여도 <b>48dp</b>까지 눌려요</>) }} />
            <div className="md-meter"><span><i style={{ background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }} />아이콘 24dp</span><span><i style={{ border: '1.5px dashed var(--b)' }} />터치 영역</span></div>
          </div>

          <div className={'md-pn' + (tab === 'dp' ? ' on' : '')} data-p="dp">
            <div className="md-lab"><span>화면 밀도</span><b>{k}x · {k === 1 ? '저밀도' : k === 2 ? '고밀도' : '초고밀도'}</b></div>
            <input type="range" min={1} max={3} step={1} value={k} aria-label="화면 밀도" style={fill(k, 1, 3)} onChange={e => setDp(+e.target.value)} />
            <div className="md-dp">
              <div><div className="md-dp-stage"><div className="md-dp-sq" style={{ backgroundSize: 12 / k + 'px ' + 12 / k + 'px' }} /></div><small>48dp로 지정</small><b>= {48 * k}×{48 * k}px</b><small>크기 그대로, 픽셀만 촘촘해져요</small></div>
              <div><div className="md-dp-stage"><div className="md-dp-fx" style={{ width: 72 / k, height: 72 / k }} /></div><small>48px로 고정</small><b>{k === 1 ? '같은 크기' : '1/' + k + ' 크기'}</b><small>고밀도 화면에선 작아져요</small></div>
            </div>
          </div>

          <div className={'md-pn' + (tab === 'type' ? ' on' : '')} data-p="type">
            <input className="md-tf" value={text} aria-label="미리보기 문장" autoComplete="off" onChange={e => setText(e.target.value)} />
            <div className="md-ty"><small>Roboto · 라틴 문자 기본 서체</small><span className="r" style={{ fontWeight: 400 }}>{val}</span><span className="r" style={{ fontWeight: 700 }}><em>{val}</em></span></div>
            <div className="md-ty"><small>Noto Sans · 한글 등 다국어 기본 서체</small><span className="n" style={{ fontWeight: 400 }}>{val}</span><span className="n" style={{ fontWeight: 700 }}><em>{val}</em></span></div>
            <p className="muted" style={{ margin: 0 }}>외부 폰트를 불러오지 않는 페이지라, 기기에 설치된 경우에만 실제 서체로 보여요.</p>
          </div>

          <div className={'md-pn' + (tab === 'bar' ? ' on' : '')} data-p="bar">
            <MdSeg value={center ? 'center' : 'left'} options={[['left', '좌측 정렬 (기본)'], ['center', '중앙 정렬']]}
              onChange={v => { setCenter(v === 'center'); setLog(v === 'center' ? <><b>중앙 정렬</b> — 일부 화면에서만 써요</> : <><b>좌측 정렬</b> — 머티리얼 상단 바의 기본이에요</>) }} />
            <div className={'md-ap' + (center ? ' center' : '')}>
              <div className="md-ap-bar">
                <button className="md-ib" data-rip="u" id="material-ap-back" aria-label="뒤로" onClick={() => back(<>상단 <b>←</b></>)}><Ic n="back" /></button>
                <span className="md-ab-t">{SCREENS[depth][0]}</span>
                <button className="md-ib" data-rip="u" aria-label="더보기"><Ic n="more" /></button>
              </div>
              <div className="md-ap-body" key={depth}>
                {SCREENS[depth][1].map(t => (
                  <div key={t} className="md-tt-row" style={{ cursor: 'pointer', padding: '3px 0' }}
                    onClick={() => { if (depth < 2) { const d = depth + 1; setDepth(d); setLog(<><b>{SCREENS[d][0]}</b>(으)로 들어왔어요 — 이제 뒤로 가보세요</>) } }}>
                    <span>{t}</span><span className="muted">›</span>
                  </div>
                ))}
              </div>
              <div className="md-sysnav">
                {sys === 'gesture' ? (
                  <button className="md-gbar" aria-label="제스처 핸들"
                    onPointerDown={e => {
                      const x0 = e.clientX
                      drag(null, ev => {
                        if (Math.abs(ev.clientX - x0) > 24) back(<><b>옆으로 스와이프</b> 제스처</>)
                        else setLog(<>핸들을 <b>옆으로 밀면</b> 뒤로 가기예요 (실제 기기는 화면 가장자리에서 밀어요)</>)
                      })
                    }}
                    onClick={e => { if (e.detail === 0) back(<><b>제스처</b></>) }} />
                ) : (
                  <>
                    <button data-rip="u" aria-label="뒤로" onClick={() => back(<>하단 <b>◀ 버튼</b></>)}>◀</button>
                    <button data-rip="u" aria-label="홈">●</button>
                    <button data-rip="u" aria-label="최근 앱">■</button>
                  </>
                )}
              </div>
            </div>
            <MdSeg value={sys} options={[['gesture', '제스처 내비게이션'], ['btn', '하단 버튼']]}
              onChange={v => { setSys(v); setLog(v === 'gesture' ? <><b>제스처 내비게이션</b> — 핸들을 옆으로 밀어 뒤로 가요</> : <><b>하단 버튼</b> — ◀ 를 눌러 뒤로 가요</>) }} />
          </div>
        </div>
      </Stage>
      <Info
        spec={[['단위', 'dp'], ['터치', '48×48dp'], ['서체', 'Roboto · Noto Sans']]}
        usage={[
          ['dp', '밀도 독립 픽셀이에요. 화면이 촘촘해도 손가락에 닿는 실제 크기는 같아요.'],
          ['뒤로', '시스템 내비게이션(제스처·하단 버튼)과 상단 ← 화살표 두 가지가 있어요. 상단 바 제목은 주로 왼쪽 정렬이에요.'],
        ]}
      />
    </Card>
  )
}
