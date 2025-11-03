export function draw(ctx, state, mode, bestScore) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  // предметы
  for (const it of state.items) {
    ctx.save();
    ctx.translate(it.x, it.y);
    if (it.type === "bat") {
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(-16, -4, 32, 8);
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
    } else if (it.type === "shotgun") {
      ctx.fillStyle = "#2f2f2f";
      ctx.fillRect(-20, -5, 40, 10);
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(-12, -7, 12, 14);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(6, -3, 14, 6);
    } else if (it.type === "glaive") {
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
    }
    ctx.restore();
  }

  // ... (дальше по файлу всё остальное)

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
