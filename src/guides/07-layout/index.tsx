import './layout.css'
import { Breadcrumb, Drawer, TabBar, TopTabs } from './cards/nav'
import { Back, Fab, Sticky } from './cards/screen'
import { Infinite, Pagination } from './cards/list'

/** GUIDE 07 — 앱 화면은 부품으로 나뉘어요 */
export default function LayoutGuide() {
  return (
    <div className="grid trans">
      <TabBar />
      <Drawer />
      <TopTabs />
      <Breadcrumb />
      <Sticky />
      <Fab />
      <Pagination />
      <Infinite />
      <Back />
    </div>
  )
}
