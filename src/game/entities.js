
index c67a1a6f7999d9d59d89fbe97c73b32ff6dab3f4..bcf4fcba6690dfc8de0082766ffc615eb5df69d4 100644
--- a/src/game/entities.js
+++ b/src/game/entities.js
@@ -1,96 +1,199 @@
 import {
   WORLD,
   PLAYER_MAX_HP,
   ZOMBIE_BASE_SPEED,
   BOSS_HP,
+  BOSS_SPEED,
+  BULLET_SPEED,
+  SKELETON_HP,
+  GHOST_SPEED_MULT,
+  BOMBER_MINE_DELAY,
+  XP_PER_KILL,
+  XP_LEVEL_BASE,
 } from "./constants.js";
 
 export const makePlayer = () => ({
   x: WORLD.w / 2,
   y: WORLD.h / 2,
   r: 17,
   hp: PLAYER_MAX_HP,
+  maxHp: PLAYER_MAX_HP,
+  level: 1,
+  xp: 0,
+  nextLevelXp: XP_LEVEL_BASE,
   facing: 0,
   weapon: null,
   weapons: [],
   ammo: 0,
   attackCD: 0,
   swing: 0,
   mines: 0,
+  medkits: 0,
   // для рывка
   dashTime: 0,
   dashCD: 0,
   moveX: 0,
   moveY: 0,
 });
 
+const makeBaseZombie = (x, y, kind, overrides = {}) => ({
+  x,
+  y,
+  r: 16,
+  hp: 34,
+  maxHp: 34,
+  speed: ZOMBIE_BASE_SPEED,
+  age: 0,
+  kind,
+  behavior: "chase",
+  state: "idle",
+  stateTimer: 0,
+  xp: XP_PER_KILL,
+  mineTimer: null,
+  ...overrides,
+});
+
 export const makeZombie = (x, y, kind = null) => {
   if (!kind) {
     const r = Math.random();
-    if (r < 0.15) kind = "fat";
-    else if (r < 0.3) kind = "small";
+    if (r < 0.2) kind = "fat";
+    else if (r < 0.32) kind = "small";
+    else if (r < 0.44) kind = "brute";
+    else if (r < 0.55) kind = "skeleton";
+    else if (r < 0.66) kind = "ghost";
+    else if (r < 0.74) kind = "bomber";
     else kind = "normal";
   }
   if (kind === "fat") {
-    return {
-      x,
-      y,
+    return makeBaseZombie(x, y, "fat", {
       r: 16 * 1.4,
       hp: 34 * 2,
       maxHp: 34 * 2,
       speed: ZOMBIE_BASE_SPEED * 0.8,
-      age: 0,
-      kind: "fat",
-    };
+      xp: XP_PER_KILL + 6,
+    });
   }
   if (kind === "small") {
-    return {
-      x,
-      y,
+    return makeBaseZombie(x, y, "small", {
       r: 16 * 0.5,
+      speed: ZOMBIE_BASE_SPEED * 2,
+      behavior: "leap",
+      leapCD: 1.1 + Math.random() * 1.6,
+      targetAng: 0,
+      xp: XP_PER_KILL + 4,
+    });
+  }
+  if (kind === "brute") {
+    return makeBaseZombie(x, y, "brute", {
+      r: 16 * 1.3,
+      hp: 34 * 3,
+      maxHp: 34 * 3,
+      speed: ZOMBIE_BASE_SPEED * 0.75,
+      behavior: "charge",
+      chargeCD: 2.5 + Math.random() * 2.5,
+      chargeDir: 0,
+      xp: XP_PER_KILL + 10,
+    });
+  }
+  if (kind === "skeleton") {
+    return makeBaseZombie(x, y, "skeleton", {
+      r: 12,
+      hp: SKELETON_HP,
+      maxHp: SKELETON_HP,
+      speed: ZOMBIE_BASE_SPEED,
+      xp: XP_PER_KILL + 2,
+    });
+  }
+  if (kind === "ghost") {
+    return makeBaseZombie(x, y, "ghost", {
+      r: 15,
       hp: 34,
       maxHp: 34,
-      speed: ZOMBIE_BASE_SPEED * 2,
-      age: 0,
-      kind: "small",
-    };
+      speed: ZOMBIE_BASE_SPEED * GHOST_SPEED_MULT,
+      intangible: true,
+      xp: XP_PER_KILL + 8,
+    });
   }
-  return {
-    x,
-    y,
-    r: 16,
-    hp: 34,
-    maxHp: 34,
-    speed: ZOMBIE_BASE_SPEED,
-    age: 0,
-    kind: "normal",
-  };
+  if (kind === "bomber") {
+    return makeBaseZombie(x, y, "bomber", {
+      r: 17,
+      hp: 34 * 1.2,
+      maxHp: 34 * 1.2,
+      mineTimer: BOMBER_MINE_DELAY,
+      xp: XP_PER_KILL + 12,
+    });
+  }
+  return makeBaseZombie(x, y, "normal");
 };
 
-export const makeBullet = (x, y, ang) => ({ x, y, ang, life: 1.2 });
+export const makeBullet = (x, y, ang, options = {}) => ({
+  x,
+  y,
+  ang,
+  speed: options.speed ?? BULLET_SPEED,
+  damage: options.damage ?? 24,
+  radius: options.radius ?? 3,
+  life: options.life ?? 1.2,
+});
 
 export const makeItem = (x, y, type) => ({
   x,
   y,
   r: 12,
   type,
   id: Math.random().toString(36).slice(2),
 });
 
-export const makeWhite = (x, y) => ({
+export const makeWhite = (x, y, type = "white") => {
+  if (type === "witch") {
+    return {
+      x,
+      y,
+      r: 20,
+      hp: 34 * 2,
+      maxHp: 34 * 2,
+      age: 0,
+      shootCD: 1.2,
+      summonCD: 0,
+      type: "witch",
+      xp: XP_PER_KILL + 22,
+    };
+  }
+  return {
+    x,
+    y,
+    r: 16,
+    hp: 28,
+    maxHp: 28,
+    age: 0,
+    shootCD: 1.6,
+    type: "white",
+    xp: XP_PER_KILL + 6,
+  };
+};
+
+const randWander = () => 1.5 + Math.random() * 2.5;
+
+export const makeVillager = (x, y) => ({
   x,
   y,
-  r: 16,
-  hp: 28,
-  age: 0,
-  shootCD: 1.6,
+  r: 14,
+  hp: PLAYER_MAX_HP * 0.75,
+  maxHp: PLAYER_MAX_HP * 0.75,
+  wanderTimer: randWander(),
+  wanderAng: Math.random() * Math.PI * 2,
 });
 
 export const makeBoss = (x, y) => ({
   x,
   y,
-  r: 46,
+  r: 60,
   hp: BOSS_HP,
   maxHp: BOSS_HP,
-  shootCD: 1.5,
+  speed: BOSS_SPEED,
+  kind: "boss",
+  xp: XP_PER_KILL + 120,
+  behavior: "boss",
+  state: "idle",
+  stateTimer: 0,
 });
