import './material.css'
import { RippleGrid } from './shared'
import { DynamicColor, Elevation, Ripple } from './cards/surface'
import { Drawer, Fab, Rail, Sheet } from './cards/nav'
import { Badges, Chips, Divider, Specs } from './cards/parts'

/** GUIDE 16 — 머티리얼 디자인 */
export default function MaterialGuide() {
  return (
    <RippleGrid className="grid trans">
      <Elevation />
      <DynamicColor />
      <Ripple />
      <Fab />
      <Drawer />
      <Rail />
      <Sheet />
      <Chips />
      <Badges />
      <Divider />
      <Specs />
    </RippleGrid>
  )
}
