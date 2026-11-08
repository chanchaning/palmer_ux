import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { DemoPane, PairCard } from '../../../components/Card'
import { useTimers } from '../../../components/ui'

const FakeLines = () => (
  <>
    <div className="fake-line" style={{ width: '60%' }} />
    <div className="fake-line" />
    <div className="fake-line" style={{ width: '80%' }} />
    <div style={{ flex: 1 }} />
  </>
)

/* ---------- 04 모달 vs 바텀시트 ---------- */
export function ModalVsSheet() {
  const dialog = useRef<HTMLDivElement>(null)
  const [modal, setModal] = useState(false)
  const [modalLog, setModalLog] = useState<ReactNode>(<>배경을 눌러도 <b>안 닫혀요</b> — 선택 필수</>)

  const sheet = useRef<HTMLDivElement>(null)
  const [sheetOn, setSheetOn] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [sheetLog, setSheetLog] = useState<ReactNode>(<>배경 탭 · <b>아래로 끌어서</b> 닫기</>)
  const drag = useRef<{ y0: number | null; dy: number }>({ y0: null, dy: 0 })

  const closeModal = (msg: ReactNode) => { setModal(false); setModalLog(msg) }
  const setT = (v: string) => { if (sheet.current) sheet.current.style.transform = v }
  const openSheet = () => { setSheetOn(true); setT('') }
  const closeSheet = (msg?: ReactNode) => { setSheetOn(false); setT(''); if (msg) setSheetLog(msg) }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { y0: e.clientY, dy: 0 }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent) => {
    const d = drag.current
    if (d.y0 === null) return
    d.dy = Math.max(0, e.clientY - d.y0)
    setT(`translateY(${d.dy}px)`)
  }
  const end = () => {
    const d = drag.current
    if (d.y0 === null) return
    setDragging(false)
    d.y0 = null
    if (d.dy > 50) closeSheet(<><b>아래로 스와이프</b>해서 닫힘</>)
    else setT('')
  }

  return (
    <PairCard id="c-modal" num="04" a="모달" b="바텀시트" desc="꼭 답을 받아야 하면 모달, 하던 일 위에 옵션을 잠깐 펼치면 바텀시트."
      diff={[
        ['위치', '화면 중앙', '화면 하단에서 올라옴'],
        ['닫기', '버튼으로만 (명시적 결정)', '스와이프 · 배경 탭으로 쉽게'],
        ['용도', '확인·경고·중요한 결정', '공유, 옵션 선택, 부가 정보'],
      ]}>
      <DemoPane label="모달" en="Modal Dialog" log={modalLog}>
        <div className="stage phone">
          <div className="app-mock">
            <FakeLines />
            <button className="btn danger" onClick={() => { setModal(true); setModalLog(<>배경을 눌러도 <b>안 닫혀요</b> — 선택 필수</>) }}>게시글 삭제</button>
          </div>
          <div className={'scrim' + (modal ? ' on' : '')} onClick={() => {
            dialog.current?.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.04)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 220 })
            setModalLog(<>👆 배경 탭 무시됨 · <b>버튼으로 결정</b>해야 해요</>)
          }} />
          <div className={'dialog' + (modal ? ' on' : '')} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="dlgT">
            <h4 id="dlgT">게시글을 삭제할까요?</h4>
            <p>삭제하면 되돌릴 수 없어요.</p>
            <div className="row">
              <button className="btn ghost sm" onClick={() => closeModal(<><b>취소함</b> (결정 완료)</>)}>취소</button>
              <button className="btn danger sm" onClick={() => closeModal(<><b>삭제됨</b> (결정 완료)</>)}>삭제</button>
            </div>
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="바텀시트" en="Bottom Sheet" log={sheetLog}>
        <div className="stage phone">
          <div className="app-mock">
            <FakeLines />
            <button className="btn orange" onClick={openSheet}>공유하기</button>
          </div>
          <div className={'scrim' + (sheetOn ? ' on' : '')} onClick={() => closeSheet(<><b>배경 탭</b>으로 닫힘</>)} />
          <div className={'sheet' + (sheetOn ? ' on' : '') + (dragging ? ' dragging' : '')} ref={sheet}>
            <div className="grabber" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
            {([['K', '카카오톡'], ['🔗', '링크 복사'], ['…', '더보기']] as const).map(([i, t]) => (
              <button className="sheet-item" key={t} onClick={() => closeSheet(<><b>{t}</b> 선택</>)}><i>{i}</i>{t}</button>
            ))}
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 05 토스트 vs 스낵바 ---------- */
interface Mail { id: number; from: string; text: string }
const MAILS: Mail[] = [
  { id: 1, from: '김', text: '이번 주 회의록 공유드립니다' },
  { id: 2, from: '박', text: '디자인 시안 v3 확인 부탁해요' },
  { id: 3, from: '이', text: '점심 메뉴 투표 🍜' },
]

export function ToastVsSnackbar() {
  const timers = useTimers()
  const toastT = useRef<number | undefined>(undefined)
  const snackT = useRef<number | undefined>(undefined)
  const [toast, setToast] = useState(false)

  const [mails, setMails] = useState<Mail[]>(MAILS)
  const [gone, setGone] = useState<number[]>([])
  const [snack, setSnack] = useState(false)
  const [snackLog, setSnackLog] = useState<ReactNode>(<>✕를 눌러 삭제 → <b>실행 취소</b>해보세요</>)
  const removed = useRef<{ mail: Mail; idx: number } | null>(null)
  const timer = useRef<HTMLSpanElement>(null)

  const copy = () => {
    setToast(true)
    timers.clear(toastT.current)
    toastT.current = timers.set(() => setToast(false), 2000)
  }

  const del = (m: Mail) => {
    removed.current = { mail: m, idx: mails.findIndex(x => x.id === m.id) }
    setGone(g => [...g, m.id])
    timers.set(() => {
      setMails(ms => ms.filter(x => x.id !== m.id))
      setGone(g => g.filter(id => id !== m.id))
    }, 250)
    setSnack(true)
    const t = timer.current
    if (t) {
      t.style.transition = 'none'; t.style.width = '100%'; void t.offsetWidth
      t.style.transition = 'width 4s linear'; t.style.width = '0'
    }
    timers.clear(snackT.current)
    snackT.current = timers.set(() => { setSnack(false); removed.current = null; setSnackLog(<>4초가 지나 <b>삭제 확정</b></>) }, 4000)
    setSnackLog(<>4초 안에 <b>실행 취소</b> 가능</>)
  }
  const undo = () => {
    const r = removed.current
    if (!r) return
    timers.clear(snackT.current)
    removed.current = null
    timers.set(() => setMails(ms => {
      if (ms.find(x => x.id === r.mail.id)) return ms
      const n = ms.slice(); n.splice(r.idx, 0, r.mail); return n
    }), 260)
    setSnack(false)
    setSnackLog(<>↩ <b>복구됨</b> — 액션이 있는 알림</>)
  }

  return (
    <PairCard id="c-toast" num="05" a="토스트" b="스낵바" desc="알려주고 사라지면 토스트, ‘실행 취소’ 같은 행동이 붙으면 스낵바."
      diff={[
        ['액션', '없음 (정보만)', '1개 (실행 취소, 다시 시도 등)'],
        ['위치', '상단·중앙 등 자유롭게', '주로 하단'],
        ['용도', '“저장됨”, “복사됨” 결과 알림', '되돌릴 수 있는 작업 직후'],
      ]}>
      <DemoPane label="토스트" en="Toast" log={<>2초 뒤 <b>자동으로 사라짐</b> · 버튼 없음</>}>
        <div className="stage">
          <div className={'toast' + (toast ? ' on' : '')} role="status">✓ 링크가 복사되었어요</div>
          <div className="center">
            <div className="muted">palmer.design/share/ux-82f1</div>
            <button className="btn" onClick={copy}>링크 복사</button>
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="스낵바" en="Snackbar" log={snackLog}>
        <div className="stage" style={{ justifyContent: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mails.length ? mails.map(m => (
              <div className={'mail' + (gone.includes(m.id) ? ' gone' : '')} key={m.id}>
                <span className="av">{m.from}</span><span className="grow">{m.text}</span>
                <button className="x" aria-label="삭제" onClick={() => del(m)}>✕</button>
              </div>
            )) : <div className="muted" style={{ textAlign: 'center', padding: '30px 0' }}>받은 메일이 없어요</div>}
          </div>
          <div className={'snackbar' + (snack ? ' on' : '')} role="status">
            <span>메일 1개를 삭제했어요</span><button onClick={undo}>실행 취소</button><span className="timer" ref={timer} />
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}

/* ---------- 06 툴팁 vs 팝오버 ---------- */
const PRICES = ['1만원 이하', '1~5만원', '5만원 이상']

export function TooltipVsPopover() {
  const anchor = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState<number[]>([])
  const [draft, setDraft] = useState([false, false, false])
  const [popLog, setPopLog] = useState<ReactNode>(<><b>클릭</b>해서 열고, 바깥을 누르면 닫혀요</>)

  const setPop = (on: boolean) => { setOpen(on); if (on) setDraft(PRICES.map((_, i) => applied.includes(i))) }

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (anchor.current?.contains(e.target as Node)) return
      setOpen(false)
      setPopLog(<><b>바깥 클릭</b>으로 닫힘 (적용 안 됨)</>)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [open])

  const apply = () => {
    const a = draft.map((c, i) => (c ? i : -1)).filter(i => i >= 0)
    setApplied(a)
    setOpen(false)
    setPopLog(<>필터 <b>{a.length}개 적용</b> — 안에서 조작 가능</>)
  }

  return (
    <PairCard id="c-tooltip" num="06" a="툴팁" b="팝오버" desc="마우스를 올리면 짧은 설명이 뜨면 툴팁, 클릭해서 조작할 수 있는 창이 뜨면 팝오버."
      diff={[
        ['열기', '호버 · 포커스', '클릭 · 탭'],
        ['내용', '짧은 텍스트 한 줄', '버튼·입력 등 상호작용 요소'],
        ['모바일', '호버가 없어 부적합', '그대로 사용 가능'],
      ]}>
      <DemoPane label="툴팁" en="Tooltip" log={<>아이콘 위에 <b>마우스를 올려보세요</b></>}>
        <div className="stage">
          <div className="icon-row">
            <button className="icon-btn" aria-label="저장">💾<span className="tip">저장 (Ctrl+S)</span></button>
            <button className="icon-btn" aria-label="공유">📤<span className="tip">공유하기</span></button>
            <button className="icon-btn" aria-label="삭제">🗑️<span className="tip">휴지통으로 이동</span></button>
          </div>
        </div>
      </DemoPane>
      <DemoPane side="b" label="팝오버" en="Popover" log={popLog}>
        <div className="stage" style={{ justifyContent: 'flex-start', paddingTop: 22 }}>
          <div className="pop-anchor" ref={anchor}>
            <button className="filter-btn" aria-expanded={open} onClick={() => setPop(!open)}>
              필터<span className="cnt" hidden={!applied.length}>{applied.length}</span>
            </button>
            <div className={'popover' + (open ? ' on' : '')}>
              <div className="muted">가격대</div>
              {PRICES.map((p, i) => (
                <label className="opt" key={p}>
                  <input type="checkbox" checked={draft[i]} onChange={e => setDraft(d => d.map((x, j) => (j === i ? e.target.checked : x)))} /> {p}
                </label>
              ))}
              <div className="row">
                <button className="btn ghost sm" onClick={() => setDraft([false, false, false])}>초기화</button>
                <button className="btn sm orange" onClick={apply}>적용</button>
              </div>
            </div>
          </div>
        </div>
      </DemoPane>
    </PairCard>
  )
}
