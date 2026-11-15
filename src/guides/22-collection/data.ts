/* GUIDE 22 공용 데이터 — 가상의 동네 카페 ‘솔방울 커피’ 메뉴.
 * 모든 카드가 같은 12개 메뉴를 다른 모양으로 보여줘요. */

export type Cat = '커피' | '라떼' | '에이드' | '디저트'

export interface Item {
  id: string
  name: string
  cat: Cat
  price: number
  kcal: number
  /** 이번 주 주문 수 */
  orders: number
  emoji: string
  /** 사진 대신 쓰는 색 (1–6, CSS 토큰 조합) */
  tone: number
  desc: string
}

export const MENU: Item[] = [
  { id: 'ame', name: '아메리카노', cat: '커피', price: 4500, kcal: 10, orders: 312, emoji: '☕', tone: 1, desc: '고소한 원두를 진하게 내린 기본 커피' },
  { id: 'cold', name: '콜드브루', cat: '커피', price: 5000, kcal: 15, orders: 188, emoji: '🧊', tone: 2, desc: '찬물로 12시간 천천히 우려 깔끔해요' },
  { id: 'esp', name: '에스프레소', cat: '커피', price: 4000, kcal: 5, orders: 64, emoji: '☕', tone: 3, desc: '한 모금에 끝나는 진한 원액' },
  { id: 'latte', name: '카페라떼', cat: '라떼', price: 5000, kcal: 180, orders: 254, emoji: '🥛', tone: 4, desc: '우유를 듬뿍 넣어 부드러워요' },
  { id: 'vanilla', name: '바닐라라떼', cat: '라떼', price: 5500, kcal: 240, orders: 201, emoji: '🍦', tone: 5, desc: '직접 끓인 바닐라 시럽이 들어가요' },
  { id: 'green', name: '녹차라떼', cat: '라떼', price: 5500, kcal: 210, orders: 97, emoji: '🍵', tone: 6, desc: '쌉싸름한 말차와 우유의 조합' },
  { id: 'lemon', name: '레몬에이드', cat: '에이드', price: 5800, kcal: 150, orders: 133, emoji: '🍋', tone: 2, desc: '레몬을 통째로 갈아 상큼해요' },
  { id: 'grape', name: '자몽에이드', cat: '에이드', price: 5800, kcal: 160, orders: 121, emoji: '🍊', tone: 5, desc: '자몽 과육이 씹히는 탄산 음료' },
  { id: 'plum', name: '청매실에이드', cat: '에이드', price: 6000, kcal: 140, orders: 48, emoji: '🫧', tone: 6, desc: '직접 담근 매실청으로 만들어요' },
  { id: 'scone', name: '버터 스콘', cat: '디저트', price: 3800, kcal: 390, orders: 176, emoji: '🥐', tone: 3, desc: '겉은 바삭, 속은 촉촉한 스콘' },
  { id: 'cake', name: '당근 케이크', cat: '디저트', price: 6500, kcal: 420, orders: 89, emoji: '🍰', tone: 4, desc: '크림치즈를 두껍게 올린 조각 케이크' },
  { id: 'cookie', name: '초코 쿠키', cat: '디저트', price: 3000, kcal: 280, orders: 142, emoji: '🍪', tone: 1, desc: '큼직한 초코칩이 박힌 쿠키' },
]

export const CATS: Cat[] = ['커피', '라떼', '에이드', '디저트']

export const won = (n: number) => n.toLocaleString('ko-KR') + '원'
