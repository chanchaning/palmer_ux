/* 11 실시간 통신 — MQTT 함정 (기본 개념은 위 개요 부분에서 다뤄요) */
import { Issue } from '../ui'
import './realtime-mqtt.css'
import { ClientIdDemo, LwtDemo, QosDemo, RetainedDemo, WildcardDemo } from './realtime-mqtt-demos'

const SIM = '이 데모 안의 가짜 브로커로 만든 시뮬레이션이에요. 바깥으로 연결을 열지 않아요.'

export default function MqttIssues() {
  return (
    <>
      <Issue id="rc-mqtt-clientid"
        demo={f => <ClientIdDemo fixed={f} />}
        demoNote={<>{SIM} 두 탭도 데모 안에서 흉내 낸 클라이언트예요. 끊기면 mqtt.js 기본값처럼 1초 뒤 다시 붙어요.</>}
        cause={<>
          <p>혼자 테스트할 땐 멀쩡한데, 대시보드를 탭 두 개로 띄우거나 같은 계정으로 두 사람이 들어오면 1초 간격으로 붙었다 끊겼다를 되풀이해요. 처음엔 망이나 브로커가 불안정한 줄 알고 그쪽부터 봐요. 개발자 도구 Network에서 웹소켓 연결이 줄줄이 새로 생기고, 브로커 로그에는 같은 clientId가 들어올 때마다 기존 연결을 끊었다는 줄이 찍혀 있어요(문구는 브로커마다 달라요).</p>
          <p>MQTT는 clientId 하나에 연결 하나만 허락해요. 같은 clientId로 새 연결이 오면 브로커는 먼저 있던 연결을 끊어요(<b>session takeover</b>). 끊긴 쪽은 자동 재연결로 다시 붙으면서 상대를 끊고, 둘이 번갈아 서로를 밀어내요. mqtt.js는 clientId를 안 주면 무작위 값을 만들어 주는데, 세션을 이어 쓰려고 사용자 id로 고정했다가 이렇게 되는 경우가 많아요.</p>
        </>}
        quick={{
          lang: 'mqtt.js',
          bad: `
import mqtt from 'mqtt'

const client = mqtt.connect('wss://broker.example.com/mqtt', {
- clientId: \`web-\${user.id}\`,    // 탭이 두 개면 같은 값이 둘
- clean: false,
  username: user.id,
  password: token,
})`,
          good: `
import mqtt from 'mqtt'

+ const clientId = \`web-\${user.id}-\${crypto.randomUUID().slice(0, 8)}\`   // 탭마다 새로

const client = mqtt.connect('wss://broker.example.com/mqtt', {
+ clientId,
+ clean: true,            // 화면은 붙을 때마다 다시 구독해요
+ protocolVersion: 5,
  username: user.id,
  password: token,
})

+ // MQTT 5 브로커가 같은 clientId 때문에 밀어냈을 때
+ client.on('disconnect', packet => {
+   if (packet.reasonCode === 0x8e) {     // Session taken over
+     client.end(true)
+     showNotice('다른 곳에서 같은 연결을 열어서 끊었어요')
+   }
+ })`,
        }}
        root={<>
          <p>clientId는 연결마다 달라야 해요. 브라우저에서는 사용자 id 뒤에 무작위 값을 붙여 탭마다 새로 만들어요. 세션을 이어 써야 하는 쪽은 대개 기기예요. 기기는 시리얼 번호처럼 하나뿐인 값을 쓰고, 브라우저 대시보드는 clean session으로 붙어서 필요한 토픽을 다시 구독하면 충분해요.</p>
          <p>탭마다 연결을 따로 여는 게 부담이면 리더 탭 하나만 브로커에 붙고 나머지 탭에는 BroadcastChannel로 나눠 줘요. MQTT 5에서는 밀려나는 쪽이 reason code 0x8E(Session taken over)가 담긴 DISCONNECT를 받아요. 이걸 받으면 다시 붙지 말고 안내를 띄워야 핑퐁이 멈춰요.</p>
        </>}
        prevent={[
          <>같은 계정으로 탭 두 개, 브라우저 두 개를 동시에 여는 시나리오를 QA에 넣어요</>,
          <>브로커 대시보드에서 같은 clientId의 접속 횟수를 봐요. 몇 초 간격으로 계속 늘면 거의 이 문제예요</>,
          <>clientId 길이를 확인해요. MQTT 3.1.1은 23바이트까지만 반드시 받아 주게 되어 있어서, 긴 id를 거부하는 브로커가 있을 수 있어요</>,
        ]}
        links={[['#/dev/realtime/rc-sse-limit', '탭마다 SSE로 연결 수 제한 초과 (리더 탭)'], ['#/dev/routing/rt-multitab', '여러 탭 간 세션 불일치']]}
      />

      <Issue id="rc-mqtt-retained"
        demo={f => <RetainedDemo fixed={f} />}
        demoNote={<>{SIM} 보일러는 3시간 12분 전에 마지막 값을 retain으로 보내고 꺼진 걸로 시작해요.</>}
        cause={<>
          <p>대시보드를 열자마자 숫자가 떠서 잘 되는 줄 알았는데, 그 기기는 몇 시간 전에 꺼져 있었어요. 현장에서 ‘값이 안 바뀐다’는 연락이 와도 화면엔 ‘방금 갱신’이 떠 있으니 FE 렌더링이나 캐시부터 의심하게 돼요. MQTT Explorer 같은 클라이언트로 같은 토픽을 구독해 보면 그 메시지가 retained로 들어오는 게 보여요.</p>
          <p>retain을 켜고 보낸 메시지는 브로커가 토픽마다 마지막 하나를 보관했다가, 새로 구독하는 쪽에 먼저 넘겨줘요. 언제 만든 값인지는 알려 주지 않아요. 화면이 <b>받은 시각을 갱신 시각으로</b> 쓰면 3시간 전 값도 방금 값이 돼요. 명령 토픽에 retain을 켜 둔 경우는 더 위험해요. 재부팅한 기기가 구독하자마자 옛 명령을 다시 실행해요.</p>
        </>}
        quick={{
          lang: 'mqtt.js',
          bad: `
// 기기
- client.publish('plant/boiler-7/temp', '72.4', { retain: true })

// 대시보드
client.subscribe('plant/boiler-7/temp')
client.on('message', (topic, buf) => {
- render({ value: Number(buf.toString()), updatedAt: Date.now() })   // 받은 시각
})`,
          good: `
// 기기 — 측정 시각을 같이 보내요
+ const msg = JSON.stringify({ v: 72.4, ts: Date.now() })
+ client.publish('plant/boiler-7/temp', msg, { retain: true, qos: 1 })

// 대시보드 — 나이는 ts로 계산해요
client.on('message', (topic, buf, packet) => {
+ const { v, ts } = JSON.parse(buf.toString())
+ const stale = Date.now() - ts > 30_000
+ render({ value: v, updatedAt: ts, stale, retained: packet.retain })
})

// 기기를 철거할 때 — 보관된 값 지우기
+ client.publish('plant/boiler-7/temp', '', { retain: true })`,
        }}
        root={<>
          <p>값마다 측정 시각(ts)을 payload에 넣고, 화면은 ts로 나이를 계산해요. 정해 둔 시간보다 오래된 값은 흐리게 ‘3시간 전 값’처럼 보여 줘요. 기기가 살아 있는지는 따로 status 토픽(아래 LWT 항목)으로 받아서 옆에 같이 보여 주면 더 확실해요.</p>
          <p>retain은 ‘마지막 상태’를 담는 토픽에만 켜고 명령·이벤트 토픽에는 끄는 걸 토픽 설계 때 정해 둬요. 기기를 없앴으면 빈 payload를 retain으로 보내 보관된 값을 지워요. MQTT 5라면 <code>messageExpiryInterval</code>을 붙여 만료된 retained 메시지를 새 구독자에게 넘기지 않게 할 수 있어요. 브로커마다 처리가 조금씩 달라서 쓰는 브로커 문서로 확인해요.</p>
        </>}
        prevent={[
          <>기기를 끈 채로 대시보드를 새로 열어 보는 시나리오를 QA에 넣어요. 숫자가 떠도 언제 값인지 보여야 해요</>,
          <>토픽 목록 문서에 토픽마다 retain 여부와 ts 필드를 적어요</>,
          <>ts는 기기 시계를 믿는 값이에요. 기기 NTP 동기화가 꺼져 있으면 나이 계산도 틀려요</>,
          <>테스트하며 retain으로 보낸 메시지는 빈 payload로 지우고 끝내요. 안 지우면 몇 달 뒤에도 그 값이 떠요</>,
        ]}
        links={[['#/dev/realtime/rc-mqtt-lwt', 'keepalive · LWT 없이 오프라인 감지 실패']]}
      />

      <Issue id="rc-mqtt-qos"
        demo={f => <QosDemo fixed={f} />}
        demoNote={<>{SIM} 기기 쪽 망이 끊기는 구간은 누를 때마다 조금씩 달라요. 끊긴 동안 쌓인 명령은 다시 붙으면 차례로 넘어가요.</>}
        cause={<>
          <p>명령 버튼을 눌렀는데 가끔 기기가 반응하지 않아요. 사무실 와이파이에선 재현이 안 되고 LTE 라우터를 쓰는 현장 기기에서만 생겨서 처음엔 펌웨어를 의심하게 돼요. 브로커 로그를 시각으로 맞춰 보면, 메시지는 브로커에 들어왔는데 그때 기기가 끊겨 있었거나 막 다시 붙는 중이었어요.</p>
          <p>mqtt.js의 publish 기본값은 QoS 0이에요. 한 번 보내고 끝이라, 받는 쪽이 그 순간 없었거나 가는 도중에 연결이 끊기면 그대로 사라지고 아무도 다시 보내지 않아요. TCP가 있으니 안전하다고 생각하기 쉽지만 TCP는 연결이 살아 있는 동안만 책임져요. 실제로 적용되는 QoS는 <b>보내는 쪽과 구독한 쪽 중 낮은 값</b>이라서 publish만 1로 올려서는 소용이 없어요.</p>
        </>}
        quick={{
          lang: 'mqtt.js',
          bad: `
// 브라우저 — 명령 보내기
- client.publish('door/7/cmd', 'open')                       // QoS 0

// 기기
- const client = mqtt.connect(URL, { clientId: 'door-7' })    // clean: true 기본값
- client.subscribe('door/7/cmd')                             // QoS 0
client.on('message', () => openDoor())`,
          good: `
// 브라우저 — 명령마다 id와 만료 시각
+ const cmd = { id: crypto.randomUUID(), action: 'open', exp: Date.now() + 10_000 }
+ client.publish('door/7/cmd', JSON.stringify(cmd), { qos: 1 }, err => {
+   if (err) showRetry()       // 브로커가 받았다는 것까지만 확인돼요
+ })

// 기기 — 세션을 남겨 두고 QoS 1로 구독
+ const client = mqtt.connect(URL, { clientId: 'door-7', clean: false })
+ client.subscribe('door/7/cmd', { qos: 1 })
+ const done = new Set<string>()
client.on('message', (topic, buf) => {
  const cmd = JSON.parse(buf.toString())
+ if (done.has(cmd.id) || Date.now() > cmd.exp) return   // 중복·만료는 버려요
+ done.add(cmd.id)
  openDoor()
+ client.publish('door/7/result', JSON.stringify({ id: cmd.id, ok: true }), { qos: 1 })
})`,
        }}
        root={<>
          <p>놓치면 안 되는 명령은 QoS 1로 보내고, 기기는 QoS 1로 구독하면서 세션을 남겨요(3.1.1은 <code>clean: false</code>, MQTT 5는 clean start false에 session expiry interval). 그래야 기기가 잠깐 끊긴 동안 브로커가 명령을 쌓아 두었다가 다시 붙으면 넘겨줘요. QoS 1은 ‘적어도 한 번’이라 PUBACK이 가다가 끊기면 같은 명령이 DUP 표시를 달고 또 와요. 명령 id로 걸러요.</p>
          <p>QoS 2는 왕복이 더 들고 기기 라이브러리 지원도 고르지 않아서, QoS 1과 id 중복 제거로 충분한 경우가 많아요. publish 콜백이 성공해도 브로커가 받았다는 뜻일 뿐이에요. 화면에 ‘실행됨’을 띄우려면 기기가 결과 토픽으로 답을 보내야 하고, 문 열기처럼 늦게 실행되면 위험한 명령은 만료 시각을 넘긴 걸 버려야 해요.</p>
        </>}
        prevent={[
          <>기기 쪽 망을 2~3초 끊었다 붙이는 동안 명령을 연달아 보내고, 보낸 수와 실행 수를 맞춰 봐요</>,
          <>토픽 설계표에 QoS를 적어요. 곧 다음 값이 오는 센서값은 0, 명령·알람은 1 이상</>,
          <>브로커가 세션마다 쌓아 두는 메시지 수 상한(Mosquitto라면 <code>max_queued_messages</code>)을 확인해요. 넘치면 QoS 1이어도 버려져요</>,
        ]}
        links={[['#/dev/realtime/rc-ws-order', '메시지 순서 뒤바뀜 · 중복'], ['#/dev/realtime/rc-mqtt-lwt', 'keepalive · LWT 없이 오프라인 감지 실패']]}
      />

      <Issue id="rc-mqtt-lwt"
        demo={f => <LwtDemo fixed={f} />}
        demoNote={<>{SIM} 시간은 30배 빠르게 흘러요. keepalive 60초면 브로커는 90초쯤 조용할 때 끊어요.</>}
        cause={<>
          <p>공장 정전이나 LTE 모뎀 고장으로 기기가 꺼졌는데 대시보드에는 계속 ‘온라인’이에요. 현장 연락을 받고 브로커 대시보드를 열어 보면 그 기기 연결이 아직 살아 있는 걸로 나와요. 사무실에서 기기 프로그램을 종료해 보면 상태가 잘 바뀌어서 재현이 어려워요. 프로그램 종료는 OS가 TCP를 정상적으로 닫아 주지만 전원이나 선이 나가면 아무 신호 없이 사라지거든요.</p>
          <p>브로커는 조용한 연결이 죽은 건지 할 말이 없는 건지 구분하지 못하니, keepalive의 1.5배 동안 아무 패킷이 없으면 끊어요. keepalive를 0으로 두면 이 검사를 하지 않아요. OS의 TCP keepalive는 기본 간격이 보통 몇 시간이라 기대하기 어려워요. 끊긴 걸 알아채도 남에게 알리는 건 <b>Last Will(LWT)</b>이 해요. 기기가 접속할 때 ‘내가 사라지면 이 토픽에 offline을 보내 줘’라고 미리 맡겨 두는 거예요. online만 retain으로 보내고 will이 없으면 그 online이 끝까지 남아요.</p>
        </>}
        quick={{
          lang: 'mqtt.js',
          bad: `
const client = mqtt.connect(URL, {
  clientId: 'boiler-7',
- keepalive: 0,              // 브로커가 생존 확인을 안 해요
})
client.on('connect', () => {
- client.publish('plant/boiler-7/status', 'online', { retain: true })   // 영영 online
})`,
          good: `
const STATUS = 'plant/boiler-7/status'
const client = mqtt.connect(URL, {
  clientId: 'boiler-7',
+ keepalive: 30,             // 45초쯤 조용하면 브로커가 끊어요
+ will: { topic: STATUS, payload: 'offline', qos: 1, retain: true },
})
client.on('connect', () => {
  client.publish(STATUS, 'online', { qos: 1, retain: true })
})

// 정상 종료 — 이때는 will이 안 나가요
+ function shutdown() {
+   client.publish(STATUS, 'offline', { qos: 1, retain: true }, () => client.end())
+ }`,
        }}
        root={<>
          <p>기기에는 keepalive(보통 30~60초)와 will(status 토픽, offline, retain)을 함께 설정하고, 연결되면 같은 토픽에 online을 retain으로 보내요. 정상 종료할 때는 will이 나가지 않으니 직접 offline을 보내고 끊어요. MQTT 5에서는 DISCONNECT reason code 0x04(Disconnect with Will Message)로 will을 보내 달라고 할 수도 있어요.</p>
          <p>keepalive 60초면 감지까지 최대 90초쯤 걸려요. 더 빨라야 하면 줄이되 배터리와 데이터 비용을 같이 따져요. 반대로 너무 길면 LTE 망의 NAT가 조용한 연결을 먼저 정리해 버리기도 해요. 화면은 status 토픽에 더해 마지막 값의 시각도 같이 보여 주면, will이 늦게 오는 동안에도 사용자가 이상한 걸 알아챌 수 있어요.</p>
        </>}
        prevent={[
          <>오프라인 시험은 전원을 뽑거나 랜선을 빼서 해요. 프로그램 종료로는 이 문제가 드러나지 않아요</>,
          <>status 토픽 이름과 payload 값을 기기 팀과 문서로 맞춰요. 펌웨어마다 <code>offline</code>, <code>0</code>, <code>false</code>가 섞이면 화면이 잘못 읽어요</>,
        ]}
        links={[['#/dev/realtime/rc-ws-heartbeat', '하트비트 없는 반쯤 열린 연결'], ['#/dev/realtime/rc-mqtt-retained', 'retained 메시지의 옛 값'], ['#/dash/fe', '관제 대시보드 · FE 구현']]}
      />

      <Issue id="rc-mqtt-wildcard"
        demo={f => <WildcardDemo fixed={f} />}
        demoNote={<>{SIM} 고객사 두 곳, 라인 4개, 라인마다 기기 30대가 상태·진동·로그를 보내요. 수치는 계산으로 흉내 내요.</>}
        cause={<>
          <p>개발할 때 편하려고 <code>factory/#</code>처럼 #으로 구독하면 그 아래 모든 토픽이 브라우저로 와요. 화면에 필요한 건 라인 하나의 상태값인데, 기기 수백 대의 진동 원시값과 로그까지 웹소켓으로 받아서 JSON을 풀고 버려요. 기기가 늘수록 화면이 느려지고 모바일 데이터도 새요.</p>
          <p>브로커에 토픽 권한(ACL)이 없으면 성능보다 큰 문제가 돼요. 브라우저 번들에 들어간 접속 정보는 누구나 꺼내 볼 수 있어서, 사용자가 콘솔에서 #을 구독하면 <b>다른 고객사 기기 데이터</b>까지 받아 볼 수 있어요. 쓰기 권한까지 열려 있으면 남의 기기에 명령도 보낼 수 있어요.</p>
        </>}
        quick={{
          lang: 'mqtt.js · Mosquitto',
          bad: `
const client = mqtt.connect(URL, {
- username: 'dashboard',                         // 모두 같은 계정
- password: import.meta.env.VITE_MQTT_PASSWORD,  // 번들에 그대로 들어가요
})
- client.subscribe('factory/#')                  // 공장 전체가 브라우저로
client.on('message', (topic, buf) => {
  if (!topic.startsWith('factory/acme/line-3/')) return   // 받아 놓고 버려요
  render(topic, JSON.parse(buf.toString()))
})`,
          good: `
+ const { token } = await api.get('/mqtt/token')   // 사용자별, 몇 분짜리
const client = mqtt.connect(URL, {
+ username: tenantId,
+ password: token,
})
+ client.subscribe('factory/acme/line-3/+/status', { qos: 1 }, (err, granted) => {
+   if (err || granted?.some(g => g.qos >= 128)) showError('구독 권한이 없어요')
+ })

# 브로커 acl_file (Mosquitto) — 사용자 이름이 고객사 id일 때
+ pattern read factory/%u/+/+/status`,
        }}
        root={<>
          <p>구독은 화면에 필요한 만큼만 해요. <code>+</code>로 한 단계만 열어 두고, 진동 원시값처럼 빠르고 큰 데이터는 서버에서 모아 요약 토픽으로 다시 내보내요. 상세 화면에 들어갈 때만 그 기기 토픽을 구독하고 나올 때 풀어요.</p>
          <p>권한은 브로커에서 막아요. 브라우저는 사용자별로 짧게 끝나는 토큰(JWT 등)으로 접속하고, 브로커가 토큰의 사용자·고객사에 맞춰 읽기·쓰기 토픽을 제한해요. Mosquitto는 acl_file의 <code>pattern</code>에 <code>%u</code>(사용자 이름), <code>%c</code>(clientId)를 쓸 수 있고 EMQX·HiveMQ에도 비슷한 기능이 있어요. 권한 밖 구독은 브로커에 따라 SUBACK에 실패 코드(3.1.1은 0x80)가 오기도 하고, 구독은 받아 주고 메시지만 안 보내기도 해요.</p>
        </>}
        prevent={[
          <>다른 고객사 계정으로 접속해서 우리 토픽을 구독해 보는 테스트를 해요. 메시지가 하나라도 오면 ACL이 뚫린 거예요</>,
          <>브라우저 코드에서 <code>#</code>이 들어간 subscribe를 CI에서 grep으로 걸러요</>,
          <>브라우저용 MQTT 계정에는 쓰기 권한을 명령 토픽 몇 개로만 줘요</>,
        ]}
        links={[['#/dev/build/bd-env-leak', '개발용 .env가 운영에 섞임'], ['#/dev/realtime/rc-ws-flood', '메시지 폭주로 렌더링 과부하']]}
      />
    </>
  )
}
