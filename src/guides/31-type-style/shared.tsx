import { useState, type ReactNode } from 'react'
import { Card, Info, Stage, type Demo } from '../../components/Card'

/** 라벨 + 손잡이 */
export function Knob({ label, children, wide }: { label: ReactNode; children: ReactNode; wide?: boolean }) {
  return <div className={'tys-knob' + (wide ? ' wide' : '')}><span className="tys-knob-l">{label}</span>{children}</div>
}

/** ‘이렇게 말해요’ 키워드 줄 + 복사 */
function Say({ ko, en }: { ko: string; en: string }) {
  const [msg, setMsg] = useState('')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${ko} / ${en}`)
      setMsg('복사했어요')
    } catch {
      setMsg('복사하지 못했어요 · 글을 직접 골라 주세요')
    }
    window.setTimeout(() => setMsg(''), 1800)
  }
  return (
    <div className="tys-say">
      <div className="tys-say-h">
        <span>이렇게 말해요</span>
        <button type="button" className="btn ghost sm" onClick={copy} aria-label="키워드 복사">{msg ? '복사됨' : '복사'}</button>
      </div>
      <p className="allow-select">{ko}<br /><span lang="en">{en}</span></p>
      <span className="tys-say-msg" aria-live="polite">{msg}</span>
    </div>
  )
}

export interface TypeCardProps {
  id: string
  num: string
  title: string
  en: string
  desc: ReactNode
  demo: Demo
  log: ReactNode
  text: string
  onText: (v: string) => void
  /** 미리보기 판 클래스 */
  view: string
  preview: ReactNode
  knobs: ReactNode
  say: [string, string]
  spec: [ReactNode, ReactNode][]
  usage: [ReactNode, ReactNode][]
  maxLength?: number
}

/** 글자 스타일 카드: 미리보기 · 내 문구 · 손잡이 · 키워드 */
export function TypeCard(p: TypeCardProps) {
  return (
    <Card id={p.id} num={p.num} title={p.title} en={p.en} desc={p.desc} demo={p.demo}>
      <Stage log={p.log}>
        <div className="box left tys-box">
          <div className={'tys-view ' + p.view}>{p.preview}</div>
          <label className="tys-input">
            <span>내 문구</span>
            <input value={p.text} onChange={e => p.onText(e.target.value)} maxLength={p.maxLength ?? 24} spellCheck={false} />
          </label>
          <div className="tys-ctrl">{p.knobs}</div>
          <Say ko={p.say[0]} en={p.say[1]} />
        </div>
      </Stage>
      <Info spec={p.spec} usage={p.usage} />
    </Card>
  )
}
