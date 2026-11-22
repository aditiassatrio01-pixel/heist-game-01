// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds on the clock when a heist starts. */
export const TIME_LIMIT = 180;

/** The thief: walk speed, sneak speed, body radius. Sneak is slower but halves detection. */
export const PLAYER = {
  radius: 13,
  walkSpeed: 235,
  sneakSpeed: 130,
};

/** A guard's patrol speed, chase speed, vision range and half-angle, and touch distance. */
export const GUARD = {
  patrolSpeed: 72,
  chaseSpeed: 152,
  visionRange: 215,
  sneakVisionRange: 145,
  visionHalfAngle: 0.56, // ~32 degrees
  touchDistance: 30,
  chaseSeconds: 2.5,
};

/** A wall camera: sweep range, half-angle, sweep speed and how far it sees. */
export const CAMERA = {
  range: 265,
  halfAngle: 0.49, // ~28 degrees
  sweepHalfAngle: 0.85,
  sweepSpeed: 0.55, // radians per second
};

/** How fast the alarm climbs while a guard or a camera has the thief in sight, per second. */
export const ALARM = {
  guardRate: 30,
  cameraRate: 45,
  sneakFactor: 0.5,
  decayRate: 6,
  max: 100,
};

/** Tools, bought with score: smoke breaks line of sight, the jammer kills the cameras. */
export const TOOLS = {
  smoke: { charges: 2, cost: 100, radius: 95, seconds: 9 },
  jammer: { charges: 2, cost: 150, seconds: 6 },
};

/** Points per artifact, and the getaway bonus (time left and alarm left, per point). */
export const SCORE = {
  diamond: 600,
  mask: 500,
  portrait: 500,
  timeBonusPerSecond: 10,
  calmBonusPerPoint: 5,
};

/** Night museum: deep blue shadow, warm gold loot light, amber cones, red camera cones. */
export const PALETTE = {
  floorA: '#1e2839',
  floorB: '#1a2233',
  carpet: '#6b3640',
  carpetTrim: '#c9a227',
  wall: '#39486e',
  wallTrim: '#c9a227',
  caseGlass: '#27395a',
  caseFrame: '#a8842c',
  panel: '#101623',
  text: '#f2ead8',
  muted: '#aab6cc',
  gold: '#f2c94c',
  goldDim: '#a8842c',
  thief: '#23232e',
  thiefTrim: '#f2c94c',
  guard: '#3d5a8f',
  guardCap: '#24344f',
  cone: 'rgba(242, 201, 76, 0.26)',
  coneAlert: 'rgba(229, 83, 75, 0.34)',
  cameraCone: 'rgba(229, 83, 75, 0.22)',
  cameraOff: 'rgba(120, 130, 150, 0.10)',
  exit: '#2f9e5f',
  exitGlow: 'rgba(47, 158, 95, 0.35)',
  alarmLow: '#2f9e5f',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
  smoke: 'rgba(180, 190, 205, 0.55)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-heist.best';
