import './contrast.css'
import { useRef } from 'react'
import { Tester, type TesterHandle } from './cards/tester'
import { ImageText, Palette } from './cards/tools'
import { AaVsAaa, BrandColor, ColorOnly, DarkPitfalls, Exemptions, Formula, LargeText, UiContrast } from './cards/learn'
import { TesterCtx } from './shared'

/** GUIDE 20 — 색상 대비 */
export default function ContrastGuide() {
  const tester = useRef<TesterHandle>(null)
  const load = (fg: string, bg: string) => {
    tester.current?.load(fg, bg)
    document.getElementById('contrast-tester')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <TesterCtx.Provider value={{ load }}>
      <div className="grid pairs">
        <Tester ref={tester} />
        <Palette />
        <ImageText />
        <Formula />
        <AaVsAaa />
        <LargeText />
        <UiContrast />
        <Exemptions />
        <ColorOnly />
        <DarkPitfalls />
        <BrandColor />
      </div>
    </TesterCtx.Provider>
  )
}
