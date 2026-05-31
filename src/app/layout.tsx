import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserPrefsProvider } from "@/contexts/UserPrefsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import AuthModalWrapper from "@/components/auth/AuthModalWrapper";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.inshortsnepal.org";

export const metadata: Metadata = {
  title: "InShorts Nepal - Nepal News in 60 Seconds",
  description: "Nepal news in 60 seconds. Breaking news, politics, sports, tech & more in Nepali, English and 8 languages.",
  keywords: "Nepal news, Nepali news, InShorts Nepal, short news, समाचार, नेपाल, news in 60 seconds",
  manifest: "/manifest.json",
  metadataBase: new URL(BASE_URL),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InShorts Nepal",
  },
  openGraph: {
    title: "InShorts Nepal 🇳🇵 — News in 60s",
    description: "Nepal's fastest news app. Stories in 60 seconds.",
    type: "website",
    url: BASE_URL,
    siteName: "InShorts Nepal",
    images: [
      {
        url: `${BASE_URL}/logo-primary-dark.png`,
        width: 1200,
        height: 630,
        alt: "InShorts Nepal — News in 60s",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InShorts Nepal — News in 60s",
    description: "Nepal's fastest news app. Stories in 60 seconds.",
    images: [`${BASE_URL}/logo-primary-dark.png`],
  },
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-128.png", sizes: "128x128", type: "image/png" },
    ],
    apple: [
      { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon-32.png",
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E8152A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ne" className="dark">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/icon-64.png" />
        <link rel="icon" type="image/png" sizes="128x128" href="/icon-128.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="InShorts Nepal" />
        <meta name="application-name" content="InShorts Nepal" />
      </head>
      <body className="bg-black text-white antialiased overflow-hidden">
        <AuthProvider>
          <UserPrefsProvider>
            <GamificationProvider>
              {children}
              <AuthModalWrapper />
            </GamificationProvider>
          </UserPrefsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
