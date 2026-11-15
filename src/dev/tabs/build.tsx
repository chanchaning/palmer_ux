/* 08 빌드 · 배포 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './build.css'
import { CdnCacheDemo, DockerOomDemo, EnvLeakDemo, EnvMigrateDemo, MonorepoDemo, SlowDemo, SourcemapDemo, SpaFallbackDemo, SwZombieDemo, TreeshakeDemo } from './build-demos'

export default function BuildTab() {
  return (
    <div data-dev="build">
      <TabIntro>
        빌드·배포 사고는 내 PC에서는 안 보이고 CI나 CDN, 사용자 브라우저에서 터져요. 그래서 이 탭 데모는 대부분 시뮬레이션이고 숫자도 예시예요. 08의 ‘이 사이트가 지금 받은 값’만 진짜예요.
      </TabIntro>

      <Issue id="bd-slow"
        demo={f => <SlowDemo fixed={f} />}
        demoNote={<>예시 숫자로 만든 재현이에요. 내 프로젝트는 <code>vite --profile</code>, <code>vite --debug</code>, CI 단계별 시간으로 직접 재요.</>}
        cause={<>
          <p>Vite 개발 서버는 처음 켤 때 node_modules 패키지를 한 번 묶어 두는 <Term k="사전 번들" d="Dependency pre-bundling. 수백 개 파일로 된 패키지를 미리 한 파일로 묶어 node_modules/.vite 에 저장해요. 다음부터는 이걸 다시 써요." />을 하고, 이후엔 요청받은 파일만 그때그때 변환해요. 첫 화면이 아이콘 수천 개를 다시 내보내는 barrel 파일(<code>index.ts</code>)을 불러오면 요청도 수천 개가 돼요.</p>
          <p>빌드가 느린 건 보통 캐시 없는 설치, 전체 타입 검사, Babel 변환이 겹쳐서예요. 하나하나는 몇십 초인데 CI가 매번 처음부터 하니 합치면 10분이 돼요.</p>
        </>}
        quick={{
          lang: 'vite.config.ts · tsx',
          bad: `
- import { Icon } from '@/icons'          // 아이콘 2,000개를 다시 내보내는 barrel
- react({ babel: { plugins: ['...'] } })   // 꼭 필요 없는 Babel 플러그인

export default defineConfig({
- optimizeDeps: { force: true },         // 매번 사전 번들 다시 하기
})`,
          good: `
+ import CartIcon from '@/icons/Cart'      // 쓰는 파일만 직접
+ react()                                 // 기본 변환(Babel 없음)

export default defineConfig({
  optimizeDeps: {
+   // 늦게 발견돼 ‘새로고침 반복’을 일으키는 패키지는 미리 알려 줘요
+   include: ['dayjs', 'dayjs/locale/ko'],
  },
+ server: { warmup: { clientFiles: ['./src/main.tsx'] } },
})`,
        }}
        root={<>
          <p>고치기 전에 <b>먼저 재요</b>. <code>vite --profile</code>로 CPU 프로필을 남기고, <code>vite --debug</code> 로그에 ‘new dependencies optimized’가 반복되는지 봐요. 빌드는 CI 단계별 시간과 <code>tsc --extendedDiagnostics</code>로 나눠 봐요.</p>
          <p>그다음은 캐시예요. CI에서 패키지 매니저 캐시를 켜고 <code>tsc -b</code>의 증분 정보(<code>tsBuildInfoFile</code>)를 유지해요. 변환은 Babel 대신 Oxc · SWC · esbuild 같은 네이티브 도구에 맡기고, 타입 검사는 번들과 병렬로 돌려도 돼요.</p>
        </>}
        prevent={[
          <>CI에 빌드 시간 예산(예: 3분)을 두고 넘으면 경고해요</>,
          <>barrel 파일 import는 lint로 막아요 (예: <code>no-restricted-imports</code>)</>,
        ]}
        ours={<><code>vite.config.ts</code>의 플러그인이 <code>react()</code> 하나뿐이고 Babel 옵션이 없어요. GitHub Actions는 <code>setup-node</code>의 <code>cache: npm</code>을 켜고 <code>npm ci</code> → <code>npm run build</code>(<code>tsc -b && vite build</code>)를 돌려요.</>}
      />

      <Issue id="bd-treeshake"
        demo={f => <TreeshakeDemo fixed={f} />}
        demoNote={<>크기는 압축 전(minify) 기준 대략값이고 버전마다 달라요. 내 번들은 <code>rollup-plugin-visualizer</code>로 같은 그림을 볼 수 있어요.</>}
        cause={<>
          <p><Term k="Tree Shaking" d="번들러가 import · export를 따라가며 실제로 안 쓰는 코드를 빼는 일이에요. ES 모듈(import/export)이어야 잘 돼요." />은 ES 모듈이어야 동작해요. <code>lodash</code>는 CommonJS라 <code>{'{ debounce }'}</code>만 꺼내도 통째로 들어가고, <code>lodash-es</code>는 쓴 함수만 남아요. moment는 언어 파일이 전부 딸려 오는 구조라 한국어 하나 쓰려다 수백 KB가 붙어요. <code>package.json</code>에 <code>sideEffects</code> 표시가 없는 패키지는 번들러가 지워도 되는지 몰라서 남겨 둬요.</p>
        </>}
        quick={{
          lang: 'TS',
          bad: `
- import _ from 'lodash'
- import moment from 'moment'
- import 'moment/locale/ko'

const onType = _.debounce(search, 300)
const label = moment(date).locale('ko').format('M월 D일')`,
          good: `
+ import { debounce } from 'lodash-es'
+ import dayjs from 'dayjs'
+ import 'dayjs/locale/ko'

const onType = debounce(search, 300)
const label = dayjs(date).locale('ko').format('M월 D일')
// 날짜만 보여 주면 라이브러리 없이도 돼요
+ new Intl.DateTimeFormat('ko', { month: 'long', day: 'numeric' }).format(date)`,
        }}
        root={<>
          <p>라이브러리는 ES 모듈 지원과 크기부터 봐요(bundlephobia 같은 곳에서 확인). 날짜·숫자 표시는 <code>Intl</code>, 깊은 복사는 <code>structuredClone</code>처럼 브라우저 기본 기능으로 될 때도 많아요.</p>
          <p>직접 패키지를 만든다면 ES 모듈로 내보내고 <code>"sideEffects": false</code>(또는 CSS 파일만 적은 배열)를 넣어요. 큰 화면이나 드문 기능은 <code>import()</code>로 나눠 첫 화면 번들에서 빼요.</p>
        </>}
        prevent={[
          <>CI에 번들 크기 예산을 둬요 (예: <code>size-limit</code>, Vite의 <code>build.chunkSizeWarningLimit</code>)</>,
          <>PR마다 <code>rollup-plugin-visualizer</code> 결과를 올려 새로 커진 덩어리를 봐요</>,
          <><code>lodash</code>·<code>moment</code> 통짜 import는 lint로 막아요 (<code>no-restricted-imports</code>)</>,
        ]}
        links={[['#/dev/routing/rt-chunk', '05 배포 직후 ChunkLoadError'], ['#/dev/debug/dbg-supply', '10 npm 공급망 공격']]}
        ours={<>실제 의존성은 <code>react</code>와 <code>react-dom</code> 두 개뿐이에요. 가이드·탭은 <code>import()</code>로 나눠서 열 때 받아요.</>}
      />

      <Issue id="bd-sourcemap"
        demo={f => <SourcemapDemo fixed={f} />}
        demoNote={<>가짜 개발자 도구 화면이에요. 직접 해 보려면 아무 사이트의 Sources 탭에서 <code>.js.map</code> 주소가 열리는지 보면 돼요.</>}
        cause={<>
          <p><Term k="소스맵" d="압축된 코드의 위치를 원래 파일·줄로 되돌리는 지도 파일(.map)이에요. 원본 코드 전체(sourcesContent)가 들어 있는 경우가 많아요." />을 운영에 같이 올리면, 개발자 도구가 압축 파일 끝의 <code>//# sourceMappingURL</code> 주석을 따라가 원본 폴더 구조와 주석까지 복원해요. 숨은 관리자 기능, 내부 API 주소, ‘아직 서버 검증 없음’ 같은 TODO가 그대로 보여요. 프런트 코드는 원래 공개지만 읽기 쉬운 지도까지 줄 필요는 없어요.</p>
        </>}
        quick={{
          lang: 'vite.config.ts',
          bad: `
export default defineConfig({
  build: {
-   sourcemap: true,   // .map 배포 + sourceMappingURL 주석
  },
})`,
          good: `
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
+   sourcemap: 'hidden',   // .map은 만들되 주석은 안 붙여요
  },
  plugins: [
    sentryVitePlugin({
      org: 'lumen', project: 'web',
+     sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
})`,
        }}
        root={<>
          <p><code>'hidden'</code>은 주석만 빼요. <b>.map 파일이 dist에 남아 있으면</b> 주소를 짐작해 열 수 있어요. 에러 추적 도구에 올린 뒤 배포 전에 지우거나, 서버에서 <code>*.map</code> 요청을 막아요.</p>
          <p>비밀은 애초에 프런트에 두지 않아요. 맵을 숨겨도 압축 코드는 읽히니까 권한 검사·쿠폰 검증은 서버에서 해요.</p>
        </>}
        prevent={[
          <>배포 단계에서 <code>dist</code>에 <code>*.map</code>이 있으면 실패하게 해요</>,
          <>배포 후 운영 주소의 <code>/assets/*.js.map</code> 요청이 404인지 자동으로 확인해요</>,
        ]}
        links={[['#/dev/debug/dbg-minify', '10 미니파이로 병목 특정 불가']]}
        ours={<><code>build.sourcemap</code>을 설정하지 않아서 Vite 기본값(<code>false</code>)대로 운영 빌드에 소스맵이 없어요.</>}
      />

      <Issue id="bd-monorepo"
        demo={f => <MonorepoDemo fixed={f} />}
        demoNote={<>실제 설치 결과를 줄여 그린 시뮬레이션이에요. 끌어올림(hoisting) 결과는 다른 패키지 버전에 따라 바뀌어요.</>}
        cause={<>
          <p>npm·yarn(classic)은 의존성을 루트 node_modules로 끌어올려요. <code>apps/web</code>이 선언하지 않은 <code>dayjs</code>도 옆 패키지가 깔아 둔 덕에 우연히 찾아지는데, 이게 <Term k="유령 의존성" d="package.json에 적지 않았는데 다른 패키지 덕분에 우연히 import 되는 패키지예요. 설치 방식이나 버전이 바뀌면 사라져요." />이에요. pnpm처럼 엄격한 설치나 깨끗한 CI에서는 사라져서 ‘모듈을 못 찾아요’가 돼요.</p>
          <p>공용 UI 패키지가 <code>react</code>를 <code>dependencies</code>에 두면 React가 두 벌 깔려요. 훅은 같은 React 사본 안에서만 동작해서 <code>Invalid hook call</code>이 나요. 앱이 넣어 주는 걸 쓰라는 뜻으로 <b>peerDependencies</b>에 적어야 해요.</p>
        </>}
        quick={{
          lang: 'package.json · .npmrc',
          bad: `
// apps/web/package.json — dayjs를 쓰는데 선언 없음
"dependencies": { "@lumen/ui": "workspace:*", "react": "^19.2.0" }

// packages/ui/package.json
- "dependencies": { "react": "^18.3.1", "dayjs": "^1.11.13" }

# .npmrc
- shamefully-hoist=true`,
          good: `
// apps/web/package.json
"dependencies": {
  "@lumen/ui": "workspace:*", "react": "^19.2.0",
+ "dayjs": "^1.11.13"
}
// packages/ui/package.json
+ "peerDependencies": { "react": "^18.3 || ^19" },
+ "devDependencies": { "react": "^19.2.0" },
"dependencies": { "dayjs": "^1.11.13" }

# .npmrc (pnpm 기본값 그대로)
+ strict-peer-dependencies=true`,
        }}
        root={<>
          <p>쓰는 패키지는 쓰는 곳에 선언해요. pnpm은 기본이 엄격해서 유령 의존성이 처음부터 에러로 드러나요. <code>shamefully-hoist</code>나 <code>public-hoist-pattern</code>으로 덮지 말고 선언을 고쳐요.</p>
          <p>React·Vue처럼 한 앱에 하나만 있어야 하는 패키지는 공용 패키지에서 peer로 둬요. 버전은 pnpm <code>catalog</code>나 루트 <code>overrides</code>로 한 곳에서 맞춰요.</p>
        </>}
        prevent={[
          <>CI는 <code>--frozen-lockfile</code>(npm은 <code>npm ci</code>)로 깨끗하게 설치해요</>,
          <>선언 안 한 import는 lint로 잡아요 (<code>import/no-extraneous-dependencies</code>, <code>knip</code>)</>,
          <><code>pnpm why react</code>, <code>npm ls react</code>로 사본이 하나인지 봐요</>,
        ]}
        links={[['#/dev/debug/dbg-supply', '10 npm 공급망 공격']]}
      />

      <Issue id="bd-cdn-cache"
        demo={f => <CdnCacheDemo fixed={f} />}
        demoNote={<>헤더 규칙을 옮긴 시뮬레이션이에요. 어제 한 번 다녀가 브라우저 캐시가 남은 사용자를 가정했어요.</>}
        cause={<>
          <p><code>index.html</code>에 긴 <code>max-age</code>를 주면 브라우저가 서버에 묻지도 않고 옛 HTML을 써요. CDN 무효화(invalidation)는 CDN 캐시만 비울 뿐 브라우저 캐시는 못 지워요.</p>
          <p>JS 파일 이름까지 고정(<code>app.js</code>)이면 더 나빠요. HTML과 JS의 만료 시간이 어긋나 옛 HTML이 새 JS를 부르면 화면이 깨져요.</p>
        </>}
        quick={{
          lang: 'nginx',
          bad: `
location / {
-   add_header Cache-Control "max-age=86400";   # HTML도 하루
}
- # 빌드 결과가 app.js · app.css (이름 고정)`,
          good: `
location = /index.html {
+   add_header Cache-Control "no-cache";         # 매번 확인 (바뀐 게 없으면 304)
}
location /assets/ {
+   add_header Cache-Control "public, max-age=31536000, immutable";
}
# Vite 기본 출력: assets/index-C9xQ2.js (내용 해시)
# CloudFront: 경로별 Cache policy를 따로 두고,
# 배포 때는 /index.html 만 무효화하면 돼요`,
        }}
        root={<>
          <p>규칙은 둘이에요. 진입 HTML은 <code>no-cache</code>(저장은 하되 쓸 때마다 확인), 내용 해시가 붙은 자산은 1년 + <code>immutable</code>. 배포 직후부터 새 HTML이 새 파일 이름을 가리키니 섞일 일이 없어요.</p>
          <p><b>옛 해시 파일은 바로 지우지 마세요</b>. 열려 있던 탭이 옛 청크를 늦게 부를 수 있어요. 몇 번의 배포 동안 남겨 두고(S3라면 수명 주기 규칙으로), 그래도 실패하면 새로고침을 안내해요.</p>
        </>}
        prevent={[
          <>배포 후 <code>curl -I</code>로 <code>index.html</code>과 자산의 <code>Cache-Control</code>을 자동 확인해요</>,
          <>화면 구석이나 콘솔에 빌드 버전(커밋 해시)을 남겨, 지금 보는 게 어느 버전인지 바로 알게 해요</>,
        ]}
        links={[['#/dev/routing/rt-chunk', '05 배포 직후 ChunkLoadError']]}
        ours={<>Vite가 <code>assets/이름-해시.js</code>로 내보내요. GitHub Pages는 헤더를 바꿀 수 없고 모든 파일에 짧은 <code>max-age</code>(10분 안팎)를 붙여서, 배포 후 잠깐 옛 HTML이 보일 수 있지만 파일 이름이 달라 섞여 깨지지는 않아요.</>}
      />

      <Issue id="bd-spa-fallback"
        demo={f => <SpaFallbackDemo fixed={f} />}
        demoNote={<>S3(OAC로 비공개) + CloudFront 응답 규칙을 옮긴 시뮬레이션이에요. 주소를 바꿔 가며 눌러 보세요. 이 페이지의 실제 주소는 그대로예요.</>}
        cause={<>
          <p>SPA는 <code>/orders/1024</code> 같은 주소를 브라우저 안에서만 만들어요. 앱 안에서 이동할 땐 괜찮은데, 그 주소에서 새로고침하면 S3에 <code>orders/1024</code> 파일을 달라고 하고, 그런 파일은 없어요.</p>
          <p>비공개 버킷(OAC)은 없는 파일에 404 대신 <b>403 AccessDenied</b>를 돌려줘요(목록 권한이 없어서). 404만 처리해 두면 여전히 XML 오류 화면이 뜨니 403과 404를 둘 다 잡아야 해요.</p>
        </>}
        quick={{
          lang: 'CloudFront',
          bad: `
DefaultRootObject: index.html
- CustomErrorResponses: []   # 서브 주소 새로고침 → 403 XML`,
          good: `
DefaultRootObject: index.html
CustomErrorResponses:
+ - ErrorCode: 403
+   ResponseCode: 200
+   ResponsePagePath: /index.html
+   ErrorCachingMinTTL: 0
+ - ErrorCode: 404
+   ResponseCode: 200
+   ResponsePagePath: /index.html
+   ErrorCachingMinTTL: 0`,
        }}
        root={<>
          <p>오류 응답을 바꾸는 건 쉽지만, 그러면 진짜 없는 파일도 200 HTML이 돼요. 지운 청크를 부르면 JS 자리에 HTML이 와서 ‘Failed to load module script’가 나고, 검색엔진은 없는 페이지를 정상으로 봐요(soft 404).</p>
          <p>더 정확하게 하려면 CloudFront Functions(viewer-request)로 확장자 없는 주소만 <code>/index.html</code>로 바꿔요. 파일 요청은 원래 오류를 그대로 받아요. 404 상태 코드가 꼭 필요하면 서버나 엣지가 경로를 알고 있어야 해요.</p>
        </>}
        prevent={[
          <>배포 후 스모크 테스트로 깊은 주소(<code>/orders/1</code>)를 직접 열어 보고, 없는 자산 주소가 <code>text/html</code>로 오지 않는지도 봐요</>,
          <>오류 응답 설정은 Terraform·CDK 같은 코드로 관리해 빠지지 않게 해요</>,
        ]}
        links={[['#/dev/routing/rt-refresh-404', '05 새로고침 시 404'], ['#/dev/routing/rt-chunk', '05 배포 직후 ChunkLoadError']]}
        ours={<>해시 주소(<code>#/dev/build</code>)를 써요. <code>#</code> 뒤는 서버로 가지 않아서 GitHub Pages는 늘 <code>index.html</code> 하나만 주면 되고, fallback 설정도 필요 없어요.</>}
      />

      <Issue id="bd-sw-zombie"
        demo={f => <SwZombieDemo fixed={f} />}
        demoNote={<>서비스 워커 수명 주기를 옮긴 시뮬레이션이에요. 진짜 서비스 워커는 등록하지 않아요.</>}
        cause={<>
          <p>새 <code>sw.js</code>가 배포되면 브라우저는 설치까지만 하고 대기(waiting)시켜요. 옛 서비스 워커가 잡은 탭이 <b>하나라도 열려 있으면</b> 넘어가지 않고, 새로고침해도 마찬가지예요. 탭을 모두 닫아야 해요.</p>
          <p>그동안 옛 워커는 자기 캐시에서 옛 HTML·JS를 계속 내줘요. 탭을 며칠씩 열어 두는 사용자는 몇 번을 배포해도 옛 버전에 머물러요. 이게 ‘좀비’예요.</p>
        </>}
        quick={{
          lang: 'sw.js · main.ts',
          bad: `
// sw.js — 설치만 하고 끝
self.addEventListener('install', e => {
  e.waitUntil(caches.open('v1').then(c => c.addAll(FILES)))
})
- // 새 버전이 대기 중이라는 걸 페이지는 몰라요`,
          good: `
// sw.js
+ self.addEventListener('message', e => {
+   if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
+ })
+ self.addEventListener('activate', e => e.waitUntil(clients.claim()))

// main.ts — 새 버전이 기다리면 안내해요
reg.addEventListener('updatefound', () => {
  const w = reg.installing
  w?.addEventListener('statechange', () => {
+   if (w.state === 'installed' && navigator.serviceWorker.controller)
+     showToast('새 버전이 있어요', () => w.postMessage({ type: 'SKIP_WAITING' }))
  })
})
+ navigator.serviceWorker.addEventListener('controllerchange', () => location.reload())`,
        }}
        root={<>
          <p>사용자가 눌러서 넘어가게 해요. 입력 중인 화면을 갑자기 새로고침하면 안 되니 ‘새 버전이 있어요’ 안내를 띄우고, 누르면 <code>skipWaiting()</code>으로 바꿔요. Workbox · vite-plugin-pwa의 <code>registerType: 'prompt'</code>가 이 흐름이에요.</p>
          <p><code>sw.js</code> 자체는 HTTP 캐시 없이(<code>no-cache</code>) 내려요. 이미 좀비가 됐다면 같은 주소에 킬 스위치 <code>sw.js</code>를 배포해요. 설치되자마자 캐시를 지우고 <code>registration.unregister()</code>를 부른 뒤 열린 탭을 다시 불러와요.</p>
        </>}
        prevent={[
          <>HTML 응답은 캐시 우선(cache-first)으로 두지 않아요. 네트워크 우선으로 하거나 업데이트 안내와 함께 써요</>,
          <>배포 후 <code>sw.js</code> 응답에 <code>no-cache</code>가 붙는지 확인해요</>,
          <>배포 체크리스트에 ‘탭을 연 채로 배포하면 안내가 뜨는지’를 넣어요</>,
          <>킬 스위치 <code>sw.js</code>는 미리 만들어 저장소에 둬요</>,
        ]}
        links={[['#/dev/routing/rt-chunk', '05 배포 직후 ChunkLoadError']]}
        ours={<>서비스 워커를 쓰지 않아서, 배포하면 다음 방문 때 새 HTML을 받아요.</>}
      />

      <Issue id="bd-env-migrate"
        demo={f => <EnvMigrateDemo fixed={f} />}
        demoNote={<>위쪽 표는 CRA → Vite 이전을 옮긴 시뮬레이션이에요. 아래 ‘진짜 값’은 이 페이지가 실제로 받은 <code>import.meta.env</code>예요.</>}
        cause={<>
          <p>CRA·webpack은 빌드할 때 <code>process.env.REACT_APP_X</code>를 값으로 바꿔 줬지만 Vite는 안 해요. 브라우저엔 <code>process</code>가 없어서 ReferenceError가 나고, 땜질하면 undefined가 돼요.</p>
          <p>Vite가 <code>import.meta.env</code>에 넣는 건 <code>VITE_</code>로 시작하는 변수뿐이에요(<code>envPrefix</code>로 바꿀 수 있어요). 급하다고 <code>define</code>으로 <code>process.env</code>를 통째로 넣으면 PATH나 비밀번호까지 <b>번들에 박혀요</b>.</p>
        </>}
        quick={{
          lang: 'TS · vite.config.ts',
          bad: `
- const api = process.env.REACT_APP_API_URL

// vite.config.ts
export default defineConfig({
- define: { 'process.env': process.env },   // 모든 환경 변수 노출
})`,
          good: `
+ const api = import.meta.env.VITE_API_URL

// src/vite-env.d.ts — 타입도 붙여요
interface ImportMetaEnv { readonly VITE_API_URL: string }

// 설정 파일에서 읽을 땐 loadEnv
export default defineConfig(({ mode }) => {
+ const env = loadEnv(mode, process.cwd())   // VITE_ 만
  return { server: { proxy: { '/api': env.VITE_API_URL } } }
})`,
        }}
        root={<>
          <p>이름은 한 번에 바꿔요. <code>REACT_APP_</code> → <code>VITE_</code>, <code>process.env</code> → <code>import.meta.env</code>. 옛 이름을 꼭 살려야 하면 <code>envPrefix: ['VITE_', 'REACT_APP_']</code>를 쓰되, 서버 전용 값이 그 접두사로 시작하지 않는지 확인해요.</p>
          <p>개발·운영 구분은 <code>import.meta.env.DEV</code> · <code>PROD</code> · <code>MODE</code>로 해요. 빌드 때 상수로 바뀌니 개발 전용 코드는 운영 번들에서 빠져요.</p>
        </>}
        prevent={[
          <>lint로 <code>process.env</code> 사용을 막아요 (<code>no-restricted-syntax</code>)</>,
          <><code>vite-env.d.ts</code>에 쓰는 변수를 모두 적어 오타를 타입 에러로 잡아요</>,
        ]}
        ours={<>환경 변수를 쓰지 않아요. 이 페이지의 <code>import.meta.env</code>에는 <code>MODE</code> · <code>DEV</code> · <code>PROD</code> · <code>BASE_URL</code> · <code>SSR</code> 같은 Vite 기본 값만 있어요.</>}
      />

      <Issue id="bd-docker-oom"
        demo={f => <DockerOomDemo fixed={f} />}
        demoNote={<>메모리 곡선은 예시예요. 실제로는 <code>docker stats</code>나 CI의 메모리 그래프, <code>/usr/bin/time -v</code>의 최대 RSS로 재요.</>}
        cause={<>
          <p>Node 힙 제한을 컨테이너보다 크게 주면(2GB 컨테이너에 <code>--max-old-space-size=4096</code>) Node는 메모리를 계속 쓰다가 커널 OOM killer에 강제 종료돼요. 로그엔 <code>Killed</code> 한 줄과 종료 코드 <b>137</b>(128 + SIGKILL 9)만 남아서 이유 없이 죽은 것처럼 보여요.</p>
          <p>힙 제한이 작으면 반대로 Node가 스스로 <code>JavaScript heap out of memory</code>를 내고 멈춰요(보통 134). 둘 다 큰 번들에 소스맵 생성, 압축, 병렬 작업이 겹칠 때 잘 생겨요.</p>
        </>}
        quick={{
          lang: 'Dockerfile · CI',
          bad: `
FROM node:22
- ENV NODE_OPTIONS=--max-old-space-size=4096   # 컨테이너는 2GB
RUN npm ci && npm run build
# docker run --memory=2g ...  → exit 137`,
          good: `
FROM node:22 AS build
+ # 컨테이너 제한의 약 75%만 힙으로 (나머지는 힙 바깥 메모리)
+ ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npm ci && npm run build

# docker run --memory=4g ...
# 또는 GitHub Actions의 더 큰 러너, k8s resources.limits.memory: 4Gi`,
        }}
        root={<>
          <p>컨테이너 제한이 힙 제한보다 넉넉히 커야 해요. 힙 바깥에서도 코드·버퍼·네이티브 메모리를 쓰거든요. 제한의 70–75% 정도를 힙으로 주는 게 흔한 시작점이에요(예시). 숫자를 키우기 전에 빌드가 왜 그만큼 쓰는지도 봐요.</p>
          <p>메모리는 운영에 필요 없는 소스맵을 끄고, 거대한 단일 청크를 나누고, 타입 검사를 번들과 다른 단계로 빼고, 병렬 수를 줄여서 아껴요. 멀티 스테이지 빌드로 최종 이미지엔 <code>dist</code>만 담아요.</p>
        </>}
        prevent={[
          <>빌드의 최대 메모리를 기록해 두고, 크게 늘면 PR에서 보이게 해요</>,
        ]}
        ours={<>GitHub Pages 배포는 GitHub 호스티드 러너(<code>ubuntu-latest</code>)에서 Node 22로 빌드해요. <code>NODE_OPTIONS</code>를 따로 주지 않아요.</>}
      />

      <Issue id="bd-env-leak"
        demo={f => <EnvLeakDemo fixed={f} />}
        demoNote={<>Vite의 <code>.env</code> 우선순위 규칙을 옮겼어요. 파일을 눌러 켜고 꺼 보세요. 빌드한 셸에 이미 있는 환경 변수는 이 파일들보다 우선해요.</>}
        cause={<>
          <p>Vite는 <code>.env</code> → <code>.env.local</code> → <code>.env.[mode]</code> → <code>.env.[mode].local</code> 순으로 읽고 뒤에 읽은 값이 이겨요. <code>.env.production</code>이 없으면 <code>.env</code>(개발 주소)나 내 PC의 <code>.env.local</code>(localhost)이 그대로 운영 번들에 들어가요.</p>
          <p><code>VITE_</code>로 시작하는 값은 <b>모두 공개</b>예요. 번들에 문자열로 박혀 누구나 볼 수 있어요. <code>VITE_ADMIN_TOKEN</code> 같은 이름이 보이면 이미 사고예요.</p>
        </>}
        quick={{
          lang: '.env · CI',
          bad: `
# .env (git에 올라감) — 개발 주소가 기본값
- VITE_API_URL=https://api.dev.lumen-shop.example
# .env.local (내 노트북)
- VITE_ADMIN_TOKEN=adm_9f8e7d...

$ npm run build   # 내 노트북에서 빌드해서 배포`,
          good: `
# .env.production (git에 올라감)
+ VITE_API_URL=https://api.lumen-shop.example
# 비밀은 VITE_ 없이, 서버(프록시)에서만 써요
ADMIN_TOKEN=...   # 프런트 코드에선 아예 안 읽혀요

# CI: 깨끗한 체크아웃에서만 빌드·배포
+ - run: npm ci && npm run build
+ - run: "! grep -rE 'localhost|api\\.dev\\.' dist/assets"`,
        }}
        root={<>
          <p>운영 빌드는 CI에서만 해요. 깨끗한 체크아웃에는 git에 안 올라가는 <code>*.local</code> 파일이 없어서 내 PC 설정이 섞이지 않아요. 모드별 값은 <code>.env.production</code>·<code>.env.staging</code>(<code>vite build --mode staging</code>)으로 따로 적어요.</p>
          <p>토큰이 필요한 호출은 서버나 BFF가 대신하고, 프런트에는 공개돼도 괜찮은 값(공개 키, API 주소)만 둬요.</p>
        </>}
        prevent={[
          <>CI에서 <code>dist</code>에 개발·스테이징 주소가 있으면 실패하게 해요</>,
          <>비밀 스캔을 켜요 (GitHub secret scanning, <code>gitleaks</code>)</>,
          <>앱 시작 때 <code>MODE</code>와 API 주소를 콘솔에 한 줄 찍어 어디를 부르는지 보이게 해요</>,
        ]}
        links={[['#/dev/debug/dbg-supply', '10 npm 공급망 공격']]}
        ours={<><code>.env</code> 파일이 없고, <code>.gitignore</code>에 <code>*.local</code>이 있어요. 빌드는 GitHub Actions에서 깨끗한 체크아웃(<code>actions/checkout</code>)으로만 해요.</>}
      />
    </div>
  )
}
