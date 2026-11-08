/* 관제 대시보드 탭 공통 예시 — 가상의 '누리시 배전 관제센터'
 * 모든 이름·수치는 설명을 위한 가상 값이에요. 실제 설비 기준값이 아니에요. */

export const CENTER = '누리시 배전 관제센터'

export type Pri = 1 | 2 | 3
/** 알람 우선순위 — 색 + 모양 + 글자를 함께 써요(색만으로 구분하지 않기) */
export const PRI: Record<Pri, { name: string; short: string; shape: 'square' | 'triangle' | 'circle'; respond: string }> = {
  1: { name: '긴급', short: '1', shape: 'square', respond: '즉시 (5분 이내)' },
  2: { name: '높음', short: '2', shape: 'triangle', respond: '15분 이내' },
  3: { name: '주의', short: '3', shape: 'circle', respond: '근무 시간 안' },
}

export interface Substation { id: string; name: string; x: number; y: number; feeders: Feeder[] }
export interface Feeder { id: string; name: string; load: number; kv: number; temp: number }

/** 변전소 3곳 · 배전선로(D/L) 9개. load = 부하율(%), kv = 전압(kV, 기준 22.9), temp = 변압기 유온(℃) */
export const SUBSTATIONS: Substation[] = [
  { id: 'N', name: '북부 변전소', x: 30, y: 24, feeders: [
    { id: 'N1', name: '북부 1선', load: 62, kv: 22.8, temp: 58 },
    { id: 'N2', name: '북부 2선', load: 71, kv: 22.7, temp: 61 },
    { id: 'N3', name: '북부 3선', load: 48, kv: 22.9, temp: 55 },
  ] },
  { id: 'R', name: '강변 변전소', x: 68, y: 40, feeders: [
    { id: 'R1', name: '강변 1선', load: 83, kv: 22.5, temp: 72 },
    { id: 'R2', name: '강변 2선', load: 66, kv: 22.8, temp: 60 },
    { id: 'R3', name: '강변 3선', load: 57, kv: 22.9, temp: 57 },
  ] },
  { id: 'I', name: '산업단지 변전소', x: 42, y: 72, feeders: [
    { id: 'I1', name: '산단 1선', load: 88, kv: 22.4, temp: 76 },
    { id: 'I2', name: '산단 2선', load: 74, kv: 22.7, temp: 64 },
    { id: 'I3', name: '산단 3선', load: 52, kv: 22.9, temp: 56 },
  ] },
]

/** 측정값별 정상·경보 범위 (가상 기준) */
export const RANGES = {
  load: { unit: '%', min: 0, max: 120, normal: [30, 80] as [number, number], alarm: [0, 95] as [number, number], name: '부하율' },
  kv: { unit: 'kV', min: 21.5, max: 24, normal: [22.4, 23.4] as [number, number], alarm: [22.0, 23.8] as [number, number], name: '전압' },
  temp: { unit: '℃', min: 20, max: 110, normal: [30, 75] as [number, number], alarm: [0, 90] as [number, number], name: '변압기 유온' },
}

export interface AlarmDef { id: string; pri: Pri; where: string; what: string; action: string }
/** 예시 알람 목록 */
export const ALARMS: AlarmDef[] = [
  { id: 'A-101', pri: 1, where: '산단 1선', what: '선로 고장 — 차단기 트립', action: '고장 구간을 끊어 내고, 멀쩡한 구간은 옆 선로로 전기 보내기' },
  { id: 'A-102', pri: 2, where: '강변 1선', what: '부하율 95% 초과 15분 지속', action: '옆 선로로 부하 일부 옮기기 검토' },
  { id: 'A-103', pri: 2, where: '산업단지 변전소 주변압기', what: '유온 90℃ 초과', action: '냉각팬이 도는지 확인, 부하 줄이기' },
  { id: 'A-104', pri: 3, where: '북부 2선', what: '전압 22.4kV 미만', action: '변압기 전압 조절(탭) 검토' },
  { id: 'A-105', pri: 3, where: '강변 2선 R/C-12', what: '개폐기 통신 두절', action: '현장 점검 요청' },
  { id: 'A-106', pri: 3, where: '북부 변전소', what: '출입문 개방', action: 'CCTV 확인' },
]

/* ---------- 결정적 난수 · 시계열 ---------- */
/** 같은 seed 면 언제나 같은 값이 나와요 */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** 하루 부하 곡선처럼 출렁이는 시계열 (n개) */
export function series(seed: number, n: number, base: number, amp: number, noise: number) {
  const r = rng(seed)
  let drift = 0
  return Array.from({ length: n }, (_, i) => {
    drift = drift * 0.85 + (r() - 0.5) * noise
    return +(base + Math.sin((i / n) * Math.PI * 2 - Math.PI / 2) * amp + drift).toFixed(2)
  })
}
