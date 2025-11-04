// src/game/assetManifest.js
import { TEXTURE_KEYS, SOUND_KEYS } from "./assetKeys.js";
import zombiePng from "../assets/textures/zom-removebg-preview.png"; // твой спрайт
import GhostPng from "../assets/textures/Ghost-removebg-preview.png";
import RangedPng from "../assets/textures/Ranged-removebg-preview.png";
import axePng from "../assets/textures/axe.png";
import bombPng from "../assets/textures/boom.png";
import catPng from "../assets/textures/cat.png";
import grenadePng from "../assets/textures/grenade.png";
import gutlingPng from "../assets/textures/gutling.png";
import machinegunPng from "../assets/textures/machinegun.png";
import mineIdlePng from "../assets/textures/mine_idle.png";
import mineArmedPng from "../assets/textures/mine_armed.png";
import pitchforkPng from "../assets/textures/pitchfork.png";
import shieldPng from "../assets/textures/shield.png";
import medkitIconPng from "../assets/textures/medkit_icon.png";
import backPng from "../assets/textures/back2.png";
import skelPng from "../assets/textures/skel.png";
import rabitPng from "../assets/textures/rabit.png";
import orcPng from "../assets/textures/orc.png";
import mellPng from "../assets/textures/mell.png";
import lomPng from "../assets/textures/lom.png";
import gunPng from "../assets/textures/gun.png";
import fogPng from "../assets/textures/fog.png";
import bomPng from "../assets/textures/bom.png";
import bembMp3 from "../assets/music/bemb.mp3"; //

export const TEXTURE_MANIFEST = {
  [TEXTURE_KEYS.BACKGROUND]: backPng,
  [TEXTURE_KEYS.WALL]: wallPng,
  [TEXTURE_KEYS.PLAYER]: null,
  [TEXTURE_KEYS.VILLAGER]: mellPng,
  [TEXTURE_KEYS.ZOMBIE]: zombiePng,      
  [TEXTURE_KEYS.RANGED]: RangedPng,
  [TEXTURE_KEYS.GHOST]: GhostPng,
  [TEXTURE_KEYS.SKELETON]: skelPng,
  [TEXTURE_KEYS.WITCH]: RangedPng,
  [TEXTURE_KEYS.BOMBER]: bomPng,
  [TEXTURE_KEYS.BOSS]: orcPng,
  [TEXTURE_KEYS.BOSS2]: fogPng,
  [TEXTURE_KEYS.BOSS3]: rabitPng,
  [TEXTURE_KEYS.PROJECTILE_PLAYER]: null,
  [TEXTURE_KEYS.PROJECTILE_ENEMY]: null,
  [TEXTURE_KEYS.SLASH]: null,
  [TEXTURE_KEYS.EXPLOSION]: null,
  [TEXTURE_KEYS.MEDKIT]: medkitIconPng,
  [TEXTURE_KEYS.AMMO]: null,
  [TEXTURE_KEYS.MINE_IDLE]: mineIdlePng,
  [TEXTURE_KEYS.MINE_ARMED]: mineArmedPng,
  [TEXTURE_KEYS.BOMB]: bombPng,
  [TEXTURE_KEYS.SHOTGUN]: machinegunPng,
  [TEXTURE_KEYS.GLAIVE]: pitchforkPng,
  [TEXTURE_KEYS.PISTOL]: gunPng,
  [TEXTURE_KEYS.BAT]: lomPng,
  [TEXTURE_KEYS.MACHINEGUN]: gutlingPng,
  [TEXTURE_KEYS.PITCHFORK]: pitchforkPng,
  [TEXTURE_KEYS.GRENADE]: grenadePng,
  [TEXTURE_KEYS.SHIELD]: shieldPng,
  [TEXTURE_KEYS.CAT]: catPng,
};

export const SOUND_MANIFEST = {
  [SOUND_KEYS.AMBIENT]: bembMp3,
  [SOUND_KEYS.MELODY]: bembMp3,
  [SOUND_KEYS.PLAYER_ATTACK]: bembMp3,
  [SOUND_KEYS.PLAYER_HIT]: bembMp3,
  [SOUND_KEYS.ENEMY_HIT]: bembMp3,
  [SOUND_KEYS.ENEMY_DIE]: bembMp3,
  [SOUND_KEYS.PICKUP]: bembMp3,
  [SOUND_KEYS.MEDKIT]: bembMp3,
  [SOUND_KEYS.MINE_EXPLODE]: bembMp3,
  [SOUND_KEYS.LEVEL_UP]: bembMp3,
  [SOUND_KEYS.WITCH_SHOOT]: bembMp3,
  [SOUND_KEYS.MONSTER_SPAWN]: bembMp3,
  [SOUND_KEYS.BOSS2_PHASE]: bembMp3,
  [SOUND_KEYS.RESCUE_SPAWN]: bembMp3,
  [SOUND_KEYS.BOSS3_SPAWN]: bembMp3,
  [SOUND_KEYS.WALL_BREAK]: bembMp3,
};
