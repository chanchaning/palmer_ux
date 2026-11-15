import './similar.css'
import { RadioVsCheckbox, TabVsSegment, ToggleVsCheckbox } from './cards/choice'
import { ModalVsSheet, ToastVsSnackbar, TooltipVsPopover } from './cards/overlay'
import { ChipVsBadge, SpinnerVsSkeleton, StepperVsSlider } from './cards/display'
import { ButtonVsLink, DropdownVsSelect, PlaceholderVsLabel } from './cards/form'
import { AppBarVsTabBar, FabVsIconButton, HamburgerVsKebab } from './cards/nav'
import { AvatarVsThumbnail, BannerVsPopup, CardVsList } from './cards/content'

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
      <DropdownVsSelect />
      <ButtonVsLink />
      <PlaceholderVsLabel />
      <HamburgerVsKebab />
      <AppBarVsTabBar />
      <CardVsList />
      <AvatarVsThumbnail />
      <BannerVsPopup />
      <FabVsIconButton />
    </div>
  )
}
