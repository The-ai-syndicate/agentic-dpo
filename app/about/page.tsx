import ContentLayout from '../content-layout'
import { Info, Bot, Shield, Zap, Globe, Heart } from 'lucide-react'

export const metadata = {
  title: 'About Agentic DPO | Botswana Data Protection Act AI Expert',
  description:
    'Learn about Agentic DPO — the AI-powered assistant helping Botswana citizens, businesses and officers understand the Data Protection Act.',
}

const highlights = [
  {
    icon: Bot,
    title: 'AI-Powered Expert',
    text: 'Built on a specialised training corpus of Botswana\'s Data Protection Act, regulatory guidance and real-world compliance scenarios.',
  },
  {
    icon: Shield,
    title: 'Privacy-First Design',
    text: 'No conversations are used for model training. Your chats belong to you and are encrypted end-to-end in transit.',
  },
  {
    icon: Zap,
    title: 'Instant Answers',
    text: 'Skip the 90-page legal PDF. Ask plain-language questions and get cited, structured responses in seconds.',
  },
  {
    icon: Globe,
    title: 'Built For Botswana',
    text: 'Contextualised to Botswana law, institutions, enforcement reality and the Office of the Data Protection Commissioner.',
  },
]

export default function AboutPage() {
  return (
    <ContentLayout>
      <div className="space-y-14">
        <header className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <Info className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              About Agentic DPO
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
              An AI Data Protection Officer for every citizen, small business and
              compliance team in Botswana.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-xl font-semibold text-white">Our mission</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">
            Botswana's Data Protection Act is landmark legislation — but understanding
            it should not require a law degree. Agentic DPO demystifies the DPA by
            providing instant, conversational answers to questions about data subject
            rights, compliance obligations, breach reporting and the powers of the Data
            Protection Commissioner. We believe privacy literacy is civic infrastructure.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-[15px]">
            We also help small to mid-sized organisations, DPOs and lawyers rapidly
            research DPA scenarios without wading through hundreds of pages of legislation.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {highlights.map((h, i) => {
            const Icon = h.icon
            return (
              <div
                key={i}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-teal-500/30 hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{h.text}</p>
              </div>
            )
          })}
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-teal-500/10 via-slate-900/0 to-slate-900/0 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <Heart className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Built with care in Botswana 🇧🇼</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">
                Agentic DPO was designed and developed by{' '}
                <a
                  href="https://obokengmakwati.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-400 underline decoration-teal-400/30 underline-offset-2 transition-colors hover:decoration-teal-400"
                >
                  Obokeng Makwati
                </a>{' '}
                — a software engineer and compliance technologist building pragmatic
                tools for African regulatory environments.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/60 md:text-[15px]">
                This project is not affiliated with the Government of Botswana or the
                Office of the Data Protection Commissioner. For authoritative legal
                advice, please consult a qualified attorney or the Commissioner.
              </p>
            </div>
          </div>
        </section>
      </div>
    </ContentLayout>
  )
}
