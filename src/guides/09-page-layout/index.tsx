import './page-layout.css'
import { FullBleed, Hero, ZPattern } from './cards/landing'
import { Bento, CardGrid, Magazine } from './cards/grid'
import { Dashboard, SidebarLayout, Split } from './cards/app'

/** GUIDE 09 — 페이지 레이아웃 */
export default function PageLayoutGuide() {
  return (
    <div className="grid trans">
      <Hero />
      <Bento />
      <Split />
      <CardGrid />
      <SidebarLayout />
      <Magazine />
      <Dashboard />
      <ZPattern />
      <FullBleed />
    </div>
  )
}
