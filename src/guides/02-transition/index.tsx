import './transition.css'
import { FadeThrough, ModalPresent, Push } from './cards/navigate'
import { CardExpand, SharedElement, Zoom } from './cards/element'
import { SheetExpand, Stagger, TabSlide } from './cards/list'

/** GUIDE 02 — 눌렀을 때 넘어가는 방식이 달라요 */
export default function TransitionGuide() {
  return (
    <div className="grid trans">
      <Push />
      <ModalPresent />
      <FadeThrough />
      <SharedElement />
      <CardExpand />
      <Zoom />
      <Stagger />
      <TabSlide />
      <SheetExpand />
    </div>
  )
}
