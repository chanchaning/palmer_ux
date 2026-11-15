import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device } from '../../../components/ui'
import { ITEM, PEOPLE, useToast } from '../data'
import { Av, Ico, Thumb, Toast } from '../shared'

const person = (n: string) => PEOPLE.find(p => p.n === n) ?? { n, tone: 2 as const }

/* ---------- 03 전달 ---------- */
type Msg = { id: number; from: string; text: string; fwd?: string | null }
const ROOM: Msg[] = [
  { id: 1, from: '민호', text: '캠핑장 예약 확인됐어! 토요일 3시 체크인이야' },
  { id: 2, from: '나래', text: '장작이랑 랜턴은 내가 챙길게' },
  { id: 3, from: 'me', text: '좋아요! 준비물 목록은 제가 만들게요' },
]
const CHATS = [{ n: '하린', sub: '1:1 대화' }, { n: '가족', sub: '4명' }, { n: '도윤', sub: '1:1 대화' }, { n: '회사 동기', sub: '6명' }]
const FWD_LOG = <>말풍선 옆 <b>↪ 전달</b>을 눌러 보세요</>

export function Forward() {
  const [view, setView] = useState<'chat' | 'pick' | 'target'>('chat')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [showFrom, setShowFrom] = useState(true)
  const [q, setQ] = useState('')
  const [sent, setSent] = useState<{ to: string[]; m: Msg; showFrom: boolean } | null>(null)
  const [log, setLog] = useState<ReactNode>(FWD_LOG)
  const [toast, T] = useToast()
  const dev = useRef<HTMLDivElement>(null)

  const start = (m: Msg) => { setMsg(m); setPicked([]); setQ(''); setView('pick'); setLog(<><b>어디로 보낼지</b> 고르는 화면 — 맨 위에 보낼 말풍선을 보여줘요</>) }
  const toggle = (n: string) => setPicked(p => (p.includes(n) ? p.filter(x => x !== n) : [...p, n]))
  const send = () => {
    if (!msg || !picked.length) return
    setSent({ to: picked, m: msg, showFrom }); setView('target')
    T.show(picked.length + '곳에 전달했어요')
    setLog(showFrom ? <><b>{picked[0]}</b> 방에 도착 — ‘<b>{msg.from}</b> 님 메시지’라는 꼬리표가 붙어요</> : <>보낸 사람을 숨기면 <b>‘전달됨’</b>만 남아요</>)
  }

  const demo = useDemo({
    reset() { setView('chat'); setMsg(null); setPicked([]); setShowFrom(true); setQ(''); setSent(null); T.hide(); setLog(FWD_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q1('[data-fwd="1"]')); await c.sleep(1200)
      await c.press(dev.current, q1('[data-chat="하린"]')); await c.sleep(500)
      await c.press(dev.current, q1('[data-chat="가족"]')); await c.sleep(800)
      await c.press(dev.current, q1('.sh-fwd-send')); await c.sleep(2200)
      await c.press(dev.current, q1('[data-back]')); await c.sleep(600)
    },
  })

  const chats = CHATS.filter(c => c.n.includes(q.trim()))
  return (
    <Card id="share-forward" num="03" title="전달" en="Forward" demo={demo}
      desc="이미 받은 메시지를 다른 대화방으로 그대로 옮겨요. 원래 누가 보냈는지 꼬리표가 따라가요.">
      <Stage log={log} logId="share-forward-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            {view === 'chat' && (
              <>
                <div className="bar"><span className="sh-back" aria-hidden="true">‹</span>주말 캠핑 모임<span className="sp" /><span className="muted">5</span></div>
                <div className="sh-chat">
                  {ROOM.map(m => (
                    <div key={m.id} className={'sh-msg' + (m.from === 'me' ? ' me' : '')}>
                      {m.from !== 'me' && <Av p={person(m.from)} size={26} />}
                      <div className="sh-bub-wrap">
                        {m.from !== 'me' && <small>{m.from}</small>}
                        <div className="sh-bub">{m.text}</div>
                      </div>
                      {m.from !== 'me' && (
                        <button type="button" className="sh-fwd" data-fwd={m.id} aria-label={m.from + '의 메시지 전달'} onClick={() => start(m)}><Ico n="fwd" size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {view === 'pick' && msg && (
              <div className="sh-pick">
                <div className="bar"><button type="button" className="sh-iconbtn" aria-label="닫기" onClick={() => { setView('chat'); setLog(<>전달을 <b>취소</b>했어요</>) }}><Ico n="close" size={16} /></button>전달하기</div>
                <div className="sh-quote"><b>{msg.from}</b> {msg.text}</div>
                <div className="sh-search"><Ico n="find" size={14} /><input type="search" aria-label="대화방 검색" placeholder="대화방 검색" value={q} onChange={e => setQ(e.target.value)} /></div>
                <div className="sh-list">
                  {chats.map(c => (
                    <button type="button" key={c.n} data-chat={c.n} className="sh-li" aria-pressed={picked.includes(c.n)} onClick={() => toggle(c.n)}>
                      <Av p={person(c.n)} size={30} /><span className="sh-grow">{c.n}<small>{c.sub}</small></span><span className="sh-check" aria-hidden="true"><Ico n="check" size={12} /></span>
                    </button>
                  ))}
                  {!chats.length && <div className="sh-note">맞는 대화방이 없어요</div>}
                </div>
                <div className="sh-foot">
                  <div className="sh-optrow"><span>보낸 사람 표시</span>
                    <button type="button" className="switch" role="switch" aria-checked={showFrom} aria-label="보낸 사람 표시"
                      onClick={() => { setShowFrom(!showFrom); setLog(showFrom ? <>보낸 사람 <b>숨김</b> — 받는 사람은 누가 쓴 말인지 몰라요</> : <>보낸 사람 <b>표시</b> — 원래 출처가 따라가요</>) }} />
                  </div>
                  <button type="button" className="btn sm sh-fwd-send" disabled={!picked.length} onClick={send}>{picked.length ? '전달 · ' + picked.length : '대화방을 골라요'}</button>
                </div>
              </div>
            )}
            {view === 'target' && sent && (
              <>
                <div className="bar"><button type="button" className="sh-iconbtn" data-back aria-label="원래 대화방으로" onClick={() => { setView('chat'); setLog(<>원래 방으로 — 원본 메시지는 <b>그대로 남아요</b></>) }}>‹</button>{sent.to[0]}<span className="sp" /></div>
                <div className="sh-chat">
                  <div className="sh-msg"><Av p={person(sent.to[0])} size={26} /><div className="sh-bub-wrap"><small>{sent.to[0]}</small><div className="sh-bub">주말에 뭐 해?</div></div></div>
                  <div className="sh-msg me sh-new">
                    <div className="sh-bub-wrap">
                      <small className="sh-fwdtag"><Ico n="fwd" size={11} />{sent.showFrom ? sent.m.from + ' 님의 메시지 전달' : '전달됨'}</small>
                      <div className="sh-bub">{sent.m.text}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            <Toast t={toast} />
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['대상', '이미 있는 메시지'], ['꼬리표', '원래 보낸 사람'], ['선택', '여러 방']]}
        usage={[
          ['언제', '메신저·메일에서 받은 내용을 다른 사람에게 그대로 넘길 때'],
          ['vs 보내기', '전달은 대화방 사이로 ‘메시지’를 옮기고, 보내기는 앱 안의 ‘콘텐츠’를 친구에게 건네요'],
          ['주의', '출처 꼬리표는 소문이 와전되는 걸 막아요. 숨기는 기능을 준다면 기본값은 ‘표시’로 두세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 보내기 ---------- */
const FRIENDS = ['하린', '도윤', '서윤', '민호', '나래', '준서', '지호']
const RECENT = ['하린', '도윤']
const SEND_LOG = <>글 아래 <b>보내기</b>를 눌러 친구를 골라 보세요</>

export function SendTo() {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [log, setLog] = useState<ReactNode>(SEND_LOG)
  const [toast, T] = useToast()
  const dev = useRef<HTMLDivElement>(null)

  const toggle = (n: string) => {
    setPicked(p => {
      const next = p.includes(n) ? p.filter(x => x !== n) : [...p, n]
      setLog(next.length ? <><b>{next.length}명</b> 골랐어요 — 고른 사람은 위 줄에 모여요</> : <>아무도 안 고르면 <b>보내기 버튼이 꺼져요</b></>)
      return next
    })
  }
  const send = () => {
    if (!picked.length) return
    setSent(s => [...new Set([...s, ...picked])]); setOpen(false)
    T.show(picked.join(', ') + '에게 보냈어요')
    setLog(<><b>{picked.length}명</b>에게 보냄{note.trim() ? <> · 메시지 ‘{note.trim()}’ 함께</> : null} — 다시 열면 ‘보냄’ 표시</>)
    setPicked([]); setNote(''); setQ('')
  }

  const demo = useDemo({
    reset() { setOpen(false); setPicked([]); setQ(''); setNote(''); setSent([]); T.hide(); setLog(SEND_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q1('[data-open]')); await c.sleep(1000)
      await c.press(dev.current, q1('[data-f="하린"]')); await c.sleep(600)
      await c.press(dev.current, q1('[data-f="서윤"]')); await c.sleep(800)
      c.tap(dev.current, q1('.sh-note-in'))
      let s = ''
      for (const ch of '이거 보고 챙기자!') { s += ch; setNote(s); await c.sleep(90) }
      await c.sleep(600)
      await c.press(dev.current, q1('.sh-send-btn')); await c.sleep(1800)
      await c.press(dev.current, q1('[data-open]')); await c.sleep(1200)
      await c.press(dev.current, q1('.sh-x')); await c.sleep(400)
    },
  })

  const list = FRIENDS.filter(n => n.includes(q.trim()))
  const ordered = [...list.filter(n => RECENT.includes(n)), ...list.filter(n => !RECENT.includes(n))]
  return (
    <Card id="share-send" num="04" title="보내기" en="Send to Friends · In-app Share" demo={demo}
      desc="앱 밖으로 나가지 않고 앱 안의 친구에게 콘텐츠를 건네요. 여러 명을 고르고 한마디를 붙일 수 있어요.">
      <Stage log={log} logId="share-send-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            <div className="bar">주말노트</div>
            <div className="sh-post">
              <div className="sh-post-hd"><Av p={person('채원')} size={28} /><b>채원</b><small>어제</small></div>
              <div className="sh-hero g3 tall" aria-hidden="true" />
              <div className="sh-post-t">{ITEM.title}</div>
              <div className="sh-actions">
                <span><Ico n="heart" size={16} />48</span>
                <span><Ico n="chat" size={16} />6</span>
                <button type="button" data-open onClick={() => { setOpen(true); setLog(<>앱 안 친구 목록 — <b>최근 보낸 사람</b>이 먼저예요</>) }}><Ico n="send" size={16} />보내기</button>
              </div>
            </div>
            <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} aria-hidden="true" />
            <div className={'sh-sheet tall ' + (open ? 'full' : 'closed')} role="dialog" aria-label="보내기" aria-hidden={!open} inert={!open}>
              <div className="sh-sh-hd"><b>보내기</b><button type="button" className="sh-x" aria-label="닫기" onClick={() => setOpen(false)}><Ico n="close" size={14} /></button></div>
              {picked.length > 0 && (
                <div className="sh-picked">
                  {picked.map(n => (
                    <button type="button" key={n} aria-label={n + ' 빼기'} onClick={() => toggle(n)}><Av p={person(n)} size={34} /><span>{n} ✕</span></button>
                  ))}
                </div>
              )}
              <div className="sh-search"><Ico n="find" size={14} /><input type="search" aria-label="친구 검색" placeholder="이름 검색" value={q} onChange={e => setQ(e.target.value)} /></div>
              <div className="sh-list">
                {ordered.map((n, i) => (
                  <button type="button" key={n} data-f={n} className="sh-li" aria-pressed={picked.includes(n)} onClick={() => toggle(n)}>
                    <Av p={person(n)} size={30} />
                    <span className="sh-grow">{n}<small>{sent.includes(n) ? '보냄 ✓' : RECENT.includes(n) && i < RECENT.length ? '최근 보냄' : '친구'}</small></span>
                    <span className="sh-check" aria-hidden="true"><Ico n="check" size={12} /></span>
                  </button>
                ))}
              </div>
              <div className="sh-foot">
                <input className="sh-note-in" aria-label="함께 보낼 메시지" placeholder="메시지 추가 (선택)" value={note} onChange={e => setNote(e.target.value)} />
                <button type="button" className="btn sm sh-send-btn" disabled={!picked.length} onClick={send}>{picked.length ? picked.length + '명에게 보내기' : '받을 사람을 골라요'}</button>
              </div>
            </div>
            <Toast t={toast} />
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['선택', '여러 명 · 위 줄에 모음'], ['덧붙임', '한마디 (선택)'], ['기록', '‘보냄’ 표시']]}
        usage={[
          ['언제', '받는 사람도 같은 앱을 쓸 때. 링크 대신 앱 안에서 바로 열려 대화가 이어져요'],
          ['주의', '보낸 뒤 ‘보냄’ 표시가 없으면 같은 사람에게 두 번 보내기 쉬워요. 고른 사람 수를 버튼 글자에 넣어 주세요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 리포스트 · 인용 ---------- */
const ORIGIN = { by: '채원', text: '올가을 첫 캠핑 다녀왔어요. 준비물 목록 공유해요!' }
const REPOST_LOG = <><b>↻</b>를 눌러 그냥 퍼가기와 한마디 덧붙이기를 비교해 보세요</>

function Embed({ small }: { small?: boolean }) {
  return (
    <div className={'sh-embed' + (small ? ' small' : '')}>
      <div className="sh-post-hd"><Av p={person(ORIGIN.by)} size={small ? 18 : 24} /><b>{ORIGIN.by}</b><small>2시간</small></div>
      <div className="sh-embed-t">{ORIGIN.text}</div>
      {!small && <div className="sh-linkcard"><Thumb size={30} /><span>{ITEM.title}<small>{ITEM.host}</small></span></div>}
    </div>
  )
}

export function Repost() {
  const [reposted, setReposted] = useState(false)
  const [quotes, setQuotes] = useState<string[]>([])
  const [menu, setMenu] = useState(false)
  const [compose, setCompose] = useState(false)
  const [draft, setDraft] = useState('')
  const [log, setLog] = useState<ReactNode>(REPOST_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const repost = () => {
    const on = !reposted
    setReposted(on); setMenu(false)
    setLog(on ? <><b>리포스트</b> — 한 번에 끝나요. 내 팔로워 피드에 원글이 그대로 떠요</> : <>리포스트 <b>취소</b> — 다시 누르면 되돌릴 수 있어요</>)
  }
  const post = () => {
    const t = draft.trim()
    if (!t) return
    setQuotes(qs => [t, ...qs]); setDraft(''); setCompose(false)
    setLog(<><b>인용</b> — 내 글이 새로 생기고 원글은 그 안에 작게 담겨요</>)
  }

  const demo = useDemo({
    reset() { setReposted(false); setQuotes([]); setMenu(false); setCompose(false); setDraft(''); setLog(REPOST_LOG) },
    async play(c) {
      const q1 = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q1('.sh-rp')); await c.sleep(900)
      await c.press(dev.current, q1('[data-opt="repost"]')); await c.sleep(1600)
      await c.press(dev.current, q1('.sh-rp')); await c.sleep(800)
      await c.press(dev.current, q1('[data-opt="quote"]')); await c.sleep(900)
      c.tap(dev.current, q1('textarea'))
      let s = ''
      for (const ch of '저도 이번 주말에 따라 해 볼게요') { s += ch; setDraft(s); await c.sleep(70) }
      await c.sleep(500)
      await c.press(dev.current, q1('.sh-post-btn')); await c.sleep(900)
    },
  })

  return (
    <Card id="share-repost" num="06" title="리포스트 · 인용" en="Repost · Quote" demo={demo}
      desc="남의 글을 내 피드에 다시 올려요. 그대로 퍼가면 리포스트, 내 의견을 붙이면 인용이에요.">
      <Stage log={log} logId="share-repost-log">
        <Device ref={dev}>
          <div className="scr sh-scr">
            {!compose ? (
              <>
                <div className="bar">라운지</div>
                <div className="sh-feed">
                  {quotes.map((t, i) => (
                    <div className="sh-fpost sh-new" key={quotes.length - i}>
                      <div className="sh-post-hd"><Av p={{ n: '나', tone: 0 }} size={24} /><b>나</b><small>방금</small></div>
                      <div className="sh-embed-t">{t}</div>
                      <Embed small />
                    </div>
                  ))}
                  <div className="sh-fpost">
                    {reposted && <div className="sh-rptag"><Ico n="repost" size={12} />내가 리포스트함</div>}
                    <div className="sh-post-hd"><Av p={person(ORIGIN.by)} size={24} /><b>{ORIGIN.by}</b><small>2시간</small></div>
                    <div className="sh-embed-t">{ORIGIN.text}</div>
                    <div className="sh-linkcard"><Thumb size={30} /><span>{ITEM.title}<small>{ITEM.host}</small></span></div>
                    <div className="sh-actions">
                      <span><Ico n="chat" size={15} />3</span>
                      <button type="button" className={'sh-rp' + (reposted ? ' on' : '')} aria-label={'리포스트 ' + (12 + (reposted ? 1 : 0)) + (quotes.length ? ', 인용 ' + quotes.length : '')} aria-haspopup="menu" aria-expanded={menu}
                        onClick={() => setMenu(true)}><Ico n="repost" size={15} />{12 + (reposted ? 1 : 0)}{quotes.length > 0 && <small> · 인용 {quotes.length}</small>}</button>
                      <span><Ico n="heart" size={15} />48</span>
                    </div>
                  </div>
                </div>
                <div className={'scrim' + (menu ? ' on' : '')} onClick={() => setMenu(false)} aria-hidden="true" />
                <div className={'sh-sheet ' + (menu ? 'auto' : 'closed')} role="menu" aria-label="리포스트" aria-hidden={!menu} inert={!menu}>
                  <button type="button" role="menuitem" data-opt="repost" className="sh-menu" onClick={repost}><Ico n="repost" />{reposted ? '리포스트 취소' : '리포스트'}<small>그대로 퍼가기</small></button>
                  <button type="button" role="menuitem" data-opt="quote" className="sh-menu" onClick={() => { setMenu(false); setCompose(true); setLog(<><b>인용하기</b> — 원글을 품은 새 글을 써요</>) }}><Ico n="edit" />인용하기<small>한마디 덧붙이기</small></button>
                  <button type="button" className="sh-menu cancel" onClick={() => setMenu(false)}>취소</button>
                </div>
              </>
            ) : (
              <>
                <div className="bar">
                  <button type="button" className="sh-iconbtn" aria-label="인용 취소" onClick={() => { setCompose(false); setLog(<>쓰던 인용을 <b>닫았어요</b></>) }}><Ico n="close" size={16} /></button>
                  인용하기<span className="sp" />
                  <button type="button" className="btn sm sh-post-btn" disabled={!draft.trim()} onClick={post}>게시</button>
                </div>
                <div className="sh-compose">
                  <textarea aria-label="덧붙일 의견" placeholder="의견을 덧붙여 보세요" value={draft} onChange={e => setDraft(e.target.value)} rows={3} />
                  <Embed />
                  {!draft.trim() && <div className="sh-note">의견 없이 올리려면 ‘리포스트’를 써요</div>}
                </div>
              </>
            )}
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['리포스트', '한 번 누르기 · 되돌리기'], ['인용', '새 글 + 원글 담기'], ['숫자', '따로 세기']]}
        usage={[
          ['언제', '피드형 서비스에서 남의 글을 내 팔로워에게 다시 보여줄 때'],
          ['주의', '리포스트는 실수로 누르기 쉬워요. 바로 실행하지 말고 메뉴를 한 번 거치거나, 다시 눌러 취소할 수 있게 해 주세요'],
        ]}
      />
    </Card>
  )
}
