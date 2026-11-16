import type { GuideMeta } from '../registry'

export default {
  id: 'hover',
  num: '34',
  group: '모션',
  nav: '호버 이펙트',
  eyebrow: 'GUIDE 34 · HOVER EFFECTS',
  title: '커서를 올리면 반응하는 10가지',
  desc: '카드가 떠오르고, 밑줄이 그어지고, 설명이 올라와요. 호버는 ‘이건 누를 수 있어요’를 누르기 전에 알려주는 신호예요. 커서를 올려 보면서, 어디까지가 친절한 신호이고 어디부터가 정보를 숨기는 일인지 같이 보세요. 터치 화면에서는 톡 누르면 잠깐 보여요.',
  stats: [['10', '호버 효과'], ['100–300ms', '반응 시간'], ['0', '외부 라이브러리']],
  count: 10,
  motion: true,
} satisfies GuideMeta
