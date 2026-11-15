/* FE 개발 노트 공용 UI — 함정 카드 하나 = 증상 → 데모(문제/해결) → 원인 → 해결 3단계 */
import { useState, type ReactNode } from 'react'
import { Seg } from '../components/ui'
import { itemById, SEV_LABEL, type DevItem } from './items'

export interface Fix {
  bad: string
  good: string
  /** 코드 라벨 (예: 'React · TSX') */
  lang?: string
}

/** 함정 카드 */
export function Issue({ id, cause, demo, demoNote, diagram, quick, root, prevent, links, ours }: {
  id: string
  /** 왜 생기나 */
  cause: ReactNode
  /** 실제 데모 — fixed=false 문제 그대로, true 해결 적용. 스위치를 바꾸면 처음부터 다시 그려요 */
  demo?: (fixed: boolean) => ReactNode
  /** 데모 아래 작은 안내 (시뮬레이션이면 그렇다고 적어요) */
  demoNote?: ReactNode
  /** 브라우저에서 재현하기 어려운 건 그림으로 */
  diagram?: ReactNode
  /** 해결 ① 바로 고치기 — 줄 앞 '- ' 는 문제 줄, '+ ' 는 고친 줄로 강조돼요 */
  quick: Fix
  /** 해결 ② 근본 대책 */
  root: ReactNode
  /** 해결 ③ 재발 방지 체크리스트 */
  prevent: ReactNode[]
  /** 관련 페이지 [주소, 이름] */
  links?: [string, string][]
  /** 이 사이트가 실제로 쓰는 해결 */
  ours?: ReactNode
}) {
  const it = itemById(id)
  const [fixed, setFixed] = useState(false)
  return (
    <article className={'dv-issue sev-' + it.sev} id={id}>
      <IssueHead it={it} />
      <div className="dv-top">
        <div className="dv-demo">
          {demo ? (
            <>
              <div className="dv-demo-bar">
                <Seg value={fixed ? 1 : 0} onChange={v => setFixed(v === 1)} className="dv-seg"
                  options={[[0, <><span className="dv-dot bad" />문제 그대로</>], [1, <><span className="dv-dot good" />해결 적용</>]]} />
              </div>
              <div className={'dv-stage' + (fixed ? ' is-fixed' : ' is-bad')} key={String(fixed)}>{demo(fixed)}</div>
            </>
          ) : <div className="dv-stage is-diagram">{diagram}</div>}
          {demoNote && <p className="dv-note">{demoNote}</p>}
        </div>
        <div className="dv-why">
          <h4>왜 생기나</h4>
          <div className="dv-prose">{cause}</div>
        </div>
      </div>
      <div className="dv-fix">
        <div className="dv-step"><span className="dv-step-n">①</span><b>바로 고치기</b></div>
        <div className="dv-codes">
          <DevCode tone="bad" label={'문제 코드' + (quick.lang ? ' · ' + quick.lang : '')} code={quick.bad} />
          <DevCode tone="good" label={'해결 코드' + (quick.lang ? ' · ' + quick.lang : '')} code={quick.good} />
        </div>
        <div className="dv-fix-row">
          <div>
            <div className="dv-step"><span className="dv-step-n">②</span><b>근본 대책</b></div>
            <div className="dv-prose">{root}</div>
          </div>
          <div>
            <div className="dv-step"><span className="dv-step-n">③</span><b>재발 방지</b></div>
            <ul className="dv-check">{prevent.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        </div>
      </div>
      {(ours || links?.length) && (
        <div className="dv-foot">
          {ours && <p className="dv-ours"><b>이 사이트에서는</b>{ours}</p>}
          {links && links.length > 0 && (
            <p className="dv-links"><b>함께 보기</b>{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</p>
          )}
        </div>
      )}
    </article>
  )
}

function IssueHead({ it }: { it: DevItem }) {
  return (
    <header className="dv-head">
      <div className="dv-meta">
        <span className="dv-num">{it.num}</span>
        <span className={'dv-sev ' + it.sev}>{SEV_LABEL[it.sev]}</span>
        {it.tags.map(t => <span className="dv-tag" key={t}>{t}</span>)}
        <a className="dv-anchor" href={`#/dev/${it.tab}/${it.id}`} aria-label={it.title + ' 링크'}>#</a>
      </div>
      <h3>{it.title}</h3>
      <p className="dv-symptom"><b>증상</b>{it.symptom}</p>
    </header>
  )
}

/** 코드 블록 — '- ' 줄은 문제, '+ ' 줄은 고친 곳으로 강조. 복사할 땐 표시를 떼요 */
export function DevCode({ code, label, tone }: { code: string; label: string; tone?: 'bad' | 'good' }) {
  const [ok, setOk] = useState(false)
  const lines = code.replace(/^\n+|\s+$/g, '').split('\n').map(l => {
    const m = /^([+-]) /.exec(l)
    return { mark: m?.[1] ?? '', text: m ? l.slice(2) : l }
  })
  const plain = lines.map(l => l.text).join('\n')
  const copy = async () => {
    try { await navigator.clipboard.writeText(plain) } catch { /* 복사 불가 환경 */ }
    setOk(true); setTimeout(() => setOk(false), 1400)
  }
  return (
    <div className={'dv-code' + (tone ? ' ' + tone : '')}>
      <div className="dv-code-bar"><span>{label}</span><button type="button" className="btn ghost sm" onClick={copy}>{ok ? '복사됨' : '복사'}</button></div>
      <pre className="allow-select"><code>{lines.map((l, i) => <span key={i} className={'ln' + (l.mark === '-' ? ' del' : l.mark === '+' ? ' add' : '')}>{l.text || ' '}{'\n'}</span>)}</code></pre>
    </div>
  )
}

/** 데모 안 측정값 한 줄 (라벨 · 값) */
export function Meter({ label, value, bad }: { label: ReactNode; value: ReactNode; bad?: boolean }) {
  return <div className={'dv-meter' + (bad === undefined ? '' : bad ? ' bad' : ' good')}><span>{label}</span><b>{value}</b></div>
}

/** 탭 맨 위 안내 */
export function TabIntro({ children }: { children: ReactNode }) {
  return <p className="dv-intro">{children}</p>
}
