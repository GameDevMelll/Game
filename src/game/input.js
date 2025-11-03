// src/game/input.js

export function initInput(state, canvas) {
  state.input = {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    pickup: false,
    switchWeapon: false,
    selectSlot: null,
  };

  function keyDown(e) {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        state.input.up = true;
        break;
      case "KeyS":
      case "ArrowDown":
        state.input.down = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        state.input.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        state.input.right = true;
        break;
      case "Space":
        state.input.attack = true;
        break;
      case "KeyE":
        state.input.pickup = true;
        break;
      case "KeyQ":
        state.input.switchWeapon = true;
        break;
      default: {
        // выбор слота 1..5
        if (e.code.startsWith("Digit")) {
          const n = Number(e.code.slice(5));
          if (n >= 1 && n <= 5) {
            state.input.selectSlot = n; // 1..5
          }
        }
      }
    }
  }

  function keyUp(e) {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        state.input.up = false;
        break;
      case "KeyS":
      case "ArrowDown":
        state.input.down = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        state.input.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        state.input.right = false;
        break;
      case "Space":
        // не оставляем атаку зажатой
        // state.input.attack = false; // не обяз., мы и так сбросим в update
        break;
      case "KeyE":
        // разовый
        break;
      case "KeyQ":
        // разовый
        break;
    }
  }

  function mouseDown() {
    state.input.attack = true;
  }

  function mouseMove(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;
  }

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("mousedown", mouseDown);
  window.addEventListener("mousemove", mouseMove);

  state._inputCleanup = () => {
    window.removeEventListener("keydown", keyDown);
    window.removeEventListener("keyup", keyUp);
    window.removeEventListener("mousedown", mouseDown);
    window.removeEventListener("mousemove", mouseMove);
  };
}
