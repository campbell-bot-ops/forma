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
  title: "FORMA — Performance Architecture",
  description: "Precision Recomposition for the Creative Class. Minimalist, auto-regulated overload engine.",
  keywords: ["Fitness", "Minimalist Workout", "Genesis Split", "Hypertrophy", "Creative Class", "Forma"],
  authors: [{ name: "FORMA Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FORMA",
  },
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
