import {
  WORLD,
  PLAYER_MAX_HP,
  ZOMBIE_BASE_SPEED,
  BOSS1_HP,
  BOSS1_SPEED,
  BOSS2_HP,
  BOSS2_SPEED,
  BOSS3_HP,
  BOSS3_SPEED,
  BULLET_SPEED,
  SKELETON_HP,
  GHOST_SPEED_MULT,
  BOMBER_MINE_DELAY,
  XP_PER_KILL,
  XP_LEVEL_BASE,
  INVENTORY_SLOTS,
  CAT_MAX_HP,
  CAT_SPEED,
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
    chargeCD: 2.5 + Math.random() * 2.5,
    chargeDir: 0,
    xp: XP_PER_KILL + 10,
  }),
  skeleton: () => ({
    r: 12,
    hp: SKELETON_HP,
    maxHp: SKELETON_HP,
    speed: ZOMBIE_BASE_SPEED,
    xp: XP_PER_KILL + 2,
  }),
  ghost: () => ({
    r: 15,
    hp: ZOMBIE_BASE_HP,
    maxHp: ZOMBIE_BASE_HP,
    speed: ZOMBIE_BASE_SPEED * GHOST_SPEED_MULT,
    intangible: true,
    xp: XP_PER_KILL + 8,
  }),
  bomber: () => ({
    r: 17,
    hp: ZOMBIE_BASE_HP * 1.2,
    maxHp: ZOMBIE_BASE_HP * 1.2,
    mineTimer: BOMBER_MINE_DELAY,
    xp: XP_PER_KILL + 12,
  }),
};

const ZOMBIE_KIND_THRESHOLDS = [
  { limit: 0.2, kind: "fat" },
  { limit: 0.32, kind: "small" },
  { limit: 0.44, kind: "brute" },
  { limit: 0.55, kind: "skeleton" },
  { limit: 0.66, kind: "ghost" },
  { limit: 0.74, kind: "bomber" },
];

const pickDefaultZombieKind = () => {
  const roll = Math.random();
  for (const entry of ZOMBIE_KIND_THRESHOLDS) {
    if (roll < entry.limit) return entry.kind;
  }
  return "normal";
};

export const makeZombie = (x, y, kind = null) => {
  const kindToUse = kind ?? pickDefaultZombieKind();
  const factory = ZOMBIE_KIND_FACTORIES[kindToUse];
  if (!factory) {
    return makeBaseZombie(x, y, kindToUse || "normal");
  }
  return makeBaseZombie(x, y, kindToUse, factory());
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
});

const makeBossBase = (x, y, overrides = {}) => ({
  x,
  y,
  r: 60,
  xp: XP_PER_KILL + 120,
  behavior: "boss",
  state: "idle",
  stateTimer: 0,
  facingDir: "left",
  id: Math.random().toString(36).slice(2),
  ...overrides,
});

export const makeBoss = (x, y, stage = 1) => {
  if (stage === 2) {
    return makeBossBase(x, y, {
      r: 66,
      hp: BOSS2_HP,
      maxHp: BOSS2_HP,
      speed: BOSS2_SPEED,
      kind: "boss2",
      shotgunTimer: 1.5,
      phase: "stage1",
    });
  }
  if (stage === 3) {
    return makeBossBase(x, y, {
      r: 72,
      hp: BOSS3_HP,
      maxHp: BOSS3_HP,
      speed: BOSS3_SPEED,
      kind: "boss3",
      machinegunTimer: 0.8,
      radialTimer: 2.5,
      grenadeTimer: 3.5,
      lastDamageTime: 0,
      targetingVillager: false,
    });
  }
  return makeBossBase(x, y, {
    hp: BOSS1_HP,
    maxHp: BOSS1_HP,
    speed: BOSS1_SPEED,
    kind: "boss1",
  });
};

export const makeCat = (x, y) => ({
  x,
  y,
  r: 10,
  hp: CAT_MAX_HP,
  maxHp: CAT_MAX_HP,
  speed: CAT_SPEED,
  facingDir: "left",
});
