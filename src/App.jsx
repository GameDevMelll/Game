import React, { useEffect, useRef, useState } from "react";
import { makeWalls } from "./game/maze.js";
import { makePlayer } from "./game/entities.js";
import { createInitialState, update } from "./game/update.js";
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
  const selectedSkinRef = useRef("default");
  const progressReadyRef = useRef(false);

  const [mode, setMode] = useState("start"); // start | play | pause | dead | victory
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState("");
  const [best, setBest] = useState(0);
  const [victoryStats, setVictoryStats] = useState(null);
  const [progress, setProgress] = useState({ totalKills: 0, boss2Defeated: false, selectedSkin: "default" });
  const [selectedSkin, setSelectedSkin] = useState("default");
  const [restartTip, setRestartTip] = useState("");

  // создаём стейт один раз
  const createPlayerEntity = () => makePlayer({ skin: selectedSkinRef.current });
  if (!stateRef.current) {
    stateRef.current = createInitialState(makeWalls, createPlayerEntity, assetsRef.current);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ms_progress_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        const initialSkin = parsed?.selectedSkin || "default";
        selectedSkinRef.current = initialSkin;
        setSelectedSkin(initialSkin);
        setProgress({
          totalKills: Number(parsed?.totalKills) || 0,
          boss2Defeated: !!parsed?.boss2Defeated,
          selectedSkin: initialSkin,
        });
      } else {
        selectedSkinRef.current = "default";
        setSelectedSkin("default");
      }
    } catch (err) {
      selectedSkinRef.current = "default";
      setSelectedSkin("default");
    }
    if (stateRef.current?.player) {
      stateRef.current.player.skin = selectedSkinRef.current;
    }
    progressReadyRef.current = true;
  }, []);

  const queueFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 1100);
  };

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.floor(seconds ?? 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const helpfulTips = [
    "Полезный совет №1 — добавьте свой текст позже.",
    "Полезный совет №2 — заготовка для будущих подсказок.",
    "Полезный совет №3 — здесь будет ваш лайфхак.",
  ];

  const skinOptions = [
    {
      id: "default",
      name: "Стандарт",
      description: "Базовый выживший. Доступен сразу.",
    },
    {
      id: "skin2",
      name: "Охотник",
      description: "Выживает в самой гуще", 
      requirement: "Рекорд: 500 монстров.",
    },
    {
      id: "skin3",
      name: "Ветеран",
      description: "Накопленный опыт — сила.",
      requirement: "Суммарно 10 000 убийств.",
    },
    {
      id: "skin4",
      name: "Освободитель",
      description: "Бой с Боссом №2 закаляет.",
      requirement: "Убейте Босса №2.",
    },
  ];

  const persistProgress = (updater) => {
    setProgress((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      if (progressReadyRef.current) {
        try {
          localStorage.setItem("ms_progress_v2", JSON.stringify(next));
        } catch (err) {}
      }
      return next;
    });
  };

  const recordRunProgress = (kills, boss2Flag) => {
    const safeKills = Math.max(0, Math.floor(kills ?? 0));
    persistProgress((prev) => {
      const currentTotal = Math.max(0, Math.floor(prev.totalKills ?? 0));
      return {
        ...prev,
        totalKills: currentTotal + safeKills,
        boss2Defeated: prev.boss2Defeated || !!boss2Flag,
      };
    });
  };

  const totalKills = Math.max(0, Math.floor(progress.totalKills ?? 0));
  const unlocks = {
    default: true,
    skin2: best >= 500,
    skin3: totalKills >= 10000,
    skin4: !!progress.boss2Defeated,
  };

  useEffect(() => {
    const currentSkin = selectedSkinRef.current;
    if (!unlocks[currentSkin]) {
      if (currentSkin !== "default") {
        selectedSkinRef.current = "default";
        setSelectedSkin("default");
        persistProgress((prev) => ({ ...prev, selectedSkin: "default" }));
      }
    }
    if (stateRef.current?.player) {
      stateRef.current.player.skin = selectedSkinRef.current;
    }
  }, [unlocks.skin2, unlocks.skin3, unlocks.skin4]);

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
    const boss2Killed = !!stateRef.current?.progress?.boss2Defeated;
    recordRunProgress(kills, boss2Killed);
    const tip = helpfulTips[Math.floor(Math.random() * helpfulTips.length)] || "";
    setRestartTip(tip);
  };

  const onVictory = ({ kills = 0, duration = stateRef.current?.time ?? 0 }) => {
    setRunning(false);
    setMode("victory");
    setVictoryStats({ kills, duration });
    setBest((prev) => {
      const next = kills > prev ? kills : prev;
      try {
        localStorage.setItem("ms_best", String(next));
      } catch (e) {}
      return next;
    });
    const boss2Killed = !!stateRef.current?.progress?.boss2Defeated;
    recordRunProgress(kills, boss2Killed);
  };

  const handleSkinSelect = (skinId) => {
    if (!unlocks[skinId]) return;
    selectedSkinRef.current = skinId;
    setSelectedSkin(skinId);
    persistProgress((prev) => ({ ...prev, selectedSkin: skinId }));
    if (stateRef.current?.player) {
      stateRef.current.player.skin = skinId;
    }
  };

  const describeSkinRequirement = (skin) => {
    switch (skin.id) {
      case "skin2":
        return `Рекорд: ${best} / 500`;
      case "skin3":
        return `Суммарно: ${totalKills} / 10000`;
      case "skin4":
        return progress.boss2Defeated ? "Условие выполнено" : "Убейте Босса №2";
      default:
        return "Доступен сразу";
    }
  };

  const beginRun = () => {
    if (!unlocks[selectedSkinRef.current]) return;
    if (stateRef.current?.player) {
      stateRef.current.player.skin = selectedSkinRef.current;
    }
    setMode("play");
    setRunning(true);
    setFlash("");
    setRestartTip("");
    setVictoryStats(null);
    ensureAudio();
  };

  const restart = () => {
    stateRef.current = createInitialState(makeWalls, createPlayerEntity, assetsRef.current);
    if (stateRef.current?.player) {
      stateRef.current.player.skin = selectedSkinRef.current;
    }
    setFlash("");
    setVictoryStats(null);
    setRestartTip("");
    beginRun();
  };

  const stopAmbientSource = () => {
    const current = ambientSourceRef.current;
    if (!current) return;
    if (current.node) {
      try {
        current.node.stop();
      } catch (err) {}
      current.node.disconnect?.();
    }
    if (Array.isArray(current.helpers)) {
      for (const helper of current.helpers) {
        if (!helper) continue;
        try {
          helper.stop?.();
        } catch (err) {}
        helper.disconnect?.();
      }
    }
    current.gain?.disconnect?.();
    ambientSourceRef.current = null;
  };

  const startDefaultAmbient = (ctx) => {
    if (!ambientGainRef.current) return;
    const baseOsc = ctx.createOscillator();
    baseOsc.type = "sine";
    baseOsc.frequency.value = 72;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 28;
    lfo.connect(lfoGain).connect(baseOsc.frequency);
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.6;
    const trem = ctx.createOscillator();
    trem.type = "sine";
    trem.frequency.value = 0.08;
    const tremDepth = ctx.createGain();
    tremDepth.gain.value = 0.18;
    trem.connect(tremDepth).connect(tremGain.gain);
    baseOsc.connect(tremGain).connect(ambientGainRef.current);
    baseOsc.start();
    lfo.start();
    trem.start();
    ambientSourceRef.current = { node: baseOsc, helpers: [lfo, trem], gain: tremGain, type: "default" };
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
      ambientGain.gain.value = 0.04;
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

  // загружаем текстуры из манифеста при монтировании
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

  // закрываем аудио-контекст при размонтировании
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // включаем аудио при старте игры
  useEffect(() => {
    if (mode === "play" && running) ensureAudio();
  }, [mode, running]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = Math.max(320, window.innerWidth);
      const height = Math.max(240, window.innerHeight);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);
  
  // инпут
  useEffect(() => {
    const onKey = (e) => {
      const st = stateRef.current;
      const p = st.player;
      st.keys[e.code] = e.type === "keydown";

      // старт
      if (mode === "start" && e.type === "keydown" && (e.code === "Space" || e.code === "Enter")) {
        beginRun();
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
      if ((mode === "dead" || mode === "victory") && e.type === "keydown" && e.code === "KeyR") {
        restart();
        return;
      }

      // выбор по цифрам 1..0
      if (e.type === "keydown" && mode === "play" && e.code.startsWith("Digit")) {
      if (e.repeat) return;
        const digit = e.code.slice(5);
        let slot = Number(digit);
        if (Number.isNaN(slot)) return;
        if (digit === "0") slot = 9;
        else slot = slot - 1;
        if (slot < 0) return;
        const inventory = Array.isArray(p.inventory) ? p.inventory : [];
        if (slot < inventory.length) {
          p.selectedSlot = slot;
          p.weapon = inventory[slot]?.type ?? null;
          if (p.weapon) queueFlash(`Выбран слот ${slot + 1}: ${p.weapon}`);
          else queueFlash(`Слот ${slot + 1} пуст`);
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
        beginRun();
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
          onVictory,
          queueFlash,
          audio: audioApiRef.current,
        });
      }

      draw(ctx, stateRef.current, mode, best);

      // динамика аудио
      if (audioCtxRef.current && ambientGainRef.current) {
        const ctxTime = audioCtxRef.current.currentTime;
        const hostiles =
          (stateRef.current?.zombies?.length || 0) +
          ((stateRef.current?.whites?.length || 0) * 1.5);
        const intensity = Math.min(1, hostiles / 60);
        const active = mode === "play" && running;

        // фон
        const targetAmb = active ? 0.06 + intensity * 0.2 : 0.02;
        ambientGainRef.current.gain.setTargetAtTime(targetAmb, ctxTime, 0.5);

        // мелодия
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
          // безопасно: вызываем только если это реальный GainNode
          try {
            melodyControl?.gain?.setTargetAtTime?.(targetMel, ctxTime, 0.4);
          } catch {}
        }
      }

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [mode, running, best]);

  const currentRunKills = stateRef.current?.kills ?? 0;
  const currentDuration = stateRef.current?.time ?? 0;

  return (
    <div className="w-screen h-screen relative bg-slate-900 overflow-hidden">
      <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full block" />
      {flash && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow">
          {flash}
        </div>
      )}

      {(mode === "start" || mode === "dead") && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm px-4">
          <div className="bg-slate-800/95 text-white rounded-2xl shadow-2xl w-full max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-emerald-300">
                  {mode === "start" ? "Готовьтесь к бою" : "Вы пали в бою"}
                </h2>
                <div className="text-sm text-slate-300">
                  {mode === "start"
                    ? "Выберите скин и начните новый раунд."
                    : "Подберите новую стратегию и возвращайтесь в бой!"}
                </div>
              </div>
              <div className="text-sm text-right text-slate-300 space-y-1">
                <div>
                  Рекорд: <span className="text-emerald-200 font-semibold">{best}</span>
                </div>
                <div>
                  Суммарно: <span className="text-emerald-200 font-semibold">{totalKills}</span>
                </div>
                {mode === "dead" && (
                  <>
                    <div>
                      За раунд: <span className="text-emerald-200 font-semibold">{currentRunKills}</span>
                    </div>
                    <div>
                      Длительность: <span className="text-emerald-200 font-semibold">{formatDuration(currentDuration)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {mode === "dead" && restartTip && (
              <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-400/40 rounded-lg px-4 py-2">
                {restartTip}
              </div>
            )}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-200">Выбор облика</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skinOptions.map((skin) => {
                  const unlocked = unlocks[skin.id];
                  const isSelected = selectedSkin === skin.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => handleSkinSelect(skin.id)}
                      disabled={!unlocks[skin.id]}
                      className={`text-left rounded-xl border px-4 py-3 transition ${
                        isSelected
                          ? "border-emerald-400 ring-2 ring-emerald-400/60"
                          : "border-slate-600 hover:border-emerald-300/60"
                      } ${
                        unlocked
                          ? "bg-slate-700/70 hover:bg-slate-700/90"
                          : "bg-slate-700/40 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-lg font-semibold">{skin.name}</div>
                        {!unlocked && <span className="text-sm">🔒</span>}
                        {unlocked && isSelected && <span className="text-sm text-emerald-300">✓</span>}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">{skin.description}</div>
                      {skin.requirement && (
                        <div className="text-xs text-slate-400 mt-1">{skin.requirement}</div>
                      )}
                      <div className={`text-xs mt-2 ${unlocked ? "text-emerald-300" : "text-amber-300"}`}>
                        {describeSkinRequirement(skin)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-400">
                {mode === "start"
                  ? "Нажмите Space/Enter или кнопку ниже, чтобы начать."
                  : "Нажмите R или кнопку ниже для быстрого рестарта."}
              </div>
              <div className="flex gap-2 justify-end">
                {mode === "start" ? (
                  <button
                    type="button"
                    onClick={beginRun}
                    disabled={!unlocks[selectedSkin]}
                    className={`px-5 py-2 rounded-lg font-semibold transition ${
                      unlocks[selectedSkin]
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                        : "bg-slate-600 text-slate-300 cursor-not-allowed"
                    }`}
                  >
                    В бой
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={restart}
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold transition"
                  >
                    Попробовать снова
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "victory" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">
          <div className="bg-slate-800/95 text-white rounded-2xl shadow-2xl px-8 py-6 w-full max-w-md text-center space-y-4">
            <h2 className="text-3xl font-bold text-emerald-300">Вы победили!</h2>
            <div className="space-y-2 text-left text-sm sm:text-base">
              <div>
                Монстров убито: <span className="font-semibold text-emerald-200">{victoryStats?.kills ?? 0}</span>
              </div>
              <div>
                Длительность боя: <span className="font-semibold text-slate-100">{formatDuration(victoryStats?.duration ?? stateRef.current?.time ?? 0)}</span>
              </div>
              <div>
                Рекорд убийств: <span className="font-semibold text-amber-200">{Math.max(best, victoryStats?.kills ?? 0)}</span>
              </div>
            </div>
            <div className="text-xs text-slate-300">Нажмите R для быстрого рестарта</div>
            <button
              onClick={restart}
              className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold transition"
            >
              Играть снова
            </button>
          </div>
        </div>
      )}

      {/* Панель управления (подсказки) */}
      <div className="absolute top-3 right-3 bg-slate-900/50 text-white text-xs rounded-lg px-3 py-2 pointer-events-none backdrop-blur">
        <div className="font-semibold mb-1">Управление</div>
        <div>WASD / стрелки — движение</div>
       <div>Мышь / Space — атака или установка предмета</div>
        <div>E — подобрать предмет</div>
        <div>1..9, 0 — выбрать слот инвентаря</div>
        <div>ЛКМ по выбранному слоту — использовать</div>
        <div>Esc — пауза</div>
        <div>R — рестарт (после смерти)</div>
      </div>
    </div>
  );
}
