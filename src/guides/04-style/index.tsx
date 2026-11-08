import './style.css'
import { Brut, Clay, Flat, Glass, Material, Neu, Skeu } from './cards/classic'
import { Bento, Dark, Icons3D, Liquid, Minimal, Y2K } from './cards/modern'

/** GUIDE 04 — 같은 화면, 13가지 옷 */
export default function StyleGuide() {
  return (
    <div className="grid trans">
      <Flat />
      <Skeu />
      <Material />
      <Neu />
      <Glass />
      <Clay />
      <Brut />
      <Bento />
      <Dark />
      <Liquid />
      <Y2K />
      <Minimal />
      <Icons3D />
    </div>
  )
}
