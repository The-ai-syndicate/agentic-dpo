'use client'

import React, { useState } from 'react'
import { Shield, Bell, Eye, Database, Users, RefreshCw, Save } from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">⚙️ Admin Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure Ministry Intelligence Dashboard preferences</p>
      </div>

      {/* Privacy Configuration */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Privacy Configuration</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Anonymise all data by default</p>
              <p className="text-xs text-muted-foreground">Ensures all dashboard views are aggregated and anonymised</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-5" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Mask organisation names in exports</p>
              <p className="text-xs text-muted-foreground">Replace organisation names with generic identifiers in downloaded reports</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-5" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Strip personal identifiers from logs</p>
              <p className="text-xs text-muted-foreground">Remove emails, names, and contact details from activity logs</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-5" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Data retention period</p>
              <p className="text-xs text-muted-foreground">How long to retain anonymised analytics</p>
            </div>
            <select className="bg-muted text-foreground text-sm border border-border rounded-lg px-3 py-1.5">
              <option>90 days</option>
              <option selected>180 days</option>
              <option>365 days</option>
              <option>Indefinite</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Configuration */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Alert Configuration</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Critical alert threshold</p>
              <p className="text-xs text-muted-foreground">Percentage increase to trigger critical alerts</p>
            </div>
            <select className="bg-muted text-foreground text-sm border border-border rounded-lg px-3 py-1.5">
              <option>200% increase</option>
              <option selected>300% increase</option>
              <option>500% increase</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">High alert threshold</p>
              <p className="text-xs text-muted-foreground">Percentage increase to trigger high alerts</p>
            </div>
            <select className="bg-muted text-foreground text-sm border border-border rounded-lg px-3 py-1.5">
              <option>100% increase</option>
              <option selected>150% increase</option>
              <option>200% increase</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Medium alert threshold</p>
              <p className="text-xs text-muted-foreground">Percentage increase to trigger medium alerts</p>
            </div>
            <select className="bg-muted text-foreground text-sm border border-border rounded-lg px-3 py-1.5">
              <option selected>50% increase</option>
              <option>75% increase</option>
              <option>100% increase</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Minimum questions for alert</p>
              <p className="text-xs text-muted-foreground">Minimum number of questions before alert triggers</p>
            </div>
            <select className="bg-muted text-foreground text-sm border border-border rounded-lg px-3 py-1.5">
              <option>5 questions</option>
              <option selected>10 questions</option>
              <option>20 questions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Data Sources</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Chat Messages</p>
                <p className="text-xs text-muted-foreground">supabase.chat_messages — 1,247 records</p>
              </div>
            </div>
            <span className="text-xs text-green-500">Connected</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Chat Sessions</p>
                <p className="text-xs text-muted-foreground">supabase.chat_sessions — 89 records</p>
              </div>
            </div>
            <span className="text-xs text-green-500">Connected</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Analytics Aggregation (Coming Soon)</p>
                <p className="text-xs text-muted-foreground">Dedicated analytics_metrics table for event-based aggregation</p>
              </div>
            </div>
            <span className="text-xs text-yellow-500">Setup Required</span>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Access Control</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Currently configured for MinistryAdmin role. Only authorised Ministry personnel can access this dashboard.
        </p>
        <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">Role: <strong>MinistryAdmin</strong></span>
          <span className="text-xs text-muted-foreground">— Full access to all analytics</span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {saved ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}
