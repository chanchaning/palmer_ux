import type { GuideMeta } from '../registry'

export default {
  id: 'scroll',
  num: '33',
  group: '모션',
  nav: '스크롤 이벤트',
  eyebrow: 'GUIDE 33 · SCROLL EFFECTS',
  title: '스크롤에 반응하는 9가지 움직임',
  desc: '내리는 만큼 배경이 따로 움직이고, 글자가 밝아지고, 카드가 쌓여요. 카드마다 작은 창이 있으니 그 안에서 직접 스크롤해 보세요. 스크롤을 ‘따라가는’ 움직임과 스크롤에 ‘걸려서 한 번 재생되는’ 움직임이 어떻게 다른지도 같이 보여요.',
  stats: [['9', '스크롤 효과'], ['2', '따라가기 · 한 번 재생'], ['0', '외부 라이브러리']],
  count: 9,
  motion: true,
} satisfies GuideMeta
