/* 08 빌드 · 배포 — 데모 모음. fixed=false 문제 그대로, true 해결 적용
 * 빌드·배포는 브라우저 안에서 진짜로 일어나지 않아서, 대부분 실제 동작 규칙을 그대로 옮긴 시뮬레이션이에요.
 * (bd-env-migrate의 ‘이 사이트가 지금 받은 값’만 진짜 import.meta.env 예요) */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Seg, useTimers } from '../../components/ui'
import { Meter } from '../ui'

const fmt = (n: number) => n.toLocaleString('ko-KR')

/** 0 → 1 로 흐르는 재생 값 (requestAnimationFrame, 화면을 떠나면 멈춰요) */
function usePlay(ms: number) {
  const [p, setP] = useState(0)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const play = () => {
    cancelAnimationFrame(raf.current)
    const st = performance.now()
    const step = () => {
      const v = Math.min(1, (performance.now() - st) / ms)
      setP(v)
      if (v < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }
  return [p, play] as const
}

/* ---------- 01 느려지는 개발 서버 · 빌드 ---------- */
type Step = { name: string; s: number; tone?: 'bad' | 'good' }
const SLOW = {
  dev: {
    bad: [
      { name: '의존성 사전 번들 (늦게 발견 → 다시 하기 2번)', s: 16, tone: 'bad' },
      { name: '첫 화면 모듈 요청 2,430개 (아이콘 barrel)', s: 22, tone: 'bad' },
      { name: 'Babel 플러그인으로 JSX 변환', s: 12, tone: 'bad' },
      { name: '페이지 그리기', s: 3 },
    ] as Step[],
    good: [
      { name: '사전 번들 캐시 재사용 (node_modules/.vite)', s: 0.4, tone: 'good' },
      { name: '첫 화면 모듈 요청 180개 (아이콘 개별 import)', s: 1.6, tone: 'good' },
      { name: '네이티브 변환기 (Oxc · SWC · esbuild)', s: 0.6, tone: 'good' },
      { name: '페이지 그리기', s: 0.8 },
    ] as Step[],
    mods: [2430, 180],
  },
  build: {
    bad: [
      { name: 'npm install (CI 캐시 없음)', s: 150, tone: 'bad' },
      { name: 'tsc 전체 타입 검사 (증분 없음)', s: 95, tone: 'bad' },
      { name: '번들 + Babel 변환', s: 260, tone: 'bad' },
      { name: '압축 (terser)', s: 110, tone: 'bad' },
    ] as Step[],
    good: [
      { name: 'npm ci (CI 캐시 적중)', s: 28, tone: 'good' },
      { name: 'tsc -b (증분 빌드 정보 재사용)', s: 18, tone: 'good' },
      { name: '번들 (Rolldown · esbuild)', s: 34, tone: 'good' },
      { name: '압축 (Oxc · esbuild minify)', s: 9, tone: 'good' },
    ] as Step[],
  },
}
const sec = (s: number) => s >= 60 ? `${Math.floor(s / 60)}분 ${Math.round(s % 60)}초` : `${s < 10 ? s.toFixed(1) : Math.round(s)}초`

function StepBars({ title, steps, scale, p }: { title: string; steps: Step[]; scale: number; p: number }) {
  const total = steps.reduce((a, b) => a + b.s, 0)
  const now = p * scale // 지금까지 흐른 (가상) 초
  const starts = steps.map((_, i) => steps.slice(0, i).reduce((a, b) => a + b.s, 0))
  return (
    <div className="bd-steps">
      <div className="bd-steps-h"><b>{title}</b><span>{now >= total ? sec(total) : now > 0 ? sec(now) + '…' : '—'}</span></div>
      <div className="bd-track">
        {steps.map((st, i) => {
          const done = Math.max(0, Math.min(st.s, now - starts[i]))
          return <span key={st.name} className={'bd-seg-bar ' + (st.tone ?? '')} style={{ width: (done / scale) * 100 + '%' }} title={st.name} />
        })}
      </div>
      <ul className="bd-step-list">
        {steps.map(st => <li key={st.name} className={st.tone}><span>{st.name}</span><b>{sec(st.s)}</b></li>)}
      </ul>
    </div>
  )
}

export function SlowDemo({ fixed }: { fixed: boolean }) {
  const [p, play] = usePlay(3200)
  const dev = fixed ? SLOW.dev.good : SLOW.dev.bad
  const build = fixed ? SLOW.build.good : SLOW.build.bad
  const devT = dev.reduce((a, b) => a + b.s, 0)
  const buildT = build.reduce((a, b) => a + b.s, 0)
  return (
    <div className="bd-col">
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={play}>서버 켜기 · 빌드 재생</button>
        <span className="dv-log">막대 길이는 같은 눈금이에요 (개발 60초 · 빌드 11분)</span>
      </div>
      <StepBars title="npm run dev → 첫 화면" steps={dev} scale={60} p={p} />
      <StepBars title="CI: 설치 → npm run build" steps={build} scale={660} p={p} />
      <div className="dv-meters">
        <Meter label="개발 서버 첫 화면" value={sec(devT)} bad={devT > 10} />
        <Meter label="첫 화면 모듈 요청" value={fmt(SLOW.dev.mods[fixed ? 1 : 0])} bad={!fixed} />
        <Meter label="CI 빌드" value={sec(buildT)} bad={buildT > 180} />
      </div>
    </div>
  )
}

/* ---------- 02 Tree Shaking ---------- */
type Chunk = { name: string; used: number; dead: number; kind: 'app' | 'react' | 'lib' }
const SHAKE: Record<'bad' | 'good', { imports: string[]; chunks: Chunk[] }> = {
  bad: {
    imports: [`import _ from 'lodash'`, `import moment from 'moment'`, `import 'moment/locale/ko'`],
    chunks: [
      { name: '앱 코드', used: 92, dead: 0, kind: 'app' },
      { name: 'react + react-dom', used: 186, dead: 0, kind: 'react' },
      { name: 'lodash (CommonJS 전체)', used: 4, dead: 67, kind: 'lib' },
      { name: 'moment', used: 59, dead: 0, kind: 'lib' },
      { name: 'moment/locale (모든 언어)', used: 1, dead: 231, kind: 'lib' },
    ],
  },
  good: {
    imports: [`import { debounce, groupBy } from 'lodash-es'`, `import dayjs from 'dayjs'`, `import 'dayjs/locale/ko'`],
    chunks: [
      { name: '앱 코드', used: 92, dead: 0, kind: 'app' },
      { name: 'react + react-dom', used: 186, dead: 0, kind: 'react' },
      { name: 'lodash-es (debounce · groupBy만)', used: 4, dead: 0, kind: 'lib' },
      { name: 'dayjs + ko', used: 8, dead: 0, kind: 'lib' },
    ],
  },
}
export function TreeshakeDemo({ fixed }: { fixed: boolean }) {
  const d = SHAKE[fixed ? 'good' : 'bad']
  const MAX = 640
  const total = d.chunks.reduce((a, c) => a + c.used + c.dead, 0)
  const dead = d.chunks.reduce((a, c) => a + c.dead, 0)
  const gz = Math.round(total * 0.32) // gzip 대략 1/3 (예시)
  const [hover, setHover] = useState<string | null>(null)
  return (
    <div className="bd-col">
      <pre className="bd-term allow-select">{d.imports.join('\n')}</pre>
      <div className="bd-tmap" style={{ width: (total / MAX) * 100 + '%' }} aria-label="번들 구성 그림">
        {d.chunks.map(c => (
          <div key={c.name} className={'bd-tbox bd-k-' + c.kind + (hover === c.name ? ' on' : '')} style={{ flexGrow: c.used + c.dead }}
            onPointerEnter={() => setHover(c.name)} onPointerLeave={() => setHover(null)}>
            <span className="bd-tused" style={{ flexGrow: c.used }} />
            {c.dead > 0 && <span className="bd-tdead" style={{ flexGrow: c.dead }} />}
          </div>
        ))}
      </div>
      <ul className="bd-legend-list">
        {d.chunks.map(c => (
          <li key={c.name} className={hover === c.name ? 'on' : ''} onPointerEnter={() => setHover(c.name)} onPointerLeave={() => setHover(null)}>
            <i className={'bd-sw bd-k-' + c.kind} /><span>{c.name}</span>
            <b>{c.used + c.dead}KB</b>{c.dead > 0 && <em>안 쓰는 {c.dead}KB</em>}
          </li>
        ))}
      </ul>
      <div className="dv-meters">
        <Meter label="번들 (압축 전)" value={`${total}KB`} bad={!fixed} />
        <Meter label="gzip 추정" value={`${gz}KB`} bad={!fixed} />
        <Meter label="안 쓰는 코드" value={`${Math.round((dead / total) * 100)}%`} bad={dead > 0} />
      </div>
    </div>
  )
}

/* ---------- 03 운영 소스맵 노출 ---------- */
const SRC: Record<string, string> = {
  'assets/index-8f2c1a.js': `(()=>{"use strict";var e=window.__CFG__,t=async(n,r)=>{let o=await fetch(e.a+"/v2/pay",{method:"POST",body:JSON.stringify({i:n,c:r})});if(!o.ok)throw Error(o.status);return o.json()};function n(e){return e.items.reduce((e,t)=>e+t.price*t.qty,0)}…`,
  'src/api/payment.ts': `// TODO: 쿠폰 중복 사용 검사는 아직 서버에 없음.
//       당분간 프런트에서만 막아 둠 (2026-10 출시 후 처리)
export async function pay(orderId: string, coupon?: string) {
  const res = await fetch(\`\${API}/internal/v2/pay\`, {
    method: 'POST',
    body: JSON.stringify({ orderId, coupon }),
  })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}`,
  'src/admin/FeatureFlags.tsx': `// 숨은 관리자 메뉴 — 주소 뒤에 ?preview=lumen-2026 붙이면 열림
export const PREVIEW_KEY = 'lumen-2026'
export function FeatureFlags() {
  if (new URLSearchParams(location.search).get('preview') !== PREVIEW_KEY) return null
  return <AdminPanel />
}`,
  'src/config.ts': `export const API = 'https://api.lumen-shop.example'
// 스테이징 주소 (사내망 전용)
export const STAGE_API = 'https://stage-api.internal.lumen-shop.example'`,
}
export function SourcemapDemo({ fixed }: { fixed: boolean }) {
  const files = fixed ? ['assets/index-8f2c1a.js'] : Object.keys(SRC)
  const [open, setOpen] = useState(files[fixed ? 0 : 1])
  const [mapReq, setMapReq] = useState<null | number>(null)
  const exposed = files.filter(f => f.startsWith('src/')).length
  return (
    <div className="bd-col">
      <div className="bd-dt">
        <div className="bd-dt-bar"><span>Elements</span><span>Console</span><span className="on">Sources</span><span>Network</span></div>
        <div className="bd-dt-body">
          <ul className="bd-dt-tree" aria-label="파일 목록">
            <li className="dir">▾ lumen-shop.example</li>
            {files.map(f => (
              <li key={f}><button type="button" className={open === f ? 'on' : ''} onClick={() => setOpen(f)}>
                {f}
              </button></li>
            ))}
          </ul>
          <pre className="bd-dt-code allow-select">{SRC[open]}</pre>
        </div>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm ghost" onClick={() => setMapReq(fixed ? 404 : 200)}>GET /assets/index-8f2c1a.js.map</button>
        <span className="dv-log">{mapReq === null ? '누구나 이 주소를 직접 열어 볼 수 있어요' : mapReq === 200
          ? <><b>200</b> · 1.2MB JSON — <code>sourcesContent</code>에 원본 코드가 통째로 있어요</>
          : <><b>404</b> · 맵은 에러 추적 도구에만 올리고 배포 폴더에서 지웠어요</>}</span>
      </div>
      <div className="bd-tracker">
        <b>에러 추적 도구 (예: Sentry)</b>
        <code>TypeError: Cannot read properties of undefined (reading 'price')</code>
        <code>  at total (src/cart/total.ts:12:31)</code>
        <small>{fixed ? '맵을 비공개로 올려 둬서 원본 줄 번호로 보여요' : '공개된 맵으로 원본 줄 번호를 보여요 (공격자도 똑같이 봐요)'}</small>
      </div>
      <div className="dv-meters">
        <Meter label="공개된 원본 파일" value={`${exposed}개`} bad={exposed > 0} />
        <Meter label=".map 직접 요청" value={fixed ? '404' : '200'} bad={!fixed} />
        <Meter label="에러 원본 줄 보기" value="가능" bad={false} />
      </div>
    </div>
  )
}

/* ---------- 04 모노레포 유령 의존성 · peer ---------- */
type PM = 'npm' | 'pnpm'
const TREES: Record<'bad' | 'good', Record<PM, string[]>> = {
  bad: {
    npm: [
      'node_modules/',
      '  dayjs@1.11/        ← packages/ui 것이 루트로 끌어올려짐',
      '  react@19.2/',
      '  @lumen/ui → packages/ui',
      'packages/ui/node_modules/',
      '  react@18.3/        ← 두 번째 React',
    ],
    pnpm: [
      'node_modules/.pnpm/   (실제 파일은 여기에만)',
      'apps/web/node_modules/',
      '  react → .pnpm/react@19.2',
      '  @lumen/ui → ../../packages/ui',
      '  (dayjs 없음 — 선언 안 했으니까요)',
      'packages/ui/node_modules/',
      '  dayjs → .pnpm/dayjs@1.11',
      '  react → .pnpm/react@18.3   ← 두 번째 React',
    ],
  },
  good: {
    npm: [
      'node_modules/',
      '  dayjs@1.11/',
      '  react@19.2/         ← 하나뿐',
      '  @lumen/ui → packages/ui',
    ],
    pnpm: [
      'node_modules/.pnpm/',
      'apps/web/node_modules/',
      '  react → .pnpm/react@19.2',
      '  dayjs → .pnpm/dayjs@1.11',
      '  @lumen/ui → ../../packages/ui',
      'packages/ui/node_modules/',
      '  dayjs → .pnpm/dayjs@1.11',
      '  react → .pnpm/react@19.2   ← peer라 앱과 같은 사본',
    ],
  },
}
export function MonorepoDemo({ fixed }: { fixed: boolean }) {
  const [pm, setPm] = useState<PM>('npm')
  const ok = fixed || pm === 'npm'
  const reacts = fixed ? 1 : 2
  return (
    <div className="bd-col">
      <div className="dv-row">
        <Seg className="bd-seg" value={pm} onChange={setPm} options={[['npm', '내 PC (npm · 끌어올림)'], ['pnpm', 'CI (pnpm · 엄격)']]} />
      </div>
      <div className="bd-two">
        <pre className="bd-term allow-select">{`// apps/web/package.json
"dependencies": {
  "@lumen/ui": "workspace:*",
  "react": "^19.2.0"${fixed ? ',\n  "dayjs": "^1.11.13"' : ''}
}
// packages/ui/package.json
${fixed ? `"peerDependencies": { "react": "^18.3 || ^19" },
"dependencies": { "dayjs": "^1.11.13" }` : `"dependencies": {
  "react": "^18.3.1", "dayjs": "^1.11.13"
}`}`}</pre>
        <pre className="bd-term allow-select">{TREES[fixed ? 'good' : 'bad'][pm].join('\n')}</pre>
      </div>
      <div className={'bd-out ' + (ok && fixed ? 'ok' : ok ? 'warn' : 'err')}>
        {!ok ? <>✕ [plugin:vite:import-analysis] Failed to resolve import "dayjs" from "src/Date.tsx". Does the file exist?</>
          : fixed ? <>✓ 빌드 성공 · 화면 정상</>
          : <>✓ 빌드는 성공… 그런데 화면에서 <b>Invalid hook call</b> (React가 두 개)</>}
      </div>
      <div className="dv-meters">
        <Meter label="빌드 내 PC · CI" value={fixed ? '성공 · 성공' : '성공 · 실패'} bad={!fixed} />
        <Meter label="선언 안 한 import" value={fixed ? '0개' : '1개 (dayjs)'} bad={!fixed} />
        <Meter label="React 사본" value={`${reacts}개`} bad={reacts > 1} />
      </div>
    </div>
  )
}

/* ---------- 05 CDN 캐시 무효화 실패 ---------- */
type Res = { v: 1 | 2; from: string }
function cdnAt(fixed: boolean, h: number, invalidated: boolean): { html: Res; js: Res; jsName: string } {
  if (fixed) {
    return {
      html: { v: 2, from: '원본에 확인 → 새 파일 (200)' },
      js: { v: 2, from: h < 0.05 ? 'CDN MISS → 원본 (처음 한 번)' : 'CDN HIT (새 이름이라 옛 캐시와 안 겹쳐요)' },
      jsName: 'assets/index-C9xQ2.js',
    }
  }
  // 배포 직전에 다녀간 사용자: 브라우저 캐시에 v1이 있어요. 무효화는 CDN만 비워요
  const html: Res = h < 24 ? { v: 1, from: '브라우저 캐시 (max-age 24시간)' } : { v: 2, from: invalidated ? '원본' : 'CDN → 원본' }
  const js: Res = h < 1 ? { v: 1, from: '브라우저 캐시 (max-age 1시간)' } : { v: 2, from: invalidated ? 'CDN (무효화로 새로 받음)' : h < 24 ? 'CDN이 1시간 뒤 새로 받음' : 'CDN' }
  return { html, js, jsName: 'app.js' }
}
export function CdnCacheDemo({ fixed }: { fixed: boolean }) {
  const [h, setH] = useState(0)
  const [inv, setInv] = useState(false)
  const r = cdnAt(fixed, h, inv)
  const mixed = r.html.v !== r.js.v
  const screen = mixed ? '깨짐' : 'v' + r.html.v
  return (
    <div className="bd-col">
      <label className="bd-range">
        <span>배포하고 <b>{h < 1 ? Math.round(h * 60) + '분' : h + '시간'}</b> 뒤, 어제 왔던 사용자가 다시 열면</span>
        <input type="range" min={0} max={30} step={0.5} value={h} onChange={e => setH(Number(e.target.value))} aria-label="배포 뒤 지난 시간" />
      </label>
      {!fixed && (
        <label className="bd-check"><input type="checkbox" checked={inv} onChange={e => setInv(e.target.checked)} /> 배포 때 CloudFront 무효화(<code>/*</code>)도 했어요</label>
      )}
      <div className="bd-files">
        {[['index.html', r.html, fixed ? 'no-cache' : 'max-age=86400'], [r.jsName, r.js, fixed ? 'max-age=31536000, immutable' : 'max-age=3600']].map(([name, res, cc]) => (
          <div className="bd-file" key={name as string}>
            <code>{name as string}</code>
            <span className={'bd-ver v' + (res as Res).v}>v{(res as Res).v}</span>
            <small>Cache-Control: {cc as string}</small>
            <small>{(res as Res).from}</small>
          </div>
        ))}
      </div>
      <div className={'bd-out ' + (mixed ? 'err' : r.html.v === 2 ? 'ok' : 'warn')}>
        {mixed ? <>✕ 옛 HTML(v1)이 새 app.js(v2)를 불러서 <b>화면이 깨져요</b></>
          : r.html.v === 1 ? <>사용자는 아직 <b>옛 화면(v1)</b>을 봐요{inv ? ' — 무효화는 브라우저 캐시를 못 지워요' : ''}</>
          : <>✓ 새 화면(v2)</>}
      </div>
      <div className="dv-meters">
        <Meter label="지금 화면" value={screen} bad={screen !== 'v2'} />
        <Meter label="새 버전까지 최대" value={fixed ? '바로' : '24시간'} bad={!fixed} />
        <Meter label="HTML+JS 버전 섞임" value={fixed ? '불가능' : '1~24시간 사이'} bad={!fixed} />
      </div>
    </div>
  )
}

/* ---------- 06 S3 · CloudFront SPA fallback ---------- */
const PATHS = ['/', '/orders/1024', '/assets/index-C9xQ2.js', '/assets/Old-3fA1.js', '/no-such-page'] as const
type Path = typeof PATHS[number]
type Way = 'none' | 'error' | 'fn'
function spaRes(way: Way, p: Path): { s3: string; code: number; type: string; screen: string; tone: 'ok' | 'warn' | 'err' } {
  const exists = p === '/' || p === '/assets/index-C9xQ2.js'
  const isFile = /\.[a-z0-9]+$/i.test(p)
  if (exists) return { s3: '200', code: 200, type: p === '/' ? 'text/html' : 'text/javascript', screen: p === '/' ? '홈 화면' : '자바스크립트 파일', tone: 'ok' }
  if (way === 'none') return { s3: '403 AccessDenied', code: 403, type: 'application/xml', screen: '<Error><Code>AccessDenied</Code>…', tone: 'err' }
  if (way === 'error') {
    if (isFile) return { s3: '403', code: 200, type: 'text/html', screen: '청크 자리에 HTML → “Failed to load module script”', tone: 'warn' }
    return { s3: '403', code: 200, type: 'text/html', screen: p === '/no-such-page' ? '앱의 404 화면 (그런데 상태는 200)' : '주문 1024 화면', tone: p === '/no-such-page' ? 'warn' : 'ok' }
  }
  // CloudFront Function: 확장자 없는 주소만 /index.html 로 바꿔요
  if (isFile) return { s3: '403', code: 403, type: 'application/xml', screen: '진짜 오류 — 앱이 청크 실패를 알아채요', tone: 'ok' }
  return { s3: '200 (/index.html)', code: 200, type: 'text/html', screen: p === '/no-such-page' ? '앱의 404 화면 (상태 200)' : '주문 1024 화면', tone: p === '/no-such-page' ? 'warn' : 'ok' }
}
export function SpaFallbackDemo({ fixed }: { fixed: boolean }) {
  const [p, setP] = useState<Path>('/orders/1024')
  const [way, setWay] = useState<Way>('error')
  const [n, setN] = useState(0)
  const w: Way = fixed ? way : 'none'
  const r = spaRes(w, p)
  const brokenSub = spaRes(w, '/orders/1024').code !== 200
  const missing = spaRes(w, '/assets/Old-3fA1.js')
  return (
    <div className="bd-col">
      {fixed && <Seg className="bd-seg" value={way} onChange={setWay} options={[['error', '오류 응답 403·404 → /index.html'], ['fn', 'CloudFront Function 다시 쓰기']]} />}
      <div className="bd-browser">
        <div className="bd-url"><span>lumen-shop.example</span><b>{p === '/' ? '' : p}</b><button type="button" className="btn sm ghost" onClick={() => setN(v => v + 1)} aria-label="새로고침">↻ 새로고침</button></div>
        <div className={'bd-view ' + r.tone} key={n + p + w}>
          {r.type === 'application/xml' ? <pre className="allow-select">{`<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>AccessDenied</Code>\n<Message>Access Denied</Message></Error>`}</pre> : <b>{r.screen}</b>}
        </div>
      </div>
      <div className="bd-paths" role="group" aria-label="요청 주소 고르기">
        {PATHS.map(x => <button type="button" key={x} className={x === p ? 'on' : ''} onClick={() => setP(x)}>{x}</button>)}
      </div>
      <table className="bd-req">
        <tbody>
          <tr><th>S3 응답</th><td>{r.s3}</td></tr>
          <tr><th>사용자가 받은 것</th><td><b>{r.code}</b> · {r.type}</td></tr>
          <tr><th>화면</th><td>{r.screen}</td></tr>
        </tbody>
      </table>
      <div className="dv-meters">
        <Meter label="서브 주소 새로고침" value={brokenSub ? '403 깨짐' : '200 정상'} bad={brokenSub} />
        <Meter label="없는 청크 응답" value={`${missing.code} ${missing.type === 'text/html' ? 'HTML' : '오류'}`} bad={missing.code === 200} />
      </div>
    </div>
  )
}

/* ---------- 07 Service Worker 좀비 ---------- */
type SW = { server: number; active: number | null; waiting: number | null; installing: number | null; page: number; stale: number; toast: boolean; killed: boolean }
const SW0: SW = { server: 1, active: 1, waiting: null, installing: null, page: 1, stale: 0, toast: false, killed: false }
export function SwZombieDemo({ fixed }: { fixed: boolean }) {
  const [s, setS] = useState<SW>(SW0)
  const [log, setLog] = useState<ReactNode>('지금은 v1이 설치돼 있고, 화면도 v1이에요.')
  const timers = useTimers()
  const deploy = () => {
    const v = s.server + 1
    setS(x => ({ ...x, server: v, installing: s.killed ? null : v }))
    if (s.killed) { setLog(<>v{v} 배포. 서비스 워커가 없으니 다음 새로고침에 바로 받아요.</>); return }
    setLog(<>v{v} 배포 → 브라우저가 바뀐 <code>sw.js</code>를 발견하고 <b>설치 중</b>이에요…</>)
    timers.set(() => {
      setS(x => ({ ...x, installing: null, waiting: v, toast: fixed }))
      setLog(fixed ? <>설치 끝 → <b>대기(waiting)</b>. 페이지가 알아채고 안내를 띄웠어요.</> : <>설치 끝 → <b>대기(waiting)</b>. v{s.active} 서비스 워커가 아직 탭을 잡고 있어서 넘어가지 못해요.</>)
    }, 900)
  }
  const reload = () => {
    setS(st => {
      const page = st.killed ? st.server : st.active ?? st.server
      return { ...st, page, stale: st.stale + (page !== st.server ? 1 : 0) }
    })
    setLog(s.waiting ? <>새로고침해도 <b>옛 서비스 워커가 캐시에서</b> v{s.active}를 줘요. 대기 중인 v{s.waiting}은 그대로예요.</> : <>새로고침했어요.</>)
  }
  const closeAll = () => {
    setS(st => {
      const active = st.waiting ?? st.active
      const page = st.killed ? st.server : active ?? st.server
      return { ...st, active, waiting: null, page, toast: false, stale: st.stale + (page !== st.server ? 1 : 0) }
    })
    setLog(<>탭을 <b>모두 닫았다가</b> 열어야 대기하던 워커가 활성화돼요. 사용자는 보통 이걸 안 해요.</>)
  }
  const accept = () => {
    setLog(<><code>postMessage(&#123;type:'SKIP_WAITING'&#125;)</code> → <code>skipWaiting()</code> → <code>controllerchange</code> → 새로고침</>)
    setS(st => ({ ...st, toast: false }))
    timers.set(() => setS(st => ({ ...st, active: st.waiting ?? st.active, waiting: null, page: st.waiting ?? st.page })), 500)
  }
  const kill = () => {
    setS(st => ({ ...st, active: null, waiting: null, installing: null, killed: true, toast: false, page: st.server }))
    setLog(<>킬 스위치 <code>sw.js</code>: 캐시를 모두 지우고 <code>unregister()</code> 한 뒤 열린 탭을 새로 불러요.</>)
  }
  const slot = (label: string, v: number | null, tone: string) => (
    <div className={'bd-sw-slot ' + (v ? tone : 'empty')}><small>{label}</small><b>{v ? 'v' + v : '—'}</b></div>
  )
  return (
    <div className="bd-col">
      <div className="bd-sw-row">
        {slot('installing', s.installing, 'ing')}
        {slot('waiting', s.waiting, 'wait')}
        {slot('active', s.active, 'act')}
        <div className={'bd-sw-page' + (s.page !== s.server ? ' old' : '')}><small>화면</small><b>v{s.page}</b></div>
      </div>
      {s.toast && (
        <div className="bd-toast" role="status">새 버전이 있어요<button type="button" className="btn sm" onClick={accept}>새로고침</button></div>
      )}
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={deploy} disabled={!!s.installing}>새 버전 배포</button>
        <button type="button" className="btn sm ghost" onClick={reload}>새로고침</button>
        <button type="button" className="btn sm ghost" onClick={closeAll}>탭 모두 닫고 다시 열기</button>
        {fixed && <button type="button" className="btn sm danger" onClick={kill} disabled={s.killed}>비상: 킬 스위치 배포</button>}
      </div>
      <p className="dv-log">{log}</p>
      <div className="dv-meters">
        <Meter label="서버 버전" value={'v' + s.server} />
        <Meter label="사용자 화면" value={'v' + s.page} bad={s.page !== s.server} />
        <Meter label="옛 화면 본 새로고침" value={`${s.stale}번`} bad={s.stale > 0} />
      </div>
    </div>
  )
}

/* ---------- 08 process.env vs import.meta.env ---------- */
type Patch = 'raw' | 'empty' | 'whole'
const REAL_ENV = import.meta.env as Record<string, unknown>
export function EnvMigrateDemo({ fixed }: { fixed: boolean }) {
  const [patch, setPatch] = useState<Patch>('raw')
  const envFile = fixed
    ? ['VITE_API_URL=https://api.lumen-shop.example', 'VITE_MAP_KEY=map-pub-7731', 'DB_PASSWORD=s3cret!  # 서버 전용']
    : ['REACT_APP_API_URL=https://api.lumen-shop.example', 'REACT_APP_MAP_KEY=map-pub-7731', 'DB_PASSWORD=s3cret!  # 서버 전용']
  const rows: [string, string, boolean][] = fixed
    ? [
        ['import.meta.env.VITE_API_URL', '"https://api.lumen-shop.example"', true],
        ['import.meta.env.VITE_MAP_KEY', '"map-pub-7731"', true],
        ['import.meta.env.DB_PASSWORD', 'undefined  (VITE_ 아님 → 안 들어와요, 정상)', true],
      ]
    : patch === 'raw' ? [
        ['process.env.REACT_APP_API_URL', 'ReferenceError: process is not defined', false],
        ['process.env.REACT_APP_MAP_KEY', '(위에서 멈춰서 실행 안 됨)', false],
        ['process.env.DB_PASSWORD', '(위에서 멈춰서 실행 안 됨)', false],
      ] : patch === 'empty' ? [
        ['process.env.REACT_APP_API_URL', 'undefined', false],
        ['process.env.REACT_APP_MAP_KEY', 'undefined', false],
        ['process.env.DB_PASSWORD', 'undefined', true],
      ] : [
        ['process.env.REACT_APP_API_URL', '"https://api.lumen-shop.example"', true],
        ['process.env.REACT_APP_MAP_KEY', '"map-pub-7731"', true],
        ['process.env.DB_PASSWORD', '"s3cret!"  ← 번들에 박혔어요', false],
      ]
  const broken = rows.filter(r => !r[2] && !r[1].includes('s3cret')).length
  const leaked = !fixed && patch === 'whole'
  return (
    <div className="bd-col">
      {!fixed && <Seg className="bd-seg" value={patch} onChange={setPatch} options={[['raw', 'CRA 코드 그대로'], ['empty', "define: { 'process.env': {} }"], ['whole', "define: { 'process.env': process.env }"]]} />}
      <pre className="bd-term allow-select">{'# .env\n' + envFile.join('\n')}</pre>
      <table className="bd-req bd-env">
        <tbody>
          {rows.map(([k, v, ok]) => <tr key={k} className={ok ? '' : 'bad'}><th><code>{k}</code></th><td>{v}</td></tr>)}
        </tbody>
      </table>
      <div className="dv-meters">
        <Meter label="못 읽은 값" value={`${broken}개`} bad={broken > 0} />
        <Meter label="번들에 들어간 비밀" value={leaked ? 'DB_PASSWORD 외 PATH·HOME…' : '0개'} bad={leaked} />
      </div>
      <div className="bd-real">
        <b>진짜 값 — 이 사이트가 지금 받은 <code>import.meta.env</code></b>
        <ul>
          {Object.keys(REAL_ENV).sort().map(k => <li key={k}><code>{k}</code><span>{JSON.stringify(REAL_ENV[k])}</span></li>)}
        </ul>
        <small>VITE_로 시작하는 변수가 하나도 없어서 Vite 기본 값만 보여요.{import.meta.env.DEV ? " 지금은 개발 서버라 BASE_URL이 '/'이고, 운영 빌드에선 base: './' 설정대로 './'가 돼요." : ''}</small>
      </div>
    </div>
  )
}

/* ---------- 09 Docker 빌드 OOM ---------- */
type OomCase = 'over' | 'under'
export function DockerOomDemo({ fixed }: { fixed: boolean }) {
  const [c, setC] = useState<OomCase>('over')
  const [p, play] = usePlay(3000)
  const limit = fixed ? 4096 : 2048 // 컨테이너 메모리 제한 (MB)
  const heapMax = fixed ? 3072 : c === 'over' ? 4096 : 1536 // --max-old-space-size
  const NEED = 2600 // 이 빌드가 힙으로 쓰려는 최대 (예시)
  const BASE = 320 // 힙 바깥 메모리 (코드·버퍼·네이티브, 예시)
  const MAXY = 4500
  // 시간에 따라 힙이 오르는 모양 (번들 → 압축 단계에서 최대)
  const heapAt = (t: number) => Math.min(NEED, 400 + NEED * Math.pow(t, 1.3))
  const killAt = (() => { // 먼저 닿는 쪽에서 멈춰요
    for (let t = 0; t <= 1; t += 0.005) {
      const h = heapAt(t)
      if (h >= heapMax) return { t, code: 134 }
      if (h + BASE >= limit) return { t, code: 137 }
    }
    return { t: 1, code: 0 }
  })()
  const now = Math.min(p, killAt.t)
  const heap = heapAt(now)
  const rss = heap + BASE
  const done = p >= killAt.t && p > 0
  const code = done ? killAt.code : null
  const Y = (mb: number) => (1 - mb / MAXY) * 100 + '%'
  return (
    <div className="bd-col">
      {!fixed && <Seg className="bd-seg" value={c} onChange={setC} options={[['over', '힙 제한 4GB > 컨테이너 2GB'], ['under', '힙 제한 1.5GB (너무 작음)']]} />}
      <div className="bd-oom">
        <div className="bd-gauge" aria-label="메모리 그래프">
          <span className="bd-line limit" style={{ top: Y(limit) }}><i>컨테이너 {fmt(limit)}MB</i></span>
          <span className="bd-line heap" style={{ top: Y(heapMax) }}><i>힙 제한 {fmt(heapMax)}MB</i></span>
          <span className="bd-fill rss" style={{ height: (rss / MAXY) * 100 + '%' }} />
          <span className="bd-fill heap" style={{ height: (heap / MAXY) * 100 + '%' }} />
        </div>
        <pre className="bd-term bd-oom-log allow-select">{[
          `$ docker run --memory=${limit / 1024}g \\`,
          `    -e NODE_OPTIONS=--max-old-space-size=${heapMax} app npm run build`,
          p > 0 ? 'vite v8 building for production...' : '',
          now > 0.25 ? '✓ 1,842 modules transformed.' : '',
          now > 0.55 ? 'rendering chunks...' : '',
          code === 137 ? 'Killed\n\nexit code 137  (128 + 9 = SIGKILL, 커널 OOM killer)' : '',
          code === 134 ? 'FATAL ERROR: Reached heap limit Allocation failed\n - JavaScript heap out of memory\n\nexit code 134  (SIGABRT)' : '',
          code === 0 ? 'dist/assets/index-C9xQ2.js  612.4 kB\n✓ built in 41.2s\n\nexit code 0' : '',
        ].filter(Boolean).join('\n')}</pre>
      </div>
      <div className="dv-row">
        <button type="button" className="btn sm" onClick={play}>빌드 실행</button>
        <span className="dv-log">초록 = 힙, 연한 막대 = 프로세스 전체(RSS)</span>
      </div>
      <div className="dv-meters">
        <Meter label="최대 메모리(RSS)" value={`${fmt(Math.round(rss))}MB`} bad={code !== null && code !== 0} />
        <Meter label="종료 코드" value={code === null ? '—' : String(code)} bad={code === null ? undefined : code !== 0} />
        <Meter label="결과" value={code === null ? '—' : code === 0 ? '성공' : '실패'} bad={code === null ? undefined : code !== 0} />
      </div>
    </div>
  )
}

/* ---------- 10 개발용 .env가 운영에 섞임 ---------- */
type EnvFile = { name: string; lines: [string, string][]; git: boolean }
const ENV_FILES: EnvFile[] = [
  { name: '.env', git: true, lines: [['VITE_API_URL', 'https://api.dev.lumen-shop.example'], ['VITE_SENTRY_ENV', 'dev']] },
  { name: '.env.local', git: false, lines: [['VITE_API_URL', 'http://localhost:8080'], ['VITE_ADMIN_TOKEN', 'adm_9f8e7d…']] },
  { name: '.env.production', git: true, lines: [['VITE_API_URL', 'https://api.lumen-shop.example'], ['VITE_SENTRY_ENV', 'prod']] },
  { name: '.env.production.local', git: false, lines: [['VITE_API_URL', 'https://api.stage.lumen-shop.example']] },
]
const RANK = ['.env', '.env.local', '.env.production', '.env.production.local'] // 뒤일수록 이겨요
export function EnvLeakDemo({ fixed }: { fixed: boolean }) {
  const init = fixed ? ['.env', '.env.production'] : ['.env', '.env.local']
  const [on, setOn] = useState<string[]>(init)
  const toggle = (n: string) => setOn(o => o.includes(n) ? o.filter(x => x !== n) : [...o, n])
  const final = new Map<string, string>()
  const from = new Map<string, string>()
  for (const n of RANK) {
    if (!on.includes(n)) continue
    for (const [k, v] of ENV_FILES.find(f => f.name === n)!.lines) { final.set(k, v); from.set(k, n) }
  }
  const api = final.get('VITE_API_URL') ?? '(없음)'
  const prodApi = api === 'https://api.lumen-shop.example'
  const secrets = [...final.keys()].filter(k => /TOKEN|SECRET|PASSWORD/.test(k))
  return (
    <div className="bd-col">
      <p className="dv-log">{fixed ? <><b>CI</b>에서 깨끗하게 체크아웃해 <code>vite build</code> (mode=production)</> : <><b>내 노트북</b>에서 <code>vite build</code> (mode=production)</>} — 있는 파일을 눌러 켜고 꺼 보세요</p>
      <div className="bd-envs">
        {ENV_FILES.map(f => (
          <button type="button" key={f.name} className={'bd-envf' + (on.includes(f.name) ? ' on' : '')} onClick={() => toggle(f.name)} aria-pressed={on.includes(f.name)}>
            <span className="bd-envf-h"><code>{f.name}</code><small>{f.git ? 'git에 올라감' : 'git 무시(*.local)'} · 우선 {RANK.indexOf(f.name) + 1}</small></span>
            {f.lines.map(([k, v]) => <span key={k} className={'bd-envf-l' + (from.get(k) === f.name ? ' win' : '')}>{k}={v}</span>)}
          </button>
        ))}
      </div>
      <table className="bd-req bd-env">
        <tbody>
          {[...final.entries()].map(([k, v]) => (
            <tr key={k} className={(k === 'VITE_API_URL' && !prodApi) || secrets.includes(k) ? 'bad' : ''}>
              <th><code>{k}</code></th><td>{v} <small>← {from.get(k)}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dv-meters">
        <Meter label="운영 번들의 API" value={api.replace(/^https?:\/\//, '')} bad={!prodApi} />
        <Meter label="번들에 박힌 비밀" value={secrets.length ? secrets.join(', ') : '0개'} bad={secrets.length > 0} />
      </div>
    </div>
  )
}
