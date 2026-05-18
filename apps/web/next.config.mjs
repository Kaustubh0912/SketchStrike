/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sketchstrike/shared'],
  webpack: (config, { isServer }) => {
    // The shared package is compiled as ESM (NodeNext on the server side) so
    // its relative imports use `.js` suffixes that actually point at `.ts`
    // sources. Webpack needs to know to fall through to TS.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };

    // Konva's node entry pulls in the optional native `canvas` package. We only
    // ever render Konva on the client (DrawingCanvas is dynamic with ssr:false),
    // so mark it external so webpack doesn't try to resolve it during SSR build.
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        { canvas: 'commonjs canvas' },
      ];
    }

    return config;
  },
};

export default nextConfig;
