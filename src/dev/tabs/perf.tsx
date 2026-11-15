/* 01 렌더링 · 성능 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './perf.css'
import { CanvasDemo, FontDemo, InfiniteDemo, LcpDemo, ListenerDemo, MemoDemo, TearingDemo, ThirdPartyDemo, TransformDemo, VirtualDemo } from './perf-demos'

export default function PerfTab() {
  return (
    <div data-dev="perf">
      <TabIntro>
        ‘느려요’라는 제보는 재현이 제일 어려워요. 개발 PC는 빠르니까요. 아래 숫자는 지금 이 기기에서 실제로 잰 값이고, 05·07만 예시 숫자로 만든 재현이에요.
      </TabIntro>

      <Issue id="perf-infinite"
        demo={f => <InfiniteDemo fixed={f} />}
        cause={<>
          <p>무한 스크롤은 다음 묶음을 덧붙이기만 하기 쉬워요. 화면 밖으로 지나간 글도 DOM에 남아서, 1,000개를 내리면 요소가 수천 개가 돼요. 그만큼 스타일 계산과 레이아웃이 느려지고, 이미지와 이벤트 핸들러가 메모리를 계속 차지해요. 저사양 폰에서 먼저 터져요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- {items.map(item => <Row key={item.id} item={item} />)}
// 불러온 모든 글을 DOM에 그려요`,
          good: `
import { useVirtualizer } from '@tanstack/react-virtual'

const v = useVirtualizer({
  count: items.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 72,
  overscan: 5,
})
+ {v.getVirtualItems().map(row => (
+   <Row key={row.key} item={items[row.index]}
+     style={{ transform: \`translateY(\${row.start}px)\` }} />
+ ))}`,
        }}
        root={<>
          <p><b>보이는 만큼만 그리는 가상화</b>를 기본으로 해요. 카드 높이가 제각각이면 <code>measureElement</code>로 실제 높이를 재요.</p>
          <p>가상화가 어렵다면 최대 개수를 정해 오래된 묶음을 빼고, 위로 돌아가면 다시 불러와요. 이미지는 <code>loading="lazy"</code>와 고정 비율 상자로 받아요.</p>
        </>}
        prevent={[
          <>QA 시나리오에 ‘1,000개 이상 내리기’를 넣어요</>,
          <>개발자 도구 Performance monitor에서 DOM Nodes가 내려오지 않고 오르기만 하는지 봐요</>,
        ]}
        links={[['#/collection/col-infinite', '22 목록 보여주기 · 무한 스크롤 (UX)'], ['#/layout', '07 앱 화면 구성']]}
      />

      <Issue id="perf-memo"
        demo={f => <MemoDemo fixed={f} />}
        cause={<>
          <p>부모가 다시 그려지면 자식도 기본적으로 다시 그려져요. <code>style={'{{…}}'}</code>나 <code>{'() => …'}</code>처럼 렌더마다 새로 만드는 값은 매번 다른 값이라, <code>memo</code>로 감싸도 소용없어요.</p>
          <p>반대로 모든 값에 <code>useMemo</code>를 두르면 비교 비용과 코드만 늘어요. 의존성 배열을 틀리면 오래된 값을 쓰는 버그도 생겨요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function Menu() {
  const [q, setQ] = useState('')
  return items.map(it => (
-   <Item key={it.id} item={it}
-     style={{ borderRadius: 10 }}
-     onPick={id => setPicked(id)} />
  ))
}`,
          good: `
+ const STYLE = { borderRadius: 10 }   // 바뀌지 않는 값은 밖으로
+ const Item = memo(function Item(p) { … })

function Menu() {
  const [q, setQ] = useState('')
+ const onPick = useCallback(id => setPicked(id), [])
  return items.map(it => (
    <Item key={it.id} item={it} style={STYLE} onPick={onPick} />
  ))
}`,
        }}
        root={<>
          <p>먼저 상태를 내려요. 입력값을 검색창에서만 쓴다면 그 상태를 검색창 컴포넌트 안으로 옮기는 편이 memo보다 효과가 커요.</p>
          <p>memo는 React DevTools Profiler로 재 보고 실제로 느린 컴포넌트에만 붙여요. <b>React Compiler</b>를 켜면 이런 메모이제이션을 빌드 단계에서 자동으로 넣어 줘요.</p>
        </>}
        prevent={[
          <><code>eslint-plugin-react-hooks</code>의 <code>exhaustive-deps</code> 규칙을 켜요</>,
          <>memo · useMemo를 추가하는 PR에는 Profiler 캡처를 붙여요</>,
          <>DevTools의 ‘Highlight updates when components render’를 켜고 화면을 한 번씩 훑어봐요</>,
        ]}
      />

      <Issue id="perf-virtual"
        demo={f => <VirtualDemo fixed={f} />}
        cause={<>
          <p>1만 행 × 4칸이면 표 하나에 요소가 5만 개 넘게 생겨요. 브라우저가 이걸 한꺼번에 만들어 배치하는 동안 화면이 얼어요. 백오피스는 ‘우리끼리 쓰니까’ 하고 페이지네이션 없이 전체를 내려받는 일이 많아서 특히 자주 터져요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<tbody>
- {orders.map(o => <OrderRow key={o.id} o={o} />)}
</tbody>`,
          good: `
const v = useVirtualizer({ count: orders.length, estimateSize: () => 32,
  getScrollElement: () => wrapRef.current, overscan: 10 })
const rows = v.getVirtualItems()
const padTop = rows[0]?.start ?? 0
const padBottom = v.getTotalSize() - (rows.at(-1)?.end ?? 0)

<tbody>
+ <tr style={{ height: padTop }} />
+ {rows.map(r => <OrderRow key={r.key} o={orders[r.index]} />)}
+ <tr style={{ height: padBottom }} />
</tbody>`,
        }}
        root={<>
          <p>가상화와 함께 서버 쪽 페이지네이션·정렬·필터를 써요. 1만 건을 한 번에 돌려주는 API부터가 위험 신호예요.</p>
          <p>엑셀처럼 셀 편집이나 고정 열이 필요하면 가상화를 기본 제공하는 그리드(AG Grid, TanStack Table + Virtual 등)를 써요. 직접 만들면 고정 헤더, 키보드 이동, 접근성까지 다 챙겨야 해요.</p>
        </>}
        prevent={[
          <>표 컴포넌트에 최대 렌더 행 수를 정하고, 넘으면 개발 모드에서 경고해요</>,
          <>테스트 데이터에 운영 규모(1만 건+) 시드를 만들어 둬요</>,
          <>API 명세에 <code>limit</code> 기본값과 최대값을 적어요</>,
        ]}
        links={[['#/collection/col-table', '22 목록 보여주기 · 테이블']]}
      />

      <Issue id="perf-listener"
        demo={f => <ListenerDemo fixed={f} />}
        cause={<>
          <p>SPA에서는 페이지를 옮겨도 window와 document는 그대로예요. 컴포넌트가 사라질 때 <code>removeEventListener</code>를 하지 않으면 떠난 페이지의 핸들러가 스크롤마다 계속 실행돼요. 그 핸들러가 사라진 DOM과 상태를 붙잡고 있어서 메모리도 새요.</p>
          <p><code>setInterval</code>, <code>ResizeObserver</code>, 웹소켓 구독도 마찬가지예요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
useEffect(() => {
  window.addEventListener('scroll', onScroll)
- // 정리(cleanup) 없음
}, [])`,
          good: `
useEffect(() => {
+ const ac = new AbortController()
  window.addEventListener('scroll', onScroll,
+   { passive: true, signal: ac.signal })
  window.addEventListener('resize', onResize, { signal: ac.signal })
+ return () => ac.abort()   // 한 번에 모두 해제
}, [])`,
        }}
        root={<>
          <p>전역 이벤트는 <code>useWindowEvent</code> 같은 공용 훅 하나로만 등록해요. 정리를 훅 안에서 보장해 두면 화면마다 따로 챙길 일이 없어요. Vue는 <code>onUnmounted</code>, Angular는 <code>DestroyRef</code>·<code>takeUntilDestroyed</code>로 같은 일을 해요.</p>
        </>}
        prevent={[
          <>개발 모드에서 StrictMode를 켜 두면 effect가 일부러 두 번 실행돼서 정리 누락이 드러나요</>,
          <>메모리 탭에서 페이지를 여러 번 오간 뒤 Detached elements가 쌓이는지 봐요</>,        ]}
      />

      <Issue id="perf-lcp"
        demo={f => <LcpDemo fixed={f} />}
        demoNote={<>4G 환경을 가정한 예시 숫자로 만든 재현이에요. 실제 값은 Lighthouse나 <code>web-vitals</code>로 재요.</>}
        cause={<>
          <p><Term k="LCP" d="Largest Contentful Paint. 첫 화면에서 가장 큰 그림이나 글 덩어리가 그려진 시각이에요. 2.5초 안이면 좋아요." />는 보통 첫 화면의 큰 이미지가 결정해요. 자주 하는 실수는 이래요.</p>
          <p>① 메인 이미지에도 <code>loading="lazy"</code>를 붙여서 늦게 받기 시작해요. ② 수 MB짜리 JPG 원본을 그대로 보내요. ③ 화면 아래 이미지들이 먼저 대역폭을 차지해요.</p>
        </>}
        quick={{
          lang: 'HTML',
          bad: `
- <img src="/hero.jpg" loading="lazy" alt="가을 신상품">
- <img src="/product-1.jpg" alt="…">  <!-- 아래쪽인데 바로 받아요 -->`,
          good: `
+ <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

<picture>
+ <source srcset="/hero.avif" type="image/avif">
+ <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="가을 신상품" width="1200" height="600"
+      fetchpriority="high" decoding="async">
</picture>
+ <img src="/product-1.webp" loading="lazy" width="300" height="300" alt="…">`,
        }}
        root={<>
          <p>이미지 변환은 빌드나 CDN에 맡겨요(이미지 CDN, Next.js Image 등). 사람이 매번 WebP로 바꾸면 언젠가 빠뜨려요. 변환이 실패해도 원본 JPG가 나가도록 <code>&lt;picture&gt;</code>로 감싸요.</p>
          <p><b>첫 화면 이미지는 lazy 없이 우선순위를 높이고</b>, 그 아래만 lazy로 받아요. 이 규칙은 이미지 컴포넌트의 <code>priority</code> 같은 옵션 하나로 묶어 둬요.</p>
        </>}
        prevent={[
          <>Lighthouse CI에 LCP 예산(예: 2.5초)을 걸고, 실사용 값은 <code>web-vitals</code>로 모아요</>,
          <>업로드 단계에서 이미지 크기 상한(예: 500KB)을 검사해요</>,
        ]}
        links={[['#/loading/loading-blur', '14 로딩 패턴 · 블러 업']]}
      />

      <Issue id="perf-canvas"
        demo={f => <CanvasDemo fixed={f} />}
        demoNote={<>감지 모델 대신 32ms 걸리는 계산을 넣은 흉내예요. ‘고친 뒤’는 그 계산을 실제 Web Worker에서 돌려요.</>}
        cause={<>
          <p>화면이 부드러우려면 1초에 60번, 한 번에 약 16ms 안에 그려야 해요. 감지 계산이나 <code>getImageData</code> 같은 무거운 일을 매 프레임 메인 스레드에서 하면 이 시간을 넘기고, 영상과 버튼이 같이 멈춰요.</p>
          <p>원인은 감지 결과가 나오는 속도(초당 10~30번)와 화면 그리는 속도(초당 60번)를 <b>한 루프에 묶은 데</b> 있어요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
function frame() {
- const boxes = detect(video)      // 30ms+ 메인 스레드에서
  drawVideo(); drawBoxes(boxes)
  requestAnimationFrame(frame)
}`,
          good: `
+ const worker = new Worker(new URL('./detect.worker.ts', import.meta.url),
+   { type: 'module' })
let boxes = [], busy = false
+ worker.onmessage = e => { boxes = e.data; busy = false }

function frame() {
+ if (!busy) {                     // 결과가 오기 전엔 새로 안 보내요
+   busy = true
+   createImageBitmap(video).then(bmp => worker.postMessage(bmp, [bmp]))
+ }
  drawBoxes(boxes)                 // 박스만 그리는 오버레이 캔버스
  requestAnimationFrame(frame)
}`,
        }}
        root={<>
          <p>감지는 Web Worker(가능하면 WebGPU·WASM)로, 그리기는 메인 스레드로 나눠요. 영상은 <code>&lt;video&gt;</code>가 직접 재생하고, 박스는 위에 겹친 투명 캔버스에만 그려요.</p>
          <p>영상 프레임에 맞추려면 <code>requestVideoFrameCallback</code>을, 그리기까지 워커로 넘기려면 <code>OffscreenCanvas</code>를 써요. 결과가 밀리면 오래된 프레임은 버려요.</p>
        </>}
        prevent={[
          <>Performance 탭에서 50ms 넘는 Long Task가 반복되는지 봐요</>,
          <>저사양 기기 기준 FPS 목표(예: 30 이상)를 요구사항에 적어요</>,
        ]}
      />

      <Issue id="perf-3p"
        demo={f => <ThirdPartyDemo fixed={f} />}
        demoNote={<>예시 숫자로 만든 재현이에요. 실제로는 Performance 탭의 메인 스레드 줄에서 같은 모양을 볼 수 있어요.</>}
        cause={<>
          <p>화면이 그려진 뒤에도 태그 관리자, 채팅 위젯, 분석 스크립트가 메인 스레드를 차례로 붙잡아요. 그동안 버튼을 눌러도 이벤트는 줄을 서서 기다려요. 이게 <Term k="TTI" d="Time To Interactive. 화면이 떠 있고, 눌렀을 때 바로 반응하는 상태가 된 시각이에요." />가 늦은 상태예요. 마케팅 팀이 GTM에 태그를 계속 더하면 배포가 없어도 사이트는 점점 느려져요.</p>
        </>}
        quick={{
          lang: 'HTML · JS',
          bad: `
<head>
- <script src="https://chat.example/widget.js"></script>
- <script src="https://www.googletagmanager.com/gtm.js?id=…"></script>
</head>`,
          good: `
+ <script async src="https://www.googletagmanager.com/gtm.js?id=…"></script>

<!-- 채팅은 ‘가짜 버튼(facade)’만 먼저 -->
<button id="chat">상담하기</button>
<script>
+ chat.addEventListener('click', () => {
+   import('https://chat.example/widget.js').then(w => w.open())
+ }, { once: true })
+ requestIdleCallback(() => loadAnalytics())   // 한가할 때
</script>`,
        }}
        root={<>
          <p>서드파티는 목록으로 관리해요. 누가 왜 넣었는지, 어느 페이지에 필요한지 적어 두고 분기마다 정리해요. 채팅·지도·영상 같은 무거운 위젯은 클릭할 때 불러오는 <b>facade</b>로 시작해요.</p>
          <p>분석 스크립트는 <code>defer</code>·<code>requestIdleCallback</code>으로 미루거나 Partytown으로 워커에 옮길 수도 있어요.</p>
        </>}
        prevent={[
          <>GTM 게시 권한을 정하고, 태그를 추가할 때 성능 점검을 요청 양식에 넣어요</>,
          <><Term k="INP" d="Interaction to Next Paint. 누른 뒤 화면이 바뀔 때까지 걸린 시간이에요. 200ms 안이면 좋아요." />를 실사용 지표로 모아요</>,
          <>CSP로 허용된 서드파티 도메인만 실행되게 해요</>,
        ]}
      />

      <Issue id="perf-font"
        demo={f => <FontDemo fixed={f} />}
        demoNote={<>글꼴마다 다른 높이(지표) 차이를 줄 간격으로 흉내 냈어요.</>}
        cause={<>
          <p>웹 폰트가 오기 전에 브라우저는 글자를 숨기거나(FOIT) 대체 글꼴로 먼저 보여줘요(FOUT). 한글 폰트는 수 MB라 숨기는 시간이 길어요.</p>
          <p>폰트가 도착하면 글자 폭과 줄 높이가 바뀌어 아래 내용이 밀려요. 이게 <Term k="CLS" d="Cumulative Layout Shift. 화면 요소가 예고 없이 밀린 정도를 합친 값이에요. 0.1 아래면 좋아요." />예요. 버튼을 누르려던 순간 밀리면 엉뚱한 걸 누르게 돼요.</p>
        </>}
        quick={{
          lang: 'CSS · HTML',
          bad: `
@font-face {
  font-family: "Brand";
  src: url(/fonts/Brand.ttf);
- font-display: block;   /* 최대 3초간 글자 숨김 */
}`,
          good: `
+ <link rel="preload" href="/fonts/Brand-sub.woff2" as="font" type="font/woff2" crossorigin>

@font-face {
  font-family: "Brand";
+ src: url(/fonts/Brand-sub.woff2) format("woff2");   /* 서브셋 */
+ font-display: swap;
}
+ @font-face {             /* 대체 글꼴의 크기를 웹 폰트에 맞춰요 */
+   font-family: "Brand Fallback";
+   src: local("Apple SD Gothic Neo"), local("Malgun Gothic");
+   size-adjust: 97%; ascent-override: 92%; descent-override: 24%;
+ }
body { font-family: "Brand", "Brand Fallback", sans-serif; }`,
        }}
        root={<>
          <p>한글 폰트는 <b>서브셋(자주 쓰는 2,350자)</b>과 woff2, 가변 폰트로 줄이고, 필요한 굵기만 받아요. 대체 글꼴 지표를 맞추는 값은 Fontaine이나 Next.js <code>next/font</code>가 자동으로 계산해 줘요.</p>
        </>}
        prevent={[
          <>Lighthouse의 CLS와 ‘폰트 표시’ 진단을 CI에서 확인해요</>,
          <>새 폰트를 넣을 땐 용량 예산(예: 한 굵기 300KB)을 정해요</>,        ]}
        ours={<>Pretendard 가변 폰트(woff2 한 파일)를 직접 올려 두고 <code>font-display: swap</code>을 써요. 굵기마다 파일을 따로 받지 않아요.</>}
        links={[['#/type', '19 타이포그래피 · 실무 표준 한글 폰트']]}
      />

      <Issue id="perf-tearing"
        demo={f => <TearingDemo fixed={f} />}
        demoNote={<>React 전환(startTransition) 렌더링 중에 바깥 값을 실제로 바꿔서 재현해요. 섞이는 정도는 기기 성능에 따라 달라요.</>}
        cause={<>
          <p>React 18부터는 낮은 우선순위 렌더링을 잘게 나눠 중간중간 브라우저에 양보해요. 그 틈에 React 바깥 저장소(전역 변수, 직접 만든 store, 실시간 값)가 바뀌면 앞 칸은 옛 값을, 뒤 칸은 새 값을 읽어요. 한 화면에서 같은 값이 다르게 보이는 ‘찢김’이에요. React <code>useState</code>로만 관리하는 값에는 생기지 않아요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
function Price() {
- const v = store.value          // 렌더 중에 바깥 값을 직접 읽어요
  return <b>{v}</b>
}`,
          good: `
+ import { useSyncExternalStore } from 'react'

function Price() {
+ const v = useSyncExternalStore(store.subscribe, () => store.value)
  return <b>{v}</b>
}`,
        }}
        root={<>
          <p>바깥 저장소는 <b>useSyncExternalStore</b>를 지원하는 라이브러리로 구독해요. Redux(react-redux 8+), Zustand, Jotai 최신 버전은 이미 이 방식이에요. 문제는 직접 만든 store나 오래된 버전이에요.</p>
          <p>getSnapshot은 값이 같으면 같은 참조를 돌려줘야 해요. 매번 새 객체를 만들면 무한 렌더가 나요.</p>
        </>}
        prevent={[
          <>React 18 이상으로 올릴 때 상태 라이브러리 버전 호환표를 먼저 확인해요</>,
        ]}
      />

      <Issue id="perf-transform"
        demo={f => <TransformDemo fixed={f} />}
        cause={<>
          <p><code>top</code>·<code>left</code>·<code>width</code>를 바꾸면 브라우저는 매 프레임 레이아웃 → 페인트 → 합성을 다시 해요. 여기에 <code>offsetLeft</code>처럼 위치를 읽는 코드가 섞이면 읽을 때마다 레이아웃을 강제로 다시 계산해요. 이걸 레이아웃 스래싱이라고 해요.</p>
          <p><code>transform</code>과 <code>opacity</code>는 레이아웃을 건드리지 않아요. 합성 단계에서 GPU가 처리해서 가볍고 배터리도 덜 써요.</p>
        </>}
        quick={{
          lang: 'CSS · JS',
          bad: `
.toast { position: absolute; transition: top .3s; }
- .toast.show { top: 20px; }

for (const el of items) {
- const x = el.offsetLeft + 1     // 읽고
- el.style.left = x + 'px'        // 쓰고 → 매번 레이아웃
}`,
          good: `
.toast { position: absolute; top: 0; transition: transform .3s; }
+ .toast.show { transform: translateY(20px); }

+ const xs = items.map(el => el.offsetLeft)   // 읽기는 한꺼번에
+ items.forEach((el, i) =>
+   el.style.transform = \`translateX(\${xs[i] + 1}px)\`)   // 쓰기도 한꺼번에`,
        }}
        root={<>
          <p>애니메이션에는 <b>transform · opacity만</b> 쓰기로 팀 규칙을 정해요. 크기 변화는 <code>scale</code>로, 펼침은 FLIP 기법으로 바꿔요. Web Animations API나 CSS 전환으로 돌리면 브라우저가 합성 스레드에서 처리해서, 메인 스레드가 바빠도 부드러워요.</p>
        </>}
        prevent={[
          <>Stylelint로 <code>transition</code>·<code>@keyframes</code> 안의 <code>top</code>·<code>left</code>·<code>width</code>를 경고해요</>,
          <>개발자 도구 Rendering의 Paint flashing을 켜고 초록 깜빡임이 넓게 번지는지 봐요</>,
          <><code>will-change</code>는 움직이는 동안만, 꼭 필요한 요소에만 붙여요</>,
        ]}
        links={[['#/easing', '08 움직임 · 이징'], ['#/system/state', '디자인 시스템 · 상태와 모션']]}
      />
    </div>
  )
}
