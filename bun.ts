import express from 'express';
import { createServer } from 'http';
import { HMRServer } from './src/server.ts';

const app = express();
const httpServer = createServer(app);

// Attach @rabbx/hmr to the underlying HTTP server
//const hmrServer = await HMRServer.createBun() //HMRServer.attachNode({ path: '/__rabbx_hmr' });

// Serve application static files or views
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Express + @rabbx/hmr</title>
        <style>
          body { font-family: sans-serif; background: #111; color: #fff; padding: 4rem; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Express Development Server Active</h1>
        <p>Edit your source yur files to trigger ye Hot Module Replacement.</p>

        <!-- Inject @rabbx/hmr client runtime -->
        <script type="module">
          import '@rabbx/hmr/client';

          if (import.meta.hot) {
            import.meta.hot.accept(() => {
            alert("hot")
              console.log('Hot-swapped successfully!');
            });
          }
        </script>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

//httpServer.listen(PORT, () => {
 // console.log(`[Express] Dev server running at http://localhost:${PORT}`);
//});
const event = new CustomEvent("userLoggedIn", {
  detail: { username: "Alice" },
  bubbles: true
});

const { config, server: hmrServer } = HMRServer.createBun({ path: '/__rabbx_hmr' });

Bun.serve({
  port: 3000,
  fetch: config.fetch,
  websocket: config.websocket,
});

// Broadcast file changes from your file watcher
//watcher.on('change', (path) => {
  
//});
setInterval(()=>{
  hmrServer.notifyUpdate({ 
    type: '.css' ? 'css' : 'js', 
    path:"e.ts"
  });
  hmrServer.emit("custom",{type:"js",css:"ccc"})
},6000)
hmrServer.on("home",({socket,data})=>{
  console.log(data,"data")
  hmrServer.emit("custom",{type:"js",css:"ccc"})
})
