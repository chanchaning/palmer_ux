import './platforms.css'
import { useRipple } from './shared'
import { Feel, Spec } from './cards/basics'
import { BottomBar, Dialog, Sheet, Snack, Tabs, TopBar } from './cards/structure'
import { Check, Linear, Radio, Spin, Switch } from './cards/controls'
import { Field, Menu, Picker } from './cards/inputs'
import { OnlyOne } from './cards/only'

function Sec({ k, title, children }: { k: string; title: string; children: string }) {
  return <div className="pf-sec"><i>{k}</i><b>{title}</b><span>{children}</span></div>
}

/** GUIDE 18 — 같은 역할, 다른 이름: 머티리얼 vs HIG */
export default function PlatformsGuide() {
  const ripple = useRipple()
  return (
    <div className="grid pairs" onPointerDown={ripple}>
      <Sec k="A" title="플랫폼 기본기">디자인 넘기기 전에 꼭 맞춰야 하는 숫자와 감각이에요.</Sec>
      <Spec />
      <Feel />
      <Sec k="B" title="기능별 컴포넌트 1:1 명칭 비교">같은 역할, 다른 이름. 카드 제목은 역할이고 왼쪽·오른쪽 라벨이 각 플랫폼의 공식 이름이에요.</Sec>
      <TopBar />
      <BottomBar />
      <Tabs />
      <Dialog />
      <Sheet />
      <Snack />
      <Switch />
      <Radio />
      <Check />
      <Spin />
      <Linear />
      <Menu />
      <Picker />
      <Field />
      <Sec k="C" title="짝이 없는 컴포넌트">짝이 없는 컴포넌트예요. 올려보면 미리보기, 누르면 각 플랫폼 가이드로 가요.</Sec>
      <OnlyOne />
    </div>
  )
}
