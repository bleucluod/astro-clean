import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/AppShell";
import { siteConfig } from "@/lib/config/seo";
import "./globals.css";

const vazirmatn = localFont({
  src: "./fonts/vazirmatn/Vazirmatn-Variable.woff2",
  display: "swap",
  variable: "--font-vazirmatn",
  weight: "100 900",
  style: "normal",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: siteConfig.title,
  description: siteConfig.description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/halleus-logo/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/halleus-logo/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
    images: [
      {
        url: "/halleus-logo/social-share-light-1200x630.png",
        width: 1200,
        height: 630,
        alt: "هالیوس؛ آسترولوژی، شناخت و مسیر",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/halleus-logo/social-share-light-1200x630.png"],
  },
};

const baseUrl = siteConfig.url;
const globalStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'هالیوس',
      alternateName: 'Halleus',
      url: baseUrl,
      logo: `${baseUrl}/halleus-logo/favicon-192x192.png`,
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'هالیوس',
      alternateName: 'Halleus',
      inLanguage: 'fa-IR',
      publisher: { '@id': `${baseUrl}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify(globalStructuredData).replace(/</g, '\\u003c'),
        }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
