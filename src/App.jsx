import React, { useEffect, useRef, useState } from "react";
import { makeWalls } from "./game/maze.js";
import { makePlayer } from "./game/entities.js";
import { createInitialState, update } from "./game/update.js";
import { draw } from "./game/draw.js";

export default function App() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  const [mode, setMode] = useState("start"); // start | play | pause | dead
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState("");
  const [best, setBest] = useState(0);

  // создаём стейт один раз
  if (!stateRef.current) {
    stateRef.current = createInitialState(makeWalls, makePlayer);
  }

  // подгружаем рекорд
  useEffect(() => {
    try {
      const b = Number(localStorage.getItem("ms_best") || 0);
      if (!Number.isNaN(b)) setBest(b);
    } catch (e) {}
  }, []);

  const queueFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 1100);
  };

  const onDeath = () => {
    setRunning(false);
    setMode("dead");
    const kills = stateRef.current.kills || 0;
    setBest((prev) => {
      const next = kills > prev ? kills : prev;
      try {
        localStorage.setItem("ms_best", String(next));
      } catch (e) {}
      return next;
    });
  };

  const restart = () => {
    stateRef.current = createInitialState(makeWalls, makePlayer);
    setMode("play");
    setRunning(true);
    setFlash("");
  };

  // инпут
  useEffect(() => {
    const onKey = (e) => {
      const st = stateRef.current;
      const p = st.player;
      st.keys[e.code] = e.type === "keydown";

      // старт
      if (mode === "start" && e.type === "keydown" && (e.code === "Space" || e.code === "Enter")) {
        setMode("play");
        setRunning(true);
        return;
      }

      // пауза
      if (e.type === "keydown" && e.code === "Escape") {
        if (mode === "play") {
          setMode("pause");
          setRunning(false);
        } else if (mode === "pause") {
          setMode("play");
          setRunning(true);
        }
        return;
      }

      // рестарт после смерти
      if (mode === "dead" && e.type === "keydown" && e.code === "KeyR") {
        restart();
        return;
      }

      // переключение по Q
      if (e.type === "keydown" && e.code === "KeyQ" && mode === "play") {
        if (p.weapons.length > 1) {
          const idx = p.weapons.indexOf(p.weapon);
          p.weapon = p.weapons[(idx + 1) % p.weapons.length];
          queueFlash(`Выбрано оружие: ${p.weapon}`);
        }
      }

      // выбор по цифрам 1..5
      if (e.type === "keydown" && mode === "play" && e.code.startsWith("Digit")) {
        const slot = Number(e.code.slice(5)) - 1; // Digit1 -> 0
        if (slot >= 0 && slot < p.weapons.length) {
          p.weapon = p.weapons[slot];
          queueFlash(`Выбрано оружие: ${p.weapon}`);
        }
      }
    };

    const onMouseMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const st = stateRef.current;
      st.mouse.x = e.clientX - rect.left;
      st.mouse.y = e.clientY - rect.top;
    };
    const onMouseDown = () => {
      const st = stateRef.current;
      st.mouse.down = true;
      if (mode === "start") {
        setMode("play");
        setRunning(true);
      }
    };
    const onMouseUp = () => {
      const st = stateRef.current;
      st.mouse.down = false;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [mode]);

  // цикл
  useEffect(() => {
    let frame;
    let last = 0;
    const loop = (t) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        frame = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      if (mode === "play" && running) {
        update(stateRef.current, dt, {
          canvas,
          onDeath,
          queueFlash,
        });
      }
      draw(ctx, stateRef.current, mode, best);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [mode, running, best]);

  return (
    <div className="w-screen h-screen relative bg-slate-900 overflow-hidden">
      <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full block" />
      {flash && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow">
          {flash}
        </div>
      )}
      <div className="absolute top-3 right-3 bg-slate-900/50 text-white text-xs rounded-lg px-3 py-2 pointer-events-none backdrop-blur">
        <div className="font-semibold mb-1">Управление</div>
        <div>WASD / стрелки — движение</div>
        <div>Мышь / Space — атака / поставить мину</div>
        <div>E — подобрать предмет</div>
        <div>Q — сменить оружие</div>
        <div>1..5 — выбрать слот</div>
        <div>Esc — пауза</div>
        <div>R — рестарт (после смерти)</div>
      </div>
    </div>
  );
}
