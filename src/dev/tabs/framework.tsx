/* 03 프레임워크 함정 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './framework.css'
import { CircularDemo, EffectLoopDemo, HocDemo, HydrationDemo, KeyIndexDemo, MixinDemo, NgModelDemo, VifDemo, WatchDeepDemo, ZoneDemo } from './framework-demos'

export default function FrameworkTab() {
  return (
    <div data-dev="framework">
      <TabIntro>
        프레임워크가 ‘알아서’ 해 주는 일이 내 예상과 다르게 돌 때 생기는 문제들이에요. React 항목(01·07·09)과 04는 진짜 React로 돌리고, Vue·Angular 항목은 원리만 옮긴 시뮬레이션이에요.
      </TabIntro>

      <Issue id="fw-effect-loop"
        demo={f => <EffectLoopDemo fixed={f} />}
        demoNote={<>실제 React로 재현해요. 40ms 걸리는 가짜 API를 부르고, 페이지가 멈추지 않게 50번에서 강제로 멈춰요. 개발 모드(StrictMode)라 ‘고친 뒤’에서도 effect가 처음에 한 번 더 돌아 ‘2번’으로 보여요.</>}
        cause={<>
          <p>React는 의존성 배열의 값을 <code>Object.is</code>로 비교해요. 컴포넌트 안에서 만든 <code>{'{ id, fields }'}</code> 같은 객체는 렌더할 때마다 새로 생기니, 내용이 같아도 바뀐 걸로 봐요.</p>
          <p>effect가 돌고, 응답으로 setState 하고, 다시 렌더하면 또 새 객체가 생겨요. 이게 끝없이 반복돼요. 화면은 ‘불러오는 중’과 결과 사이를 깜빡이고, 서버엔 같은 요청이 초당 수십 번 들어가요.</p>
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
          <p>의존성에는 <b>원시값</b>(id, 문자열, 숫자)을 넣는 게 기본이에요. 객체가 꼭 필요하면 effect 안에서 만들거나 <code>useMemo</code>로 고정해요. React Compiler를 쓰면 이런 메모이제이션을 빌드 때 넣어 줘요.</p>
          <p>서버 데이터는 TanStack Query로 받는 편이 나아요. <code>{"useQuery({ queryKey: ['user', userId], queryFn })"}</code>는 키를 내용으로 비교해 같은 요청을 합치고 캐시해요.</p>
        </>}
        prevent={[
          <><code>react-hooks/exhaustive-deps</code>를 켜 두면 렌더마다 바뀌는 객체 의존성을 경고해 줘요</>,
          <>개발 모드 API 클라이언트에 ‘같은 주소를 1초에 10번 넘게 부르면 콘솔 경고’를 넣어 둬요</>,
        ]}
        ours={<><code>main.tsx</code>에서 StrictMode를 켜 둬서 개발 중엔 effect가 마운트 때 한 번 더 돌아요. ‘고친 뒤’의 ‘effect 실행 2번’이 그 흔적이고, 운영 빌드에선 1번이에요.</>}
        links={[['#/dev/perf/perf-memo', '01 useMemo · useCallback 누락과 오남용'], ['#/dev/state/state-async', '02 로딩·에러·성공 상태의 파편화'], ['#/dev/framework/fw-watch-deep', '03 watchEffect의 깊은 추적 루프']]}
      />

      <Issue id="fw-watch-deep"
        demo={f => <WatchDeepDemo fixed={f} />}
        demoNote={<>Vue를 불러오지 않고 같은 원리로 만든 작은 반응형 엔진이에요. Proxy로 읽은 값을 기록해 두고, 그 값이 바뀌면 다시 실행해요. 30번에서 강제로 멈춰요.</>}
        cause={<>
          <p><code>watchEffect</code>는 실행 중에 읽은 반응형 값을 전부 의존성으로 기록해요. <code>JSON.stringify(form)</code>이나 펼침 연산자, <code>for…in</code>으로 객체를 통째로 훑으면 결과를 담을 <code>form.result</code>까지 추적돼요.</p>
          <p>그 상태로 <code>await</code> 뒤에서 <code>form.result</code>를 바꾸면 감시 함수가 다시 돌아요. Vue는 실행 <b>도중</b>에 자기 자신을 다시 깨우는 건 막아 주지만, <code>await</code> 뒤는 이미 실행이 끝난 뒤라 못 막아요. 요청과 저장이 번갈아 끝없이 이어져요.</p>
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
          <p>입력 상태와 결과 상태를 나눠요. 감시 함수가 읽는 값과 쓰는 값이 겹치지 않으면 루프가 생기지 않아요. 값에서 값을 만드는 경우라면 감시 대신 <code>computed</code>를 써요.</p>
          <p>기본은 감시 대상이 드러나는 <code>watch(소스, 콜백)</code>이고, <code>deep: true</code>는 꼭 필요할 때만 써요. 검색처럼 서버 데이터를 다룬다면 <code>@tanstack/vue-query</code>가 취소와 중복 제거를 맡아 줘요.</p>
        </>}
        prevent={[
          <>개발 중엔 <code>{'watchEffect(fn, { onTrigger(e) { debugger } })'}</code>로 무엇이 다시 실행을 일으켰는지 확인해요</>,
          <>감시 함수 안에서 감시 대상을 직접 바꾸는 코드는 리뷰에서 막아요</>,
        ]}
        links={[['#/dev/state/state-vue-ref', '02 Vue ref · reactive 혼용'], ['#/dev/framework/fw-effect-loop', '03 useEffect 의존성 객체로 무한 루프']]}
      />

      <Issue id="fw-zone"
        demo={f => <ZoneDemo fixed={f} />}
        demoNote={<>Angular·Zone.js 없이 만든 시뮬레이션이에요. 스크롤·타이머 이벤트는 진짜고, ‘Zone 안의 비동기 작업이 끝날 때마다 앱 전체를 확인’하는 규칙대로 횟수를 세요. 시계 타이머는 이 카드가 화면에 보일 때만 돌아요.</>}
        cause={<>
          <p>Zone.js는 <code>setTimeout</code>, <code>addEventListener</code>, Promise 같은 비동기 작업을 가로채서 끝날 때마다 변경 감지를 돌려요. 기본 전략(Default)에선 무엇이 바뀌었는지 모르니 모든 컴포넌트의 바인딩을 다시 봐요. 스크롤(초당 수십 번)이나 <code>mousemove</code>, 서드파티 위젯의 짧은 <code>setInterval</code>이 있으면 화면이 그대로여도 변경 감지는 계속 돌아요. 컴포넌트가 많으면 폰이 뜨거워질 만큼 CPU를 써요.</p>
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
          <p>컴포넌트는 <b>OnPush + signal</b>을 기본으로 해요. 그러면 입력값이나 템플릿이 읽는 signal이 바뀐 가지만 확인해요. 스크롤·캔버스·지도·차트처럼 이벤트가 잦은 코드는 <code>runOutsideAngular</code> 안에서 시작해요.</p>
          <p>앱 설정의 <code>{'provideZoneChangeDetection({ eventCoalescing: true })'}</code>로 같은 틱의 이벤트를 묶을 수도 있어요. 최신 Angular에는 Zone.js 없이 signal로만 갱신하는 zoneless 모드도 있어요(버전마다 이름과 안정화 단계가 달라서 쓰는 버전의 문서를 확인해요).</p>
        </>}
        prevent={[
          <>Angular DevTools Profiler로 스크롤 한 번에 변경 감지가 몇 번 도는지 세어 봐요</>,
          <><code>@angular-eslint/prefer-on-push-component-change-detection</code> 규칙을 켜요</>,
          <>서드파티 위젯을 넣은 뒤엔 Performance 탭에서 가만히 있을 때도 메인 스레드가 바쁜지 봐요</>,
        ]}
        links={[['#/dev/perf/perf-listener', '01 페이지 이동 후 남은 이벤트 리스너'], ['#/dev/state/state-rxjs', '02 RxJS 구독 미해제']]}
      />

      <Issue id="fw-hydration"
        demo={f => <HydrationDemo fixed={f} />}
        demoNote={<>실제 <code>react-dom/server</code>의 <code>renderToString</code>으로 ‘서버 HTML’을 만들고 <code>hydrateRoot</code>로 붙여요. 서버 환경(UTC · en-US · window 없음)만 흉내 냈어요. 에러는 <code>onRecoverableError</code>로 받아 여기 보여줘요.</>}
        cause={<>
          <p>SSR에선 서버가 HTML을 먼저 보내고, 브라우저가 같은 컴포넌트를 다시 그려 이벤트를 붙여요(<Term k="Hydration" d="서버가 보낸 HTML 위에 브라우저의 JS가 같은 화면을 다시 계산해서 이벤트와 상태를 붙이는 단계예요." />). 두 결과가 글자 하나라도 다르면 불일치예요.</p>
          <p>흔한 원인은 <code>Date</code>(서버는 UTC, 사용자는 한국 시간), <code>Math.random()</code>, <code>toLocaleString</code>의 언어 차이, <code>typeof window</code> 분기예요. React는 서버 HTML을 <b>버리고 처음부터 다시 그려요</b>. 글자가 한 번 바뀌고 첫 화면도 느려져요. Vue는 경고를 띄우고 어긋난 부분을 고쳐요.</p>
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
          <p>렌더 함수는 같은 입력이면 같은 결과를 내야 해요. 시간·난수는 서버에서 정해 데이터로 내려보내고, 날짜는 시간대와 언어를 고정해서 포맷해요. id는 <code>useId</code>로 만들어요.</p>
          <p>기기 크기나 localStorage처럼 브라우저에만 있는 값은 hydration 뒤에 읽어요(Next.js의 <code>{'dynamic(…, { ssr: false })'}</code>, Nuxt의 <code>&lt;ClientOnly&gt;</code>). 어쩔 수 없이 다른 칸은 React <code>suppressHydrationWarning</code>, Vue 3.5+ <code>data-allow-mismatch</code>로 그 칸만 허용해요.</p>
        </>}
        prevent={[
          <>E2E 테스트에서 페이지를 연 뒤 콘솔에 hydration 에러가 없는지 검사해요</>,
          <>CI에서 서버는 <code>TZ=UTC</code>, 브라우저는 <code>Asia/Seoul</code>로 다르게 두고 돌려 봐요</>,
          <>렌더 중에 <code>Date.now()</code> · <code>Math.random()</code> · <code>window</code>를 직접 읽는 코드는 리뷰에서 걸러요</>,
        ]}
        ours={<>이 사이트는 SSR 없는 Vite SPA라 hydration 단계가 없어요. 위 데모는 브라우저 안에서 <code>renderToString</code>으로 서버 HTML을 만들어 재현한 거예요.</>}
        links={[['#/dev/browser/br-timezone', '09 타임존 변환 누락'], ['#/dev/browser/br-extension', '09 확장 프로그램의 DOM 변경 충돌'], ['#/loading/loading-skeleton', '14 로딩 패턴 · 스켈레톤']]}
      />

      <Issue id="fw-mixin"
        demo={f => <MixinDemo fixed={f} />}
        demoNote={<>Vue 3의 옵션 병합 규칙(methods는 나중 것이 덮어쓰기, data는 얕게 합치기, 훅은 모두 실행)을 옮긴 시뮬레이션이에요. ‘고치기 전’에서 mixins 순서를 바꿔 보세요.</>}
        cause={<>
          <p>mixin은 다른 파일의 data·methods·훅을 컴포넌트에 섞어 넣어요. 템플릿의 <code>format()</code>이나 <code>this.loading</code>만 봐서는 어느 파일에서 왔는지 알 수 없고, 에디터의 ‘정의로 이동’도 잘 안 돼요.</p>
          <p>이름이 겹치면 Vue는 경고 없이 <b>나중에 섞인 쪽</b>을 써요(컴포넌트 자신이 가장 우선). mixin 순서를 바꾸거나 메서드 하나를 추가했을 뿐인데 다른 화면의 가격 자리에 날짜가 찍히기도 해요.</p>
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
          <p>Vue 3에선 mixin 대신 컴포저블(use○○ 함수)을 써요. import와 구조 분해 덕에 이름의 출처가 코드에 보이고, 겹치면 <code>loading: rateLoading</code>처럼 바꿔 부르면 돼요. 공식 문서도 같은 이유로 컴포저블을 권해요.</p>
          <p>한 번에 못 바꾸면 mixin 안의 로직부터 컴포저블로 옮기고, 옛 Options API 컴포넌트는 <code>setup()</code> 옵션에서 그 컴포저블을 불러 쓰게 해요. 전역 mixin(<code>app.mixin()</code>)은 가장 먼저 없애요.</p>
        </>}
        prevent={[
          <><code>eslint-plugin-vue</code>의 <code>vue/no-restricted-component-options</code>로 새 코드에서 <code>mixins</code> 옵션을 막아요</>,
        ]}
        links={[['#/dev/framework/fw-hoc', '03 너무 깊은 HOC 래핑'], ['#/dev/debug/dbg-naming', '10 같은 컴포넌트 중복 생성']]}
      />

      <Issue id="fw-circular"
        demo={f => <CircularDemo fixed={f} />}
        demoNote={<>ES 모듈 실행 순서(깊이 우선, 실행 중인 모듈은 건너뛰기)를 따라가는 시뮬레이터예요. 번들러·Jest(CommonJS)에선 <code>undefined</code>, 브라우저 ES 모듈에선 <code>ReferenceError</code>로 나타나요.</>}
        cause={<>
          <p>A가 B를, B가 다시 A를 import 하면 한쪽은 상대가 실행을 마치기 전에 그 값을 읽어요. 이미 실행 중인 모듈은 건너뛰기 때문이에요. 그 순간엔 값이 비어 있어서 <code>Cannot read properties of undefined</code>나 <code>Cannot access 'ROLES' before initialization</code>이 나요.</p>
          <p>어느 쪽이 터질지는 <b>누가 먼저 import 되느냐</b>에 달렸어요. 상관없는 파일에 import 한 줄(새 가드, 새 barrel <code>index.ts</code>)만 늘어도 깨질 수 있어요. Angular에선 서비스끼리 서로 주입하면 <code>NG0200: Circular dependency in DI</code> 에러도 나요.</p>
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
          <p>의존 방향을 층으로 정해요. 상수·타입 → 유틸 → 서비스 → 화면 순서로만 import 하고, 둘이 같이 쓰는 건 아래층 파일로 내려요. 같은 기능 폴더 안에서 barrel(<code>index.ts</code>)을 거쳐 import 하면 숨은 고리가 잘 생겨요.</p>
          <p>타입만 필요하면 <code>import type</code>을 써요. 실행 코드에서 지워지니 고리가 생기지 않아요. 모노레포라면 Nx의 <code>@nx/enforce-module-boundaries</code>로 층 규칙을 강제할 수 있어요.</p>
        </>}
        prevent={[
          <>CI에서 <code>npx madge --circular --extensions ts src</code>를 돌려 고리가 하나라도 있으면 실패시켜요. 에디터에선 ESLint <code>import/no-cycle</code>로 미리 봐요</>,
          <>Angular 서비스끼리 서로 <code>inject</code> 하게 됐다면 공통 부분을 세 번째 서비스로 빼요</>,
        ]}
        links={[['#/dev/build/bd-treeshake', '08 Tree Shaking 실패로 거대한 번들'], ['#/dev/debug/dbg-stack', '10 추적 불가능한 스택 트레이스']]}
      />

      <Issue id="fw-key-index"
        demo={f => <KeyIndexDemo fixed={f} />}
        demoNote={<>실제 React예요. 메모 칸은 비제어 입력(<code>defaultValue</code>)이라 값이 React 상태에 없고 DOM에만 있어요.</>}
        cause={<>
          <p><code>key</code>는 ‘이 줄이 아까 그 줄’이라고 알려 주는 이름표예요. index를 key로 쓰면 맨 위 줄을 지웠을 때 바나나가 0번 이름표를 물려받아요. React는 0번 줄의 DOM을 그대로 두고 글자만 바꿔서, 사과의 메모가 바나나 옆에 남아요.</p>
          <p>그리고 마지막 3번 이름표는 사라졌다고 보고 <b>포도 줄의 DOM을 지워요</b>. 엉뚱한 메모가 없어지는 거예요. 입력값·체크 상태·포커스·애니메이션·자식 컴포넌트 상태도 똑같이 밀려요. Vue의 <code>v-for</code>도 마찬가지예요.</p>
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
          <p>key는 데이터가 가진 변하지 않는 id로 해요. 서버 id가 없으면 항목을 <b>만들 때</b> <code>crypto.randomUUID()</code>로 붙여 두고, 렌더할 때 만들지 않아요(<code>key={'{Math.random()}'}</code>는 매번 새로 그려요).</p>
          <p>줄마다 입력값이 있다면 그 값을 id 기준 상태로 올려서(제어 컴포넌트, 폼 라이브러리의 <code>useFieldArray</code> 등) DOM에만 남지 않게 해요. index key는 순서가 바뀌지 않는 정적 목록에서만 괜찮아요.</p>
        </>}
        prevent={[
          <><code>react/no-array-index-key</code>(eslint-plugin-react · oxlint) 규칙을 켜요</>,
          <>Vue는 <code>vue/require-v-for-key</code>를 켜고, index를 key로 쓰지 않는 건 리뷰 기준으로 둬요</>,
          <>E2E 테스트로 가운데 줄을 지운 뒤 이웃 줄의 입력값이 그대로인지 확인해요</>,
        ]}
        links={[['#/dev/form/fm-dynamic', '07 동적 필드 추가·삭제 시 검증 꼬임'], ['#/collection/col-list', '22 목록 보여주기 · 리스트']]}
      />

      <Issue id="fw-vif-vshow"
        demo={f => <VifDemo fixed={f} />}
        demoNote={<>Vue의 <code>v-if</code>(조건부 렌더)와 <code>v-show</code>(<code>display: none</code>)를 React로 흉내 냈어요. 차트 초기화 비용은 14ms짜리 계산으로 넣었고, 시간과 DOM 수는 실제로 잰 값이에요(개발 모드라 초기화가 두 번 돌 수 있어요).</>}
        cause={<>
          <p><code>v-if</code>는 조건이 바뀔 때마다 컴포넌트를 없애고 새로 만들어요. setup이 다시 돌고, 차트 라이브러리를 다시 초기화하고, 데이터도 다시 불러와요. 자주 오가는 탭에 쓰면 전환할 때마다 버벅여요.</p>
          <p><code>v-show</code>는 처음에 전부 만들어 두고 CSS로 숨겨요. 전환은 빠르지만 거의 열지 않는 무거운 화면에 쓰면 첫 로딩이 느려지고, 숨긴 DOM이 메모리를 계속 잡아요. 숨긴 채로 만든 차트는 크기가 0으로 재져서 깨지기도 해요.</p>
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
          <p>기준은 <b>자주 바뀌면 v-show, 거의 안 바뀌면 v-if</b>예요. 무겁고 자주 오가는데 처음엔 안 보이는 화면은 처음 열 때 v-if로 만들고 그 뒤로는 v-show로 숨기거나, <code>&lt;KeepAlive :max&gt;</code>로 최근 몇 개만 살려 둬요.</p>
          <p>KeepAlive로 살려 둔 화면은 <code>onActivated</code> · <code>onDeactivated</code>에서 타이머와 구독을 멈췄다 다시 켜요. React에선 조건부 렌더가 v-if, 숨김 스타일이 v-show에 해당하고, 19.2부터는 <code>&lt;Activity&gt;</code>로 상태를 살린 채 숨길 수 있어요.</p>
        </>}
        prevent={[
          <>Vue DevTools 타임라인에서 탭을 바꿀 때마다 컴포넌트가 mount되는지 봐요</>,
          <>메모리 탭에서 첫 화면의 DOM 수를 재고, 숨긴 화면이 얼마나 차지하는지 봐요</>,
          <>차트·지도를 <code>v-show</code> 안에 뒀다면 보일 때 <code>resize()</code>를 부르는지 확인해요</>,
          <>KeepAlive로 살려 둔 화면은 다른 탭으로 옮긴 뒤에도 타이머가 돌고 있지 않은지 봐요</>,
        ]}
        links={[['#/layout/layout-toptabs', '07 앱 화면 구성 · 상단 탭'], ['#/dev/perf/perf-virtual', '01 대용량 표에 가상화 없음']]}
      />

      <Issue id="fw-hoc"
        demo={f => <HocDemo fixed={f} />}
        demoNote={<>실제 React 컴포넌트예요. 왼쪽 트리는 래퍼 함수의 실제 이름(<code>function.name</code>)을 읽어 DevTools처럼 그렸어요.</>}
        cause={<>
          <p>HOC(컴포넌트를 받아 감싼 컴포넌트를 돌려주는 함수)를 하나 쓸 때마다 층이 하나 늘어요. 보통 <code>{'C => props => …'}</code>처럼 이름 없는 함수로 만들어서 DevTools엔 <code>Anonymous</code>가 줄줄이 보이고, 진짜 컴포넌트는 맨 안쪽에 묻혀요.</p>
          <p>각 층이 props를 이름으로 끼워 넣으니, 두 HOC가 같은 이름을 쓰거나 부모가 넘긴 값과 겹치면 <b>경고 없이 덮어써요</b>. 렌더할 때마다 모든 층을 지나가고, 에러 스택도 래퍼 안쪽만 가리켜요.</p>
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
          <p>로직 공유는 커스텀 훅으로 해요. 무엇을 어디서 받는지 컴포넌트 안에서 보이고, 이름이 겹치면 변수 이름만 바꾸면 돼요. 에러 바운더리나 테마 Provider처럼 꼭 감싸야 하는 건 라우트·레이아웃에 한 번만 둬요.</p>
          <p>HOC를 써야 한다면 <code>displayName</code>을 붙이고, 끼워 넣는 props 이름에 접두어를 두고, 정적 메서드를 옮겨요(<code>hoist-non-react-statics</code>). React 19부턴 <code>ref</code>가 일반 prop이라 <code>forwardRef</code>로 감쌀 일이 줄었어요.</p>
        </>}
        prevent={[
          <><code>react/display-name</code> 규칙으로 이름 없는 컴포넌트를 경고해요</>,
          <>새 HOC는 만들지 않고 훅으로 해요. 기존 HOC는 1단계까지만 겹치게 둬요</>,
        ]}
        links={[['#/dev/framework/fw-mixin', '03 Mixin 남용과 이름 충돌'], ['#/dev/debug/dbg-stack', '10 추적 불가능한 스택 트레이스'], ['#/dev/state/state-drilling', '02 Props Drilling 지옥']]}
      />

      <Issue id="fw-ngmodel"
        demo={f => <NgModelDemo fixed={f} />}
        demoNote={<>Angular 없이 만든 시뮬레이션이에요. 여러 곳이 같은 객체를 직접 바꾸는 구조와, 자동 저장 응답이 입력 중인 값을 덮어쓰는 사고를 재현해요.</>}
        cause={<>
          <p><code>[(ngModel)]</code>은 ‘값 넣기 + 바뀌면 되돌려 쓰기’를 한 줄로 줄인 문법이에요. 편하다 보니 여러 컴포넌트가 같은 객체(<code>user.name</code>)를 직접 묶게 되고, 값이 바뀌는 길이 화면 수만큼 생겨요. 서비스가 그 객체를 들고 있다가 응답으로 바꾸기도 해요.</p>
          <p>변경이 모두 지나가는 <b>한 곳이 없어서</b> 로그나 중단점을 걸 데가 없어요. ‘공백을 쳤는데 사라져요’ 같은 버그가 나면 화면을 하나씩 뒤져야 해요. 템플릿 기반 폼은 값 반영도 한 박자 늦게(비동기로) 일어나서 순서 버그가 더 헷갈려요.</p>
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
          <p>단방향 흐름으로 바꿔요. 값은 입력(<code>input()</code>)으로 내려주고, 바꾸고 싶으면 이벤트(<code>output()</code>)로 올려서 store의 메서드 하나만 값을 바꾸게 해요. 폼은 타입이 있는 리액티브 폼(<code>FormControl</code> · <code>FormGroup</code>)으로 만들어요.</p>
          <p>서버 응답이 사용자가 고치는 중인 칸을 덮어쓰면 안 돼요. 응답은 store에만 반영하고, 폼은 아직 안 건드린(pristine) 칸만 <code>patchValue</code>로 맞춰요. 상태가 커지면 signal 기반 store(NgRx SignalStore 등)를 써요.</p>
        </>}
        prevent={[
          <>tsconfig의 Angular 옵션에서 <code>strictTemplates</code>를 켜서 템플릿 바인딩도 타입 검사해요</>,
          <>서비스에서 받은 객체에 <code>[(ngModel)]</code>을 직접 묶는 코드는 리뷰에서 막아요</>,
          <>자동 저장 응답이 와도 입력 중인 값이 그대로인지 단위 테스트로 확인해요</>,
        ]}
        links={[['#/dev/state/state-bloat', '02 비대해진 전역 상태'], ['#/dev/form/fm-controlled', '07 제어 · 비제어 컴포넌트 혼용']]}
      />
    </div>
  )
}
