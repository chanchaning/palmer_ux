import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Device, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { GR, Tag, scrollAnim } from '../shared'

/* ---------- 07 페이지네이션 ---------- */
const N = 12, PER = 5
const TITLES = ['서비스 점검 안내', '개인정보 처리방침 변경', '신규 기능 소개', '이벤트 당첨자 발표', '앱 업데이트 소식', '고객센터 운영시간 변경', '보안 강화 안내', '결제 수단 추가']

export function Pagination() {
  const frame = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  const [cur, setCur] = useState(4)
  const [anim, setAnim] = useState(0)
  const [narrow, setNarrow] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>번호나 <b>‹ ›</b>를 눌러 쪽을 옮겨 보세요</>)

  // 좁으면 현재 쪽 양옆 번호를 줄여요
  useLayoutEffect(() => {
    const el = nav.current
    if (!el) return
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 290))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sib = narrow ? 0 : 1
  const set = new Set([1, N])
  for (let i = cur - sib; i <= cur + sib; i++) if (i >= 1 && i <= N) set.add(i)
  const pages = [...set].sort((a, b) => a - b)
  const start = (cur - 1) * PER

  const go = (p: number) => {
    if (p < 1 || p > N || p === cur) return
    setCur(p); setAnim(a => a + 1)
    setLog(<><b>{p} / {N}쪽</b> · {(p - 1) * PER + 1}–{p * PER}번째 글{p === 1 ? ' — 첫 쪽이라 ‹ 비활성' : p === N ? ' — 마지막 쪽이라 › 비활성' : ''}</>)
  }

  const demo = useDemo({
    reset() { setCur(4); setLog(<>번호나 <b>‹ ›</b>를 눌러 쪽을 옮겨 보세요</>) },
    async play(c) {
      const q = (s: string) => nav.current?.querySelector<HTMLElement>(s) ?? null
      await c.press(frame.current, q('[data-p="5"]')); await c.sleep(1000)
      await c.press(frame.current, q('[data-p="12"]')); await c.sleep(1100)
      await c.press(frame.current, q('[data-p="1"]')); await c.sleep(1000)
      const all = nav.current?.querySelectorAll<HTMLElement>('button')
      await c.press(frame.current, all ? all[all.length - 1] : null); await c.sleep(400)
    },
  })

  return (
    <Card id="layout-pagination" num="07" title="페이지네이션" en="Pagination"
      desc="목록을 쪽 단위로 나누고, 번호로 원하는 쪽에 바로 가요." demo={demo}>
      <Stage log={log} logId="layout-pagination-log">
        <div className="ly-browser" ref={frame}>
          <div className="ly-chrome"><i /><i /><i /><div className="ly-url">board.example/notice?page={cur}</div></div>
          <div className="ly-page" style={{ paddingTop: 12 }}>
            <h4>공지사항<small>총 60개</small></h4>
            <div className={'ly-posts' + (anim ? ' in' : '')} key={anim}>
              {[0, 1, 2, 3, 4].map(k => (
                <div className="ly-row" key={k}>
                  <span className="n">{60 - start - k}</span>
                  <span className="t">{TITLES[(start + k) % TITLES.length]}</span>
                  <span className="d">10.{String(28 - ((start + k) % 27)).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
            <nav className="ly-pager ly-hl" ref={nav} aria-label="페이지">
              <button data-p={cur - 1} aria-label="이전 페이지" disabled={cur === 1} onClick={() => go(cur - 1)}>‹</button>
              {pages.map((p, i) => (
                <Fragment key={p}>
                  {i > 0 && p - pages[i - 1] > 1 && <span className="gap">…</span>}
                  <button data-p={p} aria-current={p === cur ? 'page' : undefined} onClick={() => go(p)}>{p}</button>
                </Fragment>
              ))}
              <button data-p={cur + 1} aria-label="다음 페이지" disabled={cur === N} onClick={() => go(cur + 1)}>›</button>
            </nav>
            <Tag style={{ right: 14, bottom: 44 }}>페이지네이션</Tag>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['위치', '목록 맨 아래'], ['역할', '쪽 단위 이동'], ['예시', '게시판 · 검색 결과']]}
        usage={[['언제', '‘몇 번째쯤’을 기억하거나 특정 위치로 다시 돌아와야 할 때'], ['주의', '현재 쪽은 확실히 구분하고, 처음·끝에선 이전·다음을 비활성해요. 쪽이 많으면 ‘…’로 줄여요']]}
      />
    </Card>
  )
}

/* ---------- 08 무한 스크롤 ---------- */
const MAX = 4 // 첫 묶음 + 3번 더
const TOPICS = ['오늘의 추천', '새로 올라온 글', '친구 소식', '인기 급상승', '지금 뜨는 영상', '주변 소식']
interface Post { n: number; isNew: boolean }
const firstBatch = (): Post[] => Array.from({ length: 8 }, (_, i) => ({ n: i + 1, isNew: false }))

export function Infinite() {
  const m = useMotion()
  const timers = useTimers()
  const dev = useRef<HTMLDivElement>(null)
  const sc = useRef<HTMLDivElement>(null)
  const [posts, setPosts] = useState<Post[]>(firstBatch)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<ReactNode>('↓ 끝까지 내리면 더 불러와요')
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<ReactNode>(<>폰 안을 <b>끝까지 스크롤</b>해 보세요</>)
  const st = useRef({ batches: 1, total: 8, loading: false })

  const resetAll = () => {
    timers.clear()
    st.current = { batches: 1, total: 8, loading: false }
    setPosts(firstBatch()); setLoading(false); setDone(false)
    if (sc.current) sc.current.scrollTop = 0
    setMsg('↓ 끝까지 내리면 더 불러와요')
  }

  const check = () => {
    const s = st.current, el = sc.current
    if (!el || s.loading || s.batches >= MAX) return
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 30) return
    s.loading = true
    setLoading(true)
    setMsg(<span className="spinner" />)
    setLog(<>바닥에 닿기 전에 <b>다음 6개를 불러오는 중</b> · 스켈레톤으로 자리 확보</>)
    timers.set(() => {
      const from = s.total
      s.total += 6; s.batches++; s.loading = false
      setPosts(p => [...p, ...Array.from({ length: 6 }, (_, i) => ({ n: from + i + 1, isNew: true }))])
      setLoading(false)
      if (s.batches >= MAX) {
        setDone(true)
        setMsg('✓ 모두 봤어요 · ' + s.total + '개')
        setLog(<>더 없을 땐 <b>‘모두 봤어요’</b>로 끝을 알려요</>)
      } else {
        setMsg('↓ 계속 내리면 더 불러와요')
        setLog(<><b>{s.total}개</b> — 끊김 없이 이어 붙었어요 ({s.batches - 1}/{MAX - 1})</>)
      }
    }, m.D(900))
  }

  const demo = useDemo({
    reset() { resetAll(); setLog(<>폰 안을 <b>끝까지 스크롤</b>해 보세요</>) },
    async play(c) {
      const toBottom = async () => {
        const el = sc.current
        c.tap(dev.current, el)
        if (el) await scrollAnim(el, el.scrollHeight - el.clientHeight, 900, m.D, c.alive)
        if (!c.alive()) return
        check(); await c.sleep(1300)
      }
      await toBottom(); await toBottom(); await toBottom(); await c.sleep(300)
    },
  })

  return (
    <Card id="layout-infinite" num="08" title="무한 스크롤" en="Infinite Scroll"
      desc="끝에 닿기 전에 다음 내용을 알아서 불러와 계속 이어서 보여줘요." demo={demo}>
      <Stage log={log} logId="layout-infinite-log">
        <Device ref={dev}>
          <div className="scr">
            <div className="bar">새 소식<span className="sp" /><span className="muted">{posts.length}개</span></div>
            <div className="ly-scroll" ref={sc} onScroll={check}>
              <div>
                {posts.map(({ n, isNew }) => (
                  <div className={'ly-post' + (isNew ? ' ly-new' : '')} key={n}>
                    <span className={'av ' + GR[n % 4]} />
                    <div className="tx">{TOPICS[n % TOPICS.length]} #{n}<div className="fake-line" style={{ width: 50 + ((n * 23) % 45) + '%' }} /></div>
                  </div>
                ))}
                {loading && [0, 1, 2].map(i => (
                  <div className="ly-skel" key={'sk' + i}>
                    <span className="sk circle" style={{ width: 32, height: 32 }} />
                    <div className="tx"><span className="sk" style={{ height: 8, width: '50%' }} /><span className="sk" style={{ height: 7, width: '80%' }} /></div>
                  </div>
                ))}
              </div>
              <div className={'ly-sentinel ly-hl' + (done ? ' done' : '')}>
                <Tag style={{ left: 8, top: 6 }}>로딩 영역</Tag><span>{msg}</span>
              </div>
            </div>
          </div>
        </Device>
      </Stage>
      <Info
        spec={[['위치', '목록 맨 아래'], ['역할', '끊김 없는 탐색'], ['예시', '피드형 SNS · 숏폼앱']]}
        usage={[['언제', '순서보다 둘러보는 재미가 중요한 피드'], ['주의', '푸터에 닿을 수 없게 돼요. 불러오는 중 표시와 ‘모두 봤어요’ 끝 표시를 꼭 줘요']]}
      />
    </Card>
  )
}
