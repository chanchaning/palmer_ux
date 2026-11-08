import { useEffect, useState, type ReactNode } from 'react'
import { DemoPane, PairCard } from '../../../components/Card'

/* ---------- 01 토글 vs 체크박스 ---------- */
const SWITCHES = [['push', '푸시 알림'], ['dark', '다크 모드'], ['auto', '자동 재생']] as const
type SwitchKey = (typeof SWITCHES)[number][0]
const TERMS = ['[필수] 이용약관 동의', '[필수] 개인정보 수집 동의', '[선택] 마케팅 수신 동의']

export function ToggleVsCheckbox() {
  const [sw, setSw] = useState<Record<SwitchKey, boolean>>({ push: true, dark: false, auto: false })
  const [tLog, setTLog] = useState<ReactNode>(<>켜고 끄면 <b>바로 적용</b>돼요.</>)
  const [cbs, setCbs] = useState([true, false, false])
  const [cbLog, setCbLog] = useState<ReactNode>(<>체크만으로는 <b>아직 반영 안 됨</b>.</>)
  const disabled = !(cbs[0] && cbs[1])

  const flip = (k: SwitchKey, name: string) => {
    const on = !sw[k]
    setSw(s => ({ ...s, [k]: on }))
    setTLog(<><b>{name} {on ? '켜짐' : '꺼짐'}</b> · 즉시 저장됨</>)
  }
  const check = (i: number, v: boolean) => {
    const next = cbs.map((c, j) => (j === i ? v : c))
    setCbs(next)
    setCbLog(!(next[0] && next[1]) ? <>필수 항목을 체크해야 <b>버튼이 활성화</b>돼요</> : <>이제 <b>버튼을 눌러야</b> 반영돼요</>)
  }

  return (
    <PairCard id="c-toggle" num="01" a="토글" b="체크박스" desc="누르는 순간 반영되면 토글, ‘저장’을 눌러야 반영되면 체크박스."
      diff={[
        ['반영 시점', '즉시 (상태 변경 = 실행)', '제출 버튼을 눌렀을 때'],
        ['의미', '켜짐 / 꺼짐 (On·Off)', '선택함 / 안 함 (Yes·No)'],
        ['주로 쓰는 곳', '설정 화면, 기능 활성화', '폼, 약관 동의, 목록 다중 선택'],
      ]}>
      <DemoPane label="토글" en="Toggle Switch" log={tLog}>
        <div className="stage">
          {SWITCHES.map(([k, name]) => (
            <div className="row" key={k}>
              <span className="setting">{name}</span>
              <button className="switch" role="switch" aria-checked={sw[k]} aria-label={name} onClick={() => flip(k, name)} />
            </div>
          ))}
        </div>
      </DemoPane>
      <DemoPane side="b" label="체크박스" en="Checkbox" log={cbLog}>
        <div className="stage">
          {TERMS.map((t, i) => (
            <label className="opt" key={t}><input type="checkbox" checked={cbs[i]} onChange={e => check(i, e.target.checked)} /> {t}</label>
          ))}
          <button className="btn sm orange" disabled={disabled}
            onClick={() => setCbLog(<>✓ <b>{cbs.filter(Boolean).length}개 항목 동의 완료</b> · 이 순간 반영됨</>)}>동의하고 계속</button>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 02 라디오 vs 체크박스 ---------- */
const SHIPS = [['일반 배송', '일반 배송 · 무료'], ['빠른 배송', '빠른 배송 · 3,000원'], ['새벽 배송', '새벽 배송 · 5,000원']] as const
const TOPPINGS = ['치즈', '베이컨', '할라피뇨']

export function RadioVsCheckbox() {
  const [ship, setShip] = useState<string>('일반 배송')
  const [tops, setTops] = useState<string[]>(['치즈'])
  const [touched, setTouched] = useState(false)
  const toggle = (v: string, on: boolean) => { setTops(t => TOPPINGS.filter(x => (x === v ? on : t.includes(x)))); setTouched(true) }

  return (
    <PairCard id="c-radio" num="02" a="라디오" b="체크박스" desc="하나만 고르면 라디오, 여러 개 고를 수 있으면 체크박스."
      diff={[
        ['선택 개수', '정확히 1개 (상호 배타)', '0개 ~ 여러 개'],
        ['선택 해제', '다른 항목을 골라야만 해제', '다시 누르면 해제'],
        ['모양', '동그라미 ○', '네모 □'],
      ]}>
      <DemoPane label="라디오" en="Radio Button" log={<>선택: <b>{ship}</b></>}>
        <div className="stage accent-a">
          <div className="muted">배송 방법 (하나만)</div>
          {SHIPS.map(([v, label]) => (
            <label className="opt" key={v}><input type="radio" name="ship" value={v} checked={ship === v} onChange={() => setShip(v)} /> {label}</label>
          ))}
        </div>
      </DemoPane>
      <DemoPane side="b" label="체크박스" en="Checkbox"
        log={!touched ? <>선택: <b>치즈</b></> : tops.length ? <>선택: <b>{tops.join(', ')}</b> ({tops.length}개)</> : <>선택: <b>없음</b> (0개도 가능)</>}>
        <div className="stage">
          <div className="muted">토핑 추가 (여러 개)</div>
          {TOPPINGS.map(v => (
            <label className="opt" key={v}><input type="checkbox" value={v} checked={tops.includes(v)} onChange={e => toggle(v, e.target.checked)} /> {v}</label>
          ))}
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 03 탭 vs 세그먼트 ---------- */
const TABS = ['상품정보', '리뷰 128', '문의']
const PANELS: ReactNode[] = [
  <><h4>오가닉 코튼 셔츠</h4>100% 유기농 면 · 레귤러 핏<br />세탁: 30℃ 이하 손세탁 권장<br />원산지: 대한민국</>,
  <><h4>★ 4.8 <span className="muted">(128)</span></h4>“핏이 예쁘고 두께감이 딱 좋아요.”<br />“두 번 세탁해도 줄지 않았어요.”</>,
  <><h4>상품 문의 3건</h4>Q. L사이즈 재입고 언제 되나요?<br /><span className="muted">→ 다음 주 화요일 입고 예정입니다.</span></>,
]
const SEG_DATA = [
  { label: ['09시', '18시'], v: [3, 5, 8, 6, 9, 12, 7, 4], unit: '오늘' },
  { label: ['월', '일'], v: [40, 52, 38, 61, 70, 88, 45], unit: '이번 주' },
  { label: ['1월', '12월'], v: [210, 180, 260, 240, 300, 280, 320, 350, 290, 310, 380, 420], unit: '올해' },
]

export function TabVsSegment() {
  const [tab, setTab] = useState(0)
  const [tabRun, setTabRun] = useState(0)
  const [seg, setSeg] = useState(0)
  // 막대는 0에서 자라나요 — 누를 때마다 새로 그리고(run), 두 프레임 뒤에 높이를 채워요(grown)
  const [run, setRun] = useState(0)
  const [grown, setGrown] = useState(-1)
  useEffect(() => {
    let r2 = 0
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setGrown(run)) })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [run])

  const d = SEG_DATA[seg], max = Math.max(...d.v)
  return (
    <PairCard id="c-tab" num="03" a="탭" b="세그먼트" desc="완전히 다른 내용으로 갈아끼우면 탭, 같은 내용을 다르게 보여주면 세그먼트."
      diff={[
        ['바뀌는 것', '보여주는 콘텐츠 영역 전체', '같은 콘텐츠의 보기 방식·필터'],
        ['위치', '콘텐츠 상단, 페이지 내비게이션', '콘텐츠 바로 위, 작은 버튼 그룹'],
        ['항목 수', '2 ~ 7개 (스크롤 가능)', '2 ~ 5개 (짧은 라벨)'],
      ]}>
      <DemoPane label="탭" en="Tabs" log={<>섹션마다 <b>내용 자체가 다름</b></>}>
        <div className="stage" style={{ justifyContent: 'flex-start' }}>
          <div className="tabs" role="tablist">
            {TABS.map((t, i) => (
              <button key={t} className="tab" role="tab" aria-selected={tab === i} onClick={() => { setTab(i); setTabRun(r => r + 1) }}>{t}</button>
            ))}
          </div>
          <div className="tabpanel" key={tabRun}>{PANELS[tab]}</div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="세그먼트" en="Segmented Control" log={<>같은 매출 데이터, <b>보기 단위만 바뀜</b></>}>
        <div className="stage" style={{ justifyContent: 'flex-start' }}>
          <div className="seg">
            <span className="seg-thumb" style={{ transform: `translateX(${seg * 100}%)` }} />
            {['일', '주', '월'].map((t, i) => (
              <button key={t} aria-pressed={seg === i} onClick={() => { setSeg(i); setRun(r => r + 1) }}>{t}</button>
            ))}
          </div>
          <div className="bars" key={run}>
            {d.v.map((v, k) => <span key={k} style={{ height: grown === run ? (v / max) * 100 + '%' : 0 }} />)}
          </div>
          <div className="bars-caption"><span>{d.label.join(' → ')}</span><span>{d.unit} 합계 {d.v.reduce((a, b) => a + b, 0).toLocaleString()}만원</span></div>
        </div>
      </DemoPane>
    </PairCard>
  )
}
