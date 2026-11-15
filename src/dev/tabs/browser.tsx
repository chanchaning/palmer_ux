/* 09 브라우저 · 기기 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './browser.css'
import { AntialiasDemo, BackgroundDemo, ExtensionDemo, GapDemo, GhostDemo, ItpDemo, SafeAreaDemo, ScrollbarDemo, TimezoneDemo, VhDemo } from './browser-demos'

export default function BrowserTab() {
  return (
    <div data-dev="browser">
      <TabIntro>
        이 탭의 문제들은 대부분 <b>내 노트북에서는 절대 안 보인다</b>는 공통점이 있어요. 주소창이 움직이는 폰, 노치, 번역 확장 프로그램, 다른 시간대처럼 <b>개발 환경과 다른 조건</b>에서만 터져요.
        03 스크롤바 · 06 확장 프로그램 · 07 타임존은 이 브라우저에서 실제로 일어나는 걸 그대로 보여 주고, 나머지는 기기 화면을 흉내 낸 재현이에요(04는 진짜 탭 숨김도 감지해요).
      </TabIntro>

      <Issue id="br-100vh"
        demo={f => <VhDemo fixed={f} />}
        demoNote={<>폰 화면을 흉내 낸 재현이에요. 실제 값은 기기와 브라우저마다 달라요.</>}
        cause={<>
          <p>모바일 브라우저의 주소창·툴바는 스크롤하면 접히고, 맨 위로 오면 다시 펼쳐져요. 그런데 <code>100vh</code>는 <b>주소창이 접혔을 때의 큰 높이</b>로 정해져 있어요. 그래서 처음 열었을 때(주소창이 펼쳐진 상태) 화면보다 키가 커서, 맨 아래 버튼이 툴바 뒤로 숨어요.</p>
          <p>주소창이 움직일 때마다 높이를 바꾸면 화면이 계속 출렁이니까, 브라우저들이 일부러 vh를 고정한 거예요. 그 대신 <b>뜻이 분명한 새 단위</b>가 생겼어요.</p>
        </>}
        quick={{
          lang: 'CSS',
          bad: `
.checkout {
- height: 100vh;          /* 주소창이 접힌 기준 → 처음엔 넘쳐요 */
  display: flex; flex-direction: column;
}
.checkout .pay { margin-top: auto; }`,
          good: `
.checkout {
  height: 100vh;          /* 옛 브라우저용 대체값 */
+ height: 100dvh;         /* 지금 보이는 높이를 따라가요 */
  display: flex; flex-direction: column;
}
.hero {
+ min-height: 100svh;     /* 늘 작은 기준 → 출렁이지 않아요 */
}`,
        }}
        root={<>
          <p>단위를 목적에 맞게 골라요. <code>svh</code>는 <b>주소창이 펼쳐진 작은 높이</b>, <code>lvh</code>는 <b>접힌 큰 높이</b>(= 예전 vh), <code>dvh</code>는 <b>지금 보이는 높이</b>예요. 첫 화면 꽉 채우기는 svh, 하단 버튼이 꼭 보여야 하는 전체 화면은 dvh가 무난해요.</p>
          <p>dvh는 주소창이 움직일 때 레이아웃을 다시 계산하니 큰 영역에 남발하지 않아요. 그리고 세 단위 모두 <b>키보드 높이는 빼 주지 않아요</b>. 입력 화면은 키보드 문제를 따로 챙겨요.</p>
        </>}
        prevent={[
          <>QA 체크리스트에 ‘iOS Safari · Android Chrome에서 <b>처음 열었을 때</b> 하단 버튼이 보이나’를 넣어요</>,
          <><code>100vh</code>를 쓰는 곳은 Stylelint 규칙으로 경고하고, svh·dvh 중 고르게 해요</>,
          <>데스크톱 개발자 도구의 기기 모드는 주소창이 없어서 이 문제가 안 보여요. 실제 기기나 BrowserStack으로 확인해요</>,
        ]}
        ours={<>대시보드 바깥 틀은 <code>min-height: 100vh</code>만 써요. min-height라 내용이 길면 늘어나고, 화면 아래에 고정한 버튼이 없어서 가려질 일이 없어요.</>}
        links={[['#/dev/form/fm-keyboard', '07 폼 · 키보드가 입력창을 가림'], ['#/layout/layout-sticky', '07 앱 화면 구성 · 고정 헤더']]}
      />

      <Issue id="br-antialias"
        demo={f => <AntialiasDemo fixed={f} />}
        demoNote={<>OS 렌더링 차이는 굵기와 번짐을 과장해서 흉내 냈어요. 명암비는 지금 화면의 실제 색으로 계산한 값이고, 아래 스위치는 macOS에서만 실제로 달라져요.</>}
        cause={<>
          <p>같은 글꼴, 같은 굵기라도 <b>OS마다 글자를 그리는 방식이 달라요</b>. macOS는 모양을 살리며 부드럽게 그리고, Windows는 ClearType과 <Term k="힌팅" d="작은 글자를 화면 픽셀 칸에 맞춰 조금씩 비틀어 그리는 방법이에요. 선명해지지만 모양과 굵기가 달라 보일 수 있어요." />으로 픽셀에 맞춰 그려서 굵기·선명도가 달라 보여요.</p>
          <p>Mac에서 <code>-webkit-font-smoothing: antialiased</code>로 글자를 가늘게 만든 뒤 <b>가는 굵기 · 작은 크기 · 옅은 회색</b>으로 디자인을 맞추면, 그 속성이 아무 효과 없는 Windows에서는 전혀 다른 모습이 돼요.</p>
        </>}
        quick={{
          lang: 'CSS',
          bad: `
body {
- -webkit-font-smoothing: antialiased;  /* macOS에서만 효과 */
}
.caption {
- font-size: 12px;
- font-weight: 300;
- color: #b5b5b0;                       /* 명암비 2:1 수준 */
}`,
          good: `
.caption {
+ font-size: 14px;                      /* 한글 본문은 14px 이상 */
+ font-weight: 400;                     /* 가는 굵기는 큰 제목에만 */
+ color: var(--text-2);                 /* 명암비 4.5:1 이상 */
}
/* font-smoothing은 써도 되지만, 이걸로 굵기를 맞추지 않아요 */`,
        }}
        root={<>
          <p>OS 차이를 CSS 꼼수로 없애려 하지 말고, <b>어느 OS에서도 무난한 범위</b>로 디자인 토큰을 정해요. 본문은 14~16px, 굵기 400 이상, 명암비 4.5:1 이상이면 차이가 거의 문제 되지 않아요.</p>
          <p>가변 폰트라면 굵기를 450처럼 <b>살짝 올려</b> 두는 것도 방법이에요. 디자인 검수는 Mac 한 대가 아니라 <b>Windows 화면도 함께</b> 봐요.</p>
        </>}
        prevent={[
          <>디자인 시안 리뷰 때 Windows PC(또는 BrowserStack의 Windows)에서 캡처를 같이 붙여요</>,
          <>Figma 토큰에 ‘본문 최소 크기 · 최소 굵기 · 최소 명암비’를 적어 두고 Lint로 검사해요</>,
          <>Lighthouse·axe의 명암비 검사를 CI에 넣어요</>,
        ]}
        ours={<><code>body</code>에 <code>-webkit-font-smoothing: antialiased</code>를 쓰지만, 본문은 Pretendard 가변 폰트 15~16px · 기본 굵기 이상으로 맞춰서 Windows에서도 크게 달라지지 않게 했어요.</>}
        links={[['#/type', '19 타이포그래피']]}
      />

      <Issue id="br-scrollbar"
        demo={f => <ScrollbarDemo fixed={f} />}
        demoNote={<>이 브라우저에서 실제로 잰 값이에요. macOS·모바일처럼 스크롤바가 겹쳐 뜨는 기기에선 폭이 0px이라 차이가 안 보여요.</>}
        cause={<>
          <p>스크롤바 꾸미기는 오랫동안 <code>::-webkit-scrollbar</code>라는 <b>비표준 방법</b>뿐이었어요. Firefox는 이걸 모르고, 최신 Chrome은 표준 속성(<code>scrollbar-width</code>·<code>scrollbar-color</code>)이 지정돼 있으면 그쪽을 우선해서 -webkit- 규칙을 무시해요. 같은 CSS가 브라우저마다 다르게 보이는 이유예요.</p>
          <p>또 Windows처럼 스크롤바가 <b>자리를 차지하는</b> 환경에선, 내용이 길어져 스크롤바가 생기는 순간 내용 폭이 줄어서 화면이 옆으로 밀려요. 스크롤바가 겹쳐 뜨는 Mac에서만 개발하면 이 밀림을 못 봐요.</p>
        </>}
        quick={{
          lang: 'CSS',
          bad: `
.list { overflow-y: auto; }
- .list::-webkit-scrollbar { width: 14px; }
- .list::-webkit-scrollbar-thumb { background: #3550ee; }
/* Firefox는 무시, 내용이 늘면 폭이 바뀌어요 */`,
          good: `
.list {
  overflow-y: auto;
+ scrollbar-width: thin;                 /* 표준 */
+ scrollbar-color: var(--accent) transparent;
+ scrollbar-gutter: stable;             /* 자리를 미리 비워 둬요 */
}
/* 표준 속성을 아직 덜 지원하는 브라우저용 */
.list::-webkit-scrollbar { width: 10px; }
.list::-webkit-scrollbar-thumb { background: var(--accent); }`,
        }}
        root={<>
          <p><b>표준 속성을 먼저, -webkit-은 대체용</b>으로만 둬요. 색과 굵기(thin/auto/none) 정도만 바꾸고, 폭을 아주 좁히거나 숨기는 건 피해요. 스크롤바는 ‘더 있다’는 신호라서 없애면 사용자가 내용을 놓쳐요.</p>
          <p>목록·모달처럼 내용 길이가 바뀌는 곳엔 <code>scrollbar-gutter: stable</code>을 줘서 폭을 고정해요. 페이지 전체가 밀리는 문제(모달 열 때 등)는 <code>html</code>에 주면 돼요.</p>
        </>}
        prevent={[
          <>Windows 데스크톱(스크롤바 항상 보임)과 Firefox를 테스트 대상 브라우저 표에 넣어요</>,
          <>macOS에서도 설정 › 화면 표시 › ‘스크롤 막대 보기: 항상’으로 바꿔 놓고 개발해요</>,
          <><code>::-webkit-scrollbar</code>만 있고 표준 속성이 없는 규칙을 Stylelint로 찾아요</>,
        ]}
        ours={<>사이트 전체에 <code>scrollbar-width: thin</code>·<code>scrollbar-color</code>(표준)를 주고, <code>::-webkit-scrollbar</code>는 대체용으로 함께 둬요. <code>scrollbar-gutter</code>는 아직 쓰지 않아요.</>}
      />

      <Issue id="br-background"
        demo={f => <BackgroundDemo fixed={f} />}
        demoNote={<>업로드는 타이머로 흉내 냈고 실제 네트워크 요청은 없어요. ‘지금 이 탭’과 ‘탭 숨김 감지’는 진짜 <code>visibilitychange</code> 이벤트 값이에요.</>}
        cause={<>
          <p>모바일 브라우저는 앱을 전환하거나 화면을 끄면 배터리를 아끼려고 <b>탭을 멈추거나 연결을 끊어요</b>. 언제 멈추는지는 OS와 브라우저마다 다르고, iOS는 특히 빨라요. 큰 파일을 요청 하나로 올리고 있었다면 그대로 실패해요.</p>
          <p>떠날 때 기록을 보내려고 <code>unload</code>·<code>beforeunload</code>에 기대는 것도 문제예요. 모바일에선 앱 전환·종료 때 <b>이 이벤트가 안 불리는 경우가 많아요</b>.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
- await fetch('/upload', { method: 'POST', body: file })  // 10MB 한 번에

- window.addEventListener('unload', () => {
-   fetch('/log', { method: 'POST', body: JSON.stringify(log) })
- })`,
          good: `
+ for (let i = done; i < chunks.length; i++) {   // 1MB 조각, 끝난 번호 저장
+   await putChunk(uploadId, i, chunks[i])
+   done = i + 1
+ }

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
+   navigator.sendBeacon('/log', JSON.stringify(log))   // 작은 기록만
  } else {
+   resumeUpload()                     // 돌아오면 이어서
  }
})`,
        }}
        root={<>
          <p>큰 업로드는 <b>조각 나눠 이어 올리기(resumable)</b>로 만들어요. 서버가 받은 조각 번호를 기억하고, 클라이언트는 돌아왔을 때 남은 조각만 보내요. tus 같은 표준 프로토콜이나 클라우드 스토리지의 multipart 업로드를 쓰면 편해요.</p>
          <p>떠날 때 기록은 <code>visibilitychange</code>(hidden)·<code>pagehide</code>에서 <code>sendBeacon</code>이나 <code>fetch(…, {'{ keepalive: true }'})</code>로 보내요. 둘 다 <b>작은 데이터용</b>이에요. keepalive 요청 본문은 합쳐서 64KB까지라 업로드에는 못 써요.</p>
        </>}
        prevent={[
          <>QA 시나리오: ‘업로드 중 홈 화면 갔다 30초 뒤 돌아오기’, ‘화면 잠갔다 켜기’를 iOS·Android 실기기로 해요</>,
          <>업로드 API 설계 때 <b>재개 가능 여부</b>를 명세에 적어요</>,
          <>코드에서 <code>unload</code> 리스너를 린트로 막아요 (bfcache도 막혀요)</>,
        ]}
      />

      <Issue id="br-itp"
        demo={f => <ItpDemo fixed={f} />}
        demoNote={<>브라우저 동작을 표로 흉내 낸 재현이에요. 실제 정책은 버전·설정에 따라 바뀌니 꼭 실제 브라우저로 확인해요.</>}
        cause={<>
          <p>쇼핑몰(palmer-shop.kr) 안에 결제사(pay.dalpay.io) 화면을 iframe으로 넣으면, 그 iframe의 쿠키는 <b>서드파티 쿠키</b>가 돼요. Safari는 <Term k="ITP" d="Intelligent Tracking Prevention. Safari의 추적 방지 기능이에요. 다른 사이트 안에 들어간 화면의 쿠키를 막아요." />로 이걸 기본 차단하고, Firefox는 쿠키를 사이트마다 따로 저장해서 결제사 사이트에서 한 로그인이 iframe에선 안 보여요.</p>
          <p>Chrome은 기본으로는 아직 보내는 편이지만, 시크릿 모드나 사용자 설정에선 막혀요. 그래서 <b>Chrome에서만 테스트하면</b> “Safari에서만 로그인이 풀려요”라는 문의가 와요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
// iframe(pay.dalpay.io) 안
- const res = await fetch('/api/me', { credentials: 'include' })
- // 서드파티 쿠키에 기대요 → Safari·Firefox에서 401`,
          good: `
// 부모(palmer-shop.kr): 자기 서버에서 받은 짧은 토큰을 넘겨요
+ frame.contentWindow.postMessage({ token }, 'https://pay.dalpay.io')

// iframe 안
window.addEventListener('message', e => {
+ if (e.origin !== 'https://palmer-shop.kr') return   // 보낸 곳 확인
+ api.setToken(e.data.token)   // Authorization 헤더로 사용
})

// 쿠키가 꼭 필요하면: 사용자가 누를 때 허락받기
+ btn.onclick = () => document.requestStorageAccess()`,
        }}
        root={<>
          <p>가능하면 <b>같은 사이트로</b> 만들어요. pay.palmer-shop.kr처럼 서브도메인으로 두면 퍼스트파티 쿠키라 막히지 않아요. 어렵다면 부모가 <b>짧게 쓰는 토큰을 postMessage로 넘기고</b>, iframe은 쿠키 대신 헤더로 인증해요. 받는 쪽은 반드시 <code>origin</code>을 확인해요.</p>
          <p>iframe 안에서 로그인해 세션을 유지하는 게 목적이면 <Term k="CHIPS" d="Partitioned 속성을 붙인 쿠키예요. 부모 사이트별로 따로 저장돼서, 추적에는 못 쓰지만 그 사이트 안 iframe에선 계속 쓸 수 있어요." />(<code>Partitioned</code> 쿠키), 원래 로그인 쿠키가 꼭 필요하면 <b>Storage Access API</b>로 사용자 허락을 받아요.</p>
        </>}
        prevent={[
          <>테스트 대상에 <b>Safari(맥·아이폰)와 Firefox</b>를 넣고, Chrome은 시크릿 모드로도 확인해요</>,
          <>임베드 기능 설계 때 ‘서드파티 쿠키 없이 동작하나’를 필수 질문으로 둬요</>,
          <>인증이 쿠키·토큰 중 어디에 기대는지 아키텍처 문서에 적어요</>,
        ]}
      />

      <Issue id="br-extension"
        demo={f => <ExtensionDemo fixed={f} />}
        demoNote={<>번역 버튼은 Google 번역 같은 도구가 하는 일(글자를 <code>&lt;font&gt;</code>로 바꿔 끼우기)을 흉내 내요. 그 뒤 React가 겪는 에러는 <b>진짜</b>이고, 이 데모만 감싼 에러 바운더리가 받아요. 문제 모드에선 콘솔에 React 에러가 한 번 찍혀요(의도한 거예요).</>}
        cause={<>
          <p>자동 번역은 화면의 글자 노드를 <code>&lt;font&gt;</code> 요소로 <b>바꿔 끼워요</b>. React는 그 사실을 몰라서, 원래 글자 노드를 기준으로 “이 앞에 하트를 넣어라”(<code>insertBefore</code>)나 “이걸 지워라”(<code>removeChild</code>)를 시도해요. 기준 노드가 이미 사라졌으니 <b>NotFoundError</b>가 나고, 에러 바운더리가 없으면 앱 전체가 하얘져요.</p>
          <p>특히 <code>{'{liked && <Heart/>}'}좋아요 {'{n}'}</code>처럼 <b>조건부 요소 바로 옆에 맨 글자</b>가 있을 때 잘 터져요. 숫자도 React가 바꾼 건 떨어져 나간 노드라 화면엔 옛 값이 남아요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<button onClick={toggle}>
  {liked && <Heart />}
- 좋아요 {count}
</button>`,
          good: `
<button onClick={toggle}>
  {liked && <Heart />}
+ <span>좋아요 </span>
+ <span translate="no">{count}</span>
</button>`,
        }}
        root={<>
          <p>조건부로 생기고 사라지는 요소 옆의 글자는 <b>span으로 감싸요</b>. 그러면 번역기가 span 안쪽만 바꾸고, React는 span을 기준으로 움직여서 충돌하지 않아요. 숫자·이름·코드처럼 번역하면 안 되는 곳은 <code>translate="no"</code>(또는 <code>class="notranslate"</code>)를 붙여요.</p>
          <p>그래도 확장 프로그램은 끝없이 다양하니까 <b>구역별 에러 바운더리</b>를 둬서 한 곳이 멈춰도 나머지는 살아 있게 해요. 번역이 필요 없는 관리 화면이라면 <code>&lt;html translate="no"&gt;</code>도 방법이지만, 번역이 꼭 필요한 사용자를 막는다는 점을 생각해요.</p>
        </>}
        prevent={[
          <>QA 때 Chrome 자동 번역을 켠 채 주요 흐름(장바구니·결제)을 한 번 돌아요</>,
          <>에러 수집 도구에서 <code>NotFoundError</code>·<code>removeChild</code>·<code>insertBefore</code> 에러를 따로 묶어 봐요</>,
          <>리뷰 기준: 조건부 렌더링 바로 옆의 맨 글자는 span으로 감싸요</>,
        ]}
        links={[['#/dev/debug/dbg-white', '10 보안 · 디버깅 · 하얀 화면']]}
      />

      <Issue id="br-timezone"
        demo={f => <TimezoneDemo fixed={f} />}
        demoNote={<>이 기기의 실제 시간대로 계산해요. 해외 시간대에서 열면 다른 시각에 날짜가 틀려요.</>}
        cause={<>
          <p>한국은 UTC보다 9시간 빨라요. 클라이언트가 <code>"2026-11-15T23:00:00"</code>처럼 <b>오프셋 없는 시각</b>을 보내고 서버가 이걸 UTC로 믿으면, 다시 한국 시간으로 보여 줄 때 9시간이 더해져 <b>다음 날 아침 8시</b>로 찍혀요.</p>
          <p>반대로 <code>toISOString().slice(0, 10)</code>으로 날짜를 자르면 UTC 날짜가 나와서, 한국에선 <b>새벽 0~9시에 쓴 글이 전날</b>로 묶여요. 개발 서버·CI가 UTC면 둘 다 티가 안 나요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
- const body = { createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss') }  // 오프셋 없음
- const day = new Date().toISOString().slice(0, 10)             // UTC 날짜`,
          good: `
+ const body = { createdAt: new Date().toISOString() }  // "…Z" UTC로 저장

+ const fmt = new Intl.DateTimeFormat('ko-KR', {
+   timeZone: 'Asia/Seoul',          // 보여 줄 때만 바꿔요
+   dateStyle: 'medium', timeStyle: 'short',
+ })
+ fmt.format(new Date(post.createdAt))

+ const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })
+   .format(new Date())              // "2026-11-15"`,
        }}
        root={<>
          <p>규칙은 하나예요. <b>저장·전송은 UTC(또는 오프셋 포함 ISO 문자열), 보여 줄 때만 시간대 변환</b>. DB 칼럼은 시간대를 함께 저장하는 형식(<code>timestamptz</code> 등)을 쓰고, ‘어느 시간대 기준 날짜인가’를 기획 단계에서 정해요(사용자 기기 기준인지, 서비스 기준 서울인지).</p>
          <p>날짜 계산은 <code>Intl.DateTimeFormat</code>이나 시간대를 아는 라이브러리(date-fns-tz, Luxon, Temporal)로 하고, 문자열을 직접 자르거나 9시간을 손으로 더하지 않아요.</p>
        </>}
        prevent={[
          <>테스트를 <code>TZ=America/New_York</code>, <code>TZ=Asia/Seoul</code> 두 번 돌려요 (Playwright는 <code>timezoneId</code> 옵션)</>,
          <>경계값 테스트: 23:59, 00:00, 08:59, 09:00, 월말·연말</>,
          <>API 명세에 날짜 필드는 ‘ISO 8601, 오프셋 필수’라고 적어요</>,
        ]}
      />

      <Issue id="br-ghost-click"
        demo={f => <GhostDemo fixed={f} />}
        demoNote={<>휴대폰으로 누르면 실제로 일어나요. 마우스에선 브라우저가 이렇게 하지 않아서, 손을 뗀 자리에 click이 한 번 더 떨어지는 걸 흉내 내요.</>}
        cause={<>
          <p>터치하면 브라우저는 <code>touchstart → touchend</code> 다음에, 옛 사이트와 호환하려고 <b>같은 자리에 mouse 이벤트와 click을 한 번 더</b> 보내요. 시트를 <code>touchend</code>에서 닫으면, 뒤따라온 click이 그 자리에 새로 드러난 <b>아래 버튼</b>에 떨어져요.</p>
          <p>예전엔 브라우저가 더블 탭 확대를 기다리느라 click을 300ms 늦게 보냈고, 그걸 피하려고 touchend를 쓰다 이 버그가 흔해졌어요. 지금은 <code>width=device-width</code> 뷰포트가 있으면 <b>그 지연이 없어서</b> touchend를 쓸 이유가 없어요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<button
- onTouchEnd={close}   // 닫히자마자 click이 아래로 떨어져요
>확인</button>`,
          good: `
<button
+ onClick={close}      // 터치·마우스·키보드 모두 한 번
>확인</button>

/* 꼭 touch 이벤트를 써야 한다면 */
- onTouchEnd={close}
+ onTouchEnd={e => { e.preventDefault(); close() }}  // 뒤따르는 click 취소`,
        }}
        root={<>
          <p>버튼 동작은 <b>click 하나로</b> 처리해요. 누르는 느낌이 필요하면 <code>pointerdown</code>으로 눌린 모양만 보여 주고, 실제 동작은 click에서 해요. Pointer Events는 마우스·터치·펜을 한 이벤트로 다뤄요.</p>
          <p>viewport 메타에 <code>width=device-width</code>를 두고, 확대가 필요 없는 버튼엔 <code>touch-action: manipulation</code>을 줘요. FastClick 같은 옛 라이브러리는 이제 빼요.</p>
        </>}
        prevent={[
          <>시트·모달·드롭다운의 닫기 버튼은 실기기에서 ‘닫히는 자리 아래에 버튼이 있는’ 화면으로 눌러 봐요</>,
          <>코드 검색으로 <code>onTouchEnd</code>·<code>touchend</code> 사용처를 찾아 click으로 바꿔요</>,
          <>제스처가 필요한 곳은 팀 공용 훅 하나로만 만들어요</>,
        ]}
        links={[['#/gesture', '10 제스처']]}
      />

      <Issue id="br-gap"
        demo={f => <GapDemo fixed={f} />}
        demoNote={<>옛 엔진은 flex의 gap을 무시하게 해서 흉내 냈어요. 간격은 화면에 그려진 카드 위치를 실제로 잰 값이에요.</>}
        cause={<>
          <p>Safari는 <b>14.1(iOS 14.5)부터</b> flex 컨테이너의 <code>gap</code>을 지원해요. 그보다 옛 버전은 gap을 그냥 무시해서 카드들이 딱 붙어요. grid의 gap은 훨씬 오래전부터 지원돼서 grid에선 문제가 없어요.</p>
          <p>더 헷갈리는 건 <code>@supports (gap: 10px)</code>가 옛 Safari에서도 <b>참</b>이라는 점이에요. grid용 gap은 알아서 “지원한다”고 답하니까, 이걸로는 flex gap 지원을 가려낼 수 없어요.</p>
        </>}
        quick={{
          lang: 'CSS · JS',
          bad: `
.cards { display: flex; flex-wrap: wrap; gap: 10px; }
- @supports not (gap: 10px) { /* 옛 Safari도 여기 안 들어와요 */ }`,
          good: `
.cards { display: flex; flex-wrap: wrap; gap: 10px; }
+ .no-flexgap .cards { margin: -5px; }
+ .no-flexgap .cards > * { margin: 5px; }

// 실제로 그려 보고 판단해요
+ const d = document.createElement('div')
+ d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute'
+ d.append(document.createElement('div'), document.createElement('div'))
+ document.body.append(d)
+ if (d.scrollHeight !== 1) document.documentElement.classList.add('no-flexgap')
+ d.remove()`,
        }}
        root={<>
          <p>먼저 <b>지원 범위를 정해요</b>. <code>browserslist</code>에 실제 사용자 통계를 반영해 두고, 그 범위에 iOS 14.4 이하가 없다면 gap을 그냥 써도 돼요. 범위에 있다면 카드 격자는 <b>grid + gap</b>으로 바꾸는 게 가장 간단해요.</p>
          <p>flex가 꼭 필요하면 위처럼 기능을 직접 검사해서 margin 대체 규칙을 켜요. 한 줄짜리 목록은 <code>{'> * + *'}</code>(올빼미 선택자)에 margin을 주는 방법도 있어요.</p>
        </>}
        prevent={[
          <><code>browserslist</code> + Autoprefixer로 지원 범위를 코드에 박아 두고, <code>doiuse</code>나 Stylelint의 <code>plugin/no-unsupported-browser-features</code>로 경고를 받아요</>,
          <>분석 도구에서 OS·브라우저 버전 분포를 분기마다 확인해 범위를 갱신해요</>,
          <>BrowserStack 등에서 지원 범위의 가장 옛 버전 기기로 주요 화면을 봐요</>,
        ]}
      />

      <Issue id="br-safe-area"
        demo={f => <SafeAreaDemo fixed={f} />}
        demoNote={<>폰 화면을 흉내 냈어요. 실제 <code>env()</code> 값 대신 CSS 변수에 아이폰과 비슷한 값을 넣었어요. 가려진 개수는 그려진 위치를 실제로 잰 값이에요.</>}
        cause={<>
          <p>viewport 메타에 <code>viewport-fit=cover</code>를 주면 화면 <b>끝에서 끝까지</b> 그릴 수 있어요. 대신 노치(다이내믹 아일랜드)·상태 표시줄·홈 바 자리까지 내 화면이 들어가서, 거기 놓인 글자와 버튼이 가려져요.</p>
          <p>브라우저는 그 자리의 크기를 <code>env(safe-area-inset-top)</code> 같은 값으로 알려 줘요. 이 값을 <b>여백에 더하지 않은 것</b>이 원인이에요. 가로로 돌리면 노치가 옆으로 가서 왼쪽·오른쪽 값도 생겨요.</p>
        </>}
        quick={{
          lang: 'HTML · CSS',
          bad: `
<meta name="viewport" content="width=device-width, viewport-fit=cover">

- .header { position: fixed; top: 0; padding: 10px 12px; }
- .tabbar { position: fixed; bottom: 0; padding: 8px 12px; }`,
          good: `
<meta name="viewport" content="width=device-width, viewport-fit=cover">

.header {
  position: fixed; top: 0;
+ padding-top: max(10px, env(safe-area-inset-top));
+ padding-left: max(12px, env(safe-area-inset-left));
+ padding-right: max(12px, env(safe-area-inset-right));
}
.tabbar {
  position: fixed; bottom: 0;
+ padding-bottom: max(8px, env(safe-area-inset-bottom));
}`,
        }}
        root={<>
          <p>헤더·탭 바·하단 고정 버튼처럼 <b>화면 끝에 붙는 공용 컴포넌트</b> 안에서 safe-area를 처리해요. 화면마다 따로 챙기면 언젠가 빠져요. <code>max()</code>로 감싸면 노치가 없는 기기에선 원래 여백을 그대로 써요.</p>
          <p>끝까지 그릴 필요가 없다면 <code>viewport-fit=cover</code>를 빼는 것도 방법이에요. 그러면 iOS가 위험한 영역을 비워 둬요. 안드로이드도 화면 끝까지 그리는 방식이 늘고 있어서 같은 값을 챙겨 두면 좋아요.</p>
        </>}
        prevent={[
          <>노치 있는 아이폰을 <b>세로·가로 둘 다</b> 테스트 대상 표에 넣어요</>,
          <>Xcode 시뮬레이터(Safari)로 여러 기종을 확인해요. 데스크톱 기기 모드는 safe-area 값이 0이에요</>,
          <>고정 헤더·탭 바 컴포넌트에 safe-area 처리를 넣고, 화면에선 직접 <code>position: fixed</code>를 못 쓰게 리뷰해요</>,
        ]}
        ours={<>이 사이트는 <code>viewport-fit=cover</code>를 쓰지 않아서, iOS가 안전 영역 밖을 비워 둬요. 그래서 따로 <code>env()</code>를 쓰지 않아요.</>}
        links={[['#/type/type-ios', '19 타이포그래피 · 입력창 16px 규칙'], ['#/layout/layout-sticky', '07 앱 화면 구성 · 고정 헤더']]}
      />
    </div>
  )
}
