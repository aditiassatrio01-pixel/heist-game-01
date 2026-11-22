// The heist itself: movement and collision, guard patrols and chases, camera sweeps,
// vision cones with real line of sight, the alarm meter, loot, smoke and jammer tools,
// and the win / caught / time-up endings. Every rule here is what the screenshots show.

import { ALARM, CAMERA, FIELD, GUARD, PLAYER, SCORE, STEP, TIME_LIMIT, TOOLS } from './config.js';
import { buildLevel } from './level.js';

export const EVENT_PICKUP = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_WIN = 4;
export const EVENT_TIMEUP = 8;
export const EVENT_TOOL = 16;
export const EVENT_SEEN = 32;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when the segment (x1,y1)-(x2,y2) touches the rectangle (Liang-Barsky clipping). */
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

/** True when the segment passes within `radius` of the point (cx, cy). */
function segmentNearPoint(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  const ddx = cx - px;
  const ddy = cy - py;
  return ddx * ddx + ddy * ddy < radius * radius;
}

function circleHitsRect(cx, cy, radius, r) {
  const nx = clamp(cx, r.x, r.x + r.w);
  const ny = clamp(cy, r.y, r.y + r.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

export function createWorld(random) {
  const level = buildLevel();
  const solids = [...level.walls, ...level.cover];
  let time = 0;

  function freshState() {
    return {
      player: { x: level.playerStart.x, y: level.playerStart.y, sneaking: false },
      guards: level.guards.map((g) => ({
        name: g.name,
        x: g.x,
        y: g.y,
        waypoints: g.waypoints,
        wpIndex: 1,
        facing: 0,
        alertTtl: 0,
      })),
      cameras: level.cameras.map((c) => ({
        name: c.name, x: c.x, y: c.y, baseAngle: c.baseAngle, phase: c.phase, angle: c.baseAngle,
      })),
      loot: level.loot.map((l) => ({ ...l, taken: false })),
      alarm: 0,
      score: 0,
      timeLeft: TIME_LIMIT,
      smoke: [],
      smokeCharges: TOOLS.smoke.charges,
      jammerCharges: TOOLS.jammer.charges,
      jammerTtl: 0,
      seen: false,
      seenBy: null,
      caughtReason: null,
      timeBonus: 0,
      calmBonus: 0,
    };
  }

  const state = freshState();

  function lineOfSight(x1, y1, x2, y2) {
    for (const r of solids) {
      if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
    }
    for (const cloud of state.smoke) {
      if (segmentNearPoint(x1, y1, x2, y2, cloud.x, cloud.y, cloud.radius)) return false;
    }
    return true;
  }

  /** Can the watcher at (x,y) facing `facing` see the player? Cone + range + sight line. */
  function canSee(x, y, facing, range, halfAngle) {
    const dx = state.player.x - x;
    const dy = state.player.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return false;
    if (dist > 1 && angleDiff(Math.atan2(dy, dx), facing) > halfAngle) return false;
    return lineOfSight(x, y, state.player.x, state.player.y);
  }

  function moveCircle(entity, dx, dy, radius) {
    let nx = entity.x + dx;
    let blocked = false;
    for (const r of solids) {
      if (circleHitsRect(nx, entity.y, radius, r)) { blocked = true; break; }
    }
    if (!blocked) entity.x = clamp(nx, 24 + radius, FIELD.width - 24 - radius);
    let ny = entity.y + dy;
    blocked = false;
    for (const r of solids) {
      if (circleHitsRect(entity.x, ny, radius, r)) { blocked = true; break; }
    }
    if (!blocked) entity.y = clamp(ny, 24 + radius, FIELD.height - 24 - radius);
  }

  function stepGuards(dt) {
    for (const guard of state.guards) {
      const sees = canSee(
        guard.x, guard.y, guard.facing,
        state.player.sneaking ? GUARD.sneakVisionRange : GUARD.visionRange,
        GUARD.visionHalfAngle,
      );
      if (sees) {
        guard.alertTtl = GUARD.chaseSeconds;
        state.seen = true;
        state.seenBy = `Guard ${guard.name}`;
      } else {
        guard.alertTtl = Math.max(0, guard.alertTtl - dt * 1.5);
      }
      if (guard.alertTtl > 0) {
        // Chase the thief.
        const dx = state.player.x - guard.x;
        const dy = state.player.y - guard.y;
        const dist = Math.hypot(dx, dy) || 1;
        guard.facing = Math.atan2(dy, dx);
        moveCircle(guard, (dx / dist) * GUARD.chaseSpeed * dt, (dy / dist) * GUARD.chaseSpeed * dt, 14);
        if (dist < GUARD.touchDistance) {
          state.caughtReason = `caught by Guard ${guard.name}`;
          return EVENT_CAUGHT;
        }
      } else {
        // Walk the patrol loop. Bumping into a patrolling guard catches the thief too:
        // a body in the dark is a body, seen or not.
        const target = guard.waypoints[guard.wpIndex];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        } else {
          guard.facing = Math.atan2(dy, dx);
          moveCircle(guard, (dx / dist) * GUARD.patrolSpeed * dt, (dy / dist) * GUARD.patrolSpeed * dt, 14);
        }
        const pdx = state.player.x - guard.x;
        const pdy = state.player.y - guard.y;
        if (Math.hypot(pdx, pdy) < GUARD.touchDistance) {
          state.caughtReason = `caught by Guard ${guard.name}`;
          return EVENT_CAUGHT;
        }
      }
    }
    return 0;
  }

  function stepCameras(dt) {
    for (const camera of state.cameras) {
      camera.angle = camera.baseAngle + Math.sin(time * CAMERA.sweepSpeed + camera.phase) * CAMERA.sweepHalfAngle;
      if (state.jammerTtl > 0) continue;
      if (canSee(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle)) {
        state.seen = true;
        state.seenBy = camera.name;
      }
    }
  }

  function stepAlarm(dt) {
    let rate = 0;
    if (state.seen) {
      const sneak = state.player.sneaking ? ALARM.sneakFactor : 1;
      rate = (state.seenBy && state.seenBy.startsWith('Cam') ? ALARM.cameraRate : ALARM.guardRate) * sneak;
    }
    if (rate > 0) state.alarm = Math.min(ALARM.max, state.alarm + rate * dt);
    else state.alarm = Math.max(0, state.alarm - ALARM.decayRate * dt);
    if (state.alarm >= ALARM.max) {
      state.caughtReason = 'the alarm hit 100%';
      return EVENT_CAUGHT;
    }
    return 0;
  }

  function step(dt, input, demo) {
    let events = 0;
    time += dt;
    state.seen = false;
    state.seenBy = null;

    // Tools: smoke breaks sight lines, the jammer kills the cameras. Both cost score.
    if (input.smoke && state.smokeCharges > 0 && state.score >= TOOLS.smoke.cost) {
      state.score -= TOOLS.smoke.cost;
      state.smokeCharges -= 1;
      state.smoke.push({ x: state.player.x, y: state.player.y, radius: TOOLS.smoke.radius, ttl: TOOLS.smoke.seconds });
      events |= EVENT_TOOL;
    }
    if (input.jammer && state.jammerCharges > 0 && state.score >= TOOLS.jammer.cost) {
      state.score -= TOOLS.jammer.cost;
      state.jammerCharges -= 1;
      state.jammerTtl = TOOLS.jammer.seconds;
      events |= EVENT_TOOL;
    }
    if (state.jammerTtl > 0) state.jammerTtl = Math.max(0, state.jammerTtl - dt);
    for (const cloud of state.smoke) cloud.ttl -= dt;
    state.smoke = state.smoke.filter((c) => c.ttl > 0);

    // The thief moves (axis-separated, so walls slide instead of sticking).
    state.player.sneaking = !!input.sneak;
    const speed = state.player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(input.dx, input.dy) || 1;
    const mx = (input.dx / len) * speed * dt * (input.dx || input.dy ? 1 : 0);
    const my = (input.dy / len) * speed * dt * (input.dx || input.dy ? 1 : 0);
    moveCircle(state.player, mx, my, PLAYER.radius);
    // Smoke travels with the thief: while it lasts, no sight line can reach them.
    for (const cloud of state.smoke) {
      cloud.x = state.player.x;
      cloud.y = state.player.y;
    }

    events |= stepGuards(dt);
    if (events & EVENT_CAUGHT) return events;
    stepCameras(dt);
    events |= stepAlarm(dt);
    if (events & EVENT_CAUGHT) return events;
    if (state.seen) events |= EVENT_SEEN;

    // Loot: walk over an artifact to pocket it.
    for (const item of state.loot) {
      if (!item.taken && Math.hypot(state.player.x - item.x, state.player.y - item.y) < 36) {
        item.taken = true;
        state.score += item.points;
        events |= EVENT_PICKUP;
      }
    }

    // The getaway: all three artifacts, then the exit door.
    const allTaken = state.loot.every((item) => item.taken);
    const p = state.player;
    if (allTaken && p.x > level.exit.x && p.x < level.exit.x + level.exit.w
      && p.y > level.exit.y && p.y < level.exit.y + level.exit.h) {
      state.timeBonus = Math.round(state.timeLeft) * SCORE.timeBonusPerSecond;
      state.calmBonus = Math.round(ALARM.max - state.alarm) * SCORE.calmBonusPerPoint;
      state.score += state.timeBonus + state.calmBonus;
      return events | EVENT_WIN;
    }

    if (!demo) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        return events | EVENT_TIMEUP;
      }
    }
    return events;
  }

  return {
    state,
    level,
    reset() {
      const fresh = freshState();
      for (const key of Object.keys(fresh)) state[key] = fresh[key];
      time = 0;
    },
    step,
  };
}

// Re-exported so the test driver can step one fixed tick at a time.
export { STEP };
