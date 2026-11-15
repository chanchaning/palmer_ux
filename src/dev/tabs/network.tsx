/* 04 네트워크 · API */
import { Term } from '../../components/Term'
import { Issue, TabIntro } from '../ui'
import './network.css'
import { DoubleDemo, GraphqlDemo, InterceptorDemo, LocalDeviceDemo, OfflineDemo, RefreshDemo, RetryDemo, SchemaDemo } from './network-demos'

const SIM = '이 데모 안의 가짜 서버로 만든 시뮬레이션이에요. 진짜 주소로는 요청을 보내지 않아요.'

export default function NetworkTab() {
  return (
    <div data-dev="network">
      <TabIntro>
        로컬에서는 API가 늘 빠르고 한 번에 와요. 사용자 환경은 그렇지 않아요. 데모는 전부 이 페이지 안의 가짜 서버로 돌아서 바깥으로 요청이 나가지 않아요. 06의 온라인 상태만 브라우저의 진짜 기능이에요. 웹소켓·SSE는 ‘11 실시간 통신’ 탭으로 옮겼어요.
      </TabIntro>

      <Issue id="net-local-device"
        demo={f => <LocalDeviceDemo fixed={f} />}
        demoNote={<>{SIM} 오류 이름은 Chrome 개발자 도구에 실제로 찍히는 이름이에요.</>}
        cause={<>
          <p>HTTPS 페이지에서 <code>http://</code> 주소를 부르면 브라우저가 Mixed Content로 막아요. <code>ws://</code>도 마찬가지예요. 매장 저울·프린터·키오스크는 대개 사내망 IP(<code>192.168.x.x</code>)에 http로만 열려 있어서, 개발 때 되던 연결이 운영 HTTPS에서 막혀요.</p>
          <p>기기를 https로 열어도 자체 서명 인증서라 브라우저가 믿지 않아요. 통과해도 기기가 <Term k="CORS" d="다른 주소(origin)의 응답을 페이지가 읽어도 되는지, 서버가 응답 헤더로 허락하는 규칙이에요." /> 헤더를 안 주면 응답을 못 읽어요.</p>
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
          <p><b>로컬 에이전트</b>를 둬요. 매장 PC에 작은 프로그램을 깔아 믿을 수 있는 인증서로 HTTPS·WSS를 열고, 기기와는 시리얼·LAN으로 통신해요. 인증서는 에이전트마다 따로 발급하거나, 관리하는 PC라면 MDM으로 사내 루트 인증서를 깔아요. 같은 개인 키를 모든 설치본에 넣으면 안 돼요.</p>
          <p>설치가 어렵다면 클라우드 중계가 가장 덜 막혀요. 기기(또는 에이전트)가 서버로 나가는 연결(MQTT·WebSocket)을 맺고, 웹은 서버 API만 불러요. USB·블루투스로 바로 붙은 기기는 WebSerial·WebUSB·WebHID·Web Bluetooth도 쓸 수 있지만 Chromium 계열에서만 돼요.</p>
          <p>브라우저 정책은 바뀌는 중이에요. Chrome은 사설망 요청 앞에 사전 요청을 넣는 Private Network Access 계획을 거쳐, 지금은 로컬 네트워크에 접근할 때 사용자 권한을 묻는 Local Network Access로 옮겨 가고 있어요. <code>127.0.0.1</code>로 가는 요청도 대상이 될 수 있으니 대상 브라우저의 최신 문서를 확인해요.</p>
        </>}
        prevent={[
          <>기기 연결은 운영과 같은 HTTPS 도메인(스테이징)에서 시험해요. <code>http://localhost</code>에선 안 드러나요</>,
          <>에이전트가 없거나 꺼졌을 때의 안내 화면(설치 링크, 재시작 방법)을 기능 명세에 넣어요</>,
          <>에이전트 CORS는 <code>*</code> 대신 우리 origin만 허락하고, 토큰 없이는 응답하지 않게 해요</>,
        ]}
      />

      <Issue id="net-refresh"
        demo={f => <RefreshDemo fixed={f} />}
        demoNote={<>{SIM} 서버는 리프레시 토큰을 한 번 쓰면 새 것으로 바꾸고, 이미 쓴 토큰이 다시 오면 전부 폐기해요.</>}
        cause={<>
          <p>액세스 토큰이 만료된 순간 화면이 요청 5개를 한꺼번에 보내면, 5개 모두 401을 받고 같은 리프레시 토큰으로 각자 갱신을 시작해요. 서버가 <Term k="리프레시 토큰 회전" d="리프레시 토큰을 한 번 쓰면 새 것으로 바꿔 주고, 쓴 건 버리는 방식이에요. 훔친 토큰을 오래 못 쓰게 해요." />을 쓰면 첫 갱신 뒤 나머지 4개는 이미 쓴 토큰을 다시 보내는 셈이에요. 서버는 이걸 탈취로 보고 토큰을 전부 끊고, 사용자는 갑자기 로그아웃돼요.</p>
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
          <p>토큰 갱신은 인증 모듈 한 곳에서 <b>한 번에 하나만</b> 해요(single-flight). 나머지 요청은 그 결과를 기다렸다가 다시 보내요. 만료 시각(<code>exp</code>)을 보고 30초쯤 전에 미리 갱신하면 401 자체가 줄어요.</p>
          <p>탭이 여러 개면 탭끼리도 겹쳐요. <code>navigator.locks.request('token-refresh', …)</code>(Web Locks)로 한 탭만 갱신하고, 새 토큰은 <code>BroadcastChannel</code>로 나눠요. 서버가 재사용 감지에 몇 초 유예를 두면 네트워크 재전송 같은 정상 중복은 살릴 수 있어요.</p>
        </>}
        prevent={[
          <>토큰을 만료시킨 뒤 요청 여러 개를 동시에 보내고, 갱신 호출이 1번인지 테스트해요</>,
          <>탭 두 개를 열어 둔 채 토큰 만료를 지나 보는 시나리오를 QA에 넣어요</>,
        ]}
      />

      <Issue id="net-retry"
        demo={f => <RetryDemo fixed={f} />}
        demoNote={<>{SIM} 실패는 고른 실패율에 따라 무작위라 누를 때마다 결과가 달라요. 기다리는 시간은 실제보다 줄였어요.</>}
        cause={<>
          <p>모바일 망이나 배포 순간에는 요청이 잠깐 실패하는 일이 흔해요(시간 초과, 502·503). 한 번 실패했다고 바로 포기하면 사용자에겐 빈 화면만 남아요.</p>
          <p>반대로 같은 간격으로 계속 다시 보내면, 막 살아나려는 서버에 사용자들이 한꺼번에 몰려 다시 쓰러뜨려요. 간격은 점점 늘리고(<Term k="지수 백오프" d="다시 시도할 때마다 기다리는 시간을 두 배씩 늘리는 방식이에요." />) 무작위로 흩어야 해요(<Term k="지터" d="기다리는 시간에 무작위 값을 섞어서, 여러 사용자의 재시도가 한순간에 몰리지 않게 하는 것이에요." />).</p>
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
          <p>재시도 정책은 API 클라이언트 한 곳에 둬요. GET처럼 여러 번 보내도 안전한 요청의 5xx·네트워크 오류만, 최대 횟수와 최대 간격을 정해서 다시 보내는 게 기본이에요. 서버가 <code>Retry-After</code>를 주면 그 값을 따라요. TanStack Query는 기본으로 3번 다시 시도하고 간격을 늘리지만 지터는 넣지 않아요.</p>
          <p>그래도 실패하면 마지막으로 받은 데이터에 ‘최신이 아니에요’ 안내와 다시 시도 버튼을 붙여 보여 줘요. 장애가 길어지면 서버 쪽 서킷 브레이커가 요청을 빨리 끊어 줘요.</p>
        </>}
        prevent={[
          <>목업 서버(MSW 등)에 503을 섞어 주는 모드를 만들어 두고 화면을 한 번씩 봐요</>,
          <>POST를 재시도할 땐 멱등 키가 있는지 먼저 확인해요(아래 04)</>,
        ]}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면 (UX)'], ['#/dash/fe', '관제 대시보드 · FE 구현 (재연결 백오프)']]}
      />

      <Issue id="net-double"
        demo={f => <DoubleDemo fixed={f} />}
        demoNote={<>저장 버튼은 진짜 버튼이고, 서버는 이 데모 안의 가짜예요. 응답은 일부러 1초쯤 늦게 와요.</>}
        cause={<>
          <p>저장 버튼은 요청이 끝날 때까지 다시 누를 수 있는 상태로 남기 쉬워요. 응답이 1초만 늦어도 사용자는 안 눌린 줄 알고 또 누르고, 서버는 요청마다 새 글을 만들어요.</p>
          <p>버튼을 막아도 다는 못 막아요. 응답이 돌아오는 길에 끊겨 자동 재전송이 일어나면 이미 저장된 요청이 한 번 더 가요. 서버가 같은 요청임을 알아볼 표시, <Term k="멱등 키" d="Idempotency-Key. 요청마다 붙이는 고유한 값이에요. 서버는 같은 키가 다시 오면 새로 처리하지 않고 처음 결과를 돌려줘요." />가 필요해요.</p>
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
          <p>화면과 서버 <b>두 겹</b>으로 막아요. 화면은 진행 중 잠금과 로딩 버튼, 서버는 <code>Idempotency-Key</code>를 일정 기간 저장해 두고 같은 키가 오면 처음 응답을 그대로 돌려줘요. 이 헤더는 IETF에서 표준 초안으로 다듬는 중이고, Stripe 같은 결제 API가 오래 써 온 방식이에요.</p>
          <p>같은 키에 다른 내용이 오면 거절(422 등)해요. DB에도 유니크 제약(예: 주문 번호)을 마지막 방어선으로 두고, 버튼은 <code>loading</code>을 받는 공용 버튼 하나로 통일해요.</p>
        </>}
        prevent={[
          <>E2E 테스트에서 저장 버튼을 <code>dblclick()</code>하고 생긴 글이 1개인지 확인해요</>,
          <>API 명세에 ‘만드는 요청(POST)은 멱등 키 필수’라고 적어요</>,
          <>느린 3G로 두고 저장·결제 버튼을 연타해 봐요</>,
        ]}
        links={[['#/button-state/bstate-loading', '28 버튼 상태 · 로딩'], ['#/loading/loading-optimistic', '14 로딩 패턴 · 낙관적 UI']]}
      />

      <Issue id="net-graphql-n1"
        demo={f => <GraphqlDemo fixed={f} />}
        demoNote={<>{SIM} 지연 시간은 예시 값이고, 보기 쉽게 2배 느리게 재생해요. 막대 하나가 HTTP 요청 하나예요.</>}
        cause={<>
          <p>목록 쿼리가 작성자 id만 주고 이름은 안 주면(Under-fetching) 화면의 줄마다 작성자 쿼리를 따로 보내요. 글 12개면 요청이 1 + 12개, 화면 쪽의 <Term k="N+1" d="목록 1번을 가져온 뒤, 항목마다 1번씩 N번을 더 가져오는 모양이에요. 항목이 늘수록 요청이 같이 늘어요." />이에요.</p>
          <p>쿼리를 하나로 합쳐도 서버 리졸버가 글마다 DB를 따로 부르면 이번엔 서버 안에서 N+1이 생겨요. 요청 수는 줄었는데 DB 부담은 그대로예요.</p>
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
          <p>화면은 프래그먼트를 컴포넌트 옆에 둬요(Relay, Apollo의 fragment). 줄 컴포넌트는 필요한 필드를 프래그먼트로 선언만 하고, 목록 쿼리가 그걸 모아 한 번에 요청해요.</p>
          <p>서버는 관계 필드마다 <b>DataLoader</b>로 모아 불러요. 로더는 요청마다 새로 만들어야 다른 사용자 데이터가 캐시에 섞이지 않아요. 지나치게 큰 쿼리는 깊이·복잡도 제한으로 막아요.</p>
        </>}
        prevent={[
          <>개발 모드에서 화면 하나가 보낸 GraphQL 요청 수를 세고, 기준(예: 3개)을 넘으면 경고해요</>,
          <>서버 테스트에서 요청 하나당 DB 쿼리 수를 재고, 기준을 넘으면 실패시켜요</>,
        ]}
      />

      <Issue id="net-offline"
        demo={f => <OfflineDemo fixed={f} />}
        demoNote={<><code>navigator.onLine</code>과 <code>online</code>·<code>offline</code> 이벤트는 진짜예요. ‘터널 들어가기’는 이 데모만 끊는 흉내예요.</>}
        cause={<>
          <p>터널·엘리베이터에서는 요청이 실패하거나 한참 매달려요. 화면이 아무 말도 안 하면 사용자는 버튼이 고장 난 줄 알고 연타하거나 떠나고, 보냈다고 믿은 내용은 조용히 사라져요.</p>
          <p><code>navigator.onLine</code>이 <code>false</code>면 끊긴 게 맞지만, <code>true</code>라고 인터넷이 되는 건 아니에요. 와이파이엔 붙었는데 바깥으로 안 나가는 경우도 있어서 이벤트와 요청 실패를 함께 봐야 해요.</p>
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
          <p>보낼 내용은 <b>대기열(outbox)</b>에 먼저 넣고 화면에 ‘대기 중’으로 보여 줘요. 연결되면 순서대로 보내고, 서버는 <code>clientId</code>로 중복을 걸러요. 오래 보관해야 하면 IndexedDB에 둬요.</p>
          <p>TanStack Query는 기본값(<code>networkMode: 'online'</code>)에서 오프라인이면 요청을 멈췄다가 다시 연결되면 이어 가요. PWA라면 Service Worker로 화면 껍데기를 캐시하고, Background Sync(Chromium 계열만)로 나중에 보낼 수도 있어요.</p>
        </>}
        prevent={[
          <>개발자 도구 Network를 Offline으로 두고 주요 버튼을 하나씩 눌러 봐요</>,
          <>요청에 시간 제한(<code>AbortSignal.timeout</code>)을 둬서 무한히 매달리지 않게 해요</>,
        ]}
        links={[['#/empty/empty-offline', '05 빈 화면 · 오프라인 (UX)'], ['#/loading/loading-optimistic', '14 로딩 패턴 · 낙관적 UI']]}
      />

      <Issue id="net-schema"
        demo={f => <SchemaDemo fixed={f} />}
        demoNote={<>{SIM} 흰 화면의 오류 문구는 데모 안에서 실제로 난 TypeError예요. 검증기는 데모용으로 손으로 짰어요.</>}
        cause={<>
          <p>TypeScript 타입은 빌드할 때만 있어요. <code>(await res.json()) as Product</code>는 검사가 아니라 ‘믿을게요’라는 표시예요. 서버가 <code>price</code>를 문자열로 바꾸거나 <code>seller</code>를 <code>null</code>로 보내도 아무도 모르다가, <code>seller.name</code>을 읽는 순간 TypeError가 나요.</p>
          <p>에러 경계가 없으면 React는 <b>화면 전체를 지워요</b>. 백엔드나 외부 API가 배포했을 뿐인데 우리 화면이 죽어요.</p>
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
          <p>응답이 들어오는 경계인 API 클라이언트 한 곳에서 zod·valibot 같은 검증기로 검사하고 그 뒤로는 검증된 타입만 써요. 검증기를 OpenAPI·GraphQL 스키마에서 생성하면(orval, openapi-typescript 등) 손으로 맞출 일이 줄어요.</p>
          <p>바꾸는 쪽도 막아요. CI에서 스키마 비교 도구(OpenAPI는 oasdiff, GraphQL은 GraphQL Inspector)로 깨지는 변경을 잡아요. 필드는 지우거나 타입을 바꾸지 말고, 새로 추가한 뒤 옛 필드를 천천히 없애요. 화면은 영역마다 에러 경계를 둬서 한 칸이 죽어도 나머지는 살아 있게 해요.</p>
        </>}
        prevent={[
          <>스키마 검증 실패는 오류 수집기로 보내고 알림을 걸어요</>,
          <>백엔드와의 계약 테스트(예: Pact)를 CI에 넣어요</>,
        ]}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면 (UX)']]}
      />

      <Issue id="net-interceptor"
        demo={f => <InterceptorDemo fixed={f} />}
        demoNote={<>{SIM} 콘솔 상자도 흉내예요. 진짜 개발자 콘솔엔 아무것도 찍지 않아요.</>}
        cause={<>
          <p>공용 인터셉터에서 에러를 받아 콘솔에만 찍고 값을 돌려주면(<code>return</code>, <code>Promise.resolve</code>) 호출한 쪽은 실패를 <b>성공으로</b> 받아요. <code>data</code>가 <code>undefined</code>일 뿐이에요. 화면은 ‘취소했어요’를 띄우거나 아무 반응이 없어요. 에러를 한 곳에서 처리하려다 지워 버린 셈이에요.</p>
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
          <p>인터셉터는 에러를 정리해서 다시 던지는 곳이에요. 상태 코드·에러 코드를 담은 <code>ApiError</code> 하나로 통일하고, 401처럼 어느 화면에서나 똑같은 처리만 인터셉터에서 해요. 사용자에게 무엇을 보여 줄지는 그 기능을 아는 화면이 정해요.</p>
          <p>안내가 빠지지 않게 하려면 TanStack Query의 <code>MutationCache({'{ onError }'})</code>로 화면이 따로 처리하지 않은 실패에 기본 토스트를 띄워요. 화면 전체가 기대는 데이터는 <code>throwOnError</code>로 에러 경계까지 올려요.</p>
        </>}
        prevent={[
          <>MSW로 409·500·네트워크 끊김을 주입해서 화면 안내가 나오는지 테스트해요</>,
          <>빈 <code>catch</code>와 처리 안 한 Promise를 린트(<code>no-empty</code>, typescript-eslint <code>no-floating-promises</code>)로 막아요</>,
          <>오류 수집기의 API 실패 수와 사용자 문의 수를 같이 봐요. 실패는 많은데 안내 로그가 없으면 어딘가 묻힌 거예요</>,
        ]}
        links={[['#/empty/empty-error', '05 빈 화면 · 오류 화면 (UX)']]}
      />
    </div>
  )
}
