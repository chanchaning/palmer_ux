import type { GuideMeta } from '../registry'

export default {
  id: 'button-state',
  num: '28',
  group: '컴포넌트',
  nav: '버튼 상태',
  eyebrow: 'GUIDE 28 · BUTTON STATES',
  title: '버튼 하나에도 상태가 9가지예요',
  desc: '버튼은 가만히 있을 때, 마우스가 올라왔을 때, 키보드로 들어왔을 때, 누를 때, 켜 뒀을 때, 못 누를 때, 기다릴 때, 성공했을 때, 실패했을 때마다 모습이 달라요. 카드마다 진짜 버튼을 눌러 보고, 위 토글로 흔한 실수와 비교해 보세요. 디자인 시스템의 상태 탭과 같은 값(호버 12%, 눌림 22% · 97%, 포커스 링 2px)을 써요.',
  stats: [['9', '버튼 상태'], ['100ms', '눌림 반응'], ['3:1', '포커스 링 대비']],
  count: 9,
} satisfies GuideMeta
