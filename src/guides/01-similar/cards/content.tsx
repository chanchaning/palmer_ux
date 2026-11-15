import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DemoPane, PairCard } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { IcClose, IcHeart, IcPlay } from './bits'
import { useOutside } from './useOutside'

/* ---------- 15 카드 vs 리스트 ---------- */
interface Stay { name: string; price: number; score: number; tag: string; g: string }
const STAYS: Stay[] = [
  { name: '바다 펜션', price: 89000, score: 4.6, tag: '오션뷰', g: 'g2' },
  { name: '숲속 오두막', price: 72000, score: 4.8, tag: '조용함', g: 'g3' },
  { name: '노을 캠핑', price: 45000, score: 4.2, tag: '반려견', g: 'g1' },
  { name: '한옥 스테이', price: 120000, score: 4.9, tag: '조식', g: 'g4' },
  { name: '시티 호텔', price: 98000, score: 4.4, tag: '역 앞', g: 'g2' },
  { name: '호숫가 별장', price: 135000, score: 4.7, tag: '바비큐', g: 'g3' },
]
type SortKey = 'price' | 'score'
const won = (n: number) => n.toLocaleString() + '원'

export function CardVsList() {
  const [liked, setLiked] = useState<string[]>([])
  const [cLog, setCLog] = useState<ReactNode>(<>사진과 태그로 <b>훑어보며 구경</b>하기 좋아요</>)
  const [sort, setSort] = useState<{ k: SortKey; up: boolean } | null>(null)

  const rows = sort ? [...STAYS].sort((x, y) => (sort.up ? x[sort.k] - y[sort.k] : y[sort.k] - x[sort.k])) : STAYS
  const sortBy = (k: SortKey) => setSort(s => ({ k, up: s?.k === k ? !s.up : k === 'price' }))
  const arrow = (k: SortKey) => (sort?.k === k ? (sort.up ? ' ↑' : ' ↓') : ' ↕')

  return (
    <PairCard id="c-card" num="15" a="카드" b="리스트" desc="항목마다 사진과 정보를 상자에 담아 따로 보여주면 카드, 한 줄씩 촘촘히 쌓아 견주게 하면 리스트."
      diff={[
        ['한 항목', '사진·제목·태그까지 넉넉하게', '한 줄에 핵심만'],
        ['한눈에 보이는 수', '적어요 (2~4개)', '많아요 (8개 이상도 OK)'],
        ['잘하는 일', '구경하며 고르기', '비교·정렬·찾기'],
      ]}>
      <DemoPane label="카드" en="Card" log={cLog}>
        <div className="stage sm-top">
          <div className="sm-cards">
            {STAYS.slice(0, 4).map(s => {
              const on = liked.includes(s.name)
              return (
                <div className="sm-card" key={s.name}>
                  <span className={'sm-card-img ' + s.g}><i>{s.tag}</i></span>
                  <button className="sm-heart" aria-label={`${s.name} 찜하기`} aria-pressed={on}
                    onClick={() => { setLiked(l => (on ? l.filter(x => x !== s.name) : [...l, s.name])); setCLog(<><b>{s.name}</b> {on ? '찜 해제' : '찜'} · 상자마다 따로 조작</>) }}><IcHeart on={on} /></button>
                  <b>{s.name}</b>
                  <span className="muted">{won(s.price)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="리스트" en="List" log={sort ? <><b>{sort.k === 'price' ? '가격' : '평점'} {sort.up ? '낮은' : '높은'} 순</b> · 줄로 놓으니 비교가 쉬워요</> : <>머리글을 눌러 <b>정렬</b>해 보세요</>}>
        <div className="stage sm-top sm-nopad">
          <div className="sm-table" role="table" aria-label="숙소 목록">
            <div className="sm-tr sm-th" role="row">
              <span role="columnheader">숙소</span>
              <button role="columnheader" aria-sort={sort?.k === 'score' ? (sort.up ? 'ascending' : 'descending') : 'none'} onClick={() => sortBy('score')}>평점{arrow('score')}</button>
              <button role="columnheader" aria-sort={sort?.k === 'price' ? (sort.up ? 'ascending' : 'descending') : 'none'} onClick={() => sortBy('price')}>가격{arrow('price')}</button>
            </div>
            {rows.map(s => (
              <div className="sm-tr" role="row" key={s.name}>
                <span role="cell">{s.name}</span><span role="cell">★ {s.score}</span><span role="cell">{won(s.price)}</span>
              </div>
            ))}
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 16 아바타 vs 썸네일 ---------- */
const PEOPLE = [
  { id: 'mj', name: '윤민지', ini: '민', role: '디자이너', g: 'g4', on: true, text: '시안 너무 좋아요!' },
  { id: 'th', name: '강태호', ini: '태', role: '개발자', g: 'g2', on: false, text: '내일 배포할게요.' },
  { id: 'sa', name: '서아라', ini: '아', role: 'PM', g: 'g3', on: true, text: '회의는 3시에 해요.' },
]
const VIDEOS = [
  { id: 'v1', title: '5분 아침 스트레칭', len: '5:12', g: 'g3' },
  { id: 'v2', title: '자취 요리 3가지', len: '8:40', g: 'g1' },
  { id: 'v3', title: '제주 한 바퀴', len: '12:05', g: 'g2' },
]

export function AvatarVsThumbnail() {
  const wrap = useRef<HTMLDivElement>(null)
  const [who, setWho] = useState<string | null>(null)
  const [follow, setFollow] = useState<string[]>([])
  const [photo, setPhoto] = useState(true)
  useOutside(wrap, who !== null, () => setWho(null))
  const p = PEOPLE.find(x => x.id === who)

  const [play, setPlay] = useState<string | null>(null)
  const [prog, setProg] = useState(0)
  const timers = useTimers()
  const open = (id: string) => { setProg(0); setPlay(id); timers.set(() => setProg(100), 50) }
  const v = VIDEOS.find(x => x.id === play)

  return (
    <PairCard id="c-avatar" num="16" a="아바타" b="썸네일" desc="‘누가’를 작은 동그라미로 보여주면 아바타, ‘무엇’을 작게 미리 보여주면 썸네일."
      diff={[
        ['나타내는 것', '사람·계정 (누가)', '콘텐츠 (무엇)'],
        ['모양', '동그라미 · 사진 없으면 이니셜', '네모 · 원래 비율 (16:9, 1:1)'],
        ['누르면', '그 사람의 프로필', '콘텐츠를 크게 열기·재생'],
      ]}>
      <DemoPane label="아바타" en="Avatar" log={p ? <><b>{p.name}</b>의 프로필 · 사람을 나타내요</> : <>동그라미를 누르면 <b>그 사람</b>이 나와요</>}>
        <div className="stage sm-top" ref={wrap}>
          {PEOPLE.map(x => (
            <div className="sm-cmt" key={x.id}>
              <div className="sm-anchor">
                <button className={'sm-av ' + (photo ? x.g : 'ini')} aria-label={`${x.name}${x.on ? ' (접속 중)' : ''} 프로필 보기`} aria-expanded={who === x.id} onClick={() => setWho(w => (w === x.id ? null : x.id))}>
                  {!photo && x.ini}{x.on && <i className="sm-dot" aria-hidden="true" />}
                </button>
                {who === x.id && (
                  <div className="sm-menu sm-profile">
                    <b>{x.name}</b><span className="muted">{x.role}{x.on ? ' · 접속 중' : ''}</span>
                    <button className="btn sm" onClick={() => setFollow(f => (f.includes(x.id) ? f.filter(y => y !== x.id) : [...f, x.id]))}>{follow.includes(x.id) ? '팔로잉' : '팔로우'}</button>
                  </div>
                )}
              </div>
              <div className="grow"><b>{x.name}</b><span>{x.text}</span></div>
            </div>
          ))}
          <div className="row"><span className="setting sm-small">프로필 사진</span>
            <button className="switch" role="switch" aria-checked={photo} aria-label="프로필 사진 보이기" onClick={() => setPhoto(!photo)} /></div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="썸네일" en="Thumbnail" log={v ? <><b>{v.title}</b> 재생 중 · 썸네일은 미리보기였어요</> : <>썸네일을 눌러 <b>크게 열어</b> 보세요</>}>
        <div className="stage sm-top">
          {v ? (
            <div className="sm-player" key={v.id}>
              <span className={'sm-thumb big ' + v.g}><IcPlay /></span>
              <div className="sm-prog"><span style={{ width: prog + '%' }} /></div>
              <div className="row"><b className="sm-small">{v.title}</b><button className="sm-ib" aria-label="닫기" onClick={() => { timers.clear(); setPlay(null) }}><IcClose /></button></div>
            </div>
          ) : VIDEOS.map(x => (
            <button className="sm-vrow" key={x.id} onClick={() => open(x.id)}>
              <span className={'sm-thumb ' + x.g}><i>{x.len}</i></span>
              <span className="grow">{x.title}</span>
            </button>
          ))}
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 17 배너 vs 팝업 ---------- */
export function BannerVsPopup() {
  const [banner, setBanner] = useState(true)
  const [aLikes, setALikes] = useState(3)
  const [bLog, setBLog] = useState<ReactNode>(<>배너가 있어도 <b>♥를 누를 수 있어요</b></>)

  const [popup, setPopup] = useState(false)
  const [pLikes, setPLikes] = useState(3)
  const [pLog, setPLog] = useState<ReactNode>(<>‘페이지 열기’를 눌러 보세요</>)
  const dialog = useRef<HTMLDivElement>(null)
  const timers = useTimers()

  const openPage = () => { setPLog(<>페이지가 열리자마자 <b>팝업이 덮었어요</b></>); timers.set(() => setPopup(true), 350) }

  return (
    <PairCard id="c-banner" num="17" a="배너" b="팝업" desc="페이지 안에 자리를 잡고 하던 일을 막지 않으면 배너, 페이지 위를 덮고 끼어들면 팝업."
      diff={[
        ['흐름', '페이지 안에 끼어 있어요 · 계속 쓸 수 있어요', '위를 덮어요 · 이 예시처럼 뒤를 막으면 모달 (19번 참고)'],
        ['닫기', '안 닫아도 돼요 (✕는 선택)', '꼭 닫거나 골라야 해요'],
        ['어울리는 소식', '점검 예고, 새 기능, 쿠키 안내', '지금 꼭 정해야 하는 일 (드물게)'],
      ]}>
      <DemoPane label="배너" en="Banner" log={bLog}>
        <div className="stage phone">
          <div className={'sm-banner' + (banner ? '' : ' gone')} role="region" aria-label="공지 배너">
            <span className="grow">내일 새벽 2시에 점검이 있어요.</span>
            <button className="sm-ib" aria-label="배너 닫기" tabIndex={banner ? 0 : -1} onClick={() => { setBanner(false); setBLog(<>배너를 <b>닫음</b> · 내용이 위로 올라왔어요</>) }}><IcClose /></button>
          </div>
          <div className="app-mock">
            <div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" />
            <button className="btn sm ghost sm-like" onClick={() => { setALikes(n => n + 1); setBLog(<>♥ <b>{aLikes + 1}</b> · 배너와 상관없이 눌려요</>) }}>♥ {aLikes}</button>
            {!banner && <button className="btn sm ghost" onClick={() => { setBanner(true); setBLog(<>배너가 <b>다시 자리를 잡았어요</b></>) }}>배너 다시 보기</button>}
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="팝업" en="Popup" log={pLog}>
        <div className="stage phone">
          <div className="app-mock">
            <div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" />
            <button className="btn sm ghost sm-like" onClick={() => { setPLikes(n => n + 1); setPLog(<>♥ <b>{pLikes + 1}</b> · 팝업이 없으니 눌려요</>) }}>♥ {pLikes}</button>
            <button className="btn sm orange" onClick={openPage}>페이지 열기</button>
          </div>
          <div className={'scrim' + (popup ? ' on' : '')} onClick={() => {
            dialog.current?.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.04)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 220 })
            setPLog(<>뒤의 ♥를 눌러도 <b>막혀요</b> · 먼저 닫아야 해요</>)
          }} />
          <div className={'dialog' + (popup ? ' on' : '')} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="sm-pop-t" aria-hidden={!popup}>
            <h4 id="sm-pop-t">앱 알림을 켤까요?</h4>
            <p>할인 소식을 가장 먼저 알려드려요.</p>
            <div className="row">
              <button className="btn ghost sm" tabIndex={popup ? 0 : -1} onClick={() => { setPopup(false); setPLog(<><b>나중에</b> · 이제야 페이지를 쓸 수 있어요</>) }}>나중에</button>
              <button className="btn sm orange" tabIndex={popup ? 0 : -1} onClick={() => { setPopup(false); setPLog(<><b>켜기</b> · 이제야 페이지를 쓸 수 있어요</>) }}>켜기</button>
            </div>
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 19 모달 vs 팝업 ----------
 * 모달은 '성질'(뒤를 막음), 팝업은 '모양'(위에 떠서 나타남).
 * 오른쪽 팝업은 모달리스/모달을 바꿔 띄울 수 있어서 "팝업 중 뒤를 막는 것 = 모달"을 직접 확인해요. */
const shake = (el: HTMLElement | null) =>
  el?.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.04)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 220 })

export function ModalVsPopup() {
  const [modal, setModal] = useState(false)
  const [mLikes, setMLikes] = useState(3)
  const [mLog, setMLog] = useState<ReactNode>(<>‘메모 삭제’를 눌러 보세요</>)
  const mDialog = useRef<HTMLDivElement>(null)
  const mFirst = useRef<HTMLButtonElement>(null)

  const [kind, setKind] = useState<'free' | 'block'>('free')
  const [pop, setPop] = useState(false)
  const [pLikes, setPLikes] = useState(3)
  const [pLog, setPLog] = useState<ReactNode>(<>‘쿠폰 팝업 띄우기’를 눌러 보세요</>)
  const pBox = useRef<HTMLDivElement>(null)
  const timers = useTimers()

  const openModal = () => {
    setModal(true)
    setMLog(<>모달이 떴어요 · <b>뒤 화면은 잠겼어요</b> (Esc로도 닫혀요)</>)
    timers.set(() => mFirst.current?.focus(), 50)
  }
  const closeModal = (msg: ReactNode) => { setModal(false); setMLog(msg) }
  // 포커스가 어디 있든 Esc로 닫혀요 (바깥을 누르면 포커스가 body로 빠지니까요)
  useEffect(() => {
    if (!modal) return
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(<><b>Esc</b>로 닫았어요 · 뒤 화면이 다시 풀렸어요</>) }
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  }, [modal])
  const openPop = () => {
    setPop(true)
    setPLog(kind === 'free'
      ? <>팝업이 떴지만 <b>뒤의 ♥는 그대로 눌려요</b> · 모달리스 팝업</>
      : <>같은 팝업인데 <b>뒤가 잠겼어요</b> · 이제는 모달이에요</>)
  }
  const switchKind = (k: 'free' | 'block') => {
    setKind(k); setPop(false)
    setPLog(k === 'free' ? <><b>모달리스</b> · 뒤를 막지 않는 팝업</> : <><b>모달</b> · 뒤를 막는 팝업 (= 모달)</>)
  }

  return (
    <PairCard id="c-modal-popup" num="19" a="모달" b="팝업" desc="팝업은 ‘위에 떠서 나타나는 창’이라는 모양, 모달은 ‘닫기 전까지 뒤를 못 쓰게 막는’ 성질. 그래서 팝업 중에 뒤를 막는 것만 모달이에요."
      diff={[
        ['가리키는 것', '성질 — 뒤를 막는 창', '모양 — 위에 떠서 나타나는 창 전부'],
        ['뒤 화면', '못 써요 · 답하거나 닫아야 해요', '막을 수도, 안 막을 수도 있어요'],
        ['기획서에 쓸 때', '모달 · 바깥 눌러 닫기 ✕ · Esc 닫기 ○', '‘팝업’만 쓰면 막는지 안 막는지 몰라요 — 모달/모달리스를 같이 적어요'],
      ]}>
      <DemoPane label="모달" en="Modal Dialog" log={mLog}>
        <div className="stage phone">
          <div className="app-mock" inert={modal}>
            <div className="fake-line" style={{ width: '60%' }} /><div className="fake-line" />
            <button className="btn sm ghost sm-like" onClick={() => { setMLikes(n => n + 1); setMLog(<>♥ <b>{mLikes + 1}</b> · 모달이 없으니 눌려요</>) }}>♥ {mLikes}</button>
            <button className="btn sm" onClick={openModal}>메모 삭제</button>
          </div>
          <div className={'scrim' + (modal ? ' on' : '')} onClick={() => { shake(mDialog.current); setMLog(<>바깥을 눌러도 <b>안 닫혀요</b> · 지울지 말지 먼저 답해야 해요</>) }} />
          <div className={'dialog' + (modal ? ' on' : '')} ref={mDialog} role="alertdialog" aria-modal="true" aria-labelledby="sm-mp-t" aria-hidden={!modal}>
            <h4 id="sm-mp-t">이 메모를 지울까요?</h4>
            <p>지운 메모는 되돌릴 수 없어요.</p>
            <div className="row">
              <button ref={mFirst} className="btn ghost sm" tabIndex={modal ? 0 : -1} onClick={() => closeModal(<><b>취소</b> · 이제야 뒤 화면을 쓸 수 있어요</>)}>취소</button>
              <button className="btn sm" tabIndex={modal ? 0 : -1} onClick={() => closeModal(<><b>삭제</b> · 답을 받고 나서야 닫혔어요</>)}>삭제</button>
            </div>
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="팝업" en="Popup" log={pLog}>
        <div className="stage phone">
          <div className="app-mock" inert={pop && kind === 'block'}>
            <Seg value={kind} onChange={switchKind} options={[['free', '모달리스'], ['block', '모달로 띄우기']]} />
            <div className="fake-line" style={{ width: '60%' }} />
            <button className="btn sm ghost sm-like" onClick={() => { setPLikes(n => n + 1); setPLog(<>♥ <b>{pLikes + 1}</b> · 팝업이 떠 있어도 눌려요</>) }}>♥ {pLikes}</button>
            <button className="btn sm orange" onClick={openPop} disabled={pop}>쿠폰 팝업 띄우기</button>
          </div>
          {kind === 'block' && <div className={'scrim' + (pop ? ' on' : '')} onClick={() => { pBox.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 220 }); setPLog(<>뒤의 ♥를 눌러도 <b>막혀요</b> · 모달로 띄웠으니까요</>) }} />}
          <div className={'sm-float' + (pop ? ' on' : '') + (kind === 'block' ? ' block' : '')} ref={pBox} role="dialog" aria-modal={kind === 'block'} aria-labelledby="sm-pf-t" aria-hidden={!pop}>
            <b id="sm-pf-t">쿠폰이 도착했어요</b>
            <span>오늘까지 쓸 수 있는 3,000원 쿠폰</span>
            <button className="sm-ib" aria-label="팝업 닫기" tabIndex={pop ? 0 : -1} onClick={() => { setPop(false); setPLog(<>팝업을 <b>닫았어요</b></>) }}><IcClose /></button>
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}
