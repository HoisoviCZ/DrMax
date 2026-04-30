import Phaser from 'phaser';
import { CATEGORIES, CATEGORY_ORDER, type CategoryId } from '../config/categories';
import { BOX_TYPES, pickBoxForLevel, type BoxType } from '../config/boxes';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import {
  fetchTopScores,
  submitScore,
  qualifiesForTop,
  isLeaderboardEnabled,
  type ScoreEntry,
} from '../services/leaderboard';

interface BoxEntry {
  body: Phaser.Physics.Matter.Image;
  label: Phaser.GameObjects.Text;
  type: BoxType;
  settleStart: number | null;
  judged: boolean;
}

interface ShelfDef {
  category: CategoryId;
  surfaceY: number;
  innerTop: number;
}

const HUD_HEIGHT = 50;
const SPAWN_Y = 100;
const SHELF_TOP = 180;
const SHELF_GAP = 130;
const SHELF_INNER_HEIGHT = 110;
const SHELF_THICKNESS = 8;
const SHELF_PADDING_X = 40;
const INITIAL_LIVES = 5;

export class GameScene extends Phaser.Scene {
  private score = 0;
  private lives = INITIAL_LIVES;
  private level = 1;
  private spawnInterval = 2400;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private levelTimer!: Phaser.Time.TimerEvent;
  private boxes: BoxEntry[] = [];
  private shelves: ShelfDef[] = [];
  private gameOver = false;
  private draggingBody: MatterJS.BodyType | null = null;

  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private bestScore = 0;

  private initialsState = { letters: ['A', 'A', 'A'] as string[], cursor: 0 };
  private initialsKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private initialsTextObjects: Phaser.GameObjects.Text[] = [];
  private initialsCursorObj: Phaser.GameObjects.Rectangle | null = null;
  private leaderboardPanelObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('GameScene');
  }

  preload() {
    const seen = new Set<string>();
    for (const t of BOX_TYPES) {
      if (!t.imageKey || seen.has(t.imageKey)) continue;
      seen.add(t.imageKey);
      this.load.image(`${t.imageKey}.webp`, `products/${t.imageKey}.webp`);
      this.load.image(`${t.imageKey}.png`, `products/${t.imageKey}.png`);
    }
    this.load.on('loaderror', () => {
      // Missing optional product image — silently fall back to .png or procedural placeholder.
    });
  }

  create() {
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.level = 1;
    this.spawnInterval = 2400;
    this.boxes = [];
    this.shelves = [];
    this.gameOver = false;
    this.draggingBody = null;
    this.bestScore = Number(localStorage.getItem('drmax-best') ?? '0');
    this.initialsState = { letters: ['A', 'A', 'A'], cursor: 0 };
    this.initialsKeyHandler = null;
    this.initialsTextObjects = [];
    this.initialsCursorObj = null;
    this.leaderboardPanelObjects = [];

    this.matter.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawBackground();
    this.drawShelves();
    this.drawHUD();

    this.matter.add.mouseSpring({
      length: 0.01,
      stiffness: 0.25,
      damping: 0.05,
    });

    this.matter.world.on('dragstart', (body: MatterJS.BodyType) => {
      this.draggingBody = body;
    });
    this.matter.world.on('dragend', (body: MatterJS.BodyType) => {
      if (this.draggingBody === body) this.draggingBody = null;
    });

    this.spawnTimer = this.time.addEvent({
      delay: this.spawnInterval,
      callback: this.spawnBox,
      callbackScope: this,
      loop: true,
    });

    this.levelTimer = this.time.addEvent({
      delay: 18000,
      callback: this.levelUp,
      callbackScope: this,
      loop: true,
    });

    this.spawnBox();
  }

  private drawBackground() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xeef2f7);
    this.add.rectangle(GAME_WIDTH / 2, SPAWN_Y, GAME_WIDTH, 60, 0xd1d5db);
    for (let x = 30; x < GAME_WIDTH; x += 24) {
      this.add.rectangle(x, SPAWN_Y, 14, 4, 0x9ca3af);
    }
    this.add.text(20, SPAWN_Y - 22, 'INCOMING', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#374151',
      fontStyle: 'bold',
    });
  }

  private drawShelves() {
    for (let i = 0; i < CATEGORY_ORDER.length; i++) {
      const cat = CATEGORY_ORDER[i]!;
      const surfaceY = SHELF_TOP + i * SHELF_GAP + SHELF_INNER_HEIGHT;
      const innerTop = surfaceY - SHELF_INNER_HEIGHT;
      const data = CATEGORIES[cat];

      this.add.rectangle(
        GAME_WIDTH / 2,
        innerTop + SHELF_INNER_HEIGHT / 2,
        GAME_WIDTH - SHELF_PADDING_X * 2,
        SHELF_INNER_HEIGHT,
        data.color,
        0.08,
      ).setStrokeStyle(2, data.color, 0.4);

      this.matter.add.rectangle(
        GAME_WIDTH / 2,
        surfaceY,
        GAME_WIDTH - SHELF_PADDING_X * 2,
        SHELF_THICKNESS,
        {
          isStatic: true,
          friction: 0.95,
          label: `shelf:${cat}`,
        },
      );

      this.add.rectangle(
        GAME_WIDTH / 2,
        surfaceY,
        GAME_WIDTH - SHELF_PADDING_X * 2,
        SHELF_THICKNESS,
        0x8b6f47,
      ).setStrokeStyle(1, 0x5a4632);

      this.add.rectangle(
        SHELF_PADDING_X + 75,
        innerTop + 16,
        140,
        24,
        data.color,
        0.95,
      );
      this.add.text(SHELF_PADDING_X + 75, innerTop + 16, data.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.shelves.push({ category: cat, surfaceY, innerTop });
    }
  }

  private drawHUD() {
    this.add.rectangle(GAME_WIDTH / 2, HUD_HEIGHT / 2, GAME_WIDTH, HUD_HEIGHT, 0x1f2937).setDepth(500);

    this.add.text(20, HUD_HEIGHT / 2, 'DrMax Pharmacy', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(501);

    this.scoreText = this.add.text(GAME_WIDTH - 20, HUD_HEIGHT / 2, 'Score: 0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(501);

    this.levelText = this.add.text(GAME_WIDTH / 2 - 20, HUD_HEIGHT / 2, 'Level: 1', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#60a5fa',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(501);

    this.livesText = this.add.text(GAME_WIDTH / 2 + 20, HUD_HEIGHT / 2, this.formatLives(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(501);
  }

  private formatLives(): string {
    return '♥'.repeat(this.lives) + '♡'.repeat(Math.max(0, INITIAL_LIVES - this.lives));
  }

  private spawnBox = () => {
    if (this.gameOver) return;
    const active = this.boxes.filter((b) => !b.judged).length;
    if (active > 16) return;

    const type = pickBoxForLevel(this.level);
    const x = Phaser.Math.Between(120, GAME_WIDTH - 120);
    const y = SPAWN_Y - 10;
    this.createBox(x, y, type);
  };

  private getBoxTextureKey(type: BoxType): string {
    if (type.imageKey) {
      const webpKey = `${type.imageKey}.webp`;
      if (this.textures.exists(webpKey)) return webpKey;
      const pngKey = `${type.imageKey}.png`;
      if (this.textures.exists(pngKey)) return pngKey;
    }
    const key = `box-${type.shape}-${type.category}-${type.label}`;
    if (this.textures.exists(key)) return key;

    const cat = CATEGORIES[type.category];
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    switch (type.shape) {
      case 'small':
      case 'medium':
      case 'large': {
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(0, 0, type.width, type.height, 4);
        g.fillStyle(cat.color, 1);
        g.fillRect(0, 0, type.width, Math.max(10, type.height * 0.22));
        g.lineStyle(1.5, 0x111827, 0.55);
        g.strokeRoundedRect(0, 0, type.width, type.height, 4);
        g.fillStyle(0xe5e7eb, 1);
        g.fillRect(4, type.height - 10, type.width - 8, 4);
        break;
      }
      case 'blister': {
        g.fillStyle(0xc0c8d4, 1);
        g.fillRoundedRect(0, 0, type.width, type.height, 6);
        g.lineStyle(1, cat.color, 1);
        g.strokeRoundedRect(0, 0, type.width, type.height, 6);
        for (let i = 6; i < type.width - 6; i += 12) {
          g.fillStyle(cat.color, 0.8);
          g.fillCircle(i + 3, type.height / 2, 4);
        }
        break;
      }
      case 'bottle': {
        g.fillStyle(cat.color, 1);
        g.fillRoundedRect(0, 14, type.width, type.height - 14, 5);
        g.fillStyle(0x4b5563, 1);
        g.fillRect(type.width / 2 - 7, 0, 14, 16);
        g.fillStyle(0xffffff, 0.95);
        g.fillRect(3, type.height * 0.5, type.width - 6, type.height * 0.22);
        break;
      }
      case 'spray': {
        g.fillStyle(cat.color, 1);
        g.fillRoundedRect(0, 22, type.width, type.height - 22, 5);
        g.fillStyle(0x9ca3af, 1);
        g.fillRoundedRect(type.width / 2 - 7, 0, 14, 26, 3);
        g.fillStyle(0xffffff, 0.95);
        g.fillRect(3, type.height * 0.55, type.width - 6, type.height * 0.18);
        break;
      }
    }

    g.generateTexture(key, type.width, type.height);
    g.destroy();
    return key;
  }

  private createBox(x: number, y: number, type: BoxType) {
    const texKey = this.getBoxTextureKey(type);
    const usingExternal = type.imageKey != null && (
      texKey === `${type.imageKey}.webp` || texKey === `${type.imageKey}.png`
    );

    const body = this.matter.add.image(x, y, texKey, undefined, {
      restitution: 0.05,
      friction: 0.95,
      frictionAir: 0.04,
      density: 0.0015,
      label: `box:${type.category}:${type.label}`,
      chamfer: { radius: 2 },
      shape: { type: 'rectangle', width: type.width, height: type.height },
    });

    if (usingExternal) {
      body.setDisplaySize(type.width, type.height);
    }

    body.setBounce(0.05);
    body.setFriction(0.95);
    body.setDepth(10);

    const label = this.add.text(x, y, type.label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#1f2937',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    this.boxes.push({
      body,
      label,
      type,
      settleStart: null,
      judged: false,
    });
  }

  override update() {
    if (this.gameOver) return;

    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const e = this.boxes[i]!;
      const b = e.body;
      if (!b.active) {
        if (e.label.active) e.label.destroy();
        this.boxes.splice(i, 1);
        continue;
      }

      e.label.setPosition(b.x, b.y);
      e.label.setRotation(b.rotation);

      if (e.judged) continue;

      const matterBody = b.body as MatterJS.BodyType;

      if (this.draggingBody && this.draggingBody === matterBody) {
        e.settleStart = null;
        continue;
      }

      const speed = Math.hypot(matterBody.velocity.x, matterBody.velocity.y);
      if (speed > 0.5 || Math.abs(matterBody.angularVelocity) > 0.05) {
        e.settleStart = null;
        continue;
      }

      if (b.y > GAME_HEIGHT - 25) {
        this.judgeMissed(e);
        continue;
      }

      const shelf = this.shelves.find((s) => b.y > s.innerTop && b.y < s.surfaceY);
      if (!shelf) {
        e.settleStart = null;
        continue;
      }

      const now = this.time.now;
      if (e.settleStart === null) {
        e.settleStart = now;
        continue;
      }
      if (now - e.settleStart < 700) continue;

      e.judged = true;
      this.judgeBox(e, shelf.category);
    }
  }

  private judgeBox(entry: BoxEntry, shelfCat: CategoryId) {
    const correct = entry.type.category === shelfCat;
    if (correct) {
      const points = 10 * this.level;
      this.score += points;
      this.scoreText.setText(`Score: ${this.score}`);
      this.flashAt(entry.body.x, entry.body.y, '#22c55e', `+${points}`);
    } else {
      this.score = Math.max(0, this.score - 5);
      this.lives -= 1;
      this.scoreText.setText(`Score: ${this.score}`);
      this.livesText.setText(this.formatLives());
      this.flashAt(entry.body.x, entry.body.y, '#ef4444', 'Wrong shelf!');
      this.tweens.add({
        targets: [entry.body, entry.label],
        alpha: 0,
        duration: 350,
        onComplete: () => {
          if (entry.body.active) entry.body.destroy();
        },
      });
      if (this.lives <= 0) void this.endGame();
    }
  }

  private judgeMissed(entry: BoxEntry) {
    entry.judged = true;
    this.lives -= 1;
    this.livesText.setText(this.formatLives());
    this.flashAt(entry.body.x, entry.body.y, '#ef4444', 'Off the shelf!');
    if (entry.label.active) entry.label.destroy();
    if (entry.body.active) entry.body.destroy();
    if (this.lives <= 0) void this.endGame();
  }

  private flashAt(x: number, y: number, colorHex: string, text: string) {
    const popup = this.add.text(x, y - 30, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: colorHex,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(800);
    this.tweens.add({
      targets: popup,
      y: y - 70,
      alpha: 0,
      duration: 700,
      onComplete: () => popup.destroy(),
    });
  }

  private levelUp = () => {
    if (this.gameOver) return;
    this.level += 1;
    this.spawnInterval = Math.max(700, this.spawnInterval - 220);
    this.spawnTimer.reset({
      delay: this.spawnInterval,
      callback: this.spawnBox,
      callbackScope: this,
      loop: true,
    });
    this.levelText.setText(`Level: ${this.level}`);
    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `LEVEL ${this.level}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#1f2937',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(900).setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      onComplete: () => banner.destroy(),
    });
  };

  private async endGame() {
    this.gameOver = true;
    this.spawnTimer.remove();
    this.levelTimer.remove();

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('drmax-best', String(this.bestScore));
    }

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setDepth(1000);

    this.add.text(GAME_WIDTH / 2, 70, 'GAME OVER', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '52px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);

    this.add.text(GAME_WIDTH / 2, 130, `Score: ${this.score}  ·  Level: ${this.level}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      color: '#fbbf24',
    }).setOrigin(0.5).setDepth(1001);

    const leftX = GAME_WIDTH * 0.27;
    const playAgainY = GAME_HEIGHT - 70;

    if (!isLeaderboardEnabled) {
      this.add.text(leftX, GAME_HEIGHT / 2 - 20, `Best score (this device):\n${this.bestScore}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#9ca3af',
        align: 'center',
      }).setOrigin(0.5).setDepth(1001);
      this.add.text(leftX, GAME_HEIGHT / 2 + 40, 'Online leaderboard not configured\n(see README → Supabase)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#6b7280',
        align: 'center',
      }).setOrigin(0.5).setDepth(1001);
      this.addPlayAgainButton(leftX, playAgainY);
      return;
    }

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading leaderboard…', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#9ca3af',
    }).setOrigin(0.5).setDepth(1001);

    let top: ScoreEntry[];
    try {
      top = await fetchTopScores();
    } catch (err) {
      console.error('Leaderboard fetch failed', err);
      loadingText.setText('Leaderboard offline\n(check Supabase setup)');
      loadingText.setColor('#ef4444');
      loadingText.setAlign('center');
      this.addPlayAgainButton(leftX, playAgainY);
      return;
    }
    loadingText.destroy();

    const qualifies = qualifiesForTop(this.score, top);

    if (qualifies) {
      this.showQualifyingFlow(top, leftX);
    } else {
      this.add.text(leftX, 200, 'Better luck next time!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#9ca3af',
      }).setOrigin(0.5).setDepth(1001);
      this.add.text(leftX, 240, `Best (this device): ${this.bestScore}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#6b7280',
      }).setOrigin(0.5).setDepth(1001);
    }

    this.showLeaderboardPanel(top);
    this.addPlayAgainButton(leftX, playAgainY);
  }

  private showQualifyingFlow(top: ScoreEntry[], x: number) {
    let y = 195;

    this.add.text(x, y, '🏆 NEW HIGH SCORE! 🏆', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);
    y += 45;

    this.add.text(x, y, 'Enter your initials:', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1001);
    y += 50;

    const slotW = 56;
    const slotGap = 12;
    const totalW = 3 * slotW + 2 * slotGap;
    const startX = x - totalW / 2 + slotW / 2;
    const slotsY = y;

    for (let i = 0; i < 3; i++) {
      const slotX = startX + i * (slotW + slotGap);
      this.add.rectangle(slotX, slotsY, slotW, 70, 0x1f2937).setStrokeStyle(2, 0xffffff).setDepth(1001);
      const txt = this.add.text(slotX, slotsY, this.initialsState.letters[i] ?? 'A', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(1002);
      this.initialsTextObjects.push(txt);
    }

    const cursorX = startX + this.initialsState.cursor * (slotW + slotGap);
    this.initialsCursorObj = this.add
      .rectangle(cursorX, slotsY + 40, slotW - 8, 4, 0xfbbf24)
      .setDepth(1003);

    y += 70;
    this.add.text(x, y, 'A–Z · ← → to move · ⌫ Backspace · ⏎ Enter', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5).setDepth(1001);

    this.initialsKeyHandler = (e: KeyboardEvent) => {
      if (this.initialsKeyHandler === null) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void this.submitInitials(top, x);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        const c = Math.max(0, this.initialsState.cursor - 1);
        this.initialsState.letters[c] = 'A';
        this.initialsState.cursor = c;
        this.refreshInitialsDisplay(startX, slotW, slotGap, slotsY);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.initialsState.cursor = Math.max(0, this.initialsState.cursor - 1);
        this.refreshInitialsDisplay(startX, slotW, slotGap, slotsY);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.initialsState.cursor = Math.min(2, this.initialsState.cursor + 1);
        this.refreshInitialsDisplay(startX, slotW, slotGap, slotsY);
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        this.initialsState.letters[this.initialsState.cursor] = e.key.toUpperCase();
        this.initialsState.cursor = Math.min(2, this.initialsState.cursor + 1);
        this.refreshInitialsDisplay(startX, slotW, slotGap, slotsY);
      }
    };

    this.input.keyboard?.on('keydown', this.initialsKeyHandler);
  }

  private refreshInitialsDisplay(startX: number, slotW: number, slotGap: number, slotsY: number) {
    for (let i = 0; i < 3; i++) {
      this.initialsTextObjects[i]?.setText(this.initialsState.letters[i] ?? 'A');
    }
    if (this.initialsCursorObj) {
      const c = Math.min(this.initialsState.cursor, 2);
      this.initialsCursorObj.x = startX + c * (slotW + slotGap);
      this.initialsCursorObj.y = slotsY + 40;
    }
  }

  private async submitInitials(currentTop: ScoreEntry[], x: number) {
    const initials = this.initialsState.letters.join('');

    if (this.initialsKeyHandler) {
      this.input.keyboard?.off('keydown', this.initialsKeyHandler);
      this.initialsKeyHandler = null;
    }

    this.initialsTextObjects.forEach((o) => o.destroy());
    this.initialsTextObjects = [];
    this.initialsCursorObj?.destroy();
    this.initialsCursorObj = null;

    const statusY = 380;
    const submitting = this.add.text(x, statusY, 'Submitting…', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#9ca3af',
    }).setOrigin(0.5).setDepth(1001);

    let entry: ScoreEntry | null = null;
    try {
      entry = await submitScore(initials, this.score, this.level);
    } catch (err) {
      console.error('Submit failed', err);
      submitting.setText('Submit failed — try playing again');
      submitting.setColor('#ef4444');
      return;
    }

    submitting.destroy();
    this.add.text(x, statusY, `Saved as ${initials}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);

    let updated: ScoreEntry[];
    try {
      updated = await fetchTopScores();
    } catch {
      updated = currentTop;
    }

    this.clearLeaderboardPanel();
    this.showLeaderboardPanel(updated, entry?.id);
  }

  private clearLeaderboardPanel() {
    this.leaderboardPanelObjects.forEach((o) => o.destroy());
    this.leaderboardPanelObjects = [];
  }

  private showLeaderboardPanel(scores: ScoreEntry[], highlightId?: number) {
    const x = GAME_WIDTH * 0.7;
    const top = 90;
    const rowH = 23;

    const titleObj = this.add.text(x, top, '🏆  LEADERBOARD  🏆', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);
    this.leaderboardPanelObjects.push(titleObj);

    if (scores.length === 0) {
      const empty = this.add.text(x, top + 60, 'No scores yet — be the first!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#9ca3af',
      }).setOrigin(0.5).setDepth(1001);
      this.leaderboardPanelObjects.push(empty);
      return;
    }

    const headerY = top + 38;
    const header = this.add.text(x, headerY, '##  INI    SCORE  LV', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#9ca3af',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);
    this.leaderboardPanelObjects.push(header);

    for (let i = 0; i < scores.length; i++) {
      const e = scores[i]!;
      const rank = String(i + 1).padStart(2, '0');
      const ini = e.initials.padEnd(3, ' ');
      const sc = String(e.score).padStart(6, ' ');
      const lv = String(e.level).padStart(2, ' ');
      const line = `${rank}  ${ini}  ${sc}   ${lv}`;
      const isMe = highlightId !== undefined && e.id === highlightId;
      const rowY = headerY + 22 + i * rowH;
      const txt = this.add.text(x, rowY, line, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: isMe ? '#fbbf24' : '#e5e7eb',
        fontStyle: isMe ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(1001);
      this.leaderboardPanelObjects.push(txt);
    }
  }

  private addPlayAgainButton(x: number, y: number) {
    const btn = this.add.text(x, y, '▶  Play again', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#1f2937',
      backgroundColor: '#ffffff',
      padding: { x: 24, y: 12 },
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      if (this.initialsKeyHandler) {
        this.input.keyboard?.off('keydown', this.initialsKeyHandler);
        this.initialsKeyHandler = null;
      }
      this.scene.restart();
    });
  }
}
