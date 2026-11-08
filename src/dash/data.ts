/* 관제 대시보드 탭 공통 예시 — 우선순위·난수·가상 안전관리 현장 데이터 */

export type Pri = 1 | 2 | 3
/** 알람 우선순위 — 색 + 모양 + 글자를 함께 써요(색만으로 구분하지 않기) */
export const PRI: Record<Pri, { name: string; short: string; shape: 'square' | 'triangle' | 'circle'; respond: string }> = {
  1: { name: '긴급', short: '1', shape: 'square', respond: '즉시 (5분 이내)' },
  2: { name: '높음', short: '2', shape: 'triangle', respond: '15분 이내' },
  3: { name: '주의', short: '3', shape: 'circle', respond: '근무 시간 안' },
}

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

/* =====================================================================
 * 안전관리 예시 — 대시보드 영역의 새 공통 예시
 * 어느 산업 안전관리 시스템에나 있는 일반 기능만 써요. 회사·현장·사람·수치는 모두 가상이에요.
 * ===================================================================== */
export const SAFE_CENTER = '통합 안전관리 상황실'
export const SAFE_PLACE = '가상의 가람산업 (제2공장 · 물류센터 · 신축 현장)'

export type SafeEventType = 'fire' | 'gas' | 'zone' | 'fall' | 'ppe' | 'down' | 'equip'
/** 안전관리 이벤트 종류 */
export const SAFE_EVENT: Record<SafeEventType, { name: string; src: string; note: string }> = {
  fire: { name: '화재·연기', src: '화재 감지기 · CCTV', note: '불꽃·연기·열을 감지' },
  gas: { name: '가스 이상', src: '가스 센서', note: '가연성 가스·일산화탄소가 기준을 넘거나 산소가 부족함' },
  zone: { name: '위험구역 접근', src: '위치 태그 · CCTV', note: '중장비 작업 반경이나 출입 금지 구역에 들어감' },
  fall: { name: '추락 위험', src: '안전대 센서 · CCTV', note: '높은 곳에서 안전대를 걸지 않음' },
  ppe: { name: '보호구 미착용', src: 'CCTV · 출입 게이트', note: '안전모·안전화·보호조끼를 착용하지 않음' },
  down: { name: '작업자 무응답', src: '웨어러블', note: '작업자가 넘어졌거나 일정 시간 움직임이 없음' },
  equip: { name: '설비 이상', src: '설비 센서', note: '모터 온도·진동이 기준을 넘음' },
}

export interface SafeZone { id: string; name: string; workers: number; sensors: string[] }
export interface SafeSite { id: string; name: string; kind: string; x: number; y: number; zones: SafeZone[] }
/** 현장 3곳 · 구역 9개. x·y 는 가상 지도 위 위치(%) */
export const SAFE_SITES: SafeSite[] = [
  { id: 'F', name: '제2공장', kind: '제조', x: 28, y: 30, zones: [
    { id: 'F1', name: '프레스 라인', workers: 14, sensors: ['진동', '온도'] },
    { id: 'F2', name: '도장 부스', workers: 6, sensors: ['가연성 가스', '온도'] },
    { id: 'F3', name: '화학물질 창고', workers: 2, sensors: ['가연성 가스', '일산화탄소'] },
  ] },
  { id: 'W', name: '물류센터', kind: '물류', x: 70, y: 38, zones: [
    { id: 'W1', name: '지게차 통로', workers: 9, sensors: [] },
    { id: 'W2', name: '고층 랙 구역', workers: 5, sensors: [] },
    { id: 'W3', name: '상하차장', workers: 11, sensors: ['일산화탄소'] },
  ] },
  { id: 'C', name: '신축 현장', kind: '건설', x: 46, y: 74, zones: [
    { id: 'C1', name: '타워크레인 반경', workers: 8, sensors: [] },
    { id: 'C2', name: '고소작업 구역', workers: 7, sensors: [] },
    { id: 'C3', name: '지하 밀폐공간', workers: 3, sensors: ['산소', '일산화탄소'] },
  ] },
]

/** 센서 측정값 범위 (설명용 가상 기준 — 법정 기준값이나 실제 설비 기준이 아니에요) */
export const SAFE_RANGES = {
  lel: { unit: '%LEL', min: 0, max: 60, normal: [0, 10] as [number, number], alarm: [0, 25] as [number, number], name: '가연성 가스' },
  co: { unit: 'ppm', min: 0, max: 200, normal: [0, 25] as [number, number], alarm: [0, 50] as [number, number], name: '일산화탄소' },
  temp: { unit: '℃', min: 0, max: 120, normal: [20, 70] as [number, number], alarm: [0, 90] as [number, number], name: '모터 온도' },
  vib: { unit: 'mm/s', min: 0, max: 12, normal: [0, 4.5] as [number, number], alarm: [0, 7] as [number, number], name: '진동' },
}

export interface SafeAlarm { id: string; pri: Pri; type: SafeEventType; where: string; what: string; action: string }
/** 예시 알람 — 우선순위는 '결과의 심각도 × 대응할 시간'으로 매긴 가상 값 */
export const SAFE_ALARMS: SafeAlarm[] = [
  { id: 'S-101', pri: 1, type: 'fire', where: '제2공장 · 도장 부스', what: '연기 감지 + 온도 급상승', action: '구역 작업 중지, 대피 방송, 소방 신고 판단' },
  { id: 'S-102', pri: 1, type: 'down', where: '신축 현장 · 지하 밀폐공간', what: '작업자 무응답 30초', action: '감시인 확인, 구조 장비 들고 2인 이상 출동' },
  { id: 'S-103', pri: 2, type: 'gas', where: '제2공장 · 화학물질 창고', what: '가연성 가스 12%LEL (정상 10%LEL 이하)', action: '환기 장치 가동 확인, 누출 점검 요청' },
  { id: 'S-104', pri: 2, type: 'zone', where: '신축 현장 · 타워크레인 반경', what: '인양 중 작업자 반경 진입', action: '크레인 신호수에게 즉시 정지 요청' },
  { id: 'S-105', pri: 3, type: 'ppe', where: '물류센터 · 상하차장', what: '안전모 미착용 1명', action: '구역 반장에게 알림' },
  { id: 'S-106', pri: 3, type: 'equip', where: '제2공장 · 프레스 라인 3호기', what: '모터 진동 5.1mm/s (정상 4.5 이하)', action: '설비팀에 점검 요청' },
]

/** 사고 대응 절차 예시 (일반적인 단계) */
export const SAFE_SOP = ['작업 중지', '위험 제거·격리', '구조·응급조치', '대피', '신고·보고', '2차 피해 방지', '기록']
