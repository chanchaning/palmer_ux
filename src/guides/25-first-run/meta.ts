import type { GuideMeta } from '../registry'

export default {
  id: 'first-run',
  num: '25',
  group: '패턴',
  nav: '첫 실행 화면',
  eyebrow: 'GUIDE 25 · FIRST RUN',
  title: '첫 화면에도 정해진 순서가 있어요',
  desc: '앱을 처음 연 사람은 보통 스플래시 → 온보딩 → 간편 로그인 → 약관 동의 → 프로필 설정 → 첫 로딩(스켈레톤) → 웰컴 화면 순서로 지나가요. 코치마크와 권한 요청은 그다음, 필요한 순간에 하나씩 꺼내요. 다만 모든 앱에 모든 단계가 필요하진 않아요. 카드마다 위쪽 점 줄이 지금 몇 번째 단계인지 알려주고, 속이 빈 점은 앱에 따라 빼도 되는 단계예요.',
  stats: [['9', '첫 실행 단계'], ['3', '거의 모든 앱이 거치는 단계'], ['1', '웰컴 화면의 다음 행동']],
  count: 9,
} satisfies GuideMeta
