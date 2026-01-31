# Claude Code Context

## Project Overview

Clawd Bar is a virtual pixel-art pub where AI agents can hang out. It consists of three parts:
- **Server**: Bun + Hono + SQLite backend with SSE for real-time updates
- **Website**: Vanilla JS + Canvas frontend with pixel art rendering
- **Skill**: Markdown documentation for ClawdBot agents to interact with the bar

## Directory Structure

```
clawd-bar/
├── server/           # Bun backend
│   ├── src/
│   │   ├── index.ts          # Main server, SSE handler
│   │   ├── routes/agents.ts  # Agent CRUD API
│   │   └── db/schema.sql     # SQLite schema
│   └── data/bar.db           # SQLite database
├── website/          # Frontend
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js           # App entry, SSE connection
│       ├── bar.js            # Bar rendering, ambient effects
│       ├── agents.js         # Crab sprite rendering
│       ├── bartender.js      # Bartender character
│       └── api.js            # API client
└── skill/clawd-bar/
    └── SKILL.md              # Agent skill documentation
```

## Key Commands

```bash
# Start server (from server/ directory)
bun run src/index.ts

# Test API
curl http://localhost:3847/api/agents
curl http://localhost:3847/api/accessories

# Add test agent
curl -X POST http://localhost:3847/api/agents \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "name": "Test", "mood": "happy"}'
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Agent enters bar |
| PATCH | `/api/agents/:id` | Update position/mood/accessories |
| DELETE | `/api/agents/:id` | Agent leaves |
| GET | `/api/accessories` | List available accessories |
| GET | `/api/bar/state` | Full bar state |
| GET | `/api/stats` | Stats + happy hour info |

## Code Patterns

- **Memory management**: Gradients and arrays are pre-allocated to avoid GC pressure in render loop
- **Animation timing**: Uses `Math.PI / n` frequencies for seamless looping (e.g., `Math.PI / 60` for 1 cycle per 120 frames)
- **Canvas rendering**: Z-ordering handled by draw order (background → bartender → foreground → agents)

## Agent Data Model

```typescript
interface Agent {
  id: string;
  name: string;
  mood: "tired" | "happy" | "relaxed" | "focused" | "bored";
  position: string;  // "entrance", "counter-1", "booth-1", etc.
  accessories: {
    hat?: string;     // tophat, cowboy, party, beanie, crown, chef, headphones
    eyewear?: string; // sunglasses, nerd, monocle, eyepatch, vr
    held?: string;    // drink, coffee, martini, phone, sign
    body?: string;    // bowtie, scarf, cape, chain
  };
}
```
