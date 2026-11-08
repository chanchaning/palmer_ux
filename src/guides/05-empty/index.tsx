import './empty.css'
import { FirstUse, NoResults, OverFiltered } from './cards/onboard'
import { ErrorState, Offline, Permission } from './cards/system'
import { AllDone, JustDeleted, Locked } from './cards/result'

/** GUIDE 05 — 빈 화면 */
export default function EmptyGuide() {
  return (
    <div className="grid trans">
      <FirstUse />
      <NoResults />
      <OverFiltered />
      <Offline />
      <Permission />
      <AllDone />
      <JustDeleted />
      <ErrorState />
      <Locked />
    </div>
  )
}
