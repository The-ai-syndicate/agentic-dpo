import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "Agentic DPO | Botswana Data Protection Act AI Assistant — Know Your DPA Rights",
  description:
    "Chat with an AI expert on Botswana's Data Protection Act (DPA). Understand your data privacy rights, compliance obligations, breach procedures, and how the DPA protects you. Built by Obokeng Makwati.",
  generator: "Agentic DPO by Obokeng Makwati",
  keywords: [
    "Botswana Data Protection Act",
    "Data Protection Act Botswana",
    "DPA Botswana",
    "Botswana data privacy law",
    "data protection Botswana 2026",
    "Botswana personal data protection",
    "data privacy Botswana",
    "Obokeng Makwati",
    "Agentic DPO",
    "Botswana data protection compliance",
    "data subject rights Botswana",
    "data breach Botswana",
    "Botswana privacy law",
    "ICBC Botswana data protection",
    "data commissioner Botswana",
    "POPIA Botswana",
    "Botswana data protection act explained",
    "data protection officer Botswana",
  ],
  authors: [{ name: "Obokeng Makwati" }],
  creator: "Obokeng Makwati",
  publisher: "Obokeng Makwati",
  applicationName: "Agentic DPO",
  openGraph: {
    type: "website",
    locale: "en_BW",
    siteName: "Agentic DPO — Botswana Data Protection Act Expert",
    title: "Agentic DPO | Botswana Data Protection Act AI Assistant",
    description:
      "Chat with an AI expert on Botswana's Data Protection Act (DPA). Understand your data privacy rights, compliance obligations, breach procedures, and how the DPA protects you. Built by Obokeng Makwati.",
    url: "https://agenticdpo.cloud",
    countryName: "Botswana",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic DPO | Botswana Data Protection Act AI Assistant",
    description:
      "Chat with an AI expert on Botswana's Data Protection Act (DPA). Understand your data privacy rights, compliance obligations, and breach procedures.",
    creator: "@obokengmakwati",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://agenticdpo.cloud",
    languages: {
      "en-BW": "https://agenticdpo.cloud",
    },
  },
  category: "technology",
  classification: "Data Protection & Privacy Law AI Assistant",
  icons: {
    icon: [
      {
        url: "/fav.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/fav.svg",
    apple: "/fav.svg",
  },
  manifest: "/manifest.json",
  other: {
    "geo.region": "BW",
    "geo.placename": "Botswana",
    "og:country-name": "Botswana",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-BW" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q6HFVRD8RR" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-Q6HFVRD8RR');
            `,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        {/* Structured Data — Organization + WebApp + FAQ about Botswana DPA */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "Agentic DPO",
                  description:
                    "AI assistant specialised in the Botswana Data Protection Act. Built by Obokeng Makwati.",
                  url: "https://agenticdpo.cloud",
                  founder: {
                    "@type": "Person",
                    name: "Obokeng Makwati",
                    url: "https://obokengmakwati.com",
                  },
                  address: {
                    "@type": "PostalAddress",
                    addressCountry: "BW",
                  },
                },
                {
                  "@type": "WebApplication",
                  name: "Agentic DPO",
                  url: "https://agenticdpo.cloud",
                  description:
                    "Conversational AI chatbot that answers questions about Botswana's Data Protection Act (DPA), data privacy rights, and compliance.",
                  applicationCategory: "EducationalApplication",
                  operatingSystem: "All",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "BWP",
                  },
                  author: {
                    "@type": "Person",
                    name: "Obokeng Makwati",
                  },
                },
                {
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "What is the Data Protection Act in Botswana?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "The Data Protection Act (DPA) is Botswana's primary law governing the collection, processing, storage, and sharing of personal data. It establishes data subject rights, obligations for data controllers and processors, and the Office of the Data Protection Commissioner.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "What are my rights under the Botswana Data Protection Act?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Under Botswana's DPA, data subjects have rights including: the right to be informed, right of access, right to rectification, right to erasure, right to restrict processing, right to data portability, and the right to object to processing.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "How do I report a data breach in Botswana?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Data breaches in Botswana must be reported to the Data Protection Commissioner within 72 hours of becoming aware of the breach. Affected data subjects must also be notified without undue delay if the breach poses a risk to their rights and freedoms.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Who does the Botswana DPA apply to?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "The Botswana Data Protection Act applies to any person or entity that collects, processes, or stores personal data in Botswana, as well as entities outside Botswana that process data of data subjects in Botswana.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "What is the penalty for non-compliance with Botswana's DPA?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Non-compliance with Botswana's Data Protection Act can result in fines of up to P500,000 or imprisonment for up to 5 years, depending on the nature and severity of the offence. Reputational damage and business disruption are also significant consequences.",
                      },
                    },
                  ],
                },
                {
                  "@type": "WebSite",
                  name: "Agentic DPO",
                  url: "https://agenticdpo.cloud",
                  about: {
                    "@type": "Thing",
                    name: "Botswana Data Protection Act",
                    description:
                      "The Data Protection Act of Botswana governs the processing of personal data, establishes the Data Protection Commissioner, and protects data subject rights.",
                  },
                  inLanguage: "en-BW",
                  copyrightHolder: {
                    "@type": "Person",
                    name: "Obokeng Makwati",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
