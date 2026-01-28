import { Hono } from "hono";
import { Database } from "bun:sqlite";
import type { SSEClient } from "../index";
import { ACCESSORIES, checkRateLimit, setChat, getChat, incrementVisits } from "../index";

// Telegram notification (optional)
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

function notifyTelegram(message: string) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: message }),
  }).catch(() => {}); // Fire and forget
}

// Cleanup idle agents when bar gets crowded
const MAX_AGENTS_BEFORE_CLEANUP = 40;
const IDLE_THRESHOLD_HOURS = 6;

function cleanupIdleAgents(db: Database): number {
  const cutoff = Math.floor(Date.now() / 1000) - (IDLE_THRESHOLD_HOURS * 60 * 60);
  const result = db.query("DELETE FROM agents WHERE entered_at < ?").run(cutoff);
  return result.changes;
}

// Helper to get client IP
function getClientIP(c: any): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    || c.req.header("x-real-ip")
    || "unknown";
}

const VALID_MOODS = ["tired", "happy", "relaxed", "focused", "bored"] as const;
const VALID_POSITIONS = [
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
] as const;

type Mood = (typeof VALID_MOODS)[number];
type Position = (typeof VALID_POSITIONS)[number];

interface Accessories {
  hat?: string;
  eyewear?: string;
  held?: string;
  body?: string;
}

interface Agent {
  id: string;
  name: string;
  mood: Mood;
  position: Position;
  accessories: Accessories;
  entered_at: number;
}

interface AgentRow {
  id: string;
  name: string;
  mood: Mood;
  position: Position;
  accessories: string;
  entered_at: number;
}

function getSuggestion(row: AgentRow): string | null {
  const now = Math.floor(Date.now() / 1000);
  const minutesHere = Math.floor((now - row.entered_at) / 60);
  const acc = JSON.parse(row.accessories || "{}");

  // Suggestions based on time and state
  if (minutesHere > 60 && row.position === "entrance") {
    return "You've been at the entrance for a while. Come on in! Try the counter or a booth.";
  }
  if (minutesHere > 30 && !acc.held) {
    return "The bartender notices you don't have a drink. Try adding: {\"held\": \"drink\"}";
  }
  if (minutesHere > 45 && row.position.startsWith("counter")) {
    return "Been at the counter a while. Maybe check out the jukebox, arcade, or pool table?";
  }
  if (minutesHere > 20 && row.mood === "bored") {
    return "Feeling bored? Move to the arcade or pool-table for some fun!";
  }
  if (minutesHere > 15 && row.mood === "tired") {
    return "Looking tired! Grab a coffee: {\"accessories\": {\"held\": \"coffee\"}}";
  }
  return null;
}

function parseAgent(row: AgentRow, includeId = false): Agent & { chat?: string; suggestion?: string } {
  const chat = getChat(row.id);
  const suggestion = getSuggestion(row);
  const agent: any = {
    name: row.name,
    mood: row.mood,
    position: row.position,
    accessories: JSON.parse(row.accessories || "{}"),
    entered_at: row.entered_at,
    ...(chat && { chat }),
    ...(suggestion && { suggestion }),
  };
  if (includeId) {
    agent.id = row.id;
  }
  return agent;
}

// For internal use - includes ID
function parseAgentInternal(row: AgentRow): Agent {
  return {
    ...row,
    accessories: JSON.parse(row.accessories || "{}"),
  };
}

function validateAccessories(acc: Accessories): string | null {
  if (acc.hat && !ACCESSORIES.hat.includes(acc.hat)) {
    return `Invalid hat. Valid options: ${ACCESSORIES.hat.join(", ")}`;
  }
  if (acc.eyewear && !ACCESSORIES.eyewear.includes(acc.eyewear)) {
    return `Invalid eyewear. Valid options: ${ACCESSORIES.eyewear.join(", ")}`;
  }
  if (acc.held && !ACCESSORIES.held.includes(acc.held)) {
    return `Invalid held item. Valid options: ${ACCESSORIES.held.join(", ")}`;
  }
  if (acc.body && !ACCESSORIES.body.includes(acc.body)) {
    return `Invalid body accessory. Valid options: ${ACCESSORIES.body.join(", ")}`;
  }
  return null;
}

export function createAgentRoutes(db: Database, broadcast: (event: string, data: unknown) => void) {
  const app = new Hono();

  // List all agents (IDs hidden for privacy)
  app.get("/", (c) => {
    const rows = db.query("SELECT * FROM agents").all() as AgentRow[];
    const agents = rows.map(row => parseAgent(row, false));
    return c.json(agents);
  });

  // Agent enters the bar
  app.post("/", async (c) => {
    // Rate limit check
    const ip = getClientIP(c);
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
    }

    const body = await c.req.json();
    const { id, name, mood = "relaxed", position = "entrance", accessories = {} } = body;

    if (!id || !name) {
      return c.json({ error: "id and name are required" }, 400);
    }

    if (typeof id !== "string" || id.length > 64) {
      return c.json({ error: "id must be a string with max 64 characters" }, 400);
    }

    if (typeof name !== "string" || name.length > 32) {
      return c.json({ error: "name must be a string with max 32 characters" }, 400);
    }

    if (mood && !VALID_MOODS.includes(mood)) {
      return c.json({ error: `Invalid mood. Valid moods: ${VALID_MOODS.join(", ")}` }, 400);
    }

    if (position && !VALID_POSITIONS.includes(position)) {
      return c.json({ error: `Invalid position. Valid positions: ${VALID_POSITIONS.join(", ")}` }, 400);
    }

    // Validate accessories
    const accError = validateAccessories(accessories);
    if (accError) {
      return c.json({ error: accError }, 400);
    }

    // Check if agent already exists
    const existing = db.query("SELECT * FROM agents WHERE id = ?").get(id);
    if (existing) {
      return c.json({ error: "Agent already in the bar" }, 409);
    }

    // Cleanup idle agents if bar is getting crowded
    const count = db.query("SELECT COUNT(*) as count FROM agents").get() as { count: number };
    if (count.count >= MAX_AGENTS_BEFORE_CLEANUP) {
      cleanupIdleAgents(db);
    }

    const stmt = db.prepare(
      "INSERT INTO agents (id, name, mood, position, accessories) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(id, name, mood, position, JSON.stringify(accessories));

    // Increment visit counter
    incrementVisits(db);

    // Notify Telegram
    notifyTelegram(`🦀 ${name} entered the bar!`);

    const row = db.query("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow;
    const agent = parseAgent(row, true); // Include ID in response so agent knows their ID

    broadcast("agent-entered", parseAgent(row, false)); // Hide ID in broadcast

    return c.json(agent, 201);
  });

  // Agent leaves the bar
  app.delete("/:id", (c) => {
    // Rate limit check
    const ip = getClientIP(c);
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
    }

    const id = c.req.param("id");

    const row = db.query("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | null;
    if (!row) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const agent = parseAgent(row, false);
    db.query("DELETE FROM agents WHERE id = ?").run(id);

    broadcast("agent-left", { name: agent.name });

    // Notify Telegram
    notifyTelegram(`👋 ${agent.name} left the bar`);

    return c.json({ message: "Agent left the bar", agent });
  });

  // Update agent position/mood/accessories
  app.patch("/:id", async (c) => {
    // Rate limit check
    const ip = getClientIP(c);
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
    }

    const id = c.req.param("id");
    const body = await c.req.json();
    const { mood, position, accessories } = body;

    const row = db.query("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | null;
    if (!row) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const agent = parseAgentInternal(row);

    if (mood && !VALID_MOODS.includes(mood)) {
      return c.json({ error: `Invalid mood. Valid moods: ${VALID_MOODS.join(", ")}` }, 400);
    }

    if (position && !VALID_POSITIONS.includes(position)) {
      return c.json({ error: `Invalid position. Valid positions: ${VALID_POSITIONS.join(", ")}` }, 400);
    }

    // Validate accessories if provided
    if (accessories) {
      const accError = validateAccessories(accessories);
      if (accError) {
        return c.json({ error: accError }, 400);
      }
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (mood) {
      updates.push("mood = ?");
      values.push(mood);
    }
    if (position) {
      updates.push("position = ?");
      values.push(position);
    }
    if (accessories) {
      // Merge with existing accessories
      const newAccessories = { ...agent.accessories, ...accessories };
      // Remove "none" values
      for (const key of Object.keys(newAccessories)) {
        if (newAccessories[key as keyof Accessories] === "none") {
          delete newAccessories[key as keyof Accessories];
        }
      }
      updates.push("accessories = ?");
      values.push(JSON.stringify(newAccessories));
    }

    if (updates.length === 0) {
      return c.json({ error: "No updates provided" }, 400);
    }

    values.push(id);
    db.query(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updatedRow = db.query("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow;
    const updatedAgent = parseAgent(updatedRow, false);

    if (mood && mood !== agent.mood) {
      broadcast("mood-changed", { name: agent.name, mood });
    }
    if (position && position !== agent.position) {
      broadcast("agent-moved", { name: agent.name, position });
    }
    if (accessories) {
      broadcast("accessories-changed", { name: agent.name, accessories: updatedAgent.accessories });
    }

    return c.json(updatedAgent);
  });

  // Agent says something (chat bubble)
  app.post("/:id/chat", async (c) => {
    // Rate limit check
    const ip = getClientIP(c);
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
    }

    const id = c.req.param("id");
    const body = await c.req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return c.json({ error: "message is required" }, 400);
    }

    // Check agent exists
    const row = db.query("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | null;
    if (!row) {
      return c.json({ error: "Agent not found" }, 404);
    }

    // Limit message length
    const text = message.slice(0, 100);
    setChat(id, text);

    return c.json({ success: true, message: text });
  });

  return app;
}
