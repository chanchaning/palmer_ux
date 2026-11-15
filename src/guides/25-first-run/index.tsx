import './first-run.css'
import { Onboarding, QuickLogin, Splash } from './cards/start'
import { ProfileSetup, Skeleton, Terms } from './cards/setup'
import { CoachMark, PermissionInContext, Welcome } from './cards/home'

/** GUIDE 25 — 첫 실행 화면 (권장 순서대로) */
export default function FirstRunGuide() {
  return (
    <div className="grid trans">
      <Splash />
      <Onboarding />
      <QuickLogin />
      <Terms />
      <ProfileSetup />
      <Skeleton />
      <Welcome />
      <CoachMark />
      <PermissionInContext />
    </div>
  )
}
