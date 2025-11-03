// src/game/update.js
import {
  WORLD,
  PLAYER_SPEED,
  PLAYER_MAX_HP,
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
} from "./constants.js";
import { clamp, rand, dist2, angleBetween } from "./utils.js";
import { makeZombie, makeItem, makeWhite, makeBullet } from "./entities.js";
import { makePlayer } from "./entities.js";
import { makeWalls } from "./maze.js";
