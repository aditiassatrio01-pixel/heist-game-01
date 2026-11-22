// The Gilded Gallery: one floor, three wings, several routes between them.
// The north corridor runs the whole width behind the main hall; the east wing is reached
// through the main hall door and through the corridor's east door. Walls and display cases
// block movement and line of sight; the thief must read patrols before moving.

const WALL = 24;

/** Axis-aligned rectangles: { x, y, w, h }. */
function rect(x, y, w, h) {
  return { x, y, w, h };
}

export function buildLevel() {
  const walls = [
    // Outer shell.
    rect(0, 0, 1280, WALL),
    rect(0, 696, 1280, WALL),
    rect(0, 0, WALL, 720),
    rect(1256, 0, WALL, 720),
    // North corridor south wall (y=168): gaps at 560-720 (hall door) and 1080-1180 (east door).
    rect(24, 168, 536, WALL),
    rect(720, 168, 360, WALL),
    rect(1180, 168, 76, WALL),
    // East wing west wall (x=860): gap at 380-480 (hall door).
    rect(860, 168, WALL, 212),
    rect(860, 480, WALL, 216),
  ];

  // Display cases and statues: solid cover that blocks sight lines as well as feet.
  const cover = [
    rect(300, 250, 120, 60), // main hall, west case
    rect(700, 250, 120, 60), // main hall, east case
    rect(300, 560, 120, 60), // main hall, west low case
    rect(700, 560, 120, 60), // main hall, east low case
    rect(1180, 420, 50, 50), // east wing planter
    rect(960, 560, 50, 50), // east wing planter
    rect(440, 40, 40, 40), // corridor statue tucked against the north wall: a hiding nook that never blocks the lane
  ];

  // The three artifacts. Grab all three, then reach the exit.
  const loot = [
    { id: 'diamond', name: 'Star Diamond', x: 480, y: 300, points: 600, kind: 'diamond' },
    { id: 'mask', name: 'Golden Mask', x: 1200, y: 200, points: 500, kind: 'mask' },
    { id: 'portrait', name: 'Sunset Portrait', x: 640, y: 62, points: 500, kind: 'portrait' },
  ];

  // Guards walk their waypoints and turn at each end.
  const guards = [
    {
      name: 'Rocco', x: 280, y: 470,
      waypoints: [{ x: 280, y: 470 }, { x: 780, y: 470 }],
    },
    {
      name: 'Mara', x: 1100, y: 260,
      waypoints: [{ x: 1100, y: 260 }, { x: 1100, y: 540 }],
    },
    {
      name: 'Vince', x: 320, y: 96,
      waypoints: [{ x: 320, y: 96 }, { x: 960, y: 96 }],
    },
  ];

  // Wall cameras sweep a cone from a fixed mount. Cam 1 watches the hall's east side,
  // clear of the main door lane, so the door is a timing test, not a camera trap.
  const cameras = [
    { name: 'Cam 1', x: 980, y: 190, baseAngle: Math.PI / 2, phase: 0 }, // looks down the hall
    { name: 'Cam 2', x: 1252, y: 330, baseAngle: Math.PI, phase: 1.7 }, // looks west, east wing
  ];

  return {
    walls,
    cover,
    loot,
    guards,
    cameras,
    playerStart: { x: 120, y: 600 },
    exit: rect(48, 640, 140, 56),
    bounds: { x: WALL, y: WALL, w: 1280 - WALL * 2, h: 720 - WALL * 2 },
  };
}
