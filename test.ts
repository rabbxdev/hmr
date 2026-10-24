import { WebSocket } from '@rabbx/ws';
import {pack,unpack} from "msgpackr";
const ws = new WebSocket('ws://localhost:4000/__rabbx_hmr');

ws.addEventListener('open', () => {
  console.log('Connected');
  ws.send(pack({event:"user",msg:'Hello'}));
 // ws.send(new Uint8Array([1, 2, 3])); // Binary
});

ws.addEventListener('message', (e) => {
  console.log('Received:', unpack(e.data)); // string | ArrayBuffer
});

ws.addEventListener('close', (e) => {
  console.log(`Closed: ${e.code} ${e.reason}`);
});