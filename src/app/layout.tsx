import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuantDash — Academic Trading Research",
  description: "Strategy backtesting with academic indicators and Binance data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-[#e8e8ef]">
        {children}
      </body>
    </html>
  );
}
