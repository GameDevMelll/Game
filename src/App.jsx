import React, { useEffect, useRef, useState } from "react";

// ========================= helpers =========================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};
const angleBetween = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

// ========================= constants =========================
const WORLD = { w: 2400, h: 1800 };
const PLAYER_SPEED = 230;
const PLAYER_DIAM = 34;
const PLAYER_MAX_HP = 100;
const MELEE_RANGE = 55;
const MELEE_DAMAGE = 25;
const BULLET_SPEED = 540;
const PICKUP_RADIUS = 48;

const ZOMBIE_BASE_SPEED = 140;
const ZOMBIE_SPAWN_EVERY = 2.6;
const ZOMBIE_MAX_ON_FIELD = 35;
const ZOMBIE_MAX_AGE = 15;
const ZOMBIE_HARD_CAP = 50;

const MAZE_PASSAGE = PLAYER_DIAM * 2;
const WALL_THICKNESS = 42;

// белые стрелки
const WHITE_START_AT = 30;
const WHITE_SPAWN_EVERY = 4.0;
const WHITE_SPAWN_MIN = 1.0;
const WHITE_BASE_SPEED = 100;
const WHITE_MAX_AGE = 20;
const WHITE_HARD_CAP = 20;
const ENEMY_BULLET_SPEED = 380;

// мины
const MINE_EXPLOSION_RADIUS = 128; // увеличили радиус в 2 раза

// ========================= maze / walls =========================
function makeWalls() {
  const walls = [];
  const corridor = MAZE_PASSAGE;
  const cellSize = corridor + WALL_THICKNESS;
  const offsetX = 140;
  const offsetY = 120;
  const cols = Math.floor((WORLD.w - offsetX * 2) / cellSize);
  const rows = Math.floor((WORLD.h - offsetY * 2) / cellSize);
  const C = Math.max(3, cols);
  const R = Math.max(3, rows);

  // DFS-лабиринт по сетке
  const cells = [];
  for (let y = 0; y < R; y++) {
    const row = [];
    for (let x = 0; x < C; x++) {
      row.push({ x, y, visited: false, n: true, e: true, s: true, w: true });
    }
    cells.push(row);
  }
  const inB = (x, y) => x >= 0 && y >= 0 && x < C && y < R;
  const stack = [];
  const startX = Math.floor(C / 2);
  const startY = Math.floor(R / 2);
  let cur = cells[startY][startX];
  cur.visited = true;
  stack.push(cur);
  while (stack.length) {
    const cell = stack[stack.length - 1];
    const { x, y } = cell;
    const nbs = [];
    if (inB(x, y - 1) && !cells[y - 1][x].visited) nbs.push({ dir: "n", nx: x, ny: y - 1 });
    if (inB(x + 1, y) && !cells[y][x + 1].visited) nbs.push({ dir: "e", nx: x + 1, ny: y });
    if (inB(x, y + 1) && !cells[y + 1][x].visited) nbs.push({ dir: "s", nx: x, ny: y + 1 });
    if (inB(x - 1, y) && !cells[y][x - 1].visited) nbs.push({ dir: "w", nx: x - 1, ny: y });
    if (!nbs.length) {
      stack.pop();
      continue;
    }
    const pick = nbs[Math.floor(Math.random() * nbs.length)];
    const nxt = cells[pick.ny][pick.nx];
    if (pick.dir === "n") { cell.n = false; nxt.s = false; }
    else if (pick.dir === "e") { cell.e = false; nxt.w = false; }
    else if (pick.dir === "s") { cell.s = false; nxt.n = false; }
    else if (pick.dir === "w") { cell.w = false; nxt.e = false; }
    nxt.visited = true;
    stack.push(nxt);
  }

  // внешняя рамка лабиринта
  walls.push({ x: offsetX, y: offsetY, w: WORLD.w - offsetX * 2, h: WALL_THICKNESS });
  walls.push({ x: offsetX, y: WORLD.h - offsetY - 80, w: WORLD.w - offsetX * 2, h: WALL_THICKNESS });
  walls.push({ x: offsetX, y: offsetY, w: WALL_THICKNESS, h: WORLD.h - offsetY * 2 - 80 });
  walls.push({ x: WORLD.w - offsetX - WALL_THICKNESS, y: offsetY, w: WALL_THICKNESS, h: WORLD.h - offsetY * 2 - 80 });

  // длинные горизонтальные стены
  for (let y = 0; y < R; y++) {
    let runStart = null;
    for (let x = 0; x < C; x++) {
      const cell = cells[y][x];
      const hasN = cell.n;
      if (hasN && runStart === null) runStart = x;
      const endOfRow = x === C - 1;
      if ((!hasN || endOfRow) && runStart !== null) {
        const startXPix = offsetX + runStart * cellSize;
        const endXPix = offsetX + (endOfRow && hasN ? (x + 1) : x) * cellSize;
        walls.push({ x: startXPix, y: offsetY + y * cellSize, w: endXPix - startXPix, h: WALL_THICKNESS });
        runStart = null;
      }
    }
  }
  // длинные вертикальные стены
  for (let x = 0; x < C; x++) {
    let runStart = null;
    for (let y = 0; y < R; y++) {
      const cell = cells[y][x];
      const hasW = cell.w;
      if (hasW && runStart === null) runStart = y;
      const endOfCol = y === R - 1;
      if ((!hasW || endOfCol) && runStart !== null) {
        const startYPix = offsetY + runStart * cellSize;
        const endYPix = offsetY + (endOfCol && hasW ? (y + 1) : y) * cellSize;
        walls.push({ x: offsetX + x * cellSize, y: startYPix, w: WALL_THICKNESS, h: endYPix - startYPix });
        runStart = null;
      }
    }
  }

  // вырезаем центр под игрока
  return walls.filter((w) => {
    const cx = clamp(WORLD.w / 2, w.x, w.x + w.w);
    const cy = clamp(WORLD.h / 2, w.y, w.y + w.h);
    const dx = cx - WORLD.w / 2;
    const dy = cy - WORLD.h / 2;
    return dx * dx + dy * dy > 220 * 220;
  });
}

// ========================= entities =========================
const makePlayer = () => ({
  x: WORLD.w / 2,
  y: WORLD.h / 2,
  r: 17,
  hp: PLAYER_MAX_HP,
  facing: 0,
  weapon: "fists",
  weapons: ["fists"],
  ammo: 0,
  attackCD: 0,
  swing: 0,
  mines: 0,
});

const makeZombie = (x, y) => ({ x, y, r: 16, hp: 34, age: 0 });
const makeBullet = (x, y, ang) => ({ x, y, ang, life: 1.2 });
const makeItem = (x, y, type) => ({ x, y, r: 12, type, id: Math.random().toString(36).slice(2) });
const makeWhite = (x, y) => ({ x, y, r: 16, hp: 28, age: 0, shootCD: 1.6 });

// ========================= component =========================
export default function Game() {
  const canvasRef = useRef(null);
  const playerRef = useRef(makePlayer());
  const zombiesRef = useRef([]);
  const bulletsRef = useRef([]);
  const itemsRef = useRef([]);
  const keysRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const spawnRef = useRef({ timer: 1.5, interval: ZOMBIE_SPAWN_EVERY, min: 0.4 });
  const whiteSpawnRef = useRef({ timer: WHITE_START_AT, interval: WHITE_SPAWN_EVERY, min: WHITE_SPAWN_MIN });
  const whitesRef = useRef([]);
  const enemyBulletsRef = useRef([]);
  const minesRef = useRef([]);
  const explosionsRef = useRef([]);
  const wallsRef = useRef(makeWalls());
  const killsRef = useRef(0);
  const timeRef = useRef(0);
  const [running, setRunning] = useState(true);
  const [flash, setFlash] = useState("");

  const queueFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 1100);
  };

  // ===== input =====
  useEffect(() => {
    const keyHandler = (e) => {
      keysRef.current[e.code] = e.type === "keydown";
      const p = playerRef.current;
      if (!running && e.type === "keydown" && e.code === "KeyR") {
        restart();
        return;
      }
      if (e.type === "keydown" && e.code === "KeyQ" && running) {
        if (p.weapons.length > 1) {
          const idx = p.weapons.indexOf(p.weapon);
          p.weapon = p.weapons[(idx + 1) % p.weapons.length];
          queueFlash(`Выбрано оружие: ${p.weapon}`);
        }
      }
    };
    const mouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const mouseDown = () => (mouseRef.current.down = true);
    const mouseUp = () => (mouseRef.current.down = false);

    window.addEventListener("keydown", keyHandler);
    window.addEventListener("keyup", keyHandler);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("keyup", keyHandler);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [running]);

  // ===== init =====
  useEffect(() => {
    for (let i = 0; i < 6; i++) {
      zombiesRef.current.push(makeZombie(rand(400, WORLD.w - 400), rand(260, WORLD.h - 260)));
    }
    itemsRef.current.push(makeItem(WORLD.w / 2 + 120, WORLD.h / 2 + 20, "bat"));
    itemsRef.current.push(makeItem(WORLD.w / 2 - 140, WORLD.h / 2 - 20, "pistol"));
    itemsRef.current.push(makeItem(WORLD.w / 2 + 40, WORLD.h / 2 - 130, "ammo"));
    itemsRef.current.push(makeItem(WORLD.w / 2 + 10, WORLD.h / 2 + 180, "mine"));
    itemsRef.current.push(makeItem(WORLD.w / 2 - 60, WORLD.h / 2 + 130, "medkit"));
  }, []);

  // ===== loop =====
  useEffect(() => {
    let frame;
    let last = 0;
    const loop = (t) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        frame = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      if (running) update(dt);
      draw(ctx, running);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  // ===== restart =====
  function restart() {
    playerRef.current = makePlayer();
    zombiesRef.current = [];
    bulletsRef.current = [];
    itemsRef.current = [];
    minesRef.current = [];
    explosionsRef.current = [];
    spawnRef.current = { timer: 1.5, interval: ZOMBIE_SPAWN_EVERY, min: 0.4 };
    whiteSpawnRef.current = { timer: WHITE_START_AT, interval: WHITE_SPAWN_EVERY, min: WHITE_SPAWN_MIN };
    whitesRef.current = [];
    enemyBulletsRef.current = [];
    wallsRef.current = makeWalls();
    killsRef.current = 0;
    timeRef.current = 0;
    for (let i = 0; i < 6; i++) {
      zombiesRef.current.push(makeZombie(rand(400, WORLD.w - 400), rand(260, WORLD.h - 260)));
    }
    itemsRef.current.push(makeItem(WORLD.w / 2 + 120, WORLD.h / 2 + 20, "bat"));
    itemsRef.current.push(makeItem(WORLD.w / 2 - 140, WORLD.h / 2 - 20, "pistol"));
    itemsRef.current.push(makeItem(WORLD.w / 2 + 40, WORLD.h / 2 - 130, "ammo"));
    itemsRef.current.push(makeItem(WORLD.w / 2 + 10, WORLD.h / 2 + 180, "mine"));
    itemsRef.current.push(makeItem(WORLD.w / 2 - 60, WORLD.h / 2 + 130, "medkit"));
    setRunning(true);
    setFlash("");
  }

  // ===== actions =====
  function attack(p) {
    if (p.attackCD > 0) return;
    // melee
    if (["fists", "bat"].includes(p.weapon)) {
      for (const z of zombiesRef.current) {
        if (dist2(p.x, p.y, z.x, z.y) < (p.r + MELEE_RANGE) ** 2) {
          z.hp -= p.weapon === "bat" ? MELEE_DAMAGE * 1.8 : MELEE_DAMAGE;
        }
      }
      for (const w of whitesRef.current) {
        if (dist2(p.x, p.y, w.x, w.y) < (p.r + MELEE_RANGE) ** 2) {
          w.hp -= p.weapon === "bat" ? MELEE_DAMAGE * 1.5 : MELEE_DAMAGE * 0.7;
        }
      }
      p.attackCD = p.weapon === "bat" ? 0.5 : 0.35;
      p.swing = p.weapon === "bat" ? 0.28 : 0.14;
      return;
    }
    // pistol
    if (p.weapon === "pistol") {
      if (p.ammo > 0) {
        bulletsRef.current.push(makeBullet(p.x, p.y, p.facing));
        p.ammo -= 1;
        p.attackCD = 0.22;
      } else {
        queueFlash("Нет патронов");
        p.attackCD = 0.15;
      }
      return;
    }
    // mine
    if (p.weapon === "mine") {
      if (p.mines > 0) {
        minesRef.current.push({ x: p.x, y: p.y, r: 14, state: "arming", timer: 3, id: Math.random().toString(36).slice(2) });
        p.mines -= 1;
        p.attackCD = 0.3;
        queueFlash("Мина установлена (3с до активации)");
        if (p.mines <= 0) {
          if (p.weapons.includes("pistol")) p.weapon = "pistol";
          else if (p.weapons.includes("bat")) p.weapon = "bat";
          else p.weapon = "fists";
        }
      } else {
        queueFlash("Нет мин");
        p.attackCD = 0.15;
      }
    }
  }

  function tryPickup(p) {
    for (const it of itemsRef.current) {
      if (dist2(p.x, p.y, it.x, it.y) < (p.r + PICKUP_RADIUS) ** 2) {
        if (["bat", "pistol", "mine"].includes(it.type) && !p.weapons.includes(it.type)) {
          p.weapons.push(it.type);
        }
        if (it.type === "ammo") p.ammo += 12;
        if (it.type === "medkit") p.hp = clamp(p.hp + 35, 0, PLAYER_MAX_HP);
        if (it.type === "mine") {
          p.mines = (p.mines || 0) + 1;
          p.weapon = "mine";
        }
        if (["bat", "pistol"].includes(it.type)) p.weapon = it.type;
        itemsRef.current = itemsRef.current.filter((i) => i.id !== it.id);
        queueFlash(`Подобрано: ${it.type}`);
        break;
      }
    }
  }

  // ===== collisions =====
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
    const margin = 12;
    for (let i = 0; i < tries; i++) {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(minDist, maxDist);
      let sx = px + Math.cos(ang) * dist;
      let sy = py + Math.sin(ang) * dist;
      sx = clamp(sx, innerMinX, innerMaxX);
      sy = clamp(sy, innerMinY, innerMaxY);
      let hit = false;
      for (const w of walls) {
        if (circleRectCollides(sx, sy, 30, w)) { hit = true; break; }
      }
      if (!hit) return { x: sx, y: sy };
    }
    return {
      x: clamp(px + 260, innerMinX, innerMaxX),
      y: clamp(py + 180, innerMinY, innerMaxY),
    };
  }

  // ===== update =====
  function update(dt) {
    const p = playerRef.current;
    const keys = keysRef.current;
    const mouse = mouseRef.current;
    timeRef.current += dt;

    // player move
    let dx = 0, dy = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) dy -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) dy += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) dx -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    let nx = clamp(p.x + (dx / len) * PLAYER_SPEED * dt, p.r, WORLD.w - p.r);
    let ny = clamp(p.y + (dy / len) * PLAYER_SPEED * dt, p.r, WORLD.h - p.r);
    for (const w of wallsRef.current) {
      if (circleRectCollides(nx, ny, p.r, w)) {
        const nxOnly = clamp(p.x + (dx / len) * PLAYER_SPEED * dt, p.r, WORLD.w - p.r);
        const nyOnly = clamp(p.y + (dy / len) * PLAYER_SPEED * dt, p.r, WORLD.h - p.r);
        if (!circleRectCollides(nxOnly, p.y, p.r, w)) {
          nx = nxOnly; ny = p.y;
        } else if (!circleRectCollides(p.x, nyOnly, p.r, w)) {
          nx = p.x; ny = nyOnly;
        } else {
          nx = p.x; ny = p.y;
        }
      }
    }
    p.x = nx;
    p.y = ny;

    // facing
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      p.facing = Math.atan2(mouse.y - rect.height / 2, mouse.x - rect.width / 2);
    }

    // cooldowns
    if (p.attackCD > 0) p.attackCD -= dt;
    if (p.swing > 0) p.swing -= dt;

    // attack
    if (mouse.down || keys["Space"]) {
      attack(p);
      mouse.down = false;
    }

    // pickup
    if (keys["KeyE"]) tryPickup(p);

    // bullets (player)
    for (const b of bulletsRef.current) {
      b.x += Math.cos(b.ang) * BULLET_SPEED * dt;
      b.y += Math.sin(b.ang) * BULLET_SPEED * dt;
      b.life -= dt;
      for (const w of wallsRef.current) {
        if (circleRectCollides(b.x, b.y, 3, w)) {
          b.life = 0;
          break;
        }
      }
    }
    bulletsRef.current = bulletsRef.current.filter((b) => b.life > 0);

    // spawn zombies (accelerating)
    spawnRef.current.timer -= dt;
    if (spawnRef.current.timer <= 0 && zombiesRef.current.length < ZOMBIE_MAX_ON_FIELD) {
      spawnRef.current.interval = Math.max(spawnRef.current.min, spawnRef.current.interval * 0.965);
      spawnRef.current.timer = spawnRef.current.interval * rand(0.5, 1.1);
      const free = getFreeSpawnNear(p.x, p.y, wallsRef.current);
      zombiesRef.current.push(makeZombie(free.x, free.y));
    }

    // spawn white shooters (after 30s)
    if (timeRef.current >= WHITE_START_AT) {
      whiteSpawnRef.current.timer -= dt;
      if (whiteSpawnRef.current.timer <= 0) {
        whiteSpawnRef.current.interval = Math.max(whiteSpawnRef.current.min, whiteSpawnRef.current.interval * 0.97);
        whiteSpawnRef.current.timer = whiteSpawnRef.current.interval * rand(0.6, 1.1);
        const free = getFreeSpawnNear(p.x, p.y, wallsRef.current);
        whitesRef.current.push(makeWhite(free.x, free.y));
      }
    }

    // zombies AI (simple follow + slide)
    for (const z of zombiesRef.current) {
      z.age += dt;
      const ang = angleBetween(z.x, z.y, p.x, p.y);
      const speed = ZOMBIE_BASE_SPEED;
      const prevX = z.x;
      const prevY = z.y;
      let zx = clamp(z.x + Math.cos(ang) * speed * dt, 10, WORLD.w - 10);
      let zy = clamp(z.y + Math.sin(ang) * speed * dt, 10, WORLD.h - 10);
      let collided = false;
      for (const w of wallsRef.current) {
        if (circleRectCollides(zx, zy, z.r, w)) { collided = true; break; }
      }
      if (collided) {
        const zx2 = clamp(z.x + Math.cos(ang) * speed * dt, 10, WORLD.w - 10);
        let xok = true;
        for (const w of wallsRef.current) {
          if (circleRectCollides(zx2, z.y, z.r, w)) { xok = false; break; }
        }
        if (xok) {
          zx = zx2; zy = z.y;
        } else {
          const zy2 = clamp(z.y + Math.sin(ang) * speed * dt, 10, WORLD.h - 10);
          let yok = true;
          for (const w of wallsRef.current) {
            if (circleRectCollides(z.x, zy2, z.r, w)) { yok = false; break; }
          }
          if (yok) {
            zx = z.x; zy = zy2;
          } else {
            zx = prevX; zy = prevY;
          }
        }
      }
      z.x = zx;
      z.y = zy;

      if (dist2(p.x, p.y, z.x, z.y) < (z.r + p.r + 2) ** 2) {
        p.hp -= 20 * dt;
        if (p.hp <= 0) {
          p.hp = 0;
          setRunning(false);
          queueFlash("Вы погибли. Нажмите R, чтобы перезапустить.");
        }
      }

      for (const b of bulletsRef.current) {
        if (dist2(b.x, b.y, z.x, z.y) < (z.r + 4) ** 2) {
          z.hp -= 24;
          b.life = 0;
        }
      }
    }

    // white shooters AI
    for (const w of whitesRef.current) {
      w.age += dt;
      const angToP = angleBetween(w.x, w.y, p.x, p.y);
      const d2p = dist2(w.x, w.y, p.x, p.y);
      let wx = w.x;
      let wy = w.y;
      const tryStep = (ang) => {
        const sx = clamp(w.x + Math.cos(ang) * WHITE_BASE_SPEED * dt, 10, WORLD.w - 10);
        const sy = clamp(w.y + Math.sin(ang) * WHITE_BASE_SPEED * dt, 10, WORLD.h - 10);
        for (const wall of wallsRef.current) {
          if (circleRectCollides(sx, sy, w.r, wall)) return null;
        }
        return { x: sx, y: sy };
      };
      if (d2p < 200 * 200) {
        const step = tryStep(angToP + Math.PI);
        if (step) { wx = step.x; wy = step.y; }
      } else if (d2p > 360 * 360) {
        const step = tryStep(angToP);
        if (step) { wx = step.x; wy = step.y; }
      }
      w.x = wx;
      w.y = wy;

      w.shootCD -= dt;
      if (w.shootCD <= 0) {
        const ang = Math.atan2(p.y - w.y, p.x - w.x);
        enemyBulletsRef.current.push({ x: w.x, y: w.y, ang, life: 3.5 });
        w.shootCD = 1.6;
      }
    }

    // mines trigger (with arming & contact)
    if (minesRef.current.length) {
      const keep = [];
      for (const m of minesRef.current) {
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
        // активная мина — взрыв ТОЛЬКО при касании
        let exploded = false;
        for (const z of zombiesRef.current) {
          if (dist2(m.x, m.y, z.x, z.y) < (m.r + z.r) * (m.r + z.r)) { exploded = true; break; }
        }
        if (!exploded) {
          for (const w of whitesRef.current) {
            if (dist2(m.x, m.y, w.x, w.y) < (m.r + w.r) * (m.r + w.r)) { exploded = true; break; }
          }
        }
        const pnow = playerRef.current;
        if (!exploded && dist2(m.x, m.y, pnow.x, pnow.y) < (m.r + pnow.r) * (m.r + pnow.r)) {
          exploded = true;
        }
        if (exploded) {
          // визуальный эффект
          explosionsRef.current.push({ x: m.x, y: m.y, r: 0, life: 0.35 });
          // урон всем внутри большого радиуса
          zombiesRef.current.forEach((z) => {
            if (dist2(m.x, m.y, z.x, z.y) < MINE_EXPLOSION_RADIUS * MINE_EXPLOSION_RADIUS) z.hp = 0;
          });
          whitesRef.current.forEach((w) => {
            if (dist2(m.x, m.y, w.x, w.y) < MINE_EXPLOSION_RADIUS * MINE_EXPLOSION_RADIUS) w.hp = 0;
          });
          if (dist2(m.x, m.y, pnow.x, pnow.y) < MINE_EXPLOSION_RADIUS * MINE_EXPLOSION_RADIUS) {
            pnow.hp = 0;
            setRunning(false);
            queueFlash("Вы подорвались на мине");
          }
          // мина одноразовая — не пушим её в keep
        } else {
          keep.push(m);
        }
      }
      minesRef.current = keep;
    }

    // анимация взрывов
    if (explosionsRef.current.length) {
      const keepEx = [];
      for (const ex of explosionsRef.current) {
        ex.life -= dt;
        ex.r += 420 * dt; // быстро растёт
        if (ex.life > 0) keepEx.push(ex);
      }
      explosionsRef.current = keepEx;
    }

    // enemy bullets
    for (const eb of enemyBulletsRef.current) {
      eb.x += Math.cos(eb.ang) * ENEMY_BULLET_SPEED * dt;
      eb.y += Math.sin(eb.ang) * ENEMY_BULLET_SPEED * dt;
      eb.life -= dt;
      for (const w of wallsRef.current) {
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
          setRunning(false);
          queueFlash("Вы погибли. Нажмите R, чтобы перезапустить.");
        }
      }
    }
    enemyBulletsRef.current = enemyBulletsRef.current.filter((b) => b.life > 0);

    // cleanup
    const newZ = [];
    let diedByPlayer = 0;
    for (const z of zombiesRef.current) {
      if (z.hp <= 0) {
        diedByPlayer++;
        const dropRoll = Math.random();
        if (dropRoll < 0.25) {
          itemsRef.current.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "ammo"));
        } else if (dropRoll < 0.31) {
          itemsRef.current.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "medkit"));
        } else if (dropRoll < 0.322) {
          itemsRef.current.push(makeItem(p.x + rand(-120, 120), p.y + rand(-120, 120), "mine"));
        }
        continue;
      }
      if (z.age >= ZOMBIE_MAX_AGE) {
        continue;
      }
      newZ.push(z);
    }
    zombiesRef.current = newZ;
    if (diedByPlayer > 0) killsRef.current += diedByPlayer;

    whitesRef.current = whitesRef.current.filter((w) => w.hp > 0 && w.age < WHITE_MAX_AGE);

    if (zombiesRef.current.length > ZOMBIE_HARD_CAP) zombiesRef.current.length = ZOMBIE_HARD_CAP;
    if (whitesRef.current.length > WHITE_HARD_CAP) whitesRef.current.length = WHITE_HARD_CAP;
  }

  // ===== draw =====
  function draw(ctx, isRunning) {
    const p = playerRef.current;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#dce9dd";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const camX = p.x - w / 2;
    const camY = p.y - h / 2;
    ctx.translate(-camX, -camY);

    // walls
    ctx.fillStyle = "#92a086";
    for (const wall of wallsRef.current) {
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    }

    // grid
    const tile = 110;
    ctx.strokeStyle = "#c4d3c4";
    ctx.lineWidth = 1;
    for (let x = Math.floor(camX / tile) * tile - tile; x < camX + w + tile; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, camY - 40);
      ctx.lineTo(x, camY + h + 40);
      ctx.stroke();
    }
    for (let y = Math.floor(camY / tile) * tile - tile; y < camY + h + tile; y += tile) {
      ctx.beginPath();
      ctx.moveTo(camX - 40, y);
      ctx.lineTo(camX + w + 40, y);
      ctx.stroke();
    }

    // items (pickups)
    for (const it of itemsRef.current) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 10, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      if (it.type === "bat") {
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(-16, -4, 34, 8);
      } else if (it.type === "pistol") {
        ctx.fillStyle = "#333";
        ctx.fillRect(-10, -4, 20, 8);
        ctx.fillStyle = "#999";
        ctx.fillRect(0, -4, 6, 14);
      } else if (it.type === "ammo") {
        ctx.fillStyle = "#888";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.type === "medkit") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(-11, -9, 22, 18);
        ctx.fillStyle = "#d33";
        ctx.fillRect(-3, -7, 6, 14);
        ctx.fillRect(-7, -3, 14, 6);
      } else if (it.type === "mine") {
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // placed mines
    for (const m of minesRef.current) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(0, 6, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = m.state === "armed" ? "#dc2626" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // explosions (fx)
    if (explosionsRef.current.length) {
      for (const ex of explosionsRef.current) {
        const alpha = Math.max(0, ex.life / 0.35);
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // zombies
    for (const z of zombiesRef.current) {
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.beginPath();
      ctx.ellipse(0, 8, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7fb36a";
      ctx.beginPath();
      ctx.arc(0, 0, z.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#112";
      ctx.fillRect(-6, -3, 3, 2);
      ctx.fillRect(3, -3, 3, 2);
      const ratio = clamp(z.hp / 34, 0, 1);
      ctx.fillStyle = "#111";
      ctx.fillRect(-16, -z.r - 10, 32, 4);
      ctx.fillStyle = "#eb5757";
      ctx.fillRect(-16, -z.r - 10, 32 * ratio, 4);
      ctx.restore();
    }

    // white shooters
    for (const wht of whitesRef.current) {
      ctx.save();
      ctx.translate(wht.x, wht.y);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.beginPath();
      ctx.ellipse(0, 8, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(0, 0, wht.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-6, -3, 3, 2);
      ctx.fillRect(3, -3, 3, 2);
      const ratioW = clamp(wht.hp / 28, 0, 1);
      ctx.fillStyle = "#111";
      ctx.fillRect(-16, -wht.r - 10, 32, 4);
      ctx.fillStyle = "#eb5757";
      ctx.fillRect(-16, -wht.r - 10, 32 * ratioW, 4);
      ctx.restore();
    }

    // player bullets
    ctx.fillStyle = "#111";
    for (const b of bulletsRef.current) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // enemy bullets
    ctx.fillStyle = "#f97316";
    for (const eb of enemyBulletsRef.current) {
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // player
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(p.facing);
    ctx.fillStyle = "#4f9ee3";
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.arc(7, 4, 2, 0, Math.PI * 2);
    ctx.fill();
    if (p.weapon === "bat") {
      const swingT = Math.max(0, p.swing) / 0.28;
      const extraRot = swingT > 0 ? -1.2 + (1 - swingT) * 1.2 : 0;
      ctx.save();
      ctx.rotate(extraRot);
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(p.r * 0.6, -3, 16, 6);
      ctx.restore();
    } else if (p.weapon === "pistol") {
      ctx.fillStyle = "#333";
      ctx.fillRect(p.r * 0.6, -3, 10, 6);
    } else if (p.weapon === "mine") {
      ctx.fillStyle = "#444";
      ctx.fillRect(p.r * 0.6, -3, 10, 6);
    }
    ctx.restore();

    ctx.restore(); // camera

    // HUD - HP
    const hudW = 220;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(18, 16, hudW, 30);
    ctx.fillStyle = "#111";
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HP", 26, 36);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(56, 22, (p.hp / PLAYER_MAX_HP) * (hudW - 66), 18);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.strokeRect(56, 22, hudW - 66, 18);

    // weapon HUD
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(w - 230, 16, 210, 74);
    ctx.fillStyle = "#111";
    ctx.fillText(`Оружие: ${p.weapon}`, w - 220, 36);
    if (p.weapon === "pistol") ctx.fillText(`Патроны: ${p.ammo}`, w - 220, 56);
    else ctx.fillText("Патроны: —", w - 220, 56);
    ctx.fillText(`Мины: ${p.mines}`, w - 220, 72);

    // kills bottom-left
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(14, h - 46, 170, 32);
    ctx.fillStyle = "#111";
    ctx.textAlign = "left";
    ctx.fillText(`Убито: ${killsRef.current}`, 22, h - 24);

    if (!isRunning) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Вы погибли", w / 2, h / 2 - 10);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Нажмите R, чтобы перезапустить", w / 2, h / 2 + 20);
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(`Убито зомби: ${killsRef.current}`, w / 2, h / 2 + 46);
    }
  }

  return (
    <div className="w-full h-[720px] relative bg-slate-100 rounded-2xl shadow-inner overflow-hidden">
      <canvas ref={canvasRef} width={1024} height={640} className="w-full h-full block" />
      <div className="absolute top-2 right-2 bg-white/70 backdrop-blur rounded-xl p-2 text-xs leading-snug shadow">
        <div className="font-semibold mb-1">Управление</div>
        <div>WASD / стрелки — движение</div>
        <div>Мышь / Space — атака / установка</div>
        <div>E — подобрать предмет</div>
        <div>Q — сменить оружие</div>
        <div>R — рестарт после смерти</div>
        <div className="mt-2 text-[10px] text-slate-500">Мины: лежащие — голубые, установленные — красные. Взрыв бьёт всех.</div>
      </div>
      {flash && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow">
          {flash}
        </div>
      )}
    </div>
  );
}
