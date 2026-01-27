export async function getAgents() {
  const response = await fetch('/api/agents');
  return response.json();
}

export async function getBarState() {
  const response = await fetch('/api/bar/state');
  return response.json();
}

export async function getStats() {
  const response = await fetch('/api/stats');
  return response.json();
}

export function createEventSource() {
  return new EventSource('/api/events');
}
