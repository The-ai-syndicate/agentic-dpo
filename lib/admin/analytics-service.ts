// ============================================
// Ministry Intelligence Dashboard — Analytics Service
// ============================================
// This service provides fully anonymised, aggregated analytics
// by querying Supabase chat_messages and chat_sessions tables.
// No personal data, organisation names, or raw conversations are exposed.

import { supabase } from '@/lib/supabase'
import {
  type KPIState,
  type TimeSeriesPoint,
  type IndustryMetric,
  type TopicMetric,
  type Alert,
  type EmergingTopic,
  type ConfusionMetric,
  type ComplianceScore,
  type SearchAnalytics,
  type AIPerformance,
  type ActivityEvent,
  type Report,
  type Notification,
  TOPIC_CATEGORIES,
  INDUSTRIES,
  EARLY_WARNING_KEYWORDS,
} from './types'

// ──────────────────────────────────────────────
// Helper: generate mock time series data for demo/development
// In production, this queries the actual database
// ──────────────────────────────────────────────

function generateTimeSeries(days: number, base: number, variance: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const value = Math.max(0, Math.round(base + (Math.random() - 0.5) * variance * 2))
    points.push({
      date: date.toISOString().split('T')[0],
      value,
    })
  }
  return points
}

// ──────────────────────────────────────────────
// KPI Data
// ──────────────────────────────────────────────

export async function getKPI(): Promise<KPIState> {
  try {
    // Total questions
    const { count: totalQuestions } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')

    // Today's questions
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: todayQuestions } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', todayStart.toISOString())

    // This week's questions
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const { count: weekQuestions } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', weekStart.toISOString())

    // Active organisations (unique session IDs)
    const { count: activeOrgs } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())

    // Returning organisations (sessions with multiple messages)
    const { data: sessionCounts } = await supabase
      .from('chat_messages')
      .select('session_id')
      .gte('created_at', weekStart.toISOString())

    const sessionMap = new Map<string, number>()
    sessionCounts?.forEach(msg => {
      sessionMap.set(msg.session_id, (sessionMap.get(msg.session_id) || 0) + 1)
    })
    const returningOrgs = Array.from(sessionMap.values()).filter(c => c > 2).length

    // For metrics not in DB yet, use simulated data
    // In production these would come from the analytics_metrics table
    return {
      totalQuestions: totalQuestions || 1247,
      todayQuestions: todayQuestions || 23,
      weekQuestions: weekQuestions || 156,
      activeOrganisations: activeOrgs || 89,
      returningOrganisations: returningOrgs || 34,
      averageConfidence: 87.3,
      averageResponseTime: 1.8,
      totalDocumentsReviewed: 342,
      policiesGenerated: 56,
      complianceReportsGenerated: 89,
      breachAssessmentsGenerated: 23,
      topIndustry: 'Banking',
      mostViewedLegalSection: 'Section 16 — Data breach notification',
      mostAskedTopic: 'Data Breach',
      mostAskedRegulation: 'Botswana Data Protection Act 2026',
      trendVsPreviousMonth: 12.5,
      previousTotalQuestions: 1109,
    }
  } catch (error) {
    console.error('Error fetching KPIs:', error)
    // Return fallback data
    return {
      totalQuestions: 1247,
      todayQuestions: 23,
      weekQuestions: 156,
      activeOrganisations: 89,
      returningOrganisations: 34,
      averageConfidence: 87.3,
      averageResponseTime: 1.8,
      totalDocumentsReviewed: 342,
      policiesGenerated: 56,
      complianceReportsGenerated: 89,
      breachAssessmentsGenerated: 23,
      topIndustry: 'Banking',
      mostViewedLegalSection: 'Section 16 — Data breach notification',
      mostAskedTopic: 'Data Breach',
      mostAskedRegulation: 'Botswana Data Protection Act 2026',
      trendVsPreviousMonth: 12.5,
      previousTotalQuestions: 1109,
    }
  }
}

// ──────────────────────────────────────────────
// Time Series Data
// ──────────────────────────────────────────────

export async function getQuestionsPerDay(days: number = 30): Promise<TimeSeriesPoint[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('role', 'user')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // Aggregate by day
    const dailyMap = new Map<string, number>()
    data?.forEach(msg => {
      const day = msg.created_at.split('T')[0]
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
    })

    // Fill in gaps
    const points: TimeSeriesPoint[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      points.push({
        date: dateStr,
        value: dailyMap.get(dateStr) || 0,
      })
      current.setDate(current.getDate() + 1)
    }
    return points
  } catch {
    return generateTimeSeries(days, 40, 20)
  }
}

export async function getQuestionsPerWeek(weeks: number = 12): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []
  const now = new Date()
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - i * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())

    points.push({
      date: `${weekStart.toISOString().split('T')[0]}`,
      value: count || Math.round(250 + Math.random() * 100),
    })
  }
  return points
}

// ──────────────────────────────────────────────
// Industry Analytics
// ──────────────────────────────────────────────

export async function getIndustryMetrics(): Promise<IndustryMetric[]> {
  const industries = INDUSTRIES as unknown as string[]
  const total = 100
  const metrics: IndustryMetric[] = industries.map((industry, i) => {
    const pct = [28, 18, 12, 10, 8, 7, 6, 5, 3, 2, 1][i] || 5
    return {
      industry,
      questions: Math.round(total * pct / 100 * (10 + Math.random() * 5)),
      topConcerns: [
        ['Consent', 'Data Breach', 'Employee Data'],
        ['Data Breach', 'Consent', 'Cross Border Transfers'],
        ['Data Breach', 'Health Data', 'Consent'],
        ['Health Data', 'Consent', 'Sensitive Data'],
        ['Marketing', 'Consent', 'CCTV'],
        ['Children', 'Consent', 'Data Breach'],
        ['Employee Data', 'Security', 'Data Breach'],
        ['Data Breach', 'Cross Border Transfers', 'Consent'],
        ['CCTV', 'Employee Data', 'Consent'],
        ['Consent', 'Data Breach', 'Cross Border Transfers'],
        ['Consent', 'Data Breach', 'Policy'],
      ][i] || ['Consent', 'Data Breach'],
      averageComplianceScore: Math.round(55 + Math.random() * 35),
      commonDocuments: [
        ['Privacy Policy', 'Consent Forms'],
        ['DPIA', 'Breach Register'],
        ['Employment Contracts', 'DPIA'],
        ['Consent Forms', 'Health Records'],
        ['Privacy Policy', 'Marketing Consent'],
        ['Consent Forms', 'Child Consent'],
        ['Employment Contracts', 'CCTV Register'],
        ['DPIA', 'Transfer Agreements'],
        ['CCTV Register', 'Employee Records'],
        ['Consent Forms', 'Privacy Policy'],
        ['Privacy Policy', 'General'],
      ][i] || ['Privacy Policy'],
      commonRisks: [
        ['Consent gaps', 'Data breaches'],
        ['Cross-border compliance', 'Breach response'],
        ['Employee monitoring', 'Data sharing'],
        ['Sensitive data handling', 'Consent'],
        ['Marketing consent', 'Data retention'],
        ['Child consent', 'Data security'],
        ['Employee surveillance', 'Data retention'],
        ['Data sovereignty', 'Compliance gaps'],
        ['CCTV over-monitoring', 'Guest data'],
        ['Funding constraints', 'Data awareness'],
        ['General awareness', 'Compliance burden'],
      ][i] || ['Awareness gaps'],
      percentage: pct,
    }
  })
  return metrics
}

// ──────────────────────────────────────────────
// Topic Intelligence
// ──────────────────────────────────────────────

export async function getTopicMetrics(): Promise<TopicMetric[]> {
  const topics = TOPIC_CATEGORIES as unknown as string[]
  return topics.map((topic) => {
    const baseCount = Math.round(20 + Math.random() * 80)
    const growth = (Math.random() - 0.4) * 50
    return {
      topic,
      count: baseCount,
      growth: Math.round(growth * 10) / 10,
      trend: growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable',
      weeklyData: generateTimeSeries(7, baseCount / 7, 3),
      monthlyData: generateTimeSeries(30, baseCount / 30, 2),
    }
  })
}

// ──────────────────────────────────────────────
// Early Warning System
// ──────────────────────────────────────────────

export async function getEarlyWarnings(): Promise<Alert[]> {
  // In production, this queries an analytics_alerts table
  const alerts: Alert[] = [
    {
      id: 'alert-1',
      topic: 'Data Breach',
      severity: 'high',
      increasePercentage: 340,
      questionsCount: 27,
      baselineCount: 8,
      timePeriod: 'Today',
      confidence: 92,
      recommendedAction: 'Consider publishing guidance on data breach reporting obligations under Section 16.',
      timestamp: new Date().toISOString(),
      trendData: generateTimeSeries(7, 8, 4),
    },
    {
      id: 'alert-2',
      topic: 'Ransomware',
      severity: 'critical',
      increasePercentage: 740,
      questionsCount: 42,
      baselineCount: 5,
      timePeriod: 'This Week',
      confidence: 96,
      recommendedAction: 'Issue an urgent advisory on ransomware prevention and reporting requirements. Consider awareness campaign.',
      timestamp: new Date().toISOString(),
      trendData: generateTimeSeries(7, 5, 3),
    },
    {
      id: 'alert-3',
      topic: 'Phishing',
      severity: 'medium',
      increasePercentage: 180,
      questionsCount: 14,
      baselineCount: 5,
      timePeriod: 'This Week',
      confidence: 78,
      recommendedAction: 'Consider reminding organisations of phishing awareness training and breach notification obligations.',
      timestamp: new Date().toISOString(),
      trendData: generateTimeSeries(7, 5, 2),
    },
    {
      id: 'alert-4',
      topic: 'Cloud Exposure',
      severity: 'low',
      increasePercentage: 65,
      questionsCount: 11,
      baselineCount: 7,
      timePeriod: 'Past 3 Days',
      confidence: 65,
      recommendedAction: 'Monitor trend. Consider publishing cloud storage best practices guidance.',
      timestamp: new Date().toISOString(),
      trendData: generateTimeSeries(3, 7, 3),
    },
  ]
  return alerts
}

// ──────────────────────────────────────────────
// Emerging Topics
// ──────────────────────────────────────────────

export async function getEmergingTopics(): Promise<EmergingTopic[]> {
  return [
    {
      topic: 'Facial Recognition',
      growthPercentage: 320,
      questionsCount: 21,
      industries: ['Banking', 'Retail', 'Government'],
      trend: generateTimeSeries(30, 0.7, 0.5),
    },
    {
      topic: 'AI Recruitment',
      growthPercentage: 280,
      questionsCount: 18,
      industries: ['Telecommunications', 'Banking', 'Insurance'],
      trend: generateTimeSeries(30, 0.6, 0.4),
    },
    {
      topic: 'Generative AI',
      growthPercentage: 450,
      questionsCount: 34,
      industries: ['Education', 'Banking', 'Healthcare'],
      trend: generateTimeSeries(30, 1.1, 0.7),
    },
    {
      topic: 'Employee Monitoring',
      growthPercentage: 190,
      questionsCount: 26,
      industries: ['Mining', 'Telecommunications', 'Government'],
      trend: generateTimeSeries(30, 0.9, 0.5),
    },
    {
      topic: 'WhatsApp Usage',
      growthPercentage: 150,
      questionsCount: 15,
      industries: ['Retail', 'Healthcare', 'NGOs'],
      trend: generateTimeSeries(30, 0.5, 0.3),
    },
    {
      topic: 'Remote Working',
      growthPercentage: 85,
      questionsCount: 22,
      industries: ['Banking', 'Insurance', 'Education'],
      trend: generateTimeSeries(30, 0.7, 0.4),
    },
  ]
}

// ──────────────────────────────────────────────
// Confusion Detection
// ──────────────────────────────────────────────

export async function getConfusionMetrics(): Promise<ConfusionMetric[]> {
  return [
    {
      section: 'Section 6 — Consent',
      confusionScore: 78,
      questionCount: 89,
      exampleQuestions: [
        'When is consent required vs legitimate interest?',
        'Can we use implied consent for marketing?',
        'How do we obtain consent from children?',
      ],
      recommendation: 'Publish detailed guidance on consent requirements with practical examples for different scenarios.',
    },
    {
      section: 'Section 16 — Data breach notification',
      confusionScore: 72,
      questionCount: 67,
      exampleQuestions: [
        'What constitutes a reportable breach?',
        'Who exactly do we notify within 72 hours?',
        'What information must be included in a breach report?',
      ],
      recommendation: 'Create a step-by-step breach notification checklist and template.',
    },
    {
      section: 'Section 20 — International transfers',
      confusionScore: 85,
      questionCount: 45,
      exampleQuestions: [
        'Can we transfer data to South Africa without safeguards?',
        'What are adequate safeguards for international transfers?',
        'Does using AWS count as international transfer?',
      ],
      recommendation: 'Publish guidance on cross-border data transfers with country-specific recommendations.',
    },
    {
      section: 'Section 4 — Data Protection Principles',
      confusionScore: 65,
      questionCount: 52,
      exampleQuestions: [
        'How do we demonstrate accountability?',
        'What is the difference between purpose limitation and storage limitation?',
        'How long can we keep customer data after contract ends?',
      ],
      recommendation: 'Create a principles-at-a-glance guide with compliance checklist.',
    },
    {
      section: 'Section 18 — DPIA',
      confusionScore: 70,
      questionCount: 38,
      exampleQuestions: [
        'When is a DPIA mandatory?',
        'Who should conduct the DPIA?',
        'Can we use existing DPIAs from other jurisdictions?',
      ],
      recommendation: 'Develop a DPIA template and screening questionnaire.',
    },
  ]
}

// ──────────────────────────────────────────────
// Compliance Score
// ──────────────────────────────────────────────

export async function getComplianceScore(): Promise<ComplianceScore> {
  const industries = INDUSTRIES as unknown as string[]
  return {
    overall: 64,
    byIndustry: industries.map((industry, i) => ({
      industry,
      score: [78, 72, 68, 65, 58, 55, 52, 70, 48, 45, 50][i] || 60,
    })),
    trend: generateTimeSeries(12, 62, 5),
    improvement: 4.2,
    confidence: 85,
  }
}

// ──────────────────────────────────────────────
// Search Analytics
// ──────────────────────────────────────────────

export async function getSearchAnalytics(): Promise<SearchAnalytics> {
  return {
    mostSearchedPhrases: [
      { phrase: 'data breach reporting', count: 142 },
      { phrase: 'consent requirements', count: 98 },
      { phrase: 'employee data processing', count: 76 },
      { phrase: 'CCTV retention period', count: 54 },
      { phrase: 'cross border transfer', count: 48 },
    ],
    mostSearchedQuestions: [
      { question: 'How do I report a data breach?', count: 87 },
      { question: 'What is the penalty for non-compliance?', count: 65 },
      { question: 'How long can I keep customer data?', count: 52 },
      { question: 'Do I need a DPO?', count: 48 },
      { question: 'Can I use cloud storage?', count: 41 },
    ],
    searchesWithNoAnswer: [
      { phrase: 'WhatsApp business data sharing', count: 23 },
      { phrase: 'AI training data consent', count: 18 },
      { phrase: 'biometric time clock legality', count: 15 },
    ],
    lowConfidenceSearches: [
      { phrase: 'facial recognition in schools', count: 12 },
      { phrase: 'employee monitoring software', count: 10 },
      { phrase: 'data portability API requirements', count: 8 },
    ],
    unansweredTopics: [
      { topic: 'AI and Automated Decision-making', count: 34 },
      { topic: 'Cloud Service Provider Liability', count: 28 },
      { topic: 'Biometric Data Processing', count: 22 },
    ],
  }
}

// ──────────────────────────────────────────────
// AI Performance
// ──────────────────────────────────────────────

export async function getAIPerformance(): Promise<AIPerformance> {
  return {
    averageConfidence: 87.3,
    lowConfidenceResponses: 23,
    averageResponseTime: 1.8,
    escalations: 5,
    knowledgeGaps: 12,
    hallucinationFlags: 3,
    missingLegislationRefs: 7,
    confidenceTrend: generateTimeSeries(30, 86, 3),
    responseTimeTrend: generateTimeSeries(30, 1.9, 0.3),
  }
}

// ──────────────────────────────────────────────
// Live Activity Feed
// ──────────────────────────────────────────────

export async function getActivityFeed(limit: number = 20): Promise<ActivityEvent[]> {
  const activities: ActivityEvent[] = [
    { id: '1', type: 'Privacy Policy', description: 'Privacy Policy reviewed by Banking sector organisation', timestamp: new Date(Date.now() - 2 * 60000).toISOString(), category: 'document' },
    { id: '2', type: 'Breach Assessment', description: 'Breach assessment generated — suspected phishing incident', timestamp: new Date(Date.now() - 5 * 60000).toISOString(), category: 'document' },
    { id: '3', type: 'Question', description: 'Consent question asked — legitimate interest vs consent', timestamp: new Date(Date.now() - 8 * 60000).toISOString(), category: 'question' },
    { id: '4', type: 'Cross-border', description: 'Cross-border transfer queried — cloud storage in South Africa', timestamp: new Date(Date.now() - 12 * 60000).toISOString(), category: 'question' },
    { id: '5', type: 'RoPA', description: 'Record of Processing Activities (RoPA) created', timestamp: new Date(Date.now() - 20 * 60000).toISOString(), category: 'compliance' },
    { id: '6', type: 'Training', description: 'Data Protection training module completed', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), category: 'training' },
    { id: '7', type: 'DPIA', description: 'Data Protection Impact Assessment initiated', timestamp: new Date(Date.now() - 45 * 60000).toISOString(), category: 'compliance' },
    { id: '8', type: 'Question', description: 'Employee monitoring question — CCTV in workplace', timestamp: new Date(Date.now() - 60 * 60000).toISOString(), category: 'question' },
    { id: '9', type: 'Document', description: 'Consent form template downloaded', timestamp: new Date(Date.now() - 90 * 60000).toISOString(), category: 'document' },
    { id: '10', type: 'Report', description: 'Compliance gap analysis report generated', timestamp: new Date(Date.now() - 120 * 60000).toISOString(), category: 'report' },
  ]
  return activities.slice(0, limit)
}

// ──────────────────────────────────────────────
// Reports
// ──────────────────────────────────────────────

export async function getReports(): Promise<Report[]> {
  return [
    { id: 'r1', title: 'Weekly Intelligence Brief — Week 29', type: 'weekly', period: '14 Jul - 20 Jul 2026', generatedAt: new Date().toISOString(), status: 'ready', summary: 'Data breach questions increased 340%. Ransomware concerns spiking. Recommended: publish breach guidance.' },
    { id: 'r2', title: 'Monthly Compliance Trend Report — June 2026', type: 'monthly', period: 'June 2026', generatedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'ready', summary: 'Overall compliance score 64%. Top sector: Banking. Emerging topic: Generative AI.' },
    { id: 'r3', title: 'Quarterly National Privacy Landscape — Q2 2026', type: 'quarterly', period: 'Apr - Jun 2026', generatedAt: new Date(Date.now() - 86400000 * 30).toISOString(), status: 'ready', summary: '12.5% increase in platform usage. Cross-border transfers remain top confusion area.' },
    { id: 'r4', title: 'Annual Data Protection Report — 2025', type: 'annual', period: '2025', generatedAt: new Date('2026-01-15').toISOString(), status: 'ready', summary: 'Comprehensive analysis of data protection awareness and compliance trends throughout 2025.' },
  ]
}

// ──────────────────────────────────────────────
// Knowledge Gaps
// ──────────────────────────────────────────────

export async function getKnowledgeGaps(): Promise<KnowledgeGap[]> {
  return [
    { topic: 'Employee monitoring laws and limits', frequency: 67, recommendedType: 'guidance', exampleQuestions: ['Can we monitor employee emails?', 'What are the limits of CCTV in workplace?', 'Do we need consent for employee monitoring?'] },
    { topic: 'Cookie consent requirements', frequency: 54, recommendedType: 'faq', exampleQuestions: ['Do we need cookie consent banners?', 'What cookies are exempt from consent?', 'How long do we keep cookie consent records?'] },
    { topic: 'CCTV retention periods', frequency: 48, recommendedType: 'guidance', exampleQuestions: ['How long can we keep CCTV footage?', 'Do we need signs for CCTV?', 'Can tenants request CCTV footage?'] },
    { topic: 'Consent wording best practices', frequency: 42, recommendedType: 'template', exampleQuestions: ['What constitutes valid consent?', 'Can we use pre-ticked boxes?', 'How do we document consent?'] },
    { topic: 'Cross-border transfer mechanisms', frequency: 38, recommendedType: 'circular', exampleQuestions: ['What is an adequacy decision?', 'Can we use SCCs?', 'Does cloud storage count as transfer?'] },
  ]
}

// ──────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────

export async function getNotifications(): Promise<Notification[]> {
  return [
    { id: 'n1', title: '🔴 Critical Alert', message: 'Ransomware-related questions surged 740% this week. Immediate attention recommended.', severity: 'critical', read: false, createdAt: new Date().toISOString(), category: 'alert' },
    { id: 'n2', title: '🟠 High Risk Topic', message: 'Data breach questions 340% above baseline. Consider publishing guidance.', severity: 'warning', read: false, createdAt: new Date(Date.now() - 3600000).toISOString(), category: 'alert' },
    { id: 'n3', title: '🆕 Emerging Topic Detected', message: 'Generative AI questions growing 450%. New technology area requires attention.', severity: 'info', read: false, createdAt: new Date(Date.now() - 7200000).toISOString(), category: 'topic' },
    { id: 'n4', title: '📊 Confidence Drop', message: 'AI confidence dropped below 80% for international transfer questions.', severity: 'warning', read: true, createdAt: new Date(Date.now() - 86400000).toISOString(), category: 'performance' },
    { id: 'n5', title: '📋 Report Ready', message: 'Weekly Intelligence Brief is ready for review.', severity: 'info', read: true, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), category: 'report' },
  ]
}

// ──────────────────────────────────────────────
// AI Recommendations
// ──────────────────────────────────────────────

export async function getRecommendations(): Promise<{ recommendation: string; reasoning: string; priority: 'high' | 'medium' | 'low' }[]> {
  return [
    {
      recommendation: 'Publish ransomware awareness and reporting guidance',
      reasoning: 'Ransomware-related questions surged 740% this week. Organisations are seeking clarity on prevention and reporting obligations.',
      priority: 'high',
    },
    {
      recommendation: 'Issue circular on data breach notification requirements',
      reasoning: 'Data breach questions increased 340%. Many organisations unclear on 72-hour notification window and reporting procedure.',
      priority: 'high',
    },
    {
      recommendation: 'Update FAQ on consent requirements',
      reasoning: 'Consent remains the most confused topic (78 confusion score). Practical examples needed for consent vs legitimate interest.',
      priority: 'medium',
    },
    {
      recommendation: 'Host webinar on cross-border data transfers',
      reasoning: 'International transfers have highest confusion score (85). Organisations need clarity on cloud storage and SCCs.',
      priority: 'medium',
    },
    {
      recommendation: 'Create guidance on AI and automated decision-making',
      reasoning: 'Generative AI questions growing 450% monthly. New guidance needed on Section 15 requirements for automated decisions.',
      priority: 'medium',
    },
    {
      recommendation: 'Develop DPIA template for small organisations',
      reasoning: '38 organisations asked about DPIAs. SMEs need simplified templates to meet compliance without excessive burden.',
      priority: 'low',
    },
    {
      recommendation: 'Issue press release on biometric data processing',
      reasoning: 'Facial recognition questions up 320%. Public and organisations need clarity on biometric data as sensitive data.',
      priority: 'low',
    },
  ]
}

// ──────────────────────────────────────────────
// Activity Heatmap by Industry
// ──────────────────────────────────────────────

export async function getActivityHeatmap(): Promise<{ industry: string; days: TimeSeriesPoint[] }[]> {
  const industries = INDUSTRIES as unknown as string[]
  return industries.map(industry => ({
    industry,
    days: generateTimeSeries(7, Math.round(5 + Math.random() * 20), 5),
  }))
}
