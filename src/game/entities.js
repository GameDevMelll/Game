import {
  WORLD,
  PLAYER_MAX_HP,
  ZOMBIE_BASE_SPEED,
  BOSS_HP,
  BULLET_SPEED,
} from "./constants.js";

const ZOMBIE_BASE_HP = 34;

export const makePlayer = () => ({
  x: WORLD.w / 2,
  y: WORLD.h / 2,
  r: 17,
  hp: PLAYER_MAX_HP,
  maxHp: PLAYER_MAX_HP,
  level: 1,
  xp: 0,
  nextLevelXp: XP_LEVEL_BASE,
  facing: 0,
  weapon: null,
  weapons: [],
  ammo: 0,
  attackCD: 0,
  swing: 0,
  mines: 0,
  medkits: 0,
  // для рывка
  dashTime: 0,
  dashCD: 0,
  moveX: 0,
  moveY: 0,
});

const makeBaseZombie = (x, y, kind, overrides = {}) => ({
  x,
  y,
  r: 16,
  hp: 34,
  maxHp: 34,
  speed: ZOMBIE_BASE_SPEED,
  age: 0,
  kind,
  behavior: "chase",
  state: "idle",
  stateTimer: 0,
  ...overrides,
});

export const makeZombie = (x, y, kind = null) => {
  if (!kind) {
    const r = Math.random();
    if (r < 0.15) kind = "fat";
    else if (r < 0.3) kind = "small";
    else if (r < 0.42) kind = "brute";
    else if (r < 0.57) kind = "stalker";
    else kind = "normal";
  }
  if (kind === "fat") {
    return makeBaseZombie(x, y, "fat", {
      r: 16 * 1.4,
      hp: 34 * 2,
      maxHp: 34 * 2,
      speed: ZOMBIE_BASE_SPEED * 0.8,
    });
  }
  if (kind === "small") {
    return makeBaseZombie(x, y, "small", {
      r: 16 * 0.5,
      speed: ZOMBIE_BASE_SPEED * 2,
      behavior: "leap",
      leapCD: 1.1 + Math.random() * 1.6,
      targetAng: 0,
    });
  }
  if (kind === "brute") {
    return makeBaseZombie(x, y, "brute", {
      r: 16 * 1.3,
      hp: 34 * 3,
      maxHp: 34 * 3,
      speed: ZOMBIE_BASE_SPEED * 0.75,
      behavior: "charge",
      chargeCD: 2.5 + Math.random() * 2.5,
      chargeDir: 0,
    });
  }
  if (kind === "stalker") {
    return makeBaseZombie(x, y, "stalker", {
      r: 16 * 0.95,
      hp: 34 * 0.9,
      maxHp: 34 * 0.9,
      speed: ZOMBIE_BASE_SPEED * 1.1,
      behavior: "flank",
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      strafeTimer: 1 + Math.random() * 1.4,
    });
  }
  return makeBaseZombie(x, y, "normal");
};

export const makeBullet = (x, y, ang, options = {}) => ({
  x,
  y,
  ang,
  speed: options.speed ?? BULLET_SPEED,
  damage: options.damage ?? 24,
  radius: options.radius ?? 3,
  life: options.life ?? 1.2,
});

export const makeVillager = (x, y) => ({
  x,
  y,
  r: 14,
  hp: PLAYER_MAX_HP * 0.75,
  maxHp: PLAYER_MAX_HP * 0.75,
  wanderTimer: randWander(),
  wanderAng: Math.random() * Math.PI * 2,
});

export const makeBoss = (x, y) => ({
  x,
  y,
  r: 60,
  hp: BOSS_HP,
  maxHp: BOSS_HP,
  speed: BOSS_SPEED,
  kind: "boss",
  xp: XP_PER_KILL + 120,
  behavior: "boss",
  state: "idle",
  stateTimer: 0,
});
