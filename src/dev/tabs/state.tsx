/* 02 상태 관리 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './state.css'
import { AsyncDemo, BfcacheDemo, BloatDemo, ContextDemo, DrillDemo, FormDemo, RaceDemo, RxjsDemo, StorageDemo, VueRefDemo } from './state-demos'

export default function StateTab() {
  return (
    <div data-dev="state">
      <TabIntro>
        상태 버그는 대부분 <b>같은 값을 두 곳에 두거나, 누가 바꾸는지 모르거나, 끝난 줄 모르고 계속 듣는</b> 데서 시작해요. 각 데모의 <b>문제 그대로 / 해결 적용</b> 스위치를 바꿔 가며 숫자가 어떻게 달라지는지 보세요.
        다시 그린 횟수와 시간은 여러분 브라우저의 React가 실제로 센 값이에요(08 Vue · 09 Angular · 10 bfcache는 동작 규칙을 작게 흉내 낸 재현이에요).
      </TabIntro>

      <Issue id="state-bloat"
        demo={f => <BloatDemo fixed={f} />}
        demoNote={<>위젯 오른쪽 숫자는 지금까지 다시 그린 횟수예요. 빨간 테두리가 번쩍이면 방금 다시 그려진 거예요.</>}
        cause={<>
          <p>처음엔 편해서 <b>모든 값을 전역 스토어 하나에</b> 넣어요. 서버에서 받은 목록, 모달 열림, 입력 중인 글, 토스트까지요. 그러면 어느 화면이든 아무 데서나 값을 바꿀 수 있게 돼요.</p>
          <p>스토어 전체를 구독하는 컴포넌트는 <b>상관없는 값이 바뀌어도 다시 그려지고</b>, 이름 없는 <code>set({'{…}'})</code>이 수십 곳에 흩어져 있으면 버그가 났을 때 누가 바꿨는지 거꾸로 찾을 방법이 없어요.</p>
        </>}
        quick={{
          lang: 'React · Zustand',
          bad: `
const useStore = create(set => ({
  user: null, cart: [], orders: [], filter: {}, theme: 'light',
  isModalOpen: false, toast: '', draft: '',
- set,                                   // 아무 데서나 아무 값이나
}))

function CartBadge() {
- const s = useStore()                   // 스토어 전체를 구독해요
  return <b>{s.cart.length}</b>
}
- useStore.getState().set({ cart: [] })  // 어디서 비웠는지 알 수 없어요`,
          good: `
+ const useCartStore = create(devtools(set => ({
  items: [],
+ add: item => set(s => ({ items: [...s.items, item] }), false, 'cart/add'),
+ clear: () => set({ items: [] }, false, 'cart/clear'),
+ }), { name: 'cart' }))

function CartBadge() {
+ const count = useCartStore(s => s.items.length)   // 필요한 값만
  return <b>{count}</b>
}
// 주문 목록 같은 서버 데이터는 TanStack Query로,
// 모달 열림 · 입력 중인 글은 컴포넌트 안 useState로`,
        }}
        root={<>
          <p>상태를 <b>종류별로 나눠요</b>. 서버 데이터는 TanStack Query·SWR·RTK Query, 필터·페이지 번호는 URL 쿼리, 폼은 폼 라이브러리, 한 화면에서만 쓰는 값은 <code>useState</code>. 이렇게 빼고 나면 <b>정말 여러 화면이 함께 쓰는 값</b>만 전역(Zustand·Redux Toolkit·Pinia)에 남아요.</p>
          <p>남은 전역도 도메인별로 나누고, 값은 <b>이름 붙은 액션으로만</b> 바꿔요. Redux DevTools에서 액션 이름과 전후 값을 보면 ‘누가 바꿨나’가 바로 보여요.</p>
        </>}
        prevent={[
          <>새 전역 키를 추가하는 PR엔 ‘두 화면 이상에서 쓰나요?’를 적게 해요</>,
          <>선택자 없는 <code>useStore()</code>와 스토어 밖 <code>setState</code> 직접 호출을 ESLint <code>no-restricted-syntax</code> 같은 규칙으로 막아요</>,
          <>스토어 devtools 미들웨어를 개발 모드에 켜 두고, 이름 없는 변경(<code>anonymous</code>)이 보이면 고쳐요</>,
        ]}
        links={[['#/dev/state/state-context', 'Context 일부 변경에 전체 리렌더'], ['#/dev/state/state-async', '로딩·에러·성공 상태의 파편화']]}
      />

      <Issue id="state-drilling"
        demo={f => <DrillDemo fixed={f} />}
        cause={<>
          <p>위쪽 컴포넌트가 가진 값을 깊은 아래에서 쓰려면, 그 사이 컴포넌트들이 <b>자기는 쓰지도 않는 props를 받아서 넘겨야</b> 해요. 이걸 props drilling이라고 해요.</p>
          <p>두세 단계는 괜찮아요. 하지만 다섯 단계가 넘으면 값 이름 하나 바꿀 때 중간 파일을 전부 고쳐야 하고, 값이 바뀔 때마다 <b>중간 컴포넌트까지 전부 다시 그려져요</b>.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function App() {
  const [user, setUser] = useState(me)
- return <Page user={user} />
}
- function Page({ user }) { return <Layout user={user} /> }
- function Layout({ user }) { return <Sidebar user={user} /> }
- function Sidebar({ user }) { return <Profile user={user} /> }
- function Profile({ user }) { return <Avatar user={user} /> }
function Avatar({ user }) { return <img alt={user.name} … /> }`,
          good: `
+ const UserContext = createContext<UserCtx | null>(null)

+ function UserProvider({ children }) {
+   const [user, setUser] = useState(me)
+   const value = useMemo(() => ({ user, setUser }), [user])
+   return <UserContext value={value}>{children}</UserContext>
+ }

function Page() { return <Layout /> }      // 더는 user를 몰라도 돼요
function Avatar() {
+ const { user } = useContext(UserContext)!
  return <img alt={user.name} … />
}`,
        }}
        root={<>
          <p>먼저 <b>컴포넌트 합성</b>을 써 봐요. <code>{'<Layout sidebar={<Avatar user={user} />} />'}</code>처럼 완성된 요소를 슬롯(<code>children</code>)으로 넘기면 중간 단계가 사라져요. 여러 곳에서 읽는 값이면 Context, 자주 바뀌고 넓게 쓰면 Zustand 같은 store로 옮겨요.</p>
          <p>React 19부터는 <code>{'<UserContext value={…}>'}</code>처럼 Provider 없이 바로 쓸 수 있어요. Vue는 <code>provide</code>/<code>inject</code>, Angular는 서비스와 <code>inject()</code>가 같은 역할이에요.</p>
        </>}
        prevent={[
          <>리뷰 기준: 받기만 하고 그대로 넘기는 props가 <b>3단계를 넘으면</b> 구조를 다시 봐요</>,
          <>React DevTools 컴포넌트 탭에서 props를 따라가 보면 넘기기만 하는 곳이 보여요</>,
          <>Context는 앱 맨 위가 아니라 <b>값을 쓰는 곳의 가장 가까운 공통 부모</b>에 둬요</>,
        ]}
        links={[['#/dev/state/state-context', 'Context 일부 변경에 전체 리렌더']]}
      />

      <Issue id="state-async"
        demo={f => <AsyncDemo fixed={f} />}
        demoNote={<>서버 대신 0.6초 뒤에 답하는 가짜 요청을 써요. 상태를 다루는 코드는 왼쪽 ‘문제 코드’와 같은 실수를 그대로 담았어요.</>}
        cause={<>
          <p><code>isLoading</code>·<code>isError</code>·<code>data</code>를 <b>따로따로 useState</b>로 만들면 셋을 맞춰 바꾸는 걸 사람이 기억해야 해요. catch에서 로딩 끄기를 빼먹거나 다시 시도할 때 에러를 안 지우면 <b>로딩·에러·데이터가 한꺼번에</b> 떠요.</p>
          <p>화면마다 이걸 새로 짜니까 어떤 곳은 에러를 그냥 삼켜서, 실패했는데도 ‘알림이 없어요’ 같은 <b>거짓 빈 화면</b>을 보여줘요. 사용자는 정말 없는 줄 알아요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
const [isLoading, setLoading] = useState(false)
const [isError, setError] = useState(false)
const [orders, setOrders] = useState([])

async function load() {
  setLoading(true)
  try {
    setOrders(await api.orders())
    setLoading(false)
- } catch {
-   setError(true)   // 로딩 끄기 · 다시 시도 때 에러 지우기 빠짐
- }
}`,
          good: `
+ const q = useQuery({ queryKey: ['orders'], queryFn: api.orders })

+ if (q.isPending) return <OrdersSkeleton />
+ if (q.isError) return <ErrorView onRetry={() => q.refetch()} />
+ if (q.data.length === 0) return <Empty />
return <OrderList orders={q.data} />

// 직접 만든다면 boolean 여러 개 대신 하나로
+ type State<T> =
+   | { status: 'pending' }
+   | { status: 'error'; error: Error }
+   | { status: 'success'; data: T }`,
        }}
        root={<>
          <p>서버 데이터는 <b>TanStack Query·SWR·RTK Query</b>에 맡겨요. 상태가 <code>status</code> 하나로 관리돼서 ‘로딩이면서 에러’ 같은 불가능한 조합이 생기지 않고, 재시도·캐시·중복 요청 합치기도 따라와요.</p>
          <p>그리고 로딩·빈 화면·에러를 그리는 <b>공용 부품</b>을 하나 정해요(<code>Suspense</code> + 에러 바운더리, 또는 <code>{'<AsyncView>'}</code> 같은 컴포넌트). 화면마다 같은 모양이 나오고, 빠뜨릴 수가 없어요.</p>
        </>}
        prevent={[
          <>화면 명세에 <b>로딩 · 빈 화면 · 에러 · 다시 시도</b> 네 칸을 항상 넣어요</>,
          <>MSW로 API마다 실패 응답을 만들어 두고 Storybook·테스트에서 에러 화면을 확인해요</>,
          <>리뷰에서 <code>isLoading</code>류 boolean 상태를 새로 만드는 코드를 짚어요</>,
        ]}
        links={[['#/loading/loading-skeleton', '14 로딩 패턴 · 스켈레톤'], ['#/empty/empty-error', '05 빈 화면 · 오류 화면'], ['#/dev/network/net-retry', '재시도 · 대체 UI 없음']]}
      />

      <Issue id="state-race"
        demo={f => <RaceDemo fixed={f} />}
        demoNote={<>응답 시간은 일부러 정해 둔 가짜 지연이에요. ‘해결 적용’은 실제 <code>AbortController</code>로 이전 요청을 취소해요.</>}
        cause={<>
          <p>계정을 바꾸면 ① <code>session</code> 스토어를 바로 바꾸고 ② 그 사람의 장바구니를 요청해요. 그런데 응답은 <b>보낸 순서대로 오지 않아요</b>. 느린 첫 요청이 나중에 도착하면 방금 바꾼 사용자 위에 <b>이전 사용자의 장바구니</b>를 덮어써요.</p>
          <p>두 스토어가 서로를 모르고 따로 바뀌니까 화면엔 ‘준호 님’과 ‘민지의 장바구니’가 함께 떠요. 필터·검색어를 빠르게 바꿀 때도 똑같아요. 남의 개인정보가 보일 수 있어서 위험해요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
async function switchUser(id: string) {
  session.setUser(id)
- const cart = await api.cart(id)   // 늦게 온 옛 응답도 그대로
- cartStore.setCart(cart)
}`,
          good: `
let ctrl: AbortController | undefined

async function switchUser(id: string) {
  session.setUser(id)
+ ctrl?.abort()                          // 이전 요청은 취소
+ ctrl = new AbortController()
  try {
+   const cart = await api.cart(id, { signal: ctrl.signal })
+   if (session.getUser() !== id) return // 한 번 더 확인
    cartStore.setCart(cart)
  } catch (e) {
+   if ((e as Error).name !== 'AbortError') throw e
  }
}`,
        }}
        root={<>
          <p>사용자별 데이터는 <b>캐시 키에 사용자 id를 넣어요</b>. TanStack Query의 <code>queryKey: ['cart', userId]</code>처럼 하면 옛 응답은 다른 칸에 들어가서 섞이지 않고, <code>queryFn</code>에 넘어오는 <code>signal</code>로 이전 요청도 취소할 수 있어요.</p>
          <p>로그아웃·계정 전환 때는 <b>사용자 범위 캐시를 한 번에 비우는 함수</b>(<code>queryClient.clear()</code> 등)를 하나만 두고, 순서가 중요한 흐름은 RxJS <code>switchMap</code>처럼 ‘마지막 요청만 남기는’ 도구를 써요.</p>
        </>}
        prevent={[
          <>개발자 도구 Network의 느린 속도 설정 + 버튼 연타로 응답 순서를 뒤집어 봐요</>,
          <>MSW 핸들러에 <code>delay()</code>를 무작위로 넣은 테스트를 둬요</>,
          <>리뷰 규칙: <code>await</code> 뒤에서 전역 상태를 쓰는 코드는 ‘아직 같은 요청인가?’를 확인해요</>,
        ]}
        links={[['#/dev/routing/rt-multitab', '여러 탭 간 세션 · 장바구니 불일치'], ['#/dev/network/net-double', '저장 연타로 중복 호출']]}
      />

      <Issue id="state-storage"
        demo={f => <StorageDemo fixed={f} />}
        demoNote={<>실제 <code>localStorage</code>와 실제 <code>JSON.parse</code> 에러예요. ‘하얀 화면’은 그 에러를 데모 틀이 받아서 보여주는 모습이에요.</>}
        cause={<>
          <p>설정을 메모리(state)와 localStorage <b>두 곳에</b> 두고 바꾸는 길이 여러 개면, 한쪽만 저장되기 쉬워요. 화면은 ‘크게’인데 저장소엔 ‘보통’이 남아서 <b>새로고침하면 되돌아가요</b>.</p>
          <p>반대로 저장소에 <b>옛 버전 형식이나 깨진 값</b>이 있으면, 앱이 시작할 때 <code>JSON.parse</code>가 에러를 던져서 첫 화면조차 못 그려요. 저장 공간이 꽉 찼거나 브라우저 설정으로 저장소 접근이 막힌 환경에선 읽고 쓰기 자체가 에러를 던지기도 해요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- const saved = JSON.parse(localStorage.getItem('settings')!)  // 깨지면 앱이 멈춰요

function useSettings() {
  const [s, setS] = useState(saved ?? DEFAULT)
  const pick = (size: Size) => {
    setS({ ...s, size })
    localStorage.setItem('settings', JSON.stringify({ ...s, size }))
  }
- const bump = () => setS({ ...s, size: 'L' })   // 여기선 저장을 빠뜨렸어요
  return { s, pick, bump }
}`,
          good: `
+ function readSettings(): Settings {
+   try {
+     const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
+     if (v?.version === 2 && SIZES.includes(v.size)) return v
+     if (typeof v?.fontSize === 'number') return migrateV1(v)  // 옛 형식
+   } catch { /* 깨진 값 · 저장소 접근 불가 */ }
+   return DEFAULT
+ }

function useSettings() {
+ const [s, setS] = useState(readSettings)   // 처음 한 번만 읽어요
+ useEffect(() => {                          // 어디서 바꾸든 여기서 저장
+   try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* 꽉 참 */ }
+ }, [s])
  return [s, setS] as const
}`,
        }}
        root={<>
          <p>저장되는 상태는 <b>한 곳(store)에서만 바꾸고, 저장도 그 한 곳에서</b> 해요. Zustand <code>persist</code>, Pinia용 persistedstate 플러그인, redux-persist처럼 <b>version과 migrate</b>를 지원하는 도구를 쓰면 형식이 바뀌어도 안전해요.</p>
          <p>저장소에서 읽은 값은 서버 응답처럼 <b>믿지 말고 검사</b>해요(Zod 등). 다른 탭에서 바꾼 값은 <code>storage</code> 이벤트로 받아서 맞춰요.</p>
        </>}
        prevent={[
          <>저장 형식을 바꾸는 PR엔 <code>version</code> 올리기와 migrate 테스트를 꼭 넣어요</>,
          <>개발자 도구 Application 탭에서 값을 일부러 깨뜨리고 새로고침해 봐요</>,
          <><code>localStorage</code>를 직접 부르는 코드를 린트로 막고, 공용 저장 함수만 쓰게 해요</>,
        ]}
        ours={<>테마 설정을 <code>localStorage</code>에 저장해요. <code>useState</code> 초기화 함수에서 한 번만 읽고, 읽기·쓰기를 모두 <code>try/catch</code>로 감싸서 저장소가 막힌 환경에서도 기본 테마로 떠요.</>}
        links={[['#/dev/routing/rt-multitab', '여러 탭 간 세션 · 장바구니 불일치']]}
      />

      <Issue id="state-form"
        demo={f => <FormDemo fixed={f} />}
        demoNote={<>칸마다 검증·마스크가 붙은 상황을 흉내 내려고 칸 하나 그리는 데 0.4ms를 일부러 더했어요. 개발 모드는 StrictMode라 실제보다 조금 느려요.</>}
        cause={<>
          <p>폼 값을 <b>객체 하나로 부모에 두고</b> 모든 칸을 제어 컴포넌트로 만들면, 한 칸에 글자 하나 칠 때마다 부모 state가 바뀌어서 <b>모든 칸이 다시 그려져요</b>.</p>
          <p>칸마다 검증·포맷팅·도움말이 붙으면 한 칸 그리기가 무거워지고, 칸이 수십 개면 글자 하나에 수십 ms가 걸려요. 저사양 폰에선 입력이 한 박자 늦게 따라와요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function ApplyForm() {
- const [form, setForm] = useState(initial)   // 24칸이 state 하나
  return FIELDS.map(f => (
    <Field key={f.name} label={f.label}
-     value={form[f.name]}
-     onChange={v => setForm({ ...form, [f.name]: v })} />
  ))
}`,
          good: `
+ import { useForm } from 'react-hook-form'

function ApplyForm() {
+ const { register, handleSubmit } = useForm({ defaultValues: initial })
  return (
    <form onSubmit={handleSubmit(save)}>
      {FIELDS.map(f => (
+       <input key={f.name} {...register(f.name)} />  // 값은 입력칸이 들고 있어요
      ))}
    </form>
  )
}`,
        }}
        root={<>
          <p>긴 폼은 <b>칸 단위로 구독하는 폼 라이브러리</b>(react-hook-form, TanStack Form)를 써요. 값은 칸이 들고 있고, 다른 칸 값이 필요한 곳만 <code>useWatch</code>로 골라 구독해요. 검증은 Zod 같은 스키마 하나로 모아요.</p>
          <p>직접 만든다면 칸마다 state를 내리고 <code>memo</code>로 감싸서 <b>바뀐 칸만</b> 다시 그려지게 해요. 무거운 실시간 검증은 blur나 debounce로 늦춰요.</p>
        </>}
        prevent={[
          <>React DevTools Profiler로 한 글자 입력을 녹화해서 다시 그려진 칸 수를 봐요</>,
          <>성능 탭의 CPU 4배 느리게 설정으로 긴 폼 입력을 직접 쳐 봐요</>,
          <>칸 20개가 넘는 폼은 공용 폼 라이브러리를 쓰도록 팀 규칙을 정해요</>,
        ]}
        links={[['#/dev/form/fm-controlled', '제어 · 비제어 컴포넌트 혼용'], ['#/dev/perf/perf-memo', 'useMemo · useCallback 누락과 오남용']]}
      />

      <Issue id="state-context"
        demo={f => <ContextDemo fixed={f} />}
        cause={<>
          <p>Context 값이 바뀌면 그 Context를 <code>useContext</code>로 읽는 <b>모든 컴포넌트가 다시 그려져요</b>. 실제로 쓰는 게 그중 한 값뿐이라도요. Context엔 일부만 골라 구독하는 기능이 없어요.</p>
          <p>그래서 테마·사용자·장바구니를 <b>객체 하나에 담아</b> 한 Context로 내리면, 테마만 바꿔도 인사말과 장바구니 배지까지 전부 다시 그려져요. Provider에서 <code>value={'{{…}}'}</code>를 매번 새로 만들면 Provider가 그려질 때마다 같은 일이 생겨요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function AppProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [user, setUser] = useState(me)
  const [cart, setCart] = useState([])
  return (
-   <AppContext value={{ theme, user, cart, setTheme, setCart }}>
      {children}
    </AppContext>
  )
}
- const { user } = useContext(AppContext)  // 테마가 바뀌어도 다시 그려져요`,
          good: `
function AppProvider({ children }) {
  …
+ const themeValue = useMemo(() => ({ theme, setTheme }), [theme])
  return (
+   <ThemeContext value={themeValue}>
+     <UserContext value={user}>
+       <CartContext value={cart}>{children}</CartContext>
+     </UserContext>
+   </ThemeContext>
  )
}
+ const user = useContext(UserContext)     // 사용자가 바뀔 때만`,
        }}
        root={<>
          <p>자주 바뀌는 값과 거의 안 바뀌는 값은 <b>Context를 나눠서</b> 내려요. 상태와 바꾸는 함수(<code>dispatch</code>)도 나누면 버튼만 있는 컴포넌트는 다시 그려지지 않아요.</p>
          <p>여러 값을 자주 바꾸고 골라 구독해야 한다면 Context 대신 <b>선택자(selector)를 지원하는 store</b>(Zustand, Jotai, Redux)를 써요. React Compiler가 메모를 넣어 줘도, Context를 읽는 컴포넌트는 값이 바뀌면 여전히 다시 실행돼요.</p>
        </>}
        prevent={[
          <>React DevTools의 ‘Highlight updates when components render’를 켜고 테마를 바꿔 번쩍이는 범위를 봐요</>,
          <>eslint-plugin-react의 <code>jsx-no-constructed-context-values</code> 규칙으로 Provider에 객체 리터럴을 바로 넣는 코드를 잡아요</>,
          <>한 Context에 자주 바뀌는 값과 안 바뀌는 값을 섞지 않기로 정해요</>,
        ]}
        links={[['#/dev/perf/perf-memo', 'useMemo · useCallback 누락과 오남용'], ['#/dev/state/state-drilling', 'Props Drilling 지옥']]}
      />

      <Issue id="state-vue-ref"
        demo={f => <VueRefDemo fixed={f} />}
        demoNote={<>Vue를 불러오지 않고, Vue 3 반응형의 규칙(<code>ref</code> 상자 · <code>reactive</code> Proxy · 읽은 값만 추적)을 작은 엔진으로 흉내 낸 재현이에요. 실수 세 가지는 실제 Vue에서도 똑같이 생겨요.</>}
        cause={<>
          <p>Vue 3의 <code>ref</code>는 값을 <b>상자에 넣은 것</b>이라 스크립트에서는 <code>.value</code>로 꺼내야 해요(템플릿에서는 자동으로 풀어 줘요). <code>.value</code>를 빼먹고 문자열에 붙이면 상자 자체가 글자로 바뀌어서 <b>[object Object]</b>가 떠요.</p>
          <p><code>reactive</code>는 Proxy라서 <b>구조 분해하거나 통째로 다시 할당하면</b> 반응형 연결이 끊겨요. 값은 바뀌었는데 화면은 옛 값을 계속 보여줘요. 두 방식을 섞어 쓰면 어디에 <code>.value</code>가 필요한지 헷갈려서 더 자주 생겨요.</p>
        </>}
        quick={{
          lang: 'Vue 3 · SFC',
          bad: `
<script setup>
import { ref, reactive, computed } from 'vue'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()
- const { qty } = cart                           // 그냥 숫자로 복사돼요
const name = ref('민지')
- const greeting = computed(() => \`\${name} 님\`)  // .value 누락
- let items = reactive([])
async function load() {
-   items = await api.items()                     // 새 배열로 바꿔치기
}
</script>

<template>{{ greeting }} · {{ qty }}개 · 목록 {{ items.length }}</template>`,
          good: `
<script setup>
import { ref, computed } from 'vue'
+ import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()
+ const { qty } = storeToRefs(cart)              // 반응형 그대로
const name = ref('민지')
+ const greeting = computed(() => \`\${name.value} 님\`)
+ const items = ref([])
async function load() {
+   items.value = await api.items()
}
</script>`,
        }}
        root={<>
          <p>팀 규칙으로 <b>ref 하나로 통일</b>하는 경우가 많아요. Vue 공식 문서도 반응형 상태의 기본으로 <code>ref()</code>를 권해요. 스토어나 reactive 객체에서 값을 꺼낼 땐 <code>storeToRefs</code>·<code>toRefs</code>를 써요.</p>
          <p>목록을 새로 받을 땐 <code>items.value = …</code>처럼 상자 안만 바꾸고, reactive를 꼭 써야 한다면 변수를 바꾸지 말고 <code>Object.assign</code>이나 배열 메서드로 내용을 바꿔요.</p>
        </>}
        prevent={[
          <>eslint-plugin-vue의 <code>vue/no-ref-as-operand</code>, <code>vue/no-setup-props-reactivity-loss</code> 규칙을 켜요</>,
          <>typescript-eslint의 <code>restrict-template-expressions</code>로 문자열 자리에 Ref가 들어가는 걸 잡아요</>,
          <>Vue DevTools에서 컴포넌트 상태가 Ref·Reactive로 보이는지, 구조 분해한 값이 일반 값으로 떨어졌는지 봐요</>,
        ]}
        links={[['#/dev/framework/fw-watch-deep', 'watchEffect의 깊은 추적 루프']]}
      />

      <Issue id="state-rxjs"
        demo={f => <RxjsDemo fixed={f} />}
        demoNote={<>Angular를 불러오지 않고, 컴포넌트 생명주기(<code>ngOnInit</code>/<code>ngOnDestroy</code>)와 Observable 구독을 작게 흉내 냈어요. 빨리 보이게 1초마다 폴링해요.</>}
        cause={<>
          <p>RxJS의 <code>subscribe()</code>는 <b>직접 끊기 전까지 계속 살아 있어요</b>. 컴포넌트가 사라져도 <code>interval</code>·웹소켓·store 구독은 자기가 쓸모없어진 줄 몰라요. (HTTP 요청처럼 한 번 값을 내고 끝나는 건 알아서 끝나요.)</p>
          <p>그래서 주문 상세 화면에 상태 폴링을 걸어 두면, 상세를 열 때마다 <b>구독이 하나씩 쌓여요</b>. 화면을 나간 뒤에도 요청과 로그가 몇 배로 늘고, 구독이 붙잡은 컴포넌트 때문에 메모리도 같이 새요.</p>
        </>}
        quick={{
          lang: 'Angular · RxJS',
          bad: `
@Component({ selector: 'app-order-detail', template: '…' })
export class OrderDetailComponent implements OnInit {
  private api = inject(OrderApi)
  id = input.required<string>()
  status = signal('')

  ngOnInit() {
-   interval(5000).pipe(
-     switchMap(() => this.api.status(this.id())),
-   ).subscribe(s => this.status.set(s))   // 끊지 않아요
  }
}`,
          good: `
+ import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'

export class OrderDetailComponent {
  private api = inject(OrderApi)
  id = input.required<string>()

+ status = toSignal(                       // 사라지면 자동으로 해제
+   interval(5000).pipe(switchMap(() => this.api.status(this.id()))),
+   { initialValue: '' },
+ )

  constructor() {                          // 직접 subscribe가 꼭 필요하면
    inject(OrderSocket).events$
+     .pipe(takeUntilDestroyed())
      .subscribe(e => this.notify(e))
  }
}`,
        }}
        root={<>
          <p>구독은 <b>프레임워크가 끊어 주는 방식</b>으로만 만들어요. 템플릿의 <code>async</code> 파이프, <code>toSignal</code>, <code>takeUntilDestroyed</code>(Angular 16+)예요. 직접 <code>subscribe</code>하는 코드는 예외로 보고 리뷰해요.</p>
          <p>폴링은 화면이 보일 때만 돌게 하고(<code>document.visibilityState</code>), 실시간 연결은 서비스 하나에서 <code>shareReplay({'{ bufferSize: 1, refCount: true }'})</code>로 나눠 써서 화면마다 새로 열지 않아요.</p>
        </>}
        prevent={[
          <>RxJS용 ESLint 플러그인(eslint-plugin-rxjs-x 등)의 <code>no-ignored-subscription</code> 같은 규칙으로 버려진 구독을 잡아요</>,
          <><code>fakeAsync</code> 테스트는 끝날 때 남은 주기 타이머가 있으면 에러를 내요. 컴포넌트를 destroy한 뒤 이 에러가 나는지 봐요</>,
          <>화면을 여러 번 오간 뒤 Network 탭에서 폴링 간격이 점점 촘촘해지는지 봐요</>,
        ]}
        links={[['#/dev/perf/perf-listener', '페이지 이동 후 남은 이벤트 리스너'], ['#/dev/framework/fw-zone', 'Zone.js 변경 감지 과다 실행']]}
      />

      <Issue id="state-bfcache"
        demo={f => <BfcacheDemo fixed={f} />}
        demoNote={<>이 사이트의 실제 방문 기록을 건드리지 않으려고, 이 칸 안에서 페이지를 ‘숨긴 채 살려 두는’ 방식으로 bfcache를 흉내 냈어요. 이벤트는 실제 <code>PageTransitionEvent</code> 객체로 보내요.</>}
        cause={<>
          <p>브라우저는 뒤로·앞으로 가기를 빠르게 하려고 떠난 페이지를 <b>통째로 얼려 두었다가</b> 그대로 되살려요. 이걸 <Term k="bfcache" d="back/forward cache. 뒤로·앞으로 가기를 할 때 페이지를 새로 불러오지 않고, 떠날 때 모습(JS 상태 포함) 그대로 되살리는 브라우저 기능이에요." />라고 해요. JS 상태, 스피너, 입력값이 떠날 때 모습 그대로예요.</p>
          <p>이때는 <code>load</code>·<code>DOMContentLoaded</code>도, 컴포넌트의 마운트 effect도 <b>다시 실행되지 않아요</b>. ‘결제하기’로 스피너를 켜고 결제 페이지로 갔다가 돌아오면 스피너는 그대로 돌고, 그사이 바뀐 재고·가격도 옛 값이에요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function ProductPage() {
  const [paying, setPaying] = useState(false)
  useEffect(() => { loadStock() }, [])   // 처음 열 때만
  const pay = () => {
    setPaying(true)
-   location.href = pgUrl                // 돌아오면 paying이 true인 채로 복원
  }
}`,
          good: `
useEffect(() => {
+ const onShow = (e: PageTransitionEvent) => {
+   if (!e.persisted) return             // bfcache에서 돌아온 경우만
+   setPaying(false)                     // 멈춘 스피너 끄기
+   loadStock()                          // 그사이 바뀌었을 값 다시 받기
+ }
+ window.addEventListener('pageshow', onShow)
+ return () => window.removeEventListener('pageshow', onShow)
}, [])`,
        }}
        root={<>
          <p>떠날 때의 화면 상태(로딩, 열린 모달, 임시 값)는 <b>돌아왔을 때 다시 확인</b>한다고 생각해요. <code>pageshow</code>의 <code>persisted</code>로 복원을 알아채고, 잔액·재고·로그인 여부처럼 바뀌기 쉬운 값은 다시 받아요.</p>
          <p>bfcache를 막으려고 <code>unload</code> 이벤트를 쓰는 건 피해요. <code>unload</code>는 bfcache를 못 쓰게 만들고 모바일에선 잘 실행되지도 않아요. 떠날 때 할 일은 <code>pagehide</code>나 <code>visibilitychange</code>에서 해요.</p>
        </>}
        prevent={[
          <>Chrome 개발자 도구 Application → <b>Back/forward cache</b>에서 테스트를 돌려 복원 여부와 막는 이유를 봐요</>,
          <>QA 시나리오에 ‘결제·외부 로그인 화면에 갔다가 뒤로 가기’를 넣어요</>,
          <><code>pageshow</code>에서 <code>persisted</code> 값을 분석 이벤트로 보내 실제 복원 비율을 봐요</>,
        ]}
        links={[['#/dev/routing/rt-scroll', '뒤로 가기 스크롤 복원 실패'], ['#/dev/browser/br-background', '백그라운드 전환 시 통신 중단']]}
      />
    </div>
  )
}
