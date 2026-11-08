import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMotion } from '../../../lib/motion'
import { Diff3, Icon, Pane, PfCard, PfRange } from '../shared'

/* ================= 07 온/오프 스위치 ================= */
const SW = ['푸시 알림', '소리', '방해 금지']

function SwitchPane({ s }: { s: 'm' | 'h' }) {
  const [on, setOn] = useState([true, false, false])
  const [log, setLog] = useState<ReactNode>(s === 'm' ? <>켜지면 <b>핸들이 커지고 ✓</b>가 보여요.</> : <>누르는 동안 <b>핸들이 가로로 늘어나요</b>.</>)
  const toggle = (i: number) => {
    const v = !on[i]
    setOn(o => o.map((x, j) => (j === i ? v : x)))
    setLog(<><b>{SW[i]} {v ? '켜짐' : '꺼짐'}</b> · 바로 적용돼요.</>)
  }
  if (s === 'm') return (
    <Pane side="m" label="Switch" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-mbar sm"><b>알림 설정</b></div>
        {SW.map((n, i) => <div className="pf-mli" key={n}>{n}<button className="pf-msw" role="switch" aria-checked={on[i]} data-n={n} onClick={() => toggle(i)}><span className="k"><Icon k="check" /></span></button></div>)}
      </div>
    </Pane>
  )
  return (
    <Pane side="h" label="Toggle" en="HIG · Switch 스타일" log={log}>
      <div className="pf-scr grp">
        <div className="pf-hbar"><span /><b className="pf-htitle">알림 설정</b><span /></div>
        <div className="pf-grp">
          {SW.map((n, i) => <div className="pf-hli" key={n}>{n}<button className="pf-hsw" role="switch" aria-checked={on[i]} data-n={n} onClick={() => toggle(i)} /></div>)}
        </div>
      </div>
    </Pane>
  )
}

export function Switch() {
  return (
    <PfCard id="switch" num="07" title="온/오프 스위치" en="On/Off" desc="누르는 즉시 켜고 끄는 스위치예요. 꾹 누르고 있어 보세요."
      diff={Diff3(
        ['Switch', 'Toggle (iOS에선 스위치 모양)'],
        ['꺼짐은 테두리 트랙 + 작은 핸들, 켜짐은 핸들이 커지고 아이콘을 넣을 수 있어요', '테두리 없는 캡슐 + 흰 핸들. 켜짐 기본색은 초록이에요 (이 데모는 주황)'],
        ['누르면 핸들이 더 커지고 상태 레이어가 퍼져요', '누르는 동안 핸들이 가로로 늘어나요'],
      )}>
      <div className="demos"><SwitchPane s="m" /><SwitchPane s="h" /></div>
    </PfCard>
  )
}

/* ================= 08 단일 항목 선택 ================= */
const SORT = ['최신순', '인기순', '가격 낮은순', '가격 높은순']

function RadioPane({ s }: { s: 'm' | 'h' }) {
  const [sel, setSel] = useState(0)
  const [log, setLog] = useState<ReactNode>(<>선택: <b>최신순</b></>)
  const pick = (i: number) => { setSel(i); setLog(<>선택: <b>{SORT[i]}</b>{s === 'h' ? ' — ✓가 이 행으로 옮겨왔어요' : ''}</>) }
  if (s === 'm') return (
    <Pane side="m" label="Radio Button" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-mbar sm"><b>정렬 기준</b></div>
        <div role="radiogroup" data-group>
          {SORT.map((t, i) => <button key={t} className="pf-mli pf-rp" role="radio" aria-checked={i === sel} onClick={() => pick(i)}><span className="pf-mradio" />{t}</button>)}
        </div>
      </div>
    </Pane>
  )
  return (
    <Pane side="h" label="목록 체크마크" en="HIG · Lists and tables" extra={<span className="pf-none">별도 구분 없음</span>} log={log}>
      <div className="pf-scr grp">
        <div className="pf-hbar"><span /><b className="pf-htitle">정렬 기준</b><span /></div>
        <div className="pf-grp" role="radiogroup" data-group>
          {SORT.map((t, i) => <button key={t} className="pf-hli" role="radio" aria-checked={i === sel} onClick={() => pick(i)}>{t}<span className="pf-hcheck"><Icon k="check" /></span></button>)}
        </div>
      </div>
    </Pane>
  )
}

export function Radio() {
  return (
    <PfCard id="radio" num="08" title="단일 항목 선택" en="Single Choice" desc="여러 선택지 중 딱 하나만 고르게 해요."
      diff={Diff3(
        ['Radio Button', '별도 컴포넌트 없음 — iOS는 목록 행의 체크마크로 표시'],
        ['왼쪽 동그라미, 선택하면 안쪽에 점', '오른쪽 끝 ✓ 체크마크 (틴트 색), 선택 안 된 행은 비어 있어요'],
        ['다른 항목을 골라야만 선택이 옮겨가요', '행 전체를 탭하면 체크마크가 그 행으로 옮겨가요'],
      )}>
      <div className="demos"><RadioPane s="m" /><RadioPane s="h" /></div>
    </PfCard>
  )
}

/* ================= 09 다중 항목 선택 ================= */
const KIDS = ['댓글', '좋아요', '새 팔로워']
const ROWS = ['바다 사진', '산책 사진', '카페 사진']

function CheckM() {
  const [kids, setKids] = useState([true, false, false])
  const [log, setLog] = useState<ReactNode>(<>일부만 고르면 부모가 <b>— (일부 선택)</b>이 돼요.</>)
  const n = kids.filter(Boolean).length
  const all = n === 0 ? 'false' : n === kids.length ? 'true' : 'mixed'
  const sync = (k: boolean[]) => {
    setKids(k)
    const c = k.filter(Boolean).length
    setLog(c === 0 ? <>하나도 안 골랐어요 — 부모도 <b>빈 칸</b>.</> : c === k.length ? <>전부 골랐어요 — 부모도 <b>✓</b>.</> : <>{c}개 선택 — 부모는 <b>— (일부 선택)</b>.</>)
  }
  return (
    <Pane side="m" label="Checkbox" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-mbar sm"><b>알림 받을 항목</b></div>
        <button className="pf-mli pf-rp" role="checkbox" aria-checked={all} data-all onClick={() => sync(kids.map(() => all !== 'true'))}>
          <span className="pf-mcb"><Icon k="check" /></span><b style={{ fontWeight: 600 }}>전체 선택</b>
        </button>
        <div style={{ paddingLeft: 24 }} data-kids>
          {KIDS.map((t, i) => <button key={t} className="pf-mli pf-rp" role="checkbox" aria-checked={kids[i]} onClick={() => sync(kids.map((x, j) => (j === i ? !x : x)))}><span className="pf-mcb"><Icon k="check" /></span>{t}</button>)}
        </div>
      </div>
    </Pane>
  )
}

function CheckH() {
  const [edit, setEdit] = useState(false)
  const [rows, setRows] = useState([false, false, false])
  const [log, setLog] = useState<ReactNode>(<><b>선택</b>을 눌러 편집 모드로 들어가요.</>)
  const n = rows.filter(Boolean).length
  return (
    <Pane side="h" label="다중 선택 리스트" en="HIG · Toggle(체크박스 스타일)은 macOS" log={log}>
      <div className={'pf-scr grp' + (edit ? ' edit' : '')} data-wrap>
        <div className="pf-hbar"><span /><b className="pf-htitle">사진</b>
          <button className="pf-tint" data-edit onClick={() => {
            const on = !edit
            setEdit(on)
            if (!on) setRows([false, false, false])
            setLog(on ? <>편집 모드 — 행을 눌러 <b>여러 개</b> 골라요.</> : <>편집 모드를 <b>끝냈어요</b>.</>)
          }}>{edit ? '완료' : '선택'}</button>
        </div>
        <div className="pf-grp" data-list>
          {ROWS.map((t, i) => <button key={t} className="pf-hli" role="checkbox" aria-checked={rows[i]} onClick={() => {
            if (!edit) { setLog(<>평소엔 행을 누르면 <b>열려요</b>. 먼저 <b>선택</b>을 눌러요.</>); return }
            const next = rows.map((x, j) => (j === i ? !x : x))
            setRows(next)
            setLog(<><b>{next.filter(Boolean).length}개</b> 골랐어요 — 아래 막대에서 한 번에 처리해요.</>)
          }}><span className="pf-hcirc"><Icon k="check" /></span>{t}</button>)}
        </div>
        <div className="pf-hfoot"><span data-cnt>{n}개 선택됨</span>
          <button className="pf-tint pf-red" data-del onClick={() => {
            setLog(n ? <><b>{n}개</b>를 한 번에 삭제했어요 (데모).</> : <>먼저 항목을 골라요.</>)
            setRows([false, false, false])
          }}>삭제</button>
        </div>
      </div>
    </Pane>
  )
}

export function Check() {
  return (
    <PfCard id="check" num="09" title="다중 항목 선택" en="Multiple Choice" desc="여러 개를 동시에 고르게 해요."
      diff={Diff3(
        ['Checkbox (‘일부 선택’ 상태 포함)', '편집 모드 다중 선택 리스트 / macOS의 Toggle(체크박스 스타일)'],
        ['모서리가 살짝 둥근 네모, ✓ 또는 —', '편집 모드에서 왼쪽에 동그란 선택 표시가 나타나고 행이 오른쪽으로 밀려요'],
        ['항목마다 바로 켜고 꺼요', '‘선택’으로 모드를 바꾼 뒤 여러 행을 고르고 한 번에 처리해요'],
      )}>
      <div className="demos"><CheckM /><CheckH /></div>
    </PfCard>
  )
}

/* ================= 10 로딩 중 빙글빙글 ================= */
function SpinM() {
  const [v, setV] = useState(40)
  const [stop, setStop] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>원호가 <b>늘었다 줄었다</b> 하며 돌아요. 진행률도 표시해요.</>)
  return (
    <Pane side="m" label="Circular Progress Indicator" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-center">
          <div className="pf-progs">
            <figure><svg className={'pf-mcirc ind' + (stop ? ' stop' : '')} data-ind viewBox="0 0 48 48"><circle className="tr" cx="24" cy="24" r="20" /><circle className="ar" cx="24" cy="24" r="20" /></svg>불확정</figure>
            <figure><svg className="pf-mcirc det" data-det viewBox="0 0 48 48"><circle className="tr" cx="24" cy="24" r="20" /><circle className="ar" cx="24" cy="24" r="20" style={{ strokeDasharray: ((v / 100) * 125.7).toFixed(1) + ' 126' }} /></svg><span data-pct>{v}%</span></figure>
          </div>
          <PfRange value={v} min={0} max={100} label="진행률" data-r="" style={{ width: '80%' }}
            onChange={x => { setV(x); setLog(<>확정 모드 — 원이 <b>{x}%</b>만큼 채워졌어요.</>) }} />
          <button className="pf-mbtn tonal pf-rp" data-stop onClick={() => {
            const s = !stop
            setStop(s)
            setLog(s ? <>불확정 원호를 <b>멈췄어요</b>.</> : <>원호가 <b>늘었다 줄었다</b> 하며 돌아요.</>)
          }}>{stop ? '재생' : '정지'}</button>
        </div>
      </div>
    </Pane>
  )
}

function SpinH() {
  const [off, setOff] = useState(false)
  const [lg, setLg] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>살이 <b>차례로 밝아지는</b> 바퀴. 진행률은 없어요.</>)
  return (
    <Pane side="h" label="Activity Indicator" en="HIG" log={log}>
      <div className="pf-scr grp">
        <div className="pf-center">
          <div style={{ height: 48, display: 'grid', placeItems: 'center' }}>
            <span className={'pf-act' + (lg ? ' lg' : '') + (off ? ' off' : '')} data-act>
              {Array.from({ length: 8 }, (_, k) => <i key={k} style={{ transform: 'rotate(' + k * 45 + 'deg)', animationDelay: 'calc(' + (-(1 - k / 8)).toFixed(3) + 's * var(--slow))' }} />)}
            </span>
          </div>
          <span className="muted" data-st>{off ? '완료' : '불러오는 중…'}</span>
          <div className="pf-row">
            <button className="pf-hbtn gray" data-size onClick={() => {
              const l = !lg
              setLg(l)
              setLog(<>크기는 <b>{l ? '큰(Large)' : '중간(Medium)'}</b> 두 가지예요.</>)
            }}>{lg ? '중간' : '크게'}</button>
            <button className="pf-hbtn" data-stop onClick={() => {
              const o = !off
              setOff(o)
              setLog(o ? <>멈추면 <b>숨겨요</b> (hidesWhenStopped 기본값).</> : <>살이 <b>차례로 밝아지며</b> 돌아요.</>)
            }}>{off ? '시작' : '정지'}</button>
          </div>
        </div>
      </div>
    </Pane>
  )
}

export function Spin() {
  return (
    <PfCard id="spin" num="10" title="로딩 중 빙글빙글" en="Spinner" desc="얼마나 걸릴지 모를 때 돌아가는 표시예요."
      diff={Diff3(
        ['Circular Progress Indicator (확정 · 불확정)', 'Activity Indicator'],
        ['굵은 원호가 늘었다 줄었다 하며 회전', '가는 살들이 차례로 밝아지는 바퀴'],
        ['진행률(%)도 원으로 표시할 수 있어요', '진행률은 없어요(진행률은 Progress View). 멈추면 숨기는 게 기본이에요'],
      )}>
      <div className="demos"><SpinM /><SpinH /></div>
    </PfCard>
  )
}

/* ================= 11 진행률 막대 ================= */
function LinearPane({ s }: { s: 'm' | 'h' }) {
  const { D } = useMotion()
  const [p, setP] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<ReactNode>(s === 'm' ? <>진행 부분과 트랙 사이 <b>틈</b>, 끝에 <b>점</b>이 있어요.</> : <>얇은 트랙 위로 <b>틴트 색</b>이 차올라요.</>)
  const timer = useRef(0), pr = useRef(0)
  useEffect(() => () => clearInterval(timer.current), [])
  const go = () => {
    clearInterval(timer.current)
    pr.current = 0; setP(0)
    setBusy(true)
    setLog(s === 'm' ? <>진행 부분 끝에 <b>틈</b>이 있고, 트랙 끝 <b>점</b>이 목표 지점이에요.</> : <>틴트 막대가 <b>차올라요</b>.</>)
    timer.current = window.setInterval(() => {
      const nx = Math.min(100, pr.current + 4 + Math.random() * 8)
      pr.current = nx; setP(nx)
      if (nx >= 100) { clearInterval(timer.current); setBusy(false); setDone(true); setLog(<><b>완료</b> — 24MB를 모두 받았어요.</>) }
    }, D(220))
  }
  const label = busy ? '받는 중…' : done ? '다시 받기' : '다운로드'
  const val = <span data-v>{Math.round((24 * p) / 100)} / 24MB</span>
  if (s === 'm') return (
    <Pane side="m" label="Linear Progress Indicator" en="Material" log={log}>
      <div className="pf-scr">
        <div className="pf-center">
          <div className="pf-dl"><div className="row1"><b>사진 백업</b>{val}</div>
            <div className="pf-mlin" data-bar><span className="a" style={{ width: 'calc((100% - 8px) * ' + p / 100 + ')', display: p ? undefined : 'none' }} /><span className="t" /></div>
          </div>
          <div className="pf-dl"><div className="row1"><b>서버 확인 중</b><span>불확정</span></div><div className="pf-mlin ind"><span className="a" /><span className="t" /></div></div>
          <button className="pf-mbtn pf-rp" data-go disabled={busy} onClick={go}>{label}</button>
        </div>
      </div>
    </Pane>
  )
  return (
    <Pane side="h" label="Progress View" en="HIG" log={log}>
      <div className="pf-scr grp">
        <div className="pf-center">
          <div className="pf-dl"><div className="row1"><b>사진 백업</b>{val}</div><div className="pf-hpv"><span data-bar style={{ width: p + '%' }} /></div></div>
          <button className="pf-hbtn" data-go disabled={busy} onClick={go}>{label}</button>
        </div>
      </div>
    </Pane>
  )
}

export function Linear() {
  return (
    <PfCard id="linear" num="11" title="진행률 막대" en="Progress Bar" desc="얼마나 진행됐는지 가로 막대로 보여줘요."
      diff={Diff3(
        ['Linear Progress Indicator (확정 · 불확정)', 'Progress View (막대 스타일)'],
        ['4dp 막대, 진행 부분과 트랙 사이 틈 + 끝 점 (M3 최신 사양)', '얇은 회색 트랙 위 틴트 색 막대, 틈 없이 이어져요'],
        ['값을 모를 땐 막대가 좌우로 흘러가는 불확정 모드', '막대는 진행률 표시 위주, 값을 모르면 Activity Indicator를 써요'],
      )}>
      <div className="demos"><LinearPane s="m" /><LinearPane s="h" /></div>
    </PfCard>
  )
}
