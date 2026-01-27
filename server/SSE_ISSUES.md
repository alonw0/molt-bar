# SSE Connection Issues with Bun

## Problem

The browser console shows repeated errors:
```
GET http://localhost:3847/api/events net::ERR_INCOMPLETE_CHUNKED_ENCODING 200 (OK)
```

## Root Cause

Server-Sent Events (SSE) requires keeping an HTTP connection open indefinitely. Bun's HTTP handling has issues with long-lived streaming responses using `ReadableStream`. The stream gets closed prematurely, causing the browser to see an incomplete chunked response, trigger an error, and reconnect in a loop.

## Current State

- The app **still works** - events are delivered and the UI updates
- It's just noisy in the console due to constant reconnection
- Reconnection happens every ~5 seconds

## Attempted Solutions

1. **Hono's `streamSSE` helper** - Doesn't work with Bun
2. **Native `ReadableStream` with `start()` callback** - Stream closes prematurely
3. **`ReadableStream` with async `pull()` callback** - Same issue
4. **Async generators** - Bun doesn't handle them correctly for streaming
5. **Various header combinations** (`Connection: keep-alive`, `X-Accel-Buffering: no`, etc.) - No effect

## Potential Fixes

### 1. Switch to WebSockets
WebSockets are better supported in Bun and truly bidirectional.

```typescript
// In Bun server config
websocket: {
  open(ws) { /* add to clients */ },
  close(ws) { /* remove from clients */ },
  message(ws, msg) { /* handle */ },
}
```

Frontend would use `new WebSocket()` instead of `EventSource`.

### 2. Use Polling
Replace SSE with simple polling every 2-3 seconds.

```javascript
// Frontend
setInterval(async () => {
  const agents = await fetch('/api/agents').then(r => r.json());
  updateUI(agents);
}, 3000);
```

Pros: Simple, reliable
Cons: Not real-time, more server load

### 3. Switch to Node.js
Use Node.js runtime instead of Bun. SSE works correctly with Node's HTTP handling.

### 4. Accept the Errors
The app works despite the errors. Could suppress console errors in production or just ignore them during development.

### 5. Wait for Bun Fix
This may be a Bun bug that gets fixed in a future version. Current version: Bun v1.3.4

## Related Links

- Bun GitHub issues for SSE/streaming
- https://bun.sh/docs/api/http#streaming

## Files Involved

- `server/src/index.ts` - SSE handler (`handleSSE` function)
- `server/src/routes/events.ts` - Original Hono-based implementation (unused)
- `website/js/main.js` - EventSource connection and reconnection logic
- `website/js/api.js` - `createEventSource()` function
