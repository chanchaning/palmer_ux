/* 06 스타일 · 디자인 시스템 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './style.css'
import { A11yDemo, CssInJsDemo, DarkDemo, EllipsisDemo, I18nDemo, ImportantDemo, PortalDemo, StickyHoverDemo, TailwindDemo, TokenDemo } from './style-demos'

export default function StyleTab() {
  return (
    <div data-dev="style">
      <TabIntro>
        CSS는 틀려도 에러가 안 나요. 조금 이상하게 보일 뿐이라 늦게 발견돼요. 측정값은 브라우저가 실제로 계산한 스타일과 포커스 위치예요. 03·07은 원리만 흉내 냈어요.
      </TabIntro>

      <Issue id="st-m3-hig"
        demo={f => <TokenDemo fixed={f} />}
        demoNote={<>M3의 Title Large 22/28 · Body Large 16/24 · 버튼 40dp, HIG의 Title 3 20pt · Body 17pt · 최소 터치 44pt를 넣었어요. 두 화면에서 계산된 스타일을 읽어 비교해요.</>}
        cause={<>
          <p>웹 팀은 Material 3 문서를, iOS 팀은 HIG 문서를 보고 값을 각자 옮겨 적어요. 본문만 해도 M3는 16/24, iOS는 17pt예요. 단위(dp · pt · px)는 달라도 크기가 비슷해서 나란히 놓으면 미묘하게 어긋나 보여요. 고칠 곳도 두 군데라 “본문을 1px 키워 주세요” 같은 요청이 오면 한쪽만 바뀌고, 차이는 점점 벌어져요.</p>
        </>}
        quick={{
          lang: 'CSS · Swift · JSON',
          bad: `
/* web.css — M3 문서 보고 */
- .title { font-size: 22px; line-height: 28px; }
- .body  { font-size: 16px; line-height: 24px; }
- .btn   { height: 40px; border-radius: 20px; }

// Order.swift — HIG 문서 보고
- title.font = .systemFont(ofSize: 20)
- body.font  = .systemFont(ofSize: 17)
- button.heightAnchor.constraint(equalToConstant: 44)`,
          good: `
// tokens.json — 값은 여기 한 곳에만 (W3C 디자인 토큰 포맷)
+ { "font": { "title": { "$value": "20px", "$type": "dimension" },
+             "body":  { "$value": "16px", "$type": "dimension" } },
+   "size": { "touch": { "$value": "48px", "$type": "dimension" } } }

/* 빌드 도구(Style Dictionary 등)가 만든 tokens.css */
:root { --font-title: 20px; --font-body: 16px; --size-touch: 48px; }
+ .btn { min-height: var(--size-touch); }

// 같은 토큰에서 만든 Tokens.swift
+ button.heightAnchor.constraint(greaterThanOrEqualToConstant: Tokens.sizeTouch)`,
        }}
        root={<>
          <p><b>디자인 토큰</b>을 단일 원천으로 둬요. Figma 변수 → 토큰 JSON → 웹 CSS 변수 · iOS Swift · Android 리소스는 도구가 만들고, 사람은 JSON만 고쳐요.</p>
          <p>시스템 글꼴, 뒤로 가기 패턴, iOS Dynamic Type처럼 플랫폼마다 달라야 하는 것만 예외로 따로 적어요. 터치 크기처럼 두 스펙이 다르면 둘 다 만족하는 값을 골라요(M3 48dp ≥ HIG 44pt → 48).</p>
        </>}
        prevent={[
          <>Stylelint 플러그인 <code>stylelint-declaration-strict-value</code>로 <code>font-size</code> · <code>color</code>에 <code>var(--…)</code>만 쓰게 해요</>,
          <>토큰이 바뀌면 CI가 웹 · iOS · Android 결과물을 다시 만들어요. 생성 파일을 손으로 고친 흔적이 있으면 빌드를 실패시켜요</>,
        ]}
        links={[['#/platforms/platforms-spec', '18 머티리얼 vs HIG · 실무 핵심 규격'], ['#/material', '16 머티리얼 디자인'], ['#/hig', '17 애플 HIG'], ['#/system/type', '디자인 시스템 · 타이포그래피']]}
        ours={<>디자인 시스템 페이지의 ‘내보내기’는 지금 설정한 값을 CSS 변수 · W3C 토큰 JSON · Tailwind 설정으로 한 번에 만들어요. 다크 모드는 <code>[data-theme="dark"]</code>에서 시맨틱 토큰이 가리키는 값만 바꿔요.</>}
      />

      <Issue id="st-important"
        demo={f => <ImportantDemo fixed={f} />}
        demoNote={<>실제 CSS 규칙을 데모 안에 넣고, 브라우저가 칠한 배경색을 읽어 의도한 색과 비교해요.</>}
        cause={<>
          <p>CSS는 <Term k="명시도" d="선택자의 점수예요. id가 가장 세고, 그다음 class·속성·가상 클래스, 그다음 태그 순이에요. 점수가 높은 규칙이 이겨요." />가 높은 규칙이 이겨요. 옛 코드에 <code>#app .card .btn</code> 같은 선택자가 있으면 새 클래스 하나로는 못 이겨요. 급하게 <code>!important</code>를 붙이면 그때는 고쳐지지만, 다음에 그 규칙을 덮으려면 또 !important가 필요해요. 이게 몇 번 반복되면 !important끼리 파일 순서로 싸우게 돼요.</p>
        </>}
        quick={{
          lang: 'CSS',
          bad: `
#app .card .btn { background: gray; }        /* 1,2,0 */
- .btn-primary { background: blue !important; }
- .promo .btn-primary { background: orange !important; }
- .soldout .btn-primary { background: #eee !important; }`,
          good: `
+ @layer legacy, components, states;   /* 뒤에 적은 레이어가 이겨요 */

+ @layer legacy {
  #app .card .btn { background: gray; }       /* 점수가 높아도 */
+ }
+ @layer components {
+   :where(.btn).primary { background: blue; }  /* 0,1,0 */
+ }
+ @layer states {
+   .promo   { background: orange; }
+   .soldout { background: #eee; }
+ }`,
        }}
        root={<>
          <p><Term k="캐스케이드 레이어" d="@layer. 규칙을 묶음으로 나누고 묶음 사이의 우선순위를 미리 정해요. 묶음끼리는 명시도를 비교하지 않아요." />로 우선순위를 순서로 정해요. 리셋 → 라이브러리 → 컴포넌트 → 상태 → 유틸리티. 라이브러리 CSS는 <code>@import url(lib.css) layer(lib);</code>로 낮은 레이어에 넣어요.</p>
          <p>컴포넌트 기본값은 <code>:where()</code>로 점수를 0으로 낮춰 두면 덮어쓰기 쉬워요. 주의할 점이 두 가지 있어요. 레이어 밖 규칙은 모든 레이어를 이기고, <code>!important</code>는 반대로 <b>앞 레이어가</b> 이겨요.</p>
        </>}
        prevent={[
          <>Stylelint 기본 규칙 <code>declaration-no-important</code> · <code>selector-max-id: 0</code> · <code>selector-max-specificity</code>를 켜요</>,
          <>꼭 필요한 !important(유틸리티, 사용자 접근성 설정)는 주석에 이유를 적고 lint 예외로 등록해요</>,
        ]}
        ours={<>페이지마다 CSS를 <code>[data-page="…"]</code> · <code>[data-dev="…"]</code> 속성 범위로 묶고, 클래스에 접두어(이 탭은 <code>sy-</code>)를 붙여요. 다른 페이지 규칙과 점수를 겨룰 일이 없어요.</>}
      />

      <Issue id="st-tailwind-dynamic"
        demo={f => <TailwindDemo fixed={f} />}
        demoNote={<>Tailwind 대신 같은 원리로 소스 글자를 훑는 작은 스캐너예요. 스캐너가 찾은 클래스의 CSS만 페이지에 넣고, 뱃지에 칠해진 색을 읽어요.</>}
        cause={<>
          <p>Tailwind는 코드를 실행하지 않고 소스 파일을 <b>글자 그대로</b> 훑어서, 찾은 클래스 이름의 CSS만 만들어요. <code>{'`bg-${color}-500`'}</code>은 실행해야 완성되는 글자라 스캐너에는 <code>bg-</code>와 <code>-500</code> 조각만 보여요.</p>
          <p>개발 중에 보였다면 대개 우연이에요. 다른 파일에 같은 클래스가 글자 그대로 있었거나, 예전 Tailwind v2처럼 개발 빌드엔 모든 클래스를 넣고 운영 빌드에서만 지운 경우예요.</p>
        </>}
        quick={{
          lang: 'React · Tailwind',
          bad: `
function StatusBadge({ status }: { status: Status }) {
  const color = { ok: 'green', warn: 'amber', error: 'red' }[status]
- return <span className={\`bg-\${color}-500 text-white\`}>{status}</span>
}`,
          good: `
+ const COLOR = {
+   ok: 'bg-green-500',
+   warn: 'bg-amber-500',
+   error: 'bg-red-500',
+ } as const satisfies Record<Status, string>

function StatusBadge({ status }: { status: Status }) {
+ return <span className={\`\${COLOR[status]} text-white\`}>{status}</span>
}

/* 정말 동적으로 만들어야 하면 미리 등록 (v4.1+) */
+ @source inline("bg-{green,amber,red}-500");`,
        }}
        root={<>
          <p>클래스 이름은 완성된 글자로 적어요. 상태 → 클래스 표(map)를 두면 스캐너가 찾을 수 있고, 빠진 상태는 타입이 잡아 줘요. 미리 등록하려면 v3는 <code>tailwind.config.js</code>의 <code>safelist</code>, v4는 <code>@source inline()</code>을 써요.</p>
          <p>서버에서 오는 임의의 색처럼 값 자체가 동적이면 클래스 대신 CSS 변수로 넘겨요. <code>{"style={{ '--c': color }}"}</code> + <code>bg-[var(--c)]</code>(v4는 <code>bg-(--c)</code>).</p>
        </>}
        prevent={[
          <><code>eslint-plugin-tailwindcss</code> 같은 린트로 템플릿 문자열 안의 클래스 조각을 경고해요</>,
          <>화면 캡처 비교(visual regression)는 운영 빌드로 돌려요. 개발 서버에선 멀쩡해 보일 수 있어요</>,
          <>CI에서 CSS 결과물을 <code>grep</code>해 꼭 있어야 할 클래스가 빠지지 않았는지 봐요</>,
        ]}
      />

      <Issue id="st-css-in-js"
        demo={f => <CssInJsDemo fixed={f} />}
        demoNote={<>실제 라이브러리 대신 같은 일(스타일 객체 → 문자열 → 해시 → <code>insertRule</code>)을 하는 작은 흉내예요. 시간은 이 기기에서 잰 값이에요. 600줄을 다시 그리는 React 비용은 양쪽이 같으니, 차이는 CSS를 만드는 시간과 쌓이는 규칙 수에서 나요.</>}
        cause={<>
          <p>styled-components · Emotion 같은 런타임 CSS-in-JS는 그릴 때마다 스타일을 문자열로 만들고 해시를 계산해서, 처음 보는 조합이면 <code>&lt;style&gt;</code>에 규칙을 넣어요. props로 색이 바뀌는 목록이면 <b>값마다 새 규칙</b>이 쌓이고, 브라우저는 그때마다 스타일을 다시 계산해요.</p>
          <p>SSR에선 요청마다 쓰인 스타일을 모아 HTML에 넣는 설정(스타일 레지스트리)이 필요해요. React 서버 컴포넌트에선 못 써서 <code>'use client'</code>를 붙여야 하고요.</p>
        </>}
        quick={{
          lang: 'React · CSS',
          bad: `
- const Row = styled.li<{ $hue: number }>\`
-   color: hsl(\${p => p.$hue} 60% 40%);   /* 값마다 새 클래스 */
-   padding: 0 10px;
- \`

{items.map(it => <Row key={it.id} $hue={it.hue}>{it.name}</Row>)}`,
          good: `
/* Row.module.css — 빌드할 때 한 번만 만들어져요 */
+ .row { padding: 0 10px; color: hsl(var(--hue) 60% 40%); }

+ import s from './Row.module.css'

{items.map(it => (
+ <li key={it.id} className={s.row}
+   style={{ '--hue': it.hue } as CSSProperties}>
    {it.name}
  </li>
))}`,
        }}
        root={<>
          <p>새로 시작한다면 빌드할 때 CSS 파일을 만드는 방식을 골라요. CSS Modules, Tailwind, vanilla-extract, Linaria, Panda CSS, StyleX 등이 있어요. 런타임 비용이 없고 서버 컴포넌트에서도 써요.</p>
          <p>이미 런타임 라이브러리를 쓰고 있으면 바뀌는 값만 CSS 변수로 넘기는 것부터 해요. 규칙 수가 고정되고, 값이 바뀌어도 변수 하나만 갱신돼요.</p>
        </>}
        prevent={[
          <>Performance 탭에서 목록을 그릴 때 Recalculate Style 시간이 긴지 봐요</>,
          <>화면을 오갈수록 <code>document.styleSheets</code>의 규칙 수가 늘기만 하는지 개발자 도구에서 확인해요</>,
        ]}
      />

      <Issue id="st-portal"
        demo={f => <PortalDemo fixed={f} />}
        demoNote={<>‘고친 뒤’는 실제 <code>createPortal</code>로 <code>document.body</code>에 그려요. 메뉴 항목마다 그 자리에서 눌리는 요소를 <code>elementFromPoint</code>로 확인해 세요.</>}
        cause={<>
          <p><code>overflow: hidden</code>은 상자 밖으로 나간 자식을 잘라요. 기준 상자가 그 안에 있으면 <code>position: absolute</code> 메뉴도 같이 잘려요. 둥근 모서리나 이미지 크롭 때문에 카드에 overflow를 거는 일이 흔해서 자주 만나요.</p>
          <p><code>z-index</code>를 올려도 소용없어요. <code>transform</code> · <code>opacity</code> · <code>filter</code>가 걸린 부모는 새 <b>쌓임 맥락</b>을 만들어 자식을 그 안에 가둬요. transform이 있으면 <code>position: fixed</code>도 그 부모를 기준으로 잡혀요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<div className="card">          {/* overflow: hidden */}
  <button onClick={toggle}>⋯</button>
- {open && <ul className="menu">…</ul>}   {/* absolute → 잘려요 */}
</div>`,
          good: `
+ import { createPortal } from 'react-dom'

function Menu({ anchor }: { anchor: HTMLElement }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.right - 168 })
    }
    place()
+   const ac = new AbortController()
+   addEventListener('scroll', place, { capture: true, passive: true, signal: ac.signal })
+   addEventListener('resize', place, { signal: ac.signal })
+   return () => ac.abort()
  }, [anchor])
+ return createPortal(
+   <ul className="menu" style={{ position: 'fixed', ...pos }}>…</ul>,
+   document.body)
}`,
        }}
        root={<>
          <p>드롭다운 · 툴팁 · 팝오버는 팀 공용 레이어 컴포넌트 하나로 만들고, 위치 계산과 화면 끝에서 뒤집기는 Floating UI 같은 라이브러리에 맡겨요. 브라우저 기본 <code>popover</code> 속성은 맨 위 레이어(top layer)에 그려서 잘리지 않아요. CSS 앵커 위치 지정과 같이 쓰면 JS 위치 계산도 줄어요.</p>
          <p>포털로 옮기면 CSS 범위 선택자가 끊겨요. 이 데모도 감싸는 div에 범위를 다시 붙였어요. React 이벤트는 포털에서도 원래 트리로 올라가니, 바깥 클릭 판정에 포털 요소도 넣어요.</p>
        </>}
        prevent={[
          <>카드 · 표 · 모달 맨 아래 줄에 드롭다운을 둔 Storybook 스토리를 만들고 화면 캡처로 확인해요</>,
          <>390px 폭, 스크롤된 상태에서 메뉴가 화면 밖으로 나가지 않는지 E2E로 봐요</>,
        ]}
        links={[['#/similar/c-tooltip', '01 닮은꼴 · 툴팁 · 팝오버']]}
      />

      <Issue id="st-dark"
        demo={f => <DarkDemo fixed={f} />}
        demoNote={<>두 화면을 나란히 보이려고 각각 라이트 · 다크 팔레트를 고정했어요. 실제 <code>&lt;picture&gt;</code>는 OS 설정을 따르지만, 여기선 화면마다 파일을 직접 골라요. 대비는 계산된 색으로 WCAG 공식에 따라 재요.</>}
        cause={<>
          <p>글자와 배경은 CSS 변수로 바뀌어도 그림 안에 박힌 색은 그대로예요. 검은 로고 PNG, <code>fill="#333"</code>인 차트 글자, 흰 배경 일러스트가 다크 배경에서 사라지거나 번쩍여요. 급하게 전체에 <code>filter: invert(1)</code>을 걸면 글자는 보이지만, 사진과 브랜드색까지 뒤집혀 주황이 파랑이 되고 얼굴색이 이상해져요.</p>
        </>}
        quick={{
          lang: 'HTML · CSS',
          bad: `
- <img src="/logo-black.png" alt="팔머">
- <text fill="#333">월</text>        <!-- 차트 글자 -->
- [data-theme="dark"] img { filter: invert(1); }`,
          good: `
+ <svg class="logo" role="img" aria-label="팔머"><path fill="currentColor" d="…"/></svg>
.logo { color: var(--text); }

+ .chart text { fill: var(--chart-label); }
+ .chart line { stroke: var(--chart-grid); }

+ <picture>
+   <source srcset="/hero-dark.webp" media="(prefers-color-scheme: dark)">
    <img src="/hero.webp" alt="가을 신상품">
+ </picture>`,
        }}
        root={<>
          <p>아이콘 · 로고는 <b>인라인 SVG + currentColor</b>로 받아요. <code>&lt;img src="logo.svg"&gt;</code>에는 바깥 CSS가 닿지 않아요. SVGR의 <code>replaceAttrValues</code>로 빌드 때 색을 currentColor로 바꿀 수 있어요. 차트는 색을 CSS 변수에서 읽고, 캔버스 차트는 테마가 바뀌면 값을 다시 읽어 새로 그려요.</p>
          <p><code>&lt;picture&gt;</code>의 <code>prefers-color-scheme</code>는 OS 설정만 따라요. 사이트에 자체 다크 토글이 있으면 그 상태로 파일을 바꾸는 코드가 따로 필요해요. 기본 컨트롤과 스크롤바는 <code>color-scheme: light dark</code>로 맞춰요.</p>
        </>}
        prevent={[
          <>Playwright의 <code>colorScheme: 'dark'</code>로 두 테마 모두 화면 캡처 비교를 돌려요</>,
          <>axe 대비 검사도 다크 테마에서 한 번 더 돌려요</>,
          <>Stylelint <code>declaration-property-value-disallowed-list</code>로 <code>filter: invert</code>를 막아요</>,
        ]}
        links={[['#/contrast/contrast-dark', '20 명도 대비 · 다크 모드의 함정'], ['#/system/color', '디자인 시스템 · 컬러']]}
        ours={<>테마 색은 CSS 변수로 정의해요. OS가 다크면 <code>:root:not([data-theme="light"])</code>에서, 사용자가 직접 고르면 <code>[data-theme="dark"]</code>에서 같은 변수의 값만 바꿔요. 컴포넌트는 변수 이름만 알면 돼요.</>}
      />

      <Issue id="st-sticky-hover"
        demo={f => <StickyHoverDemo fixed={f} />}
        demoNote={<>데스크톱에선 끈적한 hover가 생기지 않아서, 왼쪽 폰은 터치 브라우저가 남기는 <code>:hover</code>를 클래스로 흉내 내요. 오른쪽 버튼은 실제 CSS라 폰에서 열면 차이가 보여요.</>}
        cause={<>
          <p>터치 브라우저는 옛 사이트와 맞추려고 탭할 때 마우스 이벤트도 흉내 내요. 누른 요소가 <code>:hover</code> 상태가 되고, 다른 곳을 누를 때까지 남아요. 토글 버튼에서 특히 헷갈려요. ‘좋아요’를 눌러 껐는데 hover 색이 남아 <b>아직 켜진 것처럼</b> 보여요.</p>
        </>}
        quick={{
          lang: 'CSS',
          bad: `
- .like:hover { background: var(--accent); color: #fff; }`,
          good: `
+ @media (hover: hover) and (pointer: fine) {
    .like:hover { background: var(--accent); color: #fff; }
+ }
+ .like:active { background: var(--surface-3); }    /* 터치는 누르는 동안만 */
+ .like:focus-visible { outline: 2px solid var(--accent); }`,
        }}
        root={<>
          <p>hover 효과는 <code>@media (hover: hover)</code> 안에서만 줘요. 주 입력 장치가 마우스처럼 위에 올려 둘 수 있는지 묻는 쿼리예요. 펜 · 터치 겸용 기기까지 챙기려면 <code>any-hover</code>도 있어요.</p>
          <p>Tailwind v4는 <code>hover:</code>를 이미 이렇게 감싸서 만들어요. JS로 hover를 다룰 땐 <code>pointerenter</code>에서 <code>e.pointerType === 'mouse'</code>인지 확인해요. 터치에선 <code>:active</code>로 누르는 동안만 표시해요.</p>
        </>}
        prevent={[
          <>개발자 도구의 기기 흉내로는 끈적한 hover가 잘 안 보여요. 실제 폰으로 토글 버튼을 눌러 보는 걸 QA에 넣어요</>,
          <>켜짐 · 꺼짐을 색 하나로만 보여주지 말고 아이콘이나 글자도 같이 바꿔요</>,
        ]}
        links={[['#/button-state/bstate-hover', '28 버튼 상태 · 호버'], ['#/similar/c-tooltip', '01 닮은꼴 · 툴팁 · 팝오버']]}
        ours={<>점선 밑줄 용어 풀이는 <code>matchMedia('(hover: hover)')</code>일 때만 마우스를 올려 열고, 터치에선 눌러서 열어요. 28 버튼 상태 가이드의 hover 규칙도 <code>@media (hover: hover)</code> 안에 있어요.</>}
      />

      <Issue id="st-i18n"
        demo={f => <I18nDemo fixed={f} />}
        demoNote={<>글자를 바꿀 때마다 <code>scrollWidth &gt; clientWidth</code>인 요소를 세요. ‘가짜 긴 언어’는 영어를 약 40% 늘리고 악센트를 붙인 <Term k="의사 지역화" d="pseudo-localization. 번역 전에 글자를 일부러 길고 낯설게 바꿔서, 레이아웃이 늘어난 글자를 견디는지 미리 보는 방법이에요." /> 문자열이에요.</>}
        cause={<>
          <p>한국어는 짧아요. ‘찜하기’ 세 글자에 맞춰 버튼 폭을 고정하면 독일어 ‘In den Warenkorb’ · ‘Benachrichtigungen’이 들어오자마자 넘쳐서 옆 버튼과 겹쳐요. 짧은 말일수록 번역했을 때 늘어나는 비율이 커요. 여기에 <code>white-space: nowrap</code>과 고정 <code>width</code> · <code>height</code>까지 겹치면 글자가 갈 곳이 없어요.</p>
        </>}
        quick={{
          lang: 'CSS',
          bad: `
.btn {
- width: 96px;
- height: 40px;
- white-space: nowrap;
}
- .tab { width: 25%; white-space: nowrap; }`,
          good: `
+ .btns { display: flex; flex-wrap: wrap; gap: 6px; }
.btn {
+ min-width: 88px;
+ min-height: 40px;
+ padding: 8px 12px;
+ flex: 1 1 auto;
}
.tab {
+ flex: 1 1 0; min-width: 0;
+ overflow-wrap: anywhere;
+ hyphens: auto;   /* <html lang="de"> 가 있어야 동작해요 */
}`,
        }}
        root={<>
          <p>레이아웃은 <b>글자가 늘어난다고 보고</b> 만들어요. 고정 폭 대신 <code>min-width</code>와 안쪽 여백을 주고, 가로가 모자라면 줄을 바꾸거나 세로로 쌓이게 해요.</p>
          <p>페이지마다 <code>lang</code> 속성을 맞춰요. 하이픈, 글꼴 선택, 스크린리더 발음이 이 값을 봐요. 아랍어 같은 오른쪽→왼쪽 언어까지 생각하면 <code>margin-left</code> 대신 <code>margin-inline-start</code> 같은 논리 속성을 써요.</p>
        </>}
        prevent={[
          <>번역 전에 의사 지역화 빌드를 하나 두고 QA가 그걸로 화면을 훑어요</>,
          <>Playwright로 ko · en · de 화면을 각각 캡처해 비교해요</>,
          <>Stylelint <code>declaration-property-value-disallowed-list</code>로 버튼의 <code>white-space: nowrap</code>을 막아요</>,
        ]}
        ours={<>본문 전체에 <code>word-break: keep-all</code>을 걸어 한국어가 낱말 중간에서 끊기지 않게 해요.</>}
      />

      <Issue id="st-a11y"
        demo={f => <A11yDemo fixed={f} />}
        demoNote={<>진짜 포커스 이동을 <code>focusin</code>으로 기록해요. 모달은 데모 상자 안에만 떠서 페이지를 막지 않고, 고치기 전 / 고친 뒤 모두 Esc · ✕로 닫혀요.</>}
        cause={<>
          <p><code>&lt;div onClick&gt;</code>으로 만든 모달은 화면에만 보여요. 브라우저와 스크린리더는 이게 대화상자인지 몰라요. 열어도 포커스는 뒤에 남아서 Tab을 누르면 <b>가려진 배경 버튼</b>으로 가고, <code>&lt;span&gt;</code> ✕는 키보드로 닿지도 않아요.</p>
          <p>닫을 때도 문제예요. 포커스가 있던 요소가 사라지면 포커스가 body로 떨어지고, 키보드 사용자는 페이지 맨 처음부터 다시 찾아가야 해요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- <div className="modal">
    <h2>주문을 취소할까요?</h2>
-   <div className="btn" onClick={close}>돌아가기</div>
-   <span onClick={close}>✕</span>
  </div>`,
          good: `
function CancelDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
+   const opener = document.activeElement as HTMLElement | null
+   ref.current?.showModal()     // 배경 inert · Esc 닫기 · 맨 위 레이어
+   return () => opener?.focus()  // 닫으면 열었던 버튼으로
  }, [])
  return (
+   <dialog ref={ref} aria-labelledby="cancel-t" onClose={onClose}>
      <h2 id="cancel-t">주문을 취소할까요?</h2>
+     <button onClick={() => ref.current?.close()}>돌아가기</button>
+     <button aria-label="닫기" onClick={() => ref.current?.close()}>✕</button>
+   </dialog>
  )
}`,
        }}
        root={<>
          <p>가능하면 브라우저 기본 <code>&lt;dialog&gt;</code>의 <code>showModal()</code>을 써요. 배경을 <code>inert</code>로 만들고 Esc 닫기도 해 줘요. 직접 만들면 <code>role="dialog"</code> · <code>aria-modal</code> · 이름(<code>aria-labelledby</code>) · 첫 포커스 · Tab 가두기 · 배경 <code>inert</code> · 닫은 뒤 포커스 돌려주기를 다 챙겨야 해요. 부담스러우면 Radix · React Aria · Headless UI처럼 접근성이 검증된 라이브러리를 팀 표준으로 정해요.</p>
        </>}
        prevent={[
          <><code>eslint-plugin-jsx-a11y</code>의 <code>click-events-have-key-events</code> · <code>no-static-element-interactions</code>를 켜요</>,
          <>E2E에 <code>@axe-core/playwright</code> 검사를 넣고, 모달을 연 상태에서도 한 번 돌려요</>,
          <>QA 시나리오: 마우스 없이 열기 → Tab · Shift+Tab 한 바퀴 → Esc → 포커스가 열었던 버튼에 있는지 확인</>,
        ]}
        links={[['#/button-state/bstate-focus', '28 버튼 상태 · 포커스'], ['#/similar/c-modal-popup', '01 닮은꼴 · 모달 · 팝업'], ['#/system/a11y', '디자인 시스템 · 접근성']]}
      />

      <Issue id="st-ellipsis"
        demo={f => <EllipsisDemo fixed={f} />}
        demoNote={<>이름마다 <code>scrollWidth &gt; clientWidth</code>를 <code>ResizeObserver</code>로 다시 재요. 폭을 바꿔 보세요.</>}
        cause={<>
          <p><code>text-overflow: ellipsis</code>는 넘친 글자를 눈에서만 숨겨요. 스크린리더는 전체를 읽지만, 보는 사람은 ‘주식회사 팔머물류 강남…’ 뒤가 몇 층 어느 구역인지 알 수 없어요.</p>
          <p>흔한 땜질은 모든 이름에 <code>title</code>을 붙이는 거예요. 그런데 title은 키보드 포커스나 터치로는 안 보이고, 안 잘린 짧은 이름에도 떠요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
.name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

- <span className="name">{name}</span>`,
          good: `
function TruncText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [cut, setCut] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current!
+   const ro = new ResizeObserver(() => setCut(el.scrollWidth > el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <span ref={ref} className="name"
+     title={cut ? text : undefined}   // 마우스
+     tabIndex={cut ? 0 : undefined}   // 키보드 · 터치 → :focus 툴팁
    >
      {text}
    </span>
  )
}`,
        }}
        root={<>
          <p>먼저 자르지 않아도 되는지 봐요. 두 줄까지 보여주는 <code>line-clamp</code>나 좁을 때 줄바꿈, 상세 화면으로 보내기가 더 나을 때가 많아요. 꼭 잘라야 하면 <b>실제로 잘렸을 때만</b> 툴팁과 포커스를 붙여요. 툴팁은 WCAG 1.4.13(Esc로 닫기, 툴팁 위로 마우스를 옮겨도 유지)도 지켜야 해요.</p>
        </>}
        prevent={[
          <>테스트 데이터에 50자 넘는 이름(회사 · 그룹 · 장소)을 넣어 둬요</>,
        ]}
        links={[['#/similar/c-tooltip', '01 닮은꼴 · 툴팁 · 팝오버']]}
      />
    </div>
  )
}
