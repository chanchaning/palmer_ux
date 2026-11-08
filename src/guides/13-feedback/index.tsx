import './feedback.css'
import { Banner, Snackbar, Toast } from './cards/transient'
import { BottomSheet, InlineError, Modal } from './cards/blocking'
import { Badge, CoachMark, Tooltip } from './cards/quiet'

/** GUIDE 13 — 알림은 얼마나 방해하느냐로 골라요 */
export default function FeedbackGuide() {
  return (
    <div className="grid trans">
      <Toast />
      <Snackbar />
      <Banner />
      <Modal />
      <BottomSheet />
      <InlineError />
      <Tooltip />
      <CoachMark />
      <Badge />
    </div>
  )
}
