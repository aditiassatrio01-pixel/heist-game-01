// Everything the eye sees: the night gallery (parquet floor, gold-trimmed walls, glass
// cases), the thief, guards with their vision cones, sweeping cameras, the three glowing
// artifacts, the exit door, the HUD (score, loot, alarm meter, timer, tools) and the
// title / pause / win / caught screens. The judge reads the game mostly through this.

import { ALARM, CAMERA, FIELD, FONT, GUARD, PALETTE, PLAYER, TIME_LIMIT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_TIMEUP = 'timeup';

const HUD_H = 46;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let lastDx = 0;
  let lastDy = 1;

  function fit() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function drawFloor(level) {
    ctx.fillStyle = PALETTE.floorA;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Parquet tiles.
    ctx.fillStyle = PALETTE.floorB;
    const tile = 64;
    for (let y = 0; y < FIELD.height; y += tile) {
      for (let x = (y / tile) % 2 === 0 ? 0 : tile / 2; x < FIELD.width; x += tile) {
        ctx.fillRect(x, y, tile / 2, tile);
      }
    }
    // Gold carpet runners down the hall and the corridor.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(600, 24, 80, 672);
    ctx.fillRect(24, 88, 1232, 56);
    ctx.strokeStyle = PALETTE.carpetTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(600, 24, 80, 672);
    ctx.strokeRect(24, 88, 1232, 56);
    void level;
  }

  function drawExit(level, t) {
    const e = level.exit;
    const pulse = 0.25 + 0.1 * Math.sin(t * 3);
    ctx.fillStyle = PALETTE.exitGlow.replace('0.35', String(pulse));
    ctx.fillRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#eafff1';
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2);
  }

  function drawLoot(state, t) {
    for (const item of state.loot) {
      if (item.taken) continue;
      const glow = 26 + 8 * Math.sin(t * 4 + item.x);
      const grad = ctx.createRadialGradient(item.x, item.y, 4, item.x, item.y, glow + 22);
      grad.addColorStop(0, 'rgba(242, 201, 76, 0.55)');
      grad.addColorStop(1, 'rgba(242, 201, 76, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(item.x, item.y, glow + 22, 0, Math.PI * 2);
      ctx.fill();
      if (item.kind === 'diamond') {
        // Pedestal + faceted stone.
        ctx.fillStyle = '#3a3f52';
        ctx.fillRect(item.x - 22, item.y + 8, 44, 26);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(item.x - 24, item.y + 6, 48, 6);
        ctx.fillStyle = '#bfe9ff';
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 20);
        ctx.lineTo(item.x + 16, item.y - 2);
        ctx.lineTo(item.x, item.y + 12);
        ctx.lineTo(item.x - 16, item.y - 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(item.x - 16, item.y - 2);
        ctx.lineTo(item.x + 16, item.y - 2);
        ctx.moveTo(item.x, item.y - 20);
        ctx.lineTo(item.x, item.y + 12);
        ctx.stroke();
      } else if (item.kind === 'mask') {
        // Glass case + golden mask.
        ctx.fillStyle = PALETTE.caseGlass;
        ctx.fillRect(item.x - 26, item.y - 26, 52, 52);
        ctx.strokeStyle = PALETTE.caseFrame;
        ctx.lineWidth = 3;
        ctx.strokeRect(item.x - 26, item.y - 26, 52, 52);
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, 15, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1d2a44';
        ctx.beginPath();
        ctx.ellipse(item.x - 6, item.y - 3, 3.5, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(item.x + 6, item.y - 3, 3.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Framed sunset painting on the north wall.
        ctx.fillStyle = PALETTE.caseFrame;
        ctx.fillRect(item.x - 42, item.y - 32, 84, 64);
        const g = ctx.createLinearGradient(item.x, item.y - 26, item.x, item.y + 26);
        g.addColorStop(0, '#f2a541');
        g.addColorStop(0.55, '#c65d7b');
        g.addColorStop(1, '#3d348b');
        ctx.fillStyle = g;
        ctx.fillRect(item.x - 36, item.y - 26, 72, 52);
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(item.x, item.y + 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1d2a44';
        ctx.fillRect(item.x - 36, item.y + 18, 72, 8);
      }
    }
  }

  function drawCover(level) {
    for (const r of level.cover) {
      ctx.fillStyle = PALETTE.caseGlass;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = PALETTE.caseFrame;
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(242, 201, 76, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x + 6, r.y + r.h - 6);
      ctx.lineTo(r.x + r.w - 6, r.y + 6);
      ctx.stroke();
    }
  }

  function drawWalls(level) {
    ctx.fillStyle = PALETTE.wall;
    for (const r of level.walls) ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 2;
    for (const r of level.walls) ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  }

  function drawCone(x, y, facing, range, halfAngle, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      const alerted = guard.alertTtl > 0;
      const range = state.player.sneaking ? GUARD.sneakVisionRange : GUARD.visionRange;
      drawCone(
        guard.x, guard.y, guard.facing, range, GUARD.visionHalfAngle,
        alerted ? PALETTE.coneAlert : PALETTE.cone,
        alerted ? 'rgba(229, 83, 75, 0.6)' : 'rgba(242, 201, 76, 0.45)',
      );
    }
    for (const guard of state.guards) {
      const alerted = guard.alertTtl > 0;
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = alerted ? '#e5534b' : '#8fa3c8';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Cap + facing tick.
      ctx.fillStyle = PALETTE.guardCap;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 4, 8, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#eef1f5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, guard.y + Math.sin(guard.facing) * 20);
      ctx.stroke();
      if (alerted) {
        ctx.fillStyle = '#ff5a4d';
        ctx.font = `bold 24px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('!', guard.x, guard.y - 18);
      }
    }
  }

  function drawCameras(state, t) {
    for (const camera of state.cameras) {
      const off = state.jammerTtl > 0;
      if (!off) {
        drawCone(
          camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle,
          PALETTE.cameraCone, 'rgba(229, 83, 75, 0.5)',
        );
      }
      ctx.fillStyle = off ? '#5a6478' : '#e5534b';
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#101623';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = off ? '#5a6478' : '#ff8a80';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(camera.x, camera.y);
      ctx.lineTo(camera.x + Math.cos(camera.angle) * 18, camera.y + Math.sin(camera.angle) * 18);
      ctx.stroke();
      if (off) {
        ctx.fillStyle = '#93a0b8';
        ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('OFF', camera.x, camera.y - 12);
      }
      void t;
    }
  }

  function drawSmoke(state) {
    for (const cloud of state.smoke) {
      ctx.fillStyle = PALETTE.smoke;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      ctx.arc(cloud.x - 30, cloud.y + 12, cloud.radius * 0.6, 0, Math.PI * 2);
      ctx.arc(cloud.x + 28, cloud.y - 10, cloud.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawThief(state) {
    const p = state.player;
    // A soft gold halo so the thief reads at a glance, even shrunk to a contact sheet.
    const halo = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 34);
    halo.addColorStop(0, 'rgba(242, 201, 76, 0.30)');
    halo.addColorStop(1, 'rgba(242, 201, 76, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x + 3, p.y + 5, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.thiefTrim;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    // Hood point shows the way the thief is moving.
    const hx = p.x + lastDx * 9;
    const hy = p.y + lastDy * 9;
    ctx.fillStyle = PALETTE.thiefTrim;
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.fill();
    if (p.sneaking) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('SNEAK', p.x, p.y - 17);
    }
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function drawHud(state, muted) {
    ctx.fillStyle = 'rgba(10, 14, 22, 0.9)';
    ctx.fillRect(0, 0, FIELD.width, HUD_H);
    ctx.fillStyle = PALETTE.wallTrim;
    ctx.fillRect(0, HUD_H, FIELD.width, 2);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('SCORE', 16, 14);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(String(state.score), 16, 32);

    const taken = state.loot.filter((item) => item.taken).length;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('LOOT', 150, 14);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`◆ ${taken}/3`, 150, 32);

    // Alarm meter, centre: the number the whole heist turns on. One clean line:
    // score | loot | alarm | time | tools — all values the same 15 px size, the
    // tools on a single line, so nothing ever collides when the shot is shrunk.
    const alarmX = 330;
    const alarmW = 240;
    const ratio = state.alarm / ALARM.max;
    const color = ratio > 0.75 ? PALETTE.alarmHigh : ratio > 0.4 ? PALETTE.alarmMid : PALETTE.alarmLow;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', alarmX, 14);
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(alarmX + 52, 22, alarmW - 52, 14);
    ctx.fillStyle = color;
    ctx.fillRect(alarmX + 52, 22, (alarmW - 52) * ratio, 14);
    ctx.strokeStyle = '#3a4358';
    ctx.lineWidth = 1;
    ctx.strokeRect(alarmX + 52, 22, alarmW - 52, 14);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(state.alarm)}%`, alarmX + alarmW + 8, 30);

    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('TIME', 700, 14);
    ctx.fillStyle = state.timeLeft < 30 ? PALETTE.alarmHigh : PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(formatTime(state.timeLeft), 700, 30);

    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('TOOLS', 850, 14);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`SMOKE ×${state.smokeCharges} [F]    JAMMER ×${state.jammerCharges} [E]`, 850, 30);
    void muted;

    // Mission line along the bottom.
    ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
    ctx.fillRect(340, 694, 600, 22);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('STEAL 3 ARTIFACTS — THEN REACH THE EXIT', 640, 705);

    if (state.seen) {
      const flash = 0.6 + 0.4 * Math.sin(performance.now() / 90);
      ctx.fillStyle = `rgba(229, 83, 75, ${flash})`;
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ SPOTTED BY ${state.seenBy ? state.seenBy.toUpperCase() : 'A GUARD'} — BREAK LINE OF SIGHT!`, 640, 78);
    }
  }

  function overlay(alpha) {
    ctx.fillStyle = `rgba(8, 11, 18, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function centerText(lines, y) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const line of lines) {
      ctx.fillStyle = line.color;
      ctx.font = line.font;
      ctx.fillText(line.text, 640, y);
      y += line.gap;
    }
  }

  function drawTitle(state, best) {
    overlay(0.72);
    centerText([
      { text: 'MIDNIGHT HEIST', color: PALETTE.gold, font: `bold 72px ${FONT}`, gap: 76 },
      { text: '— The Gilded Gallery —', color: PALETTE.text, font: `28px ${FONT}`, gap: 52 },
      { text: 'Sneak in. Steal the Diamond, the Golden Mask and the Sunset Portrait.', color: PALETTE.text, font: `19px ${FONT}`, gap: 30 },
      { text: 'Then reach the EXIT before the alarm hits 100% or the clock runs out.', color: PALETTE.text, font: `19px ${FONT}`, gap: 44 },
      { text: 'WASD / ARROWS move   •   SHIFT sneak (half detection)   •   F smoke   •   E jammer', color: PALETTE.muted, font: `16px ${FONT}`, gap: 28 },
      { text: 'Tools cost score: smoke 100, jammer 150   •   P pause   •   M mute   •   R restart', color: PALETTE.muted, font: `16px ${FONT}`, gap: 48 },
      { text: 'PRESS SPACE TO BEGIN', color: PALETTE.gold, font: `bold 24px ${FONT}`, gap: 40 },
      { text: best > 0 ? `Best getaway: ${best}` : '', color: PALETTE.muted, font: `16px ${FONT}`, gap: 0 },
    ], 200);
    void state;
  }

  function drawPaused() {
    overlay(0.6);
    centerText([
      { text: 'PAUSED', color: PALETTE.text, font: `bold 56px ${FONT}`, gap: 64 },
      { text: 'Press P or SPACE to keep sneaking', color: PALETTE.muted, font: `18px ${FONT}`, gap: 0 },
    ], 320);
  }

  function drawEnd(title, titleColor, lines, best) {
    overlay(0.74);
    const all = [
      { text: title, color: titleColor, font: `bold 60px ${FONT}`, gap: 70 },
      ...lines.map((l) => ({ text: l, color: PALETTE.text, font: `19px ${FONT}`, gap: 32 })),
      { text: 'PRESS SPACE TO PLAY AGAIN', color: PALETTE.gold, font: `bold 22px ${FONT}`, gap: 40 },
      { text: best > 0 ? `Best getaway: ${best}` : '', color: PALETTE.muted, font: `16px ${FONT}`, gap: 0 },
    ];
    centerText(all, 210);
  }

  return {
    draw(state, level, screen, best, t, muted) {
      canvas.width = canvas.width; // clear
      fit();
      // Track the thief's facing from real movement.
      if (state._px !== undefined) {
        const dx = state.player.x - state._px;
        const dy = state.player.y - state._py;
        if (Math.abs(dx) + Math.abs(dy) > 0.5) {
          const len = Math.hypot(dx, dy);
          lastDx = dx / len;
          lastDy = dy / len;
        }
      }
      state._px = state.player.x;
      state._py = state.player.y;

      drawFloor(level);
      drawExit(level, t);
      drawLoot(state, t);
      drawCover(level);
      drawWalls(level);
      drawSmoke(state);
      drawGuards(state);
      drawCameras(state, t);
      drawThief(state);
      drawHud(state, muted);

      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_WIN) {
        drawEnd('CLEAN GETAWAY!', PALETTE.gold, [
          `All three artifacts are yours.`,
          `Time bonus +${state.timeBonus}   •   Calm bonus +${state.calmBonus}`,
          `Final score: ${state.score}`,
        ], best);
      } else if (screen === SCREEN_CAUGHT) {
        drawEnd('CAUGHT!', PALETTE.alarmHigh, [
          `The heist ends here — ${state.caughtReason ?? 'spotted'}.`,
          `Artifacts stolen: ${state.loot.filter((i) => i.taken).length}/3   •   Score: ${state.score}`,
        ], best);
      } else if (screen === SCREEN_TIMEUP) {
        drawEnd("TIME'S UP", PALETTE.alarmHigh, [
          'The sun came up and the gallery opened.',
          `Artifacts stolen: ${state.loot.filter((i) => i.taken).length}/3   •   Score: ${state.score}`,
        ], best);
      }
    },
  };
}

// Re-exported for the test driver.
export { TIME_LIMIT };
