import './darkpattern.css'
import { Cancel, Precheck, Timer } from './cards/obstruct'
import { Scarcity, Shame, Sneak } from './cards/pressure'
import { Autopay, Drip, Nag } from './cards/money'

/** GUIDE 12 — 다크 패턴 */
export default function DarkPatternGuide() {
  return (
    <div className="grid trans">
      <Cancel />
      <Precheck />
      <Timer />
      <Shame />
      <Sneak />
      <Scarcity />
      <Drip />
      <Autopay />
      <Nag />
    </div>
  )
}
