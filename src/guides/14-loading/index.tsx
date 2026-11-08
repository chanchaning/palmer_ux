import './loading.css'
import { Bar, Ring, Skeleton, Spinner } from './cards/indicators'
import { BlurUp, Steps } from './cards/progress'
import { LoadingButton, Optimistic, Stream } from './cards/perceived'

/** GUIDE 14 — 기다림을 덜 지루하게 만드는 법 */
export default function LoadingGuide() {
  return (
    <div className="grid trans">
      <Spinner />
      <Bar />
      <Skeleton />
      <Ring />
      <Steps />
      <BlurUp />
      <Optimistic />
      <Stream />
      <LoadingButton />
    </div>
  )
}
