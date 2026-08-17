// src/server.ts
import { WebSocketServer, createBunServer, createServer as createNodeWSS } from '@rabbx/ws/server';
import type { RabbitSocket } from '@rabbx/ws';
import type { Server as NodeHttpServer } from 'http';

export interface HMRServerOptions {
  path?: string;
}

export class HMRServer {
  private wss: WebSocketServer;
  private clients = new Set<RabbitSocket>();

  constructor(options: HMRServerOptions = {}) {
    const path = options.path || '/__rabbx_hmr';
    this.wss = new WebSocketServer({ path });
    this.setupListeners();
  }

  private setupListeners() {
    this.wss.addEventListener('connection', ({ detail: { socket } }) => {
      this.clients.add(socket);
      
      socket.addEventListener('close', () => {
        this.clients.delete(socket);
      });
    });
  }

  /** Automatically attach to a Node.js HTTP Server */
  public static attachNode(httpServer: NodeHttpServer, options: HMRServerOptions = {}) {
    const server = new HMRServer(options);
    server.wss = createNodeWSS(httpServer, { path: options.path || '/__rabbx_hmr' });
    server.setupListeners();
    return server;
  }

  /** Automatically configure for Bun.serve */
  public static createBun(options: HMRServerOptions = {}) {
    const path = options.path || '/__rabbx_hmr';
    const { config, server: wssInstance } = createBunServer({ path });
    
    const server = new HMRServer(options);
    server.wss = wssInstance as unknown as WebSocketServer;
    server.setupListeners();

    return {
      config,
      server
    };
  }

  public send(event: string, data: unknown) {
    const payload = JSON.stringify({ type: event, data, timestamp: Date.now() });
    for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    }
  }

  public notifyUpdate(update: { type: 'js' | 'css'; path: string }) {
    this.send('rabbx:update', update);
  }

  public notifyError(err: { message: string; stack?: string }) {
    this.send('rabbx:error', err);
  }

  public clearError() {
    this.send('rabbx:clear-error', {});
  }

  public handleDeno(req: Request) {
    return this.wss.handleDeno(req);
  }

  public handleRequest(req: Request) {
    return this.wss.handleRequest(req);
  }
}
