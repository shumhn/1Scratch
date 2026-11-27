import type { Metadata } from "next";
import { Inter, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./studio.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import BrandMark from "@/components/BrandMark";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "1Scratch — Scratch. Match. Own.",
  description:
    "The stock scratcher on Solana. Scratch, match three tickers, and claim devnet stock tokens. Powered by MagicBlock VRF and Ephemeral Rollups.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
          <footer className="site-footer">
            <div className="page-container">
              <div className="footer-top">
                <div>
                  <Link href="/" aria-label="1Scratch home">
                    <BrandMark />
                  </Link>
                  <p>A little luck. A piece of the market.</p>
                </div>
                <div className="footer-links">
                  <a
                    className="text-link"
                    href="https://docs.magicblock.gg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    MagicBlock
                  </a>
                  <a
                    className="text-link"
                    href="https://explorer.solana.com/address/CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP?cluster=devnet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Program ↗
                  </a>
                </div>
              </div>
              <div className="footer-bottom">
                <p>Devnet edition · Tokens are not company shares.</p>
                <p>Built on Solana. Randomness by MagicBlock.</p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
