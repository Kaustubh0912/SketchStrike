import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'SketchStrike — Skribbl with a twist',
  description: 'A drawing-and-guessing party game where every wrong guess costs you.',
};

// Apply the saved theme + mode before the first paint to avoid a flash.
const themeBootScript = `(function(){try{var t=localStorage.getItem('sketchstrike:theme');var m=localStorage.getItem('sketchstrike:mode');var h=document.documentElement;h.setAttribute('data-theme',(t==='loud'||t==='sharp'||t==='cozy')?t:'loud');h.setAttribute('data-mode',(m==='light'||m==='dark')?m:'light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="loud" data-mode="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
