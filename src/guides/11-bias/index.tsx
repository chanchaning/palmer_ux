import './bias.css'
import { Anchor, Default, Loss } from './cards/value'
import { Framing, Scarcity, Social } from './cards/signal'
import { Choice, Peak, Zeigarnik } from './cards/journey'

/** GUIDE 11 — 심리 편향 */
export default function BiasGuide() {
  return (
    <div className="grid trans">
      <Anchor />
      <Loss />
      <Default />
      <Social />
      <Scarcity />
      <Framing />
      <Choice />
      <Peak />
      <Zeigarnik />
    </div>
  )
}
