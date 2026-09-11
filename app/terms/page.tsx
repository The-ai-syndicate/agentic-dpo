import ContentLayout from '../content-layout'
import { FileText, Scale, CheckCircle2, AlertTriangle, Ban, Shield, MessageCircle } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service | Agentic DPO',
  description:
    'Terms of Service for Agentic DPO — your rights, responsibilities, acceptable use, disclaimers and liability limits when using the Botswana DPA AI assistant.',
}

const sections = [
  {
    icon: CheckCircle2,
    title: '1. Acceptance of terms',
    body: `By accessing or using Agentic DPO ("the Service"), operated by Obokeng Makwati ("we", "us", "our"), you acknowledge that you have read, understood and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must cease using the Service immediately.

You confirm that you are at least 18 years of age or have the consent of a parent or legal guardian. If you are using the Service on behalf of an organisation, you warrant that you have authority to bind that entity to these terms.`,
  },
  {
    icon: Scale,
    title: '2. Nature of the Service',
    body: `Agentic DPO is a generative AI tool that provides general educational and informational responses about the Botswana Data Protection Act and related topics. Key clarifications:
- Responses are **NOT legal advice** and do not create an attorney–client relationship.
- Our outputs may contain errors, omissions or outdated interpretations. Always verify critical positions against the authoritative DPA text, delegated legislation and, where appropriate, a duly admitted legal practitioner.
- The Service does not lodge complaints with the Data Protection Commissioner, submit DPO registrations, or take legally binding action on your behalf.`,
  },
  {
    icon: Shield,
    title: '3. Your account & responsibilities',
    body: `You are responsible for:
- Maintaining the confidentiality of any session identifiers or credentials linked to your use of the Service.
- All activities conducted under your sessions — including any content you upload via our document-ingestion features.
- Ensuring that any personal data you upload complies with the Data Protection Act and that you have the necessary legal basis to share it.

You must not:
- Circumvent rate limits, authentication controls or abuse-prevention systems.
- Use the Service to generate unlawful, infringing, harassing, defamatory, deceptive or malware-bearing content.
- Attempt to reverse-engineer, extract or repurpose our proprietary models, embeddings or pipelines.
- Use the Service for bulk AI-as-a-service resale without our written commercial agreement.`,
  },
  {
    icon: Ban,
    title: '4. Prohibited uses',
    body: `The following uses are strictly prohibited:
1. Generating content that infringes copyright, trade-mark or the confidential information of third parties.
2. Deceptively passing off AI-generated text as unattributed human-authored legal advice.
3. Submitting personal data of children or special-category (sensitive) personal data without a lawful basis under the DPA.
4. Using the Service to perform or facilitate scraping, spam, phishing, credential stuffing or account-takeover activity.
5. Running penetration tests or vulnerability scans against our infrastructure without prior written consent.

We reserve the right to suspend or permanently block any user or IP address we reasonably believe is violating this section.`,
  },
  {
    icon: FileText,
    title: '5. Intellectual property',
    body: `- Our trademarks, branding, UI design and software code remain our exclusive property.
- The underlying Data Protection Act text is a public document of the Republic of Botswana; our curation, indexing and training artefacts are © Agentic DPO.
- For responses you receive through the Service, you retain ownership of your prompts and we grant you a worldwide, non-exclusive, royalty-free licence to use the output text for lawful purposes.
- As with any generative AI output, you are solely responsible for verifying originality before using responses in high-stakes or regulated contexts (contracts, filings, advertising claims).`,
  },
  {
    icon: AlertTriangle,
    title: '6. Disclaimers & limitation of liability',
    body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED OR STATUTORY — INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE OR FREE OF HARMFUL COMPONENTS.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL AGENTIC DPO OR ITS FOUNDERS, CONTRACTORS, OR VENDORS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE OR EXEMPLARY DAMAGES (INCLUDING LOSS OF PROFIT, REVENUE, DATA OR GOODWILL) ARISING OUT OF OR IN CONNECTION WITH THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE LIABILITY UNDER THIS AGREEMENT, WHETHER IN CONTRACT, DELICT OR OTHERWISE, SHALL NOT EXCEED THE SUM OF BWP 500 (FIVE HUNDRED BOTSWANA PULA).

Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under the laws of Botswana.`,
  },
  {
    icon: MessageCircle,
    title: '7. Termination, amendments & contact',
    body: `- Either party may terminate this agreement at any time by ceasing use of the Service.
- We may modify these terms from time to time. Material changes will be indicated by updating the "Last updated" date, and your continued use of the Service after that date constitutes acceptance of the amended terms.
- These terms are governed by the laws of the Republic of Botswana. Any dispute shall be submitted to the non-exclusive jurisdiction of the courts of Botswana.
- For questions, complaints or commercial enquiries, email **terms@agenticdpo.cloud**.`,
  },
]

export default function TermsPage() {
  return (
    <ContentLayout>
      <div className="space-y-12">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Terms of Service
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/50 md:text-base">
            Last updated: {new Date().toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' • '}
            Please read these terms carefully before using Agentic DPO.
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
                <div className="mt-4 space-y-2.5 whitespace-pre-line text-sm leading-relaxed text-white/70 md:text-[15px]">
                  {s.body.split('\n').map((line, j) => {
                    if (/^\d+\.\s/.test(line.trim()) && line.trim().length < 160) {
                      return <p key={j}>{line}</p>
                    }
                    if (/^-\s/.test(line)) {
                      return (
                        <div key={j} className="flex gap-2 pl-4">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/60" />
                          <p>{line.replace(/^-\s*/, '')}</p>
                        </div>
                      )
                    }
                    if (line.trim() === '') return <div key={j} className="h-1" />
                    return <p key={j}>{line}</p>
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <footer className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center text-xs leading-relaxed text-amber-200/80 md:text-[13px]">
          <p className="font-semibold text-amber-200/90">
            ⚠️ Not legal advice
          </p>
          <p className="mt-2">
            Agentic DPO outputs are general informational summaries only. Always confirm
            compliance positions with the Data Protection Commissioner or an admitted
            legal practitioner.
          </p>
        </footer>
      </div>
    </ContentLayout>
  )
}
