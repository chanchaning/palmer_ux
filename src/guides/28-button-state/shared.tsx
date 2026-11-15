/** 버튼 안 작은 스피너 (글자색을 따라가요) */
export function Spin() {
  return <i className="bs-spin" aria-hidden="true" />
}

/** 체크 아이콘 */
export function Check() {
  return (
    <svg className="bs-ico" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

/** 경고 아이콘 */
export function Alert() {
  return (
    <svg className="bs-ico" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.8v3.6M8 11.1v.1" />
    </svg>
  )
}
