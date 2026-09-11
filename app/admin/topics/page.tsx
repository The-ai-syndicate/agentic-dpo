'use client'

import React, { useEffect, useState } from 'react'
import {
  getTopicMetrics,
  getEmergingTopics,
  getKnowledgeGaps,
  getConfusionMetrics,
} from '@/lib/admin/analytics-service'
import type { TopicMetric, EmergingTopic, KnowledgeGap, ConfusionMetric } from '@/lib/admin/types'
import { ChartContainer, LineChartWidget, BarChartWidget, ChartSkeleton, TrendIndicator, SeverityBadge } from '../components/chart-container'
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Search } from 'lucide-react'

export default function TopicsPage() {
  const [topics, setTopics] = useState<TopicMetric[]>([])
  const [emerging, setEmerging] = useState<EmergingTopic[]>([])
  const [gaps, setGaps] = useState<KnowledgeGap[]>([])
  const [confusion, setConfusion] = useState<ConfusionMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [topicData, emergingData, gapsData, confusionData] = await Promise.all([
          getTopicMetrics(),
          getEmergingTopics(),
          getKnowledgeGaps(),
          getConfusionMetrics(),
        ])
        setTopics(topicData)
        setEmerging(emergingData)
        setGaps(gapsData)
        setConfusion(confusionData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sortedByCount = [...topics].sort((a, b) => b.count - a.count)
  const fastestGrowing = [...topics].sort((a, b) => b.growth - a.growth).slice(0, 5)
  const declining = [...topics].sort((a, b) => a.growth - b.growth).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Topic Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Automatically classified question categories and emerging trends</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
          <ChartSkeleton height={250} />
          <ChartSkeleton height={250} />
        </div>
      ) : (
        <>
          {/* Topic Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Categories</p>
              <p className="text-2xl font-bold text-foreground">{topics.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Fastest Growing</p>
              <p className="text-lg font-bold text-green-500">{fastestGrowing[0]?.topic || 'N/A'} <TrendIndicator value={fastestGrowing[0]?.growth || 0} /></p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Most Asked</p>
              <p className="text-lg font-bold text-foreground">{sortedByCount[0]?.topic || 'N/A'} ({sortedByCount[0]?.count || 0})</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Top Topics" subtitle="Highest volume question categories">
              <BarChartWidget
                data={sortedByCount.slice(0, 12).map(t => ({ name: t.topic, value: t.count }))}
                horizontal
                height={400}
              />
            </ChartContainer>

            <ChartContainer title="Fastest Growing Topics" subtitle="Highest growth rate">
              <div className="space-y-3">
                {fastestGrowing.map(topic => (
                  <div key={topic.topic} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-foreground">{topic.topic}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-green-500">+{topic.growth}%</span>
                      <span className="text-xs text-muted-foreground ml-2">({topic.count} qns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartContainer>

            <ChartContainer title="Declining Topics" subtitle="Decreasing interest categories">
              <div className="space-y-3">
                {declining.map(topic => (
                  <div key={topic.topic} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-foreground">{topic.topic}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-red-500">{topic.growth}%</span>
                      <span className="text-xs text-muted-foreground ml-2">({topic.count} qns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartContainer>

            <ChartContainer title="Weekly Topic Trend" subtitle="Sample: Data Breach, Consent, AI">
              <LineChartWidget
                data={topics.slice(0, 3).flatMap(t => t.weeklyData.map(d => ({ ...d, topic: t.topic }))).slice(0, 21)}
                lines={[
                  { dataKey: 'value', color: '#ef4444', name: 'Data Breach' },
                ]}
                height={250}
              />
              <p className="text-xs text-muted-foreground mt-2">Detailed trend data available for each topic category</p>
            </ChartContainer>
          </div>

          {/* Emerging Topics */}
          <ChartContainer title="🚀 Emerging Topics" subtitle="AI-discovered new discussion themes">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-medium p-3">Topic</th>
                    <th className="text-right text-muted-foreground font-medium p-3">Growth</th>
                    <th className="text-right text-muted-foreground font-medium p-3">Questions</th>
                    <th className="text-left text-muted-foreground font-medium p-3">Industries</th>
                    <th className="text-right text-muted-foreground font-medium p-3">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {emerging.map(topic => (
                    <tr key={topic.topic} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{topic.topic}</td>
                      <td className="p-3 text-right">
                        <span className="text-green-500 font-semibold">+{topic.growthPercentage}%</span>
                      </td>
                      <td className="p-3 text-right text-foreground">{topic.questionsCount}</td>
                      <td className="p-3 text-muted-foreground">
                        <div className="flex gap-1 flex-wrap">
                          {topic.industries.map(ind => (
                            <span key={ind} className="text-xs bg-muted px-2 py-0.5 rounded-full">{ind}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center gap-1 text-green-500 text-xs">
                          ↑ <TrendIndicator value={topic.growthPercentage} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>

          {/* Confusion Detection */}
          <ChartContainer title="🤔 Confusion Detection" subtitle="Sections of the Act generating the most confusion">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-medium p-3">Legal Section</th>
                    <th className="text-right text-muted-foreground font-medium p-3">Confusion Score</th>
                    <th className="text-right text-muted-foreground font-medium p-3">Questions</th>
                    <th className="text-left text-muted-foreground font-medium p-3">Example Questions</th>
                    <th className="text-left text-muted-foreground font-medium p-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {confusion.map(item => (
                    <tr key={item.section} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{item.section}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.confusionScore >= 75 ? 'bg-red-500' :
                                item.confusionScore >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${item.confusionScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{item.confusionScore}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-foreground">{item.questionCount}</td>
                      <td className="p-3 text-muted-foreground text-xs max-w-md">
                        <ul className="list-disc list-inside space-y-1">
                          {item.exampleQuestions.slice(0, 2).map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs">{item.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>

          {/* Knowledge Gaps */}
          <ChartContainer title="📚 Knowledge Gap Detection" subtitle="Topics where users need more guidance">
            <div className="space-y-3">
              {gaps.map(gap => (
                <div key={gap.topic} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{gap.topic}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {gap.frequency} occurrences
                      </span>
                      <SeverityBadge severity={gap.recommendedType === 'guidance' ? 'medium' : gap.recommendedType === 'training' ? 'high' : 'low'} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: Create <span className="font-medium text-primary">{gap.recommendedType}</span>
                    </p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {gap.exampleQuestions.slice(0, 2).map((q, i) => (
                        <span key={i} className="text-[10px] bg-muted/50 px-2 py-0.5 rounded text-muted-foreground">
                          "{q}"
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartContainer>
        </>
      )}
    </div>
  )
}
