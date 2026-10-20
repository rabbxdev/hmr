// build.ts
await Bun.build({
  entrypoints: ['./src/client.ts'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  sourcemap: 'external',
  external:["node:*","fs","child_process","path"]
  //minify: true,
});

console.log('[@rabbx/hmr] client Build completed successfully.');
// build.ts server
await Bun.build({
  entrypoints: ['./src/server.ts'],
  outdir: './dist',
  target: 'macro',
  format: 'esm',
  sourcemap: 'external',
  external:["node:*","fs","child_process","path"]
  //minify: true,
});

console.log('[@rabbx/hmr] server Build completed successfully.');