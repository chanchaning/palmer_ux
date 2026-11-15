/* 11 실시간 통신 · 폴링 · SSE 함정 */
import { Issue } from '../ui'
import './realtime-sse.css'
import { BufferDemo, LastIdDemo, PollDemo, SseLimitDemo, TimeoutDemo, TokenDemo } from './realtime-sse-demos'

const SIM = '이 데모 안의 가짜 서버로 만든 시뮬레이션이에요. 진짜 주소로는 연결하지 않아요.'

export default function SseIssues() {
  return (
    <>
      <Issue id="rc-poll-overlap"
        demo={f => <PollDemo fixed={f} />}
        demoNote={<>{SIM} 가짜 서버는 동시에 걸린 요청이 많을수록 느리게 답해요. 고친 뒤에는 진짜 <code>visibilitychange</code>를 봐서, 이 탭을 숨기면 폴링을 쉬어요.</>}
        cause={<>
          <p><code>setInterval(fetchStatus, 1000)</code>은 앞 요청이 끝났는지 보지 않고 1초마다 새 요청을 보내요. 서버가 빨리 답할 땐 티가 안 나다가, 응답이 1초를 넘기는 순간부터 요청이 겹치기 시작해요. 겹친 요청만큼 서버는 더 바빠지고, 응답이 늦어진 만큼 요청은 또 쌓여요. 서버가 잠깐 느려진 것뿐인데 클라이언트가 부하를 키워서 스스로 회복하지 못하게 만들어요.</p>
          <p>응답이 보낸 순서대로 온다는 보장도 없어요. 늦게 출발한 요청이 먼저 도착하고, 그 뒤에 도착한 <b>옛 응답이 최신 값을 덮어써서</b> 화면 숫자가 뒤로 갔다가 다시 돌아와요.</p>
        </>}
        quick={{
          lang: 'React · TSX',
          bad: `
useEffect(() => {
- const id = setInterval(async () => {
-   const res = await fetch('/api/line/3/status')
-   setStatus(await res.json())
- }, 1000)
  return () => clearInterval(id)
}, [])`,
          good: `
useEffect(() => {
  const ctrl = new AbortController()
  let timer = 0
+ async function tick() {
+   if (!document.hidden) {
+     try {
+       const res = await fetch('/api/line/3/status', { signal: ctrl.signal })
+       setStatus(await res.json())
+     } catch { /* 실패해도 다음 차례에 다시 해요 */ }
+   }
+   if (!ctrl.signal.aborted) timer = window.setTimeout(tick, 1000)   // 응답을 받은 뒤에 다음 예약
+ }
  tick()
  return () => { ctrl.abort(); clearTimeout(timer) }
}, [])`,
        }}
        root={<>
          <p>폴링은 ‘끝나면 다음 예약’으로 짜요. 간격을 응답이 끝난 시점부터 세니 동시에 걸린 요청은 늘 하나뿐이에요. 실패가 이어지거나 응답이 느려지면 간격을 2배씩 늘렸다가 성공하면 되돌리고, 탭이 숨겨져 있으면 쉬어요.</p>
          <p>TanStack Query의 <code>refetchInterval</code>을 쓰면 이런 처리를 직접 덜 짜도 돼요. 숨긴 탭에서는 기본으로 멈추고(<code>refetchIntervalInBackground: false</code>), 같은 키로 진행 중인 요청이 있으면 새로 보내지 않고 그 결과를 기다려요. 1초보다 자주 바뀌는 값을 여러 화면에서 보고 있다면 폴링 대신 SSE나 WebSocket으로 서버가 밀어 주게 바꾸는 게 맞아요.</p>
        </>}
        prevent={[
          <>개발자 도구 Network에서 ‘Slow 4G’를 걸고 폴링 화면을 1분 띄워 둬요. 같은 주소 요청이 pending으로 겹쳐 쌓이면 이 문제예요</>,
          <>코드에서 <code>setInterval(async</code>를 검색해 봐요</>,
          <>응답에 서버 시각이나 버전 번호를 넣고, 화면 값보다 오래된 응답은 버려요. 순서가 뒤집혀도 숫자가 뒤로 가지 않아요</>,
          <>폴링 간격을 서버가 응답 헤더로 알려 주게 하면, 장애 때 배포 없이 서버 쪽에서 간격을 늘릴 수 있어요</>,
        ]}
        links={[['#/dev/network/net-retry', '재시도 · 대체 UI 없음'], ['#/dash/fe', '관제 대시보드 · FE 구현 (폴링 · SSE · 웹소켓 비교)']]}
      />

      <Issue id="rc-sse-buffer"
        demo={f => <BufferDemo fixed={f} />}
        demoNote={<>{SIM} 서버는 0.6초마다 알림을 보내고, 프록시 버퍼는 4KB로 잡았어요.</>}
        cause={<>
          <p>로컬에서는 알림이 바로바로 오는데, 스테이징에 올리면 한참 조용하다가 열 개쯤이 한꺼번에 들어와요. 처음엔 서버가 늦게 보내는 줄 알고 서버 코드부터 보게 되는데, 서버 로그에는 제때 보냈다고 찍혀 있어요. 개발자 도구 Network에서 스트림 요청을 열고 EventStream 탭을 보면 도착 시각이 몇 초 간격으로 뭉쳐 있어요. 이게 보이면 서버와 브라우저 사이 어딘가가 응답을 모았다가 내보내고 있는 거예요.</p>
          <p>대개는 리버스 프록시예요. nginx는 upstream 응답을 버퍼에 모았다가 보내는 게 기본이에요(<code>proxy_buffering on</code>). 일반 API 응답에는 도움이 되는 설정인데, SSE처럼 조금씩 끝없이 오는 응답은 <b>버퍼가 찰 때까지 붙잡혀요</b>. 서버 앞단의 gzip 압축 미들웨어도 압축할 만큼 모일 때까지 내보내지 않아서 같은 증상을 만들어요. 로컬에는 이런 단계가 없으니 재현이 안 돼요.</p>
        </>}
        quick={{
          lang: 'nginx',
          bad: `
location /api/ {
  proxy_pass http://app;
- # 버퍼링 기본값(on) 그대로. 스트림도 모았다가 보내요
}`,
          good: `
location /api/notices/stream {
  proxy_pass http://app;
+ proxy_buffering off;              # 받는 대로 바로 내보내요
+ proxy_cache off;
+ proxy_http_version 1.1;
+ proxy_set_header Connection '';
+ gzip off;
}`,
        }}
        root={<>
          <p>SSE 응답에는 서버가 직접 <code>X-Accel-Buffering: no</code> 헤더를 붙여요. nginx는 upstream이 준 이 헤더를 보고 그 응답만 버퍼링을 꺼요. 경로별 nginx 설정이 빠지거나 덮여도 앱 쪽에서 막아 둔 셈이 돼요. 압축 미들웨어는 <code>text/event-stream</code>을 건너뛰게 하거나, 이벤트를 쓸 때마다 flush 해요(Express <code>compression</code>은 <code>res.flush()</code>를 제공해요).</p>
          <p>버퍼링하는 곳이 nginx 하나라는 보장은 없어요. 로드밸런서, CDN, 사내 보안 프록시, 클라우드 앱 플랫폼 앞단마다 동작이 달라요. 배포 경로에 있는 단계를 적어 두고, 단계마다 스트림을 그대로 흘려 보내는지 확인해요. 끝까지 버퍼링을 못 끄는 단계가 있으면 그 경로만 WebSocket으로 돌리는 것도 방법이에요.</p>
        </>}
        prevent={[
          <><code>curl -N</code>으로 프록시 앞(앱 서버 직접)과 뒤(공개 주소)에서 각각 스트림을 받아 봐요. 앞에선 바로 오는데 뒤에서 뭉치면 그 사이 단계가 원인이에요</>,
          <>스테이징에서 EventStream 탭의 도착 시각과 서버 로그의 보낸 시각을 나란히 놓고 봐요</>,
          <>nginx 설정을 공통 템플릿으로 바꾸는 작업이 있으면 SSE 경로의 예외가 살아 있는지 같이 확인해요. 템플릿에 덮여 조용히 사라지기 쉬워요</>,
        ]}
        links={[['#/dev/realtime/rc-sse-timeout', '게이트웨이 idle timeout으로 주기적 끊김']]}
      />

      <Issue id="rc-sse-timeout"
        demo={f => <TimeoutDemo fixed={f} />}
        demoNote={<>{SIM} 시간은 10배 빠르게 흘러요. 게이트웨이 idle timeout은 60초, 알림은 30초~2분 간격으로 띄엄띄엄 와요.</>}
        cause={<>
          <p>알림이 뜸한 화면을 띄워 두면 연결이 1분쯤마다 끊겼다가 몇 초 뒤 다시 붙어요. EventSource가 알아서 다시 연결하니 화면으로는 거의 티가 안 나고, 개발자 도구 Network에 같은 스트림 요청이 일정한 간격으로 줄줄이 늘어선 걸 보고서야 눈치채요. 간격이 거의 정확히 60초라는 게 힌트예요. 서버 코드에는 그런 숫자가 없어서 한동안 앱 쪽 버그를 찾게 되고, 알림이 자주 오는 개발 환경에서는 아예 안 생겨요.</p>
          <p>로드밸런서와 리버스 프록시는 일정 시간 아무 바이트도 오가지 않은 연결을 끊어요. nginx의 <code>proxy_read_timeout</code>과 AWS ALB의 idle timeout이 둘 다 기본 60초예요. SSE는 보낼 이벤트가 없으면 조용히 기다리기만 해서, 1분 넘게 이벤트가 없을 때마다 중간에서 잘려요. 다시 붙는 몇 초 사이에 생긴 이벤트는 따로 챙기지 않으면 사라져요.</p>
        </>}
        quick={{
          lang: 'Node · Express',
          bad: `
app.get('/api/notices/stream', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
  const send = n => res.write(\`data: \${JSON.stringify(n)}\\n\\n\`)
  bus.on('notice', send)
- // 알림이 없으면 아무것도 안 보내요 → 60초 뒤 중간에서 끊겨요
  req.on('close', () => bus.off('notice', send))
})`,
          good: `
app.get('/api/notices/stream', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
+ res.write('retry: 3000\\n\\n')                 // 끊기면 3초 뒤 다시 연결
  const send = n => res.write(\`data: \${JSON.stringify(n)}\\n\\n\`)
  bus.on('notice', send)
+ const ping = setInterval(() => res.write(': ping\\n\\n'), 15_000)   // 15초마다 주석 한 줄
  req.on('close', () => {
+   clearInterval(ping)
    bus.off('notice', send)
  })
})`,
        }}
        root={<>
          <p>서버가 15~30초마다 하트비트를 보내요. 콜론으로 시작하는 줄은 SSE 주석이라 브라우저가 이벤트로 넘기지 않고 버려요. 중간 장비는 바이트가 흐르는 걸 보고 연결을 살려 둬요. 간격은 경로에 있는 가장 짧은 timeout의 절반 아래로 잡아요.</p>
          <p>주석은 JS에서 보이지 않아서 브라우저 쪽에서 ‘조용히 죽은 연결’을 알아채는 데는 못 써요. 화면에서도 감시하려면 <code>event: ping</code>처럼 이름 붙은 이벤트로 보내고, 정해 둔 시간 동안 아무것도 안 오면 연결을 닫고 새로 열어요. 이때 직접 새로 연 EventSource는 <code>Last-Event-ID</code>를 보내지 않으니 마지막 id를 쿼리로 넘겨요. timeout 값을 늘리는 것만으로는 부족해요. 경로에 장비가 하나 더 생기면 같은 일이 또 생겨요.</p>
        </>}
        prevent={[
          <>알림이 거의 없는 계정으로 스트림 화면을 5분 띄워 두고, Network에 같은 요청이 몇 개 생겼는지 세어 봐요</>,
          <>경로에 있는 장비별 idle timeout(nginx, 로드밸런서, CDN, 사내 프록시)을 표로 적어 둬요</>,
          <>서버 로그에 스트림 연결이 유지된 시간을 남겨요. 60초 근처에 몰려 있으면 이 문제예요</>,
        ]}
        links={[['#/dev/realtime/rc-sse-lastid', '재연결 사이에 놓친 이벤트 (Last-Event-ID)'], ['#/dev/realtime/rc-ws-heartbeat', '하트비트 없는 반쯤 열린 연결']]}
      />

      <Issue id="rc-sse-limit"
        demo={f => <SseLimitDemo fixed={f} />}
        demoNote={<>연결 자리는 시뮬레이션이에요. ‘리더 탭’ 방식에서 다른 탭으로 알림을 나눠 주는 건 이 데모 이름으로 연 진짜 BroadcastChannel이에요.</>}
        cause={<>
          <p>탭을 여러 개 띄워 두고 쓰는 사용자에게서만 “아무것도 안 눌려요”가 와요. 새로고침하면 잠깐 괜찮다가 또 멈추고, 탭 하나로 테스트하는 개발자 자리에선 재현이 안 돼요. 막힌 탭에서 개발자 도구 Network를 열면 API 요청이 전부 pending이고, 요청 하나를 골라 Timing을 보면 Queueing·Stalled가 길게 잡혀 있어요. 서버 로그에는 그 요청이 아예 없어요. 서버가 아니라 브라우저 안에서 줄을 서고 있다는 뜻이에요.</p>
          <p>HTTP/1.1에서 크롬은 한 호스트에 동시 연결을 6개까지만 열고, 이 한도는 탭마다가 아니라 <b>브라우저 전체</b>에 걸려요. SSE는 연결 하나를 계속 붙잡고 있어서 탭 6개가 각자 SSE를 열면 자리가 다 차요. 그 뒤로는 어느 탭에서든 같은 호스트로 가는 요청이 자리가 날 때까지 기다려요.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
// 탭마다 실행돼요. 탭 6개면 연결 6개
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
          <p>서버를 HTTP/2 이상으로 바꾸는 게 가장 확실해요. 연결 하나에 여러 요청을 동시에 흘려서(멀티플렉싱) 탭이 많아도 막히지 않아요. 동시 스트림 수는 서버 설정이 정하는데 보통 100개 안팎이에요. Network의 Protocol 열이 <code>h2</code>·<code>h3</code>인지 확인하고, 사내 프록시가 1.1로 낮추는 경우가 있으니 스테이징과 운영을 따로 봐요.</p>
          <p>연결도 탭 전체에서 하나만 둬요. Web Locks로 리더를 뽑고 BroadcastChannel로 나누거나, SharedWorker가 연결을 들게 해요. 안드로이드 Chrome은 SharedWorker를 지원하지 않으니 그쪽은 리더 방식이 안전해요. 숨겨진 탭에서 연결을 닫았다가 돌아오면 다시 여는 방법도 있어요.</p>
        </>}
        prevent={[
          <>QA 시나리오에 같은 사이트 탭 7개 열기를 넣어요</>,
          <>ESLint <code>no-restricted-globals</code>에 <code>EventSource</code>를 넣고, 스트림을 여는 공용 모듈에서만 풀어 줘요. 화면마다 따로 여는 코드가 다시 생기지 않아요</>,
        ]}
        links={[['#/dev/routing/rt-multitab', '여러 탭 간 세션 · 장바구니 불일치'], ['#/dash/fe', '관제 대시보드 · FE 구현 (연결은 하나만)']]}
      />

      <Issue id="rc-sse-lastid"
        demo={f => <LastIdDemo fixed={f} />}
        demoNote={<>{SIM} 서버는 0.4초마다 id가 붙은 알림을 보내고 최근 100개를 보관해요. 끊기면 1초 간격으로 다시 연결해요.</>}
        cause={<>
          <p>“알림이 안 왔어요” 문의를 받고 서버 로그를 보면 보낸 기록은 있어요. 연결 로그를 같이 보면 그 시각 전후로 스트림이 끊겼다 다시 붙어 있어요. EventSource가 알아서 다시 연결하니 그 사이 일도 챙겨 주겠거니 하고 넘어가기 쉬운데, 브라우저가 해 주는 건 다시 연결하면서 마지막으로 받은 <code>id</code>를 <code>Last-Event-ID</code> 헤더에 실어 보내는 데까지예요. <b>밀린 이벤트를 다시 보내는 건 서버 몫</b>이에요.</p>
          <p>헤더가 아예 비어 오는 경우도 있어요. 서버가 이벤트에 <code>id:</code> 줄을 안 붙였거나, 에러가 날 때 코드에서 <code>es.close()</code> 하고 <code>new EventSource()</code>로 새로 만들면 브라우저가 기억하던 id가 사라져요. 재현하려면 끊긴 동안 이벤트가 생겨야 해서, Offline을 켜 둔 채 서버에서 일부러 알림을 만들어 봐야 보여요.</p>
        </>}
        quick={{
          lang: 'Node · TypeScript',
          bad: `
// 서버: id 없이 보내요
- bus.on('notice', n => res.write(\`data: \${JSON.stringify(n)}\\n\\n\`))

// 브라우저: 에러가 나면 직접 새로 만들어요. 마지막 id가 사라져요
let es = new EventSource('/api/notices/stream')
- es.onerror = () => { es.close(); es = new EventSource('/api/notices/stream') }`,
          good: `
// 서버: 이벤트마다 순서 id, 다시 붙으면 그 뒤부터 먼저 보내요
+ const write = n => res.write(\`id: \${n.seq}\\ndata: \${JSON.stringify(n)}\\n\\n\`)
+ const since = Number(req.headers['last-event-id'] ?? req.query.since ?? 0)
+ if (since) recent.after(since).forEach(write)
bus.on('notice', write)

// 브라우저: 재연결은 EventSource에 맡겨요.
// 직접 다시 열어야 할 땐 마지막 id를 넘겨요
let lastId = ''
es.onmessage = e => { lastId = e.lastEventId; show(JSON.parse(e.data)) }
+ const reopen = () => new EventSource(\`/api/notices/stream?since=\${lastId}\`)`,
        }}
        root={<>
          <p>서버가 최근 이벤트를 순서 번호와 함께 일정 기간 보관해요. 메모리 링 버퍼도 되고, 서버가 여러 대면 Redis Stream처럼 공용 저장소가 필요해요. 연결이 들어오면 <code>Last-Event-ID</code>(직접 다시 연 연결이면 쿼리의 <code>since</code>) 다음 것부터 먼저 보내고 실시간으로 넘어가요. 화면은 seq로 중복을 걸러요.</p>
          <p>보관 범위보다 오래 끊긴 사용자도 생겨요. 범위 밖 id가 오면 서버가 <code>event: reset</code> 같은 이벤트를 보내고, 화면은 REST로 최신 목록을 새로 받아요. 알림 목록처럼 하나도 놓치면 안 되는 데이터라면 SSE는 ‘새 게 있다’는 신호로만 쓰고 내용은 API로 가져오는 방식이 더 튼튼해요.</p>
        </>}
        prevent={[
          <>Network에서 Offline을 10초 켰다 끄는 사이 서버에서 알림을 만들어 보내요. 다시 붙은 뒤 그 알림이 오는지 봐요</>,
          <>EventStream 탭의 ID 열이 비어 있으면 서버가 <code>id:</code>를 안 보내고 있어요</>,
          <>보관 기간과 범위 밖일 때의 동작(reset 이벤트)을 API 명세에 적어 둬요</>,
        ]}
        links={[['#/dev/realtime/rc-ws-resub', '재연결 후 구독 · 누락 이벤트 복구 실패'], ['#/dev/realtime/rc-sse-timeout', '게이트웨이 idle timeout으로 주기적 끊김']]}
      />

      <Issue id="rc-sse-token"
        demo={f => <TokenDemo fixed={f} />}
        demoNote={<>{SIM} 로그 줄은 nginx 기본 접근 로그 형식을 흉내 냈고, 토큰·IP도 가짜예요.</>}
        cause={<>
          <p>브라우저 <code>EventSource</code>는 URL과 <code>withCredentials</code> 옵션만 받아요. 요청 헤더를 붙일 방법이 없어요. 다른 API는 <code>Authorization: Bearer</code>로 인증하는데 스트림만 그걸 못 쓰니, 가장 쉬운 길로 토큰을 쿼리 문자열에 넣게 돼요.</p>
          <p>URL은 비밀을 담는 자리가 아니에요. nginx·로드밸런서·CDN의 접근 로그는 요청 줄을 쿼리까지 통째로 남기고, APM이나 에러 수집 도구도 URL을 그대로 모아요. 로그는 보는 사람이 많고 오래 남아요. 거기 찍힌 <b>액세스 토큰은 만료 전까지 다른 API에도 그대로 쓸 수 있어요</b>.</p>
        </>}
        quick={{
          lang: 'TypeScript',
          bad: `
- const es = new EventSource(\`/api/notices/stream?token=\${accessToken}\`)`,
          good: `
// 1) 헤더로 인증해서 한 번 쓰고 버릴 티켓을 받아요
+ const { ticket } = await fetch('/api/notices/ticket', {
+   method: 'POST',
+   headers: { Authorization: \`Bearer \${accessToken}\` },
+ }).then(r => r.json())

// 2) 티켓은 30초 안에 연결 한 번만 통해요
+ const es = new EventSource(\`/api/notices/stream?ticket=\${ticket}\`)`,
        }}
        root={<>
          <p>API와 같은 사이트라면 쿠키 인증이 가장 간단해요. <code>HttpOnly; Secure; SameSite</code> 쿠키는 EventSource 요청에도 자동으로 실려요. 다른 출처라면 <code>{'new EventSource(url, { withCredentials: true })'}</code>와 서버 CORS의 <code>Access-Control-Allow-Credentials</code>를 같이 맞춰요.</p>
          <p>토큰 방식을 유지해야 하면 위처럼 일회용 티켓을 써요. EventSource는 끊기면 같은 URL로 다시 연결하니 이미 쓴 티켓은 거절되고, 서버가 401을 주면 브라우저는 재연결을 멈춰요(<code>readyState === EventSource.CLOSED</code>). 그때 새 티켓을 받아 다시 여는 코드를 함께 둬요. 헤더가 꼭 필요하면 <code>fetch</code>로 스트림을 직접 읽는 라이브러리(<code>@microsoft/fetch-event-source</code> 등)를 쓸 수 있지만, 그만큼 재연결과 <code>Last-Event-ID</code>를 직접 챙겨야 해요.</p>
        </>}
        prevent={[
          <>운영 로그를 <code>token=</code>으로 한 번 검색해 봐요. 찍혀 있으면 그 토큰들이 만료될 때까지는 유출로 보고 대응해요</>,
          <>nginx 접근 로그 형식에서 <code>$request</code> 대신 <code>$request_method $uri</code>를 남기면 쿼리가 빠져요</>,
          <>APM·에러 수집 도구에 URL 쿼리 마스킹 규칙(<code>token</code>, <code>ticket</code>, <code>code</code>)을 넣어요</>,
        ]}
        links={[['#/dev/debug/dbg-console', '운영 콘솔에 토큰 · 개인정보 출력'], ['#/dev/realtime/rc-ws-auth', '토큰 만료 · 로그아웃 뒤에도 열린 소켓']]}
      />
    </>
  )
}
