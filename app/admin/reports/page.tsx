'use client'

import React, { useEffect, useState } from 'react'
import { getReports, getKPI, getQuestionsPerDay, getTopicMetrics, getEarlyWarnings, getComplianceScore } from '@/lib/admin/analytics-service'
import type { Report, KPIState } from '@/lib/admin/types'
import { ChartContainer, TrendIndicator, SeverityBadge } from '../components/chart-container'
import { FileText, Download, Calendar, BarChart3, TrendingUp, AlertTriangle, Shield, Building2, ChevronDown, Loader2 } from 'lucide-react'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [kpi, setKpi] = useState<KPIState | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [reportData, kpiData] = await Promise.all([
          getReports(),
          getKPI(),
        ])
        setReports(reportData)
        setKpi(kpiData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleGenerate = async (type: string) => {
    setGenerating(type)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setGenerating(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">📊 Ministry Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate downloadable intelligence reports with charts, insights, and recommendations</p>
      </div>

      {/* Quick Generate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { type: 'weekly', label: 'Weekly Report', icon: Calendar, desc: 'Last 7 days intelligence' },
          { type: 'monthly', label: 'Monthly Report', icon: BarChart3, desc: 'Monthly compliance trends' },
          { type: 'quarterly', label: 'Quarterly Report', icon: TrendingUp, desc: 'Quarterly landscape analysis' },
          { type: 'annual', label: 'Annual Report', icon: Shield, desc: 'Full year national overview' },
        ].map(item => (
          <button
            key={item.type}
            onClick={() => handleGenerate(item.type)}
            disabled={generating !== null}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-3">
              <item.icon className="w-5 h-5 text-primary" />
              {generating === item.type ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Report Summary Preview */}
      {kpi && (
        <ChartContainer title="Current Period Overview" subtitle="Data that will be included in your reports">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Total Questions</p>
              <p className="text-lg font-bold text-foreground">{kpi.totalQuestions.toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Active Orgs</p>
              <p className="text-lg font-bold text-foreground">{kpi.activeOrganisations}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Avg Confidence</p>
              <p className="text-lg font-bold text-foreground">{kpi.averageConfidence}%</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Monthly Trend</p>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-foreground">{kpi.trendVsPreviousMonth}%</span>
                <TrendIndicator value={kpi.trendVsPreviousMonth} />
              </div>
            </div>
          </div>
        </ChartContainer>
      )}

      {/* Existing Reports */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Generated Reports</h2>
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-card border border-border rounded-xl p-4 md:p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={report.type === 'weekly' ? 'info' : report.type === 'monthly' ? 'medium' : report.type === 'quarterly' ? 'high' : 'critical'} />
                      <span className="text-xs text-muted-foreground">{report.period}</span>
                      <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Ready</span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground mt-2">{report.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{report.summary}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Generated {new Date(report.generatedAt).toLocaleDateString()} at {new Date(report.generatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report Contents Info */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Report Contents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Charts and visualisations
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Emerging trends analysis
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            High-risk topic detection
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Knowledge gap identification
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Industry sector analysis
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            AI observations & recommendations
          </div>
        </div>
      </div>
    </div>
  )
}
