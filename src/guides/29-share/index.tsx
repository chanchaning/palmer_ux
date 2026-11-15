import './share.css'
import { AndroidShare, IosShare } from './cards/platform'
import { Forward, Repost, SendTo } from './cards/social'
import { CopyLink, Nearby, QrShare, WebShare } from './cards/channel'

/** GUIDE 29 — 공유에도 종류가 있어요 */
export default function ShareGuide() {
  return (
    <div className="grid trans">
      <IosShare />
      <AndroidShare />
      <Forward />
      <SendTo />
      <CopyLink />
      <Repost />
      <QrShare />
      <Nearby />
      <WebShare />
    </div>
  )
}
