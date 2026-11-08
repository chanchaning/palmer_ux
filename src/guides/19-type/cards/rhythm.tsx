import { useState } from 'react'
import { Card, Info, Stage, useDemo } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'

/** 권장 구간 막대 */
function Zone({ min, max, lo, hi, v }: { min: number; max: number; lo: number; hi: number; v: number }) {
  const p = (x: number) => ((x - min) / (max - min)) * 100
  return <div className="ty-zone" aria-hidden="true"><i style={{ left: p(lo) + '%', width: p(hi) - p(lo) + '%' }} /><b style={{ left: p(v) + '%' }} /></div>
}

/* ---------- 03 행간 ---------- */
const KO = '한글은 네모 틀 안에 초성·중성·종성이 꽉 차는 구조라 글자 높이가 높아요. 그래서 영문보다 줄 사이를 조금 더 띄워야 숨 쉴 틈이 생겨요.'
const EN = 'Latin letters have ascenders and descenders that leave natural gaps, so a slightly tighter line height still reads comfortably.'
export function LineHeight() {
  const [body, setBody] = useState(1.2)
  const [title, setTitle] = useState(1.6)
  const [lang, setLang] = useState<'ko' | 'en'>('ko')
  const bodyOk = lang === 'ko' ? body >= 1.5 && body <= 1.6 : body >= 1.4 && body <= 1.5
  const titleOk = title >= 1.2 && title <= 1.3
  const demo = useDemo({
    reset() { setBody(1.2); setTitle(1.6); setLang('ko') },
    async play(c) {
      for (let v = 1.2; v <= 1.551; v += 0.05) { setBody(+v.toFixed(2)); await c.sleep(160) }
      await c.sleep(400)
      for (let v = 1.6; v >= 1.249; v -= 0.05) { setTitle(+v.toFixed(2)); await c.sleep(160) }
    },
  })
  return (
    <Card id="type-lh" num="03" title="행간" en="Line Height" demo={demo}
      desc="한글 본문은 글자 크기의 150~160%, 큰 제목은 120~130%로 좁혀요.">
      <Stage log={<>본문 <b className={bodyOk ? 'ty-ok' : 'ty-bad'}>{Math.round(body * 100)}%</b> · 제목 <b className={titleOk ? 'ty-ok' : 'ty-bad'}>{Math.round(title * 100)}%</b> — {bodyOk && titleOk ? '둘 다 알맞아요' : !bodyOk ? (body < (lang === 'ko' ? 1.5 : 1.4) ? '본문 줄이 답답해요' : '본문 줄이 흩어져요') : (title > 1.3 ? '제목이 흩어져 보여요' : '제목 줄이 겹쳐 보여요')}</>}>
        <div className="box left">
          <Seg value={lang} onChange={setLang} options={[['ko', '한글'], ['en', 'English']]} />
          <div className="ty-label"><span>본문 행간 (16px)</span><b>{body.toFixed(2)}</b></div>
          <Range value={body} min={1} max={2} step={0.05} onChange={setBody} label="본문 행간" />
          <Zone min={1} max={2} lo={lang === 'ko' ? 1.5 : 1.4} hi={lang === 'ko' ? 1.6 : 1.5} v={body} />
          <div className="ty-label"><span>제목 행간 (28px)</span><b>{title.toFixed(2)}</b></div>
          <Range value={title} min={1} max={2} step={0.05} onChange={setTitle} label="제목 행간" />
          <Zone min={1} max={2} lo={1.2} hi={1.3} v={title} />
          <div className="ty-sample">
            <p style={{ fontSize: 28, fontWeight: 700, lineHeight: title, letterSpacing: '-0.02em', marginBottom: 10 }}>{lang === 'ko' ? '두 줄로 넘어가는 긴 제목의 줄 간격' : 'A long headline that wraps to two lines'}</p>
            <p style={{ fontSize: 16, lineHeight: body }}>{lang === 'ko' ? KO : EN}</p>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['한글 본문', '1.5~1.6'], ['영문 본문', '1.4~1.5'], ['제목 24px+', '1.2~1.3']]}
        usage={[
          ['원리', '한글은 글자 높이가 높아서 영문 기준을 그대로 쓰면 답답해 보여요.'],
          ['실무', 'line-height는 단위 없이(1.5) 써야 자식 요소 크기에 맞춰 비례해요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 04 자간 ---------- */
export function Tracking() {
  const [ls, setLs] = useState(0)
  const ok = ls <= -0.01 && ls >= -0.02
  return (
    <Card id="type-ls" num="04" title="자간" en="Letter Spacing"
      desc="작은 화면에서는 한글 자간을 -1~-2%만 좁혀도 글자가 단단하게 뭉쳐 보여요.">
      <Stage log={ok ? <>자간 <b>{(ls * 100).toFixed(1)}%</b> — 단단하고 읽기 좋아요</> : ls > -0.01 ? <>자간 <b>{(ls * 100).toFixed(1)}%</b> — 글자가 흩어져 보여요</> : <>자간 <b>{(ls * 100).toFixed(1)}%</b> — 글자가 붙어서 답답해요</>}>
        <div className="box left">
          <div className="ty-label"><span>letter-spacing</span><b>{ls.toFixed(3)}em</b></div>
          <Range value={ls} min={-0.06} max={0.06} step={0.005} onChange={v => setLs(+v.toFixed(3))} label="자간" />
          <Zone min={-0.06} max={0.06} lo={-0.02} hi={-0.01} v={ls} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[-0.04, -0.015, 0, 0.04].map(v => <button key={v} className="btn ghost sm" onClick={() => setLs(v)}>{(v * 100).toFixed(1)}%</button>)}
          </div>
          <div className="ty-sample" style={{ letterSpacing: ls + 'em' }}>
            <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>주말에 가기 좋은 동네 카페</p>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>창가 자리가 넓고 조용해서 책 읽기 좋아요. 디저트는 매일 아침 직접 구워요.</p>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['권장', '-0.01em ~ -0.02em'], ['큰 제목', '더 좁게도 OK']]}
        usage={[
          ['원리', '글자가 커질수록 글자 사이 빈틈도 커 보여요. 제목일수록 자간을 더 좁혀요.'],
          ['주의', '12px 이하의 작은 글씨는 자간을 좁히면 오히려 뭉개져요. 0이나 살짝 넓게 둬요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 05 굵기 ---------- */
const ROLES = [[400, '본문 Regular 400'], [500, '강조 Medium 500'], [600, '버튼 SemiBold 600'], [700, '제목 Bold 700']] as const
export function Weight() {
  const [w, setW] = useState(300)
  const thin = w <= 300
  return (
    <Card id="type-weight" num="05" title="굵기" en="Font Weight"
      desc="본문에 Thin·Light는 쓰지 않아요. 3~4단계 굵기만 규칙적으로 써요.">
      <Stage log={thin ? <><b>{w}</b> — 다크 모드에서 빛이 번져 획이 사라질 듯 얇아요</> : <><b>{w}</b> — {ROLES.find(r => r[0] === w)?.[1] ?? '역할을 정해 쓰면 깔끔해요'}</>}>
        <div className="box left">
          <div className="ty-label"><span>font-weight (Pretendard 가변 폰트)</span><b>{w}</b></div>
          <Range value={w} min={100} max={900} step={100} onChange={setW} label="굵기" />
          <div className="ty-roles">{ROLES.map(([v, l]) => <button key={v} className={w === v ? 'on' : ''} onClick={() => setW(v)}>{l}</button>)}</div>
          <div className="ty-weights" style={{ fontWeight: w }}>
            <div className="lt"><small>라이트 모드</small>오늘 할 일 3개가 남았어요. 마감 전에 확인해 주세요.</div>
            <div className="dk"><small>다크 모드</small>오늘 할 일 3개가 남았어요. 마감 전에 확인해 주세요.</div>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['본문', '400'], ['강조·버튼', '500~600'], ['제목', '700']]}
        usage={[
          ['원리', '고해상도 화면과 다크 모드에서는 얇은 획이 번지거나 흐려져요.'],
          ['실무', '굵기를 토큰으로 3~4개만 정해 두면 화면 전체의 위계가 깔끔해져요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 12 한글 줄바꿈 ---------- */
export function WordBreak() {
  const [mode, setMode] = useState<'normal' | 'keep-all'>('normal')
  const [balance, setBalance] = useState(false)
  return (
    <Card id="type-wrap" num="12" title="한글 줄바꿈" en="word-break · text-wrap"
      desc="한글은 기본적으로 글자 단위로 줄이 바뀌어 단어가 쪼개져요. 어절 단위로 바꾸면 훨씬 읽기 편해요.">
      <Stage log={<>{mode === 'keep-all' ? <><b>keep-all</b> — 어절(띄어쓰기) 단위로 줄바꿈</> : <><b>normal</b> — 단어 중간에서 끊겨요</>}{balance ? ' · 제목 줄 길이 균형' : ''} · 오른쪽 아래 모서리를 끌어 폭을 바꿔보세요</>}>
        <div className="box left">
          <div className="ty-row">
            <Seg value={mode} onChange={setMode} options={[['normal', 'word-break: normal'], ['keep-all', 'keep-all']]} />
            <label className="opt" style={{ fontSize: 13 }}><input type="checkbox" checked={balance} onChange={e => setBalance(e.target.checked)} />제목 balance</label>
          </div>
          <div className="ty-wrap" style={{ wordBreak: mode, width: 260 }}>
            <h5 style={{ textWrap: balance ? 'balance' : 'wrap' }}>처음 디자인 시스템을 만드는 팀을 위한 실전 가이드</h5>
            <p>사용자 인터페이스를 설계할 때 타이포그래피는 정보의 위계와 가독성을 결정하는 가장 중요한 요소예요.</p>
          </div>
        </div>
      </Stage>
      <Info
        spec={[['본문', 'word-break: keep-all'], ['제목', 'text-wrap: balance']]}
        usage={[
          ['언제', '한글이 들어가는 모든 본문과 제목에 기본으로 적용해요.'],
          ['주의', 'keep-all은 긴 URL이나 영문 단어가 넘칠 수 있어요. overflow-wrap: anywhere를 함께 써요.'],
        ]}
      />
    </Card>
  )
}
