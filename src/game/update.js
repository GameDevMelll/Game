import {
  WORLD,
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  BULLET_SPEED,
  PICKUP_RADIUS,
  ZOMBIE_SPAWN_EVERY,
  ZOMBIE_MAX_ON_FIELD,
  ZOMBIE_MAX_AGE,
  ZOMBIE_HARD_CAP,
  WHITE_START_AT,
  WHITE_SPAWN_EVERY,
  WHITE_SPAWN_MIN,
  WHITE_BASE_SPEED,
  WHITE_MAX_AGE,
  WHITE_HARD_CAP,
  ENEMY_BULLET_SPEED,
  MINE_EXPLOSION_RADIUS,
  WALL_THICKNESS,
  DAY_NIGHT_CYCLE,
  DASH_SPEED,
  DASH_DURATION,
  DASH_COOLDOWN,
} from "./constants.js";
import { clamp, rand, dist2, angleBetween } from "./utils.js";
import { makeZombie, makeItem, makeWhite, makeBullet } from "./entities.js";

function circleRectCollides(cx, cy, cr, r) {
  const closeX = clamp(cx, r.x, r.x + r.w);
  const closeY = clamp(cy, r.y, r.y + r.h);
  const dx = cx - closeX;
  const dy = cy - closeY;
  return dx * dx + dy * dy < cr * cr;
}

function getFreeSpawnNear(px, py, walls, tries = 16) {
  const offsetX = 140;
  const offsetY = 120;
  const innerMinX = offsetX + WALL_THICKNESS + 6;
  const innerMaxX = WORLD.w - offsetX - WALL_THICKNESS - 6;
  const innerMinY = offsetY + WALL_THICKNESS + 6;
  const innerMaxY = WORLD.h - offsetY - 80 - WALL_THICKNESS - 6;
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

export function createInitialState(makeWalls, makePlayer) {
  const player = makePlayer();
  const walls = makeWalls();

  const state = {
    player,
    zombies: [],
    bullets: [],
    items: [],
    whites: [],
    enemyBullets: [],
    mines: [],
    explosions: [],
    walls,
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    spawn: { timer: 1.5, interval: ZOMBIE_SPAWN_EVERY, min: 0.4 },
    whiteSpawn: { timer: WHITE_START_AT, interval: WHITE_SPAWN_EVERY, min: WHITE_SPAWN_MIN },
    kills: 0,
    dayTime: 0,
    time: 0,
  };

  // стартовые предметы вокруг игрока
  const cx = player.x;
  const cy = player.y;
  state.items.push(
    { x: cx + 120, y: cy + 20, r: 12, type: "bat", id: "start-bat" },
    { x: cx - 140, y: cy - 20, r: 12, type: "pistol", id: "start-pistol" },
    { x: cx + 40, y: cy - 130, r: 12, type: "ammo", id: "start-ammo" },
    { x: cx + 10, y: cy + 180, r: 12, type: "mine", id: "start-mine" },
    { x: cx - 60, y: cy + 130, r: 12, type: "medkit", id: "start-medkit" }
  );

  return state;
}

export function attack(state, queueFlash) {
  const p = state.player;
  if (p.attackCD > 0) return;
  if (!p.weapon) return;

  if (p.weapon === "bat") {
    for (const z of state.zombies) {
      if (dist2(p.x, p.y, z.x, z.y) < (p.r + 55) ** 2) {
        z.hp -= 25 * 1.8;
      }
    }
    for (const w of state.whites) {
      if (dist2(p.x, p.y, w.x, w.y) < (p.r + 55) ** 2) {
        w.hp -= 25 * 1.5;
      }
    }
    p.attackCD = 0.5;
    p.swing = 0.28;
    return;
  }

  if (p.weapon === "pistol") {
    if (p.ammo > 0) {
      state.bullets.push(makeBullet(p.x, p.y, p.facing));
      p.ammo -= 1;
      p.attackCD = 0.22;
    } else {
      queueFlash && queueFlash("Нет патронов");
      p.attackCD = 0.15;
    }
    return;
  }

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
      queueFlash && queueFlash("Мина установлена (3с до активации)");
      if (p.mines <= 0) {
        if (p.weapons.length > 0) p.weapon = p.weapons[0];
        else p.weapon = null;
      }
    } else {
      queueFlash && queueFlash("Нет мин");
      p.attackCD = 0.15;
    }
  }
}

export function tryPickup(state, queueFlash) {
  const p = state.player;
  for (const it of state.items) {
    if (dist2(p.x, p.y, it.x, it.y) < (p.r + PICKUP_RADIUS) ** 2) {
      if (["bat", "pistol", "mine"].includes(it.type) && !p.weapons.includes(it.type)) {
        p.weapons.push(it.type);
        if (!p.weapon) p.weapon = it.type;
      }
      if (it.type === "ammo") p.ammo += 12;
      if (it.type === "medkit") p.hp = clamp(p.hp + 35, 0, PLAYER_MAX_HP);
      if (it.type === "mine") {
        p.mines = (p.mines || 0) + 1;
        p.weapon = "mine";
      }
      if (["bat", "pistol"].includes(it.type)) p.weapon = it.type;
      state.items = state.items.filter((i) => i.id !== it.id);
      queueFlash && queueFlash(`Подобрано: ${it.type}`);
      break;
    }
  }
}

export function update(state, dt, { canvas, onDeath, queueFlash }) {
  const p = state.player;
  state.time += dt;
  state.dayTime += dt;
  if (state.dayTime >= DAY_NIGHT_CYCLE) state.dayTime -= DAY_NIGHT_CYCLE;

  // ========= движение игрока + рывок =========
  let dx = 0,
    dy = 0;
  const keys = state.keys;
  if (keys["KeyW"] || keys["ArrowUp"]) dy -= 1;
  if (keys["KeyS"] || keys["ArrowDown"]) dy += 1;
  if (keys["KeyA"] || keys["ArrowLeft"]) dx -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) dx += 1;
  let len = Math.hypot(dx, dy) || 1;
  let moveX = dx / len;
  let moveY = dy / len;

  // обновляем направление, если игрок реально движется
  if (dx !== 0 || dy !== 0) {
    p.moveX = moveX;
    p.moveY = moveY;
  }

  // тики рывка/кулдауна
  if (p.dashCD > 0) p.dashCD -= dt;
  if (p.dashTime > 0) p.dashTime -= dt;

  // старт рывка — по Shift
  const wantDash = keys["ShiftLeft"] || keys["ShiftRight"];
  if (wantDash && p.dashCD <= 0 && (p.moveX !== 0 || p.moveY !== 0)) {
    p.dashTime = DASH_DURATION;
    p.dashCD = DASH_COOLDOWN;
  }

  // выбираем скорость: обычная или рывок
  const curSpeed = p.dashTime > 0 ? DASH_SPEED : PLAYER_SPEED;

  let nx = clamp(p.x + (p.moveX || 0) * curSpeed * dt, p.r, WORLD.w - p.r);
  let ny = clamp(p.y + (p.moveY || 0) * curSpeed * dt, p.r, WORLD.h - p.r);

  for (const w of state.walls) {
    if (circleRectCollides(nx, ny, p.r, w)) {
      const nxOnly = clamp(p.x + (p.moveX || 0) * curSpeed * dt, p.r, WORLD.w - p.r);
      const nyOnly = clamp(p.y + (p.moveY || 0) * curSpeed * dt, p.r, WORLD.h - p.r);
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

  // поворот на мышь
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    p.facing = Math.atan2(state.mouse.y - rect.height / 2, state.mouse.x - rect.width / 2);
  }

  if (p.attackCD > 0) p.attackCD -= dt;
  if (p.swing > 0) p.swing -= dt;

  if (state.mouse.down || keys["Space"]) {
    attack(state, queueFlash);
    state.mouse.down = false;
  }

  if (keys["KeyE"]) {
    tryPickup(state, queueFlash);
  }

  // пули игрока
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

  // спавн зомби
  state.spawn.timer -= dt;
  if (state.spawn.timer <= 0 && state.zombies.length < ZOMBIE_MAX_ON_FIELD) {
    state.spawn.interval = Math.max(state.spawn.min, state.spawn.interval * 0.965);
    state.spawn.timer = state.spawn.interval * rand(0.5, 1.1);
    const spot = getFreeSpawnNear(p.x, p.y, state.walls);
    state.zombies.push(makeZombie(spot.x, spot.y));
  }

  // спавн стрелков
  if (state.time >= WHITE_START_AT) {
    state.whiteSpawn.timer -= dt;
    if (state.whiteSpawn.timer <= 0) {
      state.whiteSpawn.interval = Math.max(state.whiteSpawn.min, state.whiteSpawn.interval * 0.97);
      state.whiteSpawn.timer = state.whiteSpawn.interval * rand(0.6, 1.1);
      const spot = getFreeSpawnNear(p.x, p.y, state.walls);
      state.whites.push(makeWhite(spot.x, spot.y));
    }
  }

  // зомби
  for (const z of state.zombies) {
    z.age += dt;
    const ang = angleBetween(z.x, z.y, p.x, p.y);
    const speed = z.speed || 140;
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

    if (dist2(p.x, p.y, z.x, z.y) < (z.r + p.r + 2) ** 2) {
      p.hp -= 20 * dt;
      if (p.hp <= 0) {
        p.hp = 0;
        onDeath && onDeath();
      }
    }
    for (const b of state.bullets) {
      if (dist2(b.x, b.y, z.x, z.y) < (z.r + 4) ** 2) {
        z.hp -= 24;
        b.life = 0;
      }
    }
  }

  // стрелки
  for (const w of state.whites) {
    w.age += dt;
    const angToP = angleBetween(w.x, w.y, p.x, p.y);
    const d2p = dist2(w.x, w.y, p.x, p.y);

    const tryStep = (ang) => {
      const sx = clamp(w.x + Math.cos(ang) * WHITE_BASE_SPEED * dt, 10, WORLD.w - 10);
      const sy = clamp(w.y + Math.sin(ang) * WHITE_BASE_SPEED * dt, 10, WORLD.h - 10);
      for (const wall of state.walls) {
        if (circleRectCollides(sx, sy, w.r, wall)) return null;
      }
      return { x: sx, y: sy };
    };

    if (d2p < 200 * 200) {
      const step = tryStep(angToP + Math.PI);
      if (step) {
        w.x = step.x;
        w.y = step.y;
      }
    } else if (d2p > 360 * 360) {
      const step = tryStep(angToP);
      if (step) {
        w.x = step.x;
        w.y = step.y;
      }
    }

    w.shootCD -= dt;
    if (w.shootCD <= 0) {
      const ang = Math.atan2(p.y - w.y, p.x - w.x);
      state.enemyBullets.push({ x: w.x, y: w.y, ang, life: 3.5 });
      w.shootCD = 1.6;
    }
  }

  // мины
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
        for (const w of state.whites) {
          if (dist2(m.x, m.y, w.x, w.y) < (m.r + w.r) ** 2) {
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
        state.zombies.forEach((z) => {
          if (dist2(m.x, m.y, z.x, z.y) < MINE_EXPLOSION_RADIUS ** 2) z.hp = 0;
        });
        state.whites.forEach((w) => {
          if (dist2(m.x, m.y, w.x, w.y) < MINE_EXPLOSION_RADIUS ** 2) w.hp = 0;
        });
        if (dist2(m.x, m.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2) {
          p.hp = 0;
          onDeath && onDeath();
        }
      } else {
        keep.push(m);
      }
    }
    state.mines = keep;
  }

  // взрывы
  if (state.explosions.length) {
    const keepEx = [];
    for (const ex of state.explosions) {
      ex.life -= dt;
      ex.r += 420 * dt;
      if (ex.life > 0) keepEx.push(ex);
    }
    state.explosions = keepEx;
  }

  // пули врагов
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
        onDeath && onDeath();
      }
    }
  }
  state.enemyBullets = state.enemyBullets.filter((b) => b.life > 0);

  // очистка
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

  state.whites = state.whites.filter((w) => w.hp > 0 && w.age < WHITE_MAX_AGE);

  if (state.zombies.length > ZOMBIE_HARD_CAP) state.zombies.length = ZOMBIE_HARD_CAP;
  if (state.whites.length > WHITE_HARD_CAP) state.whites.length = WHITE_HARD_CAP;
}
