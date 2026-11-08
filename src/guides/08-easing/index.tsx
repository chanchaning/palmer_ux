import './easing.css'
import { Bounce, EaseIn, EaseOut, Spring } from './cards/lane'
import { Fade, Scale, Stagger } from './cards/reveal'
import { Shared, Slide } from './cards/transition'

/** GUIDE 08 — 움직임·이징 */
export default function EasingGuide() {
  return (
    <div className="grid trans">
      <EaseIn />
      <EaseOut />
      <Bounce />
      <Spring />
      <Stagger />
      <Fade />
      <Scale />
      <Slide />
      <Shared />
    </div>
  )
}
