import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Collectief WIT en ZWET APP",
  description: "Pronostiek, community en clubplatform.",

  openGraph: {
    title: "Collectief WIT en ZWET APP",
    description: "Pronostiek, community en clubplatform.",
    url: "https://app.collectiefwitenzwet.be",
    siteName: "Collectief WIT en ZWET APP",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Collectief WIT en ZWET",
      },
    ],
    locale: "nl_BE",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Collectief WIT en ZWET APP",
    description: "Pronostiek, community en clubplatform.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}

