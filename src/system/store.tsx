/* 디자인 시스템 페이지 — 공통 설정 저장소
 * 각 탭은 useSys()로 설정을 읽고 고쳐요. 내보내기(CSS/JSON/Tailwind/링크)는 이 설정 하나에서 만들어져요. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Device = 'pc' | 'tablet' | 'mobile'
export type Mode = 'light' | 'dark'

export interface TypeScale { h1: number; h2: number; h3: number; body: number; caption: number }
export interface GridSpec { cols: number; gutter: number; margin: number; maxw: number }

export interface SysConfig {
  type: {
    /** 본문 기준 크기(px) */
    base: number
    /** 본문 행간 */
    lh: number
    /** 제목 행간 */
    lhHeading: number
    /** 자간(em) */
    ls: number
    /** 본문 최대 너비(px) */
    maxw: number
    keepAll: boolean
    /** 기기별 위계 스케일(px) */
    scale: Record<Device, TypeScale>
  }
  color: {
    /** 프리미티브: 이름 → HEX */
    primitives: Record<string, string>
    /** 시맨틱: 역할 → 프리미티브 이름 (라이트/다크) */
    semantic: Record<Mode, Record<string, string>>
    /** 컴포넌트: 이름 → 시맨틱 역할 */
    components: Record<string, string>
  }
  grid: Record<Device, GridSpec>
  space: {
    /** 기본 단위 4 또는 8 */
    unit: 4 | 8
    /** 간격 스케일(px) */
    scale: number[]
  }
  motion: { fast: number; normal: number; slow: number; easing: string }
}

export const DEFAULT: SysConfig = {
  type: {
    base: 16, lh: 1.6, lhHeading: 1.25, ls: -0.01, maxw: 560, keepAll: true,
    scale: {
      pc: { h1: 40, h2: 28, h3: 22, body: 17, caption: 13 },
      tablet: { h1: 30, h2: 24, h3: 21, body: 17, caption: 14 },
      mobile: { h1: 26, h2: 21, h3: 19, body: 16, caption: 13 },
    },
  },
  color: {
    primitives: {
      'white': '#ffffff', 'gray-50': '#f7f7f5', 'gray-100': '#ededea', 'gray-200': '#dcdcd7', 'gray-300': '#8c8c85', 'gray-400': '#9d9d95',
      'gray-600': '#63635d', 'gray-800': '#2b2b28', 'gray-900': '#111827', 'gray-950': '#0d0d0c',
      'blue-300': '#8ea2ff', 'blue-500': '#3550ee', 'blue-700': '#2a3fbf',
      'red-300': '#ff8787', 'red-600': '#c92a2a', 'green-300': '#38d9a9', 'green-700': '#087f5b', 'orange-600': '#c2410c',
    },
    semantic: {
      light: { bg: 'white', surface: 'gray-50', text: 'gray-900', 'text-sub': 'gray-600', border: 'gray-300', primary: 'blue-500', 'on-primary': 'white', danger: 'red-600', success: 'green-700' },
      dark: { bg: 'gray-950', surface: 'gray-800', text: 'gray-50', 'text-sub': 'gray-400', border: 'gray-600', primary: 'blue-300', 'on-primary': 'gray-950', danger: 'red-300', success: 'green-300' },
    },
    components: {
      'button-primary-bg': 'primary', 'button-primary-text': 'on-primary', 'input-border': 'border',
      'card-bg': 'surface', 'link': 'primary', 'error-text': 'danger',
    },
  },
  grid: {
    pc: { cols: 12, gutter: 24, margin: 40, maxw: 1200 },
    tablet: { cols: 8, gutter: 16, margin: 32, maxw: 0 },
    mobile: { cols: 4, gutter: 16, margin: 16, maxw: 0 },
  },
  space: { unit: 4, scale: [4, 8, 12, 16, 24, 32, 48, 64] },
  motion: { fast: 150, normal: 250, slow: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
}

/* ---------- 링크 공유: 기본값과 다른 부분만 base64url 로 ---------- */
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
function diff(a: unknown, b: unknown): unknown {
  if (isObj(a) && isObj(b)) {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(a)) { const d = diff(a[k], b[k]); if (d !== undefined) out[k] = d }
    return Object.keys(out).length ? out : undefined
  }
  return JSON.stringify(a) === JSON.stringify(b) ? undefined : a
}
function merge<T>(base: T, patch: unknown): T {
  if (!isObj(base) || !isObj(patch)) return (patch === undefined ? base : patch) as T
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const k of Object.keys(patch)) out[k] = merge((base as Record<string, unknown>)[k], patch[k])
  return out as T
}
export const encodeConfig = (c: SysConfig) => { const d = diff(c, DEFAULT); return d ? b64(JSON.stringify(d)) : '' }
export function decodeConfig(s: string | null): SysConfig {
  if (!s) return DEFAULT
  try { return merge(DEFAULT, JSON.parse(unb64(s))) } catch { return DEFAULT }
}

/* ---------- 컨텍스트 ---------- */
interface SysCtx {
  config: SysConfig
  /** 일부만 고치기: update(c => ({ ...c, type: { ...c.type, base: 17 } })) */
  update: (fn: (c: SysConfig) => SysConfig) => void
  reset: () => void
  /** 미리보기 모드(라이트/다크) — 컬러 탭 등에서 사용 */
  mode: Mode
  setMode: (m: Mode) => void
  /** 현재 설정이 담긴 공유 링크 */
  shareUrl: () => string
}
const Ctx = createContext<SysCtx | null>(null)

export function SysProvider({ tab, children }: { tab: string; children: ReactNode }) {
  const [config, setConfig] = useState<SysConfig>(() => decodeConfig(new URLSearchParams(location.hash.split('?')[1] ?? '').get('s')))
  const [mode, setMode] = useState<Mode>('light')
  const update = useCallback((fn: (c: SysConfig) => SysConfig) => setConfig(fn), [])
  const reset = useCallback(() => setConfig(DEFAULT), [])
  const shareUrl = useCallback(() => {
    const s = encodeConfig(config)
    return `${location.origin}${location.pathname}#/system/${tab}${s ? '?s=' + s : ''}`
  }, [config, tab])
  // 주소창도 현재 설정으로 유지
  useEffect(() => {
    const t = setTimeout(() => {
      const s = encodeConfig(config)
      history.replaceState(null, '', `#/system/${tab}${s ? '?s=' + s : ''}`)
    }, 300)
    return () => clearTimeout(t)
  }, [config, tab])
  const value = useMemo(() => ({ config, update, reset, mode, setMode, shareUrl }), [config, update, reset, mode, shareUrl])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSys() {
  const c = useContext(Ctx)
  if (!c) throw new Error('SysProvider missing')
  return c
}

/** 시맨틱 역할 → 실제 HEX */
export const resolveSemantic = (c: SysConfig, mode: Mode, role: string) => c.color.primitives[c.color.semantic[mode][role]] ?? '#ff00ff'
/** 컴포넌트 토큰 → 실제 HEX */
export const resolveComponent = (c: SysConfig, mode: Mode, name: string) => resolveSemantic(c, mode, c.color.components[name])
