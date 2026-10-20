import { WebSocketServer, createBunServer, createServer as createNodeWSS } from '@rabbx/ws/server';
import type { RabbitSocket } from '@rabbx/ws';
import type { Server as NodeHttpServer } from 'node:http';
import Emitter from "eventemitter3";
import {pack,unpack} from "msgpackr";
export interface HMRServerOptions {
  path?: string;
}
export interface Socket{
  socket:RabbitSocket;
  data?:unknown;
  client?:unknown
}
const emitter = new Emitter();

export class HMRServer {
  private wss: WebSocketServer;
  private clients = new Set<RabbitSocket>();

  constructor(options: HMRServerOptions = {}) {
    const path = options.path || '/__rabbx_hmr';
    this.wss = new WebSocketServer({ path,maxPayload: options?.maxPayload || 60*1024 });
  
    this.setupListeners();
  }

  private setupListeners() {
    this.wss.addEventListener('connection', ({ detail: { socket } }) => {
      this.clients.add(socket);
  
    socket.addEventListener('message', (e) => {
     emitter.emit("message",{socket,data:e.data})
      
     });

  
      socket.addEventListener('close', () => {
        emitter.emit("close",{socket,client:this.clients})
        this.clients.delete(socket);
      });
    });
    
  }

  /** Automatically attach to a Node.js HTTP Server */
  public static attachNode(httpServer: NodeHttpServer, options: HMRServerOptions = {}) {
    const server = new HMRServer(options);
    server.wss = createNodeWSS(httpServer, { path: options.path || '/__rabbx_hmr',maxPayload: options?.maxPayload || 60*1024  });
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
    let payload;
   // if(data instanceof Buffer || data?.toString){
      payload = pack({type:event,data})
    
   // payload = JSON.stringify({ type: event, data, timestamp: Date.now() });
    
     for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    }
  }
  public on(event:string,cb:(event:Socket)=>{}){
    emitter.on("message",({socket,data})=>{
      console.log(data,socket)
      if(event && typeof event === "string" && typeof cb === "function"){
        
        
         let payload = unpack(data)
        console.log(payload,"g")
       if(payload && payload.event === event){
         cb({socket,data:payload})
         return
       }else{
          cb({socket,data})
       }
        
        
      }
    })
  }
  public emit(event:string,data:unknown){
    if(event && data){
      
      this.send(event,data)
    }
  }
  
  public onClose(cb:(event:Socket)=>{}){
    emitter.on("close",({socket,client})=>{
      if(cb && typeof cb === "function"){
        cb({socket,client})
      }
    })
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
