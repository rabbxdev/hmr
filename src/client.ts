import { WebSocket } from '@rabbx/ws';

export interface HotModule {
  id: string;
  acceptedCallbacks: Array<(mod: any) => void>;
  disposeCallbacks: Array<(data: any) => void>;
}

class HMRErrorOverlay extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        :host {
          position: fixed; inset: 0; width: 100vw; height: 100vh;
          background: rgba(15, 15, 15, 0.9);
          backdrop-filter: blur(6px);
          z-index: 2147483647;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
          color: #ff6b6b;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem; box-sizing: border-box;
        }
        .box {
          background: #1a1a1a; border: 1px solid #333;
          border-radius: 8px; padding: 2rem; max-width: 900px; width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        h2 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #ff8c42; text-transform: uppercase; letter-spacing: 0.05em; }
        pre { background: #111; padding: 1rem; border-radius: 6px; overflow-x: auto; color: #f8f8f2; font-size: 0.9rem; line-height: 1.5; }
      </style>
      <div class="box">
        <h2>[@rabbx/hmr] Compilation Error</h2>
        <pre id="stack"></pre>
      </div>
    `;
  }

  public setError(content: string) {
    const el = this.shadow.getElementById('stack');
    if (el) el.textContent = content;
  }
}

if (!customElements.get('rabbx-hmr-overlay')) {
  customElements.define('rabbx-hmr-overlay', HMRErrorOverlay);
}

class HMRClient {
  private ws!: WebSocket;
  private modules = new Map<string, HotModule>();
  private customListeners = new Map<string, Set<Function>>();
  private overlay: HMRErrorOverlay | null = null;

  constructor(private endpoint = `ws://${location.host}/__rabbx_hmr`) {
    this.init();
  }

  private init() {
    this.ws = new WebSocket(this.endpoint);

    this.ws.addEventListener('message', (e) => {
      try {
        const { type, data } = JSON.parse(e.data as string);

        if (type === 'rabbx:update') {
          this.handleUpdate(data);
        } else if (type === 'rabbx:error') {
          this.showError(data);
        } else if (type === 'rabbx:clear-error') {
          this.clearError();
        } else {
          const handlers = this.customListeners.get(type);
          if (handlers) {
            for (const fn of handlers) fn(data);
          }
        }
      } catch (err) {
        console.error('[@rabbx/hmr] Failed to process incoming message', err);
      }
    });

    this.ws.addEventListener('close', () => {
      // Auto-reconnect polling strategy
      setTimeout(() => this.init(), 1500);
    });
  }

  private handleUpdate(update: { type: 'js' | 'css'; path: string }) {
    this.clearError();
    if (update.type === 'css') {
      const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
      links.forEach((link) => {
        if (link.href.includes(update.path) || link.href.includes('localhost')) {
          link.href = `${link.href.split('?')[0]}?t=${Date.now()}`;
        }
      });
      console.log(`[@rabbx/hmr] CSS updated: ${update.path}`);
      return;
    }

    // Default JS fallback strategy: full reload if module lacks custom accept hook
    window.location.reload();
  }

  private showError(err: { message: string; stack?: string }) {
    if (!this.overlay) {
      this.overlay = document.createElement('rabbx-hmr-overlay') as HMRErrorOverlay;
      document.body.appendChild(this.overlay);
    }
    this.overlay.setError(err.stack || err.message);
  }

  private clearError() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  // Vite-compliant Meta API surface (`import.meta.hot`)
  public createHotContext(id: string) {
    let mod = this.modules.get(id);
    if (!mod) {
      mod = { id, acceptedCallbacks: [], disposeCallbacks: [] };
      this.modules.set(id, mod);
    }

    return {
      accept(cb?: (mod: any) => void) {
        if (cb) mod!.acceptedCallbacks.push(cb);
      },
      dispose(cb: (data: any) => void) {
        mod!.disposeCallbacks.push(cb);
      },
      invalidate() {
        window.location.reload();
      },
      send(event: string, data: any) {
        this.ws.send(JSON.stringify({ type: event, data }));
      },
      on(event: string, cb: Function) {
        if (!this.customListeners.has(event)) {
          this.customListeners.set(event, new Set());
        }
        this.customListeners.get(event)!.add(cb);
      }
    };
  }
}

declare global {
  interface ImportMeta {
    hot?: ReturnType<HMRClient['createHotContext']>;
  }
}

export const hmr = new HMRClient();

