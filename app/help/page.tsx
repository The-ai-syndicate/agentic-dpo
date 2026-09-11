import ContentLayout from '../content-layout'
import { HelpCircle, Bot, Search, FilePlus2, Upload, MessageSquareX, Shield, Share2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export const metadata = {
  title: 'Help Center | Agentic DPO',
  description:
    'Frequently asked questions and how-to guides for Agentic DPO — your AI assistant on the Botswana Data Protection Act.',
}

const faqs = [
  {
    q: 'What is Agentic DPO?',
    a: 'Agentic DPO is a conversational AI assistant that answers questions about the Botswana Data Protection Act in plain language. It draws on an indexed corpus of the DPA, regulatory guidance and compliance best practices, tailored to Botswana context.',
  },
  {
    q: 'Is Agentic DPO free to use?',
    a: 'Yes — our core chat experience is free. Advanced features such as uploading your own policies for tailored DPA gap-analysis are available under our Pro tier. See the Upgrade option in your sidebar.',
  },
  {
    q: 'Are my conversations private?',
    a: 'Absolutely. Your chats are encrypted in transit, stored only to provide you with history, and never used to train public AI models. You can delete any conversation or your entire history at any time. Read our Privacy Policy for the full detail.',
  },
  {
    q: 'Can I upload my own documents?',
    a: 'Yes. Use the paperclip upload icon in the chat input to upload policies, contracts, registers or guidance notes (PDF, TXT, Markdown, DOCX). Agentic DPO will index them and answer questions that combine their content with the Data Protection Act.',
  },
  {
    q: 'Which file formats are supported?',
    a: 'PDF, TXT, Markdown, CSV, JSON, HTML, XML, YAML, LOG, DOC/DOCX, RTF and ODT. Individual uploads are capped at 25 MB. For larger corpuses contact us for an enterprise plan.',
  },
  {
    q: 'Can I trust the answers?',
    a: 'Responses are generated from our indexed corpus and LLM reasoning, and while we tune for accuracy, AI outputs can contain errors or hallucinations. Always verify compliance-critical statements against the authoritative DPA text and seek a qualified legal practitioner where required. See our Disclaimer.',
  },
  {
    q: 'How do I start a new chat?',
    a: 'Press the + (plus) button inside the input bar at the bottom-left, or select New Chat from the sidebar History panel. Your prior conversations are preserved and can be revisited any time.',
  },
  {
    q: 'Do you support Setswana?',
    a: 'We support English today. Multilingual Setswana responses are on our near-term roadmap — subscribe to our release notes via the Contact page to be notified.',
  },
  {
    q: 'Who builds Agentic DPO?',
    a: 'Agentic DPO is designed and developed by Obokeng Makwati, a Botswana-based software engineer and compliance technologist. The product is not affiliated with the Government of Botswana or the Office of the Data Protection Commissioner.',
  },
  {
    q: 'How can I report a bug or suggest a feature?',
    a: 'Use the Contact page — we respond personally to every message, or email help@agenticdpo.cloud. Bug reports with reproduction steps receive priority triage.',
  },
]

const guides = [
  {
    icon: Bot,
    title: 'Asking great questions',
    body: 'Be specific. Instead of "tell me about DPA" try "As a small retailer, what are my 5 most urgent obligations under Part V of the DPA before 30 June?"',
  },
  {
    icon: Search,
    title: 'Using chat history',
    body: 'Open the History panel in the sidebar to resume any previous conversation. Each session is preserved so you can build on prior threads instead of starting from scratch.',
  },
  {
    icon: FilePlus2,
    title: 'Getting cited answers',
    body: 'Ask "cite the relevant section of the DPA" or "which regulation covers that?" and Agentic DPO will respond with section references alongside plain-language explanations.',
  },
  {
    icon: Upload,
    title: 'Upload your own policy',
    body: 'Click the paperclip icon and upload your privacy notice, employee policy or supplier agreement. Then ask questions like "Does my privacy notice satisfy section 25 of the DPA?"',
  },
  {
    icon: MessageSquareX,
    title: 'When NOT to rely on Agentic DPO',
    body: 'Do not rely solely on Agentic DPO for live data-breach reporting decisions, DPO registration submissions or in response to a Commissioner\'s enforcement notice. Always engage qualified professional assistance for time-sensitive or high-stakes matters.',
  },
  {
    icon: Shield,
    title: 'Protect your own data',
    body: 'Never upload documents that contain special-category personal data, children\'s data or privileged legal material unless you have a lawful basis and the upload is protected by your contract with us.',
  },
]

export default function HelpPage() {
  return (
    <ContentLayout>
      <div className="space-y-14">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <HelpCircle className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Help Center
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/50 md:text-base">
            Everything you need to get the best out of Agentic DPO.
          </p>
        </header>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white md:text-2xl">
            <Share2 className="h-5 w-5 text-teal-400" />
            Quick-start guides
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g, i) => {
              const Icon = g.icon
              return (
                <div
                  key={i}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:border-teal-500/30 hover:bg-white/[0.05]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-white">{g.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{g.body}</p>
                </div>
              )
            })}
          </div>
        </section>

        <Separator className="h-px bg-white/10" />

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] transition-colors open:bg-white/[0.04]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-white/90 md:px-6 md:py-5">
                  <span>{f.q}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/40 transition-all group-open:rotate-45 group-open:bg-teal-500/20 group-open:text-teal-300">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-0 text-sm leading-relaxed text-white/65 md:px-6 md:pb-6 md:text-[15px]">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-slate-900/0 to-slate-900/0 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-white md:text-2xl">
            Still stuck? We&apos;re here to help.
          </h2>
          <p className="mt-2 text-sm text-white/65 md:text-[15px]">
            Send us a message and we usually respond within one business day.
          </p>
          <p className="mt-4">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Contact support →
            </a>
          </p>
        </section>
      </div>
    </ContentLayout>
  )
}
