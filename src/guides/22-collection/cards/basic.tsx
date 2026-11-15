import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, Seg } from '../../../components/ui'
import { MENU, won } from '../data'
import { Ctrl, Thumb } from '../shared'

const q = <T extends HTMLElement>(root: HTMLElement | null, sel: string) => root?.querySelector<T>(sel) ?? null

/* ---------- 01 리스트 ---------- */
type Density = 'dense' | 'basic' | 'rich'
const DENSITY: Record<Density, [string, number]> = { dense: ['촘촘', 8], basic: ['기본', 6], rich: ['자세히', 4] }
const LIST_LOG = <>줄 높이를 바꿔 <b>한 화면에 몇 개</b> 보이는지 비교해 보세요</>

export function ListView() {
  const [d, setD] = useState<Density>('basic')
  const [sel, setSel] = useState<string | null>(null)
  const [log, setLog] = useState<ReactNode>(LIST_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  const pick = (v: Density) => {
    setD(v)
    const [, n] = DENSITY[v]
    setLog(v === 'dense' ? <>촘촘 — 한 화면에 <b>{n}개 넘게</b>, 대신 글자만 있어 훑기용</>
      : v === 'rich' ? <>자세히 — 설명까지 보여 <b>{n}개 정도</b>만 보여요</>
        : <>기본 — 사진 · 이름 · 가격 한 줄씩, <b>{n}개 남짓</b></>)
  }
  const open = (id: string) => {
    const it = MENU.find(m => m.id === id)!
    setSel(id)
    setLog(<>‘<b>{it.name}</b>’ 줄을 눌러 상세로 이동해요</>)
  }
  const demo = useDemo({
    reset() { setD('basic'); setSel(null); setLog(LIST_LOG); const b = q(dev.current, '.cl-body'); if (b) b.scrollTop = 0 },
    async play(c) {
      await c.press(stage.current, q(stage.current, '[data-v="dense"]')); await c.sleep(1300)
      await c.press(stage.current, q(stage.current, '[data-v="rich"]')); await c.sleep(1300)
      await c.press(stage.current, q(stage.current, '[data-v="basic"]')); await c.sleep(900)
      await c.press(dev.current, q(dev.current, '[data-id="latte"]')); await c.sleep(600)
    },
  })

  return (
    <Card id="col-list" num="01" title="리스트" en="List" demo={demo}
      desc="한 줄에 하나씩 위에서 아래로 쌓아요. 이름 · 가격처럼 같은 칸을 내려가며 비교하기 가장 쉬워요.">
      <Stage log={log} logId="col-list-log">
        <div className="cl-stage" ref={stage}>
          <Ctrl label="줄 높이"><Seg value={d} onChange={pick} options={(Object.keys(DENSITY) as Density[]).map(k => [k, DENSITY[k][0]] as const)} /></Ctrl>
        </div>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">메뉴<span className="sp" /><span className="muted">{MENU.length}개</span></div>
            <ul className={'cl-body cl-list ' + d}>
              {MENU.map(m => (
                <li key={m.id}>
                  <button type="button" data-id={m.id} className={sel === m.id ? 'on' : ''} onClick={() => open(m.id)}>
                    {d !== 'dense' && <Thumb item={m} />}
                    <span className="grow">
                      <b>{m.name}</b>
                      {d !== 'dense' && <small>{m.cat} · {m.kcal}kcal</small>}
                      {d === 'rich' && <small className="cl-desc">{m.desc}</small>}
                    </span>
                    <span className="cl-price">{won(m.price)}</span>
                    <span className="cl-chev" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['줄 높이', '48–72px'], ['비교', '위→아래 한 방향'], ['정렬 칸', '오른쪽에 숫자']]}
        usage={[
          ['언제', '설정, 연락처, 주문 내역처럼 글자 정보가 중심이고 순서대로 훑어볼 때'],
          ['주의', '줄마다 칸 위치가 달라지면 비교가 안 돼요 — 가격은 늘 같은 자리(오른쪽)에 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 그리드 ---------- */
const GRID_LOG = <>열 수를 바꿔 <b>사진 크기와 개수</b>를 비교해 보세요</>

export function GridView() {
  const [cols, setCols] = useState(3)
  const [sel, setSel] = useState<string | null>(null)
  const [log, setLog] = useState<ReactNode>(GRID_LOG)
  const dev = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  const pick = (n: number) => {
    setCols(n)
    setLog(n === 2 ? <>2열 — 사진이 커서 <b>무엇인지 알아보기</b> 쉬워요</>
      : n === 3 ? <>3열 — 사진 앱 기본값, <b>크기와 개수의 균형</b></>
        : <>4열 — 한 번에 많이 보지만 <b>이름은 숨겨야</b> 해요</>)
  }
  const open = (id: string) => {
    setSel(id)
    setLog(<>‘<b>{MENU.find(m => m.id === id)!.name}</b>’ 선택 — 그리드는 <b>사진으로 고를 때</b> 좋아요</>)
  }
  const demo = useDemo({
    reset() { setCols(3); setSel(null); setLog(GRID_LOG) },
    async play(c) {
      await c.press(stage.current, q(stage.current, '[data-v="4"]')); await c.sleep(1300)
      await c.press(stage.current, q(stage.current, '[data-v="2"]')); await c.sleep(1300)
      await c.press(dev.current, q(dev.current, '[data-id="vanilla"]')); await c.sleep(900)
      await c.press(stage.current, q(stage.current, '[data-v="3"]')); await c.sleep(400)
    },
  })

  return (
    <Card id="col-grid" num="02" title="그리드" en="Grid" demo={demo}
      desc="같은 크기 칸을 가로세로로 바둑판처럼 채워요. 글보다 사진으로 알아보는 것에 맞아요.">
      <Stage log={log} logId="col-grid-log">
        <div className="cl-stage" ref={stage}>
          <Ctrl label="열 수"><Seg value={cols} onChange={pick} options={[[2, '2열'], [3, '3열'], [4, '4열']]} /></Ctrl>
        </div>
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">메뉴 사진<span className="sp" /><span className="muted">{MENU.length}개</span></div>
            <div className="cl-body">
              <ul className="cl-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} data-cols={cols}>
                {MENU.map(m => (
                  <li key={m.id}>
                    <button type="button" data-id={m.id} aria-label={m.name} aria-pressed={sel === m.id} onClick={() => open(m.id)}>
                      <Thumb item={m} />
                      {cols < 4 && <span className="cl-gname">{m.name}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['열', '폰 2–4 · 넓으면 더'], ['칸', '같은 비율'], ['간격', '2–8px']]}
        usage={[
          ['언제', '사진첩, 상품 목록, 앱 아이콘처럼 그림만 보고도 무엇인지 알 수 있을 때'],
          ['주의', '열이 많을수록 글자가 들어갈 자리가 없어요 — 이름이 꼭 필요하면 열을 줄이세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 03 카드 ---------- */
const CARD_LOG = <>카드마다 있는 <b>담기 · 찜</b> 버튼을 눌러 보세요</>
const CARD_ITEMS = MENU.slice(0, 6)

export function CardsView() {
  const [cart, setCart] = useState<string[]>([])
  const [liked, setLiked] = useState<string[]>([])
  const [log, setLog] = useState<ReactNode>(CARD_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const add = (id: string) => {
    const it = MENU.find(m => m.id === id)!
    setCart(c => [...c, id])
    setLog(<>‘{it.name}’ 담기 — 카드 안에서 <b>바로 행동</b>까지 끝나요 (장바구니 {cart.length + 1})</>)
  }
  const like = (id: string) => {
    const on = !liked.includes(id)
    setLiked(l => on ? [...l, id] : l.filter(x => x !== id))
    setLog(on ? <>찜 — 카드는 <b>하나하나가 독립된 물건</b>이라 버튼을 붙이기 좋아요</> : <>찜 해제</>)
  }
  const demo = useDemo({
    reset() { setCart([]); setLiked([]); setLog(CARD_LOG); const b = q(dev.current, '.cl-body'); if (b) b.scrollTop = 0 },
    async play(c) {
      await c.sleep(300)
      await c.press(dev.current, q(dev.current, '[data-id="ame"] .cl-add')); await c.sleep(1200)
      await c.press(dev.current, q(dev.current, '[data-id="ame"] .cl-like')); await c.sleep(1000)
    },
  })

  return (
    <Card id="col-cards" num="03" title="카드" en="Cards" demo={demo}
      desc="사진 · 제목 · 설명 · 버튼을 상자 하나에 묶어요. 하나하나가 독립된 물건처럼 보여요.">
      <Stage log={log} logId="col-cards-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">오늘의 메뉴<span className="sp" /><span className="cl-cart" aria-label={'장바구니 ' + cart.length + '개'}>🛒<b key={cart.length} className={cart.length ? 'bump' : ''}>{cart.length}</b></span></div>
            <div className="cl-body cl-cards">
              {CARD_ITEMS.map(m => (
                <article key={m.id} data-id={m.id} className="cl-card">
                  <Thumb item={m} className="wide">
                    {m.orders > 200 && <span className="cl-tag">인기</span>}
                  </Thumb>
                  <div className="cl-card-b">
                    <div className="row"><b>{m.name}</b><span className="cl-price">{won(m.price)}</span></div>
                    <p>{m.desc}</p>
                    <div className="row">
                      <button type="button" className="cl-like" aria-pressed={liked.includes(m.id)} aria-label={m.name + ' 찜하기'} onClick={() => like(m.id)}>{liked.includes(m.id) ? '♥' : '♡'}</button>
                      <button type="button" className="btn sm cl-add" onClick={() => add(m.id)}>담기</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['구성', '사진 · 제목 · 설명 · 행동'], ['카드 간격', '8–16px'], ['버튼', '카드당 1–2개']]}
        usage={[
          ['언제', '상품, 기사, 이벤트처럼 한 개씩 정보가 많고 바로 할 행동이 붙을 때'],
          ['주의', '카드 전체도 누를 수 있고 안의 버튼도 누를 수 있으면 헷갈려요 — 누르는 곳을 분명하게'],
        ]}
      />
    </Card>
  )
}
