/* 가상의 동네 서점 앱 ‘책방 한켠’ 데이터 (책·작가·리뷰·사용자 모두 지어낸 이름이에요) */

export interface Book {
  id: number
  t: string
  a: string
  cat: string
  price: number
  /** 출간일 YYYY-MM-DD */
  date: string
  rate: number
  rev: number
  ebook: boolean
  blurb: string
  /** 추천순 점수 (높을수록 위) */
  pick: number
}

export const BOOKS: Book[] = [
  { id: 1, t: '고양이와 보낸 여름', a: '한서윤', cat: '소설', price: 14000, date: '2026-09-12', rate: 4.7, rev: 312, ebook: true, pick: 98, blurb: '시골 마을에서 길고양이와 한 계절을 보낸 소녀의 이야기예요. 여름이 끝나 갈 무렵 고양이가 사라져요.' },
  { id: 2, t: '고양이 집사 첫걸음', a: '박도윤', cat: '취미', price: 16500, date: '2025-03-02', rate: 4.4, rev: 98, ebook: false, pick: 71, blurb: '처음 고양이를 데려온 사람을 위한 생활 안내서예요. 밥, 화장실, 병원까지 차근차근 알려줘요.' },
  { id: 3, t: '여름의 레시피', a: '이하린', cat: '요리', price: 18000, date: '2026-06-20', rate: 4.5, rev: 147, ebook: true, pick: 88, blurb: '더운 날 불 없이 만드는 여름 요리 40가지를 담았어요. 바다 앞 캠핑에서도 만들 수 있어요.' },
  { id: 4, t: '밤의 도서관', a: '최유진', cat: '소설', price: 13500, date: '2024-11-08', rate: 4.8, rev: 521, ebook: true, pick: 93, blurb: '자정에만 문을 여는 도서관과 길 잃은 책들의 이야기예요. 사서는 말하는 고양이예요.' },
  { id: 5, t: '도시 산책자', a: '정민호', cat: '에세이', price: 15000, date: '2026-02-14', rate: 4.2, rev: 76, ebook: false, pick: 60, blurb: '출근길 대신 골목길로 걸으며 적은 작은 기록들이에요. 계절마다 다른 골목 풍경이 나와요.' },
  { id: 6, t: '작은 정원 가꾸기', a: '김나래', cat: '취미', price: 17000, date: '2025-08-30', rate: 4.3, rev: 64, ebook: false, pick: 55, blurb: '베란다 한 칸에서 시작하는 여름 채소 정원이에요. 화분 세 개면 충분해요.' },
  { id: 7, t: '우주를 여행하는 법', a: '오준서', cat: '과학', price: 19800, date: '2026-10-01', rate: 4.6, rev: 203, ebook: true, pick: 84, blurb: '별과 행성을 따라 떠나는 가장 쉬운 우주 안내서예요. 그림이 많아 아이와 함께 읽기 좋아요.' },
  { id: 8, t: '여름 밤 별자리', a: '오준서', cat: '과학', price: 12000, date: '2023-07-15', rate: 4.1, rev: 45, ebook: false, pick: 50, blurb: '맨눈으로 찾을 수 있는 여름 별자리 12개를 골랐어요. 바다나 산에서 올려다보세요.' },
  { id: 9, t: '고요한 바다', a: '한서윤', cat: '소설', price: 14500, date: '2025-05-21', rate: 4.5, rev: 188, ebook: true, pick: 79, blurb: '작은 섬 등대지기와 고양이 한 마리의 조용한 여름을 그린 소설이에요.' },
  { id: 10, t: '디자인 첫걸음', a: '윤채원', cat: '실용', price: 22000, date: '2026-04-03', rate: 4.4, rev: 132, ebook: true, pick: 66, blurb: '처음 디자인을 배우는 사람을 위한 색과 글자 이야기예요. 매일 한 장씩 따라 해요.' },
  { id: 11, t: '커피 한 잔의 철학', a: '서지호', cat: '에세이', price: 13000, date: '2024-09-09', rate: 4.0, rev: 58, ebook: false, pick: 48, blurb: '아침 커피를 내리며 떠올린 생각들을 모았어요. 짧은 글 서른 편이에요.' },
  { id: 12, t: '매일 만드는 빵', a: '이하린', cat: '요리', price: 21000, date: '2025-12-01', rate: 4.7, rev: 276, ebook: false, pick: 82, blurb: '반죽 하나로 일주일 내내 굽는 집빵 레시피예요. 여름엔 발효가 빨라요.' },
]

export const CATS = ['소설', '에세이', '요리', '취미', '과학', '실용'] as const

export const won = (n: number) => n.toLocaleString('ko-KR') + '원'

/** 정규식 특수문자 이스케이프 */
export const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 띄어쓰기로 나눈 검색어 */
export const words = (q: string) => q.trim().split(/\s+/).filter(Boolean)

/** 책 한 권이 모든 단어를 포함하나요? (제목·작가·분야) */
export const bookHit = (b: Book, q: string) => {
  const hay = b.t + ' ' + b.a + ' ' + b.cat
  return words(q).every(w => hay.includes(w))
}

/** 편집 거리 (오타 교정용) */
export function lev(a: string, b: string) {
  const m = [...a], n = [...b]
  const d = Array.from({ length: m.length + 1 }, (_, i) => [i, ...Array<number>(n.length).fill(0)])
  for (let j = 1; j <= n.length; j++) d[0][j] = j
  for (let i = 1; i <= m.length; i++)
    for (let j = 1; j <= n.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (m[i - 1] === n[j - 1] ? 0 : 1))
  return d[m.length][n.length]
}

/** 책 제목·작가·분야에 나오는 낱말 사전 */
export const VOCAB = [...new Set(BOOKS.flatMap(b => [...b.t.split(' '), b.a, b.cat]))]
