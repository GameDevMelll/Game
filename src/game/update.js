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
  BOSS_SPAWN_AT,
  BOSS_ATTACK_RANGE,
  BOSS_ATTACK_DAMAGE,
} from "./constants.js";
import { SOUND_KEYS } from "./assets.js";
import { clamp, rand, dist2, angleBetween } from "./utils.js";
import {
  makeZombie,
  makeItem,
  makeWhite,
  makeBullet,
  makeVillager,
  makeBoss,
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
    explosions: [],
    slashes: [],
    villagers: [],
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
    kills: 0,
    dayTime: 0,
    time: 0,
    bossSpawned: false,
    assets: assets || { textures: {}, sounds: {} },
  };

  // стартовые предметы вокруг игрока
  const cx = player.x;
  const cy = player.y;
  const startingItems = [
    makeItem(cx + 120, cy + 20, "bat"),
    makeItem(cx - 140, cy - 20, "pistol"),
    makeItem(cx + 40, cy - 130, "ammo"),
    makeItem(cx + 10, cy + 180, "mine"),
    makeItem(cx - 60, cy + 130, "medkit"),
    makeItem(cx + 180, cy - 40, "shotgun"),
    makeItem(cx - 200, cy + 40, "glaive"),
  ];
  state.items.push(...startingItems);

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
  if (p.attackCD > 0) return;
  if (!p.weapon) return;

  if (p.weapon === "bat") {
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
    p.attackCD = 0.5;
    p.swing = 0.28;
    if (hitSomething) playAudio(audio, SOUND_KEYS.ENEMY_HIT);
    playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    return;
  }

  if (p.weapon === "glaive") {
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
    p.attackCD = 0.72;
    p.swing = 0.32;
    if (!hit) queueFlash && queueFlash("Мимо");
    if (hit) playAudio(audio, SOUND_KEYS.ENEMY_HIT);
    playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    return;
  }

  if (p.weapon === "pistol") {
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

  if (p.weapon === "shotgun") {
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
      playAudio(audio, SOUND_KEYS.PLAYER_ATTACK);
    } else {
      queueFlash && queueFlash("Нет мин");
      p.attackCD = 0.15;
    }
  }
}

export function tryPickup(state, queueFlash, audio) {
  const p = state.player;
  for (const it of state.items) {
    if (dist2(p.x, p.y, it.x, it.y) < (p.r + PICKUP_RADIUS) ** 2) {
      if (["bat", "pistol", "mine", "shotgun", "glaive"].includes(it.type) && !p.weapons.includes(it.type)) {
        p.weapons.push(it.type);
        if (!p.weapon) p.weapon = it.type;
      }
      if (it.type === "ammo") p.ammo += 12;
      if (it.type === "medkit") {
        p.medkits = (p.medkits || 0) + 1;
      }
      if (it.type === "mine") {
        p.mines = (p.mines || 0) + 1;
        p.weapon = "mine";
      }
      if (it.type === "shotgun") {
        p.ammo += 9;
        p.weapon = "shotgun";
      }
      if (it.type === "glaive") {
        p.weapon = "glaive";
      }
      if (["bat", "pistol"].includes(it.type)) p.weapon = it.type;
      state.items = state.items.filter((i) => i.id !== it.id);
      if (queueFlash) {
        if (it.type === "medkit") queueFlash(`Аптечка сохранена (${p.medkits})`);
        else queueFlash(`Подобрано: ${it.type}`);
      }
      if (it.type === "medkit") playAudio(audio, SOUND_KEYS.MEDKIT);
      else playAudio(audio, SOUND_KEYS.PICKUP);
      break;
    }
  }
}

export function useMedkit(state, queueFlash, audio) {
  const p = state.player;
  if (!p.medkits || p.medkits <= 0) {
    queueFlash && queueFlash("Аптечек нет");
    return false;
  }
  if (p.hp >= p.maxHp - 0.1) {
    queueFlash && queueFlash("Полное здоровье");
    return false;
  }
  p.medkits -= 1;
  p.hp = clamp(p.hp + PLAYER_MEDKIT_HEAL, 0, p.maxHp);
  queueFlash && queueFlash(`Аптечек осталось: ${p.medkits}`);
  playAudio(audio, SOUND_KEYS.MEDKIT);
  return true;
}

export function update(state, dt, { canvas, onDeath, queueFlash, audio }) {
  const p = state.player;
  if (!p.maxHp) p.maxHp = PLAYER_MAX_HP;
  p.maxHp = Math.max(p.maxHp, PLAYER_MAX_HP);
  p.hp = clamp(p.hp, 0, p.maxHp);
  state.time += dt;
  state.dayTime += dt;
  if (state.dayTime >= DAY_NIGHT_CYCLE) state.dayTime -= DAY_NIGHT_CYCLE;

  const rareFactor = clamp(state.time / 240, 0, 1);

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
  if (state.spawn.timer <= 0 && state.zombies.length < ZOMBIE_MAX_ON_FIELD) {
    state.spawn.interval = Math.max(
      state.spawn.min,
      state.spawn.interval * (0.955 - rareFactor * 0.06)
    );
    state.spawn.timer = state.spawn.interval * rand(0.45, 1.05);
    const spot = getFreeSpawnNear(p.x, p.y, state.walls);
    const kind = pickZombieKindForSpawn(rareFactor);
    state.zombies.push(makeZombie(spot.x, spot.y, kind));
  }

  if (!state.bossSpawned && state.time >= BOSS_SPAWN_AT) {
    const bossSpot = getFreeSpawnNear(p.x, p.y, state.walls, 24);
    state.zombies.push(makeBoss(bossSpot.x, bossSpot.y));
    state.bossSpawned = true;
    queueFlash && queueFlash("Орк-босс ворвался в бой!");
  }

  // спавн стрелков
  if (state.time >= WHITE_START_AT) {
    state.whiteSpawn.min = Math.max(0.45, WHITE_SPAWN_MIN - state.time / 260);
    state.whiteSpawn.timer -= dt;
    if (state.whiteSpawn.timer <= 0) {
      state.whiteSpawn.interval = Math.max(
        state.whiteSpawn.min,
        state.whiteSpawn.interval * (0.965 - rareFactor * 0.05)
      );
      state.whiteSpawn.timer = state.whiteSpawn.interval * rand(0.6, 1.1);
      const spot = getFreeSpawnNear(p.x, p.y, state.walls);
      const witchChance = Math.min(0.08, 0.02 + state.time / 2400);
      const type = Math.random() < witchChance ? "witch" : "white";
      state.whites.push(makeWhite(spot.x, spot.y, type));
    }
  }

  // пополнение жителей
  state.villagerSpawn.timer -= dt;
  if (state.villagerSpawn.timer <= 0 && state.villagers.length < INITIAL_VILLAGERS + 4) {
    const spot = getFreeSpawnNear(p.x, p.y, state.walls, 20);
    state.villagers.push(makeVillager(spot.x, spot.y));
    state.villagerSpawn.timer = state.villagerSpawn.interval + rand(6, 14);
  }

  // движение жителей
  for (const v of state.villagers) {
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
  }

  // движение зомби и приоритет целей
  const villagersToConvert = new Set();
  for (const z of state.zombies) {
    z.age += dt;
    let target = p;
    let targetType = "player";
    let bestDist2 = dist2(z.x, z.y, p.x, p.y);
    for (const villager of state.villagers) {
      const d = dist2(z.x, z.y, villager.x, villager.y);
      if (d < bestDist2) {
        bestDist2 = d;
        target = villager;
        targetType = "villager";
      }
    }

    const distToTarget = Math.sqrt(bestDist2);
    let moveAng = angleBetween(z.x, z.y, target.x, target.y);
    let speed = z.speed || ZOMBIE_BASE_SPEED;

    if (!z.state) z.state = "idle";

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

    if (z.kind === "bomber" && z.mineTimer != null) {
      z.mineTimer -= dt;
      if (z.mineTimer <= 0) {
        state.mines.push({
          x: z.x,
          y: z.y,
          r: 16,
          state: "countdown",
          timer: BOMBER_COUNTDOWN,
          id: Math.random().toString(36).slice(2),
        });
        z.mineTimer = null;
      }
    }

    const prevX = z.x;
    const prevY = z.y;
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

    let damage = 20;
    if (z.behavior === "charge" && z.state === "charge") damage = 42;
    else if (z.behavior === "leap" && z.state === "leaping") damage = 28;
    if (z.kind === "skeleton") damage = 18;
    else if (z.kind === "ghost") damage = 24;
    else if (z.kind === "fat") damage = 22;
    else if (z.kind === "small") damage = 16;
    else if (z.kind === "bomber") damage = 30;
    else if (z.kind === "boss") damage = BOSS_ATTACK_DAMAGE * 2.2;

    const applyContact = (entity, type) => {
      const range = z.kind === "boss" ? BOSS_ATTACK_RANGE : z.r + entity.r + 2;
      if (dist2(entity.x, entity.y, z.x, z.y) < range * range) {
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

    for (const b of state.bullets) {
      const br = b.radius ?? 3;
      if (dist2(b.x, b.y, z.x, z.y) < (z.r + br) ** 2) {
        z.hp -= b.damage ?? 24;
        b.life = 0;
        playAudio(audio, SOUND_KEYS.ENEMY_HIT);
      }
    }
  }

  // стрелки
  for (const w of state.whites) {
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
          if (dist2(m.x, m.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2) {
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
        state.villagers.forEach((villager) => {
          if (dist2(m.x, m.y, villager.x, villager.y) < MINE_EXPLOSION_RADIUS ** 2)
            villagersToConvert.add(villager);
        });
        if (dist2(m.x, m.y, p.x, p.y) < MINE_EXPLOSION_RADIUS ** 2) {
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
    if (eb.life > 0) {
      for (const villager of state.villagers) {
        if (dist2(eb.x, eb.y, villager.x, villager.y) < (villager.r + 3) ** 2) {
          villager.hp -= 32;
          eb.life = 0;
          if (villager.hp <= 0) villagersToConvert.add(villager);
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
      if (drop < 0.24) state.items.push(makeItem(dropX, dropY, "ammo"));
      else if (drop < 0.3) state.items.push(makeItem(dropX, dropY, "medkit"));
      else if (drop < 0.312) state.items.push(makeItem(dropX, dropY, "mine"));
      else if (drop < 0.322) state.items.push(makeItem(dropX, dropY, "shotgun"));
      else if (drop < 0.332) state.items.push(makeItem(dropX, dropY, "glaive"));
      playAudio(audio, SOUND_KEYS.ENEMY_DIE);
      continue;
    }
    if (z.kind !== "boss" && z.age >= ZOMBIE_MAX_AGE) continue;
    newZ.push(z);
  }
  state.zombies = newZ;
  if (zombieKills > 0) state.kills += zombieKills;

  const keepWhites = [];
  let rangedKills = 0;
  for (const w of state.whites) {
    const maxAge = w.type === "witch" ? WITCH_MAX_AGE : WHITE_MAX_AGE;
    if (w.hp <= 0) {
      rangedKills++;
      grantXp(w.xp ?? XP_PER_KILL + 6);
      const drop = Math.random();
      if (drop < 0.18) state.items.push(makeItem(w.x + rand(-50, 50), w.y + rand(-50, 50), "ammo"));
      else if (drop < 0.22) state.items.push(makeItem(w.x + rand(-40, 40), w.y + rand(-40, 40), "medkit"));
      playAudio(audio, SOUND_KEYS.ENEMY_DIE);
      continue;
    }
    if (w.age >= maxAge) continue;
    keepWhites.push(w);
  }
  state.whites = keepWhites;
  if (rangedKills > 0) state.kills += rangedKills;

  if (state.zombies.length > ZOMBIE_HARD_CAP) state.zombies.length = ZOMBIE_HARD_CAP;
  if (state.whites.length > WHITE_HARD_CAP) state.whites.length = WHITE_HARD_CAP;
}
