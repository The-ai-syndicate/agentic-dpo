'use client'

import ContentLayout from '../content-layout'
import { useState } from 'react'
import { Mail, Send, User, MessageSquare, Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Please enter a valid email address'),
  organisation: z.string().optional(),
  subject: z.string().min(3, 'Subject is too short'),
  message: z.string().min(10, 'Message should be at least 10 characters'),
})

type ContactStatus = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', organisation: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<ContactStatus>('idle')

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = ContactSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        fieldErrors[k] = (v as string[])[0]
      }
      setErrors(fieldErrors)
      return
    }
    setStatus('submitting')
    try {
      const res = await fetch('https://formspree.io/f/mpwavvzv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          organisation: parsed.data.organisation || '(not specified)',
          subject: parsed.data.subject,
          message: parsed.data.message,
          _subject: `Agentic DPO contact: ${parsed.data.subject}`,
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setStatus('success')
      setForm({ name: '', email: '', organisation: '', subject: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const inputCls = (field: keyof typeof form) =>
    `bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-teal-500/40 ${
      errors[field] ? 'border-rose-400/40 focus-visible:ring-rose-500/30' : ''
    }`

  return (
    <ContentLayout>
      <div className="space-y-10">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Contact us
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/55 md:text-base">
            Have a question, partnership idea, or feature request? We&apos;d love to hear
            from you. Typically replied to within one business day.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-5">
          <aside className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-[15px] font-semibold text-white">Direct channels</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/35">
                      Support
                    </p>
                    <a href="mailto:help@agenticdpo.cloud" className="text-white/80 hover:text-teal-400">
                      help@agenticdpo.cloud
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/35">
                      Privacy / DPO
                    </p>
                    <a href="mailto:privacy@agenticdpo.cloud" className="text-white/80 hover:text-teal-400">
                      privacy@agenticdpo.cloud
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/35">
                      Partnerships & sales
                    </p>
                    <a href="mailto:hello@agenticdpo.cloud" className="text-white/80 hover:text-teal-400">
                      hello@agenticdpo.cloud
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/35">
                      Jurisdiction
                    </p>
                    <p className="text-white/80">Gaborone, Republic of Botswana 🇧🇼</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-slate-900/0 to-slate-900/0 p-6">
              <h3 className="text-sm font-semibold text-white">
                Before you reach out
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                  <span>Try our <a href="/help" className="text-teal-400 underline hover:no-underline">Help Center</a> for immediate FAQs.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                  <span>For live breach emergencies, contact the Office of the DPC directly.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                  <span>Do not include sensitive personal data in your message.</span>
                </li>
              </ul>
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 lg:col-span-3">
            {status === 'success' ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/15 ring-1 ring-teal-500/30">
                  <CheckCircle2 className="h-8 w-8 text-teal-400" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-white">
                  Message received — thanks! 🎉
                </h2>
                <p className="mt-2 max-w-md text-sm text-white/60">
                  We&apos;ve got your message and will be in touch shortly. Usually within
                  one business day. Need an answer faster? Reply to the confirmation email
                  with &quot;urgent&quot; in the subject line.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-sm text-teal-400 underline decoration-teal-400/30 hover:no-underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-lg font-semibold text-white md:text-xl">
                  Send us a message
                </h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                      <User className="h-3.5 w-3.5 text-teal-400" />
                      Your name *
                    </label>
                    <Input
                      type="text"
                      value={form.name}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder="Keitumetse Modise"
                      className={inputCls('name')}
                    />
                    {errors.name && <p className="text-xs text-rose-400">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                      <Mail className="h-3.5 w-3.5 text-teal-400" />
                      Email address *
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => updateField('email', e.target.value)}
                      placeholder="you@company.co.bw"
                      className={inputCls('email')}
                    />
                    {errors.email && <p className="text-xs text-rose-400">{errors.email}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <Building2 className="h-3.5 w-3.5 text-teal-400" />
                    Organisation (optional)
                  </label>
                  <Input
                    type="text"
                    value={form.organisation}
                    onChange={e => updateField('organisation', e.target.value)}
                    placeholder="Your company / organisation"
                    className={inputCls('organisation')}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <MessageSquare className="h-3.5 w-3.5 text-teal-400" />
                    Subject *
                  </label>
                  <Input
                    type="text"
                    value={form.subject}
                    onChange={e => updateField('subject', e.target.value)}
                    placeholder="e.g. Enterprise DPO license, bug report, feature idea…"
                    className={inputCls('subject')}
                  />
                  {errors.subject && <p className="text-xs text-rose-400">{errors.subject}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <MessageSquare className="h-3.5 w-3.5 text-teal-400" />
                    Your message *
                  </label>
                  <Textarea
                    rows={7}
                    value={form.message}
                    onChange={e => updateField('message', e.target.value)}
                    placeholder="Tell us what you need…"
                    className={`resize-none bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-teal-500/40 ${
                      errors.message ? 'border-rose-400/40 focus-visible:ring-rose-500/30' : ''
                    }`}
                  />
                  {errors.message && <p className="text-xs text-rose-400">{errors.message}</p>}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <p className="text-[11px] text-white/40">
                    By sending this message you agree to our{' '}
                    <a href="/privacy" className="text-teal-400 hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </p>
                  <Button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="group inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send message
                        <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </div>

                {status === 'error' && (
                  <p className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-3 text-sm text-rose-300">
                    Something went wrong sending your message. Please email{' '}
                    <a href="mailto:help@agenticdpo.cloud" className="underline">help@agenticdpo.cloud</a> directly.
                  </p>
                )}
              </form>
            )}
          </section>
        </div>
      </div>
    </ContentLayout>
  )
}
