import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { DemoPane, PairCard } from '../../../components/Card'
import { IcBack, IcCheck, IcChev } from './bits'
import { useOutside } from './useOutside'

/* ---------- 10 드롭다운 vs 셀렉트 ---------- */
const ACTIONS = ['복제하기', '이름 바꾸기', 'PDF로 내보내기', '삭제'] as const
const SIZES = ['S (90)', 'M (95)', 'L (100)', 'XL (105)']

export function DropdownVsSelect() {
  const menuWrap = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState(false)
  const [doc, setDoc] = useState('기획안.doc')
  const [mLog, setMLog] = useState<ReactNode>(<>메뉴 항목을 누르면 <b>바로 실행</b>돼요</>)
  useOutside(menuWrap, menu, () => setMenu(false))

  const selWrap = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState(false)
  const [size, setSize] = useState<string | null>(null)
  useOutside(selWrap, sel, () => setSel(false))

  const act = (a: (typeof ACTIONS)[number]) => {
    setMenu(false)
    if (a === '이름 바꾸기') setDoc(d => (d.startsWith('최종_') ? d : '최종_' + d))
    if (a === '복제하기') setDoc(d => d.replace(/( 사본)*\.doc$/, ' 사본.doc'))
    setMLog(a === '삭제' ? <><b>삭제</b> 명령 실행 · 버튼 글자는 그대로 ‘작업’</> : <><b>{a}</b> 실행됨 · 버튼 글자는 그대로 ‘작업’</>)
  }

  return (
    <PairCard id="c-dropdown" num="10" a="드롭다운" b="셀렉트" desc="눌러서 명령을 고르면 드롭다운 메뉴, 폼에 들어갈 값 하나를 고르면 셀렉트."
      diff={[
        ['고르면', '그 자리에서 명령이 실행돼요', '고른 값이 칸에 들어가 남아요'],
        ['버튼 글자', '그대로예요 (작업 ▾)', '고른 값으로 바뀌어요 (L 100)'],
        ['주로 쓰는 곳', '더보기 메뉴, 정렬·내보내기', '폼: 사이즈, 지역, 생년'],
      ]}>
      <DemoPane label="드롭다운" en="Dropdown Menu" log={mLog}>
        <div className="stage sm-top">
          <div className="sm-file"><span className="sm-file-ic" aria-hidden="true">D</span><span className="grow">{doc}</span></div>
          <div className="sm-anchor" ref={menuWrap}>
            <button className="sm-dd" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(o => !o)}>작업 <IcChev /></button>
            {menu && (
              <div className="sm-menu" role="menu">
                {ACTIONS.map(a => (
                  <button key={a} role="menuitem" className={a === '삭제' ? 'danger' : ''} onClick={() => act(a)}>{a}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="셀렉트" en="Select" log={size ? <>칸에 <b>{size}</b>가 남았어요 · 주문할 때 함께 제출</> : <>사이즈를 <b>하나</b> 골라 보세요</>}>
        <div className="stage sm-top">
          <div className="sm-field" ref={selWrap}>
            <span className="sm-lbl" id="sm-size-l">사이즈</span>
            <button className={'sm-select' + (size ? '' : ' empty')} aria-haspopup="listbox" aria-expanded={sel} aria-labelledby="sm-size-l sm-size-v"
              onClick={() => setSel(o => !o)}><span id="sm-size-v">{size ?? '선택해 주세요'}</span><IcChev /></button>
            {sel && (
              <div className="sm-menu sm-list" role="listbox" aria-labelledby="sm-size-l">
                {SIZES.map(s => (
                  <button key={s} role="option" aria-selected={size === s} onClick={() => { setSize(s); setSel(false) }}>
                    {s}{size === s && <IcCheck />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn sm orange" disabled={!size}>장바구니 담기</button>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 11 버튼 vs 링크 ---------- */
const PAGES = {
  ship: { path: '/help/shipping', title: '배송 안내', body: '오후 2시 전 주문은 오늘 출발해요. 제주·도서 지역은 하루 더 걸려요.' },
  refund: { path: '/help/refund', title: '환불 정책', body: '받은 날부터 7일 안에 신청하면 전액 돌려드려요.' },
} as const
type PageKey = keyof typeof PAGES

export function ButtonVsLink() {
  const [cart, setCart] = useState(0)
  const [liked, setLiked] = useState(false)
  const [bLog, setBLog] = useState<ReactNode>(<>누르면 <b>이 화면에서</b> 일이 일어나요</>)
  const [page, setPage] = useState<PageKey | null>(null)
  const [lLog, setLLog] = useState<ReactNode>(<>밑줄 글자를 누르면 <b>다른 곳으로 이동</b>해요</>)

  const go = (e: MouseEvent, k: PageKey | null) => {
    e.preventDefault()
    setPage(k)
    setLLog(k ? <>주소가 <b>{PAGES[k].path}</b>로 바뀌었어요</> : <><b>뒤로 가기</b> · 원래 페이지로 돌아왔어요</>)
  }

  return (
    <PairCard id="c-button" num="11" a="버튼" b="링크" desc="지금 화면에서 무언가를 실행하면 버튼, 다른 페이지나 위치로 옮겨 가면 링크."
      diff={[
        ['하는 일', '행동 실행 (담기·저장·보내기)', '이동 (다른 페이지·같은 페이지의 다른 곳)'],
        ['라벨', '동사: ‘담기’, ‘저장’', '목적지 이름: ‘배송 안내’'],
        ['코드', '<button>', '<a href> · 새 탭·뒤로 가기가 돼요'],
      ]}>
      <DemoPane label="버튼" en="Button" log={bLog}>
        <div className="stage">
          <div className="sm-prod">
            <span className="sm-prod-img g2" aria-hidden="true" />
            <div className="grow"><b>코튼 머그컵</b><span className="muted">12,000원</span></div>
          </div>
          <div className="row">
            <button className="btn sm ghost" aria-pressed={liked} onClick={() => { setLiked(!liked); setBLog(<><b>{liked ? '찜 해제' : '찜 완료'}</b> · 페이지는 그대로</>) }}>{liked ? '♥ 찜함' : '♡ 찜하기'}</button>
            <button className="btn sm grow" onClick={() => { setCart(n => n + 1); setBLog(<>장바구니 <b>{cart + 1}개</b> · 화면 이동 없이 실행됨</>) }}>장바구니 담기</button>
          </div>
          <div className="muted">장바구니 {cart}개</div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="링크" en="Link" log={lLog}>
        <div className="stage sm-top sm-nopad">
          <div className="sm-url" aria-label="주소창">palmer.shop{page ? PAGES[page].path : '/item/42'}</div>
          {page ? (
            <div className="sm-page" key={page}>
              <a href="#/similar/c-button" className="sm-link sm-back" onClick={e => go(e, null)}><IcBack />뒤로</a>
              <b>{PAGES[page].title}</b>
              <p>{PAGES[page].body}</p>
            </div>
          ) : (
            <div className="sm-page" key="item">
              <b>코튼 머그컵</b>
              <p>
                주문 전에 <a href="#/similar/c-button" className="sm-link" onClick={e => go(e, 'ship')}>배송 안내</a>와{' '}
                <a href="#/similar/c-button" className="sm-link" onClick={e => go(e, 'refund')}>환불 정책</a>을 확인해 주세요.
              </p>
            </div>
          )}
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 12 플레이스홀더 vs 라벨 ---------- */
const FILL = { name: '한소라', mail: 'sora@example.com', phone: '01012345678' }
type FKey = keyof typeof FILL
const EMPTY: Record<FKey, string> = { name: '', mail: '', phone: '' }
const FIELDS: [FKey, string, string][] = [['name', '이름', '예: 홍길동'], ['mail', '이메일', '예: name@mail.com'], ['phone', '휴대폰 번호', '- 없이 숫자만']]

export function PlaceholderVsLabel() {
  const [a, setA] = useState(EMPTY)
  const [b, setB] = useState(EMPTY)
  const aFilled = Object.values(a).filter(Boolean).length
  const bFilled = Object.values(b).filter(Boolean).length

  return (
    <PairCard id="c-placeholder" num="12" a="플레이스홀더" b="라벨" desc="입력하면 사라지는 흐린 힌트는 플레이스홀더, 입력해도 칸 위에 남는 이름은 라벨."
      diff={[
        ['입력하면', '사라져요', '그대로 남아요'],
        ['역할', '예시·형식 힌트 (- 없이 숫자만)', '칸의 이름 (휴대폰 번호)'],
        ['혼자 쓰면', '안 돼요 · 무슨 칸이었는지 잊어요', '괜찮아요 · 화면 읽기 도구도 읽어요'],
      ]}>
      <DemoPane label="플레이스홀더만" en="Placeholder" log={aFilled === 0 ? <>‘자동 채우기’를 누르거나 직접 써 보세요</> : <>힌트가 <b>사라졌어요</b> · 이제 무슨 칸인지 안 보여요</>}>
        <div className="stage sm-top">
          {FIELDS.map(([k, label]) => (
            <input key={k} className="sm-input" placeholder={label} aria-label={label} value={a[k]} onChange={e => setA({ ...a, [k]: e.target.value })} />
          ))}
          <div className="row">
            <button className="btn sm ghost" onClick={() => setA(FILL)}>자동 채우기</button>
            <button className="btn sm ghost" onClick={() => setA(EMPTY)}>지우기</button>
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="라벨 + 힌트" en="Label" log={bFilled === 0 ? <>라벨은 칸 위, 힌트는 칸 안에 있어요</> : <>입력해도 라벨 <b>‘이메일’</b>은 그대로 남아요</>}>
        <div className="stage sm-top">
          {FIELDS.map(([k, label, hint]) => (
            <label key={k} className="sm-lfield">
              <span>{label}</span>
              <input className="sm-input" placeholder={hint} value={b[k]} onChange={e => setB({ ...b, [k]: e.target.value })} />
            </label>
          ))}
          <div className="row">
            <button className="btn sm ghost" onClick={() => setB(FILL)}>자동 채우기</button>
            <button className="btn sm ghost" onClick={() => setB(EMPTY)}>지우기</button>
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}
