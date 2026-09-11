'use client'

import React, { useEffect, useState } from 'react'
import { getIndustryMetrics, getComplianceScore } from '@/lib/admin/analytics-service'
import type { IndustryMetric } from '@/lib/admin/types'
import { ChartContainer, BarChartWidget, PieChartWidget, ChartSkeleton } from '../components/chart-container'
import { Building2, TrendingUp, AlertTriangle, FileText, Shield } from 'lucide-react'

export default function IndustryPage() {
  const [industries, setIndustries] = useState<IndustryMetric[]>([])
  const [compliance, setCompliance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [indData, compData] = await Promise.all([
          getIndustryMetrics(),
          getComplianceScore(),
        ])
        setIndustries(indData)
        setCompliance(compData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sorted = [...industries].sort((a, b) => b.questions - a.questions)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Industry Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Sector-level breakdown of data protection awareness and compliance</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Questions by Industry" subtitle="Total questions per sector">
              <BarChartWidget
                data={sorted.map(i => ({ name: i.industry, value: i.questions }))}
                horizontal
                height={400}
              />
            </ChartContainer>

            <ChartContainer title="Average Compliance Score by Industry" subtitle="Estimated maturity based on usage patterns">
              <BarChartWidget
                data={industries.map(i => ({ name: i.industry, value: i.averageComplianceScore }))}
                horizontal
                height={400}
              />
            </ChartContainer>
          </div>

          {/* Industry Detail Cards */}
          <h2 className="text-lg font-semibold text-foreground mt-4">Sector Deep Dive</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map(ind => (
              <div key={ind.industry} className="bg-card border border-border rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">{ind.industry}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {ind.percentage}% of total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Questions</p>
                    <p className="text-lg font-bold text-foreground">{ind.questions.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Compliance Score</p>
                    <p className="text-lg font-bold text-foreground">{ind.averageComplianceScore}%</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Top Concerns</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {ind.topConcerns.map(concern => (
                        <span key={concern} className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[10px]">
                          {concern}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <FileText className="w-3 h-3" />
                      <span>Common Documents</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {ind.commonDocuments.map(doc => (
                        <span key={doc} className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full text-[10px]">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Common Risks</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {ind.commonRisks.map(risk => (
                        <span key={risk} className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full text-[10px]">
                          {risk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
