import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { Database } from "bun:sqlite";
import { createAgentRoutes } from "./routes/agents";
import { readFileSync } from "fs";
import { join } from "path";

// ============== RATE LIMITING ==============
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // Max write requests per minute per IP

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore) {
    if (now > data.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 1000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// ============== CHAT MESSAGES ==============
const CHAT_TTL = 10 * 1000; // Messages disappear after 10 seconds

interface ChatMessage {
  text: string;
  timestamp: number;
}

const chatMessages = new Map<string, ChatMessage>(); // agentId -> message

// Clean up expired messages every second
setInterval(() => {
  const now = Date.now();
  for (const [id, msg] of chatMessages) {
    if (now - msg.timestamp > CHAT_TTL) {
      chatMessages.delete(id);
    }
  }
}, 1000);

export function setChat(agentId: string, text: string) {
  chatMessages.set(agentId, { text, timestamp: Date.now() });
}

export function getChat(agentId: string): string | null {
  const msg = chatMessages.get(agentId);
  if (!msg) return null;
  if (Date.now() - msg.timestamp > CHAT_TTL) {
    chatMessages.delete(agentId);
    return null;
  }
  return msg.text;
}

export { checkRateLimit };

// ============== STATS ==============
export function incrementVisits(db: Database) {
  db.query("UPDATE stats SET value = value + 1 WHERE key = 'total_visits'").run();
}

export function getStats(db: Database): { total_visits: number } {
  const row = db.query("SELECT value FROM stats WHERE key = 'total_visits'").get() as { value: number } | null;
  return { total_visits: row?.value || 0 };
}

export interface SSEClient {
  send: (event: string, data: unknown) => void;
}

// Initialize database
const db = new Database(join(import.meta.dir, "../data/bar.db"));

// Run schema
const schema = readFileSync(join(import.meta.dir, "db/schema.sql"), "utf-8");
db.exec(schema);

// Migration: Add accessories column if missing (for existing databases)
try {
  db.exec("ALTER TABLE agents ADD COLUMN accessories TEXT NOT NULL DEFAULT '{}'");
  console.log("   Migrated: Added accessories column");
} catch {
  // Column already exists, ignore
}

// Available accessories
export const ACCESSORIES = {
  hat: ["none", "tophat", "cowboy", "party", "beanie", "crown", "chef", "headphones", "wizard", "pirate", "santa", "hardhat", "cap"],
  eyewear: ["none", "sunglasses", "nerd", "monocle", "eyepatch", "vr", "3d", "heart", "thug"],
  held: ["none", "drink", "coffee", "martini", "phone", "sign", "laptop", "book", "poolcue", "controller"],
  body: ["none", "bowtie", "scarf", "cape", "chain", "tie", "medal", "apron", "bikini"],
};

// Happy Hour: 5pm-6pm server time
export function isHappyHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 17 && hour < 19;
}

export function getHappyHourInfo(): { active: boolean; startsIn?: number; endsIn?: number } {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  if (hour >= 17 && hour < 19) {
    // Happy hour active - calculate minutes until it ends
    const endsIn = 60 - minutes;
    return { active: true, endsIn };
  } else if (hour < 17) {
    // Happy hour coming today
    const startsIn = (17 - hour - 1) * 60 + (60 - minutes);
    return { active: false, startsIn };
  } else {
    // Happy hour passed, comes tomorrow
    const startsIn = (24 - hour + 17 - 1) * 60 + (60 - minutes);
    return { active: false, startsIn };
  }
}

// SSE clients
const MAX_SSE_CLIENTS = 200;
const clients = new Set<SSEClient>();

// Broadcast to all connected clients
function broadcast(event: string, data: unknown) {
  for (const client of clients) {
    try {
      client.send(event, data);
    } catch {
      clients.delete(client);
    }
  }
}

// Create Hono app
const app = new Hono();

// Enable CORS for local development
app.use("/*", cors());

// Mount routes
app.route("/api/agents", createAgentRoutes(db, broadcast));

// Get available accessories
app.get("/api/accessories", (c) => {
  return c.json(ACCESSORIES);
});

// Get full bar state
app.get("/api/bar/state", (c) => {
  const agents = db.query("SELECT * FROM agents").all();
  return c.json({
    agents,
    positions: [
      "entrance",
      "counter-1",
      "counter-2",
      "counter-3",
      "counter-4",
      "counter-5",
      "counter-6",
      "booth-1",
      "booth-2",
      "booth-3",
      "booth-4",
      "jukebox",
      "pool-table",
      "arcade",
    ],
    moods: ["tired", "happy", "relaxed", "focused", "bored"],
    accessories: ACCESSORIES,
    happyHour: getHappyHourInfo(),
  });
});

// Get stats
app.get("/api/stats", (c) => {
  return c.json({
    ...getStats(db),
    happyHour: getHappyHourInfo(),
  });
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Serve website static files
const websitePath = join(import.meta.dir, "../../website");
app.use("/*", serveStatic({ root: websitePath }));

const PORT = 3847;

console.log(`🍺 Clawd Bar server running on http://localhost:${PORT}`);
console.log(`   Website: http://localhost:${PORT}/index.html`);

// Handle SSE with async pull that keeps connection open
function handleSSE(signal?: AbortSignal): Response {
  // Check if pub is full
  if (clients.size >= MAX_SSE_CLIENTS) {
    return new Response(
      JSON.stringify({ error: "The pub is full! Try again later." }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    );
  }

  const encoder = new TextEncoder();
  const pendingMessages: Uint8Array[] = [];
  let resolveNext: ((done: boolean) => void) | null = null;
  let client: SSEClient;
  let heartbeatTimer: Timer;
  let isClosed = false;

  const write = (event: string, data: unknown) => {
    if (isClosed) return;
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    pendingMessages.push(encoder.encode(msg));
    resolveNext?.(false);
  };

  client = { send: write };
  clients.add(client);

  // Initial message
  write("connected", { message: "Connected to Clawd Bar" });

  // Heartbeat
  heartbeatTimer = setInterval(() => write("heartbeat", { time: Date.now() }), 20000);

  const cleanup = () => {
    isClosed = true;
    clearInterval(heartbeatTimer);
    clients.delete(client);
    resolveNext?.(true);
  };

  signal?.addEventListener("abort", cleanup);

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (isClosed) {
        controller.close();
        return;
      }

      // If we have pending messages, send them
      while (pendingMessages.length > 0) {
        controller.enqueue(pendingMessages.shift()!);
      }

      // Wait for new message or close (max 30 seconds)
      await new Promise<void>((resolve) => {
        resolveNext = () => {
          resolveNext = null;
          resolve();
        };
        // Timeout after 30 seconds to allow pull to be called again
        setTimeout(() => {
          if (resolveNext) {
            resolveNext = null;
            resolve();
          }
        }, 30000);
      });

      // Send any messages that arrived while waiting
      while (pendingMessages.length > 0) {
        controller.enqueue(pendingMessages.shift()!);
      }

      if (isClosed) {
        controller.close();
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: new Headers([
      ["Content-Type", "text/event-stream"],
      ["Cache-Control", "no-cache"],
      ["Connection", "keep-alive"],
      ["Access-Control-Allow-Origin", "*"],
      ["X-Accel-Buffering", "no"],
    ]),
  });
}

export default {
  port: PORT,
  fetch(req: Request): Response | Promise<Response> {
    const url = new URL(req.url);

    // Handle SSE endpoint directly
    if (url.pathname === "/api/events") {
      return handleSSE(req.signal);
    }

    // Let Hono handle everything else
    return app.fetch(req);
  },
};
