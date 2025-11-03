// src/game/update.js
import {
  WORLD,
  PLAYER_SPEED,
  BULLET_SPEED,
  ZOMBIE_BASE_SPEED,
  WHITE_BASE_SPEED,
  ZOMBIE_MAX_ON_FIELD,
  ZOMBIE_SPAWN_EVERY,
  ZOMBIE_MAX_AGE,
  ZOMBIE_HARD_CAP,
  WHITE_START_AT,
  WHITE_SPAWN_EVERY,
  WHITE_SPAWN_MIN,
  WHITE_MAX_AGE,
  WHITE_HARD_CAP,
  ENEMY_BULLET_SPEED,
  MINE_EXPLOSION_RADIUS,
  DAY_NIGHT_CYCLE,
} from "./constants.js";
import { angleBetween, clamp, dist2, rand } from "./utils.js";
import { makeZombie, makeWhite, makeItem } from "./state.js";
import { attack } from "./combat.js";
import { circleRectCollides, getFreeSpawnNear } from "./maze.js";

export function updateGame(state, dt, onDeath) {
  if (state.mode !== "play") return;

  const p = state.player;
  state.time += dt;
  state.dayTime += dt;
  if (state.dayTime >= DAY_NIGHT_CYCLE) state.dayTime -= DAY_NIGHT_CYCLE;

  // 1. движение игрока
  let dx = 0,
    dy = 0;
  if (state.input.up) dy -= 1;
  if (state.input.down) dy += 1;
  if (state.input.left) dx -= 1;
  if (state.input.right) dx += 1;
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

  // 2. поворот к мыши
  if (state.canvasSize) {
    const { w, h } = state.canvasSize;
    p.facing = Math.atan2(state.mouse.y - h / 2, state.mouse.x - w / 2);
  }

  // 3. кд
  if (p.attackCD > 0) p.attackCD -= dt;
  if (p.swing > 0) p.swing -= dt;

  // 4. выбор оружия цифрой
  if (state.input.selectSlot != null) {
    const idx = state.input.selectSlot - 1; // 1..5 → 0..4
    if (Array.isArray(p.weapons) && p.weapons[idx]) {
      p.weapon = p.weapons[idx];
      if (state.flash) state.flash(`Выбрано оружие: ${p.weapon}`);
    }
    state.input.selectSlot = null;
  }

  // 5. смена оружия (Q)
  if (state.input.switchWeapon) {
    if (Array.isArray(p.weapons) && p.weapons.length > 1) {
      const cur = p.weapons.indexOf(p.weapon);
      const next = (cur + 1) % p.weapons.length;
      p.weapon = p.weapons[next];
      if (state.flash) state.flash(`Выбрано оружие: ${p.weapon}`);
    }
    state.input.switchWeapon = false;
  }

  // 6. атака
  if (state.input.attack) {
    attack(state);            // <<< здесь уже НЕТ тяжёлого цикла
    state.input.attack = false; // <<< важно: сбрасываем, чтобы не спамил
  }

  // 7. подобрать
  if (state.input.pickup) {
    // у тебя это в другом файле, если не — перенеси
    // тут можно просто вызвать state.pickup(state)
    if (state.tryPickup) state.tryPickup(state);
    state.input.pickup = false;
  }

  // 8. далее — всё как у тебя: спавн зомби, их движение и т.д.
  // (оставь свой код тут без изменений)
}
