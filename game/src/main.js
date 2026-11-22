// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between six screens: title, play, paused, win, caught and time up.
//
// ?seed=N fixes the patrol phases. ?shot=start|play|win|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_PICKUP, EVENT_TIMEUP, EVENT_TOOL, EVENT_WIN } from './world.js';
import {
  ACTION_CONFIRM, ACTION_JAMMER, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_SMOKE,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TIMEUP, SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, world.level, scene.screen, scene.best, performance.now() / 1000, audio.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // Tool presses (smoke, jammer) are kept pending until a fixed step actually runs:
  // a fast frame may take the actions without stepping, and the press must not be lost.
  let pendingTools = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each pickup.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    pendingTools = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Steal 3 artifacts, then reach the exit.');
  }

  function endGame(nextScreen, message) {
    screen = nextScreen;
    pendingTools = 0;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(message);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && screen !== SCREEN_PLAY && screen !== SCREEN_PAUSED) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, sneak: false, smoke: false, jammer: false }, true);
      return;
    }
    const move = input.read();
    const events = world.step(STEP, {
      dx: move.dx,
      dy: move.dy,
      sneak: move.sneak,
      smoke: !!(actions & ACTION_SMOKE),
      jammer: !!(actions & ACTION_JAMMER),
    }, false);
    if (events & EVENT_PICKUP) {
      audio.play('pickup');
      const taken = world.state.loot.filter((item) => item.taken).length;
      announce(`Artifact ${taken} of 3 stolen. Score ${world.state.score}.`);
    }
    if (events & EVENT_TOOL) audio.play(world.state.jammerTtl > 0 ? 'jammer' : 'smoke');
    if (world.state.seen && !step._alerted) audio.play('alert');
    step._alerted = world.state.seen;
    if (events & EVENT_WIN) {
      audio.play('win');
      endGame(SCREEN_WIN, `Clean getaway. Score ${world.state.score}. Best ${best}.`);
    } else if (events & EVENT_CAUGHT) {
      audio.play('caught');
      endGame(SCREEN_CAUGHT, `Caught: ${world.state.caughtReason}. Score ${world.state.score}.`);
    } else if (events & EVENT_TIMEUP) {
      audio.play('caught');
      endGame(SCREEN_TIMEUP, `Time's up. Score ${world.state.score}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One-shot presses are taken once per frame. Start / pause / mute / restart act at
    // once; tool presses wait in pendingTools until a fixed step consumes them, so a
    // press on a frame with no step due is never lost.
    const actions = input.takeActions();
    handleActions(actions);
    pendingTools |= actions & (ACTION_SMOKE | ACTION_JAMMER);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(first ? pendingTools : 0);
        if (first) pendingTools = 0;
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, world.level, screen, best, now / 1000, audio.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting the alarm climb unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Test and screenshot driver handle: live state, current screen, readiness.
  window.__heist = {
    state: () => world.state,
    screen: () => screen,
    best: () => best,
    ready: () => true,
  };

  announce('Midnight Heist. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else {
  // The shot path needs the same handle for the driver to read staged state.
  window.__heist = {
    state: () => world.state,
    screen: () => 'shot',
    best: () => 0,
    ready: () => true,
  };
  runGame();
}
