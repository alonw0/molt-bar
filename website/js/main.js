// Main entry point

import { Bar } from './bar.js';
import { AgentRenderer } from './agents.js';
import { Bartender } from './bartender.js';
import { getAgents } from './api.js';

// Lo-fi music stream URL (royalty-free)
const MUSIC_URL = 'https://streams.ilovemusic.de/iloveradio17.mp3';

class ClawdBarApp {
  constructor() {
    this.canvas = document.getElementById('barCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.bar = new Bar(this.canvas);
    this.agentRenderer = new AgentRenderer(this.ctx);
    this.bartender = new Bartender();
    this.agents = new Map();
    this.agentsArray = []; // Reusable array to avoid creating new arrays every frame

    this.connectionStatus = document.getElementById('connectionStatus');
    this.agentCount = document.getElementById('agentCount');
    this.agentList = document.getElementById('agentList');

    // Music setup
    this.audio = new Audio(MUSIC_URL);
    this.audio.loop = true;
    this.audio.volume = 0.3;
    this.musicPlaying = false;

    this.setupMusicControls();
  }

  setupMusicControls() {
    const musicBtn = document.getElementById('musicBtn');
    const volumeSlider = document.getElementById('volumeSlider');

    if (musicBtn) {
      musicBtn.addEventListener('click', () => this.toggleMusic());
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.audio.volume = e.target.value / 100;
      });
    }

    // Handle audio events
    this.audio.addEventListener('play', () => {
      this.musicPlaying = true;
      this.bar.setMusicPlaying(true);
      this.updateMusicButton();
    });

    this.audio.addEventListener('pause', () => {
      this.musicPlaying = false;
      this.bar.setMusicPlaying(false);
      this.updateMusicButton();
    });

    this.audio.addEventListener('error', () => {
      console.log('[Music] Stream unavailable, using silent mode');
      this.musicPlaying = false;
      this.bar.setMusicPlaying(false);
    });
  }

  toggleMusic() {
    if (this.musicPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch(err => {
        console.log('[Music] Autoplay blocked, click to play');
      });
    }
  }

  updateMusicButton() {
    const musicBtn = document.getElementById('musicBtn');
    if (musicBtn) {
      musicBtn.textContent = this.musicPlaying ? 'PAUSE' : 'PLAY';
      musicBtn.classList.toggle('playing', this.musicPlaying);
    }
  }

  async init() {
    // Load initial state
    await this.loadAgents();

    // Poll for updates every 3 seconds
    this.startPolling();

    // Start render loop
    this.startRenderLoop();
  }

  startPolling() {
    setInterval(() => this.loadAgents(), 3000);
    this.setConnectionStatus('connected');
  }

  async loadAgents() {
    try {
      const agents = await getAgents();
      this.agents.clear();
      for (const agent of agents) {
        this.agents.set(agent.id, agent);
      }
      this.updateAgentList();
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  setConnectionStatus(status) {
    this.connectionStatus.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
    this.connectionStatus.className = `connection-status ${status}`;
  }

  updateAgentList() {
    this.agentCount.textContent = this.agents.size;

    this.agentList.innerHTML = '';
    for (const agent of this.agents.values()) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="name">${this.escapeHtml(agent.name)}</span>
        <span class="details">
          @ ${agent.position}
          <span class="mood ${agent.mood}">${agent.mood}</span>
        </span>
      `;
      this.agentList.appendChild(li);
    }
  }

  escapeHtml(text) {
    // Escape HTML without creating DOM elements (avoids memory leak)
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  showNotification(message) {
    // Simple console notification for now
    console.log(`[Clawd Bar] ${message}`);
  }

  startRenderLoop() {
    const render = () => {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Update bar animations
      this.bar.update();

      // Update bartender
      this.bartender.update();

      // Draw bar background (walls, shelves, booths)
      this.bar.drawBackground();

      // Draw bartender (behind the counter)
      this.bartender.draw(this.ctx);

      // Draw bar foreground (counter, stools, other furniture)
      this.bar.drawForeground();

      // Update animation frame
      this.agentRenderer.update();

      // Draw agents (reuse array to avoid memory allocation every frame)
      this.agentsArray.length = 0;
      for (const agent of this.agents.values()) {
        this.agentsArray.push(agent);
      }
      this.agentRenderer.drawAgents(this.agentsArray);

      requestAnimationFrame(render);
    };

    render();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new ClawdBarApp();
  app.init();
});
