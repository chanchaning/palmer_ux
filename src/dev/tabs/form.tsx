/* 07 폼 · 입력 */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './form.css'
import { AutofillDemo, ControlledDemo, DateDemo, DndDemo, DynamicDemo, EnterDemo, ImeDemo, KeyboardDemo, ResizeDemo, WheelDemo } from './form-demos'

export default function FormTab() {
  return (
    <div data-dev="form">
      <TabIntro>
        폼 버그는 대부분 <b>브라우저 기본 동작을 모르거나, 사람이 실제로 입력하는 방식을 테스트하지 않아서</b> 생겨요. 한글 입력기, 마우스 휠, Enter 연타, 파일 끌어 놓기처럼요.
        각 데모의 <b>문제 그대로 / 해결 적용</b> 스위치를 바꿔 가며 직접 입력해 보세요. 03 · 06은 브라우저가 하는 일을 흉내 낸 재현이에요.
      </TabIntro>

      <Issue id="fm-ime"
        demo={f => <ImeDemo fixed={f} />}
        demoNote={<>한글로 직접 쳐도 돼요. 자동 테스트는 한글 입력기를 쓸 수 없어서, ‘IME 흉내’ 버튼은 <code>compositionstart → keydown(isComposing) → compositionend → keydown</code> 순서의 이벤트를 진짜로 입력칸에 보내요.</>}
        cause={<>
          <p>한글은 자모를 모아 한 글자를 만드는 <Term k="IME" d="Input Method Editor. 자판 입력을 모아 한글·한자 같은 글자로 만들어 주는 입력기예요." /> 조합을 거쳐요. ‘요’를 조합하는 중에 Enter를 누르면 브라우저·OS에 따라 <b>keydown이 두 번</b> 와요. 한 번은 조합 중(<code>isComposing: true</code>, keyCode 229), 한 번은 조합이 끝난 뒤예요.</p>
          <p>첫 번째 Enter에서 바로 보내고 칸을 비우면, 입력기가 붙잡고 있던 ‘요’가 빈 칸에 확정돼요. 두 번째 Enter가 그걸 또 보내서 <b>마지막 글자만 한 번 더</b> 가요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<input value={text} onChange={e => setText(e.target.value)}
  onKeyDown={e => {
-   if (e.key === 'Enter') {
      send(text)
      setText('')
    }
  }} />`,
          good: `
<input value={text} onChange={e => setText(e.target.value)}
  onKeyDown={e => {
    if (e.key !== 'Enter') return
+   // 조합 중 Enter는 건너뛰어요 (사파리는 keyCode 229로 와요)
+   if (e.nativeEvent.isComposing || e.keyCode === 229) return
+   e.preventDefault()
    send(text)
    setText('')
  }} />`,
        }}
        root={<>
          <p>Enter로 무언가를 하는 입력칸(채팅, 검색, 태그 입력)은 <b>공용 훅 하나</b>로 만들어요. 예를 들어 <code>useEnterKey(onEnter)</code> 안에서 조합 검사를 하면 화면마다 빠뜨릴 일이 없어요.</p>
          <p><code>compositionstart</code> · <code>compositionend</code>로 조합 상태를 ref에 직접 들고 있어도 돼요. 검색어 자동 완성처럼 <b>입력마다 요청</b>하는 곳도 조합 중엔 요청을 미뤄요.</p>
        </>}
        prevent={[
          <>QA 시나리오에 <b>한글 · 일본어 입력기로 Enter</b> 치기를 넣어요 (맥 크롬 · 사파리, 윈도우 크롬)</>,
          <>린트 규칙이나 리뷰 기준으로 <code>key === 'Enter'</code>가 보이면 조합 검사가 있는지 봐요</>,
          <>E2E 테스트는 입력기를 못 쓰니 composition 이벤트 순서를 직접 보내는 테스트를 하나 둬요</>,
        ]}
        ours={<>상단 검색 창은 키 처리 맨 앞에서 <code>e.nativeEvent.isComposing</code>이면 그냥 돌아가요. 그래서 한글 검색어를 치고 Enter를 눌러도 한 번만 이동해요.</>}
        links={[['#/search/search-auto', '24 검색 · 자동완성']]}
      />

      <Issue id="fm-dynamic"
        demo={f => <DynamicDemo fixed={f} />}
        cause={<>
          <p>줄을 더하고 빼는 폼에서 에러를 <code>errors[i]</code>처럼 <b>순서(index)</b>로 들고 있으면, 2번째 줄을 지우는 순간 3번째 줄이 2번째 자리로 당겨지면서 <b>지운 줄의 에러를 물려받아요</b>.</p>
          <p><code>key={'{index}'}</code>도 같은 문제를 만들어요. React는 key가 같은 칸을 같은 칸으로 보니까, 비제어 입력값·포커스·애니메이션이 엉뚱한 줄에 남아요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- const [errors, setErrors] = useState<string[]>([])
const remove = (i: number) =>
  setRows(rows.filter((_, j) => j !== i))   // errors는 그대로

{rows.map((row, i) => (
- <Field key={i} value={row.name} error={errors[i]} />
))}`,
          good: `
+ type Row = { id: string; name: string }
+ const add = () => setRows([...rows, { id: crypto.randomUUID(), name: '' }])
+ const [errors, setErrors] = useState<Record<string, string>>({})
const remove = (id: string) => {
  setRows(rows.filter(r => r.id !== id))
+ setErrors(({ [id]: _, ...rest }) => rest)
}

{rows.map(row => (
+ <Field key={row.id} value={row.name} error={errors[row.id]} />
))}`,
        }}
        root={<>
          <p>배열 필드는 <b>react-hook-form의 <code>useFieldArray</code></b>처럼 검증까지 맡아 주는 도구를 써요. <code>fields</code>마다 붙는 <code>field.id</code>를 key로 쓰고, <code>remove(i)</code>가 값과 에러를 같이 옮겨 줘요. 스키마는 zod로 <code>z.array(z.object(…))</code>처럼 줄 단위로 적어요.</p>
          <p>직접 만든다면 줄마다 <b>바뀌지 않는 id</b>를 만들 때 붙이고, 값 · 에러 · touched를 모두 그 id로 묶어요.</p>
        </>}
        prevent={[
          <>테스트: <b>가운데 줄 지우기</b> 후 에러와 값이 제자리인지 확인해요</>,
          <><code>eslint-plugin-react</code>의 <code>no-array-index-key</code> 규칙을 켜요</>,
          <>에러 상태를 index 배열로 들고 있는 코드를 리뷰에서 막아요</>,
        ]}
        links={[['#/dev/framework/fw-key-index', 'FE 노트 · key에 배열 index 사용']]}
      />

      <Issue id="fm-autofill"
        demo={f => <AutofillDemo fixed={f} />}
        demoNote={<>브라우저 자동 완성은 페이지에서 실행할 수 없어서, 비밀번호 관리자가 칸을 고르는 방식을 단순하게 흉내 냈어요. 흉내 함수는 데모 칸의 실제 <code>type</code> · <code>autocomplete</code> · <code>form</code> 속성을 읽어요.</>}
        cause={<>
          <p>비밀번호 관리자는 비밀번호 칸을 찾으면 <b>그 바로 앞 글자 칸을 아이디 칸으로 짐작</b>해요. form 밖에 있는 칸들은 한 묶음으로 보기 때문에, 위쪽 검색창이 ‘아이디 칸’으로 뽑혀 내 이메일이 들어가요.</p>
          <p>그래서 <code>autocomplete="off"</code>를 붙여 보지만, 크롬 등은 <b>로그인 칸에선 off를 무시</b>해요. 재설정 페이지의 새 비밀번호 칸에 옛 비밀번호가 채워지는 것도 같은 이유예요.</p>
        </>}
        quick={{
          lang: 'HTML',
          bad: `
- <input type="text" name="q" autocomplete="off" placeholder="상품 검색">

- <input type="password" autocomplete="off">  <!-- 새 비밀번호 -->
- <input type="password" autocomplete="off">  <!-- 확인 -->`,
          good: `
+ <form role="search">
+   <input type="search" name="q" autocomplete="off" placeholder="상품 검색">
+ </form>

+ <form>
+   <!-- 어떤 계정인지 알려 주는 숨은 아이디 칸 -->
+   <input type="text" name="username" autocomplete="username" value="haneul@palmer.dev" hidden>
+   <input type="password" autocomplete="new-password">
+   <input type="password" autocomplete="new-password">
+ </form>

<!-- 로그인: username + current-password, 인증번호: one-time-code -->
<input type="text" inputmode="numeric" autocomplete="one-time-code">`,
        }}
        root={<>
          <p>자동 완성을 막으려 하지 말고 <b>정확한 토큰으로 알려 줘요</b>. 로그인은 <code>username</code> + <code>current-password</code>, 가입 · 변경은 <code>new-password</code>, 문자 인증은 <code>one-time-code</code>, 주소는 <code>postal-code</code> · <code>address-line1</code>처럼요.</p>
          <p>검색처럼 계정과 상관없는 칸은 <code>type="search"</code>와 계정스럽지 않은 name(<code>q</code>)을 쓰고, 로그인 칸과 <b>다른 form</b>에 넣어요.</p>
        </>}
        prevent={[
          <>로그인 · 가입 · 비밀번호 변경 화면에서 <b>실제 비밀번호 관리자</b>(크롬, 사파리 키체인)로 한 번씩 채워 봐요</>,
          <>폼 컴포넌트가 <code>autocomplete</code>를 필수 prop으로 받게 해요</>,
          <>크롬 개발자 도구 Issues 탭의 autocomplete 경고를 확인해요</>,
        ]}
      />

      <Issue id="fm-number-wheel"
        demo={f => <WheelDemo fixed={f} />}
        demoNote={<>진짜 <code>type="number"</code> 칸이에요. 크롬 · 엣지에서 칸을 누른 채 휠을 굴리면 값이 바뀌어요(브라우저 · 버전마다 달라요). ‘휠 3칸 흉내’는 터치 기기용으로, 브라우저가 휠마다 하는 <code>stepDown()</code>을 대신 불러요.</>}
        cause={<>
          <p><code>&lt;input type="number"&gt;</code>에 포커스가 있는 상태로 마우스가 그 위를 지나며 휠을 굴리면, 크롬 계열 브라우저는 페이지를 스크롤하는 대신 <b>값을 step만큼 올리거나 내려요</b>.</p>
          <p>사용자는 금액을 적고 아래 ‘송금’ 버튼으로 가려고 스크롤했을 뿐인데, 그사이 50,000원이 49,700원이 돼요. 값이 조금만 바뀌어서 <b>알아채기 어렵다</b>는 게 더 위험해요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- <input type="number" value={amount}
-   onChange={e => setAmount(e.target.value)} />`,
          good: `
// 금액 · 전화번호 · 카드번호는 '숫자 글자'예요
<input
+ type="text"
+ inputMode="numeric"      // 모바일은 숫자 자판
+ pattern="[0-9,]*"
  value={amount}
+ onChange={e => setAmount(toComma(e.target.value))} />

// 꼭 number를 써야 한다면: 휠이 오면 포커스를 풀어요
+ <input type="number" onWheel={e => e.currentTarget.blur()} />`,
        }}
        root={<>
          <p>위아래 화살표로 올리고 내릴 일이 없는 숫자(금액, 수량 대신 입력, 우편번호, 인증번호)는 <b>number가 아니에요</b>. <code>inputMode="numeric"</code>으로 자판만 숫자로 띄우고, 쉼표 표시와 검증은 직접 해요.</p>
          <p>react-number-format 같은 마스크 컴포넌트를 쓰면 쉼표 · 최대값 · 붙여넣기 정리를 한 번에 맞출 수 있어요. 마지막으로 <b>서버도 금액 범위를 검증</b>해요.</p>
        </>}
        prevent={[
          <>디자인 시스템의 숫자 입력 컴포넌트 하나만 쓰게 하고, <code>type="number"</code> 직접 사용은 린트로 경고해요</>,
          <>송금 · 결제 직전에 <b>금액 확인 화면</b>을 한 번 더 보여줘요</>,
          <>QA에서 숫자 칸에 포커스를 둔 채 스크롤하는 시나리오를 넣어요</>,
        ]}
      />

      <Issue id="fm-dnd"
        demo={f => <DndDemo fixed={f} />}
        demoNote={<>실제로 페이지를 떠나지 않도록 데모 바깥 틀과 window에서 <b>항상</b> 기본 동작을 막아 뒀어요. ‘문제 그대로’에서는 막지 않았다면 일어났을 일을 대신 보여줘요. 진짜 파일을 끌어다 놓아도 돼요.</>}
        cause={<>
          <p>브라우저는 파일을 창에 놓으면 <b>그 파일을 연다</b>가 기본 동작이에요. 드롭 구역이 그걸 막으려면 <code>dragover</code>에서 <code>preventDefault()</code>를 해야 해요. 이걸 빼먹으면 구역이 ‘놓을 수 없는 곳’이 돼서 <code>drop</code> 이벤트가 아예 안 와요.</p>
          <p>또 구역을 살짝 벗어나 놓아도 파일이 열려요. 그러면 페이지를 떠나면서 <b>작성 중이던 글이 사라져요</b>.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<div className="dropzone"
- onDrop={e => upload(e.dataTransfer.files)}>
  사진을 놓으세요
</div>`,
          good: `
<div className="dropzone"
+ onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
  onDrop={e => {
+   e.preventDefault()
    upload(e.dataTransfer.files)
  }}>
  사진을 놓으세요
</div>

// 구역 밖에 놓아도 열리지 않게 — 파일일 때만 막아요
+ useEffect(() => {
+   const guard = (e: DragEvent) => {
+     if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
+   }
+   window.addEventListener('dragover', guard)
+   window.addEventListener('drop', guard)
+   return () => { window.removeEventListener('dragover', guard); window.removeEventListener('drop', guard) }
+ }, [])`,
        }}
        root={<>
          <p>드롭 구역은 <b>react-dropzone</b> 같은 검증된 도구를 쓰면 dragover 처리, 파일 종류 · 크기 제한, 키보드로 고르기(<code>&lt;input type="file"&gt;</code> 연결)까지 같이 챙겨 줘요.</p>
          <p>업로드가 있는 화면은 window 가드를 앱 레벨에 한 번 두고, 작성 중인 글은 <b>이탈 경고</b>와 임시 저장으로 한 번 더 지켜요.</p>
        </>}
        prevent={[
          <>드롭 구역 테스트에 <b>구역 바로 바깥에 놓기</b>를 넣어요</>,
          <>window 가드는 <code>types.includes('Files')</code>일 때만 막아서 글자 · 링크 끌기는 그대로 둬요</>,
          <>파일 선택 버튼도 항상 같이 둬요 (터치 기기와 키보드 사용자)</>,
        ]}
        links={[['#/dev/routing/rt-dirty', 'FE 노트 · 작성 중 이탈 경고 없음']]}
      />

      <Issue id="fm-keyboard"
        demo={f => <KeyboardDemo fixed={f} />}
        demoNote={<>가상 폰 안에서 키보드를 흉내 냈어요. 실제 폰에서 진짜 키보드가 같이 뜨지 않게 입력칸에 <code>inputmode="none"</code>을 붙였어요. ‘해결 적용’은 visualViewport가 알려 주는 높이만큼 화면을 줄이고 누른 칸을 스크롤하는 방식을 따라 해요.</>}
        cause={<>
          <p>요즘 모바일 브라우저(iOS 사파리, 108 이후 안드로이드 크롬)는 키보드가 올라와도 <b>레이아웃 뷰포트는 그대로 두고</b> 보이는 영역(visual viewport)만 줄여요. 그래서 <code>height: 100vh</code> 앱 틀과 <code>position: fixed; bottom: 0</code> 버튼은 키보드 <b>뒤로 숨어요</b>.</p>
          <p><code>100dvh</code>도 답이 아니에요. dvh는 주소창이 늘고 줄어드는 것만 따라가고, 기본 설정에선 키보드 높이를 반영하지 않아요. 안쪽 스크롤 영역에 있는 입력칸은 브라우저가 알아서 올려 주지도 못해요.</p>
        </>}
        quick={{
          lang: 'TS · CSS',
          bad: `
.app { height: 100vh; }
- .pay-bar { position: fixed; bottom: 0; }
/* 키보드가 올라와도 아무것도 안 해요 */`,
          good: `
+ // 보이는 영역이 줄어든 만큼을 CSS 변수로
+ const vv = window.visualViewport
+ const sync = () => {
+   const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop)
+   document.documentElement.style.setProperty('--kb', kb + 'px')
+ }
+ vv?.addEventListener('resize', sync)
+ vv?.addEventListener('scroll', sync)

+ input.addEventListener('focus', () =>   // 키보드 애니메이션 뒤에
+   setTimeout(() => input.scrollIntoView({ block: 'center' }), 300))

.app { height: 100dvh; }           /* 주소창 변화 대응 */
+ .pay-bar { position: fixed; bottom: var(--kb, 0px); }

<!-- 안드로이드 크롬: 키보드만큼 레이아웃 자체를 줄여요 (사파리는 무시) -->
+ <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">`,
        }}
        root={<>
          <p>브라우저마다 다른 이 동작은 <b>visualViewport API</b>가 공통 답이에요. 키보드 높이를 CSS 변수로 내려 주는 훅을 앱에 하나 두고, 하단 고정 버튼 · 시트가 모두 그 값을 쓰게 해요.</p>
          <p>안드로이드 크롬만 대상이면 viewport 메타의 <code>interactive-widget=resizes-content</code>로 예전처럼 레이아웃이 줄게 할 수 있어요. 크롬의 <code>navigator.virtualKeyboard</code>(VirtualKeyboard API)와 <code>env(keyboard-inset-height)</code>도 있지만 크로미움 전용이에요.</p>
        </>}
        prevent={[
          <>QA 기기 목록에 <b>iOS 사파리 · 안드로이드 크롬 실기기</b>를 넣고, 맨 아래 입력칸을 눌러 봐요</>,
          <>입력칸 글자 크기는 <b>16px 이상</b>으로 둬요. 작으면 iOS가 화면을 확대해서 더 꼬여요</>,
          <>하단 고정 버튼은 공용 컴포넌트 하나로만 만들어 키보드 대응을 한곳에서 해요</>,
        ]}
        links={[['#/type/type-ios', '19 타이포그래피 · 입력창 16px 규칙'], ['#/dev/browser/br-100vh', 'FE 노트 · 100vh와 모바일 주소창']]}
      />

      <Issue id="fm-image-resize"
        demo={f => <ResizeDemo fixed={f} />}
        demoNote={<>캔버스로 4000×3000 사진을 진짜로 만들고(카메라 원본 대신 JPEG 0.95), ‘해결 적용’에선 실제로 1600px WebP 0.8로 줄여 용량과 시간을 재요. 업로드 시간은 LTE 업로드 10Mbps로 계산한 예상값이에요.</>}
        cause={<>
          <p>요즘 폰 카메라 사진은 <b>1,200만~4,800만 화소, 장당 3~10MB</b>예요. 게시글 사진은 보통 긴 변 1,000~2,000px이면 충분한데, 그대로 올리면 모바일 데이터로 몇 초씩 걸리고 실패도 잦아요.</p>
          <p>서버는 그 원본을 받아 저장하고, 썸네일을 만들려고 다시 디코딩해요. 트래픽 · 저장 비용 · 처리 시간이 <b>사진 장수만큼 곱해져요</b>.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
- const body = new FormData()
- body.append('photo', file)        // 4000×3000 · 6MB 그대로
await fetch('/api/photos', { method: 'POST', body })`,
          good: `
async function shrink(file: File, max = 1600) {
+ const bmp = await createImageBitmap(file)   // EXIF 회전 반영
+ const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
+ const c = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s))
+ c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
+ return c.convertToBlob({ type: 'image/webp', quality: 0.8 })
}

const body = new FormData()
+ body.append('photo', await shrink(file), 'photo.webp')
await fetch('/api/photos', { method: 'POST', body })`,
        }}
        root={<>
          <p>직접 만들기보다 <b>browser-image-compression</b>(웹 워커에서 압축 · 최대 크기 · 용량 목표 지정)이나 pica(고품질 축소)를 써요. 줄이는 동안에도 화면이 멈추지 않아요.</p>
          <p>서버는 어차피 <b>sharp 같은 도구로 다시 규격화</b>해요. 클라이언트 축소는 ‘업로드를 빠르게’, 서버 처리는 ‘저장 규격 보장’으로 역할을 나눠요. 원본이 꼭 필요하면 S3 presigned URL로 직접 올려 앱 서버를 거치지 않게 해요.</p>
        </>}
        prevent={[
          <>업로드 API에 <b>최대 용량(예: 10MB)과 최대 화소</b>를 정하고 넘으면 거절해요</>,
          <>QA 사진 샘플에 <b>최신 폰 원본 · HEIC · 세로 사진(EXIF 회전)</b>을 넣어요</>,
          <>업로드 지표(평균 용량, 실패율)를 대시보드로 봐요</>,
        ]}
        links={[['#/dev/perf/perf-lcp', 'FE 노트 · LCP 이미지 최적화 누락']]}
      />

      <Issue id="fm-date-typing"
        demo={f => <DateDemo fixed={f} />}
        cause={<>
          <p>날짜를 글자로 받으면 흔히 <code>/^\d{'{4}'}-\d{'{2}'}-\d{'{2}'}$/</code>와 ‘월 1~12, 일 1~31’까지만 검사해요. 그러면 <b>2월 31일, 4월 31일, 평년의 2월 29일</b>이 다 통과해요.</p>
          <p>그 값을 <code>new Date()</code>로 바꾸면 자바스크립트는 에러 대신 <b>다음 달로 조용히 넘겨요</b>. 2026-02-31은 3월 3일이 돼서, 사용자도 모르는 날짜로 예약이 잡혀요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
function isValid(s: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
- return m >= 1 && m <= 12 && d >= 1 && d <= 31
}`,
          good: `
function isValid(s: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
+ const dt = new Date(Date.UTC(y, m - 1, d))
+ // 넘어갔다면(2/31 → 3/3) 없는 날짜예요
+ return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// zod라면
+ z.string().date()   // 'YYYY-MM-DD' + 실제 있는 날짜만 (zod 4: z.iso.date())`,
        }}
        root={<>
          <p>날짜 검증은 직접 짜지 말고 <b>date-fns의 <code>isValid(parse(s, 'yyyy-MM-dd', new Date()))</code></b>나 zod의 <code>z.string().date()</code>처럼 달력을 아는 도구로 해요. 둘 다 2월 31일을 거절해요.</p>
          <p>입력은 <b>마스크(자동 하이픈) + 달력 고르기</b>를 같이 주고, 서버도 같은 규칙으로 한 번 더 검사해요. DB 날짜 타입이 마지막 방어선이에요.</p>
        </>}
        prevent={[
          <>날짜 검증 테스트에 <b>2/29(윤년 · 평년), 2/30, 4/31, 13월</b>을 고정으로 넣어요</>,
          <>날짜 문자열을 <code>new Date(s)</code>로 바로 바꾸는 코드를 리뷰에서 막아요 (브라우저마다 결과도 달라요)</>,
        ]}
        links={[['#/date/date-input', '26 날짜 · 날짜 입력']]}
      />

      <Issue id="fm-enter-submit"
        demo={f => <EnterDemo fixed={f} />}
        demoNote={<>주문 API는 150ms 뒤 서버에 들어가고 1.2초 뒤 응답하는 가짜예요. ‘연타 흉내’는 문제 모드에선 입력칸에 Enter keydown을, 해결 모드에선 Enter가 일으키는 폼 제출(<code>requestSubmit()</code>)을 60ms 간격으로 5번 보내요.</>}
        cause={<>
          <p>중복 주문을 막으려고 <b>버튼에만 <code>disabled</code></b>를 걸어 두는 경우가 많아요. 그런데 입력칸에 직접 단 <code>onKeyDown</code> Enter 처리는 버튼 상태와 상관없이 매번 주문 함수를 불러요.</p>
          <p>폼 기본 Enter 제출도 안심할 수 없어요. 검증 같은 <code>await</code> 뒤에야 로딩 상태를 켜면, 그 사이 들어온 Enter가 <b>모두 제출</b>돼요. 막는 곳은 버튼이 아니라 <b>제출 함수 입구</b>여야 해요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
<input onKeyDown={e => {
- if (e.key === 'Enter') order()      // 버튼 상태와 상관없이
}} />
- <button disabled={pending} onClick={order}>주문하기</button>

async function order() {
  setPending(true)
  await api.post('/orders', cart)
  setPending(false)
}`,
          good: `
+ const inFlight = useRef(false)

+ <form onSubmit={e => { e.preventDefault(); order() }}>
  <input name="receiver" />
+ <button type="submit" disabled={pending}>주문하기</button>
</form>

async function order() {
+ if (inFlight.current) return       // ✓ 입구에서 한 번만
+ inFlight.current = true
  setPending(true)
  try {
+   await api.post('/orders', cart, { headers: { 'Idempotency-Key': orderKey } })
  } finally {
+   inFlight.current = false
    setPending(false)
  }
}`,
        }}
        root={<>
          <p>제출은 <b><code>&lt;form onSubmit&gt;</code> 한 곳</b>으로 모아요. Enter · 클릭 · 단축키가 모두 같은 함수로 들어오고, 그 입구에서 ref로 막아요. TanStack Query의 <code>useMutation</code>을 쓴다면 <code>isPending</code>일 때 <code>mutate</code>를 부르지 않게 해요.</p>
          <p>끝까지 막는 건 서버예요. 주문 화면을 열 때 만든 <b>Idempotency-Key</b>를 같이 보내서, 같은 키로 온 두 번째 요청은 첫 결과를 그대로 돌려주게 해요.</p>
        </>}
        prevent={[
          <>E2E 테스트에 <b>Enter 빠르게 5번</b>과 <b>버튼 더블 클릭</b>을 넣고 생성된 주문이 1건인지 봐요</>,
          <>입력칸에 직접 단 <code>key === 'Enter'</code> 제출 코드를 리뷰에서 막아요</>,
          <>결제 · 주문 API는 멱등 키 없이는 받지 않게 해요</>,
        ]}
        links={[['#/button-state/bstate-loading', '28 버튼 상태 · 로딩'], ['#/dev/network/net-double', 'FE 노트 · 저장 연타로 중복 호출']]}
      />

      <Issue id="fm-controlled"
        demo={f => <ControlledDemo fixed={f} />}
        demoNote={<>실제 React 체크박스예요. 문제 모드는 경고가 뜨지 않는 혼용(<code>defaultChecked</code> + 상태)이라 콘솔은 조용해요. ‘따라 눌러 보기’는 진짜 클릭을 순서대로 보내요.</>}
        cause={<>
          <p><b>제어 컴포넌트</b>는 React 상태가 화면 값을 정하고, <b>비제어 컴포넌트</b>는 DOM이 스스로 값을 들고 있어요. <code>defaultChecked</code>는 ‘처음 한 번’만 쓰여서, 사용자가 한 번 누른 칸은 나중에 상태가 바뀌어도 <b>따라오지 않아요</b>. ‘전체 동의’를 풀었는데 개인정보 칸만 체크된 채 남는 이유예요.</p>
          <p>반대로 <code>checked</code>만 주고 <code>onChange</code>가 없으면 눌러도 안 바뀌고, <code>value</code>가 <code>undefined</code>였다가 값이 생기면 ‘uncontrolled → controlled’ 경고가 떠요. 경고는 개발 모드에만 나와서 운영에선 조용히 틀려요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- <input type="checkbox" defaultChecked={agree.privacy}
-   onChange={e => set({ ...agree, privacy: e.target.checked })} />

- <input type="checkbox" checked={agree.ads} />   // onChange 없음 → 안 눌려요
- <input value={user?.nickname} onChange={…} />   // undefined → 값: 경고`,
          good: `
+ <input type="checkbox" checked={agree.privacy}
+   onChange={e => set({ ...agree, privacy: e.target.checked })} />

+ <input type="checkbox" checked={agree.ads}
+   onChange={e => set({ ...agree, ads: e.target.checked })} />
+ <input value={user?.nickname ?? ''} onChange={…} />   // 처음부터 문자열

// 비제어로 가려면 끝까지 비제어로 — 초기화는 key를 바꿔 다시 그려요
+ <form key={resetKey}><input name="memo" defaultValue={memo} /></form>`,
        }}
        root={<>
          <p>입력칸마다 <b>제어 / 비제어를 하나로 정해요</b>. 값이 다른 칸에 영향을 주면(전체 동의, 계산 필드) 제어로, 긴 폼의 단순 입력은 react-hook-form처럼 비제어 + <code>register</code>로 통일해요. 제어로 바꿔야 할 칸만 RHF의 <code>Controller</code>로 감싸요.</p>
          <p>초기값이 비동기로 오면 <b>값이 올 때까지 폼을 그리지 않거나</b>, RHF의 <code>reset(data)</code>로 한 번에 넣어요.</p>
        </>}
        prevent={[
          <>개발 모드 콘솔의 <b>controlled / uncontrolled 경고를 에러로 취급</b>해요 (테스트에서 <code>console.error</code>가 나오면 실패)</>,
          <>한 입력에 <code>checked</code>와 <code>defaultChecked</code>(또는 <code>value</code>와 <code>defaultValue</code>)를 같이 주지 않아요</>,
          <>‘전체 선택’ 같은 연결된 칸은 테스트에서 화면 체크 상태까지 확인해요</>,
        ]}
        links={[['#/dev/state/state-form', 'FE 노트 · 입력마다 전체 폼 리렌더']]}
      />
    </div>
  )
}
