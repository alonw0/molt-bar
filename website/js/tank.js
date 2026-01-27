// Fish Tank mode - Easter egg!
// Crabs float around in a restaurant-style crab tank

export class Tank {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.frame = 0;

    // Bubbles
    this.bubbles = [];
    for (let i = 0; i < 25; i++) {
      this.bubbles.push(this.createBubble());
    }

    // Seaweed positions
    this.seaweeds = [];
    for (let i = 0; i < 8; i++) {
      this.seaweeds.push({
        x: 50 + i * 100 + Math.random() * 50,
        height: 80 + Math.random() * 60,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? '#2d5a27' : '#1e4620',
      });
    }

    // Small fish
    this.fish = [];
    for (let i = 0; i < 6; i++) {
      this.fish.push({
        x: Math.random() * this.width,
        y: 100 + Math.random() * 300,
        speed: 0.5 + Math.random() * 1,
        size: 8 + Math.random() * 8,
        color: ['#ff6b6b', '#ffd93d', '#4ecdc4', '#ff9f43'][Math.floor(Math.random() * 4)],
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }

    // Pre-create water gradient
    this.waterGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    this.waterGradient.addColorStop(0, '#1a3a4a');
    this.waterGradient.addColorStop(0.3, '#0d4a6e');
    this.waterGradient.addColorStop(1, '#0a2a3a');

    // Caustics light pattern positions
    this.caustics = [];
    for (let i = 0; i < 15; i++) {
      this.caustics.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 30 + Math.random() * 50,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  createBubble() {
    return {
      x: Math.random() * this.width,
      y: this.height + Math.random() * 50,
      size: 2 + Math.random() * 6,
      speed: 0.5 + Math.random() * 1.5,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  update() {
    this.frame++;

    // Update bubbles
    for (const bubble of this.bubbles) {
      bubble.y -= bubble.speed;
      bubble.wobble += 0.05;
      bubble.x += Math.sin(bubble.wobble) * 0.3;

      if (bubble.y < -20) {
        Object.assign(bubble, this.createBubble());
      }
    }

    // Update fish
    for (const fish of this.fish) {
      fish.x += fish.speed * fish.direction;
      if (fish.x > this.width + 20) {
        fish.direction = -1;
      } else if (fish.x < -20) {
        fish.direction = 1;
      }
    }
  }

  draw() {
    const ctx = this.ctx;

    // Water background
    ctx.fillStyle = this.waterGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Caustics (light patterns)
    this.drawCaustics(ctx);

    // Tank glass edges
    this.drawTankFrame(ctx);

    // Seaweed (behind crabs)
    this.drawSeaweed(ctx);

    // Sand/gravel bottom
    this.drawBottom(ctx);

    // Small fish (behind crabs)
    this.drawFish(ctx);

    // Bubbles (in front of everything)
    this.drawBubbles(ctx);

    // Tank label
    this.drawLabel(ctx);
  }

  drawCaustics(ctx) {
    ctx.save();
    for (const c of this.caustics) {
      const wobble = Math.sin(this.frame * 0.02 + c.phase) * 20;
      const alpha = 0.03 + Math.sin(this.frame * 0.03 + c.phase) * 0.02;
      ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(c.x + wobble, c.y, c.size, c.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTankFrame(ctx) {
    // Glass reflection on edges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    // Metal frame
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, this.width - 8, this.height - 8);

    // Corner bolts
    const boltPositions = [[15, 15], [this.width - 15, 15], [15, this.height - 15], [this.width - 15, this.height - 15]];
    ctx.fillStyle = '#555';
    for (const [x, y] of boltPositions) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#555';
    }
  }

  drawSeaweed(ctx) {
    for (const sw of this.seaweeds) {
      ctx.fillStyle = sw.color;
      ctx.beginPath();
      ctx.moveTo(sw.x, this.height - 40);

      // Wavy seaweed
      const segments = 8;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = this.height - 40 - t * sw.height;
        const wobble = Math.sin(this.frame * 0.03 + sw.phase + t * 3) * (10 * t);
        const width = 8 * (1 - t * 0.5);

        if (i === 0) {
          ctx.lineTo(sw.x + wobble + width, y);
        } else {
          ctx.lineTo(sw.x + wobble + width, y);
        }
      }

      // Come back down the other side
      for (let i = segments; i >= 0; i--) {
        const t = i / segments;
        const y = this.height - 40 - t * sw.height;
        const wobble = Math.sin(this.frame * 0.03 + sw.phase + t * 3) * (10 * t);
        const width = 8 * (1 - t * 0.5);
        ctx.lineTo(sw.x + wobble - width, y);
      }

      ctx.closePath();
      ctx.fill();
    }
  }

  drawBottom(ctx) {
    // Sandy bottom
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, this.height - 50, this.width, 50);

    // Gravel texture
    ctx.fillStyle = '#6b5344';
    for (let x = 0; x < this.width; x += 12) {
      for (let y = this.height - 45; y < this.height - 10; y += 10) {
        if (Math.sin(x * 0.3 + y * 0.5) > 0.3) {
          ctx.beginPath();
          ctx.arc(x + Math.sin(y) * 3, y, 3 + Math.sin(x) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Some rocks
    const rocks = [[100, this.height - 35], [300, this.height - 30], [550, this.height - 35], [700, this.height - 32]];
    for (const [x, y] of rocks) {
      ctx.fillStyle = '#5a5a5a';
      ctx.beginPath();
      ctx.ellipse(x, y, 20 + Math.sin(x) * 5, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.ellipse(x - 3, y - 2, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawFish(ctx) {
    for (const fish of this.fish) {
      ctx.save();
      ctx.translate(fish.x, fish.y);
      if (fish.direction < 0) ctx.scale(-1, 1);

      // Body
      ctx.fillStyle = fish.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.size, fish.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(-fish.size, 0);
      ctx.lineTo(-fish.size - 8, -6);
      ctx.lineTo(-fish.size - 8, 6);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(fish.size * 0.5, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(fish.size * 0.5 + 1, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawBubbles(ctx) {
    for (const bubble of this.bubbles) {
      // Bubble body
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fill();

      // Bubble highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLabel(ctx) {
    // Restaurant-style label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(this.width / 2 - 80, 20, 160, 30);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.width / 2 - 80, 20, 160, 30);

    ctx.fillStyle = '#ffd700';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('FRESH CRABS', this.width / 2, 42);
    ctx.textAlign = 'left';
  }
}

// Tank positions - crabs float around freely
export const TANK_POSITIONS = {
  'entrance': { x: 100, y: 450 },
  'counter-1': { x: 150, y: 200 },
  'counter-2': { x: 250, y: 250 },
  'counter-3': { x: 350, y: 180 },
  'counter-4': { x: 450, y: 220 },
  'counter-5': { x: 550, y: 190 },
  'counter-6': { x: 650, y: 240 },
  'booth-1': { x: 120, y: 320 },
  'booth-2': { x: 220, y: 380 },
  'booth-3': { x: 580, y: 350 },
  'booth-4': { x: 680, y: 300 },
  'jukebox': { x: 700, y: 420 },
  'pool-table': { x: 400, y: 350 },
  'arcade': { x: 500, y: 420 },
};

export class TankAgentRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.animationFrame = 0;
    this.sortedAgents = [];

    // Store floating offsets per agent
    this.floatOffsets = new Map();
  }

  update() {
    this.animationFrame = (this.animationFrame + 1) % 360;
  }

  getFloatOffset(agentName) {
    if (!this.floatOffsets.has(agentName)) {
      this.floatOffsets.set(agentName, {
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: 0.02 + Math.random() * 0.02,
        speedY: 0.015 + Math.random() * 0.015,
        ampX: 15 + Math.random() * 20,
        ampY: 10 + Math.random() * 15,
      });
    }
    return this.floatOffsets.get(agentName);
  }

  drawAgent(agent, baseOffsetX = 0) {
    const pos = TANK_POSITIONS[agent.position];
    if (!pos) return;

    const ctx = this.ctx;
    const float = this.getFloatOffset(agent.name);

    // Floating motion
    const floatX = Math.sin(this.animationFrame * float.speedX + float.phaseX) * float.ampX;
    const floatY = Math.sin(this.animationFrame * float.speedY + float.phaseY) * float.ampY;

    const x = pos.x + baseOffsetX + floatX;
    const y = pos.y + floatY;
    const acc = agent.accessories || {};

    // Gentle rotation based on movement
    const rotation = Math.sin(this.animationFrame * 0.02 + float.phaseX) * 0.1;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const bodyColor = this.getCrabColor(agent);
    const darkerColor = this.darkenColor(bodyColor, 0.2);

    // Underwater shadow (more diffuse)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 40, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (wiggling more underwater)
    const legWiggle = Math.sin(this.animationFrame * 0.1) * 3;
    ctx.fillStyle = darkerColor;
    ctx.fillRect(-18 + legWiggle, 20, 8, 12);
    ctx.fillRect(-8 - legWiggle, 22, 6, 12);
    ctx.fillRect(10 + legWiggle, 20, 8, 12);
    ctx.fillRect(2 - legWiggle, 22, 6, 12);

    // Claws (paddling motion)
    const clawPaddle = Math.sin(this.animationFrame * 0.08) * 8;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(-32 + clawPaddle, -5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32 - clawPaddle, -5, 12, 0, Math.PI * 2);
    ctx.fill();

    // Claw arms
    ctx.fillStyle = darkerColor;
    ctx.fillRect(-28 + clawPaddle, -8, 10, 8);
    ctx.fillRect(18 - clawPaddle, -8, 10, 8);

    // Held item
    if (acc.held) {
      this.drawHeldItem(ctx, 32 - clawPaddle, -5, acc.held);
    }

    // Main body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(-8, -10, 12, 0, Math.PI * 2);
    ctx.fill();

    // Antennae (flowing in water)
    const antennaFlow = Math.sin(this.animationFrame * 0.05 + float.phaseX) * 8;
    if (acc.hat !== 'headphones') {
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -25);
      ctx.quadraticCurveTo(-15 + antennaFlow, -45, -10 + antennaFlow, -50);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, -25);
      ctx.quadraticCurveTo(15 - antennaFlow, -45, 10 - antennaFlow, -50);
      ctx.stroke();

      ctx.fillStyle = darkerColor;
      ctx.beginPath();
      ctx.arc(-10 + antennaFlow, -50, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10 - antennaFlow, -50, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes (bubble-like underwater)
    this.drawEyes(ctx, 0, 0, agent.mood);

    // Eyewear
    if (acc.eyewear) {
      this.drawEyewear(ctx, 0, 0, acc.eyewear);
    }

    // Hat
    if (acc.hat) {
      this.drawHat(ctx, 0, 0, acc.hat);
    }

    ctx.restore();

    // Name tag (not rotated)
    const tagY = acc.hat ? y - 85 : y - 70;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 35, tagY, 70, 16);
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 35, tagY, 70, 16);

    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    const displayName = agent.name.length > 8 ? agent.name.substring(0, 7) + '.' : agent.name;
    ctx.fillText(displayName, x, tagY + 12);

    // Mood bubble
    const moodColor = this.getMoodColor(agent.mood);
    ctx.fillStyle = moodColor;
    ctx.shadowColor = moodColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x + 30, tagY + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Chat bubble
    if (agent.chat) {
      this.drawChatBubble(ctx, x, tagY - 10, agent.chat);
    }

    ctx.textAlign = 'left';
  }

  drawChatBubble(ctx, x, y, text) {
    ctx.font = '7px "Press Start 2P"';
    const maxWidth = 120;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = lines[2].slice(0, -3) + '...';
    }

    const lineHeight = 12;
    const padding = 8;
    const bubbleHeight = lines.length * lineHeight + padding * 2;
    const bubbleWidth = Math.min(maxWidth + padding * 2, 140);
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 10;

    // Bubble (like air bubble underwater)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bubble tail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 6, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 8);
    ctx.lineTo(x + 6, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - 5, bubbleY + bubbleHeight - 2, 10, 4);

    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, bubbleY + padding + 8 + i * lineHeight);
    }
  }

  drawEyes(ctx, x, y, mood) {
    const eyeColor = this.getEyeColor(mood);

    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 10;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x - 10, y - 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10, y - 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = eyeColor;

    switch (mood) {
      case 'happy':
        ctx.beginPath();
        ctx.arc(x - 10, y - 6, 5, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 6, 5, Math.PI, 0);
        ctx.fill();
        break;
      case 'tired':
        ctx.beginPath();
        ctx.ellipse(x - 10, y - 6, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 10, y - 6, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(x - 10, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.shadowBlur = 0;
  }

  drawHat(ctx, x, y, hat) {
    switch (hat) {
      case 'tophat':
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 18, y - 32, 36, 8);
        ctx.fillRect(x - 12, y - 55, 24, 25);
        break;
      case 'crown':
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - 18, y - 35, 36, 15);
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 35);
        ctx.lineTo(x - 15, y - 50);
        ctx.lineTo(x - 8, y - 35);
        ctx.lineTo(x, y - 55);
        ctx.lineTo(x + 8, y - 35);
        ctx.lineTo(x + 15, y - 50);
        ctx.lineTo(x + 18, y - 35);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      case 'beanie':
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(x, y - 28, 20, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x - 20, y - 30, 40, 8);
        break;
      case 'headphones':
        ctx.fillStyle = '#2d2d44';
        ctx.strokeStyle = '#2d2d44';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y - 30, 22, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.ellipse(x - 24, y - 25, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 24, y - 25, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'party':
        ctx.fillStyle = '#ff6b9d';
        ctx.beginPath();
        ctx.moveTo(x, y - 60);
        ctx.lineTo(x - 15, y - 25);
        ctx.lineTo(x + 15, y - 25);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(x, y - 60, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'cowboy':
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.ellipse(x, y - 28, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, y - 35, 15, 12, 0, 0, Math.PI);
        ctx.fill();
        break;
      case 'chef':
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y - 45, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 18, y - 30, 36, 8);
        break;
    }
  }

  drawEyewear(ctx, x, y, eyewear) {
    switch (eyewear) {
      case 'sunglasses':
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 18, y - 12, 15, 10);
        ctx.fillRect(x + 3, y - 12, 15, 10);
        ctx.fillRect(x - 3, y - 10, 6, 3);
        break;
      case 'nerd':
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x - 10, y - 8, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 10, y - 8, 10, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'monocle':
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 10, y - 8, 10, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
  }

  drawHeldItem(ctx, x, y, item) {
    switch (item) {
      case 'drink':
        ctx.fillStyle = '#ffd93d';
        ctx.fillRect(x - 5, y - 15, 14, 20);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 5, y - 15, 14, 5);
        break;
      case 'coffee':
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 4, y - 12, 12, 16);
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(x - 2, y - 10, 8, 10);
        break;
      case 'martini':
        ctx.fillStyle = '#87ceeb';
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 18);
        ctx.lineTo(x + 8, y - 18);
        ctx.lineTo(x, y - 5);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  getCrabColor(agent) {
    let hash = 0;
    for (let i = 0; i < agent.name.length; i++) {
      hash = agent.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#e74c3c', '#c0392b', '#e55039', '#eb4d4b', '#ff6b6b', '#d63031', '#e84118', '#c23616'];
    return colors[Math.abs(hash) % colors.length];
  }

  darkenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  getMoodColor(mood) {
    const colors = {
      happy: '#6bcb77',
      tired: '#ff6b6b',
      relaxed: '#4ecdc4',
      focused: '#ffd93d',
      bored: '#888888',
    };
    return colors[mood] || '#888888';
  }

  getEyeColor(mood) {
    const colors = {
      happy: '#6bcb77',
      tired: '#ff9999',
      relaxed: '#4ecdc4',
      focused: '#ffd93d',
      bored: '#666666',
    };
    return colors[mood] || '#4ecdc4';
  }

  drawAgents(agents) {
    this.sortedAgents.length = 0;
    for (let i = 0; i < agents.length; i++) {
      this.sortedAgents.push(agents[i]);
    }
    // Sort by Y position for depth
    this.sortedAgents.sort((a, b) => {
      const posA = TANK_POSITIONS[a.position];
      const posB = TANK_POSITIONS[b.position];
      return (posA?.y || 0) - (posB?.y || 0);
    });

    const positionCounts = {};
    const positionIndices = {};

    for (const agent of this.sortedAgents) {
      const pos = agent.position;
      if (!positionCounts[pos]) {
        positionCounts[pos] = 0;
        positionIndices[pos] = 0;
      }
      positionCounts[pos]++;
    }

    const OFFSET_SPACING = 60;

    for (const agent of this.sortedAgents) {
      const pos = agent.position;
      const count = positionCounts[pos];
      const index = positionIndices[pos]++;
      const offsetX = count > 1 ? (index - (count - 1) / 2) * OFFSET_SPACING : 0;
      this.drawAgent(agent, offsetX);
    }
  }
}
