// размеры мира
export const WORLD = { w: 2400, h: 1800 };

// игрок
export const PLAYER_SPEED = 230;
export const PLAYER_DIAM = 34;
export const PLAYER_MAX_HP = 100;
export const PLAYER_LEVEL_HP_BONUS = 150;
export const PLAYER_MEDKIT_HEAL = 350;
export const MELEE_RANGE = 55;
export const MELEE_DAMAGE = 25;
export const BULLET_SPEED = 540;
export const PICKUP_RADIUS = 48;
export const INVENTORY_SLOTS = 10;
export const PLAYER_INVULN_DURATION = 1.0;

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
export const SKELETON_HP = 18;
export const GHOST_SPEED_MULT = 0.7;
export const BOMBER_MINE_DELAY = 2.0;
export const BOMBER_COUNTDOWN = 3.0;
export const BOSS_ATTACK_RANGE = 140;
export const BOSS_ATTACK_DAMAGE = 65;

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
export const WITCH_SUMMON_INTERVAL = 3.0;
export const WITCH_MAX_AGE = 180;

// мины
export const MINE_EXPLOSION_RADIUS = 128;
export const GRENADE_FUSE = 1.5;
export const GRENADE_EXPLOSION_RADIUS = MINE_EXPLOSION_RADIUS * 0.5;
export const GRENADE_THROW_SPEED = BULLET_SPEED * 0.46;

// день/ночь
export const DAY_DURATION = 60;
export const NIGHT_DURATION = 60;
export const DAY_NIGHT_CYCLE = DAY_DURATION + NIGHT_DURATION;

// опыт
export const XP_PER_KILL = 12;
export const XP_LEVEL_BASE = 110;

// жители
export const INITIAL_VILLAGERS = 6;
export const VILLAGER_SPAWN_EVERY = 30;
export const VILLAGER_SPEED = 150;
export const MEDKIT_BASE_INTERVAL = 32;
export const MEDKIT_MIN_INTERVAL = 6;

// кошки
export const CAT_SPAWN_FACTOR = 1;
export const CAT_SPEED = ZOMBIE_BASE_SPEED * 2 * 0.9;
export const CAT_MAX_HP = (PLAYER_MAX_HP * 0.75) * 0.5;
export const CAT_MAX_COUNT = 3;

// боссы
export const BOSS1_SPAWN_AT = 90; // секунда появления
export const BOSS1_HP = 450;
export const BOSS1_SPEED = 65;
export const BOSS1_MELEE_DAMAGE = 65;
export const BOSS2_SPAWN_DELAY = 30; // после смерти босса №1
export const BOSS2_HP = 720;
export const BOSS2_SPEED = PLAYER_SPEED * 0.95;
export const BOSS2_MELEE_DAMAGE = 85;
export const BOSS2_SHOTGUN_INTERVAL = 3.2;
export const BOSS2_SHOTGUN_PELLETS = 7;
export const BOSS2_SHOTGUN_SPREAD = 0.42;
export const BOSS2_SHOTGUN_DAMAGE = 32;
export const BOSS2_PHASE_THRESHOLD = 0.5;
export const BOSS2_SHOTGUN_RANGE = 560;
export const BOSS2_SPAWN_RATE_MULTIPLIER = 1.65;
export const BOSS2_ENRAGED_SPEED_MULT = 1.25;
export const BOSS2_ENRAGED_SHOTGUN_PELLETS = 11;
export const BOSS2_ENRAGED_SHOTGUN_DAMAGE = 52;
export const BOSS2_ENRAGED_MELEE_MULT = 1.3;
export const BOSS2_ENRAGED_SHOTGUN_INTERVAL_MULT = 0.55;
export const BOSS3_VILLAGER_WAVE = 10;
export const BOSS3_SPAWN_DELAY_AFTER_RESCUE = 10;
export const BOSS3_HP = 1100;
export const BOSS3_SPEED = PLAYER_SPEED * 0.82;
export const BOSS3_MELEE_DAMAGE = 95;
export const BOSS3_MACHINEGUN_INTERVAL = 1.4;
export const BOSS3_MACHINEGUN_BURST = 10;
export const BOSS3_MACHINEGUN_RATE = 0.06;
export const BOSS3_RADIAL_INTERVAL = 4.5;
export const BOSS3_GRENADE_INTERVAL = 5.5;
export const BOSS3_REGEN_DELAY = 3;
export const BOSS3_REGEN_RATE = 28; // hp в секунду
export const BOSS_CONTACT_RANGE = 140;
export const BOSS3_WALL_BREAK_TIME = 1; // секунды на пролом стены
