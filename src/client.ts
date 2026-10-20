import { WebSocket } from '@rabbx/ws';
import Emitter from "eventemitter3";
import {pack,unpack} from "msgpackr";
const emitter = new Emitter();
export interface HotModule {
  id: string;
  acceptedCallbacks: Array<(mod: any) => void>;
  disposeCallbacks: Array<(data: any) => void>;
}

class HMRErrorOverlay extends HTMLElement {
  private shadow: ShadowRoot;
  private $closeBtn!: HTMLButtonElement;
  private $copyBtn!: HTMLButtonElement;
  private $stack!: HTMLElement;
  private rawErrorText: string = '';

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 15, 15, 0.9);
          backdrop-filter: blur(6px);
          z-index: 2147483647;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: #ff6b6b;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          box-sizing: border-box;
          opacity: 1;
          transition: opacity 0.15s ease-in-out;
        }

        .box {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 1.5rem 2rem;
          max-width: 900px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 85vh;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #282828;
          padding-bottom: 0.75rem;
        }

        h2 {
          margin: 0;
          font-size: 1.05rem;
          color: #ff8c42;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn {
          background: transparent;
          border: 1px solid #333;
          color: #a0a0a0;
          font-family: inherit;
          font-size: 0.8rem;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn:hover {
          background: #262626;
          color: #f8f8f2;
          border-color: #444;
        }

        .btn:active {
          transform: scale(0.96);
        }

        #overlay_close_btn {
          font-size: 1rem;
          line-height: 1;
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 50%;
          color: #ff6b6b;
          border-color: rgba(255, 107, 107, 0.2);
        }

        #overlay_close_btn:hover {
          background: rgba(255, 107, 107, 0.15);
          border-color: #ff6b6b;
          color: #ffffff;
        }

        pre {
          background: #111;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          overflow-y: auto;
          color: #f8f8f2;
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
          border: 1px solid #222;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 60vh;
        }

        pre .highlight-file { color: #8be9fd; text-decoration: underline; }
        pre .highlight-line { color: #50fa7b; font-weight: bold; }
        pre .highlight-err  { color: #ff5555; font-weight: bold; }

        pre::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        pre::-webkit-scrollbar-track {
          background: #111;
        }
        pre::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        pre::-webkit-scrollbar-thumb:hover {
          background: #444;
        }

        .footer-hint {
          font-size: 0.75rem;
          color: #666;
          display: flex;
          justify-content: space-between;
          margin-top: -0.25rem;
        }
      </style>
      <div id="rabbx_error_overlay" class="box" role="dialog" aria-modal="true" aria-labelledby="title">
        <div class="header">
          <h2 id="title">
            <span>⚠️</span> [@rabbx/hmr] Compilation Error
          </h2>
          <div class="header-actions">
            <button id="copy_btn" class="btn" title="Copy stack trace">Copy Error</button>
            <button id="overlay_close_btn" class="btn" title="Close Overlay (Esc)">✕</button>
          </div>
        </div>
        <pre id="stack"></pre>
        <div class="footer-hint">
          <span>Fix the code error to clear this overlay automatically.</span>
          <span>Press <kbd style="background:#222;padding:1px 4px;border-radius:3px;border:1px solid #333;">Esc</kbd> to dismiss</span>
        </div>
      </div>
    `;

    this.$closeBtn = this.shadow.getElementById('overlay_close_btn') as HTMLButtonElement;
    this.$copyBtn = this.shadow.getElementById('copy_btn') as HTMLButtonElement;
    this.$stack = this.shadow.getElementById('stack') as HTMLElement;
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public connectedCallback() {
    this.$closeBtn.addEventListener('click', () => this.dismiss());
    this.$copyBtn.addEventListener('click', () => this.copyStack());
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public disconnectedCallback() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.dismiss();
    }
  }

  public setError(rawError: string | { stack?: string; message?: string } | any) {
    const cleanText = typeof rawError === 'string' 
      ? rawError.replace(/\u001b\[.*?m/g, '')
      : rawError?.stack || rawError?.message || String(rawError);

    this.rawErrorText = cleanText;

    const formatted = cleanText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/((?:[A-Za-z]:\\|\/)[^\s:]+):(\d+):(\d+)/g, 
        '<span class="highlight-file">$1</span>:<span class="highlight-line">$2:$3</span>');

    if (this.$stack) {
      this.$stack.innerHTML = formatted;
    }
  }

  private async copyStack() {
    if (!this.rawErrorText) return;
    try {
      await navigator.clipboard.writeText(this.rawErrorText);
      const origText = this.$copyBtn.textContent;
      this.$copyBtn.textContent = 'Copied!';
      this.$copyBtn.style.color = '#50fa7b';
      setTimeout(() => {
        this.$copyBtn.textContent = origText;
        this.$copyBtn.style.color = '';
      }, 1500);
    } catch (err) {
      console.error('Failed to copy error message:', err);
    }
  }

  public dismiss() {
    this.style.opacity = '0';
    setTimeout(() => {
      this.remove();
    }, 150);
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
    this.endpoint=endpoint;
    emitter.on("send",(data)=>{
        let ws = data.ws;
      
      ws.addEventListener("open",()=>{
       if(ws.readyState === 1) {
        
          this.ws.send(data.packed)
        }
      })
       
      })
  }

  private init() {
    this.ws = new WebSocket(this.endpoint);
    this.ws.addEventListener("open",()=>{
      emitter.emit("open",{ws:this.ws})
    })

    this.ws.addEventListener('message', async (e) => {
      try {
        let arrBuffer = await e.data?.arrayBuffer();
        if (arrBuffer instanceof ArrayBuffer) {
          let da = unpack(arrBuffer);
          
          if (da?.type === "rabbx:update") {
          
            this.handleUpdate(da);
          } else if (da?.type === "rabbx:error") {
            this.showError(da);
          } else if (da?.type === "rabbx:clear-error") {
            this.clearError();
          } else {
            const handlers = this.customListeners.get(da?.type|| da?.event);
            if (handlers) {
              for (const fn of handlers)
                fn(da);
            }
          }
          
          emitter.emit("message", { data: da });
        }
      } catch (err) {
        console.error("[@rabbx/hmr] Failed to process incoming message", err);
      }
    });

    this.ws.addEventListener('close', () => {
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

    window.location.reload();
  }

  private showError(err: { message: string; stack?: string }) {
    if (!this.overlay) {
      this.overlay = document.createElement('rabbx-hmr-overlay') as HMRErrorOverlay;
      document.body.appendChild(this.overlay);
    }
    this.overlay.setError(err);
  }

  private clearError() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
 public emit(event:string,data){
    if(event && typeof event === "string" && data){
      if(this.ws.readyState=== 1){
        this.ws.send(pack({event,data}))
      }
    }
  }
  public on(event:string,cb:(data:any)=>{}){
    if(event && typeof event === "string" && cb && typeof cb === "function"){
      emitter.on("message",(resp)=>{
        if(resp?.event === event ||resp?.type === event || resp?.data?.event === event){
          cb(resp?.data || {})
        }
      })
    }
  }
  

 public createHotContext(id: string = 'default') {
    let mod = this.modules.get(id);
    if (!mod) {
      mod = { id, acceptedCallbacks: [], disposeCallbacks: [] };
      this.modules.set(id, mod);
    }
    
   

    const client = this;

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
     decline() {
        window.location.reload();
      },
      send(event: string, data: any) {
        client.emit(event, data);
      },
      on(event: string, cb: Function) {
        if (!client.customListeners.has(event)) {
          client.customListeners.set(event, new Set());
        }
        client.customListeners.get(event)!.add(cb);
      }
    };
  }

}

declare global {
  interface ImportMeta {
    hot?: ReturnType<HMRClient['createHotContext']>;
  }
}

const hmr = new HMRClient();
const hot = hmr.createHotContext() 
if(typeof window !== "undefined")window.hot=hot;
export {
  hmr,hot
}
