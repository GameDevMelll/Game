import { TEXTURE_KEYS, SOUND_KEYS } from "./assetKeys.js";

/**
 * Манифест ресурсов.
 *
 * Чтобы поменять текстуру или звук, добавьте файл в проект (например, в папку
 * `public/textures` или `src/assets`) и импортируйте его здесь. Затем укажите
 * путь в соответствующем поле манифеста. Пример:
 *
 * import customPlayer from "../assets/textures/my-player.png";
 *
 * export const TEXTURE_MANIFEST = {
 *   ...
 *   [TEXTURE_KEYS.PLAYER]: customPlayer,
 * };
 *
 * Файлы со звуками можно настроить аналогично. Дополнительно можно указать
 * значение `gain`, чтобы подстроить громкость (например, `{ src: myFx, gain: 0.4 }`).
 */
export const TEXTURE_MANIFEST = {
  [TEXTURE_KEYS.BACKGROUND]: null,
  [TEXTURE_KEYS.WALL]: null,
  [TEXTURE_KEYS.PLAYER]: null,
  [TEXTURE_KEYS.VILLAGER]: null,
  [TEXTURE_KEYS.ZOMBIE]: "/textures/zombie.png",
  [TEXTURE_KEYS.RANGED]: null,
  [TEXTURE_KEYS.GHOST]: null,
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
