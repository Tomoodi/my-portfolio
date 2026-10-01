// =========================================
// キャンバスとコンテキストの取得
// =========================================
const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;  // アンチエイリアス無効 → ドット絵らしくなる
const W       = canvas.width;   // 480
const H       = canvas.height;  // 640

// =========================================
// ゲームの状態管理
// state: 'title' | 'playing' | 'gameover'
// =========================================
let state      = 'title';
let score      = 0;
let lives      = 3;
let frame      = 0;   // フレームカウンター（敵の出現タイミングなどに使う）
let lastLevel  = 0;   // 前フレームのレベル（変化検知用）

// =========================================
// ダメージ演出の状態
// =========================================
let shakeFrames  = 0;   // 残り揺れフレーム数
let flashFrames  = 0;   // 赤フラッシュの残りフレーム数
let invincible   = 0;   // 無敵フレーム数（点滅中は被弾しない）

// ダメージを受けたときに呼ぶ関数
function triggerDamage() {
  shakeFrames = 18;
  flashFrames = 12;
  invincible  = 90;
}

// =========================================
// パワーアップ管理
// =========================================
const powerups = {
  triple:      false,  // 3方向弾
  pierce:      false,  // 貫通弾
  speedup:     0,      // 移動速度UP（最大3段階）
  shield:      false,  // シールド（1発防ぐ）
  bulletSpeed: 0,      // 弾速UP（最大3段階）
  columns:     1,      // 弾の列数（1→2→3）
  bombs:       0,      // ボムストック数（最大3）
};

const POWERUP_LIST = [
  { id: 'triple',      label: 'TRIPLE SHOT',  color: '#ffaaff' },
  { id: 'pierce',      label: 'PIERCE',       color: '#aaffff' },
  { id: 'speedup',     label: 'SPEED UP',     color: '#ffffaa' },
  { id: 'shield',      label: 'SHIELD',       color: '#aaffaa' },
  { id: 'bomb',        label: 'BOMB',         color: '#ffccaa' },
  { id: 'heal',        label: 'HEAL +1',      color: '#ffaacc' },
  { id: 'bulletspeed', label: 'BULLET SPD',   color: '#ffddaa' },
  { id: 'columns',     label: 'DOUBLE LINE',  color: '#ccffaa' },
];

function applyRandomPowerup() {
  const pick  = POWERUP_LIST[Math.floor(Math.random() * POWERUP_LIST.length)];
  let label   = pick.label;

  switch (pick.id) {
    case 'triple':
      powerups.triple = true;
      break;
    case 'pierce':
      powerups.pierce = true;
      break;
    case 'speedup':
      if (powerups.speedup < 3) {
        powerups.speedup++;
        player.speed = 5 + powerups.speedup * 1.5;
      }
      label = `SPEED UP ${'★'.repeat(powerups.speedup)}`;
      break;
    case 'shield':
      powerups.shield = true;
      break;
    case 'bomb':
      if (powerups.bombs < 3) powerups.bombs++;
      break;
    case 'heal':
      if (lives < 3) lives++;
      updateLivesUI();
      break;
    case 'bulletspeed':
      if (powerups.bulletSpeed < 3) powerups.bulletSpeed++;
      label = `BULLET SPD ${'★'.repeat(powerups.bulletSpeed)}`;
      break;
    case 'columns':
      if (powerups.columns < 3) powerups.columns++;
      label = powerups.columns === 2 ? 'DOUBLE LINE' : 'TRIPLE LINE';
      break;
  }

  updatePowerupUI();
  return { label, color: pick.color };
}

// ダメージ処理（シールドチェック込み）
function takeDamage() {
  if (powerups.shield) {
    powerups.shield = false;
    shakeFrames = 10;
    flashFrames = 8;
    invincible  = 60;
    updatePowerupUI();
    return;
  }
  lives--;
  triggerDamage();
  explosions.push(new Explosion(player.x, player.y, 1.5));
  updateLivesUI();

  if (lives <= 0) {
    state = 'gameover';
    const ranking = saveRanking(score);
    showOverlay('GAME OVER', buildGameOverHTML(score, ranking));
  }
}

// =========================================
// カットイン演出
// フェーズ: 'in'(スライド) → 'hold'(静止) → 'out'(フェード)
// =========================================
const cutIn = {
  active:       false,
  phase:        'in',
  timer:        0,
  level:        0,
  powerupLabel: '',
  powerupColor: '#fff',

  trigger(level, powerup) {
    this.active       = true;
    this.phase        = 'in';
    this.timer        = 0;
    this.level        = level;
    this.powerupLabel = powerup ? powerup.label : '';
    this.powerupColor = powerup ? powerup.color : '#fff';
  },

  update() {
    if (!this.active) return;
    this.timer++;

    if (this.phase === 'in'   && this.timer >= 20) { this.phase = 'hold'; this.timer = 0; }
    if (this.phase === 'hold' && this.timer >= 50) { this.phase = 'out';  this.timer = 0; }
    if (this.phase === 'out'  && this.timer >= 25) { this.active = false; }
  },

  draw() {
    if (!this.active) return;

    const cx = W / 2;
    const cy = H / 2 - 30;

    // フェーズごとに位置・透明度を計算
    let offsetX = 0;
    let alpha   = 1;

    if (this.phase === 'in') {
      // 左からスライドイン（easeOut）
      const t  = this.timer / 20;
      const ease = 1 - Math.pow(1 - t, 3);
      offsetX = (1 - ease) * -W;
    } else if (this.phase === 'out') {
      // 右へフェードアウト
      const t = this.timer / 25;
      offsetX = t * W * 0.3;
      alpha   = 1 - t;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(offsetX, 0);

    // 背景バー
    ctx.fillStyle = 'rgba(180, 0, 0, 0.85)';
    ctx.fillRect(0, cy - 52, W, 72);

    // 上下ライン
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy - 52); ctx.lineTo(W, cy - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy + 20); ctx.lineTo(W, cy + 20); ctx.stroke();

    // メインテキスト "THREAT LEVEL UP"
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 32px "Courier New", monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#ff0000';
    ctx.shadowBlur   = 16;
    ctx.fillText('THREAT LEVEL UP', cx, cy - 24);

    // レベル番号
    ctx.font       = 'bold 18px "Courier New", monospace';
    ctx.fillStyle  = '#ffaaaa';
    ctx.shadowBlur = 0;
    ctx.fillText(`LEVEL  ${this.level}`, cx, cy - 2 + 22);

    // パワーアップ名
    if (this.powerupLabel) {
      ctx.font        = 'bold 15px "Courier New", monospace';
      ctx.fillStyle   = this.powerupColor;
      ctx.shadowColor = this.powerupColor;
      ctx.shadowBlur  = 8;
      ctx.fillText(`+ ${this.powerupLabel}`, cx, cy - 2 + 42);
      ctx.shadowBlur  = 0;
    }

    ctx.restore();
  }
};

// =========================================
// 入力管理
// keys オブジェクトに押されているキーを記録
// =========================================
const keys = {};
const GAME_KEYS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyX','KeyZ'];

document.addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();  // ブラウザスクロール防止
  keys[e.code] = true;

  // スペースキーでスタート／再スタート
  if (e.code === 'Space') handleStart();

  // Xキーでボム発動
  if (e.code === 'KeyX' && state === 'playing' && powerups.bombs > 0) {
    powerups.bombs--;
    enemies.forEach(e => {
      explosions.push(new Explosion(e.x, e.y, e.type === 2 ? 2 : 1));
      score += e.score;
    });
    enemies = [];
    enemyBullets = [];
    updateScoreUI();
    updatePowerupUI();
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// タブを切り替えた時や、ウィンドウ（iframe）のフォーカスが外れた時にキーをリセット
// ポートフォリオにiframeで埋め込んでいるため、画面外クリックで"押しっぱなし"状態の
// キーが残り、WASDが反応しなくなる不具合が起きていた。両方のタイミングでリセットする。
document.addEventListener('visibilitychange', () => {
  if (document.hidden) Object.keys(keys).forEach(k => keys[k] = false);
});
window.addEventListener('blur', () => {
  Object.keys(keys).forEach(k => keys[k] = false);
});

// クリックでもスタート可能
canvas.addEventListener('click', handleStart);

// =========================================
// 自機（プレイヤー）
// =========================================
const player = {
  x: W / 2,   // 中央に配置
  y: H - 80,
  w: 36,      // 幅
  h: 36,      // 高さ
  speed: 5,
  cooldown: 0,  // 弾の連射間隔（0になったら撃てる）

  // 自機をドット絵風に描画
  draw() {
    // 無敵中は4フレームごとに点滅（偶数フレームは描画スキップ）
    if (invincible > 0 && Math.floor(frame / 4) % 2 === 0) return;

    const px = 4;

    // エンジン炎（機体の下、2フレーム交互）
    const flameGrid  = SPRITES.flame[Math.floor(frame / 4) % 2];
    const flameColor = `hsl(${270 + frame * 4 % 80}, 80%, 78%)`;
    const flameY     = this.y + (SPRITES.player.length * px) / 2 - px;
    drawSprite(flameGrid, this.x, flameY, flameColor, px);

    // 機体グロー
    ctx.shadowColor = PASTEL.playerGlow;
    ctx.shadowBlur  = 10;
    drawSprite(SPRITES.player, this.x, this.y, PASTEL.player, px, 'rgba(255,255,255,0.9)');
    ctx.shadowBlur  = 0;
  },

  update() {
    // 左右移動
    if (keys['ArrowLeft']  || keys['KeyA']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;

    // 上下移動（画面下半分のみ）
    if (keys['ArrowUp']   || keys['KeyW']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;

    // 移動範囲をクランプ
    this.x = Math.max(this.w / 2,     Math.min(W - this.w / 2,  this.x));
    this.y = Math.max(H / 2,          Math.min(H - this.h,       this.y));

    // クールダウンを減らす
    if (this.cooldown > 0) this.cooldown--;

    // 自動連射（常に撃ち続ける）
    if (this.cooldown === 0 && state === 'playing') {
      // 列のX座標オフセット（1列・2列・3列）
      const colOffsets = { 1: [0], 2: [-12, 12], 3: [-20, 0, 20] };
      const offsets = colOffsets[powerups.columns] || [0];

      offsets.forEach(ox => {
        const bx = this.x + ox;
        const by = this.y - this.h / 2;
        if (powerups.triple) {
          bullets.push(new Bullet(bx, by, -18));
          bullets.push(new Bullet(bx, by,   0));
          bullets.push(new Bullet(bx, by,  18));
        } else {
          bullets.push(new Bullet(bx, by, 0));
        }
      });
      this.cooldown = 12;
    }
  }
};

// =========================================
// 弾クラス
// =========================================
class Bullet {
  constructor(x, y, angleDeg = 0) {
    this.x      = x;
    this.y      = y;
    this.w      = 4;
    this.h      = 14;
    this.pierce = powerups.pierce;  // 発射時点のpierce状態を引き継ぐ
    this.alive  = true;

    const speed = 10 + powerups.bulletSpeed * 4;
    const rad   = angleDeg * Math.PI / 180;
    this.vx = Math.sin(rad) * speed;
    this.vy = -Math.cos(rad) * speed;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y + this.h < 0 || this.x < -20 || this.x > W + 20) this.alive = false;
  }

  draw() {
    ctx.shadowColor = PASTEL.bullet;
    ctx.shadowBlur  = 6;
    drawSprite(SPRITES.bullet, this.x, this.y - this.h / 2, PASTEL.bullet, 3);
    ctx.shadowBlur  = 0;
  }
}

// =========================================
// 敵の弾クラス
// プレイヤーに向かって飛んでくる
// =========================================
class EnemyBullet {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.r = 5;
    this.alive = true;

    // プレイヤーの方向を計算して速度ベクトルにする
    const speed = 4;
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y > H + 20 || this.x < -20 || this.x > W + 20) this.alive = false;
  }

  draw() {
    ctx.shadowColor = PASTEL.enemyBullet;
    ctx.shadowBlur  = 6;
    drawSprite(SPRITES.enemyBullet, this.x, this.y, PASTEL.enemyBullet, 3);
    ctx.shadowBlur  = 0;
  }

  // プレイヤーに当たったか
  hitPlayer(p) {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.r + p.w / 3;
  }
}

// =========================================
// 敵クラス
// =========================================
class Enemy {
  constructor(x, y, type = 0, speedMult = 1) {
    this.x = x;
    this.y = y;
    this.type = type;   // 0: 普通, 1: 速い, 2: 大きい
    this.alive = true;

    // タイプごとのパラメータ（speedMult で難易度に応じた速度補正をかける）
    if (type === 0) {
      this.w = 36; this.h = 36; this.speed = 1.5 * speedMult; this.hp = 1; this.score = 10;
      this.color = PASTEL.enemyA;
      this.shootInterval = 120;
    } else if (type === 1) {
      this.w = 24; this.h = 28; this.speed = 3   * speedMult; this.hp = 1; this.score = 20;
      this.color = PASTEL.enemyB;
      this.shootInterval = 0;
    } else {
      this.w = 54; this.h = 54; this.speed = 0.8 * speedMult; this.hp = 3; this.score = 50;
      this.color = PASTEL.enemyC;
      this.shootInterval = 60;
    }
    // 射撃タイミングをランダムにずらす（一斉発射を防ぐ）
    this.shootCooldown = Math.floor(Math.random() * Math.max(1, this.shootInterval));
  }

  update() {
    this.y += this.speed;

    // 画面下に出たら消える（ミスではない）
    if (this.y - this.h / 2 > H) { this.alive = false; return; }

    // 弾を撃つ（画面内に入ってから）
    if (this.shootInterval > 0 && this.y > 0) {
      this.shootCooldown--;
      if (this.shootCooldown <= 0) {
        this.shootCooldown = this.shootInterval;
        enemyBullets.push(new EnemyBullet(this.x, this.y, player.x, player.y));
      }
    }
  }

  draw() {
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8;

    if (this.type === 0) {
      drawSprite(SPRITES.enemyA, this.x, this.y, this.color, 4, 'rgba(255,255,255,0.7)');
    } else if (this.type === 1) {
      drawSprite(SPRITES.enemyB, this.x, this.y, this.color, 4, 'rgba(255,255,255,0.7)');
    } else {
      drawSprite(SPRITES.enemyC, this.x, this.y, this.color, 6, 'rgba(255,255,255,0.7)');
    }

    ctx.shadowBlur = 0;

    // HPバー（大型のみ）
    if (this.type === 2) {
      const bw = SPRITES.enemyC[0].length * 6;
      const bx = this.x - bw / 2;
      const by = this.y + SPRITES.enemyC.length * 6 / 2 + 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = '#ffaacc';
      ctx.fillRect(bx, by, bw * (this.hp / 3), 4);
    }
  }

  // 弾と当たり判定（円形で判定）
  hitTest(bullet) {
    const dx = bullet.x - this.x;
    const dy = (bullet.y - bullet.h / 2) - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.w / 2;
  }

  // プレイヤーと当たり判定
  hitPlayer(p) {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (this.w / 2 + p.w / 2) * 0.7;
  }
}

// =========================================
// 爆発エフェクトクラス
// =========================================
class Explosion {
  constructor(x, y, size = 1) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.life = 30;      // 30フレームで消える
    this.maxLife = 30;
    this.alive = true;

    // パーティクルを生成（ドット感のために正方形）
    const hues = [300, 320, 260, 200, 340];  // パステル系の色相
    this.particles = Array.from({ length: 12 }, () => ({
      x: 0, y: 0,
      vx: (Math.random() - 0.5) * 7 * size,
      vy: (Math.random() - 0.5) * 7 * size,
      s: Math.floor(Math.random() * 3 + 2) * size,  // 正方形サイズ（整数）
      color: `hsl(${hues[Math.floor(Math.random() * hues.length)]}, 80%, 80%)`
    }));
  }

  update() {
    this.life--;
    if (this.life <= 0) { this.alive = false; return; }

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
    });
  }

  draw() {
    const alpha = this.life / this.maxLife;
    this.particles.forEach(p => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      // 正方形ドットで描画（ドット絵爆発感）
      ctx.fillRect(
        Math.round(this.x + p.x - p.s / 2),
        Math.round(this.y + p.y - p.s / 2),
        p.s, p.s
      );
    });
    ctx.globalAlpha = 1;
  }
}

// =========================================
// パステルカラーパレット
// =========================================
const PASTEL = {
  bg:          '#1a0d2e',   // 深い紫紺（背景ベース）
  starColors: ['#ffcce6', '#d4aaff', '#aaddff', '#aaffee', '#ffe4aa'],
  player:      '#c8f0ff',   // ソフトスカイブルー
  playerGlow:  '#88ccff',
  bullet:      '#fff0aa',   // パステルイエロー
  bulletGlow:  'rgba(255,240,180,0.3)',
  enemyA:      '#ff99bb',   // ピンク（通常）
  enemyB:      '#cc99ff',   // ラベンダー（速い）
  enemyC:      '#ffbb88',   // ピーチ（大型）
  enemyBullet: '#ffaacc',   // ソフトピンク
};

// =========================================
// ドット絵スプライト定義
// 1=メインカラー, 2=ハイライト（薄め）, 0=透明
// =========================================
const SPRITES = {
  // 自機（7×8, px=4）
  player: [
    [0,0,0,1,0,0,0],
    [0,0,1,1,1,0,0],
    [0,1,1,2,1,1,0],
    [1,1,1,1,1,1,1],
    [1,2,1,1,1,2,1],
    [1,1,1,1,1,1,1],
    [0,1,0,0,0,1,0],
    [0,1,0,0,0,1,0],
  ],
  // エンジン炎（3×2, px=4）
  flame: [
    [[0,1,0],[1,1,1]],  // フレームA
    [[1,0,1],[0,1,0]],  // フレームB（交互）
  ],
  // 敵：通常UFO（9×5, px=3）
  enemyA: [
    [0,0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,2,0,2,0,2,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,0,1,0,0,0,1,0,0],
  ],
  // 敵：速い（5×7, px=3）
  enemyB: [
    [0,0,1,0,0],
    [0,1,2,1,0],
    [1,1,0,1,1],
    [0,1,2,1,0],
    [1,1,0,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0],
  ],
  // 敵：大型（9×7, px=5）
  enemyC: [
    [0,0,0,1,1,1,0,0,0],
    [0,0,1,1,2,1,1,0,0],
    [0,1,1,2,1,2,1,1,0],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,2,1,2,1,1,0],
    [0,0,1,1,2,1,1,0,0],
    [0,0,0,1,1,1,0,0,0],
  ],
  // 自機の弾（3×5, px=3）
  bullet: [
    [0,1,0],
    [1,1,1],
    [1,1,1],
    [1,1,1],
    [0,1,0],
  ],
  // 敵の弾（3×3, px=3）
  enemyBullet: [
    [0,1,0],
    [1,1,1],
    [0,1,0],
  ],
};

// スプライトをピクセル単位で描画するヘルパー
// grid: 2D配列（0=透明, 1=mainColor, 2=subColor）
// cx,cy: 中心座標  px: 1ドットのサイズ(px)
function drawSprite(grid, cx, cy, mainColor, px, subColor = null) {
  const rows = grid.length;
  const cols = grid[0].length;
  const ox   = Math.round(cx - (cols * px) / 2);
  const oy   = Math.round(cy - (rows * px) / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      ctx.fillStyle = (v === 2 && subColor) ? subColor : mainColor;
      ctx.fillRect(ox + c * px, oy + r * px, px, px);
    }
  }
}

// =========================================
// 星（背景スクロール）
// =========================================
const stars = Array.from({ length: 100 }, () => ({
  x:      Math.random() * W,
  y:      Math.random() * H,
  r:      Math.random() * 1.8 + 0.4,
  speed:  Math.random() * 1.2 + 0.3,
  color:  PASTEL.starColors[Math.floor(Math.random() * PASTEL.starColors.length)],
  alpha:  Math.random() * 0.6 + 0.3,
}));

function updateStars() {
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  });
}

function drawBackground() {
  // ベース背景
  ctx.fillStyle = PASTEL.bg;
  ctx.fillRect(0, 0, W, H);

  // 星雲ぼかし（ふんわり光の雲）
  const nebulae = [
    { x: W * 0.2, y: H * 0.3, r: 120, color: 'rgba(180,130,255,0.06)' },
    { x: W * 0.8, y: H * 0.6, r: 100, color: 'rgba(255,160,200,0.06)' },
    { x: W * 0.5, y: H * 0.15, r: 90, color: 'rgba(130,200,255,0.05)' },
  ];
  nebulae.forEach(n => {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

function drawStars() {
  stars.forEach(s => {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle   = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// =========================================
// 各オブジェクトの配列
// =========================================
let bullets      = [];
let enemyBullets = [];  // 敵の弾
let enemies      = [];
let explosions   = [];

// =========================================
// 難易度計算（frameベース）
// 1800frame = 30秒ごとにレベルアップ
// =========================================
function getDifficulty() {
  const level     = Math.floor(frame / 1800);         // 30秒ごとに+1
  const interval  = Math.max(18, 80 - level * 8);     // 出現間隔（最小18frame）
  const count     = Math.min(5, 1 + Math.floor(level / 2)); // 同時出現数（最大5体）
  const speedMult = 1 + level * 0.15;                 // 速度倍率
  return { level, interval, count, speedMult };
}

// =========================================
// 敵の出現
// =========================================
function spawnWave(count, speedMult, level) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * (W - 60) + 30;

    // レベルが上がるにつれて強い敵が出やすくなる
    let type = 0;
    const r = Math.random();
    if (level >= 6 && r < 0.2)       type = 2;  // 大型
    else if (level >= 3 && r < 0.4)  type = 1;  // 速い

    // 複数体同時スポーン時はY座標をずらす（画面外で重ならないように）
    const yOffset = i * -40;
    enemies.push(new Enemy(x, -30 + yOffset, type, speedMult));
  }
}

// =========================================
// 当たり判定まとめ
// =========================================
function checkCollisions() {
  // 弾 vs 敵
  bullets.forEach(b => {
    enemies.forEach(e => {
      if (b.alive && e.alive && e.hitTest(b)) {
        if (!b.pierce) b.alive = false;  // 貫通弾は消えない
        e.hp--;
        if (e.hp <= 0) {
          e.alive = false;
          score += e.score;
          explosions.push(new Explosion(e.x, e.y, e.type === 2 ? 2 : 1));
          updateScoreUI();
        }
      }
    });
  });

  // 敵の弾 vs プレイヤー
  enemyBullets.forEach(b => {
    if (b.alive && invincible === 0 && b.hitPlayer(player)) {
      b.alive = false;
      takeDamage();
    }
  });

  // 敵 vs プレイヤー
  enemies.forEach(e => {
    if (e.alive && invincible === 0 && e.hitPlayer(player)) {
      e.alive = false;
      takeDamage();
    }
  });
}

// =========================================
// ランキング（localStorage）
// =========================================
function loadRanking() {
  return JSON.parse(localStorage.getItem('spaceShooterRanking') || '[]');
}

function saveRanking(newScore) {
  const ranking = loadRanking();
  ranking.push(newScore);
  ranking.sort((a, b) => b - a);       // 降順ソート
  const top3 = ranking.slice(0, 3);    // 上位3件だけ残す
  localStorage.setItem('spaceShooterRanking', JSON.stringify(top3));
  return top3;
}

function isHighScore(newScore) {
  const ranking = loadRanking();
  return ranking.length < 3 || newScore > ranking[ranking.length - 1];
}

function buildGameOverHTML(newScore, ranking) {
  const medals = ['🥇', '🥈', '🥉'];
  const isNew  = isHighScore(newScore);

  let rows = ranking.map((s, i) => {
    const highlight = s === newScore && i === ranking.indexOf(newScore)
      ? ' style="color:#ff0;font-weight:bold;"'
      : '';
    return `<span${highlight}>${medals[i]} ${s.toLocaleString()}</span>`;
  }).join('');

  return `
    ${isNew ? '<p id="newRecord">NEW RECORD!</p>' : ''}
    <p id="finalScore">SCORE: ${newScore.toLocaleString()}</p>
    <div id="ranking">${rows}</div>
    <p id="retryMsg">Spaceキーまたはクリックでリトライ</p>
  `;
}

// =========================================
// UI更新
// =========================================
function updateScoreUI() {
  const best = loadRanking()[0] || 0;
  document.getElementById('scoreDisplay').textContent = `SCORE: ${score}`;
  document.getElementById('bestDisplay').textContent  = `BEST: ${best.toLocaleString()}`;
}

function updateLivesUI() {
  document.getElementById('livesDisplay').textContent = '♥ '.repeat(lives).trim();
}

function updateLevelUI(level) {
  document.getElementById('levelDisplay').textContent = `LV: ${level + 1}`;
}

function updatePowerupUI() {
  const icons = [];
  if (powerups.triple)            icons.push('<span style="color:#ffaaff">TRI</span>');
  if (powerups.pierce)            icons.push('<span style="color:#aaffff">PRC</span>');
  if (powerups.speedup > 0)       icons.push(`<span style="color:#ffffaa">SPD${'★'.repeat(powerups.speedup)}</span>`);
  if (powerups.shield)            icons.push('<span style="color:#aaffaa">SLD</span>');
  if (powerups.bulletSpeed > 0)   icons.push(`<span style="color:#ffddaa">BLT${'★'.repeat(powerups.bulletSpeed)}</span>`);
  if (powerups.columns > 1)       icons.push(`<span style="color:#ccffaa">${powerups.columns === 2 ? 'DBL' : 'TRL'}</span>`);
  if (powerups.bombs > 0)         icons.push(`<span style="color:#ffccaa">BOMB×${powerups.bombs}</span>`);
  document.getElementById('powerupDisplay').innerHTML = icons.join(' ');
}

function showOverlay(title, html) {
  document.getElementById('overlayTitle').innerHTML   = title;
  document.getElementById('overlayMessage').innerHTML = html;
  document.getElementById('overlay').classList.remove('hidden');
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

// =========================================
// ゲームのスタート / リセット
// =========================================
function handleStart() {
  if (state === 'title' || state === 'gameover') {
    resetGame();
    state = 'playing';
    hideOverlay();
  }
}

function resetGame() {
  score      = 0;
  lives      = 3;
  frame      = 0;
  bullets      = [];
  enemyBullets = [];
  enemies      = [];
  explosions   = [];
  player.x    = W / 2;
  player.cooldown = 0;
  shakeFrames      = 0;
  flashFrames      = 0;
  invincible       = 0;
  lastLevel        = 0;
  cutIn.active     = false;
  powerups.triple       = false;
  powerups.pierce       = false;
  powerups.speedup      = 0;
  powerups.shield       = false;
  powerups.bulletSpeed  = 0;
  powerups.columns      = 1;
  powerups.bombs        = 0;
  player.speed          = 5;
  updateLevelUI(0);
  updateScoreUI();
  updateLivesUI();
  updatePowerupUI();
}

// =========================================
// メインループ
// =========================================
function gameLoop() {
  // 画面揺れ: ctx全体をランダムにずらす
  if (shakeFrames > 0) {
    const mag = shakeFrames * 0.4;  // 揺れが徐々に収まる
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * mag,
      (Math.random() - 0.5) * mag
    );
    shakeFrames--;
  }

  updateStars();
  drawBackground();
  drawStars();

  if (state === 'playing') {
    frame++;

    // 難易度取得・敵の出現
    const diff = getDifficulty();
    if (frame % diff.interval === 0) spawnWave(diff.count, diff.speedMult, diff.level);

    // レベルアップ検知 → パワーアップ付与 → カットイン発火
    if (diff.level > lastLevel) {
      const picked = applyRandomPowerup();
      cutIn.trigger(diff.level + 1, picked);
      updateLevelUI(diff.level);
      lastLevel = diff.level;
    }

    // 更新
    player.update();
    bullets.forEach(b => b.update());
    enemyBullets.forEach(b => b.update());
    enemies.forEach(e => e.update());
    explosions.forEach(ex => ex.update());

    // 死んだオブジェクトを削除
    bullets      = bullets.filter(b => b.alive);
    enemyBullets = enemyBullets.filter(b => b.alive);
    enemies      = enemies.filter(e => e.alive);
    explosions   = explosions.filter(ex => ex.alive);

    // 当たり判定
    checkCollisions();

    // 描画
    explosions.forEach(ex => ex.draw());
    bullets.forEach(b => b.draw());
    enemyBullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    player.draw();

    // カットイン
    cutIn.update();
    cutIn.draw();

    // 赤フラッシュ（画面全体に半透明の赤を重ねる）
    if (flashFrames > 0) {
      const alpha = (flashFrames / 12) * 0.4;
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, W, H);
      flashFrames--;
    }

    // 無敵カウントダウン
    if (invincible > 0) invincible--;
  }

  // 揺れのtranslateを元に戻す
  if (ctx.save && shakeFrames >= 0) ctx.restore();

  requestAnimationFrame(gameLoop);
}

// =========================================
// ゲーム起動
// =========================================
// 起動時にBEST表示を初期化
document.getElementById('bestDisplay').textContent = `BEST: ${(loadRanking()[0] || 0).toLocaleString()}`;

// タイトル画面にもランキング表示
const initRanking = loadRanking();
const initBest    = initRanking[0] || 0;
const medals      = ['🥇', '🥈', '🥉'];
const initRows    = initRanking.length
  ? initRanking.map((s, i) => `<span>${medals[i]} ${s.toLocaleString()}</span>`).join('')
  : '<span style="color:#666">まだ記録なし</span>';

showOverlay('SPACE SHOOTER', `
  <p id="retryMsg">Spaceキーまたはクリックでスタート</p>
  <div id="ranking">${initRows}</div>
`);
gameLoop();
