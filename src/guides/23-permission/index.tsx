import './permission.css'
import { Camera, Location, Notify } from './cards/basic'
import { Prime, SendToSettings, SystemPrompt } from './cards/flow'
import { DeniedState, Partial, ReAsk } from './cards/after'

/** GUIDE 23 — 권한 요청 */
export default function PermissionGuide() {
  return (
    <div className="grid trans">
      <Notify />
      <Location />
      <Camera />
      <Prime />
      <SystemPrompt />
      <SendToSettings />
      <ReAsk />
      <Partial />
      <DeniedState />
    </div>
  )
}
