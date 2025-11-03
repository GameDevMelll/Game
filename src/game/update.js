// src/game/update.js

import {
  WORLD,
  PLAYER_SPEED,
  BULLET_SPEED,
  ZOMBIE_BASE_SPEED,
  ZOMBIE_MAX_ON_FIELD,
  ZOMBIE_SPAWN_EVERY,
  ZOMBIE_MAX_AGE,
  ZOMBIE_HARD_CAP,
  WHITE_START_AT,
  WHITE_BASE_SPEED,
  WHITE_MAX_AGE,
  WHITE_HARD_CAP,
  ENEMY_BULLET_SPEED,
  MINE_EXPLOSION_RADIUS,
  DAY_NIGHT_CYCLE,
} from "./constants.js";
import { clamp, dist2, angleBetween, rand } from "./utils.js";
import { circleRectCollides, getFreeSpawnNear } from "./maze.js";
import { makeZombie, makeWhite, makeItem } from "./state.js";
import { attack } from "./combat.js";

// главный апдейт игры
export function updateGame(state, dt, onDeath) {
  // если не играем — ничего не обновляем
  if (state.mode !== "play") return;

  const p = state.player;

  // время
  state.time += dt;
  state.dayTime += dt;
  if (state.dayTime >= DAY_NIGHT_CYCLE) state.dayTime -= DAY_NIGHT_CYCLE;

  // ===================== 1. ДВИЖЕНИЕ ИГРОКА =====================
  let dx = 0;
  let dy = 0;
  if (state.input.up) dy -= 1;
  if (state.input.down) dy += 1;
  if (state.input.left) dx -= 1;
  if (state.input.right) dx += 1;

  // если кнопки отпущены — игрок СТОИТ (это то, что ты хотел вернуть)
  const len = Math.hypot(dx, dy) || 1;
  let nx = clamp(p.x + (dx / len) * PLAYER_SPEED * dt, p.r, WORLD.w - p.r);
  let ny = clamp(p.y + (dy / len) * PLAYER_SPEED * dt, p.r, WORLD.h - p.r);

  // коллизия с стенами
  for (const w of state.walls) {
    if (circleRectCollides(nx, ny, p.r, w)) {
      // пробуем по х
      const nxOnly = clamp(p.x + (dx / len) * PLAYER_SPEED * dt, p.r, WORLD.w - p.r);
      // пробуем по y
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

  // ===================== 2. ПОВОРОТ К МЫШИ =====================
  if (state.canvasSize) {
    const { w, h } = state.canvasSize;
    p.facing = Math.atan2(state.mouse.y - h / 2, state.mouse.x - w / 2);
  }

  // ===================== 3. КУЛДАУНЫ =====================
  if (p.attackCD > 0) p.attackCD -= dt;
  if (p.swing > 0) p.swing -= dt;

  // ===================== 4. ВЫБОР ОРУЖИЯ (1..5, Q) =====================
  // цифры
  if (state.input.selectSlot != null) {
    const slot = state.input.selectSlot - 1; // 1..5 -> 0..4
    if (Array.isArray(p.weapons) && p.weapons[slot]) {
      p.weapon = p.weapons[slot];
      if (state.flash) state.flash(`Выбрано оружие: ${p.weapon}`);
    }
    state.input.selectSlot = null;
  }
  // Q
  if (state.input.switchWeapon) {
    if (Array.isArray(p.weapons) && p.weapons.length > 1) {
      const idx = p.weapons.indexOf(p.weapon);
      const next = (idx + 1) % p.weapons.length;
      p.weapon = p.weapons[next];
      if (state.flash) state.flash(`Выбрано оружие: ${p.weapon}`);
    }
    state.input.switchWeapon = false;
  }

  // ===================== 5. АТАКА =====================
  if (state.input.attack) {
    // переносим тяжёлую логику в combat.js
    attack(state);
    // ОБЯЗАТЕЛЬНО сбрасываем, чтобы не долбило каждый кадр
    state.input.attack = false;
  }

  // ===================== 6. ПОДБОР =====================
  if (state.input.pickup) {
    if (state.tryPickup) {
      state.tryPickup(state);
    }
    state.input.pickup = false;
  }

  // ===================== 7. ПУЛИ ИГРОКА =====================
  for (const b of state.bullets) {
    b.x += Math.cos(b.ang) * (b.speed || BULLET_SPEED) * dt;
    b.y += Math.sin(b.ang) * (b.speed || BULLET_SPEED) * dt;
    b.life -= dt;

    // пули не должны лететь сквозь стены
    for (const w of state.walls) {
      if (circleRectCollides(b.x, b.y, 3, w)) {
        b.life = 0;
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // ===================== 8. СПАВН ЗОМБИ =====================
  state.spawn.timer -= dt;
  if (state.spawn.timer <= 0 && state.zombies.length < ZOMBIE_MAX_ON_FIELD) {
    // ускоряем спавн
    state.spawn.interval = Math.max(state.spawn.min, state.spawn.interval * 0.965);
    state.spawn.timer = state.spawn.interval * rand(0.5, 1.1);

    const spot = getFreeSpawnNear(p.x, p.y, state.walls);
    state.zombies.push(makeZombie(spot.x, spot.y));
  }

  // ===================== 9. СПАВН СТРЕЛКОВ (white) =====================
  if (state.time >= WHITE_START_AT) {
    state.whiteSpawn.timer -= dt;
    if (state.whiteSpawn.timer <= 0) {
      state.whiteSpawn.interval = Math.max(state.whiteSpawn.min, state.whiteSpawn.interval * 0.97);
      state.whiteSpawn.timer = state.whiteSpawn.interval * rand(0.6, 1.1);
      const spot = getFreeSpawnNear(p.x, p.y, state.walls);
      state.shooters.push(makeWhite(spot.x, spot.y));
    }
  }

  // ===================== 10. ДВИЖЕНИЕ ЗОМБИ =====================
  for (const z of state.zombies) {
    z.age += dt;
    const ang = angleBetween(z.x, z.y, p.x, p.y);
    const speed = z.speed || ZOMBIE_BASE_SPEED;
    const prevX = z.x;
    const prevY = z.y;

    let zx = clamp(z.x + Math.cos(ang) * speed * dt, 10, WORLD.w - 10);
    let zy = clamp(z.y + Math.sin(ang) * speed * dt, 10, WORLD.h - 10);

    // простая попытка обхода
    let blocked = false;
    for (const w of state.walls) {
      if (circleRectCollides(zx, zy, z.r, w)) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      // пробуем только X
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
        // пробуем только Y
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
          // не смог — откат
          zx = prevX;
          zy = prevY;
        }
      }
    }

    z.x = zx;
    z.y = zy;

    // урон игроку
    if (dist2(p.x, p.y, z.x, z.y) < (z.r + p.r + 2) ** 2) {
      p.hp -= 20 * dt;
      if (p.hp <= 0) {
        p.hp = 0;
        onDeath();
      }
    }

    // попадание по зомби пулями
    for (const b of state.bullets) {
      if (dist2(b.x, b.y, z.x, z.y) < (z.r + 4) ** 2) {
        z.hp -= 24;
        b.life = 0;
      }
    }
  }

  // ===================== 11. ДВИЖЕНИЕ СТРЕЛКОВ =====================
  for (const s of state.shooters) {
    s.age += dt;
    const angToP = angleBetween(s.x, s.y, p.x, p.y);
    const d2p = dist2(s.x, s.y, p.x, p.y);

    // простая тактика: близко — отходим, далеко — подходим
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

    // стрельба
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

  // ===================== 12. МИНЫ =====================
  if (state.mines.length) {
    const keep = [];
    for (const m of state.mines) {
      // ждём активации
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

      // ищём, кто наступил
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
        // создаём взрыв
        state.explosions.push({ x: m.x, y: m.y, r: 0, life: 0.35 });

        // дамажим всё
        for (const z of state.zombies) {
          if (dist2(m.x, m.y, z.x, z.y) < MINE_EXPLOSION_RADIUS ** 2) {
            z.hp = 0;
          }
        }
        for (const s of state.shooters) {
          if (dist2(m.x, m.y, s.x, s.y) < MINE_EXPLOSION_RADIUS ** 2) {
            s.hp = 0;
          }
        }
        if (dist2(m.x, m.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2) {
          p.hp = 0;
          onDeath();
        }
      } else {
        keep.push(m);
      }
    }
    state.mines = keep;
  }

  // ===================== 13. АНИМАЦИЯ ВЗРЫВОВ =====================
  if (state.explosions.length) {
    const keepEx = [];
    for (const ex of state.explosions) {
      ex.life -= dt;
      ex.r += 420 * dt;
      if (ex.life > 0) keepEx.push(ex);
    }
    state.explosions = keepEx;
  }

  // ===================== 14. ПУЛИ ВРАГОВ =====================
  for (const eb of state.enemyBullets) {
    eb.x += Math.cos(eb.ang) * ENEMY_BULLET_SPEED * dt;
    eb.y += Math.sin(eb.ang) * ENEMY_BULLET_SPEED * dt;
    eb.life -= dt;

    // пули врагов тоже должны биться о стены
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
        onDeath();
      }
    }
  }
  state.enemyBullets = state.enemyBullets.filter((b) => b.life > 0);

  // ===================== 15. ЧИСТКА И ПОДСЧЁТ УБИТЫХ =====================
  const newZ = [];
  let died = 0;
  for (const z of state.zombies) {
    if (z.hp <= 0) {
      died++;
      const drop = Math.random();
      if (drop < 0.25) {
        state.items.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "ammo"));
      } else if (drop < 0.31) {
        state.items.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "medkit"));
      } else if (drop < 0.322) {
        state.items.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "mine"));
      }
      continue;
    }
    if (z.age >= ZOMBIE_MAX_AGE) {
      // старые зомби просто исчезают
      continue;
    }
    newZ.push(z);
  }
  state.zombies = newZ;
  if (died > 0) state.kills += died;

  // стрелков чистим по хп и по возрасту
  state.shooters = state.shooters.filter((s) => s.hp > 0 && s.age < WHITE_MAX_AGE);

  // хардкап, чтобы не лагало
  if (state.zombies.length > ZOMBIE_HARD_CAP) state.zombies.length = ZOMBIE_HARD_CAP;
  if (state.shooters.length > WHITE_HARD_CAP) state.shooters.length = WHITE_HARD_CAP;
}
