import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useTimers } from '../../components/ui'
import { useMotion } from '../../lib/motion'

/* 가상의 기록 앱 ‘주말노트’ (사람·앱·주소 모두 지어낸 이름이에요. 주소는 .example 도메인) */
export const ITEM = {
  title: '가을 캠핑 준비물 12가지',
  host: 'weekendnote.example',
  url: 'https://weekendnote.example/n/482',
  by: '채원',
}

export type Person = { n: string; tone: 0 | 1 | 2 }
export const PEOPLE: Person[] = [
  { n: '하린', tone: 0 }, { n: '도윤', tone: 1 }, { n: '서윤', tone: 2 }, { n: '민호', tone: 0 },
  { n: '채원', tone: 1 }, { n: '지호', tone: 2 }, { n: '나래', tone: 0 }, { n: '준서', tone: 1 },
]

/** 상단 토스트 (1.8초 뒤 사라져요) */
export function useToast() {
  const m = useMotion()
  const timers = useTimers()
  const [toast, setToast] = useState<{ msg: ReactNode; on: boolean }>({ msg: '', on: false })
  const [api] = useState(() => ({
    show(msg: ReactNode) {
      timers.clear()
      setToast({ msg, on: true })
      timers.set(() => setToast(t => ({ ...t, on: false })), m.D(1800))
    },
    hide() { timers.clear(); setToast(t => ({ ...t, on: false })) },
  }))
  return [toast, api] as const
}

/** 시트 높이 단계 (닫힘 · 중간 · 전체) + 손잡이 끌기 */
export type Detent = 'closed' | 'mid' | 'full'
export function useDetent(onChange?: (d: Detent, how: string) => void) {
  const [d, setD] = useState<Detent>('closed')
  const dRef = useRef<Detent>('closed')
  const drag = useRef<{ y: number; moved: boolean } | null>(null)
  const moved = useRef(false)
  const set = (next: Detent, how = '') => { dRef.current = next; setD(next); onChange?.(next, how) }
  const grip = {
    onPointerDown(e: PointerEvent<HTMLElement>) { drag.current = { y: e.clientY, moved: false }; moved.current = false; e.currentTarget.setPointerCapture(e.pointerId) },
    onPointerMove(e: PointerEvent<HTMLElement>) { if (drag.current && Math.abs(e.clientY - drag.current.y) > 6) drag.current.moved = true },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const g = drag.current
      drag.current = null
      if (!g || !g.moved) return
      moved.current = true
      const dy = e.clientY - g.y
      if (dy < -20) set('full', '위로 끌어')
      else if (dy > 20) set(dRef.current === 'full' ? 'mid' : 'closed', '아래로 끌어')
    },
    onClick() {
      if (moved.current) { moved.current = false; return }
      set(dRef.current === 'full' ? 'mid' : 'full', '손잡이를 눌러')
    },
  }
  return { d, set, grip }
}

/* ------------------------------------------------------------------ *
 *  장식용 ‘가짜 QR’
 *  - 진짜 QR 규격(오류 정정·마스킹·포맷 정보)을 따르지 않아요. 카메라로 찍어도 읽히지 않아요.
 *  - 모서리 찾기 무늬 3개와 타이밍 줄만 흉내 내고, 나머지 칸은 글자에서 만든 씨앗으로
 *    늘 같은 무늬가 나오도록(결정적) 채워요. 같은 주소 → 같은 무늬.
 * ------------------------------------------------------------------ */
export const QR_N = 25
export function pseudoQr(text: string): boolean[][] {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let s = h >>> 0 || 1
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
  const g = Array.from({ length: QR_N }, () => Array<boolean>(QR_N).fill(false))
  const reserved = Array.from({ length: QR_N }, () => Array<boolean>(QR_N).fill(false))
  const finder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const R = r0 + r, C = c0 + c
      if (R < 0 || C < 0 || R >= QR_N || C >= QR_N) continue
      reserved[R][C] = true
      const ring = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6)
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
      g[R][C] = ring || core
    }
  }
  finder(0, 0); finder(0, QR_N - 7); finder(QR_N - 7, 0)
  for (let i = 8; i < QR_N - 8; i++) { g[6][i] = g[i][6] = i % 2 === 0; reserved[6][i] = reserved[i][6] = true }
  // 작은 정렬 무늬 흉내
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
    const R = QR_N - 7 + r, C = QR_N - 7 + c
    reserved[R][C] = true
    g[R][C] = Math.max(Math.abs(r), Math.abs(c)) !== 1
  }
  for (let r = 0; r < QR_N; r++) for (let c = 0; c < QR_N; c++) if (!reserved[r][c]) g[r][c] = rnd() < 0.48
  return g
}
