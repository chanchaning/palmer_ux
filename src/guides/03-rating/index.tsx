import './rating.css'
import { Emoji, HalfStar, Star, Thumbs } from './cards/input'
import { Nps, Slider } from './cards/scale'
import { Badge, Summary, Tags } from './cards/display'

/** GUIDE 03 — 평점·평가 */
export default function RatingGuide() {
  return (
    <div className="grid trans">
      <Star />
      <HalfStar />
      <Emoji />
      <Thumbs />
      <Slider />
      <Nps />
      <Summary />
      <Tags />
      <Badge />
    </div>
  )
}
