import { build } from 'esbuild';
await build({ entryPoints: ['src/auth.js'], bundle: true, format: 'esm', outfile: 'public/auth.js', minify: true, platform: 'browser', external: ['/panel.js'] });
