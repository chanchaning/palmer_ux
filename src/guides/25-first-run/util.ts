/** data-k 로 찾기 (자동 재생용) */
export const q = (root: Element | null | undefined, k: string) => root?.querySelector<HTMLElement>('[data-k="' + k + '"]') ?? null
/** 카드의 데모 영역 (폰 바깥 컨트롤까지 포함) */
export const stageOf = (el: HTMLElement | null) => el?.closest<HTMLElement>('.t-stage') ?? null
/** 앱 홈 (여러 카드에서 공통으로 쓰는 간단한 피드) */
export const FEED: [string, string][] = [['봄비', '오늘은 물을 두 번 줬어요. 잎이 하나 더 났어요.'], ['해솔', '아침 산책 30분, 새싹 3단계 달성!'], ['다온', '비 오는 날엔 실내에서 기록해요.']]
