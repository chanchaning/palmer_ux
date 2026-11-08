import type { GuideMeta } from '../registry'

export default {
  id: 'contrast',
  num: '20',
  group: '원칙',
  nav: '색상 대비',
  eyebrow: 'GUIDE 20 · CONTRAST',
  title: '읽히는 색은 숫자로 확인해요',
  desc: '글자색과 배경색의 밝기 차이(대비율)가 충분해야 누구나 읽을 수 있어요. 맨 위 테스트기에 색을 넣어 바로 검사하고, 아래 카드에서 기준과 함정을 익혀보세요. 이 가이드는 WCAG 2.1 AA를 기준으로 판정해요.',
  stats: [['4.5:1', '본문 AA'], ['3:1', '큰 글씨 · UI'], ['21:1', '최대 대비']],
  count: 11,
} satisfies GuideMeta
