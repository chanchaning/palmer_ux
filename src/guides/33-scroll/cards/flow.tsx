import { useRef, useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { Knob, Para, View } from '../shared'
import { clamp, reduced, useScroller } from '../util'

/* ---------- 08 진행 바 ---------- */
type Shape = 'bar' | 'ring'
export function Progress() {
  const s = useScroller()
  const [p, setP] = useState(0)
  const [shape, setShape] = useState<Shape>('bar')
  const pct = Math.round(p * 100)
  const toTop = () => s.ref.current?.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' })
  const demo = useDemo({
    reset() { s.home(); setP(0) },
    async play(c) {
      await s.glide(c, s.max(), 2800); await c.sleep(500)
      await s.glide(c, 0, 900)
    },
  })
  return (
    <Card id="scroll-progress" num="08" title="진행 바" en="Scroll Progress" demo={demo}
      desc="얼마나 읽었고 얼마나 남았는지를 막대나 고리로 보여줘요. 긴 글에서 ‘끝이 있다’는 걸 알려줘요.">
      <Stage log={pct === 0 ? <>글을 내리면 {shape === 'bar' ? '위쪽 막대' : '구석의 고리'}가 <b>차올라요</b></> : pct >= 100 ? <><b>다 읽었어요</b> · 끝에 닿았다는 걸 분명히 알려줘요</> : <><b>{pct}%</b> 읽었어요 · 남은 분량을 가늠할 수 있어요</>}>
        <div className="box left sc-box">
          <View s={s} label="진행 바 데모" onScroll={el => setP(clamp(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)))}>
            {shape === 'bar' ? (
              <div className="sc-pg-bar" role="progressbar" aria-label="읽은 분량" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <i style={{ transform: `scaleX(${p.toFixed(4)})` }} />
              </div>
            ) : (
              <div className="sc-pg-fabwrap">
                <button className={'sc-pg-fab' + (p > 0.04 ? ' on' : '')} onClick={toTop} tabIndex={p > 0.04 ? 0 : -1} aria-label={`맨 위로 가기, ${pct}% 읽음`}>
                  <svg viewBox="0 0 40 40" aria-hidden="true">
                    <circle className="tr" cx="20" cy="20" r="17" />
                    <circle className="fl" cx="20" cy="20" r="17" pathLength={100} strokeDasharray="100" strokeDashoffset={(100 - p * 100).toFixed(2)} />
                  </svg>
                  <span aria-hidden="true">↑</span>
                </button>
              </div>
            )}
            <article className="sc-body sc-pg-art">
              <h4>긴 글을 끝까지 읽게 하는 법</h4>
              <Para>사람은 끝이 보이지 않는 일을 오래 하지 못해요. 글도 마찬가지예요. 얼마나 남았는지 모르면 중간에 닫아 버려요.</Para>
              <h5>첫 문단에서 약속하기</h5>
              <Para>이 글을 읽으면 무엇을 얻는지 처음 세 줄 안에 말해요. 약속이 분명하면 조금 길어도 따라와요.</Para>
              <h5>중간에 쉼표 두기</h5>
              <Para>소제목, 그림, 인용문은 숨 쉴 자리예요. 화면 두 장을 넘기도록 글만 이어지지 않게 해요.</Para>
              <h5>한 문단에 한 가지만</h5>
              <Para>문단 하나에 생각 하나만 담아요. 훑어보는 사람도 첫 문장만 이어 읽으면 줄거리를 잡을 수 있어요.</Para>
              <h5>끝을 알려주기</h5>
              <Para>마지막에는 다음에 읽을 글이나 할 일을 하나만 권해요. 끝났다는 신호가 있어야 만족하고 떠나요.</Para>
            </article>
          </View>
          <div className="sc-ctrl">
            <Knob label="모양"><Seg value={shape} onChange={setShape} options={[['bar', '위쪽 막대'], ['ring', '고리 버튼']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['막대 두께', '2–4px'], ['고리 버튼', '40–48px'], ['갱신', '스크롤과 동시에']]}
        usage={[
          ['언제', '기사, 약관, 문서처럼 화면 서너 장을 넘는 긴 글. 짧은 페이지에는 필요 없어요'],
          ['원리', '내린 거리 ÷ (전체 높이 − 창 높이)가 곧 진행률이에요. 막대는 폭이 아니라 scaleX로 늘려야 매번 배치를 다시 계산하지 않아요.'],
          ['주의', '댓글과 추천 글까지 합쳐 재면 본문을 다 읽어도 60%에 멈춰요. 본문 구간만 재고, 고리 버튼은 ‘맨 위로’처럼 눌렀을 때 하는 일이 있어야 해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 09 무한 스크롤 ---------- */
const POOL = ['주말에 가기 좋은 곳', '비 오는 날 듣는 노래', '책상 정리하는 법', '아침을 바꾸는 습관', '오래 쓰는 물건들', '동네 빵집 지도', '혼자 걷기 좋은 길', '한 그릇 저녁']
const FIRST = 8, PAGE = 6, PAGES = 3
const TOTAL = FIRST + PAGE * PAGES
type Feed = 'auto' | 'button'
export function Infinite() {
  const m = useMotion()
  const timers = useTimers()
  const s = useScroller()
  const box = useRef<HTMLDivElement>(null)
  const more = useRef<HTMLButtonElement>(null)
  const busy = useRef(false)
  const [n, setN] = useState(FIRST)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Feed>('auto')
  const done = n >= TOTAL
  const load = () => {
    if (busy.current || done) return
    busy.current = true; setLoading(true)
    timers.set(() => { busy.current = false; setLoading(false); setN(v => Math.min(TOTAL, v + PAGE)) }, m.D(900))
  }
  /** 바닥까지 80px 남았을 때 미리 불러와요 */
  const onScroll = (el: HTMLDivElement) => { if (mode === 'auto' && el.scrollHeight - el.scrollTop - el.clientHeight < 80) load() }
  const demo = useDemo({
    reset() { timers.clear(); busy.current = false; setLoading(false); setN(FIRST); s.home() },
    async play(c) {
      await s.glide(c, s.max(), 1500)
      if (mode === 'button') await c.press(box.current, more.current)
      await c.sleep(1400)
      await s.glide(c, s.max(), 1400); await c.sleep(600)
    },
  })
  return (
    <Card id="scroll-infinite" num="09" title="무한 스크롤" en="Infinite Scroll" demo={demo}
      desc="바닥에 닿기 전에 다음 묶음을 불러와 이어 붙여요. 넘기는 버튼 없이 계속 내려가며 봐요.">
      <Stage log={loading ? <>다음 <b>{PAGE}개</b>를 불러오는 중이에요</> : done ? <><b>{TOTAL}개</b>를 모두 봤어요 · 끝이 있으면 끝이라고 말해 줘요</> : <><b>{n}개</b> 불러옴 · {mode === 'auto' ? '바닥에 닿기 전에 알아서 이어 붙여요' : '버튼을 눌러야 더 불러와요'}</>}>
        <div className="box left sc-box" ref={box}>
          <View s={s} label="무한 스크롤 데모" onScroll={onScroll}>
            <ul className="sc-inf" aria-busy={loading}>
              {Array.from({ length: n }, (_, i) => (
                <li key={i}><i style={{ ['--h' as string]: (i * 47) % 360 }} aria-hidden="true" /><div><b>{POOL[i % POOL.length]}</b><span>{i + 1}번째 글</span></div></li>
              ))}
            </ul>
            <div className="sc-inf-foot">
              {loading ? <span role="status"><i className="sc-spin" aria-hidden="true" />불러오는 중</span>
                : done ? <span>모두 봤어요</span>
                  : mode === 'button' ? <button className="btn ghost sm" ref={more} onClick={load}>{PAGE}개 더 보기</button>
                    : <span aria-hidden="true">·</span>}
            </div>
          </View>
          <div className="sc-ctrl">
            <Knob label="더 불러오기"><Seg value={mode} onChange={setMode} options={[['auto', '알아서'], ['button', '버튼으로']]} /></Knob>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['미리 불러오기', '바닥 200–600px 전'], ['한 묶음', '10–30개'], ['끝 표시', '필수']]}
        usage={[
          ['언제', '피드, 사진, 추천처럼 목적 없이 둘러보는 목록. 특정 항목을 찾아가야 하는 목록에는 페이지 번호가 나아요'],
          ['원리', '목록 끝에 보이지 않는 표식을 두고, 그게 화면 가까이 오면 다음 묶음을 요청해요. 요청 중에는 또 부르지 않게 막아 둬요.'],
          ['주의', <>바닥이 계속 밀려나서 맨 아래 정보(회사 소개, 고객센터)에 영영 닿지 못해요. 상세를 보고 돌아왔을 때 보던 자리도 지켜 줘야 해요. 비교는 <a href="#/collection/col-infinite">목록 보여주기 › 무한 스크롤</a>에서 보세요.</>],
        ]}
      />
    </Card>
  )
}
