import type { GuideMeta } from '../registry'

export default {
  id: 'permission',
  num: '23',
  group: '패턴',
  nav: '권한 요청',
  eyebrow: 'GUIDE 23 · PERMISSION',
  title: '허용 창에도 이름이 있어요',
  desc: '알림·위치·카메라를 쓰려면 운영체제(OS)가 띄우는 허용 창을 거쳐야 해요. 이 창은 앱 마음대로 꾸밀 수 없고, 거절하면 다시 띄울 기회도 거의 없어요. 그래서 언제 묻는지, 묻기 전에 무엇을 말하는지, 거절한 뒤 화면이 어떻게 버티는지가 더 중요해요. 몇몇 카드는 iOS 스타일과 Android 스타일 창을 바꿔 볼 수 있어요.',
  stats: [['9', '권한 장면'], ['1번 · 2번', '시스템 창 기회 (iOS · Android)'], ['1줄', '앱이 고칠 수 있는 문구']],
  count: 9,
} satisfies GuideMeta
