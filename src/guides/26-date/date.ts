/* GUIDE 26 공용 날짜 도구.
 * 데모가 늘 똑같이 보이도록 ‘오늘’을 2026년 11월 16일 (월) 오후 1시 20분으로 고정해요. */

export const TODAY = new Date(2026, 10, 16)
/** 지금 시각 (분 단위, 13:20) */
export const NOW_MIN = 13 * 60 + 20

export const WD = ['일', '월', '화', '수', '목', '금', '토'] as const

export const day = (y: number, m: number, d: number) => new Date(y, m, d)
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
export const same = (a: Date | null | undefined, b: Date | null | undefined) => !!a && !!b && a.getTime() === b.getTime()
export const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** b - a (일) */
export const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)
export const lastDate = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

/** 11월 16일 (월) */
export const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`
/** 2026년 11월 */
export const fmtMonth = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`
/** 오늘 · 내일 · 3일 뒤 · 2일 전 */
export const rel = (d: Date) => {
  const n = diffDays(TODAY, d)
  return n === 0 ? '오늘' : n === 1 ? '내일' : n === 2 ? '모레' : n === -1 ? '어제' : n > 0 ? `${n}일 뒤` : `${-n}일 전`
}
/** 분 → 오전 9시 / 오후 2시 30분 */
export const fmtTime = (min: number) => {
  const h = Math.floor(min / 60) % 24, m = min % 60
  const ap = h < 12 ? '오전' : '오후', h12 = h % 12 === 0 ? 12 : h % 12
  if (h === 12 && m === 0) return '낮 12시'
  return `${ap} ${h12}시${m ? ` ${m}분` : ''}`
}
/** 분 → 14:30 */
export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** 달력 6주(42칸) — 일요일 시작. 실제 달 길이·요일로 만들어요 */
export const monthCells = (y: number, m: number) => {
  const first = new Date(y, m, 1)
  const start = addDays(first, -first.getDay())
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}
/** 그달의 몇째 주 무슨 요일인지 (1부터) */
export const nthOfMonth = (d: Date) => Math.ceil(d.getDate() / 7)
export const NTH = ['첫째', '둘째', '셋째', '넷째', '다섯째'] as const
