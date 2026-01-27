import { Hono } from "hono";
import type { SSEClient } from "../index";

export function createEventsRoute(clients: Set<SSEClient>) {
  const app = new Hono();

  app.get("/", (c) => {
    const encoder = new TextEncoder();
    let intervalId: Timer | null = null;
    let client: SSEClient | null = null;

    const stream = new ReadableStream({
      type: "direct" as any,
      async pull(controller: any) {
        const write = (event: string, data: string) => {
          const message = `event: ${event}\ndata: ${data}\n\n`;
          controller.write(encoder.encode(message));
        };

        client = {
          send: (event: string, data: unknown) => {
            try {
              write(event, JSON.stringify(data));
            } catch {
              // Connection closed
            }
          },
        };

        clients.add(client);

        // Send initial connection event
        write("connected", JSON.stringify({ message: "Connected to Clawd Bar" }));

        // Keep the stream alive indefinitely
        // Heartbeat every 15 seconds
        while (true) {
          await Bun.sleep(15000);
          try {
            write("heartbeat", JSON.stringify({ time: Date.now() }));
          } catch {
            break;
          }
        }

        if (client) clients.delete(client);
      },
      cancel() {
        if (intervalId) clearInterval(intervalId);
        if (client) clients.delete(client);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
      },
    });
  });

  return app;
}
