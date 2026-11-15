/** data-k 로 찾기 (자동 재생용) */
export const q = (root: Element | null | undefined, k: string) => root?.querySelector<HTMLElement>('[data-k="' + k + '"]') ?? null
/** 카드의 데모 영역 (폰 바깥 컨트롤까지 포함) */
export const stageOf = (el: HTMLElement | null) => el?.closest<HTMLElement>('.t-stage') ?? null
