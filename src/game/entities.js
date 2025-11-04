import {
  WORLD,
  PLAYER_MAX_HP,
  ZOMBIE_BASE_SPEED,
  BOSS_HP,
  BOSS_SPEED,
  BULLET_SPEED,
  SKELETON_HP,
  GHOST_SPEED_MULT,
  BOMBER_MINE_DELAY,
  XP_PER_KILL,
  XP_LEVEL_BASE,
  INVENTORY_SLOTS,
  CAT_MAX_HP,
  CAT_SPEED,
  VILLAGER_MEDKIT_DROP_INTERVAL,
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
  facingDir: "right",
  weapon: null,
  inventory: Array.from({ length: INVENTORY_SLOTS }, () => null),
  selectedSlot: 0,
  ammo: 0,
  attackCD: 0,
  swing: 0,
  invulnerableTime: 0,
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
  hp: ZOMBIE_BASE_HP,
  maxHp: ZOMBIE_BASE_HP,
  speed: ZOMBIE_BASE_SPEED,
  age: 0,
  kind,
  behavior: "chase",
  state: "idle",
  stateTimer: 0,
  xp: XP_PER_KILL,
  mineTimer: null,
  facingDir: "left",
  ...overrides,
});

const ZOMBIE_KIND_FACTORIES = {
  fat: () => ({
    r: 16 * 1.4,
    hp: ZOMBIE_BASE_HP * 2,
    maxHp: ZOMBIE_BASE_HP * 2,
    speed: ZOMBIE_BASE_SPEED * 0.8,
    xp: XP_PER_KILL + 6,
  }),
  small: () => ({
    r: 16 * 0.5,
    speed: ZOMBIE_BASE_SPEED * 2,
    behavior: "leap",
    leapCD: 1.1 + Math.random() * 1.6,
    targetAng: 0,
    xp: XP_PER_KILL + 4,
  }),
  brute: () => ({
    r: 16 * 1.3,
    hp: ZOMBIE_BASE_HP * 3,
    maxHp: ZOMBIE_BASE_HP * 3,
    speed: ZOMBIE_BASE_SPEED * 0.75,
    behavior: "charge",
  }),
};

export const makeBullet = (x, y, ang, options = {}) => ({
  radius: options.radius ?? 3,
  life: options.life ?? 1.2,
});

export const makeItem = (x, y, type) => ({
  x,
  y,
  r: 12,
  type,
  id: Math.random().toString(36).slice(2),
});

export const makeWhite = (x, y, type = "white") => {
  if (type === "witch") {
    return {
      x,
      y,
      r: 20,
      hp: ZOMBIE_BASE_HP * 2,
      maxHp: ZOMBIE_BASE_HP * 2,
      age: 0,
      shootCD: 1.2,
      summonCD: 0,
      type: "witch",
      xp: XP_PER_KILL + 22,
      facingDir: "left",
    };
  }
  return {
    x,
    y,
    r: 16,
    hp: 28,
    maxHp: 28,
    age: 0,
    shootCD: 1.6,
    type: "white",
    xp: XP_PER_KILL + 6,
    facingDir: "left",
  };
};

const randWander = () => 1.5 + Math.random() * 2.5;

export const makeVillager = (x, y) => ({
  x,
  y,
  r: 14,
  hp: PLAYER_MAX_HP * 0.75,
  maxHp: PLAYER_MAX_HP * 0.75,
  wanderTimer: randWander(),
  wanderAng: Math.random() * Math.PI * 2,
  facingDir: "left",
  medkitTimer: VILLAGER_MEDKIT_DROP_INTERVAL,
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
  facingDir: "left",
});

export const makeCat = (x, y) => ({
  x,
  y,
  r: 10,
  hp: CAT_MAX_HP,
  maxHp: CAT_MAX_HP,
  speed: CAT_SPEED,
  facingDir: "left",
});
