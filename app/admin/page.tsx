'use client'

import React, { useEffect, useState } from 'react'
import {
  getKPI,
  getQuestionsPerDay,
  getIndustryMetrics,
  getTopicMetrics,
  getEarlyWarnings,
  getActivityFeed,
  getNotifications,
  getComplianceScore,
  getRecommendations,
} from '@/lib/admin/analytics-service'
import type { KPIState, IndustryMetric, TopicMetric, Alert, ActivityEvent, Notification } from '@/lib/admin/types'
import { KPICard, ChartContainer, LineChartWidget, BarChartWidget, PieChartWidget, SeverityBadge, TrendIndicator, StatCard } from './components/chart-container'
import {
  MessageSquare,
  Users,
  Clock,
  FileText,
  Shield,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Building2,
  Activity,
  Zap,
  BarChart3,
  CheckCircle,
  HelpCircle,
  Globe,
  Database,
  Eye,
  FileSearch,
} from 'lucide-react'

export default function AdminDashboard() {
  const [kpi, setKpi] = useState<KPIState | null>(null)
  const [dailyData, setDailyData] = useState<{ date: string; value: number }[]>([])
  const [industries, setIndustries] = useState<IndustryMetric[]>([])
  const [topics, setTopics] = useState<TopicMetric[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [compliance, setCompliance] = useState<{ overall: number; byIndustry: { industry: string; score: number }[] } | null>(null)
  const [recommendations, setRecommendations] = useState<{ recommendation: string; reasoning: string; priority: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [
          kpiData, daily, indData, topicData, alertData,
          activityData, notifData, compData, recData
        ] = await Promise.all([
          getKPI(),
          getQuestionsPerDay(30),
          getIndustryMetrics(),
          getTopicMetrics(),
          getEarlyWarnings(),
          getActivityFeed(8),
          getNotifications(),
          getComplianceScore(),
          getRecommendations(),
        ])
        setKpi(kpiData)
        setDailyData(daily)
        setIndustries(indData)
        setTopics(topicData)
        setAlerts(alertData)
        setActivity(activityData)
        setNotifications(notifData)
        setCompliance(compData)
        setRecommendations(recData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const unreadNotifications = notifications.filter(n => !n.read)

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ministry Intelligence Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading national compliance analytics...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 md:p-6 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-7 w-24 bg-muted rounded mb-2" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6 animate-pulse h-[300px]">
            <div className="h-3 w-32 bg-muted rounded mb-4" />
            <div className="h-[250px] bg-muted/50 rounded" />
          </div>
          <div className="bg-card border border-border rounded-xl p-6 animate-pulse h-[300px]">
            <div className="h-3 w-32 bg-muted rounded mb-4" />
            <div className="h-[250px] bg-muted/50 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ministry Intelligence Dashboard</h1>
            {unreadNotifications.length > 0 && (
              <span className="bg-red-500/10 text-red-500 text-xs font-medium px-2 py-0.5 rounded-full border border-red-500/20">
                {unreadNotifications.length} new
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            National Privacy Intelligence Platform — Botswana Data Protection Authority
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Priority Alerts Strip */}
      {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-500">Active Alerts Requiring Attention</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 3).map(alert => (
              <span key={alert.id} className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 text-muted-foreground">
                <SeverityBadge severity={alert.severity} /> {alert.topic}: {alert.increasePercentage}% increase
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            title="Total Questions"
            value={kpi?.totalQuestions?.toLocaleString() || '0'}
            change={kpi?.trendVsPreviousMonth}
            trend="up"
            icon={<MessageSquare className="w-4 h-4" />}
            subtitle={`Previous: ${(kpi?.previousTotalQuestions || 0).toLocaleString()}`}
          />
          <KPICard
            title="Today's Questions"
            value={kpi?.todayQuestions || 0}
            icon={<Zap className="w-4 h-4" />}
          />
          <KPICard
            title="This Week"
            value={kpi?.weekQuestions || 0}
            icon={<Activity className="w-4 h-4" />}
          />
          <KPICard
            title="Active Organisations"
            value={kpi?.activeOrganisations || 0}
            icon={<Users className="w-4 h-4" />}
            subtitle="Unique sessions"
          />
          <KPICard
            title="Returning Organisations"
            value={kpi?.returningOrganisations || 0}
            icon={<Users className="w-4 h-4" />}
            subtitle="Repeat users"
          />
          <KPICard
            title="Avg Confidence"
            value={`${kpi?.averageConfidence || 0}%`}
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <KPICard
            title="Avg Response Time"
            value={`${kpi?.averageResponseTime || 0}s`}
            icon={<Clock className="w-4 h-4" />}
          />
          <KPICard
            title="Documents Reviewed"
            value={kpi?.totalDocumentsReviewed || 0}
            icon={<FileText className="w-4 h-4" />}
          />
          <KPICard
            title="Policies Generated"
            value={kpi?.policiesGenerated || 0}
            icon={<FileSearch className="w-4 h-4" />}
          />
          <KPICard
            title="Compliance Reports"
            value={kpi?.complianceReportsGenerated || 0}
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <KPICard
            title="Breach Assessments"
            value={kpi?.breachAssessmentsGenerated || 0}
            icon={<Shield className="w-4 h-4" />}
          />
          <KPICard
            title="Top Industry"
            value={kpi?.topIndustry || 'N/A'}
            icon={<Building2 className="w-4 h-4" />}
          />
          <KPICard
            title="Most Viewed Section"
            value={kpi?.mostViewedLegalSection?.split('—')[0]?.trim() || 'N/A'}
            icon={<BookOpen className="w-4 h-4" />}
          />
          <KPICard
            title="Most Asked Topic"
            value={kpi?.mostAskedTopic || 'N/A'}
            icon={<HelpCircle className="w-4 h-4" />}
          />
          <KPICard
            title="Most Asked Regulation"
            value={kpi?.mostAskedRegulation || 'N/A'}
            icon={<Globe className="w-4 h-4" />}
          />
          <KPICard
            title="Monthly Trend"
            value={`${kpi?.trendVsPreviousMonth || 0}%`}
            change={kpi?.trendVsPreviousMonth}
            trend={kpi && kpi.trendVsPreviousMonth >= 0 ? 'up' : 'down'}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Questions Per Day" subtitle="Last 30 days">
          <LineChartWidget
            data={dailyData}
            lines={[{ dataKey: 'value', color: 'hsl(var(--primary))', name: 'Questions' }]}
          />
        </ChartContainer>

        <ChartContainer title="Industry Distribution" subtitle="Percentage of total usage">
          <PieChartWidget
            data={industries.map(ind => ({ name: ind.industry, value: ind.questions }))}
            innerRadius={50}
            outerRadius={90}
          />
        </ChartContainer>
      </div>

      {/* National Compliance Score */}
      {compliance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="National Compliance Score" subtitle={`Estimated maturity: ${compliance.overall}% — Based on aggregated usage patterns`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke={compliance.overall >= 70 ? '#10b981' : compliance.overall >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 45 * compliance.overall / 100} ${2 * Math.PI * 45 * (100 - compliance.overall) / 100}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{compliance.overall}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This score is an <strong>estimate</strong> based on anonymised platform usage patterns and should not be taken as a legal determination of compliance.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Confidence: {compliance.confidence}%</span>
                  <span>•</span>
                  <TrendIndicator value={compliance.improvement} label="vs last month" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {compliance.byIndustry.slice(0, 12).map(item => (
                <div key={item.industry} className="bg-muted/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground truncate">{item.industry}</p>
                  <p className="text-sm font-semibold text-foreground">{item.score}%</p>
                </div>
              ))}
            </div>
          </ChartContainer>

          {/* Top Topics */}
          <ChartContainer title="Top Topics by Volume" subtitle="Most asked categories">
            <BarChartWidget
              data={topics.sort((a, b) => b.count - a.count).slice(0, 10).map(t => ({ name: t.topic, value: t.count }))}
              horizontal
              height={300}
            />
          </ChartContainer>
        </div>
      )}

      {/* Early Warning Summary */}
      <ChartContainer title="⚠️ Early Warning Summary" subtitle="Anomalous topic increases detected in real-time">
        <div className="space-y-3">
          {alerts.slice(0, 4).map(alert => (
            <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex-shrink-0 mt-0.5">
                <SeverityBadge severity={alert.severity} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{alert.topic}</span>
                  <span className="text-xs text-muted-foreground">+{alert.increasePercentage}%</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{alert.questionsCount} questions</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{alert.timePeriod}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{alert.recommendedAction}</p>
              </div>
              <div className="flex-shrink-0 w-20 h-10">
                <LineChartWidget
                  data={alert.trendData}
                  lines={[{ dataKey: 'value', color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#f59e0b' }]}
                  height={40}
                  showGrid={false}
                  showTooltip={false}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* AI Recommendations */}
      <ChartContainer title="🧠 AI Recommendations" subtitle="Automated suggestions for Ministry action">
        <div className="space-y-3">
          {recommendations.slice(0, 5).map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                rec.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                rec.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                <span className="text-xs font-bold">
                  {rec.priority === 'high' ? '!' : rec.priority === 'medium' ? '→' : '·'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{rec.recommendation}</p>
                <p className="text-xs text-muted-foreground mt-1">{rec.reasoning}</p>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Activity Feed & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="📡 Live Activity Feed" subtitle="Anonymised events — No personal data displayed">
          <div className="space-y-2">
            {activity.map(event => (
              <div key={event.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  event.category === 'document' ? 'bg-blue-500' :
                  event.category === 'question' ? 'bg-primary' :
                  event.category === 'report' ? 'bg-green-500' :
                  event.category === 'training' ? 'bg-purple-500' :
                  'bg-yellow-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{event.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()} — {event.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>

        <ChartContainer title="🔔 Notifications" subtitle="Alerts and updates for Ministry Admin">
          <div className="space-y-2">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  !notif.read ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-transparent'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <SeverityBadge severity={notif.severity as any} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {!notif.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-6 border-t border-border">
        <p>Ministry Intelligence Dashboard — Botswana Data Protection Authority</p>
        <p className="mt-1">All analytics are aggregated and anonymised. No personal data or organisation names are displayed.</p>
      </div>
    </div>
  )
}
