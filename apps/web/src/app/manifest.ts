import type { MetadataRoute } from 'next';

// Next.js serves this at /manifest.webmanifest and auto-injects the
// <link rel="manifest"> tag. Colors track the default "loud" light theme.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SketchStrike — Skribbl with a twist',
    short_name: 'SketchStrike',
    description:
      'A drawing-and-guessing party game where every wrong guess costs you.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#fef6e4',
    theme_color: '#fef6e4',
    categories: ['games', 'entertainment', 'social'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
