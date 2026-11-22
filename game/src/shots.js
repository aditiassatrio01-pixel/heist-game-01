// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot (head for the next artifact,
// slip behind cover and wait when a guard is looking, spend smoke when the alarm climbs),
// so the frame is what a short game really looks like and the same seed always gives
// the same frame.
import { STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN } from './world.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 600;

/** Waypoints the autopilot heads for, in heist order: diamond, mask, portrait, exit. */
function nextTarget(state, level) {
  for (const item of state.loot) {
    if (!item.taken) return { x: item.x, y: item.y };
  }
  return { x: level.exit.x + level.exit.w / 2, y: level.exit.y + level.exit.h / 2 };
}

/**
 * Steer toward `target`, sliding along walls; when stuck, sidestep for a while.
 * When seen, break for the nearest cover (the start corner) and wait the alarm down;
 * when the alarm climbs past 70, spend smoke if it can afford it.
 */
function autopilot(state, level, memory) {
  const p = state.player;
  if (state.seen && state.alarm > 70 && state.smokeCharges > 0 && state.score >= 100) {
    memory.tool = 'smoke';
  }
  if (state.seen || state.alarm > 55) {
    // Fall back to the entrance corner and wait out the heat.
    const tx = 120;
    const ty = 620;
    const dx = tx - p.x;
    const dy = ty - p.y;
    if (Math.hypot(dx, dy) > 30) {
      return { dx: Math.sign(dx), dy: Math.sign(dy), sneak: true, smoke: false, jammer: false };
    }
    return { dx: 0, dy: 0, sneak: true, smoke: false, jammer: false };
  }
  const target = nextTarget(state, level);
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 12) return { dx: 0, dy: 0, sneak: false, smoke: false, jammer: false };

  // Stuck detection: if the thief barely moved, sidestep perpendicular for a while.
  if (memory.lastX !== undefined) {
    const moved = Math.hypot(p.x - memory.lastX, p.y - memory.lastY);
    if (moved < 1.2) memory.stuck += 1;
    else memory.stuck = 0;
  }
  memory.lastX = p.x;
  memory.lastY = p.y;
  if (memory.stuck > 30) {
    memory.sidestep = 40;
    memory.stuck = 0;
    memory.side = -memory.side;
  }
  if (memory.sidestep > 0) {
    memory.sidestep -= 1;
    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);
    return { dx: Math.sign(nx * memory.side), dy: Math.sign(ny * memory.side), sneak: false, smoke: false, jammer: false };
  }
  return { dx: Math.sign(dx), dy: Math.sign(dy), sneak: false, smoke: false, jammer: false };
}

/** A reckless pilot for the caught scene: straight at the loot, never sneaks, never waits. */
function recklessPilot(state, level) {
  const target = nextTarget(state, level);
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  return { dx: Math.sign(dx), dy: Math.sign(dy), sneak: false, smoke: false, jammer: false };
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const { state, level } = world;
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { dx: 0, dy: 0, sneak: false, smoke: false, jammer: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const memory = { stuck: 0, sidestep: 0, side: 1, lastX: undefined, lastY: undefined, tool: null };
  const limit = name === 'play' ? PLAY_SECONDS : LIMIT_SECONDS;
  const pilot = name === 'end' ? recklessPilot : (s, l) => autopilot(s, l, memory);
  let screen = SCREEN_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    const input = pilot(state, level);
    if (memory.tool === 'smoke') {
      input.smoke = true;
      memory.tool = null;
    }
    const events = world.step(STEP, input, false);
    if (events & EVENT_WIN) {
      screen = SCREEN_WIN;
      break;
    }
    if (events & EVENT_CAUGHT) {
      screen = SCREEN_CAUGHT;
      break;
    }
  }
  return { screen, best: state.score };
}
