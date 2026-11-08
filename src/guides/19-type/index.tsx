import './type.css'
import { Distance, LineLength, RemPx, TabletLayout, TypeScale } from './cards/size'
import { LineHeight, Tracking, Weight, WordBreak } from './cards/rhythm'
import { Contrast, IosZoom, Tabular } from './cards/color'
import { Fonts, PlatformScale } from './cards/system'

/** GUIDE 19 — 타이포그래피 */
export default function TypeGuide() {
  return (
    <>
      <div className="grid pairs">
        <Distance />
        <LineLength />
        <LineHeight />
        <Tracking />
        <Weight />
        <Contrast />
        <Tabular />
        <IosZoom />
        <RemPx />
        <TypeScale />
        <TabletLayout />
        <WordBreak />
        <PlatformScale />
        <Fonts />
      </div>
      <p className="ty-src">참고: KRDS 대한민국 디지털 정부 UI/UX 가이드라인 · Material Design 3 Typography · Apple HIG Typography · WCAG 2.1</p>
    </>
  )
}
