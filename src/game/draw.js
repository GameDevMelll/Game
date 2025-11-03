import {
  DAY_DURATION,
  NIGHT_DURATION,
  DAY_NIGHT_CYCLE,
  PLAYER_MAX_HP,
} from "./constants.js";
import { clamp, lerpColor } from "./utils.js";

const drawGroundItem = (ctx, item) => {
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
    case "glaive":
      ctx.save();
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(-4, -26, 8, 52);
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(-10, -32);
      ctx.lineTo(18, -6);
      ctx.lineTo(-10, 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    default:
      ctx.fillStyle = "#9ca3af";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
  }
};

const drawWeaponIcon = (ctx, weapon) => {
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
    case "glaive":
      ctx.save();
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(-3, -20, 6, 40);
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.lineTo(14, -8);
      ctx.lineTo(-8, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    case "mine":
      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
  }
};

export function draw(ctx, state, mode, bestScore) {
  const p = state.player;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

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
  ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
  ctx.fillRect(0, 0, w, h);

  // camera
  ctx.save();
  const camX = p.x - w / 2;
  const camY = p.y - h / 2;
  ctx.translate(-camX, -camY);

  // walls
  ctx.fillStyle = "#92a086";
  for (const wall of state.walls) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
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
    drawGroundItem(ctx, it);
    ctx.restore();
  }

  // mines
  for (const m of state.mines) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = m.state === "armed" ? "#dc2626" : "#38bdf8";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // explosions
  for (const ex of state.explosions) {
    const alpha = Math.max(0, ex.life / 0.35);
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

  // slashes
  for (const slash of state.slashes) {
    const alpha = clamp((slash.life ?? 0) / (slash.maxLife || 0.001), 0, 1);
    const radius = slash.radius ?? 140;
    ctx.save();
    ctx.translate(slash.x, slash.y);
    ctx.rotate(slash.ang);
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
    ctx.restore();
  }

  // villagers
  for (const v of state.villagers ?? []) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 7, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    ctx.arc(0, 0, v.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-5, -3, 2, 2);
    ctx.fillRect(3, -3, 2, 2);
    const ratio = clamp(v.hp / (v.maxHp || 1), 0, 1);
    ctx.fillStyle = "rgba(15,23,42,0.6)";
    ctx.fillRect(-18, -v.r - 12, 36, 4);
    ctx.fillStyle = "#34d399";
    ctx.fillRect(-18, -v.r - 12, 36 * ratio, 4);
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
    let bodyColor = "#7fb36a";
    let alpha = 1;
    if (z.kind === "fat") bodyColor = "#6b8f57";
    else if (z.kind === "small") bodyColor = "#9bd382";
    else if (z.kind === "brute") bodyColor = "#92400e";
    else if (z.kind === "ghost") {
      bodyColor = "#f8fafc";
      alpha = 0.55;
    } else if (z.kind === "skeleton") {
      bodyColor = "#e2e8f0";
    } else if (z.kind === "bomber") {
      bodyColor = "#f97316";
    } else if (z.kind === "boss") {
      bodyColor = "#166534";
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = z.kind === "skeleton" ? "#111" : "#112";
    ctx.fillRect(-6, -3, 3, 2);
    ctx.fillRect(3, -3, 3, 2);
    if (z.kind === "boss") {
      ctx.save();
      ctx.rotate(0.3);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(z.r * 0.4, -6, 36, 12);
      ctx.restore();
    } else if (z.kind === "bomber") {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(-4, z.r - 6, 8, 8);
    }
    const ratio = clamp(z.hp / (z.maxHp || 34), 0, 1);
    ctx.fillStyle = "#111";
    ctx.fillRect(-16, -z.r - 10, 32, 4);
    ctx.fillStyle = "#eb5757";
    ctx.fillRect(-16, -z.r - 10, 32 * ratio, 4);
    ctx.restore();
  }

  // shooters
  for (const wht of state.whites) {
    const isWitch = wht.type === "witch";
    const maxHp = wht.maxHp || (isWitch ? 68 : 28);
    ctx.save();
    ctx.translate(wht.x, wht.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 8, (isWitch ? 26 : 22), (isWitch ? 13 : 11), 0, 0, Math.PI * 2);
    ctx.fill();
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
    const ratioW = clamp(wht.hp / maxHp, 0, 1);
    ctx.fillStyle = "#111";
    ctx.fillRect(-16, -wht.r - 10, 32, 4);
    ctx.fillStyle = isWitch ? "#a855f7" : "#eb5757";
    ctx.fillRect(-16, -wht.r - 10, 32 * ratioW, 4);
    ctx.restore();
  }

  // bullets
  for (const b of state.bullets) {
    const radius = b.radius ?? 3;
    ctx.fillStyle = radius > 3 ? "#facc15" : "#111";
    ctx.beginPath();
    ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // enemy bullets
  ctx.fillStyle = "#f97316";
  for (const eb of state.enemyBullets) {
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // player
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.facing);
  ctx.fillStyle = "#4f9ee3";
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(7, -4, 2, 0, Math.PI * 2);
  ctx.arc(7, 4, 2, 0, Math.PI * 2);
  ctx.fill();
  if (p.weapon === "bat") {
    const swingT = Math.max(0, p.swing) / 0.28;
    const extraRot = swingT > 0 ? -1.2 + (1 - swingT) * 1.2 : 0;
    ctx.save();
    ctx.rotate(extraRot);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(p.r * 0.6, -3, 16, 6);
    ctx.restore();
  } else if (p.weapon === "pistol") {
    ctx.fillStyle = "#333";
    ctx.fillRect(p.r * 0.6, -3, 10, 6);
  } else if (p.weapon === "shotgun") {
    ctx.fillStyle = "#2f2f2f";
    ctx.fillRect(p.r * 0.4, -4, 20, 8);
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(p.r * 0.4 + 6, -6, 8, 12);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(p.r * 0.4 + 16, -3, 8, 6);
  } else if (p.weapon === "glaive") {
    ctx.save();
    ctx.rotate(0.2);
    ctx.fillStyle = "#334155";
    ctx.fillRect(p.r * 0.1, -3, 8, 36);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(p.r * 0.1 + 4, -26);
    ctx.lineTo(p.r * 0.1 + 24, 0);
    ctx.lineTo(p.r * 0.1 + 4, 26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (p.weapon === "mine") {
    ctx.fillStyle = "#444";
    ctx.fillRect(p.r * 0.6, -3, 10, 6);
  }
  ctx.restore();

  ctx.restore(); // camera

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
  ctx.fillStyle = "#fef08a";
  ctx.fillText(`Аптечки: ${p.medkits || 0}`, 26, 72);

  // HUD: оружие
  ctx.fillStyle = "rgba(15,23,42,0.65)";
  ctx.fillRect(w - 230, 16, 210, 96);
  ctx.fillStyle = "#fff";
  ctx.fillText(`Оружие: ${p.weapon ? p.weapon : "—"}`, w - 220, 36);
  ctx.fillText(`Патроны: ${p.ammo}`, w - 220, 56);
  ctx.fillText(`Мины: ${p.mines}`, w - 220, 72);
  ctx.fillText(`Жители: ${state.villagers?.length ?? 0}`, w - 220, 88);

  // kills (без рекорда)
  ctx.fillStyle = "rgba(15,23,42,0.65)";
  ctx.fillRect(14, h - 76, 196, 60);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(`Убито: ${state.kills}`, 22, h - 52);
  ctx.fillText(`Жители: ${state.villagers?.length ?? 0}`, 22, h - 28);

  // инвентарь (5 слотов)
  const invSlots = 5;
  const slotSize = 42;
  const slotGap = 4;
  const invTotalW = invSlots * slotSize + (invSlots - 1) * slotGap;
  const invX = w / 2 - invTotalW / 2;
  const invY = h - 76;
  const weapons = p.weapons || [];
  for (let i = 0; i < invSlots; i++) {
    const sx = invX + i * (slotSize + slotGap);
    const sy = invY;
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.fillRect(sx, sy, slotSize, slotSize);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(sx, sy, slotSize, slotSize);
    const wpn = weapons[i];
    if (wpn) {
      ctx.save();
      ctx.translate(sx + slotSize / 2, sy + slotSize / 2);
      drawWeaponIcon(ctx, wpn);
      ctx.restore();
    }
    if (p.weapon === wpn) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 1, sy - 1, slotSize + 2, slotSize + 2);
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(i + 1), sx + 5, sy + 13);
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
