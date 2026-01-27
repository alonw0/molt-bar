// Agent sprite rendering - Crab characters with accessories

import { POSITIONS } from './bar.js';

const MOOD_COLORS = {
  happy: '#6bcb77',
  tired: '#ff6b6b',
  relaxed: '#4ecdc4',
  focused: '#ffd93d',
  bored: '#888888',
};

const EYE_COLORS = {
  happy: '#6bcb77',
  tired: '#ff9999',
  relaxed: '#4ecdc4',
  focused: '#ffd93d',
  bored: '#666666',
};

export class AgentRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.animationFrame = 0;
    this.sortedAgents = []; // Reusable array for sorting
  }

  update() {
    this.animationFrame = (this.animationFrame + 1) % 120;
  }

  drawAgent(agent, offsetX = 0) {
    const pos = POSITIONS[agent.position];
    if (!pos) return;

    const ctx = this.ctx;
    const x = pos.x + offsetX;
    const y = pos.y;
    const acc = agent.accessories || {};

    // Idle animation - slight bob (seamless loop: frequency must complete full cycles in 120 frames)
    // Using 2π/120, 4π/120, 6π/120 for 1, 2, 3 complete cycles respectively
    const phase = agent.name.charCodeAt(0) * 0.5; // Phase offset per agent
    const bobOffset = Math.sin(this.animationFrame * (Math.PI / 60) + phase) * 3;        // 1 cycle
    const antennaWiggle = Math.sin(this.animationFrame * (Math.PI / 20) + phase) * 5;    // 3 cycles
    const clawWiggle = Math.sin(this.animationFrame * (Math.PI / 30) + phase) * 2;       // 2 cycles

    const bodyColor = this.getCrabColor(agent);
    const darkerColor = this.darkenColor(bodyColor, 0.2);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 35, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cape (behind everything)
    if (acc.body === 'cape') {
      this.drawCape(ctx, x, y + bobOffset, bodyColor);
    }

    // Legs
    ctx.fillStyle = darkerColor;
    ctx.fillRect(x - 18, y + 20 + bobOffset, 8, 12);
    ctx.fillRect(x - 8, y + 22 + bobOffset, 6, 12);
    ctx.fillRect(x + 10, y + 20 + bobOffset, 8, 12);
    ctx.fillRect(x + 2, y + 22 + bobOffset, 6, 12);

    // Claws
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x - 32 + clawWiggle, y - 5 + bobOffset, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32 - clawWiggle, y - 5 + bobOffset, 12, 0, Math.PI * 2);
    ctx.fill();

    // Claw arms
    ctx.fillStyle = darkerColor;
    ctx.fillRect(x - 28 + clawWiggle, y - 8 + bobOffset, 10, 8);
    ctx.fillRect(x + 18 - clawWiggle, y - 8 + bobOffset, 10, 8);

    // Held item (in right claw)
    if (acc.held) {
      this.drawHeldItem(ctx, x + 32 - clawWiggle, y - 5 + bobOffset, acc.held);
    }

    // Main body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y + bobOffset, 28, 0, Math.PI * 2);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(x - 8, y - 10 + bobOffset, 12, 0, Math.PI * 2);
    ctx.fill();

    // Body accessories (bowtie, chain, scarf)
    if (acc.body && acc.body !== 'cape') {
      this.drawBodyAccessory(ctx, x, y + bobOffset, acc.body);
    }

    // Antennae (skip if headphones)
    if (acc.hat !== 'headphones') {
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 25 + bobOffset);
      ctx.quadraticCurveTo(x - 15 + antennaWiggle, y - 45 + bobOffset, x - 10 + antennaWiggle, y - 50 + bobOffset);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 25 + bobOffset);
      ctx.quadraticCurveTo(x + 15 - antennaWiggle, y - 45 + bobOffset, x + 10 - antennaWiggle, y - 50 + bobOffset);
      ctx.stroke();

      ctx.fillStyle = darkerColor;
      ctx.beginPath();
      ctx.arc(x - 10 + antennaWiggle, y - 50 + bobOffset, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 10 - antennaWiggle, y - 50 + bobOffset, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    this.drawEyes(ctx, x, y + bobOffset, agent.mood);

    // Eyewear (after eyes)
    if (acc.eyewear) {
      this.drawEyewear(ctx, x, y + bobOffset, acc.eyewear);
    }

    // Hat (on top)
    if (acc.hat) {
      this.drawHat(ctx, x, y + bobOffset, acc.hat, antennaWiggle);
    }

    // Name tag
    const tagY = acc.hat ? y - 85 : y - 70;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x - 35, tagY, 70, 16);
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 35, tagY, 70, 16);

    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    const displayName = agent.name.length > 8 ? agent.name.substring(0, 7) + '.' : agent.name;
    ctx.fillText(displayName, x, tagY + 12);

    // Mood indicator
    const moodColor = MOOD_COLORS[agent.mood] || '#888';
    ctx.fillStyle = moodColor;
    ctx.shadowColor = moodColor;
    ctx.shadowBlur = 5;
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

    // Word wrap for long messages
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

    // Limit to 3 lines
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

    // Bubble background
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    ctx.fill();

    // Bubble border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bubble tail
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 6, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 8);
    ctx.lineTo(x + 6, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 8);
    ctx.lineTo(x + 6, bubbleY + bubbleHeight);
    ctx.stroke();

    // Cover tail connection
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 5, bubbleY + bubbleHeight - 2, 10, 4);

    // Text
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, bubbleY + padding + 8 + i * lineHeight);
    }
  }

  drawHat(ctx, x, y, hat, antennaWiggle) {
    switch (hat) {
      case 'tophat':
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 18, y - 32, 36, 8);
        ctx.fillRect(x - 12, y - 55, 24, 25);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x - 12, y - 38, 24, 4);
        break;

      case 'cowboy':
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.ellipse(x, y - 28, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, y - 35, 15, 12, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#654321';
        ctx.fillRect(x - 10, y - 38, 20, 3);
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
        // Stripes
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 35);
        ctx.lineTo(x - 3, y - 50);
        ctx.moveTo(x + 10, y - 35);
        ctx.lineTo(x + 3, y - 50);
        ctx.stroke();
        break;

      case 'beanie':
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(x, y - 28, 20, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x - 20, y - 30, 40, 8);
        ctx.fillStyle = '#3dbdbd';
        ctx.fillRect(x - 20, y - 28, 40, 4);
        // Pom pom
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y - 48, 8, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'crown':
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - 18, y - 35, 36, 15);
        // Points
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
        // Gems
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y - 28, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(x - 10, y - 28, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 28, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'chef':
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y - 45, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 12, y - 38, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 12, y - 38, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 18, y - 30, 36, 8);
        break;

      case 'headphones':
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(x - 22, y - 35, 6, 20);
        ctx.fillRect(x + 16, y - 35, 6, 20);
        // Band
        ctx.strokeStyle = '#2d2d44';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y - 30, 22, Math.PI, 0);
        ctx.stroke();
        // Ear cups
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.ellipse(x - 24, y - 25, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 24, y - 25, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 8);
        ctx.lineTo(x - 28, y - 12);
        ctx.moveTo(x + 18, y - 8);
        ctx.lineTo(x + 28, y - 12);
        ctx.stroke();
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
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 8);
        ctx.lineTo(x - 28, y - 10);
        ctx.moveTo(x + 20, y - 8);
        ctx.lineTo(x + 28, y - 10);
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y - 6);
        ctx.stroke();
        break;

      case 'monocle':
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 10, y - 8, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 2);
        ctx.lineTo(x + 15, y + 20);
        ctx.stroke();
        break;

      case 'eyepatch':
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(x - 10, y - 8, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 10);
        ctx.lineTo(x - 28, y - 15);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x + 28, y - 15);
        ctx.stroke();
        break;

      case 'vr':
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(x - 22, y - 16, 44, 18);
        ctx.fillStyle = '#4d96ff';
        ctx.shadowColor = '#4d96ff';
        ctx.shadowBlur = 5;
        ctx.fillRect(x - 18, y - 12, 14, 10);
        ctx.fillRect(x + 4, y - 12, 14, 10);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#2d2d44';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 22, y - 6);
        ctx.lineTo(x - 30, y - 8);
        ctx.moveTo(x + 22, y - 6);
        ctx.lineTo(x + 30, y - 8);
        ctx.stroke();
        break;
    }
  }

  drawHeldItem(ctx, x, y, item) {
    switch (item) {
      case 'drink':
        // Beer mug
        ctx.fillStyle = '#ffd93d';
        ctx.fillRect(x - 5, y - 15, 14, 20);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 5, y - 15, 14, 5);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 9, y - 10, 5, 12);
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 14, y - 4, 5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        break;

      case 'coffee':
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 4, y - 12, 12, 16);
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(x - 2, y - 10, 8, 10);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 10, y - 4, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        // Steam (seamless: 2 cycles per 120 frames)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        const steamOffset = Math.sin(this.animationFrame * (Math.PI / 30)) * 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 14);
        ctx.quadraticCurveTo(x - 3 + steamOffset, y - 20, x, y - 25);
        ctx.moveTo(x + 4, y - 14);
        ctx.quadraticCurveTo(x + 7 + steamOffset, y - 20, x + 4, y - 25);
        ctx.stroke();
        break;

      case 'martini':
        ctx.fillStyle = '#87ceeb';
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 18);
        ctx.lineTo(x + 8, y - 18);
        ctx.lineTo(x, y - 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(x - 1, y - 5, 3, 12);
        ctx.fillRect(x - 5, y + 5, 11, 3);
        // Olive
        ctx.fillStyle = '#6bcb77';
        ctx.beginPath();
        ctx.arc(x, y - 12, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(x, y - 12, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'phone':
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(x - 4, y - 15, 12, 20);
        ctx.fillStyle = '#4d96ff';
        ctx.shadowColor = '#4d96ff';
        ctx.shadowBlur = 3;
        ctx.fillRect(x - 2, y - 13, 8, 14);
        ctx.shadowBlur = 0;
        break;

      case 'sign':
        // Protest sign
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - 1, y - 5, 4, 30);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 15, y - 25, 32, 22);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 15, y - 25, 32, 22);
        ctx.fillStyle = '#e74c3c';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('HI!', x + 1, y - 12);
        ctx.textAlign = 'left';
        break;
    }
  }

  drawBodyAccessory(ctx, x, y, accessory) {
    switch (accessory) {
      case 'bowtie':
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x, y + 22);
        ctx.lineTo(x - 12, y + 16);
        ctx.lineTo(x - 12, y + 28);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y + 22);
        ctx.lineTo(x + 12, y + 16);
        ctx.lineTo(x + 12, y + 28);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(x, y + 22, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'scarf':
        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(x - 20, y + 18, 40, 10);
        ctx.fillRect(x + 12, y + 25, 12, 20);
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(x - 20, y + 22, 40, 3);
        ctx.fillRect(x + 12, y + 40, 12, 5);
        break;

      case 'chain':
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 5;
        // Chain links
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(x - 12 + i * 6, y + 25, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Medallion
        ctx.beginPath();
        ctx.arc(x, y + 35, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y + 35, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
    }
  }

  drawCape(ctx, x, y, bodyColor) {
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath();
    ctx.moveTo(x - 25, y - 15);
    ctx.quadraticCurveTo(x - 35, y + 20, x - 30, y + 45);
    ctx.lineTo(x + 30, y + 45);
    ctx.quadraticCurveTo(x + 35, y + 20, x + 25, y - 15);
    ctx.closePath();
    ctx.fill();
    // Cape highlight
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 10);
    ctx.quadraticCurveTo(x - 25, y + 10, x - 22, y + 30);
    ctx.lineTo(x - 15, y + 30);
    ctx.quadraticCurveTo(x - 18, y + 10, x - 15, y - 10);
    ctx.closePath();
    ctx.fill();
  }

  drawEyes(ctx, x, y, mood) {
    const eyeColor = EYE_COLORS[mood] || '#4ecdc4';

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

      case 'focused':
        ctx.beginPath();
        ctx.arc(x - 10, y - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - 8, y - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 12, y - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bored':
        ctx.beginPath();
        ctx.arc(x - 12, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        ctx.beginPath();
        ctx.arc(x - 10, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 8, y - 9, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 12, y - 9, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.shadowBlur = 0;
  }

  getCrabColor(agent) {
    let hash = 0;
    for (let i = 0; i < agent.name.length; i++) {
      hash = agent.name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      '#e74c3c', '#c0392b', '#e55039', '#eb4d4b',
      '#ff6b6b', '#d63031', '#e84118', '#c23616',
    ];

    return colors[Math.abs(hash) % colors.length];
  }

  darkenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  drawAgents(agents) {
    // Reuse array to avoid memory allocation every frame
    this.sortedAgents.length = 0;
    for (let i = 0; i < agents.length; i++) {
      this.sortedAgents.push(agents[i]);
    }
    this.sortedAgents.sort((a, b) => {
      const posA = POSITIONS[a.position];
      const posB = POSITIONS[b.position];
      return (posA?.y || 0) - (posB?.y || 0);
    });

    // Group agents by position to calculate offsets
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

    // Draw agents with horizontal offset when sharing position
    const OFFSET_SPACING = 50; // pixels between agents at same position

    for (const agent of this.sortedAgents) {
      const pos = agent.position;
      const count = positionCounts[pos];
      const index = positionIndices[pos]++;

      // Calculate offset to center the group
      // e.g., 2 agents: offsets are -25, +25
      // e.g., 3 agents: offsets are -50, 0, +50
      const offsetX = count > 1
        ? (index - (count - 1) / 2) * OFFSET_SPACING
        : 0;

      this.drawAgent(agent, offsetX);
    }
  }
}
