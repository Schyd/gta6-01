// Keyboard and mouse input. Held keys are read every frame; one-shot presses
// (interact, reload, pause, confirm) are queued as flags and taken once by the loop.

export const ACT_INTERACT = 1;
export const ACT_RELOAD = 2;
export const ACT_PAUSE = 4;
export const ACT_CONFIRM = 8;
export const ACT_WEAPON_NEXT = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(codeOf(event));
    if (event.code === 'KeyE') actions |= ACT_INTERACT;
    else if (event.code === 'KeyR') actions |= ACT_RELOAD;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACT_PAUSE;
    else if (event.code === 'Enter' || event.code === 'Space') actions |= ACT_CONFIRM;
    else if (event.code === 'KeyQ') actions |= ACT_WEAPON_NEXT;
  });
  window.addEventListener('keyup', (event) => keys.delete(codeOf(event)));
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
      mouseClicked = true;
      const rect = canvas.getBoundingClientRect();
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    keys,
    get mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeMouseClick() {
      const c = mouseClicked;
      mouseClicked = false;
      return c;
    },
    // -1/0/1 for the W/S (or arrows) axis and the A/D axis.
    moveAxes() {
      const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { fwd, strafe };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
