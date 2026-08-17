// build.ts
await Bun.build({
  entrypoints: ['./src/server.ts', './src/client.ts'],
  outdir: './dist',
  target: 'neutral',
  format: 'esm',
  sourcemap: 'external',
  minify: true,
});

console.log('[@rabbx/hmr] Build completed successfully.');
