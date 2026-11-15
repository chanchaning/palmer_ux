import { Fragment, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { escRe, type Book, won, words } from './data'

/** 돋보기 선 아이콘 */
export function Glass() {
  return (
    <svg className="sr-glass" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" />
    </svg>
  )
}

/** 검색어 낱말마다 <mark>로 감싸요 */
export function Hi({ text, q, as = 'mark' }: { text: string; q: string; as?: 'mark' | 'b' | 'none' }) {
  const ws = words(q)
  if (!ws.length || as === 'none') return <>{text}</>
  const re = new RegExp('(' + ws.map(escRe).join('|') + ')', 'g')
  return (
    <>
      {text.split(re).map((part, i) => (
        <Fragment key={i}>{i % 2 ? (as === 'b' ? <b className="sr-bold">{part}</b> : <mark>{part}</mark>) : part}</Fragment>
      ))}
    </>
  )
}

/** 검색 입력칸 (돋보기 · 입력 · 지우기 ✕) */
export function Field({ value, onChange, onKeyDown, onFocus, onClear, inputRef, placeholder = '책 제목, 작가를 검색해요', label = '책 검색', extra }: {
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  onFocus?: () => void
  onClear?: () => void
  inputRef?: Ref<HTMLInputElement>
  placeholder?: string
  label?: string
  /** input에 더할 ARIA 속성 등 */
  extra?: Record<string, string | boolean | undefined>
}) {
  return (
    <div className="sr-field">
      <Glass />
      <input ref={inputRef} type="search" enterKeyHint="search" autoComplete="off" spellCheck={false}
        placeholder={placeholder} aria-label={label} value={value} {...extra}
        onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} onFocus={onFocus} />
      {value && (
        <button type="button" className="sr-clear" aria-label="검색어 지우기"
          onMouseDown={e => e.preventDefault()} onClick={() => (onClear ? onClear() : onChange(''))}>✕</button>
      )}
    </div>
  )
}

/** 책 표지 대신 쓰는 색 블록 */
export function Cover({ b }: { b: Book }) {
  return <span className={'sr-cover c' + (b.id % 4)} aria-hidden="true">{b.t[0]}</span>
}

/** 결과 목록 한 줄 */
export function BookRow({ b, q = '', meta, as }: { b: Book; q?: string; meta?: ReactNode; as?: 'mark' | 'b' | 'none' }) {
  return (
    <div className="sr-row">
      <Cover b={b} />
      <span className="sr-grow">
        <span className="sr-t"><Hi text={b.t} q={q} as={as} /></span>
        <span className="sr-sub"><Hi text={b.a} q={q} as={as} /> · {b.cat}</span>
      </span>
      <span className="sr-meta">{meta ?? won(b.price)}</span>
    </div>
  )
}
