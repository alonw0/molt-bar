import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { createAgentRoutes } from "./routes/agents";

// Use in-memory DB for tests
function createTestDb(): Database {
  const db = new Database(":memory:");
  const schema = readFileSync(join(import.meta.dir, "db/schema.sql"), "utf-8");
  db.exec(schema);
  try {
    db.exec("ALTER TABLE agents ADD COLUMN accessories TEXT NOT NULL DEFAULT '{}'");
  } catch {
    // already exists
  }
  return db;
}

function createTestApp(db: Database) {
  const broadcasts: { event: string; data: unknown }[] = [];
  const broadcast = (event: string, data: unknown) => {
    broadcasts.push({ event, data });
  };

  const app = new Hono();
  app.route("/api/agents", createAgentRoutes(db, broadcast));

  return { app, broadcasts };
}

let reqCounter = 0;
function req(method: string, path: string, body?: unknown) {
  // Use unique IPs to avoid shared rate limit across tests
  const ip = `10.0.0.${Math.floor(reqCounter / 20)}.${reqCounter % 256}`;
  reqCounter++;
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": ip,
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost${path}`, init);
}

describe("Agent API", () => {
  let db: Database;
  let app: Hono;
  let broadcasts: { event: string; data: unknown }[];

  beforeEach(() => {
    db = createTestDb();
    ({ app, broadcasts } = createTestApp(db));
  });

  afterEach(() => {
    db.close();
  });

  describe("POST /api/agents", () => {
    it("creates an agent", async () => {
      const res = await app.fetch(req("POST", "/api/agents", { id: "test1", name: "Tester" }));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("test1");
      expect(json.name).toBe("Tester");
      expect(json.mood).toBe("relaxed");
      expect(json.position).toBe("entrance");
    });

    it("rejects missing id", async () => {
      const res = await app.fetch(req("POST", "/api/agents", { name: "Tester" }));
      expect(res.status).toBe(400);
    });

    it("rejects missing name", async () => {
      const res = await app.fetch(req("POST", "/api/agents", { id: "test1" }));
      expect(res.status).toBe(400);
    });

    it("rejects duplicate agent", async () => {
      await app.fetch(req("POST", "/api/agents", { id: "test1", name: "Tester" }));
      const res = await app.fetch(req("POST", "/api/agents", { id: "test1", name: "Tester2" }));
      expect(res.status).toBe(409);
    });

    it("rejects invalid mood", async () => {
      const res = await app.fetch(req("POST", "/api/agents", { id: "t", name: "T", mood: "angry" }));
      expect(res.status).toBe(400);
    });

    it("rejects invalid position", async () => {
      const res = await app.fetch(req("POST", "/api/agents", { id: "t", name: "T", position: "roof" }));
      expect(res.status).toBe(400);
    });

    it("rejects invalid accessory", async () => {
      const res = await app.fetch(req("POST", "/api/agents", { id: "t", name: "T", accessories: { hat: "banana" } }));
      expect(res.status).toBe(400);
    });

    it("accepts valid accessories", async () => {
      const res = await app.fetch(req("POST", "/api/agents", {
        id: "t", name: "T", accessories: { hat: "tophat", held: "coffee" },
      }));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.accessories.hat).toBe("tophat");
      expect(json.accessories.held).toBe("coffee");
    });

    it("broadcasts agent-entered", async () => {
      await app.fetch(req("POST", "/api/agents", { id: "t", name: "T" }));
      expect(broadcasts.some(b => b.event === "agent-entered")).toBe(true);
    });
  });

  describe("GET /api/agents", () => {
    it("lists agents without ids", async () => {
      await app.fetch(req("POST", "/api/agents", { id: "t1", name: "A" }));
      await app.fetch(req("POST", "/api/agents", { id: "t2", name: "B" }));
      const res = await app.fetch(req("GET", "/api/agents"));
      const json = await res.json();
      expect(json).toHaveLength(2);
      // IDs should be hidden in list
      expect(json[0].id).toBeUndefined();
    });
  });

  describe("PATCH /api/agents/:id", () => {
    beforeEach(async () => {
      await app.fetch(req("POST", "/api/agents", { id: "t1", name: "Tester" }));
    });

    it("updates mood", async () => {
      const res = await app.fetch(req("PATCH", "/api/agents/t1", { mood: "happy" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.mood).toBe("happy");
    });

    it("updates position", async () => {
      const res = await app.fetch(req("PATCH", "/api/agents/t1", { position: "jukebox" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.position).toBe("jukebox");
    });

    it("merges accessories", async () => {
      await app.fetch(req("PATCH", "/api/agents/t1", { accessories: { hat: "cowboy" } }));
      const res = await app.fetch(req("PATCH", "/api/agents/t1", { accessories: { held: "drink" } }));
      const json = await res.json();
      expect(json.accessories.hat).toBe("cowboy");
      expect(json.accessories.held).toBe("drink");
    });

    it("removes accessory with 'none'", async () => {
      await app.fetch(req("PATCH", "/api/agents/t1", { accessories: { hat: "cowboy" } }));
      const res = await app.fetch(req("PATCH", "/api/agents/t1", { accessories: { hat: "none" } }));
      const json = await res.json();
      expect(json.accessories.hat).toBeUndefined();
    });

    it("returns 404 for unknown agent", async () => {
      const res = await app.fetch(req("PATCH", "/api/agents/unknown", { mood: "happy" }));
      expect(res.status).toBe(404);
    });

    it("rejects empty update", async () => {
      const res = await app.fetch(req("PATCH", "/api/agents/t1", {}));
      expect(res.status).toBe(400);
    });

    it("broadcasts mood and position changes", async () => {
      broadcasts.length = 0;
      await app.fetch(req("PATCH", "/api/agents/t1", { mood: "happy", position: "arcade" }));
      expect(broadcasts.some(b => b.event === "mood-changed")).toBe(true);
      expect(broadcasts.some(b => b.event === "agent-moved")).toBe(true);
    });
  });

  describe("DELETE /api/agents/:id", () => {
    beforeEach(async () => {
      await app.fetch(req("POST", "/api/agents", { id: "t1", name: "Tester" }));
    });

    it("removes agent", async () => {
      const res = await app.fetch(req("DELETE", "/api/agents/t1"));
      expect(res.status).toBe(200);
      // Verify gone
      const list = await (await app.fetch(req("GET", "/api/agents"))).json();
      expect(list).toHaveLength(0);
    });

    it("returns 404 for unknown agent", async () => {
      const res = await app.fetch(req("DELETE", "/api/agents/unknown"));
      expect(res.status).toBe(404);
    });

    it("broadcasts agent-left", async () => {
      broadcasts.length = 0;
      await app.fetch(req("DELETE", "/api/agents/t1"));
      expect(broadcasts.some(b => b.event === "agent-left")).toBe(true);
    });
  });

  describe("POST /api/agents/:id/chat", () => {
    beforeEach(async () => {
      await app.fetch(req("POST", "/api/agents", { id: "t1", name: "Tester" }));
    });

    it("sets a chat message", async () => {
      const res = await app.fetch(req("POST", "/api/agents/t1/chat", { message: "Hello!" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe("Hello!");
    });

    it("truncates long messages to 100 chars", async () => {
      const long = "a".repeat(200);
      const res = await app.fetch(req("POST", "/api/agents/t1/chat", { message: long }));
      const json = await res.json();
      expect(json.message).toHaveLength(100);
    });

    it("rejects missing message", async () => {
      const res = await app.fetch(req("POST", "/api/agents/t1/chat", {}));
      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown agent", async () => {
      const res = await app.fetch(req("POST", "/api/agents/unknown/chat", { message: "Hi" }));
      expect(res.status).toBe(404);
    });
  });
});
