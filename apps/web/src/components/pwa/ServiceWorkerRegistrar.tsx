'use client';

import { useEffect } from 'react';

// Registers the service worker so the app is installable and the shell is
// cached. Only runs in production builds — registering a SW in `next dev`
// fights with HMR and can serve stale chunks.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('SW registration failed:', err);
      });
    };

    // Wait for load so registration doesn't compete with first paint.
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
