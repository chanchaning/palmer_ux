/* 00 한눈에 보기 — 100가지 함정을 증상으로 찾아요 */
import { useMemo, useState } from 'react'
import { Seg } from '../../components/ui'
import { DEV_TABS } from '../DevPage'
import { DEV_ITEMS, SEV_LABEL, type Sev, type Tag } from '../items'
import { TabIntro } from '../ui'

const TAGS: Tag[] = ['React', 'Vue', 'Angular', '공통', '모바일', '보안']
const norm = (s: string) => s.toLowerCase().replace(/\s/g, '')

export default function MapTab() {
  const [q, setQ] = useState('')
  const [sev, setSev] = useState<Sev | 'all'>('all')
  const [tags, setTags] = useState<Tag[]>([])
  const list = useMemo(() => {
    const k = norm(q)
    return DEV_ITEMS.filter(i =>
      (sev === 'all' || i.sev === sev) &&
      (!tags.length || tags.some(t => i.tags.includes(t))) &&
      (!k || norm(i.title + i.symptom).includes(k)))
  }, [q, sev, tags])
  const count = (s: Sev) => DEV_ITEMS.filter(i => i.sev === s).length

  return (
    <div className="dv-map">
      <TabIntro>
        버그 이름을 몰라도 괜찮아요. <b>사용자가 본 증상</b>으로 찾으면 돼요. 각 항목은 <b>문제를 직접 재현해 보고 → 원인을 이해하고 → 바로 고치기 · 근본 대책 · 재발 방지</b> 순서로 정리돼 있어요.
      </TabIntro>
      <div className="dv-map-tools">
        <input className="dv-map-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="증상으로 찾기 — 예: 새로고침, 두 번, 하얀 화면" aria-label="증상으로 찾기" />
        <Seg value={sev} onChange={setSev} options={[['all', `전체 ${DEV_ITEMS.length}`], ['high', `${SEV_LABEL.high} ${count('high')}`], ['mid', `${SEV_LABEL.mid} ${count('mid')}`], ['low', `${SEV_LABEL.low} ${count('low')}`]]} />
        <div className="chips" role="group" aria-label="프레임워크·환경">
          {TAGS.map(t => (
            <button key={t} type="button" className="chip" aria-pressed={tags.includes(t)}
              onClick={() => setTags(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t]))}>{t}</button>
          ))}
        </div>
      </div>
      <p className="dv-map-count" aria-live="polite">{list.length}개 항목</p>
      {DEV_TABS.filter(t => t.id !== 'map').map(t => {
        const rows = list.filter(i => i.tab === t.id)
        if (!rows.length) return null
        return (
          <section className="dv-map-group" key={t.id}>
            <h3><a href={'#/dev/' + t.id}><span>{t.num}</span>{t.name}</a></h3>
            <ul>
              {rows.map(i => (
                <li key={i.id}>
                  <a href={`#/dev/${i.tab}/${i.id}`} className={'sev-' + i.sev}>
                    <span className={'dv-sev ' + i.sev}>{SEV_LABEL[i.sev]}</span>
                    <b>{i.symptom}</b>
                    <small>{i.title} · {i.tags.join(' · ')}</small>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
