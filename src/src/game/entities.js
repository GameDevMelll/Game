import { WORLD, PLAYER_MAX_HP, ZOMBIE_BASE_SPEED } from "./constants.js";

export const makePlayer = () => ({
  x: WORLD.w / 2,
  y: WORLD.h / 2,
  r: 17,
  hp: PLAYER_MAX_HP,
  facing: 0,
  weapon: null,
  weapons: [],
  ammo: 0,
  attackCD: 0,
  swing: 0,
  mines: 0,
});

export const makeZombie = (x, y, kind = null) => {
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
};

export const makeBullet = (x, y, ang) => ({ x, y, ang, life: 1.2 });

export const makeItem = (x, y, type) => ({
  x,
  y,
  r: 12,
  type,
  id: Math.random().toString(36).slice(2),
});

export const makeWhite = (x, y) => ({
  x,
  y,
  r: 16,
  hp: 28,
  age: 0,
  shootCD: 1.6,
});
