import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/LenisProvider";
import { AppProvider } from "@/context/AppContext";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FORMA — Premium Workout Ledger & Autonomic Recovery Tracker",
  description: "Track training volume tonnage, calculate CNS fatigue, and automate progressive overload. An offline-first, zero-fluff training ledger designed for serious lifters.",
  keywords: ["Fitness", "Progressive Overload", "CNS Readiness", "1RM Calculator", "Tonnage Tracking", "Bodybuilding", "Powerlifting", "Genesis Split", "Forma"],
  authors: [{ name: "FORMA Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FORMA",
  },
  openGraph: {
    title: "FORMA — The Sports Science Workout Ledger",
    description: "Calibrate your training weight by CNS readiness, track hybrid 1RM metrics, and log sets with a premium, zero-distraction dark glassmorphic layout.",
    url: "https://forma.dev",
    siteName: "FORMA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FORMA — Calibrated Strength Ledger",
    description: "Autonomic recovery tracking meets automated progressive overload. Log workouts offline with zero distraction.",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020202",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} bg-obsidian text-foreground h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col overflow-x-hidden selection:bg-silver/20 selection:text-white">
        <AppProvider>
          <LenisProvider>
            {children}
          </LenisProvider>
        </AppProvider>
      </body>
    </html>
  );
}
