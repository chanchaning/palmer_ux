import { useEffect, useState } from 'react'
import { Card, Info, Stage } from '../../../components/Card'
import { Range, Seg } from '../../../components/ui'

/* ---------- 13 플랫폼 타입 스케일 ---------- */
// Material 3 기본 타입 스케일 (크기/행간, 단위 sp)
const M3: [string, number, number, number][] = [
  ['Display Large', 57, 64, 400], ['Display Medium', 45, 52, 400], ['Display Small', 36, 44, 400],
  ['Headline Large', 32, 40, 400], ['Headline Medium', 28, 36, 400], ['Headline Small', 24, 32, 400],
  ['Title Large', 22, 28, 400], ['Title Medium', 16, 24, 500], ['Title Small', 14, 20, 500],
  ['Body Large', 16, 24, 400], ['Body Medium', 14, 20, 400], ['Body Small', 12, 16, 400],
  ['Label Large', 14, 20, 500], ['Label Medium', 12, 16, 500], ['Label Small', 11, 16, 500],
]
// iOS 기본(Large) Dynamic Type 크기 (pt)
const HIG: [string, number, number][] = [
  ['Large Title', 34, 400], ['Title 1', 28, 400], ['Title 2', 22, 400], ['Title 3', 20, 400],
  ['Headline', 17, 600], ['Body', 17, 400], ['Callout', 16, 400], ['Subheadline', 15, 400],
  ['Footnote', 13, 400], ['Caption 1', 12, 400], ['Caption 2', 11, 400],
]
// iOS Body 스타일의 Dynamic Type 단계 (pt)
const DT: [string, number][] = [['xSmall', 14], ['Small', 15], ['Medium', 16], ['Large (기본)', 17], ['xLarge', 19], ['xxLarge', 21], ['xxxLarge', 23]]

export function PlatformScale() {
  const [plat, setPlat] = useState<'m3' | 'hig'>('m3')
  const [dt, setDt] = useState(3)
  const k = DT[dt][1] / 17
  return (
    <Card id="type-platform" num="13" title="플랫폼별 타입 스케일" en="Material 3 · Apple HIG"
      desc="머티리얼은 5그룹×3단계, 애플은 역할 이름과 사용자가 키우는 Dynamic Type으로 정리해요.">
      <Stage log={plat === 'm3'
        ? <>머티리얼 3 — <b>Display · Headline · Title · Body · Label</b> × Large/Medium/Small = 15단계</>
        : <>애플 HIG — 본문 <b>17pt</b> 기준 · Dynamic Type <b>{DT[dt][0]}</b> → Body {DT[dt][1]}pt</>}>
        <div className="box left">
          <Seg value={plat} onChange={setPlat} options={[['m3', 'Material 3'], ['hig', 'Apple HIG']]} />
          {plat === 'hig' && (
            <>
              <div className="ty-label"><span>설정 › 손쉬운 사용 › 더 큰 텍스트</span><b>{DT[dt][0]}</b></div>
              <Range value={dt} min={0} max={6} onChange={setDt} label="Dynamic Type 크기" />
            </>
          )}
          <div className="ty-plat">
            {plat === 'm3'
              ? M3.map(([n, s, lh, w]) => (
                <div key={n}><span style={{ fontSize: Math.min(s, 44), lineHeight: lh / s, fontWeight: w }}>{n}</span><code>{s}/{lh}sp</code></div>
              ))
              : HIG.map(([n, s, w]) => {
                const v = Math.round(s * k)
                return <div key={n}><span style={{ fontSize: v, fontWeight: w, transition: 'font-size .2s' }}>{n}</span><code>{v}pt</code></div>
              })}
          </div>
        </div>
      </Stage>
      <Info
        spec={[['M3 본문', 'Body Large 16sp'], ['iOS 본문', 'Body 17pt'], ['iOS', 'Dynamic Type 대응']]}
        usage={[
          ['차이', '머티리얼은 크기 단계 중심, 애플은 역할(Headline·Body·Caption) 중심으로 이름을 붙여요.'],
          ['실무', '앱이라면 고정 크기 대신 시스템 텍스트 스타일을 써야 사용자의 글자 크기 설정을 따라가요.'],
          ['주의', 'Dynamic Type의 다른 단계 값은 스타일마다 달라요. 여기서는 Body 값을 기준으로 비례해 보여줘요.'],
        ]}
      />
    </Card>
  )
}

/* ---------- 14 추천 한글 폰트 ---------- */
/** 설치된 글꼴인지 대략 판별 (대체 글꼴과 폭 비교) */
function useInstalled(family: string) {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    const text = '가나다라 Typography 0123456789'
    const widths = ['monospace', 'serif'].map(fb => {
      ctx.font = `32px ${fb}`; const base = ctx.measureText(text).width
      ctx.font = `32px "${family}", ${fb}`; return ctx.measureText(text).width !== base
    })
    setOk(widths.some(Boolean))
  }, [family])
  return ok
}

const FONTS = [
  { name: 'Pretendard', family: 'Pretendard', note: '이 사이트의 서체', desc: '애플 산돌고딕과 영문 Inter의 장점을 결합. 국내 웹·앱에서 가장 널리 쓰이고 9가지 굵기, 숫자 가독성이 좋아요.' },
  { name: '본고딕 (Noto Sans KR)', family: 'Noto Sans KR', note: '', desc: '구글·어도비 합작, 안드로이드 기본 한글 서체. 다국어 지원이 완벽하지만 행간 박스가 위아래로 넓어 위치 조정이 필요해요.' },
  { name: '스포카 한 산스 네오', family: 'Spoqa Han Sans Neo', note: '', desc: '본고딕 기반으로 숫자와 영문을 개량. 핀테크·커머스처럼 숫자가 많은 UI에 특히 잘 맞아요.' },
]
function FontRow({ f }: { f: (typeof FONTS)[number] }) {
  const installed = useInstalled(f.family)
  const isPre = f.family === 'Pretendard'
  return (
    <div className="ty-font">
      <header><b>{f.name}</b><span>{isPre ? f.note : installed ? '이 기기에 설치됨' : installed === false ? '미설치 · 대체 서체로 표시' : ''}</span></header>
      <p style={{ fontFamily: `"${f.family}", sans-serif` }}>결제 금액 129,000원 · 다람쥐 헌 쳇바퀴</p>
      {isPre && (
        <div className="w9">{[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => <span key={w} style={{ fontWeight: w }}>가{w}</span>)}</div>
      )}
      <div className="muted" style={{ marginTop: 4, lineHeight: 1.5 }}>{f.desc}</div>
    </div>
  )
}
export function Fonts() {
  return (
    <Card id="type-fonts" num="14" title="실무 표준 한글 폰트" en="Korean Typefaces"
      desc="무료로 상업적 사용이 가능하고 웹·앱 용량 최적화가 잘 된 폰트들이에요.">
      <Stage log={<>세 폰트 모두 <b>무료 상업용</b> · 이 기기에 없는 폰트는 대체 서체로 보여요</>}>
        <div className="box left"><div className="ty-fonts">{FONTS.map(f => <FontRow key={f.name} f={f} />)}</div></div>
      </Stage>
      <Info
        spec={[['라이선스', 'SIL OFL 1.1 등 무료 상업용'], ['웹 최적화', '서브셋 · 가변 폰트']]}
        usage={[
          ['실무', '웹폰트는 woff2와 서브셋(자주 쓰는 글자만)을 쓰고 font-display: swap으로 깜빡임을 줄여요.'],
          ['주의', '폰트를 여러 개 섞기보다 하나의 패밀리에서 굵기만 바꿔 위계를 만드는 게 깔끔해요.'],
        ]}
      />
    </Card>
  )
}
