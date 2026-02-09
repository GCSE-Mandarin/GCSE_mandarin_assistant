import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });
const notoSansSC = Noto_Sans_SC({ 
  subsets: ["latin"], 
  weight: ["400", "500", "700"],
  variable: '--font-noto-sans-sc',
  preload: false // optional if characters span is wide
});

export const metadata: Metadata = {
  title: "Mandarin Master Plan",
  description: "IGCSE Preparation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        <div id="root" className="min-h-screen">
            {children}
        </div>
        <Script 
          src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js" 
          strategy="beforeInteractive" 
        />
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" 
          strategy="beforeInteractive" 
        />
      </body>
    </html>
  );
}
