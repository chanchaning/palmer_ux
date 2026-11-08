import { useState, type CSSProperties, type ReactNode } from 'react'
import { Icon, PfCard, PHOTO, type IconName } from '../shared'

/* ================= C 한쪽에만 있는 이름 ================= */
const MF: CSSProperties = { fontFamily: 'var(--pf-mf)' }
const HF: CSSProperties = { fontFamily: 'var(--pf-hf)' }
const L = ({ l, t, w, z }: { l: number; t: number; w: string; z?: boolean }) => <span className="pv-line" style={{ left: l, top: t, width: w, zIndex: z ? 1 : undefined }} />
const Lines3 = () => <><L l={12} t={30} w="60%" /><L l={12} t={46} w="75%" /><L l={12} t={62} w="45%" /><L l={12} t={78} w="68%" /></>
const abs = (s: CSSProperties): CSSProperties => ({ position: 'absolute', ...s })
const dot = (bg: string, op?: number): CSSProperties => ({ width: 7, height: 7, borderRadius: '50%', background: bg, opacity: op })

type Only = [key: string, name: string, desc: string, icon: IconName, preview: ReactNode]

const M_ONLY: Only[] = [
  ['fab', 'FAB', '화면의 핵심 동작 하나를 띄운 큰 버튼', 'plus', <>
    <Lines3 />
    <span style={abs({ right: 14, bottom: 14, width: 46, height: 46, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 25, boxShadow: '0 3px 8px rgba(0,0,0,.2)' })}><Icon k="plus" /></span>
  </>],
  ['drawer', 'Navigation Drawer', '왼쪽에서 밀려 나오는 내비게이션 서랍', 'menu', <>
    <Lines3 />
    <span style={abs({ inset: 0, background: 'var(--dim)' })} />
    <span style={abs({ left: 0, top: 0, bottom: 0, width: '62%', background: 'color-mix(in srgb,var(--accent) 6%,var(--surface))', borderRadius: '0 16px 16px 0', padding: '24px 8px 0', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, ...MF })}>
      <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 999, padding: '5px 10px', fontWeight: 600 }}>받은편지함</span>
      <span style={{ padding: '5px 10px' }}>보낸편지함</span><span style={{ padding: '5px 10px' }}>임시보관함</span>
    </span>
  </>],
  ['rail', 'Navigation Rail', '태블릿·폴더블 화면의 세로 내비게이션', 'home', <>
    <span style={abs({ left: 0, top: 0, bottom: 0, width: 52, background: 'color-mix(in srgb,var(--accent) 6%,var(--surface))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 24, fontSize: 17, color: 'var(--text-2)' })}>
      <span style={{ width: 40, height: 24, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}><Icon k="home" /></span>
      <Icon k="search" /><Icon k="star" />
    </span>
    <L l={64} t={30} w="50%" /><L l={64} t={46} w="60%" /><L l={64} t={62} w="40%" />
  </>],
  ['chips', 'Chips 4종', 'Assist · Filter · Input · Suggestion 칩', 'check', <>
    <div style={abs({ left: 12, right: 12, top: 28, display: 'flex', flexWrap: 'wrap', gap: 6 })}>
      <span className="pv-chip"><Icon k="star" />Assist</span><span className="pv-chip sel"><Icon k="check" />Filter</span>
      <span className="pv-chip">Input ✕</span><span className="pv-chip sug">Suggestion</span>
    </div>
  </>],
  ['badges', 'Badges', '아이콘 모서리의 점·숫자 표시', 'bell', <>
    <div style={abs({ inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, fontSize: 29, color: 'var(--text-2)' })}>
      <span style={{ position: 'relative' }}><Icon k="mail" /><span style={abs({ top: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)' })} /></span>
      <span style={{ position: 'relative' }}><Icon k="bell" /><span style={abs({ top: -6, left: 16, minWidth: 18, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--danger)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', ...MF })}>3</span></span>
    </div>
  </>],
  ['divider', 'Divider', '목록·영역을 나누는 얇은 선 (전체·인셋)', 'minus', <>
    <div style={abs({ left: 0, right: 0, top: 24, fontSize: 12, ...MF })}>
      <div style={{ padding: '6px 12px' }}>항목 1</div><div style={{ borderTop: '1px solid var(--text-3)', opacity: 0.5 }} />
      <div style={{ padding: '6px 12px' }}>항목 2</div><div style={{ borderTop: '1px solid var(--text-3)', opacity: 0.5, marginLeft: 12 }} />
      <div style={{ padding: '6px 12px' }}>항목 3</div>
    </div>
  </>],
]

const sepL: CSSProperties = { padding: '5px 8px', borderLeft: '1px solid color-mix(in srgb,var(--surface) 30%,transparent)' }
const H_ONLY: Only[] = [
  ['toolbar', 'Toolbar', '화면 아래(또는 위)에 현재 화면용 동작 모음', 'share', <>
    <Lines3 />
    <span style={abs({ left: 0, right: 0, bottom: 0, height: 34, background: 'color-mix(in srgb,var(--surface) 75%,transparent)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', color: 'var(--b)', fontSize: 18 })}>
      <Icon k="share" /><Icon k="star" /><Icon k="trash" />
    </span>
  </>],
  ['context', 'Context Menu', '길게 누르면 미리보기와 함께 뜨는 메뉴', 'layers', <>
    <span style={abs({ inset: 0, background: 'color-mix(in srgb,var(--text) 12%,transparent)', backdropFilter: 'blur(3px)' })} />
    <span style={abs({ left: 14, top: 22, width: 70, height: 46, borderRadius: 10, background: PHOTO[0], boxShadow: '0 6px 18px rgba(0,0,0,.2)' })} />
    <span style={abs({ left: 14, top: 74, width: 120, borderRadius: 10, background: 'color-mix(in srgb,var(--surface) 88%,transparent)', fontSize: 11, overflow: 'hidden', ...HF })}>
      <span style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px' }}>복사<Icon k="copy" /></span>
      <span style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderTop: '1px solid var(--line)', color: 'var(--danger)' }}>삭제<Icon k="trash" /></span>
    </span>
  </>],
  ['edit', 'Edit Menu', '텍스트 선택 시 뜨는 잘라내기·복사·붙여넣기', 'cursor', <>
    <span style={abs({ left: '50%', top: 30, transform: 'translateX(-50%)', display: 'flex', background: 'var(--text)', color: 'var(--surface)', borderRadius: 8, fontSize: 11, whiteSpace: 'nowrap', ...HF })}>
      <span style={{ padding: '5px 8px' }}>잘라내기</span><span style={sepL}>복사</span><span style={sepL}>붙여넣기</span>
    </span>
    <span style={abs({ left: 12, right: 12, top: 66, fontSize: 13, ...HF })}>오늘은 <span style={{ background: 'color-mix(in srgb,var(--b) 30%,transparent)' }}>디자인 리뷰</span>가 있어요</span>
  </>],
  ['popover', 'Popover', '버튼에 붙어 뜨는 말풍선 창 (주로 iPad)', 'bubble', <>
    <span style={abs({ left: 16, top: 28, color: 'var(--b)', fontSize: 13, ...HF })}>필터</span>
    <span style={abs({ left: 10, top: 52, width: 140, height: 62, borderRadius: 12, background: 'var(--surface)', boxShadow: '0 6px 20px rgba(0,0,0,.18)', border: '1px solid var(--line)' })} />
    <span style={abs({ left: 22, top: 46, width: 12, height: 12, background: 'var(--surface)', transform: 'rotate(45deg)', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)' })} />
    <L l={22} t={66} w="90px" z /><L l={22} t={82} w="70px" z />
  </>],
  ['page', 'Page Control', '페이지 위치를 알려주는 점 묶음', 'dots', <>
    <span style={abs({ left: 12, right: 12, top: 24, height: 62, borderRadius: 10, background: PHOTO[1] })} />
    <span style={abs({ left: '50%', bottom: 14, transform: 'translateX(-50%)', display: 'flex', gap: 6 })}>
      <i style={dot('var(--text)')} /><i style={dot('var(--text-3)', 0.5)} /><i style={dot('var(--text-3)', 0.5)} /><i style={dot('var(--text-3)', 0.5)} />
    </span>
  </>],
  ['stepper', 'Stepper', '− / + 로 값을 하나씩 바꾸는 버튼 쌍', 'plus', <>
    <span style={abs({ left: 12, top: 46, fontSize: 14, ...HF })}>인원 <b>2명</b></span>
    <span style={abs({ right: 14, top: 40, display: 'flex', background: 'var(--pf-track2)', borderRadius: 8, overflow: 'hidden', fontSize: 17 })}>
      <span style={{ padding: '4px 12px' }}><Icon k="minus" /></span><span style={{ padding: '4px 12px', borderLeft: '1px solid var(--line)' }}><Icon k="plus" /></span>
    </span>
  </>],
  ['color', 'Color Well', '눌러서 색을 고르는 동그란 색 버튼', 'drop', <>
    <span style={abs({ left: '50%', top: '50%', width: 52, height: 52, margin: '-20px 0 0 -26px', borderRadius: '50%', background: 'conic-gradient(#ff3b30,#ff9500,#ffcc00,#34c759,#00c7be,#007aff,#5856d6,#af52de,#ff3b30)', display: 'grid', placeItems: 'center' })}>
      <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--b)', border: '3px solid var(--surface)' }} />
    </span>
  </>],
  ['live', 'Live Activities', '잠금 화면·다이내믹 아일랜드의 실시간 현황', 'bell', <>
    <span style={abs({ left: '50%', top: 18, transform: 'translateX(-50%)', width: 150, height: 28, borderRadius: 14, background: '#000', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', ...HF })}><span>🚕 배차 완료</span><b>3분</b></span>
    <span style={abs({ left: 12, right: 12, bottom: 12, height: 44, borderRadius: 14, background: 'color-mix(in srgb,var(--surface-3) 70%,transparent)', padding: '8px 10px', fontSize: 11, ...HF })}>
      도착까지 3분
      <span style={{ display: 'block', marginTop: 6, height: 4, borderRadius: 2, background: 'var(--pf-track2)' }}><span style={{ display: 'block', width: '70%', height: '100%', borderRadius: 2, background: 'var(--b)' }} /></span>
    </span>
  </>],
]

function OnlyCol({ s }: { s: 'm' | 'h' }) {
  const list = s === 'm' ? M_ONLY : H_ONLY
  const [cur, setCur] = useState(0)
  const [nonce, setNonce] = useState(0)
  const show = (i: number) => { setCur(i); setNonce(n => n + 1) }
  return (
    <div className={'pf-col ' + s} data-col={s}>
      <h3><span className="dot" />{s === 'm' ? '머티리얼에만' : 'HIG에만'} <small>→ {s === 'm' ? '머티리얼' : 'HIG'} 가이드</small></h3>
      <div className="pf-pv">
        <span className="pf-pv-cap" data-cap>{list[cur][1]}</span>
        <div className="pf-pv-in" data-pv key={nonce}>{list[cur][4]}</div>
      </div>
      <div className="pf-chiplist" data-list>
        {list.map((o, i) => (
          <a key={o[0]} className={'pf-oc' + (i === cur ? ' on' : '')} href={s === 'm' ? '#/material' : '#/hig'} data-i={i}
            onPointerEnter={() => show(i)} onFocus={() => show(i)}>
            <span className="ti"><Icon k={o[3]} /></span><span><b>{o[1]}</b><small>{o[2]}</small></span>
          </a>
        ))}
      </div>
    </div>
  )
}

export function OnlyOne() {
  return (
    <PfCard id="only" num="C" wide title="한쪽에만 있는 이름" en="Platform-only"
      desc="상대 플랫폼엔 같은 이름의 공식 컴포넌트가 없어요. 비슷한 화면은 다른 컴포넌트를 조합해 만들어요.">
      <div className="pf-only"><OnlyCol s="m" /><OnlyCol s="h" /></div>
      <p className="pf-note">기준: 각 가이드의 공식 컴포넌트 목록이에요. 버전에 따라 새로 생기거나 이름이 바뀔 수 있어요 (예: M3 Expressive에 새로 생긴 Toolbars).</p>
    </PfCard>
  )
}
