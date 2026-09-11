import ContentLayout from '../content-layout'
import { ShieldCheck, Database, Eye, Lock, Share2, UserCheck, FileWarning, Mail } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | Agentic DPO',
  description:
    'The Agentic DPO Privacy Policy — what data we collect, how we use it, your rights under the Botswana Data Protection Act, and how to contact us.',
}

const sections = [
  {
    icon: Eye,
    title: '1. Information we collect',
    body: `When you use Agentic DPO, we collect:
- **Conversation data**: the questions you ask and the responses we generate, associated with a browser session ID. This enables chat history so you can return to previous conversations.
- **Usage telemetry**: anonymised, high-level usage signals (number of chats per session, response time, error rates) that help us improve reliability — never the text of your questions.
- **Contact information**: only if you voluntarily submit it via our contact form.
- **Standard web logs**: anonymised IP address (never stored permanently), User-Agent, referrer header. We do not build advertising profiles.`,
  },
  {
    icon: Database,
    title: '2. How we use your information',
    body: `We use your data only for these purposes:
1. **Provide the service**: storing and retrieving your chat history on request; generating responses via our LLM provider.
2. **Service improvement**: debugging errors, tuning response quality, measuring overall product health.
3. **Security and abuse prevention**: detecting malicious traffic and enforcing rate limits (see our abuse controls).
4. **Legal compliance**: responding only to lawful, properly served requests from competent authorities in Botswana.

Conversation content is **never** sold, shared with advertisers, or used to train public AI models.`,
  },
  {
    icon: Share2,
    title: '3. Sub-processors & cross-border transfers',
    body: `We engage the following sub-processors who may process data on our behalf:
- **LLM inference provider** (currently DeepSeek): transmits prompts/responses for generation. Subject to our DPA-compliant processing agreement.
- **Supabase (hosted database)**: stores chat sessions and messages on EU / African infrastructure where available.
- **Vercel (hosting & edge)**: serves the application and runs our API routes.
- **Qdrant / Pinecone (vector store)**: holds the indexed corpus of the Data Protection Act (no personal user data).

Where data leaves Botswana, we rely on adequacy-equivalent jurisdictions or standard contractual clauses approved under the DPA.`,
  },
  {
    icon: UserCheck,
    title: '4. Your rights under the Botswana DPA',
    body: `As a data subject, you may exercise the following rights at no cost:
- **Right of access**: request a copy of all personal data we hold about you.
- **Right to rectification**: correct inaccurate or incomplete data.
- **Right to erasure**: request deletion of your chats and account data.
- **Right to restrict processing**: ask us to pause processing for a period.
- **Right to data portability**: receive your chat history in a machine-readable format.
- **Right to object**: object to processing based on our legitimate interests.
- **Right to lodge a complaint**: with the Office of the Data Protection Commissioner at any time.

To exercise any right, email the address listed in section 7. We will respond within the DPA-prescribed timeline.`,
  },
  {
    icon: Lock,
    title: '5. Security',
    body: `We protect your data with industry-standard controls:
- Transport encryption (TLS 1.3, HTTPS everywhere, HSTS enforced).
- Encrypted storage at rest via AES-256 for databases and vector stores.
- Rate limiting, concurrent request limits and input validation on every API endpoint.
- Least-privilege IAM for server-side services; secrets in encrypted vaults.
- Regular vulnerability reviews and dependency upgrades.

No system is 100% secure, but we maintain a defence-in-depth posture and will notify you and the Commissioner within 72 hours of a qualifying personal data breach, as required by the DPA.`,
  },
  {
    icon: FileWarning,
    title: '6. Retention period',
    body: `- Chat history: retained until you delete the conversation or request account erasure. After 12 months of inactivity, sessions are automatically purged.
- Usage telemetry: aggregated and anonymised within 30 days; raw logs deleted after 14 days.
- Contact-form submissions: retained as long as required to respond to your enquiry, plus a maximum of 18 months for legal records.
- Legal hold: any data subject to a lawful preservation request will be retained until the matter is resolved.`,
  },
  {
    icon: Mail,
    title: '7. Controller & contact details',
    body: `Agentic DPO is the Data Controller for the purposes of this policy.
- **Contact person / DPO**: Obokeng Makwati
- **Email**: privacy@agenticdpo.cloud
- **Website**: https://agenticdpo.cloud
- **Jurisdiction**: Republic of Botswana

We acknowledge complaints and requests in Setswana and English. You also have the right to complain to:
Office of the Data Protection Commissioner, Republic of Botswana.`,
  },
]

export default function PrivacyPage() {
  return (
    <ContentLayout>
      <div className="space-y-12">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/50 md:text-base">
            Last updated: {new Date().toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' • '}
            Designed to comply with the Botswana Data Protection Act.
          </p>
        </header>

        <div className="space-y-6">
          {sections.map((s, i) => {
            const Icon = s.icon
            return (
              <section
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-white md:text-xl">{s.title}</h2>
                </div>
                <div className="mt-4 space-y-2.5 text-sm leading-relaxed text-white/70 md:text-[15px]">
                  {s.body.split('\n').map((line, j) => {
                    if (line.startsWith('- **')) {
                      const cleaned = line.replace(/^- /, '')
                      const titleMatch = cleaned.match(/^\*\*(.+?)\*\*:\s?([\s\S]*)$/)
                      if (titleMatch) {
                        return (
                          <div key={j} className="flex gap-2 pl-4">
                            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/60" />
                            <p>
                              <span className="font-semibold text-white/85">{titleMatch[1]}:</span>{' '}
                              <span className="text-white/70">{titleMatch[2]}</span>
                            </p>
                          </div>
                        )
                      }
                    }
                    if (/^\d+\.\s\*\*/.test(line)) {
                      const cleaned = line.replace(/^\d+\.\s/, '')
                      const titleMatch = cleaned.match(/^\*\*(.+?)\*\*:\s?([\s\S]*)$/)
                      if (titleMatch) {
                        return (
                          <p key={j}>
                            <span className="font-semibold text-white/90">{titleMatch[1]}:</span>{' '}
                            <span>{titleMatch[2]}</span>
                          </p>
                        )
                      }
                    }
                    if (line.trim() === '') return <div key={j} className="h-1" />
                    return <p key={j}>{line}</p>
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <footer className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center text-xs text-white/40 md:text-[13px]">
          This is a human-readable summary of our practices. In the event of any conflict
          between this policy and the Data Protection Act, the Data Protection Act prevails.
        </footer>
      </div>
    </ContentLayout>
  )
}
