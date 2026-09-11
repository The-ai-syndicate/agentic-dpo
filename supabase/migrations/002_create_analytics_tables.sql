-- ============================================
-- Migration: Create Analytics & Aggregation Tables
-- For the Ministry Intelligence Dashboard
-- ============================================
-- Run this in the Supabase SQL Editor.
-- All data is aggregated and anonymised by default.

-- 1. Analytics Metrics Table (for event-based aggregation)
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  dimension TEXT,           -- e.g., 'industry', 'topic', 'section'
  dimension_value TEXT,     -- e.g., 'Banking', 'Consent', 'Section 16'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_name, dimension, dimension_value, period_start, period_end)
);

CREATE INDEX idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX idx_analytics_metrics_period ON analytics_metrics(period_start, period_end);
CREATE INDEX idx_analytics_metrics_dimension ON analytics_metrics(dimension, dimension_value);

-- 2. Topic Classification Log (anonymised question topics)
CREATE TABLE IF NOT EXISTS topic_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0,
  session_id TEXT,           -- Only for deduplication, not displayed
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_topic_classifications_topic ON topic_classifications(topic);
CREATE INDEX idx_topic_classifications_created_at ON topic_classifications(created_at);

-- 3. Early Warning Alerts
CREATE TABLE IF NOT EXISTS analytics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  increase_percentage NUMERIC NOT NULL,
  questions_count INTEGER NOT NULL,
  baseline_count INTEGER NOT NULL,
  time_period TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0,
  recommended_action TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_analytics_alerts_severity ON analytics_alerts(severity);
CREATE INDEX idx_analytics_alerts_created ON analytics_alerts(created_at DESC);

-- 4. Official Guidance Documents
CREATE TABLE IF NOT EXISTS guidance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('guidance', 'circular', 'notice', 'faq', 'template', 'best_practice', 'press_release', 'advisory')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content TEXT NOT NULL DEFAULT '',
  summary TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  tags TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_guidance_documents_status ON guidance_documents(status);
CREATE INDEX idx_guidance_documents_type ON guidance_documents(type);
CREATE INDEX idx_guidance_documents_published ON guidance_documents(published_at DESC);

-- 5. Knowledge Gaps
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL UNIQUE,
  frequency INTEGER NOT NULL DEFAULT 0,
  recommended_type TEXT NOT NULL DEFAULT 'guidance',
  example_questions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notifications for Ministry Admin
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  category TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- 7. Activity Feed (anonymised events)
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('document', 'question', 'report', 'training', 'compliance')),
  metadata JSONB DEFAULT '{}',   -- Non-personal metadata only
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_events_created ON activity_events(created_at DESC);
CREATE INDEX idx_activity_events_category ON activity_events(category);

-- 8. Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'quarterly', 'annual')),
  period TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  report_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. AI Performance Metrics
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_performance_metrics_name ON ai_performance_metrics(metric_name);
CREATE INDEX idx_ai_performance_metrics_time ON ai_performance_metrics(recorded_at DESC);

-- Enable RLS
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role full access analytics_metrics" ON analytics_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access topic_classifications" ON topic_classifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access analytics_alerts" ON analytics_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access guidance_documents" ON guidance_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access knowledge_gaps" ON knowledge_gaps FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access admin_notifications" ON admin_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access activity_events" ON activity_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access generated_reports" ON generated_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ai_performance_metrics" ON ai_performance_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Confirm
SELECT '✅ Analytics tables created successfully' AS result;
