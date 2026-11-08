/** 인라인 스타일 여러 개를 한 번에 (React가 그리지 않는 style 속성만 바꿔요) */
export const css = (el: HTMLElement | null | undefined, s: Partial<Record<string, string | number>>) => {
  if (el) Object.assign(el.style, s)
}

/** 애니메이션이 취소돼도(다시 보기·리셋) 오류 없이 기다려요 */
export const done = (a: Animation) => a.finished.then(() => true, () => false)

/** 시작/끝 키프레임을 방향에 따라 뒤집어요 */
export const dir = (forward: boolean) => <T,>(x: T, y: T): [T, T] => (forward ? [x, y] : [y, x])
