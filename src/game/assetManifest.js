// src/game/assetManifest.js
import { TEXTURE_KEYS, SOUND_KEYS } from "./assetKeys.js";
import zombiePng from "../assets/textures/zom-removebg-preview.png"; // твой спрайт
import GhostPng from "../assets/textures/Ghost-removebg-preview.png";
import RangedPng from "../assets/textures/Ranged-removebg-preview.png";
import axePng from "../assets/textures/axe.png";
import bombPng from "../assets/textures/bomb.png";
import catPng from "../assets/textures/cat.png";
import grenadePng from "../assets/textures/grenade.png";
import machinegunPng from "../assets/textures/machinegun.png";
import mineIdlePng from "../assets/textures/mine_idle.png";
import mineArmedPng from "../assets/textures/mine_armed.png";
import pitchforkPng from "../assets/textures/pitchfork.png";
import shieldPng from "../assets/textures/shield.png";
import medkitIconPng from "../assets/textures/medkit_icon.png";
import backPng from "../assets/textures/back2.png";
import bembMp3 from "../assets/music/bemb.mp3"; //

export const TEXTURE_MANIFEST = {
  [TEXTURE_KEYS.BACKGROUND]: backPng,
  [TEXTURE_KEYS.WALL]: null,
  [TEXTURE_KEYS.PLAYER]: null,
  [TEXTURE_KEYS.VILLAGER]: null,
  [TEXTURE_KEYS.ZOMBIE]: zombiePng,        // ← ЗДЕСЬ!
  [TEXTURE_KEYS.RANGED]: RangedPng,
  [TEXTURE_KEYS.GHOST]: GhostPng,
  [TEXTURE_KEYS.SKELETON]: null,
  [TEXTURE_KEYS.WITCH]: RangedPng,
  [TEXTURE_KEYS.BOMBER]: null,
  [TEXTURE_KEYS.BOSS]: null,
  [TEXTURE_KEYS.BOSS2]: null,
  [TEXTURE_KEYS.BOSS3]: null,
  [TEXTURE_KEYS.PROJECTILE_PLAYER]: null,
  [TEXTURE_KEYS.PROJECTILE_ENEMY]: null,
  [TEXTURE_KEYS.SLASH]: null,
  [TEXTURE_KEYS.EXPLOSION]: null,
  [TEXTURE_KEYS.MEDKIT]: medkitIconPng,
  [TEXTURE_KEYS.AMMO]: null,
  [TEXTURE_KEYS.MINE_IDLE]: mineIdlePng,
  [TEXTURE_KEYS.MINE_ARMED]: mineArmedPng,
  [TEXTURE_KEYS.BOMB]: bombPng,
  [TEXTURE_KEYS.SHOTGUN]: null,
  [TEXTURE_KEYS.GLAIVE]: pitchforkPng,
  [TEXTURE_KEYS.PISTOL]: null,
  [TEXTURE_KEYS.BAT]: null,
  [TEXTURE_KEYS.MACHINEGUN]: machinegunPng,
  [TEXTURE_KEYS.PITCHFORK]: pitchforkPng,
  [TEXTURE_KEYS.GRENADE]: grenadePng,
  [TEXTURE_KEYS.SHIELD]: shieldPng,
  [TEXTURE_KEYS.CAT]: catPng,
};

export const SOUND_MANIFEST = {
  [SOUND_KEYS.AMBIENT]: bembMp3,
  [SOUND_KEYS.MELODY]: bembMp3,
  [SOUND_KEYS.PLAYER_ATTACK]: null,
  [SOUND_KEYS.PLAYER_HIT]: null,
  [SOUND_KEYS.ENEMY_HIT]: null,
  [SOUND_KEYS.ENEMY_DIE]: null,
  [SOUND_KEYS.PICKUP]: null,
  [SOUND_KEYS.MEDKIT]: null,
  [SOUND_KEYS.MINE_EXPLODE]: null,
  [SOUND_KEYS.LEVEL_UP]: null,
  [SOUND_KEYS.WITCH_SHOOT]: null,
  [SOUND_KEYS.MONSTER_SPAWN]: null,
  [SOUND_KEYS.BOSS2_PHASE]: null,
  [SOUND_KEYS.RESCUE_SPAWN]: null,
  [SOUND_KEYS.BOSS3_SPAWN]: null,
  [SOUND_KEYS.WALL_BREAK]: null,
};
