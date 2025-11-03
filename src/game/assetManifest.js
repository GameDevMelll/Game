// src/game/assetManifest.js
import { TEXTURE_KEYS, SOUND_KEYS } from "./assetKeys.js";
import zombiePng from "../assets/textures/zom-removebg-preview.png"; // твой спрайт
import GhostPng from "../assets/textures/Ghost-removebg-preview.png";
import RangedPng from "../assets/textures/Ranged-removebg-preview.png";

export const TEXTURE_MANIFEST = {
  [TEXTURE_KEYS.BACKGROUND]: null,
  [TEXTURE_KEYS.WALL]: null,
  [TEXTURE_KEYS.PLAYER]: null,
  [TEXTURE_KEYS.VILLAGER]: null,
  [TEXTURE_KEYS.ZOMBIE]: zombiePng,        // ← ЗДЕСЬ!
  [TEXTURE_KEYS.RANGED]: RangedPng,
  [TEXTURE_KEYS.GHOST]: GhostPng,
  [TEXTURE_KEYS.SKELETON]: null,
  [TEXTURE_KEYS.WITCH]: null,
  [TEXTURE_KEYS.BOMBER]: null,
  [TEXTURE_KEYS.BOSS]: null,
  [TEXTURE_KEYS.PROJECTILE_PLAYER]: null,
  [TEXTURE_KEYS.PROJECTILE_ENEMY]: null,
  [TEXTURE_KEYS.SLASH]: null,
  [TEXTURE_KEYS.EXPLOSION]: null,
  [TEXTURE_KEYS.MEDKIT]: null,
  [TEXTURE_KEYS.AMMO]: null,
  [TEXTURE_KEYS.MINE]: null,
  [TEXTURE_KEYS.SHOTGUN]: null,
  [TEXTURE_KEYS.GLAIVE]: null,
  [TEXTURE_KEYS.PISTOL]: null,
  [TEXTURE_KEYS.BAT]: null,
};

export const SOUND_MANIFEST = {
  [SOUND_KEYS.AMBIENT]: null,
  [SOUND_KEYS.MELODY]: null,
  [SOUND_KEYS.PLAYER_ATTACK]: null,
  [SOUND_KEYS.PLAYER_HIT]: null,
  [SOUND_KEYS.ENEMY_HIT]: null,
  [SOUND_KEYS.ENEMY_DIE]: null,
  [SOUND_KEYS.PICKUP]: null,
  [SOUND_KEYS.MEDKIT]: null,
  [SOUND_KEYS.MINE_EXPLODE]: null,
  [SOUND_KEYS.LEVEL_UP]: null,
  [SOUND_KEYS.WITCH_SHOOT]: null,
};
