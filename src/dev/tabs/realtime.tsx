/* 11 실시간 통신 · 프로토콜 — 고르는 법(개요) + 폴링·SSE / WebSocket / MQTT 함정 */
import { TabIntro } from '../ui'
import './realtime.css'
import Protocols from './realtime-protocols'
import SseIssues from './realtime-sse'
import WsIssues from './realtime-ws'
import MqttIssues from './realtime-mqtt'

export default function RealtimeTab() {
  return (
    <div data-dev="realtime">
      <TabIntro>
        실시간 기능은 붙이는 건 금방이에요. 문제는 연결이 끊기고, 다시 붙고, 서버가 여러 대가 될 때 생겨요. 위에서 어떤 방식을 쓸지 고르고, 아래에서 방식별로 실제로 겪은 함정을 봐요.
        ‘겪어 본 문제’ 표시가 붙은 항목은 직접 운영하면서 부딪힌 것들이에요. 데모는 전부 이 페이지 안의 가짜 서버·브로커로 돌아서 바깥으로 연결을 열지 않아요.
      </TabIntro>
      <Protocols />
      <h3 className="rc-group" id="rc-g-sse">폴링 · SSE</h3>
      <SseIssues />
      <h3 className="rc-group" id="rc-g-ws">WebSocket · Socket.IO</h3>
      <WsIssues />
      <h3 className="rc-group" id="rc-g-mqtt">MQTT</h3>
      <MqttIssues />
    </div>
  )
}
