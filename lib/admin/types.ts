// ============================================
// Ministry Intelligence Dashboard — Type Definitions
// ============================================

export interface KPIState {
  totalQuestions: number
  todayQuestions: number
  weekQuestions: number
  activeOrganisations: number
  returningOrganisations: number
  averageConfidence: number
  averageResponseTime: number
  totalDocumentsReviewed: number
  policiesGenerated: number
  complianceReportsGenerated: number
  breachAssessmentsGenerated: number
  topIndustry: string
  mostViewedLegalSection: string
  mostAskedTopic: string
  mostAskedRegulation: string
  trendVsPreviousMonth: number
  previousTotalQuestions: number
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface IndustryMetric {
  industry: string
  questions: number
  topConcerns: string[]
  averageComplianceScore: number
  commonDocuments: string[]
  commonRisks: string[]
  percentage: number
}

export interface TopicMetric {
  topic: string
  count: number
  growth: number
  trend: 'up' | 'down' | 'stable'
  weeklyData: TimeSeriesPoint[]
  monthlyData: TimeSeriesPoint[]
}

export interface Alert {
  id: string
  topic: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  increasePercentage: number
  questionsCount: number
  baselineCount: number
  timePeriod: string
  confidence: number
  recommendedAction: string
  timestamp: string
  trendData: TimeSeriesPoint[]
  dismissed?: boolean
}

export interface EmergingTopic {
  topic: string
  growthPercentage: number
  questionsCount: number
  industries: string[]
  trend: TimeSeriesPoint[]
}

export interface ConfusionMetric {
  section: string
  confusionScore: number
  questionCount: number
  exampleQuestions: string[]
  recommendation: string
}

export interface GuidanceDocument {
  id: string
  title: string
  type: 'guidance' | 'circular' | 'notice' | 'faq' | 'template' | 'best_practice' | 'press_release' | 'advisory'
  status: 'draft' | 'published' | 'archived'
  content: string
  summary: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface KnowledgeGap {
  topic: string
  frequency: number
  recommendedType: 'faq' | 'guidance' | 'training' | 'video' | 'circular'
  exampleQuestions: string[]
}

export interface ComplianceScore {
  overall: number
  byIndustry: { industry: string; score: number }[]
  trend: TimeSeriesPoint[]
  improvement: number
  confidence: number
}

export interface SearchAnalytics {
  mostSearchedPhrases: { phrase: string; count: number }[]
  mostSearchedQuestions: { question: string; count: number }[]
  searchesWithNoAnswer: { phrase: string; count: number }[]
  lowConfidenceSearches: { phrase: string; count: number }[]
  unansweredTopics: { topic: string; count: number }[]
}

export interface AIPerformance {
  averageConfidence: number
  lowConfidenceResponses: number
  averageResponseTime: number
  escalations: number
  knowledgeGaps: number
  hallucinationFlags: number
  missingLegislationRefs: number
  confidenceTrend: TimeSeriesPoint[]
  responseTimeTrend: TimeSeriesPoint[]
}

export interface ActivityEvent {
  id: string
  type: string
  description: string
  timestamp: string
  category: 'document' | 'question' | 'report' | 'training' | 'compliance'
}

export interface Report {
  id: string
  title: string
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  period: string
  generatedAt: string
  status: 'generating' | 'ready' | 'failed'
  summary: string
}

export interface Notification {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  read: boolean
  createdAt: string
  category: string
}

// Topic classification categories
export const TOPIC_CATEGORIES = [
  'Consent',
  'Data Breach',
  'Employee Data',
  'Biometrics',
  'CCTV',
  'Cross Border Transfers',
  'Retention',
  'Cookies',
  'Marketing',
  'AI',
  'Cloud',
  'Security',
  'Sensitive Data',
  'Children',
  'Financial Data',
  'Health Data',
  'Access Requests',
  'Deletion Requests',
  'Correction Requests',
  'Processors',
  'Controllers',
  'International Transfers',
  'Vendor Management',
  'Training',
  'Policy',
  'Contracts',
  'RoPA',
  'DPIA',
] as const

export type TopicCategory = typeof TOPIC_CATEGORIES[number]

// Industry categories
export const INDUSTRIES = [
  'Government',
  'Banking',
  'Insurance',
  'Healthcare',
  'Retail',
  'Education',
  'Mining',
  'Telecommunications',
  'Hospitality',
  'NGOs',
  'Other',
] as const

export type Industry = typeof INDUSTRIES[number]

// Early warning keywords
export const EARLY_WARNING_KEYWORDS = [
  'data breach',
  'ransomware',
  'phishing',
  'leaked database',
  'hacked',
  'stolen laptop',
  'malware',
  'identity theft',
  'unauthorised access',
  'unauthorized access',
  'insider threat',
  'credential theft',
  'account compromise',
  'lost USB',
  'accidental disclosure',
  'email sent to wrong recipient',
  'cloud exposure',
  'cyber attack',
  'security incident',
  'data leak',
  'breach notification',
  'personal data exposed',
  'data compromised',
] as const

// Legal sections of Botswana DPA (simplified)
export const LEGAL_SECTIONS = [
  'Part I — Preliminary',
  'Part II — Data Protection Principles',
  'Part III — Rights of Data Subjects',
  'Part IV — Data Controllers and Processors',
  'Part V — Data Protection Commissioner',
  'Part VI — Enforcement and Penalties',
  'Part VII — Exemptions',
  'Part VIII — Miscellaneous',
  'Section 1 — Short title and commencement',
  'Section 2 — Interpretation',
  'Section 3 — Application of Act',
  'Section 4 — Data Protection Principles',
  'Section 5 — Lawful processing',
  'Section 6 — Consent',
  'Section 7 — Processing for special purposes',
  'Section 8 — Right to be informed',
  'Section 9 — Right of access',
  'Section 10 — Right to rectification',
  'Section 11 — Right to erasure',
  'Section 12 — Right to restrict processing',
  'Section 13 — Right to data portability',
  'Section 14 — Right to object',
  'Section 15 — Automated decision-making',
  'Section 16 — Data breach notification',
  'Section 17 — Data Protection Officer',
  'Section 18 — Data Protection Impact Assessment',
  'Section 19 — Registration',
  'Section 20 — International transfers',
  'Section 21 — Complaints',
  'Section 22 — Investigations',
  'Section 23 — Enforcement notices',
  'Section 24 — Penalties',
  'Section 25 — Appeals',
] as const
