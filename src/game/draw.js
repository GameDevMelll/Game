import {
  DAY_DURATION,
  NIGHT_DURATION,
  DAY_NIGHT_CYCLE,
  PLAYER_MAX_HP,
  INVENTORY_SLOTS,
} from "./constants.js";
import { TEXTURE_KEYS } from "./assets.js";
import { clamp, lerpColor, drawFlipped } from "./utils.js";

const ITEM_TEXTURE_MAP = {
  bat: TEXTURE_KEYS.BAT,
  pistol: TEXTURE_KEYS.PISTOL,
  ammo: TEXTURE_KEYS.AMMO,
  medkit: TEXTURE_KEYS.MEDKIT,
  mine: TEXTURE_KEYS.MINE_IDLE,
  shotgun: TEXTURE_KEYS.SHOTGUN,
  axe: TEXTURE_KEYS.AXE,
  machinegun: TEXTURE_KEYS.MACHINEGUN,
  pitchfork: TEXTURE_KEYS.PITCHFORK,
  grenade: TEXTURE_KEYS.GRENADE,
  shield: TEXTURE_KEYS.SHIELD,
};

const WEAPON_TEXTURE_MAP = {
  bat: TEXTURE_KEYS.BAT,
  pistol: TEXTURE_KEYS.PISTOL,
  shotgun: TEXTURE_KEYS.SHOTGUN,
  axe: TEXTURE_KEYS.AXE,
  machinegun: TEXTURE_KEYS.MACHINEGUN,
  pitchfork: TEXTURE_KEYS.PITCHFORK,
  mine: TEXTURE_KEYS.MINE_IDLE,
  grenade: TEXTURE_KEYS.GRENADE,
  shield: TEXTURE_KEYS.SHIELD,
  medkit: TEXTURE_KEYS.MEDKIT,
};

const PLAYER_TEXTURE_MAP = {
  default: TEXTURE_KEYS.PLAYER,
  skin2: TEXTURE_KEYS.PLAYER_ALT_2,
  skin3: TEXTURE_KEYS.PLAYER_ALT_3,
  skin4: TEXTURE_KEYS.PLAYER_ALT_4,
};

const ZOMBIE_TEXTURE_MAP = {
  ghost: TEXTURE_KEYS.GHOST,
  skeleton: TEXTURE_KEYS.SKELETON,
  bomber: TEXTURE_KEYS.BOMBER,
  boss: TEXTURE_KEYS.BOSS,
  boss1: TEXTURE_KEYS.BOSS,
  boss2: TEXTURE_KEYS.BOSS2,
  boss3: TEXTURE_KEYS.BOSS3,
};

const CAT_TEXTURE_MAP = {
  default: TEXTURE_KEYS.CAT,
  variant1: TEXTURE_KEYS.CAT,
  variant2: TEXTURE_KEYS.CAT_VARIANT2,
  variant3: TEXTURE_KEYS.CAT_VARIANT3,
};

const RANGED_TEXTURE_MAP = {
  witch: TEXTURE_KEYS.WITCH,
  white: TEXTURE_KEYS.RANGED,
};

const STACKABLE_UI_ITEMS = new Set(["mine", "medkit", "grenade", "shield"]);

const getTexture = (textures, key) => {
  if (!key) return null;
  return textures?.[key] || null;
};

const drawTextureCircle = (ctx, texture, radius, flipX = false) => {
  if (!texture) return false;
  const img = texture.image;
  if (!img || !img.complete) return false;
  const maxSide = Math.max(img.width, img.height) || 1;
  const scale = (radius * 2) / maxSide;
  const w = img.width * scale;
  const h = img.height * scale;
   if (flipX) {
    drawFlipped(ctx, img, 0, 0, true, w, h);
  } else {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
  return true;
};

const drawTextureRect = (ctx, texture, x, y, width, height) => {
  if (!texture) return false;
  const img = texture.image;
  if (!img || !img.complete) return false;
  ctx.drawImage(img, x, y, width, height);
  return true;
};

const fillWithTexture = (ctx, texture, x, y, width, height) => {
  if (!texture) return false;
  const img = texture.image;
  if (!img || !img.complete) return false;
  if (!texture.patternCache) texture.patternCache = new WeakMap();
  let pattern = texture.patternCache.get(ctx);
  if (!pattern) {
    pattern = ctx.createPattern(img, "repeat");
    if (pattern) texture.patternCache.set(ctx, pattern);
  }
  if (pattern) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return true;
  }
  ctx.drawImage(img, x, y, width, height);
  return true;
};

const drawGroundItem = (ctx, item, textures) => {
  const texture = getTexture(textures, ITEM_TEXTURE_MAP[item.type]);
  if (drawTextureCircle(ctx, texture, 18)) return;
  switch (item.type) {
    case "bat":
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(-16, -4, 34, 8);
      break;
    case "pistol":
      ctx.fillStyle = "#333";
      ctx.fillRect(-10, -4, 20, 8);
      ctx.fillStyle = "#999";
      ctx.fillRect(0, -4, 6, 14);
      break;
    case "ammo":
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "medkit":
      ctx.fillStyle = "#fff";
      ctx.fillRect(-11, -9, 22, 18);
      ctx.fillStyle = "#d33";
      ctx.fillRect(-3, -7, 6, 14);
      ctx.fillRect(-7, -3, 14, 6);
      break;
    case "mine":
      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "shotgun":
      ctx.fillStyle = "#2f2f2f";
      ctx.fillRect(-20, -5, 40, 10);
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(-12, -7, 12, 14);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(6, -3, 14, 6);
      break;
     case "axe":
      ctx.save();
     ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(-3, -24, 6, 48);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(4, -18);
      ctx.lineTo(20, -2);
      ctx.lineTo(4, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
      case "machinegun":
      ctx.fillStyle = "#111827";
      ctx.fillRect(-20, -4, 40, 8);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(-10, -6, 12, 12);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(10, -3, 12, 6);
      break;
    case "pitchfork":
      ctx.save();
      ctx.rotate(Math.PI / 12);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(-3, -24, 6, 48);
      ctx.restore();
      ctx.fillStyle = "#d1d5db";
      ctx.fillRect(6, -18, 3, 36);
      ctx.fillRect(12, -18, 3, 36);
      ctx.fillRect(18, -18, 3, 36);
      break;
    case "grenade":
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#86efac";
      ctx.fillRect(-2, -12, 4, 6);
      break;
    case "shield":
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = "#9ca3af";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
  }
};

const drawWeaponIcon = (ctx, weapon, textures) => {
  const texture = getTexture(textures, WEAPON_TEXTURE_MAP[weapon]);
  if (drawTextureCircle(ctx, texture, 18)) return;
  switch (weapon) {
    case "bat":
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(-14, -4, 28, 8);
      break;
    case "pistol":
      ctx.fillStyle = "#333";
      ctx.fillRect(-10, -4, 20, 8);
      ctx.fillStyle = "#999";
      ctx.fillRect(0, -4, 5, 12);
      break;
    case "shotgun":
      ctx.fillStyle = "#2f2f2f";
      ctx.fillRect(-16, -5, 32, 10);
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(-8, -7, 10, 14);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(8, -3, 10, 6);
      break;
    case "axe":
      ctx.save();
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = "#475569";
      ctx.fillRect(-3, -20, 6, 40);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(6, -16);
      ctx.lineTo(18, -2);
      ctx.lineTo(6, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    case "mine":
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
       case "machinegun":
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-18, -3, 36, 6);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(-6, -6, 12, 12);
      break;
    case "pitchfork":
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(-2, -20, 4, 40);
      ctx.fillStyle = "#d1d5db";
      ctx.fillRect(6, -16, 3, 32);
      ctx.fillRect(12, -16, 3, 32);
      ctx.fillRect(18, -16, 3, 32);
      break;
    case "grenade":
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#86efac";
      ctx.fillRect(-2, -11, 4, 5);
      break;
    case "shield":
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case "medkit":
      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-6, -2, 12, 4);
      break;
    default:
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
  }
};

const drawHeldWeapon = (ctx, weapon, textures, playerRadius, swing) => {
  if (!weapon) return false;
  const textureKey = WEAPON_TEXTURE_MAP[weapon] || ITEM_TEXTURE_MAP[weapon];
  const texture = getTexture(textures, textureKey);
  if (texture?.image && texture.image.complete) {
    const img = texture.image;
    const maxSide = Math.max(img.width, img.height) || 1;
    const sizeMultiplier = weapon === "shield" ? 2.6 : weapon === "mine" ? 1 : 1.4;
    const scale = ((playerRadius * sizeMultiplier) / maxSide) * (weapon === "machinegun" ? 1.1 : 1);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    const offset = weapon === "shield" ? playerRadius * 0.1 : playerRadius * 0.7;
    ctx.translate(offset, 0);
    if (weapon === "bat" && swing > 0) {
      const swingT = Math.max(0, swing) / 0.28;
      const extraRot = swingT > 0 ? -1.2 + (1 - swingT) * 1.2 : 0;
      ctx.rotate(extraRot);
    }
    if (weapon === "axe") ctx.rotate(0.18);
    if (weapon === "pitchfork") ctx.rotate(0.08);
    if (weapon === "machinegun") ctx.rotate(0.04);
    ctx.drawImage(img, -w * 0.1, -h / 2, w, h);
    ctx.restore();
    if (weapon === "shield") {
      ctx.save();
      ctx.fillStyle = "rgba(59,130,246,0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius + 20, -Math.PI / 6, Math.PI / 6);
      ctx.fill();
      ctx.restore();
    }
    return true;
  }
  return false;
};

export function draw(ctx, state, mode, bestScore) {
  const p = state.player;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const villagers = state.villagers ?? [];
  const villagerCount = villagers.length;
  const cats = state.cats ?? [];
  const catCount = cats.length;
  const textures = state.assets?.textures || {};

  // day-night
  const t = state.dayTime % DAY_NIGHT_CYCLE;
  let nightK = 0;
  if (t < DAY_DURATION) nightK = t / DAY_DURATION;
  else nightK = 1 - (t - DAY_DURATION) / NIGHT_DURATION;
  const ease = (x) => x * x * (3 - 2 * x);
  nightK = ease(clamp(nightK, 0, 1));

  ctx.clearRect(0, 0, w, h);

  const dayCol = { r: 226, g: 232, b: 240 };
  const nightCol = { r: 15, g: 23, b: 42 };
  const bgR = Math.round(dayCol.r + (nightCol.r - dayCol.r) * nightK);
  const bgG = Math.round(dayCol.g + (nightCol.g - dayCol.g) * nightK);
  const bgB = Math.round(dayCol.b + (nightCol.b - dayCol.b) * nightK);
  const backgroundTexture = getTexture(textures, TEXTURE_KEYS.BACKGROUND);
  if (!fillWithTexture(ctx, backgroundTexture, 0, 0, w, h)) {
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = `rgba(${bgR}, ${bgG}, ${bgB}, ${0.25 + nightK * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  // camera
  ctx.save();
  const camX = p.x - w / 2;
  const camY = p.y - h / 2;
  ctx.translate(-camX, -camY);

  // walls
  const wallTexture = getTexture(textures, TEXTURE_KEYS.WALL);
  for (const wall of state.walls) {
    if (!drawTextureRect(ctx, wallTexture, wall.x, wall.y, wall.w, wall.h)) {
      ctx.fillStyle = "#92a086";
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    }
  }

  // grid
  const tile = 110;
  const gridCol = lerpColor(
    { r: 148, g: 163, b: 184, a: 0.55 },
    { r: 48, g: 64, b: 51, a: 1 },
    nightK
  );
  ctx.strokeStyle = gridCol;
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

  // items
  for (const it of state.items) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    drawGroundItem(ctx, it, textures);
    ctx.restore();
  }

  // mines
  const mineIdleTexture = getTexture(textures, TEXTURE_KEYS.MINE_IDLE);
  const mineArmedTexture = getTexture(textures, TEXTURE_KEYS.MINE_ARMED);
  for (const m of state.mines) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const texture = m.state === "armed" ? mineArmedTexture : mineIdleTexture;
    if (!drawTextureCircle(ctx, texture, 14)) {
      ctx.fillStyle = m.state === "armed" ? "#991b1b" : "#444";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = m.state === "armed" ? "#dc2626" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // bombs
  const bombTexture = getTexture(textures, TEXTURE_KEYS.BOMB);
  for (const bomb of state.bombs) {
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!drawTextureCircle(ctx, bombTexture, 16)) {
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  // grenades in flight
  const grenadeTexture = getTexture(textures, TEXTURE_KEYS.GRENADE);
  for (const grenade of state.grenades) {
    ctx.save();
    ctx.translate(grenade.x, grenade.y);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!drawTextureCircle(ctx, grenadeTexture, 10)) {
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#86efac";
      ctx.fillRect(-2, -10, 4, 5);
    }
    ctx.restore();
  }

  // explosions
  const explosionTexture = getTexture(textures, TEXTURE_KEYS.EXPLOSION);
  for (const ex of state.explosions) {
    const alpha = Math.max(0, ex.life / 0.35);
    if (explosionTexture) {
      ctx.save();
      ctx.translate(ex.x, ex.y);
      ctx.globalAlpha = alpha;
      drawTextureCircle(ctx, explosionTexture, ex.r);
      ctx.restore();
    } else {
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

  // slashes
  const slashTexture = getTexture(textures, TEXTURE_KEYS.SLASH);
  for (const slash of state.slashes) {
    const alpha = clamp((slash.life ?? 0) / (slash.maxLife || 0.001), 0, 1);
    const radius = slash.radius ?? 140;
    ctx.save();
    ctx.translate(slash.x, slash.y);
    ctx.rotate(slash.ang);
    if (slashTexture) {
      ctx.globalAlpha = alpha;
      drawTextureCircle(ctx, slashTexture, radius);
    } else {
      ctx.globalAlpha = alpha * 0.45;
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(0, 0, radius, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.22;
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.82, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // villagers
  const villagerTexture = getTexture(textures, TEXTURE_KEYS.VILLAGER);
  for (const v of villagers) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 7, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const drawnVillager = drawTextureCircle(ctx, villagerTexture, v.r, v.facingDir === "left");
    if (!drawnVillager) {
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(0, 0, v.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(-5, -3, 2, 2);
      ctx.fillRect(3, -3, 2, 2);
    }
    const ratio = clamp(v.hp / (v.maxHp || 1), 0, 1);
    ctx.fillStyle = "rgba(15,23,42,0.6)";
    ctx.fillRect(-18, -v.r - 12, 36, 4);
    ctx.fillStyle = "#34d399";
    ctx.fillRect(-18, -v.r - 12, 36 * ratio, 4);
    ctx.restore();
  }

   // cats
  for (const cat of cats) {
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 5, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    const catTextureKey = CAT_TEXTURE_MAP[cat.skin] || TEXTURE_KEYS.CAT;
    const catTexture = getTexture(textures, catTextureKey);
    const drawnCat = drawTextureCircle(ctx, catTexture, cat.r, cat.facingDir === "left");
    if (!drawnCat) {
      let furColor = "#f8fafc";
      if (cat.skin === "variant2") furColor = "#facc15";
      else if (cat.skin === "variant3") furColor = "#38bdf8";
      ctx.fillStyle = furColor;
      ctx.beginPath();
      ctx.arc(0, 0, cat.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(-4, -2, 2, 2);
      ctx.fillRect(2, -2, 2, 2);
      ctx.beginPath();
      ctx.moveTo(-5, cat.r * 0.3);
      ctx.lineTo(-9, cat.r * 0.7);
      ctx.moveTo(5, cat.r * 0.3);
      ctx.lineTo(9, cat.r * 0.7);
      ctx.strokeStyle = furColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const ratio = clamp(cat.hp / (cat.maxHp || 1), 0, 1);
    ctx.fillStyle = "rgba(15,23,42,0.5)";
    ctx.fillRect(-14, -cat.r - 10, 28, 3);
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(-14, -cat.r - 10, 28 * ratio, 3);
    ctx.restore();
  }

  // zombies
  for (const z of state.zombies) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    if (z.behavior === "charge" && z.state === "windup") {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, z.r + 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (z.behavior === "leap" && z.state === "windup") {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, z.r + 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const textureKey = z.textureKey || ZOMBIE_TEXTURE_MAP[z.kind] || TEXTURE_KEYS.ZOMBIE;
    const zombieTexture = getTexture(textures, textureKey);
    let alpha = 1;
    if (z.kind === "ghost") alpha = 0.55;
    ctx.globalAlpha = alpha;
    const drewZombie = drawTextureCircle(ctx, zombieTexture, z.r, z.facingDir === "left");
    if (!drewZombie) {
      let bodyColor = "#7fb36a";
      if (z.kind === "fat") bodyColor = "#6b8f57";
      else if (z.kind === "small") bodyColor = "#9bd382";
      else if (z.kind === "brute") bodyColor = "#92400e";
      else if (z.kind === "ghost") bodyColor = "#f8fafc";
      else if (z.kind === "skeleton") bodyColor = "#e2e8f0";
      else if (z.kind === "bomber") bodyColor = "#f97316";
      else if (z.kind === "boss" || z.kind === "boss1") bodyColor = "#166534";
      else if (z.kind === "boss2") bodyColor = z.phase === "stage2" ? "#b91c1c" : "#c2410c";
      else if (z.kind === "boss3") bodyColor = "#1f2937";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, z.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = z.kind === "skeleton" ? "#111" : "#112";
      ctx.fillRect(-6, -3, 3, 2);
      ctx.fillRect(3, -3, 3, 2);
      if (z.kind === "boss" || z.kind === "boss1") {
        ctx.save();
        ctx.rotate(0.3);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(z.r * 0.4, -6, 36, 12);
        ctx.restore();
      } else if (z.kind === "boss2") {
        ctx.fillStyle = z.phase === "stage2" ? "#fcd34d" : "#fee2e2";
        ctx.beginPath();
        ctx.arc(0, -z.r * 0.2, z.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        if (z.phase === "stage2") {
          ctx.strokeStyle = "rgba(239,68,68,0.6)";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, z.r + 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (z.kind === "boss3") {
        ctx.save();
        ctx.rotate(0.18);
        ctx.fillStyle = "#f97316";
        ctx.fillRect(z.r * 0.25, -8, 44, 16);
        ctx.restore();
      } else if (z.kind === "bomber") {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(-4, z.r - 6, 8, 8);
      }
    } else {
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
    const ratio = clamp(z.hp / (z.maxHp || 34), 0, 1);
    ctx.fillStyle = "#111";
    ctx.fillRect(-16, -z.r - 10, 32, 4);
    ctx.fillStyle = "#eb5757";
    ctx.fillRect(-16, -z.r - 10, 32 * ratio, 4);
    ctx.restore();
  }

  // shooters
  const defaultRangedTexture = getTexture(textures, TEXTURE_KEYS.RANGED);
  for (const wht of state.whites) {
    const isWitch = wht.type === "witch";
    const maxHp = wht.maxHp || (isWitch ? 68 : 28);
    ctx.save();
    ctx.translate(wht.x, wht.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 8, (isWitch ? 26 : 22), (isWitch ? 13 : 11), 0, 0, Math.PI * 2);
    ctx.fill();
    const rangedTexture = getTexture(textures, RANGED_TEXTURE_MAP[wht.type]) || defaultRangedTexture;
    const drewRanged = drawTextureCircle(ctx, rangedTexture, wht.r, wht.facingDir === "left");
    if (!drewRanged) {
      ctx.fillStyle = isWitch ? "#7c3aed" : "#e2e8f0";
      ctx.beginPath();
      ctx.arc(0, 0, wht.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isWitch ? "#fcd34d" : "#0f172a";
      ctx.fillRect(-6, -3, 3, 2);
      ctx.fillRect(3, -3, 3, 2);
      if (isWitch) {
        ctx.fillStyle = "rgba(236,72,153,0.6)";
        ctx.beginPath();
        ctx.arc(0, 0, wht.r + 10, Math.PI * 0.1, Math.PI * 0.6);
        ctx.strokeStyle = "rgba(216,180,254,0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    const ratioW = clamp(wht.hp / maxHp, 0, 1);
    ctx.fillStyle = "#111";
    ctx.fillRect(-16, -wht.r - 10, 32, 4);
    ctx.fillStyle = isWitch ? "#a855f7" : "#eb5757";
    ctx.fillRect(-16, -wht.r - 10, 32 * ratioW, 4);
    ctx.restore();
  }

  // bullets
  const playerBulletTexture = getTexture(textures, TEXTURE_KEYS.PROJECTILE_PLAYER);
  for (const b of state.bullets) {
    const radius = b.radius ?? 3;
    if (playerBulletTexture) {
      ctx.save();
      ctx.translate(b.x, b.y);
      drawTextureCircle(ctx, playerBulletTexture, radius);
      ctx.restore();
    } else {
      ctx.fillStyle = radius > 3 ? "#facc15" : "#111";
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // enemy bullets
  const enemyBulletTexture = getTexture(textures, TEXTURE_KEYS.PROJECTILE_ENEMY);
  for (const eb of state.enemyBullets) {
    if (enemyBulletTexture) {
      ctx.save();
      ctx.translate(eb.x, eb.y);
      drawTextureCircle(ctx, enemyBulletTexture, 4);
      ctx.restore();
    } else {
      ctx.fillStyle = eb.color || "#f97316";
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // player
  const flipPlayer = p.facingDir === "left";
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  const playerTextureKey = PLAYER_TEXTURE_MAP[p.skin] || TEXTURE_KEYS.PLAYER;
  const playerTexture = getTexture(textures, playerTextureKey);
  const playerDrawn = drawTextureCircle(ctx, playerTexture, p.r, flipPlayer);
  if (!playerDrawn) {
    ctx.save();
    if (flipPlayer) ctx.scale(-1, 1);
    let bodyColor = "#4f9ee3";
    if (p.skin === "skin2") bodyColor = "#34d399";
    else if (p.skin === "skin3") bodyColor = "#facc15";
    else if (p.skin === "skin4") bodyColor = "#f97316";
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.arc(7, 4, 2, 0, Math.PI * 2);
    ctx.fill();
   ctx.restore();
  }
  ctx.restore();

  // weapon overlay
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);
  const weaponType = p.weapon;
  const drawnWeapon = drawHeldWeapon(ctx, weaponType, textures, p.r, p.swing);
  if (!drawnWeapon && weaponType) {
    if (weaponType === "bat") {
      const swingT = Math.max(0, p.swing) / 0.28;
      const extraRot = swingT > 0 ? -1.2 + (1 - swingT) * 1.2 : 0;
      ctx.save();
      ctx.rotate(extraRot);
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(p.r * 0.6, -3, 16, 6);
      ctx.restore();
    } else if (weaponType === "pistol") {
      ctx.fillStyle = "#333";
      ctx.fillRect(p.r * 0.6, -3, 10, 6);
    } else if (weaponType === "shotgun") {
      ctx.fillStyle = "#2f2f2f";
      ctx.fillRect(p.r * 0.4, -4, 20, 8);
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(p.r * 0.4 + 6, -6, 8, 12);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(p.r * 0.4 + 16, -3, 8, 6);
    } else if (weaponType === "axe") {
      ctx.save();
      ctx.rotate(0.2);
      ctx.fillStyle = "#334155";
      ctx.fillRect(p.r * 0.1, -3, 8, 36);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(p.r * 0.1 + 4, -26);
      ctx.lineTo(p.r * 0.1 + 24, 0);
      ctx.lineTo(p.r * 0.1 + 4, 26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (weaponType === "machinegun") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(p.r * 0.3, -3, 24, 6);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(p.r * 0.3 + 6, -5, 10, 10);
    } else if (weaponType === "pitchfork") {
      ctx.save();
      ctx.rotate(0.05);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(p.r * 0.2, -3, 6, 40);
      ctx.fillStyle = "#d1d5db";
      ctx.fillRect(p.r * 0.2 + 14, -16, 4, 32);
      ctx.fillRect(p.r * 0.2 + 20, -16, 4, 32);
      ctx.fillRect(p.r * 0.2 + 26, -16, 4, 32);
      ctx.restore();
    } else if (weaponType === "mine") {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(p.r * 0.6, -3, 10, 6);
    } else if (weaponType === "grenade") {
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(p.r * 0.5, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (weaponType === "shield") {
      ctx.fillStyle = "rgba(59,130,246,0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 20, -Math.PI / 6, Math.PI / 6);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore(); // camera

  const bossCandidate = state.zombies.find((z) => z.kind && z.kind.startsWith("boss")) || null;
  if (bossCandidate) {
    const ratio = clamp(bossCandidate.hp / (bossCandidate.maxHp || 1), 0, 1);
    const barWidth = Math.min(520, w - 160);
    const barX = w / 2 - barWidth / 2;
    const barY = 18;
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillRect(barX, barY, barWidth, 10);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(barX, barY, barWidth * ratio, 10);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.strokeRect(barX, barY, barWidth, 10);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    const labelMap = { boss1: "Босс №1", boss2: "Босс №2", boss3: "Босс №3" };
    const label = labelMap[bossCandidate.kind] || "Босс";
    ctx.fillText(label, w / 2, barY - 6);
    ctx.textAlign = "left";
  }

  // HUD: HP
  const hudW = 220;
  ctx.fillStyle = "rgba(15,23,42,0.7)";
  ctx.fillRect(18, 16, hudW, 74);
  ctx.fillStyle = "#fff";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HP", 26, 36);
  const hpRatio = clamp(p.hp / (p.maxHp || PLAYER_MAX_HP), 0, 1);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(56, 22, hpRatio * (hudW - 66), 18);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.strokeRect(56, 22, hudW - 66, 18);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`Lv ${p.level}`, 26, 54);
  const xpRatio = clamp(p.xp / (p.nextLevelXp || 1), 0, 1);
  ctx.fillStyle = "rgba(96,165,250,0.35)";
  ctx.fillRect(56, 46, hudW - 66, 10);
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(56, 46, xpRatio * (hudW - 66), 10);
  ctx.fillStyle = "#cbd5f5";
  ctx.fillText(`XP ${Math.round(p.xp)} / ${p.nextLevelXp}`, 56, 62);
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`Патроны: ${p.ammo}`, 26, 72);

  // HUD: оружие
  ctx.fillStyle = "rgba(15,23,42,0.65)";
  ctx.fillRect(w - 230, 16, 210, 96);
  ctx.fillStyle = "#fff";
  ctx.fillText(`Оружие: ${p.weapon ? p.weapon : "—"}`, w - 220, 36);
  ctx.fillText(`Жители: ${villagerCount}`, w - 220, 56);
  ctx.fillText(`Кошки: ${catCount}`, w - 220, 72);
  const grenadeCount = Array.isArray(p.inventory)
    ? p.inventory.reduce((s, slot) => (slot?.type === "grenade" ? s + (slot.count ?? 1) : s), 0)
    : 0;
  ctx.fillText(`Гранат: ${grenadeCount}`, w - 220, 88);

  // kills (без рекорда)
  ctx.fillStyle = "rgba(15,23,42,0.65)";
  ctx.fillRect(14, h - 88, 196, 72);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(`Убито: ${state.kills}`, 22, h - 64);
  ctx.fillText(`Жители: ${villagerCount}`, 22, h - 40);
  ctx.fillText(`Кошки: ${catCount}`, 22, h - 16);

  // инвентарь (10 слотов)
  const invSlots = INVENTORY_SLOTS;
  const slotSize = 42;
  const slotGap = 4;
  const invTotalW = invSlots * slotSize + (invSlots - 1) * slotGap;
  const invX = w / 2 - invTotalW / 2;
  const invY = h - 76;
  const inventory = Array.isArray(p.inventory) ? p.inventory : [];
  for (let i = 0; i < invSlots; i++) {
    const sx = invX + i * (slotSize + slotGap);
    const sy = invY;
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.fillRect(sx, sy, slotSize, slotSize);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(sx, sy, slotSize, slotSize);
    const slot = inventory[i];
    const type = slot?.type;
    if (type) {
      ctx.save();
      ctx.translate(sx + slotSize / 2, sy + slotSize / 2);
      drawWeaponIcon(ctx, type, textures);
      ctx.restore();
    }
     if (p.selectedSlot === i) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 1, sy - 1, slotSize + 2, slotSize + 2);
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    const keyLabel = i === 9 ? "0" : String(i + 1);
    ctx.fillText(keyLabel, sx + 5, sy + 13);
    if (type && STACKABLE_UI_ITEMS.has(type)) {
      const count = slot?.count ?? 0;
      if (count > 0) {
        ctx.save();
        ctx.translate(sx + slotSize - 10, sy + slotSize - 10);
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f8fafc";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(count), 0, 1);
        ctx.restore();
      }
    }
  }

  // night overlay
  if (nightK > 0.05) {
    ctx.fillStyle = `rgba(15,23,42,${0.35 * nightK})`;
    ctx.fillRect(0, 0, w, h);
  }

  // overlays
  if (mode === "start") {
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 38px system-ui, sans-serif";
    ctx.fillText("Mope-like Survival", w / 2, h / 2 - 60);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("WASD — движение, мышь/Space — атака, E — подобрать, Q — аптечка", w / 2, h / 2 - 20);
    ctx.fillText("Берегите жителей — монстры охотятся и за ними", w / 2, h / 2 + 4);
    ctx.fillText("Нажмите ЛКМ или Space, чтобы начать", w / 2, h / 2 + 28);
  } else if (mode === "pause") {
    ctx.fillStyle = "rgba(15,23,42,0.6)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.fillText("Пауза", w / 2, h / 2 - 8);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("Нажмите Esc, чтобы продолжить", w / 2, h / 2 + 26);
  } else if (mode === "dead") {
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.fillText("Вы погибли", w / 2, h / 2 - 40);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(`Убито: ${state.kills}`, w / 2, h / 2);
    ctx.fillText(`Рекорд: ${bestScore}`, w / 2, h / 2 + 26);
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("Нажмите R, чтобы сыграть снова", w / 2, h / 2 + 54);
  }
}
