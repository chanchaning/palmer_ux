import { useRef, useState, type ReactNode } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Seg, useTimers } from '../../../components/ui'
import { useMotion } from '../../../lib/motion'
import { APP, Flow, Mark, Phone } from '../shared'
import { FEED, q, stageOf } from '../util'

/* ---------- 04 약관 동의 ---------- */
const TERMS: { k: string; t: string; req: boolean; view?: boolean }[] = [
  { k: 'tos', t: '서비스 이용약관', req: true, view: true },
  { k: 'priv', t: '개인정보 수집·이용', req: true, view: true },
  { k: 'age', t: '만 14세 이상이에요', req: true },
  { k: 'mkt', t: '혜택·이벤트 알림 받기', req: false, view: true },
  { k: 'loc', t: '위치 기반 서비스 이용', req: false, view: true },
]
type Checks = Record<string, boolean>
const none = (): Checks => Object.fromEntries(TERMS.map(t => [t.k, false]))
const preChecked = (): Checks => ({ ...none(), mkt: true, loc: true })
const T_LOG = <>필수 항목에 동의해야 <b>다음</b> 버튼이 켜져요</>

export function Terms() {
  const [mode, setMode] = useState<'good' | 'dark'>('good')
  const [ck, setCk] = useState<Checks>(none)
  const [doc, setDoc] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<ReactNode>(T_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const all = TERMS.every(t => ck[t.k])
  const reqOk = TERMS.every(t => !t.req || ck[t.k])
  const reqLeft = TERMS.filter(t => t.req && !ck[t.k]).length
  const reset = (m = mode) => {
    setCk(m === 'good' ? none() : preChecked()); setDoc(null); setDone(false)
    setLog(m === 'good' ? T_LOG : <>선택 항목이 <b>미리 체크</b>돼 있어요 — 그대로 넘기기 쉬워요</>)
  }
  const toggle = (k: string) => {
    const t = TERMS.find(x => x.k === k)!
    const v = !ck[k]
    setCk(c => ({ ...c, [k]: v }))
    setLog(t.req ? <>[필수] {t.t} {v ? '동의' : '해제'}</> : <>[선택] {t.t} {v ? '동의' : '해제'} — 꺼도 <b>가입은 그대로</b> 돼요</>)
  }
  const demo = useDemo({
    reset: () => reset(),
    async play(c) {
      const d = dev.current
      await c.press(d, q(d, 'c-tos')); await c.sleep(700)
      await c.press(d, q(d, 'c-all')); await c.sleep(1100)
      await c.press(d, q(d, 'c-mkt')); await c.sleep(1100)
      await c.press(d, q(d, 'next')); await c.sleep(1600)
    },
  })

  return (
    <Card id="fr-terms" num="04" title="약관 동의" en="Terms Agreement" demo={demo}
      desc="가입할 때 꼭 받아야 하는 동의와 골라도 되는 동의를 나눠서 받아요. 전체 동의로 한 번에, 필수만 채우면 다음으로 넘어가요.">
      <Stage log={log} logId="fr-terms-log">
        <Flow at={3} />
        <Seg value={mode} onChange={v => { setMode(v); reset(v) }} className="fr-seg" options={[['good', '모두 꺼진 채로'], ['dark', '선택 미리 체크']]} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar"><button className="back" aria-label="뒤로">‹</button>약관 동의</div>
            {done ? (
              <div className="fr-hello fr-in lg">
                <Mark size={44} />
                <b>가입했어요</b>
                <span>혜택 알림 {ck.mkt ? '받음' : '안 받음'} · 위치 서비스 {ck.loc ? '사용' : '안 씀'}</span>
                <span className="fr-muted">선택 항목은 설정에서 언제든 바꿀 수 있어요.</span>
              </div>
            ) : (
              <div className="fr-terms">
                <h3>{APP}을 쓰려면<br />동의가 필요해요</h3>
                <label className="opt fr-all">
                  <input type="checkbox" data-k="c-all" checked={all} onChange={() => {
                    const v = !all
                    setCk(Object.fromEntries(TERMS.map(t => [t.k, v])))
                    setLog(v ? <><b>전체 동의</b> — 선택 항목까지 한 번에 켜져요. 원하면 하나씩 끌 수 있어요</> : <>전체 해제</>)
                  }} />
                  <b>전체 동의</b><small>선택 항목 포함</small>
                </label>
                <div className="fr-tlist">
                  {TERMS.map(t => (
                    <div className="fr-trow" key={t.k}>
                      <label className="opt">
                        <input type="checkbox" data-k={'c-' + t.k} checked={ck[t.k]} onChange={() => toggle(t.k)} />
                        <span><em className={t.req ? 'req' : ''}>{t.req ? '[필수]' : '[선택]'}</em> {t.t}</span>
                      </label>
                      {mode === 'dark' && !t.req && ck[t.k] && <span className="fr-warn">미리 체크됨</span>}
                      {t.view && <button className="fr-view" aria-label={t.t + ' 보기'} onClick={() => setDoc(t.t)}>보기</button>}
                    </div>
                  ))}
                </div>
                <button className="btn fr-wide" data-k="next" disabled={!reqOk} onClick={() => {
                  setDone(true)
                  setLog(mode === 'dark' && ck.mkt
                    ? <>미리 체크된 걸 못 보고 <b>광고 동의</b>까지 해버렸어요 — 다크 패턴이에요</>
                    : <>필수만 채워도 가입 끝 — 선택은 <b>사용자가 고른 대로</b></>)
                }}>{reqOk ? '동의하고 시작하기' : `필수 항목 ${reqLeft}개가 남았어요`}</button>
              </div>
            )}
          </div>
          <div className={'scrim' + (doc ? ' on' : '')} onClick={() => setDoc(null)} />
          <div className={'sheet' + (doc ? ' on' : '')} inert={!doc} role="dialog" aria-label={doc ?? '약관'}>
            <div className="fr-doc">
              <b>{doc}</b>
              <p>제1조 (목적) 이 약관은 {APP}(이하 ‘서비스’)를 이용하는 데 필요한 권리와 의무를 정해요.</p>
              <p>제2조 (수집 항목) 닉네임, 이메일, 기록 내용. 탈퇴하면 30일 안에 지워요.</p>
              <button className="btn sm" onClick={() => setDoc(null)}>확인</button>
            </div>
          </div>
        </Phone>
      </Stage>
      <Info
        spec={[['기본값', '모두 꺼짐'], ['구분', '[필수] · [선택]'], ['전체 동의', '한 번에 켜고 끄기']]}
        usage={[
          ['언제', '회원 가입처럼 법으로 동의를 받아야 하는 순간 — 가입이 없는 앱이면 빼도 돼요'],
          ['주의', <>선택 항목을 미리 체크하거나 필수 사이에 섞지 마세요. 선택을 안 해도 가입이 돼야 해요 (<a href="#/darkpattern">다크 패턴</a> 참고)</>],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 프로필 설정 ---------- */
const INTERESTS = ['물 마시기', '산책', '독서', '일찍 자기', '스트레칭']
const NAME_RE = /^[가-힣a-zA-Z0-9]{2,10}$/
const PF_LOG = <>닉네임만 정하면 돼요. 귀찮으면 <b>건너뛰기</b></>

export function ProfileSetup() {
  const [color, setColor] = useState(1)
  const [name, setName] = useState('')
  const [picks, setPicks] = useState<string[]>([])
  const [done, setDone] = useState<null | 'skip' | 'save'>(null)
  const [log, setLog] = useState<ReactNode>(PF_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const ok = NAME_RE.test(name)
  const hint = !name ? '2–10자, 한글·영문·숫자' : ok ? '좋은 이름이에요' : name.length < 2 ? '한 글자만 더 넣어 주세요' : name.length > 10 ? '10자까지 쓸 수 있어요' : '띄어쓰기와 기호는 못 써요'
  const reset = () => { setColor(1); setName(''); setPicks([]); setDone(null); setLog(PF_LOG) }
  const demo = useDemo({
    reset,
    async play(c) {
      const d = dev.current
      const text = '봄비'
      for (let i = 1; i <= text.length; i++) { setName(text.slice(0, i)); await c.sleep(260) }
      await c.sleep(400)
      await c.press(d, q(d, 'col-3')); await c.sleep(600)
      await c.press(d, q(d, 'i-1')); await c.sleep(500)
      await c.press(d, q(d, 'save')); await c.sleep(1600)
    },
  })

  return (
    <Card id="fr-profile" num="05" title="프로필 설정" en="Profile Setup" demo={demo}
      desc="이름과 사진, 관심사를 정해 내 공간처럼 만드는 단계예요. 꼭 필요한 칸만 두고, 나머지는 건너뛰어도 되게 해요.">
      <Stage log={log} logId="fr-profile-log">
        <Flow at={4} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">프로필 만들기<span className="sp" />{!done && <button data-k="skip" onClick={() => { setDone('skip'); setLog(<><b>건너뛰기</b> → 자동 닉네임으로 시작. 나중에 바꿀 수 있어요</>) }}>건너뛰기</button>}</div>
            {done ? (
              <div className="fr-hello fr-in lg">
                <span className={'fr-av lg g' + (done === 'save' ? color : 2)} />
                <b>{done === 'save' ? name : '새싹 2741'} 님</b>
                <span>{done === 'save' && picks.length ? picks.join(' · ') : '관심사는 나중에 골라도 돼요'}</span>
                <button className="btn ghost sm" onClick={reset}>다시 만들기</button>
              </div>
            ) : (
              <div className="fr-form">
                <div className="fr-avs" role="radiogroup" aria-label="프로필 색">
                  <span className={'fr-av lg g' + color} />
                  <div>{[1, 2, 3, 4].map(i => <button key={i} role="radio" aria-checked={color === i} aria-label={`색 ${i}`} data-k={'col-' + i} className={'fr-sw g' + i} onClick={() => setColor(i)} />)}</div>
                </div>
                <label>닉네임 <em className="req">필수</em>
                  <input value={name} maxLength={14} placeholder="예: 봄비" onChange={e => { setName(e.target.value); setLog(PF_LOG) }} />
                </label>
                <small className={name && !ok ? 'bad' : ok ? 'good' : ''}>{hint}</small>
                <div className="fr-lab">관심사 <em>선택</em></div>
                <div className="fr-chips">
                  {INTERESTS.map((t, i) => (
                    <button key={t} className="chip" data-k={'i-' + i} aria-pressed={picks.includes(t)} onClick={() => setPicks(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}>{t}</button>
                  ))}
                </div>
                <button className="btn fr-wide" data-k="save" disabled={!ok} onClick={() => { setDone('save'); setLog(<><b>{name}</b> 님 프로필 완성 — 칸은 하나만 필수였어요</>) }}>시작하기</button>
              </div>
            )}
          </div>
        </Phone>
      </Stage>
      <Info
        spec={[['필수 칸', '닉네임 하나'], ['건너뛰기', '오른쪽 위'], ['검사', '쓰는 동안 바로']]}
        usage={[
          ['언제', '다른 사람에게 내 이름이 보이거나, 관심사로 첫 화면을 맞춰 줄 수 있을 때'],
          ['주의', '생일·성별·주소처럼 지금 안 쓰는 정보를 받지 마세요. 칸이 하나 늘 때마다 여기서 나가는 사람이 늘어요'],
        ]}
      />
    </Card>
  )
}

/* ---------- 06 스켈레톤 ---------- */
type SkMode = 'skel' | 'spin' | 'blank'
const SK_LOG = <>방식을 고르고 <b>↻ 첫 로딩</b>을 눌러 비교해 보세요</>

export function Skeleton() {
  const m = useMotion()
  const timers = useTimers()
  const [mode, setMode] = useState<SkMode>('skel')
  const [loading, setLoading] = useState(false)
  const [n, setN] = useState(0)
  const [log, setLog] = useState<ReactNode>(SK_LOG)
  const dev = useRef<HTMLDivElement>(null)

  const reset = () => { timers.clear(); setLoading(false); setLog(SK_LOG) }
  const load = () => {
    timers.clear(); setLoading(true)
    setLog(mode === 'skel' ? <>내용이 올 <b>자리 모양</b>부터 — 무엇이 올지 미리 알아요</> : mode === 'spin' ? <>빙글빙글… <b>무엇이 올지</b>는 몰라요</> : <>하얀 화면 — <b>고장 났나?</b> 싶어요</>)
    timers.set(() => {
      setLoading(false); setN(k => k + 1)
      setLog(mode === 'skel' ? <>자리에 그대로 <b>바꿔치기</b> — 화면이 출렁이지 않아요</> : mode === 'spin' ? <>스피너가 사라지고 <b>한꺼번에</b> 나타나요</> : <>똑같이 1.8초였는데 <b>가장 길게</b> 느껴져요</>)
    }, m.D(1800))
  }
  const demo = useDemo({
    reset,
    async play(c) {
      const st = stageOf(dev.current)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="skel"]') ?? null); await c.sleep(300)
      await c.press(st, q(st, 'reload')); await c.sleep(2600)
      await c.press(st, st?.querySelector<HTMLElement>('button[data-v="spin"]') ?? null); await c.sleep(300)
      await c.press(st, q(st, 'reload')); await c.sleep(2600)
    },
  })

  return (
    <Card id="fr-skel" num="06" title="스켈레톤" en="Skeleton Screen" demo={demo}
      desc="첫 데이터를 받는 동안 내용이 놓일 자리를 회색 뼈대로 먼저 그려요. 같은 시간을 기다려도 덜 길게 느껴져요.">
      <Stage log={log} logId="fr-skel-log">
        <Flow at={5} />
        <Seg value={mode} onChange={v => { setMode(v); reset() }} className="fr-seg" options={[['skel', '스켈레톤'], ['spin', '스피너'], ['blank', '빈 화면']]} />
        <Phone ref={dev}>
          <div className="scr">
            <div className="bar">{APP}</div>
            {loading ? (
              mode === 'skel' ? (
                <div className="fr-feed" aria-busy="true" aria-label="불러오는 중">
                  {FEED.map(([nm]) => (
                    <div className="fr-post" key={nm}><span className="fr-av fr-sk" /><div className="fr-sk-lines"><i className="fr-sk w40" /><i className="fr-sk" /><i className="fr-sk w70" /></div></div>
                  ))}
                  <div className="fr-sk fr-sk-img" />
                </div>
              ) : mode === 'spin' ? <div className="fr-center"><div className="spinner" /></div> : <div className="fr-center" />
            ) : (
              <div className="fr-feed" key={n}>
                {FEED.map(([nm, t], i) => (
                  <div className="fr-post fr-in" key={nm}><span className={'fr-av g' + (i + 1)} /><div><b>{nm}</b><p>{t}</p></div></div>
                ))}
                <div className="fr-sk-img g3 fr-in" />
              </div>
            )}
          </div>
        </Phone>
        <button className="btn ghost sm" data-k="reload" onClick={load} disabled={loading}>↻ 첫 로딩</button>
      </Stage>
      <Info
        spec={[['모양', '실제 배치 그대로'], ['움직임', '은은한 반짝임'], ['끝', '자리에서 바꿔치기']]}
        usage={[
          ['언제', '가입을 마치고 첫 화면 데이터를 처음 받아올 때 — 레이아웃을 미리 알 수 있는 목록·카드'],
          ['주의', <>실제 화면과 다른 모양이면 바뀔 때 출렁여요. 0.3초 안에 끝나면 차라리 보여주지 마세요 (<a href="#/loading">로딩 패턴</a> 참고)</>],
        ]}
      />
    </Card>
  )
}
