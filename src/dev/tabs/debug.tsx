/* 10 보안 · 디버깅 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './debug.css'
import { AnalyticsDemo, ConsoleDemo, FlakyDemo, MinifyDemo, NamingDemo, StackDemo, StorybookDemo, SupplyDemo, WhiteDemo, XssDemo } from './debug-demos'

export default function DebugTab() {
  return (
    <div data-dev="debug">
      <TabIntro>
        보안 구멍과 원인 모를 버그는 둘 다 사고가 난 뒤에야 보여요. 01·02·03·06·07은 브라우저에서 실제로 돌고, 나머지는 흐름만 보여 주는 재현이에요. 입력한 코드는 이 페이지에서 실행하지 않아요.
      </TabIntro>

      <Issue id="dbg-xss"
        demo={f => <XssDemo fixed={f} />}
        demoNote={<>‘고치기 전’도 실제로 실행하지 않아요. 스크립트를 막은 <code>sandbox=""</code> iframe 안에 그리고, 실행됐을 코드는 속성을 읽어 목록으로만 보여 줘요. 이미지 주소도 지워서 요청이 나가지 않아요. 콘솔의 ‘Blocked script execution’은 샌드박스가 막았다는 표시예요.</>}
        cause={<>
          <p>사용자가 쓴 글을 <code>innerHTML</code>(React는 <code>dangerouslySetInnerHTML</code>, Vue는 <code>v-html</code>)로 넣으면 브라우저는 그걸 우리 사이트 코드로 해석해요. <code>&lt;img onerror&gt;</code> 같은 이벤트 속성이 우리 도메인 권한으로 실행되는데, 이게 <Term k="XSS" d="Cross-Site Scripting. 공격자가 넣은 스크립트가 다른 사용자의 브라우저에서 우리 사이트 권한으로 실행되는 공격이에요." />예요. 쿠키나 <code>localStorage</code>의 토큰을 빼 가거나 그 사용자인 척 요청을 보낼 수 있어요.</p>
          <p>innerHTML로 넣은 <code>&lt;script&gt;</code>는 실행되지 않아요. 그래서 “script 태그만 막으면 된다”고 착각하기 쉬워요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function PostBody({ post }) {
  return (
-   <div dangerouslySetInnerHTML={{ __html: post.body }} />
  )
}`,
          good: `
// 서식이 필요 없으면: 그냥 글자로 (React가 알아서 이스케이프)
+ <p>{post.body}</p>

// 서식이 필요하면: 허용 목록으로 정리한 뒤에만
+ import DOMPurify from 'dompurify'
+ const clean = DOMPurify.sanitize(post.body, {
+   ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
+   ALLOWED_ATTR: ['href'],
+ })
+ <div dangerouslySetInnerHTML={{ __html: clean }} />`,
        }}
        root={<>
          <p>기본은 글자로 그리기예요. 서식이 꼭 필요하면 마크다운처럼 제한된 형식으로 받고, 화면에 넣기 직전에 <b>DOMPurify로 허용 목록 정리</b>를 해요. 금지 목록 방식(“script 빼기”)은 언젠가 뚫려요. <code>href</code>는 <code>http(s):</code>만 허용해 <code>javascript:</code> 링크를 막아요.</p>
          <p>두 번째 방어선은 <Term k="CSP" d="Content-Security-Policy. 어떤 출처의 스크립트를 실행해도 되는지 브라우저에게 알려 주는 응답 헤더예요." />예요. <code>script-src 'self'</code>(가능하면 nonce 방식)로 인라인 이벤트 속성 실행을 막아요. <code>require-trusted-types-for 'script'</code>로 Trusted Types를 켜면, 정리하지 않은 문자열을 innerHTML에 넣을 때 브라우저가 막아요(크롬 계열 지원). 토큰을 JS가 못 읽는 <code>HttpOnly</code> 쿠키에 두면 뚫려도 피해가 줄어요.</p>
        </>}
        prevent={[
          <>린트로 <code>dangerouslySetInnerHTML</code> · <code>v-html</code> · <code>innerHTML =</code>에 경고를 띄워요</>,
          <>CSP는 <code>Content-Security-Policy-Report-Only</code>로 먼저 켜서 위반 보고를 모은 뒤 차단으로 바꿔요</>,
          <>QA 입력값 목록에 <code>&lt;img src=x onerror=…&gt;</code>와 <code>javascript:</code> 링크를 넣어 둬요</>,
        ]}
        ours={<><code>dangerouslySetInnerHTML</code>은 코드가 만든 SVG 그림을 넣는 세 곳에서만 써요. 사용자 입력은 HTML로 넣지 않아요.</>}
      />

      <Issue id="dbg-console"
        demo={f => <ConsoleDemo fixed={f} />}
        demoNote={<>진짜 <code>console</code>을 바꾸지 않아요. 가짜 로그인 코드에 로거를 넘겨서, 그 로거가 찍은 줄만 아래 콘솔 칸에 모아요. 토큰·연락처는 모두 가짜예요.</>}
        cause={<>
          <p>개발하며 찍은 <code>console.log(res)</code>가 그대로 운영에 나가는 일이 많아요. 응답 전체를 찍으면 토큰, 이메일, 전화번호가 같이 나오고, 공용 PC나 화면 공유, 사용자가 보낸 스크린샷으로 새요. 브라우저 확장이나 에러 수집 도구가 콘솔 내용을 가져가기도 하니 콘솔은 공개된 곳으로 봐야 해요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
const res = await api.post('/login', { email, password })
- console.log('로그인 요청', { email, password })
- console.log('응답', res.data)   // accessToken, user.phone …`,
          good: `
+ const SECRET = /token|password|authorization|secret/i
+ const redact = (o) => JSON.parse(JSON.stringify(o, (k, v) =>
+   SECRET.test(k) ? '[가림]' : v))

+ export const log = {
+   debug: (...a) => { if (import.meta.env.DEV) console.debug(...a.map(redact)) },
+   error: (msg, data) => reportError(msg, redact(data)), // 수집 도구로
+ }

const res = await api.post('/login', { email, password })
+ log.debug('로그인 응답', res.data)`,
        }}
        root={<>
          <p>앱 코드에선 console 대신 공용 로거 하나만 써요. 로거는 운영에서 debug를 버리고, 남기는 줄도 키 이름을 보고 민감한 값을 가려요. 에러는 Sentry 같은 수집 도구로 보내되, 거기서도 <code>beforeSend</code>로 가려요.</p>
          <p>빌드에서 한 번 더 지워요. Vite(esbuild 압축)는 <code>esbuild: {'{'} drop: ['console', 'debugger'] {'}'}</code>, terser는 <code>compress.drop_console</code>이에요. 다만 이건 <b>console.error까지 지워서</b> 진짜 에러 기록도 사라져요. <code>pure: ['console.log', 'console.debug']</code>처럼 골라 지우는 편이 안전해요. 옵션 이름은 압축기마다 다르니 쓰는 버전 문서를 확인해요.</p>
        </>}
        prevent={[
          <>린트 <code>no-console</code>을 켜고 <code>warn</code>·<code>error</code>만 허용해요</>,
          <>운영 빌드를 띄워 로그인·결제를 해 보고 콘솔이 비어 있는지 봐요</>,
        ]}
        ours={<>코드에 <code>console.log</code>가 없어요. <code>console.error</code>는 데모 실행이 실제로 실패했을 때 찍는 한 곳뿐이에요.</>}
        links={[['#/dev/build/bd-env-leak', '빌드 · 개발용 .env가 운영에 섞임']]}
      />

      <Issue id="dbg-white"
        demo={f => <WhiteDemo fixed={f} />}
        demoNote={<>위젯은 진짜로 TypeError를 던지지만, 데모 바깥에 바운더리를 따로 둬서 하얘지는 건 이 칸뿐이에요. React가 잡은 에러를 콘솔에 빨갛게 찍는 건 정상이고, ‘고치기 전’의 쿠폰 에러도 콘솔에 Uncaught (in promise)로 남아요.</>}
        cause={<>
          <p>렌더링 중 에러가 났는데 받아 줄 에러 바운더리가 없으면 React는 앱 전체를 화면에서 떼어 내요. 반쯤 망가진 화면보다 그게 낫다고 보는 거예요. 추천 위젯 하나가 <code>null.map</code>으로 터졌는데 결제 버튼까지 사라지는 게 이 때문이에요.</p>
          <p>바운더리는 <b>이벤트 핸들러, setTimeout, Promise 안의 에러를 못 잡아요</b>. 따로 처리하지 않으면 사용자는 눌러도 반응 없는 버튼만 보게 돼요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<Page>
  <OrderSummary />
- <Recommend />   {/* 여기서 터지면 페이지 전체가 하얘져요 */}
  <Notice />
</Page>`,
          good: `
+ import { ErrorBoundary } from 'react-error-boundary'

<Page>
  <OrderSummary />
+ <ErrorBoundary
+   fallbackRender={({ resetErrorBoundary }) => (
+     <p>추천을 불러오지 못했어요 <button onClick={resetErrorBoundary}>다시 시도</button></p>)}
+   onError={(e, info) => report(e, info.componentStack)}>
    <Recommend />
+ </ErrorBoundary>
  <Notice />
</Page>

+ // 바운더리가 못 잡는 비동기 에러의 안전망
+ window.addEventListener('unhandledrejection', e => { report(e.reason); showToast() })`,
        }}
        root={<>
          <p>바운더리는 세 군데에 둬요. ① 앱 최상단: 하얀 화면 대신 “문제가 생겼어요, 새로고침”. ② 라우트마다: 다른 메뉴로는 계속 갈 수 있게. ③ 독립 위젯마다: 그 칸만 대체 화면. 라우터의 <code>errorElement</code>도 같은 역할을 해요.</p>
          <p>비동기 에러는 호출하는 곳에서 catch하는 게 기본이에요. TanStack Query처럼 에러 상태를 돌려주는 도구를 쓰면 화면에서 다루기 쉬워요. <code>unhandledrejection</code>·<code>error</code> 전역 핸들러는 놓친 것을 모으는 마지막 그물이에요.</p>
        </>}
        prevent={[
          <>API 응답을 zod 같은 스키마로 검사해서 <code>null</code>이 렌더까지 내려오기 전에 걸러요</>,
          <>E2E에 API를 일부러 500·빈 값으로 바꾼 시나리오를 넣어요</>,
        ]}
        ours={<><code>App.tsx</code>가 화면 본문을 <code>ErrorBoundary</code> 하나로 감싸요. 한 화면이 터지면 사이드바와 상단 바는 남고 그 자리에만 ‘다시 시도 · 홈으로’가 떠요. 주소가 바뀌면 에러를 지우고 새로 그려요. 배포 직후 옛 청크를 못 찾는 에러는 따로 알아보고 새로고침 버튼을 보여 줘요.</>}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면']]}
      />

      <Issue id="dbg-supply"
        demo={f => <SupplyDemo fixed={f} />}
        demoNote={<>실제 설치는 하지 않는 시뮬레이션이에요. 패키지 이름은 지어낸 거예요.</>}
        cause={<>
          <p><code>"^1.4.2"</code>는 ‘1.x 중 최신’이라는 뜻이에요. 잠금 파일 없이 <code>npm install</code>하면 어제 올라온 1.4.3을 받아요. 관리자 계정이 털려 악성 버전이 올라오면, 우리가 아무것도 안 바꿔도 다음 빌드에 섞여요.</p>
          <p>게다가 패키지는 설치할 때 <code>postinstall</code> 같은 스크립트를 우리 CI 권한으로 실행할 수 있어요. 토큰이 든 환경 변수를 읽을 수도, 다른 패키지 파일을 고칠 수도 있어요. 한 글자 다른 이름(<code>reacct-dom</code>)으로 속이는 타이포스쿼팅도 흔해요.</p>
        </>}
        quick={{
          lang: 'package.json · CI',
          bad: `
// package.json
- "left-padder": "^1.4.2"

# CI
- run: npm install`,
          good: `
// package.json — 잠금 파일(package-lock.json)도 커밋해요
+ "left-padder": "1.4.2"

# .npmrc
+ ignore-scripts=true

# CI
+ run: npm ci              # 잠금 파일 그대로, 다르면 실패
+ run: npm audit signatures # 서명 · 출처 확인
+ run: npm audit --audit-level=high`,
        }}
        root={<>
          <p>설치는 재현 가능하게, 업데이트는 천천히 받아요. CI는 늘 <code>npm ci</code>로 잠금 파일 그대로 설치하고, 업데이트는 Renovate·Dependabot PR로만 들여요. Renovate에 <code>minimumReleaseAge</code>(예: 3일)를 걸면 갓 나온 버전을 커뮤니티가 먼저 걸러 줄 시간을 벌어요.</p>
          <p>설치 스크립트는 <code>ignore-scripts</code>로 끄고 꼭 필요한 패키지만 따로 빌드해요(pnpm 10은 의존성 스크립트를 기본으로 막고 허용 목록을 써요). 우리 패키지를 배포할 땐 <code>npm publish --provenance</code>로 출처를 남기고, CDN 스크립트엔 <code>integrity</code>(<Term k="SRI" d="Subresource Integrity. 받은 파일의 해시가 적어 둔 값과 다르면 브라우저가 실행하지 않아요." />)를 붙여요. 취약점은 <code>npm audit</code>나 OSV-Scanner로 봐요.</p>
        </>}
        prevent={[
          <>잠금 파일이 바뀐 PR은 바뀐 패키지 목록을 읽어요. 이름 오타나 처음 보는 패키지가 있는지 봐요</>,
          <>CI 토큰엔 필요한 권한만 주고, 설치 단계엔 배포용 비밀값을 넘기지 않아요</>,
          <>한 줄짜리 패키지는 설치하지 말고 직접 써요</>,
        ]}
        ours={<><code>package-lock.json</code>을 커밋하고 배포 워크플로가 <code>npm ci</code>로 설치해요. 실행 의존성은 react와 react-dom 두 개뿐이에요.</>}
      />

      <Issue id="dbg-storybook"
        demo={f => <StorybookDemo fixed={f} />}
        demoNote={<>CI 결과는 흐름만 보여 주는 재현이고, 버튼 두 개는 진짜 컴포넌트예요.</>}
        cause={<>
          <p>스토리 파일이 컴포넌트 복사본이나 옛 props를 쓰고 있으면, 실제 컴포넌트가 바뀌어도 Storybook은 멀쩡해 보여요. props 이름이 <code>variant</code>에서 <code>tone</code>으로 바뀌어도 스토리의 args는 타입 검사를 안 받으니 아무도 몰라요. 그동안 실제 화면은 모르는 prop을 조용히 무시해서 글자나 색이 빠져 있고요.</p>
        </>}
        quick={{
          lang: 'Storybook · TSX',
          bad: `
// stories/Button.stories.js — 컴포넌트와 멀리 떨어진 JS 파일
- const Button = (p) => <button className={p.variant}>{p.label}</button>
export default { component: Button }
- export const Primary = { args: { label: '구매하기', variant: 'primary' } }`,
          good: `
// src/ui/Button/Button.stories.tsx — 컴포넌트 옆에
+ import { Button } from './Button'
+ import type { Meta, StoryObj } from '@storybook/react-vite'
+ import { expect } from 'storybook/test'

+ const meta = { component: Button } satisfies Meta<typeof Button>
export default meta
+ export const Primary: StoryObj<typeof meta> = {
+   args: { tone: 'brand', children: '구매하기' },   // 틀리면 tsc 에러
+   play: async ({ canvas }) => {
+     await expect(canvas.getByRole('button', { name: '구매하기' })).toBeVisible()
+   },
+ }`,
        }}
        root={<>
          <p>스토리는 컴포넌트 바로 옆에 두고 진짜 컴포넌트를 import해요. <code>satisfies Meta&lt;typeof Button&gt;</code>로 args를 타입 검사하면 props 이름이 바뀌는 순간 CI가 깨져요.</p>
          <p>스토리는 테스트로도 써요. <code>play</code> 함수로 상호작용 테스트를 돌리고(test-runner나 Vitest 애드온), Chromatic 같은 시각 회귀 테스트로 스토리마다 스크린샷을 비교하면 의도치 않은 변화가 리뷰에 드러나요.</p>
        </>}
        prevent={[
          <>CI의 <code>tsc</code>가 <code>*.stories.tsx</code>까지 검사하는지 확인해요</>,
        ]}
        links={[['#/system/components', '디자인 시스템 · 컴포넌트 사전']]}
      />

      <Issue id="dbg-flaky"
        demo={f => <FlakyDemo fixed={f} />}
        demoNote={<>실제 타이머와 실제 무작위 지연(300~900ms)으로 돌려요. 테스트 프레임워크 대신 같은 원리의 작은 코드를 써서, 고정 대기는 응답이 500ms 안에 온 경우만 통과해요.</>}
        cause={<>
          <p><code>sleep(500)</code>처럼 시간을 정해 두고 기다리면 서버나 CI 기계가 조금만 느려도 실패해요. 내 노트북에선 늘 통과하고 CI에선 가끔 떨어지니 “다시 돌리면 되겠지”가 습관이 되고, 나중엔 진짜 버그로 실패해도 다시 돌려서 넘겨요. 넉넉하게 <code>sleep(5000)</code>을 걸면 이번엔 테스트가 다 느려져요.</p>
        </>}
        quick={{
          lang: 'Playwright',
          bad: `
await page.click('text=주문 내역')
- await page.waitForTimeout(500)
- expect(await page.isVisible('.order-row')).toBe(true)`,
          good: `
+ // 네트워크를 고정하면 서버 속도와 무관해져요
+ await page.route('**/api/orders', r => r.fulfill({ json: ORDERS }))

await page.getByRole('link', { name: '주문 내역' }).click()
+ // 보일 때까지 자동으로 다시 확인해요 (기본 5초)
+ await expect(page.getByRole('row').first()).toBeVisible()`,
        }}
        root={<>
          <p><b>시간 대신 조건을 기다려요</b>. Playwright의 <code>expect(locator).toBeVisible()</code> 같은 web-first 단언은 조건이 맞을 때까지 다시 확인하고, <code>click()</code>도 요소가 클릭 가능해질 때까지 기다려요(auto-waiting). Testing Library에선 <code>findBy…</code>·<code>waitFor</code>예요.</p>
          <p>UI 테스트의 서버 응답은 <code>page.route</code>나 MSW로 고정해요. 실제 서버와의 연결은 소수의 통합 테스트에서 따로 봐요. 테스트 데이터는 서로 나눠 쓰지 않게 매번 새로 만들어요.</p>
        </>}
        prevent={[
          <>린트로 <code>waitForTimeout</code> · <code>sleep</code>을 막아요(<code>eslint-plugin-playwright</code>)</>,
          <>CI 재시도는 켜 두되, 재시도로 통과한 테스트 목록을 매주 보고 고쳐요</>,
          <>새 테스트는 <code>--repeat-each=20</code>으로 여러 번 돌려 본 뒤 합쳐요</>,
        ]}
      />

      <Issue id="dbg-stack"
        demo={f => <StackDemo fixed={f} />}
        demoNote={<>실제로 에러를 던지고, 에러 바운더리가 받은 <code>error.stack</code>과 <code>info.componentStack</code>을 그대로 보여 줘요(주소만 줄였어요). 개발 서버 기준이라 운영 빌드에선 소스맵이 있어야 이렇게 보여요. 같은 에러가 콘솔에도 찍혀요.</>}
        cause={<>
          <p>HOC를 여러 겹 감싸면 컴포넌트 스택이 Wrapper, Wrapper, Wrapper…로 채워져요. 공통 HOC가 늘 같은 이름의 함수를 돌려주고 안쪽은 이름 없는 화살표 함수라, 어느 화면의 무엇인지 알 수 없어요.</p>
          <p>JS 스택(<code>error.stack</code>)은 대부분 React 내부 줄이에요. 운영 빌드에선 그마저 압축된 한 줄 파일의 위치라서 소스맵 없이는 못 읽어요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- const wrap = (C) => (props) => <C {...props} />   // 이름 없음
- export default wrap(wrap((p) => <b>{p.price.amount}원</b>))`,
          good: `
+ export function PriceTag({ price }) { … }       // 이름 있는 함수

export function withAuth(C) {
+ function WithAuth(props) { return <C {...props} /> }
+ WithAuth.displayName = \`withAuth(\${C.displayName || C.name})\`
  return WithAuth
}

class Boundary extends Component {
  componentDidCatch(error, info) {
+   report(error, { componentStack: info.componentStack })
  }
}`,
        }}
        root={<>
          <p>컴포넌트는 이름 있는 함수로 만들고, HOC엔 <code>withX(Inner)</code> 형태의 <code>displayName</code>을 붙여요. 할 수 있으면 HOC를 훅으로 바꿔 감싸는 층을 줄여요.</p>
          <p>운영에서는 <b>소스맵을 만들되 에러 수집 도구에만 올려요</b>(Vite <code>build.sourcemap: 'hidden'</code>). 에러를 보낼 땐 <code>info.componentStack</code>도 같이 보내요. React 19는 <code>createRoot</code>의 <code>onCaughtError</code>·<code>onUncaughtError</code>로 한곳에서 모을 수도 있어요.</p>
        </>}
        prevent={[
          <>린트 <code>react/display-name</code>을 켜요</>,
          <>소스맵 업로드가 실패하면 배포도 실패하게 파이프라인을 짜요</>,
        ]}
        links={[['#/dev/framework/fw-hoc', '프레임워크 · 너무 깊은 HOC 래핑'], ['#/dev/build/bd-sourcemap', '빌드 · 운영 소스맵 노출']]}
      />

      <Issue id="dbg-minify"
        demo={f => <MinifyDemo fixed={f} />}
        demoNote={<>예시 숫자로 만든 프로파일 재현이에요. 실제로는 Chrome 성능 패널이나 React DevTools Profiler에서 이런 모양을 봐요.</>}
        cause={<>
          <p>운영 빌드는 용량을 줄이려고 함수 이름을 a, t, Ve처럼 바꾸고 코드를 한 줄에 붙여요. 운영에서만 느린 문제를 프로파일러로 찍으면 “a가 470ms”만 보여서 어느 코드인지 알 수 없어요. React도 운영 빌드에선 Profiler 측정을 꺼 둬서, 운영 사이트에선 React DevTools의 Profiler 탭이 동작하지 않아요.</p>
        </>}
        quick={{
          lang: 'vite.config.ts',
          bad: `
export default defineConfig({
  build: {
-   // sourcemap 없음 — 프로파일에 a, b, c 만 보여요
  },
})`,
          good: `
export default defineConfig(({ mode }) => ({
  build: {
+   sourcemap: 'hidden',   // 지도는 만들되 번들에 주소를 안 적어요
  },
+ resolve: mode === 'profile' ? {
+   alias: { 'react-dom/client': 'react-dom/profiling' },  // 운영 + Profiler
+ } : {},
}))
// 측정용 빌드: vite build --mode profile`,
        }}
        root={<>
          <p>소스맵이 있으면 Chrome DevTools가 압축된 위치를 원본 파일·줄로 바꾸고, 성능 패널에도 원래 함수 이름이 나와요. 공개하기 싫으면 <code>hidden</code>으로 만들어 내부에서 DevTools에 직접 불러오거나 에러 수집 도구에만 올려요.</p>
          <p>React 렌더 성능은 <b>profiling 빌드</b>(<code>react-dom/profiling</code>)로, 운영과 같은 최적화 상태에서 재요. 개발 빌드는 검사 코드가 많아 운영보다 훨씬 느리게 나와요.</p>
        </>}
        prevent={[
          <>성능은 개발 서버 말고 <code>vite build && vite preview</code> 결과로 재요</>,
          <>긴 작업엔 <code>performance.mark</code>·<code>measure</code>로 이름표를 붙여요. 압축과 상관없이 보여요</>,
        ]}
        ours={<>운영 빌드는 Vite 기본값이라 소스맵이 없어요(<code>build.sourcemap</code> 꺼짐). 공개 사이트라 코드는 어차피 보이지만, 운영에서 프로파일을 읽으려면 따로 빌드해야 해요.</>}
        links={[['#/dev/build/bd-sourcemap', '빌드 · 운영 소스맵 노출'], ['#/dev/perf', '01 렌더링 · 성능']]}
      />

      <Issue id="dbg-analytics"
        demo={f => <AnalyticsDemo fixed={f} />}
        demoNote={<>지어낸 세션으로 만든 재현이에요. 실제로는 이벤트 수집(Amplitude·GA4 등), 에러 수집(Sentry 등), 세션 리플레이 도구가 이 정보를 나눠 모아요.</>}
        cause={<>
          <p>“안 넘어가요” 문의엔 기기도 시각도, 어디서 멈췄는지도 없어요. 결제 요청이 서버까지 오지 않았으니 서버 로그도 비어 있고, 개발자 폰에선 잘 되니 “재현 안 됨”으로 닫혀요.</p>
          <p>이런 문제는 대개 화면 안에서 생겨요. 에러 토스트가 키보드에 가려졌거나, 버튼이 왜 비활성인지 안 알려 줬거나요. 브라우저에서 단서를 남기지 않으면 알 길이 없어요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
async function applyCoupon(code) {
  try { await api.applyCoupon(code) }
- catch { setError(true) }   // 아무 기록도 안 남아요
}`,
          good: `
+ // 이벤트 이름 규칙: 대상_행동 (snake_case), 속성은 정해진 목록만
+ track('coupon_apply', { code_length: code.length })
async function applyCoupon(code) {
  try { await api.applyCoupon(code) }
  catch (e) {
    setError(true)
+   track('coupon_apply_failed', { reason: e.code })   // 'COUPON_EXPIRED'
+   Sentry.captureException(e, { tags: { step: 'checkout' } })
  }
}
+ // 리플레이는 입력값을 녹화 단계에서 가려요
+ Sentry.replayIntegration({ maskAllInputs: true, maskAllText: true })`,
        }}
        root={<>
          <p><b>이벤트 사전(taxonomy)</b>부터 정해요. 이름 규칙, 꼭 남길 단계(장바구니 → 결제 시작 → 결제 완료), 속성 목록을 문서로 두면 퍼널 어디서 빠지는지 보여요. 에러 수집엔 세션 ID를 붙여 문의와 연결해요.</p>
          <p>세션 리플레이엔 개인정보가 그대로 찍힐 수 있어요. 입력칸·이름·주소는 브라우저를 떠나기 전, 녹화 단계에서 가려요. 결제 화면은 아예 빼고, 처리방침에 수집 사실을 적고 보관 기간을 정해요.</p>
        </>}
        prevent={[
          <>새 화면 기획서에 ‘남길 이벤트’ 칸을 넣어요</>,
          <>리플레이 가림 설정을 바꿀 땐 개인정보 담당자 확인을 받아요</>,
          <>CS 문의 양식에 앱 버전과 세션 ID를 자동으로 붙여요</>,
        ]}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면']]}
      />

      <Issue id="dbg-naming"
        demo={f => <NamingDemo fixed={f} />}
        demoNote={<>세 컴포넌트 모두 진짜로 동작해요. 가운데 Dropdown은 일부러 div로 만들어 키보드로 쓸 수 없어요.</>}
        cause={<>
          <p>이미 있는 컴포넌트를 찾기 어려우면 새로 만들게 돼요. 누구는 SelectBox, 누구는 Dropdown, 누구는 Picker로 부르고 각자 폴더에 넣으니 검색해도 안 나와요. 그렇게 생긴 세 벌은 높이·접근성·prop 이름이 다 달라서, 디자인을 바꾸거나 버그를 고칠 때 세 곳을 따로 손봐야 해요. 한 곳은 빠지기 쉬워요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- import SelectBox from '@/pages/list/SelectBox'
- import Dropdown from '@/components/common/Dropdown'
- import Picker from '@/features/wish/Picker'

- <SelectBox options={opts} onChange={…} />
- <Dropdown items={opts} onSelect={…} />
- <Picker list={opts} onPick={…} />`,
          good: `
+ import { Select } from '@/ui'   // 디자인 시스템 한 곳에서만

+ <Select label="정렬" options={opts} value={v} onChange={setV} />

// 이름 규칙: 사용자가 하는 일 기준
// Select — 목록에서 하나 고르기
// Combobox — 검색하며 고르기
// SegmentedControl — 2~4개 늘 보이기`,
        }}
        root={<>
          <p>컴포넌트 목록(인벤토리)을 Storybook이나 문서로 만들고, 이름은 생김새보다 <b>사용자가 하는 일</b>을 기준으로 지어요. 새로 만들기 전에 목록에서 찾고, 없으면 디자인 시스템 담당에게 요청하는 흐름을 둬요.</p>
          <p>이미 생긴 중복은 하나만 남기고, 나머지는 그걸 감싸는 <code>@deprecated</code> 래퍼로 바꾼 뒤 사용처를 하나씩 옮겨요.</p>
        </>}
        prevent={[
          <>린트 <code>no-restricted-imports</code>로 디자인 시스템 밖의 Select류 import를 막아요</>,
          <>분기마다 Select·Dropdown·Picker 같은 이름을 검색해 중복을 세요</>,
        ]}
        ours={<>세그먼트 토글은 공용 <code>Seg</code> 하나를 90곳 넘는 화면이 같이 써요. 이 카드 위의 ‘고치기 전 / 고친 뒤’ 스위치도 그거예요.</>}
        links={[['#/similar/c-dropdown', '01 닮은꼴 · 드롭다운 vs 셀렉트'], ['#/system/components', '디자인 시스템 · 컴포넌트 사전']]}
      />
    </div>
  )
}
