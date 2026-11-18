// input.js — keyboard and pointer input for SOLMAR. Held keys drive the
// player and the car; one-shot presses (interact, switch weapon, reload,
// pause, confirm) are queued as flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. The mouse aims
// and fires.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_SWITCH = 8;
export const ACTION_RELOAD = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 400;
  let mouseDown = false;

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    else if (event.code === 'KeyQ') actions |= ACTION_SWITCH;
    else if (event.code === 'KeyR') actions |= ACTION_RELOAD;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const r = canvas.getBoundingClientRect();
    mouseX = (event.clientX - r.left) * (canvas.width / r.width);
    mouseY = (event.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    const r = canvas.getBoundingClientRect();
    mouseX = (event.clientX - r.left) * (canvas.width / r.width);
    mouseY = (event.clientY - r.top) * (canvas.height / r.height);
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    // Held-key helpers used by the player and the car.
    up() { return keys.has('KeyW') || keys.has('ArrowUp'); },
    down() { return keys.has('KeyS') || keys.has('ArrowDown'); },
    left() { return keys.has('KeyA') || keys.has('ArrowLeft'); },
    right() { return keys.has('KeyD') || keys.has('ArrowRight'); },
    // Current mouse position in canvas pixels.
    mouse() { return { x: mouseX, y: mouseY }; },
    firing() { return mouseDown; },
    // The one-shot presses since the last call, as ACTION_* flags.
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
