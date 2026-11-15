/* 04 네트워크 · API */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './network.css'
import { DoubleDemo, GraphqlDemo, InterceptorDemo, LocalDeviceDemo, OfflineDemo, RefreshDemo, RetryDemo, SchemaDemo, SseLimitDemo, WsDemo } from './network-demos'

const SIM = '이 데모 안의 가짜 서버로 만든 시뮬레이션이에요. 진짜 주소로는 요청을 보내지 않아요.'

export default function NetworkTab() {
  return (
    <div data-dev="network">
      <TabIntro>
        네트워크 문제는 대부분 <b>‘요청은 늘 한 번에, 제때, 약속한 모양으로 온다’</b>고 믿는 데서 생겨요. 실제로는 겹치고, 끊기고, 늦고, 모양이 바뀌어요.
        모든 데모는 <b>이 페이지 안의 가짜 서버</b>로 돌아가요. 진짜 주소로는 아무 요청도 보내지 않아요(07의 BroadcastChannel과 08의 온라인 상태는 브라우저의 진짜 기능이에요).
      </TabIntro>

      <Issue id="net-local-device"
        demo={f => <LocalDeviceDemo fixed={f} />}
        demoNote={<>{SIM} 오류 이름은 Chrome 개발자 도구에 실제로 찍히는 이름이에요.</>}
        cause={<>
          <p>HTTPS 페이지에서 <code>http://</code> 주소를 부르면 브라우저가 <b>Mixed Content</b>로 막아요. 매장 저울·프린터·키오스크는 대부분 사내망 IP(<code>192.168.x.x</code>)에 http로만 열려 있어서, 개발할 땐 되던 연결이 운영 HTTPS에서 막혀요. <code>ws://</code>도 똑같아요.</p>
          <p>기기를 https로 열어도 기기가 <b>스스로 만든 인증서</b>라 브라우저가 믿지 않고, 통과해도 기기가 <Term k="CORS" d="다른 주소(origin)의 응답을 페이지가 읽어도 되는지, 서버가 응답 헤더로 허락하는 규칙이에요." /> 헤더를 안 주면 응답을 읽지 못해요. 게다가 브라우저는 공개 사이트가 사설망 기기에 닿는 것 자체를 점점 더 엄격하게 막는 쪽으로 바뀌고 있어요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
// https://pos.example 에서 실행돼요
- const res = await fetch('http://192.168.0.20/weight')   // Mixed Content로 차단
- const ws = new WebSocket('ws://192.168.0.20:81')        // 이것도 차단
const { grams } = await res.json()`,
          good: `
// 매장 PC에 설치한 로컬 에이전트 — 믿을 수 있는 인증서로 HTTPS를 열어요
+ const AGENT = 'https://agent.pos.example:8443'   // DNS가 127.0.0.1을 가리켜요

try {
+ const res = await fetch(\`\${AGENT}/scale/weight\`, {
+   headers: { Authorization: \`Bearer \${agentToken}\` },
+   signal: AbortSignal.timeout(3000),
+ })
  const { grams } = await res.json()
} catch {
+ showAgentGuide()   // 에이전트가 없거나 꺼졌을 때 설치·재시작 안내
}

// 에이전트 응답 헤더 — 우리 사이트만 허락해요
// Access-Control-Allow-Origin: https://pos.example`,
        }}
        root={<>
          <p><b>로컬 에이전트</b>를 둬요. 매장 PC에 작은 프로그램을 설치해서 믿을 수 있는 인증서로 HTTPS·WSS를 열고, 기기와는 시리얼·LAN으로 대화해요. 인증서는 에이전트마다 따로 발급하거나, 관리하는 PC라면 MDM으로 사내 루트 인증서를 깔아요. 개인 키를 모든 설치본에 똑같이 넣으면 안 돼요.</p>
          <p>설치가 어렵다면 <b>클라우드 중계</b>가 가장 덜 막혀요. 기기(또는 에이전트)가 서버로 나가는 연결(MQTT·WebSocket)을 맺고, 웹은 서버 API만 불러요. USB·블루투스로 바로 붙은 기기라면 WebSerial·WebUSB·WebHID·Web Bluetooth도 있지만 Chromium 계열 브라우저에서만 돼요.</p>
          <p>브라우저 정책도 바뀌는 중이에요. Chrome은 사설망 요청 앞에 사전 요청을 넣는 Private Network Access 계획을 거쳐, 지금은 사이트가 로컬 네트워크에 접근할 때 <b>사용자 권한을 묻는 방식(Local Network Access)</b>으로 옮겨 가고 있어요. <code>127.0.0.1</code>로 가는 요청도 대상이 될 수 있어요. 상태가 자주 바뀌니 대상 브라우저의 최신 문서를 꼭 확인해요.</p>
        </>}
        prevent={[
          <>개발도 <b>운영과 같은 HTTPS 도메인</b>(스테이징)에서 기기 연결을 시험해요. <code>http://localhost</code> 개발로는 안 드러나요</>,
          <>에이전트가 없거나 꺼졌을 때의 <b>안내 화면</b>(설치 링크, 재시작 방법)을 기능 명세에 넣어요</>,
          <>에이전트 CORS는 <code>*</code> 대신 <b>우리 origin만</b> 허락하고, 토큰 없이는 응답하지 않게 해요</>,
        ]}
      />

      <Issue id="net-refresh"
        demo={f => <RefreshDemo fixed={f} />}
        demoNote={<>{SIM} 서버는 리프레시 토큰을 한 번 쓰면 새 것으로 바꾸고, 이미 쓴 토큰이 다시 오면 전부 폐기해요.</>}
        cause={<>
          <p>액세스 토큰이 만료된 순간 화면이 요청 5개를 한꺼번에 보내면, 5개가 다 401을 받고 <b>각자 토큰 갱신을 시작</b>해요. 다섯 개 모두 같은 리프레시 토큰을 들고 가요.</p>
          <p>서버가 <Term k="리프레시 토큰 회전" d="리프레시 토큰을 한 번 쓰면 새 것으로 바꿔 주고, 쓴 건 버리는 방식이에요. 훔친 토큰을 오래 못 쓰게 해요." />을 쓰면, 첫 갱신 뒤 나머지 4개는 <b>이미 쓴 토큰을 다시 보내는</b> 셈이에요. 서버는 이걸 탈취로 보고 모든 토큰을 끊어서, 사용자는 갑자기 로그아웃돼요.</p>
        </>}
        quick={{
          lang: 'axios',
          bad: `
api.interceptors.response.use(undefined, async error => {
  if (error.response?.status !== 401) throw error
- // 401마다 각자 갱신해요 — 동시에 5개면 5번
- const { data } = await axios.post('/auth/refresh', { refreshToken: getRefresh() })
  setTokens(data)
  error.config.headers.Authorization = \`Bearer \${data.accessToken}\`
  return api(error.config)
})`,
          good: `
+ let refreshing: Promise<string> | null = null
+ function refreshOnce() {          // 갱신은 동시에 하나만
+   refreshing ??= axios.post('/auth/refresh', { refreshToken: getRefresh() })
+     .then(({ data }) => { setTokens(data); return data.accessToken })
+     .finally(() => { refreshing = null })
+   return refreshing
+ }

api.interceptors.response.use(undefined, async error => {
  const cfg = error.config
  if (error.response?.status !== 401 || cfg._retried) throw error
+ cfg._retried = true
+ const sent = cfg.headers.Authorization
+ const token = sent === \`Bearer \${getAccess()}\`
+   ? await refreshOnce()   // 줄 서서 같은 결과를 기다려요
+   : getAccess()           // 그새 누가 갱신했으면 바로 재시도
  cfg.headers.Authorization = \`Bearer \${token}\`
  return api(cfg)
})`,
        }}
        root={<>
          <p>토큰 갱신은 <b>인증 모듈 한 곳</b>에서만, <b>한 번에 하나</b>만 해요(single-flight). 나머지 요청은 그 결과를 기다렸다 다시 보내요. 만료 시각(<code>exp</code>)을 보고 만료 30초쯤 전에 미리 갱신하면 401 자체가 줄어요.</p>
          <p>탭이 여러 개면 탭끼리도 겹쳐요. <code>navigator.locks.request('token-refresh', …)</code>(Web Locks)로 한 탭만 갱신하고, 새 토큰은 <code>BroadcastChannel</code>로 나눠요. 서버 쪽은 재사용 감지에 몇 초의 <b>유예 시간</b>을 두면 네트워크 재전송 같은 정상 중복을 살릴 수 있어요.</p>
        </>}
        prevent={[
          <>테스트: 토큰을 만료시킨 뒤 <b>요청 여러 개를 동시에</b> 보내고 갱신 호출이 1번인지 확인해요</>,
          <>갱신 실패 시 로그아웃은 <b>한 번만</b> 일어나게 하고, 로그아웃 이유를 로그로 남겨요</>,
          <>탭 두 개를 열어 둔 채 토큰 만료를 지나 보는 시나리오를 QA에 넣어요</>,
        ]}
      />

      <Issue id="net-retry"
        demo={f => <RetryDemo fixed={f} />}
        demoNote={<>{SIM} 실패는 고른 실패율대로 무작위로 일어나서 누를 때마다 결과가 조금씩 달라요. 기다리는 시간은 실제보다 줄였어요.</>}
        cause={<>
          <p>모바일 망이나 배포 순간에는 요청이 <b>잠깐</b> 실패하는 일이 흔해요(시간 초과, 502·503). 한 번 실패했다고 바로 포기하면 사용자에겐 빈 화면만 남아요.</p>
          <p>반대로 실패하자마자 <b>같은 간격으로 계속</b> 다시 보내면, 막 살아나려는 서버에 모든 사용자가 같은 순간 몰려 다시 쓰러뜨려요. 그래서 간격을 점점 늘리고(<Term k="지수 백오프" d="다시 시도할 때마다 기다리는 시간을 두 배씩 늘리는 방식이에요." />), 무작위로 흩어요(<Term k="지터" d="기다리는 시간에 무작위 값을 섞어서, 여러 사용자의 재시도가 한순간에 몰리지 않게 하는 것이에요." />).</p>
        </>}
        quick={{
          lang: 'TanStack Query',
          bad: `
const { data } = useQuery({
  queryKey: ['products'], queryFn: getProducts,
- retry: false,
})
- // 실패하면 data가 없어서 빈 화면
return <ul>{data?.map(p => <li key={p.id}>{p.name}</li>)}</ul>`,
          good: `
const q = useQuery({
  queryKey: ['products'], queryFn: getProducts,
+ retry: (n, err) => n < 3 && isRetriable(err),   // 5xx·네트워크만. 4xx는 다시 안 해요
+ retryDelay: n => Math.random() * Math.min(8000, 500 * 2 ** n),   // 백오프 + 지터
})
+ if (q.isPending) return <ListSkeleton />
+ if (q.isError && !q.data) return <ErrorState onRetry={() => q.refetch()} />
return <>
+ {q.isError && <StaleBanner onRetry={() => q.refetch()} />}   {/* 옛 데이터 + 안내 */}
  <ProductList items={q.data} />
</>`,
        }}
        root={<>
          <p>재시도 정책은 <b>API 클라이언트 한 곳</b>에 둬요. 기본은 GET처럼 여러 번 보내도 안전한 요청만, 5xx와 네트워크 오류만, 최대 횟수와 최대 간격을 정해서 해요. 서버가 <code>Retry-After</code>를 주면 그 값을 따라요. TanStack Query는 기본으로 3번 다시 시도하고 간격을 늘리지만 지터는 넣지 않아요.</p>
          <p>그래도 실패하면 <b>대체 UI</b>를 보여줘요. 마지막으로 받은 데이터 + ‘최신이 아니에요’ 안내 + 다시 시도 버튼이 빈 화면보다 훨씬 나아요. 장애가 길면 서버 쪽 서킷 브레이커가 요청을 빨리 끊어 줘요.</p>
        </>}
        prevent={[
          <>목업 서버(MSW 등)로 <b>503을 섞어 주는 모드</b>를 만들어 두고 화면을 한 번씩 봐요</>,
          <>모든 목록·상세 화면에 <b>로딩 · 오류 · 빈 상태</b> 세 가지가 있는지 리뷰에서 확인해요</>,
          <>POST를 재시도할 땐 멱등 키가 있는지 먼저 확인해요(아래 04)</>,
        ]}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면 (UX)'], ['#/dash/fe', '관제 대시보드 · FE 구현 (재연결 백오프)']]}
      />

      <Issue id="net-double"
        demo={f => <DoubleDemo fixed={f} />}
        demoNote={<>저장 버튼은 진짜 버튼이고, 서버는 이 데모 안의 가짜예요. 응답은 일부러 1초쯤 늦게 와요.</>}
        cause={<>
          <p>저장 버튼은 요청이 끝날 때까지 <b>다시 누를 수 있는 상태</b>로 남기 쉬워요. 응답이 1초만 늦어도 사용자는 안 눌린 줄 알고 또 눌러요. 서버는 요청마다 새 글을 만들어요.</p>
          <p>버튼만 막아서는 다 못 막아요. 응답이 오는 길에 끊겨 <b>자동 재전송</b>이 일어나면, 서버엔 이미 저장됐는데 한 번 더 보내요. 그래서 서버가 ‘같은 요청’임을 알아볼 표시, <Term k="멱등 키" d="Idempotency-Key. 요청마다 붙이는 고유한 값이에요. 서버는 같은 키가 다시 오면 새로 처리하지 않고 처음 결과를 돌려줘요." />가 필요해요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
- async function onSave() {
-   await api.post('/posts', form)
    toast('저장됐어요')
  }
- <button onClick={onSave}>저장</button>`,
          good: `
+ const [key] = useState(() => crypto.randomUUID())   // 글 하나에 키 하나
+ const busy = useRef(false)
const [saving, setSaving] = useState(false)

async function onSave() {
+ if (busy.current) return          // 같은 순간의 두 번째 클릭도 막아요
+ busy.current = true; setSaving(true)
  try {
+   await api.post('/posts', form, { headers: { 'Idempotency-Key': key } })
    toast('저장됐어요')
  } finally { busy.current = false; setSaving(false) }
}
+ <button onClick={onSave} disabled={saving} aria-busy={saving}>
  {saving ? '저장 중…' : '저장'}
</button>`,
        }}
        root={<>
          <p>화면과 서버 <b>두 겹</b>으로 막아요. 화면은 진행 중 잠금 + 로딩 버튼, 서버는 <code>Idempotency-Key</code>를 일정 기간 저장해 두고 같은 키면 처음 응답을 그대로 돌려줘요. 이 헤더는 IETF에서 표준 초안으로 다듬는 중이고, Stripe 같은 결제 API가 오래 써 온 방식이에요.</p>
          <p>같은 키에 다른 내용이 오면 거절(422 등)하고, DB에도 유니크 제약(예: 주문 번호)을 둬서 마지막 방어선을 만들어요. 버튼 쪽은 <code>loading</code>을 받는 공용 버튼 하나로 통일해요.</p>
        </>}
        prevent={[
          <>E2E 테스트에서 저장 버튼을 <code>dblclick()</code>하고 생긴 글이 1개인지 확인해요</>,
          <>API 명세에 ‘만드는 요청(POST)은 멱등 키 필수’를 적어요</>,
          <>느린 3G로 저장 · 결제 버튼을 연타하는 QA를 해요</>,
        ]}
        links={[['#/button-state/bstate-loading', '28 버튼 상태 · 로딩'], ['#/loading/loading-optimistic', '14 로딩 패턴 · 낙관적 UI']]}
      />

      <Issue id="net-graphql-n1"
        demo={f => <GraphqlDemo fixed={f} />}
        demoNote={<>{SIM} 지연 시간은 예시 값이고, 보기 쉽게 2배 느리게 재생해요. 막대 하나가 HTTP 요청 하나예요.</>}
        cause={<>
          <p>목록 쿼리가 작성자 id만 주고 이름은 안 주면(<b>Under-fetching</b>), 화면의 줄마다 작성자 쿼리를 따로 보내요. 글 12개면 요청이 1 + 12개. 이게 화면 쪽의 <Term k="N+1" d="목록 1번을 가져온 뒤, 항목마다 1번씩 N번을 더 가져오는 모양이에요. 항목이 늘수록 요청이 같이 늘어요." />이에요.</p>
          <p>쿼리를 하나로 합쳐도 서버 리졸버가 글마다 DB를 따로 부르면, 이번엔 <b>서버 안에서</b> N+1이 생겨요. 요청 수는 줄었는데 DB는 그대로 힘들어요.</p>
        </>}
        quick={{
          lang: 'GraphQL · TypeScript',
          bad: `
const POSTS = gql\`{ posts { id title authorId } }\`

function PostRow({ post }) {
- // 줄마다 작성자 쿼리 — 글 N개면 요청 N개 더
- const { data } = useQuery(AUTHOR, { variables: { id: post.authorId } })
  return <li>{post.title} · {data?.author.name}</li>
}`,
          good: `
// 화면: 필요한 걸 한 쿼리에
+ const POSTS = gql\`{ posts(first: 20) { id title author { id name } } }\`

// 서버: 같은 틱에 모인 id를 한 번에 (요청마다 새로 만들어요)
+ const authorLoader = new DataLoader(async (ids: readonly string[]) => {
+   const rows = await db.user.findMany({ where: { id: { in: [...ids] } } })
+   return ids.map(id => rows.find(r => r.id === id) ?? null)
+ })

const resolvers = { Post: {
+ author: (post, _args, ctx) => ctx.loaders.author.load(post.authorId),
} }`,
        }}
        root={<>
          <p>화면은 <b>프래그먼트를 컴포넌트 옆에</b> 둬요(Relay, Apollo의 fragment). 줄 컴포넌트는 필요한 필드를 프래그먼트로 선언만 하고, 목록 쿼리가 그걸 모아 <b>한 번에</b> 요청해요. 줄 컴포넌트가 직접 쿼리를 보내지 않게 돼요.</p>
          <p>서버는 관계 필드마다 <b>DataLoader</b>로 모아 불러요. 로더는 요청마다 새로 만들어야 다른 사용자 데이터가 캐시에 섞이지 않아요. 쿼리 깊이·복잡도 제한으로 지나치게 큰 쿼리도 막아요.</p>
        </>}
        prevent={[
          <>개발 모드에서 화면 하나가 보낸 <b>GraphQL 요청 수</b>를 세고, 기준(예: 3개)을 넘으면 경고해요</>,
          <>서버 테스트에서 요청 하나당 <b>DB 쿼리 수</b>를 재고 기준을 넘으면 실패시켜요</>,
          <>목록 줄 컴포넌트 안의 <code>useQuery</code>를 리뷰에서 막아요</>,
        ]}
      />

      <Issue id="net-ws"
        demo={f => <WsDemo fixed={f} />}
        demoNote={<>{SIM} 서버는 0.4초마다 순서 번호가 붙은 값을 보내고, 최근 값을 보관해 둬요.</>}
        cause={<>
          <p>웹소켓은 끊겨도 <b>스스로 다시 연결하지 않아요</b>. 재연결을 만들어도, 연결 직후 보내던 <b>구독 메시지를 다시 안 보내면</b> 화면엔 ‘연결됨’이 떠 있는데 값은 안 와요.</p>
          <p>다시 붙어도 끊긴 동안의 이벤트는 사라져요. 서버가 이벤트마다 <b>순서 번호(seq)</b>를 붙이고, 화면이 ‘마지막으로 받은 번호 이후’를 다시 달라고 해야 빈 구간이 메워져요. 끊김을 빨리 알아채려면 하트비트도 필요해요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
function connect() {
  const ws = new WebSocket(URL)
  ws.onmessage = e => render(JSON.parse(e.data))
- ws.onclose = () => setTimeout(connect, 1000)   // 1초마다 똑같이
  return ws
}
const ws = connect()
- ws.onopen = () => ws.send(sub('line-3'))       // 첫 연결에서만 구독`,
          good: `
let lastSeq = 0, tries = 0
function connect() {
  const ws = new WebSocket(URL)
+ ws.onopen = () => {                  // 연결될 때마다 다시 구독 + 이어 받기
+   tries = 0
+   ws.send(JSON.stringify({ type: 'sub', topic: 'line-3', since: lastSeq }))
+ }
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
+   if (m.seq <= lastSeq) return       // 다시 받은 중복은 버려요
    lastSeq = m.seq; render(m)
  }
  ws.onclose = () => {
+   const wait = Math.random() * Math.min(30_000, 500 * 2 ** tries++)
    setTimeout(connect, wait)          // 백오프 + 지터
  }
}`,
        }}
        root={<>
          <p>연결 관리는 <b>공용 모듈 하나</b>에 모아요. 재연결(백오프 + 지터), 하트비트, 재구독, <code>since</code>로 이어 받기, 끊김 배너까지 한 곳에서 처리하고 화면은 구독만 해요. Socket.IO를 쓴다면 재연결은 기본이고, 이어 받기는 ‘connection state recovery’ 옵션을 켜야 해요.</p>
          <p>서버가 보관한 범위보다 오래 끊겼으면 이어 받기를 포기하고 <b>REST로 최신 스냅숏</b>을 다시 받아요. 서버가 보내기만 하는 화면이면 재연결과 <code>Last-Event-ID</code>가 표준에 들어 있는 SSE가 더 간단해요.</p>
        </>}
        prevent={[
          <>개발자 도구 Network의 ‘Offline’으로 10초 끊었다 살려서 <b>놓친 값이 채워지는지</b> 확인해요</>,
          <>메시지마다 seq가 있는지, 서버가 최근 몇 분을 보관하는지 API 명세에 적어요</>,
          <>‘연결됨’인데 N초 동안 메시지가 없으면 경고하는 감시를 둬요</>,
        ]}
        links={[['#/dash/fe', '관제 대시보드 · FE 구현 (폴링 · SSE · 웹소켓 비교)']]}
      />

      <Issue id="net-sse-limit"
        demo={f => <SseLimitDemo fixed={f} />}
        demoNote={<>연결 자리는 시뮬레이션이에요. ‘리더 탭’ 방식에서 다른 탭으로 알림을 나눠 주는 건 이 데모 이름으로 연 <b>진짜 BroadcastChannel</b>이에요.</>}
        cause={<>
          <p>HTTP/1.1에서 브라우저는 <b>한 도메인에 동시 연결을 6개</b>까지만 열어요. 이 한도는 탭마다가 아니라 <b>브라우저 전체</b>에 걸려요.</p>
          <p>SSE는 연결 하나를 계속 붙잡고 있어서, 탭 6개가 각자 SSE를 열면 자리가 꽉 차요. 그 뒤로는 어느 탭이든 같은 도메인으로 가는 API 요청이 <b>자리가 날 때까지 줄을 서요</b>. 그래서 ‘모든 API가 멈춘’ 것처럼 보여요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
// 탭마다 실행돼요 — 탭 6개면 연결 6개
- const es = new EventSource('/api/notices/stream')
es.onmessage = e => showNotice(JSON.parse(e.data))`,
          good: `
+ const bc = new BroadcastChannel('notices')
bc.onmessage = e => showNotice(e.data)     // 다른 탭이 나눠 준 알림

// 리더 탭 하나만 연결해요. 리더가 닫히면 다음 탭이 잠금을 이어받아요
+ navigator.locks.request('notices-leader', () => new Promise(() => {
+   const es = new EventSource('/api/notices/stream')
+   es.onmessage = e => {
+     const data = JSON.parse(e.data)
+     showNotice(data)
+     bc.postMessage(data)                 // 나머지 탭에 나눠 줘요
+   }
+ }))`,
        }}
        root={<>
          <p>가장 확실한 건 서버를 <b>HTTP/2 이상</b>으로 바꾸는 거예요. 연결 하나에 여러 요청을 동시에 흘려서(멀티플렉싱) 탭이 많아도 막히지 않아요. 동시 스트림 수는 서버 설정이 정하는데 보통 100개쯤이에요. 개발자 도구 Network의 Protocol 열이 <code>h2</code>·<code>h3</code>인지 확인해요.</p>
          <p>그와 함께 <b>연결은 탭 전체에서 하나</b>만 둬요. Web Locks로 리더를 뽑고 BroadcastChannel로 나누거나, SharedWorker가 연결을 들고 있게 해요(안드로이드 Chrome은 SharedWorker를 지원하지 않아요). 숨겨진 탭에서는 연결을 닫는 것도 방법이에요.</p>
        </>}
        prevent={[
          <>QA 시나리오에 <b>같은 사이트 탭 7개 열기</b>를 넣어요</>,
          <>스테이징·운영의 프로토콜이 HTTP/2인지 배포 체크리스트에 넣어요(사내 프록시가 1.1로 낮추는 경우가 있어요)</>,
          <>오래 열려 있는 연결(SSE·롱폴링·웹소켓) 목록을 문서로 관리해요</>,
        ]}
        links={[['#/dash/fe', '관제 대시보드 · FE 구현 (연결은 하나만)']]}
      />

      <Issue id="net-offline"
        demo={f => <OfflineDemo fixed={f} />}
        demoNote={<><code>navigator.onLine</code>과 <code>online</code>·<code>offline</code> 이벤트는 진짜예요. ‘터널 들어가기’는 이 데모만 끊는 흉내예요.</>}
        cause={<>
          <p>터널·엘리베이터에서는 요청이 실패하거나 <b>한참 매달려요</b>. 화면이 아무 말도 안 하면 사용자는 버튼이 고장 난 줄 알고 연타하거나 떠나요. 보냈다고 믿은 내용은 조용히 사라져요.</p>
          <p><code>navigator.onLine</code>이 <code>false</code>면 확실히 끊긴 거지만, <code>true</code>라고 인터넷이 되는 건 아니에요. 와이파이엔 붙었는데 바깥으로는 안 나가는 경우가 있어요. 그래서 <b>이벤트와 요청 실패를 함께</b> 봐야 해요.</p>
        </>}
        quick={{
          lang: 'React',
          bad: `
async function send(text: string) {
  try {
    await api.post('/cheers', { text })
- } catch { /* 아무것도 안 해요 */ }
}`,
          good: `
+ const online = useSyncExternalStore(
+   cb => {
+     addEventListener('online', cb); addEventListener('offline', cb)
+     return () => { removeEventListener('online', cb); removeEventListener('offline', cb) }
+   },
+   () => navigator.onLine,
+ )

async function send(text: string) {
+ const item = outbox.add(text)     // 먼저 ‘대기 중’으로 보여 줘요
  try { await api.post('/cheers', { text, clientId: item.id }); outbox.done(item) }
+ catch { outbox.keep(item) }       // 연결되면 다시 보내요
}
+ useEffect(() => { if (online) outbox.flush() }, [online])
+ {!online && <Banner>오프라인이에요. 연결되면 보낼게요</Banner>}`,
        }}
        root={<>
          <p>보내는 내용은 <b>대기열(outbox)</b>에 먼저 넣고 화면에 ‘대기 중’으로 보여 줘요. 연결되면 순서대로 보내고, 서버는 <code>clientId</code>로 중복을 걸러요. 오래 보관해야 하면 IndexedDB에 둬요.</p>
          <p>TanStack Query는 기본(<code>networkMode: 'online'</code>)으로 오프라인일 때 요청을 멈췄다가 다시 연결되면 이어 가요. PWA라면 Service Worker로 화면 껍데기를 캐시하고, Background Sync(Chromium 계열만)로 나중에 보내는 방법도 있어요.</p>
        </>}
        prevent={[
          <>개발자 도구 Network의 <b>Offline</b>으로 주요 버튼을 하나씩 눌러 봐요</>,
          <>모든 전송 버튼에 ‘오프라인일 때 무엇을 보여 주나’를 기획서에 적어요</>,
          <>요청에 시간 제한(<code>AbortSignal.timeout</code>)을 둬서 무한히 매달리지 않게 해요</>,
        ]}
        links={[['#/empty/empty-offline', '05 빈 화면 · 오프라인 (UX)'], ['#/loading/loading-optimistic', '14 로딩 패턴 · 낙관적 UI']]}
      />

      <Issue id="net-schema"
        demo={f => <SchemaDemo fixed={f} />}
        demoNote={<>{SIM} 흰 화면 안의 오류 문구는 데모 안에서 실제로 난 TypeError를 붙잡아 보여 준 거예요. 검증기는 데모용으로 손으로 짰어요.</>}
        cause={<>
          <p>TypeScript 타입은 <b>빌드할 때만</b> 있어요. <code>(await res.json()) as Product</code>는 검사가 아니라 ‘믿을게요’라는 표시라서, 서버가 <code>price</code>를 문자열로 바꾸거나 <code>seller</code>를 <code>null</code>로 보내도 아무도 몰라요.</p>
          <p>그러다 <code>seller.name</code>을 읽는 순간 TypeError가 나고, 에러 경계가 없으면 React는 <b>화면 전체를 지워요</b>. 우리는 배포한 적이 없는데, 백엔드나 외부 API의 배포 때문에 죽는 거예요.</p>
        </>}
        quick={{
          lang: 'TypeScript · zod',
          bad: `
- const product = (await res.json()) as Product   // 검사 없이 믿어요

<b>{product.price.toLocaleString()}원</b>
- <span>{product.seller.name}</span>             // null이면 화면 전체가 죽어요`,
          good: `
import { z } from 'zod'

+ const Product = z.object({
+   title: z.string(),
+   price: z.number(),
+   seller: z.object({ name: z.string() }).nullable(),
+ })
+ const parsed = Product.safeParse(await res.json())
+ if (!parsed.success) {
+   report('api-schema', parsed.error.issues)   // 오류 수집기로
+   return <SectionError />                      // 이 칸만 안내
+ }
const product = parsed.data
<span>{product.seller?.name ?? '판매자 정보 없음'}</span>`,
        }}
        root={<>
          <p><b>경계에서 검사</b>해요. API 응답이 앱으로 들어오는 곳(API 클라이언트) 한 곳에서 zod·valibot 같은 검증기로 확인하고, 그 뒤로는 검증된 타입만 써요. 검증기는 OpenAPI·GraphQL 스키마에서 생성하면(orval, openapi-typescript 등) 손으로 맞출 일이 줄어요.</p>
          <p>바꾸는 쪽도 막아요. CI에서 스키마 비교 도구(OpenAPI는 oasdiff, GraphQL은 GraphQL Inspector)로 <b>깨지는 변경</b>을 잡고, 필드는 지우거나 타입을 바꾸지 말고 새로 추가한 뒤 옛 필드를 천천히 없애요. 화면은 영역마다 에러 경계를 둬서 한 칸이 죽어도 나머지는 살아 있게 해요.</p>
        </>}
        prevent={[
          <>스키마 검증 실패를 오류 수집기로 보내고 <b>알림</b>을 걸어요. 사용자가 신고하기 전에 알아요</>,
          <>백엔드와 <b>계약 테스트</b>(예: Pact)나 스키마 diff를 CI에 넣어요</>,
          <>리뷰에서 응답에 바로 <code>as 타입</code>을 붙이는 코드를 막아요</>,
        ]}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면 (UX)']]}
      />

      <Issue id="net-interceptor"
        demo={f => <InterceptorDemo fixed={f} />}
        demoNote={<>{SIM} 콘솔 상자도 흉내예요. 진짜 개발자 콘솔엔 아무것도 찍지 않아요.</>}
        cause={<>
          <p>공용 인터셉터에서 에러를 받아 콘솔에만 찍고 <b>그냥 값을 돌려주면</b>(<code>return</code>, <code>Promise.resolve</code>), 호출한 쪽은 실패를 <b>성공으로</b> 받아요. <code>data</code>가 <code>undefined</code>일 뿐이에요.</p>
          <p>그래서 화면은 ‘취소했어요’를 띄우거나 아무 반응이 없어요. 에러를 한 곳에서 처리하려던 의도였는데, 실제로는 에러를 <b>지워 버린</b> 거예요.</p>
        </>}
        quick={{
          lang: 'axios',
          bad: `
api.interceptors.response.use(
  res => res,
  error => {
    console.error(error)
-   return Promise.resolve({ data: undefined })   // 실패를 성공으로 바꿔요
  },
)

await api.post(\`/orders/\${id}/cancel\`)
toast('주문을 취소했어요')   // 실패해도 떠요`,
          good: `
api.interceptors.response.use(res => res, error => {
+ const e = toApiError(error)          // { status, code, message } 로 정리
+ if (e.status === 401) auth.expire()   // 공통으로 처리할 것만 여기서
+ report(e)                            // 오류 수집기
+ return Promise.reject(e)             // 반드시 다시 던져요
})

try {
  await api.post(\`/orders/\${id}/cancel\`)
  toast('주문을 취소했어요')
+ } catch (e) {
+   toast.error(messageFor(e))         // 409면 '이미 배송이 시작됐어요'
}`,
        }}
        root={<>
          <p>인터셉터는 에러를 <b>정리해서 다시 던지는</b> 곳이에요. 상태 코드·에러 코드를 담은 <code>ApiError</code> 하나로 통일하고, 401 같은 진짜 공통 처리만 인터셉터에서 해요. 무엇을 사용자에게 보여 줄지는 그 기능을 아는 화면이 정해요.</p>
          <p>안내를 빠뜨리지 않으려면 TanStack Query의 <code>MutationCache({'{ onError }'})</code>로 ‘화면이 따로 처리하지 않은 실패’에 기본 토스트를 띄우고, 화면 전체가 의존하는 데이터는 <code>throwOnError</code>로 에러 경계까지 올려요.</p>
        </>}
        prevent={[
          <>MSW로 <b>409 · 500 · 네트워크 끊김</b>을 주입해서 화면 안내가 나오는지 테스트해요</>,
          <>빈 <code>catch</code>와 처리 안 한 Promise를 린트(<code>no-empty</code>, typescript-eslint <code>no-floating-promises</code>)로 막아요</>,
          <>오류 수집기에 쌓인 API 실패 수와 사용자 문의 수를 같이 봐요. 실패는 많은데 안내 로그가 없으면 어딘가 묻힌 거예요</>,
        ]}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면 (UX)']]}
      />
    </div>
  )
}
