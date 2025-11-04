import { TEXTURE_KEYS, SOUND_KEYS, SOUND_DEFAULT_GAINS } from "./assetKeys.js";
import { TEXTURE_MANIFEST, SOUND_MANIFEST } from "./assetManifest.js";

const resolveEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === "string") return { src: entry };
  if (entry?.src) return { src: entry.src, gain: entry.gain, tint: entry.tint };
  return null;
};

export const loadConfiguredTextures = async (manifest = TEXTURE_MANIFEST) => {
  const textures = {};
  if (typeof Image === "undefined") return textures;
  const entries = Object.entries(manifest || {});
  await Promise.all(
    entries.map(
      ([key, entry]) =>
        new Promise((resolve) => {
          const resolved = resolveEntry(entry);
          if (!resolved?.src) {
            resolve();
            return;
          }
          const img = new Image();
          img.onload = () => {
            const finish = (image) => {
              textures[key] = {
                image,
                patternCache: new WeakMap(),
              };
              resolve();
            };
            if (resolved.tint && typeof document !== "undefined") {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                ctx.globalCompositeOperation = "source-atop";
                ctx.fillStyle = resolved.tint;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const tinted = new Image();
                tinted.onload = () => finish(tinted);
                tinted.onerror = () => finish(img);
                tinted.src = canvas.toDataURL();
                return;
              }
            }
            finish(img);
          };
          img.onerror = () => resolve();
          img.src = resolved.src;
        })
    )
  );
  return textures;
};

export const loadConfiguredSounds = async (ctx, manifest = SOUND_MANIFEST) => {
  const sounds = {};
  if (!ctx || typeof fetch === "undefined") return sounds;
  const entries = Object.entries(manifest || {});
  await Promise.all(
    entries.map(async ([key, entry]) => {
      const resolved = resolveEntry(entry);
      if (!resolved?.src) return;
      try {
        const response = await fetch(resolved.src);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        sounds[key] = {
          buffer,
          gain: resolved.gain,
        };
      } catch (err) {
        console.warn("Не удалось загрузить звук", key, err);
      }
    })
  );
  return sounds;
};

export const createAssetStore = () => ({
  textures: {},
  sounds: {},
});

export { TEXTURE_KEYS, SOUND_KEYS, SOUND_DEFAULT_GAINS };
export { TEXTURE_MANIFEST, SOUND_MANIFEST };
