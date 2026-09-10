import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Font configuration
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "https://forgeworks-platform.vercel.app",
  ),
  title: {
    default: "Forgeworks (Beta)",
    template: "%s",
  },
  description:
    "Create, manage, and share your AI characters. Custom forms, visual boards, real collaboration — everything in one place for character creators.",
  keywords: [
    "Forgeworks",
    "bot creator",
    "character card",
    "AI chatbot",
    "bot manager",
    "character creator",
    "commission form",
    "creator tools",
    "character management",
    "AI character editor",
  ],
  authors: [{ name: "Forgeworks" }],
  creator: "Forgeworks",
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Forgeworks (Beta)",
    title: "Forgeworks (Beta) — The toolkit for character creators",
    description:
      "Create, manage, and share your AI characters. Custom forms, visual boards, real collaboration — everything in one place.",
    images: [
      {
        url: "/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: "Forgeworks Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forgeworks (Beta) — The toolkit for character creators",
    description:
      "Create, manage, and share your AI characters. Custom forms, visual boards, real collaboration — everything in one place.",
    images: ["/web-app-manifest-512x512.png"],
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

// Viewport configuration
export const viewport: Viewport = {
  themeColor: "#1a1625",
  width: "device-width",
  initialScale: 1,
};

// Inline script to prevent FOUC — runs before React hydration
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('theme');
      var d = t === 'light' ? 'light' : t === 'dark' ? 'dark' : t === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : 'dark';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(d);
    } catch(e) {}
  })()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider defaultTheme="dark">
          <CustomScrollbar />
          {children}
          <Toaster />
          {process.env.NODE_ENV === "production" && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  );
}
