import { groups, guides } from '../guides/registry'
import { IconArrow, IconSearch } from './icons'
import { PLAN_TABS } from '../plan/PlanPage'

/** 첫 화면: 소개 + 검색 + 그룹별 가이드 목차 */
export function Home({ onSearch, logo }: { onSearch: () => void; logo: React.ReactNode }) {
  const total = guides.reduce((n, g) => n + g.count, 0)
  return (
    <section className="page on homepage" data-page="home">
      <header className="home-hero">
        <div className="home-logo">{logo}</div>
        <div className="home-eyebrow">경험 노하우 · Palmer의 웹 도감</div>
        <h2 className="home-title">질문이 쌓여<br />도감이 됐어요</h2>
        <div className="home-desc">
          <p>
            디자이너로 일하며 부사수분들에게 가장 많이 받은 질문과, 제가 직접 부딪히며 배운 것들을 한곳에 꾹꾹 눌러 담았어요.
          </p>
          <p>
            “토스트랑 스낵바는 뭐가 달라요?”, “이 회색 글자 써도 돼요?”, “이 기능은 화면을 어떻게 나눠요?”
            매번 말로 풀어 설명하던 답을, 이제는 직접 눌러보고 끌어보면서 확인할 수 있게 만들었어요.
          </p>
          <p>
            UX·UI에서 시작했지만 기획의 고민도 함께 채워가고 있어요. 정답을 외우기보다
            <b> 왜 그렇게 결정하는지</b>를 같이 고민하는 도감이 되면 좋겠어요.
          </p>
          <p className="home-sign">— Palmer</p>
        </div>
        <ul className="home-for" aria-label="이런 분께 추천해요">
          <li>처음 실무를 시작한 디자이너</li>
          <li>디자이너와 함께 일하는 기획자·개발자</li>
          <li>후배에게 ‘왜’를 설명해야 하는 사수</li>
        </ul>
        <button className="home-search" onClick={onSearch}>
          <IconSearch />
          <span>찾고 싶은 패턴을 검색해 보세요 — 예: 토스트, 스와이프, 행간</span>
          <kbd>⌘K</kbd>
        </button>
        <dl className="home-stats">
          <div><dt>가이드</dt><dd>{guides.length}</dd></div>
          <div><dt>카드</dt><dd>{total}</dd></div>
          <div><dt>그룹</dt><dd>{groups.length}</dd></div>
        </dl>
      </header>

      <h3 className="home-area">디자인</h3>
      {groups.map(gr => (
        <div className="home-group" key={gr.name}>
          <h3 className="home-group-name">{gr.name}<span>{gr.items.length}</span></h3>
          <div className="home-grid">
            {gr.items.map(g => (
              <a className="home-tile" href={'#/' + g.id} key={g.id}>
                <span className="kicker-num" aria-hidden="true">{g.num}</span>
                <b>{g.nav}</b>
                <p>{g.title}</p>
                <ul>
                  {g.cards.slice(0, 4).map(c => <li key={c.id}>{c.title}</li>)}
                  {g.cards.length > 4 && <li className="more">외 {g.cards.length - 4}개</li>}
                </ul>
                <span className="home-go">카드 {g.count}장 보기 <IconArrow /></span>
              </a>
            ))}
          </div>
        </div>
      ))}
      <h3 className="home-area">기획</h3>
      <div className="home-group">
        <h3 className="home-group-name">기획 노트<span>{PLAN_TABS.length}</span></h3>
        <div className="home-grid">
          {PLAN_TABS.map(t => (
            <a className="home-tile" href={'#/plan/' + t.id} key={t.id}>
              <span className="kicker-num" aria-hidden="true">{t.num}</span>
              <b>{t.name}</b>
              <p>{t.desc}</p>
              <span className="home-go">읽어보기 <IconArrow /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
