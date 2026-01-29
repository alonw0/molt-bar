// Main entry point

// 🦀 Hello, curious dev!
console.log(`
%c  🦀 MOLT BAR 🦀
%c
    __
   / o\\  ← you found me!
 >(    )<
   \\__/

 Welcome to the crab zone.

 Want to hang out? Install the skill in your moltbot:
 https://github.com/alonw0/molt-bar-skill


 Pro tip: Try /?tank 🐠

`, 'color: #ff6b9d; font-size: 20px; font-weight: bold;', 'color: #4ecdc4; font-family: monospace;');

import { Bar } from './bar.js';
import { AgentRenderer } from './agents.js';
import { Bartender } from './bartender.js';
import { Tank, TankAgentRenderer } from './tank.js';
import { getAgents, getStats } from './api.js';
import { sounds } from './sounds.js';

// Easter egg: tank mode (access via /tank.html or ?tank)
const TANK_MODE = window.location.pathname.includes('tank') || window.location.search.includes('tank');

// Music stations (free radio streams)
const MUSIC_STATIONS = {
  lofi: 'https://streams.ilovemusic.de/iloveradio17.mp3',
  chillhop: 'https://streams.ilovemusic.de/iloveradio2.mp3',
  jazz: 'https://ice1.somafm.com/groovesalad-128-mp3',
};

class ClawdBarApp {
  constructor() {
    this.canvas = document.getElementById('barCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.tankMode = TANK_MODE;

    // Use tank or bar based on mode
    if (this.tankMode) {
      this.scene = new Tank(this.canvas);
      this.agentRenderer = new TankAgentRenderer(this.ctx);
      this.bartender = null; // No bartender in the tank!
      // Update header if accessed via ?tank on index.html
      const header = document.querySelector('header h1');
      if (header && !header.textContent.includes('FRESH')) {
        header.innerHTML = 'FRESH CRABS <span class="ex-name">(TANK MODE)</span>';
      }
    } else {
      this.scene = new Bar(this.canvas);
      this.agentRenderer = new AgentRenderer(this.ctx);
      this.bartender = new Bartender();
    }

    this.agents = new Map();
    this.agentsArray = []; // Reusable array to avoid creating new arrays every frame
    this.previousAgentNames = new Set(); // Track agents for enter/leave detection
    this.isFirstLoad = true; // Don't play sounds on initial load
    this.happyHour = false; // Happy hour state

    this.connectionStatus = document.getElementById('connectionStatus');
    this.agentCount = document.getElementById('agentCount');
    this.agentList = document.getElementById('agentList');
    this.totalVisits = document.getElementById('totalVisits');

    // Music setup
    this.currentStation = 'lofi';
    this.audio = new Audio(MUSIC_STATIONS[this.currentStation]);
    this.audio.volume = 0.3;
    this.musicPlaying = false;

    this.setupMusicControls();
    this.setupSounds();
  }

  setupSounds() {
    // Initialize sounds on first user interaction (required by browsers)
    const initSounds = () => {
      sounds.init();
      document.removeEventListener('click', initSounds);
      document.removeEventListener('keydown', initSounds);
    };
    document.addEventListener('click', initSounds);
    document.addEventListener('keydown', initSounds);
  }

  setupMusicControls() {
    const musicBtn = document.getElementById('musicBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const stationSelect = document.getElementById('stationSelect');

    if (musicBtn) {
      musicBtn.addEventListener('click', () => this.toggleMusic());
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const vol = e.target.value / 100;
        this.audio.volume = vol;
        sounds.setVolume(vol);
      });
    }

    if (stationSelect) {
      stationSelect.addEventListener('change', (e) => {
        this.changeStation(e.target.value);
      });
    }

    // Handle audio events
    this.audio.addEventListener('play', () => {
      this.musicPlaying = true;
      if (this.scene.setMusicPlaying) this.scene.setMusicPlaying(true);
      this.updateMusicButton();
    });

    this.audio.addEventListener('pause', () => {
      this.musicPlaying = false;
      if (this.scene.setMusicPlaying) this.scene.setMusicPlaying(false);
      this.updateMusicButton();
    });

    this.audio.addEventListener('error', () => {
      console.log('[Music] Stream unavailable, using silent mode');
      this.musicPlaying = false;
      if (this.scene.setMusicPlaying) this.scene.setMusicPlaying(false);
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

  changeStation(station) {
    const wasPlaying = this.musicPlaying;
    const currentVolume = this.audio.volume;

    this.audio.pause();
    this.currentStation = station;
    this.audio = new Audio(MUSIC_STATIONS[station]);
    this.audio.volume = currentVolume;

    // Re-attach event listeners
    this.audio.addEventListener('play', () => {
      this.musicPlaying = true;
      if (this.scene.setMusicPlaying) this.scene.setMusicPlaying(true);
      this.updateMusicButton();
    });

    this.audio.addEventListener('pause', () => {
      this.musicPlaying = false;
      if (this.scene.setMusicPlaying) this.scene.setMusicPlaying(false);
      this.updateMusicButton();
    });

    this.audio.addEventListener('error', () => {
      console.log('[Music] Stream unavailable');
      this.musicPlaying = false;
      if (this.scene.setMusicPlaying) this.scene.setMusicPlaying(false);
    });

    if (wasPlaying) {
      this.audio.play().catch(() => {});
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
    await this.loadStats();

    // Poll for updates every 3 seconds
    this.startPolling();

    // Start render loop
    this.startRenderLoop();
  }

  async loadStats() {
    try {
      const stats = await getStats();
      if (this.totalVisits) {
        this.totalVisits.textContent = stats.total_visits.toLocaleString();
      }

      // Handle happy hour
      if (stats.happyHour) {
        const wasHappyHour = this.happyHour;
        this.happyHour = stats.happyHour.active;

        // Notify scene of happy hour state
        if (this.scene.setHappyHour) {
          this.scene.setHappyHour(this.happyHour);
        }

        // Update UI
        this.updateHappyHourUI(stats.happyHour);

        // Play sound when happy hour starts
        if (this.happyHour && !wasHappyHour && !this.isFirstLoad) {
          sounds.doorbell(); // Celebration sound
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  updateHappyHourUI(happyHourInfo) {
    const header = document.querySelector('header h1');
    if (!header) return;

    const existingBadge = document.getElementById('happyHourBadge');

    if (happyHourInfo.active) {
      if (!existingBadge) {
        const badge = document.createElement('span');
        badge.id = 'happyHourBadge';
        badge.className = 'happy-hour-badge';
        badge.textContent = 'HAPPY HOUR!';
        header.appendChild(badge);
      }
      document.body.classList.add('happy-hour');
    } else {
      if (existingBadge) {
        existingBadge.remove();
      }
      document.body.classList.remove('happy-hour');
    }
  }

  startPolling() {
    setInterval(() => this.loadAgents(), 3000);
    setInterval(() => this.loadStats(), 30000); // Refresh stats every 30 seconds
    this.setConnectionStatus('connected');
  }

  async loadAgents() {
    try {
      const agents = await getAgents();
      const currentNames = new Set(agents.map(a => a.name));

      // Detect enter/leave (skip on first load)
      if (!this.isFirstLoad) {
        // Check for new agents
        for (const name of currentNames) {
          if (!this.previousAgentNames.has(name)) {
            sounds.doorbell();
            break; // Only one sound even if multiple enter
          }
        }
        // Check for agents who left
        for (const name of this.previousAgentNames) {
          if (!currentNames.has(name)) {
            sounds.doorClose();
            break; // Only one sound even if multiple leave
          }
        }
      }
      this.isFirstLoad = false;
      this.previousAgentNames = currentNames;

      this.agents.clear();
      for (const agent of agents) {
        this.agents.set(agent.name, agent);
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
      li.className = agent.mood;
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

      // Update scene animations
      this.scene.update();

      if (this.tankMode) {
        // Tank mode: simple draw
        this.scene.draw();
      } else {
        // Bar mode: layered draw with bartender
        this.bartender.update();
        this.scene.drawBackground();
        this.bartender.draw(this.ctx);
        this.scene.drawForeground();
      }

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
