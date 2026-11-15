/* 03 프레임워크 함정 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './framework.css'
import { CircularDemo, EffectLoopDemo, HocDemo, HydrationDemo, KeyIndexDemo, MixinDemo, NgModelDemo, VifDemo, WatchDeepDemo, ZoneDemo } from './framework-demos'

export default function FrameworkTab() {
  return (
    <div data-dev="framework">
      <TabIntro>
        프레임워크는 <b>의존성 추적, 변경 감지, DOM 재사용</b>을 알아서 해 줘요. 이 탭의 함정은 그 ‘알아서’가 내 예상과 다르게 돌 때 생겨요.
        React 항목(01·07·09)과 04는 이 페이지에서 <b>진짜 React로</b> 재현하고, Vue·Angular 항목은 같은 원리로 만든 작은 시뮬레이션이에요. 데모마다 아래에 어느 쪽인지 적어 뒀어요.
      </TabIntro>

      <Issue id="fw-effect-loop"
        demo={f => <EffectLoopDemo fixed={f} />}
        demoNote={<>실제 React로 재현해요. 40ms 걸리는 가짜 API를 부르고, 페이지가 멈추지 않게 <b>50번에서 강제로</b> 멈춰요. 개발 모드(StrictMode)라 해결 모드에서도 effect가 처음에 한 번 더 돌아서 ‘2번’으로 보여요.</>}
        cause={<>
          <p>React는 의존성 배열의 값을 <code>Object.is</code>로 비교해요. 그런데 <code>{'{ id, fields }'}</code> 같은 객체·배열을 컴포넌트 안에서 만들면 <b>렌더할 때마다 새 객체</b>라서 내용이 같아도 ‘바뀌었다’고 판단해요.</p>
          <p>그래서 <b>effect 실행 → API 응답으로 setState → 다시 렌더 → 새 객체 → effect 실행</b>이 끝없이 돌아요. 화면은 ‘불러오는 중’과 결과 사이를 깜빡이고, 서버에는 같은 요청이 초당 수십 번 쏟아져요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function Profile({ userId }) {
  const [user, setUser] = useState(null)
- const query = { id: userId, fields: ['name', 'avatar'] }

  useEffect(() => {
    api.getUser(query).then(setUser)
- }, [query])   // 렌더마다 새 객체 → 매번 실행

  return <Card user={user} />
}`,
          good: `
function Profile({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
+   const ac = new AbortController()
+   const query = { id: userId, fields: ['name', 'avatar'] }
+   api.getUser(query, { signal: ac.signal }).then(setUser).catch(ignoreAbort)
+   return () => ac.abort()
+ }, [userId])  // 원시값만 의존해요

  return <Card user={user} />
}`,
        }}
        root={<>
          <p>의존성에는 <b>원시값(id, 문자열, 숫자)만</b> 넣는 걸 기본으로 해요. 객체가 꼭 필요하면 effect 안에서 만들거나 <code>useMemo</code>로 고정해요. <b>React Compiler</b>를 쓰면 이런 메모이제이션을 빌드 단계에서 자동으로 넣어 줘요.</p>
          <p>서버 데이터를 effect로 직접 불러오는 것 자체를 줄여요. <b>TanStack Query</b>의 <code>{"useQuery({ queryKey: ['user', userId], queryFn })"}</code>는 키를 내용으로 비교하고, 같은 요청을 합치고, 캐시까지 해 줘요.</p>
        </>}
        prevent={[
          <><code>react-hooks/exhaustive-deps</code>를 켜요. ‘이 객체가 렌더마다 의존성을 바꿔요’ 경고를 그대로 잡아 줘요</>,
          <>화면을 연 뒤 네트워크 탭에서 <b>같은 요청이 두 번 넘게</b> 나가는지 확인해요</>,
          <>API 클라이언트에 개발 모드 전용 경고(같은 주소를 1초에 10번 넘게 부르면 콘솔 경고)를 넣어 둬요</>,
        ]}
        ours={<><code>main.tsx</code>에서 <b>StrictMode</b>를 켜 둬서 개발 중엔 effect가 마운트 때 한 번 더 실행돼요. 해결 모드의 ‘effect 실행 2번’이 그 흔적이고, 운영 빌드에선 1번이에요.</>}
        links={[['#/dev/perf/perf-memo', '01 useMemo · useCallback 누락과 오남용'], ['#/dev/state/state-async', '02 로딩·에러·성공 상태의 파편화'], ['#/dev/framework/fw-watch-deep', '03 watchEffect의 깊은 추적 루프']]}
      />

      <Issue id="fw-watch-deep"
        demo={f => <WatchDeepDemo fixed={f} />}
        demoNote={<>Vue를 불러오지 않고, Vue와 같은 원리(Proxy로 <b>읽은 값을 기록</b>하고 그 값이 바뀌면 다시 실행)로 만든 작은 반응형 엔진이에요. 30번에서 강제로 멈춰요.</>}
        cause={<>
          <p><code>watchEffect</code>는 실행 중에 <b>읽은 반응형 값을 전부</b> 의존성으로 기록해요. <code>JSON.stringify(form)</code>, 펼침 연산자, <code>for…in</code>처럼 객체를 통째로 훑으면 안쪽 값까지 모두 추적돼요. 결과를 담는 <code>form.result</code>도 포함해서요.</p>
          <p>그다음 <code>await</code> 뒤에서 <code>form.result</code>를 바꾸면, 방금 추적한 값이 바뀌었으니 감시 함수가 다시 돌아요. Vue는 실행 <b>도중</b>에 자기 자신을 다시 깨우는 건 막아 주지만, <code>await</code> 뒤는 이미 실행이 끝난 뒤라 못 막아요. 그래서 <b>요청 → 결과 저장 → 다시 요청</b>이 끝없이 이어져요.</p>
        </>}
        quick={{
          lang: 'Vue 3 · <script setup>',
          bad: `
const form = reactive({ keyword: '', page: 1, result: null })

watchEffect(async () => {
- const body = JSON.stringify(form)   // result 까지 전부 추적돼요
  const res = await api.search(body)
- form.result = res                   // 추적 중인 값을 직접 바꿔요 → 다시 실행
})`,
          good: `
const form = reactive({ keyword: '', page: 1 })
+ const result = ref(null)            // 결과는 입력과 따로

+ watch(
+   () => [form.keyword, form.page],  // 필요한 값만 골라서 감시
+   async ([keyword, page], _old, onCleanup) => {
+     const ac = new AbortController()
+     onCleanup(() => ac.abort())     // 이전 요청은 취소
+     result.value = await api.search({ keyword, page }, ac.signal)
+   },
+   { immediate: true },
+ )`,
        }}
        root={<>
          <p><b>입력 상태와 결과 상태를 나눠요</b>. 감시 함수가 쓰는 값과 읽는 값이 겹치지 않으면 루프가 생길 수 없어요. 값에서 값을 만드는 거라면 감시 대신 <code>computed</code>를 써요.</p>
          <p>무엇을 감시할지 드러나는 <code>watch(소스, 콜백)</code>를 기본으로 하고, <code>deep: true</code>는 정말 필요할 때만 써요. 검색처럼 서버 데이터를 다루면 <code>@tanstack/vue-query</code> 같은 라이브러리가 취소·중복 제거까지 맡아 줘요.</p>
        </>}
        prevent={[
          <>개발 중엔 <code>{'watchEffect(fn, { onTrigger(e) { debugger } })'}</code>로 무엇이 다시 실행을 일으켰는지 확인해요</>,
          <>리뷰 기준: 감시 함수 안에서 <b>감시 대상 자신을 바꾸는 코드</b>는 막아요</>,
          <>Vue DevTools의 타임라인에서 같은 감시자가 계속 찍히는지 봐요</>,
        ]}
        links={[['#/dev/state/state-vue-ref', '02 Vue ref · reactive 혼용'], ['#/dev/framework/fw-effect-loop', '03 useEffect 의존성 객체로 무한 루프']]}
      />

      <Issue id="fw-zone"
        demo={f => <ZoneDemo fixed={f} />}
        demoNote={<>Angular·Zone.js를 불러오지 않은 시뮬레이션이에요. 스크롤·타이머 이벤트는 진짜고, ‘Zone 안의 비동기 작업이 끝날 때마다 앱 전체를 확인’하는 규칙을 그대로 셈해요. 시계 타이머는 이 카드가 화면에 보일 때만 돌아요.</>}
        cause={<>
          <p>Zone.js는 <code>setTimeout</code>, <code>addEventListener</code>, Promise 같은 비동기 작업을 전부 가로채서 <b>끝날 때마다 변경 감지</b>를 돌려요. 무엇이 바뀌었는지 모르니 기본 전략(Default)에선 <b>모든 컴포넌트의 바인딩</b>을 다시 확인해요.</p>
          <p>그래서 스크롤(초당 수십 번), <code>mousemove</code>, 서드파티 위젯의 짧은 <code>setInterval</code>이 있으면 화면이 전혀 안 바뀌어도 변경 감지가 계속 돌아요. 컴포넌트가 많을수록 CPU가 치솟고 폰이 뜨거워져요.</p>
        </>}
        quick={{
          lang: 'Angular',
          bad: `
@Component({ selector: 'app-feed', templateUrl: './feed.html' })
export class FeedComponent {
  showTop = false

- @HostListener('window:scroll')
- onScroll() {                      // 스크롤마다 앱 전체 변경 감지
-   this.showTop = window.scrollY > 600
- }
}`,
          good: `
@Component({
  selector: 'app-feed', templateUrl: './feed.html',
+ changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedComponent {
  private zone = inject(NgZone)
  private destroyRef = inject(DestroyRef)
+ showTop = signal(false)

  constructor() {
+   this.zone.runOutsideAngular(() =>
+     fromEvent(window, 'scroll', { passive: true }).pipe(
+       map(() => window.scrollY > 600),
+       distinctUntilChanged(),            // 바뀔 때만
+       takeUntilDestroyed(this.destroyRef),
+     ).subscribe(v => this.zone.run(() => this.showTop.set(v))))
  }
}`,
        }}
        root={<>
          <p>컴포넌트는 <b>OnPush + signal</b>을 기본으로 해요. 입력값이 바뀌거나 템플릿이 읽는 signal이 바뀐 가지만 확인해요. 스크롤·캔버스·지도·차트 라이브러리처럼 자주 이벤트를 내는 코드는 <code>runOutsideAngular</code> 안에서 시작해요.</p>
          <p>앱 설정에서 <code>{'provideZoneChangeDetection({ eventCoalescing: true })'}</code>로 같은 틱의 이벤트를 묶을 수 있어요. 최신 Angular는 Zone.js 없이 signal로만 갱신하는 <b>zoneless</b> 모드도 제공해요(버전마다 이름과 안정화 단계가 달라서 쓰는 버전의 문서를 확인해요).</p>
        </>}
        prevent={[
          <><b>Angular DevTools Profiler</b>로 스크롤 한 번에 변경 감지가 몇 번 도는지 확인해요</>,
          <><code>@angular-eslint/prefer-on-push-component-change-detection</code> 규칙을 켜요</>,
          <>서드파티 위젯을 넣을 땐 Performance 탭에서 가만히 있을 때도 메인 스레드가 바쁜지 봐요</>,
        ]}
        links={[['#/dev/perf/perf-listener', '01 페이지 이동 후 남은 이벤트 리스너'], ['#/dev/state/state-rxjs', '02 RxJS 구독 미해제']]}
      />

      <Issue id="fw-hydration"
        demo={f => <HydrationDemo fixed={f} />}
        demoNote={<>실제 <code>react-dom/server</code>의 <code>renderToString</code>으로 ‘서버 HTML’을 만들고 <code>hydrateRoot</code>로 붙여요. 서버 환경(UTC · en-US · window 없음)만 흉내 냈고, 에러는 <code>onRecoverableError</code>로 받아 여기 보여줘요.</>}
        cause={<>
          <p>SSR은 서버가 HTML을 먼저 보내고, 브라우저가 같은 컴포넌트를 한 번 더 그려서 이벤트를 붙여요(<Term k="Hydration" d="서버가 보낸 HTML 위에 브라우저의 JS가 같은 화면을 다시 계산해서 이벤트와 상태를 붙이는 단계예요." />). 이때 <b>두 결과가 글자 하나라도 다르면</b> 불일치예요.</p>
          <p>흔한 원인은 <code>Date</code>(서버는 UTC, 사용자는 한국 시간), <code>Math.random()</code>, <code>toLocaleString</code>의 언어 차이, <code>typeof window</code> 분기예요. React는 서버 HTML을 <b>버리고 처음부터 다시 그려서</b> 글자가 한 번 바뀌고 첫 화면이 느려지며, Vue는 경고를 띄우고 어긋난 부분을 고쳐요.</p>
        </>}
        quick={{
          lang: 'React (SSR)',
          bad: `
function DealBanner() {
  return (
    <div>
-     <b>{new Date().toLocaleTimeString()}</b>   {/* 서버 UTC ≠ 브라우저 KST */}
-     <b>{Math.random().toString(36).slice(2, 8)}</b>
-     <b>{typeof window === 'undefined' ? '웹' : detectDevice()}</b>
    </div>
  )
}`,
          good: `
+ const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', timeStyle: 'medium' })
+ const noop = () => () => {}

function DealBanner({ endsAt, coupon }) {   // 서버가 정한 값을 props로
+ const isClient = useSyncExternalStore(noop, () => true, () => false)
  return (
    <div>
+     <b>{fmt.format(endsAt)}</b>
+     <b>{coupon}</b>
+     <b>{isClient ? detectDevice() : '…'}</b>  {/* 브라우저 전용은 hydration 뒤에 */}
    </div>
  )
}`,
        }}
        root={<>
          <p>렌더 함수는 <b>같은 입력이면 같은 결과</b>여야 해요. 시간·난수는 서버에서 정해서 데이터로 내려보내고, 날짜는 시간대와 언어를 고정해서 포맷해요. id는 <code>useId</code>로 만들어요.</p>
          <p>기기 크기·localStorage처럼 브라우저에만 있는 값은 hydration 뒤에 읽어요(Next.js의 <code>{'dynamic(…, { ssr: false })'}</code>, Nuxt의 <code>&lt;ClientOnly&gt;</code>). 어쩔 수 없이 다른 한 칸은 React <code>suppressHydrationWarning</code>, Vue 3.5+ <code>data-allow-mismatch</code>로 그 칸만 허용해요.</p>
        </>}
        prevent={[
          <>E2E 테스트에서 페이지를 연 뒤 콘솔에 <b>hydration 에러가 0개</b>인지 검사해요</>,
          <>CI에서 서버를 <code>TZ=UTC</code>, 브라우저를 <code>Asia/Seoul</code>로 다르게 두고 돌려 봐요</>,
          <>리뷰 기준: 렌더 중에 <code>Date.now()</code> · <code>Math.random()</code> · <code>window</code>를 직접 읽지 않아요</>,
        ]}
        ours={<>이 사이트는 SSR 없이 <b>Vite SPA</b>로 빌드해서 hydration 단계 자체가 없어요. 그래서 위 데모는 브라우저 안에서 <code>renderToString</code>으로 서버 HTML을 만들어 재현해요.</>}
        links={[['#/dev/browser/br-timezone', '09 타임존 변환 누락'], ['#/dev/browser/br-extension', '09 확장 프로그램의 DOM 변경 충돌'], ['#/loading/loading-skeleton', '14 로딩 패턴 · 스켈레톤']]}
      />

      <Issue id="fw-mixin"
        demo={f => <MixinDemo fixed={f} />}
        demoNote={<>Vue 3의 옵션 병합 규칙(methods는 <b>나중 것이 덮어쓰기</b>, data는 얕게 합치기, 훅은 모두 실행)을 그대로 옮긴 시뮬레이션이에요. 문제 모드에서 mixins 순서를 바꿔 보세요.</>}
        cause={<>
          <p>mixin은 다른 파일의 data·methods·훅을 컴포넌트에 <b>몰래 섞어 넣어요</b>. 템플릿의 <code>format()</code>이나 <code>this.loading</code>만 봐서는 어느 파일에서 왔는지 알 수 없고, 에디터의 ‘정의로 이동’도 잘 안 돼요.</p>
          <p>이름이 겹치면 Vue는 경고 없이 <b>나중에 섞인 쪽이 이겨요</b>(컴포넌트 자신이 가장 셈). 그래서 mixin 순서를 바꾸거나 mixin 안에 메서드 하나를 추가했을 뿐인데, 전혀 다른 화면의 가격이 날짜로 찍히는 일이 생겨요.</p>
        </>}
        quick={{
          lang: 'Vue 3',
          bad: `
<script>
import currency from '@/mixins/currency'
import date from '@/mixins/date'
import tracking from '@/mixins/tracking'

export default {
- mixins: [currency, date, tracking],  // format · loading 이 둘 다 있어요
  props: ['price'],
}
</script>
<template>
- <b>{{ format(price) }}</b>  <!-- 누구의 format? -->
</template>`,
          good: `
<script setup>
+ import { useCurrency } from '@/composables/useCurrency'
+ import { useDate } from '@/composables/useDate'

const props = defineProps(['price'])
+ const { formatPrice, loading: rateLoading } = useCurrency()
+ const { formatDate } = useDate()
</script>
<template>
+ <b>{{ formatPrice(props.price) }}</b>
</template>`,
        }}
        root={<>
          <p>Vue 3에선 mixin 대신 <b>컴포저블(use○○ 함수)</b>을 써요. import와 구조 분해로 이름이 어디서 왔는지 코드에 드러나고, 겹치면 <code>loading: rateLoading</code>처럼 바꿔 부르면 돼요. 공식 문서도 같은 이유로 컴포저블을 권해요.</p>
          <p>한 번에 다 못 바꾸면 mixin 안의 로직을 컴포저블로 옮기고, 옛 Options API 컴포넌트에선 <code>setup()</code> 옵션에서 그 컴포저블을 불러 쓰며 천천히 옮겨요. <code>app.mixin()</code> 전역 mixin은 가장 먼저 없애요.</p>
        </>}
        prevent={[
          <><code>eslint-plugin-vue</code>의 <code>vue/no-restricted-component-options</code>로 새 코드의 <code>mixins</code> 옵션을 막아요</>,
          <>리뷰 기준: 새 공용 로직은 <code>composables/</code> 아래 <code>use○○</code>로만 만들어요</>,
          <>남은 mixin 목록과 쓰는 컴포넌트 수를 문서로 두고 분기마다 줄여요</>,
        ]}
        links={[['#/dev/framework/fw-hoc', '03 너무 깊은 HOC 래핑'], ['#/dev/debug/dbg-naming', '10 같은 컴포넌트 중복 생성']]}
      />

      <Issue id="fw-circular"
        demo={f => <CircularDemo fixed={f} />}
        demoNote={<>ES 모듈 실행 순서(깊이 우선, 실행 중인 모듈은 건너뛰기)를 그대로 따라가는 시뮬레이터예요. 번들러·Jest(CommonJS) 결과에선 <code>undefined</code>, 브라우저 ES 모듈에선 <code>ReferenceError</code>로 나타나요.</>}
        cause={<>
          <p>A가 B를, B가 다시 A를 import 하면 한쪽은 <b>상대가 아직 실행을 마치기 전</b>에 그 값을 읽게 돼요. 이미 ‘실행 중’인 모듈은 건너뛰니까요. 그 순간 값은 비어 있어서 <code>Cannot read properties of undefined</code>나 <code>Cannot access 'ROLES' before initialization</code>이 나요.</p>
          <p>무서운 건 <b>누가 먼저 import 되느냐</b>에 따라 터지는 쪽이 바뀐다는 거예요. 상관없어 보이는 파일에 import 한 줄(새 가드, 새 barrel <code>index.ts</code>)이 늘었을 뿐인데 어느 날 갑자기 깨져요. Angular에선 서비스끼리 서로 주입하면 <code>NG0200: Circular dependency in DI</code> 에러도 나요.</p>
        </>}
        quick={{
          lang: 'Angular · TypeScript',
          bad: `
// auth.service.ts
import { UserService } from './user.service'
export const ROLES = { guest: '손님', admin: '관리자' }
@Injectable({ providedIn: 'root' })
export class AuthService { private users = inject(UserService) }

// user.service.ts
- import { ROLES } from './auth.service'   // ↔ 서로 import
- export const DEFAULT_ROLE = ROLES.guest   // 불러오는 순간 바로 읽어요
@Injectable({ providedIn: 'root' })
export class UserService { role = DEFAULT_ROLE }`,
          good: `
+ // roles.ts — 아무것도 import 하지 않는 맨 아래층
+ export const ROLES = { guest: '손님', admin: '관리자' } as const

// auth.service.ts
import { UserService } from './user.service'
+ import { ROLES } from './roles'

// user.service.ts
+ import { ROLES } from './roles'
export const DEFAULT_ROLE = ROLES.guest`,
        }}
        root={<>
          <p>의존 방향을 <b>층으로 정해요</b>. 상수·타입 → 유틸 → 서비스 → 화면 순서로만 import 하고, 둘이 함께 쓰는 건 아래층 파일로 내려요. 같은 기능 폴더 안에서 barrel(<code>index.ts</code>)로 다시 import 하는 습관이 숨은 고리를 많이 만들어요.</p>
          <p>타입만 필요하면 <code>import type</code>을 써요. 실행 코드에서 지워져서 고리가 생기지 않아요. 모노레포라면 Nx의 <code>@nx/enforce-module-boundaries</code>처럼 층 규칙을 도구로 강제해요.</p>
        </>}
        prevent={[
          <>CI에서 <code>npx madge --circular --extensions ts src</code>를 돌려 고리가 하나라도 있으면 실패시켜요</>,
          <>ESLint <code>import/no-cycle</code> 규칙을 켜요</>,
          <>Angular에선 서비스가 서로를 <code>inject</code> 하면 리뷰에서 막고, 공통 부분을 세 번째 서비스로 빼요</>,
        ]}
        links={[['#/dev/build/bd-treeshake', '08 Tree Shaking 실패로 거대한 번들'], ['#/dev/debug/dbg-stack', '10 추적 불가능한 스택 트레이스']]}
      />

      <Issue id="fw-key-index"
        demo={f => <KeyIndexDemo fixed={f} />}
        demoNote={<>실제 React예요. 메모 칸은 비제어 입력(<code>defaultValue</code>)이라 값이 React 상태가 아니라 <b>DOM 안에</b> 있어요.</>}
        cause={<>
          <p><code>key</code>는 ‘이 줄이 아까 그 줄이다’를 알려 주는 이름표예요. index를 key로 쓰면 맨 위 줄을 지웠을 때 <b>바나나가 0번 이름표를 물려받아요</b>. React는 0번 줄의 DOM과 상태를 그대로 두고 글자만 바꿔서, 사과의 메모가 바나나 옆에 남아요.</p>
          <p>마지막 3번 이름표는 사라졌다고 보고 <b>포도 줄의 DOM을 지워요</b>. 그래서 엉뚱한 메모가 사라지죠. 입력값, 체크 상태, 포커스, 애니메이션, 자식 컴포넌트의 상태가 모두 똑같이 밀려요. Vue의 <code>v-for</code>도 같아요.</p>
        </>}
        quick={{
          lang: 'React · Vue',
          bad: `
{items.map((item, index) => (
- <li key={index}>
    {item.name}
    <input defaultValue="" placeholder="메모" />
    <button onClick={() => remove(item.id)}>삭제</button>
  </li>
))}

<!-- Vue -->
- <li v-for="(item, index) in items" :key="index">`,
          good: `
{items.map(item => (
+ <li key={item.id}>
    {item.name}
    <input defaultValue="" placeholder="메모" />
    <button onClick={() => remove(item.id)}>삭제</button>
  </li>
))}

<!-- Vue -->
+ <li v-for="item in items" :key="item.id">`,
        }}
        root={<>
          <p>key는 <b>데이터가 가진 변하지 않는 id</b>로 해요. 서버 id가 없으면 항목을 <b>만들 때</b> <code>crypto.randomUUID()</code>로 붙여 두고, 렌더할 때 만들지 않아요(<code>key={'{Math.random()}'}</code>는 매번 새로 그려요).</p>
          <p>줄마다 입력값이 있다면 그 값을 id 기준 상태로 올려서(제어 컴포넌트, 폼 라이브러리의 <code>useFieldArray</code> 등) DOM에만 남지 않게 해요. index key는 <b>순서가 절대 안 바뀌는 정적 목록</b>에서만 괜찮아요.</p>
        </>}
        prevent={[
          <><code>react/no-array-index-key</code>(eslint-plugin-react · oxlint) 규칙을 켜요</>,
          <>Vue는 <code>vue/require-v-for-key</code>와 함께 ‘index를 key로 쓰지 않기’를 리뷰 기준에 넣어요</>,
          <>E2E 테스트: <b>가운데 줄을 지운 뒤</b> 이웃 줄의 입력값이 그대로인지 확인해요</>,
        ]}
        links={[['#/dev/form/fm-dynamic', '07 동적 필드 추가·삭제 시 검증 꼬임'], ['#/collection/col-list', '22 목록 보여주기 · 리스트']]}
      />

      <Issue id="fw-vif-vshow"
        demo={f => <VifDemo fixed={f} />}
        demoNote={<>Vue의 <code>v-if</code>(조건부 렌더)와 <code>v-show</code>(<code>display: none</code>)를 React로 똑같이 흉내 냈어요. 차트 초기화 비용은 14ms 계산으로 넣었고, 시간과 DOM 수는 실제로 잰 값이에요(개발 모드라 초기화가 두 번 돌 수 있어요).</>}
        cause={<>
          <p><code>v-if</code>는 조건이 바뀔 때마다 컴포넌트를 <b>없애고 새로 만들어요</b>. setup이 다시 돌고, 차트 라이브러리를 다시 초기화하고, 데이터를 다시 불러와요. 자주 오가는 탭에 쓰면 전환할 때마다 버벅여요.</p>
          <p><code>v-show</code>는 처음에 <b>전부 만들어 두고</b> CSS로 숨기기만 해요. 전환은 빠르지만, 거의 열지 않는 무거운 화면에 쓰면 첫 로딩이 느려지고 숨긴 DOM이 메모리를 계속 잡아요. 숨긴 상태로 만든 차트는 크기가 0으로 재져서 깨지기도 해요.</p>
        </>}
        quick={{
          lang: 'Vue 3',
          bad: `
<template>
- <SalesChart v-if="tab === 'sales'" />     <!-- 탭 바꿀 때마다 새로 만들어요 -->
- <VisitChart v-if="tab === 'visit'" />
- <AdvancedSettings v-show="openAdvanced" /> <!-- 안 열어도 처음부터 만들어요 -->
</template>`,
          good: `
<template>
+ <SalesChart v-show="tab === 'sales'" />    <!-- 한 번 만들고 숨기기만 -->
+ <VisitChart v-show="tab === 'visit'" />
+ <AdvancedSettings v-if="openAdvanced" />  <!-- 열 때만 만들어요 -->

  <!-- 또는 동적 컴포넌트를 캐시해요 -->
+ <KeepAlive :max="3">
+   <component :is="panels[tab]" />
+ </KeepAlive>
</template>`,
        }}
        root={<>
          <p>기준은 두 가지예요. <b>자주 바뀌면 v-show, 거의 안 바뀌면 v-if</b>. 무겁고 자주 오가지만 처음엔 안 보이는 화면은 ‘처음 열 때 v-if로 만들고, 그 뒤로는 v-show’로 섞거나 <code>&lt;KeepAlive :max&gt;</code>로 최근 몇 개만 살려 둬요.</p>
          <p>KeepAlive로 살려 둔 화면은 <code>onActivated</code> · <code>onDeactivated</code>에서 타이머·구독을 멈추고 다시 켜요. React에선 조건부 렌더가 v-if, 숨김 스타일이 v-show에 해당하고, 19.2부터는 <code>&lt;Activity&gt;</code>로 상태를 살린 채 숨길 수 있어요.</p>
        </>}
        prevent={[
          <>Vue DevTools 타임라인에서 탭 전환 때마다 컴포넌트가 <b>mount</b>되는지 확인해요</>,
          <>메모리 탭에서 첫 화면의 DOM 수를 재고, 숨긴 화면이 큰 비중을 차지하는지 봐요</>,
          <>리뷰 체크: 차트·지도를 <code>v-show</code> 안에 두면 보일 때 <code>resize()</code>를 부르는지 봐요</>,
        ]}
        links={[['#/layout/layout-toptabs', '07 앱 화면 구성 · 상단 탭'], ['#/dev/perf/perf-virtual', '01 대용량 표에 가상화 없음']]}
      />

      <Issue id="fw-hoc"
        demo={f => <HocDemo fixed={f} />}
        demoNote={<>실제 React 컴포넌트예요. 왼쪽 트리는 래퍼 함수의 <b>실제 이름(function.name)</b>을 읽어 DevTools처럼 그렸어요.</>}
        cause={<>
          <p>HOC(컴포넌트를 받아 감싼 컴포넌트를 돌려주는 함수)는 하나 쓸 때마다 <b>층이 하나씩</b> 늘어요. 흔히 <code>{'C => props => …'}</code>처럼 이름 없는 함수로 만들어서, DevTools엔 <code>Anonymous</code>가 줄줄이 보이고 진짜 컴포넌트는 맨 안쪽에 묻혀요.</p>
          <p>각 층이 props를 <b>이름으로 끼워 넣기</b> 때문에, 두 HOC가 같은 이름을 쓰거나 부모가 넘긴 값과 겹치면 경고 없이 덮어써요. 렌더할 때마다 모든 층을 통과하고, 에러 스택도 래퍼 안쪽만 가리켜요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- export default withRouter(withTheme(withAuth(withTracking(
-   withErrorBoundary(connect(mapState)(ProfileCard))))))

- const withTracking = Comp => props =>        // 이름 없는 래퍼
-   <Comp {...props} title="profile_page" />    // 원래 title을 덮어써요`,
          good: `
export default function ProfileCard({ title }) {
+ const user = useAuth()
+ const theme = useTheme()
+ const track = useTracking('profile_page')
+ const profile = useSelector(selectProfile)
  return <Card title={title} tone={theme.tone} onClick={track} />
}

+ // HOC가 꼭 필요하면 이름을 붙여요
+ Wrapped.displayName = \`withTracking(\${Comp.displayName || Comp.name})\``,
        }}
        root={<>
          <p>로직 공유는 <b>커스텀 훅</b>으로 해요. 무엇을 어디서 받는지 컴포넌트 안에 다 드러나고, 이름이 겹치면 변수 이름만 바꾸면 돼요. 에러 바운더리·테마 Provider처럼 꼭 감싸야 하는 건 컴포넌트마다가 아니라 <b>라우트·레이아웃에 한 번</b> 둬요.</p>
          <p>어쩔 수 없이 HOC를 쓰면 <code>displayName</code>을 붙이고, 끼워 넣는 props 이름에 접두어를 두고, 정적 메서드를 옮겨요(<code>hoist-non-react-statics</code>). React 19부턴 <code>ref</code>가 일반 prop이라 따로 <code>forwardRef</code>로 감쌀 필요가 줄었어요.</p>
        </>}
        prevent={[
          <>React DevTools에서 화면 하나를 골라 <b>진짜 컴포넌트까지 몇 단계</b>인지 확인해요</>,
          <><code>react/display-name</code> 규칙으로 이름 없는 컴포넌트를 경고해요</>,
          <>리뷰 기준: 새 HOC는 만들지 않고 훅으로 해요. 기존 HOC 겹침은 최대 1단계</>,
        ]}
        links={[['#/dev/framework/fw-mixin', '03 Mixin 남용과 이름 충돌'], ['#/dev/debug/dbg-stack', '10 추적 불가능한 스택 트레이스'], ['#/dev/state/state-drilling', '02 Props Drilling 지옥']]}
      />

      <Issue id="fw-ngmodel"
        demo={f => <NgModelDemo fixed={f} />}
        demoNote={<>Angular를 불러오지 않은 시뮬레이션이에요. 여러 곳이 <b>같은 객체를 직접 바꾸는</b> 구조와, 자동 저장 응답이 입력 중인 값을 덮어쓰는 흔한 사고를 재현해요.</>}
        cause={<>
          <p><code>[(ngModel)]</code>은 ‘값 넣기 + 바뀌면 되돌려 쓰기’를 한 줄로 줄인 문법이에요. 편해서 여러 컴포넌트가 <b>같은 객체(user.name)를 직접</b> 묶게 되는데, 그러면 값이 바뀌는 길이 화면 수만큼 생겨요. 서비스가 그 객체를 들고 있다가 응답으로 바꾸기도 해요.</p>
          <p>모든 변경이 지나가는 <b>한 곳이 없으니</b> 로그도, 중단점도 걸 데가 없어요. ‘공백을 쳤는데 사라져요’ 같은 버그가 나면 누가 바꿨는지 몰라 화면을 하나씩 뒤져야 해요. 템플릿 기반 폼은 값 반영도 한 박자 늦게(비동기로) 일어나서 순서 버그가 더 헷갈려요.</p>
        </>}
        quick={{
          lang: 'Angular',
          bad: `
<!-- header.component.html -->
- <input [(ngModel)]="user.name">
<!-- profile-form.component.html -->
- <input [(ngModel)]="user.name">

// autosave.service.ts
save(user: User) {
  this.http.put<User>('/api/me', user).subscribe(res => {
-   user.name = res.name   // 입력 중인 값을 응답이 덮어써요
  })
}`,
          good: `
// user.store.ts — 값을 바꾸는 곳은 여기 한 곳
@Injectable({ providedIn: 'root' })
export class UserStore {
+ private readonly _name = signal('')
+ readonly name = this._name.asReadonly()
+ setName(v: string) { this._name.set(v) }
}

// profile-form.component.ts — 리액티브 폼
+ name = new FormControl('', { nonNullable: true })
constructor() {
+ this.name.valueChanges.pipe(debounceTime(300), takeUntilDestroyed())
+   .subscribe(v => this.store.setName(v))
}
+ save() { this.api.save(this.name.value.trim()) }  // 정리는 저장할 때 한 번`,
        }}
        root={<>
          <p><b>단방향 흐름</b>으로 바꿔요. 값은 입력(<code>input()</code>)으로 내려주고, 바꾸고 싶으면 이벤트(<code>output()</code>)로 올려서 store의 메서드 하나만 값을 바꾸게 해요. 폼은 타입이 있는 <b>리액티브 폼</b>(<code>FormControl</code> · <code>FormGroup</code>)으로 만들어요.</p>
          <p>서버 응답은 사용자가 <b>고치는 중인 칸을 덮어쓰지 않게</b> 해요. 응답은 store에만 반영하고, 폼은 아직 안 건드린(pristine) 칸만 <code>patchValue</code>로 맞춰요. 상태가 커지면 signal 기반 store(NgRx SignalStore 등)를 써요.</p>
        </>}
        prevent={[
          <>tsconfig의 Angular 옵션에서 <code>strictTemplates</code>를 켜서 템플릿 바인딩도 타입 검사해요</>,
          <>리뷰 기준: 서비스에서 받은 객체에 <code>[(ngModel)]</code>을 직접 묶지 않아요</>,
          <>단위 테스트: 자동 저장 응답이 와도 <b>입력 중인 값이 그대로</b>인지 확인해요</>,
        ]}
        links={[['#/dev/state/state-bloat', '02 비대해진 전역 상태'], ['#/dev/form/fm-controlled', '07 제어 · 비제어 컴포넌트 혼용']]}
      />
    </div>
  )
}
