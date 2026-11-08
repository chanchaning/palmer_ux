import type { GuideMeta } from '../registry'

export default {
  id: 'gesture',
  num: '10',
  group: '모션',
  nav: '제스처',
  eyebrow: 'GUIDE 10 · GESTURE',
  title: '손가락으로 말하는 9가지 방법',
  desc: '제스처는 ‘얼마나 오래, 얼마나 멀리, 얼마나 빠르게’를 재서 판정해요. 마우스나 손가락으로 직접 해보면 아래 문구가 무엇을 감지했는지 알려줘요. ▶ 다시 보기를 누르면 주황 손가락이 시범을 보여요.',
  stats: [['9', '제스처'], ['10px · 500ms', '탭 판정 기준'], ['마우스 + 터치', '모두 동작']],
  count: 9,
  motion: true,
} satisfies GuideMeta
