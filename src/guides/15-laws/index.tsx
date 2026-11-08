import './laws.css'
import { Jakob, Miller } from './cards/memory'
import { Doherty, Fitts, Hick } from './cards/decision'
import { PeakEnd, Postel } from './cards/emotion'

/** GUIDE 15 — UX 법칙 */
export default function LawsGuide() {
  return (
    <>
      <div className="grid pairs">
        <Jakob />
        <Miller />
        <Hick />
        <Fitts />
        <Doherty />
        <PeakEnd />
        <Postel />
      </div>
      <p className="lw-src">참고: Laws of UX (lawsofux.com · Jon Yablonski) · 도서 『UX/UI의 10가지 심리학 법칙』</p>
    </>
  )
}
