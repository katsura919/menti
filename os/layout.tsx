// Bare layout ~ suppresses global nav, footer, and cookie banner
// Loads Abie Maxey brand fonts (Host Grotesk + Instrument Serif)
// for the AM theme. TM theme keeps Manrope + Cormorant from root.

import { Host_Grotesk, Instrument_Serif } from 'next/font/google';

const hostGrotesk = Host_Grotesk({
  variable: '--font-host-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata = {
  title: 'Event OS ~ Claude for Business',
  robots: { index: false, follow: false },
};

export default function OSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${hostGrotesk.variable} ${instrumentSerif.variable}`}>
      {children}
    </div>
  );
}
