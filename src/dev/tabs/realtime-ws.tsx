/* 11 실시간 통신 — WebSocket · Socket.IO 함정 */
import { Issue } from '../ui'
import './realtime-ws.css'
import { AuthDemo, BackpressureDemo, FloodDemo, HeartbeatDemo, OrderDemo, ResubDemo, ResumeDemo, ScaleDemo, StormDemo } from './realtime-ws-demos'

const SIM = '이 데모 안의 가짜 서버로 만든 시뮬레이션이에요. 바깥으로 연결을 열지 않아요.'

export default function WsIssues() {
  return (
    <>
      <Issue id="rc-ws-heartbeat"
        demo={f => <HeartbeatDemo fixed={f} />}
        demoNote={<>{SIM} 서버는 0.5초마다 값을 보내요. ‘공유기 재부팅’은 패킷만 버리고 양쪽 어디에도 끊김을 알리지 않아요. 하트비트 간격은 보기 쉽게 실제보다 줄였어요.</>}
        cause={<>
          <p>표시는 ‘연결됨’인데 숫자가 몇 분째 그대로예요. 새로고침하면 멀쩡해지니 처음엔 서버가 값을 안 보낸 줄 알고 서버 로그부터 뒤지게 돼요. 개발자 도구 Network에서 WS 줄을 골라 Messages 탭을 열어 두면, 어느 순간부터 프레임이 한 줄도 안 쌓이는데 연결은 닫히지 않고 남아 있어요. 공유기가 재부팅되거나 노트북 덮개를 닫았다 열었을 때, 엘리베이터를 탔다 내렸을 때 주로 생겨서 책상 앞에서는 잘 재현되지 않아요.</p>
          <p>TCP는 상대가 조용히 사라지면 알 방법이 없어요. 끊겼다는 패킷(FIN·RST)이 오지 않으면 브라우저는 <code>onclose</code>를 부르지 않고, 운영체제가 알아채기까지 몇 분에서 몇 시간이 걸리기도 해요. 서버가 보내는 ping 프레임에는 브라우저가 알아서 pong으로 답하지만, 그 주고받음은 JS에서 볼 수도 없고 직접 보낼 수도 없어요. 화면이 끊김을 알려면 <b>앱 메시지로 하트비트</b>를 주고받아야 해요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
function connect() {
  const ws = new WebSocket(URL)
  ws.onmessage = e => render(JSON.parse(e.data))
- ws.onclose = () => scheduleReconnect(connect)   // 조용히 끊기면 영영 안 불려요
}`,
          good: `
function connect() {
  const ws = new WebSocket(URL)
+ let heardAt = Date.now()
+ const hb = setInterval(() => {
+   if (Date.now() - heardAt > 10_000) return drop()   // 10초 동안 아무것도 못 받음
+   if (ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}')
+ }, 5_000)
+ const drop = () => {
+   clearInterval(hb)
+   ws.onclose = ws.onmessage = null   // 죽은 소켓의 close는 한참 뒤에 올 수 있어요
+   ws.close()
+   scheduleReconnect(connect)
+ }
  ws.onmessage = e => {
+   heardAt = Date.now()               // pong이든 데이터든 받으면 살아 있는 거예요
    const m = JSON.parse(e.data)
    if (m.type !== 'pong') render(m)
  }
+ ws.onclose = drop
}`,
        }}
        root={<>
          <p>하트비트는 양쪽에 둬요. 화면은 위처럼 ping을 보내고 정해 둔 시간 동안 아무것도 못 받으면 스스로 끊고 다시 붙어요. 서버도 응답 없는 클라이언트를 정리해야 죽은 연결이 메모리와 구독 목록에 쌓이지 않아요. Node <code>ws</code> 라이브러리 문서에 서버가 프로토콜 ping을 보내고 pong이 안 오면 <code>terminate()</code>하는 예제가 있어요.</p>
          <p>간격은 중간 장비의 idle timeout보다 짧게 잡아요. nginx <code>proxy_read_timeout</code>이나 로드밸런서 idle timeout이 60초인 곳이 많아서 25~30초 간격이 무난해요. Socket.IO는 자체 하트비트(<code>pingInterval</code>·<code>pingTimeout</code>)가 들어 있어서 따로 만들지 않아도 돼요. 끊김을 알아챘으면 화면에 ‘몇 초 전 값’이라고 같이 보여 줘요.</p>
        </>}
        prevent={[
          <>반쯤 열린 연결은 와이파이를 끄는 것만으로는 잘 안 만들어져요. 스테이징 서버 방화벽에서 해당 포트 패킷을 DROP하게 해 두고 화면이 몇 초 만에 알아채는지 재요</>,
          <>연결 상태와 함께 ‘마지막으로 메시지를 받은 시각’을 저장하고, 화면 표시는 둘을 같이 보고 정해요</>,
          <>하트비트 간격과 프록시·로드밸런서 idle timeout 값을 한 문서에 나란히 적어 둬요. 인프라 설정이 바뀌면 같이 봐야 해요</>,
        ]}
        links={[['#/dev/realtime/rc-ws-resume', '앱 복귀 후 끊겨 있는 소켓'], ['#/dev/realtime/rc-sse-timeout', '게이트웨이 idle timeout으로 주기적 끊김']]}
      />

      <Issue id="rc-ws-storm"
        demo={f => <StormDemo fixed={f} />}
        demoNote={<>{SIM} 클라이언트는 40개, 서버는 0.1초 사이에 접속이 8개 넘게 몰리면 다시 죽어요. 막대 하나가 0.1초 동안 들어온 접속 시도예요.</>}
        cause={<>
          <p>배포하려고 서버를 재시작했더니 올라오자마자 다시 죽어요. 서버 로그를 보면 기동 직후 몇 초 사이에 접속 요청이 한꺼번에 몰려 있고, CPU와 DB 커넥션 풀이 그 순간에만 꽉 차요. 처음엔 새 버전 코드를 의심해서 롤백하는데, 롤백한 버전도 똑같이 죽어서 더 헷갈려요. 붙어 있는 사용자가 적은 스테이징에서는 생기지 않아요.</p>
          <p>서버가 내려가면 붙어 있던 클라이언트가 모두 같은 순간에 <code>onclose</code>를 받아요. 재연결이 ‘1초 뒤 다시’처럼 고정 간격이면 모두가 같은 순간에 다시 문을 두드리고, 접속할 때 하는 일(토큰 검증, DB 조회, 구독 등록)이 한꺼번에 들어와 서버가 버티지 못해요. 다시 죽으면 다음 파도도 같은 박자로 와요. 간격을 늘리는 지수 백오프만으로는 모두의 박자가 여전히 같아서, 각자 <b>무작위 지연(지터)</b>을 섞어야 흩어져요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
ws.onclose = () => {
- setTimeout(connect, 1000)   // 모두가 같은 박자로 1초 뒤에
}`,
          good: `
let tries = 0
ws.onopen = () => { tries = 0 }
ws.onclose = e => {
+ const cap = Math.min(30_000, 1_000 * 2 ** tries++)
+ let wait = Math.random() * cap     // full jitter: 0 ~ cap 사이 아무 때나
+ if (e.code === 1012 || e.code === 1013) wait += 5_000   // 서버가 ‘재시작 중’, ‘나중에 다시’라고 알려 줌
  setTimeout(connect, wait)
}`,
        }}
        root={<>
          <p>재연결 지연은 공용 연결 모듈에서 한 번만 정해요. 지수 백오프에 지터를 섞고, 상한(30초 안팎)을 두고, 연결에 성공하면 횟수를 0으로 되돌려요. Socket.IO 클라이언트는 이 방식이 기본으로 들어 있어서 <code>reconnectionDelay</code>, <code>reconnectionDelayMax</code>, <code>randomizationFactor</code> 값만 서비스 규모에 맞게 조절하면 돼요.</p>
          <p>서버도 같이 막아요. 배포할 때는 한 대씩 내리면서 close 코드 1012(Service Restart)를 보내고, 새 접속은 초당 몇 개까지만 받게 제한해요. 넘친 접속은 1013(Try Again Later)으로 돌려보내고 클라이언트는 이 코드를 보면 더 오래 기다려요. 다시 붙은 직후 화면이 한꺼번에 부르는 REST API(초기 데이터, 스냅숏)도 같은 순간에 몰리니 함께 봐요.</p>
        </>}
        prevent={[
          <>스테이징에서 가짜 클라이언트 수천 개를 붙여 둔 채 서버를 재시작하는 시험을 배포 절차에 넣어요. k6, Artillery 같은 부하 도구가 웹소켓을 지원해요</>,
          <>서버 대시보드에 ‘초당 새 연결 수’ 그래프를 둬요. 재시작 직후 뾰족하게 솟으면 지터가 빠진 클라이언트가 있다는 뜻이에요</>,
          <>화면마다 소켓을 따로 열지 않는지 봐요</>,
        ]}
        links={[['#/dev/realtime/rc-ws-resub', '재연결 후 구독 · 누락 이벤트 복구'], ['#/dev/network/net-retry', '재시도 · 대체 UI 없음']]}
      />

      <Issue id="rc-ws-resub"
        demo={f => <ResubDemo fixed={f} />}
        demoNote={<>{SIM} 서버는 0.4초마다 순서 번호가 붙은 값을 보내고, 최근 값을 보관해 둬요.</>}
        cause={<>
          <p>와이파이가 잠깐 끊겼다 돌아온 뒤로 값이 안 바뀌어요. 표시는 다시 ‘연결됨’으로 돌아와 있어서 서버 쪽 데이터가 멈춘 줄 알게 돼요. Network 탭에서 WS 줄을 비교해 보면 단서가 있어요. 첫 연결의 Messages에는 구독 메시지가 있는데, 재연결로 새로 생긴 연결에는 서버 메시지만 있고 구독 요청은 한 줄도 없어요. 서버는 새 연결이 무엇을 보고 싶은지 모르니 아무것도 보내지 않아요.</p>
          <p>재연결은 붙여 놓고 구독은 첫 연결의 <code>onopen</code>에서만 보내는 코드가 흔해요. 다시 구독해도 끊긴 동안 지나간 이벤트는 돌아오지 않아요. 서버가 이벤트마다 순서 번호(seq)를 붙이고, 화면이 다시 붙을 때 <b>마지막으로 받은 번호 이후</b>를 달라고 해야 빈 구간이 메워져요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
function connect() {
  const ws = new WebSocket(URL)
  ws.onmessage = e => render(JSON.parse(e.data))
  ws.onclose = () => scheduleReconnect(connect)
  return ws
}
const ws = connect()
- ws.onopen = () => ws.send(sub('line-3'))   // 첫 연결에서만 구독`,
          good: `
let lastSeq = 0
const topics = new Set(['line-3'])       // 지금 보고 있는 토픽 목록

function connect() {
  const ws = new WebSocket(URL)
+ ws.onopen = () => {                    // 연결될 때마다 다시 구독 + 이어 받기
+   for (const topic of topics)
+     ws.send(JSON.stringify({ type: 'sub', topic, since: lastSeq }))
+ }
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
+   if (m.seq <= lastSeq) return         // 다시 받은 중복은 버려요
    lastSeq = m.seq
    render(m)
  }
  ws.onclose = () => scheduleReconnect(connect)
}`,
        }}
        root={<>
          <p>연결 관리는 공용 모듈 하나에 모아요. 재연결, 하트비트, 재구독, <code>since</code>로 이어 받기, 끊김 안내를 거기서 처리하고 화면은 ‘이 토픽을 보고 싶다’만 말해요. 모듈이 구독 중인 토픽 목록을 들고 있다가 연결될 때마다 통째로 다시 보내요. Socket.IO는 재연결이 기본이고, 끊긴 동안의 이벤트는 서버에서 connection state recovery 옵션을 켜야 이어 받을 수 있어요.</p>
          <p>서버가 보관한 범위보다 오래 끊겼으면 이어 받기를 포기하고 REST로 최신 스냅숏을 다시 받아요. 서버가 보내기만 하는 화면이라면 재연결과 <code>Last-Event-ID</code>가 표준에 들어 있는 SSE가 더 간단해요.</p>
        </>}
        prevent={[
          <>와이파이를 10초 껐다 켜고, 새로 생긴 WS 연결의 Messages 탭에 구독 메시지가 다시 찍히는지, 놓친 값이 채워지는지 봐요</>,
          <>메시지마다 seq가 있는지, 서버가 최근 몇 분을 보관하는지 API 명세에 적어요</>,
          <>서버 재시작으로도 시험해요. 서버 메모리의 구독 목록이 통째로 사라진 상황까지 확인돼요</>,
        ]}
        links={[['#/dev/realtime/rc-sse-lastid', '재연결 사이에 놓친 이벤트 (Last-Event-ID)'], ['#/dev/realtime/rc-ws-heartbeat', '하트비트 없는 반쯤 열린 연결'], ['#/dash/fe', '관제 대시보드 · FE 구현 (폴링 · SSE · 웹소켓 비교)']]}
      />

      <Issue id="rc-ws-resume"
        demo={f => <ResumeDemo fixed={f} />}
        demoNote={<>{SIM} ‘잠그기’는 백그라운드에서 운영체제가 소켓을 조용히 정리하는 상황을 흉내 내요. 이 탭을 진짜로 숨겼다가 돌아와도 같은 일이 일어나요(visibilitychange는 진짜 이벤트예요).</>}
        cause={<>
          <p>휴대폰에서 다른 앱을 쓰다 돌아오면 실시간 화면이 멈춰 있어요. 당겨서 새로고침하면 살아나서 QA에서는 ‘가끔 멈춤’으로만 올라오고 재현 절차가 안 적혀 와요. 데스크톱 크롬은 탭을 오래 숨겨도 대개 괜찮아서 PC로는 잘 안 잡혀요. 휴대폰을 연결해 Safari 웹 인스펙터나 크롬 원격 디버깅으로 보면, 돌아온 뒤에도 소켓의 <code>readyState</code>가 1(OPEN)인데 메시지는 들어오지 않는 경우를 볼 수 있어요.</p>
          <p>모바일 브라우저는 백그라운드로 간 페이지의 JS를 멈추고, 시간이 지나면 네트워크 연결도 정리해요. 그 사이의 끊김은 이벤트로 전달되지 않거나 돌아온 뒤 한참 있다가 와요. 앱은 숨기 전 상태 그대로 연결돼 있다고 믿고 있으니, <b>돌아오는 순간</b>을 직접 잡아서 연결이 살아 있는지 확인해야 해요.</p>
        </>}
        quick={{
          lang: 'React · TypeScript',
          bad: `
useEffect(() => {
  const conn = connect()
  return () => conn.close()
- }, [])   // 앱으로 돌아와도 연결이 살아 있다고 믿어요`,
          good: `
useEffect(() => {
  const conn = connect()
+ const check = async () => {
+   if (document.visibilityState !== 'visible') return
+   const alive = await conn.ping(2_000)   // 2초 안에 pong이 오나
+   if (!alive) await conn.reconnect()     // 안 오면 버리고 새로 연결
+   refetchSnapshot()                      // 숨어 있던 동안의 값은 스냅숏으로 채워요
+ }
+ document.addEventListener('visibilitychange', check)
+ window.addEventListener('online', check)
+ window.addEventListener('pageshow', check)   // 뒤로 가기 캐시(bfcache)에서 돌아올 때
  return () => {
+   document.removeEventListener('visibilitychange', check)
+   window.removeEventListener('online', check)
+   window.removeEventListener('pageshow', check)
    conn.close()
  }
}, [])`,
        }}
        root={<>
          <p>‘화면이 다시 보임’, ‘온라인이 됨’, ‘bfcache에서 복원됨’을 연결 모듈이 직접 듣게 해요. 어느 쪽이든 같은 확인(ping, 실패하면 재연결, 그다음 스냅숏)으로 이어지게 만들면 경우마다 따로 고칠 일이 없어요. 오래 숨어 있었다면 ping을 기다리지 않고 새로 연결해도 돼요.</p>
          <p>숨어 있는 동안 소켓을 일부러 닫는 방법도 있어요. <code>hidden</code>이 되고 일정 시간이 지나면 닫고, 다시 보이면 열어요. 서버 자원도 아끼고 복귀 처리 경로가 하나로 줄어요. 앱을 안 보고 있을 때도 받아야 하는 알림은 웹소켓으로 해결되지 않으니 Web Push로 따로 보내요.</p>
        </>}
        prevent={[
          <>실제 휴대폰으로 ‘다른 앱 5분 쓰다 돌아오기’, ‘화면 잠그고 10분 뒤 켜기’를 QA 시나리오에 넣어요. 데스크톱 브라우저의 모바일 보기로는 이 동작이 재현되지 않아요</>,
          <>연결 상태 표시는 <code>readyState</code>만 보지 말고 마지막 메시지 시각과 함께 정해요</>,
        ]}
        links={[['#/dev/browser/br-background', '백그라운드 전환 시 통신 중단'], ['#/dev/state/state-bfcache', '뒤로 가기 시 엉뚱한 상태 (bfcache)'], ['#/dev/realtime/rc-ws-heartbeat', '하트비트 없는 반쯤 열린 연결']]}
      />

      <Issue id="rc-ws-auth"
        demo={f => <AuthDemo fixed={f} />}
        demoNote={<>{SIM} 토큰 수명은 6초로 줄였고, 화면용 토큰은 만료 1초 전에 HTTP로 갱신돼요. 서버는 1초마다 연결에 묶인 사용자에게 알림을 보내요.</>}
        cause={<>
          <p>로그아웃하고 로그인 화면에 있는데 앞 사람 앞으로 온 알림이 토스트로 떠요. 공용 PC나 계정을 바꿔 쓰는 사용자에게서 신고가 들어오고, 개발자는 늘 같은 계정으로 테스트하니 직접 보기 어려워요. 로그아웃 코드를 열어 보면 토큰을 지우고 화면을 옮기는 데서 끝나고, 소켓은 모듈 바깥 변수에 그대로 살아 있어요. Network 탭의 WS 줄도 로그아웃 뒤에 계속 메시지가 쌓여요.</p>
          <p>토큰 만료도 뿌리가 같아요. 웹소켓 서버는 대개 연결을 맺을 때 한 번만 토큰을 확인해요. HTTP용 토큰은 그 뒤로 갱신되고 만료되기를 반복해도 소켓은 <b>처음 토큰의 권한</b>으로 계속 열려 있어요. 권한을 뺏긴 사용자나 퇴사자가 열어 둔 탭이 실시간 데이터를 계속 받는 일이 여기서 생겨요.</p>
        </>}
        quick={{
          lang: 'socket.io-client',
          bad: `
export const socket = io(URL, { auth: { token: getToken() } })   // 앱이 뜰 때 한 번

function logout() {
  clearToken()
- navigate('/login')   // 소켓은 그대로 열려 있어요
}`,
          good: `
+ export const socket = io(URL, {
+   autoConnect: false,
+   auth: cb => cb({ token: getToken() }),   // 재연결 때마다 새 토큰을 읽어요
+ })

function login(token: string) {
  saveToken(token)
+ socket.connect()
}
function logout() {
+ socket.disconnect()        // 토큰보다 먼저 연결부터 끊어요
  clearToken()
  navigate('/login')
}
+ onTokenRefreshed(t => socket.emit('reauth', t))   // 열린 연결에도 새 토큰을 알려 줘요`,
        }}
        root={<>
          <p>소켓 수명을 로그인 세션에 묶어요. 로그인할 때 열고, 로그아웃·계정 전환·세션 만료 때 닫는 일을 인증 모듈 한 곳에서 해요. 다른 탭에서 로그아웃한 경우도 BroadcastChannel이나 <code>storage</code> 이벤트로 듣고 같이 닫아요.</p>
          <p>서버도 연결이 열려 있는 동안 만료를 확인해야 해요. 토큰의 <code>exp</code>를 연결 정보에 기억해 두고, 지나도록 새 토큰이 오지 않으면 4000번대 코드(예: 4401)로 닫아요. 권한 변경이나 강제 로그아웃이 생기면 그 사용자의 연결을 서버가 끊을 수 있게 사용자별 연결 목록도 둬요. 브라우저 웹소켓은 헤더를 붙일 수 없어서 토큰을 주소에 넣기 쉬운데, 그러면 서버·프록시 로그에 남으니 짧게 사는 일회용 티켓을 따로 발급받아 쓰는 편이 안전해요.</p>
        </>}
        prevent={[
          <>E2E 로그아웃 테스트에 ‘로그아웃 뒤 열린 WS 연결이 0개’를 넣어요. Playwright는 <code>page.on('websocket')</code>으로 연결을 잡고 그 연결의 <code>close</code> 이벤트를 기다릴 수 있어요</>,
          <>토큰 수명을 1분으로 줄인 스테이징 설정을 만들어 두고, 탭을 그보다 오래 열어 둔 채 알림이 계속 오는지 봐요</>,
          <>서버 로그에 연결마다 사용자 id와 토큰 만료 시각을 남겨요</>,
        ]}
        links={[['#/dev/realtime/rc-sse-token', 'EventSource에 헤더를 못 붙여 URL에 토큰'], ['#/dev/network/net-refresh', '토큰 갱신 큐잉 실패로 강제 로그아웃'], ['#/dev/routing/rt-multitab', '여러 탭 간 세션 · 장바구니 불일치']]}
      />

      <Issue id="rc-ws-scale"
        demo={f => <ScaleDemo fixed={f} />}
        demoNote={<>{SIM} 6명이 같은 방에 있고 로드밸런서가 서버 A, B에 번갈아 붙였어요. 1.1초마다 한 명이 메시지를 보내요.</>}
        cause={<>
          <p>같은 채팅방인데 어떤 사람은 메시지를 받고 어떤 사람은 못 받아요. 서버 한 대로 돌리는 개발 환경에서는 한 번도 안 생기고, 운영 서버를 두 대 이상으로 늘린 뒤부터 시작돼요. 못 받은 사람들의 브라우저나 회사 네트워크를 먼저 의심하게 되는데, 서버 로그에 연결이 붙은 인스턴스 이름을 같이 찍어 보면 규칙이 보여요. 보낸 사람과 다른 서버에 붙은 사람만 못 받고 있어요.</p>
          <p>웹소켓 서버는 ‘이 방에 누가 있나’를 자기 메모리에만 들고 있어요. A 서버가 방에 보내라는 요청을 받으면 A에 붙은 연결에만 보내요. 서버끼리 메시지를 나누는 통로(Redis pub/sub, NATS, Kafka 같은 브로커)가 있어야 B에 붙은 사람에게도 가요. Socket.IO는 이걸 <b>어댑터</b>로 풀고, HTTP 롱폴링을 같이 쓰면 한 클라이언트의 요청이 늘 같은 서버로 가도록 sticky session도 필요해요.</p>
        </>}
        quick={{
          lang: 'Node · Socket.IO 서버',
          bad: `
const io = new Server(httpServer)

io.on('connection', socket => {
  socket.on('chat', (room, msg) => {
-   io.to(room).emit('chat', msg)   // 이 서버에 붙은 사람에게만 가요
  })
})`,
          good: `
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'

+ const pub = createClient({ url: REDIS_URL })
+ const sub = pub.duplicate()
+ await Promise.all([pub.connect(), sub.connect()])

const io = new Server(httpServer, {
+ adapter: createAdapter(pub, sub),  // 서버끼리 Redis로 나눠 보내요
})

io.on('connection', socket => {
  socket.on('chat', (room, msg) => {
    io.to(room).emit('chat', msg)     // 모든 서버의 같은 방으로 가요
  })
})`,
        }}
        root={<>
          <p>서버를 늘릴 계획이 있으면 처음부터 서버 간 전달 통로를 둬요. Socket.IO는 Redis 어댑터(Redis Streams·Postgres 어댑터도 있어요)를 쓰고, 직접 짠 <code>ws</code> 서버는 방 이름을 Redis 채널로 써서 각 서버가 받은 메시지를 자기 연결에 뿌려요. Ably, Pusher, AWS API Gateway WebSocket 같은 관리형 서비스를 쓰면 이 부분을 맡길 수 있어요.</p>
          <p>화면 쪽에서 할 수 있는 일도 있어요. Socket.IO 클라이언트를 <code>transports: ['websocket']</code>로 두면 롱폴링을 건너뛰어서 sticky session이 없어도 핸드셰이크가 깨지지 않아요. 대신 웹소켓이 막힌 망에서는 연결이 안 되니 사용자 환경을 보고 정해요. 메시지에 seq가 있으면 빠진 번호를 화면이 알아챌 수 있어서 이런 누락을 일찍 발견해요.</p>
        </>}
        prevent={[
          <>스테이징을 최소 두 대로 띄워요. 한 대짜리 스테이징에서는 이 문제가 영영 안 보여요</>,
          <>연결 로그와 응답 헤더에 인스턴스 이름을 남겨 두면 누가 어느 서버에 붙었는지 금방 확인할 수 있어요</>,
          <>롱폴링을 쓰는데 로드밸런서에 sticky 설정이 빠졌으면 <code>Session ID unknown</code> 오류와 함께 400 응답이 찍혀요. 이 문구가 보이면 sticky 설정부터 봐요</>,
        ]}
        links={[['#/dev/realtime/rc-ws-order', '메시지 순서 뒤바뀜 · 중복'], ['#/dev/realtime/rc-ws-storm', '재연결 폭주 (Thundering Herd)']]}
      />

      <Issue id="rc-ws-order"
        demo={f => <OrderDemo fixed={f} />}
        demoNote={<>{SIM} 보내기는 REST, 받기는 웹소켓이에요. 세 번째 메시지는 응답이 0.7초를 넘겨서 한 번 재시도돼요. 지연 시간은 매번 같게 고정했어요.</>}
        cause={<>
          <p>메시지를 빠르게 여러 개 보내면 상대 화면에서 순서가 섞이고, 내 화면엔 같은 말풍선이 두 번 찍혀요. 사내망에서는 응답이 고르게 빨라서 안 보이다가 지하철이나 해외처럼 지연이 들쭉날쭉한 곳에서 신고가 들어와요. 처음엔 웹소켓이 순서를 안 지킨다고 의심하기 쉬운데, 연결 하나 안의 메시지 순서는 TCP가 지켜 줘요. 섞이는 곳은 그 바깥이에요.</p>
          <p>보내기는 REST로, 받기는 웹소켓으로 하는 구조가 흔해요. 요청마다 걸리는 시간이 달라서 서버에 닿는 순서가 보낸 순서와 달라져요. 응답이 늦어 재시도하면 서버는 같은 메시지를 두 번 저장하고, 화면은 낙관적으로 그려 둔 말풍선 아래에 서버가 돌려준 같은 메시지를 또 붙여요. 재연결 뒤 이어 받은 메시지와 실시간 메시지가 겹칠 때도 마찬가지예요. 메시지마다 <b>클라이언트가 만든 id</b>와 서버가 매긴 순서 번호가 있어야 걸러 내고 정렬할 수 있어요.</p>
        </>}
        quick={{
          lang: 'React · TypeScript',
          bad: `
async function send(text: string) {
- setMsgs(m => [...m, { text, mine: true }])           // 낙관적으로 그리고
- await retry(() => api.post('/messages', { text }))   // 재시도하면 서버에 두 번 저장
}
- socket.on('message', m => setMsgs(ms => [...ms, m]))   // 온 순서대로 또 붙여요`,
          good: `
+ const bySeq = (a: Msg, b: Msg) => (a.seq ?? Infinity) - (b.seq ?? Infinity)

async function send(text: string) {
+ const cid = crypto.randomUUID()
+ setMsgs(m => upsert(m, { cid, text, pending: true }))
+ await outbox.enqueue(() => api.post('/messages', { cid, text }))   // 한 줄로 차례차례
}

socket.on('message', m => {
+ setMsgs(ms => upsert(ms, m).sort(bySeq))   // 같은 cid면 바꿔 끼우고 seq로 정렬
})`,
        }}
        root={<>
          <p>서버는 cid를 멱등 키로 써서 같은 cid가 다시 오면 저장하지 않고 처음 결과를 돌려줘요. 방마다 순서 번호(seq)를 서버에서 매기고 화면은 seq 순서로만 그려요. 아직 seq가 없는 내 메시지는 맨 아래에 ‘보내는 중’으로 두었다가, 서버 메시지가 오면 cid로 찾아 바꿔 끼워요.</p>
          <p>내가 보낸 순서까지 지키려면 보내기를 한 줄로 세워요. 앞 메시지의 응답을 받고 다음을 보내거나, 보내기도 같은 웹소켓 연결로 해서 TCP 순서를 빌려요. 두 사람이 거의 동시에 보낸 메시지 사이의 순서는 서버가 매긴 seq를 정답으로 삼아요.</p>
        </>}
        prevent={[
          <>개발자 도구 Network throttling을 느린 프리셋으로 두고 메시지를 연타해 봐요</>,
          <>메시지 목록 상태를 배열 하나로 들지 말고 <code>cid</code>를 키로 한 맵과 정렬된 id 목록으로 나눠 들어요. 같은 키에 두 번 넣어도 하나만 남아요</>,
          <>‘같은 cid는 한 번만 저장’을 API 명세에 적고 서버 테스트로 묶어요</>,
        ]}
        links={[['#/dev/network/net-double', '저장 연타로 중복 호출'], ['#/dev/realtime/rc-ws-resub', '재연결 후 구독 · 누락 이벤트 복구'], ['#/dev/realtime/rc-ws-scale', '서버 여러 대에서 메시지 누락']]}
      />

      <Issue id="rc-ws-flood"
        demo={f => <FloodDemo fixed={f} />}
        demoNote={<>메시지는 가짜 스트림(MessageChannel)으로 하나씩 따로 들어오고, 렌더 비용은 진짜예요. 행을 그릴 때마다 일부러 0.15ms씩 일을 시켰어요. 버튼을 누르면 4초 동안만 받고, 페이지가 오래 멈추지 않게 밀린 메시지는 400개까지만 쌓아요.</>}
        cause={<>
          <p>값이 빨리 바뀌는 시간대가 되면 화면이 버벅이고 검색창에 친 글자가 늦게 따라와요. 처음엔 차트 라이브러리를 의심하게 되는데, Performance 패널로 몇 초만 녹화해 보면 메시지 하나마다 React 커밋이 하나씩 찍히고 그 사이가 빈틈 없이 차 있어요. 조용한 시간에 개발하면 멀쩡해서 놓치기 쉬워요.</p>
          <p>웹소켓 메시지는 하나하나가 따로 실행되는 작업이에요. React는 같은 작업 안의 업데이트만 묶어 주니, 메시지마다 스토어를 바꾸면 렌더도 메시지 수만큼 일어나요. Zustand·Redux처럼 <code>useSyncExternalStore</code>로 붙는 스토어는 업데이트를 동기로 처리해서 더 그래요. 값 하나 바뀌었는데 <b>목록 전체가 다시 그려지면</b> 초당 메시지 수 × 행 수만큼 일이 생기고, 클릭과 입력은 그 뒤에 줄을 서요.</p>
        </>}
        quick={{
          lang: 'React · Zustand',
          bad: `
socket.on('tick', t => {
- usePrices.setState({ [t.sym]: t.price })   // 메시지마다 렌더
})

function Board() {
- const prices = usePrices()                 // 값 하나만 바뀌어도 표 전체가 다시 그려져요
  return SYMBOLS.map(s => <Row key={s} sym={s} price={prices[s]} />)
}`,
          good: `
+ const buf = new Map<string, number>()
+ let raf = 0
socket.on('tick', t => {
+ buf.set(t.sym, t.price)                    // 같은 종목은 마지막 값만 남아요
+ raf ||= requestAnimationFrame(() => {
+   raf = 0
+   usePrices.setState(Object.fromEntries(buf))   // 한 프레임에 한 번만
+   buf.clear()
+ })
})

+ const Row = memo(function Row({ sym }: { sym: string }) {
+   const price = usePrices(s => s[sym])     // 자기 값만 구독해요
  return <tr><td>{sym}</td><td>{price}</td></tr>
+ })`,
        }}
        root={<>
          <p>받는 속도와 그리는 속도를 떼어 놔요. 메시지는 버퍼(키별 마지막 값)에 모으고 화면에는 프레임마다, 혹은 사람이 읽을 수 있는 간격(100~250ms)으로 한 번만 반영해요. 버퍼가 키별 마지막 값이라 탭이 숨어서 <code>requestAnimationFrame</code>이 멈춰도 메모리가 늘지 않아요. 컴포넌트는 자기 값만 구독하게 쪼개고 <code>memo</code>로 감싸서 바뀐 행만 다시 그려요.</p>
          <p>그래도 무거우면 메시지 해석(JSON 파싱, 집계)을 Web Worker로 옮기고, 서버에는 ‘초당 최대 몇 번’으로 묶어서 보내 달라고 요청해요. 1초에 수백 번 바뀌는 숫자는 사람 눈에 읽히지도 않아요. 빠르게 움직이는 차트는 DOM보다 캔버스가 잘 버텨요.</p>
        </>}
        prevent={[
          <>개발 환경에 ‘폭주 모드’를 둬요. 가짜 서버가 초당 수백 개를 보내게 해 놓고 Performance 패널로 녹화해요</>,
          <>React DevTools의 ‘Highlight updates when components render’를 켜면 값 하나에 표 전체가 깜빡이는지 금방 보여요</>,
          <>소켓 핸들러가 스토어를 직접 바꾸지 못하게 하고, 버퍼를 거치는 함수 하나만 연결 모듈에서 내보내요</>,
        ]}
        links={[['#/dev/perf/perf-memo', 'useMemo · useCallback 누락과 오남용'], ['#/dev/state/state-context', 'Context 값 일부 변경에 전체 리렌더'], ['#/dev/perf/perf-virtual', '대용량 표에 가상화 없음']]}
      />

      <Issue id="rc-ws-backpressure"
        demo={f => <BackpressureDemo fixed={f} />}
        demoNote={<>{SIM} 업로드가 400KB/s인 망이라고 치고, bufferedAmount도 흉내 낸 값이에요. 0.8초마다 300바이트짜리 채팅이 하나씩 나가요.</>}
        cause={<>
          <p><code>ws.send()</code>는 데이터를 브라우저의 보내기 대기열에 넣고 곧장 돌아와요. 실제로 망에 나가는 속도는 업로드 대역폭이 정해요. 4MB 파일을 한 번에 <code>send</code>하면 업로드가 느린 망에서는 10초 넘게 대기열을 차지하고, 그 뒤에 넣은 채팅·커서 위치·하트비트는 파일이 다 나갈 때까지 기다려요. 연결 하나는 메시지를 한 줄로 내보내서 뒤 메시지가 앞 메시지를 앞지를 수 없어요.</p>
          <p>대기열에 남은 바이트 수는 <code>ws.bufferedAmount</code>로 읽을 수 있어요. 이걸 안 보고 보내면 앱은 다 보냈다고 믿는데 실제로는 한참 뒤에 나가요. 하트비트까지 밀리면 서버가 응답 없는 연결로 보고 끊어 버리기도 해요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
async function sendFile(file: File) {
- ws.send(await file.arrayBuffer())   // 4MB가 한 덩어리로 대기열에 들어가요
}`,
          good: `
const CHUNK = 64 * 1024
const HIGH = 256 * 1024               // 대기열이 이만큼 넘으면 쉬어요

async function sendFile(file: File) {
+ for (let off = 0; off < file.size; off += CHUNK) {
+   while (ws.bufferedAmount > HIGH) await sleep(50)   // 대기열이 줄 때까지 기다려요
+   ws.send(await file.slice(off, off + CHUNK).arrayBuffer())
+ }
}`,
        }}
        root={<>
          <p>큰 파일은 웹소켓으로 보내지 않는 쪽이 깔끔해요. HTTP로 올리고(필요하면 미리 서명된 URL로 저장소에 직접), 소켓으로는 ‘업로드 끝남’ 이벤트만 알려요. HTTP 업로드 쪽에는 진행률·재시도·이어 올리기를 돕는 도구도 많아요.</p>
          <p>소켓으로 꼭 보내야 하면 조각으로 나누고 <code>bufferedAmount</code>가 일정 값 아래일 때만 다음 조각을 넣어요. 그래야 채팅이나 하트비트가 조각 사이로 끼어들 수 있어요. 급한 메시지와 큰 데이터를 연결 두 개로 나누는 방법도 있어요. Chromium 계열에는 대기열 압력을 스트림으로 다루는 <code>WebSocketStream</code>이 있는데, 다른 브라우저 지원 여부를 확인하고 써요.</p>
        </>}
        prevent={[
          <>소켓 메시지 크기 상한을 정해서 양쪽에서 검사해요. Node <code>ws</code> 서버는 <code>maxPayload</code> 옵션으로 막을 수 있어요</>,
          <>운영체제 수준의 네트워크 제한 도구(macOS Network Link Conditioner 등)로 업로드를 1Mbps쯤으로 묶고, 파일을 보내는 동안 채팅이 밀리는지 봐요</>,
          <>모니터링 이벤트에 전송 직전 <code>bufferedAmount</code> 값을 같이 남겨요</>,
        ]}
        links={[['#/dev/realtime/rc-ws-heartbeat', '하트비트 없는 반쯤 열린 연결'], ['#/dev/realtime/rc-ws-flood', '메시지 폭주로 렌더링 과부하']]}
      />
    </>
  )
}
