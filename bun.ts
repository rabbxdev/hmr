import { HMRServer } from './src/server.ts';

const { config, server: hmrServer } = HMRServer.createBun({ path: '/__rabbx_hmr' });
console.log(hmrServer)

Bun.serve({
  port: 3000,
  fetch: config.fetch,
  websocket: config.websocket,
});

// Broadcast file updates
//watcher.on('change', (path) => {
 // hmrServer.notifyUpdate({ type: path.endsWith('.css') ? 'css' : 'js', path });
//});
