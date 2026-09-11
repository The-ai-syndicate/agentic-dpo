"use client"
import { ChatInterface } from "./components/chat-interface"
import Script from "next/script"

export default function Home() {
  return (
    <>
      {/* Breadcrumb structured data for Botswana DPA */}
      <Script id="breadcrumb-schema" type="application/ld+json" strategy="afterInteractive">
        {`
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Botswana Data Protection Act",
                "item": "https://agenticdpo.cloud"
              }
            ]
          }
        `}
      </Script>
      <div className="h-screen w-full">
        <ChatInterface />
      </div>
    </>
  )
}
