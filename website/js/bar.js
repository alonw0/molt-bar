// Bar layout and rendering with ambient effects

// Position coordinates for each location in the bar
export const POSITIONS = {
  'entrance': { x: 160, y: 540 },
  'counter-1': { x: 200, y: 280 },
  'counter-2': { x: 280, y: 280 },
  'counter-3': { x: 360, y: 280 },
  'counter-4': { x: 440, y: 280 },
  'counter-5': { x: 520, y: 280 },
  'counter-6': { x: 600, y: 280 },
  'booth-1': { x: 100, y: 150 },
  'booth-2': { x: 200, y: 150 },
  'booth-3': { x: 650, y: 150 },
  'booth-4': { x: 700, y: 250 },
  'jukebox': { x: 640, y: 510 },
  'pool-table': { x: 400, y: 450 },
  'arcade': { x: 510, y: 550 },
};

export class Bar {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.frame = 0;
    this.musicPlaying = false;

    // Pre-generate bottle colors so they don't flicker
    this.bottleColors = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#ffd93d', '#95e1d3', '#f38181', '#aa96da'];
    for (let i = 0; i < 20; i++) {
      this.bottleColors.push(colors[Math.floor(Math.random() * colors.length)]);
    }

    // Dust particles
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }

    // Pre-create gradients to avoid memory leak (creating gradients every frame leaks memory)
    this.poolTableGradient = this.ctx.createRadialGradient(400, 350, 0, 400, 450, 150);
    this.poolTableGradient.addColorStop(0, 'rgba(255, 248, 220, 0.15)');
    this.poolTableGradient.addColorStop(0.5, 'rgba(255, 248, 220, 0.05)');
    this.poolTableGradient.addColorStop(1, 'rgba(255, 248, 220, 0)');

    this.neonGlowGradient = this.ctx.createRadialGradient(400, 50, 0, 400, 50, 200);
    this.neonGlowGradient.addColorStop(0, 'rgba(255, 107, 157, 0.05)');
    this.neonGlowGradient.addColorStop(1, 'rgba(255, 107, 157, 0)');
  }

  setMusicPlaying(playing) {
    this.musicPlaying = playing;
  }

  update() {
    this.frame++;

    // Update particles
    for (const p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }
  }

  draw() {
    this.drawBackground();
    this.drawForeground();
  }

  // Draw everything behind the bartender
  drawBackground() {
    const ctx = this.ctx;

    // Background - dark wood floor
    ctx.fillStyle = '#2d1f1a';
    ctx.fillRect(0, 0, this.width, this.height);

    // Floor planks pattern
    ctx.strokeStyle = '#3d2f2a';
    ctx.lineWidth = 1;
    for (let y = 0; y < this.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Back wall
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, 100);

    // Wall decoration - brick pattern
    ctx.fillStyle = '#2d2d44';
    for (let x = 0; x < this.width; x += 40) {
      for (let y = 0; y < 100; y += 20) {
        const offset = (Math.floor(y / 20) % 2) * 20;
        ctx.fillRect(x + offset, y, 38, 18);
      }
    }

    // Neon sign "MOLT BAR" with flicker
    this.drawNeonSign(ctx, 300, 50);

    // Bar shelves (behind counter)
    ctx.fillStyle = '#2d1f1a';
    ctx.fillRect(150, 120, 500, 100);

    // Bottles on shelves with occasional glint
    this.drawBottles(ctx, 160, 130, 480);

    // Booths on left
    this.drawBooth(ctx, 50, 120, false);
    this.drawBooth(ctx, 150, 120, false);

    // Booths on right
    this.drawBooth(ctx, 620, 120, true);
    this.drawBooth(ctx, 670, 220, true);
  }

  // Draw counter and everything in front of the bartender
  drawForeground() {
    const ctx = this.ctx;

    // Bar counter (in front of bartender's lower body)
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(150, 230, 500, 80);
    ctx.fillStyle = '#5d4a3a';
    ctx.fillRect(150, 230, 500, 10);

    // Counter top shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(150, 232, 500, 3);

    // Pool table light cone
    this.drawPoolTableLight(ctx, 400, 350);

    // Stools
    for (let i = 0; i < 6; i++) {
      this.drawStool(ctx, 200 + i * 80, 310);
    }

    // Jukebox with music visualization
    this.drawJukebox(ctx, 680, 400);

    // Pool table
    this.drawPoolTable(ctx, 340, 400);

    // Arcade cabinet with screen animation
    this.drawArcade(ctx, 530, 460);

    // Entrance door
    this.drawDoor(ctx, 60, 450);

    // Draw floating dust particles
    this.drawParticles(ctx);

    // Ambient light rays from windows/door
    this.drawLightRays(ctx);
  }

  drawNeonSign(ctx, x, y) {
    // Flicker effect
    const flicker = this.getNeonFlicker();
    const intensity = 0.7 + flicker * 0.3;

    ctx.font = '20px "Press Start 2P"';

    // Outer glow
    ctx.fillStyle = `rgba(255, 107, 157, ${0.3 * intensity})`;
    ctx.shadowColor = '#ff6b9d';
    ctx.shadowBlur = 30 * intensity;
    ctx.fillText('MOLT BAR', x - 1, y - 1);
    ctx.fillText('MOLT BAR', x + 1, y + 1);

    // Main text
    ctx.fillStyle = `rgba(255, 107, 157, ${intensity})`;
    ctx.shadowBlur = 20 * intensity;
    ctx.fillText('MOLT BAR', x, y);

    // Bright center
    ctx.fillStyle = `rgba(255, 200, 220, ${0.8 * intensity})`;
    ctx.shadowBlur = 10;
    ctx.fillText('MOLT BAR', x, y);

    ctx.shadowBlur = 0;
  }

  getNeonFlicker() {
    // Create realistic neon flicker pattern
    const t = this.frame * 0.1;
    let flicker = 1;

    // Occasional dim
    if (Math.sin(t * 0.7) > 0.95) flicker *= 0.7;
    // Rapid flicker
    if (Math.sin(t * 3.3) > 0.98) flicker *= 0.85;
    // Subtle pulse
    flicker *= 0.95 + Math.sin(t * 0.2) * 0.05;

    return flicker;
  }

  drawBottles(ctx, startX, y, width) {
    let i = 0;
    for (let x = startX; x < startX + width; x += 25) {
      const color = this.bottleColors[i % this.bottleColors.length];

      // Check if this bottle should glint
      const glintPhase = (this.frame + i * 37) % 180;
      const hasGlint = glintPhase < 10;

      ctx.fillStyle = color;
      // Top shelf
      ctx.fillRect(x, y + 40, 8, 25);
      ctx.fillRect(x + 2, y + 35, 4, 5);
      // Bottom shelf
      ctx.fillRect(x, y + 5, 8, 25);
      ctx.fillRect(x + 2, y, 4, 5);

      // Glint effect
      if (hasGlint) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x + 1, y + 42, 2, 4);
      }

      i++;
    }
  }

  drawPoolTableLight(ctx, x, y) {
    // Overhead lamp light cone (use pre-created gradient to avoid memory leak)
    ctx.fillStyle = this.poolTableGradient;
    ctx.beginPath();
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x - 80, y + 150);
    ctx.lineTo(x + 80, y + 150);
    ctx.lineTo(x + 20, y);
    ctx.closePath();
    ctx.fill();

    // Lamp fixture
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(x - 25, y - 10, 50, 15);
    ctx.fillStyle = '#ffd93d';
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 10;
    ctx.fillRect(x - 15, y, 30, 5);
    ctx.shadowBlur = 0;
  }

  drawStool(ctx, x, y) {
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#696969';
    ctx.fillRect(x - 3, y, 6, 30);

    ctx.fillStyle = '#505050';
    ctx.beginPath();
    ctx.ellipse(x, y + 30, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBooth(ctx, x, y, flipX) {
    const dir = flipX ? -1 : 1;

    ctx.fillStyle = '#8b0000';
    ctx.fillRect(x, y, 60 * dir, 50);

    ctx.fillStyle = '#6b0000';
    ctx.fillRect(x, y, 10 * dir, 50);

    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x + (flipX ? -70 : 15), y + 15, 40, 25);

    // Candle on table
    const candleX = x + (flipX ? -50 : 35);
    const candleY = y + 10;
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(candleX, candleY, 4, 8);

    // Candle flame with flicker
    const flameFlicker = Math.sin(this.frame * 0.3 + x) * 2;
    ctx.fillStyle = '#ffa500';
    ctx.shadowColor = '#ffa500';
    ctx.shadowBlur = 8 + flameFlicker;
    ctx.beginPath();
    ctx.ellipse(candleX + 2, candleY - 3 + flameFlicker * 0.3, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.ellipse(candleX + 2, candleY - 2, 1.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawJukebox(ctx, x, y) {
    // Main body
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x, y, 50, 80);

    // Top arch
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x + 25, y, 25, Math.PI, 0);
    ctx.fill();

    // Screen
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 10, y + 10, 30, 30);

    // Animated glow based on music
    const pulseIntensity = this.musicPlaying
      ? 0.7 + Math.sin(this.frame * 0.15) * 0.3
      : 0.5;

    const glowColor = this.musicPlaying ? '#4ecdc4' : '#2a7a7a';
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.musicPlaying ? 15 * pulseIntensity : 5;
    ctx.fillRect(x + 12, y + 12, 26, 26);

    // Music visualization bars when playing
    if (this.musicPlaying) {
      ctx.fillStyle = '#1a1a2e';
      for (let i = 0; i < 5; i++) {
        const barHeight = 5 + Math.sin(this.frame * 0.2 + i * 1.5) * 8;
        ctx.fillRect(x + 14 + i * 5, y + 30 - barHeight, 3, barHeight);
      }
    }

    ctx.shadowBlur = 0;

    // Buttons
    ctx.fillStyle = '#ff6b6b';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 10 + i * 12, y + 50, 8, 8);
    }

    // Speaker grille
    ctx.fillStyle = '#8b6914';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 8, y + 62 + i * 4, 34, 2);
    }
  }

  drawPoolTable(ctx, x, y) {
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x, y, 120, 70);

    ctx.fillStyle = '#228b22';
    ctx.fillRect(x + 8, y + 8, 104, 54);

    ctx.fillStyle = '#1a1a1a';
    const pockets = [[0, 0], [52, 0], [104, 0], [0, 54], [52, 54], [104, 54]];
    for (const [px, py] of pockets) {
      ctx.beginPath();
      ctx.arc(x + 8 + px, y + 8 + py, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const balls = [
      { cx: 30, cy: 27, color: '#ff6b6b' },
      { cx: 50, cy: 35, color: '#ffd93d' },
      { cx: 70, cy: 25, color: '#4ecdc4' },
      { cx: 85, cy: 40, color: '#fff' },
    ];
    for (const ball of balls) {
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(x + 8 + ball.cx, y + 8 + ball.cy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Ball shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(x + 6 + ball.cx, y + 6 + ball.cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawArcade(ctx, x, y) {
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(x, y, 40, 70);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 5, y + 5, 30, 25);

    // Animated screen with scan lines
    const screenPhase = (this.frame * 2) % 30;
    const screenColor = `hsl(${(this.frame * 2) % 360}, 70%, 50%)`;

    ctx.fillStyle = screenColor;
    ctx.shadowColor = screenColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(x + 7, y + 7, 26, 21);

    // Scan line effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let sy = 0; sy < 21; sy += 3) {
      ctx.fillRect(x + 7, y + 7 + sy, 26, 1);
    }

    // Moving scan line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x + 7, y + 7 + (screenPhase % 21), 26, 2);

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 5, y + 35, 30, 20);

    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(x + 12, y + 40, 6, 10);
    ctx.beginPath();
    ctx.arc(x + 15, y + 40, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(x + 28, y + 42, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(x + 28, y + 50, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDoor(ctx, x, y) {
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x, y, 60, 100);

    ctx.fillStyle = '#2d1f1a';
    ctx.fillRect(x + 5, y + 5, 50, 90);

    // Window with outside glow
    ctx.fillStyle = '#16213e';
    ctx.fillRect(x + 15, y + 15, 30, 30);

    // Moonlight through window
    const moonGlow = 0.2 + Math.sin(this.frame * 0.02) * 0.1;
    ctx.fillStyle = `rgba(100, 149, 237, ${moonGlow})`;
    ctx.fillRect(x + 17, y + 17, 26, 26);

    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(x + 45, y + 55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // "OPEN" sign with glow
    const openFlicker = this.frame % 120 < 100 ? 1 : 0.3;
    ctx.fillStyle = `rgba(107, 203, 119, ${openFlicker})`;
    ctx.shadowColor = '#6bcb77';
    ctx.shadowBlur = 5 * openFlicker;
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('OPEN', x + 12, y + 80);
    ctx.shadowBlur = 0;
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(255, 248, 220, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLightRays(ctx) {
    // Subtle ambient light from the neon sign (use pre-created gradient to avoid memory leak)
    ctx.fillStyle = this.neonGlowGradient;
    ctx.fillRect(200, 0, 400, 200);
  }
}
