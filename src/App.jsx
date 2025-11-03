import React, { useEffect, useRef, useState } from "react";
import { makeWalls } from "./game/maze.js";
import { makePlayer } from "./game/entities.js";
import { createInitialState, update, useMedkit } from "./game/update.js";
import { draw } from "./game/draw.js";

export default function App() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const audioCtxRef = useRef(null);
  const ambientGainRef = useRef(null);
  const melodyRef = useRef(null);
  const melodyStateRef = useRef({ timer: 0, step: 0 });

  const [mode, setMode] = useState("start"); // start | play | pause | dead
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState("");
  const [best, setBest] = useState(0);

  if (!stateRef.current) {
    stateRef.current = createInitialState(makeWalls, makePlayer);
  }

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
    stateRef.current.allowUpdate = false; // 🚫 остановка логики
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
    stateRef.current.allowUpdate = true; // ✅ включаем игру снова
    setMode("play");
    setRunning(true);
    setFlash("");
  };

  const ensureAudio = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) {
      const ctx = new AudioCtx();
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.08;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      const ambientGain = ctx.createGain();
      ambientGain.gain.value = 0.05;
      noiseSource.connect(ambientGain).connect(ctx.destination);
      noiseSource.start();

      const melodyOsc = ctx.createOscillator();
      melodyOsc.type = "triangle";
      melodyOsc.frequency.value = 320;
      const melodyGain = ctx.createGain();
      melodyGain.gain.value = 0.0;
      melodyOsc.connect(melodyGain).connect(ctx.destination);
      melodyOsc.start();

      audioCtxRef.current = ctx;
      ambientGainRef.current = ambientGain;
      melodyRef.current = { osc: melodyOsc, gain: melodyGain };
      melodyStateRef.current = { timer: 0, step: 0 };
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (mode === "play" && running) ensureAudio();
  }, [mode, running]);

  useEffect(() => {
    const onKey = (e) => {
      const st = stateRef.current;
      const p = st.player;
      st.keys[e.code] = e.type === "keydown";

      if (mode === "start" && e.type === "keydown" && (e.code === "Space" || e.code === "Enter")) {
        setMode("play");
        setRunning(true);
        ensureAudio();
        st.allowUpdate = true; // ✅ разрешаем обновление
        return;
      }

      if (e.type === "keydown" && e.code === "Escape") {
        if (mode === "play") {
          setMode("pause");
          setRunning(false);
          st.allowUpdate = false;
        } else if (mode === "pause") {
          setMode("play");
          setRunning(true);
          st.allowUpdate = true;
        }
        return;
      }

      if (mode === "dead" && e.type === "keydown" && e.code === "KeyR") {
        restart();
        return;
      }

      if (e.type === "keydown" && e.code === "KeyQ" && mode === "play") {
        if (e.repeat) return;
        useMedkit(stateRef.current, queueFlash);
        return;
      }

      if (e.type === "keydown" && mode === "play" && e.code.startsWith("Digit")) {
        const slot = Number(e.code.slice(5)) - 1;
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
        ensureAudio();
        st.allowUpdate = true; // ✅ разрешаем обновление при клике
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
        update(stateRef.current, dt, { canvas, onDeath, queueFlash });
      }
      draw(ctx, stateRef.current, mode, best);

      if (audioCtxRef.current && ambientGainRef.current) {
        const ctxTime = audioCtxRef.current.currentTime;
        const hostiles = (stateRef.current?.zombies?.length || 0) + ((stateRef.current?.whites?.length || 0) * 1.5);
        const intensity = Math.min(1, hostiles / 60);
        const active = mode === "play" && running;
        const targetAmb = active ? 0.06 + intensity * 0.2 : 0.02;
        ambientGainRef.current.gain.setTargetAtTime(targetAmb, ctxTime, 0.5);
        if (melodyRef.current) {
          const melState = melodyStateRef.current;
          melState.timer += dt;
          if (melState.timer >= 2.4) {
            melState.timer = 0;
            melState.step = (melState.step + 1) % 6;
            const notes = [220, 262, 294, 330, 392, 262];
            melodyRef.current.osc.frequency.setTargetAtTime(notes[melState.step], ctxTime, 0.35);
          }
          const targetMel = active ? 0.02 + intensity * 0.12 : 0.0;
          melodyRef.current.gain.setTargetAtTime(targetMel, ctxTime, 0.4);
        }
      }

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
        <div>Q — использовать аптечку</div>
        <div>1..5 — выбрать слот</div>
        <div>Esc — пауза</div>
        <div>R — рестарт (после смерти)</div>
      </div>
    </div>
  );
}
