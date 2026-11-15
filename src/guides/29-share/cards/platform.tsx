import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { ITEM, PEOPLE, useDetent, useToast, type Detent } from '../data'
import { Article, Av, Ico, Thumb, Toast, type IcoName } from '../shared'

const detentMsg = (d: Detent, how: string): ReactNode =>
  d === 'full' ? <>{how} <b>전체 높이</b> — 숨어 있던 항목까지 보여요</> : d === 'mid' ? <>{how} <b>중간 높이</b>로</> : <>{how} 시트를 <b>닫았어요</b></>

/* ---------- 01 iOS 스타일 공유 시트 ---------- */
const IOS_APPS: [IcoName, string][] = [['msg', '메시지'], ['mail', '메일'], ['note', '메모'], ['bell', '미리 알림'], ['more', '더 보기']]
const IOS_ACTS: [string, IcoName][] = [['복사', 'copy'], ['읽기 목록에 추가', 'book'], ['즐겨찾기 추가', 'star'], ['홈 화면에 추가', 'plus'], ['페이지에서 찾기', 'find'], ['프린트', 'print']]
const IOS_LOG = <>오른쪽 위 <b>공유 버튼</b>을 눌러 보세요</>

export function IosShare() {
  const [log, setLog] = useState<ReactNode>(IOS_LOG)
  const [toast, T] = useToast()
  const { d, set, grip } = useDetent((nd, how) => { if (how) setLog(detentMsg(nd, how)) })
  const dev = useRef<HTMLDivElement>(null)

  const open = () => { set('mid'); setLog(<>아래에서 <b>시트가 중간 높이</b>로 올라와요 — 사람 · 앱 · 작업 순서</>) }
  const done = (msg: ReactNode, t?: ReactNode) => { set('closed'); setLog(msg); if (t) T.show(t) }

  const demo = useDemo({
    reset() { set('closed'); T.hide(); setLog(IOS_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q1('[data-open]')); await c.sleep(1500)
      await c.press(dev.current, q1('.grabber')); await c.sleep(1600)
      await c.press(dev.current, q1('[data-act="복사"]')); await c.sleep(1200)
    },
  })

  return (
    <Card id="share-ios" num="01" title="iOS 스타일 공유" en="Share Sheet (iOS style)" demo={demo}
      desc="아이폰 계열의 공유 시트예요. 위에서부터 사람, 앱, 작업 목록이 세 층으로 쌓여요.">
      <Stage log={log} logId="share-ios-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            <div className="bar"><span className="sh-back" aria-hidden="true">‹</span>주말노트<span className="sp" />
              <button type="button" data-open aria-label="공유" onClick={open}><Ico n="share" /></button>
            </div>
            <Article />
            <Toast t={toast} />
            <div className={'scrim' + (d !== 'closed' ? ' on' : '')} onClick={() => done(<>바깥을 눌러 <b>닫기</b></>)} aria-hidden="true" />
            <div className={'sh-sheet ios ' + d} role="dialog" aria-label="공유" aria-hidden={d === 'closed'} inert={d === 'closed'}>
              <button type="button" className="grabber" aria-label={d === 'full' ? '시트 줄이기' : '시트 늘리기'} {...grip} />
              <div className="sh-ios-hd">
                <Thumb size={36} />
                <span className="sh-grow"><b>{ITEM.title}</b><small>{ITEM.host} · 옵션 ›</small></span>
                <button type="button" className="sh-x" aria-label="닫기" onClick={() => done(<><b>✕</b>로 닫기</>)}><Ico n="close" size={14} /></button>
              </div>
              <div className="sh-row sh-people">
                {PEOPLE.slice(0, 4).map((p, i) => (
                  <button type="button" key={p.n} onClick={() => done(<><b>{p.n}</b>에게 바로 보내기 — 자주 연락한 사람이 맨 앞이에요</>, p.n + '에게 보냈어요')}>
                    <Av p={p} size={44} badge={i % 2 ? 'mail' : 'msg'} /><span>{p.n}</span>
                  </button>
                ))}
              </div>
              <div className="sh-row sh-apps">
                {IOS_APPS.map(([ic, l]) => (
                  <button type="button" key={l} onClick={() => done(<><b>{l}</b> 앱으로 넘겨요</>)}>
                    <i><Ico n={ic} size={22} /></i><span>{l}</span>
                  </button>
                ))}
              </div>
              <div className="sh-group">
                {IOS_ACTS.map(([l, ic]) => (
                  <button type="button" key={l} data-act={l} onClick={() => done(l === '복사' ? <><b>복사</b> — 작업은 앱을 떠나지 않고 바로 끝나요</> : <><b>{l}</b> — 앱이 아니라 ‘작업’이에요</>, l === '복사' ? '복사됨' : l + ' 완료')}>
                    {l}<Ico n={ic} />
                  </button>
                ))}
              </div>
              <button type="button" className="sh-edit" onClick={() => setLog(<><b>작업 편집…</b> — 자주 쓰는 작업 순서를 사용자가 바꿔요</>)}>작업 편집…</button>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['층', '사람 · 앱 · 작업'], ['높이', '중간 ↔ 전체'], ['작업 아이콘', '글자 오른쪽']]}
        usage={[
          ['언제', '앱 안의 글·사진·링크를 시스템에 넘길 때. 시트는 운영체제가 그리고 앱은 내용만 건네요'],
          ['vs 안드로이드', '작업(복사·추가)이 맨 아래 세로 목록으로 모여 있어요. 안드로이드는 복사가 미리보기 옆 칩이고 앱이 격자로 펼쳐져요'],
          ['주의', '공유 버튼 모양도 플랫폼마다 달라요. iOS는 위 화살표가 나온 네모, 안드로이드는 점 세 개를 이은 모양이에요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 02 안드로이드 스타일 공유 시트 ---------- */
const AND_APPS: [IcoName, string][] = [['msg', '메시지'], ['mail', '메일'], ['note', '메모'], ['folder', '보관함'], ['near', '근처 공유'], ['chat', '채팅'], ['cal', '일정'], ['book', '북마크'], ['edit', '편집기'], ['print', '인쇄'], ['qr', 'QR 만들기'], ['user', '연락처']]
const AND_LOG = <>위쪽 <b>공유 아이콘</b>을 눌러 보세요</>

export function AndroidShare() {
  const [log, setLog] = useState<ReactNode>(AND_LOG)
  const [toast, T] = useToast()
  const { d, set, grip } = useDetent((nd, how) => { if (how) setLog(detentMsg(nd, how)) })
  const dev = useRef<HTMLDivElement>(null)

  const open = () => { set('mid'); setLog(<>미리보기 · <b>바로 공유</b> · 앱 격자 순서로 올라와요</>) }
  const done = (msg: ReactNode, t?: ReactNode) => { set('closed'); setLog(msg); if (t) T.show(t) }

  const demo = useDemo({
    reset() { set('closed'); T.hide(); setLog(AND_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q1('[data-open]')); await c.sleep(1500)
      await c.press(dev.current, q1('.grabber')); await c.sleep(1600)
      await c.press(dev.current, q1('.sh-copychip')); await c.sleep(1200)
    },
  })

  return (
    <Card id="share-android" num="02" title="안드로이드 스타일 공유" en="Sharesheet (Android style)" demo={demo}
      desc="안드로이드 계열의 공유 시트예요. 미리보기 옆 복사 칩, 사람에게 바로 보내기 줄, 앱 격자로 나뉘어요.">
      <Stage log={log} logId="share-android-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            <div className="bar"><span className="sh-back" aria-hidden="true">←</span>주말노트<span className="sp" />
              <button type="button" data-open aria-label="공유" onClick={open}><Ico n="shareA" /></button>
            </div>
            <Article />
            <Toast t={toast} />
            <div className={'scrim' + (d !== 'closed' ? ' on' : '')} onClick={() => done(<>바깥을 눌러 <b>닫기</b></>)} aria-hidden="true" />
            <div className={'sh-sheet and ' + d} role="dialog" aria-label="공유" aria-hidden={d === 'closed'} inert={d === 'closed'}>
              <button type="button" className="grabber" aria-label={d === 'full' ? '시트 줄이기' : '시트 늘리기'} {...grip} />
              <div className="sh-and-hd">
                <Thumb size={40} />
                <span className="sh-grow"><b>{ITEM.title}</b><small>{ITEM.host}</small></span>
                <button type="button" className="sh-copychip" aria-label="링크 복사" onClick={() => done(<>미리보기 옆 <b>복사 칩</b> — 시스템이 ‘복사됨’을 알려줘요</>, '클립보드에 복사됨')}>
                  <Ico n="copy" size={16} />
                </button>
              </div>
              <div className="sh-custom">
                <button type="button" className="chip" onClick={() => done(<>앱이 끼워 넣은 <b>맞춤 작업</b> — 시트 안에 앱 전용 버튼을 둘 수 있어요</>)}><Ico n="qr" size={14} />QR 코드</button>
                <button type="button" className="chip" onClick={() => done(<>앱이 끼워 넣은 <b>맞춤 작업</b></>)}><Ico n="star" size={14} />저장</button>
              </div>
              <div className="sh-grid4 sh-direct">
                {PEOPLE.slice(0, 4).map((p, i) => (
                  <button type="button" key={p.n} onClick={() => done(<><b>바로 공유</b> — {p.n}님 대화방으로 곧장 가요</>, p.n + '님에게 보냈어요')}>
                    <Av p={p} size={42} badge={i % 2 ? 'chat' : 'msg'} /><span>{p.n}</span>
                  </button>
                ))}
              </div>
              <div className="sh-divider">앱</div>
              <div className="sh-grid4 sh-appgrid">
                {AND_APPS.map(([ic, l]) => (
                  <button type="button" key={l} onClick={() => done(<><b>{l}</b> 앱으로 넘겨요</>)}>
                    <i><Ico n={ic} size={20} /></i><span>{l}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['구성', '미리보기 · 바로 공유 · 앱 격자'], ['복사', '미리보기 옆 칩'], ['맞춤 작업', '앱이 추가']]}
        usage={[
          ['언제', '안드로이드 앱에서 시스템 공유를 부를 때. 위로 끌면 앱 격자가 전체 높이로 펼쳐져요'],
          ['vs iOS', '작업 목록 대신 앱 격자가 주인공이에요. 복사는 맨 위 칩으로 올라와 있고, 앱이 자기 버튼(맞춤 작업)을 끼워 넣을 수 있어요'],
          ['주의', '시스템 시트 위에 똑같은 시트를 또 직접 만들지 마세요. 사용자는 늘 보던 시트를 기대해요'],
        ]}
      />
    </Card>
  )
}
