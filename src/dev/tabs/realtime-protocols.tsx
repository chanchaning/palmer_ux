/* 11 실시간 통신 — 맨 위 '어떤 방식을 쓸까': 조건으로 고르기 · 방식 비교표 · MQTT 한눈에 */
import { useState, type ReactNode } from 'react'
import { Seg } from '../../components/ui'
import { MqttSim } from './realtime-protocols-demos'
import './realtime-protocols.css'

type P = 'poll' | 'long' | 'sse' | 'ws' | 'sio' | 'mqtt' | 'rtc' | 'wt'

const NAME: Record<P, string> = {
  poll: '폴링', long: '롱 폴링', sse: 'SSE', ws: 'WebSocket', sio: 'Socket.IO',
  mqtt: 'MQTT over WebSocket', rtc: 'WebRTC DataChannel', wt: 'WebTransport',
}

/** 방식별로 먼저 읽을 함정 (아래 카드 중 첫 항목) */
const TRAP: Partial<Record<P, [string, string]>> = {
  poll: ['rc-poll-overlap', '폴링 · SSE 함정'],
  long: ['rc-poll-overlap', '폴링 · SSE 함정'],
  sse: ['rc-sse-buffer', '폴링 · SSE 함정'],
  ws: ['rc-ws-heartbeat', 'WebSocket 함정'],
  sio: ['rc-ws-scale', 'WebSocket · Socket.IO 함정'],
  wt: ['rc-ws-heartbeat', 'WebSocket 함정 (재연결은 똑같이 직접)'],
  mqtt: ['rc-mqtt-clientid', 'MQTT 함정'],
}
const trapHref = (p: P) => TRAP[p] && '#/dev/realtime/' + TRAP[p][0]

/* ───────── 1. 조건으로 고르기 ───────── */

interface Need {
  dir: 'down' | 'both'
  rate: 'rare' | 'some' | 'many'
  peer: 'server' | 'iot' | 'p2p'
  net: 'open' | 'strict'
  scale: 'one' | 'many'
  old: 'no' | 'yes'
}

interface Pick { pick: P; why: ReactNode; also: [P, ReactNode][]; notes: ReactNode[] }

function recommend(n: Need): Pick {
  const notes: ReactNode[] = []
  let r: Omit<Pick, 'notes'>

  if (n.peer === 'p2p') {
    r = {
      pick: 'rtc',
      why: <>브라우저끼리 직접 주고받아서 데이터가 서버를 거치지 않아요. 다만 처음 연결을 맺으려면 서로 주소를 교환할 시그널링 서버가 따로 있어야 하고, 그건 보통 WebSocket으로 만들어요.</>,
      also: [['ws', <>참여자가 적고 수십 ms 지연이 괜찮다면 서버가 중계하는 WebSocket이 훨씬 단순해요.</>]],
    }
    if (n.net === 'strict') notes.push(<>UDP가 막힌 회사망에서는 직접 연결이 안 붙어요. TURN 서버로 중계해야 하고, 그 트래픽은 결국 서버 비용이에요.</>)
  } else if (n.peer === 'iot') {
    r = {
      pick: 'mqtt',
      why: <>기기들이 이미 MQTT 브로커에 붙어 있다면 브라우저도 브로커의 WebSocket 리스너로 붙어서 같은 토픽을 구독하는 게 가장 짧은 길이에요. 브라우저는 TCP 소켓을 못 열어서 MQTT를 WebSocket에 실어 보내요(mqtt.js).</>,
      also: n.dir === 'down'
        ? [['sse', <>보기만 하는 화면이고 기기가 많다면, 서버가 필요한 토픽만 골라 SSE로 내려 주는 편이 권한과 트래픽을 다루기 쉬워요.</>]]
        : [['ws', <>브로커를 브라우저에 직접 열기 싫다면 서버가 MQTT를 받아 WebSocket으로 중계해요. 권한 검사를 서버 코드에서 할 수 있어요.</>]],
    }
    if (n.net === 'strict') notes.push(<>1883·8883 같은 MQTT 기본 포트는 회사망에서 막히는 일이 많아요. 브라우저용은 <code>wss://</code> 443으로 열어 두는 게 무난해요.</>)
    if (n.rate === 'many') notes.push(<>초당 수십 개 이상이 브라우저로 그대로 오면 렌더링이 먼저 못 버텨요. 구독 범위를 좁히고 화면 갱신은 묶어서 해요.</>)
  } else if (n.dir === 'down') {
    if (n.rate === 'rare') {
      r = {
        pick: 'poll',
        why: <>값이 몇십 초에서 몇 분 간격으로 바뀐다면 연결을 열어 둘 이유가 적어요. 캐시·재시도·인증이 평범한 API 호출과 같아서 운영이 가장 쉬워요.</>,
        also: [['sse', <>바뀐 순간 바로 보여야 한다면 SSE로 올려요.</>]],
      }
    } else {
      r = {
        pick: 'sse',
        why: <>서버에서 브라우저로 한 방향이면 SSE로 충분해요. 평범한 HTTP 응답이라 쿠키 인증과 로드밸런서를 그대로 쓰고, 끊기면 브라우저가 <code>Last-Event-ID</code>를 붙여 알아서 다시 붙어요.</>,
        also: [
          ['long', <>SSE 응답이 중간 장비에서 계속 막힌다면 롱 폴링으로 내려가요.</>],
          ...(n.rate === 'many' ? [['ws', <>바이너리를 보내야 하거나 초당 수백 개 수준이면 WebSocket이 더 가벼울 수 있어요.</>] as [P, ReactNode]] : []),
        ],
      }
      if (n.net === 'strict') notes.push(<>프록시가 응답을 모았다가 한꺼번에 보내면 SSE가 몰려서 와요. 버퍼링을 끄는 설정부터 확인해요.</>)
    }
    if (n.old === 'yes') notes.push(<>IE에는 EventSource가 없어요. 이런 브라우저까지 받아야 하면 폴리필을 쓰거나 롱 폴링으로 내려가요.</>)
  } else if (n.rate === 'rare') {
    r = {
      pick: 'sse',
      why: <>브라우저가 보내는 일이 가끔이라면 보내기는 평범한 <code>fetch</code> POST로 하고, 받기만 SSE로 해도 돼요. 양방향 소켓보다 챙길 게 적어요.</>,
      also: [['ws', <>채팅처럼 양쪽이 쉬지 않고 주고받는다면 WebSocket이 맞아요.</>]],
    }
  } else if (n.net === 'strict' || n.old === 'yes') {
    r = {
      pick: 'sio',
      why: <>WebSocket이 막힌 망이나 오래된 브라우저에서도 HTTP 롱 폴링으로 내려가서 붙어요. 재연결·하트비트·방(room)이 들어 있어요. 서버도 Socket.IO 서버여야 하고, 일반 WebSocket 클라이언트와는 말이 안 통해요.</>,
      also: [['ws', <>사용자 망을 다 알고 있다면 순수 WebSocket이 가볍고 의존성도 없어요.</>]],
    }
  } else {
    r = {
      pick: 'ws',
      why: <>양쪽이 자주 주고받으면 WebSocket이 기본이에요. 대신 재연결, 하트비트, 재구독은 직접 만들어야 해요. 아래 WebSocket 함정이 거의 다 여기서 나와요.</>,
      also: [
        ['sio', <>그걸 직접 만들고 싶지 않다면 Socket.IO가 다 갖고 있어요.</>],
        ...(n.rate === 'many' ? [['wt', <>게임처럼 늦게 온 데이터는 버려도 되는 곳이라면 데이터그램을 쓰는 WebTransport를 볼 만해요. 서버가 HTTP/3를 받아야 하고, 브라우저 지원 범위를 먼저 확인해요.</>] as [P, ReactNode]] : []),
      ],
    }
  }

  if (n.scale === 'many') {
    const s: Record<P, ReactNode> = {
      poll: <>서버가 연결 상태를 들고 있지 않아서 여러 대로 늘리기 가장 쉬워요.</>,
      long: <>요청이 어느 서버에 걸려 있든 이벤트를 받도록, 서버끼리 Redis pub/sub 같은 걸로 이어야 해요.</>,
      sse: <>브라우저는 서버 한 대에만 붙어 있어요. 다른 서버에서 생긴 이벤트를 전하려면 서버끼리 Redis pub/sub 같은 걸로 이어야 해요.</>,
      ws: <>브라우저는 서버 한 대에만 붙어 있어요. 다른 서버에서 생긴 메시지를 전하려면 서버끼리 pub/sub로 이어야 해요.</>,
      sio: <>롱 폴링을 쓰는 한 sticky session이 꼭 필요하고, 방 메시지를 서버끼리 나누려면 Redis adapter 같은 어댑터가 있어야 해요.</>,
      mqtt: <>메시지를 나눠 주는 일은 브로커가 해요. 브로커를 여러 대로 묶는 방법은 브로커 제품마다 달라요.</>,
      rtc: <>데이터는 P2P로 오가서 서버 부담이 적어요. 시그널링 서버만 여러 대에 맞추면 돼요.</>,
      wt: <>WebSocket과 같아요. 서버끼리 pub/sub로 이어야 하고, 로드밸런서가 HTTP/3(UDP)를 넘겨 줘야 해요.</>,
    }
    notes.push(s[r.pick])
  }
  return { ...r, notes }
}

const Q: { k: keyof Need; label: string; opts: [string, string][] }[] = [
  { k: 'peer', label: '누구와', opts: [['server', '우리 서버'], ['iot', 'IoT 기기 · 브로커'], ['p2p', '다른 브라우저']] },
  { k: 'dir', label: '방향', opts: [['down', '서버 → 브라우저만'], ['both', '양방향']] },
  { k: 'rate', label: '메시지 빈도', opts: [['rare', '분 단위로 가끔'], ['some', '초당 몇 개'], ['many', '초당 수십 개 이상']] },
  { k: 'net', label: '사용자 망', opts: [['open', '보통 인터넷'], ['strict', '회사 방화벽 · 프록시']] },
  { k: 'old', label: '오래된 브라우저', opts: [['no', '최신만'], ['yes', '구형도 받아야 해요']] },
  { k: 'scale', label: '서버', opts: [['one', '한 대'], ['many', '여러 대']] },
]

function Picker({ n, setN, r }: { n: Need; setN: (n: Need) => void; r: Pick }) {
  const set = <K extends keyof Need>(k: K, v: Need[K]) => setN({ ...n, [k]: v })
  return (
    <div className="rcp-picker">
      <div className="rcp-qs">
        {Q.map(q => (
          <div className="rcp-q" key={q.k}>
            <span className="rcp-q-l">{q.label}</span>
            <Seg value={n[q.k]} className="rcp-seg" options={q.opts}
              onChange={v => set(q.k, v as Need[typeof q.k])} />
          </div>
        ))}
      </div>
      <div className="rcp-ans" aria-live="polite">
        <small>이 조건이면</small>
        <b className="rcp-ans-name">{NAME[r.pick]}</b>
        <p>{r.why}</p>
        {r.also.length > 0 && (
          <ul className="rcp-also">
            {r.also.map(([p, t]) => <li key={p}><b>{NAME[p]}</b> {t}</li>)}
          </ul>
        )}
        {r.notes.length > 0 && <ul className="rcp-notes">{r.notes.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        {trapHref(r.pick) && <a className="rcp-go" href={trapHref(r.pick)}>{TRAP[r.pick]![1]} 보기 ↓</a>}
      </div>
    </div>
  )
}

/* ───────── 2. 비교표 ───────── */

const ROWS: { p: P; cells: ReactNode[] }[] = [
  { p: 'poll', cells: [
    '브라우저가 물어봐요',
    'HTTP 요청 반복',
    '개념 없음. 다음 요청이 곧 재시도',
    <code>fetch</code>,
    '평소 API와 같아요. 헤더 자유',
    '거의 없어요. 응답이 캐시되지 않게만',
    '분 단위 대시보드, 작업 진행률, 처음 만들 때',
  ] },
  { p: 'long', cells: [
    '서버 → 브라우저 (요청을 붙잡아 둠)',
    'HTTP. 답이 오면 바로 다시 요청',
    '직접. 응답마다 새 요청',
    <code>fetch</code>,
    '헤더 자유',
    '대기 시간을 프록시·LB idle timeout보다 짧게. 다시 요청하는 사이 놓친 걸 커서로 받아야 해요',
    'SSE·WebSocket이 막히는 환경의 대안',
  ] },
  { p: 'sse', cells: [
    '서버 → 브라우저',
    'HTTP 응답 하나를 길게 (text/event-stream)',
    <>내장. <code>Last-Event-ID</code>를 붙여 다시 붙고 <code>retry:</code>로 간격 조절</>,
    <code>EventSource</code>,
    <>커스텀 헤더를 못 붙여요. 같은 도메인 쿠키를 쓰거나, <code>fetch</code> 스트림으로 직접 읽어요</>,
    '프록시 버퍼링을 꺼야 해요. idle timeout. HTTP/1.1에선 같은 출처 연결 수 제한(크롬 6개)',
    '알림, 진행 상황, AI 응답 스트리밍, 시세 표시',
  ] },
  { p: 'ws', cells: [
    '양방향',
    'HTTP Upgrade 뒤 TCP 위 자체 프레임',
    '없어요. 직접 만들어요',
    <code>WebSocket</code>,
    <>커스텀 헤더를 못 붙여요. 쿠키, 연결 직후 첫 메시지, 짧게 쓰는 쿼리 토큰 중에 골라요</>,
    <>프록시에 <code>Upgrade</code>·<code>Connection</code> 헤더 전달 설정. idle timeout. JS에서 ping/pong이 안 보여서 앱 하트비트 필요</>,
    '채팅, 협업 편집, 양방향 제어',
  ] },
  { p: 'sio', cells: [
    '양방향 + 방 · 응답 확인(ack)',
    'WebSocket, 안 되면 HTTP 롱 폴링',
    '내장 (재연결 · 하트비트)',
    <code>socket.io-client</code>,
    <><code>auth</code> 옵션으로 연결 때 토큰을 보내요</>,
    '롱 폴링을 쓰면 sticky session 필수. 서버 여러 대면 어댑터(Redis 등)',
    '채팅방, 알림, 망을 가리지 않아야 하는 서비스',
  ] },
  { p: 'mqtt', cells: [
    '양방향 pub/sub (브로커 경유)',
    'WebSocket 위 MQTT',
    <>mqtt.js가 다시 붙고 구독도 다시 보내요. 놓친 메시지는 세션·QoS에 달렸어요</>,
    <code>mqtt.js</code>,
    'CONNECT의 username/password(토큰을 password에). 토픽 권한은 브로커 ACL',
    'WS 업그레이드 설정. keepalive를 LB idle timeout보다 짧게. clientId 겹침',
    'IoT 기기 상태 · 원격 제어, 토픽별로 나눠 받는 대시보드',
  ] },
  { p: 'rtc', cells: [
    '브라우저 ↔ 브라우저',
    'UDP 위 SCTP · DTLS (ICE로 길 찾기)',
    <>없어요. 끊기면 ICE restart나 다시 협상</>,
    <><code>RTCPeerConnection</code> · <code>createDataChannel</code></>,
    '데이터 채널엔 인증 개념이 없어요. 시그널링 서버에서 걸러요',
    'UDP가 막힌 망은 TURN 서버 필요. 시그널링 서버는 따로',
    '화상 통화 옆 데이터, P2P 파일 전송, 지연에 민감한 게임',
  ] },
  { p: 'wt', cells: [
    '양방향 (스트림 + 데이터그램)',
    'HTTP/3 (QUIC, UDP)',
    '없어요. 직접 만들어요',
    <code>WebTransport</code>,
    '생성자에 헤더 옵션이 없어요. URL이나 첫 스트림으로 토큰',
    'UDP가 막히면 실패해서 WebSocket 폴백이 필요해요. 서버·LB의 HTTP/3 지원',
    '늦은 데이터를 버려도 되는 실시간 게임 · 미디어. 브라우저 지원 범위를 먼저 확인',
  ] },
]
const HEADS = ['방식', '방향', '전송', '자동 재연결', '브라우저 API', '헤더 · 인증', '프록시 · LB 주의', '잘 맞는 곳']

function Compare({ hit }: { hit: P }) {
  return (
    <div className="sys-table-wrap rcp-table-wrap">
      <table className="sys-table rcp-table">
        <thead><tr>{HEADS.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {ROWS.map(r => (
            <tr key={r.p} className={r.p === hit ? 'rcp-hit' : undefined}>
              <td>{trapHref(r.p) ? <a href={trapHref(r.p)}>{NAME[r.p]}</a> : NAME[r.p]}{r.p === hit && <span className="rcp-hit-tag">추천</span>}</td>
              {r.cells.map((c, i) => <td key={i}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ───────── 3. MQTT 한눈에 ───────── */

const MQ = (id: string) => '#/dev/realtime/' + id

function MqttGlance() {
  return (
    <>
      <dl className="rcp-terms">
        <div><dt>브로커와 토픽</dt><dd>기기와 브라우저는 서로를 모르고 브로커에만 붙어요. 보내는 쪽은 <code>devices/s1/temp</code> 같은 토픽에 발행하고, 받는 쪽은 토픽을 구독해요.</dd></div>
        <div><dt>와일드카드</dt><dd><code>+</code>는 한 단계, <code>#</code>는 그 아래 전부예요. <code>devices/+/temp</code>는 모든 기기의 온도, <code>devices/#</code>는 devices 아래 모든 것. <code>#</code>는 맨 끝에만 쓸 수 있어요. <a href={MQ('rc-mqtt-wildcard')}>권한 함정</a></dd></div>
        <div><dt>QoS 0 · 1 · 2</dt><dd>0은 한 번 보내고 끝, 1은 PUBACK을 받을 때까지 다시 보내서 중복이 생길 수 있고, 2는 네 번 주고받아 앱에는 한 번만 넘겨요. 구독자가 실제로 받는 QoS는 발행 QoS와 구독 QoS 중 낮은 쪽이에요. <a href={MQ('rc-mqtt-qos')}>유실 함정</a></dd></div>
        <div><dt>retained</dt><dd>토픽마다 마지막 메시지 하나를 브로커가 들고 있다가 새 구독자에게 바로 줘요. 빈 payload를 retained로 발행하면 지워져요. <a href={MQ('rc-mqtt-retained')}>옛 값 함정</a></dd></div>
        <div><dt>keepalive · LWT</dt><dd>클라이언트는 keepalive 간격 안에 뭐든 보내요(없으면 PINGREQ). 브로커는 그 1.5배 동안 소식이 없으면 끊고, 접속 때 맡겨 둔 유언(LWT)을 대신 발행해요. 정상 DISCONNECT로 나가면 유언은 나가지 않아요. <a href={MQ('rc-mqtt-lwt')}>오프라인 감지 함정</a></dd></div>
        <div><dt>clientId</dt><dd>브로커는 clientId로 세션을 찾아요. 같은 id로 또 붙으면 먼저 붙어 있던 연결을 끊어요. <a href={MQ('rc-mqtt-clientid')}>탭 두 개 함정</a></dd></div>
      </dl>
      <MqttSim />
      <p className="rcp-note">이 페이지 안의 가짜 브로커로 만든 시뮬레이션이에요. 바깥 브로커에 연결하지 않아요. 브로커 → 이 브라우저 구간만 흔들고, 재전송은 실제 MQTT처럼 다시 연결된 뒤에 일어나요. 시간은 보기 좋게 줄였어요(keepalive 4초).</p>
    </>
  )
}

export default function Protocols() {
  const [n, setN] = useState<Need>({ peer: 'server', dir: 'down', rate: 'some', net: 'open', old: 'no', scale: 'one' })
  const r = recommend(n)
  return (
    <section className="rcp">
      <h3 className="rcp-h">어떤 방식을 쓸까</h3>
      <p className="rcp-lead">조건을 고르면 출발점이 될 방식을 골라 줘요. 정답표는 아니에요. 이미 쓰고 있는 서버·브로커가 있으면 그쪽이 먼저예요.</p>
      <Picker n={n} setN={setN} r={r} />

      <h3 className="rcp-h">방식 한눈에 비교</h3>
      <p className="rcp-lead">이름을 누르면 아래 그 방식의 첫 함정으로 가요. 위에서 고른 방식은 줄이 칠해져요.</p>
      <Compare hit={r.pick} />

      <h3 className="rcp-h">MQTT 한눈에</h3>
      <p className="rcp-lead">웹 개발자에게 가장 낯선 게 MQTT라서 따로 떼었어요. 아래 가짜 브로커에서 구독하고 발행해 보면서 용어를 확인해요. 실제로 겪은 문제는 맨 아래 MQTT 묶음에 있어요.</p>
      <MqttGlance />
    </section>
  )
}
