// Keyboard and mouse input. Keys are held in a set; edge-triggered actions
// (enter car, shoot, pause, confirm) are consumed once per press.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RELOAD = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function keyName(e) {
    // Lowercase everything: 'Enter' -> 'enter', 'ArrowUp' -> 'arrowup',
    // 'W' -> 'w', so the checks below match every keyboard layout.
    return e.key.toLowerCase();
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  function axis() {
    let x = 0; let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    return { x, y };
  }

  function takeActions() {
    let out = 0;
    if (pressed.has('enter') || pressed.has(' ')) out |= ACTION_CONFIRM;
    if (pressed.has('escape') || pressed.has('p')) out |= ACTION_PAUSE;
    if (pressed.has('e')) out |= ACTION_ENTER;
    if (pressed.has('r')) out |= ACTION_RELOAD;
    if (pressed.has('m')) out |= ACTION_MUTE;
    pressed.clear();
    mouse.clicked = false;
    return out;
  }

  return {
    keys, mouse,
    axis,
    takeActions,
    shooting() { return mouse.down; },
    consumeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
  };
}
