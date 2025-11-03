diff --git a/src/game/constants.js b/src/game/constants.js
index 75fddfe68a800fd367f847f33d74a32c78ad9a26..60143f5a9bf2edcf475e77fe87ee30b759743333 100644
--- a/src/game/constants.js
+++ b/src/game/constants.js
@@ -1,51 +1,70 @@
 // размеры мира
 export const WORLD = { w: 2400, h: 1800 };
 
 // игрок
 export const PLAYER_SPEED = 230;
 export const PLAYER_DIAM = 34;
 export const PLAYER_MAX_HP = 100;
+export const PLAYER_LEVEL_HP_BONUS = 12;
+export const PLAYER_MEDKIT_HEAL = 35;
 export const MELEE_RANGE = 55;
 export const MELEE_DAMAGE = 25;
 export const BULLET_SPEED = 540;
 export const PICKUP_RADIUS = 48;
 
 // рывок
 export const DASH_SPEED = 520;
 export const DASH_DURATION = 0.18; // сек
 export const DASH_COOLDOWN = 3.0; // сек
 
 // зомби
 export const ZOMBIE_BASE_SPEED = 140;
 export const ZOMBIE_SPAWN_EVERY = 2.6;
 export const ZOMBIE_MAX_ON_FIELD = 35;
 export const ZOMBIE_MAX_AGE = 15;
 export const ZOMBIE_HARD_CAP = 50;
+export const SKELETON_HP = 18;
+export const GHOST_SPEED_MULT = 0.7;
+export const BOMBER_MINE_DELAY = 2.0;
+export const BOMBER_COUNTDOWN = 3.0;
+export const BOSS_ATTACK_RANGE = 140;
+export const BOSS_ATTACK_DAMAGE = 65;
 
 // лабиринт
 export const MAZE_PASSAGE = PLAYER_DIAM * 2;
 export const WALL_THICKNESS = 42;
 
 // стрелки (белые)
 export const WHITE_START_AT = 30;
 export const WHITE_SPAWN_EVERY = 4.0;
 export const WHITE_SPAWN_MIN = 1.0;
 export const WHITE_BASE_SPEED = 100;
 export const WHITE_MAX_AGE = 20;
 export const WHITE_HARD_CAP = 20;
 export const ENEMY_BULLET_SPEED = 380;
+export const WITCH_SUMMON_INTERVAL = 3.0;
+export const WITCH_MAX_AGE = 180;
 
 // мины
 export const MINE_EXPLOSION_RADIUS = 128;
 
 // день/ночь
 export const DAY_DURATION = 60;
 export const NIGHT_DURATION = 60;
 export const DAY_NIGHT_CYCLE = DAY_DURATION + NIGHT_DURATION;
 
+// опыт
+export const XP_PER_KILL = 12;
+export const XP_LEVEL_BASE = 110;
+
+// жители
+export const INITIAL_VILLAGERS = 6;
+export const VILLAGER_SPAWN_EVERY = 30;
+export const VILLAGER_SPEED = 150;
+
 // босс
 export const BOSS_SPAWN_AT = 120; // секунда появления
 export const BOSS_HP = 450;
 export const BOSS_SPEED = 65;
 export const BOSS_SHOOT_EVERY = 2.5;
 export const BOSS_BULLET_SPEED = 300;
