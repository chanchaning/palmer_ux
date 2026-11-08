import './similar.css'
import { RadioVsCheckbox, TabVsSegment, ToggleVsCheckbox } from './cards/choice'
import { ModalVsSheet, ToastVsSnackbar, TooltipVsPopover } from './cards/overlay'
import { ChipVsBadge, SpinnerVsSkeleton, StepperVsSlider } from './cards/display'

/** GUIDE 01 — 닮았는데 이름은 달라요 */
export default function SimilarGuide() {
  return (
    <div className="grid pairs">
      <ToggleVsCheckbox />
      <RadioVsCheckbox />
      <TabVsSegment />
      <ModalVsSheet />
      <ToastVsSnackbar />
      <TooltipVsPopover />
      <ChipVsBadge />
      <SpinnerVsSkeleton />
      <StepperVsSlider />
    </div>
  )
}
