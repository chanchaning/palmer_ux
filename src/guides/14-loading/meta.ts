import type { GuideMeta } from '../registry'

export default {
  id: 'loading',
  num: '14',
  group: '패턴',
  nav: '로딩 패턴',
  eyebrow: 'GUIDE 14 · LOADING',
  title: '기다림을 덜 지루하게 만드는 법',
  desc: '로딩 패턴은 두 가지 질문으로 골라요. 얼마나 기다리나? 그리고 얼마나 기다리는지 알 수 있나? 1초 안이면 표시를 아끼고, 1–4초는 스피너·스켈레톤, 4초가 넘거나 진행률을 알면 진행 바·링·단계를 보여줘요. 카드마다 ↻ 다시 로딩으로 반복해서 볼 수 있어요.',
  stats: [['9', '로딩 패턴'], ['1초 · 4초', '판단 기준'], ['↻', '카드마다 다시 로딩']],
  count: 9,
  motion: true,
} satisfies GuideMeta
