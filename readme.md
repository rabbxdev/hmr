# @rabbx/hmr
<p align="center">
<b>Universal Zero-Dependency Hot Module Replacement Engine</b>

Powered by @rabbx/ws. Vite-compatible import.meta.hot API. Built-in Shadow DOM Error Overlay.
</p>
<p align="center">
<a href="[https://www.npmjs.com/package/@rabbx/hmr](https://www.npmjs.com/package/@rabbx/hmr)"><img src="[https://img.shields.io/npm/v/@rabbx/hmr?color=FF8C42](https://img.shields.io/npm/v/@rabbx/hmr?color=FF8C42)" alt="npm"></a>
<img src="[https://img.shields.io/badge/zero-deps-FF8C42](https://img.shields.io/badge/zero-deps-FF8C42)" alt="zero deps">
<img src="[https://img.shields.io/badge/runtimes-node%20%7C%20bun%20%7C%20deno%20%7C%20workers-FF8C42](https://img.shields.io/badge/runtimes-node%20%7C%20bun%20%7C%20deno%20%7C%20workers-FF8C42)" alt="runtimes">
</p>

## Why @rabbx/hmr?
Traditional HMR solutions are tightly coupled to specific build tools or runtime environments. @rabbx/hmr decouples the HMR transport layer using @rabbx/ws to deliver a lightweight, high-performance, and universal development experience.
 * Universal Runtimes - Native out-of-the-box integration with Node.js, Bun, Deno, and Cloudflare Workers.
 * Zero Dependencies - Extremely lightweight bundle footprint with no external dependency bloat.
 * Encapsulated Error Overlay - Isolated visual build-error reporting using a native Shadow DOM component (<rabbx-hmr-overlay>) that guarantees application styles never conflict with or bleed into error readouts.
 * Vite DX Standards - Full compliance with standard import.meta.hot lifecycle hooks (accept, dispose, invalidate, custom communication channels).

### Installation
```bash
bun add @rabbx/hmr @rabbx/ws
npm i @rabbx/hmr @rabbx/ws
pnpm add @rabbx/hmr @rabbx/ws
```

## Architecture & Design Patterns
 * Mediator Pattern (HMRServer): Centralizes message routing and client state tracking, cleanly separating file system watchers from socket infrastructure.
 * Observer Pattern (import.meta.hot): Allows individual modules to register state preservation hooks and self-acceptance handlers dynamically.
 * Encapsulated UI Layer: The error overlay runs inside an open Shadow DOM container to maintain total style isolation from host applications.

## Server Integration

### Bun
```ts
import { HMRServer } from '@rabbx/hmr/server';

const { config, server: hmrServer } = HMRServer.createBun({ path: '/__rabbx_hmr' });

Bun.serve({
  port: 3000,
  fetch: config.fetch,
  websocket: config.websocket,
});

// Broadcast file changes from your file watcher
watcher.on('change', (path) => {
  hmrServer.notifyUpdate({ 
    type: path.endsWith('.css') ? 'css' : 'js', 
    path 
  });
});
```

## Node.js
```ts
import { createServer } from 'http';
import { HMRServer } from '@rabbx/hmr/server';

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Development Environment Active</h1>');
});

const hmrServer = HMRServer.attachNode(httpServer, { path: '/__rabbx_hmr' });

httpServer.listen(3000, () => {
  console.log('[@rabbx/hmr] Dev server running on http://localhost:3000');
});
```

## Deno
```ts
import { HMRServer } from '@rabbx/hmr/server';

const hmrServer = new HMRServer({ path: '/__rabbx_hmr' });

Deno.serve({ port: 3000 }, (req) => {
  const res = hmrServer.handleDeno(req);
  if (res) return res;
  return new Response('Deno Dev Server Active');
});
```
## Cloudflare Workers
```ts
import { HMRServer } from '@rabbx/hmr/server';

const hmrServer = new HMRServer({ path: '/__rabbx_hmr' });

export default {
  fetch(req: Request, env: any, ctx: any) {
    const res = hmrServer.handleRequest(req);
    if (res) return res;
    return new Response('Worker HMR Endpoint', { status: 200 });
  }
};
```
## Client Usage (import.meta.hot)

Import the client bundle at your application entry script to establish the HMR socket listener and inject the error overlay handler:
```ts
import '@rabbx/hmr/client';

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log('Module hot-swapped successfully!');
  });

  import.meta.hot.dispose((data) => {
    // Save transient UI state before execution context reloads
    data.scrollPosition = window.scrollY;
  });

  import.meta.hot.on('custom-server-event', (data) => {
    console.log('Received custom signal:', data);
  });
}
```
## API Reference
HMRServer
 * new HMRServer(options?: { path?: string }) - Instantiates an isolated HMR websocket instance.
 * HMRServer.attachNode(httpServer, options) - Automatically binds and upgrades an incoming Node.js HTTP server.
 * HMRServer.createBun(options) - Returns { config, server } configured for Bun.serve.
 * server.send(event, data) - Broadcasts a raw payload across all active connections.
 * server.notifyUpdate({ type: 'js' | 'css', path: string }) - Triggers asset update strategies on the browser client.
 * server.notifyError(err: { message: string, stack?: string }) - Renders the Shadow DOM error overlay on connected browser windows.
 * server.clearError() - Clears and removes the active error overlay.
 * server.handleDeno(req) - Deno request upgrade handler.
 * server.handleRequest(req) - Cloudflare Worker fetch handler.
License
MIT
