import type { Metadata } from 'next';
import { Vazirmatn, Space_Grotesk } from 'next/font/google';
import './globals.css';

// Load stunning Vazirmatn for Persian text
const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazir',
  weight: ['300', '400', '500', '700', '900'],
  display: 'swap',
});

// Load Outfit or Space Grotesk for sleek display headings and numbers
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Video Editor Vault | Sync Panel',
  description: 'A modern and minimal environment for saving, categorizing, and tagging video project edits.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="rtl" className={`${vazirmatn.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#09090b] text-[#f4f4f5] antialiased select-none selection:bg-purple-500/30 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
