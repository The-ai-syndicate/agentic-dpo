'use client'

import React, { useState } from 'react'
import type { GuidanceDocument } from '@/lib/admin/types'
import { ChartContainer, SeverityBadge } from '../components/chart-container'
import { BookOpen, Plus, FileText, ExternalLink, Edit, Archive, Eye, Search } from 'lucide-react'

const initialDocuments: GuidanceDocument[] = [
  {
    id: '1',
    title: 'Data Breach Notification: A Step-by-Step Guide',
    type: 'guidance',
    status: 'published',
    content: 'Full guidance content here...',
    summary: 'Comprehensive guide on data breach notification requirements under Section 16 of the Botswana Data Protection Act.',
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    tags: ['data breach', 'notification', 'Section 16'],
  },
  {
    id: '2',
    title: 'Consent Requirements under the Botswana DPA',
    type: 'faq',
    status: 'published',
    content: 'FAQ content...',
    summary: 'Answers to frequently asked questions about consent requirements, including explicit consent, implied consent, and consent for children.',
    publishedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    tags: ['consent', 'Section 6', 'children'],
  },
  {
    id: '3',
    title: 'Cross-Border Data Transfer Circular',
    type: 'circular',
    status: 'published',
    content: 'Circular content...',
    summary: 'Official circular outlining requirements for transferring personal data outside Botswana, including adequacy decisions and safeguards.',
    publishedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 75).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    tags: ['cross-border', 'international transfers', 'Section 20', 'cloud'],
  },
  {
    id: '4',
    title: 'Ransomware Prevention and Reporting Advisory',
    type: 'advisory',
    status: 'draft',
    content: 'Draft advisory content...',
    summary: 'Urgent advisory on ransomware prevention measures and reporting obligations under the Data Protection Act.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['ransomware', 'security', 'breach', 'advisory'],
  },
  {
    id: '5',
    title: 'DPIA Template for Small Organisations',
    type: 'template',
    status: 'draft',
    content: 'Template content...',
    summary: 'Simplified Data Protection Impact Assessment template designed for small and medium organisations.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    tags: ['DPIA', 'template', 'SME', 'Section 18'],
  },
  {
    id: '6',
    title: 'Employee Data Processing Best Practices',
    type: 'best_practice',
    status: 'published',
    content: 'Best practices content...',
    summary: 'Guidance on processing employee personal data, including monitoring, CCTV, and consent requirements in the workplace.',
    publishedAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    tags: ['employee data', 'monitoring', 'CCTV', 'workplace'],
  },
]

const typeLabels: Record<string, string> = {
  guidance: 'Guidance',
  circular: 'Circular',
  notice: 'Notice',
  faq: 'FAQ',
  template: 'Template',
  best_practice: 'Best Practice',
  press_release: 'Press Release',
  advisory: 'Advisory',
}

const typeColors: Record<string, string> = {
  guidance: 'bg-blue-500/10 text-blue-500',
  circular: 'bg-purple-500/10 text-purple-500',
  notice: 'bg-yellow-500/10 text-yellow-500',
  faq: 'bg-green-500/10 text-green-500',
  template: 'bg-pink-500/10 text-pink-500',
  best_practice: 'bg-teal-500/10 text-teal-500',
  press_release: 'bg-orange-500/10 text-orange-500',
  advisory: 'bg-red-500/10 text-red-500',
}

export default function GuidancePage() {
  const [documents] = useState<GuidanceDocument[]>(initialDocuments)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [search, setSearch] = useState('')

  const filtered = documents.filter(doc => {
    if (filter !== 'all' && doc.status !== filter) return false
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase()) && !doc.tags.some(t => t.includes(search.toLowerCase()))) return false
    return true
  })

  const published = documents.filter(d => d.status === 'published').length
  const drafts = documents.filter(d => d.status === 'draft').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Official Guidance Centre</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish and manage official guidance, circulars, FAQs, and templates</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          New Publication
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Publications</p>
          <p className="text-2xl font-bold text-foreground">{documents.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Published</p>
          <p className="text-2xl font-bold text-green-500">{published}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Drafts</p>
          <p className="text-2xl font-bold text-yellow-500">{drafts}</p>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search publications..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'published', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[doc.type] || ''}`}>
                    {typeLabels[doc.type] || doc.type}
                  </span>
                  <SeverityBadge severity={doc.status === 'published' ? 'info' : 'warning'} />
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground mt-2">{doc.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{doc.summary}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {doc.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg" title="View">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg" title="Edit">
                  <Edit className="w-4 h-4" />
                </button>
                {doc.status === 'published' && (
                  <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg" title="Archive">
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg" title="Preview">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">AI Knowledge Base Integration</p>
            <p className="text-xs text-muted-foreground mt-1">
              All published guidance documents are automatically included in the AI knowledge base. 
              Future answers will prioritise official guidance when responding to related questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
