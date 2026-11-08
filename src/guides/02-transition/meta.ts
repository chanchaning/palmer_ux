import type { GuideMeta } from '../registry'

export default {
  id: 'transition',
  num: '02',
  group: '모션',
  nav: '화면 전환 방식',
  eyebrow: 'GUIDE 02 · MOTION',
  title: '눌렀을 때 넘어가는 방식이 달라요',
  desc: '같은 ‘다음 화면’이라도 어떻게 넘어가느냐에 따라 사용자가 느끼는 관계가 달라져요. 폰 안을 직접 눌러보거나 ▶ 다시 보기로 재생하세요. 상단 🐢 슬로우 모션을 켜면 4배 느리게 볼 수 있어요.',
  stats: [['9', '전환 방식'], ['200–400ms', '권장 시간'], ['4×', '슬로우 모션']],
  count: 9,
  motion: true,
} satisfies GuideMeta
