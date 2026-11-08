import { groups, guides } from '../guides/registry'
import { IconArrow, IconSearch } from './icons'

/** 첫 화면: 소개 + 검색 + 그룹별 가이드 목차 */
export function Home({ onSearch, logo }: { onSearch: () => void; logo: React.ReactNode }) {
  const total = guides.reduce((n, g) => n + g.count, 0)
  return (
    <section className="page on homepage" data-page="home">
      <header className="home-hero">
        <div className="home-logo">{logo}</div>
        <h2 className="home-title">직접 만져보며 배우는<br />UX 도감</h2>
        <p className="home-desc">
          닮았지만 이름이 다른 컴포넌트, 화면이 넘어가는 방식, 사람이 결정하는 방식까지.
          모든 카드에는 실제로 동작하는 데모가 들어 있어요. 눌러보고, 끌어보고, 비교해 보세요.
        </p>
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
    </section>
  )
}
