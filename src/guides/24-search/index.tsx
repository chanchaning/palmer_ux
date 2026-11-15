import './search.css'
import { Autocomplete, RecentSearches, SearchBar, Trending } from './cards/input'
import { Filters, Sort } from './cards/refine'
import { Highlight, NoResults, ScopeTabs } from './cards/results'

/** GUIDE 24 — 검색창 속 숨은 이름들 */
export default function SearchGuide() {
  return (
    <div className="grid trans">
      <SearchBar />
      <Autocomplete />
      <RecentSearches />
      <Trending />
      <Filters />
      <Sort />
      <Highlight />
      <NoResults />
      <ScopeTabs />
    </div>
  )
}
