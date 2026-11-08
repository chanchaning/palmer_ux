import type { GuideMeta } from '../registry'

export default {
  id: 'feedback',
  num: '13',
  group: '컴포넌트',
  nav: '알림과 피드백',
  eyebrow: 'GUIDE 13 · FEEDBACK',
  title: '알림은 얼마나 방해하느냐로 골라요',
  desc: '모든 알림은 사용자의 흐름을 조금씩 끊어요. 몰라도 되는 건 배지·툴팁으로 조용히, 알면 좋은 건 토스트·스낵바로 잠깐, 꼭 알아야 하는 건 배너로 계속, 지금 결정해야 하는 것만 모달로 멈춰 세워요. 카드마다 붙은 방해도(●○○○○)를 보고 심각도·긴급도에 맞는 것을 고르세요.',
  stats: [['9', '피드백 유형'], ['1 – 5', '방해도 단계'], ['LIVE', '전부 실제 동작']],
  count: 9,
  motion: false,
} satisfies GuideMeta
