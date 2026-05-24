import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import ThemeProvider from '@/components/ThemeProvider';
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar';
import InstallPrompt from '@/components/pwa/InstallPrompt';

export const metadata: Metadata = {
  title: 'SketchStrike — Skribbl with a twist',
  description: 'A drawing-and-guessing party game where every wrong guess costs you.',
  applicationName: 'SketchStrike',
  appleWebApp: {
    capable: true,
    title: 'SketchStrike',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Updated at runtime to match the active theme (see syncThemeColor).
  themeColor: '#fef6e4',
};

// Apply the saved theme + mode before the first paint to avoid a flash.
const themeBootScript = `(function(){try{var t=localStorage.getItem('sketchstrike:theme');var m=localStorage.getItem('sketchstrike:mode');var h=document.documentElement;h.setAttribute('data-theme',(t==='loud'||t==='sharp'||t==='cozy')?t:'loud');h.setAttribute('data-mode',(m==='light'||m==='dark')?m:'light');}catch(e){}})();`;

// Chrome fires `beforeinstallprompt` early — often before React mounts. Capture
// it globally here so InstallPrompt can read it on mount and never miss it.
const installCaptureScript = `(function(){window.__ssInstallEvent=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__ssInstallEvent=e;window.dispatchEvent(new Event('ss:install-available'));});window.addEventListener('appinstalled',function(){window.__ssInstallEvent=null;window.dispatchEvent(new Event('ss:app-installed'));});})();`;

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
        <script dangerouslySetInnerHTML={{ __html: installCaptureScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <InstallPrompt />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
