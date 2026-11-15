import './chart.css'
import { BarChart, DonutChart, LineChart } from './cards/basic'
import { Gauge, GoalRing, Sparkline } from './cards/compact'
import { Heatmap, KpiCard, StackedBar } from './cards/dense'

/** GUIDE 27 — 차트 */
export default function ChartGuide() {
  return (
    <div className="grid trans">
      <BarChart />
      <LineChart />
      <DonutChart />
      <Sparkline />
      <Gauge />
      <GoalRing />
      <Heatmap />
      <KpiCard />
      <StackedBar />
    </div>
  )
}
