// src/game/maze.js
import { clamp } from "./utils";
import { MAZE_PASSAGE, WALL_THICKNESS, WORLD } from "./constants";

export function makeWalls() {
  const walls = [];
  const corridor = MAZE_PASSAGE;
  const cellSize = corridor + WALL_THICKNESS;
  const offsetX = 140;
  const offsetY = 120;
  const cols = Math.floor((WORLD.w - offsetX * 2) / cellSize);
  const rows = Math.floor((WORLD.h - offsetY * 2) / cellSize);
  const C = Math.max(3, cols);
  const R = Math.max(3, rows);

  const cells = [];
  for (let y = 0; y < R; y++) {
    const row = [];
    for (let x = 0; x < C; x++) {
      row.push({ x, y, visited: false, n: true, e: true, s: true, w: true });
    }
    cells.push(row);
  }

  const inB = (x, y) => x >= 0 && y >= 0 && x < C && y < R;
  const stack = [];
  const startX = Math.floor(C / 2);
  const startY = Math.floor(R / 2);
  const startCell = cells[startY][startX];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length) {
    const cell = stack[stack.length - 1];
    const { x, y } = cell;
    const nbs = [];
    if (inB(x, y - 1) && !cells[y - 1][x].visited) nbs.push({ dir: "n", nx: x, ny: y - 1 });
    if (inB(x + 1, y) && !cells[y][x + 1].visited) nbs.push({ dir: "e", nx: x + 1, ny: y });
    if (inB(x, y + 1) && !cells[y + 1][x].visited) nbs.push({ dir: "s", nx: x, ny: y + 1 });
    if (inB(x - 1, y) && !cells[y][x - 1].visited) nbs.push({ dir: "w", nx: x - 1, ny: y });
    if (!nbs.length) {
      stack.pop();
      continue;
    }
    const pick = nbs[Math.floor(Math.random() * nbs.length)];
    const nxt = cells[pick.ny][pick.nx];
    if (pick.dir === "n") {
      cell.n = false;
      nxt.s = false;
    } else if (pick.dir === "e") {
      cell.e = false;
      nxt.w = false;
    } else if (pick.dir === "s") {
      cell.s = false;
      nxt.n = false;
    } else if (pick.dir === "w") {
      cell.w = false;
      nxt.e = false;
    }
    nxt.visited = true;
    stack.push(nxt);
  }

  // рамка
  walls.push({ x: offsetX, y: offsetY, w: WORLD.w - offsetX * 2, h: WALL_THICKNESS });
  walls.push({ x: offsetX, y: WORLD.h - offsetY - 80, w: WORLD.w - offsetX * 2, h: WALL_THICKNESS });
  walls.push({ x: offsetX, y: offsetY, w: WALL_THICKNESS, h: WORLD.h - offsetY * 2 - 80 });
  walls.push({ x: WORLD.w - offsetX - WALL_THICKNESS, y: offsetY, w: WALL_THICKNESS, h: WORLD.h - offsetY * 2 - 80 });

  // длинные горизонтальные
  for (let y = 0; y < R; y++) {
    let runStart = null;
    for (let x = 0; x < C; x++) {
      const cell = cells[y][x];
      const hasN = cell.n;
      if (hasN && runStart === null) runStart = x;
      const endOfRow = x === C - 1;
      if ((!hasN || endOfRow) && runStart !== null) {
        const startXPix = offsetX + runStart * cellSize;
        const endXPix = offsetX + (endOfRow && hasN ? x + 1 : x) * cellSize;
        walls.push({ x: startXPix, y: offsetY + y * cellSize, w: endXPix - startXPix, h: WALL_THICKNESS });
        runStart = null;
      }
    }
  }

  // длинные вертикальные
  for (let x = 0; x < C; x++) {
    let runStart = null;
    for (let y = 0; y < R; y++) {
      const cell = cells[y][x];
      const hasW = cell.w;
      if (hasW && runStart === null) runStart = y;
      const endOfCol = y === R - 1;
      if ((!hasW || endOfCol) && runStart !== null) {
        const startYPix = offsetY + runStart * cellSize;
        const endYPix = offsetY + (endOfCol && hasW ? y + 1 : y) * cellSize;
        walls.push({ x: offsetX + x * cellSize, y: startYPix, w: WALL_THICKNESS, h: endYPix - startYPix });
        runStart = null;
      }
    }
  }

  // центр чистый
  return walls.filter((w) => {
    const cx = clamp(WORLD.w / 2, w.x, w.x + w.w);
    const cy = clamp(WORLD.h / 2, w.y, w.y + w.h);
    const dx = cx - WORLD.w / 2;
    const dy = cy - WORLD.h / 2;
    return dx * dx + dy * dy > 220 * 220;
  });
}
