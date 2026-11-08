import './menu-icon.css'
import { Bento, Hamburger, Veggie, Waffle } from './cards/nav'
import { Kebab, Meatball } from './cards/more'
import { Doner, SliderFilter, Stair } from './cards/list'

/** GUIDE 06 — 메뉴 아이콘 */
export default function MenuIconGuide() {
  return (
    <div className="grid trans">
      <Hamburger />
      <Kebab />
      <Meatball />
      <Waffle />
      <Bento />
      <Doner />
      <Veggie />
      <Stair />
      <SliderFilter />
    </div>
  )
}
