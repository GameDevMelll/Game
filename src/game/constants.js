// размеры мира
export const WORLD = { w: 2400, h: 1800 };

// игрок
export const PLAYER_SPEED = 230;
export const PLAYER_DIAM = 34;
export const PLAYER_MAX_HP = 100;
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

// мины
export const MINE_EXPLOSION_RADIUS = 128;

// день/ночь
export const DAY_DURATION = 60;
export const NIGHT_DURATION = 60;
export const DAY_NIGHT_CYCLE = DAY_DURATION + NIGHT_DURATION;
