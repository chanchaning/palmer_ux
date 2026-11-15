import './button-state.css'
import { DefaultState, FocusState, HoverState } from './cards/look'
import { DisabledState, PressedState, SelectedState } from './cards/touch'
import { ErrorState, LoadingState, SuccessState } from './cards/result'

/** GUIDE 28 — 버튼 상태 */
export default function ButtonStateGuide() {
  return (
    <div className="grid trans">
      <DefaultState />
      <HoverState />
      <FocusState />
      <PressedState />
      <SelectedState />
      <DisabledState />
      <LoadingState />
      <SuccessState />
      <ErrorState />
    </div>
  )
}
