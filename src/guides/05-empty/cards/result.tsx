import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Empty, Hl, Phone, useAnatomy } from '../shared'

/* ---------- 06 모두 완료 ---------- */
const TODO = ['기획안 피드백 반영', '팀 점심 예약', '운동 30분']
const DONE_LOG = <>체크해서 <b>모두 끝내</b> 보세요</>
const CF_COLORS = ['var(--accent)', 'var(--b)', 'var(--danger)', 'var(--accent)', 'var(--b)']

export function AllDone() {
  const { hl, spec } = useAnatomy()
  const m = useMotion()
  const timers = useTimers()
  const [left, setLeft] = useState<string[]>(TODO)
  const [checked, setChecked] = useState<string[]>([])
  const [party, setParty] = useState(0)
  const [log, setLog] = useState<ReactNode>(DONE_LOG)
  const leftRef = useRef(TODO)
  const dev = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  // 축하 컨페티 (임시 요소만 직접 만들어요)
  useEffect(() => {
    if (!party) return
    const host = body.current?.querySelector('.em-empty')
    if (!host) return
    const made: HTMLElement[] = []
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('span')
      c.className = 'em-cf'; c.style.background = CF_COLORS[i % 5]
      host.appendChild(c); made.push(c)
      const a = (i / 16) * Math.PI * 2, r = 60 + (i % 4) * 18
      c.animate([
        { transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r - 20}px)) rotate(${i * 47}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r * 1.1}px), calc(-50% + ${Math.sin(a) * r + 70}px)) rotate(${i * 90}deg)`, opacity: 0 },
      ], { duration: m.D(1400), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => c.remove()
    }
    return () => made.forEach(c => c.remove())
  }, [party, m])

  const restore = () => { leftRef.current = TODO; setLeft(TODO); setChecked([]) }
  const check = (t: string) => {
    setChecked(c => [...c, t])
    timers.set(() => {
      const next = leftRef.current.filter(x => x !== t)
      leftRef.current = next
      setLeft(next)
      if (!next.length) setParty(p => p + 1)
      setLog(next.length ? <><b>{next.length}개</b> 남았어요</> : <>🎉 <b>모두 완료</b> — 빈 화면이 곧 보상</>)
    }, m.D(380))
  }
  const demo = useDemo({
    reset() { timers.clear(); restore(); setLog(DONE_LOG) },
    async play(c) {
      for (let i = 0; i < 3; i++) {
        const cb = body.current?.querySelector<HTMLInputElement>('input[data-t]:not(:checked)')
        if (!cb) break
        c.tap(dev.current, cb); await c.sleep(200); cb.click(); await c.sleep(800)
      }
      await c.sleep(1200)
    },
  })

  return (
    <Card id="empty-done" num="06" title="모두 완료" en="All Done · Inbox Zero" demo={demo}
      desc="할 일을 다 끝내서 빈 화면이에요. 문제가 아니라 보상이니 축하해 주세요.">
      <Stage log={log} logId="empty-done-log">
        <Hl hl={hl}>
          <Phone ref={dev}>
            <div className="scr">
              <div className="bar">오늘 할 일<span className="sp" /><span className="badge blue" style={{ visibility: left.length ? undefined : 'hidden' }}>{left.length}</span></div>
              <div className="em-scr" ref={body}>
                {left.length ? left.map(t => (
                  <div className={'em-row' + (checked.includes(t) ? ' done' : '')} key={t}>
                    <label className="opt"><input type="checkbox" data-t={t} aria-label={t + ' 완료'} checked={checked.includes(t)}
                      onChange={e => { if (e.target.checked && !checked.includes(t)) check(t) }} /></label>
                    <span className="grow">{t}</span>
                  </div>
                )) : (
                  <Empty ill="done" title="오늘 할 일을 모두 끝냈어요!" desc="푹 쉬어도 좋아요. 내일 할 일은 미리 적어둘 수 있어요.">
                    <button className="btn sm" onClick={() => setLog(<>축하 화면의 행동은 <b>선택 사항</b> — 강요하지 않아요</>)}>내일 할 일 적기</button>
                    <button className="em-link" onClick={() => { restore(); setLog(<>목록 <b>복원</b></>) }}>되돌리기</button>
                  </Empty>
                )}
              </div>
            </div>
          </Phone>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['톤', '축하 · 보상'], ['행동', '선택 사항']]}
        usage={[
          ['언제', '받은편지함 0, 장바구니 결제 완료, 오늘 할 일 끝처럼 목표를 이룬 빈 상태'],
          ['주의', '‘항목이 없습니다’처럼 오류처럼 들리면 성취감이 사라져요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 07 삭제 직후 ---------- */
type File = [string, string, string]
const FILES: File[] = [['여행 사진.zip', '1.2GB · 어제', 'g1'], ['회의록_11월.pdf', '840KB · 11월 3일', 'g2']]
const DEL_LOG = <>🗑으로 <b>마지막 항목까지</b> 지워 보세요</>

export function JustDeleted() {
  const { hl, spec } = useAnatomy()
  const [items, setItems] = useState<File[]>(FILES)
  const [last, setLast] = useState<{ it: File; i: number } | null>(null)
  const [log, setLog] = useState<ReactNode>(DEL_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const del = (i: number) => {
    const it = items[i], next = items.filter((_, j) => j !== i)
    setLast({ it, i }); setItems(next)
    setLog(next.length ? <><b>‘{it[0]}’</b> 삭제 · {next.length}개 남음</> : <>마지막 항목 삭제 → <b>되돌리기가 가장 먼저</b> 보이는 빈 화면</>)
  }
  const undo = () => {
    if (!last) return
    setItems(l => { const n = [...l]; n.splice(last.i, 0, last.it); return n })
    setLast(null)
    setLog(<>↩ <b>되돌리기</b> — 빈 화면에서 바로 복구</>)
  }
  const demo = useDemo({
    reset() { setItems(FILES); setLast(null); setLog(DEL_LOG) },
    async play(c) {
      const q = (s: string) => dev.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(dev.current, q('.em-x')); await c.sleep(800)
      await c.press(dev.current, q('.em-x')); await c.sleep(1700)
      await c.press(dev.current, q('[data-k="undo"]')); await c.sleep(700)
    },
  })

  return (
    <Card id="empty-deleted" num="07" title="삭제 직후" en="Cleared · Just Deleted" demo={demo}
      desc="마지막 항목을 지워서 비었어요. 방금 한 일을 되짚어 주고 되돌릴 기회를 줘요.">
      <Stage log={log} logId="empty-deleted-log">
        <Hl hl={hl}>
          <Phone ref={dev}>
            <div className="scr">
              <div className="bar">보관함</div>
              <div className="em-scr">
                {items.length ? items.map((it, i) => (
                  <div className="em-row" key={it[0]}>
                    <span className={'em-thumb ' + it[2]} /><span className="grow">{it[0]}<span className="sub">{it[1]}</span></span>
                    <button className="em-x" aria-label={it[0] + ' 삭제'} onClick={() => del(i)}>🗑</button>
                  </div>
                )) : (
                  <Empty ill="deleted" title="보관함이 비었어요" desc={'방금 ‘' + (last?.it[0] ?? '') + '’을 휴지통으로 옮겼어요. 30일 동안 되살릴 수 있어요.'}>
                    <button className="btn sm" data-k="undo" onClick={undo}>↩ 실행 취소</button>
                    <button className="btn ghost sm" onClick={() => setLog(<><b>휴지통</b>으로 이동 — 지운 곳이 어딘지 알려줘요</>)}>휴지통 보기</button>
                  </Empty>
                )}
              </div>
            </div>
          </Phone>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['설명', '방금 한 일 인용'], ['행동', '실행 취소']]}
        usage={[
          ['언제', '목록의 마지막 항목을 지우거나 보관해서 사용자가 직접 비운 직후'],
          ['vs 첫 사용', '새로 만들라고 재촉하기보다 ‘되돌리기’를 가장 먼저 보여줘요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 잠김 ---------- */
const LOCK_LOG = <>흐린 부분이 <b>무엇이 숨어 있는지</b> 알려줘요</>
const LOCK_SVG = '<circle cx="48" cy="50" r="40" class="i-bg"/><path class="em-shackle i-ln i-nf" d="M36 46v-9a12 12 0 0 1 24 0v9"/><rect x="28" y="44" width="40" height="30" rx="7" class="i-b"/><circle cx="48" cy="57" r="4.5" class="i-sf"/><rect x="46" y="59" width="4" height="7" rx="2" class="i-sf"/>'

export function Locked() {
  const { hl, spec } = useAnatomy()
  const m = useMotion()
  const [locked, setLocked] = useState(true)
  const [opening, setOpening] = useState(false)
  const [log, setLog] = useState<ReactNode>(LOCK_LOG)
  const busy = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const open = useRef<HTMLButtonElement>(null)

  const unlock = async (how: ReactNode) => {
    if (busy.current || !locked) return
    busy.current = true
    setOpening(true); setLog(how)
    await m.sleep(550)
    setLocked(false); busy.current = false
    setLog(<>🔓 <b>잠금 해제</b> — 흐림이 걷히고 본문 전체 공개</>)
  }
  const lock = () => { setOpening(false); setLocked(true) }
  const demo = useDemo({
    reset() { busy.current = false; lock(); setLog(LOCK_LOG) },
    async play(c) { await c.sleep(900); await c.press(box.current, open.current); await c.sleep(1600) },
  })

  return (
    <Card id="empty-locked" num="09" title="잠김" en="Locked · Paywall" demo={demo}
      desc="내용은 있지만 볼 수 없어요. 무엇이 숨어 있는지 살짝 보여주고 여는 방법을 알려줘요.">
      <Stage log={log} logId="empty-locked-log">
        <Hl hl={hl}>
          <div className="box left" ref={box}>
            <div className={'em-art' + (locked ? ' locked' : '') + (opening ? ' opening' : '')}>
              <h4>2026 UX 트렌드 리포트</h4>
              <p>올해 가장 많이 바뀐 건 ‘빈 화면’이었어요. 서비스들은 비어 있는 순간을 안내의 기회로 쓰기 시작했고…</p>
              <div className="em-lockbody">
                <p>첫째, 빈 화면의 문장이 짧아졌어요. 제목은 상황을, 설명은 이유를, 버튼은 다음 행동을 맡아요.</p>
                <p>둘째, 일러스트는 작아지고 버튼은 커졌어요. 셋째, 오류와 완료를 같은 모양으로 그리지 않아요.</p>
                <p>넷째, 권한 요청은 시스템 창보다 설명 화면이 먼저 나와요.</p>
              </div>
              <div className="em-gate">
                <div className="em-empty">
                  <div className="em-ill" data-part="ill"><svg viewBox="0 0 96 96" aria-hidden="true" dangerouslySetInnerHTML={{ __html: LOCK_SVG }} /></div>
                  <div className="em-t" data-part="title">멤버십 회원 전용 글이에요</div>
                  <p className="em-d" data-part="desc">남은 3,800자와 도표 12개를 읽을 수 있어요.</p>
                  <div className="em-act" data-part="act">
                    <button className="btn orange sm" ref={open} onClick={() => unlock(<><b>7일 무료</b> 시작 → 자물쇠가 열려요</>)}>7일 무료로 열기</button>
                    <button className="em-link" onClick={() => unlock(<><b>로그인</b>한 회원은 바로 열려요</>)}>이미 회원이에요</button>
                  </div>
                </div>
              </div>
            </div>
            <button className="btn ghost sm" hidden={locked} onClick={() => { lock(); setLog(<>다시 잠김 — <b>앞부분만 보이고 나머지는 흐리게</b></>) }}>🔒 다시 잠그기</button>
          </div>
        </Hl>
      </Stage>
      <Info
        spec={[spec, ['미리보기', '앞부분 + 흐림'], ['행동', '무료 체험 · 로그인']]}
        usage={[
          ['언제', '유료 콘텐츠, 레벨 제한, 로그인 후 볼 수 있는 내용처럼 ‘있지만 막힌’ 상태'],
          ['주의', '완전히 가리면 가치가 안 보여요 — 앞부분과 분량을 보여주세요'],
        ]}
      />
    </Card>
  )
}
