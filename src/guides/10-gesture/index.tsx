import './gesture.css'
import { DoubleTap, LongPress, Tap } from './cards/touch'
import { EdgeSwipe, Swipe, SwipeDelete } from './cards/swipe'
import { DragReorder, Pinch, Pull } from './cards/drag'

/** GUIDE 10 — 제스처 */
export default function GestureGuide() {
  return (
    <div className="grid trans">
      <Tap />
      <LongPress />
      <Swipe />
      <DragReorder />
      <Pinch />
      <SwipeDelete />
      <DoubleTap />
      <Pull />
      <EdgeSwipe />
    </div>
  )
}
