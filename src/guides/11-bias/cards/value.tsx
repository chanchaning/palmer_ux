import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { EASE, useMotion } from '../../../lib/motion'
import { ABSeg, DpLink, View, abBtn, useAB, type AB } from '../shared'

/* ---------- 01 앵커링 ---------- */
const PLAN_MSG: Record<AB, Record<string, ReactNode>> = {
  a: {
    베이직: <><b>베이직</b> 선택 — 비교 대상이 둘뿐이라 <b>싼 쪽</b>이 끌리기 쉬워요</>,
    프로: <><b>프로</b> 선택 — 9,900원 옆에서는 <b>두 배</b>로 비싸 보여요</>,
  },
  b: {
    팀: <><b>팀</b> 선택 — 기준점 역할의 상위 플랜도 실제로 쓸모 있어야 해요</>,
    프로: <>49,900원을 먼저 본 뒤라 <b>19,900원이 합리적</b>으로 느껴져요</>,
    베이직: <><b>베이직</b> 선택 — 기준점이 있어도 필요에 맞으면 충분해요</>,
  },
}
const PLANS = {
  팀: { sub: '기기 20대 · 관리자 콘솔', pr: '49,900원' },
  프로: { sub: '기기 5대 · 오프라인 저장', pr: '19,900원' },
  베이직: { sub: '기기 1대 · 광고 없음', pr: '9,900원' },
} as const
type PlanName = keyof typeof PLANS

export function Anchor() {
  const [sel, setSel] = useState<PlanName | null>(null)
  const [log, setLog] = useState<ReactNode>(<>두 요금제뿐이에요. 하나를 <b>골라보세요</b></>)
  const ab = useAB(v => {
    setSel(null)
    setLog(v === 'a' ? <>두 요금제뿐이에요. 하나를 <b>골라보세요</b></> : <>맨 위 <b>49,900원</b>이 기준점이 돼요. 다시 골라보세요</>)
  })
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)

  const plan = (name: PlanName, anchor = false, badge = false) => (
    <button key={name} className={'bias-plan' + (anchor ? ' is-anchor' : '')} data-p={name} aria-pressed={sel === name}
      onClick={() => { setSel(name); setLog(PLAN_MSG[ab.v][name]) }}>
      <span className="nm"><b>{name}{badge && <> <span className="badge blue">가장 인기</span></>}</b><small>{PLANS[name].sub}</small></span>
      <span className="pr">{PLANS[name].pr}<small> /월</small></span>
    </button>
  )

  const demo = useDemo({
    reset() { ab.set('a', true) },
    async play(c) {
      await c.press(box.current, box.current?.querySelector<HTMLElement>('[data-v="a"] [data-p="베이직"]') ?? null); await c.sleep(1300)
      await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(900)
      await c.press(box.current, box.current?.querySelector<HTMLElement>('[data-v="b"] [data-p="프로"]') ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="bias-anchor" num="01" title="앵커링" en="Anchoring" desc="처음 본 숫자가 ‘닻’이 돼서, 뒤에 보는 가격을 그 기준으로 판단해요." demo={demo}>
      <Stage log={log} logId="bias-anchor-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box" id="bias-anchor-box" data-ab={ab.v} ref={box}>
          <View k="a" ab={ab}>
            <div className="bias-cap">요금제를 골라 주세요</div>
            {plan('베이직')}{plan('프로')}
          </View>
          <View k="b" ab={ab}>
            <div className="bias-cap">요금제를 골라 주세요</div>
            {plan('팀', true)}{plan('프로', false, true)}{plan('베이직')}
          </View>
        </div>
      </Stage>
      <Info
        spec={[['기준점', '처음 본 숫자'], ['효과', '상대 비교'], ['쓰임', '가격표·할인']]}
        usage={[
          ['활용 팁', '실제로 고를 만한 상위 플랜을 먼저 보여 주면 가치 비교가 쉬워져요'],
          ['주의', <>판 적 없는 ‘정가’를 지어내 할인처럼 보이게 하면 기만이에요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 손실 회피 ---------- */
const LOSS_MSG: Record<AB, Record<'go' | 'later', ReactNode>> = {
  a: { go: <>적립금 사용 — <b>차분하게</b> 혜택을 확인해요</>, later: <>나중에 — 압박이 없어 <b>미뤄도 괜찮다</b>고 느껴요</> },
  b: { go: <>적립금 지키기 — 같은 금액인데 <b>더 서두르게</b> 돼요</>, later: <>나중에 — 누르기가 <b>왠지 불안</b>해요. 손실이 더 크게 느껴지거든요</> },
}

export function Loss() {
  const m = useMotion()
  const gainEm = useRef<HTMLElement>(null)
  const painEm = useRef<HTMLElement>(null)
  const [log, setLog] = useState<ReactNode>(<><b>얻는 이야기</b>로 안내해요. 버튼을 눌러보세요</>)
  const ab = useAB(v => {
    const em = v === 'a' ? gainEm.current : painEm.current
    if (em) { m.clearA(em); m.A(em, [{ width: '0%' }, { width: v === 'a' ? '42%' : '84%' }], 500, EASE.out) }
    setLog(v === 'a' ? <><b>얻는 이야기</b>로 안내해요. 버튼을 눌러보세요</> : <>같은 3,200P를 <b>잃는 이야기</b>로 바꿨어요</>)
  })
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const btns = (danger: boolean, label: string) => (
    <div className="bias-btns">
      <button className="btn ghost sm" data-act="later" onClick={() => setLog(LOSS_MSG[ab.v].later)}>나중에</button>
      <button className={'btn sm' + (danger ? ' danger' : '')} data-act="go" onClick={() => setLog(LOSS_MSG[ab.v].go)}>{label}</button>
    </div>
  )

  const demo = useDemo({
    reset() { ab.set('a', true) },
    async play(c) {
      await c.sleep(500); await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(1300)
      await c.press(box.current, box.current?.querySelector<HTMLElement>('[data-v="b"] [data-act="go"]') ?? null); await c.sleep(400)
    },
  })

  return (
    <Card id="bias-loss" num="02" title="손실 회피" en="Loss Aversion" desc="같은 크기라도 얻는 기쁨보다 잃는 아픔을 약 두 배 크게 느껴요." demo={demo}>
      <Stage log={log} logId="bias-loss-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box" id="bias-loss-box" data-ab={ab.v} ref={box}>
          <View k="a" ab={ab}>
            <div className="bias-banner"><span className="ico">🎁</span><div><b>적립금 3,200P를 쓸 수 있어요</b><p>다음 주문에서 바로 할인받을 수 있어요.</p></div></div>
            {btns(false, '적립금 쓰러 가기')}
          </View>
          <View k="b" ab={ab}>
            <div className="bias-banner warn"><span className="ico">⏳</span><div><b>놓치지 마세요! 3,200P가 사라져요</b><p>11월 15일에 소멸 예정이에요. 7일 남았어요.</p></div></div>
            {btns(true, '적립금 지키기')}
          </View>
          <div className="bias-meter">
            <div className="muted">같은 3,200P의 체감 무게</div>
            <div className={'bias-mrow gain' + (ab.v === 'b' ? ' dim' : '')}><span>얻는 기쁨</span><i><em ref={gainEm} /></i><b>×1</b></div>
            <div className={'bias-mrow pain' + (ab.v === 'a' ? ' dim' : '')}><span>잃는 아픔</span><i><em ref={painEm} /></i><b>×2</b></div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['체감', '손실 ≈ 이득 ×2'], ['문구', '잃는 것 강조'], ['쓰임', '만료·소멸 안내']]}
        usage={[
          ['활용 팁', '실제로 사라질 혜택(소멸 포인트, 저장 안 된 작업)을 미리 알려 손해를 막아 주세요'],
          ['주의', <>없는 손실을 지어내거나 해지할 때마다 겁주면 조종이에요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 기본값 효과 ---------- */
type Plan = '월간' | '연간'
interface Form { plan: Plan | null; remind: boolean }
const A_INIT: Form = { plan: null, remind: false }
const B_INIT: Form = { plan: '연간', remind: true }

export function Default() {
  const [fa, setFa] = useState<Form>(A_INIT)
  const [fb, setFb] = useState<Form>(B_INIT)
  const [log, setLog] = useState<ReactNode>(<>아무것도 골라져 있지 않아요. <b>직접 선택</b>해야 해요</>)
  const ab = useAB(v => setLog(v === 'a' ? <>아무것도 골라져 있지 않아요. <b>직접 선택</b>해야 해요</> : <><b>연간 + 결제 알림</b>이 미리 골라져 있어요</>))
  const box = useRef<HTMLDivElement>(null)
  const seg = useRef<HTMLDivElement>(null)
  const nextB = useRef<HTMLButtonElement>(null)

  const changeA = (f: Form) => { setFa(f); if (f.plan) setLog(<><b>{f.plan}</b> 선택 — 한 번 더 따져보고 골랐어요</>) }
  const changeB = (f: Form) => { setFb(f); setLog(<>기본값을 <b>바꾸는 중</b>이에요 — 이렇게 바꾸는 사람은 소수예요</>) }

  const form = (k: AB, f: Form, change: (f: Form) => void) => (
    <>
      <div className="bias-cap">결제 주기를 선택해 주세요</div>
      <label className="opt"><input type="radio" name={'bias-def-' + k} value="월간" checked={f.plan === '월간'} onChange={() => change({ ...f, plan: '월간' })} /><span>월간 결제<small>월 12,000원</small></span></label>
      <label className="opt"><input type="radio" name={'bias-def-' + k} value="연간" checked={f.plan === '연간'} onChange={() => change({ ...f, plan: '연간' })} />
        <span>연간 결제{k === 'b' && <> <span className="badge blue">추천</span></>}<small>월 10,000원 · 2개월 무료</small></span></label>
      <label className="opt plain"><input type="checkbox" data-remind checked={f.remind} onChange={e => change({ ...f, remind: e.target.checked })} /><span>결제 3일 전에 알림 받기</span></label>
    </>
  )

  const demo = useDemo({
    reset() { setFa(A_INIT); setFb(B_INIT); ab.set('a', true) },
    async play(c) {
      await c.sleep(500); await c.press(seg.current?.parentElement ?? null, abBtn(seg.current, 'b')); await c.sleep(1100)
      await c.press(box.current, nextB.current); await c.sleep(400)
    },
  })

  return (
    <Card id="bias-default" num="03" title="기본값 효과" en="Default Effect" desc="미리 골라둔 선택지는 대부분 그대로 받아들여요. 바꾸는 데도 노력이 들거든요." demo={demo}>
      <Stage log={log} logId="bias-default-log">
        <ABSeg ab={ab} ref={seg} />
        <div className="box left bias-box bias-def accent-a" id="bias-default-box" data-ab={ab.v} ref={box}>
          <View k="a" ab={ab}>
            {form('a', fa, changeA)}
            <button className="btn sm bias-cta" data-next disabled={!fa.plan}
              onClick={() => setLog(<><b>{fa.plan}</b>{fa.remind ? ' · 알림 켬' : <> · 알림 <b>놓침</b></>} — 알림은 직접 켜야 해서 빠뜨리기 쉬워요</>)}>계속</button>
          </View>
          <View k="b" ab={ab}>
            {form('b', fb, changeB)}
            <button className="btn sm bias-cta" data-next ref={nextB} onClick={() => {
              const same = fb.plan === B_INIT.plan && fb.remind === B_INIT.remind
              setLog(same ? <><b>기본값 그대로</b> 계속 — 대부분 이렇게 진행해요</> : <>기본값을 <b>바꿔서</b> 계속 — {fb.plan}{fb.remind ? ' · 알림 켬' : ' · 알림 끔'}</>)
            }}>계속</button>
          </View>
        </div>
      </Stage>
      <Info
        spec={[['기본값', '미리 선택'], ['효과', '현상 유지'], ['쓰임', '플랜·설정']]}
        usage={[
          ['활용 팁', '대부분에게 이로운 선택(결제 알림, 보안 설정)을 기본값으로 두세요'],
          ['주의', <>유료 옵션·마케팅 동의를 몰래 켜 두면 다크 패턴이에요 · <DpLink /></>],
        ]}
      />
    </Card>
  )
}
