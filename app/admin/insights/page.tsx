'use client'

import React, { useEffect, useState } from 'react'
import {
  getQuestionsPerDay,
  getQuestionsPerWeek,
  getIndustryMetrics,
  getActivityHeatmap,
  getComplianceScore,
} from '@/lib/admin/analytics-service'
import { ChartContainer, LineChartWidget, BarChartWidget, AreaChartWidget, PieChartWidget, ChartSkeleton, TrendIndicator } from '../components/chart-container'
import {
  CalendarDays,
  Layers,
  TrendingUp,
  BarChart3,
} from 'lucide-react'

export default function NationalInsightsPage() {
  const [daily, setDaily] = useState<any[]>([])
  const [weekly, setWeekly] = useState<any[]>([])
  const [industries, setIndustries] = useState<any[]>([])
  const [heatmap, setHeatmap] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [dailyData, weeklyData, indData, heatData, compData] = await Promise.all([
          getQuestionsPerDay(30),
          getQuestionsPerWeek(12),
          getIndustryMetrics(),
          getActivityHeatmap(),
          getComplianceScore(),
        ])
        setDaily(dailyData)
        setWeekly(weeklyData)
        setIndustries(indData)
        setHeatmap(heatData)
        setCompliance(compData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">National Compliance Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Aggregated, anonymised analytics on nationwide data protection awareness</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height={280} />
          <ChartSkeleton height={280} />
          <ChartSkeleton height={280} />
          <ChartSkeleton height={280} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Questions Per Day" subtitle="Daily user questions over the last 30 days">
              <AreaChartWidget
                data={daily}
                areas={[{ dataKey: 'value', color: 'hsl(var(--primary))', name: 'Questions' }]}
                height={280}
              />
            </ChartContainer>

            <ChartContainer title="Questions Per Week" subtitle="Weekly trend over the last 12 weeks">
              <BarChartWidget
                data={weekly.map(w => ({ name: w.date.slice(5), value: w.value }))}
                height={280}
              />
            </ChartContainer>

            <ChartContainer title="Industry Usage Distribution" subtitle="Breakdown by sector">
              <PieChartWidget
                data={industries.map(i => ({ name: i.industry, value: i.percentage }))}
                innerRadius={50}
                outerRadius={100}
                showLegend
                height={320}
              />
            </ChartContainer>

            <ChartContainer title="Industry Compliance Scores" subtitle="Estimated compliance maturity by sector">
              <BarChartWidget
                data={compliance?.byIndustry?.map((i: any) => ({ name: i.industry, value: i.score })) || []}
                horizontal
                height={320}
              />
            </ChartContainer>
          </div>

          <ChartContainer title="Activity Heatmap by Industry" subtitle="Daily activity levels across sectors (last 7 days)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-muted-foreground font-medium p-2">Industry</th>
                    {heatmap[0]?.days?.map((d: any, i: number) => (
                      <th key={i} className="text-center text-muted-foreground font-medium p-2">
                        {new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row: any) => (
                    <tr key={row.industry} className="border-t border-border">
                      <td className="text-foreground font-medium p-2 whitespace-nowrap">{row.industry}</td>
                      {row.days.map((d: any, i: number) => {
                        const intensity = Math.min(d.value / 30, 1)
                        return (
                          <td key={i} className="text-center p-2">
                            <div
                              className="w-8 h-8 mx-auto rounded flex items-center justify-center text-[10px] font-medium"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity * 0.8 + 0.1})`,
                                color: intensity > 0.5 ? 'white' : 'hsl(var(--foreground))',
                              }}
                            >
                              {d.value}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>

          {compliance && (
            <ChartContainer title="Compliance Score Trend" subtitle="Estimated national compliance maturity over time">
              <LineChartWidget
                data={compliance.trend}
                lines={[{ dataKey: 'value', color: '#10b981', name: 'Compliance Score' }]}
                height={250}
              />
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>Improvement: <TrendIndicator value={compliance.improvement} /></span>
                <span>Confidence: {compliance.confidence}%</span>
                <span className="text-yellow-500">⚠️ This is an estimated score based on usage patterns</span>
              </div>
            </ChartContainer>
          )}
        </>
      )}
    </div>
  )
}
