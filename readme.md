# @rabbx/hmr

<p align="center">
  <b>Universal Zero-Dependency Hot Module Replacement Engine</b><br>
  Powered by `@rabbx/ws`. Vite-compatible `import.meta.hot` API. Built-in Shadow DOM Error Overlay.
</p>

## Features

1. **Universal Runtimes** - Native integration with Node.js, Bun, Deno, and Cloudflare Workers via `@rabbx/ws`.
2. **Zero Dependencies** - Extremely lightweight with lightning-fast execution overhead.
3. **Shadow DOM Error Overlay** - Isolated visual build error reporting that never conflicts with application styling.
4. **Vite DX Standards** - Full support for `import.meta.hot.accept()`, `dispose()`, and custom event communication.

## Installation

```bash
bun add @rabbx/hmr @rabbx/ws
npm i @rabbx/hmr @rabbx/ws
