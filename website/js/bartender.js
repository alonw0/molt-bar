// Bartender character with animations

const STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  CLEANING: 'cleaning',
  POURING: 'pouring',
  WAVING: 'waving',
  REACHING: 'reaching',
};

// Bar counter positions (behind the bar)
const BAR_POSITIONS = [
  { x: 200, y: 200 },
  { x: 280, y: 200 },
  { x: 360, y: 200 },
  { x: 440, y: 200 },
  { x: 520, y: 200 },
  { x: 600, y: 200 },
];

export class Bartender {
  constructor() {
    this.x = 400;
    this.y = 200;
    this.targetX = 400;
    this.state = STATES.IDLE;
    this.frame = 0;
    this.stateTimer = 0;
    this.stateDuration = 180; // frames before changing action
    this.walkSpeed = 1.5;
    this.facingLeft = false;
    this.actionFrame = 0;

    // Glass cleaning animation
    this.glassY = 0;
    this.clothAngle = 0;

    // Pour animation
    this.pourAmount = 0;

    // Pick next action
    this.pickNextAction();
  }

  pickNextAction() {
    const actions = [
      { state: STATES.IDLE, weight: 2 },
      { state: STATES.CLEANING, weight: 3 },
      { state: STATES.POURING, weight: 2 },
      { state: STATES.WAVING, weight: 1 },
      { state: STATES.REACHING, weight: 2 },
    ];

    // Sometimes walk to a new position
    if (Math.random() < 0.4) {
      const newPos = BAR_POSITIONS[Math.floor(Math.random() * BAR_POSITIONS.length)];
      this.targetX = newPos.x;
      this.state = STATES.WALKING;
      this.facingLeft = this.targetX < this.x;
    } else {
      // Pick a random action based on weights
      const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
      let rand = Math.random() * totalWeight;
      for (const action of actions) {
        rand -= action.weight;
        if (rand <= 0) {
          this.state = action.state;
          break;
        }
      }
    }

    this.stateTimer = 0;
    this.actionFrame = 0;
    this.stateDuration = 120 + Math.random() * 180;
  }

  update() {
    this.frame++;
    this.stateTimer++;
    this.actionFrame++;

    if (this.state === STATES.WALKING) {
      // Move towards target
      const dx = this.targetX - this.x;
      if (Math.abs(dx) > this.walkSpeed) {
        this.x += Math.sign(dx) * this.walkSpeed;
        this.facingLeft = dx < 0;
      } else {
        this.x = this.targetX;
        this.pickNextAction();
      }
    } else {
      // Check if it's time for a new action
      if (this.stateTimer > this.stateDuration) {
        this.pickNextAction();
      }
    }

    // Update animation-specific values
    if (this.state === STATES.CLEANING) {
      this.clothAngle = Math.sin(this.actionFrame * 0.3) * 0.5;
      this.glassY = Math.sin(this.actionFrame * 0.15) * 2;
    } else if (this.state === STATES.POURING) {
      this.pourAmount = Math.min(1, this.actionFrame / 60);
    }
  }

  draw(ctx) {
    const x = this.x;
    const y = this.y;

    // Walking bob animation
    const walkBob = this.state === STATES.WALKING
      ? Math.sin(this.frame * 0.3) * 3
      : 0;

    // Idle breathing
    const breathe = Math.sin(this.frame * 0.05) * 1;

    ctx.save();

    // Flip if facing left
    if (this.facingLeft) {
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x, 0);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 55, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (when walking, animate them)
    this.drawLegs(ctx, x, y + 25 + walkBob, this.state === STATES.WALKING);

    // Body (white shirt / apron)
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(x - 15, y - 10 + breathe + walkBob, 30, 40);

    // Apron
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(x - 12, y + 5 + breathe + walkBob, 24, 30);
    // Apron strings
    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 5 + breathe + walkBob);
    ctx.lineTo(x - 18, y - 5 + breathe + walkBob);
    ctx.moveTo(x + 12, y + 5 + breathe + walkBob);
    ctx.lineTo(x + 18, y - 5 + breathe + walkBob);
    ctx.stroke();

    // Arms and action-specific drawing
    this.drawArms(ctx, x, y + breathe + walkBob);

    // Head
    ctx.fillStyle = '#ffd6a5';
    ctx.beginPath();
    ctx.arc(x, y - 25 + breathe + walkBob, 18, 0, Math.PI * 2);
    ctx.fill();

    // Hair (slicked back bartender style - just on top)
    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath();
    ctx.arc(x, y - 25 + breathe + walkBob, 18, Math.PI + 0.3, -0.3);
    ctx.fill();

    // Face
    this.drawFace(ctx, x, y - 25 + breathe + walkBob);

    // Bow tie
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(x, y - 8 + breathe + walkBob);
    ctx.lineTo(x - 8, y - 12 + breathe + walkBob);
    ctx.lineTo(x - 8, y - 4 + breathe + walkBob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - 8 + breathe + walkBob);
    ctx.lineTo(x + 8, y - 12 + breathe + walkBob);
    ctx.lineTo(x + 8, y - 4 + breathe + walkBob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d63031';
    ctx.beginPath();
    ctx.arc(x, y - 8 + breathe + walkBob, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Name tag (always reads correctly)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 25, y - 60, 50, 14);
    ctx.fillStyle = '#ffd93d';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('BARKEEP', x, y - 50);
    ctx.textAlign = 'left';
  }

  drawLegs(ctx, x, y, walking) {
    ctx.fillStyle = '#2d2d44'; // Dark pants

    if (walking) {
      const legSwing = Math.sin(this.frame * 0.3) * 8;
      // Left leg
      ctx.fillRect(x - 10 + legSwing, y, 8, 25);
      // Right leg
      ctx.fillRect(x + 2 - legSwing, y, 8, 25);
    } else {
      // Standing still
      ctx.fillRect(x - 10, y, 8, 25);
      ctx.fillRect(x + 2, y, 8, 25);
    }

    // Shoes
    ctx.fillStyle = '#1a1a1a';
    if (walking) {
      const legSwing = Math.sin(this.frame * 0.3) * 8;
      ctx.fillRect(x - 12 + legSwing, y + 22, 12, 6);
      ctx.fillRect(x - legSwing, y + 22, 12, 6);
    } else {
      ctx.fillRect(x - 12, y + 22, 12, 6);
      ctx.fillRect(x, y + 22, 12, 6);
    }
  }

  drawArms(ctx, x, y) {
    ctx.fillStyle = '#f5f5f5'; // Shirt sleeves
    const handColor = '#ffd6a5';

    switch (this.state) {
      case STATES.CLEANING:
        // Glass in center
        const glassX = x - 5;
        const glassYPos = y - 10 + this.glassY;

        // Glass
        ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
        ctx.fillRect(glassX - 6, glassYPos, 12, 20);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(glassX - 6, glassYPos, 12, 20);

        // Left arm holding glass from below
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x - 22, y, 14, 8);
        ctx.fillStyle = handColor;
        ctx.fillRect(glassX - 8, glassYPos + 15, 10, 8);

        // Right arm with cloth on top (polishing motion)
        const clothX = glassX + Math.sin(this.actionFrame * 0.3) * 6;
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x + 8, y - 5, 14, 8);
        ctx.fillStyle = handColor;
        ctx.fillRect(clothX - 2, glassYPos - 5, 10, 8);
        // Cloth
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(clothX - 4, glassYPos - 8, 14, 6);
        break;

      case STATES.POURING:
        // Glass being filled (in front)
        const pourGlassX = x - 8;
        ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
        ctx.fillRect(pourGlassX, y + 5, 12, 20);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pourGlassX, y + 5, 12, 20);
        // Liquid
        const liquidHeight = this.pourAmount * 15;
        ctx.fillStyle = 'rgba(255, 180, 50, 0.8)';
        ctx.fillRect(pourGlassX + 1, y + 24 - liquidHeight, 10, liquidHeight);

        // Left arm holding glass
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x - 20, y + 5, 12, 8);
        ctx.fillStyle = handColor;
        ctx.fillRect(pourGlassX - 5, y + 10, 8, 10);

        // Right arm holding bottle tilted
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x + 5, y - 15, 8, 20);
        ctx.fillStyle = handColor;
        ctx.fillRect(x + 6, y - 20, 8, 8);
        // Bottle (tilted)
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(x + 2, y - 35, 8, 20);
        ctx.fillRect(x + 4, y - 40, 4, 6);
        // Pour stream
        if (this.pourAmount < 0.9) {
          ctx.fillStyle = 'rgba(255, 180, 50, 0.7)';
          ctx.fillRect(x + 4, y - 15, 3, 20);
        }
        break;

      case STATES.WAVING:
        // Left arm relaxed at side
        ctx.fillRect(x - 20, y, 8, 20);
        ctx.fillStyle = handColor;
        ctx.fillRect(x - 21, y + 18, 8, 8);

        // Right arm waving up
        const waveOffset = Math.sin(this.actionFrame * 0.2) * 5;
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x + 12, y - 20, 8, 25);
        ctx.fillStyle = handColor;
        // Hand waving
        ctx.fillRect(x + 10 + waveOffset, y - 30, 12, 10);
        break;

      case STATES.REACHING:
        // Reaching up to shelf
        const reachCycle = (this.actionFrame % 120) / 120;
        const reachUp = reachCycle < 0.5
          ? Math.sin(reachCycle * Math.PI) * 35
          : Math.sin((1 - reachCycle) * Math.PI) * 35;

        // Left arm relaxed at side
        ctx.fillRect(x - 20, y, 8, 20);
        ctx.fillStyle = handColor;
        ctx.fillRect(x - 21, y + 18, 8, 8);

        // Right arm reaching up
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x + 12, y - 5 - reachUp * 0.5, 8, 15 + reachUp * 0.3);
        ctx.fillStyle = handColor;
        ctx.fillRect(x + 13, y - 15 - reachUp, 8, 8);

        // Holding bottle when coming down
        if (reachCycle > 0.4 && reachCycle < 0.9) {
          ctx.fillStyle = '#ff6b6b';
          ctx.fillRect(x + 11, y - 35 - reachUp, 8, 18);
          ctx.fillRect(x + 13, y - 40 - reachUp, 4, 6);
        }
        break;

      case STATES.WALKING:
        // Arms swinging while walking
        const armSwing = Math.sin(this.frame * 0.3) * 5;
        // Left arm
        ctx.fillRect(x - 20 + armSwing, y, 8, 18);
        ctx.fillStyle = handColor;
        ctx.fillRect(x - 21 + armSwing, y + 16, 8, 8);

        // Right arm
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x + 12 - armSwing, y, 8, 18);
        ctx.fillStyle = handColor;
        ctx.fillRect(x + 13 - armSwing, y + 16, 8, 8);
        break;

      case STATES.IDLE:
      default:
        // Arms at sides, slight movement
        const idleMove = Math.sin(this.frame * 0.05) * 2;
        // Left arm (attached to body at x-15)
        ctx.fillRect(x - 20, y + idleMove, 8, 20);
        ctx.fillStyle = handColor;
        ctx.fillRect(x - 21, y + 18 + idleMove, 8, 8);

        // Right arm (attached to body at x+15)
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x + 12, y + idleMove, 8, 20);
        ctx.fillStyle = handColor;
        ctx.fillRect(x + 13, y + 18 + idleMove, 8, 8);
        break;
    }
  }

  drawFace(ctx, x, y) {
    // Eyes
    ctx.fillStyle = '#333';
    const blink = this.frame % 180 < 5;

    if (blink) {
      // Blinking
      ctx.fillRect(x - 8, y - 2, 6, 2);
      ctx.fillRect(x + 2, y - 2, 6, 2);
    } else {
      // Open eyes
      ctx.fillRect(x - 8, y - 5, 5, 6);
      ctx.fillRect(x + 3, y - 5, 5, 6);
      // Pupils
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x - 6, y - 3, 3, 4);
      ctx.fillRect(x + 5, y - 3, 3, 4);
    }

    // Eyebrows
    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(x - 9, y - 10, 7, 2);
    ctx.fillRect(x + 2, y - 10, 7, 2);

    // Nose
    ctx.fillStyle = '#e6c39a';
    ctx.fillRect(x - 2, y, 4, 6);

    // Mouth - friendly smile
    ctx.fillStyle = '#333';
    if (this.state === STATES.WAVING) {
      // Big smile when waving
      ctx.beginPath();
      ctx.arc(x, y + 10, 6, 0, Math.PI);
      ctx.fill();
    } else {
      // Normal slight smile
      ctx.beginPath();
      ctx.arc(x, y + 9, 4, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    // Mustache
    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 4);
    ctx.quadraticCurveTo(x - 5, y + 8, x, y + 5);
    ctx.quadraticCurveTo(x + 5, y + 8, x + 10, y + 4);
    ctx.quadraticCurveTo(x + 5, y + 6, x, y + 4);
    ctx.quadraticCurveTo(x - 5, y + 6, x - 10, y + 4);
    ctx.fill();
  }
}
