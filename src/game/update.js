// src/game/update.js

// ================== локальные константы ==================
const WORLD = { w: 2400, h: 1800 };
const PLAYER_SPEED = 230;
const PLAYER_MAX_HP = 100;
const BULLET_SPEED = 540;

const ZOMBIE_BASE_SPEED = 140;
const ZOMBIE_SPAWN_EVERY = 2.6;
const ZOMBIE_MAX_ON_FIELD = 35;
const ZOMBIE_MAX_AGE = 15;
const ZOMBIE_HARD_CAP = 50;

const WHITE_START_AT = 30;
const WHITE_SPAWN_EVERY = 4.0;
const WHITE_SPAWN_MIN = 1.0;
const WHITE_BASE_SPEED = 100;
const WHITE_MAX_AGE = 20;
const WHITE_HARD_CAP = 20;
const ENEMY_BULLET_SPEED = 380;

const MINE_EXPLOSION_RADIUS = 128;

const DAY_DURATION = 60;
const NIGHT_DURATION = 60;
const DAY_NIGHT_CYCLE = DAY_DURATION + NIGHT_DURATION;

const WALL_THICKNESS = 42;
const OFFSET_X = 140;
const OFFSET_Y = 120;

const MELEE_RANGE = 55;
const MELEE_DAMAGE = 25;

// ================== утилиты ==================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};
const angleBetween = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

function circleRectCollides(cx, cy, cr, r) {
  const closeX = clamp(cx, r.x, r.x + r.w);
  const closeY = clamp(cy, r.y, r.y + r.h);
  const dx = cx - closeX;
  const dy = cy - closeY;
  return dx * dx + dy * dy < cr * cr;
}

function getFreeSpawnNear(px, py, walls, tries = 16) {
  const innerMinX = OFFSET_X + WALL_THICKNESS + 6;
  const innerMaxX = WORLD.w - OFFSET_X - WALL_THICKNESS - 6;
  const innerMinY = OFFSET_Y + WALL_THICKNESS + 6;
  const innerMaxY = WORLD.h - OFFSET_Y - 80 - WALL_THICKNESS - 6;
  const minDist = 280;
  const maxDist = 460;
  for (let i = 0; i < tries; i++) {
    const ang = rand(0, Math.PI * 2);
    const dist = rand(minDist, maxDist);
    let sx = px + Math.cos(ang) * dist;
    let sy = py + Math.sin(ang) * dist;
    sx = clamp(sx, innerMinX, innerMaxX);
    sy = clamp(sy, innerMinY, innerMaxY);
    let hit = false;
    for (const w of walls) {
      if (circleRectCollides(sx, sy, 30, w)) {
        hit = true;
        break;
      }
    }
    if (!hit) return { x: sx, y: sy };
  }
  return {
    x: clamp(px + 260, innerMinX, innerMaxX),
    y: clamp(py + 180, innerMinY, innerMaxY),
  };
}

// ================== фабрики (минимальные) ==================
function makeZombie(x, y, kind = null) {
  if (!kind) {
    const r = Math.random();
    if (r < 0.15) kind = "fat";
    else if (r < 0.3) kind = "small";
    else kind = "normal";
  }
  if (kind === "fat") {
    return { x, y, r: 16 * 1.4, hp: 34 * 2, maxHp: 34 * 2, speed: ZOMBIE_BASE_SPEED * 0.8, age: 0, kind: "fat" };
  }
  if (kind === "small") {
    return { x, y, r: 16 * 0.5, hp: 34, maxHp: 34, speed: ZOMBIE_BASE_SPEED * 2, age: 0, kind: "small" };
  }
  return { x, y, r: 16, hp: 34, maxHp: 34, speed: ZOMBIE_BASE_SPEED, age: 0, kind: "normal" };
}

function makeWhite(x, y) {
  return { x, y, r: 16, hp: 28, age: 0, shootCD: 1.6 };
}

function makeItem(x, y, type) {
  return { x, y, r: 12, type, id: Math.random().toString(36).slice(2) };
}

// ================== экспорт 1: начальное состояние ==================
export function createInitialState(player, walls) {
  // ВАЖНО: App.jsx уже создаёт player и walls и передаёт сюда
  return {
    mode: "start",
    time: 0,
    dayTime: 0,
    player,
    walls,
    zombies: [],
    shooters: [],
    bullets: [],
    enemyBullets: [],
    items: [],
    mines: [],
    explosions: [],
    spawn: { timer: 1.5, interval: ZOMBIE_SPAWN_EVERY, min: 0.4 },
    whiteSpawn: { timer: WHITE_START_AT, interval: WHITE_SPAWN_EVERY, min: WHITE_SPAWN_MIN },
    kills: 0,
  };
}

// ================== локальная атака (облегчённая) ==================
function doAttack(state, flash) {
  const p = state.player;
  if (p.attackCD > 0) return;
  if (!p.weapon) return;

  // БИТА
  if (p.weapon === "bat") {
    const zombies = state.zombies;
    const shooters = state.shooters;
    if (zombies.length === 0 && shooters.length === 0) {
      p.attackCD = 0.38;
      p.swing = 0.22;
      return;
    }
    const range2 = (p.r + MELEE_RANGE) ** 2;
    let hitCount = 0;
    const MAX_HITS = 12;
    for (let i = 0; i < zombies.length && hitCount < MAX_HITS; i++) {
      const z = zombies[i];
      const dx = z.x - p.x;
      const dy = z.y - p.y;
      if (dx * dx + dy * dy <= range2) {
        z.hp -= MELEE_DAMAGE * 1.8;
        hitCount++;
      }
    }
    for (let i = 0; i < shooters.length && hitCount < MAX_HITS; i++) {
      const w = shooters[i];
      const dx = w.x - p.x;
      const dy = w.y - p.y;
      if (dx * dx + dy * dy <= range2) {
        w.hp -= MELEE_DAMAGE * 1.5;
        hitCount++;
      }
    }
    p.attackCD = 0.38;
    p.swing = 0.22;
    return;
  }

  // ПИСТОЛЕТ
  if (p.weapon === "pistol") {
    if (p.ammo > 0) {
      state.bullets.push({
        x: p.x,
        y: p.y,
        ang: p.facing,
        life: 1.2,
      });
      p.ammo -= 1;
      p.attackCD = 0.22;
    } else {
      if (flash) flash("Нет патронов");
      p.attackCD = 0.15;
    }
    return;
  }

  // МИНА
  if (p.weapon === "mine") {
    if (p.mines > 0) {
      state.mines.push({
        x: p.x,
        y: p.y,
        r: 14,
        state: "arming",
        timer: 3,
        id: Math.random().toString(36).slice(2),
      });
      p.mines -= 1;
      p.attackCD = 0.3;
      if (flash) flash("Мина установлена (3с)");
      if (p.mines <= 0) {
        if (Array.isArray(p.weapons) && p.weapons.length > 0) p.weapon = p.weapons[0];
        else p.weapon = null;
      }
    } else {
      if (flash) flash("Нет мин");
      p.attackCD = 0.15;
    }
  }
}

// ================== экспорт 2: обновление ==================
/**
 * @param {object} state - текущее состояние (из createInitialState)
 * @param {object} input - то, что собрал App.jsx (up/down/left/right/attack/pickup/switchWeapon/selectSlot)
 * @param {number} dt - дельта времени
 * @param {object} helpers - { onDeath?, flash?, mouse?, canvasSize? }
 */
export function update(state, input = {}, dt = 0, helpers = {}) {
  const p = state.player;
  const { onDeath, flash, mouse, canvasSize } = helpers;

  // если не игра — просто время
  if (state.mode !== "play") {
    state.dayTime += dt;
    if (state.dayTime >= DAY_NIGHT_CYCLE) state.dayTime -= DAY_NIGHT_CYCLE;
    return;
  }

  // время
  state.time += dt;
  state.dayTime += dt;
  if (state.dayTime >= DAY_NIGHT_CYCLE) state.dayTime -= DAY_NIGHT_CYCLE;

  // ===== 1. Движение игрока =====
  let dx = 0,
    dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  const len = Math.hypot(dx, dy) || 1;
  let nx = clamp(p.x + (dx / len) * PLAYER_SPEED * dt, p.r, WORLD.w - p.r);
  let ny = clamp(p.y + (dy / len) * PLAYER_SPEED * dt, p.r, WORLD.h - p.r);

  for (const w of state.walls) {
    if (circleRectCollides(nx, ny, p.r, w)) {
      const nxOnly = clamp(p.x + (dx / len) * PLAYER_SPEED * dt, p.r, WORLD.w - p.r);
      const nyOnly = clamp(p.y + (dy / len) * PLAYER_SPEED * dt, p.r, WORLD.h - p.r);
      if (!circleRectCollides(nxOnly, p.y, p.r, w)) {
        nx = nxOnly;
        ny = p.y;
      } else if (!circleRectCollides(p.x, nyOnly, p.r, w)) {
        nx = p.x;
        ny = nyOnly;
      } else {
        nx = p.x;
        ny = p.y;
      }
    }
  }
  p.x = nx;
  p.y = ny;

  // ===== 2. Поворот к мыши =====
  if (mouse && canvasSize) {
    p.facing = Math.atan2(mouse.y - canvasSize.h / 2, mouse.x - canvasSize.w / 2);
  }

  // ===== 3. КД =====
  if (p.attackCD > 0) p.attackCD -= dt;
  if (p.swing > 0) p.swing -= dt;

  // ===== 4. Выбор оружия цифрами =====
  if (input.selectSlot != null) {
    const idx = input.selectSlot - 1;
    if (Array.isArray(p.weapons) && p.weapons[idx]) {
      p.weapon = p.weapons[idx];
      if (flash) flash(`Выбрано оружие: ${p.weapon}`);
    }
  }

  // ===== 5. Смена оружия (Q) =====
  if (input.switchWeapon) {
    if (Array.isArray(p.weapons) && p.weapons.length > 1) {
      const cur = p.weapons.indexOf(p.weapon);
      const next = (cur + 1) % p.weapons.length;
      p.weapon = p.weapons[next];
      if (flash) flash(`Выбрано оружие: ${p.weapon}`);
    }
  }

  // ===== 6. Атака =====
  if (input.attack) {
    doAttack(state, flash);
  }

  // ===== 7. Подбор =====
  if (input.pickup && state.items && state.items.length) {
    for (const it of state.items) {
      if (dist2(p.x, p.y, it.x, it.y) < (p.r + 48) ** 2) {
        if (["bat", "pistol", "mine"].includes(it.type) && !p.weapons.includes(it.type)) {
          p.weapons.push(it.type);
          if (!p.weapon) p.weapon = it.type;
        }
        if (it.type === "ammo") p.ammo = (p.ammo || 0) + 12;
        if (it.type === "medkit") p.hp = clamp((p.hp || 0) + 35, 0, PLAYER_MAX_HP);
        if (it.type === "mine") {
          p.mines = (p.mines || 0) + 1;
          p.weapon = "mine";
        }
        if (["bat", "pistol"].includes(it.type)) p.weapon = it.type;
        state.items = state.items.filter((i) => i.id !== it.id);
        if (flash) flash(`Подобрано: ${it.type}`);
        break;
      }
    }
  }

  // ===== 8. Пули игрока =====
  for (const b of state.bullets) {
    b.x += Math.cos(b.ang) * BULLET_SPEED * dt;
    b.y += Math.sin(b.ang) * BULLET_SPEED * dt;
    b.life -= dt;
    for (const w of state.walls) {
      if (circleRectCollides(b.x, b.y, 3, w)) {
        b.life = 0;
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // ===== 9. Спавн зомби =====
  state.spawn.timer -= dt;
  if (state.spawn.timer <= 0 && state.zombies.length < ZOMBIE_MAX_ON_FIELD) {
    state.spawn.interval = Math.max(state.spawn.min, state.spawn.interval * 0.965);
    state.spawn.timer = state.spawn.interval * rand(0.5, 1.1);
    const spot = getFreeSpawnNear(p.x, p.y, state.walls);
    state.zombies.push(makeZombie(spot.x, spot.y));
  }

  // ===== 10. Спавн стрелков =====
  if (state.time >= WHITE_START_AT) {
    state.whiteSpawn.timer -= dt;
    if (state.whiteSpawn.timer <= 0) {
      state.whiteSpawn.interval = Math.max(state.whiteSpawn.min, state.whiteSpawn.interval * 0.97);
      state.whiteSpawn.timer = state.whiteSpawn.interval * rand(0.6, 1.1);
      const spot = getFreeSpawnNear(p.x, p.y, state.walls);
      state.shooters.push(makeWhite(spot.x, spot.y));
    }
  }

  // ===== 11. Движение зомби =====
  for (const z of state.zombies) {
    z.age += dt;
    const ang = angleBetween(z.x, z.y, p.x, p.y);
    const speed = z.speed || ZOMBIE_BASE_SPEED;
    const prevX = z.x;
    const prevY = z.y;
    let zx = clamp(z.x + Math.cos(ang) * speed * dt, 10, WORLD.w - 10);
    let zy = clamp(z.y + Math.sin(ang) * speed * dt, 10, WORLD.h - 10);

    let blocked = false;
    for (const w of state.walls) {
      if (circleRectCollides(zx, zy, z.r, w)) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      const zx2 = clamp(z.x + Math.cos(ang) * speed * dt, 10, WORLD.w - 10);
      let xok = true;
      for (const w of state.walls) {
        if (circleRectCollides(zx2, z.y, z.r, w)) {
          xok = false;
          break;
        }
      }
      if (xok) {
        zx = zx2;
        zy = z.y;
      } else {
        const zy2 = clamp(z.y + Math.sin(ang) * speed * dt, 10, WORLD.h - 10);
        let yok = true;
        for (const w of state.walls) {
          if (circleRectCollides(z.x, zy2, z.r, w)) {
            yok = false;
            break;
          }
        }
        if (yok) {
          zx = z.x;
          zy = zy2;
        } else {
          zx = prevX;
          zy = prevY;
        }
      }
    }

    z.x = zx;
    z.y = zy;

    // dmg player
    if (dist2(p.x, p.y, z.x, z.y) < (z.r + p.r + 2) ** 2) {
      p.hp -= 20 * dt;
      if (p.hp <= 0) {
        p.hp = 0;
        if (onDeath) onDeath();
      }
    }

    // bullets hit
    for (const b of state.bullets) {
      if (dist2(b.x, b.y, z.x, z.y) < (z.r + 4) ** 2) {
        z.hp -= 24;
        b.life = 0;
      }
    }
  }

  // ===== 12. Движение стрелков =====
  for (const s of state.shooters) {
    s.age += dt;
    const angToP = angleBetween(s.x, s.y, p.x, p.y);
    const d2p = dist2(s.x, s.y, p.x, p.y);

    const tryStep = (ang) => {
      const sx = clamp(s.x + Math.cos(ang) * WHITE_BASE_SPEED * dt, 10, WORLD.w - 10);
      const sy = clamp(s.y + Math.sin(ang) * WHITE_BASE_SPEED * dt, 10, WORLD.h - 10);
      for (const w of state.walls) {
        if (circleRectCollides(sx, sy, s.r, w)) return null;
      }
      return { x: sx, y: sy };
    };

    if (d2p < 200 * 200) {
      const step = tryStep(angToP + Math.PI);
      if (step) {
        s.x = step.x;
        s.y = step.y;
      }
    } else if (d2p > 360 * 360) {
      const step = tryStep(angToP);
      if (step) {
        s.x = step.x;
        s.y = step.y;
      }
    }

    s.shootCD -= dt;
    if (s.shootCD <= 0) {
      const ang = Math.atan2(p.y - s.y, p.x - s.x);
      state.enemyBullets.push({
        x: s.x,
        y: s.y,
        ang,
        life: 3.5,
      });
      s.shootCD = 1.6;
    }
  }

  // ===== 13. Мины =====
  if (state.mines.length) {
    const keep = [];
    for (const m of state.mines) {
      if (m.state === "arming") {
        m.timer -= dt;
        if (m.timer <= 0) m.state = "armed";
        keep.push(m);
        continue;
      }
      if (m.state !== "armed") {
        keep.push(m);
        continue;
      }

      let exploded = false;
      for (const z of state.zombies) {
        if (dist2(m.x, m.y, z.x, z.y) < (m.r + z.r) ** 2) {
          exploded = true;
          break;
        }
      }
      if (!exploded) {
        for (const s of state.shooters) {
          if (dist2(m.x, m.y, s.x, s.y) < (m.r + s.r) ** 2) {
            exploded = true;
            break;
          }
        }
      }
      if (!exploded && dist2(m.x, m.y, p.x, p.y) < (m.r + p.r) ** 2) {
        exploded = true;
      }

      if (exploded) {
        state.explosions.push({ x: m.x, y: m.y, r: 0, life: 0.35 });
        for (const z of state.zombies) {
          if (dist2(m.x, m.y, z.x, z.y) < MINE_EXPLOSION_RADIUS ** 2) z.hp = 0;
        }
        for (const s of state.shooters) {
          if (dist2(m.x, m.y, s.x, s.y) < MINE_EXPLOSION_RADIUS ** 2) s.hp = 0;
        }
        if (dist2(m.x, m.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2) {
          p.hp = 0;
          if (onDeath) onDeath();
        }
      } else {
        keep.push(m);
      }
    }
    state.mines = keep;
  }

  // ===== 14. Взрывы =====
  if (state.explosions.length) {
    const keepEx = [];
    for (const ex of state.explosions) {
      ex.life -= dt;
      ex.r += 420 * dt;
      if (ex.life > 0) keepEx.push(ex);
    }
    state.explosions = keepEx;
  }

  // ===== 15. Пули врага =====
  for (const eb of state.enemyBullets) {
    eb.x += Math.cos(eb.ang) * ENEMY_BULLET_SPEED * dt;
    eb.y += Math.sin(eb.ang) * ENEMY_BULLET_SPEED * dt;
    eb.life -= dt;

    for (const w of state.walls) {
      if (circleRectCollides(eb.x, eb.y, 4, w)) {
        eb.life = 0;
        break;
      }
    }

    if (eb.life > 0 && dist2(eb.x, eb.y, p.x, p.y) < (p.r + 3) ** 2) {
      p.hp -= 36 * dt * 3;
      eb.life = 0;
      if (p.hp <= 0) {
        p.hp = 0;
        if (onDeath) onDeath();
      }
    }
  }
  state.enemyBullets = state.enemyBullets.filter((b) => b.life > 0);

  // ===== 16. Чистка и счёт =====
  const newZ = [];
  let died = 0;
  for (const z of state.zombies) {
    if (z.hp <= 0) {
      died++;
      const drop = Math.random();
      if (drop < 0.25) state.items.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "ammo"));
      else if (drop < 0.31) state.items.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "medkit"));
      else if (drop < 0.322) state.items.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "mine"));
      continue;
    }
    if (z.age >= ZOMBIE_MAX_AGE) continue;
    newZ.push(z);
  }
  state.zombies = newZ;
  if (died > 0) state.kills += died;

  state.shooters = state.shooters.filter((s) => s.hp > 0 && s.age < WHITE_MAX_AGE);

  if (state.zombies.length > ZOMBIE_HARD_CAP) state.zombies.length = ZOMBIE_HARD_CAP;
  if (state.shooters.length > WHITE_HARD_CAP) state.shooters.length = WHITE_HARD_CAP;
}
