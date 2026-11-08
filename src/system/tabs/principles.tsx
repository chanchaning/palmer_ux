import { guides } from '../../guides/registry'
import { Note, Section, SysGrid } from '../ui'

/** 실무 체크 질문 (카드 id → 한 줄) */
const CHECK: Record<string, string> = {
  'laws-jakob': '로고·검색·장바구니가 사람들이 기대하는 자리에 있나요?',
  'laws-miller': '외워야 하는 정보를 3~4개 덩어리로 끊었나요?',
  'laws-hick': '한 화면의 선택지를 줄이거나 추천을 먼저 보여주나요?',
  'laws-fitts': '핵심 버튼이 크고, 엄지가 닿는 곳에 있나요?',
  'laws-doherty': '0.4초 안에 반응하거나, 그보다 늦으면 진행 표시가 있나요?',
  'laws-peak': '가장 힘든 순간을 줄이고 마지막을 기분 좋게 끝내나요?',
  'laws-postel': '사용자가 어떤 형식으로 입력해도 알아듣나요?',
  'bias-anchor': '처음 보여주는 숫자가 판단의 기준이 된다는 걸 알고 배치했나요?',
  'bias-loss': '“얻는다”보다 “잃는다”가 더 크게 느껴져요 — 과장하진 않았나요?',
  'bias-default': '기본값이 사용자에게 가장 이로운 선택인가요?',
  'bias-social': '보여주는 숫자와 후기가 사실인가요?',
  'bias-scarcity': '“얼마 안 남음”이 진짜 재고인가요?',
  'bias-framing': '같은 사실을 공정하게 표현했나요?',
  'bias-choice': '선택지를 3~5개로 좁히고 추천을 표시했나요?',
  'bias-peak': '마지막 화면이 경험 전체의 인상을 정해요.',
  'bias-zeig': '진행률로 “조금만 더”를 보여주되 강요하진 않나요?',
}

function Table({ guideId }: { guideId: string }) {
  const g = guides.find(x => x.id === guideId)
  if (!g) return null
  return (
    <div className="sys-table-wrap">
      <table className="sys-table">
        <thead><tr><th style={{ width: '22%' }}>이름</th><th>한 줄 정의</th><th style={{ width: '34%' }}>실무 체크</th></tr></thead>
        <tbody>
          {g.cards.map(c => (
            <tr key={c.id}>
              <td><a href={`#/${g.id}/${c.id}`}>{c.title} →</a></td>
              <td>{c.desc}</td>
              <td>{CHECK[c.id] ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Principles() {
  return (
    <SysGrid>
      <Section id="sys-laws" wide title="UX 법칙 7가지" desc="사람의 기대·기억·결정·손의 움직임·감정에 대한 규칙이에요. 이름을 누르면 직접 실험해 볼 수 있는 카드로 이동해요.">
        <Table guideId="laws" />
      </Section>
      <Section id="sys-bias" wide title="심리 편향 9가지" desc="사람이 결정하는 방식의 지름길이에요. 좋은 설계에도, 속이는 설계(다크 패턴)에도 쓰여요.">
        <Table guideId="bias" />
        <Note tone="warn"><b>선을 넘으면 다크 패턴이에요.</b> 편향을 쓰기 전에 “사용자가 알았어도 같은 선택을 했을까?”를 물어보세요. <a href="#/darkpattern">다크 패턴 가이드 보기 →</a></Note>
      </Section>
    </SysGrid>
  )
}
