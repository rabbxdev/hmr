import { WebSocketServer, createBunServer, createServer as createNodeWSS } from '@rabbx/ws/server';
import type { RabbitSocket } from '@rabbx/ws';
import type { Server as NodeHttpServer } from 'node:http';
import { pack, unpack } from "msgpackr";

export interface HMRServerOptions {
  path?: string;
  maxPayload?: number;
}

export interface SocketData {
  socket: RabbitSocket;
  data?: unknown;
  client?: Set<RabbitSocket>;
}

type MessageCallback = (data: SocketData) => void;
type CloseCallback = (data: SocketData) => void;

export class HMRServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<RabbitSocket>();
  private messageListeners = new Map<string, Set<MessageCallback>>();
  private closeListeners = new Set<CloseCallback>();

  constructor(options: HMRServerOptions = {}) {
    const path = options.path || '/__rabbx_hmr';
    const maxPayload = options.maxPayload ?? 60 * 1024;
    
    this.wss = new WebSocketServer({ path, maxPayload });
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.wss) return;

    this.wss.addEventListener('connection', ({ detail: { socket } }) => {
      this.clients.add(socket);

      socket.addEventListener('message', (e) => {
        this.handleMessage(socket, e.data);
      });

      socket.addEventListener('close', () => {
        this.clients.delete(socket);
        this.handleClose(socket);
      });
    });
  }

  private handleMessage(socket: RabbitSocket, data: unknown): void {
    let payload: unknown;
    
    try {
      payload = unpack(data as ArrayBuffer);
    } catch {
      payload = data;
    }

    if (payload && typeof payload === 'object' && payload !== null && 'type' in payload) {
      const eventType = (payload as { type: string }).type;
      const listeners = this.messageListeners.get(eventType);
      
      if (listeners) {
        for (const cb of listeners) {
          try {
            cb({ socket, data: payload });
          } catch (err) {
            console.error(`Error in message listener for event "${eventType}":`, err);
          }
        }
      }
    }

    // Notify wildcard listeners
    const wildcardListeners = this.messageListeners.get('*');
    if (wildcardListeners) {
      for (const cb of wildcardListeners) {
        try {
          cb({ socket, data: payload ?? data });
        } catch (err) {
          console.error('Error in wildcard message listener:', err);
        }
      }
    }
  }

  private handleClose(socket: RabbitSocket): void {
    for (const cb of this.closeListeners) {
      try {
        cb({ socket, client: this.clients });
      } catch (err) {
        console.error('Error in close listener:', err);
      }
    }
  }

  /** Automatically attach to a Node.js HTTP Server */
  public static attachNode(httpServer: NodeHttpServer, options: HMRServerOptions = {}) {
    const path = options.path || '/__rabbx_hmr';
    const maxPayload = options.maxPayload ?? 60 * 1024;
    
    const server = Object.create(HMRServer.prototype) as HMRServer;
    server.clients = new Set<RabbitSocket>();
    server.messageListeners = new Map<string, Set<MessageCallback>>();
    server.closeListeners = new Set<CloseCallback>();
    
    server.wss = createNodeWSS(httpServer, { path, maxPayload });
    server.setupListeners();
    
    return server;
  }

  /** Automatically configure for Bun.serve */
  public static createBun(options: HMRServerOptions = {}) {
    const path = options.path || '/__rabbx_hmr';
    const { config, server: wssInstance } = createBunServer({ path });

    const server = Object.create(HMRServer.prototype) as HMRServer;
    server.clients = new Set<RabbitSocket>();
    server.messageListeners = new Map<string, Set<MessageCallback>>();
    server.closeListeners = new Set<CloseCallback>();
    
    server.wss = wssInstance as unknown as WebSocketServer;
    server.setupListeners();

    return {
      config,
      server
    };
  }

  public send(event: string, data: unknown): void {
    if (!this.wss) return;
    
    const payload = pack({ type: event, data });
    const clients = Array.from(this.clients);
    
    for (const client of clients) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(payload);
        } catch {
          this.clients.delete(client);
        }
      }
    }
  }

  public on(event: string, cb: MessageCallback): () => void {
    if (!event || typeof event !== 'string' || typeof cb !== 'function') {
      throw new Error('Invalid arguments: event must be a non-empty string, cb must be a function');
    }

    let listeners = this.messageListeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.messageListeners.set(event, listeners);
    }
    listeners.add(cb);

    return () => {
      listeners?.delete(cb);
      if (listeners && listeners.size === 0) {
        this.messageListeners.delete(event);
      }
    };
  }

  public emit(event: string, data: unknown): void {
    if (event && data != null) {
      this.send(event, data);
    }
  }

  public onClose(cb: CloseCallback): () => void {
    if (typeof cb !== 'function') {
      throw new Error('Callback must be a function');
    }

    this.closeListeners.add(cb);

    return () => {
      this.closeListeners.delete(cb);
    };
  }

  public notifyUpdate(update: { type: 'js' | 'css'; path: string }): void {
    this.send('rabbx:update', update);
  }

  public notifyError(err: { message: string; stack?: string }): void {
    this.send('rabbx:error', err);
  }

  public clearError(): void {
    this.send('rabbx:clear-error', {});
  }

  public handleDeno(req: Request): Response | undefined {
    return this.wss?.handleDeno(req);
  }

  public handleRequest(req: Request): Response | undefined {
    return this.wss?.handleRequest(req);
  }
}