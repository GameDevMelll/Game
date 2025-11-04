import {
  WORLD,
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  PLAYER_LEVEL_HP_BONUS,
  PLAYER_MEDKIT_HEAL,
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
  XP_PER_KILL,
  WITCH_SUMMON_INTERVAL,
  WITCH_MAX_AGE,
  INITIAL_VILLAGERS,
  VILLAGER_SPAWN_EVERY,
  VILLAGER_SPEED,
  BOMBER_COUNTDOWN,
  BOSS1_SPAWN_AT,
  BOSS1_MELEE_DAMAGE,
  BOSS2_SPAWN_DELAY,
  BOSS2_MELEE_DAMAGE,
  BOSS2_SHOTGUN_INTERVAL,
  BOSS2_SHOTGUN_PELLETS,
  BOSS2_SHOTGUN_SPREAD,
  BOSS2_PHASE_THRESHOLD,
  BOSS2_SHOTGUN_RANGE,
  BOSS2_SPAWN_RATE_MULTIPLIER,
  BOSS3_VILLAGER_WAVE,
  BOSS3_SPAWN_DELAY_AFTER_RESCUE,
  BOSS3_MELEE_DAMAGE,
  BOSS3_MACHINEGUN_INTERVAL,
  BOSS3_MACHINEGUN_BURST,
  BOSS3_MACHINEGUN_RATE,
  BOSS3_RADIAL_INTERVAL,
  BOSS3_GRENADE_INTERVAL,
  BOSS3_REGEN_DELAY,
  BOSS3_REGEN_RATE,
  BOSS_CONTACT_RANGE,
  ZOMBIE_BASE_SPEED,
  INVENTORY_SLOTS,
  PLAYER_INVULN_DURATION,
  GRENADE_FUSE,
  GRENADE_EXPLOSION_RADIUS,
  GRENADE_THROW_SPEED,
  CAT_SPAWN_FACTOR,
  CAT_SPEED,
  CAT_MAX_HP,
  CAT_MAX_COUNT,
  MEDKIT_BASE_INTERVAL,
  MEDKIT_MIN_INTERVAL,
} from "./constants.js";
import { SOUND_KEYS } from "./assetKeys.js";
import { clamp, rand, dist2, angleBetween } from "./utils.js";
import {
  makeZombie,
  makeItem,
  makeWhite,
  makeBullet,
  makeVillager,
  makeBoss,
  makeCat,
} from "./entities.js";

function circleRectCollides(cx, cy, cr, r) {
  const closeX = clamp(cx, r.x, r.x + r.w);
  const closeY = clamp(cy, r.y, r.y + r.h);
  const dx = cx - closeX;
  const dy = cy - closeY;
  return dx * dx + dy * dy < cr * cr;
}

const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const linesIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

const segmentIntersectsRect = (x1, y1, x2, y2, rect) => {
  const rx1 = rect.x;
  const ry1 = rect.y;
  const rx2 = rect.x + rect.w;
  const ry2 = rect.y + rect.h;
  if (x1 >= rx1 && x1 <= rx2 && y1 >= ry1 && y1 <= ry2) return true;
  if (x2 >= rx1 && x2 <= rx2 && y2 >= ry1 && y2 <= ry2) return true;
  return (
    linesIntersect(x1, y1, x2, y2, rx1, ry1, rx2, ry1) ||
    linesIntersect(x1, y1, x2, y2, rx2, ry1, rx2, ry2) ||
    linesIntersect(x1, y1, x2, y2, rx2, ry2, rx1, ry2) ||
    linesIntersect(x1, y1, x2, y2, rx1, ry2, rx1, ry1)
  );
};

const hasLineOfSight = (x1, y1, x2, y2, walls) => {
  for (const w of walls) {
    if (segmentIntersectsRect(x1, y1, x2, y2, w)) return false;
  }
  return true;
};

const ZOMBIE_SPAWN_WEIGHTS = [
  { kind: "bomber", base: 0.04, rare: 0.08 },
  { kind: "ghost", base: 0.08, rare: 0.1 },
  { kind: "skeleton", base: 0.12, rare: 0.1 },
  { kind: "brute", base: 0.08, rare: 0.05 },
  { kind: "small", base: 0.1, rare: 0.05 },
  { kind: "fat", base: 0.12, rare: 0 },
];

const pickZombieKindForSpawn = (rareFactor) => {
  const rf = clamp(rareFactor, 0, 1);
  const roll = Math.random();
  let cumulative = 0;
  for (const { kind, base, rare } of ZOMBIE_SPAWN_WEIGHTS) {
    const weight = Math.max(0, base + rare * rf);
    cumulative += weight;
    if (roll < cumulative) return kind;
  }
  return "normal";
};

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

const playAudio = (audio, key) => {
  if (!audio || typeof audio.play !== "function" || !key) return;
  try {
    audio.play(key);
  } catch (err) {
    // ignore playback issues
  }
};

const STACKABLE_ITEMS = new Set(["mine", "medkit", "grenade", "shield"]);

const ensurePlayerInventory = (player) => {
  if (!Array.isArray(player.inventory)) {
    player.inventory = Array.from({ length: INVENTORY_SLOTS }, () => null);
  }
  if (typeof player.selectedSlot !== "number") {
    player.selectedSlot = 0;
  }
  if (!player.__inventoryMigrated) {
    player.__inventoryMigrated = true;
    const legacyWeapons = Array.isArray(player.weapons) ? player.weapons.slice() : [];
    const legacyMines = player.mines || 0;
    const legacyMedkits = player.medkits || 0;
    player.weapons = [];
    player.mines = 0;
    player.medkits = 0;
    for (const type of legacyWeapons) {
      if (!type) continue;
      addToInventory(player, type);
    }
    if (legacyMines) addToInventory(player, "mine", legacyMines);
    if (legacyMedkits) addToInventory(player, "medkit", legacyMedkits);
    if (!player.inventory[player.selectedSlot]) {
      const firstFilled = player.inventory.findIndex(Boolean);
      if (firstFilled !== -1) player.selectedSlot = firstFilled;
    }
  }
  updateSelectedWeapon(player);
};

const updateSelectedWeapon = (player) => {
  if (!Array.isArray(player.inventory)) {
    player.inventory = Array.from({ length: INVENTORY_SLOTS }, () => null);
  }
  if (typeof player.selectedSlot !== "number") player.selectedSlot = 0;
  if (player.selectedSlot < 0) player.selectedSlot = 0;
  if (player.selectedSlot >= player.inventory.length) player.selectedSlot = player.inventory.length - 1;
  if (player.selectedSlot < 0) player.selectedSlot = 0;
  player.weapon = player.inventory[player.selectedSlot]?.type ?? null;
  return player.weapon;
};

const addToInventory = (player, type, amount = 1) => {
  ensurePlayerInventory(player);
  const stackable = STACKABLE_ITEMS.has(type);
  let slotIndex = -1;
  if (stackable) {
    slotIndex = player.inventory.findIndex((slot) => slot?.type === type);
    if (slotIndex !== -1) {
      const slot = player.inventory[slotIndex];
      slot.count = (slot.count ?? 0) + amount;
      updateSelectedWeapon(player);
      return { success: true, slot: slotIndex, addedNew: false };
    }
  } else {
    slotIndex = player.inventory.findIndex((slot) => slot?.type === type);
    if (slotIndex !== -1) {
      updateSelectedWeapon(player);
      return { success: true, slot: slotIndex, addedNew: false };
    }
  }

  const emptyIndex = player.inventory.findIndex((slot) => !slot);
  if (emptyIndex === -1) {
    return { success: false, slot: -1, addedNew: false };
  }
  player.inventory[emptyIndex] = stackable
    ? { type, count: amount }
    : { type };
  if (!player.inventory[player.selectedSlot]) {
    player.selectedSlot = emptyIndex;
  }
  updateSelectedWeapon(player);
  return { success: true, slot: emptyIndex, addedNew: true };
};

const consumeFromSlot = (player, slotIndex, amount = 1) => {
  ensurePlayerInventory(player);
  if (slotIndex < 0 || slotIndex >= player.inventory.length) return false;
  const slot = player.inventory[slotIndex];
  if (!slot) return false;
  if (STACKABLE_ITEMS.has(slot.type)) {
    slot.count = (slot.count ?? 0) - amount;
    if (slot.count <= 0) {
      player.inventory[slotIndex] = null;
    }
  } else {
    player.inventory[slotIndex] = null;
  }
  updateSelectedWeapon(player);
  return true;
};

const getSelectedSlot = (player) => {
  ensurePlayerInventory(player);
  return player.inventory[player.selectedSlot] ?? null;
};

export function createInitialState(makeWalls, makePlayer, assets = null) {
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
    bombs: [],
    grenades: [],
    explosions: [],
    slashes: [],
    villagers: [],
    cats: [],
    walls,
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    spawn: { timer: 1.5, interval: ZOMBIE_SPAWN_EVERY, min: 0.4 },
    whiteSpawn: {
      timer: WHITE_START_AT,
      interval: WHITE_SPAWN_EVERY,
      min: WHITE_SPAWN_MIN,
    },
    villagerSpawn: { timer: 8, interval: VILLAGER_SPAWN_EVERY },
    catSpawn: {
      timer: VILLAGER_SPAWN_EVERY * CAT_SPAWN_FACTOR,
      interval: VILLAGER_SPAWN_EVERY * CAT_SPAWN_FACTOR,
    },
    kills: 0,
    dayTime: 0,
    time: 0,
    bossFlow: {
      stage: 0,
      spawnRateMultiplier: 1,
      stopSpawns: false,
      pendingBoss2: null,
      pendingBoss3: null,
      waitingForClear: false,
      villagersWaveSpawned: false,
      boss2PhaseTriggered: false,
      victoryPending: false,
      victoryAnnounced: false,
      lastBossKind: null,
      rescueSoundTimer: null,
    },
    medkitSpawn: {
      timer: MEDKIT_BASE_INTERVAL,
      base: MEDKIT_BASE_INTERVAL,
    },
    assets: assets || { textures: {}, sounds: {} },
  };

  // стартовые предметы вокруг игрока
  const cx = player.x;
  const cy = player.y;
  const startingItems = [
    makeItem(cx + 120, cy + 20, "bat"),
    makeItem(cx - 140, cy - 20, "pistol"),
    makeItem(cx + 40, cy - 130, "ammo"),
    makeItem(cx + 180, cy - 40, "shotgun"),
    makeItem(cx - 60, cy + 130, "medkit"),
    makeItem(cx + 10, cy + 180, "mine"),
  ];
  state.items.push(...startingItems);

  const scatterItem = (type) => {
    for (let i = 0; i < 80; i++) {
      const x = rand(WALL_THICKNESS + 80, WORLD.w - WALL_THICKNESS - 80);
      const y = rand(WALL_THICKNESS + 80, WORLD.h - WALL_THICKNESS - 160);
      let collides = false;
      for (const wall of walls) {
        if (circleRectCollides(x, y, 18, wall)) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        state.items.push(makeItem(x, y, type));
        return;
      }
    }
  };

  scatterItem("axe");
  scatterItem("machinegun");
  scatterItem("pitchfork");

  for (let i = 0; i < INITIAL_VILLAGERS; i++) {
    const offsetAng = (Math.PI * 2 * i) / INITIAL_VILLAGERS;
    const dist = 140 + Math.random() * 120;
    const vx = clamp(cx + Math.cos(offsetAng) * dist, WALL_THICKNESS + 60, WORLD.w - WALL_THICKNESS - 60);
    const vy = clamp(cy + Math.sin(offsetAng) * dist, WALL_THICKNESS + 60, WORLD.h - WALL_THICKNESS - 60);
    state.villagers.push(makeVillager(vx, vy));
  }

  return state;
}

export function attack(state, queueFlash, audio) {
  const p = state.player;
  ensurePlayerInventory(p);
  if (p.attackCD > 0) return;
  const slot = getSelectedSlot(p);
  if (!slot) return;
  const current = slot.type;
  if (!current) return;
  p.weapon = current;

 const consume = (amount = 1) => consumeFromSlot(p, p.selectedSlot, amount);

  if (current === "bat") {
    let hitSomething = false;
    for (const z of state.zombies) {
      if (
        dist2(p.x, p.y, z.x, z.y) < (p.r + 55) ** 2 &&
        hasLineOfSight(p.x, p.y, z.x, z.y, state.walls)
      ) {
        z.hp -= 25 * 1.8;
        hitSomething = true;
      }
    }
    for (const w of state.whites) {
      if (
        dist2(p.x, p.y, w.x, w.y) < (p.r + 55) ** 2 &&
        hasLineOfSight(p.x, p.y, w.x, w.y, state.walls)
      ) {
        w.hp -= 25 * 1.5;
        hitSomething = true;
      }
    }
    p.attackCD = 0.48;
    p.swing = 0.28;
    if (hitSomething) playAudio(audio, SOUND_KEYS.ENEMY_HIT);
    playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    return;
  }

  if (current === "axe") {
    const arcRange = 150;
    const arcRange2 = arcRange * arcRange;
    const arcHalf = Math.PI / 3;
    const damage = 42;
    let hit = false;
    const applyArc = (targets) => {
      for (const t of targets) {
        if (dist2(p.x, p.y, t.x, t.y) > arcRange2) continue;
        const angToTarget = Math.atan2(t.y - p.y, t.x - p.x);
        if (Math.abs(angleDiff(angToTarget, p.facing)) > arcHalf) continue;
        if (!hasLineOfSight(p.x, p.y, t.x, t.y, state.walls)) continue;
        t.hp -= damage;
        t.x += Math.cos(p.facing) * 12;
        t.y += Math.sin(p.facing) * 12;
        hit = true;
      }
    };
    applyArc(state.zombies);
    applyArc(state.whites);
    state.slashes.push({
      x: p.x,
      y: p.y,
      ang: p.facing,
      life: 0.28,
      maxLife: 0.28,
      radius: arcRange,
    });
    p.attackCD = 0.7;
    p.swing = 0.32;
    if (!hit) queueFlash && queueFlash("Мимо");
    if (hit) playAudio(audio, SOUND_KEYS.ENEMY_HIT);
    playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    return;
  }

  if (current === "pitchfork") {
    const range = 180;
    const width = 26;
    const damage = 84;
    let hit = false;
    const applyLine = (targets) => {
      for (const t of targets) {
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const forward = dx * Math.cos(p.facing) + dy * Math.sin(p.facing);
        if (forward < -t.r || forward > range) continue;
        const side = Math.abs(-dx * Math.sin(p.facing) + dy * Math.cos(p.facing));
        if (side > width) continue;
        if (!hasLineOfSight(p.x, p.y, t.x, t.y, state.walls)) continue;
        t.hp -= damage;
        hit = true;
      }
    };
    applyLine(state.zombies);
    applyLine(state.whites);
    p.attackCD = 0.82;
    p.swing = 0.25;
    if (hit) playAudio(audio, SOUND_KEYS.ENEMY_HIT);
    else queueFlash && queueFlash("Промах");
    playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    return;
  }

  if (current === "pistol") {
    if (p.ammo > 0) {
      state.bullets.push(makeBullet(p.x, p.y, p.facing));
      p.ammo -= 1;
      p.attackCD = 0.22;
      playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    } else {
      queueFlash && queueFlash("Нет патронов");
      p.attackCD = 0.15;
    }
    return;
  }

  if (current === "shotgun") {
    if (p.ammo >= 3) {
      const pellets = 6;
      for (let i = 0; i < pellets; i++) {
        const spread = rand(-0.32, 0.32);
        state.bullets.push(
          makeBullet(p.x, p.y, p.facing + spread, {
            damage: 18,
            speed: BULLET_SPEED * 0.82,
            life: 0.55,
            radius: 4,
          })
        );
      }
      p.ammo -= 3;
      p.attackCD = 0.58;
      playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    } else {
      queueFlash && queueFlash("Нужно 3 патрона");
      p.attackCD = 0.2;
    }
    return;
  }

  if (current === "machinegun") {
    const ammoCost = 1;
    if (p.ammo >= ammoCost) {
      const recoil = rand(-0.04, 0.04);
      state.bullets.push(
        makeBullet(p.x, p.y, p.facing + recoil, {
          damage: 18,
          speed: BULLET_SPEED * 1.05,
          life: 0.9,
          radius: 3,
        })
      );
      p.ammo -= ammoCost;
      p.attackCD = 0.06;
      playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    } else {
      queueFlash && queueFlash("Нужно больше патронов");
      p.attackCD = 0.12;
    }
    return;
  }

  if (current === "mine") {
    if ((slot.count ?? 0) > 0) {
      state.mines.push({
        x: p.x,
        y: p.y,
        r: 14,
        state: "arming",
        timer: 3,
        id: Math.random().toString(36).slice(2),
      });
     consume(1);
      p.attackCD = 0.32;
      queueFlash && queueFlash("Мина установлена");
      playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    } else {
      queueFlash && queueFlash("Нет мин");
      p.attackCD = 0.15;
    }
     return;
  }

  if (current === "grenade") {
    if ((slot.count ?? 0) > 0) {
      state.grenades.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(p.facing) * GRENADE_THROW_SPEED,
        vy: Math.sin(p.facing) * GRENADE_THROW_SPEED,
        timer: GRENADE_FUSE,
        radius: GRENADE_EXPLOSION_RADIUS,
      });
      consume(1);
      p.attackCD = 0.26;
      queueFlash && queueFlash("Граната брошена");
      playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    } else {
      queueFlash && queueFlash("Гранат нет");
      p.attackCD = 0.15;
    }
    return;
  }

  if (current === "medkit") {
    if (p.hp >= p.maxHp - 0.1) {
      queueFlash && queueFlash("Полное здоровье");
      p.attackCD = 0.2;
      return;
    }
    if ((slot.count ?? 0) <= 0) {
      queueFlash && queueFlash("Аптечек нет");
      p.attackCD = 0.2;
      return;
    }
    p.hp = clamp(p.hp + PLAYER_MEDKIT_HEAL, 0, p.maxHp);
    consume(1);
    p.attackCD = 0.32;
    queueFlash && queueFlash(`HP: ${Math.round(p.hp)}/${Math.round(p.maxHp)}`);
    playAudio(audio, SOUND_KEYS.MEDKIT);
    return;
  }

  if (current === "shield") {
    if ((slot.count ?? 0) <= 0) {
      queueFlash && queueFlash("Щитов нет");
      p.attackCD = 0.2;
      return;
    }
    p.invulnerableTime = Math.max(p.invulnerableTime ?? 0, PLAYER_INVULN_DURATION);
    consume(1);
    p.attackCD = 0.2;
    queueFlash && queueFlash("Щит активирован");
    playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    return;
  }
}

export function tryPickup(state, queueFlash, audio) {
  const p = state.player;
  ensurePlayerInventory(p);
  for (const it of state.items) {
    if (dist2(p.x, p.y, it.x, it.y) >= (p.r + PICKUP_RADIUS) ** 2) continue;
    let handled = false;
    if (it.type === "ammo") {
      p.ammo += 12;
      queueFlash && queueFlash(`Патроны: ${p.ammo}`);
      playAudio(audio, SOUND_KEYS.PICKUP);
      handled = true;
    } else {
      const result = addToInventory(p, it.type, 1);
      if (!result.success) {
        queueFlash && queueFlash("Инвентарь заполнен");
      } else {
        const slot = p.inventory[result.slot];
        const stackable = STACKABLE_ITEMS.has(it.type);
        if (result.addedNew) {
          p.selectedSlot = result.slot;
        }
        updateSelectedWeapon(p);
        if (stackable) {
          queueFlash && queueFlash(`${it.type}: ${slot?.count ?? 0}`);
        } else {
          queueFlash && queueFlash(`Подобрано: ${it.type}`);
        }
        if (it.type === "medkit") playAudio(audio, SOUND_KEYS.MEDKIT);
        else playAudio(audio, SOUND_KEYS.PICKUP);
        handled = true;
      }
    }
    if (handled) {
      state.items = state.items.filter((i) => i.id !== it.id);
      break;
    }
  }
}

export function update(state, dt, { canvas, onDeath, onVictory, queueFlash, audio }) {
  const p = state.player;
  ensurePlayerInventory(p);
  if (!Array.isArray(state.cats)) state.cats = [];
  if (!Array.isArray(state.grenades)) state.grenades = [];
  if (!Array.isArray(state.bombs)) state.bombs = [];
  if (!state.catSpawn) {
    state.catSpawn = {
      timer: VILLAGER_SPAWN_EVERY * CAT_SPAWN_FACTOR,
      interval: VILLAGER_SPAWN_EVERY * CAT_SPAWN_FACTOR,
    };
  }
  if (!state.medkitSpawn) {
    state.medkitSpawn = { timer: MEDKIT_BASE_INTERVAL, base: MEDKIT_BASE_INTERVAL };
  }
  if (!state.bossFlow) {
    state.bossFlow = {
      stage: 0,
      spawnRateMultiplier: 1,
      stopSpawns: false,
      pendingBoss2: null,
      pendingBoss3: null,
      waitingForClear: false,
      villagersWaveSpawned: false,
      boss2PhaseTriggered: false,
      victoryPending: false,
      victoryAnnounced: false,
      lastBossKind: null,
      rescueSoundTimer: null,
    };
  }
  if (!p.maxHp) p.maxHp = PLAYER_MAX_HP;
  p.maxHp = Math.max(p.maxHp, PLAYER_MAX_HP);
  p.hp = clamp(p.hp, 0, p.maxHp);
  state.time += dt;
  state.dayTime += dt;
  if (state.dayTime >= DAY_NIGHT_CYCLE) state.dayTime -= DAY_NIGHT_CYCLE;

  const rareFactor = clamp(state.time / 240, 0, 1);

  const bossFlow = state.bossFlow;
  bossFlow.spawnRateMultiplier = Math.max(0.1, bossFlow.spawnRateMultiplier ?? 1);
  const spawnRateMultiplier = clamp(bossFlow.spawnRateMultiplier, 0.1, 6);
  const spawnStopped = !!bossFlow.stopSpawns;

  p.invulnerableTime = Math.max(0, (p.invulnerableTime ?? 0) - dt);
  if (!p.facingDir) p.facingDir = "right";

  const grantXp = (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    p.xp += amount;
    let leveled = false;
    while (p.xp >= p.nextLevelXp) {
      p.xp -= p.nextLevelXp;
      p.level += 1;
      p.maxHp += PLAYER_LEVEL_HP_BONUS;
      p.hp = Math.min(p.maxHp, p.hp + PLAYER_LEVEL_HP_BONUS * 1.5);
      p.nextLevelXp = Math.round(p.nextLevelXp * 1.35 + 25);
      leveled = true;
    }
    if (leveled && queueFlash) {
      queueFlash(`Новый уровень: ${p.level}`);
    }
    if (leveled) playAudio(audio, SOUND_KEYS.LEVEL_UP);
  };

  // движение игрока
  let dx = 0,
    dy = 0;
  const keys = state.keys;
  if (keys["KeyW"] || keys["ArrowUp"]) dy -= 1;
  if (keys["KeyS"] || keys["ArrowDown"]) dy += 1;
  if (keys["KeyA"] || keys["ArrowLeft"]) dx -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) dx += 1;
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
  if (Math.abs(dx) > 0.01) {
    p.facingDir = dx < 0 ? "left" : "right";
  } else if (Math.cos(p.facing) < 0) {
    p.facingDir = "left";
  } else {
    p.facingDir = "right";
  }
  
  // поворот на мышь
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    p.facing = Math.atan2(state.mouse.y - rect.height / 2, state.mouse.x - rect.width / 2);
  }

  if (p.attackCD > 0) p.attackCD -= dt;
  if (p.swing > 0) p.swing -= dt;

  if (state.mouse.down || keys["Space"]) {
    attack(state, queueFlash, audio);
    state.mouse.down = false;
  }

  if (keys["KeyE"]) {
    tryPickup(state, queueFlash, audio);
  }

  // пули игрока
  for (const b of state.bullets) {
    const speed = b.speed ?? BULLET_SPEED;
    const radius = b.radius ?? 3;
    b.x += Math.cos(b.ang) * speed * dt;
    b.y += Math.sin(b.ang) * speed * dt;
    b.life -= dt;
    for (const w of state.walls) {
      if (circleRectCollides(b.x, b.y, radius, w)) {
        b.life = 0;
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // спавн зомби
  state.spawn.min = Math.max(0.2, 0.65 - state.time / 210);
  state.spawn.timer -= dt;
  const canSpawnZombies = !spawnStopped && state.zombies.length < ZOMBIE_MAX_ON_FIELD;
  if (canSpawnZombies && state.spawn.timer <= 0) {
    const baseInterval = Math.max(
      state.spawn.min,
      state.spawn.interval * (0.955 - rareFactor * 0.06)
    );
    state.spawn.interval = baseInterval;
    const adjustedInterval = baseInterval / spawnRateMultiplier;
    state.spawn.timer = adjustedInterval * rand(0.45, 1.05);
    const spot = getFreeSpawnNear(p.x, p.y, state.walls);
    const kind = pickZombieKindForSpawn(rareFactor);
    state.zombies.push(makeZombie(spot.x, spot.y, kind));
    playAudio(audio, SOUND_KEYS.MONSTER_SPAWN);
  }

  if (bossFlow.stage === 0 && state.time >= BOSS1_SPAWN_AT) {
    const centerX = WORLD.w / 2;
    const centerY = WORLD.h / 2;
    state.zombies.push(makeBoss(centerX, centerY, 1));
    bossFlow.stage = 1;
    bossFlow.lastBossKind = "boss1";
    queueFlash && queueFlash("Орк-босс ворвался в бой!");
    playAudio(audio, SOUND_KEYS.MONSTER_SPAWN);
  }

  // спавн стрелков
  if (state.time >= WHITE_START_AT) {
    state.whiteSpawn.min = Math.max(0.45, WHITE_SPAWN_MIN - state.time / 260);
    state.whiteSpawn.timer -= dt;
    if (!spawnStopped && state.whiteSpawn.timer <= 0) {
      const baseInterval = Math.max(
        state.whiteSpawn.min,
        state.whiteSpawn.interval * (0.965 - rareFactor * 0.05)
      );
      state.whiteSpawn.interval = baseInterval;
      const adjustedInterval = baseInterval / spawnRateMultiplier;
      state.whiteSpawn.timer = adjustedInterval * rand(0.6, 1.1);
      const spot = getFreeSpawnNear(p.x, p.y, state.walls);
      const witchChance = Math.min(0.08, 0.02 + state.time / 2400);
      const type = Math.random() < witchChance ? "witch" : "white";
      state.whites.push(makeWhite(spot.x, spot.y, type));
      playAudio(audio, SOUND_KEYS.MONSTER_SPAWN);
    }
  }

  // пополнение жителей
  state.villagerSpawn.timer -= dt;
  if (state.villagerSpawn.timer <= 0 && state.villagers.length < INITIAL_VILLAGERS + 4) {
    const spot = getFreeSpawnNear(p.x, p.y, state.walls, 20);
    state.villagers.push(makeVillager(spot.x, spot.y));
    state.villagerSpawn.timer = state.villagerSpawn.interval + rand(6, 14);
  }

  state.catSpawn.timer -= dt;
  if (state.catSpawn.timer <= 0 && state.cats.length < CAT_MAX_COUNT) {
    const spot = getFreeSpawnNear(p.x, p.y, state.walls, 18);
    state.cats.push(makeCat(spot.x, spot.y));
    state.catSpawn.timer = state.catSpawn.interval * rand(0.8, 1.2);
    queueFlash && queueFlash("Пушистый друг присоединился!");
  }

  const bossAlive = state.zombies.some((z) => z.kind && z.kind.startsWith("boss"));
  if (!bossAlive && bossFlow.pendingBoss2 != null) {
    bossFlow.pendingBoss2 -= dt;
    if (bossFlow.pendingBoss2 <= 0) {
      const centerX = WORLD.w / 2;
      const centerY = WORLD.h / 2;
      state.zombies.push(makeBoss(centerX, centerY, 2));
      bossFlow.stage = Math.max(bossFlow.stage, 2);
      bossFlow.lastBossKind = "boss2";
      bossFlow.pendingBoss2 = null;
      bossFlow.spawnRateMultiplier = BOSS2_SPAWN_RATE_MULTIPLIER;
      bossFlow.stopSpawns = false;
      bossFlow.boss2PhaseTriggered = false;
      queueFlash && queueFlash("Босс №2 явился! Подготовься!");
      playAudio(audio, SOUND_KEYS.MONSTER_SPAWN);
    }
  }

  if (bossFlow.villagersWaveSpawned && bossFlow.rescueSoundTimer != null) {
    bossFlow.rescueSoundTimer -= dt;
    if (bossFlow.rescueSoundTimer <= 0) {
      bossFlow.pendingBoss3 = 0;
      bossFlow.rescueSoundTimer = null;
    }
  }

  if (!bossAlive && bossFlow.pendingBoss3 != null) {
    bossFlow.pendingBoss3 -= dt;
    if (bossFlow.pendingBoss3 <= 0) {
      const centerX = WORLD.w / 2;
      const centerY = WORLD.h / 2;
      state.zombies.push(makeBoss(centerX, centerY, 3));
      bossFlow.stage = Math.max(bossFlow.stage, 3);
      bossFlow.lastBossKind = "boss3";
      bossFlow.pendingBoss3 = null;
      bossFlow.stopSpawns = true;
      bossFlow.spawnRateMultiplier = 1;
      queueFlash && queueFlash("Финальный Босс прибыл!");
      playAudio(audio, SOUND_KEYS.BOSS3_SPAWN);
    }
  }

  // движение жителей
  for (const v of state.villagers) {
    const prevVX = v.x;
    v.wanderTimer = (v.wanderTimer ?? 0) - dt;
    let threat = null;
    let best = Infinity;
    for (const z of state.zombies) {
      const d = dist2(v.x, v.y, z.x, z.y);
      if (d < best) {
        best = d;
        threat = z;
      }
    }
    for (const w of state.whites) {
      const d = dist2(v.x, v.y, w.x, w.y);
      if (d < best) {
        best = d;
        threat = w;
      }
    }
    let moveAng = v.wanderAng ?? Math.random() * Math.PI * 2;
    let speed = VILLAGER_SPEED * 0.65;
    if (threat && best < 320 * 320) {
      moveAng = Math.atan2(v.y - threat.y, v.x - threat.x);
      speed = VILLAGER_SPEED;
    } else if (v.wanderTimer <= 0) {
      v.wanderTimer = 1.5 + Math.random() * 3;
      v.wanderAng = Math.random() * Math.PI * 2;
      moveAng = v.wanderAng;
    } else if (!threat) {
      moveAng = v.wanderAng ?? moveAng;
    }

    const attemptMove = (nx, ny) => {
      for (const wall of state.walls) {
        if (circleRectCollides(nx, ny, v.r, wall)) return false;
      }
      v.x = nx;
      v.y = ny;
      return true;
    };

    const nx = clamp(v.x + Math.cos(moveAng) * speed * dt, v.r, WORLD.w - v.r);
    const ny = clamp(v.y + Math.sin(moveAng) * speed * dt, v.r, WORLD.h - v.r);
    if (!attemptMove(nx, ny)) {
      const nxOnly = clamp(v.x + Math.cos(moveAng) * speed * dt, v.r, WORLD.w - v.r);
      if (!attemptMove(nxOnly, v.y)) {
        const nyOnly = clamp(v.y + Math.sin(moveAng) * speed * dt, v.r, WORLD.h - v.r);
        attemptMove(v.x, nyOnly);
      }
    }

    v.hp = clamp(v.hp, 0, v.maxHp);
    if (Math.abs(v.x - prevVX) > 0.1) {
      v.facingDir = v.x - prevVX < 0 ? "right" : "left";
    }
  }

  const medkitCtrl = state.medkitSpawn;
  const villagersAlive = state.villagers.length;
  const medkitIntervalBase = medkitCtrl.base ?? MEDKIT_BASE_INTERVAL;
  const intervalDivider = Math.max(1, villagersAlive * 0.55 + 0.45);
  const targetInterval = Math.max(MEDKIT_MIN_INTERVAL, medkitIntervalBase / intervalDivider);
  medkitCtrl.timer -= dt;
  if (villagersAlive > 0 && medkitCtrl.timer <= 0) {
    const pick = state.villagers[Math.floor(Math.random() * villagersAlive)];
    const dropX = clamp(pick.x + rand(-32, 32), WALL_THICKNESS + 20, WORLD.w - WALL_THICKNESS - 20);
    const dropY = clamp(pick.y + rand(-32, 32), WALL_THICKNESS + 20, WORLD.h - WALL_THICKNESS - 20);
    state.items.push(makeItem(dropX, dropY, "medkit"));
    medkitCtrl.timer = targetInterval * rand(0.7, 1.25);
  } else if (villagersAlive === 0) {
    medkitCtrl.timer = Math.min(medkitCtrl.timer, targetInterval);
  }

  // кошки следуют за игроком
  for (const cat of state.cats) {
    const prevX = cat.x;
    const prevY = cat.y;
    cat.hp = clamp(cat.hp ?? CAT_MAX_HP, 0, cat.maxHp ?? CAT_MAX_HP);
    const distToPlayer = Math.sqrt(dist2(cat.x, cat.y, p.x, p.y));
    const followSpeed = distToPlayer > 60 ? CAT_SPEED : CAT_SPEED * 0.6;
    const ang = angleBetween(cat.x, cat.y, p.x, p.y);
    const tryMove = (nx, ny) => {
      for (const wall of state.walls) {
        if (circleRectCollides(nx, ny, cat.r, wall)) return false;
      }
      cat.x = nx;
      cat.y = ny;
      return true;
    };
    const nx = clamp(cat.x + Math.cos(ang) * followSpeed * dt, cat.r, WORLD.w - cat.r);
    const ny = clamp(cat.y + Math.sin(ang) * followSpeed * dt, cat.r, WORLD.h - cat.r);
    if (!tryMove(nx, ny)) {
      const nxOnly = clamp(cat.x + Math.cos(ang) * followSpeed * dt, cat.r, WORLD.w - cat.r);
      if (!tryMove(nxOnly, cat.y)) {
        const nyOnly = clamp(cat.y + Math.sin(ang) * followSpeed * dt, cat.r, WORLD.h - cat.r);
        tryMove(cat.x, nyOnly);
      }
    }
    if (Math.abs(cat.x - prevX) > 0.05) {
      cat.facingDir = cat.x - prevX < 0 ? "right" : "left";
    } else if (Math.cos(p.facing) < 0) {
      cat.facingDir = "right";
    } else {
      cat.facingDir = "left";
    }
  }

  // движение зомби и приоритет целей
  const villagersToConvert = new Set();
  const catsToCull = new Set();
  const aliveCats = state.cats.filter((cat) => (cat.hp ?? CAT_MAX_HP) > 0);
  for (const z of state.zombies) {
    z.age += dt;
    let target = p;
    let targetType = "player";
    let bestDist2 = dist2(z.x, z.y, p.x, p.y);
     if (aliveCats.length) {
      let catTarget = null;
      let catDist2 = Infinity;
      for (const cat of aliveCats) {
        const d = dist2(z.x, z.y, cat.x, cat.y);
        if (d < catDist2) {
          catDist2 = d;
          catTarget = cat;
        }
      }
      if (catTarget) {
        target = catTarget;
        targetType = "cat";
        bestDist2 = catDist2;
      }
    }
    for (const villager of state.villagers) {
      const d = dist2(z.x, z.y, villager.x, villager.y);
      if (targetType !== "cat" && d < bestDist2) {
        bestDist2 = d;
        target = villager;
        targetType = "villager";
      }
    }

    if (z.kind === "boss3" && state.villagers.length) {
      let bestVillager = null;
      let villDist2 = Infinity;
      for (const villager of state.villagers) {
        const d = dist2(z.x, z.y, villager.x, villager.y);
        if (d < villDist2) {
          villDist2 = d;
          bestVillager = villager;
        }
      }
      if (
        bestVillager &&
        (villDist2 < bestDist2 * 1.2 || villDist2 < 380 * 380)
      ) {
        bestDist2 = villDist2;
        target = bestVillager;
        targetType = "villager";
      }
    }

    const distToTarget = Math.sqrt(bestDist2);
    let moveAng = angleBetween(z.x, z.y, target.x, target.y);
    let speed = z.speed || ZOMBIE_BASE_SPEED;

    if (!z.state) z.state = "idle";

    if (z.kind === "boss2") {
      z.shotgunTimer = (z.shotgunTimer ?? BOSS2_SHOTGUN_INTERVAL) - dt;
      const hpRatio = clamp(z.hp / (z.maxHp || 1), 0, 1);
      if (hpRatio <= BOSS2_PHASE_THRESHOLD && z.phase !== "stage2") {
        z.phase = "stage2";
        bossFlow.boss2PhaseTriggered = true;
        queueFlash && queueFlash("Босс №2 яростен!");
        playAudio(audio, SOUND_KEYS.BOSS2_PHASE);
      }
      if (
        z.shotgunTimer <= 0 &&
        dist2(z.x, z.y, p.x, p.y) < BOSS2_SHOTGUN_RANGE * BOSS2_SHOTGUN_RANGE
      ) {
        const pellets = BOSS2_SHOTGUN_PELLETS;
        const baseAng = angleBetween(z.x, z.y, p.x, p.y);
        for (let i = 0; i < pellets; i++) {
          const spread = rand(-BOSS2_SHOTGUN_SPREAD, BOSS2_SHOTGUN_SPREAD);
          state.enemyBullets.push({
            x: z.x,
            y: z.y,
            ang: baseAng + spread,
            life: 1.4,
            speed: ENEMY_BULLET_SPEED * 1.1,
            damageInstant: z.phase === "stage2" ? 42 : 32,
          });
        }
        z.shotgunTimer = BOSS2_SHOTGUN_INTERVAL * (z.phase === "stage2" ? 0.6 : 1);
      }
      speed = z.speed || ZOMBIE_BASE_SPEED;
    } else if (z.kind === "boss3") {
      z.machinegunTimer = (z.machinegunTimer ?? BOSS3_MACHINEGUN_INTERVAL) - dt;
      z.radialTimer = (z.radialTimer ?? BOSS3_RADIAL_INTERVAL) - dt;
      z.grenadeTimer = (z.grenadeTimer ?? BOSS3_GRENADE_INTERVAL) - dt;
      z.machinegunBurstCooldown = (z.machinegunBurstCooldown ?? 0) - dt;
      if (z.machinegunTimer <= 0) {
        z.machinegunBurstLeft = BOSS3_MACHINEGUN_BURST;
        z.machinegunBurstCooldown = 0;
        z.machinegunTimer = BOSS3_MACHINEGUN_INTERVAL;
      }
      if ((z.machinegunBurstLeft ?? 0) > 0 && z.machinegunBurstCooldown <= 0) {
        const ang = angleBetween(z.x, z.y, p.x, p.y);
        state.enemyBullets.push({
          x: z.x + Math.cos(ang) * (z.r * 0.6),
          y: z.y + Math.sin(ang) * (z.r * 0.6),
          ang,
          life: 1.2,
          speed: ENEMY_BULLET_SPEED * 1.35,
          damageInstant: 28,
        });
        z.machinegunBurstLeft -= 1;
        z.machinegunBurstCooldown = BOSS3_MACHINEGUN_RATE;
      }
      if (z.radialTimer <= 0) {
        const rays = 12;
        for (let i = 0; i < rays; i++) {
          const ang = (Math.PI * 2 * i) / rays;
          state.enemyBullets.push({
            x: z.x,
            y: z.y,
            ang,
            life: 1.6,
            speed: ENEMY_BULLET_SPEED * 0.9,
            damageInstant: 26,
          });
        }
        z.radialTimer = BOSS3_RADIAL_INTERVAL;
      }
      if (z.grenadeTimer <= 0) {
        const ang = angleBetween(z.x, z.y, p.x, p.y);
        const throwSpeed = GRENADE_THROW_SPEED * 0.9;
        state.grenades.push({
          x: z.x,
          y: z.y,
          vx: Math.cos(ang) * throwSpeed,
          vy: Math.sin(ang) * throwSpeed,
          timer: GRENADE_FUSE + 0.6,
          radius: GRENADE_EXPLOSION_RADIUS * 1.2,
          owner: "boss3",
        });
        z.grenadeTimer = BOSS3_GRENADE_INTERVAL;
      }
      const sinceDamage = state.time - (z.lastDamageTime ?? state.time);
      if (sinceDamage > BOSS3_REGEN_DELAY && z.hp < (z.maxHp ?? z.hp)) {
        z.hp = Math.min(z.maxHp ?? z.hp, z.hp + BOSS3_REGEN_RATE * dt);
      }
      let touchingWall = null;
      for (const wall of state.walls) {
        if (circleRectCollides(z.x, z.y, z.r + 2, wall)) {
          touchingWall = wall;
          break;
        }
      }
      if (touchingWall) {
        if (!z.breaking || z.breaking.wall !== touchingWall) {
          z.breaking = { wall: touchingWall, timer: 3 };
        } else {
          z.breaking.timer -= dt;
          if (z.breaking.timer <= 0) {
            state.walls = state.walls.filter((w) => w !== touchingWall);
            z.breaking = null;
            playAudio(audio, SOUND_KEYS.WALL_BREAK);
          }
        }
      } else if (z.breaking) {
        z.breaking = null;
      }
    }

    if (z.behavior === "charge") {
      z.chargeCD = (z.chargeCD ?? 2.5) - dt;
      if (z.state === "idle") {
        moveAng = angleBetween(z.x, z.y, target.x, target.y);
        if (z.chargeCD <= 0 && distToTarget > 180) {
          z.state = "windup";
          z.stateTimer = 0.45;
          z.chargeDir = moveAng;
        }
      } else if (z.state === "windup") {
        moveAng = z.chargeDir ?? moveAng;
        speed = (z.speed || ZOMBIE_BASE_SPEED) * 0.45;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          z.state = "charge";
          z.stateTimer = 0.6;
        }
      } else if (z.state === "charge") {
        moveAng = z.chargeDir ?? moveAng;
        speed = (z.speed || ZOMBIE_BASE_SPEED) * 2.6;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          z.state = "recover";
          z.stateTimer = 0.45;
          z.chargeCD = 2.5 + Math.random() * 2.5;
        }
      } else if (z.state === "recover") {
        moveAng = angleBetween(z.x, z.y, target.x, target.y);
        speed = (z.speed || ZOMBIE_BASE_SPEED) * 0.55;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          z.state = "idle";
        }
      }
    } else if (z.behavior === "leap") {
      z.leapCD = (z.leapCD ?? 1.4) - dt;
      if (z.state === "idle") {
        moveAng = angleBetween(z.x, z.y, target.x, target.y);
        if (z.leapCD <= 0 && distToTarget > 120) {
          z.state = "windup";
          z.stateTimer = 0.22;
          z.leapAng = moveAng;
          z.leapCD = 1.1 + Math.random() * 1.6;
        }
      } else if (z.state === "windup") {
        moveAng = z.leapAng ?? moveAng;
        speed = (z.speed || ZOMBIE_BASE_SPEED) * 0.25;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          z.state = "leaping";
          z.stateTimer = 0.32;
        }
      } else if (z.state === "leaping") {
        moveAng = z.leapAng ?? moveAng;
        speed = (z.speed || ZOMBIE_BASE_SPEED) * 3.1;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          z.state = "recover";
          z.stateTimer = 0.2;
        }
      } else if (z.state === "recover") {
        moveAng = angleBetween(z.x, z.y, target.x, target.y);
        speed = (z.speed || ZOMBIE_BASE_SPEED) * 0.6;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          z.state = "idle";
        }
      }
    }

    let bomberFearDir = null;
    if (z.kind === "bomber" && aliveCats.length) {
      let closestCat = null;
      let closestDist = Infinity;
      for (const cat of aliveCats) {
        const d = dist2(z.x, z.y, cat.x, cat.y);
        if (d < closestDist) {
          closestDist = d;
          closestCat = cat;
        }
      }
      if (closestCat) {
        const dist = Math.sqrt(closestDist);
        if (dist < 320) {
          bomberFearDir = Math.atan2(z.y - closestCat.y, z.x - closestCat.x);
          target = closestCat;
          targetType = "cat";
        }
      }
    }

    if (z.kind === "bomber" && z.mineTimer != null) {
      z.mineTimer -= dt;
      if (z.mineTimer <= 0) {
         state.bombs.push({
          x: z.x,
          y: z.y,
          r: 20,
          timer: BOMBER_COUNTDOWN,
          id: Math.random().toString(36).slice(2),
        });
        z.mineTimer = null;
      }
    }

    const prevX = z.x;
    const prevY = z.y;
    if (bomberFearDir != null) {
      moveAng = bomberFearDir;
    }

    let zx = clamp(z.x + Math.cos(moveAng) * speed * dt, 10, WORLD.w - 10);
    let zy = clamp(z.y + Math.sin(moveAng) * speed * dt, 10, WORLD.h - 10);

    if (!z.intangible) {
      let blocked = false;
      for (const w of state.walls) {
        if (circleRectCollides(zx, zy, z.r, w)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        const zx2 = clamp(z.x + Math.cos(moveAng) * speed * dt, 10, WORLD.w - 10);
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
          const zy2 = clamp(z.y + Math.sin(moveAng) * speed * dt, 10, WORLD.h - 10);
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
    }
    z.x = zx;
    z.y = zy;
    if (Math.abs(z.x - prevX) > 0.1) {
      z.facingDir = z.x - prevX < 0 ? "right" : "left";
    }

    let damage = 20;
    if (z.behavior === "charge" && z.state === "charge") damage = 42;
    else if (z.behavior === "leap" && z.state === "leaping") damage = 28;
    if (z.kind === "skeleton") damage = 18;
    else if (z.kind === "ghost") damage = 24;
    else if (z.kind === "fat") damage = 22;
    else if (z.kind === "small") damage = 16;
    else if (z.kind === "bomber") damage = 30;
    else if (z.kind === "boss" || z.kind === "boss1") damage = BOSS1_MELEE_DAMAGE;
    else if (z.kind === "boss2") damage = BOSS2_MELEE_DAMAGE;
    else if (z.kind === "boss3") damage = BOSS3_MELEE_DAMAGE;

    const applyContact = (entity, type) => {
      const range = z.kind && z.kind.startsWith("boss") ? BOSS_CONTACT_RANGE : z.r + entity.r + 2;
      if (dist2(entity.x, entity.y, z.x, z.y) < range * range) {
        if (type === "player" && (p.invulnerableTime ?? 0) > 0) return;
        entity.hp -= damage * dt;
        if (type === "player") {
          if (entity.hp <= 0) {
            entity.hp = 0;
            onDeath && onDeath();
          }
        } else if (entity.hp <= 0) {
          villagersToConvert.add(entity);
        }
      }
    };

    applyContact(p, "player");
    for (const villager of state.villagers) {
      applyContact(villager, "villager");
    }
    for (const cat of aliveCats) {
      const beforeHp = cat.hp;
      applyContact(cat, "cat");
      if (cat.hp <= 0 && beforeHp > 0) catsToCull.add(cat);
    }
    
    for (const b of state.bullets) {
      const br = b.radius ?? 3;
      if (dist2(b.x, b.y, z.x, z.y) < (z.r + br) ** 2) {
        z.hp -= b.damage ?? 24;
        b.life = 0;
        playAudio(audio, SOUND_KEYS.ENEMY_HIT);
        if (z.kind === "boss3") z.lastDamageTime = state.time;
      }
    }
  }

  // стрелки
  for (const w of state.whites) {
    const prevWX = w.x;
    w.age += dt;
    const angToP = angleBetween(w.x, w.y, p.x, p.y);
    const d2p = dist2(w.x, w.y, p.x, p.y);

    const baseSpeed = w.type === "witch" ? WHITE_BASE_SPEED * 0.75 : WHITE_BASE_SPEED;

    const tryStep = (ang) => {
      const sx = clamp(w.x + Math.cos(ang) * baseSpeed * dt, 10, WORLD.w - 10);
      const sy = clamp(w.y + Math.sin(ang) * baseSpeed * dt, 10, WORLD.h - 10);
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

    if (Math.abs(w.x - prevWX) > 0.05) {
      w.facingDir = w.x - prevWX < 0 ? "right" : "left";
    } else if (Math.cos(angToP) < 0) {
      w.facingDir = "right";
    } else {
      w.facingDir = "left";
    }
    
    for (const b of state.bullets) {
      const br = b.radius ?? 3;
      if (dist2(b.x, b.y, w.x, w.y) < (w.r + br) ** 2) {
        w.hp -= b.damage ?? 24;
        b.life = 0;
        playAudio(audio, SOUND_KEYS.ENEMY_HIT);
      }
    }

    w.shootCD -= dt;
    if (w.shootCD <= 0) {
      const ang = Math.atan2(p.y - w.y, p.x - w.x);
      state.enemyBullets.push({ x: w.x, y: w.y, ang, life: 3.5 });
      w.shootCD = w.type === "witch" ? 1.2 : 1.6;
      if (w.type === "witch") playAudio(audio, SOUND_KEYS.WITCH_SHOOT);
    }

    if (w.type === "witch") {
      w.summonCD -= dt;
      if (w.summonCD <= 0) {
        for (let i = 0; i < 3; i++) {
          const ang = (Math.PI * 2 * i) / 3 + rand(-0.4, 0.4);
          const dist = 34 + Math.random() * 32;
          const sx = clamp(w.x + Math.cos(ang) * dist, 12, WORLD.w - 12);
          const sy = clamp(w.y + Math.sin(ang) * dist, 12, WORLD.h - 12);
          let blocked = false;
          for (const wall of state.walls) {
            if (circleRectCollides(sx, sy, 12, wall)) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            state.zombies.push(makeZombie(sx, sy, "skeleton"));
          }
        }
        w.summonCD = WITCH_SUMMON_INTERVAL;
      }
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
      if (m.state === "countdown") {
        m.timer -= dt;
        if (m.timer <= 0) {
          state.explosions.push({ x: m.x, y: m.y, r: 0, life: 0.35 });
          state.zombies.forEach((z) => {
            if (dist2(m.x, m.y, z.x, z.y) < MINE_EXPLOSION_RADIUS ** 2) z.hp = 0;
          });
          state.whites.forEach((w) => {
            if (dist2(m.x, m.y, w.x, w.y) < MINE_EXPLOSION_RADIUS ** 2) w.hp = 0;
          });
          state.villagers.forEach((villager) => {
            if (dist2(m.x, m.y, villager.x, villager.y) < MINE_EXPLOSION_RADIUS ** 2)
              villagersToConvert.add(villager);
          });
          state.cats.forEach((cat) => {
            if (dist2(m.x, m.y, cat.x, cat.y) < MINE_EXPLOSION_RADIUS ** 2) cat.hp = 0;
          });
          if (dist2(m.x, m.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2 && (p.invulnerableTime ?? 0) <= 0) {
            p.hp = 0;
            onDeath && onDeath();
          }
          playAudio(audio, SOUND_KEYS.MINE_EXPLODE);
          continue;
        }
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
      if (!exploded && (p.invulnerableTime ?? 0) <= 0 && dist2(m.x, m.y, p.x, p.y) < (m.r + p.r) ** 2) {
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
        state.villagers.forEach((villager) => {
          if (dist2(m.x, m.y, villager.x, villager.y) < MINE_EXPLOSION_RADIUS ** 2)
            villagersToConvert.add(villager);
        });
         state.cats.forEach((cat) => {
          if (dist2(m.x, m.y, cat.x, cat.y) < MINE_EXPLOSION_RADIUS ** 2) cat.hp = 0;
        });
        if (dist2(m.x, m.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2 && (p.invulnerableTime ?? 0) <= 0) {
          p.hp = 0;
          onDeath && onDeath();
        }
        playAudio(audio, SOUND_KEYS.MINE_EXPLODE);
      } else {
        keep.push(m);
      }
        }
  state.mines = keep;
}

if (state.bombs.length) {
  const keepBombs = [];
  for (const bomb of state.bombs) {
    bomb.timer -= dt;
    if (bomb.timer <= 0) {
      state.explosions.push({ x: bomb.x, y: bomb.y, r: 0, life: 0.35 });
      state.zombies.forEach((z) => {
        if (dist2(bomb.x, bomb.y, z.x, z.y) < MINE_EXPLOSION_RADIUS ** 2) z.hp = 0;
      });
      state.whites.forEach((w) => {
        if (dist2(bomb.x, bomb.y, w.x, w.y) < MINE_EXPLOSION_RADIUS ** 2) w.hp = 0;
      });
      state.villagers.forEach((villager) => {
        if (dist2(bomb.x, bomb.y, villager.x, villager.y) < MINE_EXPLOSION_RADIUS ** 2)
          villagersToConvert.add(villager);
      });
      state.cats.forEach((cat) => {
        if (dist2(bomb.x, bomb.y, cat.x, cat.y) < MINE_EXPLOSION_RADIUS ** 2) {
          cat.hp = 0;
          catsToCull.add(cat);
        }
      });
      if (dist2(bomb.x, bomb.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2 && (p.invulnerableTime ?? 0) <= 0) {
        p.hp = 0;
        onDeath && onDeath();
      }
      playAudio(audio, SOUND_KEYS.MINE_EXPLODE);
    } else {
      keepBombs.push(bomb);
    }
  }
state.bombs = keepBombs;
}

if (state.grenades.length) {
  const keepGrenades = [];
  for (const g of state.grenades) {
    g.timer -= dt;
    g.vx *= 0.92;
    g.vy *= 0.92;
    g.x = clamp(g.x + g.vx * dt, 12, WORLD.w - 12);
    g.y = clamp(g.y + g.vy * dt, 12, WORLD.h - 12);
    let collided = false;
    for (const wall of state.walls) {
      if (circleRectCollides(g.x, g.y, 6, wall)) {
        collided = true;
        break;
      }
    }
    if (collided) {
      g.vx = 0;
      g.vy = 0;
    }
    if (g.timer <= 0) {
      state.explosions.push({ x: g.x, y: g.y, r: 0, life: 0.25 });
      const radius2 = (g.radius ?? GRENADE_EXPLOSION_RADIUS) ** 2;
      state.zombies.forEach((z) => {
        if (dist2(g.x, g.y, z.x, z.y) < radius2) {
          if (z.kind && z.kind.startsWith("boss")) {
            const bossDamage = z.kind === "boss3" ? 160 : 120;
            z.hp -= bossDamage;
          } else {
            z.hp = 0;
          }
        }
      });
      state.whites.forEach((w) => {
        if (dist2(g.x, g.y, w.x, w.y) < radius2) w.hp = 0;
      });
      state.villagers.forEach((villager) => {
        if (dist2(g.x, g.y, villager.x, villager.y) < radius2) villagersToConvert.add(villager);
      });
      state.cats.forEach((cat) => {
        if (dist2(g.x, g.y, cat.x, cat.y) < radius2) {
          cat.hp = 0;
          catsToCull.add(cat);
        }
      });
      if (dist2(g.x, g.y, p.x, p.y) < radius2 && (p.invulnerableTime ?? 0) <= 0) {
        p.hp -= PLAYER_MAX_HP * 0.4;
        if (p.hp <= 0) {
          p.hp = 0;
          onDeath && onDeath();
        }
      }
      playAudio(audio, SOUND_KEYS.MINE_EXPLODE);
    } else {
      keepGrenades.push(g);
    }
  }
  state.grenades = keepGrenades;
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

  if (state.slashes.length) {
    const keepSlashes = [];
    for (const slash of state.slashes) {
      slash.life -= dt;
      if (slash.life > 0) keepSlashes.push(slash);
    }
    state.slashes = keepSlashes;
  }

  // вражеские пули
  for (const eb of state.enemyBullets) {
    const bulletSpeed = eb.speed ?? ENEMY_BULLET_SPEED;
    eb.x += Math.cos(eb.ang) * bulletSpeed * dt;
    eb.y += Math.sin(eb.ang) * bulletSpeed * dt;
    eb.life -= dt;
    for (const w of state.walls) {
      if (circleRectCollides(eb.x, eb.y, 4, w)) {
        eb.life = 0;
        break;
      }
    }
    if (eb.life > 0 && dist2(eb.x, eb.y, p.x, p.y) < (p.r + 3) ** 2) {
      if ((p.invulnerableTime ?? 0) <= 0) {
        if (eb.damageInstant != null) p.hp -= eb.damageInstant;
        else p.hp -= 36 * dt * 3;
        if (p.hp <= 0) {
          p.hp = 0;
          onDeath && onDeath();
        }
      }
      eb.life = 0;
    }
    if (eb.life > 0) {
      for (const villager of state.villagers) {
        if (dist2(eb.x, eb.y, villager.x, villager.y) < (villager.r + 3) ** 2) {
          villager.hp -= eb.damageInstant != null ? eb.damageInstant : 32;
          eb.life = 0;
          if (villager.hp <= 0) villagersToConvert.add(villager);
          break;
        }
      }
    }
    if (eb.life > 0) {
      for (const cat of state.cats) {
        if (dist2(eb.x, eb.y, cat.x, cat.y) < (cat.r + 3) ** 2) {
          const damage = eb.damageInstant != null ? eb.damageInstant : 32;
          cat.hp = (cat.hp ?? CAT_MAX_HP) - damage;
          if (cat.hp <= 0) catsToCull.add(cat);
          eb.life = 0;
          break;
        }
      }
    }
  }
  state.enemyBullets = state.enemyBullets.filter((b) => b.life > 0);

  if (villagersToConvert.size) {
    const keepVillagers = [];
    for (const villager of state.villagers) {
      if (villagersToConvert.has(villager)) {
        const roll = Math.random();
        let kind = "normal";
        if (roll < 0.33) kind = "ghost";
        else if (roll < 0.66) kind = "skeleton";
        state.zombies.push(makeZombie(villager.x, villager.y, kind));
      } else {
        keepVillagers.push(villager);
      }
    }
    state.villagers = keepVillagers;
  }

  // очистка
  const newZ = [];
  let zombieKills = 0;
  for (const z of state.zombies) {
    if (z.hp <= 0) {
      zombieKills++;
      grantXp(z.xp ?? XP_PER_KILL);
      const drop = Math.random();
      const dropX = z.x + rand(-60, 60);
      const dropY = z.y + rand(-60, 60);
      if (drop < 0.26) state.items.push(makeItem(dropX, dropY, "ammo"));
      else if (drop < 0.33) state.items.push(makeItem(dropX, dropY, "medkit"));
      else if (drop < 0.37) state.items.push(makeItem(dropX, dropY, "mine"));
      else if (drop < 0.41) state.items.push(makeItem(dropX, dropY, "grenade"));
      else if (drop < 0.45) state.items.push(makeItem(dropX, dropY, "shield"));
      playAudio(audio, SOUND_KEYS.ENEMY_DIE);
      if (z.kind && z.kind.startsWith("boss")) {
        if (z.kind === "boss" || z.kind === "boss1") {
          bossFlow.pendingBoss2 = BOSS2_SPAWN_DELAY;
          bossFlow.spawnRateMultiplier = 1;
          bossFlow.stopSpawns = false;
          bossFlow.lastBossKind = "boss1";
        } else if (z.kind === "boss2") {
          bossFlow.pendingBoss2 = null;
          bossFlow.spawnRateMultiplier = 1;
          bossFlow.stopSpawns = true;
          bossFlow.waitingForClear = true;
          bossFlow.villagersWaveSpawned = false;
          bossFlow.pendingBoss3 = null;
          bossFlow.rescueSoundTimer = null;
          bossFlow.lastBossKind = "boss2";
        } else if (z.kind === "boss3") {
          bossFlow.pendingBoss3 = null;
          bossFlow.stopSpawns = true;
          bossFlow.victoryPending = true;
          bossFlow.lastBossKind = "boss3";
        }
      }
      continue;
    }
    if (!(z.kind && z.kind.startsWith("boss")) && z.age >= ZOMBIE_MAX_AGE) continue;
    newZ.push(z);
  }
  state.zombies = newZ;
  if (zombieKills > 0) state.kills += zombieKills;

  if (bossFlow.waitingForClear && !bossFlow.villagersWaveSpawned) {
    const hostilesRemaining = state.zombies.length + state.whites.length;
    if (hostilesRemaining === 0) {
      bossFlow.waitingForClear = false;
      bossFlow.villagersWaveSpawned = true;
      const cx = WORLD.w / 2;
      const cy = WORLD.h / 2;
      for (let i = 0; i < BOSS3_VILLAGER_WAVE; i++) {
        const ang = (Math.PI * 2 * i) / BOSS3_VILLAGER_WAVE;
        const dist = 140 + Math.random() * 120;
        const vx = clamp(cx + Math.cos(ang) * dist, WALL_THICKNESS + 24, WORLD.w - WALL_THICKNESS - 24);
        const vy = clamp(cy + Math.sin(ang) * dist, WALL_THICKNESS + 24, WORLD.h - WALL_THICKNESS - 24);
        state.villagers.push(makeVillager(vx, vy));
      }
      bossFlow.rescueSoundTimer = BOSS3_SPAWN_DELAY_AFTER_RESCUE;
      bossFlow.pendingBoss3 = null;
      queueFlash && queueFlash("Жители спасены! Подготовься к финалу!");
      playAudio(audio, SOUND_KEYS.RESCUE_SPAWN);
    }
  }

  const keepWhites = [];
  let rangedKills = 0;
  for (const w of state.whites) {
    const maxAge = w.type === "witch" ? WITCH_MAX_AGE : WHITE_MAX_AGE;
    if (w.hp <= 0) {
      rangedKills++;
      grantXp(w.xp ?? XP_PER_KILL + 6);
      const drop = Math.random();
      if (drop < 0.22) state.items.push(makeItem(w.x + rand(-50, 50), w.y + rand(-50, 50), "ammo"));
      else if (drop < 0.27) state.items.push(makeItem(w.x + rand(-40, 40), w.y + rand(-40, 40), "medkit"));
      else if (drop < 0.3) state.items.push(makeItem(w.x + rand(-40, 40), w.y + rand(-40, 40), "grenade"));
      else if (drop < 0.33) state.items.push(makeItem(w.x + rand(-40, 40), w.y + rand(-40, 40), "shield"));
      playAudio(audio, SOUND_KEYS.ENEMY_DIE);
      continue;
    }
    if (w.age >= maxAge) continue;
    keepWhites.push(w);
  }
  state.whites = keepWhites;
  if (rangedKills > 0) state.kills += rangedKills;

  if (catsToCull.size) {
    state.cats = state.cats.filter((cat) => !catsToCull.has(cat));
  }

  if (state.zombies.length > ZOMBIE_HARD_CAP) state.zombies.length = ZOMBIE_HARD_CAP;
  if (state.whites.length > WHITE_HARD_CAP) state.whites.length = WHITE_HARD_CAP;

  if (bossFlow.victoryPending && !bossFlow.victoryAnnounced) {
    bossFlow.victoryAnnounced = true;
    onVictory && onVictory({ kills: state.kills, duration: state.time });
  }
}
