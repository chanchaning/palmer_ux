/* FE 개발 노트 — 100가지 함정 목록 (지도 탭 · 검색 · 딥링크용)
 * 본문(데모·해결 코드)은 src/dev/tabs/<tab>.tsx 에서 같은 id로 그려요. */

export type Sev = 'high' | 'mid' | 'low'
export type Tag = 'React' | 'Vue' | 'Angular' | '공통' | '모바일' | '보안'

export interface DevItem {
  id: string
  tab: string
  num: string
  title: string
  /** 사용자·QA가 보게 되는 모습 한 줄 */
  symptom: string
  sev: Sev
  tags: Tag[]
}

export const SEV_LABEL: Record<Sev, string> = { high: '서비스 중단·보안', mid: '성능·데이터', low: '사용성' }

type Row = [id: string, title: string, symptom: string, sev: Sev, tags: Tag[]]

const T: Record<string, Row[]> = {
  perf: [
    ['perf-infinite', '무한 스크롤 DOM 누적', '오래 내릴수록 스크롤이 버벅이고, 결국 탭이 멈춰요', 'mid', ['공통', '모바일']],
    ['perf-memo', 'useMemo · useCallback 누락과 오남용', '글자 하나 칠 때마다 화면 전체가 다시 그려져요', 'mid', ['React']],
    ['perf-virtual', '대용량 표에 가상화 없음', '행 1만 개 표를 열면 브라우저가 몇 초간 얼어요', 'mid', ['공통']],
    ['perf-listener', '페이지 이동 후 남은 이벤트 리스너', '페이지를 오갈수록 스크롤·리사이즈가 점점 느려져요', 'mid', ['공통']],
    ['perf-lcp', '이미지 지연 로딩 · WebP 실패로 느린 LCP', '첫 화면의 큰 이미지가 한참 늦게 떠요', 'mid', ['공통', '모바일']],
    ['perf-canvas', '영상 위 캔버스 박스로 메인 스레드 점유', '실시간 감지 박스를 그리면 영상과 화면이 뚝뚝 끊겨요', 'mid', ['공통']],
    ['perf-3p', '무거운 서드파티 스크립트로 늦은 TTI', '화면은 떴는데 버튼을 눌러도 한참 반응이 없어요', 'mid', ['공통']],
    ['perf-font', '웹 폰트 지연으로 깜빡임(FOIT/FOUT)과 CLS', '글자가 안 보이다가 나타나며 아래 내용이 덜컥 밀려요', 'low', ['공통']],
    ['perf-tearing', 'Concurrent 렌더링의 화면 찢김(Tearing)', '같은 값을 보여주는 칸들이 서로 다른 숫자를 띄워요', 'mid', ['React']],
    ['perf-transform', 'top · left 애니메이션의 리플로우', '애니메이션이 버벅이고 폰이 뜨거워져요', 'low', ['공통', '모바일']],
  ],
  state: [
    ['state-bloat', '비대해진 전역 상태', '값 하나가 어디서 바뀌는지 아무도 몰라요', 'mid', ['공통']],
    ['state-drilling', 'Props Drilling 지옥', '값 하나 넘기려고 다섯 단계 컴포넌트를 다 고쳐요', 'low', ['공통']],
    ['state-async', '로딩·에러·성공 상태의 파편화', '화면마다 로딩·에러 처리가 제각각이고 빠진 곳이 생겨요', 'mid', ['공통']],
    ['state-race', '두 전역 상태 사이의 레이스 컨디션', '가끔 이전 사용자의 데이터나 옛 필터 결과가 보여요', 'high', ['공통']],
    ['state-storage', '스토리지와 메모리 상태 동기화 실패', '새로고침하면 설정이 사라지거나 앱이 하얗게 멈춰요', 'mid', ['공통']],
    ['state-form', '입력마다 전체 폼 리렌더', '긴 폼에서 타이핑이 한 박자씩 늦게 따라와요', 'low', ['공통']],
    ['state-context', 'Context 값 일부 변경에 전체 리렌더', '테마만 바꿨는데 페이지 전체가 다시 그려져요', 'mid', ['React']],
    ['state-vue-ref', 'Vue ref · reactive 혼용과 .value 누락', '값을 바꿨는데 화면이 안 바뀌거나 [object Object]가 떠요', 'low', ['Vue']],
    ['state-rxjs', 'RxJS 구독 미해제', '화면을 나갔는데도 요청과 로그가 계속 쌓여요', 'mid', ['Angular']],
    ['state-bfcache', '뒤로 가기 시 엉뚱한 상태 (bfcache)', '뒤로 가면 로딩 스피너가 멈춰 있거나 옛 값이 보여요', 'low', ['공통', '모바일']],
  ],
  framework: [
    ['fw-effect-loop', 'useEffect 의존성 객체로 무한 루프', '화면이 깜빡이며 API를 초당 수십 번 불러요', 'high', ['React']],
    ['fw-watch-deep', 'watchEffect의 깊은 추적 루프', '값 하나 바꿨는데 감시 함수가 끝없이 돌아요', 'mid', ['Vue']],
    ['fw-zone', 'Zone.js 변경 감지 과다 실행', '스크롤만 해도 CPU가 치솟아요', 'mid', ['Angular']],
    ['fw-hydration', 'SSR Hydration Mismatch', '새로고침하면 글자가 한 번 바뀌거나 콘솔이 빨개져요', 'mid', ['React', 'Vue']],
    ['fw-mixin', 'Mixin 남용과 이름 충돌', '이 메서드가 어디서 왔는지 아무도 몰라요', 'low', ['Vue']],
    ['fw-circular', '모듈 순환 참조', '어느 날 갑자기 undefined 에러와 빌드 실패가 나요', 'high', ['Angular', '공통']],
    ['fw-key-index', 'key에 배열 index 사용', '항목을 지웠는데 옆 항목의 입력값이 사라져요', 'mid', ['React', 'Vue']],
    ['fw-vif-vshow', 'v-if와 v-show 잘못 고르기', '탭 전환이 느리거나 숨긴 화면이 메모리를 잡아먹어요', 'low', ['Vue']],
    ['fw-hoc', '너무 깊은 HOC 래핑', 'DevTools에서 진짜 컴포넌트를 찾을 수 없어요', 'low', ['React']],
    ['fw-ngmodel', 'ngModel 양방향 바인딩 남용', '값이 어디서 바뀌는지 추적이 안 돼요', 'low', ['Angular']],
  ],
  network: [
    ['net-local-device', '로컬 기기 통신의 Mixed Content · CORS', 'HTTPS 사이트에서 키오스크·센서 연결만 막혀요', 'high', ['공통']],
    ['net-refresh', '토큰 갱신 큐잉 실패로 강제 로그아웃', '여러 요청이 동시에 나가면 갑자기 로그아웃돼요', 'high', ['공통', '보안']],
    ['net-retry', '재시도 · 대체 UI 없음', '잠깐 실패했을 뿐인데 빈 화면이 떠요', 'mid', ['공통']],
    ['net-double', '저장 연타로 중복 호출', '저장을 두 번 눌렀더니 글이 두 개 생겼어요', 'high', ['공통']],
    ['net-graphql-n1', 'GraphQL Under-fetching과 N+1 요청', '목록 하나 여는데 요청이 수십 개 나가요', 'mid', ['공통']],
    ['net-ws', 'WebSocket 재연결 · 누락 이벤트 복구 실패', '와이파이가 잠깐 끊긴 뒤로 실시간 값이 멈춰요', 'high', ['공통']],
    ['net-sse-limit', '탭마다 SSE로 연결 수 제한 초과', '탭을 여러 개 열면 모든 API가 멈춰요', 'high', ['공통']],
    ['net-offline', '오프라인 안내 없음', '터널에서 버튼을 눌러도 아무 반응이 없어요', 'low', ['모바일']],
    ['net-schema', '예고 없는 API 스키마 변경', '배포한 적 없는데 어느 날 화면이 하얗게 죽어요', 'high', ['공통']],
    ['net-interceptor', '인터셉터 에러가 묻힘', '실패했는데 화면엔 아무 안내도 없어요', 'mid', ['공통']],
  ],
  routing: [
    ['rt-refresh-404', '새로고침 시 404 (서버 라우팅 불일치)', '주소창에서 새로고침하면 404가 떠요', 'high', ['공통']],
    ['rt-multitab', '여러 탭 간 세션 · 장바구니 불일치', '한 탭에서 로그아웃했는데 다른 탭은 그대로예요', 'mid', ['공통']],
    ['rt-oauth-param', 'OAuth · 딥링크 파라미터 유실', '로그인하고 돌아오면 원래 가려던 페이지가 아니에요', 'mid', ['공통', '모바일']],
    ['rt-scroll', '뒤로 가기 스크롤 복원 실패', '목록에서 상세 보고 돌아오면 맨 위로 튀어요', 'low', ['공통', '모바일']],
    ['rt-guard-loop', '라우터 가드 무한 리다이렉트', '로그인 페이지가 깜빡이며 멈춰요', 'high', ['공통']],
    ['rt-modal-back', '뒤로 가기에 모달이 아니라 페이지가 닫힘', '모달 닫으려고 뒤로 가기 했더니 페이지를 나가요', 'low', ['모바일']],
    ['rt-chunk', '배포 직후 ChunkLoadError', '배포 직후 어떤 메뉴를 누르면 화면이 안 열려요', 'high', ['공통']],
    ['rt-dirty', '작성 중 이탈 경고 없음', '길게 쓴 글이 메뉴 한 번 눌러서 날아갔어요', 'mid', ['공통']],
    ['rt-query', '쿼리 파라미터 직렬화 · 타입 깨짐', '공유한 필터 링크를 열면 필터가 이상해요', 'low', ['공통']],
    ['rt-mfe', '마이크로 프론트엔드 히스토리 충돌', '뒤로 가기를 두 번 눌러야 하거나 주소가 엉켜요', 'mid', ['공통']],
  ],
  style: [
    ['st-m3-hig', 'M3와 HIG 융합 시 스펙 충돌', '웹과 앱의 글자 크기·여백이 미묘하게 달라요', 'low', ['공통']],
    ['st-important', '!important 남발', '스타일 하나 고치려면 !important를 또 붙여야 해요', 'low', ['공통']],
    ['st-tailwind-dynamic', 'Tailwind 동적 클래스 누락', '개발에선 보이던 색이 운영에서 사라져요', 'mid', ['공통']],
    ['st-css-in-js', 'CSS-in-JS 런타임 오버헤드', '목록 렌더링이 느리고 SSR 설정이 복잡해요', 'low', ['React']],
    ['st-portal', 'overflow: hidden에 갇힌 레이어', '드롭다운·툴팁이 카드 밖으로 못 나가고 잘려요', 'low', ['공통']],
    ['st-dark', '다크 모드에서 이미지 · 차트 · 아이콘 누락', '다크 모드에서 로고와 차트 글자가 안 보여요', 'low', ['공통']],
    ['st-sticky-hover', '모바일 끈적한 hover', '터치한 버튼이 계속 눌린 색으로 남아요', 'low', ['모바일']],
    ['st-i18n', '긴 언어에서 레이아웃 깨짐', '독일어로 바꾸면 버튼 글자가 넘치고 겹쳐요', 'low', ['공통']],
    ['st-a11y', '시맨틱 · aria · 포커스 트랩 누락', '키보드·스크린리더로는 모달을 쓸 수 없어요', 'mid', ['공통']],
    ['st-ellipsis', '말줄임 뒤 전체 글 확인 불가', '잘린 이름의 끝을 볼 방법이 없어요', 'low', ['공통']],
  ],
  form: [
    ['fm-ime', '한글 IME 중복 입력 · 중복 전송', 'Enter를 누르면 마지막 글자가 한 번 더 전송돼요', 'mid', ['공통']],
    ['fm-dynamic', '동적 필드 추가·삭제 시 검증 꼬임', '두 번째 줄을 지웠는데 세 번째 줄에 에러가 떠요', 'mid', ['공통']],
    ['fm-autofill', '비밀번호 자동 완성이 엉뚱한 칸을 채움', '검색창에 내 이메일이 저절로 들어가요', 'low', ['공통']],
    ['fm-number-wheel', 'number 입력칸 휠로 값 변경', '스크롤했을 뿐인데 금액이 바뀌어 저장돼요', 'high', ['공통']],
    ['fm-dnd', '드래그 앤 드롭 기본 동작 미방지', '파일을 놓았더니 현재 창에서 파일이 열려요', 'low', ['공통']],
    ['fm-keyboard', '모바일 키보드가 입력창을 가림', '키보드가 올라오면 입력칸과 버튼이 가려져요', 'mid', ['모바일']],
    ['fm-image-resize', '고해상도 사진 원본 업로드', '사진 한 장 올리는 데 한참 걸리고 서버가 힘들어요', 'mid', ['모바일']],
    ['fm-date-typing', '날짜 직접 입력 시 검증 붕괴', '날짜를 타이핑하면 2월 31일도 저장돼요', 'mid', ['공통']],
    ['fm-enter-submit', 'Enter 키 다중 제출', '버튼은 막았는데 Enter 연타로 주문이 두 번 들어가요', 'high', ['공통']],
    ['fm-controlled', '제어 · 비제어 컴포넌트 혼용', '체크했는데 체크가 안 되거나 경고가 떠요', 'low', ['React']],
  ],
  build: [
    ['bd-slow', '느려지는 개발 서버 · 빌드', '개발 서버 켜는 데 1분, 빌드는 10분 걸려요', 'low', ['공통']],
    ['bd-treeshake', 'Tree Shaking 실패로 거대한 번들', '함수 하나 쓰는데 라이브러리 전체가 들어가요', 'mid', ['공통']],
    ['bd-sourcemap', '운영 소스맵 노출', '누구나 개발자 도구에서 원본 코드를 볼 수 있어요', 'high', ['보안']],
    ['bd-monorepo', '모노레포 Peer · 유령 의존성', '내 PC에선 되는데 CI에선 모듈을 못 찾아요', 'mid', ['공통']],
    ['bd-cdn-cache', 'CDN 캐시 무효화 실패', '배포했는데 사용자는 계속 옛 화면을 봐요', 'high', ['공통']],
    ['bd-spa-fallback', 'S3 · CloudFront SPA 404 Fallback 누락', '서브 주소에서 새로고침하면 화면이 깨져요', 'high', ['공통']],
    ['bd-sw-zombie', 'Service Worker 캐시 좀비', '몇 번을 배포해도 어떤 사용자는 옛 버전 그대로예요', 'high', ['공통']],
    ['bd-env-migrate', 'process.env와 import.meta.env 혼동', 'Vite로 옮기고 나서 환경 변수가 undefined예요', 'mid', ['공통']],
    ['bd-docker-oom', 'Docker 빌드 메모리 부족(OOM)', 'CI에서 빌드가 이유 없이 죽어요 (exit 137)', 'mid', ['공통']],
    ['bd-env-leak', '개발용 .env가 운영에 섞임', '운영 화면이 테스트 서버를 부르고 있어요', 'high', ['보안']],
  ],
  browser: [
    ['br-100vh', '100vh와 모바일 주소창', '하단 버튼이 주소창에 가려 잘려요', 'low', ['모바일']],
    ['br-antialias', 'Mac · Windows 글자 굵기 차이', '윈도우에서 글자가 더 굵고 흐려 보여요', 'low', ['공통']],
    ['br-scrollbar', '커스텀 스크롤바 동작 차이', '디자인한 스크롤바가 기기마다 다르거나 안 보여요', 'low', ['공통']],
    ['br-background', '백그라운드 전환 시 통신 중단', '앱 전환했다 돌아오니 업로드가 실패해 있어요', 'mid', ['모바일']],
    ['br-itp', '서드파티 쿠키 차단으로 iframe 인증 소실', 'Safari에서만 임베드된 화면이 로그인을 잃어요', 'high', ['공통', '보안']],
    ['br-extension', '확장 프로그램의 DOM 변경 충돌', '자동 번역을 켠 사용자만 앱이 멈춰요', 'mid', ['React', 'Vue']],
    ['br-timezone', '타임존 변환 누락으로 날짜 밀림', '밤 11시에 쓴 글이 다음 날 날짜로 찍혀요', 'mid', ['공통']],
    ['br-ghost-click', '터치 지연과 고스트 클릭', '버튼을 누르면 뒤에 있던 것까지 눌려요', 'low', ['모바일']],
    ['br-gap', '구형 브라우저의 gap 미지원', '옛 아이폰에서 카드들이 딱 붙어 보여요', 'low', ['모바일']],
    ['br-safe-area', '노치 · safe-area 처리 누락', '전체 화면에서 글자가 노치와 홈 바에 가려요', 'low', ['모바일']],
  ],
  debug: [
    ['dbg-xss', 'Sanitize 없는 innerHTML로 XSS', '게시글을 열었더니 남의 스크립트가 실행돼요', 'high', ['보안', 'React', 'Vue']],
    ['dbg-console', '운영 콘솔에 토큰 · 개인정보 출력', '콘솔을 열면 내 토큰과 개인정보가 보여요', 'high', ['보안']],
    ['dbg-white', '에러 바운더리 없는 하얀 화면', '어느 한 부분 에러로 화면 전체가 하얘져요', 'high', ['공통']],
    ['dbg-supply', 'npm 공급망 공격', '업데이트 한 번에 빌드 결과물에 악성 코드가 섞여요', 'high', ['보안']],
    ['dbg-storybook', '실제 코드와 어긋난 Storybook', 'Storybook에선 멀쩡한데 실제 화면은 달라요', 'low', ['공통']],
    ['dbg-flaky', '간헐적으로 실패하는 E2E 테스트', '다시 돌리면 통과하는 테스트가 배포를 막아요', 'mid', ['공통']],
    ['dbg-stack', '추적 불가능한 스택 트레이스', '에러 위치가 전부 래퍼 안쪽이라 원인을 못 찾아요', 'low', ['공통']],
    ['dbg-minify', '미니파이로 병목 특정 불가', '프로파일러에 a, b, c 함수만 보여요', 'low', ['공통']],
    ['dbg-analytics', '행동 분석 도구 없음', '"여기서 안 넘어가요" 문의를 재현할 수 없어요', 'mid', ['공통']],
    ['dbg-naming', '같은 컴포넌트 중복 생성', 'SelectBox, Dropdown, Picker가 다 같은 기능이에요', 'low', ['공통']],
  ],
}

export const DEV_ITEMS: DevItem[] = Object.entries(T).flatMap(([tab, rows]) =>
  rows.map(([id, title, symptom, sev, tags], i) => ({ id, tab, num: String(i + 1).padStart(2, '0'), title, symptom, sev, tags })),
)

export const itemById = (id: string) => {
  const it = DEV_ITEMS.find(x => x.id === id)
  if (!it) throw new Error('dev item not found: ' + id)
  return it
}
