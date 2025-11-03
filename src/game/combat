// src/game/combat.js
import { MELEE_RANGE, MELEE_DAMAGE, BULLET_SPEED } from "./constants.js";

// state: {
//   player,
//   zombies,
//   shooters,
//   bullets,
//   mines,
//   flash: (msg) => {}
// }

export function attack(state) {
  const p = state.player;
  if (!p) return;

  // 1. если КД — выходим сразу
  if (p.attackCD > 0) return;

  // 2. если оружия нет — тоже выходим
  if (!p.weapon) return;

  const zombies = state.zombies || [];
  const shooters = state.shooters || [];
  const bullets = state.bullets || [];
  const mines = state.mines || [];

  // ===== БИТА =====
  if (p.weapon === "bat") {
    // если вокруг вообще никого нет — только анимация и быстрый выход
    if (zombies.length === 0 && shooters.length === 0) {
      p.attackCD = 0.38;
      p.swing = 0.22;
      return;
    }

    const range2 = (p.r + MELEE_RANGE) ** 2;
    let hitCount = 0;
    const MAX_HITS = 12; // главное — не бить по 40+ целям за раз

    // сначала — зомби
    for (let i = 0; i < zombies.length && hitCount < MAX_HITS; i++) {
      const z = zombies[i];
      const dx = z.x - p.x;
      const dy = z.y - p.y;
      if (dx * dx + dy * dy <= range2) {
        z.hp -= MELEE_DAMAGE * 1.8;
        hitCount++;
      }
    }

    // потом — стрелки
    for (let i = 0; i < shooters.length && hitCount < MAX_HITS; i++) {
      const w = shooters[i];
      const dx = w.x - p.x;
      const dy = w.y - p.y;
      if (dx * dx + dy * dy <= range2) {
        w.hp -= MELEE_DAMAGE * 1.5;
        hitCount++;
      }
    }

    // кд и анимация
    p.attackCD = 0.38;
    p.swing = 0.22;
    return;
  }

  // ===== ПИСТОЛЕТ =====
  if (p.weapon === "pistol") {
    if (p.ammo > 0) {
      bullets.push({
        x: p.x,
        y: p.y,
        ang: p.facing,
        life: 1.2,
        speed: BULLET_SPEED,
      });
      p.ammo -= 1;
      p.attackCD = 0.22;
    } else {
      if (state.flash) state.flash("Нет патронов");
      p.attackCD = 0.15;
    }
    return;
  }

  // ===== МИНА =====
  if (p.weapon === "mine") {
    if (p.mines > 0) {
      mines.push({
        x: p.x,
        y: p.y,
        r: 14,
        state: "arming",
        timer: 3, // 3 секунды до активации
        id: Math.random().toString(36).slice(2),
      });
      p.mines -= 1;
      p.attackCD = 0.3;
      if (state.flash) state.flash("Мина установлена (3с)");
      // если мины кончились — переключаемся на первое оружие
      if (p.mines <= 0) {
        if (Array.isArray(p.weapons) && p.weapons.length > 0) {
          p.weapon = p.weapons[0];
        } else {
          p.weapon = null;
        }
      }
    } else {
      if (state.flash) state.flash("Нет мин");
      p.attackCD = 0.15;
    }
  }
}
