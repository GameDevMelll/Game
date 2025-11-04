import React, { useEffect, useRef, useState } from "react";
import { makeWalls } from "./game/maze.js";
import { makePlayer } from "./game/entities.js";
import { createInitialState, update, useMedkit } from "./game/update.js";
import {
  createAssetStore,
  SOUND_KEYS,
  SOUND_DEFAULT_GAINS,
  loadConfiguredTextures,
  loadConfiguredSounds,
  TEXTURE_MANIFEST,
  SOUND_MANIFEST,
} from "./game/assets.js";
import { draw } from "./game/draw.js";

export default function App() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const assetsRef = useRef(createAssetStore());
  const audioCtxRef = useRef(null);
  const ambientGainRef = useRef(null);
  const ambientSourceRef = useRef(null);
  const melodyRef = useRef(null);
  const melodyStateRef = useRef({ timer: 0, step: 0 });
  const audioApiRef = useRef({ play: () => {} });
  const soundsLoadPromiseRef = useRef(null);

  const [mode, setMode] = useState("start"); // start | play | pause | dead
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState("");
  const [best, setBest] = useState(0);

  // создаём стейт один раз
  if (!stateRef.current) {
    stateRef.current = createInitialState(makeWalls, makePlayer, assetsRef.current);
  } else if (stateRef.current.assets !== assetsRef.current) {
    stateRef.current.assets = assetsRef.current;
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
    stateRef.current = createInitialState(makeWalls, makePlayer, assetsRef.current);
    setMode("play");
    setRunning(true);
    setFlash("");
  };

  const stopAmbientSource = () => {
    const current = ambientSourceRef.current;
    if (current?.node) {
      try {
        current.node.stop();
      } catch (err) {}
    }
    ambientSourceRef.current = null;
  };

  const startDefaultAmbient = (ctx) => {
    if (!ambientGainRef.current) return;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseSource.connect(ambientGainRef.current);
    noiseSource.start();
    ambientSourceRef.current = { node: noiseSource, type: "noise" };
  };

  const applyAmbientBuffer = (ctx, buffer) => {
    if (!ctx || !ambientGainRef.current) return;
    stopAmbientSource();
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(ambientGainRef.current);
      source.start();
      ambientSourceRef.current = { node: source, type: "custom" };
    } else {
      startDefaultAmbient(ctx);
    }
  };

  const applyMelodyBuffer = (ctx, buffer) => {
    if (!ctx) return;
    let gainNode = melodyRef.current?.gain;
    if (!gainNode) {
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.0;
      gainNode.connect(ctx.destination);
    }
    if (melodyRef.current?.node) {
      try {
        melodyRef.current.node.stop();
      } catch (err) {}
    }
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gainNode);
      src.start();
      melodyRef.current = { type: "custom", node: src, gain: gainNode };
    } else {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 320;
      osc.connect(gainNode);
      osc.start();
      melodyRef.current = { type: "default", node: osc, gain: gainNode };
    }
    melodyStateRef.current = { timer: 0, step: 0 };
  };

  const ensureAudio = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const ambientGain = ctx.createGain();
      ambientGain.gain.value = 0.05;
      ambientGain.connect(ctx.destination);
      ambientGainRef.current = ambientGain;
      applyAmbientBuffer(ctx, null);

      melodyRef.current = null;
      applyMelodyBuffer(ctx, null);
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    const ctx = audioCtxRef.current;
    if (ctx && !soundsLoadPromiseRef.current) {
      soundsLoadPromiseRef.current = loadConfiguredSounds(ctx, SOUND_MANIFEST)
        .then((loaded) => {
          if (!loaded) return;
          assetsRef.current.sounds = loaded;
          const ambient = loaded[SOUND_KEYS.AMBIENT];
          if (ambient?.buffer) {
            applyAmbientBuffer(ctx, ambient.buffer);
          }
          const melody = loaded[SOUND_KEYS.MELODY];
          if (melody?.buffer) {
            applyMelodyBuffer(ctx, melody.buffer);
          }
        })
        .catch((err) => {
          console.warn("Не удалось подготовить звуки", err);
        });
    }

    return ctx;
  };

  const playSound = (key) => {
    const entry = assetsRef.current.sounds[key];
    if (!entry || !entry.buffer) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.loop = false;
    const gainNode = ctx.createGain();
    const baseGain = entry.gain ?? SOUND_DEFAULT_GAINS[key] ?? 0.55;
    gainNode.gain.value = baseGain;
    source.connect(gainNode).connect(ctx.destination);
    source.start();
  };

  audioApiRef.current.play = playSound;

  useEffect(() => {
    let cancelled = false;
    loadConfiguredTextures(TEXTURE_MANIFEST)
      .then((textures) => {
        if (cancelled) return;
        assetsRef.current.textures = textures;
      })
      .catch((err) => {
        console.warn("Не удалось загрузить текстуры", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        ensureAudio();
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

      // аптечка по Q
      if (e.type === "keydown" && e.code === "KeyQ" && mode === "play") {
        if (e.repeat) return;
        useMedkit(stateRef.current, queueFlash, audioApiRef.current);
        return;
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
        ensureAudio();
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

  // главный цикл
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
          audio: audioApiRef.current,
        });
      }

      draw(ctx, stateRef.current, mode, best);

      if (audioCtxRef.current && ambientGainRef.current) {
        const ctxTime = audioCtxRef.current.currentTime;
        const hostiles =
          (stateRef.current?.zombies?.length || 0) +
          ((stateRef.current?.whites?.length || 0) * 1.5);
        const intensity = Math.min(1, hostiles / 60);
        const active = mode === "play" && running;
        const targetAmb = active ? 0.06 + intensity * 0.2 : 0.02;
        ambientGainRef.current.gain.setTargetAtTime(targetAmb, ctxTime, 0.5);
        if (melodyRef.current) {
          const melState = melodyStateRef.current;
          const melodyControl = melodyRef.current;
          melState.timer += dt;
          if (melodyControl.type === "default" && melodyControl.node) {
            if (melState.timer >= 2.4) {
              melState.timer = 0;
              melState.step = (melState.step + 1) % 6;
              const notes = [220, 262, 294, 330, 392, 262];
              melodyControl.node.frequency.setTargetAtTime(notes[melState.step], ctxTime, 0.35);
            }
          } else {
            melState.timer = 0;
          }
          const targetMel = active ? 0.02 + intensity * 0.12 : 0.0;
          melodyControl.gain.setTargetAtTime(targetMel, ctxTime, 0.4);
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

      {/* Панель управления (подсказки) */}
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
