import {
  DAY_DURATION,
  NIGHT_DURATION,
  DAY_NIGHT_CYCLE,
  PLAYER_MAX_HP,
  DASH_COOLDOWN,
} from "./constants.js";
import { clamp, lerpColor } from "./utils.js";

export function draw(ctx, state, mode, bestScore) {
  const p = state.player;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // ====== day/night ======
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

  // ====== camera ======
  ctx.save();
  const camX = p.x - w / 2;
  const camY = p.y - h / 2;
  ctx.translate(-camX, -camY);

  // walls
  ctx.fillStyle = "#92a086";
  for (const wall of state.walls) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }

  // grid with transition
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
    if (it.type === "bat") {
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(-16, -4, 34, 8);
    } else if (it.type === "pistol") {
      ctx.fillStyle = "#333";
      ctx.fillRect(-10, -4, 20, 8);
      ctx.fillStyle = "#999";
      ctx.fillRect(0, -4, 6, 14);
    } else if (it.type === "ammo") {
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (it.type === "medkit") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(-11, -9, 22, 18);
      ctx.fillStyle = "#d33";
      ctx.fillRect(-3, -7, 6, 14);
      ctx.fillRect(-7, -3, 14, 6);
    } else if (it.type === "mine") {
      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // zombies
  for (const z of state.zombies) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7fb36a";
    ctx.beginPath();
    ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#112";
    ctx.fillRect(-6, -3, 3, 2);
    ctx.fillRect(3, -3, 3, 2);
    const ratio = clamp(z.hp / (z.maxHp || 34), 0, 1);
    ctx.fillStyle = "#111";
    ctx.fillRect(-16, -z.r - 10, 32, 4);
    ctx.fillStyle = "#eb5757";
    ctx.fillRect(-16, -z.r - 10, 32 * ratio, 4);
    ctx.restore();
  }

  // shooters
  for (const wht of state.whites) {
    ctx.save();
    ctx.translate(wht.x, wht.y);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 22, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(0, 0, wht.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-6, -3, 3, 2);
    ctx.fillRect(3, -3, 3, 2);
    const ratioW = clamp(wht.hp / 28, 0, 1);
    ctx.fillStyle = "#111";
    ctx.fillRect(-16, -wht.r - 10, 32, 4);
    ctx.fillStyle = "#eb5757";
    ctx.fillRect(-16, -wht.r - 10, 32 * ratioW, 4);
    ctx.restore();
  }

  // bullets
  ctx.fillStyle = "#111";
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
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
  } else if (p.weapon === "mine") {
    ctx.fillStyle = "#444";
    ctx.fillRect(p.r * 0.6, -3, 10, 6);
  }
  ctx.restore();

  ctx.restore(); // camera

  // ====== HUD ======
  // HP
  const hudW = 220;
  ctx.fillStyle = "rgba(15,23,42,0.65)";
  ctx.fillRect(18, 16, hudW, 30);
  ctx.fillStyle = "#fff";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HP", 26, 36);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(56, 22, (p.hp / PLAYER_MAX_HP) * (hudW - 66), 18);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.strokeRect(56, 22, hudW - 66, 18);

  // DASH бар (под HP)
  const dashY = 50;
  const dashW = hudW;
  ctx.fillStyle = "rgba(15,23,42,0.35)";
  ctx.fillRect(18, dashY, dashW, 6);
  let dashRatio = 1;
  if (p.dashCD > 0) {
    dashRatio = 1 - Math.min(1, p.dashCD / DASH_COOLDOWN);
  }
  ctx.fillStyle = dashRatio >= 1 ? "#22c55e" : "#94a3b8";
  ctx.fillRect(18, dashY, dashW * dashRatio, 6);

  // weapon HUD
  ctx.fillStyle = "rgba(15,23,42,0.65)";
  ctx.fillRect(w - 230, 16, 210, 74);
  ctx.fillStyle = "#fff";
  ctx.fillText(`Оружие: ${p.weapon ? p.weapon : "—"}`, w - 220, 36);
  ctx.fillText(`Патроны: ${p.ammo}`, w - 220, 56);
  ctx.fillText(`Мины: ${p.mines}`, w - 220, 72);

  // kills (без рекорда)
  ctx.fillStyle = "rgba(15,23,42,0.65)";
  ctx.fillRect(14, h - 64, 180, 44);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(`Убито: ${state.kills}`, 22, h - 40);

  // инвентарь
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
      if (wpn === "bat") {
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(-14, -4, 28, 8);
      } else if (wpn === "pistol") {
        ctx.fillStyle = "#333";
        ctx.fillRect(-10, -4, 20, 8);
        ctx.fillStyle = "#999";
        ctx.fillRect(0, -4, 5, 12);
      } else if (wpn === "mine") {
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }
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
    ctx.fillText("WASD — движение, мышь/Space — атака, E — подобрать, Q — сменить", w / 2, h / 2 - 20);
    ctx.fillText("Shift — рывок", w / 2, h / 2 + 4);
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
