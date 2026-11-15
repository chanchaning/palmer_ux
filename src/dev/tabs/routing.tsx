/* 05 라우팅 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './routing.css'
import { ChunkDemo, DirtyDemo, GuardDemo, ModalBackDemo, MfeDemo, MultitabDemo, OAuthDemo, QueryDemo, RefreshDemo, ScrollDemo } from './routing-demos'

const MINI = <>진짜 주소창 대신 데모 안의 <b>미니 브라우저</b>(가짜 주소창 · 방문 기록 · 서버)에서 재현해요. 이 페이지의 주소는 바뀌지 않아요.</>

export default function RoutingTab() {
  return (
    <div data-dev="routing">
      <TabIntro>
        SPA는 주소와 방문 기록을 앱이 직접 관리해요. 그래서 서버는 모르는 주소가 생겨요. 데모는 작은 미니 브라우저 안에서 돌아서 ← → ↻를 눌러도 이 페이지 주소는 안 바뀌어요.
      </TabIntro>

      <Issue id="rt-refresh-404"
        demo={f => <RefreshDemo fixed={f} />}
        demoNote={<>{MINI} 서버는 <code>index.html</code>과 <code>/assets</code>만 가진 정적 서버를 흉내 냈어요.</>}
        cause={<>
          <p>SPA에서 링크를 누르면 <code>history.pushState</code>로 주소만 바꾸고 서버엔 묻지 않아요. 새로고침하거나 공유받은 링크로 열 때는 달라요. 브라우저가 서버에 <code>GET /products/42</code>를 실제로 보내고, 정적 서버엔 그런 파일이 없으니 404가 와요. 로컬 개발 서버는 알아서 index.html을 주기 때문에 배포하고 나서야 알게 되는 일이 많아요.</p>
        </>}
        quick={{
          lang: 'nginx',
          bad: `
server {
  root /var/www/shop;
  location / {
-   try_files $uri =404;
  }
}`,
          good: `
server {
  root /var/www/shop;
  location / {
+   try_files $uri $uri/ /index.html;   # 없는 경로는 앱이 처리
  }
  location /assets/ {
+   try_files $uri =404;               # 빠진 JS·CSS는 진짜 404로
  }
}`,
        }}
        root={<>
          <p>배포처마다 없는 경로를 index.html로 돌려주는 대체 규칙을 걸어요. Netlify는 <code>_redirects</code>에 <code>/* /index.html 200</code>, Vercel은 <code>rewrites</code>, S3+CloudFront는 403·404 오류 응답을 <code>/index.html</code>로 바꿔요.</p>
          <p><code>/assets/*</code>와 API까지 index.html로 돌려주면 빠진 파일이 HTML로 와서 엉뚱한 에러가 나요. 규칙은 <b>문서 요청에만</b> 걸어요. GitHub Pages처럼 규칙을 못 거는 곳은 해시 라우팅(<code>#/…</code>)이나 미리 렌더링을 써요.</p>
        </>}
        prevent={[
          <>배포 후 스모크 테스트에 <code>/products/42</code> 같은 깊은 주소를 바로 여는 단계를 넣어요</>,
          <>로컬에서도 <code>vite preview</code>나 nginx 컨테이너로 빌드 결과를 열어 봐요</>,
          <><code>/assets/없는파일.js</code>는 HTML이 아닌 404로 와야 해요</>,
        ]}
        ours={<>GitHub Pages라 서버 대체 규칙을 쓸 수 없어서 <code>#/dev/routing</code> 같은 해시 라우팅을 써요(<code>App.tsx</code>의 <code>useHashRoute</code>). <code>#</code> 뒤는 서버로 가지 않으니 새로고침해도 서버는 늘 <code>index.html</code>만 받아요. 대신 주소가 조금 덜 예뻐요.</>}
        links={[['#/dev/build/bd-spa-fallback', '08 빌드 · 배포 · SPA 대체 경로'], ['#/dev/build/bd-cdn-cache', '08 빌드 · 배포 · CDN 캐시']]}
      />

      <Issue id="rt-multitab"
        demo={f => <MultitabDemo fixed={f} />}
        demoNote={<>두 ‘탭’은 한 페이지 안의 패널이지만, ‘고친 뒤’에서는 진짜 <code>BroadcastChannel</code> 두 개로 메시지를 주고받아요. 서버 세션은 데모 안의 변수예요.</>}
        cause={<>
          <p>탭마다 자바스크립트 메모리는 따로예요. 한 탭에서 로그아웃하거나 장바구니를 바꿔도 다른 탭의 React 상태는 처음 읽은 값을 들고 있어요. 그 탭에서 버튼을 누르면 끝난 세션으로 요청이 가서 401이 나거나, 옛 장바구니로 덮어써요. 로그아웃했는데 다른 탭에 내 이름이 남아 있으면 사용자는 불안해져요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
function logout() {
  localStorage.removeItem('token')
  setUser(null)
- // 다른 탭은 모르고 계속 로그인된 화면이에요
}`,
          good: `
+ const auth = new BroadcastChannel('auth')

function logout() {
  localStorage.removeItem('token')
  setUser(null)
+ auth.postMessage({ type: 'logout' })
}

+ auth.onmessage = e => {          // 다른 탭에서 온 소식
+   if (e.data.type === 'logout') { setUser(null); router.navigate('/login') }
+ }
+ // 앱을 내릴 때: auth.close()`,
        }}
        root={<>
          <p>세션·장바구니처럼 탭끼리 맞아야 하는 값은 바뀔 때 방송해요. <code>BroadcastChannel</code>을 쓰거나, localStorage에 쓰고 다른 탭에서 <code>storage</code> 이벤트를 받아요(쓴 탭 자신에겐 안 와요).</p>
          <p>메시지를 놓칠 수도 있으니 최종 판단은 <b>서버</b>가 해요. 401이 오면 API 공통 계층에서 로그인 화면으로 보내고, 탭이 다시 보일 때(<code>visibilitychange</code>) 세션과 장바구니를 새로 받아요. TanStack Query의 <code>refetchOnWindowFocus</code>가 이 일을 해 줘요.</p>
        </>}
        prevent={[
          <>QA 시나리오에 ‘탭 두 개 열고 한쪽에서 로그아웃 · 결제’를 넣어요</>,
          <>채널 이름과 메시지 모양은 상수·타입으로 정해 두고, 언마운트 때 <code>close()</code>해요</>,
        ]}
      />

      <Issue id="rt-oauth-param"
        demo={f => <OAuthDemo fixed={f} />}
        demoNote={<>{MINI} 로그인 제공자(auth.example)와 sessionStorage도 데모 안의 가짜예요.</>}
        cause={<>
          <p>OAuth 로그인은 우리 사이트 → 로그인 제공자 → <code>/callback</code>으로 페이지를 세 번 옮겨요. 그 사이 메모리는 다 사라지고, 제공자는 미리 등록한 콜백 주소로만 돌려보내요. 가드가 원래 주소(<code>/orders/7?tab=receipt</code>)를 <b>어딘가 적어 두지 않으면</b> 콜백은 홈으로 갈 수밖에 없어요. 앱 딥링크도 마찬가지예요.</p>
          <p>콜백을 push로 남기는 것도 문제예요. 뒤로 가기를 누르면 이미 쓴 인가 코드로 다시 들어가서 에러가 나요.</p>
        </>}
        quick={{
          lang: 'React Router',
          bad: `
// 가드
- if (!user) return <Navigate to="/login" />

// /callback
await exchange(code)
- navigate('/')`,
          good: `
// 가드: 원래 가려던 곳을 들고 가요
+ const here = location.pathname + location.search
+ if (!user) return <Navigate to={\`/login?returnTo=\${encodeURIComponent(here)}\`} replace />

// 로그인 시작: state 값과 돌아올 곳을 짝지어 저장
+ sessionStorage.setItem('oauth:' + state, returnTo)

// /callback
await exchange(code, state)
+ const back = sessionStorage.getItem('oauth:' + state) ?? '/'
+ const safe = back.startsWith('/') && !back.startsWith('//') ? back : '/'
+ navigate(safe, { replace: true })   // 콜백은 기록에서 지워요`,
        }}
        root={<>
          <p>돌아올 곳은 OAuth <code>state</code> 값과 짝지어 sessionStorage에 저장하거나 <code>state</code> 안에 담아요. <code>state</code>는 CSRF를 막는 무작위 값이라 콜백에서 맞는지 꼭 확인해요.</p>
          <p>돌아올 주소는 <b>우리 사이트 안의 경로만</b> 허용해요. 검사 없이 <code>?returnTo=https://evil.example</code>을 따라가면 오픈 리다이렉트 피싱에 쓰여요. 모바일은 유니버설 링크·앱 링크로 받은 경로를 같은 식으로 저장해 뒀다가 로그인 뒤 꺼내요.</p>
        </>}
        prevent={[
          <>E2E: 로그아웃 상태로 쿼리가 붙은 깊은 주소를 열고, 로그인한 뒤 같은 주소로 돌아오는지 확인해요</>,
          <>콜백 뒤에 뒤로 가기를 눌러도 콜백 페이지가 다시 실행되지 않아야 해요</>,
          <><code>returnTo</code>에 외부 주소나 <code>//evil.example</code>을 넣으면 거절되는지 테스트해요</>,
        ]}
      />

      <Issue id="rt-scroll"
        demo={f => <ScrollDemo fixed={f} />}
        demoNote={<>{MINI} 미니 브라우저의 본문이 창(window) 역할을 해요. ‘고치기 전’은 돌아올 때 목록을 0.5초 동안 다시 받아요.</>}
        cause={<>
          <p>브라우저는 뒤로 가기 때 스크롤을 복원해 줘요. 문제는 SPA에선 돌아오는 순간 목록이 비어 있다는 거예요. 데이터를 다시 받는 동안 페이지가 짧아서 위치가 맨 위로 잘리고, 데이터가 와도 그 자리에 머물러요.</p>
          <p>‘페이지 이동하면 맨 위로’ 코드가 새 이동(PUSH)과 뒤로 가기(POP)를 구분하지 않고 돌면, 뒤로 갈 때마다 맨 위로 튀어요.</p>
        </>}
        quick={{
          lang: 'React Router',
          bad: `
function Layout() {
  const { pathname } = useLocation()
- useEffect(() => window.scrollTo(0, 0), [pathname])  // 뒤로 가기에도 맨 위로
  return <Outlet />
}`,
          good: `
import { ScrollRestoration } from 'react-router'

function Layout() {
  return (
    <>
      <Outlet />
+     <ScrollRestoration getKey={loc => loc.key} />
    </>
  )
}
+ // 목록 데이터는 캐시해서 돌아올 때 바로 그려요
+ useQuery({ queryKey: ['products'], queryFn, staleTime: 60_000 })`,
        }}
        root={<>
          <p>라우터의 스크롤 복원 기능을 써요. React Router는 데이터 라우터에서 <code>&lt;ScrollRestoration /&gt;</code>, Vue Router는 <code>scrollBehavior(to, from, savedPosition)</code>에서 <code>savedPosition</code>을 돌려줘요. 복원할 때 <b>내용이 이미 그려져 있어야</b> 하니 목록 데이터를 캐시해 둬요.</p>
          <p>무한 스크롤이면 불러온 페이지 수도 같이 기억해야 해요. 상세를 모달이나 시트로 열어서 목록을 아예 내리지 않는 방법도 있어요.</p>
        </>}
        prevent={[
          <>목록을 30번째쯤까지 내리고 상세 → 뒤로 가기를 했을 때 같은 상품이 보이는지, 느린 3G에서도 확인해요. 빠른 네트워크에선 문제가 숨어요</>,
          <>‘맨 위로’ 코드는 PUSH일 때만 돌게 해요(<code>useNavigationType() !== 'POP'</code>)</>,
        ]}
        ours={<>페이지를 옮기면 <code>App.tsx</code>에서 <code>window.scrollTo(&#123; top: 0 &#125;)</code>로 맨 위로 보내요. 뒤로 가기도 구분하지 않아서 다른 가이드에 갔다 돌아오면 맨 위부터 보여요. 항목 주소(<code>#/dev/routing/rt-scroll</code>)로 들어오면 그 항목까지는 스크롤해 줘요.</>}
        links={[['#/layout/layout-back', '07 앱 화면 구성 · 뒤로 가기']]}
      />

      <Issue id="rt-guard-loop"
        demo={f => <GuardDemo fixed={f} />}
        demoNote={<>{MINI} 실제 앱은 끝없이 돌지만, 데모는 10번째에서 강제로 멈춰요.</>}
        cause={<>
          <p>가드가 두 군데 있어요. 대시보드는 ‘사용자 정보가 없으면 로그인으로’, 로그인 페이지는 ‘토큰이 있으면 대시보드로’ 보내요. 토큰은 남았는데 만료돼서 사용자 정보를 못 받는 순간, 둘이 서로를 가리키며 끝없이 튕겨요. 사용자 정보를 받는 중인데 ‘없음’으로 판단해도 같은 일이 생겨요. 로그인 여부를 판단하는 <b>기준이 둘</b>이라서예요.</p>
        </>}
        quick={{
          lang: 'Vue Router',
          bad: `
router.beforeEach(to => {
- if (to.path === '/login' && localStorage.token) return '/dashboard'
- if (to.meta.auth && !store.user) return '/login'
})`,
          good: `
router.beforeEach(async to => {
+ await auth.ready          // 'checking' 동안은 판단하지 않아요
+ const ok = auth.status === 'authed'   // 기준은 이것 하나
+ if (to.meta.auth && !ok)
+   return { path: '/login', query: { returnTo: to.fullPath }, replace: true }
+ if (to.path === '/login' && ok) return '/dashboard'
})
+ // 토큰 검증에 실패하면 토큰을 지우고 status = 'guest'`,
        }}
        root={<>
          <p>인증 상태를 <code>checking · authed · guest</code> 중 하나로 두고, 모든 가드가 그 값만 봐요. 확인 중엔 스피너를 보여 주고, 만료된 토큰은 그 자리에서 지워요.</p>
          <p>로그인·비밀번호 찾기 같은 공개 경로는 인증 가드에서 빼요. 리다이렉트는 <code>replace</code>로 해야 기록이 안 쌓여요. Vue Router는 같은 방향의 리다이렉트가 반복되면 ‘Detected a possibly infinite redirection’ 경고를 띄워요.</p>
        </>}
        prevent={[
          <>‘만료된 토큰이 남은 상태’로 보호 경로와 로그인 경로를 각각 열어 보는 테스트를 둬요</>,
          <>개발 모드에선 1초 안에 리다이렉트가 5번 넘으면 에러를 던지게 해 둬요</>,
          <>가드는 라우터 설정 한 곳에만 두고, 화면 컴포넌트 안에서 <code>navigate</code>로 튕기지 않아요</>,
        ]}
      />

      <Issue id="rt-modal-back"
        demo={f => <ModalBackDemo fixed={f} />}
        demoNote={<>{MINI} ‘휴대폰 뒤로 가기’는 안드로이드의 뒤로 버튼·제스처를 흉내 내요.</>}
        cause={<>
          <p>사용자에게 모달은 새 화면이에요. 안드로이드 사용자는 뒤로 가기로 시트를 닫는 게 습관이고요. 그런데 코드에서 모달은 <code>useState</code> 하나라 방문 기록엔 아무것도 없어요. 뒤로 가기가 모달을 건너뛰고 <b>이전 페이지로</b> 가 버리고, 고르던 옵션과 입력하던 값도 같이 사라져요.</p>
        </>}
        quick={{
          lang: 'React Router',
          bad: `
- const [open, setOpen] = useState(false)

<button onClick={() => setOpen(true)}>옵션 선택</button>
{open && <Sheet onClose={() => setOpen(false)} />}`,
          good: `
const location = useLocation()
const navigate = useNavigate()
+ const open = location.state?.modal === 'option'

+ <button onClick={() => navigate('.', { state: { modal: 'option' } })}>
  옵션 선택
</button>
+ {open && <Sheet onClose={() => navigate(-1)} />}   // 닫기 = 뒤로 가기`,
        }}
        root={<>
          <p>뒤로 가기로 닫혀야 하는 모달·시트·전체 화면 필터는 <b>열 때 기록을 한 칸 쌓아요</b>. 닫기 버튼은 새로 push하지 말고 <code>navigate(-1)</code>로 뒤로 가야 기록이 깨끗해요.</p>
          <p>공유돼야 하는 모달(사진 크게 보기 등)은 <code>?photo=3</code>처럼 주소에 넣어요. 그 주소로 바로 들어왔다면 돌아갈 기록이 없으니 닫기를 목록 이동으로 바꿔요. 확인창 같은 작은 대화상자는 기록에 넣지 않아요.</p>
        </>}
        prevent={[
          <>안드로이드 실기기에서 모달을 열고 뒤로 가기 한 번에 같은 페이지, 한 번 더에 이전 페이지가 나오는지 봐요</>,
        ]}
        links={[['#/similar/c-modal-popup', '모달 · 팝업 (닮은꼴)'], ['#/layout/layout-back', '07 앱 화면 구성 · 뒤로 가기']]}
      />

      <Issue id="rt-chunk"
        demo={f => <ChunkDemo fixed={f} />}
        demoNote={<>{MINI} 서버 파일 목록과 <code>import()</code> 결과는 흉내예요. ‘고친 뒤’에서 ‘잘못된 배포’를 누르면 새로고침이 반복되지 않는 걸, ‘옛 파일 남기기’를 켜면 새로고침 없이 넘어가는 걸 볼 수 있어요.</>}
        cause={<>
          <p>Vite·webpack은 화면별 코드를 <code>Settings-d4e5f6.js</code>처럼 내용 해시가 붙은 파일로 나눠요. 탭을 열어 둔 사용자의 앱은 옛 index.html이 가리키던 옛 파일 이름을 들고 있어요. 그 사이 배포가 폴더를 통째로 바꾸면 옛 파일이 사라지고, 아직 안 연 메뉴를 누르는 순간 <code>import()</code>가 404를 받아요. ‘Failed to fetch dynamically imported module’(webpack은 <code>ChunkLoadError</code>) 에러가 나고 화면이 하얘져요.</p>
        </>}
        quick={{
          lang: 'Vite · TypeScript',
          bad: `
const Settings = lazy(() => import('./pages/Settings'))
- // 배포 후 옛 청크 404 → 하얀 화면`,
          good: `
+ // Vite 4.4+: 동적 import의 미리 불러오기가 실패하면 이 이벤트가 와요
+ window.addEventListener('vite:preloadError', e => {
+   const last = Number(sessionStorage.getItem('chunk-reload') ?? 0)
+   if (Date.now() - last < 10_000) return   // 방금 새로고침했으면 멈춰요
+   e.preventDefault()
+   sessionStorage.setItem('chunk-reload', String(Date.now()))
+   location.reload()
+ })

+ const Settings = lazy(() => import('./pages/Settings').catch(err => {
+   if (/dynamically imported module|ChunkLoadError/.test(String(err))) reloadOnce()
+   throw err   // 에러 경계가 ‘새 버전이 있어요’ 화면을 보여요
+ }))`,
        }}
        root={<>
          <p><b>옛 파일을 바로 지우지 않아요</b>. 해시 파일은 이름이 겹치지 않으니 새 파일을 더하기만 하고, 옛 파일은 며칠 뒤 정리해요(S3 동기화에서 <code>--delete</code> 빼기 등). index.html만 <code>no-cache</code>로 둬요.</p>
          <p>옛 파일도 언젠가는 지워지니 한 번만 새로고침하는 처리를 같이 둬요. 새로고침 뒤에도 실패하면 반복하지 말고 에러 경계에서 안내 화면을 보여요. 오래 켜 두는 화면이라면 버전 파일을 폴링해서 새 버전을 미리 알려 줘도 좋아요.</p>
        </>}
        prevent={[
          <>배포 리허설 때 옛 버전 탭을 열어 둔 채 배포하고, 안 열어 본 메뉴를 눌러 봐요</>,
          <>배포 직후엔 에러 수집(Sentry 등)에서 <code>Failed to fetch dynamically imported module</code> 건수를 지켜봐요</>,
        ]}
        links={[['#/dev/build/bd-cdn-cache', '08 빌드 · 배포 · CDN 캐시']]}
      />

      <Issue id="rt-dirty"
        demo={f => <DirtyDemo fixed={f} />}
        demoNote={<>{MINI} 새로고침·탭 닫기 때 뜨는 브라우저 기본 확인창은 그림으로 흉내 냈어요(진짜 <code>beforeunload</code>는 걸지 않아요).</>}
        cause={<>
          <p>SPA에서 메뉴를 누르면 이전 화면 컴포넌트가 사라지면서 입력하던 상태도 같이 사라져요. 페이지를 떠난 게 아니니 브라우저는 아무것도 묻지 않아요.</p>
          <p>새로고침이나 탭 닫기는 거꾸로 앱이 끼어들 틈이 거의 없어요. <code>beforeunload</code>로 브라우저 기본 확인창을 띄우는 게 전부고, 문구도 바꿀 수 없어요.</p>
        </>}
        quick={{
          lang: 'React Router',
          bad: `
function Editor() {
  const [text, setText] = useState('')
- return <textarea value={text} onChange={e => setText(e.target.value)} />
}`,
          good: `
import { useBlocker, useBeforeUnload } from 'react-router'

function Editor() {
  const [text, setText] = useState(() => loadDraft())
  const dirty = text !== saved
+ const blocker = useBlocker(dirty)                 // 앱 안 이동 · 뒤로 가기
+ useBeforeUnload(e => { if (dirty) e.preventDefault() })  // 새로고침 · 닫기
+ useEffect(() => saveDraft(text), [text])          // 임시 저장 (디바운스 권장)
  return <>
    <textarea value={text} onChange={e => setText(e.target.value)} />
+   {blocker.state === 'blocked' && <LeaveDialog
+     onStay={blocker.reset} onLeave={blocker.proceed} />}
  </>
}`,
        }}
        root={<>
          <p>경고만으로는 부족해요. <b>임시 저장</b>(localStorage·IndexedDB·서버 초안)을 기본으로 두고, 실수로 나가도 돌아오면 이어 쓰게 해요. 경고는 그 위에 얹는 안전망이에요.</p>
          <p>앱 안 이동은 React Router <code>useBlocker</code>(데이터 라우터)나 Vue Router <code>onBeforeRouteLeave</code>로 막아요. <code>beforeunload</code>는 입력이 있을 때만 걸고 저장하면 바로 풀어요. 늘 걸어 두면 브라우저의 뒤로-앞으로 캐시(bfcache)를 못 쓰게 될 수 있어요.</p>
        </>}
        prevent={[
          <>긴 입력 폼마다 ‘쓰다가 메뉴 · 뒤로 · 새로고침’ QA를 돌리고, 저장한 뒤엔 경고가 안 뜨는지도 봐요</>,
          <>dirty 판단은 폼 라이브러리 값(react-hook-form의 <code>formState.isDirty</code> 등)을 그대로 써요</>,
        ]}
      />

      <Issue id="rt-query"
        demo={f => <QueryDemo fixed={f} />}
        demoNote={<>‘링크 공유받아 새로 열기’는 위 주소의 <code>?</code> 뒤를 실제 <code>URLSearchParams</code>로 다시 읽어요.</>}
        cause={<>
          <p>쿼리 문자열은 전부 글자예요. <code>false</code>는 <code>"false"</code>, <code>9000</code>은 <code>"9000"</code>으로 돌아와서 <code>if (soldout)</code>이 참이 되고 가격은 글자 순서로 비교돼요. 배열은 적는 방식을 정해 두지 않으면 깨져요.</p>
          <p>값을 <code>{'${k}=${v}'}</code>로 이어 붙이면 <code>&amp;</code>·<code>#</code>·<code>+</code>가 든 검색어가 <b>중간에서 잘려요</b>. 내 화면은 상태가 메모리에 있어 멀쩡하고, 링크를 받은 사람만 이상한 결과를 봐요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
- const qs = '?' + Object.entries(f).map(([k, v]) => \`\${k}=\${v}\`).join('&')
- const f = Object.fromEntries(new URLSearchParams(location.search))
if (f.soldout) { … }   // "false"도 참`,
          good: `
+ const p = new URLSearchParams()
+ if (f.q) p.set('q', f.q)                 // &, #, + 도 알아서 인코딩
+ f.cat.forEach(c => p.append('cat', c))   // 배열은 같은 키 여러 번
+ if (f.soldout) p.set('soldout', '1')

// 읽을 땐 타입마다 파서 + 기본값
+ const page = Math.max(1, Number(p.get('page')) || 1)
+ const cat = p.getAll('cat').filter(c => CATS.includes(c))
+ const soldout = p.get('soldout') === '1'`,
        }}
        root={<>
          <p>주소를 스키마로 다뤄요. TanStack Router의 <code>validateSearch</code>(zod·valibot 스키마)나 React용 <code>nuqs</code>의 <code>parseAsInteger</code>·<code>parseAsBoolean</code>·<code>parseAsArrayOf</code> 같은 파서가 읽기·쓰기·기본값을 한곳에서 맡아요.</p>
          <p>기본값과 같은 값은 주소에서 빼고, <code>page=abc</code> 같은 잘못된 값은 조용히 기본값으로 돌려요. 숫자·날짜 형식은 팀 규칙으로 정해 둬요.</p>
        </>}
        prevent={[
          <>필터 화면마다 ‘링크 복사 → 새 창에서 열기 → 같은 결과’ 테스트를 넣어요</>,
          <>검색어 테스트 값엔 <code>&amp; # + % 공백 한글</code>을 섞어요</>,
          <>직렬화·파싱 함수는 왕복(<code>parse(stringify(x)) === x</code>) 단위 테스트를 둬요</>,
        ]}
      />

      <Issue id="rt-mfe"
        demo={f => <MfeDemo fixed={f} />}
        demoNote={<>{MINI} 셸 라우터와 주문 앱 라우터가 한 방문 기록을 함께 쓰는 상황을 흉내 냈어요.</>}
        cause={<>
          <p><Term k="마이크로 프론트엔드" d="한 화면을 여러 팀이 각자 만든 작은 앱으로 나눠 붙이는 방식이에요. 바깥 틀(셸)이 안쪽 앱들을 불러와요." />에서는 셸과 안쪽 앱이 각자 라우터를 갖고 같은 <code>window.history</code>를 만져요. 안쪽 앱이 자기가 <code>/orders</code> 아래 붙은 줄 모르고 <code>/3</code>으로 push하면, 셸이 그걸 고치려고 <code>/orders/3</code>을 또 push해요.</p>
          <p>클릭 한 번에 기록이 <b>두 칸</b> 쌓이고 그중 하나는 엉킨 주소라, 뒤로 가기를 두 번 눌러야 이전 화면이 나와요. 라우터 버전이 다르면 서로의 popstate를 잘못 읽기도 해요.</p>
        </>}
        quick={{
          lang: 'React Router',
          bad: `
// 주문 앱 (셸 안에 붙는 앱)
- const router = createBrowserRouter(routes)   // basename 없음, history 따로
<RouterProvider router={router} />`,
          good: `
// 주문 앱: 셸이 주는 basename을 쓰고,
+ const router = createBrowserRouter(routes, { basename: '/orders' })

// 또는 history는 셸만 갖고, 안쪽은 메모리 라우터 + 셸 API
+ const router = createMemoryRouter(routes, { initialEntries: [props.path] })
+ router.subscribe(s => props.shell.navigate('/orders' + s.location.pathname))`,
        }}
        root={<>
          <p><b>history 주인은 셸 하나</b>로 정해요. 안쪽 앱은 셸이 준 basename 아래에서만 움직이거나, 메모리 라우터로 돌면서 주소 변경은 셸 API에 맡겨요. single-spa는 셸이 경로를 보고 앱을 켜고 끄고, Module Federation은 라우터 라이브러리를 <code>shared</code> 싱글턴으로 맞춰요.</p>
          <p>안쪽 앱이 셸 주소를 바꿀 땐 <code>replace</code>와 <code>push</code>를 분명히 나누고, 주소 동기화는 한 방향으로만 흐르게 해요.</p>
        </>}
        prevent={[
          <>E2E: 안쪽 앱에서 링크 3번 → 뒤로 가기 3번 → 처음 화면으로 오는지 확인해요</>,
          <>개발 모드에서 클릭 수와 <code>history.length</code> 증가량을 비교하는 감시 코드를 둬요</>,
        ]}
      />
    </div>
  )
}
