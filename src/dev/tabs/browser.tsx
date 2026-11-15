/* 09 브라우저 · 기기 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './browser.css'
import { AntialiasDemo, BackgroundDemo, ExtensionDemo, GapDemo, GhostDemo, ItpDemo, SafeAreaDemo, ScrollbarDemo, TimezoneDemo, VhDemo } from './browser-demos'

export default function BrowserTab() {
  return (
    <div data-dev="browser">
      <TabIntro>
        개발할 때 쓰는 노트북에서는 거의 안 보이는 문제들이에요. 03 스크롤바 · 06 확장 프로그램 · 07 타임존은 이 브라우저에서 실제로 일어나는 걸 보여 주고, 나머지는 기기 화면을 흉내 냈어요(04는 진짜 탭 숨김도 감지해요).
      </TabIntro>

      <Issue id="br-100vh"
        demo={f => <VhDemo fixed={f} />}
        demoNote={<>폰 화면을 흉내 낸 재현이에요. 실제 값은 기기와 브라우저마다 달라요.</>}
        cause={<>
          <p>모바일 브라우저의 주소창과 툴바는 스크롤하면 접혔다가 맨 위에서 다시 펼쳐져요. <code>100vh</code>는 주소창이 접혔을 때의 큰 높이로 고정돼 있어서, 주소창이 펼쳐진 첫 화면에선 실제 화면보다 키가 커서 맨 아래 버튼이 툴바 뒤로 숨어요. 화면이 출렁이지 않게 브라우저가 일부러 고정해 둔 거예요.</p>
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
          <p><code>svh</code>는 주소창이 펼쳐진 작은 높이, <code>lvh</code>는 접힌 큰 높이(예전 vh와 같아요), <code>dvh</code>는 지금 보이는 높이예요. 첫 화면을 꽉 채울 땐 svh, 하단 버튼이 꼭 보여야 하는 화면엔 dvh가 무난해요.</p>
          <p>dvh는 주소창이 움직일 때마다 레이아웃을 다시 계산하니 큰 영역엔 아껴 써요. 세 단위 모두 <b>키보드 높이는 빼 주지 않아요</b>.</p>
        </>}
        prevent={[
          <>iOS Safari·Android Chrome 실기기에서 처음 열었을 때 하단 버튼이 보이는지 봐요. 데스크톱 기기 모드엔 주소창이 없어요</>,
          <><code>100vh</code>는 Stylelint로 경고해서 svh와 dvh 중에 고르게 해요</>,
        ]}
        ours={<>대시보드 바깥 틀은 <code>min-height: 100vh</code>만 써요. 내용이 길면 늘어나고, 화면 아래 고정 버튼도 없어서 가려질 게 없어요.</>}
        links={[['#/dev/form/fm-keyboard', '07 폼 · 키보드가 입력창을 가림'], ['#/layout/layout-sticky', '07 앱 화면 구성 · 고정 헤더']]}
      />

      <Issue id="br-antialias"
        demo={f => <AntialiasDemo fixed={f} />}
        demoNote={<>OS 렌더링 차이는 굵기와 번짐을 과장해 흉내 냈어요. 명암비는 지금 화면의 실제 색으로 계산했고, 아래 스위치는 macOS에서만 실제로 달라져요.</>}
        cause={<>
          <p>같은 글꼴, 같은 굵기라도 OS마다 글자를 그리는 방식이 달라요. macOS는 모양을 살려 부드럽게 그리고, Windows는 ClearType과 <Term k="힌팅" d="작은 글자를 화면 픽셀 칸에 맞춰 조금씩 비틀어 그리는 방법이에요. 선명해지지만 모양과 굵기가 달라 보일 수 있어요." />으로 픽셀에 맞춰 그려서 굵기와 선명도가 달라 보여요.</p>
          <p>Mac에서 <code>-webkit-font-smoothing: antialiased</code>로 가늘어진 글자에 맞춰 가는 굵기, 작은 크기, 옅은 회색을 고르면 탈이 나요. 이 속성은 Windows에서 아무 효과가 없어요.</p>
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
          <p>OS 차이를 CSS로 없애려 하기보다 <b>어느 OS에서도 무난한 범위</b>로 디자인 토큰을 정해요. 본문 14~16px, 굵기 400 이상, 명암비 4.5:1 이상이면 차이가 거의 문제 되지 않아요. 가변 폰트라면 굵기를 450쯤으로 살짝 올려 두는 것도 방법이에요.</p>
        </>}
        prevent={[
          <>디자인 검수 때 Windows PC(또는 BrowserStack의 Windows) 캡처를 같이 붙여요</>,
          <>Lighthouse·axe의 명암비 검사를 CI에 넣어요</>,
        ]}
        ours={<><code>body</code>에 <code>-webkit-font-smoothing: antialiased</code>를 쓰지만, 본문이 Pretendard 가변 폰트 15~16px에 기본 굵기 이상이라 Windows에서도 크게 다르지 않아요.</>}
        links={[['#/type', '19 타이포그래피']]}
      />

      <Issue id="br-scrollbar"
        demo={f => <ScrollbarDemo fixed={f} />}
        demoNote={<>이 브라우저에서 실제로 잰 값이에요. 스크롤바가 겹쳐 뜨는 macOS·모바일에선 폭이 0px이라 차이가 없어요.</>}
        cause={<>
          <p>스크롤바 꾸미기는 오랫동안 비표준인 <code>::-webkit-scrollbar</code>뿐이었어요. Firefox는 이걸 모르고, 최신 Chrome은 표준 속성(<code>scrollbar-width</code>·<code>scrollbar-color</code>)이 있으면 그쪽을 우선해서 -webkit- 규칙을 무시해요.</p>
          <p>Windows처럼 스크롤바가 <b>자리를 차지하는</b> 환경에선 스크롤바가 생기는 순간 내용 폭이 줄어 화면이 옆으로 밀려요. 스크롤바가 겹쳐 뜨는 Mac에선 안 보여요.</p>
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
          <p>표준 속성을 먼저 쓰고 -webkit-은 대체용으로 둬요. 색과 굵기(thin/auto/none) 정도만 바꾸고, 숨기거나 아주 좁히진 않아요. 스크롤바가 없으면 내용이 더 있다는 걸 사용자가 놓쳐요.</p>
          <p>목록·모달처럼 내용 길이가 바뀌는 곳엔 <code>scrollbar-gutter: stable</code>로 폭을 고정해요. 모달을 열 때 페이지 전체가 밀린다면 <code>html</code>에 주면 돼요.</p>
        </>}
        prevent={[
          <>macOS에서도 설정 › 화면 표시 › ‘스크롤 막대 보기: 항상’으로 두고 개발해요</>,
          <><code>::-webkit-scrollbar</code>만 있고 표준 속성이 없는 규칙은 Stylelint로 찾아요</>,
        ]}
        ours={<>사이트 전체에 <code>scrollbar-width: thin</code>·<code>scrollbar-color</code>(표준)를 주고, <code>::-webkit-scrollbar</code>는 대체용으로 함께 둬요. <code>scrollbar-gutter</code>는 아직 쓰지 않아요.</>}
      />

      <Issue id="br-background"
        demo={f => <BackgroundDemo fixed={f} />}
        demoNote={<>업로드는 타이머로 흉내 냈고 실제 네트워크 요청은 없어요. ‘지금 이 탭’과 ‘탭 숨김 감지’는 진짜 <code>visibilitychange</code> 이벤트 값이에요.</>}
        cause={<>
          <p>모바일 브라우저는 앱을 전환하거나 화면을 끄면 배터리를 아끼려고 탭을 멈추거나 연결을 끊어요. 시점은 OS·브라우저마다 다르고 iOS가 특히 빨라요. 큰 파일을 요청 하나로 올리던 중이면 그대로 실패해요.</p>
          <p>떠날 때 기록을 <code>unload</code>·<code>beforeunload</code>에서 보내는 것도 위험해요. 모바일에선 앱 전환이나 종료 때 이 이벤트가 안 불릴 때가 많아요.</p>
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
          <p>큰 업로드는 <b>조각 나눠 이어 올리기(resumable)</b>로 만들어요. 서버는 받은 조각 번호를 기억하고, 클라이언트는 돌아왔을 때 남은 조각만 보내요. tus 프로토콜이나 클라우드 스토리지의 multipart 업로드를 쓰면 편해요.</p>
          <p>떠날 때 기록은 <code>visibilitychange</code>(hidden)나 <code>pagehide</code>에서 <code>sendBeacon</code> 또는 <code>fetch(…, {'{ keepalive: true }'})</code>로 보내요. 둘 다 작은 데이터용이고, keepalive 요청 본문은 합쳐서 64KB까지라 업로드엔 못 써요.</p>
        </>}
        prevent={[
          <>iOS·Android 실기기에서 업로드 중에 홈 화면을 30초 다녀오고, 화면도 잠갔다 켜 봐요</>,
          <>업로드 API 명세에 재개 가능 여부를 적어요</>,
          <><code>unload</code> 리스너는 린트로 막아요. bfcache까지 막는 리스너예요</>,
        ]}
      />

      <Issue id="br-itp"
        demo={f => <ItpDemo fixed={f} />}
        demoNote={<>브라우저 동작을 표로 흉내 냈어요. 실제 정책은 버전과 설정에 따라 바뀌니 실제 브라우저로 확인해요.</>}
        cause={<>
          <p>쇼핑몰(palmer-shop.kr) 안에 결제사(pay.dalpay.io) 화면을 iframe으로 넣으면, 그 iframe의 쿠키는 <b>서드파티 쿠키</b>가 돼요. Safari는 <Term k="ITP" d="Intelligent Tracking Prevention. Safari의 추적 방지 기능이에요. 다른 사이트 안에 들어간 화면의 쿠키를 막아요." />로 이걸 기본 차단하고, Firefox는 쿠키를 사이트마다 따로 저장해서 결제사에서 한 로그인이 iframe 안에선 안 보여요.</p>
          <p>Chrome은 기본으로는 아직 보내는 편이지만 시크릿 모드나 설정에 따라 막혀요. Chrome에서만 테스트하면 “Safari에서만 로그인이 풀려요”라는 문의가 와요.</p>
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
          <p>가능하면 pay.palmer-shop.kr 같은 서브도메인, 즉 같은 사이트로 만들어요. 퍼스트파티 쿠키라 막히지 않아요. 어렵다면 부모가 짧게 쓰는 토큰을 postMessage로 넘기고, iframe은 쿠키 대신 헤더로 인증해요. 받는 쪽은 반드시 <code>origin</code>을 확인해요.</p>
          <p>iframe 안에서 로그인 세션만 유지하면 되는 경우엔 <Term k="CHIPS" d="Partitioned 속성을 붙인 쿠키예요. 부모 사이트별로 따로 저장돼서, 추적에는 못 쓰지만 그 사이트 안 iframe에선 계속 쓸 수 있어요." />(<code>Partitioned</code> 쿠키)를 쓰고, 원래 로그인 쿠키가 꼭 필요하면 Storage Access API로 사용자 허락을 받아요.</p>
        </>}
        prevent={[
          <>테스트에 Safari(맥·아이폰)와 Firefox를 넣고, Chrome은 시크릿 모드로도 봐요</>,
          <>임베드 기능을 설계할 때 ‘서드파티 쿠키 없이 동작하나’부터 물어요</>,
        ]}
      />

      <Issue id="br-extension"
        demo={f => <ExtensionDemo fixed={f} />}
        demoNote={<>번역 버튼은 Google 번역 같은 도구가 글자를 <code>&lt;font&gt;</code>로 바꿔 끼우는 걸 흉내 내요. 그 뒤의 React 에러는 진짜이고, 이 데모만 감싼 에러 바운더리가 받아요. ‘고치기 전’에선 콘솔에 에러가 한 번 찍혀요(의도한 거예요).</>}
        cause={<>
          <p>자동 번역은 화면의 글자 노드를 <code>&lt;font&gt;</code> 요소로 바꿔 끼워요. React는 이걸 모른 채 원래 노드를 기준으로 “이 앞에 하트를 넣어라”(<code>insertBefore</code>)나 “이걸 지워라”(<code>removeChild</code>)를 시도해요. 기준 노드가 없으니 <b>NotFoundError</b>가 나고, 에러 바운더리가 없으면 앱 전체가 하얘져요.</p>
          <p><code>{'{liked && <Heart/>}'}좋아요 {'{n}'}</code>처럼 조건부 요소 바로 옆에 맨 글자가 있을 때 잘 터져요. 숫자도 React가 바꾼 건 떨어져 나간 노드라 화면엔 옛 값이 남아요.</p>
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
          <p>조건부 요소 옆의 글자는 span으로 감싸요. 번역기는 span 안만 바꾸고 React는 span을 기준으로 움직여서 부딪히지 않아요. 숫자·이름·코드처럼 번역하면 안 되는 곳엔 <code>translate="no"</code>(또는 <code>class="notranslate"</code>)를 붙여요.</p>
          <p>확장 프로그램은 종류가 끝없으니 구역별 에러 바운더리도 둬요. 관리 화면처럼 번역이 필요 없으면 <code>&lt;html translate="no"&gt;</code>도 방법이지만, 번역이 필요한 사용자까지 막게 돼요.</p>
        </>}
        prevent={[
          <>QA 때 Chrome 자동 번역을 켜고 장바구니·결제를 한 번 돌아요</>,
          <>에러 수집 도구에서 <code>NotFoundError</code>·<code>removeChild</code>·<code>insertBefore</code> 에러를 따로 묶어 봐요</>,
        ]}
        links={[['#/dev/debug/dbg-white', '10 보안 · 디버깅 · 하얀 화면']]}
      />

      <Issue id="br-timezone"
        demo={f => <TimezoneDemo fixed={f} />}
        demoNote={<>이 기기의 실제 시간대로 계산해요. 해외 시간대에서 열면 다른 시각에 날짜가 틀려요.</>}
        cause={<>
          <p>한국은 UTC보다 9시간 빨라요. 클라이언트가 <code>"2026-11-15T23:00:00"</code>처럼 오프셋 없는 시각을 보내고 서버가 이걸 UTC로 받아들이면, 한국 시간으로 보여 줄 때 9시간이 더해져 다음 날 아침 8시가 돼요.</p>
          <p>반대로 <code>toISOString().slice(0, 10)</code>으로 날짜를 자르면 UTC 날짜가 나와서, 한국에선 <b>새벽 0~9시에 쓴 글이 전날</b>로 묶여요. 개발 서버나 CI가 UTC면 둘 다 티가 안 나요.</p>
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
          <p>저장과 전송은 UTC(또는 오프셋을 포함한 ISO 문자열)로 하고, 보여 줄 때만 시간대를 바꿔요. DB 칼럼은 <code>timestamptz</code>처럼 시간대를 함께 저장하는 형식으로 둬요. 날짜를 사용자 기기 기준으로 자를지 서비스 기준(서울)으로 자를지는 기획 단계에서 정해 둬요.</p>
          <p>날짜 계산은 <code>Intl.DateTimeFormat</code>이나 시간대를 아는 라이브러리(date-fns-tz, Luxon, Temporal)에 맡겨요. 문자열을 직접 자르거나 9시간을 손으로 더하지 않아요.</p>
        </>}
        prevent={[
          <>테스트를 <code>TZ=America/New_York</code>와 <code>TZ=Asia/Seoul</code>로 두 번 돌려요. Playwright는 <code>timezoneId</code> 옵션을 써요</>,
          <>경계값: 23:59, 00:00, 08:59, 09:00, 월말·연말</>,
          <>API 명세에 날짜 필드는 ‘ISO 8601, 오프셋 필수’라고 적어요</>,
        ]}
      />

      <Issue id="br-ghost-click"
        demo={f => <GhostDemo fixed={f} />}
        demoNote={<>휴대폰으로 누르면 실제로 일어나요. 마우스에선 이런 일이 없어서, 손을 뗀 자리에 click이 한 번 더 떨어지는 걸 흉내 냈어요.</>}
        cause={<>
          <p>터치하면 브라우저는 <code>touchstart → touchend</code> 뒤에, 옛 사이트 호환용으로 같은 자리에 mouse 이벤트와 click을 한 번 더 보내요. 시트를 <code>touchend</code>에서 닫으면 이 click이 새로 드러난 아래 버튼에 떨어져요.</p>
          <p>예전엔 더블 탭 확대를 기다리느라 click이 300ms 늦게 와서 touchend를 많이 썼어요. 지금은 <code>width=device-width</code> 뷰포트가 있으면 그 지연이 없어요.</p>
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
          <p>버튼 동작은 <b>click 하나로</b> 처리해요. 눌리는 느낌이 필요하면 <code>pointerdown</code>에서 모양만 바꾸고 동작은 click에서 해요. Pointer Events는 마우스·터치·펜을 한 이벤트로 다뤄요.</p>
          <p>viewport 메타에 <code>width=device-width</code>를 두고, 확대가 필요 없는 버튼엔 <code>touch-action: manipulation</code>을 줘요. FastClick 같은 옛 라이브러리는 이제 빼도 돼요.</p>
        </>}
        prevent={[
          <>닫기 버튼은 닫히는 자리 아래에 다른 버튼이 있는 화면에서 실기기로 눌러 봐요</>,
          <><code>onTouchEnd</code>·<code>touchend</code> 사용처를 검색해 click으로 바꿔요</>,
        ]}
        links={[['#/gesture', '10 제스처']]}
      />

      <Issue id="br-gap"
        demo={f => <GapDemo fixed={f} />}
        demoNote={<>옛 엔진이 flex의 gap을 무시하는 모습을 흉내 냈어요. 간격은 화면에 그려진 카드 위치를 실제로 잰 값이에요.</>}
        cause={<>
          <p>Safari는 14.1(iOS 14.5)부터 flex 컨테이너의 <code>gap</code>을 지원해요. 그 전 버전은 gap을 무시해서 카드가 딱 붙어요. grid의 gap은 훨씬 전부터 지원돼서 괜찮아요.</p>
          <p><code>@supports (gap: 10px)</code>도 옛 Safari에서 <b>참</b>이 나와요. grid용 gap을 지원하기 때문이라, 이걸로는 flex gap 지원을 가려낼 수 없어요.</p>
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
          <p>지원 범위부터 정해요. <code>browserslist</code>에 실제 사용자 통계를 반영하고, 그 범위에 iOS 14.4 이하가 없으면 gap을 그냥 써요. 있다면 카드 격자를 grid + gap으로 바꾸는 게 가장 간단해요.</p>
          <p>flex가 꼭 필요하면 위 코드처럼 직접 그려 보고 margin 대체 규칙을 켜요. 한 줄짜리 목록이면 <code>{'> * + *'}</code>(올빼미 선택자)에 margin을 주는 방법도 있어요.</p>
        </>}
        prevent={[
          <><code>browserslist</code>와 Autoprefixer로 지원 범위를 코드에 박아 두고, <code>doiuse</code>나 Stylelint의 <code>plugin/no-unsupported-browser-features</code>로 경고를 받아요</>,
        ]}
      />

      <Issue id="br-safe-area"
        demo={f => <SafeAreaDemo fixed={f} />}
        demoNote={<>폰 화면을 흉내 냈어요. 실제 <code>env()</code> 값 대신 CSS 변수에 아이폰과 비슷한 값을 넣었고, 가려진 개수는 그려진 위치를 실제로 잰 값이에요.</>}
        cause={<>
          <p><code>viewport-fit=cover</code>를 주면 화면 끝까지 그릴 수 있는 대신, 노치(다이내믹 아일랜드)·상태 표시줄·홈 바 자리에 놓인 글자와 버튼이 가려져요. 브라우저는 그 자리 크기를 <code>env(safe-area-inset-top)</code> 같은 값으로 알려 주는데, 이걸 여백에 더하지 않은 게 원인이에요. 가로로 돌리면 왼쪽·오른쪽 값도 생겨요.</p>
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
          <p>헤더·탭 바·하단 고정 버튼처럼 <b>화면 끝에 붙는 공용 컴포넌트</b> 안에서 safe-area를 처리해요. 화면마다 챙기면 언젠가 빠뜨려요. <code>max()</code>로 감싸면 노치 없는 기기에선 원래 여백을 써요.</p>
          <p>끝까지 그릴 필요가 없으면 <code>viewport-fit=cover</code>를 빼도 돼요. iOS가 위험한 영역을 알아서 비워 둬요. 안드로이드도 화면 끝까지 그리는 경우가 늘어서 같은 값을 챙겨 두면 좋아요.</p>
        </>}
        prevent={[
          <>노치 있는 아이폰은 세로와 가로를 둘 다 테스트해요</>,
          <>Xcode 시뮬레이터의 Safari로 여러 기종을 봐요. 데스크톱 기기 모드는 safe-area 값이 0이에요</>,
          <>화면 코드에선 <code>position: fixed</code>를 직접 쓰지 않고, safe-area를 처리한 공용 헤더·탭 바를 써요</>,
        ]}
        ours={<>이 사이트는 <code>viewport-fit=cover</code>를 쓰지 않아서 iOS가 안전 영역 밖을 비워 두고, <code>env()</code>도 쓰지 않아요.</>}
        links={[['#/type/type-ios', '19 타이포그래피 · 입력창 16px 규칙'], ['#/layout/layout-sticky', '07 앱 화면 구성 · 고정 헤더']]}
      />
    </div>
  )
}
